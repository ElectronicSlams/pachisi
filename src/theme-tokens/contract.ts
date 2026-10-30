/**
 * Typed theme contract: six theme ids, 32 token names, ink/material shapes, result text roles.
 *
 * Source: eSlamsPlatform @ 8dd06c12819b062d983ca68f05b2c5213e43d9b8 (main, 2026-08-02),
 * packages/theme-tokens/src/contract.ts. Unchanged apart from this header. The package was
 * removed from the Platform in 8b88fde0 (2026-08-16); persistence.ts was not ported because
 * pachisi's `/theme` entry already owns preference storage (`es-theme`).
 */
export const THEME_IDS = Object.freeze([
  "classic-light",
  "classic-dark",
  "neon",
  "club",
  "arcade",
  "midnight",
] as const);

export type ThemeId = (typeof THEME_IDS)[number];
export type ThemePreference = "system" | ThemeId;
export type SystemColorScheme = "light" | "dark" | null | undefined;

export const TOKEN_NAMES = Object.freeze([
  "background",
  "surface",
  "surface2",
  "surface3",
  "surfaceInset",
  "border",
  "borderStrong",
  "borderFaint",
  "text",
  "textSecondary",
  "textTertiary",
  "textOnAccent",
  "accent",
  "accentHover",
  "accentSoft",
  "accentSofter",
  "accentLine",
  "win",
  "winText",
  "winSoft",
  "loss",
  "lossText",
  "lossSoft",
  "draw",
  "drawText",
  "drawSoft",
  "boardLight",
  "boardDark",
  "boardLine",
  "boardBackground",
  "pieceDark",
  "pieceLight",
] as const);

export type TokenName = (typeof TOKEN_NAMES)[number];
export type ThemeMode = "light" | "dark";
export type BoardSurface = "flat" | "wood" | "felt" | "phosphor" | "glass" | "void";
export type GlowBudget = "none" | "accent-only";

export type ThemeInk = {
  readonly mark: string;
  readonly pieceA: string;
  readonly pieceB: string;
};

export type ThemeMaterial = {
  readonly boardSurface: BoardSurface;
  readonly glowBudget: GlowBudget;
  readonly moveTrail: boolean;
  readonly plane: string;
  readonly inkTreatment: string;
  readonly cardFace: string;
  readonly cardBack: string;
  readonly cardTable: string;
  readonly accentGlow: string;
  readonly description: string;
};

export type ThemeTokens = {
  readonly id: ThemeId;
  readonly mode: ThemeMode;
  readonly color: Readonly<Record<TokenName, string>>;
  readonly ink: ThemeInk;
  readonly material: ThemeMaterial;
};

type RuntimeSchema<T extends string> = {
  readonly values: readonly T[];
  readonly is: (value: unknown) => value is T;
  readonly parse: (value: unknown) => T;
};

function literalSchema<const TValues extends readonly string[]>(
  name: string,
  values: TValues,
): RuntimeSchema<TValues[number]> {
  const schemaValues = Object.freeze([...values]) as readonly TValues[number][];
  const allowed = new Set<string>(schemaValues);
  const is = (value: unknown): value is TValues[number] =>
    typeof value === "string" && allowed.has(value);

  return Object.freeze({
    values: schemaValues,
    is,
    parse(value: unknown): TValues[number] {
      if (!is(value)) {
        throw new TypeError(`${name} must be one of: ${schemaValues.join(", ")}`);
      }
      return value;
    },
  });
}

export const themeIdSchema = literalSchema("ThemeId", THEME_IDS);
export const tokenNameSchema = literalSchema("TokenName", TOKEN_NAMES);
export const themePreferenceSchema = literalSchema(
  "ThemePreference",
  Object.freeze(["system", ...THEME_IDS] as const),
);

export const PRIMARY_ACCENT_TOKEN = "accent" as const satisfies TokenName;

export const RESULT_SEMANTIC_TOKENS = Object.freeze({
  win: "win",
  loss: "loss",
  draw: "draw",
} as const satisfies Record<"win" | "loss" | "draw", TokenName>);

export const RESULT_SEMANTIC_TEXT_TOKENS = Object.freeze({
  win: "winText",
  loss: "lossText",
  draw: "drawText",
} as const satisfies Record<"win" | "loss" | "draw", TokenName>);

export const ACCENT_CARRYING_ROLES = Object.freeze([
  "last-move",
  "active-seat",
  "active-dock",
  "result-sweep",
  "move-trail",
] as const);

export type AccentCarryingRole = (typeof ACCENT_CARRYING_ROLES)[number];

export const BRAND_COLORS = Object.freeze({
  royalBlue: "#1b32c4",
  storeIcon: "#1b32c4",
} as const);
