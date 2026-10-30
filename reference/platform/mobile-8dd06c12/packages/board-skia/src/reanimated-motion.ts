import type { SharedValue } from "react-native-reanimated";
import { clampUnit } from "./motion";
import type { MotionBeat, MotionState, QualityTier } from "./types";

export type RendererMotionSharedValues = Readonly<{
  progress: SharedValue<number>;
  beat: SharedValue<MotionBeat>;
  reducedMotion: SharedValue<boolean>;
  qualityTier: SharedValue<QualityTier>;
  lastActionTargetId: SharedValue<string | null>;
  activeNodeId: SharedValue<string | null>;
}>;

/** Reads one internally consistent renderer motion snapshot on the UI thread. */
export function readRendererMotionState(
  values: RendererMotionSharedValues,
  viewport: MotionState["viewport"],
): MotionState {
  "worklet";
  return {
    progress: values.reducedMotion.value ? 1 : clampUnit(values.progress.value),
    beat: values.beat.value,
    reducedMotion: values.reducedMotion.value,
    qualityTier: values.qualityTier.value,
    viewport,
    lastActionTargetId: values.lastActionTargetId.value,
    activeNodeId: values.activeNodeId.value,
  };
}
