import type { BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { gridLayouts, hitTestGrid, rendererBounds, type NodeLayout } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata } from "../plan";
import type { HitTestStrategy } from "../renderer-factory";
import type { MotionState, Rect, RenderCommand, RenderPlanBuilder } from "../types";

type Mark = "cross" | "nought" | null;
type WinningLine = Readonly<{ from: NodeLayout; to: NodeLayout }>;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


export const hitTestGrid3x3: HitTestStrategy = (point, scene) => {
  "worklet";
  return hitTestGrid(point, scene);
};

function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "grid_3x3") {
    throw new TypeError(`grid_3x3 renderer cannot consume ${scene.rendererFamily}.`);
  }
}

function squareBounds(rect: Rect): Rect {
  "worklet";
  const size = Math.min(rect.width, rect.height);
  return {
    x: rect.x + (rect.width - size) / 2,
    y: rect.y + (rect.height - size) / 2,
    width: size,
    height: size,
  };
}

function selectedLayout(layouts: readonly NodeLayout[], motion: MotionState): NodeLayout | null {
  "worklet";
  return layouts.find(({ node }) => node.id === motion.activeNodeId)
    ?? layouts.find(({ node }) => node.actionTargetId === motion.lastActionTargetId)
    ?? null;
}

function appendGrid(
  commands: RenderCommand[],
  scene: BoardScene,
  board: Rect,
  theme: ThemeTokens,
  ultimate: boolean,
): void {
  "worklet";
  const rows = Math.max(1, scene.rows);
  const cols = Math.max(1, scene.cols);
  for (let col = 1; col < cols; col += 1) {
    const macro = ultimate && col % 3 === 0;
    commands.push({
      kind: "line",
      id: `grid:vertical:${col}`,
      from: { x: board.x + board.width * col / cols, y: board.y },
      to: { x: board.x + board.width * col / cols, y: board.y + board.height },
      style: {
        color: macro ? theme.color.borderStrong : theme.color.boardLine,
        alpha: macro ? 1 : 0.72,
        mode: "stroke",
        strokeWidth: macro ? 3 : 1,
      },
    });
  }
  for (let row = 1; row < rows; row += 1) {
    const macro = ultimate && row % 3 === 0;
    commands.push({
      kind: "line",
      id: `grid:horizontal:${row}`,
      from: { x: board.x, y: board.y + board.height * row / rows },
      to: { x: board.x + board.width, y: board.y + board.height * row / rows },
      style: {
        color: macro ? theme.color.borderStrong : theme.color.boardLine,
        alpha: macro ? 1 : 0.72,
        mode: "stroke",
        strokeWidth: macro ? 3 : 1,
      },
    });
  }
}

function ultimateFocus(
  layout: NodeLayout | null,
  board: Rect,
): Readonly<{ row: number; col: number; rect: Rect }> | null {
  "worklet";
  if (layout?.node.row === null || layout?.node.col === null || layout === null) return null;
  const row = Math.floor(layout.node.row / 3);
  const col = Math.floor(layout.node.col / 3);
  return {
    row,
    col,
    rect: {
      x: board.x + board.width * col / 3,
      y: board.y + board.height * row / 3,
      width: board.width / 3,
      height: board.height / 3,
    },
  };
}

function insetBy(rect: Rect, amount: number): Rect {
  "worklet";
  return {
    x: rect.x + amount,
    y: rect.y + amount,
    width: Math.max(0, rect.width - amount * 2),
    height: Math.max(0, rect.height - amount * 2),
  };
}

function cellValue(label: string): string {
  "worklet";
  return label.replace(/^Row\s+\d+,\s*column\s+\d+:\s*/iu, "").trim();
}

function markForLabel(label: string): Mark {
  "worklet";
  const value = cellValue(label).toLowerCase().replace(/[\s_-]+/gu, " ").trim();
  if (/^(?:x|cross|player 1|p1|1)$/u.test(value)) return "cross";
  if (/^(?:o|0|nought|circle|player 2|p2|2|-1)$/u.test(value)) return "nought";
  return null;
}

function interpolate(
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
  progress: number,
): Readonly<{ x: number; y: number }> {
  "worklet";
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}


function appendStrokeMark(
  commands: RenderCommand[],
  layout: NodeLayout,
  mark: Exclude<Mark, null>,
  progress: number,
  theme: ThemeTokens,
): void {
  "worklet";
  const radius = Math.min(layout.rect.width, layout.rect.height) * 0.28;
  const strokeWidth = Math.max(2, radius * 0.18);
  if (mark === "nought") {
    commands.push({
      kind: "arc",
      id: `mark:${layout.node.id}:nought`,
      rect: {
        x: layout.center.x - radius,
        y: layout.center.y - radius,
        width: radius * 2,
        height: radius * 2,
      },
      startDegrees: -90,
      sweepDegrees: 360 * progress,
      useCenter: false,
      style: { color: theme.ink.pieceB, mode: "stroke", strokeWidth },
    });
    return;
  }

  const startA = { x: layout.center.x - radius, y: layout.center.y - radius };
  const endA = { x: layout.center.x + radius, y: layout.center.y + radius };
  const startB = { x: layout.center.x + radius, y: layout.center.y - radius };
  const endB = { x: layout.center.x - radius, y: layout.center.y + radius };
  commands.push(
    {
      kind: "line",
      id: `mark:${layout.node.id}:cross-a`,
      from: startA,
      to: interpolate(startA, endA, progress),
      style: { color: theme.ink.mark, mode: "stroke", strokeWidth },
    },
    {
      kind: "line",
      id: `mark:${layout.node.id}:cross-b`,
      from: startB,
      to: interpolate(startB, endB, progress),
      style: { color: theme.ink.mark, mode: "stroke", strokeWidth },
    },
  );
}

function lineCoordinates(rows: number, cols: number, length = Math.min(rows, cols)): readonly (readonly [number, number])[][] {
  "worklet";
  const lines: (readonly [number, number])[][] = [];
  if (cols === length) {
    for (let row = 0; row < rows; row += 1) {
      lines.push(Array.from({ length }, (_, col) => [row, col] as const));
    }
  }
  if (rows === length) {
    for (let col = 0; col < cols; col += 1) {
      lines.push(Array.from({ length }, (_, row) => [row, col] as const));
    }
  }
  if (rows === length && cols === length) {
    lines.push(
      Array.from({ length }, (_, index) => [index, index] as const),
      Array.from({ length }, (_, index) => [index, length - 1 - index] as const),
    );
  }
  return lines;
}

function winningLineForBoard(
  layouts: readonly NodeLayout[],
  rows: number,
  cols: number,
  length: number,
  rowOffset = 0,
  colOffset = 0,
): WinningLine | null {
  "worklet";
  if (rows < length || cols < length) return null;
  const byCoordinate = new Map(layouts.flatMap((layout) => layout.node.row === null || layout.node.col === null
    ? []
    : [[`${layout.node.row}:${layout.node.col}`, layout] as const]));
  for (const coordinates of lineCoordinates(rows, cols, length)) {
    const entries = coordinates.map(([row, col]) => byCoordinate.get(`${row + rowOffset}:${col + colOffset}`));
    const marks = entries.map((entry) => entry ? markForLabel(entry.node.label) : null);
    if (entries.every((entry) => entry !== undefined)
      && marks[0] !== null
      && marks.every((mark) => mark === marks[0])) {
      return { from: entries[0]!, to: entries[entries.length - 1]! };
    }
  }
  return null;
}

function findWinningLine(
  layouts: readonly NodeLayout[],
  rows: number,
  cols: number,
  ultimate: boolean,
): WinningLine | null {
  "worklet";
  if (!ultimate) return winningLineForBoard(layouts, rows, cols, 3);
  if (rows < 9 || cols < 9) return null;

  const macroWinners = new Map<string, Readonly<{ mark: Mark; layout: NodeLayout }>>();
  for (let macroRow = 0; macroRow < 3; macroRow += 1) {
    for (let macroCol = 0; macroCol < 3; macroCol += 1) {
      const micro = layouts.filter(({ node }) => node.row !== null && node.col !== null
        && Math.floor(node.row / 3) === macroRow && Math.floor(node.col / 3) === macroCol);
      const line = winningLineForBoard(micro, 3, 3, 3, macroRow * 3, macroCol * 3);
      if (!line) continue;
      const mark = markForLabel(line.from.node.label);
      const center = layouts.find(({ node }) => node.row === macroRow * 3 + 1 && node.col === macroCol * 3 + 1)
        ?? line.from;
      macroWinners.set(`${macroRow}:${macroCol}`, { mark, layout: center });
    }
  }

  for (const coordinates of lineCoordinates(3, 3)) {
    const entries = coordinates.map(([row, col]) => macroWinners.get(`${row}:${col}`));
    if (entries.every((entry) => entry !== undefined && entry.mark !== null && entry.mark === entries[0]?.mark)) {
      return { from: entries[0]!.layout, to: entries[entries.length - 1]!.layout };
    }
  }
  return null;
}

export const buildGrid3x3Plan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const board = squareBounds(rendererBounds(motion));
  const ultimate = scene.gameSlug === "ultimate-tic-tac-toe" || scene.rows === 9 || scene.cols === 9;
  const layouts = gridLayouts(scene, board, ultimate ? 1 : 2);
  const profile = qualityProfile(motion);
  const selected = selectedLayout(layouts, motion);
  const markProgress = resolvedMotionProgress(motion);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "grid:surface",
      rect: board,
      radius: Math.max(8, Math.min(board.width, board.height) * 0.025),
      style: { color: theme.color.boardBackground },
    },
  ];

  appendGrid(commands, scene, board, theme, ultimate);

  const focus = ultimate && !scene.summary.terminal ? ultimateFocus(selected, board) : null;
  if (focus) {
    commands.push({
      kind: "rounded-rect",
      id: "ultimate:focus",
      rect: insetBy(focus.rect, 2),
      radius: Math.max(6, Math.min(focus.rect.width, focus.rect.height) * 0.04),
      style: {
        color: theme.color.accent,
        alpha: 0.95,
        mode: "stroke",
        strokeWidth: Math.max(2, Math.min(board.width, board.height) / 150),
        accentRole: "active-dock",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  for (const layout of layouts) {
    const mark = markForLabel(layout.node.label);
    if (mark === null) continue;
    const progress = selected?.node.id === layout.node.id && motion.beat === "move" ? markProgress : 1;
    appendStrokeMark(commands, layout, mark, progress, theme);
  }

  const winningLine = scene.summary.terminal ? findWinningLine(layouts, scene.rows, scene.cols, ultimate) : null;
  if (winningLine) {
    const progress = resolvedMotionProgress(motion);
    commands.push({
      kind: "line",
      id: "grid:terminal-win-line",
      from: winningLine.from.center,
      to: {
        x: winningLine.from.center.x + (winningLine.to.center.x - winningLine.from.center.x) * progress,
        y: winningLine.from.center.y + (winningLine.to.center.y - winningLine.from.center.y) * progress,
      },
      style: {
        color: theme.color.win,
        mode: "stroke",
        strokeWidth: Math.max(4, Math.min(board.width, board.height) / 60),
        accentRole: "result-sweep",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  return {
    family: "grid_3x3",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, board),
    commands,
    hitZones: layouts.flatMap(({ node, rect }) => node.actionTargetId === null
      ? []
      : [{ id: `hit:${node.id}`, rect, actionTargetId: node.actionTargetId }]),
    metadata: planMetadata(scene, motion, {
      variant: ultimate ? "ultimate" : "classic",
      strokeDrawnMarks: true,
      ultimateFocusRow: focus?.row ?? null,
      ultimateFocusCol: focus?.col ?? null,
      terminalWinLine: winningLine !== null,
      materialLayer: theme.material.boardSurface,
    }),
  };
};
