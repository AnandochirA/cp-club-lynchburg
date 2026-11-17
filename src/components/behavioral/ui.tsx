'use client';

import type { ReactNode } from 'react';
import type { ConceptKey } from '@/lib/bh/playbook';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import type { SignalArea } from '@/lib/bh/signals';
import type { StepKey, Tab } from '@/lib/bh/path';
import { Icon } from '../icons';

/** Where a button in one tab can send you: another tab, a practice mode, a story, a Playbook card. */
export type Go = { tab: Tab; mode?: string; storyId?: number; signal?: SignalKey; concept?: ConceptKey; step?: StepKey };

export const bhErrors: Record<string, string> = {
  story_limit: 'You have 30 stories, the limit. Delete one to add another.',
  round_limit: 'That is a lot of rounds today. Come back tomorrow.',
  drill_limit: 'That is a lot of drills today. Come back tomorrow.',
  debrief_limit: 'You have reached the debrief limit. Delete an old one.',
  bad_question: 'That question was not found. Reload the page and try again.',
  empty: 'Give it a title first.',
};

export function Btn({
  children,
  onClick,
  disabled,
  kind = 'primary',
  type = 'button',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
  className?: string;
}) {
  if (kind === 'ghost')
    return (
      <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-ghost flex h-11 w-fit cursor-pointer items-center gap-2 rounded-none px-5 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
        {children}
      </button>
    );
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 w-fit cursor-pointer items-center gap-2.5 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="sheen" aria-hidden="true" />
      {children}
    </button>
  );
}

export const Arrow = () => <Icon name="arrow" size={17} stroke={2.2} className="arrow" />;

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[12px] tracking-[0.12em] text-dim uppercase">{children}</span>;
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display caps m-0 text-[32px] leading-[0.92] font-black lg:text-[38px]">
      {children}
    </h2>
  );
}

/** Toggle chips for picking signal areas. */
export function SignalPicker({ value, onChange, max = 8, areas = SIGNALS }: { value: SignalKey[]; onChange: (v: SignalKey[]) => void; max?: number; areas?: SignalArea[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {areas.map((a) => {
        const on = value.includes(a.key);
        return (
          <label key={a.key} className="iv-chip bh-tag" title={a.definition}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(on ? value.filter((k) => k !== a.key) : value.length >= max ? value : [...value, a.key])}
            />
            <span>{a.title}</span>
          </label>
        );
      })}
    </div>
  );
}

export function SignalTags({ keys }: { keys: SignalKey[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {keys.map((k) => (
        <span key={k} className="mode-tag font-mono">
          {signalByKey(k).title}
        </span>
      ))}
    </span>
  );
}

export function Bar({ have, need, label }: { have: number; need: number; label?: string }) {
  const p = need ? Math.min(1, have / need) : 0;
  return (
    <span className="bh-bar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={have} aria-label={label}>
      <i style={{ width: `${p * 100}%` }} data-done={p >= 1 ? '1' : undefined} />
    </span>
  );
}

/** A small link that opens a Playbook card. */
export function ConceptLink({ concept, go, children = 'Why?' }: { concept: ConceptKey; go: (g: Go) => void; children?: ReactNode }) {
  return (
    <button type="button" className="iv-link bh-why" onClick={() => go({ tab: 'playbook', concept })}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="text-[15px] font-semibold text-text">{label}</span>
        {hint && <span className="text-[12.5px] leading-[1.4] text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function Area({ value, onChange, rows = 3, placeholder, max }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; max?: number }) {
  return <textarea className="iv-notes" rows={rows} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function Input({ value, onChange, placeholder, max, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; max?: number; type?: string }) {
  return <input className="iv-input" type={type} maxLength={max} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function Grade({ grade, children }: { grade: 'good' | 'ok' | 'bad'; children: ReactNode }) {
  return (
    <span className="bh-pill font-mono" data-grade={grade}>
      {children}
    </span>
  );
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
