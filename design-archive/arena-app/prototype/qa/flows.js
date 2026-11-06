/* =====================================================================
   eSlams Arena app prototype  |  qa/flows.js  [F]
   ---------------------------------------------------------------------
   Drives the eight required flows (CONTRACT.md section 6) end to end
   through the real UI inside #phone, in both themes, captures console
   errors, and writes screenshots to qa/shots/NN-screen-theme.png.

   Run from apps/web so @playwright/test resolves:
     cd .../eSlamsPlatform/apps/web
     node "<prototype>/qa/flows.js"            # http://localhost:8787/src/index.html
     node "<prototype>/qa/flows.js" file       # the built single file over file://
   Env: THEMES=light,dark  FLOWS=1,2,3  HEADED=1  BASE=<url>

   The dev API (window.ESApp.dev) is used only to force timers, engine
   states and conflicts; every navigation is a click on the phone.
   ===================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require(require.resolve('@playwright/test', { paths: [process.cwd(), __dirname] }));

const PROTO = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
const TARGET = process.argv[2] === 'file' ? 'file' : 'http';
const BASE = process.env.BASE || (TARGET === 'file'
  ? 'file://' + path.resolve(PROTO, '..', 'eSlams Arena App.html')
  : 'http://localhost:8787/src/index.html');
const THEMES = (process.env.THEMES || 'light,dark').split(',').map((s) => s.trim()).filter(Boolean);
const ONLY = process.env.FLOWS ? process.env.FLOWS.split(',').map((x) => parseInt(x, 10)) : null;
const SHOT_SUFFIX = TARGET === 'file' ? '-file' : '';

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

/* ---------------- harness ---------------- */
const results = [];
let current = null;

class FlowError extends Error {}
function assert(cond, msg) { if (!cond) throw new FlowError(msg); }
function note(msg) { if (current) current.notes.push(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A returning player (agent G): signed in, a completed profile, the theme already
   picked and Connect Four as the first favourite, so a cold start goes straight to
   Home (brief 11). Flows that test first run open with { firstRun: true }. */
const FIXTURE_HANDLE = 'qa-player';
async function signedInFixture(page, extra) {
  await page.evaluate(([handle, more]) => {
    const KEY = 'eslams-arena-proto';
    let p = {};
    try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { p = {}; }
    p.v = 1; p.signedIn = true; p.username = handle; p.onboarded = true; p.themePicked = true; p.launched = true;
    p.profile = Object.assign({ displayName: '', bio: '', location: '', website: '' }, p.profile || {},
      { visibility: 'public', complete: true, favourites: ['connect-four'] });
    Object.assign(p, more || {});
    localStorage.setItem(KEY, JSON.stringify(p));
  }, [FIXTURE_HANDLE, extra || null]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.ESApp && typeof window.ESApp.state === 'function', null, { timeout: 10000 });
}
const ob = (page) => page.evaluate(() => (window.ESOnboard ? window.ESOnboard.state() : {}));
async function waitOb(page, screen, timeout) {
  try {
    await page.waitForFunction((sc) => window.ESOnboard && (sc === null ? !window.ESOnboard.state().layer : window.ESOnboard.state().screen === sc), screen, { timeout: timeout || 5000 });
  } catch (e) {
    throw new FlowError('timeout waiting for first-run screen ' + screen + ' | ' + JSON.stringify(await ob(page)) + ' sheets=' + JSON.stringify((await st(page)).sheets));
  }
}

async function newPage(browser, theme, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  const errors = [];
  const warnings = [];
  page.on('console', (m) => {
    const txt = m.text();
    if (m.type() === 'error') {
      if (/fonts\.(googleapis|gstatic)\.com|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(txt)) return;   /* offline fonts are not app errors */
      errors.push(txt);
    } else if (m.type() === 'warning' && /^\[ES/.test(txt)) warnings.push(txt);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)));
  page.errors = errors;
  page.warnings = warnings;
  page.theme = theme;
  page.osScheme = theme === 'dark' ? 'dark' : 'light';
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ESApp && typeof window.ESApp.state === 'function', null, { timeout: 10000 });
  if (!opts.firstRun) await signedInFixture(page);
  /* theme through the canvas Controls, like a reviewer would (material themes without a button: the dev API) */
  if (await page.locator('[data-cv-theme="' + theme + '"]').count()) await page.click('[data-cv-theme="' + theme + '"]');
  else await page.evaluate((t) => window.ESApp.dev.setTheme(t), theme);
  await page.waitForFunction((t) => window.ESApp.state().theme === t, theme, { timeout: 3000 });
  return page;
}

async function shot(page, id, name) {
  const file = path.join(SHOTS, id + '-' + name + '-' + page.theme + SHOT_SUFFIX + '.png');
  await sleep(120);
  await page.locator('#phone').screenshot({ path: file, animations: 'disabled' });
  return file;
}
async function shotEl(page, id, name, selector) {
  const file = path.join(SHOTS, id + '-' + name + '-' + page.theme + SHOT_SUFFIX + '.png');
  await page.locator(selector).first().screenshot({ path: file });
  return file;
}

const phone = (page) => page.locator('#phone');
/* end the brand beat and wait for it to leave, so no click lands on it */
async function skipBrand(page) {
  await page.evaluate(() => window.ESApp.dev.skipBrand());
  await page.locator('#phone .ap-brand').waitFor({ state: 'detached', timeout: 2500 }).catch(() => {});
}
const st = (page) => page.evaluate(() => window.ESApp.state());
const dev = (page, fn, ...args) => page.evaluate(([f, a]) => window.ESApp.dev[f](...a), [fn, args]);

async function tap(page, selectorOrLocator, label) {
  const loc = typeof selectorOrLocator === 'string' ? phone(page).locator(selectorOrLocator) : selectorOrLocator;
  await loc.first().waitFor({ state: 'visible', timeout: 6000 }).catch(() => { throw new FlowError('not visible: ' + (label || selectorOrLocator)); });
  await loc.first().click({ timeout: 6000 });
}
async function tapButton(page, name, opts) {
  opts = opts || {};
  const loc = phone(page).getByRole('button', { name, exact: !!opts.exact });
  await tap(page, opts.last ? loc.last() : loc, 'button ' + name);
}
async function waitState(page, pred, arg, timeout, label) {
  try {
    await page.waitForFunction(new Function('arg', 'const s = window.ESApp.state(); return (' + pred + ');'), arg, { timeout: timeout || 8000 });
  } catch (e) {
    const s = await st(page);
    throw new FlowError('timeout waiting for ' + (label || pred) + ' | screen=' + s.screen + ' sheets=' + JSON.stringify(s.sheets) + ' live=' + JSON.stringify(s.live && { turn: s.live.turn, plies: s.live.plies, mt: s.live.modelTurn }));
  }
}
async function phoneText(page) { return (await phone(page).innerText()).replace(/\s+/g, ' '); }
async function expectText(page, re, label) {
  const txt = await phoneText(page);
  const ci = new RegExp(re.source, re.flags.indexOf('i') >= 0 ? re.flags : re.flags + 'i');   /* eyebrows are CSS uppercase */
  assert(ci.test(txt), 'expected ' + (label || re) + ' on screen; got: ' + txt.slice(0, 600));
}

/* Retired words must never render in the phone (brief section 5). */
const RETIRED = /\b(battle|elo|rating|sweep|locked|verified playable|requestable|gateway ready|refresh|bots?)\b|\blive\b/i;
async function checkVocabulary(page, where) {
  const txt = await phoneText(page);
  const m = txt.match(RETIRED);
  if (m) throw new FlowError('retired word "' + m[0] + '" on ' + where + ': …' + txt.slice(Math.max(0, m.index - 60), m.index + 60) + '…');
  if (/—/.test(txt)) throw new FlowError('em dash in UI copy on ' + where);
  const rm = txt.match(REMOVED);
  if (rm) throw new FlowError('removed string "' + rm[0] + '" on ' + where);
}
/* Strings the polish round removed (brief 3, 6, 7): none may exist anywhere in #phone text (hidden Home included). */
const REMOVED = /Choose an arena|\d+ games · \d+ arenas|Watch models play each other on eslams\.com|Play frontier models at|Get started|I have an account|Pick any\. Your first pick opens Home/i;
const CLASSIC = { light: 'light', dark: 'dark' };
/* Before Pick a look the world screens are always Classic Light/Dark by the OS scheme. */
async function assertClassicOnly(page, where) {
  const th = (await ob(page)).theme;
  assert(th === (page.osScheme || 'light'), where + ': theme before Pick a look is ' + th + ', expected Classic ' + (page.osScheme || 'light'));
}
const HOME_SECTIONS = ['Recommended for you', 'Start here', 'Board & Strategy', 'Card & Hidden-Info', 'Social & Economic'];
async function assertHomeSections(page, where) {
  const got = (await st(page)).homeSections;
  assert(JSON.stringify(got) === JSON.stringify(HOME_SECTIONS), where + ': homeSections ' + JSON.stringify(got));
  const titles = await phone(page).locator('[data-screen="home"] h3.ap-sec-title').allInnerTexts();
  assert(JSON.stringify(titles) === JSON.stringify(HOME_SECTIONS), where + ': rendered section titles ' + JSON.stringify(titles));
  assert(await phone(page).locator('[data-screen="home"] .ap-sec-link', { hasText: 'See all' }).count() === HOME_SECTIONS.length, where + ': See all missing');
}
/* Hero chips edge-align with Play now (outer edges within 1px) and are 44px tall. */
async function assertHeroAlignment(page, where) {
  const r = await page.evaluate(() => {
    const hero = document.querySelector('#phone [data-screen="home"] .ap-gcard-hero');
    if (!hero) return null;
    const btn = (n) => Array.from(hero.querySelectorAll('button')).find((b) => b.textContent.trim() === n);
    const box = (b) => { const r = (b.querySelector('.ap-chip') || b).getBoundingClientRect(); const o = b.getBoundingClientRect(); return { l: o.left, r: o.right, h: o.height, cl: r.left, cr: r.right }; };
    const play = btn('Play now'), a = btn('Change opponent'), b = btn('Change table');
    if (!play || !a || !b) return { err: 'missing button' };
    return { play: box(play), a: box(a), b: box(b) };
  });
  assert(r && !r.err, where + ': hero buttons ' + JSON.stringify(r));
  const d1 = Math.abs(r.a.l - r.play.l), d2 = Math.abs(r.b.r - r.play.r);
  assert(d1 <= 1 && d2 <= 1, where + ': hero chips not edge-aligned with Play now (left ' + d1.toFixed(2) + 'px, right ' + d2.toFixed(2) + 'px)');
  assert(r.a.h >= 43.5 && r.b.h >= 43.5, where + ': hero chip height ' + r.a.h + '/' + r.b.h);
  note(where + ': hero chips edge delta ' + d1.toFixed(2) + '/' + d2.toFixed(2) + 'px, chip height ' + r.a.h);
}

/* Sheet scrolls inside the phone and keeps Start sticky. */
async function checkSheetScroll(page, kind) {
  const r = await page.evaluate((k) => {
    const sheets = Array.from(document.querySelectorAll('#phone .sh-sheet'));
    const sh = sheets[sheets.length - 1];
    if (!sh) return { err: 'no sheet' };
    const sc = Array.from(sh.querySelectorAll('*')).find((n) => { const cs = getComputedStyle(n); return /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4; });
    const foot = sh.querySelector('.sh-foot, .sh-ts-foot');
    const pr = document.getElementById('phone').getBoundingClientRect();
    const sr = sh.getBoundingClientRect();
    return { kind: k, scroller: sc ? sc.className : null, sh: sc ? sc.scrollHeight : 0, ch: sc ? sc.clientHeight : 0,
      footBottom: foot ? foot.getBoundingClientRect().bottom : null, phoneBottom: pr.bottom, sheetInside: sr.top >= pr.top - 1 && sr.bottom <= pr.bottom + 1,
      pageScroll: window.scrollY };
  }, kind);
  return r;
}

/* ---------------- Connect Four: a small honest player (win, block, avoid feeding, centre) ---------------- */
function c4Pick(cells, me) {
  const R = cells.length, C = cells[0].length, opp = me === 'R' ? 'Y' : 'R';
  const land = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; };
  const wins = (b, p) => {
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of dirs) {
      let k = 0;
      for (; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= R || cc < 0 || cc >= C || b[rr][cc] !== p) break; }
      if (k === 4) return true;
    }
    return false;
  };
  const play = (b, c, p) => { const n = b.map((x) => x.slice()); n[land(b, c)][c] = p; return n; };
  const legal = [...Array(C).keys()].filter((c) => land(cells, c) >= 0);
  for (const c of legal) if (wins(play(cells, c, me), me)) return c;
  for (const c of legal) if (wins(play(cells, c, opp), opp)) return c;
  const order = [3, 2, 4, 1, 5, 0, 6].filter((c) => legal.includes(c));
  const safe = order.filter((c) => { const b = play(cells, c, me); return ![...Array(C).keys()].some((d) => land(b, d) >= 0 && wins(play(b, d, opp), opp)); });
  return (safe[0] != null ? safe[0] : order[0]);
}
function c4Side(cells, humanSide) { return humanSide === 'p2' ? 'Y' : 'R'; }

async function playConnectFour(page, maxTurns) {
  let turns = 0;
  for (;;) {
    await waitState(page, "!s.live || s.live.turn === 'human' || s.live.turn === 'over'", null, 20000, 'your turn');
    const s = await st(page);
    if (!s.live || s.live.turn === 'over') break;
    const cells = s.live.cells.map((row) => row.map((v) => (v === 'R' || v === 'Y' ? v : '')));
    const col = c4Pick(cells, c4Side(cells, s.live.humanSide));
    const before = s.live.plies;
    const hit = phone(page).locator('.st-stage rect.bd-hit[aria-label="Column ' + (col + 1) + '"]');
    await hit.first().click({ force: true });
    await waitState(page, '!s.live || s.live.plies > ' + before, null, 4000, 'move accepted');
    turns += 1;
    if (turns === 2) await shot(page, '06', 'stage-model-thinking').catch(() => {});
    assert(turns < (maxTurns || 30), 'Connect Four did not finish in ' + turns + ' turns');
  }
  return turns;
}

/* ---------------- Flow 1: cold launch, brand beat, Home ---------------- */
/* theme through the canvas Controls when a button exists (light, dark), else the dev API (neon, club, arcade, midnight) */
async function pickTheme(page) {
  if (await page.locator('[data-cv-theme="' + page.theme + '"]').count()) await page.click('[data-cv-theme="' + page.theme + '"]');
  else await page.evaluate((t) => window.ESApp.dev.setTheme(t), page.theme);
  await page.waitForFunction((t) => window.ESApp.state().theme === t, page.theme, { timeout: 3000 });
}

async function flow1(page) {
  /* the page was loaded by newPage: reload cold and catch the beat */
  await page.evaluate(() => localStorage.clear());
  const t0 = Date.now();
  await page.reload({ waitUntil: 'load' });
  await pickTheme(page);
  /* signed out: Welcome is the only screen, its first paint carries the choreography (brief 3, 7.1) */
  await waitOb(page, 'welcome', 4000);
  assert(await phone(page).locator('.ap-brand').count() === 0, 'a separate brand beat played over Welcome');
  await assertClassicOnly(page, 'welcome');
  await sleep(350);
  await shot(page, '01', 'welcome-first-paint');
  await phone(page).locator('.ob-shell.is-settled').waitFor({ timeout: 2500 });
  const beatMs = Date.now() - t0;
  note('Welcome first paint settled after ' + beatMs + ' ms (incl. load)');
  assert(beatMs < 2600, 'Welcome first paint too long: ' + beatMs + 'ms');
  await expectText(page, /Here, AI plays games\./, 'tagline');
  const wb = await phone(page).locator('.ob-wel').getByRole('button').allInnerTexts();
  assert(wb.length === 1 && wb[0].trim() === 'Play Against AI', 'Welcome buttons are not exactly [Play Against AI]: ' + JSON.stringify(wb));
  await checkVocabulary(page, 'welcome');
  const sc = (await ob(page)).scene;
  assert(sc && sc.sprites >= 18 && sc.fps > 15, 'Welcome scene not running: ' + JSON.stringify(sc));
  note('Welcome scene: ' + sc.sprites + ' sprites, ' + sc.fps + ' fps, layers ' + JSON.stringify(sc.layer));
  /* a returning, signed-in player: cold start goes straight to Home, no beat */
  await signedInFixture(page);
  await pickTheme(page);
  assert(await phone(page).locator('.ap-brand').count() === 0, 'brand beat on a signed-in cold start');
  assert(!(await ob(page)).layer, 'a first-run screen covered Home for a returning player');
  await expectText(page, /Play now/, 'Play now');
  await expectText(page, /Connect Four/, 'Connect Four');
  await expectText(page, /vs Claude Haiku[^·]*· Ready/, 'vs Claude Haiku · Ready');
  await assertHomeSections(page, 'Home');
  await assertHeroAlignment(page, 'Home');
  await checkVocabulary(page, 'home');
  await sleep(1200);
  await shot(page, '02', 'home');
  /* Change table opens the Connect Four table sheet (Play now never does) */
  await tap(page, phone(page).getByRole('button', { name: 'Change table', exact: true }), 'Change table');
  await waitState(page, "s.sheets.some((k) => k.indexOf('table') === 0)", null, 3000, 'table sheet from Change table');
  await sleep(700);
  await expectText(page, /Connect Four/, 'Connect Four table sheet');
  await shot(page, '02b', 'table-sheet-c4');
  /* second launch, still signed in: straight to Home again */
  await page.reload({ waitUntil: 'load' });
  await pickTheme(page);
  assert(await phone(page).locator('.ap-brand').count() === 0, 'brand beat on a second signed-in launch');
  /* scroll Home to the grid and footer */
  await phone(page).locator('.ap-home, [data-screen="home"]').first().evaluate((el) => {
    const sc = [el].concat(Array.from(el.querySelectorAll('*'))).find((n) => n.scrollHeight > n.clientHeight + 10 && /(auto|scroll)/.test(getComputedStyle(n).overflowY));
    if (sc) sc.scrollTop = sc.scrollHeight;
  });
  await sleep(300);
  await checkVocabulary(page, 'home (scrolled to the end)');   /* no footer line (brief 6) */
  await shot(page, '03', 'home-end');
}

/* ---------------- Flow 2: Play now, sign-in, onboarding, riser, play, result, share, play again ---------------- */
async function flow2(page) {
  await skipBrand(page);
  await dev(page, 'modelDelayMs', 700, 1400);
  /* playing needs an account, so Home is always signed in; the sheet appears when the session expired */
  await dev(page, 'expireSignIn');
  await tapButton(page, 'Play now', { exact: true });
  await waitOb(page, 'auth', 4000);
  const s0 = await st(page);
  assert(!s0.sheets.some((k) => k.indexOf('table') === 0), 'Play now opened the table sheet');
  await sleep(450);
  await checkVocabulary(page, 'auth (expired)');
  await shot(page, '04', 'auth-expired');
  await expectText(page, /Your sign-in expired\. Sign in again to start a game\./, 'expired line');
  await tapButton(page, 'Continue with GitHub', { exact: true });
  await waitState(page, "s.screen === 'riser' || s.screen === 'stage'", null, 5000, 'curtain-riser');
  await sleep(250);
  if ((await st(page)).screen === 'riser') await shot(page, '05c', 'riser');
  await waitState(page, "s.screen === 'stage' && s.live", null, 8000, 'stage');
  await sleep(400);
  await shot(page, '05d', 'stage-your-move');
  await checkVocabulary(page, 'stage');
  const turns = await playConnectFour(page, 30);
  note('Connect Four finished after ' + turns + ' human moves');
  await waitState(page, "s.screen === 'result'", null, 8000, 'result curtain');
  await sleep(1800);   /* publication pending -> ready */
  await expectText(page, /You won\.|wins\.|A draw\./, 'outcome word');
  await expectText(page, /Saved to your profile/, 'Saved to your profile');
  await checkVocabulary(page, 'result');
  await shot(page, '07', 'result');
  /* visibility */
  await tap(page, phone(page).getByRole('radio', { name: /Followers/ }), 'visibility Followers');
  await expectText(page, /Approved followers can view this match\./, 'followers description');
  /* share */
  await tapButton(page, 'Share', { exact: true });
  await waitState(page, "s.sheets.some((k) => k.indexOf('share') === 0)", null, 3000, 'share sheet');
  await sleep(500);
  assert(await phone(page).locator('.sh-sheet--share .rs-share, .sh-sheet--share [class*="share"]').count() > 0, 'share card not rendered');
  await shot(page, '08', 'share-card');
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => { const s = document.querySelector('#phone .sh-scrim.is-open'); if (s) s.click(); });
  await waitState(page, "!s.sheets.length", null, 3000, 'share closed');
  await tapButton(page, 'Play again', { exact: true });
  await waitState(page, "(s.screen === 'riser' || s.screen === 'stage') && !!s.live", null, 6000, 'rematch');
  await waitState(page, "s.screen === 'stage'", null, 8000, 'rematch stage');
  await sleep(300);
  await shot(page, '09', 'stage-rematch');
}

/* ---------------- shared UI paths ---------------- */
async function homeScroller(page) {
  return phone(page).locator('[data-screen="home"]').first();
}
async function scrollHomeTo(page, selector) {
  await phone(page).locator(selector).first().scrollIntoViewIfNeeded();
  await sleep(150);
}
/* Home is a sectioned store now (no chips). chooseCategory scrolls to that section and remembers it so
   openArenaTile picks the card from that rail. */
async function chooseCategory(page, label) {
  const sec = phone(page).locator('section.ap-sec[aria-label="' + label + '"]').first();
  await sec.waitFor({ state: 'attached', timeout: 6000 }).catch(() => { throw new FlowError('no Home section ' + label); });
  await sec.scrollIntoViewIfNeeded();
  page.cat = label;
  await sleep(150);
}
async function openArenaTile(page, name) {
  const scope = page.cat ? phone(page).locator('section.ap-sec[aria-label="' + page.cat + '"]') : phone(page).locator('[data-screen="home"]');
  const esc = name.replace(/"/g, '\\"');
  const tile = scope.locator('button[aria-label^="' + esc + ', "]').first();
  await tile.scrollIntoViewIfNeeded();
  await tap(page, tile, 'arena ' + name);
  page.cat = null;
  await waitState(page, "s.sheets.some((k) => k === 'table')", null, 4000, 'table sheet for ' + name);
  await sleep(350);
}
async function sheetFoot(page) { return phone(page).locator('.sh-sheet.is-open').last().locator('.sh-foot'); }
/* An expired session routes Start / Play now to the full-page Auth (brief 4); GitHub resolves it and the intent resumes. */
async function signInThroughSheet(page, opts) {
  opts = opts || {};
  await waitOb(page, 'auth', 4000);
  await sleep(450);
  await expectText(page, /Your sign-in expired\. Sign in again to start a game\./, 'expired line');
  await checkVocabulary(page, 'auth (expired)');
  if (opts.shots) await shot(page, opts.shots, 'auth-expired');
  await tapButton(page, 'Continue with GitHub', { exact: true });
  await waitState(page, 's.signedIn', null, 6000, 'signed in through Auth');
}
async function signInFromHome(page) {
  if ((await st(page)).signedIn) return;   /* the fixture is a returning, signed-in player */
  await tap(page, phone(page).locator('.ap-hdr').getByRole('button', { name: 'Sign in' }), 'Sign in chip');
  await signInThroughSheet(page);
  await waitOb(page, null, 4000);
}
async function startConnectFour(page) {
  await tapButton(page, 'Play now', { exact: true });
  await waitState(page, "s.screen === 'stage' && !!s.live", null, 9000, 'Connect Four stage');
  await sleep(300);
}
async function waitHumanTurn(page, timeout) {
  await waitState(page, "!s.live || s.live.turn === 'human' || s.live.turn === 'over'", null, timeout || 15000, 'your turn');
}
async function dropOnce(page) {
  await waitHumanTurn(page);
  const s = await st(page);
  const cells = s.live.cells.map((row) => row.map((v) => (v === 'R' || v === 'Y' ? v : '')));
  const col = c4Pick(cells, c4Side(cells, s.live.humanSide));
  await phone(page).locator('.st-stage rect.bd-hit[aria-label="Column ' + (col + 1) + '"]').first().click({ force: true });
  await waitState(page, '!s.live || s.live.plies > ' + s.live.plies, null, 4000, 'drop accepted');
}

/* ---------------- [H] signed-in start with a completed profile (Home is never signed out) ---------------- */
async function seedSignedIn(page, favs) {
  await page.evaluate(([th, f]) => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem('eslams-arena-proto') || '{}') || {}; } catch (e) { p = {}; }
    Object.assign(p, { v: 1, themePref: th, signedIn: true, username: 'qa-player', onboarded: true, themePicked: true, launched: true });
    p.profile = Object.assign({ displayName: '', bio: '', location: '', website: '', visibility: 'public' }, p.profile || {}, { favourites: f, complete: true });
    localStorage.setItem('eslams-arena-proto', JSON.stringify(p));
  }, [page.theme, favs || []]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.ESApp && typeof window.ESApp.state === 'function', null, { timeout: 10000 });
  await skipBrand(page);
  await waitState(page, "s.signedIn && s.screen === 'home'", null, 4000, 'signed-in Home');
  await sleep(300);
}
async function pickerSheet(page) { return phone(page).locator('.sh-sheet--roster'); }
async function openPickerFromPin(page) {
  const sheet = phone(page).locator('.sh-sheet--table');
  await tap(page, sheet.locator('.sh-ts-pin .sh-ts-opp').getByRole('button', { name: 'Change', exact: true }), 'Change (pinned opponent)');
  await waitState(page, "s.sheets.some((k) => k === 'roster')", null, 3000, 'opponent picker');
  const picker = await pickerSheet(page);
  await picker.locator('.ap-pick').first().waitFor({ timeout: 3000 });
  await sleep(250);
  return picker;
}
async function pickerFilter(page, label) {
  const picker = await pickerSheet(page);
  await tap(page, picker.locator('.ap-picker-chips .ap-fchip', { hasText: new RegExp('^' + label + '$') }), 'filter ' + label);
  await sleep(150);
}

/* ---------------- Flow 3: personalised Home, arenas, table sheet, opponent picker, Start ---------------- */
async function flow3(page) {
  await dev(page, 'modelDelayMs', 600, 1200);
  /* no favourites: Tic-Tac-Toe hero with the recommended Ready model, no Your games rail */
  await seedSignedIn(page, []);
  let s = await st(page);
  assert(s.hero === 'tic-tac-toe', 'no-favourites hero is ' + s.hero + ', expected tic-tac-toe');
  const hero = phone(page).locator('[data-screen="home"] .ap-gcard-hero');
  assert(await hero.count() === 1, 'hero game card missing');
  assert(/Tic-Tac-Toe/.test(await hero.innerText()), 'hero is not Tic-Tac-Toe');
  assert(/vs Claude Haiku 4\.5 · Ready/.test((await hero.innerText()).replace(/\s+/g, ' ')), 'hero opponent line is not "vs Claude Haiku 4.5 · Ready"');
  assert(await hero.locator('.bd-host').count() === 1, 'hero has no real mini board');
  assert(await phone(page).locator('.ap-yg').count() === 0, 'Your games rail shows with no favourites');
  for (const name of ['Play now', 'Change opponent', 'Change table']) assert(await hero.getByRole('button', { name, exact: true }).count() === 1, 'hero lacks ' + name);
  await checkVocabulary(page, 'home without favourites');
  await sleep(900);
  await shot(page, '10a', 'home-no-favourites');
  /* favourites: the first one is the hero, the rail lists them in pick order */
  await dev(page, 'setFavourites', ['chess', 'connect-four', 'go', 'hex']);
  await waitState(page, "s.hero === 'chess'", null, 3000, 'hero follows the first favourite');
  await sleep(300);
  assert(/Chess/.test(await hero.locator('.ap-gcard-name').innerText()), 'hero did not switch to Chess');
  const rail = phone(page).locator('.ap-yg .ap-gcard-rail');
  assert(await rail.count() === 4, 'Your games rail shows ' + (await rail.count()) + ' cards, expected 4');
  assert(/Chess/.test(await rail.nth(0).innerText()) && /Hex/.test(await rail.nth(3).innerText()), 'rail is not in pick order');
  assert(await rail.nth(1).locator('.bd-host').count() === 1, 'rail card has no poster board');
  assert(await rail.nth(1).locator('.ap-act--play').count() === 1 && /Play/.test(await rail.nth(1).locator('.ap-act--play').innerText()), 'rail card has no Play action');
  await sleep(900);
  await shot(page, '10b', 'home-favourites');
  await phone(page).locator('.ap-yg').evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await sleep(200);
  await shot(page, '10c', 'home-your-games-rail');
  /* sectioned store (no chips): sections in order, See all lists a whole category with the Active pill */
  await assertHomeSections(page, 'Home (favourites)');
  await assertHeroAlignment(page, 'Home (favourites)');
  await chooseCategory(page, 'Board & Strategy');
  let txt = await phoneText(page);
  assert(await phone(page).locator('.ap-chips, .ap-fchip').count() === 0 || await phone(page).locator('[data-screen="home"] .ap-chips').count() === 0, 'filter chips are back on Home');
  await dev(page, 'openSeeAll', 'board');
  await waitState(page, "s.screen === 'seeall' || true", null, 2000, 'see all');
  await sleep(700);
  assert(await phone(page).locator('.ap-seeall-grid .ap-active-pill').count() === 1, 'See all: hero arena has no Active pill');
  assert(/Tic-Tac-Toe/.test(await phone(page).locator('.ap-seeall-grid').innerText()) && !/Poker/.test(await phone(page).locator('.ap-seeall-grid').innerText()), 'See all Board & Strategy lists the wrong arenas');
  await shot(page, '10', 'home-see-all-board');
  await tap(page, phone(page).locator('.ap-push').getByRole('button', { name: 'Back' }), 'Back from See all');
  await sleep(600);
  await chooseCategory(page, 'Board & Strategy');
  await openArenaTile(page, 'Tic-Tac-Toe');
  await expectText(page, /Choose your table/, 'Choose your table');
  const sheet = phone(page).locator('.sh-sheet--table');
  assert(await sheet.locator('.sh-head-wrap .sh-ts-pin .sh-ts-opp').count() === 1, 'opponent is not pinned under the header row');
  assert(await sheet.locator('.sh-ts-rail').count() === 0, 'old suggestion rail is still on the table sheet');
  await shot(page, '11', 'table-sheet-ttt');
  /* change table */
  await tap(page, phone(page).getByRole('radio', { name: /Ultimate/ }), 'Ultimate table');
  await sleep(400);
  await expectText(page, /Ultimate/, 'Ultimate selected');
  /* how to play folded, then expanded inline */
  const dtFolded = await sheet.locator('.sh-ts-help dt').count();
  await tap(page, sheet.getByRole('button', { name: 'More', exact: true }), 'More');
  const dtOpen = await sheet.locator('.sh-ts-help dt').count();
  assert(dtFolded === 3 && dtOpen > 3, 'how to play fold/expand: folded ' + dtFolded + ', expanded ' + dtOpen);
  await sheet.locator('.sh-ts-howto').scrollIntoViewIfNeeded();
  await shot(page, '12', 'table-sheet-howto-expanded');
  await tap(page, sheet.getByRole('button', { name: 'Less', exact: true }), 'Less');
  /* the sheet scrolls inside the phone, Start stays sticky, the opponent stays pinned */
  const body = sheet.locator('.sh-body');
  await body.evaluate((n) => { n.scrollTop = 0; });
  await sleep(100);
  const box = await body.boundingBox();
  const before = await body.evaluate((n) => n.scrollTop);
  const pageY0 = await page.evaluate(() => window.scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 600);
  await sleep(400);
  const after = await body.evaluate((n) => n.scrollTop);
  const pageY1 = await page.evaluate(() => window.scrollY);
  assert(after > before, 'table sheet body did not scroll on wheel (' + before + ' -> ' + after + ')');
  assert(pageY1 === pageY0, 'wheel inside the sheet scrolled the page (' + pageY0 + ' -> ' + pageY1 + ')');
  const footBox = await sheet.locator('.sh-foot').boundingBox();
  const phoneBox = await phone(page).boundingBox();
  assert(footBox && footBox.y + footBox.height <= phoneBox.y + phoneBox.height + 1 && footBox.y > phoneBox.y + phoneBox.height - 160, 'Start is not sticky at the sheet bottom');
  const pinBox = await sheet.locator('.sh-ts-pin .sh-ts-opp').boundingBox();
  assert(pinBox && pinBox.y > phoneBox.y && pinBox.y + pinBox.height < box.y + 4, 'pinned opponent scrolled away with the body');
  await shot(page, '13', 'table-sheet-scrolled');
  /* How to play sheet from the chip */
  await body.evaluate((n) => { n.scrollTop = 0; });
  await tap(page, sheet.getByRole('button', { name: 'How to play' }), 'How to play chip');
  await waitState(page, "s.sheets.some((k) => k === 'howto')", null, 3000, 'how to play sheet');
  await sleep(350);
  await checkVocabulary(page, 'how to play');
  await shot(page, '14', 'howto-sheet');
  await tap(page, phone(page).locator('.sh-sheet--howto').getByRole('button', { name: /Close/ }), 'close how to play');
  await waitState(page, "!s.sheets.some((k) => k === 'howto')", null, 3000, 'how to play closed');
  /* the opponent picker: Recommended four, filters, search, grouped roster */
  await tap(page, sheet.locator('.sh-ts-pin .sh-ts-opp').getByRole('button', { name: 'Change', exact: true }), 'Change (pinned opponent)');
  await waitState(page, "s.sheets.some((k) => k === 'roster')", null, 3000, 'opponent picker');
  const picker = await pickerSheet(page);
  await expectText(page, /Loading full model roster\.\.\./, 'roster loading line');
  await picker.locator('.ap-pick').first().waitFor({ timeout: 3000 });
  await sleep(250);
  await expectText(page, /Choose your opponent/, 'picker title');
  assert(await picker.locator('.ap-pick').count() === 4, 'Recommended row is not four cards');
  assert(await picker.locator('.ap-pick', { hasText: 'Plays this table' }).count() === 4, 'Recommended cards lack "Plays this table"');
  const provs = await picker.locator('.ap-pick-prov').allInnerTexts();
  assert(new Set(provs).size === 4, 'Recommended is not mixed across providers: ' + provs.join(', '));
  assert(await picker.locator('.ap-picker-prov').count() > 5, 'roster is not grouped by provider');
  assert(await picker.locator('.ap-picker-row', { hasText: /Plays \d+ tables?/ }).count() > 10, 'rows lack table coverage');
  await checkVocabulary(page, 'opponent picker');
  await shot(page, '15', 'picker-recommended');
  const dealt = (await picker.locator('.ap-pick-name').allInnerTexts()).join('|');
  await tap(page, picker.getByRole('button', { name: 'Shuffle' }), 'Shuffle');
  await sleep(150);
  assert((await picker.locator('.ap-pick-name').allInnerTexts()).join('|') !== dealt, 'Shuffle did not deal four others');
  await pickerFilter(page, 'Fast');
  assert(await picker.locator('.ap-picker-list').getByText('Slower turns', { exact: true }).count() === 0, 'Fast still lists Slower turns models');
  await picker.locator('.ap-picker-chips').scrollIntoViewIfNeeded();
  await shot(page, '15b', 'picker-filter-fast');
  await pickerFilter(page, 'Frontier labs');
  const groups = await picker.locator('.ap-picker-prov-name').allInnerTexts();
  assert(groups.length > 0 && groups.every((g) => ['Anthropic', 'OpenAI', 'Google', 'xAI', 'DeepSeek', 'Amazon'].includes(g.trim())), 'Frontier labs shows ' + groups.join(', '));
  await pickerFilter(page, 'Ready');
  await picker.locator('input[type="search"]').fill('zzzz');
  await expectText(page, /No models match this search\./, 'empty search line');
  await picker.locator('input[type="search"]').fill('gemini');
  await sleep(200);
  await picker.locator('input[type="search"]').scrollIntoViewIfNeeded();
  await shot(page, '15c', 'picker-search');
  await tap(page, picker.locator('.ap-picker-row', { hasText: 'Gemini 2.5 Flash' }), 'Gemini 2.5 Flash');
  await waitState(page, "!s.sheets.some((k) => k === 'roster')", null, 3000, 'picker closed');
  await sleep(300);
  assert(/Gemini 2\.5 Flash/.test(await sheet.locator('.sh-ts-pin .sh-ts-opp').innerText()), 'pinned opponent did not change to Gemini 2.5 Flash');
  await shot(page, '15d', 'table-sheet-pinned-opponent');
  /* close, then the hidden-information card table (four models) */
  await page.evaluate(() => { const x = Array.from(document.querySelectorAll('#phone .sh-scrim.is-open')).pop(); if (x) x.click(); });
  await waitState(page, '!s.sheets.length', null, 3000, 'table sheet closed');
  await chooseCategory(page, 'Card & Hidden-Info');
  await openArenaTile(page, 'Gin Rummy');
  await expectText(page, /4 models can play hidden-information tables today/, 'hidden-info line on the table sheet');
  await shot(page, '16', 'table-sheet-hidden-info');
  const hp = await openPickerFromPin(page);
  assert(await hp.locator('.ap-pick').count() === 4, 'hidden-info Recommended is not the four capable models');
  assert(await hp.getByRole('button', { name: 'Shuffle' }).count() === 0, 'Shuffle offered with no others to deal');
  await expectText(page, /4 models can play hidden-information tables today/, 'hidden-info line in the picker');
  await pickerFilter(page, 'All');
  await expectText(page, /Not available for this game/, 'Not available for this game under All');
  assert(await hp.locator('.ap-picker-row.is-recede').count() > 10, 'unavailable models do not recede under All');
  await hp.locator('.ap-picker-row.is-recede').first().scrollIntoViewIfNeeded();
  await shot(page, '17', 'picker-hidden-info-all');
  await tap(page, hp.getByRole('button', { name: 'Back' }), 'picker back');
  await waitState(page, "!s.sheets.some((k) => k === 'roster')", null, 3000, 'picker closed');
  /* side */
  const sides = sheet.locator('.sh-ts-sides [role="radio"]');
  await sides.nth(1).scrollIntoViewIfNeeded();
  await sides.nth(1).click();
  await expectText(page, /Model moves first/, 'Model moves first eyebrow');
  await sides.nth(0).click();
  await expectText(page, /You move first/, 'You move first eyebrow');
  /* Start: an expired session opens the sign-in sheet, then the match starts with choices intact */
  const startBtn = sheet.locator('.sh-foot .ap-btn--start');
  assert(/Start game/.test(await startBtn.innerText()), 'signed-in Start label is not "Start game"');
  assert(/Gin Rummy · Ready/.test(await sheet.locator('.sh-ts-ready').innerText()), 'readiness line not "Gin Rummy · Ready"');
  await dev(page, 'expireSignIn');
  await startBtn.click();
  await expectText(page, /Your sign-in expired\. Sign in again to start a game\./, 'expired sign-in line');
  await signInThroughSheet(page, { shots: '18' });
  await waitState(page, "s.screen === 'riser' || s.screen === 'stage'", null, 5000, 'riser after sign-in');
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'gin-rummy'", null, 12000, 'gin rummy stage');
  await sleep(500);
  await expectText(page, /demo/, 'demo pill');
  await shot(page, '19', 'stage-gin-demo');
}

/* ---------------- Flow 4: 4-seat No-Limit Hold'em ---------------- */
async function flow4(page) {
  await skipBrand(page);
  await dev(page, 'modelDelayMs', 300, 600);
  await chooseCategory(page, 'Card & Hidden-Info');
  await openArenaTile(page, 'Poker');
  const sheet = phone(page).locator('.sh-sheet--table');
  await tap(page, sheet.getByRole('radio', { name: /No-Limit Hold'em/ }), "No-Limit Hold'em");
  await sleep(300);
  const ring = sheet.locator('.sh-ts-ring');
  assert(await ring.count() === 1, 'no seat ring');
  await expectText(page, /Seat 1 · you/, 'Seat 1 · you');
  assert(await sheet.locator('.sh-ts-seat', { hasText: 'tap to swap' }).count() === 3, 'expected three model seats');
  await shot(page, '20', 'table-sheet-poker-ring');
  /* your seat 1..4 */
  await tap(page, sheet.locator('.sh-ts-seatseg').getByRole('radio', { name: '3', exact: true }).or(sheet.locator('.sh-ts-seatseg button', { hasText: /^3$/ })), 'Your seat 3');
  await sleep(250);
  await expectText(page, /Seat 3 · you/, 'Seat 3 · you');
  await expectText(page, /Model opens/, 'Model opens');
  /* tap a model seat to swap */
  await tap(page, sheet.locator('.sh-ts-seat', { hasText: 'Seat 1 · tap to swap' }), 'Seat 1 model seat');
  await waitState(page, "s.sheets.some((k) => k === 'roster')", null, 3000, 'seat roster');
  await expectText(page, /Seat 1 · pick a model/, 'Seat 1 · pick a model');
  const roster = phone(page).locator('.sh-sheet--roster');
  await roster.locator('.sh-mrow').first().waitFor({ timeout: 3000 });
  await shot(page, '21', 'roster-seat-pick');
  const pickName = (await roster.locator('.sh-mrow:not(.is-on):not(.is-recede) .sh-mrow-name').first().innerText()).trim();
  await roster.locator('.sh-mrow:not(.is-on):not(.is-recede)').first().click();
  await waitState(page, "!s.sheets.some((k) => k === 'roster')", null, 3000, 'seat roster closed');
  await sleep(250);
  note('Seat 1 swapped to ' + pickName);
  /* Auto-fill and readiness */
  await tap(page, sheet.getByRole('button', { name: 'Auto-fill table' }), 'Auto-fill table');
  await sleep(250);
  assert(/3 model seats · Ready/.test(await sheet.locator('.sh-ts-ready').innerText()), 'readiness is not "3 model seats · Ready"');
  await sheet.locator('.sh-ts-autofill').scrollIntoViewIfNeeded();
  await shot(page, '22', 'table-sheet-poker-autofill');
  await dev(page, 'expireSignIn');
  await sheet.locator('.sh-foot .ap-btn--start').click();
  await signInThroughSheet(page);
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'no-limit-texas-holdem'", null, 12000, 'poker stage');
  await sleep(500);
  await expectText(page, /demo/, 'demo pill');
  await shot(page, '23', 'stage-poker-demo');
  let steps = 0;
  let shotMid = false;
  for (;;) {
    await waitState(page, "!s.live || s.live.turn === 'human' || s.live.turn === 'over'", null, 20000, 'poker your turn');
    const s = await st(page);
    if (!s.live || s.live.turn === 'over') break;
    await tap(page, '.st-demo-step', 'demo step');
    steps += 1;
    if (!shotMid && steps === 2) { shotMid = true; await sleep(300); await shot(page, '24', 'stage-poker-mid'); }
    assert(steps < 30, 'poker demo did not end');
  }
  await waitState(page, "s.screen === 'result'", null, 8000, 'poker result');
  await sleep(1800);
  await expectText(page, /chips\./, 'result in chips');
  await checkVocabulary(page, 'poker result');
  await shot(page, '25', 'result-poker-chips');
  note('poker demo: ' + steps + ' recorded human steps');
}

async function leaveStage(page, choice) {
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'Leave match (x)');
  await waitState(page, "s.sheets.some((k) => k === 'leave')", null, 3000, 'leave sheet');
  await sleep(350);
  return async () => {
    await tap(page, phone(page).locator('.sh-sheet--leave').getByRole('button', { name: new RegExp('^' + choice + '\\b') }), choice);
  };
}
async function startFromArena(page, category, arena, table) {
  await chooseCategory(page, category);
  await openArenaTile(page, arena);
  const sheet = phone(page).locator('.sh-sheet--table');
  if (table) await tap(page, sheet.getByRole('radio', { name: table }), 'table ' + table);
  await sheet.locator('.sh-foot .ap-btn--start').click();
}

/* ---------------- Flow 5: leave, resume, conflict ---------------- */
async function flow5(page) {
  await skipBrand(page);
  await dev(page, 'modelDelayMs', 400, 800);
  await signInFromHome(page);
  await startConnectFour(page);
  await dropOnce(page);
  await waitHumanTurn(page);
  const leave = await leaveStage(page, 'Leave');
  await expectText(page, /Leave match\? The model will be waiting\./, 'leave title');
  await shot(page, '26', 'leave-sheet');
  await leave();
  await waitState(page, "s.screen === 'home' && !!s.live", null, 4000, 'home with live match');
  await sleep(400);
  assert(await phone(page).locator('.ap-resume').count() === 1, 'Resume card missing');
  const firstCard = await phone(page).locator('[data-screen="home"] .ap-resume, [data-screen="home"] .ap-card').first().getAttribute('class');
  assert(/ap-resume/.test(firstCard), 'Resume card is not the top of Home');
  await expectText(page, /Your move/, 'Your move on the resume card');
  await shot(page, '27', 'home-resume-card');
  await tap(page, '.ap-resume', 'Resume card');
  await waitState(page, "s.screen === 'stage'", null, 3000, 'resumed stage');
  /* start another while one is live: the conflict card */
  const leave2 = await leaveStage(page, 'Leave');
  await leave2();
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  await startFromArena(page, 'Board & Strategy', 'Othello');
  await waitState(page, "s.screen === 'riser'", null, 4000, 'riser with conflict');
  await phone(page).locator('.st-rz-conflict').waitFor({ timeout: 3000 });
  await expectText(page, /You have a match in progress: Connect Four vs Claude Haiku, your move\./, 'conflict line');
  await shot(page, '28', 'conflict-card');
  await tapButton(page, 'Resume that match', { exact: true });
  await waitState(page, "s.screen === 'stage' && s.live.slug === 'connect-four'", null, 3000, 'resumed Connect Four');
  const leave3 = await leaveStage(page, 'Leave');
  await leave3();
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  await startFromArena(page, 'Board & Strategy', 'Othello');
  await phone(page).locator('.st-rz-conflict').waitFor({ timeout: 3000 });
  await tapButton(page, 'Start this one instead', { exact: true });
  await expectText(page, /Your Connect Four match will end\./, 'replace note');
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'othello'", null, 9000, 'Othello stage after replace');
  await sleep(500);
  await shot(page, '29', 'stage-othello');
  /* resign through the leave sheet */
  await waitHumanTurn(page);
  const leave4 = await leaveStage(page, 'Resign');
  await leave4();
  await waitState(page, "s.screen === 'result'", null, 5000, 'resigned result');
  await sleep(600);
  await expectText(page, /You resigned on move \d+\./, 'resigned subline');
  await shot(page, '30', 'result-resigned');
  /* a match running on the web */
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home after result');
  await dev(page, 'forceConflict', true);
  await sleep(400);
  await expectText(page, /Playing on the web\. Finish it there or end it here\./, 'web resume card');
  await shot(page, '31', 'home-web-match');
  await tapButton(page, 'Play now', { exact: true });
  await phone(page).locator('.st-rz-conflict').waitFor({ timeout: 4000 });
  await expectText(page, /You have a match in progress: Chess vs GPT-4\.1 mini, your move\./, 'web conflict line');
  await shot(page, '32', 'conflict-card-web');
}

/* ---------------- Flow 6: forced stages, claim, cold and unavailable engine ---------------- */
async function flow6(page) {
  await skipBrand(page);
  await dev(page, 'modelDelayMs', 6000, 7000);
  await signInFromHome(page);
  await startConnectFour(page);
  await dropOnce(page);
  await waitState(page, "s.live && s.live.turn === 'model'", null, 3000, 'model turn');
  /* premove: queue a column during the model's turn; the ghost sits exactly on the landing hole */
  await phone(page).locator('.st-premove .st-pm-col').nth(2).click();
  const off = await page.evaluate(() => {
    const g = document.querySelector('#phone .st-pm-ghost');
    if (!g) return null;
    const gr = g.getBoundingClientRect();
    const gc = [gr.left + gr.width / 2, gr.top + gr.height / 2];
    let best = Infinity;
    document.querySelectorAll('#phone .st-stage .bd-c4-hole').forEach((h) => { const r = h.getBoundingClientRect(); best = Math.min(best, Math.hypot(r.left + r.width / 2 - gc[0], r.top + r.height / 2 - gc[1])); });
    return best;
  });
  assert(off != null && off < 1.5, 'premove ghost is off the landing hole by ' + off + 'px');
  await shot(page, '33a', 'stage-premove-ghost');
  await phone(page).locator('.st-premove .st-pm-col').nth(2).click();      /* tap again to clear it */
  assert(await phone(page).locator('.st-pm-ghost').count() === 0, 'premove did not clear on a second tap');
  await dev(page, 'forceStage', 'thinking');
  await sleep(500);
  await expectText(page, /thinking 0:1\d/, 'thinking clock past 0:10');
  await dev(page, 'forceStage', 'keep_waiting');
  await sleep(400);
  await expectText(page, /Taking longer than usual…/, 'Taking longer than usual…');
  await expectText(page, /You can keep waiting or leave the app\. This match stays active\./, 'keep waiting note');
  await shot(page, '33', 'stage-taking-longer');
  await tapButton(page, 'Keep waiting', { exact: true });
  await waitHumanTurn(page, 8000);
  await dropOnce(page);
  await waitState(page, "s.live && s.live.turn === 'model'", null, 3000, 'model turn 2');
  await dev(page, 'forceStage', 'claim');
  await sleep(400);
  await expectText(page, /Claim the win\. The model never showed\./, 'claim button');
  await shot(page, '34', 'stage-claim');
  await tap(page, phone(page).getByRole('button', { name: /Claim the win/ }), 'Claim the win');
  await waitState(page, "s.screen === 'result'", null, 4000, 'timeout result');
  await sleep(1500);
  await expectText(page, /Claimed on timeout\./, 'claimed subline');
  await expectText(page, /Doesn't count toward your record\. The model never took its turn\./, 'claim footnote');
  await shot(page, '35', 'result-timeout');
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  /* cold engine: the riser escalates */
  await dev(page, 'modelDelayMs', 400, 800);
  await dev(page, 'forceEngine', 'cold');
  await startFromArena(page, 'Board & Strategy', 'Othello');
  await waitState(page, "s.screen === 'riser'", null, 3000, 'riser');
  await expectText(page, /Waking the engine…|Setting the table…/, 'riser status');
  await sleep(1200);
  await expectText(page, /Waking the engine…/, 'Waking the engine…');
  await shot(page, '36', 'riser-waking');
  await sleep(9800);
  await expectText(page, /Taking longer than usual…/, 'riser escalation');
  await shot(page, '37', 'riser-taking-longer');
  await tapButton(page, 'Keep waiting', { exact: true });
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'othello'", null, 8000, 'Othello after cold start');
  await waitHumanTurn(page);
  const leave = await leaveStage(page, 'Resign');
  await leave();
  await waitState(page, "s.screen === 'result'", null, 4000, 'result');
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  /* engine unavailable: one designed state */
  await dev(page, 'forceEngine', 'unavailable');
  await startFromArena(page, 'Board & Strategy', 'Othello');
  await phone(page).getByText('The engine room is busy. Connect Four is ready right now.').waitFor({ timeout: 6000 });
  await shot(page, '38', 'riser-engine-busy');
  await tapButton(page, 'Try again', { exact: true });
  await expectText(page, /Waking the engine…|Setting the table…/, 'retry restarts the riser');
  await phone(page).getByText('The engine room is busy. Connect Four is ready right now.').waitFor({ timeout: 6000 });
  await tapButton(page, 'Play Connect Four', { exact: true });
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'connect-four'", null, 6000, 'switched to Connect Four');
  await dev(page, 'forceEngine', 'ok');
  /* roster backend down */
  const leave2 = await leaveStage(page, 'Resign');
  await leave2();
  await waitState(page, "s.screen === 'result'", null, 4000, 'result');
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await dev(page, 'forceRoster', true);
  await tapButton(page, 'Play now', { exact: true });
  await phone(page).getByText('Opponents are unavailable right now. Try again in a moment.').waitFor({ timeout: 5000 });
  await shot(page, '39', 'riser-roster-down');
}

/* ---------------- Flow 7: RPS, replay, Your matches, Settings ---------------- */
async function flow7(page) {
  await skipBrand(page);
  await dev(page, 'modelDelayMs', 400, 800);
  await signInFromHome(page);
  await startFromArena(page, 'Social & Economic', 'Rock Paper Scissors');
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'rock-paper-scissors'", null, 8000, 'RPS stage');
  await sleep(400);
  await shot(page, '40', 'stage-rps');
  const picks = ['Rock', 'Paper', 'Scissors', 'Paper', 'Rock'];
  for (let i = 0; i < 6; i++) {
    const s = await st(page);
    if (!s.live || s.live.turn !== 'human') break;
    assert(s.live.modelTurn === null, 'RPS waited on a fake model turn');
    const chip = phone(page).locator('.st-stage .bd-t-chip', { has: page.locator('.bd-t-chip-l', { hasText: new RegExp('^' + picks[i % picks.length] + '$') }) });
    await chip.first().click();
    await waitState(page, '!s.live || s.live.plies > ' + s.live.plies, null, 2000, 'RPS reveal');
    const s2 = await st(page);
    assert(!s2.live || s2.live.turn !== 'model', 'RPS handed the turn to the model after a simultaneous pick');
    if (i === 0) { await sleep(450); await shot(page, '41', 'stage-rps-reveal'); }
  }
  await waitState(page, "s.screen === 'result'", null, 5000, 'RPS result');
  await sleep(1600);
  await shot(page, '42', 'result-rps');
  await tapButton(page, 'Watch replay', { exact: true });
  await waitState(page, "s.screen === 'replay'", null, 3000, 'replay');
  await sleep(400);
  const rows = phone(page).locator('.st-rp-row');
  const n = await rows.count();
  const byModel = await phone(page).locator('.st-rp-row .st-rp-by').evaluateAll((els) => els.filter((e) => e.textContent.trim() !== 'You').length);
  assert(n >= 2 && byModel >= 1, 'RPS replay ledger lacks model rows (' + n + ' rows, ' + byModel + ' by the model)');
  await expectText(page, /Hidden-information games publish no reasoning\.|No public reasoning/, 'quiet no-reasoning line');
  await tapButton(page, 'Step forward');
  await tapButton(page, 'Step forward');
  await sleep(400);
  assert(await phone(page).locator('.st-rp-row.is-on').count() === 2, 'both picks of a round should highlight on its frame');
  await shot(page, '43', 'replay-rps');
  /* swipe down dismisses */
  const grab = phone(page).locator('.st-rp-grab');
  const gb = await grab.boundingBox();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
  await page.mouse.down();
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2 + 80, { steps: 4 });
  await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2 + 220, { steps: 6 });
  await page.mouse.up();
  await waitState(page, "s.screen !== 'replay'", null, 3000, 'replay dismissed by swipe');
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  /* Your matches */
  await tap(page, phone(page).locator('.ap-avatar-btn'), 'avatar');
  await sleep(250);
  await shot(page, '44', 'avatar-menu');
  await tap(page, phone(page).getByRole('menuitem', { name: /Your matches/ }).or(phone(page).getByRole('button', { name: /Your matches/ })), 'Your matches');
  await waitState(page, "s.screen === 'matches'", null, 3000, 'Your matches');
  await sleep(500);
  await checkVocabulary(page, 'your matches');
  await shot(page, '45', 'your-matches');
  const cards = phone(page).locator('[data-screen="matches"] .ap-mcard');
  const nCards = await cards.count();
  assert(nCards >= 4, 'Your matches shows ' + nCards + ' match cards, expected the RPS match plus three fixtures');
  assert(await cards.locator('.ap-mchip').count() === nCards, 'a match card lacks its one status chip');
  assert(await cards.locator('.ap-mcard-poster .bd-host').count() === nCards, 'a match card lacks its board poster');
  assert(await cards.getByRole('button', { name: 'Watch the replay' }).count() === nCards, 'a finished match card lacks Watch');
  const chips = (await cards.locator('.ap-mchip').allInnerTexts()).join(' | ');
  assert(/Final \d+–\d+|A draw|chips|points| of /.test(chips), 'status chips are not result words: ' + chips);
  note('Your matches chips: ' + chips);
  await tap(page, cards.filter({ hasText: 'Connect Four' }).getByRole('button', { name: 'Watch the replay' }), 'Watch on the Connect Four match card');
  await waitState(page, "s.screen === 'replay'", null, 3000, 'Connect Four replay');
  await sleep(300);
  for (let i = 0; i < 6; i++) await tapButton(page, 'Step forward');
  await sleep(600);
  await expectText(page, /\. /, 'reasoning in the ledger');
  await shot(page, '46', 'replay-connect-four');
  await tapButton(page, 'Close replay');
  await waitState(page, "s.screen === 'matches'", null, 3000, 'back to Your matches');
  await tapButton(page, 'Back');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  /* Settings */
  await tap(page, phone(page).locator('.ap-avatar-btn'), 'avatar');
  await tap(page, phone(page).getByRole('menuitem', { name: /Settings/ }).or(phone(page).getByRole('button', { name: /^Settings/ })), 'Settings');
  await waitState(page, "s.screen === 'settings'", null, 3000, 'Settings');
  await sleep(400);
  await checkVocabulary(page, 'settings');
  assert(!/watch[^.]*eslams\.com|eslams\.com[^.]*watch/i.test(await phoneText(page)), 'Settings still mentions watching on eslams.com');
  await shot(page, '47', 'settings');
  const other = page.theme === 'dark' ? 'Light' : 'Dark';
  const themeTile = phone(page).getByRole('radio', { name: 'Classic ' + other + ' theme', exact: true });
  await tap(page, (await themeTile.count()) ? themeTile : phone(page).getByRole('radio', { name: other, exact: true }), 'Appearance ' + other);
  await waitState(page, 's.theme === arg', other.toLowerCase(), 2000, 'theme switched in Settings');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.ESApp && window.ESApp.state);
  const persisted = await st(page);
  assert(persisted.themePref === other.toLowerCase() && persisted.theme === other.toLowerCase(), 'theme preference did not persist across reload: ' + persisted.themePref);
  await skipBrand(page);
  /* System follows prefers-color-scheme */
  await page.click('[data-cv-theme="system"]');
  const osScheme = await page.evaluate(() => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  await waitState(page, "s.themePref === 'system' && s.theme === arg", osScheme, 2000, 'System follows the OS');
  if (await page.locator('[data-cv-theme="' + page.theme + '"]').count()) await page.click('[data-cv-theme="' + page.theme + '"]');
  else await dev(page, 'setTheme', page.theme);
  await tap(page, phone(page).locator('.ap-avatar-btn'), 'avatar');
  await tap(page, phone(page).getByRole('menuitem', { name: /Settings/ }).or(phone(page).getByRole('button', { name: /^Settings/ })), 'Settings');
  await waitState(page, "s.screen === 'settings'", null, 3000, 'Settings again');
  for (const label of ['Sound', 'Haptics']) {
    const sw = phone(page).getByRole('switch', { name: label });
    const before = await sw.getAttribute('aria-checked');
    await sw.click();
    assert((await sw.getAttribute('aria-checked')) !== before, label + ' toggle did not flip');
  }
  /* Your games: the same compact tiles as setup; the first pick becomes the Home hero */
  await tap(page, phone(page).getByRole('button', { name: /^Your games/ }), 'Your games row');
  await waitState(page, "s.sheets.some((k) => k === 'favourites')", null, 3000, 'Your games sheet');
  const fav = phone(page).locator('.sh-sheet--favourites');
  await fav.locator('.ap-gcard-compact').first().waitFor({ timeout: 3000 });
  await waitState(page, "s.favourites.join(',') === 'connect-four'", null, 2000, 'fixture favourite');
  await tap(page, fav.locator('.ap-gcard-compact', { has: page.locator('.ap-gcard-name', { hasText: /^Othello$/ }) }), 'Othello tile');
  await waitState(page, "s.favourites.join(',') === 'connect-four,othello'", null, 2000, 'Othello added second');
  await sleep(300);
  assert(await fav.locator('.ap-gcard-compact.is-selected').count() === 2, 'selected tiles do not show the accent ring');
  await shot(page, '47b', 'your-games-sheet');
  await tap(page, fav.locator('.ap-gcard-compact', { has: page.locator('.ap-gcard-name', { hasText: /^Connect Four$/ }) }), 'Connect Four tile');
  await waitState(page, "s.favourites.join(',') === 'othello' && s.hero === 'othello'", null, 2000, 'Othello is now the hero');
  await tap(page, fav.getByRole('button', { name: 'Close' }), 'close Your games');
  await waitState(page, "!s.sheets.some((k) => k === 'favourites')", null, 3000, 'Your games closed');
  await expectText(page, /1 game\b/, 'Your games row count');
  await tap(page, phone(page).getByRole('button', { name: /Delete account/ }), 'Delete account');
  await sleep(300);
  await tap(page, phone(page).getByRole('button', { name: 'Sign out', exact: true }), 'Sign out');
  await waitState(page, "!s.signedIn", null, 3000, 'signed out');
  await waitOb(page, 'welcome', 3000);
}

/* ---------------- Flow 8: reduced motion ---------------- */
async function runningAnims(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return -1;
    return document.getAnimations().filter((a) => {
      const t = a.effect && a.effect.target;
      /* reduced motion keeps 1ms snaps; anything longer is motion */
      const timing = a.effect.getComputedTiming();
      return t && root.contains(t) && a.playState === 'running' && (timing.activeDuration > 2 || timing.activeDuration === Infinity);
    }).map((a) => (a.effect.target.getAttribute('class') || a.effect.target.tagName) + ':' + (a.animationName || a.transitionProperty || 'anim') + ':' + a.effect.getComputedTiming().activeDuration);
  }, selector);
}
async function flow8(page) {
  await skipBrand(page);
  await page.click('label:has(#cv-reduced)');
  await waitState(page, 's.reducedMotion', null, 2000, 'reduced motion on');
  assert(await page.evaluate(() => document.documentElement.classList.contains('reduced-motion')), 'html.reduced-motion not set');
  await sleep(500);
  const a = await phone(page).locator('.ap-pn-board').screenshot();
  await sleep(2600);
  const b = await phone(page).locator('.ap-pn-board').screenshot();
  assert(a.equals(b), 'Play now preview still moves under reduced motion');
  await shot(page, '48', 'home-reduced-motion');
  await dev(page, 'replayBrand');
  await sleep(60);
  assert(await phone(page).locator('.ap-brand.is-static').count() === 1, 'brand beat is not static under reduced motion');
  await phone(page).locator('.ap-brand').waitFor({ state: 'detached', timeout: 2500 });
  await dev(page, 'modelDelayMs', 300, 500);
  await signInFromHome(page);
  await tapButton(page, 'Play now', { exact: true });
  await waitState(page, "s.screen === 'riser' || s.screen === 'stage'", null, 3000, 'riser');
  const riserAnims = await runningAnims(page, '#phone');
  assert(!riserAnims.length || riserAnims === -1, 'animations running on the riser: ' + JSON.stringify(riserAnims).slice(0, 200));
  await waitState(page, "s.screen === 'stage'", null, 6000, 'stage');
  await dropOnce(page);
  const dropAnims = await runningAnims(page, '#phone .st-stage');
  assert(!dropAnims.length, 'disc drop animates under reduced motion: ' + JSON.stringify(dropAnims).slice(0, 200));
  await waitHumanTurn(page);
  const reason = await phone(page).locator('.st-reason').innerText();
  await sleep(120);
  assert(reason.length > 0 && reason === await phone(page).locator('.st-reason').innerText(), 'reasoning is typed on under reduced motion');
  await shot(page, '49', 'stage-reduced-motion');
  await dev(page, 'forceResult', 'win');
  await waitState(page, "s.screen === 'result'", null, 3000, 'result');
  const resAnims = await runningAnims(page, '#phone .st-stage');
  assert(!resAnims.length, 'result curtain animates under reduced motion: ' + JSON.stringify(resAnims).slice(0, 200));
  await shot(page, '50', 'result-reduced-motion');
  await tap(page, phone(page).locator('.st-stage').getByRole('button', { name: 'Leave match' }), 'close result');
  await waitState(page, "s.screen === 'home'", null, 3000, 'home');
  await startFromArena(page, 'Social & Economic', 'Rock Paper Scissors');
  await waitState(page, "s.screen === 'stage' && s.live && s.live.slug === 'rock-paper-scissors'", null, 8000, 'RPS stage');
  await phone(page).locator('.st-stage .bd-t-chip').first().click();
  const revealAnims = await runningAnims(page, '#phone .st-stage');
  assert(!revealAnims.length, 'RPS reveal animates under reduced motion: ' + JSON.stringify(revealAnims).slice(0, 200));
}

/* ---------------- Flow 9: first run, Welcome to a personalised Home (agent G) ---------------- */
async function flow9(page) {
  await waitOb(page, 'welcome', 4000);
  await assertClassicOnly(page, 'welcome');   /* even with a material theme set on the canvas */
  await page.click('[data-cv-theme="system"]');     /* a new install follows the OS, so Theme pick opens on Follow system */
  await assertClassicOnly(page, 'welcome (system)');
  await sleep(1100);
  await shot(page, '60', 'welcome');
  await checkVocabulary(page, 'welcome');
  await dev(page, 'forceTaken', true);
  /* Welcome has ONE button; it opens the full-page Auth */
  await tapButton(page, 'Play Against AI', { exact: true });
  await waitOb(page, 'auth', 3000);
  await waitForAuthStep(page, 'choose');
  await assertClassicOnly(page, 'auth');
  await sleep(450);
  await checkVocabulary(page, 'auth choose');
  assert(await phone(page).locator('.au-page').count() === 1 && await phone(page).locator('.sh-sheet--signin').count() === 0, 'Auth is not a full page');
  const order = await phone(page).locator('.au-btn').allInnerTexts();
  assert(JSON.stringify(order.map((x) => x.trim())) === JSON.stringify(['Continue with Google', 'Continue with GitHub', 'Continue with Apple', 'Continue with email']), 'Auth provider order: ' + JSON.stringify(order));
  await shot(page, '61a', 'auth-choose');
  /* email-first: a new address routes to Create account (12-character rule, live counter) */
  await tapButton(page, 'Continue with email', { exact: true });
  await waitForAuthStep(page, 'email');
  await expectText(page, /Continue with email/, 'email step title');
  await phone(page).getByRole('textbox', { name: 'Email' }).fill('new-player@lab.ai');
  await shot(page, '61b', 'auth-email');
  await tapButton(page, 'Continue', { exact: true });
  await waitForAuthStep(page, 'create');
  await expectText(page, /Create your account/, 'create title');
  assert(await phone(page).getByRole('button', { name: 'Edit email' }).count() === 1, 'no Edit link on Create');
  const pw = phone(page).getByRole('textbox', { name: 'Password' });
  await pw.fill('correct-ho');
  await expectText(page, /2 more characters/, 'password counter');
  await shot(page, '61', 'auth-create-account');
  await pw.fill('correct-horse-battery');
  await sleep(250);
  await phone(page).locator('.au-primary').click();
  await waitOb(page, 'setup', 6000);
  await assertClassicOnly(page, 'setup');
  const input = phone(page).locator('.ob-handle-input');
  const h0 = await input.inputValue();
  assert(/^[a-z]+-[a-z]+-\d{2}$/.test(h0), 'generated handle shape: ' + h0);
  await expectText(page, new RegExp('eslams\\.com/' + h0), 'live handle preview');
  await expectText(page, /You're almost in\./, 'setup title');
  await checkVocabulary(page, 'profile setup');
  for (const gone of [/3 to 32 characters/i, /Change this any time in Settings/i, /add the rest later in Settings/i]) {
    assert(!gone.test(await phoneText(page)), 'removed helper line present: ' + gone);
  }
  const prev = (await phone(page).locator('.ob-handle-dom, .ob-handle-line').first().innerText()).replace(/\s+/g, '');
  assert(prev === 'eslams.com/' + h0, 'preview is not exactly eslams.com/<handle>: ' + prev);
  await sleep(250);
  await shot(page, '62', 'setup-empty');
  await tapButton(page, 'New handle', { exact: true });
  assert((await input.inputValue()) !== h0, 'shuffle did not regenerate the handle');
  /* dynamic, specific errors; Create account disabled while invalid */
  const errs = [['ab', /Needs at least 3 characters\. 1 more\./, 'short'], ['a'.repeat(35), /32 characters max\. You're 3 over\./, 'long'],
    ['ab_c.d', /Only lowercase letters, digits and hyphens\. Remove /, 'chars'], ['-abc', /Can't start or end with a hyphen\./, 'hyphen'], ['admin', /That handle is reserved\./, 'reserved']];
  for (const [val, re, tag] of errs) {
    await input.fill(val);
    await sleep(120);
    await expectText(page, re, 'handle error ' + tag);
    assert(await phone(page).locator('.ob-submit').isDisabled(), 'Create account enabled on ' + tag);
    assert(!new RegExp('eslams\\.com/' + val).test(await phoneText(page)), 'preview still shown while invalid (' + tag + ')');
  }
  await input.fill('Qa First-Run');   /* forgiving: lowercased, space to hyphen, silently */
  assert((await input.inputValue()) === 'qa-first-run', 'handle not normalised: ' + (await input.inputValue()));
  assert(!(await phone(page).locator('.ob-submit').isDisabled()), 'Create account disabled on a valid handle');
  await expectText(page, /eslams\.com\/qa-first-run/, 'preview returns when valid');
  /* a simulated 409 username_taken: the field regenerates and says so */
  await phone(page).locator('.ob-submit').click();
  await phone(page).getByText('That handle is taken. Here is a new one.').waitFor({ timeout: 4000 })
    .catch(() => { throw new FlowError('taken handle message did not appear'); });
  const h2 = await input.inputValue();
  assert(h2 !== 'qa-first-run' && /^[a-z]+-[a-z]+-\d{2}$/.test(h2), 'taken handle not regenerated: ' + h2);
  assert((await ob(page)).screen === 'setup', 'left setup on a taken handle');
  await shot(page, '63', 'setup-taken');
  const priv = phone(page).getByRole('radio', { name: /Private/ });
  await priv.click();
  assert((await priv.getAttribute('aria-checked')) === 'true', 'Private did not select');
  await phone(page).getByRole('radio', { name: /Public/ }).click();
  await phone(page).locator('.ob-bio').fill('Chess at lunch, Hex at night.');
  await expectText(page, /29\/160/, 'bio counter');
  const loc = phone(page).locator('.ob-loc');
  await loc.fill('lond');
  const opt = phone(page).locator('.ob-loc-opt', { hasText: 'London, United Kingdom' }).first();
  await opt.waitFor({ timeout: 2000 });
  assert(await phone(page).locator('.ob-loc-opt').count() <= 6, 'more than six location matches');
  await shot(page, '64a', 'setup-location');
  await opt.dispatchEvent('pointerdown');
  assert((await loc.inputValue()) === 'London, United Kingdom', 'location pick did not fill the field');
  for (const slug of ['chess', 'hex']) {
    const tile = phone(page).locator('.ob-ggrid [data-slug="' + slug + '"]').first();
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
  }
  const chessLabel = await phone(page).locator('.ob-ggrid [data-slug="chess"]').first().getAttribute('aria-label');
  assert(/selected, favourite 1/.test(chessLabel), 'first favourite not announced: ' + chessLabel);
  await sleep(200);
  await shot(page, '64', 'setup-filled');
  await phone(page).locator('.ob-submit').click();
  await waitOb(page, 'themepick', 5000);
  /* Theme pick, once: Follow system preselected, six tiles, instant apply */
  await expectText(page, /Pick a look\./, 'theme pick title');
  const follow = phone(page).getByRole('radio', { name: /^Follow system/ });
  assert((await follow.getAttribute('aria-checked')) === 'true', 'Follow system is not preselected');
  assert(await phone(page).locator('.ob-th-tile').count() === 6, 'theme pick does not show six tiles');
  await checkVocabulary(page, 'theme pick');
  await sleep(250);
  await shot(page, '65', 'theme-pick');
  await phone(page).getByRole('radio', { name: 'Neon theme' }).click();
  assert((await ob(page)).theme === 'neon', 'Neon did not apply to the phone');
  await sleep(150);
  await shot(page, '66', 'theme-pick-neon');
  await follow.click();
  assert((await ob(page)).theme === (page.theme === 'dark' ? 'dark' : 'light'), 'Follow system did not return to the OS theme');
  await tapButton(page, 'Continue', { exact: true });
  await waitOb(page, null, 3000);
  const s = await st(page);
  assert(s.signedIn && s.screen === 'home', 'not on Home after Theme pick: ' + s.screen);
  const hero = s.hero || (s.setup && s.setup.game);
  assert(hero === 'chess', 'Home hero is not the first favourite: ' + hero);
  const acct = await page.evaluate(() => ({ p: window.ESApp.profile, f: window.ESApp.firstRun }));
  assert(acct.p.complete && acct.p.favourites.join(',') === 'chess,hex' && acct.p.location === 'London, United Kingdom' && acct.p.handle === h2 && acct.f.themePicked,
    'profile not persisted: ' + JSON.stringify(acct));
  await sleep(700);
  await expectText(page, /Chess/, 'Chess on Home');
  await assertHomeSections(page, 'Home after setup');
  await checkVocabulary(page, 'home after setup');
  await shot(page, '67', 'home-after-setup');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.ESApp && window.ESApp.state);
  await sleep(300);
  assert(!(await ob(page)).layer, 'a first-run screen came back after relaunch: ' + JSON.stringify(await ob(page)));
}
async function waitForAuthStep(page, step, timeout) {
  try { await page.waitForFunction((x) => window.ESAuth && window.ESAuth.state().step === x, step, { timeout: timeout || 4000 }); }
  catch (e) { throw new FlowError('timeout waiting for auth step ' + step + ' | ' + JSON.stringify(await page.evaluate(() => window.ESAuth && window.ESAuth.state()))); }
}

/* ---------------- Flow 10: sign out to Welcome, Play Against AI, Auth (OAuth, email + password, 2FA) ---------------- */
async function flow10(page) {
  await sleep(300);
  assert(!(await ob(page)).layer, 'first-run layer over a returning player');
  await tap(page, phone(page).locator('.ap-avatar-btn'), 'avatar');
  await tap(page, phone(page).getByRole('menuitem', { name: /Sign out/ }), 'Sign out');
  await waitState(page, '!s.signedIn', null, 3000, 'signed out');
  await waitOb(page, 'welcome', 3000);
  /* open item 1: Welcome after sign out keeps the stored theme (this build's reading) */
  const pref = await page.evaluate(() => window.ESApp.firstRun.themePref);
  assert(pref === page.theme, 'sign out did not keep the theme: ' + pref);
  await sleep(900);
  await shot(page, '70', 'welcome-after-sign-out');
  await tapButton(page, 'Play Against AI', { exact: true });
  await waitForAuthStep(page, 'choose');
  await sleep(400);
  await shot(page, '71', 'auth-sign-in');
  /* back reverses the world: Auth back returns to Welcome */
  await tap(page, phone(page).locator('.au-back'), 'Back');
  await waitOb(page, 'welcome', 3000);
  await tapButton(page, 'Play Against AI', { exact: true });
  await waitForAuthStep(page, 'choose');
  /* OAuth hand-off state, then success for an existing account goes straight Home */
  await tapButton(page, 'Continue with GitHub', { exact: true });
  await waitForAuthStep(page, 'oauth-wait');
  await expectText(page, /Waiting for GitHub/, 'oauth waiting');
  await sleep(250);
  await shot(page, '71b', 'auth-oauth-wait');
  await waitState(page, 's.signedIn', null, 6000, 'signed in via GitHub');
  await waitOb(page, null, 4000);
  let s = await st(page);
  assert(s.screen === 'home' && s.username === 'qa-player', 'existing account did not go straight Home: ' + s.screen + ' ' + s.username);
  await sleep(500);
  await shot(page, '72', 'home-after-sign-in');
  /* email + password for a remembered address, with a two-factor step */
  /* (dev.setSignedIn(false) lands on Home with a Sign in chip: the Pending approval edit, not applied) */
  await tap(page, phone(page).locator('.ap-avatar-btn'), 'avatar');
  await tap(page, phone(page).getByRole('menuitem', { name: /Sign out/ }), 'Sign out');
  await waitOb(page, 'welcome', 3000);
  await dev(page, 'forceTwoFactor', true);
  await page.evaluate(() => { const k = 'eslams-arena-proto'; const p = JSON.parse(localStorage.getItem(k) || '{}'); p.authEmails = ['qa@lab.ai']; localStorage.setItem(k, JSON.stringify(p)); });
  await tapButton(page, 'Play Against AI', { exact: true });
  await waitForAuthStep(page, 'choose');
  await tapButton(page, 'Continue with email', { exact: true });
  await waitForAuthStep(page, 'email');
  await phone(page).getByRole('textbox', { name: 'Email' }).fill('qa@lab.ai');
  await tapButton(page, 'Continue', { exact: true });
  await waitForAuthStep(page, 'password');
  await expectText(page, /Enter your password/, 'password title');
  await checkVocabulary(page, 'auth password');
  await shot(page, '73', 'auth-password');
  await phone(page).getByRole('textbox', { name: 'Password' }).fill('anything');
  await phone(page).getByRole('button', { name: 'Continue', exact: true }).click();
  await waitForAuthStep(page, 'twofactor');
  const code = phone(page).locator('input[autocomplete="one-time-code"]');
  await code.fill('111111');
  await phone(page).getByRole('button', { name: 'Verify and continue' }).click();
  await expectText(page, /didn't work/, 'wrong code line');
  await code.fill('123456');
  await phone(page).getByRole('button', { name: 'Verify and continue' }).click();
  await waitState(page, 's.signedIn', null, 6000, 'signed in via email');
  await dev(page, 'forceTwoFactor', false);
  await waitOb(page, null, 4000);
  s = await st(page);
  assert(s.screen === 'home', 'email sign-in did not reach Home: ' + s.screen);
}

/* ---------------- Flow 11: six themes and the desktop frame (agent G) ---------------- */
const SIX = ['light', 'dark', 'neon', 'club', 'arcade', 'midnight'];
const BG = { neon: '#06060b', club: '#efe7d7', arcade: '#020604', midnight: '#000000' };
/* small text below AA against its nearest opaque background (skips boards and gradients) */
async function lowContrast(page) {
  return page.evaluate(() => {
    const parse = (c) => {
      let m = /rgba?\(([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
      m = /color\(srgb ([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(/[ /]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 }; }
      return null;
    };
    const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const phoneEl = document.getElementById('phone');
    const pr = phoneEl.getBoundingClientRect();
    const out = [];
    const walker = document.createTreeWalker(phoneEl, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const t = walker.currentNode;
      const el = t.parentElement;
      if (!el || seen.has(el) || !t.textContent.trim()) continue;
      seen.add(el);
      if (el.closest('.bd-host, [aria-hidden="true"], .sr-only, .ob-th-skin, [disabled]')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < pr.top || r.top > pr.bottom || r.right < pr.left || r.left > pr.right) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.5) continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      let n = el, bg = null;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if (s.backgroundImage && s.backgroundImage !== 'none') { bg = 'image'; break; }
        const c = parse(s.backgroundColor);
        if (c && c.a > 0.85) { bg = c; break; }
        n = n.parentElement;
      }
      if (!bg || bg === 'image') continue;
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      const k = ratio(fg, bg);
      if (k < need - 0.05) out.push(t.textContent.trim().slice(0, 40) + ' @' + k.toFixed(2) + ' (' + (el.className || el.tagName) + ')');
    }
    return out.slice(0, 12);
  });
}
async function sweepThemes(page, id, name) {
  for (const th of SIX) {
    await page.evaluate((t) => window.ESOnboard.applyTheme(t), th);
    await sleep(120);
    const got = await page.evaluate(() => ({ th: document.getElementById('phone').getAttribute('data-theme'), bg: getComputedStyle(document.getElementById('phone')).getPropertyValue('--bg').trim().toLowerCase() }));
    assert(got.th === th, 'theme ' + th + ' did not apply (' + got.th + ')');
    if (BG[th]) assert(got.bg === BG[th], th + ' lost to the OS scheme: --bg ' + got.bg);
    const low = await lowContrast(page);
    if (low.length) note(name + ' ' + th + ': ' + low.join(' | '));
    await shot(page, id + '-' + th, name);
  }
}
async function flow11(page) {
  await dev(page, 'modelDelayMs', 4000, 5000);
  await sleep(500);
  if (page.theme !== 'light') {
    /* under a dark OS, every fixed skin must still win over the system-dark block */
    for (const th of ['neon', 'club', 'arcade', 'midnight']) {
      await page.evaluate((t) => window.ESOnboard.applyTheme(t), th);
      const bg = await page.evaluate(() => getComputedStyle(document.getElementById('phone')).getPropertyValue('--bg').trim().toLowerCase());
      assert(bg === BG[th], th + ' lost to the dark OS scheme: --bg ' + bg);
    }
    await page.evaluate(() => window.ESOnboard.applyTheme('light'));
  }
  await sweepThemes(page, '80', 'home');
  await dev(page, 'openTable', 'no-limit-texas-holdem');
  await waitState(page, "s.sheets.some((k) => k === 'table')", null, 4000, 'poker table sheet');
  await sleep(500);
  await sweepThemes(page, '81', 'table-sheet');
  await dev(page, 'startMatch', 'connect-four');
  await waitState(page, "s.screen === 'stage' && !!s.live", null, 9000, 'stage');
  await dropOnce(page);
  await sleep(600);
  await sweepThemes(page, '82', 'stage');
  await dev(page, 'forceResult', 'win');
  await waitState(page, "s.screen === 'result'", null, 4000, 'result');
  await sleep(1800);
  await sweepThemes(page, '83', 'result');
  await page.evaluate(() => window.ESOnboard.applyTheme('light'));
  /* Welcome is the live scene (no board rotation): it runs, with real depth, in the Classic skin */
  await dev(page, 'resetFirstRun');
  await dev(page, 'openWelcome');
  await sleep(1500);
  const sc = (await ob(page)).scene;
  assert(sc && sc.sprites >= 18 && sc.fps > 15, 'Welcome scene not running: ' + JSON.stringify(sc));
  await assertClassicOnly(page, 'welcome (flow 11)');
  await shot(page, '84', 'welcome-scene');
  /* Profile setup on the phone and in the desktop frame: empty, filled, taken */
  for (const desk of [false, true]) {
    await dev(page, 'setDesktop', desk);
    const tag = desk ? 'desktop' : 'phone';
    if (desk) { await dev(page, 'openWelcome'); await sleep(1500); await shot(page, '85-desktop', 'welcome'); }
    await dev(page, 'openSetup');
    await waitOb(page, 'setup', 3000);
    await sleep(200);
    await shot(page, '86-' + tag, 'setup-empty');
    await phone(page).locator('.ob-bio').fill('Chess at lunch, Hex at night.');
    await phone(page).locator('.ob-loc').fill('Lisbon, Portugal');
    for (const slug of ['othello', 'chess', 'go']) await phone(page).locator('.ob-ggrid [data-slug="' + slug + '"]').first().click();
    await shot(page, '87-' + tag, 'setup-filled');
    await dev(page, 'forceTaken', true);
    await phone(page).locator('.ob-submit').click();
    await sleep(900);
    await shot(page, '88-' + tag, 'setup-taken');
  }
  await dev(page, 'openThemePick');
  await sleep(300);
  await shot(page, '89-desktop', 'theme-pick');
  await dev(page, 'setDesktop', false);
  await page.evaluate(() => window.ESOnboard.applyTheme('system'));
}

/* ---------------- main ---------------- */
const FLOW_FNS = { 1: ['Cold launch, brand beat, Home', flow1], 2: ['Play now to result, share, play again', flow2] };
if (typeof flow3 === 'function') FLOW_FNS[3] = ['Personalised Home, arenas, table sheet, opponent picker, Start', flow3];
if (typeof flow4 === 'function') FLOW_FNS[4] = ["4-seat No-Limit Hold'em demo", flow4];
if (typeof flow5 === 'function') FLOW_FNS[5] = ['Leave, Resume card, conflict card', flow5];
if (typeof flow6 === 'function') FLOW_FNS[6] = ['Forced stages, claim the win, cold and unavailable engine', flow6];
if (typeof flow7 === 'function') FLOW_FNS[7] = ['Your matches, replay, settings', flow7];
if (typeof flow8 === 'function') FLOW_FNS[8] = ['Reduced motion', flow8];
FLOW_FNS[9] = ['First run: Welcome, create account, setup (taken handle, favourites), Theme pick, Home', flow9];
FLOW_FNS[10] = ['Sign out to Welcome, Play Against AI, Auth (OAuth, email, 2FA), Home', flow10];
FLOW_FNS[11] = ['Six themes on Home, table sheet, Stage, result; Welcome games; desktop setup', flow11];

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: headlessShell(), headless: !process.env.HEADED });
  const ids = Object.keys(FLOW_FNS).map(Number).filter((n) => !ONLY || ONLY.includes(n));
  for (const theme of THEMES) {
    for (const id of ids) {
      const [title, fn] = FLOW_FNS[id];
      current = { id, theme, title, ok: false, notes: [], errors: [], warnings: [], ms: 0 };
      const t0 = Date.now();
      let page = null;
      try {
        page = await newPage(browser, theme, { reducedMotion: id === 8, firstRun: id === 9 });
        await fn(page);
        current.ok = true;
      } catch (e) {
        current.fail = e instanceof FlowError ? e.message : (e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : String(e));
        if (page) await page.locator('#phone').screenshot({ path: path.join(SHOTS, 'FAIL-flow' + id + '-' + theme + SHOT_SUFFIX + '.png') }).catch(() => {});
      }
      if (page) {
        current.errors = page.errors.slice();
        current.warnings = page.warnings.slice();
        if (current.errors.length) current.ok = false;
        await page.context().close().catch(() => {});
      }
      current.ms = Date.now() - t0;
      results.push(current);
      const tag = current.ok ? 'PASS' : 'FAIL';
      console.log(tag + '  flow ' + id + ' [' + theme + '] ' + title + '  (' + (current.ms / 1000).toFixed(1) + 's)');
      if (current.fail) console.log('      ' + current.fail);
      current.errors.forEach((e) => console.log('      console error: ' + e.slice(0, 300)));
      current.warnings.forEach((w) => console.log('      warning: ' + w.slice(0, 200)));
      current.notes.forEach((n) => console.log('      note: ' + n));
    }
  }
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' flow runs passed against ' + BASE);
  fs.writeFileSync(path.join(__dirname, 'last-run' + SHOT_SUFFIX + '.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
