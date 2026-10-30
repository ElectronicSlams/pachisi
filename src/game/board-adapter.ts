/**
 * Host-side board adapter: turns supplied cells, compact records and live
 * `DisplayFrameV1` frames into the `BoardFrame` that `Board` renders.
 *
 * Source: eSlamsPlatform @ 0fa7dfe227fe545036694c915a6b727eb4ee844a,
 * apps/web/lib/stadium/board.ts.
 *
 * Adaptations:
 * - No `GAME_CATALOG` lookup. Callers pass explicit geometry
 *   (`{ family, rows, cols }`, plus `chess`/`name` where the Platform derived
 *   them from the slug). Unknown games therefore cannot borrow another game's size.
 * - Dimensions must be finite positive safe integers and `last`/`line` indexes
 *   must fall inside the board; invalid overlays are dropped rather than drawn.
 * - `cardFrameFromRecord` takes host-supplied hands. The Platform version
 *   hard-coded the scripted stadium-record hands.
 * - New: `boardFrameFromDisplayFrame`, a non-throwing projection of the live
 *   render contract that reports issues and preserves actor/turn/score metadata.
 * - New: `tokens: "board" | "core"` names the source cell vocabulary, so Core's
 *   Hex `B`/`W` (player 1 / player 2) is never read as Board's `B` (second seat).
 * - Both projections fail closed: a non-empty token the family does not
 *   recognise returns a placeholder plus an issue instead of an empty cell.
 *
 * Pure TypeScript: no React, DOM, network or catalogue imports.
 */
import type { BoardFrame, CardBoardFrame, CellBoardFamily, CellBoardFrame, PlaceholderBoardFrame } from "./board-types";
import {
  collectNonRenderableFieldIssues,
  DISPLAY_FRAME_VERSION,
  isRendererFamily,
  type DisplayCell,
  type DisplayFrameV1,
  type GameRendererFamily,
} from "../contract/render-contract";

export type { BoardFrame, CardBoardFrame, CellBoardFamily, CellBoardFrame, PlaceholderBoardFrame } from "./board-types";

/** Explicit geometry for one game, supplied by the host (the Platform read it from its catalogue). */
export type BoardGeometry = {
  readonly family: GameRendererFamily;
  readonly rows: number;
  readonly cols: number;
  /** Square boards that carry chess letters (KQRBNP / kqrbnp). */
  readonly chess?: boolean;
  /**
   * Square boards only: "checkers" keeps men `r` / `b` and kings `R` / `B` as
   * checkers tokens; "discs" (the default) reads black/white or seat tokens as
   * Othello-style discs `B` / `W`. Matches `CellBoardFrame.variant`.
   */
  readonly variant?: "discs" | "checkers";
  /** Human-readable game name, used as the placeholder label. */
  readonly name?: string;
  /**
   * Source vocabulary of the supplied cell tokens. "board" (the default) reads
   * them as Board/normalised tokens. "core" first applies Core's per-family
   * encoding (see `CORE_TOKEN_MAPS`); today only Hex differs.
   */
  readonly tokens?: CellTokenVocabulary;
};

/**
 * Which vocabulary a host's cell tokens are written in.
 * - "board": pachisi's Board vocabulary (and the spellings `normalizeCellToken`
 *   accepts). On a hex board `R` is the first seat and `B` the second (blue).
 * - "core": the bundled Core engines' public state. On a hex board Core writes
 *   `B` for player 1 and `W` for player 2, which become Board `R` and `B`.
 * The meaning of a bare `B` is never guessed: the host states the vocabulary.
 */
export type CellTokenVocabulary = "board" | "core";

/**
 * Core → Board token maps for families whose Core encoding differs from Board's.
 * Families not listed use Core tokens as Board tokens (X/O, R/Y, B/W, chess letters).
 * Matches the decorative scene's own conversion in `scene.tsx` (`cellModel`).
 */
export const CORE_TOKEN_MAPS: Readonly<Partial<Record<CellBoardFamily, Readonly<Record<string, string>>>>> = Object.freeze({
  hex_board: Object.freeze({ B: "R", W: "B" }),
});

export const CELL_BOARD_FAMILIES: readonly CellBoardFamily[] = Object.freeze([
  "grid_3x3",
  "connect_four",
  "square_board",
  "go_board",
  "hex_board",
] as const);

/** The Platform's fallback sizes per cell family. Hosts should still pass the real variant size. */
export const DEFAULT_CELL_BOARD_SIZES: Readonly<Record<CellBoardFamily, readonly [rows: number, cols: number]>> = Object.freeze({
  grid_3x3: [3, 3],
  connect_four: [6, 7],
  square_board: [8, 8],
  go_board: [9, 9],
  hex_board: [11, 11],
});

const cellFamilies = new Set<string>(CELL_BOARD_FAMILIES);

export function isCellBoardFamily(family: string): family is CellBoardFamily {
  return cellFamilies.has(family);
}

/** The striped placeholder for families without a Board renderer. Always names the real family. */
export function placeholderFrame(family: GameRendererFamily | string, label: string): PlaceholderBoardFrame {
  return { kind: "placeholder", family, label };
}

/** An empty board: the opening position before the first move, or a placeholder when the geometry is not drawable. */
export function emptyBoardFrame(geometry: BoardGeometry): BoardFrame {
  const label = geometry.name ?? geometry.family;
  if (!isCellBoardFamily(geometry.family) || !isPositiveDimension(geometry.rows) || !isPositiveDimension(geometry.cols)) {
    return placeholderFrame(geometry.family, label);
  }
  return {
    kind: "cells",
    family: geometry.family,
    rows: geometry.rows,
    cols: geometry.cols,
    cells: Array.from({ length: geometry.rows * geometry.cols }, () => "."),
    ...(geometry.chess ? { chess: true } : {}),
  };
}

export type BoardOverlayOptions = {
  readonly last?: readonly number[];
  readonly line?: readonly number[];
};

/**
 * Builds a frame from a public board (one token per cell, row-major). Returns a
 * placeholder when the family has no Board renderer or the cells do not fit the
 * supplied geometry, so a poster never draws a wrong position.
 */
export function boardFrameFromCells(
  geometry: BoardGeometry,
  cells: readonly (string | null | undefined)[],
  options: BoardOverlayOptions = {},
): BoardFrame {
  return projectCells(geometry, cells, options).frame;
}

/** Same as `boardFrameFromCells`, but also returns why a placeholder was chosen or an overlay was dropped. */
export function boardFrameFromCellsWithIssues(
  geometry: BoardGeometry,
  cells: readonly (string | null | undefined)[],
  options: BoardOverlayOptions = {},
): { readonly frame: BoardFrame; readonly issues: readonly string[] } {
  return projectCells(geometry, cells, options);
}

function projectCells(
  geometry: BoardGeometry,
  cells: readonly (string | null | undefined)[],
  options: BoardOverlayOptions,
): { frame: BoardFrame; issues: string[] } {
  const label = geometry.name ?? geometry.family;
  const issues: string[] = [];
  const family = geometry.family;
  if (!isCellBoardFamily(family)) {
    issues.push(`Renderer family "${family}" has no cell Board renderer; returned a placeholder.`);
    return { frame: placeholderFrame(family, label), issues };
  }
  const { rows, cols } = geometry;
  if (!isPositiveDimension(rows) || !isPositiveDimension(cols)) {
    issues.push(`Board dimensions must be finite positive integers (received ${String(rows)}x${String(cols)}); returned a placeholder.`);
    return { frame: placeholderFrame(family, label), issues };
  }
  if (cells.length !== rows * cols) {
    issues.push(`Expected ${rows * cols} cells for a ${rows}x${cols} board, received ${cells.length}; returned a placeholder.`);
    return { frame: placeholderFrame(family, label), issues };
  }
  const chess = geometry.chess === true;
  const variant = family === "square_board" && !chess ? geometry.variant : undefined;
  const vocabulary = geometry.tokens ?? "board";
  const projected: string[] = [];
  for (const [index, cell] of cells.entries()) {
    const token = projectCellToken(family, cell, chess, variant, vocabulary);
    if (token === null) {
      issues.push(`Cell ${index} token ${JSON.stringify(cell)} is not a recognised ${tokenSetName(family, chess, variant, vocabulary)} token; returned a placeholder.`);
      return { frame: placeholderFrame(family, label), issues };
    }
    projected.push(token);
  }
  const frame: CellBoardFrame = {
    kind: "cells",
    family,
    rows,
    cols,
    cells: projected,
    ...(chess ? { chess: true } : {}),
    ...(variant ? { variant } : {}),
    ...overlay("last", options.last, rows * cols, issues),
    ...overlay("line", options.line, rows * cols, issues),
  };
  return { frame, issues };
}

function overlay(name: "last" | "line", indexes: readonly number[] | undefined, size: number, issues: string[]) {
  if (!indexes) return {};
  const invalid = indexes.filter((index) => !Number.isSafeInteger(index) || index < 0 || index >= size);
  if (invalid.length > 0) {
    issues.push(`Dropped "${name}" overlay: indexes ${invalid.map(String).join(", ")} are outside 0..${size - 1}.`);
    return {};
  }
  return { [name]: [...indexes] } as { last?: readonly number[]; line?: readonly number[] };
}

const chessTokenLetters: Readonly<Record<string, string>> = { "♔": "K", "♕": "Q", "♖": "R", "♗": "B", "♘": "N", "♙": "P", "♚": "k", "♛": "q", "♜": "r", "♝": "b", "♞": "n", "♟": "p" };

const firstSeatTokens = new Set(["x", "r", "red", "1", "p1", "player_1", "a", "black", "●"]);
const secondSeatTokens = new Set(["o", "y", "yellow", "2", "p2", "player_2", "white", "○"]);

function seatOf(lower: string): 1 | 2 | null {
  if (firstSeatTokens.has(lower) || lower.startsWith("player_1")) return 1;
  if (secondSeatTokens.has(lower) || lower.startsWith("player_2")) return 2;
  return null;
}

/** True for every spelling `normalizeCellToken` treats as an empty cell: `""`, `"."`, `"-"`, `"_"`, null, undefined (after trimming). */
export function isEmptyCellToken(token: string | null | undefined): boolean {
  const raw = (token ?? "").trim();
  return raw === "" || raw === "." || raw === "-" || raw === "_";
}

/**
 * Normalises a cell token per family:
 * - grid_3x3 → "X" | "O"
 * - connect_four → "R" (first seat) | "Y" (second seat)
 * - hex_board → "R" (first seat) | "B" (second seat, blue)
 * - go_board and disc boards → "B" (black) | "W" (white)
 * - chess keeps its piece letters (KQRBNP white, kqrbnp black)
 * - square_board with `variant: "checkers"` keeps men `r` / `b` and kings `R` / `B`
 * Empty cells are always "." (including `""`, null and undefined). Unrecognised
 * tokens also become ".", so this function alone cannot tell an empty cell from
 * an unknown piece. `boardFrameFromCells`, `boardFrameFromCellsWithIssues` and
 * `boardFrameFromDisplayFrame` check for that and fail closed to a placeholder;
 * call `isEmptyCellToken` yourself if you use this function directly.
 * Tokens are read in the Board vocabulary; see `CellTokenVocabulary` for Core.
 */
export function normalizeCellToken(
  family: CellBoardFamily,
  token: string | null | undefined,
  chess = false,
  variant?: "discs" | "checkers",
): string {
  const raw = (token ?? "").trim();
  if (raw === "" || raw === "." || raw === "-" || raw === "_") return ".";
  if (chess) return chessTokenLetters[raw] ?? (/^[KQRBNPkqrbnp]$/u.test(raw) ? raw : ".");
  if (family === "square_board" && variant === "checkers") return /^[rbRB]$/u.test(raw) ? raw : ".";
  const lower = raw.toLowerCase();
  if (family === "hex_board") return lower === "b" || lower === "blue" || seatOf(lower) === 2 ? "B" : seatOf(lower) === 1 ? "R" : ".";
  if (family === "go_board" || family === "square_board") {
    if (lower === "b" || lower === "black") return "B";
    if (lower === "w" || lower === "white") return "W";
  }
  const seat = seatOf(lower);
  if (family === "grid_3x3") return seat === 1 ? "X" : seat === 2 ? "O" : ".";
  if (family === "connect_four") return seat === 1 ? "R" : seat === 2 ? "Y" : ".";
  return seat === 1 ? "B" : seat === 2 ? "W" : ".";
}

/**
 * One cell token in the stated vocabulary → Board token, `"."` for every empty
 * spelling, or null when a non-empty token is not recognised (the caller fails closed).
 */
function projectCellToken(
  family: CellBoardFamily,
  token: unknown,
  chess: boolean,
  variant: "discs" | "checkers" | undefined,
  vocabulary: CellTokenVocabulary,
): string | null {
  if (token === null || token === undefined) return ".";
  if (typeof token !== "string") return null;
  if (isEmptyCellToken(token)) return ".";
  const coreMap = vocabulary === "core" && !chess ? CORE_TOKEN_MAPS[family] : undefined;
  if (coreMap) {
    const mapped = coreMap[token.trim().toUpperCase()];
    return mapped ?? null;
  }
  const normalised = normalizeCellToken(family, token, chess, variant);
  return normalised === "." ? null : normalised;
}

function tokenSetName(family: CellBoardFamily, chess: boolean, variant: "discs" | "checkers" | undefined, vocabulary: CellTokenVocabulary): string {
  const name = chess ? "chess" : variant === "checkers" ? "checkers" : family;
  return vocabulary === "core" && !chess && CORE_TOKEN_MAPS[family] ? `Core ${name}` : name;
}

const cardRankValue = "23456789TJQKA";

/** Host-supplied hands for `cardFrameFromRecord`: the near seat face up, the far seat as a count of face-down cards. */
export type CardRecordHands = {
  readonly near: readonly string[];
  readonly farCount: number;
};

/**
 * Decodes a Goofspiel-style `"a,b|prize|round"` record (`a` near seat's bid,
 * `b` far seat's bid, `round` zero-based). `"."` or `""` is the opening deal.
 * Hands are supplied by the host; nothing about the far hand is revealed.
 */
export function cardFrameFromRecord(frame: string, hands: CardRecordHands): CardBoardFrame {
  const farCount = Number.isSafeInteger(hands.farCount) && hands.farCount > 0 ? hands.farCount : 0;
  if (frame === "." || frame === "") {
    return { kind: "cards", top: Array.from({ length: farCount }, () => null), bottom: [...hands.near], played: { top: null, bottom: null }, centre: null, winner: null };
  }
  const [bids = "", prize = "", round = "-1"] = frame.split("|");
  const [a = "", b = ""] = bids.split(",");
  const roundNumber = Number(round);
  const played = Number.isSafeInteger(roundNumber) && roundNumber >= -1 ? roundNumber + 1 : 0;
  const valueA = cardRankValue.indexOf(a);
  const valueB = cardRankValue.indexOf(b);
  return {
    kind: "cards",
    top: Array.from({ length: Math.max(0, farCount - played) }, () => null),
    bottom: hands.near.slice(played),
    played: { top: b || null, bottom: a || null },
    centre: prize ? { rank: prize, caption: "prize" } : null,
    winner: valueA > valueB ? "bottom" : valueB > valueA ? "top" : null,
  };
}

/** Accessible one-line description of a frame, e.g. "Chess board, 24 pieces". */
export function describeBoardFrame(frame: BoardFrame, gameName: string): string {
  if (frame.kind === "placeholder") return `${gameName}: board preview not available yet`;
  if (frame.kind === "cards") return `${gameName} table`;
  const filled = frame.cells.filter((cell) => cell !== ".").length;
  const noun = frame.family === "square_board" ? "pieces" : frame.family === "grid_3x3" ? "marks" : frame.family === "connect_four" ? "discs" : "stones";
  return `${gameName} board, ${filled} ${noun}`;
}

/* ------------------------------------------------------------------------ */
/* Live render-contract projection                                           */
/* ------------------------------------------------------------------------ */

/** Live facts a `BoardFrame` cannot carry, preserved from the display frame for the host's chrome. */
export type DisplayFrameMetadata = {
  readonly frameId: string | null;
  readonly sourceReplayEventId: string | null;
  readonly gameSlug: string | null;
  readonly rendererFamily: string | null;
  readonly actorPlayer: string | null;
  readonly actionLabel: string | null;
  readonly activePlayer: string | null;
  readonly terminal: boolean;
  readonly turn: number | null;
  readonly scores: Readonly<Record<string, number>>;
  /** Labels of `status` cells, which `Board` never draws. */
  readonly statusLabels: readonly string[];
};

export type DisplayFrameProjectionOptions = BoardOverlayOptions & {
  /** Override the board size; otherwise inferred from the largest row/col on the board cells. */
  readonly rows?: number;
  readonly cols?: number;
  /** Draw chess letters on a square board. Defaults to `gameSlug === "chess"`. */
  readonly chess?: boolean;
  /** Placeholder label (usually the game name). Defaults to the frame's game slug. */
  readonly label?: string;
  /**
   * Vocabulary of the cell labels. "board" (the default) keeps today's reading;
   * pass "core" for labels copied from Core public state (e.g. Hex `B`/`W` via
   * `adaptPublicStateToDisplayFrame`). See `CellTokenVocabulary`.
   */
  readonly tokens?: CellTokenVocabulary;
};

export type DisplayFrameProjection = {
  readonly frame: BoardFrame;
  /** Empty when the frame was drawn exactly as supplied. */
  readonly issues: readonly string[];
  readonly metadata: DisplayFrameMetadata;
};

const boardCellKinds = new Set<DisplayCell["kind"]>(["board", "grid", "cells"]);

/**
 * Projects a live `DisplayFrameV1` onto pachisi's `BoardFrame`, truthfully:
 * - families without a cell renderer (card/dice/auction/matrix/control/economic/custom)
 *   become a placeholder that names the family; no example board is substituted;
 * - every board cell needs a position (`index`, or `row` and `col`), positions must be
 *   unique and in range, and the board-cell count must equal `rows * cols`;
 * - `""`, null and the other empty spellings normalise to `"."`; a non-empty label the
 *   family does not recognise fails closed to a placeholder instead of drawing an empty cell;
 * - labels are read in `options.tokens` vocabulary ("board" by default, "core" for Core state);
 * - `last`/`line` come only from `options` (DisplayFrameV1 has no last-move field, so
 *   nothing is inferred from `actionLabel` or diffs) and are bounds-checked;
 * - keys matching the privacy patterns reject the whole frame.
 * Never throws: problems are listed in `issues`.
 */
export function boardFrameFromDisplayFrame(frame: DisplayFrameV1, options: DisplayFrameProjectionOptions = {}): DisplayFrameProjection {
  const issues: string[] = [];
  const raw: unknown = frame;
  const record = isRecord(raw) ? raw : null;
  const metadata = metadataOf(record);
  const gameSlug = metadata.gameSlug ?? "unknown";
  const label = options.label ?? gameSlug;
  const familyValue = record?.rendererFamily;
  const family = typeof familyValue === "string" && familyValue.length > 0 ? familyValue : "custom";
  const fail = (message: string): DisplayFrameProjection => {
    issues.push(message);
    return { frame: placeholderFrame(family, label), issues, metadata };
  };

  if (!record) return fail("Display frame is not an object; returned a placeholder.");
  const privacy = collectNonRenderableFieldIssues(record);
  if (privacy.length > 0) {
    // Nothing from a rejected frame is echoed back: no metadata, no frame-supplied label.
    issues.push(...privacy);
    const safeFamily = isRendererFamily(family) ? family : "custom";
    return { frame: placeholderFrame(safeFamily, options.label ?? "Board unavailable"), issues, metadata: metadataOf(null) };
  }
  if (record.displayFrameVersion !== DISPLAY_FRAME_VERSION) {
    return fail(`Unsupported display frame version ${JSON.stringify(record.displayFrameVersion)}; expected ${DISPLAY_FRAME_VERSION}.`);
  }
  if (!isRendererFamily(family)) return fail(`Unknown renderer family "${family}"; returned a placeholder.`);
  if (!isCellBoardFamily(family)) {
    return fail(`Renderer family "${family}" has no cell Board renderer; returned a placeholder.`);
  }
  if (!Array.isArray(record.cells)) return fail("Display frame has no cells array; returned a placeholder.");

  const boardCells: DisplayCell[] = [];
  for (const [ordinal, cell] of (record.cells as readonly unknown[]).entries()) {
    if (!isRecord(cell)) return fail(`Cell ${ordinal} is not an object; returned a placeholder.`);
    const kind = cell.kind as DisplayCell["kind"];
    if (kind === "status") continue;
    if (!boardCellKinds.has(kind)) return fail(`Cell ${ordinal} has kind "${String(kind)}", which a ${family} board cannot draw; returned a placeholder.`);
    boardCells.push(cell as unknown as DisplayCell);
  }
  if (boardCells.length === 0) return fail("Display frame has no board cells; returned a placeholder.");

  const inferredRows = 1 + Math.max(-1, ...boardCells.map((cell) => (isIndex(cell.row) ? cell.row : -1)));
  const inferredCols = 1 + Math.max(-1, ...boardCells.map((cell) => (isIndex(cell.col) ? cell.col : -1)));
  const rows = options.rows ?? inferredRows;
  const cols = options.cols ?? inferredCols;
  if (!isPositiveDimension(rows) || !isPositiveDimension(cols)) {
    return fail(`Board dimensions must be finite positive integers (received ${String(rows)}x${String(cols)}); cells need row/col or explicit rows/cols. Returned a placeholder.`);
  }
  if (boardCells.length !== rows * cols) {
    return fail(`Expected ${rows * cols} board cells for a ${rows}x${cols} board, received ${boardCells.length}; returned a placeholder.`);
  }

  const chess = options.chess ?? gameSlug === "chess";
  const vocabulary = options.tokens ?? "board";
  const tokens: (string | undefined)[] = Array.from({ length: rows * cols });
  for (const cell of boardCells) {
    const position = positionOf(cell, cols);
    if (position === null) return fail(`Cell "${String(cell.id)}" has no usable index or row/col; returned a placeholder.`);
    if (typeof position === "string") return fail(`Cell "${String(cell.id)}" ${position}; returned a placeholder.`);
    if (position >= rows * cols || (isIndex(cell.row) && cell.row >= rows) || (isIndex(cell.col) && cell.col >= cols)) {
      return fail(`Cell "${String(cell.id)}" lies outside the ${rows}x${cols} board; returned a placeholder.`);
    }
    if (tokens[position] !== undefined) return fail(`Two cells occupy position ${position}; returned a placeholder.`);
    const labelText = typeof cell.label === "string" ? cell.label : cell.label === null || cell.label === undefined ? "" : null;
    if (labelText === null) return fail(`Cell "${String(cell.id)}" label is not a string; returned a placeholder.`);
    const token = projectCellToken(family, labelText, chess, undefined, vocabulary);
    if (token === null) {
      return fail(`Cell "${String(cell.id)}" label ${JSON.stringify(labelText)} is not a recognised ${tokenSetName(family, chess, undefined, vocabulary)} token; returned a placeholder.`);
    }
    tokens[position] = token;
  }

  const projected: CellBoardFrame = {
    kind: "cells",
    family,
    rows,
    cols,
    cells: tokens.map((token) => token ?? "."),
    ...(chess ? { chess: true } : {}),
    ...overlay("last", options.last, rows * cols, issues),
    ...overlay("line", options.line, rows * cols, issues),
  };
  return { frame: projected, issues, metadata };
}

function positionOf(cell: DisplayCell, cols: number): number | string | null {
  const hasRowCol = isIndex(cell.row) && isIndex(cell.col);
  const fromRowCol = hasRowCol ? (cell.row as number) * cols + (cell.col as number) : null;
  if (isIndex(cell.index)) {
    if (fromRowCol !== null && fromRowCol !== cell.index) return `index ${cell.index} disagrees with row ${cell.row}, col ${cell.col}`;
    return cell.index;
  }
  if (cell.index !== null && cell.index !== undefined) return "has an invalid index";
  return fromRowCol;
}

function metadataOf(record: Record<string, unknown> | null): DisplayFrameMetadata {
  const summary = record && isRecord(record.summary) ? record.summary : null;
  const scores: Record<string, number> = {};
  if (summary && isRecord(summary.scores)) {
    for (const [seat, score] of Object.entries(summary.scores)) {
      if (typeof score === "number" && Number.isFinite(score)) scores[seat] = score;
    }
  }
  const statusLabels = record && Array.isArray(record.cells)
    ? (record.cells as unknown[]).flatMap((cell) => (isRecord(cell) && cell.kind === "status" && typeof cell.label === "string" ? [cell.label] : []))
    : [];
  return {
    frameId: stringOrNull(record?.frameId),
    sourceReplayEventId: stringOrNull(record?.sourceReplayEventId),
    gameSlug: stringOrNull(record?.gameSlug),
    rendererFamily: stringOrNull(record?.rendererFamily),
    actorPlayer: stringOrNull(record?.actorPlayer),
    actionLabel: stringOrNull(record?.actionLabel),
    activePlayer: stringOrNull(summary?.activePlayer),
    terminal: summary?.terminal === true,
    turn: typeof summary?.turn === "number" && Number.isSafeInteger(summary.turn) && summary.turn >= 0 ? summary.turn : null,
    scores,
    statusLabels,
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
