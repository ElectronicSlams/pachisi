import { AppState } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { mobileArenaGateway } from "./mobile-arena-gateway-runtime";
import type { ArenaSessionSnapshot } from "./mobile-arena-gateway";
import { authoritativeMobileArenaSession } from "./mobile-arena-session-authority";

const ACTIVE_POLL_INTERVAL_MS = 2_500;

export type MobileArenaSessionState = Readonly<{
  session: ArenaSessionSnapshot | null;
  status: "idle" | "loading" | "ready" | "unavailable";
  accept(session: ArenaSessionSnapshot): void;
  refresh(): Promise<ArenaSessionSnapshot | null>;
}>;

export function useMobileArenaSession(
  sessionId: string,
  enabled: boolean,
  initialSession: ArenaSessionSnapshot | null = null,
  periodicRefresh = true,
): MobileArenaSessionState {
  const validInitialSession = initialSession?.sessionId === sessionId ? initialSession : null;
  const [remoteState, setRemoteState] = useState<Readonly<{
    sessionId: string;
    session: ArenaSessionSnapshot | null;
    status: "loading" | "ready" | "unavailable";
  }>>({
    sessionId,
    session: validInitialSession,
    status: validInitialSession ? "ready" : "loading",
  });
  const generation = useRef(0);
  const pending = useRef<Readonly<{
    key: string;
    operation: Promise<ArenaSessionSnapshot | null>;
  }> | null>(null);

  const stateForSession = remoteState.sessionId === sessionId ? remoteState : null;
  const session = stateForSession?.session ?? validInitialSession;
  const status: MobileArenaSessionState["status"] = !enabled
    ? "idle"
    : stateForSession?.status ?? (validInitialSession ? "ready" : "loading");

  // React Doctor false positive: this callback is an effect dependency and
  // must also remain stable in non-React-Compiler runtimes such as Jest.
  // react-doctor-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const refresh = useCallback((): Promise<ArenaSessionSnapshot | null> => {
    if (!enabled) return Promise.resolve(null);
    const currentGeneration = generation.current;
    const key = `${sessionId}:${currentGeneration}`;
    if (pending.current?.key === key) return pending.current.operation;
    const operation = mobileArenaGateway.session(sessionId).then((result) => {
      if (generation.current !== currentGeneration) {
        return result.status === "ok" ? result.session : null;
      }
      if (result.status === "ok") {
        setRemoteState((existing) => ({
          sessionId,
          session: authoritativeMobileArenaSession(
            existing.sessionId === sessionId ? existing.session : null,
            result.session,
          ),
          status: "ready",
        }));
        return result.session;
      } else {
        setRemoteState((existing) => existing.sessionId === sessionId
          ? { ...existing, status: "unavailable" }
          : { sessionId, session: null, status: "unavailable" });
        return null;
      }
    }).finally(() => {
      if (pending.current?.operation === operation) pending.current = null;
    });
    pending.current = Object.freeze({ key, operation });
    return operation;
  }, [enabled, sessionId]);

  const accept = useCallback((next: ArenaSessionSnapshot) => {
    if (next.sessionId !== sessionId) return;
    generation.current += 1;
    setRemoteState((existing) => ({
      sessionId,
      session: authoritativeMobileArenaSession(
        existing.sessionId === sessionId ? existing.session : null,
        next,
      ),
      status: "ready",
    }));
  }, [sessionId]);

  // React Doctor false positive: the returned cleanup owns both the interval and AppState subscription.
  // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
  useEffect(() => {
    generation.current += 1;
    if (!enabled) return;
    void refresh();
    const timer = periodicRefresh
      ? setInterval(() => { void refresh(); }, ACTIVE_POLL_INTERVAL_MS)
      : null;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void refresh();
    });
    return () => {
      generation.current += 1;
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [enabled, periodicRefresh, refresh]);

  return { session, status, accept, refresh };
}
