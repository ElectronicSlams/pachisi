import { FAMILY_RENDERER_DEFINITIONS } from "./definitions";
import {
  createArenaGameRendererRegistry,
  createFamilyRendererRegistry,
  createGameRendererRegistry,
} from "./registry-core";
import { drawRenderPlan } from "./skia-executor";

export * from "./index";
export { drawRenderPlan } from "./skia-executor";

export const FAMILY_RENDERER_REGISTRY = createFamilyRendererRegistry(
  FAMILY_RENDERER_DEFINITIONS,
  drawRenderPlan,
);

/** Every catalog game that can appear in play, watch, replay, or Battlefield. */
export const GAME_RENDERER_REGISTRY = createGameRendererRegistry(FAMILY_RENDERER_REGISTRY);

/** The exact 35-game mobile Arena subset; watch/replay-only games remain in the full registry. */
export const ARENA_GAME_RENDERER_REGISTRY = createArenaGameRendererRegistry(FAMILY_RENDERER_REGISTRY);
