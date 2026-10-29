import {
  formatStageClock,
  mobileArenaPublicExplanation,
  mobileArenaStageFrame,
  serverDeliberationElapsedMs,
} from "./mobile-arena-stage-presentation";
import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

describe("mobile Arena Stage presentation", () => {
  it("frames solo Blackjack and keeps its exact product label", () => {
    const frame = mobileArenaStageFrame({
      ...session(),
      gameSlug: "blackjack",
      seats: [
        { seatId: "player_1", participantType: "human", modelId: null, label: "You", displayOrder: 0, teamId: null },
        { seatId: "player_2", participantType: "model", modelId: "openai/gpt-5-mini", label: "Dealer", displayOrder: 1, teamId: null },
      ],
      activeSeatId: "player_1",
    });

    expect(frame.layout).toBe("solo_panel");
    expect(frame.matchupLabel).toBe("YOU vs THE DEALER");
    expect(frame.seats[0]).toMatchObject({ active: true, human: true, name: "You" });
    expect(frame.moveLabel).toBe("move 4");
  });

  it("uses only bounded public explanations and server-derived clock authority", () => {
    expect(mobileArenaPublicExplanation({
      id: "event_1",
      seq: 1,
      createdAt: 100,
      event: Object.freeze({ public_explanation: " Controls the centre. ", actor_seat_id: "player_2" }),
    })).toEqual({ actorSeatId: "player_2", text: "Controls the centre." });
    const current = {
      ...session(),
      currentPlayer: "model" as const,
      modelTurn: {
        status: "thinking" as const,
        startedAt: 1_000,
        thinkingAt: 1_000,
        keepWaitingOfferAt: 31_000,
        claimEligibleAt: 121_000,
        statusAt: 1_000,
        serverNow: 3_500,
        claimEligible: false,
        lateResponseFenced: false,
        timeoutEvidenceAt: null,
      },
    };
    expect(serverDeliberationElapsedMs(current, 10_000, 12_250)).toBe(4_750);
    expect(formatStageClock(64_050)).toBe("1:04");
  });
});

function session(): PublicMobileArenaSession {
  return {
    sessionId: "session_stage",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 4,
    updatedAt: 120,
  };
}
