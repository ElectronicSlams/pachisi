# Polish round contract (2026-10-02)

Source of truth: `../FINAL_POLISH_BRIEF_welcome_auth_home.md` (read it fully first). This file only fixes
the seams between the four build agents so they can work in parallel. Everything else in `CONTRACT.md`
(tokens only, `.ob-`/`.ap-` prefixes, no new hex, no build tools, `build.py` single file) still holds.

## Ownership (one writer per file)

| Agent | Writes | Never touches |
|---|---|---|
| S (scene) | NEW `src/scene.js`, NEW `src/scene.css` | anything else |
| W (welcome, setup, theme rule) | `src/onboard.js`, `src/onboard.css`, `src/index.html` (script/link tags only) | app.js, auth.js |
| A (auth page) | NEW `src/auth.js`, NEW `src/auth.css` | onboard.js, app.js |
| H (home, hero, settings, hooks) | `src/app.js`, `src/app.css`, `src/data.js` (copy keys only) | onboard/auth/scene |

Load order in `index.html` (agent W adds the tags): `scene.css`, `auth.css` after `onboard.css`;
`scene.js`, `auth.js` after `app.js` and before `onboard.js`. `build.py` inlines whatever index.html lists.

Chunked writes only: no single Write/Edit over ~12 KB. Make a tool call at least every minute.

## 1. `window.ESScene` (agent S)

```
ESScene.mount(host, opts) -> ctl
  host   an empty <div> (position:absolute; inset:0) inside #phone. Scene fills it with one <canvas class="sc-canvas">.
  opts   { depth: 0|1|2,              // 0 Welcome, 1 Auth, 2 Profile setup (deeper = calmer, fewer near pieces)
           still: bool,               // reduced motion: one composed frame, no drift/parallax/touch
           lowPower: bool,            // same still frame
           quiet: () => [DOMRect...], // rects (in host coords) where text lives; pieces behind them dim+blur
           onReady: fn }
ctl.setDepth(n, ms)   // animated "forward through the field" (near pieces accelerate to camera and blur out). ms default 700. n<current reverses.
ctl.pause() / ctl.resume()
ctl.setStill(bool)
ctl.refreshTokens()   // re-read CSS custom properties (theme changed)
ctl.destroy()
ctl.stats() -> { sprites, fps, layer: {far, mid, near} }   // fps = rolling 2 s average
ESScene.version
```
Rules: colours ONLY from `getComputedStyle(#phone)` tokens (`--bg --surface --text --text-3 --accent --border
--loss --draw --win` plus the chess/disc/card tokens boards use; fall back to `--text`). Cast and layers per brief §3.3
(8–10 object types, 18–26 sprites, far/mid/near). Pre-rasterise each sprite once to an offscreen canvas at 2x, then
`drawImage` on one canvas each frame (one GPU layer). Tilt parallax via `deviceorientation`, pointer parallax as the
desktop fallback, auto-sway when neither. Touch/pointer drag = soft repel + damping; tap = light spin + drift off.
Light theme = "zero-g studio" (soft offset shadows), dark = "deep space" (fine dust, `--accent` bloom ≤12% alpha behind
the quiet zone, rim light). Atmosphere gradient allowed on this canvas only. `aria-hidden="true"` on the canvas.
Pause on `visibilitychange`. Honour `html.reduced-motion` and `(prefers-reduced-motion)`; `(prefers-reduced-transparency)`
= opaque `--bg`, pieces at reduced contrast. 60 fps target at 390×844 DPR 2.
Reference geometry: `boards-grid.js` (`chessPiece` paths at line ~679–720, `disc`, `stone`), `boards-table.js` (cards, chips, tiles).
Agent S also provides `qa/scene-bench.js` (Playwright, measures fps + sprite count, writes `qa/scene-bench.json`).

## 2. `window.ESAuth` (agent A)

```
ESAuth.build(opts) -> HTMLElement   // a full-page <section class="au-page">; onboard.js places it over the scene
  opts { onBack(),                  // chevron on the first step → Welcome
         onAuthed({ isNew, provider, email }),   // after password/2FA/create success
         expired: bool,             // "Your sign-in expired…" line, from app.js's expired-session route
         oauthError: code|null,     // one quiet line, messages from ESD.copy.oauthErrors
         reduced: () => bool,
         appState: () => ESApp.state() }
ESAuth.state() -> { step, email, provider }   // QA
```
Steps (own internal back stack, each its own screen, same scene behind): `choose` → (`oauth-wait` → `signing`) |
(`email` → lookup → `password` [→ `twofactor`] | `create` → `signing`). Copy exactly per brief §4 and §8. Buttons all
52pt equal weight: Google, GitHub, Apple (shown when `ESApp.state().platform === 'ios'` OR when `ESD.auth.appleEnabled`;
default: show it, flagged in handoff), divider `or`, Continue with email. Legal line at bottom. Simulation: lookup is a
600 ms wait; emails containing `new` (e.g. `new@lab.ai`) or any email never seen in `localStorage['eslams-arena-proto']`
→ Create account; others → Password. Password step: any password ≥1 char signs in; two-factor when
`ESApp.state().dev.twoFactorProviders` (code `123456`, recovery ≥6 chars; reuse the sheet's copy). Create step:
dynamic password feedback (`3 more characters` toward 12), `Completing security check…` 1.5 s, then `Create account`.
OAuth: `Waiting for Google…` + `Cancel` (900 ms) → `Signing you in…` → onAuthed. Desktop frame (`#phone.ob-desktop`):
centred card ≤ 420px. Tokens only, class prefix `.au-`. Form surfaces legible over the scene (surface at ~0.9 alpha via
existing `--surface` + opacity, not new hex).

## 3. onboard.js (agent W)

- Welcome per brief §3: mark, wordmark, tagline, ONE button `Play Against AI` (document the choice), scene via
  `ESScene.mount` into `.ob-world` that lives in the layer root and persists across Welcome → Auth → Setup
  (one scene ctl in `st.scene`; `setDepth(0/1/2)` on each step; destroyed when the layer closes at Pick a look).
  Remove: count line, caption, `I have an account`, recorded board, glass. Offline: button disabled, `Back online to sign in`.
- `auth(opts)` now = `ESAuth.build({...})` placed over the world, forward transition 600–800 ms (wordmark shrinks and
  rises, content settles), back reverses. Route on `onAuthed`: profile incomplete → `setup()`; else `dev.setSignedIn(true)`
  then themePick-or-close (as today). Keep `ESApp.openAuth` untouched (app.js still owns the old sheet for nothing;
  agent H retires its callers).
- Theme rule §2: while `screen ∈ {welcome, auth, setup}` and `!ESApp.firstRun.themePicked`, force `#phone[data-theme]`
  to `light|dark` by OS; restore on close/themePick. After a theme is picked (sign-out → Welcome) use the stored theme.
- Profile setup §5: remove the three helper lines; subtitle → one short line or none; preview `eslams.com/<handle>`
  only; dynamic specific errors that REPLACE the preview line (same element slot, no layout jump), `--loss` border,
  submit disabled while invalid. Messages verbatim from §5.2 (`validateHandle` returns them; name offending chars).
- Expose `ESOnboard.auth(opts)` so app.js can route expired sessions here with `opts.expired` and `opts.onAuthed`.
- `ESOnboard.state()` adds `scene: ctl && ctl.stats()`.

## 4. app.js / app.css / data.js (agent H)

- Home §6: `arenasSection` → `Choose your game` with sections: `Recommended for you` (derived on device: favourites'
  categories first, then games in categories not yet played; never labelled AI), `Start here` (the 13 marquee arenas; NOT
  `Popular`), `Board & Strategy`, `Card & Hidden-Info`, `Social & Economic`. Each = `.ap-sec-head` (title 17/650 +
  `See all`) + `.ap-rail` of poster cards (`gameCard(slug,'rail')` is close; add the wide spotlight variant for the first
  section). `See all` → a pushed screen with the full grid for that section. Remove chips, count slot, `homeFooter`.
  Only one looping preview on the page (the hero); rails use static posters.
- Hero §7.1: `.ap-gcard-chips` → two equal-width buttons edge-aligned with Play now (grid 1fr 1fr, same height, one gap).
  Same rule for the table sheet's `Change` action.
- Settings §7.2: remove the `watchOnWeb` row. Keep everything else.
- Hooks: `openSignIn` callers for expired session (`startFlow`, `S.dev.signInExpired`) → `W.ESOnboard.auth({ expired: true,
  onAuthed: () => startFlow(intent) })` when ESOnboard exists; else old sheet. Signed-out Home never shows now, but leave
  the header chip code harmless. Do NOT apply the two "Pending approval" dev edits in INTEGRATION_NOTES.md (user decision).
- data.js: add copy keys `chooseYourGame`, `recommendedForYou`, `startHere`, `seeAll`, `popular`; remove nothing (web parity).

## 5. QA agent (after the four land)

`qa/flows.js` flows updated for the new journey; `qa/final/capture.js` extended; screenshots per brief §9.2 in
Classic Light and Classic Dark at 390×844, 375×667, 430×932, desktop 1024×720 for Welcome/Auth/Setup, reduced motion and
reduce transparency Welcome; `qa/audit.js` AA pass in six themes; `build.py --strict`; brief §4/§6.1/§7.0–7.2/§7.5/§8/§10
updates; `HANDOFF_polish.md` (button label + why, sprite count + fps, deviations, open items §10).

## Running locally
No build step. Playwright (from `~/Downloads/eSlams/eSlamsPlatform/apps/web`, `@playwright/test` resolves there) can open
`file://.../prototype/src/index.html` directly. A static server from Downloads needs the macOS permission workaround:
copy `src/` to the scratchpad and `python3 -m http.server 8787` there.
