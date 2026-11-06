# Platform reference (vendored, read-only)

Verbatim eSlams Platform presentation source, kept here so that pachisi holds all eSlams presentation work in one place.

- NOT compiled. `tsconfig.json` includes only `src` and `catalogue`; nothing here is imported by the build.
- NOT exported. `package.json` `files` is an explicit list that does not include `reference/`.
- NOT a supported API. Files keep their original relative paths and original imports (`@/lib/...`, `@eslams/...`, `pixi.js`, `next/image`, Expo, Skia) and will not typecheck or run in this repository.
- The ported, supported modules live in `src/`. Treat this tree as a source of truth to port from, never to import from.
- `MANIFEST.json` lists every copied file with `source` (`makriman/eSlamsPlatform@<commit>:<path>`), `target`, `sha256` and `bytes`. One file was edited (see Scrub).

## Provenance

| Folder | Source | Commit | Date | Why this commit |
|---|---|---|---|---|
| `web-0fa7dfe/` | `makriman/eSlamsPlatform` | `0fa7dfe227fe545036694c915a6b727eb4ee844a` | 2026-10-18 | Current web presentation source |
| `mobile-8dd06c12/` | `makriman/eSlamsPlatform` | `8dd06c12819b062d983ca68f05b2c5213e43d9b8` | 2026-08-02 | Last `main` that still had `packages/board-skia`, `packages/theme-tokens` and `apps/mobile` |

`packages/board-skia`, `packages/theme-tokens` and `apps/mobile` were deleted from Platform on 2026-08-16 by commit `8b88fde0` ("Remove retired mobile platform surface"). They are preserved here from the last `main` that had them (`8dd06c12`; the working-tree paths copied were unmodified against that commit). They are also recoverable from `8b88fde0^`.

Skipped (over 2 MB): `packages/board-skia/goldens/offscreen/manifest.json` (2,993,219 bytes). All 375 golden PNGs are included.
Excluded by rule: `.DS_Store`, `node_modules`, `*.log` (including `.turbo/` logs), lockfiles.
Not copied although referenced: `apps/web/lib/home-showcase.ts`, `lib/replay-playback.ts`, `lib/public-artifact-replay.ts`, `lib/platform-data.ts`, `components/stadium/board.tsx` wrappers (already in pachisi `src/stadium`). `game-render-contract` has no README upstream.

## web-0fa7dfe (from Platform 0fa7dfe, paths under `apps/web/` unless noted)

### Replay and Battlefield viewers

| File | Lines | What it does | Blocks a clean port |
|---|---|---|---|
| `components/replay-board.tsx` | 1110 | Real replay viewer set. `ReplayVisualFrame` dispatches 19 renderer kinds to per-game DOM boards (token boards, Go stones, Connect Four, Hex, Mancala, Nine Men's Morris, Backgammon, Battleship, dice, card table, strategy matrix, RL grid) plus `ReplayArcadeStage`, a dynamic `pixi.js` v8 canvas drawing 9 arcade scenes | `pixi.js` ^8.19 (dynamic import), `@/lib/replay-view-state`, `@/lib/replay-visualization` types, CSS in `games.css`/`pages2.css` |
| `lib/replay-visualization.ts` | 1419 | Replay events to `PublicReplayFrame` timeline; `boardDimensionsBySlug`; `replayRendererForGame` (19 kinds); per-family state to cell extraction; privacy check | `@eslams/core-types` (`GAME_CATALOG`), `@eslams/game-render-contract` |
| `lib/replay-view-state.ts` | 268 | Replay view-state model | `@/lib/platform-data` (`MatchSeed`), `@/lib/public-artifact-replay`, `@/lib/replay-playback` |
| `lib/use-replay-playback.ts` | 223 | Reducer + hook: speeds 0.5/1/2, autoplay 2000 ms | `@/lib/replay-view-state` |
| `components/battlefield-client.tsx` | 2109 | Battlefield: `MatchStage`, `StadiumReplayBoard`, `ReplayTransport`, `MoveLedger`, `AdvantageMeter`, `StreamingReasoningText`, request-match form | Mostly product wiring: account store, analytics, fetch, public-battlefield contract, `next/link`; presentation parts need splitting out |
| `components/platform-pages.tsx` | 4893 | Monolith. Arena play path (about lines 2231-3160): `ArenaRuntimeBoard`, TTT/C4/chess/cell boards, RL control board, legal-action panel, score panel, `ArenaPreview`, `ResultScreen` | Controller coupling (`arena-controller`, session, auth, profile, `platform-data`, `next/navigation`); board JSX is separable |

### Arena card/tile table and interactions

| File | Lines | What it does | Blocks a clean port |
|---|---|---|---|
| `components/arena-card-table.tsx` | 917 | Seat-layout card/tile table (compass/ring seats, hands, face-down runs, sealed commitments, Mahjong) | `next/image` (swap for `<img>`), `@/lib/arena-viewer-private`, legal-action matching, asset URLs under `/assets/` |
| `lib/arena-viewer-private.ts` | 366 | Strict validators for private hands, Hanabi, Mahjong, ship positions, commitments | None (no imports); privacy gate, pairs with the card table |
| `lib/arena-interactions.ts` | 510 | Pure legal-action presentation: labels, from/to/promotion parsers, cell-index and RL slot mapping | One type import from `@/lib/platform-data` (`ArenaSeed`) |

### Stadium adapters, share, home

| File | Lines | What it does | Blocks a clean port |
|---|---|---|---|
| `lib/stadium/board.ts` | 152 | Host adapter: `boardFrameFromCells`, `normalizeCellToken`, `cardFrameFromRecord`, `describeBoardFrame` | `GAME_CATALOG` (`@eslams/core-types`), `@eslams/game-visuals/board-types` |
| `lib/stadium/records.ts` | 139 | Scripted preview/hero records | `home-showcase`, `home-game-animations`, `stadium/board` |
| `lib/home-game-animations.ts` | 302 | Locked hero sequences: chess line, seeded Connect Four/Othello playouts (contains real flip and win-window logic) | `@/lib/home-showcase` (not copied) |
| `components/home/hero-card.tsx` | 139 | Hero card: Board + scripted records, 2 s final-frame hold, reduced motion | `next/link`, `home-showcase`, `home-data`, `@/components/ui/icon` |
| `components/stadium/match-share-sheet.tsx` | 100 | Share dialog (frozen turn, PNG) | `stadium/sheet`, `ui`, `stadium/board`; host callbacks |
| `lib/stadium/match-share-image.tsx` | 31 | Share image (Satori-safe flex board) | `next/og` `ImageResponse` |
| `lib/stadium/share-chess-piece.tsx` | 16 | Chess piece paths for the share image | None |

### CSS (apps/web/styles)

| File | Lines | What it does | Blocks a clean port |
|---|---|---|---|
| `games.css` | 1834 | Legacy board visuals: `.chessboard .cb-*`, TTT, Connect Four drop, board keyframes | Used by `replay-board.tsx`; legacy class names |
| `pages2.css` | 3315 | Arena and Battlefield page CSS; 15 keyframes (`arena-card-deal`, `arena-piece-settle`, `arena-preview-*`, `bfReasoningCaret`) | Heavily page-coupled |
| `arena-v2.css` | 3338 | `.arena2` scoped tokens, felt/rail table and seat skin | Scoped to Arena page markup |
| `stadium-battlefield.css` | 138 | Battlefield stage grid (`.bf-broadcast-layout`) | Page markup |
| `table-games.css` | 174 | Seat map preview, table pill | Small and clean |

### Packages

| Path | Lines | What it does | Blocks a clean port |
|---|---|---|---|
| `packages/game-render-contract/src/index.ts` (+ `tests/`, `package.json`, `tsconfig.json`) | 496 (+145 test) | Public-state/display-frame parsing, 12-family scene builder, accessibility scene, action targets, safety asserts | Pure TS; imports `@eslams/core-types` (versions, `GameRendererFamily`, `assertPublicReplaySafe`) |
| `packages/core-types/src/contract-versions.ts` | 22 | Version constants | None |
| `packages/core-types/src/public-replay-safety.ts` | 100 | `assertPublicReplaySafe` privacy regexes | None |
| `packages/core-types/src/game-render.ts` | 23 | `GameRendererFamily` and `GameRenderSpec` types | None |
| `packages/core-types/src/game-catalog.ts` | 537 | 50-game catalogue; defines `rendererFamilyForGame` (line 370) | The catalogue is product data (`GAME_CATALOG`) |
| `packages/game-visuals/{README.md,SOURCE.json,package.json,tests/board-contract.test.ts}` | 28 (test) | The files pachisi did not take from game-visuals; `SOURCE.json` pins independent repo commit `35e44a7` | Documentation/pin only |

### Assets

| Path | Files | Licence |
|---|---|---|
| `apps/web/public/assets/playing-cards/v1/` | 54 SVG + `1B.svg` + `SOURCE.md` | CC0 1.0 (me.uk generator); `1B.svg` is an eSlams original, MIT |
| `apps/web/public/assets/mahjong/v1/` | 44 SVG tiles + `SOURCE.md` | CC BY 4.0 for the vendored set (see below) |

## mobile-8dd06c12 (from Platform 8dd06c12)

| Path | What | Blocks a clean port |
|---|---|---|
| `packages/board-skia/src/{plan,geometry,motion,types,registry-core,definitions,preview-scene}.ts`, `src/families/*.ts` (12 files, 4,300 lines) | Pure `RenderPlan` builders per render-contract family: normalised 0..1 geometry, hit zones, motion. Web-agnostic plan layer | Imports `@eslams/theme-tokens`, `@eslams/game-render-contract`, `@eslams/core-types`; targets the 35 mobile Arena games (50 exist now) |
| `packages/board-skia/src/{skia-executor,material-shader,reanimated-motion,renderer-factory,native}.ts` | Skia executor, SkSL material shader, Reanimated motion | `@shopify/react-native-skia` 2.6.2, `react-native` 0.86.2, `react-native-reanimated` 4.5.1, `react-native-worklets` |
| `packages/board-skia/src/golden/`, `tests/`, `scripts/golden-offscreen.ts`, `goldens/` | Golden harness: 375 CanvasKit CPU PNGs (299 semantic states x 12 families x 6 themes) plus card-table contract JSON | Runner needs `canvaskit-wasm` and a font; `tsconfig.json` extends `../../tsconfig.base.json` (not copied) |
| `packages/theme-tokens/` (`src`, `tests`, `themes.css`, `visual-snapshot.json`, `README.md`) | 6-theme contract (classic-light/dark, neon, club, arcade, midnight; `system` is a preference), 32 token names, AA-corrected win/loss/draw text roles, material and glow budget | None (pure TS, no React/RN imports) |
| `apps/mobile/src/arena/` (103 files) | Stage layout/scene, board zoom sheet, curtain riser, dice-bid/value/direct action controls, private inventory, result screen and celebration, share result | React Native, Expo, Reanimated, `@/` aliases, session/auth/network modules |
| `apps/mobile/src/renderer/` (8 files) | Canvas host, board theme, runtime contract | `@shopify/react-native-skia`, React Native |
| `apps/mobile/src/feedback/` (5 files) | Sound catalog per family (`MOVE_SOUND_SOURCES`), cue contract, haptics runtime | `expo-audio`, Expo haptics |
| `apps/mobile/assets/production/audio/runtime/*.wav` (14) | 12 per-family `move_*.wav`, `piece_arrival.wav`, `result_chord.wav`; mono 44.1 kHz PCM16, fixed-seed synthesis | None (plain WAV) |
| `apps/mobile/assets/production/{README.md,manifest.json}`, `apps/mobile/scripts/{generate,validate}-production-assets.py` | Generator (831 lines) and validator (292 lines) for icons and audio; deterministic hashes | Python 3, Xiph `vorbis-tools`; the generator also builds icons that are not copied |

## Licences

- eSlams code: MIT (Electronic Slams). See the repository `LICENSE`; `packages/game-visuals/LICENSE` at 0fa7dfe is the same family.
- Playing cards (`playing-cards/v1`): CC0 1.0 Universal, generated at https://www.me.uk/cards/ (source permits modification, no attribution required). `1B.svg` back is an eSlams original (MIT).
- Mahjong tiles (`mahjong/v1`): the vendored set is licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Base set from https://github.com/FluffyStuff/riichi-mahjong-tiles (commit `26e127ba2117f45cdce5ea0225748cc0cfad3169`, CC0). Flowers and seasons from https://github.com/xhokir/riichi-mahjong-tiles (commit `19d72ff5cf9ad9c401188734f80cef7e6c8c6140`, whole set CC BY 4.0). Optimised with SVGO 4.0.0. Required attribution text from upstream `SOURCE.md`: "tile artwork by FluffyStuff and xhokir, used under the licences listed above." Any distribution of these tiles must carry that attribution and a link to the CC BY 4.0 licence. No standalone licence file exists next to the tiles upstream; `SOURCE.md` is the licence source, copied verbatim.
- Audio and icon generators in `mobile-8dd06c12` are eSlams MIT code; the WAVs are synthesised, not sampled.
- Not independently verified: upstream licence claims of FluffyStuff/xhokir/me.uk. Confirm with a qualified reviewer before any public redistribution of the tiles.

## Scrub

- `packages/game-visuals/README.md` contained an absolute local home-directory path to the independent game-visuals repo; rewritten to `~/eSlams/...`. This is the only file differing from upstream. `MANIFEST.json` records `source_sha256` and the stored `sha256` for it.
- No secrets matched (`ghp_`, `sk-ant`, `AKIA`, `PRIVATE KEY`, `GOCSPX`). The only email-shaped string is the placeholder `name@example.com` in `platform-pages.tsx`.
