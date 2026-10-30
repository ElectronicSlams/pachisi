import type { GameRendererFamily } from "@eslams/core-types";
import type { AudioSource } from "expo-audio";

import type { SoundCueId } from "./feedback-contract";

export const MOVE_SOUND_SOURCES = Object.freeze({
  grid_3x3: require("@/assets/production/audio/runtime/move_grid_3x3.wav"),
  connect_four: require("@/assets/production/audio/runtime/move_connect_four.wav"),
  square_board: require("@/assets/production/audio/runtime/move_square_board.wav"),
  go_board: require("@/assets/production/audio/runtime/move_go_board.wav"),
  hex_board: require("@/assets/production/audio/runtime/move_hex_board.wav"),
  card_table: require("@/assets/production/audio/runtime/move_card_table.wav"),
  dice_table: require("@/assets/production/audio/runtime/move_dice_table.wav"),
  auction_panel: require("@/assets/production/audio/runtime/move_auction_panel.wav"),
  payoff_matrix: require("@/assets/production/audio/runtime/move_payoff_matrix.wav"),
  control_benchmark: require("@/assets/production/audio/runtime/move_control_benchmark.wav"),
  economic_panel: require("@/assets/production/audio/runtime/move_economic_panel.wav"),
  custom: require("@/assets/production/audio/runtime/move_custom.wav"),
} as const satisfies Record<GameRendererFamily, AudioSource>);

export const SOUND_SOURCES: Readonly<Record<SoundCueId, AudioSource>> = Object.freeze({
  piece_arrival: require("@/assets/production/audio/runtime/piece_arrival.wav"),
  result_chord: require("@/assets/production/audio/runtime/result_chord.wav"),
  ...Object.fromEntries(
    Object.entries(MOVE_SOUND_SOURCES).map(([family, source]) => [`move_${family}`, source]),
  ),
}) as Readonly<Record<SoundCueId, AudioSource>>;
