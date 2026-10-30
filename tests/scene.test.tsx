import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GAME_DEMONSTRATIONS } from "../dist/game/demos.js";
import { LegalDemonstration, STATE_UNAVAILABLE_LABEL, BACKGAMMON_STACK_CAP } from "../dist/game/scene.js";
import { deriveCellCues, VARIANT_NOTES, WIN_LENGTH } from "../dist/game/cues.js";
import type { DemonstrationFrame } from "../dist/game/demos.js";

const render = renderToStaticMarkup;
const SLUGS = Object.keys(GAME_DEMONSTRATIONS).sort();
const frame = (state: unknown, extra: Partial<DemonstrationFrame> = {}): DemonstrationFrame =>
  ({ state, caption: "P1 · move", turn: 1, terminal: false, outcomeReason: null, ...extra }) as DemonstrationFrame;
const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length;
const flat = (rows: readonly (readonly (string | null)[])[]) => rows.flat().map((v) => v ?? ".");
const demo = (slug: string) => GAME_DEMONSTRATIONS[slug]!;

test("cues: tic-tac-toe marks exactly the placed cell and draws no line on a draw", () => {
  const d = demo("tic-tac-toe");
  for (let i = 1; i < d.frames.length; i += 1) {
    const before = d.frames[i - 1]!.state.board as (string | null)[], after = d.frames[i]!.state.board as (string | null)[];
    const cues = deriveCellCues(before.map((v) => v ?? "."), after.map((v) => v ?? "."), "grid_3x3", 3, 3, { terminal: d.frames[i]!.terminal });
    assert.deepEqual(cues.last, [d.actions[i - 1]!.action], `frame ${i}`);
    assert.equal(cues.line, undefined, `frame ${i}: ${d.frames[i]!.outcomeReason ?? "live"} has no line`);
  }
  assert.equal(d.frames.at(-1)!.outcomeReason, "draw");
});

test("cues: connect-four marks the dropped disc and the terminal four-in-a-row", () => {
  const d = demo("connect-four");
  const cells = (i: number) => flat(d.frames[i]!.state.board as (string | null)[][]);
  for (let i = 1; i < d.frames.length; i += 1) {
    const cues = deriveCellCues(cells(i - 1), cells(i), "connect_four", 6, 7, { terminal: d.frames[i]!.terminal });
    assert.equal(cues.last.length, 1, `frame ${i}`);
    assert.equal(cues.last[0]! % 7, d.actions[i - 1]!.action, `frame ${i} column`);
    if (!d.frames[i]!.terminal) assert.equal(cues.line, undefined);
  }
  const final = deriveCellCues(cells(d.frames.length - 2), cells(d.frames.length - 1), "connect_four", 6, 7, { terminal: true });
  assert.deepEqual(final.last, [17]);
  assert.deepEqual(final.line, [17, 24, 31, 38]);
  // Not terminal: never a line, even with four in a row on the board.
  assert.equal(deriveCellCues(null, cells(d.frames.length - 1), "connect_four", 6, 7).line, undefined);
});

test("cues: othello marks only the placed disc, never the flips", () => {
  const d = demo("othello");
  for (let i = 1; i < d.frames.length; i += 1) {
    const before = flat(d.frames[i - 1]!.state.board as (string | null)[][]), after = flat(d.frames[i]!.state.board as (string | null)[][]);
    const [y, x] = d.actions[i - 1]!.action as [number, number];
    const flipped = after.filter((v, k) => v !== "." && before[k] !== "." && v !== before[k]).length;
    assert.ok(flipped >= 1, `frame ${i} flips`);
    assert.deepEqual(deriveCellCues(before, after, "square_board", 8, 8).last, [y * 8 + x], `frame ${i}`);
  }
});

test("cues: chess marks from and to squares, four for castling and three for en passant", () => {
  const d = demo("chess");
  const board = (fen: string) => fen.split(" ")[0]!.split("/").flatMap((rank) => [...rank].flatMap((c) => /[1-8]/u.test(c) ? Array<string>(Number(c)).fill(".") : [c]));
  const square = (name: string) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]!);
  for (let i = 1; i < d.frames.length; i += 1) {
    const uci = String(d.actions[i - 1]!.action);
    const cues = deriveCellCues(board(String(d.frames[i - 1]!.state.fen)), board(String(d.frames[i]!.state.fen)), "square_board", 8, 8, { chess: true });
    assert.deepEqual(cues.last, [square(uci.slice(0, 2)), square(uci.slice(2, 4))].sort((a, b) => a - b), `${uci}`);
  }
  const empty = Array<string>(64).fill(".");
  const castleBefore = [...empty], castleAfter = [...empty];
  castleBefore[60] = "K"; castleBefore[63] = "R"; castleAfter[62] = "K"; castleAfter[61] = "R";
  assert.deepEqual(deriveCellCues(castleBefore, castleAfter, "square_board", 8, 8, { chess: true }).last, [60, 61, 62, 63]);
  const epBefore = [...empty], epAfter = [...empty];
  epBefore[28] = "P"; epBefore[27] = "p"; epAfter[19] = "P"; // e5xd6 e.p.
  assert.deepEqual(deriveCellCues(epBefore, epAfter, "square_board", 8, 8, { chess: true }).last, [19, 27, 28]);
});

test("cues: Go captures and Pentago rotations follow the documented rule", () => {
  const before = ["B", "W", ".", ".", ".", ".", ".", ".", "."], after = ["B", ".", ".", "B", ".", ".", ".", ".", "."];
  assert.deepEqual(deriveCellCues(before, after, "go_board", 3, 3).last, [3], "capture excluded");
  const rotBefore = ["B", ".", ".", "."], rotAfter = [".", "B", "W", "."];
  assert.deepEqual(deriveCellCues(rotBefore, rotAfter, "square_board", 2, 2).last, [0, 1, 2], "rotation shows every changed cell");
  assert.deepEqual(deriveCellCues(null, after, "go_board", 3, 3).last, []);
  assert.deepEqual(deriveCellCues(["."], after, "go_board", 3, 3).last, [], "size change");
  // "" and whitespace are empty, like ".".
  assert.deepEqual(deriveCellCues(["", " ", "."], ["X", " ", ""], "grid_3x3", 1, 3).last, [0]);
  // Gomoku gets five only when asked; Go never draws a line.
  const five = Array<string>(25).fill("."); for (let k = 0; k < 5; k += 1) five[10 + k] = "B";
  assert.equal(deriveCellCues(null, five, "go_board", 5, 5, { terminal: true }).line, undefined);
  assert.deepEqual(deriveCellCues(null, five, "go_board", 5, 5, { terminal: true, winLength: WIN_LENGTH.gomoku }).line, [10, 11, 12, 13, 14]);
});

test("scene: CellScene passes last and line through to Board", () => {
  const d = demo("connect-four");
  const n = d.frames.length;
  const html = render(<LegalDemonstration game="connect-four" frame={d.frames[n - 1]!} previous={d.frames[n - 2]!} />);
  assert.equal(count(html, /data-last="true"/g), 1);
  assert.equal(count(html, /data-line="true"/g), 4);
  const opening = render(<LegalDemonstration game="connect-four" frame={d.frames[0]!} />);
  assert.equal(count(opening, /data-last="true"/g), 0);
  const chess = demo("chess");
  assert.equal(count(render(<LegalDemonstration game="chess" frame={chess.frames[1]!} previous={chess.frames[0]!} />), /data-last="true"/g), 2);
});

test("scene: a terminal Gomoku five-in-a-row renders five line markers (review F6)", () => {
  const before = Array.from({ length: 15 }, () => Array<string | null>(15).fill(null));
  for (const column of [0, 1, 2, 3]) before[7]![column] = "B";
  for (const column of [0, 1, 2, 3]) before[8]![column] = "W";
  const after = before.map((row) => [...row]);
  after[7]![4] = "B"; // index 7 * 15 + 4 = 109 completes 105-109
  const previous = frame({ board: before }, { caption: "P2 · 123", turn: 8 });
  const final = frame({ board: after }, { caption: "P1 · 109", turn: 9, terminal: true, outcomeReason: "five_in_a_row" });
  const html = render(<LegalDemonstration game="gomoku" frame={final} previous={previous} />);
  assert.equal(count(html, /data-line="true"/g), 5);
  assert.equal(count(html, /data-last="true"/g), 1);
  assert.match(html, /st-go-winline/);
  // Not terminal: the same five stones draw no line.
  assert.equal(count(render(<LegalDemonstration game="gomoku" frame={{ ...final, terminal: false }} previous={previous} />), /data-line/g), 0);
});

test("scene: paddle-ball ball stays inside the drawn court at wall contacts (review F7)", () => {
  const d = demo("paddle-ball");
  const attr = (tag: string, name: string) => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(tag)![1]);
  const box = (i: number) => {
    const html = render(<LegalDemonstration game="paddle-ball" frame={d.frames[i]!} previous={i ? d.frames[i - 1]! : null} />);
    const [court, paddle] = html.match(/<rect [^>]*>/g)!;
    const ball = /<circle [^>]*>/.exec(html)![0];
    return {
      court: { left: attr(court!, "x"), top: attr(court!, "y"), right: attr(court!, "x") + attr(court!, "width"), bottom: attr(court!, "y") + attr(court!, "height") },
      paddle: { left: attr(paddle!, "x"), top: attr(paddle!, "y"), right: attr(paddle!, "x") + attr(paddle!, "width") },
      ball: { cx: attr(ball, "cx"), cy: attr(ball, "cy"), r: attr(ball, "r") },
      state: d.frames[i]!.state as { ball: { x: number; y: number }; paddle_x: number },
    };
  };
  // Frames 18, 39 and 55 are the right, top and left wall contacts (x=1, y=1, x=0).
  for (const [i, side] of [[18, "right"], [39, "top"], [55, "left"]] as const) {
    const { court, ball, state } = box(i);
    assert.ok(ball.cx - ball.r > court.left && ball.cx + ball.r < court.right, `frame ${i} x extent ${ball.cx}±${ball.r} inside ${court.left}-${court.right}`);
    assert.ok(ball.cy - ball.r > court.top && ball.cy + ball.r < court.bottom, `frame ${i} y extent ${ball.cy}±${ball.r} inside ${court.top}-${court.bottom}`);
    const gap = side === "right" ? court.right - (ball.cx + ball.r) : side === "left" ? ball.cx - ball.r - court.left : ball.cy - ball.r - court.top;
    // The contact leaves exactly one stroke width (1.2) between the geometric edges: painted edges touch.
    assert.ok(Math.abs(gap - 1.2) < 1e-9, `frame ${i} ${side} contact gap ${gap}`);
    assert.equal(side === "top" ? state.ball.y : state.ball.x, side === "left" ? 0 : 1);
  }
  // Every frame: the ball never crosses the drawn walls.
  for (let i = 0; i < d.frames.length; i += 1) {
    const { court, ball } = box(i);
    assert.ok(ball.cx - ball.r > court.left && ball.cx + ball.r < court.right && ball.cy - ball.r > court.top && ball.cy + ball.r < court.bottom, `frame ${i}`);
  }
  // Paddle contact (frame 17, y=.08) uses the same transform: the ball rests on the paddle face,
  // and the paddle span maps paddle_x ± .16 through the ball's x transform.
  const hit = box(17);
  assert.ok(Math.abs(hit.paddle.top - (hit.ball.cy + hit.ball.r) - 1.2) < 1e-9, `paddle face ${hit.paddle.top} vs ball bottom ${hit.ball.cy + hit.ball.r}`);
  assert.ok(hit.paddle.left <= hit.ball.cx && hit.ball.cx <= hit.paddle.right, "ball over the paddle");
  const toX = (u: number) => hit.court.left + 6.2 + u * (hit.court.right - hit.court.left - 12.4);
  assert.ok(Math.abs(hit.ball.cx - toX(hit.state.ball.x)) < 1e-9);
  assert.ok(Math.abs(hit.paddle.left - toX(hit.state.paddle_x - .16)) < 1e-9);
  assert.ok(Math.abs(hit.paddle.right - toX(Math.min(1, hit.state.paddle_x + .16))) < 1e-9);
});

test("scene: every bundled frame of all 50 games renders with its previous frame", () => {
  assert.equal(SLUGS.length, 50);
  let frames = 0;
  for (const slug of SLUGS) {
    const d = demo(slug);
    d.frames.forEach((f, i) => {
      const html = render(<LegalDemonstration game={slug} frame={f} previous={i ? d.frames[i - 1]! : null} />);
      assert.doesNotMatch(html, /NaN|Infinity/u, `${slug} turn ${i}`);
      assert.doesNotMatch(html, /data-scene-state=/u, `${slug} turn ${i} must not fall back to the placeholder`);
      frames += 1;
    });
  }
  assert.equal(frames, Object.values(GAME_DEMONSTRATIONS).reduce((sum, d) => sum + d.frames.length, 0));
});

test("scene: never throws; state={} renders the neutral unavailable scene for every game", () => {
  for (const slug of SLUGS) {
    for (const state of [{}, null, [], "x", { board: "x" }, { board: [[1, 2], [3]] }, { board: [], fen: 7, cart: {}, lander: { x: "1" } }]) {
      let html = "";
      assert.doesNotThrow(() => { html = render(<LegalDemonstration game={slug} frame={frame(state)} />); }, `${slug} ${JSON.stringify(state)}`);
      assert.match(html, /data-scene-state="unavailable"/u, `${slug} ${JSON.stringify(state)}`);
      assert.match(html, new RegExp(STATE_UNAVAILABLE_LABEL, "u"));
      assert.doesNotMatch(html, /NaN|Infinity/u);
    }
    assert.doesNotThrow(() => render(<LegalDemonstration game={slug} frame={null as unknown as DemonstrationFrame} />), slug);
  }
});

test("scene: implausible defaults are gone (pole, taxi, chess, unknown slug)", () => {
  assert.match(render(<LegalDemonstration game="cartpole" frame={frame({ cart: { x: 0 } })} />), /data-scene-state="unavailable"/u);
  assert.match(render(<LegalDemonstration game="taxi" frame={frame({ rows: 5, cols: 5, taxi: [0, 0] })} />), /data-scene-state="unavailable"/u);
  assert.match(render(<LegalDemonstration game="taxi" frame={frame({ rows: 5, cols: 5, taxi: [9, 9], destination: [4, 0], passenger: [0, 0] })} />), /data-scene-state="unavailable"/u);
  assert.match(render(<LegalDemonstration game="chess" frame={frame({ fen: "" })} />), /data-scene-state="unavailable"/u);
  assert.match(render(<LegalDemonstration game="tic-tac-toe" frame={frame({ board: ["x", ".", ".", ".", ".", ".", ".", ".", "."] })} />), /data-scene-state="unavailable"/u, "unknown token");
  const unknown = render(<LegalDemonstration game="not-a-game" frame={frame({ hand_counts: { player_1: 3 } })} />);
  assert.match(unknown, /data-scene-state="unsupported"/u);
  assert.doesNotMatch(unknown, /st-legal-card/u, "unknown slug must not borrow the card table");
});

test("scene: lunar lander thrust comes from state, caption only as a fallback", () => {
  const pad = { x_min: -0.2, x_max: 0.2, y: 0 };
  const lander = { x: 0, y: 0.5, vx: 0, vy: -0.05, angle: 0 };
  const flame = /data-thrust="main"/u;
  const before = frame({ lander, fuel: 90, landing_pad: pad });
  assert.match(render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 89, landing_pad: pad }, { caption: "" })} previous={before} />), flame, "fuel drop = thrust, no caption needed");
  assert.doesNotMatch(render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 90, landing_pad: pad }, { caption: "P1 · main" })} previous={before} />), flame, "state beats caption");
  assert.match(render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 90, landing_pad: pad, thrust: true })} />), flame);
  assert.match(render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 90, landing_pad: pad }, { caption: "P1 · main" })} />), flame, "caption fallback with no previous frame");
  const wide = render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 90, landing_pad: { x_min: -0.6, x_max: 0.6, y: 0 } })} />);
  assert.match(wide, /data-landing-pad="" x1="103" y1="210" x2="217"/u, "pad drawn from landing_pad");
  assert.match(render(<LegalDemonstration game="lunar-lander" frame={frame({ lander, fuel: 90 })} />), /data-scene-state="unavailable"/u);
});

test("scene: backgammon draws the bar and borne-off trays, caps stacks and names the dice owner", () => {
  const board: unknown[] = Array(24).fill(null);
  board[0] = { player: "player_1", count: 15 };
  board[23] = { player: "player_2", count: 3 };
  const html = render(<LegalDemonstration game="backgammon" frame={frame({ board, dice: [6, 2], bar: { player_1: 2, player_2: 7 }, borne_off: { player_1: 4, player_2: 0 }, active_player: "player_2" })} />);
  assert.match(html, /data-backgammon="bar"/u);
  assert.match(html, /data-checkers="2"/u, "player_1 bar");
  assert.match(html, /data-stack-count="15"/u);
  assert.match(html, /data-stack-count="7"/u, "bar badge");
  assert.match(html, /P1 off 4/u);
  assert.match(html, /Dice · P2 · 6 · 2/u);
  const discs = count(html.split('data-checkers="15"')[1]!.split("</g>")[0]!, /<circle/g);
  assert.equal(discs, BACKGAMMON_STACK_CAP);
  for (const cy of html.matchAll(/cy="(-?[\d.]+)"/gu)) assert.ok(Number(cy[1]) >= 20 && Number(cy[1]) <= 192, `checker inside the board: ${cy[1]}`);
  const noOwner = render(<LegalDemonstration game="backgammon" frame={demo("backgammon").frames[3]!} />);
  assert.match(noOwner, /Dice · \d/u, "owner is never guessed");
  assert.match(render(<LegalDemonstration game="backgammon" frame={frame({ board, dice: [6, 2] })} />), /data-scene-state="unavailable"/u, "bar/borne_off are required");
});

test("scene: battleship sizes the grid from grid_size and keeps every shot", () => {
  const html = render(<LegalDemonstration game="battleship" frame={frame({ grid_size: 10, shots: { player_1: [{ cell: "7,7", hit: true }], player_2: [{ cell: "0,9", hit: false }] } })} />);
  assert.match(html, /data-grid-size="10"/u);
  assert.equal(count(html, /class="st-legal-square"/g), 200);
  assert.equal(count(html, /data-shot="hit"/g), 1);
  assert.equal(count(html, /data-shot="miss"/g), 1);
  assert.match(render(<LegalDemonstration game="battleship" frame={frame({ grid_size: 5, shots: { player_1: [{ cell: "7,7", hit: true }], player_2: [] } })} />), /data-scene-state="unavailable"/u, "a shot off the grid is never dropped silently");
});

test("scene: ultimate tic-tac-toe shows decided sub-boards and the next-board region", () => {
  const boards = Array.from({ length: 9 }, () => Array<string | null>(9).fill(null));
  boards[0] = ["X", "X", "X", null, "O", null, "O", null, null];
  boards[4]![4] = "O";
  const html = render(<LegalDemonstration game="ultimate-tic-tac-toe" frame={frame({ boards, local_status: ["X", null, null, null, null, null, null, null, "draw"], next_board: 4 })} />);
  assert.match(html, /data-local-status="X"/u);
  assert.match(html, /data-local-status="draw"/u);
  assert.match(html, /data-next-board="4"/u);
  assert.match(render(<LegalDemonstration game="ultimate-tic-tac-toe" frame={frame({ boards, local_status: ["?"], next_board: 4 })} />), /data-scene-state="unavailable"/u);
});

test("scene: four-seat tables sit N/E/S/W with partners opposite, folded and dealer shown", () => {
  const bridge = render(<LegalDemonstration game="bridge" frame={demo("bridge").frames[5]!} />);
  const at = (p: string) => { const m = bridge.match(new RegExp(`data-seat="${p}"><g transform="translate\\(([\\d.-]+) ([\\d.-]+)\\)`, "u")); assert.ok(m, p); return [Number(m[1]), Number(m[2])]; };
  const [s, w, n, e] = ["player_1", "player_2", "player_3", "player_4"].map(at) as [number, number][];
  assert.equal(s[0], n[0], "P1/P3 (NS partners) share a vertical axis");
  assert.ok(s[1] > n[1]);
  assert.equal(w[1], e[1], "P2/P4 (EW partners) share a horizontal axis");
  assert.ok(w[0] < e[0]);
  const holdem = render(<LegalDemonstration game="limit-texas-holdem" frame={frame({ street: "flop", board: ["KH", "8D", "AS"], pot: 6, stacks: { player_1: 19, player_2: 19, player_3: 18, player_4: 20 }, committed: {}, folded: ["player_3"], dealer: "player_2" })} />);
  assert.match(holdem, /data-seat="player_3" data-folded="true"/u);
  assert.match(holdem, /P3 · 18 chips · folded/u);
  assert.match(holdem, /P2 · 19 chips · D/u);
});

test("scene: captions carry the rules variant where the bundled trace deviates from standard rules", () => {
  for (const slug of ["hearts", "spades", "euchre", "hanabi", "gin-rummy", "mahjong", "backgammon", "leduc-holdem", "cribbage"]) {
    const note = VARIANT_NOTES[slug]!;
    assert.ok(note, slug);
    const d = demo(slug);
    const html = render(<LegalDemonstration game={slug} frame={d.frames[1]!} previous={d.frames[0]!} />);
    assert.match(html, new RegExp(`${d.frames[1]!.caption.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")} · ${note}`, "u"), slug);
    assert.match(render(<LegalDemonstration game={slug} frame={d.frames[1]!} externalSeats />), new RegExp(note, "u"), `${slug} arena table`);
  }
  assert.doesNotMatch(render(<LegalDemonstration game="bridge" frame={demo("bridge").frames[1]!} />), /variant/u);
});
