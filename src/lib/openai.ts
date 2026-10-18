import 'server-only';

/**
 * The two OpenAI calls the interviewer needs, over plain fetch (no SDK, like
 * the LeetCode client). The key only ever lives in OPENAI_API_KEY on the
 * server. Models can be swapped with OPENAI_MODEL / OPENAI_TTS_MODEL.
 */
const BASE = 'https://api.openai.com/v1';

export const aiConfigured = () => !!process.env.OPENAI_API_KEY;
export const textModel = () => process.env.OPENAI_MODEL || 'gpt-6-luna';
const ttsModel = () => process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

export class OpenAIError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(`openai ${status}: ${detail}`);
  }
}

export type Usage = { input: number; cached: number; output: number };

type ResponseJson = {
  status?: string;
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
};

/**
 * One Responses API call whose output must match `schema` (Structured
 * Outputs, strict). Put everything that is the same across calls in
 * `instructions` so the prompt prefix can be cached.
 */
export async function structured<T>(o: {
  name: string;
  instructions: string;
  input: string;
  schema: Record<string, unknown>;
  effort: 'none' | 'low' | 'medium';
  maxOutput: number;
  timeoutMs: number;
}): Promise<{ value: T; usage: Usage }> {
  const res = await fetch(`${BASE}/responses`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: textModel(),
      instructions: o.instructions,
      input: o.input,
      reasoning: { effort: o.effort },
      max_output_tokens: o.maxOutput,
      store: false,
      text: { format: { type: 'json_schema', name: o.name, schema: o.schema, strict: true } },
    }),
    signal: AbortSignal.timeout(o.timeoutMs),
  });
  if (!res.ok) throw new OpenAIError(res.status, (await res.text()).slice(0, 300));
  const j = (await res.json()) as ResponseJson;
  const part = j.output?.flatMap((item) => (item.type === 'message' ? (item.content ?? []) : [])).find((c) => c.type === 'output_text');
  if (!part?.text) throw new OpenAIError(502, `no output (${j.status ?? 'unknown'})`);
  return {
    value: JSON.parse(part.text) as T,
    usage: {
      input: j.usage?.input_tokens ?? 0,
      cached: j.usage?.input_tokens_details?.cached_tokens ?? 0,
      output: j.usage?.output_tokens ?? 0,
    },
  };
}

/** Spoken audio (mp3) for one line, streamed straight through to the browser. */
export async function speech(text: string, voice: string, style: string): Promise<Response> {
  const res = await fetch(`${BASE}/audio/speech`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: ttsModel(), voice, input: text, instructions: style, response_format: 'mp3' }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok || !res.body) throw new OpenAIError(res.status, (await res.text()).slice(0, 300));
  return res;
}
