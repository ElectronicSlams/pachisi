import type { MatchVisibility } from "@eslams/core-types";

import type {
  ArenaGatewayFailure,
  ArenaMutationResult,
  MobileArenaGateway,
} from "./mobile-arena-gateway";

type ArenaVisibilityGateway = Pick<MobileArenaGateway, "createIdempotencyKey" | "visibility">;

type ArenaVisibilityAttempt = Readonly<{
  idempotencyKey: string;
  operation: Promise<ArenaMutationResult> | null;
  sessionId: string;
  visibility: MatchVisibility;
}>;

/** Keeps one exact visibility command identity across ambiguous transport outcomes. */
export class ArenaVisibilityMutationCoordinator {
  private attempt: ArenaVisibilityAttempt | null = null;

  constructor(private readonly gateway: ArenaVisibilityGateway) {}

  run(sessionId: string, visibility: MatchVisibility): Promise<ArenaMutationResult> {
    if (this.attempt?.sessionId !== sessionId || this.attempt.visibility !== visibility) {
      this.attempt = Object.freeze({
        idempotencyKey: this.gateway.createIdempotencyKey(),
        operation: null,
        sessionId,
        visibility,
      });
    }
    if (this.attempt.operation) return this.attempt.operation;

    const attempt = this.attempt;
    const request = Promise.resolve().then(() => this.gateway.visibility(
      attempt.sessionId,
      attempt.visibility,
      attempt.idempotencyKey,
    ));
    const operation = request.then(
      (result) => {
        if (this.attempt?.operation !== operation) return result;
        const normalized = result.status === "ok" && !visibilityResultConfirms(attempt, result)
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
}

function visibilityResultConfirms(
  attempt: ArenaVisibilityAttempt,
  result: Extract<ArenaMutationResult, { status: "ok" }>,
): boolean {
  return result.session.sessionId === attempt.sessionId
    && result.session.status === "completed"
    && result.session.matchVisibility === attempt.visibility;
}

function definitiveFailure(result: ArenaGatewayFailure): boolean {
  return result.reason === "rejected"
    || result.reason === "insecure_transport"
    || result.reason === "session_not_ready";
}
