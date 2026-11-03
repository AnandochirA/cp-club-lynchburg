/**
 * Everything the interview coach says and checks, in one place. The coach is
 * scripted, not an AI: it speaks a prompt when a stage opens, asks one
 * follow-up partway through, and nudges you when you go quiet. Edge cases and
 * follow-ups are picked from the problem's `topic` (see curriculum.ts).
 */

export type StageId = 'read' | 'clarify' | 'edges' | 'approach' | 'pseudo' | 'code' | 'test';

export type Stage = {
  id: StageId;
  title: string;
  /** Time budget. They add up to 45, a typical coding round. */
  minutes: number;
  /** What to do, one line, shown under the title. */
  goal: string;
  /** Spoken when the stage opens. */
  prompt: string;
  /** Asked once, a little past halfway through the budget. Topic follow-ups are mixed in for some stages. */
  followUps: string[];
  /** Self-check items. For `edges` this comes from the topic instead. */
  checklist: string[];
  notesPlaceholder: string;
};

export const STAGES: Stage[] = [
  {
    id: 'read',
    title: 'Read & restate',
    minutes: 3,
    goal: 'Read the problem (it’s in the Problem panel), then say it back in your own words.',
    prompt:
      "Let's start. Read the problem carefully. Then tell me, in your own words, what we're solving: what goes in, what comes out, and what the constraints are.",
    followUps: [
      'Look at the constraints. How big can the input get, and what does that tell you about the time complexity we need?',
    ],
    checklist: [
      'Restated the problem in my own words',
      'Named the input and output types',
      'Read every constraint (sizes, value ranges)',
      'Worked example 1 by hand',
      'Turned the input size into a target complexity (n ≤ 10⁵ → O(n log n) or better)',
    ],
    notesPlaceholder: 'Input: …\nOutput: …\nConstraints: …\nTarget complexity: …',
  },
  {
    id: 'clarify',
    title: 'Clarify',
    minutes: 4,
    goal: 'Ask your questions out loud, then answer each one from the statement and constraints.',
    prompt:
      "Before you solve anything, what would you ask me? Interviewers leave things out on purpose. Ask your questions out loud, then find each answer in the statement or the constraints.",
    followUps: ["Is there anything about the input you're assuming but haven't confirmed?"],
    checklist: [
      'Can the input be empty?',
      'How large can it get?',
      'Negatives, zeros, duplicates?',
      'Is it sorted, or can I sort it?',
      'Can I modify the input in place?',
      'What if there is no answer, or more than one?',
      'Exact output format (indices or values? any order?)',
    ],
    notesPlaceholder: 'Q: Can it be empty?  →  A: no, n ≥ 1\nQ: …  →  A: …',
  },
  {
    id: 'edges',
    title: 'Edge cases',
    minutes: 4,
    goal: 'List the cases you will test against, and why each could break a solution.',
    prompt:
      "Now list the edge cases you'll test against. Say each one out loud, and why it could break a solution.",
    followUps: ['Which of these is most likely to break a first attempt?'],
    checklist: [],
    notesPlaceholder: '[] → …\n[5] → …\nall duplicates → …',
  },
  {
    id: 'approach',
    title: 'Approach',
    minutes: 5,
    goal: 'Brute force first, with its complexity. Then a better idea, and the target complexity.',
    prompt:
      "Walk me through how you'd solve it. Start with the brute force and its complexity, then tell me how to do better.",
    followUps: ["What's the bottleneck in the brute force?", 'Why that data structure and not another one?'],
    checklist: [
      'Stated a brute force and its time and space',
      'Named the bottleneck',
      'Found a better idea, and said why it works',
      'Stated the target time and space before coding',
      'Asked “does that sound good before I code it?”',
    ],
    notesPlaceholder: 'Brute force: … O(…)\nBottleneck: …\nBetter: … O(…) time, O(…) space',
  },
  {
    id: 'pseudo',
    title: 'Pseudocode',
    minutes: 5,
    goal: 'Sketch the main steps before any real code.',
    prompt: 'Before writing real code, sketch it in pseudocode. Keep it to the main steps.',
    followUps: ['Walk me through your pseudocode on the first example.'],
    checklist: [
      'Main loop or recursion written',
      'Data structures named',
      'Base cases and termination handled',
      'Traced example 1 through it',
    ],
    notesPlaceholder: 'for each …\n  if …\n    …\nreturn …',
  },
  {
    id: 'code',
    title: 'Code',
    minutes: 20,
    goal: 'Code it on LeetCode while you keep talking.',
    prompt: 'Go ahead and code it on LeetCode. Keep talking while you write, and tell me what each part does.',
    followUps: ["You're about halfway through the time. Where are you, and what's left?"],
    checklist: [
      'Clear names, no magic numbers',
      'Talked through each block while writing it',
      'Handled the edge cases from my list',
      'Ran the given examples',
    ],
    notesPlaceholder: 'Anything you want to remember while coding: bugs to check, ideas you set aside…',
  },
  {
    id: 'test',
    title: 'Test & optimize',
    minutes: 4,
    goal: 'Dry-run an edge case by hand, state the final complexity, then try to do better.',
    prompt:
      "Let's test it. Pick one of your edge cases and trace it through your code line by line. Then tell me the final time and space complexity.",
    followUps: ['Can you do better?'],
    checklist: [
      'Dry-ran an example by hand',
      'Dry-ran an edge case by hand',
      'Found and fixed bugs without just re-running',
      'Stated the final time complexity',
      'Stated the final space complexity (including the recursion stack)',
      'Answered “can you do better?”',
    ],
    notesPlaceholder: 'Final: O(…) time, O(…) space\nCould improve by …',
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);
export const stageById = (id: StageId) => STAGES.find((s) => s.id === id)!;
export const TOTAL_MINUTES = STAGES.reduce((n, s) => n + s.minutes, 0);

/** Said when you have been quiet too long. Code has its own, more pointed lines. */
export const NUDGES: Record<'default' | 'code', string[]> = {
  default: [
    "Keep thinking out loud. What's on your mind?",
    "You've gone quiet. Say what you're considering, even if it's not finished.",
    'Talk me through it. Where are you right now?',
  ],
  code: [
    'Keep talking. What are you writing right now?',
    "What's this part of the code doing?",
    "You've gone quiet. Are you stuck? Say what you're thinking.",
    'Talk me through your next step.',
  ],
};

export const CLOSING = "That's time. Let's review how it went.";

// ------------------------------------------------------------- by topic

type Family =
  | 'array'
  | 'hashing'
  | 'twoPointers'
  | 'window'
  | 'stack'
  | 'binarySearch'
  | 'linkedList'
  | 'tree'
  | 'trie'
  | 'heap'
  | 'intervals'
  | 'backtracking'
  | 'graph'
  | 'dp'
  | 'greedy'
  | 'bits'
  | 'design';

/** Which families a curriculum topic string belongs to ("Heap, intervals, scheduling" → heap + intervals). */
const MATCH: [RegExp, Family][] = [
  [/array/, 'array'],
  [/hash/, 'hashing'],
  [/two pointers/, 'twoPointers'],
  [/sliding window/, 'window'],
  [/stack/, 'stack'],
  [/binary search/, 'binarySearch'],
  [/linked list/, 'linkedList'],
  [/tree/, 'tree'],
  [/trie/, 'trie'],
  [/heap/, 'heap'],
  [/interval|scheduling/, 'intervals'],
  [/backtracking/, 'backtracking'],
  [/graph/, 'graph'],
  [/dynamic programming/, 'dp'],
  [/greedy/, 'greedy'],
  [/math|bit/, 'bits'],
  [/design/, 'design'],
];

export function topicFamilies(topic: string): Family[] {
  const t = topic.toLowerCase();
  return MATCH.filter(([re]) => re.test(t)).map(([, f]) => f);
}

const EDGE_CASES: Record<Family, string[]> = {
  array: [
    'Empty array, or a single element',
    'All elements equal',
    'Negative numbers and zero',
    'Already sorted, or reverse sorted',
    'Values near the int limits (overflow on a sum or product)',
  ],
  hashing: ['Duplicate keys', 'A key that is not present', 'Using the same element twice (i == j)'],
  twoPointers: ['Pointers meeting or crossing', 'Runs of duplicates to skip', 'Length 2'],
  window: ['Window larger than the input', 'k = 0 or k = 1', 'The whole input is the answer', 'No valid window at all'],
  stack: [
    'Unbalanced input (a close before any open)',
    'Stack not empty at the end',
    'Equal values: strictly vs non-strictly increasing',
  ],
  binarySearch: [
    'Target smaller than everything, or larger',
    'Target not present',
    'Duplicates of the target (first or last?)',
    'Length 1 or 2 (lo/hi off-by-one)',
    'Overflow in mid (use lo + (hi − lo) / 2)',
  ],
  linkedList: [
    'Empty list (null head)',
    'One node, and two nodes',
    'A change at the head (a dummy node helps)',
    'Even vs odd length',
    'A cycle',
  ],
  tree: ['Empty tree (null root)', 'A single node', 'A skewed tree (recursion depth = n)', 'Negative values', 'Duplicate values'],
  trie: ['Empty string', 'A word that is a prefix of another', 'The same word inserted twice'],
  heap: ['k = 1, or k = n', 'Ties in priority', 'Popping from an empty heap'],
  intervals: ['Touching intervals ([1,2] and [2,3])', 'One interval inside another', 'Unsorted input', 'A single interval'],
  backtracking: [
    'Empty input: one empty answer, or none?',
    'Duplicates producing repeated answers',
    'No valid answer at all',
    'Largest input: is the search tree small enough?',
  ],
  graph: [
    'Disconnected graph',
    'Cycles',
    'Self-loops or duplicate edges',
    'Target unreachable',
    'One node, no edges',
    'Cells on the grid border',
  ],
  dp: [
    'n = 0 and n = 1 (base cases)',
    'An impossible state (return −1 or infinity?)',
    'Large answers (overflow, or a modulo)',
    'Empty string vs empty pattern',
  ],
  greedy: ['A counterexample to the greedy choice', 'Ties', 'A single element'],
  bits: ['Zero', "Negative numbers (two's complement)", 'Int max and int min', 'Overflow when multiplying'],
  design: ['An operation on an empty structure', 'Capacity 1', 'Repeated keys and updates'],
};

const FOLLOW_UPS: Record<Family, string[]> = {
  array: ['Can you do it in O(1) extra space?', 'If the array were sorted, would your approach change?'],
  hashing: ["What's the worst case for your hash map?", 'Could you avoid the hash map if the input were sorted?'],
  twoPointers: ['Why is it safe to move that pointer and not the other one?'],
  window: ['What exactly does your window guarantee at every step?', 'When do you shrink the window, and why is that correct?'],
  stack: ['Why does a stack fit here? What does each item on it represent?', 'Is every element pushed and popped at most once?'],
  binarySearch: ['What are you searching on, and why is it monotonic?', 'How do you know your loop always ends?'],
  linkedList: ['Can you do it in one pass?', 'Can you do it without extra memory?'],
  tree: ['What happens to your recursion if the tree is a million nodes deep?', 'Would BFS or DFS fit better here, and why?'],
  trie: ['How much memory does your trie use? Could you shrink it?'],
  heap: ['Why a heap instead of sorting?', 'What if the data were a stream that never ends?'],
  intervals: ['What if intervals arrived one at a time?', 'Why sort by start and not by end, or the other way round?'],
  backtracking: ['Where do you prune?', 'How big is the search tree in the worst case?'],
  graph: ['BFS or DFS here, and why?', "What if the graph had a billion nodes and didn't fit in memory?", 'How would you detect a cycle?'],
  dp: ['What does one state mean, in one sentence?', 'Can you cut the memory down to a single row?', 'Top-down or bottom-up: what is the tradeoff?'],
  greedy: ['Why is the greedy choice always safe? Can you argue it?'],
  bits: ['Can you do it without division or extra memory?'],
  design: ['What is the time complexity of every operation?', 'How would you make it safe for many threads at once?'],
};

const GENERIC_EDGES = ['Smallest possible input', 'Largest possible input (does it still run in time?)'];
const GENERIC_FOLLOW_UPS = ['What if the input were a hundred times bigger?', "Where's the bottleneck in your solution now?"];

/** The checklist for the Edge cases stage. Topic cases first, then the two that always apply. */
export function edgeCasesFor(topic: string): string[] {
  const out = topicFamilies(topic).flatMap((f) => EDGE_CASES[f]);
  return [...new Set([...out.slice(0, 7), ...GENERIC_EDGES])];
}

/** Candidate follow-ups for a stage. Approach and test also draw on the topic. */
export function followUpsFor(stage: StageId, topic: string): string[] {
  const base = stageById(stage).followUps;
  if (stage !== 'approach' && stage !== 'test') return base;
  const fam = topicFamilies(topic).flatMap((f) => FOLLOW_UPS[f]);
  return stage === 'test' ? [...base, ...fam, ...GENERIC_FOLLOW_UPS] : [...base, ...fam];
}

/**
 * The checklist for a stage. Blind rounds get a generic edge-case list, since
 * a topic-specific one ("null root") would give the pattern away.
 */
export function checklistFor(stage: StageId, topic: string, blind = false): string[] {
  if (stage !== 'edges') return stageById(stage).checklist;
  return blind ? BLIND_EDGES : edgeCasesFor(topic);
}

const BLIND_EDGES = [
  'Empty input, or a single element',
  'All values equal, or many duplicates',
  'Negative numbers and zero',
  'Already sorted, or reverse sorted',
  'No valid answer at all',
  'Values big enough to overflow',
  'Largest possible input (does it still run in time?)',
];

// ---------------------------------------------------------- blind pattern call

/** Extra ways people name a pattern out loud ("DFS", "memoization") on top of the topic words. */
const SYNONYMS: [RegExp, Family[]][] = [
  [/\bdfs\b|\bbfs\b|depth.first|breadth.first/, ['graph', 'tree']],
  [/union.?find|disjoint set|topolog|dijkstra|shortest path|\bgrid\b|island|matrix/, ['graph']],
  [/memo|\bdp\b|tabulat|knapsack/, ['dp']],
  [/priority queue|top.?k|kth (largest|smallest)/, ['heap']],
  [/monotonic/, ['stack']],
  [/prefix sum|kadane|\bsort/, ['array']],
  [/recurs|permutation|subset|combination|n.?queens/, ['backtracking']],
  [/prefix tree/, ['trie']],
  [/sweep|merge interval|meeting room|overlap/, ['intervals']],
  [/\bxor\b|bitmask|modulo/, ['bits']],
  [/\blru\b|\bcache\b|iterator/, ['design']],
  [/two.?pointer|fast.?(and.?)?slow|tortoise/, ['twoPointers', 'linkedList']],
  [/sliding|window/, ['window']],
  [/hash|\bmap\b|\bset\b|dictionary|counter|frequenc/, ['hashing']],
  [/\bbst\b|binary tree|\btree\b/, ['tree']],
];

/** Did the pattern you named in a blind round match the problem's real topic? */
export function patternMatches(call: string, topic: string): boolean {
  const c = call.toLowerCase();
  if (!c.trim()) return false;
  const named = new Set([...topicFamilies(c), ...SYNONYMS.filter(([re]) => re.test(c)).flatMap(([, f]) => f)]);
  return topicFamilies(topic).some((f) => named.has(f));
}

/** Offered as you type the pattern. Plain names, no hints about this problem. */
export const PATTERN_SUGGESTIONS = [
  'Hash map',
  'Two pointers',
  'Sliding window',
  'Stack (monotonic)',
  'Binary search',
  'Linked list (fast & slow)',
  'Tree DFS / BFS',
  'Trie',
  'Heap / priority queue',
  'Intervals (sort + sweep)',
  'Backtracking',
  'Graph BFS / DFS',
  'Union-find',
  'Dynamic programming',
  'Greedy',
  'Bit manipulation',
  'Design',
];

// ------------------------------------------------------------------ curveballs

/** Thrown once during Test & optimize: the problem changes under you, the way real follow-ups do. */
const CURVEBALLS: Record<Family, string[]> = {
  array: [
    "Twist: the array no longer fits in memory. It's streamed to you one number at a time. What changes?",
    "Twist: no extra memory allowed at all. How do you adapt?",
  ],
  hashing: ["Twist: memory is capped at a few kilobytes, so the hash map is off the table. What now?"],
  twoPointers: ['Twist: the input is no longer sorted. Does two pointers still work? What would you do?'],
  window: ['Twist: the input is now an endless stream, and you must answer after every element. Adapt your window.'],
  stack: ['Twist: the input arrives as a stream, and you must report an answer after each element. What changes?'],
  binarySearch: ['Twist: the sorted array has been rotated at an unknown point. How does your search change?'],
  linkedList: ['Twist: the list might now contain a cycle. How do you make your solution safe?'],
  tree: ['Twist: the tree is a million levels deep, and your recursion will overflow the stack. Make it iterative.'],
  trie: ['Twist: the dictionary now has ten million words. How do you cut the memory?'],
  heap: ['Twist: the data is now an endless stream, and I can ask for the answer at any moment.'],
  intervals: ['Twist: intervals now arrive one at a time, and you answer after each one.'],
  backtracking: ['Twist: I only want the number of answers, not the answers. Can you beat listing them all?'],
  graph: [
    'Twist: the graph is too big for one machine. How would you split the work?',
    'Twist: every edge now has a weight. What changes in your approach?',
  ],
  dp: [
    'Twist: memory is tight. Can you get it down to one row, or a couple of variables?',
    'Twist: now I want the actual solution path, not just the number.',
  ],
  greedy: ['Twist: every item now has a weight as well. Does the greedy choice still hold?'],
  bits: ["Twist: inputs are now 64-bit, and you can't use a big-integer library."],
  design: ['Twist: many threads now call your structure at the same time. What breaks, and how do you fix it?'],
};

const GENERIC_CURVEBALLS = [
  'Twist: the input is now a hundred times bigger and must run in under a second. Does your solution survive?',
  'Twist: duplicates are now allowed. What breaks?',
  'Twist: return every valid answer, not just one.',
];

export function curveballsFor(topic: string): string[] {
  return [...topicFamilies(topic).flatMap((f) => CURVEBALLS[f]), ...GENERIC_CURVEBALLS];
}

/** The share of the Test budget at which the curveball comes. */
export const CURVEBALL_AT = 0.25;

// --------------------------------------------------------------- review

export type ScoreKey = 'communication' | 'problemSolving' | 'coding' | 'verification';

/** The four signals most coding rounds are graded on. 1 = no hire signal, 4 = strong hire. */
export const RUBRIC: { key: ScoreKey; title: string; low: string; high: string }[] = [
  {
    key: 'communication',
    title: 'Communication',
    low: 'Went quiet for long stretches; the interviewer had to guess what I was doing.',
    high: 'Talked the whole way through; asked good questions; explained every decision.',
  },
  {
    key: 'problemSolving',
    title: 'Problem solving',
    low: 'Jumped to code without a plan, or could not find a working idea.',
    high: 'Brute force first, found the bottleneck, reached the optimal idea and justified it.',
  },
  {
    key: 'coding',
    title: 'Coding',
    low: 'Buggy or messy; fought the language.',
    high: 'Clean, correct, readable code on the first real pass.',
  },
  {
    key: 'verification',
    title: 'Verification',
    low: 'Relied on Run to find bugs; no complexity stated.',
    high: 'Dry-ran edge cases by hand, caught bugs myself, stated time and space correctly.',
  },
];

export const SCORE_LABELS = ['', 'No hire', 'Lean no', 'Lean hire', 'Strong hire'];

/** Verdict stamps. `v` picks the site's judge colours (motion.css): ac green, tle amber, wa red. */
export const VERDICTS: Record<'strong' | 'lean_hire' | 'lean_no' | 'no_hire', { label: string; v: 'ac' | 'tle' | 'wa' }> = {
  strong: { label: 'Strong hire', v: 'ac' },
  lean_hire: { label: 'Lean hire', v: 'ac' },
  lean_no: { label: 'Lean no', v: 'tle' },
  no_hire: { label: 'No hire', v: 'wa' },
};

export const MISTAKES: Record<
  'wrong_pattern' | 'misread' | 'missed_edge' | 'off_by_one' | 'bug' | 'out_of_time' | 'no_optimize' | 'froze',
  string
> = {
  wrong_pattern: 'Wrong pattern',
  misread: 'Misread the problem',
  missed_edge: 'Missed an edge case',
  off_by_one: 'Off-by-one',
  bug: 'Bug in the code',
  out_of_time: 'Ran out of time',
  no_optimize: "Couldn't optimize",
  froze: 'Froze / went quiet',
};

export const lastTimeLine = (s: string) => `Before we start. Last time you told yourself: "${s}". Let's see it today.`;

// ------------------------------------------------------------------- UI copy

export const interviewCopy = {
  title: 'Mock interview',
  eyebrow: 'Interview mode',
  back: 'My progress',
  introLead:
    'A 45-minute coding round, one step at a time. The coach speaks each step and nudges you when you go quiet. You code on LeetCode, and you talk the whole way through.',
  introSteps: 'The steps',
  micNote:
    'Your speech is turned into text in your browser, so you can read back what you said. No audio is recorded or uploaded; only the text transcript is saved.',
  noStt:
    'This browser can’t transcribe speech (Chrome and Edge can). You can still do the whole round: talk out loud anyway, and type your notes.',
  noTts: 'This browser can’t read the coach’s lines aloud, so they appear as text.',
  start: 'Start the interview',
  resume: 'Resume where you left off',
  restart: 'Start over',
  starting: 'Starting…',
  openLeetCode: 'Open on LeetCode',
  next: 'Next step',
  skip: 'Skip',
  finish: 'Finish & review',
  finishing: 'Saving…',
  repeat: 'Say it again',
  interviewer: 'Interviewer',
  notes: 'Your notes',
  checklist: 'Checklist',
  transcript: 'Transcript',
  transcriptEmpty: 'Turn the mic on and start talking. What you say shows up here.',
  transcriptFull: 'The transcript is full, so new speech is no longer saved.',
  micOn: 'Mic on',
  micOff: 'Mic off',
  micDenied: 'The microphone is blocked. Allow it in the address bar, then turn the mic on again.',
  voiceOn: 'Coach voice on',
  voiceOff: 'Coach voice off',
  quietFor: (s: number) => `quiet for ${s}s`,
  talking: 'talking',
  over: 'over',
  saved: 'Saved',
  saving: 'Saving…',
  saveFailed: 'Couldn’t save. Your work is still here; we’ll try again.',
  review: {
    eyebrow: 'Review',
    title: 'How did it go?',
    lead: 'Score yourself honestly against what an interviewer would have seen. The talk stats and your transcript are the evidence.',
    talkRatio: 'Talking',
    longestSilence: 'Longest silence',
    nudges: 'Nudges',
    time: 'Time',
    noMic: 'Mic was off, so there are no talk stats for this round.',
    perStage: 'Per step',
    skipped: 'skipped',
    acYes: 'Accepted on LeetCode during this session.',
    acNo: 'No accepted submission seen since you started. Submit on LeetCode, then check again.',
    acCheck: 'Check again',
    acChecking: 'Checking…',
    save: 'Lock in verdict',
    savedScores: 'Verdict locked in.',
    pending: 'Verdict pending',
    pendingNote: 'Score yourself below to get your verdict.',
    signals: 'Signals from your transcript',
    signalsNote: 'Measured from what you said, not from your self-score.',
    broke: 'What broke?',
    brokeNote: 'Tag everything that cost you. These add up into your weak spots on the dashboard.',
    nextTime: 'Next time I will…',
    nextTimePlaceholder: 'dry-run one edge case before I hit submit',
    nextTimeNote: 'The coach reads this back at the start of your next round.',
    target: 'target',
    again: 'Do another',
    yourNotes: 'Your notes',
  },
  arena: {
    eyebrow: 'Interview mode',
    title: 'The Arena',
    readiness: 'Interview readiness',
    thisWeek: 'this week',
    blindKicker: 'Like the real thing',
    blindSub: 'A random problem, topic hidden, no skipping. A curveball is coming.',
    patternCalls: (hits: number, calls: number) => `Pattern calls ${hits}/${calls}`,
    noBlindYet: 'No blind rounds yet',
    redoKicker: 'Redo queue',
    dueToday: 'due',
    redoEmpty: 'Nothing to redo. Rounds you fail come back here twice: after 3 days, then 14 days later.',
    nextUp: (title: string, inT: string) => `Next up: ${title} in ${inT}.`,
    boxShort: (box: number) => ['3d', '14d'][box] ?? '',
    boxLabel: (box: number) => `On the ${['3-day', '14-day'][box]} interval`,
    overdue: 'overdue',
    mastered: (n: number) => `${n} mastered`,
    waiting: (n: number) => `${n} waiting`,
    behavKicker: 'The other round',
    behavTitle: 'Behavioral',
    coverage: (n: number, of: number) => `${n} of ${of} competencies have a story`,
    gap: (c: string) => `Gap: no story for ${c.toLowerCase()} yet.`,
    allCovered: 'Every competency has a story. Keep them sharp.',
    stories: (n: number) => `${n} ${n === 1 ? 'story' : 'stories'}`,
    behavRounds: (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`,
    empty:
      'Your readiness starts at zero. Draw a blind problem, or press “Mock” on any problem below, and run a full round out loud.',
    breaks: 'What breaks you',
    noMistakes: 'No mistakes tagged yet. Tag them in the review after each round.',
    scores: 'Your scores',
    weakest: 'weakest',
    streak: (n: number) => `${n} clean rounds in a row`,
    overrate: (title: string, by: number) => `You overrate your ${title.toLowerCase()} by ${by.toFixed(1)} against the evidence.`,
    underrate: (title: string, by: number) => `You underrate your ${title.toLowerCase()} by ${by.toFixed(1)}. You are better than you think.`,
    calibrated: 'Your self-scores match the evidence. Well calibrated.',
    recent: 'Recent rounds',
    unscored: 'unscored',
    lastRound: 'Last round',
  },
  redoRibbon: 'Redo',

  blind: {
    eyebrow: 'Blind draw',
    title: 'Draw blind',
    lead: 'A random problem you haven’t solved, at your rank or one above. The topic stays hidden, there is no skipping, and the clock never stops. Just like the real thing.',
    draw: 'Draw a problem',
    drawing: 'Shuffling…',
    hidden: 'Topic hidden',
    yourProblem: 'Your problem',
    startsIn: 'Clock starts in',
    announce: (title: string) => `Your problem is ${title}. The topic is hidden. Clock starts now.`,
    pattern: 'Name the pattern',
    patternNote: 'Say it out loud too. It’s revealed in the review.',
    patternPlaceholder: 'e.g. sliding window',
    youCalled: 'You called',
    itWas: 'It was',
    noCall: 'No call',
    rules: ['Topic hidden', 'No skipping', 'No going back', 'A curveball is coming'],
  },
  statement: {
    tab: 'Problem',
    source: 'Open on LeetCode',
    loading: 'Loading the problem…',
    paid: 'This is a LeetCode Premium problem, so its statement can only be read there. Open it on LeetCode.',
    missing: 'Couldn’t load this problem’s statement. Read it on LeetCode for now.',
  },
  film: {
    title: 'Game film',
    lead: 'The round as tape. Hover to hear what was said at any point; click, or pick a moment, to jump the transcript there.',
    you: 'You talking',
    coach: 'Interviewer talking',
    gap: 'Silence over 20s',
    moments: 'Key moments',
  },
  calib: {
    title: 'Calibration',
    leadSignals: 'Your self-score next to what your transcript signals say. Interviewers can only grade what they see and hear.',
    you: 'You',
    signals: 'Evidence',
    gap: 'Gap',
    locked: 'Lock in your verdict to see how your self-score compares.',
    noYardstick: 'Nothing to compare against this round: the mic was off, so there is no transcript to measure.',
    over: (title: string, by: string) => `You rate your ${title.toLowerCase()} ${by} higher than the evidence. That gap is what surprises people in real loops.`,
    under: (title: string, by: string) => `You are harder on your ${title.toLowerCase()} than the evidence, by ${by}. Give yourself some credit.`,
    even: 'Well calibrated: your self-score matches the evidence within half a point everywhere.',
  },
  curveball: 'Curveball',
  curveballNote: 'Answer out loud first, then jot down how you would adapt.',
  curveballPlaceholder: 'How I would change the approach…',
  yourAnswer: 'Your answer',
  mock: 'Mock',
  mockLabel: (title: string) => `Practice ${title} as a mock interview`,
  practice: 'Practice as interview',
  redoPractice: 'Redo as interview (due)',
  reviewSolution: {
    cta: 'Review your solution',
    done: 'Mark reviewed',
    saving: 'Saving…',
    note: 'You already solved this. Look over your accepted solution, then mark it reviewed.',
    label: (title: string) => `Review your solution to ${title} on LeetCode`,
    markLabel: (title: string) => `Mark ${title} as reviewed`,
  },
};
