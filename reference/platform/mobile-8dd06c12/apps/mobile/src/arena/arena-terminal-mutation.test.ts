import {
  ArenaTerminalMutationCoordinator,
  type ArenaTerminalMutationAction,
} from "./arena-terminal-mutation";
import type {
  ArenaGatewayFailure,
  ArenaMutationResult,
  MobileArenaGateway,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

const uuid1 = "a11ce000-0000-4000-8000-000000000001";
const uuid2 = "a11ce000-0000-4000-8000-000000000002";

type Gateway = Pick<
  MobileArenaGateway,
  "claimTimeoutAward" | "createIdempotencyKey" | "end" | "resign"
>;
type TerminalMock = jest.Mock<Promise<ArenaMutationResult>, [string, string]>;
type TerminalOverrides = Partial<Record<ArenaTerminalMutationAction, TerminalMock>>;

describe("Arena terminal mutation coordinator", () => {
  it("single-flights double taps and gives a later completed command a new UUID", async () => {
    const deferred = deferredMutation();
    const gateway = gatewayWith({ end: terminalMock(() => deferred.promise) });
    const coordinator = new ArenaTerminalMutationCoordinator(gateway);

    const first = coordinator.run("session_1", "end");
    const second = coordinator.run("session_1", "end");

    expect(second).toBe(first);
    await Promise.resolve();
    expect(gateway.end).toHaveBeenCalledTimes(1);
    expect(gateway.end).toHaveBeenCalledWith("session_1", uuid1);
    deferred.resolve({ status: "ok", session: terminalSession("abandoned") });
    await expect(first).resolves.toMatchObject({ status: "ok" });

    await coordinator.run("session_1", "end");
    expect(gateway.end).toHaveBeenLastCalledWith("session_1", uuid2);
  });

  it.each(["network", "invalid_response"] as const)(
    "reuses the exact UUID after an ambiguous %s failure",
    async (reason) => {
      const resign = terminalMock(() => okMutation("resignation"));
      resign
        .mockResolvedValueOnce(failureMutation(reason))
        .mockResolvedValueOnce(okMutation("resignation"));
      const gateway = gatewayWith({
        resign,
      });
      const coordinator = new ArenaTerminalMutationCoordinator(gateway);

      await expect(coordinator.run("session_1", "resign")).resolves.toEqual({
        status: "failed",
        reason,
      });
      await expect(coordinator.run("session_1", "resign")).resolves.toMatchObject({ status: "ok" });

      expect(gateway.createIdempotencyKey).toHaveBeenCalledTimes(1);
      expect(gateway.resign).toHaveBeenNthCalledWith(1, "session_1", uuid1);
      expect(gateway.resign).toHaveBeenNthCalledWith(2, "session_1", uuid1);
    },
  );

  it("clears identity on definitive rejection or an explicit session/action change", async () => {
    const gateway = gatewayWith({
      claim: terminalMock(() => failureMutation("network")),
      end: terminalMock(() => failureMutation("rejected", "arena_already_terminal")),
      resign: terminalMock(() => failureMutation("network")),
    });
    const coordinator = new ArenaTerminalMutationCoordinator(gateway);

    await coordinator.run("session_1", "end");
    await coordinator.run("session_1", "end");
    expect(gateway.end).toHaveBeenNthCalledWith(1, "session_1", uuid1);
    expect(gateway.end).toHaveBeenNthCalledWith(2, "session_1", uuid2);

    await coordinator.run("session_1", "resign");
    await coordinator.run("session_1", "claim");
    expect(gateway.resign).toHaveBeenCalledWith("session_1", uuid1);
    expect(gateway.claimTimeoutAward).toHaveBeenCalledWith("session_1", uuid2);
  });

  it("retains identity when a nominal success does not prove the requested terminal reason", async () => {
    const end = terminalMock(() => okMutation("abandoned"));
    end
      .mockResolvedValueOnce(okMutation("resignation"))
      .mockResolvedValueOnce(okMutation("abandoned"));
    const gateway = gatewayWith({ end });
    const coordinator = new ArenaTerminalMutationCoordinator(gateway);

    await expect(coordinator.run("session_1", "end")).resolves.toEqual({
      status: "failed",
      reason: "invalid_response",
    });
    await expect(coordinator.run("session_1", "end")).resolves.toMatchObject({ status: "ok" });

    expect(gateway.end).toHaveBeenNthCalledWith(1, "session_1", uuid1);
    expect(gateway.end).toHaveBeenNthCalledWith(2, "session_1", uuid1);
  });
});

function gatewayWith(overrides: TerminalOverrides): Gateway {
  const keys = [uuid1, uuid2, uuid1, uuid2];
  return {
    claimTimeoutAward: overrides.claim ?? terminalMock(() => okMutation("model_timeout_award")),
    createIdempotencyKey: jest.fn(() => {
      const key = keys.shift();
      if (!key) throw new Error("test UUIDs exhausted");
      return key;
    }),
    end: overrides.end ?? terminalMock(() => okMutation("abandoned")),
    resign: overrides.resign ?? terminalMock(() => okMutation("resignation")),
  };
}

function terminalMock(
  handler: (sessionId: string, idempotencyKey: string) => ArenaMutationResult | Promise<ArenaMutationResult>,
): TerminalMock {
  return jest.fn((sessionId, idempotencyKey) => Promise.resolve(handler(sessionId, idempotencyKey)));
}

function deferredMutation(): Readonly<{
  promise: Promise<ArenaMutationResult>;
  resolve(result: ArenaMutationResult): void;
}> {
  let settle!: (result: ArenaMutationResult) => void;
  const promise = new Promise<ArenaMutationResult>((resolve) => { settle = resolve; });
  return Object.freeze({ promise, resolve: settle });
}

function terminalSession(
  terminalReason: PublicMobileArenaSession["terminalReason"] = "normal",
): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "chess",
    modelId: "openai/gpt-5-mini",
    status: "completed",
    currentPlayer: "human",
    turnPhase: "completed",
    terminalReason,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 4,
    updatedAt: 120,
  });
}

function okMutation(
  terminalReason: PublicMobileArenaSession["terminalReason"] = "normal",
): ArenaMutationResult {
  return Object.freeze({ status: "ok", session: terminalSession(terminalReason) });
}

function failureMutation(
  reason: ArenaGatewayFailure["reason"],
  code?: string,
): ArenaMutationResult {
  return code
    ? Object.freeze({ status: "failed", reason, code })
    : Object.freeze({ status: "failed", reason });
}
