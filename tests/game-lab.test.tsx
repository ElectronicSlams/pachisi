import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { GAME_ANIMATIONS } from '../dist/game/catalogue.js';
import { GAME_DEMONSTRATIONS } from '../dist/game/demos.js';
import { LegalDemonstration } from '../dist/game/scene.js';
import { GameReplay, GameAnimation } from '../dist/game/demo.js';
import { GAME_STUDIES } from '../catalogue/studies';
import { GAME_NOTES } from '../catalogue/game-notes';

const study = (id: string) => GAME_STUDIES.find(s=>s.id===id)!;
const html = (id: string, i = 0, externalSeats = false) => { const s=study(id);return render(<LegalDemonstration game={s.game} frame={s.demo.frames[i]!} previous={s.demo.frames[i-1]} externalSeats={externalSeats}/>); };
const attr=(tag:string,k:string)=>Number(new RegExp(`\\b${k}="([^"]+)"`).exec(tag)![1]);

test('table presentation falls back to a complete arena for non-table games',()=>{
 for(const game of ['connect-four','chess','go','blackjack','cartpole']) {
  const out=render(<GameAnimation game={game} gameName={game} presentation="arena-table"/>);
  assert.match(out,/data-presentation="arena"/);assert.doesNotMatch(out,/data-presentation="arena-table"/);
 }
 assert.match(render(<GameAnimation game="limit-texas-holdem" gameName="Poker" presentation="arena-table"/>),/data-presentation="arena-table"/);
});

test('each game has an individual inspection and variant review; every authored frame renders',()=>{
 assert.deepEqual(Object.keys(GAME_NOTES).sort(),Object.keys(GAME_ANIMATIONS).sort());
 assert.equal(new Set(GAME_STUDIES.map(s=>s.id)).size,GAME_STUDIES.length);
 assert.ok(GAME_STUDIES.length>=30);
 for(const s of GAME_STUDIES) for(let i=0;i<s.demo.frames.length;i++) {
  assert.match(s.demo.version,/^authored:/);
  const out=html(s.id,i);
  assert.doesNotMatch(out,/NaN|Infinity|data-scene-state="unavailable"|Unsupported board/,`${s.id}:${i}`);
 }
});

test('replay is available from client demo entry, paused initially and ends explicitly',()=>{
 const out=render(<GameReplay game="chess" gameName="Chess"/>);
 assert.match(out,/data-replay-playing="false"/);assert.match(out,/data-replay-frame="0"/);
 assert.match(out,/aria-label="Replay frame"/);assert.match(out,/Initial position/);
 assert.match(render(<GameReplay game="unknown" gameName="Unknown"/>),/Replay unavailable/);
});

test('tall grid fits within the scene in both dimensions',()=>{
 const rects=html('lake-20').match(/<rect [^>]+>/g)!;
 for(const r of rects) {
  assert.ok(attr(r,'x')>=0 && attr(r,'x')+attr(r,'width')<=320);
  assert.ok(attr(r,'y')>=0 && attr(r,'y')+attr(r,'height')<=214);
 }
});

test('walker feet contact the terrain at their actual x coordinates for both step phases',()=>{
 for(const i of [0,1]) {
  const terrain=study('walker-slope').demo.frames[i]!.state.terrain_window as number[];
  for(const tag of html('walker-slope',i).match(/<path data-foot[^>]+>/g)!) {
   const x=attr(tag,'data-contact-x'),y=attr(tag,'data-contact-y'),u=x/64,lo=Math.floor(u),t=u-lo;
   assert.ok(Math.abs(y-(187-(terrain[lo]!*(1-t)+terrain[lo+1]!*t)*15))<1e-9);
  }
 }
});

test('shared-cell hockey preserves both seats at one coordinate and changes only possession',()=>{
 for(const i of [0,1]) {
  const out=html('hockey-shared',i);
  assert.equal((out.match(/data-shared-cell="true"/g)??[]).length,2);
  assert.equal((out.match(/data-world-x="1"/g)??[]).length,2);
  assert.match(out,new RegExp(`data-puck-owner="player_${i+1}"`));
  assert.match(out,/data-skater="player_1"/);assert.match(out,/data-skater="player_2"/);
 }
});

test('blackjack conceals exactly one dealer slot during play and reveals only supplied terminal cards',()=>{
 const d=GAME_DEMONSTRATIONS.blackjack!;
 const start=render(<LegalDemonstration game="blackjack" frame={d.frames[0]!}/>);
 const end=render(<LegalDemonstration game="blackjack" frame={d.frames.at(-1)!}/>);
 assert.equal((start.match(/data-hidden-count="1"/g)??[]).length,1);
 assert.doesNotMatch(end,/data-hidden-count="1"/);
});

test('long card rows disclose omitted history and avoid duplicate keys',()=>{
 const out=html('mahjong-long');assert.match(out,/\+5 earlier · 12 total/);assert.match(out,/data-card-count="12"/);
 assert.match(html('doudizhu-long'),/\+3 earlier · 10 total/);
});

test('external table seats never crop non-table scenes',()=>{
 for(const id of ['shooter-edges','hockey-shared','walker-slope','lander-contact'])assert.match(html(id,0,true),/viewBox="0 0 320 240"/);
 assert.match(html('limit-texas-holdem-fold',0,true),/viewBox="0 42 320 158"/);
});

test('special chess studies preserve all changed squares and terminal lines',()=>{
 assert.equal((html('chess-castle',1).match(/data-last="true"/g)??[]).length,4);
 assert.equal((html('chess-en-passant',1).match(/data-last="true"/g)??[]).length,3);
 assert.equal((html('chess-promotion',1).match(/data-last="true"/g)??[]).length,2);
 assert.equal((html('gomoku-five',1).match(/data-line="true"/g)??[]).length,5);
});

test('spectator actions conceal sealed submissions before reveal',()=>{
 for(const slug of ['rock-paper-scissors','prisoners-dilemma','first-price-sealed-bid-auction','goofspiel']){
  const demo=GAME_DEMONSTRATIONS[slug]!;
  assert.equal(demo.actions[0]!.action,'sealed choice',slug);
  assert.ok(demo.frames[1]!.caption.includes('sealed choice'));
 }
});

test('the public table preserves game identity in standalone and host-seat views',()=>{
 for(const externalSeats of [false,true]){
  const scene=(game:string)=>render(<LegalDemonstration game={game} externalSeats={externalSeats} frame={GAME_DEMONSTRATIONS[game]!.frames.at(-1)!}/>);
  assert.match(scene('dou-dizhu'),/Landlord P2 · P1 played/);
  assert.match(scene('mahjong'),/data-mahjong-tile="B3"/);
  assert.doesNotMatch(scene('mahjong'),/\d+ cards/);
  assert.match(scene('cribbage'),/Showdown · starter/);
  assert.doesNotMatch(scene('cribbage'),/discard two to the crib/);
 }
});

test('complete Pentago, Goofspiel and Racing recordings exercise their defining transitions',()=>{
 const p=GAME_DEMONSTRATIONS.pentago!,final=p.frames.at(-1)!;
 assert.equal(final.outcomeReason,'five_in_a_row');
 assert.deepEqual(new Set(p.frames.slice(1).map(f=>f.placement?.direction)),new Set(['cw','ccw']));
 const html=render(<LegalDemonstration game="pentago" design="design-4" frame={final} previous={p.frames.at(-2)}/>);
 assert.match(html,/stone_1.svg/);assert.match(html,/stone_-1.svg/);
 assert.match(html,/st-pentago-move/);assert.ok((html.match(/data-line="true"/g)??[]).length>=5);
 const g=GAME_DEMONSTRATIONS.goofspiel!;
 for(let turn=1;turn<g.frames.length;turn++){
  const out=render(<LegalDemonstration game="goofspiel" frame={g.frames[turn]!}/>);
  assert.match(out,turn%2?/Committed/:/Revealed prize/);
  assert.equal((out.match(/class="st-legal-card-back"/g)??[]).length,turn%2?2:0);
 }
 const c=GAME_DEMONSTRATIONS['car-racing']!;
 assert.equal(c.frames.at(-1)!.outcomeReason,'lap_complete');
 for(const action of ['accelerate','brake','left','right'])assert.ok(c.actions.some(a=>a.action===action));
});
