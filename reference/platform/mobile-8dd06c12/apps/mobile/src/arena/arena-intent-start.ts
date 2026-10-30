import {
  pendingIdentityIntentsEqual,
  type PendingIdentityIntent,
  type PendingIdentityIntentRecord,
} from "@/auth/pending-identity-intent";
import {
  matchesPinnedArenaIntent,
  type PinnedArenaIntent,
} from "@/arena/arena-human-match-start";

import type {
  ArenaActiveSessionSummary,
  ArenaStartResult,
  MobileArenaGateway,
} from "./mobile-arena-gateway";

type ArenaIntent = Extract<PendingIdentityIntent, { kind: "start-arena-match" }>;

export type ArenaIntentRepositoryPort = Readonly<{
  clearIf(recordId: string): void;
  peek(): PendingIdentityIntentRecord | null;
}>;

export type ArenaIntentClaimResult = ArenaStartResult | Readonly<{ status: "invalid_handoff" }>;

type StartGatewayPort = Pick<MobileArenaGateway, "replace" | "start">;

/**
 * Owns the final exact-record claim. A retry for the same durable intent reuses
 * its UUIDv4, while a replacement intent can neither start nor be cleared.
 */
export class ArenaIntentStartCoordinator {
  private attempt: Readonly<{
    recordId: string;
    intent: ArenaIntent;
    idempotencyKey: string;
  }> | null = null;
  private pending: Readonly<{
    recordId: string;
    result: Promise<ArenaIntentClaimResult>;
  }> | null = null;
  constructor(
    private readonly repository: ArenaIntentRepositoryPort,
    private readonly gateway: StartGatewayPort,
  ) {}

  claim(pin: PinnedArenaIntent): Promise<ArenaIntentClaimResult> {
    if (this.pending?.recordId === pin.recordId) return this.pending.result;
    if (!matchesPinnedArenaIntent(this.repository.peek(), pin)) {
      return Promise.resolve(Object.freeze({ status: "invalid_handoff" }));
    }
    const attempt = this.attemptFor(pin);
    const result = this.claimOnce(pin, attempt).finally(() => {
      if (this.pending?.result === result) this.pending = null;
    });
    this.pending = Object.freeze({ recordId: pin.recordId, result });
    return result;
  }

  resumeCurrent(pin: PinnedArenaIntent, conflict: ArenaActiveSessionSummary): string | null {
    if (!matchesPinnedArenaIntent(this.repository.peek(), pin)) return null;
    this.repository.clearIf(pin.recordId);
    this.attempt = null;
    return conflict.sessionId;
  }

  replaceCurrent(
    pin: PinnedArenaIntent,
    conflict: ArenaActiveSessionSummary,
  ): Promise<ArenaIntentClaimResult> {
    if (this.pending?.recordId === pin.recordId) return this.pending.result;
    if (!matchesPinnedArenaIntent(this.repository.peek(), pin)) {
      return Promise.resolve(Object.freeze({ status: "invalid_handoff" }));
    }
    const attempt = this.attemptFor(pin);
    const result = this.claimOnce(pin, attempt, conflict.sessionId).finally(() => {
      if (this.pending?.result === result) this.pending = null;
    });
    this.pending = Object.freeze({ recordId: pin.recordId, result });
    return result;
  }

  private attemptFor(pin: PinnedArenaIntent): NonNullable<ArenaIntentStartCoordinator["attempt"]> {
    if (!this.attempt || this.attempt.recordId !== pin.recordId
      || !pendingIdentityIntentsEqual(this.attempt.intent, pin.intent)) {
      this.attempt = Object.freeze({
        recordId: pin.recordId,
        intent: pin.intent,
        // Pending identity records are UUIDv4-authoritative. Reusing the
        // durable record ID survives process death after an ambiguous start.
        idempotencyKey: pin.recordId,
      });
    }
    return this.attempt;
  }

  private async claimOnce(
    pin: PinnedArenaIntent,
    attempt: NonNullable<ArenaIntentStartCoordinator["attempt"]>,
    replacementSessionId?: string,
  ): Promise<ArenaIntentClaimResult> {
    if (!matchesPinnedArenaIntent(this.repository.peek(), pin)
      || attempt.recordId !== pin.recordId
      || !pendingIdentityIntentsEqual(attempt.intent, pin.intent)) {
      return Object.freeze({ status: "invalid_handoff" });
    }
    const result = replacementSessionId
      ? await this.gateway.replace(replacementSessionId, attempt.intent, attempt.idempotencyKey)
      : await this.gateway.start(attempt.intent, attempt.idempotencyKey);
    if (result.status === "started") {
      this.repository.clearIf(pin.recordId);
      if (this.attempt === attempt) this.attempt = null;
    }
    return result;
  }
}
