import type { GameRendererFamily } from "@eslams/core-types";

import { dispatchFeedback, soundCueForEvent, type FeedbackDriver } from "./feedback-contract";

const FAMILIES: readonly GameRendererFamily[] = [
  "grid_3x3",
  "connect_four",
  "square_board",
  "go_board",
  "hex_board",
  "card_table",
  "dice_table",
  "auction_panel",
  "payoff_matrix",
  "control_benchmark",
  "economic_panel",
  "custom",
];

describe("mobile feedback contract", () => {
  it("maps every renderer family to its own cue", () => {
    expect(new Set(FAMILIES.map((family) => soundCueForEvent({ kind: "move", family }))).size)
      .toBe(12);
    expect(soundCueForEvent({ kind: "piece-arrival" })).toBe("piece_arrival");
    expect(soundCueForEvent({ kind: "result", result: "win" })).toBe("result_chord");
  });

  it("honours sound and haptics independently", async () => {
    const playSound = jest.fn(async () => undefined);
    const playHaptic = jest.fn(async () => undefined);
    const driver: FeedbackDriver = { playSound, playHaptic };
    expect(await dispatchFeedback(
      { kind: "move", family: "connect_four" },
      { soundEnabled: false, hapticsEnabled: true },
      driver,
    )).toEqual({ sound: "disabled", haptic: "played" });
    expect(playSound).not.toHaveBeenCalled();
    expect(playHaptic).toHaveBeenCalledTimes(1);
  });

  it("contains channel failures without disabling the other channel", async () => {
    const driver: FeedbackDriver = {
      playSound: async () => { throw new Error("audio unavailable"); },
      playHaptic: async () => undefined,
    };
    expect(await dispatchFeedback(
      { kind: "result", result: "draw" },
      { soundEnabled: true, hapticsEnabled: true },
      driver,
    )).toEqual({ sound: "failed", haptic: "played" });
  });
});
