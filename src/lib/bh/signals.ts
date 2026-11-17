/**
 * The eight signal areas: what behavioral interviewers are actually scoring.
 * Adapted (in our own words) from Mastering Behavioral Interviews, A. McDonald.
 * Every question maps to one or more of these; every story is tagged with the
 * ones it can prove.
 */

export type SignalKey =
  | 'scope'
  | 'ownership'
  | 'ambiguity'
  | 'perseverance'
  | 'conflict'
  | 'growth'
  | 'communication'
  | 'leadership';

export type SignalArea = {
  key: SignalKey;
  title: string;
  /** One line: what it means. */
  definition: string;
  /** Repeatable behaviors the interviewer listens for. */
  behaviors: string[];
  /** Journaling prompts that dig a story for this area out of your memory. */
  mine: string[];
  /** Self-checks run on a story told for this area. */
  pitfalls: string[];
  /** Branch follow-ups an interviewer uses to dig into this area. */
  probes: string[];
};

export const SIGNALS: SignalArea[] = [
  {
    key: 'scope',
    title: 'Scope',
    definition: 'How big, complex and consequential the work you have done is, and how that has grown.',
    behaviors: [
      'Work that ran for a long stretch (months, not days)',
      'Moved a number that mattered to the business or users',
      'Handled real technical complexity (design, performance, architecture)',
      'Handled organizational complexity (many people, teams or partners)',
      'Made decisions with real consequences',
      'Took on more responsibility over time',
    ],
    mine: [
      'What project am I proudest of, and why exactly?',
      'What is the hardest technical, product or people problem I have solved?',
      'What is the biggest thing I have built that real people used?',
    ],
    pitfalls: [
      'Did I make the size of the work clear (time, components, people, teams)?',
      'Is this story at the level I am interviewing for?',
      'Am I saying what I did, or just what happened?',
    ],
    probes: ['What made this hard, specifically?', 'How many people or teams did this touch?', 'What would have happened if nobody did this?'],
  },
  {
    key: 'ownership',
    title: 'Ownership',
    definition: 'Spotting problems nobody asked you to solve and driving them to a result.',
    behaviors: [
      'Noticed the problem without being told',
      'Drove the fix end to end instead of only flagging it',
      'Tracked the outcome, not just "task done"',
      'Took responsibility beyond the job description',
      'Followed up to make sure it stuck',
    ],
    mine: [
      'What is the biggest thing I started and drove myself?',
      'What decision did I make that changed where a project went?',
      'When did I fix something that was not my job?',
    ],
    pitfalls: [
      'How did I realize action was needed?',
      'Is this self-starting, or just finishing an assigned task?',
      'What would have happened if I had not acted?',
      'How did I get others aligned to do the work?',
    ],
    probes: ['How did you notice this in the first place?', 'Whose job was this, officially?', 'How did you know it worked?'],
  },
  {
    key: 'ambiguity',
    title: 'Ambiguity',
    definition: 'Breaking down a big, unclear problem and making progress before everything is known.',
    behaviors: [
      'Split a vague problem into concrete pieces',
      'Made assumptions and wrote them down',
      'Pulled information from several sources to reduce uncertainty',
      'Started with partial information instead of waiting',
      'Prioritized when everything looked important',
    ],
    mine: [
      'When did I start something with no clear direction? What did I do first?',
      'When did I have to make a hard prioritization call?',
      'When did the requirements change under me?',
    ],
    pitfalls: [
      'Did I show how unclear it really was?',
      'What method did I use to tame it? Is it structured?',
      'Did I clarify things for other people too?',
      'Did I act while it was still unclear?',
    ],
    probes: ['What did you do first, before anything was clear?', 'Which assumptions did you make?', 'How did you know you were heading the right way?'],
  },
  {
    key: 'perseverance',
    title: 'Perseverance',
    definition: 'Keeping effort and morale up when the work hits real obstacles.',
    behaviors: [
      'Kept pushing when the project hit a wall',
      'Tried several approaches when the first one failed',
      'Kept the team motivated through a rough stretch',
      'Learned a new skill under pressure',
      'Adapted the plan without losing the goal',
    ],
    mine: ['When was something delayed or blocked, and what did I do?', 'When did my first approach fail, and what came next?', 'What did I have to learn fast to finish?'],
    pitfalls: [
      'Did I sell how hard the obstacle really was?',
      'What was the cost if it stayed unsolved?',
      'Is this sustained effort, or a quick win?',
      'How did I keep myself and others going?',
    ],
    probes: ['What was the lowest point?', 'What else did you try before that worked?', 'How did you keep the team going?'],
  },
  {
    key: 'conflict',
    title: 'Conflict',
    definition: 'Working through disagreements productively, getting to a decision and keeping the relationship.',
    behaviors: [
      'Started the hard conversation instead of avoiding it',
      'Brought data or a prototype instead of opinions',
      'Understood the other side before arguing',
      'Found a win-win or a fair compromise; disagreed and committed',
      'Kept the relationship working afterwards',
      'Escalated only when direct resolution failed',
    ],
    mine: ['When did I most strongly disagree with a manager, teammate or partner?', 'When did I have to work with someone difficult?', 'When did I need something from someone who did not want to give it?'],
    pitfalls: [
      'Is the conflict at the level I am interviewing for?',
      'Did I seek to understand before being understood? Did I show empathy?',
      'Was I the one who moved it toward resolution?',
      'How did it end? Was it win-win?',
      'What is the relationship like now?',
    ],
    probes: ['What did the other person think, in their own words?', 'Where is that relationship now?', 'Looking back, was there a better way to handle it?'],
  },
  {
    key: 'growth',
    title: 'Growth',
    definition: 'Owning mistakes, acting on feedback, and helping others improve.',
    behaviors: [
      'Admitted a real mistake and owned it',
      'Pulled a specific lesson out of it and used it later',
      'Asked for feedback and changed because of it',
      'Mentored or coached someone else',
      'Shared lessons with the wider team',
    ],
    mine: ['What is the biggest mistake I have made, and what happened next?', 'What feedback changed how I work?', 'When did I have to learn something completely new under pressure?'],
    pitfalls: [
      'If this is a mistake, is it a real one?',
      'Was it obviously a mistake from the start? (That reads as bad judgment.)',
      'Did I notice it, or did someone have to tell me?',
      'Did I apply the lesson somewhere later?',
    ],
    probes: ['What would you do differently now?', 'When did you use that lesson again?', 'How did you take that feedback at first?'],
  },
  {
    key: 'communication',
    title: 'Communication',
    definition: 'Getting the right message to the right people in the right form at the right time.',
    behaviors: [
      'Adapted the message for technical vs non-technical people',
      'Picked the right channel (doc, meeting, chat, 1:1)',
      'Shared updates and bad news early, unprompted',
      'Ran discussions that ended in a decision',
      'Kept several teams aligned',
    ],
    mine: ['When did I convince people when the stakes were high?', 'When did I explain something technical to someone non-technical?', 'When was I misunderstood, and how did I fix it?'],
    pitfalls: [
      'Did I say how and why I communicated, not just that I did?',
      'Do I show both written and spoken communication?',
      'Do I show communicating up, down and across?',
    ],
    probes: ['How did you know the message landed?', 'Why that channel and not another?', 'Who did you tell first, and why?'],
  },
  {
    key: 'leadership',
    title: 'Leadership',
    definition: 'Moving people and outcomes forward, with or without a title.',
    behaviors: [
      'Influenced people through expertise, relationships or a clear vision',
      'Built consensus around an approach',
      'Mentored or developed teammates',
      'Owned an improvement for the whole team or org',
      'Represented the team to outside people',
      'Made decisions that affected others and owned the result',
    ],
    mine: ['When did I get people to follow me without authority?', 'Who have I significantly helped grow?', 'When did I drive a change across a team or group?'],
    pitfalls: ['Did I show influence over others?', 'How much of that came from my position, and how much from me?'],
    probes: ['How did you get people to follow you without authority?', 'What did you do when someone did not agree?', 'How did that person grow afterwards?'],
  },
];

export const SIGNAL_KEYS: SignalKey[] = SIGNALS.map((s) => s.key);
export const signalByKey = (k: SignalKey): SignalArea => SIGNALS.find((s) => s.key === k)!;
export const isSignalKey = (v: unknown): v is SignalKey => typeof v === 'string' && (SIGNAL_KEYS as string[]).includes(v);

/** The old home-made competency tags, mapped onto signal areas. Motivation has no area (it lives in "Tell me about yourself"). */
export const LEGACY_TAG_MAP: Record<string, SignalKey | null> = {
  conflict: 'conflict',
  failure: 'growth',
  learning: 'growth',
  impact: 'scope',
  pressure: 'perseverance',
  leadership: 'leadership',
  ambiguity: 'ambiguity',
  motivation: null,
};
