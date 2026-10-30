import {
  ARENA_REPLAY_CONTRACT_VERSIONS,
  GAME_CATALOG,
  LEGACY_ARENA_REPLAY_SCHEMA_VERSION,
  MOBILE_ARENA_GAME_CAPABILITIES,
  adaptReplayManifest,
  type AdaptedReplayManifest,
  type GameCatalogEntry,
  type GameRendererFamily,
} from "@eslams/core-types";
import {
  DISPLAY_FRAME_VERSION,
  PUBLIC_STATE_VERSION,
  RENDER_ADAPTER_VERSION,
  RENDERER_VERSION,
  assertBoardSceneSafe,
  buildSceneEnvelope,
  displayFrameAsLegacyRecord,
  type ActionTarget,
  type BoardScene,
  type DisplayCell,
  type DisplayFrameV1,
} from "@eslams/game-render-contract";
import { THEME_IDS, type ThemeId } from "@eslams/theme-tokens";
import { RENDERER_FAMILIES } from "../registry-core";
import type { MotionBeat, MotionState } from "../types";
import {
  GAME_COMPATIBILITY_MATRIX,
  WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
} from "./compatibility-matrix";
import { BASELINE_COMPATIBILITY_STATES, type CompatibilityState } from "./compatibility-types";

export const REQUIRED_SEMANTIC_SCENARIOS = BASELINE_COMPATIBILITY_STATES;

export type RequiredSemanticScenario = (typeof REQUIRED_SEMANTIC_SCENARIOS)[number];
export type SemanticScenario = CompatibilityState;

export type SemanticSceneFixture = Readonly<{
  id: string;
  gameSlug: string;
  family: GameRendererFamily;
  scenario: SemanticScenario;
  scene: BoardScene;
  motion: MotionState;
  /** Present only for the compatibility case sourced from the numeric v1 replay manifest. */
  legacyReplay: AdaptedReplayManifest | null;
}>;

export type FamilyThemeFixture = Readonly<{
  id: string;
  family: GameRendererFamily;
  gameSlug: string;
  themeId: ThemeId;
  semanticFixtureId: string;
}>;

export type SemanticSceneSnapshot = Readonly<{
  fixtureId: string;
  gameSlug: string;
  family: GameRendererFamily;
  scenario: SemanticScenario;
  schemaVersion: BoardScene["schemaVersion"];
  rows: number;
  cols: number;
  nodes: readonly Readonly<{
    id: string;
    kind: BoardScene["nodes"][number]["kind"];
    label: string;
    row: number | null;
    col: number | null;
    index: number | null;
    actionTargetId: string | null;
  }>[];
  actions: readonly ActionTarget[];
  accessibility: BoardScene["accessibility"];
  accessibilityRepresentation: SemanticAccessibilityRepresentation;
  summary: BoardScene["summary"];
  motion: Readonly<{
    beat: MotionBeat;
    progress: number;
    reducedMotion: boolean;
    qualityTier: MotionState["qualityTier"];
    lastActionTargetId: string | null;
    activeNodeId: string | null;
  }>;
  compatibility: Readonly<{
    sourceSchemaVersion: AdaptedReplayManifest["sourceSchemaVersion"] | null;
    adapterVersion: AdaptedReplayManifest["adapterVersion"] | null;
    hadCanonicalContractMetadata: boolean | null;
  }>;
}>;

export type SemanticAccessibilityRepresentation = Readonly<{
  nodes: BoardScene["accessibility"];
  /** Consumed by the Stage accessibility announcer alongside the node tree. */
  terminalSummary: string | null;
}>;

type Dimensions = Readonly<{ rows: number; cols: number }>;
type CellPatch = Readonly<{ index: number; label: string }>;

const FAMILY_REPRESENTATIVE = Object.freeze({
  grid_3x3: "tic-tac-toe",
  connect_four: "connect-four",
  square_board: "chess",
  go_board: "go",
  hex_board: "hex",
  card_table: "blackjack",
  dice_table: "liars-dice",
  auction_panel: "first-price-sealed-bid-auction",
  payoff_matrix: "prisoners-dilemma",
  control_benchmark: "taxi",
  economic_panel: "bargaining",
  custom: "mancala",
} as const satisfies Record<GameRendererFamily, string>);

const fixtureGameSlugSet = new Set<string>([
  ...MOBILE_ARENA_GAME_CAPABILITIES.map((capability) => capability.gameSlug),
  ...WATCH_REPLAY_COMPATIBILITY_GAME_SLUGS,
]);
const FIXTURE_GAME_SLUGS = Object.freeze(
  GAME_CATALOG
    .map((game) => game.slug)
    .filter((gameSlug) => fixtureGameSlugSet.has(gameSlug)),
);

const FIXTURE_GAMES = Object.freeze(FIXTURE_GAME_SLUGS.map((gameSlug) => {
  const game = GAME_CATALOG.find((candidate) => candidate.slug === gameSlug);
  if (!game) throw new TypeError(`Catalog entry missing for semantic fixture ${gameSlug}.`);
  return game;
}));

export const CANONICAL_SEMANTIC_SCENE_FIXTURES = Object.freeze(FIXTURE_GAMES.flatMap((game) => {
  const compatibility = GAME_COMPATIBILITY_MATRIX.find((entry) => entry.gameSlug === game.slug);
  if (!compatibility) throw new TypeError(`Compatibility entry missing for semantic fixture ${game.slug}.`);
  return compatibility.requiredStates.map((scenario) => buildFixture(game, scenario));
}));

export const FAMILY_SEMANTIC_REPRESENTATIVES = Object.freeze(RENDERER_FAMILIES.map((family) => {
  const gameSlug = FAMILY_REPRESENTATIVE[family];
  const arenaFixture = CANONICAL_SEMANTIC_SCENE_FIXTURES.find(
    (fixture) => fixture.gameSlug === gameSlug && fixture.scenario === "active_turn",
  );
  if (arenaFixture) return arenaFixture;
  const game = GAME_CATALOG.find((candidate) => candidate.slug === gameSlug);
  if (!game) throw new TypeError(`Catalog entry missing for family representative ${gameSlug}.`);
  return buildFixture(game, "active_turn");
}));

export const FAMILY_THEME_FIXTURES = Object.freeze(RENDERER_FAMILIES.flatMap((family) =>
  THEME_IDS.map((themeId): FamilyThemeFixture => {
    const gameSlug = FAMILY_REPRESENTATIVE[family];
    return Object.freeze({
      id: `${family}/${themeId}`,
      family,
      gameSlug,
      themeId,
      semanticFixtureId: `${gameSlug}/active_turn`,
    });
  })));

export function semanticSceneSnapshot(fixture: SemanticSceneFixture): SemanticSceneSnapshot {
  return Object.freeze({
    fixtureId: fixture.id,
    gameSlug: fixture.gameSlug,
    family: fixture.family,
    scenario: fixture.scenario,
    schemaVersion: fixture.scene.schemaVersion,
    rows: fixture.scene.rows,
    cols: fixture.scene.cols,
    nodes: fixture.scene.nodes.map((node) => Object.freeze({ ...node })),
    actions: fixture.scene.actionTargets.map((target) => Object.freeze({ ...target })),
    accessibility: fixture.scene.accessibility.map((node) => Object.freeze({ ...node })),
    accessibilityRepresentation: semanticAccessibilityRepresentation(fixture),
    summary: Object.freeze({
      ...fixture.scene.summary,
      scores: Object.freeze({ ...fixture.scene.summary.scores }),
    }),
    motion: Object.freeze({
      beat: fixture.motion.beat,
      progress: fixture.motion.progress,
      reducedMotion: fixture.motion.reducedMotion,
      qualityTier: fixture.motion.qualityTier,
      lastActionTargetId: fixture.motion.lastActionTargetId,
      activeNodeId: fixture.motion.activeNodeId,
    }),
    compatibility: Object.freeze({
      sourceSchemaVersion: fixture.legacyReplay?.sourceSchemaVersion ?? null,
      adapterVersion: fixture.legacyReplay?.adapterVersion ?? null,
      hadCanonicalContractMetadata: fixture.legacyReplay?.hadCanonicalContractMetadata ?? null,
    }),
  });
}

export function semanticAccessibilityRepresentation(
  fixture: SemanticSceneFixture,
): SemanticAccessibilityRepresentation {
  const terminalSummary = fixture.scene.summary.terminal
    ? `Game over. Scores: ${Object.entries(fixture.scene.summary.scores)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([seat, score]) => `${seat} ${score}`)
      .join(", ")}.`
    : null;
  return Object.freeze({ nodes: fixture.scene.accessibility, terminalSummary });
}

export function serializeSemanticSceneSnapshot(fixture: SemanticSceneFixture): string {
  return JSON.stringify(semanticSceneSnapshot(fixture));
}

export function semanticFixtureById(id: string): SemanticSceneFixture {
  const fixture = CANONICAL_SEMANTIC_SCENE_FIXTURES.find((candidate) => candidate.id === id)
    ?? FAMILY_SEMANTIC_REPRESENTATIVES.find((candidate) => candidate.id === id);
  if (!fixture) throw new RangeError(`Unknown semantic scene fixture: ${id}.`);
  return fixture;
}

function buildFixture(game: GameCatalogEntry, scenario: SemanticScenario): SemanticSceneFixture {
  const dimensions = dimensionsFor(game);
  const patches = patchesFor(game, scenario, dimensions);
  const actionIndex = actionIndexFor(scenario, dimensions);
  const actions = actionIndex === null ? [] : [actionFor(game, actionIndex, dimensions)];
  const frame = frameFor(game, scenario, dimensions, patches);
  const legacyReplay = scenario === "legacy_replay" ? legacyManifestFor(game) : null;
  const input = scenario === "legacy_replay" ? displayFrameAsLegacyRecord(frame) : frame;
  const scene = buildSceneEnvelope(
    input,
    { gameSlug: game.slug, rendererFamily: game.renderSpec.rendererFamily },
    actions,
  ).scene;
  assertBoardSceneSafe(scene);
  return Object.freeze({
    id: `${game.slug}/${scenario}`,
    gameSlug: game.slug,
    family: game.renderSpec.rendererFamily,
    scenario,
    scene,
    motion: motionFor(scenario, actionIndex),
    legacyReplay,
  });
}

function frameFor(
  game: GameCatalogEntry,
  scenario: SemanticScenario,
  dimensions: Dimensions,
  patches: readonly CellPatch[],
): DisplayFrameV1 {
  const patchByIndex = new Map(patches.map((patch) => [patch.index, patch.label]));
  const cells = Array.from({ length: dimensions.rows * dimensions.cols }, (_, index): DisplayCell => ({
    id: `cell-${index}`,
    kind: nodeKind(game.renderSpec.rendererFamily),
    row: Math.floor(index / dimensions.cols),
    col: index % dimensions.cols,
    index,
    key: null,
    label: patchByIndex.get(index) ?? emptyLabel(game),
  }));
  const terminal = scenario === "terminal_outcome" || scenario === "reveal";
  return {
    displayFrameVersion: DISPLAY_FRAME_VERSION,
    publicStateVersion: PUBLIC_STATE_VERSION,
    rendererVersion: RENDERER_VERSION,
    adapterVersion: RENDER_ADAPTER_VERSION,
    frameId: `${game.slug}:${scenario}`,
    sourceReplayEventId: scenario === "legacy_replay" ? `${game.slug}:legacy:event:4` : null,
    gameSlug: game.slug,
    rendererFamily: game.renderSpec.rendererFamily,
    actorPlayer: scenario === "initial" ? null : "player_1",
    actionLabel: scenario === "initial" ? null : actionLabelFor(game, scenario),
    cells,
    summary: {
      activePlayer: terminal ? null : scenario === "initial" ? "player_1" : "player_2",
      terminal,
      turn: scenario === "initial" ? 0 : terminal ? 9 : 4,
      scores: terminal ? { player_1: 1, player_2: 0 } : { player_1: 0, player_2: 0 },
    },
  };
}

function legacyManifestFor(game: GameCatalogEntry): AdaptedReplayManifest {
  const manifest = adaptReplayManifest({
    schemaVersion: LEGACY_ARENA_REPLAY_SCHEMA_VERSION,
    matchId: `semantic-fixture-${game.slug}`,
    rendererVersion: RENDERER_VERSION,
    events: { count: 5 },
    publicSafe: true,
    stateHashValid: true,
    createdAt: 1_700_000_000_000,
  });
  if (!manifest) throw new TypeError(`Legacy numeric replay fixture failed to adapt for ${game.slug}.`);
  if (manifest.contractVersions !== ARENA_REPLAY_CONTRACT_VERSIONS) {
    throw new TypeError(`Legacy replay fixture did not receive canonical contract metadata for ${game.slug}.`);
  }
  return manifest;
}

function dimensionsFor(game: GameCatalogEntry): Dimensions {
  if (game.renderSpec.boardSize) return game.renderSpec.boardSize;
  const bespoke: Readonly<Record<string, Dimensions>> = {
    mancala: { rows: 2, cols: 7 },
    "nine-mens-morris": { rows: 4, cols: 6 },
    pentago: { rows: 6, cols: 6 },
    backgammon: { rows: 2, cols: 12 },
    shogi: { rows: 9, cols: 9 },
    xiangqi: { rows: 10, cols: 9 },
  };
  const explicit = bespoke[game.slug];
  if (explicit) return explicit;
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return { rows: 2, cols: 3 };
    case "dice_table": return { rows: 1, cols: 5 };
    case "auction_panel": return { rows: 1, cols: 3 };
    case "payoff_matrix": return game.slug === "rock-paper-scissors" ? { rows: 3, cols: 3 } : { rows: 2, cols: 2 };
    case "economic_panel": return { rows: 2, cols: 2 };
    case "control_benchmark": return { rows: 2, cols: 2 };
    default: return { rows: 3, cols: 3 };
  }
}

function patchesFor(game: GameCatalogEntry, scenario: SemanticScenario, dimensions: Dimensions): readonly CellPatch[] {
  if (scenario === "initial") return initialPatches(game);
  if (scenario === "terminal_outcome") return terminalPatches(game, dimensions);
  if (scenario === "capture") return capturePatches(game, dimensions);
  if (scenario === "hidden_information") return hiddenInformationPatches(game);
  if (scenario === "reveal") return revealPatches(game, dimensions);
  return ordinaryPatches(game, scenario, dimensions);
}

function initialPatches(game: GameCatalogEntry): readonly CellPatch[] {
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return [{ index: 0, label: game.slug === "hanabi" ? "Your card faces away" : "Card back" }];
    case "dice_table": return [{ index: 0, label: "Five dice" }];
    case "auction_panel": return [{ index: 0, label: "Sealed bid" }];
    case "payoff_matrix": return [{ index: 0, label: "0, 0 neutral" }];
    case "economic_panel": return [{ index: 0, label: "Awaiting offer" }];
    default: return [];
  }
}

function ordinaryPatches(
  game: GameCatalogEntry,
  scenario: SemanticScenario,
  dimensions: Dimensions,
): readonly CellPatch[] {
  const activeIndex = centralIndex(dimensions);
  const lastIndex = Math.min(dimensions.rows * dimensions.cols - 1, activeIndex + 1);
  const index = scenario === "last_action" || scenario === "legacy_replay" ? lastIndex : activeIndex;
  switch (game.renderSpec.rendererFamily) {
    case "grid_3x3": return [{ index, label: "X" }, { index: Math.max(0, index - 1), label: "O" }];
    case "connect_four": return [{ index, label: "Red" }, { index: Math.max(0, index - dimensions.cols), label: "Yellow" }];
    case "square_board": return [{ index, label: boardPieceLabel(game, "first") }, { index: Math.max(0, index - 1), label: boardPieceLabel(game, "second") }];
    case "go_board": return [{ index, label: "Black" }, { index: Math.max(0, index - 1), label: "White" }];
    case "hex_board": return [{ index, label: "Black" }, { index: Math.max(0, index - dimensions.cols), label: "White" }];
    case "custom": return customOrdinaryPatches(game, index, dimensions);
    case "card_table": return cardOrdinaryPatches(game, index);
    case "dice_table": return [{ index: 0, label: "Bid 3 x 4" }, { index: 1, label: "Five dice" }];
    case "auction_panel": return [{ index: 0, label: "Lot A" }, { index: 1, label: "Sealed bid" }];
    case "payoff_matrix": return [{ index, label: game.slug === "rock-paper-scissors" ? "Rock" : "+3, +3 reward" }];
    case "economic_panel": return [{ index: 0, label: "Offer: split 6 / 4" }, { index: 1, label: "Awaiting response" }];
    case "control_benchmark": return [{ index: 0, label: "Score 12" }, { index: 1, label: "Frame 4" }];
  }
}

function terminalPatches(game: GameCatalogEntry, dimensions: Dimensions): readonly CellPatch[] {
  if (game.slug === "tic-tac-toe") return [0, 1, 2].map((index) => ({ index, label: "X" }));
  if (game.slug === "ultimate-tic-tac-toe") return Array.from({ length: 9 }, (_, index) => ({ index, label: "X" }));
  if (game.slug === "connect-four") {
    const start = (dimensions.rows - 1) * dimensions.cols;
    return [0, 1, 2, 3].map((offset) => ({ index: start + offset, label: "Red" }));
  }
  if (game.slug === "hex") return Array.from({ length: dimensions.rows }, (_, row) => ({
    index: row * dimensions.cols + Math.min(row, dimensions.cols - 1),
    label: "Black winning chain",
  }));
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return [{ index: 0, label: "Ace of hearts revealed" }, { index: 1, label: "King of clubs revealed" }];
    case "dice_table": return [{ index: 0, label: "Face 4" }, { index: 1, label: "Face 4" }, { index: 2, label: "Face 2" }];
    case "auction_panel": return [{ index: 0, label: "Winning bid 7" }, { index: 1, label: "Runner-up bid 5" }];
    case "payoff_matrix": return [{ index: 0, label: "+3 win" }, { index: 1, label: "-1 loss" }];
    case "economic_panel": return [{ index: 0, label: "Accepted offer: split 6 / 4" }, { index: 1, label: "Agreement reached" }];
    case "custom": return customTerminalPatches(game, dimensions);
    default: return ordinaryPatches(game, "last_action", dimensions);
  }
}

function capturePatches(game: GameCatalogEntry, dimensions: Dimensions): readonly CellPatch[] {
  const center = centralIndex(dimensions);
  switch (game.slug) {
    case "go": return [{ index: center, label: "Black" }, { index: center - 1, label: "White" }, { index: center + 1, label: "White" }];
    case "othello": return [{ index: center, label: "Black" }, { index: center - 1, label: "Black" }, { index: center + 1, label: "Black" }];
    case "chess": return [{ index: center, label: "White queen" }, { index: center + 1, label: "Black rook" }];
    case "checkers": return [{ index: center, label: "Black king" }, { index: center + dimensions.cols + 1, label: "White piece" }];
    case "shogi": return [{ index: center, label: "Black promoted pawn" }, { index: center + 1, label: "White silver" }];
    case "xiangqi": return [{ index: center, label: "Red cannon" }, { index: center + 1, label: "Black horse" }];
    case "mancala": return [{ index: center, label: "Pit count 4 sow" }, { index: dimensions.cols - 1, label: "Store count 9" }];
    case "nine-mens-morris": return [{ index: center, label: "Black mill" }, { index: center + 1, label: "Black mill" }, { index: center + 2, label: "Black mill" }];
    case "backgammon": return [{ index: center, label: "Black bar count 2" }, { index: center + 1, label: "White bear off count 3" }];
    default: return ordinaryPatches(game, "last_action", dimensions);
  }
}

function hiddenInformationPatches(game: GameCatalogEntry): readonly CellPatch[] {
  switch (game.slug) {
    case "battleship": return [{ index: 0, label: "Fog" }, { index: 1, label: "Fog" }];
    case "hanabi": return [{ index: 0, label: "Your card faces away" }, { index: 1, label: "Player 2 red three" }];
    case "liars-dice": return [{ index: 0, label: "Five dice" }, { index: 1, label: "Bid 3 x 4" }];
    case "first-price-sealed-bid-auction": return [{ index: 0, label: "Sealed bid" }, { index: 1, label: "Bid submitted" }];
    case "goofspiel": return [{ index: 0, label: "Prize 9" }, { index: 1, label: "Bid card back" }, { index: 2, label: "Bid card back" }];
    case "rock-paper-scissors":
    case "prisoners-dilemma": return [{ index: 0, label: "Player 1 committed" }, { index: 1, label: "Player 2 committed" }];
    case "bargaining": return [{ index: 0, label: "Split proposal concealed" }, { index: 1, label: "Response pending" }];
    case "negotiation": return [{ index: 0, label: "Price proposal concealed" }, { index: 1, label: "Delivery proposal concealed" }];
    default:
      return game.renderSpec.rendererFamily === "card_table"
        ? [{ index: 0, label: "Card back" }, { index: 1, label: "Card back" }]
        : [{ index: 0, label: "Public value unavailable until reveal" }];
  }
}

function revealPatches(game: GameCatalogEntry, dimensions: Dimensions): readonly CellPatch[] {
  const center = centralIndex(dimensions);
  switch (game.slug) {
    case "battleship": return [{ index: center, label: "Hit" }, { index: center + 1, label: "Miss" }, { index: center + 2, label: "Sunk" }];
    case "liars-dice": return [{ index: 0, label: "Face 4" }, { index: 1, label: "Face 4" }, { index: 2, label: "Face 2" }];
    case "first-price-sealed-bid-auction": return [{ index: 0, label: "Winning bid 7" }, { index: 1, label: "Runner-up bid 5" }];
    case "rock-paper-scissors": return [{ index: 0, label: "Rock revealed" }, { index: 1, label: "Scissors revealed" }];
    case "prisoners-dilemma": return [{ index: 0, label: "Cooperate revealed" }, { index: 1, label: "Defect revealed" }];
    case "bargaining": return [{ index: 0, label: "Accepted split revealed: 6 / 4" }, { index: 1, label: "Agreement revealed" }];
    case "negotiation": return [{ index: 0, label: "Agreed price revealed: 7" }, { index: 1, label: "Agreed delivery revealed: 3" }];
    case "goofspiel": return [{ index: 0, label: "Prize 9 revealed" }, { index: 1, label: "Player 1 bid revealed: 8" }, { index: 2, label: "Player 2 bid revealed: 5" }];
    case "hanabi": return [{ index: 0, label: "Your red two revealed" }, { index: 1, label: "Player 2 blue one revealed" }];
    default:
      return game.renderSpec.rendererFamily === "card_table"
        ? [{ index: 0, label: "Ace of hearts revealed" }, { index: 1, label: "King of clubs revealed" }]
        : ordinaryPatches(game, "last_action", dimensions);
  }
}

function customOrdinaryPatches(game: GameCatalogEntry, index: number, dimensions: Dimensions): readonly CellPatch[] {
  switch (game.slug) {
    case "mancala": return [{ index, label: "Pit count 4" }, { index: dimensions.cols - 1, label: "Store count 7" }];
    case "nine-mens-morris": return [{ index, label: "Black" }, { index: Math.max(0, index - 1), label: "White" }];
    case "pentago": return [{ index, label: "Black" }, { index: Math.max(0, index - 1), label: "White" }];
    case "backgammon": return [{ index, label: "Black point count 3" }, { index: Math.max(0, index - 1), label: "White point count 2" }];
    case "shogi": return [{ index, label: "Black pawn" }, { index: Math.max(0, index - 1), label: "White silver" }];
    case "xiangqi": return [{ index, label: "Red cannon" }, { index: Math.max(0, index - 1), label: "Black horse" }];
    default: return [{ index, label: "Black" }];
  }
}

function customTerminalPatches(game: GameCatalogEntry, dimensions: Dimensions): readonly CellPatch[] {
  const center = centralIndex(dimensions);
  switch (game.slug) {
    case "mancala": return [{ index: dimensions.cols - 1, label: "Store count 28 winner" }];
    case "nine-mens-morris": return [{ index: center, label: "Black winning mill" }];
    case "pentago": return [{ index: center, label: "Black winning line" }];
    case "backgammon": return [{ index: center, label: "Black bear off count 15 winner" }];
    case "shogi": return [{ index: center, label: "Black king winner" }];
    case "xiangqi": return [{ index: center, label: "Red general winner" }];
    default: return [{ index: center, label: "Winner" }];
  }
}

function cardOrdinaryPatches(game: GameCatalogEntry, index: number): readonly CellPatch[] {
  if (game.slug === "hanabi") return [{ index: 0, label: "Your card faces away" }, { index: 1, label: "Player 2 red three" }];
  if (game.slug === "blackjack") return [{ index: 0, label: "Dealer card back" }, { index: 3, label: "Player ace of hearts" }];
  if (game.slug === "goofspiel") return [{ index: 0, label: "Prize 7" }, { index: 1, label: "Bid card back" }];
  return [{ index, label: "Card back" }, { index: Math.max(0, index - 1), label: "Seven of clubs" }];
}

function boardPieceLabel(game: GameCatalogEntry, side: "first" | "second"): string {
  if (game.slug === "chess") return side === "first" ? "Black knight" : "White pawn";
  if (game.slug === "checkers") return side === "first" ? "Black piece" : "White piece";
  if (game.slug === "othello") return side === "first" ? "Black" : "White";
  if (game.slug === "battleship") return side === "first" ? "Hit" : "Fog";
  return side === "first" ? "Black" : "White";
}

function actionFor(game: GameCatalogEntry, index: number, dimensions: Dimensions): ActionTarget {
  const row = Math.floor(index / dimensions.cols) + 1;
  const col = index % dimensions.cols + 1;
  return Object.freeze({
    id: `cell-${index}`,
    action: `select:${index}`,
    label: `Select ${game.name}, row ${row}, column ${col}`,
    disabled: false,
  });
}

function actionIndexFor(scenario: SemanticScenario, dimensions: Dimensions): number | null {
  return scenario === "active_turn" || scenario === "reduced_motion" || scenario === "accessibility"
    ? centralIndex(dimensions)
    : null;
}

function motionFor(
  scenario: SemanticScenario,
  actionIndex: number | null,
): MotionState {
  const reducedMotion = scenario === "reduced_motion";
  const beat: MotionBeat = scenario === "terminal_outcome" ? "result"
    : scenario === "capture" ? "capture"
      : scenario === "reveal" ? "reveal"
        : scenario === "last_action" || reducedMotion ? "move"
        : "idle";
  return Object.freeze({
    progress: reducedMotion ? 0.17 : beat === "idle" ? 1 : 0.72,
    beat,
    reducedMotion,
    qualityTier: reducedMotion ? "constrained" : "high",
    viewport: Object.freeze({ width: 390, height: 480, pixelRatio: 3 }),
    lastActionTargetId: null,
    activeNodeId: actionIndex === null ? (beat === "idle" ? null : "cell-0") : `cell-${actionIndex}`,
  });
}

function actionLabelFor(game: GameCatalogEntry, scenario: SemanticScenario): string {
  if (scenario === "terminal_outcome") return `${game.name} completed`;
  if (scenario === "capture" || scenario === "reveal" || scenario === "hidden_information") {
    return `${game.name} public state updated`;
  }
  return `${game.name} action`;
}

function emptyLabel(game: GameCatalogEntry): string {
  if (game.slug === "battleship") return "Fog";
  if (game.renderSpec.rendererFamily === "card_table") return "Empty slot";
  if (game.renderSpec.rendererFamily === "dice_table") return "No public face";
  if (game.renderSpec.rendererFamily === "auction_panel") return "Awaiting public result";
  if (game.renderSpec.rendererFamily === "payoff_matrix") return "0, 0 neutral";
  if (game.renderSpec.rendererFamily === "economic_panel") return "Awaiting term";
  if (game.renderSpec.rendererFamily === "control_benchmark") return "No frame data";
  return "Empty";
}

function nodeKind(family: GameRendererFamily): DisplayCell["kind"] {
  if (family === "card_table") return "card";
  if (["dice_table", "auction_panel", "payoff_matrix", "economic_panel", "control_benchmark"].includes(family)) {
    return "status";
  }
  return "board";
}

function centralIndex(dimensions: Dimensions): number {
  const row = Math.floor(dimensions.rows / 2);
  const col = Math.floor(dimensions.cols / 2);
  return row * dimensions.cols + col;
}
