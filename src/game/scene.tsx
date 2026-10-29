import React from "react";
import type { ReactNode } from "react";
import { Board } from "./board";
import type { CellBoardFrame } from "./board-types";
import type { DemonstrationFrame } from "./demos";

type State = Readonly<Record<string, unknown>>;
type Point = readonly [number, number];
type Play = { readonly player: string; readonly card: string };
const SHOGI: Readonly<Record<string, string>> = { P: "歩", L: "香", N: "桂", S: "銀", G: "金", B: "角", R: "飛", K: "玉", "+P": "と", "+L": "杏", "+N": "圭", "+S": "全", "+B": "馬", "+R": "龍" };
const XIANGQI: Readonly<Record<string, string>> = { R: "車", H: "馬", E: "相", A: "仕", G: "帥", C: "炮", S: "兵", r: "車", h: "馬", e: "象", a: "士", g: "將", c: "砲", s: "卒" };
const MORRIS: readonly Point[] = [[0,0],[3,0],[6,0],[1,1],[3,1],[5,1],[2,2],[3,2],[4,2],[0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[2,4],[3,4],[4,4],[1,5],[3,5],[5,5],[0,6],[3,6],[6,6]];
const MORRIS_LINES = [[0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],[0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23]];
const SUITS: Readonly<Record<string,string>> = {S:"♠",H:"♥",D:"♦",C:"♣"};
function mountainX(v: number) { return 25+(v+1.2)/1.8*270; }
function mountainY(v: number) { return 175-Math.sin(3*v)*45; }

const CELL_GAMES = new Set(["chess", "go", "hex", "othello", "connect-four", "tic-tac-toe", "gomoku", "pentago", "ultimate-tic-tac-toe"]);
const BOARD_GAMES = new Set(["checkers", "shogi", "xiangqi", "mancala", "nine-mens-morris", "backgammon", "battleship"]);
const CONTROL_GAMES = new Set(["cartpole", "mountain-car", "lunar-lander", "car-racing", "bipedal-walker", "paddle-ball", "alien-shooter", "boxing-style-arena", "ice-hockey-style-arena"]);
const SOCIAL_GAMES = new Set(["rock-paper-scissors", "prisoners-dilemma", "bargaining", "negotiation", "first-price-sealed-bid-auction", "liars-dice", "goofspiel"]);

function read<T>(s: State, key: string, fallback: T): T { return (s[key] ?? fallback) as T; }
function seat(player: string) { return player.replace("player_", "P"); }
function Label({ x = 160, y, children }: { readonly x?: number; readonly y: number; readonly children: ReactNode }) {
  return <text x={x} y={y} textAnchor="middle" className="st-legal-label">{children}</text>;
}
function Disc({ x, y, white = false, r = 8 }: { readonly x: number; readonly y: number; readonly white?: boolean; readonly r?: number }) {
  return <circle cx={x} cy={y} r={r} className={white ? "st-legal-piece-b" : "st-legal-piece-a"} />;
}

export function LegalDemonstration({ game, frame, externalSeats = false }: { readonly game: string; readonly frame: DemonstrationFrame; readonly externalSeats?: boolean }) {
  if (CELL_GAMES.has(game)) return <CellScene game={game} frame={frame} />;
  return <svg viewBox={externalSeats ? "0 42 320 158" : "0 0 320 240"} className="st-legal-scene" aria-hidden="true" data-rules-scene={game}>
    {BOARD_GAMES.has(game) ? <BoardScene game={game} s={frame.state} />
      : CONTROL_GAMES.has(game) ? <ControlScene game={game} s={frame.state} frame={frame} />
        : ["taxi", "frozen-lake", "cliff-walking"].includes(game) ? <GridScene game={game} s={frame.state} delivered={frame.terminal && frame.outcomeReason === "passenger_delivered"} />
          : SOCIAL_GAMES.has(game) ? <SocialScene game={game} s={frame.state} /> : <CardScene game={game} s={frame.state} externalSeats={externalSeats} />}
    {!externalSeats && <Label y={232}>{frame.caption}</Label>}
  </svg>;
}

function CellScene({ game, frame }: { readonly game: string; readonly frame: DemonstrationFrame }) {
  const s = frame.state;
  let rows = read<readonly (readonly (string | null)[])[]>(s, "board", []);
  if (game === "chess") {
    rows = read(s, "fen", "").split(" ")[0]!.split("/").map((rank) => [...rank].flatMap((c) => /[1-8]/u.test(c) ? Array.from({ length: Number(c) }, () => null) : c));
  }
  if (game === "tic-tac-toe") {
    const cells = read<readonly (string | null)[]>(s, "board", []);
    rows = [cells.slice(0,3),cells.slice(3,6),cells.slice(6,9)];
  }
  if (game === "ultimate-tic-tac-toe") {
    const boards = read<readonly (readonly (string | null)[])[]>(s, "boards", []);
    rows = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => boards[Math.floor(r/3)*3+Math.floor(c/3)]![r%3*3+c%3] ?? null));
  }
  const cells = rows.flat().map((v) => v === null ? "." : game === "hex" ? v === "B" ? "R" : "B" : v);
  const board: CellBoardFrame = { kind: "cells", rows: rows.length, cols: rows[0]?.length ?? 1, cells,
    family: game === "go" || game === "gomoku" ? "go_board" : game === "hex" ? "hex_board" : game === "connect-four" ? "connect_four" : (game === "tic-tac-toe" || game === "ultimate-tic-tac-toe") ? "grid_3x3" : "square_board", chess: game === "chess" };
  return <div className={`st-legal-cell-scene st-legal-cell-${game}`} data-rules-scene={game}>
    <div className="st-legal-board"><Board frame={board} />
      {game === "pentago" && <div className="st-legal-quadrants" />}
      {game === "ultimate-tic-tac-toe" && <svg className="st-legal-subboards" viewBox="0 0 9 9"><path d="M3 0V9M6 0V9M0 3H9M0 6H9" />{typeof s.next_board === "number" && <rect x={s.next_board%3*3} y={Math.floor(s.next_board/3)*3} width={3} height={3} />}</svg>}
    </div><span className="st-legal-caption">{frame.caption}</span>
  </div>;
}

function BoardScene({ game, s }: { readonly game: string; readonly s: State }) {
  if (["checkers", "shogi", "xiangqi"].includes(game)) {
    const board = read<readonly (readonly (string | null)[])[]>(s, "board", []);
    const n = board[0]!.length, m = board.length, step = Math.min(24, 190/m), w = (game === "xiangqi" ? n-1 : n)*step;
    const left = (320-w)/2, top = 14;
    return <g>{board.flatMap((row,r) => row.map((piece,c) => {
      const x = left+c*step, y = top+r*step;
      return <g key={`${r}:${c}`}>
        {game === "xiangqi" ? <>{c < n-1 && <line x1={x} y1={y} x2={x+step} y2={y} />}{r < m-1 && (r !== 4 || c === 0 || c === n-1) && <line x1={x} y1={y} x2={x} y2={y+step} />}{piece && <><circle cx={x} cy={y} r={step*.43} className="st-legal-card" /><text x={x} y={y+step*.2} textAnchor="middle" fontSize={step*.65} className={piece === piece.toUpperCase() ? "st-legal-accent" : ""}>{XIANGQI[piece]}</text></>}
        </> : <><rect x={x} y={y} width={step} height={step} className={game === "checkers" && (r+c)%2 ? "st-legal-dark-square" : "st-legal-square"} />{piece && (game === "checkers" ? <><Disc x={x+step/2} y={y+step/2} r={step*.36} white={piece.toLowerCase() === "r"} />{piece === piece.toUpperCase() && <text x={x+step/2} y={y+step*.72} textAnchor="middle" fontSize={step*.55}>♔</text>}</> : <g transform={`translate(${x+step/2} ${y+step/2}) rotate(${piece === piece.toLowerCase() ? 180 : 0})`}><path d={`M0 ${-step*.43}L${step*.36} ${-step*.22}V${step*.4}H${-step*.36}V${-step*.22}Z`} className="st-legal-card" /><text textAnchor="middle" y={step*.2} fontSize={step*.6}>{SHOGI[piece.toUpperCase()]}</text></g>)}</>}
      </g>;
    }))}{game === "xiangqi" && <><path d={`M${left+3*step} ${top}l${2*step} ${2*step}m0 ${-2*step}l${-2*step} ${2*step}M${left+3*step} ${top+7*step}l${2*step} ${2*step}m0 ${-2*step}l${-2*step} ${2*step}`} /><Label y={top+4.6*step}>楚河 · 漢界</Label></>}
      {game === "shogi" && <Label y={212}>Captured pieces · {Object.entries(read<Record<string, Record<string, number>>>(s,"hands",{})).map(([p,hand])=>`${seat(p)} ${Object.entries(hand).map(([piece,n])=>`${SHOGI[piece]}${n}`).join(" ") || "—"}`).join(" / ")}</Label>}
    </g>;
  }
  if (game === "mancala") {
    const pits = read<Record<string, readonly number[]>>(s,"pits",{}), stores = read<Record<string,number>>(s,"stores",{});
    return <g><rect x={14} y={54} width={292} height={124} rx={28} className="st-legal-square" />{["player_2","player_1"].flatMap((p,r)=>pits[p]!.map((n,i)=>{
      const x = 73+(r ? i : 5-i)*35, y = 86+r*58;
      return <g key={`${p}:${i}`}><ellipse cx={x} cy={y} rx={15} ry={21} className="st-legal-pit" />{Array.from({length:n},(_,j)=><circle key={j} cx={x+Math.cos(j*2.4)*Math.min(9,3+j*.7)} cy={y+Math.sin(j*2.4)*Math.min(14,3+j)} r={2} className="st-legal-piece-a" />)}<Label x={x} y={y+33}>{n}</Label></g>;
    }))}{["player_2","player_1"].map((p,i)=><g key={p}><ellipse cx={35+i*250} cy={116} rx={16} ry={48} className="st-legal-pit" /><Label x={35+i*250} y={120}>{stores[p]}</Label></g>)}</g>;
  }
  if (game === "nine-mens-morris") {
    const board = read<readonly (string | null)[]>(s,"board",[]);
    return <g>{MORRIS_LINES.map((line)=>{const a=MORRIS[line[0]!]!, b=MORRIS[line[2]!]!;return <line key={line.join(":")} x1={70+a[0]*30} y1={16+a[1]*30} x2={70+b[0]*30} y2={16+b[1]*30} />;})}{MORRIS.map(([x,y],i)=>board[i] ? <Disc key={`${x}:${y}`} x={70+x*30} y={16+y*30} white={board[i]==="player_2"} /> : <circle key={`${x}:${y}`} cx={70+x*30} cy={16+y*30} r={2} />)}<Label y={213}>Reserves · {Object.entries(read<Record<string,number>>(s,"reserves",{})).map(([p,n])=>`${seat(p)} ${n}`).join(" / ")}</Label></g>;
  }
  if (game === "battleship") {
    const shots=read<Record<string,readonly {cell:string;hit:boolean}[]>>(s,"shots",{});
    return <g>{["player_1","player_2"].map((p,i)=><g key={p}><Label x={85+i*150} y={36}>{seat(p)} shots</Label>{Array.from({length:25},(_,c)=>{
      const shot=shots[p]!.find(v=>v.cell===`${Math.floor(c/5)},${c%5}`),x=30+i*150+c%5*22,y=52+Math.floor(c/5)*22;
      return <g key={c}><rect x={x} y={y} width={22} height={22} className="st-legal-square" />{shot && (shot.hit ? <path d={`M${x+6} ${y+6}l10 10m0 -10l-10 10`} className="st-legal-accent" /> : <circle cx={x+11} cy={y+11} r={3} />)}</g>;
    })}</g>)}</g>;
  }
  const board=read<readonly ({player:string;count:number}|null)[]>(s,"board",[]);
  return <g><rect x={16} y={20} width={288} height={172} className="st-legal-square" />{board.map((point,i)=>{
    const top=i>=12, x=29+(top?23-i:i)*23.8, y=top?28:184;
    return <g key={i}><path d={`M${x-10} ${y}H${x+10}L${x} ${top?94:118}Z`} className={i%2?"st-legal-pit":"st-legal-accent-soft"} />{point && Array.from({length:point.count},(_,j)=><Disc key={j} x={x} y={y+(top?1:-1)*(8+j*14)} r={6} white={point.player==="player_2"} />)}<Label x={x} y={top?16:206}>{i+1}</Label></g>;
  })}<Label y={108}>Dice · {read<readonly number[]>(s,"dice",[]).join(" · ")}</Label></g>;
}

function GridScene({ game, s, delivered }: { readonly game: string; readonly s: State; readonly delivered: boolean }) {
  const grid=read<readonly (readonly string[])[]>(s,"grid",[]), rows=read(s,"rows",grid.length || 5), cols=read(s,"cols",grid[0]?.length || 5);
  const pos=read<Point>(s,game==="taxi"?"taxi":"position",[0,0]), goal=read<Point>(s,game==="taxi"?"destination":"goal",[0,0]), passenger=read<Point>(s,"passenger",[-1,-1]);
  const cliff=read<readonly Point[]>(s,"cliff",[]), step=Math.min(34,280/cols),left=(320-step*cols)/2,top=(214-step*rows)/2;
  return <g>{Array.from({length:rows*cols},(_,i)=>{const r=Math.floor(i/cols),c=i%cols,x=left+c*step,y=top+r*step,hole=grid[r]?.[c]==="H" || cliff.some(p=>p[0]===r&&p[1]===c);
    return <g key={i}><rect x={x} y={y} width={step} height={step} className={hole?"st-legal-hazard":"st-legal-square"} />{goal[0]===r&&goal[1]===c&&<text x={x+step/2} y={y+step*.68} textAnchor="middle" fontSize={step*.6}>⚑</text>}{game==="taxi"&&!s.onboard&&!delivered&&passenger[0]===r&&passenger[1]===c&&<circle data-taxi-passenger="waiting" cx={x+step/2} cy={y+step/2} r={step*.13} />}{pos[0]===r&&pos[1]===c&&<rect x={x+step*.23} y={y+step*.23} width={step*.54} height={step*.54} rx={3} className="st-legal-agent" />}</g>;
  })}{game==="taxi"&&<Label y={210}>{s.onboard?"Passenger onboard":delivered?"Passenger delivered":"Pickup → destination"}</Label>}</g>;
}

function ControlScene({ game, s, frame }: { readonly game: string; readonly s: State; readonly frame: DemonstrationFrame }) {
  if (game === "cartpole") {
    const cart=read(s,"cart",{x:0}),pole=read(s,"pole",{angle:0}),x=160+cart.x*45,y=168;
    return <g><line x1={20} y1={192} x2={300} y2={192} /><rect x={x-20} y={y} width={40} height={16} className="st-legal-agent" /><circle cx={x-12} cy={188} r={4} /><circle cx={x+12} cy={188} r={4} /><line x1={x} y1={y} x2={x+95*Math.sin(pole.angle)} y2={y-95*Math.cos(pole.angle)} className="st-legal-limb" /><Disc x={x} y={y} r={3} /></g>;
  }
  if (game === "mountain-car") {
    const x=read(s,"position",-.5);
    const path=Array.from({length:90},(_,i)=>{const v=-1.2+i*1.8/89;return `${i?"L":"M"}${mountainX(v)} ${mountainY(v)}`;}).join(" ");
    return <g><path d={path} /><g transform={`translate(${mountainX(x)} ${mountainY(x)}) rotate(${Math.atan2(-135*Math.cos(3*x),150)*180/Math.PI})`}><rect x={-11} y={-13} width={22} height={9} rx={2} className="st-legal-agent" /><circle cx={-7} cy={-4} r={4} /><circle cx={7} cy={-4} r={4} /></g><path d={`M${mountainX(.5)} ${mountainY(.5)}v-24h12l-12 8`} className="st-legal-accent" /></g>;
  }
  if (game === "lunar-lander") {
    const l=read(s,"lander",{x:0,y:1,angle:0}),x=160+l.x*95,y=198-l.y*160;
    return <g><line x1={20} y1={210} x2={300} y2={210} /><line x1={141} y1={210} x2={179} y2={210} className="st-legal-limb" /><g transform={`translate(${x} ${y}) rotate(${l.angle*180/Math.PI})`}><path d="M-9 0V-12L0-17L9-12V0ZM-6 0L-14 12H-19M6 0L14 12H19" className="st-legal-ship" />{frame.caption.endsWith("main")&&!frame.terminal&&<path d="M-4 1L0 15L4 1" className="st-legal-accent" />}</g><Label y={24}>Fuel · {read(s,"fuel",100).toFixed(0)}</Label></g>;
  }
  if (game === "paddle-ball") {
    const b=read(s,"ball",{x:.5,y:.5}),p=read(s,"paddle_x",.5);
    // Core bounces the ball centre at y=.08; place the paddle below its radius.
    const paddleTop = 210 - .08 * 194 + 5;
    return <g><rect x={20} y={16} width={280} height={194} className="st-legal-square" /><rect x={20+Math.max(0,p-.16)*280} y={paddleTop} width={(Math.min(1,p+.16)-Math.max(0,p-.16))*280} height={7} rx={3} className="st-legal-agent" /><Disc x={20+b.x*280} y={210-b.y*194} r={5} /><Label y={28}>Rally · {read(s,"bounces",0)}</Label></g>;
  }
  if (game === "alien-shooter") {
    const aliens=read<readonly Point[]>(s,"aliens",[]),bullets=read<readonly Point[]>(s,"bullets",[]),x=38+read(s,"player_x",3)*40;
    return <g><path d={`M${x-10} 205v-8h7v-8h6v8h7v8Z`} className="st-legal-agent" />{aliens.map(([a,b],i)=><path key={i} d={`M${38+a*40-9} ${188-b*27}h18v12h-4v-3h-10v3h-4Zm3 -3v3m12 -3v3`} className="st-legal-ship" />)}{bullets.map(([a,b],i)=><line key={i} x1={38+a*40} y1={188-b*27} x2={38+a*40} y2={182-b*27} className="st-legal-accent" />)}</g>;
  }
  if (game === "car-racing") {
    const c=read(s,"car",{lane:0,heading:0,progress:0}),curves=read<readonly number[]>(s,"track_window",[]);
    const bend=(curves[0]??0)*350;
    return <g><path d={`M70 214Q${70+bend} 110 ${70+bend*2} 14M250 214Q${250+bend} 110 ${250+bend*2} 14`} className="st-legal-limb" />{Array.from({length:7},(_,i)=><line key={i} x1={160+bend*(1-i/7)} y1={(i*40+c.progress*80)%220} x2={160+bend*(1-i/7)} y2={(i*40+c.progress*80)%220+14} strokeDasharray="5 3" />)}<g transform={`translate(${160+bend*.48+c.lane*80} 166) rotate(${c.heading*180/Math.PI})`}><rect x={-10} y={-19} width={20} height={38} rx={5} className="st-legal-agent" /><rect x={-7} y={-10} width={14} height={9} className="st-legal-card" /></g></g>;
  }
  if (game === "bipedal-walker") {
    const w=read(s,"walker",{distance:0,torso_angle:0,next_foot:"left"}),terrain=read<readonly number[]>(s,"terrain_window",[]);
    const ground=(x:number)=>{ const u=Math.max(0,Math.min(4,x/64)), lo=Math.floor(u), t=u-lo; return 187-((terrain[lo]??0)*(1-t)+(terrain[Math.min(4,lo+1)]??0)*t)*15; };
    const hip:Point=[160+Math.sin(w.torso_angle)*22,139],left:Point=[140+(w.next_foot==="left"?16:-8),ground(140)],right:Point=[180+(w.next_foot==="right"?-16:8),ground(180)];
    return <g><path d={Array.from({length:6},(_,i)=>`${i?"L":"M"}${i*64} ${ground(i*64)}`).join(" ")} />{Array.from({length:12},(_,i)=><circle key={i} cx={((i*31-w.distance*24)%320+320)%320} cy={204} r={1} />)}{[left,right].map(([x,y],i)=><path key={i} d={`M${hip[0]} ${hip[1]}L${(hip[0]+x)/2+(i?8:-8)} ${(hip[1]+y)/2}L${x} ${y}h${i?8:-8}`} className="st-legal-limb" />)}<line x1={hip[0]} y1={hip[1]} x2={160+Math.sin(w.torso_angle)*44} y2={99} className="st-legal-limb" /><Disc x={160+Math.sin(w.torso_angle)*48} y={88} r={9} /></g>;
  }
  if (game === "ice-hockey-style-arena") {
    const positions=read<Record<string,{x:number;lane:number}>>(s,"positions",{}),owner=read(s,"puck_owner","");
    return <g><rect x={20} y={25} width={280} height={175} rx={36} className="st-legal-square" /><line x1={160} y1={25} x2={160} y2={200} /><circle cx={160} cy={112} r={24} fill="none" />{Object.entries(positions).map(([p,pos])=><g key={p}><Disc x={35+pos.x*62} y={54+pos.lane*56} r={10} white={p==="player_2"} /><path d={`M${35+pos.x*62} ${64+pos.lane*56}l12 9h9`} />{owner===p&&<circle cx={56+pos.x*62} cy={77+pos.lane*56} r={3} />}</g>)}<Label y={17}>{Object.values(read<Record<string,number>>(s,"goals",{})).join(" : ")}</Label></g>;
  }
  const distance=read(s,"distance",2),stances=read<Record<string,string>>(s,"stances",{});
  return <g><path d="M25 184H295M35 62V193M285 62V193M35 78H285M35 98H285" />{["player_1","player_2"].map((p,i)=>{const sign=i?-1:1,x=160-sign*(24+distance*18),jab=stances[p]==="striking";return <g key={p}><Disc x={x} y={95} white={Boolean(i)} r={10} /><path d={`M${x} 106v40m0 -25l${sign*12} -8l${sign*(jab?25:2)} ${jab?0:-13}M${x} 146l-12 37m12 -37l12 37`} className="st-legal-limb" /><Disc x={x+sign*(jab?37:14)} y={jab?113:100} white={Boolean(i)} r={5} /><Label x={x} y={44}>{read<Record<string,number>>(s,"health",{})[p]} HP</Label></g>;})}</g>;
}

function Card({ value, x, y, back = false }: { readonly value?: string | number | undefined; readonly x: number; readonly y: number; readonly back?: boolean }) {
  const raw=String(value??""),suit=raw.slice(-1);
  const face=SUITS[suit] ? raw.slice(0,-1)+SUITS[suit] : raw;
  return <g transform={`translate(${x} ${y})`}><rect width={34} height={48} rx={4} className={back?"st-legal-card-back":"st-legal-card"} />{back?<path d="M8 10h18v28H8Z" />:<text x={17} y={29} textAnchor="middle" fontSize={12} className={suit==="H"||suit==="D"?"st-legal-accent":""}>{face}</text>}</g>;
}
function Cards({ cards, y }: { readonly cards: readonly (string | number)[]; readonly y: number }) {
  return <g>{cards.slice(-7).map((card,i)=><Card key={`${card}:${cards.slice(0,i).filter(c=>c===card).length}`} x={160-Math.min(7,cards.length)*39/2+i*39} y={y} value={card} />)}</g>;
}
function CardScene({ game, s, externalSeats }: { readonly game: string; readonly s: State; readonly externalSeats: boolean }) {
  if (game === "blackjack") return <g><Label y={28}>Dealer</Label><Cards cards={read(s,"dealer_hand",[])} y={36} /><Label y={122}>Player</Label><Cards cards={read(s,"player_hand",[])} y={132} /></g>;
  const counts=read<Record<string,number>>(s,"hand_counts",{}),trick=read<readonly Play[]>(s,"current_trick",[]),history=read<readonly {cards?:readonly Play[];winner?:string}[]>(s,"trick_history",read(s,"history",[]));
  let cards:readonly (string|number)[]=[], zone="Discard";
  if (game.includes("holdem")) { cards=read(s,"board",[]);zone=`${read(s,"street","")} · pot ${read(s,"pot",0)}`; }
  else if (["bridge","hearts","spades","euchre"].includes(game)) { const completed=history.at(-1);cards=(trick.length?trick:completed?.cards??[]).map(v=>v.card);zone=trick.length?`Trick · ${trick.map(v=>seat(v.player)).join(" → ")}`:completed?.winner?`Trick won by ${seat(completed.winner)}`:"Awaiting lead"; }
  else if (game==="mahjong") { cards=read<readonly {tile:string}[]>(s,"discard_pile",[]).map(v=>v.tile);zone=`Discards · wall ${read(s,"wall_count",0)}`; }
  else if (game==="dou-dizhu") { const play=read<{cards:readonly string[];player:string}|null>(s,"last_play",null);cards=play?.cards??[];zone=play?`${seat(play.player)} played`:`Landlord ${seat(read(s,"landlord",""))}`; }
  else if (game==="gin-rummy") { cards=[read(s,"discard_top","")];zone=`${read(s,"phase","")} · deck ${read(s,"deck_count",0)}`; }
  else if (game==="cribbage") { cards=[read(s,"starter","")];zone="Starter · discard two to the crib"; }
  else if (game==="hanabi") { cards=Object.entries(read<Record<string,number>>(s,"fireworks",{})).map(([color,n])=>`${n}${color}`);zone=`Fireworks · ${read(s,"clues",0)} clues · ${read(s,"lives",0)} lives`; }
  else { cards=[read(s,"discard","")];zone=`Discard · deck ${read(s,"deck_count",0)}`; }
  const seats=Object.keys(counts).length?Object.entries(counts):Object.entries(read<Record<string,number>>(s,"stacks",{}));
  return <g>{!externalSeats && <rect x={14} y={62} width={292} height={116} rx={40} className="st-legal-square" />}<Label y={87}>{zone}</Label><Cards cards={cards} y={100} />{!externalSeats && seats.map(([p,n],i)=>{const x=320/(seats.length+1)*(i+1);return <g key={p}>{(!Object.keys(counts).length || n>0)&&<Card x={x-17} y={i%2?162:12} back />}<Label x={x} y={i%2?220:9}>{seat(p)} · {Object.keys(counts).length?`${n} cards`:`${n} chips`}</Label></g>;})}{game==="bridge"&&<Label y={60}>Contract {read(s,"contract",{level:0,strain:""}).level}{read(s,"contract",{level:0,strain:""}).strain}</Label>}{game==="euchre"&&<Label y={60}>Trump · {read<string|null>(s,"trump",null)??"uncalled"} · upcard {read(s,"upcard","")}</Label>}</g>;
}

function SocialScene({ game, s }: { readonly game: string; readonly s: State }) {
  if (game==="bargaining" || game==="negotiation") {
    const offer=read<Record<string,string|number>|null>(s,"last_offer",null),share=Number(offer?.player_1_share??50);
    return <g><Label y={60}>{offer?`${seat(String(offer.player))} offers`:"Awaiting offer"}</Label>{game==="bargaining"?<><rect x={40} y={98} width={240*share/100} height={36} className="st-legal-agent" /><rect x={40+240*share/100} y={98} width={240*(100-share)/100} height={36} className="st-legal-pit" /><Label y={162}>P1 {share} / P2 {100-share}</Label></>:<><Label y={113}>Price · {offer?.price??"—"}</Label><Label y={146}>Delivery · {offer?.delivery??"—"}</Label></>}</g>;
  }
  if (game==="liars-dice") {
    const bid=read<{count:number;face:number}|null>(s,"current_bid",null),dice=read<Record<string,readonly number[]>>(s,"revealed_dice",{});
    return <g><Label y={50}>{bid?`Bid · ${bid.count} × face ${bid.face}`:"Make a bid"}</Label>{["player_1","player_2"].map((p,i)=><g key={p}><Label y={86+i*80}>{seat(p)} · {dice[p]?"revealed":"concealed"}</Label>{Array.from({length:5},(_,j)=><g key={j}><rect x={58+j*43} y={94+i*80} width={31} height={31} rx={5} className="st-legal-card" /><Label x={73+j*43} y={115+i*80}>{dice[p]?.[j]??"?"}</Label></g>)}</g>)}</g>;
  }
  if (game==="goofspiel") {
    const rounds=read<readonly {bids?:Record<string,number>;prize?:number;winner?:string|null}[]>(s,"round_history",[]),last=rounds.at(-1);
    return <g><Label y={44}>Prize · {read<number|null>(s,"current_prize",null)??"complete"}</Label>{["player_1","player_2"].map((p,i)=><g key={p}><Label x={95+i*130} y={80}>{seat(p)} · {read<Record<string,number>>(s,"points",{})[p]} points</Label><Card x={78+i*130} y={96} value={last?.bids?.[p]} back={!last} /></g>)}<Label y={180}>{last?`Previous prize ${last.prize} · ${last.winner?seat(last.winner):"tied"}`:"Choose sealed bids 1–5"}</Label></g>;
  }
  const reveals=read<Record<string,string|number>>(s,game==="first-price-sealed-bid-auction"?"revealed_bids":"revealed_actions",{});
  return <g>{["player_1","player_2"].map((p,i)=><g key={p}><Label x={90+i*140} y={52}>{seat(p)}</Label><rect x={40+i*140} y={76} width={100} height={92} rx={12} className="st-legal-square" /><Label x={90+i*140} y={128}>{reveals[p]??"Sealed"}</Label></g>)}<Label y={197}>{game==="first-price-sealed-bid-auction"?"Highest bid pays its own bid":game==="rock-paper-scissors"?"Reveal together":"Simultaneous choices"}</Label></g>;
}
