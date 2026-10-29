---
name: eslams-design
description: Design system and UX conventions for eSlams (apps/web) — the AI game-leaderboard platform. Use whenever building, editing, or reviewing anything in apps/web that renders UI — pages, components, styles, copy, or the Arena/Battlefield/Leaderboard/Grand Slams/Profile/Model/Game surfaces. Also use when asked about eSlams brand, tokens, naming, or design intent.
---

# eSlams Design

eSlams ships a deliberately restrained visual language — clean, light/dark, one accent color,
no neon/glitch, monospace reserved for anything machine-generated. It is both a public product
and a trust system: every UI decision should make the numbers more credible and the games more
watchable. Full rationale lives in `docs/design/DESIGN_BRIEF.md` — read it before any
non-trivial UI change. This file is the fast operational checklist; the brief is the source of
truth when they conflict with anything below.

## Before touching UI, read

1. `docs/design/DESIGN_BRIEF.md` — principles, IA, page anatomies, data-display rules (§8),
   liveness/latency UX (§9), a11y (§10), voice/copy (§12), and the current gap list (§13). If
   the task touches the Leaderboard or any score/rank display, §8 is non-negotiable — do not
   invent a ranking or confidence presentation without it.
2. `docs/design/COMPONENT_REFERENCE.md` — exact class recipes, breakpoints, and the shared
   component API (`Icon`, `ModelBadge`, `Terminal`, `SectionHead`, table/tile anatomies).
   Check here before writing new CSS — the recipe you need probably already exists.
3. `redesign/eSlams v4.html` — open it in a browser for the highest-fidelity visual reference
   (no build step). Treat its markup as a *visual* reference only — production architecture
   (server components, client islands, `Static*` primitives, Next.js routing) always wins over
   copying its DOM/React structure verbatim.

## Hard rules

- **Tokens only.** Every color/radius/shadow/spacing value comes from `var(--*)` in
  `apps/web/styles/tokens.css`. Do not write a hex/rgb literal in a component or page style.
  The only sanctioned exception is `app/manifest.ts` (can't read CSS variables there).
  Dynamic provider tints go through `lib/provider-color.ts` (`color-mix(in oklch, …)`).
- **Reuse the shared primitives.** `components/platform-ui.tsx` is the design system
  (`Icon`, `GameGlyph`, `ProviderDot`, `ModelBadge`, `Button`, `Terminal`, `Tag`,
  `DifficultyTag`, `StatusBadge`, `Medal`, `Sparkline`, `SectionHead`, `MatchCard`,
  `LeaderRowMini`, `PublicShell`). For server/SEO-safe pages use the `Static*` counterparts in
  `static-public-ui.tsx`. Never write a third parallel Button/Icon/Shell — that duplication is
  already flagged as debt (`DESIGN_BRIEF.md` §14, item 2).
- **CSS placement.** New page styles go in the existing numbered global sheets by topic —
  `pages4.css` (model/provider/game/auth), `pages3.css` (modals), `pages2.css`
  (battlefield/arena/grand-slams/profile), `pages.css` (home/leaderboard widgets),
  `landing.css` (home sections), `components.css` (cross-page primitives), `chrome.css`
  (header/footer) — with a class prefix matching the surface (`.lp-`, `.bf-`, `.ar2-`/`.am-`,
  `.gtile`/`.stile`). Trinity-only styles stay in `app/globals.css` under `.trinity-*`.
- **Naming is locked.** Use the exact vocabulary in `DESIGN_BRIEF.md` §5 — Game / Arena /
  Match / Replay / Battlefield / Official / Official Score / Artifact / Trinity / Snapshot /
  Levels / Variant. Never write "battle", "sweep", "Elo", or ad-hoc category names — the live
  site's vocabulary drift (§13) is a documented bug, not a pattern to extend. The four game
  categories are exactly: Board & Strategy (16) · Card & Hidden-Info (17) · Social & Economic
  (5) · Control & Arcade (12).
- **Data integrity beats visual polish.** Never ship a UI that: shows rank order contradicting
  a displayed score without a labeled metric; mixes official and human-Arena data in one
  table/count; claims "live" over stale/zero data; shows an unlabeled confidence interval; or
  lets a headline count (games/models/providers) drift from other pages showing the same
  count. These are the live site's current P0 bugs (§13) — don't reintroduce them elsewhere.
- **No hard dead ends.** Any long-running or async UI (Arena moves, replay loads, match
  requests) needs an escalating status ("taking longer than usual" → options → a graceful
  terminal state) per `DESIGN_BRIEF.md` §9. A UI that can only say "refresh this game" fails
  review.
- **Motion respects `prefers-reduced-motion`.** Every animation you add needs a disabled/
  end-state fallback. The Grand Slams shimmer and hero radial wash are the *only* gradient
  effects in the system — don't add more gradients on interactive UI surfaces.
- **Performance budgets are real constraints**, not aspirational: `/` 180KB, `/leaderboard`
  `/models` `/games` 220KB, `/arena` 350KB, `/replays/:id` 300KB gzipped first-load JS. Don't
  import Arena code from Home, or the replay player from Leaderboard. Prefer server components
  + `Static*` primitives for anything that doesn't need interactivity; keep `searchParams`
  reads client-side (server-side reads there kill ISR).
- **Accessibility is not optional.** Every interactive element keeps the global
  `:focus-visible` ring (don't `outline: none` an input — the header search does this today;
  it's a known bug, not precedent). Modals trap focus and return it on close. Icon-only
  buttons get an `.sr-only` label (the one in `tokens.css`, not a second copy in `globals.css`).

## Workflow for a UI change

1. Identify which page anatomy in `DESIGN_BRIEF.md` §7 this touches, and re-read that section.
2. Check `COMPONENT_REFERENCE.md` for an existing class/component before adding new CSS or a
   new primitive.
3. Check `DESIGN_BRIEF.md` §13 — is this change *closing* a listed gap? If so, note which item.
   If you're adding new scope, check it doesn't conflict with a planned fix already listed.
4. Build with tokens + shared primitives; place CSS per the file map above.
5. Verify both themes (light and dark) — most classes are token-driven and "just work", but
   check contrast on any new text-on-tint combination, especially `--text-3` on soft/tinted
   backgrounds (a known-thin area).
6. Verify against performance budgets if you touched a route's client bundle (new heavy import,
   new client component) — check which budget in `DESIGN_BRIEF.md` §11 applies.
7. Screenshot both themes for the PR per `CONTRIBUTING.md` ("Design Work" section) — public UI
   must match the design files/brief closely, and PRs with UI changes require screenshots.
8. If you changed a token or added a genuinely new pattern, update `docs/design/` in the same
   PR — these docs are the contract other agents (and humans) work from; stale docs are worse
   than none.

## Trinity is different

`trinity.eslams.com` uses **private admin chrome, never the public header/footer**
(`CONTRIBUTING.md`). It's currently undesigned (ad-hoc `.trinity-*` rules with no prototype
counterpart) — still use tokens for color/spacing/radius, but don't force public-surface
patterns (hero sections, marketing copy, the public nav) onto it. Role-gate navigation and
actions per the five Trinity roles (`super_admin`, `admin`, `manager`, `developer`,
`researcher`) — see `docs/trinity-roles.md`.

## When you're not sure

If a request would introduce a new color, a new gradient, a new animation style, a new game
tile/card shape, or new leaderboard columns — that's a design decision, not just an
implementation detail. State the tension against the principles in `DESIGN_BRIEF.md` §2 and
propose the option that best fits "quiet, credible instrument" before writing code, rather than
guessing silently.
