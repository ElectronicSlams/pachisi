import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { mobileArenaResultPresentation, resultVisibilityDescription } from "./mobile-arena-result-presentation";

function completed(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session-result",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "completed",
    currentPlayer: "model",
    turnPhase: "completed",
    terminalReason: "normal",
    lastAcceptedHumanActionAt: 1,
    inactivityExpiresAt: 2,
    modelTurn: null,
    moveNumber: 7,
    updatedAt: 2,
    matchVisibility: "public",
    winner: "human",
    humanPlayerId: "A",
    seats: Object.freeze([
      Object.freeze({ seatId: "A", participantType: "human", modelId: null, label: "You", displayOrder: 0, teamId: null }),
      Object.freeze({ seatId: "B", participantType: "model", modelId: "openai/gpt-5-mini", label: "GPT-5 Mini", displayOrder: 1, teamId: null }),
    ]),
    scores: Object.freeze({ A: 1, B: 0 }),
    ...overrides,
  });
}

describe("mobileArenaResultPresentation", () => {
  it("uses the approved win voice and allows one normal-win confetti burst", () => {
    expect(mobileArenaResultPresentation(completed())).toMatchObject({
      title: "You won.",
      detail: "Somewhere, a datacenter is embarrassed.",
      scoreline: "You 1 — GPT-5 Mini 0",
      showConfetti: true,
      ratingImpact: "unknown",
    });
  });

  it("labels a timeout award and explicitly excludes ratings and best scalp", () => {
    expect(mobileArenaResultPresentation(completed({ terminalReason: "model_timeout_award" }))).toMatchObject({
      kind: "timeout_award",
      title: "Awarded win - model timed out",
      verdict: "This result does not affect ratings or best scalp.",
      showConfetti: false,
      ratingImpact: "ineligible",
    });
  });

  it("does not celebrate a draw or loss with confetti", () => {
    expect(mobileArenaResultPresentation(completed({ winner: "draw", winnerSeatId: null })))
      .toMatchObject({ title: "A draw.", showConfetti: false });
    expect(mobileArenaResultPresentation(completed({ winner: "model", winnerSeatId: "B" })))
      .toMatchObject({ title: "GPT-5 Mini wins.", showConfetti: false });
  });

  it("never fabricates a model win when a terminal state has no winner", () => {
    expect(mobileArenaResultPresentation(completed({
      terminalReason: "model_unavailable",
      winner: null,
      winnerSeatId: null,
    }))).toMatchObject({
      kind: "ended",
      title: "Match ended.",
      ratingImpact: "ineligible",
      showConfetti: false,
    });
  });

  it("explains all three durable visibility states", () => {
    expect(resultVisibilityDescription("public")).toContain("Anyone");
    expect(resultVisibilityDescription("followers")).toContain("approved followers");
    expect(resultVisibilityDescription("only_me")).toContain("Only you");
  });
});
