# `@eslams/theme-tokens`

The canonical, platform-neutral eSlams theme contract. It exports six immutable themes;
`system` is a preference that resolves to Classic Light or Classic Dark, not a seventh
theme. OS appearance subscriptions belong to the app or web consumer, which calls the pure
resolver again when the OS changes.

## Usage

```ts
import {
  DEFAULT_THEME_PREFERENCE,
  resolveTheme,
  serializeThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
} from "@eslams/theme-tokens";

const theme = resolveTheme(DEFAULT_THEME_PREFERENCE, "dark");
await installationLocalStorage.set(
  THEME_PREFERENCE_STORAGE_KEY,
  serializeThemePreference("neon"),
);
```

Persistence is intentionally installation-local and adapter-free. The package does not
import React, React Native, AsyncStorage, MMKV, browser APIs, or account APIs. A manual theme
preference resolves directly and therefore disables system following until `system` is
stored again.

`themes.css` provides deterministic CSS blocks for web and visual tooling. The equivalent
`THEME_CSS` string is available from `@eslams/theme-tokens/css`. `visual-snapshot.json` is the
checked-in deterministic visual-test fixture.

## Accessibility corrections

Canonical semantic swatches and soft fills remain pixel-exact. Separate `winText`,
`lossText`, and `drawText` roles provide accessible foregrounds without changing those
swatches. The following smallest hue-preserving text corrections are intentional and
snapshot-protected:

- Classic Light result text was darkened to remain AA on its exact soft status fills.
- Classic Dark and Midnight use dark on-accent ink because white normal text fails AA on
  their approved accents.
- Club tertiary and result text were darkened to AA on its warm paper and exact soft fills.
- Midnight tertiary text was lightened to AA on its card surface.

Classic Light/Dark otherwise follow `apps/web/styles/tokens.css`, including `textTertiary`
`#666672` and `#9a9aa5`. Glow is unavailable except in Neon and Arcade, and is only for the
explicit last-move, active-seat, active-dock, result-sweep, and move-trail roles. The
immutable store-icon brand color remains royal blue; in-app marks adopt the active theme's
single accent as specified by the material sheet.
