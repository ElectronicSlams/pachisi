# eSlams Component Reference

Tactical lookup companion to `DESIGN_BRIEF.md` (read that first for intent/principles/copy —
this file is exact CSS recipes and component APIs so you don't have to re-derive them from
`apps/web/styles/*.css`). Production (`apps/web/styles/`) is canon; the prototype
(`redesign/styles/`, `redesign/app/*.jsx`) is the interactive reference for anything not yet
ported (see `DESIGN_BRIEF.md` §13).

All values reference tokens from `apps/web/styles/tokens.css` — look up `--token-name` there,
never hardcode the resolved value.

---

## 1. Buttons — `components.css`

`.btn` — inline-flex, gap 8px, radius `--r-md`, weight 540, letter-spacing -0.01em, nowrap.
Transition: bg/border/color .15s ease, transform .08s ease, shadow .15s. `:active` →
`translateY(0.5px)`. `:disabled` → opacity .45 + `pointer-events:none`.

| Size | Padding | Font |
|---|---|---|
| `.btn-sm` | 6px 11px | 13px |
| `.btn-md` | 9px 16px | 14px |
| `.btn-lg` | 12px 22px, radius `--r-lg` | 15px |

| Variant | Recipe |
|---|---|
| `.btn-primary` | `--accent` bg+border, `--text-on-accent` text, `--shadow-sm`; hover `--accent-hover` |
| `.btn-secondary` | `--surface` bg, `--border-strong` border; hover `--surface-2` bg + `--text-3` border |
| `.btn-ghost` | transparent, `--text-2`; hover `--surface-2` + `--text` |
| `.btn-soft` | `--accent-soft` bg, accent text; hover `color-mix(in oklch, var(--accent) 16%, transparent)` |

## 2. Tags, chips, status

| Class | Recipe |
|---|---|
| `.tag` | 11.5px/540, 2.5px 8px, `--r-pill`, `--surface-2` bg, `--text-2`, 1px `--border`. `.tag-accent` = accent-soft bg/accent text/`--accent-line` border. `.tag-plain` = transparent bg. |
| `.difftag` | 11px/560, 2px 8px pill; `-win` (Beginner) / `-draw` (Intermediate) / `-loss` (Advanced) = soft/solid pairs |
| `.reschip` | 11.5px/600, 2px 9px, radius `--r-sm` (not pill), tabular-nums; win/loss/draw soft/solid pairs |
| `.statusb` | 11.5px/560, 3px 9px pill; `-live` = loss-soft/loss (red=live), `-sched` = surface-3/text-2, `-done` = surface-3/text-3 |
| `.livedot` | 7px circle `--loss`, `pulse 1.4s ease-in-out infinite` |
| `.chip` (filter) | 7px 13px pill, `--surface` bg, 1px `--border`, 13px/530; hover border-strong+text; `.active` = accent bg + text-on-accent. `.chiprow` = flex gap 8px, overflow-x auto, hidden scrollbar |

## 3. Model / provider identity

- `.provdot` / `ProviderDot` — mono, weight 700, radius 5px, provider initials on `provColor(key)` = `oklch(0.62 0.13 <hue>)` tint (18% for the dot).
- `ModelBadge({id, size, showFamily, dot})` — `ProviderDot` + mono `provider/` (dimmed) + `name` (weight 530, ellipsis-safe). **Model IDs are always rendered `provider/name` in mono, provider dimmed.**
- `.mb-fam` — family pill, 11px, surface-2, 1px 7px padding.
- `.medal` — 22×22 circle, 12px/700, 1px border, tabular-nums; ranks 1–3 only (gold/silver/bronze); `Medal({rank})` returns null for rank > 3.

## 4. Sparkline / delta / terminal

- `Sparkline({data,w=84,h=26,positive})` — mini line chart; stroke `--win` if trending up else `--loss`.
- `.delta` — 12px/560 tabular-nums; `.delta-up` = `--win`, `.delta-down` = `--loss`. `Delta({value})` renders "▲ n" / "▼ n".
- `.terminal` — `--term-bg` bg, radius `--r-lg`, 1px `rgba(255,255,255,.06)` border, `--shadow-md`. `.term-bar` = macOS-dots header (9px 12px 9px 14px, `--term-bar` bg). `.term-body` = 14px 16px, 13.5px, line-height 1.85. Syntax coloring: `.t-cmd` term-blue, `.t-arg` term-amber, `.t-flag` term-pink, `.t-dim` term-dim, `.t-str` term-green. `.term-copy` = copy button, hover white/12%; label flips to "Copied" for 1.4s.
- `Terminal({lines, title='bash', single})` component wraps this — always dark, both themes.

## 5. Structure primitives

- `.sechead` / `SectionHead({eyebrow,title,action,sub})` — flex space-between; `.sechead-title` 26px/650 ls -0.025em; `.sechead-sub` 14.5px `--text-2` max-width 60ch; action right-aligned, horizontally scrollable on overflow. Stacks column under 720px.
- `.card` — `--surface` bg, 1px `--border`, radius `--r-lg`. `.card-hover:hover` → border-strong + `--shadow-md` (no translate — cards that lift use their own hover rule, see `.gtile`/`.champ`/`.gamecard`).
- `.eyebrow` (tokens.css) — 11.5px mono, 0.12em letter-spacing, uppercase, `--text-3`. Used for section kickers and numbered step labels ("1 · CHOOSE A GAME").
- `.spinner` — 2px border, top edge `--accent`, `spin .7s linear infinite`.

## 6. Inputs & controls

- `.input` — surface bg, 1px `--border-strong`, radius `--r-md`, 9px 12px, 14px; focus → accent border + `0 0 0 3px var(--accent-soft)` ring. `.input-search` adds left padding 36px for an absolute search icon.
- `.seg` (segmented control) — surface-2 bg, 1px border, radius `--r-md`, padding 3px; items 13px/530, radius `--r-sm`; `.active` = surface bg + `--shadow-sm`. Used for level tabs (Beginner/Intermediate/Advanced) and category filters.
- `.tabs` — bottom-border list; `.active::after` = 2px accent underline (inset 12px each side). Same underline pattern as nav active state.

## 7. Header / nav (`chrome.css`, `.nv-` = current V4 generation)

- `.nv` — sticky, `z-index:100`, bg `color-mix(in oklch, var(--bg) 80%, transparent)` + `backdrop-filter: saturate(180%) blur(18px)`; transparent border until `.nv-scrolled` (6px scroll) adds `--border`.
- `.nv-inner` height = `--nav-h` (64px).
- `.nv-link` — 14px/500; `.active` gets weight 560 + `::after` 2px accent underline.
- `.nv-search` — 230×36 (→190px at 1180px, hidden at 1040px), surface-2 bg; focus-within → accent border + 3px accent-soft ring. `.nv-kbd` = mono `/` shortcut hint.
- `.nv-sresults` dropdown — absolute, min-width 300px, `--shadow-lg`; rows `.nv-sres` min-height 36px.
- `.nv-icon` — 36×36 icon button, radius `--r-md`, transparent → hover surface-2. Reused for theme toggle and GitHub icon.
- **`.nv-gs` Grand Slams marquee box** — h 36, 1px `--accent-line` border, `--accent-softer` bg, trophy icon `--gold`, mono date chip. `::after` shimmer: skewed gradient strip sweeping left→right, `nvshimmer 6s ease-in-out infinite` — **the only gradient/shimmer effect in the system**; disabled under `prefers-reduced-motion`.
- `.nv-av` avatar — 32px circle, mono initials, ring `0 0 0 1px --border-strong` → `0 0 0 2px accent` on hover.
- Mobile: `.nv-static-menu` (`<details>`), `.nv-mobmenu` blur panel, `.mobile-dock` fixed bottom 4-col nav (min-height 58px items) below 920px; body gets `padding-bottom: calc(74px + safe-area)`.

**Breakpoint cascade:** 1180 (search shrinks) → 1100 (hide GS "soon" badge) → 1040 (hide search) → 920 (hide nav links, GS icon-only, mobile dock activates) → 880 (compact icons/avatar) → 520 (hide GitHub icon).

## 8. Footer (`.ft-` V4 generation)

`.ft` — `content-visibility:auto`; `.ft-top` grid `1.3fr 2.4fr`; `.ft-cols` 4-col grid (→2 at 880px, →1×1fr 1fr at 480px). `.ft-h` = 11.5px/600 uppercase column heading. Giant outline wordmark background: `clamp(80px,19vw,280px)`, `-webkit-text-stroke: 1px --border-strong`, opacity .55 (aria-hidden).

## 9. Game tile `.gtile` — shared landing + Arena

Square (`aspect-ratio: 1/1`), column-centered, padding 16px 14px, radius `--r-lg`; hover →
border-strong + `--shadow-md` + `translateY(-3px)`; `::before` = 2px accent top bar (opacity
.55 on hover). `.gtile-icon` 52px, radius 14px, surface-2 → accent-soft + `scale(1.04)` on
hover. `.gtile-name` 13.5px/580, 2-line clamp, min-height 2.5em (equalizes tile heights).
`.gtile-variant` 10.5px `--text-3` mono, ellipsis — **the variant token, never a difficulty or
"top model"** (see DESIGN_BRIEF §7 Games index). Selected state `.gtile-sel` — accent border +
accent-softer bg + `0 0 0 1px --accent-line` ring + top bar opacity 1.

Grid `.ag-grid`: 5 cols → 1080px: 4 → 768px: 3 (gap 10) → 520px: 2 (icon shrinks to 46px).

## 10. Champion / play-band cards

- `.champ` (Reigning Champions) — 16px padding card; hover border-strong + shadow-md +
  `translateY(-2px)`. `.champ-crown` 24px circle, gold-tinted bg, gold icon. Grid 4-col →
  980px 2 col → 480px 1 col.
- `.playband` — "Think you can beat a frontier model?" band; radius `--r-xl`,
  `--accent-line` border, background is the **one other sanctioned gradient**:
  `linear-gradient(120% 120% at 100% 0%, var(--accent-soft), transparent 55%), var(--surface)`.
  `.pb-pick` items hover → accent border + translateY(-2px) + shadow-md.
- `.lp-hero` background also uses a soft radial accent wash — gradients are permitted only as
  extremely subtle full-bleed washes behind hero/playband copy, never as a fill on a
  UI control.

## 11. Leaderboard table anatomy (`pages.css`)

- `.filterbar` — sticky at `top: var(--nav-h)`, `z-index:60`, blurred bg.
- `.lbtable` — bordered container, radius `--r-lg`, overflow hidden.
  - `.lb-head` — height 44px, surface-2 bg, 11px uppercase ls .06em `--text-3`.
  - `.lb-row` — height 58px, grid columns
    `56px minmax(220px,2.2fr) minmax(120px,1.05fr) minmax(90px,0.8fr) 96px 100px 92px 94px 40px`
    (Rank/Model/Provider-Category/Score/WinRate/Games/Trend/expand-chevron); variant `-game`
    swaps in Elo columns; variant `-rated` is tighter (48px rank). Rows separated by
    `--border-faint`; **rank-1 row gets `.lb-first` → `--accent-softer` bg**. Hover → surface-2.
  - Expand chevron `.lb-exp.rot` rotates 180deg on expand (transform .2s).
  - `.wldbar` — 6px pill segment bar (win/draw/loss), surface-3 track.
- `.expandrow` — `--surface-inset` bg, top border, 18px padding. `.er-summaryline` = 6-col
  stat mini-cards. `.er-grid-games` = 5-col per-game cells (`.er-cell`, radius `--r-md`;
  `.er-rank-top` = accent/600 for top ranks; `.er-cell-soon` = dashed border for
  not-yet-eligible cells). `.er-pair` = head-to-head chips.
- **Breakpoint cascade:** 1280 (er-grid→4) → 1080 (col templates tighten) → 980 (er→3) → 760
  (`.lh-hide` columns drop, lb→5 cols, er→2) → 520 (lb→4 cols, hide win-rate/confidence, er→1).

## 12. Match / game cards (Battlefield, Arena setup)

- `.matchcard` — column card, gap 12, padding 15px 16px; `.mc-won .modelname` weight 600,
  `.mc-lost` opacity .55; `.mc-vstag` 11px mono "vs".
- `MatchCard({match,onClick,compact})` — glyph+name+`StatusBadge` header; center A-vs-B
  `ModelBadge`s; footer = `ResultChip` (done) / mono "move {n}" (live) / start time (scheduled).
- `.gamecard` — horizontal card, hover → border-strong + shadow-sm + `translateY(-1px)`;
  `.gc-selected` → accent border + `0 0 0 1px accent` ring. `.gc-icon` 46px surface-2 square.

## 13. Board rendering (all boards)

Cells are large rounded squares one step lighter than the surface (`--board-light/-dark`),
hairline border (`--board-line`), generous gaps. Empty cells show a faint desaturated-accent
dot as a placeholder affordance — never a blank void, never a glow. Stones/pieces use
`--stone-black`/`--stone-white`. Last-move highlight only; no animation glow. Piece-drop /
disc-fall / stone-place animations are capped at ~0.24s and disabled entirely under
`prefers-reduced-motion` (end state shown instead).

`ReplayPlayer({replay})` — board + transport (restart / step-back / play-pause / step-fwd /
end) + range-input scrubber + mono ply counter `"{ply}/{max}"`. Single-frame replays hide
transport controls.

## 14. Shared component API (`components.jsx` / `widgets.jsx` / `replay.jsx`)

Reuse these; do not re-implement a parallel version (production's `platform-ui.tsx` is the
canonical TS port — see `DESIGN_BRIEF.md` §14 on the `Static*` duplicate set).

| Component | Role |
|---|---|
| `Icon({name,size,stroke})` | Outline icon set (~44 names) — search, github, trophy, gamepad, swords, clock, flag, layers, cpu, etc. |
| `GameGlyph({slug,category,size})` | Per-game glyph, falls back to a category glyph (Board/Card/Strategy/RL) |
| `provColor(key)` | `oklch(0.62 0.13 <hue>)` deterministic provider tint |
| `ProviderDot`, `ModelBadge` | Identity chips — see §3 |
| `Button`, `Tag`, `DifficultyTag`, `ResultChip`, `StatusBadge`, `Medal`, `Sparkline`, `Delta` | Primitives — see §1–4 |
| `Terminal`, `SectionHead`, `Spinner` | Structure — see §4–5 |
| `MatchCard`, `GameCard`, `LeaderRowMini`, `StatBlock` | Composite cards — see §12 and Leaderboard |
| `MiniBoard`, `ReplayPlayer`, `getReplay(slug)` | Replay/board rendering — see §13 |

## 15. Global breakpoint index

Collect the cascade in one place — check this before inventing a new breakpoint value.

| Width | What changes |
|---|---|
| 1280px | Leaderboard `.er-grid-games` 5→4 |
| 1180px | Nav search shrinks |
| 1100px | Grand Slams "soon" badge hidden |
| 1080px | Game grids `.ag-grid` 5→4; leaderboard column templates tighten |
| 1040px | Nav search hidden |
| 980px | Champions grid 4→2; leaderboard expand grid 5→3; Battlefield grid 4→2 |
| 920px | Nav links hidden, mobile dock activates; Arena stacks |
| 880px | Compact header icons/avatar; footer grids collapse |
| 860px | Stats band / OSS band 2-col→1 |
| 768px | Game grids 5/4→3 |
| 760px | Leaderboard `.lh-hide` columns drop, table→5 cols, expand grid→2 |
| 720px | `.sechead` stacks; topmodels table drops columns |
| 520px | Game grids →2; hero title 40px; footer grid →1; leaderboard →4 cols, hides win-rate/confidence |
| 480px | Champions grid →1; footer cols →1×1fr |
| 420px | Smallest leaderboard mini-table variant |

---

## Known drift to watch for (do not "fix" without checking `DESIGN_BRIEF.md` §4.1 first)

- `--text-3` and `--nav-h` differ from the prototype **intentionally** (contrast + header
  height fixes) — production values are canon.
- `styles/arena.css` (102 of 196 classes) and the see-all-models modal (`.am-*`) were never
  fully ported — production's in-match Arena UI was independently reimplemented. When
  porting Arena work, prefer rebuilding from `DESIGN_BRIEF.md` §7/§9 intent over copying
  `.ar-play-*`/`.ar-result-*` classes verbatim, since production's DOM structure differs.
- `.section` is defined in both `chrome.css` (30px 0) and `pages.css` (34px 0) — import
  order in `globals.css` decides the winner. Don't add a third redefinition; consolidate if
  you touch either.
- `.sr-only` is defined twice (`tokens.css` and `app/globals.css`) — use the one in tokens.
