/**
 * Small text readers shared by the Story Doctor and the answer checks. They
 * are deliberately simple word lists: transparent, explainable, and the same
 * answer every time.
 */

export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;

/** Same list as interview mode, so filler rates mean the same thing on both sides. */
const FILLER = /\b(um+|uh+|erm|like|basically|actually|literally|you know|kind of|sort of|i guess|so yeah)\b/gi;
export const fillerCount = (s: string) => s.match(FILLER)?.length ?? 0;

export const I_WORDS = /\b(i|i'm|i've|i'd|i'll|me|my|myself)\b/gi;
export const WE_WORDS = /\b(we|we're|we've|we'd|we'll|us|our|ours)\b/gi;
export const count = (s: string, re: RegExp) => s.match(re)?.length ?? 0;

/** A number, a percentage, or a size word: evidence of a measured result. */
export const NUMBER = /\b\d+([.,]\d+)?\s*(%|x|×|k|m|ms|s|percent|hours?|days?|weeks?|months?|users?|customers?|people|teams?)?\b|\bhalf\b|\bdoubled?\b|\btwice\b|\btripled?\b|\bhundreds?\b|\bthousands?\b|\bmillions?\b|\bdozens?\b|\bzero\b/i;
export const hasNumber = (s: string) => NUMBER.test(s);

/** Verbs that do not count as an action ("I think", "I was"). */
const NOT_ACTION = new Set([
  'was', 'am', 'is', 'think', 'thought', 'guess', 'mean', 'know', 'knew', 'feel', 'felt', 'believe', 'had', 'have', 'would', 'could',
  'should', 'might', 'will', 'can', 'do', 'did', 'just', 'really', 'also', 'still', 'wanted', 'want', 'liked', 'like', 'hope', 'remember',
  'got', 'were', 'need', 'needed', 'love', 'loved', 'enjoy', 'enjoyed', 'see', 'saw', 'learned', 'learnt', 'realized', 'hoped', 'wished',
]);
const IRREGULAR = new Set([
  'built', 'wrote', 'led', 'made', 'ran', 'took', 'set', 'sent', 'met', 'found', 'chose', 'drove', 'brought', 'told', 'gave', 'spent',
  'began', 'held', 'kept', 'paid', 'put', 'rewrote', 'shipped', 'split', 'cut', 'sought', 'taught', 'won', 'went', 'rebuilt', 'undertook',
  'proposed', 'pushed', 'asked', 'called', 'decided', 'realized', 'noticed', 'ship', 'build', 'write', 'lead', 'run', 'create', 'design',
]);

/** "I proposed…", "I then built…", "I've set up…": clauses where you did something. */
export function actionClauses(s: string): number {
  let n = 0;
  const re = /\bI(?:'ve| have| had)?\s+(?:then\s+|also\s+|first\s+|quickly\s+|immediately\s+|finally\s+)?([a-z]+)/gi;
  for (const m of s.matchAll(re)) {
    const v = m[1].toLowerCase();
    if (NOT_ACTION.has(v)) continue;
    if (v.endsWith('ed') || IRREGULAR.has(v)) n++;
  }
  return n;
}

/** Any of the phrases, case-insensitive, as whole words. Returns the first one found. */
export function findPhrase(s: string, phrases: string[]): string | null {
  const low = ` ${s.toLowerCase().replace(/[’']/g, "'")} `;
  for (const p of phrases) {
    const re = new RegExp(`(^|[^a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
    if (re.test(low)) return p;
  }
  return null;
}

/** Acronyms (2–6 capitals) not followed within a few words by a dash/paren/"which" explanation. */
export function unexplainedAcronyms(s: string): string[] {
  const common = new Set(['I', 'OK', 'AI', 'API', 'APIS', 'UI', 'UX', 'SQL', 'AWS', 'CEO', 'CTO', 'VP', 'PM', 'QA', 'ML', 'CSS', 'HTML', 'JSON', 'REST', 'URL', 'PR', 'PRS', 'CI', 'CD', 'IT', 'HR', 'US', 'USA', 'MVP', 'TA', 'GPA', 'ICPC', 'IDE', 'CPU', 'GPU', 'RAM', 'iOS', 'TV', 'ID', 'IDS', 'PDF', 'FAQ', 'SDK']);
  const out = new Set<string>();
  for (const m of s.matchAll(/\b([A-Z][A-Z0-9]{1,5})s?\b(.{0,25})/g)) {
    const a = m[1];
    if (common.has(a)) continue;
    if (/^\s*(\(|—|-|–|,\s*(a|an|the|which)\b|which\b|meaning\b)/.test(m[2])) continue;
    out.add(a);
  }
  return [...out];
}

/** Paraphrases the length of speech: words at a calm interview pace. */
export const WPM = 150;
export const speakSeconds = (words: number) => Math.round((words / WPM) * 60);
