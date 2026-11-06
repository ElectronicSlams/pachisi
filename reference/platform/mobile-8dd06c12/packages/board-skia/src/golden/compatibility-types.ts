import type { GameRendererFamily } from "@eslams/core-types";
import type { BoardSurface, ThemeId } from "@eslams/theme-tokens";

/** Stable fixture states required for every Arena renderer. */
export const BASELINE_COMPATIBILITY_STATES = Object.freeze([
  "initial",
  "active_turn",
  "last_action",
  "terminal_outcome",
  "legacy_replay",
  "reduced_motion",
  "accessibility",
] as const);

export type BaselineCompatibilityState = (typeof BASELINE_COMPATIBILITY_STATES)[number];

/** Extra fixtures are opt-in only when the game mechanic makes them meaningful. */
export const CONDITIONAL_COMPATIBILITY_STATES = Object.freeze([
  "capture",
  "reveal",
  "hidden_information",
] as const);

export type ConditionalCompatibilityState = (typeof CONDITIONAL_COMPATIBILITY_STATES)[number];
export type CompatibilityState = BaselineCompatibilityState | ConditionalCompatibilityState;

export type CoordinateAccessibilityPolicy = "coordinates_required" | "spatial_labels_required" | "not_applicable";
export type HiddenInformationAccessibilityPolicy =
  | "not_applicable"
  | "masked_until_reveal"
  | "owner_inverted_mask";

export type AccessibilityExpectation = Readonly<{
  representationRequired: true;
  actionableTargetsRequireLabels: true;
  terminalSummaryRequired: true;
  coordinatePolicy: CoordinateAccessibilityPolicy;
  hiddenInformationPolicy: HiddenInformationAccessibilityPolicy;
  hiddenValuesMayAppearInLabels: false;
}>;

export type LegacyReplayExpectation = Readonly<{
  sourceSchemaVersion: 1;
  expectedCanonicalSchemaVersion: "eslams.replay.v1";
  expectedAdapterVersion: "eslams.replay-adapter.v1";
  publicSafetyValidationRequired: true;
  stateHashValidationRequired: true;
}>;

export type GameCompatibilityEntry<TSlug extends string = string> = Readonly<{
  gameSlug: TSlug;
  rendererFamily: GameRendererFamily;
  requiredStates: readonly CompatibilityState[];
  conditionalStates: readonly ConditionalCompatibilityState[];
  accessibility: AccessibilityExpectation;
  legacyReplay: LegacyReplayExpectation;
}>;

export type FamilyThemeGoldenCell = Readonly<{
  rendererFamily: GameRendererFamily;
  themeId: ThemeId;
  semanticBaselineId: string;
  goldenImageId: string;
  expectedThemeTokenVersion: "eslams.theme-tokens.v1";
  expectedMaterialSurface: BoardSurface;
}>;

export const PIXEL_DIFF_ROLES = Object.freeze([
  "material-surface",
  "ambient-material-detail",
  "label-glyph",
  "coordinate-glyph",
  "count-glyph",
  "win-line",
  "hidden-information",
  "board-coordinate",
  "replay-derived-content",
  "theme-token-color",
] as const);

export type PixelDiffRole = (typeof PIXEL_DIFF_ROLES)[number];
export type ApprovedToleranceCause = "shader-noise" | "font-rasterization";

export type PixelToleranceMask = Readonly<{
  id: string;
  cause: ApprovedToleranceCause;
  /** Masks are derived from semantic command bounds, never arbitrary image rectangles. */
  maskSource: "material-layer-minus-command-bounds" | "text-command-glyph-bounds";
  allowedRoles: readonly PixelDiffRole[];
  maxChannelDelta: number;
  maxOutlierPixelRatio: number;
}>;

export type PixelDiffSample = Readonly<{
  role: PixelDiffRole;
  maxChannelDelta: number;
  outlierPixelRatio: number;
}>;

export const RELEASE_BLOCKING_SEMANTIC_VIOLATIONS = Object.freeze([
  "wrong_win_line",
  "visibility_leak",
  "coordinate_error",
  "replay_adapter_failure",
  "theme_contract_violation",
] as const);

export type ReleaseBlockingSemanticViolation =
  (typeof RELEASE_BLOCKING_SEMANTIC_VIOLATIONS)[number];

export type SemanticCompatibilityAudit = Readonly<{
  winLineCorrect: boolean;
  hiddenInformationPublicSafe: boolean;
  coordinatesCorrect: boolean;
  legacyReplayAdapted: boolean;
  themeContractSatisfied: boolean;
}>;

export type PinnedGoldenReferenceEnvironment = Readonly<{
  schemaVersion: "eslams.renderer-golden-reference.v1";
  id: "eslams-canvaskit-cpu-v1";
  comparisonOrder: readonly ["semantic", "pixel"];
  node: "24.18.0";
  reactNativeSkia: "2.6.2";
  canvasKit: "0.41.0";
  backend: "canvaskit-wasm-cpu";
  colorSpace: "srgb";
  surfaceScale: 1;
  font: Readonly<{
    family: "Inter";
    weight: 400;
    package: "@expo-google-fonts/inter@0.4.2";
    sha256: "a414b48aa577ef2c62ebb135341ddeef33ee26a4f5dc9f787f93c1aab08ebb50";
  }>;
  semanticFixtureViewport: Readonly<{ width: 390; height: 480; pixelRatio: 3 }>;
  output: Readonly<{ width: 390; height: 480; format: "png" }>;
}>;
