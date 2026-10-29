import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { authoritativeMobileArenaSession } from "./mobile-arena-session-authority";

describe("mobile Arena session authority", () => {
  it("keeps a terminal mutation response when an older active read settles later", () => {
    const terminal = session({ status: "completed", terminalReason: "resignation", updatedAt: 300, moveNumber: 4 });
    const stale = session({ status: "active", updatedAt: 200, moveNumber: 3 });

    expect(authoritativeMobileArenaSession(terminal, stale)).toBe(terminal);
  });

  it("accepts terminal dominance even when the terminal cutoff timestamp is older", () => {
    const active = session({ status: "active", updatedAt: 400, moveNumber: 4 });
    const expired = session({ status: "completed", terminalReason: "abandoned", updatedAt: 350, moveNumber: 4 });

    expect(authoritativeMobileArenaSession(active, expired)).toBe(expired);
  });

  it("keeps terminal gameplay identity immutable", () => {
    const resigned = session({ status: "completed", terminalReason: "resignation", updatedAt: 300 });
    const conflictingLaterTerminal = session({ status: "completed", terminalReason: "abandoned", updatedAt: 400 });

    expect(authoritativeMobileArenaSession(resigned, conflictingLaterTerminal)).toBe(resigned);
  });

  it("accepts terminal publication and later visibility revisions without regressing them", () => {
    const terminal = session({
      status: "completed",
      terminalReason: "normal",
      updatedAt: 300,
      matchVisibility: "only_me",
      winner: "human",
      winnerSeatId: "A",
      stateHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      resultPublication: Object.freeze({ status: "pending" }),
      resultRevision: 0,
    });
    const published = session({
      ...terminal,
      resultPublication: Object.freeze({
        status: "ready",
        matchId: "arena_session_1",
        replayId: "replay_arena_session_1",
        savedToProfile: true,
      }),
      resultRevision: 1,
    });
    const publicResult = session({ ...published, matchVisibility: "public", resultRevision: 2, updatedAt: 300 });

    expect(authoritativeMobileArenaSession(terminal, published)).toBe(published);
    expect(authoritativeMobileArenaSession(published, terminal)).toBe(published);
    expect(authoritativeMobileArenaSession(published, publicResult)).toBe(publicResult);
    expect(authoritativeMobileArenaSession(publicResult, published)).toBe(publicResult);
  });

  it("never regresses move authority and uses server revision within the same move", () => {
    const current = session({ updatedAt: 300, moveNumber: 4 });
    const laterMoveWithOlderTimestamp = session({ updatedAt: 299, moveNumber: 5 });
    const staleMoveWithLaterTimestamp = session({ updatedAt: 301, moveNumber: 3 });
    const sameMoveNewerRevision = session({ updatedAt: 302, moveNumber: 4 });

    expect(authoritativeMobileArenaSession(current, laterMoveWithOlderTimestamp)).toBe(laterMoveWithOlderTimestamp);
    expect(authoritativeMobileArenaSession(current, staleMoveWithLaterTimestamp)).toBe(current);
    expect(authoritativeMobileArenaSession(current, sameMoveNewerRevision)).toBe(sameMoveNewerRevision);
  });

  it("never regresses 10/30/120 model-turn authority when coarse versions tie", () => {
    const claim = session({
      modelTurn: modelTurn({ status: "claim_eligible", statusAt: 220 }),
      moveNumber: 4,
      updatedAt: 300,
    });
    const thinking = session({
      modelTurn: modelTurn({ status: "thinking", statusAt: 110 }),
      moveNumber: 4,
      updatedAt: 300,
    });
    const sameCutoffLowerStatus = session({
      modelTurn: modelTurn({ status: "keep_waiting_offer", statusAt: 220 }),
      moveNumber: 4,
      updatedAt: 300,
    });

    expect(authoritativeMobileArenaSession(claim, thinking)).toBe(claim);
    expect(authoritativeMobileArenaSession(claim, sameCutoffLowerStatus)).toBe(claim);
    expect(authoritativeMobileArenaSession(claim, session({ moveNumber: 4, updatedAt: 300 }))).toBe(claim);
    expect(authoritativeMobileArenaSession(thinking, claim)).toBe(claim);
  });
});

function modelTurn(
  overrides: Partial<NonNullable<PublicMobileArenaSession["modelTurn"]>>,
): NonNullable<PublicMobileArenaSession["modelTurn"]> {
  return Object.freeze({
    status: "pending",
    startedAt: 100,
    thinkingAt: 110,
    keepWaitingOfferAt: 130,
    claimEligibleAt: 220,
    statusAt: 100,
    serverNow: 220,
    claimEligible: false,
    lateResponseFenced: false,
    timeoutEvidenceAt: null,
    ...overrides,
  });
}

function session(overrides: Partial<PublicMobileArenaSession>): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "arena_session_1",
    gameSlug: "connect-four",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 100 + (7 * 24 * 60 * 60 * 1_000),
    modelTurn: null,
    moveNumber: 3,
    updatedAt: 200,
    ...overrides,
  });
}
