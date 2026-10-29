# Pachisi

The eSlams design system: existing Stadium foundations, reusable React components, game visuals and design guidance, maintained in **[ElectronicSlams/pachisi](https://github.com/ElectronicSlams/pachisi)**.

This is an extraction of the existing design, not a new visual direction. The mark, tokens, typography, geometry, motion and light/dark themes are preserved. Routing, authentication, networking, permissions, game rules and product state remain in the consuming application.

## Start here

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm dev
```

The interactive catalogue runs at the localhost URL printed by Vite. It covers foundations, UI states, controlled dialogs/sheets, Stadium patterns, all 50 game icons/demonstrations and the Grand Slams composition. `pnpm test:browser` checks desktop/phone, light/dark, keyboard/focus, reduced motion and all 50 gallery scenes. Install Chromium with `pnpm exec playwright install chromium` first when needed.

## Use the package locally

The package identifier is **`@electronicslams/pachisi`**, lowercased to conform to package-name rules. `ElectronicSlams/pachisi` remains the GitHub identity. Version 0.1.0 is private to prevent accidental registry publication; there is no npm release or publish workflow.

```sh
pnpm build
pnpm pack --out ./artifacts/pachisi-0.1.0.tgz
# In a consumer, using the actual path to the generated archive:
pnpm add /path/to/pachisi/artifacts/pachisi-0.1.0.tgz
```

```tsx
import '@electronicslams/pachisi/styles.css';
import { Button, GameTile, ModelChip } from '@electronicslams/pachisi';
import { Field, Sheet } from '@electronicslams/pachisi/client';
import { GameAnimation } from '@electronicslams/pachisi/game/demo';

<Button variant="primary" icon="gamepad">Play</Button>
<GameAnimation game="chess" gameName="Chess" presentation="arena" />
```

The root entry contains server-safe presentational components and does not import the demo dataset. Interactive components and animation data have explicit entry points. React 19.2+ is a peer. Next is optional: `@electronicslams/pachisi/next` supplies a Button adapter retaining `next/link` navigation; core components default to native anchors. See [consumption and migration](docs/consumption.md).

`styles.css` is opt-in and includes the house global reset. `tokens.css` also includes the established global base rules. Import once at the application boundary. `fonts.css`, `chrome.css` and `event.css` are optional. Do not stack a second token implementation beside existing Platform styles during migration.

## Included

- Canonical tokens, light/dark/system themes, self-hosted mono font and approved brand assets.
- Buttons, fields, password/copy fields, tags, role badges, callouts, tabs, dialogs, sheets, avatars, cards, section headings and terminal.
- Model identity/matchup, game tiles, dates, live/status treatment, match posters and empty/error states.
- All 50 game identities and public synthetic demonstration traces, multiple composition presets, shared motion scheduling, stateless simple-board rendering and decorative scenes.
- Existing Grand Slams star/floating-board stage, with host-supplied content and links.

**Coverage is explicit.** All 50 games have icons and demonstrations. General actual-match rendering, native/Skia adapters, all-family snapshots and input overlays are not complete for all 50 games. `LegalDemonstration` is decorative and must not be passed arbitrary private or actual match state. Read [per-game coverage and adaptation](docs/games.md) before integrating a game.

## Documentation

- [Component inventory and ownership](docs/inventory.md)
- [Design decisions and source hierarchy](docs/design-decisions.md)
- [Component API and states](docs/components.md)
- [Each game's rendering/adaptation guide](docs/games.md) · [machine-readable coverage](docs/game-coverage.json)
- [Package consumption and Platform migration](docs/consumption.md)
- [Maintenance and release policy](CONTRIBUTING.md)
- [Attribution, brand/font rights and public payload](NOTICE.md)

The Platform has not been switched to Pachisi and no live deployment occurred. Its current `@eslams/game-visuals` snapshot keeps working until an independently reviewed consumer migration.

## Validation

See [validation record](docs/validation.md) for completed checks and limitations. CI runs local package/catalogue checks and browser tests; it has no registry publication, GitHub Pages or application deployment step.

MIT code © 2026 Electronic Slams. Brand and font notices apply separately.
