import type { ActionTarget, BoardScene, BoardSceneNode } from "@eslams/game-render-contract";
import type { HitZone, MotionState, PixelPoint, Point, Rect } from "./types";

export type NodeLayout = Readonly<{
  node: BoardSceneNode;
  rect: Rect;
  center: PixelPoint;
}>;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function finitePositive(value: number, fallback: number): number {
  "worklet";
  return Number.isFinite(value) && value > 0 ? value : fallback;
}


export function rendererBounds(motion: MotionState, inset = 12): Rect {
  "worklet";
  const width = finitePositive(motion.viewport.width, 360);
  const height = finitePositive(motion.viewport.height, 360);
  const safeInset = Math.max(0, Math.min(inset, Math.min(width, height) / 4));
  return { x: safeInset, y: safeInset, width: width - safeInset * 2, height: height - safeInset * 2 };
}

export function insetRect(rect: Rect, inset: number): Rect {
  "worklet";
  const safeInset = Math.max(0, Math.min(inset, Math.min(rect.width, rect.height) / 2));
  return {
    x: rect.x + safeInset,
    y: rect.y + safeInset,
    width: Math.max(0, rect.width - safeInset * 2),
    height: Math.max(0, rect.height - safeInset * 2),
  };
}

export function gridLayouts(scene: BoardScene, bounds: Rect, gap = 0): readonly NodeLayout[] {
  "worklet";
  const rows = Math.max(1, scene.rows);
  const cols = Math.max(1, scene.cols);
  const cellWidth = bounds.width / cols;
  const cellHeight = bounds.height / rows;
  const safeGap = Math.max(0, Math.min(gap, Math.min(cellWidth, cellHeight) * 0.4));
  return scene.nodes.map((node, ordinal) => {
    const row = node.row ?? Math.floor(ordinal / cols);
    const col = node.col ?? ordinal % cols;
    const rect = {
      x: bounds.x + col * cellWidth + safeGap / 2,
      y: bounds.y + row * cellHeight + safeGap / 2,
      width: Math.max(0, cellWidth - safeGap),
      height: Math.max(0, cellHeight - safeGap),
    };
    return {
      node,
      rect,
      center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
    };
  });
}

export function ordinalLayouts(scene: BoardScene, bounds: Rect, columns: number, gap = 8): readonly NodeLayout[] {
  "worklet";
  const safeColumns = Math.max(1, Math.floor(columns));
  const rows = Math.max(1, Math.ceil(scene.nodes.length / safeColumns));
  const width = (bounds.width - gap * (safeColumns - 1)) / safeColumns;
  const height = (bounds.height - gap * (rows - 1)) / rows;
  return scene.nodes.map((node, ordinal) => {
    const row = Math.floor(ordinal / safeColumns);
    const col = ordinal % safeColumns;
    const rect = {
      x: bounds.x + col * (width + gap),
      y: bounds.y + row * (height + gap),
      width: Math.max(0, width),
      height: Math.max(0, height),
    };
    return { node, rect, center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } };
  });
}

export function hitZonesForLayouts(layouts: readonly NodeLayout[]): readonly HitZone[] {
  "worklet";
  return layouts.flatMap(({ node, rect }) => node.actionTargetId === null
    ? []
    : [{ id: `hit:${node.id}`, rect, actionTargetId: node.actionTargetId }]);
}

export function isNormalizedPoint(point: Point): boolean {
  "worklet";
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

export function targetForNode(scene: BoardScene, node: BoardSceneNode | undefined): ActionTarget | null {
  "worklet";
  if (!node?.actionTargetId) return null;
  return scene.actionTargets.find((target) => target.id === node.actionTargetId && !target.disabled) ?? null;
}

export function hitTestGrid(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (!isNormalizedPoint(point) || scene.rows <= 0 || scene.cols <= 0) return null;
  const row = Math.min(scene.rows - 1, Math.floor(point.y * scene.rows));
  const col = Math.min(scene.cols - 1, Math.floor(point.x * scene.cols));
  const node = scene.nodes.find((candidate) => candidate.row === row && candidate.col === col);
  return targetForNode(scene, node);
}

export function hitTestOrdinal(point: Point, scene: BoardScene, columns: number): ActionTarget | null {
  "worklet";
  if (!isNormalizedPoint(point) || scene.nodes.length === 0) return null;
  const safeColumns = Math.max(1, Math.floor(columns));
  const rows = Math.max(1, Math.ceil(scene.nodes.length / safeColumns));
  const row = Math.min(rows - 1, Math.floor(point.y * rows));
  const col = Math.min(safeColumns - 1, Math.floor(point.x * safeColumns));
  return targetForNode(scene, scene.nodes[row * safeColumns + col]);
}
