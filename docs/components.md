# Component API and state contracts

The catalogue is the runnable reference. Existing class names, theme values and geometry are retained; route destinations and product data are supplied by the host.

| Component | Main interface | States and responsibilities |
|---|---|---|
| Button | Native button props or `href`; primary/secondary/ghost/soft; sm/md/lg; left/right icon | Native disabled/submit behavior, focus, active/hover. Browser links by default; Next adapter is explicit. |
| Field | label, native input props, description, error, ref, controlAfter | Generated label/control/description/error IDs; invalid state and caller aria-describedby are combined. Caller validates/saves. |
| PasswordField | Field props plus toggle labels | Hidden/revealed, disabled; caller owns value and password policy. |
| CopyField | label, value, multiline, sensitive | Idle/copied/error; clipboard failures remain visible. Masking affects display only: do not pass secrets the user shouldn't receive. |
| Dialog | open, onClose, title, description, children, footer, closeDisabled | Native modal focus/escape/backdrop and focus return. Controlled by host. Inside clicks don't close it. |
| Sheet | Dialog content/open callbacks; sm/md/lg | Existing phone bottom sheet and desktop centred modal. |
| Tabs | items, value, onValueChange, ariaLabel | Selected/disabled; roving tab focus, arrows, Home/End; multiple instances use distinct IDs. Caller supplies panel IDs via controls. |
| Tag | plain/accent/win/loss/draw | Compact semantic colour treatment with text, never colour alone. |
| RoleBadge | roleName, fallback | Label/decoration only. Never grants access or replaces host permission checks. |
| Callout | info/success/warning/danger, title, icon, children | Appropriate status/alert defaults; caller can choose role. |
| SettingRow | label, value, description, action, strong | Responsive existing settings anatomy. Host controls settings and persistence. |
| Avatar | image, name/username/email, label, size, fallback, decorative, priority | Existing decode/retry state machine, no-referrer image and text fallback; no account lookup. Caller supplies only allowed identity data. |
| Card / SectionHead | content/class/native props; optional eyebrow/title/sub/action | Existing panel and section anatomy. |
| PageContent | children | Content-only compatibility boundary; no auth or shell ownership. |
| Icon / GameGlyph / GameGlyphTile | name or slug, size, visual variation | Canonical icon geometry; icon-only controls still require an accessible label. Unknown identity gets an honest fallback. |
| ModelChip / Matchup | host-resolved ModelIdentity, display name/id/stacked, size, outcome | Provider mark or initials, winner/loser treatment. No model catalogue fetch. |
| GameTile | slug/name/variant, href or onSelect, active/comingSoon/status | Link/select/inert, pressed/current/disabled semantics; caller decides legal availability. |
| StadiumDate / LiveDot / StatusStrip | value/now or explicit live/lastMatchAt | Deterministic dated output. Never infers liveness from recency. |
| EmptyState / ErrorState | title, copy, action, headingLevel; error retry slot | Honest absence/failure, designed action and alert semantics. No fake spinner. |
| Terminal | title, lines with IDs, copyText | Always-dark existing terminal; code is inert text/nodes, never executed by library. |
| MatchPoster / MatchPreview | host-supplied public metadata or game identity | Dated outcomes with labelled bundled demonstration artwork. Clicking links to actual playback in host. |
| GrandSlamsStage | children, four-game gameLinks, optional titleId | Existing deterministic stars, floating boards, visibility/background scheduling, keyboard and reduced motion. Host owns event dates/content/entry flows. Import event CSS explicitly. |

See [per-game documentation](games.md) for Board, LegalDemonstration, GameAnimation, dataset and extension contracts. Root imports exclude interactive/demo datasets; use explicit `/client`, `/game/*` and `/event` entry points.

## Example: controlled interaction

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@electronicslams/pachisi';
import { Field, Sheet } from '@electronicslams/pachisi/client';

export function Example() {
  const [open, setOpen] = useState(false);
  return <>
    <Button onClick={() => setOpen(true)}>Open settings</Button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Display name">
      <Field label="Name" description="Shown beside your matches." />
    </Sheet>
  </>;
}
```

## Accessibility and composition

Use a visible label or meaningful accessible name on every control. Keep focus rings and return focus after dialogs. Tabs require associated host panels; use `controls` IDs unique to the page. Headings and live regions must fit the surrounding document. Live/colour/outcome/motion indicators are supplementary to text. Do not mark every decorative icon with a redundant label.

A repeated component must not reuse a global ID. Theme and reduced-motion rules apply to the whole document when house styles are imported. Host apps keep status/recovery and authorization behavior; a visual library cannot certify an application flow merely because a component renders.

## GameReplay

The catalogue's **All variants for …** section compares the selected game's implemented studies and presentation layouts. Use `?game=<slug>#game-variants` for a direct link. These are presentation/position studies, not additional playable rules engines.

`GameAnimation` accepts `arena-table` for generic card tables with host-supplied external seats. For other games, including Blackjack, it falls back to the full `arena` layout; a short table crop must never clip a square board. The catalogue disables unsupported table options and labels the table-centre preview explicitly. Arena/event sizing reserves space for captions.

`GameReplay` is an optional client component exported from `@electronicslams/pachisi/game/demo`. It starts paused and provides first/previous/play/next/last, a keyboard-operable frame slider, speed and explicit terminal/excerpt status. Reduced motion keeps manual inspection available and disables playback. Leaving the viewport suspends advancement; hiding the document stops playback. Replay stops at the end rather than looping.

```tsx
import { GameReplay } from '@electronicslams/pachisi/game/demo';
<GameReplay game="chess" gameName="Chess" />
```

Supply `demonstration` for an already-redacted public sequence. The host owns legality and privacy. `version` identifies the sequence; changing game or sequence resets playback. `variantNote` overrides the bundled variant caption (`null` suppresses it for a clearly labelled authored study). `LegalDemonstration` accepts the same optional caption override. No rules, collision simulation or hidden-state reconstruction occur in the player. CSS is included by the existing `styles.css` import.

## Connect Four board designs

Open the catalogue at `?game=connect-four&design=design-2&presentation=arena#game-variants` for Gumball. Compare all 20 boards on a shared eight-frame trace. Use **Board design** to switch the stage, replay, authored study and local two-player board together. The local round preserves moves across material changes. **Copy variant ID** gives the stable key, and **Copy design link** restores its layout and design. The six native appearances are historical captures.

```tsx
import '@electronicslams/pachisi/styles.css';
import { GameAnimation, GameReplay } from '@electronicslams/pachisi/game/demo';
import { Board } from '@electronicslams/pachisi/game/board';
import { resolveConnectFourVariant } from '@electronicslams/pachisi/game/connect-four-designs';

const choice = resolveConnectFourVariant('design-2', 'arena');
if (choice.ok) {
  // Use with a supplied Connect Four CellBoardFrame for an actual match.
  const board = <Board frame={frame} design={choice.design.id} label="Connect Four position" />;
  const preview = <GameAnimation game="connect-four" gameName="Connect Four"
    design={choice.design.id} presentation={choice.presentation} />;
  const replay = <GameReplay game="connect-four" gameName="Connect Four" design={choice.design.id} />;
}
```

The registry exports `CONNECT_FOUR_DESIGNS`, `CONNECT_FOUR_LAYOUTS` and `connectFourVariantId`. Stable IDs run from `design-1` (Blueprint, the default) to `design-20`. Use cases are Card, Arena, Feature and Event. Use the resolver for explicit IDs supplied by a host or URL. It distinguishes an unknown design from an unsupported presentation. Every board shares the same row-major R/Y frame contract, gravity, last move, winning cells and reduced-motion behavior.

## Visual editions for every game

Use `gameDesigns(game)`, `gameDesignInputs(game)`, `gamePresentations(game)` and `resolveGameVariant(game, designId, presentation)` from `@electronicslams/pachisi/game/designs`. The metadata entry loads independently of replay data. Stable identifiers are scoped to the game. Pass the resolved design ID to `GameAnimation`, `LegalDemonstration` or `GameReplay`. Simple cell-based live frames also accept the design on `Board`. Keep specialized game data on its existing scene/host adapter path.

```tsx
const view = resolveGameVariant('go', 'design-4', 'arena');
if (view.ok) {
  return <GameAnimation game="go" gameName="Go" design={view.design.id} presentation={view.presentation} />;
}
```

Blueprint is the default. Connect Four has 20 designs. Go and Gomoku use four intersection-board treatments. Pentago uses four tray-board treatments. Porcelain uses Shudan’s original stone artwork. The other 46 games have three designs each. The alternate materials are shared within board, table, strategy and control families. These are 170 supported game/design pairs. The existing use-case rules yield 722 game/design/placement combinations. Switching visuals preserves frame content, private-state masking and game geometry. The catalogue compares identical trace frames, remembers the selection per game within the page and provides copyable IDs and links.

The [census](research/local-game-design-census.md) links each game's historical evidence. Run `python3 -I scripts/census-game-designs.py` after updating the registry, reviewed mappings, reference manifests or active-turn previews. Six archived theme captures per family remain appearances of that family. A source entry becomes a usable choice only when a tested package renderer exists.

Design records store explicit game-local IDs. Resolved variants expose an `inputs` list with `synthetic-preview`, `spectator-replay`, and where supported `live-cell-frame` or `catalogue-local-play`. A placement selects the preview composition. `GameReplay` provides its own transport and position inspector.

The public position inspector lists the frame’s declared public fields and excludes undeclared fields. Hosts must provide already-redacted frame values, including card hands, captions and reveal history. Replay announcements use the public frame caption. Raw actions in a host’s validation log must stay outside its spectator bundle.

Pentago frames may carry `placement: {cell, quadrant, direction}`. Cells are zero-based row-major on the 6×6 board. Quadrants run upper-left, upper-right, lower-left, lower-right. Direction is `cw` or `ccw`. The renderer marks the rotated quadrant and the marble’s settled position. Goofspiel’s `committed` field carries player identifiers only. The simultaneous reveal comes from public `round_history`. Racing uses supplied speed, heading, lane and track coordinates.
