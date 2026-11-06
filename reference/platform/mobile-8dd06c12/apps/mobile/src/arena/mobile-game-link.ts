import { GAME_CATALOG_BY_SLUG, isMobileArenaPlayable } from "@eslams/core-types";

export type MobileGameLinkDestination =
  | Readonly<{ surface: "arena"; gameSlug: string }>
  | Readonly<{ surface: "battlefield"; gameSlug: string }>
  | Readonly<{ surface: "arena_home" }>;

export function mobileGameLinkDestination(gameSlug: unknown): MobileGameLinkDestination {
  if (typeof gameSlug !== "string" || gameSlug.length > 80
    || !Object.hasOwn(GAME_CATALOG_BY_SLUG, gameSlug)) {
    return Object.freeze({ surface: "arena_home" });
  }
  return isMobileArenaPlayable(gameSlug)
    ? Object.freeze({ surface: "arena", gameSlug })
    : Object.freeze({ surface: "battlefield", gameSlug });
}
