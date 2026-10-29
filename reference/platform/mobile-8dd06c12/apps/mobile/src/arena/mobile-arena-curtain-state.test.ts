import type { ArenaPreparedSetup } from "@/auth/pending-identity-intent";

import {
  mobileArenaCurtainLifecycleForClaim,
  mobileArenaCurtainPresentation,
  mobileArenaCurtainRevealSession,
  mobileArenaFightCard,
} from "./mobile-arena-curtain-state";
import type {
  ArenaActiveSessionSummary,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

describe("mobile Arena curtain lifecycle", () => {
  it("builds an exact fight card for table seats and keeps IDs as honest fallbacks", () => {
    expect(mobileArenaFightCard(setup, { "openai/gpt-5": "GPT-5" })).toEqual({
      gameLabel: "No-Limit Texas Hold'em",
      gameSlug: "no-limit-texas-holdem",
      seats: [
        { label: "You", participantKind: "human", seatId: "player_1" },
        { label: "GPT-5", participantKind: "model", seatId: "player_2" },
        { label: "anthropic/claude", participantKind: "model", seatId: "player_3" },
        { label: "google/gemini", participantKind: "model", seatId: "player_4" },
      ],
      variantLabel: "core compact holdem fixed menu no limit",
    });
  });

  it("uses server turn evidence for an opening model-thinking curtain", () => {
    const session = publicSession({
      currentPlayer: "model",
      modelTurn: modelTurn(),
      turnPhase: "model_thinking",
    });
    const lifecycle = mobileArenaCurtainLifecycleForClaim({
      status: "started",
      session,
      startDisposition: "new",
    });
    expect(lifecycle.kind).toBe("model-thinking");
    expect(mobileArenaCurtainPresentation(lifecycle, "GPT-5").statusCopy)
      .toBe("GPT-5 is making the opening move…");
    expect(mobileArenaCurtainRevealSession(lifecycle)).toBe(session);
  });

  it("represents a confirmed idempotent join separately and preserves model status", () => {
    const session = publicSession({
      currentPlayer: "model",
      modelTurn: modelTurn(),
      turnPhase: "model_thinking",
    });
    const lifecycle = mobileArenaCurtainLifecycleForClaim(
      { status: "started", session, startDisposition: "existing" },
      "existing",
    );
    expect(lifecycle).toMatchObject({ kind: "joined-existing", modelThinking: true });
    expect(mobileArenaCurtainPresentation(lifecycle, "Claude").statusCopy)
      .toBe("Joined safely · Claude is making the opening move…");
  });

  it("keeps retryable engine uncertainty distinct from active-session conflict", () => {
    const retryable = mobileArenaCurtainLifecycleForClaim({ status: "failed", reason: "network" });
    expect(retryable).toEqual({ kind: "retryable-engine-error" });
    expect(mobileArenaCurtainPresentation(retryable, "GPT-5")).toMatchObject({
      canRevealStage: false,
      title: "The engine needs another try",
    });

    const activeSession = activeSummary();
    const conflict = mobileArenaCurtainLifecycleForClaim({ status: "conflict", activeSession });
    expect(conflict).toEqual({ kind: "active-session-conflict", activeSession });
    expect(mobileArenaCurtainPresentation(conflict, "GPT-5").title)
      .toBe("A match is already active");
  });

  it("preserves session-expiry and Retry-After evidence for the recovery curtain", () => {
    expect(mobileArenaCurtainLifecycleForClaim({
      status: "failed",
      reason: "network",
      code: "arena_engine_unavailable",
      retryAfterSeconds: 7,
    })).toEqual({ kind: "retryable-engine-error", retryAfterSeconds: 7 });
    const expired = mobileArenaCurtainLifecycleForClaim({
      status: "failed",
      reason: "session_expired",
      code: "session_expired",
    });
    expect(expired).toEqual({ kind: "session-expired" });
    expect(mobileArenaCurtainPresentation(expired, "GPT-5").title)
      .toBe("Your sign-in expired");
  });

  it("states that web-started sessions must be exited instead of resumed on mobile", () => {
    const webConflict = {
      kind: "active-session-conflict" as const,
      activeSession: { ...activeSummary(), clientChannel: "web" as const },
    };
    expect(mobileArenaCurtainPresentation(webConflict, "GPT-5").statusCopy)
      .toContain("cannot be resumed safely on mobile");
  });
});

const setup: ArenaPreparedSetup = Object.freeze({
  setupVersion: 2,
  gameSlug: "no-limit-texas-holdem",
  seats: Object.freeze([
    Object.freeze({ seatId: "player_1", participant: Object.freeze({ kind: "human" as const }) }),
    lockedSeat("player_2", "openai/gpt-5"),
    lockedSeat("player_3", "anthropic/claude"),
    lockedSeat("player_4", "google/gemini"),
  ]),
  side: null,
  visibility: "only_me",
});

function lockedSeat(seatId: string, modelEntryId: string) {
  return Object.freeze({
    seatId,
    participant: Object.freeze({
      kind: "model" as const,
      modelEntryId,
      modelEntryVersionId: `${modelEntryId}/version-1`,
      providerVersionString: "2026-07-01",
    }),
  });
}

function publicSession(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "chess",
    modelId: "openai/gpt-5",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 0,
    updatedAt: 120,
    ...overrides,
  });
}

function modelTurn() {
  return Object.freeze({
    status: "pending" as const,
    startedAt: 100,
    thinkingAt: 10_100,
    keepWaitingOfferAt: 20_100,
    claimEligibleAt: 30_100,
    statusAt: 100,
    serverNow: 100,
    claimEligible: false,
    lateResponseFenced: false,
    timeoutEvidenceAt: null,
  });
}

function activeSummary(): ArenaActiveSessionSummary {
  return Object.freeze({
    sessionId: "session_existing",
    clientChannel: "mobile",
    status: "active",
    startedAt: 10,
    lastActionAt: 100,
    expiresAt: 10_100,
    updatedAt: 110,
  });
}
