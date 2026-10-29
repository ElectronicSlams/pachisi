import {
  GAME_CATALOG,
  MOBILE_ARENA_GAME_CAPABILITIES,
  type GameCatalogEntry,
} from "@eslams/core-types";
import {
  assertBoardSceneSafe,
  buildSceneEnvelope,
  type BoardScene,
} from "@eslams/game-render-contract";

type Dimensions = Readonly<{ rows: number; cols: number }>;

const curatedBoards: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "tic-tac-toe": Object.freeze([
    "X", "Empty", "O",
    "Empty", "X", "Empty",
    "O", "Empty", "Empty",
  ]),
  chess: Object.freeze(Array.from({ length: 64 }, (_, index) => {
    const pieces: Readonly<Record<number, string>> = {
      0: "Black rook",
      3: "Black queen",
      4: "Black king",
      7: "Black rook",
      11: "Black pawn",
      12: "Black pawn",
      27: "White pawn",
      36: "White pawn",
      51: "White pawn",
      52: "White pawn",
      56: "White rook",
      59: "White queen",
      60: "White king",
      63: "White rook",
    };
    return pieces[index] ?? "Empty";
  })),
  "connect-four": Object.freeze([
    "Empty", "Empty", "Empty", "Empty", "Empty", "Empty", "Empty",
    "Empty", "Empty", "Empty", "Empty", "Empty", "Empty", "Empty",
    "Empty", "Empty", "Empty", "Empty", "Empty", "Empty", "Empty",
    "Empty", "Empty", "Empty", "Yellow", "Empty", "Empty", "Empty",
    "Empty", "Empty", "Red", "Red", "Yellow", "Empty", "Empty",
    "Empty", "Red", "Yellow", "Red", "Yellow", "Empty", "Empty",
  ]),
  "no-limit-texas-holdem": Object.freeze([
    "Ace of hearts revealed",
    "King of clubs revealed",
    "Card back",
    "Seven of clubs",
    "Card back",
    "Queen of diamonds revealed",
  ]),
});

/**
 * Canonical, bundled preview scenes for every renderer-backed game.
 *
 * Battlefield can contain watch-only games and control benchmarks that are not
 * eligible for interactive Arena play. Keeping their poster source local means
 * feed rendering never has to download and parse every replay before the app is
 * responsive.
 */
export const MOBILE_GAME_PREVIEW_SCENES = Object.freeze(Object.fromEntries(
  GAME_CATALOG.map((game) => {
    const scene = buildPreviewScene(game);
    assertBoardSceneSafe(scene);
    return [game.slug, scene];
  }),
)) as Readonly<Record<string, BoardScene>>;

export const MOBILE_ARENA_PREVIEW_SCENES = Object.freeze(Object.fromEntries(
  MOBILE_ARENA_GAME_CAPABILITIES.map((capability) => {
    const scene = MOBILE_GAME_PREVIEW_SCENES[capability.gameSlug];
    if (!scene) throw new TypeError(`Missing Arena preview catalogue entry for ${capability.gameSlug}.`);
    return [capability.gameSlug, scene];
  }),
)) as Readonly<Record<string, BoardScene>>;

export const MOBILE_ARENA_PREVIEW_SEQUENCES = Object.freeze(Object.fromEntries(
  MOBILE_ARENA_GAME_CAPABILITIES.map((capability) => {
    const game = GAME_CATALOG.find((entry) => entry.slug === capability.gameSlug);
    if (!game) throw new TypeError(`Missing game catalogue entry for ${capability.gameSlug}.`);
    const scenes = livingPreviewBoards(game).map((board) => {
      const scene = buildPreviewScene(game, board);
      assertBoardSceneSafe(scene);
      return scene;
    });
    return [capability.gameSlug, Object.freeze(scenes)];
  }),
)) as Readonly<Record<string, readonly BoardScene[]>>;

export function mobileGamePreviewScene(gameSlug: string): BoardScene | null {
  return MOBILE_GAME_PREVIEW_SCENES[gameSlug] ?? null;
}

export function mobileArenaPreviewScene(gameSlug: string): BoardScene | null {
  return MOBILE_ARENA_PREVIEW_SCENES[gameSlug] ?? null;
}

export function mobileArenaPreviewSequence(gameSlug: string): readonly BoardScene[] {
  return MOBILE_ARENA_PREVIEW_SEQUENCES[gameSlug] ?? Object.freeze([]);
}

function buildPreviewScene(
  game: GameCatalogEntry,
  providedBoard?: readonly string[],
): BoardScene {
  const dimensions = previewDimensions(game);
  const curated = curatedBoards[game.slug];
  const board = providedBoard?.length === dimensions.rows * dimensions.cols
    ? providedBoard
    : curated && curated.length === dimensions.rows * dimensions.cols
    ? curated
    : previewBoard(game, dimensions);
  return buildSceneEnvelope(
    { board, rows: dimensions.rows, cols: dimensions.cols },
    { gameSlug: game.slug, rendererFamily: game.renderSpec.rendererFamily },
  ).scene;
}

function livingPreviewBoards(game: GameCatalogEntry): readonly (readonly string[])[] {
  switch (game.slug) {
    case "tic-tac-toe":
      return legalPlacementFrames(3, 3, [0, 3, 1, 4, 2], ["X", "O"]);
    case "connect-four":
      return legalConnectFourFrames([3, 0, 3, 0, 3, 1, 3]);
    case "chess":
      return legalChessOpeningFrames();
    case "no-limit-texas-holdem":
      return legalHoldemRevealFrames();
    default: {
      const dimensions = previewDimensions(game);
      const curated = curatedBoards[game.slug];
      return Object.freeze([
        curated?.length === dimensions.rows * dimensions.cols
          ? curated
          : previewBoard(game, dimensions),
      ]);
    }
  }
}

function legalPlacementFrames(
  rows: number,
  cols: number,
  moves: readonly number[],
  players: readonly [string, string],
): readonly (readonly string[])[] {
  const board = Array<string>(rows * cols).fill("Empty");
  const frames: (readonly string[])[] = [Object.freeze([...board])];
  moves.forEach((index, turn) => {
    if (board[index] !== "Empty") throw new TypeError("Arena preview contains a repeated placement.");
    board[index] = players[turn % players.length]!;
    frames.push(Object.freeze([...board]));
  });
  return Object.freeze(frames);
}

function legalConnectFourFrames(columns: readonly number[]): readonly (readonly string[])[] {
  const rows = 6;
  const cols = 7;
  const board = Array<string>(rows * cols).fill("Empty");
  const frames: (readonly string[])[] = [Object.freeze([...board])];
  columns.forEach((column, turn) => {
    let row = rows - 1;
    while (row >= 0 && board[row * cols + column] !== "Empty") row -= 1;
    if (row < 0) throw new TypeError("Arena preview overfills a Connect Four column.");
    board[row * cols + column] = turn % 2 === 0 ? "Red" : "Yellow";
    frames.push(Object.freeze([...board]));
  });
  return Object.freeze(frames);
}

function legalChessOpeningFrames(): readonly (readonly string[])[] {
  const board = initialChessBoard();
  const frames: (readonly string[])[] = [Object.freeze([...board])];
  const moves = Object.freeze([
    [52, 36], // e2-e4
    [12, 28], // e7-e5
    [62, 45], // g1-f3
    [1, 18], // b8-c6
    [61, 34], // f1-c4
    [6, 21], // g8-f6
  ] as const);
  for (const [from, to] of moves) {
    const piece = board[from];
    if (!piece || piece === "Empty" || board[to] !== "Empty") {
      throw new TypeError("Arena preview contains an illegal chess opening transition.");
    }
    board[to] = piece;
    board[from] = "Empty";
    frames.push(Object.freeze([...board]));
  }
  return Object.freeze(frames);
}

function initialChessBoard(): string[] {
  const board = Array<string>(64).fill("Empty");
  const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  for (let column = 0; column < 8; column += 1) {
    board[column] = `Black ${backRank[column]}`;
    board[8 + column] = "Black pawn";
    board[48 + column] = "White pawn";
    board[56 + column] = `White ${backRank[column]}`;
  }
  return board;
}

function legalHoldemRevealFrames(): readonly (readonly string[])[] {
  return Object.freeze([
    Object.freeze(["Card back", "Card back", "Card back", "Card back", "Card back", "Card back"]),
    Object.freeze(["Card back", "Card back", "Queen of diamonds revealed", "Jack of diamonds revealed", "Four of spades revealed", "Card back"]),
    Object.freeze(["Card back", "Card back", "Queen of diamonds revealed", "Jack of diamonds revealed", "Four of spades revealed", "Nine of clubs revealed"]),
    Object.freeze(["Card back", "Card back", "Queen of diamonds revealed", "Jack of diamonds revealed", "Four of spades revealed", "Ten of hearts revealed"]),
  ]);
}

function previewDimensions(game: GameCatalogEntry): Dimensions {
  if (game.renderSpec.boardSize) return game.renderSpec.boardSize;
  const bespoke: Readonly<Record<string, Dimensions>> = {
    mancala: { rows: 2, cols: 7 },
    "nine-mens-morris": { rows: 3, cols: 3 },
    pentago: { rows: 6, cols: 6 },
    backgammon: { rows: 2, cols: 12 },
  };
  if (bespoke[game.slug]) return bespoke[game.slug]!;
  switch (game.renderSpec.rendererFamily) {
    case "card_table": return { rows: 2, cols: 3 };
    case "dice_table": return { rows: 1, cols: 5 };
    case "auction_panel": return { rows: 1, cols: 3 };
    case "payoff_matrix": return game.slug === "rock-paper-scissors"
      ? { rows: 3, cols: 3 }
      : { rows: 2, cols: 2 };
    case "economic_panel":
    case "control_benchmark": return { rows: 2, cols: 2 };
    default: return { rows: 3, cols: 3 };
  }
}

function previewBoard(game: GameCatalogEntry, dimensions: Dimensions): readonly string[] {
  const board = Array<string>(dimensions.rows * dimensions.cols).fill("Empty");
  const center = Math.floor(board.length / 2);
  const before = Math.max(0, center - 1);
  switch (game.renderSpec.rendererFamily) {
    case "grid_3x3":
      board[center] = "X";
      board[before] = "O";
      break;
    case "connect_four":
      board[center] = "Red";
      board[Math.max(0, center - dimensions.cols)] = "Yellow";
      break;
    case "square_board":
      board[center] = game.slug === "checkers" ? "Black king" : "White queen";
      board[before] = game.slug === "checkers" ? "White piece" : "Black rook";
      break;
    case "go_board":
    case "hex_board":
      board[center] = "Black";
      board[before] = "White";
      break;
    case "card_table":
      board[0] = game.slug === "blackjack" ? "Dealer card back" : "Card back";
      board[Math.min(1, board.length - 1)] = "Seven of clubs";
      break;
    case "dice_table":
      board[0] = "Bid 3 x 4";
      board[Math.min(1, board.length - 1)] = "Five dice";
      break;
    case "auction_panel":
      board[0] = "Lot A";
      board[Math.min(1, board.length - 1)] = "Sealed bid";
      break;
    case "payoff_matrix":
      board[center] = game.slug === "rock-paper-scissors" ? "Rock" : "+3, +3 reward";
      break;
    case "economic_panel":
      board[0] = "Offer: split 6 / 4";
      board[Math.min(1, board.length - 1)] = "Awaiting response";
      break;
    case "control_benchmark":
      board[0] = "Score 12";
      board[Math.min(1, board.length - 1)] = "Frame 4";
      break;
    case "custom":
      board[center] = game.slug === "mancala" ? "Pit count 4" : "Black";
      board[before] = game.slug === "mancala" ? "Store count 7" : "White";
      break;
  }
  return Object.freeze(board);
}
