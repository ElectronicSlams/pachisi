import { MOBILE_ARENA_GAME_CAPABILITIES } from "@eslams/core-types";
import { assertBoardSceneSafe } from "@eslams/game-render-contract";

import { mobileArenaPreviewScene } from "./mobile-arena-preview-scene";

describe("mobile Arena preview scenes", () => {
  it("provides a safe canonical preview scene for every playable discovery game", () => {
    for (const capability of MOBILE_ARENA_GAME_CAPABILITIES) {
      const scene = mobileArenaPreviewScene(capability.gameSlug);
      expect(scene).not.toBeNull();
      expect(scene?.gameSlug).toBe(capability.gameSlug);
      expect(scene?.rendererFamily).toBe(capability.rendererFamily);
      if (scene) expect(() => assertBoardSceneSafe(scene)).not.toThrow();
    }
  });

  it("does not create a preview for a watch-only or unknown game", () => {
    expect(mobileArenaPreviewScene("leduc-holdem")).toBeNull();
    expect(mobileArenaPreviewScene("unknown-game")).toBeNull();
  });
});
