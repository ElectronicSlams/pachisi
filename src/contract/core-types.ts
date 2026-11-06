/**
 * Vendored subset of `@eslams/core-types`, kept dependency-free so the render
 * contract can travel without the 537-line game catalogue.
 *
 * Source: eSlamsPlatform @ 0fa7dfe227fe545036694c915a6b727eb4ee844a
 *   - packages/core-types/src/game-render.ts          (GameRendererFamily, GameRenderSpec)
 *   - packages/core-types/src/contract-versions.ts    (six contract versions + MOBILE_MINIMUM_APP_VERSION)
 *   - packages/core-types/src/public-replay-safety.ts (key/value patterns, assertPublicReplaySafe)
 *
 * Adaptations: only the declarations the render contract uses are copied.
 * `GAME_RENDERER_FAMILIES` is new (the Platform kept the list private inside the
 * contract). The JSONL parsers and the arena replay version bundle were left
 * behind. Values and patterns are byte-for-byte the Platform's.
 */

export type GameRendererFamily =
  | "grid_3x3"
  | "connect_four"
  | "square_board"
  | "go_board"
  | "hex_board"
  | "card_table"
  | "dice_table"
  | "auction_panel"
  | "payoff_matrix"
  | "control_benchmark"
  | "economic_panel"
  | "custom";

/** Canonical order of the twelve renderer families. */
export const GAME_RENDERER_FAMILIES: readonly GameRendererFamily[] = Object.freeze([
  "grid_3x3",
  "connect_four",
  "square_board",
  "go_board",
  "hex_board",
  "card_table",
  "dice_table",
  "auction_panel",
  "payoff_matrix",
  "control_benchmark",
  "economic_panel",
  "custom",
] as const);

export type GameRenderSpec = {
  readonly schemaVersion: "eslams.game.render.v1";
  readonly rendererFamily: GameRendererFamily;
  readonly boardSize?: { readonly rows: number; readonly cols: number } | null;
  readonly seatLayout: "two_sides" | "compass" | "table_ring" | "solo_panel";
  readonly hiddenInfo: boolean;
  readonly supportsReplay: boolean;
  readonly supportsLiveFrame: boolean;
};

export const PUBLIC_STATE_VERSION = "eslams.public-state.v1" as const;
export const DISPLAY_FRAME_VERSION = "eslams.replay.display_frame.v1" as const;
export const SCENE_SCHEMA_VERSION = "eslams.scene.v1" as const;
export const RENDERER_CONTRACT_VERSION = "eslams.renderer.v1" as const;
export const RENDER_ADAPTER_VERSION = "eslams.render-adapter.v1" as const;
export const THEME_TOKEN_REFERENCE_VERSION = "eslams.theme-tokens.v1" as const;
export const MOBILE_MINIMUM_APP_VERSION = "1.0.0" as const;

export const PUBLIC_REPLAY_FORBIDDEN_KEY_PATTERN =
  /private|secret|hidden|prompt|response|provider[_-]?log|provider[_-]?receipt|api[_-]?key|(auth|access|refresh|session|upload|runner|firebase)[_-]?token|credential|judge|auditor|receipt|raw[_-]?(output|action|prompt|response)|request[_-]?id|phone|firebase|installation|attestation|provenance|ciphertext|hmac/iu;

export const PUBLIC_REPLAY_BILLING_FORBIDDEN_KEY_PATTERN =
  /usage|input[_-]?tokens|output[_-]?tokens|cached[_-]?input[_-]?tokens|reasoning[_-]?tokens|total[_-]?tokens|cost|cost[_-]?usd|estimated[_-]?cost|amount[_-]?usd|billing/iu;

export const PUBLIC_REPLAY_FORBIDDEN_VALUE_PATTERN =
  /(sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{16,}|AQ\.[0-9A-Za-z_-]{16,}|ya29\.[0-9A-Za-z._-]{16,}|1\/\/[0-9A-Za-z._-]{16,}|cfut_[0-9A-Za-z_-]{16,}|(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret|credential|hidden[_ -]?seed|private[_ -]?prompt)\s*[:=]\s*[^\s,;]{6,})/iu;

export type PublicReplaySafetyIssue = {
  readonly path: string;
  readonly key: string;
};

export type PublicReplaySafetyOptions = {
  readonly allowBillingFields?: boolean;
};

export function isForbiddenPublicReplayKey(key: string, options: PublicReplaySafetyOptions = {}): boolean {
  if (PUBLIC_REPLAY_FORBIDDEN_KEY_PATTERN.test(key)) {
    return true;
  }
  return options.allowBillingFields !== true && PUBLIC_REPLAY_BILLING_FORBIDDEN_KEY_PATTERN.test(key);
}

export function collectPublicReplaySafetyIssues(
  value: unknown,
  path = "$",
  options: PublicReplaySafetyOptions = {},
): PublicReplaySafetyIssue[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectPublicReplaySafetyIssues(entry, `${path}[${index}]`, options));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
    const current = `${path}.${key}`;
    const issue = isForbiddenPublicReplayKey(key, options) ? [{ path: current, key }] : [];
    return [...issue, ...collectPublicReplaySafetyIssues(entry, current, options)];
  });
}

export function publicReplayValueContainsForbiddenText(value: unknown): boolean {
  if (typeof value === "string") {
    return PUBLIC_REPLAY_FORBIDDEN_VALUE_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(publicReplayValueContainsForbiddenText);
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).some(publicReplayValueContainsForbiddenText);
}

export function assertPublicReplaySafe(value: unknown, path = "$", options: PublicReplaySafetyOptions = {}): void {
  const [issue] = collectPublicReplaySafetyIssues(value, path, options);
  if (issue) {
    throw new Error(`Replay event contains non-public field at ${issue.path}`);
  }
  if (publicReplayValueContainsForbiddenText(value)) {
    throw new Error(`Replay event contains secret-like text at ${path}`);
  }
}
