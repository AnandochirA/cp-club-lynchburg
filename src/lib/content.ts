/**
 * Every piece of copy and data on the site lives here.
 * Edit this file to change the site — you should not need to touch the components.
 * Anything in [square brackets] is a placeholder waiting on a real value.
 */

export const club = {
  name: 'Competitive Programming',
  full: 'Competitive Programming Club',
  school: 'University of Lynchburg',
  tagline: 'club @ lynchburg',
  /** Paste your real Discord invite here. '#discord' scrolls to the card on the page. */
  discordUrl: '#discord',
};

export const nav = [
  { href: '#why', label: 'Why join' },
  { href: '#week', label: 'Schedule' },
  { href: '#ranks', label: 'Ranks' },
  { href: '#icpc', label: 'ICPC' },
  { href: '#events', label: 'Events' },
  { href: '#faq', label: 'FAQ' },
];

export const hero = {
  pill: { tag: 'new club', text: 'Weekly study room · free pizza', href: '#events' },
  line1: 'Get interview-ready.',
  line2: 'Have fun doing it.',
  sub: 'Competitive Programming Club at University of Lynchburg. Solve puzzles, compete in contests, and build the problem-solving skills top tech companies hire for.',
  subStrong: 'No experience needed.',
  primaryCta: 'Join the Club',
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
  'Free pizza at events',
  'Any language to start',
  'Interview prep',
  'ICPC contests',
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
      body: 'Represent Lynchburg at ICPC, the world’s biggest college programming contest.',
    },
    {
      icon: 'doc' as const,
      title: 'Stand out on your resume',
      body: 'Contest ratings and results are concrete proof of skill. They say more than “proficient in Python.”',
    },
    {
      icon: 'users' as const,
      title: 'Find your people',
      body: 'A community that loves hard problems. Plus free food at events.',
    },
  ],
};

export const week = {
  eyebrow: 'a typical week',
  title: 'Come to one thing, or all four.',
  when: '[Day], [Time] · [Room]',
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
      body: 'A new problem drops in our Discord every day. Solve it, share your approach, keep your streak.',
      extra: 'streak' as const,
    },
  ],
};

/* ---------------------------------------------------------------- ranks */

export type Rank = {
  key: string;
  level: number;
  name: string;
  mark: 'shield' | 'chevrons' | 'star' | 'gem' | 'crown';
  topics: string[];
  tag?: string;
  note?: string;
  earnedOnly?: boolean;
};

export const ranks: Rank[] = [
  {
    key: 'guardian',
    level: 1,
    name: 'Guardian',
    mark: 'shield',
    topics: ['arrays', 'strings', 'loops'],
    tag: 'Just getting started.',
  },
  {
    key: 'archon',
    level: 2,
    name: 'Archon',
    mark: 'chevrons',
    topics: ['sorting', 'two pointers', 'hashmaps'],
  },
  {
    key: 'legend',
    level: 3,
    name: 'Legend',
    mark: 'star',
    topics: ['binary search', 'recursion', 'basic graphs'],
  },
  {
    key: 'ancient',
    level: 4,
    name: 'Ancient',
    mark: 'gem',
    topics: ['dynamic programming', 'trees', 'advanced graphs'],
  },
  {
    key: 'divine',
    level: 5,
    name: 'Divine',
    mark: 'crown',
    topics: [],
    note: 'The top rank. Earned by passing a tech company’s assessment.',
    tag: 'Earned, never given.',
    earnedOnly: true,
  },
];

export const rankSection = {
  eyebrow: 'find your rank',
  title: 'Find your rank.',
  intro:
    'Take a quick placement quiz in the study room, get your starting rank, and level up by solving problems.',
  introStrong: 'Everyone starts somewhere.',
  steps: [
    {
      icon: 'timer' as const,
      title: 'Take the placement quiz',
      body: '3 problems (easy, medium, hard), done live in the study room.',
    },
    { icon: 'badge' as const, title: 'Get your rank', body: 'Your result sets your starting rank.' },
    {
      icon: 'up' as const,
      title: 'Level up',
      body: 'Solve your rank’s problem set to move to the next one.',
    },
  ],
  difficulties: [
    { label: 'easy', color: '#52D68A' },
    { label: 'medium', color: '#F6C453' },
    { label: 'hard', color: '#FF5C77' },
  ],
  placementNote: 'Places you at level 1 to 4. Divine is earned only.',
  tracks: [
    {
      key: 'beginner',
      name: 'Beginner Track',
      range: 'Guardian → Archon',
      body: 'Just finished intro programming? Start here. We teach the core ideas step by step.',
      cta: 'Join as a beginner',
      color: '#F2A866',
    },
    {
      key: 'competitive',
      name: 'Competitive Track',
      range: 'Legend → Divine',
      body: 'Already comfortable with algorithms? Train for ICPC and climb the Codeforces leaderboard.',
      cta: 'Join the competitive track',
      color: '#F6C453',
    },
  ],
  example: { label: 'Example member', atLevel: 2, nextLevel: 3, solved: 7, target: 10 },
  leaderboard: {
    title: 'Club leaderboard',
    column: 'Solved',
    rows: [
      { handle: 'off_by_one', rank: 'Ancient', solved: 42, you: false },
      { handle: 'greedy_goose', rank: 'Legend', solved: 31, you: false },
      { handle: 'you', rank: 'Archon', solved: 7, you: true },
    ],
    caption:
      'Every problem you solve counts. The leaderboard tracks each member’s progress toward their next rank.',
  },
  reassurance: {
    before: 'Starting at ',
    rank: 'Guardian',
    after: ' is totally normal. That’s where most great programmers began.',
  },
};

/* ----------------------------------------------------------------- icpc */

export const icpc = {
  eyebrow: 'icpc',
  title: 'Go compete for real.',
  intro: {
    before:
      'ICPC is the oldest and largest programming contest in the world: three people, one computer, five hours. The Mid-Atlantic Regional is ',
    strong: 'Saturday, November 7',
    after: ', and we are putting Lynchburg teams in it for the first time.',
  },
  label: 'ICPC Mid-Atlantic Regional',
  labelShort: 'Mid-Atlantic Regional',
  date: 'Sat, Nov 7',
  meta: '2026 · [Host site]',
  stats: [
    { value: '3', label: 'students per team' },
    { value: '1', label: 'computer, shared' },
    { value: '5', label: 'hours, no break' },
    { value: '~8', label: 'problems to solve' },
  ],
  penalty:
    'Ranked by problems solved. Ties go to whoever got there first, plus 20 minutes for every wrong submission.',
  rosterTitle: 'Six seats. Three are open',
  rosterBody:
    'We are forming Lynchburg’s first ICPC teams. We register teams in October, so rosters lock before then.',
  teams: [
    { name: 'Lynchburg 1', seats: ['[Name]', '[Name]', null] },
    { name: 'Lynchburg 2', seats: ['[Name]', null, null] },
  ] as { name: string; seats: (string | null)[] }[],
  reassureLabel: 'Never done a five-hour contest?',
  reassureBody:
    'Nobody has, until their first one. Train with us in the study room and walk in with a team that knows how you think.',
  primaryCta: 'Claim a team spot',
  secondaryCta: 'Ask about ICPC',
};

/* --------------------------------------------------------------- events */

export const events = {
  eyebrow: 'upcoming events',
  title: 'Start in the study room.',
  note: 'New events land here and on Discord.',
  featured: {
    every: 'Every',
    day: '[Day]',
    time: '[Time]',
    pill: 'Weekly',
    title: 'Study room',
    body: 'Drop in, solve problems side by side, and compete with whoever’s in the room.',
    meta: [
      { icon: 'pin' as const, text: '[Room/Building]' },
      { icon: 'chat' as const, text: 'Also open on Discord' },
      { icon: 'trophy' as const, text: 'Leaderboard tracks progress' },
      { icon: 'pizza' as const, text: 'Free pizza', highlight: true },
    ],
    quiz: { text: 'Placement quiz + find your rank', hint: 'easy · medium · hard' },
    primaryCta: 'Join the Club',
    secondaryCta: 'Join the room',
  },
  upcoming: [
    {
      tag: 'Nov 7',
      title: 'ICPC Mid-Atlantic Regional',
      meta: 'Sat, Nov 7 · 5 hours · [Host site]',
      real: true,
    },
    { tag: 'Soon', title: '[Another event]', meta: '[Date] · [Time] · [Room]', real: false },
  ],
};

/* ------------------------------------------------------------------ faq */

export const faqSection = {
  eyebrow: 'faq',
  title: 'Quick answers.',
  footnoteBefore: 'Something else on your mind? ',
  footnoteLink: 'Ask us on Discord',
  footnoteAfter: '.',
};

export const faq: [string, string][] = [
  [
    'Do I need to be good at coding?',
    'No. The beginner track starts from the basics and goes step by step. Never coded? Come anyway and we’ll help you get started.',
  ],
  [
    'What if I do badly on the placement quiz?',
    'That’s fine. Your rank just tells us where to start you, and you can level up anytime.',
  ],
  [
    'How do I level up?',
    'Solve the required problems for your rank. We track progress and announce rank-ups in Discord.',
  ],
  [
    'Do I have to be a CS major?',
    'No. Math, physics, data science, and every other major are welcome. If you like puzzles, you’ll fit right in.',
  ],
  [
    'What language do we use?',
    'Mostly C++ and Python, but any language works to start. Use whatever you learned in class.',
  ],
  ['How much time does it take?', 'Come when you can. There’s no attendance requirement.'],
  ['Does it cost anything?', 'No. It’s free, and so is the food at events.'],
];

/* ----------------------------------------------------------- leadership */

export const leadership = {
  eyebrow: 'leadership',
  title: 'Who’s behind it.',
  people: [
    { initial: 'A', name: 'Anand', role: 'President', line: '[Major · Class year]' },
    { initial: 'J', name: 'Justin', role: 'Director of Outreach', line: '[Major · Class year]' },
  ],
};

/* ----------------------------------------------------------------- join */

export const join = {
  eyebrow: 'join',
  title: 'Join the club.',
  sub: 'Five quick questions and you’re in.',
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
  submit: 'Join the Club',
  submitting: 'Sending…',
  fineprint: 'No commitment. Just club updates, no spam.',
  divider: 'or',
  discord: { title: 'Join our Discord', sub: 'daily problem · event news' },
  success: {
    title: 'You’re in.',
    sub: 'Here’s what happens next.',
    steps: [
      'Watch your inbox for study room details',
      'Say hi in the Discord',
      'Come to the study room. Free pizza.',
    ],
    back: 'Edit my answers',
  },
  errors: {
    generic: 'Something went wrong on our side. Try again, or message us on Discord.',
    duplicate: 'You are already on the list — no need to sign up twice.',
    offline: 'Could not reach the server. Check your connection and try again.',
  },
};

export const footer = {
  line: `A student organization at ${club.school}.`,
  links: [
    { href: '#join', label: 'Join' },
    { href: '#discord', label: 'Discord' },
    { href: '#faq', label: 'FAQ' },
    { href: '#top', label: 'Back to top' },
  ],
  wordmark: ['Competitive', 'Programming'],
};
