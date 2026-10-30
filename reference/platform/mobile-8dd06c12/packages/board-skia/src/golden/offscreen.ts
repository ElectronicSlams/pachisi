import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import * as NodeModule from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import CanvasKitInit, { type CanvasKit } from "canvaskit-wasm/full";
import type {
  SkImage,
} from "@shopify/react-native-skia";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { FAMILY_RENDERER_DEFINITIONS } from "../definitions";
import { createFamilyRendererRegistry, type FamilyRendererRegistry } from "../registry-core";
import type { MotionState, Rect, RenderPlan } from "../types";
import {
  GOLDEN_PIXEL_TOLERANCE_LIMITS,
  PINNED_GOLDEN_REFERENCE_ENVIRONMENT,
} from "./compatibility-matrix";
import type { SemanticSceneFixture } from "./fixtures";

export const OFFSCREEN_GOLDEN_FORMAT_VERSION = "eslams.board-goldens.v1" as const;

/** The only environment permitted to approve reference PNGs. */
export const OFFSCREEN_REFERENCE_ENVIRONMENT = PINNED_GOLDEN_REFERENCE_ENVIRONMENT;

export type PixelMaskReason = "font-rasterization" | "shader-noise";

export type PixelMask = Readonly<{
  id: string;
  reason: PixelMaskReason;
  rect: Rect;
  /** Regions cut out of this mask. Used to keep gameplay commands exact. */
  excludeRects?: readonly Rect[];
  maxChannelDelta: number;
  maxOutlierPixelRatio: number;
}>;

export type PixelPolicy = Readonly<{
  unmaskedMaxChannelDelta: number;
  unmaskedMaxOutlierPixelRatio: number;
  /** Masks are ordered: the first matching region owns a pixel. */
  masks: readonly PixelMask[];
}>;

export type GoldenRenderCase = Readonly<{
  id: string;
  fixture: SemanticSceneFixture;
  theme: ThemeTokens;
}>;

export type GoldenManifestEntry = Readonly<{
  id: string;
  png: string;
  width: number;
  height: number;
  pngBytes: number;
  pngSha256: string;
  semanticSha256: string;
  pixelPolicy: PixelPolicy;
}>;

export type GoldenManifest = Readonly<{
  formatVersion: typeof OFFSCREEN_GOLDEN_FORMAT_VERSION;
  referenceEnvironment: typeof OFFSCREEN_REFERENCE_ENVIRONMENT;
  approval: Readonly<{ reason: string }>;
  cases: readonly GoldenManifestEntry[];
}>;

export type GoldenComparisonFailure = Readonly<{
  id: string;
  reason: string;
  actualPath: string | null;
  diffPath: string | null;
}>;

export type GoldenRunResult = Readonly<{
  mode: "compare" | "update";
  compared: number;
  exactMatches: number;
  toleratedMatches: number;
  updated: number;
  failures: readonly GoldenComparisonFailure[];
}>;

type OffscreenBindings = Readonly<{
  Skia: SkiaApi;
  BlurStyle: Readonly<{ Normal: 0 }>;
  PaintStyle: Readonly<{ Fill: 0; Stroke: 1 }>;
}>;

type SkiaApi = typeof import("@shopify/react-native-skia").Skia;

type ResolveContext = Readonly<{ parentURL?: string }>;
type ResolveResult = Readonly<{ url: string; shortCircuit?: boolean }>;
type NextResolve = (specifier: string, context: ResolveContext) => ResolveResult;
type RegisterHooks = (hooks: Readonly<{
  resolve: (specifier: string, context: ResolveContext, nextResolve: NextResolve) => ResolveResult;
}>) => unknown;

type OffscreenRuntime = Readonly<{
  Skia: SkiaApi;
  renderers: FamilyRendererRegistry;
}>;

type RenderedGolden = Readonly<{
  png: Uint8Array;
  pixels: Uint8Array;
  width: number;
  height: number;
  semanticSha256: string;
  pixelPolicy: PixelPolicy;
}>;

type BucketResult = {
  pixels: number;
  outliers: number;
  largestChannelDelta: number;
};

const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);
const SKIA_BINDINGS_SYMBOL = Symbol.for("eslams.board-skia.offscreen-bindings.v1");
const SKIA_EXECUTOR_SUFFIX = "/src/skia-executor.ts";
let runtimePromise: Promise<OffscreenRuntime> | null = null;

export function assertPinnedOffscreenEnvironment(): void {
  if (process.versions.node !== OFFSCREEN_REFERENCE_ENVIRONMENT.node) {
    throw new Error(
      `Golden approval requires Node ${OFFSCREEN_REFERENCE_ENVIRONMENT.node}; received ${process.versions.node}.`,
    );
  }
}

export function createPixelPolicy(plan: RenderPlan): PixelPolicy {
  const fontTolerance = GOLDEN_PIXEL_TOLERANCE_LIMITS["font-rasterization"];
  const shaderTolerance = GOLDEN_PIXEL_TOLERANCE_LIMITS["shader-noise"];
  const fontMasks = plan.commands.flatMap((command): PixelMask[] => {
    if (command.kind !== "text") return [];
    const width = Math.max(command.size * 0.75, command.text.length * command.size * 0.68);
    return [Object.freeze({
      id: `font/${command.id}`,
      reason: "font-rasterization",
      rect: Object.freeze({
        x: Math.max(0, command.at.x - 1),
        y: Math.max(0, command.at.y - command.size * 1.05),
        width: Math.min(plan.viewport.width - Math.max(0, command.at.x - 1), width + 2),
        height: Math.min(plan.viewport.height - Math.max(0, command.at.y - command.size * 1.05), command.size * 1.3),
      }),
      ...fontTolerance,
    })];
  });
  return Object.freeze({
    unmaskedMaxChannelDelta: 0,
    unmaskedMaxOutlierPixelRatio: 0,
    masks: Object.freeze([
      ...fontMasks,
      Object.freeze({
        id: "material/shader-noise",
        reason: "shader-noise" as const,
        rect: Object.freeze({ x: 0, y: 0, width: plan.viewport.width, height: plan.viewport.height }),
        excludeRects: Object.freeze(plan.commands.map(commandBounds)),
        ...shaderTolerance,
      }),
    ]),
  });
}

export async function renderOffscreenGolden(renderCase: GoldenRenderCase): Promise<RenderedGolden> {
  assertSafeCaseId(renderCase.id);
  const runtime = await loadOffscreenRuntime();
  const { scene, motion } = renderCase.fixture;
  const expectedViewport = OFFSCREEN_REFERENCE_ENVIRONMENT.semanticFixtureViewport;
  if (
    motion.viewport.width !== expectedViewport.width
    || motion.viewport.height !== expectedViewport.height
    || motion.viewport.pixelRatio !== expectedViewport.pixelRatio
  ) {
    throw new TypeError(
      `Fixture ${renderCase.id} must use the pinned ${expectedViewport.width}x${expectedViewport.height}`
      + ` viewport at pixel ratio ${expectedViewport.pixelRatio}.`,
    );
  }
  if (scene.rendererFamily !== renderCase.fixture.family) {
    throw new TypeError(`Fixture ${renderCase.id} has a renderer-family mismatch.`);
  }
  const width = checkedDimension(motion.viewport.width, "width", renderCase.id);
  const height = checkedDimension(motion.viewport.height, "height", renderCase.id);
  if (width !== OFFSCREEN_REFERENCE_ENVIRONMENT.output.width || height !== OFFSCREEN_REFERENCE_ENVIRONMENT.output.height) {
    throw new TypeError(`Fixture ${renderCase.id} does not match the pinned physical output dimensions.`);
  }
  const renderer = runtime.renderers[renderCase.fixture.family];
  const plan = renderer.createPlan(scene, renderCase.theme, motion);
  const pixelPolicy = createPixelPolicy(plan);
  const surface = runtime.Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error(`CanvasKit could not allocate ${width}x${height} for ${renderCase.id}.`);
  try {
    const canvas = surface.getCanvas();
    canvas.clear(runtime.Skia.Color("#00000000"));
    renderer.render(canvas, scene, renderCase.theme, motion);
    surface.flush();
    const image = surface.makeImageSnapshot();
    try {
      const png = image.encodeToBytes();
      assertPng(png, renderCase.id);
      const pixels = readRgba(image, width, height, renderCase.id);
      return Object.freeze({
        png,
        pixels,
        width,
        height,
        semanticSha256: sha256(stableJson(renderCase.fixture)),
        pixelPolicy,
      });
    } finally {
      image.dispose();
    }
  } finally {
    surface.dispose();
  }
}

export async function runOffscreenGoldens(options: Readonly<{
  mode: "compare" | "update";
  cases: readonly GoldenRenderCase[];
  referenceRoot: string;
  failureRoot?: string;
  approvalReason?: string;
}>): Promise<GoldenRunResult> {
  assertPinnedOffscreenEnvironment();
  assertCompleteCaseSet(options.cases);
  const root = resolve(options.referenceRoot);
  const manifestPath = join(root, "manifest.json");
  if (options.mode === "update") {
    const reason = options.approvalReason?.trim();
    if (!reason || reason.length < 8) {
      throw new Error("Golden update requires an explicit approval reason of at least eight characters.");
    }
    const entries: GoldenManifestEntry[] = [];
    for (const renderCase of [...options.cases].sort(compareCaseIds)) {
      const rendered = await renderOffscreenGolden(renderCase);
      const pngRelative = `${renderCase.id}.png`;
      await atomicWrite(joinSafe(root, pngRelative), rendered.png);
      entries.push(Object.freeze({
        id: renderCase.id,
        png: pngRelative,
        width: rendered.width,
        height: rendered.height,
        pngBytes: rendered.png.byteLength,
        pngSha256: sha256(rendered.png),
        semanticSha256: rendered.semanticSha256,
        pixelPolicy: rendered.pixelPolicy,
      }));
    }
    const manifest: GoldenManifest = Object.freeze({
      formatVersion: OFFSCREEN_GOLDEN_FORMAT_VERSION,
      referenceEnvironment: OFFSCREEN_REFERENCE_ENVIRONMENT,
      approval: Object.freeze({ reason }),
      cases: Object.freeze(entries),
    });
    await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await pruneUnreferencedPngs(root, new Set(entries.map(({ png }) => png)));
    return Object.freeze({
      mode: "update",
      compared: 0,
      exactMatches: 0,
      toleratedMatches: 0,
      updated: entries.length,
      failures: Object.freeze([]),
    });
  }

  const manifest = parseManifest(await readFile(manifestPath, "utf8"));
  assertManifestMatchesCases(manifest, options.cases);
  await assertNoUnreferencedPngs(root, new Set(manifest.cases.map(({ png }) => png)));
  const entries = new Map(manifest.cases.map((entry) => [entry.id, entry]));
  const failures: GoldenComparisonFailure[] = [];
  let exactMatches = 0;
  let toleratedMatches = 0;
  for (const renderCase of [...options.cases].sort(compareCaseIds)) {
    const entry = entries.get(renderCase.id);
    if (!entry) throw new Error(`Manifest entry disappeared for ${renderCase.id}.`);
    const expectedPng = await readFile(joinSafe(root, entry.png));
    assertPng(expectedPng, renderCase.id);
    if (sha256(expectedPng) !== entry.pngSha256) {
      throw new Error(`Reference PNG hash does not match the approved manifest for ${renderCase.id}.`);
    }
    const rendered = await renderOffscreenGolden(renderCase);
    if (rendered.semanticSha256 !== entry.semanticSha256) {
      failures.push(Object.freeze({
        id: renderCase.id,
        reason: "semantic snapshot changed before pixel comparison",
        actualPath: null,
        diffPath: null,
      }));
      continue;
    }
    if (sha256(rendered.png) === entry.pngSha256) {
      exactMatches += 1;
      continue;
    }
    if (rendered.width !== entry.width || rendered.height !== entry.height) {
      failures.push(Object.freeze({
        id: renderCase.id,
        reason: `dimensions changed from ${entry.width}x${entry.height} to ${rendered.width}x${rendered.height}`,
        actualPath: null,
        diffPath: null,
      }));
      continue;
    }
    const expectedPixels = decodePng(await loadOffscreenRuntime(), expectedPng, entry.width, entry.height, renderCase.id);
    const comparison = compareRgba(expectedPixels, rendered.pixels, entry.width, entry.height, entry.pixelPolicy);
    if (comparison.ok) {
      toleratedMatches += 1;
      continue;
    }
    const artifact = options.failureRoot
      ? await writeFailureArtifacts(options.failureRoot, renderCase.id, rendered, expectedPixels)
      : { actualPath: null, diffPath: null };
    failures.push(Object.freeze({
      id: renderCase.id,
      reason: comparison.reason,
      ...artifact,
    }));
  }
  return Object.freeze({
    mode: "compare",
    compared: options.cases.length,
    exactMatches,
    toleratedMatches,
    updated: 0,
    failures: Object.freeze(failures),
  });
}

export function compareRgba(
  expected: Uint8Array,
  actual: Uint8Array,
  width: number,
  height: number,
  policy: PixelPolicy,
): Readonly<{ ok: boolean; reason: string }> {
  const expectedLength = width * height * 4;
  if (expected.byteLength !== expectedLength || actual.byteLength !== expectedLength) {
    return Object.freeze({ ok: false, reason: "RGBA byte length does not match the declared dimensions" });
  }
  const unmasked: BucketResult = { pixels: 0, outliers: 0, largestChannelDelta: 0 };
  const buckets = policy.masks.map((): BucketResult => ({ pixels: 0, outliers: 0, largestChannelDelta: 0 }));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const maskIndex = policy.masks.findIndex((mask) => pointInMask(x, y, mask));
      const bucket = maskIndex === -1 ? unmasked : buckets[maskIndex]!;
      const permitted = maskIndex === -1 ? policy.unmaskedMaxChannelDelta : policy.masks[maskIndex]!.maxChannelDelta;
      const offset = (y * width + x) * 4;
      let delta = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        delta = Math.max(delta, Math.abs(expected[offset + channel]! - actual[offset + channel]!));
      }
      bucket.pixels += 1;
      bucket.largestChannelDelta = Math.max(bucket.largestChannelDelta, delta);
      if (delta > permitted) bucket.outliers += 1;
    }
  }
  const failures: string[] = [];
  appendBucketFailure(
    failures,
    "unmasked",
    unmasked,
    policy.unmaskedMaxOutlierPixelRatio,
    policy.unmaskedMaxChannelDelta,
  );
  policy.masks.forEach((mask, index) => {
    appendBucketFailure(failures, mask.id, buckets[index]!, mask.maxOutlierPixelRatio, mask.maxChannelDelta);
  });
  return Object.freeze({
    ok: failures.length === 0,
    reason: failures.length === 0 ? "within explicit pixel policy" : failures.join("; "),
  });
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

async function loadOffscreenRuntime(): Promise<OffscreenRuntime> {
  runtimePromise ??= initializeOffscreenRuntime();
  return runtimePromise;
}

async function initializeOffscreenRuntime(): Promise<OffscreenRuntime> {
  const canvasKit = await CanvasKitInit({});
  const webModule: unknown = await import("@shopify/react-native-skia/lib/module/skia/web/index.js");
  const webExports = moduleRecord(webModule);
  const createApi = webExports.JsiSkApi;
  if (typeof createApi !== "function") throw new Error("Pinned React Native Skia web API is unavailable.");
  const baseSkia = (createApi as (kit: CanvasKit) => SkiaApi)(canvasKit);
  const packageRequire = NodeModule.createRequire(import.meta.url);
  const interPackageRoot = dirname(packageRequire.resolve("@expo-google-fonts/inter/package.json"));
  const fontBytes = await readFile(join(interPackageRoot, "400Regular", "Inter_400Regular.ttf"));
  if (sha256(fontBytes) !== OFFSCREEN_REFERENCE_ENVIRONMENT.font.sha256) {
    throw new Error("Pinned Inter font bytes do not match the golden reference environment.");
  }
  const fontData = baseSkia.Data.fromBytes(fontBytes);
  const pinnedTypeface = baseSkia.Typeface.MakeFreeTypeFaceFromData(fontData);
  if (!pinnedTypeface) throw new Error("CanvasKit could not load the pinned Inter typeface.");
  const Skia = Object.freeze({
    ...baseSkia,
    Font: (typeface?: Parameters<SkiaApi["Font"]>[0], size?: number) =>
      baseSkia.Font(typeface ?? pinnedTypeface, size),
  }) satisfies SkiaApi;
  const bindings: OffscreenBindings = Object.freeze({
    Skia,
    BlurStyle: Object.freeze({ Normal: 0 }),
    PaintStyle: Object.freeze({ Fill: 0, Stroke: 1 }),
  });
  const globals = globalThis as unknown as Record<symbol, unknown>;
  globals[SKIA_BINDINGS_SYMBOL] = bindings;
  const shimSource = [
    `const bindings = globalThis[Symbol.for(${JSON.stringify(Symbol.keyFor(SKIA_BINDINGS_SYMBOL))})];`,
    "if (!bindings) throw new Error('Offscreen Skia bindings were not initialized.');",
    "export const Skia = bindings.Skia;",
    "export const BlurStyle = bindings.BlurStyle;",
    "export const PaintStyle = bindings.PaintStyle;",
  ].join("\n");
  const shimUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(shimSource)}`;
  const registerSynchronousHooks = (NodeModule as unknown as Readonly<{ registerHooks?: RegisterHooks }>).registerHooks;
  if (!registerSynchronousHooks) {
    throw new Error(
      `Node ${OFFSCREEN_REFERENCE_ENVIRONMENT.node} with synchronous module hooks is required for golden rendering.`,
    );
  }
  registerSynchronousHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "@shopify/react-native-skia" && context.parentURL?.endsWith(SKIA_EXECUTOR_SUFFIX)) {
        return { url: shimUrl, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
  const { drawRenderPlan } = await import("../skia-executor");
  const renderers = createFamilyRendererRegistry(FAMILY_RENDERER_DEFINITIONS, drawRenderPlan);
  return Object.freeze({ Skia, renderers });
}

function moduleRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return {};
  const defaultExport = value.default;
  return isRecord(defaultExport) ? defaultExport : value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function decodePng(
  runtime: OffscreenRuntime,
  png: Uint8Array,
  width: number,
  height: number,
  id: string,
): Uint8Array {
  const data = runtime.Skia.Data.fromBytes(png);
  try {
    const image = runtime.Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error(`CanvasKit could not decode the reference PNG for ${id}.`);
    try {
      if (image.width() !== width || image.height() !== height) {
        throw new Error(`Decoded reference dimensions do not match the manifest for ${id}.`);
      }
      return readRgba(image, width, height, id);
    } finally {
      image.dispose();
    }
  } finally {
    data.dispose();
  }
}

function readRgba(image: SkImage, width: number, height: number, id: string): Uint8Array {
  // React Native Skia 2.6.2 enums: AlphaType.Unpremul = 3, ColorType.RGBA_8888 = 4.
  const pixels = image.readPixels(0, 0, { alphaType: 3, colorType: 4, width, height });
  if (!(pixels instanceof Uint8Array)) throw new Error(`CanvasKit could not read RGBA pixels for ${id}.`);
  return new Uint8Array(pixels);
}

function parseManifest(serialized: string): GoldenManifest {
  const value: unknown = JSON.parse(serialized);
  if (!isRecord(value) || value.formatVersion !== OFFSCREEN_GOLDEN_FORMAT_VERSION) {
    throw new TypeError("Unsupported or malformed offscreen golden manifest.");
  }
  if (stableJson(value.referenceEnvironment) !== stableJson(OFFSCREEN_REFERENCE_ENVIRONMENT)) {
    throw new TypeError("Golden manifest reference environment does not match the pinned runtime.");
  }
  if (!Array.isArray(value.cases) || !isRecord(value.approval) || typeof value.approval.reason !== "string") {
    throw new TypeError("Golden manifest is missing cases or approval evidence.");
  }
  for (const entry of value.cases) validateManifestEntry(entry);
  return value as GoldenManifest;
}

function validateManifestEntry(value: unknown): asserts value is GoldenManifestEntry {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.png !== "string") {
    throw new TypeError("Golden manifest contains an invalid case entry.");
  }
  assertSafeCaseId(value.id);
  if (value.png !== `${value.id}.png`) throw new TypeError(`Unsafe golden path for ${value.id}.`);
  if (!Number.isInteger(value.width) || !Number.isInteger(value.height) || !Number.isInteger(value.pngBytes)) {
    throw new TypeError(`Golden manifest dimensions are invalid for ${value.id}.`);
  }
  if (typeof value.pngSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.pngSha256)) {
    throw new TypeError(`Golden PNG digest is invalid for ${value.id}.`);
  }
  if (typeof value.semanticSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.semanticSha256)) {
    throw new TypeError(`Golden semantic digest is invalid for ${value.id}.`);
  }
  validatePixelPolicy(value.pixelPolicy, value.id);
}

function validatePixelPolicy(value: unknown, id: string): asserts value is PixelPolicy {
  if (!isRecord(value)
    || !validDelta(value.unmaskedMaxChannelDelta)
    || !validRatio(value.unmaskedMaxOutlierPixelRatio)
    || !Array.isArray(value.masks)) {
    throw new TypeError(`Pixel policy is invalid for ${id}.`);
  }
  for (const mask of value.masks) {
    if (!isRecord(mask)
      || typeof mask.id !== "string"
      || (mask.reason !== "font-rasterization" && mask.reason !== "shader-noise")
      || !validDelta(mask.maxChannelDelta)
      || !validRatio(mask.maxOutlierPixelRatio)
      || !isRecord(mask.rect)
      || ![mask.rect.x, mask.rect.y, mask.rect.width, mask.rect.height].every(finiteNonNegative)
      || (mask.excludeRects !== undefined && (!Array.isArray(mask.excludeRects)
        || !mask.excludeRects.every((rect) => isRecord(rect)
          && [rect.x, rect.y, rect.width, rect.height].every(finiteNonNegative))))) {
      throw new TypeError(`Pixel mask is invalid for ${id}.`);
    }
  }
}

function assertManifestMatchesCases(manifest: GoldenManifest, cases: readonly GoldenRenderCase[]): void {
  const expected = [...cases].map(({ id }) => id).sort();
  const actual = manifest.cases.map(({ id }) => id).sort();
  if (stableJson(expected) !== stableJson(actual)) {
    throw new Error("Golden manifest case set differs from the canonical fixture matrix; run explicit update after review.");
  }
}

function assertCompleteCaseSet(cases: readonly GoldenRenderCase[]): void {
  if (cases.length === 0) throw new TypeError("At least one golden render case is required.");
  const ids = new Set<string>();
  for (const renderCase of cases) {
    assertSafeCaseId(renderCase.id);
    if (ids.has(renderCase.id)) throw new TypeError(`Duplicate golden case id: ${renderCase.id}.`);
    ids.add(renderCase.id);
  }
}

function assertSafeCaseId(id: string): void {
  const segments = id.split("/");
  if (segments.some((segment) => !/^[a-z0-9][a-z0-9._-]*$/u.test(segment) || segment === "..")) {
    throw new TypeError(`Unsafe golden case id: ${id}.`);
  }
}

function joinSafe(root: string, child: string): string {
  const target = resolve(root, child);
  const pathFromRoot = relative(root, target);
  if (pathFromRoot.startsWith(`..${sep}`) || pathFromRoot === ".." || resolve(target) === resolve(root)) {
    throw new TypeError(`Golden path escapes its reference root: ${child}.`);
  }
  return target;
}

async function referencePngs(root: string, directory = root): Promise<readonly string[]> {
  const paths: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await referencePngs(root, absolute));
    } else if (entry.isFile() && entry.name.endsWith(".png")) {
      const relativePath = relative(root, absolute).split(sep).join("/");
      assertSafeCaseId(relativePath.slice(0, -".png".length));
      paths.push(relativePath);
    }
  }
  return paths.sort();
}

async function pruneUnreferencedPngs(root: string, expected: ReadonlySet<string>): Promise<void> {
  for (const png of await referencePngs(root)) {
    if (!expected.has(png)) await unlink(joinSafe(root, png));
  }
}

async function assertNoUnreferencedPngs(root: string, expected: ReadonlySet<string>): Promise<void> {
  const unexpected = (await referencePngs(root)).filter((png) => !expected.has(png));
  if (unexpected.length > 0) {
    throw new Error(`Golden corpus contains unreferenced PNG evidence: ${unexpected.join(", ")}.`);
  }
}

async function atomicWrite(path: string, value: Uint8Array | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, value);
  await rename(temporary, path);
}

async function writeFailureArtifacts(
  failureRoot: string,
  id: string,
  rendered: RenderedGolden,
  expected: Uint8Array,
): Promise<Readonly<{ actualPath: string; diffPath: string }>> {
  const runtime = await loadOffscreenRuntime();
  const root = resolve(failureRoot);
  const actualPath = joinSafe(root, `${id}.actual.png`);
  const diffPath = joinSafe(root, `${id}.diff.png`);
  await atomicWrite(actualPath, rendered.png);
  const diff = new Uint8Array(rendered.pixels.length);
  for (let offset = 0; offset < diff.length; offset += 4) {
    const changed = expected[offset] !== rendered.pixels[offset]
      || expected[offset + 1] !== rendered.pixels[offset + 1]
      || expected[offset + 2] !== rendered.pixels[offset + 2]
      || expected[offset + 3] !== rendered.pixels[offset + 3];
    diff[offset] = changed ? 255 : Math.round(rendered.pixels[offset]! * 0.22);
    diff[offset + 1] = changed ? 24 : Math.round(rendered.pixels[offset + 1]! * 0.22);
    diff[offset + 2] = changed ? 24 : Math.round(rendered.pixels[offset + 2]! * 0.22);
    diff[offset + 3] = 255;
  }
  const data = runtime.Skia.Data.fromBytes(diff);
  try {
    const image = runtime.Skia.Image.MakeImage(
      { alphaType: 3, colorType: 4, width: rendered.width, height: rendered.height },
      data,
      rendered.width * 4,
    );
    if (!image) throw new Error(`CanvasKit could not create a diff image for ${id}.`);
    try {
      await atomicWrite(diffPath, image.encodeToBytes());
    } finally {
      image.dispose();
    }
  } finally {
    data.dispose();
  }
  return Object.freeze({ actualPath, diffPath });
}

function appendBucketFailure(
  failures: string[],
  id: string,
  bucket: BucketResult,
  maxRatio: number,
  maxDelta: number,
): void {
  if (bucket.pixels === 0) return;
  const ratio = bucket.outliers / bucket.pixels;
  if (ratio > maxRatio) {
    failures.push(
      `${id} outliers ${(ratio * 100).toFixed(4)}% exceed ${(maxRatio * 100).toFixed(4)}% `
      + `(max channel delta ${bucket.largestChannelDelta}, threshold ${maxDelta})`,
    );
  }
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function pointInMask(x: number, y: number, mask: PixelMask): boolean {
  return pointInRect(x, y, mask.rect)
    && !(mask.excludeRects?.some((excluded) => pointInRect(x, y, excluded)) ?? false);
}

function commandBounds(command: RenderPlan["commands"][number]): Rect {
  const expansion = Math.max(1, command.style.strokeWidth ?? 0) + (command.style.glow ? 10 : 0);
  switch (command.kind) {
    case "rect":
    case "rounded-rect":
    case "arc":
      return expandRect(command.rect, expansion);
    case "circle":
      return expandRect({
        x: command.center.x - command.radius,
        y: command.center.y - command.radius,
        width: command.radius * 2,
        height: command.radius * 2,
      }, expansion);
    case "line":
      return expandRect({
        x: Math.min(command.from.x, command.to.x),
        y: Math.min(command.from.y, command.to.y),
        width: Math.abs(command.to.x - command.from.x),
        height: Math.abs(command.to.y - command.from.y),
      }, expansion);
    case "polygon": {
      const xs = command.points.map(({ x }) => x);
      const ys = command.points.map(({ y }) => y);
      return expandRect({
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }, expansion);
    }
    case "text":
      return expandRect({
        x: command.at.x,
        y: command.at.y - command.size,
        width: Math.max(command.size * 0.75, command.text.length * command.size * 0.68),
        height: command.size * 1.25,
      }, 2);
  }
}

function expandRect(rect: Rect, amount: number): Rect {
  return Object.freeze({
    x: Math.max(0, rect.x - amount),
    y: Math.max(0, rect.y - amount),
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  });
}

function checkedDimension(value: number, label: string, id: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 4096) {
    throw new RangeError(`Golden ${label} is invalid for ${id}: ${value}.`);
  }
  return value;
}

function assertPng(bytes: Uint8Array, id: string): void {
  if (bytes.byteLength < PNG_SIGNATURE.length
    || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) {
    throw new TypeError(`Renderer did not produce a real PNG for ${id}.`);
  }
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function validDelta(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 255;
}

function validRatio(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function compareCaseIds(a: GoldenRenderCase, b: GoldenRenderCase): number {
  return a.id.localeCompare(b.id, "en");
}
