'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A number that counts up from zero the first time it scrolls into view.
 * The server renders the real value, so without JavaScript (or under reduced
 * motion) it is simply the number. Any non-digit prefix ("~10") is kept.
 */
export function CountUp({ value, ms = 1300 }: { value: string; ms?: number }) {
  const m = /^(\D*)(\d+)(.*)$/.exec(value);
  const target = m ? Number(m[2]) : 0;
  const [n, setN] = useState<number | null>(null);
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!m || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const node = el.current;
    if (!node) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const run = (t: number) => {
          const p = Math.min(1, (t - t0) / ms);
          setN(Math.round(target * (1 - Math.pow(1 - p, 4))));
          if (p < 1) raf = requestAnimationFrame(run);
        };
        raf = requestAnimationFrame(run);
      },
      { threshold: 0.6 },
    );
    // Start at zero only once it is known it will animate.
    setN(0);
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);

  if (!m) return <>{value}</>;
  return (
    <span ref={el} className="tabular-nums">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true">
        {m[1]}
        {n ?? target}
        {m[3]}
      </span>
    </span>
  );
}
