/* qa/scene-contrast.js: Welcome scene contrast, light and dark. Run from apps/web.
   Fresh install, 4 frames 400 ms apart with the text hidden (backdrop only), median backdrop under each box vs computed colour. */
'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd(), __dirname] }));
const BASE = process.env.BASE || 'http://localhost:8787/src/index.html';
const THEMES = (process.env.THEMES || 'light,dark').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function shell() {
  const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  try { for (const d of fs.readdirSync(root).filter((x) => /^chromium_headless_shell-\d+$/.test(x)).sort().reverse()) { const p = path.join(root, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'); if (fs.existsSync(p)) return p; } } catch (e) { /* default */ }
  return undefined;
}
const SEL = { wordmark: '.ob-brand .ob-wm', tagline: '.ob-wel-title', button: '.ob-wel-go' };
(async () => {
  const browser = await chromium.launch({ executablePath: shell() });
  const out = { at: new Date().toISOString(), themes: {} };
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector(SEL.tagline, { timeout: 8000 });
    await sleep(1500);
    const info = await page.evaluate((SEL) => {
      const phone = document.getElementById('phone'), pr = phone.getBoundingClientRect();
      const parse = (c) => { const p = c.match(/[\d.]+/g).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const res = {};
      for (const k in SEL) {
        const el = phone.querySelector(SEL[k]); if (!el) { res[k] = null; continue; }
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        let fg;
        if (k === 'wordmark') { const d = document.createElement('i'); d.style.color = getComputedStyle(phone).getPropertyValue('--text'); phone.appendChild(d); fg = parse(getComputedStyle(d).color); d.remove(); } else fg = parse(cs.color);
        res[k] = { fg, x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height, px: parseFloat(cs.fontSize), weight: cs.fontWeight };
        el.setAttribute('data-sc', k);
      }
      const st = document.createElement('style');
      st.textContent = '#phone [data-sc]{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important} #phone [data-sc="wordmark"]{visibility:hidden!important}';
      document.head.appendChild(st);
      return res;
    }, SEL);
    const frames = [];
    for (let i = 0; i < 4; i++) { frames.push((await page.locator('#phone').screenshot({ animations: 'allow' })).toString('base64')); await sleep(400); }
    const ratios = await page.evaluate(async ([frames, info]) => {
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      const out = {};
      for (const b64 of frames) {
        const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
        for (const k in info) {
          const t = info[k]; if (!t) continue;
          const x = Math.max(0, Math.round(t.x * 2)), y = Math.max(0, Math.round(t.y * 2));
          const w = Math.max(1, Math.min(img.width - x, Math.round(t.w * 2))), h = Math.max(1, Math.min(img.height - y, Math.round(t.h * 2)));
          const d = cx.getImageData(x, y, w, h).data;
          const med = (o) => { const a = []; for (let i = o; i < d.length; i += 12) a.push(d[i]); a.sort((p, q) => p - q); return a[a.length >> 1]; };
          const bg = { r: med(0), g: med(1), b: med(2) };
          const f = { r: t.fg.r * t.fg.a + bg.r * (1 - t.fg.a), g: t.fg.g * t.fg.a + bg.g * (1 - t.fg.a), b: t.fg.b * t.fg.a + bg.b * (1 - t.fg.a) };
          const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          (out[k] = out[k] || { min: 99, bg, fg: t.fg, px: t.px }).min = Math.min(out[k].min, Math.round(ratio * 100) / 100);
        }
      }
      return out;
    }, [frames, info]);
    out.themes[theme] = ratios;
    for (const k in ratios) console.log(theme.padEnd(6), k.padEnd(9), 'min', ratios[k].min, ratios[k].min >= 4.5 ? 'AA' : ratios[k].min >= 3 ? 'large-only (>=3)' : 'FAIL', 'bg', JSON.stringify(ratios[k].bg), 'px', ratios[k].px);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'scene-contrast.json'), JSON.stringify(out, null, 2));
})();
