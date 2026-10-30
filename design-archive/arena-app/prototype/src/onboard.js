/* =====================================================================
   eSlams Arena app prototype  |  src/onboard.js  [agent G, polish W]  |  window.ESOnboard
   ---------------------------------------------------------------------
   The first-run journey (FINAL_POLISH_BRIEF sections 1 to 5):
     Welcome      the only signed-out screen: mark, wordmark, tagline and
                  ONE button (Play Against AI) over the weightless field
     Auth         a full page (ESAuth.build, src/auth.js) over the same field,
                  one step deeper; the account decides the route
     Profile setup  one page, one step deeper again: handle, visibility,
                  then optional bio, location and favourite games
     Theme pick   once, after setup: Follow system plus six looks
   One world: Welcome, Auth and Profile setup share one .ob-layer shell that
   holds the .ob-world (ESScene, src/scene.js) and the shared .ob-brand. The
   screens swap as .ob-pane children inside it and the scene moves "forward"
   (setDepth 0, 1, 2). The shell, and the scene with it, is destroyed at Pick
   a look or on close(). Without ESScene the world is a plain --bg plane;
   without ESAuth, auth() falls back to app.js's sheet (ESApp.openAuth).
   Theme rule (brief 2): until a theme is picked, the three world screens
   show Classic Light or Classic Dark by the OS scheme only.

   Public surface
     ESOnboard.welcome(opts)      opts.cold: first paint carries the entry choreography
     ESOnboard.auth(opts)         opts { expired, oauthError, onAuthed(info) }; legacy string step ignored
     ESOnboard.setup()            Profile setup
     ESOnboard.themePick()        Theme pick
     ESOnboard.close()            remove the layer (and the world), reveal Home
     ESOnboard.applyTheme(id)     'system'|'light'|'dark'|'neon'|'club'|'arcade'|'midnight'
     ESOnboard.generateHandle(rand?)  '<adjective>-<piece>-<nn>'
     ESOnboard.validateHandle(s)  null | the specific message (brief 5.2)
     ESOnboard.matchPlaces(q, n)  location type-ahead (bundled list, no network)
     ESOnboard.forceTaken(bool)   next submit answers 409 username_taken once
     ESOnboard.setDesktop(bool)   #phone becomes a 1024 x 720 desktop frame
     ESOnboard.attach(phone)      called by app.js boot (G-HOOK bootRoute)
     ESOnboard.state()            QA snapshot { screen, theme, themePref, desktop, scene, authStep, ... }

   Uses app.js only through: ESApp.profile, ESApp.firstRun, ESApp.openAuth (fallback),
   ESApp.onProfileComplete, ESApp.dev.setTheme, ESApp.dev.setSignedIn, ESApp.state.
   Tokens only; every class is prefixed .ob- (plus the .ap-wm[data-ink] tint).
   ===================================================================== */
(function () {
  'use strict';
  const W = window;
  const OB = {};
  W.ESOnboard = OB;

  /* ------------------------------------------------------------------
     Constants and copy (brief section 8)
     ------------------------------------------------------------------ */
  const WORLD = ['welcome', 'auth', 'setup'];
  const DEPTH = { welcome: 0, auth: 1, setup: 2 };
  const THEMES = [
    { id: 'light', name: 'Classic Light', desc: 'The calm instrument, daylit.' },
    { id: 'dark', name: 'Classic Dark', desc: 'The calm instrument.' },
    { id: 'neon', name: 'Neon', desc: 'Glass and cold cathode.' },
    { id: 'club', name: 'Club', desc: 'Wood, felt, and brass.' },
    { id: 'arcade', name: 'Arcade', desc: 'Phosphor plane, accent glow.' },
    { id: 'midnight', name: 'Midnight', desc: 'The board floats; motion carries it.' }
  ];
  const MATERIAL = ['neon', 'club', 'arcade', 'midnight'];
  const DARKISH = ['dark', 'neon', 'arcade', 'midnight'];
  const ALL_PREFS = ['system', 'light', 'dark', 'neon', 'club', 'arcade', 'midnight'];
  const C = {
    tagline: 'Here, AI plays games.',
    /* Title Case on purpose: the one deliberate exception to the app's
       sentence-case rule (brief 3.2, open item 10.5). Chosen over the
       fallbacks because it names the product in three words: you play,
       the opponent is an AI. */
    play: 'Play Against AI',
    offline: 'Back online to sign in',
    setupTitle: "You're almost in.",
    pickHandle: 'Pick your handle',
    newHandle: 'New handle',
    handleShort: (n) => 'Needs at least 3 characters. ' + n + ' more.',
    handleLong: (n) => "32 characters max. You're " + n + ' over.',
    handleChars: (list) => 'Only lowercase letters, digits and hyphens. Remove ' + list,
    handleHyphen: "Can't start or end with a hyphen.",
    handleReserved: 'That handle is reserved.',
    handleTaken: 'That handle is taken. Here is a new one.',
    whoCanSee: 'Who can see your profile?',
    pub: 'Public', pubDesc: 'Anyone can view it',
    priv: 'Private', privDesc: 'Approved followers only',
    optional: 'Optional',
    bio: 'Bio', bioPlaceholder: 'Chess at lunch, Hex at night.',
    location: 'Location', locationPlaceholder: 'City or country',
    favourites: 'Favourite games',
    showAll: (n) => 'Show all ' + n + ' games',
    showFewer: 'Show fewer',
    create: 'Create account', creating: 'Creating your account…',
    createFailed: "Couldn't create your account. Try again.",
    lookTitle: 'Pick a look.',
    lookSub: 'Six looks. Same boards. Change it any time in Settings.',
    followSystem: 'Follow system',
    followSystemHint: 'Classic Light or Classic Dark with your phone.',
    cont: 'Continue'
  };

  /* Handle vocabulary: calm adjectives x game words x a two-digit number */
  const ADJECTIVES = ['quiet', 'calm', 'lucky', 'patient', 'steady', 'gentle', 'mellow', 'careful', 'curious', 'clever',
    'humble', 'silent', 'still', 'easy', 'kind', 'sly', 'swift', 'wise', 'plain', 'polite', 'modest', 'keen', 'brisk',
    'sunny', 'cool', 'tidy', 'bright', 'nimble', 'subtle', 'lucid', 'placid', 'serene', 'spare', 'true', 'warm', 'witty'];
  const PIECES = ['rook', 'pawn', 'knight', 'bishop', 'queen', 'king', 'stone', 'disc', 'hex', 'dice', 'dealer', 'gambit',
    'fork', 'tempo', 'castle', 'tile', 'token', 'pip', 'ace', 'joker', 'trump', 'bluff', 'komi', 'atari', 'ply',
    'opening', 'endgame', 'meld', 'trick', 'pot', 'blind', 'river', 'flop', 'ko', 'hermit', 'mill', 'seed'];
  const RESERVED = ['admin', 'administrator', 'root', 'system', 'support', 'help', 'api', 'www', 'mail', 'eslams', 'e-slams',
    'arena', 'battlefield', 'stadium', 'grand-slams', 'settings', 'login', 'logout', 'signin', 'signup', 'sign-in', 'sign-up',
    'register', 'account', 'profile', 'about', 'terms', 'privacy', 'legal', 'security', 'status', 'staff', 'moderator',
    'official', 'team', 'null', 'undefined', 'anonymous', 'guest', 'me', 'you', 'play', 'watch', 'replay', 'matches',
    'models', 'leaderboard', 'onboarding', 'dashboard', 'static', 'assets', 'cdn', 'auth', 'oauth', 'callback'];

  /* Location type-ahead: a bundled list of countries and major cities (no
     network, nothing leaves the device until Create account; brief 7.0b). */
  const COUNTRIES = ('Afghanistan|Albania|Algeria|Andorra|Angola|Argentina|Armenia|Australia|Austria|Azerbaijan|Bahamas|Bahrain|' +
    'Bangladesh|Barbados|Belarus|Belgium|Belize|Benin|Bhutan|Bolivia|Bosnia and Herzegovina|Botswana|Brazil|Brunei|Bulgaria|' +
    'Burkina Faso|Burundi|Cambodia|Cameroon|Canada|Cape Verde|Chad|Chile|China|Colombia|Costa Rica|Croatia|Cuba|Cyprus|Czechia|' +
    'Denmark|Djibouti|Dominican Republic|Ecuador|Egypt|El Salvador|Estonia|Eswatini|Ethiopia|Fiji|Finland|France|Gabon|Gambia|' +
    'Georgia|Germany|Ghana|Greece|Guatemala|Guinea|Guyana|Haiti|Honduras|Hong Kong|Hungary|Iceland|India|Indonesia|Iran|Iraq|' +
    'Ireland|Israel|Italy|Ivory Coast|Jamaica|Japan|Jordan|Kazakhstan|Kenya|Kosovo|Kuwait|Kyrgyzstan|Laos|Latvia|Lebanon|' +
    'Lesotho|Liberia|Libya|Liechtenstein|Lithuania|Luxembourg|Madagascar|Malawi|Malaysia|Maldives|Mali|Malta|Mauritania|' +
    'Mauritius|Mexico|Moldova|Monaco|Mongolia|Montenegro|Morocco|Mozambique|Myanmar|Namibia|Nepal|Netherlands|New Zealand|' +
    'Nicaragua|Niger|Nigeria|North Macedonia|Norway|Oman|Pakistan|Panama|Papua New Guinea|Paraguay|Peru|Philippines|Poland|' +
    'Portugal|Puerto Rico|Qatar|Romania|Rwanda|Saudi Arabia|Senegal|Serbia|Singapore|Slovakia|Slovenia|Somalia|South Africa|' +
    'South Korea|Spain|Sri Lanka|Sudan|Suriname|Sweden|Switzerland|Taiwan|Tajikistan|Tanzania|Thailand|Togo|' +
    'Trinidad and Tobago|Tunisia|Turkey|Turkmenistan|Uganda|Ukraine|United Arab Emirates|United Kingdom|United States|' +
    'Uruguay|Uzbekistan|Venezuela|Vietnam|Yemen|Zambia|Zimbabwe').split('|');
  const CITIES = ('London/United Kingdom|Manchester/United Kingdom|Birmingham/United Kingdom|Edinburgh/United Kingdom|' +
    'Glasgow/United Kingdom|Leeds/United Kingdom|Bristol/United Kingdom|Cardiff/United Kingdom|Belfast/United Kingdom|' +
    'Liverpool/United Kingdom|Cambridge/United Kingdom|Oxford/United Kingdom|Dublin/Ireland|Paris/France|Lyon/France|' +
    'Marseille/France|Berlin/Germany|Munich/Germany|Hamburg/Germany|Frankfurt/Germany|Cologne/Germany|Amsterdam/Netherlands|' +
    'Rotterdam/Netherlands|Brussels/Belgium|Antwerp/Belgium|Luxembourg/Luxembourg|Zurich/Switzerland|Geneva/Switzerland|' +
    'Vienna/Austria|Prague/Czechia|Warsaw/Poland|Krakow/Poland|Budapest/Hungary|Bucharest/Romania|Sofia/Bulgaria|' +
    'Athens/Greece|Istanbul/Turkey|Ankara/Turkey|Rome/Italy|Milan/Italy|Naples/Italy|Turin/Italy|Madrid/Spain|' +
    'Barcelona/Spain|Valencia/Spain|Seville/Spain|Lisbon/Portugal|Porto/Portugal|Copenhagen/Denmark|Stockholm/Sweden|' +
    'Gothenburg/Sweden|Oslo/Norway|Helsinki/Finland|Reykjavik/Iceland|Tallinn/Estonia|Riga/Latvia|Vilnius/Lithuania|' +
    'Kyiv/Ukraine|Belgrade/Serbia|Zagreb/Croatia|Ljubljana/Slovenia|New York/United States|Los Angeles/United States|' +
    'San Francisco/United States|Seattle/United States|Chicago/United States|Boston/United States|Austin/United States|' +
    'Washington/United States|Miami/United States|Denver/United States|Atlanta/United States|Philadelphia/United States|' +
    'Houston/United States|Dallas/United States|Portland/United States|San Diego/United States|Pittsburgh/United States|' +
    'Toronto/Canada|Montreal/Canada|Vancouver/Canada|Ottawa/Canada|Calgary/Canada|Mexico City/Mexico|Guadalajara/Mexico|' +
    'Bogota/Colombia|Medellin/Colombia|Lima/Peru|Santiago/Chile|Buenos Aires/Argentina|Sao Paulo/Brazil|' +
    'Rio de Janeiro/Brazil|Montevideo/Uruguay|Quito/Ecuador|Caracas/Venezuela|Havana/Cuba|Kingston/Jamaica|' +
    'Lagos/Nigeria|Abuja/Nigeria|Accra/Ghana|Nairobi/Kenya|Kampala/Uganda|Kigali/Rwanda|Addis Ababa/Ethiopia|' +
    'Dar es Salaam/Tanzania|Johannesburg/South Africa|Cape Town/South Africa|Cairo/Egypt|Casablanca/Morocco|Tunis/Tunisia|' +
    'Dakar/Senegal|Dubai/United Arab Emirates|Abu Dhabi/United Arab Emirates|Doha/Qatar|Riyadh/Saudi Arabia|' +
    'Tel Aviv/Israel|Amman/Jordan|Beirut/Lebanon|Tehran/Iran|Karachi/Pakistan|Lahore/Pakistan|Mumbai/India|Delhi/India|' +
    'Bengaluru/India|Hyderabad/India|Chennai/India|Pune/India|Kolkata/India|Dhaka/Bangladesh|Colombo/Sri Lanka|' +
    'Kathmandu/Nepal|Singapore/Singapore|Kuala Lumpur/Malaysia|Bangkok/Thailand|Jakarta/Indonesia|Manila/Philippines|' +
    'Ho Chi Minh City/Vietnam|Hanoi/Vietnam|Hong Kong/Hong Kong|Taipei/Taiwan|Shanghai/China|Beijing/China|Shenzhen/China|' +
    'Hangzhou/China|Seoul/South Korea|Busan/South Korea|Tokyo/Japan|Osaka/Japan|Kyoto/Japan|Sydney/Australia|' +
    'Melbourne/Australia|Brisbane/Australia|Perth/Australia|Auckland/New Zealand|Wellington/New Zealand').split('|');
  const PLACES = COUNTRIES.map((c) => ({ label: c, key: c.toLowerCase() }))
    .concat(CITIES.map((s) => { const p = s.split('/'); return { label: p[0] + ', ' + p[1], key: p[0].toLowerCase(), alt: p[1].toLowerCase() }; }));

  /* ------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------ */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach((p) => el.style.setProperty(p, v[p]));
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    kids.flat(4).forEach((c) => { if (c == null || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  }
  function icon(name, size) {
    let m = '';
    try { m = W.ESA && W.ESA.icon ? W.ESA.icon(name, size || 20) : ''; } catch (e) { m = ''; }
    return h('span', { class: 'ob-ic', 'aria-hidden': 'true', html: m });
  }
  function warn(where, e) { try { console.warn('[ESOnboard] ' + where + ': ' + (e && e.message ? e.message : e)); } catch (x) { /* none */ } }
  function safe(fn, fallback, where) { try { return fn(); } catch (e) { warn(where || 'call', e); return fallback; } }
  function reduced() {
    if (document.documentElement.classList.contains('reduced-motion')) return true;
    try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function app() { return W.ESApp || null; }
  function appState() { return safe(() => W.ESApp.state(), null, 'ESApp.state') || {}; }
  function game(slug) { return safe(() => W.ESD.games[slug], null, 'ESD.games') || null; }
  function phoneGames() {
    const order = safe(() => W.ESD.gameOrder, null, 'ESD.gameOrder') || [];
    return order.filter((s) => { const g = game(s); return g && !g.mobileExcluded; });
  }
  function mainGames() {
    /* the thirteen main_arena games lead gameOrder (data.js MARQUEE_GAMES) */
    const all = phoneGames();
    const marquee = safe(() => W.ESD.arenas.filter((a) => a.marquee).length, 0, 'ESD.arenas');
    return all.slice(0, marquee ? Math.min(13, all.length) : all.length);
  }

  /* ------------------------------------------------------------------
     Themes: six looks on #phone. app.js's own setter knows system, light
     and dark; the four fixed skins are applied here and re-asserted when
     app.js re-applies its resolved theme.
     ------------------------------------------------------------------ */
  const st = {
    phone: null, layer: null, screen: null, cleanup: null, attached: false,
    taken: false, desktop: false, mo: null, markQueued: false,
    shell: null, world: null, brand: null, pane: null, scene: null, net: null
  };
  function storedPref() {
    const fr = safe(() => W.ESApp.firstRun, null, 'ESApp.firstRun');
    const p = fr && fr.themePref;
    return ALL_PREFS.indexOf(p) >= 0 ? p : 'system';
  }
  function osDark() { try { return W.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } }
  function resolvedTheme(pref) {
    pref = pref || storedPref();
    if (pref === 'system') return osDark() ? 'dark' : 'light';
    return pref;
  }
  /* leaving the world screens: hand the theme back to the stored pref */
  function restoreTheme() {
    const ph = phoneEl();
    const a = app();
    if (a && a.dev && typeof a.dev.setTheme === 'function') safe(() => a.dev.setTheme(storedPref()), null, 'dev.setTheme');
    else if (ph) ph.setAttribute('data-theme', resolvedTheme());
    assertTheme();
    fixMarks();
  }
  function phoneEl() { return st.phone || document.getElementById('phone'); }
  /* Theme rule (brief 2): before any theme is picked, the world screens are
     Classic Light or Classic Dark by the OS scheme, whatever the stored pref. */
  function forcedTheme() {
    if (WORLD.indexOf(st.screen) < 0) return null;
    const fr = safe(() => W.ESApp.firstRun, null, 'ESApp.firstRun');
    if (fr && fr.themePicked) return null;
    return osDark() ? 'dark' : 'light';
  }
  function assertTheme() {
    const ph = phoneEl();
    if (!ph) return;
    const forced = forcedTheme();
    if (forced) {
      if (ph.getAttribute('data-theme') !== forced) ph.setAttribute('data-theme', forced);
      return;
    }
    const pref = storedPref();
    if (MATERIAL.indexOf(pref) < 0) return;
    if (ph.getAttribute('data-theme') !== pref) ph.setAttribute('data-theme', pref);
    if (ph.getAttribute('data-theme-pref') !== pref) ph.setAttribute('data-theme-pref', pref);
  }
  /* Wordmark polarity by scheme, and the --mark-ink tint on the Home header
     in the material themes (brief 6.2; the Classic pair never re-tints). */
  function fixMarks() {
    st.markQueued = false;
    const ph = phoneEl();
    if (!ph || !W.ESA) return;
    const th = ph.getAttribute('data-theme') || resolvedTheme();
    const material = MATERIAL.indexOf(th) >= 0;
    if (material) {
      const src = DARKISH.indexOf(th) >= 0 ? W.ESA.wordmarkDark : W.ESA.wordmarkLight;
      ph.querySelectorAll('img[data-wordmark]').forEach((im) => { if (im.getAttribute('src') !== src) im.setAttribute('src', src); });
    }
    ph.querySelectorAll('.ap-hdr .ap-wm, [data-ob-ink] .ap-wm').forEach((wm) => {
      const im = wm.querySelector('img[data-wordmark]');
      if (material && im) {
        if (wm.getAttribute('data-ink') !== '1') wm.setAttribute('data-ink', '1');
        wm.style.setProperty('--wm-src', 'url("' + im.getAttribute('src') + '")');
      } else if (wm.hasAttribute('data-ink')) {
        wm.removeAttribute('data-ink');
        wm.style.removeProperty('--wm-src');
      }
    });
  }
  function queueMarks() {
    if (st.markQueued) return;
    st.markQueued = true;
    requestAnimationFrame(fixMarks);
  }
  function syncCanvasButtons() {
    const pref = storedPref();
    document.querySelectorAll('[data-ob-theme]').forEach((b) => {
      const id = b.getAttribute('data-ob-theme');
      const on = id === pref || (pref === 'system' && id === 'system');
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-ob-desktop]').forEach((b) => { b.checked = !!st.desktop; });
  }
  /* applyTheme(id): instant, no transition, persisted as themePref. */
  function applyTheme(id) {
    const pref = ALL_PREFS.indexOf(id) >= 0 ? id : 'system';
    const a = app();
    if (!a) return pref;
    safe(() => a.dev.setTheme(pref), null, 'dev.setTheme');
    if (storedPref() !== pref) {
      /* an app.js whose setter only knows system, light and dark: persist and apply here */
      safe(() => { a.firstRun = { themePref: pref }; }, null, 'firstRun.themePref');
    }
    assertTheme();
    fixMarks();
    syncCanvasButtons();
    return pref;
  }
  function attach(phone) {
    st.phone = phone || document.getElementById('phone');
    if (!st.phone || st.attached) { assertTheme(); return; }
    st.attached = true;
    assertTheme();
    try {
      st.mo = new MutationObserver((list) => {
        let themeTouched = false;
        for (const m of list) if (m.type === 'attributes' && m.target === st.phone) themeTouched = true;
        if (themeTouched) {
          assertTheme();
          if (st.scene) safe(() => st.scene.refreshTokens(), null, 'scene.refreshTokens');
        }
        queueMarks();
      });
      st.mo.observe(st.phone, { attributes: true, attributeFilter: ['data-theme'], childList: true, subtree: true });
    } catch (e) { warn('observer', e); }
    try {
      const mq = W.matchMedia('(prefers-color-scheme: dark)');
      const on = () => { assertTheme(); refreshThemeTiles(); };
      if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
    } catch (e) { /* no matchMedia */ }
    fixMarks();
    bindCanvas();
  }

  /* ------------------------------------------------------------------
     The onboarding layer: one screen at a time, above Home, below sheets.
     World screens (Welcome, Auth, Setup) live as panes in one shell that
     keeps the scene alive; any other screen (Pick a look) gets its own
     plain layer and the shell (with the scene) is torn down.
     ------------------------------------------------------------------ */
  function insertLayer(layer) {
    const ph = phoneEl();
    const root = ph.querySelector('.ap-root') || ph;
    const sheets = root.querySelector('.sh-layer');
    if (sheets && sheets.parentNode === root) root.insertBefore(layer, sheets); else root.appendChild(layer);
  }
  function teardownWorld(layer, ms) {
    const scene = st.scene;
    st.scene = null; st.shell = null; st.world = null; st.brand = null; st.pane = null;
    if (st.net) { W.removeEventListener('online', st.net); W.removeEventListener('offline', st.net); st.net = null; }
    if (st.netTimer) { clearInterval(st.netTimer); st.netTimer = null; }
    setTimeout(() => {
      if (scene) safe(() => scene.destroy(), null, 'scene.destroy');
      if (layer) layer.remove();
    }, ms || 0);
  }
  /* Quiet rects (world coords) where copy and controls live; the scene keeps
     pieces out of them. Per pane: Welcome = brand + [data-ob-quiet];
     Auth = the content column (title through legal) + brand; Setup = the
     scroller's visible content column + the footer. Polled by the scene. */
  function unionRect(els, clip) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    els.forEach((e) => {
      if (!e || !e.isConnected) return;
      const q = e.getBoundingClientRect();
      if (!q.width || !q.height) return;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    });
    if (clip) { l = Math.max(l, clip.left); t = Math.max(t, clip.top); r = Math.min(r, clip.right); b = Math.min(b, clip.bottom); }
    return r > l && b > t ? { left: l, top: t, right: r, bottom: b } : null;
  }
  function toWorld(q, base) {
    const x = q.left - base.left, y = q.top - base.top, w = q.right - q.left, hh = q.bottom - q.top;
    return typeof DOMRect === 'function' ? new DOMRect(x, y, w, hh) : { x, y, left: x, top: y, width: w, height: hh, right: x + w, bottom: y + hh };
  }
  function quietRects() {
    if (!st.world || !st.shell) return [];
    const base = st.world.getBoundingClientRect();
    const pane = st.pane;
    const name = pane ? pane.getAttribute('data-ob-pane') : null;
    const boxes = [];
    const one = (e) => { const u = unionRect([e]); if (u) boxes.push(u); };
    if (name === 'auth') {
      one(st.brand);
      const scr = Array.from(pane.querySelectorAll('.au-screen')).filter((e) => e.offsetParent !== null && !e.hidden);
      const host = scr.length ? scr[scr.length - 1] : pane;
      const col = unionRect(Array.from(host.querySelectorAll('.au-title, .au-sub, .au-btn, .au-div, .au-form, .au-input, .au-primary, .au-wait, .au-err, .au-note, .au-info, .au-legal')), pane.getBoundingClientRect());
      if (col) boxes.push(col);
      placeScrim(pane, col);
    } else if (name === 'setup') {
      const sc = pane.querySelector('.ob-setup-scroll');
      const col = sc ? unionRect([pane.querySelector('.ob-setup-head'), pane.querySelector('.ob-setup-cols')], sc.getBoundingClientRect()) : null;
      if (col) boxes.push(col);
      one(pane.querySelector('.ob-setup-foot'));
    } else {
      one(st.brand);
      if (pane) pane.querySelectorAll('[data-ob-quiet]').forEach(one);
    }
    return boxes.map((q) => toWorld(q, base));
  }
  /* Auth: a light scrim behind the content column only, margins stay vivid */
  function placeScrim(pane, col) {
    const sc = pane.querySelector(':scope > .ob-scrim');
    if (!sc) return;
    if (!col) { sc.style.display = 'none'; return; }
    const pr = pane.getBoundingClientRect();
    const pad = 12;
    sc.style.display = '';
    sc.style.left = (col.left - pr.left - pad) + 'px';
    sc.style.top = (col.top - pr.top - pad) + 'px';
    sc.style.width = (col.right - col.left + pad * 2) + 'px';
    sc.style.height = (col.bottom - col.top + pad * 2) + 'px';
  }
  function ensureShell(depth, cold) {
    if (st.shell && st.shell.isConnected) return st.shell;
    const ph = phoneEl();
    if (!ph) return null;
    if (!st.attached) attach(ph);
    /* any plain layer (Pick a look) goes; the shell takes its place */
    if (st.layer) {
      const old = st.layer;
      if (st.cleanup) safe(st.cleanup, null, 'layer.cleanup');
      st.cleanup = null;
      if (reduced()) old.remove(); else { old.classList.add('is-leave'); setTimeout(() => old.remove(), 240); }
    }
    const shell = h('div', { class: 'ob-layer ob-shell' + (cold && !reduced() ? ' is-cold' : '') });
    const world = h('div', { class: 'ob-world', 'aria-hidden': 'true' });
    const brand = h('div', { class: 'ob-brand', role: 'img', 'aria-label': 'eSlams' }, markEl(52), wordmarkText(30));
    shell.append(world, brand);
    insertLayer(shell);
    Object.assign(st, { shell, world, brand, layer: shell, pane: null });
    if (W.ESScene && typeof W.ESScene.mount === 'function') {
      st.scene = safe(() => W.ESScene.mount(world, { depth: depth || 0, still: reduced(), quiet: quietRects }), null, 'ESScene.mount');
    } else st.scene = null;   /* fallback: the shell's own --bg plane */
    return shell;
  }
  /* showPane: swap the screen inside the shell; the scene moves to this depth */
  function showPane(name, el, cleanup, opts) {
    opts = opts || {};
    const prevScreen = st.screen;
    st.screen = name;          /* first, so the theme rule sees the world screen */
    assertTheme();
    const shell = ensureShell(DEPTH[name], opts.cold);
    if (!shell) { st.screen = prevScreen; return null; }
    const still = reduced();
    const old = st.pane;
    const oldCleanup = st.cleanup;
    const scrim = name === 'auth' || name === 'setup' ? h('div', { class: 'ob-scrim ob-scrim--' + name, 'aria-hidden': 'true' }) : null;
    const pane = h('div', { class: 'ob-pane' + (old && !still ? ' is-enter' : ''), 'data-ob-pane': name }, scrim, el);
    shell.appendChild(pane);
    shell.setAttribute('data-ob-screen', name);
    st.pane = pane; st.cleanup = cleanup || null;
    if (oldCleanup) safe(oldCleanup, null, 'pane.cleanup');
    const ms = still ? 150 : 700;
    if (st.scene && prevScreen !== name) safe(() => st.scene.setDepth(DEPTH[name], ms), null, 'scene.setDepth');
    if (name === 'auth') {
      /* the scrim follows the column on resize, scroll and step changes (cheap rect reads) */
      const tick = () => { if (st.pane !== pane || !pane.isConnected) return; quietRects(); setTimeout(tick, 400); };
      requestAnimationFrame(tick);
    }
    if (old) {
      old.classList.add('is-out');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      if (!still) requestAnimationFrame(() => requestAnimationFrame(() => pane.classList.add('is-in')));
      setTimeout(() => old.remove(), ms);
    }
    fixMarks();
    return pane;
  }
  function openLayer(name, el, cleanup) {
    const ph = phoneEl();
    if (!ph) return null;
    if (!st.attached) attach(ph);
    const old = st.layer;
    const oldCleanup = st.cleanup;
    const wasShell = !!(old && old === st.shell);
    const layer = h('div', { class: 'ob-layer' + (old && !reduced() ? ' is-enter' : ''), 'data-ob-screen': name });
    layer.appendChild(el);
    insertLayer(layer);
    st.layer = layer; st.screen = name; st.cleanup = cleanup || null;
    if (oldCleanup) safe(oldCleanup, null, 'layer.cleanup');
    if (wasShell) teardownWorld(old, reduced() ? 0 : 260);
    else if (old) {
      if (reduced()) old.remove();
      else setTimeout(() => old.remove(), 240);
    }
    if (old && !reduced()) requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('is-in')));
    restoreTheme();
    return layer;
  }
  function close() {
    const layer = st.layer;
    if (!layer) return;
    if (st.cleanup) safe(st.cleanup, null, 'layer.cleanup');
    const wasShell = layer === st.shell;
    st.layer = null; st.screen = null; st.cleanup = null;
    restoreTheme();
    if (!reduced()) layer.classList.add('is-leave');
    if (wasShell) teardownWorld(layer, reduced() ? 0 : 240);
    else if (reduced()) layer.remove();
    else setTimeout(() => layer.remove(), 240);
  }

  /* Brand mark: brand blue in Classic; one flat --mark-ink in the four
     material themes, masked from the same PNG (CSS does the switch). */
  function markEl(size) {
    const src = safe(() => W.ESA.mark, '', 'ESA.mark');
    const el = h('span', { class: 'ob-mark', style: { '--ob-mark-src': 'url("' + src + '")', '--ob-mark-size': (size || 56) + 'px' } });
    if (src) el.appendChild(h('img', { src, alt: '', draggable: 'false' }));
    return el;
  }
  /* Wordmark text, polarity by theme (both PNGs present, CSS shows one). */
  function wordmarkText(height) {
    const box = h('span', { class: 'ob-wm', style: { '--wm-h': (height || 30) + 'px' } });
    const l = safe(() => W.ESA.wordmarkLight, '', 'ESA.wordmarkLight');
    const d = safe(() => W.ESA.wordmarkDark, '', 'ESA.wordmarkDark');
    if (l) box.appendChild(h('img', { class: 'ob-wm-l', src: l, alt: '', draggable: 'false' }));
    if (d) box.appendChild(h('img', { class: 'ob-wm-d', src: d, alt: '', draggable: 'false' }));
    if (!l && !d) box.appendChild(h('span', { class: 'ob-wm-txt' }, 'eslams'));
    return box;
  }

  /* ------------------------------------------------------------------
     1. Welcome (brief 3): the shared brand, the tagline, one button. The
     field is the world behind it. Entry (< 1.2 s, a tap skips it): the
     field is already drifting, the mark settles, the wordmark and tagline
     fade in, the button rises last.
     ------------------------------------------------------------------ */
  function isOffline() { return !!(appState().dev && appState().dev.offline); }
  function welcome(opts) {
    opts = opts || {};
    const offline = isOffline();
    const el = h('section', { class: 'ob-wel', 'aria-label': 'Welcome to eSlams' });
    const title = h('h1', { class: 'ob-wel-title', 'data-ob-quiet': '' }, C.tagline);
    const go = h('button', { type: 'button', class: 'ap-btn ap-btn--primary ob-wel-go', 'data-ob-quiet': '', disabled: offline, onclick: () => auth() }, offline ? C.offline : C.play);
    el.append(h('div', { class: 'ob-wel-copy' },
      h('div', { class: 'ob-wel-top' }, h('div', { class: 'ob-wel-slot', 'aria-hidden': 'true' }), title),
      h('div', { class: 'ob-wel-foot' }, go)));
    const fresh = !(st.shell && st.shell.isConnected);
    if (!showPane('welcome', el, null, { cold: !!opts.cold })) return el;
    if (fresh && opts.cold && !reduced()) {
      const shell = st.shell;
      const settle = () => { if (shell) shell.classList.add('is-settled'); };
      shell.addEventListener('pointerdown', settle, { once: true, capture: true });
      setTimeout(settle, 1200);
    }
    if (!st.net) {
      st.net = () => setTimeout(() => {
        const b = st.shell && st.shell.querySelector('.ob-pane:not(.is-out) .ob-wel-go');
        if (!b) return;
        const off = isOffline();
        b.disabled = off;
        b.textContent = off ? C.offline : C.play;
      }, 30);
      W.addEventListener('online', st.net);
      W.addEventListener('offline', st.net);
      /* the canvas Offline toggle flips ESApp.state().dev.offline without a browser event: poll it while the world is up */
      st.netTimer = setInterval(() => { if (!st.shell) { clearInterval(st.netTimer); st.netTimer = null; return; } st.net(); }, 500);
    }
    return el;
  }

  /* ------------------------------------------------------------------
     2. Authentication (brief 4): a full page from ESAuth over the world,
     one step deeper. ESOnboard.auth(opts):
       opts.expired     the "sign-in expired" line (app.js expired session)
       opts.oauthError  one quiet line
       opts.onAuthed(info)  replaces the default route after sign-in
     Default route: profile incomplete -> setup(); else signed in, then
     Pick a look (once) or Home. Without ESAuth: app.js's sheet.
     ------------------------------------------------------------------ */
  function routeAfterAuth(opts, info) {
    const a = app();
    if (!a) return;
    if (opts && typeof opts.onAuthed === 'function') {
      safe(() => a.dev.setSignedIn(true), null, 'dev.setSignedIn');
      close();
      safe(() => opts.onAuthed(info || {}), null, 'auth.onAuthed');
      return;
    }
    const p = a.profile || {};
    if (!p.complete) { setup(); return; }
    safe(() => a.dev.setSignedIn(true), null, 'dev.setSignedIn');   /* re-renders Home signed in */
    const fr = a.firstRun || {};
    if (!fr.themePicked) themePick(); else close();
  }
  function auth(opts) {
    opts = opts && typeof opts === 'object' ? opts : {};   /* a legacy 'create' | 'signin' string is ignored */
    const A = W.ESAuth;
    const page = A && typeof A.build === 'function' ? safe(() => A.build({
      onBack: () => welcome(),
      onAuthed: (info) => routeAfterAuth(opts, info),
      expired: !!opts.expired,
      oauthError: opts.oauthError || null,
      reduced,
      appState: () => appState()
    }), null, 'ESAuth.build') : null;
    if (page) { showPane('auth', page, null); return page; }
    const a = app();
    if (!a || typeof a.openAuth !== 'function') { warn('auth', 'ESAuth and ESApp.openAuth missing'); return null; }
    a.openAuth('signin', () => routeAfterAuth(opts));
    return null;
  }

  /* ------------------------------------------------------------------
     Handles: '<adjective>-<piece>-<nn>', lowercase, hyphenated, 3 to 32
     ------------------------------------------------------------------ */
  function reservedList() {
    const d = safe(() => W.ESD.reservedHandles || W.ESD.reserved || W.ESD.reservedUsernames, null, 'ESD.reserved');
    return Array.isArray(d) && d.length ? d.concat(RESERVED) : RESERVED;
  }
  /* '"_"', '"_" and "."', '"_", "." and "!"' */
  function quoteList(chars) {
    const q = chars.map((c) => '"' + c + '"');
    return q.length < 2 ? q.join('') : q.slice(0, -1).join(', ') + ' and ' + q[q.length - 1];
  }
  /* The platform's rules (3 to 32, ^[a-z0-9][a-z0-9-]*[a-z0-9]$, reserved
     words), each failure with its own specific message (brief 5.2). */
  function validateHandle(s) {
    s = String(s || '');
    const bad = [];
    Array.from(s).forEach((ch) => { if (!/[a-z0-9-]/.test(ch) && bad.indexOf(ch) < 0) bad.push(ch); });
    if (bad.length) return C.handleChars(quoteList(bad));
    if (s.length < 3) return C.handleShort(3 - s.length);
    if (s.length > 32) return C.handleLong(s.length - 32);
    if (s[0] === '-' || s[s.length - 1] === '-') return C.handleHyphen;
    if (reservedList().indexOf(s) >= 0) return C.handleReserved;
    return null;
  }
  function generateHandle(rand) {
    const r = typeof rand === 'function' ? rand : Math.random;
    for (let tries = 0; tries < 20; tries++) {
      const a = ADJECTIVES[Math.floor(r() * ADJECTIVES.length)];
      let p = PIECES[Math.floor(r() * PIECES.length)];
      if (p === a) p = 'rook';
      const n = 10 + Math.floor(r() * 90);
      const out = a + '-' + p + '-' + n;
      if (!validateHandle(out)) return out;
    }
    return 'quiet-rook-42';
  }
  function cleanHandleInput(v) {
    /* forgiving: uppercase lowercased and spaces made hyphens, silently; any other
       character stays so the error can name it; capped at 40 so 'over' can count */
    return String(v || '').toLowerCase().replace(/\s/g, '-').slice(0, 40);
  }
  function matchPlaces(q, limit) {
    q = String(q || '').trim().toLowerCase();
    if (q.length < 1) return [];
    const starts = [];
    const inner = [];
    for (const p of PLACES) {
      if (p.key.indexOf(q) === 0 || p.label.toLowerCase().indexOf(q) === 0) starts.push(p);
      else if (p.label.toLowerCase().indexOf(q) > 0) inner.push(p);
    }
    return starts.concat(inner).slice(0, limit || 6).map((p) => p.label);
  }

  /* ------------------------------------------------------------------
     3. Profile setup (brief 7.0b): one page, required first, optional below
     ------------------------------------------------------------------ */
  function gameTile(slug, order, onToggle) {
    const g = game(slug);
    if (!g) return null;
    const on = order > 0;
    /* the one game-card system (brief 7.11): agent H's compact card when ESApp.ui is live */
    const ui = safe(() => W.ESApp.ui, null, 'ESApp.ui');
    if (ui && typeof ui.gameCard === 'function') {
      const card = safe(() => ui.gameCard(slug, 'compact', { selected: on, order: on ? order : null, onOpen: onToggle }), null, 'ESApp.ui.gameCard');
      if (card) { card.classList.add('ob-gcard'); return card; }
    }
    const glyph = safe(() => W.ESB.glyph(slug, 20), null, 'ESB.glyph');
    const cls = 'ob-gtile' + (on ? ' is-on' : '');
    const label = g.name + (on ? ', selected, favourite ' + order : '');
    return h('button', { type: 'button', class: cls, 'aria-pressed': on ? 'true' : 'false', 'aria-label': label, 'data-slug': slug, onclick: () => onToggle(slug) },
      h('span', { class: 'ob-gtile-glyph' }, glyph),
      h('span', { class: 'ob-gtile-txt' },
        h('span', { class: 'ob-gtile-name' }, g.name),
        h('span', { class: 'ob-gtile-table mono' }, g.tableLabel || '')),
      on ? h('span', { class: 'ob-gtile-badge mono', 'aria-hidden': 'true' }, String(order)) : null,
      on ? h('span', { class: 'ob-gtile-check', 'aria-hidden': 'true' }, icon('check', 12)) : null);
  }
  /* Agent H's shared compact game card, when its styles are loaded. */
  function hasSharedCompactCard() {
    if (OB._compact != null) return OB._compact;
    let found = false;
    try {
      for (const sh of Array.from(document.styleSheets)) {
        let rules = null;
        try { rules = sh.cssRules; } catch (e) { rules = null; }
        if (!rules) continue;
        for (const r of Array.from(rules)) { if (r.selectorText && r.selectorText.indexOf('.ap-gcard-compact') >= 0) { found = true; break; } }
        if (found) break;
      }
    } catch (e) { found = false; }
    OB._compact = found;
    return found;
  }

  function setup() {
    const a = app();
    const prior = (a && a.profile) || {};
    const s = {
      /* a new account gets a generated handle; 'player-1' is app.js's placeholder, not a choice */
      handle: prior.handle && prior.handle !== 'player-1' && !validateHandle(prior.handle) ? prior.handle : generateHandle(),
      visibility: prior.visibility === 'private' ? 'private' : 'public',
      bio: prior.bio || '', location: prior.location || '',
      favourites: Array.isArray(prior.favourites) ? prior.favourites.filter((x) => !!game(x)) : [],
      showAll: false, msg: null, msgTone: 'hint', busy: false, failed: false
    };
    const el = h('section', { class: 'ob-setup', 'aria-label': 'Profile setup' });
    const scroller = h('div', { class: 'ob-setup-scroll' });
    const cols = h('div', { class: 'ob-setup-cols' });

    /* required: handle */
    const handleInput = h('input', { type: 'text', class: 'ob-input ob-handle-input mono', value: s.handle, autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false', maxlength: '40', required: true, 'aria-required': 'true', 'aria-label': C.pickHandle, 'aria-describedby': 'ob-handle-line' });
    const shuffle = h('button', { type: 'button', class: 'ob-shuffle', 'aria-label': C.newHandle, title: C.newHandle, onclick: () => { s.handle = generateHandle(); s.msg = null; handleInput.value = s.handle; syncHandle(); handleInput.focus(); } }, icon('shuffle', 18));
    /* one slot: the preview eslams.com/<handle>, or the error that replaces it */
    const line = h('p', { class: 'ob-handle-line mono', id: 'ob-handle-line', 'aria-live': 'polite' });
    handleInput.addEventListener('input', () => {
      const clean = cleanHandleInput(handleInput.value);
      if (clean !== handleInput.value) { const pos = handleInput.selectionStart; handleInput.value = clean; try { handleInput.setSelectionRange(pos, pos); } catch (e) { /* none */ } }
      s.handle = clean; s.msg = null; s.failed = false;
      syncHandle();
    });
    const handleBlock = h('div', { class: 'ob-field' },
      h('label', { class: 'ob-label', for: 'ob-handle' }, C.pickHandle),
      h('div', { class: 'ob-handle-row' }, handleInput, shuffle), line);
    handleInput.id = 'ob-handle';

    /* required: visibility */
    const visBtns = [['public', C.pub, C.pubDesc], ['private', C.priv, C.privDesc]].map((o) =>
      h('button', { type: 'button', role: 'radio', class: 'ob-vis', 'data-vis': o[0], onclick: () => { s.visibility = o[0]; syncVis(); } },
        h('span', { class: 'ob-vis-name' }, o[1]), h('span', { class: 'ob-vis-desc' }, o[2])));
    const visGroup = h('div', { class: 'ob-vis-row', role: 'radiogroup', 'aria-label': C.whoCanSee, 'aria-required': 'true' }, visBtns);
    visGroup.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      s.visibility = s.visibility === 'public' ? 'private' : 'public';
      syncVis();
      const on = visGroup.querySelector('[data-vis="' + s.visibility + '"]');
      if (on) on.focus();
    });
    const visBlock = h('div', { class: 'ob-field' }, h('p', { class: 'ob-label' }, C.whoCanSee), visGroup);

    /* optional: bio, location, favourite games */
    const bio = h('textarea', { class: 'ob-input ob-bio', rows: '2', maxlength: '160', placeholder: C.bioPlaceholder, 'aria-label': C.bio, 'aria-describedby': 'ob-bio-count' });
    bio.value = s.bio;
    const bioCount = h('span', { class: 'ob-count mono', id: 'ob-bio-count' });
    const syncBio = () => { bioCount.textContent = s.bio.length + '/160'; };
    bio.addEventListener('input', () => { s.bio = bio.value.slice(0, 160); syncBio(); });
    syncBio();
    const bioBlock = h('div', { class: 'ob-field' }, h('div', { class: 'ob-label-row' }, h('label', { class: 'ob-label', for: 'ob-bio' }, C.bio), bioCount), bio);
    bio.id = 'ob-bio';

    const loc = h('input', { type: 'text', class: 'ob-input ob-loc', id: 'ob-loc', value: s.location, placeholder: C.locationPlaceholder, autocomplete: 'off', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'ob-loc-list', 'aria-label': C.location });
    const list = h('ul', { class: 'ob-loc-list', id: 'ob-loc-list', role: 'listbox', 'aria-label': C.location, hidden: true });
    let active = -1;
    const pick = (label) => { s.location = label; loc.value = label; hideList(); };
    const hideList = () => { list.hidden = true; loc.setAttribute('aria-expanded', 'false'); loc.removeAttribute('aria-activedescendant'); active = -1; };
    const showList = () => {
      const items = matchPlaces(loc.value, 6);
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!items.length || (items.length === 1 && items[0].toLowerCase() === loc.value.trim().toLowerCase())) { hideList(); return; }
      items.forEach((label, i) => list.appendChild(h('li', { role: 'option', id: 'ob-loc-' + i, class: 'ob-loc-opt', 'aria-selected': 'false', onpointerdown: (e) => { e.preventDefault(); pick(label); } }, label)));
      list.hidden = false;
      loc.setAttribute('aria-expanded', 'true');
      active = -1;
      /* the field sits low on the phone: bring the suggestions above the sticky footer */
      requestAnimationFrame(() => { if (!list.hidden) safe(() => list.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }), null, 'loc.scroll'); });
    };
    const mark = () => {
      Array.from(list.children).forEach((li, i) => { li.setAttribute('aria-selected', i === active ? 'true' : 'false'); li.classList.toggle('is-active', i === active); });
      if (active >= 0) loc.setAttribute('aria-activedescendant', 'ob-loc-' + active); else loc.removeAttribute('aria-activedescendant');
    };
    loc.addEventListener('input', () => { s.location = loc.value; showList(); });
    loc.addEventListener('keydown', (e) => {
      if (list.hidden) return;
      const n = list.children.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % n; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + n) % n; mark(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(list.children[active].textContent); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideList(); }
    });
    loc.addEventListener('blur', () => setTimeout(hideList, 120));
    const locBlock = h('div', { class: 'ob-field ob-field-loc' }, h('label', { class: 'ob-label', for: 'ob-loc' }, C.location), h('div', { class: 'ob-loc-wrap' }, loc, list));

    const grid = h('div', { class: 'ob-ggrid' });
    const moreBtn = h('button', { type: 'button', class: 'ob-more', onclick: () => { s.showAll = !s.showAll; renderGrid(); } });
    const toggleFav = (slug) => {
      const i = s.favourites.indexOf(slug);
      if (i >= 0) s.favourites.splice(i, 1); else s.favourites.push(slug);
      renderGrid(slug);
    };
    function renderGrid(focusSlug) {
      const all = phoneGames();
      const main = mainGames();
      const shown = s.showAll ? all : main.concat(s.favourites.filter((x) => main.indexOf(x) < 0 && all.indexOf(x) >= 0));
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      shown.forEach((slug) => { const t = gameTile(slug, s.favourites.indexOf(slug) + 1, toggleFav); if (t) grid.appendChild(t); });
      moreBtn.hidden = all.length <= main.length;
      moreBtn.textContent = s.showAll ? C.showFewer : C.showAll(all.length);
      if (focusSlug) { const f = grid.querySelector('[data-slug="' + focusSlug + '"]'); if (f) f.focus({ preventScroll: true }); }
    }
    renderGrid();
    const favBlock = h('div', { class: 'ob-field ob-field-fav' },
      h('p', { class: 'ob-label' }, C.favourites), grid, moreBtn);

    /* footer: Create account, sticky in the thumb zone */
    const submit = h('button', { type: 'submit', class: 'ap-btn ap-btn--primary ob-submit' }, C.create);
    const footErr = h('p', { class: 'ob-foot-err', role: 'alert' });
    const foot = h('div', { class: 'ob-setup-foot' }, footErr, submit);

    function syncHandle() {
      const err = validateHandle(s.handle);
      while (line.firstChild) line.removeChild(line.firstChild);
      if (err) {
        /* keep 'Remove "_" and "."' together so it never splits mid-list */
        const k = err.indexOf(' Remove ');
        if (k > 0) line.append(err.slice(0, k + 1), h('span', { class: 'ob-handle-rm' }, err.slice(k + 1)));
        else line.textContent = err;
        line.className = 'ob-handle-line is-bad';
      }
      else if (s.msg) { line.textContent = s.msg; line.className = 'ob-handle-line is-' + s.msgTone; }
      else {
        line.className = 'ob-handle-line mono';
        line.append(h('span', { class: 'ob-handle-dom' }, 'eslams.com/'), h('span', { class: 'ob-handle-h' }, s.handle));
      }
      handleInput.setAttribute('aria-invalid', err ? 'true' : 'false');
      syncSubmit();
    }
    function syncVis() {
      visBtns.forEach((b) => { const on = b.getAttribute('data-vis') === s.visibility; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
      syncSubmit();
    }
    function syncSubmit() {
      const ok = !validateHandle(s.handle) && (s.visibility === 'public' || s.visibility === 'private');
      submit.disabled = !ok || s.busy;
      submit.textContent = s.busy ? C.creating : C.create;
      footErr.textContent = s.failed ? C.createFailed : '';
      footErr.hidden = !s.failed;
    }

    const form = h('form', { class: 'ob-setup-form', novalidate: true, onsubmit: (e) => {
      e.preventDefault();
      if (s.busy || validateHandle(s.handle)) { syncHandle(); return; }
      s.busy = true; s.failed = false; s.msg = null; syncSubmit();
      setTimeout(() => {
        if (!el.isConnected) return;
        s.busy = false;
        if (st.taken) {                                  /* simulated 409 username_taken */
          st.taken = false;
          s.handle = generateHandle();
          handleInput.value = s.handle;
          s.msg = C.handleTaken; s.msgTone = 'warn';
          syncHandle();
          handleInput.focus();
          return;
        }
        const profile = { handle: s.handle, visibility: s.visibility, bio: s.bio.trim(), location: s.location.trim(), favourites: s.favourites.slice(), complete: true };
        const ok = safe(() => { app().onProfileComplete(profile); return true; }, false, 'onProfileComplete');
        if (!ok) { s.failed = true; syncSubmit(); return; }
        themePick();
      }, reduced() ? 60 : 650);
    } });

    const head = h('header', { class: 'ob-setup-head' },
      h('h1', { class: 'ob-setup-title' }, C.setupTitle));
    const colA = h('div', { class: 'ob-col ob-col-a' }, handleBlock, visBlock,
      h('div', { class: 'ob-optional' }, h('p', { class: 'ob-eyebrow mono' }, C.optional), bioBlock, locBlock));
    const colB = h('div', { class: 'ob-col ob-col-b' }, h('p', { class: 'ob-eyebrow mono ob-eyebrow-b' }, C.optional), favBlock);
    cols.append(colA, colB);
    scroller.append(head, cols);
    form.append(scroller, foot);
    el.appendChild(form);
    syncHandle();
    syncVis();
    showPane('setup', el, null);
    return el;
  }

  /* ------------------------------------------------------------------
     4. Theme tiles (Theme pick and, through H, Settings > Appearance)
     The same legal, unfinished, threat-free Connect Four position in every
     tile, static, so tiles differ only by theme (theme-picker-spec.md 3).
     ------------------------------------------------------------------ */
  const TILE_VIEW = {
    family: 'connect_four', rows: 6, cols: 7, lastMove: { r: 3, c: 3 }, winLine: null,
    cells: [['', '', '', '', '', '', ''], ['', '', '', '', '', '', ''], ['', '', '', '', '', '', ''],
      ['', '', '', 'R', '', 'R', ''], ['', '', 'Y', 'Y', 'R', 'Y', ''], ['', 'R', 'Y', 'Y', 'R', 'R', '']]
  };
  const tileGrids = [];
  function refreshThemeTiles() {
    for (let i = tileGrids.length - 1; i >= 0; i--) {
      if (!tileGrids[i].root.isConnected) { tileGrids[i].destroy(); continue; }
      tileGrids[i].refresh();
    }
  }
  function themeTiles(container, opts) {
    opts = opts || {};
    if (!container) return null;
    const ctl = { root: null, boards: [], refresh: null, destroy: null };
    const root = h('div', { class: 'ob-th' + (opts.mode === 'settings' ? ' ob-th--settings' : ''), role: 'radiogroup', 'aria-label': 'Appearance' });
    const opt = (id, child, label, hint) => {
      const b = h('button', { type: 'button', role: 'radio', class: 'ob-th-opt ' + (id === 'system' ? 'ob-th-follow' : 'ob-th-tile'), 'data-pref': id, 'aria-label': label, title: hint || null }, child,
        h('span', { class: 'ob-th-check', 'aria-hidden': 'true' }, icon('check', 12)));
      b.addEventListener('click', () => choose(id));
      return b;
    };
    const follow = opt('system', h('span', { class: 'ob-th-follow-in' }, icon('system', 20),
      h('span', { class: 'ob-th-follow-txt' }, h('span', { class: 'ob-th-follow-t' }, C.followSystem), h('span', { class: 'ob-th-follow-s' }, C.followSystemHint))), C.followSystem + '. ' + C.followSystemHint);
    const grid = h('div', { class: 'ob-th-grid' });
    THEMES.forEach((t) => {
      const host = h('span', { class: 'ob-th-board', 'aria-hidden': 'true' });
      const skin = h('span', { class: 'es-theme ob-th-skin', 'data-theme': t.id }, host, h('span', { class: 'ob-th-name' }, t.name));
      grid.appendChild(opt(t.id, skin, t.name + ' theme', t.desc));
      const b = safe(() => W.ESB.render(host, { family: 'connect_four', view: TILE_VIEW, size: 'poster', interactive: false, legal: [], lastMove: TILE_VIEW.lastMove, reveal: true, reducedMotion: true }), null, 'ESB.render tile');
      if (b) ctl.boards.push(b);
    });
    root.append(follow, grid);
    const all = () => Array.from(root.querySelectorAll('.ob-th-opt'));
    ctl.refresh = () => {
      const pref = storedPref();
      all().forEach((b) => { const on = b.getAttribute('data-pref') === pref; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    };
    function choose(id) {
      applyTheme(id);
      ctl.refresh();
      refreshThemeTiles();
      if (typeof opts.onChange === 'function') safe(() => opts.onChange(id), null, 'themeTiles.onChange');
    }
    root.addEventListener('keydown', (e) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!keys[e.key]) return;
      e.preventDefault();
      const list = all();
      const cur = list.findIndex((b) => b.classList.contains('is-on'));
      const next = list[(Math.max(0, cur) + keys[e.key] + list.length) % list.length];
      choose(next.getAttribute('data-pref'));
      next.focus();
    });
    ctl.destroy = () => {
      ctl.boards.forEach((b) => safe(() => b.destroy(), null, 'tile.destroy'));
      ctl.boards = [];
      const k = tileGrids.indexOf(ctl);
      if (k >= 0) tileGrids.splice(k, 1);
    };
    ctl.root = root;
    container.appendChild(root);
    ctl.refresh();
    tileGrids.push(ctl);
    return ctl;
  }

  function themePick() {
    const el = h('section', { class: 'ob-look', 'aria-label': 'Theme pick' });
    const body = h('div', { class: 'ob-look-scroll' },
      h('header', { class: 'ob-look-head' }, h('h1', { class: 'ob-look-title' }, C.lookTitle), h('p', { class: 'ob-look-sub' }, C.lookSub)));
    const tiles = themeTiles(body, { mode: 'firstrun' });
    const cont = h('button', { type: 'button', class: 'ap-btn ap-btn--primary ob-look-go', onclick: () => {
      const a = app();
      safe(() => { a.firstRun = { themePref: storedPref(), themePicked: true }; }, null, 'firstRun.themePicked');
      close();
    } }, C.cont);
    el.append(body, h('div', { class: 'ob-look-foot' }, cont));
    openLayer('themepick', el, () => { if (tiles) setTimeout(() => tiles.destroy(), 260); });
    return el;
  }

  /* ------------------------------------------------------------------
     5. Desktop frame (canvas): #phone becomes 1024 x 720 so Welcome and
     Profile setup show their two-column layouts.
     ------------------------------------------------------------------ */
  function setDesktop(on) {
    st.desktop = !!on;
    const ph = phoneEl();
    if (ph) ph.classList.toggle('ob-desktop', st.desktop);
    const dev = ph && ph.closest('.cv-device');
    if (dev) dev.classList.toggle('ob-desktop', st.desktop);
    const col = ph && ph.closest('.cv-device-col');
    if (col) col.classList.toggle('ob-desktop', st.desktop);
    const note = document.querySelector('.cv-device-note');
    if (note) {
      if (!note.hasAttribute('data-ob-orig')) note.setAttribute('data-ob-orig', note.textContent);
      note.textContent = st.desktop ? 'Desktop · 1024 × 720 · first-run screens in two columns' : note.getAttribute('data-ob-orig');
    }
    syncCanvasButtons();
    return st.desktop;
  }

  /* Canvas Controls: the six theme buttons, Desktop, and first-run jumps */
  function bindCanvas() {
    document.querySelectorAll('[data-ob-theme]').forEach((b) => {
      if (b.__ob) return;
      b.__ob = true;
      b.addEventListener('click', () => applyTheme(b.getAttribute('data-ob-theme')));
    });
    document.querySelectorAll('[data-ob-desktop]').forEach((b) => {
      if (b.__ob) return;
      b.__ob = true;
      b.addEventListener('change', () => setDesktop(b.checked));
    });
    document.querySelectorAll('[data-ob-open]').forEach((b) => {
      if (b.__ob) return;
      b.__ob = true;
      b.addEventListener('click', () => {
        const a = app();
        const k = b.getAttribute('data-ob-open');
        const fn = { welcome: 'openWelcome', setup: 'openSetup', themepick: 'openThemePick', reset: 'resetFirstRun' }[k];
        if (a && a.dev && fn && a.dev[fn]) safe(() => a.dev[fn](), null, 'canvas.' + k);
      });
    });
    syncCanvasButtons();
  }

  function stateSnapshot() {
    const ph = phoneEl();
    return {
      screen: st.screen, layer: !!(st.layer && st.layer.isConnected), theme: ph ? ph.getAttribute('data-theme') : null,
      themePref: storedPref(), desktop: st.desktop, taken: st.taken, compactCard: hasSharedCompactCard(),
      world: !!(st.shell && st.shell.isConnected),
      scene: st.scene ? safe(() => st.scene.stats(), null, 'scene.stats') : null,
      authStep: W.ESAuth && typeof W.ESAuth.state === 'function' ? safe(() => W.ESAuth.state().step, null, 'ESAuth.state') : null
    };
  }

  Object.assign(OB, {
    welcome, auth, setup, themePick, close, applyTheme, themeTiles, generateHandle, validateHandle, matchPlaces,
    attach, setDesktop, state: stateSnapshot, themes: THEMES.map((t) => Object.assign({}, t)),
    forceTaken(on) { st.taken = !!on; return st.taken; },
    resolvedTheme: () => resolvedTheme()
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindCanvas);
  else bindCanvas();
})();
