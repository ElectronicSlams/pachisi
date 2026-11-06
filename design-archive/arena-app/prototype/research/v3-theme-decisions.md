# v3 theme decisions, recovered, and where they collide with the brief

For the brief editor. Sources and short names used for line numbers:

- **v3 HTML**: `assets/05-old-app-designs/prototype-v3/eSlams Mobile App v3.dc.html`
- **v3 data**: `.../prototype-v3/app-data-v3.js`
- **v3 CSS**: `assets/05-old-app-designs/old-app-tokens-six-themes.css`
- **Spec**: `assets/05-old-app-designs/OLD_APP_HANDOFF_SPEC_v3.md`
- **TS**: `assets/02-tokens/mobile-six-themes.ts` and `mobile-theme-contract.ts` (authoritative)
- **Brief**: `ARENA_APP_DESIGN_BRIEF.md`
- **Proto**: `prototype/src/tokens.css`, `app.js`, `boards-grid.css`

## 1. Recovered decisions

| # | Decision | Where | In the package |
|---|---|---|---|
| D1 | Themes are materials, not palette swaps: three layers (tokens, material, ink); a per-theme Material sheet (plane, ink, card, glow) across the 12 renderer families. | v3 HTML 118, 1229-1248; v3 data 576-586; TS 63-74 (material) | Yes, `theme-materials.md` |
| D2 | Six themes: dark, light, neon, club, arcade, midnight. Classic pair may follow the OS; the other four are fixed. | Spec 119-125; v3 CSS 1-13; v3 HTML 445, 2420-2423 | Yes |
| D3 | Material values per theme (plane, ink, card face/back/table, glow, persistence flag). | v3 data 581-586 (identical to the TS material blocks at 63-74, 114-125, 165-176, 216-227, 267-278, 318-329) | Yes, from TS |
| D4 | The mark re-tints to the theme ink in-app (ink = accent): Home and Battlefield header wordmark through a CSS mask on `logo-dark.png`, alt-icon tiles on `mark.png`, Material sheet, share cards. Splash stays the plain brand mark with a polarity wordmark. Store icon stays brand blue. | v3 HTML 118, 130, 195, 455, 1241, 1255, 1458; v3 data 579 (MARK_INK); splash 1079-1101; note 1247, 2418 | Yes for the four material themes only (header wordmark, share card). Classic untouched. |
| D5 | Glow budget: `GLOW_THEMES = neon, arcade`; glow lands on accent-carrying elements: dock selected tab, Nine Men's Morris mill, share-card winning cells, alt-icon tiles, confetti pieces. | v3 data 588; v3 HTML 1939, 2750, 2469, 2417, 1459-1480; spec 126, 197 | Yes, mapped to the five contract roles |
| D6 | Appearance in Settings: 2-column grid of six tiles, each a live mini Connect Four board (cell 10, driven by `tick`) in a `data-th` wrapper, name beneath, selected tile `2px solid var(--accent)`, unselected `var(--border)`. | v3 HTML 432-441, 2483-2493; spec 295-298 | Yes, board made static (nothing loops) |
| D7 | "Follow system light/dark" row only while a Classic theme is selected; the hint reads "The Classic pair swaps with the OS. The other four are fixed skins."; picking any tile sets follow off. | v3 HTML 443-449, 2420-2423, 2492; spec 122-124 | Yes, as `themePref === 'system'` |
| D8 | Instant apply: the phone wrapper is `data-th="{{ th }}"`; `th()` resolves the theme (follow uses `matchMedia('(prefers-color-scheme: light)')`, light else dark). | v3 HTML 123, 1376-1382 | Yes (`applyTheme()` flips `data-theme`) |
| D9 | Theme is not actually persisted in the v3 prototype (React state only; the only localStorage key is `es2_coach`), although the spec says persisted. | v3 HTML 1312, 1339, 1886; spec 531-532 | Persisted in the existing `eslams-arena-proto` blob |
| D10 | Onboarding step 2 "Pick your theme." / "Six skins, one honest system. Change it any time." with the same six-tile grid. | v3 HTML 866-880; spec 340-341 | No. Dropped (brief 0.4, 2.2). Replaced by Settings plus one quiet row. |
| D11 | Theme-aware physics confetti: one burst, 46 pieces, per-theme palettes, Club uses shards, glow on Neon and Arcade pieces; win only; off under reduced motion ("accent sweep only"). | v3 HTML 118, 627-628, 1459-1480, 2114; spec 388 | No. Brief 7.8 says no confetti. Palettes are recorded in the v3 HTML if ever wanted. |
| D12 | Arcade "CRT persistence trail": `persistence: true` and an `esTrail` keyframe (opacity .5 to 0) exist, but nothing in v3 references the keyframe; the trail was never rendered. | v3 data 585; v3 HTML 107; TS 270 (`moveTrail: true`) | Yes, designed fresh (a fading clone of the previous marker) |
| D13 | Polarity: Classic Light and Club are "lightish" and use the dark-text wordmark; the other four use the light-text wordmark. | v3 HTML 1932, 1100; spec 572-573 | Yes |
| D14 | Share card renders in the player's current theme (outcome, game, competitors, board, mark; `--share-safe` 20px); the Neon card is called the growth asset. | Spec 429; v3 HTML 1249-1263, 1296 | Partly: theme follows the player; brief 7.8 still says "both themes" |
| D15 | Themed alternate app icons (mark re-tinted per theme, glow on Neon and Arcade tiles). | v3 HTML 450-459, 2414-2418 | No. Parked (brief decision 3). |
| D16 | Win, loss and draw hues re-tune per theme but never re-map; exactly one accent per theme. | v3 CSS 8-9; spec 127; v3 HTML 1296 | Yes |
| D17 | AA contrast must hold in all six themes; `--glow` only in Neon and Arcade. | Spec 523, 598 | Yes, checked (`contrast-check.js`) |

## 2. Conflicts with `ARENA_APP_DESIGN_BRIEF.md`

| # | Brief says | v3 / contract says | Suggested resolution |
|---|---|---|---|
| 1 | **Never re-tint the mark** (6.2, line 143); mark appears exactly three times: splash, Home header, share card. | v3 re-tints the wordmark and mark in-app to the theme ink (D4). | Amend 6.2: Classic never re-tints; Neon, Club, Arcade, Midnight tint the Home header wordmark and the share-card mark to `--mark-ink`; splash, app icon and store icon stay brand blue. The "three times" count still holds. |
| 2 | Two themes at launch; the four material themes are parked (lines 16, 90); 6.1 (line 138) and 7.10 (line 260) specify Appearance as System / Light / Dark. | Six-tile grid plus Follow system (D6, D7). | If the six themes ship, rewrite 0.5, the decisions row (line 90), 6.1 and 7.10: Appearance is the six-tile grid; System is the `Follow system` toggle, shown for Classic only. |
| 3 | No first-run screens, no theme picker, no six-theme onboarding before a first match (lines 15, 51, 68). | Onboarding step "Pick your theme." (D10). | Keep the ban. Settings is the home; one quiet row on the result curtain after the first completed match is the only nudge (`theme-picker-spec.md` section 5). Say so in 2.2 so it is not read as a first-run screen. |
| 4 | "Nothing glows" (line 267), "board is lit by contrast, never glow" (line 140), "No neon, no glow" (line 334). | Glow in Neon and Arcade on accent roles (TS 174, 276; contract roles). | Scope the rule: Classic has no glow, ever. Glow exists only inside the two opt-in themes, on last-move, active-seat, active-dock, result-sweep and move-trail, never on controls or text. |
| 5 | No confetti, no particles; the win is one accent wipe (line 247; line 70 already calls v3 confetti a divergence). | Theme-aware confetti (D11). | Keep the brief. Note that the accent wipe is the glow-bearing result role in Neon and Arcade. |
| 6 | "No gradients on controls" (lines 135, 334). | Neon plane is a gradient, Club plane is a stripe gradient, Club felt is a radial gradient (TS 169 Neon plane, 220 Club plane, 224 Club felt). | Clarify: gradients are allowed on board planes and card tables (material), never on controls. |
| 7 | Single brand-blue icon in v1, alternates parked (line 102, decision 3). | Alternate icons per theme (D15). | No change; note the store icon stays brand blue either way. |
| 8 | Share card "both themes, both outcomes" (line 252). | Card in the player's theme (D14). | With six themes: "in the player's current theme". Note the Neon card is a growth asset. |
| 9 | AA in both themes; `--text-3` is `#666672` / `#9a9aa5` (lines 138, 311). | v3 CSS `--text-3` fails AA in three themes (see 11). | Extend to six. The TS values pass; state that `--text-3` on `--surface-2/3` still fails in Neon (4.27 on surface-3), Club (4.22), Midnight (4.19 and 4.42 on surface-2), so it must not sit there. |
| 10 | "Follow the OS by default" (line 138). | v3 default was Classic Dark with follow off (v3 HTML 1312). | Keep the brief: default `themePref = 'system'`, which resolves to Classic Light or Dark. |

## 3. Discrepancies between the sources themselves

| # | Item | Detail | Package position |
|---|---|---|---|
| 11 | **Classic mark ink** | Request and brief 6.2: brand blue `#1b32c4` for both Classic themes. TS `ink.mark = color.accent` (TS 19), so Classic Dark would be `#647cff`, and v3 `MARK_INK.dark` is `#647cff` (v3 data 579). `#1b32c4` on `#0c0c0e` is only 2.14:1 (fails 3:1). The actual `mark.png` fill is `#102fa4`, not `BRAND_COLORS.royalBlue` `#1b32c4` (contract 139). | `--mark-ink: #1b32c4` for both Classic as instructed; Classic never masks the PNG, so nothing visible changes. If anyone masks the Classic Dark mark, use `#647cff` (5.46:1). |
| 12 | **Classic Dark `--text-on-accent`** | Proto tokens.css is `#ffffff` (3.58:1 on `#647cff`, fails AA for button text); TS is `#0b0b0d` (5.50:1); v3 `#ffffff`. | Not edited. The four new themes use the TS values. Recommend adopting the TS value in tokens.css. |
| 13 | **Classic Light surfaces** | v3 `--bg #f7f7f9`, surface-2 `#f2f2f5`, surface-3 `#ebebef`, `--text-3 #8a8a94` (3.42:1) (v3 CSS 78-90; v3 HTML 1300 documents the `--bg` divergence). TS and tokens.css: `#ffffff`, `#f7f7f9`, `#f0f0f3`, `#666672`. | TS (brief: production is canon). |
| 14 | **v3 `--text-3` values** | Club `#8f815f` (3.53:1), Midnight `#6d6d78` (3.87:1) fail AA (v3 CSS 176, 264); TS raised them to `#726545` (5.27) and `#797984` (4.60). Neon and Arcade unchanged and pass. | TS. |
| 15 | **Midnight `--text-on-accent`** | v3 `#ffffff` on `#7d8dc9` is 3.22:1; TS `#0b0b0d` is 6.11:1. | TS. |
| 16 | **Glow targets** | v3 CSS header and spec 126 list "selected dock tab, primary CTA, winning-line highlight". The contract's `ACCENT_CARRYING_ROLES` has no CTA. | Contract wins: CTAs stay flat. |
| 17 | **`active-dock`** | v3 dock selected tab glows (spec 197, HTML 1939). The Arena app has no dock (brief 2.2). | Role kept in the contract, no target; rule parked in a comment. |
| 18 | **Exactly one last-move marker** | Brief 6.5 says one marker at a time; the Arcade trail is a transient clone of the previous marker (520ms). | One real marker at all times. Suggest brief wording: "Arcade adds one fading afterimage." |
| 19 | **v3 contradicts itself on the mark** | Re-tint at v3 HTML 1241, 1247, 1255; but 1296 says "the mark stays brand royal blue everywhere", and spec 128, 575-576 and v3 CSS 12 say never re-tinted. | Resolve with conflict 1. |
| 20 | **Attribute vocabulary** | Production CSS `data-eslams-theme="classic-light"` (`02-tokens/mobile-six-themes.css`); v3 `data-th="light"`; proto `#phone[data-theme="light"]`. Ids: `classic-light` is `light`, `classic-dark` is `dark`; the other four match. | Proto vocabulary kept. |
| 21 | **Contract file** | The task text mentions `TOKEN_CSS_VARIABLES` in `mobile-theme-contract.ts`; the file has only `TOKEN_NAMES`, `ACCENT_CARRYING_ROLES`, `BRAND_COLORS`, schemas. The variable names are those in `mobile-six-themes.css` (which also has `--win-text`, `--theme-*`, `--glow`, but no `--mark-ink`). | Names taken from proto tokens.css plus that CSS; `--mark-ink` is new. |
| 22 | **Proto tokens vs production** | Proto tokens.css has no `--win-text`, `--loss-text`, `--draw-text` (production does) and 23 rules use `--win/--loss/--draw` as text, failing AA on Classic Light (win 4.38, draw 3.75) and Club (draw 3.86). It also has `--accent-press`, medals, `--term-*` and `--shadow-pop` that the TS lacks. | `-text` tokens added; press, medals and shadows derived and flagged in the CSS header. |
| 23 | **Dark-OS trap** | tokens.css and boards-grid.css select "system" with `:not([data-theme="light"]):not([data-theme="dark"])`, which also matches `neon`, `club`, `arcade`, `midnight` on a dark OS and out-ranks a bare `#phone[data-theme="neon"]`. Proven in a scratch copy. | Handled in `six-themes.css` by repeating the `:not()` chain; cleaner long-term fix is to add the four ids to the chain in tokens.css and boards-grid.css. |
