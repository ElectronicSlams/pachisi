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
import { GameReplay } from '@electronicslams/pachisi/game/demo';
import { resolveGameVariant } from '@electronicslams/pachisi/game/designs';

const choice = resolveGameVariant('pentago', 'design-4', 'arena');
export function PentagoReplay() {
  if (!choice.ok) return <p>Design unavailable</p>;
  return <GameReplay game="pentago" gameName="Pentago" design={choice.design.id} />;
}
```

Use `GameAnimation` for a compact or arena preview, `GameReplay` to inspect a public recording, and `Board` for a validated host cell frame. Check the adapter’s `issues` before rendering. Supply already-redacted spectator frames to custom replays. The bundled sealed games publish commitment events and reveal both decisions together. Synthetic action inputs used to validate the traces live separately under `scripts/fixtures/`.

## Verify locally

```sh
pnpm exec playwright install chromium
pnpm ci:local
```

The gate checks types, unit regressions, design-source integrity, the catalogue build, and installations of the packed library in ESM, TypeScript and Next consumers. Browser tests cover phone and desktop, light and dark, keyboard and touch controls, settled stills, and distinct rendered designs. The physics suite checks **690 transitions across 740 frames** against the pinned Core rules. The known Taxi terminal-state defect and Bridge dummy-hand limitation are recorded in [physics validation](docs/physics.md).

## Documentation

- [Component API and stable design selection](docs/components.md) · [Consumer setup](docs/consumption.md)
- [Game coverage and variant boundaries](docs/games.md) · [Live-frame and privacy contracts](docs/contracts.md)
- [Palette and design decisions](docs/design-decisions.md) · [Component and archive inventory](docs/inventory.md)
- [Local validation evidence](docs/validation.md) · [Adversarial review and fixes](docs/reviews/2026-11-05-adversarial-design-review.md)
- [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md) · [Source and licensing notices](NOTICE.md)

Pachisi code is MIT licensed. The mark, font and archived third-party material have their own notices.
