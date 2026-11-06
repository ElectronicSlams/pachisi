import type {
  ArenaGatewayFailure,
  ArenaMutationResult,
  MobileArenaGateway,
} from "./mobile-arena-gateway";

type ArenaActionGateway = Pick<MobileArenaGateway, "action" | "createIdempotencyKey">;

type ArenaActionAttempt = Readonly<{
  actionToken: string;
  expectedMoveNumber: number;
  idempotencyKey: string;
  operation: Promise<ArenaActionCoordinatorResult> | null;
  sessionId: string;
}>;

export type ArenaActionCoordinatorResult =
  | ArenaMutationResult
  | Readonly<{ status: "refresh_required"; reason: "stale_session_state" }>;

/**
 * Owns the identity of one ordinary Arena action. Ambiguous failures retain the
 * exact UUID, while stale authority explicitly forces a refresh instead of a
 * blind replay against a newer move.
 */
export class ArenaActionMutationCoordinator {
  private attempt: ArenaActionAttempt | null = null;

  constructor(private readonly gateway: ArenaActionGateway) {}

  /**
   * Resolves an ambiguous transport result from a later authoritative read.
   * The retained UUID is cleared only when the exact session has advanced
   * beyond the move revision that the command was issued against.
   */
  confirmAuthoritativeProgress(session: Readonly<{
    sessionId: string;
    moveNumber: number;
  }>): boolean {
    const attempt = this.attempt;
    if (!attempt
      || session.sessionId !== attempt.sessionId
      || session.moveNumber <= attempt.expectedMoveNumber) return false;
    this.attempt = null;
    return true;
  }

  run(
    sessionId: string,
    actionToken: string,
    expectedMoveNumber: number,
  ): Promise<ArenaActionCoordinatorResult> {
    if (!sameActionIdentity(this.attempt, sessionId, actionToken, expectedMoveNumber)) {
      this.attempt = Object.freeze({
        actionToken,
        expectedMoveNumber,
        idempotencyKey: this.gateway.createIdempotencyKey(),
        operation: null,
        sessionId,
      });
    }
    if (this.attempt.operation) return this.attempt.operation;

    const attempt = this.attempt;
    const request = Promise.resolve().then(() => this.gateway.action(
      attempt.sessionId,
      attempt.actionToken,
      attempt.expectedMoveNumber,
      attempt.idempotencyKey,
    ));
    const operation = request.then(
      (result): ArenaActionCoordinatorResult => {
        if (this.attempt?.operation !== operation) return result;
        if (isStaleFailure(result)) {
          this.attempt = null;
          return Object.freeze({ status: "refresh_required", reason: "stale_session_state" });
        }
        const normalized = result.status === "ok" && !actionResultConfirms(attempt, result)
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

function sameActionIdentity(
  attempt: ArenaActionAttempt | null,
  sessionId: string,
  actionToken: string,
  expectedMoveNumber: number,
): attempt is ArenaActionAttempt {
  return attempt?.sessionId === sessionId
    && attempt.actionToken === actionToken
    && attempt.expectedMoveNumber === expectedMoveNumber;
}

function actionResultConfirms(
  attempt: ArenaActionAttempt,
  result: Extract<ArenaMutationResult, { status: "ok" }>,
): boolean {
  return result.session.sessionId === attempt.sessionId
    && result.session.moveNumber > attempt.expectedMoveNumber;
}

function isStaleFailure(result: ArenaMutationResult): result is ArenaGatewayFailure {
  return result.status === "failed"
    && result.reason === "rejected"
    && result.code === "arena_stale_session_state";
}

function definitiveFailure(result: ArenaGatewayFailure): boolean {
  return result.reason === "rejected"
    || result.reason === "insecure_transport"
    || result.reason === "session_not_ready";
}
