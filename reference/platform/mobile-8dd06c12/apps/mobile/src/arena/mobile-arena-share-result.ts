import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import type { MobileAnalyticsEventMap } from "@/observability/mobile-analytics-contract";
import { mobileAnalyticsRuntime } from "@/observability/mobile-analytics-runtime";

export type MobileArenaShareResult = "failed" | "shared" | "unavailable";

export type MobileArenaShareDependencies = Readonly<{
  capture(target: RefObject<View | null>): Promise<string>;
  isAvailable(): Promise<boolean>;
  share(uri: string): Promise<void>;
  track(params: MobileAnalyticsEventMap["share_created"]): Promise<void>;
}>;

const nativeShareDependencies: MobileArenaShareDependencies = Object.freeze({
  capture: (target) => captureRef(target, {
    format: "png",
    quality: 1,
    result: "tmpfile",
  }),
  isAvailable: () => Sharing.isAvailableAsync(),
  share: (uri) => Sharing.shareAsync(uri, {
    dialogTitle: "Share eSlams result",
    mimeType: "image/png",
    UTI: "public.png",
  }),
  track: (params) => mobileAnalyticsRuntime.track("share_created", params),
});

export async function shareMobileArenaResultImage(
  target: RefObject<View | null>,
  analytics: MobileAnalyticsEventMap["share_created"],
  dependencies: MobileArenaShareDependencies = nativeShareDependencies,
): Promise<MobileArenaShareResult> {
  try {
    if (!await dependencies.isAvailable()) return "unavailable";
    const uri = await dependencies.capture(target);
    await dependencies.share(uri);
    await dependencies.track(analytics);
    return "shared";
  } catch {
    return "failed";
  }
}
