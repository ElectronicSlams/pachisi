import {
  ACTIVE_SESSION_SNAPSHOT_SCHEMA,
  GAME_CATALOG,
  type ActiveSessionSnapshot,
} from "@eslams/core-types";

import type {
  ArenaActiveSessionSummary,
  MobileArenaGateway,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

export type ActiveArenaHydrationResult =
  | Readonly<{ status: "snapshot"; snapshot: ActiveSessionSnapshot }>
  | Readonly<{ status: "unchanged" }>;

export type ActiveArenaShellAuthority = Readonly<{
  revision: number;
  sessionId: string | null;
}>;

/**
 * Applies a network hydration result only when the shell authority observed at
 * request launch is still current at settlement. This prevents an older
 * `activeSession: null` read from clearing a match started while it was in flight.
 */
export async function hydrateActiveArenaSessionIfAuthorityUnchanged(
  gateway: Pick<MobileArenaGateway, "runtimeSession">,
  startingAuthority: ActiveArenaShellAuthority,
  currentAuthority: () => ActiveArenaShellAuthority,
  now: () => number = Date.now,
): Promise<ActiveArenaHydrationResult> {
  const result = await hydrateActiveArenaSession(
    gateway,
    startingAuthority.revision,
    now,
  );
  const current = currentAuthority();
  return current.revision === startingAuthority.revision
    && current.sessionId === startingAuthority.sessionId
    ? result
    : Object.freeze({ status: "unchanged" });
}

export async function hydrateActiveArenaSession(
  gateway: Pick<MobileArenaGateway, "runtimeSession">,
  currentRevision: number,
  now: () => number = Date.now,
): Promise<ActiveArenaHydrationResult> {
  const runtime = await gateway.runtimeSession();
  if (runtime.status === "failed") return Object.freeze({ status: "unchanged" });
  if (runtime.activeSession === null) {
    return Object.freeze({
      status: "snapshot",
      snapshot: activeSessionClearSnapshot(currentRevision, now()),
    });
  }
  if (runtime.session === null) return Object.freeze({ status: "unchanged" });
  if (runtime.session.status === "completed") {
    return Object.freeze({
      status: "snapshot",
      snapshot: activeSessionClearSnapshot(
        currentRevision,
        Math.max(runtime.activeSession.updatedAt, runtime.session.updatedAt),
      ),
    });
  }
  const snapshot = activeSessionSnapshotFromPublicSession(
    runtime.session,
    runtime.activeSession,
    currentRevision,
  );
  return snapshot
    ? Object.freeze({ status: "snapshot", snapshot })
    : Object.freeze({ status: "unchanged" });
}

export function activeSessionSnapshotFromPublicSession(
  session: PublicMobileArenaSession,
  active: Pick<ArenaActiveSessionSummary, "sessionId" | "updatedAt">,
  currentRevision: number,
): ActiveSessionSnapshot | null {
  if (session.status !== "active" || session.sessionId !== active.sessionId) return null;
  const game = GAME_CATALOG.find((entry) => entry.slug === session.gameSlug);
  if (!game) return null;
  const updatedAtMs = Math.max(active.updatedAt, session.updatedAt);
  const revision = nextRevision(currentRevision, updatedAtMs);
  if (revision === null) return null;
  return Object.freeze({
    schemaVersion: ACTIVE_SESSION_SNAPSHOT_SCHEMA,
    revision,
    activeSession: Object.freeze({
      sessionId: session.sessionId,
      matchId: null,
      gameSlug: session.gameSlug,
      gameLabel: game.name,
      mode: "play",
      opponentLabel: session.modelId,
      updatedAtMs,
    }),
  });
}

export function activeSessionClearSnapshot(
  currentRevision: number,
  candidateRevision: number,
): ActiveSessionSnapshot {
  const revision = nextRevision(currentRevision, candidateRevision);
  if (revision === null) {
    throw new Error("Active-session revision authority is unavailable.");
  }
  return Object.freeze({
    schemaVersion: ACTIVE_SESSION_SNAPSHOT_SCHEMA,
    revision,
    activeSession: null,
  });
}

export function mobileArenaGameLabel(gameSlug: string): string | null {
  return GAME_CATALOG.find((entry) => entry.slug === gameSlug)?.name ?? null;
}

function nextRevision(current: number, candidate: number): number | null {
  if (!Number.isSafeInteger(current) || current < -1
    || !Number.isSafeInteger(candidate) || candidate < 0) return null;
  const minimum = current + 1;
  if (!Number.isSafeInteger(minimum)) return null;
  return Math.max(minimum, candidate);
}
