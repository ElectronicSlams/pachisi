import { isMobileArenaPlayable } from "@eslams/core-types";

import { mobileArenaRecruitGame } from "./mobile-arena-recruit-handoff";

describe("mobile Arena recruit handoff", () => {
  it("keeps an exact playable game selection", () => {
    expect(mobileArenaRecruitGame("chess", null).slug).toBe("chess");
  });

  it("maps watch-only content to a genuinely playable similar game", () => {
    const game = mobileArenaRecruitGame(null, "leduc-holdem");
    expect(game.slug).not.toBe("leduc-holdem");
    expect(game.category).toBe("card");
    expect(isMobileArenaPlayable(game.slug)).toBe(true);
  });

  it("fails closed to the stable default for invalid route values", () => {
    expect(mobileArenaRecruitGame("../private", "unknown").slug).toBe("connect-four");
    expect(mobileArenaRecruitGame("leduc-holdem", null).slug).toBe("connect-four");
  });
});
