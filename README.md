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

The package identifier is **`@electronicslams/pachisi`**, lowercased to conform to package-name rules. `ElectronicSlams/pachisi` remains the GitHub identity. Version 0.2.0 is private to prevent accidental registry publication; there is no npm release or publish workflow.

```sh
pnpm build
pnpm pack --out ./artifacts/pachisi-0.2.0.tgz
# In a consumer, using the actual path to the generated archive:
pnpm add /path/to/pachisi/artifacts/pachisi-0.2.0.tgz
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
- `@electronicslams/pachisi/contract`: the server-safe live render contract (`DisplayFrameV1`, `BoardScene`, `ActionTarget`, accessibility nodes, privacy checks), ported from Platform. See [live-state contracts](docs/contracts.md).
- `@electronicslams/pachisi/game/board-adapter`: `boardFrameFromCells`, `normalizeCellToken` and the non-throwing `boardFrameFromDisplayFrame` projection from a `DisplayFrameV1` to a `BoardFrame`, with explicit issues instead of silent fallbacks.
- `@electronicslams/pachisi/game/interactions`: pure legal-action labels, board from/to/promotion, cell targets and RL control slots. It labels actions the host supplies; it never decides legality.
- `@electronicslams/pachisi/theme-tokens`: the typed theme contract (Classic Light/Dark, plus four archived-mobile palettes as reference data). Preference persistence is not ported.
- `--win-text`, `--loss-text` and `--draw-text` tokens in `styles/tokens.css`, in one delimited additive block.

**Coverage is explicit.** All 50 games have icons and demonstrations. General actual-match rendering, native/Skia adapters, all-family snapshots and input overlays are not complete for all 50 games. `LegalDemonstration` is decorative and must not be passed arbitrary private or actual match state. Read [per-game coverage and adaptation](docs/games.md) before integrating a game.

## Repository layout

| Path | Status | What it is |
|---|---|---|
| `src/`, `styles/`, `assets/` | **Live system** | The supported package: components, game visuals, contract, adapter, interactions, theme tokens, tokens and CSS. Built, typed, tested and exported. |
| `catalogue/` | Live | Synthetic review catalogue. |
| `design-archive/` | Historical variations | De-duplicated eSlams design prototypes, briefs and token experiments from June to October 2026 (web v1 to v4, home v1/v2, mobile v3, identity/Trinity, the Stadium prototype and brief with its asset pack, the Arena-only app prototype). Non-canonical and never built or imported. Where it disagrees with `src/` and `styles/`, those win. Start at [`design-archive/ARCHIVE_INDEX.md`](design-archive/ARCHIVE_INDEX.md), which also lists stale facts (cancelled dates, the retired leaderboard) and what was excluded. |
| `reference/platform/` | Verbatim un-built Platform source | Presentation source copied unchanged from `makriman/eSlamsPlatform` at `0fa7dfe` (replay boards, arena card table, Battlefield client, home animations, share image, games CSS), plus the native Skia renderer, theme tokens and mobile arena set recovered from `8dd06c12`, deleted upstream on 2026-08-16. Not compiled, not exported, will not typecheck here. A source to port from, never to import. See [`reference/platform/README.md`](reference/platform/README.md) and `MANIFEST.json` (sha256 per file). |
| `scripts/` | Live | Build, public-payload check, browser check, consumer check, demonstration generator and the physics validator. |
| `docs/` | Live | Guides, per-game coverage, decisions, contracts, validation records. |

## Physics and real-gameplay readiness

The 50 bundled traces have been checked for physical soundness. An independent standard-library validator (`scripts/validate-demonstrations.py`, which does not import Core) replayed all 672 transitions across the 722 frames. 49 of 50 games pass. Rules were simulated exactly for tic-tac-toe, Connect Four, Go, Gomoku, Hex, Othello, Pentago, Ultimate tic-tac-toe, checkers, mancala, backgammon, chess (including castling rights and king safety), shogi and xiangqi, and the CartPole and MountainCar equations. Other games get conservation and arithmetic invariants only. The one failure is a known Core engine issue: in the taxi trace, frame 10 reports the passenger at the pickup origin after dropoff. Run it with `pnpm check:physics`; it is part of `pnpm check` and CI. Details and limits are in [physics validation](docs/physics.md).

Nine games are legal only under Core's simplified variants, not standard published rules: Hearts, Spades and Euchre (2-player), Hanabi, Gin rummy (7-card deal), Mahjong (108 tiles), Backgammon (5 checkers a side), Leduc Hold'em (4 seats) and Cribbage (no pegging). They are listed under "Rule variants in the bundled traces" in [the game guide](docs/games.md). A spectator who knows the standard game may see these as illegal.

What can carry real state truthfully today: through `boardFrameFromDisplayFrame` and `Board`, the simple cell families (tic-tac-toe, Connect Four, Othello, Gomoku, Hex, square Go and chess placement), provided the host supplies authoritative frames. Last-move and win-line cues are now derived from consecutive frames, and renderers fail closed to a placeholder on unknown tokens or a wrong cell count rather than guessing a side. What cannot yet: card tables and poker (no seat, stack or hole-card semantics), trick-taking compass layouts, checkers, shogi and xiangqi as actual-state boards, backgammon at full 15-checker scale, auctions and payoff matrices with winners, and the control games beyond parametric scenes. `DisplayFrameV1` is not projected to `CardBoardFrame`. Real matches also need what Pachisi does not own: legal actions, session clocks, hidden-information projection and accessibility interaction in the host. See [live-state contracts](docs/contracts.md).

## Documentation

- [Component inventory and ownership](docs/inventory.md)
- [Design decisions and source hierarchy](docs/design-decisions.md)
- [Component API and states](docs/components.md)
- [Each game's rendering/adaptation guide](docs/games.md) · [machine-readable coverage](docs/game-coverage.json)
- [Live-state contracts: DisplayFrameV1, adapter, interactions, theme tokens](docs/contracts.md)
- [Physics validation of the bundled traces](docs/physics.md)
- [Package consumption and Platform migration](docs/consumption.md)
- [Maintenance and release policy](CONTRIBUTING.md)
- [Attribution, brand/font rights and public payload](NOTICE.md)

The Platform has not been switched to Pachisi and no live deployment occurred. Its current `@eslams/game-visuals` snapshot keeps working until an independently reviewed consumer migration.

## Validation

See [validation record](docs/validation.md) for completed checks and limitations. CI runs local package/catalogue checks (including `pnpm check:physics`) and browser tests; it has no registry publication, GitHub Pages or application deployment step.

MIT code © 2026 Electronic Slams. Brand and font notices apply separately.
