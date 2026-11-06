import { mobileCapabilityForGame } from "@eslams/core-types";

import type {
  ManualMobileAnalyticsEvent,
  MobileAnalyticsEventMap,
  MobileMatchEligibility,
  MobileMatchOutcome,
} from "@/observability/mobile-analytics-contract";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

const MAX_ANALYTICS_DURATION_MS = 86_400_000;
const MAX_ANALYTICS_MOVES = 4_096;
const MAX_TRACKED_SESSIONS = 8;

type MobileArenaAnalyticsEventName =
  | "match_started"
  | "time_to_first_move"
  | "match_completed"
  | "claim_win_offered"
  | "claim_win_claimed";

export type MobileArenaAnalyticsEvent = ManualMobileAnalyticsEvent<MobileArenaAnalyticsEventName>;
export type MobileArenaClaimedAnalyticsEvent = ManualMobileAnalyticsEvent<"claim_win_claimed">;

type TrackedSession = {
  readonly offeredClaims: Set<string>;
  claimRecorded: boolean;
  completionRecorded: boolean;
  firstMoveRecorded: boolean;
  startRecorded: boolean;
};

/**
 * Converts accepted public Arena snapshots into a bounded, low-cardinality
 * analytics stream. Session IDs are retained only inside this mounted tracker
 * for duplicate suppression and are never included in an emitted event.
 */
export class MobileArenaAnalyticsTransition {
  private readonly sessions = new Map<string, TrackedSession>();

  observe(session: PublicMobileArenaSession): readonly MobileArenaAnalyticsEvent[] {
    const game = analyticsGame(session.gameSlug);
    if (!game) return Object.freeze([]);
    const tracked = this.trackedSession(session.sessionId);
    const events: MobileArenaAnalyticsEvent[] = [];

    if (session.status === "active" && !tracked.startRecorded) {
      tracked.startRecorded = true;
      // A session first observed after a human action does not contain enough
      // authority to recover the first-action timestamp: the API exposes only
      // the latest accepted human action. Drop that metric instead of
      // mislabelling a later action as the first move.
      if (session.createdAt === undefined
        || session.lastAcceptedHumanActionAt > session.createdAt) {
        tracked.firstMoveRecorded = true;
      }
      events.push(Object.freeze({
        name: "match_started",
        params: matchParameters(session, game, "pending", "pending"),
      }));
    }

    if (tracked.startRecorded && !tracked.firstMoveRecorded) {
      const firstMoveMs = timeToFirstMove(session);
      if (firstMoveMs !== null) {
        tracked.firstMoveRecorded = true;
        events.push(Object.freeze({
          name: "time_to_first_move",
          params: Object.freeze({ game, ms: firstMoveMs }),
        }));
      }
    }

    if (session.status === "active"
      && session.modelTurn?.status === "claim_eligible"
      && session.modelTurn.claimEligible) {
      const identity = `${session.modelTurn.startedAt}:${session.modelTurn.claimEligibleAt}`;
      const waitMs = boundedDuration(session.modelTurn.startedAt, session.modelTurn.claimEligibleAt);
      if (waitMs !== null && !tracked.offeredClaims.has(identity)) {
        tracked.offeredClaims.add(identity);
        events.push(Object.freeze({
          name: "claim_win_offered",
          params: Object.freeze({ game, waitMs }),
        }));
      }
    }

    if (session.status === "completed" && !tracked.completionRecorded) {
      tracked.completionRecorded = true;
      events.push(Object.freeze({
        name: "match_completed",
        params: matchParameters(session, game, completedOutcome(session), "unknown"),
      }));
    }

    return Object.freeze(events);
  }

  observeClaimResult(
    source: PublicMobileArenaSession,
    result: PublicMobileArenaSession,
  ): MobileArenaClaimedAnalyticsEvent | null {
    if (source.sessionId !== result.sessionId
      || source.gameSlug !== result.gameSlug
      || source.status !== "active"
      || source.modelTurn?.status !== "claim_eligible"
      || !source.modelTurn.claimEligible
      || result.status !== "completed"
      || result.terminalReason !== "model_timeout_award") return null;
    const game = analyticsGame(result.gameSlug);
    const waitMs = boundedDuration(source.modelTurn.startedAt, result.updatedAt);
    if (!game || waitMs === null) return null;
    const tracked = this.trackedSession(result.sessionId);
    if (tracked.claimRecorded) return null;
    tracked.claimRecorded = true;
    return Object.freeze({
      name: "claim_win_claimed",
      params: Object.freeze({ game, waitMs }),
    });
  }

  private trackedSession(sessionId: string): TrackedSession {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    if (this.sessions.size >= MAX_TRACKED_SESSIONS) {
      const oldest = this.sessions.keys().next().value as string | undefined;
      if (oldest) this.sessions.delete(oldest);
    }
    const tracked: TrackedSession = {
      offeredClaims: new Set<string>(),
      claimRecorded: false,
      completionRecorded: false,
      firstMoveRecorded: false,
      startRecorded: false,
    };
    this.sessions.set(sessionId, tracked);
    return tracked;
  }
}

function analyticsGame(gameSlug: string): string | null {
  return mobileCapabilityForGame(gameSlug)?.gameSlug ?? null;
}

function matchParameters(
  session: PublicMobileArenaSession,
  game: string,
  outcome: MobileMatchOutcome,
  eligibility: MobileMatchEligibility,
): MobileAnalyticsEventMap["match_started"] {
  return Object.freeze({
    game,
    opponentFamily: "unknown",
    outcome,
    moves: Math.min(MAX_ANALYTICS_MOVES, Math.max(0, session.moveNumber)),
    channel: "mobile",
    eligibility,
  });
}

function completedOutcome(session: PublicMobileArenaSession): Exclude<MobileMatchOutcome, "pending"> {
  if (session.terminalReason === "model_timeout_award") return "timeout_award";
  if (session.winner === "human") return "win";
  if (session.winner === "model") return "loss";
  if (session.winner === "draw") return "draw";
  return "ended";
}

function timeToFirstMove(session: PublicMobileArenaSession): number | null {
  if (session.createdAt === undefined || session.lastAcceptedHumanActionAt <= session.createdAt) return null;
  return boundedDuration(session.createdAt, session.lastAcceptedHumanActionAt);
}

function boundedDuration(startedAt: number, endedAt: number): number | null {
  if (!Number.isSafeInteger(startedAt)
    || !Number.isSafeInteger(endedAt)
    || startedAt < 0
    || endedAt < startedAt) return null;
  return Math.min(MAX_ANALYTICS_DURATION_MS, endedAt - startedAt);
}
