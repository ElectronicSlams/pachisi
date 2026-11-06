# Profile & User Management — Analysis and Better Auth Migration Plan

> ### ⬤ UPDATE — Phase 1 LANDED (parallel mode)
> Better Auth shipped (commit `5834515`, `better-auth ^1.6.23`) as the `@eslams/auth` package —
> two isolated instances (`createMainAuth` + `createTrinityAuth`), Drizzle+D1 (`transaction:false`),
> running **in parallel behind `AUTH_V2`/`TRINITY_AUTH_V2` flags** (old `lib/auth.ts` still the
> fallback and still the page read-path; **cutover not yet run**). Landed fixes: hardened account
> linking (S3/U8), secure cookies + trustedOrigins (S1/S2), username single-source (C2/C3/D1),
> PBKDF2→scrypt rehash, password reset (U1), changeEmail (U5), avatar→R2 (C5/U7); additive migrations
> `0021`/trinity `0006` (+ lower() unique indexes C2, `sessions.expiresat` D8, `profileusernamealiases`
> U5, `deactivatedat` U4); `auth-v2-*` backfill/cutover/verify scripts. **RBAC is a bespoke
> `packages/auth/src/permissions.ts` (NOT the admin plugin), with 4 roles** — see §5.3 (updated).
> **Still ahead:** read-path→BA + `freshAge`, cutover + delete old stack, profile-edit/step-up/
> deactivate endpoints, onboarding v2 endpoints, Trinity admin CRUD UI, tests. Full punch-list:
> `docs/changes-to-be-made.md` (in the repo).
>
> Status: **Approved direction — implementation plan.** Author: engineering analysis pass (July 2026).
> Scope: the **main platform** (`eslams.com`) and **Trinity** (`trinity.eslams.com`)
> identity, profile, account and authorization systems.
> **Decision (made): replace the hand-rolled auth layer with [Better Auth](https://www.better-auth.com)
> everywhere.** The strategy is two-step: **(1) move to Better Auth** — which resolves the majority of the
> issues below *by construction* — then **(2) complete the profile / account / authz feature set on Better
> Auth as the base.** This document is the implementation plan for that programme; it does not re-litigate
> whether to migrate.
>
> **Companion docs (this programme).** The **UX/UI** for the identity surfaces is specified in
> `docs/design/onboarding-signin-profile-design.md` (every page + state, main + Trinity, new
> primitives, the step-up model); the **build wiring** is in `docs/profile-onboarding-implementation.md`
> (routes, endpoints existing-vs-new, avatar upload, validation, step-up mechanism). Together with this
> doc they are the complete plan for identity, onboarding, and profile — this doc is the *platform/
> migration* layer; those two are the *experience/feature* layer built on top of it (Phases 2–3).

---

## 0. TL;DR

The platform runs **two hand-rolled identity systems** (`apps/web/lib/auth.ts`, ~2,000 lines,
plus `workers/api/src/services/trinity.ts`) on Cloudflare D1. They work, but:

- **The profile system is effectively read-only and half-built.** Users can claim a username
  once and sign out — nothing else. No profile editing, no avatar rendering (the OAuth avatar
  is fetched, stored, threaded to the UI, and then *never displayed*), a **fake** visibility
  toggle (buttons hardcoded `disabled`), no username/email change, no account deletion.
- **There is no password recovery at all** — a forgotten password is a *permanent* lockout
  (CRITICAL).
- **Several real security gaps**: no CSRF/origin defense on auth POSTs, `Secure` cookie flag is
  host-conditional and droppable, OAuth accounts silently auto-merge by email (account
  pre-hijack), no session rotation or "log out everywhere", and `emailVerified` is silently
  dropped on the per-request session path.
- **Trinity authorization is coarse and fail-open**: low-privilege roles can read the full
  operator directory + audit log; `operator` can mutate almost everything; a bare `role='trinity'`
  with a missing access-profile row *escalates* to full admin; a single `admin` can mint admins.
- **Data-model debt**: username stored in two independently-unique columns; case-sensitive DB
  uniqueness vs case-insensitive app logic; role enum overloaded across both systems.

**Better Auth solves the majority of the security and plumbing problems by construction** — its
core `user` table has a native `image` field, its `session` table natively supports listing and
revocation, it ships CSRF/origin protection, PKCE, password reset/change, controlled account
linking, and an **admin plugin** whose custom-role access-control model maps cleanly onto
Trinity's five roles. It runs on Cloudflare Workers + D1 + Drizzle (the stack we already use;
there is even an official OpenNext example), and our current schema (`authaccounts`,
`authverifications`) is already "Better-Auth-shaped."

This document is: (1) the findings ledger, (2) the target architecture on Better Auth, (3) an
issue→resolution matrix, and (4) a phased migration + feature plan.

> **Regulatory / process note (Allica guardrails).** Two items below (self-service account
> deletion / right-to-erasure, and audit-log immutability) touch data-protection and
> record-keeping obligations. Treat the erasure design as **requiring Compliance/Legal review**
> before build, and **do not auto-apply any DB migration** — schema files are edited in
> `packages/db/` and the migration is run only after explicit sign-off (per `CLAUDE.md`).

---

## 1. How this analysis was produced

Seven parallel readers mapped each subsystem (data model, main auth flows, profile/account UX,
Trinity model/roles, Trinity authz/admin, the full API surface, and test coverage). Adversarial
dimension critics (security, correctness, UX-completeness) then hunted for issues against the
combined map, and **every high/critical finding was independently re-verified against the actual
code** — all came back *confirmed* (with minor citation corrections noted inline in the ledger). A
subsequent **review pass (2026-07-07, same commit) re-verified twelve representative findings against
code a second time — all twelve confirmed** (see Appendix A). Two of the original critic passes (pure
data-model, and consistency/avatar) failed on a transient API-overload error; their dimensions are
covered by the data-model mapper, the correctness critic, and a first-hand avatar trace, so there is no
material gap — but because the username cutover (C2/C3/D1) rides the Phase 1 critical path, a
**data-model deep-dive is a required Phase 1 pre-requisite, not an optional extra.**

File\:line references throughout point at `main` as pulled on 2026-07-07 (commit `3682b5d`).

---

## 2. Current-state architecture

### 2.1 Main platform (`eslams.com`)

- **Auth core:** `apps/web/lib/auth.ts` (hand-rolled). Three sign-in methods land in one
  `sessions` table: **GitHub OAuth, Google OAuth, email+password**.
- **OAuth:** stateless HMAC-signed `state` blob mirrored into an httpOnly `eslams.oauth.state`
  cookie; **no PKCE**. `BETTER_AUTH_SECRET` exists as an env var but is used *only* as the HMAC
  key — **there is no Better Auth runtime today.**
- **Passwords:** PBKDF2-SHA256, 100k iterations, 16-byte salt, constant-time compare, 12-char
  minimum, mandatory email verification before first sign-in.
- **Sessions:** 32 random bytes (base64url); only the SHA-256 hash is stored in `sessions.token`;
  **30-day** lifetime, **no rotation**.
- **Data model (D1 / Drizzle, `packages/db/src/schema.ts` + `migrations/*.sql`):**
  - `users` — canonical account (`id`, `email UNIQUE`, `emailverified`, nullable `username`,
    `name`, `image`, `role`, timestamps).
  - `profiles` — 1:1 (`PK = userid`), holds the **authoritative public** `username UNIQUE`,
    `displayname/bio/location/websiteurl`, `visibility`, and denormalized game stats.
  - `authaccounts` — credential/link rows (OAuth link per provider + one `providerid='email'`
    row carrying `passwordhash`). **Already Better-Auth-shaped.** (`accesstoken/refreshtoken/
    idtoken` columns exist but are never written.)
  - `authverifications` — hashed single-use email-verification tokens (30-min TTL).
  - `apikeys` — per-user API keys (SHA-256 hash + prefix + JSON scopes); issuance is now gated
    behind Trinity.

### 2.2 Trinity (`trinity.eslams.com`)

- **Fully separate identity domain**: own tables (`trinityusers`, `trinitysessions`,
  `trinityauthcodes`, `trinityaccessprofiles`, `trinityaccessrequests`), own cookie
  (`eslams.trinity.session`, **8h** TTL), and in production its **own D1 binding `TRINITY_DB`**
  (falls back to the main DB only in dev/test).
- **Login:** OAuth (GitHub/Google) or Trinity-specific email+password, exchanged on the *public*
  host and handed to the Trinity host via a **single-use `trinityauthcodes` bridge**. Plain
  password login directly to a Trinity target is refused.
- **Roles (two-tier):** a storage role in `trinityusers.role` plus an optional access-role
  sidecar in `trinityaccessprofiles`. `effectiveTrinityRoleSql`
  (`CASE WHEN accessrole IS NOT NULL AND role='trinity' THEN accessrole ELSE role END`) is
  **duplicated in three modules** (`auth.ts`, `workers/api/src/http/auth.ts`,
  `services/trinity.ts`). Role set: `super_admin, admin, manager, developer, researcher`
  (+ legacy `operator, runner, broadcaster, auditor, support, trinity, owner`).
- **Provisioning:** (1) email in `TRINITY_ADMIN_EMAILS` env auto-provisions `admin` on first
  OAuth; (2) an admin approves a self-service access request → emailed set-password invite;
  (3) a super_admin/admin creates the user directly.

---

## 3. Findings ledger

Severity is the **verified/corrected** severity. Confidence `H/M/L`. `[V]` = independently
re-verified against code and confirmed.

### 3.1 Security & authorization

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| S1 `[V]` | **High** | **No CSRF / Origin / Sec-Fetch defense** on any state-changing auth/account POST (login, sign-out, onboarding). `SameSite=Lax` is insufficient for these simple/top-level POSTs → login-CSRF, logout-CSRF, forced onboarding. | `app/api/auth/email/route.ts:3`, `app/api/auth/sign-out/route.ts:3`, `app/api/account/onboarding/route.ts:8`, `lib/auth.ts:305-344,487-539` |
| S2 `[V]` | **High** | **`Secure` cookie flag is host-conditional** — appended only when host ends in `.eslams.com` (`lib/auth.ts:1854`). Any preview/staging/rewritten host serves the 30-day session and the 8h Trinity session over cleartext-capable cookies. | `lib/auth.ts:1838-1858,283-287,384-388` |
| S3 `[V]` | **High** | **OAuth accounts auto-linked by email** with no confirmation: `upsertOAuthUser` falls back to `SELECT id FROM users WHERE lower(email)=lower(?)` and merges. Classic cross-provider **account pre-hijack / takeover**. | `lib/auth.ts:951-987,1435-1439` |
| S4 `[V]` | **High** | **Coarse Trinity read authz** — `assertCanReadTrinity` throws only for `developer`/`researcher`; every other role reads the **full operator directory, audit log, and secret-health**. Least-privilege / need-to-know violation. | `services/trinity.ts:673-693,751-759,3295-3312,3553-3572` |
| S5 `[V]` | **High** | **`operator` can mutate almost every resource** (`resource !== 'users' && !(artifacts:sign)`), and **a single `admin` can mint new admins** (`admin` ∈ `adminAssignableRoles`). Wide blast radius. | `services/trinity.ts:5686-5711,5725-5759,262` |
| S6 | **Med** | **Bare `role='trinity'` with a missing access-profile row fails *open* → full admin.** Null-handling bug with a privilege-escalation payload. | `lib/auth.ts:647-648`, `services/trinity.ts:246-248` |
| S7 | **Med** | **No session rotation**; 30-day tokens; per-login expiry sweep is a full-table scan on an unindexed `sessions.expiresat`. | `lib/auth.ts:1667-1687` |
| S8 | **Med** | **OAuth has no PKCE**; `state` is signed but not encrypted; open-redirect safety depends on several duplicated allowlist checks staying in sync. | `lib/auth.ts:1689-1710,806-823,1885-1898` |
| S9 | **Med** | **`localhost` is treated as fully-trusted `local_admin`** across middleware, the Trinity proxy, and the auth claim paths. A spoofed/rewritten `Host` in prod would admit unauthenticated Trinity access and collapse DB isolation. | `middleware.ts:60-73`, `app/api/trinity/[...path]/route.ts:20-22`, `lib/auth.ts:174-182,355-357` |
| S10 | **Med** | **A single `admin` can escalate a user to `admin`** and can also grant `admin` through the access-request invite path — no `super_admin` gate, no two-person control. | `services/trinity.ts:5745-5751,262`, `lib/trinity-access.ts:95,177-208` |
| S11 | **Med** | **Trinity session cookie lacks `Secure` on non-`.eslams.com` hosts** (same root cause as S2, privileged console). | `lib/auth.ts:1838-1858,384-388` |
| S12 | **Low** | Public profile endpoint **leaks internal `userId`** to anonymous callers. | `app/api/profiles/[username]/route.ts:32-36`, `queries.ts:3061-3077` |
| S13 | **Low** | Middleware Trinity gate checks **cookie presence, not validity** (false sense of gating). | `middleware.ts:59-73` |
| S14 | **Low** | Trinity OAuth bridge blocks only `status='disabled'` → **fails open for any future non-active status** and force-reactivates on login. | `lib/auth.ts:1012-1019,1093-1145` |
| S15 | **Low** | Deactivating a Trinity user **does not revoke linked platform API keys** or force-kill sessions. | `lib/auth.ts:740-765`, `lib/trinity-access.ts:271-311` |

### 3.2 Correctness bugs

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| C1 `[V]` | **Med** (was High) | **`emailVerified` silently dropped on cookie-derived sessions.** `getSessionUserFromToken` (runs on *every* authed request) omits `emailverified`; `readSessionUserById/ByEmail` include it. The optional field goes silently `undefined` → latent verification-gate bypass or spurious lockout. | `lib/auth.ts:571-588,1481-1513,335-341,37-45` |
| C2 | **Med** | **Case-sensitive DB uniqueness vs case-insensitive app logic** — `users.email`, `users.username`, `profiles.username` are BINARY-collated `UNIQUE`, but all lookups use `lower(...)`. Duplicate-email race and multi-row verification updates possible; mixed-case rows become **silently unreachable** (404). | `migrations/0001_initial.sql:5,7,54`, `lib/auth.ts:958,1436`, `queries.ts:1631-1660` |
| C3 | **Med** | **Username stored in two independently-UNIQUE columns** (`users.username` + `profiles.username`) with no cross-table consistency; claim is not atomic; conflicts are blanket-mapped to `username_taken`. | `schema.ts:11,179`, `lib/auth.ts:1633-1658` |
| C4 | **Med** | **`COALESCE(?, col)` upsert freezes provider name/image** — provider profile changes are silently discarded and a field can never be cleared; display name frozen at first onboarding. | `lib/auth.ts:964-972,1648-1654` |
| C5 | **Med** (avatar) | **OAuth avatar captured but never rendered; chip color hardcoded to the wrong provider.** `SessionUser.image` rides all the way to the component and is discarded; nav uses `providerColor("google")`, profile uses `providerColor("anthropic")` — same user, different blob per screen. | `lib/auth.ts:43,903,946`, `components/platform-ui.tsx:620`, `components/platform-pages.tsx:6341` |
| C6 | **Low** | `authverifications.value` uniqueness declared UNIQUE (mig 0005) then **silently downgraded to a plain index** (mig 0014), undocumented, bundled in an unrelated change. | `migrations/0005...:2`, `migrations/0014...:3-4`, `schema.ts:168` |

### 3.3 Data-model debt

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| D1 | **High** | Two-place username denormalization (see C3) — no single source of truth for the primary public identifier. | `schema.ts:11,179` |
| D2 | **Med** | `passwordhash` column depends on **migration ordering** (0009 recreates `trinityusers` without it; 0010 re-adds) — non-linear migration risks silent credential-hash loss. | `migrations/0009...:5`, `migrations/0010...:1`, `schema.ts:46` |
| D3 | **Med** | `trinityusers.role` CHECK constraint **forbids `developer`/`researcher`** while code treats them as first-class → stored role ≠ effective role. | `migrations/0009...:10`, `services/trinity.ts:250,3525` |
| D4 | **Med** | **Audit-log actor references are detached (no FK)** (migs 0007/0008) — weak actor attribution on privileged actions; a record-keeping/traceability concern. | `migrations/0007...:1`, `migrations/0008...:1,57` |
| D5 | **Med** | `effectiveTrinityRoleSql` and the role sets are **duplicated across three modules** and can drift → authorization inconsistency between web and API. | `lib/auth.ts:647`, `http/auth.ts:31`, `services/trinity.ts:248` |
| D6 | **Low** | `users.role` enum **overloaded with Trinity roles** even though Trinity identity is detached; dead/ambiguous authorization surface. | `migrations/0002...:10`, `migrations/0008...` |
| D7 | **Low** | `unlisted` visibility value is defined but **cannot be set and has unspecified behavior** (dead state). | `schema.ts:184`, `queries.ts:1638` |
| D8 | **Low** | Redundant indexes duplicating UNIQUE constraints (`profiles.username`, `sessions.token`); `sessions.expiresat` **unindexed** unlike the sibling session tables. | `schema.ts:33,192`, `lib/auth.ts:1685` |

### 3.4 Self-service / feature completeness gaps

| # | Sev | Finding | Where |
|---|-----|---------|-------|
| U1 `[V]` | **CRITICAL** | **No password recovery of any kind** — no forgot / reset / change. A forgotten 12-char password = permanent lockout requiring manual DB intervention; also no way to rotate a compromised password. | `app/api/auth/email/route.ts:1-6`, `lib/auth.ts:291-344` |
| U2 `[V]` | **High** | **Profile is entirely uneditable** — `bio/location/websiteUrl` are never writable; `displayName` is write-once at claim. Reachable only via seed/DB. | `platform-pages.tsx:6952-7003`, `app/api/profiles/[username]/route.ts:8-38`, `lib/auth.ts:1621-1665` |
| U3 `[V]` | **High** | **Profile visibility toggle is fake** — three buttons hardcoded `disabled`, no endpoint, profiles permanently public. Onboarding copy promises settings that don't exist → privacy-expectation trap. | `platform-pages.tsx:6968-6980`, `onboarding/page.tsx:12` |
| U4 `[V]` | **High** | **No account deletion or deactivation** anywhere; only self-service mutations are username-claim and current-browser sign-out. Data-subject-rights gap. | `app/api/account/*`, `app/api/profiles/[username]/route.ts` |
| U5 | **Med** | **No username change, no email change** — users permanently bound to first choices. | `lib/auth.ts:1621-1665`, `platform-pages.tsx:6961-6962` |
| U6 | **Med** | **No session management** — cannot list or revoke sessions / "log out everywhere"; a leaked token lives up to 30 days. | `lib/auth.ts:1667-1687,487-539` |
| U7 | **Med** | **Avatar unfinished** — email/password users have no avatar at all; OAuth image never rendered (see C5). | `platform-ui.tsx:509,620`, `platform-pages.tsx:6338,6341` |
| U8 | **Low** | **No linked-provider visibility / unlink** — a user can't see or sever which providers are attached (compounds S3). | (no route exists) |
| U9 | **Low** | Trinity CRUD has **no hard-delete / force-session-revoke**; Notifications/Uploads/Appearance settings blocks are static decoration. | `routes.ts:82-90`, `services/trinity.ts:3460-3524`, `platform-pages.tsx:6982-6998` |

### 3.5 Ops / compliance gaps (from the completeness pass)

| # | Sev | Finding |
|---|-----|---------|
| O1 | **High** | **Email deliverability unproven.** Verification/invite emails use a Cloudflare `send_email` binding (`wrangler.jsonc:33-35`) which can only deliver to **verified destination addresses** → public email/password signup may be non-functional in prod. *Verify before relying on any email-based flow (incl. the new password reset).* |
| O2 | **High** | **No right-to-erasure / retention lifecycle.** Sessions persist raw IP + user-agent; **no cron/scheduled purge** of expired sessions/verifications (no `triggers` in `wrangler.jsonc`). |
| O3 | **Med** | **Audit log is not tamper-evident** — mig 0008 drops & recreates `auditlogs`; no append-only trigger, hash-chain, or external export. |
| O4 | **Med** | **No bot/abuse defense** — no Turnstile/CAPTCHA, no disposable-email/MX checks; signup + outbound email are automatable. |
| O5 | **Med** | **No auth observability** — no structured logging / Sentry / metrics on auth paths; failures swallowed by bare `catch {}`. No signal for credential-stuffing, CSRF attempts, or Trinity privileged logins. |
| O6 | **Low** | **Display-name XSS/normalization surface** — `displayName` defaults to provider `name` with no length/charset/Unicode-normalization; verify escaping on the profile render path. |
| O7 | **Low** | **Avatar/identity a11y** — initials chips have no `img` semantics/alt; hardcoded backgrounds may fail WCAG contrast. |

### 3.6 Test-coverage risk (governs how safe the migration is)

- Auth tests use **hand-written `FakeD1` classes that regex-match SQL strings** → tightly coupled
  to exact query text/column names. **Better Auth issues its own SQL, so essentially all of these
  fakes must be replaced** with integration tests against a real D1 (Miniflare/Wrangler).
  (`tests/email-auth.test.ts`, `trinity-oauth.test.ts`, `api-keys.test.ts`.)
- **Trinity role enforcement is tested for only 4 of ~12 admitted roles**; `isTrinityApiRole` /
  `isTrinityAccessReviewer` have **no behavioral test**; `signOut`,
  `getSessionUserFromCookieHeader`, `claimUsernameForSession`, Google OAuth, and the
  account-linking path are **untested**.
- **Locked-in invariants a migration must consciously change:**
  1. `e2e/arena-auth.spec.ts:110-112` asserts the **user avatar image is *not* rendered** — the
     avatar fix must rewrite this, not "fix a flake."
  2. Cross-identity session isolation (platform cookie must never resolve a Trinity session) is a
     load-bearing security property but currently rests on cookie-name separation with **no
     resolver-level test**.

---

## 4. Why Better Auth

The current code is a competent but bespoke re-implementation of exactly what Better Auth
provides — and the bespoke version is where the gaps live. Better Auth is a good fit here
specifically:

- **Runs on our stack.** Native **Cloudflare D1** support (pass the binding; it uses D1's
  `batch()` API because D1 has no interactive transactions) and a **Drizzle** adapter for SQLite.
  A **community** integration (`zpg6/better-auth-cloudflare`) ships an **OpenNext example** — note it
  is community-maintained, **not Better-Auth-official**, and OpenNext needs a slightly more involved auth
  setup because of its **async database-initialization / singleton** requirement (the auth instance must
  be built lazily per request from that request's env bindings, not at module top-level). `apps/web`
  already deploys via OpenNext on Workers, so the runtime is a match — but this async-init/singleton
  pattern is **the single biggest unknown, and is exactly what Phase 0 exists to prove** (see §7).
  Sources: [D1/Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle),
  [community Cloudflare integration `better-auth-cloudflare`](https://github.com/zpg6/better-auth-cloudflare),
  [Better Auth on Cloudflare (Hono)](https://hono.dev/examples/better-auth-on-cloudflare).
- **Our schema is already its schema.** `authaccounts` ≈ Better Auth `account` (incl.
  `passwordhash` → `account.password`, OAuth token columns); `authverifications` ≈ `verification`;
  `sessions` ≈ `session`. Migration is mostly *mapping + backfill*, not a redesign.
- **The `user` table has `image`, `email`, `emailVerified` natively** → the avatar data path and
  the `emailVerified` inconsistency (C1, C5) disappear.
- **`session` has `ipAddress`/`userAgent`/`expiresAt` and native list/revoke endpoints** → session
  management (U6, S7) is configuration, not a build.
- **Ships the security we're missing**: built-in CSRF/origin protection (`trustedOrigins`),
  `httpOnly+secure` cookies by default in production, **PKCE**, **password reset/change**,
  **controlled account linking** (`accountLinking.trustedProviders`, verified-email requirement),
  and configurable session expiry + rotation/`freshAge`.
- **Admin plugin = Trinity RBAC.** `createAccessControl()` + `ac.newRole()` model custom roles
  (`super_admin/admin/manager/developer/researcher`) with per-resource/action permission
  statements, plus **list users, ban/unban, set-role, impersonate, revoke sessions** — directly
  filling S4/S5/S6/S10/U9.
- **Username plugin** gives a **single normalized unique `username`** (+ `displayUsername`) →
  kills the two-place denormalization (C3/D1) and the case-collision class (C2).
- **API-key plugin** can replace the custom `apikeys` table (hashing, prefixes, scoped
  permissions, expiry) if we choose to consolidate.

Sources: [Installation](https://www.better-auth.com/docs/installation),
[Core schema](https://www.better-auth.com/docs/concepts/database),
[Cookies / cross-subdomain](https://www.better-auth.com/docs/concepts/cookies),
[Admin plugin](https://www.better-auth.com/docs/plugins/admin),
[Username plugin](https://www.better-auth.com/docs/plugins/username).

### What Better Auth does **not** do for us (still app work)
Profile *domain* data (bio/location/website/visibility/game-stats), avatar **upload** to R2
(Better Auth stores the URL), the erasure **policy** (soft-deactivate + queued erasure per our
record-keeping rules), audit-log immutability, observability, bot defense, and email
deliverability. These are called out as explicit phases below.

---

## 5. Target architecture on Better Auth

### 5.1 Two instances, one library

Keep the **strong main/Trinity isolation** we have today (separate DB binding, separate cookie,
separate host) — it's a genuine security boundary and tests lean on it. Model it as **two Better
Auth instances**:

| | Main instance | Trinity instance |
|---|---|---|
| Host | `eslams.com` | `trinity.eslams.com` |
| DB | main D1 binding | `TRINITY_DB` binding |
| Cookie | `cookiePrefix: "eslams"` | `cookiePrefix: "eslams.trinity"` |
| Session expiry | 30d (consider 7–14d + sliding) | 8h |
| Plugins | `username`, (optional) `apiKey`, `nextCookies` | `admin` (custom AC), `username` off, OAuth + set-password invite |
| Providers | GitHub, Google, email+password | GitHub, Google, Trinity email+password |

Cookie isolation is exactly what Better Auth's `cookiePrefix` is for; we deliberately **do not**
enable `crossSubDomainCookies` (that would *share* sessions across the boundary — the opposite of
what we want). Trinity logging in directly on its own host **removes the custom `trinityauthcodes`
OAuth-bridge** entirely (a large simplification of S8/S9/S14 surface).

**Where each instance runs (resolved).** Both Better Auth instances live in the **`apps/web` OpenNext
Worker**, selected by request host: `eslams.com` → main instance (main D1 binding); `trinity.eslams.com`
→ Trinity instance (`TRINITY_DB` binding). Each is built lazily per request from that request's env
bindings (the OpenNext async-init/singleton pattern above), so one Worker hosts both without sharing
state. **`workers/api` continues to own Trinity *domain services*** and simply **validates** the Trinity
session (admin-plugin session + role check) rather than issuing it — the `app/api/trinity/[...path]`
proxy forwards the already-validated identity. This keeps the entire auth surface in `apps/web` and the
business logic in `workers/api`. Phase 0 proves the two-instances-in-one-Worker pattern before Phase 1
and Phase 3 depend on it.

### 5.2 Schema mapping (main instance)

| Today | Better Auth | Notes |
|---|---|---|
| `users` | `user` | `id,name,email,emailVerified,image,createdAt,updatedAt` native. Add `role` (admin plugin / additionalField). |
| `profiles.username` | `user.username` + `user.displayUsername` (username plugin) | **Single source of truth** — drop `users.username`. Resolves C3/D1/C2. |
| `profiles` (bio/location/website/visibility/stats) | **app-owned `profiles` table**, `userId` FK → `user.id` | Domain data Better Auth doesn't manage; keep, but it references the BA user. |
| `authaccounts` | `account` | `passwordhash` → `account.password`; OAuth link rows map 1:1. |
| `authverifications` | `verification` | Better Auth manages email-verify **and** password-reset tokens here. |
| `sessions` | `session` | Native `ipAddress/userAgent`; native list/revoke. |
| `apikeys` | `apiKey` plugin (optional) *or* keep app table | Decide in Phase 4; not on the critical path. |

Trinity instance mirrors this: `trinityusers → user` (+ `role`, `banned/banReason/banExpires`
from admin plugin, mapping `status='disabled'` → `banned=true`), `trinitysessions → session`,
`trinityaccessprofiles`/`trinityaccessrequests` become an app-owned access-request table on top of
the admin plugin's role field. `effectiveTrinityRoleSql` and its 3-way duplication (D5) collapse
into **one** admin-plugin access-control definition.

### 5.3 Trinity RBAC — bespoke `permissions.ts` (AS SHIPPED)

> **Landed differently than originally planned — and better for enforcement.** Rather than the Better
> Auth admin plugin's `createAccessControl`, the shipped design is a **bespoke role→permission module
> `packages/auth/src/permissions.ts`, enforced server-side in `workers/api`** (nav-hiding is never the
> control). Roles collapsed from the old 5 to **4 canonical**: `owner · admin · developer · researcher`
> (`super_admin→owner`, `manager,operator,runner,broadcaster,auditor,support,trinity→admin` as legacy
> aliases). Unknown role **fails closed** (→ `researcher`), fixing the old S6 "bare trinity → full
> admin" escalation.

Per-role policy (`readAll`/`mutateAll`/`canSignArtifacts`/`manageableRoles` + a permission list):

- `researcher` → read-only scoped: runs:read, artifacts:read, research:read. No user/role access.
- `developer` → runs read/write, artifacts read/write, developer:execute (API keys). No user/role access.
- `admin` → `readAll` + `mutateAll` + users:write + leaderboard:publish + support; **`manageableRoles =
  [developer, researcher]`** (can't mint admin/owner), **cannot sign artifacts** (fixes S5/S10).
- `owner` → everything: `roles:write`, `canSignArtifacts`, `manageableRoles =` all four. **Only owner
  mints admin/owner and acts on an owner.**

This fixes S4 (coarse reads), S5 (operator over-mutate — "operator" is now just an admin alias), S6
(fail-open), S10 (single admin minting admins), and D5 (collapses the 3-way `effectiveTrinityRoleSql`
duplication into one module). Full matrix + the UI reconciliation:
`profile-onboarding-implementation.md §D.1`; corrected-model mock `../trinity-rbac-4role-mock.html`.
*(A read-only "manager"/viewer tier no longer exists — if wanted, it's a new-role decision.)*

This makes the **read matrix explicit and fail-closed** (fixes S4), scopes `operator` (fixes S5),
and removes the "missing access-profile ⇒ admin" fail-open (S6) because absence of a role = no
permissions.

---

## 6. Issue → resolution matrix

| Finding | Resolved by | How |
|---|---|---|
| S1 CSRF | **Better Auth** | Built-in origin/CSRF protection + `trustedOrigins`; app POSTs go through BA handlers. Add a same-origin guard on any remaining custom POST. |
| S2/S11 Secure cookie | **Better Auth** | `secure` set by default in prod, host-independent (browsers ignore `Secure` on `http://localhost`). |
| S3/U8 account linking | **Better Auth config** | `accountLinking.trustedProviders` + require verified email; expose linked-accounts list + unlink via BA endpoints. |
| S4/S5/S6/S10/U9 Trinity authz | **Admin plugin + AC** (+ app) | Explicit per-resource/action matrix; fail-closed; `set-role:admin`→super_admin; native ban/impersonate/list/revoke. **Two-person admin-mint is bespoke app logic on top** of the `set-role:admin` permission. |
| S7/U6 session mgmt/rotation | **Better Auth** | Native `session` list + `revokeSession`/`revokeOtherSessions`; configurable expiry, `freshAge`, rotation. |
| S8 PKCE | **Better Auth** | PKCE by default for OAuth code exchange. |
| S9/S13/S14 localhost/bridge | **Architecture** | Trinity authenticates on its own host → bridge removed; gate dev bypass behind an explicit env flag, fail-closed on missing `TRINITY_DB`. |
| S12 userId leak | **App** | Drop `userId` from the anonymous public-profile response. |
| S15 offboarding | **Admin plugin + app** | On ban/disable: `revokeUserSessions` + app hook to revoke linked API keys. |
| C1 emailVerified | **Better Auth** | Session/user resolution always carries `emailVerified`. |
| C2/C3/D1 username & case | **Username plugin** | Single normalized unique `username`; drop `users.username`; email normalized by BA. Migration adds `COLLATE NOCASE`/functional index. |
| C4 COALESCE freeze | **Better Auth + app** | BA `updateUser` + `mapProfileToUser`; profile edit endpoint owns bio/etc. |
| C5/U7 avatar | **Better Auth + app** | `user.image` rendered via a shared `<Avatar>` (see Phase 2); email/password users get R2 upload. |
| U1 password recovery | **Better Auth** | `forgetPassword`/`resetPassword`/`changePassword` native (needs working email — see O1). |
| U2/U3/U5/D7 profile edit, visibility, rename | **App on BA** | Owner-only profile PATCH; username-change via BA username plugin; email-change via BA change-email (verified). |
| U4/O2 deletion/erasure | **App policy on BA** | Soft-deactivate (BA ban/disable + hide profile) + queued erasure request; scheduled purge cron. **Compliance/Legal review required.** |
| D2/D3/D4/D6/D8 schema debt | **Migration** | Fixed as part of the schema cutover (single role source, FKs, indexes). |
| O1 email | **Infra** | Move to a real sender (Resend/SES/MailChannels) or verify Cloudflare Email Routing limits before go-live. |
| O3 audit immutability | **App/infra** | Append-only enforcement + external export (design task). |
| O4 bot defense | **App** | Cloudflare Turnstile on signup/reset; disposable-email blocklist. |
| O5 observability | **App/infra** | Structured auth-event logging + alerting; stop swallowing errors. |
| O6/O7 XSS/a11y | **App** | Validate/normalize display name; accessible `<Avatar>` with alt/role + WCAG contrast. |

---

## 7. Migration & delivery plan (phased)

Each phase is independently shippable and ordered so that **user-visible risk drops first**.
Rough sizing (1 engineer, **indicative — refine after the Phase 0 spike**): **Phase 0 ≈ 1–2 days,
Phase 1 ≈ 2–3 weeks, Phase 2 ≈ 2–3 weeks, Phase 3 ≈ 1.5–2 weeks, Phase 4 ≈ 2 weeks + Compliance/Legal
lead time** → ~9–11 weeks end-to-end, though **Phases 2 and 3 can overlap** once Phase 1 lands. Every DB
change edits `packages/db/` schema files and is **flagged for explicit migration sign-off — never
auto-applied** (per `CLAUDE.md`). Data migrations run as reviewed one-off scripts.

### Phase 0 — Spike & guardrails (1–2 days)
Stand up Better Auth in `apps/web` behind an `AUTH_V2` flag, wired to a **throwaway D1** with the
Drizzle adapter, on the OpenNext/Workers runtime, and prove the four things Phases 1/3 depend on:

1. **Async-init / singleton on OpenNext (the #1 unknown):** the auth instance builds lazily per request
   from the request's env bindings; email+password, GitHub, Google, and session-read-on-an-authed-route
   all work under `batch()`-based D1 writes.
2. **Two-instances-in-one-Worker:** a second instance selected by host (`trinity.eslams.com` +
   `TRINITY_DB` + `cookiePrefix="eslams.trinity"`) coexists with the main instance, cookies stay isolated,
   and a platform cookie **cannot** resolve a Trinity session.
3. **Password verify + rehash pairing:** `password.verify` accepts the legacy `pbkdf2-sha256$…` format and
   a post-sign-in `databaseHook` rehashes to scrypt and writes back to `account.password`.
4. **O1 email deliverability** — gates U1/password-reset. If Cloudflare `send_email` can't reach arbitrary
   recipients, **pick and wire a sender now** (Resend/SES/MailChannels); this is a Phase-0 output, not a
   later surprise.

- **Also kick off the required data-model deep-dive** (C2/C3/D1 username/case reconciliation) so its
  findings land before the Phase 1 schema cutover.
- Deliverable: a working `auth.ts` (Better Auth) + `auth-client.ts`, the four proofs above (or a blocker
  writeup), a chosen email sender, and a decision log.

### Phase 1 — Main-platform auth cutover (core) (~2–3 weeks)
Goal: Better Auth is the only auth path on `eslams.com`; the hand-rolled `lib/auth.ts`
credential/session/OAuth code is deleted.
- **Schema:** generate Better Auth's canonical tables via the CLI; write the Drizzle schema for
  `user/session/account/verification` (+ username, admin, apiKey plugin columns). Add
  `COLLATE NOCASE`/functional lower() indexes for email/username (fixes C2). Keep an app-owned
  `profiles` table (FK → `user.id`) for domain fields (bio/location/website/visibility/stats);
  **drop `users.username`** (username plugin owns it).
- **Config:** email+password on; `socialProviders` github+google; `trustedOrigins`;
  `accountLinking.trustedProviders` with verified-email requirement (fixes S3);
  `advanced.cookiePrefix="eslams"`, secure defaults (fixes S1/S2); PKCE default (S8);
  session expiry (consider 14d + sliding) with rotation (S7).
- **Password migration (verify legacy, rehash on login):** configure `emailAndPassword.password.verify`
  to accept the legacy `pbkdf2-sha256$…` format so existing users can still sign in. Note the `verify`
  function is pure `({hash, password}) → boolean` and **cannot itself persist a new hash** — so the
  transparent rehash is done in a **post-sign-in `databaseHook`** (e.g. `session.create.after` / a
  sign-in after-hook): on a successful login where the stored hash is still legacy, re-hash the supplied
  password with Better Auth's default (scrypt) and write it back to `account.password`. New signups use
  scrypt directly. **Phase 0 proves this verify-hook + rehash-hook pairing end-to-end** (it's the second
  must-prove item alongside async-init). No mass re-hash is possible (we don't hold plaintext).
- **Data backfill (reviewed script):** `users→user` (map `emailverified`→`emailVerified`,
  `profiles.username`→`user.username`), `authaccounts→account` (`passwordhash`→`password`),
  `authverifications→verification`.
- **Session cutover:** **hard cutover** — existing `eslams.session` tokens are not portable;
  invalidate all and require re-login (a one-time, low-cost UX hit for a public app; avoids a
  fragile dual-read shim). Announce a short maintenance window.
- **Wire the app:** `/api/auth/[...all]` handler; replace `getSessionUserFromCookieHeader`
  callers with `auth.api.getSession`; middleware validates the session (fixes S13-adjacent).
  `emailVerified` is now always present (fixes C1).
- **Tests:** replace the `FakeD1` SQL-regex suites with Miniflare/Wrangler integration tests;
  add the missing coverage (Google OAuth, account-linking, sign-out, session isolation).

### Phase 2 — Profile & account self-service (the "make it perfect" features) (~2–3 weeks)
> **Designed in full** in `docs/design/onboarding-signin-profile-design.md` (§4 main-platform pages +
> §2.2 new primitives + §3 step-up model) and wired in `docs/profile-onboarding-implementation.md`.
> Scope beyond the bullets below: redesigned sign-in/sign-up, **forgot/reset password**, **email
> verification** screen, a **stepped onboarding flow** (replacing the bare username box), a **settings
> hub** (`/settings/{profile,account,security,api-keys,notifications,appearance,danger}`), the new
> shared primitives (Field, PasswordField, Toggle, Tabs, Avatar, AvatarUploader, Dialog, StepUpDialog,
> ConfirmDialog, SettingRow, CopyField, Stepper, Callout), and **retiring `components/auth-ui.tsx`**.
> **Sensitivity rule:** cosmetic edits (avatar, bio, display name, visibility, theme) save instantly;
> identity/security changes (email, username, password, 2FA, sessions, unlink, deactivate/erase)
> require **step-up re-auth** (current password, or provider/email-OTP for passwordless users).
- **Shared `<Avatar image initial provider>` component** used by nav, profile header, arena;
  renders `user.image` with an initials fallback and a provider-derived (not hardcoded) tint;
  accessible (`role="img"`, alt, WCAG contrast). **Rewrite `e2e/arena-auth.spec.ts:110-112`** to
  assert the image *does* render (fixes C5/U7/O7).
- **Avatar upload:** R2-backed upload endpoint; store the URL in `user.image` (email/password
  users get an avatar).
- **Profile edit:** owner-only `PATCH /api/profiles/[username]` for
  `displayName/bio/location/websiteUrl` with validation + length caps; editable form replaces the
  read-only rows (fixes U2, O6). Render bio/location/website on the public header.
- **Visibility:** wire the toggle to `profiles.visibility`, honor `public/unlisted/private` in
  `getPublicProfileByUsername`, define `unlisted` semantics (fixes U3, D7). Remove/retarget the
  onboarding copy.
- **Username change** (BA username plugin, with old-URL alias handling) and **email change**
  (BA change-email, verified) (fixes U5).
- **Password reset/forgot/change** (BA native) surfaced in login + settings (fixes **U1**).
- **Session management:** "Active sessions" list + "log out everywhere" using BA endpoints
  (fixes U6/S7). Drop `userId` from the public profile payload (S12).
- **Linked providers:** list + unlink (BA) (fixes U8).

### Phase 3 — Trinity on Better Auth (~1.5–2 weeks; can overlap Phase 2)
> **Designed in full** in `docs/design/onboarding-signin-profile-design.md` §5: Trinity chrome re-skin
> into the design system, **Trinity-host sign-in / set-password / forgot-password** screens, the
> `/trinity-info` access-request redesign, **full `/trinity/users` CRUD** (create, change role,
> deactivate/reactivate, force-session-revoke, revoke linked API keys — via the admin plugin) with a
> detail drawer, access-request review, an **operator self-service** account/security surface, and one
> reusable `TrinityTable`/`TrinityDetail` pattern lifting the ~18 resource pages into the system.
- Stand up the **Trinity instance** (own `TRINITY_DB`, `cookiePrefix="eslams.trinity"`, 8h,
  admin plugin). Trinity users log in **directly on `trinity.eslams.com`** → **remove the
  `trinityauthcodes` bridge** (S8/S9/S14 surface gone).
- **RBAC via `createAccessControl`** — one matrix, fail-closed (fixes S4/S6); scope `operator`
  (S5); reserve `set-role:admin` to `super_admin` + two-person control (S5/S10); collapse the
  3-way `effectiveTrinityRoleSql` duplication into the single AC definition (D5).
- Map `status='disabled'`→ admin-plugin `banned`; **native list/create/ban/impersonate/
  revoke-sessions**; on disable, revoke linked platform API keys (S15) and force session kill
  (U9). Add FKs to audit actor columns where feasible (D4); single role source (D3/D6).
- Gate the localhost/dev bypass behind an explicit env flag; fail-closed if `TRINITY_DB`
  unbound in non-local envs (S9).
- Add negative-authz tests for **every** admitted role and a resolver-level cross-identity
  isolation test.

### Phase 4 — Hardening & compliance (~2 weeks + Compliance/Legal lead time)
- **Erasure/retention (Compliance/Legal review first):** self-service **deactivate** (soft state
  + hide profile + revoke sessions) and a **queued erasure request** routed to the data owner
  (not an unconditional hard delete, per record-keeping rules) (U4/O2). Add a **scheduled cron**
  (`wrangler.jsonc triggers`) to purge expired sessions/verifications (O2).
- **Audit immutability:** append-only enforcement (trigger or write-path invariant) + external
  export/hash-chain (O3).
- **Bot defense:** Cloudflare Turnstile on signup/reset; disposable-email/MX checks (O4).
- **Observability:** structured auth-event logs + alerting (failed-login spikes, CSRF/state
  mismatches, Trinity privileged logins); stop swallowing errors (O5).
- **API keys:** decide whether to adopt the Better Auth `apiKey` plugin or keep the app table;
  align scopes.
- Clean up dead schema (D6/D7/D8), documentation, and the `security-and-secrets.md` /
  `trinity-roles.md` docs.

---

## 8. Data migration specifics

- **Password hashes (PBKDF2 → scrypt):** verify-and-rehash-on-login shim (Phase 1). Users who
  never return keep the legacy hash until they log in; optionally force-reset dormant accounts
  after N months. No mass re-hash (can't — we don't have plaintext).
- **Sessions:** not portable → invalidate all, require re-login (hard cutover). Communicate the
  window.
- **Usernames:** `profiles.username` → `user.username` (username plugin normalizes to lowercase);
  reconcile any mixed-case rows during backfill (fixes the C2 "unreachable row" case).
- **Accounts:** `authaccounts` rows map 1:1 to `account`; ensure `providerId` values match Better
  Auth's expectations (`github`/`google`/credential).
- **Trinity:** `trinityusers.role`/access-profile → single `user.role` (admin plugin);
  `status` → `banned`.
- **In-flight tokens break at cutover.** Pending email-verification tokens and Trinity set-password
  invites were hashed by the old code and are **not portable** to Better Auth's `verification` format.
  Treat them as invalidated — users re-request verification and invites are re-issued after cutover.
  Call this out explicitly in the maintenance-window comms.
- **Idempotency & rollback:** run backfill into the *new* tables (old tables untouched). Rollback is
  "flip the `AUTH_V2` flag back" — **but this is only clean up to the first Better Auth *write*.** Once BA
  accepts real writes (a login rehash to `account.password`, a new signup, a profile edit), those rows
  live **only in the new tables**, so a rollback after go-live would silently lose them. Mitigation: keep
  the cutover window short; if a rollback is required post-write, **forward-migrate the new-table deltas
  back** into the old tables rather than discarding them. Keep old tables read-only for one release before
  dropping — and per record-keeping rules, **archive rather than hard-drop** on the final cleanup.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Better Auth on Workers/OpenNext runtime quirks (async-init/singleton) | Phase 0 spike proves it end-to-end before committing; the community `zpg6/better-auth-cloudflare` OpenNext example + Hono example as references. Build the auth instance lazily per request from env bindings. |
| Password rehash hook doesn't fire / can't persist | Phase 0 proves the `password.verify` (legacy accept) + post-sign-in `databaseHook` (rehash-and-store) pairing on real D1 before Phase 1 relies on it. |
| D1 lacks interactive transactions | Better Auth uses D1 `batch()` natively; avoid custom multi-statement transactions. |
| Email delivery blocks password reset (O1) | Resolve sender in Phase 0 — it gates U1. |
| Test suite is SQL-coupled and will go red wholesale | Budget the Phase 1 test rewrite explicitly; add real-D1 integration tests; treat the avatar e2e invariant as a *deliberate* change. |
| Session hard-cutover logs everyone out | One-time, expected for a public app; announce; far safer than a dual-read shim. |
| Trinity boundary regressions during migration | Two separate instances + `cookiePrefix`; add the missing resolver-level isolation test *before* cutover. |
| Auto-linking behavior change surprises existing merged accounts | Audit existing email-collision merges before enabling BA linking; require verified email. |
| DB migration applied without sign-off | All schema edits flagged; migrations run only after explicit approval (org rule). |

---

## 10. Decisions needed (open questions)

The migration itself is **decided** (see §0). These are the remaining **tactical** choices to lock during
Phase 0/1 — none of them change the direction:

1. **Session cutover:** hard invalidate-all (recommended) vs. a dual-read compatibility window?
2. **API keys:** adopt Better Auth `apiKey` plugin, or keep the current `apikeys` table?
3. **Trinity provisioning:** keep the env-var admin allowlist for bootstrap only, or move fully to
   admin-plugin `createUser` + invite?
4. **Erasure model:** confirm with Compliance the soft-deactivate + queued-erasure design and the
   retention period for `sessions.ipaddress`/`useragent`.
5. **Email sender:** Cloudflare Email Routing (verified-recipients limit) vs. Resend/SES/MailChannels.
6. **`profiles` table:** keep as an app-owned domain table (recommended) vs. fold bio/location/etc.
   into Better Auth `additionalFields`.

---

## 11. Profile & onboarding UX programme (design)

The migration (Phases 0–1) fixes the *platform*; Phases 2–3 then build the *experience* on top. That
experience is specified in two companion docs so design and engineering can proceed in parallel:

- **`docs/design/onboarding-signin-profile-design.md`** — the design spec. First-principles onboarding
  and profile flows; **every page and state** for the main platform (sign in, sign up, forgot/reset
  password, verify email, a **stepped onboarding flow**, public profile, and a full **settings hub**:
  profile / account / security / api-keys / notifications / appearance / danger) and for **Trinity**
  (chrome re-skin, sign-in, set-password, forgot-password, access-request, **full operator CRUD**,
  operator self-service, and a reusable resource table/detail pattern). Includes the **new shared
  primitives** the system lacks (Field, PasswordField, Toggle, Tabs, Avatar, AvatarUploader, Dialog,
  StepUpDialog, ConfirmDialog, SettingRow, CopyField, Stepper, Callout, RoleBadge) and a full page
  inventory (§6). It closes `DESIGN_BRIEF.md §13` gaps **P1 #10** (split-screen auth) and **P2 #12**
  (onboarding/settings/Trinity chrome undesigned).
- **`docs/profile-onboarding-implementation.md`** — the build note. Grounds each screen in real
  endpoints (what Better Auth provides vs new app routes), the data model, the **avatar upload (R2)**
  path, validation rules, analytics, tests, and the **step-up (password-verification) mechanism**.

**The one product rule these encode:** the profile is *fully editable*, but **only cosmetic changes are
instant** (avatar/picture, display name, bio, location, website, visibility, theme). **Every
identity/security change is gated by step-up re-authentication** (email, username, password, 2FA,
session revoke, provider unlink, deactivate/erase) — implemented as a Better Auth *fresh-session* gate,
with a provider/email-OTP fallback for OAuth-only users who have no password.

These are **design + implementation specs, not built code**; they slot into Phase 2 (main) and Phase 3
(Trinity) above and inherit all process guardrails (no auto-applied migrations; Compliance/Legal review
for erasure copy).

---

## Appendix A — Source of findings

Produced by a mapping→critique→verification workflow over commit `3682b5d`. All high/critical
findings were independently re-verified against code (`[V]` in the ledger). Two critic passes
(data-model, consistency/avatar) failed on transient API-overload; their scope is covered by the
data-model mapper (§3.3), the correctness critic (§3.2), and a first-hand avatar trace (C5/U7).

**Review re-verification (2026-07-07, commit `3682b5d`).** A second, independent pass re-checked twelve
representative findings directly against code — the ~2,000-line hand-rolled `apps/web/lib/auth.ts` with
`BETTER_AUTH_SECRET` used only for HMAC (no BA runtime); no password recovery of any kind; OAuth auto-link
via `SELECT id FROM users WHERE lower(email)=lower(?)` (`auth.ts:958`); host-conditional `Secure`
(`auth.ts:1854-1856`); no CSRF/Origin defense; the hardcoded-`disabled` visibility toggle
(`platform-pages.tsx:6973`); the GET-only profile route; the fetched-but-never-rendered avatar with
hardcoded `providerColor("google")` / `("anthropic")`; the two-column username uniqueness
(`schema.ts:11,179`); the three-way `effectiveTrinityRoleSql` duplication (`auth.ts:648`, `http/auth.ts:32`,
`trinity.ts:249`); the `emailVerified` drop in `getSessionUserFromToken`; and the `FakeD1` SQL-regex tests
plus the `e2e/arena-auth.spec.ts:111-112` avatar-absent assertion. **All twelve confirmed.** Infra
confirmed: OpenNext + Workers + D1 + Drizzle, `send_email` binding present, and **no cron `triggers`** in
`wrangler.jsonc` (O2 stands). Because C2/C3/D1 (the username cutover) ride the Phase 1 critical path, the
data-model deep-dive is a **required Phase 1 pre-requisite.**
