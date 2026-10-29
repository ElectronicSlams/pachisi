# eSlams Arena app — design asset pack

Companion to `ARENA_APP_DESIGN_BRIEF.md` (the brief is the source of truth; everything here is reference).
Upload this folder (or the zip) to Claude Design alongside the brief.

| Folder | What it is | How to use it |
|---|---|---|
| `01-brand/` | The eSlams mark (`mark.png`), wordmarks for light and dark backgrounds, favicon. | Ship as-is. Never recolour, outline, shadow or gradient the mark. The mark alone is the app icon. |
| `02-tokens/` | Production web tokens (`web-tokens.css`, canon for Classic Light/Dark), the six mobile theme token sets (`mobile-six-themes.ts`, `.css`, `mobile-theme-contract.ts`), motion tokens, seat-map CSS. | Design strictly inside these tokens. Classic Light + Classic Dark are the shipping themes for v1 (see brief §6). |
| `03-design-canon/` | `DESIGN_BRIEF.md` (house language, canonical), `COMPONENT_REFERENCE.md` (recipes), `DESIGN_NOTE_mobile_app.md` and `DESIGN_NOTE_battlefield.md` (the board system and Stage grammar the app inherits), `recommendations-for-arena.md` (game disposition + how-to-play content matrix), the `eslams-design` skill, and the v4 Arena prototype notes. | Read `DESIGN_BRIEF.md` §2, §4, §5, §8, §9, §10, §12 first. The Arena app brief overrides these only where it says so. |
| `04-web-arena-today/` | Screenshots of the LIVE web Arena (eslams.com/arena, Sept 2026) at desktop and 375px mobile, plus the How-to-play modal, and two out-of-scope context shots. | This is "the existing web Arena, made good". The app must reproduce its rules and vocabulary (arena → table → seat/side → opponent → start) and beat its UX. |
| `05-old-app-designs/` | The previous mobile app design: v3 interactive prototype (`prototype-v3/`, open the `.dc.html` over HTTP), its handoff spec, the current Expo app's QA screenshots (`current-app-screens/`), the six themed launcher icons, and the old design QA log. | Study for what to KEEP (board system, ledger, result curtain, honesty states) and what to DROP (Battlefield-first, phone OTP, six-theme onboarding, HvM board, profile/social). See brief §3 "What we are leaving behind". |
| `06-web-prototype-v4/` | The v4 web prototype (`eSlams v4.html`, serve over HTTP, open `#/arena`). Its `app/arena-preview.jsx` holds the per-family animated preview concepts; `app/games-arena.jsx` the playable engines. | Visual reference for the "matchup hero + animated preview + model wheel" idea the web Arena rebuilt from. |
| `07-catalog-data/` | `game-catalog.ts`, `game-render.ts`, `game-animation.ts` from `packages/core-types`: the real 50-game catalogue, renderer families, seat layouts, board sizes, motion timings. | Use the real slugs, variants, families and timings. Never invent a game or a variant. |
| `08-auth-web-reference/` | Live web sign-in / create-account screens (desktop + mobile) and the Identity prototype's sign-in. | Auth in the app is the web flow, re-skinned natively. Same providers, same steps, same copy. Do not redesign the flow. |
| `09-platform-reference/` | A code-verified digest of how the web Arena and its session API behave today (routes, states, enums, timers, roster rules, help content, auth plumbing), with file:line citations. | Read when a screen needs an exact state name or error path. The brief's Appendices A and B were built from it. |

Vocabulary is locked (brief §5): Game · Arena · Table · Seat · Match · Replay · Official · Ready / Slower turns / Not available for this game. Never "battle", never "Elo".

## Known staleness

- The canon docs in `03-design-canon/` still carry the cancelled "DEC '26" Grand Slams date and leaderboard-era copy. The v4 prototype header chip in `06-web-prototype-v4/app/shell-v2.jsx` shows the same old date.
- Grand Slams is 8 to 14 February 2027. The public leaderboard is being retired.
- Where these docs conflict with the Arena brief (`ARENA_APP_DESIGN_BRIEF.md`), the Arena brief wins.
- A separate whole-site "Stadium" design brief exists in a sibling folder. It is out of scope for the Arena app and is not part of this pack.
- `MANIFEST.md` lists every file in this folder with its size and purpose.
