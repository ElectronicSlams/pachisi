import type { GameCatalogEntry, MatchVisibility } from "@eslams/core-types";
import { modelAllowsGame, type MobileSearchModelFacts } from "@eslams/search-contract";

import type { PreparedMatchSeat } from "@/data/anonymous-state";

export const MOBILE_ARENA_SETUP_VERSION = 2 as const;

export type MobileArenaLockedModel = Readonly<{
  modelEntryId: string;
  modelEntryVersionId: string;
  providerVersionString: string;
}>;

export type MobileArenaSetupSeat = PreparedMatchSeat;

export type MobileArenaPreparedSetup = Readonly<{
  setupVersion: typeof MOBILE_ARENA_SETUP_VERSION;
  gameSlug: string;
  humanSeatId: string;
  seats: readonly MobileArenaSetupSeat[];
  visibility: MatchVisibility;
}>;

export function lockedArenaModel(model: MobileSearchModelFacts): MobileArenaLockedModel {
  return Object.freeze({
    modelEntryId: model.modelEntryId,
    modelEntryVersionId: model.modelEntryVersionId,
    providerVersionString: model.providerVersionString,
  });
}

export function mobileArenaPreparedSetup(
  game: GameCatalogEntry,
  humanSeatId: string,
  modelsBySeat: Readonly<Record<string, MobileSearchModelFacts | null>>,
  visibility: MatchVisibility,
): MobileArenaPreparedSetup | null {
  const seatIds = game.topology.controlledPlayers;
  if (!seatIds.includes(humanSeatId) || seatIds.length < 2) return null;
  const seats: MobileArenaSetupSeat[] = [];
  for (const seatId of seatIds) {
    if (seatId === humanSeatId) {
      seats.push(Object.freeze({ seatId, participant: Object.freeze({ kind: "human" as const }) }));
      continue;
    }
    const model = modelsBySeat[seatId];
    if (!model || model.availability !== "available" || !modelAllowsGame(model, game.slug)) return null;
    seats.push(Object.freeze({
      seatId,
      participant: Object.freeze({ kind: "model" as const, ...lockedArenaModel(model) }),
    }));
  }
  return Object.freeze({
    setupVersion: MOBILE_ARENA_SETUP_VERSION,
    gameSlug: game.slug,
    humanSeatId,
    seats: Object.freeze(seats),
    visibility,
  });
}

export function mobileArenaSeatTitle(game: GameCatalogEntry, seatId: string): string {
  const index = game.topology.controlledPlayers.indexOf(seatId);
  if (index < 0) return "Unknown seat";
  if (game.slug === "bridge") return ["South", "West", "North", "East"][index] ?? `Seat ${index + 1}`;
  if (game.topology.mode === "head_to_head") return index === 0 ? "First" : "Second";
  return `Seat ${index + 1}`;
}

export function mobileArenaSeatSubtitle(game: GameCatalogEntry, seatId: string): string {
  const index = game.topology.controlledPlayers.indexOf(seatId);
  if (index < 0) return "";
  if (game.slug === "bridge") return ["S", "W", "N", "E"][index] ?? "";
  if (game.topology.mode === "head_to_head") return index === 0 ? "Seat A" : "Seat B";
  return seatId === game.topology.controlledPlayers[0] ? "your seat" : `table position ${index + 1}`;
}

export function modelForLockedArenaSeat(
  roster: readonly MobileSearchModelFacts[],
  seat: MobileArenaSetupSeat | undefined,
): MobileSearchModelFacts | null {
  if (!seat) return null;
  const participant = seat.participant;
  if (participant.kind === "human") return null;
  return roster.find((model) => model.modelEntryId === participant.modelEntryId
    && model.modelEntryVersionId === participant.modelEntryVersionId
    && model.providerVersionString === participant.providerVersionString) ?? null;
}
