export const themeStorageKey = "es-theme";
export const themePreferenceChangeEvent = "eslams:theme-preference-change";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;
let documentPreference: ThemePreference | undefined;

export function readThemePreference(storage?: Pick<Storage, "getItem">): ThemePreference {
  if (!storage && documentPreference !== undefined) return documentPreference;
  try {
    const value = (storage ?? window.localStorage).getItem(themeStorageKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveThemePreference(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === "system" ? prefersDark ? "dark" : "light" : preference;
}

export function applyThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(themeStorageKey);
    } else {
      window.localStorage.setItem(themeStorageKey, preference);
    }
    documentPreference = undefined;
  } catch {
    // Keep the deliberate choice for this document when persistence is blocked.
    documentPreference = preference;
  }
  syncDocumentThemePreference(preference);
  window.dispatchEvent(new Event(themePreferenceChangeEvent));
}

export function syncDocumentThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }
  document.documentElement.setAttribute("data-theme", preference);
}
