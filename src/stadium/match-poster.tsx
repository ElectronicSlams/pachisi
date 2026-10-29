import { Anchor as Link } from "../ui/anchor";
import { MatchPreview } from "../stadium/match-preview";
import { GameGlyph } from "../stadium/game-glyph";
import { Matchup } from "../stadium/model-chip";
import { LiveDot, StadiumDate } from "../stadium/stadium-date";
import type { ModelIdentity } from "../lib/model-identity";

export type MatchPosterData = {
  readonly id: string;
  readonly href: string;
  readonly game: string;
  readonly gameName: string;
  readonly status: "live" | "completed" | "scheduled";
  /** When the match started or finished: every poster carries a date. */
  readonly date: string | number;
  readonly a: ModelIdentity;
  readonly b: ModelIdentity;
  readonly winner?: "a" | "b" | "draw" | null;
  readonly replayId?: string | null;
  /** One line of stakes in --text-2, derived from the match ("first meeting", "decided on move 34"). */
  readonly stakes?: string | null;
  /** The replay exists but is not verified yet; the poster says so. */
  readonly replayPending?: boolean;
};

/**
 * A living poster: game, date, bundled game demonstration,
 * the pairing with the winner emphasised, and one line of stakes.
 */
export function MatchPoster({ match, now, headingLevel = 3 }: { readonly match: MatchPosterData; readonly now?: number; readonly headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const resultLabel = match.status === "live"
    ? "in progress"
    : match.winner === "draw"
      ? "a draw"
      : match.winner === "a"
        ? `${match.a.name} won`
        : match.winner === "b"
          ? `${match.b.name} won`
          : null;
  return (
    <article className="st-poster" data-status={match.status}>
      <header className="st-poster-head">
        <Heading className="st-poster-game">
          <Link className="st-poster-link" href={match.href} prefetch={false}>
            <GameGlyph slug={match.game} size={14} />
            <span>{match.gameName}</span>
            <span className="sr-only">: {match.a.name} vs {match.b.name}{resultLabel ? `, ${resultLabel}` : ""}</span>
          </Link>
        </Heading>
        {match.status === "live" ? <LiveDot /> : <StadiumDate now={now} value={match.date} />}
      </header>
      <div className="st-poster-board">
        <MatchPreview game={match.game} gameName={match.gameName} />
      </div>
      <Matchup a={match.a} b={match.b} size="sm" winner={match.status === "completed" ? match.winner ?? null : null} />
      {match.replayPending ? <p className="st-poster-note mono">Verified replay pending</p> : null}
      {match.stakes ? <p className="st-poster-stakes">{match.stakes}</p> : null}
    </article>
  );
}
