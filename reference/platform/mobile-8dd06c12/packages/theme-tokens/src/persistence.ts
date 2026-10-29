import type { ThemePreference } from "./contract";
import { themePreferenceSchema } from "./contract";

export const THEME_PREFERENCE_STORAGE_KEY = "eslams.theme-preference.v1" as const;
export const THEME_PREFERENCE_STORAGE_SCHEMA = "eslams.theme-preference.v1" as const;
export const DEFAULT_THEME_PREFERENCE = "system" as const satisfies ThemePreference;

export type StoredThemePreference = {
  readonly schemaVersion: typeof THEME_PREFERENCE_STORAGE_SCHEMA;
  readonly preference: ThemePreference;
};

export function serializeThemePreference(preference: ThemePreference): string {
  return JSON.stringify({
    schemaVersion: THEME_PREFERENCE_STORAGE_SCHEMA,
    preference,
  } satisfies StoredThemePreference);
}

export function parseStoredThemePreference(value: string | null | undefined): ThemePreference | null {
  if (value == null || value === "") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (candidate.schemaVersion !== THEME_PREFERENCE_STORAGE_SCHEMA) return null;
    return themePreferenceSchema.is(candidate.preference) ? candidate.preference : null;
  } catch {
    return null;
  }
}
