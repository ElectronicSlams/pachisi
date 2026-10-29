import { GAME_CATALOG } from "@eslams/core-types/game-catalog";
import type { GameRendererFamily } from "@eslams/core-types";

/**
 * The shared stadium board contract (docs/design/stadium/IMPLEMENTATION.md).
 * One frame type feeds the home hero, posters, Arena previews and replays.
 * Cell tokens are normalised per family by `normalizeCellToken`.
 */

import type { BoardFrame, CardBoardFrame, CellBoardFamily, PlaceholderBoardFrame } from "@eslams/game-visuals/board-types";
export type { BoardFrame, CardBoardFrame, CellBoardFrame, CellBoardFamily, PlaceholderBoardFrame } from "@eslams/game-visuals/board-types";

export type StadiumGameSummary = {
  readonly slug: string;
  readonly name: string;
  readonly family: GameRendererFamily;
  readonly rows: number;
  readonly cols: number;
};

const defaultSizes: Readonly<Record<CellBoardFamily, readonly [rows: number, cols: number]>> = {
  grid_3x3: [3, 3],
  connect_four: [6, 7],
  square_board: [8, 8],
  go_board: [9, 9],
  hex_board: [11, 11],
};

const cellFamilies = new Set<GameRendererFamily>(["grid_3x3", "connect_four", "square_board", "go_board", "hex_board"]);

export function isCellBoardFamily(family: GameRendererFamily): family is CellBoardFamily {
  return cellFamilies.has(family);
}

export function stadiumGame(slug: string): StadiumGameSummary | null {
  const game = GAME_CATALOG.find((entry) => entry.slug === slug);
  if (!game) return null;
  const family = game.renderSpec.rendererFamily;
  const size = game.renderSpec.boardSize;
  const fallback = isCellBoardFamily(family) ? defaultSizes[family] : ([0, 0] as const);
  return { slug: game.slug, name: game.name, family, rows: size?.rows ?? fallback[0], cols: size?.cols ?? fallback[1] };
}

/** The striped placeholder for families without a stadium renderer yet. */
export function placeholderFrame(slug: string): PlaceholderBoardFrame {
  const game = stadiumGame(slug);
  return { kind: "placeholder", family: game?.family ?? "custom", label: game?.name ?? slug };
}

/** An empty board for a game: the opening position before the first move. */
export function emptyBoardFrame(slug: string): BoardFrame {
  const game = stadiumGame(slug);
  if (!game || !isCellBoardFamily(game.family) || game.rows * game.cols === 0) return placeholderFrame(slug);
  return { kind: "cells", family: game.family, rows: game.rows, cols: game.cols, cells: Array.from({ length: game.rows * game.cols }, () => ".") };
}

/**
 * Builds a frame from a public replay board (one token per cell). Returns a
 * placeholder when the family has no stadium renderer or the board does not
 * fit the game's geometry, so a poster never draws a wrong position.
 */
export function boardFrameFromCells(
  slug: string,
  cells: readonly (string | null | undefined)[],
  options: { readonly rows?: number; readonly cols?: number; readonly last?: readonly number[]; readonly line?: readonly number[] } = {},
): BoardFrame {
  const game = stadiumGame(slug);
  const family = game?.family;
  if (!game || !family || !isCellBoardFamily(family)) return placeholderFrame(slug);
  const rows = options.rows ?? game.rows;
  const cols = options.cols ?? game.cols;
  if (rows <= 0 || cols <= 0 || cells.length !== rows * cols) return placeholderFrame(slug);
  return {
    kind: "cells",
    family,
    rows,
    cols,
    cells: cells.map((cell) => normalizeCellToken(family, cell, slug === "chess")),
    ...(slug === "chess" ? { chess: true } : {}),
    ...(options.last ? { last: options.last } : {}),
    ...(options.line ? { line: options.line } : {}),
  };
}

const chessTokenLetters: Readonly<Record<string,string>> = {"♔":"K","♕":"Q","♖":"R","♗":"B","♘":"N","♙":"P","♚":"k","♛":"q","♜":"r","♝":"b","♞":"n","♟":"p"};

const firstSeatTokens = new Set(["x", "r", "red", "1", "p1", "player_1", "a", "black", "●"]);
const secondSeatTokens = new Set(["o", "y", "yellow", "2", "p2", "player_2", "white", "○"]);

function seatOf(lower: string): 1 | 2 | null {
  if (firstSeatTokens.has(lower) || lower.startsWith("player_1")) return 1;
  if (secondSeatTokens.has(lower) || lower.startsWith("player_2")) return 2;
  return null;
}

/**
 * Normalises a cell token per family:
 * - grid_3x3 → "X" | "O"
 * - connect_four → "R" (first seat) | "Y" (second seat)
 * - hex_board → "R" (first seat) | "B" (second seat, blue)
 * - go_board and disc boards → "B" (black) | "W" (white)
 * - chess keeps its piece letters (KQRBNP white, kqrbnp black)
 * Empty cells are always ".".
 */
export function normalizeCellToken(family: CellBoardFamily, token: string | null | undefined, chess = false): string {
  const raw = (token ?? "").trim();
  if (raw === "" || raw === "." || raw === "-" || raw === "_") return ".";
  if (chess) return chessTokenLetters[raw] ?? (/^[KQRBNPkqrbnp]$/u.test(raw) ? raw : ".");
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

const cardRankValue = "23456789TJQKA";

/** Decodes a Goofspiel-style "a,b|prize|round" frame from the stadium records. */
export function cardFrameFromRecord(frame: string): CardBoardFrame {
  const handA = ["K", "5", "A", "7", "J"];
  const handB = ["9", "Q", "K", "2", "T"];
  if (frame === "." || frame === "") {
    return { kind: "cards", top: handB.map(() => null), bottom: handA, played: { top: null, bottom: null }, centre: null, winner: null };
  }
  const [bids = "", prize = "", round = "-1"] = frame.split("|");
  const [a = "", b = ""] = bids.split(",");
  const played = Number(round) + 1;
  const valueA = cardRankValue.indexOf(a);
  const valueB = cardRankValue.indexOf(b);
  return {
    kind: "cards",
    top: handB.slice(played).map(() => null),
    bottom: handA.slice(played),
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
