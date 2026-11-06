import type { BoardScene } from "@eslams/game-render-contract";
import type { AccentCarryingRole, ThemeTokens } from "@eslams/theme-tokens";
import { qualityProfile, resolvedMotionProgress } from "./motion";
import type { MaterialLayer, MotionState, Rect, RenderPlan } from "./types";

const BLOOM_ROLES: readonly AccentCarryingRole[] = Object.freeze([
  "last-move",
  "active-seat",
  "active-dock",
  "result-sweep",
] as const);

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


/** Removes the accessibility coordinate prefix while preserving the public semantic value. */
export function publicCellValue(label: string): string {
  "worklet";
  return label.replace(/^Row\s+\d+,\s*column\s+\d+:\s*/iu, "").trim();
}

export function materialLayer(theme: ThemeTokens, motion: MotionState, rect: Rect): MaterialLayer {
  "worklet";
  return {
    surface: theme.material.boardSurface,
    rect,
    baseColor: theme.color.boardBackground,
    accentColor: theme.color.accent,
    detail: qualityProfile(motion).shaderDetail,
    phase: resolvedMotionProgress(motion),
  };
}

function assertFiniteRect(rect: Rect, label: string): void {
  "worklet";
  if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
    throw new TypeError(`Render ${label} rectangle must be finite.`);
  }
}

function isUnit(value: number): boolean {
  "worklet";
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function assertFinitePoint(point: Readonly<{ x: number; y: number }>, label: string): void {
  "worklet";
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(`Render ${label} point must be finite.`);
  }
}

function assertCommandGeometry(command: RenderPlan["commands"][number]): void {
  "worklet";
  switch (command.kind) {
    case "rect":
    case "rounded-rect":
      assertFiniteRect(command.rect, command.id);
      if (command.rect.width < 0 || command.rect.height < 0
        || (command.kind === "rounded-rect" && (!Number.isFinite(command.radius) || command.radius < 0))) {
        throw new TypeError(`Render command ${command.id} has invalid rectangle geometry.`);
      }
      return;
    case "circle":
      assertFinitePoint(command.center, command.id);
      if (!Number.isFinite(command.radius) || command.radius < 0) {
        throw new TypeError(`Render command ${command.id} has an invalid radius.`);
      }
      return;
    case "line":
      assertFinitePoint(command.from, command.id);
      assertFinitePoint(command.to, command.id);
      return;
    case "arc":
      assertFiniteRect(command.rect, command.id);
      if (command.rect.width < 0 || command.rect.height < 0
        || !Number.isFinite(command.startDegrees) || !Number.isFinite(command.sweepDegrees)) {
        throw new TypeError(`Render command ${command.id} has invalid arc geometry.`);
      }
      return;
    case "polygon":
      if (command.points.length < (command.closed ? 3 : 2)) {
        throw new TypeError(`Render command ${command.id} has too few polygon points.`);
      }
      command.points.forEach((point) => assertFinitePoint(point, command.id));
      return;
    case "text":
      assertFinitePoint(command.at, command.id);
      if (!command.text || !Number.isFinite(command.size) || command.size <= 0) {
        throw new TypeError(`Render command ${command.id} has invalid text geometry.`);
      }
  }
}

export function validateRenderPlan(plan: RenderPlan, scene: BoardScene, motion: MotionState): void {
  "worklet";
  if (plan.family !== scene.rendererFamily || plan.gameSlug !== scene.gameSlug) {
    throw new TypeError("Render plan identity does not match its semantic scene.");
  }
  if (!Number.isFinite(plan.viewport.width) || plan.viewport.width <= 0
    || !Number.isFinite(plan.viewport.height) || plan.viewport.height <= 0) {
    throw new TypeError("Render plan viewport must be finite and positive.");
  }
  assertFiniteRect(plan.material.rect, "material");
  if (plan.material.rect.width <= 0 || plan.material.rect.height <= 0
    || !isUnit(plan.material.detail) || !isUnit(plan.material.phase)) {
    throw new TypeError("Render material geometry, detail, or phase is invalid.");
  }
  const commandIds = new Set<string>();
  for (const command of plan.commands) {
    if (!command.id || commandIds.has(command.id)) throw new TypeError("Render commands require unique ids.");
    commandIds.add(command.id);
    assertCommandGeometry(command);
    if (!command.style.color.trim()
      || (command.style.alpha !== undefined && !isUnit(command.style.alpha))
      || (command.style.strokeWidth !== undefined
        && (!Number.isFinite(command.style.strokeWidth) || command.style.strokeWidth <= 0))) {
      throw new TypeError("Render command style is invalid.");
    }
    if (command.style.glow && (!command.style.accentRole || !BLOOM_ROLES.includes(command.style.accentRole))) {
      throw new TypeError("Bloom is restricted to last move, active seat, active dock, and result sweep roles.");
    }
    if (motion.reducedMotion && command.style.trail) {
      throw new TypeError("Reduced-motion plans may not contain motion trails.");
    }
  }
  const actionIds = new Set(scene.actionTargets.map((target) => target.id));
  const hitTargetIds = new Set<string>();
  for (const zone of plan.hitZones) {
    assertFiniteRect(zone.rect, `hit zone ${zone.id}`);
    if (!zone.id || zone.rect.width <= 0 || zone.rect.height <= 0) {
      throw new TypeError("Render hit-zone geometry is invalid.");
    }
    if (!actionIds.has(zone.actionTargetId) || hitTargetIds.has(zone.actionTargetId)) {
      throw new TypeError("Render hit zones must map one-to-one to declared scene action targets.");
    }
    hitTargetIds.add(zone.actionTargetId);
  }
  if (hitTargetIds.size !== actionIds.size) {
    throw new TypeError("Every declared scene action target requires exactly one render hit zone.");
  }
}

export function planMetadata(
  scene: BoardScene,
  motion: MotionState,
  additions: Readonly<Record<string, string | number | boolean | null>> = {},
): RenderPlan["metadata"] {
  "worklet";
  return {
    terminal: scene.summary.terminal,
    motionBeat: motion.beat,
    reducedMotion: motion.reducedMotion,
    qualityTier: motion.qualityTier,
    ...additions,
  };
}
