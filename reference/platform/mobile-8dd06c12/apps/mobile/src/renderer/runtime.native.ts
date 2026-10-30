import {
  ARENA_GAME_RENDERER_REGISTRY,
  FAMILY_RENDERER_REGISTRY,
  GAME_RENDERER_REGISTRY,
} from "@eslams/board-skia/native";
import { assertMobileRendererRuntime } from "./runtime-contract";

/** Importing this module compiles the pinned SkSL material and validates every native registry. */
export const mobileRendererRuntime = assertMobileRendererRuntime({
  familyCount: Object.keys(FAMILY_RENDERER_REGISTRY).length,
  arenaGameCount: Object.keys(ARENA_GAME_RENDERER_REGISTRY).length,
  catalogGameCount: Object.keys(GAME_RENDERER_REGISTRY).length,
  nativeReady: true,
});
