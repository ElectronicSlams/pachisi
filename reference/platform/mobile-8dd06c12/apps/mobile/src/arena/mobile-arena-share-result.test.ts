import { createRef } from "react";
import type { View } from "react-native";

import {
  shareMobileArenaResultImage,
  type MobileArenaShareDependencies,
} from "./mobile-arena-share-result";

function harness(available = true) {
  const calls: string[] = [];
  const dependencies: MobileArenaShareDependencies = {
    capture: async () => { calls.push("capture"); return "file:///tmp/result.png"; },
    isAvailable: async () => { calls.push("available"); return available; },
    share: async () => { calls.push("share"); },
    track: async (params) => { calls.push(`track:${JSON.stringify(params)}`); },
  };
  return { calls, dependencies };
}

const analytics = Object.freeze({
  outcome: "win" as const,
  theme: "classic-dark" as const,
  visibility: "only_me" as const,
  surface: "arena_result" as const,
});

describe("mobile Arena result sharing", () => {
  it("tracks creation only after capture and native sharing succeed", async () => {
    const { calls, dependencies } = harness();
    await expect(shareMobileArenaResultImage(createRef<View>(), analytics, dependencies))
      .resolves.toBe("shared");
    expect(calls).toEqual([
      "available",
      "capture",
      "share",
      `track:${JSON.stringify(analytics)}`,
    ]);
  });

  it("does not capture or track when native sharing is unavailable", async () => {
    const { calls, dependencies } = harness(false);
    await expect(shareMobileArenaResultImage(createRef<View>(), analytics, dependencies))
      .resolves.toBe("unavailable");
    expect(calls).toEqual(["available"]);
  });

  it("does not track a failed native share", async () => {
    const { calls, dependencies } = harness();
    const failing = { ...dependencies, share: async () => { calls.push("share"); throw new Error("failed"); } };
    await expect(shareMobileArenaResultImage(createRef<View>(), analytics, failing))
      .resolves.toBe("failed");
    expect(calls).toEqual(["available", "capture", "share"]);
  });
});
