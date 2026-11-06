import type { BoardSceneNode } from "@eslams/game-render-contract";
import {
  gridLayouts,
  hitTestGrid,
  hitZonesForLayouts,
  rendererBounds,
} from "../geometry";
import { qualityProfile, resolvedMotionProgress, settleProgress } from "../motion";
import { materialLayer, planMetadata } from "../plan";
import type { HitTestStrategy } from "../renderer-factory";
import type { RenderCommand, RenderPlanBuilder } from "../types";

const EMPTY_VALUES = new Set(["", ".", "-", "0", "empty", "none", "vacant"]);

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function semanticValue(label: string): string {
  "worklet";
  const separator = label.lastIndexOf(": ");
  return (separator >= 0 ? label.slice(separator + 2) : label).trim();
}


function stoneSide(node: BoardSceneNode): "dark" | "light" | null {
  "worklet";
  const value = semanticValue(node.label).toLowerCase();
  if (EMPTY_VALUES.has(value)) return null;
  if (/^(?:white|light|w|o|2)(?:\b|$)/u.test(value)) return "light";
  return "dark";
}

export const buildGoBoardPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  const bounds = rendererBounds(motion, scene.gameSlug === "gomoku" ? 10 : 16);
  const layouts = gridLayouts(scene, bounds);
  const profile = qualityProfile(motion);
  const progress = resolvedMotionProgress(motion);
  const cellWidth = bounds.width / Math.max(1, scene.cols);
  const cellHeight = bounds.height / Math.max(1, scene.rows);
  const stoneRadius = Math.max(2, Math.min(cellWidth, cellHeight) * (scene.gameSlug === "gomoku" ? 0.42 : 0.45));
  const firstX = bounds.x + cellWidth / 2;
  const lastX = bounds.x + bounds.width - cellWidth / 2;
  const firstY = bounds.y + cellHeight / 2;
  const lastY = bounds.y + bounds.height - cellHeight / 2;
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "go:board-plane",
      rect: bounds,
      radius: Math.min(cellWidth, cellHeight) * 0.22,
      style: { color: theme.color.boardBackground },
    },
  ];

  for (let row = 0; row < Math.max(1, scene.rows); row += 1) {
    const y = firstY + row * cellHeight;
    commands.push({
      kind: "line",
      id: `go:grid:row:${row}`,
      from: { x: firstX, y },
      to: { x: lastX, y },
      style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: 1 },
    });
  }
  for (let col = 0; col < Math.max(1, scene.cols); col += 1) {
    const x = firstX + col * cellWidth;
    commands.push({
      kind: "line",
      id: `go:grid:col:${col}`,
      from: { x, y: firstY },
      to: { x, y: lastY },
      style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: 1 },
    });
  }

  const activeLayout = layouts.find(({ node }) =>
    node.id === motion.activeNodeId || node.actionTargetId === motion.lastActionTargetId);
  for (const layout of layouts) {
    const side = stoneSide(layout.node);
    if (side === null) continue;
    const isMovingStone = motion.beat === "move"
      && (layout.node.id === motion.activeNodeId || layout.node.actionTargetId === motion.lastActionTargetId);
    const settle = isMovingStone ? settleProgress(motion.progress, motion.reducedMotion) : 1;
    const radius = stoneRadius * (isMovingStone ? 0.58 + settle * 0.42 : 1);
    commands.push({
      kind: "circle",
      id: `go:stone:${layout.node.id}`,
      center: layout.center,
      radius,
      style: {
        color: side === "dark" ? theme.ink.pieceA : theme.ink.pieceB,
        alpha: isMovingStone ? 0.72 + settle * 0.28 : 1,
      },
    });
    if (layout.node.id === motion.activeNodeId || layout.node.actionTargetId === motion.lastActionTargetId) {
      commands.push({
        kind: "circle",
        id: `go:last-move:${layout.node.id}`,
        center: layout.center,
        radius: stoneRadius * (1.12 + 0.1 * progress),
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: Math.max(1.5, stoneRadius * 0.1),
          accentRole: "last-move",
          glow: profile.bloom && theme.material.glowBudget === "accent-only",
        },
      });
    }
  }

  if (motion.beat === "capture") {
    const captureCenter = activeLayout?.center ?? {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    commands.push({
      kind: "arc",
      id: "go:capture:group-release",
      rect: {
        x: captureCenter.x - stoneRadius * (1 + progress),
        y: captureCenter.y - stoneRadius * (1 + progress),
        width: stoneRadius * 2 * (1 + progress),
        height: stoneRadius * 2 * (1 + progress),
      },
      startDegrees: -90,
      sweepDegrees: 360 * progress,
      useCenter: false,
      style: {
        color: theme.color.accent,
        alpha: 1 - progress * 0.55,
        mode: "stroke",
        strokeWidth: Math.max(1, stoneRadius * 0.09),
        accentRole: "last-move",
        trail: profile.trails && theme.material.moveTrail,
      },
    });
  }

  const loupeLayout = scene.gameSlug === "gomoku" && motion.activeNodeId !== null
    ? layouts.find(({ node }) => node.id === motion.activeNodeId)
    : undefined;
  if (loupeLayout) {
    const loupeRadius = Math.max(28, stoneRadius * 2.35);
    const loupeCenter = {
      x: Math.min(bounds.x + bounds.width - loupeRadius, Math.max(bounds.x + loupeRadius, loupeLayout.center.x)),
      y: Math.max(bounds.y + loupeRadius, loupeLayout.center.y - loupeRadius * 1.55),
    };
    commands.push(
      {
        kind: "line",
        id: `gomoku:loupe:guide:${loupeLayout.node.id}`,
        from: loupeLayout.center,
        to: loupeCenter,
        style: { color: theme.color.accentLine, mode: "stroke", strokeWidth: 1 },
      },
      {
        kind: "circle",
        id: `gomoku:loupe:lens:${loupeLayout.node.id}`,
        center: loupeCenter,
        radius: loupeRadius,
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: 2,
          accentRole: "last-move",
          glow: profile.bloom && theme.material.glowBudget === "accent-only",
        },
      },
      {
        kind: "circle",
        id: `gomoku:loupe:stone:${loupeLayout.node.id}`,
        center: loupeCenter,
        radius: loupeRadius * 0.48,
        style: { color: stoneSide(loupeLayout.node) === "light" ? theme.ink.pieceB : theme.ink.pieceA },
      },
    );
  }

  return {
    family: "go_board",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      interactionModel: scene.gameSlug === "gomoku" ? "gomoku-precision-placement" : "go-liberty-placement",
      stoneMotion: "settle",
      captureTreatment: "group-release-ring",
      boardScale: scene.gameSlug === "gomoku" ? 1.08 : 1,
      fatFingerLoupe: scene.gameSlug === "gomoku",
      loupeActive: loupeLayout !== undefined,
      shaderDetail: profile.shaderDetail,
      trailsEnabled: profile.trails && theme.material.moveTrail,
    }),
  };
};

export const hitTestGoBoard: HitTestStrategy = (point, scene) => {
  "worklet";
  return hitTestGrid(point, scene);
};
