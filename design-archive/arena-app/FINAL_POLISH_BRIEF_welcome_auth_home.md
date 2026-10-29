# eSlams Arena app: final polish brief (Welcome, Auth, Profile setup, Home)

**For:** the design agent. **From:** Ramu. **Date:** 2026-10-02.
**Status:** this is the last design round. It supersedes `ARENA_APP_DESIGN_BRIEF.md` and `ONBOARDING_AND_THEMES_PLAN.md` wherever they differ. Everything not mentioned here stays as it is.

---

## 0. The one-paragraph version

The app is broadly right: gameplay, the opponent picker, the table sheet, Your matches and Settings are good. What is wrong is the **first impression**. Opening the app today feels like the old researcher-focused eSlams (a recorded match, a count of games, a sign-in pop-up). It must feel like **an amazing consumer gaming app, the next frontier of AI gaming**. So: replace the Welcome with a **weightless, space-like, interactive scene** (chess pieces, Go stones, poker chips and more floating in depth), give it **one button**, move **authentication to a full page** with the same scene behind it, tighten **Profile setup** (remove explanatory text, make errors dynamic), and rework **Home's game browsing** into the sectioned layout every consumer game store uses. Then fix a few small alignment and copy items.

## 1. Target user flow

```
Install → Welcome (one button)
        → Auth page (Google · GitHub · Apple on iPhone · email)
             ├─ existing account → Home
             └─ new account      → Profile setup → Pick a look (once) → Home → Play
Sign out → Welcome
Signed-in cold start → Home (never sees Welcome)
```

- There is **no signed-out browsing**, no guest mode, no "I have an account" button, no separate Create account vs Sign in choice. One door in; the account decides the route.
- The space scene is **continuous across Welcome → Auth → Profile setup** (one world, the player moves "deeper" at each step). It ends at Pick a look and does not appear on Home.

---

## 2. Theme rules for the first run (change)

Today Welcome appeared in a fixed material theme (the brown Club skin). That is wrong for a first impression.

1. **Before any theme has been chosen** (fresh install, onboarding): Welcome, Auth and Profile setup render in **Classic Light or Classic Dark, following the phone's appearance**. Nothing else. No Club, Neon, Arcade or Midnight can appear before the player has chosen one.
2. **Pick a look** (the existing one-time theme screen after Profile setup) is where the player first chooses among the six. Keep it exactly as built (Follow system preselected, six live mini-board tiles, Continue).
3. **After a theme has been chosen**, a later Welcome (after sign out) may adopt the stored theme, because it is the player's own choice. This is my reading of "if a theme is later selected, you can change it": confirm it in the handoff note.
4. Design the space scene **token-driven** (everything from theme tokens, no hard-coded hex) so it works in all six themes without bespoke art. **Classic Light and Classic Dark are the primary deliverables and get full polish**; the other four are verified, not art-directed.

---

## 3. Welcome

### 3.1 What it must feel like
A gaming app you want to open: premium, calm, a little magical. "Weightless." Think of the mood of the Google Antigravity site (objects drifting in a gravity-free field, depth, soft light), as a **mood reference only; do not copy its look, layout or assets.** Never cyberpunk, never sci-fi cliché (no HUD lines, no lens flares, no neon grids). It stays AI-native, clean and confident, and still unmistakably eSlams (the mark, the board and piece language from the app).

### 3.2 Content (this is all of it)
| Element | Spec |
|---|---|
| Mark + wordmark | The existing mark and wordmark, the hero of the upper third. Mark settles in (600 ms), wordmark fades in. Polarity by scheme as today. |
| Tagline | `Here, AI plays games.` (28/650, tight tracking). Assumed from the voice note ("eSlams, here AI plays this game"); keep the existing line unless Ramu says otherwise. |
| Primary button | **One button.** Label: **`Play Against AI`** (Title Case, every word capitalised: this is a deliberate exception to the app's sentence-case rule for this one button). Full width, 56pt, thumb zone, `--accent` fill. Fallbacks if it does not fit the voice: `Get Playing`, `Start Playing`, `Challenge an AI`. Pick one and say why. |

**Remove, completely:**
- `Play frontier models at 35 games.` (the count line; also remove the manifest dependency from Welcome)
- The caption under the board (`Connect Four · recorded match`, `Chess · recorded match`, and any "recorded match" wording anywhere)
- `I have an account` (the secondary button)
- The full-screen recorded board behind glass (replaced by the scene below)
- Any other statistic, caption, legal line or helper text on this screen

Offline: the button disables and reads `Back online to sign in`. Reduced motion: see 3.5.

### 3.3 The scene: "weightless field"
A full-bleed, interactive field of game pieces floating in depth. The pieces are **the app's own pieces**, so the scene is brand-true and teaches the product without words.

**Cast** (draw with the same ink and geometry as the boards, per theme tokens; reuse the board renderers' piece drawing in `prototype/src/boards-grid.js` / `boards-table.js`, glyphs in `prototype/src/assets.js`):
chess pieces (king, knight, rook, pawn, both colours), Go stones (black and white), poker chips (several denominations), Connect Four discs (red and yellow, with the interior ring), Othello discs, playing cards (backs and a few faces), Mahjong tiles, a Hex tile, Checkers pieces. About 8 to 10 distinct objects, 18 to 26 on screen at once. No dice or objects that are not real eSlams games.

**Depth** (three layers, this is what makes it feel like space rather than confetti):
| Layer | Size | Blur | Speed | Opacity | Notes |
|---|---|---|---|---|---|
| Far | small | strong | slowest | low | many, almost dust-like |
| Mid | medium | none/slight | slow | full | the readable heroes, mostly arranged around the text, never covering it |
| Near | large, partly off-screen | soft depth-of-field blur | fastest | full | few (2 to 3), they pass the "camera" |

**Motion**
- Constant slow drift in 3D feel (translate + scale + slow rotation, rotation no more than ~8°/s), gentle ease, no bouncing, no physics-toy feel. Objects exit and re-enter smoothly; the field never looks like it loops.
- **Device tilt parallax**: layers shift against tilt (far least, near most, max ~14pt). Falls back to a slow auto-sway without motion sensors.
- **Touch**: dragging across the field gently pushes nearby pieces (soft repel, inertia, damping), then they ease back into drift. Tapping a piece makes it spin lightly and drift off. No sound, no new haptics (the brief allows three haptic notes only; do not add one).
- **Text always wins**: keep a quiet zone behind the wordmark, tagline and button. Pieces that drift behind them dim and blur slightly so text contrast stays AA at every frame.
- **Entry choreography** (first paint, under 1.2 s, skippable by tap): field is already drifting, mark settles, wordmark and tagline fade in, button rises last.

**Atmosphere**
- **Classic Dark ("deep space")**: the dark `--bg`, a very low density of fine star dust, a soft radial bloom of `--accent` (at most ~12% alpha) behind the wordmark, pieces with a subtle rim light.
- **Classic Light ("zero-g studio")**: space does not have to be black. High-key `--bg` with a faint cool haze, pieces in their real colours with large soft, offset shadows that sell the float, the same depth blur. It must feel as premium as the dark one, not like a washed-out afterthought.
- Atmosphere gradients exist **only on this background plane**. This is a deliberate, scoped exception to the brief's "no gradients" and "nothing else loops" rules: say so in the handoff and update brief §6.1 and §8 accordingly. Controls stay flat.

### 3.4 Transition to Auth ("going into space")
Tapping the button pushes the player **forward through the field**: near pieces accelerate toward the camera and blur out, the wordmark shrinks and rises to the top, the Auth content settles in, and the field continues behind it at a calmer speed. 600 to 800 ms. Back reverses it.

### 3.5 Accessibility and performance
- Reduced motion: **one still, beautifully composed frame** (no drift, no parallax, no touch response); the forward transition becomes a 150 ms crossfade.
- Reduce transparency: opaque `--bg`, pieces at reduced contrast.
- The field is decorative: hidden from screen readers. Focus order: wordmark, tagline, button.
- Performance: pre-rasterised sprites on a single GPU layer (Skia), 60 fps on iPhone 12-class and above, no frame budget spikes at the transition. Pause when backgrounded, and use the still frame in Low Power Mode. State the sprite count and fps you tested.

---

## 4. Authentication (a page, not a pop-up)

The current sign-in **bottom sheet is removed**. Authentication is a **full page** (on tablet/desktop frames, a centred card over the same field). One surface for everything, including an expired session later (route here with the table and choices preserved).

### 4.1 The page
- Back chevron (top left) returns to Welcome.
- Title (recommended): `Welcome to eSlams`. No subtitle needed. Keep to the app's voice: sentence case, no exclamation marks.
- Buttons, all the **same size, equal prominence**, 52pt, in this order:
  1. `Continue with Google`
  2. `Continue with GitHub`
  3. `Continue with Apple` (iPhone only; follow Apple's sign-in button guidelines for style and equal weight)
  4. A divider `or`
  5. `Continue with email`
- Small legal line at the bottom: `By continuing you agree to the eSlams Terms and Privacy Policy.` (links open in the system browser).
- No `Sign in` / `Create account` toggle anywhere. No `New to eSlams? Create an account`.

### 4.2 Google and GitHub: system browser
Both open the **system browser session** (the secure in-app web auth sheet), then return to the app. Design the handoff:
- While away: the page shows a calm waiting state (`Waiting for Google…`, with `Cancel`); the field keeps drifting.
- On return success: `Signing you in…` for the beat it takes, then the route below.
- Cancelled or failed (including `access_denied`, `account_deactivated`, `account_deleted`, `linking_conflict`): one quiet line on the page; buttons re-enabled. Reuse the messages in brief §7.5.

### 4.3 Email flow (email first)
1. **Email step**: one field (`you@lab.ai`), `Continue`. Nothing else.
2. We look the email up:
   - **Account exists** → **Password step** (show/hide, `Forgot password?` opening the web reset flow), then two-factor if the account has it (`One more check.` flow from brief §7.5, unchanged) → **Home**.
   - **Account does not exist** → **Create account step**: `Create your account`, the email shown (editable via back), a password field with **dynamic** requirement feedback (no static rules paragraph: show only what is still missing, e.g. `3 more characters` while typing toward the 12-character minimum), the security check (`Completing security check…`), and primary `Create account` → **Profile setup**.
3. Each step is its own screen in the same page flow, with the same scene behind it and a back chevron.

Dependencies and risks to flag, not solve, in the handoff:
- Email-first needs a platform lookup (the web today uses a Sign in / Create account toggle) and **reveals whether an email has an account**. This needs an explicit security review (rate limiting, enumeration risk) before build; the alternative is a single password field that works for both. Do not block the design on it.
- Sign in with Apple on iOS is a **product decision**: the web removed it on 18 Aug 2026. Design it in; mark it as shipping only if the provider is (re-)added to the platform. App Store review rule 4.8 requires an equivalent privacy-preserving sign-in alongside Google and GitHub, so the owner of App Store submission should confirm.

### 4.4 Routing (unchanged principle)
The account decides, not the button: existing → Home; new → Profile setup; session expiry → back to the same table.

---

## 5. Profile setup (tighten, then keep)

Everything good stays: title `You're almost in.`, the generated on-brand handle with shuffle, the Public/Private chips, the optional block (Bio, Location, Favourite games), sticky `Create account`, the desktop two-column layout, then **Pick a look**, then Home. Same space scene behind it (one step deeper), Classic Light/Dark only, form surfaces legible over it.

### 5.1 Remove helper text (too much space, everyone knows it)
| Remove | Where |
|---|---|
| `3 to 32 characters: lowercase letters, digits and inner hyphens.` | under the handle preview |
| `Change this any time in Settings.` | under the visibility chips |
| `You can add the rest later in Settings.` | under `Create account` |
| Consider also trimming the subtitle `Pick a handle and you're done. Everything below it is optional.` to one short line, or dropping it | your judgement; keep the `Optional` eyebrow |

The principle: **no rule or reassurance text that is not an error.** Apply it to anything else you find in this flow.

### 5.2 Handle field and live preview
- The preview is exactly `eslams.com/<handle>` (mono; the domain in `--text-3`, the handle in `--text`). **It ends there. No trailing text.** It updates on every keystroke.
- Typing is forgiving: uppercase is lowercased silently, spaces become hyphens silently.
- **Errors are dynamic and specific**: they appear only when something is wrong, say exactly what is wrong, and **replace the preview line** while invalid (so the layout does not jump); the preview returns when valid. The field border takes the loss tone. `Create account` is disabled while invalid, with no extra text.

| Situation | Message (dynamic parts in `<>`) |
|---|---|
| Fewer than 3 characters | `Needs at least 3 characters. <n> more.` |
| More than 32 characters | `32 characters max. You're <n> over.` |
| Disallowed characters | `Only lowercase letters, digits and hyphens. Remove <"_" or "." etc.>` (name the offending characters) |
| Starts or ends with a hyphen | `Can't start or end with a hyphen.` |
| Reserved word | `That handle is reserved.` |
| Taken (on submit, 409) | `That handle is taken. Here is a new one.` (field regenerates, focus kept, button re-enabled; existing behaviour) |

Validation rules are the platform's: 3 to 32 characters, `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, 32 reserved words.

### 5.3 Visibility
Keep the two chips and their descriptions (`Public: Anyone can view it`, `Private: Approved followers only`), Public preselected. Just no helper line beneath.

---

## 6. Home: from a chip-filtered grid to a sectioned game store

### 6.1 Problem
"Choose an arena" is one long grid with category filter chips and an "N games · M arenas" count. It reads like a catalogue, not a game store. Consumer games (App Store, Apple Arcade, Netflix) browse as **sections of horizontal rails**, each with a clear job.

### 6.2 New structure (top to bottom)
1. Header (mark + avatar), unchanged.
2. **Resume card** (only when a match is live), unchanged.
3. **Hero** for the first favourite with the recommended `Ready` opponent and `Play now`, unchanged except the alignment fix in 7.1.
4. **`Your games`** rail (favourites), unchanged.
5. **`Choose your game`** (replaces `Choose an arena`; drop the count slot). Then sections, each = section title (17/650) + `See all` + a horizontal snap rail of rich game cards:
   - **`Recommended for you`**: derived on device from the player's favourites and categories they have not yet played. Never labelled as AI-chosen.
   - **`Popular`**: **only if the platform reports real play counts.** It does not today. Until it does, show **`Start here`** (the thirteen main-arena games) in its place, or omit. Do not invent popularity (brief §9, honesty rule).
   - **`Board & Strategy`**
   - **`Card & Hidden-Info`**
   - **`Social & Economic`**
   The three category names are fixed (brief §5). Category filter chips are **removed**. Control & Arcade games are not Arena content.
6. **Remove the footer line** `Watch models play each other on eslams.com`.

### 6.3 Game cards in rails
- Poster-style card: the game's **real mini board** as the cover (static recorded position, one looping preview at a time elsewhere on the page), glyph tile, name 14/600, mono table label (`Standard`, `3 tables · Chess / Shogi / Xiangqi`).
- The whole card opens the table sheet; keep the brief's one-action rule (a small play affordance is fine; do not stack buttons on every card).
- Add visual rhythm: let the first section lead with one **wide spotlight card** (full width, larger board), then rails. Rails peek the next card so they read as scrollable.
- `See all` opens a full grid for that category (this is where the long list lives).
- Loading, disabled and selected states follow brief §7.11. Offline: sections render from the cached catalogue.
- Everything token-driven, correct in all six themes.

---

## 7. Small fixes

### 7.1 Hero: `Change opponent` and `Change table` alignment
They currently sit left-aligned under the full-width `Play now`, which looks accidental. Make them **two equal-width buttons whose outer edges align exactly with the `Play now` button's edges**, text centred, same height, one consistent gap. The group is centred under Play now. Apply the same rule anywhere the pattern repeats (for example the table sheet's `Change` opponent action: centre it to its card's vertical axis and match heights).

### 7.2 Settings
- **Remove** `Watch models play each other on eslams.com` (Settings → About, and the Home footer in 6.2).
- Everything else stays: Appearance, Your games, Sound, Haptics, Manage your account, **Delete account**, About (version, Privacy, Terms), **Sign out**. Delete account and Sign out stay because the stores require them.

### 7.3 Keep exactly as is
Opponent picker and auto-selected opponent, table sheet, curtain-riser, Stage (play, result, replay), Your matches, the game and match card systems, Pick a look, the Appearance grid and the six themes.

---

## 8. Copy deck (final strings for this round)

| Where | String |
|---|---|
| Welcome tagline | `Here, AI plays games.` |
| Welcome button | `Play Against AI` (fallbacks in 3.2) |
| Welcome button, offline | `Back online to sign in` |
| Auth title | `Welcome to eSlams` |
| Auth buttons | `Continue with Google` · `Continue with GitHub` · `Continue with Apple` · `Continue with email` |
| Auth divider | `or` |
| Auth legal | `By continuing you agree to the eSlams Terms and Privacy Policy.` |
| OAuth waiting / success | `Waiting for Google…` / `Signing you in…` |
| Email step | field placeholder `you@lab.ai`, button `Continue` |
| Create step | `Create your account`, button `Create account`, `Completing security check…` |
| Profile setup | `You're almost in.` · `Pick your handle` · `Who can see your profile?` · `Public` / `Anyone can view it` · `Private` / `Approved followers only` · `Optional` · `Create account` · `Creating your account…` |
| Handle errors | see 5.2 |
| Home | `Your games` · `Choose your game` · `Recommended for you` · `Start here` (or `Popular` when real) · `Board & Strategy` · `Card & Hidden-Info` · `Social & Economic` · `See all` |

Voice: sentence case everywhere except the Welcome button, short, no exclamation marks, no emoji, vocabulary per brief §5 (never "bot", "battle", "Elo"). Note for the vocabulary table: "Choose your game" replaces "Choose an arena" in the UI.

---

## 9. Deliverables

1. **Interactive prototype** (extend `prototype/src/`: `onboard.js`, `onboard.css`, hooks in `app.js`, Home sections in `app.js` / `app.css`), rebuilt to the single file `eSlams Arena App.html` via `prototype/build.py`. The scene is the centrepiece; it must run, not be mocked.
2. **Screens**, each in **Classic Light and Classic Dark**, phone 390 × 844 plus the small (375 × 667) and large (430 × 932) checks: Welcome, Welcome mid-transition, Auth page, OAuth waiting, Email step, Password step, Create step, Profile setup (empty, filled, each error state), Pick a look, Home (all new sections), Hero alignment. Desktop frame (1024 × 720) for Welcome, Auth and Profile setup.
3. **Reduced motion and reduce transparency** versions of Welcome.
4. **Brief updates** in `ARENA_APP_DESIGN_BRIEF.md`: §6.1 (themes before first pick), §7.0 to 7.2 and §7.5 (Welcome, Auth, Home), §8 (the scene as the signature motion, scoped gradient exception), §10 copy deck, §4 decisions ledger.
5. **Handoff note** listing: the chosen button label and why; the sprite count and measured fps; every place you deviated; and the open items in section 10.

## 10. Open items to surface (do not silently decide)
1. Welcome after sign out: stored theme vs always Classic (my reading is stored theme, section 2).
2. Email-first lookup: platform support and enumeration risk (4.3).
3. Sign in with Apple: ships only if the platform re-adds the provider (4.3).
4. `Popular` section: needs real play counts from the platform; `Start here` until then (6.2).
5. Title Case on the Welcome button vs the app's sentence-case rule (3.2): confirm it stays a one-off.
6. Whether the web platform's onboarding should mirror this (out of scope here; flag only).

## 11. Acceptance checklist
- [ ] Fresh install in light and in dark shows Welcome in Classic Light / Classic Dark. No material theme appears before Pick a look.
- [ ] Welcome has exactly: mark, wordmark, tagline, one button. No count line, no caption, no second button.
- [ ] The scene is interactive (drift, tilt parallax, touch push), layered with real depth, and uses real eSlams pieces.
- [ ] Text contrast is AA over the scene at every moment; the quiet zone works.
- [ ] Welcome → Auth → Profile setup is one continuous world with forward motion; back reverses it.
- [ ] Auth is a full page. No sheet, no Sign in / Create account toggle. Google, GitHub, Apple (iOS), email, in that order and weight.
- [ ] Email flow branches on whether the account exists; the Google/GitHub handoff states are designed.
- [ ] Profile setup has none of the three removed helper lines; the preview ends at `eslams.com/<handle>`; every error is specific and dynamic.
- [ ] Home browses by sections (Your games, Recommended for you, Start here/Popular, the three categories) with `See all`; no filter chips, no count slot, no footer line.
- [ ] `Change opponent` and `Change table` edge-align with `Play now`.
- [ ] Settings no longer mentions watching on eslams.com.
- [ ] Reduced motion, reduce transparency, Low Power Mode, Dynamic Type and offline behave as specified.
- [ ] No new hex values; everything token-driven; the six themes still render Home and the card systems correctly.

---

## 12. Reference files (all relative to this folder)

| Need | Look at |
|---|---|
| Current canon | `ARENA_APP_DESIGN_BRIEF.md` (§5 vocabulary, §6 visual language, §7.0 to 7.12 screens, §8 motion, §9 honesty) |
| How we got here | `ONBOARDING_AND_THEMES_PLAN.md` |
| Current prototype | `prototype/src/onboard.js`, `onboard.css`, `app.js`, `app.css`, `tokens.css`, `data.js`; `prototype/CONTRACT.md`; `prototype/INTEGRATION_NOTES.md`; `prototype/build.py` |
| Current screens to improve | `prototype/qa/final/01` to `14`, `33` to `36` (Welcome, Auth, Setup, Pick a look, Home, Settings) |
| Piece and board drawing for the scene | `prototype/src/boards-grid.js`, `boards-table.js`, `boards-*.css`, `assets.js` |
| Themes and tokens | `assets/02-tokens/` (`web-tokens.css`, `mobile-six-themes.*`), `prototype/research/six-themes.css`, `theme-materials.md` |
| Brand | `assets/01-brand/` (mark, wordmarks, provider logos) |
| Game catalogue and categories | `assets/07-catalog-data/game-catalog.ts` |
| Auth as it works on the web | `assets/08-auth-web-reference/`, brief §7.5 and Appendix E, `assets/09-platform-reference/ARENA_PLATFORM_CONTRACT_DIGEST.md` |
| House design language | `assets/03-design-canon/DESIGN_BRIEF.md`, `DESIGN_NOTE_mobile_app.md`, `COMPONENT_REFERENCE.md` |
| Web Arena today (baseline) | `assets/04-web-arena-today/` |
