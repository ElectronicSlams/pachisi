import { mobileArenaPreviewSequence } from "@eslams/board-skia";
import type { BoardScene } from "@eslams/game-render-contract";
import { useEffect, useMemo, useState } from "react";

const ARENA_PREVIEW_FRAME_INTERVAL_MS = 1_350;
type ArenaPreviewAnimation = Readonly<{
  frameIndex: number;
  gameSlug: string;
}>;

export function mobileArenaPreviewStartIndex(frameCount: number): number {
  if (frameCount <= 1) return 0;
  return Math.max(1, frameCount - 2);
}

export function mobileArenaPreviewNextIndex(
  frameIndex: number,
  frameCount: number,
): number {
  if (frameCount <= 1) return 0;
  const nextIndex = frameIndex + 1;
  return nextIndex >= frameCount ? 1 : nextIndex;
}

export function useMobileArenaPreviewScene(
  gameSlug: string,
  reducedMotion: boolean,
): BoardScene | null {
  const sequence = useMemo(() => mobileArenaPreviewSequence(gameSlug), [gameSlug]);
  const [animation, setAnimation] = useState<ArenaPreviewAnimation>(() => Object.freeze({
    frameIndex: mobileArenaPreviewStartIndex(sequence.length),
    gameSlug,
  }));

  useEffect(() => {
    if (reducedMotion || sequence.length < 2) return undefined;
    const interval = setInterval(() => {
      setAnimation((current) => Object.freeze({
        frameIndex: current.gameSlug === gameSlug
          ? mobileArenaPreviewNextIndex(current.frameIndex, sequence.length)
          : mobileArenaPreviewNextIndex(
            mobileArenaPreviewStartIndex(sequence.length),
            sequence.length,
          ),
        gameSlug,
      }));
    }, ARENA_PREVIEW_FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [gameSlug, reducedMotion, sequence]);

  if (sequence.length < 1) return null;
  const frameIndex = animation.gameSlug === gameSlug
    ? animation.frameIndex
    : mobileArenaPreviewStartIndex(sequence.length);
  return reducedMotion
    ? sequence.at(-1)!
    : sequence[frameIndex % sequence.length]!;
}
