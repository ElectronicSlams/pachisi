import {
  GAME_CATALOG,
  MOBILE_ARENA_GAME_CAPABILITIES,
  mobileCapabilityForGame,
  type GameRendererFamily,
} from "@eslams/core-types";
import { createPlanBackedRenderer, type HitTestStrategy, type RenderPlanExecutor } from "./renderer-factory";
import type { PlanBackedFamilyRenderer, RenderPlanBuilder } from "./types";

export const RENDERER_FAMILIES = Object.freeze([
  "grid_3x3",
  "connect_four",
  "square_board",
  "go_board",
  "hex_board",
  "card_table",
  "dice_table",
  "auction_panel",
  "payoff_matrix",
  "control_benchmark",
  "economic_panel",
  "custom",
] as const satisfies readonly GameRendererFamily[]);

export type FamilyRendererDefinition = Readonly<{
  family: GameRendererFamily;
  buildPlan: RenderPlanBuilder;
  hitTest: HitTestStrategy;
}>;

export type FamilyRendererDefinitionRegistry = Readonly<Record<GameRendererFamily, FamilyRendererDefinition>>;
export type FamilyRendererRegistry = Readonly<Record<GameRendererFamily, PlanBackedFamilyRenderer>>;
export type GameRendererRegistry = Readonly<Record<string, PlanBackedFamilyRenderer>>;

const catalogFamilyBySlug = new Map(GAME_CATALOG.map((game) => [game.slug, game.renderSpec.rendererFamily]));

export function createFamilyRendererRegistry(
  definitions: FamilyRendererDefinitionRegistry,
  executePlan: RenderPlanExecutor,
): FamilyRendererRegistry {
  assertCompleteDefinitionRegistry(definitions);
  return Object.freeze(Object.fromEntries(RENDERER_FAMILIES.map((family) => {
    const definition = definitions[family];
    return [family, createPlanBackedRenderer(family, definition.buildPlan, definition.hitTest, executePlan)];
  }))) as FamilyRendererRegistry;
}

export function createGameRendererRegistry(families: FamilyRendererRegistry): GameRendererRegistry {
  return Object.freeze(Object.fromEntries(GAME_CATALOG.map((game) => [
    game.slug,
    families[game.renderSpec.rendererFamily],
  ])));
}

export function createArenaGameRendererRegistry(families: FamilyRendererRegistry): GameRendererRegistry {
  return Object.freeze(Object.fromEntries(MOBILE_ARENA_GAME_CAPABILITIES.map((capability) => [
    capability.gameSlug,
    families[capability.rendererFamily],
  ])));
}

export function rendererForGame(
  gameSlug: string,
  families: FamilyRendererRegistry,
): PlanBackedFamilyRenderer | null {
  const family = catalogFamilyBySlug.get(gameSlug);
  return family ? families[family] : null;
}

export function arenaRendererForGame(
  gameSlug: string,
  families: FamilyRendererRegistry,
): PlanBackedFamilyRenderer | null {
  const capability = mobileCapabilityForGame(gameSlug);
  if (!capability?.enabled) return null;
  return families[capability.rendererFamily];
}

export function assertCompleteDefinitionRegistry(definitions: FamilyRendererDefinitionRegistry): void {
  const keys = Object.keys(definitions);
  if (keys.length !== RENDERER_FAMILIES.length) {
    throw new TypeError(`Renderer definition registry must contain exactly ${RENDERER_FAMILIES.length} families.`);
  }
  for (const family of RENDERER_FAMILIES) {
    const definition = definitions[family];
    if (!definition || definition.family !== family) {
      throw new TypeError(`Renderer definition registry is missing a valid ${family} definition.`);
    }
  }
}
