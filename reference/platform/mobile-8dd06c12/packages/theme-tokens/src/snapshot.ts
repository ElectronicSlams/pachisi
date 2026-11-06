import { THEME_IDS, TOKEN_NAMES } from "./contract";
import { THEMES } from "./themes";

export const THEME_TOKEN_SNAPSHOT_VERSION = "eslams.theme-tokens.v1" as const;

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
