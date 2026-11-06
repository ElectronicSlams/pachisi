import type { ActionTarget, BoardScene, BoardSceneNode } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { hitZonesForLayouts, rendererBounds, type NodeLayout } from "../geometry";
import { qualityProfile, resolvedMotionProgress } from "../motion";
import { materialLayer, planMetadata, publicCellValue } from "../plan";
import type {
  HitZone,
  MotionState,
  Point,
  Rect,
  RenderCommand,
  RenderPlan,
  RenderPlanBuilder,
} from "../types";

type CardTableVariant = "blackjack" | "goofspiel" | "hanabi" | "mahjong" | "poker" | "trick" | "fan";

const POKER_SLUGS = new Set([
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
]);
const TRICK_SLUGS = new Set(["bridge", "hearts", "spades", "euchre"]);

// Worklets are dependency-first because workletized functions are intentionally not hoisted.


function assertFamily(scene: BoardScene): void {
  "worklet";
  if (scene.rendererFamily !== "card_table") {
    throw new TypeError(`Card table cannot consume a ${scene.rendererFamily} scene.`);
  }
}


function cardTableVariant(slug: string): CardTableVariant {
  "worklet";
  if (slug === "blackjack") return "blackjack";
  if (slug === "hanabi") return "hanabi";
  if (slug === "mahjong") return "mahjong";
  if (slug === "goofspiel") return "goofspiel";
  if (POKER_SLUGS.has(slug)) return "poker";
  if (TRICK_SLUGS.has(slug)) return "trick";
  return "fan";
}

function asLayout(node: BoardSceneNode, rect: Rect): NodeLayout {
  "worklet";
  return { node, rect, center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } };
}

function ringLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const width = Math.min(58, bounds.width * 0.18);
  const height = Math.min(82, bounds.height * 0.28);
  return nodes.map((node, index) => {
    const angle = -Math.PI / 2 + index / Math.max(1, nodes.length) * Math.PI * 2;
    const center = {
      x: bounds.x + bounds.width * 0.5 + Math.cos(angle) * bounds.width * 0.36,
      y: bounds.y + bounds.height * 0.5 + Math.sin(angle) * bounds.height * 0.32,
    };
    return asLayout(node, { x: center.x - width / 2, y: center.y - height / 2, width, height });
  });
}

function rowLayouts(
  nodes: readonly BoardSceneNode[],
  bounds: Rect,
  yRatio: number,
  widthRatio = 0.18,
): readonly NodeLayout[] {
  "worklet";
  if (nodes.length === 0) return [];
  const width = Math.min(bounds.width * widthRatio, Math.max(30, bounds.width / (nodes.length + 1.4)));
  const height = Math.min(bounds.height * 0.32, width * 1.4);
  const gap = Math.max(3, Math.min(width * 0.2, (bounds.width - width * nodes.length) / (nodes.length + 1)));
  const total = width * nodes.length + gap * (nodes.length - 1);
  const start = bounds.x + (bounds.width - total) / 2;
  return nodes.map((node, index) => asLayout(node, {
    x: start + index * (width + gap),
    y: bounds.y + bounds.height * yRatio,
    width,
    height,
  }));
}

function blackjackLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const dealerCount = Math.max(1, Math.floor(nodes.length / 2));
  const dealer = rowLayouts(nodes.slice(0, dealerCount), bounds, 0.16);
  const player = rowLayouts(nodes.slice(dealerCount), bounds, 0.61);
  return [...dealer, ...player];
}

function goofspielLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const prize = rowLayouts(nodes.slice(0, 1), bounds, 0.12, 0.28);
  const bids = rowLayouts(nodes.slice(1), bounds, 0.58);
  return [...prize, ...bids];
}

function fanLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const count = Math.max(1, nodes.length);
  const cardWidth = Math.min(bounds.width * 0.24, Math.max(34, bounds.width / Math.min(5.5, count + 0.8)));
  const cardHeight = Math.min(bounds.height * 0.52, cardWidth * 1.42);
  const spread = Math.min(bounds.width - cardWidth, cardWidth * 0.58 * Math.max(0, count - 1));
  const startX = bounds.x + (bounds.width - spread - cardWidth) / 2;
  return nodes.map((node, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const arch = Math.pow((ratio - 0.5) * 2, 2);
    const rect = {
      x: startX + ratio * spread,
      y: bounds.y + bounds.height * (0.31 + arch * 0.08),
      width: cardWidth,
      height: cardHeight,
    };
    return asLayout(node, rect);
  });
}

function trickLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const collectionCount = Math.min(4, nodes.length);
  const hand = fanLayouts(nodes.slice(0, -collectionCount || undefined), bounds);
  const collection = ringLayouts(nodes.slice(nodes.length - collectionCount), {
    x: bounds.x + bounds.width * 0.3,
    y: bounds.y + bounds.height * 0.23,
    width: bounds.width * 0.4,
    height: bounds.height * 0.4,
  });
  return [...hand, ...collection];
}

function arenaViewerScene(scene: BoardScene): boolean {
  "worklet";
  return scene.nodes.some(({ id }) => id.startsWith("arena-"));
}

function arenaNodeGroup(node: BoardSceneNode): "center" | "opponent" | "owner" | "other" {
  "worklet";
  if (node.id.startsWith("arena-owner-")) return "owner";
  if (node.id.startsWith("arena-center-")) return "center";
  if (node.id.startsWith("arena-seat-") || node.id.startsWith("arena-partner-")) return "opponent";
  return "other";
}

function arenaSeatKey(node: BoardSceneNode): string {
  "worklet";
  const seat = /^arena-seat-(player_\d+)-/u.exec(node.id);
  const partner = /^arena-partner-(player_\d+)-/u.exec(node.id);
  return seat?.[1] ?? partner?.[1] ?? node.id;
}

function arenaSeatCenters(count: number, bounds: Rect): readonly Point[] {
  "worklet";
  if (count <= 1) return [{ x: 0.5, y: 0.14 }];
  if (count === 2) return [{ x: 0.23, y: 0.16 }, { x: 0.77, y: 0.16 }];
  if (count === 3) return [{ x: 0.15, y: 0.35 }, { x: 0.5, y: 0.13 }, { x: 0.85, y: 0.35 }];
  if (count === 4) {
    return [
      { x: 0.2, y: 0.16 },
      { x: 0.8, y: 0.16 },
      { x: 0.12, y: 0.42 },
      { x: 0.88, y: 0.42 },
    ];
  }
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / Math.max(1, count - 1);
    return {
      x: 0.08 + ratio * 0.84,
      y: 0.13 + Math.pow(Math.abs(ratio - 0.5) * 2, 1.4) * 0.19,
    };
  }).map(({ x, y }) => ({
    x: bounds.width > bounds.height * 1.45 ? x : 0.06 + x * 0.88,
    y,
  }));
}

function arenaOpponentLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  const keys = [...new Set(nodes.map(arenaSeatKey))];
  const centers = arenaSeatCenters(keys.length, bounds);
  const cardWidth = Math.max(24, Math.min(44, bounds.width * (keys.length > 4 ? 0.07 : 0.095)));
  const cardHeight = Math.min(bounds.height * 0.24, cardWidth * 1.42);
  const layouts: NodeLayout[] = [];
  keys.forEach((key, seatIndex) => {
    const group = nodes.filter((node) => arenaSeatKey(node) === key);
    const center = centers[seatIndex] ?? { x: 0.5, y: 0.14 };
    const spread = cardWidth * 0.32 * Math.max(0, group.length - 1);
    group.forEach((node, cardIndex) => {
      const rect = {
        x: bounds.x + center.x * bounds.width - cardWidth / 2 - spread / 2 + cardIndex * cardWidth * 0.32,
        y: bounds.y + center.y * bounds.height - cardHeight / 2,
        width: cardWidth,
        height: cardHeight,
      };
      layouts.push(asLayout(node, rect));
    });
  });
  return layouts;
}

function arenaCenterLayouts(nodes: readonly BoardSceneNode[], bounds: Rect): readonly NodeLayout[] {
  "worklet";
  if (nodes.length === 0) return [];
  const wide = bounds.width > bounds.height * 1.45;
  const width = Math.max(28, Math.min(wide ? 62 : 50, bounds.width / Math.max(7.5, nodes.length + 2)));
  const height = Math.min(bounds.height * (wide ? 0.29 : 0.25), width * 1.42);
  const gap = Math.max(3, Math.min(8, (bounds.width * 0.72 - width * nodes.length) / Math.max(1, nodes.length - 1)));
  const total = width * nodes.length + gap * Math.max(0, nodes.length - 1);
  const start = bounds.x + (bounds.width - total) / 2;
  return nodes.map((node, index) => asLayout(node, {
    x: start + index * (width + gap),
    y: bounds.y + bounds.height * (wide ? 0.37 : 0.4),
    width,
    height,
  }));
}

function arenaOwnerLayouts(
  nodes: readonly BoardSceneNode[],
  bounds: Rect,
  variant: CardTableVariant,
): readonly NodeLayout[] {
  "worklet";
  if (nodes.length === 0) return [];
  const wide = bounds.width > bounds.height * 1.45;
  const aspectRatio = variant === "mahjong" ? 1.28 : 1.42;
  const maximumCardHeight = bounds.height * (wide ? 0.34 : 0.31);
  const cardWidth = Math.max(30, Math.min(
    variant === "mahjong" ? 48 : 64,
    bounds.width / Math.min(7.2, nodes.length + 1.8),
    maximumCardHeight / aspectRatio,
  ));
  const cardHeight = cardWidth * aspectRatio;
  const availableSpread = Math.max(0, bounds.width - cardWidth - Math.max(24, bounds.width * 0.08));
  const spread = Math.min(
    availableSpread,
    cardWidth * (variant === "mahjong" ? 0.58 : 0.52) * Math.max(0, nodes.length - 1),
  );
  const startX = bounds.x + (bounds.width - spread - cardWidth) / 2;
  const baseY = bounds.y + bounds.height - cardHeight - Math.max(8, bounds.height * 0.035);
  return nodes.map((node, index) => {
    const ratio = nodes.length === 1 ? 0.5 : index / (nodes.length - 1);
    const arch = variant === "mahjong" ? 0 : Math.pow((ratio - 0.5) * 2, 2) * cardHeight * 0.09;
    return asLayout(node, {
      x: startX + ratio * spread,
      y: baseY + arch,
      width: cardWidth,
      height: cardHeight,
    });
  });
}

function arenaViewerLayouts(
  scene: BoardScene,
  bounds: Rect,
  variant: CardTableVariant,
): readonly NodeLayout[] {
  "worklet";
  const owner = scene.nodes.filter((node) => arenaNodeGroup(node) === "owner");
  const center = scene.nodes.filter((node) => arenaNodeGroup(node) === "center");
  const opponents = scene.nodes.filter((node) => arenaNodeGroup(node) === "opponent");
  const other = scene.nodes.filter((node) => arenaNodeGroup(node) === "other");
  return [
    ...arenaOpponentLayouts(opponents, bounds),
    ...arenaCenterLayouts([...center, ...other], bounds),
    ...arenaOwnerLayouts(owner, bounds, variant),
  ];
}

function cardLayouts(scene: BoardScene, bounds: Rect, variant: CardTableVariant): readonly NodeLayout[] {
  "worklet";
  if (scene.nodes.length === 0) return [];
  if (arenaViewerScene(scene)) return arenaViewerLayouts(scene, bounds, variant);
  switch (variant) {
    case "poker":
      return ringLayouts(scene.nodes, bounds);
    case "blackjack":
      return blackjackLayouts(scene.nodes, bounds);
    case "goofspiel":
      return goofspielLayouts(scene.nodes, bounds);
    case "trick":
      return trickLayouts(scene.nodes, bounds);
    case "hanabi":
    case "mahjong":
    case "fan":
      return fanLayouts(scene.nodes, bounds);
  }
}

function segmentedArenaHitLayouts(layouts: readonly NodeLayout[]): readonly NodeLayout[] {
  "worklet";
  const actionableOwners = layouts
    .filter(({ node }) => arenaNodeGroup(node) === "owner" && node.actionTargetId !== null)
    .sort((left, right) => left.rect.x - right.rect.x);
  const segmentedById = new Map<string, NodeLayout>();
  actionableOwners.forEach((layout, index) => {
    const next = actionableOwners[index + 1];
    const width = next
      ? Math.max(0.000_001, next.rect.x - layout.rect.x)
      : layout.rect.width;
    segmentedById.set(layout.node.id, asLayout(layout.node, {
      ...layout.rect,
      width,
    }));
  });
  return layouts.map((layout) => segmentedById.get(layout.node.id) ?? layout);
}

function cardHitLayouts(scene: BoardScene, layouts: readonly NodeLayout[]): readonly NodeLayout[] {
  "worklet";
  return arenaViewerScene(scene) ? segmentedArenaHitLayouts(layouts) : layouts;
}

function hanabiHiddenNodeIds(scene: BoardScene): ReadonlySet<string> {
  "worklet";
  const explicit = scene.nodes.filter(({ label }) => /\b(?:you|your|self|player[_ -]?1)\b/iu.test(label));
  const hidden = explicit.length > 0 ? explicit : scene.nodes.slice(0, Math.ceil(scene.nodes.length / 2));
  return new Set(hidden.map(({ id }) => id));
}

function cardTableHiddenNodeIds(scene: BoardScene, variant: CardTableVariant): ReadonlySet<string> {
  "worklet";
  if (!arenaViewerScene(scene)) {
    return variant === "hanabi" ? hanabiHiddenNodeIds(scene) : new Set<string>();
  }
  const explicit = scene.nodes.filter(({ id, label }) => (
    id.startsWith("arena-seat-")
    || /\b(?:hidden|face[ -]?down|card back)\b/iu.test(label)
  ));
  return new Set(explicit.map(({ id }) => id));
}

function tableFramingCommands(
  variant: CardTableVariant,
  bounds: Rect,
  theme: ThemeTokens,
  progress: number,
  bloom: boolean,
): readonly RenderCommand[] {
  "worklet";
  const commands: RenderCommand[] = [];
  if (variant === "blackjack") {
    commands.push(
      {
        kind: "arc",
        id: "card-table:blackjack:dealer-arc",
        rect: { x: bounds.x + bounds.width * 0.12, y: bounds.y + bounds.height * 0.04, width: bounds.width * 0.76, height: bounds.height * 0.56 },
        startDegrees: 0,
        sweepDegrees: 180,
        useCenter: false,
        style: { color: theme.color.borderStrong, mode: "stroke", strokeWidth: 2 },
      },
      {
        kind: "text",
        id: "card-table:blackjack:dealer-label",
        at: { x: bounds.x + bounds.width * 0.5 - 31, y: bounds.y + 18 },
        text: "DEALER",
        size: 11,
        style: { color: theme.color.textSecondary },
      },
    );
  }
  if (variant === "poker") {
    commands.push({
      kind: "arc",
      id: "card-table:poker:active-seat",
      rect: { x: bounds.x + bounds.width * 0.1, y: bounds.y + bounds.height * 0.08, width: bounds.width * 0.8, height: bounds.height * 0.78 },
      startDegrees: 25,
      sweepDegrees: 70 * progress,
      useCenter: false,
      style: {
        color: theme.color.accent,
        mode: "stroke",
        strokeWidth: 3,
        accentRole: "active-seat",
        glow: bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }
  if (variant === "hanabi") {
    commands.push({
      kind: "text",
      id: "card-table:hanabi:visibility-note",
      at: { x: bounds.x + 12, y: bounds.y + 18 },
      text: "YOUR HAND FACES AWAY",
      size: 10,
      style: { color: theme.color.textSecondary },
    });
  }
  if (variant === "goofspiel") {
    commands.push({
      kind: "line",
      id: "card-table:goofspiel:reveal-sweep",
      from: { x: bounds.x + bounds.width * 0.18, y: bounds.y + bounds.height * 0.5 },
      to: { x: bounds.x + bounds.width * (0.18 + 0.64 * progress), y: bounds.y + bounds.height * 0.5 },
      style: {
        color: theme.color.accent,
        strokeWidth: 2,
        accentRole: "result-sweep",
        glow: bloom && theme.material.glowBudget === "accent-only",
      },
    });
  }
  return commands;
}

function dealRect(rect: Rect, bounds: Rect, progress: number, beat: MotionState["beat"]): Rect {
  "worklet";
  if (beat !== "move" && beat !== "reveal") return rect;
  const deckX = bounds.x + bounds.width * 0.5 - rect.width / 2;
  const deckY = bounds.y + bounds.height * 0.5 - rect.height / 2;
  return {
    ...rect,
    x: deckX + (rect.x - deckX) * progress,
    y: deckY + (rect.y - deckY) * progress,
  };
}

function fittedLabel(label: string, width: number): string {
  "worklet";
  const max = Math.max(3, Math.floor(width / 7));
  return label.length > max ? `${label.slice(0, Math.max(1, max - 1))}…` : label;
}

function cardInk(label: string, theme: ThemeTokens): string {
  "worklet";
  return /[♥♦]|\b(?:hearts?|diamonds?|red joker)\b/iu.test(label) ? theme.color.lossText : theme.color.text;
}

function cardPrimitive(
  prefix: string,
  rect: Rect,
  label: string,
  hidden: boolean,
  theme: ThemeTokens,
  active: boolean,
  bloom: boolean,
): readonly RenderCommand[] {
  "worklet";
  const radius = Math.max(4, Math.min(10, rect.width * 0.1));
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: `${prefix}:shadow`,
      rect: { ...rect, x: rect.x + 2, y: rect.y + 3 },
      radius,
      style: { color: theme.color.pieceDark, alpha: 0.18 },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:face`,
      rect,
      radius,
      style: { color: hidden ? theme.color.surface3 : theme.color.surface },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:rim`,
      rect,
      radius,
      style: {
        color: active ? theme.color.accent : theme.color.borderStrong,
        mode: "stroke",
        strokeWidth: active ? 2.5 : 1,
        ...(active ? {
          accentRole: "active-seat" as const,
          glow: bloom && theme.material.glowBudget === "accent-only",
        } : {}),
      },
    },
  ];
  if (hidden) {
    const lineCount = 4;
    for (let index = 0; index < lineCount; index += 1) {
      const ratio = (index + 1) / (lineCount + 1);
      commands.push({
        kind: "line",
        id: `${prefix}:back-line:${index}`,
        from: { x: rect.x + rect.width * 0.16, y: rect.y + rect.height * ratio },
        to: { x: rect.x + rect.width * 0.84, y: rect.y + rect.height * ratio },
        style: { color: theme.color.borderStrong, alpha: 0.72, strokeWidth: 1 },
      });
    }
  }
  commands.push({
    kind: "text",
    id: `${prefix}:label`,
    at: { x: rect.x + Math.max(5, rect.width * 0.1), y: rect.y + Math.max(15, rect.height * 0.2) },
    text: fittedLabel(label, rect.width),
    size: Math.max(8, Math.min(14, rect.width * 0.15)),
    style: { color: hidden ? theme.color.textSecondary : cardInk(label, theme) },
  });
  return commands;
}

function mahjongTilePrimitive(
  prefix: string,
  rect: Rect,
  label: string,
  hidden: boolean,
  theme: ThemeTokens,
  active: boolean,
  bloom: boolean,
): readonly RenderCommand[] {
  "worklet";
  if (hidden) return cardPrimitive(prefix, rect, "HIDDEN", true, theme, active, bloom);
  const compact = /^([BCD])([1-9])$/u.exec(label);
  const legacy = /^([1-9])([MPS])$/u.exec(label);
  const honor = /^(EAST|SOUTH|WEST|NORTH|WHITE|GREEN|RED)$/u.exec(label);
  if (!compact && !legacy && !honor) return cardPrimitive(prefix, rect, label, false, theme, active, bloom);
  const suitToken = compact?.[1] ?? legacy?.[2] ?? "HONOR";
  const number = compact?.[2] ?? legacy?.[1] ?? (
    honor?.[1] === "EAST" ? "E"
      : honor?.[1] === "SOUTH" ? "S"
        : honor?.[1] === "WEST" ? "W"
          : honor?.[1] === "NORTH" ? "N"
            : honor?.[1] === "WHITE" ? "WHT"
              : honor?.[1] === "GREEN" ? "GRN"
                : "RED"
  );
  const suitLabel = suitToken === "B" || suitToken === "S" ? "BAM"
    : suitToken === "C" || suitToken === "M" ? "WAN"
      : suitToken === "D" || suitToken === "P" ? "DOT"
        : "HONOR";
  const ink = suitToken === "C" || suitToken === "M" || honor?.[1] === "RED"
    ? theme.color.lossText
    : suitToken === "B" || suitToken === "S" || honor?.[1] === "GREEN"
      ? theme.color.winText
      : theme.color.accent;
  const radius = Math.max(4, Math.min(9, rect.width * 0.1));
  return [
    {
      kind: "rounded-rect",
      id: `${prefix}:shadow`,
      rect: { ...rect, x: rect.x + 2, y: rect.y + 3 },
      radius,
      style: { color: theme.color.pieceDark, alpha: 0.18 },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:face`,
      rect,
      radius,
      style: { color: theme.color.surface },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:rim`,
      rect,
      radius,
      style: {
        color: active ? theme.color.accent : theme.color.borderStrong,
        mode: "stroke",
        strokeWidth: active ? 2.5 : 1,
        ...(active ? {
          accentRole: "active-seat" as const,
          glow: bloom && theme.material.glowBudget === "accent-only",
        } : {}),
      },
    },
    {
      kind: "text",
      id: `${prefix}:number`,
      at: { x: rect.x + rect.width * 0.16, y: rect.y + rect.height * 0.42 },
      text: number,
      size: Math.max(13, Math.min(23, rect.width * 0.38)),
      style: { color: ink },
    },
    {
      kind: "text",
      id: `${prefix}:suit`,
      at: { x: rect.x + rect.width * 0.16, y: rect.y + rect.height * 0.74 },
      text: suitLabel,
      size: Math.max(7, Math.min(10, rect.width * 0.16)),
      style: { color: theme.color.textSecondary },
    },
  ];
}

function hanabiCardPrimitive(
  prefix: string,
  rect: Rect,
  label: string,
  hidden: boolean,
  theme: ThemeTokens,
  active: boolean,
  bloom: boolean,
): readonly RenderCommand[] {
  "worklet";
  if (hidden) return cardPrimitive(prefix, rect, "HIDDEN", true, theme, active, bloom);
  const match = /^(Red|Blue|Green|Yellow|White) ([1-5])$/u.exec(label);
  if (!match) return cardPrimitive(prefix, rect, label, false, theme, active, bloom);
  const ink = match[1] === "Red" ? theme.color.lossText
    : match[1] === "Green" ? theme.color.winText
      : match[1] === "Blue" ? theme.color.accent
        : match[1] === "White" ? theme.color.textSecondary
          : theme.color.text;
  const radius = Math.max(4, Math.min(9, rect.width * 0.1));
  return [
    {
      kind: "rounded-rect",
      id: `${prefix}:shadow`,
      rect: { ...rect, x: rect.x + 2, y: rect.y + 3 },
      radius,
      style: { color: theme.color.pieceDark, alpha: 0.18 },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:face`,
      rect,
      radius,
      style: { color: theme.color.surface },
    },
    {
      kind: "rounded-rect",
      id: `${prefix}:rim`,
      rect,
      radius,
      style: {
        color: active ? theme.color.accent : ink,
        mode: "stroke",
        strokeWidth: active ? 2.5 : 1.5,
        ...(active ? {
          accentRole: "active-seat" as const,
          glow: bloom && theme.material.glowBudget === "accent-only",
        } : {}),
      },
    },
    {
      kind: "text",
      id: `${prefix}:rank`,
      at: { x: rect.x + rect.width * 0.16, y: rect.y + rect.height * 0.48 },
      text: match[2]!,
      size: Math.max(13, Math.min(23, rect.width * 0.4)),
      style: { color: ink },
    },
    {
      kind: "text",
      id: `${prefix}:color`,
      at: { x: rect.x + rect.width * 0.13, y: rect.y + rect.height * 0.76 },
      text: match[1]!.toLocaleUpperCase("en-US"),
      size: Math.max(6, Math.min(9, rect.width * 0.14)),
      style: { color: ink },
    },
  ];
}

function arenaSeatCardCount(node: BoardSceneNode): number | null {
  "worklet";
  const match = /-of-(\d+)$/u.exec(node.id);
  return match ? Number(match[1]) : null;
}

function arenaViewerFramingCommands(
  scene: BoardScene,
  layouts: readonly NodeLayout[],
  bounds: Rect,
  theme: ThemeTokens,
): readonly RenderCommand[] {
  "worklet";
  if (!arenaViewerScene(scene)) return [];
  const commands: RenderCommand[] = [];
  const ownerLayouts = layouts.filter(({ node }) => arenaNodeGroup(node) === "owner");
  const centerLayouts = layouts.filter(({ node }) => arenaNodeGroup(node) === "center");
  if (ownerLayouts.length > 0) {
    const top = Math.min(...ownerLayouts.map(({ rect }) => rect.y));
    commands.push({
      kind: "text",
      id: "card-table:arena:owner-label",
      at: { x: bounds.x + 10, y: Math.max(bounds.y + 14, top - 8) },
      text: scene.gameSlug === "hanabi" ? "YOUR HAND · FACING AWAY" : "YOUR HAND",
      size: 10,
      style: { color: theme.color.textSecondary },
    });
  }
  if (centerLayouts.length > 0) {
    const top = Math.min(...centerLayouts.map(({ rect }) => rect.y));
    commands.push({
      kind: "text",
      id: "card-table:arena:center-label",
      at: { x: bounds.x + bounds.width * 0.5 - 34, y: Math.max(bounds.y + 14, top - 8) },
      text: scene.gameSlug === "mahjong" ? "DISCARDS" : "TABLE",
      size: 10,
      style: { color: theme.color.textSecondary },
    });
  }
  const opponentGroups = new Map<string, NodeLayout[]>();
  for (const layout of layouts.filter(({ node }) => arenaNodeGroup(node) === "opponent")) {
    const key = arenaSeatKey(layout.node);
    opponentGroups.set(key, [...(opponentGroups.get(key) ?? []), layout]);
  }
  for (const [key, group] of opponentGroups) {
    const first = group[0];
    if (!first) continue;
    const count = group.reduce((maximum, { node }) => Math.max(maximum, arenaSeatCardCount(node) ?? group.length), group.length);
    const left = Math.min(...group.map(({ rect }) => rect.x));
    const top = Math.min(...group.map(({ rect }) => rect.y));
    commands.push({
      kind: "text",
      id: `card-table:arena:seat-label:${key}`,
      at: { x: left, y: Math.max(bounds.y + 11, top - 5) },
      text: `${first.node.id.startsWith("arena-partner-") ? "PARTNER" : key.replace("player_", "SEAT ")} · ${count} CARD${count === 1 ? "" : "S"}`,
      size: 8,
      style: { color: theme.color.textSecondary },
    });
  }
  const active = scene.summary.activePlayer;
  if (active) {
    const ownerActive = ownerLayouts.length > 0 && !opponentGroups.has(active);
    const activeLayouts = ownerActive
      ? ownerLayouts
      : layouts.filter(({ node }) => arenaSeatKey(node) === active);
    if (activeLayouts.length > 0) {
      const left = Math.min(...activeLayouts.map(({ rect }) => rect.x));
      const right = Math.max(...activeLayouts.map(({ rect }) => rect.x + rect.width));
      const bottom = Math.max(...activeLayouts.map(({ rect }) => rect.y + rect.height));
      commands.push({
        kind: "line",
        id: "card-table:arena:active-seat",
        from: { x: left, y: Math.min(bounds.y + bounds.height - 2, bottom + 3) },
        to: { x: right, y: Math.min(bounds.y + bounds.height - 2, bottom + 3) },
        style: { color: theme.color.accent, strokeWidth: 2, accentRole: "active-seat" },
      });
    }
  }
  return commands;
}

function safePublicLabel(label: string): string {
  "worklet";
  const value = publicCellValue(label);
  return /\b(?:private|hidden|secret)\b/iu.test(value) ? "PUBLIC STATE UNAVAILABLE" : value;
}

/** Builds the shared card primitive, table layout, and game-specific public presentation. */
export const buildCardTablePlan: RenderPlanBuilder = (scene, theme, motion) => {
  "worklet";
  assertFamily(scene);
  const bounds = rendererBounds(motion);
  const variant = cardTableVariant(scene.gameSlug);
  const layouts = cardLayouts(scene, bounds, variant);
  const progress = resolvedMotionProgress(motion);
  const profile = qualityProfile(motion);
  const hiddenIds = cardTableHiddenNodeIds(scene, variant);
  const viewerScene = arenaViewerScene(scene);
  const commands: RenderCommand[] = [
    {
      kind: "rounded-rect",
      id: "card-table:mat",
      rect: bounds,
      radius: Math.min(28, bounds.height * 0.08),
      style: { color: theme.color.surface2 },
    },
    ...tableFramingCommands(variant, bounds, theme, progress, profile.bloom),
    ...arenaViewerFramingCommands(scene, layouts, bounds, theme),
  ];

  for (const [ordinal, layout] of layouts.entries()) {
    const hidden = hiddenIds.has(layout.node.id);
    const animatedRect = dealRect(layout.rect, bounds, progress, motion.beat);
    const primitive = variant === "mahjong" && (
      layout.node.id.includes("-tile-") || /^[BCD][1-9]$/u.test(layout.node.label)
    ) ? mahjongTilePrimitive
      : variant === "hanabi" ? hanabiCardPrimitive
        : cardPrimitive;
    commands.push(...primitive(
      `card-table:card:${layout.node.id}`,
      animatedRect,
      hidden ? "HIDDEN" : safePublicLabel(layout.node.label),
      hidden,
      theme,
      motion.activeNodeId === layout.node.id,
      profile.bloom,
    ));
    if (variant === "goofspiel" && ordinal === 0) {
      commands.push({
        kind: "text",
        id: "card-table:goofspiel:prize-label",
        at: { x: animatedRect.x, y: Math.max(bounds.y + 14, animatedRect.y - 9) },
        text: "PRIZE",
        size: 10,
        style: { color: theme.color.textSecondary },
      });
    }
  }

  const activeLayout = layouts.find(({ node }) => node.id === motion.activeNodeId);
  if (
    activeLayout
    && motion.beat === "move"
    && progress < 1
    && profile.trails
    && theme.material.moveTrail
  ) {
    commands.push({
      kind: "line",
      id: "card-table:deal-trail",
      from: { x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.5 },
      to: activeLayout.center,
      style: {
        color: theme.color.accent,
        alpha: 0.34 * (1 - progress),
        strokeWidth: 2,
        accentRole: "move-trail",
        trail: true,
      },
    });
  }

  return {
    family: "card_table",
    gameSlug: scene.gameSlug,
    viewport: { width: motion.viewport.width, height: motion.viewport.height },
    material: materialLayer(theme, motion, bounds),
    commands,
    hitZones: hitZonesForLayouts(cardHitLayouts(scene, layouts)),
    metadata: planMetadata(scene, motion, {
      variant,
      cardPrimitive: "shared-v1",
      cardMaterial: theme.material.cardFace,
      tableMaterial: theme.material.cardTable,
      dealProgress: progress,
      fan: variant === "fan" || variant === "hanabi",
      trickCollection: variant === "trick",
      pokerSeats: variant === "poker",
      blackjackDealerFrame: variant === "blackjack",
      hanabiInvertedVisibility: variant === "hanabi",
      goofspielReveal: variant === "goofspiel",
      hiddenCardCount: hiddenIds.size,
      viewerScene,
      ownerCardCount: scene.nodes.filter(({ id }) => id.startsWith("arena-owner-")).length,
      opponentCardBackCount: scene.nodes.filter(({ id }) => id.startsWith("arena-seat-")).length,
      centerCardCount: scene.nodes.filter(({ id }) => id.startsWith("arena-center-")).length,
      responsiveLayout: viewerScene ? "arena-viewer-v1" : "legacy-v1",
      ownerHitStrategy: viewerScene ? "segmented-plus-tray" : "legacy-card-rect",
      shaderDetail: profile.shaderDetail,
    }),
  };
};

function normalized(point: Point): boolean {
  "worklet";
  return Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}

/** Canonical normalized action geometry used by native pointer handling and exhaustive tests. */
export function cardTableActionHitZones(scene: BoardScene): readonly HitZone[] {
  "worklet";
  if (scene.rendererFamily !== "card_table") return [];
  const extent = 1_000;
  const layouts = cardLayouts(
    scene,
    { x: 0, y: 0, width: extent, height: extent },
    cardTableVariant(scene.gameSlug),
  );
  return hitZonesForLayouts(cardHitLayouts(scene, layouts)).map((zone) => ({
    ...zone,
    rect: {
      x: zone.rect.x / extent,
      y: zone.rect.y / extent,
      width: zone.rect.width / extent,
      height: zone.rect.height / extent,
    },
  }));
}

function contains(rect: Rect, point: Point): boolean {
  "worklet";
  return point.x >= rect.x && point.x <= rect.x + rect.width
    && point.y >= rect.y && point.y <= rect.y + rect.height;
}

/** Mirrors the final card layout and resolves the topmost enabled semantic target. */
export function hitTestCardTable(point: Point, scene: BoardScene): ActionTarget | null {
  "worklet";
  if (!normalized(point) || scene.rendererFamily !== "card_table") return null;
  const hitZones = cardTableActionHitZones(scene);
  for (let index = hitZones.length - 1; index >= 0; index -= 1) {
    const zone = hitZones[index];
    if (!zone || !contains(zone.rect, point)) continue;
    return scene.actionTargets.find((target) => (
      target.id === zone.actionTargetId && !target.disabled
    )) ?? null;
  }
  return null;
}
