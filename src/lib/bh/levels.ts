/**
 * Target levels. Interviewers judge a story against the level you are hired
 * at, so every rule threshold, every example and the recency window comes
 * from here. Big Tech leveling, engineering flavour (other roles map across).
 */

export type LevelKey = 'L3' | 'L4' | 'L5' | 'L6' | 'M1';
export type CompanyKind = 'bigtech' | 'startup' | 'traditional';
export type Duration = 'days' | 'weeks' | 'months' | 'year';

export type Level = {
  key: LevelKey;
  title: string;
  /** How work is sized at this level. */
  works: string;
  /** What conflict looks like at this level. */
  conflict: string;
  /** The usual length of one piece of work you own. */
  typical: Duration;
  /** Fewest concrete actions a core story should list. */
  minActions: number;
  /** A story older than this many years starts to hurt; older than `recencyFlag` should be replaced. */
  recencyWarn: number;
  recencyFlag: number;
  /** How many core stories, and seeds overall, the catalog should reach. */
  coreTarget: number;
  seedTarget: number;
  /** Personal / school stories are only fine up to here. */
  personalOk: boolean;
  schoolOk: boolean;
  /** Core stories interviewers commonly hear at this level. */
  examples: string[];
};

export const LEVELS: Level[] = [
  {
    key: 'L3',
    title: 'Intern / New grad (L3)',
    works: 'Task level: you get a task (1–5 days), finish it, come back for the next. You still need guidance often.',
    conflict: 'You raise disagreements; you may need help resolving them.',
    typical: 'days',
    minActions: 3,
    recencyWarn: 2,
    recencyFlag: 4,
    coreTarget: 2,
    seedTarget: 6,
    personalOk: true,
    schoolOk: true,
    examples: [
      'Built a small feature from design to deploy',
      'Tracked down a production or demo-breaking bug across several parts of the system',
      'Automated a manual chore that was eating hours every week',
      'Led a capstone or class project: timeline, tech choices, a team',
      'Got a feature merged into an open-source project through code review',
      'Ran a contest, hackathon team or club project end to end',
    ],
  },
  {
    key: 'L4',
    title: 'Mid-level (L4)',
    works: 'Feature level: you break a feature (1–2 weeks) into tasks, plan it, and mostly run it yourself.',
    conflict: 'You resolve on-team conflicts yourself (implementation details, feature scope).',
    typical: 'weeks',
    minActions: 4,
    recencyWarn: 3,
    recencyFlag: 5,
    coreTarget: 3,
    seedTarget: 8,
    personalOk: false,
    schoolOk: true,
    examples: [
      'Started, researched, planned and shipped a month-long project',
      'Found and fixed a performance bottleneck that hit many users',
      'Built tooling that cut deploy or build time from hours to minutes',
      'Owned the product direction for one user segment',
    ],
  },
  {
    key: 'L5',
    title: 'Senior (L5)',
    works: 'Project level: from a vague direction you build the plan (1–3 months), pull in partners and delegate features.',
    conflict: 'You smoothly resolve conflicts with partners and teammates to keep projects moving.',
    typical: 'months',
    minActions: 5,
    recencyWarn: 3,
    recencyFlag: 6,
    coreTarget: 3,
    seedTarget: 9,
    personalOk: false,
    schoolOk: false,
    examples: [
      'Led a legacy-system migration, coordinating stakeholders and rollout risk',
      'Designed an API or service that other teams adopted',
      'Paid down tech debt that blocked the team, with leadership buy-in',
    ],
  },
  {
    key: 'L6',
    title: 'Staff (L6)',
    works: 'Goal level: you set goals for the team, pick the projects that reach them, and coach others to deliver (about 6 months).',
    conflict: 'You resolve conflicts between teams.',
    typical: 'year',
    minActions: 6,
    recencyWarn: 4,
    recencyFlag: 6,
    coreTarget: 4,
    seedTarget: 10,
    personalOk: false,
    schoolOk: false,
    examples: [
      'Set the technical strategy for a product area across several quarters',
      'Led a major incident response and the reliability practices that followed',
      'Built a platform that made other teams ship much faster',
    ],
  },
  {
    key: 'M1',
    title: 'Manager (M1)',
    works: 'Goal level with people: you own a team of 6–12 (outcomes, technical health, growth), planning about a year out.',
    conflict: 'You resolve conflicts between people, teams and priorities.',
    typical: 'year',
    minActions: 6,
    recencyWarn: 4,
    recencyFlag: 6,
    coreTarget: 4,
    seedTarget: 10,
    personalOk: false,
    schoolOk: false,
    examples: [
      'Grew a team a lot while keeping quality and culture',
      'Turned around an underperforming team or project',
      'Restructured a team and brought people along',
    ],
  },
];

export const LEVEL_KEYS: LevelKey[] = LEVELS.map((l) => l.key);
export const levelByKey = (k: LevelKey): Level => LEVELS.find((l) => l.key === k) ?? LEVELS[0];
export const isLevelKey = (v: unknown): v is LevelKey => typeof v === 'string' && (LEVEL_KEYS as string[]).includes(v);
export const levelRank = (k: LevelKey) => LEVEL_KEYS.indexOf(k);

export const COMPANY_KINDS: { key: CompanyKind; title: string; note: string }[] = [
  { key: 'bigtech', title: 'Big Tech', note: 'Structured rounds, trained interviewers, written feedback to a hiring committee. Use the Builder framing.' },
  { key: 'startup', title: 'Startup', note: 'Less structure, more weight on moving fast, wearing many hats, and real excitement about the product.' },
  { key: 'traditional', title: 'Traditional company', note: 'More weight on stability, process and domain knowledge; hierarchy may matter more.' },
];
export const isCompanyKind = (v: unknown): v is CompanyKind => v === 'bigtech' || v === 'startup' || v === 'traditional';

export const DURATIONS: { key: Duration; title: string; rank: number }[] = [
  { key: 'days', title: 'Days', rank: 1 },
  { key: 'weeks', title: 'Weeks', rank: 2 },
  { key: 'months', title: 'Months', rank: 3 },
  { key: 'year', title: 'A year or more', rank: 4 },
];
export const durationRank = (d: Duration | '') => DURATIONS.find((x) => x.key === d)?.rank ?? 0;
export const isDuration = (v: unknown): v is Duration => DURATIONS.some((d) => d.key === v);

/** Where students should look for stories, in the order interviewers value them. */
export const SOURCE_PRIORITY_L3 = [
  'Internships, co-ops and part-time tech jobs, even short ones',
  'School projects, especially long team ones (capstone)',
  'Personal projects that show initiative and real technical work',
  'Leading clubs, organizations, contests, hackathons or volunteering',
  'Non-tech jobs: fine for people stories like conflicts',
];
