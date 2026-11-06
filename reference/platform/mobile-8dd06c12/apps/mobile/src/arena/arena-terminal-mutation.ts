import type {
  ArenaGatewayFailure,
  ArenaMutationResult,
  MobileArenaGateway,
} from "./mobile-arena-gateway";

export type ArenaTerminalMutationAction = "claim" | "end" | "resign";

type ArenaTerminalGateway = Pick<
  MobileArenaGateway,
  "claimTimeoutAward" | "createIdempotencyKey" | "end" | "resign"
>;

type ArenaTerminalAttempt = Readonly<{
  action: ArenaTerminalMutationAction;
  idempotencyKey: string;
  operation: Promise<ArenaMutationResult> | null;
  sessionId: string;
}>;

/**
 * Retains one exact terminal command identity across ambiguous transport or
 * response failures. Concurrent taps share the same in-flight operation.
 */
export class ArenaTerminalMutationCoordinator {
  private attempt: ArenaTerminalAttempt | null = null;

  constructor(private readonly gateway: ArenaTerminalGateway) {}

  run(sessionId: string, action: ArenaTerminalMutationAction): Promise<ArenaMutationResult> {
    if (this.attempt?.sessionId !== sessionId || this.attempt.action !== action) {
      this.attempt = Object.freeze({
        action,
        idempotencyKey: this.gateway.createIdempotencyKey(),
        operation: null,
        sessionId,
      });
    }
    if (this.attempt.operation) return this.attempt.operation;

    const attempt = this.attempt;
    const request = Promise.resolve().then(() => this.invoke(attempt));
    const operation = request.then(
      (result) => {
        if (this.attempt?.operation !== operation) return result;
        const normalized = result.status === "ok" && !terminalResultConfirms(attempt, result)
          ? Object.freeze({ status: "failed", reason: "invalid_response" } as const)
          : result;
        this.attempt = normalized.status === "ok" || definitiveFailure(normalized)
          ? null
          : Object.freeze({ ...attempt, operation: null });
        return normalized;
      },
      (error: unknown) => {
        if (this.attempt?.operation === operation) {
          this.attempt = Object.freeze({ ...attempt, operation: null });
        }
        throw error;
      },
    );
    this.attempt = Object.freeze({ ...attempt, operation });
    return operation;
  }

  private invoke(attempt: ArenaTerminalAttempt): Promise<ArenaMutationResult> {
    switch (attempt.action) {
      case "end":
        return this.gateway.end(attempt.sessionId, attempt.idempotencyKey);
      case "resign":
        return this.gateway.resign(attempt.sessionId, attempt.idempotencyKey);
      case "claim":
        return this.gateway.claimTimeoutAward(attempt.sessionId, attempt.idempotencyKey);
    }
  }
}

function terminalResultConfirms(
  attempt: ArenaTerminalAttempt,
  result: Extract<ArenaMutationResult, { status: "ok" }>,
): boolean {
  if (result.session.sessionId !== attempt.sessionId || result.session.status !== "completed") {
    return false;
  }
  switch (attempt.action) {
    case "end":
      return result.session.terminalReason === "abandoned";
    case "resign":
      return result.session.terminalReason === "resignation";
    case "claim":
      return result.session.terminalReason === "model_timeout_award";
  }
}

function definitiveFailure(result: ArenaGatewayFailure): boolean {
  return result.reason === "rejected"
    || result.reason === "insecure_transport"
    || result.reason === "session_not_ready";
}
