import type { HomeShowcaseGameSlug } from "@/lib/home-showcase";

export type HomeAnimationLastMove = number | readonly [from: number, to: number] | null;

export type HomeAnimationRecord = {
  readonly frames: readonly string[];
  readonly labels: readonly string[];
  readonly last: readonly HomeAnimationLastMove[];
  readonly delay: number;
};

const CHESS_START = "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR";
const CHESS_UCI = ["e2e4", "e7e5", "f1c4", "d7d6", "g1f3", "c8g4", "b1c3", "g7g6", "f3e5", "g4d1", "c4f7", "e8e7", "c3d5"] as const;
const CHESS_SAN = ["e4", "e5", "Bc4", "d6", "Nf3", "Bg4", "Nc3", "g6", "Nxe5!", "Bxd1", "Bxf7+", "Ke7", "Nd5#"] as const;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
] as const;
const CONNECT_FOUR_WINDOWS = buildConnectFourWindows();

const HOME_ANIMATION_RECORDS: Readonly<Record<HomeShowcaseGameSlug, HomeAnimationRecord>> = {
  "connect-four": buildConnectFourRecord(),
  chess: buildChessRecord(),
  othello: buildOthelloRecord(),
  "tic-tac-toe": buildTicTacToeRecord(),
};

export function homeAnimationRecord(slug: HomeShowcaseGameSlug): HomeAnimationRecord {
  return HOME_ANIMATION_RECORDS[slug];
}

function squareIndex(square: string): number {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  return (8 - rank) * 8 + file;
}

function buildChessRecord(): HomeAnimationRecord {
  const board = Array.from(CHESS_START);
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  CHESS_UCI.forEach((move, index) => {
    const from = squareIndex(move.slice(0, 2));
    const to = squareIndex(move.slice(2, 4));
    const piece = board[from] ?? ".";
    board[to] = piece;
    board[from] = ".";
    if ((piece === "K" || piece === "k") && Math.abs((to % 8) - (from % 8)) === 2) {
      const row = Math.floor(to / 8);
      if (to % 8 === 6) {
        board[row * 8 + 5] = board[row * 8 + 7] ?? ".";
        board[row * 8 + 7] = ".";
      } else if (to % 8 === 2) {
        board[row * 8 + 3] = board[row * 8] ?? ".";
        board[row * 8] = ".";
      }
    }
    frames.push(board.join(""));
    const moveNumber = Math.floor(index / 2) + 1;
    labels.push(`${index % 2 === 0 ? `${moveNumber}. ` : `${moveNumber}… `}${CHESS_SAN[index]}`);
    last.push([from, to]);
  });
  return { frames, labels, last, delay: 760 };
}

type ConnectFourDisc = "." | "R" | "Y";

function buildConnectFourWindows(): readonly (readonly number[])[] {
  const windows: number[][] = [];
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const index = row * 7 + column;
      if (column <= 3) windows.push([index, index + 1, index + 2, index + 3]);
      if (row <= 2) windows.push([index, index + 7, index + 14, index + 21]);
      if (row <= 2 && column <= 3) windows.push([index, index + 8, index + 16, index + 24]);
      if (row <= 2 && column >= 3) windows.push([index, index + 6, index + 12, index + 18]);
    }
  }
  return windows;
}

function connectFourWinner(board: readonly ConnectFourDisc[]): ConnectFourDisc | null {
  for (const window of CONNECT_FOUR_WINDOWS) {
    const first = board[window[0] ?? 0] ?? ".";
    if (first !== "." && window.every((index) => board[index] === first)) return first;
  }
  return null;
}

function playConnectFour(seed: number): { readonly frames: string[]; readonly labels: string[]; readonly last: HomeAnimationLastMove[]; readonly winner: ConnectFourDisc | null } {
  const random = mulberry32(seed);
  const board = Array<ConnectFourDisc>(42).fill(".");
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  const order = [3, 4, 2, 5, 1, 6, 0] as const;
  const rowForColumn = (column: number) => {
    for (let row = 5; row >= 0; row -= 1) if (board[row * 7 + column] === ".") return row;
    return -1;
  };
  let current: ConnectFourDisc = "R";

  for (let ply = 0; ply < 42; ply += 1) {
    const opponent: ConnectFourDisc = current === "R" ? "Y" : "R";
    const winningColumn = (disc: ConnectFourDisc) => {
      for (const column of order) {
        const row = rowForColumn(column);
        if (row < 0) continue;
        board[row * 7 + column] = disc;
        const wins = connectFourWinner(board) !== null;
        board[row * 7 + column] = ".";
        if (wins) return column;
      }
      return -1;
    };
    let move = winningColumn(current);
    if (move < 0) move = winningColumn(opponent);
    if (move < 0) {
      const safe: number[] = [];
      for (const column of order) {
        const row = rowForColumn(column);
        if (row < 0) continue;
        board[row * 7 + column] = current;
        let bad = false;
        for (const response of order) {
          const responseRow = rowForColumn(response);
          if (responseRow < 0) continue;
          board[responseRow * 7 + response] = opponent;
          if (connectFourWinner(board)) bad = true;
          board[responseRow * 7 + response] = ".";
          if (bad) break;
        }
        board[row * 7 + column] = ".";
        if (!bad) safe.push(column);
      }
      const candidates = safe.length ? safe : order.filter((column) => rowForColumn(column) >= 0);
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const column of candidates) {
        const row = rowForColumn(column);
        let score = 3 - Math.abs(3 - column);
        for (const [rowDelta, columnDelta] of DIRECTIONS) {
          const nextRow = row + rowDelta;
          const nextColumn = column + columnDelta;
          if (nextRow >= 0 && nextRow < 6 && nextColumn >= 0 && nextColumn < 7 && board[nextRow * 7 + nextColumn] === current) score += 1.2;
        }
        score += random() * 0.9;
        if (score > bestScore) {
          bestScore = score;
          move = column;
        }
      }
    }
    const row = rowForColumn(move);
    board[row * 7 + move] = current;
    frames.push(board.join(""));
    labels.push(`${current} → ${"abcdefg"[move]}`);
    last.push(row * 7 + move);
    const winner = connectFourWinner(board);
    if (winner) return { frames, labels, last, winner };
    current = opponent;
  }
  return { frames, labels, last, winner: null };
}

function buildConnectFourRecord(): HomeAnimationRecord {
  let full = playConnectFour(7);
  for (let seed = 7; seed < 200; seed += 1) {
    const candidate = playConnectFour(seed);
    if (candidate.winner && candidate.frames.length >= 22 && candidate.frames.length <= 36) {
      full = candidate;
      break;
    }
  }
  const liveCut = Math.max(10, full.frames.length - 5);
  return {
    frames: full.frames.slice(0, liveCut),
    labels: full.labels.slice(0, liveCut),
    last: full.last.slice(0, liveCut),
    delay: 500,
  };
}

function buildTicTacToeRecord(): HomeAnimationRecord {
  const moves = [4, 0, 6, 2, 1, 7, 5, 3, 8] as const;
  const board = Array<string>(9).fill(".");
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  const coordinate = (cell: number) => `${"abc"[cell % 3]}${3 - Math.floor(cell / 3)}`;
  moves.forEach((cell, index) => {
    const mark = index % 2 === 0 ? "X" : "O";
    board[cell] = mark;
    frames.push(board.join(""));
    labels.push(`${mark} ${coordinate(cell)}`);
    last.push(cell);
  });
  return { frames, labels, last, delay: 820 };
}

function buildOthelloRecord(): HomeAnimationRecord {
  let chosen = playOthello(3);
  for (let seed = 3; seed < 120; seed += 1) {
    const candidate = playOthello(seed);
    const margin = Math.abs(candidate.black - candidate.white);
    if (candidate.winner && margin >= 6 && margin <= 20) {
      chosen = candidate;
      break;
    }
  }
  return { frames: chosen.frames, labels: chosen.labels, last: chosen.last, delay: 240 };
}

function playOthello(seed: number): { readonly frames: string[]; readonly labels: string[]; readonly last: HomeAnimationLastMove[]; readonly black: number; readonly white: number; readonly winner: "B" | "W" | null } {
  const random = mulberry32(seed);
  const board = Array<string>(64).fill(".");
  board[27] = "W";
  board[28] = "B";
  board[35] = "B";
  board[36] = "W";
  const flipsFor = (index: number, current: "B" | "W") => {
    if (board[index] !== ".") return null;
    const rowStart = Math.floor(index / 8);
    const columnStart = index % 8;
    const opponent = current === "B" ? "W" : "B";
    const all: number[] = [];
    for (const [rowDelta, columnDelta] of DIRECTIONS) {
      let row = rowStart + rowDelta;
      let column = columnStart + columnDelta;
      const run: number[] = [];
      while (row >= 0 && row < 8 && column >= 0 && column < 8 && board[row * 8 + column] === opponent) {
        run.push(row * 8 + column);
        row += rowDelta;
        column += columnDelta;
      }
      if (run.length && row >= 0 && row < 8 && column >= 0 && column < 8 && board[row * 8 + column] === current) all.push(...run);
    }
    return all.length ? all : null;
  };
  const frames = [board.join("")];
  const labels = ["·"];
  const last: HomeAnimationLastMove[] = [null];
  let current: "B" | "W" = "B";
  let passes = 0;

  for (let ply = 0; ply < 120 && passes < 2; ply += 1) {
    const legal: Array<readonly [index: number, flips: readonly number[]]> = [];
    for (let index = 0; index < 64; index += 1) {
      const flips = flipsFor(index, current);
      if (flips) legal.push([index, flips]);
    }
    if (!legal.length) {
      passes += 1;
      current = current === "B" ? "W" : "B";
      continue;
    }
    passes = 0;
    let best = legal[0] ?? null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of legal) {
      const [index, flips] = candidate;
      const row = Math.floor(index / 8);
      const column = index % 8;
      const corner = (row === 0 || row === 7) && (column === 0 || column === 7);
      const edge = row === 0 || row === 7 || column === 0 || column === 7;
      let score = flips.length;
      if (corner) score += 60;
      else if (edge) score += 6;
      if (!corner && (row <= 1 || row >= 6) && (column <= 1 || column >= 6)) score -= 10;
      score += random() * 1.5;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) break;
    const [index, flips] = best;
    board[index] = current;
    for (const flipped of flips) board[flipped] = current;
    frames.push(board.join(""));
    labels.push(`${current} ${String.fromCharCode(97 + (index % 8))}${8 - Math.floor(index / 8)}`);
    last.push(index);
    current = current === "B" ? "W" : "B";
  }

  const final = board.join("");
  const black = Array.from(final).filter((disc) => disc === "B").length;
  const white = Array.from(final).filter((disc) => disc === "W").length;
  return { frames, labels, last, black, white, winner: black === white ? null : black > white ? "B" : "W" };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
