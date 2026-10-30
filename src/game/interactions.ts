/**
 * Pure legal-action presentation helpers: labels, hints and kinds for Core
 * legal-action tokens, board from/to/promotion moves, board cell targets and
 * RL control-pad slots. They describe actions a host already received as legal;
 * they never decide legality, enumerate moves or submit anything.
 *
 * Source: eSlamsPlatform @ 0fa7dfe227fe545036694c915a6b727eb4ee844a,
 * apps/web/lib/arena-interactions.ts.
 *
 * Adaptations:
 * - The `ArenaSeed` import from the Platform's product data is replaced by the
 *   minimal local `ArenaGameLike` shape below.
 * - Ultimate tic-tac-toe cell targets decode Core's `subBoard * 9 + localCell`
 *   into the visible 9x9 row/col the scene draws (the Platform read it row-major).
 * - Shogi (USI: `1g1f`, `1c1a+`, `P*5e`) and Xiangqi (`a0a1`, ranks 0-9) have
 *   their own move grammars instead of the chess one; `arenaBoardSquareToCell`
 *   maps a square to the row/col of the bundled Core board for each game.
 *
 * Note: `ArenaLegalAction.token` is rejected by the render contract's privacy
 * pattern (any key containing "token"), so legal actions travel beside a
 * display frame as `ActionTarget`s (`action` = token), never inside it.
 */
import type { GameRenderSpec } from "../contract/core-types";

/** Game category vocabulary used by the Platform's Arena data. */
export type ArenaCategory = "Board" | "Card" | "Strategy" | "RL";

/** The fields of the Platform's `ArenaSeed` these helpers read. */
export type ArenaGameLike = {
  readonly slug: string;
  readonly name: string;
  readonly category: ArenaCategory;
  readonly players: number;
  readonly topologyMode?: string;
  readonly controlledPlayers?: readonly string[];
  readonly renderSpec?: Pick<GameRenderSpec, "seatLayout">;
};

export type ArenaSide = string;

export type ArenaSideOption = {
  readonly value: ArenaSide;
  readonly label: string;
  readonly helper: string;
  readonly starts: boolean;
};

export type ArenaLegalAction = {
  readonly token: string;
  readonly label: string;
  readonly shortLabel?: string | null;
  readonly verb?: string | null;
  readonly object?: string | null;
  readonly category?: string | null;
  readonly group?: string | null;
  readonly sortKey?: string | null;
  readonly promptLabel?: string | null;
  readonly confirm?: boolean | null;
  readonly disabledReason?: string | null;
  readonly value?: unknown;
};

export type ArenaActionDescriptor = {
  readonly token: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly hint: string;
  readonly kind: "board" | "card" | "choice" | "control" | "generic";
};

export type ArenaBoardMove = {
  readonly token: string;
  /** Source square, or for a Shogi drop the USI source part (e.g. `"P*"`). */
  readonly from: string;
  readonly to: string;
  /** Chess/checkers: the promotion piece letter. Shogi: `"+"` when the move promotes. */
  readonly promotion: string | null;
  /** Shogi drops only: the dropped piece letter (uppercase, USI). Absent for board moves. */
  readonly drop?: string;
};

/** A square's position on the game's row-major Core board (row 0 = first row of `state.board`). */
export type ArenaBoardSquareCell = {
  readonly row: number;
  readonly col: number;
};

export type ArenaBoardCellAction = {
  readonly token: string;
  readonly index: number;
  readonly row: number;
  readonly col: number;
  readonly label: string;
};

export type ArenaRlControlSlot = "up" | "down" | "left" | "right" | "center";

type ArenaLike = ArenaGameLike;

const whiteBlackGames = new Set(["chess", "shogi", "xiangqi"]);
const blackWhiteGames = new Set(["othello", "go", "gomoku", "hex", "pentago", "nine-mens-morris"]);
const cardVerbLabels: Record<string, string> = {
  bet: "Bet",
  bid: "Bid",
  call: "Call",
  check: "Check",
  discard: "Discard",
  double: "Double",
  draw: "Draw",
  fold: "Fold",
  hint: "Give hint",
  hit: "Hit",
  pass: "Pass",
  play: "Play",
  raise: "Raise",
  split: "Split",
  stand: "Stand",
  stay: "Stand",
};
const controlLabels: Record<string, string> = {
  accelerate: "Accelerate",
  brake: "Brake",
  coast: "Coast",
  down: "Down",
  dropoff: "Drop off",
  fire: "Fire",
  hold: "Hold",
  idle: "Idle",
  jump: "Jump",
  left: "Left",
  main: "Main thrust",
  noop: "Wait",
  north: "Up",
  pickup: "Pick up",
  right: "Right",
  south: "Down",
  stay: "Stay",
  up: "Up",
  west: "Left",
  east: "Right",
};
const rlControlSlots: Record<ArenaRlControlSlot, readonly string[]> = {
  up: ["up", "north", "accelerate", "main", "jump", "advance", "step-in"],
  down: ["down", "south", "brake", "retreat", "step-out"],
  left: ["left", "west", "left-step", "dodge-left", "skate-left"],
  right: ["right", "east", "right-step", "dodge-right", "skate-right"],
  center: ["noop", "stay", "idle", "coast", "hold", "balance", "guard"],
};
const choiceLabels: Record<string, string> = {
  cooperate: "Cooperate",
  defect: "Defect",
  paper: "Paper",
  pass: "Pass",
  rock: "Rock",
  scissors: "Scissors",
};

export function arenaSideOptionsForGame(game: ArenaLike): ArenaSideOption[] {
  if (game.topologyMode === "multi_seat" && game.controlledPlayers?.length) {
    return game.controlledPlayers.map((seatId, index) => ({
      value: seatId,
      label: tableSeatLabel(game, seatId, index),
      helper: index === 0 ? "Acts first when the table opens." : `Seat ${index + 1} at the table.`,
      starts: index === 0,
    }));
  }
  if (game.players <= 1) {
    return [{ value: "player_1", label: pilotLabel(game), helper: "You control the run.", starts: true }];
  }
  if (game.slug === "tic-tac-toe") {
    return [
      { value: "player_1", label: "X", helper: "Move first.", starts: true },
      { value: "player_2", label: "O", helper: "The model opens.", starts: false },
    ];
  }
  if (game.slug === "connect-four") {
    return [
      { value: "player_1", label: "Red", helper: "Drop first.", starts: true },
      { value: "player_2", label: "Yellow", helper: "Model drops first.", starts: false },
    ];
  }
  if (game.slug === "checkers") {
    return [
      { value: "player_1", label: "Red", helper: "Move first.", starts: true },
      { value: "player_2", label: "Black", helper: "The model opens.", starts: false },
    ];
  }
  if (whiteBlackGames.has(game.slug)) {
    return [
      { value: "player_1", label: "White", helper: "Move first.", starts: true },
      { value: "player_2", label: "Black", helper: "The model opens.", starts: false },
    ];
  }
  if (blackWhiteGames.has(game.slug)) {
    return [
      { value: "player_1", label: "Black", helper: "Move first.", starts: true },
      { value: "player_2", label: "White", helper: "The model opens.", starts: false },
    ];
  }
  if (game.category === "Card") {
    return [
      { value: "player_1", label: "Seat A", helper: "Act first.", starts: true },
      { value: "player_2", label: "Seat B", helper: "Model acts first.", starts: false },
    ];
  }
  if (game.category === "Strategy") {
    return [
      { value: "player_1", label: "Player A", helper: "Choose first.", starts: true },
      { value: "player_2", label: "Player B", helper: "Model chooses first.", starts: false },
    ];
  }
  return [
    { value: "player_1", label: "First player", helper: "Move first.", starts: true },
    { value: "player_2", label: "Second player", helper: "Model opens.", starts: false },
  ];
}

export function arenaSideLabelForGame(game: ArenaLike, side: ArenaSide): string {
  return arenaSideOptionsForGame(game).find((item) => item.value === side)?.label ?? tableSeatLabel(game, side, Math.max(0, playerSeatIndex(side)));
}

function tableSeatLabel(game: ArenaLike, seatId: string, index: number): string {
  const compass = ["North", "East", "South", "West"];
  if (game.renderSpec?.seatLayout === "compass" && index >= 0 && index < compass.length) {
    return compass[index]!;
  }
  const parsedIndex = playerSeatIndex(seatId);
  const seatNumber = parsedIndex >= 0 ? parsedIndex + 1 : index + 1;
  if (game.category === "Card") {
    return `Seat ${seatNumber}`;
  }
  return `Player ${seatNumber}`;
}

function playerSeatIndex(seatId: string): number {
  const match = /^player_(\d+)$/u.exec(seatId);
  if (!match) {
    return -1;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value - 1 : -1;
}

export function describeArenaAction(game: Pick<ArenaGameLike, "slug" | "category">, action: ArenaLegalAction): ArenaActionDescriptor {
  const token = action.token;
  const explicitLabel = cleanText(action.label);
  const shortLabel = cleanText(action.shortLabel) ?? token;
  const tokenLabel = explicitLabel && explicitLabel !== token ? explicitLabel : null;

  if (game.slug === "connect-four") {
    const column = numberToken(token);
    if (column !== null) {
      return {
        token,
        label: `Column ${column + 1}`,
        shortLabel: `C${column + 1}`,
        hint: "Drop a disc into this column.",
        kind: "board",
      };
    }
  }

  if (game.slug === "tic-tac-toe") {
    const cell = numberToken(token);
    if (cell !== null) {
      return {
        token,
        label: ticTacToeCellLabel(cell),
        shortLabel: `Cell ${cell + 1}`,
        hint: "Place your mark on this square.",
        kind: "board",
      };
    }
  }

  if (game.slug === "checkers") {
    const move = checkersMoveFromToken(token);
    const via = [...token.matchAll(/([0-7])\s*,\s*([0-7])/gu)].slice(1,-1).map(entry => `${"abcdefgh"[Number(entry[2])]}${8-Number(entry[1])}`);
    if (move) return { token, label: `Move ${move.from}${via.length ? ` via ${via.join(" then ")}` : ""} to ${move.to}`, shortLabel: `${move.from} → ${move.to}`, hint: "Select this complete legal move or capture path.", kind: "board" };
  }

  // Checkers paths were handled above; as in the Platform, a chess-style checkers token still gets a move label.
  const chessMove = boardMoveSlugs.has(game.slug) ? boardMoveLabel(game.slug === "checkers" ? boardMoveFromToken(token) : boardMoveForGame(game.slug, token)) : null;
  if (chessMove) {
    return {
      token,
      label: tokenLabel ?? chessMove.label,
      shortLabel: chessMove.shortLabel,
      hint: "Select this legal move.",
      kind: "board",
    };
  }

  const normalizedToken = token.trim().toLowerCase().replace(/[_-]+/gu, " ");
  const simpleToken = normalizedToken.replace(/\s+/gu, " ").trim();
  const firstWord = simpleToken.split(" ")[0] ?? simpleToken;
  const categoryLabel = action.category?.toLowerCase() ?? action.group?.toLowerCase() ?? "";
  const verb = cleanText(action.verb)?.toLowerCase() ?? firstWord;

  if (game.category === "Card" || categoryLabel.includes("card") || categoryLabel.includes("bid")) {
    const label = tokenLabel ?? cardActionLabel(simpleToken, verb, action.object);
    return {
      token,
      label,
      shortLabel: shortLabelFor(label, shortLabel),
      hint: cardActionHint(label),
      kind: "card",
    };
  }

  if (game.category === "RL") {
    const label = tokenLabel ?? controlLabels[simpleToken] ?? controlLabels[verb] ?? titleCase(simpleToken);
    return {
      token,
      label,
      shortLabel: shortLabelFor(label, shortLabel),
      hint: "Apply this control for the next step.",
      kind: "control",
    };
  }

  if (game.category === "Strategy") {
    const label = tokenLabel ?? choiceLabels[simpleToken] ?? choiceLabels[verb] ?? strategyActionLabel(simpleToken);
    return {
      token,
      label,
      shortLabel: shortLabelFor(label, shortLabel),
      hint: "Commit this choice for the current turn.",
      kind: "choice",
    };
  }

  return {
    token,
    label: tokenLabel ?? titleCase(simpleToken || token),
    shortLabel: shortLabelFor(tokenLabel ?? titleCase(simpleToken || token), shortLabel),
    hint: "Submit this legal action.",
    kind: game.category === "Board" ? "board" : "generic",
  };
}

export function arenaBoardMoveFromAction(game: Pick<ArenaGameLike, "slug">, action: ArenaLegalAction): ArenaBoardMove | null {
  return boardMoveSlugs.has(game.slug) ? boardMoveForGame(game.slug, action.token) : null;
}

/**
 * Maps a square name from `arenaBoardMoveFromAction` to its row/col on the
 * game's bundled Core board (`state.board[row][col]`):
 * - chess and checkers: files a-h left to right, rank 8 is row 0;
 * - shogi: files 1-9 right to left (file 1 is col 8), ranks a-i top to bottom (a is row 0);
 * - xiangqi: files a-i left to right, rank digit 0-9 is the row (0 is the top row).
 * Returns null for anything else, including a Shogi drop source such as `"P*"`.
 */
export function arenaBoardSquareToCell(game: Pick<ArenaGameLike, "slug">, square: string): ArenaBoardSquareCell | null {
  const value = square.trim().toLowerCase();
  if (game.slug === "chess" || game.slug === "checkers") {
    const match = /^([a-h])([1-8])$/u.exec(value);
    return match ? { row: 8 - Number(match[2]), col: "abcdefgh".indexOf(match[1]!) } : null;
  }
  if (game.slug === "shogi") {
    const match = /^([1-9])([a-i])$/u.exec(value);
    return match ? { row: "abcdefghi".indexOf(match[2]!), col: 9 - Number(match[1]) } : null;
  }
  if (game.slug === "xiangqi") {
    const match = /^([a-i])([0-9])$/u.exec(value);
    return match ? { row: Number(match[2]), col: "abcdefghi".indexOf(match[1]!) } : null;
  }
  return null;
}

export function arenaBoardCellActionFromAction(
  game: Pick<ArenaGameLike, "slug">,
  action: ArenaLegalAction,
  rows: number,
  cols: number
): ArenaBoardCellAction | null {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
    return null;
  }
  const token = action.token.trim();
  const dimensions = { rows, cols };
  if (game.slug === "ultimate-tic-tac-toe") {
    return rows === 9 && cols === 9 ? ultimateCellAction(action, numberToken(token)) : null;
  }
  if (game.slug === "go" || game.slug === "gomoku" || game.slug === "hex") {
    return cellActionFromIndex(action, numberToken(token), dimensions);
  }
  if (game.slug === "othello" || game.slug === "battleship") {
    return cellActionFromCoordinate(action, coordinateToken(token), dimensions)
      ?? cellActionFromIndex(action, numberToken(token), dimensions);
  }
  return null;
}

export function arenaRlControlSlotFromAction(action: ArenaLegalAction): ArenaRlControlSlot | null {
  const token = action.token.trim().toLowerCase().replace(/[_\s]+/gu, "-");
  for (const [slot, tokens] of Object.entries(rlControlSlots) as Array<[ArenaRlControlSlot, readonly string[]]>) {
    if (tokens.includes(token)) {
      return slot;
    }
  }
  const movementText = [
    action.verb,
    action.object,
    action.shortLabel,
    action.label,
    action.promptLabel,
    action.sortKey,
  ].flatMap((value) => value ? [value.toLowerCase().replace(/[_\s]+/gu, "-")] : []);
  if (movementText.some((value) => /(^|-)left($|-)/u.test(value))) return "left";
  if (movementText.some((value) => /(^|-)right($|-)/u.test(value))) return "right";
  if (movementText.some((value) => /(^|-)up($|-)|north|advance|step-in|main-thrust|accelerate|jump/u.test(value))) return "up";
  if (movementText.some((value) => /(^|-)down($|-)|south|retreat|step-out|brake/u.test(value))) return "down";
  if (movementText.some((value) => /wait|stay|idle|coast|hold|balance|guard|noop/u.test(value))) return "center";
  return null;
}

function pilotLabel(game: Pick<ArenaGameLike, "category">): string {
  return game.category === "RL" ? "Pilot" : "Player";
}

function cleanText(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function numberToken(token: string): number | null {
  const value = Number(token);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function ticTacToeCellLabel(index: number): string {
  return [
    "Top left",
    "Top middle",
    "Top right",
    "Middle left",
    "Center",
    "Middle right",
    "Bottom left",
    "Bottom middle",
    "Bottom right",
  ][index] ?? `Cell ${index + 1}`;
}

const boardMoveSlugs = new Set(["chess", "shogi", "xiangqi", "checkers"]);

function boardMoveForGame(slug: string, token: string): ArenaBoardMove | null {
  if (slug === "checkers") return checkersMoveFromToken(token);
  if (slug === "shogi") return shogiMoveFromToken(token);
  if (slug === "xiangqi") return xiangqiMoveFromToken(token);
  return boardMoveFromToken(token);
}

function boardMoveLabel(move: ArenaBoardMove | null): { label: string; shortLabel: string } | null {
  if (!move) {
    return null;
  }
  if (move.drop) {
    return { label: `Drop ${move.drop} on ${move.to}`, shortLabel: `${move.drop}*${move.to}` };
  }
  if (move.promotion === "+") {
    return { label: `Move ${move.from} to ${move.to}, promote`, shortLabel: `${move.from}-${move.to}+` };
  }
  const promotion = move.promotion?.toUpperCase();
  return {
    label: promotion ? `Move ${move.from} to ${move.to}, promote to ${promotion}` : `Move ${move.from} to ${move.to}`,
    shortLabel: promotion ? `${move.from}-${move.to}=${promotion}` : `${move.from}-${move.to}`,
  };
}

function checkersMoveFromToken(token: string): ArenaBoardMove | null {
  const value=token.trim();
  if(!/^[0-7]\s*,\s*[0-7](?:(?:\s*-\s*|\s+)[0-7]\s*,\s*[0-7])+$/u.test(value)) return null;
  const path=[...value.matchAll(/([0-7])\s*,\s*([0-7])/gu)];
  if(path.length<2 || path.length>13) return null;
  const square=(entry:RegExpMatchArray)=>`${"abcdefgh"[Number(entry[2])]}${8-Number(entry[1])}`;
  return {token,from:square(path[0]!),to:square(path.at(-1)!),promotion:null};
}

function boardMoveFromToken(token: string): ArenaBoardMove | null {
  const compact = token.trim().replace(/[-\s]/gu, "");
  const match = compact.match(/^([a-i][1-9])([a-i][1-9])([a-z])?$/iu);
  if (!match) {
    return null;
  }
  const source = match[1]?.toLowerCase();
  const target = match[2]?.toLowerCase();
  const promotion = match[3]?.toUpperCase();
  if (!source || !target) {
    return null;
  }
  return {
    token,
    from: source,
    to: target,
    promotion: promotion?.toLowerCase() ?? null,
  };
}

/**
 * Shogi in USI notation: files 1-9, ranks a-i. A move is `<from><to>` with an
 * optional `+` for promotion (`1g1f`, `1c1a+`); a drop is `<piece>*<to>` with
 * piece one of P L N S G B R (`P*5e`).
 */
function shogiMoveFromToken(token: string): ArenaBoardMove | null {
  const compact = token.trim();
  const drop = /^([PLNSGBR])\*([1-9][a-i])$/u.exec(compact);
  if (drop) {
    return { token, from: `${drop[1]!}*`, to: drop[2]!, promotion: null, drop: drop[1]! };
  }
  const move = /^([1-9][a-i])([1-9][a-i])(\+)?$/u.exec(compact);
  if (!move || move[1] === move[2]) {
    return null;
  }
  return { token, from: move[1]!, to: move[2]!, promotion: move[3] ? "+" : null };
}

/** Xiangqi: files a-i, ranks 0-9 (`a0a1`, `b0a2`). No promotion. */
function xiangqiMoveFromToken(token: string): ArenaBoardMove | null {
  const move = /^([a-i][0-9])([a-i][0-9])$/u.exec(token.trim().toLowerCase());
  if (!move || move[1] === move[2]) {
    return null;
  }
  return { token, from: move[1]!, to: move[2]!, promotion: null };
}

/**
 * Core encodes an ultimate tic-tac-toe move as `subBoard * 9 + localCell`, both
 * row-major 3x3 indexes. The scene draws sub-board `s` at block row `floor(s/3)`,
 * block col `s % 3`, and local cell `l` at row `floor(l/3)`, col `l % 3` inside it.
 */
function ultimateCellAction(action: ArenaLegalAction, value: number | null): ArenaBoardCellAction | null {
  if (value === null || value >= 81) {
    return null;
  }
  const subBoard = Math.floor(value / 9);
  const localCell = value % 9;
  const row = Math.floor(subBoard / 3) * 3 + Math.floor(localCell / 3);
  const col = (subBoard % 3) * 3 + (localCell % 3);
  return {
    token: action.token,
    index: row * 9 + col,
    row,
    col,
    label: cleanText(action.label) ?? `Row ${row + 1}, column ${col + 1}`,
  };
}

function cellActionFromIndex(
  action: ArenaLegalAction,
  index: number | null,
  dimensions: { rows: number; cols: number }
): ArenaBoardCellAction | null {
  if (index === null || index >= dimensions.rows * dimensions.cols) {
    return null;
  }
  const row = Math.floor(index / dimensions.cols);
  const col = index % dimensions.cols;
  return {
    token: action.token,
    index,
    row,
    col,
    label: cleanText(action.label) ?? `Row ${row + 1}, column ${col + 1}`,
  };
}

function cellActionFromCoordinate(
  action: ArenaLegalAction,
  coordinate: { row: number; col: number } | null,
  dimensions: { rows: number; cols: number }
): ArenaBoardCellAction | null {
  if (!coordinate) {
    return null;
  }
  if (coordinate.row < 0 || coordinate.col < 0 || coordinate.row >= dimensions.rows || coordinate.col >= dimensions.cols) {
    return null;
  }
  return {
    token: action.token,
    index: coordinate.row * dimensions.cols + coordinate.col,
    row: coordinate.row,
    col: coordinate.col,
    label: cleanText(action.label) ?? `Row ${coordinate.row + 1}, column ${coordinate.col + 1}`,
  };
}

function coordinateToken(token: string): { row: number; col: number } | null {
  const comma = token.match(/^(\d+)\s*,\s*(\d+)$/u);
  if (comma?.[1] && comma[2]) {
    return { row: Number(comma[1]), col: Number(comma[2]) };
  }
  const jsonPair = token.match(/^\[\s*(\d+)\s*,\s*(\d+)\s*\]$/u);
  if (jsonPair?.[1] && jsonPair[2]) {
    return { row: Number(jsonPair[1]), col: Number(jsonPair[2]) };
  }
  return null;
}

function cardActionLabel(token: string, verb: string, object: string | null | undefined): string {
  const verbLabel = cardVerbLabels[token] ?? cardVerbLabels[verb] ?? titleCase(verb || token);
  const objectLabel = cleanText(object);
  if (objectLabel && !verbLabel.toLowerCase().includes(objectLabel.toLowerCase())) {
    return `${verbLabel} ${objectLabel}`;
  }
  return verbLabel;
}

function strategyActionLabel(token: string): string {
  const offer = token.match(/^(offer|bid|price)\s*(\d+(?:\.\d+)?)$/iu);
  if (offer?.[1] && offer[2]) {
    return `${titleCase(offer[1])} ${offer[2]}`;
  }
  return titleCase(token);
}

function shortLabelFor(label: string, fallback: string): string {
  if (fallback && fallback.length <= 14) {
    return fallback;
  }
  return label.length <= 14 ? label : `${label.slice(0, 12)}...`;
}

function cardActionHint(label: string): string {
  if (/fold|pass/iu.test(label)) {
    return "Leave the current contest.";
  }
  if (/hit|draw/iu.test(label)) {
    return "Take another card or tile.";
  }
  if (/bid|bet|raise|call/iu.test(label)) {
    return "Commit chips, points, or a bid.";
  }
  return "Play this legal card-table action.";
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
