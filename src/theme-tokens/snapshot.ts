/**
 * Deterministic snapshot of every theme for visual-regression fixtures.
 *
 * Source: eSlamsPlatform @ 8dd06c12819b062d983ca68f05b2c5213e43d9b8 (main, 2026-08-02),
 * packages/theme-tokens/src/snapshot.ts. Pachisi versions its changed palette separately. The package was
 * removed from the Platform in 8b88fde0 (2026-08-16); persistence.ts was not ported because
 * pachisi's `/theme` entry already owns preference storage (`es-theme`).
 */
import { THEME_IDS, TOKEN_NAMES } from "./contract";
import { THEMES } from "./themes";

export const THEME_TOKEN_SNAPSHOT_VERSION = "pachisi.theme-tokens.v2" as const;

export function createThemeVisualSnapshot() {
  return {
    snapshotVersion: THEME_TOKEN_SNAPSHOT_VERSION,
    themeOrder: THEME_IDS,
    tokenOrder: TOKEN_NAMES,
    themes: THEME_IDS.map((id) => THEMES[id]),
  } as const;
}

export function renderThemeVisualSnapshot(): string {
  return `${JSON.stringify(createThemeVisualSnapshot(), null, 2)}\n`;
}
