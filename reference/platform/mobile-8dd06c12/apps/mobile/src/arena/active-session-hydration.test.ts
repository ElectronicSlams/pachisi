import {
  ACTIVE_SESSION_SNAPSHOT_SCHEMA,
  type ActiveSessionSnapshot,
} from "@eslams/core-types";

import {
  activeSessionClearSnapshot,
  activeSessionSnapshotFromPublicSession,
  hydrateActiveArenaSession,
  hydrateActiveArenaSessionIfAuthorityUnchanged,
  mobileArenaGameLabel,
} from "./active-session-hydration";
import type {
  ArenaActiveSessionSummary,
  MobileArenaGateway,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

describe("mobile Arena active-session hydration", () => {
  it("turns the public session allowlist into the shell now-playing snapshot", async () => {
    const activeSession = activeSummary({ updatedAt: 120 });
    const session = publicSession({ updatedAt: 140 });

    const result = await hydrateActiveArenaSession({
      runtimeSession: async () => ({ status: "ok", activeSession, session }),
    }, 4);

    expect(result).toEqual({
      status: "snapshot",
      snapshot: snapshot({
        revision: 140,
        activeSession: {
          sessionId: "session_1",
          matchId: null,
          gameSlug: "chess",
          gameLabel: "Chess",
          mode: "play",
          opponentLabel: "openai/gpt-5-mini",
          updatedAtMs: 140,
        },
      }),
    });
  });

  it("clears stale shell state when no active session remains or the session completed", async () => {
    await expect(hydrateActiveArenaSession({
      runtimeSession: async () => ({ status: "ok", activeSession: null, session: null }),
    }, 9, () => 50)).resolves.toEqual({
      status: "snapshot",
      snapshot: snapshot({ revision: 50, activeSession: null }),
    });

    await expect(hydrateActiveArenaSession({
      runtimeSession: async () => ({
        status: "ok",
        activeSession: activeSummary({ updatedAt: 70 }),
        session: publicSession({ status: "completed", terminalReason: "normal", updatedAt: 80 }),
      }),
    }, 50)).resolves.toEqual({
      status: "snapshot",
      snapshot: snapshot({ revision: 80, activeSession: null }),
    });
  });

  it("ignores unavailable or unrecognized session state instead of inventing shell state", async () => {
    await expect(hydrateActiveArenaSession({
      runtimeSession: async () => ({ status: "failed", reason: "network" }),
    }, 4)).resolves.toEqual({ status: "unchanged" });

    expect(activeSessionSnapshotFromPublicSession(
      publicSession({ gameSlug: "unknown-game" }),
      { sessionId: "session_1", updatedAt: 120 },
      4,
    )).toBeNull();
    expect(mobileArenaGameLabel("tic-tac-toe")).toBe("Tic-Tac-Toe");
    expect(activeSessionClearSnapshot(80, 70)).toEqual(snapshot({ revision: 81, activeSession: null }));
  });

  it("drops a null hydration response when local shell authority changed in flight", async () => {
    let resolveActive!: (result: Awaited<ReturnType<MobileArenaGateway["runtimeSession"]>>) => void;
    const active = new Promise<Awaited<ReturnType<MobileArenaGateway["runtimeSession"]>>>((resolve) => {
      resolveActive = resolve;
    });
    let currentAuthority = { revision: 4, sessionId: null as string | null };
    const hydration = hydrateActiveArenaSessionIfAuthorityUnchanged(
      {
        runtimeSession: () => active,
      },
      currentAuthority,
      () => currentAuthority,
      () => 1_000,
    );

    currentAuthority = { revision: 900, sessionId: "session_started_locally" };
    resolveActive({ status: "ok", activeSession: null, session: null });

    await expect(hydration).resolves.toEqual({ status: "unchanged" });
  });
});

function snapshot(overrides: Omit<ActiveSessionSnapshot, "schemaVersion">): ActiveSessionSnapshot {
  return Object.freeze({
    schemaVersion: ACTIVE_SESSION_SNAPSHOT_SCHEMA,
    ...overrides,
  });
}

function publicSession(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "chess",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 0,
    updatedAt: 120,
    ...overrides,
  });
}

function activeSummary(overrides: Partial<ArenaActiveSessionSummary> = {}): ArenaActiveSessionSummary {
  return Object.freeze({
    sessionId: "session_1",
    clientChannel: "mobile",
    status: "active",
    startedAt: 10,
    lastActionAt: 100,
    expiresAt: 10_100,
    updatedAt: 110,
    ...overrides,
  });
}
