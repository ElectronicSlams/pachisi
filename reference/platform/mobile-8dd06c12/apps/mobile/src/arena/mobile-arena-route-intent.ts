import {
  isSafeMobileModelEntryId,
  isSafeMobileModelEntryVersionId,
} from "@/search/model-facts";

export type MobileArenaRouteModelIntent =
  | Readonly<{ kind: "ordinary"; modelEntryId: string | null }>
  | Readonly<{
      kind: "exact_human_rating_challenge";
      modelEntryId: string | null;
      modelEntryVersionId: string | null;
      valid: boolean;
    }>;

export function mobileArenaRouteModelIntent(params: Readonly<{
  humanRatingChallenge?: unknown;
  model?: unknown;
  modelVersion?: unknown;
}>): MobileArenaRouteModelIntent {
  const modelEntryId = isSafeMobileModelEntryId(params.model) ? params.model : null;
  const explicitChallenge = params.humanRatingChallenge !== undefined || params.modelVersion !== undefined;
  if (!explicitChallenge) return Object.freeze({ kind: "ordinary", modelEntryId });
  const modelEntryVersionId = isSafeMobileModelEntryVersionId(params.modelVersion)
    ? params.modelVersion
    : null;
  return Object.freeze({
    kind: "exact_human_rating_challenge",
    modelEntryId,
    modelEntryVersionId,
    valid: params.humanRatingChallenge === "1"
      && modelEntryId !== null
      && modelEntryVersionId !== null,
  });
}

export function mobileArenaRouteProviderIntent(value: unknown): string | null {
  return typeof value === "string"
    && value.length <= 80
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)
    ? value
    : null;
}
