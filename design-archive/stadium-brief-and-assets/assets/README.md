# eSlams Stadium: design assets

Companion to `00-brief/eSlams-Stadium-Design-Brief.md`. Read the brief first; this file only says what each folder is and what is canonical.

Prepared 30 September 2026 from the eSlams repositories, the live site, and the earlier design packages.

## What is canonical

| Folder | Status |
|---|---|
| `00-brief/` | **Canonical.** The design brief. Wins over everything else in this zip. |
| `01-brand/` | **Canonical.** `hi-res/` are the master PNGs (mark 132 KB, wordmarks 224 to 300 KB). `web-optimized/` are the small production copies, the social card, and the favicon. `app-icons/` are the shipped store and Android adaptive icons plus the splash icon. Do not recolour, outline, shadow or gradient the mark. |
| `02-tokens/` | **Canonical.** `tokens.css` is production truth for colour, radii, shadows, type and layout, light and dark. `game-motion.css` holds the shared motion tokens and the reduced-motion kill switch. `table-games.css` holds the seat-map layouts (two sides, compass, ring). `components.css` is the production primitive recipes. |
| `03-provider-marks/` | **Canonical.** 61 provider SVG marks as shipped. Hues for providers without a mark are in `05-data/providers-90.json`. |
| `04-game-art/` | **Canonical.** The shipped playing-card SVG set (52 cards, jokers, backs) and the mahjong tile set. |
| `05-data/` | **Facts.** `game-catalog-50-games.json` is exported from the platform's catalogue: every game with category, variant, surface, renderer family, seat layout, board size, animation timings and the help text. `providers-90.json` and `arena-opponent-roster-2026-09-30.json` were pulled from the live Arena API on 30 September 2026. `home-hero-animation-records.ts` is the production source of the locked hero animation sequences. `sample-replay-chess/` is a real replay (display frames, per-move reasoning, result) so you can design against real data shapes. |
| `06-current-site-2026-09-30/` | **The "before".** Full-page screenshots of eslams.com taken 30 September 2026: desktop 1440 wide in light and dark, phone (iPhone 13, shown at 1.5x) in light and dark. Includes the home page, Arena, Battlefield, one replay view, Grand Slams, the games index, login, and the leaderboard that is being retired. Use these to verify current state; do not copy their copy. |
| `07-prior-design-screens/` | Reference. `web-prototype-2026-06/` are renders of the June web prototype. `mobile-qa-2026-07/` are side-by-side comparisons of the July mobile design (left) against the built Expo app (right) at 402 × 874. `early-references-2026-06/` are early screenshots used while shaping the first design. |
| `08-prototypes/` | Reference, runnable. Open each `.html` in a browser (serve the folder over HTTP for the `.dc.html` files; the `web-v4` one opens directly). `web-v4/` is the v4 web prototype with the Arena rebuild and its notes. `home-v2/` is the July home redesign with its wiring map. `mobile-v3/` is the mobile prototype that passed review in July. `identity-auth-profile/` is the sign-in, onboarding and profile prototype. They show visual grammar and motion; they also contain things the brief retires (leaderboard pages, counts, "DEC '26", six themes, phone OTP). The brief's Appendix B says which parts to ignore. |
| `09-reference-docs/` | Reference. The July canonical design brief, the component reference, and the four design notes (Battlefield, Home, mobile app, Battlefield visualisation tech note), the onboarding and profile spec, and the July mobile handoff spec. Inherit from them where the new brief points to them; Appendix B of the brief lists what is superseded. |
| `10-audio/` | **Canonical.** The production move sounds, one per board family, plus the piece-arrival cue and the result chord. |

## Hard rules carried from the brief

- One accent. Tokens only. Light and dark, both complete.
- No leaderboard, no rankings, no scores, no Elo, no simulation counts.
- Grand Slams is 8 to 14 February 2027, finals Sunday 14 February 7:00 pm Pacific. December 2026 appears in the old prototypes and screenshots and is cancelled.
- "Live" only when a match is live right now. Every match shows its date.
- Player language in every surface: model names, natural-language actions, the four status words (Ready, Slower turns, Not available for this game, Coming soon).
