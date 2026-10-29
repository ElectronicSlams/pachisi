import type { GameAnimationSpec } from "./game-animation";
import type { GameHelp } from "./game-help";
import type { GameRenderSpec, GameRendererFamily } from "./game-render";
import type { GameResultContract } from "./game-result";
import type { GameSurface } from "./game-surface";
import type { GameScoreType, GameTopology } from "./game-topology";
import { coreArenaContracts } from "./core-arena-contracts.generated";

export type GameCatalogCategory = "board" | "card" | "gametheory" | "rl";
export type GameCatalogMaturity = "specified" | "playable" | "replayready";
export type GameCatalogDifficulty = "easy" | "medium" | "hard";

export type GameCatalogEntry = {
  readonly slug: string;
  readonly name: string;
  readonly category: GameCatalogCategory;
  readonly variant: string;
  readonly arenaVersion: string;
  readonly difficulty: GameCatalogDifficulty;
  readonly maturity: GameCatalogMaturity;
  readonly topology: GameTopology;
  readonly surface: GameSurface;
  readonly resultContract: GameResultContract;
  readonly help: GameHelp;
  readonly renderSpec: GameRenderSpec;
  readonly animationSpec: GameAnimationSpec;
  readonly legacyPlayers: number;
  /** @deprecated Use topology.defaultPlayers. Kept for one compatibility cycle. */
  readonly players: number;
  readonly description: string;
};

const soloScoreGames = new Set([
  "blackjack",
  "taxi",
  "frozen-lake",
  "cliff-walking",
  "cartpole",
  "mountain-car",
  "lunar-lander",
  "car-racing",
  "bipedal-walker",
  "paddle-ball",
  "alien-shooter"
]);

const mainArenaGames = new Set([
  "tic-tac-toe",
  "connect-four",
  "othello",
  "chess",
  "go",
  "gomoku",
  "hex",
  "ultimate-tic-tac-toe",
  "battleship",
  "goofspiel",
  "rock-paper-scissors",
  "prisoners-dilemma",
  "first-price-sealed-bid-auction"
]);

const multiSeatGames = new Set([
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
  "mahjong",
  "dou-dizhu",
  "bridge"
]);

const hiddenInfoGames = new Set([
  "battleship",
  "goofspiel",
  "rock-paper-scissors",
  "prisoners-dilemma",
  "first-price-sealed-bid-auction",
  "bargaining",
  "negotiation",
  "blackjack",
  "gin-rummy",
  "cribbage",
  "liars-dice",
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
  "mahjong",
  "dou-dizhu",
  "bridge",
  "hearts",
  "spades",
  "euchre",
  "crazy-eights",
  "hanabi",
  "shedding-card-game"
]);

const boardSizes: Record<string, { readonly rows: number; readonly cols: number }> = {
  "tic-tac-toe": { rows: 3, cols: 3 },
  "connect-four": { rows: 6, cols: 7 },
  othello: { rows: 8, cols: 8 },
  chess: { rows: 8, cols: 8 },
  go: { rows: 9, cols: 9 },
  gomoku: { rows: 15, cols: 15 },
  "ultimate-tic-tac-toe": { rows: 9, cols: 9 },
  checkers: { rows: 8, cols: 8 },
  shogi: { rows: 9, cols: 9 },
  xiangqi: { rows: 10, cols: 9 }
};

const entry = (
  slug: string,
  name: string,
  category: GameCatalogCategory,
  variant: string,
  difficulty: GameCatalogDifficulty,
  maturity: GameCatalogMaturity,
  legacyPlayers = 2
): GameCatalogEntry => {
  const topology = topologyForGame(slug, legacyPlayers);
  const surface = surfaceForGame(slug);
  const renderSpec = renderSpecForGame(slug, category, topology);
  const help = helpForGame(slug, name, topology);
  return {
    slug,
    arenaVersion: coreArenaContracts[slug]!.arenaVersion,
    name,
    category,
    variant,
    difficulty,
    maturity,
    topology,
    surface,
    resultContract: resultContractForTopology(topology),
    help,
    renderSpec,
    animationSpec: animationSpecForGame(slug, renderSpec),
    legacyPlayers,
    players: topology.defaultPlayers,
    description: `${name} Arena game for public play, replay review, and evaluation planning.`
  };
};

function topologyForGame(slug: string, legacyPlayers: number): GameTopology {
  if (slug === "hanabi") {
    return {
      schemaVersion: "eslams.game.topology.v2", mode: "cooperative",
      controlledPlayers: ["player_1", "player_2"], environmentPlayers: [],
      minPlayers: 2, maxPlayers: 2, defaultPlayers: 2,
      winnerRequired: false, drawAllowed: false, placementsAllowed: false,
      scoreType: "cooperative_score",
    };
  }
  if (soloScoreGames.has(slug)) {
    const scoreType: GameScoreType = ["cartpole", "mountain-car", "bipedal-walker"].includes(slug) ? "survival" : "reward";
    return {
      schemaVersion: "eslams.game.topology.v1",
      mode: "solo_score",
      evaluatedPlayer: "player_1",
      controlledPlayers: ["player_1"],
      environmentPlayers: [],
      minPlayers: 1,
      maxPlayers: 1,
      defaultPlayers: 1,
      winnerRequired: false,
      drawAllowed: false,
      placementsAllowed: false,
      scoreType
    };
  }
  if (multiSeatGames.has(slug)) {
    const players = Array.from({ length: legacyPlayers }, (_, index) => `player_${index + 1}`);
    return {
      schemaVersion: "eslams.game.topology.v1",
      mode: "multi_seat",
      controlledPlayers: players,
      environmentPlayers: [],
      minPlayers: legacyPlayers,
      maxPlayers: legacyPlayers,
      defaultPlayers: legacyPlayers,
      winnerRequired: true,
      drawAllowed: false,
      placementsAllowed: true,
      scoreType: multiSeatScoreType(slug)
    };
  }
  return {
    schemaVersion: "eslams.game.topology.v1",
    mode: "head_to_head",
    controlledPlayers: ["player_1", "player_2"],
    environmentPlayers: [],
    minPlayers: 2,
    maxPlayers: 2,
    defaultPlayers: 2,
    winnerRequired: true,
    drawAllowed: !["hex", "goofspiel", "first-price-sealed-bid-auction"].includes(slug),
    placementsAllowed: false,
    scoreType: headToHeadScoreType(slug)
  };
}

function surfaceForGame(slug: string): GameSurface {
  if (slug === "hanabi") {
    return { schemaVersion: "eslams.game.surface.v1", arena: "advanced_arena",
      battlefield: "disabled", benchmark: "disabled", official: "eligible",
      publicReason: "Cooperative game: both seats share a team score." };
  }
  if (soloScoreGames.has(slug)) {
    return {
      schemaVersion: "eslams.game.surface.v1",
      arena: "disabled",
      battlefield: "solo_benchmark",
      benchmark: "enabled",
      official: "eligible",
      publicReason: "This game is a solo score benchmark, not a human-vs-model Arena match."
    };
  }
  if (mainArenaGames.has(slug)) {
    return {
      schemaVersion: "eslams.game.surface.v1",
      arena: "main_arena",
      battlefield: "head_to_head",
      benchmark: "disabled",
      official: "eligible",
      publicReason: null
    };
  }
  if (multiSeatGames.has(slug)) {
    return {
      schemaVersion: "eslams.game.surface.v1",
      arena: "table_mode_pending",
      battlefield: "multi_seat",
      benchmark: "disabled",
      official: "eligible",
      publicReason: null
    };
  }
  return {
    schemaVersion: "eslams.game.surface.v1",
    arena: "advanced_arena",
    battlefield: "head_to_head",
    benchmark: "disabled",
    official: "eligible",
    publicReason: "Advanced Arena game; rules and interaction polish are required before default placement."
  };
}

function resultContractForTopology(topology: GameTopology): GameResultContract {
  if (topology.mode === "cooperative") {
    return { schemaVersion: "eslams.game.result.v2", mode: "cooperative",
      resultTypes: ["score"], scoreType: "cooperative_score", winnerRequired: false,
      drawAllowed: false, placementsAllowed: false };
  }
  if (topology.mode === "solo_score") {
    return {
      schemaVersion: "eslams.game.result.v1",
      mode: "solo_score",
      resultTypes: ["score"],
      scoreType: topology.scoreType,
      winnerRequired: false,
      drawAllowed: false,
      placementsAllowed: false,
      evaluatedPlayer: "player_1"
    };
  }
  if (topology.mode === "multi_seat") {
    return {
      schemaVersion: "eslams.game.result.v1",
      mode: "multi_seat",
      resultTypes: ["winner", "placement", "points", "chips"],
      scoreType: topology.scoreType,
      winnerRequired: true,
      drawAllowed: topology.drawAllowed,
      placementsAllowed: true
    };
  }
  return {
    schemaVersion: "eslams.game.result.v1",
    mode: "head_to_head",
    resultTypes: ["winner", "draw", "points"],
    scoreType: topology.scoreType,
    winnerRequired: true,
    drawAllowed: topology.drawAllowed,
    placementsAllowed: false
  };
}

function helpForGame(slug: string, name: string, topology: GameTopology): GameHelp {
  const override = helpOverrides[slug];
  if (override) return override;
  const hiddenInfoSummary = hiddenInfoGames.has(slug) ? "Some information is hidden until actions reveal it." : null;
  if (topology.mode === "solo_score") {
    return {
      schemaVersion: "eslams.game.help.v1",
      objective: `Control the agent in ${name} to maximize the benchmark score.`,
      turnRules: ["One evaluated player chooses actions against the environment."],
      legalActionSummary: "Choose one legal control action from the current state.",
      scoringSummary: "The primary score is the episode reward or task completion score.",
      winLossDrawSummary: "There is no opponent and no winner; results are reported as scores.",
      hiddenInfoSummary,
      firstMoveTip: "Prefer actions that keep the episode stable and gather reward.",
      exampleActions: [{ token: "0", label: "Action 0", explanation: "Applies the first legal environment control action." }],
      detailSections: []
    };
  }
  if (topology.mode === "multi_seat") {
    return {
      schemaVersion: "eslams.game.help.v1",
      objective: `Play ${name} from an explicit table seat and finish with the best placement or score.`,
      turnRules: ["Seats act in table order according to the variant rules."],
      legalActionSummary: "Choose a legal table action for the active seat.",
      scoringSummary: "Final placements, points, chips, or role results are reported by the result contract.",
      winLossDrawSummary: "Multi-seat results name the winning seat and placement order when available.",
      hiddenInfoSummary,
      firstMoveTip: "Check your seat, role, and visible table state before choosing an action.",
      exampleActions: [{ token: "pass", label: "Pass", explanation: "Declines the current opportunity when the rules allow it." }],
      detailSections: []
    };
  }
  return {
    schemaVersion: "eslams.game.help.v1",
    objective: `Win ${name} by making legal moves that satisfy the game objective.`,
    turnRules: ["Player 1 and Player 2 alternate or commit actions according to the variant rules."],
    legalActionSummary: "Choose one legal action shown by the current game state.",
    scoringSummary: "The result contract reports winner, draw, points, and final scores.",
    winLossDrawSummary: "A winner is reported unless the game rules allow a draw.",
    hiddenInfoSummary,
    firstMoveTip: "Start with a central, flexible, or information-gathering action when available.",
    exampleActions: [{ token: "0", label: "First legal action", explanation: "Applies a legal action token from the current state." }],
    detailSections: []
  };
}

function renderSpecForGame(slug: string, category: GameCatalogCategory, topology: GameTopology): GameRenderSpec {
  const rendererFamily = rendererFamilyForGame(slug, category, topology);
  const seatLayout = slug === "bridge"
    ? "compass"
    : topology.mode === "solo_score"
      ? "solo_panel"
      : topology.mode === "multi_seat"
        ? "table_ring"
        : "two_sides";
  return {
    schemaVersion: "eslams.game.render.v1",
    rendererFamily,
    boardSize: boardSizes[slug] ?? null,
    seatLayout,
    hiddenInfo: hiddenInfoGames.has(slug),
    supportsReplay: true,
    supportsLiveFrame: true
  };
}

function animationSpecForGame(slug: string, renderSpec: GameRenderSpec): GameAnimationSpec {
  const family = animationFamilyByGame[slug] ?? renderSpec.rendererFamily.replace(/_/gu, "-");
  return {
    schemaVersion: "eslams.game.animation.v1",
    family,
    defaultMoveMs: slug === "connect-four" ? 320 : 220,
    defaultRevealMs: hiddenInfoGames.has(slug) ? 300 : 180,
    defaultResultMs: 520,
    reducedMotionBehavior: "static_final_state",
    events: {
      move: { kind: family },
      result: { kind: "result_summary" }
    }
  };
}

function rendererFamilyForGame(slug: string, category: GameCatalogCategory, topology: GameTopology): GameRendererFamily {
  const direct: Partial<Record<string, GameRendererFamily>> = {
    "tic-tac-toe": "grid_3x3",
    "connect-four": "connect_four",
    othello: "square_board",
    chess: "square_board",
    go: "go_board",
    gomoku: "go_board",
    hex: "hex_board",
    "ultimate-tic-tac-toe": "grid_3x3",
    battleship: "square_board",
    // Bespoke layouts share the custom family contract rather than pretending
    // to be rectangular square boards. Game-specific rendering still keys on
    // the canonical slug.
    mancala: "custom",
    "nine-mens-morris": "custom",
    pentago: "custom",
    backgammon: "custom",
    shogi: "custom",
    xiangqi: "custom",
    "prisoners-dilemma": "payoff_matrix",
    "rock-paper-scissors": "payoff_matrix",
    "first-price-sealed-bid-auction": "auction_panel",
    "liars-dice": "dice_table",
    // Core models Blackjack as a one-player score game, but its public state is
    // still a card table. Topology must not collapse its watch/replay renderer
    // into the generic control-benchmark presentation.
    blackjack: "card_table"
  };
  const mapped = direct[slug];
  if (mapped) return mapped;
  if (topology.mode === "solo_score") return "control_benchmark";
  if (category === "card") return "card_table";
  if (category === "gametheory") return "economic_panel";
  return "square_board";
}

function headToHeadScoreType(slug: string): GameScoreType {
  return ["goofspiel", "first-price-sealed-bid-auction", "bargaining", "negotiation"].includes(slug)
    ? "points"
    : "win_loss_draw";
}

function multiSeatScoreType(slug: string): GameScoreType {
  if (["leduc-holdem", "limit-texas-holdem", "no-limit-texas-holdem"].includes(slug)) return "chips";
  if (["bridge", "hearts", "spades", "euchre"].includes(slug)) return "points";
  return "placement";
}

const animationFamilyByGame: Record<string, string> = {
  "tic-tac-toe": "tic_tac_toe_mark",
  "connect-four": "connect_four_drop",
  othello: "othello_flip",
  chess: "chess_piece_move",
  go: "go_stone_place",
  gomoku: "gomoku_line",
  hex: "hex_path",
  "ultimate-tic-tac-toe": "ultimate_tic_tac_toe_board",
  battleship: "battleship_shot",
  goofspiel: "goofspiel_reveal",
  "rock-paper-scissors": "simultaneous_reveal",
  "prisoners-dilemma": "payoff_matrix_reveal",
  "first-price-sealed-bid-auction": "sealed_bid_reveal"
};

const helpOverrides: Record<string, GameHelp> = {
  "tic-tac-toe": {
    schemaVersion: "eslams.game.help.v1",
    objective: "Place three marks in a row before the opponent does.",
    turnRules: ["Players alternate placing one mark in an empty cell."],
    legalActionSummary: "Choose any empty cell.",
    scoringSummary: "Three in a row wins; a full board without three is a draw.",
    winLossDrawSummary: "The result is a win, loss, or draw.",
    hiddenInfoSummary: null,
    firstMoveTip: "The center and corners give the most future lines.",
    exampleActions: [{ token: "4", label: "Center cell", explanation: "Places your mark in the center cell." }],
    detailSections: []
  },
  "connect-four": {
    schemaVersion: "eslams.game.help.v1",
    objective: "Connect four discs in a row before the opponent does.",
    turnRules: ["Players alternate dropping one disc into a non-full column."],
    legalActionSummary: "Choose a column where a disc can fall.",
    scoringSummary: "First four-in-a-row wins; a full board without four is a draw.",
    winLossDrawSummary: "The result is a win, loss, or draw.",
    hiddenInfoSummary: null,
    firstMoveTip: "Center columns usually create more threats.",
    exampleActions: [{ token: "3", label: "Drop in column 4", explanation: "Drops a disc into the fourth column." }],
    detailSections: []
  },
  battleship: {
    schemaVersion: "eslams.game.help.v1",
    objective: "Sink all opponent ships before yours are sunk.",
    turnRules: ["Players alternate firing at an unshot target cell."],
    legalActionSummary: "Choose a target coordinate that has not been fired on.",
    scoringSummary: "The first player to sink every enemy ship wins.",
    winLossDrawSummary: "The result names the surviving fleet or terminal reason.",
    hiddenInfoSummary: "Ship locations are hidden until hits reveal them.",
    firstMoveTip: "After a hit, probe neighboring cells.",
    exampleActions: [{ token: "fire:B4", label: "Fire at B4", explanation: "Attacks the B4 target cell." }],
    detailSections: []
  }
};

export const GAME_CATALOG = [
  entry("chess", "Chess", "board", "standard", "hard", "playable"),
  entry("go", "Go", "board", "board_9x9", "hard", "playable"),
  entry("connect-four", "Connect Four", "board", "standard", "easy", "playable"),
  entry("tic-tac-toe", "Tic-Tac-Toe", "board", "standard", "easy", "playable"),
  entry("othello", "Othello", "board", "standard", "medium", "playable"),
  entry("checkers", "Checkers", "board", "standard", "medium", "playable"),
  entry("shogi", "Shogi", "board", "core_compact_shogi", "hard", "playable"),
  entry("xiangqi", "Xiangqi", "board", "core_compact_xiangqi", "hard", "playable"),
  entry("gomoku", "Gomoku", "board", "standard", "medium", "playable"),
  entry("hex", "Hex", "board", "standard", "hard", "playable"),
  entry("mancala", "Mancala", "board", "standard", "easy", "playable"),
  entry("nine-mens-morris", "Nine Men's Morris", "board", "standard", "medium", "playable"),
  entry("pentago", "Pentago", "board", "standard", "medium", "playable"),
  entry("ultimate-tic-tac-toe", "Ultimate Tic-Tac-Toe", "board", "standard", "medium", "playable"),
  entry("battleship", "Battleship", "board", "standard", "easy", "playable"),
  entry("backgammon", "Backgammon", "board", "standard", "medium", "playable"),
  entry("blackjack", "Blackjack", "card", "core_hit_stand_s17", "easy", "playable", 1),
  entry("leduc-holdem", "Leduc Hold'em", "card", "core_compact_leduc_fixed_menu", "medium", "playable", 4),
  entry("limit-texas-holdem", "Limit Texas Hold'em", "card", "core_compact_holdem_fixed_menu_limit", "hard", "playable", 4),
  entry("no-limit-texas-holdem", "No-Limit Texas Hold'em", "card", "core_compact_holdem_fixed_menu_no_limit", "hard", "playable", 4),
  entry("shedding-card-game", "Shedding Card Game", "card", "core_rank_suit_shedding", "easy", "playable"),
  entry("gin-rummy", "Gin Rummy", "card", "core_compact_gin", "medium", "playable"),
  entry("mahjong", "Mahjong", "card", "core_compact_draw_discard", "hard", "playable", 4),
  entry("dou-dizhu", "Dou Dizhu", "card", "core_landlord_shedding", "hard", "playable", 3),
  entry("bridge", "Bridge", "card", "core_compact_bridge_play_phase", "hard", "playable", 4),
  entry("hearts", "Hearts", "card", "core_penalty_tricks", "medium", "playable"),
  entry("spades", "Spades", "card", "core_trump_tricks", "medium", "playable"),
  entry("euchre", "Euchre", "card", "core_call_and_play", "medium", "playable"),
  entry("cribbage", "Cribbage", "card", "core_discard_showdown", "medium", "playable"),
  entry("crazy-eights", "Crazy Eights", "card", "core_wild_eight_shedding", "easy", "playable"),
  entry("hanabi", "Hanabi", "card", "core_compact_hanabi", "hard", "playable"),
  entry("prisoners-dilemma", "Prisoner's Dilemma", "gametheory", "core_one_shot_matrix", "easy", "playable"),
  entry("bargaining", "Bargaining", "gametheory", "core_bilateral_split", "medium", "playable"),
  entry("negotiation", "Negotiation", "gametheory", "core_price_delivery_grid", "hard", "playable"),
  entry(
    "first-price-sealed-bid-auction",
    "First-Price Sealed-Bid Auction",
    "gametheory",
    "core_two_bidder_private_values",
    "medium",
    "playable"
  ),
  entry("liars-dice", "Liar's Dice", "card", "core_single_round", "medium", "playable"),
  entry("goofspiel", "Goofspiel", "card", "core_five_card_goofspiel", "medium", "playable"),
  entry("rock-paper-scissors", "Rock Paper Scissors", "gametheory", "core_one_shot_hidden_commit", "easy", "playable"),
  entry("taxi", "Taxi", "rl", "standard", "easy", "playable", 1),
  entry("frozen-lake", "Frozen Lake", "rl", "standard", "easy", "playable", 1),
  entry("cliff-walking", "Cliff Walking", "rl", "standard", "easy", "playable", 1),
  entry("cartpole", "CartPole", "rl", "standard", "easy", "playable", 1),
  entry("mountain-car", "Mountain Car", "rl", "standard", "medium", "playable", 1),
  entry("lunar-lander", "Lunar Lander", "rl", "lander-lite", "medium", "playable", 1),
  entry("car-racing", "Car Racing", "rl", "standard", "hard", "playable", 1),
  entry("bipedal-walker", "Bipedal Walker", "rl", "standard", "hard", "playable", 1),
  entry("paddle-ball", "Paddle Ball", "rl", "standard", "easy", "playable", 1),
  entry("alien-shooter", "Alien Shooter", "rl", "standard", "medium", "playable", 1),
  entry("boxing-style-arena", "Boxing Style Arena", "rl", "standard", "medium", "playable", 2),
  entry("ice-hockey-style-arena", "Ice Hockey Style Arena", "rl", "standard", "medium", "playable", 2)
] as const satisfies readonly GameCatalogEntry[];

export const GAME_CATALOG_BY_SLUG = Object.fromEntries(GAME_CATALOG.map((game) => [game.slug, game])) as Record<
  (typeof GAME_CATALOG)[number]["slug"],
  (typeof GAME_CATALOG)[number]
>;
