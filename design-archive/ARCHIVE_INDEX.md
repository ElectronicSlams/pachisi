# Design archive index

## Purpose

This folder is a **historical, non-canonical** archive of eSlams design work produced between June and October 2026. It exists so earlier directions, prototypes, briefs and token experiments can be consulted (for example during physics, motion and board-rendering reviews) without hunting through scattered download folders.

The **live design system is pachisi `src/` and `styles/`**. Where anything in this archive disagrees with them, `src/` and `styles/` win. Nothing here is imported by the build, the tests or the catalogue.

Files were copied verbatim, with three exceptions listed under "Scrub notes": absolute local paths were rewritten to `~/`, six real-looking mock persona emails were replaced, and no file was edited otherwise. Every source folder named below lives under `~/Downloads/eSlams/` on the original author's machine.

## Stale facts warning

Nothing in this archive is design authority. The chronology in [`docs/design-decisions.md`](../docs/design-decisions.md) ("Which source wins" and "Resolved historical contradictions") decides what is current: the founder's later explicit decisions and the shipped components first, then the October Stadium implementation notes, founder review, corrections and walkthrough in date order, then the 30 September Stadium brief and prototype only where not superseded, and everything else here as history.

Facts in the archived prototypes that the live chronology has overridden:

- A **December 2026 Grand Slams date** (web v1 to v4, home, mobile v3, identity). Cancelled. The current dates are **8 to 14 February 2027**.
- A **hosted evaluation leaderboard** as the product (Elo wording, "climb the board" copy, provider walls). Hosted evaluation rankings are retired. Arena and Battlefield keep separate **completed-match Records** with the founder-approved public labels; model and provider discovery pages were explicitly restored in October. Do not read the brief's blanket "no leaderboard" line as the final word.
- Trinity (admin console), phone verification, device attestation and the six-theme system appear in web v4, identity-trinity, mobile v3 and parts of arena-app. Shipping Stadium web has light/dark with system preference; the other four palettes are archived-mobile reference data.
- The Stadium brief and prototype (`stadium-brief-and-assets/`, `stadium-prototype/`) are the newest items here but are themselves superseded in places by the 3 October founder review, the reference corrections and the 4 October walkthrough cleanup listed in the design decisions.

## How to open things

- `*.dc.html` files (Design Components) need a **static HTTP server with the sibling `support.js` in the same folder**. They do not work from `file://`. Example: `cd design-archive/home-v2 && python3 -m http.server 8080`, then open `http://localhost:8080/eSlams%20Home%20v2.dc.html`.
- **Web v4** (`web-v1-v4/eSlams v4.html`) is a React 18 + Babel standalone page. It loads `styles/*.css` and `app/*.jsx` by relative path, so serve the `web-v1-v4/` folder over HTTP and open the file. It needs network access for the React and Babel CDN scripts.
- `arena-app/eSlams Arena App.html` is a single-file build and opens directly in a browser. It is generated from `arena-app/prototype/src` by `prototype/build.py`.
- Prototype images: copies of the brand PNGs and provider marks that the prototypes referenced from their own `assets/` folders were **not** copied. Prototypes will therefore show broken logos or marks. The brand masters are in `brand-masters/`.

## Subfolders

| Folder | Era / date | Original source (under `~/Downloads/eSlams/`) | Contents | Main entry file and sha256 |
|---|---|---|---|---|
| `web-v1-v4/` | E1 to E2, June to 6 July 2026 | `DESIGN_NOTES*.md`, `eSlams.html`, `eSlams v2.html`, `eSlams v4.html`, `app/`, `styles/`, `uploads/arena.html` | Web landing and inner pages v1/v2, then v3/v4 and the Arena rebuild: four design notes, three entry shells, 22 React-in-browser source files (v4 superset including v1 and v2 pages), 11 CSS files (`games.css`, `arena.css`, tokens, pages), and `references/arena.html` (the user-supplied reference HTML that seeded the Arena rebuild). No screenshots. | `eSlams v4.html` `274c24704e104b698b60a58204108d1b752c42529a4dfa04d0bcb09812be9b74` |
| `brand-masters/` | Brand source, July 2026 (clean copy, September 2026 pack) | `claude-design-handoff/assets/01-brand` | `hi-res/` full-size mark and wordmarks (132,777 / 228,085 / 304,679 bytes), `web-optimized/` PNGs, social card, favicon, `app-icons/` (store and Android adaptive icons, splash). The only raster images allowed in this archive. Clean copy, not the C2PA-stamped copy. | `hi-res/mark.png` `770ad8664478e42d918085211d3de1f7e40bfb8f2e3b4a7bf428ea2c2464fb9d` |
| `web-v3/` | E2, June 2026 (web v3 snapshot) | `export-v3/{app,styles,eSlams v2.html,DESIGN_NOTES_v3.md}` | Web v3 pages and styles. Superseded by `web-v1-v4/`; only nine files differ from v4 (`page-game.jsx`, `page-arena.jsx`, `widgets.jsx`, `data.js`, `page-home-v2.jsx`, `page-leaderboard.jsx`, `pages.css`, `pages4.css`, `landing.css`). Kept as the only copy of the v3 pages. | `eSlams v2.html` `a16f3771a643a1642fa2de9c4a2ae77ab818edabdc5d355c3ab96144444daac1` |
| `home-v1/` | E1 to E2, June 2026 (home exploration) | `Eslams.com design reference/{eSlams Home.dc.html, es-data.js}` | Home v1 Design Component and its data file. Only copy of v1. Needs `support.js`; the v1 folder does not ship one, borrow `../home-v2/support.js` into a scratch copy to open it. | `eSlams Home.dc.html` `f59bd2a9a95efca5ecde463ed66cdc298842e25b4b9007789f27e23cc719a30d` |
| `home-v2/` | E3, 19 July 2026 | `final homepage design/{WIRING.md, eSlams Home v2.dc.html, es-data-v2.js, support.js}` and `Eslams.com design reference/uploads/DESIGN_NOTE_home.md` | Home v2 ("hero kept, nine bands to five movements"), wiring notes, and the home design note. | `eSlams Home v2.dc.html` `44d6eb642f07d1321453e5e6a683cb0d0c0ea0894c642b71df156d2a0957d734` |
| `mobile-v3/` | E3, 20 to 24 July 2026 (build plan 30 July 2026) | `eslams-app-v3/{...}`, `design_handoff_eslams_app/{IMPLEMENTATION.md, tokens.css}`, `mobile-app-build-plan-v2.md` | Mobile app v3 prototype (38 games, Battlefield and Arena tabs), its data and support files, the high-fidelity `IMPLEMENTATION.md` spec, `tokens.css` (six themes via `data-th`, 15 `es*` keyframes), and the Expo build plan that pairs with it. The build plan cites `CHANGE_REQUEST_v2/v3.md`, which are not in this archive. | `eSlams Mobile App v3.dc.html` `fb8a8c3cd7eacbfac631f43d2d926beebaf310d37cf32d633f36ed726a2d9e49` |
| `identity-trinity/` | E3, 8 July 2026 | `Profile Design New/{*.html, support.js, docs/, eslams/styles/}` | Sign-in, onboarding, profile and Trinity admin prototypes, the corrected four-role RBAC mock, four design docs, and the identity/trinity CSS (its `tokens.css` differs slightly from the web one). Includes the mock user table. `support.js` is included so the `.dc.html` files can open. | `eSlams Identity.dc.html` `589ef29f91526e5f6c7f75f034cfbdb5cab7dc93da3d92c2496f6c999feb7178` (`eSlams Trinity.dc.html` `6f7fc0650654454515ada22f4e9ad1d4be1b58fb20a2bd7f0256cf0083a7a6af`) |
| `stadium-prototype/` | E4, 1 October 2026 | `Scoping picks pending (1)/stadium/` (identical to the original `eslams redesign` folder) | The Stadium design prototype against the 30 September brief: chrome and all surfaces, shared `Board.dc.html` renderer, `games.json` (50 games with family, grid and `moveMs` timing), data, locked hero sequences, `BATTLEFIELD_AT_SCALE.md`, README, `support.js`. The `assets/p/` provider marks and the screenshot were not copied. | `eSlams Stadium.dc.html` `2e03811a0c6d7add62c31a031c537e4f90d446af1adbde78525970aea9f946b8` |
| `stadium-brief-and-assets/` | E4, 30 September 2026 | `claude-design-handoff/eSlams-Stadium-Design-Brief.md` and `claude-design-handoff/assets/{00-brief, 02-tokens, 04-game-art, 05-data, 09-reference-docs, 10-audio, README.md}` | The canonical Stadium design brief; shared tokens and components CSS including `game-motion.css`, `game-shell.css`, `table-games.css`; 56 playing-card and 45 mahjong-tile SVGs; the 50-game catalogue, 90-provider data, opponent roster, hero animation records and a sample chess replay; reference docs (including `TECH_NOTE_battlefield_visualization.md`); 14 move and result audio cues. | `eSlams-Stadium-Design-Brief.md` `cb882abe4e6350f1839cc972516451939df84b57855f33973b81366ded8cca6e` |
| `arena-app/` | E5, 30 September to 2 October 2026 | `Arena App Design/` (briefs, built HTML, `prototype/{src, research, contracts, build.py, qa scripts}`, selected `assets/`) | The Arena-only Expo app design: brief, final-polish brief ("last design round"), polish handoff, onboarding and themes plan, built single-file prototype, hand-written source (`boards-grid`, `boards-table`, `engines*`, `scene.js` canvas field with parallax and touch repel, onboarding, auth), six-theme research, QA scripts and JSON results, token and catalogue snapshots, old-app handoff spec. | `eSlams Arena App.html` `50c8ea46bf344c3827108ccccaa3743f3a793f429d0d758e3d0aa05217ea733f` (brief `ARENA_APP_DESIGN_BRIEF.md` `4245811929496551bfacbfdd8921795e521768a3a06a551b0c1eae53b46ef0d9`) |

Within `arena-app/`, the QA harness (`prototype/qa/*.js`) has its Playwright path rewritten to a `~/` placeholder; it will not run unchanged. `prototype/qa/last-*.json` are recorded results from the original machine.

## Deliberately excluded

| Excluded | Reason |
|---|---|
| Provider marks (61 SVGs in `03-provider-marks`, 9 in the Stadium prototype `assets/p/`, provider logo folders in the Arena pack) | Third-party trademarks. `NOTICE.md` says no third-party provider logos are bundled and consumers supply marks where they have rights. |
| All screenshots and raster images (PNG, JPG) other than the brand masters: the Stadium `06-current-site-2026-09-30` captures, `07-prior-design-screens`, `qa/shots` (154 MB), `qa/final`, `qa/final-polish` PNGs, `pr-screenshots`, reference `pasted-*.png`, Stadium prototype screenshot | Large, low value, and may contain unreleased UI or personal data that was never reviewed pixel by pixel. |
| `arena-app/prototype/qa/final-polish/contact-sheet.png` (3.9 MB) | Screenshot and over the 2 MB limit. Its `README.md` is kept. |
| All `*.zip` files (Stadium asset pack, Arena prototype and asset zips, `Profile Design New.zip`, others) | Duplicates of folders that are archived loose. |
| The C2PA-stamped Stadium asset pack (`Scoping picks pending (1)/uploads/eslams-stadium-design-assets`) | Same content as the clean pack with injected content-credentials manifests. The clean `claude-design-handoff` copy is used. Originals remain on disk. |
| `08-prototypes` in the Stadium pack, `final 2/`, `final/`, `export-arena/`, `design_handoff_eslams_app/reference/`, the Arena `prototype-v3` and `06-web-prototype-v4` copies | Byte-identical duplicates of archived folders. |
| Brand PNG copies inside prototype `assets/` folders | Duplicates of `brand-masters/`. |
| `.DS_Store`, `.thumbnail`, `__MACOSX`, `node_modules` | Junk. |
| Arena `rebuild-zip.sh`, `qa/final-polish/capture.js` and `capture-log.txt` | Not requested; packaging and capture helpers. |

## Open decision: embedded provider logos

`arena-app/prototype/src/assets.js` and `arena-app/eSlams Arena App.html` embed provider logos (and brand data) as `data:` URIs inside a historical prototype. These are third-party trademarks sitting inside files that cannot be separated by simple exclusion. **A founder or legal decision is needed** before this archive is made public: keep them, strip them, or drop those two files.

## Scrub notes

- Absolute local paths (the macOS home-directory prefix) in `arena-app/prototype/CONTRACT.md`, `qa/auth-test.js`, `qa/scene-bench.js`, `qa/last-run-file.json` and `qa/last-audit-file.json` were rewritten to `~/`.
- The mock data in `identity-trinity/` and `web-v1-v4/app/page-profile.jsx` contains fictional or placeholder emails and a placeholder API key string (`esl_live_...`). They are prototype data, not credentials, but reviewers should confirm before publication.
- Six mock persona emails in `identity-trinity/eSlams Trinity.dc.html` used real institutional domains. They were rewritten to `@example.org` so no real mailbox is implied. The file's hash in the table above is the hash after that edit.
