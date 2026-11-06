/* =====================================================================
   eSlams Arena  |  scene.js  [S]  window.ESScene  "weightless field"
   Token-driven floating game pieces on one canvas. See POLISH_CONTRACT §1.
   ===================================================================== */
(function () {
  'use strict';
  var warned = false;
  function warn(e) { if (!warned) { warned = true; try { console.warn('[ESScene]', e); } catch (x) {} } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* ---------- colour: resolve tokens through a probe so color-mix etc. work ---------- */
  function parseColor(str) {
    var m = /rgba?\(([^)]+)\)/.exec(str);
    if (m) { var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = /color\(srgb ([^)]+)\)/.exec(str);
    if (m) { var q = m[1].split(/[ \/]+/).filter(Boolean).map(parseFloat); return [q[0] * 255, q[1] * 255, q[2] * 255, q.length > 3 ? q[3] : 1]; }
    m = /#([0-9a-f]{3,8})/i.exec(str);
    if (m) { var h = m[1]; if (h.length < 6) h = h.split('').map(function (c) { return c + c; }).join('');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), h.length > 6 ? parseInt(h.substr(6, 2), 16) / 255 : 1]; }
    return null;
  }
  function readTokens() {
    var phone = document.getElementById('phone') || document.documentElement;
    var probe = document.createElement('span'); probe.style.display = 'none'; phone.appendChild(probe);
    var names = ['bg', 'surface', 'surface-2', 'text', 'text-2', 'text-3', 'accent', 'border', 'loss', 'draw', 'win',
      'stone-black', 'stone-white', 'chess-b-edge', 'board-dark', 'board-light', 'theme-card-back', 'theme-card-face', 'gold', 'silver', 'bronze'];
    var T = {};
    names.forEach(function (n) {
      probe.style.color = ''; probe.style.color = 'var(--' + n + ', var(--text))';
      T[n] = parseColor(getComputedStyle(probe).color) || null;
    });
    phone.removeChild(probe);
    var txt = T.text || [128, 128, 128, 1], bg = T.bg || [128, 128, 128, 1];
    names.forEach(function (n) { if (!T[n]) T[n] = txt; });
    T.bg = bg; T.text = txt;
    var lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    T.dark = lum < 0.5;
    return T;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 1]; }
  function css(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? (c[3] == null ? 1 : c[3]) : a) + ')'; }
  function lighten(c, t) { return mix(c, [255, 255, 255], t); }
  function darken(c, t) { return mix(c, [0, 0, 0], t); }

  /* ---------- chess art (same paths as boards-grid.js chessPiece, 40-unit box) ---------- */
  var BASE = 'M10.5 36.8h19a1.6 1.6 0 0 0 1.6-1.6v-1.2a1.6 1.6 0 0 0-1.6-1.6h-19a1.6 1.6 0 0 0-1.6 1.6v1.2a1.6 1.6 0 0 0 1.6 1.6z';
  var ART = {
    P: { body: [BASE, 'M14.6 32.4C15 27.4 17 24.4 17.6 21.6h4.8c.6 2.8 2.6 5.8 3 10.8z', 'M15.6 21.8h8.8a1.1 1.1 0 0 0 0-2.2h-8.8a1.1 1.1 0 0 0 0 2.2z'], circ: [[20, 14.4, 5]], det: [] },
    R: { body: [BASE, 'M13.6 32.4l1-14.4h10.8l1 14.4z', 'M12 18.4h16V9.6h-3.4v3h-2.8v-3h-3.6v3h-2.8v-3H12z'], circ: [], det: ['M14.8 18.2h10.4'] },
    N: { body: [BASE, 'M13.6 32.4C13.6 27 16.2 24 19.4 21.6 17 22 14.6 23 12.6 23.6c-2 .5-3.4-1-2.8-2.8L16 13.4c1-3 2.4-5 4-6L21 5l1.6 2.6c4.4 1.4 7 6.2 7 12.6 0 4.6-1.4 8.6-2.4 12.2z'], circ: [], det: ['M17.6 13.6h.01', 'M22.4 9.6c2.6 1.6 4 4.6 4.2 8.6'] },
    K: { body: [BASE, 'M13.6 32.4C12.6 27.4 11 22.6 11.4 19.8c.5-3.6 4.6-4.4 8.6-1.6 4-2.8 8.1-2 8.6 1.6.4 2.8-1.2 7.6-2.2 12.6z', 'M16 17.6c0-3 1.8-4.8 4-4.8s4 1.8 4 4.8z', 'M18.8 3.6h2.4v3h3v2.4h-3v4.2h-2.4V9h-3V6.6h3z'], circ: [], det: ['M14.4 28h11.2', 'M20 18.2v9.4'] }
  };

  /* ---------- sprite painters: each draws into a w x h unit box ---------- */
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var PAINT = {
    chess: function (g, T, o) {
      var black = o.side === 'b', a = ART[o.piece];
      var body = black ? T['stone-black'] : T['stone-white'], det = black ? T['stone-white'] : T['stone-black'];
      var edge = black ? T['chess-b-edge'] : mix(T['stone-black'], T['stone-white'], 0.45);
      g.fillStyle = css(body); g.strokeStyle = css(edge); g.lineWidth = 1.1; g.lineJoin = 'round';
      a.body.forEach(function (d) { var p = new Path2D(d); g.fill(p); g.stroke(p); });
      a.circ.forEach(function (c) { circle(g, c[0], c[1], c[2]); g.fill(); g.stroke(); });
      g.strokeStyle = css(det); g.lineWidth = 1.4; g.lineCap = 'round';
      a.det.forEach(function (d) { g.stroke(new Path2D(d)); });
    },
    stone: function (g, T, o) {
      var c = o.side === 'b' ? T['stone-black'] : T['stone-white'];
      var gr = g.createRadialGradient(15, 14, 2, 20, 20, 16);
      gr.addColorStop(0, css(lighten(c, o.side === 'b' ? 0.25 : 0.4))); gr.addColorStop(1, css(darken(c, o.side === 'b' ? 0 : 0.1)));
      g.fillStyle = gr; circle(g, 20, 20, 15); g.fill();
    },
    chip: function (g, T, o) {
      var c = o.color, i;
      g.fillStyle = css(c); circle(g, 20, 20, 16); g.fill();
      g.strokeStyle = css(lighten(c, 0.85)); g.lineWidth = 3.2;
      for (i = 0; i < 6; i++) { var a0 = i * Math.PI / 3; g.beginPath(); g.arc(20, 20, 14.2, a0, a0 + 0.32); g.stroke(); }
      g.strokeStyle = css(lighten(c, 0.6)); g.lineWidth = 0.9; circle(g, 20, 20, 10.2); g.stroke();
      g.fillStyle = css(darken(c, 0.12)); circle(g, 20, 20, 9.4); g.fill();
    },
    c4: function (g, T, o) {
      var c = o.color;
      g.fillStyle = css(c); circle(g, 20, 20, 15.5); g.fill();
      g.strokeStyle = css(darken(c, 0.2)); g.lineWidth = 1.6; circle(g, 20, 20, 10.5); g.stroke();
      g.strokeStyle = css(lighten(c, 0.25)); g.lineWidth = 0.9; circle(g, 20, 20, 12.2); g.stroke();
    },
    othello: function (g, T) {
      g.fillStyle = css(T['stone-white']); circle(g, 20, 21.6, 15); g.fill();
      g.fillStyle = css(T['stone-black']); circle(g, 20, 19, 15); g.fill();
      g.strokeStyle = css(mix(T['stone-black'], T['stone-white'], 0.3)); g.lineWidth = 0.8; circle(g, 20, 19, 15); g.stroke();
    },
    checker: function (g, T, o) {
      var c = o.side === 'b' ? T.loss : T['stone-black'];
      g.fillStyle = css(c); circle(g, 20, 20, 14.6); g.fill();
      g.strokeStyle = css(lighten(c, 0.22)); g.lineWidth = 1.2; circle(g, 20, 20, 10); g.stroke(); circle(g, 20, 20, 6.5); g.stroke();
    },
    card: function (g, T, o) {
      var face = T['theme-card-face'] === T.text ? T['stone-white'] : T['theme-card-face'];
      rrect(g, 4, 1, 32, 46, 3.4);
      if (!o.face) {
        var back = T['theme-card-back'] === T.text ? T.accent : T['theme-card-back'];
        g.fillStyle = css(face); g.fill(); g.strokeStyle = css(mix(face, T['stone-black'], 0.25)); g.lineWidth = 0.8; g.stroke();
        g.save(); rrect(g, 7, 4, 26, 40, 2); g.fillStyle = css(back); g.fill(); g.clip();
        g.strokeStyle = css(lighten(back, 0.3)); g.lineWidth = 0.7;
        for (var k = -40; k < 40; k += 5) { g.beginPath(); g.moveTo(7 + k, 4); g.lineTo(47 + k, 44); g.stroke(); }
        g.restore(); return;
      }
      g.fillStyle = css(face); g.fill(); g.strokeStyle = css(mix(face, T['stone-black'], 0.25)); g.lineWidth = 0.8; g.stroke();
      var red = o.suit === '♥' || o.suit === '♦', ink = red ? T.loss : T['stone-black'];
      g.fillStyle = css(ink); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 9px system-ui,sans-serif'; g.fillText(o.rank, 10.5, 8.5);
      g.font = '8px system-ui,sans-serif'; g.fillText(o.suit, 10.5, 16.5);
      g.font = '20px system-ui,sans-serif'; g.fillText(o.suit, 20, 27);
    },
    mahjong: function (g, T, o) {
      var face = T['stone-white'], side = T.win;
      rrect(g, 7, 4, 28, 40, 4); g.fillStyle = css(side); g.fill();
      rrect(g, 5, 2, 28, 38, 4); g.fillStyle = css(face); g.fill();
      g.strokeStyle = css(mix(face, T['stone-black'], 0.2)); g.lineWidth = 0.7; g.stroke();
      if (o.glyph === 'dots') {
        [[13, 11], [25, 11], [19, 21], [13, 31], [25, 31]].forEach(function (p, i) {
          g.fillStyle = css(i === 2 ? T.loss : T.win); circle(g, p[0], p[1], 3.6); g.fill();
          g.strokeStyle = css(face); g.lineWidth = 0.8; circle(g, p[0], p[1], 1.8); g.stroke();
        });
      } else {
        g.fillStyle = css(T.loss); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 20px "Hiragino Sans","PingFang SC",system-ui,sans-serif'; g.fillText('中', 19, 22);
      }
    },
    hex: function (g, T) {
      g.beginPath();
      for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(20 + 16 * Math.cos(a), 20 + 16 * Math.sin(a)); }
      g.closePath(); g.fillStyle = css(T.accent); g.fill();
      g.strokeStyle = css(lighten(T.accent, 0.35)); g.lineWidth = 1.4; g.stroke();
    }
  };

  /* ---------- cast: 10 kinds, defs pre-rasterised ---------- */
  function castDefs(T) {
    var c4y = lighten(T.draw, 0.18);
    return [
      { k: 'chess', o: { side: 'w', piece: 'K' } }, { k: 'chess', o: { side: 'b', piece: 'N' } },
      { k: 'chess', o: { side: 'w', piece: 'R' } }, { k: 'chess', o: { side: 'b', piece: 'P' } },
      { k: 'chess', o: { side: 'b', piece: 'K' } }, { k: 'chess', o: { side: 'w', piece: 'N' } },
      { k: 'stone', o: { side: 'b' } }, { k: 'stone', o: { side: 'w' } },
      { k: 'chip', o: { color: T.loss } }, { k: 'chip', o: { color: T.accent } }, { k: 'chip', o: { color: T.text } },
      { k: 'c4', o: { color: T.loss } }, { k: 'c4', o: { color: c4y } },
      { k: 'othello', o: {} },
      { k: 'card', o: { face: false }, h: 48 }, { k: 'card', o: { face: true, rank: 'A', suit: '♠' }, h: 48 },
      { k: 'card', o: { face: true, rank: 'K', suit: '♥' }, h: 48 },
      { k: 'mahjong', o: { glyph: 'dots' }, h: 46 }, { k: 'mahjong', o: { glyph: 'zhong' }, h: 46 },
      { k: 'hex', o: {} }, { k: 'checker', o: { side: 'b' } }, { k: 'checker', o: { side: 'w' } }
    ];
  }
  var SRC = 200, PAD = 60, BLURS = [0, 4, 7, 10, 15];
  function raster(def, T) {
    var h = def.h || 40, sc = SRC / 40, w = SRC + PAD * 2, hh = h * sc + PAD * 2;
    var base = document.createElement('canvas'); base.width = w; base.height = hh;
    var g = base.getContext('2d'); g.translate(PAD, PAD); g.scale(sc, sc);
    try { PAINT[def.k](g, T, def.o); } catch (e) { warn(e); }
    if (T.dark) {
      var sil = document.createElement('canvas'); sil.width = w; sil.height = hh;
      var si = sil.getContext('2d'); si.drawImage(base, 0, 0); si.globalCompositeOperation = 'source-in';
      si.fillStyle = css(T.text, 1); si.fillRect(0, 0, w, hh);
      var rim = document.createElement('canvas'); rim.width = w; rim.height = hh;
      var rg = rim.getContext('2d'); rg.globalAlpha = 0.35;
      for (var a8 = 0; a8 < 8; a8++) { var an = a8 * Math.PI / 4; rg.drawImage(sil, Math.cos(an) * 6, Math.sin(an) * 6); }
      rg.globalAlpha = 1; rg.globalCompositeOperation = 'destination-out'; rg.drawImage(base, 0, 0);
      var hi = document.createElement('canvas'); hi.width = w; hi.height = hh;
      var hg = hi.getContext('2d'); hg.drawImage(sil, 0, 0); hg.globalCompositeOperation = 'destination-out'; hg.drawImage(sil, 0, 4);
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.22; g.globalCompositeOperation = 'source-atop'; g.drawImage(hi, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'destination-over'; g.drawImage(rim, 0, 0); g.globalCompositeOperation = 'source-over';
    }
    var out = { w: w, h: hh, unitH: h, v: [] };
    BLURS.forEach(function (b) {
      if (!b) { out.v.push(base); return; }
      var c = document.createElement('canvas'); c.width = w; c.height = hh;
      var x = c.getContext('2d'); x.filter = 'blur(' + b + 'px)'; x.drawImage(base, 0, 0); out.v.push(c);
    });
    var sh = document.createElement('canvas'); sh.width = w; sh.height = hh;
    var sx = sh.getContext('2d'); sx.filter = 'blur(22px)'; sx.drawImage(base, 0, 0);
    sx.filter = 'none'; sx.globalCompositeOperation = 'source-in'; sx.fillStyle = css(mix(T.text, T.bg, 0.15)); sx.fillRect(0, 0, w, hh);
    out.shadow = sh;
    return out;
  }

  /* ---------- layers ---------- */
  var LAYERS = {
    far:  { size: [16, 26], speed: [4, 8], alpha: 0.38, blur: 4, par: 4, z: 0.15 },
    mid:  { size: [42, 62], speed: [7, 13], alpha: 1, blur: 0, par: 8, z: 0.35 },
    near: { size: [118, 156], speed: [16, 24], alpha: 1, blur: 1, par: 14, z: 2.4 }
  };
  var COUNTS = [{ far: 11, mid: 9, near: 3 }, { far: 11, mid: 8, near: 2 }, { far: 10, mid: 7, near: 1 }];
  var CALM = [1, 0.7, 0.5];
  function prefersReduced() {
    return document.documentElement.classList.contains('reduced-motion') ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function reduceTransparency() { return !!(window.matchMedia && matchMedia('(prefers-reduced-transparency: reduce)').matches); }

  function mount(host, opts) {
    opts = opts || {};
    var cv = document.createElement('canvas');
    cv.className = 'sc-canvas'; cv.setAttribute('aria-hidden', 'true'); cv.setAttribute('tabindex', '-1');
    host.appendChild(cv);
    var ctx = cv.getContext('2d');
    var S = { depth: clamp(opts.depth | 0, 0, 2), still: !!(opts.still || opts.lowPower) || prefersReduced(),
      paused: false, dead: false, W: 0, H: 0, dpr: 1, T: null, sprites: [], ents: [], quiet: [], qt: 0,
      tilt: null, ptr: null, par: { x: 0, y: 0 }, tr: null, frames: [], raf: 0, last: 0, t: 0, bgc: null, stars: [] };

    function tokens() {
      S.T = readTokens(); S.rt = reduceTransparency();
      var defs = castDefs(S.T); S.sprites = defs.map(function (d) { return raster(d, S.T); });
      S.ents.forEach(function (e) { if (e.si >= S.sprites.length) e.si = 0; });
    }
    function resize() {
      var r = host.getBoundingClientRect(); S.W = Math.max(1, r.width); S.H = Math.max(1, r.height);
      S.dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(S.W * S.dpr); cv.height = Math.round(S.H * S.dpr);
      S.stars = []; for (var i = 0; i < Math.round(S.W * S.H / 5200); i++) S.stars.push([Math.random() * S.W, Math.random() * S.H, rnd(0.3, 0.9), rnd(0.15, 0.55), rnd(0, 6)]);
    }
    function readQuiet() {
      try { S.quiet = (opts.quiet && opts.quiet()) || []; } catch (e) { S.quiet = []; }
    }
    function inQuiet(x, y, r, mg) {
      if (mg == null) mg = 8;
      for (var i = 0; i < S.quiet.length; i++) { var q = S.quiet[i];
        if (x + r > q.left - mg && x - r < q.right + mg && y + r > q.top - mg && y - r < q.bottom + mg) return true; }
      return false;
    }
    function qbox() {
      var l = 1e9, t = 1e9, r = -1e9, b = -1e9;
      S.quiet.forEach(function (q) { l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
      if (l > r) return { cx: S.W / 2, cy: S.H * 0.4, w: 0, h: 0 };
      return { cx: (l + r) / 2, cy: (t + b) / 2, w: r - l, h: b - t };
    }
    function emptiestCell(layer) {
      var c = []; for (var k = 0; k < 12; k++) c.push(0);
      for (var k2 = 0; k2 < 12; k2++) { var cx0 = (k2 % 3 + 0.5) * S.W / 3, cy0 = (((k2 / 3) | 0) + 0.5) * S.H / 4; if (inQuiet(cx0, cy0, 0, 16)) c[k2] += 2; }
      S.ents.forEach(function (e) { if (e.layer !== layer || e.dying) return;
        var ci = clamp((e.x / S.W * 3) | 0, 0, 2) + 3 * clamp((e.y / S.H * 4) | 0, 0, 3); c[ci]++; });
      var best = 0; for (var i = 1; i < 12; i++) if (c[i] < c[best] || (c[i] === c[best] && Math.random() < 0.4)) best = i;
      return best;
    }
    function steer(e, dt) {
      for (var i = 0; i < S.quiet.length; i++) { var q = S.quiet[i], l = q.left - 16, t = q.top - 16, rt = q.right + 16, b = q.bottom + 16;
        var nx = clamp(e.x, l, rt), ny = clamp(e.y, t, b), dx = e.x - nx, dy = e.y - ny, d = Math.hypot(dx, dy);
        if (d === 0) { var el = e.x - l, er = rt - e.x, et = e.y - t, eb = b - e.y, mn = Math.min(el, er, et, eb), f = 900 * dt;
          if (mn === el) e.vx -= f; else if (mn === er) e.vx += f; else if (mn === et) e.vy -= f; else e.vy += f; continue; }
        var R = 48 + e.size * 0.3; if (d > R) continue;
        var g2 = (1 - d / R) * 420 * dt; e.vx += dx / d * g2; e.vy += dy / d * g2;
        var vin = -(e.bvx * dx + e.bvy * dy) / d; if (vin > 0) { e.bvx += dx / d * vin * 0.9 * dt * 3; e.bvy += dy / d * vin * 0.9 * dt * 3; }
      }
    }
    function emptiestEdge(layer) {
      var c = [0, 0, 0, 0], qb = qbox();
      S.ents.forEach(function (e) { if (e.layer !== layer || e.dying) return;
        c[0] += e.x < qb.cx ? 1 : 0; c[1] += e.x >= qb.cx ? 1 : 0; c[2] += e.y < qb.cy ? 1 : 0; c[3] += e.y >= qb.cy ? 1 : 0; });
      var best = 0; for (var i = 1; i < 4; i++) if (c[i] < c[best] || (c[i] === c[best] && Math.random() < 0.5)) best = i;
      return best;
    }
    function nearPlace(e, initial, sp) {
      var used = {}, others = S.ents.filter(function (o) { return o.layer === 'near' && !o.dying && o !== e; });
      others.forEach(function (o) { used[o.nside] = 1; });
      var free = [0, 1, 2, 3].filter(function (k) { return !used[k]; }); S.nrot = ((S.nrot || 0) + 1) % 4;
      var side = free.length ? free[S.nrot % free.length] : S.nrot; e.nside = side;
      var dir = Math.random() < 0.5 ? -1 : 1, m = e.size * 0.6 + 10;
      var off = function (D) { return rnd(-0.08, 0.2) * D; };
      if (side < 2) {
        e.x = side === 0 ? off(S.W) : S.W - off(S.W);
        e.y = initial ? spaced(others, true) : (dir > 0 ? -m : S.H + m); e.bvy = dir * sp; e.bvx = rnd(-0.1, 0.1) * sp;
      } else {
        e.y = side === 2 ? off(S.H) : S.H - off(S.H);
        e.x = initial ? spaced(others, false) : (dir > 0 ? -m : S.W + m); e.bvx = dir * sp; e.bvy = rnd(-0.1, 0.1) * sp;
      }
    }
    function spaced(others, vert) {
      var best = 0, bd = -1;
      for (var k = 0; k < 12; k++) { var c = vert ? rnd(0, S.H) : rnd(0, S.W), d = 1e9;
        others.forEach(function (o) { d = Math.min(d, Math.abs((vert ? o.y : o.x) - c) + (vert ? 0 : S.H * 0.2)); });
        if (d > bd) { bd = d; best = c; } }
      return best;
    }
    function band(e, dt) {
      var minD = S.H * 0.4;
      S.ents.forEach(function (o) { if (o === e || o.layer !== 'near' || o.dying) return;
        var dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 1; if (d >= minD) return;
        var f = (1 - d / minD) * 160 * dt; e.vx += dx / d * f; e.vy += dy / d * f; });
      var bx = S.W * 0.22, by = S.H * 0.22, ix = Math.min(e.x, S.W - e.x), iy = Math.min(e.y, S.H - e.y);
      if (ix <= bx || iy <= by) return;
      var f = 300 * dt;
      if (ix - bx < iy - by) e.vx += (e.x < S.W / 2 ? -f : f); else e.vy += (e.y < S.H / 2 ? -f : f);
    }
    function spawn(layer, initial, opts2) {
      opts2 = opts2 || {};
      var L = LAYERS[layer], size = Math.min(rnd(L.size[0], L.size[1]), layer === 'near' ? S.W * 0.4 : 1e9), sp = rnd(L.speed[0], L.speed[1]);
      var e = { layer: layer, si: (Math.random() * S.sprites.length) | 0, size: size, rot: rnd(-0.5, 0.5),
        vr: rnd(-1, 1) * (rnd(2, 7) * Math.PI / 180), ph: rnd(0, 6.28), dim: 0, alpha: 1, spin: 0, z: 1 };
      var ang = rnd(0, Math.PI * 2); e.bvx = Math.cos(ang) * sp; e.bvy = Math.sin(ang) * sp;
      var tries = 0;
      if (false) {
        var qb = qbox(), n = opts2.n, a1 = (opts2.i + rnd(-0.25, 0.25)) / n * Math.PI * 2 - Math.PI / 2;
        do { var rx = qb.w / 2 + rnd(24, 80), ry = qb.h / 2 + rnd(40, 120);
          e.x = clamp(qb.cx + Math.cos(a1) * rx, size * 0.4, S.W - size * 0.4); e.y = clamp(qb.cy + Math.sin(a1) * ry, size * 0.4, S.H - size * 0.4); a1 += 0.15; tries++;
        } while (inQuiet(e.x, e.y, size / 2) && tries < 30);
      } else if (initial) {
        var rr = layer === 'far' ? 0 : layer === 'near' ? size * 0.25 : size * 0.4;
        do { e.x = rnd(0, S.W); e.y = rnd(0, S.H); tries++; } while (layer !== 'far' && inQuiet(e.x, e.y, rr, 16) && tries < 60);
      } else {
        var m = size * 0.6 + 10, cell = emptiestCell(layer), cw = S.W / 3, ch = S.H / 4;
        var tx = (cell % 3 + 0.5) * cw, ty = (((cell / 3) | 0) + 0.5) * ch;
        var dl = tx, dr = S.W - tx, dt0 = ty, db = S.H - ty, mn = Math.min(dl, dr, dt0, db);
        if (mn === dl) { e.x = -m; e.y = ty + rnd(-ch, ch) * 0.4; }
        else if (mn === dr) { e.x = S.W + m; e.y = ty + rnd(-ch, ch) * 0.4; }
        else if (mn === dt0) { e.y = -m; e.x = tx + rnd(-cw, cw) * 0.4; }
        else { e.y = S.H + m; e.x = tx + rnd(-cw, cw) * 0.4; }
        var vdx = tx - e.x, vdy = ty - e.y, vd = Math.hypot(vdx, vdy) || 1;
        e.bvx = vdx / vd * sp + rnd(-0.3, 0.3) * sp; e.bvy = vdy / vd * sp + rnd(-0.3, 0.3) * sp;
      }
      if (layer === 'near') nearPlace(e, initial, sp);
      e.vx = e.bvx; e.vy = e.bvy;
      return e;
    }
    function populate() {
      var C = COUNTS[S.depth]; S.ents = [];
      ['far', 'mid', 'near'].forEach(function (l) { for (var i = 0; i < C[l]; i++) S.ents.push(spawn(l, true, { ring: true, i: i, n: C[l] })); });
    }
    function counts() { var c = { far: 0, mid: 0, near: 0 }; S.ents.forEach(function (e) { if (!e.dying) c[e.layer]++; }); return c; }

    /* ---------- update ---------- */
    function step(dt) {
      var calm = CALM[S.depth], tr = S.tr, p = 0;
      if (tr) { p = clamp((S.t - tr.t0) / tr.ms, 0, 1); p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; tr.p = p; }
      if (S.t - S.qt > 0.4) { readQuiet(); S.qt = S.t; }
      for (var i = S.ents.length - 1; i >= 0; i--) {
        var e = S.ents[i], boost = tr ? 1 + 2.5 * Math.sin(Math.PI * p) * (e.layer === 'near' ? 1.4 : 1) : 1;
        e.vx += (e.bvx - e.vx) * Math.min(1, dt * 1.2); e.vy += (e.bvy - e.vy) * Math.min(1, dt * 1.2);
        if (e.layer !== 'far') steer(e, dt);
        if (e.layer === 'near' && !e.dying) band(e, dt);
        e.x += e.vx * dt * calm * boost; e.y += e.vy * dt * calm * boost;
        e.spin *= Math.exp(-dt * 1.6); e.rot += (e.vr * calm + e.spin) * dt;
        var m = e.size * (e.layer === 'near' ? 0.9 : 0.7) + 14;
        if (!e.leaving && !e.dying && (e.x < -m || e.x > S.W + m || e.y < -m || e.y > S.H + m)) { S.ents[i] = spawn(e.layer, false); continue; }
        if (e.leaving && (e.x < -m * 2 || e.x > S.W + m * 2 || e.y < -m * 2 || e.y > S.H + m * 2)) { S.ents[i] = spawn(e.layer, false); continue; }
        var q = (e.layer !== 'far' && inQuiet(e.x, e.y, e.size * 0.4)) ? 1 : 0;
        e.dim += (q - e.dim) * Math.min(1, dt * 4);
      }
      if (tr && S.t - tr.t0 >= tr.ms) {
        S.ents = S.ents.filter(function (e) { return !e.dying; });
        S.ents.forEach(function (e) { e.arriving = false; });
        S.tr = null;
      }
      // parallax target
      var tx = 0, ty = 0;
      if (S.tilt) { tx = clamp(S.tilt.g / 25, -1, 1); ty = clamp((S.tilt.b - 45) / 25, -1, 1); }
      else if (S.ptr) { tx = S.ptr.x / S.W * 2 - 1; ty = S.ptr.y / S.H * 2 - 1; }
      else { tx = Math.sin(S.t * 0.13) * 0.6; ty = Math.sin(S.t * 0.09 + 1) * 0.5; }
      S.par.x += (tx - S.par.x) * Math.min(1, dt * 2.5); S.par.y += (ty - S.par.y) * Math.min(1, dt * 2.5);
    }

    /* ---------- draw ---------- */
    function quietCentre() {
      if (!S.quiet.length) return [S.W / 2, S.H * 0.36];
      var l = 1e9, t = 1e9, r = -1e9, b = -1e9;
      S.quiet.forEach(function (q) { l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); });
      return [(l + r) / 2, t + (b - t) * 0.3];
    }
    function drawBg() {
      var T = S.T, W = S.W, H = S.H;
      ctx.fillStyle = css(T.bg, 1); ctx.fillRect(0, 0, W, H);
      if (S.rt) return;
      var qc = quietCentre(), g;
      if (T.dark) {
        for (var i = 0; i < S.stars.length; i++) { var s = S.stars[i], tw = S.still ? 1 : 0.65 + 0.35 * Math.sin(S.t * 0.7 + s[4]);
          ctx.fillStyle = css(T.text, s[3] * tw * 0.6); ctx.fillRect(s[0] + S.par.x * 2, s[1] + S.par.y * 2, s[2], s[2]); }
        g = ctx.createRadialGradient(qc[0], qc[1], 0, qc[0], qc[1], W * 0.75);
        g.addColorStop(0, css(T.accent, 0.12)); g.addColorStop(0.55, css(T.accent, 0.04)); g.addColorStop(1, css(T.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      } else {
        g = ctx.createRadialGradient(W * 0.2, H * 0.05, 0, W * 0.2, H * 0.05, H * 0.8);
        g.addColorStop(0, css(T.accent, 0.07)); g.addColorStop(1, css(T.accent, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        g = ctx.createRadialGradient(qc[0], qc[1], 0, qc[0], qc[1], W * 0.7);
        g.addColorStop(0, css(lighten(T.bg, 0.6), 0.7)); g.addColorStop(1, css(T.bg, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }
    var ORDER = { far: 0, mid: 1, near: 2 };
    function draw() {
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.globalAlpha = 1;
      drawBg();
      var tr = S.tr, p = tr ? tr.p : 0, fwd = tr ? tr.fwd : true, cx = S.W / 2, cy = S.H * 0.42, light = !S.T.dark;
      var list = S.ents.slice().sort(function (a, b) { return ORDER[a.layer] - ORDER[b.layer]; });
      for (var i = 0; i < list.length; i++) {
        var e = list[i], L = LAYERS[e.layer], sp = S.sprites[e.si]; if (!sp) continue;
        var z = 1, a = L.alpha, bi = L.blur;
        if (tr) {
          if (e.dying) { z = fwd ? 1 + 2.4 * p : 1 - 0.3 * p; a *= 1 - p; if (fwd && p > 0.3) bi = 3; }
          else if (e.arriving) { if (fwd) a *= p; else { z = 1 + 2.4 * (1 - p); a *= p; if (p < 0.7) bi = 3; } }
          else z = fwd ? 1 + L.z * Math.sin(Math.PI * p) : 1 - L.z * 0.4 * Math.sin(Math.PI * p);
        }
        if (e.dim > 0.4 && bi < 2) bi = 2;
        a *= 1 - 0.8 * e.dim; if (S.rt) a *= 0.6;
        if (a <= 0.01) continue;
        var br = S.still ? 1 : 1 + 0.035 * Math.sin(S.t * 0.4 + e.ph);
        var k = e.size / SRC * z * br;
        var x = cx + (e.x - cx) * z - S.par.x * L.par, y = cy + (e.y - cy) * z - S.par.y * L.par;
        var w = sp.w * k, h = sp.h * k;
        ctx.save(); ctx.translate(x, y);
        if (light && e.layer !== 'far' && !S.rt) {
          ctx.globalAlpha = a * (e.layer === 'near' ? 0.14 : 0.22);
          ctx.drawImage(sp.shadow, -w / 2 + e.size * 0.08, -h / 2 + e.size * 0.2 * z, w, h);
        }
        ctx.rotate(e.rot); ctx.globalAlpha = a;
        ctx.drawImage(sp.v[bi], -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    /* ---------- loop ---------- */
    function frame(now) {
      S.raf = 0; if (S.dead) return;
      try {
        var dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016; S.last = now; S.t += dt;
        step(dt); draw();
        S.frames.push(now); while (S.frames.length && now - S.frames[0] > 2000) S.frames.shift();
      } catch (err) { warn(err); }
      schedule();
    }
    function schedule() { if (!S.raf && !S.dead && !S.paused && !S.still && !document.hidden) S.raf = requestAnimationFrame(frame); }
    function stop() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; S.last = 0; }
    function renderStill() { try { readQuiet(); S.par.x = S.par.y = 0; S.tr = null; draw(); } catch (err) { warn(err); } }

    /* ---------- input ---------- */
    var down = null, askedTilt = false;
    function local(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * (S.W / (r.width || 1)), y: (ev.clientY - r.top) * (S.H / (r.height || 1)) }; }
    function onTilt(ev) { if (ev.gamma == null || ev.beta == null) return; S.tilt = { g: ev.gamma, b: ev.beta }; }
    function askTilt() {
      if (askedTilt) return; askedTilt = true;
      var D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        try { D.requestPermission().then(function (r) { if (r === 'granted') window.addEventListener('deviceorientation', onTilt); }).catch(function () {}); } catch (e) {}
      }
    }
    function repel(pt, dt) {
      for (var i = 0; i < S.ents.length; i++) { var e = S.ents[i], dx = e.x - pt.x, dy = e.y - pt.y, d = Math.sqrt(dx * dx + dy * dy) || 1, R = 70 + e.size * 0.5;
        if (d > R) continue; var f = (1 - d / R) * (e.layer === 'far' ? 300 : e.layer === 'near' ? 500 : 900) * dt;
        e.vx += dx / d * f; e.vy += dy / d * f; }
    }
    function onDown(ev) {
      if (S.still) return; askTilt();
      down = { p: local(ev), t: performance.now(), last: performance.now(), moved: 0 };
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    function onMove(ev) {
      if (S.still) return; var pt = local(ev);
      if (ev.pointerType === 'mouse') S.ptr = pt;
      if (!down) return;
      var now = performance.now(), dt = Math.min(0.05, (now - down.last) / 1000); down.last = now;
      down.moved += Math.abs(pt.x - down.p.x) + Math.abs(pt.y - down.p.y); down.p = pt;
      repel(pt, Math.max(dt, 0.016));
    }
    function onUp(ev) {
      if (!down || S.still) { down = null; return; }
      var pt = local(ev), quick = performance.now() - down.t < 350 && down.moved < 10; down = null;
      if (!quick) return;
      var best = null, bd = 1e9;
      S.ents.forEach(function (e) { if (e.layer === 'far' || e.dying) return; var d = Math.hypot(e.x - pt.x, e.y - pt.y);
        if (d < e.size * 0.6 && (d < bd || (best && best.layer === 'mid' && e.layer === 'near'))) { best = e; bd = d; } });
      if (!best) { repel(pt, 0.05); return; }
      var dx = best.x - pt.x || rnd(-1, 1), dy = best.y - pt.y || rnd(-1, 1), d = Math.hypot(dx, dy) || 1;
      best.spin = (Math.random() < 0.5 ? -1 : 1) * 3.2; best.leaving = true;
      best.bvx = dx / d * 45 + best.bvx * 0.3; best.bvy = dy / d * 45 + best.bvy * 0.3;
    }
    function onLeave() { S.ptr = null; }
    function onVis() { if (document.hidden) stop(); else schedule(); }
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('deviceorientation', onTilt);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { resize(); if (S.still) renderStill(); }) : null;
    if (ro) ro.observe(host);

    /* ---------- boot ---------- */
    tokens(); resize(); readQuiet(); populate();
    if (S.still) renderStill(); else schedule();
    if (typeof opts.onReady === 'function') setTimeout(function () { try { opts.onReady(); } catch (e) { warn(e); } }, 0);

    var ctl = {
      setDepth: function (n, ms) {
        n = clamp(n | 0, 0, 2); if (n === S.depth || S.dead) return;
        var fwd = n > S.depth; S.depth = n;
        if (S.still) { populate(); renderStill(); return; }
        if (S.tr) { S.ents = S.ents.filter(function (e) { return !e.dying; }); S.ents.forEach(function (e) { e.arriving = false; }); }
        var C = COUNTS[n];
        S.ents.forEach(function (e) { if (e.layer === 'near') e.dying = true; });
        for (var i = 0; i < C.near; i++) { var e = spawn('near', true); e.arriving = true; S.ents.push(e); }
        var mids = S.ents.filter(function (e) { return e.layer === 'mid' && !e.dying; });
        while (mids.length > C.mid) mids.pop().dying = true;
        for (var j = mids.length; j < C.mid; j++) { var m = spawn('mid', true); m.arriving = true; S.ents.push(m); }
        if (fwd) for (var f = 0; f < 2; f++) { var fe = spawn('far', true); fe.arriving = true; S.ents.push(fe); }
        var fars = S.ents.filter(function (e) { return e.layer === 'far' && !e.dying && !e.arriving; });
        var excess = S.ents.filter(function (e) { return e.layer === 'far' && !e.dying; }).length - C.far;
        while (excess-- > 0 && fars.length) fars.pop().dying = true;
        S.tr = { t0: S.t, ms: Math.max(50, ms == null ? 700 : ms) / 1000, p: 0, fwd: fwd };
        schedule();
      },
      pause: function () { S.paused = true; stop(); },
      resume: function () { S.paused = false; schedule(); },
      setStill: function (b) { S.still = !!b; if (S.still) { stop(); renderStill(); } else schedule(); },
      refreshTokens: function () { tokens(); if (S.still || S.paused) renderStill(); },
      destroy: function () {
        S.dead = true; stop(); if (ro) ro.disconnect();
        document.removeEventListener('visibilitychange', onVis); window.removeEventListener('deviceorientation', onTilt);
        if (cv.parentNode) cv.parentNode.removeChild(cv); S.sprites = []; S.ents = [];
      },
      stats: function () {
        var f = S.frames, fps = f.length > 1 ? Math.round((f.length - 1) * 1000 / (f[f.length - 1] - f[0])) : 0;
        return { sprites: S.ents.filter(function (e) { return !e.dying; }).length, fps: fps, layer: counts() };
      }
    };
    return ctl;
  }

  window.ESScene = { mount: mount, version: '1.0.0' };
})();
