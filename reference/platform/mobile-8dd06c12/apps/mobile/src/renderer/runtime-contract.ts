import { GAME_CATALOG, MOBILE_ARENA_GAME_COUNT } from "@eslams/core-types";

export const MOBILE_RENDERER_FAMILY_COUNT = 12 as const;

export type MobileRendererRuntime = Readonly<{
  familyCount: number;
  arenaGameCount: number;
  catalogGameCount: number;
  nativeReady: boolean;
}>;

export function assertMobileRendererRuntime(runtime: MobileRendererRuntime): MobileRendererRuntime {
  if (runtime.familyCount !== MOBILE_RENDERER_FAMILY_COUNT) {
    throw new Error(`Mobile renderer registry requires ${MOBILE_RENDERER_FAMILY_COUNT} families.`);
  }
  if (runtime.arenaGameCount !== MOBILE_ARENA_GAME_COUNT) {
    throw new Error(`Mobile Arena renderer registry requires ${MOBILE_ARENA_GAME_COUNT} games.`);
  }
  if (runtime.catalogGameCount !== GAME_CATALOG.length) {
    throw new Error(`Watch/replay renderer registry requires all ${GAME_CATALOG.length} catalog games.`);
  }
  return Object.freeze({ ...runtime });
}
