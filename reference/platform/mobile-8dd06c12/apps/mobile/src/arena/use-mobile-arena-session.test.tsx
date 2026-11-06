import { act, renderHook } from "@testing-library/react-native";

import type { ArenaSessionResult, PublicMobileArenaSession } from "./mobile-arena-gateway";
import { useMobileArenaSession } from "./use-mobile-arena-session";

const mockSessionRead = jest.fn<Promise<ArenaSessionResult>, [sessionId: string]>();

jest.mock("./mobile-arena-gateway-runtime", () => ({
  mobileArenaGateway: {
    session: (sessionId: string) => mockSessionRead(sessionId),
  },
}));

describe("useMobileArenaSession", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSessionRead.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("invalidates an in-flight read when a mutation response is accepted", async () => {
    const deferred = deferredResult();
    mockSessionRead.mockReturnValueOnce(deferred.promise);
    const accepted = session({
      moveNumber: 4,
      status: "completed",
      terminalReason: "resignation",
      turnPhase: "completed",
      updatedAt: 300,
    });
    const stale = session({ moveNumber: 3, updatedAt: 200 });
    const hook = await renderHook(() => useMobileArenaSession("session_1", true));

    expect(mockSessionRead).toHaveBeenCalledWith("session_1");
    await act(() => hook.result.current.accept(accepted));
    expect(hook.result.current).toMatchObject({ session: accepted, status: "ready" });

    await act(async () => {
      deferred.resolve({ status: "ok", session: stale });
      await deferred.promise;
    });
    expect(hook.result.current).toMatchObject({ session: accepted, status: "ready" });

    mockSessionRead.mockResolvedValueOnce({ status: "ok", session: stale });
    let refreshed: PublicMobileArenaSession | null = null;
    await act(async () => {
      refreshed = await hook.result.current.refresh() as PublicMobileArenaSession | null;
    });
    expect(refreshed).toBe(stale);
    expect(hook.result.current).toMatchObject({ session: accepted, status: "ready" });
    await hook.unmount();
  });

  it("does not let an invalidated failed read make accepted state unavailable", async () => {
    const deferred = deferredResult();
    mockSessionRead.mockReturnValueOnce(deferred.promise);
    const accepted = session({ moveNumber: 4, updatedAt: 300 });
    const hook = await renderHook(() => useMobileArenaSession("session_1", true));

    await act(() => hook.result.current.accept(accepted));
    await act(async () => {
      deferred.resolve({ status: "failed", reason: "network" });
      await deferred.promise;
    });

    expect(hook.result.current).toMatchObject({ session: accepted, status: "ready" });
    await hook.unmount();
  });

  it("ignores accepted snapshots for a different exact session", async () => {
    mockSessionRead.mockResolvedValueOnce({
      status: "failed",
      reason: "network",
    });
    const hook = await renderHook(() => useMobileArenaSession("session_1", true));
    const crossSession = session({ sessionId: "session_2", moveNumber: 99, updatedAt: 999 });

    await act(() => hook.result.current.accept(crossSession));
    await act(async () => Promise.resolve());

    expect(hook.result.current.session).toBeNull();
    expect(hook.result.current.status).toBe("unavailable");
    await hook.unmount();
  });
});

function deferredResult(): Readonly<{
  promise: Promise<ArenaSessionResult>;
  resolve(result: ArenaSessionResult): void;
}> {
  let settle: ((result: ArenaSessionResult) => void) | null = null;
  const promise = new Promise<ArenaSessionResult>((resolve) => {
    settle = resolve;
  });
  return Object.freeze({
    promise,
    resolve(result: ArenaSessionResult): void {
      if (!settle) throw new Error("Deferred Arena read is unavailable.");
      settle(result);
    },
  });
}

function session(overrides: Partial<PublicMobileArenaSession>): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "connect-four",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 100 + (7 * 24 * 60 * 60 * 1_000),
    modelTurn: null,
    moveNumber: 3,
    updatedAt: 200,
    ...overrides,
  });
}
