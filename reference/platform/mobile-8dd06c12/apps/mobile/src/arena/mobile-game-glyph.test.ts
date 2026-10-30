import { MOBILE_ARENA_GAME_SLUGS } from "@eslams/core-types/mobile-capability";
import { GAME_CATALOG_BY_SLUG } from "@eslams/core-types/game-catalog";

import { mobileGameGlyphName } from "./mobile-game-glyph";

describe("mobile Arena game glyphs", () => {
  it("maps every enabled mobile game to a real vector-icon glyph", () => {
    const names = MOBILE_ARENA_GAME_SLUGS.map((slug) => {
      const game = GAME_CATALOG_BY_SLUG[slug];
      if (!game) throw new TypeError(`Missing catalogue entry for ${slug}.`);
      return mobileGameGlyphName(game);
    });

    expect(names).toHaveLength(MOBILE_ARENA_GAME_SLUGS.length);
    expect(names).not.toContain("gamepad");
    expect(mobileGameGlyphName(GAME_CATALOG_BY_SLUG.chess!)).toBe("chess-knight");
    expect(mobileGameGlyphName(GAME_CATALOG_BY_SLUG["connect-four"]!))
      .toBe("view-column-outline");
  });
});
