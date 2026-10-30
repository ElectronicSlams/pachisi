import type { ArenaPublicEvent } from "@/connectivity/arena-live-client";
import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { MobileLiveMoveAnnouncementTransition } from "./mobile-live-move-announcement";

describe("mobile live move announcement", () => {
  it("announces accepted moves in player language once", () => {
    const transition = new MobileLiveMoveAnnouncementTransition();
    expect(transition.observe(session(), event({ action: "3", actor_seat_id: "model", turn_id: 14 })))
      .toBe("Turn 14 — Claude drops column d");
    expect(transition.observe(session(), event({ action: "3", actor_seat_id: "model", turn_id: 14 })))
      .toBeNull();
  });

  it("drops events without authoritative turn/actor/action and never uses reasoning", () => {
    const transition = new MobileLiveMoveAnnouncementTransition();
    expect(transition.observe(session(), event({
      actor_seat_id: "model",
      public_explanation: "private-looking prose must not become the move",
      turn_id: 14,
    }))).toBeNull();
    expect(transition.observe(session(), event({ action: "3", actor_seat_id: "unknown", turn_id: 14 })))
      .toBeNull();
    expect(transition.observe(session(), event({ action: "3", actor_seat_id: "model", turn_id: "14" })))
      .toBeNull();
  });
});

function event(payload: Readonly<Record<string, unknown>>): ArenaPublicEvent {
  return Object.freeze({
    id: "event_14",
    seq: 14,
    createdAt: 1_800_000_000_000,
    event: Object.freeze({ event_type: "move_applied", ...payload }),
  });
}

function session(): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_accessibility",
    gameSlug: "connect-four",
    modelId: "anthropic/claude",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 1,
    inactivityExpiresAt: 2,
    modelTurn: null,
    moveNumber: 14,
    updatedAt: 1,
    stageProjectionVersion: 1,
    mode: "head_to_head",
    seats: Object.freeze([
      { seatId: "human", label: "You", participantType: "human", modelId: null, displayOrder: 0, teamId: null },
      { seatId: "model", label: "Claude", participantType: "model", modelId: "anthropic/claude", displayOrder: 1, teamId: null },
    ] as const),
    participantBySeat: Object.freeze({
      human: { seatId: "human", label: "You", participantType: "human" as const, modelId: null, displayOrder: 0, teamId: null },
      model: { seatId: "model", label: "Claude", participantType: "model" as const, modelId: "anthropic/claude", displayOrder: 1, teamId: null },
    }),
  });
}
