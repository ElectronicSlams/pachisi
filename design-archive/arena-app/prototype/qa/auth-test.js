'use strict';
const path = require('path');
const { chromium } = require(require.resolve('@playwright/test', { paths: ['~/Downloads/eSlams/eSlamsPlatform/apps/web'] }));
const URL = 'file://' + path.join(__dirname, 'auth-test.html');
const SH = (n) => path.join(__dirname, 'shots', 'A-' + n + '.png');
(async () => {
  const fs=require('fs'),os=require('os');const root=path.join(os.homedir(),'Library/Caches/ms-playwright');let ex;try{for(const d of fs.readdirSync(root).filter(d=>/^chromium_headless_shell-\d+$/.test(d)).sort().reverse()){const q=path.join(root,d,'chrome-headless-shell-mac-arm64','chrome-headless-shell');if(fs.existsSync(q)){ex=q;break;}}}catch(e){}
  const b = await chromium.launch({ executablePath: ex }); const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push(String(e)));
  const step = () => p.evaluate(() => ESAuth.state().step);
  const log = () => p.evaluate(() => JSON.stringify(__log));
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  const scr = (n) => p.locator('#phone').screenshot({ path: SH(n) });
  const sub = async () => { await p.click('.au-screen:last-child .au-primary'); };
  await p.goto(URL); await p.evaluate(() => localStorage.clear());
  await scr('01-choose');
  ok((await p.locator('.au-btn').count()) === 4, 'four buttons');
  // OAuth
  await p.click('[data-provider=google]'); ok((await p.textContent('.au-wait-txt')).includes('Waiting for Google'), 'oauth wait'); await scr('02-oauth-wait');
  await p.click('.au-cancel'); await p.waitForTimeout(300); ok((await step()) === 'choose', 'cancel -> choose');
  await p.click('[data-provider=github]'); await p.waitForTimeout(1000); ok((await step()) === 'signing', 'signing'); await scr('03-signing');
  await p.waitForTimeout(700); ok((await log()).includes('"provider":"github"'), 'oauth authed');
  // legal + back
  await p.evaluate(() => mount()); await p.click('.au-legal .au-link'); ok((await p.textContent('.au-note')).includes('system browser'), 'legal note');
  await p.keyboard.press('Escape'); ok((await log()).includes('back'), 'escape on choose -> onBack');
  // email: invalid, new -> create
  await p.evaluate(() => { __log = []; mount(); }); await p.click('.au-btn--email'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.activeElement.type === 'email'), 'email autofocus');
  await sub(); ok((await p.textContent('.au-screen:last-child .au-err')).length > 0, 'empty error');
  await p.fill('input[type=email]', 'bad@'); await sub(); await scr('04-email-error');
  await p.fill('input[type=email]', 'ada@lab.ai'); await sub(); await p.waitForTimeout(900);
  ok((await step()) === 'create', 'unknown -> create'); await scr('05-create-security');
  ok(await p.locator('.au-screen:last-child .au-primary').isDisabled(), 'create disabled during check');
  await p.fill('.au-input--pw', 'abcdefghi'); ok((await p.textContent('.au-fb')) === '3 more characters', 'dynamic 3');
  await p.fill('.au-input--pw', 'abcdefghijk'); ok((await p.textContent('.au-fb')) === '1 more character', 'singular');
  await p.click('.au-eye'); await scr('06-create-typing');
  await p.waitForTimeout(1500); ok(!(await p.locator('.au-screen:last-child .au-primary').isDisabled()), 'enabled after check');
  await p.fill('.au-input--pw', 'abcdefghijkl'); ok((await p.textContent('.au-fb')) === '', 'nothing when satisfied');
  await scr('07-create-ready');
  await sub(); await p.waitForTimeout(800); ok((await log()).includes('"isNew":true'), 'create authed isNew');
  // known -> password, with 2FA
  await p.evaluate(() => { __log = []; __tf = true; mount(); }); await p.click('.au-btn--email'); await p.waitForTimeout(300);
  await p.fill('input[type=email]', 'ada@lab.ai'); await sub(); await p.waitForTimeout(900);
  ok((await step()) === 'password', 'known -> password');
  await p.click('.au-forgot'); await p.fill('.au-input--pw', 'x'); await scr('08-password');
  await sub(); await p.waitForTimeout(300); ok((await step()) === 'twofactor', '2fa');
  await p.fill('.au-code', '111111'); await sub(); await scr('09-twofactor-error');
  await p.click('[role=tab]:nth-child(2)'); await scr('10-recovery');
  await p.click('[role=tab]:nth-child(1)'); await p.fill('.au-code', '123456'); await sub(); await p.waitForTimeout(800);
  ok((await log()).includes('"isNew":false'), 'password+2fa authed');
  // new@ -> create even if seen; back edits email
  await p.evaluate(() => { __tf = false; mount({ oauthError: 'access_denied' }); }); await scr('11-oauth-error');
  await p.click('.au-btn--email'); await p.waitForTimeout(300); await p.fill('input[type=email]', 'new@lab.ai'); await sub(); await p.waitForTimeout(900);
  ok((await step()) === 'create', 'new@ -> create'); await p.click('.au-edit'); await p.waitForTimeout(300); ok((await step()) === 'email', 'edit -> email');
  // dark + desktop
  await p.evaluate(() => { document.getElementById('phone').setAttribute('data-theme', 'dark'); mount({ expired: true }); }); await scr('12-choose-dark');
  await p.evaluate(() => { const ph = document.getElementById('phone'); ph.setAttribute('data-theme', 'light'); ph.classList.add('ob-desktop'); ph.style.width = '1024px'; ph.style.height = '720px'; mount(); });
  await p.setViewportSize({ width: 1060, height: 760 }); await scr('13-desktop');
  ok(errs.length === 0, 'zero console errors ' + JSON.stringify(errs));
  await b.close();
})();
