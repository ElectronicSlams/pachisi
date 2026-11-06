import { GAME_CATALOG, isMobileArenaPlayable, type GameCatalogEntry } from "@eslams/core-types";

const DEFAULT_RECRUIT_GAME = requireCatalogGame("connect-four");

export function mobileArenaRecruitGame(
  requestedGame: string | null,
  similarTo: string | null,
): GameCatalogEntry {
  const exact = safeGameSlug(requestedGame) && isMobileArenaPlayable(requestedGame)
    ? GAME_CATALOG.find((game) => game.slug === requestedGame)
    : null;
  if (exact) return exact;
  const source = safeGameSlug(similarTo)
    ? GAME_CATALOG.find((game) => game.slug === similarTo)
    : null;
  const similar = source
    ? GAME_CATALOG.find((game) => game.slug !== source.slug
      && game.category === source.category
      && isMobileArenaPlayable(game.slug))
    : null;
  return similar ?? DEFAULT_RECRUIT_GAME;
}

function safeGameSlug(value: string | null): value is string {
  return typeof value === "string" && value.length <= 80
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

function requireCatalogGame(gameSlug: string): GameCatalogEntry {
  const game = GAME_CATALOG.find((entry) => entry.slug === gameSlug);
  if (!game) throw new Error("The mobile Arena recruit fallback is unavailable.");
  return game;
}
