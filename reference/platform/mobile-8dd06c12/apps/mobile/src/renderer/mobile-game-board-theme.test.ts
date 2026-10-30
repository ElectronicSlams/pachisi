import { THEMES } from "@eslams/theme-tokens";

import { mobileGameBoardTheme } from "./mobile-game-board-theme";

describe("mobile game board theme", () => {
  it("makes both Connect Four sides distinct from empty dark wells", () => {
    const base = THEMES["classic-dark"];
    const adapted = mobileGameBoardTheme("connect_four", base);

    expect(adapted).not.toBe(base);
    expect(mobileGameBoardTheme("connect_four", base)).toBe(adapted);
    expect(adapted.ink.pieceA).toBe(base.color.accent);
    expect(adapted.ink.pieceB).toBe(base.color.textSecondary);
    expect(adapted.ink.pieceA).not.toBe(base.color.boardBackground);
    expect(adapted.ink.pieceB).not.toBe(base.color.boardBackground);
    expect(base.ink.pieceA).toBe(base.color.pieceDark);
  });

  it("preserves the canonical theme for every other renderer family", () => {
    const base = THEMES["classic-dark"];

    expect(mobileGameBoardTheme("square_board", base)).toBe(base);
  });
});
