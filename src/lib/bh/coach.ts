/**
 * The Story Doctor. Reads a catalog story the way a trained behavioral
 * interviewer would and returns findings, each named after the idea it comes
 * from (CARL, the 30-second rule, Thinking Defensively, ...) with a concrete
 * fix. Pure rules: same story, same findings, every time.
 */
import { durationRank, levelByKey, levelRank, type LevelKey } from './levels';
import type { ConceptKey } from './playbook';
import { ageMonths, toldText, type StoryInput } from './story';
import { findPhrase, hasNumber, speakSeconds, unexplainedAcronyms, wordCount } from './text';

export type Severity = 'blocker' | 'warn' | 'tip';
export type Section = 'seed' | 'context' | 'actions' | 'results' | 'learnings' | 'scaffold' | 'defense';
export type Finding = {
  id: string;
  section: Section;
  severity: Severity;
  title: string;
  detail: string;
  fix: string;
  concept: ConceptKey;
  /** Set when the member has prepared a framing for this weak spot instead of removing it. */
  ack?: string;
};
export type DoctorContext = { level: LevelKey; values: string[]; now: Date };
export type Stage = 'seed' | 'detailed' | 'scaffolded' | 'rehearsed';

export const STAGES: { key: Stage; title: string; note: string }[] = [
  { key: 'seed', title: 'Seed', note: 'Written down. Not yet ready to tell.' },
  { key: 'detailed', title: 'Detailed', note: 'Context, actions, results and learnings all hold up.' },
  { key: 'scaffolded', title: 'Scaffolded', note: 'Structured, follow-ups prepared, weak spots defended.' },
  { key: 'rehearsed', title: 'Rehearsed', note: 'Told out loud at least twice with a good shape.' },
];

const STAKES =
  /\$|%|\b(revenue|cost|costing|costs|lost|losing|lose|churn\w*|customers?|users?|deadline|launch\w*|risk\w*|blocked|blocking|outage|failing|failed|broke|broken|security|compliance|contract|deal|grade|demo|competitors?|investors?|million|thousands?|hundreds?|complain\w*|angry|abandon\w*|slow\w*|crash\w*|urgent|critical|priority|tickets?|sales?|support|downtime|bugs?|escalat\w*|renewal|judges?|semester|final)\b/i;
/** Stakes are said if a cue word or any number shows up in the opener. */
const saysStakes = (t: string) => STAKES.test(t) || hasNumber(t);
const REASONING = /\b(because|so that|since|to avoid|chose|instead of|trade-?off|decided|weighed|rather than|considered|compared|the reason)\b/i;
const SETBACK =
  /\b(but|however|although|didn't|did not|wasn't|was not|missed|slipped|trade-?offs?|mistake|wrong|failed|unfortunately|pushed back|hard|difficult|tough|struggled|delay\w*|late|not everyone|compromise\w*|cost us|downside)\b/i;
const TENSION =
  /\b(upset|frustrat\w*|angry|pushed back|push back|disagree\w*|heated|tense|tension|argu\w*|insisted|refused|object\w*|concern\w*|worried|blunt\w*|annoyed|stress\w*|pressure|against|opposed|resist\w*|firm|defensive)\b/i;
const RELATIONSHIP = /\b(relationship|still work|work(ed)? together|trust|thanked|appreciated|friends|on good terms|collaborat\w*|respect)\b/i;
/** Mentoring someone (not "the onboarding flow" or "coaching tool"). */
const MENTOR = /\b(mentor(ed|ing)?|mentee|(coached|coaching|taught|teaching|onboarded) (him|her|them|a|an|my|our|the|new|two|three|several))\b/i;

const PASSIVE = ['assigned me', 'assigned to me', 'was assigned', 'my manager told me', 'my manager asked me', 'i was told to', 'i was given', 'gave me a ticket', 'gave me the task'];
const NOTICED = ['no tests', 'no test coverage', 'lacked', "didn't have any tests", 'no documentation', 'no visibility', 'was a mess', 'spaghetti', 'nobody cared'];
const MEETINGS = ['several meetings', 'many meetings', 'lots of meetings', 'a series of meetings', 'multiple meetings', 'more meetings', 'endless meetings'];
const BROADCAST = ['posted it on the wiki', 'documented it in the wiki', 'on the wiki', 'sent an email to everyone', 'announced it in'];
const BLAME = ['unrealistic', 'incompetent', 'lazy', 'clueless', "didn't care", 'their fault', 'his fault', 'her fault', 'stupid', 'toxic', 'useless', 'code monkeys', 'terrible manager', 'idiot'];
const DISCLAIM = ["i know this isn't", "i know it's not", 'not as big as', 'only a few users', 'just a small', "we didn't have the tools", "it's not that impressive", 'nothing special', 'just a school project', 'not a big deal'];
const HUMBLEBRAG = ['perfectionist', 'work too hard', 'care too much', 'too passionate', "can't say no", 'too detail-oriented', 'too detail oriented', 'workaholic'];
const FATAL = ['miss deadlines', 'missed deadlines often', 'not detail-oriented', 'bad at time management', 'struggle with time management', 'prefer to work alone', "don't like working with others", 'hard to work with'];
const MISCONDUCT = /harass|inappropriate|assault|discriminat|hr complaint|lawsuit|\bsued\b/i;
const WEAKNESS_STORY = /\b(weakness|mistake|failed|failure|wrong|regret)\b/i;

export function diagnoseStory(s: StoryInput, ctx: DoctorContext): Finding[] {
  const out: Finding[] = [];
  const lv = levelByKey(ctx.level);
  const core = s.tier === 'core';
  const add = (f: Finding) => out.push({ ...f, ack: f.severity === 'blocker' ? undefined : s.defense[f.id] });
  const all = toldText(s);
  const totalWords = wordCount(all);
  const conflict = s.signals.includes('conflict');
  const growth = s.signals.includes('growth');

  // ------------------------------------------------------------- choosing the story
  if (s.signals.length === 0)
    add({ id: 'seed-signals', section: 'seed', severity: 'blocker', title: 'Not tagged', detail: 'A story is only findable under pressure if you know which signal areas it proves.', fix: 'Tag the 1–3 signal areas this story shows best.', concept: 'signals' });
  const age = ageMonths(s.when, ctx.now);
  if (age === null)
    add({ id: 'seed-when', section: 'seed', severity: 'tip', title: 'No date', detail: 'Recency matters: newer stories show who you are now.', fix: 'Add the month and year it happened.', concept: 'selection' });
  else if (age > lv.recencyFlag * 12)
    add({ id: 'seed-recency', section: 'seed', severity: 'warn', title: 'Old story', detail: `This is over ${lv.recencyFlag} years old. For ${lv.title}, interviewers expect your stories to show your current self.`, fix: 'Swap in something newer if you have it; keep this one only if it is clearly your best.', concept: 'selection' });
  else if (age > lv.recencyWarn * 12)
    add({ id: 'seed-recency-soft', section: 'seed', severity: 'tip', title: 'Getting old', detail: `Over ${lv.recencyWarn} years old. Fine if it beats your recent stories on scope.`, fix: 'Prefer a recent story of similar size.', concept: 'selection' });
  if (s.source === 'personal' && !lv.personalOk)
    add({ id: 'seed-personal', section: 'seed', severity: 'warn', title: 'Personal story', detail: 'Personal stories only work when a student has nothing from work or school.', fix: 'Find a work or school story for this signal area.', concept: 'selection' });
  if (s.source === 'school' && !lv.schoolOk)
    add({ id: 'seed-school', section: 'seed', severity: 'warn', title: 'School story at this level', detail: `At ${lv.title} a school story reads as below level.`, fix: 'Use a work story.', concept: 'selection' });
  if (core && !s.scale.duration)
    add({ id: 'seed-scale', section: 'seed', severity: 'tip', title: 'Scale unknown', detail: 'How long it ran and how many people it touched is how interviewers size your scope.', fix: 'Fill in duration, people and teams.', concept: 'levels' });
  else if (core && durationRank(s.scale.duration) < durationRank(lv.typical))
    add({ id: 'seed-scope', section: 'seed', severity: 'warn', title: 'May read below level', detail: `Work at ${lv.title} usually runs ${lv.typical}; this ran ${s.scale.duration}.`, fix: 'Pick a bigger core story, or make the scope obvious (people, teams, consequences).', concept: 'levels' });
  if (core && s.scale.contribution > 0 && s.scale.contribution <= 2)
    add({ id: 'seed-contrib', section: 'seed', severity: 'warn', title: 'Low personal contribution', detail: 'A smaller project you drove beats a huge one you sat in on.', fix: 'Choose a core story where you were the main driver.', concept: 'project' });

  // ------------------------------------------------------------- context
  const told = s.context.told;
  const ctxWords = wordCount(told);
  if (!told)
    add({ id: 'ctx-missing', section: 'context', severity: 'blocker', title: 'No context', detail: 'The listener needs just enough setup to understand why your actions mattered.', fix: 'Write the two or three sentences you would open with.', concept: 'context' });
  else {
    if (ctxWords > 90 || (totalWords >= 150 && ctxWords / totalWords > 0.25))
      add({ id: 'ctx-long', section: 'context', severity: 'warn', title: 'Context overload', detail: `Your opener is ${ctxWords} words (${Math.round((ctxWords / Math.max(1, totalWords)) * 100)}% of the story). Aim for about 10%.`, fix: 'Cut anything the actions do not need. Keep the rest in the reserve fields for follow-ups.', concept: 'context' });
    if (!saysStakes(told) && !s.context.stakes)
      add({ id: 'ctx-stakes', section: 'context', severity: 'blocker', title: 'No stakes', detail: 'Nothing says why this mattered. The deeper the hole, the more impressive the climb.', fix: 'Say what was at risk: money, users, a deadline, a grade, a customer. Ask: how would Steve Jobs describe this project?', concept: 'stakes' });
    else if (!saysStakes(told))
      add({ id: 'ctx-stakes-told', section: 'context', severity: 'tip', title: 'Stakes kept off-stage', detail: 'You wrote the stakes down but your opener does not say them.', fix: 'Move one line of stakes into the opener.', concept: 'stakes' });
  }

  // ------------------------------------------------------------- actions
  const minActions = core ? lv.minActions : Math.max(2, lv.minActions - 1);
  if (s.actions.length === 0)
    add({ id: 'act-none', section: 'actions', severity: 'blocker', title: 'No actions', detail: 'Actions are the whole point: interviewers hire the behaviors they expect you to repeat.', fix: 'List each concrete thing you did, one per line.', concept: 'actions' });
  else if (s.actions.length < minActions)
    add({ id: 'act-thin', section: 'actions', severity: core ? 'blocker' : 'warn', title: 'Not enough actions', detail: `${s.actions.length} action${s.actions.length === 1 ? '' : 's'}; a ${core ? 'core' : 'supporting'} story at ${lv.title} needs about ${minActions}. "I built it and shipped it" tells them almost nothing.`, fix: 'Walk the themes: designing, aligning, communicating, implementing, iterating, testing, releasing, deciding.', concept: 'actions' });
  const weActs = s.actions.filter((a) => /^\s*(we|our team|the team|they|everyone)\b/i.test(a.text) || /\b(was|were|got) (done|built|decided|fixed|created|made|shipped)\b/i.test(a.text));
  if (weActs.length > 0)
    add({ id: 'act-we', section: 'actions', severity: weActs.length >= 2 && weActs.length * 2 >= s.actions.length ? 'blocker' : 'warn', title: 'Unclear ownership', detail: `${weActs.length} action${weActs.length === 1 ? ' says' : 's say'} "we", "the team" or "it was done". They are hiring you, not your old team.`, fix: 'Rewrite each as "I …". If the team did it, say what your part was.', concept: 'actions' });
  const longAct = s.actions.find((a) => wordCount(a.text) > 75);
  if (longAct)
    add({ id: 'act-long', section: 'actions', severity: 'warn', title: '30-second rule', detail: 'One action runs over 30 seconds of speech. If no new action comes for 30 seconds, you are over-explaining.', fix: 'Split it, or cut the detail and offer it as a follow-up.', concept: 'detail' });
  const themes = new Set(s.actions.map((a) => a.theme).filter(Boolean));
  if (s.actions.length >= 2 && !themes.has('deciding') && !s.actions.some((a) => REASONING.test(a.text)))
    add({ id: 'act-why', section: 'actions', severity: 'tip', title: 'No reasoning', detail: 'Thinking and deciding are actions too. The alternatives you weighed show judgment.', fix: 'Add the options you considered and why you chose one.', concept: 'actions' });
  if ((conflict || s.signals.includes('communication') || s.signals.includes('leadership')) && s.actions.length >= 2 && !themes.has('aligning') && !themes.has('communicating'))
    add({ id: 'act-people', section: 'actions', severity: 'warn', title: 'No people actions', detail: 'This is tagged for a people signal area, but no action is about aligning or communicating.', fix: 'Add who you talked to, when, through which channel, and why.', concept: 'actions' });

  // ------------------------------------------------------------- results
  if (s.results.length === 0)
    add({ id: 'res-none', section: 'results', severity: 'blocker', title: 'No results', detail: 'Without results nobody can tell whether your actions worked, or whether you know what success is.', fix: 'Say what changed. A number if you have one.', concept: 'results' });
  else {
    const evidence = s.results.some((r) => r.kind === 'metric' || r.kind === 'estimate' || r.kind === 'quote' || hasNumber(r.text));
    if (!evidence)
      add({ id: 'res-evidence', section: 'results', severity: core ? 'warn' : 'tip', title: 'No evidence', detail: '"It went well" is not a result.', fix: 'Find a number. If there is none, estimate an order of magnitude ("dozens of users", "about 50% faster") or quote what someone said about it.', concept: 'results' });
    if (conflict && !s.results.some((r) => r.kind === 'relationship' || RELATIONSHIP.test(r.text)))
      add({ id: 'res-relationship', section: 'results', severity: 'blocker', title: 'Relationship missing', detail: 'In a conflict story the result includes the relationship. Winning the argument but damaging the relationship reads as weak conflict skills.', fix: 'Say how you two worked together afterwards.', concept: 'conflict' });
    if (MENTOR.test(all) && !s.results.some((r) => r.kind === 'growth'))
      add({ id: 'res-mentee', section: 'results', severity: 'warn', title: 'Where is their growth?', detail: 'In a mentoring story the result is how the other person grew.', fix: 'Say what they could do afterwards, or what they went on to.', concept: 'results' });
    if (!SETBACK.test(all))
      add({ id: 'res-fairytale', section: 'results', severity: 'warn', title: 'Fairy-tale ending', detail: 'Everything went perfectly and everyone was happy. Real projects have tradeoffs, and a perfect story sounds made up or unaware.', fix: 'Name what did not go to plan, or what it cost.', concept: 'fairytale' });
  }

  // ------------------------------------------------------------- learnings
  if (s.learnings.length === 0)
    add({ id: 'lrn-none', section: 'learnings', severity: 'blocker', title: 'No learnings', detail: 'The L in CARL. Reflection is how interviewers judge seniority and self-awareness.', fix: 'What did you learn, or what would you do differently?', concept: 'learnings' });
  else {
    if ((growth || WEAKNESS_STORY.test(s.title)) && !s.learnings.some((l) => l.applied))
      add({ id: 'lrn-applied', section: 'learnings', severity: 'warn', title: 'No evidence of change', detail: 'The strongest growth stories show the lesson used again later.', fix: 'Add when you applied it next.', concept: 'learnings' });
    if (s.learnings.every((l) => wordCount(l.text) < 8))
      add({ id: 'lrn-shallow', section: 'learnings', severity: 'tip', title: 'Shallow learning', detail: '"Communicate more" is a platitude, not an insight.', fix: 'Make it specific: what do you now do differently, and when?', concept: 'learnings' });
  }

  // ------------------------------------------------------------- scaffolding
  const secs = speakSeconds(totalWords);
  if (secs > 180 && s.toc.length === 0)
    add({ id: 'toc-needed', section: 'scaffold', severity: 'warn', title: 'Long story, no map', detail: `About ${Math.round(secs / 60)} minutes out loud. Long stories lose the listener without a table of contents.`, fix: 'Group the actions into 2–4 themes and announce them right after the context.', concept: 'toc' });
  else if (core && s.toc.length === 0 && levelRank(ctx.level) >= levelRank('L4'))
    add({ id: 'toc-core', section: 'scaffold', severity: 'tip', title: 'Add a table of contents', detail: 'Core stories are long enough to benefit from announcing their parts.', fix: 'List 2–4 themes, each with what the listener should conclude about you.', concept: 'toc' });
  if (s.toc.some((t) => !t.takeaway))
    add({ id: 'toc-takeaway', section: 'scaffold', severity: 'warn', title: 'Themes without takeaways', detail: 'A theme that is only a label ("Rollout") misses the chance to say why to hire you.', fix: 'Add what each part proves ("a careful rollout that kept every customer up").', concept: 'toc' });
  const needFollowups = core ? 5 : 3;
  if (s.followups.length < needFollowups)
    add({ id: 'fu-few', section: 'scaffold', severity: 'warn', title: 'Follow-ups not prepared', detail: `${s.followups.length} of ${needFollowups} prepared. Interviewers dig, and follow-ups often probe a suspected weak spot.`, fix: 'Answer the likely follow-ups now (hardest part, your specific part, alternatives, how you measured success).', concept: 'tbl' });
  const missingRecuts = s.signals.filter((k) => !s.recuts[k]);
  if (core && s.signals.length > 1 && missingRecuts.length > 0)
    add({ id: 'recut-missing', section: 'scaffold', severity: 'tip', title: 'Re-cuts missing', detail: 'The same story can answer several questions if you know which part to foreground for each.', fix: 'For each signal area, write one line on what to emphasize.', concept: 'recut' });
  const acr = unexplainedAcronyms(all);
  if (acr.length >= 1)
    add({ id: 'jargon', section: 'scaffold', severity: acr.length >= 3 ? 'warn' : 'tip', title: 'Jargon', detail: `Unexplained: ${acr.slice(0, 5).join(', ')}. Your interviewer is probably a manager; internal names are the worst offenders.`, fix: 'Give each a one-breath explanation, or drop it.', concept: 'detail' });
  if (core && totalWords > 0 && secs < 45)
    add({ id: 'too-short', section: 'scaffold', severity: 'warn', title: 'Too thin to land', detail: `About ${secs}s out loud. A core story usually runs about 2 minutes.`, fix: 'Add actions and results. Keep the context short.', concept: 'carl' });

  // ------------------------------------------------------------- thinking defensively
  const p = (id: string, list: string[], title: string, detail: string, fix: string, severity: Severity = 'warn', concept: ConceptKey = 'defensive') => {
    const hit = findPhrase(all, list);
    if (hit) add({ id, section: 'defense', severity, title, detail: `“${hit}”: ${detail}`, fix, concept });
  };
  p('def-passive', PASSIVE, 'Reads as passive', 'it sounds like the work was handed to you, which is weak ownership.', 'Drop it, or say "I came out of planning with this high-impact task…".');
  p('def-noticed', NOTICED, 'Noticed but did not fix?', 'you point out a problem around you. Did you fix it? If not, it reads as tolerating it.', 'Say what you did about it, or leave it out.');
  p('def-meetings', MEETINGS, 'Did you drive the decision?', 'many meetings can read as letting ambiguity drag on.', 'Explain why they were needed and how you drove them to a decision.');
  p('def-broadcast', BROADCAST, 'One-way communication', 'posting it is not the same as making sure it landed.', 'Say how you confirmed people understood.', 'tip');
  p('def-blame', BLAME, 'Villain language', 'harsh words about others make the listener wonder about you.', 'Describe their pressures and good intentions, and own your part of the breakdown.', 'warn', 'conflict');
  p('def-disclaim', DISCLAIM, 'Downplaying', 'disclaimers make your work smaller than it is.', 'Cut the disclaimer. Say what you did and what it changed.', 'warn', 'builder');
  if (conflict && MISCONDUCT.test(all))
    add({ id: 'def-misconduct', section: 'defense', severity: 'warn', title: 'Misconduct story', detail: 'Harassment or misconduct is not interpersonal conflict. It tends to end in escalation, and listeners distance themselves from it.', fix: 'Choose a different conflict story for interviews.', concept: 'conflict' });
  if (conflict && all && !TENSION.test(all))
    add({ id: 'def-leaden', section: 'defense', severity: 'warn', title: 'No conflict in the conflict', detail: 'It reads like a pleasant chat, so the listener cannot find the conflict they asked about.', fix: 'Put the tension back, calmly and factually: who pushed back, how strongly, what was at risk.', concept: 'conflict' });
  if (growth) {
    p('def-humblebrag', HUMBLEBRAG, 'Disguised strength', 'it reads as evasive or not self-aware.', 'Pick a real weakness you are actively fixing.', 'warn', 'weakness');
    p('def-fatal', FATAL, 'Job-critical weakness', 'it hits a core requirement of the job.', 'Pick a real but survivable one, such as getting alignment across teams faster.', 'warn', 'weakness');
  }
  const dropped = ctx.values.filter((v) => v.trim().length >= 4).find((v) => all.toLowerCase().includes(v.toLowerCase()));
  if (dropped)
    add({ id: 'def-valuedrop', section: 'defense', severity: 'tip', title: 'Value-dropping', detail: `You quote the company value “${dropped}”. Forcing a value's name into a story sounds awkward.`, fix: 'Show the behavior. Let the interviewer make the connection.', concept: 'values-drop' });

  return out;
}

const WEIGHT: Record<Severity, number> = { blocker: 18, warn: 7, tip: 2 };
export const open = (fs: Finding[]) => fs.filter((f) => !f.ack);
export const storyScore = (fs: Finding[]) => Math.max(0, 100 - open(fs).reduce((n, f) => n + WEIGHT[f.severity], 0));

export function storyStage(s: StoryInput, fs: Finding[], goodTakes: number): Stage {
  const o = open(fs);
  const blocked = (sections: Section[]) => o.some((f) => f.severity === 'blocker' && sections.includes(f.section));
  if (blocked(['seed', 'context', 'actions', 'results', 'learnings'])) return 'seed';
  const scaffoldOpen = o.some((f) => (f.section === 'scaffold' || f.section === 'defense') && f.severity !== 'tip');
  const recutsDone = s.tier !== 'core' || s.signals.every((k) => s.recuts[k]);
  if (scaffoldOpen || !recutsDone) return 'detailed';
  return goodTakes >= 2 ? 'rehearsed' : 'scaffolded';
}
export const stageRank = (st: Stage) => STAGES.findIndex((x) => x.key === st);

/** Findings for one story type the Big Three pickers care about. */
export const sectionFindings = (fs: Finding[], sections: Section[]) => fs.filter((f) => sections.includes(f.section));
