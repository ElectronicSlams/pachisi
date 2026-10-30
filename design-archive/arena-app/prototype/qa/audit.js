/* =====================================================================
   eSlams Arena app prototype  |  qa/audit.js  [F]
   ---------------------------------------------------------------------
   Visual audit of the key screens in both themes: text contrast against
   the real (blended) background, and tap targets under 44px. Writes
   qa/shots/A-<screen>-<theme>.png and qa/last-audit.json.

   Run from apps/web so @playwright/test resolves:
     node "<prototype>/qa/audit.js"            # http://localhost:8787/src/index.html
     THEMES=light,dark,neon,club,arcade,midnight node "<prototype>/qa/audit.js"   # any of the six
     node "<prototype>/qa/audit.js" file       # the built single file
   ===================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd(), __dirname] }));

const PROTO = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const FILE = process.argv[2] === 'file';
const BASE = process.env.BASE || (FILE ? 'file://' + path.resolve(PROTO, '..', 'eSlams Arena App.html') : 'http://localhost:8787/src/index.html');
const THEMES = (process.env.THEMES || 'light,dark').split(',');

function headlessShell() {
  const root = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  try {
    const dirs = fs.readdirSync(root).filter((d) => /^chromium_headless_shell-\d+$/.test(d)).sort((a, b) => parseInt(b.split('-')[1], 10) - parseInt(a.split('-')[1], 10));
    for (const d of dirs) {
      const p = path.join(root, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
      if (fs.existsSync(p)) return p;
    }
  } catch (e) { /* default */ }
  return undefined;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* runs in the page: contrast and tap-target findings inside #phone */
function inspect() {
  const phone = document.getElementById('phone');
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const raw = getComputedStyle(n).backgroundColor;
      const c = parse(raw);
      if (!c && raw !== 'transparent') return null;        /* oklch/color-mix tints: not measured here */
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const pr = phone.getBoundingClientRect();
    if (r.bottom < pr.top + 47 || r.top > pr.bottom - 20 || r.right < pr.left || r.left > pr.right) return false;
    for (let n = el; n && n !== phone; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.5) return false;
      if (n.getAttribute('aria-hidden') === 'true' && n.closest('.ap-screen.is-under, .sh-under')) return false;
    }
    const cx = Math.min(Math.max(r.left + r.width / 2, pr.left + 1), pr.right - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, pr.top + 1), pr.bottom - 1);
    const top = document.elementFromPoint(cx, cy);
    return !!top && (top === el || el.contains(top) || top.contains(el));
  };
  const name = (el) => (el.className && el.className.baseVal == null ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const lowContrast = [];
  const seen = new Set();
  phone.querySelectorAll('*').forEach((el) => {
    if (el.closest('svg')) return;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own || !visible(el)) return;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) return;
    const bg = bgOf(el);
    if (!bg) return;
    const f = over(fg, bg);
    const L1 = lum(f), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const key = name(el) + '|' + own.slice(0, 24);
      if (seen.has(key)) return;
      seen.add(key);
      lowContrast.push({ el: name(el), text: own.slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, size: px });
    }
  });
  const smallTargets = [];
  phone.querySelectorAll('button, a[href], [role="button"], [role="radio"], [role="switch"], [role="tab"], input, select, [role="menuitem"]').forEach((el) => {
    if (el.closest('.bd-host') || el.disabled) return;
    if (!visible(el)) return;
    const b = el.getBoundingClientRect();
    /* a hit-area extension (::after, absolutely positioned with negative insets) counts */
    const pa = getComputedStyle(el, '::after');
    const ext = (v) => { const n = parseFloat(v); return isFinite(n) && n < 0 ? -n : 0; };
    const hasExt = pa.content !== 'none' && pa.position === 'absolute';
    const r = hasExt ? { width: b.width + ext(pa.left) + ext(pa.right), height: b.height + ext(pa.top) + ext(pa.bottom) } : b;
    if (r.width < 43.5 || r.height < 43.5) smallTargets.push({ el: name(el), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 32), w: Math.round(r.width), h: Math.round(r.height) });
  });
  return { lowContrast, smallTargets };
}

/* Scene screens (Welcome, Auth, Setup) sit over the decorative canvas: contrast is measured on real pixels. */
const SCENE_IDS = new Set(['welcome', 'auth-choose', 'auth-email', 'auth-password', 'auth-create', 'setup', 'setup-error']);
const clickPlay = async (p) => { await p.evaluate(() => window.ESApp.dev.openWelcome()); await sleep(1800); await p.locator('#phone').getByRole('button', { name: 'Play Against AI', exact: true }).click(); await sleep(1300); };
const toEmail = async (p) => { await clickPlay(p); await p.locator('#phone').getByRole('button', { name: 'Continue with email', exact: true }).click(); await sleep(900); };
const SCREENS = [
  ['home', async (p) => { await p.evaluate(() => window.ESApp.dev.reset && window.ESApp.dev.skipBrand()); }],
  ['seeall', async (p) => { await p.evaluate(() => window.ESApp.dev.openSeeAll('board')); await sleep(900); }],
  ['table-c4', async (p) => { await p.evaluate(() => window.ESApp.dev.openTable('connect-four')); await sleep(700); }],
  ['table-holdem', async (p) => { await p.evaluate(() => window.ESApp.dev.openTable('no-limit-texas-holdem')); await sleep(700); }],
  ['roster', async (p) => {
    await p.evaluate(() => window.ESApp.dev.openTable('connect-four')); await sleep(600);
    await p.locator('#phone .sh-sheet--table').getByRole('button', { name: /^Change/ }).first().click(); await sleep(700);
  }],
  ['welcome', async (p) => { await p.evaluate(() => window.ESApp.dev.openWelcome()); await sleep(1800); }],
  ['auth-choose', async (p) => { await clickPlay(p); }],
  ['auth-email', async (p) => { await toEmail(p); }],
  ['auth-password', async (p) => {
    await p.evaluate(() => { const k = 'eslams-arena-proto'; const o = JSON.parse(localStorage.getItem(k) || '{}'); o.authEmails = ['qa@lab.ai']; localStorage.setItem(k, JSON.stringify(o)); });
    await toEmail(p);
    await p.locator('#phone').getByRole('textbox', { name: 'Email' }).fill('qa@lab.ai');
    await p.locator('#phone').getByRole('button', { name: 'Continue', exact: true }).click(); await sleep(1500);
  }],
  ['auth-create', async (p) => {
    await toEmail(p);
    await p.locator('#phone').getByRole('textbox', { name: 'Email' }).fill('new-player@lab.ai');
    await p.locator('#phone').getByRole('button', { name: 'Continue', exact: true }).click(); await sleep(1500);
    await p.locator('#phone').getByRole('textbox', { name: 'Password' }).fill('correct-ho'); await sleep(300);
  }],
  ['setup', async (p) => { await p.evaluate(() => window.ESApp.dev.openSetup()); await sleep(1100); }],
  ['setup-error', async (p) => { await p.evaluate(() => window.ESApp.dev.openSetup()); await sleep(1100); await p.locator('#phone .ob-handle-input').fill('ab_c.'); await sleep(400); }],
  ['themepick', async (p) => { await p.evaluate(() => window.ESApp.dev.openThemePick()); await sleep(900); }],
  ['stage-yourmove', async (p) => { await p.evaluate(() => { window.ESApp.dev.modelDelayMs(4000, 5000); window.ESApp.dev.startMatch('connect-four'); }); await p.waitForFunction(() => { const s = window.ESApp.state(); return s.screen === 'stage' && s.live && s.live.turn === 'human'; }, null, { timeout: 8000 }); await sleep(600); }],
  ['stage-thinking', async (p) => {
    await p.locator('#phone .st-stage rect.bd-hit[aria-label="Column 4"]').first().click({ force: true });
    await p.waitForFunction(() => { const s = window.ESApp.state(); return s.live && s.live.turn === 'model'; }, null, { timeout: 4000 }); await sleep(1200);
  }],
  ['result', async (p) => { await p.evaluate(() => window.ESApp.dev.forceResult('win')); await p.waitForFunction(() => window.ESApp.state().screen === 'result', null, { timeout: 4000 }); await sleep(1400); }],
  ['matches', async (p) => { await p.evaluate(() => window.ESApp.dev.openMatches()); await sleep(800); }],
  ['replay', async (p) => { await p.evaluate(() => window.ESApp.dev.openMatches()); await sleep(600); await p.locator('#phone [data-screen="matches"] .ap-mcard-body').filter({ hasText: 'Connect Four' }).first().click(); await sleep(700); for (let i = 0; i < 6; i++) await p.locator('#phone').getByRole('button', { name: 'Step forward' }).click(); await sleep(600); }],
  ['settings', async (p) => { await p.evaluate(() => window.ESApp.dev.openSettings()); await sleep(700); }]
];

/* Real-pixel contrast for text over the scene: hide the text (colour transparent, backgrounds stay), take 3 frames
   400 ms apart, take the median backdrop colour under each text box, compare with the text colour. Returns the
   minimum per frame set. Brand images (mark, wordmark) are graphics: measured against 3:1 with the --text ink. */
async function sceneContrast(page) {
  const targets = await page.evaluate(() => {
    const phone = document.getElementById('phone');
    const pr = phone.getBoundingClientRect();
    const out = [];
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const vis = (el) => { for (let n = el; n && n !== phone; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.5) return false; } return true; };
    const shell = phone.querySelector('.ob-shell');
    if (!shell) return out;
    let i = 0;
    shell.querySelectorAll('*').forEach((el) => {
      if (el.closest('svg') || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.closest('.ob-world')) return;
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own || !vis(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < pr.top || r.top > pr.bottom) return;
      const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg || fg.a === 0) return;
      const px = parseFloat(cs.fontSize); const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
      el.setAttribute('data-aud', String(i));
      out.push({ id: i++, kind: 'text', text: own.slice(0, 40), fg, need: large ? 3 : 4.5, x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height });
    });
    const ink = parse(getComputedStyle(phone).getPropertyValue('--text').trim() ? (() => { const d = document.createElement('i'); d.style.color = getComputedStyle(phone).getPropertyValue('--text'); phone.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })() : 'rgb(0,0,0)');
    shell.querySelectorAll('.ob-brand .ob-mark, .ob-brand .ob-wm').forEach((el) => {
      const r = el.getBoundingClientRect(); if (r.width < 2 || !vis(el)) return;
      el.setAttribute('data-aud-img', '1');
      out.push({ id: i++, kind: 'brand', text: el.className.split(' ')[0], fg: ink || { r: 0, g: 0, b: 0, a: 1 }, need: 3, x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height });
    });
    const st = document.createElement('style'); st.id = 'aud-style';
    st.textContent = '#phone [data-aud]{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important} #phone [data-aud-img]{visibility:hidden!important}';
    document.head.appendChild(st);
    return out;
  });
  if (!targets.length) return { min: null, n: 0, worst: null };
  const frames = [];
  for (let f = 0; f < 3; f++) { frames.push((await page.locator('#phone').screenshot({ animations: 'allow' })).toString('base64')); await sleep(400); }
  const res = await page.evaluate(async ([frames, targets]) => {
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const worst = [];
    const sc = 2;   /* deviceScaleFactor */
    for (const b64 of frames) {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      for (const t of targets) {
        const x = Math.max(0, Math.round(t.x * sc)), y = Math.max(0, Math.round(t.y * sc));
        const w = Math.max(1, Math.min(img.width - x, Math.round(t.w * sc))), h = Math.max(1, Math.min(img.height - y, Math.round(t.h * sc)));
        const d = cx.getImageData(x, y, w, h).data;
        const med = (k) => { const a = []; for (let i = k; i < d.length; i += 4 * 3) a.push(d[i]); a.sort((p, q) => p - q); return a[a.length >> 1]; };
        const bg = { r: med(0), g: med(1), b: med(2), a: 1 };
        const f = { r: t.fg.r * t.fg.a + bg.r * (1 - t.fg.a), g: t.fg.g * t.fg.a + bg.g * (1 - t.fg.a), b: t.fg.b * t.fg.a + bg.b * (1 - t.fg.a) };
        const L1 = lum(f), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const prev = worst[t.id];
        if (!prev || ratio < prev.ratio) worst[t.id] = { id: t.id, kind: t.kind, text: t.text, ratio: Math.round(ratio * 100) / 100, need: t.need };
      }
    }
    return worst.filter(Boolean);
  }, [frames, targets]);
  await page.evaluate(() => { const s = document.getElementById('aud-style'); if (s) s.remove(); document.querySelectorAll('[data-aud],[data-aud-img]').forEach((e) => { e.removeAttribute('data-aud'); e.removeAttribute('data-aud-img'); }); });
  const min = res.reduce((m, x) => (x.ratio < m.ratio ? x : m), res[0]);
  return { n: res.length, min: min.ratio, worst: min, fails: res.filter((x) => x.ratio < x.need) };
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: headlessShell() });
  const out = { base: BASE, at: new Date().toISOString(), screens: [] };
  for (const theme of THEMES) {
    for (const [id, go] of SCREENS) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: theme === 'dark' ? 'dark' : 'light' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|net::ERR_/.test(m.text())) errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      const rec = { id, theme, ok: true };
      try {
        await page.goto(BASE, { waitUntil: 'load' });
        await page.waitForFunction(() => window.ESApp && window.ESApp.dev);
        /* a returning player (same fixture as flows.js): signed in, profile complete, theme picked, Connect Four the first favourite */
        await page.evaluate(() => {
          const KEY = 'eslams-arena-proto';
          let p = {};
          try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { p = {}; }
          p.v = 1; p.signedIn = true; p.username = 'qa-player'; p.onboarded = true; p.themePicked = true; p.launched = true;
          p.profile = Object.assign({ displayName: '', bio: '', location: '', website: '' }, p.profile || {}, { visibility: 'public', complete: true, favourites: ['connect-four'] });
          localStorage.setItem(KEY, JSON.stringify(p));
        });
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.ESApp && window.ESApp.dev);
        if (await page.locator('[data-cv-theme="' + theme + '"]').count()) await page.click('[data-cv-theme="' + theme + '"]');
        else await page.evaluate((t) => window.ESApp.dev.setTheme(t), theme);
        await page.evaluate(() => { window.ESApp.dev.skipBrand(); });
        await sleep(300);
        if (id === 'stage-thinking') await SCREENS.find((s) => s[0] === 'stage-yourmove')[1](page);
        if (id === 'result') await SCREENS.find((s) => s[0] === 'stage-yourmove')[1](page);
        await go(page);
        await page.locator('#phone').screenshot({ path: path.join(SHOTS, 'A-' + id + '-' + theme + (FILE ? '-file' : '') + '.png'), animations: 'disabled' });
        Object.assign(rec, await page.evaluate(inspect));
        if (SCENE_IDS.has(id)) {
          rec.lowContrast = [];                     /* DOM-bg estimate is meaningless over the canvas; real pixels instead */
          rec.scene = await sceneContrast(page);
          (rec.scene.fails || []).forEach((x) => rec.lowContrast.push({ el: x.kind, text: x.text, ratio: x.ratio, need: x.need, size: 0 }));
        }
      } catch (e) { rec.ok = false; rec.fail = String(e.message || e).split('\n')[0]; }
      rec.errors = errors;
      out.screens.push(rec);
      console.log((rec.ok && !errors.length ? 'ok  ' : 'FAIL') + ' ' + id.padEnd(16) + theme.padEnd(6) + ' contrast<' + (rec.lowContrast ? rec.lowContrast.length : '?') + (rec.scene && rec.scene.n ? ' (scene min ' + rec.scene.min + ' "' + rec.scene.worst.text + '" n=' + rec.scene.n + ')' : '') + '  small targets ' + (rec.smallTargets ? rec.smallTargets.length : '?') + (rec.fail ? '  ' + rec.fail : '') + (errors.length ? '  errors: ' + errors.join(' | ').slice(0, 200) : ''));
      (rec.lowContrast || []).forEach((x) => console.log('      low contrast ' + x.ratio + '/' + x.need + ' ' + x.el + ' "' + x.text + '" ' + x.size + 'px'));
      (rec.smallTargets || []).forEach((x) => console.log('      small target ' + x.w + 'x' + x.h + ' ' + x.el + ' "' + x.label + '"'));
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'last-audit' + (FILE ? '-file' : '') + '.json'), JSON.stringify(out, null, 2));
})();
