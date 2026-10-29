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

## Limits and remaining consumer work

All 50 games have icons and Core-validated demonstration artwork at the artwork pin. Current Platform contracts use a later Core version: 32 game arena versions differ. This task does not certify those newer runtime rules or replace their existing actual-state viewers. The [game guide](games.md) distinguishes basic frame views, partial generic views and specialized games awaiting typed actual-state adapters. Native/Skia, complete all-family snapshots and video pipeline integration remain explicit extension work.

Finite-geometry checks are not a pixel comparison to every historical screenshot or a proof of all live gameplay states. Visual review inspected representative desktop/phone, light/dark catalogue captures and the event/game views. No authenticated provider journeys, production database calls or performance claims about deployed Platform routes are made. Catalogue bundle weights describe this all-components demo, not a consumer route budget.

No npm/registry publication, GitHub Pages deployment, production deployment or Platform consumer migration was performed. Consume a reviewed built archive/snapshot and follow the separate migration plan. CI results are separate from the local checks above.
