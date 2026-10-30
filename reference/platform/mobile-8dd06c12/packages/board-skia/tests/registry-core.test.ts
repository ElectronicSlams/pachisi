import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAME_CATALOG, MOBILE_ARENA_GAME_COUNT, type GameRendererFamily } from "@eslams/core-types";
import {
  RENDERER_FAMILIES,
  arenaRendererForGame,
  assertCompleteDefinitionRegistry,
  createArenaGameRendererRegistry,
  createFamilyRendererRegistry,
  createGameRendererRegistry,
  rendererForGame,
  type FamilyRendererDefinition,
  type FamilyRendererDefinitionRegistry,
} from "../src/registry-core";
import type { RenderPlan } from "../src/types";

function definitions(): FamilyRendererDefinitionRegistry {
  const registry = {} as Record<GameRendererFamily, FamilyRendererDefinition>;
  for (const family of RENDERER_FAMILIES) {
    registry[family] = {
      family,
      buildPlan: (scene, theme, motion): RenderPlan => ({
        family,
        gameSlug: scene.gameSlug,
        viewport: { width: motion.viewport.width, height: motion.viewport.height },
        material: {
          surface: theme.material.boardSurface,
          rect: { x: 0, y: 0, width: motion.viewport.width, height: motion.viewport.height },
          baseColor: theme.color.boardBackground,
          accentColor: theme.color.accent,
          detail: 0,
          phase: motion.reducedMotion ? 1 : motion.progress,
        },
        commands: [],
        hitZones: [],
        metadata: {},
      }),
      hitTest: () => null,
    };
  }
  return registry;
}

describe("renderer registry core", () => {
  it("requires all and only the 12 canonical renderer families", () => {
    const complete = definitions();
    assert.doesNotThrow(() => assertCompleteDefinitionRegistry(complete));
    const { custom: _removed, ...incomplete } = complete;
    assert.throws(
      () => assertCompleteDefinitionRegistry(incomplete as FamilyRendererDefinitionRegistry),
      /exactly 12 families/u,
    );
    const mismatched = { ...complete, custom: { ...complete.custom, family: "go_board" as GameRendererFamily } };
    assert.throws(() => assertCompleteDefinitionRegistry(mismatched), /valid custom definition/u);
  });

  it("derives the shared 35-game Arena registry and fails closed for watch-only games and exclusions", () => {
    const families = createFamilyRendererRegistry(definitions(), () => undefined);
    const games = createGameRendererRegistry(families);
    const arenaGames = createArenaGameRendererRegistry(families);
    assert.equal(Object.keys(families).length, 12);
    assert.equal(Object.keys(games).length, GAME_CATALOG.length);
    assert.equal(Object.keys(arenaGames).length, MOBILE_ARENA_GAME_COUNT);
    assert.equal(MOBILE_ARENA_GAME_COUNT, 35);
    assert.equal(rendererForGame("chess", families)?.family, "square_board");
    assert.equal(rendererForGame("hanabi", families)?.family, "card_table");
    assert.equal(rendererForGame("leduc-holdem", families)?.family, "card_table");
    assert.equal(rendererForGame("taxi", families)?.family, "control_benchmark");
    assert.equal(rendererForGame("blackjack", families)?.family, "card_table");
    assert.equal(arenaRendererForGame("blackjack", families), null);
    assert.equal(arenaRendererForGame("leduc-holdem", families), null);
    assert.equal(arenaRendererForGame("shedding-card-game", families), null);
    assert.equal(rendererForGame("unknown", families), null);
  });
});
