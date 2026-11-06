"""Build synthetic public preview frames with the preview's pinned Core.

Run using the Core checkout's Python:
    python scripts/generate-demonstrations.py --core-root /path/to/core [--check]
No match data, services or hidden suites. Only allowlisted public fields are
exported; action plans are reproducible. The output JSON is pinned by sha256 in
docs/game-coverage.json and must stay byte-for-byte reproducible, so frames carry
no presentation-only fields: last-move and win-line cues are derived at render
time (src/game/cues.ts). Every transition is re-checked without Core by
scripts/validate-demonstrations.py (`pnpm check:physics`, docs/physics.md).
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SEED = 112  # Public artwork seed, unrelated to any evaluation or match.
FIELDS = json.loads((ROOT / "src/game/public-fields.json").read_text())
PLANS = {
    "car-racing": "accelerate left right brake accelerate right left accelerate accelerate accelerate accelerate accelerate accelerate accelerate".split(),
    "chess": "e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 c2c3 d7d6".split(),
    "connect-four": [3, 2, 3, 2, 3, 2, 3],
    "tic-tac-toe": [4, 0, 2, 6, 3, 5, 8, 1, 7],
    "frozen-lake": "right right down down down right".split(),
    "cliff-walking": ["up"] + ["right"] * 11 + ["down"],
    "taxi": "up up left left pickup down down down down dropoff".split(),
    "blackjack": ["hit", "stand"],
    "bargaining": ["offer:60", "offer:50", "accept"],
    "negotiation": ["offer:60:2", "offer:40:2", "accept"],
    "first-price-sealed-bid-auction": [7, 5],
    "prisoners-dilemma": ["cooperate", "cooperate"],
    "rock-paper-scissors": ["rock", "scissors"],
    "liars-dice": ["2x5", "3x5", "challenge"],
}
CONTROL = {"cartpole", "mountain-car", "lunar-lander", "car-racing", "bipedal-walker", "paddle-ball", "alien-shooter"}
SEALED = {"rock-paper-scissors", "prisoners-dilemma", "goofspiel", "first-price-sealed-bid-auction"}


def choose(slug, state, legal, step):
    p = state.public_state
    if slug in PLANS and step < len(PLANS[slug]):
        action = PLANS[slug][step]
        assert action in legal, (slug, step, action)
        return action
    preferred = None
    if slug == "cartpole":
        preferred = "right" if p["pole"]["angle"] + p["pole"]["angular_velocity"] * .12 > 0 else "left"
    elif slug == "mountain-car":
        preferred = "right" if p["velocity"] >= 0 else "left"
    elif slug == "lunar-lander":
        preferred = "main" if p["lander"]["vy"] < -.06 else "idle"
    elif slug == "paddle-ball":
        d = p["ball"]["x"] + p["ball"]["vx"] - p["paddle_x"]
        preferred = "stay" if abs(d) < .06 else "right" if d > 0 else "left"
    elif slug == "car-racing":
        c = p["car"]; correction = c["lane"] + c["heading"] * 3
        preferred = "left" if correction > .08 else "right" if correction < -.08 else "accelerate"
    elif slug == "bipedal-walker":
        preferred = "balance" if abs(p["walker"]["torso_angle"]) > .2 else p["walker"]["next_foot"] + "-step"
    elif slug == "alien-shooter":
        preferred = "fire" if step % 3 != 2 else "right" if p["player_x"] < 5 else "left"
    elif slug == "boxing-style-arena":
        preferred = "step-in" if p["distance"] > 1 else "jab" if step % 3 else "guard"
    elif slug == "ice-hockey-style-arena":
        preferred = "shoot" if step % 5 == 4 else "advance" if state.active_player == p["puck_owner"] else "check"
    elif slug == "hanabi":
        preferred = "play:0" if step < 3 else "discard:0"
    elif slug == "euchre":
        preferred = "call:D" if p["phase"] == "call" else None
    elif slug in {"leduc-holdem", "limit-texas-holdem", "no-limit-texas-holdem"}:
        # Always checking keeps the plan deterministic, but it means the Limit and
        # No-limit demos are identical and no bet/raise/fold is ever shown
        # (docs/physics.md, "What the traces never exercise").
        preferred = "check" if "check" in legal else "call"
    elif slug in {"go", "gomoku", "hex"}:
        n = len(p["board"]); target = n * (n // 2) + n // 2
        return min((a for a in legal if isinstance(a, int)), key=lambda a: (abs(a // n - target // n) + abs(a % n - target % n), a))
    elif slug == "ultimate-tic-tac-toe":
        return min(legal, key=lambda a: (abs(a % 9 - 4), abs(a // 9 - 4)))
    elif slug == "mancala":
        return legal[(step * 2) % len(legal)]
    elif slug == "pentago" and step == 1:
        return next(move for move in legal if move.endswith(":ccw"))
    elif slug == "goofspiel":
        return legal[-1] if state.active_player == "player_2" else legal[0]
    if slug in CONTROL or slug == "boxing-style-arena":
        assert preferred in legal, (slug, step, preferred)
    return preferred if preferred in legal else legal[0]


def invariants(slug, p):
    # These mirror Core's variants at the artwork pin (e.g. 5 checkers a side), not
    # the standard published rules; scripts/validate-demonstrations.py reports both.
    if slug == "mancala":
        assert sum(sum(v) for v in p["pits"].values()) + sum(p["stores"].values()) == 48
    if slug == "backgammon":
        for player in ("player_1", "player_2"):
            assert sum(c["count"] for c in p["board"] if c and c["player"] == player) + p["bar"][player] + p["borne_off"][player] == 5
    if slug in {"bridge", "hearts", "spades", "euchre"}:
        trick = p["current_trick"]
        assert len({c["player"] for c in trick}) == len(trick)
        assert len({c["card"] for c in trick}) == len(trick)
    if slug == "paddle-ball":
        assert 0 <= p["paddle_x"] <= 1 and 0 <= p["ball"]["x"] <= 1
    if slug == "hanabi":
        assert set(p["fireworks"]) == {"R", "B"} and 0 <= p["clues"] <= 8
    assert finite(p)


def finite(value):
    if isinstance(value, float): return math.isfinite(value)
    if isinstance(value, dict): return all(finite(v) for v in value.values())
    if isinstance(value, (list, tuple)): return all(finite(v) for v in value)
    return True


def frame(slug, state, actor=None, action=None):
    p = state.public_state
    public = {k: p[k] for k in FIELDS[slug] if k in p}
    for key in ("history", "trick_history", "round_history", "discard_pile"):
        if key in public: public[key] = public[key][-1:]  # last entry only: a frame never shows older tricks/rounds
    caption = "Opening position" if actor is None else actor.replace("player_", "P") + " · " + str(action)
    if slug in SEALED and actor and not state.terminal:
        caption = actor.replace("player_", "P") + " · sealed choice"
    if state.terminal: caption = "Complete · " + str((state.outcome or {}).get("reason", "resolved")).replace("_", " ")
    return {"state": public, "caption": caption, "turn": state.turn, "terminal": state.terminal, "outcomeReason": (state.outcome or {}).get("reason")}


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--core-root", type=Path, required=True)
    args.add_argument("--check", action="store_true")
    opts = args.parse_args()
    pin = json.loads((ROOT / "src/game/game-demonstrations-source.json").read_text())["commit"]
    assert subprocess.check_output(["git", "-C", str(opts.core_root), "rev-parse", "HEAD"], text=True).strip() == pin
    assert not subprocess.check_output(["git", "-C", str(opts.core_root), "status", "--porcelain"], text=True).strip(), "Core must be clean"
    sys.path.insert(0, str(opts.core_root / "src"))
    from eslams.arenas import registry
    assert set(registry.list()) == set(FIELDS)
    games = {}; actions_count = 0
    validation_inputs = {}
    for slug in registry.list():
        arena = registry.create(slug); state = arena.initial_state(SEED)
        frames = [frame(slug, state)]; actions = []
        length = len(PLANS[slug]) if slug in PLANS else 60 if slug in CONTROL or slug == "pentago" else 12
        for step in range(length):
            if state.terminal: break
            legal = arena.legal_actions_for(state, state.active_player)
            action = choose(slug, state, legal, step); actor = state.active_player
            assert arena.is_legal(state, actor, action), (slug, step, action)
            state = arena.apply_action(state, actor, action)
            invariants(slug, state.public_state)
            current = frame(slug, state, actor, action)
            public_action = action
            if slug in SEALED or slug == "cribbage":
                validation_inputs.setdefault(slug, []).append(action)
                public_action = "sealed choice" if slug in SEALED else "discard two"
                if slug == "cribbage":
                    if not state.terminal:
                        current["caption"] = actor.replace("player_", "P") + " · discarded two"
                elif slug == "goofspiel":
                    current["state"]["committed"] = [actor] if actor == "player_1" else []
                    if actor == "player_2" and not state.terminal:
                        current["caption"] = "Both bids revealed"
            if slug == "pentago":
                cell, quadrant, direction = action.split(":")
                current["placement"] = {"cell": int(cell), "quadrant": int(quadrant), "direction": direction}
            actions.append({"player": actor, "action": public_action})
            frames.append(current)
        assert len(frames) > 1
        actions_count += len(actions)
        games[slug] = {"version": arena.version, "delay": 100 if slug in CONTROL else 900, "frames": frames, "actions": actions}
    content = json.dumps({"coreCommit": pin, "publicArtworkSeed": SEED, "validatedActions": actions_count, "games": games}, ensure_ascii=False, separators=(",", ":")) + "\n"
    target = ROOT / "src/game/game-demonstrations.json"
    inputs = ROOT / "scripts/fixtures/synthetic-validation-actions.json"
    for path, payload in [(target, content), (inputs, json.dumps(validation_inputs, indent=2) + "\n")]:
        if opts.check:
            assert path.read_text() == payload, f"{path.name} drifted; regenerate and review"
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(payload)
    print(f"{'Verified' if opts.check else 'Generated'} {len(games)} games; {actions_count} legal transitions; pinned Core {pin}")


if __name__ == "__main__": main()
