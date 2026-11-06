import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { GameCatalogEntry } from "@eslams/core-types";
import type { ColorValue } from "react-native";

type MaterialCommunityIconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Source-backed Arena glyphs translated from the design handoff into real
 * vector icons. The source prototype used text symbols; native app surfaces
 * use the closest library glyph so icons scale cleanly and remain portable.
 */
const MOBILE_GAME_GLYPHS = Object.freeze({
  "chess": "chess-knight",
  "go": "circle-outline",
  "connect-four": "view-column-outline",
  "tic-tac-toe": "close-thick",
  "othello": "circle-half-full",
  "checkers": "checkerboard",
  "shogi": "chess-rook",
  "xiangqi": "chess-king",
  "gomoku": "dots-grid",
  "hex": "hexagon-outline",
  "mancala": "dots-horizontal-circle-outline",
  "nine-mens-morris": "radiobox-marked",
  "pentago": "rotate-3d-variant",
  "ultimate-tic-tac-toe": "grid-large",
  "battleship": "ferry",
  "backgammon": "dice-multiple-outline",
  "blackjack": "cards-spade",
  "limit-texas-holdem": "cards-playing-spade-multiple-outline",
  "no-limit-texas-holdem": "cards-playing-spade-multiple",
  "gin-rummy": "cards-outline",
  "mahjong": "domino-mask",
  "dou-dizhu": "cards-club",
  "bridge": "cards-diamond",
  "hearts": "cards-heart",
  "spades": "cards-spade",
  "euchre": "clover-outline",
  "cribbage": "counter",
  "crazy-eights": "numeric-8-circle-outline",
  "hanabi": "firework",
  "prisoners-dilemma": "table-large",
  "bargaining": "handshake-outline",
  "negotiation": "swap-horizontal",
  "first-price-sealed-bid-auction": "gavel",
  "liars-dice": "dice-5-outline",
  "goofspiel": "cards-club-outline",
  "rock-paper-scissors": "hand-peace",
} as const satisfies Readonly<Record<string, MaterialCommunityIconName>>);

const CATEGORY_FALLBACKS = Object.freeze({
  board: "checkerboard",
  card: "cards-outline",
  gametheory: "strategy",
  rl: "robot-outline",
} as const satisfies Readonly<Record<GameCatalogEntry["category"], MaterialCommunityIconName>>);

export function mobileGameGlyphName(
  game: Pick<GameCatalogEntry, "category" | "slug">,
): MaterialCommunityIconName {
  return MOBILE_GAME_GLYPHS[game.slug as keyof typeof MOBILE_GAME_GLYPHS]
    ?? CATEGORY_FALLBACKS[game.category];
}

export function MobileGameGlyph({
  color,
  game,
  size,
}: Readonly<{
  color: ColorValue;
  game: Pick<GameCatalogEntry, "category" | "slug">;
  size: number;
}>) {
  return (
    <MaterialCommunityIcons
      accessible={false}
      color={color}
      name={mobileGameGlyphName(game)}
      size={size}
    />
  );
}
