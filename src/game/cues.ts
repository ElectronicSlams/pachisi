import type { CellBoardFamily } from "./board-types";

/**
 * Last-move and win-line cues for cell boards, derived from two consecutive
 * frames. Pure and deterministic: the bundled traces carry no `last`/`line`
 * fields (they are pinned by hash and never regenerated for presentation), so
 * the scene derives them from the board diff instead.
 *
 * Rule (mirrored by `derive_cell_cues` in scripts/validate-demonstrations.py;
 * bump CUE_RULE_VERSION in both places when it changes):
 *
 * - `last`: compare `previousCells` with `cells` (".", "", whitespace, null
 *   and undefined all count as empty).
 *   - Chess (`chess: true`): every changed square, so a move shows from and to
 *     (4 squares for castling, 3 for en passant).
 *   - Otherwise, when exactly one cell went from empty to occupied, only that
 *     cell. This is the placed stone or disc; Go captures (occupied to empty)
 *     and Othello flips (one colour to the other) are deliberately excluded.
 *   - Otherwise every changed cell (Pentago's place-and-rotate, or a jump of
 *     several moves between frames): showing all of it is the honest cue.
 *   - No previous frame, or a size change: no cue.
 * - `line`: only on terminal frames with a win length (3 for a 3x3 `grid_3x3`,
 *   4 for `connect_four`, or `winLength` from the caller, e.g. 5 for Gomoku):
 *   every cell in a straight run (row, column or either diagonal) of at least
 *   that many identical non-empty tokens. No line for other families
 *   (Go, Hex, Othello, chess, Pentago, the 9x9 Ultimate board), or for a draw.
 */
export const CUE_RULE_VERSION = 1;

export type CellCues = { readonly last: number[]; readonly line?: number[] };

export type CellCueOptions = {
  /** Whether the current frame ends the game; lines are only derived then. */
  readonly terminal?: boolean;
  /** Overrides the family's default win length (Gomoku: 5). */
  readonly winLength?: number;
  /** Square board showing chess: a move's cue covers from and to. */
  readonly chess?: boolean;
};

/** Win lengths for the games whose win is a straight line, by catalogue slug. */
export const WIN_LENGTH: Readonly<Record<string, number>> = { "tic-tac-toe": 3, "connect-four": 4, gomoku: 5 };

function isEmpty(token: string | null | undefined): boolean {
  return token === null || token === undefined || token === "." || token.trim() === "";
}

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  return isEmpty(a) ? isEmpty(b) : a === b;
}

function defaultWinLength(family: CellBoardFamily, rows: number, cols: number): number | undefined {
  if (family === "grid_3x3" && rows === 3 && cols === 3) return 3;
  if (family === "connect_four") return 4;
  return undefined;
}

export function deriveCellCues(
  previousCells: readonly (string | null | undefined)[] | null | undefined,
  cells: readonly (string | null | undefined)[],
  family: CellBoardFamily,
  rows: number,
  cols: number,
  options: CellCueOptions = {},
): CellCues {
  let last: number[] = [];
  if (previousCells && previousCells.length === cells.length) {
    const changed: number[] = [];
    const added: number[] = [];
    cells.forEach((token, index) => {
      const before = previousCells[index];
      if (same(before, token)) return;
      changed.push(index);
      if (isEmpty(before) && !isEmpty(token)) added.push(index);
    });
    last = options.chess ? changed : added.length === 1 ? added : changed;
  }

  const winLength = options.winLength ?? defaultWinLength(family, rows, cols);
  if (!options.terminal || !winLength || rows * cols !== cells.length) return { last };
  const hit = new Set<number>();
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const token = cells[y * cols + x];
      if (isEmpty(token)) continue;
      for (const [dy, dx] of [[0, 1], [1, 0], [1, 1], [1, -1]] as const) {
        const run: number[] = [];
        for (let k = 0; k < winLength; k += 1) {
          const yy = y + k * dy;
          const xx = x + k * dx;
          if (yy < 0 || yy >= rows || xx < 0 || xx >= cols || cells[yy * cols + xx] !== token) break;
          run.push(yy * cols + xx);
        }
        if (run.length === winLength) run.forEach((index) => hit.add(index));
      }
    }
  }
  return hit.size ? { last, line: [...hit].sort((a, b) => a - b) } : { last };
}

/**
 * Where a bundled trace deviates from the standard published rules, the demo
 * says so. Core owns the rules; these strings only describe the variant the
 * artwork pin (Core 7731e2f) actually plays, so a spectator who knows the
 * standard game is not shown an "illegal" move without warning. Remove an
 * entry when the traces are regenerated from a standard-rules arena.
 */
export const VARIANT_NOTES: Readonly<Record<string, string>> = {
  hearts: "2-player variant",
  spades: "2-player variant",
  euchre: "2-player variant",
  hanabi: "2-colour variant",
  "gin-rummy": "7-card variant",
  mahjong: "108-tile variant",
  backgammon: "5-checker variant",
  "leduc-holdem": "4-handed variant",
  cribbage: "no pegging",
};

export function variantNoteFor(slug: string): string | null {
  return Object.hasOwn(VARIANT_NOTES, slug) ? VARIANT_NOTES[slug]! : null;
}
