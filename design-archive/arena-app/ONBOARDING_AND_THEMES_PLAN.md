# Plan: one-screen onboarding (platform-wide) and six themes (app)

**Owner:** Ramu. **Planner:** this session. **Executors:** Opus and Sonnet agents. **Date:** 2026-10-01.
**Status:** draft; the platform change inventory and the theme port research are being gathered and will be folded in.

---

## 1. What Ramu asked for

1. Bring the six eSlams themes back into the Arena app design (Classic Light, Classic Dark, Neon, Club, Arcade, Midnight).
2. Collapse onboarding: authenticate with Google, GitHub, Apple or email, then ONE screen: pick a username and choose Public or Private, done. Account created. Profile details are edited later.
3. An email flow nudges incomplete profiles up to five times over the next 45 days.
4. Apply the onboarding collapse platform-wide through a PR on the platform repo (the PR does not mention the app).
5. Redo the app design (brief and prototype) for both changes.
6. Think from first principles about making onboarding even faster.

## 2. First principles: what must an account have at birth?

Only three things, and two of them can be inferred:

| Need | Why | Can we infer it? |
|---|---|---|
| Identity | Who is signing in | Yes, the provider gives it (or email + credential). |
| A unique public handle | Match records and replays are published under a handle; the URL is `eslams.com/<handle>` | Mostly: GitHub login, Google given name, or the email local part, slugified, with a numeric suffix on collision. Apple may hide name and email (private relay), so a generated `player-7f3a` style handle is the floor. |
| Profile visibility | Decides who sees the match history | Yes: the platform already defaults Public for public profiles; one tap flips it. |

Everything else (display name, bio, location, website, avatar, two-factor) is enrichment and belongs in Settings, prompted later by email.

### 2.1 The flow we ship (Option A, recommended)

**Auth → one card → playing.** After any provider or email succeeds, one card appears over the table the player was setting up:

- Title `You're almost in.`
- A username field **prefilled** with the best inferred handle, live availability check, mono `eslams.com/<handle>` preview beneath. Editable, but the common case is to accept it.
- A two-chip visibility control, **Public preselected**, one tap to Private, with the platform's exact descriptions (`Anyone can view it` / `Approved followers only`) and a line `Change this any time in Settings.`
- One button: `Create account`. Then the match starts.

Typical cost: one tap, zero keystrokes, under three seconds. Returning players never see it. This is Ramu's one screen, made prefilled so it is usually a confirmation rather than a form.

### 2.2 The faster variant (Option B, offered, not default)

**Auth → playing, claim the handle later.** Create the account immediately with the generated handle and the Public default, start the match, and show the handle and visibility inline on the first result card (which already carries the visibility control) as `You played as @player-7f3a. Claim a better handle?` plus in Settings. Zero screens before the first move.

Trade-offs: the first replay publishes under a handle the player never chose; some players will not notice the Public default until later; the email nudges carry more weight. Mitigation if chosen: make visibility Private until the handle is claimed. Recommendation: ship A now, keep B as a flag to test later; the API shape below supports both.

### 2.3 Two more speed-ups worth taking (platform, separate PRs)

- **Passwordless email at signup.** Today the email path asks for a 12-character password plus a Turnstile check. Better Auth has an email one-time-code plugin: email → six-digit code → in. A password becomes an optional Settings item. This removes the slowest field in the whole flow. Separate PR, needs the email sender verified.
- **Return-to-intent everywhere.** The web already remembers the Arena setup across the login redirect; make the same true for every entry point (a shared replay link, a game page), so sign-in never lands on a bare profile page.

## 3. The email nudge (platform)

- **Trigger:** account created with an incomplete profile (no display name and no avatar, or no bio).
- **Cadence:** five sends at most, at day 1, day 3, day 7, day 21 and day 45 after signup. Stop on: profile completed, user unsubscribed from account emails, account deactivated or deleted.
- **Content:** one short message per step, each with a different reason to come back (claim your handle, add a photo so opponents see you, your record so far, you have N matches unreviewed, last reminder), one button to Settings, one-click unsubscribe. Sentence case, no exclamation marks, the brief's voice.
- **Compliance note:** reminders about completing your own account are service messages, but five of them over 45 days approaches marketing cadence under UK PECR. Include a one-click unsubscribe, honour it immediately, and get Legal to confirm the cadence and copy before it goes live. (Flagged, not decided here.)
- **Mechanics:** depends on the infrastructure inventory (section 7). Smallest shape: a `profilenudges` table (userId, step, scheduledAt, sentAt, stoppedReason), a scheduled Worker job that selects due rows and sends through the existing email sender, and five templates. Never delete rows; stopped rows keep their reason.

## 4. Platform PRs (repo: ElectronicSlams/eSlamsPlatform)

The repo's rules apply: focused branches, React Doctor-only hosted CI, no approver machinery, never delete data, screenshots for UI changes, no mention of the mobile app in the onboarding PR.

**PR 1: one-screen onboarding.**
- `apps/web/components/onboarding-form.tsx` and `apps/web/app/onboarding/page.tsx`: three steps become one screen (prefilled username, visibility, Create account). Remove the profile-details step and the review step; keep validation and the reserved-word rules.
- Prefill: derive a handle from the signed-in identity (provider login or name, else email local part), slugify to the username rules, check availability, suffix on collision.
- API: the onboarding endpoint accepts `{ username, visibility }` with every profile field optional; stays backward compatible for existing clients.
- Copy: `You're almost in.` / `Pick your handle` / `Who can see your profile?` / `Create account` / `Change this any time in Settings.`
- Tests: update the onboarding unit and e2e specs; smoke script; React Doctor clean.
- Docs: update the onboarding implementation note; keep `docs/changes-to-do-now.md` consistent.

**PR 2: profile-completion nudges.** The table, the scheduled job, the five templates, the unsubscribe hook, and a Trinity read-only view of send counts. Depends on the inventory in section 7.

**PR 3 (optional): passwordless email sign-up.**

## 5. App design changes

**Brief (`ARENA_APP_DESIGN_BRIEF.md`):**
- §0 decision 5 and §6.1: six themes ship. Classic Light and Classic Dark follow the OS; Neon, Club, Arcade and Midnight are fixed skins chosen in Settings. No first-run theme screen (the ledger lesson stands). Themes are materials, not palette swaps: board surface, ink treatment, card face and back, glow budget (accent-only, Neon and Arcade only), move trail (Arcade). The in-app mark re-tints to each theme's ink; the splash and the app icon stay brand blue. Themed alternate app icons return as an Appearance option.
- §7.5 and Appendix E: the sign-in sheet ends with the one card from section 2.1 (prefilled handle, visibility, Create account), then the match. Remove the three-step onboarding. Mention Option B as a flagged variant.
- §7.10 Settings: Appearance becomes the six-tile theme grid with live mini boards, a Follow system row for the Classic pair, and the app icon choice.
- §3 ledger row 4: reword. The mistake was the first-run theme screen and the test matrix it forced, not the themes themselves.
- §4 decisions ledger: update Themes and Auth rows; add the onboarding decision; keep the rest.
- §12 handoff: add the Appearance screen, the six theme states for Home, Table sheet, Stage and Result, and the one onboarding card.

**Prototype:**
- `tokens.css`: add the four theme blocks (from `prototype/research/six-themes.css`), `--glow`, `--theme-plane`, card material tokens, `--mark-ink`.
- Renderers: consume `--theme-plane`, card material tokens and `--glow` on accent-carrying roles only (last move, active seat, result sweep); Arcade move trail.
- App: Settings → Appearance with the six-tile grid and Follow system; theme persistence; the mark re-tints in the Home header per theme; the sign-in sheet collapses to auth → one card → match; a one-time `Try a theme` row on the result curtain after the first completed match.
- Canvas: the Controls panel offers all six themes; the share card panel renders in the current theme.

## 6. Execution assignments

| Step | Agent | Depends on |
|---|---|---|
| Platform change inventory (onboarding, email infra) | Sonnet, research | none (running) |
| Six-theme port package (`prototype/research/`) | Sonnet, research | none (running) |
| Prototype integration and flow fixes | Opus (integrator F) | none (running) |
| PR 1 implementation on a fresh branch off the latest `origin/main`, with tests and screenshots | Opus | inventory |
| PR 2 nudges | Opus | inventory; Ramu's go on cadence |
| Brief revision for themes and onboarding | Opus | theme research |
| Prototype: six themes + collapsed onboarding + Appearance screen | Opus | integrator F done, theme research |
| Final QA pass on the prototype, both flows, six themes, reduced motion; rebuild single file | Sonnet | prototype changes |

## 7. Inventory findings

### 7.1 Repository state (verified 2026-10-01)
- Local clone was at `8dd06c12` (2 Aug). Remote `main` is `87b4b0be` (18 Aug), 39 commits ahead; fetched locally over HTTPS into `origin/main`. The PR branch must start from `origin/main`.
- Commit `87b4b0be` **removed the Apple sign-in surface from the web** (login and signup pages, the Apple Better Auth package, custody and unlink code). Consequence for the app: Apple is no longer "configured on the web". Adding it for iOS (App Store rule 4.8) means re-adding a provider to Better Auth, which is a product decision for Ramu, not an assumption the design can make. The brief's decision 2 must say so.
- Nine draft PRs are open from `cursor/*` branches (leaderboard sunset, D1 retirement, CI expansion, Grand Slams copy). None touches the onboarding files; PR 287 touches `workers/api/src/http/auth.ts` and `docs/auth-security-operations.md` only. The onboarding PR stays clear of them.
- The working tree carries untracked design docs under `docs/` and a `.scratch-dump/` folder; the PR branch must be created clean (`git stash -u` is not acceptable because it hides files; use a worktree or add only the intended paths).
- GitHub access: `gh` has two accounts; the active one is the Allica account, which cannot see the private ElectronicSlams repos. Use the `makriman` token without switching the global account: `T=$(gh auth token --user makriman)`, then `GH_TOKEN="$T" gh ...` for API and PR creation, and for git over HTTPS a credential helper that returns `username=x-access-token` and `password=$T` (never echo the token). SSH is blocked from this sandbox.

### 7.2 Onboarding and email infrastructure (from the code inventory against origin/main 87b4b0be)

**Facts that shape PR 1 (one-screen onboarding):**
- The mobile app surface was deleted from the repo on 16 Aug (`8b88fde0`, tag `archive/mobile-2026-08`). The new Arena app is clean-sheet; nothing in the repo depends on the old mobile onboarding gate.
- The web onboarding is `apps/web/app/onboarding/page.tsx` (server, prefill via `suggestUsername(email, name)`: slugified name else email local part, no fallback, no suffix on collision) and `apps/web/components/onboarding-form.tsx` (client, 3 steps, visibility default Public, posts `{username, displayName, bio, location, websiteUrl, visibility}` to `POST /api/account/onboarding`).
- **The API already accepts `{username, visibility}` with every profile field optional** (`apps/web/app/api/account/onboarding/route.ts`); the Worker twin (`workers/api/src/http/social-routes.ts`) accepts exactly those two fields. **No API, DB or Worker change is needed.** Optional hardening: the web route has no rate limit (`validateAccountActionOrigin` only).
- Prefill sources are only `user.name`, `user.email`, `user.image`. GitHub `login` is not persisted (Better Auth maps `name: profile.name || profile.login`). There is no username-availability endpoint (the plugin's is blocked); collisions surface as 409 `username_taken` on submit, so the one screen must handle 409 inline by suggesting `<handle>-<n>` and re-enabling the button.
- Username rules: 3 to 32 chars, `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, 32 reserved words (`packages/core-types/src/username.ts`). Server derives default match visibility: Public → `public`, Private → `followers`.
- The web already exempts Arena from onboarding: `/arena` and `/arena/play?intent=start` return straight to the match before a username exists (`apps/web/lib/auth-navigation.ts:7-19`, asserted in tests). Keep it; it is the platform half of Option B.
- Tests and scripts that pin the 3 steps and must change in the PR: `apps/web/tests/public-copy.test.ts:741-744` (requires "Step 1/2/3" and `onboarding-v2`), `apps/web/tests/onboarding-privacy-contract.test.ts` (Public default, `onb-visibility*` markup, CSS regexes), `scripts/smoke-auth-email-delivery.ts:1420-1463` (drives the three headings and asserts a bio set in step 2), `tests/unit/smoke-cli-and-cleanup.test.ts:291`, `tests/unit/auth-email-browser-smoke.test.ts:64-66`, `docs/auth-security-operations.md:205`. Signup copy at `apps/web/app/signup/page.tsx:42,60` ("Profile setup during onboarding", "Profiles become public only after onboarding chooses a username"). Styles in `apps/web/styles/pages4.css:436-472`.
- Repo rules: hosted CI is React Doctor only (must stay 100/100, run `pnpm react-doctor:ci`); local gate `pnpm lint typecheck test build`; PR needs what/why, verification, screenshots for UI; never touch `.github/workflows/`; `scripts/check-docs.sh` is brittle on docs edits. Branch prefixes in use: `fix/`, `feat`-style subjects. Work in a separate `git worktree` off `origin/main` and stage by explicit path: the local tree has 13 untracked docs and `docs/fix-checklist.md` collides with a tracked file on main.
- Settled defaults for PR 1: Public preselected (today's behaviour; the server still requires an explicit value); handle prefilled with name → email local part → `player-<4 hex>` fallback; 409 handled inline; profile details move to Settings (already fully editable there).

**Facts that shape PR 2 (profile-completion nudges):**
- Email goes through the Cloudflare `send_email` binding `EMAIL` from `noreply@eslams.com`; the reusable sender and error handling live in `workers/api/src/services/social-notifications.ts:591-600, 983-1007`. Non-security email is **opt-in by default** (product email off), and the only unsubscribe is a `List-Unsubscribe` header pointing at settings; there is no one-click route or token.
- Scheduling: `workers/api` has two crons (`17 3 * * *` auth retention, `*/1 * * * *` minute jobs); the job-kind CHECK constraints on `scheduledjobruns` are closed sets, so a new kind means a table rebuild. The campaign tables carry two-person approval and must not be used.
- There is **no profile-completion signal**; proxies: `users.avatarsource='uploaded'`, `profiles.bio IS NOT NULL`.
- Smallest honest shape: migration `0066_profile_completion_nudges.sql` (`profilenudges` table, append-only statuses active/completed/opted_out/exhausted), one new daily cron on `workers/api` with its own handler, a tokenised one-click unsubscribe route, five templates in the existing title/body/link shape, seeding by sweep (no signup hook). **Risk:** the production D1 recovery tooling hard-pins the 65-migration tree (`scripts/production-d1-0059-adapter.ts`, `production-d1-recovery-reuse.ts`, their tests, `scripts/deploy.sh`); adding 0066 requires updating those pins or sequencing after production is fully applied. Owner must confirm production D1 state.
- **Compliance flag:** a five-email nudge to every signup departs from the repo's opt-in default and needs Legal to confirm the UK PECR/GDPR position (service message vs direct marketing), the cadence and the copy before it goes live. PR 2 therefore ships as a DRAFT with that flag in the description.

### 7.3 Themes (from the port research in `prototype/research/`)

Package ready to apply: `six-themes.css` (Neon, Club, Arcade, Midnight blocks for `#phone[data-theme=..]` and `.es-theme[data-theme=..]`, with `--win-text/--loss-text/--draw-text`, `--theme-plane/-card-face/-card-back/-card-table`, `--glow`, `--mark-ink`, per-theme `color-scheme`, and the glow hooks), `theme-materials.md` (what each theme changes beyond colour plus the small JS snippets needed), `theme-picker-spec.md` (the Appearance screen), `v3-theme-decisions.md` (recovered v3 decisions with line numbers), `contrast-check.js`.

Contrast (`--text-3` on `--surface` / `--text` on `--bg`, AA 4.5): Classic Light 5.66 / 19.66 · Classic Dark 6.71 / 16.73 · Neon 4.79 / 17.21 · Club 5.27 / 12.87 · Arcade 5.94 / 18.24 · Midnight 4.60 / 14.93. All pass. Known thin spots: `--text-3` on `--surface-3` in Neon, Club, Midnight (4.2 to 4.3); `--win`/`--draw` used as text on light surfaces fail, so text uses the `-text` tokens.

Trap found and handled: tokens.css's `prefers-color-scheme: dark` rule also matches the four material themes and would beat a bare `#phone[data-theme="neon"]`; the package repeats the `:not()` chain so each theme wins. Zero regression on Classic Light/Dark (310 elements compute identically with and without the file).

**Decisions (settled here, reversible by Ramu):**
1. **Six themes ship.** Classic Light and Classic Dark follow the OS (`Follow system`); Neon, Club, Arcade and Midnight are fixed skins. Appearance in Settings is the six-tile grid with live mini boards. No first-run theme screen. One quiet `Try a theme` row on the result curtain after the first completed match, shown once.
2. **Mark re-tint.** Classic pair: the mark is never re-tinted (brand blue, as the production logos). The four material themes tint the in-app mark and the share-card mark to the theme ink, as v3 decided. Splash, app icon and store icon stay brand blue.
3. **Glow** is allowed only in Neon and Arcade, only on last move, active seat and the result sweep. Buttons and chrome stay flat everywhere. The brief's "no glow" rule gets exactly this exception.
4. **Gradients** appear only as board and card material planes (Club wood and felt, Neon glass), never on controls.
5. **No confetti** in any theme; the accent sweep stays the one celebration.
6. **No move trail** in v1 (v3 declared it but never rendered it, and it breaks the one-marker rule). Arcade keeps the phosphor plane and accent glow.
7. **Themed alternate app icons** return as an Appearance option; the store icon stays brand blue.
8. **Classic Dark `--text-on-accent` stays `#ffffff`** to match production web tokens (the mobile token package used `#0b0b0d`); noted, not changed.
9. Persistence: `themePref` in the existing localStorage record extended to the six ids plus `system`; `themeHintSeen` for the one-time row.

---

# Part 2 (2026-10-02): the first-run journey, end to end

Ramu's direction supersedes Part 1 where they differ: the app no longer opens on a browsing surface. **Welcome → Authentication → Profile setup (new users) → Theme pick (app, once) → Personalised home → Play.** Logging out returns to Welcome. Playing needs an account, so nothing is designed for the signed-out visitor beyond the welcome itself.

## 8. Product decisions (settled by the planner; Ramu can reverse any)

| # | Decision | Reasoning |
|---|---|---|
| 1 | **Welcome is the only signed-out screen.** Full-bleed, a real engine-recorded match playing behind a soft glass layer (rotating through games that read well at a glance: Connect Four, Chess, Go, Hex, Othello), the wordmark, `Here, AI plays games.`, one line with the live count (`Play frontier models at <N> games.`), primary `Get started`, secondary `I have an account`. Cold start and every logout land here. Reduced motion shows one still frame. | Communicates the product without a paragraph; the gameplay itself is the hero; two doors, no third. |
| 2 | **Auth is one step** with Google, GitHub, email (Apple on iOS when Ramu enables it). Existing users go straight to Home. New users go to Profile setup. | The web's own flow, not a redesign of identity. |
| 3 | **Profile setup is one page, not a wizard.** Required: handle (prefilled with a generated on-brand handle, shuffle button, live preview `eslams.com/<handle>`), visibility (Public preselected, one tap to Private). Optional, clearly labelled: bio (160 chars), location (type-ahead over a bundled place list, free text allowed), favourite games (selectable tiles from the live catalogue, any count). `Create account` is enabled as soon as handle and visibility are valid; leaving the optional fields empty is the skip. Phone: one scroll with the optional block below the fold. Tablet and desktop: two columns, identity left, favourites right. No gender, no website. | Required = what the product needs at birth; optional = what makes the first home personal; one page uses the space without adding steps. |
| 4 | **Generated handles are on-brand**: `<adjective>-<piece>-<number>` such as `quiet-rook-42`, `lucky-pawn-7`, `hex-hermit-13`, lowercase, hyphenated, 3 to 32 chars, never a reserved word. Shuffle regenerates; a taken handle regenerates automatically on 409 and says so. Shipped in the platform PR as a shared helper so web and app agree. | Zero typing in the common case, and the handle already sounds like eSlams. |
| 5 | **Theme pick is reinstated as a first-run screen in the app only**, once, after Profile setup: six tiles with real mini boards, `Follow system` preselected, one tap `Continue`. Afterwards Settings only. The ledger lesson is narrowed: never put a theme choice before authentication or in place of play; one tap after setup is fine. | Ramu's call; the themes are a signature and a one-tap pick after setup costs nothing. |
| 6 | **Home is personalised from favourites.** Hero = the first favourite game, with a recommended `Ready` opponent and `Play now`; then a `Your games` rail (the favourites); then `Choose an arena`. No favourites → Tic-Tac-Toe hero (or the catalogue's most played when that exists). The Resume card still outranks everything when a match is live. | Minimises time from setup to first move; nobody lands on a dashboard. |
| 7 | **One game-card system.** Every game anywhere is the same card: glyph tile, name, table label in mono, and a real mini board (end state for matches, a quiet loop for previews). Every match anywhere is the same match card: board poster, participants as provider marks and names, one status chip (`Your move`, `Thinking`, `Final 1–0`, `+60 chips`), relative time. Three actions, three looks: **Play** (accent fill), **Resume** (accent soft), **Watch** (outline, replay icon). Never a bare text link for a game action. | Removes the "collection of games behind a dashboard" feel. |
| 8 | **The opponent picker is a stage, not a dropdown.** A full sheet: a `Recommended` row of four large cards (provider mark, display name, speed, `plays this table`), filter chips (`Ready`, `Fast`, `Frontier labs`, `All`), search, then the roster grouped by provider with logos; each row shows speed and table coverage; the selected card is pinned to the top of the table sheet as `Your opponent`. For tables, the same picker assigns each seat. | The model is the other player; choosing it should feel like choosing an opponent. |
| 9 | **Web platform PR scope**: the one-page onboarding with the same fields, the handle generator, favourite games persisted, location type-ahead, and the post-onboarding redirect to Arena with the first favourite preselected. **Not in scope:** turning the signed-out web home into a welcome wall. The web home belongs to the Stadium brief; flag to Ramu whether the web should also become Welcome → Auth. | Keeps the PR focused and avoids colliding with the parallel site redesign; the decision is Ramu's. |
| 10 | **Location data**: a bundled, permissive-licence list of countries and major cities, lazy-loaded on the onboarding page only, free text always accepted; no external API, no PII sent anywhere. | Fast, private, offline-safe. |
| 11 | **Favourite games storage**: reuse an existing favourites table or API if the platform has one; otherwise one additive migration (`profilefavouritegames`), with the deploy-pin files updated in the same PR and called out in the PR body. Never delete data. | Smallest honest persistence. |

## 9. Execution assignments (v2)

| Step | Agent | Depends on |
|---|---|---|
| Finish prototype integration (eight flows green, no console errors); stop before any redesign | Opus (integrator F, resumed) | none |
| Platform PR: expand the one-card branch to the one-page onboarding (handle generator, visibility, bio, location type-ahead, favourite games, Arena redirect), tests, screenshots, PR | Opus (PR agent, resumed) | none |
| Brief revision for the journey (§0, §2, §3, §4, §7 new screens: Welcome, Auth, Profile setup, Theme pick, personalised Home; game-card and opponent-picker systems; §12 handoff) | Opus | this plan |
| Prototype: Welcome, Auth, Profile setup, Theme pick, personalised Home, logout → Welcome (new file `onboard.js` + `onboard.css`, minimal hooks in app.js) | Opus | integrator F done |
| Prototype: game-card and match-card system, opponent picker stage, Home rails (app.js, app.css, boards) | Opus | integrator F done; runs alongside the previous row with file ownership |
| Final QA: flows, six themes, reduced motion, desktop width, rebuild single file, screenshots | Sonnet | both prototype agents done |

## 10. Prototype build spec for the journey (for agents G and H)

Both agents work in `prototype/src/` after the integrator reports. File ownership is strict.

**Agent G owns:** new `src/onboard.js`, new `src/onboard.css`, and exactly these hooks in `src/app.js` (small Edits at clearly marked anchors, nothing else in that file): boot routing (signed out → Welcome; signed in without `profile.complete` → Profile setup; signed in and first run → Theme pick; else Home), the Sign out action (→ Welcome and clear session), and exposing `ESApp.profile` (handle, visibility, bio, location, favourites) to Home. G also adds the four material theme blocks from `prototype/research/six-themes.css` to `src/tokens.css` and the `.es-theme` canvas blocks, and the theme hooks from `theme-materials.md` to `src/boards-grid.css` / `src/boards-table.css` (glow on last move and active seat only, plane and card tokens).

G builds:
1. **Welcome** (`#phone` full-bleed): a real engine-recorded match playing behind a soft glass layer (`backdrop-filter`, hairline, `--surface` at 60 to 70 percent), rotating every ~14 s through connect-four, chess, go, hex, othello using `ESE.preview(slug, seed)` at stage size with the board centred and slightly scaled; the wordmark (polarity by theme), `Here, AI plays games.` (28/650), `Play frontier models at <N> games.` where N = `ESD.counts.phoneGames`, primary `Get started`, secondary text `I have an account`. Subtle parallax of the board on scroll or pointer move (≤ 6 px). Reduced motion: one still mid-game frame, no parallax. Returning after Sign out lands here. The old brand beat is folded into Welcome's first paint (mark settles, wordmark fades in, ≤ 0.9 s, skippable).
2. **Authentication**: the existing sign-in sheet's provider and email steps, retitled for the two doors (`Get started` opens Create account first; `I have an account` opens Sign in first), two-factor unchanged. Existing users (localStorage marks a completed profile) → Home. New users → Profile setup.
3. **Profile setup** (full screen, scroll): required block: handle field prefilled from `ESD.generateHandle(seed)` (G adds this helper to data.js? No: data.js is frozen; put the generator in onboard.js as `ESOnboard.generateHandle()` using game vocabulary), shuffle button, live `eslams.com/<handle>` preview, validation 3 to 32 lowercase/hyphen, a simulated taken-handle case (`taken` set in dev API) that regenerates with the line `That one is taken. Here is another.`; visibility chips (Public preselected) with the platform descriptions and `Change this any time in Settings.`; optional block labelled `Optional`: bio (160, counter), location (type-ahead over a bundled list of ~250 countries and major cities inside onboard.js, free text accepted, chips style), favourite games (2-column tile grid of all `ESD.gameOrder` games with glyph, name, table label, multi-select with accent ring and check; count from data); sticky `Create account` enabled once handle + visibility are valid; secondary text under it `You can add the rest later in Settings.` Phone-first; at ≥ 768 px canvas width (the desktop frame in the canvas) two columns.
4. **Theme pick** (app, once): six tiles (2 × 3) each with a real mini Connect Four board rendered in that theme via `ESB.render` at poster size inside a wrapper carrying `data-theme`, the name beneath, `Follow system` preselected as the first tile state, selection applies instantly to the phone, one button `Continue`. Stored as `themePref` and `themePicked: true`; never shown again; Appearance in Settings owns changes afterwards.
5. **Personalised Home hand-off**: G passes `profile.favourites` and sets `lastSetup` to the first favourite so H's Home shows it as the hero. If no favourites, `tic-tac-toe`.
6. **Dev API** additions on `ESApp.dev`: `resetFirstRun()`, `forceTaken(bool)`, `setFavourites([...])`, `openWelcome()`, `openSetup()`, `openThemePick()`.
7. Canvas: a second device frame is NOT required; instead add a `Desktop` toggle in Controls that widens `#phone` to 1024 × 720 for the Welcome and Profile setup screens only (so the two-column layout can be seen), and screenshots of both.

**Agent H owns:** `src/app.js` except G's anchors, `src/app.css`, and `src/boards-*.css` only for card sizes if needed. H builds:
1. **Game card** (`.ap-gcard`): glyph tile, name, table label in mono, a real mini board (poster size, end state for matches, quiet first-frames loop for previews when the card is the hero or hovered), one primary action. Used by the Home hero, the `Your games` rail, the arenas grid (compact variant without the board), favourites tiles in setup (G reuses the compact variant via a shared class name agreed here: `.ap-gcard.ap-gcard-compact`).
2. **Match card** (`.ap-mcard`): board poster, participants (You tile vs provider tile with display name), one status chip (`Your move` accent, `Thinking` text-2 with the clock, `Final 1–0` / `+60 chips` / `A draw` in result tones), relative time; actions by state: **Resume** (accent soft) for live, **Watch** (outline + replay icon) for finished, **Play again** (accent fill). Used in Your matches and the Resume card.
3. **Personalised Home**: Resume card (match card) → hero game card for the first favourite (or tic-tac-toe) with the recommended `Ready` opponent line and `Play now` → `Your games` horizontal rail of favourites (hidden when none) → `Choose an arena` grid (compact game cards) with the category chips. Counts from data.
4. **Opponent picker** (`.ap-picker`, replaces the roster sheet body): header with the table name; `Recommended` row of four large cards (provider mark, display name, speed pill, `plays this table` or `Not available for this game` receded); filter chips `Ready` · `Fast` · `Frontier labs` · `All`; search; roster grouped by provider with the provider logo as a group header; rows with display name, mono id, speed, tables coverage; selected state; for tables, the sheet title `Seat 3 · pick a model` and the same body. The Table sheet shows the selected opponent pinned as `Your opponent` with `Change`.
5. Vocabulary and honesty rules unchanged. Both themes plus the four material themes must render these components without new hex values (tokens only).

Hand-off between G and H: G finishes the hooks first and tells the orchestrator which anchor comments it added in app.js; H avoids those regions. If both must touch the same function, H waits.

## 11. Resolved during the brief revision (2026-10-02)
- Option B (zero screens before the first move) and the one-time `Try a theme` row are dropped: Part 2 makes Profile setup the one page before play and puts the theme pick right after it, so neither is needed.
- Cold start: a signed-out launch lands on Welcome; a signed-in launch goes straight to Home with no brand beat.
- Picker filters: `Ready` = can play this table; `Fast` additionally hides `Slower turns`; `Frontier labs` from catalogue data.
- Home hero opponent: the recommended `Ready` model until the player has played that table, then the last opponent they chose there.
- Gap to close in the prototype (agent H) and later on the web: a place to edit favourite games after setup. Decision: Settings gets a `Your games` row that opens the same tile grid used in Profile setup.
