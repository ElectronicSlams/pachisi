import type { GameRendererFamily } from "@eslams/core-types";
import type { ThemeTokens } from "@eslams/theme-tokens";

const connectFourThemeCache = new WeakMap<ThemeTokens, ThemeTokens>();

/**
 * Adapts shared renderer ink to the mobile visual language without changing
 * the canonical app theme or the renderer used by the web product.
 *
 * Connect Four's dark piece token is intentionally near-black in the shared
 * theme. On a dark mobile board that makes a played disc look like an empty
 * well. The approved mobile compositions instead use the single accent for
 * one side and quiet secondary ink for the other.
 */
export function mobileGameBoardTheme(
  rendererFamily: GameRendererFamily,
  theme: ThemeTokens,
): ThemeTokens {
  if (rendererFamily !== "connect_four") return theme;
  const cached = connectFourThemeCache.get(theme);
  if (cached) return cached;
  const adapted = Object.freeze({
    ...theme,
    ink: Object.freeze({
      ...theme.ink,
      pieceA: theme.color.accent,
      pieceB: theme.color.textSecondary,
    }),
  });
  connectFourThemeCache.set(theme, adapted);
  return adapted;
}
