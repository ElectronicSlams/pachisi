import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import type { ArenaPublicEvent } from "@/connectivity/arena-live-client";
import { replayPlayerLanguageAction } from "@/battlefield/mobile-battlefield-replay-timeline";

const MAX_DEDUPE_EVENTS = 32;

/** Builds public, player-language live announcements from accepted wire events. */
export class MobileLiveMoveAnnouncementTransition {
  private readonly observed = new Map<string, true>();

  observe(
    session: PublicMobileArenaSession,
    event: ArenaPublicEvent | null,
  ): string | null {
    if (!event || session.status !== "active" || !session.participantBySeat) return null;
    const identity = `${session.sessionId}:${event.id}:${event.seq}`;
    if (this.observed.has(identity)) return null;

    const actorSeatId = safeString(event.event.actor_seat_id, 128);
    const action = safeString(event.event.action, 160);
    const turn = safeTurn(event.event.turn_id);
    const actor = actorSeatId ? session.participantBySeat[actorSeatId] : undefined;
    if (!actor || !action || turn === null || !safeAction(action)) return null;

    this.observed.set(identity, true);
    if (this.observed.size > MAX_DEDUPE_EVENTS) {
      const oldest = this.observed.keys().next().value as string | undefined;
      if (oldest) this.observed.delete(oldest);
    }
    return `Turn ${turn} — ${actor.label} ${replayPlayerLanguageAction(session.gameSlug, action)}`;
  }
}
function safeString(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum
    ? value
    : null;
}

function safeTurn(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
}

function safeAction(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9:=|/_+., -]*$/u.test(value);
}
