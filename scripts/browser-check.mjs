import { chromium } from '@playwright/test';
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
  await page.getByLabel('Find a game').fill('chess');assert.equal(await page.locator('[data-game]').count(),1);await page.getByLabel('Find a game').fill('');
  const slugs=await page.locator('[data-game]').evaluateAll(els=>els.map(el=>el.getAttribute('data-game')));
  for(const slug of slugs){
   await page.locator(`[data-game="${slug}"]`).click();
   const stage=page.locator('.catalogue-stage');await stage.scrollIntoViewIfNeeded();
   assert.equal(await stage.locator('[data-preview-active="true"]').count(),0,'reduced motion must freeze demos');
   const bad=await stage.locator('svg').evaluateAll(els=>els.some(el=>/NaN|Infinity/.test(el.outerHTML)));assert.equal(bad,false,slug);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${slug}`);
  }
  await page.locator('[data-game="chess"]').click();await page.locator('#games').scrollIntoViewIfNeeded();
  await page.locator('.catalogue-stage').screenshot({path:`artifacts/browser/game-${viewport.width}-${theme}.png`});
  const event=page.locator('[data-gs-stage]');await event.scrollIntoViewIfNeeded();
  assert.equal(await event.getAttribute('data-reduced-motion'),'true');assert.equal(await event.locator('[data-gs-board]').count(),4);
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await event.screenshot({path:`artifacts/browser/event-${viewport.width}-${theme}.png`});
  assert.deepEqual(errors,[],JSON.stringify(errors));assert.deepEqual(external,[],'catalogue must work without external requests');
  reports.push({viewport,theme,games:slugs.length,keyboard:true,dialogFocus:true,clipboardFailure:true,reducedMotion:true,noOverflow:true,noExternalRequests:true});
  await context.close();
 }
 // Normal-motion scheduling, plus actual browser geometry for all 722 demo frames.
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
 assert.equal(geometry.frames,722);assert.equal(geometry.bad,0,JSON.stringify(geometry));assert.deepEqual(errors,[]);
 reports.push({geometry});await context.close();
 await writeFile('artifacts/browser/report.json',JSON.stringify({reports},null,2)+'\n');console.log(JSON.stringify({browserCases:reports.length-1,galleryScenes:200,geometryFrames:geometry.frames,results:'passed'}));
}finally{await browser?.close();server.kill('SIGTERM');}
