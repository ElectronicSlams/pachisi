/**
 * Pure resolver: `system` + OS scheme -> Classic Light/Dark. Distinct from `/theme`'s
 * `resolveThemePreference`, which resolves pachisi's light/dark/system DOM preference.
 *
 * Source: eSlamsPlatform @ 8dd06c12819b062d983ca68f05b2c5213e43d9b8 (main, 2026-08-02),
 * packages/theme-tokens/src/resolution.ts. Unchanged apart from this header. The package was
 * removed from the Platform in 8b88fde0 (2026-08-16); persistence.ts was not ported because
 * pachisi's `/theme` entry already owns preference storage (`es-theme`).
 */
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
