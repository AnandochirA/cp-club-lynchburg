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
}: {
  /** A finished phrase you said. */
  onFinal: (text: string) => void;
  /** Any recognition activity at all (interim words included): you are talking. */
  onHeard: () => void;
}) {
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
  /** Bumped per line, so a cancelled line finishing late cannot restart the mic mid-sentence. */
  const line = useRef(0);
  const cbs = useRef({ onFinal, onHeard });
  cbs.current = { onFinal, onHeard };

  useEffect(() => {
    setStt(recognitionCtor() !== null);
    setTts(typeof window !== 'undefined' && 'speechSynthesis' in window);
    // Some browsers load voices late; asking once warms the list.
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    return () => {
      want.current = false;
      rec.current?.abort();
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

  /** Speak a coach line. Resolves when it has been said (or at once if the voice is off or unsupported). */
  const say = useCallback(
    (text: string, rate = 1) =>
      new Promise<void>((resolve) => {
        if (!voiceOn || !('speechSynthesis' in window)) return resolve();
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) u.voice = v;
        u.rate = rate;
        const mine = ++line.current;
        talking.current = true;
        setSpeaking(true);
        rec.current?.abort();
        const done = () => {
          if (line.current !== mine) return resolve();
          talking.current = false;
          setSpeaking(false);
          if (want.current) begin();
          resolve();
        };
        u.onend = done;
        u.onerror = done;
        synth.speak(u);
      }),
    [voiceOn, begin],
  );

  const hush = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  return { stt, tts, listening, speaking, interim, denied, voiceOn, setVoiceOn, listen, say, hush };
}
