# Theme materials: what each theme changes beyond colour

Research package for bringing Classic Light, Classic Dark, Neon, Club, Arcade and Midnight into the Arena prototype. Source of truth: `assets/02-tokens/mobile-six-themes.ts` (`material`, `ink`) and `mobile-theme-contract.ts`. Everything below is already implemented in `six-themes.css` unless it says "JS".

## 1. The rule

A theme is three layers: tokens (colour), material (what the board and cards are made of) and ink (how pieces are drawn). The renderers keep their geometry, motion and DOM. The Classic pair resolves to exactly what the renderers draw today (plane = `--board-bg`, card = `--surface`), so adopting the file moves no Classic pixel (checked, section 7).

Contract, unchanged from v3: win, loss and draw re-tune per theme but never re-map; one accent per theme; `--glow` is `none` everywhere except Neon and Arcade and only lands on the five accent-carrying roles; the board is never lit by anything but its own tokens.

## 2. Material sheet

| | Classic Light | Classic Dark | Neon | Club | Arcade | Midnight |
|---|---|---|---|---|---|---|
| `data-theme` / `color-scheme` | `light` / light | `dark` / dark | `neon` / dark | `club` / light | `arcade` / dark | `midnight` / dark |
| Board surface | flat | flat | glass | wood | phosphor | void |
| `--theme-plane` | `var(--board-bg)` | `var(--board-bg)` | `linear-gradient(180deg, #0d0d18, #08080f)` | `repeating-linear-gradient(90deg, #c99a5a, #c99a5a 6px, #c19152 6px, #c19152 12px)` | `#04150a` | `#000000` |
| Ink | flat discs, hairline rim | flat discs, hairline rim | light-tube strokes | lacquered discs | phosphor strokes | floating discs, faint rim |
| Card face | `#ffffff` | `var(--surface)` | `var(--surface)` | `#fbf6ea` | `var(--surface)` | `var(--surface)` |
| Card back | `var(--surface-3)` | `var(--surface-3)` | `#0a0a14` | `#8a6414` (brass) | `#07200f` | `var(--surface-3)` |
| Card table | `var(--surface-2)` | `var(--surface-2)` | `#0b0b16` | `radial-gradient(circle, #2e7d43, #25683a)` (felt) | `#04150a` | `var(--surface-2)` |
| `--glow` | none | none | `0 0 14px rgba(63, 214, 242, 0.45)` | none | `0 0 10px rgba(51, 255, 119, 0.35)` | none |
| Move trail | no | no | no | no | yes | no |
| `--mark-ink` | `#1b32c4` | `#1b32c4` | `#3fd6f2` | `#8a6414` | `#33ff77` | `#7d8dc9` |
| Source line | The calm instrument, daylit. | The calm instrument. | Glass and cold cathode. | Wood, felt, and brass. | CRT persistence trail. | The board floats; motion carries it. |

Notes. `felt` exists in the `BoardSurface` union but no theme uses it as a board surface; it is only Club's card table. `ink.pieceA/pieceB` are `--stone-black/--stone-white`, which the renderers already read, so ink needs no new hook except Club's lacquer (below). The Classic `--mark-ink` is the instructed brand blue; the TS and v3 would give `#647cff` for Classic Dark (see `v3-theme-decisions.md`, item 11).

## 3. The mark rule

- Classic Light and Classic Dark: the mark and wordmark are untouched (two-tone brand PNGs, polarity by theme). Brief section 6.2 stands.
- Neon, Club, Arcade, Midnight: the in-app wordmark on the Home header and the mark on the share card render in a single colour, `--mark-ink` (= the theme accent), through a CSS mask on the same PNG (identical geometry, as v3 did).
- Always brand blue, never tinted: splash and brand beat, the app icon, the store icon, the canvas App icon panel.
- Wordmark polarity follows the theme's `color-scheme`: light for Classic Light and Club, dark for the other four (v3 `lightish`, HTML line 1932).

## 4. Glow budget and the five accent roles

`ACCENT_CARRYING_ROLES = last-move, active-seat, active-dock, result-sweep, move-trail`. Nothing else may reference `--glow`: not CTAs, text, pieces, cards, chips, the picker tiles or the share card chrome. The hooks are scoped to `[data-theme="neon"]` and `[data-theme="arcade"]`, and the value is the token itself, so a Classic wrapper nested in a Neon phone still resolves to `none`.

| Role | Existing selector | Hook in `six-themes.css` (Neon and Arcade only) |
|---|---|---|
| last-move | `.bd-last-line`, `.bd-last-ring` (SVG families); `.bd-t-root .bd-t-last` (table families) | `filter: drop-shadow(var(--glow))`; `box-shadow: var(--glow)` |
| active-seat | `.st-seat.is-active` (Stage); `.bd-t-pod.is-toact`, `.bd-t-dseat.is-toact` (tables) | `::after` underline with `box-shadow: var(--glow)`; `box-shadow: var(--shadow-sm), var(--glow)` |
| active-dock | none: Arena has no dock or tab bar (brief 2.2) | parked as a comment; if a dock returns, its selected item gets `box-shadow: var(--glow)` |
| result-sweep | `.rs-card.is-win` (the accent wipe card); `.bd-winline`, `.bd-t-winline`, `.bd-g3-underline` | `box-shadow: var(--shadow-md), var(--glow)`; `filter: drop-shadow(var(--glow))` |
| move-trail | new `.bd-trail` clone (Arcade) | `@keyframes bdTrail`, opacity from `--theme-trail` (0.5 in Arcade, fallback 0 elsewhere) |

Examples, as written in the file:

```css
[data-theme="neon"] .bd-last-line, [data-theme="arcade"] .bd-last-line,
[data-theme="neon"] .bd-last-ring, [data-theme="arcade"] .bd-last-ring { filter: drop-shadow(var(--glow)); }
[data-theme="neon"] .rs-card.is-win, [data-theme="arcade"] .rs-card.is-win { box-shadow: var(--shadow-md), var(--glow); }
.bd-trail { pointer-events: none; animation: bdTrail var(--motion-result, 520ms) var(--ease) both; }
@keyframes bdTrail { from { opacity: var(--theme-trail, 0); } to { opacity: 0; } }
```

Motion trail (Arcade). The previous last-move marker lingers and fades once over the result duration (520ms), then is removed; exactly one real `.bd-last` still exists at a time. SVG families only; table families keep their single `.bd-t-last`. Reduced motion removes the clone at once.

## 5. Plane, card and ink hooks (all var-driven, Classic-neutral)

```css
#phone .bd-board:not(.bd-board-bare):not(.bd-go), #phone .bd-t-mancala, #phone .bd-t-morris, #phone .bd-t-quad,
#phone .bd-t-bg, #phone .bd-t-shogiwrap, #phone .bd-t-xq { background: var(--theme-plane, var(--board-bg)); }
#phone .bd-card, #phone .bd-t-fcard                      { background: var(--theme-card-face, var(--surface)); }
#phone .bd-card.bd-card-back, #phone .bd-t-fcard.is-back { background: var(--theme-card-back, var(--surface-3)); }
#phone .bd-t-felt                                        { background: var(--theme-card-table, var(--surface-2)); }
#phone .bd-stone-b, #phone .bd-stone-w, #phone .bd-c4-body, #phone .bd-disc-body { filter: var(--theme-ink-filter, none); }
```
(each also has the `.es-theme` twin in the file.) Per theme:

- Flat (Classic): nothing to do.
- Glass (Neon): the plane is the near-black gradient; strokes stay `--text` (cold white). The only bloom is the accent roles above.
- Wood (Club): stripe plane; cells use `--board-light` (pale maple) instead of `--surface`; discs get the lacquer filter (a 0.6px top rim light plus a 1.2px soft shadow, built from `--stone-*`); brass card back with a light inner frame; green felt behind card tables.
- Phosphor (Arcade): `#04150a` plane, phosphor-green strokes from `--text`/`--stone-white`, glow and trail on accent roles only. No scanlines (not in the token source).
- Void (Midnight): true black plane, the existing hairline rim on black stones is the "faint rim". Nothing added.
- `--bd-cell` (boards-grid.css picks it by theme name): Classic Light keeps `--surface`; the other five use `--board-light`. Re-stated in section 3 of the file.

## 6. The JS the renderers and shell need (everything else is CSS)

1. `boards-grid.js` `markLast()` (move trail, 8 lines, tested). Replace the line that removes old markers:
```js
var old = host.querySelectorAll('.bd-last');
for (var i = 0; i < old.length; i++) {
  var tr = old[i].cloneNode(true);            // fading clone; CSS shows it only where --theme-trail > 0
  tr.setAttribute('class', 'bd-trail');
  old[i].parentNode.insertBefore(tr, old[i]);
  rm(tr, props, motion.result);               // existing helper: removes at once under reduced motion
  old[i].parentNode.removeChild(old[i]);
}
```
2. `app.js` `wordmark(height, part, opts)` and `applyTheme()` (mark tint). Add `const INK_THEMES = ['neon','club','arcade','midnight']`. When `opts.ink` and the resolved theme is in the list: `box.setAttribute('data-ink','1'); box.style.setProperty('--wm-src', 'url(' + src + ')')`. Call it with `ink: true` only from the Home header (`h('header', {class:'ap-hdr'}, wordmark(22), right)`, app.js 1496), never from the brand beat (1449). In `applyTheme()` toggle the same attribute on `.ap-hdr .ap-wm`. In `shareCard()` (app.js 2616; `markSrc` at 2628) emit `span.rs-share-mark[data-ink]` with `--wm-src: url(ESA.mark)` instead of the `<img>` when the theme is in the list.
3. `app.js` polarity: replace `resolvedTheme() === 'dark'` at 1350 and 1370 with a helper that is true for dark, neon, arcade and midnight.
4. Theme plumbing (`resolvedTheme`, `setThemePref` whitelist) is in `theme-picker-spec.md`.

## 7. Accessibility and honesty notes

- Contrast (`contrast-check.js`): `--text-3` on `--surface` passes AA in all six (min 4.60, Midnight). `--text-3` on `--surface-3` fails in Neon 4.27, Club 4.22, Midnight 4.19, and on `--surface-2` in Midnight 4.42. Source untouched; avoid `--text-3` on `--surface-2/3` in those themes or promote the text to `--text-2`.
- Status colours as text: `--win`, `--draw` fail AA on light surfaces (Classic Light 4.38 and 3.75, Club draw 3.86); every `-text` token passes (min 4.57 on the soft tints). 23 prototype rules use `--win/--loss/--draw` as `color`: 15 in `app.css` (lines 52, 53, 90, 222, 223, 299, 300, 319, 452, 465, 530, 531, 532, 539, 543), 7 in `boards-table.css` (85, 184, 295, 343, 358, 738, 758) and 1 in `boards-grid.css` (142). Swap them to `var(--win-text, var(--win))` and so on when the file is wired in.
- Classic Dark `--text-on-accent` in `tokens.css` is `#ffffff` (3.58:1 on `#647cff`); the token source says `#0b0b0d` (5.50:1). The four new themes use the source values.
- Outcome stays word plus colour; the picker selection is border width plus a check, never colour alone.
- Glow is decorative and static. If the host reports reduced transparency or increased contrast, set `--glow: none` on the phone; not wired, noted.

## 8. Verified in a scratch copy (src untouched)

Local server, real `ESB.render` boards, OS scheme forced dark and light: all six themes apply by flipping `data-theme` with the exact token values; a bare `#phone[data-theme="neon"]` rule loses to tokens.css's system-dark block on a dark OS (computed `--bg` stayed `#0c0c0e`), the `:not()` chain wins; 310 board and table elements compute identically in Classic Light and Dark with and without the file; picker tiles show each theme's cell tone regardless of the surrounding theme; the trail clone starts at opacity 0.5 in Arcade, is invisible in Classic and is gone after 520ms; the masked wordmark matches the brand PNG footprint.
