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

### Embedded provider logos: open decision

`design-archive/arena-app/prototype/src/assets.js` and `design-archive/arena-app/eSlams Arena App.html` embed third-party provider logos as `data:` URIs inside a historical prototype. They cannot be separated from those files by simple exclusion. Their redistribution basis has not been established, and a founder or legal decision is pending (keep, strip, or drop those two files). Until that decision is recorded, treat the archive as not cleared for public release. Standalone provider-mark folders (the 61-SVG provider marks pack, the Stadium prototype provider marks and the Arena pack's provider logo folders) were deliberately excluded from the repository.

The rule for the supported package is unchanged: nothing in `src/` bundles provider marks. Consumers supply provider marks where they have the appropriate rights. Nothing in the archive grants a trademark licence.

JetBrains Mono is distributed under the SIL Open Font License in `assets/fonts/OFL.txt`. Its original filename and bytes are preserved. System sans fonts are referenced but not redistributed.

Public payload review excludes credentials, environment files, operational release evidence, private reference recordings, database exports, hidden evaluation suites, account data and production captures. Documentation links to selected source files rather than republishing private operational documents. `pnpm check:public` repeats the automated payload and app-dependency checks; a human source/asset review remains part of every public change.
