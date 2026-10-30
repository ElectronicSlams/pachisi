# eSlams Design Brief

> *Here, AI plays games.*

**Status:** Canonical. This document is the single written source of truth for how eSlams looks,
sounds, moves, and behaves. It consolidates the v2–v4 design prototypes, the Arena rebuild, the
expert review, the Arena recommendations, the Bayesian leaderboard plan, the performance audit,
and a July 2026 audit of the live site.

| Source of truth for… | Lives at |
|---|---|
| Design intent, principles, page anatomy, naming, copy | this document |
| Exact component/CSS recipes, breakpoints, known drift | `docs/design/COMPONENT_REFERENCE.md` |
| Design tokens (colors, radii, shadows, type, layout) | `apps/web/styles/tokens.css` (production is canon) |
| Interactive reference prototype (v4 + Arena rebuild) | `redesign/eSlams v4.html` (open in a browser; no build step) |
| Prototype rationale & changelogs | `redesign/DESIGN_NOTES*.md` |
| Historical v1 exploration (reference only, superseded) | `design files/` |
| Agent-facing working rules for UI changes | `.claude/skills/eslams-design/` |

Where production tokens and the prototype disagree, **production wins** — the divergences are
deliberate fixes (see §4.1). Where the live site and this brief disagree, **this brief wins** —
the live gaps are enumerated in §13.

---

## 1. Product & design mission

eSlams is an open-source AI game leaderboard: frontier language models play 50 games — chess to
poker to lunar lander — and every official score is backed by a signed artifact and a replayable
proof. The platform turns that engine into a living product: a leaderboard you can trust, match
replays you can watch, an Arena where anyone can play a frontier model, and a seasonal Grand
Slams tournament.

Three audiences share one surface:

1. **The curious public** — arrives from a shared replay or "can I beat GPT-5?" curiosity.
   Primary CTA: *Play Against AI*. Must understand everything without ML literacy.
2. **The researcher / evaluator** — needs Bloomberg-terminal-grade data with visible
   methodology: conservative Bayesian ranks, credible intervals, coverage, proof links.
3. **The builder** — installs the engine (`pip install eslams`), reads replay files, opens PRs.
   Served by the open-source band, docs, and footer — never at the expense of audiences 1–2.

**Design mission:** make rigor feel effortless. The site should read as a calm, credible
instrument that happens to contain live games — not a gaming site that happens to have data.
The product is both a public product and a trust system; every design decision must survive the
question *"does this make the numbers more believable and the games more watchable?"*

---

## 2. Design principles

1. **Clean, modern, AI-native — never cyberpunk.** The Arena battle-stage concept was adopted
   from a neon/glitch reference; the aesthetic was explicitly rejected. No neon, no glow,
   no glitch, no scanlines, no gradients on UI surfaces, no heavy shadows. Quiet surfaces,
   hairline borders, generous whitespace.
2. **One accent; color is information.** The logo blue is the only brand color. Green/red/amber
   exist solely to encode results (win/loss/draw) and difficulty. Gold/silver/bronze encode
   medals. If a color isn't encoding something, it shouldn't be there.
3. **Show, don't tell.** A newcomer should see a game being played before reading a word about
   it. Animated game previews, live boards, and scrubbable replays are the centerpiece of
   their surfaces — copy supports the picture, not the reverse.
4. **It's a matchup.** Arena frames every screen as *You vs Model*: combatants, a VS pairing,
   a head-to-head bar in play, a result card that reads like a scoreline.
5. **Honest surfaces.** No fake spinners — thinking indicators are driven by real stream
   heartbeats. No "live" framing over stale data. No fake ordinal precision — close ranks show
   uncertainty. Unverified content says so plainly ("Coming soon", "verified entry pending")
   while preserving page structure.
6. **Latency is personality, not failure.** Frontier models take 5–20s on hard positions;
   that is the product's soul. Make thinking time part of the show (chess clock, streamed
   explanation, telemetry-based "usually moves in ~9s") and remove every *other* millisecond.
   Hard dead-ends are forbidden (§9).
7. **Progressive disclosure.** Leaderboard rows expand before they navigate; help is optional
   and never forced; raw tokens and hashes live behind developer disclosures; the full model
   catalog sits behind a curated default.
8. **Performance is design.** Budgets (§11) are design constraints, not engineering trivia.
   A 2-minute-stale leaderboard served in 100ms beats a fresh one in 2.5s.

---

## 3. Brand

**Name:** always "eSlams" — lowercase *e*, capital *S*, no space. Domain styling `eslams.com`.

**Tagline:** *"Here, AI plays games."* — used verbatim in the hero, the README, and meta
descriptions. Do not paraphrase.

**Logo.** The mark is a lowercase **"e" inside a rounded-square (squircle) outline** — an
"@"-like construction whose loop is a game-board tile. Strokes are thick with a subtly
hand-drawn wobble; do not redraw it geometrically perfect. The mark is always the deep royal
blue (`#1b32c4` family) in both themes. The wordmark — lowercase "slams" in a wide, rounded,
low-contrast sans — sits tight against the mark (the mark reads as the word's first letter)
and is the only part that flips with theme: near-black on light, near-white on dark.

- Assets: `redesign/assets/mark.png`, `logo-light.png`, `logo-dark.png`. Use these files;
  do not recolor, outline, shadow, or gradient the mark.
- The mark alone serves as favicon and app icon. Ship it as SVG or ≤10KB optimized raster —
  never the 228KB+ PNGs (§11).
- Nav logo slot is ~121×40; preload only the variant for the active theme.

---

## 4. Design language

### 4.1 Color & tokens

All color, radius, shadow, type, and layout constants are CSS custom properties in
`apps/web/styles/tokens.css`. **Never hardcode a hex/rgb value in components or page styles**
(sanctioned exceptions: `app/manifest.ts`, which cannot read CSS variables). Dynamic
provider tints go through `lib/provider-color.ts` + `color-mix(in oklch, …)`.

Light is default; dark applies via `[data-theme="dark"]` (manual toggle, localStorage
`es-theme`) and a `prefers-color-scheme` fallback when no manual choice exists.

Key values (full set in the token file):

| Role | Light | Dark |
|---|---|---|
| `--bg` / `--surface` | `#ffffff` / `#ffffff` | `#0c0c0e` / `#121215` |
| `--surface-2` / `--surface-3` | `#f7f7f9` / `#f0f0f3` | `#18181c` / `#1f1f24` |
| `--border` | `#e8e8ec` | `rgba(255,255,255,0.085)` |
| `--text` / `--text-2` / `--text-3` | `#0b0b0d` / `#56565f` / `#666672` | `#ededf0` / `#a2a2ad` / `#9a9aa5` |
| `--accent` (+ hover/press/soft/softer/line) | `#1b32c4` | `#647cff` |
| `--win` / `--loss` / `--draw` | `#1f8a4c` / `#c43d33` / `#b0791b` | `#3ec97e` / `#ec6a5f` / `#e0a94a` |
| `--gold` / `--silver` / `--bronze` | `#c79a2e` / `#9aa0aa` / `#b07440` | `#e3b94a` / `#b6bcc6` / `#cd8b54` |
| Board suite | `--board-light/dark/line/bg`, `--stone-black/white` | (own dark set) |
| Terminal (always dark, both themes) | `--term-bg #16161a`, `--term-green/blue/amber/pink` | same |

Deliberate production divergences from the prototype (do **not** "re-sync" these away):
`--text-3` corrected for contrast in both themes (light `#666672`, dark `#9a9aa5` — the
prototype had them inverted), `--nav-h: 64px` (was 60), `.sr-only` utility added.

Accent usage: primary buttons, active pills/tabs, selected borders/rings, step indicators,
links on hover, focus rings, rating highlights. The accent is never a background wash, never
decorative.

### 4.2 Typography

- **Sans** (`--font-sans`: SF Pro/Inter/system stack) for all UI and headings. Headings are
  weight 650, letter-spacing −0.02em. Body 15px / 1.6.
- **Mono** (`--font-mono`: JetBrains Mono stack, tabular numerals) for anything machine-ish:
  model IDs (`provider/model` — provider prefix dimmed, model name emphasized), scores, Elo/
  rating numbers, move counts, W/L/D strings, variant tokens (`board_9x9`), code, counts.
- **Eyebrow pattern** (`.eyebrow`): 11.5px mono, 0.12em letter-spacing, uppercase, `--text-3` —
  used for section kickers (`50 ARENAS`), numbered step labels (`1 · CHOOSE A GAME`), and
  table column headers.
- Sentence case everywhere — headings, buttons, labels. All-caps only in the eyebrow pattern.

### 4.3 Layout & spacing

- Content max-width `--maxw: 1240px` via `.wrap` (28px side padding; 18px under 720px).
- Header height `--nav-h: 64px`; filter bars `--filter-h: 56px`.
- Section rhythm is generous; game grids are **5-up** (50 games = clean 10×5), collapsing
  5→4→3→2 by breakpoint. Leaderboard tables drop columns at 1080/760px; Battlefield stacks at
  980px; Arena stacks at 920px; footer collapses 4→2→1.

### 4.4 Radii, borders, elevation

- Radii tokens `--r-xs 5 / -sm 7 / -md 10 / -lg 14 / -xl 20 / -pill 999`. Cards typically
  `--r-lg`; buttons/inputs `--r-md`; chips `--r-pill`.
- Hairline 1px borders (`--border`) define structure; `--border-strong` for emphasis/hover.
- Shadows are whispers (`--shadow-sm/md/lg/pop`) — elevation for popovers/modals, hover lift
  on interactive cards. No heavy drop shadows.

### 4.5 Iconography

Outline icons of consistent stroke weight (the shared `Icon` set in
`components/platform-ui.tsx`). Game glyphs live in rounded-square icon tiles — accent-tinted
on rest, solid accent with white glyph when selected. No emoji in product UI.

### 4.6 Motion

- Purposeful and quick: hover lifts (`translateY(-1px)` + border/shadow shift), 0.15–0.25s
  eases; theme cross-fade 0.22s; shared keyframes `fadeUp`, `fadeIn`, `popIn`, `pulse`, `spin`.
- Signature motion: animated game previews (Arena stage), piece/disc placement animations,
  replay scrubbing, the Grand Slams marquee shimmer, result-card pop.
- **Every animation respects `prefers-reduced-motion`** — disable and show the end state.
- Motion must never gate data: a table renders instantly; its sparkline may animate in.

### 4.7 Boards

Boards are calm instruments: large rounded-square cells one step lighter than the card
surface, hairline borders, generous gaps, faint desaturated-accent dots as empty-cell
affordances. Board colors come only from the `--board-*` / `--stone-*` tokens. The last move
is highlighted; no glow effects.

---

## 5. Naming & vocabulary (locked lexicon)

The live site currently uses four names for one thing and three for another (§13). These are
the locked terms; public copy must use them and nothing else:

| Term | Meaning | Rules |
|---|---|---|
| **Game** | Player-facing catalogue entry (Chess, Go…). | The public word. "Arena" as a synonym for a game is engine jargon — avoid in copy; "50 games" not "50 arenas". |
| **Arena** | The human-vs-model play surface at `/arena`. | Capital A, singular, product surface only. |
| **Match** | One recorded contest (model-vs-model official/battlefield runs, or a completed human Arena session). | The unit of history. "Battle" is retired — never use it. |
| **Replay** | The turn-by-turn playback of a match. | A match *has* a replay; a replay is not a separate content type in copy. |
| **Battlefield** | The model-vs-model viewing surface at `/battlefield` (live + recent matches). | Capital B, the surface — not the matches themselves ("Latest matches", not "Latest battles"). |
| **Grand Slams** | The seasonal knockout tournament. | Always plural with capital G/S; date chip style "DEC '26". |
| **Official** | Data from signed, locked, verified eval runs. | "Official" is a data product, strictly separate from human Arena results. Never blend them in one table, chart, or count. |
| **Official Score** | Public rating: Bayesian posterior mean, 0–1000. | See §8. The word "Elo" must not appear in public UI. |
| **Artifact** | Signed `.eslams` proof package behind every official score. | Keep the `.eslams` framing; artifacts link from scores. |
| **Trinity** | The private operations console at `trinity.eslams.com`. | Never referenced in public product copy except the developer-access flow. Own admin chrome (§6.3). |
| **Snapshot** | A published leaderboard computation. | Freshness copy: "Updated 14m ago". The internal word "sweep" is retired from public UI. |
| **Levels** | Every game has exactly three scenario levels: Beginner / Intermediate / Advanced. | Never show a single per-game "difficulty" — that was a v3 bug fixed in v4. |
| **Variant** | The per-game ruleset token (`standard`, `board_9x9`, `core_hit_stand_s17`). | Rendered in mono; it is the honest distinguishing attribute on game tiles. |

**Category taxonomy** (exactly these four, these counts): **Board & Strategy 16 · Card &
Hidden-Info 17 · Social & Economic 5 · Control & Arcade 12 = 50.** Any other grouping
("Board, Card, Strategy, RL") is wrong.

**Model status vocabulary** (player-facing, from the Arena recommendations): `Ready`,
`Slower turns`, `Not available for this game`, `Coming soon`. Retire infra wording: "Gateway
ready", "Requestable", "catalog rows", "Verified playable", "Battlefield-ready", "Untested".
Never call a model "best" unless the ranking source is visible and current.

**Model IDs**: always mono `provider/model-name`, provider prefix dimmed. Human-facing
display names are title-cased properly ("Claude Opus 4.5", not "Claude Opus 4 5" — never
strip separators into spaces).

---

## 6. Information architecture

### 6.1 Header (public chrome)

Left → right: **logo** (mark + wordmark) · left-aligned nav **Leaderboard · Battlefield ·
Arena** (active = accent underline) · **search** ("Search models & games", `/` shortcut,
OpenRouter-style) · GitHub **icon only** (no star count) · **theme toggle** · **Grand Slams
marquee box** (gold trophy + "DEC '26" pill + subtle shimmer) · avatar (signed-in) or Sign in.

Games, Models, and Docs are reachable via search, footer, and in-page links — they are
catalog/reference surfaces, not primary nav. Mobile menu includes Sign in.

### 6.2 Footer

Four columns — **Platform** (Leaderboard, Battlefield, Arena, Grand Slams) · **Developers**
(Get started, Open-source engine, Build an agent, Replay file guide) · **Account** (Sign in,
Create account, Your profile, API keys) · **Community** (GitHub, Contributing, Issues,
hello@eslams.com) — plus the legal row (MIT, Terms, Privacy, Report abuse, Security contact).

### 6.3 Route map

Public product: `/` · `/leaderboard` · `/battlefield` · `/arena` (+ `/arena/play`) ·
`/grand-slams` · `/games` + `/games/<slug>` · `/models` + `/models/<provider>` +
`/models/<provider>/<model>` · `/providers/<provider>` · `/matches/<id>` · `/replays/<id>` ·
`/artifacts/<id>` · `/videos/<id>` · `/<username>` (+ `/<username>/<artifact>`) · `/profile` ·
`/settings/api-keys` · `/onboarding` · `/login` · `/signup` · `/docs` · legal pages.

Model/Provider/Game pages are **data-driven templates**, not hand-built pages — every model,
provider, and game resolves to a populated page; unknown IDs render a clean not-found state.

**Trinity** (`trinity.eslams.com`, 24+ pages) uses **private admin chrome — never the public
header**. It is currently undesigned (ad-hoc styles); it must still obey tokens, type, and
spacing (§14 backlog). Role-gated navigation per the five Trinity roles.

---

## 7. Page anatomies

Terse, top-to-bottom. The v4 prototype (`redesign/eSlams v4.html`) is the visual reference
for each; §13 tracks where live diverges.

**Home** — Hero: "Here, AI plays games." + "50 games. 70 model providers. One leaderboard." +
primary **Play Against AI** / secondary **Explore Leaderboard**; trust line "No signup to
watch." → "Watch now" rotating board preview (Chess, Connect Four, Othello, Tic-Tac-Toe;
different opponents per game; progress dots; no "live" claim unless truly live) → **Reigning
champions** (best model per marquee game — must exactly match each game page's #1, see §8) →
Play band ("Think you can beat a frontier model?") → leaderboard top-10 preview → Latest
matches → top models by category → **all 50 games** (5-up `.gtile` grid, variant tokens,
category tabs) → **all providers** tiered (Frontier / Major / Enterprise / Research &
regional) → stats band → open-source band (terminal mock: `pip install eslams` → run → replay
ready) → footer.

**Leaderboard** — descriptor + meta row (models ranked · games · providers · snapshot
freshness) + methodology line (§8, verbatim) → filter/scope bar (category, game, level —
client-side URL state) → dense sortable table: Rank (medals top-3) · Model · Official Score ·
Confidence · Win/Reward · Robustness · Cases · Coverage · Proof · Trend sparkline. Row click
1 = inline expand (per-game breakdown grid, 5-up, each cell links to the game page; stat
toggle Win rate/Rating/Rank; p05–p95 band, category strengths, pairwise vs adjacent, "Full
model page →"). Row click 2 (or the button) = navigate to the model page. Must SSR a real
table — never a client-only placeholder.

**Battlefield** — header + prominent top-right **Request a match** button (modal) → type
cards (Solo benchmark / 1v1 / Table) → status tabs (Live n / Recent n / Scheduled n — a
surface with 0 live shows no "live" framing) → filterable match list (game, models, outcome,
age) → featured match viewer: animated scrubbable replay, eval/advantage bar, move history,
match metadata, open replay/match links.

**Arena — setup** ("the consumer heart"; one screen, no wizard): top-left **matchup hero** —
game name/variant, large **animated game preview** (per-category animations: pieces glide,
discs fall, stones place, cards fan, dice tumble, payoff matrix pulses, lander descends),
**YOU vs MODEL** row that updates live; top-right **opponent box** — vertical model wheel
(centered = selected, "All N models" → see-all modal with search + tier segments), **Start
game**, readiness line; bottom — **Select your arena**: count chip + category tabs over the
5-up `.gtile` grid, selected tile gets Active badge + accent ring. The default roster is
recommendation-led (Best first opponent + `Fast / Strong / Balanced / Newest` chips); the
launch set is the 13 human-legible games, a "Play now" rail of 6–8, everything else behind
Browse; control/RL tasks are not Arena content. No difficulty step (levels live on
game/leaderboard pages).

**Arena — play**: combatant bar (Exit · YOU vs model + rating · game · move counter ·
model chess clock "thinking 0:14 · usually ~9s") over a generous centered board. Board stays
alive during `model_thinking` (history, last-move highlight, premove queued). Move lands the
instant it parses; the model's 1–2 sentence explanation streams in *after* the move as the
centerpiece. Escalation at 30/60s; hard cap offers "claim the win on timeout". Arrival cue
(sound + animation) on the model's move. Optional "Understand this game" popover (Objective /
Your turn / Legal actions / Hidden info / Scoring / First-move tip — optional, never forced).
Legal actions rendered in natural language; raw tokens behind a developer disclosure.

**Arena — result**: scoreline card — outcome icon + "You won / You lost / Draw", YOU vs model
chip line, meta (game, opponent rating, "saved to your profile"), **Play again / New match**.

**Grand Slams** — dramatic hero + live countdown (proper unit markup) + notify form → 3-stage
format explainer (Stage 01 group calibration across all 50 games · Stage 02 category
knockouts using the four real category names, best-of-seven · Stage 03 cross-discipline
final) → eight seeded contenders (#1 in gold; properly formatted display names; honest
"verified entry pending" chips) → championship bracket → stats strip (50 games · 70+
providers · 1 champion).

**Games index** — stats strip (50 games / how many Arena-playable / benchmark / 1v1 / table)
→ category tabs + surface filters → 5-up `.gtile` grid: centered icon, 2-line-clamped name,
**variant token in mono**. Tiles never show a single difficulty or a "top model".

**Game page** — hero (icon, category, variant, players, "3 scenario levels · Beginner ·
Intermediate · Advanced") + Play / Watch CTAs → **Arena leader** strip (links to model page)
→ How it works / Scoring & outcomes / Artifacts & replays (with `eslams replay …` terminal) →
example replay (live board playback) → full per-game leaderboard with level tabs (All /
Beginner / Intermediate / Advanced).

**Models index** — one consistent status vocabulary (§5), curated default view (ranked models
first; the long tail behind "Show more"), provider map with tier cards. Counts must agree
with every other surface (§8).

**Model page** — breadcrumb (Models › Provider › Model) + identity badge + rank medal → stat
tiles (Official Score · Rank Score · Win rate · Cases) with credible interval → overview (win
rate by category, score trend sparkline, strongest games) → featured replays (tabbed,
scrubbable; wired to real artifacts) → per-game table (all 50, filterable, sortable, rows
link to game pages).

**Provider page** — tier badge, best model / top rank / avg win rate / total cases, card grid
of the provider's models (score, win rate, trend).

**Profile** — public/private visibility toggle (header + settings) → overview strip (win-rate
by game bars, recent-form W/L/D chips, favorite game) → game history where **every row opens
a visual replay modal** with scrubber → artifacts with per-item public/private toggle + share
link → settings (account, API key reveal/rotate, notifications, appearance).

**Auth** — split-screen: brand panel + form. SSO first (GitHub, Google), then email with
inline validation. Signup: username (shown as `eslams.com/username`), email, optional
name/photo (auto-pulled from SSO). Header stays, footer hidden. Success state links to the
profile.

**Matches / Replays / Artifacts / Videos detail pages** — same chrome and tokens as the rest
of the product; replay player loads via manifest + lazy chunks (scrub-on-demand), completed
matches get auto-generated OG board-state images so every shared link is a growth asset.

**Docs** — real developer documentation in the product chrome: endpoints, schemas, code
samples, replay file guide. Gate keys behind Trinity, not the documentation itself.

**Empty / loading / error states** — every surface has designed states: skeletons that
mirror the real layout (`loading.tsx` per route), graceful filtered-to-zero empties (icon
tile + bold title + grey copy — the canonical empty-state card), and never a dead-end error.

---

## 8. Data display rules

These rules come from the Bayesian leaderboard plan and are product law:

1. **Rank conservatively.** Public rank uses the posterior lower bound (`posterior_p10`),
   never the mean. Display **Official Score** (posterior mean, 0–1000) as the headline
   number; **Rank Score** (the conservative bound) in expanded details.
2. **Uncertainty is a first-class column.** Show a compact credible-interval band
   ("80% credible interval") in the top table; p05/p10/p50/p90/p95 in the expanded row.
   Close results show uncertainty instead of fake ordinal precision. An unlabeled interval
   (e.g. "0.108–0.461") is worse than none.
3. **Two scores, clearly separated.** Official Score (public) vs Mean Reward (transparent
   debug metric). Never mix them; never show a rank order that contradicts the visible score
   without labeling which metric ranks.
4. **Coverage gates, not hidden penalties.** Missing required category coverage ⇒ unranked
   overall (may appear in eligible category scopes) with an explicit note. Sparse scopes
   (per-game, per-level) are hidden until minimum cases are met — no half-empty tables.
5. **Scopes are real pages** — `overall`, `category:<slug>`, `game:<slug>`,
   `level:<key>` — server-backed, URL-addressable, SEO-visible. Filter changes update the URL.
6. **Methodology is visible UI copy.** Top-of-page short form, verbatim: *"Ranked by
   conservative Bayesian skill, backed by signed official artifacts."* Plus a methodology
   version tag ("Bayesian hierarchical v1") and the snapshot timestamp ("Updated 14m ago").
7. **Robustness is visible.** Illegal actions, timeouts, invalid runs surface as a
   robustness summary column — models don't silently lose points.
8. **Every official number links to proof.** Score → artifact → replay. If proof isn't
   published yet, the number doesn't ship.
9. **One source of truth for totals and champions.** Home champions must equal each game
   page's #1; headline counts (games played, models ranked, providers) must match across
   home, models, and leaderboard. A mismatch is a P0 credibility bug.
10. **No Elo.** Not as the system, not as the label.
11. **Pairwise honesty** (expanded rows / compare cards): "P(model A beats model B) = 71%",
    expected gap in score points.
12. **Official vs human separation** everywhere: human Arena results never touch official
    tables, counts, or champion logic; Arena publishes its own clearly-labeled human-vs-model
    board.

---

## 9. Liveness & latency UX

- All live state is **WebSocket-pushed** (Durable Object rooms) with sequence/resume;
  polling is a fallback only. The UI reacts to intent events (`model_thinking`,
  `model.move.applied`, `model.explanation.delta`) — it never infers state from poll timing.
- **The thinking indicator is real** — driven by stream heartbeats. A visible chess clock on
  the model's side ("thinking 0:14") plus a rolling telemetry median ("usually moves in ~9s").
- **Move first, explanation second.** Apply the move the instant the action parses; stream
  the short explanation afterwards as content. Dead air becomes the show.
- **Premove:** the human can queue their next move while the model animates/streams.
- **Escalate, never dead-end.** 30s: "taking longer than usual". 60s: options appear. Hard
  cap: "claim the win on timeout" — the failure becomes a satisfying human outcome. The
  legacy "refresh this game" dead end is forbidden; the hard-dead-end target is **zero**.
- **Arrival cues:** subtle sound + piece animation on the model's move, so tabbing away is
  safe.
- **Tempo shelves:** a labeled "Blitz" lane (lighter, faster models) beside the flagship
  lane ("deep thinker, slower") — users self-select tempo; nobody's reasoning is capped or
  silently downgraded.

---

## 10. Accessibility standards

- Global focus ring (`:focus-visible`, 2px accent) on **everything** — no component may
  suppress it (the header search currently does; that's a bug).
- Modals: focus trap, `Esc` to close, focus returns to the invoker.
- Boards are keyboard-playable; the model wheel is arrow-key navigable.
- Tables: proper header/scope semantics, `aria-sort` on sortable columns; the bracket and
  steppers get descriptive ARIA.
- Contrast: WCAG AA minimum in both themes — muted status chips and `--text-3` on tinted
  surfaces are the known risk areas; check both themes on every new component.
- `prefers-reduced-motion` honored by every animation (§4.6); live regions announce move
  arrivals politely.
- `.sr-only` (defined in tokens.css) for icon-only buttons — every icon button has a label.

---

## 11. Performance budgets (design constraints)

CI-enforced first-load JS budgets (gzipped): `/` 180KB · `/leaderboard`, `/models`, `/games`
220KB · `/arena` 350KB · `/replays/:id` 300KB. Home must not load Arena code; Leaderboard
must not load the replay player.

- **ISR-first**: public pages are cache-served shells (home/games/models 1h, leaderboard
  2min, profiles 10min, completed matches immutable) with client islands for interactivity.
  Reading `searchParams` server-side silently kills ISR — filter state is client-side URL
  state.
- Targets: cached TTFB p50 <150ms · Arena move propagation <150ms p95 · replay first usable
  frame <1s p95 · LCP on mobile hardware, not desktop.
- **Images:** logos as SVG or ≤10KB WebP; one theme-aware preload; Cloudflare image
  transforms on; proper favicon sizes. The current 651KB of PNGs on every page is the
  benchmark of what not to do.
- **Loading states:** every route ships a `loading.tsx` skeleton that mirrors the real
  layout; below-the-fold sections and video players lazy-load (poster + click-to-load).
- Replays stream via manifest + ranged chunks; never load the full event stream up front.
- Serve stale, refresh live: visible snapshot timestamps make cached data honest.

---

## 12. Voice & copy

- **Player language, not infrastructure language.** `Ready`, not `Gateway ready`. "50 games",
  not "catalog rows". Translate legal-action tokens into natural language; raw tokens behind
  a developer disclosure.
- Confident, plain, a little playful in consumer surfaces ("Think you can beat a frontier
  model?"); precise and unhedged in data surfaces. Sentence case; em-dashes welcome; no
  exclamation-mark pileups.
- **Honesty rules:** "No signup to watch." (watching is free; playing needs an account — never
  claim otherwise). No "live" over stale data. Unverified = "Coming soon" / "verified entry
  pending", with page structure preserved. Hints are "clearly labeled as a hint, not model
  advice." Latency expectations come from telemetry, not marketing.
- Approved verbatim lines: *"Here, AI plays games."* · *"50 games. 70 model providers. One
  leaderboard."* · *"No signup to watch."* · *"Think you can beat a frontier model?"* ·
  *"Ranked by conservative Bayesian skill, backed by signed official artifacts."* ·
  *"Play a frontier model, head-to-head. Pick a game, choose your opponent, and go."*
- Model display names are formatted properly (dots and hyphens intact); timestamps are
  relative for recency ("10d ago") with absolute on hover.

---

## 13. Current state & prioritized gaps (July 2026 audit)

The live site is a structurally complete v2–v3 with v4 partially ported. Routes, slugs,
OAuth, replay/match URL schemes, and the model catalog are in place. The gaps, prioritized:

**P0 — credibility (data & rendering)**
1. `/leaderboard` and `/games/<slug>` ship as client-only "Preparing…" placeholders — the
   primary hero CTA lands on the emptiest page. SSR real tables + skeletons.
2. Rank order contradicts displayed scores on every ranking surface (rank 1 = 221 pts, rank
   2 = 254) with no metric labeling — implement §8 (conservative rank + labeled scores + CI).
3. Headline totals disagree (~290k vs 542,339 official games). One snapshot, one number.
4. Champion logic vs per-game data: the #1 model shows 0.0% in games other models "champion"
   at 100%; Hex champion shows score 0 / N/A. Unify on one source (§8.9).
5. Leaked internals: mangled model id "agent/seat-banthropric/…" in a public filter; garbled
   "OPANGDDEA…" / "OGCAXDMR" strips; malformed "openai/chat-latest"; countdown unit soup.
6. "Live"/"Watch live" framing over 0-live, 10-day-old data (§12 honesty).

**P1 — the v4 experience gap**
7. Arena is a settings form, not a stage: no matchup hero, no animated previews, no model
   wheel, all-OpenAI roster including gpt-3.5-turbo (off-brand next to "frontier"), unicode
   text board. Port the Arena rebuild (`redesign/DESIGN_NOTES_arena.md`); curate the roster
   (§7 Arena) and the 13-game launch set.
8. In-match UX: implement §9 (streamed explanation, chess clock, premove, escalation,
   no dead ends). The prototype's `.ar-play-*` / `.ar-result-*` in-match system was never
   ported — production re-implemented a plainer version.
9. Vocabulary normalization per §5 (battles/matches/replays; games/arenas/surfaces; status
   babel; Grand Slams' wrong category names; seed-name formatting).
10. Split-screen auth (logic is done; layout isn't). Grand Slams countdown/bracket polish.
11. Games/Models discoverability (search + footer links exist in prototype header pattern).

**P2 — completion**
12. Undesigned surfaces brought in-system: Trinity admin chrome (own header, tokens
    respected), `/docs` (real content), matches/replays/artifacts/videos detail polish,
    onboarding, settings, legal.
13. OG board-state images per match; public status page; site search over matches/models/
    games; replay lazy-loading; image pipeline fixes (§11).
14. Code health that protects design consistency: split the 7,778-line `platform-pages.tsx`
    god-file; reconcile the dual primitive systems (`platform-ui` vs `static-public-ui`);
    migrate ad-hoc inline spacing to tokens; fix the suppressed search focus ring; single
    `.sr-only` definition.

---

## 14. Governance

- **Changing tokens:** edit `apps/web/styles/tokens.css` only, both themes at once, and
  record the rationale in this brief (§4.1) — undocumented drift is how the prototype's
  contrast bug nearly returned.
- **New UI work:** load the `eslams-design` skill (`.claude/skills/eslams-design/`) — it
  encodes the working rules (CSS placement, class namespacing, primitive reuse, page
  scaffolding, budgets, a11y checklist) and points back here for intent.
- **PRs with UI changes require screenshots** (both themes for new components) per
  CONTRIBUTING.md; visual e2e (`e2e/visual-major-pages.spec.ts`) guards the major pages.
- **Prototype:** `redesign/eSlams v4.html` stays runnable as the interactive reference.
  It is not a source of copy-paste code — production patterns (server components, client
  islands, Static* primitives) always win on architecture.
- This brief supersedes scattered guidance in older root-level docs where they conflict.
