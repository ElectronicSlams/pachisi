import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import { hitTestOrdinal, hitZonesForLayouts, ordinalLayouts, rendererBounds } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type { Point, RenderCommand, RenderPlanBuilder } from "../types";

type EconomicMode = "bargaining" | "negotiation" | "economic";

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "economic_panel") {
    throw new TypeError(`Economic panel cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function economicMode(slug: string): EconomicMode {
  "worklet";
  if (slug === "bargaining") return "bargaining";
  if (slug === "negotiation") return "negotiation";
  return "economic";
}

function safePublicLabel(label: string): string {
  "worklet";
  const value = publicCellValue(label);
  return /\b(?:private|hidden|secret)\b/iu.test(value) ? "PUBLIC STATE UNAVAILABLE" : value;
}

function economicCellKind(label: string, ordinal: number, mode: EconomicMode): "offer" | "bid" | "term" | "status" {
  "worklet";
  if (/\b(?:offer|propose|split)\b/iu.test(label)) return "offer";
  if (/\b(?:bid|price|amount)\b/iu.test(label)) return "bid";
  if (/\b(?:delivery|term|condition|quantity)\b/iu.test(label)) return "term";
  if (mode === "bargaining") return ordinal % 2 === 0 ? "offer" : "status";
  if (mode === "negotiation") return ordinal % 2 === 0 ? "bid" : "term";
  return "status";
}

function fitted(label: string, width: number): string {
  "worklet";
  const max = Math.max(6, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

/** Builds public offer, bid, bargaining, and negotiation state without inventing terms. */
export const buildEconomicPanelPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const mode = economicMode(scene.gameSlug);
  const columns = mode === "negotiation" ? 2 : Math.max(1, Math.min(3, scene.nodes.length));
  const layouts = ordinalLayouts(scene, {
    x: bounds.x + bounds.width * 0.06,
    y: bounds.y + bounds.height * 0.22,
    width: bounds.width * 0.88,
    height: bounds.height * 0.65,
  }, columns, 9);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "economic-panel:surface",
      rect: bounds,
      radius: Math.min(22, bounds.height * 0.06),
      style: { color: theme.color.surface2 },
    },
    {
      kind: "text",
      id: "economic-panel:title",
      at: { x: bounds.x + 15, y: bounds.y + 24 },
      text: mode === "bargaining" ? "BARGAINING · SPLIT" : mode === "negotiation" ? "PRICE · DELIVERY" : "ECONOMIC STATE",
      size: 13,
      style: { color: theme.color.text },
    },
    {
      kind: "line",
      id: "economic-panel:timeline",
      from: { x: bounds.x + bounds.width * 0.08, y: bounds.y + bounds.height * 0.15 },
      to: { x: bounds.x + bounds.width * 0.92, y: bounds.y + bounds.height * 0.15 },
      style: { color: theme.color.borderStrong, strokeWidth: 1 },
    },
  ];

  for (const [ordinal, layout] of layouts.entries()) {
    const label = safePublicLabel(layout.node.label);
    const kind = economicCellKind(label, ordinal, mode);
    const active = motion.activeNodeId === layout.node.id;
    commands.push(
      {
        kind: "rounded-rect",
        id: `economic-panel:item:${layout.node.id}:fill`,
        rect: layout.rect,
        radius: 10,
        style: { color: kind === "offer" ? theme.color.accentSofter : theme.color.surface },
      },
      {
        kind: "rounded-rect",
        id: `economic-panel:item:${layout.node.id}:rim`,
        rect: layout.rect,
        radius: 10,
        style: {
          color: active ? theme.color.accent : kind === "offer" ? theme.color.accentLine : theme.color.borderStrong,
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
        id: `economic-panel:item:${layout.node.id}:kind`,
        at: { x: layout.rect.x + 9, y: layout.rect.y + 16 },
        text: kind.toUpperCase(),
        size: 8,
        style: { color: theme.color.textTertiary },
      },
      {
        kind: "text",
        id: `economic-panel:item:${layout.node.id}:label`,
        at: { x: layout.rect.x + 9, y: layout.rect.y + Math.min(36, layout.rect.height * 0.52) },
        text: fitted(label, layout.rect.width),
        size: Math.max(9, Math.min(14, layout.rect.width * 0.1)),
        style: { color: theme.color.text },
      },
    );
  }

  if (scene.summary.terminal || motion.beat === "result") {
    commands.push({
      kind: "line",
      id: "economic-panel:agreement-sweep",
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
    family: "economic_panel",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      economicMode: mode,
      offers: true,
      bids: true,
      bargaining: mode === "bargaining",
      negotiation: mode === "negotiation",
      agreementProgress: progress,
      shaderDetail: profile.shaderDetail,
      panelMaterial: theme.material.plane,
    }),
  };
};

/** Resolves public offer controls in the same panel partition used by rendering. */
export function hitTestEconomicPanel(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (scene.rendererFamily !== "economic_panel") return null;
  const columns = economicMode(scene.gameSlug) === "negotiation"
    ? 2
    : Math.max(1, Math.min(3, scene.nodes.length));
  return hitTestOrdinal(point, scene, columns);
}
