const variantLabels: Readonly<Record<string, string>> = {
  standard: "Standard",
  board_9x9: "9 × 9 board",
  core_hit_stand_s17: "Hit or stand · dealer stands on soft 17",
  core_compact_leduc_fixed_menu: "Compact Leduc · fixed betting options",
  core_compact_holdem_fixed_menu_limit: "Compact Hold’em · limit betting",
  core_compact_holdem_fixed_menu_no_limit: "Compact Hold’em · no-limit betting",
  core_rank_suit_shedding: "Rank and suit shedding",
  core_compact_gin: "Compact Gin",
  core_compact_draw_discard: "Compact draw and discard",
  core_landlord_shedding: "Landlord shedding",
  core_compact_bridge_play_phase: "Compact Bridge · play phase",
  core_penalty_tricks: "Penalty tricks",
  core_trump_tricks: "Trump tricks",
  core_call_and_play: "Call and play",
  core_discard_showdown: "Discard and showdown",
  core_wild_eight_shedding: "Wild-eight shedding",
  core_compact_hanabi: "Compact Hanabi",
  core_one_shot_matrix: "Single-round payoff matrix",
  core_bilateral_split: "Two-player split",
  core_price_delivery_grid: "Price and delivery negotiation",
  core_two_bidder_private_values: "Two bidders · private values",
  core_single_round: "Single round",
  core_five_card_goofspiel: "Five-card Goofspiel",
  core_one_shot_hidden_commit: "Single round · hidden moves",
  "lander-lite": "Lightweight lander",
};

/** Presentation only: keep the catalogue's protocol IDs unchanged. */
export function gameVariantLabel(variant: string): string {
  return variantLabels[variant] ?? variant.replace(/^core_/u, "").replace(/[_-]/gu, " ");
}
