import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCENE_SCHEMA_VERSION, type BoardScene } from "@eslams/game-render-contract";
import { THEMES } from "@eslams/theme-tokens";
import { MATERIAL_SHADER_VERSION, MATERIAL_SKSL } from "../src/material-shader";
import { controlledDropBounce, qualityProfile, resolvedMotionProgress } from "../src/motion";
import { materialLayer, validateRenderPlan } from "../src/plan";
import type { MotionState, RenderPlan } from "../src/types";

const motion = (overrides: Partial<MotionState> = {}): MotionState => ({
  progress: 0.4,
  beat: "move",
  reducedMotion: false,
  qualityTier: "high",
  viewport: { width: 360, height: 360, pixelRatio: 3 },
  lastActionTargetId: null,
  activeNodeId: null,
  ...overrides,
});

const scene: BoardScene = {
  schemaVersion: SCENE_SCHEMA_VERSION,
  gameSlug: "tic-tac-toe",
  rendererFamily: "grid_3x3",
  rows: 1,
  cols: 1,
  nodes: [{ id: "cell-0", kind: "board", label: "Empty", row: 0, col: 0, index: 0, actionTargetId: "cell-0" }],
  actionTargets: [{ id: "cell-0", action: "play", label: "Play", disabled: false }],
  accessibility: [{ id: "cell-0", role: "button", label: "Empty", row: 0, col: 0, actionTargetId: "cell-0" }],
  summary: { activePlayer: "player_1", terminal: false, turn: 0, scores: {} },
};

function validPlan(overrides: Partial<RenderPlan> = {}): RenderPlan {
  return {
    family: "grid_3x3",
    gameSlug: "tic-tac-toe",
    viewport: { width: 360, height: 360 },
    material: materialLayer(THEMES["classic-dark"], motion(), { x: 0, y: 0, width: 360, height: 360 }),
    commands: [{
      kind: "circle",
      id: "last-move",
      center: { x: 180, y: 180 },
      radius: 16,
      style: { color: "#ffffff", accentRole: "last-move", glow: true },
    }],
    hitZones: [{ id: "hit:cell-0", rect: { x: 0, y: 0, width: 360, height: 360 }, actionTargetId: "cell-0" }],
    metadata: {},
    ...overrides,
  };
}

describe("board renderer foundation", () => {
  it("resolves every reduced-motion beat directly to its static final state", () => {
    assert.equal(resolvedMotionProgress(motion({ progress: 0.02, reducedMotion: true })), 1);
    const profile = qualityProfile(motion({ reducedMotion: true }));
    assert.equal(profile.trails, false);
    assert.equal(profile.previewAnimation, false);
    assert.equal(controlledDropBounce(0.02, true), 1);
  });

  it("provides exactly one controlled Connect Four overshoot before settling", () => {
    const samples = Array.from({ length: 101 }, (_, index) => controlledDropBounce(index / 100, false));
    const aboveFinal = samples.filter((sample) => sample > 1);
    assert.ok(aboveFinal.length > 0);
    assert.ok(Math.abs(samples.at(-1)! - 1) < 1e-12);
    let peaks = 0;
    for (let index = 1; index < samples.length - 1; index += 1) {
      if (samples[index]! > samples[index - 1]! && samples[index]! > samples[index + 1]!) peaks += 1;
    }
    assert.equal(peaks, 1);
  });

  it("keeps a fixed, bounded material shader driven by the theme surface uniform", () => {
    assert.equal(MATERIAL_SHADER_VERSION, "eslams.board-material.sksl.v1");
    assert.match(MATERIAL_SKSL, /uniform float surface/u);
    assert.match(MATERIAL_SKSL, /uniform float detail/u);
    assert.match(MATERIAL_SKSL, /half4 main/u);
    assert.equal(materialLayer(THEMES.club, motion(), { x: 0, y: 0, width: 20, height: 20 }).surface, "wood");
    assert.equal(materialLayer(THEMES.arcade, motion(), { x: 0, y: 0, width: 20, height: 20 }).surface, "phosphor");
  });

  it("rejects unrestricted bloom, trails under reduced motion, and incomplete hit graphs", () => {
    assert.doesNotThrow(() => validateRenderPlan(validPlan(), scene, motion()));
    assert.throws(() => validateRenderPlan(validPlan({
      commands: [{ kind: "circle", id: "bad", center: { x: 1, y: 1 }, radius: 1, style: { color: "#fff", glow: true } }],
    }), scene, motion()), /Bloom is restricted/u);
    assert.throws(() => validateRenderPlan(validPlan({
      commands: [{ kind: "line", id: "trail", from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, style: { color: "#fff", trail: true } }],
    }), scene, motion({ reducedMotion: true })), /motion trails/u);
    assert.throws(() => validateRenderPlan(validPlan({ hitZones: [] }), scene, motion()), /requires exactly one render hit zone/u);
  });
});
