# Game design lab — implementation and local verification

**What:** Review all 50 identities and their declared variants, correct presentation physics, and expand the catalogue with replay controls, variant notes and reproducible edge cases. **Presentation remains state driven. Authored scenarios are not engine certification. All verification runs locally.**

**Context:** Pachisi at `c83e260`; `edfdca5` already resolves review F1–F10. No upstream engine or application changes are needed for this series. Read with `CONTRIBUTING.md`, `docs/games.md`, `docs/physics.md`, and `docs/game-coverage.json`; this plan controls this change series, not the public contract.

## Decisions

| Area | Decision |
|---|---|
| Evidence | Keep the 722 pinned frames and 672 actions unchanged; record authored edge cases separately. (Historical for this series. The later 6 November work re-recorded Car Racing and Pentago at the same pin, so the bundled set is now 740 frames and 690 transitions.) |
| Catalogue expansion | Add a game lab for all 50 games, category filters, exact-frame playback, searchable variant descriptions, and explicitly labelled geometry/state studies. |
| Gameplay | Improve observable state, contact geometry, seat/hidden-information clarity and action inspection. Legal actions and match simulation remain host owned. |
| Motion | Explicit playback starts paused, steps are deterministic, seeks do not invent intermediate physics, reduced motion disables autoplay. Existing decorative preview scheduling survives. |
| Variants | Show the declared Core variant, deviations and actual adaptation status. Larger boards and alternate seats are presentation studies, not newly supported engines. |
| Design sources | Use primary references for interaction ideas; copy no branding, assets or source. |

## Inventory

- **Remove:** obsolete Blackjack/hockey renderer warnings once covered by regression tests; no files or datasets are removed.
- **Modify:** scene geometry, game styles, catalogue controls, local browser/consumer/physics checks, coverage and validation documentation.
- **Add:** replay transport, authored studies, per-game notes, regression tests and an individual review report.
- **Keep:** all public exports, pinned traces/actions, canonical tokens/fonts, upstream engine files and append-only references.

## Verified baseline facts (2026-11-01, line numbers at c83e260)

- `src/game/demo.tsx:25`: current previews have no user-operated transport.
- `src/game/scene.tsx:327`: grid world scale is width-only; tall valid grids exceed the viewport.
- `src/game/scene.tsx:408`: shooter column seven extends beyond the 320-unit canvas.
- `src/game/scene.tsx:425`: walker foot y uses a different x from its actual foot contact.
- `src/game/scene.tsx:431`: hockey permits shared cells but draws one skater over another.
- `src/game/scene.tsx:453`: card rows silently retain only seven entries.
- `src/game/scene.tsx:98`: external-seat cropping applies even to non-table scenes.
- `docs/game-coverage.json`: 50 per-game contracts, declared variants and adapter limitations already exist; expose them rather than invent another engine registry.
- Baseline `pnpm check` passes; validator still records nine rule deviations, three render limitations and one upstream taxi issue.

## Dependency-ordered work

1. **Record per-game findings and inspiration.** Review each game's trace, contract and renderer; inventory variant differences. Sources: Lichess studies and PyChess variant index (board), BGA replay and PokerStars rules (cards), OpenSpiel game metadata (strategy), Gymnasium state/action/contact documentation (control). Map each to a concrete change, with links in the review.
2. **Fix geometry and state fidelity (needs 1).** Modify `scene.tsx` and game CSS: bounded grids/shooter, terrain contact, road-relative geometry, shared-cell hockey, explicit card overflow/hidden cards, safe table cropping. Add regression tests for the failing boundaries. Keep canonical theme/font bytes and existing exports.
3. **Add controlled replay and scenario catalogue (needs 1–2).** Add reusable transport with keyboard-accessible buttons/range and outcome text, catalogue-only authored studies, category/variant exploration, per-game inspection notes. Keep decorative `GameAnimation` compatible. New source/CSS/tests ship together.
4. **Strengthen checks (needs 2–3).** Exercise each game and every authored scenario locally. Add browser checks for transport, variant selection, mobile/light/dark, reduced motion and geometry; retain existing scheduling and consumer checks. Remove obsolete renderer warnings only when regression coverage proves resolution. Keep unresolved Core differences visible.
5. **Run the complete local release gate (needs 4).** Run `pnpm ci:local`, inspect captures and reports, fix regressions and repeat affected checks. Record changed files, counts, remaining engine gaps and test evidence in the review. No publishing, remote CI or deployment is part of this request.

## Compatibility

- Additive replay API and catalogue modules; existing consumers keep decorative previews and existing frame formats.
- Keep immutable traces, append-only archive/reference folders and public rendering contracts. Optional presentation metadata must fail closed if malformed.
- No migration, live session changes or shared-environment rollout. A package release can consume these locally verified changes later.

## Owner dependencies

No owner input blocks this local series. Full live rule parity, new Core engine variants, and the known taxi public-state defect require upstream Core work beyond this presentation repository; record them explicitly rather than marking them complete.

## Execution record

Steps 1–4 are implemented: 50 individual profiles, 33 authored studies / 47 frames, geometry fixes, replay controls, expanded browser/consumer checks and 38 physics mutation checks. Step 5 passed the complete local gate (92 tests, all browser/consumer/physics checks). Evidence is tracked by `docs/validation/local-ci.json`; the individual results and remaining upstream limits are in `docs/reviews/2026-11-01-game-design-lab.md`.
