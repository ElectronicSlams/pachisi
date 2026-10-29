import {
  mobileArenaModelStatus,
  modelAllowsGame,
  type MobileArenaModelStatus,
  type MobileSearchModelFacts,
} from "@eslams/search-contract";

const MOBILE_ARENA_DEFAULT_MODEL_IDS = Object.freeze([
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash",
  "openai/o4-mini",
] as const);

export function mobileArenaCompatibleModels(
  roster: readonly MobileSearchModelFacts[],
  gameSlug: string,
): readonly MobileSearchModelFacts[] {
  return roster.filter((model) => model.availability === "available" && modelAllowsGame(model, gameSlug));
}

export function mobileArenaRosterModel(
  roster: readonly MobileSearchModelFacts[],
  modelEntryId: string | null | undefined,
): MobileSearchModelFacts | null {
  if (!modelEntryId) return null;
  return roster.find((model) => model.modelEntryId === modelEntryId) ?? null;
}

export function mobileArenaPreferredRosterModel(
  roster: readonly MobileSearchModelFacts[],
  gameSlug: string,
  modelEntryId: string | null,
  modelEntryVersionId: string | null,
  requireExact: boolean,
): MobileSearchModelFacts | null {
  if (requireExact && (!modelEntryId || !modelEntryVersionId)) return null;
  const selected = modelEntryId
    ? roster.find((model) => model.modelEntryId === modelEntryId
      && (modelEntryVersionId === null || model.modelEntryVersionId === modelEntryVersionId)) ?? null
    : null;
  if (selected?.availability === "available" && modelAllowsGame(selected, gameSlug)) return selected;
  if (requireExact) return null;
  const compatible = mobileArenaCompatibleModels(roster, gameSlug);
  for (const modelEntryId of MOBILE_ARENA_DEFAULT_MODEL_IDS) {
    const preferred = compatible.find((model) => (
      model.modelEntryId === modelEntryId && model.turnSpeed === "ready"
    ));
    if (preferred) return preferred;
  }
  return compatible.find((model) => model.turnSpeed === "ready")
    ?? compatible[0]
    ?? null;
}

export function mobileArenaRosterStatus(
  model: MobileSearchModelFacts,
  gameSlug: string,
): MobileArenaModelStatus {
  return model.availability === "available"
    ? mobileArenaModelStatus(model, gameSlug)
    : "not_available_for_game";
}
