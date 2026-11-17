/**
 * The question bank. Each question is hand-labeled with its type and the
 * signal areas behind it, which is what the Decode drill tests and what the
 * Select ranker matches stories against.
 */
import { type LevelKey, levelRank } from './levels';
import { type SignalKey, signalByKey } from './signals';

/** time: "Tell me about a time". values: "What is your approach to". hypo: "What would you do if". */
export type QType = 'time' | 'values' | 'hypo' | 'tmay' | 'ask';

export type Clarifier = {
  /** A clarifying question you could ask. */
  q: string;
  /** What the interviewer says back. */
  a: string;
  /** Good clarifiers change your approach; poor ones are too basic or deflect. */
  good: boolean;
  why: string;
};

export type BQuestion = {
  id: string;
  text: string;
  type: QType;
  signals: SignalKey[];
  /** Only drawn for members targeting this level or higher. */
  minLevel?: LevelKey;
  /** The question behind the question, when it is worth spelling out. */
  behind?: string;
  /** Hypotheticals: the scripted interviewer answers clarifying questions. */
  clarifiers?: Clarifier[];
  big?: 'tmay' | 'project' | 'conflict';
};

export const QTYPES: { key: QType; title: string; shape: string }[] = [
  { key: 'time', title: 'Tell me about a time', shape: 'Pick a real story and tell it as CARL.' },
  { key: 'values', title: 'Values', shape: 'Name a short framework (2–3 parts), then prove it with a story.' },
  { key: 'hypo', title: 'Hypothetical', shape: 'Ask 1–2 clarifying questions, give a framework, walk 2–3 scenarios, ground it in a real story, finish strong.' },
  { key: 'tmay', title: 'Tell me about yourself', shape: 'Summary, 2–3 accomplishments, a forward-looking line. About two minutes.' },
  { key: 'ask', title: 'Your questions', shape: 'One or two specific questions for this interviewer.' },
];
export const qtypeTitle = (t: QType) => QTYPES.find((q) => q.key === t)?.title ?? t;

const T = (id: string, text: string, signals: SignalKey[], extra: Partial<BQuestion> = {}): BQuestion => ({
  id,
  text,
  type: 'time',
  signals,
  ...extra,
});
const V = (id: string, text: string, signals: SignalKey[], extra: Partial<BQuestion> = {}): BQuestion => ({
  id,
  text,
  type: 'values',
  signals,
  ...extra,
});
const H = (id: string, text: string, signals: SignalKey[], clarifiers: Clarifier[], extra: Partial<BQuestion> = {}): BQuestion => ({
  id,
  text,
  type: 'hypo',
  signals,
  clarifiers,
  ...extra,
});

const BASIC_CLARIFIER: Clarifier = {
  q: 'What do you mean by that, exactly?',
  a: 'Whatever it means to you. Go ahead.',
  good: false,
  why: 'Too basic. It buys time without changing your approach.',
};
const DEFLECT_CLARIFIER: Clarifier = {
  q: 'Well, what would you do?',
  a: 'I am more interested in what you would do.',
  good: false,
  why: 'Deflecting. The interviewer wants your judgment.',
};

export const QUESTIONS: BQuestion[] = [
  // ---------------------------------------------------------------- the Big Three
  T('tmay', 'Tell me about yourself.', ['scope'], {
    type: 'tmay',
    big: 'tmay',
    behind: 'Orient me: your level, your strengths, which of your stories I should ask about, and whether you actually want this role.',
  }),
  T('proj-favorite', 'Tell me about your favorite project.', ['scope', 'ownership'], {
    big: 'project',
    behind: 'Not your personal favorite: your biggest, most complete piece of work, so I can see your scope and how you get things done end to end.',
  }),
  T('proj-impact', 'Tell me about the project where you had the largest impact.', ['scope', 'ownership'], {
    big: 'project',
    behind: 'Same as "favorite project": show me the high-water mark of your work.',
  }),
  T('proj-proud', 'Tell me about the project you are most proud of.', ['scope', 'ownership'], { big: 'project' }),
  T('proj-largest', 'Tell me about the largest scoped project you have ever worked on.', ['scope'], { big: 'project' }),
  T('conf-resolved', 'Tell me about a time you resolved a conflict.', ['conflict', 'communication'], {
    big: 'conflict',
    behind: 'Do you raise problems directly, use data, stay calm, reach a clear decision and keep the relationship? Your conflict level also tells me your seniority.',
  }),
  T('conf-manager', 'Tell me about a time you disagreed with your manager or another leader.', ['conflict', 'communication'], {
    big: 'conflict',
    behind: 'Judgment, communication and maturity with someone above you. The plot matters less than how you handled it.',
  }),
  T('conf-work', 'Tell me about a time when you were involved in a conflict at work.', ['conflict'], { big: 'conflict' }),

  T('ask-end', 'What questions do you have for me?', ['communication'], {
    type: 'ask',
    behind: 'They judge you on what you ask: preparation, judgment, what you care about.',
  }),

  // ---------------------------------------------------------------- scope
  T('sc-hardest', 'What is the hardest technical problem you have ever solved?', ['scope', 'perseverance']),
  T('sc-complex', 'Tell me about a time you had to solve a complex technical problem.', ['scope']),
  T('sc-progression', 'Walk me through how your responsibilities have grown.', ['scope', 'growth']),
  T('sc-decision', 'Tell me about a decision you made with real business consequences.', ['scope', 'ownership']),
  T('sc-both', 'Describe a situation where you handled technical and people complexity at the same time.', ['scope', 'communication']),
  T('sc-leadership', 'Tell me about a time you demonstrated leadership.', ['scope', 'leadership']),
  T('sc-why', 'Why are you a good fit for this role?', ['scope'], { behind: 'Connect your strongest stories to what this team needs.' }),

  // ---------------------------------------------------------------- ownership
  T('ow-notassigned', 'Tell me about a time you did something impactful that was not assigned to you.', ['ownership']),
  T('ow-originated', 'What is the biggest project you started and drove yourself?', ['ownership', 'scope']),
  T('ow-direction', 'What decision did you make that changed the direction of a project?', ['ownership', 'scope']),
  T('ow-noticed', 'Give me an example of a problem you noticed that others had not.', ['ownership']),
  T('ow-above', 'Tell me about a time you went above and beyond what was asked.', ['ownership', 'perseverance']),
  T('ow-opportunity', 'Tell me about an opportunity others missed that you acted on.', ['ownership']),
  T('ow-prevent', 'Describe a time you prepared for a problem before it happened.', ['ownership']),
  T('ow-measure', 'How have you measured whether something you built was successful?', ['ownership', 'scope']),
  T('ow-focus', 'Give me an example of how you kept a team focused on shipping.', ['ownership', 'leadership']),

  // ---------------------------------------------------------------- ambiguity
  T('am-nodirection', 'Tell me about a time you started something without a clear direction.', ['ambiguity']),
  T('am-unclear', 'Describe a time you worked with unclear requirements.', ['ambiguity']),
  T('am-changing', 'Tell me about a project where the requirements kept changing.', ['ambiguity', 'perseverance']),
  T('am-incomplete', 'Describe a time you made a decision with incomplete information.', ['ambiguity', 'ownership']),
  T('am-priority', 'Tell me about a tough prioritization decision you made.', ['ambiguity', 'scope']),
  T('am-success', 'Tell me about a time you had to define what success meant for an unclear project.', ['ambiguity', 'ownership']),
  T('am-many', 'Tell me about a problem with many possible solutions. How did you choose?', ['ambiguity']),
  T('am-planexec', 'Tell me about a time you balanced planning with moving fast.', ['ambiguity', 'perseverance']),
  T('am-new', 'Give me an example of structuring your approach to a completely new kind of problem.', ['ambiguity', 'growth']),

  // ---------------------------------------------------------------- perseverance
  T('pe-blocked', 'Tell me about a time something was delayed or blocked. What did you do?', ['perseverance']),
  T('pe-obstacles', 'Tell me about a project that hit major obstacles.', ['perseverance', 'scope']),
  T('pe-longer', 'Describe a project that took much longer than expected.', ['perseverance', 'communication']),
  T('pe-behind', 'Tell me about a time a project was behind and how you responded.', ['perseverance', 'ownership']),
  T('pe-adapt', 'Share an example of adapting to a requirement that changed quickly.', ['perseverance', 'ambiguity']),
  T('pe-debug', 'Tell me about a particularly hard debugging or problem-solving process.', ['perseverance', 'scope']),
  T('pe-learnfast', 'Tell me about a time you had to learn a difficult skill or technology to finish something.', ['perseverance', 'growth']),
  T('pe-quality', 'Describe keeping the quality bar up under pressure.', ['perseverance', 'ownership']),
  T('pe-cancel', 'Have you ever had to cancel a project? Why?', ['perseverance', 'ownership']),

  // ---------------------------------------------------------------- conflict
  T('co-teammate', 'Tell me about a time you strongly disagreed with a teammate.', ['conflict']),
  T('co-difficult', 'Tell me about working with someone difficult.', ['conflict', 'communication']),
  T('co-resist', 'Tell me about a time you got something from someone who did not want to give it to you.', ['conflict', 'communication'], {
    behind: 'Persuasion and relationship management: do you cut through friction with data and empathy, without burning bridges?',
  }),
  T('co-feedback', 'Tell me about delivering difficult feedback to a colleague.', ['conflict', 'communication']),
  T('co-common', 'Give me an example of finding common ground with someone who had the opposite view.', ['conflict']),
  T('co-teams', 'Tell me about a conflict between two teams or departments.', ['conflict', 'leadership']),
  T('co-manageup', 'Tell me about a time you changed your manager’s mind.', ['conflict', 'communication']),
  T('co-priorities', 'How do you handle people having different priorities?', ['conflict', 'ambiguity']),

  // ---------------------------------------------------------------- growth
  T('gr-failed', 'Tell me about a time you failed.', ['growth'], {
    behind: 'Self-awareness: a real failure (not a disguised strength), why your call was reasonable at the time, what you learned, and proof you changed.',
  }),
  T('gr-mistake', 'Tell me about the biggest mistake you have made and what happened next.', ['growth']),
  T('gr-feedback', 'Tell me about difficult feedback you received and how you applied it.', ['growth']),
  T('gr-recentfb', 'Tell me about recent constructive feedback from your manager.', ['growth']),
  T('gr-wrong', 'Describe a time you had to admit you were wrong and change course.', ['growth', 'conflict']),
  T('gr-learned', 'Tell me about a time you learned something.', ['growth']),
  T('gr-seek', 'Give me an example of actively seeking out feedback.', ['growth']),
  T('gr-unlearn', 'Tell me about unlearning an old approach and adopting a new one.', ['growth', 'ambiguity']),
  T('gr-mentor', 'Describe a time you mentored someone.', ['growth', 'leadership']),
  T('gr-weakness', 'What is your biggest weakness?', ['growth'], {
    behind: 'A real, non-fatal weakness you are actively working on, with evidence of progress. Not "I am a perfectionist".',
  }),
  T('gr-different', 'Looking back at your last big project, what would you do differently?', ['growth']),

  // ---------------------------------------------------------------- communication
  T('cm-stakes', 'Tell me about convincing others when the stakes were high.', ['communication', 'leadership']),
  T('cm-nontech', 'Tell me about explaining something technical to a non-technical audience.', ['communication']),
  T('cm-misunderstood', 'Tell me about a time you were misunderstood.', ['communication', 'conflict']),
  T('cm-facilitate', 'Describe a discussion you facilitated between other people.', ['communication', 'leadership']),
  T('cm-docs', 'Tell me about something you wrote that others could easily follow.', ['communication']),
  T('cm-adapt', 'Give me an example of adapting your style for different audiences.', ['communication']),
  T('cm-align', 'Tell me about keeping several teams or people aligned.', ['communication', 'leadership']),
  T('cm-negative', 'How did you adapt how you communicated to turn a potentially negative situation around?', ['communication', 'conflict']),

  // ---------------------------------------------------------------- leadership
  T('le-noauthority', 'Tell me about influencing someone without authority.', ['leadership', 'communication']),
  T('le-change', 'Tell me about driving a change across a team or organization.', ['leadership', 'scope']),
  T('le-mentored', 'How have you helped people around you grow, when they did not report to you?', ['leadership', 'growth']),
  T('le-convince', 'Tell me about convincing leadership to change direction.', ['leadership', 'conflict'], { minLevel: 'L5' }),
  T('le-multiteam', 'Give me an example of coordinating a complex, multi-team effort.', ['leadership', 'scope'], { minLevel: 'L5' }),
  T('le-scale', 'How have you scaled yourself as your responsibilities grew?', ['leadership', 'scope'], { minLevel: 'L6' }),
  T('pm-under', 'Tell me about a time you had an underperforming report.', ['leadership', 'conflict'], { minLevel: 'M1' }),
  T('pm-senior', 'How did you help a senior report grow?', ['leadership', 'growth'], { minLevel: 'M1' }),
  T('pm-hiremistake', 'Tell me about a mistake you made hiring or delegating.', ['leadership', 'growth'], { minLevel: 'M1' }),
  T('pm-reorg', 'Tell me about restructuring a team.', ['leadership', 'communication'], { minLevel: 'M1' }),

  // ---------------------------------------------------------------- values
  V('va-debt', 'How do you approach technical debt?', ['ownership', 'scope']),
  V('va-review', 'What is your philosophy on code reviews?', ['communication', 'growth']),
  V('va-priorities', 'How do you handle competing priorities?', ['ambiguity', 'ownership']),
  V('va-mentoring', 'What is your approach to mentoring?', ['leadership', 'growth']),
  V('va-prioritize', 'What is your framework for prioritization?', ['ambiguity', 'scope']),
  V('va-shortlong', 'How do you balance short-term wins with long-term goals?', ['scope', 'ambiguity']),
  V('va-feedback', 'How do you think about giving and receiving feedback?', ['growth', 'communication']),
  V('va-crossteam', 'What is your approach to communicating across teams?', ['communication', 'leadership']),
  V('va-testing', 'What is your approach to testing?', ['ownership', 'scope']),
  V('va-learning', 'How do you learn a new technology?', ['growth']),
  V('va-quality', 'How do you think about product quality?', ['ownership']),
  V('va-manageup', 'What is your strategy for managing up?', ['communication'], { minLevel: 'L5' }),
  V('va-leadstyle', 'What is your leadership style?', ['leadership'], { minLevel: 'L5' }),
  V('va-hiring', 'What is your hiring philosophy?', ['leadership'], { minLevel: 'M1' }),
  V('va-oneonone', 'How do you approach one-on-ones?', ['leadership', 'communication'], { minLevel: 'M1' }),

  // ---------------------------------------------------------------- hypotheticals
  H(
    'hy-behind',
    'Suppose a project you own is significantly behind schedule. What would you do?',
    ['perseverance', 'ownership', 'communication'],
    [
      { q: 'Is the deadline a customer commitment or an internal target?', a: 'It is a commitment to our biggest customer.', good: true, why: 'Stakes change everything about how hard you hold the date.' },
      { q: 'Do I have flexibility on scope or people?', a: 'Scope can move a little. Nobody new is coming.', good: true, why: 'It tells you which levers exist before you pick one.' },
      { q: 'How far behind are we, roughly?', a: 'About three weeks on a ten-week plan.', good: true, why: 'Sizes the gap before you choose a response.' },
      BASIC_CLARIFIER,
    ],
  ),
  H(
    'hy-coworker',
    'How would you be productive working with a difficult coworker?',
    ['conflict', 'communication'],
    [
      { q: 'Difficult how: missing work, or friction in how we talk?', a: 'They push back hard in every design review.', good: true, why: 'Different root causes need different fixes.' },
      { q: 'Are we on the same team, or partners?', a: 'Same team, same manager.', good: true, why: 'Tells you whether going direct or escalating is appropriate.' },
      DEFLECT_CLARIFIER,
    ],
  ),
  H(
    'hy-disagree',
    'What would you do if you disagreed with a technical decision your team made?',
    ['conflict', 'ownership'],
    [
      { q: 'Has the decision shipped, or can it still change?', a: 'It was decided last week; work starts Monday.', good: true, why: 'Timing decides how hard to push.' },
      { q: 'How costly is it to reverse later?', a: 'Hard to undo: it changes the data model.', good: true, why: 'Reversible vs irreversible decides how much to fight.' },
      BASIC_CLARIFIER,
    ],
  ),
  H(
    'hy-failing',
    'How would you turn around a failing project?',
    ['ownership', 'leadership', 'perseverance'],
    [
      { q: 'Failing how: late, low quality, or nobody wants it?', a: 'It shipped, but almost nobody is using it.', good: true, why: 'The diagnosis decides the whole plan.' },
      { q: 'Am I leading it, or a contributor on it?', a: 'You were just made the lead.', good: true, why: 'Your authority changes your levers.' },
      DEFLECT_CLARIFIER,
    ],
  ),
  H(
    'hy-many',
    'How would you approach a problem with many possible solutions?',
    ['ambiguity', 'scope'],
    [
      { q: 'How reversible is the choice?', a: 'Very hard to change once we pick.', good: true, why: 'One-way doors deserve more analysis.' },
      { q: 'What is the time pressure?', a: 'We need a direction in two weeks.', good: true, why: 'Sets how much exploring you can afford.' },
      BASIC_CLARIFIER,
    ],
  ),
  H(
    'hy-reqchange',
    'Suppose the requirements change dramatically halfway through a project. How would you adapt?',
    ['ambiguity', 'perseverance', 'communication'],
    [
      { q: 'Who changed them, and why?', a: 'Sales landed a customer who needs something different.', good: true, why: 'Understanding the why tells you what is now most important.' },
      { q: 'Does the deadline move with them?', a: 'No, the date stays.', good: true, why: 'Fixed date plus new scope forces a tradeoff conversation.' },
      BASIC_CLARIFIER,
    ],
  ),
  H(
    'hy-mistake',
    'What would you do if you made a significant mistake that impacted users?',
    ['growth', 'ownership', 'communication'],
    [
      { q: 'Is it still affecting users right now?', a: 'Yes, checkout is failing for about 5% of users.', good: true, why: 'Active impact means stop the bleeding first.' },
      { q: 'Does anyone else know yet?', a: 'Not yet. You noticed it first.', good: true, why: 'Tests whether you surface problems early.' },
      DEFLECT_CLARIFIER,
    ],
  ),
  H(
    'hy-newtech',
    'How would you approach learning a technology you have never used, on a deadline?',
    ['growth', 'ambiguity'],
    [
      { q: 'Is there anyone on the team who knows it?', a: 'One person on another team, and they are busy.', good: true, why: 'Tells you whether you can lean on people or only docs.' },
      { q: 'How much of the project depends on it?', a: 'The core of it.', good: true, why: 'Sets how deep you need to go.' },
      BASIC_CLARIFIER,
    ],
  ),
  H(
    'hy-resistant',
    'How would you handle needing something from a partner team that keeps pushing back?',
    ['conflict', 'communication', 'leadership'],
    [
      { q: 'Why are they pushing back: capacity, or disagreement?', a: 'They say they have no capacity this quarter.', good: true, why: 'Capacity and disagreement need different approaches.' },
      { q: 'What happens to us if they never deliver?', a: 'Our launch slips a quarter.', good: true, why: 'Quantifies the stakes for the escalation case.' },
      DEFLECT_CLARIFIER,
    ],
  ),
  H(
    'hy-badnews',
    'How would you communicate bad news to leadership?',
    ['communication', 'ownership'],
    [
      { q: 'How bad: a slip, or a cancellation?', a: 'The launch will slip by a month.', good: true, why: 'Severity decides channel and urgency.' },
      { q: 'Do I already have a recovery plan?', a: 'Partly.', good: true, why: 'Bring options, not just problems.' },
      BASIC_CLARIFIER,
    ],
    { minLevel: 'L4' },
  ),
];

/** The three mock interview scripts: each covers the signal areas the way a real loop does. */
export const SCRIPTS: { id: string; title: string; questions: string[] }[] = [
  { id: 'script-1', title: 'Script 1', questions: ['tmay', 'proj-largest', 'sc-complex', 'ow-notassigned', 'pe-adapt', 'conf-manager', 'gr-failed', 'ow-above'] },
  { id: 'script-2', title: 'Script 2', questions: ['tmay', 'sc-why', 'proj-proud', 'ow-opportunity', 'co-resist', 'am-many', 'cm-misunderstood', 'pe-behind', 'gr-learned'] },
  { id: 'script-3', title: 'Script 3', questions: ['tmay', 'proj-impact', 'sc-leadership', 'conf-work', 'am-unclear', 'ow-prevent', 'am-planexec', 'cm-nontech', 'gr-recentfb'] },
];

/** Asked after a story regardless of area: the ones interviewers use most. */
export const COMMON_FOLLOWUPS = [
  'What would you do differently?',
  'What was the hardest part of that?',
  'How did you measure success?',
  'Did you run into any conflicts on that project?',
];

/** Follow-ups to prepare for each core story, so nothing about it surprises you. */
export const FOLLOWUP_SET = [
  'What was the hardest part?',
  'What constraints were you working under?',
  'What were your specific contributions?',
  'How much of this was your idea vs. assigned?',
  'Who else was involved, and what did they do?',
  'How did you make the key decision?',
  'What alternatives did you consider?',
  'How did you measure success?',
  'What was the long-term impact?',
  'How did others react to your approach?',
  'Did you run into any conflicts?',
  'What would you do differently?',
];

export const questionById = (id: string): BQuestion | null => QUESTIONS.find((q) => q.id === id) ?? null;

/** Questions a member at `level` can be asked. */
export const questionsFor = (level: LevelKey) => QUESTIONS.filter((q) => !q.minLevel || levelRank(q.minLevel) <= levelRank(level));

/** The question behind the question: hand-written when it matters, otherwise built from the signal areas. */
export function behind(q: BQuestion): string {
  if (q.behind) return q.behind;
  const areas = q.signals.map((s) => signalByKey(s));
  return `They are scoring ${areas.map((a) => a.title).join(' + ')}: ${areas.map((a) => a.definition.replace(/\.$/, '').toLowerCase()).join('; ')}.`;
}

/** A question built from one of the target company's values. */
export function valueQuestion(value: string, signals: SignalKey[], i: number): BQuestion {
  return T(`val-${i}`, `Tell me about a time you showed “${value}”.`, signals.length ? signals : ['ownership'], {
    behind: `A company value is a signal area in disguise. They want a story that proves ${signals.map((s) => signalByKey(s).title).join(' + ') || 'the behavior'}; do not just repeat the value's name.`,
  });
}

/** Rounds saved before the rebuild used these ids. Kept so history still reads. */
const LEGACY: Record<string, string> = {
  'conflict-1': 'Tell me about a time you disagreed with a teammate.',
  'conflict-2': 'Tell me about a time you had to work with someone difficult.',
  'conflict-3': 'Describe a time you pushed back on a decision.',
  'conflict-4': 'Tell me about a time two people on your team wanted different things.',
  'failure-1': 'Tell me about a time you failed.',
  'failure-2': 'Tell me about a mistake you made, and how you handled it.',
  'failure-3': 'Describe a project that did not go as planned.',
  'failure-4': 'Tell me about a time you got critical feedback.',
  'leadership-1': 'Tell me about a time you led a group without being in charge.',
  'leadership-2': 'Describe a time you took ownership of something outside your role.',
  'leadership-3': 'Tell me about a time you helped someone else get better.',
  'leadership-4': 'Tell me about a decision you made that others disagreed with.',
  'ambiguity-1': 'Tell me about a time you had to solve a problem with unclear requirements.',
  'ambiguity-2': 'Describe a time you had to decide without all the information.',
  'ambiguity-3': 'Tell me about a time the plan changed halfway through.',
  'ambiguity-4': 'Tell me about a time you had to figure something out with no one to ask.',
  'impact-1': 'Tell me about the project you are most proud of.',
  'impact-2': 'Tell me about a time you went beyond what was asked.',
  'impact-3': 'Describe a time you made a process or a tool better.',
  'impact-4': 'What is the hardest technical problem you have solved?',
  'pressure-1': 'Tell me about a time you had a tight deadline.',
  'pressure-2': 'Describe a time you had too many things to do at once. How did you prioritize?',
  'pressure-3': 'Tell me about a time something broke at the worst possible moment.',
  'pressure-4': 'Tell me about a time you had to cut scope to ship.',
  'learning-1': 'Tell me about a time you had to learn something new quickly.',
  'learning-2': 'Describe a time you picked up an unfamiliar technology for a project.',
  'learning-3': 'Tell me about a time you were wrong and changed your mind.',
  'learning-4': 'What is something you taught yourself recently?',
  'motivation-1': 'Tell me about yourself.',
  'motivation-2': 'Why do you want to work here?',
  'motivation-3': 'Why this role, and why now?',
  'motivation-4': 'Where do you see yourself in a few years?',
};

/** Any question id ever saved, as display text. */
export const questionText = (id: string): string => questionById(id)?.text ?? LEGACY[id] ?? (id === 'rehearse' ? 'Story rehearsal' : id);
/** Ids the server accepts on a saved round. */
export const isKnownQuestion = (id: string) => !!questionById(id) || /^val-\d{1,2}$/.test(id) || id === 'rehearse';
