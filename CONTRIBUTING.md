# Maintaining Pachisi

Change the existing system deliberately. Start with the current design decisions and inventory, reproduce the relevant component in the catalogue, then update implementation, docs, coverage and tests together. Never import application catalogues, auth/session hooks, environment bindings or live data into the package.

## Boundaries

Pachisi owns presentation and explicit state/geometry contracts. Platform owns routing destinations, auth, permission and public/owner projection checks, networking, legal actions, session/replay clocks and data freshness. RoleBadge is decoration, not authorization. Dates and live labels reflect supplied facts. Demos are public synthetic artwork and never replace actual match frames or share snapshots.

The initial extraction is pinned in `SOURCE_MANIFEST.json`. Do not silently sync from the old local game-visuals checkout after editing here. Review any upstream change as a diff, retain its source pin and tests, and update the manifest. Platform continues its existing snapshot until a separate migration. This avoids two repositories silently overwriting each other.

## Checks

While hosted CI is unavailable, `pnpm ci:local` is the release gate. It mirrors the workflow job, records `docs/validation/local-ci.json` with the commit, host versions and per-step result, and refreshes the browser and consumer records. Commit that evidence with the change it verifies; a push without a matching `local-ci.json` is unverified.

```sh
pnpm ci:local
# or the individual steps:
pnpm check
pnpm check:physics
pnpm exec playwright install chromium
pnpm test:browser
```

Keep source ESM exports, declaration files and React client boundaries intact. Test multiple component instances, keyboard navigation, failure/empty/disabled states, light/dark/system themes, blocked persistence, reduced motion and narrow viewports. Tests should verify consumer behavior and package boundaries rather than only matching source strings.

Update the catalogue for every public component/state. Keep game coverage metadata synchronized with actual variants and artwork Core pins. New actual-state renderers require typed inputs, hidden-information projection review, paused/deterministic state checks, coordinate/geometry tests and browser coverage; a passing decorative demo is insufficient.

## Archive and reference folders

`design-archive/` and `reference/platform/` are history, not source.

- Append-only. Add new material; do not rewrite existing files. Never edit an archived or vendored file to make it look right, run or typecheck. If something is wrong, note it in `ARCHIVE_INDEX.md` or the folder README.
- Never import from either folder in `src/`, `catalogue/`, `tests/` or `scripts/`. To use an idea, port it into `src/` with types, tests and a `SOURCE_MANIFEST.json` entry.
- Every new vendored file goes into `reference/platform/MANIFEST.json` (or the archive index, with its hash) with its source, commit and sha256. Record any scrub, such as rewritten paths or replaced addresses.
- Do not add provider marks, logos, customer screenshots or production captures. Check licence and attribution first, and update `NOTICE.md`.
- Where the archive disagrees with `src/` and `styles/`, `src/` and `styles/` win.

## Physics checks

Every change to a demonstration trace, the generator or a game renderer (`Board`, `LegalDemonstration`, the board adapter or the cue derivation) runs `pnpm check:physics` as well as `pnpm check`. A renderer must never guess a side for an unknown token and must never draw an empty token (`""`, whitespace, `null`) as a piece; unknown tokens, a wrong cell count or a missing field produce a placeholder or a stated issue, not a plausible default. When a rule variant differs from the standard game, say so in `docs/games.md` and the coverage `ruleVariantNote` rather than relying on the game name. A passing physics check proves the bundled public traces obey the rules listed in `docs/physics.md`; it does not certify live Platform rules.

## Versioning and delivery

Use SemVer for the package: patch fixes, minor additive APIs, major breaking props/exports/styles/contracts. Record changes in CHANGELOG.md. Keep `private: true` and the publish refusal script until an explicit registry-publication decision. This repository has no publication or deployment workflow. Use a built local tarball or a reviewed pinned vendored snapshot for consumers. Do not rely on `workspace:*` across unrelated repositories.

Changes intended for production consumers need their own review and visual/performance checks. Keep router adapters explicit. Do not change production apps from this repository or run migrations/deployments as part of a library release.

## Public review

Run `pnpm check:public` and inspect `git diff --cached` before every public push. Include only reusable source, synthetic fixtures, docs/tests and appropriately licensed assets. Exclude credentials, customer data, private screenshots, logs, operator evidence, hidden suites and production database material. Preserve MIT/OFL notices and brand identity restrictions. No third-party provider marks should be added without a documented redistribution basis.
