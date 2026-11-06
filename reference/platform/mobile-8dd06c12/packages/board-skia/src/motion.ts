import type { MotionState, QualityTier } from "./types";

export type QualityProfile = Readonly<{
  shaderDetail: number;
  trails: boolean;
  bloom: boolean;
  previewAnimation: boolean;
}>;

const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({ shaderDetail: 1, trails: true, bloom: true, previewAnimation: true }),
  balanced: Object.freeze({ shaderDetail: 0.58, trails: false, bloom: true, previewAnimation: true }),
  constrained: Object.freeze({ shaderDetail: 0.18, trails: false, bloom: false, previewAnimation: false }),
} as const satisfies Record<QualityTier, QualityProfile>);

export function clampUnit(value: number): number {
  "worklet";
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function resolvedMotionProgress(motion: MotionState): number {
  "worklet";
  return motion.reducedMotion ? 1 : clampUnit(motion.progress);
}

export function qualityProfile(motion: MotionState): QualityProfile {
  "worklet";
  const base = QUALITY_PROFILES[motion.qualityTier];
  if (!motion.reducedMotion) return base;
  return {
    shaderDetail: base.shaderDetail,
    trails: false,
    bloom: base.bloom,
    previewAnimation: false,
  };
}

/** One critically controlled overshoot, used only for the Connect Four drop. */
export function controlledDropBounce(progress: number, reducedMotion: boolean): number {
  "worklet";
  if (reducedMotion) return 1;
  const t = clampUnit(progress);
  if (t <= 0.82) {
    const fall = t / 0.82;
    return 1.055 * fall * fall;
  }
  const settle = (t - 0.82) / 0.18;
  return 1.055 - 0.055 * (1 - Math.cos(Math.PI * settle)) / 2;
}

export function settleProgress(progress: number, reducedMotion: boolean): number {
  "worklet";
  if (reducedMotion) return 1;
  const t = clampUnit(progress);
  return 1 - Math.pow(1 - t, 3);
}

export function waveProgress(progress: number, ordinal: number, count: number, reducedMotion: boolean): number {
  "worklet";
  if (reducedMotion) return 1;
  const safeCount = Math.max(1, count);
  const delay = ordinal / safeCount * 0.36;
  return clampUnit((clampUnit(progress) - delay) / (1 - delay));
}
