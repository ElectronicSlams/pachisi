import type { BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { gridLayouts, hitTestGrid, rendererBounds, type NodeLayout } from "../geometry";
import { qualityProfile, resolvedMotionProgress, settleProgress, waveProgress } from "../motion";
import { materialLayer, planMetadata } from "../plan";
import type { HitTestStrategy } from "../renderer-factory";
import type { MotionState, Rect, RenderCommand, RenderPlanBuilder } from "../types";

type Side = "first" | "second";
type BattleshipOutcome = "hit" | "miss" | "sunk" | null;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


export const hitTestSquareBoard: HitTestStrategy = (point, scene) => {
  "worklet";
  return hitTestGrid(point, scene);
};

function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "square_board") {
    throw new TypeError(`square_board renderer cannot consume ${scene.rendererFamily}.`);
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

function variantForGame(gameSlug: string): "chess" | "checkers" | "othello" | "battleship" | "generic" {
  "worklet";
  if (gameSlug === "chess") return "chess";
  if (gameSlug === "checkers") return "checkers";
  if (gameSlug === "othello") return "othello";
  if (gameSlug === "battleship") return "battleship";
  return "generic";
}

function cellValue(label: string): string {
  "worklet";
  return label.replace(/^Row\s+\d+,\s*column\s+\d+:\s*/iu, "").trim();
}

function battleshipOutcome(label: string): BattleshipOutcome {
  "worklet";
  const value = cellValue(label).toLowerCase().trim();
  if (/^(?:hit|h)$/u.test(value)) return "hit";
  if (/^(?:miss|m)$/u.test(value)) return "miss";
  if (/^(?:sunk|s)$/u.test(value)) return "sunk";
  return null;
}

function insetBy(rect: Rect, amount: number): Rect {
  "worklet";
  const safeAmount = Math.max(0, Math.min(amount, Math.min(rect.width, rect.height) / 2));
  return {
    x: rect.x + safeAmount,
    y: rect.y + safeAmount,
    width: Math.max(0, rect.width - safeAmount * 2),
    height: Math.max(0, rect.height - safeAmount * 2),
  };
}


function appendFog(commands: RenderCommand[], layout: NodeLayout, theme: ThemeTokens): void {
  "worklet";
  commands.push(
    {
      kind: "rect",
      id: `battleship:fog:${layout.node.id}`,
      rect: layout.rect,
      style: { color: theme.color.surface2, alpha: 0.62 },
    },
    {
      kind: "arc",
      id: `battleship:fog-wave:${layout.node.id}`,
      rect: insetBy(layout.rect, layout.rect.width * 0.28),
      startDegrees: 195,
      sweepDegrees: 150,
      useCenter: false,
      style: { color: theme.color.boardLine, alpha: 0.72, mode: "stroke", strokeWidth: 1 },
    },
  );
}

function appendBattleshipOutcome(
  commands: RenderCommand[],
  layout: NodeLayout,
  outcome: Exclude<BattleshipOutcome, null>,
  theme: ThemeTokens,
): void {
  "worklet";
  const radius = Math.min(layout.rect.width, layout.rect.height) * (outcome === "miss" ? 0.11 : 0.28);
  commands.push({
    kind: "circle",
    id: `battleship:${outcome}:${layout.node.id}`,
    center: layout.center,
    radius,
    style: {
      color: outcome === "miss" ? theme.color.pieceLight : theme.color.loss,
      mode: outcome === "sunk" ? "stroke" : "fill",
      ...(outcome === "sunk" ? { strokeWidth: Math.max(2, radius * 0.28) } : {}),
    },
  });
  if (outcome === "hit" || outcome === "sunk") {
    const reach = Math.min(layout.rect.width, layout.rect.height) * 0.24;
    commands.push(
      {
        kind: "line",
        id: `battleship:${outcome}:cross-a:${layout.node.id}`,
        from: { x: layout.center.x - reach, y: layout.center.y - reach },
        to: { x: layout.center.x + reach, y: layout.center.y + reach },
        style: { color: theme.color.lossText, mode: "stroke", strokeWidth: 2 },
      },
      {
        kind: "line",
        id: `battleship:${outcome}:cross-b:${layout.node.id}`,
        from: { x: layout.center.x + reach, y: layout.center.y - reach },
        to: { x: layout.center.x - reach, y: layout.center.y + reach },
        style: { color: theme.color.lossText, mode: "stroke", strokeWidth: 2 },
      },
    );
  }
}

function isEmpty(value: string): boolean {
  "worklet";
  return value.length === 0 || /^(?:empty|none|null|vacant|fog|unknown|unrevealed)$/iu.test(value);
}

function aligned(origin: NodeLayout, candidate: NodeLayout): boolean {
  "worklet";
  if (origin.node.row === null || origin.node.col === null || candidate.node.row === null || candidate.node.col === null) return false;
  const rowDelta = Math.abs(candidate.node.row - origin.node.row);
  const colDelta = Math.abs(candidate.node.col - origin.node.col);
  return rowDelta === 0 || colDelta === 0 || rowDelta === colDelta;
}

function sideForLabel(label: string): Side {
  "worklet";
  const value = label.toLowerCase();
  if (/(?:\bwhite\b|\blight\b|\bred\b|\bplayer[ _-]?2\b|\bp2\b|\bo\b)/u.test(value)) return "second";
  if (/^[a-z]$/u.test(label.trim()) && /[kqrbnp]/u.test(label.trim())) return "second";
  return "first";
}

function distance(origin: NodeLayout, candidate: NodeLayout): number {
  "worklet";
  if (origin.node.row === null || origin.node.col === null || candidate.node.row === null || candidate.node.col === null) return 0;
  return Math.max(Math.abs(candidate.node.row - origin.node.row), Math.abs(candidate.node.col - origin.node.col));
}

function appendOthello(
  commands: RenderCommand[],
  layouts: readonly NodeLayout[],
  selected: NodeLayout | null,
  theme: ThemeTokens,
  motion: MotionState,
): void {
  "worklet";
  const occupied = layouts.filter((layout) => !isEmpty(cellValue(layout.node.label)));
  const wave = selected === null ? [] : occupied
    .filter((layout) => aligned(selected, layout) && sideForLabel(cellValue(layout.node.label)) === sideForLabel(cellValue(selected.node.label)))
    .sort((a, b) => distance(selected, a) - distance(selected, b));

  for (const layout of occupied) {
    const ordinal = wave.findIndex(({ node }) => node.id === layout.node.id);
    const progress = ordinal >= 0 && (motion.beat === "move" || motion.beat === "capture")
      ? waveProgress(motion.progress, ordinal, wave.length, motion.reducedMotion)
      : 1;
    const flipScale = progress < 1 ? 0.12 + 0.88 * Math.abs(2 * progress - 1) : 1;
    const side = sideForLabel(cellValue(layout.node.label));
    const radius = Math.min(layout.rect.width, layout.rect.height) * 0.38;
    commands.push({
      kind: "circle",
      id: `othello:disc:${layout.node.id}`,
      center: layout.center,
      radius: radius * flipScale,
      style: { color: side === "second" ? theme.ink.pieceB : theme.ink.pieceA },
    });
    if (ordinal >= 0 && progress < 1) {
      commands.push({
        kind: "arc",
        id: `othello:flip-wave:${layout.node.id}`,
        rect: insetBy(layout.rect, layout.rect.width * 0.14),
        startDegrees: -90,
        sweepDegrees: 360 * progress,
        useCenter: false,
        style: { color: theme.color.boardLine, alpha: 0.55, mode: "stroke", strokeWidth: 1.5 },
      });
    }
  }
}

function compactLabel(label: string): string {
  "worklet";
  const compact = label.replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 3);
  return compact || "•";
}

function chessGlyph(label: string): string {
  "worklet";
  const normalized = label.toLowerCase();
  const key = /king/iu.test(label) || /(^|\s)k($|\s)/iu.test(label) ? "king"
    : /queen/iu.test(label) || /(^|\s)q($|\s)/iu.test(label) ? "queen"
      : /rook/iu.test(label) || /(^|\s)r($|\s)/iu.test(label) ? "rook"
        : /bishop/iu.test(label) || /(^|\s)b($|\s)/iu.test(label) ? "bishop"
          : /knight/iu.test(label) || /(^|\s)n($|\s)/iu.test(label) ? "knight"
            : /pawn/iu.test(label) || /(^|\s)p($|\s)/iu.test(label) ? "pawn"
              : normalized;
  const glyphs: Readonly<Record<string, string>> = {
    king: "K",
    queen: "Q",
    rook: "R",
    bishop: "B",
    knight: "N",
    pawn: "P",
  };
  return glyphs[key] ?? compactLabel(label);
}

function appendSquarePiece(
  commands: RenderCommand[],
  layout: NodeLayout,
  selected: NodeLayout | null,
  variant: "chess" | "checkers" | "generic",
  theme: ThemeTokens,
  motion: MotionState,
): void {
  "worklet";
  const value = cellValue(layout.node.label);
  if (isEmpty(value)) return;
  const side = sideForLabel(value);
  const active = selected?.node.id === layout.node.id;
  const progress = active && (motion.beat === "move" || motion.beat === "capture")
    ? settleProgress(motion.progress, motion.reducedMotion)
    : 1;
  const color = side === "second" ? theme.ink.pieceB : theme.ink.pieceA;

  if (variant === "checkers") {
    const radius = Math.min(layout.rect.width, layout.rect.height) * (0.31 + progress * 0.07);
    commands.push({
      kind: "circle",
      id: `square:piece:${layout.node.id}`,
      center: layout.center,
      radius,
      style: { color },
    });
    if (/king/iu.test(value)) {
      commands.push({
        kind: "text",
        id: `square:crown:${layout.node.id}`,
        at: { x: layout.center.x, y: layout.center.y + layout.rect.height * 0.12 },
        text: "K",
        size: layout.rect.height * 0.34,
        style: { color: side === "second" ? theme.color.pieceDark : theme.color.pieceLight },
      });
    }
    return;
  }

  const glyph = variant === "chess" ? chessGlyph(value) : compactLabel(value);
  if (variant === "chess") {
    commands.push({
      kind: "circle",
      id: `square:piece-token:${layout.node.id}`,
      center: layout.center,
      radius: Math.min(layout.rect.width, layout.rect.height) * (0.29 + progress * 0.05),
      style: { color },
    });
  }
  commands.push({
    kind: "text",
    id: `square:piece:${layout.node.id}`,
    at: {
      x: layout.center.x,
      y: layout.center.y + layout.rect.height * (0.13 - (1 - progress) * 0.2),
    },
    text: glyph,
    size: layout.rect.height * (variant === "chess" ? 0.42 + progress * 0.1 : 0.54 + progress * 0.16),
    style: {
      color: variant === "chess"
        ? side === "second" ? theme.color.pieceDark : theme.color.pieceLight
        : color,
      alpha: 0.72 + progress * 0.28,
    },
  });
}

export const buildSquareBoardPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const board = squareBounds(rendererBounds(motion));
  const layouts = gridLayouts(scene, board);
  const selected = selectedLayout(layouts, motion);
  const profile = qualityProfile(motion);
  const variant = variantForGame(scene.gameSlug);
  const commands: RenderCommand[] = [
    {
      kind: "rect",
      id: "square:surface",
      rect: board,
      style: { color: theme.color.boardBackground },
    },
  ];

  for (const layout of layouts) {
    const row = layout.node.row ?? 0;
    const col = layout.node.col ?? 0;
    commands.push({
      kind: "rect",
      id: `square:cell:${layout.node.id}`,
      rect: layout.rect,
      style: { color: (row + col) % 2 === 0 ? theme.color.boardLight : theme.color.boardDark },
    });
  }

  let visibleOutcomeCount = 0;
  if (variant === "battleship") {
    for (const layout of layouts) {
      const outcome = battleshipOutcome(layout.node.label);
      if (outcome === null) {
        appendFog(commands, layout, theme);
      } else {
        visibleOutcomeCount += 1;
        appendBattleshipOutcome(commands, layout, outcome, theme);
      }
    }
  } else if (variant === "othello") {
    appendOthello(commands, layouts, selected, theme, motion);
  } else {
    for (const layout of layouts) appendSquarePiece(commands, layout, selected, variant, theme, motion);
  }

  if (selected && variant !== "battleship") {
    commands.push({
      kind: "rounded-rect",
      id: `square:last-move:${selected.node.id}`,
      rect: insetBy(selected.rect, Math.max(1, selected.rect.width * 0.06)),
      radius: Math.max(2, selected.rect.width * 0.08),
      style: {
        color: theme.color.accent,
        mode: "stroke",
        strokeWidth: Math.max(2, selected.rect.width * 0.05),
        accentRole: "last-move",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  if (selected && motion.beat === "capture" && variant !== "battleship") {
    const captureProgress = resolvedMotionProgress(motion);
    commands.push({
      kind: "arc",
      id: `square:capture:${selected.node.id}`,
      rect: insetBy(selected.rect, selected.rect.width * 0.12 * captureProgress),
      startDegrees: -90,
      sweepDegrees: 360 * captureProgress,
      useCenter: false,
      style: {
        color: theme.color.loss,
        alpha: 1 - captureProgress * 0.45,
        mode: "stroke",
        strokeWidth: Math.max(2, selected.rect.width * 0.06),
        accentRole: "last-move",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  return {
    family: "square_board",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, board),
    commands,
    hitZones: layouts.flatMap(({ node, rect }) => node.actionTargetId === null
      ? []
      : [{ id: `hit:${node.id}`, rect, actionTargetId: node.actionTargetId }]),
    metadata: planMetadata(scene, motion, {
      variant,
      motionMode: motion.beat === "capture" ? "capture" : motion.beat === "move" ? "move" : "static",
      othelloFlipWave: variant === "othello",
      battleshipFog: variant === "battleship",
      hiddenInformationRendered: false,
      visibleOutcomeCount,
      materialLayer: theme.material.boardSurface,
    }),
  };
};
