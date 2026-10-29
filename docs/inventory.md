# Pachisi inventory and ownership

Pachisi collects the already-cleaned eSlams UI and Stadium presentation layer. This inventory separates reusable presentation from product wiring so maintainers can extend the package without importing the application into it.

Baseline: Platform [`0fa7dfe227fe545036694c915a6b727eb4ee844a`](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a). [`SOURCE_MANIFEST.json`](../SOURCE_MANIFEST.json) records file-level origins and original SHA-256 hashes. An adapted file is not claimed to remain byte-identical; approved PNG/font assets retain their original bytes and notices.

## Package layers

| Layer | Local source | Purpose and dependency boundary |
| --- | --- | --- |
| Foundations | `styles/tokens.css`, `styles/fonts.css`, `src/theme.ts` | Existing color/type/geometry/motion/layout tokens, optional mono font, theme preference helpers. No product data. |
| General UI | `src/ui/` | Controls, fields, feedback, identity fallback and layout primitives. React/DOM presentation and explicit callbacks. |
| Stadium composites | `src/stadium/` | Match/game/model/date/status composition. Typed props instead of catalogue/database/session resolution. |
| Game presentation | `src/game/` | Existing game icons, public synthetic traces, pure boards/scenes and visibility-aware demonstration scheduler. |
| Pure helpers/contracts | `src/lib/` | Date/variant formatting, model presentation contracts and avatar image state machine. Product catalogue lookups stay outside the package. |
| Event composition | `src/stadium/grand-slams-stage.tsx`, `styles/grand-slams.css` | Existing four-board/starfield stage behind opt-in `./event` / `./event.css`. Receives links and children; no calendar, notification or application wiring. |
| Live render contract | `src/contract/` (`./contract`) | Server-safe `DisplayFrameV1`, `BoardScene`, `ActionTarget`, accessibility nodes, versions and public-replay privacy checks, ported from Platform `0fa7dfe`. No React, DOM, network or catalogue import; not re-exported from the root. See [contracts](contracts.md). |
| Board adapter and interactions | `src/game/board-adapter.ts`, `src/game/interactions.ts` (`./game/board-adapter`, `./game/interactions`) | `boardFrameFromDisplayFrame` projects a `DisplayFrameV1` to a `BoardFrame` (or a placeholder plus issues) and never throws; `boardFrameFromCells`, `normalizeCellToken` and friends. Interactions label host-supplied legal actions and targets; legality stays in Core and the host. |
| Theme tokens | `src/theme-tokens/` (`./theme-tokens`) | Typed theme contract and Classic Light/Dark plus four archived-mobile palettes as reference data, from Platform `8dd06c12` (package later removed upstream). No preference persistence. The CSS in `styles/tokens.css` stays canonical for the web. |
| Host adapter | `src/next.tsx` | Optional Next-specific link behavior. The core package uses browser anchors. |
| House styles | `styles/index.css`, `components.css`, Stadium sheets and `portable.css` | Opt-in inherited component/reset styles. This is a deliberate site design system, not automatically subtree-scoped CSS. |
| Optional public chrome styles | `styles/stadium-chrome.css` | Existing header/nav/dock/footer/scaffolding rules. CSS availability does not imply packaged authentication/search/account controllers. |
| Brand and font | `assets/` | Approved eSlams mark, light/dark wordmarks; JetBrains Mono and SIL OFL text. Provider/user identities are host assets. |
| Design archive | `design-archive/` | Historical, non-canonical eSlams prototypes, briefs and assets, June to October 2026. Never built, tested or imported; `src/` and `styles/` win on any disagreement. Index and stale-fact warnings in `design-archive/ARCHIVE_INDEX.md`. Contains no standalone provider marks; two prototype files embed some as data URIs pending a founder/legal decision (see [NOTICE](../NOTICE.md)). |
| Platform reference | `reference/platform/` | Verbatim un-built Platform presentation source (replay boards, card table, Battlefield client, Pixi arcade stage, native Skia renderer, mobile arena set). Not compiled or exported and will not typecheck here. Port from it into `src/` with a manifest entry; never import from it. `MANIFEST.json` records sha256 per file. |
| Catalogue | `catalogue/` | Synthetic, explicitly labeled component/state and game examples. No live matches, real accounts or backend requests. |
| Documentation and validation | `docs/`, `tests/`, `scripts/` | Contracts, recipes, provenance, build/package/browser checks and maintainability. |

Import `@electronicslams/pachisi/styles.css` once for house styling. It includes the established global base/reset rules through tokens.css. Consumers that already apply those rules should review import order and use the smaller exports deliberately; importing two independent copies can alter cascade order. `fonts.css`, `chrome.css` and `event.css` are separate opt-ins. Asset URLs are package-relative rather than tied to Platform's public directory.

The GitHub identity is **ElectronicSlams/pachisi**. The JavaScript package uses the lowercase scope **`@electronicslams/pachisi`** for package-manager compatibility; this is a local/Git-source package interface, not a registry-publication claim.

## General UI

| Component | Current interface/variants | Notes |
| --- | --- | --- |
| `Button` | Native button props or `href`; `primary`, `secondary`, `ghost`, `soft`; `sm`, `md`, `lg`; optional left/right icon | Plain anchors in the portable entry. The optional Next adapter owns framework routing/prefetch. |
| `Icon` | Typed icon name, size and established outline geometry | Shared UI vector set inherited from the game-visuals extraction; do not redraw a second set. |
| `Tag` | `plain`, `accent`, `win`, `loss`, `draw` | Tone is semantic; host supplies factual copy. |
| `Callout` | `info`, `success`, `warning`, `danger`; title/body/icon; status or alert | Preserve helper/error semantics and readable contrast. |
| `Field` | Native input props, label, helper text, error, trailing control, forwarded ref | Host-owned validation; IDs/descriptions remain associated. |
| `PasswordField` | Field contract plus visibility affordance | Presentation only; no password rules or auth requests. |
| `CopyField` | Label/value, multiline/sensitive display, copied/error feedback | A sensitive mask is not permission control. Hosts decide whether a value may reach the client. |
| `Dialog` | Controlled `open`, close callback, title/description/body/footer and dismissal policy | Native modal semantics, nested event isolation and focus return. |
| `useControlledModalDialog` | Controlled state and close callback; returns native dialog ref | Shared low-level hook for custom modal composition; includes explicit keyboard focus containment. |
| `Tabs` | Typed values, selected value, callback, disabled items, labels and panel controls | Host supplies matching tab panels and valid controlled state. |
| `SettingRow` | Label/value/description/action, optional strong separator | The existing compact settings presentation; account mutations stay outside. |
| `RoleBadge` | Role name and fallback | Displays a supplied role. It never grants or verifies privileges. |
| `Avatar` | Image/identity/fallback, size, decorative semantics, priority | Existing decode/retry/initials behavior. Its state machine rejects stale image events. |
| `PageContent` | Children | Content-only boundary; deliberately no public shell/session provider. |
| `SectionHead` | Eyebrow/title/subtitle/action | Existing `sechead` anatomy extracted from the former shared Platform UI module. |
| `Card` | HTML div props and optional hover treatment | Wraps the existing `.card` recipe; no product state. |

Server-safe primitives are available from the root. Interactive controls are available from `./client`, retaining their own `use client` boundaries. Per-game data and animation are explicit subpaths, avoiding an automatic full-artwork import when a consumer only needs a button or icon. See package exports and the consumption guide for the precise public interface.

## Stadium composites

| Component | Input contract | What it owns |
| --- | --- | --- |
| `GameGlyph`, `GameGlyphTile` | Game slug, size; icon variation where exposed | Recognizable identity and tile treatment; unknown identity fallback only |
| `GameTile` | Slug/name/variant, optional href/onSelect, active/comingSoon/status | Square icon/name/variant composition and selected/inert presentation |
| `ModelChip` | Plain serializable `ModelIdentity`, name/id/stacked, winner/loser, size | Provider mark/initials and model label styling, no catalogue fetch |
| `Matchup` | Two identities and actual winner/draw | A-vs-B pairing and outcome emphasis |
| `StadiumDate`, `LiveDot` | Date/optional stable `now`; actual live label | Existing date grammar and factual live indicator |
| `StatusStrip` | Optional actual live matchup or last-match instant | Honest freshness/empty-history line |
| `EmptyState`, `ErrorState` | Title/copy/next action, optional game/icon/retry node | Calm empty/error treatment and recovery affordance |
| `Sheet` | Dialog contract plus size | Responsive mobile sheet / desktop modal, built on shared Dialog |
| `Terminal` | Title, typed React content lines, optional copy text | Existing always-dark code panel and clipboard affordance |
| `MatchPoster` | Supplied match identity/status/date/players/result/link and optional note | Existing card composition plus clearly decorative game preview |
| `MatchPreview` | Game slug and display name | Compact demonstration placement sharing the poster motion group |
| `Board` | One typed `BoardFrame`, size and optional accessible label | Pure stateless board/card rendering; does not advance a game |
| `LegalDemonstration` | Game and one allowlisted public synthetic frame | Game-specific SVG/board artwork; no actual match authority |
| `GameAnimation` | Slug/name, size, motion group, presentation and typography roles | Existing public demonstration trace, scaling and scheduler lifecycle |
| `GrandSlamsStage` (`./event`) | Required `gameLinks` for `chess`, `hex`, `connect-four`, `go`; children; optional `titleId` | Existing four-board composition, deterministic star layers, bounded pointer parallax, visibility and reduced-motion behavior. Import `./event.css` explicitly. |

`ProviderMark` is currently an implementation detail of `ModelChip`, not a separate public API. The serializable model contract is reusable; resolving its fields from the application's provider/model catalogue remains host code.

## Game package and assets

The game layer descends from `@eslams/game-visuals` 0.1.0 and independent source commit `35e44a7033ef1240c86c3b815afb05115d897cb2`. Platform integrated that extraction in [PR #436](https://github.com/makriman/eSlamsPlatform/pull/436). Pachisi retains the existing implementation rather than inventing a second per-game renderer.

- Fifty explicit game identities and corresponding synthetic public demonstrations.
- UI vector icons and approved eSlams PNG identity assets.
- Pure board/card frame types and renderer, per-game demonstration scenes, catalogue metadata, demonstration data and motion scheduler.
- `card`, `arena`, `arena-table`, `feature` and `event` demonstration presentations.
- Theme/content tokens and explicit typography roles; no additional live theme picker or font-pack product.
- Generator and pinned artwork provenance. A changed artwork pin requires regeneration and rule/geometry/visual review, separate from a production runner update.

All-50 **demonstration** coverage does not mean all-50 **actual-state viewer** parity. The simple `BoardFrame` renderer covers specific board/card structures; more specialized actual Arena/Pixi viewers remain in Platform. Native/Skia adapters, complete all-family exact-match share exports and renderer/video integration are not claimed by the current package. [Per-game coverage and extension recipes](games.md) distinguish those boundaries.

Approved brand PNGs are project-owned assets retained under the existing source license notice; the mark's design usage remains locked by the eSlams brand rules. JetBrains Mono carries its own SIL Open Font License. Provider marks, avatars, personal reference recordings and screenshots of real accounts are not bundled by default. Add any third-party asset only with its license/attribution and an explicit usage review.

## Patterns that remain application-owned

The package provides pieces for these already-designed surfaces. Their business behavior and complete page composition remain in Platform until deliberately extracted behind a portable interface.

| Pattern | Reuse from Pachisi | Keep in host |
| --- | --- | --- |
| Public shell/header/dock/footer | Tokens, brand assets, UI icons, chrome CSS and controls | Route order/active route, session restoration, account dropdown, auth modal provider, search data, notifications and footer account state |
| Home hero | Existing board rendering and motion grammar | Approved four-game sequence, transport, game switching and destination match metadata |
| Home catalogue | Game icons/tiles, grid rules | Canonical catalogue eligibility, category filter state and destinations |
| Arena setup/lifecycle/result | Board/table demos, tiles, model identity, controls, sheets and feedback | Existing seats, roster, launch/replacement/privacy/timeout controllers, legal actions and authoritative input overlays |
| Battlefield Stage/programme/request | Matchup, poster, dates, states, controls and sheets | Data loaders, programme grouping, request admission/auth, actual replay transport, reasoning selection and subscription lifecycle |
| Records and model/provider discovery | Model/game identity, dates, tables/cards, helper states | SQL, sample eligibility, privacy, results aggregation, follow state and challenge availability |
| Profile/settings | Avatar, setting rows, fields, tabs, sheets and feedback | User data, route/hash state, account/security/privacy mutations, API keys and deletion fences |
| Match/turn share | Shared scene geometry, tokens and dialog primitives | Actual-state projection, owner/public authorization, frozen selected turn, PNG generation and native share destinations |
| Grand Slams space composition | `GrandSlamsStage`, event styles, existing game visuals, tokens, typography and controls | Injected content/destinations, event calendar, notification/application doors; no invented entrants/results |
| Trinity | Tokens, general UI, identity, states and compact rows | Private shell, role gates, resource actions, permissions, email masking and admin queries |
| Actual video/container rendering | Applicable assets/contracts after parity review | Existing Stream/FFmpeg pipelines, execution environment and export privacy |

The extracted Grand Slams stage retains the working four-board/starfield composition. Its former CSS-module classes are namespaced as `.pachisi-gs-*` in the optional stylesheet. Its approved black/white theme, offscreen/reduced-motion policy, dock clearance and calm centered content are documented in the design decisions. Hosts supply every game destination and central content, with optional title association; the package does not hardcode Platform routes or copy event/calendar/network behavior. Do not replace this approved composition with generic new hero art during adoption.

## Maintenance ownership

| Change | Pachisi owner | Platform/consumer owner |
| --- | --- | --- |
| Existing token or primitive | Implementation, typed API, visual states, docs, tests and changelog | Review cascade/import effects and page regressions |
| New component variant | Add to existing canonical component when semantics match | Confirm actual product need; avoid page-specific forks |
| New game identity/demo | Icon registry, public-data scene, correct geometry, artwork provenance and coverage docs | Confirm shipped game/variant and suitable surface placement |
| Actual game adaptation | Pure permitted-state presentation contract where implemented | Legal actions, state projection, permissions, time progression and input handling |
| Theme/font asset | Token roles, license, contrast/layout and fallback testing | Theme preference product and user choices |
| Package release | Version/changelog, source/provenance, reproducible build and package contents | Pin/update dependency, validate consumer build and review adoption |
| Public documentation/catalogue | Synthetic fixtures and reviewable state coverage | No real user data or operational evidence in examples |

## Extraction review boundaries

- No product database schema, credentials, auth configuration, API clients, user data or hidden suites belong in the package.
- Remove `@/` aliases and catalogue/service lookups from portable modules. A plain `ModelIdentity` type is sufficient for chip rendering; importing the complete model registry would violate the boundary and inflate bundles.
- Preserve `use client` where DOM state/effects are needed; keep the root and pure scene entry points server-compatible. Do not add one blanket client boundary around every export.
- Give repeated interactive component instances independent IDs. Verify nested dialogs, disabled tabs, copy failure and stale avatar events in a real browser where appropriate.
- Do not claim that copying a stylesheet supplies its corresponding controller. Optional chrome styles do not transplant Platform's auth/search/account shell.
- Build and test the distributable, not only source aliases. Verify imports/types/styles/assets from an installed tarball or explicit local package consumer before adopting in Platform.
- Keep publication disabled until explicitly requested. Public GitHub source, a local package archive and an npm release are different actions.

See [design decisions](design-decisions.md) for the complete source/override map and state acceptance matrix; [game adaptation](games.md) for the per-game implementation and extension contract.
