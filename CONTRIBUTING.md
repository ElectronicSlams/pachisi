# Maintaining Pachisi

Change the existing system deliberately. Start with the current design decisions and inventory, reproduce the relevant component in the catalogue, then update implementation, docs, coverage and tests together. Never import application catalogues, auth/session hooks, environment bindings or live data into the package.

## Boundaries

Pachisi owns presentation and explicit state/geometry contracts. Platform owns routing destinations, auth, permission and public/owner projection checks, networking, legal actions, session/replay clocks and data freshness. RoleBadge is decoration, not authorization. Dates and live labels reflect supplied facts. Demos are public synthetic artwork and never replace actual match frames or share snapshots.

The initial extraction is pinned in `SOURCE_MANIFEST.json`. Do not silently sync from the old local game-visuals checkout after editing here. Review any upstream change as a diff, retain its source pin and tests, and update the manifest. Platform continues its existing snapshot until a separate migration. This avoids two repositories silently overwriting each other.

## Checks

```sh
pnpm check
pnpm exec playwright install chromium
pnpm test:browser
```

Keep source ESM exports, declaration files and React client boundaries intact. Test multiple component instances, keyboard navigation, failure/empty/disabled states, light/dark/system themes, blocked persistence, reduced motion and narrow viewports. Tests should verify consumer behavior and package boundaries rather than only matching source strings.

Update the catalogue for every public component/state. Keep game coverage metadata synchronized with actual variants and artwork Core pins. New actual-state renderers require typed inputs, hidden-information projection review, paused/deterministic state checks, coordinate/geometry tests and browser coverage; a passing decorative demo is insufficient.

## Versioning and delivery

Use SemVer for the package: patch fixes, minor additive APIs, major breaking props/exports/styles/contracts. Record changes in CHANGELOG.md. Keep `private: true` and the publish refusal script until an explicit registry-publication decision. This repository has no publication or deployment workflow. Use a built local tarball or a reviewed pinned vendored snapshot for consumers. Do not rely on `workspace:*` across unrelated repositories.

Changes intended for production consumers need their own review and visual/performance checks. Keep router adapters explicit. Do not change production apps from this repository or run migrations/deployments as part of a library release.

## Public review

Run `pnpm check:public` and inspect `git diff --cached` before every public push. Include only reusable source, synthetic fixtures, docs/tests and appropriately licensed assets. Exclude credentials, customer data, private screenshots, logs, operator evidence, hidden suites and production database material. Preserve MIT/OFL notices and brand identity restrictions. No third-party provider marks should be added without a documented redistribution basis.
