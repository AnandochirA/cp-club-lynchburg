'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/* The Web Speech API is not in TypeScript's DOM types yet; this is the part we use. */
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** An English voice, preferring the natural-sounding ones some browsers ship. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return (
    voices.find((v) => /natural|neural|google us english|samantha/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices[0] ??
    null
  );
}

/**
 * The coach's voice and your ears: text-to-speech for the coach's lines, and
 * live speech-to-text for what you say. Recognition is paused while the coach
 * is talking so it never transcribes the coach. Nothing leaves the browser
 * except through the browser's own speech service; no audio is kept.
 */
export function useSpeech({
  onFinal,
  onHeard,
  cloud,
  rate: defaultRate = 1,
}: {
  /** A finished phrase you said. */
  onFinal: (text: string) => void;
  /** Any recognition activity at all (interim words included): you are talking. */
  onHeard: () => void;
  /** A natural voice: audio for a line, or null to fall back to the browser's voice. */
  cloud?: (text: string) => Promise<Blob | null>;
  /** The browser voice's speed (personas talk at different speeds). */
  rate?: number;
}) {
  /** False until the browser's support has been checked (it can't be known on the server). */
  const [ready, setReady] = useState(false);
  const [stt, setStt] = useState(false);
  const [tts, setTts] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState('');
  const [denied, setDenied] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const rec = useRef<Recognition | null>(null);
  /** What the member asked for; recognition can stop on its own and is restarted while this is true. */
  const want = useRef(false);
  const talking = useRef(false);
  /** Lines waiting or playing. The mic only comes back when this reaches zero. */
  const pending = useRef(0);
  /** Bumped by hush(), so lines queued before it are dropped instead of played. */
  const gen = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const audio = useRef<HTMLAudioElement | null>(null);
  const cbs = useRef({ onFinal, onHeard, cloud, defaultRate });
  cbs.current = { onFinal, onHeard, cloud, defaultRate };

  useEffect(() => {
    setStt(recognitionCtor() !== null);
    setTts(typeof window !== 'undefined' && 'speechSynthesis' in window);
    setReady(true);
    // Some browsers load voices late; asking once warms the list.
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return () => {
      want.current = false;
      rec.current?.abort();
      audio.current?.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const begin = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || talking.current) return;
    if (!rec.current) {
      const r = new Ctor();
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = (e) => {
        let pending = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const text = res[0].transcript.trim();
          if (!text) continue;
          if (res.isFinal) cbs.current.onFinal(text);
          else pending += (pending ? ' ' : '') + text;
        }
        setInterim(pending);
        cbs.current.onHeard();
      };
      r.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          want.current = false;
          setDenied(true);
          setListening(false);
        }
        // 'no-speech' and 'aborted' are routine; onend restarts if still wanted.
      };
      r.onend = () => {
        setInterim('');
        if (want.current && !talking.current) {
          try {
            r.start();
            return;
          } catch {
            /* already starting */
          }
        }
        setListening(false);
      };
      rec.current = r;
    }
    try {
      rec.current.start();
      setListening(true);
    } catch {
      /* already running */
    }
  }, []);

  const listen = useCallback(
    (on: boolean) => {
      want.current = on;
      if (on) {
        setDenied(false);
        begin();
      } else {
        rec.current?.stop();
        setListening(false);
        setInterim('');
      }
    },
    [begin],
  );

  /**
   * Queue a coach line. Lines play strictly in order, so "last time you
   * said…" is never cut off by the step's prompt. With a natural voice the
   * audio is fetched as soon as the line is queued (so it is ready by its
   * turn) and the browser's voice stands in if it fails. Resolves when the
   * line has been said, or at once with the voice off.
   */
  const say = useCallback(
    (text: string, rate?: number) => {
      if (!voiceOn) return Promise.resolve();
      const g = gen.current;
      pending.current++;
      talking.current = true;
      setSpeaking(true);
      rec.current?.abort();
      const cloudFn = cbs.current.cloud;
      const clip = cloudFn ? cloudFn(text).catch(() => null) : Promise.resolve(null);
      const r = rate ?? cbs.current.defaultRate;
      const job = chain.current
        .then(async () => {
          if (g !== gen.current) return;
          const blob = await clip;
          if (g !== gen.current) return;
          if (blob) await playBlob(blob, audio);
          else await speakBrowser(text, r);
        })
        .finally(() => {
          if (g !== gen.current) return;
          pending.current = Math.max(0, pending.current - 1);
          if (pending.current > 0) return;
          talking.current = false;
          setSpeaking(false);
          if (want.current) begin();
        });
      chain.current = job.catch(() => {});
      return job;
    },
    [voiceOn, begin],
  );

  /** Stop talking now and drop everything queued. */
  const hush = useCallback(() => {
    gen.current++;
    pending.current = 0;
    chain.current = Promise.resolve();
    audio.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    talking.current = false;
    setSpeaking(false);
    if (want.current) begin();
  }, [begin]);

  return { ready, stt, tts, listening, speaking, interim, denied, voiceOn, setVoiceOn, listen, say, hush };
}

function speakBrowser(text: string, rate: number) {
  return new Promise<void>((resolve) => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

function playBlob(blob: Blob, holder: { current: HTMLAudioElement | null }) {
  return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    holder.current = a;
    const done = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    a.onended = done;
    a.onerror = done;
    a.onpause = done;
    a.play().catch(done);
  });
}
