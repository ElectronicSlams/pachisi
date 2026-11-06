import { assertPublicReplaySafe, GAME_CATALOG } from "@eslams/core-types";
import {
  buildSceneEnvelope,
  displayFrameAsLegacyRecord,
  parseDisplayFrame,
  type PublicFrameAdapterContext,
} from "@eslams/game-render-contract";

export type ReplayRendererKind =
  | "grid"
  | "connect-four"
  | "tic-tac-toe"
  | "chess"
  | "stone-grid"
  | "disc-grid"
  | "checkers"
  | "hex-grid"
  | "ultimate-grid"
  | "mancala"
  | "morris"
  | "backgammon"
  | "battleship"
  | "card-table"
  | "dice-table"
  | "strategy-matrix"
  | "rl-grid"
  | "rl-track"
  | "rl-scene";

export type ReplayRendererConfig = {
  readonly gameSlug: string;
  readonly kind: ReplayRendererKind;
  readonly label: string;
  readonly rows: number;
  readonly cols: number;
};

export type PublicReplayEventView = {
  readonly id: string;
  readonly createdAt: number;
  readonly type: string;
  readonly player: string | null;
  readonly activePlayer: string | null;
  readonly action: string | null;
  readonly legalActions: string[];
  readonly reasoning: string | null;
  readonly terminal: boolean;
  readonly stateHash: string | null;
  readonly scores: Record<string, number>;
  readonly renderHints: {
    readonly renderer: string | null;
    readonly rows: number | null;
    readonly cols: number | null;
    readonly symbols: Record<string, string>;
  };
  readonly state: {
    readonly board: string[];
    readonly rows: number | null;
    readonly cols: number | null;
    readonly moveNumber: number | null;
    readonly backgammonCounts?: readonly string[];
  } | null;
};

export type PublicReplayFrame = {
  readonly index: number;
  readonly sourceIndex?: number;
  readonly moveNumber?: number | null;
  readonly id: string;
  readonly type: string;
  readonly player: string | null;
  readonly action: string | null;
  readonly legalActions: string[];
  readonly reasoning: string | null;
  readonly terminal: boolean;
  readonly stateHash: string | null;
  readonly scores: Record<string, number>;
  readonly board: string[] | null;
  readonly rows: number;
  readonly cols: number;
  readonly hasVisibleState: boolean;
  readonly backgammonCounts?: readonly string[];
};

export type PublicReplayTimeline = {
  readonly renderer: ReplayRendererConfig;
  readonly frames: PublicReplayFrame[];
  readonly hasPublicState: boolean;
};

const boardDimensionsBySlug: Record<string, readonly [rows: number, cols: number]> = {
  backgammon: [2, 12],
  battleship: [10, 10],
  checkers: [8, 8],
  chess: [8, 8],
  "connect-four": [6, 7],
  go: [9, 9],
  gomoku: [15, 15],
  hex: [11, 11],
  mancala: [2, 6],
  "nine-mens-morris": [7, 7],
  othello: [8, 8],
  pentago: [6, 6],
  shogi: [9, 9],
  "tic-tac-toe": [3, 3],
  "ultimate-tic-tac-toe": [9, 9],
  xiangqi: [10, 9],
};

export function replayRendererForGame(gameSlug: string, rendererHint?: string | null): ReplayRendererConfig {
  const game = GAME_CATALOG.find((entry) => entry.slug === gameSlug);
  const category = game?.category ?? "board";
  const [rows, cols] = boardDimensionsBySlug[gameSlug] ?? (category === "rl" ? [1, 12] : category === "gametheory" ? [2, 2] : category === "card" ? [1, 5] : [8, 8]);
  const hintedKind = rendererKindFromHint(rendererHint);
  if (hintedKind && hintedKind !== "grid") {
    return { gameSlug, kind: hintedKind, label: rendererLabel(hintedKind), rows, cols };
  }
  if (gameSlug === "tic-tac-toe") {
    return { gameSlug, kind: "tic-tac-toe", label: "Tic-Tac-Toe grid", rows, cols };
  }
  if (gameSlug === "connect-four") {
    return { gameSlug, kind: "connect-four", label: "Connect Four grid", rows, cols };
  }
  if (gameSlug === "chess") {
    return { gameSlug, kind: "chess", label: "Chess board", rows, cols };
  }
  if (["go", "gomoku"].includes(gameSlug)) {
    return { gameSlug, kind: "stone-grid", label: "Stone grid", rows, cols };
  }
  if (gameSlug === "othello") {
    return { gameSlug, kind: "disc-grid", label: "Disc grid", rows, cols };
  }
  if (gameSlug === "checkers") {
    return { gameSlug, kind: "checkers", label: "Checkers board", rows, cols };
  }
  if (gameSlug === "hex") {
    return { gameSlug, kind: "hex-grid", label: "Hex board", rows, cols };
  }
  if (gameSlug === "mancala") {
    return { gameSlug, kind: "mancala", label: "Mancala pits", rows, cols };
  }
  if (gameSlug === "nine-mens-morris") {
    return { gameSlug, kind: "morris", label: "Morris board", rows, cols };
  }
  if (gameSlug === "backgammon") {
    return { gameSlug, kind: "backgammon", label: "Backgammon points", rows, cols };
  }
  if (gameSlug === "ultimate-tic-tac-toe") {
    return { gameSlug, kind: "ultimate-grid", label: "Ultimate Tic-Tac-Toe grid", rows, cols };
  }
  if (gameSlug === "battleship") {
    return { gameSlug, kind: "battleship", label: "Battleship grid", rows, cols };
  }
  if (["liars-dice", "goofspiel"].includes(gameSlug)) {
    return { gameSlug, kind: "dice-table", label: "Dice and bid table", rows, cols };
  }
  if (category === "card") {
    return { gameSlug, kind: "card-table", label: "Card table", rows, cols };
  }
  if (category === "gametheory") {
    return { gameSlug, kind: "strategy-matrix", label: "Strategy matrix", rows, cols };
  }
  if (category === "rl") {
    const gridWorlds = new Set(["taxi", "frozen-lake", "cliff-walking"]);
    const sceneWorlds = new Set(["lunar-lander", "car-racing", "bipedal-walker", "boxing-style-arena", "paddle-ball", "alien-shooter", "ice-hockey-style-arena"]);
    return {
      gameSlug,
      kind: sceneWorlds.has(gameSlug) ? "rl-scene" : gridWorlds.has(gameSlug) ? "rl-grid" : "rl-track",
      label: sceneWorlds.has(gameSlug) ? "Arcade scene" : gridWorlds.has(gameSlug) ? "Arcade grid" : "Arcade track",
      rows,
      cols
    };
  }
  return { gameSlug, kind: "grid", label: "Board grid", rows, cols };
}

export function replayRendererCoverage(): string[] {
  return GAME_CATALOG.map((game) => replayRendererForGame(game.slug).gameSlug);
}

export function emptyReplayFrameForGame(gameSlug: string): PublicReplayFrame {
  const renderer = replayRendererForGame(gameSlug);
  return {
    index: 0,
    sourceIndex: -1,
    moveNumber: 0,
    id: `${gameSlug}:empty`,
    type: "replay.placeholder",
    player: null,
    action: null,
    legalActions: [],
    reasoning: null,
    terminal: false,
    stateHash: null,
    scores: {},
    board: Array.from({ length: renderer.rows * renderer.cols }, () => ""),
    rows: renderer.rows,
    cols: renderer.cols,
    hasVisibleState: false,
  };
}

export function parsePublicReplayEventsText(text: string): PublicReplayEventView[] {
  return text
    .split("\n")
    .flatMap((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return [];
      }
      return [parsePublicReplayEventRow(JSON.parse(trimmed) as unknown, index)];
    });
}

type PublicReplayEventAdapterContext = PublicFrameAdapterContext & {
  readonly invalidDisplayFrame?: "reject" | "use-public-state";
};

export function parsePublicReplayEventRow(
  row: unknown,
  index = 0,
  context: PublicReplayEventAdapterContext = {},
): PublicReplayEventView {
  assertPublicReplaySafe(row);
  const record = recordValue(row) ?? {};
  const nestedEvent = recordValue(record.event);
  const event = hasPublicReplayState(record) ? mergeReplayEnvelope(record, nestedEvent) : nestedEvent ?? record;
  const displayFrame = displayFrameFromEvent(event, context);
  const state = publicStateFromEvent(event);
  const renderHints = renderHintsFromEvent(event, displayFrame);
  const board = boardFromDisplayFrame(displayFrame, renderHints) ?? boardFromState(state, renderHints);
  const dimensions = displayFrameDimensions(displayFrame, board, renderHints) ?? stateDimensions(state, board, renderHints);
  const createdAt = numberValue(record.createdAt) ?? numberValue(event.createdAt) ?? numberValue(event.timestampMs) ?? 0;
  const displaySummary = recordValue(displayFrame?.summary);
  const turn = numberValue(event.turn_id) ?? numberValue(event.turn) ?? numberValue(displaySummary?.turn) ?? numberValue(state?.moveNumber);

  return {
    id: stringValue(record.id)
      ?? stringValue(event.event_id)
      ?? stringValue(displayFrame?.frame_id)
      ?? stringValue(displayFrame?.source_replay_event_id)
      ?? `event_${index}`,
    createdAt,
    type: stringValue(event.event_type) ?? stringValue(event.type) ?? (turn === 0 ? "match.started" : "state.updated"),
    player: playerLabel(event.player ?? event.actor_player ?? displayFrame?.actor_player ?? event.seat),
    activePlayer: playerLabel(event.active_player ?? displaySummary?.active_player),
    action: actionLabel(eventActionValue(event) ?? displayFrame?.action_label),
    legalActions: legalActionLabels(event),
    reasoning: reasoningLabel(event),
    terminal: event.terminal === true || displaySummary?.terminal === true,
    stateHash: stringValue(event.state_hash) ?? stringValue(event.stateHash),
    scores: numericRecord(event.scores ?? displaySummary?.scores),
    renderHints,
    state: board
      ? {
          board,
          rows: dimensions.rows,
          cols: dimensions.cols,
          moveNumber: turn,
          ...(state && ("bar" in state || "borne_off" in state || "borneOff" in state) ? {backgammonCounts: publicBackgammonCounts(state)} : {}),
        }
      : null
  };
}

export function buildPublicReplayTimeline(gameSlug: string, events: readonly PublicReplayEventView[]): PublicReplayTimeline {
  const firstRendererHint = events.find((event) => event.renderHints.renderer)?.renderHints.renderer ?? null;
  const renderer = replayRendererForGame(gameSlug, firstRendererHint);
  const frames = events.map((event, index) => {
    const board = event.state?.board ? normalizeReplayBoard(event.state.board, gameSlug) : null;
    const dimensions = replayFrameDimensions(renderer, event.state?.rows ?? null, event.state?.cols ?? null, board);
    return {
      index,
      sourceIndex: index,
      moveNumber: event.state?.moveNumber ?? null,
      ...(event.state?.backgammonCounts ? {backgammonCounts:event.state.backgammonCounts} : {}),
      id: event.id,
      type: event.type,
      player: actorPlayerForFrame(gameSlug, event),
      action: event.action,
      legalActions: event.legalActions,
      reasoning: event.reasoning,
      terminal: event.terminal,
      stateHash: event.stateHash,
      scores: event.scores,
      board,
      rows: dimensions.rows,
      cols: dimensions.cols,
      hasVisibleState: Boolean(board?.some((cell) => cell.trim().length > 0 && cell !== ".")),
    };
  });
  return {
    renderer,
    frames,
    hasPublicState: frames.some((frame) => frame.board && frame.board.length > 0),
  };
}

function replayFrameDimensions(
  renderer: ReplayRendererConfig,
  rows: number | null,
  cols: number | null,
  board: readonly string[] | null,
): { rows: number; cols: number } {
  if (board && board.length === renderer.rows * renderer.cols) {
    return { rows: renderer.rows, cols: renderer.cols };
  }
  if (renderer.kind === "mancala" && rows && cols) {
    return { rows, cols };
  }
  if (rows && cols && (!board || rows * cols >= board.length)) {
    return { rows, cols };
  }
  if (board && board.length > 0) {
    const width = Math.ceil(Math.sqrt(board.length));
    return { rows: Math.ceil(board.length / width), cols: width };
  }
  return { rows: renderer.rows, cols: renderer.cols };
}

export function normalizeReplayBoard(board: readonly string[], gameSlug: string): string[] {
  if (gameSlug !== "connect-four") {
    return board.map((cell) => cell ?? "");
  }
  return board.map((cell) => cell === "X" ? "R" : cell === "O" ? "Y" : cell ?? "");
}

function publicStateFromEvent(event: Record<string, unknown>): Record<string, unknown> | null {
  return (
    recordValue(event.public_state)
    ?? recordValue(event.publicState)
    ?? recordValue(event.public_observation)
    ?? recordValue(event.publicObservation)
  );
}

function hasPublicReplayState(record: Record<string, unknown>): boolean {
  return Boolean(
    recordValue(record.public_state)
    ?? recordValue(record.publicState)
    ?? recordValue(record.public_observation)
    ?? recordValue(record.publicObservation)
  );
}

function mergeReplayEnvelope(record: Record<string, unknown>, nestedEvent: Record<string, unknown> | null): Record<string, unknown> {
  if (!nestedEvent) {
    return record;
  }
  const merged = { ...nestedEvent };
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined) {
      merged[key] = value;
    } else if (!(key in merged)) {
      merged[key] = value;
    }
  }
  return merged;
}

function displayFrameFromEvent(
  event: Record<string, unknown>,
  context: PublicReplayEventAdapterContext,
): Record<string, unknown> | null {
  const nested = recordValue(event.display_frame) ?? recordValue(event.displayFrame);
  if (nested) {
    return sharedDisplayFrameRecord(nested, context);
  }
  if (stringValue(event.schema_version) === "eslams.replay.display_frame.v1" && Array.isArray(event.display_cells)) {
    return sharedDisplayFrameRecord(event, context);
  }
  return null;
}

function sharedDisplayFrameRecord(
  value: unknown,
  context: PublicReplayEventAdapterContext,
): Record<string, unknown> | null {
  const frame = parseDisplayFrame(value, context);
  if (!frame) {
    if (context.invalidDisplayFrame === "use-public-state") return null;
    throw new TypeError("Public display frame does not satisfy the shared render contract.");
  }
  // Require every web display frame to produce the same safe semantic scene
  // consumed by native renderers before preserving the established web pixels.
  try {
    buildSceneEnvelope(frame, { gameSlug: frame.gameSlug, rendererFamily: frame.rendererFamily });
  } catch (error) {
    if (context.invalidDisplayFrame === "use-public-state") return null;
    throw error;
  }
  return { ...displayFrameAsLegacyRecord(frame) };
}

function renderHintsFromEvent(
  event: Record<string, unknown>,
  displayFrame?: Record<string, unknown> | null
): PublicReplayEventView["renderHints"] {
  const hints = recordValue(event.render_hints) ?? recordValue(event.renderHints) ?? {};
  return {
    renderer: stringValue(hints.renderer) ?? stringValue(displayFrame?.renderer_family),
    rows: numberValue(hints.rows) ?? numberValue(hints.height),
    cols: numberValue(hints.cols) ?? numberValue(hints.width),
    symbols: stringRecord(hints.symbols),
  };
}

function boardFromDisplayFrame(
  displayFrame: Record<string, unknown> | null,
  renderHints: PublicReplayEventView["renderHints"]
): string[] | null {
  if (!displayFrame) {
    return null;
  }
  const cells = arrayValue(displayFrame.display_cells);
  if (!cells || cells.length === 0) {
    return null;
  }
  const fenCell = cells
    .map((cell) => recordValue(cell))
    .find((cell) => stringValue(cell?.key) === "fen");
  const fen = stringValue(fenCell?.value);
  if (fen) {
    return boardFromFen(fen, renderHints.symbols);
  }

  const positioned = displayFramePositionedCells(cells, renderHints);
  if (!positioned) {
    return null;
  }
  const board = Array.from({ length: positioned.rows * positioned.cols }, () => "");
  for (const cell of positioned.cells) {
    const label = displayCellLabel(cell.value, renderHints.symbols);
    board[cell.index] = label;
  }
  return board;
}

function displayFrameDimensions(
  displayFrame: Record<string, unknown> | null,
  board: readonly string[] | null,
  renderHints: PublicReplayEventView["renderHints"]
): { rows: number | null; cols: number | null } | null {
  if (!displayFrame) {
    return null;
  }
  const cells = arrayValue(displayFrame.display_cells);
  const positioned = cells ? displayFramePositionedCells(cells, renderHints) : null;
  if (positioned) {
    return { rows: positioned.rows, cols: positioned.cols };
  }
  if (board && board.length > 0 && renderHints.rows && renderHints.cols) {
    return { rows: renderHints.rows, cols: renderHints.cols };
  }
  return null;
}

function displayFramePositionedCells(cells: readonly unknown[], renderHints?: PublicReplayEventView["renderHints"]): { rows: number; cols: number; cells: { index: number; value: unknown }[] } | null {
  const rowColCells: { row: number; col: number; value: unknown }[] = [];
  const indexedCells: { index: number; value: unknown }[] = [];
  for (const entry of cells) {
    const cell = recordValue(entry);
    if (!cell) {
      continue;
    }
    const kind = stringValue(cell.kind);
    if (kind && !["board", "grid", "cells", "card", "status"].includes(kind)) {
      continue;
    }
    const row = numberValue(cell.row);
    const col = numberValue(cell.col);
    if (row !== null && col !== null && row >= 0 && col >= 0) {
      rowColCells.push({ row, col, value: cell.value });
      continue;
    }
    const index = numberValue(cell.index);
    if (index !== null && index >= 0) {
      indexedCells.push({ index, value: cell.value });
    }
  }
  if (rowColCells.length > 0) {
    const rows = Math.max(renderHints?.rows ?? 0, Math.max(...rowColCells.map((cell) => cell.row)) + 1);
    const cols = Math.max(renderHints?.cols ?? 0, Math.max(...rowColCells.map((cell) => cell.col)) + 1);
    return {
      rows,
      cols,
      cells: rowColCells.map((cell) => ({ index: cell.row * cols + cell.col, value: cell.value })),
    };
  }
  if (indexedCells.length > 0) {
    const length = Math.max(...indexedCells.map((cell) => cell.index)) + 1;
    const hintedRows = renderHints?.rows ?? null;
    const hintedCols = renderHints?.cols ?? null;
    const width = hintedRows && hintedCols && hintedRows * hintedCols >= length ? hintedCols : Math.ceil(Math.sqrt(length));
    return {
      rows: hintedRows && hintedCols && hintedRows * hintedCols >= length ? hintedRows : Math.ceil(length / width),
      cols: width,
      cells: indexedCells,
    };
  }
  return null;
}

function displayCellLabel(value: unknown, symbols: Record<string, string>): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const raw = cellLabel(value);
  return symbols[raw] ?? raw;
}

function boardFromState(state: Record<string, unknown> | null, renderHints: PublicReplayEventView["renderHints"]): string[] | null {
  if (!state) {
    return null;
  }
  const symbols = renderHints.symbols;
  const fen = stringValue(state.fen);
  if (fen) {
    return boardFromFen(fen, symbols);
  }

  const gridWorld = gridWorldBoardFromState(state, renderHints);
  if (gridWorld) {
    return publicCells(gridWorld, symbols);
  }

  const source =
    nonEmptyArrayValue(state.board)
    ?? nonEmptyArrayValue(state.boards)
    ?? nonEmptyArrayValue(state.grid)
    ?? nonEmptyArrayValue(state.cells)
    ?? nonEmptyArrayValue(state.table)
    ?? nonEmptyArrayValue(state.cards)
    ?? nonEmptyArrayValue(state.hand)
    ?? nonEmptyArrayValue(state.publicCards)
    ?? nonEmptyArrayValue(state.public_cards)
    ?? nonEmptyArrayValue(state.payoffMatrix)
    ?? nonEmptyArrayValue(state.payoff_matrix)
    ?? nonEmptyArrayValue(state.matrix)
    ?? nonEmptyArrayValue(state.observation)
    ?? nonEmptyArrayValue(state.track)
    ?? nonEmptyArrayValue(state.path);

  if (!source) {
    const derived = derivedBoardFromState(state, renderHints);
    return derived ? publicCells(derived, symbols) : null;
  }
  return publicCells(source, symbols);
}

function publicCells(source: readonly unknown[], symbols: Record<string, string>): string[] {
  return flattenBoard(source).map((cell) => {
    if (cell === null || cell === undefined || cell === "") {
      return "";
    }
    const raw = cellLabel(cell);
    return symbols[raw] ?? raw;
  });
}

function stateDimensions(
  state: Record<string, unknown> | null,
  board: readonly string[] | null,
  renderHints?: PublicReplayEventView["renderHints"]
): { rows: number | null; cols: number | null } {
  if (!state) {
    return { rows: renderHints?.rows ?? null, cols: renderHints?.cols ?? null };
  }
  const rows = numberValue(state.rows) ?? renderHints?.rows ?? null;
  const cols = numberValue(state.cols) ?? renderHints?.cols ?? null;
  if (rows && cols) {
    return { rows, cols };
  }
  const gridSize = numberValue(state.grid_size) ?? numberValue(state.gridSize);
  if (gridSize) {
    return { rows: gridSize, cols: gridSize };
  }
  const source =
    arrayValue(state.board)
    ?? arrayValue(state.grid)
    ?? arrayValue(state.cells)
    ?? arrayValue(state.boards)
    ?? arrayValue(state.observation);
  const inferred = matrixDimensions(source);
  if (inferred.rows && inferred.cols) {
    return inferred;
  }
  const pitsPerSide = numberValue(state.pits_per_side) ?? numberValue(state.pitsPerSide);
  if (pitsPerSide) {
    return { rows: 2, cols: pitsPerSide };
  }
  if (board && board.length > 0) {
    if (renderHints?.rows && renderHints.cols && renderHints.rows * renderHints.cols === board.length) {
      return { rows: renderHints.rows, cols: renderHints.cols };
    }
    const width = Math.ceil(Math.sqrt(board.length));
    return { rows: Math.ceil(board.length / width), cols: width };
  }
  return { rows: null, cols: null };
}

function matrixDimensions(value: readonly unknown[] | null): { rows: number | null; cols: number | null } {
  if (!value || value.length === 0) {
    return { rows: null, cols: null };
  }
  const first = value[0];
  if (Array.isArray(first)) {
    return { rows: value.length, cols: first.length || null };
  }
  return { rows: 1, cols: value.length };
}

function derivedBoardFromState(state: Record<string, unknown>, renderHints: PublicReplayEventView["renderHints"]): readonly unknown[] | null {
  // Round/prize metrics alone must not route a revealed strategy round through
  // the card adapter, which would discard the published choices or bids.
  if (/(matrix|negotiation|auction)/iu.test(renderHints.renderer ?? "")
    && (recordValue(state.revealed_actions) || recordValue(state.revealed_bids) || recordValue(state.revealedBids))) {
    return strategyTableFromState(state);
  }
  return (
    mancalaBoardFromState(state)
    ?? battleshipBoardFromState(state)
    ?? cardTableFromState(state)
    ?? strategyTableFromState(state)
    ?? rlSceneBoardFromState(state, renderHints)
    ?? trackBoardFromState(state)
  );
}

function mancalaBoardFromState(state: Record<string, unknown>): readonly unknown[] | null {
  const pits = arrayValue(state.pits);
  const stores = recordValue(state.stores);
  if (!pits && !stores) {
    return null;
  }
  const leftStore = stores ? stores.player_1 ?? stores.a ?? stores.left ?? "" : "";
  const rightStore = stores ? stores.player_2 ?? stores.b ?? stores.right ?? "" : "";
  return [leftStore, ...(pits ?? []), rightStore];
}

function battleshipBoardFromState(state: Record<string, unknown>): readonly unknown[] | null {
  const gridSize = numberValue(state.grid_size) ?? numberValue(state.gridSize);
  if (!gridSize) {
    return null;
  }
  const cells = Array.from({ length: gridSize * gridSize }, () => "");
  markBattleshipShots(cells, gridSize, state.shots);
  markCoordinateList(cells, gridSize, state.misses, "miss");
  markCoordinateList(cells, gridSize, state.hits, "hit");
  return cells;
}

function cardTableFromState(state: Record<string, unknown>): readonly unknown[] | null {
  const values: unknown[] = [];
  appendScalarMetric(values, "prize", state.current_prize);
  appendScalarMetric(values, "round", state.round);
  appendCardValues(values, state.dealer_upcard);
  appendCardValues(values, state.upcard);
  appendCardValues(values, state.starter);
  appendCardValues(values, state.discard_top);
  appendCardValues(values, state.discard);
  appendCardValues(values, state.dealer_hand);
  appendCardValues(values, state.player_hand);
  appendCardValues(values, state.current_trick);
  appendCardValues(values, state.board);
  appendCardValues(values, state.last_play);
  appendCardValues(values, state.discard_pile);
  appendCardValues(values, state.fireworks);
  appendCardValues(values, state.revealed_dice);
  appendActionValues(values, state.bid_history);
  appendActionValues(values, state.round_history);
  appendActionValues(values, state.current_bid);
  appendCountValues(values, state.hand_counts, "hand");
  appendCountValues(values, state.stacks, "stack");
  appendCountValues(values, state.committed, "bet");
  appendCountValues(values, state.points, "points");
  appendCountValues(values, state.tricks, "tricks");
  appendScalarMetric(values, "street", state.street);
  appendScalarMetric(values, "wall", state.wall_count);
  appendScalarMetric(values, "landlord", state.landlord);
  appendScalarMetric(values, "declarer", state.declarer);
  appendScalarMetric(values, "last", state.last_owner);
  appendScalarMetric(values, "passes", Array.isArray(state.passes) ? state.passes.length : state.passes);
  appendActionValues(values, state.contract);
  if (typeof state.pot === "number") {
    values.push(`pot ${state.pot}`);
  }
  return values.length > 0 ? values : null;
}

function strategyTableFromState(state: Record<string, unknown>): readonly unknown[] | null {
  const values: unknown[] = [];
  appendActionValues(values, state.revealed_actions);
  appendCountValues(values, state.revealed_bids, "bid");
  appendCountValues(values, state.revealedBids, "bid");
  appendActionValues(values, state.last_offer);
  appendActionValues(values, state.current_bid);
  appendActionValues(values, state.bid_history);
  appendActionValues(values, state.round_history);
  appendActionValues(values, state.transcript);
  appendActionValues(values, state.points);
  appendActionValues(values, state.item);
  appendScalarMetric(values, "round", state.round);
  appendScalarMetric(values, "prize", state.current_prize);
  return values.length > 0 ? values : null;
}

function gridWorldBoardFromState(state: Record<string, unknown>, renderHints: PublicReplayEventView["renderHints"]): readonly unknown[] | null {
  const rows = numberValue(state.rows) ?? renderHints.rows;
  const cols = numberValue(state.cols) ?? renderHints.cols;
  const grid = arrayValue(state.grid);
  const gridDimensions = matrixDimensions(grid);
  const rowCount = rows ?? gridDimensions.rows;
  const colCount = cols ?? gridDimensions.cols;
  const position = state.taxi ?? state.position;
  if (!rowCount || !colCount || position === undefined) {
    return null;
  }
  const cells = grid ? publicCells(grid, {}) : Array.from({ length: rowCount * colCount }, () => "");
  setGridToken(cells, rowCount, colCount, state.goal, "goal");
  setGridToken(cells, rowCount, colCount, state.destination, "goal");
  setGridToken(cells, rowCount, colCount, state.passenger, "passenger");
  setGridToken(cells, rowCount, colCount, state.start, "start");
  markCoordinateList(cells, colCount, state.cliff, "cliff");
  markCoordinateList(cells, colCount, state.holes, "hole");
  markCoordinateList(cells, colCount, state.obstacles, "wall");
  setGridToken(cells, rowCount, colCount, position, "agent");
  return cells;
}

function rlSceneBoardFromState(state: Record<string, unknown>, renderHints: PublicReplayEventView["renderHints"]): readonly unknown[] | null {
  const renderer = renderHints.renderer ?? "";
  if (!/(lander|racing|walker|boxing|hockey|paddle|alien)/iu.test(renderer)) {
    return null;
  }
  const values: unknown[] = [];
  const lander = recordValue(state.lander);
  const car = recordValue(state.car);
  const cart = recordValue(state.cart);
  const player = recordValue(state.player);
  const puck = recordValue(state.puck);
  const ball = recordValue(state.ball);
  const opponent = recordValue(state.opponent);
  appendSceneMetric(values, "x", lander?.x ?? car?.progress ?? cart?.x ?? player?.x ?? state.player_x ?? state.paddle_x ?? state.position);
  appendSceneMetric(values, "y", lander?.y ?? player?.y ?? state.player_y ?? state.altitude);
  appendSceneMetric(values, "speed", car?.speed ?? state.speed ?? state.velocity);
  appendSceneMetric(values, "angle", lander?.angle ?? cart?.angle ?? state.angle);
  appendSceneMetric(values, "ball_x", ball?.x ?? state.ball_x);
  appendSceneMetric(values, "ball_y", ball?.y ?? state.ball_y);
  appendSceneMetric(values, "puck_x", puck?.x ?? state.puck_x);
  appendSceneMetric(values, "puck_y", puck?.y ?? state.puck_y);
  appendSceneMetric(values, "opponent_x", opponent?.x ?? state.opponent_x);
  appendSceneMetric(values, "opponent_y", opponent?.y ?? state.opponent_y);
  appendSceneMetric(values, "fuel", state.fuel);
  appendSceneMetric(values, "reward", state.reward);
  appendSceneMetric(values, "score", state.score);
  appendSceneMetric(values, "lives", state.lives);
  appendSceneCoordinates(values, "alien", state.aliens ?? state.enemies);
  appendSceneCoordinates(values, "bullet", state.bullets ?? state.shots ?? state.projectiles);
  appendSceneCoordinates(values, "goal", state.goal ?? state.target);
  appendActionValues(values, state.history);
  return values.length > 0 ? values.slice(-20) : null;
}

function trackBoardFromState(state: Record<string, unknown>): readonly unknown[] | null {
  const fields = [
    state.cart,
    state.position,
    state.lander,
    state.car,
    state.walker,
    state.paddle_x,
    state.player_x,
    state.distance,
    state.puck_owner,
  ];
  if (!fields.some((field) => field !== undefined)) {
    return null;
  }
  const cells = Array.from({ length: 12 }, () => ".");
  const agentIndex = trackIndex(fields.find((field) => field !== undefined));
  cells[agentIndex] = "agent";
  cells[11] = "goal";
  return cells;
}

function appendCardValues(target: unknown[], value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendCardValues(target, item);
    }
    return;
  }
  const record = recordValue(value);
  if (record) {
    for (const key of ["card", "tile"]) {
      if (typeof record[key] === "string" && record[key]) {
        appendCardValues(target, record[key]);
        return;
      }
    }
    for (const key of ["cards", "hand", "played", "discard", "tiles"]) {
      if (Array.isArray(record[key])) {
        appendCardValues(target, record[key]);
        return;
      }
    }
    const entries = visibleRecordEntries(record);
    if (entries.length > 0) {
      target.push(...entries);
      return;
    }
  }
  appendVisibleLabel(target, cellLabel(value));
}

function appendActionValues(target: unknown[], value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendActionValues(target, item);
    }
    return;
  }
  const record = recordValue(value);
  if (record) {
    const label = stringValue(record.action) ?? stringValue(record.offer) ?? stringValue(record.bid) ?? stringValue(record.choice);
    if (label) {
      target.push(label);
      return;
    }
    const count = numberLike(record.count);
    const face = numberLike(record.face);
    if (count !== null && face !== null) {
      const player = stringValue(record.player);
      target.push(`${player ? `${player} ` : ""}${count}x${face}`);
      return;
    }
    const bids = recordValue(record.bids);
    if (bids) {
      appendScalarMetric(target, "prize", record.prize);
      target.push(...visibleRecordEntries(bids, "bid"));
      const winner = stringValue(record.winner);
      if (winner) {
        target.push(`winner ${winner}`);
      } else if ("winner" in record) {
        target.push("draw");
      }
      return;
    }
    const entries = visibleRecordEntries(record);
    if (entries.length > 0) {
      target.push(...entries);
      return;
    }
  }
  appendVisibleLabel(target, cellLabel(value));
}

function appendSceneMetric(target: unknown[], label: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value === "number") {
    target.push(`${label} ${value.toFixed(2)}`);
    return;
  }
  if (typeof value === "string") {
    target.push(`${label} ${value}`);
  }
}

function appendSceneCoordinates(target: unknown[], label: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (Array.isArray(value)) {
    if (value.length >= 2 && !Array.isArray(value[0]) && !recordValue(value[0])) {
      const coord = coordinateText(value);
      if (coord) target.push(`${label} ${coord}`);
      return;
    }
    for (const item of value) {
      appendSceneCoordinates(target, label, item);
    }
    return;
  }
  const record = recordValue(value);
  if (record) {
    const coord = coordinateText(record);
    if (coord) {
      target.push(`${label} ${coord}`);
    }
  }
}

function coordinateText(value: unknown): string | null {
  if (Array.isArray(value) && value.length >= 2) {
    const x = numberLike(value[0]);
    const y = numberLike(value[1]);
    return x !== null && y !== null ? `${x},${y}` : null;
  }
  const record = recordValue(value);
  if (!record) return null;
  const x = numberLike(record.x ?? record.col ?? record.c);
  const y = numberLike(record.y ?? record.row ?? record.r);
  return x !== null && y !== null ? `${x},${y}` : null;
}

function appendScalarMetric(target: unknown[], label: string, value: unknown): void {
  if (value === undefined || value === null || value === "") {
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    target.push(`${label} ${Number.isInteger(value) ? value : value.toFixed(2)}`);
    return;
  }
  if (typeof value === "string") {
    target.push(`${label} ${value}`);
  }
}

function appendCountValues(target: unknown[], value: unknown, label: string): void {
  const record = recordValue(value);
  if (!record) {
    return;
  }
  for (const [key, count] of Object.entries(record)) {
    if (typeof count === "number" || typeof count === "string") {
      target.push(`${key} ${label} ${count}`);
    }
  }
}

function visibleRecordEntries(record: Record<string, unknown>, label?: string): string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      values.push(`${key}${label ? ` ${label}` : ""} ${value}`);
      continue;
    }
    if (Array.isArray(value)) {
      const children: string[] = [];
      for (const item of value) {
        const childLabel = cellLabel(item);
        if (childLabel.trim().length > 0) {
          children.push(childLabel);
        }
      }
      if (children.length > 0) {
        values.push(`${key}${label ? ` ${label}` : ""} ${children.join(" ")}`);
      }
      continue;
    }
    const child = recordValue(value);
    if (child) {
      const childLabel = cellLabel(child);
      if (childLabel) {
        values.push(`${key}${label ? ` ${label}` : ""} ${childLabel}`);
      }
    }
  }
  return values;
}

function appendVisibleLabel(target: unknown[], label: string): void {
  const normalized = label.trim();
  if (normalized) {
    target.push(normalized);
  }
}

function setGridToken(cells: string[], rows: number, cols: number, value: unknown, token: string): void {
  const index = gridIndex(value, rows, cols);
  if (index !== null && index >= 0 && index < cells.length) {
    cells[index] = token;
  }
}

function markCoordinateList(cells: string[], cols: number, value: unknown, token: string): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const item of value) {
    const index = coordinateIndex(item, cols);
    if (index !== null && index >= 0 && index < cells.length) {
      cells[index] = token;
    }
  }
}

function markBattleshipShots(cells: string[], cols: number, value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      markBattleshipShot(cells, cols, item);
    }
    return;
  }
  const record = recordValue(value);
  if (!record) {
    return;
  }
  for (const shots of Object.values(record)) {
    if (Array.isArray(shots)) {
      for (const shot of shots) {
        markBattleshipShot(cells, cols, shot);
      }
    }
  }
}

function markBattleshipShot(cells: string[], cols: number, value: unknown): void {
  const record = recordValue(value);
  const coordinate = record ? record.cell ?? record.coordinate ?? record.coord ?? value : value;
  const index = coordinateIndex(coordinate, cols);
  if (index !== null && index >= 0 && index < cells.length) {
    cells[index] = record?.hit === true ? "hit" : "miss";
  }
}

function gridIndex(value: unknown, rows: number, cols: number): number | null {
  const direct = coordinateIndex(value, cols);
  if (direct !== null) {
    return direct;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const index = Math.floor(value);
    return index >= 0 && index < rows * cols ? index : null;
  }
  return null;
}

function coordinateIndex(value: unknown, cols: number): number | null {
  if (Array.isArray(value) && value.length >= 2) {
    const row = numberLike(value[0]);
    const col = numberLike(value[1]);
    return row !== null && col !== null ? row * cols + col : null;
  }
  const record = recordValue(value);
  if (record) {
    const row = numberLike(record.row ?? record.r ?? record.y);
    const col = numberLike(record.col ?? record.c ?? record.x);
    return row !== null && col !== null ? row * cols + col : null;
  }
  if (typeof value === "string") {
    const match = value.match(/(-?\d+)\D+(-?\d+)/u);
    if (match) {
      return Number(match[1]) * cols + Number(match[2]);
    }
  }
  return null;
}

function trackIndex(value: unknown): number {
  const numeric = numberLike(value);
  if (numeric !== null) {
    return Math.max(0, Math.min(11, Math.round((numeric + 1) * 5.5)));
  }
  const record = recordValue(value);
  if (record) {
    return trackIndex(record.x ?? record.position ?? record.distance ?? record.cart ?? record.puck);
  }
  return 1;
}

function boardFromFen(fen: string, symbols: Record<string, string>): string[] | null {
  const placement = fen.trim().split(/\s+/u)[0];
  if (!placement) {
    return null;
  }
  const rows = placement.split("/");
  if (rows.length === 0) {
    return null;
  }
  const pieces: string[] = [];
  for (const row of rows) {
    for (const char of row) {
      const emptyCount = Number(char);
      if (Number.isInteger(emptyCount) && emptyCount > 0 && emptyCount <= 9) {
        pieces.push(...Array(emptyCount).fill(""));
      } else {
        pieces.push(symbols[char] ?? chessPieceSymbol(char));
      }
    }
  }
  return pieces;
}

function chessPieceSymbol(value: string): string {
  const pieces: Record<string, string> = {
    K: "♔",
    Q: "♕",
    R: "♖",
    B: "♗",
    N: "♘",
    P: "♙",
    k: "♚",
    q: "♛",
    r: "♜",
    b: "♝",
    n: "♞",
    p: "♟"
  };
  return pieces[value] ?? value;
}

function flattenBoard(values: readonly unknown[]): unknown[] {
  return values.flatMap((value) => Array.isArray(value) ? flattenBoard(value) : [value]);
}

function arrayValue(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function nonEmptyArrayValue(value: unknown): readonly unknown[] | null {
  const array = arrayValue(value);
  return array && array.length > 0 ? array : null;
}

function cellLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const record = recordValue(value);
  if (!record) {
    return "";
  }
  const suit = stringValue(record.suit);
  const rank = stringValue(record.rank) ?? stringValue(record.value);
  if (rank && suit) {
    return `${rank}${suit}`;
  }
  const player = stringValue(record.player) ?? stringValue(record.owner);
  const count = numberLike(record.count);
  if (player && count !== null) {
    return `${player} x${count}`;
  }
  const amount = numberLike(record.amount ?? record.bid ?? record.value);
  if (player && amount !== null) {
    return `${player} ${amount}`;
  }
  return (
    stringValue(record.symbol)
    ?? stringValue(record.piece)
    ?? stringValue(record.token)
    ?? stringValue(record.card)
    ?? stringValue(record.tile)
    ?? stringValue(record.label)
    ?? stringValue(record.name)
    ?? stringValue(record.action)
    ?? stringValue(record.choice)
    ?? stringValue(record.status)
    ?? stringValue(record.owner)
    ?? stringValue(record.player)
    ?? coordinateLabel(record)
    ?? ""
  );
}

function rendererKindFromHint(rendererHint: string | null | undefined): ReplayRendererKind | null {
  if (!rendererHint) {
    return null;
  }
  if (/chess/iu.test(rendererHint)) return "chess";
  if (/hex/iu.test(rendererHint)) return "hex-grid";
  if (/ultimate/iu.test(rendererHint)) return "ultimate-grid";
  if (/mancala/iu.test(rendererHint)) return "mancala";
  if (/morris/iu.test(rendererHint)) return "morris";
  if (/backgammon/iu.test(rendererHint)) return "backgammon";
  if (/battle/iu.test(rendererHint)) return "battleship";
  if (/(gridworld|taxi|frozen|cliff)/iu.test(rendererHint)) return "rl-grid";
  if (/(lander|racing|walker|boxing|hockey|paddle|alien)/iu.test(rendererHint)) return "rl-scene";
  if (/(cartpole|mountain-car)/iu.test(rendererHint)) return "rl-track";
  if (/(dice|goofspiel)/iu.test(rendererHint)) return "dice-table";
  if (/(card|poker|trick|tile|hanabi)/iu.test(rendererHint)) return "card-table";
  if (/(matrix|negotiation|auction)/iu.test(rendererHint)) return "strategy-matrix";
  return null;
}

function rendererLabel(kind: ReplayRendererKind): string {
  const labels: Record<ReplayRendererKind, string> = {
    grid: "Board grid",
    "connect-four": "Connect Four grid",
    "tic-tac-toe": "Tic-Tac-Toe grid",
    chess: "Chess board",
    "stone-grid": "Stone grid",
    "disc-grid": "Disc grid",
    checkers: "Checkers board",
    "hex-grid": "Hex board",
    "ultimate-grid": "Ultimate grid",
    mancala: "Mancala pits",
    morris: "Morris board",
    backgammon: "Backgammon points",
    battleship: "Battleship grid",
    "card-table": "Card table",
    "dice-table": "Dice table",
    "strategy-matrix": "Strategy matrix",
    "rl-grid": "Arcade grid",
    "rl-track": "Arcade track",
    "rl-scene": "Arcade scene",
  };
  return labels[kind];
}

function coordinateLabel(record: Record<string, unknown>): string | null {
  const row = numberLike(record.row ?? record.r ?? record.y);
  const col = numberLike(record.col ?? record.c ?? record.x);
  return row !== null && col !== null ? `${row},${col}` : null;
}

function playerLabel(value: unknown): string | null {
  const label = stringValue(value)?.trim();
  if (!label) {
    return null;
  }
  const normalized = label.toLowerCase().replace(/[\s-]+/gu, "_");
  if (["player_1", "player1", "seat_1", "seat_a", "agent_1", "agent_a", "a"].includes(normalized)) {
    return "a";
  }
  if (["player_2", "player2", "seat_2", "seat_b", "agent_2", "agent_b", "b"].includes(normalized)) {
    return "b";
  }
  return normalized;
}

function actorPlayerForFrame(gameSlug: string, event: PublicReplayEventView): string | null {
  if (event.player) {
    return event.player;
  }
  if (!event.action) {
    return event.activePlayer;
  }
  const category = GAME_CATALOG.find((entry) => entry.slug === gameSlug)?.category;
  if (category === "rl") {
    return event.activePlayer;
  }
  if (event.activePlayer === "a") {
    return "b";
  }
  if (event.activePlayer === "b") {
    return "a";
  }
  return event.activePlayer;
}

function actionLabel(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return null;
}

function eventActionValue(event: Record<string, unknown>): unknown {
  return event.action
    ?? event.action_label
    ?? event.move
    ?? event.selected_action
    ?? event.selectedAction
    ?? event.choice
    ?? recordValue(event.decision)?.action
    ?? recordValue(event.decision)?.move
    ?? recordValue(event.output)?.action
    ?? recordValue(event.output)?.move;
}

function legalActionLabels(event: Record<string, unknown>): string[] {
  const candidates = [
    event.legalActions,
    event.legal_actions,
    event.publicLegalActions,
    event.public_legal_actions,
    event.availableActions,
    event.available_actions,
  ];
  for (const candidate of candidates) {
    const labels = actionLabels(candidate);
    if (labels.length > 0) {
      return labels;
    }
  }
  return [];
}

function actionLabels(value: unknown): string[] {
  const values = arrayValue(value);
  if (!values) {
    return [];
  }
  return values.map((entry) => actionLabel(entry)).filter((entry): entry is string => Boolean(entry));
}

function reasoningLabel(event: Record<string, unknown>): string | null {
  const candidates = [
    event.public_explanation,
    event.publicExplanation,
    event.public_reasoning,
    event.publicReasoning,
    recordValue(event.decision)?.public_explanation,
    recordValue(event.decision)?.publicExplanation,
    recordValue(event.decision)?.public_reasoning,
    recordValue(event.decision)?.publicReasoning,
    recordValue(event.metadata)?.public_explanation,
    recordValue(event.metadata)?.publicExplanation,
    recordValue(event.metadata)?.public_reasoning,
    recordValue(event.metadata)?.publicReasoning,
  ];

  for (const candidate of candidates) {
    const text = reasoningText(candidate);
    if (text) {
      return text;
    }
  }

  return null;
}

function reasoningText(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeReasoningText(value);
  }
  if (Array.isArray(value)) {
    const text = value.flatMap((item) => reasoningText(item) ?? []).join("\n\n");
    return normalizeReasoningText(text);
  }
  const record = recordValue(value);
  if (!record) {
    return null;
  }
  return (
    reasoningText(record.public_explanation)
    ?? reasoningText(record.publicExplanation)
    ?? reasoningText(record.public_reasoning)
    ?? reasoningText(record.publicReasoning)
    ?? reasoningText(record.text)
    ?? reasoningText(record.content)
    ?? reasoningText(record.summary)
  );
}

function normalizeReasoningText(value: string): string | null {
  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > 6000 ? `${normalized.slice(0, 6000).trimEnd()}...` : normalized;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function numericRecord(value: unknown): Record<string, number> {
  const record = recordValue(value);
  if (!record) {
    return {};
  }
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])));
}

function stringRecord(value: unknown): Record<string, string> {
  const record = recordValue(value);
  if (!record) {
    return {};
  }
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}


/** Only published, bounded checker counts; absent counters are never invented. */
function publicBackgammonCounts(state: Record<string,unknown>): string[] {
  const values: string[]=[];
  for (const [label,raw] of [["Bar",state.bar],["Borne off",state.borne_off ?? state.borneOff]] as const) {
    const record=recordValue(raw);
    if (!record) continue;
    for (const player of ["player_1","player_2"] as const) {
      const count=record[player];
      if (typeof count==="number" && Number.isInteger(count) && count>=0 && count<=15) values.push(`${label}: Player ${player.slice(-1)} × ${count}`);
    }
  }
  return values;
}
