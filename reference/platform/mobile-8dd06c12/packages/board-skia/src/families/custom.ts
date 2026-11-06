import type { BoardScene, BoardSceneNode } from "@eslams/game-render-contract";
import {
  gridLayouts,
  hitZonesForLayouts,
  isNormalizedPoint,
  rendererBounds,
  targetForNode,
  type NodeLayout,
} from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata } from "../plan";
import type { HitTestStrategy } from "../renderer-factory";
import type {
  MotionState,
  PixelPoint,
  Rect,
  RenderCommand,
  RenderPlanBuilder,
} from "../types";

type CustomSlug =
  | "mancala"
  | "nine-mens-morris"
  | "pentago"
  | "backgammon"
  | "shogi"
  | "xiangqi";

type VariantPlan = Readonly<{
  commands: readonly RenderCommand[];
  metadata: Readonly<Record<string, string | number | boolean | null>>;
}>;

const CUSTOM_SLUGS = new Set<string>([
  "mancala",
  "nine-mens-morris",
  "pentago",
  "backgammon",
  "shogi",
  "xiangqi",
]);

const MORRIS_COORDINATES = Object.freeze([
  [0, 0], [0, 3], [0, 6], [1, 1], [1, 3], [1, 5], [2, 2], [2, 3],
  [2, 4], [3, 0], [3, 1], [3, 2], [3, 4], [3, 5], [3, 6], [4, 2],
  [4, 3], [4, 4], [5, 1], [5, 3], [5, 5], [6, 0], [6, 3], [6, 6],
] as const);

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertCustomSlug(value: string): CustomSlug {
  "worklet";
  if (!CUSTOM_SLUGS.has(value)) {
    throw new TypeError(`Unsupported custom renderer game: ${value}`);
  }
  return value as CustomSlug;
}


function semanticValue(label: string): string {
  "worklet";
  const separator = label.lastIndexOf(": ");
  return (separator >= 0 ? label.slice(separator + 2) : label).trim();
}

function isMancalaStore(node: BoardSceneNode, nodeCount: number): boolean {
  "worklet";
  const value = semanticValue(node.label).toLowerCase();
  if (/\b(?:store|kalah)\b/u.test(value)) return true;
  const ordinal = node.index;
  return nodeCount >= 14 && (ordinal === 0 || ordinal === nodeCount - 1);
}

function fromUnit(bounds: Rect, x: number, y: number, width: number, height: number): Rect {
  "worklet";
  return {
    x: bounds.x + bounds.width * x,
    y: bounds.y + bounds.height * y,
    width: bounds.width * width,
    height: bounds.height * height,
  };
}

function nodeLayout(node: BoardSceneNode, rect: Rect): NodeLayout {
  "worklet";
  return { node, rect, center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } };
}

function mancalaLayouts(scene: BoardScene, bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const regularNodes = scene.nodes.filter((node) => !isMancalaStore(node, scene.nodes.length));
  const regularOrdinals = new Map(regularNodes.map((node, index) => [node.id, index]));
  const regularPerRow = Math.max(1, Math.ceil(regularNodes.length / 2));
  let storeOrdinal = 0;
  return scene.nodes.map((node) => {
    const store = isMancalaStore(node, scene.nodes.length);
    let rect: Rect;
    if (store) {
      const side = storeOrdinal;
      storeOrdinal += 1;
      rect = fromUnit(bounds, side % 2 === 0 ? 0.02 : 0.89, 0.22, 0.09, 0.56);
    } else {
      const ordinal = regularOrdinals.get(node.id) ?? 0;
      const row = Math.floor(ordinal / regularPerRow);
      const col = ordinal % regularPerRow;
      const width = 0.72 / regularPerRow;
      rect = fromUnit(bounds, 0.14 + col * width + width * 0.08, row === 0 ? 0.2 : 0.59, width * 0.84, 0.21);
    }
    return nodeLayout(node, rect);
  });
}

function morrisLayouts(scene: BoardScene, bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const size = Math.min(bounds.width, bounds.height) * 0.07;
  return scene.nodes.map((node, ordinal) => {
    const coordinate = scene.nodes.length <= MORRIS_COORDINATES.length
      ? MORRIS_COORDINATES[ordinal]
      : [node.row ?? Math.floor(ordinal / 7), node.col ?? ordinal % 7] as const;
    const row = coordinate?.[0] ?? 3;
    const col = coordinate?.[1] ?? 3;
    const center = {
      x: bounds.x + bounds.width * (0.08 + col / 6 * 0.84),
      y: bounds.y + bounds.height * (0.08 + row / 6 * 0.84),
    };
    return nodeLayout(node, { x: center.x - size / 2, y: center.y - size / 2, width: size, height: size });
  });
}

function backgammonLayouts(scene: BoardScene, bounds: Rect): readonly NodeLayout[] {
  "worklet";
  let barOrdinal = 0;
  let offOrdinal = 0;
  return scene.nodes.map((node, ordinal) => {
    const value = semanticValue(node.label).toLowerCase();
    if (/\bbar\b/u.test(value) || ordinal === 24) {
      const rect = fromUnit(bounds, 0.475, 0.18 + barOrdinal * 0.17, 0.05, 0.14);
      barOrdinal += 1;
      return nodeLayout(node, rect);
    }
    if (/\b(?:bear|off|borne)\b/u.test(value) || ordinal > 24) {
      const rect = fromUnit(bounds, 0.91, 0.12 + offOrdinal * 0.17, 0.08, 0.14);
      offOrdinal += 1;
      return nodeLayout(node, rect);
    }
    const top = ordinal >= 12;
    const slot = top ? 23 - ordinal : ordinal;
    const half = slot >= 6 ? 1 : 0;
    const local = slot % 6;
    return nodeLayout(node, fromUnit(bounds, 0.055 + half * 0.46 + local * 0.063, top ? 0.08 : 0.56, 0.056, 0.36));
  });
}

function layoutsForCustomScene(scene: BoardScene, bounds: Rect): readonly NodeLayout[] {
  "worklet";
  switch (assertCustomSlug(scene.gameSlug)) {
    case "mancala": return mancalaLayouts(scene, bounds);
    case "nine-mens-morris": return morrisLayouts(scene, bounds);
    case "backgammon": return backgammonLayouts(scene, bounds);
    case "pentago":
    case "shogi":
    case "xiangqi":
      return gridLayouts(scene, bounds, Math.min(bounds.width, bounds.height) * 0.008);
  }
}

function buildMancala(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
  motion: MotionState,
): VariantPlan {
  "worklet";
  const commands: RenderCommand[] = [];
  for (const layout of layouts) {
    const store = isMancalaStore(layout.node, scene.nodes.length);
    commands.push({
      kind: "rounded-rect",
      id: `mancala:${store ? "store" : "pit"}:${layout.node.id}`,
      rect: layout.rect,
      radius: Math.min(layout.rect.width, layout.rect.height) * 0.46,
      style: {
        color: store ? theme.color.boardDark : theme.color.boardLight,
        mode: "fill",
      },
    });
    commands.push({
      kind: "text",
      id: `mancala:count:${layout.node.id}`,
      at: { x: layout.center.x, y: layout.center.y },
      text: semanticValue(layout.node.label),
      size: Math.max(9, Math.min(22, layout.rect.width * 0.32)),
      style: { color: store ? theme.color.pieceLight : theme.color.pieceDark },
    });
  }
  const progress = resolvedMotionProgress(motion);
  const sowCount = motion.beat === "move" ? Math.max(1, Math.min(8, Math.ceil(progress * 8))) : 0;
  const active = layouts.find(({ node }) =>
    node.id === motion.activeNodeId || node.actionTargetId === motion.lastActionTargetId);
  if (active && sowCount > 0) {
    for (let index = 0; index < sowCount; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, sowCount);
      const radius = Math.min(active.rect.width, active.rect.height) * 0.34;
      commands.push({
        kind: "circle",
        id: `mancala:sow-count-off:${active.node.id}:${index}`,
        center: {
          x: active.center.x + Math.cos(angle) * radius,
          y: active.center.y + Math.sin(angle) * radius,
        },
        radius: Math.max(2, radius * 0.12),
        style: {
          color: motion.reducedMotion ? theme.color.textSecondary : theme.color.accent,
          ...(!motion.reducedMotion ? { accentRole: "move-trail" as const } : {}),
          trail: !motion.reducedMotion && qualityProfile(motion).trails && theme.material.moveTrail,
        },
      });
    }
  }
  return {
    commands,
    metadata: {
      interactionModel: "mancala-sowing",
      sowingTreatment: "pit-to-pit-count-off",
      sowCount,
      storesVisible: layouts.some(({ node }) => isMancalaStore(node, scene.nodes.length)),
    },
  };
}

function unionBounds(layouts: readonly NodeLayout[]): Rect {
  "worklet";
  if (layouts.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const left = Math.min(...layouts.map(({ rect }) => rect.x));
  const top = Math.min(...layouts.map(({ rect }) => rect.y));
  const right = Math.max(...layouts.map(({ rect }) => rect.x + rect.width));
  const bottom = Math.max(...layouts.map(({ rect }) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function boardLine(id: string, from: PixelPoint, to: PixelPoint, color: string): RenderCommand {
  "worklet";
  return { kind: "line", id, from, to, style: { color, mode: "stroke", strokeWidth: 1 } };
}

function isEmptyValue(value: string): boolean {
  "worklet";
  return value === "" || /^(?:empty|none|vacant|\.|-|0)$/iu.test(value.trim());
}

function pieceSide(node: BoardSceneNode): "dark" | "light" | null {
  "worklet";
  const value = semanticValue(node.label).toLowerCase();
  if (isEmptyValue(value)) return null;
  return /^(?:white|light|w|o|2|red)(?:\b|$)/u.test(value) ? "light" : "dark";
}

function buildMorris(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
  motion: MotionState,
): VariantPlan {
  "worklet";
  const bounds = unionBounds(layouts);
  const commands: RenderCommand[] = [];
  const scale = Math.min(bounds.width, bounds.height);
  for (let ring = 0; ring < 3; ring += 1) {
    const inset = ring * scale * 0.15;
    commands.push({
      kind: "rect",
      id: `morris:ring:${ring}`,
      rect: {
        x: bounds.x + inset,
        y: bounds.y + inset,
        width: Math.max(0, bounds.width - inset * 2),
        height: Math.max(0, bounds.height - inset * 2),
      },
      style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: Math.max(1, scale * 0.008) },
    });
  }
  commands.push(
    boardLine("morris:spoke:north", { x: bounds.x + bounds.width / 2, y: bounds.y }, { x: bounds.x + bounds.width / 2, y: bounds.y + scale * 0.3 }, theme.color.boardLine),
    boardLine("morris:spoke:south", { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height - scale * 0.3 }, theme.color.boardLine),
    boardLine("morris:spoke:west", { x: bounds.x, y: bounds.y + bounds.height / 2 }, { x: bounds.x + scale * 0.3, y: bounds.y + bounds.height / 2 }, theme.color.boardLine),
    boardLine("morris:spoke:east", { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }, { x: bounds.x + bounds.width - scale * 0.3, y: bounds.y + bounds.height / 2 }, theme.color.boardLine),
  );
  const occupied = layouts.filter(({ node }) => pieceSide(node) !== null);
  for (const layout of layouts) {
    const side = pieceSide(layout.node);
    commands.push({
      kind: "circle",
      id: `morris:point:${layout.node.id}`,
      center: layout.center,
      radius: Math.max(2, Math.min(layout.rect.width, layout.rect.height) * 0.18),
      style: { color: side === null ? theme.color.boardLine : side === "light" ? theme.ink.pieceB : theme.ink.pieceA },
    });
  }
  const explicitlyMarked = occupied.filter(({ node }) => /\bmill\b/iu.test(semanticValue(node.label)));
  const mill = explicitlyMarked.length >= 3 ? explicitlyMarked.slice(0, 3) : occupied.slice(0, 3);
  const millFlash = (motion.beat === "capture" || motion.beat === "result") && mill.length === 3;
  if (millFlash) {
    for (let index = 0; index < mill.length; index += 1) {
      const layout = mill[index];
      if (!layout) continue;
      commands.push({
        kind: "circle",
        id: `morris:mill-flash:${index}:${layout.node.id}`,
        center: layout.center,
        radius: Math.min(layout.rect.width, layout.rect.height) * (0.28 + 0.12 * resolvedMotionProgress(motion)),
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: 2,
          accentRole: "result-sweep",
          glow: qualityProfile(motion).bloom && theme.material.glowBudget === "accent-only",
        },
      });
    }
  }
  return {
    commands,
    metadata: {
      interactionModel: "morris-point-network",
      millTreatment: "three-point-flash",
      millFlash,
      canonicalPoints: 24,
    },
  };
}

function buildPentago(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
  motion: MotionState,
): VariantPlan {
  "worklet";
  const bounds = unionBounds(layouts);
  const commands: RenderCommand[] = [];
  const quadrantWidth = bounds.width / 2;
  const quadrantHeight = bounds.height / 2;
  const active = layouts.find(({ node }) => node.id === motion.activeNodeId || node.actionTargetId === motion.lastActionTargetId);
  const activeQuadrant = active
    ? (active.node.row ?? 0) >= Math.max(1, scene.rows) / 2 ? ((active.node.col ?? 0) >= Math.max(1, scene.cols) / 2 ? 3 : 2)
      : ((active.node.col ?? 0) >= Math.max(1, scene.cols) / 2 ? 1 : 0)
    : 0;
  const rotationDegrees = motion.beat === "move" ? Math.round(90 * resolvedMotionProgress(motion)) : 0;
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    const col = quadrant % 2;
    const row = Math.floor(quadrant / 2);
    const rect = {
      x: bounds.x + col * quadrantWidth,
      y: bounds.y + row * quadrantHeight,
      width: quadrantWidth,
      height: quadrantHeight,
    };
    commands.push({
      kind: "rounded-rect",
      id: `pentago:quadrant:${quadrant}`,
      rect,
      radius: Math.min(quadrantWidth, quadrantHeight) * 0.09,
      style: { color: quadrant % 2 === 0 ? theme.color.boardLight : theme.color.boardDark },
    });
    if (quadrant === activeQuadrant && rotationDegrees > 0) {
      commands.push({
        kind: "arc",
        id: `pentago:quadrant-rotation:${quadrant}`,
        rect: {
          x: rect.x + rect.width * 0.12,
          y: rect.y + rect.height * 0.12,
          width: rect.width * 0.76,
          height: rect.height * 0.76,
        },
        startDegrees: -90,
        sweepDegrees: rotationDegrees,
        useCenter: false,
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: Math.max(2, Math.min(rect.width, rect.height) * 0.025),
          accentRole: "last-move",
          glow: qualityProfile(motion).bloom && theme.material.glowBudget === "accent-only",
        },
      });
    }
  }
  for (const layout of layouts) {
    const side = pieceSide(layout.node);
    commands.push({
      kind: "circle",
      id: `pentago:socket:${layout.node.id}`,
      center: layout.center,
      radius: Math.max(2, Math.min(layout.rect.width, layout.rect.height) * 0.33),
      style: { color: side === null ? theme.color.surfaceInset : side === "light" ? theme.ink.pieceB : theme.ink.pieceA },
    });
  }
  return {
    commands,
    metadata: {
      interactionModel: "pentago-place-then-rotate",
      quadrantTreatment: "quarter-turn",
      activeQuadrant,
      quadrantRotationDegrees: rotationDegrees,
    },
  };
}

function buildBackgammon(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
): VariantPlan {
  "worklet";
  const bounds = unionBounds(layouts);
  const commands: RenderCommand[] = [
    {
      kind: "rect",
      id: "backgammon:bar",
      rect: { x: bounds.x + bounds.width * 0.475, y: bounds.y, width: bounds.width * 0.05, height: bounds.height },
      style: { color: theme.color.boardDark },
    },
    {
      kind: "rect",
      id: "backgammon:bear-off-tray",
      rect: { x: bounds.x + bounds.width * 0.91, y: bounds.y, width: bounds.width * 0.09, height: bounds.height },
      style: { color: theme.color.surfaceInset },
    },
  ];
  for (let point = 0; point < 24; point += 1) {
    const layout = layouts[point];
    if (!layout) continue;
    const top = point >= 12;
    commands.push({
      kind: "polygon",
      id: `backgammon:point:${point}:${layout.node.id}`,
      points: top
        ? [
            { x: layout.rect.x, y: layout.rect.y },
            { x: layout.rect.x + layout.rect.width, y: layout.rect.y },
            { x: layout.center.x, y: layout.rect.y + layout.rect.height },
          ]
        : [
            { x: layout.rect.x, y: layout.rect.y + layout.rect.height },
            { x: layout.rect.x + layout.rect.width, y: layout.rect.y + layout.rect.height },
            { x: layout.center.x, y: layout.rect.y },
          ],
      closed: true,
      style: { color: point % 2 === 0 ? theme.color.boardLight : theme.color.boardDark },
    });
    const side = pieceSide(layout.node);
    if (side !== null) {
      commands.push({
        kind: "circle",
        id: `backgammon:checker:${layout.node.id}`,
        center: { x: layout.center.x, y: top ? layout.rect.y + layout.rect.width * 0.55 : layout.rect.y + layout.rect.height - layout.rect.width * 0.55 },
        radius: Math.max(2, layout.rect.width * 0.42),
        style: { color: side === "light" ? theme.ink.pieceB : theme.ink.pieceA },
      });
    }
  }
  commands.push(
    {
      kind: "text",
      id: "backgammon:bar-label",
      at: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
      text: "BAR",
      size: Math.max(8, Math.min(13, bounds.width * 0.025)),
      style: { color: theme.color.textSecondary },
    },
    {
      kind: "text",
      id: "backgammon:bear-off-label",
      at: { x: bounds.x + bounds.width * 0.945, y: bounds.y + bounds.height / 2 },
      text: "OFF",
      size: Math.max(8, Math.min(13, bounds.width * 0.025)),
      style: { color: theme.color.textSecondary },
    },
  );
  return {
    commands,
    metadata: {
      interactionModel: "backgammon-point-movement",
      zoneTreatment: "points-bar-bear-off",
      barVisible: true,
      bearOffVisible: true,
      pointCount: Math.min(24, scene.nodes.length),
    },
  };
}

function gridCommands(
  prefix: string,
  scene: BoardScene,
  bounds: Rect,
  color: string,
): RenderCommand[] {
  "worklet";
  const commands: RenderCommand[] = [];
  const rows = Math.max(1, scene.rows);
  const cols = Math.max(1, scene.cols);
  for (let row = 0; row <= rows; row += 1) {
    const y = bounds.y + row / rows * bounds.height;
    commands.push(boardLine(`${prefix}:grid:row:${row}`, { x: bounds.x, y }, { x: bounds.x + bounds.width, y }, color));
  }
  for (let col = 0; col <= cols; col += 1) {
    const x = bounds.x + col / cols * bounds.width;
    commands.push(boardLine(`${prefix}:grid:col:${col}`, { x, y: bounds.y }, { x, y: bounds.y + bounds.height }, color));
  }
  return commands;
}

function compactPieceLabel(value: string): string {
  "worklet";
  const words = value.split(/\s+/u).filter(Boolean);
  const candidate = words.at(-1) ?? value;
  if (/\bpromoted\b/iu.test(value)) return `+${[...candidate][0]?.toUpperCase() ?? "?"}`;
  return [...candidate].slice(0, 2).join("").toUpperCase();
}

function buildShogi(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
): VariantPlan {
  "worklet";
  const bounds = unionBounds(layouts);
  const commands = gridCommands("shogi", scene, bounds, theme.color.boardLine);
  const cellWidth = bounds.width / Math.max(1, scene.cols);
  const cellHeight = bounds.height / Math.max(1, scene.rows);
  for (let col = 0; col < Math.max(1, scene.cols); col += 1) {
    commands.push({
      kind: "text",
      id: `shogi:coordinate:file:${col}`,
      at: { x: bounds.x + (col + 0.5) * cellWidth, y: bounds.y + Math.max(8, cellHeight * 0.18) },
      text: String(scene.cols - col),
      size: Math.max(8, Math.min(12, cellWidth * 0.25)),
      style: { color: theme.color.textSecondary },
    });
  }
  for (let row = 0; row < Math.max(1, scene.rows); row += 1) {
    commands.push({
      kind: "text",
      id: `shogi:coordinate:rank:${row}`,
      at: { x: bounds.x + Math.max(7, cellWidth * 0.14), y: bounds.y + (row + 0.5) * cellHeight },
      text: String.fromCharCode(97 + row),
      size: Math.max(8, Math.min(12, cellHeight * 0.25)),
      style: { color: theme.color.textSecondary },
    });
  }
  for (const layout of layouts) {
    const value = semanticValue(layout.node.label);
    const side = pieceSide(layout.node);
    if (isEmptyValue(value) || side === null) continue;
    const halfWidth = layout.rect.width * 0.32;
    const halfHeight = layout.rect.height * 0.36;
    const direction = side === "light" ? -1 : 1;
    const points = [
      { x: layout.center.x, y: layout.center.y - halfHeight * direction },
      { x: layout.center.x + halfWidth, y: layout.center.y - halfHeight * 0.42 * direction },
      { x: layout.center.x + halfWidth * 0.82, y: layout.center.y + halfHeight * direction },
      { x: layout.center.x - halfWidth * 0.82, y: layout.center.y + halfHeight * direction },
      { x: layout.center.x - halfWidth, y: layout.center.y - halfHeight * 0.42 * direction },
    ];
    commands.push(
      {
        kind: "polygon",
        id: `shogi:koma:${layout.node.id}`,
        points,
        closed: true,
        style: { color: theme.color.boardLight },
      },
      {
        kind: "polygon",
        id: `shogi:koma-outline:${layout.node.id}`,
        points,
        closed: true,
        style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: 1 },
      },
      {
        kind: "text",
        id: `shogi:glyph:${layout.node.id}`,
        at: { x: layout.center.x - halfWidth * 0.34, y: layout.center.y + halfHeight * 0.24 },
        text: compactPieceLabel(value),
        size: Math.max(8, Math.min(18, layout.rect.width * 0.29)),
        style: { color: theme.color.text },
      },
    );
  }
  return {
    commands,
    metadata: {
      interactionModel: "shogi-drop-and-move",
      coordinateSystem: "files-9-to-1-ranks-a-to-i",
      promotionZones: "last-three-ranks",
    },
  };
}

function addXiangqiPalace(
  commands: RenderCommand[],
  side: "north" | "south",
  bounds: Rect,
  cellWidth: number,
  cellHeight: number,
  color: string,
  row: number,
): void {
  "worklet";
  const left = bounds.x + cellWidth * 3;
  const right = bounds.x + cellWidth * 6;
  const top = bounds.y + cellHeight * row;
  const bottom = top + cellHeight * 3;
  commands.push(
    boardLine(`xiangqi:palace:${side}:down`, { x: left, y: top }, { x: right, y: bottom }, color),
    boardLine(`xiangqi:palace:${side}:up`, { x: right, y: top }, { x: left, y: bottom }, color),
  );
}

function buildXiangqi(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
): VariantPlan {
  "worklet";
  const bounds = unionBounds(layouts);
  const commands = gridCommands("xiangqi", scene, bounds, theme.color.boardLine);
  const cellWidth = bounds.width / Math.max(1, scene.cols);
  const cellHeight = bounds.height / Math.max(1, scene.rows);
  const riverY = bounds.y + cellHeight * 5;
  commands.push(
    {
      kind: "rect",
      id: "xiangqi:river",
      rect: { x: bounds.x, y: riverY - cellHeight * 0.36, width: bounds.width, height: cellHeight * 0.72 },
      style: { color: theme.color.boardBackground },
    },
    {
      kind: "text",
      id: "xiangqi:river:chu",
      at: { x: bounds.x + bounds.width * 0.31, y: riverY },
      text: "CHU RIVER",
      size: Math.max(10, Math.min(20, cellHeight * 0.34)),
      style: { color: theme.color.textSecondary },
    },
    {
      kind: "text",
      id: "xiangqi:river:han",
      at: { x: bounds.x + bounds.width * 0.69, y: riverY },
      text: "HAN BORDER",
      size: Math.max(10, Math.min(20, cellHeight * 0.34)),
      style: { color: theme.color.textSecondary },
    },
  );
  addXiangqiPalace(commands, "north", bounds, cellWidth, cellHeight, theme.color.boardLine, 0);
  addXiangqiPalace(commands, "south", bounds, cellWidth, cellHeight, theme.color.boardLine, 7);
  for (let col = 0; col < Math.max(1, scene.cols); col += 1) {
    commands.push({
      kind: "text",
      id: `xiangqi:coordinate:file:${col}`,
      at: { x: bounds.x + (col + 0.5) * cellWidth, y: bounds.y + Math.max(8, cellHeight * 0.17) },
      text: String(col + 1),
      size: Math.max(8, Math.min(12, cellWidth * 0.23)),
      style: { color: theme.color.textSecondary },
    });
  }
  for (const layout of layouts) {
    const value = semanticValue(layout.node.label);
    const side = pieceSide(layout.node);
    if (side === null) continue;
    commands.push({
      kind: "circle",
      id: `xiangqi:piece:${layout.node.id}`,
      center: layout.center,
      radius: Math.max(3, Math.min(layout.rect.width, layout.rect.height) * 0.35),
      style: { color: side === "light" ? theme.ink.pieceB : theme.ink.pieceA },
    });
    commands.push({
      kind: "text",
      id: `xiangqi:glyph:${layout.node.id}`,
      at: layout.center,
      text: compactPieceLabel(value),
      size: Math.max(8, Math.min(17, layout.rect.width * 0.28)),
      style: { color: side === "light" ? theme.color.pieceDark : theme.color.pieceLight },
    });
  }
  return {
    commands,
    metadata: {
      interactionModel: "xiangqi-river-palace-movement",
      coordinateSystem: "files-1-to-9-ranks-1-to-10",
      riverTreatment: "chu-river-han-border",
      palacesVisible: true,
    },
  };
}

function buildVariant(
  slug: CustomSlug,
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  theme: Parameters<RenderPlanBuilder>[1],
  motion: MotionState,
): VariantPlan {
  "worklet";
  switch (slug) {
    case "mancala": return buildMancala(scene, layouts, theme, motion);
    case "nine-mens-morris": return buildMorris(scene, layouts, theme, motion);
    case "pentago": return buildPentago(scene, layouts, theme, motion);
    case "backgammon": return buildBackgammon(scene, layouts, theme);
    case "shogi": return buildShogi(scene, layouts, theme);
    case "xiangqi": return buildXiangqi(scene, layouts, theme);
  }
}

export const buildCustomPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  const slug = assertCustomSlug(scene.gameSlug);
  const bounds = rendererBounds(motion, 14);
  const layouts = layoutsForCustomScene(scene, bounds);
  const profile = qualityProfile(motion);
  const base: RenderCommand = {
    kind: "rounded-rect",
    id: `custom:${slug}:board-plane`,
    rect: bounds,
    radius: Math.max(4, Math.min(bounds.width, bounds.height) * 0.025),
    style: { color: theme.color.boardBackground },
  };
  const variant = buildVariant(slug, scene, layouts, theme, motion);
  return {
    family: "custom",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands: [base, ...variant.commands],
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      customVariant: slug,
      shaderDetail: profile.shaderDetail,
      trailsEnabled: profile.trails && theme.material.moveTrail,
      ...variant.metadata,
    }),
  };
};

export const hitTestCustom: HitTestStrategy = (point, scene) => {
  "worklet";
  if (!isNormalizedPoint(point)) return null;
  assertCustomSlug(scene.gameSlug);
  const layouts = layoutsForCustomScene(scene, { x: 0, y: 0, width: 1, height: 1 });
  const layout = layouts.find(({ rect }) =>
    point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height);
  return targetForNode(scene, layout?.node);
};
