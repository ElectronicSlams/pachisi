# eSlams — Arena Rebuild · Design Notes

> *Here, AI plays games.* — Arena is the **consumer heart** of the platform, so it gets the most deliberate UX.
> Canonical build: **`eSlams v4.html`**. This note covers the Arena rebuild only; see `DESIGN_NOTES.md` / `_v3` / `_v4` for the rest.

---

## 1. First-principles brief

The old Arena was a plain "grid of game cards → model dropdown → board." Functional, not delightful. The user supplied a reference HTML whose *structure* was right — a **battle stage** that frames "You vs a model" like a real matchup. The job: take that structure and rebuild it inside our **clean light/dark system** (no neon, no glitch), add **animated previews per game**, a **vertical model wheel** with a **see-all** option, and a genuinely better **in-match** experience.

Three principles drove it:
1. **Show, don't tell.** The centerpiece is a *living* preview of the selected game — it animates a real sequence so a newcomer instantly understands what they're about to play.
2. **It's a matchup.** Frame every screen as **You vs Model** — combatants, VS badge, head-to-head bar in play, a result card that reads like a scoreline.
3. **One screen, no wizard.** Game, opponent, and difficulty are all chosen on a single stage; nothing is hidden behind steps.

---

## 2. Layout (v2 — restructured per direction)

The setup is now **two stacked zones** rather than a stage + side rail:

The setup is a **two-column top row over a full-width games grid**:

### TOP-LEFT — You vs Model matchup hero
A box with the game name/variant, the large **animated game preview** as centerpiece, and the **YOU vs MODEL** matchup below: **YOU** (the player's `username`, Challenger) · VS · the **opponent** (provider avatar, model name, "provider · public model"). The model side **updates live** as the scroller moves.

### TOP-RIGHT — opponent control box
A box holding the **vertical model scroller** (centered row = selected opponent, with an "All N models" link to the full modal) above the **Start game** button + "ready to play" / "demo board" status.

### BOTTOM — Select your arena
The game picker as a full-width **5-column grid**: a count chip + category tabs over tiles (icon, name, variant). The selected game carries an **Active** badge + accent ring.

**Removed:** the Difficulty step is gone from the Arena entirely (it lives on game/leaderboard pages where it belongs). Copy trimmed to *"Play a frontier model, head-to-head. Pick a game, choose your opponent, and go."* (the "no signup to play" clause dropped, since play is account-gated).

> Aesthetic note: the structure follows the user's reference, but the visual treatment stays in the eSlams system — clean accent-blue on light/dark, **no neon or glitch**.

## 3. Phases

### PLAY — match dashboard
- A focused **combatant bar**: Exit · **YOU vs [model] (game-specific Elo)** · game · difficulty · live **move counter**.
- The board sits in a generous, centered stage. Fully playable games (Tic-Tac-Toe, Connect Four, Othello, Rock-Paper-Scissors) run real engines; other arenas show a polished **demo** panel (animated board + "watch in Battlefield" / "simulate result") rather than a dead end.

### RESULT — scoreline card
- Outcome icon + **You won / lost / draw**, a **YOU vs model** chip line, and a meta block (game, opponent Elo, "saved to your profile"), then **Play again** / **New match**.

---

## 3. Animated previews (the centerpiece)

`app/arena-preview.jsx` maps each game to a looping, on-brand animation built from our tokens (no images):
- **Tic-Tac-Toe** — moves drop in, winning line highlights.
- **Connect Four** — discs fall with gravity easing; win glow.
- **Chess / Checkers / Shogi / Xiangqi** — a piece glides across a real board with static supporting pieces.
- **Go / Gomoku / Hex / Pentago** — stones place one by one on a 9×9 grid.
- **Othello** — real engine play with flipping discs.
- **Cards** (all card games) — a hand deals and fans, suit-aware.
- **Rock-Paper-Scissors** — hands shake then reveal, round by round.
- **Liar's Dice** — dice tumble and settle.
- **Social & Economic** — a payoff matrix pulses cell to cell.
- **Control & Arcade** — a lander descends to its pad / an agent runs a track to the goal.

All respect `prefers-reduced-motion` (animations disabled, end-state shown).

---

## 4. Files

| File | Role |
|---|---|
| `app/arena-preview.jsx` | **New.** `getArenaPreview(game)` + all preview components + `useStepLoop`. |
| `app/page-arena.jsx` | **Rewritten.** Setup stage, model wheel, see-all modal, play dashboard, result. |
| `styles/arena.css` | **New.** Stage, combatants, game rail, wheel, modal, play bar, result, and every preview visual — light + dark. |
| `app/data.js` | `levels` now objects (`key/label/icon/desc`); added `catShort`. |
| `app/page-game.jsx` | Updated to the new `levels` shape. |
| `eSlams v4.html` | Wires `arena.css` + `arena-preview.jsx`. |

Playable engines are reused from `app/games-arena.jsx` (Tic-Tac-Toe minimax, Connect Four negamax, Othello positional, RPS frequency-counter). No architectural change: no build step; React 18 + Babel-standalone; CSS-variable tokens.

---

## 5. Still to perfect
1. **Wire more real engines** — Chess and Texas Hold'em are the highest-value next builds so the marquee games are truly playable (today they use the demo panel).
2. **Wheel inertia on touch** — the wheel snaps and is fully usable; add momentum/drag affordance for mobile delight.
3. **Persist last setup** — remember the player's last game/opponent/difficulty across visits.
4. **Difficulty actually modulates engine depth** — currently labeled; wire it to real search depth / scenario seeds.
5. **Save to profile for real** — the result claims a profile save; connect it to the game-history store.
6. **Accessibility** — focus-trap the see-all modal, arrow-key the wheel, keyboard board play.
