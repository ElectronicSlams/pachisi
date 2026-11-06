import assert from "node:assert/strict";
import test from "node:test";
import type { GameRendererFamily } from "@eslams/core-types";
import {
  SCENE_SCHEMA_VERSION,
  type ActionTarget,
  type BoardScene,
  type BoardSceneNode,
} from "@eslams/game-render-contract";
import { CLASSIC_LIGHT, NEON } from "@eslams/theme-tokens";
import { buildCustomPlan, hitTestCustom } from "../src/families/custom";
import { buildGoBoardPlan, hitTestGoBoard } from "../src/families/go-board";
import { buildHexBoardPlan, hitTestHexBoard } from "../src/families/hex-board";
import { validateRenderPlan } from "../src/plan";
import type { MotionState, RenderCommand, RenderPlan } from "../src/types";

test("go_board settles stones, exposes capture treatment, and gives Gomoku a precision loupe", () => {
  const goValues = Array.from({ length: 81 }, () => "Empty");
  goValues[40] = "Black";
  const go = makeScene("go_board", "go", 9, 9, goValues, [40]);
  const moving = makeMotion({ beat: "move", progress: 0.15, activeNodeId: "cell-40", lastActionTargetId: "cell-40" });
  const movingPlan = buildGoBoardPlan(go, NEON, moving);
  validateRenderPlan(movingPlan, go, moving);
  assert.equal(movingPlan.metadata.stoneMotion, "settle");
  assert.equal(movingPlan.metadata.captureTreatment, "group-release-ring");
  const movingStone = commandById(movingPlan, "go:stone:cell-40");
  assert.equal(movingStone.kind, "circle");

  const reduced = makeMotion({ beat: "move", progress: 0.01, activeNodeId: "cell-40", reducedMotion: true });
  const reducedPlan = buildGoBoardPlan(go, NEON, reduced);
  validateRenderPlan(reducedPlan, go, reduced);
  const finalStone = commandById(reducedPlan, "go:stone:cell-40");
  assert.equal(finalStone.kind, "circle");
  if (movingStone.kind !== "circle" || finalStone.kind !== "circle") assert.fail("Expected Go stones.");
  assert.ok(finalStone.radius > movingStone.radius, "reduced motion must jump directly to the settled stone");
  assert.equal(reducedPlan.commands.some((command) => command.style.trail === true), false);

  const capture = makeMotion({ beat: "capture", progress: 0.5, activeNodeId: "cell-40" });
  const capturePlan = buildGoBoardPlan(go, NEON, capture);
  validateRenderPlan(capturePlan, go, capture);
  assert.equal(commandById(capturePlan, "go:capture:group-release").kind, "arc");
  assert.deepEqual(hitTestGoBoard({ x: 0.5, y: 0.5 }, go)?.id, "cell-40");

  const gomokuValues = Array.from({ length: 225 }, () => "Empty");
  gomokuValues[112] = "White";
  const gomoku = makeScene("go_board", "gomoku", 15, 15, gomokuValues, [112]);
  const precision = makeMotion({ beat: "move", progress: 0.4, activeNodeId: "cell-112" });
  const gomokuPlan = buildGoBoardPlan(gomoku, NEON, precision);
  validateRenderPlan(gomokuPlan, gomoku, precision);
  assert.equal(gomokuPlan.metadata.boardScale, 1.08);
  assert.equal(gomokuPlan.metadata.fatFingerLoupe, true);
  assert.equal(gomokuPlan.metadata.loupeActive, true);
  assert.ok(gomokuPlan.commands.some(({ id }) => id === "gomoku:loupe:lens:cell-112"));
});

test("hex_board preserves edge identity, settles moves, and traces the terminal chain", () => {
  const values = Array.from({ length: 25 }, () => "Empty");
  for (const index of [0, 6, 12, 18, 24]) values[index] = "Black chain";
  const scene = makeScene("hex_board", "hex", 5, 5, values, [12], true);
  const animated = makeMotion({ beat: "move", progress: 0.2, activeNodeId: "cell-12" });
  const animatedPlan = buildHexBoardPlan(scene, NEON, animated);
  validateRenderPlan(animatedPlan, scene, animated);
  assert.equal(animatedPlan.metadata.edgeIdentity, "north-south-vs-west-east");
  assert.equal(animatedPlan.metadata.terminalChainTrace, true);
  assert.equal(animatedPlan.metadata.stoneMotion, "settle");
  assert.ok(animatedPlan.commands.some(({ id }) => id === "hex:edge:north"));
  assert.ok(animatedPlan.commands.some(({ id }) => id === "hex:edge:west"));
  assert.ok(animatedPlan.commands.some(({ id }) => id.startsWith("hex:terminal-chain:")));
  const animatedStone = commandById(animatedPlan, "hex:stone:cell-12");
  assert.equal(animatedStone.kind, "circle");

  const reduced = makeMotion({ beat: "move", progress: 0.01, activeNodeId: "cell-12", reducedMotion: true });
  const reducedPlan = buildHexBoardPlan(scene, NEON, reduced);
  validateRenderPlan(reducedPlan, scene, reduced);
  const finalStone = commandById(reducedPlan, "hex:stone:cell-12");
  assert.equal(finalStone.kind, "circle");
  if (animatedStone.kind !== "circle" || finalStone.kind !== "circle") assert.fail("Expected Hex stones.");
  assert.ok(finalStone.radius > animatedStone.radius);
  assert.equal(reducedPlan.commands.some((command) => command.style.trail === true), false);
  assert.deepEqual(hitTestHexBoard({ x: 0.5, y: 0.5 }, scene)?.id, "cell-12");
});

test("all six custom slugs select distinct game-specific metadata and commands", () => {
  const cases = [
    {
      slug: "mancala",
      rows: 2,
      cols: 7,
      values: Array.from({ length: 14 }, (_, index) => index === 0 || index === 13 ? `Store ${index}` : String(index % 5)),
      motion: makeMotion({ beat: "move", progress: 0.65, activeNodeId: "cell-3", lastActionTargetId: "cell-3" }),
      commandPrefix: "mancala:sow-count-off:",
      metadataKey: "sowingTreatment",
    },
    {
      slug: "nine-mens-morris",
      rows: 7,
      cols: 7,
      values: Array.from({ length: 24 }, (_, index) => index < 3 ? "Black mill" : "Empty"),
      motion: makeMotion({ beat: "capture", progress: 0.5, activeNodeId: "cell-1" }),
      commandPrefix: "morris:mill-flash:",
      metadataKey: "millTreatment",
    },
    {
      slug: "pentago",
      rows: 6,
      cols: 6,
      values: Array.from({ length: 36 }, (_, index) => index === 7 ? "White" : "Empty"),
      motion: makeMotion({ beat: "move", progress: 0.5, activeNodeId: "cell-7" }),
      commandPrefix: "pentago:quadrant-rotation:",
      metadataKey: "quadrantTreatment",
    },
    {
      slug: "backgammon",
      rows: 2,
      cols: 12,
      values: Array.from({ length: 24 }, (_, index) => index % 6 === 0 ? "Black 2" : "Empty"),
      motion: makeMotion(),
      commandPrefix: "backgammon:bar",
      metadataKey: "zoneTreatment",
    },
    {
      slug: "shogi",
      rows: 9,
      cols: 9,
      values: Array.from({ length: 81 }, (_, index) => index === 40 ? "Black king" : "Empty"),
      motion: makeMotion(),
      commandPrefix: "shogi:coordinate:file:",
      metadataKey: "coordinateSystem",
    },
    {
      slug: "xiangqi",
      rows: 10,
      cols: 9,
      values: Array.from({ length: 90 }, (_, index) => index === 4 ? "Red general" : "Empty"),
      motion: makeMotion(),
      commandPrefix: "xiangqi:river",
      metadataKey: "riverTreatment",
    },
  ] as const;

  const interactionModels = new Set<string>();
  const signatures = new Set<string>();
  for (const entry of cases) {
    const scene = makeScene("custom", entry.slug, entry.rows, entry.cols, entry.values, [entry.slug === "mancala" ? 3 : Math.floor(entry.values.length / 2)]);
    const plan = buildCustomPlan(scene, CLASSIC_LIGHT, entry.motion);
    const repeatedPlan = buildCustomPlan(scene, CLASSIC_LIGHT, entry.motion);
    validateRenderPlan(plan, scene, entry.motion);
    assert.equal(plan.metadata.customVariant, entry.slug);
    assert.equal(typeof plan.metadata[entry.metadataKey], "string");
    assert.ok(plan.commands.some(({ id }) => id.startsWith(entry.commandPrefix)), `${entry.slug} must emit ${entry.commandPrefix}`);
    assert.equal(new Set(plan.commands.map(({ id }) => id)).size, plan.commands.length);
    assert.deepEqual(
      repeatedPlan.commands.map(({ id }) => id),
      plan.commands.map(({ id }) => id),
      `${entry.slug} command ids must be deterministic`,
    );
    assert.deepEqual(
      new Set(plan.hitZones.map(({ actionTargetId }) => actionTargetId)),
      new Set(scene.actionTargets.map(({ id }) => id)),
    );
    interactionModels.add(String(plan.metadata.interactionModel));
    signatures.add(plan.commands.map(({ id }) => id.split(":")[0]).join("|"));
  }
  assert.equal(interactionModels.size, 6, "each bespoke game needs a distinct interaction contract");
  assert.equal(signatures.size, 6, "each bespoke game needs a distinct command vocabulary");

  const shogi = makeScene("custom", "shogi", 9, 9, Array.from({ length: 81 }, () => "Empty"), [40]);
  assert.deepEqual(hitTestCustom({ x: 0.5, y: 0.5 }, shogi)?.id, "cell-40");
  assert.equal(hitTestCustom({ x: -0.1, y: 0.5 }, shogi), null);
});

function makeScene(
  rendererFamily: GameRendererFamily,
  gameSlug: string,
  rows: number,
  cols: number,
  values: readonly string[],
  actionable: readonly number[] = [],
  terminal = false,
): BoardScene {
  const actionIndexes = new Set(actionable);
  const nodes: BoardSceneNode[] = values.map((label, index) => ({
    id: `cell-${index}`,
    kind: "board",
    label: `Row ${Math.floor(index / cols) + 1}, column ${index % cols + 1}: ${label || "Empty"}`,
    row: Math.floor(index / cols),
    col: index % cols,
    index,
    actionTargetId: actionIndexes.has(index) ? `cell-${index}` : null,
  }));
  const actionTargets: ActionTarget[] = actionable.map((index) => ({
    id: `cell-${index}`,
    action: `play:${index}`,
    label: `Play cell ${index}`,
    disabled: false,
  }));
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug,
    rendererFamily,
    rows,
    cols,
    nodes,
    actionTargets,
    accessibility: nodes.map((node) => ({
      id: node.id,
      role: node.actionTargetId === null ? "gridcell" : "button",
      label: node.label,
      row: node.row,
      col: node.col,
      actionTargetId: node.actionTargetId,
    })),
    summary: { activePlayer: "player_1", terminal, turn: 8, scores: terminal ? { player_1: 1 } : {} },
  };
}

function makeMotion(overrides: Partial<MotionState> = {}): MotionState {
  return {
    progress: 1,
    beat: "idle",
    reducedMotion: false,
    qualityTier: "high",
    viewport: { width: 390, height: 480, pixelRatio: 3 },
    lastActionTargetId: null,
    activeNodeId: null,
    ...overrides,
  };
}

function commandById(plan: RenderPlan, id: string): RenderCommand {
  const command = plan.commands.find((candidate) => candidate.id === id);
  assert.ok(command, `Expected render command ${id}.`);
  return command;
}
