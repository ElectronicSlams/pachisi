# eSlams Mobile App - the build plan

**What:** the eSlams consumer mobile app (iOS + Android), end to end - app, all 36 Arena
renderers, auth + phone verification, platform-wide search and private-profile follow
approvals, Bayesian human ratings, unified notifications with a Trinity console, analytics,
testing, and store launch. **One build. No product phases. No reduced game set. No timeboxes.**
A fleet of agents may execute the work in parallel, but the release scope is the complete
system described here. Steps are ordered by dependency; a step may start once the steps it
names are merged.

**Repo:** this monorepo (`eSlamsPlatform`), app at `apps/mobile`. No new repositories.
Platform changes ship in the same monorepo and cover web, app, API, Worker, D1, queues, and
Trinity where specified.

**Reads with:** `docs/design/DESIGN_NOTE_mobile_app.md` (product intent),
`Complete HTML prototype of mobile app/CHANGE_REQUEST_v2.md` + `CHANGE_REQUEST_v3.md`
(agreed visual changes), and the **v3 prototype** (`~/Downloads/eSlams/eslams-app-v3/`) as
the visual reference. The prototype may show 38 games and older flows. Where any source
conflicts with this plan, **this plan wins**. No replacement design file is required.

## Decisions ledger (all settled - do not relitigate)

| Decision | Value |
|---|---|
| Delivery model | **One complete end-to-end build**, all 36 mobile Arena games, executed by a coordinated fleet of agents against shared contracts. No pilot game, reduced renderer set, or staged feature subset |
| Design authority | This build plan is canonical. The v3 prototype supplies visual grammar only. Functional, content, catalogue, privacy, and flow conflicts resolve in favor of this plan |
| Stack | Expo (React Native), TypeScript strict, Expo Router, zustand + react-query, react-native-skia, Reanimated, EAS |
| Bundle ID / scheme | `com.eslams.app` - `eslams://` - universal links on `eslams.com` |
| Min OS | iOS 16 - Android 8 (API 26) |
| Renderer | **New GPU renderer using react-native-skia - no DOM/SVG port and no web-parity fallback.** Materials, physics, camera, touch hit-testing, haptic detents |
| Replay compatibility | Scene, display-frame, replay, renderer, and theme-token schemas are explicitly versioned. Old replays must continue rendering after app and renderer upgrades |
| Themes | 6 token sets: Classic Light, Classic Dark, Neon, Club, Arcade, Midnight. First installation uses `Use system`, mapping to Classic Light or Classic Dark and following OS changes. The first-run theme screen still appears and allows all six themes |
| First launch | Native splash -> first-install theme choice -> Battlefield. No authentication, username, pact, or phone screen at launch |
| Landing | Battlefield first; dock = Battlefield - Arena; fullscreen Stage for play/watch/replay |
| Authentication boundary | Browsing, watching, search, public/private profile shells, Arena discovery, opponent selection, and match setup are anonymous. Authentication begins only for an identity-dependent action such as Start match, Follow, notifications, or account sync |
| App game catalogue | **36 games** = platform's 38 minus `leduc-holdem` and `shedding-card-game`. Expected launch counts: All 36 - Board 16 - Card 15 - Social 5. Both excluded games remain on web and may appear as watch-only Battlefield content. Counts are derived from one capability manifest, never hard-coded independently |
| Arena discovery | Resume first -> last setup -> favourites -> recent games -> filters -> full catalogue. Two columns on narrow phones, three on larger phones. One grid, no category dividers, no browse toggle |
| Search | Global expanding header search on Battlefield, Arena, and Profile. Searches games, models, and people using the platform search engine. Provider queries resolve to matching models; there are no provider pages in the app |
| Model interaction | **No mobile model pages.** A model result opens a compact action sheet with availability, Follow, compatible games, and Play. With a game already selected, tapping a compatible model selects it immediately |
| Profiles and Follow | Human profiles exist in the app. Public-profile follows are immediate. Private-profile follows require owner approval and then unlock the full profile. This is a platform-wide web + app + API + D1 + notification change |
| Profile visibility | New users explicitly choose Public or Private, with no preselected choice. Private profiles remain searchable and followable, but only approved followers see full statistics, rating, match history, and activity |
| Match/replay visibility | `public` - `followers` - `only_me`. Public-profile default = public. Private-profile default = followers. Per-match override is always available |
| OTP | **Firebase phone auth, live from alpha, always required before a mobile Arena match.** It verifies a mobile account, not a unique human. Better Auth remains the identity authority |
| Attestation | App Attest (iOS) + Play Integrity (Android), using a one-time server challenge, gating phone verification and stamped into provenance |
| Auth | Better Auth remains the only identity system. SSO: Apple + Google + GitHub + email. Existing email verification, password reset, TOTP, backup-code, trusted-device, and account-linking flows must work in mobile |
| Active session | One active human Arena session per user across web and app. Human inactivity expiry = 7 days. Model hard timeout = 120 seconds, server-authoritative |
| Timeout result | At 120 seconds the session exposes Claim the win. The result is `model_timeout_award`, clearly labelled, preserved as evidence, and excluded from ratings, best scalp, model performance, and normal win rate |
| Human rating | A separate methodology-versioned Bayesian system based only on eligible human-vs-model Arena matches. It never mixes with the official model leaderboard |
| Notifications | Extend the existing notification feed, preferences, outbox, email delivery, and scheduled processing. Add app centre + Expo push + receipts + Trinity campaigns. Social graph events include follow requests and approvals |
| Account deletion | Delete identity and personal data across all systems. **Never delete gameplay, results, events, replays, or research evidence.** Retained evidence is irreversibly anonymised as `Deleted player` |
| Win celebration | Theme-aware physics confetti on a normal win only; reduced-motion -> accent sweep. No full celebration for timeout awards |
| Reasoning and rules | Full `public_explanation` shown. Ledger uses player-language actions, never raw cells or anonymous seat labels. Every game has a short summary plus full rules, turn example, legal-action explanation, and scoring explanation |
| Analytics | Firebase Analytics (GA4, no-IDFA config), Microsoft Clarity mobile SDK from beta, Sentry. Langfuse remains server-side. Sensitive fields are masked and never emitted as analytics parameters |
| Offline | Read-only cache: last 20 replays, LRU, <=50MB. Private content is encrypted and namespaced by user. Play requires network |
| Quality through beta | **Local QA only.** No cloud quality automation or automated repository test suite. The only standard automated health scan is React Doctor, run manually on a developer machine. Functional, contract, renderer, Maestro, accessibility, real-device, and performance QA is invoked locally only when relevant, with a named integration/QA owner signing off each beta candidate |

---

## Steps

### Workspace & shared contracts

**Step 1 - Scaffold `apps/mobile` and establish fleet ownership.**
`pnpm create expo` into `apps/mobile` using the current stable Expo TypeScript template, then
fit it to the monorepo:

```js
// apps/mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, "../..")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];
module.exports = config;
```

```ts
// apps/mobile/app.config.ts
export default {
  name: "eSlams",
  slug: "eslams",
  scheme: "eslams",
  ios: { bundleIdentifier: "com.eslams.app", supportsTablet: false },
  android: { package: "com.eslams.app" },
  plugins: [
    "expo-router",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "expo-secure-store",
    ["@sentry/react-native/expo", { organization: "eslams", project: "mobile" }],
  ],
};
```

Wire the app into Turbo (`lint`, `typecheck`, `test`, `build`), reuse the root eslint and
TypeScript discipline, and add local scripts mirroring the web app. Establish workstream
ownership before code fans out:

- shared contracts and schemas: one designated owner;
- Skia renderer families: separate agents, all consuming the same registry and fixtures;
- shell/search/profile surfaces: one owner;
- auth/phone/attestation: one owner;
- platform sessions/social graph/ratings/notifications: explicit owners;
- integration and release: one owner with merge authority over cross-workstream contracts.

Add CODEOWNERS or an equivalent review map. Agents may not independently redefine API
payloads, D1 schemas, theme tokens, renderer inputs, result semantics, or visibility rules.

**Step 2 - `packages/theme-tokens`: six themes plus system behaviour.**
Keep one source of truth for app materials and shared brand values. Classic Light/Dark use
the approved platform values, including light `text-3: #666672` and dark `#9a9aa5`.

```ts
export type ThemeId =
  | "classic-light"
  | "classic-dark"
  | "neon"
  | "club"
  | "arcade"
  | "midnight";

export type ThemePreference = "system" | ThemeId;

export type ThemeTokens = {
  readonly id: ThemeId;
  readonly mode: "light" | "dark";
  readonly color: Record<TokenName, string>;
  readonly ink: {
    readonly mark: string;
    readonly pieceA: string;
    readonly pieceB: string;
  };
  readonly material: {
    readonly boardSurface: "flat" | "wood" | "felt" | "phosphor" | "glass" | "void";
    readonly glowBudget: "none" | "accent-only";
    readonly moveTrail: boolean;
  };
};
```

`system` is behaviour, not a seventh theme. It resolves to Classic Light or Classic Dark and
tracks OS changes. A manual theme choice disables system following. Theme choice is
installation-local and requires no account. Export TS objects, CSS blocks where useful, and
a JSON snapshot for visual tests. Contract tests require AA text contrast, one accent, stable
win/loss/draw semantics, and glow only on approved accent-carrying elements.

**Step 3 - Versioned game, scene, replay, search, and mobile-capability contracts.**
Create or extend shared packages so web, Worker, and app cannot drift:

- `packages/game-render-contract`: public frame -> renderable scene pure functions;
- `packages/search-contract`: typed search groups and native-safe targets;
- `packages/core-types`: mobile capability manifest and visibility/rating/session enums.

```ts
export type SceneEnvelope = {
  readonly sceneSchemaVersion: "eslams.scene.v1";
  readonly displayFrameVersion: string;
  readonly gameSlug: string;
  readonly rendererFamily: GameRendererFamily;
  readonly rendererVersion: string;
  readonly minimumAppVersion: string;
  readonly scene: BoardScene;
};

export type MobileGameCapability = {
  readonly enabled: boolean;
  readonly category: "board" | "card" | "social";
  readonly rendererFamily: GameRendererFamily;
  readonly inputMode: InputMode;
  readonly supportsOfflineReplay: boolean;
  readonly minimumAppVersion: string;
};
```

The canonical manifest excludes only `leduc-holdem` and `shedding-card-game` from mobile
Arena. Derive 36, category counts, renderer coverage, search playability, game filters, and
tests from the manifest. The two excluded games remain valid replay/watch content.

Version `public_state`, `display_frame`, scene, replay manifest, renderer, and theme-token
contracts. Add backward adapters and fixture tests so old replays remain renderable after
future app upgrades. Web's existing renderers migrate to the same scene builders without a
visual redesign.

Search responses retain web `href` where needed but add a typed target so mobile never
parses URLs:

```ts
export type SearchTarget =
  | { kind: "game"; gameSlug: string; mobilePlayable: boolean }
  | { kind: "model"; modelEntryId: string; providerSlug: string; modelSlug: string }
  | { kind: "person"; userId: string; username: string; visibility: "public" | "private" }
  | { kind: "provider"; providerSlug: string };
```

**Step 4 - EAS project, environments, and secrets.**

```jsonc
// apps/mobile/eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": { "production": { "ios": {}, "android": {} } }
}
```

Use separate development, preview, and production values for API origin, Firebase,
attestation, push, Clarity, and Sentry. EAS secrets include Firebase service files,
`SENTRY_AUTH_TOKEN`, `SENTRY_DSN`, `CLARITY_PROJECT_ID`, and environment-specific public API
origins. Development uses a custom dev client, not Expo Go, because Firebase Auth, Skia,
attestation, and native SDKs are required.

### The renderer (the product)

**Step 5 - `packages/board-skia`: complete renderer registry for all 36 Arena games.**
Use react-native-skia + Reanimated worklets. Every renderer consumes the shared scene and
theme contracts:

```ts
export interface FamilyRenderer {
  readonly family: GameRendererFamily;
  render(
    canvas: SkCanvas,
    scene: BoardScene,
    theme: ThemeTokens,
    motion: MotionState,
  ): void;
  hitTest(point: Point, scene: BoardScene): ActionTarget | null;
  accessibility(scene: BoardScene): readonly AccessibleBoardNode[];
}
```

Implement all families and every game-specific exception in the same release:

- `grid_3x3`: stroke-drawn marks, ultimate-board focus, win-line draw;
- `connect_four`: spring gravity drop with the system's single controlled bounce;
- `square_board`: chess/checkers movement, captures, Othello flip-wave, Battleship fog;
- bespoke board layouts: Mancala sowing count-off, Morris mill flash, Pentago quadrant
  rotation, Backgammon bar/bear-off, Shogi and Xiangqi coordinates;
- `go_board`: stone settle, group capture, Gomoku zoom and fat-finger loupe;
- `hex_board`: edge identity and terminal chain trace;
- simultaneous games: payoff matrices, auctions, Rock Paper Scissors, Goofspiel reveals;
- dice: cup shake, count-only honesty, terminal reveal;
- cards: shared primitive, fan/deal, trick collection, poker table seats, Hanabi inverted
  visibility, Blackjack dealer framing;
- economic/social panels: offers, bids, bargaining and negotiation state;
- control benchmarks: all watch/replay families used by Battlefield posters.

Materials are SkSL effects driven by `theme.material`: Club wood/felt, Neon accent bloom,
Arcade phosphor persistence, Classic flat restraint, Midnight near-void hairlines. Bloom may
bind only to the last-move ring, active-seat underline, active dock state, and result sweep.
Every motion beat maps to a static final state under reduced motion. Automatic quality tiers
may reduce shader detail, trails, bloom, and preview animation on constrained devices, but
must preserve layout, information, and game identity.

**Step 6 - Golden-image, semantic-scene, and compatibility matrix.**
Offscreen-render canonical scenes per family per theme and compare to approved goldens. Use
semantic scene snapshots before pixels so logic regressions are distinguished from minor
GPU/font differences. The matrix covers 12 renderer families x 6 themes, plus every one of
the 36 games with:

- initial state;
- ordinary active turn;
- last move or last action;
- capture/reveal/hidden-information state where relevant;
- terminal win/loss/draw or placement state;
- replay from an older supported schema version;
- reduced-motion rendering;
- accessibility representation.

Use a pinned reference environment and explicit tolerances/masks for shader noise and font
rasterisation. A wrong win line, card visibility leak, coordinate error, broken replay
adapter, or theme-contract violation is a local release blocker and must be fixed before QA
sign-off.

**Step 7 - Splash, first-install theme selection, icons, and sound.**
Cold start sequence:

1. Native splash in system light/dark.
2. Skia brand beat: mark strokes on -> lattice/game gestures -> wordmark +
   `Here, AI plays games.` Hard cap 2.5 seconds; tap-to-skip after the first run;
   reduced-motion = static mark + tagline.
3. On the first launch of each installation, show the theme screen before Battlefield.

The theme screen has `Use system` selected initially, shows the resolved Classic Light or
Classic Dark preview, and displays all six live mini-board choices. Continue is always
available. No sign-in is requested. The screen never reappears automatically after its
first completion; Settings -> Appearance remains available later.

Ship the store icon variants plus six themed alternate icons. Bundle the short piece-arrival
notification sound, per-family move cues, and result chord. Respect silent mode and provide
independent sound and haptic settings.

### Shell, state, offline

**Step 8 - Navigation shell, global search, typed actions, and deep links.**
Expo Router routes:

- `(tabs)/battlefield` initial;
- `(tabs)/arena`;
- `hvm-board`;
- `profile/[username]` and own `profile`;
- `follow-requests`, `followers`, `following`, `notifications`, `settings/*`;
- modal group `stage/play`, `stage/watch`, `stage/replay`.

The floating dock contains Battlefield and Arena. A now-playing bar renders immediately
above the dock whenever an active session exists and the Stage is not open. It follows the
same cross-device active-session state as web. Normal top chrome is:

`Trophy | screen title | search | avatar`

The avatar carries the unified unread-notification badge.

The search icon appears on Battlefield, Arena, and Profile, immediately before the avatar.
It is absent from the fullscreen Stage. On tap, it expands across the same header height,
hides the normal title/chrome, autofocuses, shows Back/Cancel and Clear, and pins while
results scroll. Preserve the underlying screen and scroll position when closing.

Visible scopes: `All - Games - Models - People`. Contextual ordering:

- Battlefield: All;
- Arena: Games and Models first;
- Profile: People first;
- selected-game roster: Models only, filtered by `allowedGames`.

Reuse the platform search service, including bounded normalisation, two-character minimum,
typo handling, and remote debounce. Move the server implementation into a shared service or
Worker route so web and app use one ranking/index. Private profiles are searchable unless
blocked; legacy `unlisted` profiles remain undiscoverable until their owner chooses Public
or Private.

Mobile result actions:

- game -> game sheet; excluded games -> watch-only Battlefield result;
- model -> compact model action sheet with provider, availability, Follow, compatible
  games, and Play;
- person -> public or restricted private-profile screen;
- provider -> inline provider-filtered model results, never a provider page.

With a game already selected, tapping a compatible model selects it immediately and closes
the roster. Search zero-state shows Continue match, favourite games, recent games, recent
opponents, followed people/models, and recent searches where available.

Deep links: `eslams://match/:id`, `eslams://replay/:id?turn=n`,
`eslams://game/:slug`, `eslams://profile/:username`, `eslams://board`, and universal-link
equivalents. AASA and Android asset links are served by `apps/web`.

**Step 9 - Data layer, anonymous state, offline storage, and permission revocation.**
Use react-query for server data and zustand for navigation/session/UI state. Persist only
approved query classes through MMKV. Better Auth tokens remain in SecureStore and are never
stored in react-query or MMKV.

Anonymous users can keep favourite games, recent games, recent opponents, recent searches,
theme choice, and a prepared match locally. On sign-in, merge account-synchronised
favourites deterministically without discarding local intent.

Offline behaviour:

- completed/watched replays cache automatically, maximum 20 and <=50MB LRU;
- public replays may use the shared cache;
- followers-only and only-me replays use an encrypted, per-user namespace;
- wipe private namespaces on sign-out, account switch, account deletion, or failed access
  revalidation;
- exclude private cache files from device backup where supported;
- Battlefield posters degrade to cached end states with an `Offline` chip;
- Arena discovery remains browsable from cache, but Start match clearly requires network.

Live reconnection uses WebSocket snapshot-on-connect and `GET /api/arena/sessions/:id` poll
fallback. Surface a quiet reconnecting ribbon, never a blocking modal.

### Auth, OTP, attestation

**Step 10 - Better Auth mobile client and complete existing-account flows.**
Use the Better Auth Expo client with SecureStore. Configure the client with the platform's
actual cookie prefix:

```ts
expoClient({
  scheme: "eslams",
  storagePrefix: "eslams",
  cookiePrefix: "eslams",
});
```

Update trusted-origin handling so custom schemes are preserved as schemes/patterns rather
than passed through `new URL(value).origin`, which drops native origins. Trust the exact
mobile scheme, approved universal-link origins, staging, and development origins.

Support Apple, Google, GitHub, and email. Mobile must cover the platform's existing states:

- email verification and resend;
- password reset;
- TOTP challenge;
- backup-code challenge;
- trusted-device handling;
- provider linking and unlinking;
- account-linking conflicts;
- deactivated/deleted account handling.

The session channel is stored as a server-only Better Auth additional field (`input: false`).
After auth, the app calls `POST /api/mobile/session/bind` with its installation ID and a
`bind_session` attestation challenge. Only that verified server path may update the current
session to `client = mobile` and attach `mobileinstallationid`. Never trust a generic header
or request body value for the channel.

Any identity-dependent action creates a serialisable pending intent before auth. Examples:
selected game, exact model, seat map, side, visibility, Follow target, or notification deep
link. After auth and any required account completion, return directly to that intent.

**Step 11 - Firebase phone verification as a Better Auth account stamp.**
Phone verification is required only before starting a mobile human Arena match. Browsing,
watching, searching, and following require normal authentication where needed, but not a
phone stamp.

Use neutral copy such as `Verify your mobile account`. Do not claim one number equals one
human or that the system proves a unique person.

The app uses `@react-native-firebase/auth` for SMS send and code confirmation. The Worker
accepts the resulting Firebase ID token only after an authenticated mobile Better Auth
session and a valid attestation challenge.

Verify Firebase tokens against Google's published secure-token X.509 certificates, cached
by `kid`; do not treat the certificate endpoint as JWKS. Enforce:

- expected algorithm;
- `kid` certificate match;
- signature;
- `exp`, `iat`, and bounded `auth_time`;
- exact `aud` and `iss`;
- non-empty `sub` / Firebase UID;
- `phone_number` claim;
- one-time challenge binding and request replay protection.

Store the relationship in a dedicated verification table, not raw editable user fields:

- normalised E.164 number used only during verification;
- keyed HMAC for uniqueness and lookup;
- optional encrypted number only if recovery requires it;
- last four digits for display;
- Firebase UID, one-to-one with Better Auth user;
- verification timestamp, status, reuse cooldown, recovery/appeal state, and key version.

A number already bound to another active account returns a clear recovery state, not a
claim about identity. Add rate limits by user, installation, phone HMAC, IP risk signal, and
Firebase response. Firebase test numbers with fixed codes support development, local QA,
and store review.

**Step 12 - Device attestation with a one-time server challenge.**
Use App Attest on iOS and Play Integrity on Android. The app first requests a short-lived
server challenge containing nonce, installation ID, session ID, purpose, issued time, and
expiry. The attestation assertion signs/binds that challenge; the Worker verifies provider
response, app identity, environment, nonce, freshness, and non-reuse before accepting phone
verification.

Persist installation and attestation metadata separately from user identity. Stamp the
accepted provider, verdict class, installation ID, app version/build, challenge ID, and
verified timestamp into match provenance. Production has no generic bypass. Development, local QA, and store review use explicit
environment-scoped test identities and signed test configuration, never a public bypass
parameter.

### Platform workstreams

**Step 13 - Mobile identity, installation, and provenance migration.**
Use the next available migration number at implementation time; the illustrative name below
assumes `0038`:

```sql
-- packages/db/migrations/0038_mobile_identity_and_provenance.sql
ALTER TABLE sessions ADD COLUMN client TEXT NOT NULL DEFAULT 'web';
ALTER TABLE sessions ADD COLUMN mobileinstallationid TEXT;

CREATE TABLE mobilephoneverifications (
  id TEXT PRIMARY KEY,
  userid TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  firebaseuid TEXT NOT NULL UNIQUE,
  phonehmac TEXT NOT NULL UNIQUE,
  phoneciphertext TEXT,
  phonelast4 TEXT NOT NULL,
  status TEXT NOT NULL,
  verifiedat INTEGER NOT NULL,
  reuseallowedat INTEGER,
  keyversion INTEGER NOT NULL,
  recoveryjson TEXT,
  createdat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL
);

CREATE TABLE mobileinstallations (
  id TEXT PRIMARY KEY,
  userid TEXT REFERENCES users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  appversion TEXT NOT NULL,
  buildnumber TEXT NOT NULL,
  attestationprovider TEXT,
  attestationverdict TEXT,
  attestationkeyid TEXT,
  lastattestedat INTEGER,
  createdat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL
);

ALTER TABLE matches ADD COLUMN clientchannel TEXT;
ALTER TABLE matchseats ADD COLUMN provenanceversion TEXT;
ALTER TABLE matchseats ADD COLUMN installationid TEXT;
ALTER TABLE matchseats ADD COLUMN phoneverifiedat INTEGER;
ALTER TABLE matchseats ADD COLUMN attestationprovider TEXT;
ALTER TABLE matchseats ADD COLUMN attestationverdict TEXT;
ALTER TABLE matchseats ADD COLUMN provenancejson TEXT;
```

Update all representations together:

- `packages/db/src/schema.ts`;
- `packages/auth/src/db-schema.ts` and Better Auth field mapping;
- Worker domain types and generated API contracts;
- local/staging/production migrations;
- migration parser and schema contract tests.

`client` is server-controlled. Provenance has indexed/versioned first-class columns for
queryable evidence and an optional JSON supplement for non-critical details. Phone data is
never added to public profile payloads, search documents, replay events, analytics, or
research exports.

**Step 14 - Channel policy, one active session, timeout, expiry, and durable evidence.**
Introduce an authoritative active-session index because Arena Durable Objects are currently
addressed by session ID, not user ID:

```sql
CREATE TABLE arenaactivesessions (
  userid TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sessionid TEXT NOT NULL UNIQUE,
  clientchannel TEXT NOT NULL,
  status TEXT NOT NULL,
  startedat INTEGER NOT NULL,
  lastactionat INTEGER NOT NULL,
  expiresat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL
);
```

Session start uses an idempotent reservation protocol:

1. authenticate and resolve the server-bound session channel and installation;
2. for mobile, require `client = mobile`, active phone verification, and accepted attestation;
3. atomically reserve one active session for the user;
4. if another active session exists, return `409 active_arena_session_exists` with its safe
   summary;
5. start or join the Arena Durable Object using the request idempotency key;
6. release only a reservation that can be proven not to have started.

Add:

```
GET  /api/arena/active-session
POST /api/arena/sessions
POST /api/arena/sessions/:sessionId/end
POST /api/arena/sessions/:sessionId/resign
POST /api/arena/sessions/:sessionId/claim-timeout-award
```

Web and app use the same rule. Starting another match presents Resume current match or End
current match; it never silently creates a second live session. Action requests carry an
idempotency key so two devices cannot apply the same move twice.

Session semantics:

- leaving or terminating the app keeps the match active;
- the now-playing bar and web equivalent restore the same session across devices;
- human inactivity expires exactly 7 days after the last accepted action;
- expiry records `abandoned`, closes the active index, and persists every event/replay frame
  available; it is never treated as a resignation or rated loss;
- at 10 seconds of a model turn, show factual thinking status;
- at 30 seconds, offer Keep waiting or Leave app;
- at 120 seconds, the server hard-stops/ignores the late model response and exposes Claim
  the win;
- claiming writes `model_timeout_award`; declining or later expiry preserves the timeout
  evidence without a rated outcome.

Normal completion, resignation, timeout award, abandonment, and model unavailability are
separate terminal reasons. Only eligible normal results or explicit human resignation enter
human ratings. All terminal and partial evidence is retained.

**Step 15 - Platform-wide profiles, follow approvals, search, and visibility.**
This is one coordinated web + app + API + D1 change.

Extend profile visibility with `private`. Preserve legacy `unlisted` as undiscoverable and
link-only until the owner explicitly selects Public or Private; never silently expose an
existing unlisted account in search.

Add the social state required for approval and safety:

```sql
CREATE TABLE followrequests (
  id TEXT PRIMARY KEY,
  requesteruserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  targetuserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  createdat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL,
  resolvedat INTEGER
);
CREATE UNIQUE INDEX followrequests_pending_unique
  ON followrequests(requesteruserid, targetuserid)
  WHERE status = 'pending';

CREATE TABLE profileblocks (
  blockeruserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blockeduserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdat INTEGER NOT NULL,
  PRIMARY KEY (blockeruserid, blockeduserid)
);

CREATE TABLE profilereports (
  id TEXT PRIMARY KEY,
  reporteruserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  targetuserid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL,
  createdat INTEGER NOT NULL,
  reviewedat INTEGER,
  reviewertrinityuserid TEXT
);
```

Follow state machine:

- public human profile: Follow creates the existing accepted `follows` relationship;
- private human profile: Follow creates a pending request and button becomes Requested;
- requester may cancel while pending;
- owner may approve, decline, remove an approved follower, or block;
- approval atomically creates the existing follow relationship and resolves the request;
- blocking removes follows and requests in both directions and prevents search/profile
  access between the pair;
- changing Public -> Private keeps existing followers approved;
- changing Private -> Public atomically converts pending requests to accepted follows;
- model and provider follows remain immediate and never require approval.

Add APIs for request, cancel, approve, decline, remove follower, block, unblock, report,
relationship status, and paginated request lists. All writes are idempotent and emit the
existing social activity/outbox events.

Private-profile access:

- anonymous/non-approved viewer sees avatar, display name, username, bio, follower/following
  counts, lock state, and Request to follow;
- owner and approved followers see Bayesian rating, statistics, per-game performance, best
  scalp, public/followers match history, and activity;
- blocked viewers see no result/profile;
- private users are excluded from public human ladder rows, while their eligible matches may
  contribute anonymously to aggregate and model-difficulty calculations.

Move the current public search implementation into a shared service used by web and Worker.
Index public and private profiles, excluding deactivated, blocked-for-viewer, and legacy
unlisted accounts. Return relationship and access state for authenticated viewers. Preserve
the current bounded query/ranking behaviour and typed targets from Step 3.

Expand match/replay visibility everywhere from `public | private` to:

- `public`: anyone;
- `followers`: owner plus currently approved followers;
- `only_me`: owner only.

Backfill legacy private matches to `only_me`. Access is evaluated at read time, so removing a
follower immediately removes followers-only access. Web, app, artifact replay routes,
manifest/events routes, profile history, share links, and offline revalidation all use one
central visibility resolver.

**Step 16 - Bayesian human, model-difficulty, and Everyone ratings.**
Build a dedicated methodology and publication path. Reuse the official Bayesian system's
immutable-plan, hash, diagnostics, comparison, verification, and atomic-publication
principles, but do not mix its model-evaluation rows or score scale with human Arena ratings.

Recommended dedicated data model:

- `humanratingsnapshots`;
- `humanratingrows`;
- `humanratingcomponents`;
- `humanratingpairwise`;
- `humanratinginputs` or a hash-addressed input manifest.

Methodology version at launch: `human_model_arena_bayesian_v1`. Estimate eligible match
outcomes with terms for:

- human latent skill;
- human-game interaction;
- exact model-version difficulty by game;
- seat/first-player effect;
- game baseline;
- draw likelihood;
- uncertainty and effective sample size.

Publish three related views from the same human-vs-model Arena evidence graph:

- Humans: conservative human ranking;
- Models: difficulty against verified humans;
- Everyone: comparable joint posterior rows from this Arena graph only.

Never import official model leaderboard scores into Humans, Models, or Everyone. Official
model scores may appear as contextual metadata in a model action sheet, clearly labelled,
but not as this board's rating.

Eligibility:

- phone-verified mobile human seat;
- accepted device attestation and provenance version;
- exact model entry/version preserved;
- normal server-confirmed result, or explicit human resignation as a loss;
- no `model_unavailable`, timeout award, abandonment, duplicate identity, replay integrity
  failure, or flagged integrity anomaly.

Launch constants:

- provisional until 10 eligible matches;
- at least 2 distinct games;
- at least 3 exact model versions;
- same human + game + model version in a rolling 7-day period: first 3 full weight, matches
  4-10 sharply diminishing weight, later matches remain in history but add no rating weight;
- weekly view = rolling 7-day performance posterior seeded from the all-time prior;
- all-time view = full eligible history under the active methodology.

Rank by a conservative posterior score, preferably posterior P10, not raw wins. Return and
show posterior mean, conservative rank score, credible interval, effective matches, games,
model versions, W/L/D, provisional reason, and best scalp. Rating snapshots include input
hash, methodology, generation cutoff, diagnostics, and publication state.

Public endpoints:

```
GET /api/leaderboard/humans?window=week|all
GET /api/leaderboard/model-difficulty?window=week|all
GET /api/leaderboard/everyone?window=week|all
GET /api/profile/:username/human-rating?window=week|all
```

Public ladder rows include only Public profiles. Owners and approved followers may read a
private user's rating on the profile, labelled `Not publicly ranked`. Deleted users are
removed from current identity-bearing rows; anonymised historical match inputs remain.

### Unified notifications

**Step 17 - Extend the existing notification service, do not create a parallel feed.**
The repository already has notifications, notification preferences, an outbox, email
deliveries, scheduled fan-out, retry leases, and activity events. Keep those as the
canonical service. Add only mobile delivery and campaign records:

```sql
CREATE TABLE mobilepushtokens (
  token TEXT PRIMARY KEY,
  installationid TEXT NOT NULL REFERENCES mobileinstallations(id) ON DELETE CASCADE,
  userid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  createdat INTEGER NOT NULL,
  lastseenat INTEGER NOT NULL,
  disabledat INTEGER
);

CREATE TABLE pushdeliveries (
  id TEXT PRIMARY KEY,
  notificationid TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  state TEXT NOT NULL,
  expoticketid TEXT,
  attempts INTEGER NOT NULL,
  nextrunat INTEGER,
  lasterrorcode TEXT,
  createdat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL
);

CREATE TABLE notificationcampaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deeplink TEXT,
  category TEXT NOT NULL,
  channelsjson TEXT NOT NULL,
  audiencequeryjson TEXT NOT NULL,
  audiencesnapshothash TEXT,
  status TEXT NOT NULL,
  createdbytrinityuserid TEXT NOT NULL,
  approvedbytrinityuserid TEXT,
  scheduledat INTEGER,
  createdat INTEGER NOT NULL,
  updatedat INTEGER NOT NULL
);
```

Also add immutable audience snapshot rows, push receipt rows, and append-only campaign audit
records. Use the existing outbox/queue path for fan-out and its exact lease/idempotency
patterns.

Launch categories:

- follow request;
- follow approved;
- new follower;
- followed profile/model/provider activity;
- rematch waiting;
- requested match aired;
- manual new-model announcement;
- weekly digest, off by default;
- account/security notices where already supported.

Web bar, app centre, email, and push render the same notification identity and share read
state. Deep links are generated from an allowlisted typed target, not arbitrary operator
URLs. Expo sends are batched, tickets stored, receipts checked, and
`DeviceNotRegistered` tokens disabled. Ask for push permission after the first completed
normal match, never on launch. In-app notifications work regardless of push permission.

**Step 18 - Scheduled jobs, queues, expiry, and publication triggers.**
Extend the Worker's existing cron and queue configuration. Add or update jobs for:

- push ticket receipt polling;
- rematch idle-24h notification, once per eligible session;
- weekly digest;
- human Bayesian input generation and snapshot publication;
- seven-day active Arena expiry and abandoned evidence persistence;
- stale installation/token cleanup without deleting gameplay;
- notification campaign scheduling;
- existing social activity fan-out, including private-profile approval checks.

Use queues and dead-letter queues for high-fanout push/campaign work. Every scheduled run
records immutable release/run identity, processed/failed counts, retry state, and audit
evidence. `New model arrived` remains exclusively a manual Trinity action.

**Step 19 - Trinity notification, follow-safety, and rating operations.**
Extend Trinity, role-gated:

- notification audience builder: all opted-in, active-last-N-days, favourite game, followed
  model/provider, public/private profile state, and ladder segment;
- compose title/body/deep link and select in-app/email/push channels;
- send test to self;
- immutable audience preview with exact count and hash;
- schedule/cancel before send;
- per-template and global kill switches;
- delivery, receipt, opt-in, failure, and retry statistics;
- manual `new model arrived` action with exact model/version and confirmation;
- two-person approval for broad production campaigns above a configured audience threshold;
- follow-request abuse/report queue, block/report evidence, and moderation status;
- human-rating snapshot diagnostics, comparison report, publish readiness, and rollback to a
  prior published snapshot.

Secrets remain in Worker/EAS configuration. Trinity operates on D1 state and typed service
calls, never exposes provider credentials to the browser.

**Step 20 - App notification centre, follow requests, and shared preferences.**
Place the notification bell inside Profile and mirror unread count on the top-right avatar.
The feed renders the existing unified notifications and synchronises read state with web.

Follow requests have a dedicated section and screen:

- requester identity and restricted profile shell;
- Approve and Decline inline actions;
- cancellation/expired state;
- approved notification deep-linking to the now-unlocked profile;
- owner can later Remove follower or Block from followers/profile screens.

Settings -> Notifications surfaces the same preference store as web, by category and
channel. Private-profile activity is delivered only to currently approved followers, and a
relationship/access recheck occurs at fan-out time. Push registration attaches to the
installation and current user; sign-out detaches the user association and clears private
notification content from local storage.

### Surfaces

**Step 21 - Battlefield tab.**
Battlefield is the first post-theme screen and is fully useful without authentication.
Normal header includes trophy, title, expanding search, and avatar/sign-in entry.

Build:

- auto-programmed hero: best live match, else the strongest recent verified replay;
- live connection to `/api/matches/:id/live`, with `match_not_live` resolving into the
  completed poster rather than an error;
- Worth watching feed of living Skia posters, one animating at a time by viewport;
- benchmark-runs lane for the control games, labelled `solo - not matches`;
- filters for live/completed, game family, model/provider, and followed entities;
- Request a match entry at the top and feed end;
- public profile/model/game search through the shared header search.

Battlefield may show all platform replay content, including the two games excluded from
mobile Arena. Those results are labelled Watch only in app and never open an Arena start
flow.

Request a match uses the existing `match:request` service. Anonymous users may configure
game + model A + model B; submitting creates a pending auth intent. On verified replay
publication, raise `Your match aired` through the unified notification service.

Fullscreen watch uses the Stage without input. Result recruit curtain: scoreline chip,
`Think you would do better?`, and `Play {Game}`. If the game is one of the 36, open its game
sheet with the relevant model preselected. If watch-only, offer Find a similar Arena game.

**Step 22 - Arena tab and complete 36-game discovery.**
Anonymous users may browse, search, favourite, inspect rules, choose opponents, set seats,
and prepare the entire match. Authentication and phone verification occur only when Start
match is pressed.

Discovery order:

1. Continue match, when one active session exists;
2. last prepared setup;
3. favourite games, when non-empty;
4. recent games, when non-empty;
5. count/filter chips derived from the capability manifest;
6. full 36-game grid.

Grid is two columns below the approved width threshold and three columns on larger phones.
It is one continuous grid with no category dividers. Display chips are expected to read
`All 36 - Board 16 - Card 15 - Social 5`, and those values are computed and asserted from the
manifest. Favourites work anonymously and synchronise after sign-in; recent games update on
open/start and remain local-first.

Never-played users receive a rotating living hero drawn fresh from Tic-Tac-Toe, Chess,
Connect Four, and No-Limit Texas Hold'em, avoiding an immediate repeat. Resume always
outranks the rotating hero.

Add a persistent `Your opponent` module. Selecting a model through global search, the model
action sheet, a challenge action, or a roster modal updates this opponent where the game is
compatible; game-specific or per-seat overrides remain authoritative.

The model roster consumes the platform's public Arena model service, moved/shared where
needed rather than imported from `apps/web`. Use provider records for display names and
logos. Status language:

- Ready;
- Slower turns;
- Not available for this game.

Global model search opens the compact model action sheet. The sheet contains provider/logo,
public name, availability, compatible mobile-game count, Follow/Following, Choose a game,
and a direct Play {recent compatible game} action where appropriate. No model detail page
exists.

Game sheet:

- living preview from canonical fixture/scene data;
- three-line summary;
- expandable full rules;
- turn example;
- legal-action explanation;
- scoring/win/draw/placement explanation;
- accessibility instructions;
- side/seat choice;
- model wheel and searchable full roster;
- per-seat model selection for table games, with exact seat title and `allowedGames`
  filtering;
- default match/replay visibility from profile state, adjustable before start.

When Start match is pressed anonymously, persist the exact game, model version, seats, side,
visibility, and setup version, then run Step 28 and return directly to start. Do not ask the
user to configure again.

Curtain-riser shows fight card and real lifecycle status. It follows the server session
semantics: normal start, join existing idempotent start, model-thinking status, retryable
engine error, or active-session conflict with Resume/End options. It morphs into the Stage.

**Step 23 - The Stage (play).**
Portrait-first, dock and global search hidden. Frame by seat layout:

- two sides;
- table ring;
- compass;
- Blackjack: `YOU vs THE DEALER`;
- any future solo-labelled control surface remains watch-only unless the capability manifest
  enables human input.

The board is maximal and uses the shared scene plus family renderer. Include:

- neutral advantage hairline, midpoint until real terminal information exists;
- deliberation clock from server telemetry;
- full model reasoning after each model action, written before/with the visible move beat;
- family-specific touch via `hitTest`;
- legal-action dots/targets and disabled reasons;
- Connect Four drop preview;
- card fan drag/tap;
- bid controls;
- Gomoku zoom/loupe;
- premove where the game safely supports it, ghosted and cancellable;
- move/turn counter;
- per-family sound and the shared haptic grammar;
- reconnecting ribbon;
- screen-awake behaviour only while the Stage is foregrounded.

Exit sheet:

- Leave - keep the match running;
- Resign - explicit rated loss where the match is otherwise eligible;
- cancel.

Timeout UI is server-driven:

- 10 seconds: factual thinking note;
- 30 seconds: Keep waiting or Leave app;
- 120 seconds: Claim the win becomes available only after server timeout state;
- late model responses are ignored after the authoritative timeout transition.

Claim sends the idempotent timeout-award action. It never fabricates a normal model loss.

**Step 24 - Result and match visibility.**
Normal results use the approved copy voice, scoreline, outcome details, success haptic/chord,
and actions:

- Play again;
- New opponent;
- Watch replay;
- Share.

A normal human win receives one 1.5-second theme-aware physics-confetti burst. Reduced
motion uses an accent sweep. Draw and loss receive no confetti. A timeout-awarded result is
labelled `Awarded win - model timed out`, uses a restrained result treatment, and explicitly
states that it does not affect ratings or best scalp.

Visibility control is tri-state:

- Public;
- Followers;
- Only me.

Initial value comes from profile visibility: Public profile -> Public, Private profile ->
Followers. The user may override any match. Changing profile visibility later does not
silently rewrite already published matches. Every result screen explains the current
visibility in one line.

`Saved to your profile` appears only when profile/history access is valid. Public sharing of
a private user's replay is an explicit act and may show their username; Followers and Only
me links enforce access at open time.

Share card is the actual final Skia scene in the active theme with safe margins, opponent,
game, result, and eSlams mark. Never expose phone, installation, attestation, private
reasoning fields, or internal identifiers.

**Step 25 - Replay Stage and reasoning ledger.**
Replay supports watch, own history, public profiles, approved-follower profiles, notification
deep links, and offline cache. Access is checked before manifest, events, poster, and
reasoning are returned. A cached private replay revalidates when online and is purged on
403, relationship loss, sign-out, account switch, or deletion.

Build:

- filmstrip scrubber with story-beat ticks and haptic detents;
- transport and 0.5x/1x/2x/instant speed;
- terminal camera push-in;
- landscape support;
- swipe-down dismiss returning to the source screen;
- exact hidden-information perspective rules;
- backward replay adapters from Step 3.

Reasoning ledger:

- header `REASONING LEDGER - n/n turns`;
- turn number in mono;
- seat/player identity with non-colour cue;
- bold player-language action, such as `takes the centre` or `drops column d`;
- model public name and provider chip, never `Seat A reasoning`;
- full `public_explanation` body;
- expand/collapse after approximately 280 characters without truncating source data;
- current row synchronised to scrubber and accent outlined;
- no raw cells, private observations, provider secrets, or internal traces.

**Step 26 - Humans vs Models board.**
Header war banner shows aggregate eligible human-seat result rate for This week and All
time. This is labelled as an aggregate descriptive rate, not the ranking methodology.

Lens control:

- Humans, default;
- Models;
- Everyone.

Humans:

- public-profile rows only;
- conservative Bayesian rank score and rank;
- posterior interval;
- provisional state and reason;
- effective eligible matches;
- W/L/D;
- distinct games and exact model versions;
- best scalp;
- medals for top three;
- signed-in public user's row pinned when off-screen.

If the signed-in user is Private, show a private self card above the list with rating,
provisional status, and `Not publicly ranked`; do not insert them into public rank order.

Models:

- hardest for verified humans to beat under the human-Arena methodology;
- game-adjusted difficulty and interval;
- eligible human-match coverage;
- Challenge action opening the compact model action/game selection flow.

Everyone:

- joint posterior scale from the same human-vs-model Arena graph;
- species chip and interval;
- no official leaderboard score mixing;
- public human identities only;
- exact methodology and minimum-evidence disclosure.

Every profile/model row routes to profile or challenge action. No model page is introduced.

**Step 27 - Profiles, follow approvals, settings, moderation, and account deletion.**
Own profile:

- avatar, display name, username, member since;
- public/private state;
- Your standing, weekly/all-time Bayesian rating and provisional status;
- stat tiles, per-game bars, best scalp;
- match history with visibility chips;
- notification bell;
- followers, following, and pending follow requests;
- Edit profile and Settings.

Another Public profile:

- full identity, Follow/Following, counts;
- rating, statistics, per-game performance, best scalp, public match history;
- Report and Block;
- followers/following lists subject to block/privacy rules.

Another Private profile for a non-approved viewer:

- avatar, display name, username, bio, counts, lock chip;
- Request to follow / Requested / Follow state;
- no rating, statistics, best scalp, match history, or activity.

Approved followers see the full private profile and Followers-visible matches. Owners can
approve/decline from notifications or Follow requests, remove followers, and block. Follow
state is optimistic with server rollback and stays synchronised across web and app.

Settings:

- Appearance: Use system toggle, six live theme previews, alternate icon;
- Sound & haptics;
- Notifications: shared category x channel preferences;
- Privacy: Public/Private profile choice, default match visibility, blocked accounts;
- Account: email, linked providers, sessions, TOTP, backup codes, masked verified phone,
  re-verification/recovery;
- Storage: cached replay count/size and clear cache;
- Your data: plain-language research retention and visibility explanation;
- Sign out;
- Delete account.

Account deletion is a durable, retryable platform workflow, not a client-only delete:

1. require fresh authentication and explicit confirmation;
2. revoke Better Auth sessions and linked credentials;
3. delete Firebase identity and mobile phone-verification records;
4. remove phone HMAC/ciphertext, installations, push tokens, notification preferences,
   notifications where personal, profile, avatar, bio, search documents, follows, requests,
   blocks/reports where law/policy permits, and analytics user associations;
5. wipe local private caches and SecureStore;
6. remove the user from current public rating snapshots/identity-bearing views;
7. preserve every gameplay event, match, seat result, replay, artifact, rating input, and
   research record;
8. replace player identity/display with `Deleted player`, null or rotate all direct user
   references, and destroy the mapping needed to re-identify the person;
9. preserve only non-personal deletion audit evidence needed to prove completion.

Deletion copy states this clearly before confirmation. Gameplay is never deleted from eSlams
servers.

**Step 28 - User-initiated account completion and match entry.**
The first-install theme flow is Step 7, not account onboarding. After it, the user lands on
Battlefield and may remain anonymous indefinitely.

Identity-dependent actions behave as follows.

Start match, new user:

1. persist prepared match intent;
2. auth sheet: `The model is waiting.`;
3. Apple/Google/GitHub/email sign-up;
4. one combined screen: username plus Public/Private profile choice;
5. neither visibility option is preselected;
6. phone verification and attestation;
7. return to the exact prepared setup and start.

Start match, existing user:

1. persist prepared match intent;
2. sign in;
3. complete email verification, TOTP, backup code, or trusted-device state if required;
4. phone verification only if the current account lacks a valid mobile stamp;
5. return to and start the prepared match.

Follow, notifications, or account-sync action:

- authenticate if needed;
- complete only identity requirements needed for that action;
- do not require phone verification merely to follow;
- execute the original action automatically after success.

The combined username/visibility screen copy:

- Public: people can find and follow you immediately; public results and public ladder row
  may appear;
- Private: people can find you and request to follow; approved followers unlock your full
  profile; you are not publicly ranked.

Remove the data pact entirely. Research/data processing disclosures live in Privacy, Terms,
phone-purpose copy, match visibility help, and Your data settings. Theme selection is not
repeated during authentication.

### Quality, analytics, compliance, launch

**Step 29 - Analytics and observability.**
Firebase Analytics uses no IDFA/ad-ID collection. Event names and parameter schemas are
implemented once and shared across app versions:

| Event | Key params |
|---|---|
| `first_open` | installChannel, systemMode |
| `theme_screen_viewed` / `theme_selected` | themePreference, resolvedTheme, source |
| `search_opened` | surface, scope |
| `search_submitted` | scope, resultCounts, queryLengthBucket |
| `search_result_opened` | resultType, action, surface |
| `auth_intent_started` / `auth_intent_resumed` | intentType, provider |
| `account_completion_step` | step (username_visibility/email_verify/2fa/phone/otp) |
| `profile_visibility_selected` / `changed` | visibility |
| `follow_requested` / `approved` / `declined` / `cancelled` | targetVisibility |
| `time_to_first_move` | ms, game |
| `match_started` / `match_completed` | game, opponentFamily, outcome, moves, channel, eligibility |
| `claim_win_offered` / `claimed` | game, waitMs |
| `replay_watched` | source, visibility, completed |
| `share_created` | outcome, theme, visibility, surface |
| `recruit_tapped` | game, fromMatch |
| `notification_optin` / `push_opened` | category |
| `hvm_board_viewed` | lens, window |
| `account_deletion_started` / `completed` | surface |

Never send username, email, phone, OTP, Firebase UID, free-text bio/report, reasoning text,
or raw model prompt content as analytics parameters.

Enable Microsoft Clarity mobile SDK from beta. Mask all auth, phone, OTP, private-profile,
report, and sensitive account controls; exclude Stage reasoning if capture volume or privacy
makes it unsafe. Sentry uploads source maps from EAS builds and receives release, app
version, device class, and non-PII session context. Langfuse remains only in the Worker/model
call path.

Age verification is explicitly deferred until after beta and is not a beta build blocker.
Track it as a post-beta product/compliance work item without weakening current data masking.

**Step 30 - Accessibility and readable typography ship gate.**
The visual prototype is not authority for unreadably small text. Set mobile minimums and
Dynamic Type behaviour appropriate to real devices.

Require:

- accessible labels, roles, states, and hints on every control;
- expanding search implemented as an accessible combobox/list with announced result counts;
- board accessibility overlay exposing cell/position/state/legal action without requiring
  the Skia canvas to be understood visually;
- live move announcements, such as `Turn 14 - Claude drops column d`;
- full rules and scoring available to screen readers;
- private-profile lock, Requested, Approve, Decline, Block, and visibility states announced;
- seat/player identity never colour-only;
- reduced-motion mappings for splash, theme previews, posters, Stage, camera, confetti, and
  replay;
- independent sound and haptic controls;
- AA contrast in all themes via token tests;
- focus restoration after search, sheets, auth, and replay dismissal;
- large-board zoom/loupe alternatives and non-gesture action lists where required.

Test VoiceOver and TalkBack on the complete primary flows, not only component snapshots.

**Step 31 - Local QA and beta release verification.**
Through beta, do not add app test workflows, branch gates, scheduled quality jobs,
build-on-push automation, tag-triggered suites, or remote test runners. The repository stays
fast and deliberately light.

The only standard automated health scan is React Doctor, run manually on a developer
machine:

```bash
pnpm react-doctor:mobile
```

Configure that script to inspect `apps/mobile` using the React Doctor version already
approved for the monorepo. It must not call remote services and must not run automatically on
push. Its warnings are reviewed locally; it is a health scan, not a substitute for product
QA.

Everything else is tested locally and only when relevant to the work being changed:

- run mobile lint and TypeScript checks for changed code before handing it to integration;
- run focused Jest unit or contract tests for changed logic, schemas, auth, ratings,
  notifications, deletion, or offline behaviour;
- run the affected semantic scene and golden comparisons after renderer or theme changes;
- run migration and shared-contract checks locally when D1, API, auth, search, replay, or
  visibility contracts change;
- run Maestro and real-device flows locally against a development or store-signed build;
- run accessibility and performance checks on real devices before a beta candidate is
  signed off.

There is no requirement to run the complete local set after every commit. Each agent runs the
smallest relevant checks while building. The integration owner runs the complete applicable
local QA before each beta candidate.

Local unit and contract coverage should exist for:

- theme contracts;
- capability-manifest counts and exclusions;
- scene builders, replay adapters, render registry, hit testing, and accessibility nodes;
- typed search contract and private/public result filtering;
- follow-request state machine, blocks, reports, profile access, and visibility resolution;
- Better Auth native origins, `eslams` cookie prefix, TOTP, and backup-code flows;
- Firebase token claims, signatures, and one-time challenges;
- attestation nonce and replay protection;
- active-session reservation, idempotent moves, 7-day expiry, and 120-second timeout;
- provenance stamping and rating eligibility;
- Bayesian golden datasets, repeat weighting, provisional thresholds, publication hashes,
  and private/deleted-user behaviour;
- notification outbox, push tickets and receipts, and social approval fan-out;
- deletion anonymisation proving gameplay remains while identity links are gone;
- encrypted cache namespaces and permission-revocation purge.

The Step 6 renderer matrix is also local. Renderer agents compare the affected family, game,
and theme after each material change. The integration owner runs the full matrix only before
a beta candidate or a renderer-wide refactor.

Run these Maestro flows locally:

1. first install -> splash -> Use system theme screen -> Battlefield, no auth;
2. search person/model/game -> watch replay -> return with state preserved;
3. configure full Arena setup anonymously -> sign up -> username/visibility -> Firebase test
   phone -> exact setup resumes -> complete match -> result -> share -> replay;
4. private profile follow request -> owner approval -> full profile/replay access on app and
   web -> follower removal revokes access;
5. existing account with TOTP or backup code;
6. one-active-session conflict across web and app;
7. model timeout -> Claim award -> non-rated result;
8. offline private replay -> sign-out purge;
9. account deletion -> identity removed, gameplay still readable as Deleted player.

Real-device QA is mandatory on at least one current iPhone and one representative Android
device, plus Android API 26 before beta sign-off. Verify cold start, expanding search, the
36-game catalogue, large boards, card tables, live Stage, replay, background/resume,
notifications, offline cache, accessibility, and account deletion. Record p95 frame time,
jank, memory, crash behaviour, and any automatic quality-tier activation. Functionality may
never disappear when a lower visual quality tier engages.

A named QA owner keeps one simple local checklist per beta candidate, records the tested build
numbers and devices, and signs off after all required flows pass. No cloud quality automation
is required through beta.

**Step 32 - Store compliance, privacy declarations, moderation, and listing.**
Complete both stores' questionnaires against the finished app. Do not hard-code a 13+ result
in the plan; use the rating produced by the actual game/social content questionnaire.

Declare and document:

- account/auth data;
- phone verification and device integrity data;
- gameplay and AI-research use;
- social/follow/profile data;
- Firebase Analytics;
- Microsoft Clarity;
- Sentry crash/diagnostic data;
- push tokens;
- retained anonymised gameplay after account deletion.

Ship:

- Privacy and Terms URLs on `eslams.com`;
- support contact;
- in-app account deletion and matching web deletion path;
- report, block, follow approval, and moderation contact/process;
- SDK privacy manifests/signatures and a local SDK inventory check before beta and store builds;
- sensitive-field masking verification for Clarity;
- Apple/Google sign-in and deletion/revocation handling;
- store-review Firebase test phone/code and exact demo path;
- screenshots from the completed app in at least two themes;
- listing name `eSlams`, final subtitle, description, keywords, and feature graphics.

The beta ships with Clarity and without an age-verification gate, by explicit decision. Add
age verification as a named post-beta launch work item, not an undocumented omission.

**Step 33 - Complete-build launch.**
All 36 games, search, private follow approvals, ratings, notifications, account deletion,
and platform changes must be present before release promotion. Beta channels are distribution
stages for the same complete product, not reduced feature phases.

Launch sequence:

1. apply and verify D1 migrations in staging;
2. deploy Worker/web/shared-contract changes;
3. verify search, private follows, replay access, session semantics, notification outbox,
   Bayesian publication, and deletion in staging;
4. `eas build --profile production` for iOS and Android;
5. `eas submit` to TestFlight and Play internal;
6. run the complete Maestro and real-device acceptance suite locally against store-signed builds;
7. Trinity send-to-self and follow-request moderation smoke;
8. publish a staging human-rating snapshot and verify diagnostics;
9. verify universal links, push, Clarity masking, Sentry release/source maps, Firebase budget
   alarm, and support/deletion URLs;
10. promote the same complete build through beta and public release;
11. move EAS to the paid plan at public launch if required by usage;
12. create the post-beta age-verification work item with owner and target date.

The go/no-go checklist is this document: every step is locally verified, recorded, and
signed off by the named QA owner. No cloud quality workflow is required through beta.

---

## Things needed from Ramu

Console, account, policy, and final-sign-off work only you can do. Each item blocks only the
steps named.

1. **Apple Developer Program** - active organisation account. Create/approve App ID
   `com.eslams.app`, Sign in with Apple key and Services ID, APNs key, Associated Domains,
   and App Attest capability. EAS may manage certificates after access is granted.
   *(Blocks Steps 4, 10, 12, 32, 33.)*
2. **Google Play Console** - organisation account and app entry for `com.eslams.app`. Link
   Play Integrity, configure internal/beta tracks, app signing, and the account-deletion web
   URL. *(Blocks Steps 4, 12, 32, 33.)*
3. **Firebase project** - enable Blaze billing and a budget alarm; enable Phone Auth;
   register iOS and Android apps; provide `GoogleService-Info.plist` and
   `google-services.json`; create at least one fixed-code test phone for development, local QA,
   and store review; enable Analytics and link it to the intended GA account. *(Blocks Steps
   4, 11, 29, 31, 32.)*
4. **Expo/EAS organisation** - create or confirm the organisation and grant manual build and
   submission access to the release owners. No repository-triggered build integration is
   required through beta. *(Blocks Steps 4 and 33.)*
5. **OAuth console additions** - Google iOS/Android client IDs, GitHub mobile redirect,
   Apple Services ID/redirect, and confirmation of the production/staging callback URLs.
   *(Blocks Step 10.)*
6. **Microsoft Clarity** - create the mobile project and provide the project ID, or separate
   iOS/Android IDs if required by the console. Approve the beta decision to run Clarity
   without an age gate and the list of screens/fields that must be masked. *(Blocks Steps 4,
   29, 32.)*
7. **Sentry** - organisation and React Native project; provide DSN and source-map auth token;
   approve release alert recipients. *(Blocks Steps 4, 29, 33.)*
8. **Domain and support access** - confirm repository/deployment access for AASA,
   `assetlinks.json`, privacy, terms, deletion, and support pages on `eslams.com`; confirm the
   operational support inbox. *(Blocks Steps 8, 27, 32, 33.)*
9. **Policy/copy sign-off** - approve final wording for phone verification, Public/Private
   profiles, follow requests, match visibility, research use, anonymised gameplay retention,
   and account deletion. There is no data pact. Legal review is recommended before public
   release. *(Blocks Steps 11, 15, 27, 28, 32.)*
10. **Moderation ownership** - name the Trinity operators who may review profile reports,
    blocks/abuse, broad notification campaigns, and human-rating publication; confirm the
    support/escalation process. *(Blocks Steps 15, 19, 32.)*
11. **Store listing sign-off** - final app name/subtitle, description, screenshot selection,
    feature graphics, questionnaire answers, resulting age rating, and review notes/demo
    account. *(Blocks Steps 32 and 33.)*
12. **Post-beta age verification decision** - after beta, select the verification approach
    or vendor, intended age threshold, and target release. This does not block the complete
    beta build but must have an owner and date at Step 33. *(Post-beta.)*
13. **Public launch controls** - approve EAS paid-plan activation if needed and Firebase,
    Sentry, push, and Clarity budget/alert thresholds. *(Step 33.)*
