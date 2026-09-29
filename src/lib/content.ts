/**
 * Every piece of copy and data on the site lives here.
 * Edit this file to change the site — you should not need to touch the components.
 * Anything in [square brackets] is a placeholder waiting on a real value.
 */

import { RANK_KEYS, curriculum, type RankKey } from './curriculum';

export const club = {
  name: 'Competitive Programming',
  full: 'Competitive Programming Club',
  school: 'University of Lynchburg',
  tagline: 'club @ lynchburg',
};

export const nav = [
  { href: '#why', label: 'Why join' },
  { href: '#week', label: 'Schedule' },
  { href: '#ranks', label: 'Ranks' },
  { href: '#events', label: 'Events' },
  { href: '#faq', label: 'FAQ' },
];

export const hero = {
  pill: { tag: 'new club', text: 'Study room coming soon', href: '#events' },
  line1: 'Get interview-ready.',
  line2: 'Have fun doing it.',
  sub: 'Competitive Programming Club at University of Lynchburg. Solve puzzles, compete in contests, and build the problem-solving skills top tech companies hire for.',
  subStrong: 'No experience needed.',
  primaryCta: 'Sign up',
  secondaryCta: 'See Upcoming Events',
  /** The code that types itself out in the hero editor. */
  file: 'two_sum.py',
  terminal: { cmd: 'python3 two_sum.py', result: '3/3 tests passed', time: '· 41 ms' },
  toast: { title: 'Accepted', sub: 'two_sum · 41 ms' },
};

export const ticker = [
  'No experience needed',
  'Every major welcome',
  'Free to join',
  'Any language to start',
  'Track every solve',
  'Interview prep',
  'Weekly contests',
  'Come when you can',
];

export const why = {
  eyebrow: 'why join',
  title: 'What you get out of it.',
  cards: [
    {
      icon: 'code' as const,
      title: 'Ace technical interviews',
      body: 'The problems we solve are the kind Google, Amazon, and Meta ask. Practice here, and interview day feels familiar.',
    },
    {
      icon: 'trophy' as const,
      title: 'Compete for real',
      body: 'Climb a real ladder from Guardian to Divine, then test yourself in live contests.',
    },
    {
      icon: 'doc' as const,
      title: 'Stand out on your resume',
      body: 'Contest ratings and results are concrete proof of skill. They say more than “proficient in Python.”',
    },
    {
      icon: 'users' as const,
      title: 'Find your people',
      body: 'A community that loves hard problems, and people to solve them with.',
    },
  ],
};

export const week = {
  eyebrow: 'a typical week',
  title: 'Come to one thing, or all four.',
  when: 'Time and room coming soon',
  items: [
    {
      label: 'Weekly',
      title: 'Beginner session',
      body: 'We teach one core idea, then solve problems on it together. Zero experience is fine.',
      extra: 'when' as const,
    },
    {
      label: 'Weekly',
      title: 'Advanced session',
      body: 'Harder problems and contest strategy. We break down the tricky ones together.',
      extra: 'when' as const,
    },
    {
      label: 'Weekends',
      title: 'Practice contest',
      body: 'A timed contest with a live leaderboard. Low stakes, real bragging rights.',
      extra: 'board' as const,
    },
    {
      label: 'Every day',
      title: 'Problem of the day',
      body: 'A new problem every day, picked from your own rank’s set. Solve it and keep your streak.',
      extra: 'streak' as const,
    },
  ],
};

/* ---------------------------------------------------------------- ranks */

export type Rank = {
  key: RankKey;
  level: number;
  name: string;
  mark: 'shield' | 'chevrons' | 'star' | 'gem' | 'crown';
  /** Size of this rank's problem set. Comes from the generated curriculum. */
  problems: number;
  /** e.g. "50 problems". Divine is different: 30 Hards plus a real assessment. */
  countLabel: string;
  topics: string[];
  tag?: string;
  note?: string;
  earnedOnly?: boolean;
};

const size = (k: RankKey) => curriculum[k].length;

export const ranks: Rank[] = [
  {
    key: 'guardian',
    level: 1,
    name: 'Guardian',
    mark: 'shield',
    problems: size('guardian'),
    countLabel: `${size('guardian')} problems`,
    topics: ['Python syntax', 'arrays', 'strings'],
    tag: 'Just getting started.',
  },
  {
    key: 'archon',
    level: 2,
    name: 'Archon',
    mark: 'chevrons',
    problems: size('archon'),
    countLabel: `${size('archon')} problems`,
    topics: ['two pointers', 'stack', 'linked list'],
  },
  {
    key: 'legend',
    level: 3,
    name: 'Legend',
    mark: 'star',
    problems: size('legend'),
    countLabel: `${size('legend')} problems`,
    topics: ['binary search', 'sliding window'],
  },
  {
    key: 'ancient',
    level: 4,
    name: 'Ancient',
    mark: 'gem',
    problems: size('ancient'),
    countLabel: `${size('ancient')} problems`,
    topics: ['trees', 'tries', 'heap', 'backtracking', 'graphs', 'dynamic programming'],
  },
  {
    key: 'divine',
    level: 5,
    name: 'Divine',
    mark: 'crown',
    problems: size('divine'),
    countLabel: `${size('divine')} Hards + an assessment`,
    topics: [],
    note: `The top rank. ${size('divine')} LeetCode Hards, plus proof you passed a real company assessment.`,
    tag: 'Earned, never given.',
    earnedOnly: true,
  },
];

/** The whole climb, for headlines. */
export const ladder = {
  total: RANK_KEYS.reduce((n, k) => n + size(k), 0),
  perWeek: 10,
};

export const rankSection = {
  eyebrow: 'find your rank',
  title: 'Find your rank.',
  intro:
    'Link your LeetCode, take the 90-minute placement, and get your starting rank. Then level up by solving every problem in your rank’s set.',
  introStrong: 'Everyone starts somewhere.',
  steps: [
    {
      icon: 'timer' as const,
      title: 'Take the placement',
      body: '4 problems on LeetCode, 90 minutes, checked automatically.',
    },
    { icon: 'badge' as const, title: 'Get your rank', body: 'Your result sets your starting rank.' },
    {
      icon: 'up' as const,
      title: 'Level up',
      body: 'Solve every problem in your rank’s set to move to the next one.',
    },
  ],
  difficulties: [
    { label: 'easy', color: '#52D68A' },
    { label: 'medium', color: '#F6C453' },
    { label: 'hard', color: '#FF5C77' },
  ],
  placementNote: 'Places you from Guardian up to Ancient. Divine is earned only.',
  climb: {
    stats: [
      { value: String(ladder.total), label: 'problems in total' },
      { value: '5', label: 'ranks' },
      { value: `~${ladder.perWeek}`, label: 'problems a week' },
    ],
    line: 'Tracked automatically from your LeetCode. Nothing to submit.',
  },
  tracks: [
    {
      key: 'beginner',
      name: 'Beginner Track',
      range: 'Guardian → Archon',
      body: 'Just finished intro programming? Start here. We teach the core ideas step by step.',
      cta: 'Sign up as a beginner',
      color: '#F2A866',
    },
    {
      key: 'competitive',
      name: 'Competitive Track',
      range: 'Legend → Divine',
      body: 'Already comfortable with data structures? Test into Legend or Ancient and go after the Hards.',
      cta: 'Sign up for the competitive track',
      color: '#F6C453',
    },
  ],
  /** An illustrative member: 34 of the 50 Archon problems, on top of all 50 Guardian ones. */
  example: {
    label: 'Example member',
    atLevel: 2,
    nextLevel: 3,
    solved: 34,
    target: size('archon'),
  },
  leaderboard: {
    title: 'Club leaderboard',
    column: 'Solved',
    /** `solved` is the running total across all ranks. */
    rows: [
      { handle: 'off_by_one', rank: 'Ancient', solved: 173, you: false },
      { handle: 'greedy_goose', rank: 'Legend', solved: 131, you: false },
      { handle: 'you', rank: 'Archon', solved: 84, you: true },
    ],
    caption:
      'Every problem you solve counts toward your total. We read it from your LeetCode automatically.',
  },
  reassurance: {
    before: 'Starting at ',
    rank: 'Guardian',
    after: ' is totally normal. That’s where most great programmers began.',
  },
};

/* --------------------------------------------------------------- events */

export type UpcomingEvent = { tag: string; title: string; meta: string; real: boolean };

export const events = {
  eyebrow: 'upcoming events',
  title: 'Start in the study room.',
  note: 'New events will be announced here.',
  featured: {
    every: 'Coming',
    day: 'Soon',
    /** Small pill under the day. Leave empty to hide it (e.g. while the schedule is unset). */
    time: '',
    pill: 'Weekly',
    title: 'Study room',
    body: 'Drop in, solve problems side by side, and compete with whoever’s in the room.',
    /** Facts about the event. `highlight` gives a row the brighter treatment. */
    meta: [{ icon: 'trophy', text: 'Leaderboard tracks progress' }] as {
      icon: 'pin' | 'chat' | 'trophy' | 'pizza';
      text: string;
      highlight?: boolean;
    }[],
    quiz: { text: 'Placement + find your rank', hint: '4 problems · 90 min' },
    primaryCta: 'Sign up',
  },
  /** Extra events beside the study room. Empty hides the column; the study room goes full width. */
  upcoming: [] as UpcomingEvent[],
};

/* ------------------------------------------------------------------ faq */

export const faqSection = {
  eyebrow: 'faq',
  title: 'Quick answers.',
};

export const faq: [string, string][] = [
  [
    'Do I need to be good at coding?',
    'No. The beginner track starts from the basics and goes step by step. Never coded? Come anyway and we’ll help you get started.',
  ],
  [
    'How many problems is it, really?',
    `${ladder.total} in total: ${size('guardian')} to reach Archon, ${size('archon')} to reach Legend, ${size('legend')} to reach Ancient, ${size('ancient')} to reach Divine, then ${size('divine')} Hards and a real assessment to earn Divine. About ${ladder.perWeek} a week.`,
  ],
  [
    'Do I need a LeetCode account?',
    'Yes, and it’s free. You link it right after you sign up. That’s how we track your progress, so there’s nothing to submit by hand.',
  ],
  [
    'What if I do badly on the placement?',
    'That’s fine. Your rank just tells us where to start you. You get one attempt every 30 days, and you can level up anytime.',
  ],
  [
    'How do I level up?',
    'Solve every problem in your rank’s set on LeetCode. We read your accepted solutions automatically and move you up when the set is done.',
  ],
  [
    'Do problems I already solved count?',
    'Only solves after you link your account. Re-solving old ones is good practice anyway: redo what you needed help on after a day, three days and a week.',
  ],
  [
    'Do I have to be a CS major?',
    'No. Math, physics, data science, and every other major are welcome. If you like puzzles, you’ll fit right in.',
  ],
  [
    'What language do we use?',
    'Guardian starts with Python. After that, use whatever you’re fastest in. C++ and Python are the most common.',
  ],
  ['How much time does it take?', 'About ten problems a week. There’s no attendance requirement.'],
  ['Does it cost anything?', 'No. It’s free.'],
];

/* ----------------------------------------------------------- leadership */

export const leadership = {
  eyebrow: 'leadership',
  title: 'Who’s behind it.',
  people: [
    { initial: 'A', name: 'Anand', role: 'President', line: 'CS · Class of 2027' },
    { initial: 'J', name: 'Justin', role: 'Director of Outreach', line: 'CS · Class of 2027' },
  ],
};

/* ----------------------------------------------------------------- join */

export const join = {
  eyebrow: 'sign up',
  title: 'Create your account',
  sub: 'A few quick questions, then link your LeetCode account.',
  subNowrap: 'No experience needed.',
  fields: {
    name: { label: 'Name', placeholder: 'First and last name' },
    email: { label: 'Email', placeholder: 'you@lynchburg.edu' },
    year: {
      label: 'Class year',
      empty: 'Choose one',
      options: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Other'],
    },
    major: { label: 'Major', placeholder: 'e.g. CS, Math, Physics' },
    experience: {
      label: 'Experience level',
      empty: 'Pick the closest',
      options: [
        'Never coded',
        'Took intro class',
        'Comfortable with data structures',
        'Competed before',
      ],
    },
  },
  submit: 'Create account',
  submitting: 'Creating your account…',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
  fineprint:
    'No commitment. If you link LeetCode, we store only your username and which problems you’ve solved, and you can delete them any time.',
  success: {
    title: 'Account created.',
    sub: 'Two more steps and you’re on the ladder.',
    steps: [
      'Link your LeetCode account',
      'Take the placement and get your rank',
      'Solve your rank’s problems and level up',
    ],
    roadmap: 'Continue setup',
    back: 'Edit my answers',
  },
  /** That email was already signed up. We never say whether it is linked yet. */
  existing: {
    title: 'You’re already signed up.',
    sub: 'Pick up where you left off: link your LeetCode account, or sign in if you already did.',
  },
  errors: {
    generic: 'Something went wrong on our side. Please try again in a moment.',
    duplicate: 'You are already on the list — no need to sign up twice.',
    offline: 'Could not reach the server. Check your connection and try again.',
  },
};

/** Sign in / sign up chrome: the header buttons, the sign-in page, the step indicator. */
export const auth = {
  nav: { signIn: 'Sign in', signUp: 'Sign up', account: 'My progress' },
  signIn: {
    title: 'Sign in',
    sub: 'Verify your LeetCode account to continue. There’s no password to remember.',
    newHere: 'New here?',
    createAccount: 'Create an account',
    back: '← Back to the club site',
  },
  /** The three steps of setting up an account. */
  steps: ['Account', 'LeetCode', 'Placement'],
};

export const footer = {
  line: `A student organization at ${club.school}.`,
  links: [
    { href: '#join', label: 'Sign up' },
    { href: '/signin', label: 'Sign in' },
    { href: '/me', label: 'My progress' },
    { href: '#faq', label: 'FAQ' },
    { href: '#top', label: 'Back to top' },
  ],
  wordmark: ['Competitive', 'Programming'],
};

/* ------------------------------------------------- roadmap popup + profile */

const RANK_NAMES: Record<RankKey, string> = {
  guardian: 'Guardian',
  archon: 'Archon',
  legend: 'Legend',
  ancient: 'Ancient',
  divine: 'Divine',
};
export const rankName = (k: RankKey) => RANK_NAMES[k];

/** Error codes returned by the API routes, in plain words. */
export const apiErrors: Record<string, string> = {
  bad_username: 'That doesn’t look like a LeetCode username. Use letters, numbers, _ and - only.',
  slow_down: 'Too many tries for that username. Wait a few minutes and try again.',
  code_not_found:
    'We couldn’t find the code in your About me yet. Save your profile on LeetCode, then press Verify again.',
  user_not_found: 'We couldn’t find that LeetCode account. Check the spelling of your username.',
  no_account:
    'We couldn’t find an account for that LeetCode username. Create one first, it only takes a minute.',
  expired: 'That code has expired. Start again to get a new one.',
  too_many_attempts: 'Too many tries with that code. Start again to get a new one.',
  already_used: 'That code was already used. Start again to get a new one.',
  leetcode_unavailable: 'LeetCode isn’t answering right now. Give it a few minutes and try again.',
  unavailable:
    'LeetCode isn’t reachable right now, so we can’t run a timed placement. Try again in a few minutes.',
  reverify: 'Verify your LeetCode account again first, so we know it’s really you.',
  cooldown: 'You can take the placement once every 30 days.',
  too_soon: 'You just synced. Give it a minute before checking again.',
  signed_out: 'Your session ended. Verify your LeetCode account again to continue.',
  offline: 'Couldn’t reach the server. Check your connection and try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
  // study rooms
  locked: 'You haven’t reached this rank yet.',
  muted: 'An officer has muted you from chat for a while.',
  empty: 'Write something first.',
  too_long: 'That’s too long for one message. Keep it under 1,200 characters.',
  looks_like_code:
    'That looks like a full solution — describe your approach in words instead. Short one-line snippets are fine.',
  chat_too_fast: 'You’re posting a little fast. Wait a few seconds and try again.',
  bad_problem: 'That problem isn’t in this room’s set.',
  message_gone: 'That message is already gone.',
  not_found: 'That wasn’t found.',
};

export const roadmap = {
  eyebrow: 'your roadmap',
  title: 'Your path to Divine.',
  sub: `${ladder.total} problems across five ranks. Solve them on LeetCode and we track every one automatically.`,
  totalLabel: 'problems',
  ladderTitle: 'The ladder',
  rulesTitle: 'How we train',
  rules: [
    `About ${ladder.perWeek} problems a week. An unbroken streak of weeks is what counts.`,
    'Stuck? Struggle for 30 minutes, then read the solution, then redo it cold after 1, 3 and 7 days.',
    'Finish every problem in a rank to move up. No cherry-picking.',
    'Only solves after you link your account count, so redo anything you’ve solved before.',
  ],
  beginnerNote: 'New to coding? You start at Guardian. Link your account whenever you’re ready.',
  cta: 'Link my LeetCode account',
  later: 'Maybe later',
  close: 'Close',
  previewNote: 'This is a preview of the site, so linking is switched off here.',
  link: {
    title: 'Link your LeetCode account',
    sub: 'It’s free at leetcode.com. We only read what’s public on your profile: your username and your accepted solves.',
    username: { label: 'LeetCode username', placeholder: 'your_username' },
    getCode: 'Get my code',
    gettingCode: 'One moment…',
    codeLabel: 'Your code',
    steps: [
      'Open leetcode.com, then Profile, then Edit profile.',
      'Paste the code anywhere in “About me” and save.',
      'Come back here and press Verify.',
    ],
    expiry: 'This code works for 15 minutes.',
    verify: 'Verify',
    verifying: 'Checking your profile…',
    restart: 'Use a different username',
    done: { title: 'You’re linked.', sub: 'You can remove the code from your About me now.' },
    privacy:
      'We store your LeetCode username and which of our problems you’ve solved. You can delete both any time from your profile page.',
    returning: 'Already have an account?',
    returningLink: 'Sign in',
  },
  placement: {
    title: 'Find your rank',
    sub: 'Four problems on LeetCode, one per tier. You get 90 minutes from the moment you press Start, and we check your submissions automatically.',
    facts: [
      'One attempt every 30 days',
      'Your result sets your starting rank',
      'Tiers count from the easiest up',
    ],
    tiers: [
      'Tier 1 · Guardian topics',
      'Tier 2 · Archon topics',
      'Tier 3 · Legend topics',
      'Tier 4 · Ancient topics',
    ],
    start: 'Start the placement',
    starting: 'Starting…',
    skip: 'Skip, start at Guardian',
    beginner: {
      title: 'You start at Guardian',
      sub: 'That’s exactly where most great programmers began. Your first problems are waiting.',
    },
    timeLeft: 'Time left',
    open: 'Open on LeetCode',
    solved: 'Solved',
    waiting: 'Not solved yet',
    check: 'Check now',
    checking: 'Checking…',
    finish: 'I’m done',
    finishing: 'Wrapping up…',
    autoNote: 'We check LeetCode for you about once a minute. Solve them in any order.',
    lookedAway: 'LeetCode didn’t answer on the last check. We’ll keep trying.',
    result: {
      title: 'You start at',
      flagged: 'An officer may ask you for a short live check on this one.',
      next: 'See my progress',
    },
  },
};

export const memberPage = {
  title: 'My progress',
  rank: 'Rank',
  next: 'Next',
  inRank: (solved: number, total: number, next: string | null) =>
    next ? `${solved} of ${total} solved to reach ${next}` : `${solved} of ${total} solved`,
  total: (solved: number, total: number) => `${solved} of ${total} solved overall`,
  linkedAs: 'LeetCode account',
  lastSynced: 'Last synced',
  never: 'not yet',
  sync: 'Sync now',
  syncing: 'Syncing…',
  syncNote: 'We also check automatically. Only solves after you linked count.',
  gap: 'You solved a lot since we last looked, so some solves may be missing. Re-submit your most recent ones and press Sync.',
  notFound:
    'We can’t find your LeetCode account any more. If you renamed it, sign in again with the new name.',
  placement: 'Placement',
  takePlacement: 'Take the placement',
  signOut: 'Sign out',
  delete: 'Delete my data',
  deleteConfirm: 'Delete your LeetCode link, solve history and placement? This can’t be undone.',
  deleted: 'Your data has been deleted.',
  problemsTitle: (rank: string) => `${rank} problems`,
  solvedWord: 'Solved',
  notSolvedWord: 'Not solved yet',
  filterLabel: 'Filter problems',
  filters: { all: 'All', todo: 'To do', done: 'Solved' },
  nothingSolved: 'Nothing solved here yet. Solve one on LeetCode, then press Sync now.',
  allSolved: 'Every problem here is solved.',
  newSolves: (n: number) => `${n} new ${n === 1 ? 'problem' : 'problems'} solved`,
  upToDate: 'You’re up to date. Nothing new since the last sync.',
  showMore: (n: number, rank: string) => `+ ${n} more in ${rank}`,
  showLess: 'Show less',
  divineNote:
    'Divine also needs proof that you passed a real company assessment. An officer approves it, so message us when you have it.',
  divineReady: 'All 30 Hards are done. Send an officer your assessment proof to earn Divine.',
  rankedUp: (name: string) => `You ranked up to ${name}!`,
  open: 'Open',
};

/* -------------------------------------------------------------- study rooms
 * One chat room per rank. You unlock a room by reaching it, the same gate as
 * its problem set — so nothing in a room is ever a spoiler for someone who
 * has not climbed there yet, and everyone in it has earned the right to be. */
export const roomsPage = {
  eyebrow: 'no solutions, just method',
  title: 'Study rooms.',
  sub: 'One room per rank. Talk through how you think about a problem — the idea, the trick, where you got stuck. Not the answer.',
  roomLabel: (rank: string) => `${rank} room`,
  locked: 'Locked',
  lockedNote: (rank: string) => `Reach ${rank} to unlock this room.`,
  unlockedAt: (rank: string) => `Unlocked at ${rank}`,
  empty: 'No messages yet. Be the first to say something.',
  messages: (n: number) => `${n} ${n === 1 ? 'message' : 'messages'}`,
  open: 'Open room',
  back: 'Study rooms',
};

export const room = {
  rules: {
    title: 'Talk method, not answers.',
    body: 'Describe your approach in your own words — the idea, the trick, the complexity, where you got stuck. No pasted solutions or code dumps; short one-line snippets are fine. Officers remove anything that breaks this.',
    dismiss: 'Got it',
  },
  composerPlaceholder: (rank: string) => `Say something in the ${rank} room…`,
  send: 'Send',
  sending: 'Sending…',
  removed: 'Message removed',
  removedByAdmin: 'Removed by an officer',
  deleteOwn: 'Delete',
  deleteConfirm: 'Delete this message? This can’t be undone.',
  loadOlder: 'Load earlier messages',
  loading: 'Loading…',
  jumpToLatest: 'Jump to latest',
  newMessages: (n: number) => `${n} new ${n === 1 ? 'message' : 'messages'}`,
  you: 'You',
  offlineNote: 'Messages stop updating while you’re offline.',
  charsLeft: (n: number) => `${n} left`,
  attachProblem: 'Tag a problem',
  attachProblemSearch: 'Search this room’s problems…',
  attachProblemNone: 'No problem matches that search.',
  removeAttachedProblem: 'Remove',
  shareProgress: 'Share my progress',
  sharingProgress: 'Sharing…',
  announcement: 'Announcement',
  pinnedFromClub: 'From the club',
};
