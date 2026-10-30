import React from "react";
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Callout, EmptyState, ErrorState, GameGlyph, GameTile, ModelChip, RoleBadge, StadiumDate, StatusStrip } from '../dist/index.js';
import { Tabs, Field, PasswordField } from '../dist/client.js';
import { Board } from '../dist/game/board.js';
import { GAME_ICON_SLUGS } from '../dist/game/icon-catalogue.js';
import { GAME_ANIMATIONS } from '../dist/game/catalogue.js';
import { GAME_DEMONSTRATIONS, demonstrationFor } from '../dist/game/demos.js';
import { LegalDemonstration } from '../dist/game/scene.js';
import { resolveThemePreference, readThemePreference } from '../dist/theme.js';
import type { CellBoardFrame } from '../dist/game/board-types.js';

const render = renderToStaticMarkup;
test('portable Button preserves native, external, mail and local link semantics',()=>{
 assert.match(render(<Button>Play</Button>),/type="button"/);
 assert.match(render(<Button type="submit" disabled>Send</Button>),/disabled=""/);
 const local=render(<Button href="/arena">Play</Button>); assert.match(local,/<a/);assert.doesNotMatch(local,/prefetch=|target=/);
 assert.match(render(<Button href="https://example.com">Source</Button>),/target="_blank"/);
 assert.doesNotMatch(render(<Button href="mailto:example@example.com">Email</Button>),/target=/);
});
test('fields connect labels, descriptions and errors with unique IDs',()=>{
 const html=render(<><Field label="First" description="Hint"/><Field label="Second" error="Required"/></>);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]); assert.equal(new Set(ids).size,ids.length);
 assert.match(html,/aria-invalid="true"/); assert.match(html,/aria-describedby=/); assert.match(html,/for=/);
 assert.match(render(<PasswordField label="Password"/>),/type="password"/);
});
test('two tabsets never emit duplicate IDs',()=>{
 const tabs=<Tabs ariaLabel="Options" items={[{value:'a',label:'A'},{value:'b',label:'B'}]} value="a" onValueChange={()=>{}}/>;
 const html=render(<>{tabs}{tabs}</>);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]); assert.equal(ids.length,4);assert.equal(new Set(ids).size,4);
});
test('game tiles preserve disabled and pressed state',()=>{
 assert.match(render(<GameTile slug="chess" name="Chess" variant="standard" active onSelect={()=>{}}/>),/aria-pressed="true"/);
 const soon=render(<GameTile slug="chess" name="Chess" variant="standard" comingSoon href="/bad"/>); assert.match(soon,/aria-disabled="true"/);assert.doesNotMatch(soon,/href=/);
});
test('model identity is supplied by the host without catalogue/network dependencies',()=>{
 const html=render(<ModelChip identity={{id:'sample/model',name:'Example',providerName:'Sample Lab',providerSlug:'sample',markUrl:null}} display="stacked" outcome="winner"/>);
 assert.match(html,/Example/);assert.match(html,/SL/);assert.match(html,/winner/);
});
test('states and role decoration never imply permissions',()=>{
 assert.match(render(<Callout tone="danger">Failed</Callout>),/role="alert"/);
 assert.match(render(<ErrorState title="Unavailable"/>),/role="alert"/);
 assert.match(render(<EmptyState title="Nothing yet"/>),/Nothing yet/);
 assert.match(render(<RoleBadge roleName={null}/>),/No access/);
});
test('date and status rendering stays truthful and deterministic',()=>{
 const now=Date.parse('2026-10-29T12:00:00Z');
 assert.equal(render(<StadiumDate value="invalid" now={now}/>),'');
 const date=render(<StadiumDate value="2026-06-26" now={now}/>);assert.match(date,/26 Jun 2026/);assert.match(date,/datetime=/i);
 assert.doesNotMatch(render(<StatusStrip lastMatchAt="2026-06-26" now={now}/>),/Live now/);
 assert.match(render(<StatusStrip/>),/No matches played yet/);
});
test('light/dark/system theme preference works without DOM access',()=>{
 assert.equal(resolveThemePreference('system',true),'dark'); assert.equal(resolveThemePreference('light',true),'light');
 assert.equal(readThemePreference({getItem:()=>{throw Error('blocked')}}),'system');
 assert.equal(readThemePreference({getItem:()=> 'invalid'}),'system');
});
test('all 50 icons and demos share exact catalogue identities',()=>{
 assert.equal(GAME_ICON_SLUGS.length,50); assert.equal(Object.keys(GAME_ANIMATIONS).length,50);
 assert.deepEqual([...GAME_ICON_SLUGS].sort(),Object.keys(GAME_DEMONSTRATIONS).sort());
 for(const slug of GAME_ICON_SLUGS){
  assert.match(render(<GameGlyph slug={slug}/>),new RegExp(`data-game-icon="${slug}"`));
  const demo=demonstrationFor(slug)!;assert.ok(demo.frames.length>1);assert.equal(demo.frames.length,demo.actions.length+1);
 }
 for(const slug of ['unknown','__proto__','constructor'])assert.equal(demonstrationFor(slug),null);
});
test('every bundled demonstration frame renders with finite geometry',()=>{
 let count=0;
 for(const [game,demo] of Object.entries(GAME_DEMONSTRATIONS))for(const frame of demo.frames){
  const html=render(<LegalDemonstration game={game} frame={frame}/>);assert.ok(html.length>0,game);assert.doesNotMatch(html,/NaN|Infinity/,`${game} turn ${frame.turn}`); count++;
 }
 assert.equal(count,722);
});
test('actual Board never mutates, advances or substitutes a demo for supplied state',()=>{
 const frame:CellBoardFrame=Object.freeze({kind:'cells',family:'grid_3x3',rows:3,cols:3,cells:Object.freeze(['O','.','.','.','X','.','.','.','.']),last:Object.freeze([4])});
 const before=JSON.stringify(frame);const html=render(<Board frame={frame} label="Recorded turn 2"/>);
 assert.equal(render(<Board frame={frame} label="Recorded turn 2"/>),html);assert.equal(JSON.stringify(frame),before);
 assert.equal((html.match(/class="st-xo st-xo-x"/g)||[]).length,1);assert.doesNotMatch(html,/game animation|data-preview-active/);
});
test('built root is importable in a browser-free ESM consumer',async()=>{
 const pkg=await import('../dist/index.js');assert.equal(typeof pkg.Button,'function');
 const code=await readFile(new URL('../dist/index.js',import.meta.url),'utf8');assert.doesNotMatch(code,/game-demonstrations|next\/|use client/);
 const client=await readFile(new URL('../dist/client.js',import.meta.url),'utf8');assert.match(client,/^"use client";/);
});
test('canonical theme/brand bytes remain unchanged',async()=>{
 const {createHash}=await import('node:crypto');const manifest=JSON.parse(await readFile(new URL('../SOURCE_MANIFEST.json',import.meta.url),'utf8'));
 for(const file of manifest.files.filter((x:{target:string})=>x.target==='styles/tokens.css'||x.target.startsWith('assets/'))){
  let bytes:Buffer|string=await readFile(new URL('../'+file.target,import.meta.url));
  // tokens.css may carry one delimited additive block; everything else must stay byte-identical to the source.
  if(file.target==='styles/tokens.css')bytes=bytes.toString('utf8').replace(/\n\/\* BEGIN pachisi additive tokens[\s\S]*?\/\* END pachisi additive tokens \*\/\n/u,'');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sourceSha256,file.target);
 }
});
test('per-game documentation stays synchronized with the shipped dataset',async()=>{
 const {createHash}=await import('node:crypto');const coverage=JSON.parse(await readFile(new URL('../docs/game-coverage.json',import.meta.url),'utf8'));
 assert.deepEqual(coverage.games.map((x:{slug:string})=>x.slug).sort(),[...GAME_ICON_SLUGS].sort());
 for(const game of coverage.games){const demo=GAME_DEMONSTRATIONS[game.slug]!;assert.equal(game.demoFrames,demo.frames.length);assert.equal(game.demoActions,demo.actions.length);assert.equal(game.artworkArenaVersion,demo.version);}
 const bytes=await readFile(new URL('../src/game/game-demonstrations.json',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),coverage.artworkSource.dataSha256);
});
