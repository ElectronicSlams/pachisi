import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { THEMES } from "@eslams/theme-tokens";
import { FAMILY_RENDERER_DEFINITIONS } from "../src/definitions";
import {
  CANONICAL_SEMANTIC_SCENE_FIXTURES,
  FAMILY_SEMANTIC_REPRESENTATIVES,
  semanticFixtureById,
} from "../src/golden/fixtures";
import type { RenderCommand } from "../src/types";

describe("pixel-visible semantic labels", () => {
  it("never paints the accessibility coordinate prefix as gameplay content", () => {
    const fixtures = [...CANONICAL_SEMANTIC_SCENE_FIXTURES, ...FAMILY_SEMANTIC_REPRESENTATIVES];
    for (const fixture of fixtures) {
      const plan = FAMILY_RENDERER_DEFINITIONS[fixture.family].buildPlan(
        fixture.scene,
        THEMES["classic-dark"],
        fixture.motion,
      );
      const labels = plan.commands.flatMap((command) => command.kind === "text" ? [command.text] : []);
      for (const label of labels) {
        assert.doesNotMatch(label, /^Row\s+\d+,\s*column\s+\d+:/iu, fixture.id);
      }
    }
  });

  it("renders opposing Shogi pieces with opposite orientation and readable glyph ink", () => {
    const fixture = semanticFixtureById("shogi/active_turn");
    const plan = FAMILY_RENDERER_DEFINITIONS.custom.buildPlan(
      fixture.scene,
      THEMES["classic-dark"],
      fixture.motion,
    );
    const darkNode = fixture.scene.nodes.find(({ label }) => /Black pawn/iu.test(label));
    const lightNode = fixture.scene.nodes.find(({ label }) => /White silver/iu.test(label));
    assert.ok(darkNode);
    assert.ok(lightNode);
    const dark = polygon(plan.commands, `shogi:koma:${darkNode.id}`);
    const light = polygon(plan.commands, `shogi:koma:${lightNode.id}`);
    assert.ok(dark.points[0]!.y < dark.points[2]!.y, "Black Shogi piece must point toward rank a.");
    assert.ok(light.points[0]!.y > light.points[2]!.y, "White Shogi piece must point toward rank i.");
    assert.ok(plan.commands.some(({ id }) => id === `shogi:koma-outline:${darkNode.id}`));
    const glyph = plan.commands.find(({ id }) => id === `shogi:glyph:${darkNode.id}`);
    assert.ok(glyph?.kind === "text");
    assert.equal(glyph.style.color, THEMES["classic-dark"].color.text);
  });

  it("renders chess pieces as portable high-contrast tokens without missing-font symbols", () => {
    const fixture = semanticFixtureById("chess/active_turn");
    const plan = FAMILY_RENDERER_DEFINITIONS.square_board.buildPlan(
      fixture.scene,
      THEMES["classic-dark"],
      fixture.motion,
    );
    const occupied = fixture.scene.nodes.filter(({ label }) => /(?:white|black)\s+(?:king|queen|rook|bishop|knight|pawn)/iu.test(label));
    assert.equal(occupied.length, 2);
    for (const node of occupied) {
      assert.ok(plan.commands.some(({ id }) => id === `square:piece-token:${node.id}`));
      const glyph = plan.commands.find(({ id }) => id === `square:piece:${node.id}`);
      assert.ok(glyph?.kind === "text");
      assert.match(glyph.text, /^[KQRBNP]$/u);
    }
  });
});

function polygon(commands: readonly RenderCommand[], id: string): Extract<RenderCommand, { kind: "polygon" }> {
  const command = commands.find((candidate) => candidate.id === id);
  assert.ok(command?.kind === "polygon", `Missing polygon ${id}.`);
  return command;
}
