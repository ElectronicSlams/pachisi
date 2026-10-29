import { useEffect, useState } from "react";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { formatStageClock, serverDeliberationElapsedMs } from "./mobile-arena-stage-presentation";

/** Presentation-only ticking over a server-authored clock baseline. */
export function useStageDeliberationClock(
  session: PublicMobileArenaSession | null,
  enabled: boolean,
): string {
  const active = enabled
    && session?.status === "active"
    && session.currentPlayer === "model"
    && session.modelTurn !== null;
  const serverNow = active ? session.modelTurn?.serverNow ?? null : null;
  const startedAt = active ? session.modelTurn?.startedAt ?? null : null;
  const [sample, setSample] = useState<Readonly<{
    now: number;
    receivedAt: number;
    serverNow: number | null;
    startedAt: number | null;
  }>>({ now: 0, receivedAt: 0, serverNow: null, startedAt: null });

  useEffect(() => {
    if (serverNow === null || startedAt === null) return;
    const reset = setTimeout(() => {
      const sampledAt = Date.now();
      setSample({ now: sampledAt, receivedAt: sampledAt, serverNow, startedAt });
    }, 0);
    const timer = setInterval(() => {
      setSample((current) => current.serverNow === serverNow && current.startedAt === startedAt
        ? { ...current, now: Date.now() }
        : current);
    }, 250);
    return () => {
      clearTimeout(reset);
      clearInterval(timer);
    };
  }, [serverNow, startedAt]);

  const current = sample.serverNow === serverNow && sample.startedAt === startedAt
    ? sample
    : { now: 0, receivedAt: 0 };
  return formatStageClock(serverDeliberationElapsedMs(session, current.receivedAt, current.now));
}
