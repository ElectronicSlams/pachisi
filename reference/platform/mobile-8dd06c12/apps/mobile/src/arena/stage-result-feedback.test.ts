import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { StageResultFeedbackTransition } from "./stage-result-feedback";

describe("StageResultFeedbackTransition", () => {
  it("is silent on terminal hydration and emits once for a live normal win", () => {
    const hydrated = new StageResultFeedbackTransition();
    expect(hydrated.observe(session({ status: "completed", terminalReason: "normal", winner: "human" }))).toBeNull();

    const live = new StageResultFeedbackTransition();
    expect(live.observe(session())).toBeNull();
    const won = session({ status: "completed", terminalReason: "normal", winner: "human" });
    expect(live.observe(won)).toBe("win");
    expect(live.observe({ ...won, resultRevision: 1 })).toBeNull();
  });

  it("does not celebrate timeout, abandoned, unavailable, or winnerless results", () => {
    for (const terminalReason of ["model_timeout_award", "abandoned", "model_unavailable"] as const) {
      const transition = new StageResultFeedbackTransition();
      transition.observe(session());
      expect(transition.observe(session({ status: "completed", terminalReason, winner: terminalReason === "model_timeout_award" ? "human" : null }))).toBeNull();
    }
  });
});

function session(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "arena_session_result",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 10,
    inactivityExpiresAt: 20,
    modelTurn: null,
    moveNumber: 6,
    updatedAt: 10,
    winner: null,
    winnerSeatId: null,
    ...overrides,
  });
}
