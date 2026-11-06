import {
  mobileArenaPreviewNextIndex,
  mobileArenaPreviewStartIndex,
} from "./use-mobile-arena-preview-scene";

describe("mobile Arena preview playback", () => {
  it("lands on an immediately legible late-game frame", () => {
    expect(mobileArenaPreviewStartIndex(0)).toBe(0);
    expect(mobileArenaPreviewStartIndex(1)).toBe(0);
    expect(mobileArenaPreviewStartIndex(2)).toBe(1);
    expect(mobileArenaPreviewStartIndex(8)).toBe(6);
  });

  it("keeps looping legal moves without returning to the empty opening frame", () => {
    expect(mobileArenaPreviewNextIndex(6, 8)).toBe(7);
    expect(mobileArenaPreviewNextIndex(7, 8)).toBe(1);
    expect(mobileArenaPreviewNextIndex(1, 8)).toBe(2);
    expect(mobileArenaPreviewNextIndex(0, 1)).toBe(0);
  });
});
