import React from "react";
import type { ReactNode } from "react";
import { Board } from "./board";
import type { CellBoardFamily, CellBoardFrame } from "./board-types";
import type { DemonstrationFrame } from "./demos";
import { deriveCellCues, variantNoteFor, WIN_LENGTH } from "./cues";

/*
 * Rules scenes for the 50 bundled demonstrations, and for host frames that use
 * the same public-state shapes. Contract: `LegalDemonstration` never throws.
 * Every scene validates the fields it draws; a missing or malformed field
 * renders the neutral "State unavailable" placeholder instead of a
 * plausible-looking default (an upright pole, a taxi parked on the goal, an
 * empty chess board). An unknown slug renders the placeholder too.
 */

type State = Readonly<Record<string, unknown>>;
type Point = readonly [number, number];
type Play = { readonly player: string; readonly card: string };
const SHOGI: Readonly<Record<string, string>> = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "玉", "+P": "と", "+L": "杏", "+N": "圭", "+S": "全", "+B": "馬", "+R": "龍" };
const XIANGQI: Readonly<Record<string, string>> = { R: "車", H: "馬", E: "相", A: "仕", G: "帥", C: "炮", S: "兵", r: "車", h: "馬", e: "象", a: "士", g: "將", c: "砲", s: "卒" };
const MORRIS: readonly Point[] = [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]];
const MORRIS_LINES = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const SUITS: Readonly<Record<string,string>> = {S:"♠",H:"♥",D:"♦",C:"♣"};
/** Checkers drawn per backgammon point, bar and tray before a count badge takes over. */
export const BACKGAMMON_STACK_CAP = 5;
export const STATE_UNAVAILABLE_LABEL = "State unavailable";
function mountainX(v: number) { return 25+(v+1.2)/1.8*270; }
function mountainY(v: number) { return 175-Math.sin(3*v)*45; }

const CELL_GAMES = new Set(["chess", "go", "hex", "othello", "connect-four", "tic-tac-toe", "gomoku", "pentago", "ultimate-tic-tac-toe"]);
const BOARD_GAMES = new Set(["checkers", "shogi", "xiangqi", "mancala", "nine-mens-morris", "backgammon", "battleship"]);
const GRID_GAMES = new Set(["taxi", "frozen-lake", "cliff-walking"]);
const CONTROL_GAMES = new Set(["cartpole", "mountain-car", "lunar-lander", "car-racing", "bipedal-walker", "paddle-ball", "alien-shooter", "boxing-style-arena", "ice-hockey-style-arena"]);
const SOCIAL_GAMES = new Set(["rock-paper-scissors", "prisoners-dilemma", "bargaining", "negotiation", "first-price-sealed-bid-auction", "liars-dice", "goofspiel"]);
const TRICK_GAMES = new Set(["bridge", "hearts", "spades", "euchre"]);
const CARD_GAMES = new Set(["blackjack", "leduc-holdem", "limit-texas-holdem", "no-limit-texas-holdem", "shedding-card-game", "crazy-eights", "gin-rummy", "mahjong", "dou-dizhu", "bridge", "hearts", "spades", "euchre", "cribbage", "hanabi"]);
const PLAYERS = ["player_1", "player_2"] as const;

// ---------------------------------------------------------------- field readers (undefined = invalid)
function isRecord(v: unknown): v is Readonly<Record<string, unknown>> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function isNum(v: unknown): v is number { return typeof v === "number" && Number.isFinite(v); }
function isInt(v: unknown): v is number { return Number.isSafeInteger(v); }
function isStr(v: unknown): v is string { return typeof v === "string"; }
function num(s: State, key: string): number | undefined { const v = s[key]; return isNum(v) ? v : undefined; }
function str(s: State, key: string): string | undefined { const v = s[key]; return isStr(v) ? v : undefined; }
function rec(s: State, key: string): State | undefined { const v = s[key]; return isRecord(v) ? v : undefined; }
function list(s: State, key: string): readonly unknown[] | undefined { const v = s[key]; return Array.isArray(v) ? v : undefined; }
function numbers(v: unknown): readonly number[] | undefined { return Array.isArray(v) && v.every(isNum) ? v : undefined; }
function strings(v: unknown): readonly string[] | undefined { return Array.isArray(v) && v.every(isStr) ? v : undefined; }
function numRecord(v: unknown): Readonly<Record<string, number>> | undefined {
  return isRecord(v) && Object.values(v).every(isNum) ? v as Readonly<Record<string, number>> : undefined;
}
function point(v: unknown): Point | undefined { return Array.isArray(v) && v.length === 2 && v.every(isInt) ? [v[0] as number, v[1] as number] : undefined; }
function inBounds(p: Point, rows: number, cols: number) { return p[0] >= 0 && p[0] < rows && p[1] >= 0 && p[1] < cols; }
function stateOf(frame: DemonstrationFrame | null | undefined): State | undefined { return isRecord(frame) && isRecord(frame.state) ? frame.state : undefined; }
function seatNumber(player: string) { const n = Number(player.replace(/^player_/u, "")); return Number.isFinite(n) ? n : Infinity; }
function seat(player: string) { return player.replace("player_", "P"); }

function Label({ x = 160, y, anchor = "middle", children }: { readonly x?: number; readonly y: number; readonly anchor?: "start" | "middle" | "end"; readonly children: ReactNode }) {
  return <text x={x} y={y} textAnchor={anchor} className="st-legal-label">{children}</text>;
}
function Disc({ x, y, white = false, r = 8 }: { readonly x: number; readonly y: number; readonly white?: boolean; readonly r?: number }) {
  return <circle cx={x} cy={y} r={r} className={white ? "st-legal-piece-b" : "st-legal-piece-a"} />;
}

function Unavailable({ game, caption, label = STATE_UNAVAILABLE_LABEL, reason = "unavailable" }: { readonly game: string; readonly caption: string; readonly label?: string; readonly reason?: "unavailable" | "unsupported" }) {
  return <div className="st-legal-cell-scene st-legal-unavailable" data-rules-scene={game} data-scene-state={reason}>
    <div className="st-legal-board"><Board frame={{ kind: "placeholder", family: game, label }} /></div>
    {caption && <span className="st-legal-caption">{caption}</span>}
  </div>;
}

/**
 * One rules-accurate frame of a demonstration. `previous` is the frame before
 * it (when there is one); cell boards use it for the last-move and win-line
 * cues (see cues.ts) and the lunar lander for engine thrust.
 */
export function LegalDemonstration({ game, frame, previous = null, externalSeats = false }: { readonly game: string; readonly frame: DemonstrationFrame; readonly previous?: DemonstrationFrame | null; readonly externalSeats?: boolean }) {
  const caption = isRecord(frame) && isStr(frame.caption) ? frame.caption : "";
  const variant = variantNoteFor(game);
  const shownCaption = variant && caption ? `${caption} · ${variant}` : caption || variant || "";
  const known = CELL_GAMES.has(game) || BOARD_GAMES.has(game) || GRID_GAMES.has(game) || CONTROL_GAMES.has(game) || SOCIAL_GAMES.has(game) || CARD_GAMES.has(game);
  if (!known) return <Unavailable game={game} caption={caption} label="Unsupported game" reason="unsupported" />;
  const s = stateOf(frame);
  let content: ReactNode = null;
  try {
    if (s && CELL_GAMES.has(game)) content = cellScene(game, s, frame, stateOf(previous), shownCaption);
    else if (s) {
      const terminal = frame.terminal === true;
      const body = BOARD_GAMES.has(game) ? boardScene(game, s)
        : CONTROL_GAMES.has(game) ? controlScene(game, s, { terminal, caption, previous: stateOf(previous) })
          : GRID_GAMES.has(game) ? gridScene(game, s, terminal && frame.outcomeReason === "passenger_delivered")
            : SOCIAL_GAMES.has(game) ? socialScene(game, s) : cardScene(game, s, externalSeats);
      content = body === null ? null
        : <svg viewBox={externalSeats ? "0 42 320 158" : "0 0 320 240"} className="st-legal-scene" aria-hidden="true" data-rules-scene={game} data-rules-variant={variant ?? undefined}>
          {body}
          {!externalSeats && <Label y={232}>{shownCaption}</Label>}
          {externalSeats && variant && <Label y={170}>{variant}</Label>}
        </svg>;
    }
  } catch {
    content = null; // Malformed host state must never unmount the host tree.
  }
  return content ?? <Unavailable game={game} caption={shownCaption} />;
}

// ---------------------------------------------------------------- cell boards (shared Board)
const CELL_TOKENS: Readonly<Record<string, ReadonlySet<string>>> = {
  chess: new Set("KQRBNPkqrbnp"), "tic-tac-toe": new Set("XO"), "ultimate-tic-tac-toe": new Set("XO"), "connect-four": new Set("RY"),
  go: new Set("BW"), gomoku: new Set("BW"), othello: new Set("BW"), pentago: new Set("BW"), hex: new Set("BW"),
};
const CELL_FAMILY: Readonly<Record<string, CellBoardFamily>> = {
  chess: "square_board", othello: "square_board", pentago: "square_board", go: "go_board", gomoku: "go_board", hex: "hex_board",
  "connect-four": "connect_four", "tic-tac-toe": "grid_3x3", "ultimate-tic-tac-toe": "grid_3x3",
};

/** The row-major cells CellScene draws, or null when the state cannot be read. */
function cellModel(game: string, s: State): { rows: number; cols: number; cells: string[] } | null {
  let rows: readonly (readonly unknown[])[];
  if (game === "chess") {
    const fen = str(s, "fen");
    const ranks = fen?.split(" ")[0]?.split("/");
    if (!ranks || ranks.length !== 8) return null;
    rows = ranks.map((rank) => [...rank].flatMap((c) => /[1-8]/u.test(c) ? Array.from({ length: Number(c) }, () => null) : [c]));
  } else if (game === "tic-tac-toe") {
    const board = list(s, "board");
    if (!board || board.length !== 9) return null;
    rows = [board.slice(0,3), board.slice(3,6), board.slice(6,9)];
  } else if (game === "ultimate-tic-tac-toe") {
    const boards = list(s, "boards");
    if (!boards || boards.length !== 9 || !boards.every((b) => Array.isArray(b) && b.length === 9)) return null;
    const sub = boards as readonly (readonly unknown[])[];
    rows = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => sub[Math.floor(r/3)*3+Math.floor(c/3)]![r%3*3+c%3]));
  } else {
    const board = list(s, "board");
    if (!board || !board.every(Array.isArray)) return null;
    rows = board as readonly (readonly unknown[])[];
  }
  const cols = rows[0]?.length ?? 0;
  if (!rows.length || !cols || rows.some((row) => row.length !== cols)) return null;
  const tokens = CELL_TOKENS[game]!;
  const cells: string[] = [];
  for (const v of rows.flat()) {
    if (v === null || v === undefined || v === "" || v === ".") { cells.push("."); continue; }
    if (!isStr(v) || !tokens.has(v)) return null;
    // Core's hex B (player_1, top-bottom goal) is drawn with the accent token R.
    cells.push(game === "hex" ? v === "B" ? "R" : "B" : v);
  }
  return { rows: rows.length, cols, cells };
}

function cellScene(game: string, s: State, frame: DemonstrationFrame, previous: State | undefined, caption: string): ReactNode {
  const model = cellModel(game, s);
  if (!model) return null;
  const family = CELL_FAMILY[game]!;
  const before = previous ? cellModel(game, previous) : null;
  const winLength = Object.hasOwn(WIN_LENGTH, game) ? WIN_LENGTH[game] : undefined;
  const cues = deriveCellCues(before?.cells ?? null, model.cells, family, model.rows, model.cols, { terminal: frame.terminal === true, chess: game === "chess", ...(winLength ? { winLength } : {}) });
  const board: CellBoardFrame = { kind: "cells", family, rows: model.rows, cols: model.cols, cells: model.cells, chess: game === "chess", last: cues.last, ...(cues.line ? { line: cues.line } : {}) };
  let overlay: ReactNode = null;
  if (game === "ultimate-tic-tac-toe") {
    const nextBoard = s.next_board;
    if (!(nextBoard === null || nextBoard === undefined || (isInt(nextBoard) && nextBoard >= 0 && nextBoard < 9))) return null;
    const status = s.local_status === undefined ? [] : list(s, "local_status");
    if (!status || (status.length !== 0 && status.length !== 9) || !status.every((v) => v === null || v === "X" || v === "O" || v === "draw")) return null;
    overlay = <svg className="st-legal-subboards" viewBox="0 0 9 9">
      <path d="M3 0V9M6 0V9M0 3H9M0 6H9" />
      {status.map((v, b) => {
        if (v === null) return null;
        const x = b%3*3, y = Math.floor(b/3)*3;
        // A decided sub-board is dimmed and carries its result, so it never looks playable.
        return <g key={b} data-local-status={v}>
          <rect x={x} y={y} width={3} height={3} style={{ fill: "var(--surface-3)", fillOpacity: 0.72, stroke: "none" }} />
          {v === "X" && <path d={`M${x+.55} ${y+.55}L${x+2.45} ${y+2.45}M${x+2.45} ${y+.55}L${x+.55} ${y+2.45}`} style={{ stroke: "var(--text)", strokeWidth: .24, strokeLinecap: "round" }} />}
          {v === "O" && <circle cx={x+1.5} cy={y+1.5} r={1} style={{ fill: "none", stroke: "var(--text)", strokeWidth: .24 }} />}
        </g>;
      })}
      {isInt(nextBoard) && <rect data-next-board={nextBoard} x={nextBoard%3*3} y={Math.floor(nextBoard/3)*3} width={3} height={3} />}
    </svg>;
  }
  return <div className={`st-legal-cell-scene st-legal-cell-${game}`} data-rules-scene={game}>
    <div className="st-legal-board"><Board frame={board} />
      {game === "pentago" && <div className="st-legal-quadrants" />}
      {overlay}
    </div><span className="st-legal-caption">{caption}</span>
  </div>;
}

// ---------------------------------------------------------------- bespoke boards
function pieceGrid(s: State, valid: (piece: string) => boolean): readonly (readonly (string | null)[])[] | null {
  const board = list(s, "board");
  if (!board || !board.length || !board.every(Array.isArray)) return null;
  const rows = board as readonly (readonly unknown[])[];
  const n = rows[0]!.length;
  if (!n || rows.some((row) => row.length !== n || !row.every((p) => p === null || (isStr(p) && valid(p))))) return null;
  return rows as readonly (readonly (string | null)[])[];
}

function Stack({ x, base, dir, count, white, step = 12, r = 6 }: { readonly x: number; readonly base: number; readonly dir: 1 | -1; readonly count: number; readonly white: boolean; readonly step?: number; readonly r?: number }) {
  const shown = Math.min(count, BACKGAMMON_STACK_CAP);
  return <g data-checkers={count}>{Array.from({ length: shown }, (_, j) => <Disc key={j} x={x} y={base+dir*j*step} r={r} white={white} />)}
    {count > BACKGAMMON_STACK_CAP && <text x={x} y={base+dir*(shown-1)*step+3} textAnchor="middle" fontSize={8} className={white ? "" : "st-legal-accent"} data-stack-count={count}>{count}</text>}</g>;
}

function boardScene(game: string, s: State): ReactNode {
  if (game === "checkers" || game === "shogi" || game === "xiangqi") {
    const valid = game === "checkers" ? (p: string) => /^[rbRB]$/u.test(p) : game === "shogi" ? (p: string) => Object.hasOwn(SHOGI, p.toUpperCase()) : (p: string) => Object.hasOwn(XIANGQI, p);
    const board = pieceGrid(s, valid);
    if (!board) return null;
    const hands = rec(s, "hands");
    const n = board[0]!.length, m = board.length, step = Math.min(24, 190/m), w = (game === "xiangqi" ? n-1 : n)*step;
    const left = (320-w)/2, top = 14;
    return <g>{board.flatMap((row,r) => row.map((piece,c) => {
      const x = left+c*step, y = top+r*step;
      return <g key={`${r}:${c}`}>
        {game === "xiangqi" ? <>{c < n-1 && <line x1={x} y1={y} x2={x+step} y2={y} />}{r < m-1 && (r !== 4 || c === 0 || c === n-1) && <line x1={x} y1={y} x2={x} y2={y+step} />}{piece && <><circle cx={x} cy={y} r={step*.43} className="st-legal-card" /><text x={x} y={y+step*.2} textAnchor="middle" fontSize={step*.65} className={piece === piece.toUpperCase() ? "st-legal-accent" : ""}>{XIANGQI[piece]}</text></>}
        </> : <><rect x={x} y={y} width={step} height={step} className={game === "checkers" && (r+c)%2 ? "st-legal-dark-square" : "st-legal-square"} />{piece && (game === "checkers" ? <><Disc x={x+step/2} y={y+step/2} r={step*.36} white={piece.toLowerCase() === "r"} />{piece === piece.toUpperCase() && <text x={x+step/2} y={y+step*.72} textAnchor="middle" fontSize={step*.55}>♔</text>}</> : <g transform={`translate(${x+step/2} ${y+step/2}) rotate(${piece === piece.toLowerCase() ? 180 : 0})`}><path d={`M0 ${-step*.43}L${step*.36} ${-step*.22}V${step*.4}H${-step*.36}V${-step*.22}Z`} className="st-legal-card" /><text textAnchor="middle" y={step*.2} fontSize={step*.6}>{SHOGI[piece.toUpperCase()]}</text></g>)}</>}
      </g>;
    }))}{game === "xiangqi" && <><path d={`M${left+3*step} ${top}l${2*step} ${2*step}m0 ${-2*step}l${-2*step} ${2*step}M${left+3*step} ${top+7*step}l${2*step} ${2*step}m0 ${-2*step}l${-2*step} ${2*step}`} /><Label y={top+4.6*step}>楚河 · 漢界</Label></>}
      {game === "shogi" && hands && <Label y={212}>Captured pieces · {Object.entries(hands).map(([p,hand])=>`${seat(p)} ${isRecord(hand) ? Object.entries(hand).map(([piece,n])=>`${SHOGI[piece] ?? piece}${String(n)}`).join(" ") || "—" : "?"}`).join(" / ")}</Label>}
    </g>;
  }
  if (game === "mancala") {
    const pits = rec(s, "pits"), stores = numRecord(s.stores);
    const rows = PLAYERS.map((p) => pits?.[p]);
    if (!stores || !PLAYERS.every((p) => isNum(stores[p])) || !rows.every((row) => Array.isArray(row) && row.length === 6 && row.every((n) => isInt(n) && n >= 0))) return null;
    return <g><rect x={14} y={54} width={292} height={124} rx={28} className="st-legal-square" />{(["player_2","player_1"] as const).flatMap((p,r)=>(pits![p] as readonly number[]).map((n,i)=>{
      const x = 73+(r ? i : 5-i)*35, y = 86+r*58;
      return <g key={`${p}:${i}`}><ellipse cx={x} cy={y} rx={15} ry={21} className="st-legal-pit" />{Array.from({length:Math.min(n, 60)},(_,j)=><circle key={j} cx={x+Math.cos(j*2.4)*Math.min(9,3+j*.7)} cy={y+Math.sin(j*2.4)*Math.min(14,3+j)} r={2} className="st-legal-piece-a" />)}<Label x={x} y={y+33}>{n}</Label></g>;
    }))}{(["player_2","player_1"] as const).map((p,i)=><g key={p}><ellipse cx={35+i*250} cy={116} rx={16} ry={48} className="st-legal-pit" /><Label x={35+i*250} y={120}>{stores[p]}</Label></g>)}</g>;
  }
  if (game === "nine-mens-morris") {
    const board = list(s, "board");
    if (!board || board.length !== 24 || !board.every((v) => v === null || v === "player_1" || v === "player_2")) return null;
    const reserves = numRecord(s.reserves);
    return <g>{MORRIS_LINES.map((line)=>{const a=MORRIS[line[0]!]!, b=MORRIS[line[2]!]!;return <line key={line.join(":")} x1={70+a[0]*30} y1={16+a[1]*30} x2={70+b[0]*30} y2={16+b[1]*30} />;})}{MORRIS.map(([x,y],i)=>board[i] ? <Disc key={`${x}:${y}`} x={70+x*30} y={16+y*30} white={board[i]==="player_2"} /> : <circle key={`${x}:${y}`} cx={70+x*30} cy={16+y*30} r={2} />)}{reserves && <Label y={213}>Reserves · {Object.entries(reserves).map(([p,n])=>`${seat(p)} ${n}`).join(" / ")}</Label>}</g>;
  }
  if (game === "battleship") return battleshipScene(s);
  if (game === "backgammon") return backgammonScene(s);
  return null;
}

function battleshipScene(s: State): ReactNode {
  const size = s.grid_size;
  const shots = rec(s, "shots");
  if (!isInt(size) || size < 1 || size > 26 || !shots) return null;
  const parsed: Record<string, Map<string, boolean>> = {};
  for (const p of PLAYERS) {
    const own = shots[p];
    if (!Array.isArray(own)) return null;
    const map = new Map<string, boolean>();
    for (const shot of own) {
      if (!isRecord(shot) || !isStr(shot.cell) || typeof shot.hit !== "boolean") return null;
      const rc = shot.cell.split(",").map(Number);
      // A shot outside the declared grid would be silently dropped: refuse instead.
      if (rc.length !== 2 || !rc.every((v) => isInt(v) && v >= 0 && v < size)) return null;
      map.set(`${rc[0]},${rc[1]}`, shot.hit);
    }
    parsed[p] = map;
  }
  const step = Math.min(22, 130/size), width = size*step;
  return <g data-grid-size={size}>{PLAYERS.map((p,i)=><g key={p}><Label x={85+i*150} y={36}>{seat(p)} shots</Label>{Array.from({length:size*size},(_,c)=>{
    const r = Math.floor(c/size), col = c%size, hit = parsed[p]!.get(`${r},${col}`);
    const x = 85+i*150-width/2+col*step, y = 52+r*step;
    return <g key={c}><rect x={x} y={y} width={step} height={step} className="st-legal-square" />{hit !== undefined && (hit ? <path data-shot="hit" d={`M${x+step*.27} ${y+step*.27}l${step*.46} ${step*.46}m0 ${-step*.46}l${-step*.46} ${step*.46}`} className="st-legal-accent" /> : <circle data-shot="miss" cx={x+step/2} cy={y+step/2} r={Math.max(1.2, step*.14)} />)}</g>;
  })}</g>)}</g>;
}

function backgammonScene(s: State): ReactNode {
  const board = list(s, "board"), dice = numbers(s.dice), bar = numRecord(s.bar), off = numRecord(s.borne_off);
  if (!board || board.length !== 24 || !dice || !dice.every((d) => isInt(d) && d >= 1 && d <= 6) || !bar || !off) return null;
  if (!PLAYERS.every((p) => isInt(bar[p]) && bar[p]! >= 0 && isInt(off[p]) && off[p]! >= 0)) return null;
  if (!board.every((pt) => pt === null || (isRecord(pt) && (pt.player === "player_1" || pt.player === "player_2") && isInt(pt.count) && pt.count > 0))) return null;
  const points = board as readonly ({ player: string; count: number } | null)[];
  // Dice owner only when the state says who rolled; never guessed from turn parity.
  const owner = [s.dice_owner, s.active_player, s.current_player].find(isStr);
  // Twelve columns per row with the bar between columns 5 and 6, borne-off trays on the right.
  const colX = (col: number) => 27+col*19+(col >= 6 ? 22 : 0);
  return <g>
    <rect x={16} y={20} width={254} height={172} className="st-legal-square" />
    <rect x={133} y={20} width={20} height={172} className="st-legal-pit" data-backgammon="bar" />
    {points.map((point,i)=>{
      const top=i>=12, x=colX(top?23-i:i), y=top?28:184;
      return <g key={i}><path d={`M${x-8} ${y}H${x+8}L${x} ${top?94:118}Z`} className={i%2?"st-legal-pit":"st-legal-accent-soft"} />{point && <Stack x={x} base={y+(top?8:-8)} dir={top?1:-1} count={point.count} white={point.player==="player_2"} />}<Label x={x} y={top?16:206}>{i+1}</Label></g>;
    })}
    <Stack x={143} base={40} dir={1} count={bar.player_2!} white />
    <Stack x={143} base={172} dir={-1} count={bar.player_1!} white={false} />
    <Label x={143} y={110}>bar</Label>
    {PLAYERS.map((p, i) => {
      const n = off[p]!, top = i === 1, y0 = top ? 24 : 188;
      return <g key={p} data-backgammon={`borne-off-${p}`}>
        <rect x={276} y={top ? 20 : 108} width={28} height={84} className="st-legal-pit" />
        {Array.from({ length: Math.min(n, BACKGAMMON_STACK_CAP) }, (_, j) => <rect key={j} x={279} y={top ? y0+j*7 : y0-5-j*7} width={22} height={5} rx={1} className={top ? "st-legal-piece-b" : "st-legal-piece-a"} />)}
        <Label x={290} y={top ? 98 : 120}>{`${seat(p)} off ${n}`}</Label>
      </g>;
    })}
    <Label x={211} y={110}>{`Dice${owner ? ` · ${seat(owner)}` : ""}${dice.length ? ` · ${dice.join(" · ")}` : " · —"}`}</Label>
  </g>;
}

// ---------------------------------------------------------------- grid worlds
function gridScene(game: string, s: State, delivered: boolean): ReactNode {
  let rows: number, cols: number, holes: (r: number, c: number) => boolean;
  if (game === "frozen-lake") {
    const grid = list(s, "grid");
    if (!grid || !grid.length || !grid.every((row) => strings(row))) return null;
    const g = grid as readonly (readonly string[])[];
    rows = g.length; cols = g[0]!.length;
    if (!cols || g.some((row) => row.length !== cols)) return null;
    holes = (r, c) => g[r]![c] === "H";
  } else {
    const r0 = num(s, "rows"), c0 = num(s, "cols");
    if (!isInt(r0) || !isInt(c0) || r0 < 1 || c0 < 1 || r0 > 40 || c0 > 40) return null;
    rows = r0; cols = c0;
    const cliff = game === "cliff-walking" ? list(s, "cliff") : [];
    if (!cliff) return null;
    const cells = cliff.map(point);
    if (cells.some((p) => !p)) return null;
    holes = (r, c) => cells.some((p) => p![0] === r && p![1] === c);
  }
  const pos = point(s[game === "taxi" ? "taxi" : "position"]), goal = point(s[game === "taxi" ? "destination" : "goal"]);
  if (!pos || !goal || !inBounds(pos, rows, cols) || !inBounds(goal, rows, cols)) return null;
  let passenger: Point | null = null, onboard = false;
  if (game === "taxi") {
    onboard = s.onboard === true || s.passenger === "in_taxi";
    if (!onboard) { passenger = point(s.passenger) ?? null; if (!passenger || !inBounds(passenger, rows, cols)) return null; }
  }
  const step=Math.min(34,280/cols),left=(320-step*cols)/2,top=(214-step*rows)/2;
  return <g>{Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols,x=left+c*step,y=top+r*step,hole=holes(r,c);
    return <g key={i}><rect x={x} y={y} width={step} height={step} className={hole?"st-legal-hazard":"st-legal-square"} />{goal[0]===r&&goal[1]===c&&<text x={x+step/2} y={y+step*.68} textAnchor="middle" fontSize={step*.6}>⚑</text>}{
      // Core's taxi reports the passenger back at the pickup point after dropoff (a known
      // Core bug, scripts/physics-known-issues.json); on the delivered frame it is not drawn.
      passenger&&!delivered&&passenger[0]===r&&passenger[1]===c&&<circle data-taxi-passenger="waiting" cx={x+step/2} cy={y+step/2} r={step*.13} />}{pos[0]===r&&pos[1]===c&&<rect x={x+step*.23} y={y+step*.23} width={step*.54} height={step*.54} rx={3} className="st-legal-agent" />}</g>;
  })}{game==="taxi"&&<Label y={210}>{onboard?"Passenger onboard":delivered?"Passenger delivered":"Pickup → destination"}</Label>}</g>;
}

// ---------------------------------------------------------------- control tasks
function lunarThrust(s: State, previous: State | undefined, terminal: boolean, caption: string): boolean {
  if (terminal) return false;
  // Prefer an explicit engine field when the host's state carries one.
  for (const key of ["thrust", "main_engine", "engine"]) {
    const v = s[key];
    if (typeof v === "boolean") return v;
    if (isNum(v)) return v > 0;
    if (isStr(v)) return v === "main";
  }
  // Core's lander burns fuel only on the main engine, so a fuel drop since the previous
  // frame is the thrust signal for the bundled traces (they carry no engine field).
  const fuel = num(s, "fuel"), before = previous ? num(previous, "fuel") : undefined;
  if (fuel !== undefined && before !== undefined) return fuel < before;
  // Last resort only, when neither the state nor a previous frame says anything:
  // the bundled caption names the action ("P1 · main").
  return caption.endsWith("main");
}

function controlScene(game: string, s: State, { terminal, caption, previous }: { readonly terminal: boolean; readonly caption: string; readonly previous: State | undefined }): ReactNode {
  if (game === "cartpole") {
    const cart = rec(s, "cart"), pole = rec(s, "pole");
    if (!cart || !pole || !isNum(cart.x) || !isNum(pole.angle)) return null;
    const x=160+cart.x*45,y=168;
    return <g><line x1={20} y1={192} x2={300} y2={192} /><rect x={x-20} y={y} width={40} height={16} className="st-legal-agent" /><circle cx={x-12} cy={188} r={4} /><circle cx={x+12} cy={188} r={4} /><line x1={x} y1={y} x2={x+95*Math.sin(pole.angle)} y2={y-95*Math.cos(pole.angle)} className="st-legal-limb" /><Disc x={x} y={y} r={3} /></g>;
  }
  if (game === "mountain-car") {
    const x = num(s, "position");
    if (x === undefined) return null;
    const goalX = num(s, "goal_position") ?? .5;
    const path=Array.from({length:90},(_,i)=>{const v=-1.2+i*1.8/89;return `${i?"L":"M"}${mountainX(v)} ${mountainY(v)}`;}).join(" ");
    return <g><path d={path} /><g transform={`translate(${mountainX(x)} ${mountainY(x)}) rotate(${Math.atan2(-135*Math.cos(3*x),150)*180/Math.PI})`}><rect x={-11} y={-13} width={22} height={9} rx={2} className="st-legal-agent" /><circle cx={-7} cy={-4} r={4} /><circle cx={7} cy={-4} r={4} /></g><path d={`M${mountainX(goalX)} ${mountainY(goalX)}v-24h12l-12 8`} className="st-legal-accent" /></g>;
  }
  if (game === "lunar-lander") {
    const l = rec(s, "lander"), fuel = num(s, "fuel"), pad = rec(s, "landing_pad");
    if (!l || !isNum(l.x) || !isNum(l.y) || !isNum(l.angle) || fuel === undefined || !pad || !isNum(pad.x_min) || !isNum(pad.x_max) || !(pad.x_min < pad.x_max)) return null;
    const x=160+l.x*95,y=198-l.y*160, padY = 210-(isNum(pad.y) ? pad.y : 0)*160;
    return <g><line x1={20} y1={210} x2={300} y2={210} /><line data-landing-pad="" x1={160+pad.x_min*95} y1={padY} x2={160+pad.x_max*95} y2={padY} className="st-legal-limb" /><g transform={`translate(${x} ${y}) rotate(${l.angle*180/Math.PI})`}><path d="M-9 0V-12L0-17L9-12V0ZM-6 0L-14 12H-19M6 0L14 12H19" className="st-legal-ship" />{lunarThrust(s, previous, terminal, caption)&&<path data-thrust="main" d="M-4 1L0 15L4 1" className="st-legal-accent" />}</g><Label y={24}>Fuel · {fuel.toFixed(0)}</Label></g>;
  }
  if (game === "paddle-ball") {
    const b = rec(s, "ball"), p = num(s, "paddle_x"), bounces = num(s, "bounces");
    if (!b || !isNum(b.x) || !isNum(b.y) || p === undefined) return null;
    // Core bounces the ball centre at y=.08; place the paddle below its radius.
    const paddleTop = 210 - .08 * 194 + 5;
    return <g><rect x={20} y={16} width={280} height={194} className="st-legal-square" /><rect x={20+Math.max(0,p-.16)*280} y={paddleTop} width={Math.max(0, Math.min(1,p+.16)-Math.max(0,p-.16))*280} height={7} rx={3} className="st-legal-agent" /><Disc x={20+b.x*280} y={210-b.y*194} r={5} />{bounces !== undefined && <Label y={28}>Rally · {bounces}</Label>}</g>;
  }
  if (game === "alien-shooter") {
    const px = num(s, "player_x"), aliens = list(s, "aliens")?.map(point), bullets = list(s, "bullets")?.map(point);
    if (px === undefined || !aliens || !bullets || aliens.some((a) => !a) || bullets.some((b) => !b)) return null;
    const x=38+px*40;
    return <g><path d={`M${x-10} 205v-8h7v-8h6v8h7v8Z`} className="st-legal-agent" />{aliens.map((p,i)=>{const [a,b]=p!;return <path key={i} d={`M${38+a*40-9} ${188-b*27}h18v12h-4v-3h-10v3h-4Zm3 -3v3m12 -3v3`} className="st-legal-ship" />;})}{bullets.map((p,i)=>{const [a,b]=p!;return <line key={i} x1={38+a*40} y1={188-b*27} x2={38+a*40} y2={182-b*27} className="st-legal-accent" />;})}</g>;
  }
  if (game === "car-racing") {
    const c = rec(s, "car"), curves = numbers(s.track_window);
    if (!c || !isNum(c.lane) || !isNum(c.heading) || !isNum(c.progress) || !curves) return null;
    const bend=(curves[0]??0)*350, progress=c.progress;
    return <g><path d={`M70 214Q${70+bend} 110 ${70+bend*2} 14M250 214Q${250+bend} 110 ${250+bend*2} 14`} className="st-legal-limb" />{Array.from({length:7},(_,i)=><line key={i} x1={160+bend*(1-i/7)} y1={(i*40+progress*80)%220} x2={160+bend*(1-i/7)} y2={(i*40+progress*80)%220+14} strokeDasharray="5 3" />)}<g transform={`translate(${160+bend*.48+c.lane*80} 166) rotate(${c.heading*180/Math.PI})`}><rect x={-10} y={-19} width={20} height={38} rx={5} className="st-legal-agent" /><rect x={-7} y={-10} width={14} height={9} className="st-legal-card" /></g></g>;
  }
  if (game === "bipedal-walker") {
    const w = rec(s, "walker"), terrain = numbers(s.terrain_window);
    if (!w || !isNum(w.distance) || !isNum(w.torso_angle) || (w.next_foot !== "left" && w.next_foot !== "right") || !terrain) return null;
    const torso = w.torso_angle, distance = w.distance;
    const ground=(x:number)=>{ const u=Math.max(0,Math.min(4,x/64)), lo=Math.floor(u), t=u-lo; return 187-((terrain[lo]??0)*(1-t)+(terrain[Math.min(4,lo+1)]??0)*t)*15; };
    const hip:Point=[160+Math.sin(torso)*22,139],left:Point=[140+(w.next_foot==="left"?16:-8),ground(140)],right:Point=[180+(w.next_foot==="right"?-16:8),ground(180)];
    return <g><path d={Array.from({length:6},(_,i)=>`${i?"L":"M"}${i*64} ${ground(i*64)}`).join(" ")} />{Array.from({length:12},(_,i)=><circle key={i} cx={((i*31-distance*24)%320+320)%320} cy={204} r={1} />)}{[left,right].map(([x,y],i)=><path key={i} d={`M${hip[0]} ${hip[1]}L${(hip[0]+x)/2+(i?8:-8)} ${(hip[1]+y)/2}L${x} ${y}h${i?8:-8}`} className="st-legal-limb" />)}<line x1={hip[0]} y1={hip[1]} x2={160+Math.sin(torso)*44} y2={99} className="st-legal-limb" /><Disc x={160+Math.sin(torso)*48} y={88} r={9} /></g>;
  }
  if (game === "ice-hockey-style-arena") {
    const positions = rec(s, "positions"), owner = s.puck_owner, goals = numRecord(s.goals);
    if (!positions || !goals || !(owner === null || isStr(owner)) || !Object.values(positions).every((p) => isRecord(p) && isNum(p.x) && isNum(p.lane))) return null;
    const skaters = Object.entries(positions) as [string, { x: number; lane: number }][];
    return <g><rect x={20} y={25} width={280} height={175} rx={36} className="st-legal-square" /><line x1={160} y1={25} x2={160} y2={200} /><circle cx={160} cy={112} r={24} fill="none" />{skaters.map(([p,pos])=><g key={p}><Disc x={35+pos.x*62} y={54+pos.lane*56} r={10} white={p==="player_2"} /><path d={`M${35+pos.x*62} ${64+pos.lane*56}l12 9h9`} />{owner===p&&<circle cx={56+pos.x*62} cy={77+pos.lane*56} r={3} />}</g>)}<Label y={17}>{Object.values(goals).join(" : ")}</Label></g>;
  }
  if (game === "boxing-style-arena") {
    const distance = num(s, "distance"), stances = rec(s, "stances"), health = numRecord(s.health);
    if (distance === undefined || !stances || !health || !PLAYERS.every((p) => isNum(health[p]))) return null;
    return <g><path d="M25 184H295M35 62V193M285 62V193M35 78H285M35 98H285" />{PLAYERS.map((p,i)=>{const sign=i?-1:1,x=160-sign*(24+distance*18),jab=stances[p]==="striking";return <g key={p}><Disc x={x} y={95} white={Boolean(i)} r={10} /><path d={`M${x} 106v40m0 -25l${sign*12} -8l${sign*(jab?25:2)} ${jab?0:-13}M${x} 146l-12 37m12 -37l12 37`} className="st-legal-limb" /><Disc x={x+sign*(jab?37:14)} y={jab?113:100} white={Boolean(i)} r={5} /><Label x={x} y={44}>{health[p]} HP</Label></g>;})}</g>;
  }
  return null;
}

// ---------------------------------------------------------------- card tables
function Card({ value, x, y, back = false, dim = false }: { readonly value?: string | number | undefined; readonly x: number; readonly y: number; readonly back?: boolean; readonly dim?: boolean }) {
  const raw=String(value??""),suit=raw.slice(-1);
  const face=SUITS[suit] ? raw.slice(0,-1)+SUITS[suit] : raw;
  return <g transform={`translate(${x} ${y})`} opacity={dim ? .35 : undefined}><rect width={34} height={48} rx={4} className={back?"st-legal-card-back":"st-legal-card"} />{back?<path d="M8 10h18v28H8Z" />:<text x={17} y={29} textAnchor="middle" fontSize={12} className={suit==="H"||suit==="D"?"st-legal-accent":""}>{face}</text>}</g>;
}
function Cards({ cards, y }: { readonly cards: readonly (string | number)[]; readonly y: number }) {
  return <g>{cards.slice(-7).map((card,i)=><Card key={`${card}:${cards.slice(0,i).filter(c=>c===card).length}`} x={160-Math.min(7,cards.length)*39/2+i*39} y={y} value={card} />)}</g>;
}
function cardsOf(v: unknown): readonly (string | number)[] | undefined {
  return Array.isArray(v) && v.every((c) => isStr(c) || isNum(c)) ? v : undefined;
}
function plays(v: unknown): readonly Play[] | undefined {
  return Array.isArray(v) && v.every((p) => isRecord(p) && isStr(p.player) && isStr(p.card)) ? v as readonly Play[] : undefined;
}

/** Seat geometry. Four seats sit N/E/S/W in play order (P1 south, clockwise), so partners face each other. */
function seatSpots(n: number): readonly { readonly x: number; readonly y: number; readonly lx: number; readonly ly: number; readonly anchor: "start" | "middle" | "end" }[] {
  if (n === 4) return [
    { x: 143, y: 162, lx: 160, ly: 220, anchor: "middle" }, // S
    { x: 2, y: 96, lx: 3, ly: 158, anchor: "start" }, // W
    { x: 143, y: 12, lx: 160, ly: 9, anchor: "middle" }, // N
    { x: 284, y: 96, lx: 317, ly: 158, anchor: "end" }, // E
  ];
  return Array.from({ length: n }, (_, i) => { const x = 320/(n+1)*(i+1); return { x: x-17, y: i%2?162:12, lx: x, ly: i%2?220:9, anchor: "middle" as const }; });
}

function cardScene(game: string, s: State, externalSeats: boolean): ReactNode {
  if (game === "blackjack") {
    const dealer = cardsOf(s.dealer_hand), player = cardsOf(s.player_hand);
    if (!dealer || !player) return null;
    return <g><Label y={28}>Dealer</Label><Cards cards={dealer} y={36} /><Label y={122}>Player</Label><Cards cards={player} y={132} /></g>;
  }
  const counts = s.hand_counts === undefined ? undefined : numRecord(s.hand_counts);
  if (s.hand_counts !== undefined && !counts) return null;
  let cards: readonly (string | number)[] = [], zone: string;
  if (game.endsWith("holdem")) {
    const board = cardsOf(s.board), street = str(s, "street"), pot = num(s, "pot");
    if (!board || street === undefined || pot === undefined || !numRecord(s.stacks)) return null;
    cards = board; zone = `${street} · pot ${pot}`;
  } else if (TRICK_GAMES.has(game)) {
    const trick = plays(s.current_trick), history = list(s, game === "euchre" ? "history" : "trick_history") ?? list(s, "trick_history") ?? list(s, "history");
    if (!trick || !history || !counts) return null;
    const completed = history.at(-1);
    // Euchre's history also holds the trump call, which has no cards.
    const completedCards = isRecord(completed) && completed.cards !== undefined ? plays(completed.cards) : [];
    if (completedCards === undefined) return null;
    const winner = isRecord(completed) && isStr(completed.winner) ? completed.winner : null;
    cards = (trick.length ? trick : completedCards).map((v) => v.card);
    zone = trick.length ? `Trick · ${trick.map((v) => seat(v.player)).join(" → ")}` : winner ? `Trick won by ${seat(winner)}` : "Awaiting lead";
  } else if (game === "mahjong") {
    const pile = list(s, "discard_pile"), wall = num(s, "wall_count");
    if (!pile || wall === undefined || !counts || !pile.every((v) => isRecord(v) && isStr(v.tile))) return null;
    cards = pile.map((v) => (v as { tile: string }).tile); zone = `Discards · wall ${wall}`;
  } else if (game === "dou-dizhu") {
    const play = s.last_play, landlord = str(s, "landlord");
    if (!counts || landlord === undefined || !(play === null || (isRecord(play) && strings(play.cards) && isStr(play.player)))) return null;
    const lp = play as { cards: readonly string[]; player: string } | null;
    cards = lp?.cards ?? []; zone = lp ? `${seat(lp.player)} played` : `Landlord ${seat(landlord)}`;
  } else if (game === "gin-rummy") {
    const top = str(s, "discard_top"), phase = str(s, "phase"), deck = num(s, "deck_count");
    if (top === undefined || phase === undefined || deck === undefined || !counts) return null;
    cards = top ? [top] : []; zone = `${phase} · deck ${deck}`;
  } else if (game === "cribbage") {
    const starter = str(s, "starter");
    if (starter === undefined || !counts) return null;
    cards = starter ? [starter] : []; zone = "Starter · discard two to the crib";
  } else if (game === "hanabi") {
    const fireworks = numRecord(s.fireworks), clues = num(s, "clues"), lives = num(s, "lives");
    if (!fireworks || clues === undefined || lives === undefined || !counts) return null;
    cards = Object.entries(fireworks).map(([color, n]) => `${n}${color}`); zone = `Fireworks · ${clues} clues · ${lives} lives`;
  } else if (game === "shedding-card-game" || game === "crazy-eights") {
    const discard = str(s, "discard"), deck = num(s, "deck_count");
    if (discard === undefined || deck === undefined || !counts) return null;
    cards = discard ? [discard] : []; zone = `Discard · deck ${deck}`;
  } else {
    return null;
  }
  const byChips = !counts || !Object.keys(counts).length;
  const seatSource = byChips ? numRecord(s.stacks) ?? {} : counts!;
  const seats = Object.entries(seatSource).sort(([a], [b]) => seatNumber(a) - seatNumber(b));
  const folded = new Set(strings(s.folded) ?? []);
  const dealer = [s.dealer, s.button].find(isStr);
  const spots = seatSpots(seats.length);
  const contract = rec(s, "contract");
  return <g>{!externalSeats && <rect x={14} y={62} width={292} height={116} rx={40} className="st-legal-square" />}<Label y={87}>{zone}</Label><Cards cards={cards} y={100} />
    {!externalSeats && seats.map(([p, n], i) => {
      const spot = spots[i]!, out = folded.has(p);
      return <g key={p} data-seat={p} data-folded={out || undefined}>
        {(byChips || n > 0) && <Card x={spot.x} y={spot.y} back dim={out} />}
        <Label x={spot.lx} y={spot.ly} anchor={spot.anchor}>{seat(p)} · {byChips ? `${n} chips` : `${n} cards`}{out ? " · folded" : ""}{dealer === p ? " · D" : ""}</Label>
      </g>;
    })}
    {game === "bridge" && contract && isNum(contract.level) && isStr(contract.strain) && <Label y={60}>Contract {contract.level}{contract.strain}</Label>}
    {game === "euchre" && <Label y={60}>Trump · {s.trump === null ? "uncalled" : str(s, "trump") ?? "?"} · upcard {str(s, "upcard") ?? "?"}</Label>}
  </g>;
}

// ---------------------------------------------------------------- social / sealed games
function socialScene(game: string, s: State): ReactNode {
  if (game === "bargaining" || game === "negotiation") {
    if (!("last_offer" in s)) return null;
    const offer = s.last_offer;
    if (offer !== null && !(isRecord(offer) && isStr(offer.player))) return null;
    const o = offer as Readonly<Record<string, unknown>> | null;
    if (game === "bargaining") {
      const share = o?.player_1_share;
      if (o && !(isNum(share) && share >= 0 && share <= 100)) return null;
      return <g><Label y={60}>{o ? `${seat(String(o.player))} offers` : "Awaiting offer"}</Label>{o && isNum(share) && <><rect x={40} y={98} width={240*share/100} height={36} className="st-legal-agent" /><rect x={40+240*share/100} y={98} width={240*(100-share)/100} height={36} className="st-legal-pit" /><Label y={162}>P1 {share} / P2 {100-share}</Label></>}</g>;
    }
    const price = o?.price, delivery = o?.delivery;
    return <g><Label y={60}>{o ? `${seat(String(o.player))} offers` : "Awaiting offer"}</Label><Label y={113}>Price · {isNum(price) || isStr(price) ? price : "—"}</Label><Label y={146}>Delivery · {isNum(delivery) || isStr(delivery) ? delivery : "—"}</Label></g>;
  }
  if (game === "liars-dice") {
    if (!("current_bid" in s)) return null;
    const bid = s.current_bid, dice = rec(s, "revealed_dice");
    if (!dice || !(bid === null || (isRecord(bid) && isInt(bid.count) && isInt(bid.face)))) return null;
    const b = bid as { count: number; face: number } | null;
    return <g><Label y={50}>{b ? `Bid · ${b.count} × face ${b.face}` : "Make a bid"}</Label>{PLAYERS.map((p,i)=>{const own = numbers(dice[p]);return <g key={p}><Label y={86+i*80}>{seat(p)} · {own?"revealed":"concealed"}</Label>{Array.from({length:5},(_,j)=><g key={j}><rect x={58+j*43} y={94+i*80} width={31} height={31} rx={5} className="st-legal-card" /><Label x={73+j*43} y={115+i*80}>{own?.[j]??"?"}</Label></g>)}</g>;})}</g>;
  }
  if (game === "goofspiel") {
    const rounds = list(s, "round_history"), points = numRecord(s.points), prize = s.current_prize;
    if (!rounds || !points || !(prize === null || isNum(prize)) || !rounds.every(isRecord)) return null;
    const last = rounds.at(-1) as { bids?: Record<string, number>; prize?: number; winner?: string | null } | undefined;
    return <g><Label y={44}>Prize · {prize ?? "complete"}</Label>{PLAYERS.map((p,i)=><g key={p}><Label x={95+i*130} y={80}>{seat(p)} · {points[p] ?? "—"} points</Label><Card x={78+i*130} y={96} value={last?.bids?.[p]} back={!last} /></g>)}<Label y={180}>{last?`Previous prize ${last.prize} · ${last.winner?seat(last.winner):"tied"}`:"Choose sealed bids 1–5"}</Label></g>;
  }
  const reveals = rec(s, game === "first-price-sealed-bid-auction" ? "revealed_bids" : "revealed_actions");
  if (!reveals) return null;
  return <g>{PLAYERS.map((p,i)=>{const v = reveals[p];return <g key={p}><Label x={90+i*140} y={52}>{seat(p)}</Label><rect x={40+i*140} y={76} width={100} height={92} rx={12} className="st-legal-square" /><Label x={90+i*140} y={128}>{isStr(v) || isNum(v) ? v : "Sealed"}</Label></g>;})}<Label y={197}>{game==="first-price-sealed-bid-auction"?"Highest bid pays its own bid":game==="rock-paper-scissors"?"Reveal together":"Simultaneous choices"}</Label></g>;
}
