'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, ladder, ranks, roadmap } from '@/lib/content';
import { IS_PREVIEW } from '@/lib/client-api';
import { Icon } from './icons';
import { LinkLeetCode } from './LinkLeetCode';
import { PlacementPanel } from './PlacementPanel';
import { RankBadge } from './RankBadge';
import { Chip } from './ui';

const R = roadmap;
const SURFACE = '#101116';

type Step = 'roadmap' | 'link' | 'placement';

/** Where they are in setting up an account: Account (done) -> LeetCode -> Placement. */
function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Setup progress" className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1.5 p-0">
      {auth.steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`font-mono flex size-6 items-center justify-center rounded-full text-[12px] font-bold ${
                done
                  ? 'bg-[#52D68A]/20 text-[#52D68A]'
                  : active
                    ? 'bg-crimson text-white'
                    : 'bg-white/8 text-dim'
              }`}
            >
              {done ? <Icon name="check" size={12} stroke={3} /> : i + 1}
            </span>
            <span className={`text-[13px] font-medium ${active ? 'text-text' : 'text-dim'}`}>{label}</span>
            {i < auth.steps.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-white/14 lg:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}

function Ladder() {
  let running = 0;
  return (
    <ol aria-label={R.ladderTitle} className="m-0 flex list-none flex-col gap-2 p-0">
      {ranks.map((r) => {
        running += r.problems;
        return (
          <li
            key={r.key}
            className="flex items-center gap-3.5 rounded-none border border-white/10 bg-white/[0.03] p-3 pr-4"
          >
            <RankBadge rank={r} size={44} pip={false} effects={false} dim={r.earnedOnly} bg={SURFACE} />
            <div className="flex min-w-0 flex-grow flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="font-display caps text-[28px] leading-none font-black">{r.name}</span>
                <span className="font-mono text-[12.5px] text-dim">{r.countLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.topics.length > 0 ? (
                  r.topics.map((t) => <Chip key={t}>{t}</Chip>)
                ) : (
                  <span className="text-[13.5px] leading-[1.4] text-muted">{r.note}</span>
                )}
              </div>
            </div>
            <span className="font-mono shrink-0 text-right text-[12.5px] leading-[1.2] text-dim">
              <span className="block text-[15px] font-bold text-soft">{running}</span>
              total
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The popup after signup: your roadmap, then (optionally) link LeetCode and
 * take the placement. In the static preview there is no server, so it only
 * ever shows the roadmap.
 */
export function RoadmapDialog({
  open,
  onClose,
  claim,
  experience,
}: {
  open: boolean;
  onClose: () => void;
  /** One-time claim from the signup that just happened (new signups only). */
  claim?: string;
  /** The "Experience level" answer, so a brand-new coder isn't pushed into a test. */
  experience: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>('roadmap');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        setStep('roadmap');
        el.showModal();
      }
      document.body.style.overflow = 'hidden';
    } else if (el.open) {
      el.close();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const beginner = experience === 'Never coded';

  return (
    <dialog
      ref={ref}
      aria-labelledby="roadmap-title"
      onClose={() => {
        document.body.style.overflow = '';
        onClose();
      }}
      onClick={(e) => {
        // a click on the backdrop lands on the <dialog> itself, not its content
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[720px] overflow-y-auto overscroll-contain border-0 p-0 text-text backdrop:bg-[rgba(5,6,9,0.84)] backdrop:backdrop-blur-[6px] [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,0_100%)]"
      style={{ background: SURFACE }}
    >
      <div className="anim-pop flex flex-col gap-5 p-5 pt-6 lg:gap-6 lg:p-9">
        {!IS_PREVIEW && <Stepper current={step === 'placement' ? 2 : 1} />}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[13px] tracking-[0.02em] text-crimson-hi">
              <span>{'// '}</span>
              {R.eyebrow}
            </span>
            <h2
              id="roadmap-title"
              className="font-display caps m-0 text-[38px] leading-[0.9] font-black tracking-[0.002em] text-balance lg:text-[58px]"
            >
              {step === 'roadmap' && R.title}
              {step === 'link' && R.link.title}
              {step === 'placement' && R.placement.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={R.close}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-none border border-white/10 bg-white/4 text-soft hover:text-text"
          >
            <Icon name="close" size={18} stroke={2.2} />
          </button>
        </div>

        {step === 'roadmap' && (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[72px] leading-[0.8] font-black text-crimson-hi lg:text-[104px]">
                {ladder.total}
              </span>
              <span className="text-[17px] leading-[1.45] text-muted">{R.sub}</span>
            </div>
            <Ladder />
            <div className="flex flex-col gap-2.5">
              <h3 className="font-display caps m-0 text-[26px] font-black">{R.rulesTitle}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {R.rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5 text-[15.5px] leading-[1.5] text-soft">
                    <Icon name="check" size={16} stroke={2.6} className="mt-1 shrink-0 text-crimson-hi" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            {beginner && <p className="m-0 text-[15px] leading-[1.5] text-gold">{R.beginnerNote}</p>}
            {IS_PREVIEW && <p className="m-0 text-[14px] text-dim">{R.previewNote}</p>}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {!IS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setStep('link')}
                  className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-6 font-sans text-base font-semibold text-white"
                >
                  <span className="sheen" aria-hidden="true" />
                  {R.cta}
                  <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
                </button>
              )}
              <button
                type="button"
                onClick={() => ref.current?.close()}
                className="btn btn-ghost flex h-13 cursor-pointer items-center justify-center rounded-none px-5 font-sans text-[15px] font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {IS_PREVIEW ? R.close : R.later}
              </button>
            </div>
          </>
        )}

        {step === 'link' && (
          <>
            <p className="m-0 text-[15.5px] leading-[1.5] text-soft">{R.link.sub}</p>
            <LinkLeetCode
              claim={claim}
              onLinked={(m) => {
                setUsername(m.username);
                setStep('placement');
              }}
            />
          </>
        )}

        {step === 'placement' && (
          <PlacementPanel
            username={username}
            beginner={beginner}
            onSkip={() => ref.current?.close()}
            onDone={() => {
              window.location.assign('/me');
            }}
          />
        )}

      </div>
    </dialog>
  );
}
