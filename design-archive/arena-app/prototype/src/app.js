/* =====================================================================
   eSlams Arena app prototype  |  src/app.js  [D]  |  window.ESApp
   ---------------------------------------------------------------------
   Plain script, ES2020, no frameworks. Consumes window.ESA (assets),
   window.ESD (data), window.ESE (engines) and window.ESB (boards) exactly
   as CONTRACT.md sections 2 to 5 describe. Every access is guarded: a
   missing or throwing dependency logs once and the app falls back to an
   honest empty state (Arena games coming soon / catalogue unavailable).

   Public surface (CONTRACT section 6):
     ESApp.boot(phoneEl)            mounts the app into #phone (called on DOMContentLoaded)
     ESApp.state()                  snapshot { screen, sheets, signedIn, live, ... } for QA
     ESApp.dev.setTheme('system'|'light'|'dark')
     ESApp.dev.setSignedIn(bool)
     ESApp.dev.setReducedMotion(bool)
     ESApp.dev.modelDelayMs(min, max)          default 1500 to 5000
     ESApp.dev.forceStage('thinking'|'keep_waiting'|'claim')
     ESApp.dev.forceEngine('ok'|'cold'|'unavailable')
     ESApp.dev.forceConflict(bool)
     ESApp.dev.reset()
   Extras under the same namespace (documented for agent F):
     dev.state()                  same as ESApp.state()
     dev.skipBrand()              ends the brand beat now
     dev.setOffline(bool)         Home offline state (Play now: Back online to play)
     dev.forceCatalogue(bool)     catalogue unavailable state on Home
     dev.forceRoster(bool)        503 arena_model_authority_unavailable on start
     dev.forceTwoFactor(bool)     GitHub / Google sign-in asks for the second factor (no Trust this device)
     dev.expireSignIn()           next Start shows 'Your sign-in expired...' in the sign-in sheet
     dev.oauthError(code)         opens the sign-in sheet with an OAuth deep-link error line
     dev.reconnect()              reconnecting ribbon on the Stage, then a snapshot re-sync
     dev.staleState()             the stale-state 409 line on the Stage
     dev.forceResult(kind)        win|loss|draw|resigned|timeout|unavailable|expired|replaced
     dev.forcePublication('ready'|'unavailable')
     dev.openTable(slug)          opens the table sheet on that table
     dev.startMatch(slug)         signs in if needed and starts that table now
     dev.openMatches() / dev.openSettings()

   Persistence: localStorage['eslams-arena-proto'] holds the theme pref,
   signedIn, username, onboarding, last setup, settings, yourMatches
   (fixtures recorded on first run with ESE.recordGame) and the live match.

   Assumptions beyond the contract text (listed for agent F):
     - ESD.copy entries are strings or functions; t() calls functions with args.
     - Scripted recordings: frames.length is ledger.length + 1 (frame 0 is the
       start) or equal to it; a ledger row with seat 'you' (or 'seatN' equal to
       your seat) is the player's move; result.winner 'p1' is the first mover.
     - card_table views of table games mark the player's seat with isYou.
     - ESE.recordGame(...).result has terminal() shape { winner, reason, scores? }.
     - ESB.render returns { update, destroy }; app.js passes `reveal: true` on
       the final frame and for replays at the last position.
     - Premove ghost (Tic-Tac-Toe, Connect Four) is an app overlay laid over the
       board host's box, not an ESB feature.
   ===================================================================== */
(function () {
  'use strict';

  const W = window;
  const STORE_KEY = 'eslams-arena-proto';
  const WORKER_GAMES = ['tic-tac-toe', 'connect-four'];      // run inside the worker: no cold start
  const PREMOVE_GAMES = ['tic-tac-toe', 'connect-four'];
  const STAGE_MS = { thinking: 10000, keep_waiting_offer: 30000, claim_eligible: 120000 };
  const SPEEDS = [[300, 900, 'Instant'], [800, 2000, 'Fast'], [1500, 5000, 'Default'], [4000, 9000, 'Slow'], [8000, 15000, 'Very slow']];
  const FIXTURE_GAMES = ['connect-four', 'tic-tac-toe', 'rock-paper-scissors'];

  /* ------------------------------------------------------------------
     Logging and guards
     ------------------------------------------------------------------ */
  const warned = new Set();
  function warnOnce(key, msg) {
    if (warned.has(key)) return;
    warned.add(key);
    try { console.warn('[ESApp] ' + msg); } catch (e) { /* no console */ }
  }
  function report(e, where) {
    const key = (where || '') + ':' + (e && e.message);
    if (warned.has(key)) return;
    warned.add(key);
    try { console.error('[ESApp] ' + (where || 'error'), e); } catch (x) { /* no console */ }
  }
  function safe(fn, fallback, where) {
    try {
      const v = fn();
      return v === undefined ? fallback : v;
    } catch (e) {
      report(e, where);
      return fallback;
    }
  }
  function dep(name) {
    const v = W[name];
    if (!v) warnOnce(name, 'window.' + name + ' is missing; the app shows its honest fallback.');
    return v || null;
  }

  /* ------------------------------------------------------------------
     Small utilities
     ------------------------------------------------------------------ */
  const now = () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = (p) => (p || 'm') + '_' + now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const lcfirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const randInt = (a, b) => Math.round(a + Math.random() * (b - a));
  function isReduced() {
    if (document.documentElement.classList.contains('reduced-motion')) return true;
    try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  const dur = (ms) => (isReduced() ? 1 : ms);
  const later = (ms, fn) => setTimeout(fn, ms);

  function fmtClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function absDate(ts) {
    const d = new Date(ts);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function absDateTime(ts) {
    const d = new Date(ts);
    return absDate(ts) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function relTime(ts) {
    const m = Math.round((now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const hrs = Math.round(m / 60);
    if (hrs < 24) return hrs + ' h ago';
    const days = Math.round(hrs / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return days + ' days ago';
    return absDate(ts);
  }

  /* Copy: ESD.copy[key] (string or function) with an exact fallback. */
  function t(key, fallback, ...args) {
    const d = W.ESD;
    const c = d && d.copy ? d.copy[key] : undefined;
    if (typeof c === 'function') {
      try {
        const r = c(...args);
        if (typeof r === 'string') return r;
      } catch (e) { report(e, 'copy.' + key); }
    } else if (typeof c === 'string') {
      return c;
    }
    return typeof fallback === 'function' ? fallback(...args) : fallback;
  }

  /* ------------------------------------------------------------------
     DOM helpers
     ------------------------------------------------------------------ */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
          for (const sk of Object.keys(v)) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; }
        }
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      }
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const c of [].concat(kids).flat(Infinity)) {
      if (c == null || c === false || c === '') continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function clear(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }

  /* Own transport and status glyphs (not in ESA): same 24 viewBox, 1.75 stroke. */
  const OWN_ICONS = {
    pause: '<path d="M9 6v12M15 6v12"/>',
    restart: '<path d="M6 5v14"/><path d="M18 6l-8 6 8 6z"/>',
    end: '<path d="M18 5v14"/><path d="M6 6l8 6-8 6z"/>',
    stepback: '<path d="M15 6l-6 6 6 6"/>',
    stepfwd: '<path d="M9 6l6 6-6 6"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 6"/><path d="M17.5 14.3c1.8.6 3 2.2 3 4.7"/>',
    signal: '',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  const FALLBACK_ICONS = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', chevron: '<path d="M9 5l7 7-7 7"/>',
    more: '<circle cx="5.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M12 16.5v.5M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', user: '<circle cx="12" cy="8" r="3.75"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>'
  };
  function svgWrap(paths, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  function iconMarkup(name, size) {
    size = size || 20;
    if (OWN_ICONS[name]) return svgWrap(OWN_ICONS[name], size);
    const a = W.ESA;
    const m = a && typeof a.icon === 'function' ? safe(() => a.icon(name, size), '', 'ESA.icon') : '';
    if (m) return m;
    return FALLBACK_ICONS[name] ? svgWrap(FALLBACK_ICONS[name], size) : '';
  }
  function ic(name, size, cls) {
    const s = h('span', { class: 'ap-ic' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' });
    s.innerHTML = iconMarkup(name, size);
    return s;
  }

  /* ------------------------------------------------------------------
     Data layer (ESD), guarded
     ------------------------------------------------------------------ */
  const Data = {
    raw() { return dep('ESD'); },
    ok() {
      const d = Data.raw();
      return !!(d && d.games && Array.isArray(d.arenas) && d.arenas.length) && !S.dev.catalogueDown && Data.arenas().length > 0;
    },
    game(slug) {
      const d = W.ESD;
      return d && d.games && slug ? d.games[slug] || null : null;
    },
    visibleGames(arena) {
      return safe(() => (arena.games || []).filter((s) => {
        const g = Data.game(s);
        return g && !g.mobileExcluded && !!Eng.modeFor(s);     /* the app shows nothing unplayable */
      }), [], 'visibleGames');
    },
    arenas() {
      const d = Data.raw();
      return safe(() => d.arenas.filter((a) => Data.visibleGames(a).length > 0), [], 'ESD.arenas');
    },
    arenaOf(slug) {
      const d = W.ESD;
      const g = Data.game(slug);
      if (!d || !g) return null;
      return safe(() => (d.arenaById ? d.arenaById(g.arena) : null) || d.arenas.find((a) => a.id === g.arena) || null, null, 'arenaOf');
    },
    categories() { return safe(() => Data.raw().categories.slice(), [], 'ESD.categories'); },
    roster() { return safe(() => Data.raw().roster.slice(), [], 'ESD.roster'); },
    rosterTotal() { return safe(() => Data.raw().rosterTotal, Data.roster().length, 'ESD.rosterTotal'); },
    model(id) {
      const d = W.ESD;
      if (!d || !id) return null;
      return safe(() => (d.modelById ? d.modelById(id) : null) || (d.roster || []).find((m) => m.id === id) || null, null, 'model');
    },
    canPlay(id, slug) {
      const d = W.ESD;
      if (!d || typeof d.canPlay !== 'function') return !!Data.model(id);
      return safe(() => !!d.canPlay(id, slug), false, 'ESD.canPlay');
    },
    status(id, slug) {
      if (!Data.canPlay(id, slug)) return 'unavailable';
      const m = Data.model(id);
      return m && m.turnSpeed === 'slower_turns' ? 'slower_turns' : 'ready';
    },
    statusLabel(st) {
      if (st === 'ready') return t('ready', 'Ready');
      if (st === 'slower_turns') return t('slowerTurns', 'Slower turns');
      return t('notAvailable', 'Not available for this game');
    },
    modelsFor(slug) { return Data.roster().filter((m) => Data.canPlay(m.id, slug)); },
    help(slug) { return safe(() => Data.raw().help[slug], null, 'ESD.help') || null; },
    helpSections(slug, folded) {
      const d = W.ESD;
      if (d && typeof d.helpSections === 'function') {
        const r = safe(() => d.helpSections(slug, folded), null, 'ESD.helpSections');
        if (Array.isArray(r) && r.length) return r;
      }
      const hp = Data.help(slug);
      if (!hp) return [];
      const all = [['Quick summary', hp.quick], ['Objective', hp.objective], ['Your turn', hp.yourTurn], ['Legal actions', hp.legalActions],
        ['Scoring', hp.scoring], ['Win/draw/placement', hp.winRule], ['Hidden information', hp.hiddenInfo], ['First move', hp.firstMove]]
        .filter((x) => x[1]).map((x) => ({ title: x[0], body: x[1] }));
      return folded ? all.filter((s) => ['Quick summary', 'Your turn', 'First move'].includes(s.title)) : all;
    },
    metaLine(slug) {
      const d = W.ESD;
      const g = Data.game(slug);
      if (!g) return '';
      const viaD = d && typeof d.metaLine === 'function' ? safe(() => d.metaLine(slug), '', 'ESD.metaLine') : '';
      return viaD || [g.variantLabel || g.tableLabel, Data.categoryLabel(g.category), g.seats + ' seats'].join(' · ');
    },
    categoryLabel(id) {
      const c = Data.categories().find((x) => x.id === id);
      return c ? c.label : '';
    },
    counts() {
      const arenas = Data.arenas();
      const games = new Set();
      arenas.forEach((a) => Data.visibleGames(a).forEach((s) => games.add(s)));
      return { games: games.size, arenas: arenas.length };
    },
    providerHue(p) { return safe(() => Data.raw().providerHue(p), 220, 'ESD.providerHue'); },
    ordinal(n) {
      const d = W.ESD;
      if (d && typeof d.ordinal === 'function') return safe(() => d.ordinal(n), n + 'th', 'ordinal');
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    defaults() {
      const d = safe(() => Data.raw().defaultsForNewPlayer, null, 'defaults');
      return d || { game: 'connect-four', modelId: 'anthropic/claude-haiku-4.5', side: 'p1' };
    }
  };

  function modelOrStub(id) {
    const m = Data.model(id);
    if (m) return m;
    const prov = String(id || 'model').split('/')[0];
    return { id: id || 'unknown', publicName: id || 'Model', shortName: id || 'Model', provider: prov, providerName: prov, turnSpeed: 'ready' };
  }
  const shortName = (m) => (m ? m.shortName || m.publicName || m.id : 'Model');
  const fullName = (m) => (m ? m.publicName || m.shortName || m.id : 'Model');

  /* ------------------------------------------------------------------
     Engine layer (ESE), guarded
     ------------------------------------------------------------------ */
  const Eng = {
    get(slug) {
      const e = W.ESE;
      const eng = e && e.engines ? e.engines[slug] : null;
      if (!eng) return null;
      return ['start', 'legal', 'apply', 'ai', 'terminal', 'view'].every((k) => typeof eng[k] === 'function') ? eng : null;
    },
    scriptedFn(slug) {
      const e = W.ESE;
      return e && e.scripted && typeof e.scripted[slug] === 'function' ? e.scripted[slug] : null;
    },
    scripted(slug) {
      const fn = Eng.scriptedFn(slug);
      if (!fn) return null;
      const r = safe(() => fn(), null, 'ESE.scripted.' + slug);
      if (!r || !Array.isArray(r.frames) || !r.frames.length) return null;
      return { frames: r.frames, ledger: Array.isArray(r.ledger) ? r.ledger : [], result: r.result || { winner: 'draw' } };
    },
    /* engine = real play; scripted = recorded demo; null = nothing playable */
    modeFor(slug) {
      const g = Data.game(slug);
      if (!g) return null;
      if (g.play === 'engine' && Eng.get(slug)) return 'engine';
      if (Eng.scriptedFn(slug)) return 'scripted';
      if (Eng.get(slug)) return 'engine';
      return null;
    },
    preview(slug, seed) {
      const e = dep('ESE');
      if (!e || typeof e.preview !== 'function') return [];
      const r = safe(() => e.preview(slug, seed), [], 'ESE.preview');
      return Array.isArray(r) ? r.filter(Boolean) : [];
    },
    record(slug, opts) {
      const e = dep('ESE');
      if (!e || typeof e.recordGame !== 'function') return null;
      const r = safe(() => e.recordGame(slug, opts), null, 'ESE.recordGame');
      return r && Array.isArray(r.frames) && r.frames.length ? r : null;
    },
    startView(slug, side) {
      const eng = Eng.get(slug);
      if (eng) {
        const st = safe(() => eng.start({ humanSide: side || 'p1', seed: 7 }), null, 'ESE.start');
        if (st) return safe(() => eng.view(st), null, 'ESE.view');
      }
      const rec = Eng.scripted(slug);
      return rec ? rec.frames[0] : null;
    }
  };

  /* ------------------------------------------------------------------
     Board layer (ESB), guarded
     ------------------------------------------------------------------ */
  function familyOf(slug, view) {
    const g = Data.game(slug);
    return (g && g.family) || (view && view.family) || 'custom';
  }
  function boardFallback(el, props) {
    clear(el);
    el.appendChild(h('div', { class: 'ap-board-empty ap-board-empty--' + (props && props.size ? props.size : 'stage'), role: 'img', 'aria-label': 'Empty board' }));
  }
  function mountBoard(el, props) {
    const b = dep('ESB');
    let ctl = null;
    if (b && typeof b.render === 'function' && props.view) ctl = safe(() => b.render(el, props), null, 'ESB.render');
    if (!ctl || typeof ctl.update !== 'function') {
      boardFallback(el, props);
      return { update(p) { boardFallback(el, p); }, destroy() { clear(el); }, fallback: true };
    }
    return {
      update(p) { if (p && p.view) safe(() => ctl.update(p), null, 'ESB.update'); },
      destroy() { safe(() => (typeof ctl.destroy === 'function' ? ctl.destroy() : clear(el)), null, 'ESB.destroy'); }
    };
  }

  /* Identity tiles. ESB first; a quiet initials tile when ESB is missing. */
  function initials(s) {
    const parts = String(s || '?').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
    return ((parts[0] || '?').charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
  }
  function providerTile(model, size) {
    size = size || 34;
    const b = W.ESB;
    if (b && typeof b.providerTile === 'function' && model) {
      const el = safe(() => b.providerTile(model, size), null, 'ESB.providerTile');
      if (el instanceof Node) return el;
    }
    const hue = Data.providerHue(model ? model.provider : '');
    return h('span', {
      class: 'ap-tile-fallback', 'aria-hidden': 'true',
      style: { width: size + 'px', height: size + 'px', background: 'oklch(0.62 0.13 ' + hue + ')', fontSize: Math.round(size * 0.36) + 'px' }
    }, initials(model ? model.providerName || model.publicName : '?'));
  }
  function youTile(size) {
    size = size || 34;
    const b = W.ESB;
    if (b && typeof b.youTile === 'function') {
      const el = safe(() => b.youTile(size), null, 'ESB.youTile');
      if (el instanceof Node) return el;
    }
    return h('span', { class: 'ap-tile-you', 'aria-hidden': 'true', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.32) + 'px' } }, 'You');
  }
  function glyphTile(arena, size, cls) {
    const box = h('span', { class: 'ap-glyph' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', style: { width: size + 'px', height: size + 'px' } });
    box.innerHTML = iconMarkup((arena && arena.glyph) || 'g_board', Math.round(size * 0.55));
    return box;
  }

  /* ------------------------------------------------------------------
     Persistent store
     ------------------------------------------------------------------ */
  function freshPersist() {
    return {
      v: 1, themePref: 'system', signedIn: false, username: '', onboarded: false,
      profile: { displayName: '', bio: '', location: '', website: '', visibility: 'public' },
      setup: null, settings: { sound: true, haptics: true }, matches: null, launched: false, live: null
    };
  }
  function loadPersist() {
    try {
      const raw = W.localStorage.getItem(STORE_KEY);
      if (raw) {
        const p = Object.assign(freshPersist(), JSON.parse(raw));
        p.settings = Object.assign({ sound: true, haptics: true }, p.settings || {});
        p.profile = Object.assign(freshPersist().profile, p.profile || {});
        return p;
      }
    } catch (e) { report(e, 'persist.load'); }
    return freshPersist();
  }
  let P = freshPersist();
  function save() {
    try {
      P.live = S.live && S.live.status === 'active' ? serializeSession(S.live) : null;
      W.localStorage.setItem(STORE_KEY, JSON.stringify(P));
    } catch (e) {
      /* quota: drop the oldest stored frames and retry once */
      try {
        if (Array.isArray(P.matches) && P.matches.length > 6) P.matches = P.matches.slice(0, 6);
        W.localStorage.setItem(STORE_KEY, JSON.stringify(P));
      } catch (x) { report(x, 'persist.save'); }
    }
  }

  /* ------------------------------------------------------------------
     Runtime state
     ------------------------------------------------------------------ */
  const S = {
    phone: null, root: null, stack: null, sheetLayer: null, menuLayer: null, toastEl: null, liveEl: null,
    screens: [],        /* [{ name, el, cleanup, onReveal }] bottom to top */
    sheets: [],         /* [{ kind, scrim, sheet, close, refresh }] */
    menu: null,
    live: null,         /* the active session (one per account) */
    webSession: null,   /* a match running on the web (forced conflict) */
    stageView: null,
    homeView: null,
    lastRecord: null,
    previews: [],
    booted: false,
    dev: {
      delayMin: 1500, delayMax: 5000, speedIndex: 2, engine: 'ok', conflict: false, offline: false,
      catalogueDown: false, rosterDown: false, forcedStage: null, signInExpired: false,
      twoFactorProviders: false, publication: 'ready'
    }
  };

  /* ------------------------------------------------------------------
     Setup (the table the player is setting): game, opponent, side, seats
     ------------------------------------------------------------------ */
  function defaultVisibility() {
    return P.profile && P.profile.visibility === 'private' ? 'followers' : 'public';
  }
  function bestModelFor(slug, preferId) {
    if (preferId && Data.canPlay(preferId, slug)) return preferId;
    const pool = Data.modelsFor(slug);
    const pick = pool.find((m) => m.recommended && m.turnSpeed !== 'slower_turns') || pool.find((m) => m.turnSpeed !== 'slower_turns') || pool[0];
    return pick ? pick.id : preferId || null;
  }
  function autoFillSeats(slug, seats, yourSeat, preferId, shuffle) {
    let pool = Data.modelsFor(slug).map((m) => m.id);
    if (shuffle) pool = pool.map((id) => [Math.random(), id]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    if (preferId && pool.includes(preferId) && !shuffle) pool = [preferId].concat(pool.filter((id) => id !== preferId));
    const out = [];
    let k = 0;
    for (let i = 0; i < seats; i++) {
      if (i === yourSeat - 1) out.push(null);
      else out.push(pool[k++] || null);
    }
    return out;
  }
  function normalizeSetup(s) {
    s = Object.assign({}, s || {});
    let g = Data.game(s.game);
    if (!g || g.mobileExcluded) {
      const d = Data.defaults();
      s.game = d.game;
      g = Data.game(s.game);
    }
    if (!g) return s;
    s.modelId = s.modelId && Data.model(s.modelId) ? s.modelId : bestModelFor(s.game, Data.defaults().modelId);
    if (!Data.canPlay(s.modelId, s.game)) s.modelId = bestModelFor(s.game, null) || s.modelId;
    s.side = s.side === 'p2' ? 'p2' : 'p1';
    if (g.seats > 2) {
      s.yourSeat = clamp(parseInt(s.yourSeat, 10) || 1, 1, g.seats);
      if (!Array.isArray(s.seatModels) || s.seatModels.length !== g.seats) {
        s.seatModels = autoFillSeats(s.game, g.seats, s.yourSeat, s.modelId, false);
      }
      s.seatModels = s.seatModels.map((id, i) => (i === s.yourSeat - 1 ? null : id));
      const firstModel = s.seatModels.find(Boolean);
      if (firstModel) s.modelId = firstModel;
    } else {
      delete s.yourSeat;
      delete s.seatModels;
    }
    if (!s.visibility) s.visibility = null;
    return s;
  }
  function currentSetup() {
    return normalizeSetup(P.setup || Object.assign({}, Data.defaults()));
  }
  function seatNames(g) {
    if (g && Array.isArray(g.seatNames) && g.seatNames.length) return g.seatNames;
    const n = g ? g.seats : 4;
    return Array.from({ length: n }, (_, i) => 'Seat ' + (i + 1));
  }
  /* readiness of a setup: { ok, line, reason } */
  function readiness(s) {
    const g = Data.game(s.game);
    if (!g) return { ok: false, line: t('chooseAnOpponent', 'Choose an opponent') };
    if (!Eng.modeFor(s.game)) return { ok: false, line: t('matchNoLongerAvailable', 'This Arena match is no longer available.') };
    if (g.seats > 2) {
      const models = (s.seatModels || []).filter((x, i) => i !== s.yourSeat - 1);
      if (models.some((id) => !id)) return { ok: false, line: t('chooseAnOpponent', 'Choose an opponent') };
      const bad = models.find((id) => !Data.canPlay(id, s.game));
      if (bad) return { ok: false, line: t('unavailableLine', (n) => n + ' · Not available for this game', shortName(modelOrStub(bad))) };
      return { ok: true, line: t('modelSeatsReady', (n) => n + ' model seats · Ready', models.length) };
    }
    if (!s.modelId) return { ok: false, line: t('chooseAnOpponent', 'Choose an opponent') };
    if (!Data.canPlay(s.modelId, s.game)) return { ok: false, line: t('unavailableLine', (n) => n + ' · Not available for this game', shortName(modelOrStub(s.modelId))) };
    return { ok: true, line: t('readyLine', (n) => n + ' · Ready', g.name) };
  }

  /* ------------------------------------------------------------------
     Match simulation (view independent). One live session per account.
     Engine tables: the player plays ESE for real; the model seat answers
     with ESE.ai after a simulated delay, through the server's turn stages
     pending (0s) -> thinking (10s) -> keep_waiting_offer (30s) ->
     claim_eligible (120s). Scripted tables replay the recorded frames.
     ------------------------------------------------------------------ */
  const STAGE_ORDER = ['pending', 'thinking', 'keep_waiting_offer', 'claim_eligible'];
  function stageFor(elapsed) {
    if (elapsed >= STAGE_MS.claim_eligible) return 'claim_eligible';
    if (elapsed >= STAGE_MS.keep_waiting_offer) return 'keep_waiting_offer';
    if (elapsed >= STAGE_MS.thinking) return 'thinking';
    return 'pending';
  }
  function isHumanRow(sess, row) {
    if (!row) return false;
    if (row.seat === 'you') return true;
    const ys = sess.setup.yourSeat;
    return !!ys && row.seat === 'seat' + ys;
  }
  function engView(sess) {
    const eng = Eng.get(sess.slug);
    return eng ? safe(() => eng.view(sess.state), null, 'ESE.view') : null;
  }
  function scriptedView(sess) {
    const f = sess.rec.frames;
    const idx = sess.offset ? sess.step : Math.max(0, sess.step - 1);
    return f[Math.min(idx, f.length - 1)];
  }
  function sessView(sess) {
    if (!sess) return null;
    if (sess.status === 'completed' && sess.frames.length) return sess.frames[sess.frames.length - 1];
    return sess.mode === 'engine' ? engView(sess) || sess.frames[sess.frames.length - 1] : scriptedView(sess);
  }
  function remapSeats(setup, newSeat) {
    const models = (setup.seatModels || []).filter(Boolean);
    const n = setup.seatModels ? setup.seatModels.length : 0;
    const out = [];
    let k = 0;
    for (let i = 0; i < n; i++) out.push(i === newSeat - 1 ? null : models[k++] || null);
    setup.yourSeat = newSeat;
    setup.seatModels = out;
    return setup;
  }
  function sessionModels(sess) {
    const s = sess.setup;
    if (Array.isArray(s.seatModels)) return s.seatModels.filter(Boolean);
    return [s.modelId];
  }
  /* the model whose turn it is (multi-seat scripted rows name a seat) */
  function modelForRow(sess, row) {
    const s = sess.setup;
    if (row && /^seat\d$/.test(row.seat || '') && Array.isArray(s.seatModels)) {
      const id = s.seatModels[parseInt(row.seat.slice(4), 10) - 1];
      if (id) return modelOrStub(id);
    }
    return modelOrStub(sessionModels(sess)[0]);
  }
  function currentModel(sess) {
    if (sess.mode === 'scripted' && sess.rec) return modelForRow(sess, sess.rec.ledger[sess.step]);
    return modelOrStub(sessionModels(sess)[0]);
  }
  function currentModelSeat(sess) {
    if (sess.mode === 'scripted' && sess.rec) {
      const row = sess.rec.ledger[sess.step];
      if (row && /^seat\d$/.test(row.seat || '')) return row.seat;
    }
    return null;
  }

  function createSession(setup) {
    const s = normalizeSetup(clone(setup));
    const g = Data.game(s.game);
    const mode = Eng.modeFor(s.game);
    if (!g || !mode) return null;
    const sess = {
      id: uid('s'), slug: s.game, setup: s, mode, seed: randInt(1, 99999), humanSide: s.side || 'p1',
      status: 'active', createdAt: now(), lastHumanAt: now(), plies: 0, frames: [], ledger: [],
      reasoning: null, reasoningSeq: 0, turn: null, modelTurn: null, lastTurnMs: null, result: null,
      visibility: s.visibility || defaultVisibility(), premove: null, timers: {}, publication: 'pending'
    };
    if (mode === 'engine') {
      const eng = Eng.get(s.game);
      sess.state = safe(() => eng.start({ humanSide: sess.humanSide, seed: sess.seed }), null, 'ESE.start');
      if (!sess.state) return null;
      const v = engView(sess);
      if (v) sess.frames.push(v);
    } else {
      const rec = Eng.scripted(s.game);
      if (!rec) return null;
      sess.rec = rec;
      sess.step = 0;
      sess.offset = rec.frames.length > rec.ledger.length ? 1 : 0;
      if (g.seats > 2) {
        const seats = rec.frames[0] && rec.frames[0].seats;
        const idx = Array.isArray(seats) ? seats.findIndex((x) => x && x.isYou) : -1;
        if (idx >= 0 && idx + 1 !== s.yourSeat) remapSeats(s, idx + 1);
      } else if (rec.ledger.length) {
        sess.humanSide = rec.ledger[0].seat === 'you' ? 'p1' : 'p2';
      }
      sess.frames.push(rec.frames[0]);
    }
    return sess;
  }

  function whoseTurn(sess) {
    if (!sess || sess.status !== 'active') return 'over';
    if (sess.mode === 'engine') {
      const eng = Eng.get(sess.slug);
      if (!eng) return 'over';
      if (safe(() => eng.terminal(sess.state), null, 'ESE.terminal')) return 'over';
      const legal = safe(() => eng.legal(sess.state), [], 'ESE.legal') || [];
      return legal.length ? 'human' : 'model';
    }
    if (sess.step >= sess.rec.ledger.length) return 'over';
    return isHumanRow(sess, sess.rec.ledger[sess.step]) ? 'human' : 'model';
  }
  function legalFor(sess) {
    if (sess.mode !== 'engine' || whoseTurn(sess) !== 'human') return [];
    const eng = Eng.get(sess.slug);
    return safe(() => eng.legal(sess.state), [], 'ESE.legal') || [];
  }

  /* Player language for a move label: 'Column 4' -> 'Drops column 4' (never 'cell 5'). */
  function playerAction(slug, label) {
    label = String(label || 'Move');
    const fam = familyOf(slug);
    if (fam === 'connect_four' && /^column/i.test(label)) return 'Drops ' + lcfirst(label);
    if (fam === 'grid_3x3' && /^(top|middle|bottom|centre|center|left|right|board)/i.test(label)) return 'Takes ' + lcfirst(label);
    return label;
  }
  function actionText(sess, a) {
    /* a committed amount reads with its number: 'Seals a bid of 72', never a bare 'Seal bid' */
    if (a && a.kind === 'value' && typeof a.value === 'number') return /seal/i.test(a.verb || a.label || '') ? 'Seals a bid of ' + a.value : (a.verb || a.label || 'Offers') + ' ' + a.value;
    return playerAction(sess.slug, (a && (a.label || a.shortLabel)) || 'Move');
  }
  function sameAction(a, b) {
    if (!a || !b) return false;
    if (a.token != null && b.token != null) return a.token === b.token;
    if (a.col != null && b.col != null) return a.col === b.col;
    if (a.cell && b.cell) return a.cell.r === b.cell.r && a.cell.c === b.cell.c;
    return a.label === b.label;
  }

  function clearTimers(sess) {
    clearTimeout(sess.timers.reply);
    clearInterval(sess.timers.clock);
    sess.timers = {};
  }
  function stopClock(sess) { clearInterval(sess.timers.clock); sess.timers.clock = null; }
  function startClock(sess) {
    stopClock(sess);
    sess.timers.clock = setInterval(() => tick(sess), 250);
  }
  function scheduleReply(sess, ms) {
    clearTimeout(sess.timers.reply);
    sess.timers.reply = later(ms, () => modelReply(sess));
  }
  function stageOffset(kind) {
    if (kind === 'claim') return STAGE_MS.claim_eligible + 200;
    if (kind === 'keep_waiting') return STAGE_MS.keep_waiting_offer + 200;
    if (kind === 'thinking') return STAGE_MS.thinking + 200;
    return 0;
  }
  function applyForcedStage(sess, kind) {
    const mt = sess.modelTurn;
    if (!mt) return;
    mt.startedAt = now() - stageOffset(kind);
    mt.status = stageFor(now() - mt.startedAt);
    mt.keptWaiting = false;
    if (kind === 'thinking') {
      mt.stalled = false;
      scheduleReply(sess, 4000);            /* still working; the move lands at about 0:14 */
    } else {
      mt.stalled = true;                      /* the model has gone quiet */
      clearTimeout(sess.timers.reply);
    }
    emit(sess, 'stage');
  }
  function beginModelTurn(sess) {
    clearTimeout(sess.timers.reply);
    sess.modelTurn = { status: 'pending', startedAt: now(), stalled: false, keptWaiting: false, seat: currentModelSeat(sess) };
    startClock(sess);
    const forced = S.dev.forcedStage;
    if (forced) {
      S.dev.forcedStage = null;
      applyForcedStage(sess, forced);
    } else {
      scheduleReply(sess, randInt(S.dev.delayMin, S.dev.delayMax));
    }
  }
  function tick(sess) {
    const mt = sess.modelTurn;
    if (!mt || sess.status !== 'active') { stopClock(sess); return; }
    const st = stageFor(now() - mt.startedAt);
    if (STAGE_ORDER.indexOf(st) > STAGE_ORDER.indexOf(mt.status)) {
      mt.status = st;                          /* a turn stage never goes backwards */
      if (st === 'claim_eligible') clearTimeout(sess.timers.reply);   /* late reply fenced */
      emit(sess, 'stage');
    }
    emit(sess, 'clock');
  }
  function keepWaiting(sess) {
    const mt = sess.modelTurn;
    if (!mt) return;
    mt.keptWaiting = true;
    if (mt.stalled && mt.status !== 'claim_eligible') {
      mt.stalled = false;
      scheduleReply(sess, randInt(2000, 4000));
    }
    emit(sess, 'stage');
  }
  function claimWin(sess) {
    if (!sess.modelTurn || sess.modelTurn.status !== 'claim_eligible') return;
    finish(sess, { reason: 'model_timeout_award', winner: 'human' });
  }

  function modelReply(sess) {
    if (sess.status !== 'active' || whoseTurn(sess) !== 'model') return;
    const mt = sess.modelTurn;
    if (mt && mt.status === 'claim_eligible') return;
    const elapsed = mt ? now() - mt.startedAt : 0;
    const g = Data.game(sess.slug);
    let row;
    if (sess.mode === 'engine') {
      const eng = Eng.get(sess.slug);
      const before = sess.state;
      const action = safe(() => eng.ai(before, { seed: sess.seed + sess.plies }), null, 'ESE.ai');
      const after = action ? safe(() => eng.apply(before, action), null, 'ESE.apply') : null;
      if (!after) { finish(sess, { reason: 'model_unavailable', winner: null }); return; }
      const reasoning = g && g.hiddenInfo ? null : safe(() => (typeof eng.explain === 'function' ? eng.explain(before, action, after) : null), null, 'ESE.explain');
      sess.state = after;
      sess.plies += 1;
      const v = engView(sess);
      if (v) sess.frames.push(v);
      row = { turn: sess.plies, seat: 'model', action: actionText(sess, action), reasoning: reasoning || null, cell: action.cell || null, frame: sess.frames.length - 1 };
    } else {
      const r = sess.rec.ledger[sess.step];
      sess.step += 1;
      sess.plies += 1;
      sess.frames.push(scriptedView(sess));
      row = { turn: r.turn || sess.plies, seat: r.seat || 'model', action: r.action || 'Move', reasoning: g && g.hiddenInfo ? null : r.reasoning || null, cell: r.cell || null };
    }
    const mover = sess.mode === 'scripted' ? modelForRow(sess, row) : currentModel(sess);
    row.by = shortName(mover);
    sess.ledger.push(row);
    sess.lastTurnMs = elapsed;
    sess.modelTurn = null;
    stopClock(sess);
    if (row.reasoning) { sess.reasoning = row.reasoning; sess.reasoningSeq += 1; }
    else if (g && g.hiddenInfo) sess.reasoning = null;
    cue('move');
    announce('Turn ' + row.turn + '. ' + shortName(mover) + ' ' + lcfirst(row.action) + '.');
    emit(sess, 'modelMove');
    advance(sess);
  }

  function humanAction(sess, action) {
    if (!sess || sess.status !== 'active' || whoseTurn(sess) !== 'human') return false;
    const eng = Eng.get(sess.slug);
    const legal = legalFor(sess);
    let match = legal.find((a) => sameAction(a, action));
    /* range actions (a sealed bid) carry the chosen amount; the legal list holds one descriptor with min/max */
    if (!match && action && action.kind === 'value' && typeof action.value === 'number') {
      const r = legal.find((a) => a.kind === 'value' && action.value >= (a.min != null ? a.min : -Infinity) && action.value <= (a.max != null ? a.max : Infinity));
      if (r) match = Object.assign({}, r, { value: action.value, token: action.token || r.token });
    }
    if (!match) { emit(sess, 'illegal'); return false; }
    const before = sess.state;
    const after = safe(() => eng.apply(before, match), null, 'ESE.apply');
    if (!after) { emit(sess, 'illegal'); return false; }
    sess.state = after;
    sess.plies += 1;
    sess.lastHumanAt = now();
    const v = engView(sess);
    if (v) sess.frames.push(v);
    const frame = sess.frames.length - 1;
    sess.ledger.push({ turn: sess.plies, seat: 'you', action: actionText(sess, match), reasoning: null, cell: match.cell || null, by: 'You', frame });
    /* Simultaneous games: the model's sealed reply is already inside the state
       apply() returned, so the reveal lands now. No model turn, no fake wait. */
    const reply = W.ESE && typeof W.ESE.simulReply === 'function' ? safe(() => W.ESE.simulReply(sess.slug, before, match, after), null, 'ESE.simulReply') : null;
    if (reply) {
      const m = currentModel(sess);
      sess.ledger.push({ turn: sess.plies, seat: 'model', action: reply, reasoning: null, by: shortName(m), frame });
      sess.reasoning = null;
      sess.lastReveal = { you: actionText(sess, match), model: reply, by: shortName(m) };
      announce('Turn ' + sess.plies + '. You ' + lcfirst(actionText(sess, match)) + '. ' + shortName(m) + ' ' + lcfirst(reply) + '.');
    }
    sess.premove = null;
    cue('move');
    emit(sess, 'humanMove');
    advance(sess);
    return true;
  }
  function humanDemoStep(sess) {
    if (!sess || sess.mode !== 'scripted' || whoseTurn(sess) !== 'human') return;
    const r = sess.rec.ledger[sess.step];
    sess.step += 1;
    sess.plies += 1;
    sess.lastHumanAt = now();
    sess.frames.push(scriptedView(sess));
    sess.ledger.push({ turn: r.turn || sess.plies, seat: 'you', action: r.action || 'Move', reasoning: null, cell: r.cell || null, by: 'You' });
    cue('move');
    emit(sess, 'humanMove');
    advance(sess);
  }
  function maybeSubmitPremove(sess) {
    const pm = sess.premove;
    if (!pm) return;
    sess.premove = null;
    later(dur(140), () => {
      if (whoseTurn(sess) !== 'human') return;
      const a = legalFor(sess).find((x) => (pm.col != null ? x.col === pm.col || (x.cell && x.cell.c === pm.col && pm.r == null) : x.cell && x.cell.r === pm.r && x.cell.c === pm.c));
      if (a) humanAction(sess, a);
      else emit(sess, 'turn');
    });
  }

  function advance(sess) {
    const turn = whoseTurn(sess);
    sess.turn = turn;
    if (turn === 'over') { concludeNatural(sess); return; }
    if (turn === 'model') beginModelTurn(sess);
    else {
      sess.modelTurn = null;
      stopClock(sess);
      maybeSubmitPremove(sess);
    }
    emit(sess, 'turn');
    save();
  }
  function mapWinner(sess, w) {
    if (w == null || w === 'draw') return 'draw';
    if (w === sess.humanSide || w === 'you' || w === 'human') return 'human';
    if (sess.setup.yourSeat && (w === 'seat' + sess.setup.yourSeat || w === sess.setup.yourSeat)) return 'human';
    return 'model';
  }
  function concludeNatural(sess) {
    if (sess.status !== 'active') return;
    if (sess.mode === 'engine') {
      const eng = Eng.get(sess.slug);
      const term = safe(() => eng.terminal(sess.state), null, 'ESE.terminal') || { winner: 'draw' };
      /* simultaneous tables decide in one reveal: the engine's own line ('Paper covers Rock.') is the verdict */
      const simul = W.ESE && typeof W.ESE.isSimultaneous === 'function' && W.ESE.isSimultaneous(sess.slug);
      finish(sess, { reason: 'normal', winner: mapWinner(sess, term.winner), scores: term.scores || null, term: term.reason || null, verdict: simul && term.reason ? term.reason : null });
    } else {
      const r = sess.rec.result || {};
      finish(sess, { reason: 'normal', winner: mapWinner(sess, r.winner), rawWinner: r.winner || null, scores: r.scores || null, verdict: typeof r.line === 'string' ? r.line : null });
    }
  }

  function recordFromSession(sess) {
    return {
      id: uid('r'), sessionId: sess.id, slug: sess.slug, setup: clone(sess.setup), modelIds: sessionModels(sess),
      humanSide: sess.humanSide, yourSeat: sess.setup.yourSeat || null, mode: sess.mode,
      frames: sess.frames.slice(), ledger: sess.ledger.slice(), result: clone(sess.result),
      moves: sess.plies, endedAt: sess.endedAt || now(), visibility: sess.visibility, publication: 'pending'
    };
  }
  function finish(sess, outcome) {
    if (!sess || sess.status !== 'active') return;
    clearTimers(sess);
    sess.status = 'completed';
    sess.endedAt = now();
    sess.modelTurn = null;
    sess.premove = null;
    sess.result = Object.assign({ reason: 'normal', winner: null }, outcome, { moves: sess.plies });
    sess.publication = 'pending';
    if (S.live === sess) S.live = null;
    const rec = recordFromSession(sess);
    sess.recordId = rec.id;
    P.matches = [rec].concat(Array.isArray(P.matches) ? P.matches : []).slice(0, 24);
    S.lastRecord = rec;
    save();
    renderCanvasShare();
    later(1200, () => {
      sess.publication = S.dev.publication === 'unavailable' ? 'unavailable' : 'ready';
      rec.publication = sess.publication;
      save();
      emit(sess, 'publication');
    });
    haptic(sess.result.winner === 'human' ? 'success' : 'failure');
    cue('result');
    emit(sess, 'completed');
  }
  function findRecord(id) { return (P.matches || []).find((r) => r.id === id) || null; }

  function serializeSession(sess) {
    return {
      id: sess.id, slug: sess.slug, setup: sess.setup, mode: sess.mode, seed: sess.seed, humanSide: sess.humanSide,
      createdAt: sess.createdAt, lastHumanAt: sess.lastHumanAt, plies: sess.plies, frames: sess.frames, ledger: sess.ledger,
      state: sess.mode === 'engine' ? sess.state : null, step: sess.step || 0, offset: sess.offset || 0,
      lastTurnMs: sess.lastTurnMs, visibility: sess.visibility, reasoning: sess.reasoning, reasoningSeq: sess.reasoningSeq || 0
    };
  }
  function restoreSession(o) {
    if (!o || !o.slug || !Eng.modeFor(o.slug) || Eng.modeFor(o.slug) !== o.mode) return null;
    const sess = Object.assign({}, o, { status: 'active', timers: {}, modelTurn: null, premove: null, result: null, publication: 'pending', turn: null });
    if (sess.mode === 'scripted') {
      sess.rec = Eng.scripted(sess.slug);
      if (!sess.rec) return null;
    } else if (!sess.state) return null;
    return sess;
  }

  /* Your matches fixtures: three full legal games recorded ai-vs-ai on first run. */
  const FIXTURE_VERSION = 2;                 /* bump to re-record the sample matches */
  function ensureFixtures() {
    if (Array.isArray(P.matches) && P.fixtureVersion === FIXTURE_VERSION) return;
    if (!W.ESE || typeof W.ESE.recordGame !== 'function') return;     /* retry on a later boot */
    const kept = Array.isArray(P.matches) ? P.matches.filter((r) => r && !r.fixture) : [];
    const models = ['anthropic/claude-haiku-4.5', 'openai/gpt-4.1-mini', 'google/gemini-2.5-flash'];
    const ago = [3 * 3600e3, 26 * 3600e3, 4 * 86400e3];
    const vis = ['public', 'followers', 'only_me'];
    const pool = FIXTURE_GAMES.filter((s) => Data.game(s) && Eng.get(s));
    const out = [];
    pool.slice(0, 3).forEach((slug, i) => {
      const side = i === 1 ? 'p2' : 'p1';
      const r = Eng.record(slug, { humanSide: side, seed: 11 + i * 17 });
      if (!r) return;
      const setup = normalizeSetup({ game: slug, modelId: models[i], side });
      const term = r.result || {};
      const winner = term.winner === 'draw' || !term.winner ? 'draw' : term.winner === side ? 'human' : 'model';
      const moves = typeof r.moves === 'number' ? r.moves : Math.max(0, r.frames.length - 1);
      out.push({
        id: uid('f'), slug, setup, modelIds: [setup.modelId], humanSide: side, yourSeat: null, mode: 'engine',
        frames: r.frames, ledger: Array.isArray(r.ledger) ? r.ledger : [],
        result: { reason: 'normal', winner, scores: term.scores || null, moves }, moves,
        endedAt: now() - ago[i], visibility: vis[i], publication: 'ready', fixture: true
      });
    });
    P.matches = kept.concat(out);
    P.fixtureVersion = FIXTURE_VERSION;
    save();
  }

  /* Outcome words for a finished record (result card, share card, Your matches). */
  function yourScore(rec, g) {
    const sc = rec.result && rec.result.scores;
    if (!sc) return null;
    const ys = rec.yourSeat || (rec.setup && rec.setup.yourSeat);
    const keys = ['you', rec.humanSide, ys ? 'seat' + ys : null, ys ? String(ys - 1) : null].filter(Boolean);
    let mine = null;
    if (Array.isArray(sc)) mine = sc[ys ? ys - 1 : rec.humanSide === 'p2' ? 1 : 0];
    else for (const k of keys) if (typeof sc[k] === 'number') { mine = sc[k]; break; }
    if (typeof mine !== 'number') return null;
    const all = (Array.isArray(sc) ? sc : Object.values(sc)).filter((x) => typeof x === 'number');
    const place = 1 + all.filter((x) => x > mine).length;
    return { mine, place, of: (g && g.seats > 2 ? g.seats : all.length) || all.length };
  }
  function signed(n) { return (n < 0 ? '−' + Math.abs(n) : '+' + n); }
  function outcomeOf(rec) {
    const g = Data.game(rec.slug);
    const r = rec.result || {};
    let m = modelOrStub((rec.modelIds || [])[0]);
    const seatM = /^seat\d$/.test(r.rawWinner || '') && rec.setup && Array.isArray(rec.setup.seatModels) ? rec.setup.seatModels[parseInt(r.rawWinner.slice(4), 10) - 1] : null;
    if (seatM) m = modelOrStub(seatM);
    const mName = shortName(m);
    const n = rec.moves != null ? rec.moves : r.moves || 0;
    const winWords = r.winner === 'human' ? t('youWon', 'You won.') : r.winner === 'model' ? t('modelWins', (x) => x + ' wins.', mName) : t('aDraw', 'A draw.');
    const o = { kind: 'draw', headline: winWords, sub: null, foot: null, verdict: null, chip: 'Draw', tone: 'draw', winner: r.winner };
    if (r.reason === 'resignation') {
      Object.assign(o, { kind: 'resigned', headline: t('modelWins', (x) => x + ' wins.', mName), sub: t('resignedOn', (x) => 'You resigned on move ' + x + '.', n), chip: 'Resigned', tone: 'loss', winner: 'model' });
    } else if (r.reason === 'model_timeout_award') {
      Object.assign(o, { kind: 'timeout', headline: t('youWon', 'You won.'), sub: t('claimedOnTimeout', 'Claimed on timeout.'), foot: t('claimFootnote', "Doesn't count toward your record. The model never took its turn."), chip: 'Claimed', tone: 'win', winner: 'human' });
    } else if (r.reason === 'model_unavailable') {
      Object.assign(o, { kind: 'unavailable', headline: mName + " couldn't finish.", sub: t('modelUnavailableLine', "The model couldn't finish. Your moves are saved; this match doesn't count toward your record."), chip: 'No result', tone: 'neutral', winner: null });
    } else if (r.reason === 'abandoned') {
      const replaced = r.source === 'user_ended';
      Object.assign(o, {
        kind: replaced ? 'replaced' : 'expired', headline: 'Match ended.', chip: replaced ? 'Ended' : 'Expired', tone: 'neutral', winner: null,
        sub: replaced ? t('endedForAnotherLine', 'You ended this match to start another.') : t('abandonedLine', 'This match expired after seven days without a move. Not a loss.')
      });
    } else {
      o.kind = r.winner === 'human' ? 'win' : r.winner === 'model' ? 'loss' : 'draw';
      o.chip = o.kind === 'win' ? 'Won' : o.kind === 'loss' ? 'Lost' : 'Draw';
      o.tone = o.kind === 'win' ? 'win' : o.kind === 'loss' ? 'loss' : 'draw';
      if (r.winner !== 'draw' && n) o.verdict = t('decidedOn', (x) => 'Decided on move ' + x + '.', n);
      if (r.verdict) o.verdict = r.verdict;
      const unit = g ? g.unit || (['chips', 'points', 'placement'].includes(g.scoreType) ? g.scoreType : null) : null;
      const ys = unit ? yourScore(rec, g) : null;
      if (unit && ys) {
        if (unit === 'placement') {
          o.headline = t('placeLine', (p, of) => Data.ordinal(p) + ' of ' + of + '.', ys.place, ys.of);
          o.sub = null;
        } else {
          o.headline = unit === 'chips' ? (ys.mine >= 0 ? t('chipsLine', (x) => '+' + x + ' chips.', ys.mine) : signed(ys.mine) + ' chips.')
            : (ys.mine >= 0 ? t('pointsLine', (x) => '+' + x + ' points.', ys.mine) : signed(ys.mine) + ' points.');
          o.sub = winWords;
        }
      }
    }
    return o;
  }

  /* ------------------------------------------------------------------
     Feedback: live region, sound, haptics
     ------------------------------------------------------------------ */
  function announce(text) {
    if (!S.liveEl) return;
    S.liveEl.textContent = '';
    later(40, () => { if (S.liveEl) S.liveEl.textContent = text; });
  }
  let audioCtx = null;
  function unlockAudio() {
    if (audioCtx || !P.settings.sound) return;
    try {
      const AC = W.AudioContext || W.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
  }
  function cue(kind) {
    if (!P.settings.sound || !audioCtx || audioCtx.state !== 'running') return;
    try {
      const o = audioCtx.createOscillator();
      const gn = audioCtx.createGain();
      const t0 = audioCtx.currentTime;
      o.type = 'sine';
      o.frequency.setValueAtTime(kind === 'result' ? 523.25 : 196, t0);
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(kind === 'result' ? 0.05 : 0.035, t0 + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'result' ? 0.6 : 0.09));
      o.connect(gn).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.65);
    } catch (e) { /* audio is optional */ }
  }
  /* Haptics are three notes on device (light tick, medium tap, success/failure).
     A desktop browser has no haptics, so this is a deliberate no-op. */
  function haptic() { /* device only */ }

  function emit(sess, type) {
    const v = S.stageView;
    if (v && v.sess === sess) safe(() => v.onEvent(type), null, 'stage.' + type);
    if (type !== 'clock' && S.homeView && typeof S.homeView.refreshResume === 'function') safe(() => S.homeView.refreshResume(), null, 'home.resume');
  }

  /* ------------------------------------------------------------------
     Root, status bar, screen stack, toast
     ------------------------------------------------------------------ */
  function statusBar() {
    const bar = h('div', { class: 'ap-status', 'aria-hidden': 'true' });
    bar.innerHTML = '<span class="ap-status-time">9:41</span><span class="ap-status-icons">' +
      '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
      '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1.5 4.2a9.5 9.5 0 0 1 13 0"/><path d="M4 7a6 6 0 0 1 8 0"/><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none"/></svg>' +
      '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2.5" y="2.5" width="19" height="8" rx="2" fill="currentColor"/><path d="M25.2 4.4v4.2c.8-.3 1.3-1.1 1.3-2.1s-.5-1.8-1.3-2.1z" fill="currentColor" opacity=".45"/></svg>' +
      '</span>';
    return bar;
  }
  function buildRoot(phone) {
    clear(phone);
    S.phone = phone;
    const root = h('div', { class: 'ap-root' });
    S.stack = h('div', { class: 'ap-stack' });
    S.sheetLayer = h('div', { class: 'sh-layer' });
    S.menuLayer = h('div', { class: 'ap-menu-layer' });
    S.toastEl = h('div', { class: 'ap-toast', role: 'status', 'aria-live': 'polite' });
    S.liveEl = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    append(root, [S.stack, S.sheetLayer, S.menuLayer, S.toastEl, statusBar(), h('div', { class: 'ap-homeind', 'aria-hidden': 'true' }), S.liveEl]);
    phone.appendChild(root);
    S.root = root;
    root.addEventListener('pointerdown', unlockAudio, { passive: true });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (S.menu) { closeMenu(); e.preventDefault(); return; }
      const top = S.sheets[S.sheets.length - 1];
      if (top) { top.close(); e.preventDefault(); }
    });
  }
  let toastTimer = null;
  function toast(msg) {
    if (!S.toastEl) return;
    S.toastEl.textContent = msg;
    S.toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = later(2600, () => S.toastEl.classList.remove('is-on'));
  }
  function topScreen() { return S.screens[S.screens.length - 1] || null; }
  function screenName() { const s = topScreen(); return s ? s.name : null; }
  function pushScreen(name, el, opts) {
    opts = opts || {};
    const entry = { name, el, cleanup: opts.cleanup || null, onReveal: opts.onReveal || null };
    el.classList.add('ap-screen');
    el.setAttribute('data-screen', name);
    if (opts.anim) el.classList.add('is-enter-' + opts.anim);
    S.stack.appendChild(el);
    S.screens.push(entry);
    if (opts.anim) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    return entry;
  }
  function removeScreen(entry, anim) {
    const i = S.screens.indexOf(entry);
    if (i < 0) return;
    S.screens.splice(i, 1);
    safe(() => entry.cleanup && entry.cleanup(), null, 'screen.cleanup');
    if (anim) {
      entry.el.classList.add('is-leave-' + anim);
      later(dur(260), () => entry.el.remove());
    } else entry.el.remove();
    const top = topScreen();
    if (top && top.onReveal) safe(() => top.onReveal(), null, 'screen.reveal');
  }
  function popScreen(anim) { const top = topScreen(); if (top && top.name !== 'home') removeScreen(top, anim || 'push'); }
  function popTo(name) {
    while (S.screens.length && topScreen().name !== name) removeScreen(topScreen(), null);
  }
  function goHome() {
    closeMenu();
    closeAllSheets(true);
    popTo('home');
    if (!S.screens.length) showHome();
    else if (S.homeView) S.homeView.render();
  }

  /* ------------------------------------------------------------------
     Sheets (bottom sheets with a grab handle; 280ms; scrim dismisses)
     ------------------------------------------------------------------ */
  function focusFirst(el) {
    let f = el.querySelector('[data-autofocus]');
    if (!f && el.getAttribute('role') === 'dialog') { if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); f = el; }
    if (!f) f = el.querySelector('button:not([disabled]), [href], input, [tabindex="0"]');
    if (f) safe(() => f.focus({ preventScroll: true }), null, 'focus');
  }
  /* build(entry) returns { body, foot?, head? } (elements). opts: { kind, height, label, onClose } */
  function openSheet(opts, build) {
    const entry = { kind: opts.kind, closed: false };
    const scrim = h('div', { class: 'sh-scrim', 'aria-hidden': 'true' });
    const sheet = h('div', { class: 'sh-sheet sh-sheet--' + opts.kind, role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || opts.kind });
    if (opts.height) sheet.style.height = opts.height;
    const grab = h('div', { class: 'sh-grab-zone' }, h('div', { class: 'sh-grab', 'aria-hidden': 'true' }));
    const headWrap = h('div', { class: 'sh-head-wrap' });
    const body = h('div', { class: 'sh-body' });
    const foot = h('div', { class: 'sh-foot' });
    append(sheet, [grab, headWrap, body, foot]);
    entry.scrim = scrim; entry.sheet = sheet; entry.body = body; entry.foot = foot; entry.headWrap = headWrap;
    entry.close = (o) => closeSheet(entry, o);
    entry.render = () => {
      const keep = body.scrollTop;
      const out = safe(() => build(entry), null, 'sheet.' + opts.kind) || {};
      clear(headWrap); clear(body); clear(foot);
      if (out.head) headWrap.appendChild(out.head);
      if (out.body) body.appendChild(out.body);
      if (out.foot) foot.appendChild(out.foot);
      foot.hidden = !out.foot;
      body.scrollTop = keep;
    };
    entry.onClose = opts.onClose || null;
    scrim.addEventListener('click', () => entry.close());
    /* drag the grab zone down to dismiss */
    let startY = null;
    grab.addEventListener('pointerdown', (e) => { startY = e.clientY; grab.setPointerCapture(e.pointerId); sheet.classList.add('is-dragging'); });
    grab.addEventListener('pointermove', (e) => {
      if (startY == null) return;
      const dy = Math.max(0, e.clientY - startY);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    });
    const endDrag = (e) => {
      if (startY == null) return;
      const dy = e.clientY - startY;
      startY = null;
      sheet.classList.remove('is-dragging');
      sheet.style.transform = '';
      if (dy > 110) entry.close();
    };
    grab.addEventListener('pointerup', endDrag);
    grab.addEventListener('pointercancel', endDrag);
    S.sheetLayer.append(scrim, sheet);
    S.sheets.push(entry);
    entry.render();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrim.classList.add('is-open');
      sheet.classList.add('is-open');
      later(dur(300), () => focusFirst(sheet));
    }));
    return entry;
  }
  function closeSheet(entry, o) {
    if (!entry || entry.closed) return;
    entry.closed = true;
    const i = S.sheets.indexOf(entry);
    if (i >= 0) S.sheets.splice(i, 1);
    entry.scrim.classList.remove('is-open');
    entry.sheet.classList.remove('is-open');
    const rm = () => { entry.scrim.remove(); entry.sheet.remove(); };
    if (o && o.instant) rm(); else later(dur(300), rm);
    if (entry.cleanup) safe(() => entry.cleanup(), null, 'sheet.cleanup');
    if (entry.onClose && !(o && o.silent)) safe(() => entry.onClose(o || {}), null, 'sheet.onClose');
    const top = S.sheets[S.sheets.length - 1];
    if (top && top.onReveal) safe(() => top.onReveal(), null, 'sheet.reveal');
  }
  function closeAllSheets(instant) {
    S.sheets.slice().reverse().forEach((s) => closeSheet(s, { silent: true, instant: !!instant }));
  }
  function findSheet(kind) { return S.sheets.find((s) => s.kind === kind) || null; }
  function sheetHead(title, opts) {
    opts = opts || {};
    return h('div', { class: 'sh-head' },
      opts.back ? h('button', { class: 'ap-iconbtn ap-iconbtn--ghost', type: 'button', 'aria-label': 'Back', onclick: opts.back }, ic('back', 20)) : null,
      h('div', { class: 'sh-head-txt' },
        h('h2', { class: 'sh-title' }, title),
        opts.sub ? h('div', { class: 'sh-sub mono' }, opts.sub) : null),
      opts.right || null,
      opts.close ? h('button', { class: 'ap-iconbtn ap-iconbtn--ghost', type: 'button', 'aria-label': 'Close', onclick: opts.close }, ic('close', 20)) : null);
  }

  /* ------------------------------------------------------------------
     Menus (avatar corner, stage overflow)
     ------------------------------------------------------------------ */
  function openMenu(items, anchor, opts) {
    closeMenu();
    opts = opts || {};
    const scrim = h('div', { class: 'ap-menu-scrim', onclick: closeMenu });
    const menu = h('div', { class: 'ap-menu' + (opts.up ? ' ap-menu--up' : ''), role: 'menu', 'aria-label': opts.label || 'Menu' },
      items.map((it) => h('button', {
        class: 'ap-menu-item' + (it.tone ? ' is-' + it.tone : ''), type: 'button', role: 'menuitem',
        onclick: () => { closeMenu(); it.onSelect(); }
      }, it.icon ? ic(it.icon, 18) : null, h('span', { class: 'ap-menu-label' }, it.label), it.meta ? h('span', { class: 'ap-menu-meta mono' }, it.meta) : null)));
    const pr = S.phone.getBoundingClientRect();
    const ar = anchor.getBoundingClientRect();
    const scale = pr.width / S.phone.offsetWidth || 1;
    const right = (pr.right - ar.right) / scale;
    menu.style.right = Math.max(10, right) + 'px';
    if (opts.up) menu.style.bottom = ((pr.bottom - ar.top) / scale + 6) + 'px';
    else menu.style.top = ((ar.bottom - pr.top) / scale + 6) + 'px';
    S.menuLayer.append(scrim, menu);
    S.menu = { scrim, menu, anchor };
    later(10, () => focusFirst(menu));
  }
  function closeMenu() {
    if (!S.menu) return;
    const m = S.menu;
    S.menu = null;
    m.scrim.remove();
    m.menu.remove();
    safe(() => m.anchor.focus({ preventScroll: true }), null, 'menu.focus');
  }

  /* ------------------------------------------------------------------
     Shared controls
     ------------------------------------------------------------------ */
  function segmented(options, value, onChange, opts) {
    opts = opts || {};
    const wrap = h('div', { class: 'ap-seg' + (opts.cls ? ' ' + opts.cls : ''), role: 'radiogroup', 'aria-label': opts.label || '' });
    options.forEach((o) => {
      const on = o.value === value;
      wrap.appendChild(h('button', {
        type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', class: 'ap-seg-btn' + (on ? ' is-on' : ''),
        disabled: opts.disabled || o.disabled ? true : null, tabindex: on ? '0' : '-1',
        onclick: () => { if (!on) onChange(o.value); },
        onkeydown: (e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const i = options.findIndex((x) => x.value === value);
          const n = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
          onChange(n.value);
          e.preventDefault();
        }
      }, o.label, o.meta ? h('span', { class: 'ap-seg-meta mono' }, o.meta) : null));
    });
    return wrap;
  }
  function toggle(on, onChange, label) {
    return h('button', { type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-label': label, class: 'ap-switch' + (on ? ' is-on' : ''), onclick: () => onChange(!on) }, h('span', { class: 'ap-switch-knob' }));
  }
  function statusPill(st) {
    return h('span', { class: 'ap-pill ap-pill--' + st }, Data.statusLabel(st));
  }
  function primaryBtn(label, onclick, opts) {
    opts = opts || {};
    return h('button', { type: 'button', class: 'ap-btn ap-btn--primary' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled ? true : null, onclick, 'aria-label': opts.aria || null }, opts.icon ? ic(opts.icon, 18) : null, label);
  }
  function secondaryBtn(label, onclick, opts) {
    opts = opts || {};
    return h('button', { type: 'button', class: 'ap-btn ap-btn--secondary' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled ? true : null, onclick, 'aria-label': opts.aria || null }, opts.icon ? ic(opts.icon, 18) : null, label);
  }
  function eyebrow(text, right) {
    return h('div', { class: 'ap-eyebrow-row' }, h('div', { class: 'ap-eyebrow' }, text), right || null);
  }

  /* Wordmark: the brand PNG, cropped to its ink (the PNG carries padding). */
  function wordmark(height, part) {
    const src = safe(() => (themePolarity(resolvedTheme()) === 'dark' ? W.ESA.wordmarkDark : W.ESA.wordmarkLight), '', 'ESA.wordmark');
    const box = h('span', { class: 'ap-wm' + (part ? ' ap-wm--' + part : ''), role: part ? null : 'img', 'aria-label': part ? null : 'eSlams', 'aria-hidden': part ? 'true' : null, style: { '--wm-h': height + 'px' } });
    if (src) box.appendChild(h('img', { src, alt: '', 'data-wordmark': '1', draggable: 'false' }));
    else box.appendChild(h('span', { class: 'ap-wm-text' }, 'eslams'));
    return box;
  }

  /* ------------------------------------------------------------------
     Theme and motion
     ------------------------------------------------------------------ */
  let mqDark = null;
  /* six theme ids; material themes take their polarity from their color-scheme (Club light; Neon, Arcade, Midnight dark) */
  const THEME_IDS = ['light', 'dark', 'neon', 'club', 'arcade', 'midnight'];
  const DARK_THEMES = ['dark', 'neon', 'arcade', 'midnight'];
  function themePolarity(th) { return DARK_THEMES.includes(th) ? 'dark' : 'light'; }
  function resolvedTheme() {
    if (THEME_IDS.includes(P.themePref)) return P.themePref;
    try { return W.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function applyTheme() {
    if (!S.phone) return;
    const th = resolvedTheme();
    S.phone.setAttribute('data-theme', th);
    S.phone.setAttribute('data-theme-pref', P.themePref);
    const src = safe(() => (themePolarity(th) === 'dark' ? W.ESA.wordmarkDark : W.ESA.wordmarkLight), '', 'ESA.wordmark');
    if (src) S.phone.querySelectorAll('img[data-wordmark]').forEach((im) => { im.src = src; });
    syncCanvas();
  }
  function setThemePref(pref) {
    P.themePref = THEME_IDS.includes(pref) ? pref : 'system';
    save();
    applyTheme();
    const set = findSheet('settings');
    if (set) set.render();
    const top = topScreen();
    if (top && top.name === 'settings' && top.rerender) top.rerender();
  }
  function setReducedMotion(on) {
    document.documentElement.classList.toggle('reduced-motion', !!on);
    restartPreviews();
    syncCanvas();
  }

  /* ------------------------------------------------------------------
     Living previews: one runs at a time (the top-most registered)
     ------------------------------------------------------------------ */
  function startPreview(host, slug, opts) {
    opts = opts || {};
    const g = Data.game(slug);
    const seed = opts.seed || 3;
    let frames = Eng.preview(slug, seed);
    if (!frames.length) {
      const v = Eng.startView(slug, 'p1');
      frames = v ? [v] : [];
    }
    const fam = familyOf(slug, frames[0]);
    const p = { host, slug, frames, i: 0, hold: 0, ctl: null, alive: true };
    const props = (view) => ({ family: fam, view, size: opts.size || 'preview', interactive: false, legal: [], lastMove: view && view.lastMove ? view.lastMove : null, reveal: true, reducedMotion: isReduced(), seats: opts.seats || null, youSeat: opts.youSeat || null });
    p.mount = () => {
      if (p.ctl) p.ctl.destroy();
      if (!frames.length) { boardFallback(host, { size: opts.size || 'preview' }); p.ctl = null; return; }
      p.i = isReduced() ? frames.length - 1 : 0;
      p.ctl = mountBoard(host, props(frames[p.i]));
    };
    p.step = () => {
      if (!p.alive || !p.ctl || frames.length < 2 || isReduced()) return;
      if (!previewOnTop(p)) return;     /* one at a time: only the preview on the top screen or sheet runs */
      if (p.i >= frames.length - 1) {
        p.hold += 1;
        if (p.hold < 3) return;                                   /* hold the final frame */
        p.hold = 0;
        p.mount();
        return;
      }
      p.i += 1;
      p.ctl.update(props(frames[p.i]));
    };
    p.destroy = () => {
      p.alive = false;
      clearInterval(p.timer);
      const k = S.previews.indexOf(p);
      if (k >= 0) S.previews.splice(k, 1);
      if (p.ctl) p.ctl.destroy();
    };
    p.mount();
    p.timer = setInterval(p.step, 900);
    S.previews.push(p);
    if (g && host) host.setAttribute('aria-label', 'Preview of ' + g.name + ', an engine-recorded sequence');
    return p;
  }
  function previewOnTop(p) {
    if (!p.host || !p.host.isConnected) return false;
    /* G-HOOK start: previewPause */
    if (W.ESOnboard && safe(() => W.ESOnboard.state().layer, false, 'onboard.state')) return false;   /* a first-run screen covers Home */
    /* G-HOOK end */
    const sheet = S.sheets.length ? S.sheets[S.sheets.length - 1].sheet : null;
    const layer = sheet || (topScreen() ? topScreen().el : null);
    return !!layer && layer.contains(p.host);
  }
  function restartPreviews() { S.previews.slice().forEach((p) => p.alive && p.mount()); }

  /* ------------------------------------------------------------------
     Launch: the brand beat (< 1.2s, tap to skip after the first launch)
     ------------------------------------------------------------------ */
  function brandBeat() {
    const el = h('div', { class: 'ap-brand' + (isReduced() ? ' is-static' : ''), role: 'img', 'aria-label': 'eSlams. ' + t('tagline', 'Here, AI plays games.') },
      h('div', { class: 'ap-brand-logo' }, wordmark(44, 'mark'), wordmark(44, 'text')),
      h('div', { class: 'ap-brand-tag' }, t('tagline', 'Here, AI plays games.')));
    S.root.appendChild(el);
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      el.classList.add('is-out');
      later(dur(150), () => el.remove());
      P.launched = true;
      save();
    };
    if (P.launched) el.addEventListener('click', end);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    later(1030, end);
    S.brandEnd = end;
  }

  /* ------------------------------------------------------------------
     [H] Game cards and match cards (brief 7.11): one card for every game,
     one for every match. Exposed as ESApp.ui.gameCard / ESApp.ui.matchCard
     so the first-run screens reuse the compact variant.
     ------------------------------------------------------------------ */
  function playableSlug(s) { const g = Data.game(s); return !!(g && !g.mobileExcluded && Eng.modeFor(s)); }
  /* favourites in pick order: ESApp.profile (agent G's getter) first, else the stored record */
  function favourites() {
    const pr = safe(() => (W.ESApp ? W.ESApp.profile : null), null, 'ESApp.profile');
    const raw = pr && Array.isArray(pr.favourites) ? pr.favourites : Array.isArray(P.favourites) ? P.favourites : [];
    const seen = new Set();
    return raw.filter((s) => { if (seen.has(s) || !playableSlug(s)) return false; seen.add(s); return true; });
  }
  function saveFavourites(list) {
    const clean = list.filter(playableSlug);
    const d = W.ESApp ? Object.getOwnPropertyDescriptor(W.ESApp, 'profile') : null;
    if (d && typeof d.set === 'function') safe(() => { W.ESApp.profile = { favourites: clean.slice() }; }, null, 'ESApp.profile.set');
    else { P.favourites = clean.slice(); save(); }
  }
  /* Home hero: the first favourite, else the stored setup's game, else Tic-Tac-Toe (decision 6) */
  function heroSlug() {
    const f = favourites();
    if (f.length) return f[0];
    const s = P.setup && P.setup.game;
    return s && playableSlug(s) ? s : 'tic-tac-toe';
  }
  /* the opponent last chosen at a table (a started match or a picker commit) */
  function lastOpponent(slug) {
    const id = P.tableOpp && P.tableOpp[slug];
    return id && Data.canPlay(id, slug) ? id : null;
  }
  function rememberOpponent(slug, id) {
    if (!slug || !id) return;
    P.tableOpp = Object.assign({}, P.tableOpp || {});
    P.tableOpp[slug] = id;
  }
  /* what a card's Play starts: the remembered opponent there, else the recommended Ready model */
  function setupFor(slug) {
    const same = P.setup && P.setup.game === slug;
    const s = same ? clone(P.setup) : { game: slug, side: 'p1', yourSeat: 1, seatModels: null };
    const g = Data.game(slug);
    if (!g || g.seats <= 2) s.modelId = lastOpponent(slug) || bestModelFor(slug, null);
    return normalizeSetup(s);
  }
  /* a static recorded position for posters: the last frame of the preview sequence */
  const POSTER_VIEWS = new Map();
  function posterView(slug) {
    if (!POSTER_VIEWS.has(slug)) {
      const fr = Eng.preview(slug, 5);
      POSTER_VIEWS.set(slug, (fr.length ? fr[fr.length - 1] : Eng.startView(slug, 'p1')) || null);
    }
    return POSTER_VIEWS.get(slug);
  }
  function mountPoster(host, slug, view, list) {
    const v = view || posterView(slug);
    let ctl;
    if (!v) { boardFallback(host, { size: 'poster' }); ctl = { destroy() { clear(host); } }; }
    else ctl = mountBoard(host, { family: familyOf(slug, v), view: v, size: 'poster', interactive: false, legal: [], reveal: true, lastMove: v.lastMove || null, reducedMotion: true });
    if (list) list.push(ctl);
    fitPoster(host, 0);
    return ctl;
  }
  /* scale a mounted poster to sit inside its box (table families lay out tall at 120px) */
  function fitPoster(box, tries) {
    requestAnimationFrame(() => {
      const inner = box.firstElementChild;
      if (!inner) return;
      if (!box.isConnected || !box.clientWidth) { if (tries < 8) fitPoster(box, tries + 1); return; }
      inner.style.transform = '';
      const b = box.getBoundingClientRect();
      const kids = Array.from(inner.children);
      let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
      (kids.length ? kids : [inner]).forEach((k) => { const r = k.getBoundingClientRect(); if (!r.width && !r.height) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); });
      const w = x1 - x0; const hgt = y1 - y0;
      if (!(w > 0) || !(hgt > 0)) return;
      const sc = Math.min(1.25, (b.width - 10) / w, (b.height - 10) / hgt);
      if (Math.abs(sc - 1) > 0.02) inner.style.transform = 'scale(' + sc.toFixed(3) + ')';
    });
  }
  /* a game's card name: the arena name for a one-table arena, else the game's own name */
  function cardName(slug) {
    const a = Data.arenaOf(slug);
    const g = Data.game(slug);
    if (!g) return a ? a.name : slug;
    return a && Data.visibleGames(a).length <= 1 ? a.name : g.name;
  }
  /* its mono label: the table label, else the arena, else Standard (never the name twice) */
  function cardLabel(slug, name) {
    const a = Data.arenaOf(slug);
    const g = Data.game(slug);
    if (!g) return '';
    if (g.tableLabel && g.tableLabel !== name) return g.tableLabel;
    if (a && a.name !== name) return a.name;
    return 'Standard';
  }
  /* Three actions, three looks: Play (accent fill), Resume (accent soft), Watch (outline + replay icon) */
  function actionBtn(kind, label, onclick, opts) {
    opts = opts || {};
    const icon = kind === 'watch' ? 'replay' : kind === 'play' && opts.icon ? 'play' : null;
    return h('button', { type: 'button', class: 'ap-act ap-act--' + kind + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled ? true : null, 'aria-label': opts.aria || null,
      onclick: (e) => { e.stopPropagation(); if (onclick) onclick(e); } }, icon ? ic(icon, 15) : null, h('span', null, label));
  }
  function opponentLine(setup) {
    const g = Data.game(setup.game);
    if (g && g.seats > 2) return h('div', { class: 'ap-gcard-opp' }, h('span', { class: 'ap-gcard-opp-txt mono' }, readiness(setup).line));
    const m = modelOrStub(setup.modelId);
    const stt = Data.status(setup.modelId, setup.game);
    return h('div', { class: 'ap-gcard-opp' + (stt === 'unavailable' ? ' is-recede' : '') }, providerTile(m, 22),
      h('span', { class: 'ap-gcard-opp-txt' }, 'vs ' + fullName(m) + ' · ', h('span', { class: 'ap-gcard-opp-st is-' + stt }, Data.statusLabel(stt))));
  }
  /* gameCard(slug, variant, opts)
     variant 'hero'    full width: glyph, name, table label, living preview, opponent line, Play now, two chips
             'rail'    about 150px: glyph, name, label, a small static poster, Play
             'compact' grid tile: 40px glyph tile, name, mono label; Active pill; selectable (setup favourites)
     opts: { arena (compact arena tile), active, selected, order, onOpen, onPlay, setup, posters:[] (collects board
             controllers to destroy), onPreview(previewController), playLabel, ariaLabel } */
  function gameCard(slug, variant, opts) {
    opts = opts || {};
    variant = ['hero', 'rail', 'compact', 'spotlight'].includes(variant) ? variant : 'compact';
    const g = Data.game(slug);
    const arena = opts.arena ? (typeof opts.arena === 'string' ? safe(() => Data.raw().arenas.find((a) => a.id === opts.arena), null, 'arena') : opts.arena) : Data.arenaOf(slug);
    const name = opts.arena && arena ? arena.name : cardName(slug);
    const label = opts.arena && arena ? arenaSubtitle(arena) : cardLabel(slug, name);
    if (variant === 'compact') {
      const sel = opts.selected === true;
      const selectable = opts.selected === true || opts.selected === false;
      const aria = opts.ariaLabel || (name + ', ' + label + (opts.active ? ', active' : '') + (sel ? ', ' + t('selectedFavourite', (n) => 'selected, favourite ' + n, opts.order || 1) : ''));
      return h('button', { type: 'button', class: 'ap-gcard ap-gcard-compact ap-tile' + (sel ? ' is-selected' : '') + (opts.active ? ' is-active' : ''),
        'aria-label': aria, 'aria-pressed': selectable ? (sel ? 'true' : 'false') : null, 'data-slug': slug, onclick: () => { if (opts.onOpen) opts.onOpen(slug); } },
      h('span', { class: 'ap-tile-top' }, glyphTile(arena || g, 40, sel ? 'ap-glyph--accent' : ''),
        sel ? h('span', { class: 'ap-gcard-check', 'aria-hidden': 'true' }, opts.order ? h('span', { class: 'mono' }, String(opts.order)) : ic('check', 14))
          : opts.active ? h('span', { class: 'ap-active-pill mono' }, t('active', 'Active')) : null),
      h('span', { class: 'ap-gcard-name ap-tile-name' }, name),
      h('span', { class: 'ap-gcard-label ap-tile-sub mono' }, label));
    }
    if (variant === 'spotlight') {
      /* wide first card of the first Home section: a larger STATIC poster (the hero keeps the only looping preview) */
      const poster = h('span', { class: 'ap-gcard-poster ap-gcard-poster--wide', 'aria-hidden': 'true' });
      mountPoster(poster, slug, null, opts.posters);
      return h('button', { type: 'button', class: 'ap-card ap-gcard ap-gcard-spot' + (opts.selected ? ' is-selected' : ''), 'data-slug': slug, disabled: opts.loading ? true : null, 'aria-busy': opts.loading ? 'true' : null,
        'aria-label': name + ', ' + label + '. Open the table', onclick: () => { if (opts.onOpen) opts.onOpen(slug); } },
      poster,
      h('span', { class: 'ap-gcard-row' }, glyphTile(arena || g, 36),
        h('span', { class: 'ap-gcard-txt' }, h('span', { class: 'ap-gcard-name' }, name), h('span', { class: 'ap-gcard-label mono' }, label)),
        h('span', { class: 'ap-gcard-go', 'aria-hidden': 'true' }, ic('play', 16))));
    }
    if (variant === 'rail' && opts.arena) {
      /* store poster card: the whole card opens the table sheet; the play mark is a hint, not a second action */
      const poster = h('span', { class: 'ap-gcard-poster', 'aria-hidden': 'true' });
      mountPoster(poster, slug, null, opts.posters);
      return h('button', { type: 'button', class: 'ap-gcard ap-gcard-rail ap-gcard-store' + (opts.selected ? ' is-selected' : ''), role: 'listitem', 'data-slug': slug,
        disabled: opts.loading ? true : null, 'aria-busy': opts.loading ? 'true' : null, 'aria-label': name + ', ' + label + '. Open the table', onclick: () => { if (opts.onOpen) opts.onOpen(slug); } },
      poster,
      h('span', { class: 'ap-gcard-row' }, glyphTile(arena || g, 28),
        h('span', { class: 'ap-gcard-txt' }, h('span', { class: 'ap-gcard-name' }, name), h('span', { class: 'ap-gcard-label mono' }, label)),
        h('span', { class: 'ap-gcard-go', 'aria-hidden': 'true' }, ic('play', 13))));
    }
    if (variant === 'rail') {
      const poster = h('span', { class: 'ap-gcard-poster', 'aria-hidden': 'true' });
      mountPoster(poster, slug, null, opts.posters);
      return h('div', { class: 'ap-gcard ap-gcard-rail', role: 'listitem', 'data-slug': slug },
        h('button', { type: 'button', class: 'ap-gcard-body', 'aria-label': name + ', ' + label + '. Open the table', onclick: () => { if (opts.onOpen) opts.onOpen(slug); } },
          poster,
          h('span', { class: 'ap-gcard-row' }, glyphTile(arena || g, 28),
            h('span', { class: 'ap-gcard-txt' }, h('span', { class: 'ap-gcard-name' }, name), h('span', { class: 'ap-gcard-label mono' }, label)))),
        actionBtn('play', opts.playLabel || t('play', 'Play'), () => { if (opts.onPlay) opts.onPlay(slug); }, { icon: true, disabled: S.dev.offline, aria: name + ', ' + label + ': ' + lcfirst(opts.playLabel || t('play', 'Play')) }));
    }
    /* hero */
    const setup = opts.setup || setupFor(slug);
    const host = h('div', { class: 'ap-gcard-board ap-pn-board', role: 'img' });
    const p = startPreview(host, slug, { seed: 5, seats: boardSeats(setup, setup.side), youSeat: g && g.seats > 2 ? 'seat' + (setup.yourSeat || 1) : setup.side || 'p1' });
    if (opts.onPreview) opts.onPreview(p);
    const ready = readiness(setup);
    const offline = S.dev.offline;
    const playLabel = offline ? t('backOnlineToPlay', 'Back online to play') : !ready.ok ? ready.line : t('playNow', 'Play now');
    return h('section', { class: 'ap-card ap-gcard ap-gcard-hero', 'aria-label': name + ', ' + label, 'data-slug': slug },
      h('div', { class: 'ap-gcard-head' }, glyphTile(arena || g, 40, 'ap-glyph--accent'),
        h('div', { class: 'ap-gcard-txt' }, h('h2', { class: 'ap-gcard-name' }, name), h('div', { class: 'ap-gcard-label mono' }, label))),
      h('div', { class: 'ap-well ap-gcard-well' }, host),
      opponentLine(setup),
      primaryBtn(playLabel, () => { if (opts.onPlay) opts.onPlay(setup); else startFlow(setup, { from: 'home' }); }, { disabled: offline || !ready.ok, cls: 'ap-btn--hero', icon: offline || !ready.ok ? null : 'play' }),
      h('div', { class: 'ap-gcard-chips' },
        h('button', { type: 'button', class: 'ap-chip-btn', onclick: () => { if (opts.onChangeOpponent) opts.onChangeOpponent(setup); } }, h('span', { class: 'ap-chip' }, t('changeOpponent', 'Change opponent'))),
        h('button', { type: 'button', class: 'ap-chip-btn', onclick: () => { if (opts.onChangeTable) opts.onChangeTable(setup); else openTableSheet(setup); } }, h('span', { class: 'ap-chip' }, t('changeTable', 'Change table')))));
  }

  /* One status chip per match: Your move, Thinking, Final 1–0, +60 chips, 2nd of 4, A draw */
  function resultChip(rec) {
    const o = outcomeOf(rec);
    if (!['win', 'loss', 'draw'].includes(o.kind)) return { label: o.chip, tone: o.tone };
    const g = Data.game(rec.slug);
    const unit = g ? g.unit || (['chips', 'points', 'placement'].includes(g.scoreType) ? g.scoreType : null) : null;
    const ys = unit ? yourScore(rec, g) : null;
    if (unit && ys) {
      if (unit === 'placement') return { label: Data.ordinal(ys.place) + ' of ' + ys.of, tone: ys.place === 1 ? 'win' : ys.place === ys.of ? 'loss' : 'draw' };
      const word = unit === 'chips' ? ' chips' : ' points';
      return { label: signed(ys.mine) + word, tone: ys.mine > 0 ? 'win' : ys.mine < 0 ? 'loss' : 'draw' };
    }
    if (o.kind === 'draw') return { label: t('aDrawChip', 'A draw'), tone: 'draw' };
    const sc = rec.result && rec.result.scores;
    const me = rec.humanSide === 'p2' ? 'p2' : 'p1';
    const them = me === 'p1' ? 'p2' : 'p1';
    if (sc && typeof sc[me] === 'number' && typeof sc[them] === 'number' && (sc[me] !== sc[them])) return { label: 'Final ' + sc[me] + '–' + sc[them], tone: o.tone };
    return { label: o.kind === 'win' ? 'Final 1–0' : 'Final 0–1', tone: o.tone };
  }
  /* matchCard(src, opts): src = the live session, a stored record, or { web:true, slug, modelId, state }.
     opts: { action:'resume'|'watch'|'again'|null, onOpen, onAction, posters:[], cls, detail } */
  function matchCard(src, opts) {
    opts = opts || {};
    const isWeb = !!(src && src.web);
    const isLive = !isWeb && !!(src && src.status === 'active' && src.frames);
    const slug = src.slug;
    const g = Data.game(slug);
    const a = Data.arenaOf(slug);
    const ids = isWeb ? [src.modelId] : isLive ? sessionModels(src) : (src.modelIds || []);
    const m = modelOrStub(ids[0]);
    let chip;
    let time;
    if (isWeb) {
      chip = /your move/i.test(src.state || '') ? { label: t('yourMove', 'Your move'), tone: 'accent' } : { label: t('thinking', 'Thinking'), tone: 'quiet', icon: 'clock' };
      time = 'on the web';
    } else if (isLive) {
      const turn = whoseTurn(src);
      chip = turn === 'human' ? { label: t('yourMove', 'Your move'), tone: 'accent' } : { label: t('thinking', 'Thinking'), tone: 'quiet', icon: 'clock' };
      time = t('moveN', (n) => 'move ' + n, src.plies + 1);
    } else {
      chip = resultChip(src);
      time = relTime(src.endedAt);
    }
    const poster = h('span', { class: 'ap-mcard-poster', 'aria-hidden': 'true' });
    const fv = isWeb ? null : isLive ? sessView(src) || src.frames[src.frames.length - 1] : src.frames && src.frames.length ? src.frames[src.frames.length - 1] : null;
    if (fv && g) mountPoster(poster, slug, fv, opts.posters);
    else poster.appendChild(glyphTile(a || g, 34));
    const vsName = ids.length > 1 ? ids.length + ' models' : fullName(m);
    const who = h('span', { class: 'ap-mcard-who' }, youTile(20), h('span', { class: 'ap-mcard-you' }, 'You'), h('span', { class: 'ap-mcard-vs mono' }, 'vs'),
      ids.length > 1 ? h('span', { class: 'ap-mcard-stack' }, ids.slice(0, 3).map((id) => providerTile(modelOrStub(id), 20))) : providerTile(m, 20),
      h('span', { class: 'ap-mcard-opp' }, vsName));
    const chipEl = h('span', { class: 'ap-mchip is-' + chip.tone }, chip.icon ? ic(chip.icon, 13) : null, chip.label);
    const action = opts.action === 'resume' ? actionBtn('resume', t('resume', 'Resume'), opts.onAction)
      : opts.action === 'watch' ? (opts.disabledReason ? h('span', { class: 'ap-mcard-reason mono' }, opts.disabledReason) : actionBtn('watch', t('watch', 'Watch'), opts.onAction, { aria: 'Watch the replay' }))
        : opts.action === 'again' ? actionBtn('play', t('playAgain', 'Play again'), opts.onAction) : null;
    const title = g ? arenaTableLine(slug) : slug;
    const aria = title + ', you vs ' + vsName + ', ' + chip.label + ', ' + (opts.detail || time);
    const body = h(opts.onOpen ? 'button' : 'div', { type: opts.onOpen ? 'button' : null, class: 'ap-mcard-body', 'aria-label': aria, onclick: opts.onOpen || null },
      poster,
      h('span', { class: 'ap-mcard-txt' },
        h('span', { class: 'ap-mcard-title' }, title),
        who,
        h('span', { class: 'ap-mcard-foot' }, chipEl, h('span', { class: 'ap-mcard-time mono', title: opts.detail || null }, time), opts.extra || null),
        opts.note ? h('span', { class: 'ap-mcard-note' }, opts.note) : null));
    return h('div', { class: 'ap-mcard' + (isLive ? ' is-live' : '') + (isWeb ? ' is-web' : '') + (action ? ' has-act' : '') + (opts.cls ? ' ' + opts.cls : ''), role: opts.role || null, 'data-slug': slug }, body, action);
  }

  /* ------------------------------------------------------------------
     Arena Home
     ------------------------------------------------------------------ */
  function arenaSubtitle(arena) {
    const list = Data.visibleGames(arena);
    if (list.length === 1) return (Data.game(list[0]) || {}).tableLabel || '';
    return t('tablesCount', (n) => n + ' tables', list.length) + ' · ' + list.map((s) => (Data.game(s) || {}).tableLabel).join(' / ');
  }
  function arenaTableLine(slug) {
    const g = Data.game(slug);
    const a = Data.arenaOf(slug);
    if (!g) return '';
    if (!a) return g.name;
    return Data.visibleGames(a).length > 1 && g.tableLabel !== a.name ? a.name + ' · ' + g.tableLabel : a.name;
  }
  function avatarButton() {
    const name = P.username || 'player-1';
    const btn = h('button', { type: 'button', class: 'ap-avatar-btn', 'aria-label': 'Account menu for ' + name, 'aria-haspopup': 'menu' },
      h('span', { class: 'ap-avatar mono', 'aria-hidden': 'true' }, initials(name).slice(0, 2)));
    btn.addEventListener('click', () => openMenu([
      { label: t('yourMatches', 'Your matches'), icon: 'replay', onSelect: openMatches },
      { label: t('settingsTitle', 'Settings'), icon: 'settings', onSelect: openSettings },
      { label: t('signOut', 'Sign out'), icon: 'signout', onSelect: signOut }
    ], btn, { label: 'Account' }));
    return btn;
  }
  function homeHeader() {
    const right = P.signedIn ? avatarButton()
      : h('button', { type: 'button', class: 'ap-chip-btn', onclick: () => { if (W.ESOnboard && typeof W.ESOnboard.auth === 'function') W.ESOnboard.auth({}); else openSignIn({ intent: null }); } }, h('span', { class: 'ap-chip' }, t('signIn', 'Sign in')));
    return h('header', { class: 'ap-hdr' }, wordmark(22), right);
  }
  function resumeCard(view) {
    const sess = S.live;
    if (sess && sess.status === 'active') {
      const posters = view ? (view.resumePosters = view.resumePosters || []) : null;
      return matchCard(sess, { cls: 'ap-resume', action: 'resume', posters, onOpen: () => enterStage(sess, { anim: 'fade' }), onAction: () => enterStage(sess, { anim: 'fade' }) });
    }
    if (S.webSession) {
      const w = S.webSession;
      return matchCard({ web: true, slug: w.slug, modelId: w.modelId, state: w.state }, { cls: 'ap-resume is-web',
        note: t('playingOnTheWeb', 'Playing on the web. Finish it there or end it here.') });
    }
    return null;
  }
  /* the hero: your first favourite (or Tic-Tac-Toe) with its Ready opponent and Play now */
  function heroCard(view) {
    const slug = heroSlug();
    if (!Data.game(slug)) return null;
    return gameCard(slug, 'hero', {
      onPreview: (p) => { view.preview = p; },
      onChangeOpponent: (setup) => {
        const g = Data.game(setup.game);
        if (g && g.seats > 2) { openTableSheet(setup); return; }
        openRoster({ slug: setup.game, selectedId: setup.modelId, title: t('chooseYourOpponent', 'Choose your opponent'),
          onPick: (id) => { rememberOpponent(setup.game, id); if (P.setup && P.setup.game === setup.game) P.setup.modelId = id; save(); if (S.homeView) S.homeView.render(); } });
      },
      onChangeTable: (setup) => openTableSheet(setup)
    });
  }
  function yourGamesRail(view) {
    const favs = favourites();
    if (favs.length < 2) return null;    /* none: nothing nags; one: it is already the hero, a one-card rail only repeats it */
    return h('section', { class: 'ap-yg', 'aria-label': t('yourGames', 'Your games') },
      h('div', { class: 'ap-sec-head' }, h('h2', { class: 'ap-sec-title' }, t('yourGames', 'Your games')),
        h('button', { type: 'button', class: 'ap-link ap-sec-link', onclick: () => openYourGames() }, t('edit', 'Edit'))),
      h('div', { class: 'ap-rail', role: 'list' }, favs.map((s) => gameCard(s, 'rail', {
        posters: view.posters, onOpen: () => openTableSheet(setupFor(s)), onPlay: () => startFlow(setupFor(s), { from: 'home' })
      }))));
  }
  /* Home store sections, in order. Recommended is derived on device from favourites and play history only
     (never presented as AI-chosen). Start here uses the marquee arenas: there are no real play counts, so
     nothing is called Popular. */
  function homeSections() {
    const arenas = Data.arenas();
    const favs = favourites();
    const favArenas = new Set(favs.map((s) => (Data.arenaOf(s) || {}).id).filter(Boolean));
    const favCats = new Set(arenas.filter((a) => favArenas.has(a.id)).map((a) => a.category));
    const played = new Set((Array.isArray(P.matches) ? P.matches : []).map((r) => r && (Data.arenaOf(r.slug) || {}).category).filter(Boolean));
    const rec = [];
    const add = (a) => { if (rec.length < 8 && !favArenas.has(a.id) && !rec.includes(a)) rec.push(a); };
    arenas.filter((a) => favCats.has(a.category)).forEach(add);
    arenas.filter((a) => !played.has(a.category)).forEach(add);
    const out = [];
    if (rec.length) out.push({ id: 'recommended', title: t('recommendedForYou', 'Recommended for you'), arenas: rec });
    out.push({ id: 'start', title: t('startHere', 'Start here'), arenas: arenas.filter((a) => a.marquee) });
    /* category rails: arenas already shown above (Recommended, Start here) move to the end; See all keeps catalogue order */
    const shown = new Set(out.flatMap((x) => x.arenas.map((a) => a.id)));
    Data.categories().forEach((c) => {
      const all = arenas.filter((a) => a.category === c.id);
      out.push({ id: c.id, title: c.label, arenas: all, railOrder: all.filter((a) => !shown.has(a.id)).concat(all.filter((a) => shown.has(a.id))) });
    });
    return out.filter((x) => x.arenas.length);
  }
  function storeSection(view, sec, first) {
    const list = first ? sec.arenas.slice(1) : (sec.railOrder || sec.arenas);
    const card = (a, v) => gameCard(Data.visibleGames(a)[0], v, { arena: a, posters: view.posters, onOpen: () => openArena(a) });
    return h('section', { class: 'ap-sec', 'aria-label': sec.title, 'data-sec': sec.id },
      h('div', { class: 'ap-sec-head' }, h('h3', { class: 'ap-sec-title' }, sec.title),
        h('button', { type: 'button', class: 'ap-link ap-sec-link', onclick: () => openSeeAll(sec.id) }, t('seeAll', 'See all'))),
      first ? card(sec.arenas[0], 'spotlight') : null,
      list.length ? h('div', { class: 'ap-rail ap-rail--store', role: 'list' }, list.map((a) => card(a, 'rail'))) : null);
  }
  function arenasSection(view) {
    const secs = homeSections();
    view.sectionTitles = secs.map((x) => x.title);
    return h('section', { class: 'ap-arenas ap-store', 'aria-label': t('chooseYourGame', 'Choose your game') },
      h('h2', { class: 'ap-store-title' }, t('chooseYourGame', 'Choose your game')),
      secs.map((x, i) => storeSection(view, x, i === 0)));
  }
  function openSeeAll(id) {
    closeMenu();
    const sec = homeSections().find((x) => x.id === id);
    if (!sec) return null;
    const activeArena = (Data.arenaOf(heroSlug()) || {}).id;
    const scroll = h('div', { class: 'ap-scroll ap-push-scroll' }, pushHeader(sec.title),
      h('div', { class: 'ap-grid ap-seeall-grid' }, sec.arenas.map((a) => gameCard(Data.visibleGames(a)[0], 'compact', { arena: a, active: a.id === activeArena, onOpen: () => openArena(a) }))));
    const el = h('section', { class: 'ap-push', 'aria-label': sec.title }, scroll);
    return pushScreen('seeall', el, { anim: 'push' });
  }
  function emptyCatalogue() {
    return h('section', { class: 'ap-card ap-empty', role: 'status' },
      glyphTile({ glyph: 'g_board' }, 44),
      h('h2', { class: 'ap-empty-title' }, t('arenaComingSoon', 'Arena games coming soon')),
      h('p', { class: 'ap-empty-body' }, t('catalogueUnavailable', 'The playable game catalogue is unavailable right now.')));
  }
  function openArena(a) {
    const list = Data.visibleGames(a);
    const hero = heroSlug();
    const cur = P.setup && P.setup.game;
    const slug = list.includes(hero) ? hero : list.includes(cur) ? cur : list[0];
    openTableSheet(setupFor(slug));
  }
  function showHome() {
    const scroll = h('div', { class: 'ap-scroll ap-home-scroll' });
    const ptr = h('div', { class: 'ap-ptr mono', 'aria-hidden': 'true' }, t('preparingGames', 'Preparing playable games and model opponents.'));
    const el = h('section', { class: 'ap-home', 'aria-label': 'Arena' }, ptr, scroll);
    const view = { el, scroll, preview: null };
    view.render = () => {
      const keep = scroll.scrollTop;
      if (view.preview) { view.preview.destroy(); view.preview = null; }
      (view.posters || []).concat(view.resumePosters || []).forEach((c) => safe(() => c.destroy(), null, 'poster.destroy'));
      view.posters = [];
      view.resumePosters = [];
      clear(scroll);
      scroll.appendChild(homeHeader());
      if (!Data.ok()) {
        append(scroll, [emptyCatalogue()]);
        return;
      }
      view.resumeSlot = h('div', { class: 'ap-resume-slot' }, resumeCard(view));
      append(scroll, [view.resumeSlot, heroCard(view), yourGamesRail(view), arenasSection(view)]);
      /* nothing outranks an unfinished match: a newly shown Resume card brings Home to the top */
      const rid = S.live && S.live.status === 'active' ? S.live.id : S.webSession ? 'web' : null;
      const toTop = !!rid && rid !== view.resumeId;
      view.resumeId = rid;
      scroll.scrollTop = toTop ? 0 : keep;
    };
    view.refreshResume = () => {
      if (!view.resumeSlot || !view.resumeSlot.isConnected) return;
      (view.resumePosters || []).forEach((c) => safe(() => c.destroy(), null, 'poster.destroy'));
      view.resumePosters = [];
      clear(view.resumeSlot);
      append(view.resumeSlot, [resumeCard(view)]);
    };
    /* pull down at the top to re-fetch the catalogue and roster */
    let y0 = null; let pulled = 0;
    scroll.addEventListener('pointerdown', (e) => { if (scroll.scrollTop <= 0 && e.button === 0) { y0 = e.clientY; pulled = 0; } });
    scroll.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      pulled = Math.max(0, e.clientY - y0);
      if (pulled > 6) { scroll.style.transform = 'translateY(' + Math.min(64, pulled * 0.45) + 'px)'; ptr.classList.toggle('is-on', pulled > 70); }
    });
    const endPull = () => {
      if (y0 == null) return;
      y0 = null;
      scroll.style.transform = '';
      if (pulled > 70) {
        ptr.classList.add('is-on');
        scroll.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
        later(dur(900), () => { ptr.classList.remove('is-on'); view.render(); });
      } else ptr.classList.remove('is-on');
    };
    scroll.addEventListener('pointerup', endPull);
    scroll.addEventListener('pointerleave', endPull);
    S.homeView = view;
    pushScreen('home', el, {
      cleanup: () => { if (view.preview) view.preview.destroy(); (view.posters || []).concat(view.resumePosters || []).forEach((c) => safe(() => c.destroy(), null, 'poster.destroy')); if (S.homeView === view) S.homeView = null; },
      onReveal: () => view.render()
    });
    view.render();
  }

  /* ------------------------------------------------------------------
     Table sheet: choose table, preview, how to play, opponent or seats,
     side, Start (the web's setup card, made for a thumb)
     ------------------------------------------------------------------ */
  function suggested(slug, selectedId, limit) {
    const pool = Data.modelsFor(slug).map((m, i) => [m, i]).sort((x, y) => ((y[0].recommended ? 1 : 0) - (x[0].recommended ? 1 : 0)) || x[1] - y[1]).map((x) => x[0]);
    const byProv = new Map();
    pool.forEach((m) => { if (!byProv.has(m.provider)) byProv.set(m.provider, []); byProv.get(m.provider).push(m); });
    const out = [];
    let added = true;
    while (out.length < limit && added) {
      added = false;
      for (const list of byProv.values()) if (list.length && out.length < limit) { out.push(list.shift()); added = true; }
    }
    if (selectedId && !out.some((m) => m.id === selectedId)) {
      const sm = Data.model(selectedId);
      if (sm) out.splice(Math.min(2, out.length), out.length >= limit ? 1 : 0, sm);
    }
    return out;
  }
  function unitLabel(g) {
    const u = g.unit || g.scoreType;
    return u === 'chips' ? 'chips' : u === 'placement' ? 'placement' : u === 'points' ? 'points' : 'win · loss · draw';
  }
  function seatRing(d, g, onSeatTap) {
    const names = seatNames(g);
    const n = g.seats;
    const pos = n === 3 ? ['bottom', 'topleft', 'topright'] : ['bottom', 'left', 'top', 'right'];
    const ring = h('div', { class: 'sh-ts-ring sh-ts-ring--' + n, role: 'group', 'aria-label': 'Seats at the table' },
      h('div', { class: 'sh-ts-ring-oval', 'aria-hidden': 'true' }, h('span', { class: 'sh-ts-ring-unit mono' }, unitLabel(g))));
    for (let i = 0; i < n; i++) {
      const where = pos[(i - (d.yourSeat - 1) + n) % n];
      if (i === d.yourSeat - 1) {
        ring.appendChild(h('div', { class: 'sh-ts-seat sh-ts-seat--' + where + ' is-you' }, youTile(34),
          h('span', { class: 'sh-ts-seat-name' }, P.username || 'You'),
          h('span', { class: 'sh-ts-seat-label mono' }, t('seatYou', (s) => s + ' · you', names[i]))));
      } else {
        const id = d.seatModels[i];
        const m = id ? modelOrStub(id) : null;
        const bad = id && !Data.canPlay(id, d.game);
        ring.appendChild(h('button', { type: 'button', class: 'sh-ts-seat sh-ts-seat--' + where + (bad ? ' is-recede' : ''), 'aria-label': names[i] + ': ' + (m ? fullName(m) : 'empty') + '. Tap to swap.', onclick: () => onSeatTap(i) },
          m ? providerTile(m, 34) : h('span', { class: 'ap-tile-empty' }, ic('plus', 16)),
          h('span', { class: 'sh-ts-seat-name' }, m ? shortName(m) : t('chooseAnOpponent', 'Choose an opponent')),
          h('span', { class: 'sh-ts-seat-label mono' }, t('seatTapToSwap', (s) => s + ' · tap to swap', names[i]))));
      }
    }
    return ring;
  }
  function openTableSheet(setup, opts) {
    opts = opts || {};
    const st = { draft: normalizeSetup(clone(setup)), expanded: false, previewSlug: null, preview: null, previewHost: null };
    const entry = openSheet({ kind: 'table', height: '90%', label: 'Table setup' }, (e) => buildTableSheet(e, st));
    entry.st = st;
    entry.cleanup = () => { if (st.preview) st.preview.destroy(); };
    entry.onReveal = () => entry.render();
    if (opts.openRoster) later(dur(320), () => openRosterForDuel(entry, st));
    return entry;
  }
  function openRosterForDuel(entry, st) {
    const g = Data.game(st.draft.game);
    openRoster({
      slug: st.draft.game, selectedId: st.draft.modelId, title: t('chooseYourOpponent', 'Choose your opponent'),
      onPick: (id) => { st.draft.modelId = id; rememberOpponent(st.draft.game, id); save(); entry.render(); if (S.homeView) S.homeView.render(); }
    });
  }
  function buildTableSheet(e, st) {
    const d = st.draft;
    const g = Data.game(d.game);
    const a = Data.arenaOf(d.game);
    if (!g) return { body: emptyCatalogue() };
    const tables = a ? Data.visibleGames(a) : [d.game];
    const mode = Eng.modeFor(d.game);
    const set = (patch) => { Object.assign(st.draft, patch); st.draft = normalizeSetup(st.draft); e.render(); };
    const head = h('div', { class: 'sh-ts-headwrap' },
      h('div', { class: 'sh-ts-head' }, glyphTile(a, 40),
        h('div', { class: 'sh-ts-head-txt' }, h('h2', { class: 'sh-title' }, a ? a.name : g.name)),
        h('button', { type: 'button', class: 'ap-chip-btn', onclick: () => openHowto(d.game) }, h('span', { class: 'ap-chip ap-chip--icon' }, ic('help', 16), t('howToPlay', 'How to play')))),
      h('div', { class: 'sh-sub mono sh-ts-meta' }, Data.metaLine(d.game)));
    const body = h('div', { class: 'sh-ts-body' });

    if (tables.length > 1) {
      body.appendChild(h('section', { class: 'sh-ts-sec' }, eyebrow(t('chooseYourTable', 'Choose your table')),
        h('div', { class: 'sh-ts-tables', role: 'radiogroup', 'aria-label': t('chooseYourTable', 'Choose your table') },
          tables.map((slug) => {
            const tg = Data.game(slug);
            const on = slug === d.game;
            return h('button', { type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', class: 'sh-ts-table' + (on ? ' is-on' : ''),
              onclick: () => { if (!on) { st.draft = normalizeSetup({ game: slug, modelId: d.modelId, side: d.side, yourSeat: 1, seatModels: null }); st.expanded = false; e.render(); } } },
            h('span', { class: 'sh-ts-table-name' }, tg.tableLabel), h('span', { class: 'sh-ts-table-var mono' }, tg.variantLabel || tg.variantToken));
          }))));
    }

    later(0, () => {
      const row = body.querySelector('.sh-ts-tables');
      const on = row && row.querySelector('.is-on');
      if (on && row.isConnected && (on.offsetLeft + on.offsetWidth > row.scrollLeft + row.clientWidth || on.offsetLeft < row.scrollLeft)) row.scrollLeft = on.offsetLeft - 20;
    });
    if (g.seats > 2) {
      if (st.preview) { st.preview.destroy(); st.preview = null; st.previewSlug = null; }
      body.appendChild(h('section', { class: 'sh-ts-sec' }, seatRing(d, g, (i) => {
        const names = seatNames(g);
        const seated = {};
        d.seatModels.forEach((id, k) => { if (id && k !== i) seated[id] = names[k]; });
        openRoster({
          slug: d.game, selectedId: d.seatModels[i], title: t('pickAModel', (s) => s + ' · pick a model', names[i]), seated,
          onPick: (id) => {
            if (seated[id]) return;
            st.draft.seatModels[i] = id;
            st.draft = normalizeSetup(st.draft);
            e.render();
          }
        });
      })));
    } else {
      if (!st.previewHost || st.previewSlug !== d.game) {
        if (st.preview) st.preview.destroy();
        st.previewHost = h('div', { class: 'sh-ts-preview-board', role: 'img' });
        st.preview = startPreview(st.previewHost, d.game, { seed: 9 });
        st.previewSlug = d.game;
      }
      body.appendChild(h('section', { class: 'sh-ts-sec' }, h('div', { class: 'ap-well sh-ts-preview' }, st.previewHost)));
    }
    if (mode === 'scripted') body.appendChild(h('div', { class: 'sh-ts-demo' }, h('span', { class: 'ap-demo-pill mono' }, t('demoPill', 'demo')), h('span', null, t('demoNote', 'This table plays a recorded demo in the prototype.'))));

    const sections = Data.helpSections(d.game, !st.expanded);
    body.appendChild(h('section', { class: 'sh-ts-sec sh-ts-howto', 'aria-label': t('howToPlay', 'How to play') }, eyebrow(t('howToPlay', 'How to play')),
      h('dl', { class: 'sh-ts-help' }, sections.map((s) => [h('dt', { class: 'mono' }, s.title), h('dd', null, s.body)])),
      sections.length ? h('button', { type: 'button', class: 'ap-link', 'aria-expanded': st.expanded ? 'true' : 'false', onclick: () => { st.expanded = !st.expanded; e.render(); } }, st.expanded ? t('less', 'Less') : t('more', 'More')) : null));

    if (g.seats > 2) {
      const names = seatNames(g);
      body.appendChild(h('section', { class: 'sh-ts-sec' },
        eyebrow(t('yourSeat', 'Your seat'), h('span', { class: 'sh-ts-opens mono' }, d.yourSeat === 1 ? t('youOpen', 'You open') : t('modelOpens', 'Model opens'))),
        segmented(names.map((nm, i) => ({ value: i + 1, label: g.seatLayout === 'compass' ? nm : String(i + 1) })), d.yourSeat, (v) => { remapSeats(st.draft, v); e.render(); }, { label: t('yourSeat', 'Your seat'), cls: 'sh-ts-seatseg' }),
        secondaryBtn(t('autoFillTable', 'Auto-fill table'), () => { st.draft.seatModels = autoFillSeats(d.game, g.seats, d.yourSeat, null, true); st.draft = normalizeSetup(st.draft); e.render(); }, { icon: 'shuffle', cls: 'sh-ts-autofill' })));
    } else {
      /* the opponent pins under the header row (the sheet head does not scroll); no suggestion rail here */
      const m = modelOrStub(d.modelId);
      const stt = Data.status(d.modelId, d.game);
      const pool = Data.modelsFor(d.game);
      head.appendChild(h('section', { class: 'sh-ts-pin', 'aria-label': t('yourOpponent', 'Your opponent') }, eyebrow(t('yourOpponent', 'Your opponent')),
        pool.length ? h('div', { class: 'sh-ts-opp' + (stt === 'unavailable' ? ' is-recede' : '') }, providerTile(m, 40),
          h('div', { class: 'sh-ts-opp-txt' }, h('div', { class: 'sh-ts-opp-name' }, fullName(m)),
            h('div', { class: 'sh-ts-opp-prov' }, m.providerName || m.provider),
            h('div', { class: 'sh-ts-opp-meta' }, statusPill(stt), h('span', { class: 'mono sh-ts-opp-cov' }, coverageLine(m.id)))),
          h('button', { type: 'button', class: 'ap-btn ap-btn--small sh-ts-change', onclick: () => openRosterForDuel(e, st) }, t('change', 'Change')))
          : h('p', { class: 'sh-ts-empty mono' }, t('noModelsCanPlay', 'No models can play this table yet.')),
        g.hiddenInfo && pool.length ? h('p', { class: 'sh-ts-hidden mono' }, t('hiddenInfoTables', (n) => n + ' models can play hidden-information tables today', pool.length)) : null));

      const sides = g.sides || { p1: { name: 'First player', helper: 'Move first.' }, p2: { name: 'Second player', helper: 'Model opens.' } };
      body.appendChild(h('section', { class: 'sh-ts-sec' },
        eyebrow(t('chooseYourSide', 'Choose your side'), h('span', { class: 'sh-ts-opens mono' }, d.side === 'p1' ? t('youMoveFirst', 'You move first') : t('modelMovesFirst', 'Model moves first'))),
        h('div', { class: 'sh-ts-sides', role: 'radiogroup', 'aria-label': t('chooseYourSide', 'Choose your side') }, ['p1', 'p2'].map((k) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': d.side === k ? 'true' : 'false', class: 'sh-ts-side' + (d.side === k ? ' is-on' : ''), onclick: () => set({ side: k })
        }, h('span', { class: 'sh-ts-side-name' }, sides[k].name), h('span', { class: 'sh-ts-side-help' }, sides[k].helper))))));
    }

    const r = readiness(d);
    const offline = S.dev.offline;
    const label = offline ? t('backOnlineToPlay', 'Back online to play') : P.signedIn ? t('startGame', 'Start game') : t('signInToStart', 'Sign in to start');
    const foot = h('div', { class: 'sh-ts-foot' },
      primaryBtn(label, () => startFlow(st.draft, { from: 'table' }), { disabled: !r.ok || offline, cls: 'ap-btn--start', icon: P.signedIn && !offline ? 'play' : null }),
      h('div', { class: 'sh-ts-ready mono' + (r.ok ? ' is-ok' : ' is-bad'), role: 'status' }, r.ok ? h('span', { class: 'sh-ts-dot', 'aria-hidden': 'true' }) : null, r.line));
    return { head, body, foot };
  }

  /* ------------------------------------------------------------------
     [H] Opponent picker (brief 7.12): a stage, not a dropdown.
     Recommended (four, Shuffle deals four others) · filter chips · search ·
     the roster grouped by provider. Seat mode keeps models distinct.
     ------------------------------------------------------------------ */
  /* Frontier labs: the prototype catalogue has no platform flag for this, so the rule is derived from
     catalogue data: a provider counts when it has at least one `recommended` model. Not platform data. */
  function frontierProviders() { return new Set(Data.roster().filter((m) => m.recommended).map((m) => m.provider)); }
  /* table coverage counts Arena tables only (the tables this app shows), never the web's 50-game catalogue */
  const COVERAGE = new Map();
  function tablesCovered(id) {
    if (!COVERAGE.has(id)) {
      let n = 0;
      Data.arenas().forEach((a) => Data.visibleGames(a).forEach((s) => { if (Data.canPlay(id, s)) n += 1; }));
      COVERAGE.set(id, n);
    }
    return COVERAGE.get(id);
  }
  function coverageLine(id) { const n = tablesCovered(id); return t('playsNTables', (x) => 'Plays ' + x + (x === 1 ? ' table' : ' tables'), n); }
  /* four picks mixed across providers; shuffle deals four others when the pool allows */
  function dealRecommended(slug, avoid, shuffle) {
    if (!shuffle) return suggested(slug, null, 4);
    let pool = Data.modelsFor(slug).filter((m) => !avoid.includes(m.id));
    if (pool.length < 4) pool = Data.modelsFor(slug);
    pool = pool.map((m) => [Math.random(), m]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
    const out = [];
    const used = new Set();
    pool.forEach((m) => { if (out.length < 4 && !used.has(m.provider)) { out.push(m); used.add(m.provider); } });
    pool.forEach((m) => { if (out.length < 4 && !out.includes(m)) out.push(m); });
    return out;
  }
  function pickerStatus(m, slug, seated) {
    if (seated && seated[m.id]) return { kind: 'seated', el: h('span', { class: 'ap-pill ap-pill--seated mono' }, seated[m.id]) };
    const stt = Data.status(m.id, slug);
    return { kind: stt, el: statusPill(stt) };
  }
  function rosterRow(m, slug, selected, onPick, seated) {
    const ps = pickerStatus(m, slug, seated);
    const off = ps.kind === 'unavailable' || ps.kind === 'seated';
    return h('button', {
      type: 'button', class: 'sh-mrow ap-picker-row' + (off ? ' is-recede' : '') + (ps.kind === 'seated' ? ' is-seated' : '') + (selected ? ' is-on' : ''),
      'aria-pressed': selected ? 'true' : 'false', disabled: ps.kind === 'seated' ? true : null,
      'aria-label': fullName(m) + ', ' + (m.providerName || m.provider) + ', ' + (ps.kind === 'seated' ? 'already in ' + seated[m.id] : Data.statusLabel(ps.kind)) + ', ' + coverageLine(m.id),
      onclick: () => onPick(m.id)
    },
    providerTile(m, 34),
    h('span', { class: 'sh-mrow-txt' }, h('span', { class: 'sh-mrow-name' }, fullName(m)), h('span', { class: 'sh-mrow-id mono' }, m.id)),
    h('span', { class: 'ap-picker-side' }, ps.el, h('span', { class: 'ap-picker-cov mono' }, coverageLine(m.id))),
    h('span', { class: 'ap-picker-checkcol', 'aria-hidden': 'true' }, selected ? ic('check', 16, 'ap-picker-check') : null));
  }
  function pickCard(m, slug, selected, onPick, seated) {
    const ps = pickerStatus(m, slug, seated);
    const off = ps.kind === 'unavailable' || ps.kind === 'seated';
    const line = ps.kind === 'unavailable' ? t('notAvailable', 'Not available for this game') : ps.kind === 'seated' ? 'Already in ' + seated[m.id] : t('playsThisTable', 'Plays this table');
    return h('button', { type: 'button', class: 'ap-pick' + (off ? ' is-recede' : '') + (selected ? ' is-on' : ''), 'aria-pressed': selected ? 'true' : 'false', disabled: ps.kind === 'seated' ? true : null,
      'aria-label': fullName(m) + ', ' + (m.providerName || m.provider) + ', ' + (ps.kind === 'seated' ? line : Data.statusLabel(ps.kind)), onclick: () => onPick(m.id) },
    h('span', { class: 'ap-pick-top' }, providerTile(m, 36), selected ? ic('check', 16, 'ap-picker-check') : null),
    h('span', { class: 'ap-pick-name' }, fullName(m)),
    h('span', { class: 'ap-pick-prov' }, m.providerName || m.provider),
    ps.kind === 'seated' ? null : ps.el,
    h('span', { class: 'ap-pick-line' }, line));
  }
  /* openRoster(opts): opts { slug, selectedId, title, onPick(id), seated:{ [modelId]: seatName } (seat mode) } */
  function openRoster(opts) {
    const g = Data.game(opts.slug);
    const st = { q: '', filter: 'ready', loading: !S.rosterLoaded, rec: null };
    const seated = opts.seated || null;
    let entry = null;
    let listEl = null;
    let recEl = null;
    const pick = (id) => {
      if (seated && seated[id]) return;
      entry.close({ silent: true });
      safe(() => opts.onPick(id), null, 'picker.pick');
      const top = S.sheets[S.sheets.length - 1];
      if (top && top.render) top.render();
    };
    const FILTERS = [['ready', t('ready', 'Ready')], ['fast', t('fast', 'Fast')], ['frontier', t('frontierLabs', 'Frontier labs')], ['all', t('categoryAll', 'All')]];
    const passes = (m) => {
      const can = Data.canPlay(m.id, opts.slug);
      if (st.filter === 'all') return true;
      if (!can) return false;
      if (st.filter === 'fast') return m.turnSpeed !== 'slower_turns';
      if (st.filter === 'frontier') return frontierProviders().has(m.provider);
      return true;
    };
    const renderRec = () => {
      if (!recEl) return;
      clear(recEl);
      if (!st.rec) st.rec = dealRecommended(opts.slug, [], false);
      const pool = Data.modelsFor(opts.slug);
      recEl.appendChild(eyebrow(t('recommended', 'Recommended'), pool.length > 4 ? h('button', { type: 'button', class: 'ap-fchip ap-fchip--icon ap-picker-shuffle', onclick: () => { st.rec = dealRecommended(opts.slug, st.rec.map((m) => m.id), true); renderRec(); } }, ic('shuffle', 16), t('shuffle', 'Shuffle')) : null));
      if (!st.rec.length) { recEl.appendChild(h('p', { class: 'sh-quiet mono' }, t('noModelsCanPlay', 'No models can play this table yet.'))); return; }
      recEl.appendChild(h('div', { class: 'ap-pick-grid' }, st.rec.map((m) => pickCard(m, opts.slug, m.id === opts.selectedId, pick, seated))));
      if (g && g.hiddenInfo) recEl.appendChild(h('p', { class: 'ap-picker-hidden mono' }, t('hiddenInfoTables', (n) => n + ' models can play hidden-information tables today', pool.length)));
    };
    const renderList = () => {
      if (!listEl) return;
      clear(listEl);
      const q = st.q.trim().toLowerCase();
      const all = Data.roster();
      const rows = q ? all.filter((m) => [m.publicName, m.shortName, m.providerName, m.provider, m.id].join(' ').toLowerCase().includes(q)) : all.filter(passes);
      if (!rows.length) {
        listEl.appendChild(h('p', { class: 'sh-quiet', role: 'status' }, q ? t('noModelsMatch', 'No models match this search.') : t('noModelsCanPlay', 'No models can play this table yet.')));
        return;
      }
      const groups = new Map();
      rows.forEach((m) => { if (!groups.has(m.provider)) groups.set(m.provider, []); groups.get(m.provider).push(m); });
      const selProv = (Data.model(opts.selectedId) || {}).provider;
      Array.from(groups.entries())
        .sort((x, y) => (x[0] === selProv ? -1 : y[0] === selProv ? 1 : String(x[1][0].providerName).localeCompare(String(y[1][0].providerName))))
        .forEach(([prov, list]) => {
          listEl.appendChild(h('div', { class: 'ap-picker-prov', role: 'heading', 'aria-level': '3' },
            providerTile(list[0], 24), h('span', { class: 'ap-picker-prov-name' }, list[0].providerName || prov), h('span', { class: 'ap-picker-prov-count mono' }, String(list.length))));
          list.forEach((m) => listEl.appendChild(rosterRow(m, opts.slug, m.id === opts.selectedId, pick, seated)));
        });
    };
    const tableLine = g ? arenaTableLine(opts.slug) + (g.tableLabel && arenaTableLine(opts.slug).indexOf(g.tableLabel) < 0 ? ' · ' + g.tableLabel : '') : '';
    entry = openSheet({ kind: 'roster', height: '94%', label: opts.title }, (e) => {
      const head = h('div', { class: 'sh-roster-head ap-picker-head' }, sheetHead(opts.title, { back: () => e.close(), sub: tableLine }));
      const body = h('div', { class: 'ap-picker' });
      if (st.loading) {
        body.appendChild(h('p', { class: 'sh-quiet mono', role: 'status' }, t('loadingRoster', 'Loading full model roster...')));
        return { head, body };
      }
      recEl = h('section', { class: 'ap-picker-rec', 'aria-label': t('recommended', 'Recommended') });
      renderRec();
      const input = h('input', { type: 'search', class: 'sh-search-input', placeholder: t('searchModels', 'Search models or providers...'), 'aria-label': t('searchModels', 'Search models or providers...'), value: st.q, autocomplete: 'off', spellcheck: 'false' });
      input.addEventListener('input', () => { st.q = input.value; renderList(); });
      const chips = h('div', { class: 'ap-chips ap-picker-chips', role: 'radiogroup', 'aria-label': 'Filter models' }, FILTERS.map(([k, label]) => h('button', {
        type: 'button', role: 'radio', class: 'ap-fchip' + (st.filter === k ? ' is-on' : ''), 'aria-checked': st.filter === k ? 'true' : 'false',
        onclick: () => { st.filter = k; chips.querySelectorAll('.ap-fchip').forEach((b, i) => { const on = FILTERS[i][0] === k; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); }); renderList(); }
      }, label)));
      listEl = h('div', { class: 'sh-list ap-picker-list', role: 'list' });
      renderList();
      append(body, [recEl, chips, h('label', { class: 'sh-search ap-picker-search' }, ic('search', 18), input), listEl]);
      return { head, body };
    });
    entry.st = st;
    if (st.loading) later(380, () => { st.loading = false; S.rosterLoaded = true; if (!entry.closed) entry.render(); });
    return entry;
  }

  /* ------------------------------------------------------------------
     How to play sheet (all eleven sections, the tip, the variant token)
     ------------------------------------------------------------------ */
  function openHowto(slug) {
    const g = Data.game(slug);
    const hp = Data.help(slug);
    return openSheet({ kind: 'howto', height: '85%', label: t('howToPlay', 'How to play') }, (e) => {
      const head = sheetHead(g ? g.name : t('howToPlay', 'How to play'), { sub: Data.metaLine(slug), close: () => e.close() });
      const secs = Data.helpSections(slug, false);
      const body = h('div', { class: 'sh-hp-body' },
        h('div', { class: 'ap-eyebrow' }, t('howToPlay', 'How to play')),
        secs.length ? secs.map((s) => h('section', { class: 'sh-hp-sec' }, h('h3', { class: 'sh-hp-h' }, s.title),
          Array.isArray(s.items) && s.items.length > 1 ? h('ol', { class: 'sh-hp-list' }, s.items.map((x) => h('li', null, x))) : h('p', { class: 'sh-hp-p' }, s.body)))
          : h('p', { class: 'sh-quiet' }, t('catalogueUnavailable', 'The playable game catalogue is unavailable right now.')),
        hp && hp.tip ? h('div', { class: 'sh-hp-tip' }, hp.tip) : null,
        g ? h('div', { class: 'sh-hp-token mono' }, g.variantToken) : null);
      return { head, body };
    });
  }

  /* ------------------------------------------------------------------
     Sign-in sheet: the web flow, natively. Steps: choose, email-signin,
     create, twofactor, signing, onboarding1..3. Simulated: any provider
     succeeds, any email works, code 123456 passes.
     ------------------------------------------------------------------ */
  function field(label, input, hint) {
    return h('label', { class: 'sh-si-field' }, h('span', { class: 'sh-si-label' }, label), input, hint || null);
  }
  function openSignIn(opts) {
    opts = opts || {};
    let info = null;
    if (opts.oauthError) info = { tone: 'bad', text: safe(() => W.ESD.copy.oauthErrors[opts.oauthError], null, 'oauthErrors') || 'Sign-in did not complete. Try again.' };
    else if (opts.expired) info = { tone: 'bad', text: t('signInExpired', 'Your sign-in expired. Sign in again to start a game.') };
    else if (opts.intent) info = { tone: 'info', text: t('signInToStartAGame', 'Sign in to start a game.') };
    const st = { step: 'choose', info, email: '', pw: '', showPw: false, tf: 'auth', code: '', trust: false, viaOAuth: false, err: null, security: 'idle', isNew: false,
      username: P.username || '', profile: Object.assign({}, P.profile), vis: P.profile.visibility || 'public' };
    /* G-HOOK start: authStep */
    if (opts.step === 'create') { st.step = 'create'; st.security = 'running'; later(1500, () => { st.security = 'done'; const s = findSheet('signin'); if (s && s.st === st && st.step === 'create') s.render(); }); }
    /* G-HOOK end */
    const entry = openSheet({ kind: 'signin', label: t('signInTitle', 'Sign in to eSlams') }, (e) => buildSignIn(e, st, opts));
    entry.st = st;
    return entry;
  }
  function buildSignIn(e, st, opts) {
    const go = (step) => {
      st.step = step; st.err = null;
      if (step === 'create' && st.security === 'idle') { st.security = 'running'; later(1500, () => { st.security = 'done'; if (!e.closed && st.step === 'create') e.render(); }); }
      e.render();
      later(dur(60), () => focusFirst(e.body));
    };
    const finishAuth = () => {
      /* G-HOOK start: authRoute */
      if (opts && opts.onAuth) { P.signedIn = true; if (!P.username) P.username = 'player-1'; save(); e.close({ silent: true }); syncCanvas(); safe(() => opts.onAuth({ isNew: !!st.isNew }), null, 'onboard.onAuth'); return; }
      /* G-HOOK end */
      if (st.isNew || !P.onboarded) go('onboarding1');
      else completeSignIn(e, st, opts);
    };
    const viaProvider = (name, isNew) => {
      st.isNew = !!isNew;
      st.viaOAuth = true;
      go('signing');
      later(900, () => { if (e.closed) return; if (S.dev.twoFactorProviders && !isNew) go('twofactor'); else finishAuth(); });
    };
    const close = () => e.close();
    const infoLine = st.info ? h('p', { class: 'sh-si-info is-' + st.info.tone, role: 'status' }, st.info.text) : null;
    const errLine = st.err ? h('p', { class: 'sh-si-err', role: 'alert' }, st.err) : null;
    const pwInput = () => {
      const inp = h('input', { type: st.showPw ? 'text' : 'password', class: 'sh-si-input', autocomplete: st.step === 'create' ? 'new-password' : 'current-password', value: st.pw, 'aria-label': t('passwordLabel', 'Password') });
      inp.addEventListener('input', () => { st.pw = inp.value; });
      return h('span', { class: 'sh-si-pw' }, inp, h('button', { type: 'button', class: 'sh-si-eye', 'aria-label': st.showPw ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password'), onclick: (ev) => { ev.preventDefault(); st.showPw = !st.showPw; e.render(); } }, ic(st.showPw ? 'eyeoff' : 'eye', 18)));
    };
    const emailInput = () => {
      const inp = h('input', { type: 'email', class: 'sh-si-input', placeholder: t('emailPlaceholder', 'you@lab.ai'), autocomplete: 'email', value: st.email, 'aria-label': t('emailLabel', 'Email') });
      inp.addEventListener('input', () => { st.email = inp.value; });
      return inp;
    };
    const provBtn = (icon, label, onclick, extra) => h('button', { type: 'button', class: 'sh-si-prov', onclick, disabled: extra && extra.disabled ? true : null }, ic(icon, 18), h('span', null, label), extra && extra.badge ? h('span', { class: 'sh-si-badge mono' }, extra.badge) : null);
    const seg = (on) => segmented([{ value: 'signin', label: t('segSignIn', 'Sign in') }, { value: 'create', label: t('segCreateAccount', 'Create account') }], on, (v) => go(v === 'create' ? 'create' : 'email-signin'), { label: 'Sign in or create account' });
    const divider = (txt) => h('div', { class: 'sh-si-div' }, h('span', null, txt));
    const head = (title, back) => sheetHead(title, { back: back || null, close });
    let headEl;
    let body;
    let foot = null;
    switch (st.step) {
      case 'email-signin':
        headEl = head(t('signInTitle', 'Sign in to eSlams'), () => go('choose'));
        body = h('form', { class: 'sh-si-body', onsubmit: (ev) => { ev.preventDefault(); if (!st.email.trim()) { st.err = 'Enter your email to continue.'; e.render(); return; } st.viaOAuth = false; st.isNew = false; go('twofactor'); } },
          infoLine, seg('signin'),
          field(t('emailLabel', 'Email'), emailInput()),
          field(t('passwordLabel', 'Password'), pwInput()),
          h('button', { type: 'button', class: 'ap-link sh-si-forgot', onclick: () => toast('Opens the eslams.com reset flow in the browser.') }, t('forgotPassword', 'Forgot password?')),
          errLine,
          h('button', { type: 'submit', class: 'ap-btn ap-btn--primary' }, t('continueWithEmail', 'Continue with email')),
          h('p', { class: 'sh-si-foot' }, t('newToEslams', 'New to eSlams?') + ' ', h('button', { type: 'button', class: 'ap-link', onclick: () => go('create') }, t('createAnAccount', 'Create an account'))));
        break;
      case 'create': {
        const running = st.security === 'running';
        const short = st.pw.length > 0 && st.pw.length < 12;
        headEl = head(t('createTitle', 'Create your account'), () => go('choose'));
        body = h('form', { class: 'sh-si-body', onsubmit: (ev) => {
          ev.preventDefault();
          if (running) return;
          if (!st.email.trim()) { st.err = 'Enter your email to continue.'; e.render(); return; }
          if (st.pw.length < 12) { st.err = t('passwordRule', 'Minimum 12 characters.'); e.render(); return; }
          st.isNew = true; st.viaOAuth = false; go('signing'); later(900, () => { if (!e.closed) finishAuth(); });
        } },
        h('p', { class: 'sh-si-sub' }, t('createSub', 'Create an account with GitHub, Google, or email.')),
        seg('create'),
        provBtn('github', t('createWithGitHub', 'Create with GitHub'), () => viaProvider('github', true)),
        provBtn('google', t('createWithGoogle', 'Create with Google'), () => viaProvider('google', true)),
        divider(t('orSignUpWithEmail', 'or sign up with email')),
        field(t('emailLabel', 'Email'), emailInput()),
        field(t('passwordLabel', 'Password'), pwInput(), h('span', { class: 'sh-si-hint' + (short ? ' is-bad' : '') }, t('passwordRule', 'Minimum 12 characters.'))),
        running ? h('p', { class: 'sh-si-security mono', role: 'status' }, h('span', { class: 'sh-si-pulse', 'aria-hidden': 'true' }), t('securityCheck', 'Completing security check…')) : null,
        errLine,
        h('button', { type: 'submit', class: 'ap-btn ap-btn--primary', disabled: running ? true : null }, t('createAccountButton', 'Create account')),
        h('p', { class: 'sh-si-legal' }, t('legalLine', 'By creating an account you agree to the eSlams terms. Profiles become public only after onboarding chooses a username.')),
        h('p', { class: 'sh-si-foot' }, t('alreadyHaveAccount', 'Already have an account?') + ' ', h('button', { type: 'button', class: 'ap-link', onclick: () => go('email-signin') }, t('signIn', 'Sign in'))));
        break;
      }
      case 'twofactor': {
        const auth = st.tf === 'auth';
        const inp = h('input', { type: 'text', class: 'sh-si-input sh-si-code mono', inputmode: auth ? 'numeric' : 'text', autocomplete: 'one-time-code', maxlength: auth ? '6' : '32', value: st.code, 'aria-label': auth ? t('sixDigitCode', 'Six-digit code') : t('oneTimeRecoveryCode', 'One-time recovery code'), 'data-autofocus': '1', placeholder: auth ? '000000' : 'xxxx-xxxx-xxxx' });
        inp.addEventListener('input', () => { st.code = inp.value; });
        const tab = (k, label) => h('button', { type: 'button', role: 'tab', 'aria-selected': st.tf === k ? 'true' : 'false', class: 'ap-seg-btn' + (st.tf === k ? ' is-on' : ''), onclick: () => { st.tf = k; st.code = ''; st.err = null; e.render(); } }, label);
        headEl = head(t('twoFactorTitle', 'Two-factor verification'), () => go(st.viaOAuth ? 'choose' : 'email-signin'));
        body = h('form', { class: 'sh-si-body', onsubmit: (ev) => {
          ev.preventDefault();
          const ok = auth ? st.code.replace(/\s/g, '') === '123456' : st.code.trim().length >= 6;
          if (!ok) { st.err = auth ? "That code didn't work. Check your authenticator and try again." : "That recovery code didn't work."; e.render(); return; }
          go('signing');
          later(700, () => { if (!e.closed) finishAuth(); });
        } },
        h('div', { class: 'ap-eyebrow' }, t('oneMoreCheck', 'One more check.')),
        h('p', { class: 'sh-si-sub' }, t('twoFactorSub', 'Open your authenticator and enter the current code.')),
        h('div', { class: 'ap-seg', role: 'tablist', 'aria-label': 'Second factor' }, tab('auth', t('segAuthenticator', 'Authenticator')), tab('recovery', t('segRecoveryCode', 'Recovery code'))),
        field(auth ? t('sixDigitCode', 'Six-digit code') : t('oneTimeRecoveryCode', 'One-time recovery code'), inp, auth ? h('span', { class: 'sh-si-hint mono' }, 'prototype code: 123456') : h('span', { class: 'sh-si-hint' }, t('recoveryFootnote', 'Recovery codes are single-use. A used code is removed atomically from your account.'))),
        st.viaOAuth ? null : h('div', { class: 'sh-si-trust' }, h('span', null, t('trustThisDevice', 'Trust this device')), toggle(st.trust, (v) => { st.trust = v; e.render(); }, t('trustThisDevice', 'Trust this device'))),
        errLine,
        h('button', { type: 'submit', class: 'ap-btn ap-btn--primary' }, t('verifyAndContinue', 'Verify and continue')),
        h('p', { class: 'sh-si-legal' }, t('twoFactorBrandNote', 'Your password or identity provider was accepted. Verify the second factor to finish signing in.')));
        break;
      }
      case 'signing':
        headEl = head(t('signInTitle', 'Sign in to eSlams'));
        body = h('div', { class: 'sh-si-body sh-si-signing', role: 'status' }, h('span', { class: 'sh-si-pulse', 'aria-hidden': 'true' }), h('p', { class: 'sh-si-signing-txt' }, t('signingYouIn', 'Signing you in…')));
        break;
      case 'onboarding1': {
        const inp = h('input', { type: 'text', class: 'sh-si-input', placeholder: t('usernamePlaceholder', 'player-1'), autocomplete: 'username', value: st.username, 'aria-label': t('chooseUsername', 'Choose your username'), 'data-autofocus': '1', spellcheck: 'false' });
        const prev = h('div', { class: 'sh-si-preview mono' }, t('usernamePreview', (n) => 'eslams.com/' + (n || 'player-1'), st.username));
        inp.addEventListener('input', () => {
          const clean = inp.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 24);
          if (clean !== inp.value) inp.value = clean;
          st.username = clean;
          prev.textContent = t('usernamePreview', (n) => 'eslams.com/' + (n || 'player-1'), clean);
        });
        headEl = head(t('chooseUsername', 'Choose your username'));
        body = h('form', { class: 'sh-si-body', onsubmit: (ev) => { ev.preventDefault(); if (!st.username || st.username.length < 3) { st.err = 'Pick a username of at least 3 characters.'; e.render(); return; } go('onboarding2'); } },
          h('div', { class: 'sh-si-step mono' }, t('onboardingStep', (n) => 'Step ' + n + ' of 3', 1)), field('Username', inp), prev, errLine,
          h('button', { type: 'submit', class: 'ap-btn ap-btn--primary' }, t('continue', 'Continue')));
        break;
      }
      case 'onboarding2': {
        const f = (key, label, multi) => {
          const inp = h(multi ? 'textarea' : 'input', { class: 'sh-si-input' + (multi ? ' sh-si-textarea' : ''), 'aria-label': label, rows: multi ? '3' : null });
          inp.value = st.profile[key] || '';
          inp.addEventListener('input', () => { st.profile[key] = inp.value; });
          return field(label, inp);
        };
        headEl = head(t('addProfileDetails', 'Add profile details'), () => go('onboarding1'));
        body = h('form', { class: 'sh-si-body', onsubmit: (ev) => { ev.preventDefault(); go('onboarding3'); } },
          h('div', { class: 'sh-si-step mono' }, t('onboardingStep', (n) => 'Step ' + n + ' of 3', 2)),
          f('displayName', t('displayName', 'Display name')), f('bio', t('bio', 'Bio'), true), f('location', t('location', 'Location')), f('website', t('website', 'Website')),
          h('div', { class: 'sh-si-row' }, h('button', { type: 'button', class: 'ap-btn ap-btn--secondary', onclick: () => go('onboarding3') }, t('skip', 'Skip')), h('button', { type: 'submit', class: 'ap-btn ap-btn--primary' }, t('continue', 'Continue'))));
        break;
      }
      case 'onboarding3':
        headEl = head(t('doesThisLookRight', 'Does this look right?'), () => go('onboarding2'));
        body = h('div', { class: 'sh-si-body' },
          h('div', { class: 'sh-si-step mono' }, t('onboardingStep', (n) => 'Step ' + n + ' of 3', 3)),
          h('div', { class: 'sh-si-summary' }, h('span', { class: 'ap-avatar ap-avatar--lg mono', 'aria-hidden': 'true' }, initials(st.username).slice(0, 2)),
            h('span', { class: 'sh-si-summary-txt' }, h('span', { class: 'sh-si-summary-name' }, st.profile.displayName || st.username), h('span', { class: 'mono sh-si-summary-url' }, 'eslams.com/' + st.username))),
          eyebrow(t('whoCanSeeProfile', 'Who can see your profile?')),
          h('div', { class: 'sh-ts-sides', role: 'radiogroup', 'aria-label': t('whoCanSeeProfile', 'Who can see your profile?') },
            [['public', t('profilePublic', 'Public'), t('profilePublicDesc', 'Anyone can view it')], ['private', t('profilePrivate', 'Private'), t('profilePrivateDesc', 'Approved followers only')]].map((o) =>
              h('button', { type: 'button', role: 'radio', 'aria-checked': st.vis === o[0] ? 'true' : 'false', class: 'sh-ts-side' + (st.vis === o[0] ? ' is-on' : ''), onclick: () => { st.vis = o[0]; e.render(); } },
                h('span', { class: 'sh-ts-side-name' }, o[1]), h('span', { class: 'sh-ts-side-help' }, o[2])))),
          h('button', { type: 'button', class: 'ap-btn ap-btn--primary', onclick: () => completeSignIn(e, st, opts) }, t('createAccountButton', 'Create account')));
        break;
      default:
        headEl = head(t('signInTitle', 'Sign in to eSlams'));
        body = h('div', { class: 'sh-si-body' },
          h('p', { class: 'sh-si-sub' }, t('signInSub', 'Sign in with GitHub, Google, or email.')),
          infoLine,
          provBtn('github', t('signInWithGitHub', 'Sign in with GitHub'), () => viaProvider('github', false)),
          provBtn('google', t('signInWithGoogle', 'Sign in with Google'), () => viaProvider('google', false)),
          /* Sign in with Apple joins this list only when the platform reports it configured (brief 7.5); it does not today */
          divider(t('orUseEmail', 'or use email')),
          h('button', { type: 'button', class: 'ap-btn ap-btn--secondary', onclick: () => go('email-signin') }, ic('mail', 18), t('continueWithEmail', 'Continue with email')),
          h('p', { class: 'sh-si-foot' }, t('newToEslams', 'New to eSlams?') + ' ', h('button', { type: 'button', class: 'ap-link', onclick: () => go('create') }, t('createAnAccount', 'Create an account'))));
    }
    return { head: headEl, body, foot };
  }
  function completeSignIn(entry, st, opts) {
    P.signedIn = true;
    if (st.username) P.username = st.username;
    if (!P.username) P.username = 'player-1';
    P.onboarded = true;
    P.profile = Object.assign({}, P.profile, st.profile, { visibility: st.vis || 'public' });
    save();
    entry.close({ silent: true });
    if (S.homeView) S.homeView.render();
    const ts = findSheet('table');
    if (ts) ts.render();
    syncCanvas();
    if (opts && opts.intent) later(dur(420), () => startFlow(opts.intent.setup, { from: opts.intent.from }));
  }
  function signOut() {
    /* G-HOOK start: signOut */
    P.signedIn = false;            /* clears the session; themePref, profile and matches stay on the device */
    save();
    goHome();
    syncCanvas();
    if (W.ESOnboard) safe(() => W.ESOnboard.welcome(), null, 'onboard.welcome');
    /* G-HOOK end */
  }

  /* ------------------------------------------------------------------
     Start: account gate, then the curtain-riser
     ------------------------------------------------------------------ */
  function startFlow(setup, opts) {
    opts = opts || {};
    const s = normalizeSetup(clone(setup));
    if (S.dev.offline) { toast(t('backOnlineToPlay', 'Back online to play')); return; }
    P.setup = clone(s);
    rememberOpponent(s.game, s.modelId);
    save();
    if (!P.signedIn || S.dev.signInExpired) {
      const expired = S.dev.signInExpired && P.signedIn;
      S.dev.signInExpired = false;
      if (expired) { P.signedIn = false; save(); syncCanvas(); }
      const intent = { setup: s, from: opts.from || 'home' };
      /* the full-screen auth page (onboard.js) when present; the sign-in sheet stays as the fallback */
      if (W.ESOnboard && typeof W.ESOnboard.auth === 'function') { closeMenu(); closeAllSheets(true); W.ESOnboard.auth({ expired, onAuthed: () => startFlow(intent.setup, { from: intent.from }) }); return; }
      openSignIn({ intent, expired });
      return;
    }
    closeMenu();
    closeAllSheets();
    const fromStage = ['stage', 'result', 'replay', 'riser'].includes(screenName());
    if (fromStage) popTo('home');
    openRiser(s, { anim: fromStage ? null : 'fade' });
  }

  /* ------------------------------------------------------------------
     Curtain-riser: preview board, matchup, one honest status line
     ------------------------------------------------------------------ */
  function matchupBlock(setup, cls) {
    const g = Data.game(setup.game);
    if (g && g.seats > 2) {
      const names = seatNames(g);
      return h('div', { class: 'st-rz-seats ' + (cls || '') }, setup.seatModels.map((id, i) => {
        const you = i === setup.yourSeat - 1;
        const m = you ? null : modelOrStub(id);
        return h('div', { class: 'st-rz-seat' + (you ? ' is-you' : '') }, you ? youTile(26) : providerTile(m, 26),
          h('span', { class: 'st-rz-seat-name' }, you ? (P.username || 'You') : shortName(m)), h('span', { class: 'st-rz-seat-label mono' }, names[i]));
      }));
    }
    const m = modelOrStub(setup.modelId);
    return h('div', { class: 'st-rz-matchup ' + (cls || '') },
      h('div', { class: 'st-rz-side' }, youTile(34), h('span', { class: 'st-rz-side-txt' }, h('span', { class: 'st-rz-you mono' }, 'YOU'), h('span', { class: 'st-rz-name' }, P.username || 'player-1'))),
      h('span', { class: 'st-rz-vs mono' }, 'vs'),
      h('div', { class: 'st-rz-side st-rz-side--model' }, h('span', { class: 'st-rz-side-txt' }, h('span', { class: 'st-rz-you mono' }, (m.providerName || m.provider || '').toUpperCase()), h('span', { class: 'st-rz-name' }, fullName(m))), providerTile(m, 34)));
  }
  function openRiser(setup, opts) {
    opts = opts || {};
    const g = Data.game(setup.game);
    if (!g) { toast(t('matchNoLongerAvailable', 'This Arena match is no longer available.')); return; }
    const a = Data.arenaOf(setup.game);
    const R = { timers: [], cancelled: false, clock: null, t0: now(), waiting: false, escalated: false };
    const boardHost = h('div', { class: 'st-rz-board', role: 'img', 'aria-label': g.name + ' board' });
    const status = h('p', { class: 'st-rz-status', role: 'status', 'aria-live': 'polite' });
    const elapsed = h('div', { class: 'st-rz-elapsed mono', 'aria-hidden': 'true' });
    const actions = h('div', { class: 'st-rz-actions' });
    const el = h('section', { class: 'st-riser', 'aria-label': 'Starting ' + g.name },
      h('div', { class: 'st-rz-top' }, h('button', { type: 'button', class: 'ap-iconbtn ap-iconbtn--ghost', 'aria-label': t('exit', 'Exit'), onclick: () => exit() }, ic('close', 20))),
      h('div', { class: 'st-rz-center' }, boardHost, matchupBlock(setup, 'is-writing'),
        h('div', { class: 'st-rz-meta mono' }, (a ? a.name : g.name) + ' · ' + g.tableLabel), status, elapsed),
      actions);
    const sv = Eng.startView(setup.game, setup.side);
    const ctl = sv ? mountBoard(boardHost, { family: familyOf(setup.game, sv), view: sv, size: 'preview', interactive: false, legal: [], reveal: false, reducedMotion: isReduced(),
      seats: boardSeats(setup, setup.side), youSeat: g.seats > 2 ? 'seat' + (setup.yourSeat || 1) : setup.side || 'p1' }) : null;
    if (!sv) boardFallback(boardHost, { size: 'preview' });
    const entry = pushScreen('riser', el, {
      anim: opts.anim || null,
      cleanup: () => { R.cancelled = true; R.timers.forEach(clearTimeout); clearInterval(R.clock); if (ctl) ctl.destroy(); }
    });
    const step = (ms, fn) => { R.timers.push(later(ms, () => { if (!R.cancelled) fn(); })); };
    const setStatus = (txt) => {
      status.classList.remove('is-in');
      status.textContent = txt;
      requestAnimationFrame(() => requestAnimationFrame(() => status.classList.add('is-in')));
    };
    const exit = () => { if (topScreen() === entry) popScreen('fade'); else removeScreen(entry, null); };
    const clearActions = () => clear(actions);
    const fail = (kind) => {
      clearInterval(R.clock);
      elapsed.textContent = '';
      clearActions();
      if (kind === 'engine') {
        setStatus(t('engineRoomBusy', 'The engine room is busy. Connect Four is ready right now.'));
        append(actions, [
          primaryBtn(t('switchToConnectFour', 'Play Connect Four'), () => {
            const ns = normalizeSetup({ game: 'connect-four', modelId: Data.canPlay(setup.modelId, 'connect-four') ? setup.modelId : null, side: 'p1' });
            removeScreen(entry, null);
            P.setup = clone(ns); save();
            openRiser(ns, {});
          }),
          secondaryBtn(t('tryAgain', 'Try again'), () => lifecycle()),
          h('button', { type: 'button', class: 'ap-link', onclick: exit }, t('exit', 'Exit'))]);
      } else if (kind === 'roster') {
        setStatus(t('opponentsUnavailable', 'Opponents are unavailable right now. Try again in a moment.'));
        append(actions, [secondaryBtn(t('tryAgain', 'Try again'), () => { S.dev.rosterDown = false; syncCanvas(); lifecycle(); }), h('button', { type: 'button', class: 'ap-link', onclick: exit }, t('exit', 'Exit'))]);
      } else {
        setStatus(t('matchNoLongerAvailable', 'This Arena match is no longer available.'));
        append(actions, [secondaryBtn(t('exit', 'Exit'), exit)]);
      }
    };
    const escalate = () => {
      clearActions();
      actions.appendChild(h('div', { class: 'st-escalate', role: 'status' },
        h('div', { class: 'st-escalate-title' }, t('takingLonger', 'Taking longer than usual…')),
        h('div', { class: 'st-escalate-btns' },
          secondaryBtn(t('keepWaiting', 'Keep waiting'), () => clearActions(), { cls: 'ap-btn--small' }),
          secondaryBtn(t('switchOpponent', 'Switch opponent'), () => { removeScreen(entry, null); openTableSheet(setup, { openRoster: true }); }, { cls: 'ap-btn--small' }),
          h('button', { type: 'button', class: 'ap-link', onclick: exit }, t('exit', 'Exit')))));
    };
    const seated = () => {
      R.waiting = false;
      clearInterval(R.clock);
      elapsed.textContent = '';
      clearActions();
      const sess = createSession(setup);
      if (!sess) { fail('gone'); return; }
      S.live = sess;
      save();
      setStatus(g.seats > 2 ? t('modelSeatsReady', (n) => n + ' model seats · Ready', sessionModels(sess).length)
        : t('takenSeat', (n) => n + ' has taken its seat.', shortName(modelOrStub(setup.modelId))));
      step(dur(850), () => {
        enterStage(sess, { anim: 'rise' });
        later(dur(420), () => removeScreen(entry, null));
        advance(sess);
      });
    };
    const lifecycle = () => {
      R.timers.forEach(clearTimeout);
      R.timers = [];
      R.t0 = now();
      R.escalated = false;
      clearActions();
      clearInterval(R.clock);
      const runner = !WORKER_GAMES.includes(setup.game);
      setStatus(t('settingTheTable', 'Setting the table…'));
      R.clock = setInterval(() => {
        const s = (now() - R.t0) / 1000;
        elapsed.textContent = s >= 3 ? fmtClock(s) : '';
        if (R.waiting && s >= 10 && !R.escalated) { R.escalated = true; escalate(); }
      }, 250);
      step(650, () => {
        if (S.dev.rosterDown) { fail('roster'); return; }
        if (!runner) { seated(); return; }
        setStatus(t('wakingTheEngine', 'Waking the engine…'));
        if (S.dev.engine === 'unavailable') { step(1500, () => fail('engine')); return; }
        if (S.dev.engine === 'cold') { R.waiting = true; step(14000, seated); return; }
        step(900, seated);
      });
    };
    const conflict = () => {
      const other = S.live && S.live.status === 'active' ? S.live : null;
      const web = !other ? S.webSession : null;
      const og = Data.game(other ? other.slug : web.slug);
      const om = modelOrStub(other ? sessionModels(other)[0] : web.modelId);
      const state = other ? (whoseTurn(other) === 'human' ? 'your move' : 'the model is thinking') : web.state;
      const gName = og ? og.name : 'Arena';
      setStatus('');
      const busy = h('p', { class: 'st-rz-conflict-note mono' }, t('yourGameWillEnd', (x) => 'Your ' + x + ' match will end.', gName));
      const card = h('div', { class: 'st-rz-conflict', role: 'alertdialog', 'aria-label': 'Match in progress' },
        h('p', { class: 'st-rz-conflict-txt' }, t('matchInProgress', (x, y, z) => 'You have a match in progress: ' + x + ' vs ' + y + ', ' + z + '.', gName, shortName(om), state)),
        primaryBtn(t('resumeThatMatch', 'Resume that match'), () => {
          if (other) { removeScreen(entry, null); enterStage(other, { anim: 'fade' }); }
          else { goHome(); toast(t('playingOnTheWeb', 'Playing on the web. Finish it there or end it here.')); }
        }),
        secondaryBtn(t('startThisOneInstead', 'Start this one instead'), (ev) => {
          const b = ev.currentTarget;
          b.disabled = true;
          busy.classList.add('is-busy');
          step(800, () => {
            if (other) finish(other, { reason: 'abandoned', source: 'user_ended', winner: null });
            S.webSession = null;
            S.dev.conflict = false;
            syncCanvas();
            clearActions();
            lifecycle();
          });
        }),
        busy);
      actions.appendChild(card);
    };
    if ((S.live && S.live.status === 'active') || S.webSession) conflict();
    else lifecycle();
    return entry;
  }

  /* ------------------------------------------------------------------
     Stage: play. Ribbon, seat bar, board, reasoning line, thumb-zone
     controls, overflow. The same element becomes the result curtain.
     ------------------------------------------------------------------ */
  function enterStage(sess, opts) {
    opts = opts || {};
    closeAllSheets(true);
    closeMenu();
    const prev = S.screens.find((s) => s.name === 'stage' || s.name === 'result');
    if (prev) removeScreen(prev, null);
    const view = buildStageView(sess);
    S.stageView = view;
    view.entry = pushScreen(sess.status === 'completed' ? 'result' : 'stage', view.el, {
      anim: opts.anim || null,
      cleanup: () => { view.destroy(); if (S.stageView === view) S.stageView = null; }
    });
    if (sess.status === 'completed') view.showResult(true);
    else view.sync();
    return view;
  }
  function youName() { return P.username || 'player-1'; }
  /* ESB seats prop for a setup: [{ id, label, name, providerSlug, isYou }] */
  function boardSeats(setup, humanSide) {
    const g = Data.game(setup.game);
    if (!g) return [];
    if (g.seats > 2) {
      const names = seatNames(g);
      return (setup.seatModels || []).map((id, i) => {
        const you = i === setup.yourSeat - 1;
        const m = you ? null : modelOrStub(id);
        return { id: 'seat' + (i + 1), label: names[i], name: you ? youName() : shortName(m), providerSlug: m ? m.provider : null, isYou: you };
      });
    }
    const sides = g.sides || { p1: { name: 'First player' }, p2: { name: 'Second player' } };
    const m = modelOrStub(setup.modelId);
    return ['p1', 'p2'].map((k) => {
      const you = k === (humanSide || setup.side || 'p1');
      return { id: k, label: sides[k].name, name: you ? youName() : shortName(m), providerSlug: you ? null : m.provider, isYou: you };
    });
  }
  function buildStageView(sess) {
    const g = Data.game(sess.slug) || { name: 'Arena', seats: 2, family: 'custom' };
    const a = Data.arenaOf(sess.slug);
    const multi = g.seats > 2;
    const view = { sess, typing: null, noteTimer: null };
    const moveEl = h('span', { class: 'st-move mono', 'aria-live': 'off' });
    const xBtn = h('button', { type: 'button', class: 'ap-iconbtn ap-iconbtn--ghost st-x', 'aria-label': 'Leave match' }, ic('close', 20));
    const ribbon = h('div', { class: 'st-ribbon' }, xBtn,
      h('div', { class: 'st-title' }, h('span', { class: 'st-title-txt' }, a && Data.visibleGames(a).length > 1 ? g.name : (a ? a.name : g.name)),
        sess.mode === 'scripted' ? h('span', { class: 'ap-demo-pill mono', title: t('demoNote', 'This table plays a recorded demo in the prototype.') }, t('demoPill', 'demo')) : null),
      moveEl);
    const reconnect = h('div', { class: 'st-reconnect mono', role: 'status', hidden: true }, h('span', { class: 'st-reconnect-dot', 'aria-hidden': 'true' }), t('reconnecting', 'reconnecting…'));
    const seatsEl = h('div', { class: 'st-seats' + (multi ? ' st-seats--ring' : '') });
    const host = h('div', { class: 'st-board-host' });
    const overlay = h('div', { class: 'st-premove', hidden: true, 'aria-hidden': 'true' });
    const boardWrap = h('div', { class: 'st-board' }, host, overlay);
    /* hidden-information tables never show reasoning, so the line takes no room there */
    const reason = h('p', { class: 'st-reason', 'aria-hidden': 'true', hidden: !!g.hiddenInfo });
    const notes = h('div', { class: 'st-notes', role: 'status' });
    const ctrl = h('div', { class: 'st-ctrl' });
    const moreBtn = h('button', { type: 'button', class: 'ap-iconbtn st-more', 'aria-label': 'More options', 'aria-haspopup': 'menu' }, ic('more', 20));
    const actions = h('div', { class: 'st-actions' }, notes, ctrl, h('div', { class: 'st-actions-row' }, h('span', { class: 'st-hint' }), moreBtn));
    const resultWrap = h('div', { class: 'rs-wrap' });
    const el = h('section', { class: 'st-stage', 'aria-label': g.name + ' match' }, ribbon, reconnect, seatsEl, boardWrap, reason, actions, resultWrap);
    view.el = el;
    view.resultWrap = resultWrap;

    const youSeatId = () => (multi ? 'seat' + (sess.setup.yourSeat || 1) : sess.humanSide);
    const seatsForBoard = () => boardSeats(sess.setup, sess.humanSide);
    const boardProps = () => {
      const v = sessView(sess) || sess.frames[sess.frames.length - 1] || null;
      const turn = whoseTurn(sess);
      let legal = [];
      let interactive = false;
      let onAction = () => {};
      if (sess.status === 'active' && turn === 'human') {
        if (sess.mode === 'engine') { legal = legalFor(sess); interactive = true; onAction = (act) => humanAction(sess, act); }
        else {
          const row = sess.rec.ledger[sess.step];
          if (row && row.cell) {
            legal = [{ token: 'demo', label: row.action, shortLabel: row.action, kind: 'cell', cell: row.cell }];
            interactive = true;
            onAction = () => humanDemoStep(sess);
          }
        }
      }
      return { family: familyOf(sess.slug, v), view: v, size: 'stage', interactive, legal, onAction, lastMove: v && v.lastMove ? v.lastMove : null,
        reveal: sess.status === 'completed' || !!(v && v.revealed), youSeat: youSeatId(), seats: seatsForBoard(), reducedMotion: isReduced() };
    };
    view.ctl = mountBoard(host, boardProps());

    const clockText = () => {
      const mt = sess.modelTurn;
      return mt ? t('thinkingClock', (s) => 'thinking ' + fmtClock(s), (now() - mt.startedAt) / 1000) : '';
    };
    const lastTurnText = () => (sess.lastTurnMs != null ? t('lastTurn', (s) => 'last turn ' + Number(s).toFixed(1) + ' s', sess.lastTurnMs / 1000) : '');
    view.renderSeats = () => {
      clear(seatsEl);
      const turn = whoseTurn(sess);
      const mt = sess.modelTurn;
      view.clockEl = null;
      if (!multi) {
        const m = modelOrStub(sess.setup.modelId);
        const youOn = sess.status === 'active' && turn === 'human';
        const modelOn = sess.status === 'active' && turn === 'model';
        const clock = h('span', { class: 'st-seat-verb mono' }, modelOn ? clockText() : '');
        if (modelOn) view.clockEl = clock;
        append(seatsEl, [
          h('div', { class: 'st-seat st-seat--you' + (youOn ? ' is-active' : '') }, youTile(32),
            h('span', { class: 'st-seat-txt' }, h('span', { class: 'st-seat-name' }, youName()), h('span', { class: 'st-seat-verb is-you' }, youOn ? t('yourMove', 'Your move') : ''), h('span', { class: 'st-seat-meta mono', 'aria-hidden': 'true' }))),   /* same three lines as the model side, so the names align */
          h('div', { class: 'st-seat st-seat--model' + (modelOn ? ' is-active' : '') },
            h('span', { class: 'st-seat-txt' }, h('span', { class: 'st-seat-name' }, fullName(m)), clock, h('span', { class: 'st-seat-meta mono' }, lastTurnText())),
            providerTile(m, 32))]);
        return;
      }
      const names = seatNames(g);
      (sess.setup.seatModels || []).forEach((id, i) => {
        const you = i === sess.setup.yourSeat - 1;
        const m = you ? null : modelOrStub(id);
        const on = sess.status === 'active' && (you ? turn === 'human' : turn === 'model' && (!mt || !mt.seat || mt.seat === 'seat' + (i + 1)));
        const verb = h('span', { class: 'st-seat-verb mono' + (you ? ' is-you' : '') }, on ? (you ? t('yourMove', 'Your move') : clockText()) : names[i]);
        if (on && !you) view.clockEl = verb;
        seatsEl.appendChild(h('div', { class: 'st-seat st-seat--mini' + (on ? ' is-active' : '') + (you ? ' st-seat--you' : '') }, you ? youTile(26) : providerTile(m, 26),
          h('span', { class: 'st-seat-txt' }, h('span', { class: 'st-seat-name' }, you ? youName() : shortName(m)), verb)));
      });
    };
    view.renderControls = () => {
      clear(ctrl);
      if (sess.status !== 'active') return;
      const turn = whoseTurn(sess);
      const mt = sess.modelTurn;
      if (turn === 'model' && mt && mt.status === 'claim_eligible') {
        append(ctrl, [h('button', { type: 'button', class: 'st-claim', onclick: () => claimWin(sess) }, t('claimTheWinLine', 'Claim the win. The model never showed.')),
          h('p', { class: 'st-quiet' }, t('keepWaitingNote', 'You can keep waiting or leave the app. This match stays active.'))]);
      } else if (turn === 'model' && mt && mt.status === 'keep_waiting_offer' && !mt.keptWaiting) {
        ctrl.appendChild(h('div', { class: 'st-escalate', role: 'status' },
          h('div', { class: 'st-escalate-title' }, t('takingLonger', 'Taking longer than usual…')),
          h('p', { class: 'st-escalate-body' }, t('keepWaitingNote', 'You can keep waiting or leave the app. This match stays active.')),
          h('div', { class: 'st-escalate-btns' }, secondaryBtn(t('keepWaiting', 'Keep waiting'), () => keepWaiting(sess), { cls: 'ap-btn--small' }))));
      } else if (turn === 'human' && sess.mode === 'scripted') {
        const row = sess.rec.ledger[sess.step];
        if (row) ctrl.appendChild(h('button', { type: 'button', class: 'st-demo-step', 'aria-label': 'Play the recorded move: ' + row.action, onclick: () => humanDemoStep(sess) },
          h('span', { class: 'ap-demo-pill mono' }, t('demoPill', 'demo')), h('span', { class: 'st-demo-label' }, row.action), ic('play', 16)));
      }
    };
    /* premove ghost: Tic-Tac-Toe and Connect Four only, during the model's turn.
       Targets and the ghost are laid over ESB's own cell geometry (its wells,
       holes and cells), measured from the rendered board, so they line up. */
    view.renderPremove = () => {
      const can = sess.status === 'active' && sess.mode === 'engine' && PREMOVE_GAMES.includes(sess.slug) && whoseTurn(sess) === 'model';
      overlay.hidden = !can;
      clear(overlay);
      if (!can) return;
      const v = sessView(sess);
      const c4 = sess.slug === 'connect-four';
      const rows = (v && v.rows) || (c4 ? 6 : 3);
      const cells = (v && v.cells) || [];
      const base = boardWrap.getBoundingClientRect();
      const box = (n) => { const r = n.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; };
      const place = (node, b) => Object.assign(node.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
      Object.assign(overlay.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
      const pm = sess.premove;
      if (c4) {
        const wells = Array.from(host.querySelectorAll('.bd-c4-well')).map(box);
        const holes = Array.from(host.querySelectorAll('.bd-c4-hole')).map(box);      /* column-major: c * rows + r */
        wells.forEach((wb, c) => {
          let land = -1;
          for (let r = rows - 1; r >= 0; r--) if (!(cells[r] && cells[r][c])) { land = r; break; }
          const on = pm && pm.col === c;
          const b = h('button', { type: 'button', class: 'st-pm-col', tabindex: '-1', 'aria-label': 'Queue column ' + (c + 1), onclick: () => { sess.premove = on ? null : { col: c }; view.renderPremove(); } });
          /* the tap target spans the column's whole pitch (well plus half of each gap), so it clears 44px */
          const pitch = wells.length > 1 ? (wells[wells.length - 1].x - wells[0].x) / (wells.length - 1) : wb.w;
          place(b, { x: wb.x - Math.max(0, pitch - wb.w) / 2, y: wb.y, w: Math.max(wb.w, pitch), h: wb.h });
          overlay.appendChild(b);
          const hb = land >= 0 ? holes[c * rows + land] : null;
          if (on && hb) { const g = h('span', { class: 'st-pm-ghost' }); place(g, hb); overlay.appendChild(g); }
        });
      } else {
        const rects = Array.from(host.querySelectorAll('.bd-g3-cells rect.bd-cell')).map(box);
        const ys = Array.from(new Set(rects.map((b) => Math.round(b.y)))).sort((a, b) => a - b);
        const xs = Array.from(new Set(rects.map((b) => Math.round(b.x)))).sort((a, b) => a - b);
        rects.forEach((b) => {
          const r = ys.indexOf(Math.round(b.y));
          const c = xs.indexOf(Math.round(b.x));
          const empty = !(cells[r] && cells[r][c]);
          const on = pm && pm.r === r && pm.c === c;
          const btn = h('button', { type: 'button', class: 'st-pm-cell', tabindex: '-1', disabled: empty ? null : true, 'aria-label': 'Queue a move', onclick: () => { sess.premove = on ? null : { r, c }; view.renderPremove(); } },
            on ? h('span', { class: 'st-pm-ghost st-pm-ghost--cell' }) : null);
          place(btn, b);
          overlay.appendChild(btn);
        });
      }
    };
    /* Order per the brief: the move lands, the reasoning appears, the clock resets.
       shownSeq is the reasoning already on screen; pendingSeq one waiting for its
       move to land, so a sync in between never flashes it early and retypes it. */
    view.shownSeq = -1;                 /* nothing placed yet: a resumed match shows its latest line whole */
    view.pendingSeq = null;
    view.typeReason = () => {
      clearInterval(view.typing);
      view.typing = null;
      view.pendingSeq = null;
      view.shownSeq = sess.reasoningSeq;
      reason.classList.toggle('is-stale', whoseTurn(sess) !== 'human');   /* you already answered it: it lands stale */
      const txt = g.hiddenInfo ? '' : sess.reasoning || '';
      if (!txt || isReduced()) { reason.textContent = txt; return; }
      let i = 0;
      reason.textContent = '';
      view.typing = setInterval(() => {
        i = Math.min(txt.length, i + 3);
        reason.textContent = txt.slice(0, i);
        if (i >= txt.length) { clearInterval(view.typing); view.typing = null; }
      }, 16);
    };
    view.note = (text, ms) => {
      clearTimeout(view.noteTimer);
      notes.textContent = text || '';
      if (text && ms) view.noteTimer = later(ms, () => { notes.textContent = ''; });
    };
    /* A tall board (a four-seat card table, shogi with hands) must not push the
       controls off the phone or under the reasoning line: scale the board host
       down until the stage fits. The scale only ever shrinks within a match, so
       the board does not breathe from frame to frame. */
    view.zoom = 1;
    view.fit = () => {
      if (view.resultShown) return;
      host.style.zoom = '';
      const over = el.scrollHeight - el.clientHeight;
      const bh = host.getBoundingClientRect().height;
      if (over > 0 && bh > 0) view.zoom = Math.min(view.zoom, Math.max(0.7, Math.floor(((bh - over - 2) / bh) * 1000) / 1000));
      if (view.zoom < 1) host.style.zoom = String(view.zoom);
    };
    view.sync = () => {
      moveEl.textContent = t('moveN', (n) => 'move ' + n, sess.status === 'active' ? sess.plies + 1 : sess.plies);
      view.ctl.update(boardProps());
      view.renderSeats();
      view.renderControls();
      view.fit();
      later(0, view.renderPremove);
      /* re-entering a match (resume): place the latest reasoning whole */
      if (!view.typing && view.pendingSeq == null && view.shownSeq !== sess.reasoningSeq && sess.reasoning && !g.hiddenInfo) {
        reason.textContent = sess.reasoning;
        view.shownSeq = sess.reasoningSeq;
      }
    };
    view.onEvent = (type) => {
      if (type === 'clock') { if (view.clockEl) view.clockEl.textContent = clockText(); return; }
      if (type === 'modelMove') {
        view.ctl.update(boardProps());
        view.fit();
        moveEl.textContent = t('moveN', (n) => 'move ' + n, sess.plies + 1);
        if (view.shownSeq !== sess.reasoningSeq) {
          view.pendingSeq = sess.reasoningSeq;
          later(dur(sess.slug === 'connect-four' ? 340 : 240), () => { if (view.pendingSeq === sess.reasoningSeq) view.typeReason(); });
        }
        return;
      }
      if (type === 'humanMove') { reason.classList.add('is-stale'); view.sync(); return; }
      if (type === 'illegal') { view.note('That move is not available. Choose another.', 3000); view.sync(); return; }
      if (type === 'completed') { view.sync(); later(dur(650), () => { if (S.stageView === view) view.showResult(false); }); return; }
      if (type === 'publication') { if (view.resultShown) view.renderResult(false); return; }
      view.sync();
    };
    view.reconnect = () => {
      reconnect.hidden = false;
      later(1800, () => { reconnect.hidden = true; view.sync(); });
    };
    view.destroy = () => {
      clearInterval(view.typing);
      clearTimeout(view.noteTimer);
      safe(() => view.ctl.destroy(), null, 'stage.destroy');
    };
    xBtn.addEventListener('click', () => { if (sess.status === 'active') openLeaveSheet(sess); else goHome(); });
    moreBtn.addEventListener('click', () => openMenu([
      { label: t('howToPlay', 'How to play'), icon: 'help', onSelect: () => openHowto(sess.slug) },
      { label: t('sound', 'Sound'), icon: P.settings.sound ? 'sound' : 'soundoff', meta: P.settings.sound ? t('on', 'On') : t('off', 'Off'), onSelect: () => { P.settings.sound = !P.settings.sound; save(); unlockAudio(); } },
      { label: t('resign', 'Resign'), icon: 'alert', tone: 'loss', onSelect: () => openLeaveSheet(sess) }
    ], moreBtn, { up: true, label: 'Match options' }));

    view.showResult = (instant) => {
      view.resultShown = true;
      if (view.entry) { view.entry.name = 'result'; el.setAttribute('data-screen', 'result'); }
      el.classList.add('is-ended');
      if (instant) el.classList.add('is-instant');
      overlay.hidden = true;
      clear(ctrl);
      view.ctl.update(boardProps());
      moveEl.textContent = t('moveN', (n) => 'move ' + n, sess.plies);
      view.renderResult(!instant);
      /* the result card must not hide under a tall held board (a four-seat table):
         shrink the board by what the card lacks, counting the seat bar that is collapsing */
      const lack = resultWrap.scrollHeight - resultWrap.clientHeight - seatsEl.offsetHeight;
      const bh = host.getBoundingClientRect().height;
      if (lack > 0 && bh > 0) host.style.zoom = String(Math.max(0.6, Math.floor(view.zoom * ((bh - lack) / bh) * 1000) / 1000));
      announce(outcomeOf(findRecord(sess.recordId) || recordFromSession(sess)).headline);
    };
    view.renderResult = (animate) => {
      const rec = findRecord(sess.recordId) || recordFromSession(sess);
      clear(resultWrap);
      resultWrap.appendChild(resultCard(sess, rec, animate));
    };
    return view;
  }

  /* ------------------------------------------------------------------
     Result curtain: scoreline card under the held board
     ------------------------------------------------------------------ */
  function matchupChips(rec, o) {
    const ids = rec.modelIds || [];
    const youWin = o.winner === 'human';
    const modelWin = o.winner === 'model';
    const decided = youWin || modelWin;            /* a draw or no result leaves both seats at full presence */
    return h('div', { class: 'rs-chips' },
      h('span', { class: 'rs-chip' + (youWin ? ' is-winner' : decided ? ' is-neutral' : ''), 'aria-label': 'You, ' + youName() }, youTile(22), h('span', { class: 'rs-chip-name' }, youName())),
      h('span', { class: 'rs-vs mono' }, 'vs'),
      ids.slice(0, 3).map((id) => {
        const m = modelOrStub(id);
        const raw = rec.result && rec.result.rawWinner;
        const seatId = /^seat\d$/.test(raw || '') && rec.setup && Array.isArray(rec.setup.seatModels) ? rec.setup.seatModels[parseInt(raw.slice(4), 10) - 1] : null;
        const won = modelWin && (!seatId || seatId === id);
        return h('span', { class: 'rs-chip' + (won ? ' is-winner' : decided ? ' is-neutral' : '') }, providerTile(m, 22), h('span', null, ids.length > 1 ? shortName(m) : fullName(m)));
      }));
  }
  function recordMeta(rec) {
    const g = Data.game(rec.slug);
    const a = Data.arenaOf(rec.slug);
    return [(a ? a.name : g ? g.name : rec.slug), g ? g.tableLabel : null, (rec.moves || 0) + (rec.moves === 1 ? ' move' : ' moves'), absDate(rec.endedAt)].filter(Boolean).join(' · ');
  }
  function resultCard(sess, rec, animate) {
    const o = outcomeOf(rec);
    const pub = sess.publication;
    const visRow = h('div', { class: 'rs-vis' });
    const renderVis = (busy) => {
      clear(visRow);
      const v = rec.visibility || 'public';
      append(visRow, [
        eyebrow(t('matchVisibility', 'Match visibility'), busy ? h('span', { class: 'mono rs-busy' }, 'Saving…') : sess.publication === 'ready' ? h('span', { class: 'rs-saved' }, ic('check', 14), t('savedToProfile', 'Saved to your profile')) : null),
        segmented([{ value: 'public', label: t('visibilityPublic', 'Public') }, { value: 'followers', label: t('visibilityFollowers', 'Followers') }, { value: 'only_me', label: t('visibilityOnlyMe', 'Only me') }], v, (nv) => {
          rec.visibility = nv; sess.visibility = nv; save();
          renderVis(true);
          later(dur(450), () => renderVis(false));
        }, { label: t('matchVisibility', 'Match visibility'), disabled: busy }),
        h('p', { class: 'rs-vis-desc' }, safe(() => W.ESD.copy.visibilityDesc[v], null, 'visibilityDesc') || { public: 'Anyone can view and share this match.', followers: 'Approved followers can view this match.', only_me: 'Only you can view this match.' }[v])]);
    };
    renderVis(false);
    const replayOff = pub === 'unavailable';
    const card = h('section', { class: 'rs-card' + (animate ? ' is-rising' : '') + (o.kind === 'win' || o.kind === 'timeout' ? ' is-win' : ''), 'aria-label': 'Result' },
      h('h2', { class: 'rs-outcome' }, o.headline),
      o.sub ? h('p', { class: 'rs-sub' }, o.sub) : null,
      o.foot ? h('p', { class: 'rs-foot' }, o.foot) : null,
      matchupChips(rec, o),
      h('div', { class: 'rs-meta mono' }, recordMeta(rec)),
      o.verdict ? h('p', { class: 'rs-verdict' }, o.verdict) : null,
      visRow,
      h('div', { class: 'rs-actions' },
        primaryBtn(t('playAgain', 'Play again'), () => startFlow(sess.setup, { from: 'result' }), { icon: 'replay' }),
        h('div', { class: 'rs-actions-row' },
          secondaryBtn(t('newOpponent', 'New opponent'), () => { goHome(); openTableSheet(sess.setup, { openRoster: (Data.game(sess.slug) || {}).seats <= 2 }); }, { cls: 'ap-btn--small' }),
          secondaryBtn(replayOff ? t('replayUnavailable', 'Replay unavailable') : t('watchReplay', 'Watch replay'), () => openReplay(rec), { cls: 'ap-btn--small', disabled: replayOff }),
          secondaryBtn(t('share', 'Share'), () => openShareSheet(rec), { cls: 'ap-btn--small', icon: 'share' }))));
    return card;
  }
  function openLeaveSheet(sess) {
    return openSheet({ kind: 'leave', label: t('leaveMatchTitle', 'Leave match?') }, (e) => ({
      head: h('div', { class: 'sh-lv-head' }, h('h2', { class: 'sh-title' }, t('leaveMatchTitle', 'Leave match?')), h('p', { class: 'sh-lv-sub' }, t('leaveMatchBody', 'The model will be waiting.'))),
      body: h('div', { class: 'sh-lv-body' },
        h('button', { type: 'button', class: 'sh-lv-opt', onclick: () => { e.close({ silent: true }); goHome(); } }, h('span', { class: 'sh-lv-opt-title' }, t('leave', 'Leave')), h('span', { class: 'sh-lv-opt-help' }, t('leaveHelper', 'The match stays active for up to seven days.'))),
        h('button', { type: 'button', class: 'sh-lv-opt is-loss', onclick: () => { e.close({ silent: true }); finish(sess, { reason: 'resignation', winner: 'model' }); } }, h('span', { class: 'sh-lv-opt-title' }, t('resign', 'Resign')), h('span', { class: 'sh-lv-opt-help' }, t('resignHelper', 'A loss on your record.'))),
        primaryBtn(t('keepPlaying', 'Keep playing'), () => e.close(), {}))
    }));
  }

  /* ------------------------------------------------------------------
     Share card (rendered by the app; ESB draws the board at share size)
     ------------------------------------------------------------------ */
  function shareCard(rec, opts) {
    opts = opts || {};
    const o = outcomeOf(rec);
    const g = Data.game(rec.slug);
    const m = modelOrStub((rec.modelIds || [])[0]);
    const host = h('div', { class: 'rs-share-board' });
    const fv = rec.frames && rec.frames.length ? rec.frames[rec.frames.length - 1] : null;
    const ctl = fv ? mountBoard(host, { family: familyOf(rec.slug, fv), view: fv, size: 'share', interactive: false, legal: [], reveal: true, lastMove: fv.lastMove || null, reducedMotion: true }) : null;
    if (!fv) boardFallback(host, { size: 'share' });
    const line = o.kind === 'loss' || o.kind === 'resigned'
      ? t('shareLoss', (x, n) => 'It took ' + x + ' ' + n + ' moves to beat me.', shortName(m), rec.moves)
      : o.kind === 'win' ? t('shareWin', (x, gg) => 'I beat ' + x + ' at ' + gg + '.', shortName(m), g ? g.name : '') : o.sub;
    const markSrc = safe(() => W.ESA.mark, '', 'ESA.mark');
    const el = h('div', { class: 'rs-share rs-share--' + (opts.format || 'portrait'), role: 'img', 'aria-label': 'Share card. ' + o.headline + ' ' + (line || '') + ' ' + recordMeta(rec) },
      h('div', { class: 'rs-share-top' }, markSrc ? h('img', { class: 'rs-share-mark', src: markSrc, alt: '' }) : null, h('span', { class: 'rs-share-url mono' }, t('shareSignature', 'eslams.com'))),
      h('div', { class: 'rs-share-outcome' }, o.headline),
      line ? h('div', { class: 'rs-share-line' }, line) : null,
      host,
      matchupChips(rec, o),
      h('div', { class: 'rs-share-meta mono' }, recordMeta(rec)));
    el.destroyBoard = () => { if (ctl) ctl.destroy(); };
    return el;
  }
  function openShareSheet(rec) {
    const st = { format: 'portrait', card: null };
    const entry = openSheet({ kind: 'share', label: t('share', 'Share') }, (e) => {
      if (st.card) st.card.destroyBoard();
      st.card = shareCard(rec, { format: st.format });
      return {
        head: sheetHead(t('share', 'Share'), { sub: '1080 × ' + (st.format === 'portrait' ? '1350' : '1920'), close: () => e.close() }),
        body: h('div', { class: 'rs-share-body' },
          segmented([{ value: 'portrait', label: '1080 × 1350' }, { value: 'story', label: '1080 × 1920' }], st.format, (v) => { st.format = v; e.render(); }, { label: 'Image size' }),
          h('div', { class: 'rs-share-stage' }, st.card)),
        foot: h('div', { class: 'rs-share-foot' },
          secondaryBtn('Save image', () => toast('Saved the 1080 × ' + (st.format === 'portrait' ? '1350' : '1920') + ' image to Photos.')),
          primaryBtn(t('share', 'Share'), () => toast('Opens the system share sheet with the image.'), { icon: 'share' }))
      };
    });
    entry.cleanup = () => { if (st.card) st.card.destroyBoard(); };
    renderCanvasShare(rec);
    return entry;
  }
  function renderCanvasShare(rec) {
    rec = rec || S.lastRecord || (Array.isArray(P.matches) ? P.matches[0] : null);
    ['light', 'dark'].forEach((th) => {
      const slot = document.getElementById('cv-share-' + th);
      if (!slot) return;
      if (slot.firstChild && slot.firstChild.destroyBoard) slot.firstChild.destroyBoard();
      clear(slot);
      if (!rec) { slot.appendChild(h('p', { class: 'cv-share-empty' }, 'Finish a match to render its share card.')); return; }
      slot.appendChild(safe(() => shareCard(rec), h('p', { class: 'cv-share-empty' }, 'Share card unavailable.'), 'canvas.share'));
    });
  }

  /* ------------------------------------------------------------------
     Replay: board pinned, filmstrip scrubber, transport, reasoning ledger
     ------------------------------------------------------------------ */
  function ledgerName(rec, row) {
    if (row.by) return row.by;
    if (row.seat === 'you') return 'You';
    const s = rec.setup || {};
    if (/^seat\d$/.test(row.seat || '') && Array.isArray(s.seatModels)) {
      const id = s.seatModels[parseInt(row.seat.slice(4), 10) - 1];
      if (id) return shortName(modelOrStub(id));
      return 'You';
    }
    return shortName(modelOrStub((rec.modelIds || [])[0]));
  }
  function openReplay(rec) {
    closeMenu();
    const g = Data.game(rec.slug);
    const close = () => popScreen('fade');
    const grab = h('div', { class: 'sh-grab-zone st-rp-grab' }, h('div', { class: 'sh-grab', 'aria-hidden': 'true' }));
    if (!g) {
      const el0 = h('section', { class: 'st-replay', 'aria-label': t('replay', 'Replay') }, grab,
        h('div', { class: 'st-rp-head' }, h('button', { type: 'button', class: 'ap-iconbtn ap-iconbtn--ghost', 'aria-label': 'Close replay', onclick: close }, ic('close', 20)), h('div', { class: 'st-rp-title' }, t('replay', 'Replay'))),
        h('p', { class: 'st-rp-missing' }, t('savedGameUnavailable', 'This saved Arena game is not available in the current catalogue.')));
      pushScreen('replay', el0, { anim: 'fade' });
      return;
    }
    const frames = rec.frames || [];
    const ledger = rec.ledger || [];
    const N = Math.max(0, frames.length - 1);
    const off = frames.length > ledger.length ? 1 : 0;
    /* rows may name their frame (simultaneous games put two picks on one frame) */
    const frameOf = (row, i) => (row && typeof row.frame === 'number' ? row.frame : i + off);
    const st = { pos: 0, playing: null };
    const counter = h('span', { class: 'st-rp-count mono' });
    const host = h('div', { class: 'st-board-host' });
    const fill = h('div', { class: 'st-rp-fill' });
    const knob = h('div', { class: 'st-rp-knob' });
    const ticks = h('div', { class: 'st-rp-ticks', 'aria-hidden': 'true' });
    for (let i = 1; i < N; i++) ticks.appendChild(h('span', { class: 'st-rp-tick', style: { left: (i / N * 100) + '%' } }));
    const scrub = h('div', { class: 'st-rp-scrub', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': String(N) }, h('div', { class: 'st-rp-track' }, fill, ticks), knob);
    const playBtn = h('button', { type: 'button', class: 'ap-iconbtn st-rp-play', 'aria-label': t('replayControls', null) ? 'Play' : 'Play' });
    const tbtn = (icon, label, fn) => h('button', { type: 'button', class: 'ap-iconbtn', 'aria-label': label, onclick: fn }, ic(icon, 20));
    const list = h('div', { class: 'st-rp-ledger', role: 'list', 'aria-label': 'Reasoning ledger' });
    const noReason = !ledger.some((r) => r && r.reasoning);
    if (noReason) list.appendChild(h('p', { class: 'st-rp-quiet' }, g.hiddenInfo ? t('noReasoning', 'Hidden-information games publish no reasoning.') : 'No public reasoning attached to this match.'));
    const rows = ledger.map((row, i) => {
      const you = ledgerName(rec, row) === 'You';
      const b = h('button', { type: 'button', role: 'listitem', class: 'st-rp-row', onclick: () => go(frameOf(row, i)) },
        h('span', { class: 'st-rp-turn mono' }, String(row.turn != null ? row.turn : i + 1)),
        h('span', { class: 'st-rp-dot' + (you ? ' is-you' : ''), 'aria-hidden': 'true' }),
        h('span', { class: 'st-rp-row-txt' }, h('span', { class: 'st-rp-action' }, playerAction(rec.slug, row.action)), h('span', { class: 'st-rp-by mono' }, ledgerName(rec, row)),
          row.reasoning ? h('span', { class: 'st-rp-reason' }, row.reasoning) : null));
      list.appendChild(b);
      return b;
    });
    const m = modelOrStub((rec.modelIds || [])[0]);
    const el = h('section', { class: 'st-replay', 'aria-label': t('replay', 'Replay') + ' · ' + g.name }, grab,
      h('div', { class: 'st-rp-head' },
        h('button', { type: 'button', class: 'ap-iconbtn ap-iconbtn--ghost', 'aria-label': 'Close replay', onclick: close }, ic('close', 20)),
        h('div', { class: 'st-rp-title-wrap' }, h('div', { class: 'st-rp-title' }, g.name), h('div', { class: 'st-rp-sub mono', title: absDateTime(rec.endedAt) }, 'vs ' + fullName(m) + ' · ' + absDate(rec.endedAt))),
        counter),
      h('div', { class: 'st-board st-rp-board' }, host),
      scrub,
      h('div', { class: 'st-rp-transport' }, tbtn('restart', 'Restart', () => go(0)), tbtn('stepback', 'Step back', () => go(st.pos - 1)), playBtn, tbtn('stepfwd', 'Step forward', () => go(st.pos + 1)), tbtn('end', 'End', () => go(N))),
      list);
    const props = () => {
      const v = frames[st.pos];
      return { family: familyOf(rec.slug, v), view: v, size: 'stage', interactive: false, legal: [], lastMove: v && v.lastMove ? v.lastMove : null, reveal: st.pos === N, youSeat: rec.yourSeat ? 'seat' + rec.yourSeat : rec.humanSide,
        seats: rec.setup ? boardSeats(Object.assign({ game: rec.slug }, rec.setup), rec.humanSide) : [], reducedMotion: isReduced() };
    };
    const ctl = frames.length ? mountBoard(host, props()) : null;
    if (!frames.length) boardFallback(host, { size: 'stage' });
    function setPlaying(on) {
      clearInterval(st.playing);
      st.playing = on ? setInterval(() => { if (st.pos >= N) setPlaying(false); else go(st.pos + 1, true); }, 900) : null;
      clear(playBtn);
      playBtn.appendChild(ic(on ? 'pause' : 'play', 20));
      playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    }
    playBtn.addEventListener('click', () => { if (!st.playing && st.pos >= N) go(0); setPlaying(!st.playing); });
    function go(p, fromPlay) {
      if (!fromPlay) setPlaying(false);
      st.pos = clamp(p, 0, N);
      if (ctl) ctl.update(props());
      counter.textContent = st.pos + ' / ' + N;
      const pct = N ? (st.pos / N) * 100 : 0;
      fill.style.width = pct + '%';
      knob.style.left = pct + '%';
      scrub.setAttribute('aria-valuenow', String(st.pos));
      scrub.setAttribute('aria-valuetext', 'Move ' + st.pos + ' of ' + N);
      scrub.setAttribute('aria-label', 'Replay scrubber, move ' + st.pos + ' of ' + N);
      let cur = null;
      rows.forEach((r, i) => { const on = frameOf(ledger[i], i) === st.pos; r.classList.toggle('is-on', on); if (on && !cur) cur = r; });
      if (cur) list.scrollTo({ top: cur.offsetTop - list.offsetTop - list.clientHeight / 2 + cur.offsetHeight / 2, behavior: isReduced() ? 'auto' : 'smooth' });
    }
    const posFrom = (e) => { const r = scrub.getBoundingClientRect(); return Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * N); };
    let dragging = false;
    scrub.addEventListener('pointerdown', (e) => { dragging = true; scrub.setPointerCapture(e.pointerId); go(posFrom(e)); });
    scrub.addEventListener('pointermove', (e) => { if (dragging) go(posFrom(e)); });
    scrub.addEventListener('pointerup', () => { dragging = false; });
    scrub.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (k) { go(st.pos + k); e.preventDefault(); } else if (e.key === 'Home') { go(0); e.preventDefault(); } else if (e.key === 'End') { go(N); e.preventDefault(); }
    });
    /* swipe down on the grab zone dismisses */
    let y0 = null;
    grab.addEventListener('pointerdown', (e) => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointermove', (e) => { if (y0 != null) el.style.transform = 'translateY(' + Math.max(0, e.clientY - y0) + 'px)'; });
    grab.addEventListener('pointerup', (e) => { const dy = y0 == null ? 0 : e.clientY - y0; y0 = null; el.style.transform = ''; if (dy > 120) close(); });
    setPlaying(false);
    pushScreen('replay', el, { anim: 'fade', cleanup: () => { clearInterval(st.playing); if (ctl) ctl.destroy(); } });
    go(0);
  }

  /* ------------------------------------------------------------------
     Avatar corner: Your matches, Settings (push screens)
     ------------------------------------------------------------------ */
  function pushHeader(title) {
    return h('header', { class: 'ap-push-head' },
      h('button', { type: 'button', class: 'ap-iconbtn', 'aria-label': 'Back', onclick: () => popScreen('push') }, ic('back', 20)),
      h('h1', { class: 'ap-push-title' }, title));
  }
  const VIS_ICON = { public: ['globe', 'Public'], followers: ['users', 'Followers'], only_me: ['lock', 'Only me'] };
  function openMatches() {
    closeMenu();
    const posters = [];
    const scroll = h('div', { class: 'ap-scroll ap-push-scroll' });
    const el = h('section', { class: 'ap-push', 'aria-label': t('yourMatches', 'Your matches') }, scroll);
    scroll.appendChild(pushHeader(t('yourMatches', 'Your matches')));
    const list = Array.isArray(P.matches) ? P.matches : [];
    if (!P.signedIn) {
      scroll.appendChild(h('div', { class: 'ap-card ap-empty' }, h('p', { class: 'ap-empty-body' }, t('signInToStartAGame', 'Sign in to start a game.')),
        primaryBtn(t('signIn', 'Sign in'), () => openSignIn({ intent: null }))));
    } else if (!list.length) {
      scroll.appendChild(h('div', { class: 'ap-card ap-empty' }, h('p', { class: 'ap-empty-body' }, t('noMatchesYet', 'No matches yet. Play one and it will show up here.'))));
    } else {
      const ul = h('div', { class: 'ap-mlist', role: 'list' });
      list.forEach((rec) => {
        const vis = VIS_ICON[rec.visibility] || VIS_ICON.public;
        const unavailable = rec.publication === 'unavailable' || !(rec.frames && rec.frames.length);
        ul.appendChild(matchCard(rec, {
          role: 'listitem', action: 'watch', posters, disabledReason: unavailable ? t('replayUnavailable', 'Replay unavailable') : null,
          detail: absDateTime(rec.endedAt) + ', visibility ' + vis[1],
          extra: h('span', { class: 'ap-mcard-vis', title: 'Visibility: ' + vis[1] }, ic(vis[0], 14)),
          onOpen: unavailable ? null : () => openReplay(rec), onAction: () => openReplay(rec)
        }));
      });
      scroll.appendChild(ul);
    }
    pushScreen('matches', el, { anim: 'push', cleanup: () => posters.forEach((p) => p.destroy()) });
  }
  function settingsRow(label, right, opts) {
    opts = opts || {};
    const tag = opts.onclick ? 'button' : 'div';
    return h(tag, { type: opts.onclick ? 'button' : null, class: 'ap-srow' + (opts.tone ? ' is-' + opts.tone : ''), onclick: opts.onclick || null },
      h('span', { class: 'ap-srow-label' }, label), right || (opts.onclick ? ic('chevron', 16, 'ap-srow-chev') : null));
  }
  /* Appearance: agent G's six-tile grid when ESOnboard provides it, else the segmented control */
  function appearanceControl(ctls) {
    const ob = W.ESOnboard;
    if (ob && typeof ob.themeTiles === 'function') {
      const box = h('div', { class: 'ap-appearance' });
      const ctl = safe(() => ob.themeTiles(box, { mode: 'settings', onChange: () => syncCanvas() }), null, 'onboard.themeTiles');
      if (ctl && ctls) ctls.push(ctl);
      if (box.firstChild) return box;
    }
    return segmented([{ value: 'system', label: t('appearanceSystem', 'System') }, { value: 'light', label: t('appearanceLight', 'Light') }, { value: 'dark', label: t('appearanceDark', 'Dark') }], P.themePref, (v) => setThemePref(v), { label: t('appearance', 'Appearance') });
  }
  function favCountLine() {
    const n = favourites().length;
    return n ? n + (n === 1 ? ' game' : ' games') : 'None yet';
  }
  /* Your games: the same compact tiles as Profile setup; tap order is pick order, saved on every tap */
  function openYourGames() {
    closeMenu();
    const st = { picks: favourites() };
    const order = safe(() => W.ESD.gameOrder.slice(), [], 'ESD.gameOrder').filter(playableSlug);
    return openSheet({ kind: 'favourites', height: '90%', label: t('yourGames', 'Your games'), onClose: () => {
      if (S.homeView) S.homeView.render();
      const top = topScreen();
      if (top && top.name === 'settings' && top.rerender) top.rerender();
    } }, (e) => {
      const head = sheetHead(t('yourGames', 'Your games'), { sub: t('favouritesHint', 'Pick any. Your first pick opens Home.'), close: () => e.close() });
      const body = h('div', { class: 'ap-fav' },
        h('p', { class: 'ap-fav-count mono', role: 'status' }, st.picks.length ? st.picks.length + ' of ' + order.length + ' games' : order.length + ' games'),
        h('div', { class: 'ap-grid ap-fav-grid' }, order.map((slug) => {
          const i = st.picks.indexOf(slug);
          return gameCard(slug, 'compact', { selected: i >= 0, order: i >= 0 ? i + 1 : null, onOpen: () => {
            const k = st.picks.indexOf(slug);
            if (k >= 0) st.picks.splice(k, 1); else st.picks.push(slug);
            saveFavourites(st.picks);
            e.render();
          } });
        })));
      return { head, body };
    });
  }
  function openSettings() {
    closeMenu();
    const scroll = h('div', { class: 'ap-scroll ap-push-scroll' });
    const el = h('section', { class: 'ap-push', 'aria-label': t('settingsTitle', 'Settings') }, scroll);
    const ctls = [];
    const dropCtls = () => { ctls.splice(0).forEach((c) => safe(() => c.destroy && c.destroy(), null, 'themeTiles.destroy')); };
    const render = () => {
      const keep = scroll.scrollTop;
      dropCtls();
      clear(scroll);
      append(scroll, [
        pushHeader(t('settingsTitle', 'Settings')),
        h('section', { class: 'ap-sgroup' }, eyebrow(t('appearance', 'Appearance')), appearanceControl(ctls)),
        h('section', { class: 'ap-sgroup ap-card' },
          settingsRow(t('yourGames', 'Your games'), h('span', { class: 'ap-srow-right' }, h('span', { class: 'mono ap-srow-val' }, favCountLine()), ic('chevron', 16, 'ap-srow-chev')), { onclick: () => openYourGames() })),
        h('section', { class: 'ap-sgroup ap-card' },
          settingsRow(t('sound', 'Sound'), toggle(P.settings.sound, (v) => { P.settings.sound = v; save(); unlockAudio(); render(); }, t('sound', 'Sound'))),
          settingsRow(t('haptics', 'Haptics'), toggle(P.settings.haptics, (v) => { P.settings.haptics = v; save(); render(); }, t('haptics', 'Haptics')))),
        h('section', { class: 'ap-sgroup' }, eyebrow(t('account', 'Account')),
          h('div', { class: 'ap-card' },
            settingsRow(t('manageAccount', 'Manage your account on eslams.com'), null, { onclick: () => toast('Opens eslams.com account settings in the browser, including Default match visibility.') }),
            settingsRow(t('deleteAccount', 'Delete account'), null, { tone: 'loss', onclick: () => toast('Opens the eslams.com account deletion flow in the browser.') }))),
        h('section', { class: 'ap-sgroup' }, eyebrow(t('about', 'About')),
          h('div', { class: 'ap-card' },
            settingsRow(t('version', 'Version'), h('span', { class: 'mono ap-srow-val' }, '1.0.0 (prototype)')),
            settingsRow(t('privacy', 'Privacy'), null, { onclick: () => toast('Opens eslams.com/privacy in the browser.') }),
            settingsRow(t('terms', 'Terms'), null, { onclick: () => toast('Opens eslams.com/terms in the browser.') }))),
        P.signedIn ? secondaryBtn(t('signOut', 'Sign out'), signOut, { cls: 'ap-signout', icon: 'signout' }) : null]);
      scroll.scrollTop = keep;
    };
    render();
    const entry = pushScreen('settings', el, { anim: 'push', cleanup: dropCtls });
    entry.rerender = render;
  }

  /* ------------------------------------------------------------------
     Dev API (CONTRACT section 6) and extras for QA
     ------------------------------------------------------------------ */
  const DEV_DEFAULTS = () => ({ delayMin: 1500, delayMax: 5000, speedIndex: 2, engine: 'ok', conflict: false, offline: false, catalogueDown: false, rosterDown: false, forcedStage: null, signInExpired: false, twoFactorProviders: false, publication: 'ready' });
  function refreshAll() {
    if (S.homeView) S.homeView.render();
    S.sheets.forEach((s) => s.kind === 'table' && s.render());
    syncCanvas();
  }
  const OUTCOMES = {
    win: { reason: 'normal', winner: 'human' }, loss: { reason: 'normal', winner: 'model' }, draw: { reason: 'normal', winner: 'draw' },
    resigned: { reason: 'resignation', winner: 'model' }, timeout: { reason: 'model_timeout_award', winner: 'human' },
    unavailable: { reason: 'model_unavailable', winner: null }, expired: { reason: 'abandoned', source: 'inactivity_expired', winner: null },
    replaced: { reason: 'abandoned', source: 'user_ended', winner: null }
  };
  /* A forced result still holds a legal board: a real recording whose outcome matches, or a partial one. */
  function seedForcedSession(sess, kind) {
    const want = OUTCOMES[kind];
    if (sess.mode === 'scripted') {
      const n = kind === 'win' || kind === 'loss' || kind === 'draw' ? sess.rec.ledger.length : Math.max(1, Math.floor(sess.rec.ledger.length / 2));
      for (let i = 0; i < n; i++) { if (whoseTurn(sess) === 'human') humanDemoStepSilent(sess); else modelStepSilent(sess); }
      return;
    }
    let pick = null;
    for (let seed = 1; seed <= 24 && !pick; seed++) {
      const r = Eng.record(sess.slug, { humanSide: sess.humanSide, seed });
      if (!r) break;
      const w = r.result ? mapWinner(sess, r.result.winner) : 'draw';
      if (!['win', 'loss', 'draw'].includes(kind) || w === want.winner) pick = r;
    }
    if (!pick) return;
    const frames = ['win', 'loss', 'draw'].includes(kind) ? pick.frames : pick.frames.slice(0, Math.max(2, Math.floor(pick.frames.length / 2)));
    sess.frames = frames.slice();
    sess.ledger = (pick.ledger || []).slice(0, frames.length - 1);
    sess.plies = frames.length - 1;
  }
  function humanDemoStepSilent(sess) { const r = sess.rec.ledger[sess.step]; sess.step += 1; sess.plies += 1; sess.frames.push(scriptedView(sess)); sess.ledger.push(Object.assign({}, r, { by: 'You', reasoning: null })); }
  function modelStepSilent(sess) { const r = sess.rec.ledger[sess.step]; sess.step += 1; sess.plies += 1; sess.frames.push(scriptedView(sess)); sess.ledger.push(Object.assign({}, r)); }

  function snapshot() {
    const L = S.live;
    return {
      screen: screenName(), screens: S.screens.map((s) => s.name), sheets: S.sheets.map((s) => s.kind + (s.st && s.st.step ? ':' + s.st.step : '')),
      signedIn: P.signedIn, username: P.username, onboarded: P.onboarded, themePref: P.themePref, theme: resolvedTheme(), reducedMotion: isReduced(),
      setup: clone(currentSetup()), live: L ? { slug: L.slug, mode: L.mode, plies: L.plies, turn: whoseTurn(L), modelTurn: L.modelTurn ? L.modelTurn.status : null, humanSide: L.humanSide, cells: clone((sessView(L) || {}).cells || null) } : null,
      lastResult: S.lastRecord ? clone(S.lastRecord.result) : null,
      webSession: clone(S.webSession), matches: (P.matches || []).length, dev: Object.assign({}, S.dev),
      hero: heroSlug(), favourites: favourites(), homeSections: Data.ok() ? safe(() => homeSections().map((x) => x.title), [], 'homeSections') : [], catalogue: Data.ok() ? Data.counts() : null, deps: { ESA: !!W.ESA, ESD: !!W.ESD, ESE: !!W.ESE, ESB: !!W.ESB }
    };
  }
  const dev = {
    state: snapshot,
    setTheme(p) { setThemePref(p); },
    setSignedIn(on) {
      P.signedIn = !!on;
      if (on) { if (!P.username) P.username = 'player-1'; P.onboarded = true; }
      save();
      refreshAll();
    },
    setReducedMotion(on) { setReducedMotion(!!on); },
    modelDelayMs(min, max) {
      S.dev.delayMin = Math.max(0, Number(min) || 0);
      S.dev.delayMax = Math.max(S.dev.delayMin, Number(max) || S.dev.delayMin);
      const i = SPEEDS.findIndex((x) => x[0] === S.dev.delayMin && x[1] === S.dev.delayMax);
      S.dev.speedIndex = i;
      syncCanvas();
      return [S.dev.delayMin, S.dev.delayMax];
    },
    forceStage(kind) {
      const k = /claim/.test(kind) ? 'claim' : /keep|longer/.test(kind) ? 'keep_waiting' : 'thinking';
      const sess = S.live;
      if (sess && sess.status === 'active' && sess.modelTurn && whoseTurn(sess) === 'model') { applyForcedStage(sess, k); return 'applied'; }
      S.dev.forcedStage = k;
      return 'queued for the next model turn';
    },
    forceEngine(mode) { S.dev.engine = ['cold', 'unavailable'].includes(mode) ? mode : 'ok'; syncCanvas(); },
    forceConflict(on) {
      S.dev.conflict = !!on;
      S.webSession = on ? { slug: Data.game('chess') ? 'chess' : 'connect-four', modelId: 'openai/gpt-4.1-mini', state: 'your move' } : null;
      refreshAll();
    },
    reset() {
      if (S.live) clearTimers(S.live);
      S.live = null;
      S.webSession = null;
      S.lastRecord = null;
      S.dev = DEV_DEFAULTS();
      P = freshPersist();
      save();                                   /* overwrites the prototype's own stored state */
      document.documentElement.classList.remove('reduced-motion');
      closeMenu();
      closeAllSheets(true);
      S.screens.slice().reverse().forEach((s) => removeScreen(s, null));
      S.previews.slice().forEach((p) => p.destroy());
      applyTheme();
      ensureFixtures();
      showHome();
      brandBeat();
      renderCanvasShare();
      syncCanvas();
    },
    skipBrand() { if (S.brandEnd) S.brandEnd(); },
    replayBrand() { brandBeat(); },
    setOffline(on) { S.dev.offline = !!on; refreshAll(); },
    forceCatalogue(on) { S.dev.catalogueDown = !!on; refreshAll(); },
    forceRoster(on) { S.dev.rosterDown = !!on; syncCanvas(); },
    forceTwoFactor(on) { S.dev.twoFactorProviders = !!on; syncCanvas(); },
    forcePublication(mode) { S.dev.publication = mode === 'unavailable' ? 'unavailable' : 'ready'; syncCanvas(); },
    openSeeAll(id) { closeAllSheets(true); return !!openSeeAll(id || 'start'); },
    expireSignIn() { S.dev.signInExpired = true; if (!P.signedIn) dev.setSignedIn(true); },
    oauthError(code) { closeAllSheets(true); openSignIn({ oauthError: code || 'access_denied' }); },
    reconnect() { if (S.stageView) S.stageView.reconnect(); },
    staleState() { if (S.stageView) { S.stageView.note(t('matchChanged', 'The match changed on another device. The latest position is now loaded.'), 4000); S.stageView.sync(); } },
    forceResult(kind) {
      const out = OUTCOMES[kind];
      if (!out) return false;
      if (!P.signedIn) dev.setSignedIn(true);
      let sess = S.live && S.live.status === 'active' ? S.live : null;
      if (!sess) {
        sess = createSession(currentSetup());
        if (!sess) return false;
        seedForcedSession(sess, kind);
        S.live = sess;
      } else if (sess.plies === 0) {
        seedForcedSession(sess, kind);
      }
      if (!S.stageView || S.stageView.sess !== sess) { popTo('home'); enterStage(sess, { anim: null }); }
      clearTimers(sess);
      finish(sess, Object.assign({}, out));
      return true;
    },
    openTable(slug) { goHome(); openTableSheet(setupFor(slug || heroSlug())); },
    startMatch(slug, opts) {
      if (!P.signedIn) dev.setSignedIn(true);
      startFlow(normalizeSetup(Object.assign({ game: slug || currentSetup().game, modelId: currentSetup().modelId }, opts || {})), { from: 'dev' });
    },
    openMatches() { goHome(); openMatches(); },
    openSettings() { goHome(); openSettings(); },
    openHowto(slug) { openHowto(slug || currentSetup().game); }
  };

  /* ------------------------------------------------------------------
     Canvas panels (outside the phone): Controls, App icon, Share card,
     States, Copy deck. Harmless when the elements are absent.
     ------------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  function syncCanvas() {
    $$('[data-cv-theme]').forEach((b) => { const on = b.getAttribute('data-cv-theme') === P.themePref; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    $$('[data-cv-engine]').forEach((b) => { const on = b.getAttribute('data-cv-engine') === S.dev.engine; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    set('cv-signed', P.signedIn);
    set('cv-reduced', document.documentElement.classList.contains('reduced-motion'));
    set('cv-2fa', S.dev.twoFactorProviders);
    set('cv-conflict', S.dev.conflict);
    const sp = document.getElementById('cv-speed');
    if (sp && S.dev.speedIndex >= 0) sp.value = String(S.dev.speedIndex);
    const lab = document.getElementById('cv-speed-label');
    if (lab) lab.textContent = (S.dev.delayMin / 1000).toFixed(1) + '–' + (S.dev.delayMax / 1000).toFixed(1) + ' s';
    $$('[data-cv-toggle]').forEach((b) => {
      const k = b.getAttribute('data-cv-toggle');
      const on = k === 'offline' ? S.dev.offline : k === 'catalogue' ? S.dev.catalogueDown : k === 'roster' ? S.dev.rosterDown : k === 'publication' ? S.dev.publication === 'unavailable' : false;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  const STATES = [
    ['Brand beat', 'Cold launch only, under 1.2 s. Tap to skip after the first launch. Reduced motion shows it static.', [['Replay', () => dev.replayBrand()]]],
    ['Home, signed out', 'A quiet Sign in chip. Play now still starts, through the sign-in sheet.', [['Sign out', () => dev.setSignedIn(false)]]],
    ['Resume card', 'Leave a match with the close button, then Leave. Nothing outranks an unfinished match.', null],
    ['Match on the web', 'Conflict on: Home shows the web-started match read-only, and Start raises the one-active-match card.', [['Toggle', () => dev.forceConflict(!S.dev.conflict)]]],
    ['Offline', 'Play now reads Back online to play. The grid renders from cache.', [['Toggle', () => dev.setOffline(!S.dev.offline), 'offline']]],
    ['Catalogue unavailable', 'Arena games coming soon, never a fake grid.', [['Toggle', () => dev.forceCatalogue(!S.dev.catalogueDown), 'catalogue']]],
    ['Hidden-information rail', 'Card and Social tables seat only the four capable models, said in mono, never padded.', [['Gin Rummy', () => dev.openTable('gin-rummy')]]],
    ['Seat ring', 'Four seats, Your seat 1 to 4, tap a seat to swap, Auto-fill table.', [["Hold'em", () => dev.openTable('no-limit-texas-holdem')], ['Dou Dizhu', () => dev.openTable('dou-dizhu')], ['Bridge', () => dev.openTable('bridge')]]],
    ['Two-factor', 'The email path asks for it. Code 123456 passes. After GitHub or Google (toggle in Controls) Trust this device is hidden.', null],
    ['Sign-in errors', 'Sign-in expired at Start, and an OAuth deep-link error.', [['Expire', () => dev.expireSignIn()], ['access_denied', () => dev.oauthError('access_denied')], ['linking_conflict', () => dev.oauthError('linking_conflict')]]],
    ['Cold engine', 'Engine: Cold, then start any table except Tic-Tac-Toe and Connect Four. Escalates at 10 s, seats at 14 s.', null],
    ['Engine busy (502)', 'Engine: Unavailable plus a runner table. One designed state with Try again and Play Connect Four.', null],
    ['Opponents unavailable (503)', 'The roster backend is down at Start.', [['Toggle', () => dev.forceRoster(!S.dev.rosterDown), 'roster']]],
    ['Model turn stages', 'Force stage: thinking (10 s), Taking longer than usual with Keep waiting (30 s), Claim the win (120 s).', null],
    ['Reconnecting', 'A quiet ribbon pulse and a snapshot re-sync, never a modal. Also fires when the tab returns.', [['Ribbon', () => dev.reconnect()], ['Stale state', () => dev.staleState()]]],
    ['Result outcomes', 'Every terminal reason the platform emits, each with its honest subline.', [['Win', () => dev.forceResult('win')], ['Loss', () => dev.forceResult('loss')], ['Draw', () => dev.forceResult('draw')], ['Resigned', () => dev.forceResult('resigned')], ['Timeout', () => dev.forceResult('timeout')], ['Unavailable', () => dev.forceResult('unavailable')], ['Expired', () => dev.forceResult('expired')], ['Replaced', () => dev.forceResult('replaced')]]],
    ['Replay unavailable', 'resultPublication unavailable: Watch replay disables and says why.', [['Toggle', () => dev.forcePublication(S.dev.publication === 'unavailable' ? 'ready' : 'unavailable'), 'publication']]],
    ['Your matches', 'Three engine-recorded fixtures on first run, then your own matches.', [['Open', () => dev.openMatches()]]],
    ['Reduced motion', 'Every beat snaps: previews show the final frame, the curtain is instant, reasoning is placed whole.', null]
  ];
  function renderStatesPanel() {
    const box = document.getElementById('cv-states');
    if (!box) return;
    clear(box);
    STATES.forEach(([title, how, acts]) => {
      box.appendChild(h('div', { class: 'cv-state' },
        h('div', { class: 'cv-state-title' }, title),
        h('div', { class: 'cv-state-how' }, how),
        acts ? h('div', { class: 'cv-btns cv-btns--sm' }, acts.map(([label, fn, key]) => h('button', { type: 'button', 'data-cv-toggle': key || null, onclick: () => { safe(fn, null, 'canvas.state'); syncCanvas(); } }, label))) : null));
    });
  }
  function sampleCall(fn) {
    const names = (String(fn).match(/\(([^)]*)\)/) || [, ''])[1].split(',').map((x) => x.trim()).filter(Boolean);
    let out = safe(() => fn(...names.map((n) => '<' + n + '>')), '', 'copy.sample');
    if (/NaN|undefined/.test(String(out))) out = safe(() => fn(...names.map((_, i) => [7, 4, 3][i] || 2)), '', 'copy.sample');
    return String(out);
  }
  function renderCopyDeck() {
    const box = document.getElementById('cv-copy');
    if (!box) return;
    clear(box);
    const c = W.ESD && W.ESD.copy;
    if (!c) { box.appendChild(h('p', { class: 'cv-note' }, 'ESD.copy is not loaded.')); return; }
    Object.keys(c).forEach((k) => {
      const v = c[k];
      let txt;
      if (typeof v === 'string') txt = v;
      else if (typeof v === 'function') txt = sampleCall(v);
      else if (Array.isArray(v)) txt = v.map((x) => (typeof x === 'string' ? x : x && x.you ? x.you + ' / ' + x.model : '')).filter(Boolean).join(' · ');
      else if (v && typeof v === 'object') txt = Object.keys(v).map((kk) => v[kk]).join(' · ');
      else txt = String(v);
      box.appendChild(h('div', { class: 'cv-copy-row' }, h('span', { class: 'cv-copy-key' }, k), h('span', { class: 'cv-copy-val' }, txt)));
    });
  }
  function bindCanvas() {
    const mark = safe(() => W.ESA.mark, '', 'ESA.mark');
    if (mark) $$('img[data-cv-mark]').forEach((im) => { im.src = mark; });
    $$('[data-cv-theme]').forEach((b) => b.addEventListener('click', () => dev.setTheme(b.getAttribute('data-cv-theme'))));
    $$('[data-cv-engine]').forEach((b) => b.addEventListener('click', () => dev.forceEngine(b.getAttribute('data-cv-engine'))));
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, () => fn(el)); };
    on('cv-signed', 'change', (el) => dev.setSignedIn(el.checked));
    on('cv-reduced', 'change', (el) => dev.setReducedMotion(el.checked));
    on('cv-2fa', 'change', (el) => dev.forceTwoFactor(el.checked));
    on('cv-conflict', 'change', (el) => dev.forceConflict(el.checked));
    on('cv-speed', 'input', (el) => { const s = SPEEDS[clamp(parseInt(el.value, 10) || 0, 0, SPEEDS.length - 1)]; dev.modelDelayMs(s[0], s[1]); });
    on('cv-reset', 'click', () => dev.reset());
    const stageBtns = $$('[data-cv-stage]');
    if (stageBtns.length) {
      const note = h('div', { class: 'cv-hint cv-stage-note', role: 'status' });
      stageBtns[0].parentNode.after(note);
      stageBtns.forEach((b) => b.addEventListener('click', () => {
        const r = dev.forceStage(b.getAttribute('data-cv-stage'));
        note.textContent = b.textContent + ': ' + r + '.';
      }));
    }
    renderStatesPanel();
    renderCopyDeck();
    syncCanvas();
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  function boot(phone) {
    if (S.booted) return;
    phone = phone || document.getElementById('phone');
    if (!phone) { report(new Error('#phone not found'), 'boot'); return; }
    S.booted = true;
    P = loadPersist();
    buildRoot(phone);
    applyTheme();
    try {
      mqDark = W.matchMedia('(prefers-color-scheme: dark)');
      const onScheme = () => { if (P.themePref === 'system') applyTheme(); };
      if (mqDark.addEventListener) mqDark.addEventListener('change', onScheme); else mqDark.addListener(onScheme);
    } catch (e) { /* no matchMedia */ }
    ['ESA', 'ESD', 'ESE', 'ESB'].forEach(dep);
    safe(ensureFixtures, null, 'fixtures');
    if (P.live) {
      const s = safe(() => restoreSession(P.live), null, 'restore');
      if (s) S.live = s; else P.live = null;
    }
    showHome();
    if (S.live) safe(() => advance(S.live), null, 'restore.advance');
    /* G-HOOK start: bootRoute */
    const ob = W.ESOnboard;
    if (!ob) brandBeat();
    else {
      safe(() => ob.attach(S.phone), null, 'onboard.attach');
      if (!P.signedIn) safe(() => ob.welcome({ cold: true }), null, 'onboard.welcome');
      else if (!(P.profile && P.profile.complete)) safe(() => ob.setup(), null, 'onboard.setup');
      else if (!P.themePicked) safe(() => ob.themePick(), null, 'onboard.themePick');
    }
    /* G-HOOK end */
    safe(bindCanvas, null, 'canvas');
    safe(() => renderCanvasShare(), null, 'canvas.share');
    W.addEventListener('offline', () => dev.setOffline(true));
    W.addEventListener('online', () => dev.setOffline(false));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.stageView && S.stageView.sess.status === 'active') S.stageView.reconnect(); });
  }

  /* [H] card system for other screens (agent G's Profile setup uses gameCard(slug, 'compact', { selected, order, onOpen })) */
  const UI = { gameCard, matchCard, favourites, heroSlug, setupFor };
  /* [H] QA extras: the opponent picker and the Your games sheet without walking the UI */
  Object.assign(dev, {
    openPicker(slug, seat) {
      goHome();
      const e = openTableSheet(setupFor(slug || heroSlug()));
      const g = Data.game(e.st.draft.game);
      if (g && g.seats > 2 && seat) { const b = e.sheet.querySelectorAll('button.sh-ts-seat')[0]; if (b) later(dur(320), () => b.click()); }
      else later(dur(320), () => openRosterForDuel(e, e.st));
      return e.st.draft.game;
    },
    openYourGames() { goHome(); openYourGames(); },
    setOpponent(slug, id) { rememberOpponent(slug, id); save(); refreshAll(); }
  });
  W.ESApp = { boot, state: snapshot, dev, ui: UI, version: '1.0.0' };
  /* G-HOOK start: profile */
  const obProfile = () => { const p = P.profile || {}; return { handle: P.username || '', visibility: p.visibility === 'private' ? 'private' : 'public', bio: p.bio || '', location: p.location || '', favourites: Array.isArray(p.favourites) ? p.favourites.slice() : [], complete: !!p.complete }; };
  Object.defineProperty(W.ESApp, 'profile', { enumerable: true, get: obProfile, set(v) {
    const n = Object.assign(obProfile(), v || {});
    P.username = String(n.handle || ''); P.profile = Object.assign({}, P.profile, { visibility: n.visibility === 'private' ? 'private' : 'public', bio: n.bio || '', location: n.location || '', favourites: (n.favourites || []).slice(), complete: !!n.complete }); save(); } });
  Object.defineProperty(W.ESApp, 'firstRun', { enumerable: true, get: () => ({ signedIn: P.signedIn, themePref: P.themePref, themePicked: !!P.themePicked }), set(v) { v = v || {}; if (v.themePref) P.themePref = String(v.themePref); if ('themePicked' in v) P.themePicked = !!v.themePicked; save(); syncCanvas(); } });
  W.ESApp.openAuth = (step, onAuth) => { closeAllSheets(true); return openSignIn({ step, onAuth }); };
  W.ESApp.onProfileComplete = (profile) => {
    W.ESApp.profile = Object.assign({}, profile, { complete: true }); P.signedIn = true; P.onboarded = true;
    P.setup = normalizeSetup({ game: W.ESApp.profile.favourites[0] || 'tic-tac-toe' }); save(); goHome(); syncCanvas();
  };
  /* G-HOOK end */
  /* G-HOOK start: devFirstRun */
  Object.assign(dev, {
    resetFirstRun() { P.signedIn = false; P.username = ''; P.onboarded = false; P.profile = freshPersist().profile; P.themePicked = false; P.themePref = 'system'; P.setup = null; save(); closeAllSheets(true); applyTheme(); goHome(); if (W.ESOnboard) W.ESOnboard.welcome(); },
    forceTaken(on) { if (W.ESOnboard) W.ESOnboard.forceTaken(!!on); },
    setFavourites(list) { P.profile = Object.assign({}, P.profile, { favourites: (Array.isArray(list) ? list : []).filter((s) => !!Data.game(s)) }); save(); refreshAll(); },
    openWelcome() { closeAllSheets(true); if (W.ESOnboard) W.ESOnboard.welcome(); },
    openSetup() { closeAllSheets(true); if (W.ESOnboard) W.ESOnboard.setup(); },
    openThemePick() { closeAllSheets(true); if (W.ESOnboard) W.ESOnboard.themePick(); },
    setDesktop(on) { if (W.ESOnboard) W.ESOnboard.setDesktop(!!on); }
  });
  /* G-HOOK end */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(document.getElementById('phone')));
  else boot(document.getElementById('phone'));
})();
