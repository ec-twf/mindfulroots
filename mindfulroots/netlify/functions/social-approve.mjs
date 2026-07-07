// Netlify Function: Telegram webhook -> unified Threads + Facebook approval dispatcher.
// Deploy path (default): /.netlify/functions/social-approve
//
// Supersedes threads-approve.mjs (kept in place, untouched, until this is verified and the
// Telegram webhook is repointed — see mindfulroots-facebook's plan doc, "Approval Gate" section,
// for the cutover sequencing). Telegram's setWebhook only accepts one URL per bot token, so one
// dispatcher serves both pipelines rather than running two independent functions/bots.
//
//   callback_data = "<a|s>:<p|r|f|c>:<id>"   (approve|skip : type : shortId)
//     p = Threads post      (STATE_REPO_THREADS, post-queue.jsonl)      — approve just flips status
//     r = Threads reply     (STATE_REPO_THREADS, pending-replies.jsonl) — approve sends instantly
//     f = Facebook post     (STATE_REPO_FACEBOOK, post-queue.jsonl)     — approve just flips status
//     c = Facebook comment  (STATE_REPO_FACEBOOK, pending-replies.jsonl)— approve sends instantly
//
// Required Netlify env vars:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET,
//   THREADS_USER_ID, FB_PAGE_ID, FB_GRAPH_VERSION (e.g. "v21.0"),
//   GITHUB_TOKEN,
//   STATE_REPO_THREADS (e.g. "ec-twf/mindfulroots-threads"),
//   STATE_REPO_FACEBOOK (e.g. "ec-twf/mindfulroots-facebook"),
//   STATE_BRANCH (default "main")
// GITHUB_TOKEN must have write access to BOTH state repos (a single fine-grained PAT covering
// both, or confirm an existing classic PAT's scope already covers the new private repo).
// Neither the Threads token nor the Facebook Page token are env vars — both are read from their
// respective private state repo's secrets/*.txt file (single source of truth per pipeline).

const TG = (m) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`;
const GH = "https://api.github.com";
const TH = "https://graph.threads.net/v1.0";
const FB_VERSION = process.env.FB_GRAPH_VERSION || "v21.0";
const FB = `https://graph.facebook.com/${FB_VERSION}`;
const BRANCH = process.env.STATE_BRANCH || "main";

const REPO_FOR = {
  p: process.env.STATE_REPO_THREADS,
  r: process.env.STATE_REPO_THREADS,
  f: process.env.STATE_REPO_FACEBOOK,
  c: process.env.STATE_REPO_FACEBOOK,
};
const FILE_FOR = { p: "post-queue.jsonl", f: "post-queue.jsonl", r: "pending-replies.jsonl", c: "pending-replies.jsonl" };

async function tg(method, body) {
  await fetch(TG(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function ghGetRaw(repo, path) {
  const r = await fetch(`${GH}/repos/${repo}/contents/${path}?ref=${BRANCH}`, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`GH read ${repo}/${path}: ${r.status}`);
  const j = await r.json();
  return { text: Buffer.from(j.content, "base64").toString("utf8"), sha: j.sha };
}

async function ghGetJsonl(repo, path) {
  try {
    const { text, sha } = await ghGetRaw(repo, path);
    return { lines: text.split("\n").filter(Boolean).map((l) => JSON.parse(l)), sha };
  } catch {
    return { lines: [], sha: null };
  }
}

async function ghPutJsonl(repo, path, lines, sha, message) {
  const content = Buffer.from(lines.map((o) => JSON.stringify(o)).join("\n") + "\n").toString("base64");
  await fetch(`${GH}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
    body: JSON.stringify({ message, content, sha: sha || undefined, branch: BRANCH }),
  });
}

// --- Threads (two-step create + publish, reply if reply_to_id given) ---
async function threadsToken() {
  const { text } = await ghGetRaw(process.env.STATE_REPO_THREADS, "secrets/threads-token.txt");
  return text.trim();
}

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

// --- Facebook (nested comment reply — single call, no create/publish split) ---
async function fbPageToken() {
  const { text } = await ghGetRaw(process.env.STATE_REPO_FACEBOOK, "secrets/fb-page-token.txt");
  return text.trim();
}

async function fbReplyToComment(commentId, text) {
  const tok = await fbPageToken();
  const params = new URLSearchParams({ message: text, access_token: tok });
  const r = await (await fetch(`${FB}/${commentId}/comments`, { method: "POST", body: params })).json();
  if (!r.id) throw new Error("fb comment reply failed: " + JSON.stringify(r));
  return r.id;
}

export default async (req) => {
  // Verify the request really came from Telegram.
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  const update = await req.json();
  const cq = update.callback_query;
  if (!cq) return new Response("ok"); // ignore non-button updates

  const [action, type, id] = (cq.data || "").split(":");
  const repo = REPO_FOR[type];
  const file = FILE_FOR[type];
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  let notice = "Done";

  if (!repo || !file) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Unknown type" });
    return new Response("ok");
  }

  try {
    const { lines, sha } = await ghGetJsonl(repo, file);
    const item = lines.find((x) => x.id === id);
    if (!item) {
      notice = "Not found (expired?)";
    } else if (item.status && item.status !== "pending_approval") {
      notice = `Already ${item.status}`;
    } else if (type === "r") {
      // Threads reply — send instantly.
      if (action === "a") {
        const pid = await threadsSend(item.text, item.reply_to_id);
        item.status = "sent"; item.threads_id = pid;
        await ghPutJsonl(repo, file, lines, sha, `reply ${id} sent`);
        notice = "Reply sent";
      } else {
        item.status = "skipped";
        await ghPutJsonl(repo, file, lines, sha, `reply ${id} skipped`);
        notice = "Skipped";
      }
    } else if (type === "c") {
      // Facebook comment reply — send instantly.
      if (action === "a") {
        const cid = await fbReplyToComment(item.reply_to_id, item.text);
        item.status = "sent"; item.fb_comment_id = cid;
        await ghPutJsonl(repo, file, lines, sha, `comment reply ${id} sent`);
        notice = "Reply sent";
      } else {
        item.status = "skipped";
        await ghPutJsonl(repo, file, lines, sha, `comment reply ${id} skipped`);
        notice = "Skipped";
      }
    } else if (type === "p" || type === "f") {
      // Threads post or Facebook post — approve just flips status; drip cron does the real publish.
      item.status = action === "a" ? "approved" : "skipped";
      await ghPutJsonl(repo, file, lines, sha, `post ${id} ${item.status}`);
      notice = action === "a" ? "Approved for posting" : "Skipped";
    }
    await tg("editMessageText", { chat_id: chatId, message_id: msgId, text: `${cq.message.text}\n\n— ${notice}` });
  } catch (e) {
    notice = "Error: " + String(e).slice(0, 150);
  }
  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: notice });
  return new Response("ok");
};
