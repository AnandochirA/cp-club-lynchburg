import { signals as S } from '@/lib/content';
import { RUBRIC } from '@/lib/interview-kit';
import { Icon } from '../icons';
import { Eyebrow, H2 } from '../ui';

/**
 * The argument, made concrete. On top, everything a judge can tell you about
 * a solution. Below it, the four signals an interviewer actually scores (the
 * same rubric the mock rounds use), with the one a submission can prove marked.
 */
export function Signals() {
  return (
    <section id="signals" aria-labelledby="signals-title" className="relative flex flex-col bg-ink px-5 py-19 text-text lg:px-30 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex flex-col items-start gap-4 lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          <Eyebrow>{S.eyebrow}</Eyebrow>
          <H2 id="signals-title">{S.title}</H2>
          <p className="reveal m-0 max-w-[460px] text-[17px] leading-[1.55] text-muted">{S.lead}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <div className="reveal sg-judge">
            <span className="font-mono text-[11.5px] tracking-[0.12em] text-dim uppercase">{S.judge.label}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="verdict on-ink" data-v="ac">
                <span className="tick">
                  <Icon name="check" size={9} stroke={4} />
                </span>
                {S.judge.verdict}
              </span>
              <span className="font-mono text-[12.5px] text-white/55">{S.judge.meta}</span>
            </div>
          </div>

          <div className="reveal sg-card">
            <span className="font-mono text-[11.5px] tracking-[0.12em] text-ink-muted uppercase">{S.room}</span>
            <ul className="m-0 flex list-none flex-col p-0">
              {RUBRIC.map((r) => {
                const seen = r.key === S.seenByJudge;
                return (
                  <li key={r.key} className="sg-row" data-seen={seen ? '1' : undefined}>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <h3 className="font-display caps m-0 text-[28px] leading-[0.95] font-extrabold lg:text-[34px]">{r.title}</h3>
                      <p className="m-0 text-[15px] leading-[1.5] text-ink-muted">
                        <span className="font-semibold text-ink-text">{S.strong}: </span>
                        {r.high}
                      </p>
                    </div>
                    <span className="sg-tag font-mono">{seen ? 'judge sees it' : 'out loud only'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
