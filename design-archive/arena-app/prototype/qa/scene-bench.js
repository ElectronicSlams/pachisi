/* eSlams Arena | qa/scene-bench.js [S]  node qa/scene-bench.js  -> qa/scene-bench.json */
'use strict';
const path = require('path'); const fs = require('fs'); const os = require('os');
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd(), __dirname, '~/Downloads/eSlams/eSlamsPlatform/apps/web'] }));
function headlessShell() {
  const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  try {
    const dirs = fs.readdirSync(root).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => parseInt(b.split('-')[1], 10) - parseInt(a.split('-')[1], 10));
    for (const d of dirs) { const p = path.join(root, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'); if (fs.existsSync(p)) return p; }
  } catch (e) { /* default */ }
  return undefined;
}
(async () => {
  const browser = await chromium.launch({ executablePath: headlessShell() });
  const out = { date: new Date().toISOString(), viewport: '390x844@2', results: {} };
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errors = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('file://' + path.join(__dirname, 'scene-test.html') + '?theme=' + theme);
    await page.waitForTimeout(4000);
    const s = await page.evaluate(() => window.ctl.stats());
    await page.screenshot({ path: path.join(__dirname, 'scene-' + theme + '.png') });
    await page.evaluate(() => window.ctl.setDepth(1)); await page.waitForTimeout(900);
    const s1 = await page.evaluate(() => window.ctl.stats());
    out.results[theme] = { depth0: s, depth1: s1, errors, version: await page.evaluate(() => ESScene.version) };
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'scene-bench.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
