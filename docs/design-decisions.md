# Design decisions and source hierarchy

Pachisi is eSlams' existing Stadium design system made independently maintainable. It extracts the established components, tokens, brand assets and game visuals. It does not introduce a new visual identity or authorize a product rewrite.

The baseline is Platform commit [`0fa7dfe227fe545036694c915a6b727eb4ee844a`](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a), reviewed 29 October 2026. File origins and hashes are in [`SOURCE_MANIFEST.json`](../SOURCE_MANIFEST.json). The package source and current catalogue are the implementation contract; the following source map explains why older references can disagree.

## Which source wins

1. The founder's later explicit decisions and the current approved component implementation.
2. Stadium's implementation notes, founder-review/correction/walkthrough documents and the October 5 reusable-visuals decision, read in chronological order.
3. The September 30 Stadium brief and interactive prototype where not superseded.
4. Earlier design briefs, v1–v4 HTML/JSX/CSS explorations and component recipes as historical reference only.

A prototype demonstrates composition and interactions. Its plausible sample matches, reasoning, model lists and simulated local game engines are not product data or production game authority. Do not copy prototype seed data into a real match surface. A screenshot establishes the pictured state, not every theme, viewport, interaction or gameplay result.

### Source review map

All links below pin the extraction baseline. These are references; their old operator/release instructions do not authorize Pachisi to deploy, mutate data or publish packages.

| Source | Contribution | How to use it now |
| --- | --- | --- |
| [Stadium `IMPLEMENTATION.md`](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/IMPLEMENTATION.md) | Tokens, stylesheets, current components, chrome, source-backed content, sharing rules | Primary production-to-design map, reconciled with later entries below |
| [Stadium `DESIGN_BRIEF.md`](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/DESIGN_BRIEF.md) | Brand, restrained surfaces, type, Stage, matchup, result curtain, motion and performance intent | Preserve its locked foundations; do not restore superseded product/platform decisions |
| [Stadium prototype and README](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/prototype) | `eSlams Stadium.dc.html`, `Board.dc.html`, support/app/data/records scripts, route/state review shell | Visual and interaction reference. The prototype's local game engines and data fill stay out of the library |
| [October 3 founder review](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/FOUNDER_REVIEW.md) | Preserve Arena; restore models/providers and separate match Records; settings and sharing requirements | Overrides the brief's blanket bans on those product surfaces |
| [Reference corrections](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/REFERENCE_CORRECTIONS.md) | Full Grand Slams page, honest empty states, profile/settings preservation, 50-game Home grid | Preserves complete public surfaces rather than a reduced teaser |
| [October 4 walkthrough cleanup](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/WALKTHROUGH_CLEANUP.md) | Arena → Grand Slams → Battlefield navigation; combined/per-player reasoning; compact Follow; single settings stack and shared sheets | Later placement and interaction decisions supersede earlier conflicting navigation/settings notes |
| [Battlefield at scale](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/BATTLEFIELD_AT_SCALE.md) | Stage, marquee, day programme, solo lane, request door, reusable previews and freshness grammar | Its revised October 5 preview section overrides the old real-terminal-frame decorative-poster rule |
| [Reusable game animations](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/GAME_ANIMATIONS.md) | Placement, one active preview per group, all-50 coverage, artwork boundary | Decorative artwork is separate from actual gameplay/replay |
| [Rules and physics audit](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/GAME_ANIMATION_RULES_AUDIT.md) | Core-validated synthetic frames, shipped compact variants, corrected geometry and disclosure | Explains the artwork pin and existing limits; a visual extraction does not change the production game engine |
| [Game Visual Pack](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/GAME_VISUAL_PACK.md) | Separate-package boundary, surface inventory, source snapshot, existing validation/deferred adapters | Source for what was implemented versus planned. Its original draft/no-merge status is historical: [PR #436](https://github.com/makriman/eSlamsPlatform/pull/436) merged on 7 October |
| [Grand Slams floating boards](https://github.com/makriman/eSlamsPlatform/blob/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design/stadium/GRAND_SLAMS_FLOATING_BOARDS.md) | Edge-to-edge black/white space, four boards, depth, drift, pointer parallax and dock clearance | Approved event-specific composition. It does not establish a new global visual language |
| [Earlier design brief and component reference](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a/docs/design) | Original class recipes, shared-primitives APIs and design history | Both explicitly marked superseded; useful for provenance, not as a new product specification |
| [Earlier redesign notes and assets](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a/redesign) | `DESIGN_NOTES.md`, `_v3.md`, `_v4.md`, `_arena.md`, HTML and linked JSX/CSS | Preserve successful geometry/choreography where carried forward; do not resurrect old ranking narratives or duplicate shells |
| [Original v1 design files](https://github.com/makriman/eSlamsPlatform/tree/0fa7dfe227fe545036694c915a6b727eb4ee844a/design%20files) | Initial HTML and associated assets | Historical exploration, not extraction authority |

The review includes the current component/style implementations behind these documents. The public Pachisi payload deliberately does not copy personal reference recordings, operational release evidence, live records or entire application source trees.

## Resolved historical contradictions

| Earlier direction | Later/current decision |
| --- | --- |
| One Expo application across web/iOS/Android | The extracted implementation is React DOM from the shipping Next.js Platform. No Expo/Skia/native adapter is claimed by this package. Future native rendering needs explicit platform adapters and parity validation. |
| No public model/provider pages | These discovery pages were explicitly restored. Their loaders, follow actions and challenge policy remain in Platform; identity presentation is reusable. |
| No Leaderboard labels anywhere | Hosted evaluation rankings are retired. Arena/Battlefield keep separate real completed-match Records and the founder-approved public Leaderboard labels. Pachisi supplies presentation, not ranking calculations. |
| Grand Slams after the two game surfaces | The October walkthrough moved it between them: Arena → Grand Slams → Battlefield. Navigation order is product configuration, not hardcoded in the primitive library. |
| Every small poster renders its actual terminal replay frame | October 5 established bundled game demonstrations for decorative cards. Metadata/deep links remain actual. Opened gameplay/replay and explicit match/turn snapshots remain actual. |
| One scene looks identical everywhere | One shared visual implementation has several compositions. Compact card, Arena board/table, feature and event presentations differ in density, scale and motion emphasis. |
| Six app themes | Shipping Stadium web has light/dark with system preference. Neon, Club, Arcade and Midnight were archived-mobile reference palettes, not live settings to reintroduce. |
| Multiple font packs already shipped | Not established. UI uses the existing sans stack; machine-like labels use the mono stack. Optional typography roles do not imply a user-facing font-picker product. |
| Rebuild Arena from the prototype | Preserve its established grid, seats, input, privacy, timeout and session behavior; change only explicitly scoped visual internals. |
| A broad older ban permits no event-specific visual effects | The later Grand Slams composition is a deliberate exception: four existing boards in black/white space, with reduced-motion and visibility handling. Keep it scoped to the optional `./event` / `./event.css` pattern. |

## October 5 architecture, carried forward

The founder asked for one independently maintained game-animation/icon pack, imported as a package, with coverage across Arena, Battlefield, mobile references and future Grand Slams. The scope review expanded that into icons, boards/pieces/cards/terrain, legal synthetic demonstrations, typography/palette inputs and eventual web/native/snapshot adapters.

Pachisi is the broader design/components home requested on October 29. It incorporates the existing game presentation source alongside foundations and UI. This does not mean every October 5 aspiration is complete. Native/Skia, complete all-family actual-state viewers, headless share exports and renderer-container integration remain separate engineering work where the current code does not supply them. See [game adaptation and coverage](games.md).

Separate the six modes explicitly:

| Mode | Data authority | Display rule |
| --- | --- | --- |
| Identity/icon | Canonical game slug | Recognizable vector identity; an unknown future slug gets its documented fallback |
| Demonstration | Bundled synthetic public frames | Label as game animation/artwork; never imply it is the neighboring match's position |
| Entrance/initial | Neutral setup or supplied initial state | Entrance does not advance a match |
| Live | Authorized host session state | Render only current permitted state; legal actions remain host/engine-owned |
| Replay | Authorized recorded state plus host clock | Pausing freezes the interpreted game; no wall-clock invented physics |
| Snapshot | One explicitly eligible actual frame, or explicitly labeled demo artwork | Match/turn shares must preserve actual provenance and hidden-information boundaries |

## Foundations that remain locked

- **Brand:** keep the approved blue mark and light/dark wordmarks byte-for-byte. Never recolor, gradient-fill, outline, shadow or redraw the mark. Provider marks and user avatars are separate identity assets supplied by hosts; they are not eSlams brand variants.
- **Surfaces:** quiet light/dark surfaces, hairline borders, restrained shadows and one primary action accent. Use the actual tokens rather than remembered hex values. Some historical notes contain earlier contrast values; `styles/tokens.css` is the extraction canon.
- **Type:** UI/headings use the sans stack. Model identifiers, move labels, dates, variant metadata and counts use mono/tabular numerals where the established component does so. Heading weights/tracking remain token-driven. JetBrains Mono is optional and self-hosted under the bundled SIL OFL.
- **Geometry:** preserve the established radii, control sizes, tile proportions, gaps, board geometry and complete scene bounds. Compactness is a presentation choice, not permission to hide important state.
- **Motion:** shared move/reveal/result durations and ease-out grammar remain. The hero's approved sequence is host-owned choreography. The extracted Grand Slams stage preserves its distinct four-board composition, with host-injected links/content. Decoration never creates or modifies game facts.
- **Copy:** sentence case, plain player language, dated evidence and explicit missing-data states. Do not leak protocol fields, infrastructure terms or raw model IDs where the product component already has a display name.
- **Theme:** the mark remains blue in both themes. Outcome colors represent win/loss/draw; live status is a factual signal, not an ornamental red dot.

## Interaction and state contract

The catalogue is a review surface; consumers must also exercise their own data and routing adapters. These states are part of a component's contract, not optional screenshots.

| Component/pattern | States and semantics to preserve | Host responsibility |
| --- | --- | --- |
| Button/link | Primary/secondary/ghost/soft; small/medium/large; hover, focus-visible, active, disabled; button versus navigable link | Busy text, mutations, idempotency, route destinations; use a real button for actions |
| Field/password | Label association, helper/error descriptions, required/disabled/read-only, invalid state, focus, password visibility toggle | Validation policy, credential transport, submission, rate-limit/retry text |
| Callout | Info/success/warning/danger; readable title/body; status versus alert role | Factual message and appropriate announcement frequency |
| Copy field/terminal | Idle/copied/failure where supported; selectable source text and keyboard access | Supply nonprivate text; browser clipboard policy remains observable |
| Tabs | Selected/unselected/disabled; roving tab stop; arrow/Home/End navigation; distinct instance identifiers | Valid selected value, matching tab panels and controlled selection |
| Dialog/sheet | Controlled open/closed, title/description, Escape/backdrop dismissal, focus return, nested-modal isolation; phone sheet and desktop modal | Unsaved-change policy, busy dismissal policy and action callbacks |
| Avatar | Empty/loading/decoded/retry/exhausted, stale-image-event isolation, initials fallback, decorative or named semantics | Authorize/sanitize image URLs and supply identity; never include real account data in documentation fixtures |
| Game tile | Link, in-place selectable button, active, inert, coming soon; readable variant and full icon | Catalogue eligibility and destinations; no unrelated demo as fallback |
| Model chip/matchup | Name/id/stacked; missing mark initials; winner/loser/draw; small/medium | Resolve approved model identity and actual result; initials are a fallback, not a provider logo replacement |
| Match poster | Live/completed/scheduled, date, winner, pending replay note, no-data fallback, complete decorative scene | Actual match metadata and deep link; decorative demonstration remains labeled |
| Status/date | Live only on actual live state; relative recent dates, absolute UTC dates, invalid date omission; empty history | Stable `now` across server/client rendering and actual freshness |
| Empty/error | Plain reason and next action; designed missing-data state, never an endless spinner | Retry/navigation, permission-sensitive copy and escalation |
| Game demonstration | Known/unknown slug; full/mini; all presentations; visible/offscreen/hover/focus/hidden/reduced motion | Choose the correct game/variant and placement; do not treat it as an actual match viewer |
| Actual stage and replay | Initial, thinking, action, reveal, reconnect, paused, pending, unavailable, terminal | State progression, perspective/privacy, legal targets, transport, narration and session ownership |
| Grand Slams stage | Four boards with explicit links, stable central copy, black/white theme, pointer versus touch, offscreen/hidden/focus/hover/reduced-motion states | Supplied content/title association, actual destinations, calendar and event data; no fake entrants/results |
| Share flow | Whole match/exact turn, frozen chosen frame, download/native/copy fallback, unavailable/private | Access checks, actual snapshot projection and destinations; never share hidden hands |
| Public/private chrome | Public search/account/nav versus private Trinity role-gated shell | Auth, user state, permissions, route order, notifications and account mutations |

## Accessibility and responsive acceptance

- Preserve the visible accent focus ring; label icon-only controls. Native anchors/buttons keep their semantics, and a selected tile does not masquerade as a disabled link.
- A dialog must trap focus while open, return it on close, handle Escape/backdrop correctly and leave its parent open when a nested child closes. Test real keyboard behavior, not only DOM attributes.
- Associate labels, descriptions and errors. Explain asynchronous failure with a usable next action. Avoid repeated live-region announcements while a decorative frame changes.
- Use a named image/scene where a board communicates content; purely decorative duplicates are hidden from accessibility APIs. An actual game needs an accessible host interaction layer, not merely an SVG image label.
- Verify both themes, system preference, reduced motion, keyboard, desktop and narrow phone layouts. Existing key canvases are 1440 px desktop and 390 × 844 phone; include 320 px and intermediate widths when a composition can overflow.
- Existing generic game tiles use five desktop columns, then four/three/two. Arena's product-specific 24-tile grid remains four by six on desktop; the library does not silently substitute the Home grid.
- Preserve full board/piece bounds, aspect ratio and legible compact labels. Do not solve overflow by cropping meaningful game cells. Reserve safe-area/dock clearance in host layouts, including focused targets.
- Reduced motion shows a populated stable final demonstration frame; meaningful game state still changes when the host supplies a new frame. Paused real replays must not continue physical motion.

## Performance and maintenance

The package root should remain usable by server-rendered consumers without importing browser hooks, the entire game demonstration JSON or Next.js. Interactive components and animated data have explicit subpath entry points. Host-specific routing belongs in adapters. Never put the full replay parser/runtime in every small match poster.

The inherited route budgets are useful regression constraints: Home 180 KB; models/games 220 KB; Arena 350 KB; Battlefield/replay 300 KB gzipped initial modern scripts. They are application budgets, not a claim about Pachisi's catalogue bundle. Measure consumer before/after weights, separate initial/lazy chunks, and disclose tool/runtime assumptions. The October package report measured Home above its budget; extraction alone is not proof that this is fixed.

Changes must update the component API, catalogue examples, relevant state/interaction tests and visual fixtures together. Retain source/asset notices and provenance. A new game scene needs correct geometry, public projection, variant identity and legal demonstration data before broad placement. A new palette or motion treatment needs review against these principles rather than silent ad-hoc CSS.

No registry publication or production deployment follows from this documentation. Package adoption is a separately reviewed consumer change; Platform's current behavior and source pins remain until that integration is accepted.
