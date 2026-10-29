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
import type { PixelPoint, RenderCommand, RenderPlanBuilder } from "../types";

const EMPTY_VALUES = new Set(["", ".", "-", "0", "empty", "none", "vacant"]);

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function hexPoints(center: PixelPoint, radius: number): readonly PixelPoint[] {
  "worklet";
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  });
}

function semanticValue(label: string): string {
  "worklet";
  const separator = label.lastIndexOf(": ");
  return (separator >= 0 ? label.slice(separator + 2) : label).trim();
}


function hexSide(node: BoardSceneNode): "north-south" | "west-east" | null {
  "worklet";
  const value = semanticValue(node.label).toLowerCase();
  if (EMPTY_VALUES.has(value)) return null;
  return /^(?:white|light|w|o|2)(?:\b|$)/u.test(value) ? "west-east" : "north-south";
}

function terminalChainLayouts(
  scene: Parameters<RenderPlanBuilder>[0],
  layouts: ReturnType<typeof gridLayouts>,
): ReturnType<typeof gridLayouts> {
  "worklet";
  if (!scene.summary.terminal) return [];
  const explicitlyMarked = layouts.filter(({ node }) => /\b(?:chain|winner|winning)\b/iu.test(semanticValue(node.label)));
  const occupied = explicitlyMarked.length >= 2
    ? explicitlyMarked
    : layouts.filter(({ node }) => hexSide(node) !== null);
  return [...occupied].sort((a, b) => {
    const rowDifference = (a.node.row ?? 0) - (b.node.row ?? 0);
    return rowDifference === 0 ? (a.node.col ?? 0) - (b.node.col ?? 0) : rowDifference;
  });
}

export const buildHexBoardPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  const bounds = rendererBounds(motion, 18);
  const layouts = gridLayouts(scene, bounds, 1);
  const profile = qualityProfile(motion);
  const progress = resolvedMotionProgress(motion);
  const cellWidth = bounds.width / Math.max(1, scene.cols);
  const cellHeight = bounds.height / Math.max(1, scene.rows);
  const radius = Math.max(2, Math.min(cellWidth * 0.55, cellHeight * 0.48));
  const commands: RenderCommand[] = [
    {
      kind: "polygon",
      id: "hex:edge:north",
      points: [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width - cellWidth * 0.4, y: bounds.y + cellHeight * 0.32 },
        { x: bounds.x + cellWidth * 0.4, y: bounds.y + cellHeight * 0.32 },
      ],
      closed: true,
      style: { color: theme.ink.pieceA, alpha: 0.88 },
    },
    {
      kind: "polygon",
      id: "hex:edge:south",
      points: [
        { x: bounds.x + cellWidth * 0.4, y: bounds.y + bounds.height - cellHeight * 0.32 },
        { x: bounds.x + bounds.width - cellWidth * 0.4, y: bounds.y + bounds.height - cellHeight * 0.32 },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height },
      ],
      closed: true,
      style: { color: theme.ink.pieceA, alpha: 0.88 },
    },
    {
      kind: "polygon",
      id: "hex:edge:west",
      points: [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + cellWidth * 0.32, y: bounds.y + cellHeight * 0.4 },
        { x: bounds.x + cellWidth * 0.32, y: bounds.y + bounds.height - cellHeight * 0.4 },
        { x: bounds.x, y: bounds.y + bounds.height },
      ],
      closed: true,
      style: { color: theme.ink.pieceB, alpha: 0.94 },
    },
    {
      kind: "polygon",
      id: "hex:edge:east",
      points: [
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x + bounds.width - cellWidth * 0.32, y: bounds.y + bounds.height - cellHeight * 0.4 },
        { x: bounds.x + bounds.width - cellWidth * 0.32, y: bounds.y + cellHeight * 0.4 },
      ],
      closed: true,
      style: { color: theme.ink.pieceB, alpha: 0.94 },
    },
    {
      kind: "rounded-rect",
      id: "hex:board-plane",
      rect: bounds,
      radius: radius * 0.35,
      style: { color: theme.color.boardBackground },
    },
  ];

  const centers = new Map<string, PixelPoint>();
  for (const layout of layouts) {
    const row = layout.node.row ?? 0;
    const center = {
      x: layout.center.x + (row % 2 === 0 ? -cellWidth * 0.08 : cellWidth * 0.08),
      y: layout.center.y,
    };
    centers.set(layout.node.id, center);
    commands.push({
      kind: "polygon",
      id: `hex:cell:${layout.node.id}`,
      points: hexPoints(center, radius),
      closed: true,
      style: {
        color: theme.color.boardLight,
        mode: "fill",
      },
    });
    commands.push({
      kind: "polygon",
      id: `hex:cell-outline:${layout.node.id}`,
      points: hexPoints(center, radius),
      closed: true,
      style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: 1 },
    });
    const side = hexSide(layout.node);
    if (side === null) continue;
    const moving = motion.beat === "move"
      && (layout.node.id === motion.activeNodeId || layout.node.actionTargetId === motion.lastActionTargetId);
    const settle = moving ? settleProgress(motion.progress, motion.reducedMotion) : 1;
    commands.push({
      kind: "circle",
      id: `hex:stone:${layout.node.id}`,
      center,
      radius: radius * (moving ? 0.42 + 0.4 * settle : 0.82),
      style: { color: side === "north-south" ? theme.ink.pieceA : theme.ink.pieceB },
    });
  }

  const chainLayouts = terminalChainLayouts(scene, layouts);
  if (scene.summary.terminal) {
    for (let index = 1; index < chainLayouts.length; index += 1) {
      const previous = chainLayouts[index - 1];
      const current = chainLayouts[index];
      if (!previous || !current) continue;
      const from = centers.get(previous.node.id) ?? previous.center;
      const to = centers.get(current.node.id) ?? current.center;
      commands.push({
        kind: "line",
        id: `hex:terminal-chain:${index - 1}:${previous.node.id}:${current.node.id}`,
        from,
        to: {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        },
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: Math.max(2, radius * 0.24),
          accentRole: "result-sweep",
          glow: profile.bloom && theme.material.glowBudget === "accent-only",
          trail: profile.trails && theme.material.moveTrail,
        },
      });
    }
  }

  commands.push(
    {
      kind: "text",
      id: "hex:edge-label:north-south",
      at: { x: bounds.x + bounds.width / 2, y: bounds.y + Math.max(10, cellHeight * 0.28) },
      text: "N–S",
      size: Math.max(8, Math.min(12, radius * 0.7)),
      style: { color: theme.ink.pieceA },
    },
    {
      kind: "text",
      id: "hex:edge-label:west-east",
      at: { x: bounds.x + Math.max(10, cellWidth * 0.2), y: bounds.y + bounds.height / 2 },
      text: "W–E",
      size: Math.max(8, Math.min(12, radius * 0.7)),
      style: { color: theme.ink.pieceB },
    },
  );

  return {
    family: "hex_board",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      interactionModel: "hex-connectivity",
      edgeIdentity: "north-south-vs-west-east",
      terminalChainTrace: scene.summary.terminal,
      terminalChainNodes: chainLayouts.length,
      stoneMotion: "settle",
      shaderDetail: profile.shaderDetail,
      trailsEnabled: profile.trails && theme.material.moveTrail,
    }),
  };
};

export const hitTestHexBoard: HitTestStrategy = (point, scene) => {
  "worklet";
  return hitTestGrid(point, scene);
};
