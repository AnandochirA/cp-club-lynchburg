'use client';

import { useState } from 'react';
import { ARTIFACTS, CLUB_SOURCES, MINE_CATEGORIES } from '@/lib/bh/kit';
import { SOURCE_PRIORITY_L3, levelByKey, type LevelKey } from '@/lib/bh/levels';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import { SOURCES, type Source, type StoryInput, emptyStory, MAX_TITLE } from '@/lib/bh/story';
import { Arrow, Btn, Eyebrow, H2, Input, SignalPicker } from './ui';

/**
 * Story mining: memory prompts on one side, a fast "seed" form on the other.
 * Brainstorm first, judge later: a seed only needs a title.
 */
export function Mine({
  level,
  focus,
  busy,
  onSeed,
  onClose,
}: {
  level: LevelKey;
  focus?: SignalKey;
  busy: boolean;
  onSeed: (s: StoryInput, openAfter: boolean) => void;
  onClose: () => void;
}) {
  const lv = levelByKey(level);
  const [area, setArea] = useState<SignalKey | 'all'>(focus ?? 'all');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<Source>(level === 'L3' ? 'school' : 'work');
  const [signals, setSignals] = useState<SignalKey[]>(focus ? [focus] : []);
  const [core, setCore] = useState(false);

  const seed = (openAfter: boolean) => {
    if (!title.trim()) return;
    onSeed({ ...emptyStory(signals), title: title.trim(), source, tier: core ? 'core' : 'supporting' }, openAfter);
    setTitle('');
    setCore(false);
  };

  return (
    <section className="panel flex flex-col gap-6 p-5 lg:p-8" aria-labelledby="mine-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Step 1 · Identify stories</Eyebrow>
          <H2 id="mine-title">Mine your stories</H2>
        </div>
        <button type="button" className="iv-link" onClick={onClose}>
          Back to catalog
        </button>
      </div>
      <p className="m-0 max-w-[68ch] text-[15px] leading-[1.55] text-soft">
        Write down anything that comes to mind, even if it does not feel impressive. Your stories are better than you think. Aim for {lv.seedTarget} seeds, {lv.coreTarget}+ of them core.
      </p>

      <form
        className="bh-seed flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          seed(false);
        }}
      >
        <Eyebrow>Quick seed</Eyebrow>
        <Input value={title} onChange={setTitle} max={MAX_TITLE} placeholder="A title you will recognize, e.g. “Hackathon API that died at 3 a.m.”" />
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <label key={s.key} className="iv-chip bh-tag">
              <input type="radio" name="seed-source" checked={source === s.key} onChange={() => setSource(s.key)} />
              <span>{s.title}</span>
            </label>
          ))}
          <label className="iv-chip bh-tag">
            <input type="checkbox" checked={core} onChange={() => setCore(!core)} />
            <span>★ Core story</span>
          </label>
        </div>
        <SignalPicker value={signals} onChange={setSignals} max={4} />
        <div className="flex flex-wrap gap-3">
          <Btn type="submit" disabled={busy || !title.trim()}>
            Save seed
          </Btn>
          <Btn kind="ghost" disabled={busy || !title.trim()} onClick={() => seed(true)}>
            Save and detail it <Arrow />
          </Btn>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        <Eyebrow>Prompts by signal area</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="iv-chip-btn" aria-pressed={area === 'all'} data-on={area === 'all' ? '1' : undefined} onClick={() => setArea('all')}>
            All
          </button>
          {SIGNALS.map((a) => (
            <button key={a.key} type="button" className="iv-chip-btn" aria-pressed={area === a.key} data-on={area === a.key ? '1' : undefined} onClick={() => setArea(a.key)}>
              {a.title}
            </button>
          ))}
        </div>
        <div className="bh-cards">
          {(area === 'all' ? SIGNALS : [signalByKey(area)]).map((a) => (
            <div key={a.key} className="bh-card">
              <b className="font-mono text-[12px] tracking-[0.1em] text-[var(--tier)] uppercase">{a.title}</b>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {a.mine.map((p) => (
                  <li key={p}>
                    <button type="button" className="bh-prompt" onClick={() => setSignals((s) => (s.includes(a.key) ? s : [...s, a.key]))}>
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bh-cards">
        {MINE_CATEGORIES.map((c) => (
          <div key={c.title} className="bh-card">
            <b className="text-[15px] text-text">{c.title}</b>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-soft">
              {c.prompts.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="bh-card">
          <b className="text-[15px] text-text">Jog your memory with</b>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-soft">
            {ARTIFACTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="bh-card">
          <b className="text-[15px] text-text">From the club</b>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-soft">
            {CLUB_SOURCES.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="bh-card">
          <b className="text-[15px] text-text">Typical core stories at {lv.title}</b>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-soft">
            {lv.examples.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        {level === 'L3' && (
          <div className="bh-card">
            <b className="text-[15px] text-text">Where students should look, best first</b>
            <ol className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-soft">
              {SOURCE_PRIORITY_L3.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
