import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import { hitTestOrdinal, hitZonesForLayouts, ordinalLayouts, rendererBounds } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type { Point, RenderCommand, RenderPlanBuilder } from "../types";

type Outcome = "win" | "loss" | "draw" | "neutral";

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "payoff_matrix") {
    throw new TypeError(`Payoff matrix cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function matrixColumns(scene: BoardScene, rps: boolean): number {
  "worklet";
  if (rps) return 3;
  if (scene.cols > 0) return scene.cols;
  return Math.max(1, Math.ceil(Math.sqrt(Math.max(1, scene.nodes.length))));
}

function safePublicLabel(label: string): string {
  "worklet";
  const value = publicCellValue(label);
  return /\b(?:private|hidden|secret)\b/iu.test(value) ? "PUBLIC STATE UNAVAILABLE" : value;
}

function outcomeTone(label: string): Outcome {
  "worklet";
  const value = publicCellValue(label);
  if (/\b(?:win|winner|reward|positive)\b/iu.test(value) || /^\s*\+/u.test(value)) return "win";
  if (/\b(?:loss|lose|penalty|negative)\b/iu.test(value) || /^\s*-/u.test(value)) return "loss";
  if (/\b(?:draw|tie|neutral)\b/iu.test(value) || /^\s*0(?:\D|$)/u.test(value)) return "draw";
  return "neutral";
}

function fitted(label: string, width: number): string {
  "worklet";
  const max = Math.max(4, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

function outcomeText(outcome: Outcome, theme: Parameters<RenderPlanBuilder>[1]): string {
  "worklet";
  if (outcome === "win") return theme.color.winText;
  if (outcome === "loss") return theme.color.lossText;
  if (outcome === "draw") return theme.color.drawText;
  return theme.color.text;
}

/** Builds payoff grids and the simultaneous Rock Paper Scissors reveal surface. */
export const buildPayoffMatrixPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const rps = scene.gameSlug === "rock-paper-scissors";
  const columns = matrixColumns(scene, rps);
  const layouts = ordinalLayouts(scene, {
    x: bounds.x + bounds.width * 0.08,
    y: bounds.y + bounds.height * 0.2,
    width: bounds.width * 0.84,
    height: bounds.height * 0.68,
  }, columns, 7);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "payoff-matrix:surface",
      rect: bounds,
      radius: Math.min(22, bounds.height * 0.06),
      style: { color: theme.color.surface2 },
    },
    {
      kind: "text",
      id: "payoff-matrix:title",
      at: { x: bounds.x + 14, y: bounds.y + 24 },
      text: rps ? "SIMULTANEOUS CHOICE" : "PAYOFF MATRIX",
      size: 13,
      style: { color: theme.color.text },
    },
    {
      kind: "text",
      id: "payoff-matrix:axes",
      at: { x: bounds.x + 14, y: bounds.y + 43 },
      text: rps && !scene.summary.terminal ? "CHOICES REVEAL TOGETHER" : "ROW PLAYER · COLUMN PLAYER",
      size: 9,
      style: { color: theme.color.textSecondary },
    },
  ];

  for (const [ordinal, layout] of layouts.entries()) {
    const publicLabel = rps && !scene.summary.terminal && layout.node.actionTargetId === null
      ? "COMMITTED"
      : safePublicLabel(layout.node.label);
    const outcome = outcomeTone(publicLabel);
    const active = motion.activeNodeId === layout.node.id;
    const diagonal = ordinal % (columns + 1) === 0;
    const fill = outcome === "win"
      ? theme.color.winSoft
      : outcome === "loss"
        ? theme.color.lossSoft
        : outcome === "draw"
          ? theme.color.drawSoft
          : diagonal
            ? theme.color.surface3
            : theme.color.surface;
    commands.push(
      {
        kind: "rounded-rect",
        id: `payoff-matrix:cell:${layout.node.id}:fill`,
        rect: layout.rect,
        radius: rps ? Math.min(18, layout.rect.height * 0.22) : 6,
        style: { color: fill },
      },
      {
        kind: "rounded-rect",
        id: `payoff-matrix:cell:${layout.node.id}:rim`,
        rect: layout.rect,
        radius: rps ? Math.min(18, layout.rect.height * 0.22) : 6,
        style: {
          color: active ? theme.color.accent : theme.color.borderStrong,
          mode: "stroke",
          strokeWidth: active ? 2.5 : 1,
          ...(active ? {
            accentRole: "active-dock" as const,
            glow: profile.bloom && theme.material.glowBudget === "accent-only",
          } : {}),
        },
      },
      {
        kind: "text",
        id: `payoff-matrix:cell:${layout.node.id}:label`,
        at: { x: layout.rect.x + 8, y: layout.rect.y + Math.min(26, layout.rect.height * 0.48) },
        text: fitted(publicLabel, layout.rect.width),
        size: Math.max(9, Math.min(15, layout.rect.width * 0.12)),
        style: { color: outcomeText(outcome, theme) },
      },
    );
  }

  if (scene.summary.terminal || motion.beat === "reveal" || motion.beat === "result") {
    commands.push({
      kind: "line",
      id: "payoff-matrix:reveal-sweep",
      from: { x: bounds.x + bounds.width * 0.08, y: bounds.y + bounds.height * 0.92 },
      to: { x: bounds.x + bounds.width * (0.08 + progress * 0.84), y: bounds.y + bounds.height * 0.92 },
      style: {
        color: theme.color.accent,
        strokeWidth: 3,
        accentRole: "result-sweep",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  return {
    family: "payoff_matrix",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      matrixKind: rps ? "rock-paper-scissors" : "payoff",
      simultaneous: rps,
      choicesRevealed: scene.summary.terminal,
      revealProgress: progress,
      rows: scene.rows || Math.max(1, Math.ceil(scene.nodes.length / columns)),
      columns,
      shaderDetail: profile.shaderDetail,
      panelMaterial: theme.material.plane,
    }),
  };
};

/** Resolves an action using the same matrix column count as the render plan. */
export function hitTestPayoffMatrix(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (scene.rendererFamily !== "payoff_matrix") return null;
  return hitTestOrdinal(point, scene, matrixColumns(scene, scene.gameSlug === "rock-paper-scissors"));
}
