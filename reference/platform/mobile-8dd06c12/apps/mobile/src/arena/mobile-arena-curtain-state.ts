import { GAME_CATALOG } from "@eslams/core-types";

import type {
  ArenaPreparedSetup,
  ArenaSeatAssignment,
} from "@/auth/pending-identity-intent";

import type { ArenaIntentClaimResult } from "./arena-intent-start";
import type {
  ArenaActiveSessionSummary,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

export type MobileArenaCurtainStartDisposition = "new" | "existing";

export type MobileArenaFightCardSeat = Readonly<{
  label: string;
  participantKind: "human" | "model";
  seatId: string;
}>;

export type MobileArenaFightCard = Readonly<{
  gameLabel: string;
  gameSlug: string;
  seats: readonly MobileArenaFightCardSeat[];
  variantLabel: string;
}>;

export type MobileArenaCurtainLifecycle =
  | Readonly<{ kind: "starting" }>
  | Readonly<{
      kind: "joined-existing";
      modelThinking: boolean;
      session: PublicMobileArenaSession;
    }>
  | Readonly<{ kind: "model-thinking"; session: PublicMobileArenaSession }>
  | Readonly<{ kind: "ready"; session: PublicMobileArenaSession }>
  | Readonly<{ kind: "retryable-engine-error"; retryAfterSeconds?: number }>
  | Readonly<{ kind: "session-expired" }>
  | Readonly<{ kind: "invalid-setup" }>
  | Readonly<{
      activeSession: ArenaActiveSessionSummary;
      kind: "active-session-conflict";
    }>;

export type MobileArenaCurtainClaimLifecycle = Exclude<
  MobileArenaCurtainLifecycle,
  Readonly<{ kind: "starting" }>
>;

export type MobileArenaCurtainPresentation = Readonly<{
  busy: boolean;
  canRevealStage: boolean;
  statusCopy: string;
  title: string | null;
  tone: "accent" | "danger" | "neutral" | "success";
}>;

/**
 * Builds the fight card from the exact, version-locked setup. Public roster
 * labels are optional presentation data; the immutable entry ID remains the
 * truthful fallback when roster display data is not resident yet.
 */
export function mobileArenaFightCard(
  setup: ArenaPreparedSetup,
  modelLabels: Readonly<Record<string, string>> = Object.freeze({}),
): MobileArenaFightCard {
  const game = GAME_CATALOG.find((entry) => entry.slug === setup.gameSlug);
  return Object.freeze({
    gameLabel: game?.name ?? setup.gameSlug,
    gameSlug: setup.gameSlug,
    seats: Object.freeze(setup.seats.map((seat) => fightCardSeat(seat, modelLabels))),
    variantLabel: game?.variant.replaceAll("_", " ") ?? "Arena",
  });
}

/** Maps only server/gateway evidence into a curtain lifecycle; no timers infer state. */
export function mobileArenaCurtainLifecycleForClaim(
  result: ArenaIntentClaimResult,
  startDisposition: MobileArenaCurtainStartDisposition = result.status === "started"
    ? result.startDisposition
    : "new",
): MobileArenaCurtainClaimLifecycle {
  if (result.status === "started") {
    const modelThinking = sessionHasOpeningModelTurn(result.session);
    if (startDisposition === "existing") {
      return Object.freeze({
        kind: "joined-existing",
        modelThinking,
        session: result.session,
      });
    }
    return modelThinking
      ? Object.freeze({ kind: "model-thinking", session: result.session })
      : Object.freeze({ kind: "ready", session: result.session });
  }
  if (result.status === "conflict") {
    return Object.freeze({
      activeSession: result.activeSession,
      kind: "active-session-conflict",
    });
  }
  if (result.status === "invalid_handoff") {
    return Object.freeze({ kind: "invalid-setup" });
  }
  if (result.reason === "session_expired") {
    return Object.freeze({ kind: "session-expired" });
  }
  if (result.reason === "network"
    || result.reason === "invalid_response"
    || result.reason === "session_not_ready"
    || result.code === "arena_engine_unavailable") {
    return Object.freeze({
      kind: "retryable-engine-error",
      ...(result.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: result.retryAfterSeconds }),
    });
  }
  return Object.freeze({ kind: "invalid-setup" });
}

export function mobileArenaCurtainPresentation(
  lifecycle: MobileArenaCurtainLifecycle,
  opponentLabel: string,
): MobileArenaCurtainPresentation {
  switch (lifecycle.kind) {
    case "starting":
      return Object.freeze({
        busy: true,
        canRevealStage: false,
        statusCopy: "Setting the table…",
        title: null,
        tone: "accent",
      });
    case "joined-existing":
      return Object.freeze({
        busy: true,
        canRevealStage: true,
        statusCopy: lifecycle.modelThinking
          ? `Joined safely · ${opponentLabel} is making the opening move…`
          : "Joined the match already reserved for this setup.",
        title: null,
        tone: "accent",
      });
    case "model-thinking":
      return Object.freeze({
        busy: true,
        canRevealStage: true,
        statusCopy: `${opponentLabel} is making the opening move…`,
        title: null,
        tone: "accent",
      });
    case "ready":
      return Object.freeze({
        busy: false,
        canRevealStage: true,
        statusCopy: "Match ready",
        title: null,
        tone: "success",
      });
    case "retryable-engine-error":
      return Object.freeze({
        busy: false,
        canRevealStage: false,
        statusCopy: "The match-engine response was not confirmed. Retrying safely reuses this setup request.",
        title: "The engine needs another try",
        tone: "danger",
      });
    case "session-expired":
      return Object.freeze({
        busy: false,
        canRevealStage: false,
        statusCopy: "Your confirmed setup is still saved. Sign in again to continue it safely.",
        title: "Your sign-in expired",
        tone: "neutral",
      });
    case "invalid-setup":
      return Object.freeze({
        busy: false,
        canRevealStage: false,
        statusCopy: "The saved setup changed before it could be claimed. Return to Arena and choose it again.",
        title: "Match not started",
        tone: "danger",
      });
    case "active-session-conflict":
      return Object.freeze({
        busy: false,
        canRevealStage: false,
        statusCopy: lifecycle.activeSession.clientChannel === "web"
          ? "This match started on web and cannot be resumed safely on mobile. Exit it to start the prepared mobile match."
          : "eSlams keeps one live Arena match per account. Resume it or exit it to start this setup.",
        title: "A match is already active",
        tone: "neutral",
      });
  }
}

export function mobileArenaCurtainRevealSession(
  lifecycle: MobileArenaCurtainLifecycle,
): PublicMobileArenaSession | null {
  return lifecycle.kind === "ready"
    || lifecycle.kind === "model-thinking"
    || lifecycle.kind === "joined-existing"
    ? lifecycle.session
    : null;
}

function fightCardSeat(
  seat: ArenaSeatAssignment,
  modelLabels: Readonly<Record<string, string>>,
): MobileArenaFightCardSeat {
  if (seat.participant.kind === "human") {
    return Object.freeze({
      label: "You",
      participantKind: "human",
      seatId: seat.seatId,
    });
  }
  return Object.freeze({
    label: modelLabels[seat.participant.modelEntryId] ?? seat.participant.modelEntryId,
    participantKind: "model",
    seatId: seat.seatId,
  });
}

function sessionHasOpeningModelTurn(session: PublicMobileArenaSession): boolean {
  return session.status === "active"
    && session.currentPlayer === "model"
    && session.turnPhase === "model_thinking"
    && session.modelTurn !== null;
}
