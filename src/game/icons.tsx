import React from "react";
import type { ReactNode } from "react";

/** Line glyphs drawn on a 24px grid in currentColor. Content, never accent. */
const gameGlyphs: Readonly<Record<string, ReactNode>> = {
  chess: <path d="M9 21h6M8 18h8l-1-3H9zM10 15l-.5-3M14 15l.5-3M9.5 12h5M12 4a2 2 0 0 1 1 3.7L13 9h-2l-1-1.3A2 2 0 0 1 12 4z" />,
  "tic-tac-toe": <><path d="M9 4v16M15 4v16M4 9h16M4 15h16" /><path d="M5.5 5.5l2.5 2.5M8 5.5L5.5 8" /><circle cx="18" cy="12" r="1.8" /></>,
  "ultimate-tic-tac-toe": <><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" /></>,
  "connect-four": <><rect x="4" y="5" width="16" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1.6" /><circle cx="9" cy="15" r="1.6" /><circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none" /></>,
  othello: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>,
  go: <><path d="M4 8h16M4 16h16M8 4v16M16 4v16" opacity="0.55" /><circle cx="8" cy="8" r="2.4" fill="currentColor" stroke="none" /><circle cx="16" cy="16" r="2.4" /></>,
  gomoku: <><path d="M4 7h16M4 12h16M4 17h16M7 4v16M12 4v16M17 4v16" opacity="0.5" /><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" /></>,
  hex: <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />,
  checkers: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /></>,
  battleship: <><path d="M3 15h18l-2.5 4h-13z" /><path d="M7 15v-4h8l2 4M10 11V7h3" /></>,
  "rock-paper-scissors": <><circle cx="8" cy="8" r="3" /><rect x="13" y="5" width="6" height="7" rx="1" /><path d="M8 14l4 6M16 14l-4 6" /></>,
  "prisoners-dilemma": <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 4v16M4 12h16" /></>,
  "first-price-sealed-bid-auction": <><path d="M14 4l6 6-3 3-6-6zM12.5 8.5L5 16l3 3 7.5-7.5" /><path d="M4 21h9" /></>,
  goofspiel: <><rect x="5" y="4" width="10" height="14" rx="1.6" /><rect x="9" y="6" width="10" height="14" rx="1.6" /></>,
  shogi: <><path d="M12 3l6 4v13H6V7zM9 10h6M9 14h6M12 8v9" /></>,
  xiangqi: <><circle cx="12" cy="12" r="8" /><path d="M8 9h8M8 15h8M10 7v10M14 7v10" /></>,
  mancala: <><rect x="2" y="6" width="20" height="12" rx="5" /><path d="M5 9v6M19 9v6" /><circle cx="9" cy="10" r="1" /><circle cx="14" cy="10" r="1" /><circle cx="9" cy="14" r="1" /><circle cx="14" cy="14" r="1" /></>,
  "nine-mens-morris": <><rect x="3" y="3" width="18" height="18" /><rect x="7" y="7" width="10" height="10" /><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="3" r="1.5" fill="currentColor" /></>,
  pentago: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18M3 12h18M6 6h3v3" /><circle cx="16" cy="16" r="2" /></>,
  backgammon: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M7 4l2 7 2-7M13 20l2-7 2 7M12 4v16" /><circle cx="6" cy="16" r="2" /></>,
  blackjack: <><rect x="3" y="5" width="10" height="15" rx="2" /><rect x="11" y="3" width="10" height="15" rx="2" /><path d="M14 7h4l-4 5h4M6 10v5" /></>,
  "leduc-holdem": <><rect x="4" y="4" width="8" height="12" rx="1" /><rect x="12" y="7" width="8" height="12" rx="1" /><circle cx="8" cy="19" r="2" /><path d="M15 10v6" /></>,
  "limit-texas-holdem": <><rect x="3" y="4" width="10" height="14" rx="2" /><path d="M9 7h10v13H9M6 9h4M6 12h4M14 11h3M14 15h3" /></>,
  "no-limit-texas-holdem": <><rect x="3" y="3" width="10" height="14" rx="2" /><path d="M9 6h11v14H9" /><circle cx="6" cy="20" r="2" /><circle cx="16" cy="12" r="2.5" /></>,
  "shedding-card-game": <><rect x="4" y="5" width="9" height="14" rx="2" /><path d="M13 8h7M17 5l3 3-3 3M7 9v6M5 12h4" /></>,
  "gin-rummy": <><rect x="3" y="6" width="6" height="14" rx="1" /><rect x="9" y="4" width="6" height="14" rx="1" /><rect x="15" y="2" width="6" height="14" rx="1" /><path d="M5 11h2M11 9h2M17 7h2" /></>,
  mahjong: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8v7H8zM12 5v13" /></>,
  "dou-dizhu": <><rect x="3" y="8" width="6" height="12" rx="1" /><rect x="9" y="6" width="6" height="12" rx="1" /><rect x="15" y="8" width="6" height="12" rx="1" /><path d="M9 4l3-2 3 2" /></>,
  bridge: <><path d="M3 17h18M4 17V8M20 17V8M4 11c3-8 13-8 16 0M8 7v10M16 7v10" /><rect x="10" y="12" width="4" height="7" rx="1" /></>,
  hearts: <path d="M12 20L4 12C-1 5 8 1 12 7c4-6 13-2 8 5z" />,
  spades: <><path d="M12 3l8 8c4 5-3 9-7 4l1 6h-4l1-6c-4 5-11 1-7-4z" /></>,
  euchre: <><rect x="4" y="3" width="12" height="17" rx="2" /><path d="M8 7h4v5c0 3-4 3-4 0M16 8h4v13h-9" /></>,
  cribbage: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 8v4M15 12v4" /><circle cx="7" cy="15" r=".6" /><circle cx="11" cy="9" r=".6" /><circle cx="11" cy="15" r=".6" /><circle cx="17" cy="9" r=".6" /></>,
  "crazy-eights": <><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="9" r="2.5" /><circle cx="12" cy="14" r="2.5" /></>,
  hanabi: <><path d="M12 12V3M12 12l7-7M12 12h9M12 12l7 7M12 12v9M12 12l-7 7M12 12H3M12 12L5 5" /><circle cx="12" cy="12" r="2" /></>,
  "liars-dice": <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="8" cy="8" r="1" fill="currentColor" /><circle cx="16" cy="8" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="8" cy="16" r="1" fill="currentColor" /><circle cx="16" cy="16" r="1" fill="currentColor" /></>,
  bargaining: <><path d="M3 11l5-5 4 3 4-3 5 5-9 9zM8 6l-2-2M16 6l2-2M8 13l4 4 4-4" /></>,
  negotiation: <><path d="M3 4h13v9H9l-4 4v-4H3zM16 8h5v12l-4-3h-6v-4" /><path d="M6 8h7" /></>,
  taxi: <><path d="M4 12l2-5h12l2 5v7H4zM9 7V4h6v3M4 12h16" /><circle cx="7" cy="16" r="1" /><circle cx="17" cy="16" r="1" /></>,
  "frozen-lake": <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /><circle cx="12" cy="12" r="2" /><path d="M17 5l2 2M19 5l-2 2" /></>,
  "cliff-walking": <><path d="M3 19h6l2-8h10M3 8h5l3 3M13 14v4M17 14v6M21 14v7" /><circle cx="5" cy="4" r="1.5" /></>,
  cartpole: <><path d="M2 21h20M12 15L16 3" /><rect x="6" y="15" width="12" height="4" rx="1" /><circle cx="8" cy="20" r="1" /><circle cx="16" cy="20" r="1" /><circle cx="16" cy="3" r="1" /></>,
  "mountain-car": <><path d="M2 18q5-11 10 0q5 4 10-13M18 5h4v5" /><path d="M5 12h5v4H5z" /><circle cx="6" cy="17" r="1" /><circle cx="10" cy="17" r="1" /></>,
  "lunar-lander": <><path d="M8 4l4-2 4 2v8H8zM8 12l-4 7H2M16 12l4 7h2M10 13l2 6 2-6M7 22h10" /></>,
  "car-racing": <><path d="M5 2v20M19 2v20M12 2v3M12 19v3" /><rect x="9" y="7" width="6" height="10" rx="2" /><path d="M9 10h6M7 9v3M17 9v3M7 14v2M17 14v2" /></>,
  "bipedal-walker": <><circle cx="12" cy="4" r="2" /><path d="M12 6v7l-5 8M12 13l6 7M6 10l6-2 6 3M2 22h20" /></>,
  "paddle-ball": <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 18h8M9 13l5-5" /><circle cx="15" cy="7" r="2" /></>,
  "alien-shooter": <><path d="M7 4h10v7H7zM5 7h14M9 2v2M15 2v2M9 11v2M15 11v2M8 21v-4h8v4M12 17v-3" /><circle cx="10" cy="7" r=".6" /><circle cx="14" cy="7" r=".6" /></>,
  "boxing-style-arena": <><path d="M4 14V9a3 3 0 0 1 6 0v2h3v7H6zM13 9V6a3 3 0 0 1 6 0v6l-2 4h-4M6 18v3h7v-3" /></>,
  "ice-hockey-style-arena": <><path d="M5 3l9 15h6v3h-8L3 5M19 4L9 18" /><ellipse cx="6" cy="20" rx="3" ry="1.5" /></>,
};

const categoryGlyphs: Readonly<Record<string, ReactNode>> = {
  board: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h16M4 14h16M9 4v16M14 4v16" /></>,
  card: <><rect x="4" y="3" width="11" height="15" rx="2" /><path d="M9 7l2 3-2 3-2-3z" fill="currentColor" stroke="none" /><rect x="9" y="7" width="11" height="14" rx="2" opacity="0.5" /></>,
  gametheory: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  rl: <><path d="M3 14c2 0 2-6 4-6s2 8 4 8 2-10 4-10 2 8 4 8" /><path d="M3 19h18" opacity="0.4" /></>,
};

const categories: Readonly<Record<string,string>> = { Board: "board", Card: "card", Strategy: "gametheory", RL: "rl" };

export function GameGlyph({ slug, category = "Board", size = 20, className, variation = "outline" }: {
  readonly slug: string; readonly category?: string; readonly size?: number; readonly className?: string;
  readonly variation?: "outline" | "emphasis";
}) {
  const categoryKey = Object.hasOwn(categories, category) ? categories[category]! : category;
  const known = Object.hasOwn(gameGlyphs, slug);
  return <svg aria-hidden="true" className={className} fill="none" height={size} width={size}
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={variation === "emphasis" ? 2 : 1.6}
    viewBox="0 0 24 24" data-game-icon={known ? slug : "unknown"} data-icon-variation={variation}>
    {known ? gameGlyphs[slug] : (Object.hasOwn(categoryGlyphs, categoryKey) ? categoryGlyphs[categoryKey] : categoryGlyphs.board)}
  </svg>;
}
