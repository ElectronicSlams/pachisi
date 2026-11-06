import type { ArenaModelTurn, PublicMobileArenaSession } from "./mobile-arena-gateway";
import { arenaStagePresentation } from "./arena-stage-presentation";

const NOW = 1_800_000_000_000;

function modelTurn(overrides: Partial<ArenaModelTurn>): ArenaModelTurn {
  return {
    status: "pending",
    startedAt: NOW,
    thinkingAt: NOW + 10_000,
    keepWaitingOfferAt: NOW + 30_000,
    claimEligibleAt: NOW + 120_000,
    statusAt: NOW,
    serverNow: NOW,
    claimEligible: false,
    lateResponseFenced: false,
    timeoutEvidenceAt: null,
    ...overrides,
  };
}

function session(turn: ArenaModelTurn | null): PublicMobileArenaSession {
  return {
    sessionId: "arena_session_1",
    gameSlug: "connect-four",
    modelId: "anthropic/claude-opus-4.8",
    status: "active",
    currentPlayer: "model",
    turnPhase: "model_thinking",
    terminalReason: null,
    lastAcceptedHumanActionAt: NOW,
    inactivityExpiresAt: NOW + 1,
    modelTurn: turn,
    moveNumber: 1,
    updatedAt: NOW,
  };
}

describe("Arena Stage server-state presentation", () => {
  it("does not infer 10/30/120 transitions from a client or server clock", () => {
    const stalePending = session(modelTurn({ serverNow: NOW + 300_000 }));
    expect(arenaStagePresentation(stalePending, null)).toEqual({
      statusCopy: "Opponent turn",
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: false,
      terminal: false,
    });
  });

  it("renders thinking and keep-waiting only from their explicit statuses", () => {
    expect(arenaStagePresentation(session(modelTurn({
      status: "thinking",
      statusAt: NOW + 10_000,
      serverNow: NOW + 10_000,
    })), null).statusCopy).toBe("Opponent thinking…");

    const offer = session(modelTurn({
      status: "keep_waiting_offer",
      statusAt: NOW + 30_000,
      serverNow: NOW + 30_000,
    }));
    expect(arenaStagePresentation(offer, null).showKeepWaitingOffer).toBe(true);
    expect(arenaStagePresentation(offer, NOW + 30_000).showKeepWaitingOffer).toBe(false);
  });

  it("shows Claim the win only when the server marks the response claim-eligible", () => {
    const eligible = session(modelTurn({
      status: "claim_eligible",
      statusAt: NOW + 120_000,
      serverNow: NOW + 120_000,
      claimEligible: true,
      lateResponseFenced: true,
      timeoutEvidenceAt: NOW + 120_000,
    }));
    expect(arenaStagePresentation(eligible, null).showClaimTimeoutAward).toBe(true);
    expect(arenaStagePresentation(session(modelTurn({ serverNow: NOW + 120_000 })), null).showClaimTimeoutAward).toBe(false);
  });

  it("keeps abandoned copy truthful for both explicit End and inactivity expiry", () => {
    const ended = { ...session(null), status: "completed", terminalReason: "abandoned" } as const;
    expect(arenaStagePresentation(ended, null).statusCopy).toBe("Match ended");
  });
});
