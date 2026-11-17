/**
 * Prompts and scaffolds for preparation: mining stories out of memory, the
 * framework library for values and hypothetical questions, and the questions
 * worth asking your interviewer.
 */

/** Memory triggers for the first brainstorm. Write everything down; do not judge yet. */
export const MINE_CATEGORIES: { title: string; prompts: string[] }[] = [
  {
    title: 'High-impact work',
    prompts: ['A launch, a big feature, a migration, an architecture choice', 'Something real people used', 'A tool or automation that saved others time'],
  },
  {
    title: 'Hard situations',
    prompts: ['A tight deadline or a demo that almost failed', 'A bug or outage you chased down', 'Unclear requirements; a plan that changed mid-way', 'A team that was not getting along'],
  },
  {
    title: 'Leading moments',
    prompts: ['Someone you taught or onboarded', 'Something you organized (club, contest, hackathon team, event)', 'A time others looked to you for direction'],
  },
  {
    title: 'Learning moments',
    prompts: ['A mistake that changed how you work', 'Feedback that stung, then helped', 'A technology you learned under pressure'],
  },
  {
    title: 'Turning points',
    prompts: ['Changing majors, teams or roles', 'Your first internship or job', 'When your responsibilities clearly grew'],
  },
];

export const ARTIFACTS = [
  'Your resume and LinkedIn, old versions too',
  'GitHub repos and commit history',
  'Pull requests and code review threads',
  'Class project write-ups, slides, design docs',
  'Internship self-reviews and manager feedback',
  'Old chats or emails from a hard project',
  'Contest results, hackathon submissions, club announcements',
  'Ask a teammate: "What project do you remember me driving?"',
];

export const CLUB_SOURCES = [
  'Leading or coordinating an ICPC / contest team',
  'A hackathon: picking the idea, splitting work, the 3 a.m. bug',
  'Tutoring, TA work or helping a classmate get unstuck',
  'Organizing a club event or study group',
  'Building or fixing something for the club (like this site)',
];

/** Values questions: ask "what varies?", name 2–3 variants, say when to use each, then prove it with a story. */
export const VALUES_STEPS = ['What varies here: people, time, risk, stakes?', 'Name 2–3 approaches, one per variant.', 'Say when each one fits.', 'Prove it: "For example, on…" with a short CARL.'];
export const VALUE_PATTERNS: { topic: string; axis: string }[] = [
  { topic: 'Communication', axis: 'By how often and how formal: ad-hoc → regular → formal' },
  { topic: 'Prioritization', axis: 'Impact vs effort, or user value vs technical risk' },
  { topic: 'Conflict', axis: 'Scale by stakes: low → medium → bet-the-company' },
  { topic: 'Quality', axis: 'The speed / quality / scope triangle' },
  { topic: 'Learning', axis: 'Observe → do → teach' },
];

export const HYPO_STEPS = [
  'Ask 1–2 clarifying questions that would change your approach.',
  'Diagnose: what kind of problem is this?',
  'Walk 2–3 likely scenarios, with what you would do in each.',
  'Ground it: "I faced something similar when…"',
  'Finish strong: a next step, a pitfall to avoid, or a principle.',
];
export const HYPO_BLOCKS: { kind: string; blocks: string[] }[] = [
  { kind: 'Something is wrong', blocks: ['People vs process vs technology', 'Internal cause vs external', 'Acute crisis vs chronic problem'] },
  { kind: 'What would you choose', blocks: ['Impact vs effort', 'Reversible vs irreversible', 'Build vs buy vs partner'] },
  { kind: 'How would you handle', blocks: ['Audience × message × medium', 'Diagnose → align → execute → follow up', 'Listen → empathize → reframe → solve'] },
];

export type AskRole = 'manager' | 'peer' | 'partner' | 'recruiter' | 'exec';
export const ASK_ROLES: { key: AskRole; title: string; focus: string; examples: string[] }[] = [
  {
    key: 'manager',
    title: 'Hiring manager',
    focus: 'Team priorities, how success is measured, how they manage and grow people.',
    examples: ['What does success look like in this role after 90 days?', 'Can you give me an example of how you helped someone on your team grow recently?', 'What would make this team wildly successful this year?'],
  },
  {
    key: 'peer',
    title: 'Future teammate',
    focus: 'Day-to-day reality, technical challenges, honest culture.',
    examples: ['Can you tell me about a recent technical disagreement on the team and how it was resolved?', 'What do you wish you had known before joining?', 'How did the team handle its last production issue?'],
  },
  {
    key: 'partner',
    title: 'Cross-functional partner',
    focus: 'How teams collaborate and make decisions.',
    examples: ['How are decisions made when your team and engineering want different things?', 'What does a great partner on this team do that others do not?'],
  },
  {
    key: 'recruiter',
    title: 'Recruiter',
    focus: 'Process, logistics, and which signal areas are scored.',
    examples: ['Which competencies will the behavioral interviewers be assessing?', 'What are common reasons candidates do not pass the onsite?', 'Is there anything in my background the team is most interested in?'],
  },
  {
    key: 'exec',
    title: 'Senior leader',
    focus: 'Vision, strategy, the big bets.',
    examples: ['What major technical or product bets is the company making over the next two years?', 'What keeps you up at night about the business?'],
  },
];
export const isAskRole = (v: unknown): v is AskRole => ASK_ROLES.some((r) => r.key === v);

/** Generic questions every interviewer has heard a thousand times. */
export const BLAND_ASKS = ['day in the life', 'tech stack', 'growth opportunities', 'do you like working here', 'what do you like about working', 'what is the culture like', "what's the culture like"];
/** Questions that cost you points. */
export const RED_ASKS = ['salary', 'how much', 'the pay', 'vacation', 'pto', 'time off', 'free food', 'perks', 'work from home every', 'how soon can i get promoted', 'what are you doing later'];

/** Debrief: what each kind of follow-up usually means. */
export const FOLLOWUP_KINDS: { key: 'clarifying' | 'probing' | 'skeptical' | 'redirecting'; title: string; meaning: string; tone: 'good' | 'ok' | 'bad' }[] = [
  { key: 'clarifying', title: 'Clarifying', meaning: '"How big was the team?" They are building a picture. Neutral to good.', tone: 'ok' },
  { key: 'probing', title: 'Probing', meaning: '"How did you decide?" They are testing your judgment because they see potential. Good.', tone: 'good' },
  { key: 'skeptical', title: 'Skeptical', meaning: '"You did all that yourself?" They doubt your part. A concern.', tone: 'bad' },
  { key: 'redirecting', title: 'Redirecting', meaning: '"Let\'s move on." The answer was not giving the signal they needed.', tone: 'bad' },
];
export type FollowupKind = (typeof FOLLOWUP_KINDS)[number]['key'];
