import type { SystemColorScheme, ThemeId, ThemePreference, ThemeTokens } from "./contract";
import { THEMES } from "./themes";

export function resolveThemePreference(
  preference: ThemePreference,
  systemColorScheme: SystemColorScheme,
): ThemeId {
  if (preference !== "system") return preference;
  return systemColorScheme === "dark" ? "classic-dark" : "classic-light";
}

export function resolveTheme(
  preference: ThemePreference,
  systemColorScheme: SystemColorScheme,
): ThemeTokens {
  return THEMES[resolveThemePreference(preference, systemColorScheme)];
}
