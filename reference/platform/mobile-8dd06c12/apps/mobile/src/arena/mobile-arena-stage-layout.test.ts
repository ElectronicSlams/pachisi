import { mobileArenaStageBoardSize } from "./mobile-arena-stage-layout";

describe("mobile Arena Stage board sizing", () => {
  it.each([
    ["compact phone", 320, 568, { height: 225, width: 288 }],
    ["standard phone", 390, 844, { height: 273, width: 350 }],
    ["portrait tablet", 768, 1024, { height: 530, width: 680 }],
    ["landscape tablet", 1024, 768, { height: 422, width: 680 }],
  ])("keeps a stable card table on a %s", (_label, width, height, expected) => {
    expect(mobileArenaStageBoardSize(width, height, "card_table")).toEqual(expected);
  });

  it("keeps square-board controls readable without making compact screens overflow", () => {
    expect(mobileArenaStageBoardSize(320, 568, "square_board")).toEqual({
      height: 268,
      width: 288,
    });
    expect(mobileArenaStageBoardSize(1_024, 768, "square_board")).toEqual({
      height: 403,
      width: 560,
    });
  });

  it("fails to deterministic dimensions for invalid viewport measurements", () => {
    expect(mobileArenaStageBoardSize(Number.NaN, 0, "card_table")).toEqual({
      height: 273,
      width: 350,
    });
  });
});
