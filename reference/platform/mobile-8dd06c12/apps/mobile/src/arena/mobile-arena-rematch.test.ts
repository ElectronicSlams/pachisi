import type { PreparedMatch } from "@/data/anonymous-state";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { mobileArenaRematchSetup } from "./mobile-arena-rematch";

const prepared = Object.freeze({
  setupVersion: 2,
  gameSlug: "tic-tac-toe",
  humanSeatId: "player_1",
  seats: Object.freeze([
    Object.freeze({ seatId: "player_1", participant: Object.freeze({ kind: "human" as const }) }),
    Object.freeze({
      seatId: "player_2",
      participant: Object.freeze({
        kind: "model" as const,
        modelEntryId: "openai/gpt-5-mini",
        modelEntryVersionId: "model-openai-gpt-5-mini-v2",
        providerVersionString: "gpt-5-mini-2026-07-01",
      }),
    }),
  ]),
  updatedAt: 100,
  visibility: "only_me",
}) satisfies PreparedMatch;

describe("mobileArenaRematchSetup", () => {
  it("reuses the exact locally locked versions when every public identity matches", () => {
    expect(mobileArenaRematchSetup(session(), prepared)).toEqual({
      setupVersion: 2,
      gameSlug: "tic-tac-toe",
      seats: prepared.seats,
      side: "first",
      visibility: "followers",
    });
  });

  it("fails closed for a missing setup, changed model, seat, or game", () => {
    expect(mobileArenaRematchSetup(session(), null)).toBeNull();
    expect(mobileArenaRematchSetup(session({
      seats: Object.freeze([
        session().seats?.[0]!,
        Object.freeze({ ...session().seats?.[1]!, modelId: "anthropic/claude-sonnet-4" }),
      ]),
    }), prepared)).toBeNull();
    expect(mobileArenaRematchSetup(session({ humanPlayerId: "player_2" }), prepared)).toBeNull();
    expect(mobileArenaRematchSetup(session({ gameSlug: "connect-four" }), prepared)).toBeNull();
  });
});

function session(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session-rematch",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "completed",
    currentPlayer: "model",
    turnPhase: "completed",
    terminalReason: "normal",
    lastAcceptedHumanActionAt: 10,
    inactivityExpiresAt: 20,
    modelTurn: null,
    moveNumber: 5,
    updatedAt: 20,
    mode: "head_to_head",
    humanPlayerId: "player_1",
    matchVisibility: "followers",
    seats: Object.freeze([
      Object.freeze({
        seatId: "player_1",
        participantType: "human" as const,
        modelId: null,
        label: "You",
        displayOrder: 0,
        teamId: null,
      }),
      Object.freeze({
        seatId: "player_2",
        participantType: "model" as const,
        modelId: "openai/gpt-5-mini",
        label: "GPT-5 mini",
        displayOrder: 1,
        teamId: null,
      }),
    ]),
    winner: "human",
    winnerSeatId: "player_1",
    ...overrides,
  });
}
