import { GAME_CATALOG_BY_SLUG } from "@eslams/core-types/game-catalog";

import type { ArenaPreparedSetup } from "@/auth/pending-identity-intent";
import type { PreparedMatch } from "@/data/anonymous-state";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

/**
 * Reuses a locally persisted exact model/version setup only when its public
 * identities still describe the completed session. Otherwise the result UI
 * must return to Arena for an explicit fresh selection.
 */
export function mobileArenaRematchSetup(
  session: PublicMobileArenaSession,
  prepared: PreparedMatch | null,
): ArenaPreparedSetup | null {
  if (session.status !== "completed"
    || !prepared
    || prepared.gameSlug !== session.gameSlug
    || prepared.setupVersion !== 2
    || !session.seats
    || !session.humanPlayerId
    || session.humanPlayerId !== prepared.humanSeatId
    || session.seats.length !== prepared.seats.length) return null;
  const game = GAME_CATALOG_BY_SLUG[session.gameSlug];
  if (!game || game.topology.controlledPlayers.length !== prepared.seats.length) return null;

  const exactSeatsById = new Map(prepared.seats.map((seat) => [seat.seatId, seat] as const));
  const controlledPlayers = new Set(game.topology.controlledPlayers);
  for (const publicSeat of session.seats) {
    const exactSeat = exactSeatsById.get(publicSeat.seatId);
    if (!exactSeat || !controlledPlayers.has(publicSeat.seatId)) return null;
    if (publicSeat.participantType === "human") {
      if (exactSeat.participant.kind !== "human") return null;
      continue;
    }
    if (publicSeat.participantType !== "model"
      || exactSeat.participant.kind !== "model"
      || publicSeat.modelId !== exactSeat.participant.modelEntryId) return null;
  }

  const side = game.topology.mode === "head_to_head"
    ? prepared.humanSeatId === game.topology.controlledPlayers[0] ? "first" : "second"
    : null;
  return Object.freeze({
    setupVersion: 2,
    gameSlug: prepared.gameSlug,
    seats: prepared.seats,
    side,
    visibility: session.matchVisibility ?? prepared.visibility,
  });
}
