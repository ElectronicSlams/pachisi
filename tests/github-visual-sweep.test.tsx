import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import sweep from '../catalogue/github-visual-sweep.json';
import coverage from '../docs/game-coverage.json';
import manifest from '../reference/github-visual-sweep/MANIFEST.json';

test('every game has a fresh search trail and at least one curated pinned visual source',async()=>{
  const ledger=JSON.parse(gunzipSync(await readFile('docs/research/github-visual-sweep/discovery.json.gz')).toString());
  const paths=new Map(manifest.files.map(file=>[file.path,file]));
  assert.deepEqual(sweep.games.map(g=>g.slug).sort(),coverage.games.map(g=>g.slug).sort());
  assert.equal(ledger.repositories.length,sweep.summary.distinctCandidates);
  assert.equal(ledger.queries.length,sweep.summary.queries);
  for(const game of sweep.games){
    const searches=ledger.queries.filter((q:{game:string})=>q.game===game.slug);
    assert.equal(searches.length,3);
    const unique=new Set(searches.flatMap((q:{pages:{repositories:number[]}[]})=>q.pages.flatMap(p=>p.repositories)));
    assert.equal(unique.size,game.candidates);assert.ok(game.findings.length>0);
    for(const source of game.findings){
      assert.match(source.commit,/^[0-9a-f]{40}$/);
      const url=new URL(source.sourceUrl);
      assert.equal(url.origin,'https://github.com');
      assert.equal(decodeURIComponent(url.pathname),`/${source.repository}/blob/${source.commit}/${source.file}`);
      if(source.localPath) assert.equal(paths.get(source.localPath)?.upstreamPath,source.file);
      else assert.ok(source.linkReason);
      if(source.previewUrl)assert.ok(source.visualNote);
    }
  }
});
