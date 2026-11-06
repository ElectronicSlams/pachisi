// Exercise painted pieces, disclosure boundaries and the accessible controls in the shipped catalogue.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export async function reviewGameSurfaces(browser, origin) {
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 try {
  const page=await context.newPage();
  await page.goto(origin+'/?game=connect-four#game-variants');
  const game=page.getByLabel('Game to inspect');
  const replay=page.locator('.st-game-replay');
  const slugs=await game.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value));
  let looks=0;
  for(const slug of slugs) {
   await game.selectOption(slug);
   await replay.getByRole('button',{name:'Last',exact:true}).click();
   const designs=page.getByLabel(slug==='connect-four'?'Board design':'Selected design',{exact:true});
   const options=await designs.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value));
   const hashes=new Set();
   for(const id of options) {
    await designs.selectOption(id);
    const scene=replay.locator('.st-legal-board,.st-legal-svg-scene > svg').first();
    await scene.evaluate(el=>Promise.all([...el.querySelectorAll('img')].map(img=>img.decode())));
    const hash=createHash('sha256').update(await scene.screenshot()).digest('hex');
    assert.ok(!hashes.has(hash),slug+' has identical painted boards at '+id);
    hashes.add(hash);looks++;
   }
  }
  for(const motion of ['reduce','no-preference']) {
   await page.emulateMedia({reducedMotion:motion});
   await page.goto(origin+'/?game=connect-four&design=design-3&presentation=arena#game-variants');
   const panels=page.locator('[data-presentation-preview]');
   assert.equal(await panels.count(),4);
   for(const delay of [0,650]) {
    if(delay) await page.waitForTimeout(delay);
    const faults=await panels.evaluateAll(nodes=>nodes.flatMap(panel=>{
     const cells=[...panel.querySelectorAll('.st-disc')];if(cells.length!==7)return ['missing discs'];
     return cells.flatMap(disc=>{
      const p=disc.getBoundingClientRect(),s=disc.parentElement.getBoundingClientRect();
      const x=p.x+p.width/2,y=p.y+p.height/2;
      return x<s.left||x>s.right||y<s.top||y>s.bottom?[panel.dataset.presentationPreview]:[];
     });
    }));
    assert.deepEqual(faults,[],motion+' settled positions');
   }
  }
  for(const slug of ['goofspiel','first-price-sealed-bid-auction','prisoners-dilemma','rock-paper-scissors','bridge','pentago','car-racing']) {
   await game.selectOption(slug);
   await replay.getByRole('button',{name:'Next',exact:true}).tap();
   const inspect=replay.locator('summary');await inspect.focus();await page.keyboard.press('Enter');
   const details=replay.locator('details');assert.ok(await details.getAttribute('open')!==null);
   if(slug==='bridge') {
    const info=await details.innerText();for(const fact of ['level 3','strain D','2C','P2 12'])assert.ok(info.includes(fact),fact);
   } else if(['pentago','car-racing'].includes(slug)) {
    assert.ok(await replay.locator(slug==='pentago'?'.st-pentago-move':'[data-road-camera]').count());
   } else {
    assert.match(await replay.locator('.st-replay-status').innerText(),/sealed choice/);
    if(slug==='goofspiel')assert.match(await replay.locator('.st-replay-board').innerText(),/Committed/);
    await replay.getByRole('button',{name:'Next',exact:true}).tap();
    const text=await details.innerText();
    assert.match(text,slug==='goofspiel'?/bids P1 1 · P2 5/:slug==='rock-paper-scissors'?/P1 rock/:slug==='prisoners-dilemma'?/P1 cooperate/:/P1 7/);
   }
  }
  return {games:slugs.length,distinctPaintedDesigns:looks,settledPlacements:4,motionPreferences:2,publicPositionInspection:true};
 } finally {await context.close();}
}
