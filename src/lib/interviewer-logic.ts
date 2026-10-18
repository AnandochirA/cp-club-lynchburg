/**
 * The AI interviewer's shared shapes and rules (browser and server): what it
 * knows about a problem, what it writes at the end, what a round cost, and
 * the triggers for asking it to speak. The prompts themselves live on the
 * server (interviewer.ts), since they carry the problem's solution.
 */
import type { Scores, Verdict } from './interview-logic';
import type { StageId } from './interview-kit';

/** The interviewer's private notes on a problem. Never shown before the round ends. */
export type AiBrief = {
  summary: string;
  keyConstraints: string[];
  /** The details a strong candidate asks about, with the answer the interviewer gives. */
  clarifications: { question: string; answer: string }[];
  edgeCases: string[];
  bruteForce: { approach: string; time: string; space: string };
  optimal: { approach: string; time: string; space: string };
  pitfalls: string[];
};

/** The interviewer's write-up, as it would go to a hiring committee. */
export type AiDebrief = {
  verdict: Verdict;
  scores: Scores;
  summary: string;
  strengths: string[];
  concerns: string[];
  /** The moment it would have marked you down, if there was one. */
  markedDown: { at: string; quote: string; why: string } | null;
  clarifications: { question: string; asked: boolean }[];
};

export type AiUsage = {
  calls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  ttsChars: number;
};
export const emptyUsage = (): AiUsage => ({ calls: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, ttsChars: 0 });

/** What the browser asks for. */
export type TurnTrigger = 'question' | 'stage_end' | 'check' | 'start';

/** What the interviewer says back. An empty `say` means it chose to stay quiet. */
export type TurnReply = { say: string; kind: 'answer' | 'pushback' | 'hint' | 'ack' | 'none' };

/** Per-round ceilings, so a stuck loop can never run up a bill. */
export const AI_LIMITS = {
  turnsPerRound: 60,
  ttsCharsPerRound: 14_000,
  roundsPerDay: 8,
  /** The check-in timer: how often the interviewer looks at what you said, in ms. */
  checkEveryMs: 75_000,
  checkEveryMsInterrupter: 45_000,
  /** Gather a question across a pause before sending it. */
  questionDebounceMs: 1400,
  /** Give up on a reply after this and fall back to the scripted line. */
  replyTimeoutMs: 9000,
};

/** Steps where the interviewer checks in on its own (it stays out of Read and Clarify unless asked). */
export const CHECK_STAGES: StageId[] = ['edges', 'approach', 'pseudo', 'code', 'test'];

const QUESTION = /\?\s*$|^(can|could|is|are|does|do|should|will|would|what|how|which|when|may|am i|is it|are there|do we|can i|so is|so are|what if)\b/i;

/** Does a line you said sound like a question for the interviewer? */
export const isQuestion = (text: string) => QUESTION.test(text.trim());

/**
 * Rough dollar cost of a round, for the review. Uses the default models'
 * list prices (gpt-6-luna $0.10 in / $0.01 cached / $0.50 out per 1M tokens;
 * gpt-4o-mini-tts about $0.015 a minute, roughly 900 characters). An
 * estimate, not a bill.
 */
export function estimateCost(u: AiUsage): number {
  const fresh = Math.max(0, u.inputTokens - u.cachedTokens);
  const text = (fresh * 0.1 + u.cachedTokens * 0.01 + u.outputTokens * 0.5) / 1_000_000;
  const voice = (u.ttsChars / 900) * 0.015;
  return text + voice;
}
