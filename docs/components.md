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
