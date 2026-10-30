import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  ARENA_REPLAY_CONTRACT_VERSIONS,
  LEGACY_ARENA_REPLAY_SCHEMA_VERSION,
  MOBILE_ARENA_GAME_CAPABILITIES,
} from "@eslams/core-types";
import { assertBoardSceneSafe } from "@eslams/game-render-contract";
import { THEME_IDS, THEMES } from "@eslams/theme-tokens";
import { FAMILY_RENDERER_DEFINITIONS } from "../src/definitions";
import {
  CANONICAL_SEMANTIC_SCENE_FIXTURES,
  FAMILY_THEME_FIXTURES,
  REQUIRED_SEMANTIC_SCENARIOS,
  semanticAccessibilityRepresentation,
  semanticFixtureById,
  serializeSemanticSceneSnapshot,
} from "../src/golden/fixtures";
import {
  GAME_COMPATIBILITY_MATRIX,
  WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
} from "../src/golden/compatibility-matrix";
import { createFamilyRendererRegistry } from "../src/registry-core";

const EXPECTED_SEMANTIC_MATRIX_SHA256 = "2a3f0b04eb584374b1f86247754f32949b741813db7869105821f96ff11d55e4";
const familyRegistry = createFamilyRendererRegistry(FAMILY_RENDERER_DEFINITIONS, () => undefined);

describe("semantic scene matrix", () => {
  it("covers all 35 Arena games and every required semantic state before pixels", () => {
    assert.equal(MOBILE_ARENA_GAME_CAPABILITIES.length, 35);
    for (const capability of MOBILE_ARENA_GAME_CAPABILITIES) {
      const fixtures = CANONICAL_SEMANTIC_SCENE_FIXTURES.filter(({ gameSlug }) => gameSlug === capability.gameSlug);
      assert.deepEqual(
        REQUIRED_SEMANTIC_SCENARIOS.filter((scenario) => !fixtures.some((fixture) => fixture.scenario === scenario)),
        [],
        `${capability.gameSlug} is missing a required semantic scenario.`,
      );
      const compatibility = GAME_COMPATIBILITY_MATRIX.find(({ gameSlug }) => gameSlug === capability.gameSlug);
      assert.ok(compatibility, capability.gameSlug);
      assert.deepEqual(fixtures.map(({ scenario }) => scenario), compatibility.requiredStates, capability.gameSlug);
      for (const fixture of fixtures) {
        assert.equal(fixture.family, capability.rendererFamily);
        assert.equal(fixture.scene.gameSlug, capability.gameSlug);
        assert.equal(fixture.scene.rendererFamily, capability.rendererFamily);
        assert.doesNotThrow(() => assertBoardSceneSafe(fixture.scene), fixture.id);
      }
    }
    assert.deepEqual(WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS, ["blackjack"]);
  });

  it("keeps coordinates, actions, and accessibility in exact semantic parity", () => {
    for (const fixture of CANONICAL_SEMANTIC_SCENE_FIXTURES) {
      const scene = fixture.scene;
      assert.equal(scene.nodes.length, scene.rows * scene.cols, fixture.id);
      assert.equal(scene.accessibility.length, scene.nodes.length, fixture.id);
      for (const [index, node] of scene.nodes.entries()) {
        assert.equal(node.index, index, fixture.id);
        assert.equal(node.row, Math.floor(index / scene.cols), fixture.id);
        assert.equal(node.col, index % scene.cols, fixture.id);
        const accessible = scene.accessibility[index];
        assert.ok(accessible, fixture.id);
        assert.equal(accessible.id, node.id, fixture.id);
        assert.equal(accessible.label, node.label, fixture.id);
        assert.equal(accessible.row, node.row, fixture.id);
        assert.equal(accessible.col, node.col, fixture.id);
        assert.equal(accessible.actionTargetId, node.actionTargetId, fixture.id);
      }
      for (const action of scene.actionTargets) {
        assert.equal(scene.nodes.filter((node) => node.actionTargetId === action.id).length, 1, fixture.id);
      }
      if (fixture.scenario === "accessibility") {
        assert.ok(scene.accessibility.some(({ role }) => role === "button"), fixture.id);
      }
    }
  });

  it("proves masked-before and public-reveal-after as distinct semantic states", () => {
    const hiddenGames = GAME_COMPATIBILITY_MATRIX.filter(({ conditionalStates }) =>
      conditionalStates.includes("hidden_information"));
    assert.ok(hiddenGames.length > 0);
    for (const game of hiddenGames) {
      const hidden = semanticFixtureById(`${game.gameSlug}/hidden_information`);
      const reveal = semanticFixtureById(`${game.gameSlug}/reveal`);
      assert.equal(hidden.scene.summary.terminal, false, game.gameSlug);
      assert.equal(reveal.scene.summary.terminal, true, game.gameSlug);
      assert.equal(hidden.motion.beat, "idle", game.gameSlug);
      assert.equal(reveal.motion.beat, "reveal", game.gameSlug);
      assert.doesNotMatch(JSON.stringify(hidden.scene), /\b(?:private|secret|revealed)\b/iu, game.gameSlug);
      assert.notDeepEqual(hidden.scene.nodes, reveal.scene.nodes, game.gameSlug);
    }
  });

  it("uses capture motion only for the games whose compatibility contract requires capture", () => {
    for (const game of GAME_COMPATIBILITY_MATRIX.filter(({ conditionalStates }) => conditionalStates.includes("capture"))) {
      const fixture = semanticFixtureById(`${game.gameSlug}/capture`);
      assert.equal(fixture.motion.beat, "capture", game.gameSlug);
    }
  });

  it("provides the terminal summary through the explicit accessibility announcement channel", () => {
    for (const game of MOBILE_ARENA_GAME_CAPABILITIES) {
      const terminal = semanticFixtureById(`${game.gameSlug}/terminal_outcome`);
      const representation = semanticAccessibilityRepresentation(terminal);
      assert.equal(representation.nodes, terminal.scene.accessibility, game.gameSlug);
      assert.match(representation.terminalSummary ?? "", /^Game over\. Scores: player_1 1, player_2 0\.$/u, game.gameSlug);
    }
  });

  it("builds every semantic state through its production renderer contract", () => {
    for (const fixture of CANONICAL_SEMANTIC_SCENE_FIXTURES) {
      const renderer = familyRegistry[fixture.family];
      const plan = renderer.createPlan(fixture.scene, THEMES["classic-dark"], fixture.motion);
      assert.equal(plan.gameSlug, fixture.gameSlug, fixture.id);
      assert.ok(plan.commands.length > 0, fixture.id);
      assert.deepEqual(renderer.accessibility(fixture.scene), fixture.scene.accessibility, fixture.id);
    }
  });

  it("adapts the numeric v1 replay and snake-case display frame for every game", () => {
    const legacyFixtures = CANONICAL_SEMANTIC_SCENE_FIXTURES.filter(({ scenario }) => scenario === "legacy_replay");
    assert.equal(legacyFixtures.length, 36);
    for (const fixture of legacyFixtures) {
      assert.equal(fixture.legacyReplay?.sourceSchemaVersion, LEGACY_ARENA_REPLAY_SCHEMA_VERSION, fixture.id);
      assert.equal(fixture.legacyReplay?.hadCanonicalContractMetadata, false, fixture.id);
      assert.equal(fixture.legacyReplay?.contractVersions, ARENA_REPLAY_CONTRACT_VERSIONS, fixture.id);
      assert.equal(fixture.scene.gameSlug, fixture.gameSlug, fixture.id);
    }
  });

  it("makes the reduced-motion fixture static without changing semantic information", () => {
    for (const game of MOBILE_ARENA_GAME_CAPABILITIES) {
      const reduced = semanticFixtureById(`${game.gameSlug}/reduced_motion`);
      const active = semanticFixtureById(`${game.gameSlug}/active_turn`);
      assert.equal(reduced.motion.reducedMotion, true);
      assert.equal(reduced.motion.qualityTier, "constrained");
      assert.deepEqual(reduced.scene.nodes, active.scene.nodes, game.gameSlug);
      assert.deepEqual(reduced.scene.accessibility, active.scene.accessibility, game.gameSlug);
      assert.deepEqual(reduced.scene.actionTargets, active.scene.actionTargets, game.gameSlug);
    }
  });

  it("pins a committed semantic snapshot digest so semantic changes precede pixel review", () => {
    const serialized = CANONICAL_SEMANTIC_SCENE_FIXTURES.map(serializeSemanticSceneSnapshot).join("\n");
    const digest = createHash("sha256").update(serialized).digest("hex");
    assert.equal(digest, EXPECTED_SEMANTIC_MATRIX_SHA256);
  });
});

describe("family and theme semantic matrix", () => {
  it("covers exactly 12 renderer families by six themes", () => {
    assert.equal(FAMILY_THEME_FIXTURES.length, 12 * 6);
    assert.equal(new Set(FAMILY_THEME_FIXTURES.map(({ id }) => id)).size, 12 * 6);
    for (const family of Object.keys(familyRegistry)) {
      assert.deepEqual(
        FAMILY_THEME_FIXTURES.filter((fixture) => fixture.family === family).map(({ themeId }) => themeId),
        THEME_IDS,
      );
    }
  });

  it("produces a valid plan from each family/theme semantic fixture", () => {
    for (const fixture of FAMILY_THEME_FIXTURES) {
      const semantic = semanticFixtureById(fixture.semanticFixtureId);
      const plan = familyRegistry[fixture.family].createPlan(
        semantic.scene,
        THEMES[fixture.themeId],
        semantic.motion,
      );
      assert.equal(plan.family, fixture.family, fixture.id);
      assert.equal(plan.gameSlug, fixture.gameSlug, fixture.id);
      assert.equal(plan.material.surface, THEMES[fixture.themeId].material.boardSurface, fixture.id);
      assert.ok(plan.commands.length > 0, fixture.id);
    }
  });
});
