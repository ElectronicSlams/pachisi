import { THEMES } from "@eslams/theme-tokens";
import {
  CANONICAL_SEMANTIC_SCENE_FIXTURES,
  FAMILY_THEME_FIXTURES,
  semanticFixtureById,
} from "./fixtures";
import type { GoldenRenderCase } from "./offscreen";

/**
 * The 35-game interactive matrix plus the declared Blackjack watch/replay
 * corpus uses Classic Dark as its stable information baseline. Theme-material
 * coverage is the independent 12-family x 6-theme matrix.
 */
export const OFFSCREEN_GOLDEN_CASES = Object.freeze([
  ...CANONICAL_SEMANTIC_SCENE_FIXTURES.map((fixture): GoldenRenderCase => Object.freeze({
    id: `games/${fixture.id}`,
    fixture,
    theme: THEMES["classic-dark"],
  })),
  ...FAMILY_THEME_FIXTURES.map((familyTheme): GoldenRenderCase => Object.freeze({
    id: `family-themes/${familyTheme.id}`,
    fixture: semanticFixtureById(familyTheme.semanticFixtureId),
    theme: THEMES[familyTheme.themeId],
  })),
]);

const EXPECTED_FAMILY_THEME_CASES = 12 * 6;
const minimumGameScenarioCases = (35 + 1) * 7;
if (FAMILY_THEME_FIXTURES.length !== EXPECTED_FAMILY_THEME_CASES) {
  throw new TypeError(`Golden family/theme matrix must contain ${EXPECTED_FAMILY_THEME_CASES} cases.`);
}
if (CANONICAL_SEMANTIC_SCENE_FIXTURES.length < minimumGameScenarioCases) {
  throw new TypeError(`Golden game/scenario matrix must contain at least ${minimumGameScenarioCases} cases.`);
}
