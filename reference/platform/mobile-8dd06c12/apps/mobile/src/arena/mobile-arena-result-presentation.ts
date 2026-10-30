import { GAME_CATALOG, type MatchVisibility } from "@eslams/core-types";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { mobileArenaStageFrame } from "./mobile-arena-stage-presentation";

const ARENA_SCORE_FORMATTER = new Intl.NumberFormat("en", { maximumFractionDigits: 3 });

export type MobileArenaResultKind = "draw" | "ended" | "loss" | "timeout_award" | "win";

export type MobileArenaResultPresentation = Readonly<{
  detail: string;
  gameLabel: string;
  kind: MobileArenaResultKind;
  moveLabel: string;
  opponentName: string;
  bestScalpImpact: "ineligible" | "unknown";
  ratingImpact: "ineligible" | "unknown";
  scoreline: string | null;
  shareTitle: string;
  showConfetti: boolean;
  title: string;
  verdict: string;
  visibility: MatchVisibility;
  visibilityDescription: string;
}>;

export function mobileArenaResultPresentation(
  session: PublicMobileArenaSession,
): MobileArenaResultPresentation | null {
  if (session.status !== "completed" || !session.terminalReason || !session.matchVisibility) return null;
  const frame = mobileArenaStageFrame(session);
  const opponentName = frame.seats.find((seat) => !seat.human)?.name ?? modelName(session.modelId);
  const gameLabel = GAME_CATALOG.find((game) => game.slug === session.gameSlug)?.name ?? frame.gameLabel;
  const moveLabel = `${session.moveNumber} ${session.moveNumber === 1 ? "move" : "moves"}`;
  const timeoutAward = session.terminalReason === "model_timeout_award";
  const kind: MobileArenaResultKind = timeoutAward
    ? "timeout_award"
    : session.winner === "human"
      ? "win"
      : session.winner === "draw"
        ? "draw"
        : session.winner === "model"
          ? "loss"
          : "ended";
  const title = resultTitle(session, opponentName, kind);
  const detail = resultDetail(session, opponentName, kind);
  const verdict = resultVerdict(session, kind);
  return Object.freeze({
    detail,
    gameLabel,
    kind,
    moveLabel,
    opponentName,
    bestScalpImpact: kind === "timeout_award" || kind === "ended" ? "ineligible" : "unknown",
    ratingImpact: kind === "timeout_award" || kind === "ended" ? "ineligible" : "unknown",
    scoreline: scoreline(session),
    shareTitle: shareTitle(kind, opponentName, gameLabel, session.moveNumber),
    showConfetti: kind === "win" && session.terminalReason === "normal",
    title,
    verdict,
    visibility: session.matchVisibility,
    visibilityDescription: resultVisibilityDescription(session.matchVisibility),
  });
}

export function resultVisibilityDescription(visibility: MatchVisibility): string {
  switch (visibility) {
    case "public":
      return "Anyone can open this match and its replay.";
    case "followers":
      return "Only you and your approved followers can open it.";
    case "only_me":
      return "Only you can open this match and its replay.";
  }
}

function resultTitle(
  session: PublicMobileArenaSession,
  opponentName: string,
  kind: MobileArenaResultKind,
): string {
  if (kind === "timeout_award") return "Awarded win - model timed out";
  if (kind === "ended") return "Match ended.";
  if (session.gameSlug === "blackjack") {
    const delta = numericOutcome(session, ["chipDelta", "chipsDelta", "delta", "payout"]);
    if (delta !== null) return delta > 0 ? `+${formatScore(delta)} chips.` : delta < 0 ? `−${formatScore(Math.abs(delta))} chips.` : "Push.";
  }
  if (kind === "win") return "You won.";
  if (kind === "draw") return "A draw.";
  return `${opponentName} wins.`;
}

function resultDetail(
  session: PublicMobileArenaSession,
  opponentName: string,
  kind: MobileArenaResultKind,
): string {
  if (kind === "timeout_award") return "The model never returned a move, so the server awarded this match to you.";
  if (kind === "ended" && session.terminalReason === "model_unavailable") return "The model became unavailable before a result could be decided.";
  if (kind === "ended") return "This match ended without a winner.";
  if (session.terminalReason === "resignation") return "You resigned. The board will forget; the model won’t.";
  if (kind === "win") return "Somewhere, a datacenter is embarrassed.";
  if (kind === "draw") return "Nobody blinked. Run it back.";
  return `It took ${opponentName} ${session.moveNumber} ${session.moveNumber === 1 ? "move" : "moves"} to beat you.`;
}

function resultVerdict(session: PublicMobileArenaSession, kind: MobileArenaResultKind): string {
  if (kind === "timeout_award") return "This result does not affect ratings or best scalp.";
  if (kind === "ended") return "The match ended without changing ratings or best scalp.";
  if (kind === "draw") return "Dead even at the end.";
  if (session.terminalReason === "model_unavailable") return "The match ended without a rated result.";
  if (session.terminalReason === "abandoned") return "The match ended without changing ratings.";
  return `Decided on move ${session.moveNumber}.`;
}

function scoreline(session: PublicMobileArenaSession): string | null {
  if (!session.scores || !session.seats) return null;
  const entries = session.seats
    .filter((seat) => seat.participantType !== "empty" && session.scores?.[seat.seatId] !== undefined)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((seat) => `${seat.participantType === "human" ? "You" : publicSeatName(seat.label, seat.modelId)} ${formatScore(session.scores?.[seat.seatId] ?? 0)}`);
  return entries.length > 0 ? entries.join(" — ") : null;
}

function shareTitle(
  kind: MobileArenaResultKind,
  opponentName: string,
  gameLabel: string,
  moveNumber: number,
): string {
  if (kind === "win") return `I beat ${opponentName} at ${gameLabel}.`;
  if (kind === "timeout_award") return `${opponentName} timed out at ${gameLabel}.`;
  if (kind === "draw") return `${opponentName} and I drew at ${gameLabel}.`;
  if (kind === "ended") return `My match with ${opponentName} at ${gameLabel} ended.`;
  return `It took ${opponentName} ${moveNumber} ${moveNumber === 1 ? "move" : "moves"} to beat me.`;
}

function numericOutcome(session: PublicMobileArenaSession, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = session.outcome?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function formatScore(value: number): string {
  return ARENA_SCORE_FORMATTER.format(value);
}

function publicSeatName(label: string, modelId: string | null): string {
  return label && label.toLocaleLowerCase("en-US") !== "model"
    ? label
    : modelId ? modelName(modelId) : "Opponent";
}

function modelName(modelId: string): string {
  return modelId.split("/").at(-1)?.replace(/[-_]+/gu, " ") ?? modelId;
}
