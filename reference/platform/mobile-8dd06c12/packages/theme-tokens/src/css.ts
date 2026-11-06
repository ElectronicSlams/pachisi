import type { ThemeTokens, TokenName } from "./contract";
import { THEME_LIST } from "./themes";

export const TOKEN_CSS_VARIABLES = Object.freeze({
  background: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  surface3: "--surface-3",
  surfaceInset: "--surface-inset",
  border: "--border",
  borderStrong: "--border-strong",
  borderFaint: "--border-faint",
  text: "--text",
  textSecondary: "--text-2",
  textTertiary: "--text-3",
  textOnAccent: "--text-on-accent",
  accent: "--accent",
  accentHover: "--accent-hover",
  accentSoft: "--accent-soft",
  accentSofter: "--accent-softer",
  accentLine: "--accent-line",
  win: "--win",
  winText: "--win-text",
  winSoft: "--win-soft",
  loss: "--loss",
  lossText: "--loss-text",
  lossSoft: "--loss-soft",
  draw: "--draw",
  drawText: "--draw-text",
  drawSoft: "--draw-soft",
  boardLight: "--board-light",
  boardDark: "--board-dark",
  boardLine: "--board-line",
  boardBackground: "--board-bg",
  pieceDark: "--stone-black",
  pieceLight: "--stone-white",
} as const satisfies Record<TokenName, `--${string}`>);

export function themeToCssBlock(theme: ThemeTokens): string {
  const lines = Object.entries(TOKEN_CSS_VARIABLES).map(
    ([token, variable]) => `  ${variable}: ${theme.color[token as TokenName]};`,
  );
  lines.push(`  --theme-plane: ${theme.material.plane};`);
  lines.push(`  --theme-card-face: ${theme.material.cardFace};`);
  lines.push(`  --theme-card-back: ${theme.material.cardBack};`);
  lines.push(`  --theme-card-table: ${theme.material.cardTable};`);
  lines.push(`  --glow: ${theme.material.accentGlow};`);
  return `[data-eslams-theme="${theme.id}"] {\n${lines.join("\n")}\n}`;
}

export function renderThemeCss(): string {
  return `${THEME_LIST.map(themeToCssBlock).join("\n\n")}\n`;
}

export const THEME_CSS = renderThemeCss();
