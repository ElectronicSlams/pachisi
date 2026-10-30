import {
  MAX_MOBILE_ARENA_LEGAL_ACTIONS,
  type ArenaStageLegalAction,
} from "./mobile-arena-gateway";
import {
  mobileCompleteActionAccessibilityLabel,
  mobileCompleteActionSummary,
} from "./mobile-arena-complete-actions";

function action(index: number, disabledReason: string | null = null): ArenaStageLegalAction {
  return Object.freeze({
    category: "board",
    confirm: index === 1,
    disabledReason,
    group: "legal",
    label: `Action ${index}`,
    object: null,
    promptLabel: null,
    shortLabel: null,
    sortKey: null,
    token: `exact-token-${index}`,
    value: null,
    verb: null,
  });
}

describe("mobile complete actions", () => {
  it("preserves every action in the bounded authoritative protocol", () => {
    const actions = Object.freeze(Array.from(
      { length: MAX_MOBILE_ARENA_LEGAL_ACTIONS },
      (_, index) => action(index),
    ));
    expect(mobileCompleteActionSummary(actions, MAX_MOBILE_ARENA_LEGAL_ACTIONS)).toEqual({
      complete: true,
      count: 512,
      description: "512 actions supplied. 512 enabled.",
      enabledCount: 512,
      expectedCount: 512,
      unavailableCount: 0,
    });
    expect(actions.at(-1)?.token).toBe("exact-token-511");
  });

  it("reports an incomplete server projection instead of claiming completeness", () => {
    expect(mobileCompleteActionSummary([action(0)], 225).description).toContain("Showing 1 of 225");
  });

  it("announces disabled reasons and confirmation requirements", () => {
    expect(mobileCompleteActionSummary([action(0), action(2, "Occupied")], 2)).toMatchObject({
      enabledCount: 1,
      unavailableCount: 1,
    });
    expect(mobileCompleteActionAccessibilityLabel(action(1))).toContain("Confirmation required");
    expect(mobileCompleteActionAccessibilityLabel(action(2, "Occupied"))).toContain("Unavailable. Occupied");
  });
});
