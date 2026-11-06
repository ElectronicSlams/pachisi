/* =====================================================================
   eSlams Arena app prototype  |  src/boards-grid.js  [C1]  |  window.ESB
   ---------------------------------------------------------------------
   Defines window.ESB (CONTRACT section 5): the render dispatcher, the
   family registry, shared helpers and the grid families
   (grid_3x3, connect_four, square_board, go_board, hex_board).
   boards-table.js [C2] loads after this file and registers the
   table/panel/custom families into the same registry.

   Registry API
     ESB.registerFamily(name, { mount(host, props) -> { update(props), destroy() } })
       host  = a fresh <div class="bd-host bd-size-{size}"> appended to the
               element passed to ESB.render (already sized by the size class).
       props = CONTRACT section 5 props, untouched.
     ESB.render(el, props) -> { update(props), destroy() }
       Empties el, looks up families[props.family || props.view.family],
       mounts it; unknown family -> an honest .bd-unsupported panel.
       update() with a different family remounts; same family -> impl.update.
   Helpers
     ESB.providerTile(model|modelId, size=34) -> HTMLElement
     ESB.youTile(size=34) -> HTMLElement
     ESB.glyph(arenaId|gameSlug|'g_*'|{glyph}, size=22) -> HTMLElement (size = icon px)
     ESB.card({rank,suit}|{hidden:true}, {faceUp=true, size='md'|px}) -> HTMLElement
     ESB.motion  { move, drop, reveal, revealFast, result, ease }
     ESB.reducedMotion(props?) -> bool
   Shared toolkit for family authors (ESB.util): h, s, clear, key, rm,
     markLast(svgLayer, shape, props), seatOf, cellsSet, tapLayer helpers.
   Optional ViewState fields read beyond the contract (all optional):
     square_board: kind ('chess'|'othello'|'checkers'|'battleship'),
       fleet [{r,c}] (your ships), incoming [{r,c,hit}] (shots at you),
       shots[].by ('you'|'model') when one array carries both grids, or
       shots {you, model} with sunk {you, model} (the scripted record's shape).
     grid_3x3 ultimate: lastMove may be global {r,c} (0..8) or {board,r,c}.
   ===================================================================== */
(function () {
  'use strict';

  var W = typeof window !== 'undefined' ? window : globalThis;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function warnOnce(key, msg) {
    warnOnce.seen = warnOnce.seen || {};
    if (warnOnce.seen[key]) return;
    warnOnce.seen[key] = 1;
    try { console.warn('[ESB] ' + msg); } catch (e) { /* no console */ }
  }
  function esa() { return W.ESA || null; }
  function esd() { return W.ESD || null; }
  function tryf(fn, fb) { try { var v = fn(); return v == null ? fb : v; } catch (e) { return fb; } }

  /* ---------- DOM helpers ---------- */
  function h(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'style') n.style.cssText = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    return n;
  }
  function s(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'cls') n.setAttribute('class', attrs[k]);
      else if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function key(r, c) { return r + ',' + c; }
  function cellsSet(list) {
    var o = {};
    (list || []).forEach(function (p) { if (p) o[key(p.r, p.c)] = p; });
    return o;
  }
  function seatOf(props) { return (props && props.youSeat) || 'p1'; }

  /* ---------- motion ---------- */
  var motion = { move: 220, drop: 320, reveal: 300, revealFast: 180, result: 520, ease: 'cubic-bezier(.2,.8,.2,1)' };
  function reducedMotion(props) {
    if (props && props.reducedMotion) return true;
    try {
      if (document.documentElement.classList.contains('reduced-motion')) return true;
      if (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    } catch (e) { /* ignore */ }
    return false;
  }
  function ms(props, v) { return reducedMotion(props) ? 0 : v; }
  /* remove a node after its exit animation (or now under reduced motion) */
  function rm(node, props, delay) {
    if (!node || !node.parentNode) return;
    var d = ms(props, delay == null ? motion.move : delay);
    if (!d) { node.parentNode.removeChild(node); return; }
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, d + 30);
  }

  /* ---------- last-move marker: arrive -> one ring pulse -> thin outline ----------
     shape: {rect:[x,y,w,h,rx]} | {circle:[cx,cy,r]} | {path:'d'}. Exactly one per host. */
  function markLast(layer, shape, props, opts) {
    if (!layer) return null;
    var host = layer.closest ? (layer.closest('.bd-host') || layer) : layer;
    var old = host.querySelectorAll('.bd-last');
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    if (!shape) return null;
    var g = s('g', { cls: 'bd-last' + (opts && opts.cls ? ' ' + opts.cls : '') });
    var delay = opts && opts.delay != null ? opts.delay : motion.move;
    g.style.setProperty('--bd-arrive', ms(props, delay) + 'ms');
    function shp(cls) {
      if (shape.rect) { var r = shape.rect; return s('rect', { cls: cls, x: r[0], y: r[1], width: r[2], height: r[3], rx: r[4] || 0 }, g); }
      if (shape.circle) { var c = shape.circle; return s('circle', { cls: cls, cx: c[0], cy: c[1], r: c[2] }, g); }
      return s('path', { cls: cls, d: shape.path }, g);
    }
    shp('bd-last-line');
    shp('bd-last-ring');
    layer.appendChild(g);
    return g;
  }

  /* ---------- registry + dispatcher ---------- */
  var families = {};
  function registerFamily(name, impl) {
    if (!name || !impl || typeof impl.mount !== 'function') { warnOnce('reg:' + name, 'registerFamily("' + name + '") needs { mount }.'); return; }
    families[name] = impl;
  }
  var FAMILY_LABEL = {
    grid_3x3: 'Grid', connect_four: 'Connect Four', square_board: 'Square board', go_board: 'Go board',
    hex_board: 'Hex board', card_table: 'Card table', dice_table: 'Dice table', payoff_matrix: 'Payoff matrix',
    auction_panel: 'Auction panel', economic_panel: 'Economic panel', custom: 'Custom board'
  };
  function sizeOf(props) {
    var z = props && props.size;
    return (z === 'preview' || z === 'poster' || z === 'share') ? z : 'stage';
  }
  function makeHost(el, props) {
    var host = h('div', 'bd-host bd-size-' + sizeOf(props) + (props && props.reducedMotion ? ' bd-rm' : '') +
      (props && props.interactive ? ' bd-interactive' : ''));
    el.appendChild(host);
    return host;
  }
  function unsupported(host, fam, why) {
    clear(host);
    var p = h('div', 'bd-unsupported', { role: 'note' });
    p.appendChild(h('div', 'bd-unsupported-k', { text: (FAMILY_LABEL[fam] || fam || 'Board') }));
    p.appendChild(h('div', 'bd-unsupported-t', { text: why || 'This board is not drawn in the prototype yet.' }));
    host.appendChild(p);
    return { update: function () {}, destroy: function () { clear(host); } };
  }
  function famOf(props) { return (props && (props.family || (props.view && props.view.family))) || ''; }

  function render(el, props) {
    props = props || {};
    clear(el);
    var fam = famOf(props);
    var host = makeHost(el, props);
    var ctrl = mountInto(host, fam, props);
    var api = {
      update: function (next) {
        next = next || {};
        var nf = famOf(next);
        host.className = 'bd-host bd-size-' + sizeOf(next) + (next.reducedMotion ? ' bd-rm' : '') + (next.interactive ? ' bd-interactive' : '');
        if (nf !== fam) {
          try { ctrl.destroy(); } catch (e) { /* ignore */ }
          clear(host); fam = nf; ctrl = mountInto(host, fam, next); return;
        }
        try { ctrl.update(next); } catch (e) {
          warnOnce('upd:' + fam + ':' + (e && e.message), 'update failed for ' + fam + ': ' + (e && e.message));
          try { ctrl.destroy(); } catch (x) { /* ignore */ }
          clear(host); ctrl = mountInto(host, fam, next);
        }
      },
      destroy: function () { try { ctrl.destroy(); } catch (e) { /* ignore */ } clear(el); },
      host: host
    };
    return api;
  }
  function mountInto(host, fam, props) {
    var impl = families[fam];
    if (!impl) return unsupported(host, fam, fam ? 'This board is not drawn in the prototype yet.' : 'No board family was given.');
    try {
      var c = impl.mount(host, props) || {};
      return { update: c.update || function () {}, destroy: c.destroy || function () { clear(host); } };
    } catch (e) {
      try { console.error('[ESB] mount failed for ' + fam, e); } catch (x) { /* no console */ }
      return unsupported(host, fam, 'This board could not be drawn.');
    }
  }

  /* ---------- identity helpers ---------- */
  function px(n, d) { n = Number(n); return isFinite(n) && n > 0 ? n : d; }
  function initials(name) {
    var w = String(name || '').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
  }
  function resolveModel(model) {
    if (model && typeof model === 'object') return model;
    var D = esd();
    var m = tryf(function () { return D && D.modelById ? D.modelById(model) : null; }, null);
    if (m) return m;
    var id = String(model || '');
    return { id: id, provider: id.split('/')[0] || id, publicName: id.split('/').pop() };
  }
  function providerTile(model, size) {
    size = px(size, 34);
    var m = resolveModel(model);
    var slug = m.provider || (m.id ? String(m.id).split('/')[0] : '');
    var A = esa(), D = esd();
    var kind = tryf(function () { return A && A.providerKind ? A.providerKind(slug) : null; }, null);
    var logo = kind ? tryf(function () { return A.providerLogo(slug); }, null) : null;
    var hue = tryf(function () { return D && D.providerHue ? D.providerHue(slug) : 250; }, 250);
    var tile = h('span', 'bd-ptile', {
      role: 'img', 'aria-label': (m.providerName || slug || 'Model') + ' logo',
      style: 'width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * 0.28) + 'px;--bd-tint:oklch(0.46 0.16 ' + hue + ');'
    });
    if (logo && kind === 'badge') {
      tile.classList.add('bd-ptile-badge');
      var b = h('span', 'bd-ptile-mark', { html: logo, style: 'width:' + Math.round(size * 0.8) + 'px;height:' + Math.round(size * 0.8) + 'px' });
      tile.appendChild(b);
    } else if (logo) {
      tile.classList.add('bd-ptile-glyph');
      tile.appendChild(h('span', 'bd-ptile-mark', { html: logo, style: 'width:' + Math.round(size * 0.58) + 'px;height:' + Math.round(size * 0.58) + 'px' }));
    } else {
      tile.classList.add('bd-ptile-initials');
      tile.appendChild(h('span', 'bd-ptile-txt', { text: initials(m.providerName || slug || m.publicName), style: 'font-size:' + Math.max(9, Math.round(size * 0.36)) + 'px' }));
    }
    return tile;
  }
  function youTile(size) {
    size = px(size, 34);
    return h('span', 'bd-you', {
      role: 'img', 'aria-label': 'You', text: 'You',
      style: 'width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * 0.28) + 'px;font-size:' + Math.max(9, Math.round(size * 0.33)) + 'px'
    });
  }
  function glyphName(x) {
    var D = esd();
    if (x && typeof x === 'object') {
      if (x.glyph) return x.glyph;
      x = x.arena || x.id || x.slug;
    }
    x = String(x || '');
    if (/^g_/.test(x)) return x;
    var a = tryf(function () { return D.arenaById(x); }, null) || tryf(function () { return D.arenaOf(x); }, null);
    if (a && a.glyph) return a.glyph;
    var g = tryf(function () { return D.games[x]; }, null);
    var byFam = { grid_3x3: 'g_ttt', connect_four: 'g_c4', square_board: 'g_board', go_board: 'g_go', hex_board: 'g_hex',
      card_table: 'g_card', dice_table: 'g_dice', payoff_matrix: 'g_social', auction_panel: 'g_social', economic_panel: 'g_social', custom: 'g_board' };
    return (g && byFam[g.family]) || 'g_board';
  }
  function glyph(arenaOrGame, size) {
    size = px(size, 22);
    var A = esa();
    var name = glyphName(arenaOrGame);
    var mark = tryf(function () { return A.icon(name, size); }, '') || tryf(function () { return A.icons[name]; }, '');
    var t = Math.round(size * 1.8);
    return h('span', 'bd-glyph', { html: mark, 'aria-hidden': 'true',
      style: 'width:' + t + 'px;height:' + t + 'px;border-radius:' + Math.round(t * 0.27) + 'px' });
  }

  /* ---------- flat card ---------- */
  var SUITS = { s: '♠', h: '♥', d: '♦', c: '♣' };
  function suitKey(v) {
    v = String(v == null ? '' : v);
    if (v === SUITS.s) return 's'; if (v === SUITS.h) return 'h'; if (v === SUITS.d) return 'd'; if (v === SUITS.c) return 'c';
    var l = v.toLowerCase()[0];
    return SUITS[l] ? l : '';
  }
  function rankText(r) {
    r = String(r == null ? '' : r).toUpperCase();
    if (r === 'T') return '10';
    if (r === '1' || r === 'ACE') return 'A';
    if (r === 'KING') return 'K'; if (r === 'QUEEN') return 'Q'; if (r === 'JACK') return 'J';
    return r;
  }
  var CARD_W = { xs: 26, sm: 34, md: 46, lg: 60 };
  function card(c, opts) {
    opts = opts || {};
    c = c || {};
    var w = typeof opts.size === 'number' ? opts.size : (CARD_W[opts.size] || CARD_W.md);
    var up = opts.faceUp !== false && !c.hidden && (c.rank != null || c.suit != null);
    var n = h('span', 'bd-card ' + (up ? 'bd-card-up' : 'bd-card-back'), { style: '--card-w:' + w + 'px' });
    if (!up) {
      n.setAttribute('role', 'img'); n.setAttribute('aria-label', 'Face-down card');
      n.appendChild(h('span', 'bd-card-inset'));
      return n;
    }
    var sk = suitKey(c.suit), rk = rankText(c.rank);
    var names = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
    if (sk === 'h' || sk === 'd') n.classList.add('bd-card-red');
    n.setAttribute('role', 'img');
    n.setAttribute('aria-label', (rk || '') + (sk ? ' of ' + names[sk] : ''));
    var corner = h('span', 'bd-card-corner');
    corner.appendChild(h('span', 'bd-card-rank', { text: rk }));
    if (sk) corner.appendChild(h('span', 'bd-card-csuit', { text: SUITS[sk] }));
    n.appendChild(corner);
    if (sk) n.appendChild(h('span', 'bd-card-suit', { text: SUITS[sk] }));
    return n;
  }

  /* ---------- export ---------- */
  var ESB = W.ESB && typeof W.ESB === 'object' ? W.ESB : {};
  ESB.families = ESB.families && typeof ESB.families === 'object' ? ESB.families : families;
  families = ESB.families;
  ESB.registerFamily = registerFamily;
  ESB.render = render;
  ESB.providerTile = providerTile;
  ESB.youTile = youTile;
  ESB.glyph = glyph;
  ESB.card = card;
  ESB.motion = motion;
  ESB.reducedMotion = reducedMotion;
  ESB.util = { h: h, s: s, clear: clear, key: key, cellsSet: cellsSet, seatOf: seatOf, ms: ms, rm: rm,
    markLast: markLast, warnOnce: warnOnce, tryf: tryf, initials: initials, SVGNS: SVGNS };
  W.ESB = ESB;
})();

/* ---------- shared SVG + input toolkit for the grid families ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util) return;
  var U = ESB.util, s = U.s, h = U.h;
  function svgRoot(host, vw, vh, label, cls) {
    var board = h('div', 'bd-board' + (cls ? ' ' + cls : ''));
    var svg = s('svg', { cls: 'bd-svg', viewBox: '0 0 ' + vw + ' ' + vh, role: 'img', 'aria-label': label || 'Board' });
    board.appendChild(svg); host.appendChild(board);
    return { board: board, svg: svg };
  }
  function layer(svg, cls) { return s('g', { cls: cls }, svg); }
  function fire(ctl, action) {
    if (!ctl || ctl.fired) return;
    ctl.fired = true;
    var f = ctl.props && ctl.props.onAction;
    if (typeof f === 'function') { try { f(action); } catch (e) { try { console.error('[ESB] onAction', e); } catch (x) { /* */ } } }
  }
  function hit(parent, x, y, w, hh, rx, label, onTap) {
    var r = s('rect', { cls: 'bd-hit', x: x, y: y, width: w, height: hh, rx: rx || 0, tabindex: '0', role: 'button', 'aria-label': label || 'Select' }, parent);
    r.addEventListener('click', function (e) { e.stopPropagation(); onTap(e); });
    r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(e); } });
    return r;
  }
  function pt(p) { return Array.isArray(p) ? { r: p[0], c: p[1] } : p; }
  function pts(list) {
    if (!list) return [];
    if (!Array.isArray(list) && Array.isArray(list.cells)) list = list.cells;
    return Array.isArray(list) ? list.map(pt).filter(function (p) { return p && p.r != null && p.c != null; }) : [];
  }
  /* the two points furthest apart: a line through every cell of a straight run */
  function extremes(xy) {
    var a = xy[0], b = xy[xy.length - 1], best = -1;
    for (var i = 0; i < xy.length; i++) for (var j = i + 1; j < xy.length; j++) {
      var d = Math.pow(xy[i][0] - xy[j][0], 2) + Math.pow(xy[i][1] - xy[j][1], 2);
      if (d > best) { best = d; a = xy[i]; b = xy[j]; }
    }
    return [a, b];
  }
  function winPath(xy, ext) {
    if (!xy.length) return '';
    var e = extremes(xy), dx = e[1][0] - e[0][0], dy = e[1][1] - e[0][1], len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len * (ext || 0), uy = dy / len * (ext || 0);
    return 'M' + (e[0][0] - ux).toFixed(2) + ' ' + (e[0][1] - uy).toFixed(2) + 'L' + (e[1][0] + ux).toFixed(2) + ' ' + (e[1][1] + uy).toFixed(2);
  }
  function sameJSON(a, b) { try { return JSON.stringify(a || null) === JSON.stringify(b || null); } catch (e) { return false; } }
  function lastOf(props) { var v = (props && props.view) || {}; return v.lastMove != null ? v.lastMove : (props && props.lastMove) || null; }
  U.svgRoot = svgRoot; U.layer = layer; U.fire = fire; U.hit = hit; U.pt = pt; U.pts = pts;
  U.winPath = winPath; U.sameJSON = sameJSON; U.lastOf = lastOf;
  U.tapCtl = function (props) { return { fired: false, props: props }; };
  U.legalOf = function (props) { return (props && props.interactive && Array.isArray(props.legal)) ? props.legal : []; };
})();

/* ---------- grid_3x3: Tic-Tac-Toe and Ultimate ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.svgRoot) return;
  var U = ESB.util, s = U.s;
  var VB = 300;

  function geom(ult) {
    var cells = {}, boards = [];
    if (!ult) {
      var g = 8, S = (VB - 2 * g) / 3;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) cells[r + ',' + c] = { x: c * (S + g), y: r * (S + g), S: S, rx: 14 };
      return { cells: cells, boards: boards, S: S, n: 3 };
    }
    var G = 12, L = (VB - 2 * G) / 3, gg = 3, s2 = (L - 2 * gg) / 3;
    for (var b = 0; b < 9; b++) {
      var bx = (b % 3) * (L + G), by = Math.floor(b / 3) * (L + G);
      boards.push({ x: bx, y: by, L: L });
      for (var lr = 0; lr < 3; lr++) for (var lc = 0; lc < 3; lc++) {
        var R = Math.floor(b / 3) * 3 + lr, C = (b % 3) * 3 + lc;
        cells[R + ',' + C] = { x: bx + lc * (s2 + gg), y: by + lr * (s2 + gg), S: s2, rx: 6, b: b };
      }
    }
    return { cells: cells, boards: boards, S: s2, n: 9 };
  }
  function valueAt(view, r, c) {
    var u = view.ultimate;
    if (u && Array.isArray(u.boards)) {
      var b = Math.floor(r / 3) * 3 + Math.floor(c / 3), bd = u.boards[b];
      var row = bd && bd[r % 3];
      return norm(row ? row[c % 3] : '');
    }
    var cr = view.cells && view.cells[r];
    return norm(cr ? cr[c] : '');
  }
  function norm(v) { v = String(v == null ? '' : v).toUpperCase(); return v === 'X' || v === 'O' ? v : ''; }
  function globalCell(m) {
    if (!m) return null;
    if (m.cell) m = m.cell;
    if (m.board != null || m.b != null) {
      var b = m.board != null ? m.board : m.b;
      return { r: Math.floor(b / 3) * 3 + m.r, c: (b % 3) * 3 + m.c };
    }
    return m.r != null ? { r: m.r, c: m.c } : null;
  }
  /* X and O: stroked content glyphs that write on */
  function glyph(parent, v, x, y, S, animate, big) {
    var g = s('g', { cls: 'bd-mark' + (big ? ' bd-bigmark' : '') }, parent);
    var sw = (big ? 0.07 : 0.085) * S, cls = 'bd-ink' + (animate ? ' bd-write' : '');
    if (v === 'X') {
      var p = S * 0.29;
      var a = s('path', { cls: cls, d: 'M' + (x + p) + ' ' + (y + p) + 'L' + (x + S - p) + ' ' + (y + S - p), pathLength: 1, 'stroke-width': sw }, g);
      var b = s('path', { cls: cls, d: 'M' + (x + S - p) + ' ' + (y + p) + 'L' + (x + p) + ' ' + (y + S - p), pathLength: 1, 'stroke-width': sw }, g);
      if (animate) {
        a.style.animationDuration = 'calc(var(--bd-move) * .55)';
        b.style.animationDuration = 'calc(var(--bd-move) * .55)';
        b.style.animationDelay = 'calc(var(--bd-move) * .45)';
      }
    } else if (v === 'O') {
      var cx = x + S / 2, cy = y + S / 2, r = S * 0.235;
      s('path', { cls: cls, d: 'M' + cx + ' ' + (cy - r) + 'a' + r + ' ' + r + ' 0 1 1 0 ' + 2 * r + 'a' + r + ' ' + r + ' 0 1 1 0 ' + -2 * r, pathLength: 1, 'stroke-width': sw }, g);
    }
    return g;
  }

  function mount(host, props) {
    var st = {};
    function build(view) {
      U.clear(host);
      st.ult = !!(view.ultimate && Array.isArray(view.ultimate.boards));
      st.G = geom(st.ult);
      var root = U.svgRoot(host, VB, VB, st.ult ? 'Ultimate Tic-Tac-Toe board' : 'Tic-Tac-Toe board', 'bd-g3' + (st.ult ? ' bd-g3-ult' : ''));
      st.svg = root.svg;
      st.lLift = U.layer(st.svg, 'bd-g3-lift');
      st.lCells = U.layer(st.svg, 'bd-g3-cells');
      st.lMarks = U.layer(st.svg, 'bd-g3-marks');
      st.lBig = U.layer(st.svg, 'bd-g3-big');
      st.lWin = U.layer(st.svg, 'bd-g3-win');
      st.lLast = U.layer(st.svg, 'bd-g3-last');
      st.lIn = U.layer(st.svg, 'bd-g3-input');
      st.cellG = {}; st.dots = {}; st.marks = {}; st.boardG = []; st.big = {};
      if (st.ult) st.G.boards.forEach(function (b, i) { st.boardG[i] = s('g', { cls: 'bd-g3-local' }, st.lCells); });
      Object.keys(st.G.cells).forEach(function (k) {
        var c = st.G.cells[k], par = st.ult ? st.boardG[c.b] : st.lCells;
        s('rect', { cls: 'bd-cell', x: c.x, y: c.y, width: c.S, height: c.S, rx: c.rx }, par);
        st.dots[k] = s('circle', { cls: 'bd-dot', cx: c.x + c.S / 2, cy: c.y + c.S / 2, r: Math.max(2, c.S * 0.045) }, par);
      });
      st.view = null; st.lastKey = null; st.winKey = null;
    }
    function apply(p, first) {
      var view = p.view || {};
      var animate = !first && !ESB.reducedMotion(p);
      var keys = Object.keys(st.G.cells), arrived = {};
      keys.forEach(function (k) {
        var rc = k.split(','), r = +rc[0], c = +rc[1], v = valueAt(view, r, c), cur = st.marks[k];
        if ((cur && cur.v) === v) return;
        if (cur) { cur.node.parentNode && cur.node.parentNode.removeChild(cur.node); delete st.marks[k]; }
        if (v) {
          var g = st.G.cells[k];
          st.marks[k] = { v: v, node: glyph(st.ult ? st.boardG[g.b] : st.lMarks, v, g.x, g.y, g.S, animate) };
          arrived[k] = 1;
        }
        st.dots[k].style.display = v ? 'none' : '';
      });
      if (st.ult) applyUlt(view, animate);
      /* win line */
      var wl = U.pts(view.winLine), wk = JSON.stringify(wl);
      if (wk !== st.winKey) {
        U.clear(st.lWin); st.winKey = wk;
        if (wl.length) {
          var xy = wl.map(function (q) { var g = st.G.cells[q.r + ',' + q.c]; return g ? [g.x + g.S / 2, g.y + g.S / 2] : null; }).filter(Boolean);
          var path = s('path', { cls: 'bd-winline', d: U.winPath(xy, st.G.S * 0.3), pathLength: 1, 'stroke-width': st.G.S * (st.ult ? 0.12 : 0.06) }, st.lWin);
          if (!animate) path.style.animation = 'none';
        }
      }
      /* last move */
      var lm = globalCell(U.lastOf(p)), lk = lm ? lm.r + ',' + lm.c : null;
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        var lg = lk && st.G.cells[lk];
        var ins = st.ult ? 1.5 : 4;
        U.markLast(st.lLast, lg ? { rect: [lg.x + ins, lg.y + ins, lg.S - 2 * ins, lg.S - 2 * ins, Math.max(3, lg.rx - ins)] } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrived[lk] ? ESB.motion.move : 0 });
      }
      inputs(p);
      st.view = view;
    }
    function applyUlt(view, animate) {
      var u = view.ultimate || {}, won = Array.isArray(u.won) ? u.won : [], active = u.active;
      var hasActive = active != null && active >= 0;
      U.clear(st.lLift);
      st.G.boards.forEach(function (b, i) {
        var w = norm(won[i]), isAct = hasActive && active === i;
        var cls = 'bd-g3-local' + (isAct ? ' bd-g3-active' : '') + (hasActive && !isAct ? ' bd-g3-recede' : '') + (won[i] ? ' bd-g3-won' : '');
        st.boardG[i].setAttribute('class', cls);
        if (isAct) {
          s('rect', { cls: 'bd-g3-liftbg', x: b.x - 5, y: b.y - 5, width: b.L + 10, height: b.L + 10, rx: 10 }, st.lLift);
          s('path', { cls: 'bd-g3-underline', d: 'M' + (b.x + b.L * 0.22) + ' ' + (b.y + b.L + 9) + 'H' + (b.x + b.L * 0.78) }, st.lLift);
        }
        var prev = st.big[i];
        if ((prev && prev.v) !== (w || (won[i] ? 'D' : ''))) {
          if (prev) prev.node.parentNode && prev.node.parentNode.removeChild(prev.node);
          delete st.big[i];
          if (w) st.big[i] = { v: w, node: glyph(st.lBig, w, b.x, b.y, b.L, animate, true) };
          else if (won[i]) st.big[i] = { v: 'D', node: s('g') };
        }
      });
    }
    function inputs(p) {
      U.clear(st.lIn);
      var ctl = U.tapCtl(p), legal = U.legalOf(p);
      legal.forEach(function (a) {
        var gc = globalCell(a.cell || a), g = gc && st.G.cells[gc.r + ',' + gc.c];
        if (!g) return;
        U.hit(st.lIn, g.x, g.y, g.S, g.S, g.rx, a.label || 'Cell', function () { U.fire(ctl, a); });
        s('circle', { cls: 'bd-legal', cx: g.x + g.S / 2, cy: g.y + g.S / 2, r: Math.max(3, g.S * 0.075) }, st.lIn);
      });
    }
    build(props.view || {});
    apply(props, true);
    return {
      update: function (p) {
        var v = (p && p.view) || {};
        if (!!(v.ultimate && Array.isArray(v.ultimate.boards)) !== st.ult) { build(v); apply(p, true); return; }
        apply(p, false);
      },
      destroy: function () { U.clear(host); }
    };
  }
  ESB.registerFamily('grid_3x3', { mount: mount });
})();

/* ---------- connect_four: wells, gravity drop, shape-cued discs ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.svgRoot) return;
  var U = ESB.util, s = U.s;
  var VW = 300, GAP = 6, PAD = 3;

  function geom(rows, cols) {
    var w = (VW - GAP * (cols - 1)) / cols, pitch = w, H = rows * pitch + PAD * 2;
    return { rows: rows, cols: cols, w: w, pitch: pitch, H: H, hole: w / 2 - 3.2,
      cx: function (c) { return c * (w + GAP) + w / 2; }, cy: function (r) { return PAD + r * pitch + pitch / 2; } };
  }
  function side(v) { v = String(v || '').toUpperCase(); return v === 'R' || v === 'P1' || v === 'X' ? 'R' : (v === 'Y' || v === 'P2' || v === 'O' ? 'Y' : ''); }
  function disc(parent, v, x, y, r, extra) {
    var g = s('g', { cls: 'bd-c4-disc bd-c4-' + v.toLowerCase() + (extra ? ' ' + extra : '') }, parent);
    s('circle', { cls: 'bd-c4-body', cx: x, cy: y, r: r }, g);
    if (v === 'R') s('circle', { cls: 'bd-c4-ring', cx: x, cy: y, r: r * 0.52, 'stroke-width': r * 0.16 }, g);
    else s('circle', { cls: 'bd-c4-pip', cx: x, cy: y, r: r * 0.3 }, g);
    return g;
  }
  function landing(view, col) {
    var rows = view.rows || 6;
    for (var r = rows - 1; r >= 0; r--) { var row = view.cells && view.cells[r]; if (!row || !side(row[col])) return r; }
    return -1;
  }
  function nextSide(view) {
    var n = { R: 0, Y: 0 };
    (view.cells || []).forEach(function (row) { (row || []).forEach(function (v) { var k = side(v); if (k) n[k]++; }); });
    return n.R <= n.Y ? 'R' : 'Y';
  }

  function mount(host, props) {
    var st = {};
    function build(view) {
      U.clear(host);
      var G = st.G = geom(view.rows || 6, view.cols || 7);
      st.dims = G.rows + 'x' + G.cols;
      var root = U.svgRoot(host, VW, G.H, 'Connect Four board', 'bd-c4');
      var svg = st.svg = root.svg;
      var id = 'bdc4' + Math.random().toString(36).slice(2, 8);
      var defs = s('defs', null, svg), cp = s('clipPath', { id: id }, defs);
      s('rect', { x: -2, y: 0, width: VW + 4, height: G.H }, cp);
      var wells = U.layer(svg, 'bd-c4-wells');
      for (var c = 0; c < G.cols; c++) {
        s('rect', { cls: 'bd-c4-well', x: c * (G.w + GAP), y: 0, width: G.w, height: G.H, rx: G.w / 2 }, wells);
        for (var r = 0; r < G.rows; r++) s('circle', { cls: 'bd-c4-hole', cx: G.cx(c), cy: G.cy(r), r: G.hole }, wells);
      }
      st.lDiscs = s('g', { cls: 'bd-c4-discs', 'clip-path': 'url(#' + id + ')' }, svg);
      st.lWin = U.layer(svg, 'bd-c4-win');
      st.lLast = U.layer(svg, 'bd-c4-last');
      st.lLegal = U.layer(svg, 'bd-c4-legal');
      st.lGhost = U.layer(svg, 'bd-c4-ghostl');
      st.lIn = U.layer(svg, 'bd-c4-input');
      st.discs = {}; st.lastKey = null; st.winKey = null;
    }
    function apply(p, first) {
      var view = p.view || {}, G = st.G;
      var animate = !first && !ESB.reducedMotion(p), arrived = {};
      for (var r = 0; r < G.rows; r++) for (var c = 0; c < G.cols; c++) {
        var k = r + ',' + c, row = view.cells && view.cells[r], v = side(row && row[c]), cur = st.discs[k];
        if ((cur && cur.v) === (v || undefined)) continue;
        if (cur) { cur.node.parentNode && cur.node.parentNode.removeChild(cur.node); delete st.discs[k]; }
        if (!v) continue;
        var node = disc(st.lDiscs, v, G.cx(c), G.cy(r), G.hole - 1.8);
        if (animate) {
          node.classList.add('bd-c4-drop');
          node.style.setProperty('--bd-fall', (-(r + 1) * G.pitch - PAD) + 'px');
          node.style.setProperty('--bd-bounce', (-G.pitch * 0.14).toFixed(2) + 'px');
        }
        st.discs[k] = { v: v, node: node };
        arrived[k] = 1;
      }
      var wl = U.pts(view.winLine), wk = JSON.stringify(wl);
      if (wk !== st.winKey) {
        st.winKey = wk; U.clear(st.lWin);
        if (wl.length) {
          var xy = wl.map(function (q) { return [G.cx(q.c), G.cy(q.r)]; });
          var wp = s('path', { cls: 'bd-winline bd-c4-winline', d: U.winPath(xy, G.hole * 0.35), pathLength: 1, 'stroke-width': G.hole * 0.32 }, st.lWin);
          wp.style.animationDelay = animate ? 'var(--bd-drop)' : '0ms';
          if (!animate) wp.style.animation = 'none';
        }
      }
      var lm = U.lastOf(p); lm = lm && (lm.cell || lm);
      var lr = lm && lm.r != null ? lm.r : (lm && lm.col != null ? landing(view, lm.col) + 1 : null);
      var lc = lm ? (lm.c != null ? lm.c : lm.col) : null;
      var lk = lr != null && lc != null ? lr + ',' + lc : null;
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        U.markLast(st.lLast, lk ? { circle: [G.cx(lc), G.cy(lr), G.hole + 2.6] } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrived[lk] ? ESB.motion.drop : 0 });
      }
      inputs(p, view);
    }
    function inputs(p, view) {
      U.clear(st.lIn); U.clear(st.lLegal); U.clear(st.lGhost);
      var G = st.G, ctl = U.tapCtl(p), legal = U.legalOf(p), ghost = null;
      var who = nextSide(view);
      function showGhost(c) {
        hideGhost();
        var r = landing(view, c); if (r < 0) return;
        ghost = disc(st.lGhost, who, G.cx(c), G.cy(r), G.hole - 1.8, 'bd-ghost');
      }
      function hideGhost() { if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost = null; }
      legal.forEach(function (a) {
        var c = a.col != null ? a.col : (a.cell ? a.cell.c : null);
        if (c == null || c < 0 || c >= G.cols) return;
        var r = landing(view, c);
        if (r >= 0) s('circle', { cls: 'bd-legal', cx: G.cx(c), cy: G.cy(r), r: G.hole * 0.28 }, st.lLegal);
        var hr = U.hit(st.lIn, c * (G.w + GAP) - GAP / 2, 0, G.w + GAP, G.H, 0, a.label || ('Column ' + (c + 1)), function () { hideGhost(); U.fire(ctl, a); });
        hr.addEventListener('pointerdown', function () { showGhost(c); });
        hr.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') showGhost(c); });
        hr.addEventListener('pointerleave', hideGhost);
        hr.addEventListener('pointercancel', hideGhost);
        hr.addEventListener('focus', function () { showGhost(c); });
        hr.addEventListener('blur', hideGhost);
      });
    }
    build(props.view || {});
    apply(props, true);
    return {
      update: function (p) {
        var v = (p && p.view) || {};
        if ((v.rows || 6) + 'x' + (v.cols || 7) !== st.dims) { build(v); apply(p, true); return; }
        apply(p, false);
      },
      destroy: function () { U.clear(host); }
    };
  }
  ESB.registerFamily('connect_four', { mount: mount });
})();

/* ---------- square_board art: chess silhouettes, discs (40-unit boxes) ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util) return;
  var U = ESB.util, s = U.s;
  var BASE = 'M10.5 36.8h19a1.6 1.6 0 0 0 1.6-1.6v-1.2a1.6 1.6 0 0 0-1.6-1.6h-19a1.6 1.6 0 0 0-1.6 1.6v1.2a1.6 1.6 0 0 0 1.6 1.6z';
  /* body paths per piece; detail paths are drawn in the opposite stone */
  var ART = {
    P: { body: [BASE, 'M14.6 32.4C15 27.4 17 24.4 17.6 21.6h4.8c.6 2.8 2.6 5.8 3 10.8z', 'M15.6 21.8h8.8a1.1 1.1 0 0 0 0-2.2h-8.8a1.1 1.1 0 0 0 0 2.2z'],
         circ: [[20, 14.4, 5]], det: [] },
    R: { body: [BASE, 'M13.6 32.4l1-14.4h10.8l1 14.4z', 'M12 18.4h16V9.6h-3.4v3h-2.8v-3h-3.6v3h-2.8v-3H12z'],
         circ: [], det: ['M14.8 18.2h10.4'] },
    N: { body: [BASE, 'M13.6 32.4C13.6 27 16.2 24 19.4 21.6 17 22 14.6 23 12.6 23.6c-2 .5-3.4-1-2.8-2.8L16 13.4c1-3 2.4-5 4-6L21 5l1.6 2.6c4.4 1.4 7 6.2 7 12.6 0 4.6-1.4 8.6-2.4 12.2z'],
         circ: [], det: ['M17.6 13.6h.01', 'M22.4 9.6c2.6 1.6 4 4.6 4.2 8.6'] },
    B: { body: [BASE, 'M14.2 32.4C15 28 17 25.6 17.2 22.8h5.6c.2 2.8 2.2 5.2 3 9.6z', 'M15.2 23h9.6a1.1 1.1 0 0 0 0-2.2h-9.6a1.1 1.1 0 0 0 0 2.2z',
         'M20 7.4c-4 2.8-6.6 6.6-6.6 9.6 0 2.4 2.6 4 6.6 4.2 4-.2 6.6-1.8 6.6-4.2 0-3-2.6-6.8-6.6-9.6z'],
         circ: [[20, 5.6, 1.8]], det: ['M22 11.4l-3.6 4.4'] },
    Q: { body: [BASE, 'M13.4 32.4L11.4 15.6l4.8 6.6-.4-9.4 3.6 8.6.6-10.2.6 10.2 3.6-8.6-.4 9.4 4.8-6.6-2 16.8z'],
         circ: [[11.4, 14.4, 1.8], [15.8, 11.8, 1.8], [20, 10.2, 1.8], [24.2, 11.8, 1.8], [28.6, 14.4, 1.8]], det: ['M14.4 28h11.2'] },
    K: { body: [BASE, 'M13.6 32.4C12.6 27.4 11 22.6 11.4 19.8c.5-3.6 4.6-4.4 8.6-1.6 4-2.8 8.1-2 8.6 1.6.4 2.8-1.2 7.6-2.2 12.6z',
         'M16 17.6c0-3 1.8-4.8 4-4.8s4 1.8 4 4.8z', 'M18.8 3.6h2.4v3h3v2.4h-3v4.2h-2.4V9h-3V6.6h3z'],
         circ: [], det: ['M14.4 28h11.2', 'M20 18.2v9.4'] }
  };
  function chessPiece(parent, code) {
    var side = code[0] === 'b' ? 'b' : 'w', t = String(code[1] || 'P').toUpperCase(), a = ART[t] || ART.P;
    var g = s('g', { cls: 'bd-chess bd-chess-' + side }, parent);
    a.body.forEach(function (d) { s('path', { cls: 'bd-chess-body', d: d }, g); });
    a.circ.forEach(function (c) { s('circle', { cls: 'bd-chess-body', cx: c[0], cy: c[1], r: c[2] }, g); });
    a.det.forEach(function (d) { s('path', { cls: 'bd-chess-det', d: d }, g); });
    return g;
  }
  function discPiece(parent, code, kind) {
    var side = code[0] === 'b' || code[0] === 'B' ? 'b' : 'w';
    var g = s('g', { cls: 'bd-disc bd-disc-' + side + ' bd-disc-' + kind }, parent);
    if (kind === 'checkers') {
      s('circle', { cls: 'bd-disc-body', cx: 20, cy: 20, r: 14.6 }, g);
      s('circle', { cls: 'bd-disc-groove', cx: 20, cy: 20, r: 10 }, g);
      if (code.length > 1 && /k/i.test(code[1])) s('path', { cls: 'bd-disc-crown', d: 'M14.4 23.6h11.2l1.2-7.4-3.8 3-3-4.8-3 4.8-3.8-3z' }, g);
    } else {
      s('circle', { cls: 'bd-disc-body', cx: 20, cy: 20, r: 15.2 }, g);
    }
    return g;
  }
  /* code -> 'chess' | 'disc' */
  function codeKind(code) { return /^[wb][KQRBNP]$/.test(code) ? 'chess' : 'disc'; }
  function inferKind(view) {
    if (view.kind) return String(view.kind);
    if (view.fog || view.shots || view.fleet || view.incoming) return 'battleship';
    var ps = view.pieces || [], chess = false, king = false, dark = true;
    ps.forEach(function (p) {
      var c = String(p.piece || '');
      if (/^[wb][KQRBNP]$/.test(c)) chess = true;
      else if (/^[wb]k$/.test(c)) king = true;
      if ((p.r + p.c) % 2 !== 1) dark = false;
    });
    if (chess) return 'chess';
    if (king || (dark && ps.length > 4 && !(view.flipped && view.flipped.length))) return 'checkers';
    return 'othello';
  }
  U.sq = { chessPiece: chessPiece, discPiece: discPiece, codeKind: codeKind, inferKind: inferKind };
})();

/* ---------- square_board: chess, othello, checkers (battleship delegates) ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.sq) return;
  var U = ESB.util, s = U.s, SQ = U.sq, VB = 320;
  var FILES = 'abcdefghijklmnop';

  function geom(n, m, kind) {
    var gap = kind === 'othello' ? 3 : 0, S = (VB - gap * (m - 1)) / m;
    return { n: n, m: m, S: S, gap: gap, H: n * S + (n - 1) * gap,
      at: function (r, c) { return { x: c * (S + gap), y: r * (S + gap) }; } };
  }
  function pieceMap(view) {
    var o = {};
    (view.pieces || []).forEach(function (p) { if (p && p.piece) o[p.r + ',' + p.c] = String(p.piece); });
    return o;
  }

  function mount(host, props) {
    var st = {};
    function kindOf(v) { return SQ.inferKind(v || {}); }
    function build(view) {
      U.clear(host);
      st.kind = kindOf(view);
      var n = view.rows || 8, m = view.cols || 8, G = st.G = geom(n, m, st.kind);
      st.flip = !!(props.flip || view.flip);
      var label = { chess: 'Chess board', othello: 'Othello board', checkers: 'Checkers board' }[st.kind] || 'Board';
      var root = U.svgRoot(host, VB, G.H, label, 'bd-sq bd-sq-' + st.kind);
      var svg = st.svg = root.svg;
      var lSq = U.layer(svg, 'bd-sq-squares');
      if (st.kind === 'othello') {
        for (var r = 0; r < n; r++) for (var c = 0; c < m; c++) { var a = G.at(r, c); s('rect', { cls: 'bd-cell', x: a.x, y: a.y, width: G.S, height: G.S, rx: 6 }, lSq); }
      } else {
        var id = 'bdsq' + Math.random().toString(36).slice(2, 8), cp = s('clipPath', { id: id }, s('defs', null, svg));
        s('rect', { x: 0, y: 0, width: VB, height: G.H, rx: 8 }, cp);
        lSq.setAttribute('clip-path', 'url(#' + id + ')');
        for (var r2 = 0; r2 < n; r2++) for (var c2 = 0; c2 < m; c2++) {
          var b = G.at(r2, c2);
          s('rect', { cls: (r2 + c2) % 2 ? 'bd-cell-dark' : 'bd-cell-light', x: b.x, y: b.y, width: G.S + 0.3, height: G.S + 0.3 }, lSq);
        }
        if (st.kind === 'chess') coords(lSq, n, m);
      }
      st.lHl = U.layer(svg, 'bd-sq-hl');
      st.lDots = U.layer(svg, 'bd-sq-dots');
      st.lPieces = U.layer(svg, 'bd-sq-pieces');
      st.lLast = U.layer(svg, 'bd-sq-last');
      st.lSel = U.layer(svg, 'bd-sq-sel');
      st.lIn = U.layer(svg, 'bd-sq-input');
      st.pieces = {}; st.dots = {}; st.lastKey = null; st.sel = null;
      if (st.kind === 'othello') for (var r3 = 0; r3 < n; r3++) for (var c3 = 0; c3 < m; c3++) {
        var d = G.at(r3, c3);
        st.dots[r3 + ',' + c3] = s('circle', { cls: 'bd-dot', cx: d.x + G.S / 2, cy: d.y + G.S / 2, r: G.S * 0.05 }, st.lDots);
      }
      svg.addEventListener('click', function () { clearSel(); });
    }
    function disp(r, c) { return st.flip ? { r: st.G.n - 1 - r, c: st.G.m - 1 - c } : { r: r, c: c }; }
    function xy(k) { var rc = k.split(','), d = disp(+rc[0], +rc[1]); return st.G.at(d.r, d.c); }
    function coords(layer, n, m) {
      for (var c = 0; c < m; c++) {
        var a = st.G.at(n - 1, c), dk = (n - 1 + c) % 2;
        s('text', { cls: 'bd-coord ' + (dk ? 'bd-coord-l' : 'bd-coord-d'), x: a.x + st.G.S - 3, y: a.y + st.G.S - 3, 'text-anchor': 'end', text: FILES[st.flip ? m - 1 - c : c] }, layer);
      }
      for (var r = 0; r < n; r++) {
        var b = st.G.at(r, 0), dk2 = r % 2;
        s('text', { cls: 'bd-coord ' + (dk2 ? 'bd-coord-l' : 'bd-coord-d'), x: b.x + 3, y: b.y + 9.5, text: String(st.flip ? r + 1 : n - r) }, layer);
      }
    }
    function place(k, code, cls) {
      var a = xy(k), outer = s('g', { transform: 'translate(' + a.x + ' ' + a.y + ')' }, st.lPieces);
      var inner = s('g', { cls: 'bd-piece' + (cls ? ' ' + cls : '') }, outer);
      var art = s('g', { transform: 'scale(' + (st.G.S / 40).toFixed(4) + ')' }, inner);
      if (SQ.codeKind(code) === 'chess') SQ.chessPiece(art, code); else SQ.discPiece(art, code, st.kind);
      st.pieces[k] = { code: code, outer: outer, inner: inner };
      return inner;
    }
    function lastMoveOf(p) {
      var lm = U.lastOf(p); if (!lm) return null;
      var from = lm.from ? U.pt(lm.from) : null, to = lm.to ? U.pt(lm.to) : (lm.r != null ? { r: lm.r, c: lm.c } : null);
      return { from: from && from.r + ',' + from.c, to: to && to.r + ',' + to.c };
    }
    function apply(p, first) {
      var view = p.view || {}, G = st.G, animate = !first && !ESB.reducedMotion(p);
      var nm = pieceMap(view), lm = lastMoveOf(p), leaving = {}, adds = [];
      Object.keys(st.pieces).forEach(function (k) { if (nm[k] !== st.pieces[k].code) { leaving[k] = st.pieces[k]; delete st.pieces[k]; } });
      Object.keys(nm).forEach(function (k) { if (!st.pieces[k]) adds.push(k); });
      var done = {}, arrivedTo = false;
      function drop(k) { var o = leaving[k]; if (o) { o.outer.parentNode && o.outer.parentNode.removeChild(o.outer); delete leaving[k]; } }
      /* othello flips: crossfade + scale-settle, staggered outward from the move */
      if (st.kind === 'othello') {
        var origin = lm && lm.to ? lm.to.split(',').map(Number) : null;
        var flips = adds.filter(function (k) { return leaving[k]; });
        flips.sort(function (a, b) { return dist(a) - dist(b); });
        flips.forEach(function (k, i) {
          var old = leaving[k]; delete leaving[k]; done[k] = 1;
          var inner = place(k, nm[k], animate ? 'bd-flip-in' : '');
          if (animate) {
            var dl = 'calc(var(--bd-move) * .6 + ' + Math.min(i, 8) * 45 + 'ms)';
            inner.style.animationDelay = dl;
            old.inner.classList.add('bd-flip-out'); old.inner.style.animationDelay = dl;
            st.lPieces.insertBefore(old.outer, st.lPieces.firstChild);
            U.rm(old.outer, p, ESB.motion.move * 2 + Math.min(i, 8) * 45);
          } else old.outer.parentNode && old.outer.parentNode.removeChild(old.outer);
        });
        function dist(k) { if (!origin) return 0; var q = k.split(','); return Math.max(Math.abs(q[0] - origin[0]), Math.abs(q[1] - origin[1])); }
      }
      /* glides: the last move first, then same-code pairs (castling rook) */
      function glide(fk, tk) {
        var a = xy(fk), b = xy(tk);
        drop(fk); done[tk] = 1;
        if (tk === (lm && lm.to)) arrivedTo = true;
        var inner = place(tk, nm[tk], animate ? 'bd-glide' : '');
        inner.style.setProperty('--bd-dx', (a.x - b.x).toFixed(2) + 'px');
        inner.style.setProperty('--bd-dy', (a.y - b.y).toFixed(2) + 'px');
      }
      if (lm && lm.from && lm.to && leaving[lm.from] && adds.indexOf(lm.to) >= 0 && !done[lm.to]) glide(lm.from, lm.to);
      adds.forEach(function (k) {
        if (done[k]) return;
        var best = null, bd = 1e9, q = k.split(',');
        Object.keys(leaving).forEach(function (f) {
          if (f === k || leaving[f].code !== nm[k] || nm[f] === leaving[f].code) return;
          var w = f.split(','), d = Math.abs(w[0] - q[0]) + Math.abs(w[1] - q[1]);
          if (d < bd) { bd = d; best = f; }
        });
        if (best && st.kind !== 'othello') glide(best, k);
      });
      adds.forEach(function (k) {
        if (done[k]) return;
        place(k, nm[k], animate ? 'bd-arrive' : '');
        if (k === (lm && lm.to)) arrivedTo = true;
      });
      /* captures fade out on arrival */
      Object.keys(leaving).forEach(function (k) {
        var o = leaving[k];
        if (!animate) { o.outer.parentNode && o.outer.parentNode.removeChild(o.outer); return; }
        st.lPieces.insertBefore(o.outer, st.lPieces.firstChild);
        o.inner.classList.add('bd-leave'); o.inner.style.animationDelay = 'calc(var(--bd-move) * .55)';
        U.rm(o.outer, p, ESB.motion.move * 2);
      });
      Object.keys(st.dots).forEach(function (k) { st.dots[k].style.display = nm[k] ? 'none' : ''; });
      /* highlights + origin ghost */
      U.clear(st.lHl);
      U.pts(view.highlights).forEach(function (h) { var a = xy(h.r + ',' + h.c); s('rect', { cls: 'bd-hl', x: a.x, y: a.y, width: G.S, height: G.S, rx: st.kind === 'othello' ? 6 : 0 }, st.lHl); });
      if (lm && lm.from) { var f = xy(lm.from); s('rect', { cls: 'bd-from', x: f.x, y: f.y, width: G.S, height: G.S, rx: st.kind === 'othello' ? 6 : 0 }, st.lHl); }
      var lk = lm && lm.to;
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        var t = lk ? xy(lk) : null, ins = st.kind === 'othello' ? 2 : 1.5;
        U.markLast(st.lLast, t ? { rect: [t.x + ins, t.y + ins, G.S - 2 * ins, G.S - 2 * ins, st.kind === 'othello' ? 5 : 3] } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrivedTo ? ESB.motion.move : 0 });
      }
      st.nm = nm;
      inputs(p);
    }
    function clearSel() { st.sel = null; U.clear(st.lSel); if (st.hits) Object.keys(st.hits).forEach(function (k) { st.hits[k].setAttribute('tabindex', st.byFrom && st.byFrom[k] ? '0' : '-1'); }); }
    function inputs(p) {
      U.clear(st.lIn); U.clear(st.lSel); st.sel = null; st.hits = {}; st.byFrom = {};
      var G = st.G, ctl = U.tapCtl(p), legal = U.legalOf(p);
      legal.forEach(function (a) {
        if (a.from && a.to) { var fk = U.pt(a.from).r + ',' + U.pt(a.from).c; (st.byFrom[fk] = st.byFrom[fk] || []).push(a); return; }
        var c = a.cell ? U.pt(a.cell) : (a.r != null ? a : null); if (!c) return;
        var at = xy(c.r + ',' + c.c);
        U.hit(st.lIn, at.x, at.y, G.S, G.S, 6, a.label || 'Square', function () { U.fire(ctl, a); });
        s('circle', { cls: 'bd-legal', cx: at.x + G.S / 2, cy: at.y + G.S / 2, r: G.S * 0.13 }, st.lIn);
      });
      if (!Object.keys(st.byFrom).length) return;
      for (var r = 0; r < G.n; r++) for (var c = 0; c < G.m; c++) (function (k) {
        var at = xy(k);
        var hr = U.hit(st.lIn, at.x, at.y, G.S, G.S, 0, squareName(k), function () { tap(k); });
        hr.setAttribute('tabindex', st.byFrom[k] ? '0' : '-1');
        st.hits[k] = hr;
      })(r + ',' + c);
      function tap(k) {
        if (st.sel && st.targets[k]) {
          var acts = st.targets[k], pick = acts.filter(function (a) { return /q$|=q|promot.*q/i.test(String(a.promotion || a.token || '')); })[0] || acts[0];
          U.fire(ctl, pick); return;
        }
        if (st.byFrom[k] && st.sel !== k) select(k); else clearSel();
      }
      function select(k) {
        clearSel(); st.sel = k; st.targets = {};
        var at = xy(k);
        s('rect', { cls: 'bd-sel', x: at.x + 1, y: at.y + 1, width: G.S - 2, height: G.S - 2, rx: 3 }, st.lSel);
        st.byFrom[k].forEach(function (a) {
          var t = U.pt(a.to), tk = t.r + ',' + t.c, tp = xy(tk);
          (st.targets[tk] = st.targets[tk] || []).push(a);
          if (st.hits[tk]) { st.hits[tk].setAttribute('tabindex', '0'); st.hits[tk].setAttribute('aria-label', a.label || squareName(tk)); }
          if (st.nm[tk]) s('circle', { cls: 'bd-target-ring', cx: tp.x + G.S / 2, cy: tp.y + G.S / 2, r: G.S * 0.44 }, st.lSel);
          else s('circle', { cls: 'bd-target', cx: tp.x + G.S / 2, cy: tp.y + G.S / 2, r: G.S * 0.15 }, st.lSel);
        });
      }
    }
    function squareName(k) { var q = k.split(','); return st.kind === 'chess' ? FILES[+q[1]] + (st.G.n - q[0]) : 'Row ' + (+q[0] + 1) + ' column ' + (+q[1] + 1); }
    function start(p) {
      var v = p.view || {};
      if (SQ.inferKind(v) === 'battleship' && SQ.battleship) { st.bs = SQ.battleship(host, p); return; }
      st.bs = null; build(v); apply(p, true);
    }
    start(props);
    return {
      update: function (p) {
        var v = (p && p.view) || {}, k = SQ.inferKind(v);
        if (st.bs && k === 'battleship') { st.bs.update(p); return; }
        if (st.bs || k !== st.kind || (v.rows || 8) !== st.G.n || (v.cols || 8) !== st.G.m) { start(p); return; }
        apply(p, false);
      },
      destroy: function () { U.clear(host); }
    };
  }
  ESB.registerFamily('square_board', { mount: mount });
})();

/* ---------- square_board · battleship: two fog grids, shots only ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.sq) return;
  var U = ESB.util, s = U.s, h = U.h, VB = 300;

  function grid(n) { var gap = 2, S = (VB - gap * (n - 1)) / n; return { n: n, S: S, at: function (r, c) { return { x: c * (S + gap), y: r * (S + gap) }; } }; }
  /* shots arrive as one array ([{r,c,hit,by}]) or, from the scripted record, as
     { you:[{r,c,hit}], model:[...] }; sunk is { you:[{name,cells}], model:[...] }
     (the ships each side has sunk), so sunk cells read as sunk on that grid. */
  function split(view, you) {
    var theirs = [], mine = [], sh = view.shots;
    if (Array.isArray(sh)) {
      sh.forEach(function (q) {
        var by = q && (q.by || q.seat);
        if (by && by !== 'you' && by !== you) mine.push(q); else theirs.push(q);
      });
    } else if (sh && typeof sh === 'object') {
      theirs = (sh.you || []).slice();
      mine = (sh.model || []).slice();
    }
    (view.incoming || []).forEach(function (q) { mine.push(q); });
    function cellsOf(list) { var o = {}; (list || []).forEach(function (sp) { (sp && sp.cells || []).forEach(function (q) { o[q.r + ',' + q.c] = 1; }); }); return o; }
    var sunk = view.sunk && typeof view.sunk === 'object' ? view.sunk : {};
    var sunkT = cellsOf(sunk.you), sunkM = cellsOf(sunk.model);
    function ok(q) { return q && q.r != null && q.c != null; }
    function norm(set) { return function (q) { return { r: q.r, c: q.c, hit: !!q.hit, sunk: !!set[q.r + ',' + q.c] }; }; }
    return { theirs: theirs.filter(ok).map(norm(sunkT)), mine: mine.filter(ok).map(norm(sunkM)),
      sunkCount: (sunk.you || []).length };
  }

  function battleship(host, props) {
    U.clear(host);
    var st = { marks: {}, lastKey: null, fleetKey: null };
    var n = (props.view && (props.view.rows || props.view.size)) || 10;
    st.G = grid(n);
    var board = h('div', 'bd-board bd-bs');
    host.appendChild(board);
    var main = h('div', 'bd-bs-main'), side = h('div', 'bd-bs-side');
    board.appendChild(main); board.appendChild(side);
    main.appendChild(h('div', 'bd-bs-label', { text: 'Their waters' }));
    st.T = mk(main, 'Their waters, your shots', 'bd-bs-theirs');
    side.appendChild(h('div', 'bd-bs-label', { text: 'Your fleet' }));
    st.M = mk(side, 'Your fleet, shots at you', 'bd-bs-yours');
    st.legend = h('div', 'bd-bs-legend'); side.appendChild(st.legend);

    function mk(parent, label, cls) {
      var svg = s('svg', { cls: 'bd-svg ' + cls, viewBox: '0 0 ' + VB + ' ' + VB, role: 'img', 'aria-label': label });
      parent.appendChild(svg);
      var o = { svg: svg, cells: U.layer(svg, 'bd-bs-cells'), fleet: U.layer(svg, 'bd-bs-fleet'), shots: U.layer(svg, 'bd-bs-shots'),
        last: U.layer(svg, 'bd-bs-last'), input: U.layer(svg, 'bd-bs-input') };
      for (var r = 0; r < st.G.n; r++) for (var c = 0; c < st.G.n; c++) {
        var a = st.G.at(r, c);
        s('rect', { cls: 'bd-cell bd-bs-cell', x: a.x, y: a.y, width: st.G.S, height: st.G.S, rx: 4 }, o.cells);
      }
      return o;
    }
    function drawFleet(list) {
      U.clear(st.M.fleet);
      var G = st.G, on = U.cellsSet(list), ins = 3;
      U.pts(list).forEach(function (q) {
        var a = G.at(q.r, q.c);
        s('rect', { cls: 'bd-bs-ship', x: a.x + ins, y: a.y + ins, width: G.S - 2 * ins, height: G.S - 2 * ins, rx: 6 }, st.M.fleet);
        if (on[q.r + ',' + (q.c + 1)]) s('rect', { cls: 'bd-bs-ship', x: a.x + G.S / 2, y: a.y + ins, width: G.S + 2, height: G.S - 2 * ins }, st.M.fleet);
        if (on[(q.r + 1) + ',' + q.c]) s('rect', { cls: 'bd-bs-ship', x: a.x + ins, y: a.y + G.S / 2, width: G.S - 2 * ins, height: G.S + 2 }, st.M.fleet);
      });
    }
    function mark(o, q, animate) {
      var G = st.G, a = G.at(q.r, q.c), cx = a.x + G.S / 2, cy = a.y + G.S / 2;
      var g = s('g', { cls: 'bd-piece bd-bs-mark' + (q.sunk ? ' is-sunk' : '') + (animate ? ' bd-arrive' : '') }, o.shots);
      if (q.hit) {
        s('circle', { cls: 'bd-bs-hit', cx: cx, cy: cy, r: G.S * 0.24 }, g);
        s('circle', { cls: 'bd-bs-hitring', cx: cx, cy: cy, r: G.S * 0.37 }, g);
      } else s('circle', { cls: 'bd-bs-miss', cx: cx, cy: cy, r: G.S * 0.13 }, g);
      return g;
    }
    function apply(p, first) {
      var view = p.view || {}, animate = !first && !ESB.reducedMotion(p), you = U.seatOf(p);
      var sp = split(view, you), seen = {}, arrived = {};
      [['T', st.T, sp.theirs], ['M', st.M, sp.mine]].forEach(function (z) {
        z[2].forEach(function (q) {
          var k = z[0] + ':' + q.r + ',' + q.c, v = q.sunk ? 's' : q.hit ? 'h' : 'm', cur = st.marks[k];
          seen[k] = 1;
          if (cur && cur.v === v) return;
          if (cur) cur.node.parentNode && cur.node.parentNode.removeChild(cur.node);
          st.marks[k] = { v: v, node: mark(z[1], q, animate) }; arrived[k] = 1;
        });
      });
      Object.keys(st.marks).forEach(function (k) { if (!seen[k]) { var o = st.marks[k]; o.node.parentNode && o.node.parentNode.removeChild(o.node); delete st.marks[k]; } });
      var fk = JSON.stringify(view.fleet || []);
      if (fk !== st.fleetKey) { st.fleetKey = fk; drawFleet(view.fleet || []); }
      /* last shot */
      var lm = U.lastOf(p), lk = null, lo = null;
      if (lm && lm.r != null) {
        var by = lm.by || lm.seat, toMine = lm.grid === 'yours' || lm.grid === 'mine' || (by && by !== 'you' && by !== you);
        if (!toMine && !st.marks['T:' + lm.r + ',' + lm.c] && st.marks['M:' + lm.r + ',' + lm.c]) toMine = true;
        lk = (toMine ? 'M:' : 'T:') + lm.r + ',' + lm.c; lo = toMine ? st.M : st.T;
      }
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        var G = st.G, a = lk ? G.at(lm.r, lm.c) : null;
        U.markLast(lo ? lo.last : st.T.last, a ? { rect: [a.x + 1.5, a.y + 1.5, G.S - 3, G.S - 3, 4] } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrived[lk] ? ESB.motion.move : 0 });
      }
      var hits = sp.theirs.filter(function (q) { return q.hit; }).length;
      U.clear(st.legend);
      [['bd-bs-key-hit', 'Hit', hits], ['bd-bs-key-miss', 'Miss', sp.theirs.length - hits]].concat(sp.sunkCount ? [['bd-bs-key-sunk', 'Sunk', sp.sunkCount]] : []).forEach(function (L) {
        var row = h('div', 'bd-bs-key'); row.appendChild(h('span', 'bd-bs-sw ' + L[0]));
        row.appendChild(h('span', 'bd-bs-kt', { text: L[1] })); row.appendChild(h('span', 'bd-bs-kn', { text: String(L[2]) }));
        st.legend.appendChild(row);
      });
      inputs(p);
    }
    function inputs(p) {
      U.clear(st.T.input);
      var G = st.G, ctl = U.tapCtl(p);
      U.legalOf(p).forEach(function (a) {
        var c = a.cell ? U.pt(a.cell) : (a.r != null ? a : null); if (!c) return;
        var at = G.at(c.r, c.c);
        U.hit(st.T.input, at.x, at.y, G.S, G.S, 4, a.label || ('Fire at row ' + (c.r + 1) + ' column ' + (c.c + 1)), function () { U.fire(ctl, a); });
        s('circle', { cls: 'bd-legal bd-bs-legal', cx: at.x + G.S / 2, cy: at.y + G.S / 2, r: G.S * 0.075 }, st.T.input);
      });
    }
    apply(props, true);
    return { update: function (p) { apply(p, false); }, destroy: function () { U.clear(host); } };
  }
  U.sq.battleship = battleship;
})();

/* ---------- go_board: Go 9x9, Gomoku 15x15 ---------- */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.svgRoot) return;
  var U = ESB.util, s = U.s, VB = 300;
  /* generic focusable hit shape (polygon/circle) for non-square targets */
  U.hitShape = function (parent, tag, attrs, label, onTap) {
    var a = { cls: 'bd-hit', tabindex: '0', role: 'button', 'aria-label': label || 'Select' };
    for (var k in attrs) a[k] = attrs[k];
    var n = s(tag, a, parent);
    n.addEventListener('click', function (e) { e.stopPropagation(); onTap(e); });
    n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(e); } });
    return n;
  };
  function stars(N) {
    var e = N >= 13 ? 3 : 2, m = (N - 1) / 2, o = [[e, e], [e, N - 1 - e], [N - 1 - e, e], [N - 1 - e, N - 1 - e], [m, m]];
    if (N >= 19) o.push([e, m], [m, e], [m, N - 1 - e], [N - 1 - e, m]);
    return o;
  }
  function col(v) { v = String(v || '').toLowerCase(); return v === 'b' || v === 'black' || v === 'p1' || v === 'x' ? 'b' : 'w'; }

  function mount(host, props) {
    var st = {};
    function build(view) {
      U.clear(host);
      var N = st.N = view.size || view.rows || 9, S = st.S = VB / N, m = S / 2;
      st.at = function (r, c) { return { x: m + c * S, y: m + r * S }; };
      var root = U.svgRoot(host, VB, VB, N >= 13 ? 'Gomoku board' : 'Go board', 'bd-go');
      var svg = st.svg = root.svg;
      var field = U.layer(svg, 'bd-go-field');
      s('rect', { cls: 'bd-go-wood', x: 0, y: 0, width: VB, height: VB, rx: 8 }, field);
      var d = '';
      for (var i = 0; i < N; i++) { var p = m + i * S; d += 'M' + m + ' ' + p + 'H' + (VB - m) + 'M' + p + ' ' + m + 'V' + (VB - m); }
      s('path', { cls: 'bd-go-line', d: d }, field);
      stars(N).forEach(function (q) { var a = st.at(q[0], q[1]); s('circle', { cls: 'bd-star', cx: a.x, cy: a.y, r: Math.max(1.6, S * 0.09) }, field); });
      st.lStones = U.layer(svg, 'bd-go-stones');
      st.lWin = U.layer(svg, 'bd-go-win');
      st.lLast = U.layer(svg, 'bd-go-last');
      st.lGhost = U.layer(svg, 'bd-go-ghostl');
      st.lIn = U.layer(svg, 'bd-go-input');
      st.stones = {}; st.lastKey = null; st.winKey = null;
    }
    function stone(r, c, v, cls) {
      var a = st.at(r, c);
      return s('circle', { cls: 'bd-piece bd-go-stone bd-stone-' + v + (cls ? ' ' + cls : ''), cx: a.x, cy: a.y, r: st.S * 0.46 }, st.lStones);
    }
    function apply(p, first) {
      var view = p.view || {}, animate = !first && !ESB.reducedMotion(p), nm = {}, arrived = {};
      (view.stones || []).forEach(function (q) { if (q && q.r != null) nm[q.r + ',' + q.c] = col(q.color); });
      Object.keys(st.stones).forEach(function (k) {
        if (nm[k] === st.stones[k].v) return;
        var o = st.stones[k]; delete st.stones[k];
        if (!animate) { o.node.parentNode && o.node.parentNode.removeChild(o.node); return; }
        /* a dead group fades out together on one reveal beat */
        o.node.classList.add('bd-leave'); o.node.style.animationDelay = 'var(--bd-move)';
        o.node.style.animationDuration = 'var(--bd-reveal)';
        U.rm(o.node, p, ESB.motion.move + ESB.motion.reveal);
      });
      Object.keys(nm).forEach(function (k) {
        if (st.stones[k]) return;
        var q = k.split(',');
        st.stones[k] = { v: nm[k], node: stone(+q[0], +q[1], nm[k], animate ? 'bd-arrive' : '') };
        arrived[k] = 1;
      });
      var wl = U.pts(view.winLine), wk = JSON.stringify(wl);
      if (wk !== st.winKey) {
        st.winKey = wk; U.clear(st.lWin);
        if (wl.length) {
          var xy = wl.map(function (q) { var a = st.at(q.r, q.c); return [a.x, a.y]; });
          var wp = s('path', { cls: 'bd-winline', d: U.winPath(xy, st.S * 0.3), pathLength: 1, 'stroke-width': st.S * 0.14 }, st.lWin);
          if (!animate) wp.style.animation = 'none';
        }
      }
      var lm = U.lastOf(p); lm = lm && (lm.cell || lm);
      var lk = lm && lm.r != null ? lm.r + ',' + lm.c : null;
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        var a = lk ? st.at(lm.r, lm.c) : null;
        U.markLast(st.lLast, a ? { circle: [a.x, a.y, st.S * 0.46 + 2.2] } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrived[lk] ? ESB.motion.move : 0 });
      }
      st.nm = nm;
      inputs(p);
    }
    function inputs(p) {
      U.clear(st.lIn); U.clear(st.lGhost);
      var ctl = U.tapCtl(p), legal = U.legalOf(p), confirm = st.N >= 13, pending = null;
      var you = U.seatOf(p), mine = you === 'p2' ? 'w' : 'b';
      legal.forEach(function (a) {
        var c = a.cell ? U.pt(a.cell) : (a.r != null ? a : null); if (!c) return;
        var at = st.at(c.r, c.c), k = c.r + ',' + c.c;
        U.hitShape(st.lIn, 'rect', { x: at.x - st.S / 2, y: at.y - st.S / 2, width: st.S, height: st.S }, a.label || 'Intersection', function () {
          if (!confirm || pending === k) { U.clear(st.lGhost); U.fire(ctl, a); return; }
          /* Gomoku: first tap places a dashed ghost stone, second tap confirms */
          pending = k; U.clear(st.lGhost);
          s('circle', { cls: 'bd-go-ghost bd-stone-' + mine, cx: at.x, cy: at.y, r: st.S * 0.44 }, st.lGhost);
        });
        s('circle', { cls: 'bd-legal', cx: at.x, cy: at.y, r: st.S * 0.12 }, st.lIn);
      });
    }
    build(props.view || {});
    apply(props, true);
    return {
      update: function (p) {
        var v = (p && p.view) || {};
        if ((v.size || v.rows || 9) !== st.N) { build(v); apply(p, true); return; }
        apply(p, false);
      },
      destroy: function () { U.clear(host); }
    };
  }
  ESB.registerFamily('go_board', { mount: mount });
})();

/* ---------- hex_board: 11x11 pointy-top parallelogram ----------
   Black (p1) connects top and bottom, White (p2) connects left and right. */
(function () {
  'use strict';
  var ESB = window.ESB; if (!ESB || !ESB.util || !ESB.util.svgRoot) return;
  var U = ESB.util, s = U.s, VB = 300, E = 1, S3 = Math.sqrt(3);
  function col(v) { v = String(v || '').toLowerCase(); return v === 'b' || v === 'black' || v === 'p1' || v === 'x' || v === 'r' || v === 'red' ? 'b' : 'w'; }
  function hexPts(cx, cy, R) {
    var o = [];
    for (var i = 0; i < 6; i++) { var a = Math.PI / 180 * (60 * i - 90); o.push((cx + R * Math.cos(a)).toFixed(2) + ',' + (cy + R * Math.sin(a)).toFixed(2)); }
    return o.join(' ');
  }
  function adj(a, b) { var dr = b.r - a.r, dc = b.c - a.c; return (dr === 0 && Math.abs(dc) === 1) || (dc === 0 && Math.abs(dr) === 1) || (dr === -1 && dc === 1) || (dr === 1 && dc === -1); }
  function order(list) {
    if (list.length < 2) return list;
    var ok = true;
    for (var i = 1; i < list.length; i++) if (!adj(list[i - 1], list[i])) { ok = false; break; }
    if (ok) return list;
    var rs = list.map(function (q) { return q.r; }), cs = list.map(function (q) { return q.c; });
    var vert = (Math.max.apply(0, rs) - Math.min.apply(0, rs)) >= (Math.max.apply(0, cs) - Math.min.apply(0, cs));
    var rest = list.slice().sort(function (a, b) { return vert ? a.r - b.r : a.c - b.c; }), out = [rest.shift()];
    while (rest.length) {
      var cur = out[out.length - 1], j = -1;
      for (var k = 0; k < rest.length; k++) if (adj(cur, rest[k])) { j = k; break; }
      out.push(rest.splice(j < 0 ? 0 : j, 1)[0]);
    }
    return out;
  }

  function mount(host, props) {
    var st = {};
    function build(view) {
      U.clear(host);
      var N = st.N = view.size || 11;
      var w = VB / (1.5 * (N - 1 + 2 * E)), R = st.R = w / S3, H = 1.5 * R * (N - 1 + 2 * E);
      var x0 = E * w + E * w / 2, y0 = E * 1.5 * R;
      st.P = function (r, c) { return { x: x0 + c * w + r * w / 2, y: y0 + r * 1.5 * R }; };
      var root = U.svgRoot(host, VB, H, 'Hex board', 'bd-hex bd-board-bare');
      var svg = st.svg = root.svg;
      var lEdge = U.layer(svg, 'bd-hex-edges');
      var TL = st.P(-E, -E), TR = st.P(-E, N - 1 + E), BL = st.P(N - 1 + E, -E), BR = st.P(N - 1 + E, N - 1 + E), C = st.P((N - 1) / 2, (N - 1) / 2);
      function tri(a, b, cls) { s('path', { cls: cls, d: 'M' + a.x + ' ' + a.y + 'L' + b.x + ' ' + b.y + 'L' + C.x + ' ' + C.y + 'Z' }, lEdge); }
      var youB = U.seatOf(props) !== 'p2';
      var bCls = 'bd-hex-band ' + (youB ? 'bd-hex-band-you' : 'bd-hex-band-them'), wCls = 'bd-hex-band ' + (youB ? 'bd-hex-band-them' : 'bd-hex-band-you');
      tri(TL, TR, bCls); tri(BL, BR, bCls); tri(TL, BL, wCls); tri(TR, BR, wCls);
      var dB = 'M' + TL.x + ' ' + TL.y + 'L' + TR.x + ' ' + TR.y + 'M' + BL.x + ' ' + BL.y + 'L' + BR.x + ' ' + BR.y;
      var dW = 'M' + TL.x + ' ' + TL.y + 'L' + BL.x + ' ' + BL.y + 'M' + TR.x + ' ' + TR.y + 'L' + BR.x + ' ' + BR.y;
      s('path', { cls: 'bd-hex-rim-under', d: dW + dB }, lEdge);
      s('path', { cls: 'bd-hex-rim-w', d: dW }, lEdge);
      s('path', { cls: 'bd-hex-rim-b', d: dB }, lEdge);
      var lCells = U.layer(svg, 'bd-hex-cells');
      st.dots = {};
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var p = st.P(r, c);
        s('polygon', { cls: 'bd-cell bd-hex-cell', points: hexPts(p.x, p.y, R - 0.8) }, lCells);
        st.dots[r + ',' + c] = s('circle', { cls: 'bd-dot', cx: p.x, cy: p.y, r: R * 0.11 }, lCells);
      }
      st.lStones = U.layer(svg, 'bd-hex-stones');
      st.lPath = U.layer(svg, 'bd-hex-path');
      st.lLast = U.layer(svg, 'bd-hex-last');
      st.lIn = U.layer(svg, 'bd-hex-input');
      st.stones = {}; st.lastKey = null; st.pathKey = null;
    }
    function apply(p, first) {
      var view = p.view || {}, animate = !first && !ESB.reducedMotion(p), nm = {}, arrived = {}, R = st.R;
      (view.cells || []).forEach(function (q) { if (q && q.r != null && q.color != null && q.color !== '') nm[q.r + ',' + q.c] = col(q.color); });
      Object.keys(st.stones).forEach(function (k) {
        if (nm[k] === st.stones[k].v) return;
        var o = st.stones[k]; delete st.stones[k];
        o.node.parentNode && o.node.parentNode.removeChild(o.node);
      });
      Object.keys(nm).forEach(function (k) {
        if (st.stones[k]) return;
        var q = k.split(','), a = st.P(+q[0], +q[1]);
        st.stones[k] = { v: nm[k], node: s('circle', { cls: 'bd-piece bd-stone-' + nm[k] + (animate ? ' bd-arrive' : ''), cx: a.x, cy: a.y, r: R * 0.66 }, st.lStones) };
        arrived[k] = 1;
      });
      Object.keys(st.dots).forEach(function (k) { st.dots[k].style.display = nm[k] ? 'none' : ''; });
      /* winning chain: one accent stroke, edge to edge */
      var path = order(U.pts(view.path)), pk = JSON.stringify(path);
      if (pk !== st.pathKey) {
        st.pathKey = pk; U.clear(st.lPath);
        if (path.length) {
          var f = path[0], l = path[path.length - 1];
          var vert = Math.abs(l.r - f.r) >= Math.abs(l.c - f.c), sg = (vert ? l.r - f.r : l.c - f.c) >= 0 ? 1 : -1;
          var head = vert ? st.P(f.r - 0.75 * sg, f.c) : st.P(f.r, f.c - 0.75 * sg), tail = vert ? st.P(l.r + 0.75 * sg, l.c) : st.P(l.r, l.c + 0.75 * sg);
          var d = 'M' + head.x.toFixed(2) + ' ' + head.y.toFixed(2);
          path.forEach(function (q) { var a = st.P(q.r, q.c); d += 'L' + a.x.toFixed(2) + ' ' + a.y.toFixed(2); });
          d += 'L' + tail.x.toFixed(2) + ' ' + tail.y.toFixed(2);
          var wp = s('path', { cls: 'bd-winline bd-hex-win', d: d, pathLength: 1, 'stroke-width': R * 0.3 }, st.lPath);
          if (!animate) wp.style.animation = 'none';
        }
      }
      var lm = U.lastOf(p); lm = lm && (lm.cell || lm);
      var lk = lm && lm.r != null ? lm.r + ',' + lm.c : null;
      if (lk !== st.lastKey) {
        st.lastKey = lk;
        var a = lk ? st.P(lm.r, lm.c) : null, hp = a ? hexPts(a.x, a.y, R - 1.6).split(' ') : null;
        U.markLast(st.lLast, hp ? { path: 'M' + hp.join('L') + 'Z' } : null, p,
          { cls: animate ? '' : 'bd-static', delay: arrived[lk] ? ESB.motion.move : 0 });
      }
      inputs(p);
    }
    function inputs(p) {
      U.clear(st.lIn);
      var ctl = U.tapCtl(p), R = st.R;
      U.legalOf(p).forEach(function (a) {
        var c = a.cell ? U.pt(a.cell) : (a.r != null ? a : null); if (!c) return;
        var at = st.P(c.r, c.c);
        U.hitShape(st.lIn, 'polygon', { points: hexPts(at.x, at.y, R) }, a.label || 'Hex', function () { U.fire(ctl, a); });
        s('circle', { cls: 'bd-legal', cx: at.x, cy: at.y, r: R * 0.24 }, st.lIn);
      });
    }
    build(props.view || {});
    apply(props, true);
    return {
      update: function (p) {
        var v = (p && p.view) || {};
        if ((v.size || 11) !== st.N || U.seatOf(p) !== U.seatOf(props)) { props = p; build(v); apply(p, true); return; }
        apply(p, false);
      },
      destroy: function () { U.clear(host); }
    };
  }
  ESB.registerFamily('hex_board', { mount: mount });
})();
