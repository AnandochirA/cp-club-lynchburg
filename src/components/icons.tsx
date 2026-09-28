/** Inline stroke icons. Decorative by default; pass a `title` when the icon
 *  is the only label for a control. */

export type IconName =
  | 'arrow'
  | 'up'
  | 'check'
  | 'plus'
  | 'minus'
  | 'clock'
  | 'pin'
  | 'cal'
  | 'pizza'
  | 'chat'
  | 'code'
  | 'trophy'
  | 'doc'
  | 'users'
  | 'chev'
  | 'timer'
  | 'badge'
  | 'person'
  | 'hexcheck'
  | 'lock';

const PATHS: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  up: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  pizza: (
    <>
      <path d="M12 21.5 3.2 6.2a17 17 0 0 1 17.6 0z" />
      <path d="M5.3 9.8a13 13 0 0 1 13.4 0" />
      <circle cx="10.2" cy="12.8" r="1.1" />
      <circle cx="13.6" cy="15.6" r="1.1" />
    </>
  ),
  chat: (
    <>
      <path d="M20 12a8 8 0 0 1-11.5 7.2L4 20.5l1.3-4.3A8 8 0 1 1 20 12z" />
      <path d="M8.5 12h.01" />
      <path d="M12 12h.01" />
      <path d="M15.5 12h.01" />
    </>
  ),
  code: (
    <>
      <path d="M4.5 5h15A1.5 1.5 0 0 1 21 6.5v9a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V17h-2A1.5 1.5 0 0 1 3 15.5v-9A1.5 1.5 0 0 1 4.5 5z" />
      <path d="m9.5 9-2 2 2 2" />
      <path d="m14.5 9 2 2-2 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11" />
      <path d="M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
      <path d="M12 14v6.5" />
      <path d="M8 20.5h8" />
    </>
  ),
  doc: (
    <>
      <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14 3.5V8h4.5" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8" />
      <path d="M17.5 14.2a5.5 5.5 0 0 1 3 5.3" />
    </>
  ),
  chev: <path d="m6 9 6 6 6-6" />,
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 13.5V9.8" />
      <path d="M9.5 2.8h5" />
      <path d="m18.2 7.3 1.5-1.5" />
    </>
  ),
  badge: (
    <>
      <path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z" />
      <path d="m12 8.4 1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.2-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8.4" r="3.4" />
      <path d="M5.4 19.6a6.6 6.6 0 0 1 13.2 0" />
    </>
  ),
  hexcheck: (
    <>
      <path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4z" />
      <path d="m8.8 12.2 2.2 2.2 4.4-4.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  stroke = 2,
  title,
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  title?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------ rank marks
   One filled mark per rank, drawn to escalate: shield → chevrons → star →
   gem → crown. */

export function RankMark({
  kind,
  size,
  face,
}: {
  kind: 'shield' | 'chevrons' | 'star' | 'gem' | 'crown';
  size: number;
  face: string;
}) {
  const shield = 'M12 2.6 19.6 5.7v5.8c0 4.9-3.2 8.5-7.6 10-4.4-1.5-7.6-5.1-7.6-10V5.7z';
  const gem = 'M12 2.4 20.4 9 12 21.6 3.6 9z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {kind === 'shield' && (
        <>
          <path d={shield} opacity="0.3" />
          <path d={shield} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="11.2" r="2.3" />
          <path d="M12 14.4v3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
      {kind === 'chevrons' && (
        <>
          <path d="M12 2.6 14 5.9 12 9.2 10 5.9z" />
          <path
            d="m5.4 15.2 6.6-5.4 6.6 5.4M5.4 20.4l6.6-5.4 6.6 5.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'star' && (
        <path d="M12 2.6 14.5 9.4 21.6 9.8 16.1 14.3 17.9 21.2 12 17.4 6.1 21.2 7.9 14.3 2.4 9.8 9.5 9.4z" />
      )}
      {kind === 'gem' && (
        <>
          <path d={gem} opacity="0.32" />
          <path d={gem} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path
            d="M3.6 9h16.8M12 2.4 8.4 9l3.6 12.6M12 2.4 15.6 9 12 21.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </>
      )}
      {kind === 'crown' && (
        <>
          <ellipse cx="12" cy="3.3" rx="4.1" ry="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.2 18 3 9.1l5 3.8L12 6.6l4 6.3 5-3.8-1.2 8.9z" />
          <rect x="4.4" y="19.3" width="15.2" height="2.3" rx="1.15" />
          <circle cx="12" cy="14.6" r="1.3" fill={face} />
          <circle cx="7.7" cy="15.6" r="0.85" fill={face} />
          <circle cx="16.3" cy="15.6" r="0.85" fill={face} />
        </>
      )}
    </svg>
  );
}
