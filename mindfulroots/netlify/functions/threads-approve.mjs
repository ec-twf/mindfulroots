// Netlify Function: Telegram webhook -> Threads approval catcher.
// Deploy path (default): /.netlify/functions/threads-approve
//
// Handles inline-button taps from the reply-scout / atomize drafts:
//   callback_data = "<a|s>:<r|p>:<id>"   (approve|skip : reply|post : shortId)
//   - approve reply  -> send it to Threads NOW (two-step), mark sent in state
//   - approve post   -> mark it "approved" in post-queue.jsonl (publish-drip releases it)
//   - skip           -> mark "skipped"
// Edit (pencil) is out of v1 (needs a Telegram force-reply round trip) — see HANDOFF.md.
//
// Required Netlify env vars:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
//   THREADS_USER_ID,
//   GITHUB_TOKEN, STATE_REPO (e.g. "ec-twf/mindfulroots-threads"), STATE_BRANCH (default "main")
// The rotating Threads long-lived token is NOT an env var — it is read from the private repo
// file secrets/threads-token.txt (single source of truth; rewritten by the token-refresh routine).

const TG = (m) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`;
const GH = "https://api.github.com";
const TH = "https://graph.threads.net/v1.0";
const BRANCH = process.env.STATE_BRANCH || "main";

async function tg(method, body) {
  await fetch(TG(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function ghGetRaw(path) {
  const r = await fetch(`${GH}/repos/${process.env.STATE_REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`GH read ${path}: ${r.status}`);
  const j = await r.json();
  return { text: Buffer.from(j.content, "base64").toString("utf8"), sha: j.sha };
}

async function ghGetJsonl(path) {
  try {
    const { text, sha } = await ghGetRaw(path);
    return { lines: text.split("\n").filter(Boolean).map((l) => JSON.parse(l)), sha };
  } catch {
    return { lines: [], sha: null };
  }
}

async function ghPutJsonl(path, lines, sha, message) {
  const content = Buffer.from(lines.map((o) => JSON.stringify(o)).join("\n") + "\n").toString("base64");
  await fetch(`${GH}/repos/${process.env.STATE_REPO}/contents/${path}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
    body: JSON.stringify({ message, content, sha: sha || undefined, branch: BRANCH }),
  });
}

async function threadsToken() {
  const { text } = await ghGetRaw("secrets/threads-token.txt");
  return text.trim();
}

// Two-step Threads publish (reply if reply_to_id given).
async function threadsSend(text, replyToId) {
  const uid = process.env.THREADS_USER_ID;
  const tok = await threadsToken();
  const createParams = new URLSearchParams({ media_type: "TEXT", text, access_token: tok });
  if (replyToId) createParams.set("reply_to_id", replyToId);
  const c = await (await fetch(`${TH}/${uid}/threads`, { method: "POST", body: createParams })).json();
  if (!c.id) throw new Error("container failed: " + JSON.stringify(c));
  const pubParams = new URLSearchParams({ creation_id: c.id, access_token: tok });
  const p = await (await fetch(`${TH}/${uid}/threads_publish`, { method: "POST", body: pubParams })).json();
  if (!p.id) throw new Error("publish failed: " + JSON.stringify(p));
  return p.id;
}

export default async (req) => {
  // Verify the request really came from Telegram.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await req.json();
  const cq = update.callback_query;
  if (!cq) return new Response("ok"); // ignore non-button updates in v1

  const [action, type, id] = (cq.data || "").split(":");
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  let notice = "Done";

  try {
    if (type === "r") {
      const { lines, sha } = await ghGetJsonl("pending-replies.jsonl");
      const item = lines.find((x) => x.id === id);
      if (!item) notice = "Not found (expired?)";
      else if (item.status && item.status !== "pending_approval") notice = `Already ${item.status}`;
      else if (action === "a") {
        const pid = await threadsSend(item.text, item.reply_to_id);
        item.status = "sent"; item.threads_id = pid;
        await ghPutJsonl("pending-replies.jsonl", lines, sha, `reply ${id} sent`);
        notice = "Reply sent";
      } else {
        item.status = "skipped";
        await ghPutJsonl("pending-replies.jsonl", lines, sha, `reply ${id} skipped`);
        notice = "Skipped";
      }
    } else if (type === "p") {
      const { lines, sha } = await ghGetJsonl("post-queue.jsonl");
      const item = lines.find((x) => x.id === id);
      if (!item) notice = "Not found (expired?)";
      else if (item.status && item.status !== "pending_approval") notice = `Already ${item.status}`;
      else {
        item.status = action === "a" ? "approved" : "skipped";
        await ghPutJsonl("post-queue.jsonl", lines, sha, `post ${id} ${item.status}`);
        notice = action === "a" ? "Approved for posting" : "Skipped";
      }
    }
    await tg("editMessageText", { chat_id: chatId, message_id: msgId, text: `${cq.message.text}\n\n— ${notice}` });
  } catch (e) {
    notice = "Error: " + String(e).slice(0, 150);
  }
  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: notice });
  return new Response("ok");
};
