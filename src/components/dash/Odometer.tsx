/**
 * A rolling-digit counter, like a scoreboard. Each digit is a column that
 * slides to its number (the strip of 0-9 is CSS-generated, so it never lands in
 * the page text). The markup always holds the TRUE value, so the server-rendered
 * page is correct before any script runs; the roll-in from zero is a CSS
 * animation, and later changes (a sync, the replay) roll by transition.
 * Leading zeros stay dim, as on a scoreboard. Screen readers get the number.
 */
export function Odometer({
  value,
  pad = 0,
  delay = 0,
  className = '',
}: {
  value: number;
  /** Minimum number of digits to show (leading zeros are dimmed). */
  pad?: number;
  /** Wait this long before the first roll, so it can land with the rest of the entrance. */
  delay?: number;
  className?: string;
}) {
  const width = Math.max(pad, String(value).length);
  const digits = String(value).padStart(width, '0').split('');

  return (
    <span className={`od ${className}`} style={{ ['--od-delay' as string]: `${delay}ms` }}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="od-cols">
        {digits.map((d, i) => {
          const leadingZero = i < digits.length - 1 && digits.slice(0, i + 1).every((x) => x === '0');
          return (
            <span
              key={i}
              className="od-col"
              data-z={leadingZero ? '1' : undefined}
              style={{ ['--d' as string]: d, ['--i' as string]: digits.length - 1 - i }}
            />
          );
        })}
      </span>
    </span>
  );
}
