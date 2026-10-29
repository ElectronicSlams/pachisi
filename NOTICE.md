# Attribution and public payload

Pachisi extracts selected presentation code from eSlams Platform at `0fa7dfe227fe545036694c915a6b727eb4ee844a` (19 October 2026). `SOURCE_MANIFEST.json` records the source path and SHA-256 of every imported file. Extracted MIT code retains Electronic Slams' copyright and MIT licence.

Game visuals originate in `@eslams/game-visuals` 0.1.0, independent source commit `35e44a7033ef1240c86c3b815afb05115d897cb2`, via the reviewed Platform snapshot. The library contains public synthetic demonstration traces, not customer or real-match records. Their artwork Core pin is retained in `src/game/game-demonstrations-source.json`; it is separate from the production runner pin.

The eSlams mark and wordmarks remain Electronic Slams' brand identity. Including source assets does not grant a trademark licence, imply endorsement or authorize changing the marks. No third-party provider logos, customer avatars or screenshots from production accounts are bundled. Consumers supply provider marks where they have the appropriate rights.

JetBrains Mono is distributed under the SIL Open Font License in `assets/fonts/OFL.txt`. Its original filename and bytes are preserved. System sans fonts are referenced but not redistributed.

Public payload review excludes credentials, environment files, operational release evidence, private reference recordings, database exports, hidden evaluation suites, account data and production captures. Documentation links to selected source files rather than republishing private operational documents. `pnpm check:public` repeats the automated payload and app-dependency checks; a human source/asset review remains part of every public change.
