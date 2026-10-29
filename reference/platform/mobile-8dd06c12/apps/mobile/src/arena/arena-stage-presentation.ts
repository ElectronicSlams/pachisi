import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

export type ArenaStagePresentation = Readonly<{
  statusCopy: string;
  showKeepWaitingOffer: boolean;
  showClaimTimeoutAward: boolean;
  terminal: boolean;
}>;

/** Uses only explicit server state. Elapsed client time never changes eligibility. */
export function arenaStagePresentation(
  session: PublicMobileArenaSession | null,
  dismissedKeepWaitingStatusAt: number | null,
): ArenaStagePresentation {
  if (!session) {
    return Object.freeze({
      statusCopy: "Loading match state…",
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: false,
      terminal: false,
    });
  }
  if (session.status === "completed") {
    return Object.freeze({
      statusCopy: terminalCopy(session.terminalReason),
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: false,
      terminal: true,
    });
  }
  const modelTurn = session.modelTurn;
  if (modelTurn?.status === "claim_eligible" && modelTurn.claimEligible) {
    return Object.freeze({
      statusCopy: "The model response timed out.",
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: true,
      terminal: false,
    });
  }
  if (modelTurn?.status === "keep_waiting_offer") {
    return Object.freeze({
      statusCopy: "Your opponent is still thinking.",
      showKeepWaitingOffer: modelTurn.statusAt !== dismissedKeepWaitingStatusAt,
      showClaimTimeoutAward: false,
      terminal: false,
    });
  }
  if (modelTurn?.status === "thinking") {
    return Object.freeze({
      statusCopy: "Opponent thinking…",
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: false,
      terminal: false,
    });
  }
  if (modelTurn?.status === "pending") {
    return Object.freeze({
      statusCopy: "Opponent turn",
      showKeepWaitingOffer: false,
      showClaimTimeoutAward: false,
      terminal: false,
    });
  }
  return Object.freeze({
    statusCopy: session.currentPlayer === "human" ? "Your move" : "Waiting for opponent",
    showKeepWaitingOffer: false,
    showClaimTimeoutAward: false,
    terminal: false,
  });
}

function terminalCopy(reason: PublicMobileArenaSession["terminalReason"]): string {
  switch (reason) {
    case "normal":
      return "Match complete";
    case "resignation":
      return "Match ended by resignation";
    case "model_timeout_award":
      return "Win awarded after model timeout";
    case "abandoned":
      return "Match ended";
    case "model_unavailable":
      return "Model unavailable";
    case null:
      return "Match complete";
  }
}
