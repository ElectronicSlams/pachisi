# Validation — 29 October 2026

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
