/**
 * The Playbook: the ideas the whole behavioral side is built on, as short
 * reference cards. Our own wording of the methods in Mastering Behavioral
 * Interviews: The Guide to Storytelling in Tech by Austen McDonald (2025).
 * Every Story Doctor finding and answer check links to one of these.
 */

export type ConceptKey =
  | 'loop'
  | 'signals'
  | 'qtypes'
  | 'carl'
  | 'context'
  | 'stakes'
  | 'actions'
  | 'results'
  | 'learnings'
  | 'fairytale'
  | 'detail'
  | 'toc'
  | 'recut'
  | 'selection'
  | 'levels'
  | 'project'
  | 'tmay'
  | 'conflict'
  | 'weakness'
  | 'defensive'
  | 'values'
  | 'hypo'
  | 'values-drop'
  | 'builder'
  | 'tbl'
  | 'menu'
  | 'halo'
  | 'merchant'
  | 'styles'
  | 'asks'
  | 'sticky'
  | 'human'
  | 'practice'
  | 'debrief';

export type Card = {
  key: ConceptKey;
  group: 'Foundations' | 'Building stories' | 'The Big Three' | 'Other question types' | 'In the room' | 'Around the interview';
  title: string;
  /** One line, the takeaway. */
  gist: string;
  points: string[];
  /** A weak line and a strong one. */
  pair?: { bad: string; good: string };
};

export const CARDS: Card[] = [
  {
    key: 'loop',
    group: 'Foundations',
    title: 'Decode → Select → Deliver',
    gist: 'Every question is the same loop: work out what they are scoring, pick the best story, tell it well.',
    points: [
      'Interviewers are forecasters: past behavior is the best predictor of future behavior, so they want what you did, not what happened.',
      'You cannot predict the questions (except the Big Three). Prepare a catalog of stories that covers every signal area, then pick from it live.',
      'Preparation is what makes you sound like yourself under pressure. Unprepared answers ramble.',
      'Never invent a story. Reframe what you really did, or treat the question as a hypothetical.',
    ],
  },
  {
    key: 'signals',
    group: 'Foundations',
    title: 'The eight signal areas',
    gist: 'Scope, Ownership, Ambiguity, Perseverance, Conflict, Growth, Communication, Leadership.',
    points: [
      'Every question maps to one or more areas. That is the question behind the question.',
      '"A time you disagreed with your manager" is scoring judgment, communication and maturity, not the plot.',
      'Company values are signal areas in a company’s own words. Map each value to an area. (At Amazon, use their Leadership Principle words.)',
      'Interviewers also pattern-match you against the culture: in tech, the "Builder" who owns, ships and argues with data.',
    ],
  },
  {
    key: 'qtypes',
    group: 'Foundations',
    title: 'Three kinds of question',
    gist: '"Tell me about a time" gets a story. Values gets a framework plus a story. Hypotheticals get clarify, framework, scenarios, story.',
    points: [
      '"Tell me about a time…" is the most common and the most predictive. Answer with a real story.',
      '"What is your approach to…" (Values): name a short framework, then prove it with a story.',
      '"What would you do if…" (Hypothetical): 1–2 clarifying questions, a framework, 2–3 scenarios, a real example, a strong finish.',
    ],
  },
  {
    key: 'carl',
    group: 'Building stories',
    title: 'CARL beats STAR',
    gist: 'Context, Actions, Results, Learnings. Spend about 10% on context, 60% on actions, 30% on results and learnings.',
    points: [
      'Context merges STAR’s Situation and Task, which are hard to separate on real projects anyway.',
      'Learnings is the part STAR lacks: reflection is how interviewers judge seniority.',
      'Around 2 minutes per story (1–3). Over 3, you should know why.',
      'Give the requested signal early: make it obvious the story answers their question.',
    ],
  },
  {
    key: 'context',
    group: 'Building stories',
    title: 'Context: just enough',
    gist: 'Only the setup the actions need. If no action has come for a while, you are giving too much context.',
    points: [
      'Do not explain an org chart or a latency number unless your actions depend on it.',
      'Keep the extra detail (constraints, people, alternatives) in reserve for follow-ups.',
      'Skip explaining what the interviewer has lived through (tech debt, scope creep) and get to what was different about yours.',
    ],
    pair: {
      bad: 'I was working on a data pipeline project. We needed to migrate to a new cloud system. There were some challenges and timeline pressure.',
      good: 'Our pipeline was failing 2–3 times a week and our largest customer said: fix it before renewal in six months, or we leave.',
    },
  },
  {
    key: 'stakes',
    group: 'Building stories',
    title: 'Raise the stakes early',
    gist: 'A "man in a hole" story: the deeper the hole, the more impressive the climb.',
    points: [
      'Ask: how would Steve Jobs describe why this project mattered?',
      'Name what was at risk: money, users, a customer, a deadline, a grade, a launch.',
      'People want to hire people who worked on things that matter.',
    ],
  },
  {
    key: 'actions',
    group: 'Building stories',
    title: 'Actions: plural, yours, with reasons',
    gist: 'List as many relevant actions as you can. Say "I", and say why.',
    points: [
      'Themes to walk through: designing, aligning, communicating, implementing, iterating, testing, releasing, and thinking and deciding.',
      'Include the alternatives you weighed and why you chose one. Judgment is an action.',
      'Constantly saying "we" makes your part invisible. They are hiring you, not your team.',
      'For people stories, add the human details: when and where the hard conversation happened, and why then.',
    ],
    pair: { bad: 'I built the filter and shipped it on time. Customers liked it.', good: 'I talked to the product owner, sketched options with the designer, chose server-side filtering because… then I…' },
  },
  {
    key: 'results',
    group: 'Building stories',
    title: 'Results with evidence',
    gist: 'Numbers if you have them; estimates, orders of magnitude or quotes if you do not.',
    points: [
      '"Dozens → hundreds", "roughly 50% faster", "from weeks to days" all show data-minded thinking.',
      'Quotes count: "my manager called it the smoothest launch they had seen".',
      'Downstream effects count: what your work unlocked for others.',
      'Conflict stories: include the relationship afterwards. Mentoring stories: include how the person grew.',
    ],
    pair: { bad: 'The project went well and everyone was happy.', good: 'Manual tickets dropped from hundreds a week to dozens, so support could focus on hard cases.' },
  },
  {
    key: 'learnings',
    group: 'Building stories',
    title: 'Learnings that changed you',
    gist: 'Specific insight, then proof you applied it later.',
    points: [
      'Technical, process, people or strategic: what do you now do differently?',
      'Abstract lessons are weak; proven changes are strong. Name the next time you used it.',
      'Mistakes should show a skill you grew, not a character flaw.',
    ],
  },
  {
    key: 'fairytale',
    group: 'Building stories',
    title: 'No fairy-tale endings',
    gist: 'Real projects have tradeoffs. A perfect ending sounds made up or unaware.',
    points: ['Say what did not go to plan (in Results) and what you would change (in Learnings).'],
  },
  {
    key: 'detail',
    group: 'Building stories',
    title: 'The right amount of detail',
    gist: 'Use detail to make the story understandable and to prove you did the work. Past that, it costs you time.',
    points: [
      'The 30-second rule: if you have not moved to the next action in about 30 seconds, you are over-explaining.',
      'Go deep once per answer, then keep moving. Offer "I can say more about that" and continue.',
      'Explain jargon in one breath ("LaunchDarkly, a feature-flag service, which let us…"). Internal names are the worst offenders.',
    ],
    pair: {
      bad: 'I improved performance by optimizing the queries. It got a lot faster.',
      good: 'Every product row triggered its own reviews query. I replaced it with one join, and p95 went from 3.2s to 400ms.',
    },
  },
  {
    key: 'toc',
    group: 'Building stories',
    title: 'Table of contents for long stories',
    gist: 'Announce 2–4 themes right after the context, each with what it proves about you, then signpost through them.',
    points: [
      'Shape: Context → Table of contents → a mini-CARL per theme → Results → Learnings.',
      'Pause after the table of contents so they can steer.',
      'If you expect interruptions, put the results up front.',
      'Organize by phase (chronological) or by what you want them to conclude (thematic). Thematic protects your best signal from getting cut off.',
    ],
    pair: { bad: 'There were phases: initiation, design, implementation and rollout…', good: 'Three parts are worth hearing: how I won over a skeptical senior engineer with data, a custom queue I had to build, and a rollout that kept every customer up.' },
  },
  {
    key: 'recut',
    group: 'Building stories',
    title: 'Re-cut one story for many questions',
    gist: 'Like trailers for the same movie: the same story, different scenes up front.',
    points: [
      'A migration story can answer influence (the 12 teams you brought along), technical tradeoffs (the adapter you chose), or failure (the naive estimate).',
      'Make it clear early how this cut answers their question.',
    ],
  },
  {
    key: 'selection',
    group: 'Building stories',
    title: 'Choosing a story',
    gist: 'Scope, then Relevance, then Uniqueness, then Recency.',
    points: [
      'Scope: the biggest project gives the most signal. Interviewers judge your high-water mark.',
      'Relevance: it must show the signal they asked for. A strong match beats a weak one.',
      'Uniqueness: as the interview goes on, prefer stories they have not heard and areas you have not covered.',
      'Recency: recent stories show who you are now. Be careful past 3–5 years; juniors should stay recent.',
      'Students: internships, then long school projects, then personal projects, then clubs and contests. Some story beats no story.',
    ],
  },
  {
    key: 'levels',
    group: 'Building stories',
    title: 'Stories at the right level',
    gist: 'Telling junior-sized stories for a senior role says you do not understand the role.',
    points: [
      'L3 works in tasks of days, L4 in features of 1–2 weeks, L5 in projects of 1–3 months, L6 and managers in goals of about 6 months or more.',
      'Conflicts scale too: L3 raises them, L4 solves on-team ones, L5 solves them with partners, L6 between teams.',
      'Make the scale obvious: time, people, teams, consequences.',
    ],
  },
  {
    key: 'tmay',
    group: 'The Big Three',
    title: 'Tell me about yourself',
    gist: 'About two minutes: who you are, 2–3 accomplishments, where you want to go.',
    points: [
      'Summary: role, years, the focus that sets you apart, tailored to this job.',
      'Accomplishments: one line each, a touch of technical detail plus impact. Tease your favorite project.',
      'A quick list of other work creates breadth (the halo effect).',
      'End with a forward-looking line that hands the conversation back.',
      'Mention gaps, layoffs or short stints here, briefly, before they wonder.',
      'Avoid: the childhood origin story, a job-by-job history, a bare one-liner, negativity about an employer.',
    ],
    pair: { bad: 'I have been into computers since I was six…', good: 'I am a CS senior focused on backend. At my internship I cut a report query from 40s to 2s; I also…' },
  },
  {
    key: 'project',
    group: 'The Big Three',
    title: 'Favorite / most impactful project',
    gist: 'Same answer however it is phrased: the story where impact, scope and your contribution overlap most.',
    points: [
      'They do not care about your favorite like a favorite movie. They want your most complete work.',
      'If you must trade off, personal contribution wins: a smaller project you led beats a big one you watched.',
      'Use a table of contents and prepare the follow-ups. This answer alone often predicts the outcome.',
    ],
  },
  {
    key: 'conflict',
    group: 'The Big Three',
    title: 'A conflict you resolved',
    gist: 'High stakes, you were central, and you were (at least partly) right.',
    points: [
      '"I don\'t have conflicts" is a red flag. Most conflicts are ordinary: tool choice, scope vs time, a resistant partner team, adopting new tech.',
      'Beats that land: raise it directly, understand first, pick the right channel (not PR comments), bring data or a prototype, involve others at the right time, timebox it, reach a clear resolution, keep the relationship.',
      'Three acts: setup (about 10%), confrontation and turning points (60%), resolution and learnings (30%).',
      'Be generous to the other person, but keep the emotion. A conflict story with no tension does not answer the question.',
      'Avoid misconduct stories and stories where you were obviously wrong.',
    ],
    pair: {
      bad: 'Our PM was completely unrealistic and treated us like code monkeys.',
      good: 'Our PM was under real pressure for a client demo and cared deeply about the experience; we were not aligned on what it would cost.',
    },
  },
  {
    key: 'weakness',
    group: 'Other question types',
    title: 'Weaknesses, mistakes, regrets',
    gist: 'Real but survivable, reasonable at the time, with evidence you changed.',
    points: [
      'No disguised strengths ("perfectionist", "I work too hard"). They read as evasive.',
      'Nothing that kills the job ("I miss deadlines").',
      'Best: a call that was not obviously wrong in advance, then the lesson, then the next time you did better.',
      'Do not volunteer vulnerability when the question does not ask for it.',
    ],
  },
  {
    key: 'defensive',
    group: 'In the room',
    title: 'Thinking defensively',
    gist: 'Interviewers fill gaps with assumptions, and the assumptions rarely favor you.',
    points: [
      '"My manager assigned me the ticket" reads as passive. "No test coverage" reads as noticed but not fixed. "Several alignment meetings" reads as not driving.',
      'Fixes: leave the weak part out (never lie), explain why, acknowledge it with what you learned, or address the concern inside the follow-up.',
      'Be suspicious of follow-ups: ask yourself which doubt made them ask.',
    ],
  },
  {
    key: 'values',
    group: 'Other question types',
    title: 'Values questions: framework + story',
    gist: 'Ask yourself what varies (people, time, risk), name 2–3 approaches, say when to use each, then give an example.',
    points: [
      'Communication: split by frequency or formality. Prioritization: impact vs effort. Conflict: by stakes. Quality: speed, quality, scope. Learning: observe, do, teach.',
      'Present the framework confidently, and do not say you just made it up.',
      'Always back it with a story where you used it.',
    ],
  },
  {
    key: 'hypo',
    group: 'Other question types',
    title: 'Hypotheticals',
    gist: 'Clarify briefly, give a framework, walk 2–3 scenarios, ground it in a real story, finish strong.',
    points: [
      '1–2 clarifying questions that would change your approach (30–60 seconds). Not five, and not "what would you do?".',
      'Diagnose before you act: people, process or technology? Reversible or not?',
      'Endless "it depends" sounds like you do not know. Make reasonable assumptions.',
      'Finish with your next step, a common pitfall, or a principle.',
    ],
  },
  {
    key: 'values-drop',
    group: 'In the room',
    title: 'Do not value-drop',
    gist: 'Let a company’s values guide which story you pick and your wording, but never force the value’s name in.',
    points: ['"I really tried to Live in the Future, which I know matters here…" sounds rehearsed. Show the behavior instead.'],
  },
  {
    key: 'builder',
    group: 'In the room',
    title: 'Sound like a Builder',
    gist: 'Big Tech pattern-matches on owners who ship, use data and argue directly.',
    points: [
      '"My manager assigned me the feature" → "I took on the feature".',
      '"We escalated the disagreement" → "I set up a meeting and brought data for my alternative".',
      'Talk in numbers, frame the impact beyond your feature, and show you think about scale.',
      'Drop disclaimers ("I know this isn\'t as big as what you do") and stories about getting through bureaucracy.',
    ],
  },
  {
    key: 'tbl',
    group: 'In the room',
    title: 'Trunk, branch, leaf',
    gist: 'Use CARL only for new topics. Answer follow-ups directly; answer clarifiers in one line.',
    points: [
      'Trunk (new topic): a full CARL.',
      'Branch (go deeper on a part): a direct answer first, then a short story if it is a core area like conflict.',
      'Leaf (a detail): one or two sentences. If it hints at a doubt, add the fact that settles it.',
    ],
  },
  {
    key: 'menu',
    group: 'In the room',
    title: 'The menu technique',
    gist: 'Offer 2–3 stories with what each shows, and let them choose.',
    points: [
      'Use it when your stories show very different things, when they asked for "another example", when time is short, or when the question is ambiguous.',
      'Describe each option’s takeaway, not just its name.',
    ],
  },
  {
    key: 'halo',
    group: 'In the room',
    title: 'The halo effect',
    gist: 'A quick list of smaller wins makes you sound broad and capable.',
    points: [
      'In TMAY: "…plus CI work, several front-end features, a backend refactor."',
      'In actions: listing each step of a small project shows a solid process.',
      'With no single great story: "I have handled conflicts with PMs, peers and my manager. Let me tell you about…"',
    ],
  },
  {
    key: 'merchant',
    group: 'In the room',
    title: 'Be the merchant, not the miner',
    gist: 'Lay your best actions out where they are easy to see. Do not make them dig.',
    points: [
      'Know each story’s most compelling actions before the interview.',
      'They see your project through a straw. Show the map first (a table of contents), then zoom into the high-signal moments.',
      'One or two redirects per interview is fine: "The more interesting conflict is from another project. Can I tell that one?"',
    ],
  },
  {
    key: 'styles',
    group: 'In the room',
    title: 'Conversationalists and examiners',
    gist: 'Spot the style in the first few minutes and adapt.',
    points: [
      'Conversationalist: lets you talk. Manage your own time, watch for note-taking to stop, put your best story first.',
      'Examiner: rapid questions and interruptions. Lead with the headline, compress the context, stay calm, and redirect back to a key result you did not get to.',
    ],
    pair: { bad: 'So this was back in 2022 when I was on the platform team…', good: 'I led a platform migration with no clear requirements. Here is how I created structure: first…' },
  },
  {
    key: 'asks',
    group: 'Around the interview',
    title: 'Your questions for them',
    gist: 'One or two specific questions, tailored to who is across the table.',
    points: [
      'Avoid bland ones (day in the life, tech stack) and red flags (pay, perks, personal questions).',
      'Ask for a real example, not a hypothetical: "Tell me about a recent technical disagreement and how it was resolved."',
      'With the hiring manager, ask how success is measured and how they grow people. With peers, ask what they wish they had known. With recruiters, ask about process and which signal areas are scored.',
    ],
  },
  {
    key: 'sticky',
    group: 'Around the interview',
    title: 'Sticky situations',
    gist: 'Never lie. Explain, frame, stay positive and forward-looking.',
    points: [
      'Layoff: do not raise it yourself. If the whole team went, say so.',
      'Fired: you do not have to say it. Describe it as a role that was not a fit, then what you have built since.',
      'Gap of 6+ months: raise it briefly in TMAY with what you did during it.',
      'Short stints: raise them in TMAY as a direction, not a history.',
      'Failed startup: diagnose why it failed, and what you learned.',
    ],
  },
  {
    key: 'human',
    group: 'Around the interview',
    title: 'The human element',
    gist: 'Content wins, but delivery can sink it.',
    points: [
      'Energy and vocal variety; on video, look at the camera.',
      'Do not apologize for stumbles. Just keep going.',
      'Follow-up questions are not attacks. Answer directly, then return to your story.',
      'Keep humor for the warm-up, not the stories.',
      'Fight impostor syndrome with evidence: list what you actually shipped.',
    ],
  },
  {
    key: 'practice',
    group: 'Around the interview',
    title: 'Practice, in order',
    gist: 'Alone and recorded, then unfamiliar questions, then peers, then experienced mock interviewers.',
    points: [
      'Record each core story 2–3 times. Check the split, "I" vs "we", fillers, energy and organization.',
      'Rehearse the Big Three 3–5 times until you no longer need notes.',
      'Then drill the loop: hear a question, pick a story fast, tell it. Every question you cannot answer reveals a gap in your catalog.',
      'Give peer mock interviewers a rubric: story fit, skills shown, clarity, growth.',
    ],
  },
  {
    key: 'debrief',
    group: 'Around the interview',
    title: 'After every interview',
    gist: 'Write it all down within 30 minutes, read the signals, update the catalog.',
    points: [
      'Follow-ups: clarifying ones are neutral, probing ones are good, skeptical ones ("you did all that yourself?") are a concern, redirecting ones mean you missed the signal.',
      'Pacing: only 1–2 stories in 45 minutes means too much detail; covering 5–7 signal areas is healthy.',
      'Add the facts you were asked for, note what to emphasize next time, flag stories that fell flat, and fill gaps.',
    ],
  },
];

export const GROUPS: Card['group'][] = ['Foundations', 'Building stories', 'The Big Three', 'Other question types', 'In the room', 'Around the interview'];
export const cardByKey = (k: ConceptKey) => CARDS.find((c) => c.key === k)!;
export const BOOK_CREDIT = 'Based on the methods in Mastering Behavioral Interviews: The Guide to Storytelling in Tech by Austen McDonald.';
