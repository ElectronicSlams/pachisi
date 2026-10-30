import {
  MOBILE_ARENA_CATEGORY_COUNTS,
  MOBILE_ARENA_GAME_COUNT,
} from "@eslams/core-types";

import {
  MOBILE_ARENA_FILTER_CHIPS,
  MOBILE_ARENA_GAMES,
  MOBILE_ARENA_HERO_GAME_SLUGS,
  MOBILE_ARENA_WIDE_GRID_MIN_WIDTH,
  mobileArenaGamesForFilter,
  mobileArenaDiscoverySections,
  mobileArenaGridColumnCount,
  mobileArenaRecentGames,
  nextMobileArenaHeroGame,
} from "./mobile-arena-discovery";

describe("mobile Arena discovery", () => {
  it("derives the exact full catalogue and chips from the capability manifest", () => {
    expect(MOBILE_ARENA_GAMES).toHaveLength(MOBILE_ARENA_GAME_COUNT);
    expect(MOBILE_ARENA_FILTER_CHIPS).toEqual([
      { filter: "all", label: "All", count: MOBILE_ARENA_GAME_COUNT },
      { filter: "board", label: "Board", count: MOBILE_ARENA_CATEGORY_COUNTS.board },
      { filter: "card", label: "Card", count: MOBILE_ARENA_CATEGORY_COUNTS.card },
      { filter: "social", label: "Social", count: MOBILE_ARENA_CATEGORY_COUNTS.social },
    ]);
    expect(mobileArenaGamesForFilter("board")).toHaveLength(MOBILE_ARENA_CATEGORY_COUNTS.board);
    expect(mobileArenaGamesForFilter("card")).toHaveLength(MOBILE_ARENA_CATEGORY_COUNTS.card);
    expect(mobileArenaGamesForFilter("social")).toHaveLength(MOBILE_ARENA_CATEGORY_COUNTS.social);
  });

  it("uses two columns below the approved threshold and three from it upward", () => {
    expect(mobileArenaGridColumnCount(MOBILE_ARENA_WIDE_GRID_MIN_WIDTH - 1)).toBe(2);
    expect(mobileArenaGridColumnCount(MOBILE_ARENA_WIDE_GRID_MIN_WIDTH)).toBe(3);
    expect(mobileArenaGridColumnCount(Number.NaN)).toBe(2);
  });

  it("keeps resume, prepared, favourites, recents, filters, and grid in source-of-truth order", () => {
    expect(mobileArenaDiscoverySections({
      hasActiveSession: true,
      hasPreparedSetup: true,
      favouriteCount: 3,
      recentCount: 2,
    })).toEqual([
      "continue",
      "prepared",
      "favourites",
      "recents",
      "opponent",
      "filters",
      "grid",
    ]);
    expect(mobileArenaDiscoverySections({
      hasActiveSession: false,
      hasPreparedSetup: false,
      favouriteCount: 0,
      recentCount: 0,
    })).toEqual(["hero", "opponent", "filters", "grid"]);
  });

  it("rotates only approved heroes without an immediate repeat", () => {
    for (const previous of MOBILE_ARENA_HERO_GAME_SLUGS) {
      for (let entropy = 0; entropy < 12; entropy += 1) {
        const next = nextMobileArenaHeroGame(previous, entropy);
        expect(MOBILE_ARENA_HERO_GAME_SLUGS).toContain(next.slug);
        expect(next.slug).not.toBe(previous);
      }
    }
  });

  it("keeps recents local-first and drops games outside the mobile Arena", () => {
    expect(mobileArenaRecentGames([
      { gameSlug: "chess", openedAt: 30 },
      { gameSlug: "leduc-holdem", openedAt: 20 },
      { gameSlug: "connect-four", openedAt: 10 },
    ]).map((game) => game.slug)).toEqual(["chess", "connect-four"]);
  });
});
