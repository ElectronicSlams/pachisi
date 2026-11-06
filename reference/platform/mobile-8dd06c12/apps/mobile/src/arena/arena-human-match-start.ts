import { useRouter } from "expo-router";
import { useCallback } from "react";

import { useMobileAuth } from "@/auth/mobile-auth-context";
import { pendingIdentityIntentRepository } from "@/auth/pending-identity-intent-runtime";
import {
  ARENA_MATCH_SETUP_VERSION,
  parsePendingIdentityIntentValue,
  pendingIdentityIntentsEqual,
  type ArenaLockedModel,
  type ArenaPreparedSetup,
  type ArenaSide,
  type PendingIdentityIntent,
  type PendingIdentityIntentRecord,
} from "@/auth/pending-identity-intent";
import type { MatchVisibility } from "@eslams/core-types";

import type { MobileAccessibilityTargetResolver } from "@/accessibility/mobile-accessibility-runtime";

const MAX_HANDOFF_BYTES = 16 * 1024;

type ArenaIntent = Extract<PendingIdentityIntent, { kind: "start-arena-match" }>;
export type PinnedArenaIntent = Readonly<{ recordId: string; intent: ArenaIntent }>;

export function createHumanArenaMatchIntent(setup: ArenaPreparedSetup): ArenaIntent;
/** @deprecated Step 22 callers must pass an exact locked setup. This overload only keeps migration type-safe. */
export function createHumanArenaMatchIntent(
  gameSlug: string,
  exactModelId?: string,
  visibility?: MatchVisibility,
  side?: Exclude<ArenaSide, null>,
): ArenaIntent;
export function createHumanArenaMatchIntent(
  setupOrGameSlug: ArenaPreparedSetup | string,
  _exactModelId?: string,
  _visibility?: MatchVisibility,
  _side?: Exclude<ArenaSide, null>,
): ArenaIntent {
  if (typeof setupOrGameSlug === "string") {
    throw new TypeError("An exact locked Arena setup is required.");
  }
  const intent = parsePendingIdentityIntentValue({
    kind: "start-arena-match",
    ...setupOrGameSlug,
  });
  if (!intent || intent.kind !== "start-arena-match") {
    throw new TypeError("Human Arena match intent is invalid.");
  }
  return intent;
}

export function createHeadToHeadArenaPreparedSetup(input: Readonly<{
  gameSlug: string;
  model: ArenaLockedModel;
  visibility: MatchVisibility;
  side: Exclude<ArenaSide, null>;
}>): ArenaPreparedSetup {
  const humanFirst = input.side === "first";
  const intent = createHumanArenaMatchIntent({
    setupVersion: ARENA_MATCH_SETUP_VERSION,
    gameSlug: input.gameSlug,
    seats: [
      { seatId: "player_1", participant: humanFirst ? { kind: "human" } : input.model },
      { seatId: "player_2", participant: humanFirst ? input.model : { kind: "human" } },
    ],
    side: input.side,
    visibility: input.visibility,
  });
  const { kind: _kind, ...setup } = intent;
  return Object.freeze(setup);
}

export function parseHumanArenaMatchHandoff(raw: string | undefined): ArenaIntent | null {
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_HANDOFF_BYTES) return null;
  try {
    const intent = parsePendingIdentityIntentValue(JSON.parse(raw) as unknown);
    return intent?.kind === "start-arena-match" ? intent : null;
  } catch {
    return null;
  }
}

export function matchesPinnedArenaIntent(
  record: PendingIdentityIntentRecord | null,
  pin: PinnedArenaIntent | null,
): boolean {
  return record !== null && pin !== null && record.id === pin.recordId
    && record.intent.kind === "start-arena-match"
    && pendingIdentityIntentsEqual(record.intent, pin.intent);
}

export function useHumanArenaMatchStart(): Readonly<{
  startHumanArenaMatch(
    setup: ArenaPreparedSetup,
    returnFocusTarget?: MobileAccessibilityTargetResolver,
  ): Promise<void>;
  /** @deprecated Step 22 callers must pass an exact locked setup. */
  startHumanArenaMatch(
    gameSlug: string,
    exactModelId?: string,
    visibility?: MatchVisibility,
    side?: Exclude<ArenaSide, null>,
    returnFocusTarget?: MobileAccessibilityTargetResolver,
  ): Promise<void>;
}> {
  const auth = useMobileAuth();
  const router = useRouter();
  const startHumanArenaMatch = useCallback(async (
    setupOrGameSlug: ArenaPreparedSetup | string,
    exactModelIdOrReturnFocus?: string | MobileAccessibilityTargetResolver,
    visibility?: MatchVisibility,
    side?: Exclude<ArenaSide, null>,
    legacyReturnFocusTarget?: MobileAccessibilityTargetResolver,
  ) => {
    const exactModelId = typeof exactModelIdOrReturnFocus === "string"
      ? exactModelIdOrReturnFocus
      : undefined;
    const returnFocusTarget = typeof setupOrGameSlug === "string"
      ? legacyReturnFocusTarget
      : typeof exactModelIdOrReturnFocus === "function" ? exactModelIdOrReturnFocus : undefined;
    const intent = typeof setupOrGameSlug === "string"
      ? createHumanArenaMatchIntent(setupOrGameSlug, exactModelId, visibility, side)
      : createHumanArenaMatchIntent(setupOrGameSlug);
    if (!auth.sessionUserId) {
      if (returnFocusTarget) auth.begin(intent, returnFocusTarget);
      else auth.begin(intent);
      return;
    }
    if (!auth.mobileSessionReady) {
      await auth.resumeAuthenticatedIntent(intent);
      return;
    }
    const record = pendingIdentityIntentRepository.prepare(intent);
    router.replace({
      pathname: "/stage/play",
      params: {
        arenaIntent: JSON.stringify(record.intent),
        arenaIntentId: record.id,
      },
    });
  }, [auth, router]);
  return { startHumanArenaMatch };
}
