import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import census from '../catalogue/local-game-design-census.json';
import {gameDesigns,gamePresentations,resolveGameVariant} from '../dist/game/designs.js';
import {GAME_DEMONSTRATIONS} from '../dist/game/demos.js';
import {LegalDemonstration} from '../dist/game/scene.js';

test('each published game/edition combination resolves and renders an actual frame',()=>{
  const slugs=Object.keys(GAME_DEMONSTRATIONS).sort();
  assert.deepEqual(census.games.map(game=>game.slug).sort(),slugs);
  const ids=new Set<string>();
  for(const game of census.games){
    const looks=gameDesigns(game.slug);
    assert.deepEqual(looks.map(s=>s.name),game.shipped);
    assert.equal(gamePresentations(game.slug).includes('arena-table'),['bridge','crazy-eights','cribbage','dou-dizhu','euchre','gin-rummy','hanabi','hearts','leduc-holdem','limit-texas-holdem','mahjong','no-limit-texas-holdem','shedding-card-game','spades'].includes(game.slug));
    for(const look of looks) for(const presentation of gamePresentations(game.slug)){
      const selection=resolveGameVariant(game.slug,look.id,presentation);
      assert.ok(selection.ok);assert.ok(!ids.has(selection.id));ids.add(selection.id);
      const frame=GAME_DEMONSTRATIONS[game.slug]!.frames.at(-1)!;
      const html=renderToStaticMarkup(<LegalDemonstration game={game.slug} design={look.id} frame={frame} externalSeats={presentation==='arena-table'}/>);
      assert.doesNotMatch(html,/NaN|Infinity|data-scene-state="unavailable"/,selection.id);
      if(game.slug==='go'&&look.name==='Porcelain')assert.match(html,/stone_(?:-1|1)\.svg/);
    }
  }
  assert.deepEqual(gameDesigns('unknown'),[]);
  assert.equal(resolveGameVariant('chess','design-20','arena').ok,false);
});

test('native census samples are byte-identical and shared captures are explicitly identified',async()=>{
  const seen=new Map<string,string[]>();
  for(const game of census.games){
    const n=game.native;if(!n)continue;
    const [original,preview]=await Promise.all([readFile(n.source),readFile('catalogue/public/'+n.image)]);
    assert.deepEqual(original,preview);
    assert.equal(createHash('sha256').update(preview).digest('hex'),n.sha256);
    seen.set(n.sha256,[...(seen.get(n.sha256)??[]),game.slug]);
  }
  assert.equal(seen.size,census.summary.distinctNativeSamples);
  for(const g of census.games)if(g.native)assert.deepEqual([...g.native.sameImageGames].sort(),seen.get(g.native.sha256)!.sort());
});
