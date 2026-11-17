'use client';

import { useEffect, useState } from 'react';
import { COMPANY_KINDS, LEVELS, levelByKey, type CompanyKind, type LevelKey } from '@/lib/bh/levels';
import type { Profile } from '@/lib/bh/model';
import { SIGNALS } from '@/lib/bh/signals';
import { BOOK_CREDIT } from '@/lib/bh/playbook';
import { Icon } from '../icons';
import type { Shared } from './BehavioralStudio';
import { Arrow, Bar, Btn, Eyebrow, H2, Input, SignalPicker } from './ui';

/**
 * The Path: how ready you are, the one next thing to do, and the whole
 * preparation roadmap with live progress. Also where you set your target.
 */
export function PrepPath({ state, path, go, saveProfile }: Shared) {
  const { profile } = state;
  const lv = levelByKey(profile.level);
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(profile), [profile]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  async function save(p = draft) {
    setSaving(true);
    await saveProfile(p);
    setSaving(false);
  }

  const next = path.next;
  const done = path.steps.filter((s) => s.done).length;

  return (
    <>
      <section className="panel bh-hero flex flex-col gap-6 p-5 lg:p-8" aria-labelledby="bh-title">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="eyebrow-m">Behavioral prep</span>
            <h1 id="bh-title" className="bh-title font-display caps m-0">
              Behavioral
            </h1>
            <p className="m-0 max-w-[62ch] text-[16px] leading-[1.55] text-soft">
              Do not memorize answers. Build a catalog of your real stories, shape them so interviewers can see the signal, then practice picking the right one fast.
            </p>
          </div>
          <div className="bh-ready" style={{ ['--p' as string]: path.readiness / 100 }} role="img" aria-label={`Readiness ${path.readiness}%`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" />
              <circle cx="60" cy="60" r="52" className="bh-ring-fill" />
            </svg>
            <span className="font-display">{path.readiness}</span>
            <small className="font-mono">ready</small>
          </div>
        </div>

        {next ? (
          <button type="button" className="bh-next" onClick={() => go(next.go)}>
            <span className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--tier)] uppercase">
              Next · step {next.n} of {path.steps.length}
            </span>
            <span className="text-[19px] leading-[1.3] font-semibold text-text">{next.next}</span>
            <span className="text-[14px] leading-[1.5] text-muted">{next.why}</span>
            <span className="door-foot font-mono">
              Go <Arrow />
            </span>
          </button>
        ) : (
          <p className="bh-next m-0 text-[17px] text-text">
            Every step is done. Keep the catalog fresh, run a mock loop before each interview, and file a debrief after.
          </p>
        )}
      </section>

      <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-labelledby="bh-target">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="bh-target">Your target</H2>
          <label className="iv-chip bh-tag">
            <input type="checkbox" checked={draft.hurry} onChange={() => setDraft({ ...draft, hurry: !draft.hurry })} />
            <span>Interview in a few days (short path)</span>
          </label>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <Eyebrow>Level</Eyebrow>
            <select className="iv-input" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as LevelKey })}>
              {LEVELS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Eyebrow>Kind of company</Eyebrow>
            <select className="iv-input" value={draft.companyKind} onChange={(e) => setDraft({ ...draft, companyKind: e.target.value as CompanyKind })}>
              {COMPANY_KINDS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Eyebrow>Company (optional)</Eyebrow>
            <Input value={draft.company} onChange={(v) => setDraft({ ...draft, company: v })} placeholder="e.g. Amazon" max={80} />
          </label>
        </div>
        <p className="m-0 text-[14px] leading-[1.55] text-muted">
          <b className="text-soft">{levelByKey(draft.level).title}:</b> {levelByKey(draft.level).works} {levelByKey(draft.level).conflict}{' '}
          {COMPANY_KINDS.find((c) => c.key === draft.companyKind)?.note}
        </p>

        <details className="bh-details">
          <summary className="font-mono">Company values ({draft.values.length})</summary>
          <div className="flex flex-col gap-4 pt-3">
            <p className="m-0 text-[14px] leading-[1.55] text-muted">
              Paste the company&apos;s values and map each to the signal areas it really means. You get practice questions for each one, and the Doctor warns if you quote a value&apos;s name in a story (value-dropping).
            </p>
            {draft.values.map((v, i) => (
              <div key={i} className="bh-value flex flex-col gap-2">
                <div className="flex gap-3">
                  <Input value={v.name} onChange={(name) => setDraft({ ...draft, values: draft.values.map((x, j) => (j === i ? { ...x, name } : x)) })} placeholder="e.g. Bias for Action" max={60} />
                  <button type="button" className="iv-link shrink-0" onClick={() => setDraft({ ...draft, values: draft.values.filter((_, j) => j !== i) })}>
                    Remove
                  </button>
                </div>
                <SignalPicker value={v.signals} max={3} onChange={(signals) => setDraft({ ...draft, values: draft.values.map((x, j) => (j === i ? { ...x, signals } : x)) })} />
              </div>
            ))}
            {draft.values.length < 16 && (
              <Btn kind="ghost" onClick={() => setDraft({ ...draft, values: [...draft.values, { name: '', signals: [] }] })}>
                <Icon name="plus" size={15} stroke={2.4} /> Add a value
              </Btn>
            )}
          </div>
        </details>

        {dirty && (
          <Btn onClick={() => void save()} disabled={saving}>
            {saving ? 'Saving…' : 'Save target'}
          </Btn>
        )}
      </section>

      <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-labelledby="bh-road">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="bh-road">The roadmap</H2>
          <Eyebrow>
            {done}/{path.steps.length} done · {profile.hurry ? 'short path' : 'full path'}
          </Eyebrow>
        </div>
        <ol className="bh-steps m-0 list-none p-0">
          {path.steps.map((s) => (
            <li key={s.key} className="bh-step" data-done={s.done ? '1' : undefined} data-next={next?.key === s.key ? '1' : undefined}>
              <span className="bh-step-n font-display" aria-hidden="true">
                {s.done ? <Icon name="check" size={18} stroke={3} /> : s.n}
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[17px] font-semibold text-text">{s.title}</span>
                <span className="text-[13.5px] leading-[1.5] text-muted">{s.why}</span>
                <span className="flex items-center gap-3">
                  <Bar have={s.have} need={s.need} label={s.title} />
                  <span className="font-mono shrink-0 text-[12px] text-dim">
                    {s.have}/{s.need}
                  </span>
                </span>
                {!s.done && <span className="text-[14px] text-soft">{s.next}</span>}
              </div>
              {!s.done && (
                <button type="button" className="iv-chip-btn shrink-0" onClick={() => go(s.go)}>
                  Go
                </button>
              )}
            </li>
          ))}
          <li className="bh-step bh-step-after" data-done={path.debrief.done ? '1' : undefined}>
            <span className="bh-step-n font-display" aria-hidden="true">
              ★
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[17px] font-semibold text-text">After every real interview</span>
              <span className="text-[13.5px] leading-[1.5] text-muted">
                Within 30 minutes, write down what they asked and how the follow-ups went. It turns into fixes on your stories.
                {path.debrief.have > 0 && ` ${path.debrief.have} filed so far.`}
              </span>
            </div>
            <button type="button" className="iv-chip-btn shrink-0" onClick={() => go({ tab: 'debriefs' })}>
              Debrief
            </button>
          </li>
        </ol>
      </section>

      <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label="Signal area coverage">
        <Eyebrow>
          Signal areas your catalog covers · {path.coverage.covered.length}/8
        </Eyebrow>
        <ul className="bh-cov m-0 list-none p-0">
          {SIGNALS.map((a, i) => {
            const c = path.coverage.by[a.key];
            const on = c.core.length + c.supporting.length > 0;
            return (
              <li key={a.key} style={{ ['--n' as string]: i }}>
                <button
                  type="button"
                  className="bh-hex"
                  data-on={on ? '1' : undefined}
                  onClick={() => go(on ? { tab: 'catalog', signal: a.key } : { tab: 'catalog', mode: 'mine', signal: a.key })}
                  title={on ? `${a.title}: ${c.core.length} core, ${c.supporting.length} supporting` : `${a.title}: no story yet`}
                >
                  <span className="bh-hex-shape" aria-hidden="true">
                    {on ? c.core.length + c.supporting.length : '+'}
                  </span>
                  <span className="bh-hex-label font-mono">{a.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {path.coverage.leaned && (
          <p className="m-0 text-[14px] text-muted">
            “{path.coverage.leaned.title}” is your only story for {path.coverage.leaned.areas.length} areas. One more story would make the catalog sturdier.
          </p>
        )}
      </section>

      <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label="Stories at your level">
        <Eyebrow>Core stories interviewers often hear at {lv.title}</Eyebrow>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-soft">
          {lv.examples.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="m-0 font-mono text-[11.5px] text-dim">{BOOK_CREDIT}</p>
      </section>
    </>
  );
}
