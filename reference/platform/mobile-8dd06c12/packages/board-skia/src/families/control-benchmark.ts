import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { hitTestOrdinal, hitZonesForLayouts, ordinalLayouts, rendererBounds } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type { Point, Rect, RenderCommand, RenderPlanBuilder } from "../types";

type PosterFamily =
  | "grid-world"
  | "control-track"
  | "lander"
  | "racing"
  | "walker"
  | "paddle"
  | "shooter"
  | "boxing"
  | "hockey"
  | "benchmark";

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "control_benchmark") {
    throw new TypeError(`Control benchmark cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function posterFamily(slug: string): PosterFamily {
  "worklet";
  if (slug === "taxi" || slug === "frozen-lake" || slug === "cliff-walking") return "grid-world";
  if (slug === "cartpole" || slug === "mountain-car") return "control-track";
  if (slug === "lunar-lander") return "lander";
  if (slug === "car-racing") return "racing";
  if (slug === "bipedal-walker") return "walker";
  if (slug === "paddle-ball") return "paddle";
  if (slug === "alien-shooter") return "shooter";
  if (slug === "boxing-style-arena") return "boxing";
  if (slug === "ice-hockey-style-arena") return "hockey";
  return "benchmark";
}

function posterTitle(slug: string): string {
  "worklet";
  return slug.replace(/-/gu, " ").toUpperCase();
}

function gridWorldPoster(slug: string, stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const rows = 4;
  const cols = 6;
  const commands: RenderCommand[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const danger = slug === "cliff-walking" && row === rows - 1 && col > 0 && col < cols - 1;
      const ice = slug === "frozen-lake" && (row + col) % 5 === 0;
      commands.push({
        kind: "rect",
        id: `control-benchmark:grid:${row}:${col}`,
        rect: {
          x: stage.x + col * stage.width / cols,
          y: stage.y + row * stage.height / rows,
          width: stage.width / cols,
          height: stage.height / rows,
        },
        style: {
          color: danger ? theme.color.lossSoft : ice ? theme.color.accentSofter : theme.color.surface3,
          mode: "fill",
        },
      });
    }
  }
  const col = Math.min(cols - 1, Math.floor(progress * cols));
  commands.push({
    kind: "circle",
    id: "control-benchmark:grid:agent",
    center: {
      x: stage.x + (col + 0.5) * stage.width / cols,
      y: stage.y + (rows - 0.5) * stage.height / rows,
    },
    radius: Math.min(stage.width / cols, stage.height / rows) * 0.23,
    style: { color: theme.color.accent, accentRole: "last-move" },
  });
  return commands;
}

function controlTrackPoster(slug: string, stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const x = stage.x + stage.width * (0.14 + progress * 0.68);
  const baseY = stage.y + stage.height * 0.72;
  const commands: RenderCommand[] = [
    {
      kind: "line",
      id: "control-benchmark:track:ground",
      from: { x: stage.x + stage.width * 0.06, y: baseY },
      to: { x: stage.x + stage.width * 0.94, y: baseY },
      style: { color: theme.color.boardLine, strokeWidth: 3 },
    },
    {
      kind: "rounded-rect",
      id: "control-benchmark:track:vehicle",
      rect: { x: x - 21, y: baseY - 20, width: 42, height: 18 },
      radius: 4,
      style: { color: theme.color.accent, accentRole: "last-move" },
    },
  ];
  if (slug === "cartpole") {
    commands.push({
      kind: "line",
      id: "control-benchmark:track:pole",
      from: { x, y: baseY - 20 },
      to: { x: x + 24 * (1 - progress), y: baseY - stage.height * 0.55 },
      style: { color: theme.color.pieceLight, strokeWidth: 4 },
    });
  } else {
    commands.push({
      kind: "arc",
      id: "control-benchmark:track:mountain",
      rect: { x: stage.x + stage.width * 0.05, y: stage.y + stage.height * 0.28, width: stage.width * 0.9, height: stage.height * 0.7 },
      startDegrees: 180,
      sweepDegrees: 180,
      useCenter: false,
      style: { color: theme.color.borderStrong, mode: "stroke", strokeWidth: 2 },
    });
  }
  return commands;
}

function landerPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const y = stage.y + stage.height * (0.18 + progress * 0.48);
  return [
    {
      kind: "polygon",
      id: "control-benchmark:lander:terrain",
      points: [
        { x: stage.x, y: stage.y + stage.height * 0.78 },
        { x: stage.x + stage.width * 0.24, y: stage.y + stage.height * 0.62 },
        { x: stage.x + stage.width * 0.48, y: stage.y + stage.height * 0.78 },
        { x: stage.x + stage.width * 0.72, y: stage.y + stage.height * 0.68 },
        { x: stage.x + stage.width, y: stage.y + stage.height * 0.78 },
      ],
      closed: false,
      style: { color: theme.color.boardLine, mode: "stroke", strokeWidth: 3 },
    },
    {
      kind: "polygon",
      id: "control-benchmark:lander:craft",
      points: [
        { x: stage.x + stage.width * 0.5, y },
        { x: stage.x + stage.width * 0.45, y: y + 28 },
        { x: stage.x + stage.width * 0.55, y: y + 28 },
      ],
      closed: true,
      style: { color: theme.color.accent, accentRole: "last-move" },
    },
  ];
}

function racingPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const commands: RenderCommand[] = [];
  for (let lane = 1; lane < 4; lane += 1) {
    commands.push({
      kind: "line",
      id: `control-benchmark:racing:lane:${lane}`,
      from: { x: stage.x + stage.width * 0.08, y: stage.y + stage.height * lane / 4 },
      to: { x: stage.x + stage.width * 0.92, y: stage.y + stage.height * lane / 4 },
      style: { color: theme.color.boardLine, alpha: 0.7, strokeWidth: 1 },
    });
  }
  commands.push({
    kind: "rounded-rect",
    id: "control-benchmark:racing:car",
    rect: { x: stage.x + stage.width * (0.08 + progress * 0.72), y: stage.y + stage.height * 0.43, width: 44, height: 24 },
    radius: 6,
    style: { color: theme.color.accent, accentRole: "last-move" },
  });
  return commands;
}

function walkerPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const center = { x: stage.x + stage.width * (0.2 + progress * 0.6), y: stage.y + stage.height * 0.48 };
  return [
    {
      kind: "line",
      id: "control-benchmark:walker:ground",
      from: { x: stage.x + 10, y: stage.y + stage.height * 0.82 },
      to: { x: stage.x + stage.width - 10, y: stage.y + stage.height * 0.82 },
      style: { color: theme.color.boardLine, strokeWidth: 2 },
    },
    {
      kind: "line",
      id: "control-benchmark:walker:leg-a",
      from: center,
      to: { x: center.x - 28 * progress, y: stage.y + stage.height * 0.82 },
      style: { color: theme.color.accent, strokeWidth: 5, accentRole: "last-move" },
    },
    {
      kind: "line",
      id: "control-benchmark:walker:leg-b",
      from: center,
      to: { x: center.x + 28 * progress, y: stage.y + stage.height * 0.82 },
      style: { color: theme.color.pieceLight, strokeWidth: 5 },
    },
    {
      kind: "circle",
      id: "control-benchmark:walker:body",
      center,
      radius: 13,
      style: { color: theme.color.surface },
    },
  ];
}

function paddlePoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  return [
    {
      kind: "rect",
      id: "control-benchmark:paddle:left",
      rect: { x: stage.x + 18, y: stage.y + stage.height * 0.32, width: 8, height: stage.height * 0.34 },
      style: { color: theme.color.pieceLight },
    },
    {
      kind: "rect",
      id: "control-benchmark:paddle:right",
      rect: { x: stage.x + stage.width - 26, y: stage.y + stage.height * 0.32, width: 8, height: stage.height * 0.34 },
      style: { color: theme.color.pieceLight },
    },
    {
      kind: "circle",
      id: "control-benchmark:paddle:ball",
      center: { x: stage.x + stage.width * (0.18 + progress * 0.64), y: stage.y + stage.height * (0.35 + progress * 0.3) },
      radius: 8,
      style: { color: theme.color.accent, accentRole: "last-move" },
    },
  ];
}

function shooterPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  const commands: RenderCommand[] = [];
  for (let index = 0; index < 8; index += 1) {
    commands.push({
      kind: "polygon",
      id: `control-benchmark:shooter:alien:${index}`,
      points: [
        { x: stage.x + 30 + (index % 4) * 52, y: stage.y + 28 + Math.floor(index / 4) * 38 },
        { x: stage.x + 42 + (index % 4) * 52, y: stage.y + 42 + Math.floor(index / 4) * 38 },
        { x: stage.x + 18 + (index % 4) * 52, y: stage.y + 42 + Math.floor(index / 4) * 38 },
      ],
      closed: true,
      style: { color: theme.color.pieceLight },
    });
  }
  commands.push({
    kind: "polygon",
    id: "control-benchmark:shooter:ship",
    points: [
      { x: stage.x + stage.width * (0.14 + progress * 0.7), y: stage.y + stage.height * 0.72 },
      { x: stage.x + stage.width * (0.14 + progress * 0.7) - 18, y: stage.y + stage.height * 0.86 },
      { x: stage.x + stage.width * (0.14 + progress * 0.7) + 18, y: stage.y + stage.height * 0.86 },
    ],
    closed: true,
    style: { color: theme.color.accent, accentRole: "last-move" },
  });
  return commands;
}

function boxingPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  return [
    {
      kind: "rounded-rect",
      id: "control-benchmark:boxing:ring",
      rect: { x: stage.x + stage.width * 0.08, y: stage.y + stage.height * 0.14, width: stage.width * 0.84, height: stage.height * 0.7 },
      radius: 6,
      style: { color: theme.color.borderStrong, mode: "stroke", strokeWidth: 3 },
    },
    {
      kind: "circle",
      id: "control-benchmark:boxing:fighter-a",
      center: { x: stage.x + stage.width * (0.28 + progress * 0.12), y: stage.y + stage.height * 0.54 },
      radius: 22,
      style: { color: theme.color.accent, accentRole: "last-move" },
    },
    {
      kind: "circle",
      id: "control-benchmark:boxing:fighter-b",
      center: { x: stage.x + stage.width * (0.72 - progress * 0.12), y: stage.y + stage.height * 0.54 },
      radius: 22,
      style: { color: theme.color.loss },
    },
  ];
}

function hockeyPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  return [
    {
      kind: "rounded-rect",
      id: "control-benchmark:hockey:rink",
      rect: { x: stage.x + 8, y: stage.y + 8, width: stage.width - 16, height: stage.height - 16 },
      radius: stage.height * 0.44,
      style: { color: theme.color.borderStrong, mode: "stroke", strokeWidth: 3 },
    },
    {
      kind: "line",
      id: "control-benchmark:hockey:center-line",
      from: { x: stage.x + stage.width * 0.5, y: stage.y + 10 },
      to: { x: stage.x + stage.width * 0.5, y: stage.y + stage.height - 10 },
      style: { color: theme.color.boardLine, strokeWidth: 2 },
    },
    {
      kind: "circle",
      id: "control-benchmark:hockey:puck",
      center: { x: stage.x + stage.width * (0.18 + progress * 0.64), y: stage.y + stage.height * 0.54 },
      radius: 9,
      style: { color: theme.color.accent, accentRole: "last-move" },
    },
  ];
}

function benchmarkPoster(stage: Rect, progress: number, theme: ThemeTokens): readonly RenderCommand[] {
  "worklet";
  return [
    {
      kind: "line",
      id: "control-benchmark:generic:axis-x",
      from: { x: stage.x + 20, y: stage.y + stage.height - 22 },
      to: { x: stage.x + stage.width - 15, y: stage.y + stage.height - 22 },
      style: { color: theme.color.boardLine, strokeWidth: 2 },
    },
    {
      kind: "line",
      id: "control-benchmark:generic:trace",
      from: { x: stage.x + 20, y: stage.y + stage.height * 0.66 },
      to: { x: stage.x + 20 + (stage.width - 35) * progress, y: stage.y + stage.height * 0.24 },
      style: { color: theme.color.accent, strokeWidth: 3, accentRole: "last-move" },
    },
  ];
}

function posterCommands(
  family: PosterFamily,
  slug: string,
  stage: Rect,
  progress: number,
  theme: ThemeTokens,
): readonly RenderCommand[] {
  "worklet";
  switch (family) {
    case "grid-world":
      return gridWorldPoster(slug, stage, progress, theme);
    case "control-track":
      return controlTrackPoster(slug, stage, progress, theme);
    case "lander":
      return landerPoster(stage, progress, theme);
    case "racing":
      return racingPoster(stage, progress, theme);
    case "walker":
      return walkerPoster(stage, progress, theme);
    case "paddle":
      return paddlePoster(stage, progress, theme);
    case "shooter":
      return shooterPoster(stage, progress, theme);
    case "boxing":
      return boxingPoster(stage, progress, theme);
    case "hockey":
      return hockeyPoster(stage, progress, theme);
    case "benchmark":
      return benchmarkPoster(stage, progress, theme);
  }
}

function fitted(label: string, width: number): string {
  "worklet";
  const max = Math.max(5, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

function safePublicLabel(label: string): string {
  "worklet";
  const value = publicCellValue(label);
  return /\b(?:private|hidden|secret)\b/iu.test(value) ? "PUBLIC METRIC UNAVAILABLE" : value;
}

/** Builds identity-preserving posters for every control benchmark in watch and replay. */
export const buildControlBenchmarkPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const stage = {
    x: bounds.x + bounds.width * 0.05,
    y: bounds.y + bounds.height * 0.13,
    width: bounds.width * 0.9,
    height: bounds.height * 0.57,
  };
  const dock = {
    x: bounds.x + bounds.width * 0.05,
    y: bounds.y + bounds.height * 0.75,
    width: bounds.width * 0.9,
    height: bounds.height * 0.19,
  };
  const columns = Math.max(1, Math.min(4, scene.nodes.length));
  const layouts = ordinalLayouts(scene, dock, columns, 6);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const poster = posterFamily(scene.gameSlug);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "control-benchmark:surface",
      rect: bounds,
      radius: Math.min(20, bounds.height * 0.05),
      style: { color: theme.color.surface2 },
    },
    {
      kind: "text",
      id: "control-benchmark:title",
      at: { x: bounds.x + 14, y: bounds.y + 22 },
      text: posterTitle(scene.gameSlug),
      size: 13,
      style: { color: theme.color.text },
    },
    {
      kind: "text",
      id: "control-benchmark:mode",
      at: { x: bounds.x + bounds.width - 92, y: bounds.y + 22 },
      text: "WATCH · REPLAY",
      size: 9,
      style: { color: theme.color.textSecondary },
    },
    {
      kind: "rounded-rect",
      id: "control-benchmark:stage",
      rect: stage,
      radius: 10,
      style: { color: theme.color.boardBackground },
    },
    ...posterCommands(poster, scene.gameSlug, stage, progress, theme),
  ];

  for (const layout of layouts) {
    const active = motion.activeNodeId === layout.node.id;
    commands.push(
      {
        kind: "rounded-rect",
        id: `control-benchmark:metric:${layout.node.id}:fill`,
        rect: layout.rect,
        radius: 6,
        style: { color: theme.color.surface3 },
      },
      {
        kind: "rounded-rect",
        id: `control-benchmark:metric:${layout.node.id}:rim`,
        rect: layout.rect,
        radius: 6,
        style: {
          color: active ? theme.color.accent : theme.color.borderStrong,
          mode: "stroke",
          strokeWidth: active ? 2 : 1,
          ...(active ? {
            accentRole: "active-dock" as const,
            glow: profile.bloom && theme.material.glowBudget === "accent-only",
          } : {}),
        },
      },
      {
        kind: "text",
        id: `control-benchmark:metric:${layout.node.id}:label`,
        at: { x: layout.rect.x + 6, y: layout.rect.y + Math.min(18, layout.rect.height * 0.52) },
        text: fitted(safePublicLabel(layout.node.label), layout.rect.width),
        size: Math.max(8, Math.min(11, layout.rect.width * 0.09)),
        style: { color: theme.color.textSecondary },
      },
    );
  }

  if (scene.summary.terminal || motion.beat === "result") {
    commands.push({
      kind: "line",
      id: "control-benchmark:result-sweep",
      from: { x: stage.x, y: stage.y + stage.height + 7 },
      to: { x: stage.x + stage.width * progress, y: stage.y + stage.height + 7 },
      style: {
        color: theme.color.accent,
        strokeWidth: 3,
        accentRole: "result-sweep",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  return {
    family: "control_benchmark",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      posterFamily: poster,
      posterIdentity: scene.gameSlug,
      battlefieldPoster: true,
      watch: true,
      replay: true,
      sceneProgress: progress,
      shaderDetail: profile.shaderDetail,
      stageMaterial: theme.material.plane,
    }),
  };
};

/** Resolves optional benchmark controls from the metrics dock. */
export function hitTestControlBenchmark(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (scene.rendererFamily !== "control_benchmark") return null;
  return hitTestOrdinal(point, scene, Math.max(1, Math.min(4, scene.nodes.length)));
}
