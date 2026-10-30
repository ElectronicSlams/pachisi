import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

const modelTurnStatusRank: Readonly<Record<
  NonNullable<PublicMobileArenaSession["modelTurn"]>["status"],
  number
>> = Object.freeze({
  pending: 0,
  thinking: 1,
  keep_waiting_offer: 2,
  claim_eligible: 3,
});

/**
 * Chooses the session snapshot that is safe to render after concurrent reads,
 * mutations, foreground refreshes, and terminal responses settle out of order.
 */
export function authoritativeMobileArenaSession<Session extends PublicMobileArenaSession>(
  current: Session | null,
  incoming: Session,
): Session {
  if (!current || current.sessionId !== incoming.sessionId) return incoming;
  if (current.status === "completed" && incoming.status === "completed") {
    if (terminalIdentityConflicts(current, incoming)) return current;
    const currentResultRevision = current.resultRevision ?? 0;
    const incomingResultRevision = incoming.resultRevision ?? 0;
    if (incomingResultRevision !== currentResultRevision) {
      return incomingResultRevision > currentResultRevision ? incoming : current;
    }
    if (incoming.updatedAt !== current.updatedAt) {
      return incoming.updatedAt > current.updatedAt ? incoming : current;
    }
    return incoming.matchVisibility === current.matchVisibility ? incoming : current;
  }
  if (current.status === "completed") return current;
  if (incoming.status === "completed") return incoming;
  if (incoming.moveNumber !== current.moveNumber) {
    return incoming.moveNumber > current.moveNumber ? incoming : current;
  }
  if (modelTurnAuthorityRegresses(current.modelTurn, incoming.modelTurn)) return current;
  if (incoming.updatedAt !== current.updatedAt) {
    return incoming.updatedAt > current.updatedAt ? incoming : current;
  }
  return incoming;
}

function terminalIdentityConflicts(
  current: PublicMobileArenaSession,
  incoming: PublicMobileArenaSession,
): boolean {
  return current.terminalReason !== incoming.terminalReason
    || current.moveNumber !== incoming.moveNumber
    || current.winner !== incoming.winner
    || current.winnerSeatId !== incoming.winnerSeatId
    || current.stateHash !== incoming.stateHash;
}

function modelTurnAuthorityRegresses(
  current: PublicMobileArenaSession["modelTurn"],
  incoming: PublicMobileArenaSession["modelTurn"],
): boolean {
  if (!current) return false;
  if (!incoming) return true;
  if (incoming.startedAt !== current.startedAt) return incoming.startedAt < current.startedAt;
  if (incoming.statusAt !== current.statusAt) return incoming.statusAt < current.statusAt;
  return modelTurnStatusRank[incoming.status] < modelTurnStatusRank[current.status];
}
