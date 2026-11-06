import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GAME_CATALOG,
  MOBILE_ARENA_GAME_CAPABILITIES,
  MOBILE_ARENA_GAME_COUNT,
  type GameCatalogEntry,
  type GameRendererFamily,
} from "@eslams/core-types";
import { SCENE_SCHEMA_VERSION, type BoardScene } from "@eslams/game-render-contract";
import { THEME_IDS, THEMES } from "@eslams/theme-tokens";
import { FAMILY_RENDERER_DEFINITIONS } from "../src/definitions";
import {
  createArenaGameRendererRegistry,
  createFamilyRendererRegistry,
  createGameRendererRegistry,
} from "../src/registry-core";
import type { MotionState } from "../src/types";

const familyRegistry = createFamilyRendererRegistry(FAMILY_RENDERER_DEFINITIONS, () => undefined);
const arenaRegistry = createArenaGameRendererRegistry(familyRegistry);
const gameRegistry = createGameRendererRegistry(familyRegistry);

describe("complete renderer definitions", () => {
  it("renders an initial public scene for all 35 Arena games in all six themes", () => {
    assert.equal(Object.keys(arenaRegistry).length, 35);
    assert.equal(MOBILE_ARENA_GAME_COUNT, 35);
    for (const capability of MOBILE_ARENA_GAME_CAPABILITIES) {
      const game = GAME_CATALOG.find(({ slug }) => slug === capability.gameSlug);
      assert.ok(game, `Catalog entry missing for ${capability.gameSlug}.`);
      const scene = sampleScene(game);
      const renderer = arenaRegistry[game.slug];
      assert.ok(renderer, `Arena renderer missing for ${game.slug}.`);
      assert.equal(renderer.family, capability.rendererFamily);
      for (const themeId of THEME_IDS) {
        const plan = renderer.createPlan(scene, THEMES[themeId], motion());
        assert.equal(plan.gameSlug, game.slug);
        assert.equal(plan.family, game.renderSpec.rendererFamily);
        assert.equal(plan.material.surface, THEMES[themeId].material.boardSurface);
        assert.ok(plan.commands.length > 0, `${game.slug}/${themeId} produced no commands.`);
        assert.equal(new Set(plan.commands.map(({ id }) => id)).size, plan.commands.length);
        assert.deepEqual(renderer.accessibility(scene), scene.accessibility);
      }
    }
  });

  it("keeps every catalog watch/replay renderer, including control benchmarks and Arena exclusions", () => {
    assert.equal(Object.keys(gameRegistry).length, GAME_CATALOG.length);
    for (const game of GAME_CATALOG) {
      const renderer = gameRegistry[game.slug];
      assert.ok(renderer, `Watch/replay renderer missing for ${game.slug}.`);
      const scene = sampleScene(game);
      const plan = renderer.createPlan(scene, THEMES["classic-dark"], motion());
      assert.equal(plan.family, game.renderSpec.rendererFamily);
    }
    assert.equal(gameRegistry["taxi"]?.family, "control_benchmark");
    assert.equal(gameRegistry["leduc-holdem"]?.family, "card_table");
    assert.equal(gameRegistry["shedding-card-game"]?.family, "card_table");
  });

  it("makes reduced-motion constrained plans static without dropping identity or information", () => {
    const reduced = motion({
      progress: 0.01,
      beat: "move",
      reducedMotion: true,
      qualityTier: "constrained",
      activeNodeId: "cell-0",
    });
    for (const capability of MOBILE_ARENA_GAME_CAPABILITIES) {
      const game = GAME_CATALOG.find(({ slug }) => slug === capability.gameSlug)!;
      const scene = sampleScene(game);
      const plan = arenaRegistry[game.slug]!.createPlan(scene, THEMES.arcade, reduced);
      assert.equal(plan.metadata.reducedMotion, true);
      assert.equal(plan.metadata.qualityTier, "constrained");
      assert.equal(plan.commands.some(({ style }) => style.trail === true), false);
      assert.ok(plan.commands.length > 0);
    }
  });
});

function sampleScene(game: GameCatalogEntry): BoardScene {
  const { rows, cols } = sampleDimensions(game);
  const nodeCount = Math.max(1, rows * cols);
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `cell-${index}`,
    kind: nodeKind(game.renderSpec.rendererFamily),
    label: `Row ${Math.floor(index / cols) + 1}, column ${index % cols + 1}: ${sampleLabel(game, index)}`,
    row: Math.floor(index / cols),
    col: index % cols,
    index,
    actionTargetId: null,
  } as const));
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug: game.slug,
    rendererFamily: game.renderSpec.rendererFamily,
    rows,
    cols,
    nodes,
    actionTargets: [],
    accessibility: nodes.map((node) => ({
      id: node.id,
      role: "gridcell" as const,
      label: node.label,
      row: node.row,
      col: node.col,
      actionTargetId: null,
    })),
    summary: { activePlayer: "player_1", terminal: false, turn: 0, scores: {} },
  };
}

function sampleDimensions(game: GameCatalogEntry): Readonly<{ rows: number; cols: number }> {
  if (game.renderSpec.boardSize) return game.renderSpec.boardSize;
  const bespoke: Readonly<Record<string, Readonly<{ rows: number; cols: number }>>> = {
    mancala: { rows: 2, cols: 7 },
    "nine-mens-morris": { rows: 4, cols: 6 },
    pentago: { rows: 6, cols: 6 },
    backgammon: { rows: 2, cols: 12 },
    shogi: { rows: 9, cols: 9 },
    xiangqi: { rows: 10, cols: 9 },
  };
  const explicit = bespoke[game.slug];
  if (explicit) return explicit;
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return { rows: 1, cols: 4 };
    case "dice_table": return { rows: 1, cols: 5 };
    case "auction_panel": return { rows: 1, cols: 3 };
    case "payoff_matrix": return game.slug === "rock-paper-scissors" ? { rows: 3, cols: 3 } : { rows: 2, cols: 2 };
    case "economic_panel": return { rows: 2, cols: 2 };
    case "control_benchmark": return { rows: 2, cols: 2 };
    default: return { rows: 3, cols: 3 };
  }
}

function sampleLabel(game: GameCatalogEntry, index: number): string {
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return index === 0 ? "Hidden card" : "Empty";
    case "dice_table": return index === 0 ? "Count 3" : "Empty";
    case "auction_panel": return index === 0 ? "Sealed bid" : "Empty";
    case "payoff_matrix": return "0";
    case "economic_panel": return index === 0 ? "Offer 4" : "Empty";
    case "control_benchmark": return index === 0 ? "Score 12" : "Empty";
    default: return "Empty";
  }
}

function nodeKind(family: GameRendererFamily): "board" | "card" | "status" {
  if (family === "card_table") return "card";
  if (["dice_table", "auction_panel", "payoff_matrix", "economic_panel", "control_benchmark"].includes(family)) {
    return "status";
  }
  return "board";
}

function motion(overrides: Partial<MotionState> = {}): MotionState {
  return {
    progress: 1,
    beat: "idle",
    reducedMotion: false,
    qualityTier: "high",
    viewport: { width: 390, height: 480, pixelRatio: 3 },
    lastActionTargetId: null,
    activeNodeId: null,
    ...overrides,
  };
}
