import { ArenaActionMutationCoordinator } from "./arena-action-mutation";
import type {
  ArenaMutationResult,
  MobileArenaGateway,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

const uuid1 = "ac710000-0000-4000-8000-000000000001";
const uuid2 = "ac710000-0000-4000-8000-000000000002";

type Gateway = Pick<MobileArenaGateway, "action" | "createIdempotencyKey">;
type ActionMock = jest.Mock<Promise<ArenaMutationResult>, [string, string, number, string]>;

describe("Arena ordinary action mutation coordinator", () => {
  it("single-flights an exact move identity and rotates after confirmed progress", async () => {
    const deferred = deferredMutation();
    const gateway = gatewayWith(actionMock(() => deferred.promise));
    const coordinator = new ArenaActionMutationCoordinator(gateway);

    const first = coordinator.run("session_1", "e2e4", 4);
    const second = coordinator.run("session_1", "e2e4", 4);

    expect(second).toBe(first);
    await Promise.resolve();
    expect(gateway.action).toHaveBeenCalledWith("session_1", "e2e4", 4, uuid1);
    deferred.resolve(okMutation(5));
    await expect(first).resolves.toMatchObject({ status: "ok" });

    await coordinator.run("session_1", "e2e4", 5);
    expect(gateway.action).toHaveBeenLastCalledWith("session_1", "e2e4", 5, uuid2);
  });

  it.each(["network", "invalid_response"] as const)(
    "reuses the exact UUID after an ambiguous %s failure",
    async (reason) => {
      const action = actionMock(() => Promise.resolve(okMutation(3)))
        .mockResolvedValueOnce(Object.freeze({ status: "failed", reason }))
        .mockResolvedValueOnce(okMutation(3));
      const gateway = gatewayWith(action);
      const coordinator = new ArenaActionMutationCoordinator(gateway);

      await coordinator.run("session_1", "2", 2);
      await coordinator.run("session_1", "2", 2);

      expect(gateway.createIdempotencyKey).toHaveBeenCalledTimes(1);
      expect(gateway.action).toHaveBeenNthCalledWith(1, "session_1", "2", 2, uuid1);
      expect(gateway.action).toHaveBeenNthCalledWith(2, "session_1", "2", 2, uuid1);
    },
  );

  it.each(["network", "invalid_response"] as const)(
    "accepts an authoritative refresh after an ambiguous %s response and rotates the UUID",
    async (reason) => {
      const action = actionMock(() => Promise.resolve(Object.freeze({ status: "failed", reason })));
      const gateway = gatewayWith(action);
      const coordinator = new ArenaActionMutationCoordinator(gateway);

      await coordinator.run("session_1", "2", 2);

      expect(coordinator.confirmAuthoritativeProgress({
        sessionId: "session_1",
        moveNumber: 2,
      })).toBe(false);
      expect(coordinator.confirmAuthoritativeProgress({
        sessionId: "session_2",
        moveNumber: 3,
      })).toBe(false);
      expect(coordinator.confirmAuthoritativeProgress({
        sessionId: "session_1",
        moveNumber: 3,
      })).toBe(true);

      await coordinator.run("session_1", "4", 3);
      expect(gateway.createIdempotencyKey).toHaveBeenCalledTimes(2);
      expect(gateway.action).toHaveBeenLastCalledWith("session_1", "4", 3, uuid2);
    },
  );

  it("requires a refresh and clears action identity after stale authority", async () => {
    const action = actionMock(() => Promise.resolve(okMutation(4)))
      .mockResolvedValueOnce(Object.freeze({
        status: "failed",
        reason: "rejected",
        code: "arena_stale_session_state",
      }))
      .mockResolvedValueOnce(okMutation(4));
    const gateway = gatewayWith(action);
    const coordinator = new ArenaActionMutationCoordinator(gateway);

    await expect(coordinator.run("session_1", "3", 3)).resolves.toEqual({
      status: "refresh_required",
      reason: "stale_session_state",
    });
    await coordinator.run("session_1", "3", 3);

    expect(gateway.action).toHaveBeenNthCalledWith(1, "session_1", "3", 3, uuid1);
    expect(gateway.action).toHaveBeenNthCalledWith(2, "session_1", "3", 3, uuid2);
  });

  it("retains identity when nominal success does not prove authoritative progress", async () => {
    const action = actionMock(() => Promise.resolve(okMutation(8)))
      .mockResolvedValueOnce(okMutation(7))
      .mockResolvedValueOnce(okMutation(8));
    const gateway = gatewayWith(action);
    const coordinator = new ArenaActionMutationCoordinator(gateway);

    await expect(coordinator.run("session_1", "move", 7)).resolves.toEqual({
      status: "failed",
      reason: "invalid_response",
    });
    await expect(coordinator.run("session_1", "move", 7)).resolves.toMatchObject({ status: "ok" });

    expect(gateway.action).toHaveBeenNthCalledWith(1, "session_1", "move", 7, uuid1);
    expect(gateway.action).toHaveBeenNthCalledWith(2, "session_1", "move", 7, uuid1);
  });

  it("changes identity when the token, move number, or session changes", async () => {
    const gateway = gatewayWith(actionMock(() => Promise.resolve(Object.freeze({ status: "failed", reason: "network" }))));
    const coordinator = new ArenaActionMutationCoordinator(gateway);

    await coordinator.run("session_1", "a", 1);
    await coordinator.run("session_1", "b", 1);
    await coordinator.run("session_1", "b", 2);
    await coordinator.run("session_2", "b", 2);

    expect(gateway.createIdempotencyKey).toHaveBeenCalledTimes(4);
  });
});

function gatewayWith(
  action: ActionMock,
): Gateway {
  const keys = [uuid1, uuid2, uuid1, uuid2];
  return {
    action,
    createIdempotencyKey: jest.fn(() => {
      const key = keys.shift();
      if (!key) throw new Error("test UUIDs exhausted");
      return key;
    }),
  };
}

function actionMock(
  handler: (sessionId: string, token: string, moveNumber: number, key: string) => Promise<ArenaMutationResult>,
): ActionMock {
  return jest.fn((sessionId, token, moveNumber, key) => handler(sessionId, token, moveNumber, key));
}

function okMutation(moveNumber: number): ArenaMutationResult {
  return Object.freeze({ status: "ok", session: session(moveNumber) });
}

function session(moveNumber: number): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "tic-tac-toe",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "model",
    turnPhase: "model_thinking",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber,
    updatedAt: 120 + moveNumber,
  });
}

function deferredMutation(): Readonly<{
  promise: Promise<ArenaMutationResult>;
  resolve(result: ArenaMutationResult): void;
}> {
  let settle!: (result: ArenaMutationResult) => void;
  const promise = new Promise<ArenaMutationResult>((resolve) => { settle = resolve; });
  return Object.freeze({ promise, resolve: settle });
}
