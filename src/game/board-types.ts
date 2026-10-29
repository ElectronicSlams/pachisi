export type CellBoardFamily = "grid_3x3" | "connect_four" | "square_board" | "go_board" | "hex_board";

export type CellBoardFrame = {
  readonly kind: "cells";
  readonly family: CellBoardFamily;
  readonly rows: number;
  readonly cols: number;
  /** One token per cell, row-major. "." or "" is empty. */
  readonly cells: readonly string[];
  /** Square boards draw chess pieces instead of discs. */
  readonly chess?: boolean;
  /** Last-move cells (one, or from/to for a moved piece). */
  readonly last?: readonly number[];
  /** Winning line, highlighted on completed games. */
  readonly line?: readonly number[];
};

export type CardBoardFrame = {
  readonly kind: "cards";
  /** The far seat's hand; null renders a card back. */
  readonly top: readonly (string | null)[];
  /** The near seat's hand, face up. */
  readonly bottom: readonly (string | null)[];
  /** Cards played this round, by seat; null when not yet revealed. */
  readonly played: { readonly top: string | null; readonly bottom: string | null };
  /** The centre card (prize, community card) and its mono caption. */
  readonly centre: { readonly rank: string; readonly caption: string } | null;
  readonly winner?: "top" | "bottom" | null;
};

export type PlaceholderBoardFrame = {
  readonly kind: "placeholder";
  readonly family: string;
  readonly label: string;
};

export type BoardFrame = CellBoardFrame | CardBoardFrame | PlaceholderBoardFrame;
