import { GAME_CATALOG, MOBILE_ARENA_GAME_COUNT } from "@eslams/core-types";
import { assertMobileRendererRuntime, MOBILE_RENDERER_FAMILY_COUNT } from "./runtime-contract";

describe("mobile renderer runtime gate", () => {
  const valid = {
    familyCount: MOBILE_RENDERER_FAMILY_COUNT,
    arenaGameCount: MOBILE_ARENA_GAME_COUNT,
    catalogGameCount: GAME_CATALOG.length,
    nativeReady: true,
  } as const;

  it("accepts only the complete family, Arena, and watch/replay registries", () => {
    expect(assertMobileRendererRuntime(valid)).toEqual(valid);
    expect(() => assertMobileRendererRuntime({ ...valid, familyCount: 11 })).toThrow(/12 families/u);
    expect(() => assertMobileRendererRuntime({
      ...valid,
      arenaGameCount: MOBILE_ARENA_GAME_COUNT - 1,
    })).toThrow(new RegExp(`${MOBILE_ARENA_GAME_COUNT} games`, "u"));
    expect(() => assertMobileRendererRuntime({ ...valid, catalogGameCount: GAME_CATALOG.length - 1 })).toThrow(/all/u);
  });
});
