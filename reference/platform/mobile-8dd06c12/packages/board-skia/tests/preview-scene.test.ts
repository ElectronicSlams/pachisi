import assert from "node:assert/strict";
import test from "node:test";

import { GAME_CATALOG, MOBILE_ARENA_GAME_CAPABILITIES } from "@eslams/core-types";
import { assertBoardSceneSafe } from "@eslams/game-render-contract";

import {
  MOBILE_ARENA_PREVIEW_SCENES,
  MOBILE_ARENA_PREVIEW_SEQUENCES,
  MOBILE_GAME_PREVIEW_SCENES,
  mobileArenaPreviewSequence,
  mobileArenaPreviewScene,
  mobileGamePreviewScene,
} from "../src/preview-scene";

test("bundles a safe canonical Battlefield preview for every catalog game", () => {
  assert.equal(Object.keys(MOBILE_GAME_PREVIEW_SCENES).length, GAME_CATALOG.length);
  for (const game of GAME_CATALOG) {
    const scene = mobileGamePreviewScene(game.slug);
    assert.ok(scene);
    assert.equal(scene.gameSlug, game.slug);
    assert.equal(scene.rendererFamily, game.renderSpec.rendererFamily);
    assert.doesNotThrow(() => assertBoardSceneSafe(scene));
  }
  assert.equal(mobileGamePreviewScene("unknown-game"), null);
});

test("keeps the Arena preview subset capability-scoped", () => {
  assert.equal(
    Object.keys(MOBILE_ARENA_PREVIEW_SCENES).length,
    MOBILE_ARENA_GAME_CAPABILITIES.length,
  );
  assert.equal(mobileArenaPreviewScene("leduc-holdem"), null);
  assert.equal(mobileArenaPreviewScene("unknown-game"), null);
});

test("ships audited living sequences for the four rotating Arena heroes", () => {
  assert.equal(mobileArenaPreviewSequence("tic-tac-toe").length, 6);
  assert.equal(mobileArenaPreviewSequence("connect-four").length, 8);
  assert.equal(mobileArenaPreviewSequence("chess").length, 7);
  assert.equal(mobileArenaPreviewSequence("no-limit-texas-holdem").length, 4);
  assert.deepEqual(mobileArenaPreviewSequence("unknown-game"), []);

  for (const gameSlug of [
    "tic-tac-toe",
    "connect-four",
    "chess",
    "no-limit-texas-holdem",
  ]) {
    const sequence = MOBILE_ARENA_PREVIEW_SEQUENCES[gameSlug];
    assert.ok(sequence);
    assert.ok(sequence.length > 1);
    assert.equal(new Set(sequence.map((scene) => JSON.stringify(scene.nodes))).size, sequence.length);
    sequence.forEach((scene) => assert.doesNotThrow(() => assertBoardSceneSafe(scene)));
  }

  const ticTacToeFinal = mobileArenaPreviewSequence("tic-tac-toe").at(-1)!;
  assert.deepEqual(
    ticTacToeFinal.nodes.filter((node) => node.label.endsWith(": X")).map((node) => node.index),
    [0, 1, 2],
  );

  const connectFourFinal = mobileArenaPreviewSequence("connect-four").at(-1)!;
  assert.deepEqual(
    connectFourFinal.nodes.filter((node) => node.label.endsWith(": Red")).map((node) => node.index),
    [17, 24, 31, 38],
  );
});
