import { reviewGameSurfaces } from './browser-review.mjs';
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=Number(process.env.PACHISI_TEST_PORT??4173);
const origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','catalogue','--outDir','../catalogue-dist','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
let browser;
const reports=[];
try{
 for(let n=0;n<100;n++){
  if(server.exitCode!==null)throw Error(`Preview failed: ${logs}`);
  try{const res=await fetch(origin);if(res.ok)break;}catch{}
  if(n===99)throw Error(`Preview did not start: ${logs}`);
  await new Promise(r=>setTimeout(r,100));
 }
 const options={headless:true};if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)options.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
 browser=await chromium.launch(options);
 await mkdir('artifacts/browser',{recursive:true});
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport,colorScheme:theme,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];const external=[];
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(origin)||url.startsWith('data:'))return route.continue();external.push(url);return route.abort();});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.getByLabel('Appearance',{exact:true}).selectOption(theme);
  assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
  assert.equal(await page.locator('[data-game]').count(),50);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
  await page.screenshot({path:`artifacts/browser/catalogue-${viewport.width}-${theme}.png`,fullPage:true});
  await page.getByRole('tab',{name:'Overview',exact:true}).focus();await page.keyboard.press('ArrowRight');
  await page.getByTestId('tab-value').filter({hasText:'details'}).waitFor();
  await page.keyboard.press('ArrowRight');await page.getByTestId('tab-value').filter({hasText:'overview'}).waitFor();
  const open=page.getByRole('button',{name:'Open dialog',exact:true});await open.click();
  const dialog=page.getByRole('dialog',{name:'A reusable dialog'});await dialog.waitFor({state:'visible'});
  await dialog.getByLabel('Example field').click();assert.equal(await dialog.isVisible(),true,'inside click must not close');
  for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true,'dialog focus escaped');}
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await open.evaluate(el=>document.activeElement===el),true,'focus did not return');
  await page.getByRole('button',{name:'Open sheet',exact:true}).click();const sheet=page.getByRole('dialog',{name:'A Stadium sheet'});await sheet.waitFor({state:'visible'});await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden'});
  const password=page.getByLabel('Password',{exact:true});assert.equal(await password.getAttribute('type'),'password');
  await page.getByRole('button',{name:/show password/i}).click();assert.equal(await password.getAttribute('type'),'text');
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked')}}});});
  await page.getByRole('button',{name:'Copy',exact:true}).first().click();await page.getByRole('button',{name:'Copy failed',exact:true}).waitFor();
  await page.getByRole('button',{name:'Copy',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Copy failed',exact:true}).count(),2);
  await page.getByLabel('Game category').selectOption('RL');assert.equal(await page.locator('[data-game]').count(),12);await page.getByLabel('Game category').selectOption('All');
  await page.getByLabel('Selected game',{exact:true}).selectOption('connect-four');
  await expect(page.getByLabel('Presentation',{exact:true}).locator('option[value="arena-table"]')).toHaveAttribute('disabled','');
  await page.getByLabel('Game category').selectOption('Card');
  await expect(page.getByLabel('Selected game',{exact:true})).not.toHaveValue('connect-four');
  assert.equal(await page.locator('.catalogue-stage h3').textContent(),await page.getByLabel('Selected game',{exact:true}).locator('option:checked').textContent());
  await page.getByLabel('Find a game').fill('no-such-game');assert.equal(await page.locator('.catalogue-stage').count(),0);
  await page.getByText('No games match these filters.',{exact:false}).waitFor();
  await page.getByLabel('Find a game').fill('');await page.getByLabel('Game category').selectOption('All');
  const sourceCards=page.locator('[data-public-source]');assert.equal(await sourceCards.count(),38);
  await page.getByLabel('Find a design source').fill('shogiground');assert.equal(await sourceCards.count(),1);
  await page.getByLabel('Find a design source').fill('no-such-design-xyz');assert.equal(await sourceCards.count(),0);await page.getByText('No sources match these filters.',{exact:false}).waitFor();
  await page.getByLabel('Find a design source').fill('');await page.getByLabel('License group').selectOption('copyleft');assert.equal(await sourceCards.count(),6);
  await page.getByLabel('License group').selectOption('all');await page.getByLabel('Design category').selectOption('rl');assert.equal(await sourceCards.count(),6);
  await page.getByLabel('Design category').selectOption('all');assert.equal(await sourceCards.count(),38);
  await page.locator('#public-designs').screenshot({path:`artifacts/browser/public-designs-${viewport.width}-${theme}.png`});
  await page.getByLabel('Find a game').fill('chess');assert.equal(await page.locator('[data-game]').count(),1);await page.getByLabel('Find a game').fill('');
  const slugs=await page.locator('[data-game]').evaluateAll(els=>els.map(el=>el.getAttribute('data-game')));
  let studyCases=0,presentationCases=0,c4DesignLayoutCases=0,otherDesignLayoutCases=0;
  for(const slug of slugs){
   await page.locator(`[data-game="${slug}"]`).click();
   if(slug==='connect-four'){
    const samples=page.locator('[data-sample]');
    assert.equal(await samples.count(),20);
    for(const layout of ['arena','card','event','feature']){
     await page.getByLabel('Compare use case',{exact:true}).selectOption(layout);
     const fingerprints=await samples.evaluateAll((cards,requested)=>cards.map(card=>{
      const board=card.querySelector('.st-board-c4'),panel=card.querySelector('[data-presentation]');
      const bounds=board.getBoundingClientRect(),outer=panel.getBoundingClientRect(),caption=panel.querySelector('.st-legal-caption').getBoundingClientRect();
      if(panel.dataset.presentation!==requested||board.dataset.c4Design!==card.dataset.sample||board.querySelectorAll('.st-cell').length!==42||board.querySelectorAll('[data-line]').length!==4||bounds.top<outer.top-1||bounds.bottom>caption.top+1||caption.bottom>outer.bottom+1)throw Error('Design does not fit: '+card.dataset.sample+'/'+requested);
      return [board,board.querySelector('.st-disc-a'),board.querySelector('.st-disc-b')].map(node=>{const style=getComputedStyle(node);return [style.backgroundImage,style.backgroundColor,style.clipPath,style.borderRadius].join('|');}).join('|');
     }),layout);
     assert.equal(new Set(fingerprints).size,20,'20 distinct rendered material combinations');
     c4DesignLayoutCases+=fingerprints.length;
    }
    await page.getByRole('button',{name:'Select Gumball',exact:true}).click();
    await expect(page.locator('.catalogue-stage .st-board-c4')).toHaveAttribute('data-c4-design','design-2');
    await page.getByLabel('Compare use case',{exact:true}).selectOption('arena');
    await page.locator('.c4-round summary').click();
    const round=page.locator('.c4-round');
    for(const col of [4,3,4,3,4,3,4]) await round.getByRole('button',{name:'Drop in column '+col,exact:true}).click();
    await round.getByText('Player 1 wins · 7 moves').waitFor();
    assert.equal(await round.locator('[data-line]').count(),4);
    await page.getByLabel('Board design',{exact:true}).selectOption('design-15');
    await expect(round.locator('.st-board-c4')).toHaveAttribute('data-c4-design','design-15');
    assert.equal(await round.locator('[data-line]').count(),4);
    await round.getByRole('button',{name:'Undo move'}).click();
    await round.getByText('Player 1 to drop · 6 moves').waitFor();
    await round.getByRole('button',{name:'New round'}).click();
    await expect(round.locator('.st-disc')).toHaveCount(0);
    await page.locator('.c4-round summary').click();
    await page.getByRole('button',{name:'Select Gumball',exact:true}).click();
    await page.goto(page.url().split('#')[0]+'#game-variants',{waitUntil:'networkidle'});
    await expect(page.locator('.c4-selection code')).toHaveText('connect-four-design-2-variant-arena');
   }
   const github=page.getByRole('region',{name:/^GitHub design sweep for /});
   await expect(github.getByLabel('Game in GitHub sweep')).toHaveValue(slug);
   assert.ok(await github.locator('[data-sweep-finding]').count()>0);
   await expect(github.getByRole('link',{name:'Inspect source ↗'}).first()).toHaveAttribute('href',/github\.com\/.+\/blob\/[0-9a-f]{40}\//);
   if(slug==='goofspiel'){
    await github.getByRole('button',{name:'Archived source',exact:true}).click();
    await expect(github).toContainText('Metta-AI/cogame-goofspiel-oshi-zumo');
   }
   const census=page.getByRole('region',{name:/^Local designs for /});
   await expect(census.getByLabel('Browse census')).toHaveValue(slug);
   if(slug!=='connect-four'){
    const looks=page.locator('[data-game-look]');
    const expected=['go','gomoku','pentago'].includes(slug)?4:3;
    await expect(looks).toHaveCount(expected);
    const select=page.getByLabel('Design placement',{exact:true});
    for(const option of await select.locator('option').allTextContents()){
     await select.selectOption(option);
     const fits=await looks.evaluateAll((cards,surface)=>cards.every(card=>{
      const panel=card.querySelector('.st-game-animation'),outer=panel.getBoundingClientRect();
      return panel.dataset.presentation===surface&&Array.from(panel.querySelectorAll('.st-legal-caption,.st-board,.st-legal-svg-scene > svg')).every(node=>{
       const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=outer.left-1&&r.right<=outer.right+1&&r.top>=outer.top-1&&r.bottom<=outer.bottom+1;
      });
     }),option);
     assert.ok(fits,'design bounds: '+slug+'/'+option);otherDesignLayoutCases+=expected;
    }
    await page.getByLabel('Selected design',{exact:true}).selectOption('design-2');
    await expect(page.locator('.c4-selection code')).toContainText(slug+'-design-2-variant-');
    if(slug==='go'){
     await page.getByLabel('Selected design',{exact:true}).selectOption('design-4');
     await expect(page.locator('.catalogue-stage .st-board-go')).toHaveClass(/st-ed-board-design-4/);
     await census.getByRole('button',{name:/GitHub selections/}).click();
     await expect(census).toContainText('SabakiHQ/Shudan');
    }
   }
   if(slug==='backgammon'){
    const references=page.locator('.catalogue-game-sources');await references.locator('summary').click();
    await references.getByText(/Core variant uses 5 checkers/).waitFor();
    assert.ok(await references.locator('a[href^="https://github.com/"]').count()>0);
    await references.locator('summary').click();
   }
   const stage=page.locator('.catalogue-stage');await stage.scrollIntoViewIfNeeded();
   const fit=await page.locator('.catalogue-stage .st-game-animation, .catalogue-variants .st-game-animation').evaluateAll(els=>els.flatMap(el=>{
    const outer=el.getBoundingClientRect();const board=el.querySelector('.st-legal-board > .st-board')?.getBoundingClientRect(),caption=el.querySelector('.st-legal-caption')?.getBoundingClientRect();if(board&&caption&&board.bottom>caption.top+1)return [{presentation:el.getAttribute('data-presentation'),overlap:board.bottom-caption.top}];return Array.from(el.querySelectorAll('.st-legal-board > .st-board, .st-legal-caption')).flatMap(child=>{
     const r=child.getBoundingClientRect();return r.top<outer.top-1||r.bottom>outer.bottom+1||r.left<outer.left-1||r.right>outer.right+1 ? [{presentation:el.getAttribute('data-presentation'),class:child.className,outer:{width:outer.width,height:outer.height},child:{width:r.width,height:r.height,top:r.top-outer.top,bottom:r.bottom-outer.bottom}}] : [];
    });
   }));assert.deepEqual(fit,[],`clipped board/caption ${slug}: ${JSON.stringify(fit)}`);
   presentationCases+=await page.locator('[data-presentation-preview]').count();
   assert.equal(await stage.locator('[data-preview-active="true"]').count(),0,'reduced motion must freeze demos');
   const bad=await stage.locator('svg').evaluateAll(els=>els.some(el=>/NaN|Infinity/.test(el.outerHTML)));assert.equal(bad,false,slug);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${slug}`);
   const replay=page.locator('[data-replay-game]');
   assert.equal(await replay.getAttribute('data-replay-frame'),'0');
   await replay.getByRole('button',{name:'Next',exact:true}).click();
   assert.equal(await replay.getAttribute('data-replay-frame'),'1',`${slug} next`);
   await replay.getByRole('button',{name:'Last',exact:true}).click();
   assert.equal(await replay.getByRole('button',{name:'Next',exact:true}).isDisabled(),true);
   await replay.getByRole('button',{name:'First',exact:true}).click();
   const picker=page.getByLabel('Position or variant study');
   const options=await picker.locator('option').evaluateAll(els=>els.map(e=>e.value).filter(v=>v!=='bundled'));
   for(const value of options){
    await picker.selectOption(value);
    assert.equal(await replay.getAttribute('data-replay-frame'),'0');
    assert.equal(await replay.locator('[data-scene-state="unavailable"]').count(),0,value);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`study overflow ${value}`);
    studyCases++;
   }

  }
  await page.locator('[data-game="chess"]').click();await page.locator('#games').scrollIntoViewIfNeeded();
  await page.locator('.catalogue-stage').screenshot({path:`artifacts/browser/game-${viewport.width}-${theme}.png`});
  await page.locator('.catalogue-lab').screenshot({path:`artifacts/browser/lab-${viewport.width}-${theme}.png`});
  const event=page.locator('[data-gs-stage]');await event.scrollIntoViewIfNeeded();
  assert.equal(await event.getAttribute('data-reduced-motion'),'true');assert.equal(await event.locator('[data-gs-board]').count(),4);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await event.screenshot({path:`artifacts/browser/event-${viewport.width}-${theme}.png`});
  assert.deepEqual(errors,[],JSON.stringify(errors));assert.deepEqual(external,[],'catalogue must work without external requests');
  await page.getByLabel('Game to inspect').selectOption('go');
  await page.getByRole('link',{name:'See all variants for Go ↓'}).click();
  assert.equal(await page.locator('[data-study-preview]').count(),5);
  await page.getByRole('button',{name:'Inspect 19×19 intersections',exact:true}).click();
  assert.equal(await page.getByLabel('Position or variant study').inputValue(),'go-19');
  assert.equal(new URL(page.url()).searchParams.get('game'),'go');
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.getByLabel('Selected game',{exact:true}).inputValue(),'go');
  assert.ok(await page.locator('#game-variants').evaluate(el=>Math.abs(el.getBoundingClientRect().top)<100),'deep link must scroll to variants');
  reports.push({viewport,theme,games:slugs.length,studyCases,presentationCases,c4DesignLayoutCases,otherDesignLayoutCases,localCensus:true,githubSweep:true,presentationFit:true,categorySelection:true,variantComparison:true,gameDeepLinks:true,publicDesignSources:38,sourceFilters:true,replayControls:true,keyboard:true,dialogFocus:true,clipboardFailure:true,reducedMotion:true,noOverflow:true,noExternalRequests:true});
  await context.close();
 }
 // A saved Light/Dark choice opposite to the OS survives a reload (review F10).
 for(const [os,saved] of [['light','dark'],['dark','light']]){
  const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:os,reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto(origin,{waitUntil:'networkidle'});
  const appearance=page.getByLabel('Appearance',{exact:true});await appearance.selectOption(saved);
  await page.waitForTimeout(300);// let the body colour transition settle before sampling
  const bg=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(300);
  assert.equal(await page.locator('html').getAttribute('data-theme'),saved,`saved ${saved} on a ${os} OS must survive reload`);
  assert.equal(await appearance.inputValue(),saved);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),bg,`saved ${saved} colours after reload`);
  reports.push({themePersistence:{os,saved,bg}});await context.close();
 }
 // Normal-motion scheduling, plus actual browser geometry for all 740 demo frames.
 const context=await browser.newContext({viewport:{width:1280,height:900},colorScheme:'light'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#games').scrollIntoViewIfNeeded();
 await page.locator('.catalogue-stage').scrollIntoViewIfNeeded();await page.mouse.move(0,0);
 const animated=page.locator('.catalogue-stage [data-game-animation]');
 await page.waitForFunction(()=>Number(document.querySelector('.catalogue-stage [data-game-animation]')?.getAttribute('data-preview-frame'))>0);
 await animated.hover();await page.waitForFunction(()=>document.querySelector('.catalogue-stage [data-game-animation]')?.getAttribute('data-preview-active')==='false');
 const paused=await animated.getAttribute('data-preview-frame');await page.waitForTimeout(650);assert.equal(await animated.getAttribute('data-preview-frame'),paused,'hover must freeze artwork');
 await page.mouse.move(0,0);await page.locator('#foundations').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.catalogue-stage [data-game-animation]')?.getAttribute('data-preview-active')==='false');
 const geometry=await page.evaluate(async()=>{
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:500px;z-index:10000;background:var(--surface)';document.body.append(host);
  // Consumer-side probe modules are part of the development-only catalogue bundle.
  return window.pachisiProbe ? await window.pachisiProbe(host) : {missing:true};
 });
 assert.equal(geometry.frames,740);assert.equal(geometry.bad,0,JSON.stringify(geometry));assert.deepEqual(errors,[]);
 // Connect Four drop (review F5): the disc starts above the board's top edge and travels exactly
 // --drop row pitches (row index + 1) into its cell, at two board widths; 320 ms with a 4% overshoot.
 const drops=await page.evaluate(async()=>{
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:160px;z-index:10000';document.body.append(host);
  return window.pachisiDropProbe ? await window.pachisiDropProbe(host,[500,240]) : null;
 });
 assert.equal(drops?.length,6,'drop probe missing');
 for(const d of drops){
  const at=`connect-four drop ${JSON.stringify(d)}`;
  assert.equal(d.duration,320,at);
  assert.ok(d.startTop<d.boardTop,`disc starts inside the board: ${at}`);
  assert.ok(Math.abs(d.rowPitch-d.colPitch)<0.5,`row pitch != column pitch: ${at}`);
  assert.ok(Math.abs(d.travel-d.drop*d.rowPitch)<0.5,`travel != drop x row pitch: ${at}`);
  assert.ok(Math.abs(d.endCentreOffset)<0.5,`disc does not settle in its cell: ${at}`);
  assert.ok(Math.abs(d.overshoot-0.04)<0.005,`overshoot is not 4%: ${at}`);
 }
 // Keyboard seeking and explicit playback are separate from decorative scheduling.
 await page.locator('.catalogue-lab').scrollIntoViewIfNeeded();
 const replay=page.locator('[data-replay-game]');
 const range=replay.getByRole('slider',{name:'Replay frame'});await range.focus();await page.keyboard.press('ArrowRight');
 assert.equal(await replay.getAttribute('data-replay-frame'),'1');
 await replay.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('[data-replay-game]')?.getAttribute('data-replay-frame'))>1);
 await replay.getByRole('button',{name:'Pause',exact:true}).click();
 const held=await replay.getAttribute('data-replay-frame');await page.waitForTimeout(1000);assert.equal(await replay.getAttribute('data-replay-frame'),held);
 await page.getByLabel('Game to inspect').selectOption('go');assert.equal(await replay.getAttribute('data-replay-frame'),'0');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.st-replay-note')!==null);assert.equal(await replay.getByRole('button',{name:'Play',exact:true}).isDisabled(),true);
 const studies=await page.evaluate(async()=>{
  const host=document.createElement('div');host.style.cssText='position:fixed;left:0;top:0;width:500px;z-index:10000';document.body.append(host);
  return window.pachisiStudyProbe ? await window.pachisiStudyProbe(host) : null;
 });
 assert.ok(studies?.studies>=30);assert.equal(studies.bad,0,JSON.stringify(studies));
 reports.push({geometry,drops,studies,replayPlayback:true});await context.close();
 reports.push({review:await reviewGameSurfaces(browser,origin)});
 await writeFile('artifacts/browser/report.json',JSON.stringify({reports},null,2)+'\n');console.log(JSON.stringify({browserCases:reports.filter(r=>r.viewport).length,themePersistence:reports.filter(r=>r.themePersistence).length,dropCases:drops.length,galleryScenes:200,geometryFrames:geometry.frames,results:'passed'}));
}finally{await browser?.close();server.kill('SIGTERM');}
