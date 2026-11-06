import type { FeedbackPreferences } from "@/startup/contracts";

import { dispatchFeedback, type FeedbackEvent, type FeedbackResult } from "./feedback-contract";
import { mobileFeedbackDriver, playSelectionHaptic } from "./feedback-runtime";

export type { FeedbackEvent, FeedbackResult, ResultFeedback, SoundCueId } from "./feedback-contract";

export function playFeedback(
  event: FeedbackEvent,
  preferences: FeedbackPreferences,
): Promise<FeedbackResult> {
  return dispatchFeedback(event, preferences, mobileFeedbackDriver);
}

export async function playReplayDetent(hapticsEnabled: boolean): Promise<"disabled" | "failed" | "played"> {
  if (!hapticsEnabled) return "disabled";
  try {
    await playSelectionHaptic();
    return "played";
  } catch {
    return "failed";
  }
}
