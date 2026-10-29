import type { ResultFeedback } from "@/feedback";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

export class StageResultFeedbackTransition {
  private previous: Readonly<{
    sessionId: string;
    status: PublicMobileArenaSession["status"];
    terminalIdentity: string | null;
  }> | null = null;

  observe(session: PublicMobileArenaSession | null): ResultFeedback | null {
    if (!session) return null;
    const terminalIdentity = session.status === "completed"
      ? `${session.terminalReason}:${session.winner ?? "none"}:${session.winnerSeatId ?? "none"}:${session.moveNumber}`
      : null;
    const current = Object.freeze({ sessionId: session.sessionId, status: session.status, terminalIdentity });
    const previous = this.previous;
    this.previous = current;
    if (!previous
      || previous.sessionId !== session.sessionId
      || previous.status !== "active"
      || session.status !== "completed"
      || session.terminalReason !== "normal") return null;
    if (session.winner === "human") return "win";
    if (session.winner === "model") return "loss";
    if (session.winner === "draw") return "draw";
    return null;
  }
}
