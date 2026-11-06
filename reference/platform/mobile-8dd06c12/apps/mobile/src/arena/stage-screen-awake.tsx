import { useKeepAwake } from "expo-keep-awake";

export const MOBILE_ARENA_STAGE_AWAKE_TAG = "eslams-stage-play";

/** Mounted only for the foreground play Stage; unmounting releases the native wake lock. */
export function StageScreenAwake() {
  useKeepAwake(MOBILE_ARENA_STAGE_AWAKE_TAG, { suppressDeactivateWarnings: true });
  return null;
}
