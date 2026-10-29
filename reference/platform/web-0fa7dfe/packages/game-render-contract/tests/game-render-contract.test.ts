import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAME_CATALOG } from "@eslams/core-types";
import {
  DISPLAY_FRAME_VERSION,
  SCENE_BUILDER_REGISTRY,
  assertBoardSceneSafe,
  buildSceneEnvelope,
  displayFrameAsLegacyRecord,
  parseDisplayFrame,
} from "../src/index";

describe("game render contract", () => {
  const legacyFrame = {
    schema_version: DISPLAY_FRAME_VERSION,
    frame_id: "chess:1",
    renderer_family: "chessboard",
    actor_player: "player_1",
    action_label: "e2e4",
    display_cells: [
      { kind: "board", row: 0, col: 0, value: "rook" },
      { kind: "board", row: 0, col: 1, value: null },
    ],
    summary: { active_player: "player_2", terminal: false, turn: 1, scores: { player_1: 0 } },
  } as const;

  it("adapts old display frames to explicit v1 versions and preserves legacy render data", () => {
    const frame = parseDisplayFrame(legacyFrame, { gameSlug: "chess" });
    assert.equal(frame?.displayFrameVersion, "eslams.replay.display_frame.v1");
    assert.equal(frame?.publicStateVersion, "eslams.public-state.v1");
    assert.equal(frame?.rendererVersion, "eslams.renderer.v1");
    assert.equal(frame?.adapterVersion, "eslams.render-adapter.v1");
    assert.equal(frame?.rendererFamily, "square_board");
    assert.equal((displayFrameAsLegacyRecord(frame!) as { action_label?: unknown }).action_label, "e2e4");
  });

  it("uses trusted catalog context to normalize Core renderer vocabulary", () => {
    const pokerFrame = { ...legacyFrame, renderer_family: "poker-table" };
    assert.equal(parseDisplayFrame(pokerFrame), null);

    const poker = parseDisplayFrame(pokerFrame, {
      gameSlug: "no-limit-texas-holdem",
      rendererFamily: "card_table",
    });
    assert.equal(poker?.gameSlug, "no-limit-texas-holdem");
    assert.equal(poker?.rendererFamily, "card_table");

    const ticTacToe = parseDisplayFrame(
      { ...legacyFrame, renderer_family: "grid" },
      { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" },
    );
    assert.equal(ticTacToe?.rendererFamily, "grid_3x3");

    assert.equal(parseDisplayFrame(
      { ...pokerFrame, display_cells: [{ kind: "board", row: -1, col: 0, value: "X" }] },
      { gameSlug: "no-limit-texas-holdem", rendererFamily: "card_table" },
    ), null);
  });

  it("builds deterministic semantic and accessible scenes from old public-state fixtures", () => {
    const envelope = buildSceneEnvelope(
      { board: ["X", null, "O", null], rows: 2, cols: 2 },
      { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" },
      [{ id: "cell-1", action: "1", label: "Play row 1 column 2", disabled: false }],
    );
    assert.equal(envelope.sceneSchemaVersion, "eslams.scene.v1");
    assert.equal(envelope.themeTokenVersion, "eslams.theme-tokens.v1");
    assert.equal(envelope.minimumAppVersion, "1.0.0");
    assert.equal(envelope.scene.nodes.length, 4);
    assert.equal(envelope.scene.accessibility.length, 4);
    assert.equal(envelope.scene.accessibility[1]?.role, "button");
    assert.equal(envelope.scene.nodes[0]?.label, "Row 1, column 1: X");
  });

  it("fails closed on private, reasoning, provider, billing, and malformed public fields", () => {
    for (const unsafe of [
      { board: ["X"], rows: 1, cols: 1, private_state: { board: ["O"] } },
      { board: ["X"], rows: 1, cols: 1, reasoning: "secret chain" },
      { board: ["X"], rows: 1, cols: 1, provider_payload: "raw" },
      { board: ["X"], rows: 1, cols: 1, billing: { cost: 2 } },
    ]) {
      assert.throws(() => buildSceneEnvelope(unsafe, { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" }));
    }
    assert.equal(parseDisplayFrame({ ...legacyFrame, display_cells: [{ kind: "board", row: -1, col: 0, value: "X" }] }), null);
  });

  it("registers every canonical renderer family used for play or watch", () => {
    const usedFamilies = new Set(GAME_CATALOG.map((game) => game.renderSpec.rendererFamily));
    assert.equal(usedFamilies.size, 12);
    for (const family of usedFamilies) assert.equal(typeof SCENE_BUILDER_REGISTRY[family], "function");
  });

  it("enforces exact action-target and accessibility graph integrity", () => {
    const envelope = buildSceneEnvelope(
      { board: ["X", null, "O", null], rows: 2, cols: 2 },
      { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" },
      [{ id: "cell-1", action: "1", label: "Play row 1 column 2", disabled: false }],
    );
    const scene = envelope.scene;
    assert.equal(scene.nodes.filter((node) => node.actionTargetId === "cell-1").length, 1);

    assert.throws(() => buildSceneEnvelope(
      { board: ["X", null], rows: 1, cols: 2 },
      { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" },
      [
        { id: "cell-1", action: "1", label: "First", disabled: false },
        { id: "cell-1", action: "1", label: "Duplicate", disabled: false },
      ],
    ), /unique ids/u);
    assert.throws(() => buildSceneEnvelope(
      { board: ["X", null], rows: 1, cols: 2 },
      { gameSlug: "tic-tac-toe", rendererFamily: "grid_3x3" },
      [{ id: "global-action", action: "pass", label: "Pass", disabled: false }],
    ), /exactly one scene node/u);

    assert.throws(() => assertBoardSceneSafe({
      ...scene,
      accessibility: scene.accessibility.slice(1),
    }), /exact one-to-one mapping/u);
    assert.throws(() => assertBoardSceneSafe({
      ...scene,
      accessibility: [...scene.accessibility, { ...scene.accessibility[0]!, id: "extra" }],
    }), /exact one-to-one mapping/u);
    assert.throws(() => assertBoardSceneSafe({
      ...scene,
      accessibility: [...scene.accessibility, scene.accessibility[0]!],
    }), /unique ids/u);

    const firstNode = scene.nodes[0]!;
    const firstAccessible = scene.accessibility[0]!;
    assert.throws(() => assertBoardSceneSafe({
      ...scene,
      nodes: [{ ...firstNode, actionTargetId: "missing-target" }, ...scene.nodes.slice(1)],
      accessibility: [{ ...firstAccessible, actionTargetId: "missing-target" }, ...scene.accessibility.slice(1)],
    }), /undeclared action target/u);

    const secondNode = scene.nodes[2]!;
    const secondAccessible = scene.accessibility[2]!;
    assert.throws(() => assertBoardSceneSafe({
      ...scene,
      nodes: scene.nodes.map((node) => node.id === secondNode.id ? { ...node, actionTargetId: "cell-1" } : node),
      accessibility: scene.accessibility.map((node) => node.id === secondAccessible.id ? { ...node, actionTargetId: "cell-1" } : node),
    }), /exactly one scene node/u);
  });
});
