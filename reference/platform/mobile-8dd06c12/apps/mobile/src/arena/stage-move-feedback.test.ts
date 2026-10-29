import { StageMoveFeedbackTransition } from "./stage-move-feedback";

describe("StageMoveFeedbackTransition", () => {
  it("emits once for authoritative advances, never hydration, duplicates, or stale recovery", () => {
    const transition = new StageMoveFeedbackTransition();

    expect(transition.observe({ sessionId: "one", moveNumber: 4 })).toBe(false);
    expect(transition.observe({ sessionId: "one", moveNumber: 5 })).toBe(true);
    expect(transition.observe({ sessionId: "one", moveNumber: 5 })).toBe(false);
    expect(transition.observe({ sessionId: "one", moveNumber: 3 })).toBe(false);
    expect(transition.observe({ sessionId: "one", moveNumber: 7 })).toBe(true);
    expect(transition.observe({ sessionId: "two", moveNumber: 1 })).toBe(false);
  });
});
