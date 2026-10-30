import type { BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { gridLayouts, isNormalizedPoint, rendererBounds, targetForNode, type NodeLayout } from "../geometry";
import { controlledDropBounce, qualityProfile } from "../motion";
import { materialLayer, planMetadata } from "../plan";
import type { HitTestStrategy } from "../renderer-factory";
import type { MotionState, Rect, RenderCommand, RenderPlanBuilder } from "../types";

type Disc = "first" | "second" | null;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


export const hitTestConnectFour: HitTestStrategy = (point, scene) => {
  "worklet";
  if (!isNormalizedPoint(point) || scene.cols <= 0) return null;
  const col = Math.min(scene.cols - 1, Math.floor(point.x * scene.cols));
  const candidate = scene.nodes.find((node, ordinal) => (node.col ?? ordinal % scene.cols) === col
    && node.actionTargetId !== null);
  return targetForNode(scene, candidate);
};

function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "connect_four") {
    throw new TypeError(`connect_four renderer cannot consume ${scene.rendererFamily}.`);
  }
}

function aspectBounds(rect: Rect, aspect: number): Rect {
  "worklet";
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const width = Math.min(rect.width, rect.height * safeAspect);
  const height = width / safeAspect;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}


function selectedLayout(layouts: readonly NodeLayout[], motion: MotionState): NodeLayout | null {
  "worklet";
  return layouts.find(({ node }) => node.id === motion.activeNodeId)
    ?? layouts.find(({ node }) => node.actionTargetId === motion.lastActionTargetId)
    ?? null;
}

function cellValue(label: string): string {
  "worklet";
  return label.replace(/^Row\s+\d+,\s*column\s+\d+:\s*/iu, "").trim();
}

function discForLabel(label: string): Disc {
  "worklet";
  const value = cellValue(label).toLowerCase().replace(/[\s_-]+/gu, " ").trim();
  if (/^(?:r|red|x|black|dark|player 1|p1|1)$/u.test(value)) return "first";
  if (/^(?:y|yellow|o|white|light|player 2|p2|2|-1)$/u.test(value)) return "second";
  return null;
}

export const buildConnectFourPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const board = aspectBounds(rendererBounds(motion), Math.max(1, scene.cols) / Math.max(1, scene.rows));
  const layouts = gridLayouts(scene, board, 2);
  const selected = selectedLayout(layouts, motion);
  const dropProgress = selected && motion.beat === "move"
    ? controlledDropBounce(motion.progress, motion.reducedMotion)
    : 1;
  const profile = qualityProfile(motion);
  const radius = Math.max(2, Math.min(
    board.width / Math.max(1, scene.cols),
    board.height / Math.max(1, scene.rows),
  ) * 0.38);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "connect:frame",
      rect: board,
      radius: Math.max(8, radius * 0.45),
      style: { color: theme.color.boardDark },
    },
  ];

  for (const layout of layouts) {
    commands.push({
      kind: "circle",
      id: `connect:well:${layout.node.id}`,
      center: layout.center,
      radius,
      style: { color: theme.color.boardBackground, alpha: 0.96 },
    });
  }

  if (selected
    && selected.node.actionTargetId !== null
    && discForLabel(selected.node.label) === null
    && !scene.summary.terminal) {
    commands.push({
      kind: "circle",
      id: `connect:drop-preview:${selected.node.id}`,
      center: selected.center,
      radius: radius * 0.82,
      style: {
        color: theme.color.accent,
        alpha: 0.38,
        mode: "stroke",
        strokeWidth: Math.max(2, radius * 0.12),
        accentRole: "move-trail",
      },
    });
  }

  for (const layout of layouts) {
    const disc = discForLabel(layout.node.label);
    if (disc === null) continue;
    const isDropping = selected?.node.id === layout.node.id && motion.beat === "move";
    const center = isDropping
      ? {
          x: layout.center.x,
          y: board.y - radius + (layout.center.y - (board.y - radius)) * dropProgress,
        }
      : layout.center;

    if (isDropping && profile.trails && theme.material.moveTrail) {
      commands.push({
        kind: "circle",
        id: `connect:drop-trail:${layout.node.id}`,
        center: { x: center.x, y: (center.y + board.y) / 2 },
        radius: radius * 0.7,
        style: {
          color: theme.color.accent,
          alpha: 0.2,
          accentRole: "move-trail",
          trail: true,
        },
      });
    }

    commands.push({
      kind: "circle",
      id: `connect:disc:${layout.node.id}`,
      center,
      radius: radius * 0.9,
      style: { color: disc === "first" ? theme.ink.pieceA : theme.ink.pieceB },
    });

    if (selected?.node.id === layout.node.id) {
      commands.push({
        kind: "circle",
        id: `connect:last-move:${layout.node.id}`,
        center: layout.center,
        radius: radius,
        style: {
          color: theme.color.accent,
          mode: "stroke",
          strokeWidth: Math.max(2, radius * 0.12),
          accentRole: "last-move",
          glow: profile.bloom && theme.material.glowBudget === "accent-only",
        },
      });
    }
  }

  const hitZones = layouts.flatMap(({ node, rect }, ordinal) => {
    if (node.actionTargetId === null) return [];
    const col = node.col ?? ordinal % Math.max(1, scene.cols);
    return [{
      id: `hit:${node.id}`,
      rect: {
        x: board.x + board.width * col / Math.max(1, scene.cols),
        y: board.y,
        width: board.width / Math.max(1, scene.cols),
        height: board.height,
      },
      actionTargetId: node.actionTargetId,
    }];
  });

  return {
    family: "connect_four",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, board),
    commands,
    hitZones,
    metadata: planMetadata(scene, motion, {
      variant: "gravity-grid",
      controlledBounce: true,
      dropProgress,
      droppingNodeId: selected?.node.id ?? null,
      materialLayer: theme.material.boardSurface,
    }),
  };
};
