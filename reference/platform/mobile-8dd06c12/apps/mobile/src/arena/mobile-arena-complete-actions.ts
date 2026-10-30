import type { ArenaStageLegalAction } from "./mobile-arena-gateway";

export type MobileCompleteActionSummary = Readonly<{
  complete: boolean;
  count: number;
  description: string;
  enabledCount: number;
  expectedCount: number | null;
  unavailableCount: number;
}>;

export function mobileCompleteActionSummary(
  actions: readonly ArenaStageLegalAction[],
  expectedCount: number | null,
): MobileCompleteActionSummary {
  const complete = expectedCount === null || expectedCount === actions.length;
  const unavailableCount = actions.filter((action) => action.disabledReason !== null).length;
  const enabledCount = actions.length - unavailableCount;
  const suppliedDescription = [
    `${actions.length} ${actions.length === 1 ? "action" : "actions"} supplied.`,
    `${enabledCount} enabled.`,
    unavailableCount > 0 ? `${unavailableCount} unavailable.` : null,
  ].filter((part): part is string => part !== null).join(" ");
  return Object.freeze({
    complete,
    count: actions.length,
    description: complete
      ? suppliedDescription
      : `Showing ${actions.length} of ${expectedCount} actions supplied by the live match. ${enabledCount} enabled. Refresh actions to request the complete set.`,
    enabledCount,
    expectedCount,
    unavailableCount,
  });
}

export function mobileCompleteActionAccessibilityLabel(action: ArenaStageLegalAction): string {
  const parts = [
    action.label,
    action.category ? `Category ${action.category}` : null,
    action.group ? `Group ${action.group}` : null,
    action.disabledReason ? `Unavailable. ${action.disabledReason}` : "Available",
    action.confirm && action.disabledReason === null ? "Confirmation required" : null,
  ];
  return parts.filter((part): part is string => part !== null).join(". ");
}
