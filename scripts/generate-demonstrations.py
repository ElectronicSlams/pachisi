"""Build synthetic public preview frames with the preview's pinned Core.

Run using the Core checkout's Python: generate-game-demonstrations.py
--core-root /path/to/core [--check]. No match data, services or hidden suites.
Only allowlisted public fields are exported; action plans are reproducible.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SEED = 112  # Public artwork seed, unrelated to any evaluation or match.
FIELDS = {
    "chess": "fen last_move_san", "go": "board", "hex": "board",
    "connect-four": "board", "tic-tac-toe": "board", "othello": "board",
    "checkers": "board", "shogi": "board hands", "xiangqi": "board",
    "gomoku": "board", "pentago": "board",
    "ultimate-tic-tac-toe": "boards local_status next_board",
    "nine-mens-morris": "board reserves phase", "mancala": "pits stores",
    "backgammon": "board dice bar borne_off",
    "battleship": "grid_size shots hits remaining_ship_counts",
    "blackjack": "player_hand dealer_hand",
    "leduc-holdem": "street board pot stacks committed folded",
    "limit-texas-holdem": "street board pot stacks committed folded",
    "no-limit-texas-holdem": "street board pot stacks committed folded",
    "shedding-card-game": "discard deck_count hand_counts",
    "crazy-eights": "discard deck_count hand_counts",
    "gin-rummy": "phase discard_top deck_count hand_counts",
    "mahjong": "wall_count discard_pile hand_counts",
    "dou-dizhu": "landlord hand_counts last_play passes",
    "bridge": "contract current_trick trick_history tricks hand_counts",
    "hearts": "current_trick trick_history penalties hand_counts",
    "spades": "current_trick trick_history tricks hand_counts",
    "euchre": "phase trump upcard current_trick history tricks hand_counts",
    "cribbage": "starter discards discard_counts hand_counts",
    "hanabi": "fireworks discard clues lives deck_count hand_counts",
    "liars-dice": "current_bid revealed_dice",
    "goofspiel": "current_prize points round_history",
    "rock-paper-scissors": "revealed_actions",
    "prisoners-dilemma": "revealed_actions",
    "bargaining": "last_offer", "negotiation": "last_offer",
    "first-price-sealed-bid-auction": "revealed_bids",
    "taxi": "rows cols taxi passenger destination onboard",
    "frozen-lake": "grid position goal",
    "cliff-walking": "rows cols position goal cliff",
    "cartpole": "cart pole", "mountain-car": "position velocity goal_position",
    "lunar-lander": "lander fuel landing_pad",
    "car-racing": "car track_window", "bipedal-walker": "walker terrain_window",
    "paddle-ball": "paddle_x ball bounces", "alien-shooter": "player_x aliens bullets destroyed",
    "boxing-style-arena": "health stamina stances distance",
    "ice-hockey-style-arena": "positions puck_owner goals rink",
}
PLANS = {
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
        preferred = "check" if "check" in legal else "call"
    elif slug in {"go", "gomoku", "hex"}:
        n = len(p["board"]); target = n * (n // 2) + n // 2
        return min((a for a in legal if isinstance(a, int)), key=lambda a: (abs(a // n - target // n) + abs(a % n - target % n), a))
    elif slug == "ultimate-tic-tac-toe":
        return min(legal, key=lambda a: (abs(a % 9 - 4), abs(a // 9 - 4)))
    elif slug == "mancala":
        return legal[(step * 2) % len(legal)]
    elif slug == "goofspiel":
        return legal[-1] if state.active_player == "player_2" else legal[0]
    if slug in CONTROL or slug == "boxing-style-arena":
        assert preferred in legal, (slug, step, preferred)
    return preferred if preferred in legal else legal[0]


def invariants(slug, p):
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
    public = {k: p[k] for k in FIELDS[slug].split() if k in p}
    for key in ("history", "trick_history", "round_history", "discard_pile"):
        if key in public: public[key] = public[key][-1:]
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
    for slug in registry.list():
        arena = registry.create(slug); state = arena.initial_state(SEED)
        frames = [frame(slug, state)]; actions = []
        length = len(PLANS[slug]) if slug in PLANS else 60 if slug in CONTROL else 12
        for step in range(length):
            if state.terminal: break
            legal = arena.legal_actions_for(state, state.active_player)
            action = choose(slug, state, legal, step); actor = state.active_player
            assert arena.is_legal(state, actor, action), (slug, step, action)
            state = arena.apply_action(state, actor, action)
            invariants(slug, state.public_state)
            actions.append({"player": actor, "action": action})
            frames.append(frame(slug, state, actor, action))
        assert len(frames) > 1
        actions_count += len(actions)
        games[slug] = {"version": arena.version, "delay": 100 if slug in CONTROL else 900, "frames": frames, "actions": actions}
    content = json.dumps({"coreCommit": pin, "publicArtworkSeed": SEED, "validatedActions": actions_count, "games": games}, ensure_ascii=False, separators=(",", ":")) + "\n"
    target = ROOT / "src/game/game-demonstrations.json"
    if opts.check: assert target.read_text() == content, "Generated demonstrations drifted; regenerate and review"
    else: target.write_text(content)
    print(f"{'Verified' if opts.check else 'Generated'} {len(games)} games; {actions_count} legal transitions; pinned Core {pin}")


if __name__ == "__main__": main()
