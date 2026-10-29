import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GameRendererFamily } from "@eslams/core-types";
import {
  SCENE_SCHEMA_VERSION,
  type ActionTarget,
  type BoardScene,
} from "@eslams/game-render-contract";
import { THEMES } from "@eslams/theme-tokens";
import { buildAuctionPanelPlan, hitTestAuctionPanel } from "../src/families/auction-panel";
import { buildCardTablePlan, hitTestCardTable } from "../src/families/card-table";
import { buildControlBenchmarkPlan, hitTestControlBenchmark } from "../src/families/control-benchmark";
import { buildDiceTablePlan, hitTestDiceTable } from "../src/families/dice-table";
import { buildEconomicPanelPlan, hitTestEconomicPanel } from "../src/families/economic-panel";
import { buildPayoffMatrixPlan, hitTestPayoffMatrix } from "../src/families/payoff-matrix";
import { validateRenderPlan } from "../src/plan";
import type { MotionState, RenderPlan, RenderPlanBuilder } from "../src/types";

const theme = THEMES.neon;

describe("table and panel renderer plans", () => {
  it("builds and validates every assigned renderer family", () => {
    const cases: readonly [GameRendererFamily, string, RenderPlanBuilder][] = [
      ["card_table", "gin-rummy", buildCardTablePlan],
      ["dice_table", "liars-dice", buildDiceTablePlan],
      ["auction_panel", "first-price-sealed-bid-auction", buildAuctionPanelPlan],
      ["payoff_matrix", "prisoners-dilemma", buildPayoffMatrixPlan],
      ["economic_panel", "bargaining", buildEconomicPanelPlan],
      ["control_benchmark", "cartpole", buildControlBenchmarkPlan],
    ];

    for (const [family, slug, builder] of cases) {
      const value = sampleScene(family, slug, ["Choice A", "Choice B"], false, [0, 1]);
      const plan = builder(value, theme, motion());
      validateRenderPlan(plan, value, motion());
      assert.equal(plan.family, family);
      assert.equal(plan.gameSlug, slug);
      assert.equal(plan.hitZones.length, value.actionTargets.length);
      assert.equal(new Set(plan.commands.map(({ id }) => id)).size, plan.commands.length);
      assert.equal(plan.material.surface, theme.material.boardSurface);
      assert.equal(plan.material.baseColor, theme.color.boardBackground);
      assert.equal(plan.metadata.qualityTier, "high");
      assert.ok(plan.commands.length > value.nodes.length);
    }
  });

  it("rejects cross-family scenes and safely misses cross-family hit tests", () => {
    const wrong = sampleScene("square_board", "chess", ["A"], false, [0]);
    const builders = [
      buildCardTablePlan,
      buildDiceTablePlan,
      buildAuctionPanelPlan,
      buildPayoffMatrixPlan,
      buildEconomicPanelPlan,
      buildControlBenchmarkPlan,
    ];
    for (const builder of builders) {
      assert.throws(() => builder(wrong, theme, motion()), /cannot consume/u);
    }
    const point = { x: 0.5, y: 0.5 };
    assert.equal(hitTestCardTable(point, wrong), null);
    assert.equal(hitTestDiceTable(point, wrong), null);
    assert.equal(hitTestAuctionPanel(point, wrong), null);
    assert.equal(hitTestPayoffMatrix(point, wrong), null);
    assert.equal(hitTestEconomicPanel(point, wrong), null);
    assert.equal(hitTestControlBenchmark(point, wrong), null);
  });

  it("maps one exact hit zone to every declared action target", () => {
    const cases: readonly [BoardScene, RenderPlanBuilder][] = [
      [sampleScene("card_table", "blackjack", ["Dealer 10", "Hit"], false, [1]), buildCardTablePlan],
      [sampleScene("dice_table", "liars-dice", ["3 dice", "Challenge"], false, [1]), buildDiceTablePlan],
      [sampleScene("auction_panel", "first-price-sealed-bid-auction", ["Lot", "Bid 2"], false, [1]), buildAuctionPanelPlan],
      [sampleScene("payoff_matrix", "prisoners-dilemma", ["Cooperate", "Defect"], false, [0, 1]), buildPayoffMatrixPlan],
      [sampleScene("economic_panel", "negotiation", ["Price 4", "Delivery 2"], false, [0, 1]), buildEconomicPanelPlan],
      [sampleScene("control_benchmark", "taxi", ["North", "South"], false, [0, 1]), buildControlBenchmarkPlan],
    ];
    for (const [value, builder] of cases) {
      const plan = builder(value, theme, motion());
      assert.deepEqual(
        [...plan.hitZones.map(({ actionTargetId }) => actionTargetId)].sort(),
        [...value.actionTargets.map(({ id }) => id)].sort(),
      );
      assert.equal(new Set(plan.hitZones.map(({ id }) => id)).size, plan.hitZones.length);
      for (const zone of plan.hitZones) {
        assert.ok(zone.rect.width > 0);
        assert.ok(zone.rect.height > 0);
      }
    }
  });

  it("resolves enabled actions and ignores invalid normalized points", () => {
    const card = sampleScene("card_table", "gin-rummy", ["Draw"], false, [0]);
    assert.equal(hitTestCardTable({ x: 0.5, y: 0.5 }, card)?.id, "action:node-0");
    assert.equal(hitTestCardTable({ x: -0.1, y: 0.5 }, card), null);

    const disabled = sampleScene("dice_table", "liars-dice", ["Challenge"], false, [0], true);
    assert.equal(hitTestDiceTable({ x: 0.5, y: 0.5 }, disabled), null);
  });
});

describe("game-specific card and dice exceptions", () => {
  it("uses the shared card primitive across fan, trick, poker, Blackjack, and Goofspiel layouts", () => {
    const slugs = [
      "gin-rummy",
      "bridge",
      "limit-texas-holdem",
      "blackjack",
      "goofspiel",
    ] as const;
    const expectedVariants = ["fan", "trick", "poker", "blackjack", "goofspiel"];
    for (const [index, slug] of slugs.entries()) {
      const plan = buildCardTablePlan(
        sampleScene("card_table", slug, ["A♠", "10♥", "K♦", "Q♣"], slug === "goofspiel", [0]),
        theme,
        motion({ beat: slug === "goofspiel" ? "reveal" : "move", progress: 0.4 }),
      );
      assert.equal(plan.metadata.cardPrimitive, "shared-v1");
      assert.equal(plan.metadata.variant, expectedVariants[index]);
      assert.ok(plan.commands.some(({ id }) => id.endsWith(":face")));
      if (slug === "blackjack") assert.equal(plan.metadata.blackjackDealerFrame, true);
      if (slug === "goofspiel") assert.equal(plan.metadata.goofspielReveal, true);
    }
  });

  it("renders Hanabi with inverted visibility and never paints the observer's labels", () => {
    const value = sampleScene("card_table", "hanabi", [
      "player_1 A red",
      "player_1 5 blue",
      "player_2 2 green",
      "player_2 4 yellow",
    ]);
    const plan = buildCardTablePlan(value, theme, motion({ beat: "reveal", progress: 0.3 }));
    const text = commandText(plan);
    assert.equal(plan.metadata.hanabiInvertedVisibility, true);
    assert.equal(plan.metadata.hiddenCardCount, 2);
    assert.doesNotMatch(text, /player_1|A red|5 blue/iu);
    assert.match(text, /player_2/iu);
    assert.match(text, /HIDDEN/iu);
  });

  it("keeps dice count-only before the terminal reveal and exposes public faces afterward", () => {
    const pending = sampleScene("dice_table", "liars-dice", [
      "player_1 2 5 1 3 1",
      "Bid 3x4",
    ], false, [1]);
    const pendingPlan = buildDiceTablePlan(pending, theme, motion({ beat: "move", progress: 0.35 }));
    assert.equal(pendingPlan.metadata.countOnly, true);
    assert.equal(pendingPlan.metadata.terminalReveal, false);
    assert.match(commandText(pendingPlan), /5 DICE/iu);
    assert.doesNotMatch(commandText(pendingPlan), /2 5 1 3 1/u);
    assert.match(commandText(pendingPlan), /3x4/u);

    const terminal = sampleScene("dice_table", "liars-dice", ["1", "6"], true);
    const terminalPlan = buildDiceTablePlan(terminal, theme, motion({ beat: "reveal", progress: 0.25 }));
    assert.equal(terminalPlan.metadata.terminalReveal, true);
    assert.match(commandText(terminalPlan), /1/u);
    assert.match(commandText(terminalPlan), /6/u);
    assert.ok(terminalPlan.commands.some(({ id }) => id.includes(":pip:")));
  });
});

describe("simultaneous and economic panels", () => {
  it("keeps sealed auction state private until terminal while leaving legal bid controls usable", () => {
    const pending = sampleScene("auction_panel", "first-price-sealed-bid-auction", [
      "player_1 bid £99",
      "Bid £10",
    ], false, [1]);
    const pendingPlan = buildAuctionPanelPlan(pending, theme, motion({ beat: "reveal", progress: 0.2 }));
    assert.equal(pendingPlan.metadata.bidsRevealed, false);
    assert.doesNotMatch(commandText(pendingPlan), /£99/u);
    assert.match(commandText(pendingPlan), /£10/u);
    assert.match(commandText(pendingPlan), /SEALED BID/u);

    const finalPlan = buildAuctionPanelPlan(
      sampleScene("auction_panel", "first-price-sealed-bid-auction", ["player_1 bid £99"], true),
      theme,
      motion({ beat: "result", progress: 0.2 }),
    );
    assert.equal(finalPlan.metadata.bidsRevealed, true);
    assert.match(commandText(finalPlan), /£99/u);
  });

  it("supports payoff matrices and masks simultaneous RPS commitments until reveal", () => {
    const matrix = buildPayoffMatrixPlan(
      sampleScene("payoff_matrix", "prisoners-dilemma", ["+3 win", "-1 loss", "0 draw", "+1"], true, [], false, 2, 2),
      theme,
      motion({ beat: "result", progress: 0.45 }),
    );
    assert.equal(matrix.metadata.matrixKind, "payoff");
    assert.ok(matrix.commands.some((command) => command.kind === "rounded-rect" && command.style.color === theme.color.winSoft));
    assert.ok(matrix.commands.some((command) => command.kind === "rounded-rect" && command.style.color === theme.color.lossSoft));

    const rpsPending = buildPayoffMatrixPlan(
      sampleScene("payoff_matrix", "rock-paper-scissors", ["Rock", "Paper", "Scissors"], false, [1]),
      theme,
      motion({ beat: "reveal", progress: 0.4 }),
    );
    assert.equal(rpsPending.metadata.simultaneous, true);
    assert.doesNotMatch(commandText(rpsPending), /Rock|Scissors/u);
    assert.match(commandText(rpsPending), /Paper/u);
    assert.match(commandText(rpsPending), /COMMITTED/u);

    const rpsFinal = buildPayoffMatrixPlan(
      sampleScene("payoff_matrix", "rock-paper-scissors", ["Rock", "Scissors"], true),
      theme,
      motion({ beat: "result", progress: 0.4 }),
    );
    assert.match(commandText(rpsFinal), /Rock/u);
    assert.match(commandText(rpsFinal), /Scissors/u);
  });

  it("classifies bargaining offers and negotiation price/delivery terms", () => {
    const bargaining = buildEconomicPanelPlan(
      sampleScene("economic_panel", "bargaining", ["Offer split 60/40", "Accepted"], false, [0]),
      theme,
      motion(),
    );
    assert.equal(bargaining.metadata.bargaining, true);
    assert.match(commandText(bargaining), /OFFER/u);

    const negotiation = buildEconomicPanelPlan(
      sampleScene("economic_panel", "negotiation", ["Price 12", "Delivery 3 days"], false, [0, 1]),
      theme,
      motion(),
    );
    assert.equal(negotiation.metadata.negotiation, true);
    assert.match(commandText(negotiation), /BID/u);
    assert.match(commandText(negotiation), /TERM/u);
  });
});

describe("motion, quality, materials, and Battlefield posters", () => {
  it("maps every motion beat to an identical static final plan under reduced motion", () => {
    const cases: readonly [BoardScene, RenderPlanBuilder][] = [
      [sampleScene("card_table", "goofspiel", ["Prize 4", "Bid 2"], true), buildCardTablePlan],
      [sampleScene("dice_table", "liars-dice", ["1", "6"], true), buildDiceTablePlan],
      [sampleScene("auction_panel", "first-price-sealed-bid-auction", ["Bid 2"], true), buildAuctionPanelPlan],
      [sampleScene("payoff_matrix", "rock-paper-scissors", ["Rock", "Paper", "Scissors"], true), buildPayoffMatrixPlan],
      [sampleScene("economic_panel", "negotiation", ["Price 9"], true), buildEconomicPanelPlan],
      [sampleScene("control_benchmark", "lunar-lander", ["Altitude 0"], true), buildControlBenchmarkPlan],
    ];
    for (const [value, builder] of cases) {
      const atStart = builder(value, theme, motion({ reducedMotion: true, progress: 0, beat: "result" }));
      const atEnd = builder(value, theme, motion({ reducedMotion: true, progress: 1, beat: "result" }));
      assert.deepEqual(atStart, atEnd);
      assert.equal(atStart.metadata.reducedMotion, true);
      assert.equal(atStart.material.phase, 1);
      assert.equal(atStart.commands.some(({ style }) => style.trail === true), false);
    }
  });

  it("honors constrained quality while preserving layout and information", () => {
    const value = sampleScene("economic_panel", "negotiation", ["Price 9", "Delivery 2"], true, [0]);
    const high = buildEconomicPanelPlan(value, theme, motion({ qualityTier: "high", beat: "result" }));
    const constrained = buildEconomicPanelPlan(value, theme, motion({ qualityTier: "constrained", beat: "result" }));
    assert.equal(high.hitZones.length, constrained.hitZones.length);
    assert.equal(high.metadata.shaderDetail, 1);
    assert.equal(constrained.metadata.shaderDetail, 0.18);
    assert.equal(constrained.commands.some(({ style }) => style.glow === true), false);
    assert.match(commandText(constrained), /Price 9/iu);
  });

  it("builds an identity-preserving watch/replay poster for every control benchmark", () => {
    const slugs = [
      "taxi",
      "frozen-lake",
      "cliff-walking",
      "cartpole",
      "mountain-car",
      "lunar-lander",
      "car-racing",
      "bipedal-walker",
      "paddle-ball",
      "alien-shooter",
      "boxing-style-arena",
      "ice-hockey-style-arena",
    ] as const;
    const posterFamilies = new Set<string>();
    for (const slug of slugs) {
      const value = sampleScene("control_benchmark", slug, ["reward 1"], true);
      const plan = buildControlBenchmarkPlan(value, theme, motion({ beat: "result", progress: 0.55 }));
      validateRenderPlan(plan, value, motion({ beat: "result", progress: 0.55 }));
      assert.equal(plan.metadata.posterIdentity, slug);
      assert.equal(plan.metadata.battlefieldPoster, true);
      assert.equal(plan.metadata.watch, true);
      assert.equal(plan.metadata.replay, true);
      assert.match(commandText(plan), new RegExp(slug.split("-")[0] ?? slug, "iu"));
      posterFamilies.add(String(plan.metadata.posterFamily));
    }
    assert.deepEqual([...posterFamilies].sort(), [
      "boxing",
      "control-track",
      "grid-world",
      "hockey",
      "lander",
      "paddle",
      "racing",
      "shooter",
      "walker",
    ]);
  });

  it("uses only approved bloom roles", () => {
    const plan = buildCardTablePlan(
      sampleScene("card_table", "limit-texas-holdem", ["A♠", "K♠"], false, [0]),
      theme,
      motion({ activeNodeId: "node-0" }),
    );
    const approved = new Set(["last-move", "active-seat", "active-dock", "result-sweep"]);
    for (const command of plan.commands.filter(({ style }) => style.glow === true)) {
      assert.ok(command.style.accentRole);
      assert.equal(approved.has(command.style.accentRole ?? ""), true);
    }
  });
});

function sampleScene(
  family: GameRendererFamily,
  gameSlug: string,
  labels: readonly string[],
  terminal = false,
  actionOrdinals: readonly number[] = [],
  disabled = false,
  rows = 0,
  cols = 0,
): BoardScene {
  const actions: ActionTarget[] = actionOrdinals.map((ordinal) => ({
    id: `action:node-${ordinal}`,
    action: `action-${ordinal}`,
    label: `Action ${ordinal}`,
    disabled,
  }));
  const actionByOrdinal = new Map(actionOrdinals.map((ordinal, index) => [ordinal, actions[index]?.id ?? null]));
  const nodes = labels.map((label, ordinal) => ({
    id: `node-${ordinal}`,
    kind: family === "card_table" ? "card" as const : "status" as const,
    label,
    row: rows > 0 && cols > 0 ? Math.floor(ordinal / cols) : null,
    col: rows > 0 && cols > 0 ? ordinal % cols : null,
    index: ordinal,
    actionTargetId: actionByOrdinal.get(ordinal) ?? null,
  }));
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug,
    rendererFamily: family,
    rows,
    cols,
    nodes,
    actionTargets: actions,
    accessibility: nodes.map((node) => ({
      id: node.id,
      role: node.actionTargetId === null ? "text" : "button",
      label: node.label,
      row: node.row,
      col: node.col,
      actionTargetId: node.actionTargetId,
    })),
    summary: {
      activePlayer: "player_1",
      terminal,
      turn: 1,
      scores: {},
    },
  };
}

function motion(overrides: Partial<MotionState> = {}): MotionState {
  return {
    progress: 1,
    beat: "idle",
    reducedMotion: false,
    qualityTier: "high",
    viewport: { width: 390, height: 360, pixelRatio: 3 },
    lastActionTargetId: null,
    activeNodeId: null,
    ...overrides,
  };
}

function commandText(plan: RenderPlan): string {
  return plan.commands.flatMap((command) => command.kind === "text" ? [command.text] : []).join(" | ");
}
