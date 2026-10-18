/**
 * LeetCode's statement HTML, made safe to render. Nothing from LeetCode is
 * trusted as markup: every tag is rebuilt from an allowlist with no
 * attributes (images keep a LeetCode-hosted src and alt only), the contents
 * of anything script-like are dropped, and every other `<` or `>` in the
 * text is escaped. The result can only contain tags this file wrote.
 */

const KEEP = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 'ul', 'ol', 'li', 'sup', 'sub', 'img', 'span', 'div',
  'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h3', 'h4', 'hr',
]);
const VOID = new Set(['br', 'img', 'hr']);
/** Removed together with everything inside them. */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|svg|math|template|noscript|textarea|select|button|form)\b[\s\S]*?<\/\1\s*>/gi;
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g;
const IMG_HOST = /^https:\/\/assets\.leetcode\.com\//;

const escapeText = (t: string) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}

export function sanitizeStatement(html: string): string {
  const src = html.replace(DROP_WITH_CONTENT, '').replace(/<!--[\s\S]*?-->/g, '');
  let out = '';
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    out += escapeText(src.slice(last, m.index));
    last = m.index! + m[0].length;
    const name = m[1].toLowerCase();
    if (!KEEP.has(name)) continue;
    const closing = m[0].startsWith('</');
    if (closing) {
      if (!VOID.has(name)) out += `</${name}>`;
    } else if (name === 'img') {
      const s = attr(m[2], 'src');
      if (s && IMG_HOST.test(s)) out += `<img src="${escapeAttr(s)}" alt="${escapeAttr(attr(m[2], 'alt') ?? '')}" loading="lazy">`;
    } else {
      out += `<${name}>`;
    }
  }
  out += escapeText(src.slice(last));
  return out;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ', le: '≤', ge: '≥', ne: '≠', times: '×', minus: '−' };

/** Plain text, for the AI interviewer's brief. */
export function statementText(html: string): string {
  return html
    .replace(DROP_WITH_CONTENT, '')
    .replace(/<sup>/gi, '^')
    .replace(/<(br|\/p|\/li|\/pre|\/div)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#?\w+);/g, (all, e: string) => ENTITIES[e] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : all))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
