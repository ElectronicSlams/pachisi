/* =====================================================================
   eSlams Arena app prototype  |  qa/smoke.js  [F]
   Renders every frame of every table (engine games ai-vs-ai, scripted
   games from their record) through ESB at stage, preview, poster and
   share size, in both themes, and starts every table on the Stage once.
   Any console error or thrown renderer fails the run.
     cd .../eSlamsPlatform/apps/web && node "<prototype>/qa/smoke.js" [file]
   ===================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd(), __dirname] }));

const PROTO = path.resolve(__dirname, '..');
const BASE = process.argv[2] === 'file' ? 'file://' + path.resolve(PROTO, '..', 'eSlams Arena App.html') : 'http://localhost:8787/src/index.html';
const SHOTS = path.join(__dirname, 'shots', 'tables');

function headlessShell() {
  const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  try {
    const dirs = fs.readdirSync(root).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => parseInt(b.split('-')[1], 10) - parseInt(a.split('-')[1], 10));
    for (const d of dirs) { const p = path.join(root, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'); if (fs.existsSync(p)) return p; }
  } catch (e) { /* default */ }
  return undefined;
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: headlessShell() });
  let failed = 0;
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.goto(BASE);
    await page.waitForFunction(() => window.ESApp && window.ESApp.state);
    await page.click('[data-cv-theme="' + theme + '"]');
    await page.evaluate(() => { window.ESApp.dev.skipBrand(); window.ESApp.dev.modelDelayMs(50, 80); });

    /* 1. every frame through ESB at four sizes */
    const report = await page.evaluate(() => {
      const out = [];
      const slugs = window.ESD.gameOrder.filter((s) => window.ESD.games[s] && !window.ESD.games[s].mobileExcluded);
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-2000px;top:0;width:354px';
      host.setAttribute('data-theme', document.getElementById('phone').getAttribute('data-theme'));
      document.body.appendChild(host);
      for (const slug of slugs) {
        const rec = window.ESE.recordGame(slug, { humanSide: 'p1', seed: 7 });
        const frames = rec.frames || [];
        const row = { slug, frames: frames.length, ledger: (rec.ledger || []).length, result: !!rec.result, errors: [] };
        for (const size of ['stage', 'preview', 'poster', 'share']) {
          try {
            const el = document.createElement('div');
            host.appendChild(el);
            const ctl = window.ESB.render(el, { view: frames[0], size, interactive: false, legal: [], youSeat: 'p1', seats: [] });
            for (let i = 1; i < frames.length; i++) ctl.update({ view: frames[i], size, interactive: false, legal: [], youSeat: 'p1', seats: [], reveal: i === frames.length - 1, lastMove: frames[i] && frames[i].lastMove });
            if (el.querySelector('.bd-unsupported, .bd-t-err')) row.errors.push(size + ': unsupported or error tile');
            ctl.destroy();
            el.remove();
          } catch (e) { row.errors.push(size + ': ' + e.message); }
        }
        const pv = window.ESE.preview(slug, 5);
        if (!pv.length) row.errors.push('empty preview');
        out.push(row);
      }
      host.remove();
      return out;
    });
    report.forEach((r) => { if (r.errors.length || !r.frames || !r.result) { failed += 1; console.log('FAIL render ' + theme + ' ' + r.slug + ' frames=' + r.frames + ' result=' + r.result + ' ' + r.errors.join('; ')); } });
    console.log(theme + ': rendered ' + report.length + ' tables, ' + report.reduce((n, r) => n + r.frames, 0) + ' frames');

    /* 2. start every table on the Stage and take a few turns */
    const slugs = report.map((r) => r.slug);
    for (const slug of slugs) {
      const before = errors.length;
      await page.evaluate(() => { const s = window.ESApp.state(); if (s.live) window.ESApp.dev.forceResult('resigned'); });
      await page.evaluate((s) => window.ESApp.dev.startMatch(s), slug);
      try {
        await page.waitForFunction((s) => { const x = window.ESApp.state(); return x.screen === 'stage' && x.live && x.live.slug === s; }, slug, { timeout: 8000 });
      } catch (e) { failed += 1; console.log('FAIL stage ' + theme + ' ' + slug + ' did not reach the Stage: ' + JSON.stringify(await page.evaluate(() => window.ESApp.state().screen))); continue; }
      for (let k = 0; k < 3; k++) {
        const s = await page.evaluate(() => window.ESApp.state());
        if (!s.live || s.live.turn === 'over') break;
        if (s.live.turn === 'human') {
          const demo = page.locator('#phone .st-demo-step');
          if (await demo.count()) await demo.first().click();
          else {
            const target = page.locator('#phone .st-stage .bd-hit, #phone .st-stage .bd-t-chip, #phone .st-stage .bd-t-btn:not([disabled]), #phone .st-stage .bd-t-card-btn').first();
            if (await target.count()) await target.click({ force: true }).catch(() => {});
          }
        }
        await page.waitForTimeout(350);
      }
      await page.waitForTimeout(250);
      await page.locator('#phone').screenshot({ path: path.join(SHOTS, slug + '-' + theme + '.png') });
      if (errors.length > before) { failed += 1; console.log('FAIL console ' + theme + ' ' + slug + ': ' + errors.slice(before).join(' | ').slice(0, 400)); }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? failed + ' smoke failure(s)' : 'smoke: all tables render and start with no console errors');
  process.exit(failed ? 1 : 0);
})();
