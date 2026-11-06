import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOBILE_ARENA_GAME_CAPABILITIES } from "@eslams/core-types";
import { THEME_IDS, THEMES } from "@eslams/theme-tokens";
import { RENDERER_FAMILIES } from "../src/registry-core";
import {
  CANONICAL_SEMANTIC_SCENE_FIXTURES,
  FAMILY_THEME_FIXTURES,
  semanticFixtureById,
} from "../src/golden/fixtures";
import {
  FAMILY_THEME_GOLDEN_MATRIX,
  GAME_COMPATIBILITY_BY_SLUG,
  GAME_COMPATIBILITY_MATRIX,
  GOLDEN_PIXEL_TOLERANCE_MASKS,
  PINNED_GOLDEN_REFERENCE_ENVIRONMENT,
  WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
  familyThemeGoldenCell,
} from "../src/golden/compatibility-matrix";
import {
  assertRendererCompatibilityMatrix,
  auditBlocksRelease,
  pixelDifferenceIsWithinApprovedTolerance,
  releaseBlockingViolationsForAudit,
} from "../src/golden/compatibility-validation";
import {
  BASELINE_COMPATIBILITY_STATES,
  RELEASE_BLOCKING_SEMANTIC_VIOLATIONS,
  type SemanticCompatibilityAudit,
} from "../src/golden/compatibility-types";

describe("renderer golden compatibility contract", () => {
  it("pins the verified CanvasKit CPU reference environment and semantic-first order", () => {
    assert.deepEqual(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.comparisonOrder, ["semantic", "pixel"]);
    assert.equal(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.node, "24.18.0");
    assert.equal(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.reactNativeSkia, "2.6.2");
    assert.equal(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.canvasKit, "0.41.0");
    assert.equal(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.backend, "canvaskit-wasm-cpu");
    assert.equal(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.surfaceScale, 1);
    assert.deepEqual(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.semanticFixtureViewport, {
      width: 390,
      height: 480,
      pixelRatio: 3,
    });
    assert.deepEqual(PINNED_GOLDEN_REFERENCE_ENVIRONMENT.output, {
      width: 390,
      height: 480,
      format: "png",
    });
  });

  it("contains exactly one stable approval cell for all 12 families and six themes", () => {
    assert.equal(RENDERER_FAMILIES.length, 12);
    assert.equal(THEME_IDS.length, 6);
    assert.equal(FAMILY_THEME_GOLDEN_MATRIX.length, 72);
    for (const family of RENDERER_FAMILIES) {
      for (const themeId of THEME_IDS) {
        const cell = familyThemeGoldenCell(family, themeId);
        assert.equal(cell.rendererFamily, family);
        assert.equal(cell.themeId, themeId);
        assert.equal(cell.semanticBaselineId, `family-themes/${family}/${themeId}`);
        assert.equal(cell.goldenImageId, `family-themes/${family}/${themeId}.png`);
        assert.equal(cell.expectedMaterialSurface, THEMES[themeId].material.boardSurface);
      }
    }
  });

  it("maps every compatibility row and family/theme cell to the real semantic fixture graph", () => {
    for (const game of GAME_COMPATIBILITY_MATRIX) {
      const fixtures = CANONICAL_SEMANTIC_SCENE_FIXTURES.filter(({ gameSlug }) => gameSlug === game.gameSlug);
      assert.deepEqual(fixtures.map(({ scenario }) => scenario), game.requiredStates, game.gameSlug);
      assert.ok(fixtures.every(({ family }) => family === game.rendererFamily), game.gameSlug);
      for (const fixture of fixtures) {
        assert.deepEqual(fixture.motion.viewport, PINNED_GOLDEN_REFERENCE_ENVIRONMENT.semanticFixtureViewport);
      }
    }
    for (const cell of FAMILY_THEME_GOLDEN_MATRIX) {
      const semanticCell = FAMILY_THEME_FIXTURES.find(
        ({ family, themeId }) => family === cell.rendererFamily && themeId === cell.themeId,
      );
      assert.ok(semanticCell, `${cell.rendererFamily}/${cell.themeId}`);
      const fixture = semanticFixtureById(semanticCell.semanticFixtureId);
      assert.equal(fixture.family, cell.rendererFamily);
      assert.equal(cell.semanticBaselineId, `family-themes/${semanticCell.id}`);
      assert.equal(cell.goldenImageId, `family-themes/${semanticCell.id}.png`);
    }
  });

  it("covers every Arena and declared watch/replay game with the complete fixture contract", () => {
    assert.equal(GAME_COMPATIBILITY_MATRIX.length, 36);
    assert.deepEqual(
      [...GAME_COMPATIBILITY_MATRIX.map(({ gameSlug }) => gameSlug)].sort(),
      [
        ...MOBILE_ARENA_GAME_CAPABILITIES.map(({ gameSlug }) => gameSlug),
        ...WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
      ].sort(),
    );
    for (const game of GAME_COMPATIBILITY_MATRIX) {
      assert.deepEqual(GAME_COMPATIBILITY_BY_SLUG[game.gameSlug], game);
      for (const state of BASELINE_COMPATIBILITY_STATES) assert.ok(game.requiredStates.includes(state));
      assert.equal(game.legacyReplay.sourceSchemaVersion, 1);
      assert.equal(game.legacyReplay.expectedAdapterVersion, "eslams.replay-adapter.v1");
      assert.equal(game.accessibility.hiddenValuesMayAppearInLabels, false);
    }
    assert.deepEqual(GAME_COMPATIBILITY_BY_SLUG.battleship.conditionalStates, ["hidden_information", "reveal"]);
    assert.equal(GAME_COMPATIBILITY_BY_SLUG.hanabi.accessibility.hiddenInformationPolicy, "owner_inverted_mask");
    assert.equal(GAME_COMPATIBILITY_BY_SLUG.shogi.accessibility.coordinatePolicy, "coordinates_required");
    assert.equal(GAME_COMPATIBILITY_BY_SLUG.xiangqi.accessibility.coordinatePolicy, "coordinates_required");
  });

  it("allows only bounded shader-noise and font-rasterization differences", () => {
    assert.deepEqual(GOLDEN_PIXEL_TOLERANCE_MASKS.map(({ cause }) => cause), [
      "shader-noise",
      "font-rasterization",
    ]);
    assert.equal(pixelDifferenceIsWithinApprovedTolerance({
      role: "material-surface",
      maxChannelDelta: 2,
      outlierPixelRatio: 0,
    }), true);
    assert.equal(pixelDifferenceIsWithinApprovedTolerance({
      role: "coordinate-glyph",
      maxChannelDelta: 64,
      outlierPixelRatio: 0.12,
    }), true);
    assert.equal(pixelDifferenceIsWithinApprovedTolerance({
      role: "win-line",
      maxChannelDelta: 1,
      outlierPixelRatio: 0.0001,
    }), false);
    assert.equal(pixelDifferenceIsWithinApprovedTolerance({
      role: "hidden-information",
      maxChannelDelta: 1,
      outlierPixelRatio: 0.0001,
    }), false);
    assert.equal(pixelDifferenceIsWithinApprovedTolerance({
      role: "theme-token-color",
      maxChannelDelta: 1,
      outlierPixelRatio: 0.0001,
    }), false);
  });

  it("makes each named semantic regression a local release blocker", () => {
    const passing: SemanticCompatibilityAudit = {
      winLineCorrect: true,
      hiddenInformationPublicSafe: true,
      coordinatesCorrect: true,
      legacyReplayAdapted: true,
      themeContractSatisfied: true,
    };
    assert.equal(auditBlocksRelease(passing), false);
    assert.deepEqual(releaseBlockingViolationsForAudit({
      winLineCorrect: false,
      hiddenInformationPublicSafe: false,
      coordinatesCorrect: false,
      legacyReplayAdapted: false,
      themeContractSatisfied: false,
    }), RELEASE_BLOCKING_SEMANTIC_VIOLATIONS);
    for (const field of Object.keys(passing) as (keyof SemanticCompatibilityAudit)[]) {
      const audit = { ...passing, [field]: false };
      assert.equal(auditBlocksRelease(audit), true, `${field} must block release.`);
    }
  });

  it("passes the full fail-closed matrix audit", () => {
    assert.doesNotThrow(() => assertRendererCompatibilityMatrix());
  });
});
