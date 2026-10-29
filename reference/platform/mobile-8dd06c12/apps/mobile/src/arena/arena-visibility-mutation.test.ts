import type { MatchVisibility } from "@eslams/core-types";

import { ArenaVisibilityMutationCoordinator } from "./arena-visibility-mutation";
import type { ArenaMutationResult, PublicMobileArenaSession } from "./mobile-arena-gateway";

const SESSION = Object.freeze({
  sessionId: "session-result",
  status: "completed",
  matchVisibility: "followers",
} as PublicMobileArenaSession);

function gateway(results: ArenaMutationResult[]) {
  const visibility = jest.fn(async (
    _sessionId: string,
    _visibility: MatchVisibility,
    _idempotencyKey: string,
  ) => results.shift() ?? Object.freeze({ status: "ok", session: SESSION } as const));
  return {
    createIdempotencyKey: jest.fn(() => "11111111-1111-4111-8111-111111111111"),
    visibility,
  };
}

describe("ArenaVisibilityMutationCoordinator", () => {
  it("shares one in-flight command and accepts only the requested visibility", async () => {
    const dependency = gateway([Object.freeze({ status: "ok", session: SESSION })]);
    const coordinator = new ArenaVisibilityMutationCoordinator(dependency);
    const first = coordinator.run("session-result", "followers");
    const second = coordinator.run("session-result", "followers");
    await expect(first).resolves.toMatchObject({ status: "ok" });
    await expect(second).resolves.toMatchObject({ status: "ok" });
    expect(dependency.visibility).toHaveBeenCalledTimes(1);
  });

  it("retains the UUID after an ambiguous failure", async () => {
    const dependency = gateway([
      Object.freeze({ status: "failed", reason: "network" }),
      Object.freeze({ status: "ok", session: SESSION }),
    ]);
    const coordinator = new ArenaVisibilityMutationCoordinator(dependency);
    await expect(coordinator.run("session-result", "followers")).resolves.toMatchObject({ status: "failed" });
    await expect(coordinator.run("session-result", "followers")).resolves.toMatchObject({ status: "ok" });
    expect(dependency.createIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(dependency.visibility.mock.calls[0]?.[2]).toBe(dependency.visibility.mock.calls[1]?.[2]);
  });

  it("rejects a nominal success for the wrong audience", async () => {
    const dependency = gateway([Object.freeze({
      status: "ok",
      session: Object.freeze({ ...SESSION, matchVisibility: "public" }) as PublicMobileArenaSession,
    })]);
    const coordinator = new ArenaVisibilityMutationCoordinator(dependency);
    await expect(coordinator.run("session-result", "followers")).resolves.toEqual({
      status: "failed",
      reason: "invalid_response",
    });
  });
});
