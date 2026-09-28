import { Icon } from './icons';

/** `// section name` label that sits above every section heading. */
export function Eyebrow({ children, dark = true }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`font-mono text-[12.5px] font-medium tracking-[0.16em] uppercase ${
        dark ? 'text-dim' : 'text-ink-muted'
      }`}
    >
      <span className="text-crimson">{'// '}</span>
      {children}
    </span>
  );
}

/** Section heading. The final period is always crimson. */
export function H2({
  children,
  id,
  className = '',
}: {
  children: string;
  id: string;
  className?: string;
}) {
  const period = children.endsWith('.');
  const text = period ? children.slice(0, -1) : children;
  const words = text.split(' ');
  return (
    <h2
      id={id}
      className={`rv-split font-display caps m-0 font-black leading-[0.9] tracking-[-0.004em] text-balance text-[clamp(2.8rem,8.4vw,5.9rem)] ${className}`}
    >
      {words.map((w, i) => (
        <span key={i}>
          <span className="split-w" style={{ ['--w' as string]: i }}>
            <span>
              {w}
              {period && i === words.length - 1 && <span className="text-crimson">.</span>}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h2>
  );
}

/** A small dot with a radar ping behind it. */
export function PingDot({ color = '#FF5C77', size = 7 }: { color?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 rounded-full"
      style={{ width: size, height: size, background: color }}
    >
      <span
        className="anim-ping absolute inset-0 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

/** Mono pill used for topic tags. */
export function Chip({ children, dark = true }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`font-mono inline-flex items-center rounded-full px-2.5 py-1 text-[12.5px] ${
        dark
          ? 'border border-white/14 bg-white/4 text-soft'
          : 'border border-[#E0DBD3] bg-white text-ink-muted'
      }`}
    >
      {children}
    </span>
  );
}

/** Text link with an arrow that slides on hover. */
export function ArrowLink({
  href,
  children,
  color,
}: {
  href: string;
  children: string;
  color?: string;
}) {
  return (
    <a
      href={href}
      className="link-arrow inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold no-underline"
      style={color ? { color } : undefined}
    >
      {children}
      <Icon name="arrow" size={15} stroke={2.4} className="arrow" />
    </a>
  );
}
