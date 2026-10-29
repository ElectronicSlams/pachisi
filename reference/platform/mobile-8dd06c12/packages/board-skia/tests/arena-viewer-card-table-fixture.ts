import { SCENE_SCHEMA_VERSION, type BoardScene, type BoardSceneNode } from "@eslams/game-render-contract";
import { THEMES } from "@eslams/theme-tokens";

import { buildCardTablePlan } from "../src/families/card-table";
import type { MotionState, Rect, RenderPlan } from "../src/types";

const pokerNodes = Object.freeze([
  node("arena-seat-player_2-card-0-of-2", "HIDDEN"),
  node("arena-seat-player_2-card-1-of-2", "HIDDEN"),
  node("arena-seat-player_3-card-0-of-2", "HIDDEN"),
  node("arena-seat-player_3-card-1-of-2", "HIDDEN"),
  node("arena-seat-player_4-card-0-of-2", "HIDDEN"),
  node("arena-seat-player_4-card-1-of-2", "HIDDEN"),
  node("arena-center-card-0", "2♣"),
  node("arena-center-card-1", "7♦"),
  node("arena-center-card-2", "10♥"),
  node("arena-owner-card-0", "A♠", "arena-owner-card-0"),
  node("arena-owner-card-1", "K♥"),
]);

export const arenaViewerPokerScene: BoardScene = Object.freeze({
  schemaVersion: SCENE_SCHEMA_VERSION,
  gameSlug: "no-limit-texas-holdem",
  rendererFamily: "card_table",
  rows: 0,
  cols: 0,
  nodes: pokerNodes,
  actionTargets: Object.freeze([Object.freeze({
    id: "arena-owner-card-0",
    action: "play:AS",
    label: "Play ace of spades",
    disabled: false,
  })]),
  accessibility: Object.freeze(pokerNodes.map((value) => Object.freeze({
    id: value.id,
    role: value.actionTargetId ? "button" as const : "text" as const,
    label: value.label,
    row: null,
    col: null,
    actionTargetId: value.actionTargetId,
  }))),
  summary: Object.freeze({
    activePlayer: "player_1",
    terminal: false,
    turn: 7,
    scores: Object.freeze({}),
  }),
});

const goldenViewports = Object.freeze([
  Object.freeze({ id: "compact-phone", width: 288, height: 225 }),
  Object.freeze({ id: "portrait-tablet", width: 680, height: 530 }),
  Object.freeze({ id: "landscape-tablet", width: 680, height: 422 }),
]);

export function buildArenaViewerGoldenSnapshot() {
  return Object.freeze(goldenViewports.map((viewport) => {
    const plan = buildCardTablePlan(
      arenaViewerPokerScene,
      THEMES["classic-dark"],
      motion(viewport.width, viewport.height),
    );
    return Object.freeze({
      id: viewport.id,
      viewport: plan.viewport,
      metadata: Object.freeze({
        variant: plan.metadata.variant,
        viewerScene: plan.metadata.viewerScene,
        responsiveLayout: plan.metadata.responsiveLayout,
        ownerCardCount: plan.metadata.ownerCardCount,
        opponentCardBackCount: plan.metadata.opponentCardBackCount,
        centerCardCount: plan.metadata.centerCardCount,
        hiddenCardCount: plan.metadata.hiddenCardCount,
      }),
      cards: Object.freeze(plan.commands.flatMap((command) => (
        command.kind === "rounded-rect" && command.id.endsWith(":face")
          ? [Object.freeze({ id: command.id, rect: roundedRect(command.rect) })]
          : []
      ))),
      labels: Object.freeze(plan.commands.flatMap((command) => (
        command.kind === "text" && command.id.startsWith("card-table:arena:")
          ? [Object.freeze({ id: command.id, text: command.text })]
          : []
      ))),
      hitZones: Object.freeze(plan.hitZones.map((zone) => Object.freeze({
        actionTargetId: zone.actionTargetId,
        rect: roundedRect(zone.rect),
      }))),
    });
  }));
}

export function motion(width: number, height: number): MotionState {
  return Object.freeze({
    progress: 1,
    beat: "idle",
    reducedMotion: false,
    qualityTier: "high",
    viewport: Object.freeze({ width, height, pixelRatio: 3 }),
    lastActionTargetId: null,
    activeNodeId: null,
  });
}

function node(id: string, label: string, actionTargetId: string | null = null): BoardSceneNode {
  return Object.freeze({
    id,
    kind: "card",
    label,
    row: null,
    col: null,
    index: null,
    actionTargetId,
  });
}

function roundedRect(rect: Rect): Rect {
  return Object.freeze({
    x: rounded(rect.x),
    y: rounded(rect.y),
    width: rounded(rect.width),
    height: rounded(rect.height),
  });
}

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function planFor(scene: BoardScene, width: number, height: number): RenderPlan {
  return buildCardTablePlan(scene, THEMES["classic-dark"], motion(width, height));
}
