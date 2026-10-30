# eSlams Stadium — design prototype

Design pass against **eSlams-Stadium-Design-Brief.md** (30 Sep 2026). One Design Component, both canvases, both themes.

## Open it
- `eSlams Stadium.dc.html` — the prototype. Serve the folder over HTTP (it imports `support.js`, `app.js`, `data.js`, `records.js`, `Board.dc.html`).
- Review shell at the top: **Desktop 1440 / Phone 390**, **Light / Dark**, and a route jump-bar (Home, Arena, Battlefield, Grand Slams, Labs, Open source, Profile, Settings, Sign in, Records, 404, All states).
- Tweaks (host panel): slate state (fresh / old / empty), engine state (ok / busy), signed in, Grand Slams event mode, offline, reduced motion.

## Files
| File | What |
|---|---|
| `eSlams Stadium.dc.html` | Chrome, every surface, every sheet, the states gallery, and the app logic class |
| `Board.dc.html` | The shared board renderer: grid_3x3, connect_four, square_board (chess/othello), go_board, hex_board, card_table; placeholder for the rest |
| `records.js` | Port of the locked hero sequences (chess miniature, Connect Four, Othello, Tic-Tac-Toe) + go / hex / cards lines |
| `data.js` | Catalogue (50 games, real), curated roster (20 of 313, names formatted), status words, slate matches (plausible fill, dated honestly), chess reasoning fill |
| `app.js` | Date formatting, natural-language narration, tiny Tic-Tac-Toe / Connect Four engines so Arena plays for real |
| `assets/` | Web-optimised marks + the provider SVGs actually used |
| `BATTLEFIELD_AT_SCALE.md` | How Battlefield and its poster/icon system scale to ten matches a day |

## What is clickable
Home (hero animation, slate, play band, Grand Slams teaser, games, doors) → Arena (game rail, matchup stage, curated eight, roster sheet with search, side picker, tiles) → Start game → sign-in sheet → curtain-riser (lifecycle steps, 10 s / 30 s escalations, busy failure via tweak) → Stage (Tic-Tac-Toe and Connect Four play against a small engine; other families step a recorded line) → scoreline (win / loss / draw / timeout, Public/Private, share sheet). Battlefield (auto-playing Stage, marquee channel-switching, day-grouped programme, benchmark lane, box office) → replay page (transport, filmstrip, ledger, Next up). Search: **⌘K / Ctrl K**, **/**, or the magnifier.

## Honesty notes
- Posters and reasoning lines are fill anchored to the real last platform match (26 Jun 2026); the real chess sample carries no public explanations.
- No leaderboard, rankings, Elo, simulation counts, "Watch live" over replays, or December 2026 anywhere.
- Grand Slams: 8–14 Feb 2027; finals Sun 14 Feb 7:00 pm PT with local time beside it.

## Next
Per-family input overlays beyond grid_3x3 / connect_four; long-tail renderers (payoff_matrix, dice_table, auction/economic panels, custom boards); a dark-theme contrast sweep; phone landscape for watching.
