# Asset pack manifest

Generated 2026-10-01 for the eSlams Arena app design pack. Companion to `ARENA_APP_DESIGN_BRIEF.md` (pack root, one level above `assets/`) and `README.md` (this folder).

**Total:** 171 files (excluding this manifest), 5168.1 KB (5.0 MB). Sizes below are KB (1 KB = 1024 bytes).

## Folder summary

| Folder | Files | KB | Purpose |
|---|---:|---:|---|
| `01-brand/` | 65 | 687.6 | eSlams mark, wordmarks, favicon, provider logos. Ship as-is. |
| `02-tokens/` | 6 | 29.9 | Design tokens: web canon (Classic Light/Dark), six mobile themes, motion, seat-map CSS. |
| `03-design-canon/` | 7 | 143.4 | House design language, component recipes, board/Stage grammar, game disposition. See Known staleness in README. |
| `04-web-arena-today/` | 10 | 412.5 | Screenshots of the LIVE web Arena (Sept 2026), desktop and 375px mobile. The baseline to beat. |
| `05-old-app-designs/` | 30 | 2633.1 | Previous mobile app design: what to keep and what to drop (brief section 3). |
| `06-web-prototype-v4/` | 38 | 1038.1 | v4 web prototype (serve over HTTP, open #/arena). Visual reference for the Arena rebuild. |
| `07-catalog-data/` | 9 | 32.2 | Real 50-game catalogue types and data from packages/core-types, plus glyph mapping code. |
| `08-auth-web-reference/` | 4 | 124.5 | Live web sign-in / create-account screens and the Identity prototype sign-in. |
| `09-platform-reference/` | 1 | 62.8 | Code-verified digest of how the web Arena and its session API behave today. |

## Full tree

```
assets/
├── 01-brand/  [687.6 KB, 65 files]  eSlams mark, wordmarks, favicon, provider logos. Ship as-is.
│   ├── provider-logos/  [33.9 KB, 61 files]  AI lab / provider logos (SVG), one per provider, for model avatars and roster rows.
│   │   ├── ai2.svg  [0.3 KB]  Provider logo.
│   │   ├── ai21-labs.svg  [0.3 KB]  Provider logo.
│   │   ├── aion-labs.svg  [0.4 KB]  Provider logo.
│   │   ├── amazon-aws.svg  [0.4 KB]  Provider logo.
│   │   ├── anthracite-org.svg  [0.3 KB]  Provider logo.
│   │   ├── anthropic.svg  [0.3 KB]  Provider logo.
│   │   ├── apple.svg  [0.6 KB]  Provider logo.
│   │   ├── arcee-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── baidu.svg  [1.4 KB]  Provider logo.
│   │   ├── bytedance.svg  [0.3 KB]  Provider logo.
│   │   ├── cognitivecomputations.svg  [0.3 KB]  Provider logo.
│   │   ├── cohere.svg  [0.4 KB]  Provider logo.
│   │   ├── core42.svg  [0.4 KB]  Provider logo.
│   │   ├── cursor.svg  [0.3 KB]  Provider logo.
│   │   ├── databricks-mosaicml.svg  [0.4 KB]  Provider logo.
│   │   ├── deepcogito.svg  [0.4 KB]  Provider logo.
│   │   ├── deepseek.svg  [2.1 KB]  Provider logo.
│   │   ├── fireworks-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── google.svg  [0.5 KB]  Provider logo.
│   │   ├── groq.svg  [0.2 KB]  Provider logo.
│   │   ├── gryphe.svg  [0.4 KB]  Provider logo.
│   │   ├── huggingface.svg  [3.0 KB]  Provider logo.
│   │   ├── ibm-granite.svg  [0.4 KB]  Provider logo.
│   │   ├── inclusionai.svg  [0.4 KB]  Provider logo.
│   │   ├── inflection-ai.svg  [0.4 KB]  Provider logo.
│   │   ├── kwaipilot.svg  [0.4 KB]  Provider logo.
│   │   ├── liquid-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── mancer.svg  [0.4 KB]  Provider logo.
│   │   ├── meta.svg  [1.3 KB]  Provider logo.
│   │   ├── microsoft.svg  [0.3 KB]  Provider logo.
│   │   ├── minimax.svg  [0.3 KB]  Provider logo.
│   │   ├── mistral-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── moonshot-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── morph.svg  [0.4 KB]  Provider logo.
│   │   ├── nex-agi.svg  [0.4 KB]  Provider logo.
│   │   ├── nous-research.svg  [0.3 KB]  Provider logo.
│   │   ├── nvidia.svg  [0.9 KB]  Provider logo.
│   │   ├── openai.svg  [1.5 KB]  Provider logo.
│   │   ├── openrouter.svg  [0.4 KB]  Provider logo.
│   │   ├── perceptron.svg  [0.4 KB]  Provider logo.
│   │   ├── perplexity.svg  [0.6 KB]  Provider logo.
│   │   ├── poolside.svg  [0.4 KB]  Provider logo.
│   │   ├── qwen.svg  [0.8 KB]  Provider logo.
│   │   ├── reka-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── relace.svg  [0.4 KB]  Provider logo.
│   │   ├── sakana.svg  [0.4 KB]  Provider logo.
│   │   ├── samsung-research.svg  [2.2 KB]  Provider logo.
│   │   ├── sao10k.svg  [0.4 KB]  Provider logo.
│   │   ├── snowflake.svg  [2.4 KB]  Provider logo.
│   │   ├── stepfun.svg  [0.3 KB]  Provider logo.
│   │   ├── tencent.svg  [0.3 KB]  Provider logo.
│   │   ├── thedrummer.svg  [0.4 KB]  Provider logo.
│   │   ├── thinkingmachines.svg  [0.4 KB]  Provider logo.
│   │   ├── together-ai.svg  [0.3 KB]  Provider logo.
│   │   ├── undi95.svg  [0.4 KB]  Provider logo.
│   │   ├── upstage.svg  [0.4 KB]  Provider logo.
│   │   ├── writer.svg  [0.2 KB]  Provider logo.
│   │   ├── xai.svg  [0.3 KB]  Provider logo.
│   │   ├── xiaomi.svg  [0.2 KB]  Provider logo.
│   │   ├── zero-one-ai.svg  [0.3 KB]  Provider logo.
│   │   └── zhipu.svg  [0.3 KB]  Provider logo.
│   ├── favicon.ico  [3.8 KB]  Browser favicon (32x29 ICO).
│   ├── logo-dark.png  [297.5 KB]  Wordmark with light text, for dark backgrounds (3602x1193).
│   ├── logo-light.png  [222.7 KB]  Wordmark with black text, for light backgrounds (3602x1193).
│   └── mark.png  [129.7 KB]  The e-in-rounded-square mark; also the app icon (861x861).
├── 02-tokens/  [29.9 KB, 6 files]  Design tokens: web canon (Classic Light/Dark), six mobile themes, motion, seat-map CSS.
│   ├── game-motion.css  [0.4 KB]  Game motion tokens (fast 140ms / med 220ms / slow 420ms, easing curve).
│   ├── mobile-six-themes.css  [6.5 KB]  CSS variables for the six mobile themes, keyed by data-eslams-theme.
│   ├── mobile-six-themes.ts  [9.3 KB]  TypeScript token sets for the six mobile themes.
│   ├── mobile-theme-contract.ts  [3.5 KB]  Theme ID list and token-name contract the theme files conform to.
│   ├── table-games.css  [3.0 KB]  Seat-map CSS (seatmap-preview grid areas for table layouts).
│   └── web-tokens.css  [7.3 KB]  Production web tokens, canon for Classic Light and Classic Dark.
├── 03-design-canon/  [143.4 KB, 7 files]  House design language, component recipes, board/Stage grammar, game disposition. See Known staleness in README.
│   ├── COMPONENT_REFERENCE.md  [14.0 KB]  Exact CSS recipes and component APIs (companion to DESIGN_BRIEF.md).
│   ├── DESIGN_BRIEF.md  [33.0 KB]  Canonical eSlams house language: look, sound, motion, behaviour, copy.
│   ├── DESIGN_NOTE_battlefield.md  [31.9 KB]  Battlefield redesign: the Stage and all 12 board families.
│   ├── DESIGN_NOTE_mobile_app.md  [30.0 KB]  Design intent for the eSlams mobile app (inherits the board system).
│   ├── DESIGN_NOTES_arena_prototype_v4.md  [5.8 KB]  Design notes for the v4 Arena rebuild prototype.
│   ├── eslams-design-SKILL.md  [7.7 KB]  The eslams-design skill: brand, tokens, naming and UX conventions.
│   └── recommendations-for-arena.md  [21.0 KB]  Game disposition for Arena and the how-to-play content matrix.
├── 04-web-arena-today/  [412.5 KB, 10 files]  Screenshots of the LIVE web Arena (Sept 2026), desktop and 375px mobile. The baseline to beat.
│   ├── web-arena-desktop-00-overview-1280-connect-four.jpg  [35.3 KB]  Desktop 1280 overview of the live Arena (Connect Four selected).
│   ├── web-arena-desktop-01-holdem-table-4-seats.jpg  [23.0 KB]  Desktop: Hold'em table with 4 seats.
│   ├── web-arena-desktop-02-seats-your-seat-start-grid.jpg  [24.3 KB]  Desktop: seats, your seat, and the start grid.
│   ├── web-arena-desktop-03-how-to-play-modal.jpg  [13.7 KB]  Desktop: How-to-play modal.
│   ├── web-arena-desktop-04-connect-four-you-vs-model.jpg  [19.0 KB]  Desktop: Connect Four, you vs model matchup.
│   ├── web-arena-desktop-05-chess-side-picker-arena-grid.jpg  [22.5 KB]  Desktop: Chess side picker and arena grid.
│   ├── web-arena-mobile-01-hero-choose-table-tictactoe.jpg  [59.7 KB]  375px mobile: hero and choose-a-table (Tic-Tac-Toe). Context shot.
│   ├── web-arena-mobile-02-opponent-roster-side-start.jpg  [75.3 KB]  375px mobile: opponent roster, side, start.
│   ├── web-arena-mobile-03-choose-an-arena-grid-board.jpg  [65.5 KB]  375px mobile: choose-an-arena grid (board games).
│   └── web-arena-mobile-04-choose-an-arena-grid-cards-social.jpg  [74.1 KB]  375px mobile: choose-an-arena grid (cards and social). Context shot.
├── 05-old-app-designs/  [2633.1 KB, 30 files]  Previous mobile app design: what to keep and what to drop (brief section 3).
│   ├── app-icons/  [554.8 KB, 10 files]  Old launcher icons: Android adaptive layers, store icon, six themed alternates.
│   │   ├── adaptive-background.png  [5.6 KB]  Android adaptive icon, background layer.
│   │   ├── adaptive-foreground.png  [41.7 KB]  Android adaptive icon, foreground layer.
│   │   ├── adaptive-monochrome.png  [41.7 KB]  Android adaptive icon, monochrome layer (identical bytes to foreground).
│   │   ├── alt-icon-arcade.png  [66.8 KB]  Alternate launcher icon: Arcade theme.
│   │   ├── alt-icon-classic-dark.png  [66.0 KB]  Alternate launcher icon: Classic Dark theme.
│   │   ├── alt-icon-classic-light.png  [67.1 KB]  Alternate launcher icon: Classic Light theme.
│   │   ├── alt-icon-club.png  [65.8 KB]  Alternate launcher icon: Club theme.
│   │   ├── alt-icon-midnight.png  [65.8 KB]  Alternate launcher icon: Midnight theme.
│   │   ├── alt-icon-neon.png  [67.5 KB]  Alternate launcher icon: Neon theme.
│   │   └── store-icon-primary.png  [66.9 KB]  Primary store icon (1024x1024).
│   ├── current-app-screens/  [690.6 KB, 5 files]  QA screenshots of the current Expo app (Arena and Battlefield).
│   │   ├── arena-current-402x874.png  [61.6 KB]  Current app Arena tab, single phone (402x874).
│   │   ├── arena-reference-current-804x874.png  [248.0 KB]  Current app Arena tab, side-by-side reference (804x874).
│   │   ├── battlefield-current-402x874.png  [62.5 KB]  Current app Battlefield tab, single phone (402x874).
│   │   ├── battlefield-reference-current-804x874.png  [295.4 KB]  Current app Battlefield tab, side-by-side reference (804x874).
│   │   └── cold-start-contact-sheet.png  [23.0 KB]  Contact sheet of the cold-start sequence (1206x1748).
│   ├── prototype-v3/  [1338.1 KB, 12 files]  v3 interactive mobile prototype (open the .dc.html over HTTP).
│   │   ├── assets/  [649.9 KB, 3 files]  Logo copies used by the v3 prototype (duplicates of 01-brand).
│   │   │   ├── logo-dark.png  [297.5 KB]  Duplicate of 01-brand/logo-dark.png.
│   │   │   ├── logo-light.png  [222.7 KB]  Duplicate of 01-brand/logo-light.png.
│   │   │   └── mark.png  [129.7 KB]  Duplicate of 01-brand/mark.png.
│   │   ├── app-data-v3.js  [37.5 KB]  v3 data layer: catalogue, engines, ledger language (window.APPD).
│   │   ├── es-data-v2.js  [27.6 KB]  Shared demo data layer (window.ES) used by v3.
│   │   ├── eSlams Mobile App v3.dc.html  [294.3 KB]  The v3 interactive mobile prototype. Open over HTTP.
│   │   ├── prototype-v3-arena-tab-quick-match-shelf.jpg  [50.5 KB]  v3 screenshot: Arena tab with quick-match shelf.
│   │   ├── prototype-v3-battlefield-tab-and-micro-states.jpg  [53.5 KB]  v3 screenshot: Battlefield tab and micro-states.
│   │   ├── prototype-v3-canvas-overview.jpg  [63.3 KB]  v3 screenshot: full canvas overview.
│   │   ├── prototype-v3-game-sheet-connect-four.jpg  [51.9 KB]  v3 screenshot: game sheet (Connect Four).
│   │   ├── prototype-v3-stage-play-connect-four.jpg  [44.9 KB]  v3 screenshot: Stage play (Connect Four).
│   │   └── support.js  [64.8 KB]  Generated runtime for the .dc.html prototype. Do not edit.
│   ├── current-app-design-qa.md  [4.9 KB]  Historical (2026-07-26) QA log comparing auth, startup, Battlefield, Arena.
│   ├── old-app-tokens-six-themes.css  [11.1 KB]  Old app tokens, six themes keyed by data-th.
│   └── OLD_APP_HANDOFF_SPEC_v3.md  [33.6 KB]  Implementation spec for the old mobile app: colours, type, spacing, motion, copy.
├── 06-web-prototype-v4/  [1038.1 KB, 38 files]  v4 web prototype (serve over HTTP, open #/arena). Visual reference for the Arena rebuild.
│   ├── app/  [196.9 KB, 22 files]  Prototype JSX/JS: shell, pages, widgets, playable game engines, arena previews.
│   │   ├── app-v2.jsx  [1.4 KB]  App root for the v2 landing variant.
│   │   ├── app.jsx  [1.4 KB]  App root: theme provider, router, mount.
│   │   ├── arena-preview.jsx  [10.2 KB]  Per-family animated game previews (matchup hero concept).
│   │   ├── components.jsx  [13.3 KB]  Shared UI components and the icon system.
│   │   ├── data.js  [16.2 KB]  Demo data (window.ES): providers, games, invented numbers.
│   │   ├── games-arena.jsx  [8.1 KB]  Playable Arena game engines (play vs model).
│   │   ├── games.jsx  [9.7 KB]  Game engines and board renderers (chess, Go, generic boards).
│   │   ├── globals.js  [0.4 KB]  Exposes React hooks as globals for the Babel scripts.
│   │   ├── page-arena.jsx  [15.1 KB]  Arena page: setup stage then play dashboard. Most relevant file.
│   │   ├── page-auth.jsx  [7.3 KB]  Login and sign-up flow (GitHub, Google, email).
│   │   ├── page-battlefield.jsx  [13.7 KB]  Battlefield match browser and animated replay.
│   │   ├── page-game.jsx  [8.7 KB]  Per-game template page (#/games/slug).
│   │   ├── page-grandslams.jsx  [6.4 KB]  Grand Slams placeholder page (dated copy, see Known staleness).
│   │   ├── page-home-v2.jsx  [18.1 KB]  v2 landing page.
│   │   ├── page-home.jsx  [7.2 KB]  Original home page.
│   │   ├── page-leaderboard.jsx  [10.5 KB]  Leaderboard page (being retired, see Known staleness).
│   │   ├── page-model.jsx  [11.5 KB]  Model and provider template pages.
│   │   ├── page-profile.jsx  [12.7 KB]  User profile page (out of scope for the app; demo data).
│   │   ├── replay.jsx  [4.5 KB]  Shared replay builders and board renderers.
│   │   ├── shell-v2.jsx  [10.2 KB]  App shell v2: theme, router, header and footer.
│   │   ├── shell.jsx  [7.1 KB]  App shell v1: header, footer, theme, router.
│   │   └── widgets.jsx  [3.2 KB]  Shared widgets: MatchCard, GameCard, LeaderRow.
│   ├── assets/  [649.9 KB, 3 files]  Logo copies used by the v4 prototype (duplicates of 01-brand).
│   │   ├── logo-dark.png  [297.5 KB]  Duplicate of 01-brand/logo-dark.png.
│   │   ├── logo-light.png  [222.7 KB]  Duplicate of 01-brand/logo-light.png.
│   │   └── mark.png  [129.7 KB]  Duplicate of 01-brand/mark.png.
│   ├── styles/  [144.8 KB, 11 files]  Prototype stylesheets (tokens, chrome, components, per-page CSS).
│   │   ├── arena.css  [26.5 KB]  Arena (rebuilt) styles, light and dark.
│   │   ├── chrome-v2.css  [9.1 KB]  v2 header, footer and page scaffolding.
│   │   ├── chrome.css  [5.4 KB]  v1 header, footer and page scaffolding.
│   │   ├── components.css  [9.1 KB]  Buttons and other component styles.
│   │   ├── games.css  [7.0 KB]  Game boards and arena visuals.
│   │   ├── landing.css  [11.5 KB]  v2 landing page styles (.lp- namespace).
│   │   ├── pages.css  [14.8 KB]  Widgets, home, leaderboard styles.
│   │   ├── pages2.css  [26.4 KB]  Battlefield, arena, Grand Slams, profile styles.
│   │   ├── pages3.css  [13.0 KB]  Modals and revised battlefield / arena / profile / Grand Slams styles.
│   │   ├── pages4.css  [14.8 KB]  Model, provider, game and auth page styles.
│   │   └── tokens.css  [7.1 KB]  Prototype design tokens (light default, dark variant).
│   ├── eSlams v4.html  [3.9 KB]  Prototype entry page. Serve over HTTP, open #/arena.
│   └── prototype-v4-arena-setup-stage.jpg  [42.6 KB]  Screenshot: v4 Arena setup stage (matchup hero, preview, model wheel).
├── 07-catalog-data/  [32.2 KB, 9 files]  Real 50-game catalogue types and data from packages/core-types, plus glyph mapping code.
│   ├── game-animation.ts  [0.3 KB]  Animation spec type and per-family motion timings.
│   ├── game-catalog.ts  [20.0 KB]  The real 50-game catalogue: slugs, variants, families, seat layouts.
│   ├── game-help.ts  [0.6 KB]  How-to-play content type (objective, turn rules, scoring).
│   ├── game-render.ts  [0.6 KB]  Renderer families and board sizes.
│   ├── game-result.ts  [1.0 KB]  Result contract types (result types, score type, winner/draw/placement rules) imported by game-catalog.ts.
│   ├── game-surface.ts  [0.8 KB]  Which surface each game appears on (Arena, Battlefield, Official).
│   ├── game-topology.ts  [0.9 KB]  Topology (solo, head to head, multi-seat) and score types.
│   ├── mobile-game-glyph-mapping.tsx  [2.6 KB]  Mobile game-to-glyph icon mapping (Expo).
│   └── web-game-glyphs-and-primitives-excerpt.tsx  [5.4 KB]  Web game glyphs and UI primitives (excerpt).
├── 08-auth-web-reference/  [124.5 KB, 4 files]  Live web sign-in / create-account screens and the Identity prototype sign-in.
│   ├── identity-prototype-sign-in.jpg  [35.5 KB]  Identity prototype sign-in screen.
│   ├── web-login-desktop-1280.jpg  [19.5 KB]  Live web login, desktop 1280.
│   ├── web-login-mobile-375.jpg  [49.2 KB]  Live web login, mobile 375.
│   └── web-signup-desktop-1280.jpg  [20.2 KB]  Live web create-account, desktop 1280.
├── 09-platform-reference/  [62.8 KB, 1 files]  Code-verified digest of how the web Arena and its session API behave today.
│   └── ARENA_PLATFORM_CONTRACT_DIGEST.md  [62.8 KB]  Code-verified digest of web Arena routes, states, enums, timers, auth, with citations.
├── MANIFEST.md  [this file]  This file.
└── README.md  [4.1 KB]  Pack overview: what each folder is and how to use it.
```

## Notes

- `logo-dark.png`, `logo-light.png` and `mark.png` appear three times (`01-brand/`, `05-old-app-designs/prototype-v3/assets/`, `06-web-prototype-v4/assets/`). The copies are byte-identical and are kept so each prototype opens standalone. Use `01-brand/` as the source.
- `adaptive-foreground.png` and `adaptive-monochrome.png` are byte-identical.
- `07-catalog-data/` is a curated excerpt: `game-result.ts` is included so `game-catalog.ts` resolves, but a few type-only imports (for example `./usage` in `game-result.ts`) point at files that are not included. That does not affect the data you need (slugs, variants, families, timings).
- `06-web-prototype-v4/app/page-profile.jsx` contains demo profile data including a placeholder email address. It is prototype data, not a real customer record.
- Staleness: see the "Known staleness" section in `README.md`. The Arena brief wins where it conflicts with `03-design-canon/`.
