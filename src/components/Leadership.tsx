import { leadership } from '@/lib/content';
import { Eyebrow, H2 } from './ui';

function Monogram({ letter }: { letter: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0E0F14] lg:size-24"
    >
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <span className="font-display relative text-[34px] leading-none font-extrabold text-transparent lg:text-[40px] bg-clip-text" style={{ backgroundImage: 'linear-gradient(180deg, #FF5C77, #C4002A)' }}>
        {letter}
      </span>
    </span>
  );
}

export function Leadership() {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="flex flex-col bg-paper px-5 pb-19 text-ink-text lg:px-30 lg:pb-34"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div aria-hidden="true" className="mb-14 h-px bg-[#E4E0DA]" />
        <div className="reveal flex flex-col gap-3">
          <Eyebrow dark={false}>{leadership.eyebrow}</Eyebrow>
          <H2 id="team-title">{leadership.title}</H2>
        </div>
        <div className="mt-6 grid gap-3 lg:mt-12 lg:grid-cols-2 lg:gap-5">
          {leadership.people.map((p) => (
            <article
              key={p.name}
              className="card-l reveal lift flex items-center gap-4 rounded-[20px] p-3.5 lg:gap-6 lg:rounded-[24px] lg:p-5"
            >
              <Monogram letter={p.initial} />
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[12.5px] font-medium tracking-[0.08em] uppercase text-crimson-lo">
                  {p.role}
                </span>
                <h3 className="font-display m-0 text-[22px] leading-[1.2] font-bold tracking-[-0.015em] lg:text-[26px]">
                  {p.name}
                </h3>
                <span className="text-[15px] leading-[1.4] text-ink-muted">{p.line}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
