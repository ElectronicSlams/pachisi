import { isMatchVisibility, type MatchVisibility } from "@eslams/core-types";

export function mobileArenaDefaultVisibility(value: unknown): MatchVisibility {
  return isMatchVisibility(value) ? value : "only_me";
}
