/* =====================================================================
   eSlams Arena app prototype  |  src/auth.js  [agent A]  |  window.ESAuth
   ---------------------------------------------------------------------
   Authentication as a full page (POLISH_CONTRACT.md section 2, brief 4).
     ESAuth.build(opts) -> <section class="au-page">
       opts { onBack(), onAuthed({ isNew, provider, email }), expired,
              oauthError, reduced: () => bool, appState: () => state }
     ESAuth.state() -> { step, email, provider }
   Steps: choose -> oauth-wait -> [twofactor] -> signing
          choose -> email -> (lookup 600 ms) -> password -> [twofactor] -> signing
                                             -> create -> signing
   Simulated: any OAuth succeeds, any password works, code 123456 passes.
   Tokens only; every class is prefixed .au-.
   ===================================================================== */
(function () {
  'use strict';
  const W = window;
  const AU = {};
  W.ESAuth = AU;
  const STORE = 'eslams-arena-proto';
  const PROVIDERS = { google: 'Google', github: 'GitHub', apple: 'Apple' };
  let current = { step: null, email: '', provider: null };

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    kids.flat(4).forEach((c) => { if (c == null || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  }
  function warn(where, e) { try { console.warn('[ESAuth] ' + where + ': ' + (e && e.message ? e.message : e)); } catch (x) { /* none */ } }
  function safe(fn, fallback, where) { try { return fn(); } catch (e) { warn(where || 'call', e); return fallback; } }
  function t(key, fallback) {
    const c = safe(() => W.ESD && W.ESD.copy ? W.ESD.copy[key] : undefined, undefined, 'copy');
    return typeof c === 'string' && c ? c : fallback;
  }
  function icon(name, size) {
    const m = safe(() => (W.ESA && W.ESA.icon ? W.ESA.icon(name, size || 20) : ''), '', 'icon') || '';
    return h('span', { class: 'au-ic', 'aria-hidden': 'true', html: m });
  }
  function readStore() { return safe(() => JSON.parse(W.localStorage.getItem(STORE) || '{}') || {}, {}, 'store.read'); }
  function knownEmails() { const s = readStore(); return Array.isArray(s.authEmails) ? s.authEmails : []; }
  function rememberEmail(email) {
    if (!email) return;
    safe(() => {
      const s = readStore();
      const list = Array.isArray(s.authEmails) ? s.authEmails : [];
      if (list.indexOf(email) < 0) list.push(email);
      s.authEmails = list;
      W.localStorage.setItem(STORE, JSON.stringify(s));
    }, null, 'store.write');
  }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

  AU.state = function () { return { step: current.step, email: current.email, provider: current.provider }; };

  AU.build = function (opts) {
    opts = opts || {};
    const isReduced = () => !!safe(() => (opts.reduced ? opts.reduced() : false), false, 'reduced');
    const appState = () => safe(() => (opts.appState ? opts.appState() : (W.ESApp ? W.ESApp.state() : {})), {}, 'appState') || {};
    const twoFactorOn = () => !!safe(() => appState().dev.twoFactorProviders, false, 'dev');
    const st = { step: 'choose', stack: [], email: '', pw: '', showPw: false, provider: null, isNew: false,
      tf: 'auth', code: '', trust: false, err: null, note: null, security: 'idle', timers: [] };
    let info = null;
    if (opts.oauthError) info = safe(() => W.ESD.copy.oauthErrors[opts.oauthError], null, 'oauthErrors') || 'Sign-in did not complete. Try again.';
    else if (opts.expired) info = t('signInExpired', 'Your sign-in expired. Sign in again to start a game.');

    const page = h('section', { class: 'au-page', 'aria-label': 'Sign in', tabindex: '-1' });
    const card = h('div', { class: 'au-card' });
    page.appendChild(card);
    let screen = null;
    const later = (ms, fn) => { const id = setTimeout(() => { if (page.isConnected || page.parentNode) safe(fn, null, 'timer'); }, ms); st.timers.push(id); return id; };
    const clearTimers = () => { st.timers.forEach(clearTimeout); st.timers = []; };
    const sync = () => { current = { step: st.step, email: st.email, provider: st.provider }; };

    function show(dir) {
      sync();
      const next = build(st.step);
      next.setAttribute('data-step', st.step);
      const old = screen;
      screen = next;
      if (old && !isReduced() && dir) {
        next.classList.add('au-in-' + dir);
        old.classList.add('au-out-' + dir);
        card.appendChild(next);
        setTimeout(() => { if (old.parentNode) old.parentNode.removeChild(old); next.classList.remove('au-in-' + dir); }, 230);
        void next.offsetWidth;
        next.classList.add('au-run'); old.classList.add('au-run');
      } else {
        if (old && old.parentNode) old.parentNode.removeChild(old);
        card.appendChild(next);
      }
      setTimeout(() => safe(() => { const f = next.querySelector('[data-autofocus]'); if (f) f.focus(); else page.focus({ preventScroll: true }); }, null, 'focus'), isReduced() ? 0 : 60);
    }
    function go(step, opt) {
      clearTimers();
      if (!(opt && opt.replace)) st.stack.push(st.step);
      st.step = step; st.err = null; st.note = null;
      if (step === 'create') { st.security = 'running'; later(1500, () => { st.security = 'done'; if (st.step === 'create') refreshCreate(); }); }
      show('fwd');
    }
    function back() {
      clearTimers();
      if (st.step === 'signing') return;
      if (!st.stack.length) { safe(() => opts.onBack && opts.onBack(), null, 'onBack'); return; }
      let prev = st.stack.pop();
      while ((prev === 'signing' || prev === 'oauth-wait') && st.stack.length) prev = st.stack.pop();
      st.step = prev; st.err = null; st.note = null;
      if (prev === 'create') { st.security = 'running'; later(1500, () => { st.security = 'done'; if (st.step === 'create') refreshCreate(); }); }
      show('back');
    }
    function finish() {
      go('signing');
      later(600, () => {
        if (st.provider === 'email') rememberEmail(st.email);
        safe(() => opts.onAuthed && opts.onAuthed({ isNew: !!st.isNew, provider: st.provider, email: st.email || null }), null, 'onAuthed');
      });
    }
    page.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); back(); } });

    /* ---------- shared pieces ---------- */
    const chevron = () => h('button', { type: 'button', class: 'au-back', 'aria-label': 'Back', onclick: back }, icon('back', 22));
    const title = (txt) => h('h1', { class: 'au-title' }, txt);
    const errLine = () => h('p', { class: 'au-err', role: 'alert', 'aria-live': 'assertive' }, st.err || '');
    const noteLine = () => h('p', { class: 'au-note', role: 'status', 'aria-live': 'polite' }, st.note || '');
    const frame = (kids, foot) => h('div', { class: 'au-screen' }, h('div', { class: 'au-top' }, chevron()), h('div', { class: 'au-body' }, kids), foot ? h('div', { class: 'au-foot' }, foot) : null);
    const primary = (label, attrs) => h('button', Object.assign({ type: 'submit', class: 'ap-btn ap-btn--primary au-primary' }, attrs || {}), label);
    const setNote = (screenEl, txt) => { st.note = txt; const n = screenEl.querySelector('.au-note'); if (n) n.textContent = txt; };
    let createRefs = null;
    function refreshCreate() {
      if (!createRefs) return;
      const running = st.security === 'running';
      createRefs.sec.hidden = !running;
      if (running) createRefs.btn.setAttribute('disabled', ''); else createRefs.btn.removeAttribute('disabled');
    }
    function pwField(isNew, onInput) {
      const inp = h('input', { type: st.showPw ? 'text' : 'password', class: 'au-input au-input--pw', autocomplete: isNew ? 'new-password' : 'current-password',
        'aria-label': t('passwordLabel', 'Password'), placeholder: t('passwordLabel', 'Password'), 'data-autofocus': '1' });
      inp.value = st.pw;
      inp.addEventListener('input', () => { st.pw = inp.value; if (onInput) onInput(); });
      const eye = h('button', { type: 'button', class: 'au-eye', 'aria-label': st.showPw ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password') }, icon(st.showPw ? 'eyeoff' : 'eye', 18));
      eye.addEventListener('click', () => {
        st.showPw = !st.showPw;
        inp.type = st.showPw ? 'text' : 'password';
        eye.setAttribute('aria-label', st.showPw ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password'));
        eye.innerHTML = ''; eye.appendChild(icon(st.showPw ? 'eyeoff' : 'eye', 18));
        inp.focus();
      });
      return h('div', { class: 'au-pw' }, inp, eye);
    }

    /* ---------- steps ---------- */
    function build(step) {
      createRefs = null;
      switch (step) {
        case 'choose': {
          const showApple = !!safe(() => appState().platform === 'ios' || (W.ESD && W.ESD.auth ? W.ESD.auth.appleEnabled !== false : true), true, 'apple');
          const prov = (id, ic) => h('button', { type: 'button', class: 'au-btn au-btn--' + id, 'data-provider': id,
            onclick: () => { st.provider = id; st.isNew = false; go('oauth-wait'); } }, icon(ic, 20), h('span', null, t('continueWith' + PROVIDERS[id], 'Continue with ' + PROVIDERS[id])));
          const legalLink = (txt) => h('a', { href: '#', class: 'au-link', onclick: (ev) => { ev.preventDefault(); setNote(screen, 'Opens in the system browser.'); } }, txt);
          return frame([
            title('Welcome to eSlams'),
            info ? h('p', { class: 'au-info', role: 'status', 'aria-live': 'polite' }, info) : null,
            h('div', { class: 'au-stack' },
              prov('google', 'google'), prov('github', 'github'), showApple ? prov('apple', 'apple') : null,
              h('div', { class: 'au-div', role: 'separator' }, h('span', null, 'or')),
              h('button', { type: 'button', class: 'au-btn au-btn--email', onclick: () => { st.provider = 'email'; go('email'); } }, icon('mail', 20), h('span', null, t('continueWithEmail', 'Continue with email'))))
          ], [h('p', { class: 'au-legal' }, 'By continuing you agree to the eSlams ', legalLink('Terms'), ' and ', legalLink('Privacy Policy'), '.'), noteLine()]);
        }
        case 'oauth-wait': {
          const name = PROVIDERS[st.provider] || 'Google';
          later(900, () => { if (st.step !== 'oauth-wait') return; if (twoFactorOn()) go('twofactor'); else finish(); });
          return frame([
            h('div', { class: 'au-wait', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'au-pulse', 'aria-hidden': 'true' }), h('p', { class: 'au-wait-txt' }, 'Waiting for ' + name + '…')),
            h('button', { type: 'button', class: 'ob-btn-outline au-cancel', 'data-autofocus': '1', onclick: back }, t('cancel', 'Cancel'))
          ]);
        }
        case 'signing':
          return frame([h('div', { class: 'au-wait', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'au-pulse', 'aria-hidden': 'true' }), h('p', { class: 'au-wait-txt' }, t('signingYouIn', 'Signing you in…')))]);
        case 'email': {
          const inp = h('input', { type: 'email', class: 'au-input', placeholder: t('emailPlaceholder', 'you@lab.ai'), autocomplete: 'email', 'aria-label': t('emailLabel', 'Email'), 'data-autofocus': '1', spellcheck: 'false' });
          inp.value = st.email;
          let busy = false;
          const btn = primary(t('continue', 'Continue'));
          const form = h('form', { class: 'au-form', novalidate: '1', onsubmit: (ev) => {
            ev.preventDefault();
            if (busy) return;
            const v = inp.value.trim();
            const er = form.querySelector('.au-err');
            if (!v) { er.textContent = 'Enter your email to continue.'; inp.setAttribute('aria-invalid', 'true'); return; }
            if (!validEmail(v)) { er.textContent = 'That email looks incomplete. Check it and try again.'; inp.setAttribute('aria-invalid', 'true'); return; }
            er.textContent = ''; inp.removeAttribute('aria-invalid');
            st.email = v; busy = true; btn.setAttribute('disabled', ''); btn.setAttribute('aria-busy', 'true');
            later(600, () => {
              const isNew = /new/i.test(v) || knownEmails().indexOf(v) < 0;
              st.isNew = isNew; st.pw = ''; st.showPw = false;
              go(isNew ? 'create' : 'password');
            });
          } }, inp, errLine(), btn);
          return frame([title(t('continueWithEmail', 'Continue with email')), form]);
        }
        case 'password': {
          const form = h('form', { class: 'au-form', novalidate: '1', onsubmit: (ev) => {
            ev.preventDefault();
            if (!st.pw) { form.querySelector('.au-err').textContent = 'Enter your password to continue.'; return; }
            st.isNew = false;
            if (twoFactorOn()) go('twofactor'); else finish();
          } },
          h('p', { class: 'au-email mono' }, st.email),
          pwField(false),
          h('button', { type: 'button', class: 'au-link au-forgot', onclick: () => setNote(screen, 'Opens the eslams.com reset flow in the browser.') }, t('forgotPassword', 'Forgot password?')),
          noteLine(), errLine(), primary(t('continue', 'Continue')));
          return frame([title(t('enterPassword', 'Enter your password')), form]);
        }
        case 'create': {
          const fb = h('p', { class: 'au-fb mono', 'aria-live': 'polite' });
          const upd = () => { const n = 12 - st.pw.length; fb.textContent = st.pw.length > 0 && n > 0 ? n + (n === 1 ? ' more character' : ' more characters') : ''; };
          upd();
          const sec = h('p', { class: 'au-sec mono', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'au-pulse au-pulse--sm', 'aria-hidden': 'true' }), t('securityCheck', 'Completing security check…'));
          const btn = primary(t('createAccountButton', 'Create account'));
          const form = h('form', { class: 'au-form', novalidate: '1', onsubmit: (ev) => {
            ev.preventDefault();
            if (st.security === 'running') return;
            if (st.pw.length < 12) { upd(); const p = form.querySelector('.au-input'); if (p) p.focus(); return; }
            st.isNew = true; finish();
          } },
          h('div', { class: 'au-email-row' }, h('span', { class: 'au-email mono' }, st.email), h('button', { type: 'button', class: 'au-link au-edit', 'aria-label': 'Edit email', onclick: back }, t('edit', 'Edit'))),
          pwField(true, upd), fb, sec, errLine(), btn);
          createRefs = { sec, btn };
          setTimeout(refreshCreate, 0);
          if (st.security === 'running') btn.setAttribute('disabled', ''); else sec.hidden = true;
          return frame([title(t('createTitle', 'Create your account')), form]);
        }
        case 'twofactor': {
          const auth = st.tf === 'auth';
          const inp = h('input', { type: 'text', class: 'au-input au-code mono', inputmode: auth ? 'numeric' : 'text', autocomplete: 'one-time-code', maxlength: auth ? '6' : '32',
            'aria-label': auth ? t('sixDigitCode', 'Six-digit code') : t('oneTimeRecoveryCode', 'One-time recovery code'), 'data-autofocus': '1', placeholder: auth ? '000000' : 'xxxx-xxxx-xxxx' });
          inp.value = st.code;
          inp.addEventListener('input', () => { st.code = inp.value; });
          const tab = (k, label) => h('button', { type: 'button', role: 'tab', 'aria-selected': st.tf === k ? 'true' : 'false', class: 'ap-seg-btn' + (st.tf === k ? ' is-on' : ''),
            onclick: () => { st.tf = k; st.code = ''; st.err = null; show(null); } }, label);
          const viaOAuth = st.provider !== 'email';
          const trust = viaOAuth ? null : h('label', { class: 'au-trust' }, h('input', { type: 'checkbox', checked: st.trust ? true : null, onchange: (ev) => { st.trust = ev.target.checked; } }), h('span', null, t('trustThisDevice', 'Trust this device')));
          const form = h('form', { class: 'au-form', novalidate: '1', onsubmit: (ev) => {
            ev.preventDefault();
            const ok = auth ? st.code.replace(/\s/g, '') === '123456' : st.code.trim().length >= 6;
            if (!ok) { form.querySelector('.au-err').textContent = auth ? "That code didn't work. Check your authenticator and try again." : "That recovery code didn't work."; return; }
            finish();
          } },
          h('div', { class: 'ap-seg au-seg', role: 'tablist', 'aria-label': 'Second factor' }, tab('auth', t('segAuthenticator', 'Authenticator')), tab('recovery', t('segRecoveryCode', 'Recovery code'))),
          inp, auth ? h('p', { class: 'au-hint mono' }, 'prototype code: 123456') : h('p', { class: 'au-hint' }, t('recoveryFootnote', 'Recovery codes are single-use.')),
          trust, errLine(), primary(t('verifyAndContinue', 'Verify and continue')));
          return frame([title(t('oneMoreCheck', 'One more check.')), h('p', { class: 'au-sub' }, t('twoFactorSub', 'Open your authenticator and enter the current code.')), form]);
        }
        default:
          return frame([]);
      }
    }

    show(null);
    return page;
  };
})();
