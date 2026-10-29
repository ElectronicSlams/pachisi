import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { SCENE_SCHEMA_VERSION, type BoardScene } from "@eslams/game-render-contract";

import { validateRenderPlan } from "../src/plan";
import { cardTableActionHitZones, hitTestCardTable } from "../src/families/card-table";
import {
  arenaViewerPokerScene,
  buildArenaViewerGoldenSnapshot,
  motion,
  planFor,
} from "./arena-viewer-card-table-fixture";

describe("Arena viewer card table", () => {
  it("matches the approved compact-phone, tablet, and landscape layout golden", () => {
    const expected = JSON.parse(readFileSync(
      new URL("../goldens/contracts/arena-viewer-card-table.json", import.meta.url),
      "utf8",
    )) as unknown;
    assert.deepEqual(buildArenaViewerGoldenSnapshot(), expected);
  });

  it("keeps every card and exact owner hit target inside each supported viewport", () => {
    for (const [width, height] of [[288, 225], [680, 530], [680, 422]] as const) {
      const plan = planFor(arenaViewerPokerScene, width, height);
      validateRenderPlan(plan, arenaViewerPokerScene, motion(width, height));
      const faces = plan.commands.filter((command) => (
        command.kind === "rounded-rect" && command.id.endsWith(":face")
      ));
      assert.equal(faces.length, arenaViewerPokerScene.nodes.length);
      for (const face of faces) {
        if (face.kind !== "rounded-rect") continue;
        assert.ok(face.rect.x >= 0);
        assert.ok(face.rect.y >= 0);
        assert.ok(face.rect.x + face.rect.width <= width);
        assert.ok(face.rect.y + face.rect.height <= height);
      }
      assert.deepEqual(plan.hitZones.map(({ actionTargetId }) => actionTargetId), ["arena-owner-card-0"]);
    }
  });

  it("renders Hanabi owner cards face down and partner cards face up", () => {
    const scene = cardScene("hanabi", [
      ["arena-partner-player_2-card-0", "Red 1"],
      ["arena-partner-player_2-card-1", "Blue 2"],
      ["arena-partner-player_2-card-2", "Green 3"],
      ["arena-partner-player_2-card-3", "Yellow 4"],
      ["arena-partner-player_2-card-4", "White 5"],
      ["arena-owner-card-0", "HIDDEN"],
      ["arena-owner-card-1", "HIDDEN"],
    ], "player_2");
    const plan = planFor(scene, 350, 273);
    const text = plan.commands.flatMap((command) => command.kind === "text" ? [command.text] : []).join(" | ");
    const activeLine = plan.commands.find((command) => command.id === "card-table:arena:active-seat");
    assert.equal(plan.metadata.hanabiInvertedVisibility, true);
    assert.equal(plan.metadata.hiddenCardCount, 2);
    assert.match(text, /RED/u);
    assert.match(text, /BLUE/u);
    assert.match(text, /GREEN/u);
    assert.match(text, /YELLOW/u);
    assert.match(text, /WHITE/u);
    assert.match(text, /YOUR HAND · FACING AWAY/u);
    assert.ok(activeLine?.kind === "line");
    assert.ok(activeLine.from.y < 273 / 2, "partner activity must underline the partner, not the owner");
  });

  it("uses semantic Mahjong number, suit, and honor marks for every current token form", () => {
    const scene = cardScene("mahjong", [
      ["arena-center-tile-0", "D9"],
      ["arena-owner-tile-0", "B1"],
      ["arena-owner-tile-1", "1M"],
      ["arena-owner-tile-2", "2P"],
      ["arena-owner-tile-3", "3S"],
      ["arena-owner-tile-4", "EAST"],
      ["arena-owner-tile-5", "RED"],
    ]);
    const plan = planFor(scene, 680, 530);
    const text = plan.commands.flatMap((command) => command.kind === "text" ? [command.text] : []).join(" | ");
    assert.equal(plan.metadata.variant, "mahjong");
    assert.match(text, /DOT/u);
    assert.match(text, /BAM/u);
    assert.match(text, /WAN/u);
    assert.match(text, /HONOR/u);
    assert.match(text, /\bE\b/u);
    assert.match(text, /\bRED\b/u);
    assert.doesNotMatch(text, /\bB1\b|\b1M\b|\bD9\b/u);
  });

  it("gives every legal card in a 17-card owner hand an exclusive reachable hit region", () => {
    const scene = denseActionScene(17);
    const zones = cardTableActionHitZones(scene);
    assert.equal(zones.length, 17);
    for (const [index, zone] of zones.entries()) {
      assert.ok(zone.rect.width > 0);
      assert.ok(zone.rect.height > 0);
      const next = zones[index + 1];
      if (next) assert.ok(zone.rect.x + zone.rect.width <= next.rect.x + Number.EPSILON);
      const target = hitTestCardTable({
        x: zone.rect.x + zone.rect.width / 2,
        y: zone.rect.y + zone.rect.height / 2,
      }, scene);
      assert.equal(target?.id, `arena-owner-card-${index}`);
      assert.equal(target?.action, `play:C${index + 1}`);
    }
  });
});

function cardScene(
  gameSlug: string,
  values: readonly (readonly [id: string, label: string])[],
  activePlayer = "player_1",
): BoardScene {
  const nodes = values.map(([id, label], index) => Object.freeze({
    id,
    kind: "card" as const,
    label,
    row: null,
    col: null,
    index,
    actionTargetId: null,
  }));
  return Object.freeze({
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug,
    rendererFamily: "card_table",
    rows: 0,
    cols: 0,
    nodes: Object.freeze(nodes),
    actionTargets: Object.freeze([]),
    accessibility: Object.freeze(nodes.map((node) => Object.freeze({
      id: node.id,
      role: "text" as const,
      label: node.label,
      row: null,
      col: null,
      actionTargetId: null,
    }))),
    summary: Object.freeze({
      activePlayer,
      terminal: false,
      turn: 1,
      scores: Object.freeze({}),
    }),
  });
}

function denseActionScene(count: number): BoardScene {
  const nodes = Array.from({ length: count }, (_, index) => Object.freeze({
    id: `arena-owner-card-${index}`,
    kind: "card" as const,
    label: `C${index + 1}`,
    row: null,
    col: null,
    index,
    actionTargetId: `arena-owner-card-${index}`,
  }));
  return Object.freeze({
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug: "bridge",
    rendererFamily: "card_table",
    rows: 0,
    cols: 0,
    nodes: Object.freeze(nodes),
    actionTargets: Object.freeze(nodes.map((node, index) => Object.freeze({
      id: node.id,
      action: `play:C${index + 1}`,
      label: `Play card ${index + 1}`,
      disabled: false,
    }))),
    accessibility: Object.freeze(nodes.map((node, index) => Object.freeze({
      id: node.id,
      role: "button" as const,
      label: `Your hand. Card ${index + 1} of ${count}`,
      row: null,
      col: null,
      actionTargetId: node.actionTargetId,
    }))),
    summary: Object.freeze({
      activePlayer: "player_1",
      terminal: false,
      turn: 1,
      scores: Object.freeze({}),
    }),
  });
}
