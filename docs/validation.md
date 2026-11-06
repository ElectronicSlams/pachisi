# Validation — current evidence and history

## Adversarial review resolution · 6 November 2026

Full local CI passed with 106 tests, the packed ESM/TypeScript/Next consumers, and browser checks across desktop/phone and light/dark. The browser also compared the actual painted scenes for 170 game/design selections, checked four settled Connect Four placements under both motion preferences, and inspected seven replays with keyboard and touch controls. The [review resolution](reviews/2026-11-05-adversarial-design-review.md#resolution--6-november-2026) maps every finding to its fix.

Pinned Core regeneration produced 690 legal transitions in 740 frames and reproduced byte-for-byte with the generator’s check mode. All 38 planted faults were caught, including a failing validator CLI exit for renderer-source mutations. The existing Taxi state issue and missing Bridge dummy data remain explicit exceptions. [CI](validation/local-ci.json) · [Browser](validation/browser.json) · [Consumer](validation/consumer.json) · [Physics](physics.md).

## Public GitHub visual-design sweep — 4 November 2026

Local CI passed on the working tree based on `c83e260`. All 102 tests passed. The browser exercised the findings for all 50 games on desktop and phone in light and dark themes, alongside 2,888 design and layout checks. The packed consumer checks also passed. [Local CI](validation/local-ci.json) · [Browser results](validation/browser.json) · [Consumer results](validation/consumer.json).

The offline source check verified 156 new files from 77 repositories and 443 earlier files from 38 repositories against their recorded hashes. The [per-game report](research/github-visual-sweep/README.md) identifies which entries have local files, which link upstream, and what each could contribute to a future design. Catalogue captures show the findings on [phone](captures/github-design-sweep-phone.png) and [desktop](captures/github-design-sweep-desktop.png).

## All-game design census and visual editions

The local CI gate passed on the working tree based on `c83e260`. 101 tests passed. The all-game browser suite exercised 722 game/design/placement combinations in each of four desktop/phone × light/dark cases (2,888 checks), including Connect Four. Every game passed selection, replay and rendered-bound checks. Game rules, trace validation and the 38 planted-error checks retained the previously documented limits. After the census metadata was finalized, the packed-consumer check also verified the general design registry, optional board design and both attributed Shudan SVGs in the archive.

The [census](research/local-game-design-census.md) reconciles 50 games, 38 imported source collections and 36 native sample associations. Byte comparisons verify the 27 unique active-turn previews. Material and paper editions share implementations by family. A passing test covers the supported web view and sampled states, not the underlying archived applications or a new playable rules engine. See [browser](validation/browser.json), [consumer](validation/consumer.json) and [local CI](validation/local-ci.json) for machine-readable evidence.

## Connect Four visual design collection

Local CI passed on the working tree based on `c83e260`. All 99 tests passed, including gravity, both diagonals, full columns, four-in-a-row termination and the stable design resolver. The physics validator retained its documented Taxi exception and caught all 38 planted errors.

The browser checked 20 distinct board/piece material combinations in each of four presentations, at desktop and phone widths in light and dark. All 320 design/layout cases kept the complete board, caption and four winning markers visible. A local match kept its position through a design change and supported undo and reset. The packed React consumer rendered Gumball through both animation and replay. A separate mobile check exercised copying the stable ID and link, synchronizing all thumbnails at the first and final frames, and decoding the six native captures.

[Compare the 20 boards at the same position](captures/connect-four-designs.png). The [browser](validation/browser.json), [packed consumer](validation/consumer.json) and [CI records](validation/local-ci.json) contain the gate results.

## Catalogue clipping and per-game variants — 3 November 2026

Full `pnpm ci:local` passed on the uncommitted working tree based on `c83e260`: 97 unit/regression tests, source-integrity and physics checks, catalogue build, and packed ESM/NodeNext/Next consumers. The browser suite now checks 856 presentation comparisons across all 50 games on desktop/phone in light/dark, including board/caption bounds and overlap. It also verifies category/selection consistency, empty search, unsupported table options, study inspection, and game-link persistence and scrolling. Existing 200 game selections, 132 study selections, replay, geometry and motion checks still pass.

The reported Connect Four crop came from applying the short arena-table container to a cell board, compounded by the catalogue's height cap. Unsupported table presentations now fall back to arena, the cap is removed, and arena/event board sizing leaves room for captions. The new comparison view is directly addressable as `?game=go#game-variants`; it displays implemented studies and layouts for one game, with imported source references identified separately.

Visual review: [complete Connect Four board](captures/connect-four-fit-desktop.png), [desktop variants](captures/game-variants-desktop.png), [phone variants](captures/game-variants-phone.png). See the latest [CI evidence](validation/local-ci.json) and [browser report](validation/browser.json). No upstream applications were executed or publication performed; only the redundant Chromium download was skipped.

## Public game-design collection — 3 November 2026

Full `pnpm ci:local` passed on the uncommitted working tree based on `c83e260`, including the earlier game-lab work. The research queries and upstream pins were collected on 1 November; this section records the final local verification on 3 November. The latest [local CI](validation/local-ci.json), [browser](validation/browser.json) and [consumer](validation/consumer.json) records supersede older counts below.

- 96 unit/regression tests passed; all 38 physics mutation cases were caught. The 50-game validator retains the documented Core taxi defect and variant/rendering limits.
- All 443 imported files from 38 repositories match their pinned Git blob IDs and SHA-256 hashes. Root and applicable nested licenses are present. The 148 SVG assets passed active-content checks and were visually inspected in contact sheets.
- All 50 games map to source references; the nine existing rule-variant notes are retained. Authored index/report generation is reproducible.
- Desktop/phone × light/dark browser checks passed: source search, category/license filters, empty results, per-game source disclosure and Backgammon's five-checker warning; plus 200 game selections, 132 study selections, replay controls and geometry checks. No external requests or horizontal page overflow occurred.
- Packed ESM, NodeNext and Next consumers passed. The actual tarball was checked to exclude `reference/` and `design-archive/` source files.
- Desktop light and phone dark source-library layouts and expanded license details were visually inspected: [desktop](captures/public-designs-1440-light.png), [phone](captures/public-designs-390-dark.png).

Only Pachisi and its authored catalogue/test tools were run. Imported upstream applications are partial source selections and were not executed or certified. Playwright used installed Chromium revision 1248; only the browser download was skipped. No publication or remote CI was performed. See the [research report](research/public-game-designs.md) for search boundaries and remaining exact-UI gaps.

## Game design lab — 1 November 2026

The full `pnpm ci:local` release gate passed on the working tree based on `c83e260`. This current record supersedes the historical “not run” statements below for the checks it names. The tree contains uncommitted implementation changes; the HEAD alone does not identify them. No remote CI or publication was performed.

| Check | Result |
|---|---|
| Frozen dependency install, TypeScript, ESM/declarations, catalogue build, public payload check | Passed |
| Unit/regression tests | 92 passed, zero failures |
| Independent game/physics validation | All 50 games, 722 frames and 672 transitions; 39 PASS, 9 PASS-with-RULE, 1 PASS-with-RENDER (Bridge dummy data), 1 known upstream taxi defect; no unexpected failures |
| Mutation self-test | All 38 planted errors caught, including eight new lander/racing/walker corruptions |
| Browser game and study selection | 200 game cases plus 132 study cases: desktop/phone × light/dark; replay controls, keyboard seeking, playback/pause, reduced motion, theme persistence and no horizontal page overflow |
| Browser geometry | 722 original frames finite; 33 authored studies / 47 frames fit their viewports; six Connect Four start/settle/overshoot cases passed |
| Packed consumers | ESM render, strict NodeNext types and Next server/client production build, including the new GameReplay export |
| Visual review | Every game's final bundled frame inspected in category contact sheets; desktop light and phone dark lab captures checked |

See [local-ci.json](validation/local-ci.json) for the actual host/tool versions and timing, [browser.json](validation/browser.json), [consumer.json](validation/consumer.json), and [the individual game review](reviews/2026-11-01-game-design-lab.md). Playwright used the installed Chromium revision 1248; only the redundant browser download was skipped. A new dependency advisory audit was not part of this pass.

- [Desktop replay lab](captures/lab-desktop-light.png)
- [Phone replay lab](captures/lab-phone-dark.png)

## Historical extraction evidence — 29 October 2026

The extraction is pinned to Platform `0fa7dfe227fe545036694c915a6b727eb4ee844a`. Existing tokens, brand PNGs and the mono font are byte-checked against their imported source hashes. No production application or live data was used.

| Check | Result |
|---|---|
| Frozen dependency install, TypeScript source/catalogue check | Passed |
| ESM JavaScript and declaration build | Passed; source client directives preserved |
| Package tests | 14 passed, including every one of the 722 synthetic frames, honest actual Board rendering, multiple tab instances, date/theme/identity contracts and documentation/data parity |
| Catalogue production build | Passed; React and demonstration data split into explicit chunks |
| Browser catalogue | Four desktop/phone × light/dark cases passed; all 50 game selections per case (200 scenes), dialogs/sheets, focus containment/return, tab keys, password visibility, denied clipboard, search, reduced motion, no horizontal overflow or external requests |
| Normal-motion scheduling | Artwork advances while visible; hover and offscreen state pause it |
| Browser geometry probe | All 722 bundled frames produce finite SVG geometry |
| Artwork rules reproduction | Generator check rerun against clean artwork Core `7731e2f3d712e5f4714d640df670fc0224feede1`: 50 games, 672 legal transitions, byte-identical data |
| Packed archive ESM consumer | Passed with no Platform aliases or required Next core import |
| Packed NodeNext TypeScript consumer | Passed with strict declaration checks (`skipLibCheck: false`) |
| Packed Next consumer | Next 16.4.1 webpack/static build passed with server root, client Field and optional Link/Button adapter; conventional Next bundler tsconfig |
| Dependency advisory check | Zero info/low/moderate/high/critical advisories after updating the optional Next dev fixture to 16.4.1 |
| Public payload check and source/asset review | Passed: no credentials, customer data, local user paths, private operator evidence or app-only dependencies |

Machine-readable [browser report](validation/browser.json) and [packed consumer report](validation/consumer.json) are committed. Browser checks used Playwright 1.57 with an explicitly selected locally installed Chromium executable (cache revision 1248); CI installs Playwright's pinned Chromium before running the same suite. The local runtime was Node 25.2.1; CI targets supported Node 22.

Selected synthetic catalogue captures:

- [Desktop light catalogue](captures/catalogue-desktop-light.png)
- [Phone dark catalogue](captures/catalogue-phone-dark.png)
- [Phone dark game preview](captures/game-phone-dark.png)
- [Phone dark event composition](captures/event-phone-dark.png)

## Physics and consolidation checks (29 October 2026, 0.2.0)

This section records the checks for the 0.2.0 changes: the physics review, the ported contract modules and the enlarged payload. The table above is the 0.1.0 record and has not been rerun here.

| Check | Result |
|---|---|
| Independent physics validator over the 50 bundled traces | 722 frames, 672 transitions. 49 games pass; 1 known Core issue (taxi frame 10: after dropoff the passenger is reported at the pickup origin instead of the destination). Of the passes, 9 carry rule-variant notes and 4 carry renderer notes found by the review (blackjack dealer hole card absent from public state, bridge dummy not shown, Connect Four win line not highlighted, hockey skaters on one cell); the Connect Four cue is addressed by the cue derivation. Exact rules were simulated for tic-tac-toe, Connect Four, Go, Gomoku, Hex, Othello, Pentago, Ultimate tic-tac-toe, checkers, mancala, backgammon, chess, shogi and xiangqi, with Gym dynamics for CartPole and MountainCar and conservation/arithmetic invariants elsewhere |
| Validator self-test | 30 planted errors (28 trace corruptions such as a teleported stone, wrong flip, illegal jump, chip creation, wrong trick winner, pole teleport, ball teleport and missing wall reflections, plus 2 renderer-source mutations), 30 caught |
| `pnpm check:physics` | Wired into `pnpm check` and CI by this change |
| `pnpm check:public` on the enlarged payload | Run on the tree that adds `design-archive/` (341 files, 8.7 MB) and `reference/platform/` (707 files, 8.6 MB). The result of that run is reported with the release, not asserted here. Neither folder is in the package `files` list. A human licence review is still required: see the provider-logo data URIs in NOTICE.md |
| Ported modules | `contract`, `board-adapter` and `interactions` have package tests (`tests/contract.test.tsx`, `tests/board-adapter.test.tsx`) and a catalogue example; `SOURCE_MANIFEST.json` lists 76 entries |

What the physics check does not show:

- Hole cards, concealed fleets and hands are private, so follow-suit is tested only as a provable revoke (none found). Some code paths never occur in the traces (a Go capture, a Morris mill, a backgammon hit, a poker raise or fold, a chess castle, promotion or en passant). They are exercised only by the self-test. No ko, shogi check or xiangqi check detection is attempted.
- 32 of 50 games run a different arena version on the current Platform. The result certifies the artwork pin (Core `7731e2f`) only, not current Platform rules.
- Nine games are legal only under Core's simplified variants; see "Rule variants in the bundled traces" in the [game guide](games.md).
- A passing trace is not proof that the renderer can carry a real match: card tables, poker, trick-taking layouts and the bespoke boards are still not adapted to actual state.

**Not run for this change:** `pnpm test:browser` (the 200-scene desktop/phone, light/dark browser pass was not rerun against the changed renderers), and a human visual review of the new catalogue cards and the Connect Four, Go, backgammon and battleship changes. The packed-consumer checks and dependency advisory check were also not rerun. The 0.1.0 results above must not be read as covering them. Nothing in `design-archive/` or `reference/platform/` was built, typechecked or run, by design.

## Local CI gate (hosted Actions unavailable)

GitHub Actions on the ElectronicSlams organisation is locked by a billing issue, so the hosted workflow cannot run; the workflow is manual-only until that is cleared. The gate is `pnpm ci:local`, which runs the same steps as the workflow job (dependency install, `pnpm check`, packed-consumer test, Chromium install, browser suite) on the developer machine and writes:

- `docs/validation/local-ci.json`: commit, branch, whether the working tree was clean, host versions (OS, Node, pnpm, Python) and the per-step result and duration.
- `docs/validation/browser.json` and `docs/validation/consumer.json`: the browser and consumer reports from that run.
- `docs/captures/*.png`: the four reference captures from that run.

The recorded commit in `local-ci.json` is the commit the evidence applies to. A later commit without a refreshed record is unverified. Local runs differ from the hosted job in one way: Chromium runs on macOS arm64 rather than Ubuntu x64, so platform-specific rendering differences are not covered.

## Limits and remaining consumer work

All 50 games have icons and Core-validated demonstration artwork at the artwork pin. Current Platform contracts use a later Core version: 32 game arena versions differ. This task does not certify those newer runtime rules or replace their existing actual-state viewers. The [game guide](games.md) distinguishes basic frame views, partial generic views and specialized games awaiting typed actual-state adapters. Native/Skia, complete all-family snapshots and video pipeline integration remain explicit extension work.

Finite-geometry checks are not a pixel comparison to every historical screenshot or a proof of all live gameplay states. Visual review inspected representative desktop/phone, light/dark catalogue captures and the event/game views. No authenticated provider journeys, production database calls or performance claims about deployed Platform routes are made. Catalogue bundle weights describe this all-components demo, not a consumer route budget.

No npm/registry publication, GitHub Pages deployment, production deployment or Platform consumer migration was performed. Consume a reviewed built archive/snapshot and follow the separate migration plan. CI results are separate from the local checks above.
