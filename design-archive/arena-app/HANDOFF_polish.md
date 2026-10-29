# Handoff: polish round (Welcome, Auth, Profile setup, Home), 2026-10-02

## 1. Deliverables
- `eSlams Arena App.html`: 1,141,538 bytes, built with `prototype/build.py --strict`. Boots over file:// with zero console errors. Welcome scene runs at 60 fps with 23 sprites.
- `eslams-arena-app-prototype.zip`: 31.6 MB, 181 files, excludes `qa/shots`.
- `prototype/qa/final-polish/`: 84 PNGs, `contact-sheet.png`, `README.md`.
- `ARENA_APP_DESIGN_BRIEF.md` updated: §4, §6.1, §7.0 to 7.2, §7.5, §7.10, §8, §10.

## 2. Button label
`Play Against AI`. It names the product in three words (you play; the opponent is an AI) and reads as an invitation rather than an instruction. Title Case is the deliberate one-off (open item 5).

## 3. Scene
- Sprites per depth: depth 0 = 23 (far 11 / mid 9 / near 3); depth 1 = 21 (11 / 8 / 2); depth 2 = 18 (10 / 7 / 1). 10 object kinds, 22 sprite designs.
- fps (`qa/scene-bench.json`, headless Chromium 390x844 DPR 2, both schemes): 60 at depth 0; 58 to 59 during the depth transition.
- Scene contrast (`qa/scene-contrast.json`): light wordmark 18.5, tagline 18.9, button 9.1; dark 16.2 / 15.8 / 5.8. All AA.
- Architecture: one canvas; pre-rasterised sprites in 4 blur levels; token colours probed from #phone; tilt, pointer and auto-sway parallax; touch repel; quiet-rect steering; the near layer travels the outer band.

## 4. QA results
- `flows.js`: 22/22 (11 flows x Classic Light/Dark).
- Material themes, flows 1, 3, 7, 9: club 4/4, midnight 4/4, neon 3/4, arcade 3/4. The two fails were the flow-1 first-paint timing gate under parallel CPU load (2716 / 2671 ms vs 2600 ms); both pass alone (2001 / 2235 ms).
- `audit.js`, 6 themes x 19 screens: 0 FAIL, 0 console errors. No tap target under 44px after the auth fixes (Terms, Privacy Policy, Forgot password?, Edit now have >=44px hit areas).
- One remaining low reading: "Completing security check..." on auth-create. Harness artefact: the line hides after 1.5 s and the Create button slides into the sampled box. The text is --text-2 on --bg, about 6.9:1 in light.
- Borderline, listed: Club "Connect Four" tile label 4.07 to 4.36 on setup.

## 5. Deviations from the brief
**Auth**
- Apple button shown by default (ships only if the platform re-adds the provider).
- Email step title `Continue with email` and password step title `Enter your password` go beyond the copy deck.
- `Edit` link to change email on Create.
- Trust device is a plain checkbox.
- Initial focus on the choose step goes to the page, not a button.
- Provider buttons use opaque --surface.

**Welcome / Setup**
- `favHint` ("Pick any. Your first pick opens Home.") also removed under the no-reassurance principle.
- Handle error text uses --loss-text with a --loss border for AA.
- The disallowed-characters message has no trailing period.
- The error slot grows to two lines when needed.
- The brand fades out on Setup.
- The expired-session route skips the profile check.
- Setup has a --bg 82% scrim; Auth a 45% scrim behind the content column.
- Theme rule: Classic by OS before Pick a look, stored theme afterwards.

**Scene**
- Colours probed via a hidden element.
- Chips use --loss/--accent/--text; Mahjong --win; Hex --accent; Connect Four yellow = --draw lightened 18%.
- Blur baked via ctx.filter (Safari 18+).
- Still mode has no crossfade (onboard.js does the 150 ms crossfade).
- Dark rim light added.

**Home**
- `Start here` not `Popular` (no real play counts).
- Section titles are h3 under one h2 `Choose your game`.
- Recommended = favourites' categories first, then unplayed categories, capped at 8, omitted when empty.
- Category rails move already-shown arenas to the end.
- Rail cards are (100% - 2*gutter - 10px)/1.55 wide; names wrap to two lines at 375px.
- Hero chips 44px.
- See all is a pushed screen with a 2-column grid.

**Not applied:** the two "Pending approval" dev-panel edits (Signed-in toggle / Reset -> Welcome) still await the user's decision.

## 6. Acceptance checklist (brief §11)
Evidence files are in `prototype/qa/final-polish/`.
- [x] Fresh install light/dark shows Classic Light/Dark Welcome, no material theme before Pick a look: 01-welcome-*-390x844.png; flows.js flows 1 and 11.
- [x] Welcome has only mark, wordmark, tagline, one button: 01-welcome-*; 22-desktop-welcome-*.
- [x] Scene interactive, layered, real pieces: scene-bench.json (23 sprites, far/mid/near), qa/auth-test.js, 01 and 02.
- [x] AA contrast over the scene: scene-contrast.json; audit.js (one harness artefact noted in §4).
- [x] Welcome -> Auth -> Setup one world, back reverses: 02-welcome-transition-*, 03, 08; flows.js.
- [x] Auth is a full page, provider order and weight: 03-auth-choose-*, 23-desktop-auth-*.
- [x] Email branches; OAuth handoff states: 04-auth-oauth-wait-*, 05, 06, 07; qa/auth-test.js.
- [x] Setup has none of the three helper lines; preview ends at eslams.com/<handle>; specific errors: 08, 09, 10 to 15, 24-desktop-setup-*.
- [x] Home sections, See all, no chips/count/footer: 17-home-top-*, 18-home-store-*, 19-home-seeall-*.
- [x] Change opponent / Change table edge-align with Play now: 20-hero-alignment-* (375, 390, 430).
- [x] Settings no longer mentions eslams.com watching: 21-settings-about-*.
- [~] Reduced motion and reduce transparency: 25-welcome-reduced-motion-*, 26-welcome-reduce-transparency-*. Offline: verified directly (Welcome button disables and reads `Back online to sign in` when `ESApp.dev.setOffline(true)`, and restores when back online; onboard.js polls the dev flag every 500 ms as well as listening to browser online/offline events). Dynamic Type and Low Power Mode: not testable in the prototype (lowPower is an API flag only).
- [x] No new hex, token-driven, six themes render Home and cards: audit.js 6 themes x 19 screens, 0 FAIL; 16-themepick-*.

## 7. Open items (brief §10, verbatim) and status
All still open for Ramu.
1. Welcome after sign out: stored theme vs always Classic (my reading is stored theme, section 2). Status: prototype uses the stored theme.
2. Email-first lookup: platform support and enumeration risk (4.3). Status: prototype branches on a mock account lookup; the real API and rate limiting are undecided.
3. Sign in with Apple: ships only if the platform re-adds the provider (4.3). Status: button shown by default in the prototype.
4. `Popular` section: needs real play counts from the platform; `Start here` until then (6.2). Status: `Start here`.
5. Title Case on the Welcome button vs the app's sentence-case rule (3.2): confirm it stays a one-off. Status: `Play Against AI` in Title Case.
6. Whether the web platform's onboarding should mirror this (out of scope here; flag only). Status: not touched.

## 8. How to run
- Playwright is run from `eSlamsPlatform/apps/web`.
- Serve a copy of `src` from a non-Downloads folder on :8787, then run `qa/flows.js`, `qa/audit.js` and `qa/capture.js` against it.
- `node qa/scene-bench.js`, `node qa/scene-contrast.js`, `node qa/auth-test.js`.
