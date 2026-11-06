import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import collection from '../catalogue/public-design-sources.json';
import selection from '../reference/public-games/SOURCES.json';
import manifest from '../reference/public-games/MANIFEST.json';
import coverage from '../docs/game-coverage.json';
import pkg from '../package.json';

// Reference JSON is data; no upstream source module is imported or executed.
test('public design library maps exactly all 50 games and preserves coverage boundaries',()=>{
 assert.deepEqual(collection.games.map(g=>g.slug).sort(),coverage.games.map(g=>g.slug).sort());
 assert.equal(new Set(collection.sources.map(s=>s.id)).size,collection.sources.length);
 for(const game of collection.games){
  assert.ok(game.sourceIds.length>0,game.slug);
  for(const id of game.sourceIds) assert.ok(collection.sources.some(s=>s.id===id&&s.games.includes(game.slug)),`${game.slug}:${id}`);
  assert.ok(game.coverageNote.length>40);
 }
 assert.match(collection.games.find(g=>g.slug==='goofspiel')!.coverageNote,/No dedicated licensed graphical/);
 assert.match(collection.games.find(g=>g.slug==='bridge')!.coverageNote,/Play-phase dummy/);
 assert.match(collection.games.find(g=>g.slug==='backgammon')!.ruleVariantNote!,/5 checkers/);
});

test('all imported files match pinned provenance and declared credential redactions',async()=>{
 assert.equal(manifest.files.length,selection.sources.reduce((n,s)=>n+s.files.length,0));
 assert.equal(collection.summary.files,manifest.files.length);
 for(const entry of manifest.files){
  const bytes=await readFile(entry.path);
  assert.equal(bytes.length,entry.bytes,entry.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.path);
  const upstream=selection.sources.find(s=>s.id===entry.sourceId)!.files.find(f=>f.path===entry.upstreamPath)!;
  assert.equal(entry.gitBlob,upstream.gitBlob,entry.path);
  if(upstream.redaction){
   assert.equal(entry.sourceId,'mreishus--spades');assert.equal(entry.upstreamPath,'README.md');
   assert.equal(entry.modified,true);assert.equal(entry.redaction,'mailgun-api-key');
   assert.equal(entry.sha256,upstream.redaction.sha256);assert.equal(entry.bytes,upstream.redaction.bytes);
   assert.equal(bytes.toString().split('REDACTED_MAILGUN_API_KEY').length-1,2);
   assert.equal(upstream.redaction.occurrences,2);
   assert.doesNotMatch(bytes.toString(),/\b(?:key-[0-9a-fA-F]{32}|[0-9a-fA-F]{32}-[0-9a-fA-F]{8}-[0-9a-fA-F]{8})\b/);
  }else{
   assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),entry.gitBlob,entry.path);
   assert.equal(entry.modified,false);
  }
 }
});

test('every source has a full pin, original license and matching authored catalogue metadata',()=>{
 for(const source of selection.sources){
  assert.match(source.commit,/^[a-f0-9]{40}$/);
  assert.ok(source.files.some(f=>/^(licen[sc]e|copying)(\..*)?$/i.test(f.path)),source.id);
  const item=collection.sources.find(s=>s.id===source.id)!;
  assert.equal(item.commit,source.commit);assert.equal(item.license,source.license);assert.equal(item.fileCount,source.files.length);
  if(source.license.includes('GPL'))assert.equal(item.reuse,'copyleft');
 }
 assert.ok(!pkg.files.some(p=>p.startsWith('reference')),'reference sources must stay outside the package');
});

test('archived SVGs contain no scripts, foreign objects or external media references',async()=>{
 const svgs=manifest.files.filter(f=>f.path.endsWith('.svg'));assert.equal(svgs.length,148);
 for(const f of svgs){const text=await readFile(f.path,'utf8');assert.doesNotMatch(text,/<\s*(script|foreignObject|image)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:|javascript:)/i,f.path);}
});
