import { homeAnimationRecord, type HomeAnimationLastMove } from "@/lib/home-game-animations";
import { HOME_SHOWCASE_GAME_SLUGS, type HomeShowcaseGameSlug } from "@/lib/home-showcase";
import { cardFrameFromRecord, type BoardFrame, type CellBoardFamily } from "@/lib/stadium/board";

/**
 * Recorded game animations for previews (home hero, Arena preview, sheets).
 * Chess, Connect Four, Othello and Tic-Tac-Toe are the locked hero sequences
 * from lib/home-game-animations.ts. Go, Hex and the card line are short
 * scripted openings for previews only: they are never presented as a real
 * match, and every surface that shows them says "game animation".
 */
export type StadiumRecordKey = HomeShowcaseGameSlug | "go" | "hex" | "cards";

export type StadiumRecord = {
  readonly key: StadiumRecordKey;
  readonly family: CellBoardFamily | "card_table";
  readonly rows: number;
  readonly cols: number;
  readonly frames: readonly string[];
  readonly labels: readonly string[];
  readonly last: readonly HomeAnimationLastMove[];
  /** Milliseconds between frames at 1x. */
  readonly delay: number;
  readonly line?: readonly number[];
};

export const HERO_RECORD_ORDER: readonly HomeShowcaseGameSlug[] = HOME_SHOWCASE_GAME_SLUGS;

const showcaseFamilies: Readonly<Record<HomeShowcaseGameSlug, readonly [CellBoardFamily, number, number]>> = {
  chess: ["square_board", 8, 8],
  "connect-four": ["connect_four", 6, 7],
  othello: ["square_board", 8, 8],
  "tic-tac-toe": ["grid_3x3", 3, 3],
};

function showcaseRecord(slug: HomeShowcaseGameSlug): StadiumRecord {
  const record = homeAnimationRecord(slug);
  const [family, rows, cols] = showcaseFamilies[slug];
  return { key: slug, family, rows, cols, frames: record.frames, labels: record.labels, last: record.last, delay: record.delay };
}

function goRecord(): StadiumRecord {
  const points: readonly (readonly [number, number])[] = [
    [2, 2], [6, 6], [6, 2], [2, 6], [4, 4], [4, 2], [2, 4], [6, 4], [4, 6], [3, 3],
    [5, 5], [3, 5], [5, 3], [4, 3], [4, 5], [3, 4], [5, 4], [2, 3], [6, 5], [7, 2],
  ];
  const board = Array.from({ length: 81 }, () => ".");
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  points.forEach(([row, col], index) => {
    const stone = index % 2 ? "W" : "B";
    board[row * 9 + col] = stone;
    frames.push(board.join(""));
    labels.push(`${stone} ${"ABCDEFGHJ"[col]}${9 - row}`);
    last.push(row * 9 + col);
  });
  return { key: "go", family: "go_board", rows: 9, cols: 9, frames, labels, last, delay: 520 };
}

function hexRecord(): StadiumRecord {
  const red: readonly (readonly [number, number])[] = [[5, 5], [4, 5], [6, 5], [3, 6], [7, 4], [2, 6], [8, 4], [1, 7], [9, 3], [0, 7], [10, 3]];
  const blue: readonly (readonly [number, number])[] = [[5, 4], [5, 6], [4, 6], [6, 4], [3, 5], [7, 5], [2, 7], [8, 3], [1, 6], [9, 4]];
  const board = Array.from({ length: 121 }, () => ".");
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  red.forEach(([row, col], index) => {
    board[row * 11 + col] = "R";
    frames.push(board.join(""));
    labels.push(`R ${"abcdefghijk"[col]}${row + 1}`);
    last.push(row * 11 + col);
    const reply = blue[index];
    if (!reply) return;
    const [replyRow, replyCol] = reply;
    board[replyRow * 11 + replyCol] = "B";
    frames.push(board.join(""));
    labels.push(`B ${"abcdefghijk"[replyCol]}${replyRow + 1}`);
    last.push(replyRow * 11 + replyCol);
  });
  return { key: "hex", family: "hex_board", rows: 11, cols: 11, frames, labels, last, delay: 480, line: red.map(([row, col]) => row * 11 + col) };
}

function cardsRecord(): StadiumRecord {
  const rounds: readonly (readonly [string, string, string])[] = [["K", "9", "T"], ["5", "Q", "7"], ["A", "K", "K"], ["7", "2", "3"], ["J", "T", "9"]];
  const frames = ["."];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  rounds.forEach(([a, b, prize], index) => {
    frames.push(`${a},${b}|${prize}|${index}`);
    labels.push(`${a} vs ${b} for ${prize}`);
    last.push(index);
  });
  return { key: "cards", family: "card_table", rows: 0, cols: 0, frames, labels, last, delay: 900 };
}

const records: Readonly<Record<StadiumRecordKey, StadiumRecord>> = {
  chess: showcaseRecord("chess"),
  "connect-four": showcaseRecord("connect-four"),
  othello: showcaseRecord("othello"),
  "tic-tac-toe": showcaseRecord("tic-tac-toe"),
  go: goRecord(),
  hex: hexRecord(),
  cards: cardsRecord(),
};

/** Goofspiel is the card line's own game; no other game borrows a sequence. */
const recordAliases: Readonly<Record<string, StadiumRecordKey>> = { goofspiel: "cards" };

export function stadiumRecord(key: StadiumRecordKey): StadiumRecord {
  return records[key];
}

/**
 * The preview animation for a game, or null when no honest stand-in exists
 * (the caller shows the striped placeholder instead).
 */
export function previewRecordForGame(slug: string): StadiumRecord | null {
  const key = recordAliases[slug] ?? (slug in records && slug !== "cards" ? slug as StadiumRecordKey : null);
  return key ? records[key] : null;
}

export function recordFrame(record: StadiumRecord, index: number, options: { readonly line?: boolean } = {}): BoardFrame {
  const frameIndex = Math.max(0, Math.min(index, record.frames.length - 1));
  const frame = record.frames[frameIndex] ?? "";
  if (record.family === "card_table") return cardFrameFromRecord(frame);
  const last = record.last[frameIndex];
  const final = frameIndex === record.frames.length - 1;
  return {
    kind: "cells",
    family: record.family,
    rows: record.rows,
    cols: record.cols,
    cells: Array.from(frame),
    ...(record.key === "chess" ? { chess: true } : {}),
    ...(last === null || last === undefined ? {} : { last: typeof last === "number" ? [last] : [last[0], last[1]] }),
    ...(options.line !== false && final && record.line ? { line: record.line } : {}),
  };
}
