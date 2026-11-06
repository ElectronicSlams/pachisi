import type { GameRendererFamily } from "@eslams/core-types";

import type { FeedbackPreferences } from "@/startup/contracts";

export type ResultFeedback = "draw" | "loss" | "win";
export type FeedbackEvent =
  | Readonly<{ kind: "piece-arrival" }>
  | Readonly<{ family: GameRendererFamily; kind: "move" }>
  | Readonly<{ kind: "result"; result: ResultFeedback }>;

export type SoundCueId =
  | "piece_arrival"
  | "result_chord"
  | `move_${GameRendererFamily}`;

export type FeedbackChannelResult = "disabled" | "failed" | "played";
export type FeedbackResult = Readonly<{
  haptic: FeedbackChannelResult;
  sound: FeedbackChannelResult;
}>;

export type FeedbackDriver = Readonly<{
  playHaptic(event: FeedbackEvent): Promise<void>;
  playSound(cue: SoundCueId): Promise<void>;
}>;

export function soundCueForEvent(event: FeedbackEvent): SoundCueId {
  if (event.kind === "piece-arrival") return "piece_arrival";
  if (event.kind === "result") return "result_chord";
  return `move_${event.family}`;
}

export async function dispatchFeedback(
  event: FeedbackEvent,
  preferences: FeedbackPreferences,
  driver: FeedbackDriver,
): Promise<FeedbackResult> {
  const [sound, haptic] = await Promise.all([
    runChannel(preferences.soundEnabled, () => driver.playSound(soundCueForEvent(event))),
    runChannel(preferences.hapticsEnabled, () => driver.playHaptic(event)),
  ]);
  return Object.freeze({ sound, haptic });
}

async function runChannel(enabled: boolean, operation: () => Promise<void>): Promise<FeedbackChannelResult> {
  if (!enabled) return "disabled";
  try {
    await operation();
    return "played";
  } catch {
    return "failed";
  }
}
