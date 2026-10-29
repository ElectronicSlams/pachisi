import {
  GAME_CATALOG,
  MOBILE_ARENA_CATEGORY_COUNTS,
  MOBILE_ARENA_GAME_CAPABILITIES,
  MOBILE_ARENA_GAME_COUNT,
  type GameCatalogEntry,
  type MobileGameCategory,
} from "@eslams/core-types";

export const MOBILE_ARENA_WIDE_GRID_MIN_WIDTH = 390;

export const MOBILE_ARENA_HERO_GAME_SLUGS = Object.freeze([
  "tic-tac-toe",
  "chess",
  "connect-four",
  "no-limit-texas-holdem",
] as const);

export type MobileArenaFilter = "all" | MobileGameCategory;

export type MobileArenaDiscoverySection =
  | "continue"
  | "prepared"
  | "hero"
  | "opponent"
  | "favourites"
  | "recents"
  | "filters"
  | "grid";

export type MobileArenaFilterChip = Readonly<{
  filter: MobileArenaFilter;
  label: "All" | "Board" | "Card" | "Social";
  count: number;
}>;

const capabilityBySlug = new Map(
  MOBILE_ARENA_GAME_CAPABILITIES.map((capability) => [capability.gameSlug, capability]),
);

export const MOBILE_ARENA_GAMES = Object.freeze(GAME_CATALOG.filter(
  (game) => capabilityBySlug.has(game.slug),
));

export const MOBILE_ARENA_FILTER_CHIPS: readonly MobileArenaFilterChip[] = Object.freeze([
  Object.freeze({ filter: "all", label: "All", count: MOBILE_ARENA_GAME_COUNT }),
  Object.freeze({ filter: "board", label: "Board", count: MOBILE_ARENA_CATEGORY_COUNTS.board }),
  Object.freeze({ filter: "card", label: "Card", count: MOBILE_ARENA_CATEGORY_COUNTS.card }),
  Object.freeze({ filter: "social", label: "Social", count: MOBILE_ARENA_CATEGORY_COUNTS.social }),
]);

if (MOBILE_ARENA_GAMES.length !== MOBILE_ARENA_GAME_COUNT) {
  throw new TypeError("The mobile Arena discovery catalogue differs from its capability manifest.");
}

export function mobileArenaGamesForFilter(filter: MobileArenaFilter): readonly GameCatalogEntry[] {
  if (filter === "all") return MOBILE_ARENA_GAMES;
  return MOBILE_ARENA_GAMES.filter((game) => capabilityBySlug.get(game.slug)?.category === filter);
}

export function mobileArenaDiscoverySections(input: Readonly<{
  hasActiveSession: boolean;
  hasPreparedSetup: boolean;
  favouriteCount: number;
  recentCount: number;
}>): readonly MobileArenaDiscoverySection[] {
  const sections: MobileArenaDiscoverySection[] = [];
  if (input.hasActiveSession) sections.push("continue");
  if (input.hasPreparedSetup) sections.push("prepared");
  if (!input.hasActiveSession && !input.hasPreparedSetup && input.recentCount === 0) sections.push("hero");
  if (input.favouriteCount > 0) sections.push("favourites");
  if (input.recentCount > 0) sections.push("recents");
  sections.push("opponent");
  sections.push("filters", "grid");
  return Object.freeze(sections);
}

export function mobileArenaGameForSlug(gameSlug: string | null): GameCatalogEntry | null {
  if (!gameSlug) return null;
  return MOBILE_ARENA_GAMES.find((game) => game.slug === gameSlug) ?? null;
}

export function mobileArenaGamesForSlugs(slugs: readonly string[]): readonly GameCatalogEntry[] {
  const requested = new Set(slugs);
  return MOBILE_ARENA_GAMES.filter((game) => requested.has(game.slug));
}

export function mobileArenaRecentGames(
  recent: readonly Readonly<{ gameSlug: string; openedAt: number }>[],
): readonly GameCatalogEntry[] {
  const catalog = new Map(MOBILE_ARENA_GAMES.map((game) => [game.slug, game]));
  return recent.flatMap((entry) => {
    const game = catalog.get(entry.gameSlug);
    return game ? [game] : [];
  });
}

export function mobileArenaGridColumnCount(viewportWidth: number): 2 | 3 {
  return Number.isFinite(viewportWidth) && viewportWidth >= MOBILE_ARENA_WIDE_GRID_MIN_WIDTH ? 3 : 2;
}

export function nextMobileArenaHeroGame(
  previousGameSlug: string | null,
  entropy: number,
): GameCatalogEntry {
  const candidates = MOBILE_ARENA_HERO_GAME_SLUGS.filter((slug) => slug !== previousGameSlug);
  const safeEntropy = Number.isFinite(entropy) ? Math.abs(Math.trunc(entropy)) : 0;
  const selectedSlug = candidates[safeEntropy % candidates.length] ?? MOBILE_ARENA_HERO_GAME_SLUGS[0];
  const game = MOBILE_ARENA_GAMES.find((candidate) => candidate.slug === selectedSlug);
  if (!game) throw new TypeError("A rotating mobile Arena hero is unavailable.");
  return game;
}

export function mobileArenaVariantLabel(game: GameCatalogEntry): string {
  if (game.slug === "go") return "9×9";
  if (game.variant === "standard") return "standard";
  return game.variant
    .replace(/^core_/u, "")
    .replaceAll("_", " ")
    .replace(/\bs17\b/gu, "S17")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
