# Attribution and public payload

Pachisi extracts selected presentation code from eSlams Platform at `0fa7dfe227fe545036694c915a6b727eb4ee844a` (19 October 2026). `SOURCE_MANIFEST.json` records the source path and SHA-256 of every imported file. Extracted MIT code retains Electronic Slams' copyright and MIT licence.

Game visuals originate in `@eslams/game-visuals` 0.1.0, independent source commit `35e44a7033ef1240c86c3b815afb05115d897cb2`, via the reviewed Platform snapshot. The library contains public synthetic demonstration traces, not customer or real-match records. Their artwork Core pin is retained in `src/game/game-demonstrations-source.json`; it is separate from the production runner pin.

The eSlams mark and wordmarks remain Electronic Slams' brand identity. Including source assets does not grant a trademark licence, imply endorsement or authorize changing the marks. No third-party provider logos, customer avatars or screenshots from production accounts are bundled. Consumers supply provider marks where they have the appropriate rights.

## Design archive and Platform reference (not part of the built package)

Two folders hold historical or verbatim material. Neither is compiled, imported by `src/` or listed in the `files` array that controls what a package archive contains.

- `design-archive/` holds de-duplicated eSlams design prototypes, briefs and token experiments from June to October 2026, copied from the original author's working folders. `design-archive/ARCHIVE_INDEX.md` records each source folder, entry-file hashes, what was deliberately excluded and the scrub notes (local paths rewritten, six mock persona emails replaced). It is non-canonical: `src/` and `styles/` win wherever they differ. Prototype code and documents are eSlams work under the repository's MIT licence unless a file says otherwise.
- `reference/platform/` holds verbatim, un-built Platform presentation source from `makriman/eSlamsPlatform` at `0fa7dfe227fe545036694c915a6b727eb4ee844a`, plus the native Skia renderer, theme tokens and mobile arena set recovered from `8dd06c12819b062d983ca68f05b2c5213e43d9b8` (removed upstream on 2026-08-16 by `8b88fde0`). `reference/platform/MANIFEST.json` records source, target, SHA-256 and size for every file, and `reference/platform/README.md` records the one scrubbed file. eSlams code is MIT.

### Third-party artwork in the archive and reference trees

- **Playing cards (56 SVGs)**: generated with the me.uk card generator and released under CC0 1.0 Universal (public domain). No attribution is required. Each vendored `SOURCE.md` records the options and date.
- **Mahjong tiles (45 SVGs)**: licensed under **Creative Commons Attribution 4.0 International** (https://creativecommons.org/licenses/by/4.0/). The base set is FluffyStuff `riichi-mahjong-tiles` (commit `26e127ba2117f45cdce5ea0225748cc0cfad3169`, CC0). The flower and season faces come from the `xhokir/riichi-mahjong-tiles` fork (commit `19d72ff5cf9ad9c401188734f80cef7e6c8c6140`), which licenses its complete vendored set under CC BY 4.0. Credit: FluffyStuff and xhokir, with files optimized (SVGO) and renamed by eSlams. Keep the vendored `SOURCE.md` with these files, and carry this attribution into any product that ships them.

### Provider artwork policy · 6 November 2026

The repository is public. The 61 inline provider SVGs have been removed from both `design-archive/arena-app/prototype/src/assets.js` and `design-archive/arena-app/eSlams Arena App.html`; provider auth icons now use a generic account outline. The prototype's existing text/initial fallback remains usable. First-party eSlams brand PNG data URIs are retained. Earlier versions of this notice incorrectly described the inline provider SVGs as data URIs. Git history retains prior versions; this change does not rewrite history.

Provider marks are host-supplied in the supported package and omitted from the current Arena archive. Standalone provider-mark folders remain excluded. Nothing in the archive grants a trademark licence.

JetBrains Mono is distributed under the SIL Open Font License in `assets/fonts/OFL.txt`. Its original filename and bytes are preserved. System sans fonts are referenced but not redistributed.

Public payload review excludes credentials, environment files, operational release evidence, private reference recordings, database exports, hidden evaluation suites, account data and production captures. Documentation links to selected source files rather than republishing private operational documents. `pnpm check:public` repeats the automated payload and app-dependency checks; a human source/asset review remains part of every public change.

## Public GitHub design references (2026-11-01)

`reference/public-games/` is an independently licensed, non-canonical collection of selected design references and assets. Its 38 upstream repositories retain their original MIT, Apache-2.0, BSD, CC0, GPL or AGPL terms, copyright headers, license texts and applicable NOTICE files. **The root MIT license does not relicense these files.** See the [collection README](reference/public-games/README.md), [source/license selection](reference/public-games/SOURCES.json), [byte-level manifest](reference/public-games/MANIFEST.json), and [per-game/source research report](docs/research/public-game-designs.md).

The collection includes 80 FluffyStuff Mahjong SVGs under the upstream CC0 dedication, 66 hayeah playing-card SVGs with the upstream MIT notice and public-domain artwork provenance, and two SabakiHQ/Shudan SVG stones under MIT. The original attribution documents accompany every set. Mixed-license sound, font, piece-art, ROM and provider-mark exclusions are listed in the collection README. Source/asset snapshots are excluded from the built package and are never executed by the catalogue; only Pachisi-authored descriptive metadata is used there.

Connect Four web designs 2 and 3 adapt first-party Home v1/v2 and Arena App visual motifs. Designs 4 and 5 are independently drawn CSS studies of PGX’s channel diagram and PettingZoo’s red/black seat colours. Their original sources and license notices remain in the public reference collection. Six first-party native reference images are reproduced verbatim for catalogue comparison from Platform mobile revision `8dd06c12`. The `connectFourDesignCollection` entry in SOURCE_MANIFEST.json records the source and hash of each capture. The native captures are catalogue-only.

The Porcelain web edition uses two original MIT-licensed stone SVGs by SabakiHQ/Shudan at `bf2be30c568338c77294a782742036c1b3167c72`. Verbatim copies and the original license are packaged together under `assets/go-stones-shudan/`. The wood, print, felt and instrument materials are Pachisi-authored. Native active-turn previews under `catalogue/public/design-census/` are byte-identical copies of first-party mobile Skia goldens from `8dd06c12`. SOURCE_MANIFEST.json identifies each source, digest and destination.

The additional public GitHub source selections under `reference/github-visual-sweep/` retain their own original license texts, notices and repository/commit provenance. The root license does not relicense them. See the [snapshot manifest](reference/github-visual-sweep/MANIFEST.json) and [per-game findings](docs/research/github-visual-sweep/README.md). Reviewed third-party screenshots are linked to their original repositories.

### Licence families in the reference collections

These counts are the root licence declared for each source in `SOURCES.json`; every source directory also keeps its upstream licence texts.

- `reference/github-visual-sweep/` (77 sources): MIT 60, Apache-2.0 6, GPL-3.0 6, BSD-3-Clause 3, GPL-2.0 1, CC0-1.0 1. `junosan--nama` is declared Apache-2.0, and its upstream `NOTICE` also carries LGPL-2.1 text (for Qt) and a BSD notice (for the Mersenne Twister).
- `reference/public-games/` (38 sources, the November public-games collection): MIT 21, Apache-2.0 7, GPL-3.0-or-later 3, AGPL-3.0 2, CC0-1.0 2, GPL-3.0 1, BSD-3-Clause 1, BSD-2-Clause 1.

The copyleft sources are:

- Sweep, GPL-2.0: `futaalice--futahex2`.
- Sweep, GPL-3.0: `abdullahjamal1--battleshipboardgame`, `farindk--morris`, `juef17--librebridge`, `juzzlin--dustracing2d`, `popojan--goban`, `san-santra--pyboxing`.
- Sweep, mixed notice: `junosan--nama` (LGPL-2.1 and BSD notices under an Apache-2.0 root).
- Public games, AGPL-3.0: `calcitem--sanmill`, `playhex--playhex`.
- Public games, GPL-3.0-or-later: `lichess-org--chessground`, `wandererxii--shogiground`, `gbtami--chessgroundx`.
- Public games, GPL-3.0: `hanabi-live--hanabi-live`.

These files retain their upstream licence documents and original bytes, except for the explicitly recorded Spades README credential redaction. They are not built, not imported by `src/` or `catalogue/`, and not in the package tarball. Repository decision (6 November 2026): retain these separately attributed research snapshots, including copyleft references, for source inspection and reproducibility. They are not converted to MIT contributions or linked into the supported package. A proposed implementation port must be reviewed separately against its source licence; keeping a reference is not approval to ship it in a product.
