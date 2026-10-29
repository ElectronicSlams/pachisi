import type { ArenaModelTurn, PublicMobileArenaSession } from "./mobile-arena-gateway";
import { MobileArenaAnalyticsTransition } from "./mobile-arena-analytics-transition";

describe("MobileArenaAnalyticsTransition", () => {
  it("records an authoritative active start once across repeated snapshot objects", () => {
    const transition = new MobileArenaAnalyticsTransition();
    const active = session();

    expect(transition.observe(active)).toEqual([{ name: "match_started", params: {
      game: "tic-tac-toe",
      opponentFamily: "unknown",
      outcome: "pending",
      moves: 0,
      channel: "mobile",
      eligibility: "pending",
    } }]);
    expect(transition.observe({ ...active })).toEqual([]);
    expect(transition.observe({ ...active, updatedAt: active.updatedAt + 1 })).toEqual([]);
    expect(JSON.stringify(transition.observe({ ...active }))).not.toContain(active.sessionId);
  });

  it("uses server timestamps for first move and claim offer, with polling dedupe", () => {
    const transition = new MobileArenaAnalyticsTransition();
    transition.observe(session());
    const eligible = session({
      lastAcceptedHumanActionAt: CREATED_AT + 1_250,
      modelTurn: modelTurn(),
      moveNumber: 1,
      updatedAt: CREATED_AT + 120_000,
    });

    expect(transition.observe(eligible)).toEqual([
      { name: "time_to_first_move", params: { game: "tic-tac-toe", ms: 1_250 } },
      { name: "claim_win_offered", params: { game: "tic-tac-toe", waitMs: 120_000 } },
    ]);
    expect(transition.observe({ ...eligible, updatedAt: eligible.updatedAt + 1 })).toEqual([]);

    expect(transition.observe(session({
      lastAcceptedHumanActionAt: eligible.lastAcceptedHumanActionAt,
      modelTurn: modelTurn({
        startedAt: CREATED_AT + 200_000,
        thinkingAt: CREATED_AT + 210_000,
        keepWaitingOfferAt: CREATED_AT + 230_000,
        claimEligibleAt: CREATED_AT + 320_000,
        statusAt: CREATED_AT + 320_000,
        serverNow: CREATED_AT + 320_000,
        timeoutEvidenceAt: CREATED_AT + 320_000,
      }),
      moveNumber: 3,
      updatedAt: CREATED_AT + 320_000,
    }))).toEqual([
      { name: "claim_win_offered", params: { game: "tic-tac-toe", waitMs: 120_000 } },
    ]);
  });

  it("does not infer a first move without an advancing server action timestamp", () => {
    const transition = new MobileArenaAnalyticsTransition();
    transition.observe(session());
    const { createdAt: _createdAt, ...withoutCreatedAt } = session({
      lastAcceptedHumanActionAt: CREATED_AT + 1_000,
    });

    expect(transition.observe(withoutCreatedAt)).toEqual([]);
    expect(transition.observe(session({ lastAcceptedHumanActionAt: CREATED_AT }))).toEqual([]);
  });

  it("does not mislabel a later action when an in-progress session is first observed", () => {
    const transition = new MobileArenaAnalyticsTransition();
    const resumed = session({
      lastAcceptedHumanActionAt: CREATED_AT + 9_000,
      moveNumber: 5,
      updatedAt: CREATED_AT + 9_000,
    });
    expect(transition.observe(resumed)).toEqual([{
      name: "match_started",
      params: {
        game: "tic-tac-toe",
        opponentFamily: "unknown",
        outcome: "pending",
        moves: 5,
        channel: "mobile",
        eligibility: "pending",
      },
    }]);
    expect(transition.observe({
      ...resumed,
      lastAcceptedHumanActionAt: CREATED_AT + 12_000,
      moveNumber: 7,
    })).toEqual([]);
  });

  it.each([
    ["model_timeout_award", "human", "timeout_award"],
    ["normal", "human", "win"],
    ["normal", "model", "loss"],
    ["normal", "draw", "draw"],
    ["model_unavailable", null, "ended"],
  ] as const)("maps %s/%s completion to %s exactly once", (terminalReason, winner, outcome) => {
    const transition = new MobileArenaAnalyticsTransition();
    const completed = session({
      status: "completed",
      turnPhase: "completed",
      terminalReason,
      winner,
      moveNumber: 10_000_000,
      updatedAt: CREATED_AT + 10_000,
    });

    expect(transition.observe(completed)).toEqual([{ name: "match_completed", params: {
      game: "tic-tac-toe",
      opponentFamily: "unknown",
      outcome,
      moves: 4_096,
      channel: "mobile",
      eligibility: "unknown",
    } }]);
    expect(transition.observe({ ...completed, resultRevision: 2 })).toEqual([]);
  });

  it("records only a confirmed timeout-award claim and bounds its server duration", () => {
    const transition = new MobileArenaAnalyticsTransition();
    const source = session({ modelTurn: modelTurn(), currentPlayer: "model", turnPhase: "model_thinking" });
    transition.observe(source);
    const awarded = session({
      status: "completed",
      turnPhase: "completed",
      terminalReason: "model_timeout_award",
      winner: "human",
      modelTurn: null,
      updatedAt: CREATED_AT + 100_000_000,
    });

    expect(transition.observeClaimResult(source, awarded)).toEqual({
      name: "claim_win_claimed",
      params: { game: "tic-tac-toe", waitMs: 86_400_000 },
    });
    expect(transition.observeClaimResult(source, awarded)).toBeNull();
    expect(new MobileArenaAnalyticsTransition().observeClaimResult(
      source,
      { ...awarded, terminalReason: "normal" },
    )).toBeNull();
    expect(new MobileArenaAnalyticsTransition().observeClaimResult(
      { ...source, modelTurn: null },
      awarded,
    )).toBeNull();
  });

  it("drops sessions whose game is not in the trusted mobile catalog", () => {
    const transition = new MobileArenaAnalyticsTransition();
    expect(transition.observe(session({ gameSlug: "unknown-game" }))).toEqual([]);
  });
});

const CREATED_AT = 1_800_000_000_000;

function modelTurn(overrides: Partial<ArenaModelTurn> = {}): ArenaModelTurn {
  return Object.freeze({
    status: "claim_eligible",
    startedAt: CREATED_AT,
    thinkingAt: CREATED_AT + 10_000,
    keepWaitingOfferAt: CREATED_AT + 30_000,
    claimEligibleAt: CREATED_AT + 120_000,
    statusAt: CREATED_AT + 120_000,
    serverNow: CREATED_AT + 120_000,
    claimEligible: true,
    lateResponseFenced: true,
    timeoutEvidenceAt: CREATED_AT + 120_000,
    ...overrides,
  });
}

function session(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "arena_session_analytics",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: CREATED_AT,
    inactivityExpiresAt: CREATED_AT + 604_800_000,
    modelTurn: null,
    moveNumber: 0,
    updatedAt: CREATED_AT,
    createdAt: CREATED_AT,
    winner: null,
    winnerSeatId: null,
    ...overrides,
  });
}
