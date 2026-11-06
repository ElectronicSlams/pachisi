import {
  LEGACY_ARENA_REPLAY_SCHEMA_VERSION,
  REPLAY_MANIFEST_ADAPTER_VERSION,
  REPLAY_MANIFEST_VERSION,
  THEME_TOKEN_REFERENCE_VERSION,
  type GameRendererFamily,
} from "@eslams/core-types";
import { THEME_IDS, THEMES, type ThemeId } from "@eslams/theme-tokens";
import { RENDERER_FAMILIES } from "../registry-core";
import {
  BASELINE_COMPATIBILITY_STATES,
  type AccessibilityExpectation,
  type ConditionalCompatibilityState,
  type CoordinateAccessibilityPolicy,
  type FamilyThemeGoldenCell,
  type GameCompatibilityEntry,
  type HiddenInformationAccessibilityPolicy,
  type LegacyReplayExpectation,
  type PinnedGoldenReferenceEnvironment,
  type PixelToleranceMask,
} from "./compatibility-types";

export const PINNED_GOLDEN_REFERENCE_ENVIRONMENT = Object.freeze({
  schemaVersion: "eslams.renderer-golden-reference.v1",
  id: "eslams-canvaskit-cpu-v1",
  comparisonOrder: Object.freeze(["semantic", "pixel"] as const),
  node: "24.18.0",
  reactNativeSkia: "2.6.2",
  canvasKit: "0.41.0",
  backend: "canvaskit-wasm-cpu",
  colorSpace: "srgb",
  surfaceScale: 1,
  font: Object.freeze({
    family: "Inter",
    weight: 400,
    package: "@expo-google-fonts/inter@0.4.2",
    sha256: "a414b48aa577ef2c62ebb135341ddeef33ee26a4f5dc9f787f93c1aab08ebb50",
  }),
  semanticFixtureViewport: Object.freeze({ width: 390, height: 480, pixelRatio: 3 }),
  output: Object.freeze({ width: 390, height: 480, format: "png" }),
} as const satisfies PinnedGoldenReferenceEnvironment);

/** Numeric bounds consumed by both the abstract policy and the offscreen runner. */
export const GOLDEN_PIXEL_TOLERANCE_LIMITS = Object.freeze({
  "shader-noise": Object.freeze({ maxChannelDelta: 2, maxOutlierPixelRatio: 0 }),
  "font-rasterization": Object.freeze({ maxChannelDelta: 64, maxOutlierPixelRatio: 0.12 }),
} as const);

/**
 * Pixel comparison is exact outside these two semantic masks. In particular,
 * neither mask can cover gameplay geometry, visibility, replay content, or
 * theme-token colors.
 */
export const GOLDEN_PIXEL_TOLERANCE_MASKS = Object.freeze([
  Object.freeze({
    id: "material-shader-noise-v1",
    cause: "shader-noise",
    maskSource: "material-layer-minus-command-bounds",
    allowedRoles: Object.freeze(["material-surface", "ambient-material-detail"] as const),
    ...GOLDEN_PIXEL_TOLERANCE_LIMITS["shader-noise"],
  }),
  Object.freeze({
    id: "font-rasterization-v1",
    cause: "font-rasterization",
    maskSource: "text-command-glyph-bounds",
    allowedRoles: Object.freeze(["label-glyph", "coordinate-glyph", "count-glyph"] as const),
    ...GOLDEN_PIXEL_TOLERANCE_LIMITS["font-rasterization"],
  }),
] as const satisfies readonly PixelToleranceMask[]);

/** Canonical 12-family x 6-theme approval surface (72 independently keyed cells). */
export const FAMILY_THEME_GOLDEN_MATRIX: readonly FamilyThemeGoldenCell[] = Object.freeze(
  RENDERER_FAMILIES.flatMap((rendererFamily) => THEME_IDS.map((themeId) => Object.freeze({
    rendererFamily,
    themeId,
    semanticBaselineId: `family-themes/${rendererFamily}/${themeId}`,
    goldenImageId: `family-themes/${rendererFamily}/${themeId}.png`,
    expectedThemeTokenVersion: THEME_TOKEN_REFERENCE_VERSION,
    expectedMaterialSurface: THEMES[themeId].material.boardSurface,
  }))),
);

const LEGACY_REPLAY_EXPECTATION = Object.freeze({
  sourceSchemaVersion: LEGACY_ARENA_REPLAY_SCHEMA_VERSION,
  expectedCanonicalSchemaVersion: REPLAY_MANIFEST_VERSION,
  expectedAdapterVersion: REPLAY_MANIFEST_ADAPTER_VERSION,
  publicSafetyValidationRequired: true,
  stateHashValidationRequired: true,
} as const satisfies LegacyReplayExpectation);

const accessibility = (
  coordinatePolicy: CoordinateAccessibilityPolicy,
  hiddenInformationPolicy: HiddenInformationAccessibilityPolicy,
): AccessibilityExpectation => Object.freeze({
  representationRequired: true,
  actionableTargetsRequireLabels: true,
  terminalSummaryRequired: true,
  coordinatePolicy,
  hiddenInformationPolicy,
  hiddenValuesMayAppearInLabels: false,
});

const entry = <const TSlug extends string>(
  gameSlug: TSlug,
  rendererFamily: GameRendererFamily,
  conditionalStates: readonly ConditionalCompatibilityState[],
  coordinatePolicy: CoordinateAccessibilityPolicy,
  hiddenInformationPolicy: HiddenInformationAccessibilityPolicy = "not_applicable",
): GameCompatibilityEntry<TSlug> => Object.freeze({
  gameSlug,
  rendererFamily,
  conditionalStates: Object.freeze([...conditionalStates]),
  requiredStates: Object.freeze([...BASELINE_COMPATIBILITY_STATES, ...conditionalStates]),
  accessibility: accessibility(coordinatePolicy, hiddenInformationPolicy),
  legacyReplay: LEGACY_REPLAY_EXPECTATION,
});

/**
 * Non-interactive games whose public watch/replay renderer remains part of the
 * release golden corpus. These are deliberately not mobile Arena start
 * capabilities.
 */
export const WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS = Object.freeze([
  "blackjack",
] as const);

/**
 * Every mobile Arena game plus the explicitly named watch/replay compatibility
 * games is listed here. Conditional fixtures are intentionally per-game: an
 * empty list means capture/reveal/hidden state is not meaningful for that
 * game, not that coverage was forgotten.
 */
export const GAME_COMPATIBILITY_MATRIX = Object.freeze([
  entry("chess", "square_board", ["capture"], "coordinates_required"),
  entry("go", "go_board", ["capture"], "coordinates_required"),
  entry("connect-four", "connect_four", [], "coordinates_required"),
  entry("tic-tac-toe", "grid_3x3", [], "coordinates_required"),
  entry("othello", "square_board", ["capture"], "coordinates_required"),
  entry("checkers", "square_board", ["capture"], "coordinates_required"),
  entry("shogi", "custom", ["capture"], "coordinates_required"),
  entry("xiangqi", "custom", ["capture"], "coordinates_required"),
  entry("gomoku", "go_board", [], "coordinates_required"),
  entry("hex", "hex_board", [], "coordinates_required"),
  entry("mancala", "custom", ["capture"], "spatial_labels_required"),
  entry("nine-mens-morris", "custom", ["capture"], "spatial_labels_required"),
  entry("pentago", "custom", [], "spatial_labels_required"),
  entry("ultimate-tic-tac-toe", "grid_3x3", [], "coordinates_required"),
  entry(
    "battleship",
    "square_board",
    ["hidden_information", "reveal"],
    "coordinates_required",
    "masked_until_reveal",
  ),
  entry("backgammon", "custom", ["capture"], "spatial_labels_required"),
  entry("blackjack", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("limit-texas-holdem", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("no-limit-texas-holdem", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("gin-rummy", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("mahjong", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("dou-dizhu", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("bridge", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("hearts", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("spades", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("euchre", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("cribbage", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("crazy-eights", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("hanabi", "card_table", ["hidden_information", "reveal"], "not_applicable", "owner_inverted_mask"),
  entry("prisoners-dilemma", "payoff_matrix", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry(
    "bargaining",
    "economic_panel",
    ["hidden_information", "reveal"],
    "not_applicable",
    "masked_until_reveal",
  ),
  entry(
    "negotiation",
    "economic_panel",
    ["hidden_information", "reveal"],
    "not_applicable",
    "masked_until_reveal",
  ),
  entry(
    "first-price-sealed-bid-auction",
    "auction_panel",
    ["hidden_information", "reveal"],
    "not_applicable",
    "masked_until_reveal",
  ),
  entry("liars-dice", "dice_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("goofspiel", "card_table", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
  entry("rock-paper-scissors", "payoff_matrix", ["hidden_information", "reveal"], "not_applicable", "masked_until_reveal"),
] as const);

export type MobileArenaCompatibilityGameSlug = (typeof GAME_COMPATIBILITY_MATRIX)[number]["gameSlug"];

export const GAME_COMPATIBILITY_BY_SLUG = Object.freeze(Object.fromEntries(
  GAME_COMPATIBILITY_MATRIX.map((game) => [game.gameSlug, game]),
)) as Readonly<Record<MobileArenaCompatibilityGameSlug, (typeof GAME_COMPATIBILITY_MATRIX)[number]>>;

export function familyThemeGoldenCell(
  rendererFamily: GameRendererFamily,
  themeId: ThemeId,
): FamilyThemeGoldenCell {
  const cell = FAMILY_THEME_GOLDEN_MATRIX.find(
    (candidate) => candidate.rendererFamily === rendererFamily && candidate.themeId === themeId,
  );
  if (!cell) throw new TypeError(`Missing golden matrix cell for ${rendererFamily}/${themeId}.`);
  return cell;
}
