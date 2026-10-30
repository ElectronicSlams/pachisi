import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import { hitTestOrdinal, hitZonesForLayouts, ordinalLayouts, rendererBounds } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type { Point, RenderCommand, RenderPlanBuilder } from "../types";

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "auction_panel") {
    throw new TypeError(`Auction panel cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function auctionLabel(label: string, actionable: boolean, terminal: boolean): string {
  "worklet";
  const value = publicCellValue(label);
  if (/\b(?:private|hidden|secret)\b/iu.test(value)) return "SEALED BID";
  if (terminal || actionable) return value;
  if (/\b(?:bid|value|player|amount|valuation)\b/iu.test(value) || /[$£€]\s*\d/u.test(value)) {
    return "SEALED BID";
  }
  return value;
}

function fitted(label: string, width: number): string {
  "worklet";
  const max = Math.max(6, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

/** Builds a sealed-bid panel whose public state cannot reveal submitted bids early. */
export const buildAuctionPanelPlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const columns = Math.max(1, Math.min(3, scene.nodes.length));
  const layouts = ordinalLayouts(scene, {
    x: bounds.x + bounds.width * 0.07,
    y: bounds.y + bounds.height * 0.28,
    width: bounds.width * 0.86,
    height: bounds.height * 0.57,
  }, columns, 9);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "auction-panel:surface",
      rect: bounds,
      radius: Math.min(24, bounds.height * 0.07),
      style: { color: theme.color.surface2 },
    },
    {
      kind: "text",
      id: "auction-panel:title",
      at: { x: bounds.x + 16, y: bounds.y + 24 },
      text: "FIRST-PRICE · SEALED BID",
      size: 13,
      style: { color: theme.color.text },
    },
    {
      kind: "text",
      id: "auction-panel:state",
      at: { x: bounds.x + 16, y: bounds.y + 45 },
      text: scene.summary.terminal ? "BIDS REVEALED" : "BIDS REMAIN PRIVATE UNTIL CLOSE",
      size: 10,
      style: { color: scene.summary.terminal ? theme.color.winText : theme.color.textSecondary },
    },
  ];

  for (const layout of layouts) {
    const actionable = layout.node.actionTargetId !== null;
    const label = auctionLabel(layout.node.label, actionable, scene.summary.terminal);
    const active = motion.activeNodeId === layout.node.id;
    commands.push(
      {
        kind: "rounded-rect",
        id: `auction-panel:lot:${layout.node.id}:fill`,
        rect: layout.rect,
        radius: 10,
        style: { color: actionable ? theme.color.surface : theme.color.surface3 },
      },
      {
        kind: "rounded-rect",
        id: `auction-panel:lot:${layout.node.id}:rim`,
        rect: layout.rect,
        radius: 10,
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
        id: `auction-panel:lot:${layout.node.id}:label`,
        at: { x: layout.rect.x + 10, y: layout.rect.y + Math.min(24, layout.rect.height * 0.4) },
        text: fitted(label, layout.rect.width),
        size: Math.max(9, Math.min(14, layout.rect.width * 0.1)),
        style: { color: actionable ? theme.color.text : theme.color.textSecondary },
      },
    );
  }

  if (scene.summary.terminal || motion.beat === "reveal" || motion.beat === "result") {
    commands.push({
      kind: "line",
      id: "auction-panel:result-sweep",
      from: { x: bounds.x + bounds.width * 0.08, y: bounds.y + bounds.height * 0.91 },
      to: { x: bounds.x + bounds.width * (0.08 + 0.84 * progress), y: bounds.y + bounds.height * 0.91 },
      style: {
        color: theme.color.accent,
        strokeWidth: 3,
        accentRole: "result-sweep",
        glow: profile.bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }

  return {
    family: "auction_panel",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(layouts),
    metadata: planMetadata(scene, motion, {
      sealedBid: true,
      bidsRevealed: scene.summary.terminal,
      revealProgress: progress,
      firstPrice: scene.gameSlug === "first-price-sealed-bid-auction",
      shaderDetail: profile.shaderDetail,
      panelMaterial: theme.material.plane,
    }),
  };
};

/** Resolves the semantic bid control in the panel's exact ordinal partition. */
export function hitTestAuctionPanel(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (scene.rendererFamily !== "auction_panel") return null;
  return hitTestOrdinal(point, scene, Math.max(1, Math.min(3, scene.nodes.length)));
}
