import { Anchor as Link } from "../ui/anchor";
import { StadiumDate } from "../stadium/stadium-date";

export type StatusStripLive = { readonly game: string; readonly a: string; readonly b: string; readonly href: string };

/**
 * The honest freshness line (brief §9.1): a red dot and "Live now · Chess ·
 * A vs B" only while a match is live; otherwise "Replays · last match
 * 26 Jun 2026". With neither it says nothing has been played yet.
 */
export function StatusStrip({ live, lastMatchAt, now }: { readonly live?: StatusStripLive | null; readonly lastMatchAt?: string | number | null; readonly now?: number | undefined }) {
  if (live) {
    return (
      <p className="st-status st-status-live">
        <span aria-hidden="true" className="st-live-dot" />
        <Link href={live.href} prefetch={false}>Live now · {live.game} · {live.a} vs {live.b}</Link>
      </p>
    );
  }
  return (
    <p className="st-status mono">
      {lastMatchAt ? <>Replays · last match <StadiumDate now={now} value={lastMatchAt} /></> : "No matches played yet"}
    </p>
  );
}
