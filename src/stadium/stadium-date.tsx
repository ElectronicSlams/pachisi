import { formatStadiumDate } from "../lib/dates";

/**
 * A dated instant in stadium grammar: relative under 30 days ("3h ago"),
 * absolute after ("26 Jun 2026"), the absolute date always on hover.
 * Server-render it, or pass `now` from the server into client islands.
 */
export function StadiumDate({ value, now, className }: { readonly value: string | number | Date; readonly now?: number | undefined; readonly className?: string }) {
  const date = formatStadiumDate(value, now);
  if (!date) return null;
  return (
    <time className={`st-date mono${className ? ` ${className}` : ""}`} dateTime={date.iso} title={date.absolute}>
      {date.label}
    </time>
  );
}

/** The red dot. Rendered only when a match is live right now. */
export function LiveDot({ label = "Live" }: { readonly label?: string }) {
  return <span className="st-live"><span aria-hidden="true" className="st-live-dot" />{label}</span>;
}
