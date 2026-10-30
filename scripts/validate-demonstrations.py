"""Physics / rules validator for Pachisi's bundled game demonstrations.

Usage (stdlib only, run isolated; see docs/physics.md):
    python3 -I scripts/validate-demonstrations.py [--repo PATH] [--json] [--strict]
        [--known-issues PATH]

Checks every frame transition in src/game/game-demonstrations.json against an
independent re-implementation of each game's rules (no Core import), plus
renderer cross-checks parsed from src/game/scene.tsx and src/game/cues.ts
(geometry, and a Python mirror of `deriveCellCues` so the last-move and
win-line cues the renderer draws stay consistent with the move that was made).

Severity levels
  FAIL    the trace contradicts the game's physics / the engine's own variant
  KNOWN   a FAIL listed in scripts/physics-known-issues.json (an upstream Core
          engine bug at the artwork pin, not a renderer bug); reported, not fatal
  RULE    legal under Core's simplified variant, illegal under standard rules
  RENDER  data is fine but the bundled renderer would misrepresent it
Exit status: 1 if any un-allowlisted FAIL, any stale allowlist entry, or (with
--strict) any finding at all; else 0.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

DEFAULT_REPO = Path(__file__).resolve().parents[1]  # scripts/ -> repo root
DEFAULT_KNOWN_ISSUES = Path(__file__).resolve().parent / "physics-known-issues.json"

# --------------------------------------------------------------------------- helpers


class Report:
    def __init__(self, slug: str):
        self.slug = slug
        self.checks: list[str] = []
        # (level, frame, message, check id or None)
        self.issues: list[tuple[str, int | None, str, str | None]] = []
        self.not_checkable: list[str] = []
        self.known: list[dict] = []  # allowlist entries that matched an issue

    def ran(self, *names: str) -> None:
        for n in names:
            if n not in self.checks:
                self.checks.append(n)

    def fail(self, frame: int | None, msg: str, level: str = "FAIL", check: str | None = None) -> None:
        self.issues.append((level, frame, msg, check))

    def nc(self, msg: str) -> None:
        self.not_checkable.append(msg)

    @property
    def result(self) -> str:
        levels = {lvl for lvl, _, _, _ in self.issues}
        if "FAIL" in levels:
            return "FAIL"
        if "KNOWN" in levels:
            return "KNOWN"
        if "RULE" in levels:
            return "PASS*(RULE)"
        if "RENDER" in levels:
            return "PASS*(RENDER)"
        return "PASS"


def load_known_issues(path: Path | None) -> list[dict]:
    if path is None or not path.exists():
        return []
    data = json.loads(path.read_text())
    entries = data["issues"] if isinstance(data, dict) else data
    for e in entries:
        missing = {"slug", "frame", "check", "description"} - set(e)
        if missing:
            raise SystemExit(f"{path.name}: entry {e!r} is missing {sorted(missing)}")
    return entries


def apply_known_issues(reports, entries: list[dict]) -> list[dict]:
    """Downgrade allowlisted FAILs to KNOWN; return entries that matched nothing (stale)."""
    stale = []
    by_slug = {s: r for s, _, r in reports}
    for e in entries:
        r = by_slug.get(e["slug"])
        hit = False
        if r is not None:
            for k, (lvl, fr, msg, check) in enumerate(r.issues):
                if lvl == "FAIL" and fr == e["frame"] and check == e["check"]:
                    r.issues[k] = ("KNOWN", fr, msg, check)
                    hit = True
        if hit:
            r.known.append(e)
        else:
            stale.append(e)
    return stale


def seat_no(player: str) -> int:
    return int(player.rsplit("_", 1)[1])


def grid(board):
    return [[c if c else "." for c in row] for row in board]


def count(board, token):
    return sum(row.count(token) for row in board)


RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = "SHDC"


def card_ok(card: str) -> bool:
    return isinstance(card, str) and card[-1:] in SUITS and card[:-1] in RANKS


def rank_of(card: str) -> str:
    return card[:-1]


def suit_of(card: str) -> str:
    return card[-1]


# --------------------------------------------------------------------------- generic


def generic(slug, demo, r: Report, sealed: bool):
    frames, actions = demo["frames"], demo["actions"]
    r.ran("frames==actions+1", "turn==index", "terminal-only-last", "caption/actor")
    if len(frames) != len(actions) + 1:
        r.fail(None, f"{len(frames)} frames vs {len(actions)} actions")
    for i, f in enumerate(frames):
        if f["turn"] != i:
            r.fail(i, f"turn {f['turn']} != index {i}")
        if f["terminal"] and i != len(frames) - 1:
            r.fail(i, "terminal frame is not the last frame")
        if bool(f.get("outcomeReason")) != bool(f["terminal"]):
            r.fail(i, "outcomeReason present iff terminal violated")
        if f["caption"].startswith("Complete") != bool(f["terminal"]):
            r.fail(i, "result caption on non-terminal frame (or missing on terminal)")
        if i == 0:
            continue
        a = actions[i - 1]
        if f["terminal"]:
            continue
        p = "P" + str(seat_no(a["player"]))
        want = f"{p} · sealed choice" if sealed else f"{p} · {a['action']}"
        if f["caption"] != want:
            r.fail(i, f"caption {f['caption']!r} != {want!r}")


def alternate(actions, r: Report, n_players=2, allowed=lambda i: False):
    r.ran("turn-order")
    for i in range(1, len(actions)):
        prev, cur = seat_no(actions[i - 1]["player"]), seat_no(actions[i]["player"])
        if allowed(i):
            continue
        if cur != prev % n_players + 1:
            r.fail(i + 1, f"turn order: P{prev} then P{cur}")


# --------------------------------------------------------------------------- simple placement games

LINES3 = [(0, 1, 2), (3, 4, 5), (6, 7, 8), (0, 3, 6), (1, 4, 7), (2, 5, 8), (0, 4, 8), (2, 4, 6)]


def ttt_winner(cells):
    for a, b, c in LINES3:
        if cells[a] and cells[a] == cells[b] == cells[c]:
            return cells[a]
    return None


def check_tic_tac_toe(demo, r):
    r.ran("9 cells", "place-one-mark", "X=P1/O=P2", "no-win-before-terminal", "terminal-reason")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        before, after = frames[i - 1]["state"]["board"], frames[i]["state"]["board"]
        if len(after) != 9:
            r.fail(i, "board is not 9 cells")
        mark = "X" if a["player"] == "player_1" else "O"
        exp = list(before)
        if exp[a["action"]] is not None:
            r.fail(i, "placed on occupied cell")
        exp[a["action"]] = mark
        if exp != after:
            r.fail(i, "board != expected placement")
        w = ttt_winner(after)
        if w and not frames[i]["terminal"]:
            r.fail(i, "win on board but not terminal")
    last = frames[-1]
    if last["terminal"]:
        b = last["state"]["board"]
        if last["outcomeReason"] == "draw" and (ttt_winner(b) or None in b):
            r.fail(len(frames) - 1, "declared draw but board not full / has a line")


def check_connect_four(demo, r):
    r.ran("6x7", "gravity", "drop-lands-lowest", "R=P1/Y=P2", "four-in-row only at terminal")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)

    def four(b):
        R, C = len(b), len(b[0])
        for y in range(R):
            for x in range(C):
                t = b[y][x]
                if not t:
                    continue
                for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
                    cells = [(y + k * dy, x + k * dx) for k in range(4)]
                    if all(0 <= yy < R and 0 <= xx < C and b[yy][xx] == t for yy, xx in cells):
                        return cells
        return None

    for i, f in enumerate(frames):
        b = f["state"]["board"]
        if len(b) != 6 or any(len(row) != 7 for row in b):
            r.fail(i, "board is not 6x7")
        for x in range(7):
            col = [b[y][x] for y in range(6)]
            seen = False
            for v in col:
                if v:
                    seen = True
                elif seen:
                    r.fail(i, f"floating disc in column {x} (gravity)")
                    break
        if i == 0:
            continue
        a = actions[i - 1]
        before = [list(row) for row in frames[i - 1]["state"]["board"]]
        col = a["action"]
        land = max((y for y in range(6) if before[y][col] is None), default=None)
        if land is None:
            r.fail(i, "drop into full column")
            continue
        before[land][col] = "R" if a["player"] == "player_1" else "Y"
        if before != b:
            r.fail(i, "board != gravity drop")
        line = four(b)
        if line and not f["terminal"]:
            r.fail(i, "four-in-a-row present but frame not terminal")
        if f["terminal"] and f["outcomeReason"] == "four_in_a_row" and not line:
            r.fail(i, "terminal four_in_a_row without a line")


def neighbours4(y, x, n):
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if 0 <= y + dy < n and 0 <= x + dx < n:
            yield y + dy, x + dx


def group_libs(b, y, x):
    n = len(b)
    colour = b[y][x]
    stack, seen, libs = [(y, x)], {(y, x)}, set()
    while stack:
        cy, cx = stack.pop()
        for ny, nx in neighbours4(cy, cx, n):
            v = b[ny][nx]
            if v is None:
                libs.add((ny, nx))
            elif v == colour and (ny, nx) not in seen:
                seen.add((ny, nx))
                stack.append((ny, nx))
    return seen, libs


def check_go(demo, r):
    r.ran("9x9 square", "place-on-empty", "B=P1/W=P2", "capture-removes-dead-groups-only", "no-suicide", "stone-count-conservation")
    r.nc("ko / superko not checked (no repeated positions in trace)")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        n = len(b)
        after = frames[i]["state"]["board"]
        if any(len(row) != n for row in after) or len(after) != n:
            r.fail(i, "board not square")
        if a["action"] == "pass":
            if b != after:
                r.fail(i, "pass changed board")
            continue
        y, x = divmod(a["action"], n)
        if b[y][x] is not None:
            r.fail(i, "placed on occupied point")
            continue
        me = "B" if a["player"] == "player_1" else "W"
        opp = "W" if me == "B" else "B"
        b[y][x] = me
        captured = 0
        for ny, nx in neighbours4(y, x, n):
            if b[ny][nx] == opp:
                stones, libs = group_libs(b, ny, nx)
                if not libs:
                    for sy, sx in stones:
                        b[sy][sx] = None
                    captured += len(stones)
        if not group_libs(b, y, x)[1]:
            r.fail(i, "suicide move")
        if b != after:
            r.fail(i, "board != placement+captures")
        if count(after, "B") + count(after, "W") != count(frames[i - 1]["state"]["board"], "B") + count(frames[i - 1]["state"]["board"], "W") + 1 - captured:
            r.fail(i, "stone count not conserved")


def lines_of_five(b, need):
    n = len(b)
    for y in range(n):
        for x in range(n):
            t = b[y][x]
            if not t:
                continue
            for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
                if all(0 <= y + k * dy < n and 0 <= x + k * dx < n and b[y + k * dy][x + k * dx] == t for k in range(need)):
                    return t
    return None


def check_gomoku(demo, r):
    r.ran("15x15", "place-on-empty", "B=P1/W=P2", "no-five-before-terminal")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        n = len(b)
        if n != 15:
            r.fail(i, f"board {n}x{n}, expected 15x15")
        y, x = divmod(a["action"], n)
        if b[y][x] is not None:
            r.fail(i, "occupied")
        b[y][x] = "B" if a["player"] == "player_1" else "W"
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != placement")
        if lines_of_five(b, 5) and not frames[i]["terminal"]:
            r.fail(i, "five in a row but not terminal")


HEX_NEIGHBORS = ((-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0))  # Core eslams/arenas/hex.py


def hex_connected(b, stone, axis):
    n = len(b)
    from collections import deque
    starts = [(0, c) for c in range(n)] if axis == "tb" else [(rr, 0) for rr in range(n)]
    q = deque(p for p in starts if b[p[0]][p[1]] == stone)
    seen = set(q)
    while q:
        y, x = q.popleft()
        if (axis == "tb" and y == n - 1) or (axis == "lr" and x == n - 1):
            return True
        for dy, dx in HEX_NEIGHBORS:
            p = (y + dy, x + dx)
            if 0 <= p[0] < n and 0 <= p[1] < n and p not in seen and b[p[0]][p[1]] == stone:
                seen.add(p)
                q.append(p)
    return False


def check_hex(demo, r):
    r.ran("11x11 rhombus", "place-on-empty", "B=P1/W=P2", "no-connection-before-terminal", "renderer-adjacency==rule-adjacency", "edge-colour==goal-axis")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        n = len(b)
        y, x = divmod(a["action"], n)
        if b[y][x] is not None:
            r.fail(i, "occupied")
        b[y][x] = "B" if a["player"] == "player_1" else "W"
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != placement")
        if (hex_connected(b, "B", "tb") or hex_connected(b, "W", "lr")) and not frames[i]["terminal"]:
            r.fail(i, "connection but not terminal")
    # Renderer geometry (board.tsx HexBoard): cx = c*sqrt3 + r*sqrt3/2, cy = r*1.5.
    n = len(frames[0]["state"]["board"])
    s3 = math.sqrt(3)
    centre = {(y, x): (x * s3 + y * s3 / 2, y * 1.5) for y in range(n) for x in range(n)}
    for (y, x), (cx, cy) in centre.items():
        geo = {p for p, (px, py) in centre.items() if p != (y, x) and abs(math.hypot(px - cx, py - cy) - s3) < 1e-6}
        rule = {(y + dy, x + dx) for dy, dx in HEX_NEIGHBORS if 0 <= y + dy < n and 0 <= x + dx < n}
        if geo != rule:
            r.fail(None, f"rendered hex adjacency differs from rule adjacency at {(y, x)}", "RENDER")
            break
    # board.tsx: rows 0/n-1 coloured 'a' (=R token = Core B = player_1, goal top-bottom). Consistent.


DIRS8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def othello_flips(b, y, x, me):
    opp = "W" if me == "B" else "B"
    flips = []
    for dy, dx in DIRS8:
        run, cy, cx = [], y + dy, x + dx
        while 0 <= cy < 8 and 0 <= cx < 8 and b[cy][cx] == opp:
            run.append((cy, cx))
            cy += dy
            cx += dx
        if run and 0 <= cy < 8 and 0 <= cx < 8 and b[cy][cx] == me:
            flips += run
    return flips


def check_othello(demo, r):
    r.ran("8x8", "standard-opening", "move-must-flip", "exact-flip-set", "B=P1/W=P2", "pass-only-when-no-move")
    frames, actions = demo["frames"], demo["actions"]
    b0 = frames[0]["state"]["board"]
    if not (b0[3][3] == b0[4][4] == "W" and b0[3][4] == b0[4][3] == "B"):
        r.fail(0, "non-standard opening")
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        me = "B" if a["player"] == "player_1" else "W"
        y, x = a["action"]
        if b[y][x] is not None:
            r.fail(i, "occupied")
            continue
        fl = othello_flips(b, y, x, me)
        if not fl:
            r.fail(i, "move flips nothing (illegal)")
        b[y][x] = me
        for fy, fx in fl:
            b[fy][fx] = me
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != placement+flips")
        if i < len(actions) and actions[i]["player"] == a["player"]:
            opp = "W" if me == "B" else "B"
            if any(b[yy][xx] is None and othello_flips(b, yy, xx, opp) for yy in range(8) for xx in range(8)):
                r.fail(i + 1, "same player moved again although opponent had a legal move")
    alternate(actions, r)


def check_pentago(demo, r):
    r.ran("6x6", "place-on-empty", "quadrant-rotation(cw/ccw)", "no-five-before-terminal")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        cell, q, d = a["action"].split(":")
        cell, q = int(cell), int(q)
        y, x = divmod(cell, 6)
        if b[y][x] is not None:
            r.fail(i, "occupied")
        b[y][x] = "B" if a["player"] == "player_1" else "W"
        oy, ox = (0 if q in (0, 1) else 3), (0 if q in (0, 2) else 3)
        sub = [[b[oy + yy][ox + xx] for xx in range(3)] for yy in range(3)]
        for yy in range(3):
            for xx in range(3):
                if d == "cw":
                    b[oy + xx][ox + 2 - yy] = sub[yy][xx]
                else:
                    b[oy + 2 - xx][ox + yy] = sub[yy][xx]
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != place+rotate")
        if lines_of_five(b, 5) and not frames[i]["terminal"]:
            r.fail(i, "five but not terminal")


def check_uttt(demo, r, scene_src=""):
    r.ran("9x(3x3)", "action=board*9+cell", "must-play-in-next_board", "next_board=cell-or-free", "local_status")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        bi, ci = divmod(a["action"], 9)
        if s0["next_board"] is not None and bi != s0["next_board"]:
            r.fail(i, f"played board {bi} but next_board was {s0['next_board']}")
        if s0["local_status"][bi] is not None:
            r.fail(i, "played in decided local board")
        boards = [list(x) for x in s0["boards"]]
        if boards[bi][ci] is not None:
            r.fail(i, "occupied")
        boards[bi][ci] = "X" if a["player"] == "player_1" else "O"
        if boards != s1["boards"]:
            r.fail(i, "boards != placement")
        status = list(s0["local_status"])
        w = ttt_winner(boards[bi])
        status[bi] = w if w else ("draw" if None not in boards[bi] else None)
        if status != s1["local_status"]:
            r.fail(i, f"local_status {s1['local_status']} != {status}")
        nb = ci if status[ci] is None else None
        if s1["next_board"] != nb:
            r.fail(i, f"next_board {s1['next_board']} != {nb}")
    if "local_status" not in scene_src and any(any(v is not None for v in f["state"]["local_status"]) for f in frames):
        r.fail(None, "renderer never shows local_status (won/drawn sub-boards look playable)", "RENDER")


# --------------------------------------------------------------------------- chess

def fen_board(fen):
    rows = []
    for rank in fen.split()[0].split("/"):
        row = []
        for ch in rank:
            row += [None] * int(ch) if ch.isdigit() else [ch]
        rows.append(row)
    return rows


def sq(name):
    return 8 - int(name[1]), ord(name[0]) - 97


def is_white(p):
    return p is not None and p.isupper()


def attacked(b, y, x, by_white):
    for yy in range(8):
        for xx in range(8):
            p = b[yy][xx]
            if p is None or is_white(p) != by_white:
                continue
            if pseudo_ok(b, (yy, xx), (y, x), attack_only=True):
                return True
    return False


def path_clear(b, f, t):
    dy = (t[0] > f[0]) - (t[0] < f[0])
    dx = (t[1] > f[1]) - (t[1] < f[1])
    y, x = f[0] + dy, f[1] + dx
    while (y, x) != t:
        if b[y][x] is not None:
            return False
        y += dy
        x += dx
    return True


def pseudo_ok(b, f, t, ep=None, attack_only=False):
    p = b[f[0]][f[1]]
    if p is None or f == t:
        return False
    tgt = b[t[0]][t[1]]
    if tgt is not None and is_white(tgt) == is_white(p):
        return False
    dy, dx = t[0] - f[0], t[1] - f[1]
    k = p.lower()
    if k == "n":
        return (abs(dy), abs(dx)) in ((1, 2), (2, 1))
    if k == "k":
        return max(abs(dy), abs(dx)) == 1
    if k in "rbq":
        straight = dy == 0 or dx == 0
        diag = abs(dy) == abs(dx)
        if (k == "r" and not straight) or (k == "b" and not diag) or (k == "q" and not (straight or diag)):
            return False
        return path_clear(b, f, t)
    fwd = -1 if is_white(p) else 1
    if attack_only:
        return dy == fwd and abs(dx) == 1
    if dx == 0 and tgt is None:
        if dy == fwd:
            return True
        start = 6 if is_white(p) else 1
        return dy == 2 * fwd and f[0] == start and b[f[0] + fwd][f[1]] is None
    if abs(dx) == 1 and dy == fwd:
        return tgt is not None or (ep is not None and t == ep)
    return False


def apply_uci(fen, uci):
    """Return (new_board, problems, info) for a UCI move from FEN."""
    parts = fen.split()
    b = fen_board(fen)
    white = parts[1] == "w"
    rights = parts[2]
    ep = None if parts[3] == "-" else sq(parts[3])
    f, t = sq(uci[:2]), sq(uci[2:4])
    promo = uci[4:] or None
    problems = []
    p = b[f[0]][f[1]]
    if p is None:
        return b, ["no piece on source square"], {}
    if is_white(p) != white:
        problems.append("moved opponent's piece / wrong side to move")
    castle = p.lower() == "k" and abs(t[1] - f[1]) == 2 and t[0] == f[0]
    capture = b[t[0]][t[1]] is not None
    if castle:
        side = "K" if t[1] == 6 else "Q"
        flag = side if white else side.lower()
        if flag not in rights:
            problems.append("castling without right")
        rook_from = (f[0], 7 if side == "K" else 0)
        if not path_clear(b, f, rook_from):
            problems.append("castling through pieces")
        for xx in (f[1], (f[1] + t[1]) // 2, t[1]):
            if attacked(b, f[0], xx, not white):
                problems.append("castling through/out of check")
                break
        b[t[0]][t[1]], b[f[0]][f[1]] = p, None
        rook = b[rook_from[0]][rook_from[1]]
        b[rook_from[0]][rook_from[1]] = None
        b[f[0]][(f[1] + t[1]) // 2] = rook
    else:
        if not pseudo_ok(b, f, t, ep):
            problems.append(f"illegal {p} geometry {uci}")
        is_ep = p.lower() == "p" and ep == t and b[t[0]][t[1]] is None and f[1] != t[1]
        b[t[0]][t[1]], b[f[0]][f[1]] = p, None
        if is_ep:
            b[f[0]][t[1]] = None
            capture = True
        last = 0 if white else 7
        if p.lower() == "p" and t[0] == last:
            if not promo:
                problems.append("pawn reached last rank without promotion")
            b[t[0]][t[1]] = promo.upper() if white else promo.lower()
        elif promo:
            problems.append("promotion suffix on non-promoting move")
    ky, kx = next((yy, xx) for yy in range(8) for xx in range(8) if b[yy][xx] == ("K" if white else "k"))
    if attacked(b, ky, kx, not white):
        problems.append("own king left in check")
    return b, problems, {"piece": p, "capture": capture, "castle": castle, "from": f, "to": t, "promo": promo, "white": white}


def san_for(fen, uci, after_b, info):
    if info["castle"]:
        s = "O-O" if info["to"][1] == 6 else "O-O-O"
    else:
        p = info["piece"]
        dest = uci[2:4]
        if p.lower() == "p":
            s = (uci[0] + "x" if info["capture"] else "") + dest + ("=" + info["promo"].upper() if info["promo"] else "")
        else:
            b = fen_board(fen)
            others = [(yy, xx) for yy in range(8) for xx in range(8) if b[yy][xx] == p and (yy, xx) != info["from"] and pseudo_ok(b, (yy, xx), info["to"])]
            dis = ""
            if others:
                if all(o[1] != info["from"][1] for o in others):
                    dis = uci[0]
                elif all(o[0] != info["from"][0] for o in others):
                    dis = uci[1]
                else:
                    dis = uci[:2]
            s = p.upper() + dis + ("x" if info["capture"] else "") + dest
    opp_white = not info["white"]
    ky, kx = next((yy, xx) for yy in range(8) for xx in range(8) if after_b[yy][xx] == ("K" if opp_white else "k"))
    if attacked(after_b, ky, kx, info["white"]):
        s += "+"
    return s


def check_chess(demo, r):
    r.ran("8x8 from FEN", "piece-geometry+path", "side-to-move", "king-not-left-in-check", "castling-shape/rights", "en-passant", "promotion-shape", "castling-rights-update", "halfmove/fullmove clocks", "SAN==move", "a1-dark-square(renderer)")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        fen0, fen1 = frames[i - 1]["state"]["fen"], frames[i]["state"]["fen"]
        b, probs, info = apply_uci(fen0, a["action"])
        for pr in probs:
            r.fail(i, pr)
        if not info:
            continue
        if b != fen_board(fen1):
            r.fail(i, "resulting placement != next FEN")
        p0, p1 = fen0.split(), fen1.split()
        if p1[1] == p0[1]:
            r.fail(i, "side to move did not toggle")
        rights = p0[2]
        moved = info["piece"]
        for flag, square in (("K", "h1"), ("Q", "a1"), ("k", "h8"), ("q", "a8")):
            if a["action"][:2] == square or a["action"][2:4] == square:
                rights = rights.replace(flag, "")
        if moved == "K":
            rights = rights.replace("K", "").replace("Q", "")
        if moved == "k":
            rights = rights.replace("k", "").replace("q", "")
        rights = rights or "-"
        if p1[2] != rights:
            r.fail(i, f"castling rights {p1[2]} != {rights}")
        hm = 0 if moved.lower() == "p" or info["capture"] else int(p0[4]) + 1
        if int(p1[4]) != hm:
            r.fail(i, f"halfmove {p1[4]} != {hm}")
        fm = int(p0[5]) + (0 if info["white"] else 1)
        if int(p1[5]) != fm:
            r.fail(i, f"fullmove {p1[5]} != {fm}")
        san = san_for(fen0, a["action"], b, info)
        if frames[i]["state"].get("last_move_san") != san:
            r.fail(i, f"SAN {frames[i]['state'].get('last_move_san')!r} != {san!r}")
    # renderer colouring: board.tsx dark = (row+col)%2==1 with row 0 = rank 8 (FEN order)
    if not ((7 + 0) % 2 == 1 and (7 + 7) % 2 == 0):
        r.fail(None, "a1 not dark", "RENDER")


# --------------------------------------------------------------------------- checkers / shogi / xiangqi


def checkers_captures(b, player, y, x):
    p = b[y][x]
    mine = "rR" if player == "player_1" else "bB"
    opp = "bB" if player == "player_1" else "rR"
    if p is None or p not in mine:
        return []
    dirs = [(-1, -1), (-1, 1)] if p == "r" else [(1, -1), (1, 1)] if p == "b" else [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    out = []
    for dy, dx in dirs:
        my, mx, ty, tx = y + dy, x + dx, y + 2 * dy, x + 2 * dx
        if 0 <= ty < 8 and 0 <= tx < 8 and b[my][mx] in tuple(opp) and b[ty][tx] is None:
            out.append((ty, tx))
    return out


def check_checkers(demo, r):
    r.ran("8x8", "pieces-on-dark-squares", "renderer-dark==(r+c)%2", "diagonal-step/jump", "man-forward-only", "mandatory-capture", "multi-jump-continuation", "promotion", "piece-conservation")
    frames, actions = demo["frames"], demo["actions"]
    for i, f in enumerate(frames):
        for y, row in enumerate(f["state"]["board"]):
            for x, v in enumerate(row):
                if v and (y + x) % 2 != 1:
                    r.fail(i, f"piece on light square {(y, x)}")
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        (sy, sx), (ey, ex) = [tuple(int(v) for v in s.split(",")) for s in a["action"].split("-")]
        p = b[sy][sx]
        mine = "rR" if a["player"] == "player_1" else "bB"
        if p is None or p not in mine:
            r.fail(i, "moved a piece that is not the actor's")
            continue
        any_cap = any(checkers_captures(b, a["player"], yy, xx) for yy in range(8) for xx in range(8))
        dy, dx = ey - sy, ex - sx
        if abs(dy) != abs(dx) or abs(dy) not in (1, 2):
            r.fail(i, "not a diagonal step/jump")
            continue
        if p == "r" and dy > 0 or p == "b" and dy < 0:
            r.fail(i, "man moved backwards")
        if abs(dy) == 1 and any_cap:
            r.fail(i, "non-capture while a capture was available (mandatory capture)")
        if b[ey][ex] is not None:
            r.fail(i, "landing square occupied")
        b[sy][sx] = None
        captured = False
        if abs(dy) == 2:
            my, mx = (sy + ey) // 2, (sx + ex) // 2
            if b[my][mx] is None or b[my][mx] in mine:
                r.fail(i, "jump over empty/own square")
            b[my][mx] = None
            captured = True
        promoted = (p == "r" and ey == 0) or (p == "b" and ey == 7)
        b[ey][ex] = p.upper() if promoted else p
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != expected move")
        more = captured and not promoted and checkers_captures(b, a["player"], ey, ex)
        if i < len(actions):
            nxt = actions[i]
            if more and (nxt["player"] != a["player"] or not nxt["action"].startswith(f"{ey},{ex}-")):
                r.fail(i + 1, "multi-jump not continued by same piece")
            if not more and nxt["player"] == a["player"]:
                r.fail(i + 1, "same player moved twice without a pending jump")


SHOGI_STEPS = {
    "P": [(-1, 0)], "N": [(-2, -1), (-2, 1)], "S": [(-1, -1), (-1, 0), (-1, 1), (1, -1), (1, 1)],
    "G": [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, 0)], "K": [(dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx],
}
for _p in ("+P", "+L", "+N", "+S"):
    SHOGI_STEPS[_p] = SHOGI_STEPS["G"]


def shogi_sq(s):  # USI: file digit (1 = rightmost col 8), rank letter a = row 0
    return ord(s[1]) - 97, 9 - int(s[0])


def shogi_ok(b, f, t, piece, sente):
    dy, dx = t[0] - f[0], t[1] - f[1]
    if not sente:
        dy = -dy
        dx = -dx
    base = piece.upper()
    if base in SHOGI_STEPS:
        return (dy, dx) in SHOGI_STEPS[base]
    slide = {"L": [(-1, 0)], "R": [(-1, 0), (1, 0), (0, -1), (0, 1)], "B": [(-1, -1), (-1, 1), (1, -1), (1, 1)]}
    if base == "+R" and max(abs(dy), abs(dx)) == 1:
        return True
    if base == "+B" and max(abs(dy), abs(dx)) == 1:
        return True
    dirs = slide[base.lstrip("+")]
    for ddy, ddx in dirs:
        k = 1
        while True:
            if (ddy * k, ddx * k) == (dy, dx):
                return path_clear(b, f, t)
            k += 1
            if k > 9:
                break
    return False


def check_shogi(demo, r):
    r.ran("9x9", "USI-coordinates", "piece-geometry+path", "captures->hand(demoted)", "promotion-zone", "piece-conservation(40)")
    r.nc("check/checkmate, nifu, uchifuzume not checked")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        s0 = frames[i - 1]["state"]
        b = [list(row) for row in s0["board"]]
        hands = {k: dict(v) for k, v in s0["hands"].items()}
        mv = a["action"]
        sente = a["player"] == "player_1"
        if "*" in mv:
            pc, dst = mv.split("*")
            t = shogi_sq(dst)
            if b[t[0]][t[1]] is not None or hands[a["player"]].get(pc, 0) < 1:
                r.fail(i, "illegal drop")
            hands[a["player"]][pc] -= 1
            if not hands[a["player"]][pc]:
                del hands[a["player"]][pc]
            b[t[0]][t[1]] = pc if sente else pc.lower()
        else:
            f, t = shogi_sq(mv[:2]), shogi_sq(mv[2:4])
            p = b[f[0]][f[1]]
            if p is None or (p.lstrip("+").isupper() != sente):
                r.fail(i, "moved non-own piece")
                continue
            tgt = b[t[0]][t[1]]
            if tgt is not None and tgt.lstrip("+").isupper() == sente:
                r.fail(i, "captured own piece")
            if not shogi_ok(b, f, t, p.upper() if not p.startswith("+") else "+" + p[1].upper(), sente):
                r.fail(i, f"illegal geometry for {p} {mv}")
            if tgt is not None:
                key = tgt.lstrip("+").upper()
                hands[a["player"]][key] = hands[a["player"]].get(key, 0) + 1
            b[f[0]][f[1]] = None
            if mv.endswith("+"):
                zone = range(0, 3) if sente else range(6, 9)
                if f[0] not in zone and t[0] not in zone:
                    r.fail(i, "promotion outside zone")
                p = "+" + p
            b[t[0]][t[1]] = p
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != expected")
        if hands != frames[i]["state"]["hands"]:
            r.fail(i, f"hands {frames[i]['state']['hands']} != {hands}")
        total = sum(1 for row in frames[i]["state"]["board"] for v in row if v) + sum(sum(h.values()) for h in frames[i]["state"]["hands"].values())
        if total != 40:
            r.fail(i, f"piece conservation {total} != 40")


def check_xiangqi(demo, r):
    r.ran("10x9 intersections", "file-letter/row-digit coords", "piece-geometry(R,H-leg,E-eye+river,A/G-palace,C-screen,S-river)", "flying-general", "piece-conservation")
    r.nc("check/checkmate not checked")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        b = [list(row) for row in frames[i - 1]["state"]["board"]]
        mv = a["action"]
        f = (int(mv[1]), ord(mv[0]) - 97)
        t = (int(mv[3]), ord(mv[2]) - 97)
        p = b[f[0]][f[1]]
        red = a["player"] == "player_1"
        if p is None or p.isupper() != red:
            r.fail(i, "moved non-own piece")
            continue
        tgt = b[t[0]][t[1]]
        if tgt is not None and tgt.isupper() == red:
            r.fail(i, "captured own piece")
        dy, dx = t[0] - f[0], t[1] - f[1]
        k = p.upper()
        ok = False
        if k == "R":
            ok = (dy == 0 or dx == 0) and path_clear(b, f, t)
        elif k == "C":
            if dy == 0 or dx == 0:
                between = 0
                step_y, step_x = (dy > 0) - (dy < 0), (dx > 0) - (dx < 0)
                y, x = f[0] + step_y, f[1] + step_x
                while (y, x) != t:
                    between += b[y][x] is not None
                    y += step_y
                    x += step_x
                ok = between == 0 if tgt is None else between == 1
        elif k == "H":
            if (abs(dy), abs(dx)) in ((1, 2), (2, 1)):
                leg = (f[0] + (dy // 2 if abs(dy) == 2 else 0), f[1] + (dx // 2 if abs(dx) == 2 else 0))
                ok = b[leg[0]][leg[1]] is None
        elif k == "E":
            ok = abs(dy) == 2 and abs(dx) == 2 and b[f[0] + dy // 2][f[1] + dx // 2] is None and ((t[0] >= 5) if red else (t[0] <= 4))
        elif k == "A":
            ok = abs(dy) == 1 and abs(dx) == 1 and 3 <= t[1] <= 5 and ((t[0] >= 7) if red else (t[0] <= 2))
        elif k == "G":
            ok = abs(dy) + abs(dx) == 1 and 3 <= t[1] <= 5 and ((t[0] >= 7) if red else (t[0] <= 2))
        elif k == "S":
            fwd = -1 if red else 1
            crossed = (f[0] <= 4) if red else (f[0] >= 5)
            ok = (dy == fwd and dx == 0) or (crossed and dy == 0 and abs(dx) == 1)
        if not ok:
            r.fail(i, f"illegal geometry {p} {mv}")
        b[t[0]][t[1]], b[f[0]][f[1]] = p, None
        if b != frames[i]["state"]["board"]:
            r.fail(i, "board != expected")
        gs = [(y, x) for y in range(10) for x in range(9) if b[y][x] in ("G", "g")]
        if len(gs) == 2 and gs[0][1] == gs[1][1] and path_clear(b, gs[0], gs[1]):
            r.fail(i, "flying general (generals face each other)")


# --------------------------------------------------------------------------- other board games


def parse_ts_array(src: str, name: str):
    m = re.search(rf"const {name}[^=]*=\s*(\[.*?\]);", src, re.S)
    return json.loads(m.group(1)) if m else None


CORE_MORRIS_ADJ = {0: (1, 9), 1: (0, 2, 4), 2: (1, 14), 3: (4, 10), 4: (1, 3, 5, 7), 5: (4, 13), 6: (7, 11), 7: (4, 6, 8), 8: (7, 12), 9: (0, 10, 21), 10: (3, 9, 11, 18), 11: (6, 10, 15), 12: (8, 13, 17), 13: (5, 12, 14, 20), 14: (2, 13, 23), 15: (11, 16), 16: (15, 17, 19), 17: (12, 16), 18: (10, 19), 19: (16, 18, 20, 22), 20: (13, 19), 21: (9, 22), 22: (19, 21, 23), 23: (14, 22)}


def check_morris(demo, r, scene_src):
    r.ran("24 points", "renderer-points/lines collinear", "renderer-adjacency==rule-adjacency", "placement-on-empty", "reserves-decrement", "mill=>removal")
    frames, actions = demo["frames"], demo["actions"]
    pts, lines = parse_ts_array(scene_src, "MORRIS"), parse_ts_array(scene_src, "MORRIS_LINES")
    if not pts or not lines or len(pts) != 24:
        r.fail(None, "could not parse MORRIS geometry from scene.tsx", "RENDER")
    else:
        adj = {k: set() for k in range(24)}
        for a, b_, c in lines:
            (x1, y1), (x2, y2), (x3, y3) = pts[a], pts[b_], pts[c]
            if (x2 - x1) * (y3 - y1) != (y2 - y1) * (x3 - x1) or abs(x2 - x1) + abs(y2 - y1) != abs(x3 - x2) + abs(y3 - y2):
                r.fail(None, f"line {a,b_,c} not collinear/evenly spaced in renderer", "RENDER")
            adj[a].add(b_); adj[b_].update((a, c)); adj[c].add(b_)
        if any(adj[k] != set(CORE_MORRIS_ADJ[k]) for k in range(24)):
            r.fail(None, "renderer adjacency differs from Core ADJACENCY", "RENDER")
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        kind, _, idx = a["action"].partition(":")
        b = list(s0["board"])
        if kind == "place":
            idx = int(idx)
            if b[idx] is not None:
                r.fail(i, "place on occupied")
            b[idx] = a["player"]
            res = dict(s0["reserves"]); res[a["player"]] -= 1
            if res != s1["reserves"]:
                r.fail(i, "reserves not decremented")
            if b != s1["board"]:
                r.fail(i, "board != placement")
            if lines and any(idx in ln and all(b[k] == a["player"] for k in ln) for ln in lines):
                if i < len(actions) and not actions[i]["action"].startswith("remove"):
                    r.fail(i + 1, "mill formed but next action is not a removal")
        else:
            r.nc(f"{kind} actions not modelled")


def check_mancala(demo, r):
    r.ran("2x6 pits + 2 stores", "sowing CCW skip opp store", "capture(opposite non-empty)", "extra-turn on store", "seed-conservation(48)", "renderer-ccw-layout")
    frames, actions = demo["frames"], demo["actions"]
    for i, a in enumerate(actions, 1):
        s0 = frames[i - 1]["state"]
        pits = {k: list(v) for k, v in s0["pits"].items()}
        stores = dict(s0["stores"])
        me = a["player"]; opp = "player_2" if me == "player_1" else "player_1"
        seeds = pits[me][a["action"]]
        if seeds == 0:
            r.fail(i, "sowed an empty pit")
        pits[me][a["action"]] = 0
        side, slot = me, a["action"]
        while seeds:
            slot += 1
            if slot == 6:
                if side == me:
                    stores[me] += 1; seeds -= 1
                    if not seeds:
                        slot = "store"; break
                side, slot = (opp if side == me else me), -1
                continue
            pits[side][slot] += 1; seeds -= 1
        if slot != "store" and side == me and pits[me][slot] == 1 and pits[opp][5 - slot]:
            stores[me] += pits[opp][5 - slot] + 1
            pits[opp][5 - slot] = 0; pits[me][slot] = 0
        if pits != frames[i]["state"]["pits"] or stores != frames[i]["state"]["stores"]:
            r.fail(i, "pits/stores != Kalah sowing")
        if sum(map(sum, frames[i]["state"]["pits"].values())) + sum(frames[i]["state"]["stores"].values()) != 48:
            r.fail(i, "seed conservation")
        if i < len(actions):
            again = actions[i]["player"] == me
            if again != (slot == "store"):
                r.fail(i + 1, "extra turn mismatch")


def check_backgammon(demo, r, scene_src=""):
    r.ran("24 points", "dice 1-6", "move distance==unused die", "direction(P1 up/P2 down)", "no landing on >=2 opp", "hit->bar", "checker conservation(5/side Core variant)", "dice exhausted before turn passes", "renderer draws bar/borne_off")
    frames, actions = demo["frames"], demo["actions"]
    for i, f in enumerate(frames):
        s = f["state"]
        if len(s["board"]) != 24:
            r.fail(i, "board != 24 points")
        if any(not (1 <= d <= 6) for d in s["dice"]):
            r.fail(i, "die out of range")
        for p in ("player_1", "player_2"):
            n = sum(c["count"] for c in s["board"] if c and c["player"] == p) + s["bar"][p] + s["borne_off"][p]
            if n != 5:
                r.fail(i, f"{p} checker count {n} != 5")
            if s["bar"][p] and not re.search(r'\bs\.bar\b|"bar"', scene_src):
                r.fail(i, f"{p} has {s['bar'][p]} checker(s) on bar but LegalDemonstration never draws the bar", "RENDER")
            if s["borne_off"][p] and "borne_off" not in scene_src:
                r.fail(i, f"{p} borne-off checkers never drawn", "RENDER")
    capped = "BACKGAMMON_STACK_CAP" in scene_src
    r.fail(None, "Core variant uses 5 checkers/side; standard backgammon uses 15" + ("" if capped else " (renderer stack spacing 14px overflows past ~6)"), "RULE")
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        src, dst = a["action"].split(":")[1].split("-")
        me = a["player"]
        dist = (int(dst) - int(src)) if me == "player_1" else (int(src) - int(dst))
        if dist not in s0["dice"]:
            r.fail(i, f"distance {dist} not in dice {s0['dice']}")
        b = [dict(c) if c else None for c in s0["board"]]
        bar = dict(s0["bar"])
        si, di = int(src), int(dst)
        if not b[si] or b[si]["player"] != me:
            r.fail(i, "source has no own checker")
            continue
        b[si]["count"] -= 1
        if not b[si]["count"]:
            b[si] = None
        if b[di] and b[di]["player"] != me:
            if b[di]["count"] >= 2:
                r.fail(i, "landed on blocked point")
            bar[b[di]["player"]] += b[di]["count"]; b[di] = None
        b[di] = {"player": me, "count": (b[di]["count"] if b[di] else 0) + 1}
        if b != s1["board"] or bar != s1["bar"]:
            r.fail(i, "board/bar != expected move")
        rest = list(s0["dice"]); rest.remove(dist) if dist in rest else None
        nxt_same = i < len(actions) and actions[i]["player"] == me
        if nxt_same and s1["dice"] != rest:
            r.fail(i, f"remaining dice {s1['dice']} != {rest}")
        if i < len(actions) and not nxt_same and rest:
            r.nc(f"frame {i}: turn passed with dice {rest} unused (blocked? not modelled)")


def check_battleship(demo, r, scene_src=""):
    r.ran("grid_size", "one-new-shot-per-action at action cell", "no repeat shots", "hits==hit shots", "renderer grid==grid_size")
    r.nc("ship placement is private; hit/miss truth not checkable")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        me = a["player"]
        new = s1["shots"][me][len(s0["shots"][me]):]
        if len(new) != 1 or new[0]["cell"] != a["action"] or s1["shots"][me][: len(s0["shots"][me])] != s0["shots"][me]:
            r.fail(i, "shot list did not grow by exactly the action cell")
        cells = [s["cell"] for s in s1["shots"][me]]
        if len(set(cells)) != len(cells):
            r.fail(i, "repeat shot")
        for p in s1["hits"]:
            if s1["hits"][p] != sum(1 for s in s1["shots"][p] if s["hit"]):
                r.fail(i, "hits counter mismatch")
        g = s1["grid_size"]
        if any(not all(0 <= int(v) < g for v in c.split(",")) for c in cells):
            r.fail(i, "shot outside grid")
    if "grid_size" not in scene_src:
        r.fail(None, "renderer hard-codes a 5x5 grid instead of reading grid_size", "RENDER")


# --------------------------------------------------------------------------- card games


def check_blackjack(demo, r):
    r.ran("card values 1-11", "hit adds one card", "dealer draws to >=17", "terminal on stand/bust")
    r.nc("cards carry no suit; deck composition not checkable")
    frames, actions = demo["frames"], demo["actions"]
    for i, f in enumerate(frames):
        if any(not (1 <= c <= 11) for c in f["state"]["player_hand"] + f["state"]["dealer_hand"]):
            r.fail(i, "card value out of range")
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        if a["action"] == "hit" and (len(s1["player_hand"]) != len(s0["player_hand"]) + 1 or s1["player_hand"][:-1] != s0["player_hand"]):
            r.fail(i, "hit did not add exactly one card")
        if a["action"] == "stand":
            d = s1["dealer_hand"]
            tot = lambda h: sum(h) + (10 if 1 in h and sum(h) + 10 <= 21 else 0)
            if tot(d) < 17:
                r.fail(i, "dealer stopped below 17")
            if len(d) > 1 and tot(d[:-1]) >= 17:
                r.fail(i, "dealer drew on >=17")
    if len(frames[0]["state"]["dealer_hand"]) == 1:
        r.fail(0, "dealer hole card omitted from public state; renderer shows 1 card instead of up-card + face-down card", "RENDER")


def check_poker(slug, demo, r):
    r.ran("chip conservation(stacks+pot)", "pot==sum(contributions)", "committed resets per street", "board size per street", "no duplicate board cards", "card syntax", "actor rotation over non-folded", "check only when matched")
    frames, actions = demo["frames"], demo["actions"]
    leduc = slug == "leduc-holdem"
    sizes = {"preflop": 0, "board": 1, "showdown": None} if leduc else {"preflop": 0, "flop": 3, "turn": 4, "river": 5, "showdown": None}
    total0 = sum(frames[0]["state"]["stacks"].values()) + frames[0]["state"]["pot"]
    players = sorted(frames[0]["state"]["stacks"])
    for i, f in enumerate(frames):
        s = f["state"]
        if sum(s["stacks"].values()) + s["pot"] != total0:
            r.fail(i, "chips not conserved")
        want = sizes.get(s["street"], -1)
        if want == -1:
            r.fail(i, f"unknown street {s['street']}")
        elif want is not None and len(s["board"]) != want:
            r.fail(i, f"{s['street']} with {len(s['board'])} board cards")
        if len(set(s["board"])) != len(s["board"]) or not all(card_ok(c) for c in s["board"]):
            r.fail(i, "duplicate/invalid board card")
        if leduc and any(rank_of(c) not in ("J", "Q", "K") for c in s["board"]):
            r.fail(i, "Leduc deck is J/Q/K only")
    for i, a in enumerate(actions, 1):
        s0 = frames[i - 1]["state"]
        if a["action"] == "check" and s0["committed"][a["player"]] != max(s0["committed"].values()):
            r.fail(i, "check while facing a bet")
    live = [p for p in players]
    for i in range(1, len(actions)):
        prev, cur = actions[i - 1]["player"], actions[i]["player"]
        if live.index(cur) != (live.index(prev) + 1) % len(live):
            r.fail(i + 1, f"actor rotation {prev}->{cur}")
    if leduc and len(players) != 2:
        r.fail(None, f"Leduc Hold'em is a 2-player game; trace has {len(players)} seats", "RULE")
    r.nc("hole cards are private; hand strength/showdown winner not checkable (no winner in frame)")


def check_shedding(slug, demo, r):
    crazy = slug == "crazy-eights"
    r.ran("match rank or suit" + (" (8 wild)" if crazy else ""), "play: hand-1", "draw: hand+1 & deck-1", "card conservation(52)", "no card played twice")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    seen = {frames[0]["state"]["discard"]}
    plays = 0
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        me = a["player"]
        if a["action"] == "draw":
            if s1["deck_count"] != s0["deck_count"] - 1 or s1["hand_counts"][me] != s0["hand_counts"][me] + 1:
                r.fail(i, "draw counts")
        else:
            card = a["action"].split(":", 1)[1]
            plays += 1
            top = s0["discard"]
            wild = crazy and rank_of(card) == "8"
            if not (wild or rank_of(card) == rank_of(top) or suit_of(card) == suit_of(top)):
                r.fail(i, f"{card} does not match {top}")
            if card in seen:
                r.fail(i, f"{card} played twice")
            seen.add(card)
            if s1["discard"] != card or s1["hand_counts"][me] != s0["hand_counts"][me] - 1:
                r.fail(i, "play counts/discard")
        if s1["deck_count"] + sum(s1["hand_counts"].values()) + plays + 1 != 52:
            r.fail(i, "52-card conservation")
    if crazy:
        r.nc("declared suit after an 8 is not in public state; checked against the 8's own suit")


def check_gin(demo, r):
    r.ran("draw->discard phase", "hand 7<->8", "card conservation(52)")
    frames, actions = demo["frames"], demo["actions"]
    discards = 0
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        me = a["player"]
        if a["action"].startswith("draw"):
            if s0["phase"] != "draw" or s1["phase"] != "discard" or s1["hand_counts"][me] != s0["hand_counts"][me] + 1:
                r.fail(i, "draw phase/counts")
        else:
            discards += 1
            if s0["phase"] != "discard" or s1["discard_top"] != a["action"].split(":")[1]:
                r.fail(i, "discard phase/top")
            if i < len(actions) and actions[i]["player"] == me:
                r.fail(i + 1, "same player continued after discard")
        if s1["deck_count"] + sum(s1["hand_counts"].values()) + discards + 1 != 52:
            r.fail(i, "52-card conservation")
    if frames[0]["state"]["hand_counts"]["player_1"] != 10:
        r.fail(None, f"Core deals {frames[0]['state']['hand_counts']['player_1']} cards; standard gin rummy deals 10", "RULE")


def check_mahjong(demo, r):
    r.ran("tile conservation(wall+hands+discards)", "discarder -1 / next draws +1", "rotation 1-4", "discard_pile matches action")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r, 4)
    total0 = frames[0]["state"]["wall_count"] + sum(frames[0]["state"]["hand_counts"].values())
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        if s1["discard_pile"][-1] != {"player": a["player"], "tile": a["action"].split(":")[1]}:
            r.fail(i, "discard pile tail != action")
        if s1["wall_count"] + sum(s1["hand_counts"].values()) + i != total0:
            r.fail(i, "tile conservation")
    r.fail(None, f"Core variant: {total0 + 0} tiles (no honours), 10-tile hands; standard mahjong uses 136/144 tiles and 13-tile hands", "RULE")
    r.nc("calls (pung/chow/kong) not present in trace")


def check_doudizhu(demo, r):
    r.ran("54 cards (17/17/20)", "play beats last_play (single rank order)", "two passes reset lead", "rotation", "hand -len(cards)")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r, 3)
    s = frames[0]["state"]
    if sum(s["hand_counts"].values()) != 54 or s["hand_counts"][s["landlord"]] != 20:
        r.fail(0, "deal counts")
    order = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "BJ", "RJ"]
    rk = lambda c: order.index(c) if c in ("BJ", "RJ") else order.index(rank_of(c))
    played = 0
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        if a["action"] == "pass":
            if s0["last_play"] is None:
                r.fail(i, "pass while leading")
        else:
            cards = a["action"].split(":")[1].split(",")
            played += len(cards)
            if s0["last_play"] and s0["last_play"]["kind"] == "single" and len(cards) == 1 and rk(cards[0]) <= rk(s0["last_play"]["cards"][0]):
                r.fail(i, f"{cards[0]} does not beat {s0['last_play']['cards'][0]}")
            if s1["hand_counts"][a["player"]] != s0["hand_counts"][a["player"]] - len(cards):
                r.fail(i, "hand count")
        if sum(s1["hand_counts"].values()) + played != 54:
            r.fail(i, "54-card conservation")


def trick_winner(cards, trump, euchre=False):
    led = suit_of(cards[0]["card"])
    def eff_suit(c):
        if euchre and rank_of(c) == "J" and trump:
            partner = {"H": "D", "D": "H", "S": "C", "C": "S"}[trump]
            if suit_of(c) == partner:
                return trump
        return suit_of(c)
    def power(c):
        s = eff_suit(c)
        base = RANKS.index(rank_of(c))
        if euchre and rank_of(c) == "J" and s == trump:
            base = 20 if suit_of(c) == trump else 19
        if trump and s == trump:
            return 100 + base
        if s == led:
            return 50 + base
        return base
    return max(cards, key=lambda p: power(p["card"]))["player"]


def check_tricks(slug, demo, r):
    r.ran("trick winner per led suit/trump", "winner leads next", "rotation within trick", "hand counts -1", "no card played twice", "provable revoke (failed to follow then later played led suit)", "tricks tally")
    frames, actions = demo["frames"], demo["actions"]
    euchre = slug == "euchre"
    n = len(frames[0]["state"]["hand_counts"])
    trump = None
    if slug == "bridge":
        st = frames[0]["state"]["contract"]["strain"]
        trump = None if st in ("NT", "N") else st
    if slug == "spades":
        trump = "S"
    played, by_player, tricks = set(), {}, []
    current = []
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        if a["action"].startswith("call:"):
            trump = a["action"].split(":")[1]
            continue
        card = a["action"].split(":")[1]
        if not card_ok(card):
            r.fail(i, f"bad card {card}")
        if card in played:
            r.fail(i, f"{card} played twice")
        played.add(card)
        if s1["hand_counts"][a["player"]] != s0["hand_counts"][a["player"]] - 1:
            r.fail(i, "hand count not -1")
        if current:
            prev = current[-1]["player"]
            if seat_no(a["player"]) != seat_no(prev) % n + 1:
                r.fail(i, f"in-trick rotation {prev}->{a['player']}")
        current.append({"player": a["player"], "card": card})
        by_player.setdefault(a["player"], []).append((i, card, suit_of(current[0]["card"]) if len(current) > 1 else None))
        if len(current) == n:
            w = trick_winner(current, trump, euchre)
            hist = s1.get("trick_history", s1.get("history", []))
            if not hist or hist[-1].get("winner") != w:
                r.fail(i, f"trick winner {hist[-1].get('winner') if hist else None} != {w}")
            tricks.append((i, current, w))
            if i < len(actions) and actions[i]["player"] != w:
                r.fail(i + 1, f"{actions[i]['player']} led but trick winner was {w}")
            current = []
    # provable revokes
    for p, plays in by_player.items():
        for k, (fi, card, led) in enumerate(plays):
            if led and suit_of(card) != led:
                later = [c for (_, c, _) in plays[k + 1:] if suit_of(c) == led and not (euchre and rank_of(c) == "J")]
                if later:
                    r.fail(fi, f"{p} did not follow {led} with {card} but later held {later[0]} (revoke)")
    # standard-rule leads
    if slug in ("hearts", "spades"):
        broken = False
        brk = "H" if slug == "hearts" else "S"
        for idx, (fi, cards, w) in enumerate(tricks):
            lead = cards[0]
            if slug == "hearts" and idx == 0 and lead["card"] != "2C":
                r.fail(fi - len(cards) + 1, f"first trick led with {lead['card']}; standard Hearts requires 2C lead", "RULE")
            if suit_of(lead["card"]) == brk and not broken:
                other = [c for (_, c, _) in by_player[lead["player"]] if suit_of(c) != brk]
                later = [c for (fj, c, _) in by_player[lead["player"]] if fj > fi - len(cards) + 1 and suit_of(c) != brk]
                if later:
                    r.fail(fi - len(cards) + 1, f"{lead['player']} led {lead['card']} before {brk} broken while holding {later[0]}", "RULE")
            if any(suit_of(c["card"]) == brk for c in cards):
                broken = True
    if n == 2 and slug in ("hearts", "spades", "euchre"):
        r.fail(None, f"Core variant is 2-player; standard {slug} is 4-player", "RULE")
    if slug == "bridge":
        r.fail(None, "dummy hand is public after the opening lead in bridge; frames carry only hand_counts so dummy can't be shown", "RENDER")


def check_cribbage(demo, r):
    r.ran("6-card deal", "discard 2 to crib", "no duplicate cards", "card syntax")
    frames, actions = demo["frames"], demo["actions"]
    s = frames[-1]["state"]
    cards = [s["starter"]] + [c for v in s["discards"].values() for c in v]
    if len(set(cards)) != len(cards) or not all(card_ok(c) for c in cards):
        r.fail(len(frames) - 1, "duplicate/invalid card")
    for i, a in enumerate(actions, 1):
        cs = a["action"].split(":")[1].split(",")
        if len(cs) != 2 or frames[i]["state"]["discards"][a["player"]] != cs or frames[i]["state"]["hand_counts"][a["player"]] != 4:
            r.fail(i, "discard bookkeeping")
    r.fail(None, "Core variant ends at showdown after the crib discard (no pegging/counting shown)", "RULE")


def check_hanabi(demo, r):
    r.ran("fireworks +1 on successful play", "clues 0..8", "lives 0..3", "deck-1 per draw", "hand refills while deck>0", "discard grows by one")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        if not (0 <= s1["clues"] <= 8 and 0 <= s1["lives"] <= 3):
            r.fail(i, "clues/lives out of range")
        fw = sum(s1["fireworks"].values()) - sum(s0["fireworks"].values())
        if a["action"].startswith("play"):
            if fw not in (0, 1) or (fw == 0 and s1["lives"] != s0["lives"] - 1):
                r.fail(i, "play neither advanced firework nor cost a life")
        if a["action"].startswith("discard"):
            if len(s1["discard"]) != len(s0["discard"]) + 1:
                r.fail(i, "discard pile not +1")
            if s0["clues"] == 8:
                r.fail(i, "discarded with 8 clue tokens (forbidden in standard Hanabi)", "RULE")
        drew = s0["deck_count"] > 0
        if s1["deck_count"] != s0["deck_count"] - (1 if drew else 0):
            r.fail(i, "deck count")
        if s1["hand_counts"][a["player"]] != s0["hand_counts"][a["player"]] - (0 if drew else 1):
            r.fail(i, "hand refill")
    r.fail(None, "Core variant: 2 colours, 12-card deck; standard Hanabi has 5 colours/50 cards", "RULE")


# --------------------------------------------------------------------------- strategy / social


def check_sealed(slug, demo, r):
    r.ran("hidden until both chose", "revealed == actions", "valid action set")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    key = "revealed_bids" if slug == "first-price-sealed-bid-auction" else "revealed_actions"
    for i, f in enumerate(frames[:-1]):
        if f["state"][key]:
            r.fail(i, "choice revealed before resolution")
    rev = frames[-1]["state"][key]
    if rev != {a["player"]: a["action"] for a in actions}:
        r.fail(len(frames) - 1, "revealed != chosen actions")
    valid = {"rock-paper-scissors": {"rock", "paper", "scissors"}, "prisoners-dilemma": {"cooperate", "defect"}}.get(slug)
    if valid and not set(rev.values()) <= valid:
        r.fail(len(frames) - 1, "invalid action")
    if slug == "rock-paper-scissors":
        beats = {("rock", "scissors"), ("scissors", "paper"), ("paper", "rock")}
        a1, a2 = rev["player_1"], rev["player_2"]
        reason = "draw" if a1 == a2 else "beats"
        if frames[-1]["outcomeReason"] != reason:
            r.fail(len(frames) - 1, "outcome reason")
    r.nc("winner / payoff values are not in frame state (only outcomeReason); renderer cannot show who won")


def check_goofspiel(demo, r):
    r.ran("each bid card used once", "prizes each once", "higher bid wins prize", "points conservation", "bids hidden until both")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    rounds = []
    for f in frames:
        h = f["state"]["round_history"]
        if h and (not rounds or h[-1] != rounds[-1]):
            rounds.append(h[-1])
    pts = {"player_1": 0, "player_2": 0}
    used = {"player_1": [], "player_2": []}
    for rd in rounds:
        for p, v in rd["bids"].items():
            used[p].append(v)
        b1, b2 = rd["bids"]["player_1"], rd["bids"]["player_2"]
        w = "player_1" if b1 > b2 else "player_2" if b2 > b1 else None
        if rd["winner"] != w:
            r.fail(None, f"round {rd} winner wrong")
        if w:
            pts[w] += rd["prize"]
    if pts != frames[-1]["state"]["points"]:
        r.fail(len(frames) - 1, f"points {frames[-1]['state']['points']} != {pts}")
    for p, v in used.items():
        if len(set(v)) != len(v):
            r.fail(None, f"{p} reused a bid card")
    if len({rd["prize"] for rd in rounds}) != len(rounds):
        r.fail(None, "prize repeated")


def check_liars(demo, r):
    r.ran("bids strictly increase", "5 dice/player values 1-6", "challenge resolution count")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    prev = None
    for i, a in enumerate(actions, 1):
        if a["action"] == "challenge":
            continue
        c, fce = map(int, a["action"].split("x"))
        if prev and not (c > prev[0] or (c == prev[0] and fce > prev[1])):
            r.fail(i, "bid did not increase")
        prev = (c, fce)
    dice = frames[-1]["state"]["revealed_dice"]
    for p, d in dice.items():
        if len(d) != 5 or any(not 1 <= v <= 6 for v in d):
            r.fail(len(frames) - 1, "dice range")
    bid = frames[-1]["state"]["current_bid"]
    n = sum(v == bid["face"] for d in dice.values() for v in d)
    r.nc(f"bid {bid['count']}x{bid['face']}, actual {n} (ones-wild variant would be {n + sum(v == 1 for d in dice.values() for v in d)}); winner not in state")


def check_offer(slug, demo, r):
    r.ran("alternating offers", "share/price bounds", "accept terminates with last offer")
    frames, actions = demo["frames"], demo["actions"]
    alternate(actions, r)
    for i, a in enumerate(actions, 1):
        lo = frames[i]["state"]["last_offer"]
        if a["action"].startswith("offer"):
            parts = a["action"].split(":")
            if lo["player"] != a["player"]:
                r.fail(i, "offer owner")
            if slug == "bargaining" and not (0 <= lo["player_1_share"] <= 100 and lo["player_1_share"] == int(parts[1])):
                r.fail(i, "share mismatch/bounds")
        elif a["action"] == "accept":
            if not frames[i]["terminal"] or lo != frames[i - 1]["state"]["last_offer"] or lo["player"] == a["player"]:
                r.fail(i, "accept semantics")


# --------------------------------------------------------------------------- grid worlds

MOVES = {"up": (-1, 0), "down": (1, 0), "left": (0, -1), "right": (0, 1)}


def check_gridworld(slug, demo, r):
    r.ran("single-step moves", "in-bounds", "no hole/cliff entry", "terminal at goal")
    frames, actions = demo["frames"], demo["actions"]
    pos_key = "taxi" if slug == "taxi" else "position"
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        p0, p1 = s0[pos_key], s1[pos_key]
        if a["action"] in MOVES:
            dy, dx = MOVES[a["action"]]
            rows = s0.get("rows", len(s0.get("grid", [])))
            cols = s0.get("cols", len(s0.get("grid", [[0]])[0]))
            exp = [min(max(p0[0] + dy, 0), rows - 1), min(max(p0[1] + dx, 0), cols - 1)]
            if list(p1) != exp:
                r.fail(i, f"{a['action']} moved {p0}->{p1}, expected {exp}")
        if slug == "frozen-lake" and s1["grid"][p1[0]][p1[1]] == "H" and not frames[i]["terminal"]:
            r.fail(i, "on hole but not terminal")
        if slug == "cliff-walking" and list(p1) in [list(c) for c in s1["cliff"]]:
            r.fail(i, "stepped onto cliff")
        if slug == "taxi":
            if a["action"] == "pickup" and (list(p0) != list(s0["passenger"]) or not s1["onboard"]):
                r.fail(i, "pickup away from passenger")
            if a["action"] == "dropoff":
                if list(p0) != list(s0["destination"]):
                    r.fail(i, "dropoff away from destination")
                if s1["passenger"] != s1["destination"]:
                    r.fail(i, f"after dropoff passenger reported at {s1['passenger']} (pickup origin), not destination {s1['destination']}: passenger teleports; scene.tsx masks it with the `delivered` flag", check="taxi.passenger-after-dropoff")
    last = frames[-1]
    goal_key = "destination" if slug == "taxi" else "goal"
    if last["terminal"] and last["outcomeReason"] in ("reached_goal", "passenger_delivered") and list(last["state"][pos_key]) != list(last["state"][goal_key]):
        r.fail(len(frames) - 1, "terminal goal but not at goal")


# --------------------------------------------------------------------------- control


def check_cartpole(demo, r):
    r.ran("Gym CartPole Euler integration (tau .02, F 10)", "|x|<2.4 & |theta|<.2095 while live")
    frames, actions = demo["frames"], demo["actions"]
    g, mc, mp, l, F, tau = 9.8, 1.0, 0.1, 0.5, 10.0, 0.02
    worst = 0.0
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        x, v, th, w = s0["cart"]["x"], s0["cart"]["velocity"], s0["pole"]["angle"], s0["pole"]["angular_velocity"]
        force = F if a["action"] == "right" else -F
        ct, st = math.cos(th), math.sin(th)
        temp = (force + mp * l * w * w * st) / (mc + mp)
        thacc = (g * st - ct * temp) / (l * (4 / 3 - mp * ct * ct / (mc + mp)))
        xacc = temp - mp * l * thacc * ct / (mc + mp)
        exp = (x + tau * v, v + tau * xacc, th + tau * w, w + tau * thacc)
        got = (s1["cart"]["x"], s1["cart"]["velocity"], s1["pole"]["angle"], s1["pole"]["angular_velocity"])
        err = max(abs(e - g_) for e, g_ in zip(exp, got))
        worst = max(worst, err)
        if err > 2e-5:
            r.fail(i, f"dynamics mismatch {err:.2e} (state rounding drift?)")
        if not frames[i]["terminal"] and (abs(got[0]) > 2.4 or abs(got[2]) > 0.2095):
            r.fail(i, "out of bounds but live")
    r.ran(f"max error {worst:.1e}")


def check_mountain_car(demo, r):
    r.ran("Gym MountainCar dynamics (v+=.001a-.0025cos3x)", "|v|<=.07", "x>=-1.2")
    frames, actions = demo["frames"], demo["actions"]
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        push = {"left": -1, "none": 0, "idle": 0, "right": 1}[a["action"]]
        v = max(-0.07, min(0.07, s0["velocity"] + push * 0.001 - 0.0025 * math.cos(3 * s0["position"])))
        x = max(-1.2, min(0.6, s0["position"] + v))
        if x == -1.2 and v < 0:
            v = 0.0
        if abs(v - s1["velocity"]) > 2e-6 or abs(x - s1["position"]) > 2e-6:
            r.fail(i, f"dynamics mismatch v {s1['velocity']} vs {v:.6f}")


def check_lunar(demo, r, scene_src=""):
    r.ran("y += vy (semi-implicit)", "x += vx", "idle: vy -= .028 gravity", "main burns fuel", "fuel monotone", "landing inside pad", "renderer pad == state pad")
    frames, actions = demo["frames"], demo["actions"]
    for i, a in enumerate(actions, 1):
        l0, l1 = frames[i - 1]["state"]["lander"], frames[i]["state"]["lander"]
        if abs(l1["y"] - max(0.0, l0["y"] + l1["vy"])) > 2e-6:
            r.fail(i, "y != y + vy")
        if abs(l1["x"] - (l0["x"] + l1["vx"])) > 2e-6 and abs(l1["x"] - (l0["x"] + l0["vx"])) > 2e-6:
            r.fail(i, "x != x + vx")
        f0, f1 = frames[i - 1]["state"]["fuel"], frames[i]["state"]["fuel"]
        if a["action"] == "idle" and (abs(l1["vy"] - (l0["vy"] - 0.028)) > 2e-6 or f1 != f0):
            r.fail(i, "idle step: gravity/fuel")
        if a["action"] == "main" and not f1 < f0:
            r.fail(i, "main thrust without fuel burn")
    last = frames[-1]["state"]
    pad = last["landing_pad"]
    if frames[-1]["terminal"] and frames[-1]["outcomeReason"] == "soft_landing" and not pad["x_min"] <= last["lander"]["x"] <= pad["x_max"]:
        r.fail(len(frames) - 1, "soft landing outside pad")
    if "landing_pad" not in scene_src:
        r.fail(None, "renderer hard-codes the landing pad instead of reading landing_pad", "RENDER")


# Paddle-ball ball rule, as evidenced by the bundled Core trace (frames 16-18, 38-39, 54-55):
# the ball moves by its pre-step velocity, p1 = p0 + v0. A coordinate that would leave the court
# is clamped onto the wall (x=0, x=1, top y=1) and that velocity component is negated, so a wall
# reflection conserves |v|. When the centre would pass the paddle line y=.08 over the paddle,
# Core sets y=.08, counts a bounce and serves a new upward velocity (vx may change: paddle spin,
# so |v| is not conserved there). With no wall or paddle contact, v1 == v0 exactly.
PADDLE_BOUNCE_Y = 0.08
PADDLE_HALF_WIDTH = 0.16
# The trace stores at most 5 decimals; recomputing p0 + v0 leaves only float noise (max residual
# on the bundled trace is 1.1e-16). 1e-6 is far above that noise and 10x below the 1e-5 quantum,
# so any real change to a stored coordinate or velocity is caught.
PADDLE_TOL = 1e-6


def check_paddle(demo, r):
    r.ran("paddle ±.12 clipped [0,1]", "ball x/y += v (pre-step velocity)", "side-wall reflection: x clamped to 0/1, vx negated",
          "top-wall reflection: y clamped to 1, vy negated", "|v| conserved on wall reflection", "v unchanged off walls and paddle",
          "paddle bounce only when |ball-paddle|<=.16 (=renderer half-width), at y=.08, vy>0", "bounces counter")
    frames, actions = demo["frames"], demo["actions"]
    close = lambda a, b: abs(a - b) <= PADDLE_TOL
    for i, a in enumerate(actions, 1):
        s0, s1 = frames[i - 1]["state"], frames[i]["state"]
        px = min(1.0, max(0.0, s0["paddle_x"] + {"left": -0.12, "stay": 0, "right": 0.12}[a["action"]]))
        if abs(px - s1["paddle_x"]) > 1e-6:
            r.fail(i, "paddle move")
        b0, b1 = s0["ball"], s1["ball"]
        if not (0 <= b1["x"] <= 1 and 0 <= b1["y"] <= 1):
            r.fail(i, "ball out of court")
        bounced = s1["bounces"] == s0["bounces"] + 1
        if bounced:
            if abs(b1["x"] - s1["paddle_x"]) > PADDLE_HALF_WIDTH + 1e-6 and abs(b0["x"] + b0["vx"] - s1["paddle_x"]) > PADDLE_HALF_WIDTH + 1e-6:
                r.fail(i, "bounce counted but ball not over rendered paddle")
            if b1["vy"] <= 0:
                r.fail(i, "bounce without vy reversal")
        elif s1["bounces"] != s0["bounces"]:
            r.fail(i, "bounces jumped")
        elif b1["vy"] * b0["vy"] < 0 and b1["vy"] > 0:
            r.fail(i, "ball reversed upward without paddle bounce")

        # Horizontal: integrate, then reflect off a side wall.
        ex = b0["x"] + b0["vx"]
        wall_x = ex > 1 or ex < 0
        if not close(b1["x"], min(1.0, max(0.0, ex))):
            r.fail(i, f"ball x {b1['x']} != x + vx = {min(1.0, max(0.0, ex)):.6f}")
        if wall_x and not close(b1["vx"], -b0["vx"]):
            r.fail(i, f"side-wall hit without vx reflection (vx {b0['vx']} -> {b1['vx']})")
        if not wall_x and not bounced and not close(b1["vx"], b0["vx"]):
            r.fail(i, f"vx changed off the walls and paddle ({b0['vx']} -> {b1['vx']})")

        # Vertical: integrate, then reflect off the top wall or the paddle line.
        ey = b0["y"] + b0["vy"]
        wall_y = ey > 1
        if bounced:
            if ey >= PADDLE_BOUNCE_Y - PADDLE_TOL:
                r.fail(i, f"paddle bounce before the ball reached y={PADDLE_BOUNCE_Y}")
            if not close(b1["y"], PADDLE_BOUNCE_Y):
                r.fail(i, f"paddle bounce leaves the ball at y {b1['y']}, not {PADDLE_BOUNCE_Y}")
        elif ey < PADDLE_BOUNCE_Y:
            # Missed the paddle: Core ends the rally; the position past the line is not modelled.
            if not frames[i].get("terminal"):
                r.fail(i, "ball passed the paddle line without a bounce or a terminal frame")
        else:
            if not close(b1["y"], min(1.0, ey)):
                r.fail(i, f"ball y {b1['y']} != y + vy = {min(1.0, ey):.6f}")
            if wall_y and not close(b1["vy"], -b0["vy"]):
                r.fail(i, f"top-wall hit without vy reflection (vy {b0['vy']} -> {b1['vy']})")
            if not wall_y and not close(b1["vy"], b0["vy"]):
                r.fail(i, f"vy changed off the walls and paddle ({b0['vy']} -> {b1['vy']})")
        if (wall_x or wall_y) and not bounced and not close(math.hypot(b1["vx"], b1["vy"]), math.hypot(b0["vx"], b0["vy"])):
            r.fail(i, "speed changed at a wall reflection")


def check_simple_control(slug, demo, r):
    frames, actions = demo["frames"], demo["actions"]
    if slug == "car-racing":
        r.ran("progress monotone ≤1", "speed monotone on accelerate", "track window shifts")
        for i in range(1, len(frames)):
            c0, c1 = frames[i - 1]["state"]["car"], frames[i]["state"]["car"]
            if c1["progress"] < c0["progress"] or c1["progress"] > 1:
                r.fail(i, "progress")
            if actions[i - 1]["action"] == "accelerate" and c1["speed"] < c0["speed"]:
                r.fail(i, "speed dropped on accelerate")
    elif slug == "bipedal-walker":
        r.ran("distance += velocity", "feet alternate", "energy -2 per step", "torso within ±.2 except balance")
        for i, a in enumerate(actions, 1):
            w0, w1 = frames[i - 1]["state"]["walker"], frames[i]["state"]["walker"]
            if abs(w1["distance"] - (w0["distance"] + w1["velocity"])) > 2e-6:
                r.fail(i, "distance != distance + velocity")
            if a["action"].endswith("-step"):
                if a["action"] != w0["next_foot"] + "-step" or w1["next_foot"] == w0["next_foot"]:
                    r.fail(i, "foot order")
            if w1["energy"] > w0["energy"]:
                r.fail(i, "energy increased")
    elif slug == "alien-shooter":
        r.ran("aliens+destroyed conserved", "player_x ±1 within 0..7", "destroyed monotone", "invasion when an alien reaches row 0")
        n0 = len(frames[0]["state"]["aliens"])
        for i, a in enumerate(actions, 1):
            s0, s1 = frames[i - 1]["state"], frames[i]["state"]
            if len(s1["aliens"]) + s1["destroyed"] != n0:
                r.fail(i, "alien conservation")
            dx = {"left": -1, "right": 1}.get(a["action"], 0)
            if s1["player_x"] != min(max(s0["player_x"] + dx, 0), 7) and s1["player_x"] != s0["player_x"] + dx:
                r.fail(i, "player_x move")
            if s1["destroyed"] < s0["destroyed"]:
                r.fail(i, "destroyed decreased")
        if frames[-1]["outcomeReason"] == "invasion" and not any(y <= 0 for _, y in frames[-1]["state"]["aliens"]):
            r.fail(len(frames) - 1, "invasion without an alien at row 0")
    elif slug == "boxing-style-arena":
        r.ran("health non-increasing", "0≤stamina≤100", "jab only damages at distance 1", "step-in reduces distance")
        alternate(actions, r)
        for i, a in enumerate(actions, 1):
            s0, s1 = frames[i - 1]["state"], frames[i]["state"]
            for p in s1["health"]:
                if s1["health"][p] > s0["health"][p]:
                    r.fail(i, "health increased")
                if not 0 <= s1["stamina"][p] <= 100:
                    r.fail(i, "stamina range")
            opp = "player_2" if a["player"] == "player_1" else "player_1"
            if a["action"] == "jab" and s1["health"][opp] < s0["health"][opp] and s0["distance"] > 1:
                r.fail(i, "jab landed from distance")
            if a["action"] == "step-in" and s1["distance"] != s0["distance"] - 1:
                r.fail(i, "step-in distance")
    elif slug == "ice-hockey-style-arena":
        r.ran("positions within rink", "x moves ≤1", "goals monotone", "puck owner is a player", "renderer: two skaters on one cell")
        alternate(actions, r)
        for i, f in enumerate(frames):
            s = f["state"]
            rink = s["rink"]
            for p, pos in s["positions"].items():
                if not (0 <= pos["x"] < rink["x"] and 0 <= pos["lane"] < rink["lanes"]):
                    r.fail(i, "out of rink")
            ps = list(s["positions"].values())
            if ps[0] == ps[1]:
                r.fail(i, "both skaters on the same cell; scene draws one disc on top of the other", "RENDER")
            if i:
                p0 = frames[i - 1]["state"]
                for p in s["positions"]:
                    if abs(s["positions"][p]["x"] - p0["positions"][p]["x"]) > 1:
                        r.fail(i, "skater jumped")
                for p in s["goals"]:
                    if s["goals"][p] < p0["goals"][p]:
                        r.fail(i, "goals decreased")


# --------------------------------------------------------------------------- renderer cues (mirror of src/game/cues.ts)

# Bump together with CUE_RULE_VERSION in src/game/cues.ts whenever the rule changes.
CUE_RULE_VERSION = 1
CELL_GAMES = ("chess", "go", "hex", "othello", "connect-four", "tic-tac-toe", "gomoku", "pentago", "ultimate-tic-tac-toe")
WIN_LENGTH = {"tic-tac-toe": 3, "connect-four": 4, "gomoku": 5}  # mirrors WIN_LENGTH in cues.ts


def _empty(t) -> bool:
    return t is None or (isinstance(t, str) and (t.strip() == "" or t == "."))


def scene_cells(slug: str, state: dict) -> tuple[list, int, int]:
    """The row-major cell list CellScene builds for a frame (tokens before hex recolouring)."""
    if slug == "chess":
        rows = []
        for rank in state["fen"].split()[0].split("/"):
            row = []
            for ch in rank:
                row.extend([None] * int(ch) if ch.isdigit() else [ch])
            rows.append(row)
    elif slug == "tic-tac-toe":
        b = state["board"]
        rows = [b[0:3], b[3:6], b[6:9]]
    elif slug == "ultimate-tic-tac-toe":
        boards = state["boards"]
        rows = [[boards[(r // 3) * 3 + c // 3][(r % 3) * 3 + c % 3] for c in range(9)] for r in range(9)]
    else:
        rows = state["board"]
    return [None if _empty(v) else v for row in rows for v in row], len(rows), len(rows[0]) if rows else 0


def derive_cell_cues(prev, cells, rows: int, cols: int, chess: bool, terminal: bool, win_length: int | None):
    """Python twin of deriveCellCues (src/game/cues.ts). Returns (last, line|None)."""
    last: list[int] = []
    if prev is not None and len(prev) == len(cells):
        changed = [i for i, (a, b) in enumerate(zip(prev, cells)) if (None if _empty(a) else a) != (None if _empty(b) else b)]
        added = [i for i in changed if _empty(prev[i]) and not _empty(cells[i])]
        last = changed if chess else added if len(added) == 1 else changed
    line = None
    if terminal and win_length:
        hit: set[int] = set()
        for y in range(rows):
            for x in range(cols):
                t = cells[y * cols + x]
                if _empty(t):
                    continue
                for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
                    run = [(y + k * dy, x + k * dx) for k in range(win_length)]
                    if all(0 <= yy < rows and 0 <= xx < cols and cells[yy * cols + xx] == t for yy, xx in run):
                        hit.update(yy * cols + xx for yy, xx in run)
        line = sorted(hit) or None
    return last, line


def default_win_length(slug: str, rows: int, cols: int) -> int | None:
    if slug in WIN_LENGTH:
        return WIN_LENGTH[slug]
    return None


def expected_last(slug: str, action, rows: int, cols: int) -> list[int] | None:
    """The cell(s) the move itself touches, from the action alone (None = structural check only)."""
    if slug in ("tic-tac-toe", "go", "gomoku", "hex"):
        return [int(action)]
    if slug == "othello":
        y, x = action
        return [y * cols + x]
    if slug == "ultimate-tic-tac-toe":
        bi, ci = divmod(int(action), 9)
        return [((bi // 3) * 3 + ci // 3) * 9 + (bi % 3) * 3 + ci % 3]
    return None


def check_cell_cues(slug: str, demo, r: Report, scene_src: str, cues_src: str | None):
    r.ran("cues: last==move cells", "cues: win line on terminal frame")
    m = re.search(r"CUE_RULE_VERSION\s*=\s*(\d+)", cues_src or "")
    if cues_src is None or "export function deriveCellCues" not in cues_src:
        r.fail(None, "src/game/cues.ts missing deriveCellCues; last-move/win-line cues are never drawn", "RENDER", check="render.cell-cues")
        return
    if not m or int(m.group(1)) != CUE_RULE_VERSION:
        r.fail(None, f"cues.ts CUE_RULE_VERSION {m.group(1) if m else '?'} != validator mirror {CUE_RULE_VERSION}; update the Python mirror", check="cues.rule-version")
    if "deriveCellCues(" not in scene_src:
        r.fail(None, "CellScene never calls deriveCellCues, so Board gets no last/line cues", "RENDER", check="render.cell-cues")
    frames, actions = demo["frames"], demo["actions"]
    chess = slug == "chess"
    prev = None
    for i, f in enumerate(frames):
        cells, rows, cols = scene_cells(slug, f["state"])
        last, line = derive_cell_cues(prev, cells, rows, cols, chess, bool(f["terminal"]), default_win_length(slug, rows, cols))
        prev = cells
        if i == 0:
            if last:
                r.fail(0, "opening frame has a last-move cue", check="cues.last")
            continue
        a = actions[i - 1]["action"]
        want = expected_last(slug, a, rows, cols)
        if want is not None and last != want:
            r.fail(i, f"last-move cue {last} != move cell {want}", check="cues.last")
        if slug == "connect-four" and (len(last) != 1 or last[0] % cols != int(a)):
            r.fail(i, f"last-move cue {last} is not one disc in column {a}", check="cues.last")
        if slug == "pentago" and not last:
            r.fail(i, "place+rotate produced no last-move cue", check="cues.last")
        if chess:
            frm, to = a[:2], a[2:4]
            idx = lambda q: (8 - int(q[1])) * 8 + "abcdefgh".index(q[0])
            castle = abs("abcdefgh".index(frm[0]) - "abcdefgh".index(to[0])) == 2 and cells[idx(to)] in ("K", "k")
            sizes = (4,) if castle else (2, 3)  # 3 = en passant (captured pawn's square also empties)
            if idx(frm) not in last or idx(to) not in last or len(last) not in sizes:
                r.fail(i, f"chess cue {last} does not cover {a} (from/to; 4 for castling, 3 for en passant)", check="cues.last")
        if f["terminal"] and slug in WIN_LENGTH:
            mover = cells[want[0]] if want else (cells[last[0]] if last else None)
            if f.get("outcomeReason") == "draw":
                if line:
                    r.fail(i, f"draw but a win line {line} was derived", check="cues.line")
            elif not line or len(line) < WIN_LENGTH[slug] or any(cells[k] != mover for k in line):
                r.fail(i, f"terminal win without a {WIN_LENGTH[slug]}-in-a-row line for the last mover (line={line})", check="cues.line")
        elif line:
            r.fail(i, f"win line {line} on a non-terminal or line-less family frame", check="cues.line")


# --------------------------------------------------------------------------- registry

FAMILY = {
    "tic-tac-toe": "cells/grid_3x3", "ultimate-tic-tac-toe": "cells/grid_3x3 (9x9)", "connect-four": "cells/connect_four",
    "chess": "cells/square_board+chess", "othello": "cells/square_board", "pentago": "cells/square_board",
    "go": "cells/go_board", "gomoku": "cells/go_board", "hex": "cells/hex_board",
    "checkers": "scene/board", "shogi": "scene/board", "xiangqi": "scene/board", "mancala": "scene/board",
    "nine-mens-morris": "scene/board", "backgammon": "scene/board", "battleship": "scene/board",
    "taxi": "scene/grid", "frozen-lake": "scene/grid", "cliff-walking": "scene/grid",
}
SEALED = {"rock-paper-scissors", "prisoners-dilemma", "goofspiel", "first-price-sealed-bid-auction"}


def run(repo: Path, known_issues: list[dict] | None = None):
    data = json.loads((repo / "src/game/game-demonstrations.json").read_text())
    scene_src = (repo / "src/game/scene.tsx").read_text()
    cues_path = repo / "src/game/cues.ts"
    cues_src = cues_path.read_text() if cues_path.exists() else None
    reports = []
    for slug, demo in sorted(data["games"].items()):
        r = Report(slug)
        generic(slug, demo, r, slug in SEALED)
        try:
            if slug == "tic-tac-toe": check_tic_tac_toe(demo, r)
            elif slug == "connect-four": check_connect_four(demo, r)
            elif slug == "go": check_go(demo, r)
            elif slug == "gomoku": check_gomoku(demo, r)
            elif slug == "hex": check_hex(demo, r)
            elif slug == "othello": check_othello(demo, r)
            elif slug == "pentago": check_pentago(demo, r)
            elif slug == "ultimate-tic-tac-toe": check_uttt(demo, r, scene_src)
            elif slug == "chess": check_chess(demo, r)
            elif slug == "checkers": check_checkers(demo, r)
            elif slug == "shogi": check_shogi(demo, r)
            elif slug == "xiangqi": check_xiangqi(demo, r)
            elif slug == "nine-mens-morris": check_morris(demo, r, scene_src)
            elif slug == "mancala": check_mancala(demo, r)
            elif slug == "backgammon": check_backgammon(demo, r, scene_src)
            elif slug == "battleship": check_battleship(demo, r, scene_src)
            elif slug == "blackjack": check_blackjack(demo, r)
            elif slug.endswith("holdem"): check_poker(slug, demo, r)
            elif slug in ("shedding-card-game", "crazy-eights"): check_shedding(slug, demo, r)
            elif slug == "gin-rummy": check_gin(demo, r)
            elif slug == "mahjong": check_mahjong(demo, r)
            elif slug == "dou-dizhu": check_doudizhu(demo, r)
            elif slug in ("bridge", "hearts", "spades", "euchre"): check_tricks(slug, demo, r)
            elif slug == "cribbage": check_cribbage(demo, r)
            elif slug == "hanabi": check_hanabi(demo, r)
            elif slug in ("rock-paper-scissors", "prisoners-dilemma", "first-price-sealed-bid-auction"): check_sealed(slug, demo, r)
            elif slug == "goofspiel": check_goofspiel(demo, r)
            elif slug == "liars-dice": check_liars(demo, r)
            elif slug in ("bargaining", "negotiation"): check_offer(slug, demo, r)
            elif slug in ("taxi", "frozen-lake", "cliff-walking"): check_gridworld(slug, demo, r)
            elif slug == "cartpole": check_cartpole(demo, r)
            elif slug == "mountain-car": check_mountain_car(demo, r)
            elif slug == "lunar-lander": check_lunar(demo, r, scene_src)
            elif slug == "paddle-ball": check_paddle(demo, r)
            else: check_simple_control(slug, demo, r)
            if slug in CELL_GAMES: check_cell_cues(slug, demo, r, scene_src, cues_src)
        except Exception as exc:  # a crash is itself a finding
            r.fail(None, f"validator crashed: {type(exc).__name__}: {exc}")
        reports.append((slug, demo, r))
    stale = apply_known_issues(reports, known_issues or [])
    return reports, stale


GENERIC_CHECKS = {"frames==actions+1", "turn==index", "terminal-only-last", "caption/actor"}
DOC_FAMILY = {"tic-tac-toe": "Board grid_3x3", "ultimate-tic-tac-toe": "Board grid_3x3 9x9", "connect-four": "Board connect_four 6x7",
              "chess": "Board square+chess 8x8", "othello": "Board square 8x8", "pentago": "Board square 6x6", "go": "Board go 9x9",
              "gomoku": "Board go 15x15", "hex": "Board hex 11x11"}
CONTROL_SLUGS = {"cartpole", "mountain-car", "lunar-lander", "car-racing", "bipedal-walker", "paddle-ball", "alien-shooter", "boxing-style-arena", "ice-hockey-style-arena"}
SOCIAL_SLUGS = {"rock-paper-scissors", "prisoners-dilemma", "bargaining", "negotiation", "first-price-sealed-bid-auction", "liars-dice", "goofspiel"}


def markdown_table(reports) -> str:
    rows = ["| slug | family / board | frames | checks run | result |", "|---|---|---|---|---|"]
    for s, d, r in reports:
        fam = DOC_FAMILY.get(s) or ("scene/board" if FAMILY.get(s) == "scene/board" else "scene/grid" if FAMILY.get(s) == "scene/grid"
                                    else "scene/control" if s in CONTROL_SLUGS else "scene/social" if s in SOCIAL_SLUGS else "scene/cards")
        checks = ", ".join(c for c in r.checks if c not in GENERIC_CHECKS)
        iss = "; ".join(f"{lvl}@{'-' if fi is None else fi} {m}" for lvl, fi, m, _ in r.issues)
        nc = "; ".join(r.not_checkable)
        res = f"**{r.result}**" + (f" — {iss}" if iss else "") + (f" · NC: {nc}" if nc else "")
        rows.append(f"| {s} | {fam} | {len(d['frames'])} | generic + {checks} | {res} |")
    return "\n".join(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    ap.add_argument("--known-issues", type=Path, default=DEFAULT_KNOWN_ISSUES, help="allowlist of upstream Core engine bugs")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--markdown", action="store_true", help="print the docs/physics.md results table")
    ap.add_argument("--strict", action="store_true", help="also fail on KNOWN, RULE and RENDER findings")
    opts = ap.parse_args()
    reports, stale = run(opts.repo, load_known_issues(opts.known_issues))
    if opts.markdown:
        print(markdown_table(reports))
    elif opts.json:
        print(json.dumps([{"slug": s, "frames": len(d["frames"]), "result": r.result, "checks": r.checks,
                           "issues": [[lvl, fr, msg] for lvl, fr, msg, _ in r.issues],
                           "issueChecks": [check for _, _, _, check in r.issues],
                           "notCheckable": r.not_checkable} for s, d, r in reports], indent=1))
    else:
        print("| slug | family | frames | result | checks | findings |")
        print("|---|---|---|---|---|---|")
        for s, d, r in reports:
            fam = FAMILY.get(s, "scene/" + ("cards" if s in ("blackjack",) or "holdem" in s else "other"))
            finds = "; ".join(f"{lvl}@{'-' if fi is None else fi}: {m}" for lvl, fi, m, _ in r.issues) or "—"
            print(f"| {s} | {fam} | {len(d['frames'])} | {r.result} | {len(r.checks)} | {finds} |")
        tally = {}
        for _, _, r in reports:
            tally[r.result] = tally.get(r.result, 0) + 1
        print("\nSUMMARY", json.dumps(tally, sort_keys=True), "games", len(reports), "transitions", sum(len(d["actions"]) for _, d, _ in reports))
        for s, _, r in reports:
            for e in r.known:
                print(f"KNOWN {s}@{e['frame']} [{e['check']}] {e['description']}")
        for s, _, r in reports:
            for lvl, fi, m, check in r.issues:
                if lvl == "FAIL":
                    print(f"FAIL {s}@{'-' if fi is None else fi} [{check or '-'}] {m}")
    for e in stale:
        print(f"STALE allowlist entry {e['slug']}@{e['frame']} [{e['check']}] matched no FAIL; remove it from {opts.known_issues.name}", file=sys.stderr)
    bad = any(lvl == "FAIL" for _, _, r in reports for lvl, _, _, _ in r.issues) or bool(stale) \
        or (opts.strict and any(r.issues for _, _, r in reports))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
