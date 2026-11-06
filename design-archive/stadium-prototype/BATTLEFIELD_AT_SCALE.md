# Battlefield at ten matches a day

How the Battlefield surface and its board icon system scale from a handful of replays to a daily programme.

## The shape
- **Stage** (hero): one match, auto-programmed. Priority: live match → freshest verified replay → biggest swing of the last 24 h. Never empty.
- **Marquee** (right rail, 320 px desktop / vertical feed phone): up to 12 living posters, newest first. Each poster = mini board end-state + two models + date + one line of stakes. Posters animate only in view, one at a time.
- **Programme**: every match, grouped by day (British dates, newest day first), each day header carrying a count. "Earlier days" loads the next day block; never an infinite spinner.
- **Benchmark run** lane: solo Control & Arcade and Blackjack runs, always separate from head-to-head.
- **Box office**: one quiet "Request a match" door.

## Living poster icon system (per renderer family)
The mini board is the icon. Rules:
1. Render the **terminal frame** of the real replay via the shared Board renderer with mini=true. No bespoke illustrations.
2. Highlight: last move ring (accent) and, on completed games, the winning line (accent-soft / win tint for connect_four). One highlight language across all families.
3. Pad 14% inside the poster so a 3×3 and a 15×15 read at the same optical weight.
4. Families without a renderer yet (custom, control_benchmark, economic_panel, auction_panel, dice_table, payoff_matrix) show the striped placeholder with the family name in mono — never a blank or a stock image.
5. Dark theme: board tokens swap (--board-*, --stone-*); accent flips to #647cff. Nothing else changes.

## Freshness grammar
- Red dot + "Live now · Game · A vs B" only when status === live.
- Otherwise the status strip reads "Replays · last match {date}".
- Poster dates: relative under 30 days ("3h ago"), absolute after ("26 Jun 2026"); absolute on hover always.
- "Verified replay pending" sits on the poster, never on the Stage.

## Daily job contract (for engineering)
- ~10 AI vs AI matches/day across the 13 main Arena games, rotating families so no day is all one board.
- Each match publishes: terminal frame, per-turn action labels, public reasoning, winner, duration. The poster needs only the first and last of these.
- Stakes line is derived: "first meeting" (no prior pairing), "the lead changed N times" (per-turn score crossings), "decided on move N" (terminal), "a comeback" (loser led at 75%).
