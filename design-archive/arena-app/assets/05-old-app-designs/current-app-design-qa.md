# eSlams mobile design QA — auth, startup, Battlefield, and Arena

Date: 2026-07-26

Status: historical pre-platform-auth comparison. It is useful regression
context, but it is not candidate evidence for the 2026-07-30 platform-auth
release. The candidate must be recaptured on store-signed iOS and Android
artifacts after Apple enrollment and release configuration are complete.

Build surfaces: Android release APK and signed iOS release-simulator app, both
with embedded production bundles

Reference viewport: 402 × 874

Reference authority: `docs/plans/mobile-app-corrections.md`, then
`docs/plans/mobile-app-build-plan.md` as historical context and the supplied
mobile design handoff

## Evidence

- [Battlefield reference/current comparison](./qa/design-v7/battlefield-reference-current-804x874.png)
- [Arena reference/current comparison](./qa/design-v7/arena-reference-current-804x874.png)
- [Battlefield current screen](./qa/design-v7/battlefield-current-402x874.png)
- [Arena current screen](./qa/design-v7/arena-current-402x874.png)
- [Cold-start brand sequence](./qa/design-v7/cold-start-contact-sheet.png)

Each comparison places the supplied 402 × 874 reference on the left and the
current 402 × 874 native Android render on the right. The current frames use
Classic Dark, production API data, Android API 36, and the release bundle.
The same source/current comparison was repeated at 402 × 874 against the signed
iOS release-simulator build for Battlefield and Arena after the final native
changes.

## Pixel and behavior review

- No clipped chrome, overlapping header controls, broken card boundaries, or
  off-screen primary controls remain at the reviewed viewport.
- Battlefield keeps the source-plan chrome: trophy, centered title, expanding
  search, and sign-in avatar.
- The Battlefield hero is Connect Four from the production match service. Its
  visible board advances through the match's verified public replay; the
  canonical bundled scene appears immediately while replay bytes arrive.
- Worth Watching begins with real Chess, Othello, and Tic-Tac-Toe replays in
  that order. Only the viewport-selected poster creates an active Skia canvas.
- The captured build showed the historical 36-game target. The current
  Core-safe capability authority exposes 35 playable games: 16 Board, 14 Card,
  and 5 Social. Blackjack remains watch/replay-only because Core defines it as
  a one-player score game and the Arena authority has no solo human-session
  mode. Candidate screenshots must show the derived 35-game count.
- Every Arena game tile uses a real vector-library glyph selected for that
  game. The generic repeated gamepad and text-symbol substitutes are gone.
- The never-played Arena hero is selected without an immediate repeat from
  Tic-Tac-Toe, Chess, Connect Four, and No-Limit Texas Hold'em. Each uses a
  bundled, renderer-native legal sequence and resolves to a static final state
  when reduced motion is enabled.
- Current provider/model names, elapsed times, results, and opponent readiness
  are live service data, not copied reference text.
- The cold-start mark, wordmark, and tagline remain readable within the
  source-plan 2.5-second hard cap before the first-install theme screen.
- Search, profile/sign-in, both dock tabs, Google Credential
  Manager launch, Arena game sheets, and primary setup controls were exercised
  on the installed APK.
- On iOS, the native Google Sign-In consent prompt and the
  `accounts.google.com` account-entry screen were opened from the signed build.
  The SDK entry point and credential-state reset are pinned to the main queue,
  preventing the dispatch precondition crash caught during this QA pass.
- The retired iOS phone-sheet evidence is historical. Re-run the auth chooser,
  email/provider stages, and keyboard/focus behavior on the platform-auth
  candidate.
- All three executable iOS Maestro journeys passed on that historical signed
  build: first-install Battlefield, the then-current Arena/full-rules path, and
  filtered Arena state restoration after dismissing search. These results do
  not substitute for the platform-auth candidate run.

## Intentional plan-over-reference differences

- The normal header uses the screen title and search control required by Step 8
  rather than the older centered wordmark.
- Arena derives 35 startable mobile games from the canonical capability
  manifest rather than the handoff's earlier 36/38 targets.
- Battlefield uses the strongest available real Connect Four replay when no
  live Connect Four match exists; it does not counterfeit a live state.
- The Arena hero can show any of its four approved games, so a captured frame
  need not be Connect Four.

No unresolved P0, P1, or P2 visual defects remained in the historical reviewed
landing, authentication chooser, email/provider entry, search, Arena discovery,
or game-sheet states. Candidate visual sign-off remains pending.

historical result: passed; platform-auth candidate: pending
