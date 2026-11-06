# Pachisi game designs and use-case variants

**Proposed implementation plan, 3 November 2026.** Open any game, see its distinct visual designs, and inspect how each works in a poster, arena or other supported placement. Consumers can select the same design they saw in the catalogue. This plan governs the new library structure. The existing game lab plan continues to describe replay and position studies.

## Decisions for implementation

| Decision | Convention |
|---|---|
| Identity | Store three fields, `game`, `design` and `presentation`. Together they identify a use-case variant. Generate `connect-four-design-2-variant-arena` for copying, search, screenshots and exports. Resolve generated keys by lookup so hyphenated slugs remain unambiguous. |
| Names and numbers | Lead with a short, memorable name drawn from what players see or feel. Display **Connect Four / Gumball / Arena**. Show Design 02 in the details alongside a plain visual description. Keep original upstream names and attribution visible for sourced designs. Assign numbers once per game, keep them through renames, reserve retired numbers and sort independently. Product versions and source revisions belong in metadata. |
| Design boundary | A distinct visual language earns a design record. Look at the pieces, board material, geometry, typography and motion together. A blue molded rack with inset holes and shaded discs qualifies. A smaller placement gets a presentation entry. A light/dark token change gets an appearance. Group multiple screenshots of one design under the same record. |
| Independent controls | Ruleset, sample position, replay frame, viewer perspective, appearance and platform are separate fields. A 7×6 and an 8×9 board can exercise the same design. Each implementation declares the geometries, data modes and perspectives it supports. |
| Availability | Record evidence per design and capability per presentation/platform. **Usable** has a packaged renderer and a passing example. **Preview** has a reviewed still or catalogue-only implementation. **Source only** links to specific evidence. Distinguish an inapplicable combination from one awaiting implementation. |
| Ownership | The host owns game state, rules, legal actions and visibility. Design renderers consume the same projected frames. Keep shared clocks, physics, last-move detection and replay transport outside each design. |
| Provenance | Preserve source paths, immutable revisions, file-level notices, permitted use and derivation. Multiple sources can support a design. A rules engine, shared deck or art pack can support multiple games without gaining a game-screen design number of its own. |

## The Connect Four pilot

| Design or evidence | Current evidence | First delivery |
|---|---|---|
| Design 01 · Blueprint | Current Stadium renderer. Fine outlines and blue-and-white discs give the grid a drafting-board look. | Register the existing supported placements as the baseline. |
| Design 02 · Gumball | The Home v2 prototype pairs a blue rack with glossy red and yellow discs. Its HTML specifies the rack, inset wells, disc gradients, drop treatment and poster dimensions. `design-archive/home-v2/eSlams Home v2.dc.html:209`, `:213`, `:238` | Restore a scoped web implementation. Start with **Card** and **Arena**. Label Arena as a Pachisi adaptation of the historical design. |
| Native themes | Six reference images under `reference/platform/mobile-8dd06c12/packages/board-skia/goldens/offscreen/family-themes/connect_four/` | Show the actual archived previews and their platform. Group palette treatments under their renderer. Assign another design number when the visual inventory establishes a distinct design. |
| PGX and PettingZoo | Two selected Connect Four renderers are mapped in `reference/public-games/SOURCES.json:433` and `:859`. PettingZoo's renderer also expects image files excluded from the selection. | Give each a named source entry. Promote a distinct upstream design to a numbered record when its visual identity is established. Record missing assets explicitly. |

In the pilot, compare Design 01 and Design 02 on the **same seven-move win**. Switching from Card to Arena should enlarge the same position and preserve its winning line. Switching designs should visibly change the rack and discs while preserving the move. A designer can copy the exact selection as `connect-four-design-2-variant-arena`.

## Use cases the library must cover

| Product use | Existing entry or owner | Contract to verify for each design |
|---|---|---|
| Match poster / compact card | `card`, including mini previews in `src/stadium/match-preview.tsx:6` | Pieces and last move read at poster size. Motion obeys visibility and reduced-motion settings. |
| Arena preview | `arena` | Fit the whole board and caption. Declare support for real match frames separately from demonstrations. |
| Arena table centre | `arena-table`, gated in `src/game/scene.tsx:41` | Only eligible card tables expose this placement. The host supplies surrounding seats. Connect Four has no table-centre variant. |
| Featured game | `feature` | Preserve detail and labels at large sizes and on phones. |
| Event composition | `event`, used in `src/stadium/grand-slams-stage.tsx:104` | Static and animated frames use the same selected design inside the event stage. |
| Replay / inspection | `GameReplay` in `src/game/replay.tsx:23` | The player can carry a design selection while stepping through the same frames. Replay is a viewing mode that can use an Arena layout. |
| Tile, live stage, share | Icons, authoritative board adapters and host snapshot services, respectively. `docs/games.md:42` | Catalogue these uses with their actual owner and support status. Add renderer capabilities when a concrete consumer and fixture exist. |

## Registry and public API

Keep searchable metadata separate from executable renderers. Use one authored registry under a proposed `designs/games/<game>/index.json` with game-local design numbers, labels, source records and supported combinations. Each supported combination records presentation, platform, data mode, evidence or renderer key, and the fixture used to validate it. Keep CSS or distinct drawing code for shipped designs under `src/game/designs/<game>/<design>/`. Shared components own sizing, cues and playback. Add a surface-specific override only where the use case changes composition.

Generate a lightweight runtime registry of usable combinations and a catalogue index that also includes previews and source records. Omitted design selects the existing default for that game (Blueprint for Connect Four). An explicit unavailable selection returns a typed reason in the proposed resolver so the catalogue and host can explain it. Existing callers keep their established fallback for unsupported table requests.

Proposed consumption after the pilot passes:

```tsx
<GameAnimation game="connect-four" gameName="Connect Four"
  design="design-2" presentation="arena" />
```

Use `?game=connect-four&design=design-2&presentation=arena#game-variants` for the shareable selection. Existing game-only links lead to that game's design overview.

## Delivery order

1. **Inventory the known collection** (start here). Reconcile all 50 game slugs against the current renderer, historical HTML/prototypes, Platform web/native archives and all 38 selected public sources. Record the local path or pinned source, distinct visual identity, available image, missing dependencies, license scope and duplicate relationships. Give every known candidate a disposition including shared asset, rules reference, duplicate or visual design. Record unknowns per game. The search ledger tracks wider discovery separately. Current scope and counts are documented in `docs/research/public-game-designs.md:3`.
2. **Establish the registry** (needs 1). Add the per-game metadata, generator and schema checks. Reject duplicate IDs or generated keys, missing source paths and usable combinations with no renderer/fixture. Generate package and catalogue indexes together. Keep upstream bytes and metadata in their existing manifests. Archive handling is defined at `CONTRIBUTING.md:54`.
3. **Ship the Connect Four pilot locally** (needs 2). Add optional design selection to the shared scene boundary and pass it through `src/game/demo.tsx`, `src/game/replay.tsx` and static previews. Reuse the existing Connect Four cell grid, disc drop and result cues for Home v2. Scope its styling by design ID. Capture Card and Arena at the same public position, check all six rows, last move, winning line, caption, theme contrast and reduced motion. Land the renderer, styles, registry capability and tests together so a usable entry always resolves.
4. **Replace the misleading gallery grouping** (needs 3). Update `catalogue/game-variants.tsx`, `game-lab.tsx` and `main.tsx`. Open a game on **Designs** with one thumbnail per distinct look. Filter by use case, origin and availability. Compare designs at a locked position, choose a design to see its supported use cases, and expose **Copy ID** and **Copy link**. Put rules and position studies in **Studies**. Show archived stills with their source and platform. Source-only entries get a source link and a reason. Keep the existing search, keyboard controls and game-only anchors. Today's grouping is visible at `catalogue/game-variants.tsx:28` and `:33`.
5. **Exercise the other families, then fill the catalogue** (needs 4). Pilot a Go board, a poker table, a strategy game with simultaneous reveal and a physics scene such as Lunar Lander. Check intersections, hidden hands, sealed actions and trajectory/contact respectively. Roll the same process through all 50 games. Promote only combinations that pass local checks for that game. Emit coverage by game showing distinct designs, usable placements, previews, sources and gaps. A single useful design with an honest gap is a valid inventory result.
6. **Verify and roll out** (needs 5). Extend `tests/game-lab.test.tsx` and `scripts/browser-check.mjs` with design resolution, default compatibility, direct links, same-frame comparison, no clipping and keyboard/reduced-motion checks. Use `scripts/verify-consumer.mjs` to exercise the packaged optional API and keep archived sources excluded. Run `pnpm ci:local` locally. Record screenshots, supported combinations and remaining gaps beside `docs/validation.md`. Adopt the optional selection first in the catalogue, then in individual consumers that need it.

## Compatibility and completion

| Situation | Expected result |
|---|---|
| Existing caller omits design | Its current default, exported entry points and layout behavior continue to work. |
| Consumer requests a usable design and placement | The package renders that exact combination with the supplied public state. |
| Catalogue opens a preview-only native design | It displays a labelled native capture. The web consumer API advertises only implemented web capabilities. |
| Existing game-only URL, unknown design or retired design | Game-only URLs open the overview. Explicit unavailable IDs show a reason and a visible choice of available designs. Reserved IDs retain their identity. |

Remove the gallery label that conflates position studies with visual designs. Preserve the studies themselves, the pinned traces, canonical assets, original archives and all physics checks. Verify the package export boundary at `package.json:61` and the historical browser baseline at `docs/validation.md:5`.

The first milestone is usable when someone can find the red/yellow Connect Four by sight, compare Gumball with Blueprint on the same frame, copy its Arena ID, and reproduce it in a packed consumer. The library inventory is complete for this collection when all 50 games and identified source candidates have a disposition and every usable placement has local evidence.

**Owner dependencies.** The inventory and first-party pilot can proceed with the existing material. For an external design with unresolved asset provenance, the maintainer records the missing evidence and keeps that entry at source-only until the relevant rights holder or project documentation clarifies reuse. That affects promotion of the individual entry.

**Connect Four implementation.** The pilot now ships 20 named designs, four supported web placements, same-position comparison, a local two-player round and six native reference captures. Its typed registry lives in `src/game/connect-four-designs.ts` and feeds both the package and the catalogue. See [component usage](components.md#connect-four-board-designs). The design inventory work for other games remains separate.

**Catalogue extension.** The [local census](research/local-game-design-census.md) records the first-party and imported evidence for every game, including duplicate captures and mismatched historical fallbacks. The registry now covers all 50 games, with 170 usable game/design pairs. The additional looks are shared family editions except where dedicated designs or original external art are identified. Further ports of archived applications retain their source-only or preview status until implemented individually.
