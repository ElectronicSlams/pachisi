export type GameRendererFamily =
  | "grid_3x3"
  | "connect_four"
  | "square_board"
  | "go_board"
  | "hex_board"
  | "card_table"
  | "dice_table"
  | "auction_panel"
  | "payoff_matrix"
  | "control_benchmark"
  | "economic_panel"
  | "custom";

export type GameRenderSpec = {
  readonly schemaVersion: "eslams.game.render.v1";
  readonly rendererFamily: GameRendererFamily;
  readonly boardSize?: { readonly rows: number; readonly cols: number } | null;
  readonly seatLayout: "two_sides" | "compass" | "table_ring" | "solo_panel";
  readonly hiddenInfo: boolean;
  readonly supportsReplay: boolean;
  readonly supportsLiveFrame: boolean;
};
