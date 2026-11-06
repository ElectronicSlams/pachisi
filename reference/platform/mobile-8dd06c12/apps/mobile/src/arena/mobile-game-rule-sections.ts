import {
  mobileCapabilityForGame,
  type GameCatalogEntry,
} from "@eslams/core-types";

import { mobileGameRuleContent } from "./mobile-game-rule-content";

export type MobileGameRuleSection = Readonly<{
  body: string;
  title: string;
}>;

export function mobileGameRuleSections(game: GameCatalogEntry): readonly MobileGameRuleSection[] {
  const capability = mobileCapabilityForGame(game.slug);
  const rules = mobileGameRuleContent(game);
  return Object.freeze([
    section("Quick summary", rules.shortSummary.join(" ")),
    section("Objective", rules.objective),
    section("Full rules", rules.fullRules),
    section("Your turn", rules.turnRules),
    section("Turn example", rules.turnExample),
    section("Legal actions", rules.legalActions),
    section("Scoring", rules.scoring),
    section("Win, draw, or placement", rules.outcomes),
    section("Hidden information", rules.hiddenInformation),
    section("First move", rules.firstMoveTip),
    section(
      "Accessibility",
      capability
        ? mobileGameAccessibilityInstructions(capability.inputMode)
        : "Review the labelled board state and available controls in reading order.",
    ),
  ]);
}

export function mobileGameAccessibilityInstructions(
  inputMode: NonNullable<ReturnType<typeof mobileCapabilityForGame>>["inputMode"],
): string {
  switch (inputMode) {
    case "cell_tap": return "Open Explore board to review every labelled cell, state, and enabled target. You can also open the complete action list without using board gestures.";
    case "piece_move": return "Open Explore board, choose a labelled piece, then review and choose one of its legal destinations. The complete action list is also available without gestures.";
    case "card_action": return "Explore the hand in seat order, then activate a labelled card or use the complete action list.";
    case "simultaneous_choice": return "Choose one labelled action and confirm before hidden choices are revealed.";
    case "value_entry": return "Enter a value within the announced legal range, then confirm it.";
    case "dice_bid": return "Adjust quantity and face value with labelled controls, then submit the bid.";
    case "watch_only": return "This game is available as a labelled replay without human input.";
  }
}

function section(title: string, body: string): MobileGameRuleSection {
  return Object.freeze({ title, body });
}
