import { GAME_DEMONSTRATIONS } from "./demos";

export type GameAnimation = {
  readonly name: string;
  readonly category: "Board" | "Card" | "Strategy" | "RL";
  readonly frames: number;
};

/** Bundled demonstrations, not match data. Unknown games never borrow another game's sequence. */
const CATALOGUE_ANIMATIONS: Readonly<Record<string, Omit<GameAnimation, "frames">>> = {
  "chess": {"name": "Chess", "category": "Board"},
  "go": {"name": "Go", "category": "Board"},
  "connect-four": {"name": "Connect Four", "category": "Board"},
  "tic-tac-toe": {"name": "Tic-Tac-Toe", "category": "Board"},
  "othello": {"name": "Othello", "category": "Board"},
  "checkers": {"name": "Checkers", "category": "Board"},
  "shogi": {"name": "Shogi", "category": "Board"},
  "xiangqi": {"name": "Xiangqi", "category": "Board"},
  "gomoku": {"name": "Gomoku", "category": "Board"},
  "hex": {"name": "Hex", "category": "Board"},
  "mancala": {"name": "Mancala", "category": "Board"},
  "nine-mens-morris": {"name": "Nine Men's Morris", "category": "Board"},
  "pentago": {"name": "Pentago", "category": "Board"},
  "ultimate-tic-tac-toe": {"name": "Ultimate Tic-Tac-Toe", "category": "Board"},
  "battleship": {"name": "Battleship", "category": "Board"},
  "backgammon": {"name": "Backgammon", "category": "Board"},
  "blackjack": {"name": "Blackjack", "category": "Card"},
  "leduc-holdem": {"name": "Leduc Hold'em", "category": "Card"},
  "limit-texas-holdem": {"name": "Limit Texas Hold'em", "category": "Card"},
  "no-limit-texas-holdem": {"name": "No-Limit Texas Hold'em", "category": "Card"},
  "shedding-card-game": {"name": "Shedding Card Game", "category": "Card"},
  "gin-rummy": {"name": "Gin Rummy", "category": "Card"},
  "mahjong": {"name": "Mahjong", "category": "Card"},
  "dou-dizhu": {"name": "Dou Dizhu", "category": "Card"},
  "bridge": {"name": "Bridge", "category": "Card"},
  "hearts": {"name": "Hearts", "category": "Card"},
  "spades": {"name": "Spades", "category": "Card"},
  "euchre": {"name": "Euchre", "category": "Card"},
  "cribbage": {"name": "Cribbage", "category": "Card"},
  "crazy-eights": {"name": "Crazy Eights", "category": "Card"},
  "hanabi": {"name": "Hanabi", "category": "Card"},
  "prisoners-dilemma": {"name": "Prisoner's Dilemma", "category": "Strategy"},
  "bargaining": {"name": "Bargaining", "category": "Strategy"},
  "negotiation": {"name": "Negotiation", "category": "Strategy"},
  "first-price-sealed-bid-auction": {"name": "First-Price Sealed-Bid Auction", "category": "Strategy"},
  "liars-dice": {"name": "Liar's Dice", "category": "Card"},
  "goofspiel": {"name": "Goofspiel", "category": "Card"},
  "rock-paper-scissors": {"name": "Rock Paper Scissors", "category": "Strategy"},
  "taxi": {"name": "Taxi", "category": "RL"},
  "frozen-lake": {"name": "Frozen Lake", "category": "RL"},
  "cliff-walking": {"name": "Cliff Walking", "category": "RL"},
  "cartpole": {"name": "CartPole", "category": "RL"},
  "mountain-car": {"name": "Mountain Car", "category": "RL"},
  "lunar-lander": {"name": "Lunar Lander", "category": "RL"},
  "car-racing": {"name": "Car Racing", "category": "RL"},
  "bipedal-walker": {"name": "Bipedal Walker", "category": "RL"},
  "paddle-ball": {"name": "Paddle Ball", "category": "RL"},
  "alien-shooter": {"name": "Alien Shooter", "category": "RL"},
  "boxing-style-arena": {"name": "Boxing Style Arena", "category": "RL"},
  "ice-hockey-style-arena": {"name": "Ice Hockey Style Arena", "category": "RL"},
};

export const GAME_ANIMATIONS: Readonly<Record<string, GameAnimation>> = Object.fromEntries(Object.entries(CATALOGUE_ANIMATIONS).map(([slug, game]) => [slug, { ...game, frames: GAME_DEMONSTRATIONS[slug]!.frames.length }]));

export function gameAnimationFor(slug: string): GameAnimation | null {
  return Object.hasOwn(GAME_ANIMATIONS, slug) ? GAME_ANIMATIONS[slug]! : null;
}
