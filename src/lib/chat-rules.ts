/**
 * The room's content rules, kept in their own dependency-free module so they
 * can be unit tested directly (no server-only import, no DB, no aliases).
 */

export const MAX_LEN = 1200;

/** Collapse runs of blank lines and trim. Returns '' if there is nothing left. */
export function normalize(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CODE_KEYWORD =
  /\b(def |class |return |function\s*\(|=>|const |let |var |public |private |static |void |int |String\[|System\.out|console\.log|print\(|import |#include|for\s*\(|while\s*\(|if\s*\()/;

/**
 * Best-effort detector for a pasted solution, not a perfect one — the rule is
 * enforced by this plus officer moderation (see README), the same layered
 * approach the rest of the site takes to anything it cannot fully verify.
 *
 * A short inline snippet (one line, no fence) is left alone: this is about
 * stopping a solution dump, not banning the word "for" or a variable name.
 */
export function looksLikeCode(body: string): boolean {
  // A fenced block bigger than a couple of lines is exactly the shape of a
  // pasted solution, whatever is inside it.
  const fences = body.match(/```[\s\S]*?```/g) ?? [];
  for (const block of fences) {
    const inner = block.replace(/```/g, '').trim();
    const lines = inner.split('\n').filter((l) => l.trim() !== '');
    if (lines.length > 2 || inner.length > 140) return true;
  }

  const withoutFences = body.replace(/```[\s\S]*?```/g, ' ');
  const lines = withoutFences.split('\n').filter((l) => l.trim() !== '');
  if (lines.length >= 4) {
    let hits = 0;
    for (const line of lines) {
      const t = line.trim();
      const bracey = (t.match(/[{}[\]();]/g) ?? []).length >= 2;
      const closer = /^[)}\]]/.test(t);
      if (bracey || closer || CODE_KEYWORD.test(t)) hits++;
    }
    if (hits / lines.length >= 0.5) return true;
  }

  // One line, densely bracketed: unbroken or minified code, even if short.
  for (const line of withoutFences.split('\n')) {
    if (line.length >= 40 && (line.match(/[{};]/g) ?? []).length >= 6) return true;
  }
  return false;
}
