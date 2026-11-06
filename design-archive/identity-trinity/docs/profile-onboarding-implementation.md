# eSlams Identity & Trinity — Implementation Note (merged)

> **Single authoritative build doc.** Merges the **backend wiring** (Better Auth, endpoints, data
> model, step-up) with the **UI build checklist** (from the design system's `IMPLEMENTATION.md`,
> keyed to the two prototypes). **Reconciled to the shipped backend** — notably the **4-role**
> Trinity RBAC in `packages/auth/src/permissions.ts` (the prototypes still show 5; Part D is
> corrected, and the corrected model is mocked in `../trinity-rbac-4role-mock.html`).
>
> **Sources:** prototypes `../eSlams Identity.dc.html`, `../eSlams Trinity.dc.html`; styles
> `../eslams/styles/`; backend `eSlamsPlatform/packages/auth/**` + `apps/web/**`. Design intent:
> `./onboarding-signin-profile-design.md`. Platform/migration: `./profile-user-management-and-better-auth-migration.md`.
>
> **Guardrails:** DB schema edits live in `packages/db/**`, **run only after sign-off, never
> auto-applied**. Erasure/audit copy needs **Compliance/Legal**.

---

# PART A — Backend (what already landed vs what's still to build)

## A.0 Landed (commit `5834515`, `better-auth ^1.6.23`, PARALLEL mode)
- `@eslams/auth` workspace pkg: `createMainAuth` + `createTrinityAuth` — two isolated Better Auth
  instances, Drizzle+D1, `transaction:false`. Handler `apps/web/lib/better-auth.ts`, client
  `apps/web/lib/auth-client.ts`, flags `apps/web/lib/auth-flags.ts` (`AUTH_V2`/`TRINITY_AUTH_V2`,
  default on). Route `apps/web/app/api/auth/[...all]/route.ts`.
- Config fixes already in: hardened linking (`disableImplicitLinking`, `requireLocalEmailVerified`,
  `allowUnlinkingAll:false`), `useSecureCookies`+`trustedOrigins`, username plugin (single source),
  PBKDF2→scrypt rehash inside async `verify` (`packages/auth/src/password.ts`,`legacy-password.ts`),
  `changeEmail` verified, password reset + `revokeSessionsOnPasswordReset`.
- Migrations **additive**: `0021_better_auth_main_additive.sql` (adds `authaccounts.password`,
  `users.displayusername`, `users.deactivatedat`, lower() UNIQUE indexes on email+username,
  `sessions.expiresat` index, `profileusernamealiases`); trinity `0006` (parallel `trinityauth*`).
- Scripts: `auth-v2-audit / backfill-main / backfill-trinity / delta-backfill / cutover / verify`,
  `smoke-auth-profile`. Avatar upload → R2 `PUBLICASSETS`, sets `users.image` (`/api/account/avatar`).
- RBAC: `packages/auth/src/permissions.ts` — **4 roles** owner/admin/developer/researcher, fail-closed.

## A.1 Endpoints — Better Auth provides vs new app routes
**Better Auth (via `/api/auth/[...all]` + `authClient`):** email/password sign-up/in, social (PKCE),
email verify + resend, **forget/reset/change password**, **changeEmail**, username set/change +
availability, **listSessions / revokeSession / revokeOtherSessions**, **listAccounts / linkSocial /
unlinkAccount**, fresh-session primitive.

**New app routes to build (domain data BA doesn't own):**

| Route | Method | Purpose | Step-up | Status |
|---|---|---|---|---|
| `/api/account/avatar` | POST/DELETE | avatar → R2 → `users.image` | No | **landed** |
| `/api/account/session` | GET | session user (email/username/name/image) | — | **landed** |
| `/api/account/profile` | PATCH | `displayName,bio,location,websiteUrl,visibility` | No (Tier A) | **build** |
| `/api/account/username` | POST | username change + write `profileusernamealiases` | Yes | build (plugin + alias) |
| `/api/account/step-up` | POST | verify current pw / provider / email-OTP → mark fresh | — | **build** |
| `/api/account/deactivate` | POST | set `users.deactivatedat`, hide profile, revoke sessions | Yes | build (col exists) |
| `/api/account/erasure-request` | POST | queue erasure (no hard delete) | Yes | build (+table, +Compliance) |
| `/api/profiles/[username]` | GET | **render bio/location/website, honor visibility, drop `userId`** | — | edit existing |
| `/api/trinity/users` (+`/[id]`) | GET/POST/PATCH | operator list/create/set-role/ban/revoke (enforce `permissions.ts`) | — | build (workers/api) |

## A.2 Data model
- `user` (BA + plugins): `id,name,email,emailVerified,image,createdAt,updatedAt` + `username`/
  `displayusername` + `role` (additionalField / Trinity). **`image` kills the dead-avatar path.**
- `session` (BA): `token,userId,expiresAt,ipAddress,userAgent` → sessions UI, no new table.
- `account` (BA): OAuth links + credential `password` (`providerid='credential'` — confirm backfill
  maps old `email` rows → `credential`).
- `verification` (BA): email-verify + reset tokens (`reset-password` stored hashed).
- `profiles` (app): `displayName,bio,location,websiteUrl,visibility,stats,deactivatedat`, FK→`user.id`.
- `erasureRequests` (app, new): `userId,requestedAt,status,note`.

## A.3 Step-up (password verification) — fresh-session gate
1. **Add `session.freshAge`** to both instances (not set yet) — e.g. 5–10 min.
2. Tier B action → if session not fresh, endpoint returns `403 step_up_required` → client opens
   `StepUpDialog` → `POST /api/account/step-up`: verify current password (BA), **or** provider
   re-auth / **email OTP** for passwordless users (needs the email-OTP plugin — not loaded yet).
3. On success re-issue/refresh session (fresh window); retry action.
BA's own `changePassword` (needs current pw) and `changeEmail` (verifies new address) already
enforce; the gate unifies the app-domain Tier B actions.

## A.4 Avatar (landed) — verify/finish
`/api/account/avatar` (multipart, ≤4MB jpg/png/webp) → R2 `PUBLICASSETS` → `users.image`. Confirm
server re-encode/resize to square ~512 and Cloudflare image-transform serving. `Avatar` primitive is
the single renderer everywhere (nav, profile, settings, arena, Trinity) — **remove every hardcoded
`providerColor(...)` fallback**; update `e2e/arena-auth.spec.ts:110-112` to assert the image renders.

## A.5 Cutover + retire old stack (see migration doc §7 / changes-to-be-made §1)
Move page **read-path** off old `getSessionUserFromCookieHeader` → `auth.api.getSession`; run
audit→backfill→delta→deploy→**cutover** (deletes sessions + in-flight tokens; announce)→verify→smoke;
then delete old `lib/auth.ts` credential/session code, dual-stack fallbacks, flags, and the
`trinityauthcodes` bridge.

---

# PART B — UI foundations (build against tokens + shared primitives)

## B.0 File inventory
- Ship as-is: `tokens.css`, `components.css`, `chrome-v2.css`, `pages2/3/4.css`.
- MERGE into production sheets (don't overwrite): `identity.css` (auth/profile/settings; drop
  `.proto-mobile`/`@container` demo rules), `trinity.css` (`.tr-*`/`.rb*`). All `style-hover="…"`
  → real `:hover`. New `.auth-*`/`.pf2-*`/`.toggle`/`.modal-*`/`.set-theme` → `pages4/pages2/components`.
- Prototypes are reference implementations, not shipped code.

## B.1 Regression guardrails (production rebase — the prototype fixed these; keep them)
`--text-3`: **#666672 / #9a9aa5** (never regress to #8a8a94/#6b6b76) · `--nav-h: 64px` · `.sr-only`
present · `:focus-visible` 2px `--accent` @2px offset · result colors `--win/--loss/--draw`(+`-soft`)
are the only status palette · **`--text-on-accent` on all accent/danger solids — never `#fff`** ·
light default, dark `[data-theme=dark]`, System = no attr + `prefers-color-scheme`.

## B.2 Shared primitives (`platform-ui.tsx`) — build once, retire `auth-ui.tsx`
`Field`, `PasswordField` (show/hide toggles aria "Show/Hide password"), `Toggle`, `Tabs`, `Avatar`
(hash-tint fallback `oklch(0.58 0.11 H)`, H=hash(username); sizes 26–84px), `AvatarUploader`,
`Dialog`, `StepUpDialog`, `ConfirmDialog`, `SettingRow`, `CopyField`, `Stepper`, `Callout`,
`RoleBadge` (`.rb rb-<role>`).

## B.3 Dialog behavior (ALL dialogs + drawers)
`role="dialog" aria-modal`, overlay+`Esc` close, **focus trap**, initial focus = first input/non-close
button, **return focus to invoker** on close, danger buttons `--loss` bg + `--text-on-accent`.

## B.4 Validation & copy
Email `^[^@\s]+@[^@\s]+\.[^@\s]+$` (server authoritative) · password 12+ w/ 4-seg strength meter ·
username `[a-z0-9-]` 3–32 lowercase-coerced, reserved list, ~650ms debounced availability, 2
suggestions on taken · enumeration-safe forgot copy · **locked lexicon: no "sweep"/"battle";
"Win rate by category" (not "arena type"); sample artifact `connect4-run-v3`** · website links
`rel="noopener nofollow ugc"`, bound to the field.

---

# PART C — Screens (build checklist; anatomies in the design doc)

## C.1 Main auth (`eSlams Identity.dc.html` → Auth)
Split-screen (aside hidden `<820px`), SSO-first + email divider.
- **Sign in:** email + password (show/hide), inline "Forgot password?", inline field errors, banner
  errors (wrong password / rate-limited / OAuth session expired), submit spinner, → Create account.
- **Create account:** email + password (strength meter on first keystroke); errors (account exists →
  suggest sign in, invalid email, weak); legal line; success → **Check your email** (address echoed,
  resend 30s cooldown, start over).
- **Forgot / Reset:** forgot → enumeration-safe sent state + cooldown; reset → new+confirm w/ meter,
  expired-link state, success "signed you out everywhere else".
- **Verify email:** verifying / verified (→ onboarding) / expired (resend) / already verified.

## C.2 Onboarding v2 (3 steps, aside stepper) — **full profile; OAuth confirm, email fill**
- **Step 1 · Your profile:** photo (OAuth = provider photo + "From GitHub" chip + Replace/Remove;
  email = initials + Upload; Tier A no step-up), display name (≤50; OAuth prefilled "from GitHub"),
  **username (required)** w/ prefix input + live availability + URL preview, email row read-only
  (Verified / Verification-pending tag). Continue disabled until username available.
- **Step 2 · About you (skippable):** bio (≤160+counter), location (≤60), website (URL-validated),
  visibility seg Public/Unlisted/Private (default Public) + per-option description. Skip / Continue /
  Back.
- **Step 3 · Confirm & go:** recap card (avatar, display name, `eslams.com/username`, visibility tag)
  + editable rows (value-or-"Not set" + inline Edit) + visibility seg. OAuth title "Does this look
  right?", email "You're set." CTAs: **Play a frontier model** / Explore leaderboard / Finish to profile.
- **Impl:** writes avatar→`user.image`, profile fields→`PATCH /api/account/profile`, username→plugin;
  prefill from `auth.api.getSession` (`image,name,email,emailVerified`) + `suggestUsername`; steps save
  independently + resumable; `onboarding_step_*` analytics; no verification prompt (already verified).

## C.3 Public profile (→ Identity) — personas: Owner / Visitor / Signed-out / Private / New
- Header: 68px `Avatar` (owner hover "Change"→avatar dialog), name + visibility badge (owner→Settings),
  `@username`, **bio** (owner inline edit + "✓ Saved"), meta (location pin, website link, joined),
  metrics Games / Win rate / **W–L–D**; owner "Edit profile"→Settings.
- Overview (hidden when empty): "Win rate by **category**" bars, "Recent form" 5 chips, "Favorite game".
- Tabs **Games** (history table → replay dialog) / **Replays** (artifact cards, owner upload defaults
  private, per-item visibility toggle + Share).
- Empty/new: "No matches yet" + Play a model. Private: lock card. Signed-out: "Sign in" in header.
- **Impl:** GET renders bio/location/website, honors visibility (public/unlisted/private), **drops
  `userId`** from anon payload.

## C.4 Settings (→ Identity) — hub + sensitivity model
Identity header + `200px | 1fr` grid; sticky nav Profile / Account / Security / API keys /
Notifications / Appearance / Danger. `<720px` nav → horizontal scroll.
**Tier A (instant, no step-up):** display name, bio, location, website, visibility, avatar.
**Tier B (step-up):** email, username, password, 2FA, revoke-all, unlink, API keys, deactivate, delete.
- **Step-up dialog:** fresh window ~5min (badge "Session verified · fresh"); password mode; **OAuth-only
  mode** = "Re-authenticate with GitHub" OR email 6-digit OTP.
- **Profile:** avatar row; display name/bio/location/website inline Edit + "✓ Saved"; visibility seg.
- **Account:** email (step-up → new email → pending-verification tag; old keeps working); username
  (step-up → availability + "once every 30 days"); account-created; sign-in methods → Security.
- **Security:** password change/set (OAuth-only → "Set a password"); 2FA enable(dialog)/disable;
  sessions list + per-row Revoke + "Log out everywhere"; linked accounts Connect/Disconnect with
  **last-credential guard**.
- **API keys:** CLI hint; New key → name → **reveal-once**; rows w/ Rotate + Revoke (confirm).
- **Notifications:** toggles (Match results / Replay processed / Product news; **Security alerts
  locked "Always on"**). **Appearance:** Light/Dark/System, immediate, per-device.
- **Avatar dialog:** drop zone → progress → preview → Use photo. **2FA dialog:** QR → code → recovery
  codes reveal-once.
- **Danger:** Deactivate (step-up→confirm; reversible; amber banner + Reactivate) · Request deletion
  (step-up→confirm w/ type-username-to-confirm; queued tag; Compliance copy).

---

# PART D — Trinity (`eSlams Trinity.dc.html`) — RECONCILED to the 4-role backend

> **The prototype shows 5 roles (`super_admin`, `manager`); the shipped backend
> (`packages/auth/src/permissions.ts`) has 4.** Build to the 4-role model below; treat the extra
> prototype roles as legacy aliases only. Corrected model mocked in `../trinity-rbac-4role-mock.html`.

## D.1 Roles & permission matrix (source of truth: `permissions.ts`)
Canonical roles: **`owner` · `admin` · `developer` · `researcher`**. Legacy aliases (migration only):
`super_admin/superadmin→owner`; `manager,operator,runner,broadcaster,auditor,support,trinity→admin`.
Unknown role → **fail closed** (normalize → null → `researcher` fallback).

| Capability | owner | admin | developer | researcher |
|---|:--:|:--:|:--:|:--:|
| Read all resources (`readAll`) | ✅ | ✅ | — | — |
| Mutate all resources (`mutateAll`) | ✅ | ✅ | — | — |
| users:read / users:write | ✅ | ✅ | — | — |
| **roles:write (set roles)** | ✅ | — | — | — |
| runs read / write | ✅ | ✅ | ✅ | read only |
| artifacts read / write | ✅ | ✅ | ✅ | read only |
| **artifacts:sign (`canSignArtifacts`)** | ✅ | — | — | — |
| leaderboard:publish | ✅ | ✅ | — | — |
| support read / write | ✅ | ✅ | — | — |
| developer:execute (API keys) | ✅ | ✅ | ✅ | — |
| research:read | ✅ | ✅ | — | ✅ |
| **manageableRoles** | all | developer, researcher | — | — |

Key rules (differ from the prototype): **only `owner` can set roles, mint admin/owner, act on an
owner, and sign artifacts.** `admin` has full read/write ops but can **only** grant developer/
researcher. There is **no `manager` tier** — its old "read-only Users" behavior does not exist; if a
read-only-admin viewer is wanted, that's a **new role decision**, not in the backend today.

## D.2 Enforcement
- **Server-side in `workers/api`**: every Trinity handler checks `hasTrinityPermission(role, perm)` /
  `readAll` / `mutateAll` / `manageableRoles` from `@eslams/auth/permissions`. Nav-hiding is UX only,
  **never** the control (fixes the old coarse-read S4 / operator-mutate S5 / fail-open S6 bugs).
- Collapse any remaining role duplication into `permissions.ts` (single source; retires the old
  3-way `effectiveTrinityRoleSql`).

## D.3 Trinity auth (own chrome; sign in on the Trinity host)
- Sign in: GitHub/Google + email/password; errors incl. **"This account isn't enabled for Trinity"**
  (+ Request access link), rate-limited.
- Invite set-password: invited-role badge + email, pw+confirm+meter, token invalid/expired(7-day)/
  success (+2FA nudge). Backed by admin-created user + BA reset/verification token.
- Forgot/reset: operator copy; success signs out other sessions.
- **Removes the old public-host `trinityauthcodes` bridge.**

## D.4 `/trinity-info` — public access request (public chrome)
Intro + form (Organization, Work email, Requested role = **Researcher/Developer only**, use-case
textarea ≥~12 chars) → "Request received" + SLA copy.

## D.5 Console shell
248px sticky sidebar, brand, nav groups Console / Operations / Catalog / Admin (Users, Access requests
+ pending pill, Audit) / You — **role-gated per D.1** (developer/researcher: no Admin group). Footer:
avatar + name + `RoleBadge` + sign-out. `<900px` sidebar hidden.

## D.6 Overview
4 stat cards (active operators, pending requests — live-computed, runs today, error rate); queues &
health list (status dots); recent-audit teaser + View all.

## D.7 Users (operator CRUD)
- Toolbar: search, role select (4 roles), status seg; live count.
- Table `tr-grid-users`: Operator (avatar+name), Email, `RoleBadge`, status dot (active/disabled/
  invited), Source, Last login (cols 5–6 hide `<1100px`). Loading skeleton / empty / default.
- **Invite operator** (owner/admin): dialog email + role (admin/owner **owner-only** per D.1) →
  invited row.
- **Row → detail drawer** (408px, focus-trapped): identity + meta (email, source, created, last login,
  sessions, keys). Actions gated by D.1: Resend invite · **Change role** (options limited by
  `manageableRoles`: owner→all, admin→developer/researcher; **admin cannot grant admin/owner**) ·
  Force logout (revoke sessions) · Revoke API keys · Deactivate/Reactivate. **No self-action** ("manage
  your own login under Your account"). Only owner may act on an owner.

## D.8 Resource pattern (Models = reference; reuse for Providers/Games/Variants/Runs/Matches/Artifacts/Leaderboards)
Toolbar (search + filter), `tr-grid-*` table, row → drawer (meta + Edit/Retire), actions disabled
unless `mutateAll` (owner/admin). **Artifact signing = owner only** (`canSignArtifacts`).

## D.9 Access requests
Seg Pending/Approved/Rejected; table `tr-grid-req` (email, org, requested-role badge, reason, age);
**Approve** → grant-role select (**researcher/developer only**) → invite; **Reject** → required reason
(≥4 chars). Buttons enabled only for owner/admin (`users:write`).

## D.10 Audit log (owner/admin only, `readAll`)
Read-only, **append-only presentation**; search + event-type filter; `tr-grid-audit` (event, actor,
detail, time). Vocabulary: `role_changed, invite_sent, key_rotated, user_disabled, request_rejected,
session_revoked, model_added`.

## D.11 Your account (every operator)
2FA-required banner for **owner/admin** (until enabled); password change (inline + "✓ Updated");
2FA enable dialog / disable (blocked for owner/admin); sessions + Revoke + Log out everywhere.

---

# PART E — Cross-cutting, responsive, tests

## E.1 Cross-cutting
Toasts (bottom-center pill, ~2.8s) · "✓ Saved" inline flashes (~1.8s) · resend cooldowns (30s) ·
reveal-once (API keys, 2FA recovery codes) · shared username-availability logic
(onboarding ↔ settings) · reduced-motion disables all animation · `data-screen-label` anchors.

## E.2 Responsive
`<1100px` Trinity: meta columns hide · `<900px` Trinity: sidebar hidden · `<820px`: auth aside hidden,
card full-width · `<720px`: settings nav → scroll row, profile header stacks · tap targets ≥40px.

## E.3 Tests (before deleting old stack)
`packages/auth` real-D1 integration (email/pw incl. **legacy verify + rehash**, OAuth, verify, reset,
linking guard) · replace `FakeD1` SQL-regex suites · **Trinity authz per role** (owner/admin/developer/
researcher: read + mutate + `manageableRoles`) · **cross-identity isolation** (main cookie ≠ Trinity) ·
step-up gate (fresh + passwordless) · flip `e2e/arena-auth.spec.ts:110-112` to assert avatar renders.

## E.4 Open decisions
Display name Tier A vs B · 2FA now vs later (recommend now for owner/admin) · email sender (Cloudflare
`send_email` recipient limit vs Resend/SES — gates reset) · `apiKey` plugin vs `apikeys` table ·
whether to add a **read-only admin-viewer role** (the retired "manager" tier) · username-change URL alias UX.
