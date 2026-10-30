import { mobileBoardZoomState } from "./mobile-arena-board-zoom";

describe("mobile board zoom", () => {
  it("offers bounded non-gesture zoom levels and honest accessibility values", () => {
    expect(mobileBoardZoomState(-100)).toEqual({
      canZoomIn: true,
      canZoomOut: false,
      index: 0,
      label: "100 percent",
      scale: 1,
    });
    expect(mobileBoardZoomState(1).label).toBe("150 percent");
    expect(mobileBoardZoomState(100)).toEqual({
      canZoomIn: false,
      canZoomOut: true,
      index: 2,
      label: "200 percent",
      scale: 2,
    });
  });
});
