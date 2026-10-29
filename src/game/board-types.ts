export type CellBoardFamily = "grid_3x3" | "connect_four" | "square_board" | "go_board" | "hex_board";

export type CellBoardFrame = {
  readonly kind: "cells";
  readonly family: CellBoardFamily;
  readonly rows: number;
  readonly cols: number;
  /**
   * One token per cell, row-major from the first seat's view (row 0 at the top);
   * length must equal rows * cols. Empty cells are ".", "" or whitespace (null and
   * undefined are also tolerated at runtime). Tokens are explicit per family:
   * - grid_3x3: "X" | "O"
   * - connect_four: "R" | "Y"
   * - square_board: chess letters "KQRBNP" / "kqrbnp" when `chess`; checkers men
   *   "r" | "b" and kings "R" | "B" when `variant: "checkers"` (or the tokens can only
   *   be checkers); otherwise discs "B" | "W" (Othello, Pentago)
   * - go_board: "B" | "W"
   * - hex_board: "R" | "B"
   * Board renders the "Unsupported board state" placeholder (naming the family) for an
   * unknown token, a cell-count mismatch or non-positive dimensions; it never guesses a
   * side. `normalizeCellToken` / `boardFrameFromCells` / `boardFrameFromDisplayFrame`
   * from `@electronicslams/pachisi/game/board-adapter` map other spellings first.
   */
  readonly cells: readonly string[];
  /** Square boards draw chess pieces instead of discs. */
  readonly chess?: boolean;
  /**
   * Square boards without `chess`: "checkers" reads r/b men and R/B kings, "discs"
   * reads B/W discs. Omitted: inferred from the tokens ("B" alone is a disc).
   */
  readonly variant?: "discs" | "checkers";
  /** Last-move cells (one, or from/to for a moved piece). */
  readonly last?: readonly number[];
  /** Winning line, highlighted on completed games. */
  readonly line?: readonly number[];
  /**
   * Which seat sits at the bottom. "second-seat-bottom" turns square, Go and Hex boards
   * 180 degrees (the black seat's chess view). Cells stay row-major from the first
   * seat's view either way. Ignored by grid_3x3 and connect_four (gravity).
   */
  readonly orientation?: "first-seat-bottom" | "second-seat-bottom";
  /** Cells to ring as threatened, e.g. a king in check. */
  readonly check?: readonly number[];
  /** The seat to move (host seat id or label); shown and announced. */
  readonly toMove?: string | null;
  /** Final result; `winner: null` is a draw. Shown and announced instead of `toMove`. */
  readonly result?: { readonly winner: string | null; readonly reason: string } | null;
  /** Rank and file labels on square and Go boards. */
  readonly coordinates?: boolean;
};

export type CardBoardFrame = {
  readonly kind: "cards";
  /** The far seat's hand; null renders a card back. */
  readonly top: readonly (string | null)[];
  /** The near seat's hand, face up. */
  readonly bottom: readonly (string | null)[];
  /** Cards played this round, by seat; null when not yet revealed. */
  readonly played: { readonly top: string | null; readonly bottom: string | null };
  /** The centre card (prize, community card) and its mono caption; null draws an empty slot. */
  readonly centre: { readonly rank: string; readonly caption: string } | null;
  readonly winner?: "top" | "bottom" | null;
};

export type PlaceholderBoardFrame = {
  readonly kind: "placeholder";
  readonly family: string;
  readonly label: string;
};

export type BoardFrame = CellBoardFrame | CardBoardFrame | PlaceholderBoardFrame;
