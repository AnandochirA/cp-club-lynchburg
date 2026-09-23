import { Icon } from './icons';

/** `// section name` label that sits above every section heading. */
export function Eyebrow({ children, dark = true }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`font-mono text-[13px] tracking-[0.08em] lowercase ${
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
  const text = children.endsWith('.') ? children.slice(0, -1) : children;
  const period = children.endsWith('.');
  return (
    <h2
      id={id}
      className={`font-display m-0 font-extrabold leading-[1.02] tracking-[-0.012em] text-balance text-[clamp(2rem,6vw,4.5rem)] ${className}`}
    >
      {text}
      {period && <span className="text-crimson">.</span>}
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
