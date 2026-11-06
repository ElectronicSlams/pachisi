import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import { hitTestOrdinal, hitZonesForLayouts, ordinalLayouts, rendererBounds } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type { MotionState, Point, Rect, RenderCommand, RenderPlanBuilder } from "../types";

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "dice_table") {
    throw new TypeError(`Dice table cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function diceColumns(count: number): number {
  "worklet";
  return Math.max(1, Math.min(4, Math.ceil(Math.sqrt(Math.max(1, count)))));
}

function diceCupCommands(
  bounds: Rect,
  offset: number,
  fill: string,
  rim: string,
): readonly RenderCommand[] {
  "worklet";
  const cup = {
    x: bounds.x + bounds.width * 0.39 + offset,
    y: bounds.y + bounds.height * 0.08,
    width: bounds.width * 0.22,
    height: bounds.height * 0.19,
  };
  return [
    {
      kind: "polygon",
      id: "dice-table:cup:body",
      points: [
        { x: cup.x, y: cup.y },
        { x: cup.x + cup.width, y: cup.y },
        { x: cup.x + cup.width * 0.84, y: cup.y + cup.height },
        { x: cup.x + cup.width * 0.16, y: cup.y + cup.height },
      ],
      closed: true,
      style: { color: fill },
    },
    {
      kind: "line",
      id: "dice-table:cup:rim",
      from: { x: cup.x, y: cup.y },
      to: { x: cup.x + cup.width, y: cup.y },
      style: { color: rim, strokeWidth: 3 },
    },
  ];
}

function safePublicLabel(label: string): string {
  "worklet";
  const value = publicCellValue(label);
  return /\b(?:private|hidden|secret)\b/iu.test(value) ? "PUBLIC STATE UNAVAILABLE" : value;
}

function terminalDiceLabel(label: string): string {
  "worklet";
  return safePublicLabel(label);
}

function countOnlyLabel(label: string): string {
  "worklet";
  if (/\b(?:bid|challenge|call)\b/iu.test(label) || /\d+\s*x\s*[1-6]/iu.test(label)) {
    return safePublicLabel(label);
  }
  const declared = /\b(\d+)\s*dice\b/iu.exec(label)?.[1];
  if (declared) return `${declared} DICE`;
  const faces = label.match(/\b[1-6]\b/gu) ?? [];
  return `${Math.max(1, faces.length)} DICE · SEALED`;
}

function fitted(label: string, width: number): string {
  "worklet";
  const max = Math.max(5, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

function pipCommands(id: string, rect: Rect, face: number | null, color: string): readonly RenderCommand[] {
  "worklet";
  if (face === null) return [];
  const positions: Readonly<Record<number, readonly [number, number][]>> = {
    1: [[0.5, 0.58]],
    2: [[0.3, 0.36], [0.7, 0.78]],
    3: [[0.3, 0.34], [0.5, 0.57], [0.7, 0.8]],
    4: [[0.3, 0.34], [0.7, 0.34], [0.3, 0.78], [0.7, 0.78]],
    5: [[0.3, 0.34], [0.7, 0.34], [0.5, 0.56], [0.3, 0.78], [0.7, 0.78]],
    6: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.56], [0.7, 0.56], [0.3, 0.82], [0.7, 0.82]],
  };
  return (positions[face] ?? []).map(([x, y], index) => ({
    kind: "circle" as const,
    id: `dice-table:die:${id}:pip:${index}`,
    center: { x: rect.x + rect.width * x, y: rect.y + rect.height * y },
    radius: Math.max(2, Math.min(rect.width, rect.height) * 0.045),
    style: { color },
  }));
}

function diceFace(label: string): number | null {
  "worklet";
  const value = publicCellValue(label);
  const exact = /^\s*([1-6])\s*$/u.exec(value)?.[1];
  if (exact) return Number(exact);
  const named = /\bface\s*([1-6])\b/iu.exec(value)?.[1];
  return named ? Number(named) : null;
}

/** Builds an honest public dice table: cups and counts first, faces only at terminal reveal. */
export const buildDiceTablePlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const columns = diceColumns(scene.nodes.length);
  const layouts = ordinalLayouts(scene, {
    x: bounds.x + bounds.width * 0.08,
    y: bounds.y + bounds.height * 0.27,
    width: bounds.width * 0.84,
    height: bounds.height * 0.62,
  }, columns, 10);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const terminalReveal = scene.summary.terminal;
  const shake = terminalReveal || motion.reducedMotion || motion.beat !== "move"
    ? 0
    : Math.sin(progress * Math.PI * 8) * (1 - progress) * 7;
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "dice-table:mat",
      rect: bounds,
      radius: Math.min(28, bounds.height * 0.08),
      style: { color: theme.color.surface2 },
    },
    ...diceCupCommands(bounds, shake, theme.color.surface3, theme.color.borderStrong),
    {
      kind: "text",
      id: "dice-table:mode",
      at: { x: bounds.x + 14, y: bounds.y + 20 },
      text: terminalReveal ? "TERMINAL REVEAL" : "COUNTS ONLY · CUPS SEALED",
      size: 11,
      style: { color: terminalReveal ? theme.color.winText : theme.color.textSecondary },
    },
  ];

  for (const layout of layouts) {
    const label = terminalReveal
      ? terminalDiceLabel(layout.node.label)
      : countOnlyLabel(layout.node.label);
    commands.push(
      {
        kind: "rounded-rect",
        id: `dice-table:die:${layout.node.id}:face`,
        rect: layout.rect,
        radius: Math.min(12, layout.rect.width * 0.18),
        style: { color: terminalReveal ? theme.color.surface : theme.color.surface3 },
      },
      {
        kind: "rounded-rect",
        id: `dice-table:die:${layout.node.id}:rim`,
        rect: layout.rect,
        radius: Math.min(12, layout.rect.width * 0.18),
        style: {
          color: motion.activeNodeId === layout.node.id ? theme.color.accent : theme.color.borderStrong,
          mode: "stroke",
          strokeWidth: motion.activeNodeId === layout.node.id ? 2.5 : 1,
          ...(motion.activeNodeId === layout.node.id ? {
            accentRole: "active-dock" as const,
            glow: profile.bloom && theme.material.glowBudget === "accent-only",
          } : {}),
        },
      },
      {
        kind: "text",
        id: `dice-table:die:${layout.node.id}:label`,
        at: { x: layout.rect.x + 8, y: layout.rect.y + Math.min(22, layout.rect.height * 0.35) },
        text: fitted(label, layout.rect.width),
        size: Math.max(9, Math.min(15, layout.rect.width * 0.12)),
        style: { color: terminalReveal ? theme.color.text : theme.color.textSecondary },
      },
    );
    if (terminalReveal) {
      commands.push(...pipCommands(layout.node.id, layout.rect, diceFace(layout.node.label), theme.color.pieceDark));
    }
  }

  return {
    family: "dice_table",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      cupShake: !terminalReveal && motion.beat === "move",
      cupShakeOffset: shake,
      countOnly: !terminalReveal,
      terminalReveal,
      revealProgress: progress,
      shaderDetail: profile.shaderDetail,
      diceMaterial: theme.material.inkTreatment,
    }),
  };
};

/** Uses the same ordinal table partition as the semantic dice controls. */
export function hitTestDiceTable(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (scene.rendererFamily !== "dice_table") return null;
  return hitTestOrdinal(point, scene, diceColumns(scene.nodes.length));
}
