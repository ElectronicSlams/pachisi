import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { THEMES } from "@eslams/theme-tokens";
import {
  GOLDEN_PIXEL_TOLERANCE_LIMITS,
  PINNED_GOLDEN_REFERENCE_ENVIRONMENT,
} from "../src/golden/compatibility-matrix";
import { semanticFixtureById } from "../src/golden/fixtures";
import {
  OFFSCREEN_GOLDEN_FORMAT_VERSION,
  OFFSCREEN_REFERENCE_ENVIRONMENT,
  compareRgba,
  createPixelPolicy,
  renderOffscreenGolden,
  runOffscreenGoldens,
  type GoldenRenderCase,
  type PixelPolicy,
} from "../src/golden/offscreen";

const probeCase: GoldenRenderCase = Object.freeze({
  id: "test/tic-tac-toe-active",
  fixture: semanticFixtureById("tic-tac-toe/active_turn"),
  theme: THEMES["classic-dark"],
});

describe("CanvasKit CPU golden harness", () => {
  it("executes the real FamilyRenderer and produces deterministic PNG pixels", async () => {
    assert.equal(OFFSCREEN_REFERENCE_ENVIRONMENT, PINNED_GOLDEN_REFERENCE_ENVIRONMENT);
    const first = await renderOffscreenGolden(probeCase);
    const second = await renderOffscreenGolden(probeCase);
    assert.deepEqual(Array.from(first.png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(first.png.byteLength > 1_000);
    assert.equal(first.pixels.byteLength, first.width * first.height * 4);
    assert.deepEqual(first.png, second.png);
    assert.deepEqual(first.pixels, second.pixels);
    const shaderMask = first.pixelPolicy.masks.find(({ reason }) => reason === "shader-noise");
    const fontPolicy = createPixelPolicy({
      family: "grid_3x3",
      gameSlug: "tic-tac-toe",
      viewport: { width: 390, height: 480 },
      material: {
        surface: "flat",
        rect: { x: 0, y: 0, width: 390, height: 480 },
        baseColor: "#000000",
        accentColor: "#ffffff",
        detail: 0,
        phase: 1,
      },
      commands: [{
        kind: "text",
        id: "coordinate-label",
        at: { x: 12, y: 20 },
        text: "A1",
        size: 12,
        style: { color: "#ffffff" },
      }],
      hitZones: [],
      metadata: {},
    });
    const fontMask = fontPolicy.masks.find(({ reason }) => reason === "font-rasterization");
    assert.ok(shaderMask);
    assert.ok(fontMask);
    assert.equal(shaderMask.maxChannelDelta, GOLDEN_PIXEL_TOLERANCE_LIMITS["shader-noise"].maxChannelDelta);
    assert.equal(shaderMask.maxOutlierPixelRatio, GOLDEN_PIXEL_TOLERANCE_LIMITS["shader-noise"].maxOutlierPixelRatio);
    assert.equal(fontMask.maxChannelDelta, GOLDEN_PIXEL_TOLERANCE_LIMITS["font-rasterization"].maxChannelDelta);
    assert.equal(fontMask.maxOutlierPixelRatio, GOLDEN_PIXEL_TOLERANCE_LIMITS["font-rasterization"].maxOutlierPixelRatio);
  });

  it("requires explicit approval to update and detects a semantic change before pixels", async () => {
    const root = await mkdtemp(join(tmpdir(), "eslams-board-golden-"));
    await assert.rejects(
      runOffscreenGoldens({ mode: "update", cases: [probeCase], referenceRoot: root }),
      /explicit approval reason/u,
    );
    const update = await runOffscreenGoldens({
      mode: "update",
      cases: [probeCase],
      referenceRoot: root,
      approvalReason: "targeted harness test",
    });
    assert.equal(update.updated, 1);
    const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8")) as {
      formatVersion: string;
      cases: readonly { pngSha256: string; semanticSha256: string }[];
    };
    assert.equal(manifest.formatVersion, OFFSCREEN_GOLDEN_FORMAT_VERSION);
    assert.match(manifest.cases[0]!.pngSha256, /^[0-9a-f]{64}$/u);
    assert.match(manifest.cases[0]!.semanticSha256, /^[0-9a-f]{64}$/u);
    const orphanPath = join(root, "orphan.png");
    await writeFile(orphanPath, new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
    await assert.rejects(
      runOffscreenGoldens({ mode: "compare", cases: [probeCase], referenceRoot: root }),
      /unreferenced PNG evidence/u,
    );
    await runOffscreenGoldens({
      mode: "update",
      cases: [probeCase],
      referenceRoot: root,
      approvalReason: "prune stale harness evidence",
    });
    await assert.rejects(access(orphanPath));
    const compare = await runOffscreenGoldens({ mode: "compare", cases: [probeCase], referenceRoot: root });
    assert.equal(compare.failures.length, 0);
    assert.equal(compare.exactMatches, 1);
  });

  it("keeps wrong geometry outside the shader and font tolerances", () => {
    const expected = new Uint8Array(4 * 4 * 4);
    const actual = new Uint8Array(expected);
    actual[(2 * 4 + 2) * 4] = 255;
    const policy: PixelPolicy = Object.freeze({
      unmaskedMaxChannelDelta: 0,
      unmaskedMaxOutlierPixelRatio: 0,
      masks: Object.freeze([Object.freeze({
        id: "shader",
        reason: "shader-noise",
        rect: Object.freeze({ x: 0, y: 0, width: 4, height: 4 }),
        maxChannelDelta: 2,
        maxOutlierPixelRatio: 0,
      })]),
    });
    const result = compareRgba(expected, actual, 4, 4, policy);
    assert.equal(result.ok, false);
    assert.match(result.reason, /shader outliers/u);
  });
});
