/**
 * Behavioral rounds: the questions, the follow-up probes, and the copy. Most
 * loops have one or two of these next to the coding rounds, and they are
 * graded on the same thing every time: a specific story, told in STAR order
 * (situation, task, action, result), about what YOU did, ending in a result.
 */

export type CompetencyKey =
  | 'conflict'
  | 'failure'
  | 'leadership'
  | 'ambiguity'
  | 'impact'
  | 'pressure'
  | 'learning'
  | 'motivation';

export const COMPETENCIES: { key: CompetencyKey; title: string; probes: string[] }[] = [
  {
    key: 'conflict',
    title: 'Conflict',
    probes: ['What did the other person think, in their own words?', 'Looking back, was there a better way to handle it?'],
  },
  {
    key: 'failure',
    title: 'Failure',
    probes: ['What would you do differently now?', 'How do you make sure it does not happen again?'],
  },
  {
    key: 'leadership',
    title: 'Leadership',
    probes: ['How did you get people to follow you without authority?', 'What did you do when someone did not agree?'],
  },
  {
    key: 'ambiguity',
    title: 'Ambiguity',
    probes: ['What did you do first, before anything was clear?', 'How did you know you were heading the right way?'],
  },
  {
    key: 'impact',
    title: 'Impact',
    probes: ['How did you measure that it worked?', 'What was the hardest part, and why?'],
  },
  {
    key: 'pressure',
    title: 'Pressure',
    probes: ['What did you decide not to do, and why?', 'Who did you tell, and when?'],
  },
  {
    key: 'learning',
    title: 'Learning fast',
    probes: ['How did you learn it? Walk me through the first day.', 'What would you tell someone starting it today?'],
  },
  {
    key: 'motivation',
    title: 'Motivation',
    probes: ['What would make you leave a job like this?', 'What is something specific about this team that pulls you in?'],
  },
];

/** Asked after every answer regardless of competency: the questions interviewers actually use to dig. */
export const GENERAL_PROBES = ['What was your part, specifically?', 'What was the result, in numbers if you can?'];

export type Question = { id: string; competency: CompetencyKey; text: string };

const Q = (competency: CompetencyKey, texts: string[]): Question[] =>
  texts.map((text, i) => ({ id: `${competency}-${i + 1}`, competency, text }));

export const QUESTIONS: Question[] = [
  ...Q('conflict', [
    'Tell me about a time you disagreed with a teammate.',
    'Tell me about a time you had to work with someone difficult.',
    'Describe a time you pushed back on a decision.',
    'Tell me about a time two people on your team wanted different things.',
  ]),
  ...Q('failure', [
    'Tell me about a time you failed.',
    'Tell me about a mistake you made, and how you handled it.',
    'Describe a project that did not go as planned.',
    'Tell me about a time you got critical feedback.',
  ]),
  ...Q('leadership', [
    'Tell me about a time you led a group without being in charge.',
    'Describe a time you took ownership of something outside your role.',
    'Tell me about a time you helped someone else get better.',
    'Tell me about a decision you made that others disagreed with.',
  ]),
  ...Q('ambiguity', [
    'Tell me about a time you had to solve a problem with unclear requirements.',
    'Describe a time you had to decide without all the information.',
    'Tell me about a time the plan changed halfway through.',
    'Tell me about a time you had to figure something out with no one to ask.',
  ]),
  ...Q('impact', [
    'Tell me about the project you are most proud of.',
    'Tell me about a time you went beyond what was asked.',
    'Describe a time you made a process or a tool better.',
    'What is the hardest technical problem you have solved?',
  ]),
  ...Q('pressure', [
    'Tell me about a time you had a tight deadline.',
    'Describe a time you had too many things to do at once. How did you prioritize?',
    'Tell me about a time something broke at the worst possible moment.',
    'Tell me about a time you had to cut scope to ship.',
  ]),
  ...Q('learning', [
    'Tell me about a time you had to learn something new quickly.',
    'Describe a time you picked up an unfamiliar technology for a project.',
    'Tell me about a time you were wrong and changed your mind.',
    'What is something you taught yourself recently?',
  ]),
  ...Q('motivation', [
    'Tell me about yourself.',
    'Why do you want to work here?',
    'Why this role, and why now?',
    'Where do you see yourself in a few years?',
  ]),
];

export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id) ?? null;
export const competencyByKey = (k: CompetencyKey) => COMPETENCIES.find((c) => c.key === k)!;
export const COMPETENCY_KEYS = COMPETENCIES.map((c) => c.key);

/** Seconds. */
export const THINK_S = 30;
export const ANSWER_TARGET: [number, number] = [90, 180];
export const ANSWER_MAX_S = 240;
export const PROBE_MAX_S = 60;
export const LOOP_SIZE = 3;

export const STAR = [
  { key: 's', title: 'Situation', hint: 'Where and when, in two sentences.' },
  { key: 't', title: 'Task', hint: 'What you, specifically, had to get done.' },
  { key: 'a', title: 'Action', hint: 'What you did, step by step. Most of the answer.' },
  { key: 'r', title: 'Result', hint: 'What changed. A number if you have one.' },
] as const;

export const behavioralCopy = {
  title: 'Behavioral',
  eyebrow: 'The other round',
  lead: 'One question, thirty seconds to think, two to three minutes to answer out loud, then a probe. The coach listens for a real result, a number, and how often you say “I” instead of “we”.',
  practice: 'Practice',
  bank: 'Story bank',
  random: 'Random question',
  loop: 'Mock loop',
  loopNote: '3 questions back to back',
  pickCompetency: 'Or pick a competency',
  coverage: 'Story coverage',
  coverageNote: 'Each hexagon is a competency. It lights up once a story in your bank covers it.',
  think: 'Think',
  thinkNote: 'Pick your story. Don’t write a script; just know your four beats.',
  ready: 'I’m ready',
  yourStories: 'Your stories for this',
  noStories: 'No story for this yet. Make one in the story bank after this round.',
  answer: 'Answer',
  answerNote: 'Aim for the green band. Situation and task short, action long, end on the result.',
  doneAnswering: 'Done answering',
  probe: 'Follow-up',
  doneProbe: 'Done',
  check: 'How was it?',
  starCheck: 'Did you hit all four beats?',
  usedStory: 'Story you used',
  noStoryUsed: 'None of my saved stories',
  save: 'Save round',
  saving: 'Saving…',
  nextQuestion: 'Next question',
  finishLoop: 'See the loop',
  again: 'Another question',
  backToMenu: 'Back',
  loopDone: 'Loop done',
  question: (n: number, of: number) => `Question ${n} of ${of}`,
  recent: 'Recent rounds',
  noRounds: 'No behavioral rounds yet.',
  newStory: 'New story',
  editStory: 'Edit story',
  storyTitle: 'Title',
  storyTitlePlaceholder: 'The release that almost slipped',
  tags: 'Covers',
  saveStory: 'Save story',
  deleteStory: 'Delete',
  deleteConfirm: 'Delete this story? Rounds that used it keep their transcripts.',
  cancel: 'Cancel',
  storiesEmpty:
    'No stories yet. Most candidates need six to eight good ones; each can cover two or three competencies. Start with the project you are proudest of.',
  noMic: 'Mic was off, so only the timing is measured.',
  storyLimit: 'You have 30 stories, the limit. Delete one to add another.',
};

export const behavioralErrors: Record<string, string> = {
  story_limit: behavioralCopy.storyLimit,
  round_limit: 'That’s a lot of rounds today. Come back tomorrow.',
  bad_question: 'That question wasn’t found. Reload the page and try again.',
};
