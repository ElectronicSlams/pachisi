# eSlams Game Visuals

Independent presentation package, version 0.1.0. No Platform aliases, backend calls, credentials or session logic. The Platform imports a pinned source snapshot via pnpm workspace dependencies; this package also has its own local Git repository at `~/eSlams/eSlams Game Visuals`.

## Available

- `@eslams/game-visuals/icons`: 50 distinct vector game identities; outline/emphasis treatments. Category fallback only for unknown identities.
- `/ui-icons`: the existing shared UI icon set, with outline/emphasis weights and unchanged default geometry.
- `/brand/mark.png`, `/brand/logo-light.png`, `/brand/logo-dark.png`: the approved existing identity assets, preserved byte-for-byte; the host chooses theme and placement.
- `/demo`: `GameAnimation` with card/arena/arena-table/feature/event presentations, size, typography roles and shared motion groups.
- `/scene`: stateless `LegalDemonstration`, supplied an explicit synthetic public frame.
- `/board`, `/board-types`: pure board rendering already shared by the home hero and selected simple-board replays. It consumes supplied state; it does not advance a match.
- `/demos`, `/catalogue`, `/motion`: validated synthetic frames, registry and visibility-aware scheduling.
- `/styles.css`: token-based geometry, presentation and motion; import once. Hosts supply Stadium CSS tokens and light/dark theme selection. Typography roles can be supplied without changing the UI's font-setting product.

The original entire Arena preview source and CSS are preserved in the independent repository's `reference/arena/` for design history. Those known-invalid sequences are not shipped. Arena retains its layout/seats and consumes the corrected Arena presentation.

## Reproduction

`scripts/generate-demonstrations.py --core-root /clean/core/checkout --check`, using that Core checkout's Python environment. The artwork commit is pinned in `src/game-demonstrations-source.json`, separately from production runner pins. No match fetches or hidden-suite inputs.

The package owns one public demonstration trace per game. Presentation variants change composition, not rules. Additional alternate legal sequences can be added after Core validation. No native/Skia or all-family real-match snapshot API is falsely exported: those are subsequent adapters requiring typed public/owner projections and platform parity checks. Existing match shares remain actual snapshots, not demo artwork.

## Maintenance

Develop in the independent local Git repository, commit and run its tests/typecheck, then run Platform `node scripts/sync-game-visuals.mjs --source '/path/to/eSlams Game Visuals'`. Review the package snapshot, generated data and consumer tests together. `--check` validates the committed snapshot without the original repository or a network connection. Never edit a snapshot silently; sync a new upstream commit. Package version and source SHA record each release. Remote repository/npm publication is not part of this local review.
