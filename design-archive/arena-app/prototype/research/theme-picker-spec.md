# Appearance picker spec (Settings) and the one-time "Try a theme" row

Scope: a six-tile theme picker in Settings, nothing at first run, and one quiet row on the result curtain after the first completed match. Styles are already in `six-themes.css` section 8 (`.ap-th-*`, `.rs-theme-row`). Behaviour below targets `app.js` as read at 21:10 on 1 Oct (line numbers are from that read; the shell is being edited by another agent, so match by function name).

## 1. Where a theme can be reached

| Where | What | Notes |
|---|---|---|
| Avatar corner, Settings, Appearance | The picker. The only permanent home. | Replaces the System / Light / Dark segmented control (app.js 2846). |
| Result curtain, after the first completed match | One quiet row, `Try a theme`, once ever. | Section 5. Opens Settings, not a sheet. |
| Dev only | Canvas Controls theme buttons and `ESApp.dev.setTheme(pref)`. | Add the four ids to the existing `data-cv-theme` buttons. |

Not reachable from: the brand beat, Home, sign-in and onboarding, the table and roster sheets, Stage, replay, the share sheet (the share card renders in the active theme but offers no picker). No first-run theme screen, ever (brief 0.4 and 2.2).

## 2. State and persistence

- One preference, no new key: `localStorage['eslams-arena-proto']`, field `themePref` (already exists; `freshPersist()`, app.js 442). Values: `'system' | 'light' | 'dark' | 'neon' | 'club' | 'arcade' | 'midnight'`. Unknown value on load falls back to `'system'`.
- Map to the production contract (`ThemePreference = "system" | ThemeId`): `light` is `classic-light`, `dark` is `classic-dark`, the other four are identical.
- New boolean in the same blob: `themeHintSeen` (default `false`, added to `freshPersist()`; `loadPersist()` already merges defaults, so no migration, `v` stays 1).
- "Follow system" is not a second field: it is `themePref === 'system'`. The existing OS listener (app.js 3127) keeps working and ignores the OS when a material theme is chosen.
- `applyTheme()` keeps writing `data-theme` (the resolved id) and `data-theme-pref` (the preference) on `#phone`.

## 3. The Appearance group

```
APPEARANCE                                   (mono eyebrow, existing)
+-----------------+ +-----------------+
| Classic Light   | | Classic Dark    |      2 columns, 10px gap, 18px gutters
|  [mini board]   | |  [mini board]   |      tile 172px wide, about 156px tall
|  Classic Light  | |  Classic Dark  v|      selected: 2px --accent border + check
+-----------------+ +-----------------+
| Neon            | | Club            |
| Arcade          | | Midnight        |
+-----------------+ +-----------------+
[ Follow system                      (o) ]   only while a Classic tile is selected
  Switches between Classic Light and Classic Dark with your phone.
```
Order: Classic Light, Classic Dark, Neon, Club, Arcade, Midnight (the `THEME_IDS` order; the v3 grid order).

**Tile.** `div.ap-th-tile[role=radio][aria-checked][tabindex]` containing `span.es-theme.ap-th-skin[data-theme=<id>]` (the themed wrapper: its own `--bg`, `--text`, board tokens) holding the mini board host and `span.ap-th-name`, plus, for the selected tile only, `span.ap-th-check` as a sibling of the skin so the check uses the app's accent, not the tile's. The 2px border is the app's `--border`, selected `--accent` (app level, like v3 `bd:sel?'var(--accent)':'var(--border)'`). Selection is border width plus a check, never colour alone. No glow on the tile in any theme.

**Mini board.** Always the same legal, unfinished, threat-free Connect Four position, so tiles differ only by theme (11 moves, Red to have played last, no win, no one-move win for either side; verified by script):

```
cells (row 0 is the top)       lastMove { r: 3, c: 3 }, winLine null
. . . . . . .
. . . . . . .
. . . . . . .
. . . R . R .
. . Y Y R Y .
. R Y Y R R .
```
```js
ESB.render(host, { family: 'connect_four',
  view: { family: 'connect_four', rows: 6, cols: 7, cells, lastMove: { r: 3, c: 3 }, winLine: null },
  size: 'poster', interactive: false, legal: [], reducedMotion: true, lastMove: { r: 3, c: 3 } });
```
`size: 'poster'` is 120px wide (boards-grid.css). `reducedMotion: true` makes the marker static (`bd-static`), so nothing loops or pulses. Mount through the existing `mountBoard()` (app.js 390), once per Settings open; on a pick only toggle classes and attributes, do not re-mount. Destroy the six controllers when Settings closes. In Neon and Arcade the static last-move outline carries the glow (the budgeted role); in Club the plane is wood with pale cells and lacquered discs; Midnight is a near-invisible board on true black, which is the point.

**Accessibility.** Group: `role=radiogroup`, label `Appearance`. Tile label `<name> theme`, `aria-describedby` a visually hidden line with the token description (section 6). Boards and check are `aria-hidden`. Roving tabindex like `segmented()` (app.js 1310): the selected tile is `0`, arrow keys (all four) move and apply. Whole tile is the 44pt target. Focus uses the global 2px accent ring.

**Follow system row.** Shown only while the selected tile is Classic Light or Classic Dark (that is, `themePref` is `system`, `light` or `dark`); absent otherwise, with no animation. `settingsRow()` plus `toggle()` (app.js 2830, 1330) inside the existing `.ap-sgroup.ap-card`, two-line label (`.ap-srow-t`, `.ap-srow-s`). Toggle on is `themePref === 'system'`.

## 4. Behaviour

| Action | Result |
|---|---|
| Tap a material tile | `setThemePref(id)`; the Follow row disappears. |
| Tap a Classic tile | `setThemePref('light' or 'dark')`; Follow turns off (an explicit tap is an explicit choice). |
| Follow on | `setThemePref('system')`; the tile for the current OS scheme shows selected. |
| Follow off | `setThemePref(resolvedTheme())`: pin what is showing now. |
| Arrow keys | Same as tapping the neighbour. |

Instant apply: `setThemePref()` saves, calls `applyTheme()` (flips `data-theme`) and re-renders the Settings group state. Every colour is a token, so the whole phone repaints on the next frame; boards already on screen recolour without re-rendering. No crossfade, no toast, no haptic, no confirmation, and Settings stays open and keeps its scroll (`render()` already preserves `scrollTop`). Reduced motion changes nothing because nothing moves.

`app.js` edits (everything else is CSS):
1. `freshPersist()` (themePref at 442): add `themeHintSeen: false`.
2. `resolvedTheme()` 1361: `const SIX = ['light','dark','neon','club','arcade','midnight']; if (SIX.includes(P.themePref)) return P.themePref;` then the existing OS fallback.
3. `setThemePref()` 1374: whitelist the same six, else `'system'`.
4. `applyTheme()` 1365 and `wordmark()` 1349: polarity helper (true for dark, neon, arcade, midnight) and the `data-ink` tint (`theme-materials.md` section 6).
5. Settings 2845: replace the segmented control with the group above; keep the `eyebrow(t('appearance', 'Appearance'))`.
6. Canvas Controls and `dev.setTheme`: allow the four ids.
7. `resultCard()` 2569: the row in section 5.

## 5. "Try a theme" row (result curtain)

- When: the first time a match ends in a finish that counts toward the record (win, loss, draw, resignation; brief 7.8), only if `themeHintSeen === false` and `themePref === 'system'` (someone who already chose a theme does not need telling). Never after a timeout award, unavailable engine, expiry or replace.
- Once: compute at the first `resultCard()` build for that session (`sess.themeNudge`), set `themeHintSeen = true` and `save()` right then, so a re-render keeps the row for that screen and it never returns.
- Where: the last child of `.rs-card`, under the actions, 44pt tall, hairline above (`--border-faint`). Not on the share card, not in Your matches or replays.
- Look: title `--text-2` 13/550, hint `--text-3` 12, trailing chevron icon `--text-3`. No accent, no glow, no motion of its own; it arrives with the card's rise. If the card would overflow at 844pt, drop the hint and keep the title.
- Tap: pushes Settings (same path as the avatar menu). Appearance is the first group, so it lands in view. Back returns to the result curtain.
- Markup: `button.rs-theme-row[aria-label]` containing `span` (title, `span.rs-theme-hint`) and `ic('chevron', 16)`.

## 6. Copy (exact; sentence case, no em dashes, no exclamation marks)

| Key | String |
|---|---|
| `appearance` | `Appearance` (existing) |
| `themeClassicLight` | `Classic Light` |
| `themeClassicDark` | `Classic Dark` |
| `themeNeon` | `Neon` |
| `themeClub` | `Club` |
| `themeArcade` | `Arcade` |
| `themeMidnight` | `Midnight` |
| `themeAria` | `<name> theme` (for example `Neon theme`) |
| `themeDescClassicLight` | `The calm instrument, daylit.` |
| `themeDescClassicDark` | `The calm instrument.` |
| `themeDescNeon` | `Glass and cold cathode.` |
| `themeDescClub` | `Wood, felt, and brass.` |
| `themeDescArcade` | `CRT persistence trail.` |
| `themeDescMidnight` | `The board floats; motion carries it.` |
| `followSystem` | `Follow system` |
| `followSystemHint` | `Switches between Classic Light and Classic Dark with your phone.` |
| `tryTheme` | `Try a theme` |
| `tryThemeHint` | `Six looks. Same boards.` |
| `tryThemeAria` | `Try a theme. Opens Appearance in Settings.` |

Theme names stay as the brief and the token source write them (proper nouns, so `Classic Light` is capitalised). The descriptions are the `material.description` strings from `mobile-six-themes.ts`; they are screen-reader hints only, not visible text, so the tiles stay quiet. Retired from Settings: the `System`, `Light`, `Dark` segmented labels (keep the keys for the dev canvas).

## 7. Checks before wiring

- Six tiles show six distinct boards; the selected tile's border is the app accent, not the tile's accent.
- Flip every theme with the OS scheme forced light and then dark; Neon, Club, Arcade, Midnight must not turn into Classic Dark (the `:not()` chain in `six-themes.css` exists for this).
- Follow row present only for Classic Light and Dark; toggling it never changes a material tile.
- `Try a theme` appears once, on the first completed match, and never again after a reload.
- Tab order: group, then Follow toggle; arrow keys apply instantly; tiles are 44pt.
- Contrast of `.ap-srow-s` and `.rs-theme-hint` (`--text-3` on `--surface`) passes AA in all six (min 4.60).
