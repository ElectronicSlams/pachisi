# Design Brief — Onboarding, Auth & Profile (Main + Trinity)

> **Status:** Design spec — **prototyped** in `../eSlams Identity.dc.html` + `../eSlams Trinity.dc.html`
> (both built against this brief); **backend landed** (Better Auth, parallel mode — see the migration
> doc). Onboarding here is **v2** (full-profile, OAuth-confirm) as built. Trinity RBAC is reconciled to
> the shipped **4-role** model. **Audience:** the `eslams-design` skill / designer + implementer.
> **Read first:** `docs/design/DESIGN_BRIEF.md` (principles §2, page anatomy §7 Auth/Profile, voice §12,
> a11y §10) and `docs/design/COMPONENT_REFERENCE.md`. This document is the source of truth for the
> *auth / onboarding / profile / account* surfaces on both `eslams.com` and `trinity.eslams.com`.
> **Companion docs:** technical wiring in `docs/profile-onboarding-implementation.md`; the auth
> platform it sits on in `docs/profile-user-management-and-better-auth-migration.md` (Better Auth is
> the decided backend — every data affordance below is grounded in what Better Auth + our schema
> already give us).

This brief closes named gaps in `DESIGN_BRIEF.md §13`: **P1 #10 "split-screen auth (logic done, layout
isn't)"** and **P2 #12 "undesigned surfaces … onboarding, settings"**, plus Trinity admin chrome.

---

## 0. What we're designing and why

Today the identity surfaces are the weakest part of the product:

- **Auth pages** exist as a basic split-screen but lean on a **third parallel primitive set**
  (`components/auth-ui.tsx`: `AuthButton`/`AuthIcon`) instead of the design system — and there's **no
  forgot-password link, no email-verification screen, no resend**.
- **Onboarding is a single username input** on a bare `page auth-page` — no welcome, no avatar, no
  profile setup, no orientation, no sense of arrival.
- **Profile is read-only**: `bio`, `location`, `websiteUrl` are stored and loaded but **never
  rendered**; the Settings tab's five blocks are all disabled or static text; the visibility toggle's
  buttons are literally `disabled`; the avatar is a single initial on a **hardcoded** provider tint
  (nav uses `providerColor("google")`, profile uses `("anthropic")`).
- **Trinity** is functionally complete but visually sparse (ad-hoc `.trinity-*` CSS, no design-system
  components), its **user management is list-only** (no create/edit-role/deactivate/session-revoke),
  and its sign-in bounces through the public `/login`.

**Goal:** design these SOTA, end-to-end — sign in, sign up, password recovery, email verification, a
real first-run **onboarding flow**, a **fully editable profile + account settings hub**, and a
**redesigned Trinity console** with complete operator management — all in the eSlams design language
(quiet, credible instrument; one accent; tokens only; `You vs Model` where it fits).

**Design principle we add for this surface:** *identity is a trust surface too.* The same rigor that
makes the leaderboard credible must make "this is me, this is my record" feel safe: clear ownership,
honest states, and **step-up verification for anything sensitive**.

---

## 1. First principles

Derived from `DESIGN_BRIEF.md §2` and applied to identity:

1. **No signup to watch; onboarding must not tax the player.** Watching is free; playing/saving needs
   an account (`§12` honesty rule). So onboarding earns its keep only by getting the player to their
   **first match fast** and capturing the one thing we truly need (a username). Everything else is
   optional and deferrable.
2. **One required decision per step.** Progressive disclosure (`§2.7`): username first (it's the
   profile URL), then optional polish, then go. Never a wall of fields.
3. **Honest, never a dead end** (`§2.5`, `§9`). Every async action (availability check, avatar upload,
   OAuth round-trip, email send) has a real pending state and an escalating recovery — no fake spinner,
   no "refresh" cul-de-sac.
4. **It's still a matchup.** Auth/onboarding copy points at the payoff — *"Play a frontier model,
   head-to-head."* — not at "manage your account."
5. **Editable by default, safe by design.** The profile is fully editable; cosmetic edits save
   instantly; **identity/security changes require re-authentication** (§3). Owners always know what's
   public.
6. **Tokens + shared primitives only** (`skill` hard rules). No new colors/gradients. We *do* add the
   small set of missing form/identity primitives (§2.2) once, in `platform-ui.tsx` — not a fourth
   parallel system. Retire `auth-ui.tsx`.
7. **Trinity is a calm operator instrument**, not a marketing surface: own admin chrome, tokens
   respected, role-gated, dense but legible; no hero/marketing patterns.

---

## 2. Design language & new primitives

### 2.1 Reuse (already in `platform-ui.tsx` / tokens)
`Button` (primary/secondary/ghost/soft × sm/md/lg), `Icon` (44-name set), `Tag`, `StatusBadge`,
`Medal`, `SectionHead`, `Sparkline`, `ProviderDot`, `ModelBadge`, `Terminal`, `PublicShell`, and the
CSS utilities `.card`, `.input`, `.seg`, `.chip`, `.gtile`, `.eyebrow`, `.mono`. Colors/space/radius/
type strictly from `tokens.css` (`--accent`, `--surface(-2/-3)`, `--text(-2/-3)`, `--win/loss/draw`,
`--r-md/lg`, etc.).

### 2.2 New shared primitives (add to the design system — spec here, API in the impl doc)
There is **no** primitive today for text fields, toggles, tabs (as a component), modals, or avatars —
auth forms use raw `<input class="input">` and a bespoke `auth-ui.tsx`. Add these **once**:

| Primitive | Purpose | Anatomy / states | Notes |
|---|---|---|---|
| `Field` / `TextField` | Labeled input wrapper | label + `.input` + hint + inline error + optional trailing adornment; states: default / focus (accent ring, exists) / error (`--loss` border + message) / disabled / success tick | Proper `<label for>`; mono variant for username/IDs. Replaces ad-hoc form markup. |
| `PasswordField` | Password entry | `TextField` + show/hide eye toggle + optional **strength meter** (segmented bar, accent fill) + "12+ characters" hint | Strength meter only on set/reset/change, not sign-in. |
| `Toggle` | Boolean setting | track + knob; on = `--accent`; label + description; keyboard + `aria-checked` | For notification/privacy switches. |
| `Tabs` | In-page section nav | underline-active (`.tabs` recipe) as a real React component with `aria-selected`, roving focus | Profile tabs, settings on mobile. `.seg` remains for compact filters. |
| `Avatar` | User image w/ fallback | `<img>` of `user.image` → initials chip fallback (provider/hash tint, **never hardcoded**) → generic; sizes xs 20 / sm 28 / md 40 / lg 68 / xl 96; `role="img"`, alt = display name | **Fixes the dead avatar path.** Used in nav, profile header, settings, arena, Trinity. |
| `AvatarUploader` | Set/replace picture | drop-zone + file picker + square crop + preview + progress + remove; states: idle / dragging / uploading (%) / error / done | Cosmetic → **no step-up**. R2-backed. |
| `Dialog` / `Modal` | Overlay | focus-trap, `Esc`, scrim, returns focus (`§10`); sizes sm/md; header + body + footer actions | Step-up, avatar crop, confirms, replay modal already exists ad-hoc — unify. |
| `StepUpDialog` | Re-auth gate | "Confirm it's you" → password field (or provider re-auth / email OTP for passwordless) → confirm | The security gate (§3). |
| `ConfirmDialog` | Destructive confirm | title + consequence copy + optional **type-to-confirm** input + danger button | Deactivate/delete, revoke-all, remove key. |
| `SettingRow` | Settings line item | label + description + current value + control/action (inline edit, Toggle, Button) + saved/err feedback | The building block of every settings section. |
| `CopyField` | Reveal-once secret | mono value (masked) + copy button ("Copied" flip) + reveal/rotate/revoke actions | API keys. |
| `Stepper` | Onboarding progress | numbered dots/segments (accent = done/current), labels (`1 · USERNAME`) | Uses the `.eyebrow` step pattern from `§4.2`. |
| `Callout` | Inline message | info / success (`--win`) / warning (`--draw`) / error (`--loss`) tones, icon + text + optional action | Generalize today's `.auth-message`. |

All must pass light **and** dark contrast (watch `--text-3` on tints, `§10`) and honor
`prefers-reduced-motion`.

---

## 3. Sensitivity model — what requires step-up re-authentication

Per the requirement "everything editable, but changing details needs password verification except the
profile picture." Two tiers:

**Tier A — Instant save (no step-up).** Cosmetic / content / preference:
`avatar (picture)`, `display name`, `bio`, `location`, `website`, `profile visibility`
(public/unlisted/private), `artifact visibility`, `theme`, `notification preferences`.
→ Optimistic save with inline "Saved" + undo; validation errors inline.

**Tier B — Requires `StepUpDialog` (confirm current password; see fallback).** Identity / security /
irreversible:
`email change`, `username change`, `password change`, `enable/disable 2FA`, `create/reveal/rotate/
revoke API key`, `link/unlink a provider`, `revoke other sessions / log out everywhere`,
`deactivate account`, `request account deletion / data export`.
→ Action opens `StepUpDialog`; on success the action proceeds; the session is marked "fresh" for a
short window (Better Auth `freshAge`) so a burst of sensitive edits doesn't re-prompt every time.

**Passwordless users (OAuth-only, no password credential).** Step-up cannot ask for a password.
Fallback in `StepUpDialog`: **re-authenticate with the linked provider** (GitHub/Google popup) *or* an
**emailed one-time code**. The dialog auto-selects the available method; copy adapts. (This is a real
segment — many users will have only OAuth.)

> This A/B split is a design decision (matches GitHub/Google norms). It's called out as an open
> decision in the impl doc in case product wants display-name in Tier B.

---

## 4. Main platform (`eslams.com`)

Shared shell: auth/onboarding use the **split-screen** (`.auth-split`: brand aside + form main; aside
hidden < 820px). Header stays, footer hidden on auth (per `§7 Auth`). Settings/profile use the normal
`PublicShell`. All copy in the eSlams voice (`§12`), sentence case, approved verbatim lines where they
fit.

### 4.1 Sign in — `/login`
- **Aside (brand panel):** logo → title "Welcome back." → one-line value prop (*"Watch frontier models
  compete, play the Arena, and keep every match on your profile."*) → 3 trust points (Secure sign-in ·
  Public profile after onboarding · GitHub, Google, or email) → footer "Open source · MIT".
- **Form card:** title "Sign in to eSlams", sub "Continue with GitHub, Google, or email."
  → **SSO first** (`Button variant=secondary icon=github/globe`, full-width): Continue with GitHub /
  Google → `.auth-divider` "or continue with email" → `Field` email + `PasswordField` (no strength
  meter) → **"Forgot password?"** link (right-aligned above the button — *new, fixes the gap*) →
  primary submit "Continue with email".
- **Footer:** "New to eSlams? **Create an account**".
- **States:** idle; submitting (button "Working…", disabled); field errors inline; top `Callout`
  (error/info) for server errors mapped from codes (see §8); **rate-limited** (429) → friendly
  "Too many attempts, try again in a moment"; OAuth return error → specific `Callout` (not generic).
- **A11y:** labels associated; error `Callout role=alert`; focus ring intact (don't suppress).

### 4.2 Create account — `/signup`
- Same split; aside title "Join the arena.", points (Arena games on your profile · Public profile after
  onboarding · Private-by-default replay uploads).
- Card "Create your account", sub "Use GitHub, Google, or email. You'll pick a username next." → SSO →
  divider → `Field` email + `PasswordField` **with strength meter** → primary "Create account".
- Legal microcopy (mono, `--text-3`): "By creating an account you agree to the eSlams Terms. Your
  profile is public only after you choose a username." → switch "Already have an account? **Sign in**".
- **States:** as §4.1 + **email-verification-required success** → transition the card to a *"Check your
  email"* state (envelope glyph, the address, "Resend email" with a 30s cooldown, "Wrong address?
  start over") — replaces today's inline-message-only behavior.

### 4.3 Forgot password — `/forgot-password` *(new)*
- Minimal card (no aside needed, or reuse aside): title "Reset your password", sub "Enter your email
  and we'll send a reset link." → `Field` email → primary "Send reset link".
- **Always show the same neutral success** ("If an account exists for that email, a reset link is on its
  way.") to avoid account enumeration (`§ security`). Resend cooldown. Link back to Sign in.

### 4.4 Reset password — `/reset-password?token=…` *(new)*
- Card "Choose a new password" → `PasswordField` (strength meter) + confirm → primary "Update password".
- **Token states:** valid → form; invalid/expired → `Callout` error + "Request a new link" →
  `/forgot-password`; success → confirmation + "Sign in" (and auto-revoke other sessions per security).

### 4.5 Verify email — `/verify-email?token=…` *(new / redesign)*
- Landing for the emailed link. States: **verifying** (skeleton), **success** ("Email verified" → CTA
  to onboarding or intent), **invalid/expired** ("This link expired" + "Resend verification"), **already
  verified** (friendly). Also the **pending** panel used post-signup (§4.2) with resend + cooldown.

### 4.6 Onboarding v2 — `/onboarding` *(full-profile first run; built in the prototype)*
Replaces the bare username box and **collects the whole profile** (picture, display name, username,
bio, location, website, visibility) in one **3-step, resumable, skippable-except-username** flow with a
`Stepper` in the aside. **Two starting modes, same screens:** OAuth arrives **prefilled — confirm and
edit**; email/password arrives **blank — fill in**. Reached after first sign-in when `user.username` is
unset; on completion routes to the user's **original intent** (e.g. back into Arena) or Arena by default.

- **Step 1 · Your profile (required core).**
  - **Profile picture** — 84px avatar. OAuth: prefilled from provider + "From GitHub" chip +
    **Replace / Remove** (→ initials). Email: initials + **Upload**. Cosmetic → **no step-up**.
  - **Display name** — ≤50; OAuth prefilled with a "from GitHub" hint; email blank.
  - **Username (required)** — `eslams.com/` prefix input, suggested via `suggestUsername(name,email)`,
    live availability (checking… / ✓ Available — `eslams.com/x` / taken → suggestion chips), reserved-
    name helper. Continue disabled until valid + available.
  - **Email** — read-only row with **✓ Verified** (OAuth) or **Verification pending** (email path) tag.
- **Step 2 · About you (optional, skippable).** Bio (≤160 + counter), Location (≤60), Website
  (`http(s)` validated), and **profile visibility** seg (Public / Unlisted / Private, default Public,
  one-line per option). "Skip for now" (ghost) · "Continue" · ← Back.
- **Step 3 · Confirm & go.** **Recap card** = the profile preview (avatar, display name,
  `eslams.com/username`, visibility tag) with **inline-editable rows** (value-or-"Not set" → pencil →
  field → Save/Cancel; website re-validated; visibility seg editable in place). OAuth title "Does this
  look right?"; email "You're set." CTAs: primary **"Play a frontier model"** (→ Arena/intent) ·
  "Explore the leaderboard" · "Finish to profile".
- **States/behavior:** each step saves independently (a drop-off still keeps the username); back
  allowed; availability + avatar upload have real pending/error states; reduced-motion disables step
  transitions. No verification re-prompt (already verified at sign-in).
- **Impl:** avatar → `user.image`; `displayName/bio/location/websiteUrl/visibility` → `PATCH
  /api/account/profile`; username → username plugin; prefill from `auth.api.getSession`
  (`image,name,email,emailVerified`). `authMode` (oauth|email) drives prefill-vs-blank. Analytics
  `onboarding_step_view/complete/skip`.

### 4.7 Public profile — `/{username}` *(redesign)*
The credible identity + record surface (matches `§7 Profile`).
- **Header (`.pf-header`):** `Avatar lg` (real image!) · display name (`.pf-name`) · `@username` (mono,
  `--text-2`) · **bio** (now rendered) · meta row: **location** (pin icon) · **website** (link, `rel`
  safe) · "joined {relative}" · visibility badge (owner sees it as the entry to the toggle). Right:
  metric tiles — Games · Win rate · **W-L-D** (`--win/loss/draw`). Owner-only: **"Edit profile"**
  button (→ §4.10) and hover-to-change on the avatar.
- **Overview strip:** win-rate-by-category bars · recent-form W/L/D chips (last N) · favorite game.
- **Tabs (`Tabs`):** **Games** (sortable history table; each row with a replay opens the replay
  `Dialog` w/ scrubber) · **Replays/Artifacts** (grid; per-item public/private + share; owner upload) ·
  (future: Achievements). Settings is **no longer a profile tab** — it moves to `/settings` (§4.9).
- **Visibility semantics (define + honor):** `public` (indexed, in listings), `unlisted` (viewable by
  link, not indexed/listed), `private` (owner-only; public request → clean "This profile is private"
  state, structure preserved). Fixes the dead `unlisted` value.
- **States:** own vs visitor vs anonymous; private/unlisted; empty history ("No matches yet — Play a
  model"); not-found (clean 404). `loading.tsx` skeleton mirroring the header+tabs.

### 4.8 Profile — owner quick-edit
On the owner's own profile, inline affordances for **Tier A** items: hover avatar → change (opens
`AvatarUploader`); an "Edit profile" button opens `/settings/profile`. Optional: inline-edit bio via a
pencil that expands a `Field` with Save/Cancel (optimistic, "Saved"). Keep it light; the full editor is
Settings.

### 4.9 Settings hub — `/settings` *(new)*
SOTA settings pattern (GitHub/Vercel-style) in `PublicShell`. **Left section nav** (`Tabs` vertical on
desktop; a `.seg`/select on mobile) + content pane. Sections:
`Profile · Account · Security · Notifications · Appearance · API keys · Danger zone`.
`/settings` redirects to `/settings/profile`. Each section is its own route (below) so it's linkable and
SSR-friendly. A slim header shows the `Avatar sm` + @username + "View public profile →".

### 4.10 `/settings/profile` — everything cosmetic, instant save *(new)*
`SettingRow`s (Tier A, no step-up): **Avatar** (`AvatarUploader` + remove) · **Display name** · **Bio**
(textarea + counter, ~160) · **Location** · **Website** (URL validation) · **Profile visibility**
(three-option control — the previously-fake toggle, now live, with the semantics from §4.7). Each row:
inline edit → optimistic save → "Saved" tick / inline error. Validation + length caps + display-name
normalization (XSS-safe, `§O6`).

### 4.11 `/settings/account` — identity (Tier B) *(new)*
- **Email** (`SettingRow` → edit opens `StepUpDialog`, then a change-email flow: enter new email →
  verification sent to the **new** address → pending badge until confirmed).
- **Username** (`SettingRow` → `StepUpDialog` → change; live availability; warn that the old
  `eslams.com/old` URL stops working / is redirected; enforce a change cooldown).
- Read-only: account created, sign-in methods summary (links to Security).

### 4.12 `/settings/security` — password, 2FA, sessions, providers (Tier B) *(new)*
- **Password:** set/change (`StepUpDialog` current-password → new + confirm w/ strength). For
  passwordless users, offer **"Set a password"** (via email verification), so they gain a credential.
- **Two-factor (2FA):** enable (TOTP QR + verify + recovery codes shown once via `CopyField`) / disable
  (step-up). *(If deferred, show a clearly-labeled "Coming soon" — never a fake control.)*
- **Active sessions:** list (device/browser from user-agent, location from IP, "current" chip, last
  seen). Actions: revoke one · **"Log out everywhere"** (step-up). Fixes U6.
- **Linked accounts:** GitHub / Google / email rows with connect / **disconnect** (step-up; block
  disconnecting the last credential). Fixes U8; makes the silent-link risk visible.

### 4.13 `/settings/api-keys` — *(redesign existing)*
`CopyField`-based key management: create (name + scopes → **reveal once** → copy), list (prefix, scopes,
last used, created), rotate, revoke (`ConfirmDialog`). Create/reveal/rotate/revoke are **Tier B**. If
main-platform keys remain Trinity-gated, show an honest explainer + link instead of a fake panel (fixes
the "route implies self-service" gap).

### 4.14 `/settings/notifications` — *(new)*
`Toggle` rows for the categories that actually exist (match results, replay processed, security alerts,
product news). If none are wired yet, ship **one honest "coming soon" `Callout`** rather than the
current decorative block. Tier A.

### 4.15 `/settings/appearance` — *(new)*
Theme control: System / Light / Dark segmented control wired to the existing `es-theme` localStorage +
`data-theme` (today it's static text). Tier A.

### 4.16 `/settings/danger` — deactivate / delete / export *(new)*
- **Deactivate** (reversible): hides public profile + revokes sessions; `ConfirmDialog` + step-up.
- **Request account deletion / data export:** per record-keeping rules this is a **queued erasure
  request** (not instant hard-delete) — `ConfirmDialog` with type-to-confirm + step-up, then a
  "request received" state and status. **Copy reviewed by Compliance/Legal.** Fixes U4/O2.

### 4.17 Shared overlays
`StepUpDialog` (§3), `AvatarUploader` crop modal, `ConfirmDialog`, replay `Dialog` (unify the existing
ad-hoc one). All focus-trapped, `Esc`, return focus.

---

## 5. Trinity (`trinity.eslams.com`)

Private admin chrome — **never the public header/footer** (`skill`). Redesign in the design system
using tokens + shared primitives, scoped under `.trinity-*` / `.tr-*`. Dense, legible, role-gated
across the **four roles the backend actually ships** — `owner · admin · developer · researcher`
(source of truth: `packages/auth/src/permissions.ts`; `super_admin→owner`, `manager→admin` are legacy
aliases only). See the full permission matrix + `manageableRoles` in
`profile-onboarding-implementation.md §D.1` and the mock `../trinity-rbac-4role-mock.html`. Under
Better Auth, Trinity users **sign in directly on the Trinity host** (the public-host bridge is removed)
— so Trinity gets its own auth screens.

> **Prototype caveat:** `eSlams Trinity.dc.html` still demos 5 roles (`super_admin`/`manager`). Build
> to the 4-role model above; enforcement is **server-side in `workers/api`** via
> `hasTrinityPermission`, never nav-hiding.

### 5.1 Trinity shell / chrome *(redesign)*
Keep the structure (`.trinity-shell` = 248px sidebar + main) but re-skin with tokens and shared
primitives:
- **Sidebar:** logo + "Trinity" wordmark; **role-gated nav** (`trinityNavForRole`) grouped
  (Overview · your role's sections · admin sections); active = accent. Collapse to a top bar / drawer
  on narrow widths.
- **Top bar:** page title + `RoleBadge` (the operator's role) + `Avatar sm` menu (their account/
  security/sign-out).
- Consistent `.card`/`SectionHead`/`Button`/`Callout` usage; status via `StatusBadge`/tokens
  (`--win/draw/loss` = good/warn/bad).

### 5.2 Trinity sign in — `trinity.eslams.com/login` *(new, in admin chrome)*
Split or centered card in Trinity chrome: title "Sign in to Trinity", SSO (GitHub/Google) + Trinity
email + password + **Forgot password**. Honest error states (not-enabled account → "Ask an admin /
request access", with link to §5.5). No public marketing.

### 5.3 Trinity set password — `/trinity/setup-password?token=…` *(redesign)*
Invite-claim: title "Set your Trinity password", `PasswordField` (strength) + confirm, token
valid/invalid/expired states, success → console. In Trinity chrome (not the public setup shell).

### 5.4 Trinity forgot/reset password *(new)*
Same pattern as §4.3/4.4 but Trinity-chromed and admin-plugin-backed.

### 5.5 `/trinity-info` — public access request *(redesign)*
The one public Trinity touchpoint. Clean explainer ("Trinity is for approved eSlams operators &
researchers.") + **access-request form** (`Field`s: organization, work email, reason, requested role =
researcher/developer) with real success/pending state. Uses public design system (it's on the public
host) but points at Trinity.

### 5.6 `/trinity/users` — full operator management *(major redesign — biggest gap)*
Today: list-only. Design the complete CRUD:
- **List:** `TrinityTable` — Avatar+name, email, `RoleBadge`, status (active/disabled), source, last
  login, created; search + role/status filters; row → **detail drawer**.
- **Detail drawer (`Dialog`/side panel):** operator identity + activity; actions gated by
  `manageableRoles`: **change role** (owner → any of the 4; **admin → developer/researcher only**;
  developer/researcher can't set roles — matches `permissions.ts`), **deactivate/reactivate** (ban/
  unban), **force sign-out** (revoke sessions), **resend/reset password invite**, **revoke linked
  platform API keys** (on offboard). **Only `owner` may act on an `owner` or sign artifacts.** Every
  mutation → `ConfirmDialog` + writes an **audit** entry.
- **Create operator:** button → form (email, name, role — admin/owner options **owner-only**) → sends
  set-password invite. (Fixes: no create, no edit-role, no deactivate, no session-revoke.)
- **States:** empty, loading skeleton, permission-scoped (viewers see read-only), destructive confirms.

### 5.7 `/trinity/access-requests` — review queue *(redesign)*
`TrinityTable` of pending/approved/rejected (email, org, requested role, reason, age) → approve
(choose role) / reject with reason; approve triggers the invite. Clear queue empty state.

### 5.8 Trinity operator's own account/security *(new)*
Every operator can manage **their own** login: change password, active sessions + revoke, 2FA (admin
console handling sensitive data → **2FA strongly recommended/required for owner/admin**). Small
settings surface reusing §4.12 patterns in Trinity chrome.

### 5.9 Trinity resource table/detail **pattern** (applies to the other ~18 data pages)
Don't hand-design 18 pages — design **one** `TrinityTable` + `TrinityDetail` pattern (providers,
models, games, variants, runs, matches, artifacts, leaderboards, audit, settings, etc.): consistent
toolbar (search/filter/primary action), dense table, status tokens, right-aligned row actions,
detail drawer, empty/loading/error, and role-gated actions. This lifts all resource pages into the
design system at once. (Audit view is **read-only, append-only** in presentation — no edit affordances.)

---

## 6. Complete page/screen inventory

**Legend:** New = doesn't exist · Redesign = exists, re-skin/extend · P0 highest.

### Main platform
| # | Page / screen | Route | Status | Priority |
|---|---|---|---|---|
| 1 | Sign in | `/login` | Redesign | P0 |
| 2 | Create account | `/signup` | Redesign | P0 |
| 3 | Forgot password | `/forgot-password` | **New** | P0 |
| 4 | Reset password | `/reset-password` | **New** | P0 |
| 5 | Verify email (+ resend/pending) | `/verify-email` | **New/Redesign** | P0 |
| 6 | Onboarding (3-step) | `/onboarding` | **New** (replace) | P0 |
| 7 | Public profile (view) | `/{username}` | Redesign | P0 |
| 8 | Profile owner quick-edit | `/{username}` (owner) | Redesign | P1 |
| 9 | Settings hub + nav | `/settings` | **New** | P0 |
| 10 | Edit profile (Tier A) | `/settings/profile` | **New** | P0 |
| 11 | Account (email/username, Tier B) | `/settings/account` | **New** | P0 |
| 12 | Security (password/2FA/sessions/providers) | `/settings/security` | **New** | P0 |
| 13 | API keys | `/settings/api-keys` | Redesign | P1 |
| 14 | Notifications | `/settings/notifications` | **New** | P2 |
| 15 | Appearance (theme) | `/settings/appearance` | **New** | P2 |
| 16 | Danger (deactivate/delete/export) | `/settings/danger` | **New** | P1 |
| 17 | Step-up re-auth dialog | (overlay) | **New** | P0 |
| 18 | Avatar uploader/crop dialog | (overlay) | **New** | P0 |
| 19 | Confirm / danger dialog | (overlay) | **New** | P0 |
| 20 | Account menu (header) | header | Redesign (real `Avatar`) | P0 |

### Trinity
| # | Page / screen | Route | Status | Priority |
|---|---|---|---|---|
| 21 | Trinity chrome/shell | (layout) | Redesign | P0 |
| 22 | Trinity sign in | `trinity…/login` | **New** (in chrome) | P0 |
| 23 | Set password (invite) | `/trinity/setup-password` | Redesign | P0 |
| 24 | Trinity forgot/reset password | `/trinity/(forgot|reset)-password` | **New** | P1 |
| 25 | Public access request | `/trinity-info` | Redesign | P1 |
| 26 | Operator management (CRUD + drawer) | `/trinity/users` | **Major redesign** | P0 |
| 27 | Access-request review | `/trinity/access-requests` | Redesign | P1 |
| 28 | Operator's own account/security | `/trinity/account` | **New** | P1 |
| 29 | Overview dashboard | `/trinity` | Redesign | P1 |
| 30 | Resource table/detail **pattern** (~18 pages) | `/trinity/*` | Redesign (pattern) | P2 |
| 31 | Trinity dialogs (confirm/role-change) | (overlay) | **New** | P0 |

### New shared primitives (§2.2)
`Field/TextField`, `PasswordField`, `Toggle`, `Tabs`, `Avatar`, `AvatarUploader`, `Dialog`,
`StepUpDialog`, `ConfirmDialog`, `SettingRow`, `CopyField`, `Stepper`, `Callout`, `RoleBadge`
(Trinity). Build **before/with** the P0 pages; retire `components/auth-ui.tsx`.

---

## 7. States & edge cases (design every one)
For each page: **default · loading (skeleton mirroring layout) · empty · error (`Callout`) · success ·
permission (owner/visitor/anon; role-scoped for Trinity) · rate-limited · offline/network**. Auth
specials: OAuth round-trip pending + provider-specific errors; email pending + resend cooldown; expired/
invalid tokens (verify/reset/invite); passwordless step-up fallback; last-credential guard on unlink;
username-taken + suggestions; avatar upload too-large/wrong-type; deactivated/erasure-requested account.
No dead ends (`§9`).

---

## 8. Copy deck (microcopy + error mapping)
Voice: `§12` — player language, sentence case, confident/plain, honest.
- **Verbatim to reuse:** *"Play a frontier model, head-to-head."* · *"No signup to watch."*
- **Onboarding:** S1 "Claim your username." · S2 "Add a face and a name." · S3 "You're set."
- **Availability:** "Checking…" / "✓ Available" / "Taken — try {suggestion}".
- **Enumeration-safe:** forgot-password → "If an account exists for that email, a reset link is on its
  way."
- **Step-up:** "Confirm it's you — enter your password to continue." (passwordless: "Confirm it's you —
  re-authenticate with {provider} or use an emailed code.")
- **Danger:** deactivate "Your profile disappears from eSlams and you're signed out everywhere. You can
  reactivate by signing back in." · delete "This requests permanent deletion of your account and data.
  Type your username to confirm." (final Compliance wording pending).
- **Error-code → message** map (from the current code, keep/soften): `invalid_credentials` "Email or
  password is incorrect." · `email_unverified` "Verify your email — we've sent a new link." ·
  `account_exists` "An account already exists for that email — sign in instead." · `weak_password` "Use
  at least 12 characters." · `username_taken` "That username is taken." · OAuth state expired "That
  sign-in session expired — start again." Provide a specific message per known code; never a bare
  "could not be completed."

---

## 9. Responsive, a11y, theming, performance
- **Responsive:** split-screen collapses < 820px (aside hidden), forms full-width; settings left-nav →
  top `.seg`/select < 720px; profile header stacks; Trinity sidebar → drawer. Tap targets ≥ 40px (the
  current 15px account-icon button is too small — fix).
- **A11y (`§10`):** every field a real `<label>`; visible `:focus-visible` (don't suppress — the header
  search bug is not precedent); dialogs trap + restore focus, `Esc`; `Avatar` `role=img`+alt; toggles/
  tabs proper ARIA + keyboard; error `Callout role=alert`; WCAG AA both themes (recheck `--text-3` on
  tint).
- **Theming:** verify light **and** dark for every new component/state; tokens only.
- **Performance (`§11`):** these routes aren't heavy, but keep dialogs/uploader/crop as client islands,
  lazy-load the cropper; ship `loading.tsx` skeletons; don't pull profile/settings code into public
  bundles.
- **Motion:** step transitions, "Saved" ticks, avatar upload progress — all with reduced-motion
  end-states.

## 10. Out of scope / open design decisions (flag for product)
- Is **display name** Tier A (instant) or Tier B (step-up)? Default here: Tier A.
- Ship **2FA** now or "coming soon"? (Recommended now for Trinity admins.)
- **Achievements/badges** tab on profile — later.
- Main-platform **API keys**: self-service vs remain Trinity-gated (affects §4.13 framing).
- Username-change **URL redirect/alias** UX (old profile URL behavior).
- Final **erasure/deactivation** copy + flow — pending Compliance/Legal.

> When any item here would introduce a new color, gradient, animation style, or component shape beyond
> §2.2, stop and resolve against `DESIGN_BRIEF.md §2` first (per the `eslams-design` skill).
