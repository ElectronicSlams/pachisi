import assert from "node:assert/strict";
import test from "node:test";
import type { GameRendererFamily } from "@eslams/core-types";
import {
  SCENE_SCHEMA_VERSION,
  type ActionTarget,
  type BoardScene,
  type BoardSceneNode,
} from "@eslams/game-render-contract";
import { ARCADE, CLASSIC_LIGHT, NEON } from "@eslams/theme-tokens";
import { buildConnectFourPlan, hitTestConnectFour } from "../src/families/connect-four";
import { buildGrid3x3Plan, hitTestGrid3x3 } from "../src/families/grid-3x3";
import { buildSquareBoardPlan, hitTestSquareBoard } from "../src/families/square-board";
import { validateRenderPlan } from "../src/plan";
import type { MotionState, RenderCommand, RenderPlan } from "../src/types";

const allowedBloomRoles = new Set(["last-move", "active-seat", "active-dock", "result-sweep"]);

test("grid_3x3 stroke-draws marks and resolves a terminal win line statically under reduced motion", () => {
  const scene = makeScene("grid_3x3", "tic-tac-toe", 3, 3, [
    "X", "X", "X",
    "O", "O", "Empty",
    "Empty", "Empty", "Empty",
  ], [5], true);
  const animatedMotion = makeMotion({ beat: "result", progress: 0.4 });
  const animated = buildGrid3x3Plan(scene, NEON, animatedMotion);
  validateRenderPlan(animated, scene, animatedMotion);

  assert.equal(animated.metadata.variant, "classic");
  assert.equal(animated.metadata.strokeDrawnMarks, true);
  assert.equal(animated.metadata.terminalWinLine, true);
  assert.ok(animated.commands.some((command) => command.id === "mark:cell-0:cross-a" && command.kind === "line"));
  assert.ok(animated.commands.some((command) => command.id === "mark:cell-3:nought" && command.kind === "arc"));
  const animatedLine = commandById(animated, "grid:terminal-win-line");
  assert.equal(animatedLine.kind, "line");

  const reducedMotion = makeMotion({ beat: "result", progress: 0.01, reducedMotion: true });
  const reduced = buildGrid3x3Plan(scene, NEON, reducedMotion);
  validateRenderPlan(reduced, scene, reducedMotion);
  const reducedLine = commandById(reduced, "grid:terminal-win-line");
  assert.equal(reducedLine.kind, "line");
  if (animatedLine.kind !== "line" || reducedLine.kind !== "line") assert.fail("Expected terminal lines.");
  assert.ok(reducedLine.to.x > animatedLine.to.x, "reduced motion must render the complete win line");
  assert.deepEqual(hitTestGrid3x3({ x: 0.84, y: 0.5 }, scene)?.id, "cell-5");
});

test("ultimate grid keeps all nine boards legible and focuses the active mini-board", () => {
  const values = Array.from({ length: 81 }, () => "Empty");
  values[43] = "X";
  const scene = makeScene("grid_3x3", "ultimate-tic-tac-toe", 9, 9, values, [43]);
  const motion = makeMotion({ beat: "move", progress: 0.3, activeNodeId: "cell-43" });
  const plan = buildGrid3x3Plan(scene, NEON, motion);
  validateRenderPlan(plan, scene, motion);

  assert.equal(plan.metadata.variant, "ultimate");
  assert.equal(plan.metadata.ultimateFocusRow, 1);
  assert.equal(plan.metadata.ultimateFocusCol, 2);
  assert.ok(plan.commands.some((command) => command.id === "ultimate:focus"));
  assert.equal(plan.commands.filter((command) => command.id.startsWith("grid:vertical:")).length, 8);
  assert.equal(plan.commands.filter((command) => command.id.startsWith("grid:horizontal:")).length, 8);
  assert.equal(plan.hitZones.length, 1);

  const terminalValues = [...values];
  for (let col = 0; col < 9; col += 1) terminalValues[col] = "X";
  const terminal = makeScene("grid_3x3", "ultimate-tic-tac-toe", 9, 9, terminalValues, [], true);
  const resultMotion = makeMotion({ beat: "result", progress: 0.5 });
  const result = buildGrid3x3Plan(terminal, NEON, resultMotion);
  validateRenderPlan(result, terminal, resultMotion);
  assert.equal(result.metadata.terminalWinLine, true);
  assert.ok(result.commands.some((command) => command.id === "grid:terminal-win-line"));
});

test("connect_four uses the shared single controlled bounce and column-wide exact hit target", () => {
  const values = Array.from({ length: 42 }, () => "Empty");
  values[38] = "Red";
  const scene = makeScene("connect_four", "connect-four", 6, 7, values, [38]);
  const motion = makeMotion({ beat: "move", progress: 0.82, activeNodeId: "cell-38" });
  const plan = buildConnectFourPlan(scene, ARCADE, motion);
  validateRenderPlan(plan, scene, motion);

  assert.equal(plan.metadata.controlledBounce, true);
  assert.equal(plan.metadata.dropProgress, 1.055);
  const disc = commandById(plan, "connect:disc:cell-38");
  const finalRing = commandById(plan, "connect:last-move:cell-38");
  assert.equal(disc.kind, "circle");
  assert.equal(finalRing.kind, "circle");
  if (disc.kind !== "circle" || finalRing.kind !== "circle") assert.fail("Expected disc and final ring.");
  assert.ok(disc.center.y > finalRing.center.y, "the controlled bounce overshoots once before settling");
  assert.ok(plan.commands.some((command) => command.style.trail === true));
  assert.deepEqual(hitTestConnectFour({ x: 0.5, y: 0.01 }, scene)?.id, "cell-38");
  assert.equal(plan.hitZones[0]?.rect.height, plan.material.rect.height);

  const previewScene = makeScene("connect_four", "connect-four", 6, 7, values, [0]);
  const preview = buildConnectFourPlan(
    previewScene,
    ARCADE,
    makeMotion({ beat: "idle", activeNodeId: "cell-0" }),
  );
  assert.ok(preview.commands.some((command) => command.id === "connect:drop-preview:cell-0"));

  const reducedMotion = makeMotion({ beat: "move", progress: 0.1, activeNodeId: "cell-38", reducedMotion: true });
  const reduced = buildConnectFourPlan(scene, ARCADE, reducedMotion);
  validateRenderPlan(reduced, scene, reducedMotion);
  const reducedDisc = commandById(reduced, "connect:disc:cell-38");
  const reducedRing = commandById(reduced, "connect:last-move:cell-38");
  assert.equal(reducedDisc.kind, "circle");
  assert.equal(reducedRing.kind, "circle");
  if (reducedDisc.kind !== "circle" || reducedRing.kind !== "circle") assert.fail("Expected reduced-motion disc.");
  assert.equal(reducedDisc.center.y, reducedRing.center.y);
  assert.equal(reduced.commands.some((command) => command.style.trail === true), false);

  const constrainedMotion = makeMotion({ beat: "move", progress: 0.4, activeNodeId: "cell-38", qualityTier: "constrained" });
  const constrained = buildConnectFourPlan(scene, ARCADE, constrainedMotion);
  assert.equal(constrained.commands.some((command) => command.style.trail === true || command.style.glow === true), false);
});

test("square_board expresses chess/checkers moves and capture states without changing board geometry", () => {
  const chessValues = Array.from({ length: 64 }, () => "Empty");
  chessValues[36] = "White knight";
  chessValues[27] = "Black pawn";
  const chess = makeScene("square_board", "chess", 8, 8, chessValues, [36]);
  const moving = makeMotion({ beat: "move", progress: 0.2, activeNodeId: "cell-36" });
  const movingPlan = buildSquareBoardPlan(chess, CLASSIC_LIGHT, moving);
  validateRenderPlan(movingPlan, chess, moving);
  assert.equal(movingPlan.metadata.variant, "chess");
  assert.ok(movingPlan.commands.some((command) => command.id === "square:piece:cell-36" && command.kind === "text"));

  const constrained = makeMotion({ beat: "move", progress: 0.2, activeNodeId: "cell-36", qualityTier: "constrained" });
  const constrainedPlan = buildSquareBoardPlan(chess, CLASSIC_LIGHT, constrained);
  assert.deepEqual(cellRects(constrainedPlan), cellRects(movingPlan), "quality reduction must preserve board layout");

  const checkersValues = Array.from({ length: 64 }, () => "Empty");
  checkersValues[18] = "Red king";
  const checkers = makeScene("square_board", "checkers", 8, 8, checkersValues, [18]);
  const capture = makeMotion({ beat: "capture", progress: 0.55, activeNodeId: "cell-18" });
  const capturePlan = buildSquareBoardPlan(checkers, NEON, capture);
  validateRenderPlan(capturePlan, checkers, capture);
  assert.equal(capturePlan.metadata.motionMode, "capture");
  assert.ok(capturePlan.commands.some((command) => command.id === "square:piece:cell-18" && command.kind === "circle"));
  assert.ok(capturePlan.commands.some((command) => command.id === "square:crown:cell-18" && command.kind === "text"));
  assert.ok(capturePlan.commands.some((command) => command.id === "square:capture:cell-18" && command.kind === "arc"));
  assert.deepEqual(hitTestSquareBoard({ x: 0.31, y: 0.31 }, checkers)?.id, "cell-18");
});

test("Othello flip-wave resolves to the identical static final discs for reduced motion", () => {
  const values = Array.from({ length: 64 }, () => "Empty");
  values[27] = "Black";
  values[28] = "Black";
  values[29] = "Black";
  values[35] = "White";
  const scene = makeScene("square_board", "othello", 8, 8, values, [27]);
  const motion = makeMotion({ beat: "capture", progress: 0.48, activeNodeId: "cell-27" });
  const plan = buildSquareBoardPlan(scene, NEON, motion);
  validateRenderPlan(plan, scene, motion);
  assert.equal(plan.metadata.othelloFlipWave, true);
  assert.ok(plan.commands.some((command) => command.id.startsWith("othello:flip-wave:")));

  const reducedMotion = makeMotion({ beat: "capture", progress: 0.01, activeNodeId: "cell-27", reducedMotion: true });
  const reduced = buildSquareBoardPlan(scene, NEON, reducedMotion);
  validateRenderPlan(reduced, scene, reducedMotion);
  assert.equal(reduced.commands.some((command) => command.id.startsWith("othello:flip-wave:")), false);
  for (const id of ["cell-27", "cell-28", "cell-29", "cell-35"]) {
    const disc = commandById(reduced, `othello:disc:${id}`);
    assert.equal(disc.kind, "circle");
    if (disc.kind !== "circle") assert.fail("Expected final Othello disc.");
    assert.ok(disc.radius > 0);
  }
});

test("Battleship renders only explicit public outcomes and keeps all other values under fog", () => {
  const values = ["Ship", "hit", "miss", "sunk", "Empty", "submarine", "unknown", "water", ""];
  const scene = makeScene("square_board", "battleship", 3, 3, values, [0, 4]);
  const motion = makeMotion();
  const plan = buildSquareBoardPlan(scene, CLASSIC_LIGHT, motion);
  validateRenderPlan(plan, scene, motion);

  assert.equal(plan.metadata.battleshipFog, true);
  assert.equal(plan.metadata.hiddenInformationRendered, false);
  assert.equal(plan.metadata.visibleOutcomeCount, 3);
  assert.ok(plan.commands.some((command) => command.id === "battleship:fog:cell-0"));
  assert.ok(plan.commands.some((command) => command.id === "battleship:fog:cell-5"));
  assert.ok(plan.commands.some((command) => command.id === "battleship:hit:cell-1"));
  assert.ok(plan.commands.some((command) => command.id === "battleship:miss:cell-2"));
  assert.ok(plan.commands.some((command) => command.id === "battleship:sunk:cell-3"));
  assert.equal(plan.commands.some((command) => command.kind === "text"), false, "Battleship must not echo arbitrary labels");
  assert.equal(plan.hitZones.length, 2);
});

test("all family plans have deterministic unique ids, exact hit targets, and restricted bloom roles", () => {
  const grid = makeScene("grid_3x3", "tic-tac-toe", 3, 3, ["X", "O", "", "", "", "", "", "", ""], [2]);
  const connectValues = Array.from({ length: 42 }, () => "Empty");
  connectValues[35] = "Yellow";
  const connect = makeScene("connect_four", "connect-four", 6, 7, connectValues, [35]);
  const squareValues = Array.from({ length: 64 }, () => "Empty");
  squareValues[0] = "Black king";
  const square = makeScene("square_board", "chess", 8, 8, squareValues, [1]);
  const motion = makeMotion({ beat: "move", activeNodeId: "cell-0", lastActionTargetId: "cell-2" });
  const plans = [
    buildGrid3x3Plan(grid, NEON, motion),
    buildConnectFourPlan(connect, NEON, motion),
    buildSquareBoardPlan(square, NEON, motion),
  ];

  for (const [index, plan] of plans.entries()) {
    const scene = [grid, connect, square][index]!;
    validateRenderPlan(plan, scene, motion);
    assert.equal(new Set(plan.commands.map(({ id }) => id)).size, plan.commands.length);
    assert.deepEqual(new Set(plan.hitZones.map(({ actionTargetId }) => actionTargetId)), new Set(scene.actionTargets.map(({ id }) => id)));
    for (const command of plan.commands.filter((candidate) => candidate.style.glow === true)) {
      assert.ok(command.style.accentRole && allowedBloomRoles.has(command.style.accentRole));
    }
  }
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
    summary: { activePlayer: "player_1", terminal, turn: 4, scores: {} },
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

function cellRects(plan: RenderPlan): readonly unknown[] {
  return plan.commands
    .filter((command): command is Extract<RenderCommand, { kind: "rect" }> => command.kind === "rect" && command.id.startsWith("square:cell:"))
    .map(({ id, rect }) => ({ id, rect }));
}
