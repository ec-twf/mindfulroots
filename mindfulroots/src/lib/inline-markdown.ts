// Minimal, safe inline-markdown renderer for frontmatter-authored strings
// (FAQ questions and answers, evidence quotes, spec cells).
//
// Frontmatter elsewhere in this codebase is either rendered as plain text
// (product `shortDescription`/`cautions`) or passed through `set:html` with a
// **bold** → <strong> swap (product `interactionWarning`). FAQ answers can also
// carry inline links, which that precedent doesn't cover, so this extends the
// same approach: escape HTML first, then convert **bold**, *italic* and
// [text](url). Raw markdown syntax never reaches the page.
//
// Lives in lib because the blog and product templates both render
// frontmatter-authored Q&A and must stay identical in what they allow.

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Only same-origin and http(s)/mailto targets become links. Anything else
// (javascript:, data:, …) renders as plain text. These strings are first-party
// today, but they interpolate straight into set:html.
export function safeHref(url: string): string | undefined {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url.replace(/"/g, '&quot;') : undefined;
}

export function renderInlineMarkdown(str: string): string {
  let out = escapeHtml(str);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const href = safeHref(url);
    return href ? `<a href="${href}">${text}</a>` : text;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  return out;
}
