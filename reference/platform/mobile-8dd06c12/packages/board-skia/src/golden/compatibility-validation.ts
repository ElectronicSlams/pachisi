import {
  GAME_CATALOG,
  MOBILE_ARENA_GAME_CAPABILITIES,
  MOBILE_ARENA_GAME_COUNT,
  MOBILE_GAME_CAPABILITY_MANIFEST,
  REPLAY_MANIFEST_ADAPTER_VERSION,
  REPLAY_MANIFEST_VERSION,
  THEME_TOKEN_REFERENCE_VERSION,
} from "@eslams/core-types";
import { THEME_IDS, THEMES } from "@eslams/theme-tokens";
import { RENDERER_FAMILIES } from "../registry-core";
import {
  FAMILY_THEME_GOLDEN_MATRIX,
  GAME_COMPATIBILITY_MATRIX,
  GOLDEN_PIXEL_TOLERANCE_MASKS,
  WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
} from "./compatibility-matrix";
import {
  BASELINE_COMPATIBILITY_STATES,
  RELEASE_BLOCKING_SEMANTIC_VIOLATIONS,
  type PixelDiffSample,
  type PixelDiffRole,
  type ReleaseBlockingSemanticViolation,
  type SemanticCompatibilityAudit,
} from "./compatibility-types";

const PROTECTED_PIXEL_ROLES = Object.freeze([
  "win-line",
  "hidden-information",
  "board-coordinate",
  "replay-derived-content",
  "theme-token-color",
] as const);

/** Throws on an incomplete, stale, or over-permissive release matrix. */
export function assertRendererCompatibilityMatrix(): void {
  assertFamilyThemeCoverage();
  assertGameCoverage();
  assertTolerancePolicy();
}

/** Pixel differences are rejected by default and admitted only by a named, bounded mask. */
export function pixelDifferenceIsWithinApprovedTolerance(sample: PixelDiffSample): boolean {
  if (sample.maxChannelDelta < 0 || sample.outlierPixelRatio < 0 || sample.outlierPixelRatio > 1) {
    return false;
  }
  return GOLDEN_PIXEL_TOLERANCE_MASKS.some((mask) =>
    (mask.allowedRoles as readonly PixelDiffRole[]).includes(sample.role)
    && sample.maxChannelDelta <= mask.maxChannelDelta
    && sample.outlierPixelRatio <= mask.maxOutlierPixelRatio,
  );
}

/** Semantic failures are evaluated before pixels; every returned value blocks local release. */
export function releaseBlockingViolationsForAudit(
  audit: SemanticCompatibilityAudit,
): readonly ReleaseBlockingSemanticViolation[] {
  const violations: ReleaseBlockingSemanticViolation[] = [];
  if (!audit.winLineCorrect) violations.push("wrong_win_line");
  if (!audit.hiddenInformationPublicSafe) violations.push("visibility_leak");
  if (!audit.coordinatesCorrect) violations.push("coordinate_error");
  if (!audit.legacyReplayAdapted) violations.push("replay_adapter_failure");
  if (!audit.themeContractSatisfied) violations.push("theme_contract_violation");
  return Object.freeze(violations);
}

export function auditBlocksRelease(audit: SemanticCompatibilityAudit): boolean {
  return releaseBlockingViolationsForAudit(audit).length > 0;
}

function assertFamilyThemeCoverage(): void {
  const expectedCount = RENDERER_FAMILIES.length * THEME_IDS.length;
  if (FAMILY_THEME_GOLDEN_MATRIX.length !== expectedCount) {
    throw new TypeError(`Golden matrix must contain exactly ${expectedCount} family/theme cells.`);
  }
  const ids = new Set<string>();
  for (const family of RENDERER_FAMILIES) {
    for (const themeId of THEME_IDS) {
      const cells = FAMILY_THEME_GOLDEN_MATRIX.filter(
        (cell) => cell.rendererFamily === family && cell.themeId === themeId,
      );
      if (cells.length !== 1) {
        throw new TypeError(`Golden matrix requires one ${family}/${themeId} cell.`);
      }
      const [cell] = cells;
      if (
        !cell
        || cell.expectedThemeTokenVersion !== THEME_TOKEN_REFERENCE_VERSION
        || cell.expectedMaterialSurface !== THEMES[themeId].material.boardSurface
      ) {
        throw new TypeError(`Golden matrix theme contract is stale for ${family}/${themeId}.`);
      }
      for (const id of [cell.semanticBaselineId, cell.goldenImageId]) {
        if (ids.has(id)) throw new TypeError(`Duplicate golden artifact id: ${id}.`);
        ids.add(id);
      }
    }
  }
}

function assertGameCoverage(): void {
  if (
    MOBILE_ARENA_GAME_COUNT !== 35
    || GAME_COMPATIBILITY_MATRIX.length
      !== MOBILE_ARENA_GAME_COUNT + WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS.length
  ) {
    throw new TypeError(
      "Compatibility matrix must contain the 35 mobile Arena games plus the declared watch/replay games.",
    );
  }
  const expectedSlugs = new Set([
    ...MOBILE_ARENA_GAME_CAPABILITIES.map(({ gameSlug }) => gameSlug),
    ...WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
  ]);
  for (const gameSlug of WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS) {
    const capability = MOBILE_GAME_CAPABILITY_MANIFEST[gameSlug];
    if (!capability || capability.enabled || !capability.supportsOfflineReplay) {
      throw new TypeError(`${gameSlug} must remain watch/replay-only in the compatibility corpus.`);
    }
  }
  const seen = new Set<string>();
  for (const game of GAME_COMPATIBILITY_MATRIX) {
    if (!expectedSlugs.has(game.gameSlug) || seen.has(game.gameSlug)) {
      throw new TypeError(`Unexpected or duplicate compatibility game: ${game.gameSlug}.`);
    }
    seen.add(game.gameSlug);
    const capability = MOBILE_GAME_CAPABILITY_MANIFEST[game.gameSlug];
    if (!capability || capability.rendererFamily !== game.rendererFamily) {
      throw new TypeError(`Renderer family mismatch for ${game.gameSlug}.`);
    }
    for (const required of BASELINE_COMPATIBILITY_STATES) {
      if (!game.requiredStates.includes(required)) {
        throw new TypeError(`${game.gameSlug} is missing required ${required} coverage.`);
      }
    }
    for (const conditional of game.conditionalStates) {
      if (!game.requiredStates.includes(conditional)) {
        throw new TypeError(`${game.gameSlug} does not include conditional ${conditional} in required states.`);
      }
    }
    const catalog = GAME_CATALOG.find(({ slug }) => slug === game.gameSlug);
    if (!catalog) throw new TypeError(`Catalog entry missing for ${game.gameSlug}.`);
    if (catalog.renderSpec.hiddenInfo) {
      if (!game.requiredStates.includes("hidden_information") || !game.requiredStates.includes("reveal")) {
        throw new TypeError(`${game.gameSlug} must cover both hidden and reveal states.`);
      }
      if (game.accessibility.hiddenInformationPolicy === "not_applicable") {
        throw new TypeError(`${game.gameSlug} needs an accessibility visibility policy.`);
      }
    }
    if (
      game.legacyReplay.sourceSchemaVersion !== 1
      || game.legacyReplay.expectedCanonicalSchemaVersion !== REPLAY_MANIFEST_VERSION
      || game.legacyReplay.expectedAdapterVersion !== REPLAY_MANIFEST_ADAPTER_VERSION
      || !game.legacyReplay.publicSafetyValidationRequired
      || !game.legacyReplay.stateHashValidationRequired
    ) {
      throw new TypeError(`${game.gameSlug} has an unsafe legacy replay expectation.`);
    }
    if (
      !game.accessibility.representationRequired
      || !game.accessibility.actionableTargetsRequireLabels
      || !game.accessibility.terminalSummaryRequired
      || game.accessibility.hiddenValuesMayAppearInLabels
    ) {
      throw new TypeError(`${game.gameSlug} has an incomplete accessibility expectation.`);
    }
  }
  if ([...expectedSlugs].some((slug) => !seen.has(slug))) {
    throw new TypeError("Compatibility matrix is missing a mobile Arena game.");
  }
}

function assertTolerancePolicy(): void {
  const causes = new Set(GOLDEN_PIXEL_TOLERANCE_MASKS.map(({ cause }) => cause));
  if (
    GOLDEN_PIXEL_TOLERANCE_MASKS.length !== 2
    || causes.size !== 2
    || !causes.has("shader-noise")
    || !causes.has("font-rasterization")
  ) {
    throw new TypeError("Only shader-noise and font-rasterization tolerance masks are allowed.");
  }
  for (const mask of GOLDEN_PIXEL_TOLERANCE_MASKS) {
    if (
      mask.maxChannelDelta <= 0
      || mask.maxChannelDelta > 255
      || mask.maxOutlierPixelRatio < 0
      || mask.maxOutlierPixelRatio > 1
    ) {
      throw new TypeError(`Tolerance mask ${mask.id} is not bounded.`);
    }
    if (mask.allowedRoles.some((role) => PROTECTED_PIXEL_ROLES.includes(role as (typeof PROTECTED_PIXEL_ROLES)[number]))) {
      throw new TypeError(`Tolerance mask ${mask.id} covers release-blocking semantic content.`);
    }
  }
  if (RELEASE_BLOCKING_SEMANTIC_VIOLATIONS.length !== 5) {
    throw new TypeError("Release-blocking semantic violation policy is incomplete.");
  }
}
