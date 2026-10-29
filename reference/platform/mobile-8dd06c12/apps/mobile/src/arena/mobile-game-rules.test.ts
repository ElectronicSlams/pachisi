import {
  GAME_CATALOG,
  MOBILE_ARENA_GAME_SLUGS,
  mobileCapabilityForGame,
} from "@eslams/core-types";

import {
  MOBILE_GAME_RULE_SLUGS,
  MOBILE_GAME_RULES_BY_SLUG,
  mobileGameRuleContent,
} from "./mobile-game-rule-content";
import { mobileGameRuleSections } from "./mobile-game-rule-sections";

describe("mobile game rules", () => {
  it("covers exactly the enabled mobile Arena games", () => {
    expect(MOBILE_GAME_RULE_SLUGS).toHaveLength(MOBILE_ARENA_GAME_SLUGS.length);
    expect([...MOBILE_GAME_RULE_SLUGS].sort()).toEqual([...MOBILE_ARENA_GAME_SLUGS].sort());
    expect(Object.keys(MOBILE_GAME_RULES_BY_SLUG).sort()).toEqual([...MOBILE_ARENA_GAME_SLUGS].sort());
  });

  it("provides every required screen-reader section for every enabled mobile game", () => {
    const enabled = GAME_CATALOG.filter((game) => mobileCapabilityForGame(game.slug)?.enabled);
    expect(enabled).toHaveLength(MOBILE_ARENA_GAME_SLUGS.length);
    for (const game of enabled) {
      const sections = mobileGameRuleSections(game);
      expect(sections.map((section) => section.title)).toEqual([
        "Quick summary",
        "Objective",
        "Full rules",
        "Your turn",
        "Turn example",
        "Legal actions",
        "Scoring",
        "Win, draw, or placement",
        "Hidden information",
        "First move",
        "Accessibility",
      ]);
      expect(sections.every((section) => section.body.trim().length > 0)).toBe(true);
    }
  });

  it("ships substantive mobile copy instead of the generic catalog fallback", () => {
    const genericFallbackFragments = [
      "Choose one legal action shown by the current game state.",
      "The result contract reports winner, draw, points, and final scores.",
      "Player 1 and Player 2 alternate or commit actions according to the variant rules.",
      "Applies a legal action token from the current state.",
      "Choose a legal table action for the active seat.",
      "Final placements, points, chips, or role results are reported by the result contract.",
    ];

    for (const game of GAME_CATALOG.filter((entry) => mobileCapabilityForGame(entry.slug)?.enabled)) {
      const content = mobileGameRuleContent(game);
      expect(content.shortSummary).toHaveLength(3);
      expect(content.shortSummary.every((line) => line.trim().length >= 12)).toBe(true);
      expect(content.objective).not.toBe(game.help.objective);
      expect(content.fullRules.length).toBeGreaterThan(220);
      expect(content.turnExample.length).toBeGreaterThan(70);
      expect(content.legalActions.length).toBeGreaterThan(70);
      expect(content.scoring.length).toBeGreaterThan(60);
      expect(genericFallbackFragments.some((fragment) => Object.values(content).flat().includes(fragment))).toBe(false);
    }
  });

  it("fails closed instead of showing generic rules for a game without a mobile override", () => {
    const excludedGame = GAME_CATALOG.find((game) => game.slug === "leduc-holdem");
    expect(excludedGame).toBeDefined();
    expect(() => mobileGameRuleContent(excludedGame!)).toThrow(
      "Missing authoritative mobile rules for game: leduc-holdem",
    );
  });
});
