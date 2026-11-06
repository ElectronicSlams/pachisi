import assert from 'node:assert/strict';
import {test} from 'node:test';
import {CONNECT_FOUR_DESIGNS, CONNECT_FOUR_LAYOUTS, resolveConnectFourVariant} from '../dist/game/connect-four-designs.js';
import {drop, newRound} from '../catalogue/connect-four-round';

test('all registered C4 choices resolve to unique stable links and reject unavailable combinations',()=>{
  const keys=new Set<string>();
  for(const {id} of CONNECT_FOUR_DESIGNS) for(const layout of CONNECT_FOUR_LAYOUTS) {
    const choice=resolveConnectFourVariant(id,layout);
    assert.ok(choice.ok);
    assert.ok(!keys.has(choice.id));keys.add(choice.id);
  }
  assert.equal(resolveConnectFourVariant('design-2','arena').id,'connect-four-design-2-variant-arena');
  assert.equal(resolveConnectFourVariant('design-999','arena').reason,'unknown-design');
  assert.equal(resolveConnectFourVariant('design-2','arena-table').reason,'unsupported-presentation');
});

test('local two-player board obeys gravity, detects horizontal, vertical and both diagonal lines, and locks terminal rounds',()=>{
  for(const moves of [[0,1,0,1,0,1,0],[0,0,1,1,2,2,3],[0,1,1,2,5,2,2,3,5,3,6,3,3],[6,5,5,4,1,4,4,3,1,3,0,3,3]]) {
    let round=newRound();
    for(const column of moves) {
      assert.equal(round.finished,false);
      const next=drop(round,column);
      const index=next.frame.last![0]!;
      assert.equal(next.frame.cells[index],round.next);
      assert.ok(index+7>=42 || round.frame.cells[index+7]!=='.');
      round=next;
    }
    assert.equal(round.frame.line?.length,4);
    assert.equal(round.finished,true);
    assert.equal(drop(round,0),round);
  }
  const fullColumn=[3,3,3,3,3,3].reduce(drop,newRound());
  for(const invalid of [3,-1,7,NaN,0.5]) assert.equal(drop(fullColumn,invalid),fullColumn);
});
