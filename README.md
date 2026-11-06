# Pachisi

Pachisi is the eSlams game design library for React. Compare **170 game/design pairs across 50 games**, inspect the same position at different sizes, and use the selected design in a consuming app. The library includes Stadium components, game boards, spectator replays and a separate archive of public design references.

## Run the catalogue

Use Node 22.13 or newer and the pnpm version pinned in the package.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm dev
```

Open the URL printed by Vite. Under **Game visuals**, choose a game and open **See all variants**. Select a design and a placement, then copy its ID or deep link. For example, append `/?game=pentago&design=design-4&presentation=arena#game-variants` to see the Porcelain board. In the replay, open **Inspect public position** for the current board, table or control state.

| What you want | Where to find it |
|---|---|
| Compare shipped designs and placements | Open `#game-variants`. Connect Four has 20 looks. Go, Gomoku and Pentago each have four. The other 46 games have three each. Many share material treatments. |
| Play or inspect game behaviour | Connect Four has a local two-player round. All 50 games have recorded replays with step, seek and speed controls. The host supplies rules and input for live matches. |
| Render authoritative live board cells | Use `/contract` → `/game/board-adapter` → `/game/board`. Eight games support a basic live cell frame, including Checkers men and kings. Consult the [game-by-game coverage](docs/games.md) for partial and demonstration-only families. |
| Study another implementation | Use `#game-census` for local and historical sources or `#github-sweep` for external designs. The [GitHub findings](docs/research/github-visual-sweep/README.md) distinguish licensed snapshots, link-only references and candidates for future ports. |

## Use a design in React

Build and pack the library locally. This version is distributed as a private package archive.

```sh
pnpm build
mkdir -p artifacts
pnpm pack --out ./artifacts/pachisi-0.2.0.tgz
# In your React project, install the resulting archive:
pnpm add /path/to/pachisi/artifacts/pachisi-0.2.0.tgz
```

```tsx
import '@electronicslams/pachisi/styles.css';
import { GameAnimation, GameReplay } from '@electronicslams/pachisi/game/demo';
import { resolveGameVariant } from '@electronicslams/pachisi/game/designs';

const choice = resolveGameVariant('pentago', 'design-4', 'arena');

// The arena preview uses both the design and the resolved placement.
export function PentagoPreview() {
  if (!choice.ok) return <p>Design unavailable</p>;
  return <GameAnimation game="pentago" gameName="Pentago" design={choice.design.id} presentation={choice.presentation} />;
}

// GameReplay takes a design but has no placement prop.
export function PentagoReplay() {
  if (!choice.ok) return <p>Design unavailable</p>;
  return <GameReplay game="pentago" gameName="Pentago" design={choice.design.id} />;
}
```

Use `GameAnimation` for a compact or arena preview, `GameReplay` to inspect a public recording, and `Board` for a validated host cell frame. Check the adapter’s `issues` before rendering. Supply already-redacted spectator frames to custom replays. The bundled sealed games publish commitment events and reveal both decisions together. Synthetic action inputs used to validate the traces live separately under `scripts/fixtures/`.

The package identifier is `@electronicslams/pachisi`; version 0.2.0 is private, so there is no registry release. The root entry is server-safe and does not import the demo dataset. The other entry points are:

- `/client` for interactive components, `/next` for a Button adapter that keeps `next/link` navigation, and `/event` for the Grand Slams stage.
- `/contract` for the server-safe live render contract (`DisplayFrameV1`, `BoardScene`, `ActionTarget`, accessibility nodes, privacy checks), ported from Platform.
- `/game/board-adapter` for `boardFrameFromCells` and the non-throwing `boardFrameFromDisplayFrame` projection, and `/game/board` and `/game/board-types` for the renderer.
- `/game/designs` for the general design registry (`gameDesigns`, `gamePresentations`, `resolveGameVariant`), and `/game/connect-four-designs` for the 20 Connect Four looks and their layouts.
- `/game/demo`, `/game/demos`, `/game/catalogue`, `/game/scene`, `/game/cues` and `/game/motion` for replays, bundled traces, per-game animation metadata and scene rendering. `/game/icons`, `/game/ui-icons` and `/game/icon-catalogue` cover identities.
- `/game/interactions` for legal-action labels, cell targets and control slots. It labels actions the host supplies; it never decides legality.
- `/theme` for the stored light, dark or system preference, `/theme-tokens` for the typed theme contract, and `/dates` for date formatting.
- `styles.css`, `tokens.css`, `fonts.css`, `chrome.css`, `event.css` and `assets/*` for styles and brand assets. Import `styles.css` once at the application boundary.

See [consumer setup](docs/consumption.md) for peers and migration.

## Verify locally

```sh
pnpm exec playwright install chromium
pnpm ci:local
```

The gate checks types, unit regressions, design-source integrity, the catalogue build, and installations of the packed library in ESM, TypeScript and Next consumers. Browser tests cover phone and desktop, light and dark, keyboard and touch controls, settled stills, and distinct rendered designs. The physics suite checks **690 transitions across 740 frames** against the pinned Core rules. The known Taxi terminal-state defect and Bridge dummy-hand limitation are recorded in [physics validation](docs/physics.md).

## Physics and real-gameplay readiness

`scripts/validate-demonstrations.py` (`pnpm check:physics`) is a standard-library validator that does not import Core. It replays every bundled transition at the pinned Core commit `7731e2f`. Today 39 games pass, 9 pass with a rule-variant note, 1 passes with a renderer note (Bridge has no public dummy) and 1 carries the known Core Taxi defect. Rules are simulated exactly for the main board games and the CartPole and MountainCar equations. Other games get conservation and arithmetic invariants only. Nine games are legal only under Core's simplified variants, such as 2-player Hearts, Spades and Euchre; a spectator who knows the standard game may read these as illegal. [Physics validation](docs/physics.md) lists the method, per-game results and limits.

Through `boardFrameFromDisplayFrame` and `Board`, the simple cell families can carry authoritative host frames today. Card tables, poker seats, trick-taking layouts and several board families remain demonstration-only. Real matches also need what Pachisi does not own: legal actions, session clocks, hidden-information projection and interaction in the host. See [live-state contracts](docs/contracts.md) and [game coverage](docs/games.md).

The Platform has not been switched to Pachisi and no live deployment occurred. Its current `@eslams/game-visuals` snapshot keeps working until an independently reviewed consumer migration.

## Repository layout

| Path | Status | What it is |
|---|---|---|
| `src/`, `styles/`, `assets/` | Live | The supported package: components, game visuals, design registry, contract, adapter, interactions, theme tokens and CSS. Built, typed, tested and exported. |
| `catalogue/` | Live | The review catalogue and its census, sweep and source metadata. Not part of the package. |
| `design-archive/` | Historical | De-duplicated eSlams design prototypes, briefs and assets from June to October 2026. Never built or imported. Where it disagrees with `src/` and `styles/`, those win. Start at [`ARCHIVE_INDEX.md`](design-archive/ARCHIVE_INDEX.md). |
| `reference/platform/` | Verbatim, un-built | Platform presentation source copied unchanged from `0fa7dfe`, plus the native renderer, theme tokens and mobile arena set recovered from `8dd06c12`. A source to port from, never to import. See [`reference/platform/README.md`](reference/platform/README.md). |
| `reference/github-visual-sweep/`, `reference/public-games/` | Verbatim, un-built | Third-party design snapshots under their original licences, pinned by commit and hash. Not imported by `src/` or `catalogue/` and not in the package tarball. See [`NOTICE.md`](NOTICE.md). |
| `scripts/` | Live | Build, public-payload, browser and consumer checks, the demonstration generator, the physics validator and its self-test, and the design-source import and verification tools. |
| `docs/` | Live | Guides, per-game coverage, decisions, contracts, research ledgers, reviews and validation records. |

## Documentation

- [Component API and stable design selection](docs/components.md) · [Consumer setup](docs/consumption.md)
- [Game coverage and variant boundaries](docs/games.md) · [Live-frame and privacy contracts](docs/contracts.md)
- [Palette and design decisions](docs/design-decisions.md) · [Component and archive inventory](docs/inventory.md)
- [Local validation evidence](docs/validation.md) · [Adversarial review and fixes](docs/reviews/2026-11-05-adversarial-design-review.md)
- [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Source and licensing notices](NOTICE.md)

Pachisi code is MIT licensed. The mark, font and archived third-party material have their own notices.
