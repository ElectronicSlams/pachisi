"""Mutation self-test for scripts/validate-demonstrations.py.

Each planted corruption of the bundled trace (or of the renderer source) must
produce a new, un-allowlisted FAIL or RENDER finding for that game, proving the
validator would catch it. Stdlib only:
    python3 -I scripts/selftest-mutations.py [--repo PATH]
"""
import argparse, copy, importlib.util, json, sys, tempfile, subprocess
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("validate_demonstrations", HERE / "validate-demonstrations.py")
v = importlib.util.module_from_spec(_spec)
sys.modules["validate_demonstrations"] = v
_spec.loader.exec_module(v)

def mutations():
    def m(slug, fn, label): return (slug, fn, label)
    yield m("chess", lambda d: d["actions"].__setitem__(0, {"player": "player_1", "action": "e2e5"}), "pawn triple push")
    yield m("chess", lambda d: d["frames"][2]["state"].__setitem__("fen", d["frames"][2]["state"]["fen"].replace(" w ", " b ")), "side to move not toggled")
    yield m("connect-four", lambda d: (d["frames"][1]["state"]["board"][5].__setitem__(3, None), d["frames"][1]["state"]["board"][4].__setitem__(3, "R")), "floating disc")
    yield m("go", lambda d: d["frames"][6]["state"]["board"][4].__setitem__(4, None), "stone vanished w/o capture")
    yield m("tic-tac-toe", lambda d: d["frames"][2]["state"]["board"].__setitem__(0, "X"), "wrong symbol")
    yield m("othello", lambda d: d["frames"][1]["state"]["board"][3].__setitem__(3, "W"), "flip missing")
    yield m("checkers", lambda d: d["actions"].__setitem__(0, {"player": "player_1", "action": "5,0-3,2"}), "illegal jump")
    yield m("shogi", lambda d: d["frames"][5]["state"]["hands"]["player_1"].__setitem__("G", 1), "phantom hand piece")
    yield m("xiangqi", lambda d: d["actions"].__setitem__(11, {"player": "player_2", "action": "b0b2"}), "horse straight move")
    yield m("hex", lambda d: d["frames"][2]["state"]["board"][5].__setitem__(5, "W"), "colour swap")
    yield m("pentago", lambda d: d["actions"].__setitem__(0, {"player": "player_1", "action": "0:0:ccw"}), "wrong rotation")
    yield m("ultimate-tic-tac-toe", lambda d: d["frames"][2].__setitem__("state", {**d["frames"][2]["state"], "next_board": 5}), "wrong next_board")
    yield m("mancala", lambda d: d["frames"][4]["state"]["pits"]["player_1"].__setitem__(1, 8), "seed created")
    yield m("backgammon", lambda d: d["actions"].__setitem__(0, {"player": "player_1", "action": "move:0-3"}), "distance not a die")
    yield m("limit-texas-holdem", lambda d: d["frames"][5]["state"].__setitem__("pot", 5), "chips created")
    # Betting paths (review 2026-11-06 #3): raise sizing, folds and the pot ledger.
    yield m("limit-texas-holdem", lambda d: (d["frames"][3]["state"]["stacks"].__setitem__("player_3", 16), d["frames"][3]["state"]["committed"].__setitem__("player_3", 4)), "chips created on a raise")
    yield m("no-limit-texas-holdem", lambda d: (d["frames"][3]["state"]["stacks"].__setitem__("player_3", 17), d["frames"][3]["state"].__setitem__("pot", 14), d["frames"][3]["state"]["committed"].__setitem__("player_3", 3)), "fold that keeps betting")
    yield m("limit-texas-holdem", lambda d: d["frames"][3]["state"]["committed"].__setitem__("player_3", 6), "committed does not match the raise")
    yield m("no-limit-texas-holdem", lambda d: d["actions"].__setitem__(7, {"player": "player_4", "action": "call"}), "folded seat acts again")
    yield m("bridge", lambda d: d["frames"][4]["state"]["trick_history"][0].__setitem__("winner", "player_1"), "wrong trick winner")
    yield m("shedding-card-game", lambda d: d["actions"].__setitem__(1, {"player": "player_2", "action": "play:9H"}), "card does not match")
    yield m("cartpole", lambda d: d["frames"][10]["state"]["pole"].__setitem__("angle", 0.05), "pole teleport")
    yield m("mountain-car", lambda d: d["frames"][10]["state"].__setitem__("velocity", 0.02), "velocity jump")
    yield m("tic-tac-toe", lambda d: d["frames"][4].__setitem__("terminal", True), "terminal mid-trace")
    yield m("mahjong", lambda d: d["frames"][3]["state"].__setitem__("wall_count", 70), "wall grows")
    yield m("goofspiel", lambda d: d["frames"][-1]["state"]["points"].__setitem__("player_1", 9), "points miscount")
    yield m("paddle-ball", lambda d: d["frames"][18]["state"].__setitem__("paddle_x", 0.5), "paddle teleport")
    yield m("car-racing", lambda d: d["frames"][3]["state"]["car"].__setitem__("lane", 0.3), "lane teleport")
    yield m("car-racing", lambda d: d["frames"][3]["state"]["car"].__setitem__("speed", 0.17), "throttle mismatch")
    yield m("car-racing", lambda d: d["frames"][3]["state"]["car"].__setitem__("progress", 0.6), "progress teleport")
    yield m("bipedal-walker", lambda d: d["frames"][3]["state"]["walker"].__setitem__("torso_angle", 0.1), "torso rotation mismatch")
    yield m("bipedal-walker", lambda d: d["frames"][3]["state"]["walker"].__setitem__("energy", 95), "wrong energy cost")
    yield m("bipedal-walker", lambda d: d["frames"][3]["state"]["walker"].__setitem__("velocity", 0.1), "terrain velocity mismatch")
    yield m("lunar-lander", lambda d: d["frames"][3]["state"]["lander"].__setitem__("vx", 0.04), "unearned lateral thrust")
    yield m("lunar-lander", lambda d: d["frames"][3]["state"]["lander"].__setitem__("vy", 0.04), "unearned main thrust")
    # Ball dynamics (review F8): each changes only the ball, never the paddle or bounces.
    yield m("paddle-ball", lambda d: d["frames"][20]["state"]["ball"].__setitem__("x", 0.01), "ball x teleport (0.94464 -> 0.01)")
    yield m("paddle-ball", lambda d: d["frames"][30]["state"]["ball"].__setitem__("vx", -0.05), "ball velocity jump")
    yield m("paddle-ball", lambda d: d["frames"][18]["state"]["ball"].__setitem__("vx", 0.02768), "missing side-wall reflection")
    yield m("paddle-ball", lambda d: d["frames"][39]["state"]["ball"].__setitem__("vy", 0.042), "missing top-wall reflection")
    yield m("paddle-ball", lambda d: d["frames"][55]["state"]["ball"].__setitem__("vx", 0.04), "speed gained at a wall")
    # Rendered-but-derived fields and sealed-privacy checks (review 2026-11-06 #2).
    yield m("goofspiel", lambda d: d["frames"][1]["state"].__setitem__("committed", ["player_2"]), "committed names the wrong seat")
    yield m("pentago", lambda d: d["frames"][1]["placement"].__setitem__("cell", 35), "placement ring on the wrong cell")
    yield m("rock-paper-scissors", lambda d: d["actions"][0].__setitem__("action", "rock"), "raw sealed action in spectator event")
    yield m("rock-paper-scissors", lambda d: d["frames"][1]["state"]["revealed_actions"].__setitem__("player_1", "rock"), "choice revealed before resolution")
    yield m("cribbage", lambda d: d["frames"][1]["state"].__setitem__("discards", {"player_1": ["AC", "10D"]}), "raw crib discards leaked")
    yield m("first-price-sealed-bid-auction", lambda d: d["actions"][1].__setitem__("action", 5), "raw sealed bid in spectator event")


# Renderer-source corruptions: (slug, file under src/game, old, new, label).
SOURCE_MUTATIONS = [
    ("connect-four", "scene.tsx", "deriveCellCues(", "deriveCellCuesDisabled(", "CellScene stops passing cues"),
    ("connect-four", "cues.ts", "CUE_RULE_VERSION = 1", "CUE_RULE_VERSION = 2", "cue rule changed without the mirror"),
]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--repo", type=Path, default=v.DEFAULT_REPO); o = ap.parse_args()
    base = json.loads((o.repo / "src/game/game-demonstrations.json").read_text())
    known = v.load_known_issues(v.DEFAULT_KNOWN_ISSUES)
    sources = {name: (o.repo / "src/game" / name).read_text() for name in ("scene.tsx", "cues.ts")}
    ok, n = True, 0
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp); (t / "src/game").mkdir(parents=True)

        fixture = Path("scripts/fixtures/synthetic-validation-actions.json")
        (t / fixture).parent.mkdir(parents=True)
        (t / fixture).write_bytes((o.repo / fixture).read_bytes())

        def write_sources(override=None):
            for name, text in sources.items():
                (t / "src/game" / name).write_text(override[1] if override and override[0] == name else text)

        def baseline_issues(slug):
            write_sources(); (t / "src/game/game-demonstrations.json").write_text(json.dumps(base))
            reps, _ = v.run(t, known)
            return {(lvl, fr, msg) for lvl, fr, msg, _ in {s: r for s, _, r in reps}[slug].issues}

        for slug, fn, label in mutations():
            d = copy.deepcopy(base); fn(d["games"][slug])
            write_sources(); (t / "src/game/game-demonstrations.json").write_text(json.dumps(d))
            reps, _ = v.run(t, known)
            rep = {s: r for s, _, r in reps}[slug]
            hit = any(lvl == "FAIL" for lvl, _, _, _ in rep.issues)
            ok &= hit; n += 1
            print(f"{'caught' if hit else 'MISSED'}  {slug:22s} {label}")
        for slug, name, old, new, label in SOURCE_MUTATIONS:
            before = baseline_issues(slug)
            assert old in sources[name], f"source mutation anchor {old!r} not found in {name}"
            write_sources((name, sources[name].replace(old, new)))
            (t / "src/game/game-demonstrations.json").write_text(json.dumps(base))
            reps, _ = v.run(t, known)
            rep = {s: r for s, _, r in reps}[slug]
            hit = any(lvl in ("FAIL", "RENDER") and (lvl, fr, msg) not in before for lvl, fr, msg, _ in rep.issues)
            command = subprocess.run([sys.executable, "-I", str(HERE / "validate-demonstrations.py"), "--repo", str(t)], capture_output=True, text=True)
            hit = hit and command.returncode == 1
            ok &= hit; n += 1
            print(f"{'caught' if hit else 'MISSED'}  {slug:22s} {label} ({name}, CLI exit {command.returncode})")
    print(f"selftest: {n} planted errors, {'all caught' if ok else 'SOME MISSED'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
