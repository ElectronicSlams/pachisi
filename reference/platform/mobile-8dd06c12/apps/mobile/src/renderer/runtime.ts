import { GAME_CATALOG, MOBILE_ARENA_GAME_COUNT } from "@eslams/core-types";
import { FAMILY_RENDERER_DEFINITIONS } from "@eslams/board-skia";
import { assertMobileRendererRuntime } from "./runtime-contract";

/** Pure fallback used by web exports and Node tests. Native platforms resolve runtime.native.ts. */
export const mobileRendererRuntime = assertMobileRendererRuntime({
  familyCount: Object.keys(FAMILY_RENDERER_DEFINITIONS).length,
  arenaGameCount: MOBILE_ARENA_GAME_COUNT,
  catalogGameCount: GAME_CATALOG.length,
  nativeReady: false,
});
