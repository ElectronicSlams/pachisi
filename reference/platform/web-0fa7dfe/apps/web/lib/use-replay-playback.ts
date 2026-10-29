"use client";

import { useCallback, useEffect, useReducer } from "react";
import { REPLAY_AUTOPLAY_MS } from "@/lib/replay-view-state";

export type ReplayPlaybackSpeed = 0.5 | 1 | 2;

export type ReplayPlaybackState = {
  identity: string;
  manualPly: number | null;
  playIntent: boolean;
  speed: ReplayPlaybackSpeed;
};

export type ReplayPlaybackSnapshot = {
  isPlaying: boolean;
  speed: ReplayPlaybackSpeed;
  visiblePly: number;
};

type ReplayPlaybackAction =
  | { type: "reset"; identity: string; initialPly: number | null; autoPlay: boolean }
  | { type: "seek"; identity: string; ply: number }
  | { type: "play"; identity: string; ply: number }
  | { type: "pause"; identity: string }
  | { type: "advance"; identity: string; ply: number }
  | { type: "cycleSpeed"; identity: string };

type ReplayPlaybackOptions = {
  identity: string;
  hasTimeline: boolean;
  maxPly: number;
  defaultPly: number;
  initialPly?: number | null;
  autoPlay?: boolean;
  lockToMax?: boolean;
  keyboard?: boolean;
  intervalMs?: number;
};

function nextReplaySpeed(speed: ReplayPlaybackSpeed): ReplayPlaybackSpeed {
  return speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
}

export function createReplayPlaybackState(
  identity: string,
  initialPly: number | null = null,
  autoPlay = true,
): ReplayPlaybackState {
  return {
    identity,
    manualPly: initialPly,
    playIntent: autoPlay,
    speed: 1,
  };
}

export function replayPlaybackReducer(
  state: ReplayPlaybackState,
  action: ReplayPlaybackAction,
): ReplayPlaybackState {
  if (action.type === "reset") {
    return createReplayPlaybackState(action.identity, action.initialPly, action.autoPlay);
  }
  if (action.identity !== state.identity) {
    return state;
  }
  if (action.type === "seek") {
    return { ...state, manualPly: action.ply, playIntent: false };
  }
  if (action.type === "play") {
    return { ...state, manualPly: action.ply, playIntent: true };
  }
  if (action.type === "pause") {
    return { ...state, playIntent: false };
  }
  if (action.type === "advance") {
    return { ...state, manualPly: action.ply };
  }
  return { ...state, speed: nextReplaySpeed(state.speed) };
}

export function replayPlaybackSnapshot(
  state: ReplayPlaybackState,
  {
    identity,
    hasTimeline,
    maxPly,
    defaultPly,
    initialPly = null,
    autoPlay = true,
    lockToMax = false,
  }: Omit<ReplayPlaybackOptions, "keyboard" | "intervalMs">,
): ReplayPlaybackSnapshot {
  const current = state.identity === identity
    ? state
    : createReplayPlaybackState(identity, initialPly, autoPlay);
  const requestedPly = current.manualPly ?? defaultPly;
  const visiblePly = lockToMax
    ? maxPly
    : Math.max(0, Math.min(maxPly, requestedPly));
  return {
    visiblePly,
    speed: current.speed,
    isPlaying: hasTimeline && current.playIntent && !lockToMax && visiblePly < maxPly,
  };
}

export function replayPlaybackStartPly(visiblePly: number, maxPly: number): number {
  return visiblePly >= maxPly ? 0 : visiblePly;
}

export function useReplayPlayback({
  identity,
  hasTimeline,
  maxPly,
  defaultPly,
  initialPly = null,
  autoPlay = true,
  lockToMax = false,
  keyboard = true,
  intervalMs = REPLAY_AUTOPLAY_MS,
}: ReplayPlaybackOptions) {
  const [state, dispatch] = useReducer(
    replayPlaybackReducer,
    undefined,
    () => createReplayPlaybackState(identity, initialPly, autoPlay),
  );
  const snapshot = replayPlaybackSnapshot(state, {
    identity,
    hasTimeline,
    maxPly,
    defaultPly,
    initialPly,
    autoPlay,
    lockToMax,
  });
  const { isPlaying, speed, visiblePly } = snapshot;

  useEffect(() => {
    if (state.identity === identity) return;
    dispatch({ type: "reset", identity, initialPly, autoPlay });
  }, [autoPlay, identity, initialPly, state.identity]);

  useEffect(() => {
    if (!isPlaying || maxPly === 0) return;
    const timeout = window.setTimeout(() => {
      dispatch({
        type: "advance",
        identity,
        ply: Math.min(maxPly, visiblePly + 1),
      });
    }, intervalMs / speed);
    return () => window.clearTimeout(timeout);
  }, [identity, intervalMs, isPlaying, maxPly, speed, visiblePly]);

  const seek = useCallback((nextPly: number) => {
    dispatch({
      type: "seek",
      identity,
      ply: Math.max(0, Math.min(maxPly, nextPly)),
    });
  }, [identity, maxPly]);

  const pause = useCallback(() => {
    dispatch({ type: "pause", identity });
  }, [identity]);

  const play = useCallback(() => {
    dispatch({
      type: "play",
      identity,
      ply: replayPlaybackStartPly(visiblePly, maxPly),
    });
  }, [identity, maxPly, visiblePly]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const cycleSpeed = useCallback(() => {
    dispatch({ type: "cycleSpeed", identity });
  }, [identity]);

  useEffect(() => {
    if (!keyboard || !hasTimeline) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["SELECT", "INPUT", "TEXTAREA", "BUTTON", "A"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(visiblePly - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(visiblePly + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        seek(0);
      } else if (event.key === "End") {
        event.preventDefault();
        seek(maxPly);
      } else if (event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hasTimeline, keyboard, maxPly, seek, togglePlay, visiblePly]);

  return {
    ...snapshot,
    cycleSpeed,
    pause,
    play,
    seek,
    togglePlay,
  };
}
