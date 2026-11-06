import { GAME_CATALOG, type GameRendererFamily } from "@eslams/core-types";

import type { ArenaPublicEvent } from "@/connectivity/arena-live-client";
import { mobileArenaSeatTitle } from "./mobile-arena-setup";
import type { ArenaStageSeat, PublicMobileArenaSession } from "./mobile-arena-gateway";

export type MobileArenaStageSeatPresentation = Readonly<{
  active: boolean;
  human: boolean;
  id: string;
  name: string;
  position: string;
}>;

export type MobileArenaStageFramePresentation = Readonly<{
  gameLabel: string;
  inputFamily: GameRendererFamily | null;
  layout: "two_sides" | "compass" | "table_ring" | "solo_panel";
  matchupLabel: string;
  moveLabel: string;
  seats: readonly MobileArenaStageSeatPresentation[];
}>;

export function mobileArenaStageFrame(
  session: PublicMobileArenaSession,
): MobileArenaStageFramePresentation {
  const game = GAME_CATALOG.find((entry) => entry.slug === session.gameSlug) ?? null;
  const seats = [...(session.seats ?? [])]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((seat) => stageSeat(seat, session, game));
  const human = seats.find((seat) => seat.human)?.name ?? "You";
  const opponents = seats.flatMap((seat) => seat.human ? [] : [seat.name]);
  const gameLabel = game?.name ?? humanizeSlug(session.gameSlug);
  return Object.freeze({
    gameLabel,
    inputFamily: game?.renderSpec.rendererFamily ?? null,
    layout: game?.renderSpec.seatLayout ?? (seats.length > 2 ? "table_ring" : "two_sides"),
    matchupLabel: session.gameSlug === "blackjack"
      ? "YOU vs THE DEALER"
      : `${human} vs ${opponents.join(" · ") || modelName(session.modelId)}`,
    moveLabel: `move ${session.moveNumber}`,
    seats: Object.freeze(seats),
  });
}

export function mobileArenaPublicExplanation(event: ArenaPublicEvent | null): Readonly<{
  actorSeatId: string | null;
  text: string;
}> | null {
  const text = event?.event.public_explanation;
  if (typeof text !== "string" || text.trim().length < 1) return null;
  const actorSeatId = event?.event.actor_seat_id;
  return Object.freeze({
    actorSeatId: typeof actorSeatId === "string" ? actorSeatId : null,
    text: text.trim(),
  });
}

export function serverDeliberationElapsedMs(
  session: PublicMobileArenaSession | null,
  receivedAt: number,
  now: number,
): number | null {
  const turn = session?.modelTurn;
  if (!turn || session?.currentPlayer !== "model" || session.status !== "active") return null;
  return Math.max(0, turn.serverNow - turn.startedAt + Math.max(0, now - receivedAt));
}

export function formatStageClock(elapsedMs: number | null): string {
  if (elapsedMs === null) return "";
  const seconds = Math.floor(elapsedMs / 1_000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function stageSeat(
  seat: ArenaStageSeat,
  session: PublicMobileArenaSession,
  game: (typeof GAME_CATALOG)[number] | null,
): MobileArenaStageSeatPresentation {
  return Object.freeze({
    active: session.activeSeatId === seat.seatId,
    human: seat.participantType === "human",
    id: seat.seatId,
    name: seat.participantType === "human" ? "You" : publicSeatName(seat),
    position: game ? mobileArenaSeatTitle(game, seat.seatId) : `Seat ${seat.displayOrder + 1}`,
  });
}

function publicSeatName(seat: ArenaStageSeat): string {
  if (seat.label && seat.label.toLocaleLowerCase("en-US") !== "model") return seat.label;
  return seat.modelId ? modelName(seat.modelId) : "Open seat";
}

function modelName(modelId: string): string {
  return modelId.split("/").at(-1)?.replace(/[-_]+/gu, " ") ?? modelId;
}

function humanizeSlug(slug: string): string {
  return slug.replace(/-/gu, " ").replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-US"));
}
