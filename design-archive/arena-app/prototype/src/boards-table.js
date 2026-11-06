/* =====================================================================
   eSlams Arena app prototype | src/boards-table.js  [C2]
   Registers the table, panel and custom families into window.ESB
   (boards-grid.js [C1] loads first and owns render, tiles, card, .bd-*).
   Families: card_table, dice_table, payoff_matrix, auction_panel,
             economic_panel, custom (mancala, morris, pentago,
             backgammon, shogi, xiangqi).
   CSS: boards-table.css, every class prefixed .bd-t-.
   Optional ViewState extras read when present (all degrade cleanly):
     card_table   center.cards[i].seat  (who played it; compass trick cross)
                  yourHand[i].hint {rank?,suit?}  (hanabi knowledge)
                  seats[i].lastLabel  (per-seat last action pill)
     payoff_matrix committed:{p1:bool,p2:bool}   (sealed vs choosing)
     auction_panel  maxValue (axis top; else 100)
     economic_panel total (pot to split), maxRounds
     legal actions  card:{rank,suit} | index (hand index) for kind 'card';
                    value:{count,face} | count+face for kind 'bid';
                    verb (commit label), min/max/step for a range action.
   ===================================================================== */
(function () {
  'use strict';
  var W = window;
  W.ESB = W.ESB || { families: {} };
  var ESB = W.ESB;
  ESB.families = ESB.families || {};
  if (!ESB.registerFamily) ESB.registerFamily = function (n, impl) { ESB.families[n] = impl; };

  /* ---------- tiny DOM helpers ---------- */
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = String(txt);
    return n;
  }
  function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function mono(txt, cls) { return el('span', 'mono bd-t-mono' + (cls ? ' ' + cls : ''), txt); }
  function MO() {
    var m = ESB.motion || {};
    return { move: m.move || 220, drop: m.drop || 320, reveal: m.reveal || 300, revealFast: m.revealFast || 180,
             result: m.result || 520, ease: m.ease || 'cubic-bezier(.2,.8,.2,1)' };
  }
  function rm(p) {
    if (p && p.reducedMotion) return true;
    try { if (ESB.reducedMotion && ESB.reducedMotion()) return true; } catch (e) { /* ignore */ }
    try { return document.documentElement.classList.contains('reduced-motion') ||
      (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function J(x) { try { return JSON.stringify(x); } catch (e) { return String(Math.random()); } }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function numWord(n) { return WORDS[n] || String(n); }

  /* ---------- suits, cards, tiles ---------- */
  var SUIT = { s: 'S', spade: 'S', spades: 'S', '♠': 'S', h: 'H', heart: 'H', hearts: 'H', '♥': 'H',
               d: 'D', diamond: 'D', diamonds: 'D', '♦': 'D', c: 'C', club: 'C', clubs: 'C', '♣': 'C' };
  var SUIT_GLYPH = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
  var MJ = { bamboo: 'bamboo', bam: 'bamboo', b: 'bamboo', dots: 'dots', dot: 'dots', circles: 'dots',
             characters: 'characters', character: 'characters', char: 'characters', man: 'characters',
             honors: 'honors', honor: 'honors', honours: 'honors', wind: 'honors', dragon: 'honors' };
  var HANABI = { red: 'R', yellow: 'Y', green: 'G', blue: 'B', white: 'W' };
  var CJK_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var HONOR = { east: '東', e: '東', south: '南', s: '南', west: '西', w: '西',
                north: '北', n: '北', red: '中', c: '中', green: '發', f: '發',
                white: '白', p: '白' };
  function suitOf(c) { return c && c.suit != null ? (SUIT[String(c.suit).toLowerCase()] || null) : null; }
  function mjSuit(c) { return c && c.suit != null ? (MJ[String(c.suit).toLowerCase()] || null) : null; }
  function hanabiCol(c) { return c && c.suit != null ? (HANABI[String(c.suit).toLowerCase()] || null) : null; }
  function cardKey(c) { return c ? (c.hidden ? 'x' : String(c.rank) + '|' + String(c.suit)) : 'x'; }
  function cardName(c) {
    if (!c || c.hidden) return 'Hidden card';
    var s = suitOf(c);
    return String(c.rank) + (s ? SUIT_GLYPH[s] : (mjSuit(c) || hanabiCol(c) ? ' ' + c.suit : ''));
  }
  function sameCard(a, b) { return !!(a && b && !a.hidden && !b.hidden && String(a.rank) === String(b.rank) && String(a.suit) === String(b.suit)); }

  /* Fallback flat card, only when boards-grid.js did not provide ESB.card. */
  if (!ESB.card) {
    ESB.card = function (c, o) {
      o = o || {};
      var up = o.faceUp !== false && c && !c.hidden;
      var n = el('div', 'bd-t-fcard' + (up ? '' : ' is-back'));
      if (!up) return n;
      var s = suitOf(c);
      if (s === 'H' || s === 'D') n.classList.add('is-red');
      add(n, el('span', 'bd-t-fcard-r mono', c.rank), el('span', 'bd-t-fcard-s', s ? SUIT_GLYPH[s] : ''));
      return n;
    };
  }

  /* Mahjong tile: mono rank corner + compact glyph. */
  function mjTile(c) {
    var su = mjSuit(c);
    var t = el('div', 'bd-t-mj bd-t-mj-' + su);
    var r = String(c.rank == null ? '' : c.rank).toLowerCase();
    var n = parseInt(r, 10);
    if (su === 'honors') {
      add(t, el('span', 'bd-t-mj-g bd-t-cjk', HONOR[r] || r.charAt(0).toUpperCase()));
      add(t, mono(r.charAt(0).toUpperCase(), 'bd-t-mj-r'));
    } else {
      add(t, mono(isFinite(n) ? n : r, 'bd-t-mj-r'));
      var g = el('span', 'bd-t-mj-g');
      if (su === 'characters') { g.classList.add('bd-t-cjk'); g.textContent = CJK_NUM[n] || r; }
      else if (su === 'dots') { for (var i = 0; i < Math.min(n || 1, 3); i++) add(g, el('i', 'bd-t-mj-dot')); }
      else { for (var j = 0; j < Math.min(n || 1, 3); j++) add(g, el('i', 'bd-t-mj-bam')); }
      add(t, g);
    }
    t.setAttribute('aria-label', (su === 'honors' ? r : n + ' ' + su) + ' tile');
    return t;
  }
  /* Hanabi card: colour band as information plus a letter cue. */
  function hanabiCard(c) {
    var col = hanabiCol(c);
    var t = el('div', 'bd-t-hb bd-t-hb-' + col);
    add(t, mono(c.rank, 'bd-t-hb-r'), el('span', 'bd-t-hb-band'), mono(col, 'bd-t-hb-l'));
    t.setAttribute('aria-label', c.suit + ' ' + c.rank);
    return t;
  }
  /* One card slot in our layout (size: xs | sm | md | lg -> card width px). */
  var CW = { xs: 20, sm: 30, md: 38, lg: 50 };
  function cardSlot(c, size, faceUp) {
    var w = el('div', 'bd-t-cw bd-t-cw-' + (size || 'md'));
    var up = faceUp !== false && c && !c.hidden;
    var inner;
    if (up && mjSuit(c)) { inner = mjTile(c); w.classList.add('is-mj'); }
    else if (up && hanabiCol(c)) inner = hanabiCard(c);
    else {
      try { inner = ESB.card(up ? c : { hidden: true }, { faceUp: up, size: CW[size] || 38 }); } catch (e) { inner = null; }
      if (!inner) inner = el('div', 'bd-t-fcard is-back');
    }
    if (!up) w.classList.add('is-back');
    w.setAttribute('data-ck', cardKey(c));
    if (up) w.setAttribute('aria-label', cardName(c));
    return add(w, inner);
  }

  /* ---------- seats and identity ---------- */
  function seatMeta(props, id, vs) {
    var m = {};
    var list = (props && props.seats) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) { m = list[i]; break; }
    var o = {};
    var k;
    for (k in (vs || {})) o[k] = vs[k];
    for (k in m) if (m[k] != null) o[k] = m[k];
    if (o.isYou == null) o.isYou = !!(props && props.youSeat === id);
    o.id = id;
    return o;
  }
  function modelFor(meta) {
    var R = (W.ESD && W.ESD.roster) || [];
    for (var i = 0; i < R.length; i++) {
      var r = R[i];
      if (meta.modelId && r.id === meta.modelId) return r;
      if (r.publicName === meta.name && (!meta.providerSlug || r.provider === meta.providerSlug)) return r;
    }
    return { id: meta.modelId || meta.name, publicName: meta.name || meta.label || 'Model', provider: meta.providerSlug || '',
             providerName: meta.providerName || meta.providerSlug || '', shortName: meta.name };
  }
  function shortName(meta) {
    if (meta.isYou) return 'You';
    var m = modelFor(meta);
    return m.shortName || m.publicName || meta.label || 'Model';
  }
  function tile(meta, size) {
    var t = null;
    try { t = meta.isYou ? (ESB.youTile && ESB.youTile(size)) : (ESB.providerTile && ESB.providerTile(modelFor(meta), size)); } catch (e) { t = null; }
    if (!t) {
      t = el('span', 'bd-t-tilefb' + (meta.isYou ? ' is-you' : ''), meta.isYou ? 'You' : String(shortName(meta)).slice(0, 2));
      t.style.width = t.style.height = size + 'px';
    }
    t.classList.add('bd-t-tile');
    return t;
  }
  function otherSeat(id) { return id === 'p1' ? 'p2' : 'p1'; }
  /* Two-seat families: [{id, meta}] with you first. */
  function duo(props) {
    var you = props.youSeat === 'p2' ? 'p2' : 'p1';
    return { you: seatMeta(props, you, { isYou: true }), them: seatMeta(props, otherSeat(you), { isYou: false }) };
  }

  /* ---------- motion helpers ---------- */
  function animIn(node, cls, delay) {
    if (!node) return;
    if (delay) node.style.animationDelay = delay + 'ms';
    node.classList.add(cls);
  }
  function rectsOf(root) {
    var out = {};
    var nodes = root.querySelectorAll('[data-k]');
    for (var i = 0; i < nodes.length; i++) out[nodes[i].getAttribute('data-k')] = nodes[i].getBoundingClientRect();
    return out;
  }
  /* FLIP: glide node from an old rect (visual px) to its new place. */
  function glide(node, from, z, ms, scale) {
    if (!node || !from) return;
    var to = node.getBoundingClientRect();
    var dx = ((from.left + from.width / 2) - (to.left + to.width / 2)) / (z || 1);
    var dy = ((from.top + from.height / 2) - (to.top + to.height / 2)) / (z || 1);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    var mo = MO();
    node.style.transition = 'none';
    node.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (scale || 0.86) + ')';
    node.getBoundingClientRect();
    requestAnimationFrame(function () {
      node.style.transition = 'transform ' + (ms || mo.move) + 'ms ' + mo.ease;
      node.style.transform = '';
    });
  }

  /* ---------- sizes: design at 354px (stage), zoom for the rest ---------- */
  var BASE_W = 354;
  var SIZE_CAP = { stage: 1, share: 300 / 354, preview: 220 / 354, poster: 120 / 354 };
  var SIZE_DEF = { stage: 1, share: 300 / 354, preview: 200 / 354, poster: 120 / 354 };
  function fitZoom(root, host, size) {
    var cap = SIZE_CAP[size] || 1;
    var w = host && host.clientWidth;
    var z = w ? Math.min(cap, w / BASE_W) : (SIZE_DEF[size] || 1);
    z = Math.max(0.2, Math.round(z * 1000) / 1000);
    root.style.zoom = z === 1 ? '' : String(z);
    return z;
  }

  /* ---------- the shared controller ----------
     renderFn(root, props, ctx) builds the whole family DOM and returns the
     last-move key. ctx: {view, prevView, rects (old [data-k] rects), z,
     anim (animate the delta), first, reduce, size, st, after:[fn]}. */
  function family(name, renderFn) {
    ESB.registerFamily(name, {
      mount: function (host, props) {
        var root = el('div', 'bd-t-root');
        host.appendChild(root);
        var st = { cur: null, curJ: null, before: null, mounted: false, lastKey: null, ui: {}, z: 1, root: root, host: host, legalJ: null, sent: false };
        function draw(p) {
          if (st.dead) return;
          p = p || {};
          var view = p.view || {};
          var size = p.size || 'stage';
          var reduce = rm(p);
          var rects = st.mounted ? rectsOf(root) : {};
          var zOld = st.z;
          /* diff against the last distinct view, so a re-render with the same
             view (legal or size changed) neither re-animates nor moves the marker */
          var vj = J(view);
          var changed = vj !== st.curJ;
          if (changed) { st.before = st.cur || null; st.cur = JSON.parse(vj); st.curJ = vj; }
          var lj = J([p.legal || [], !!p.interactive]);
          /* a new view re-arms the input too: simultaneous games (RPS, PD,
             Goofspiel) offer the same legal list every round */
          if (lj !== st.legalJ || changed) { st.ui = {}; st.sent = false; st.legalJ = lj; }
          root.className = 'bd-t-root bd-t-' + name.replace(/_/g, '-') + ' bd-size-' + size + ' bd-t-z-' + size +
            (reduce ? ' bd-t-rm' : '') + (p.interactive ? ' is-live' : '') + (st.sent ? ' is-sent' : '');
          st.z = fitZoom(root, host, size);
          var ctx = { props: p, view: view, prevView: st.before || null, rects: rects, z: zOld || 1,
                      anim: !reduce && changed && !!st.before, first: !st.mounted, reduce: reduce, size: size, st: st, after: [] };
          root.innerHTML = '';
          var key = null;
          try { key = renderFn(root, p, ctx); } catch (e) {
            root.innerHTML = '';
            add(root, el('div', 'bd-t-err', 'This board could not be drawn.'));
            if (W.console) console.error('[ESB ' + name + ']', e);
          }
          var lasts = root.querySelectorAll('.bd-last');
          for (var i = 0; i < lasts.length; i++) {
            if (i > 0) { lasts[i].classList.remove('bd-last'); continue; }
            lasts[i].classList.add('bd-t-last');
            if (reduce || (key != null && key === st.lastKey) || !changed) lasts[i].classList.add('bd-t-settled');
          }
          st.lastKey = key;
          st.mounted = true;
          ctx.after.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
        }
        draw(props);
        return {
          update: draw,
          destroy: function () { st.dead = true; if (root.parentNode) root.parentNode.removeChild(root); }
        };
      }
    });
  }

  /* ---------- shared input pieces ---------- */
  function actLabel(a) { return (a && (a.shortLabel || a.label || a.verb || a.token)) || ''; }
  function fire(st, p, a) {
    if (!a || st.sent || !p.onAction) return;
    st.sent = true;
    st.root.classList.add('is-sent');
    try { p.onAction(a); } catch (e) { if (W.console) console.error(e); }
  }
  function btn(label, cls, fn) {
    var b = el('button', 'bd-t-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  function actionRow(st, p, acts) {
    var row = el('div', 'bd-t-actions');
    acts.forEach(function (a) {
      var b = btn(actLabel(a), /^(fold|reject|pass)/i.test(actLabel(a)) ? 'is-quiet' : '', function () { fire(st, p, a); });
      if (a.disabledReason) { b.disabled = true; b.title = a.disabledReason; }
      b.setAttribute('aria-label', (a.label || actLabel(a)) + (a.hint ? '. ' + a.hint : ''));
      row.appendChild(b);
    });
    return row;
  }
  function actNum(a) {
    if (!a) return null;
    var v = a.value;
    if (v && typeof v === 'object') v = v.value != null ? v.value : v.amount;
    var n = num(v, null);
    if (n != null) return n;
    var m = /(-?\d+(?:\.\d+)?)/.exec(a.label || a.shortLabel || a.token || '');
    return m ? Number(m[1]) : null;
  }
  /* Discrete value actions (or one range action) -> slider model. */
  function valueModel(acts) {
    var vals = [], by = {}, range = null;
    acts.forEach(function (a) {
      if (a.min != null && a.max != null) { range = { min: num(a.min, 0), max: num(a.max, 100), step: num(a.step, 1) || 1, action: a }; return; }
      var v = actNum(a);
      if (v != null && by[v] == null) { by[v] = a; vals.push(v); }
    });
    vals.sort(function (x, y) { return x - y; });
    return { vals: vals, by: by, range: range };
  }
  /* value_entry: big mono value, range slider, -/+ stepper, one commit verb. */
  function valueEntry(st, p, acts, o) {
    var vm = valueModel(acts);
    if (!vm.vals.length && !vm.range) return null;
    var lo = vm.range ? vm.range.min : 0;
    var hi = vm.range ? vm.range.max : vm.vals.length - 1;
    var step = vm.range ? vm.range.step : 1;
    function val(i) { return vm.range ? i : vm.vals[i]; }
    function idxOf(v) {
      if (vm.range) return Math.max(lo, Math.min(hi, Math.round(v / step) * step));
      var best = 0;
      for (var i = 0; i < vm.vals.length; i++) if (Math.abs(vm.vals[i] - v) < Math.abs(vm.vals[best] - v)) best = i;
      return best;
    }
    if (st.ui.ve == null) st.ui.ve = o.initial != null ? idxOf(o.initial) : (vm.range ? Math.round((lo + hi) / 2 / step) * step : Math.floor(vm.vals.length / 2));
    var box = el('div', 'bd-t-ve');
    var head = add(el('div', 'bd-t-ve-head'), el('span', 'eyebrow bd-t-eyebrow', o.title || 'Your value'));
    var big = mono('', 'bd-t-ve-val');
    add(head, big);
    var range = el('input', 'bd-t-range');
    range.type = 'range'; range.min = lo; range.max = hi; range.step = step;
    range.setAttribute('aria-label', o.title || 'Value');
    var minus = btn('−', 'bd-t-step', null), plus = btn('+', 'bd-t-step', null);
    minus.setAttribute('aria-label', 'Lower'); plus.setAttribute('aria-label', 'Higher');
    var commit = btn(o.verb || 'Commit', 'is-primary bd-t-commit', null);
    function sync() {
      range.value = st.ui.ve;
      var v = val(st.ui.ve);
      big.textContent = (o.prefix || '') + v;
      var pct = hi > lo ? (st.ui.ve - lo) / (hi - lo) * 100 : 0;
      range.style.setProperty('--bd-t-fill', pct + '%');
      minus.disabled = st.ui.ve <= lo; plus.disabled = st.ui.ve >= hi;
      commit.setAttribute('aria-label', (o.verb || 'Commit') + ' ' + v);
    }
    range.addEventListener('input', function () { st.ui.ve = Number(range.value); sync(); });
    minus.addEventListener('click', function () { st.ui.ve = Math.max(lo, st.ui.ve - step); sync(); });
    plus.addEventListener('click', function () { st.ui.ve = Math.min(hi, st.ui.ve + step); sync(); });
    commit.addEventListener('click', function () {
      var v = val(st.ui.ve);
      var a = vm.range ? Object.assign({}, vm.range.action, { value: v, token: String(vm.range.action.token || 'value').replace(/:?-?\d+(\.\d+)?$/, '') + ':' + v }) : vm.by[v];
      fire(st, p, a);
    });
    add(box, head, add(el('div', 'bd-t-ve-row'), minus, range, plus), commit);
    sync();
    return box;
  }
  function verbOf(acts, fallback) {
    for (var i = 0; i < acts.length; i++) if (acts[i].verb) return String(acts[i].verb).charAt(0).toUpperCase() + String(acts[i].verb).slice(1);
    return fallback;
  }

  /* Die face with standard pip positions (3x3 slots). */
  var PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function die(face, cls) {
    var d = el('div', 'bd-t-die' + (cls ? ' ' + cls : ''));
    var on = PIPS[face] || [];
    for (var i = 0; i < 9; i++) add(d, el('i', on.indexOf(i) >= 0 ? 'bd-t-pip' : 'bd-t-pip is-off'));
    d.setAttribute('aria-label', 'Die showing ' + face);
    return d;
  }
  function pill(txt, cls) { return el('span', 'bd-t-pill' + (cls ? ' ' + cls : ''), txt); }

  /* =================================================================
     card_table  (two_sides, table_ring, compass)
     ================================================================= */
  var STD_SUIT = /^(s|h|d|c|spades?|hearts?|diamonds?|clubs?|[♠-♧])$/i;
  function isNumCard(c) { return c && !c.hidden && !mjSuit(c) && !hanabiCol(c) && !STD_SUIT.test(String(c.suit || '')); }
  /* Number cards (goofspiel bid/prize, jokers): mono rank, small sans tag. */
  function numCard(c, size) {
    var w = el('div', 'bd-t-cw bd-t-cw-' + (size || 'md') + ' bd-t-num' + (/^rj$/i.test(c.rank) ? ' is-red' : ''));
    var r = String(c.rank);
    if (/^[br]j$/i.test(r)) r = 'J';
    var tag = String(c.suit || '');
    if (/joker/i.test(tag)) tag = /^rj$/i.test(c.rank) ? 'red joker' : 'joker';
    add(w, add(el('div', 'bd-t-num-face'), mono(r, 'bd-t-num-r'), el('span', 'bd-t-num-t', tag)));
    w.setAttribute('data-ck', cardKey(c));
    w.setAttribute('aria-label', tag + ' ' + c.rank);
    return w;
  }
  function anyCard(c, size, faceUp) { return isNumCard(c) && faceUp !== false ? numCard(c, size) : cardSlot(c, size, faceUp); }
  function centreSize(n, mj) { return mj ? (n <= 8 ? 'md' : n <= 16 ? 'sm' : 'xs') : (n <= 5 ? 'md' : n <= 10 ? 'sm' : 'xs'); }
  function hiddenCount(vs) {
    if (vs.count != null) return vs.count;
    return (vs.cards || []).length;
  }
  function faceUpCards(vs) { return (vs.cards || []).filter(function (c) { return c && !c.hidden; }); }
  function wasHidden(prevSeat) { return !prevSeat || !(prevSeat.cards || []).some(function (c) { return c && !c.hidden; }); }
  function fmtN(n) { return typeof n === 'number' ? n.toLocaleString('en-GB') : String(n); }

  /* Bridge dummy and similar exposed hands: one mono line per suit. */
  function suitLines(cards) {
    var box = el('div', 'bd-t-suitlines');
    ['S', 'H', 'D', 'C'].forEach(function (s) {
      var rs = cards.filter(function (c) { return suitOf(c) === s; }).map(function (c) { return c.rank; });
      if (!rs.length) return;
      var ln = el('div', 'bd-t-sl' + (s === 'H' || s === 'D' ? ' is-red' : ''));
      add(ln, el('span', 'bd-t-sl-s', SUIT_GLYPH[s]), mono(rs.join(' ')));
      box.appendChild(ln);
    });
    return box;
  }
  function backStack(n, mj) {
    var b = el('div', 'bd-t-backs');
    for (var i = 0; i < Math.min(n, 3); i++) {
      var s = cardSlot({ hidden: true }, 'xs', false);
      if (mj) s.classList.add('is-mj');
      s.style.left = (i * 4) + 'px';
      b.appendChild(s);
    }
    b.style.width = (n ? 20 + Math.min(n - 1, 2) * 4 : 0) + 'px';
    return add(el('div', 'bd-t-backrow'), b, mono('×' + n, 'bd-t-count'));
  }
  function statList(vs, view) {
    var out = [];
    if (vs.chips != null) out.push([fmtN(vs.chips), 'chips']);
    if (vs.bet) out.push([fmtN(vs.bet), 'bet']);
    if (vs.tricks != null) out.push([vs.tricks, vs.tricks === 1 ? 'trick' : 'tricks']);
    if (vs.score != null) out.push([vs.score, 'pts']);
    else if (view.scores && view.scores[vs.id] != null) out.push([view.scores[vs.id], 'pts']);
    return out;
  }

  /* One seat pod. pos: bottom | top | left | right (two_sides uses top/bottom). */
  function seatPod(props, view, vs, pos, ctx, isCompass) {
    var meta = seatMeta(props, vs.id, vs);
    var you = !!meta.isYou;
    var pod = el('div', 'bd-t-pod pos-' + pos + (you ? ' is-you' : '') + (vs.folded ? ' is-folded' : '') +
      (view.toAct && view.toAct === vs.id ? ' is-toact' : ''));
    pod.setAttribute('data-k', 'seat:' + vs.id);
    var idr = el('div', 'bd-t-pod-id');
    var nm = add(el('div', 'bd-t-pod-nm'), el('span', 'bd-t-pod-name', shortName(meta)));
    var lab = vs.label && !(you && /^you$/i.test(vs.label)) ? vs.label : (you ? (props.seats ? meta.label : '') : '');
    if (isCompass && vs.label) lab = String(vs.label);
    if (lab && lab !== shortName(meta)) add(nm, mono(lab, 'bd-t-pod-lab'));
    add(idr, tile(meta, pos === 'bottom' || pos === 'top' ? 26 : 24), nm);
    pod.appendChild(idr);

    var row = el('div', 'bd-t-pod-row');
    var up = faceUpCards(vs);
    var mj = (vs.cards || []).some(mjSuit) || (view.yourHand || []).some(mjSuit);
    if (!you) {
      if (up.length && isCompass) row.appendChild(suitLines(up));
      else if (up.length) {
        var mini = el('div', 'bd-t-mini');
        var fresh = ctx.anim && wasHidden(ctx.prevSeats[vs.id]);
        up.forEach(function (c) {
          var s = anyCard(c, up.length > 6 ? 'xs' : 'sm');
          if (fresh) animIn(s, 'bd-t-reveal');
          mini.appendChild(s);
        });
        row.appendChild(mini);
      } else if (hiddenCount(vs)) row.appendChild(backStack(hiddenCount(vs), mj));
    }
    var stats = statList(vs, view);
    if (stats.length) {
      var sl = el('div', 'bd-t-stats');
      var pv = ctx.prevSeats[vs.id];
      stats.forEach(function (s) {
        var n = add(el('span', 'bd-t-stat'), mono(s[0], 'bd-t-stat-v'), el('span', 'bd-t-stat-l', s[1]));
        if (ctx.anim && pv && J(statList(pv, ctx.prevView || {})) !== J(stats)) n.classList.add('bd-t-tick');
        sl.appendChild(n);
      });
      row.appendChild(sl);
    }
    if (row.childNodes.length) pod.appendChild(row);

    var tags = el('div', 'bd-t-pod-tags');
    if (vs.role) add(tags, pill(vs.role));
    if (vs.note && vs.note !== vs.role) add(tags, pill(vs.note));
    if (vs.folded) add(tags, pill('Folded'));
    if (vs.winner) add(tags, pill('Wins', 'is-win'));
    var la = view.lastAction;
    var lbl = la && la.seat === vs.id ? la.label : vs.lastLabel;
    if (lbl) {
      var ap = pill(lbl, 'is-act');
      ap.setAttribute('data-act', vs.id);
      add(tags, ap);
    }
    if (tags.childNodes.length) pod.appendChild(tags);
    return pod;
  }

  /* Centre: label, phase, cards (compass trick as a cross), pot, piles. */
  function centreArea(props, view, ctx, order, isCompass) {
    var c = view.center || {};
    var cards = c.cards || [];
    var box = el('div', 'bd-t-centre');
    var head = el('div', 'bd-t-centre-head');
    add(head, el('span', 'bd-t-eyebrow', c.label || 'Table'));
    if (view.trump) add(head, pill('Trump ' + (SUIT_GLYPH[SUIT[String(view.trump).toLowerCase()]] || view.trump)));
    box.appendChild(head);
    var mj = cards.some(mjSuit);
    var size = isCompass ? 'md' : centreSize(cards.length, mj);
    var wrap = el('div', 'bd-t-cards' + (isCompass ? ' is-cross' : '') + ' n-' + Math.min(cards.length, 9));
    var prevN = ctx.prevView && ctx.prevView.center && ctx.prevView.center.cards ? ctx.prevView.center.cards.length : 0;
    cards.forEach(function (cd, i) {
      var s = anyCard(cd, size);
      var by = cd.by || cd.seat;
      s.setAttribute('data-k', 'centre:' + cardKey(cd));
      if (isCompass && by && order[by]) s.classList.add('at-' + order[by]);
      if (ctx.anim && i >= prevN) {
        var fromK = 'seat:' + by;
        var yourHand = (ctx.prevView && ctx.prevView.yourHand) || [];
        if (yourHand.some(function (h) { return sameCard(h, cd); })) fromK = 'hand:' + cardKey(cd);
        ctx.after.push(function () { glide(s, ctx.rects[fromK] || ctx.rects['seat:' + by], ctx.z); });
        if (!ctx.rects[fromK] && !ctx.rects['seat:' + by]) animIn(s, 'bd-t-arrive');
      }
      if (i === cards.length - 1) s.setAttribute('data-newest', '1');
      wrap.appendChild(s);
    });
    if (!cards.length) add(wrap, el('div', 'bd-t-empty', isCompass ? 'Waiting for the lead' : 'No cards yet'));
    box.appendChild(wrap);
    var foot = el('div', 'bd-t-centre-foot');
    if (view.pot != null) add(foot, add(el('span', 'bd-t-pot'), el('span', 'bd-t-eyebrow', 'Pot'), mono(fmtN(view.pot), 'bd-t-pot-v')));
    if (view.stock != null) add(foot, add(el('span', 'bd-t-pot'), el('span', 'bd-t-eyebrow', 'Stock'), mono(view.stock, 'bd-t-pot-v')));
    if (foot.childNodes.length) box.appendChild(foot);
    (view.piles || []).forEach(function (p) {
      if (!p || !(p.cards || []).length) return;
      var pr = add(el('div', 'bd-t-pile'), el('span', 'bd-t-eyebrow', p.label || 'Pile'));
      var pc = el('div', 'bd-t-pile-cards');
      p.cards.forEach(function (cd) { pc.appendChild(anyCard(cd, 'xs')); });
      box.appendChild(add(pr, pc));
    });
    return box;
  }

  /* You at the bottom, then clockwise: left, top, right. */
  function ringOrder(seats, youId) {
    var n = seats.length, yi = 0, map = {};
    seats.forEach(function (s, i) { if (s.isYou || s.id === youId) yi = i; });
    var pos = n <= 2 ? ['bottom', 'top'] : n === 3 ? ['bottom', 'left', 'right'] : ['bottom', 'left', 'top', 'right'];
    seats.forEach(function (s, i) { map[s.id] = pos[(i - yi + n) % n] || 'top'; });
    return map;
  }
  function knownLabel(c) {
    var k = c.known || c.hint;
    if (!k) return null;
    var parts = [];
    if (k.suit) parts.push(String(k.suit));
    if (k.rank != null) parts.push(String(k.rank));
    return parts.length ? parts.join(' · ') : null;
  }
  function cardActs(legal, hand) {
    var byIdx = {}, other = [];
    (legal || []).forEach(function (a) {
      if (a && a.kind === 'card') {
        var idx = a.index != null ? Number(a.index) : -1;
        if (idx < 0 && a.card) for (var i = 0; i < hand.length; i++) if (sameCard(hand[i], a.card)) { idx = i; break; }
        if (idx >= 0 && idx < hand.length) { (byIdx[idx] = byIdx[idx] || []).push(a); return; }
      }
      if (a) other.push(a);
    });
    return { byIdx: byIdx, other: other };
  }

  /* Your hand, fanned in the thumb zone (mahjong tiles sit flat). */
  function handArea(props, view, ctx, acts) {
    var hand = view.yourHand || [];
    if (!hand.length) return null;
    var st = ctx.st, live = !!props.interactive;
    var mj = hand.some(mjSuit), n = hand.length;
    var big = mj && n <= 10;
    var cw = mj ? (big ? 32 : 24) : 50, avail = 326;
    var step = n > 1 ? Math.min(cw + (mj ? 1 : 8), (avail - cw) / (n - 1)) : 0;
    var x0 = (354 - (cw + step * (n - 1))) / 2;
    var ang = mj ? 0 : Math.min(3.4, 28 / n);
    var box = el('div', 'bd-t-hand' + (mj ? ' is-mj' : '') + (big ? ' is-big' : ''));
    var prevKeys = {};
    ((ctx.prevView && ctx.prevView.yourHand) || []).forEach(function (c, i) { prevKeys[cardKey(c) + (c.hidden ? i : '')] = 1; });
    var anyCardActs = Object.keys(acts.byIdx).length > 0;
    var fresh = 0;
    hand.forEach(function (c, i) {
      var slot = el('div', 'bd-t-fanslot');
      var rot = (i - (n - 1) / 2) * ang;
      var y = (1 - Math.cos(rot * Math.PI / 180)) * 420;
      slot.style.left = (x0 + i * step).toFixed(1) + 'px';
      slot.style.transform = 'translateY(' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
      slot.style.zIndex = String(i + 1);
      var lift = el('div', 'bd-t-lift');
      var cs = c.hidden ? cardSlot(c, mj ? 'lg' : 'lg', false) : anyCard(c, 'lg');
      var kl = c.hidden ? knownLabel(c) : null;
      if (c.hidden) add(cs, mono(kl || '?', 'bd-t-known' + (kl ? '' : ' is-none')));
      var key = cardKey(c) + (c.hidden ? i : '');
      cs.setAttribute('data-k', 'hand:' + key);
      if (ctx.anim && !prevKeys[key]) animIn(cs, 'bd-t-fanin', 45 * fresh++);
      else if (ctx.first && ctx.size === 'stage' && !ctx.reduce) animIn(cs, 'bd-t-fanin', 40 * i);
      add(slot, add(lift, cs));
      if (live && anyCardActs) {
        if (acts.byIdx[i]) {
          slot.classList.add('is-playable');
          slot.tabIndex = 0;
          slot.setAttribute('role', 'button');
          slot.setAttribute('aria-label', (c.hidden ? 'Card ' + (i + 1) : cardName(c)) + '. ' + (acts.byIdx[i][0].label || 'Play'));
          slot.setAttribute('data-i', String(i));
        } else slot.classList.add('is-dim');
      }
      box.appendChild(slot);
    });
    return box;
  }

  function cardOverlay(root, props, view, ctx, acts) {
    var st = ctx.st;
    var hand = view.yourHand || [];
    var hint = el('div', 'bd-t-hintline');
    var row = el('div', 'bd-t-actions');
    function paint() {
      var sel = st.ui.sel;
      var slots = root.querySelectorAll('.bd-t-fanslot[data-i]');
      for (var i = 0; i < slots.length; i++) slots[i].classList.toggle('is-sel', Number(slots[i].getAttribute('data-i')) === sel);
      row.innerHTML = '';
      var mine = sel != null ? (acts.byIdx[sel] || []) : [];
      mine.forEach(function (a, k) {
        var b = btn(a.label || actLabel(a), k === 0 ? 'is-primary' : '', function () { fire(st, props, a); });
        row.appendChild(b);
      });
      acts.other.forEach(function (a) {
        var b = btn(actLabel(a), /^(fold|pass)/i.test(actLabel(a)) ? 'is-quiet' : '', function () { fire(st, props, a); });
        if (a.disabledReason) { b.disabled = true; b.title = a.disabledReason; }
        row.appendChild(b);
      });
      row.style.display = row.childNodes.length ? '' : 'none';
      var hasCards = Object.keys(acts.byIdx).length > 0;
      hint.textContent = !hasCards ? '' : sel == null ? 'Tap a card to choose it' :
        'Tap again to ' + String((mine[0] && (mine[0].verb || mine[0].label)) || 'play').toLowerCase().replace(/^(play|bid|discard)\b.*$/, '$1') + ' ' + (hand[sel] && !hand[sel].hidden ? cardName(hand[sel]) : 'it');
      hint.style.display = hasCards ? '' : 'none';
    }
    function choose(i) {
      if (st.sent) return;
      if (st.ui.sel === i && acts.byIdx[i]) { fire(st, props, acts.byIdx[i][0]); return; }
      st.ui.sel = i;
      paint();
    }
    var slots = root.querySelectorAll('.bd-t-fanslot[data-i]');
    Array.prototype.forEach.call(slots, function (s) {
      var i = Number(s.getAttribute('data-i'));
      s.addEventListener('click', function () { choose(i); });
      s.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(i); } });
    });
    paint();
    return add(el('div', 'bd-t-ovl'), hint, row);
  }

  /* Goofspiel and other sealed per-seat bids: both cards turn on one frame. */
  function lastBidsStrip(props, view, ctx) {
    var lb = view.lastBids;
    if (!lb) return null;
    var d = duo(props);
    var box = el('div', 'bd-t-lastbids');
    var fresh = ctx.anim && J(ctx.prevView && ctx.prevView.lastBids) !== J(lb);
    add(box, el('span', 'bd-t-eyebrow', 'Last round'));
    [d.you, d.them].forEach(function (m) {
      var cell = el('div', 'bd-t-lb' + (view.lastWinner === m.id ? ' is-won' : ''));
      var c = numCard({ rank: lb[m.id], suit: 'bid' }, 'sm');
      if (fresh) animIn(c, 'bd-t-reveal');
      add(cell, c, el('span', 'bd-t-lb-who', shortName(m)));
      box.appendChild(cell);
    });
    if (view.lastPrize) add(box, add(el('div', 'bd-t-lb is-prize'), numCard(view.lastPrize, 'sm'), el('span', 'bd-t-lb-who', 'Prize')));
    return box;
  }

  family('card_table', function (root, props, ctx) {
    var view = ctx.view, seats = view.seats || [];
    ctx.prevSeats = {};
    ((ctx.prevView && ctx.prevView.seats) || []).forEach(function (s) { ctx.prevSeats[s.id] = s; });
    var layout = view.seatLayout || 'two_sides';
    if (layout === 'two_sides' && seats.length > 2) layout = 'table_ring';
    var isCompass = layout === 'compass';
    var youId = props.youSeat;
    seats.forEach(function (s) { if (s.isYou) youId = s.id; });
    var order = ringOrder(seats, youId);
    var open = seats.some(function (s) { return !s.isYou && s.id !== youId && order[s.id] === 'top' && faceUpCards(s).length; });
    var ct = el('div', 'bd-t-ct ' + (layout === 'two_sides' ? 'is-two' : 'is-ring n' + seats.length) + (isCompass ? ' is-compass' : '') + (open ? ' is-open' : ''));
    root.appendChild(ct);
    var centre = centreArea(props, view, ctx, order, isCompass);
    if (view.phase && layout === 'two_sides') add(centre.firstChild, mono(view.phase, 'bd-t-phase'));
    if (layout === 'two_sides') {
      seats.forEach(function (s) { if (order[s.id] === 'top') ct.appendChild(seatPod(props, view, s, 'top', ctx, false)); });
      var felt = add(el('div', 'bd-t-felt is-flat'), centre);
      var lbs = lastBidsStrip(props, view, ctx);
      if (lbs) felt.appendChild(lbs);
      ct.appendChild(felt);
      seats.forEach(function (s) { if (order[s.id] === 'bottom') ct.appendChild(seatPod(props, view, s, 'bottom', ctx, false)); });
    } else {
      add(ct, el('div', 'bd-t-felt' + (isCompass ? ' is-square' : ' is-oval')), centre);
      seats.forEach(function (s) { ct.appendChild(seatPod(props, view, s, order[s.id], ctx, isCompass)); });
    }
    var mets = (view.metrics || []).slice();
    if (view.phase && layout !== 'two_sides') mets.unshift({ label: '', value: view.phase });
    if (mets.length) {
      var ms = el('div', 'bd-t-metrics');
      mets.forEach(function (m) { add(ms, add(el('span', 'bd-t-metric'), m.label ? el('span', 'bd-t-metric-l', m.label) : null, mono(m.value, 'bd-t-metric-v' + (m.label ? '' : ' is-phase')))); });
      root.appendChild(ms);
    }
    var acts = cardActs(props.interactive ? props.legal : [], view.yourHand || []);
    var hand = handArea(props, view, ctx, acts);
    if (hand) root.appendChild(hand);
    if (props.interactive && (props.legal || []).length) root.appendChild(cardOverlay(root, props, view, ctx, acts));

    /* exactly one last-move marker: the card that just landed, else the acting seat's pill */
    var la = view.lastAction, cc = (view.center && view.center.cards) || [];
    var prevN = ctx.prevView && ctx.prevView.center && ctx.prevView.center.cards ? ctx.prevView.center.cards.length : 0;
    var newest = root.querySelector('.bd-t-centre [data-newest]');
    var nb = cc.length ? (cc[cc.length - 1].by || cc[cc.length - 1].seat) : null;
    var target = null;
    if (newest && ((ctx.prevView && cc.length > prevN) || (!ctx.prevView && la && nb && nb === la.seat))) target = newest;
    else if (la && la.seat) target = root.querySelector('[data-act="' + la.seat + '"]');
    if (target) target.classList.add('bd-last');
    return J(la || null) + '|' + cc.length + '|' + (cc.length ? cardKey(cc[cc.length - 1]) : '');
  });

  /* =================================================================
     dice_table  (Liar's Dice): cups in an arc, the bid as a mono claim
     ================================================================= */
  function claimText(b) {
    if (!b) return '';
    var c = num(b.count, 0), f = num(b.face, 0);
    return numWord(c) + ' ' + f + (c === 1 ? '' : 's');
  }
  function bidOf(a) {
    if (!a) return null;
    var v = a.value && typeof a.value === 'object' ? a.value : a;
    var c = num(v.count, null), f = num(v.face, null);
    return c != null && f != null ? { count: c, face: f } : null;
  }
  function cup(n, cls) {
    var c = el('div', 'bd-t-cup' + (cls ? ' ' + cls : ''));
    add(c, mono(n, 'bd-t-cup-n'), el('span', 'bd-t-cup-l', n === 1 ? 'die' : 'dice'));
    c.setAttribute('aria-label', n + ' hidden dice');
    return c;
  }
  function matches(face, bid, wild) {
    if (!bid) return false;
    return face === bid.face || (wild != null && face === wild && bid.face !== wild);
  }
  function diceSeat(props, view, vs, ctx, pos) {
    var meta = seatMeta(props, vs.id, vs);
    var you = !!meta.isYou;
    var box = el('div', 'bd-t-dseat pos-' + pos + (you ? ' is-you' : '') + (view.toAct === vs.id ? ' is-toact' : ''));
    box.setAttribute('data-k', 'seat:' + vs.id);
    var nm = add(el('div', 'bd-t-dseat-id'), tile(meta, 24), el('span', 'bd-t-pod-name', shortName(meta)));
    var n = vs.diceCount != null ? vs.diceCount : (vs.dice || []).length;
    add(nm, mono(n + (n === 1 ? ' die' : ' dice'), 'bd-t-dseat-n'));
    box.appendChild(nm);
    var tray = el('div', 'bd-t-tray');
    var showDice = (view.revealed || you) && (vs.dice || []).length;
    var prevSeat = null;
    ((ctx.prevView && ctx.prevView.seats) || []).forEach(function (s) { if (s.id === vs.id) prevSeat = s; });
    var turning = ctx.anim && view.revealed && !(ctx.prevView && ctx.prevView.revealed);
    if (showDice) {
      var row = el('div', 'bd-t-dicerow');
      vs.dice.forEach(function (f) {
        var d = die(f, view.revealed ? (matches(f, view.bid, view.wild) ? 'is-match' : 'is-miss') : '');
        if (turning && !you) animIn(d, 'bd-t-reveal');
        row.appendChild(d);
      });
      tray.appendChild(row);
      if (turning && !you) {
        var ghost = cup(n, 'is-lifting');
        tray.appendChild(ghost);
      }
      if (you && !view.revealed) add(tray, el('span', 'bd-t-private', 'Only you see these'));
    } else tray.appendChild(cup(n));
    if (prevSeat && ctx.anim && prevSeat.diceCount != null && vs.diceCount < prevSeat.diceCount) nm.lastChild.classList.add('bd-t-tick');
    box.appendChild(tray);
    var la = view.lastAction;
    if (la && la.seat === vs.id && la.label) { var p = pill(la.label, 'is-act'); p.setAttribute('data-act', vs.id); box.appendChild(add(el('div', 'bd-t-pod-tags'), p)); }
    return box;
  }

  function diceOverlay(root, props, view, ctx) {
    var st = ctx.st, legal = props.legal || [];
    var bids = [], call = null, rest = [];
    legal.forEach(function (a) {
      var b = bidOf(a);
      if (b && a.kind !== 'choice') bids.push({ b: b, a: a });
      else if (/call|liar|doubt|challenge/i.test((a.token || '') + ' ' + (a.label || ''))) call = a;
      else rest.push(a);
    });
    var box = el('div', 'bd-t-bid');
    if (bids.length) {
      bids.sort(function (x, y) { return x.b.count - y.b.count || x.b.face - y.b.face; });
      var cMin = bids[0].b.count, cMax = bids[0].b.count;
      bids.forEach(function (x) { cMin = Math.min(cMin, x.b.count); cMax = Math.max(cMax, x.b.count); });
      if (!st.ui.bid) st.ui.bid = { count: bids[0].b.count, face: bids[0].b.face };
      var find = function () { for (var i = 0; i < bids.length; i++) if (bids[i].b.count === st.ui.bid.count && bids[i].b.face === st.ui.bid.face) return bids[i].a; return null; };
      var cVal = mono('', 'bd-t-bid-count'), fBox = el('div', 'bd-t-bid-face');
      var cm = btn('−', 'bd-t-step'), cp = btn('+', 'bd-t-step'), fm = btn('−', 'bd-t-step'), fp = btn('+', 'bd-t-step');
      cm.setAttribute('aria-label', 'Fewer dice'); cp.setAttribute('aria-label', 'More dice');
      fm.setAttribute('aria-label', 'Lower face'); fp.setAttribute('aria-label', 'Higher face');
      var go = btn('Bid', 'is-primary bd-t-bid-go');
      var sync = function () {
        var b = st.ui.bid;
        cVal.textContent = numWord(b.count);
        fBox.innerHTML = ''; fBox.appendChild(die(b.face));
        cm.disabled = b.count <= cMin; cp.disabled = b.count >= cMax;
        fm.disabled = b.face <= 1; fp.disabled = b.face >= 6;
        var a = find();
        go.disabled = !a;
        go.textContent = a ? 'Bid ' + claimText(b) : 'Raise the bid';
      };
      cm.addEventListener('click', function () { st.ui.bid.count--; sync(); });
      cp.addEventListener('click', function () { st.ui.bid.count++; sync(); });
      fm.addEventListener('click', function () { st.ui.bid.face--; sync(); });
      fp.addEventListener('click', function () { st.ui.bid.face++; sync(); });
      go.addEventListener('click', function () { fire(st, props, find()); });
      add(box, add(el('div', 'bd-t-bid-steps'),
        add(el('div', 'bd-t-bid-grp'), el('span', 'bd-t-eyebrow', 'Count'), add(el('div', 'bd-t-ve-row'), cm, cVal, cp)),
        add(el('div', 'bd-t-bid-grp'), el('span', 'bd-t-eyebrow', 'Face'), add(el('div', 'bd-t-ve-row'), fm, fBox, fp))));
      var acts = add(el('div', 'bd-t-actions'), go);
      if (call) add(acts, btn(actLabel(call) || 'Call', 'bd-t-call', function () { fire(st, props, call); }));
      box.appendChild(acts);
      sync();
    } else if (call) box.appendChild(add(el('div', 'bd-t-actions'), btn(actLabel(call) || 'Call', 'bd-t-call', function () { fire(st, props, call); })));
    if (rest.length) box.appendChild(actionRow(st, props, rest));
    return box;
  }

  family('dice_table', function (root, props, ctx) {
    var view = ctx.view, seats = view.seats || [];
    var youId = props.youSeat;
    seats.forEach(function (s) { if (s.isYou) youId = s.id; });
    var others = seats.filter(function (s) { return s.id !== youId; });
    var me = seats.filter(function (s) { return s.id === youId; })[0];
    var wrap = el('div', 'bd-t-dice');
    var arc = el('div', 'bd-t-arc n' + others.length);
    others.forEach(function (s, i) {
      var d = diceSeat(props, view, s, ctx, 'arc');
      if (others.length > 1) {
        var t = others.length === 1 ? 0.5 : i / (others.length - 1);
        var ang = Math.PI * (1 - t);
        d.style.left = (50 + Math.cos(ang) * 34) + '%';
        d.style.top = (40 - Math.sin(ang) * 30) + 'px';
      }
      arc.appendChild(d);
    });
    wrap.appendChild(arc);

    var claim = el('div', 'bd-t-claim');
    var b = view.bid;
    if (b) {
      var fresh = ctx.anim && J(ctx.prevView && ctx.prevView.bid) !== J(b);
      var big = add(el('div', 'bd-t-claim-big'), die(num(b.face, 1), 'is-claim'), mono(claimText(b), 'bd-t-claim-txt'));
      if (fresh) animIn(big, 'bd-t-arrive');
      add(claim, el('span', 'bd-t-eyebrow', 'Current bid'), big);
      var by = (view.history && view.history.length) ? view.history[view.history.length - 1].seat : (view.lastAction && view.lastAction.seat);
      if (by) add(claim, el('span', 'bd-t-claim-by', 'Bid by ' + shortName(seatMeta(props, by, seats.filter(function (s) { return s.id === by; })[0]))));
    } else add(claim, el('span', 'bd-t-eyebrow', 'Current bid'), el('div', 'bd-t-claim-none', 'No bid yet'));
    var hist = (view.history || []).slice(0, -1).slice(-4);
    if (hist.length) {
      var hs = el('div', 'bd-t-bidhist');
      hist.forEach(function (h) { add(hs, mono(claimText(h), 'bd-t-bidhist-i')); });
      claim.appendChild(hs);
    }
    if (view.revealed && b) {
      var actual = view.actual;
      if (actual == null) {
        actual = 0;
        seats.forEach(function (s) { (s.dice || []).forEach(function (f) { if (matches(f, b, view.wild)) actual++; }); });
      }
      var tally = add(el('div', 'bd-t-tally'), mono('Showing ' + actual + ' · bid ' + num(b.count, 0), 'bd-t-tally-v'));
      if (view.wild != null) add(tally, el('span', 'bd-t-tally-w', num(view.wild, 1) + 's are wild'));
      tally.setAttribute('data-tally', '1');
      if (ctx.anim && !(ctx.prevView && ctx.prevView.revealed)) animIn(tally, 'bd-t-reveal');
      claim.appendChild(tally);
    }
    wrap.appendChild(claim);
    if (me) wrap.appendChild(diceSeat(props, view, me, ctx, 'you'));
    root.appendChild(wrap);
    if (props.interactive && (props.legal || []).length) root.appendChild(diceOverlay(root, props, view, ctx));

    var target = null, la = view.lastAction;
    if (view.revealed) target = root.querySelector('[data-tally]');
    else if (b && (!ctx.prevView || J(ctx.prevView.bid) !== J(b) || !la)) target = root.querySelector('.bd-t-claim-big');
    if (!target && la && la.seat) target = root.querySelector('[data-act="' + la.seat + '"]');
    if (target) target.classList.add('bd-last');
    return J([b, view.revealed, la]);
  });

  /* =================================================================
     payoff_matrix  (Prisoner's Dilemma, Rock Paper Scissors)
     Rows are your choices, columns the opponent's; cells read you / them.
     ================================================================= */
  function pickIdx(choices, v) {
    if (v == null) return -1;
    var i = choices.indexOf(v);
    if (i >= 0) return i;
    for (var k = 0; k < choices.length; k++) if (String(choices[k]).toLowerCase() === String(v).toLowerCase()) return k;
    return typeof v === 'number' ? v : -1;
  }
  function payFor(matrix, youSeat, rowYou, colThem) {
    var p1 = youSeat === 'p2' ? colThem : rowYou, p2 = youSeat === 'p2' ? rowYou : colThem;
    var cell = (matrix[p1] || [])[p2] || [0, 0];
    return youSeat === 'p2' ? { you: cell[1], them: cell[0] } : { you: cell[0], them: cell[1] };
  }
  function seatChip(meta, txt, faceUp, cls) {
    var c = el('div', 'bd-t-pchip' + (faceUp ? ' is-up' : ' is-down') + (cls ? ' ' + cls : ''));
    add(c, add(el('div', 'bd-t-pchip-who'), tile(meta, 18), el('span', null, shortName(meta))));
    add(c, faceUp ? el('div', 'bd-t-pchip-v', txt) : add(el('div', 'bd-t-pchip-v is-sealed'), el('span', 'bd-t-seal'), el('span', null, txt)));
    return c;
  }
  function simChoice(props, ctx, choices) {
    var st = ctx.st, legal = props.legal || [];
    var box = el('div', 'bd-t-chips n' + Math.min(legal.length, 3));
    legal.forEach(function (a) {
      var ch = el('button', 'bd-t-chip');
      ch.type = 'button';
      add(ch, el('span', 'bd-t-chip-l', actLabel(a) || a.choice));
      if (a.hint) add(ch, el('span', 'bd-t-chip-h', a.hint));
      ch.setAttribute('aria-label', (a.label || a.choice) + (a.hint ? '. ' + a.hint : ''));
      if (a.disabledReason) ch.disabled = true;
      ch.addEventListener('click', function () { if (st.sent) return; ch.classList.add('is-picked'); fire(st, props, a); });
      box.appendChild(ch);
    });
    return box;
  }

  family('payoff_matrix', function (root, props, ctx) {
    var view = ctx.view;
    var choices = view.choices || ['Cooperate', 'Defect'];
    var matrix = view.matrix || [];
    var youSeat = props.youSeat || view.youSeat || 'p1';
    var d = duo({ seats: props.seats, youSeat: youSeat });
    var themSeat = d.them.id;
    var picks = view.revealed && view.picks ? view.picks : null;
    var pr = picks ? pickIdx(choices, picks[youSeat]) : -1, pc = picks ? pickIdx(choices, picks[themSeat]) : -1;
    var fresh = ctx.anim && picks && J(ctx.prevView && ctx.prevView.picks) !== J(view.picks);
    var wrap = el('div', 'bd-t-pm n' + choices.length);

    var head = el('div', 'bd-t-pm-head');
    var rTxt = view.rounds === 1 ? 'One round' : view.rounds ? 'Round ' + Math.min(num(view.round, 1), view.rounds) + ' of ' + view.rounds : (view.history && view.history.length ? 'Round ' + (view.history.length + 1) : 'One round');
    add(head, el('span', 'bd-t-eyebrow', rTxt));
    if (view.scores) {
      var sc = el('div', 'bd-t-pm-scores');
      [d.you, d.them].forEach(function (m) { add(sc, add(el('span', 'bd-t-stat'), el('span', 'bd-t-stat-l', shortName(m)), mono(num(view.scores[m.id], 0), 'bd-t-stat-v'))); });
      head.appendChild(sc);
    }
    wrap.appendChild(head);

    var main = el('div', 'bd-t-pm-main');
    var grid = el('div', 'bd-t-mx');
    grid.style.gridTemplateColumns = '62px repeat(' + choices.length + ', 1fr)';
    add(grid, add(el('div', 'bd-t-mx-corner'), mono('you ↓', 'bd-t-mx-axis'), mono(shortName(d.them) + '\u00a0→', 'bd-t-mx-axis')));
    choices.forEach(function (c, j) { add(grid, el('div', 'bd-t-mx-col' + (j === pc ? ' is-pick' : ''), c)); });
    choices.forEach(function (c, i) {
      add(grid, el('div', 'bd-t-mx-row' + (i === pr ? ' is-pick' : ''), c));
      choices.forEach(function (c2, j) {
        var p = payFor(matrix, youSeat, i, j);
        var cell = el('div', 'bd-t-mx-cell' + (picks ? (i === pr && j === pc ? ' is-chosen' : ' is-dim') : ''));
        add(cell, mono(p.you, 'bd-t-mx-you'), el('span', 'bd-t-mx-sep', '/'), mono(p.them, 'bd-t-mx-them'));
        cell.setAttribute('aria-label', 'You ' + c + ', ' + shortName(d.them) + ' ' + c2 + ': you ' + p.you + ', them ' + p.them);
        if (i === pr && j === pc) { cell.setAttribute('data-chosen', '1'); if (fresh) animIn(cell, 'bd-t-reveal'); }
        grid.appendChild(cell);
      });
    });
    main.appendChild(grid);

    var side = el('div', 'bd-t-pm-picks');
    add(side, el('span', 'bd-t-eyebrow', picks ? 'Revealed' : 'Sealed'));
    var com = view.committed || {};
    [d.you, d.them].forEach(function (m) {
      var ch;
      if (picks) ch = seatChip(m, picks[m.id], true);
      else ch = seatChip(m, com[m.id] === false ? 'Choosing' : 'Hidden', false);
      if (fresh) animIn(ch, 'bd-t-reveal');
      side.appendChild(ch);
    });
    main.appendChild(side);
    wrap.appendChild(main);
    add(wrap, el('div', 'bd-t-pm-legend', 'Each cell reads your points / ' + shortName(d.them) + '’s points'));

    var hist = view.history || [];
    if (hist.length) {
      var hs = el('div', 'bd-t-hist');
      add(hs, add(el('div', 'bd-t-hist-lab'), el('span', null, 'You'), el('span', null, shortName(d.them))));
      hist.forEach(function (h, k) {
        var col = el('div', 'bd-t-hist-r' + (k === hist.length - 1 && picks ? ' is-last' : ''));
        var w = h.winner;
        add(col, mono(String(h[youSeat] || '?').charAt(0), w === youSeat ? 'is-w' : w === themSeat ? 'is-l' : ''));
        add(col, mono(String(h[themSeat] || '?').charAt(0), w === themSeat ? 'is-w' : w === youSeat ? 'is-l' : ''));
        add(col, mono(k + 1, 'bd-t-hist-n'));
        hs.appendChild(col);
      });
      wrap.appendChild(hs);
    }
    root.appendChild(wrap);
    if (props.interactive && (props.legal || []).length) root.appendChild(simChoice(props, ctx, choices));
    var t = root.querySelector('[data-chosen]');
    if (t) t.classList.add('bd-last');
    return J([view.picks, hist.length]);
  });

  /* =================================================================
     auction_panel  (first-price sealed bid): a quiet trade blotter
     ================================================================= */
  family('auction_panel', function (root, props, ctx) {
    var view = ctx.view;
    var youSeat = props.youSeat || view.youSeat || 'p1';
    var d = duo({ seats: props.seats, youSeat: youSeat });
    var bids = view.revealed && view.bids ? view.bids : null;
    var fresh = ctx.anim && bids && J(ctx.prevView && ctx.prevView.bids) !== J(view.bids);
    var panel = el('div', 'bd-t-panel bd-t-auc');

    var top = el('div', 'bd-t-auc-top');
    add(top, add(el('div', 'bd-t-auc-val'), el('span', 'bd-t-eyebrow', 'Your private value'), mono(view.yourValue != null ? view.yourValue : '–', 'bd-t-auc-big')));
    add(top, add(el('div', 'bd-t-auc-lot'), el('span', 'bd-t-eyebrow', view.lot || 'The lot'), el('span', 'bd-t-auc-rule', 'Higher sealed bid wins and pays its bid')));
    panel.appendChild(top);

    var rows = el('div', 'bd-t-auc-rows');
    [d.you, d.them].forEach(function (m) {
      var won = bids && view.winner === m.id;
      var r = el('div', 'bd-t-auc-row' + (won ? ' is-won' : '') + (bids && !won ? ' is-lost' : ''));
      r.setAttribute('data-k', 'seat:' + m.id);
      add(r, add(el('div', 'bd-t-auc-who'), tile(m, 26), el('span', 'bd-t-pod-name', shortName(m))));
      var right = el('div', 'bd-t-auc-bid');
      if (bids) {
        var v = add(el('div', 'bd-t-bidchip is-up'), mono(bids[m.id], 'bd-t-bidchip-v'));
        if (fresh) animIn(v, 'bd-t-reveal');
        right.appendChild(v);
        if (won) add(right, pill('Wins', 'is-win'));
      } else add(right, add(el('div', 'bd-t-bidchip is-down'), el('span', 'bd-t-seal'), el('span', null, 'Sealed')));
      r.appendChild(right);
      if (won) r.setAttribute('data-won', '1');
      rows.appendChild(r);
    });
    panel.appendChild(rows);

    if (bids) {
      var max = num(view.maxValue, 0) || 100;
      [bids[d.you.id], bids[d.them.id], view.yourValue, view.values ? view.values[d.them.id] : null].forEach(function (x) { if (x != null && x > max) max = Math.ceil(x / 10) * 10; });
      var ax = el('div', 'bd-t-axis');
      var track = el('div', 'bd-t-axis-track');
      function mark(v, cls, lab, above) {
        if (v == null) return;
        var m = add(el('div', 'bd-t-axis-m ' + cls + (above ? ' is-above' : '')), el('i'), mono(lab, 'bd-t-axis-l'));
        m.style.left = Math.max(0, Math.min(100, v / max * 100)) + '%';
        if (fresh) animIn(m, 'bd-t-reveal');
        track.appendChild(m);
      }
      mark(view.yourValue, 'is-value', '', false);
      if (view.values && view.values[d.them.id] != null) mark(view.values[d.them.id], 'is-value', '', false);
      mark(bids[d.you.id], 'is-you', 'You ' + bids[d.you.id], false);
      mark(bids[d.them.id], 'is-them', shortName(d.them) + ' ' + bids[d.them.id], true);
      add(ax, add(el('div', 'bd-t-conv-head'), el('span', 'bd-t-eyebrow', 'Bid spread'), add(el('span', 'bd-t-conv-key'), el('i', 'is-tick'), el('span', null, view.values ? 'private values' : 'your value'))),
        add(el('div', 'bd-t-axis-wrap'), mono(0, 'bd-t-axis-end'), track, mono(max, 'bd-t-axis-end')));
      panel.appendChild(ax);
      var w = view.winner;
      if (w) {
        var paid = bids[w];
        var surplus = w === d.you.id && view.yourValue != null ? view.yourValue - paid : (view.values && view.values[w] != null ? view.values[w] - paid : null);
        var set = el('div', 'bd-t-settle');
        add(set, el('span', null, (w === d.you.id ? 'You pay ' : shortName(d.them) + ' pays ')), mono(paid, 'bd-t-settle-v'));
        if (surplus != null) add(set, el('span', 'bd-t-settle-sep', '·'), el('span', null, 'surplus '), mono(surplus, 'bd-t-settle-v'));
        panel.appendChild(set);
      }
    }
    root.appendChild(panel);
    if (props.interactive && (props.legal || []).length) {
      var vals = (props.legal || []).filter(function (a) { return a.kind === 'value' || a.kind === 'bid' || a.min != null; });
      var other = (props.legal || []).filter(function (a) { return vals.indexOf(a) < 0; });
      var ve = valueEntry(ctx.st, props, vals, { title: 'Your bid', verb: verbOf(vals, 'Seal bid'), initial: vals[0] ? actNum(vals[0]) : null });
      if (ve) root.appendChild(ve);
      if (other.length) root.appendChild(actionRow(ctx.st, props, other));
    }
    var t = root.querySelector('[data-won]');
    if (t) t.classList.add('bd-last');
    return J([view.bids, view.winner]);
  });

  /* =================================================================
     economic_panel  (Bargaining split, Price & Delivery negotiation)
     ================================================================= */
  function shareOf(o, youSeat, them) {
    if (!o) return null;
    if (o.split && typeof o.split === 'object') return num(o.split[youSeat], null);
    if (typeof o.split === 'number') return o.seat === youSeat ? o.split : null;
    if (o.price != null) return num(o.price, null);
    var v = o.value;
    if (v && typeof v === 'object') return v[youSeat] != null ? num(v[youSeat], null) : (v.price != null ? num(v.price, null) : null);
    return num(v, null);
  }
  function offerText(o, youSeat, them, total) {
    if (!o) return '';
    if (o.split && typeof o.split === 'object') return 'You ' + num(o.split[youSeat], 0) + ' · them ' + num(o.split[them], 0);
    if (o.price != null || o.delivery != null) return 'Price ' + o.price + (o.delivery != null ? ' · delivery ' + o.delivery : '');
    var v = o.value;
    if (v && typeof v === 'object') return Object.keys(v).map(function (k) { return k + ' ' + v[k]; }).join(' · ');
    if (typeof v === 'number' && total) return 'You ' + v + ' · them ' + (total - v);
    return String(v == null ? '' : v);
  }
  function econOverlay(root, props, ctx) {
    var st = ctx.st, legal = props.legal || [];
    var vals = legal.filter(function (a) { return (a.kind === 'value' || a.min != null) && (a.value == null || typeof a.value !== 'object' || a.value.value != null); });
    var rest = legal.filter(function (a) { return vals.indexOf(a) < 0; });
    var box = el('div', 'bd-t-econ-ovl');
    if (vals.length) {
      var ve = valueEntry(st, props, vals, { title: 'Your share', verb: verbOf(vals, 'Propose'), initial: vals.length === 1 ? actNum(vals[0]) : null });
      if (ve) box.appendChild(ve);
    }
    if (rest.length) {
      var row = actionRow(st, props, rest);
      Array.prototype.forEach.call(row.childNodes, function (b, i) { if (/^accept/i.test(actLabel(rest[i]))) b.classList.add(vals.length ? 'bd-t-call' : 'is-primary'); });
      box.appendChild(row);
    }
    return box;
  }

  family('economic_panel', function (root, props, ctx) {
    var view = ctx.view;
    var youSeat = props.youSeat || view.youSeat || 'p1';
    var d = duo({ seats: props.seats, youSeat: youSeat });
    var them = d.them.id;
    var offers = view.offers || [];
    var total = num(view.total != null ? view.total : view.pool, null);
    var isGrid = view.kind === 'grid' || offers.some(function (o) { return o.price != null; });
    var panel = el('div', 'bd-t-panel bd-t-econ');

    var head = el('div', 'bd-t-pm-head');
    var rnd = num(view.round, null) || (view.current && view.current.round) || (offers.length ? offers[offers.length - 1].round : 1);
    var maxR = num(view.maxRounds, null);
    add(head, el('span', 'bd-t-eyebrow', 'Round ' + rnd + (maxR ? ' of ' + maxR : '')));
    if (total != null && !isGrid) add(head, add(el('span', 'bd-t-stat'), el('span', 'bd-t-stat-l', 'Pool'), mono(total, 'bd-t-stat-v')));
    panel.appendChild(head);

    /* the two offer cards */
    var cards = el('div', 'bd-t-offers');
    var lastIdx = offers.length - 1;
    [d.you, d.them].forEach(function (m) {
      var mine = null, mi = -1;
      offers.forEach(function (o, i) { if (o.seat === m.id) { mine = o; mi = i; } });
      var oc = el('div', 'bd-t-offer' + (mi === lastIdx && mine ? ' is-latest' : ''));
      add(oc, add(el('div', 'bd-t-auc-who'), tile(m, 22), el('span', 'bd-t-pod-name', shortName(m))));
      if (mine) {
        add(oc, el('span', 'bd-t-eyebrow', 'Offer · round ' + (mine.round != null ? mine.round : mi + 1)));
        var amt = mono(offerText(mine, youSeat, them, total), 'bd-t-offer-v');
        add(oc, amt);
        var pay = mine.payoffs && mine.payoffs[youSeat] != null ? mine.payoffs[youSeat] : null;
        if (pay != null) add(oc, add(el('span', 'bd-t-offer-pay'), el('span', null, 'Worth to you '), mono(pay)));
        if (mi === lastIdx) { oc.setAttribute('data-latest', '1'); if (ctx.anim && (!ctx.prevView || (ctx.prevView.offers || []).length < offers.length)) animIn(amt, 'bd-t-tick'); }
      } else add(oc, el('span', 'bd-t-empty', 'No offer yet'));
      cards.appendChild(oc);
    });
    panel.appendChild(cards);

    /* the current joint state: a proposed split bar, or the grid point */
    var cur = view.current || (offers.length ? offers[lastIdx] : null);
    var yourShare = shareOf(cur, youSeat, them);
    if (cur && !isGrid && total && yourShare != null) {
      var bar = el('div', 'bd-t-split');
      var seg = el('div', 'bd-t-split-you');
      seg.style.width = Math.max(0, Math.min(100, yourShare / total * 100)) + '%';
      add(bar, seg);
      add(panel, add(el('div', 'bd-t-split-wrap'), add(el('div', 'bd-t-split-lab'), add(el('span', null, 'You '), mono(yourShare)), add(el('span', null, shortName(d.them) + ' '), mono(total - yourShare))), bar));
    }

    /* convergence strip: each round's offers on one shared axis */
    var pts = offers.map(function (o) { return { o: o, v: shareOf(o, youSeat, them) }; }).filter(function (p) { return p.v != null; });
    if (pts.length) {
      var hi = total || 0;
      pts.forEach(function (p) { if (p.v > hi) hi = p.v; });
      hi = hi || 1;
      var conv = el('div', 'bd-t-conv');
      add(conv, add(el('div', 'bd-t-conv-head'), el('span', 'bd-t-eyebrow', isGrid ? 'Price by round' : 'Your share by round'),
        add(el('span', 'bd-t-conv-key'), el('i', 'is-you'), el('span', null, 'You'), el('i', 'is-them'), el('span', null, shortName(d.them)))));
      var byRound = {};
      var order = [];
      pts.forEach(function (p, i) { var r = p.o.round != null ? p.o.round : i + 1; if (!byRound[r]) { byRound[r] = []; order.push(r); } byRound[r].push(p); });
      order.slice(-5).forEach(function (r) {
        var line = add(el('div', 'bd-t-conv-row'), mono('R' + r, 'bd-t-conv-r'));
        var tr = el('div', 'bd-t-conv-track');
        byRound[r].forEach(function (p) {
          var dot = el('i', 'bd-t-conv-dot ' + (p.o.seat === youSeat ? 'is-you' : 'is-them'));
          dot.style.left = (p.v / hi * 100) + '%';
          dot.title = offerText(p.o, youSeat, them, total);
          tr.appendChild(dot);
        });
        conv.appendChild(add(line, tr));
      });
      add(conv, add(el('div', 'bd-t-conv-axis'), mono(0), mono(hi)));
      panel.appendChild(conv);
    }

    /* settlement */
    if (view.settled) {
      var pay2 = view.payoffs || (cur && cur.payoffs) || null;
      var deal = !(cur && /reject|no.?deal|fail|walk/i.test(String(cur.status || '')));
      var set = el('div', 'bd-t-settle is-final');
      set.setAttribute('data-settled', '1');
      add(set, add(el('div', 'bd-t-settle-l'), el('span', 'bd-t-settle-t', deal ? 'Deal' : 'No deal'), deal && cur ? mono(offerText(cur, youSeat, them, total), 'bd-t-settle-v') : null));
      if (pay2) add(set, add(el('div', 'bd-t-settle-l'), el('span', null, 'Payoffs'), mono('you ' + num(pay2[youSeat], 0) + ' \u00b7 ' + shortName(d.them) + ' ' + num(pay2[them], 0), 'bd-t-settle-v')));
      if (ctx.anim && !(ctx.prevView && ctx.prevView.settled)) animIn(set, 'bd-t-reveal');
      panel.appendChild(set);
    } else if (cur && cur.status) {
      var stt = String(cur.status).toLowerCase();
      var said = stt === 'open' ? 'Offer on the table, round ' + (cur.round != null ? cur.round : rnd) : (stt.charAt(0).toUpperCase() + stt.slice(1).replace(/_/g, ' '));
      add(panel, el('div', 'bd-t-econ-status', said));
    }
    root.appendChild(panel);
    if (props.interactive && (props.legal || []).length) root.appendChild(econOverlay(root, props, ctx));
    var t = root.querySelector('[data-settled]') || root.querySelector('[data-latest]');
    if (t) t.classList.add('bd-last');
    return J([offers.length, view.settled]);
  });

  /* =================================================================
     custom  (mancala, morris, pentago, backgammon, shogi, xiangqi)
     HTML pieces over a hairline SVG plane, so the last-move ring works
     the same as every other family.
     ================================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in (attrs || {})) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function plane(w, h, cls) {
    var s = sv('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, 'class': 'bd-t-svg' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' });
    return s;
  }
  function at(node, x, y) { node.style.left = x + 'px'; node.style.top = y + 'px'; return node; }
  function sameRC(a, b) { return !!(a && b && a.r === b.r && a.c === b.c); }
  var CUSTOM = {};

  /* ---------- mancala: two pit rows of six, a store at each end ---------- */
  var STONE_POS = [[0, 0], [-7, -5], [7, 5], [7, -6], [-7, 6], [0, -10], [0, 10], [-11, 0], [11, 0], [-5, 2], [5, -2], [9, 9]];
  function pitEl(n, prevN, ctx, big) {
    var p = el('div', 'bd-t-pit' + (big ? ' is-store' : ''));
    var st = el('div', 'bd-t-stones');
    var show = Math.min(n, big ? 12 : 10);
    for (var i = 0; i < show; i++) {
      var s = at(el('i', 'bd-t-stone'), STONE_POS[i][0] * (big ? 1.1 : 1), STONE_POS[i][1] * (big ? 1.9 : 1));
      if (ctx.anim && prevN != null && i >= prevN) animIn(s, 'bd-t-fade', 30 * (i - prevN));
      st.appendChild(s);
    }
    p.appendChild(st);
    var c = mono(n, 'bd-t-pit-n');
    if (ctx.anim && prevN != null && prevN !== n) c.classList.add('bd-t-tick');
    p.appendChild(c);
    p.setAttribute('aria-label', n + (n === 1 ? ' stone' : ' stones'));
    return p;
  }
  CUSTOM.mancala = function (root, props, ctx) {
    var v = ctx.view, pv = ctx.prevView || null;
    var you = props.youSeat === 'p2' ? 'p2' : 'p1', them = otherSeat(you);
    var pits = v.pits || {}, stores = v.stores || {};
    var ppits = pv && pv.pits ? pv.pits : null, pst = pv && pv.stores ? pv.stores : null;
    var board = el('div', 'bd-t-mancala');
    var lm = v.lastMove;
    var mk = function (side, i) {
      var arr = pits[side] || [];
      var e = pitEl(num(arr[i], 0), ppits && ppits[side] ? num(ppits[side][i], 0) : null, ctx, false);
      e.setAttribute('data-k', 'pit:' + side + ':' + i);
      if (lm && lm.side === side && Number(lm.pit) === i) e.setAttribute('data-origin', '1');
      if (props.interactive && (props.legal || []).some(function (a) { return a.pit === i || (a.cell && a.cell.c === i); }) && side === you) e.classList.add('is-legal');
      return e;
    };
    var storeThem = pitEl(num(stores[them], 0), pst ? num(pst[them], 0) : null, ctx, true);
    var storeYou = pitEl(num(stores[you], 0), pst ? num(pst[you], 0) : null, ctx, true);
    var rows = el('div', 'bd-t-pitrows');
    var top = el('div', 'bd-t-pitrow is-top'), bot = el('div', 'bd-t-pitrow');
    for (var j = 0; j < 6; j++) { top.appendChild(mk(them, 5 - j)); bot.appendChild(mk(you, j)); }
    add(rows, top, bot);
    add(board, add(el('div', 'bd-t-storecol'), storeThem, el('span', 'bd-t-store-l', 'Store')), rows,
      add(el('div', 'bd-t-storecol'), storeYou, el('span', 'bd-t-store-l', 'Store')));
    var lab = el('div', 'bd-t-board-lab');
    add(lab, el('span', null, shortName(seatMeta(props, them, { isYou: false })) + ' sows right to left'), el('span', null, 'You sow left to right'));
    add(root, board, lab);
    if (lm && lm.extraTurn) add(root, el('div', 'bd-t-econ-status', 'Last stone in the store: another turn'));
    var t = root.querySelector('[data-origin]');
    if (t) t.classList.add('bd-last');
    /* interactive: tap one of your legal pits */
    if (props.interactive) {
      Array.prototype.forEach.call(root.querySelectorAll('.bd-t-pit.is-legal'), function (p) {
        var i = Number(p.getAttribute('data-k').split(':')[2]);
        var a = (props.legal || []).filter(function (x) { return x.pit === i || (x.cell && x.cell.c === i); })[0];
        p.setAttribute('role', 'button'); p.tabIndex = 0;
        p.addEventListener('click', function () { fire(ctx.st, props, a); });
      });
    }
    return J(lm);
  };

  /* ---------- nine men's morris: three concentric squares ---------- */
  CUSTOM.morris = function (root, props, ctx) {
    var v = ctx.view, S = 46, O = 23, W2 = S * 6 + O * 2;
    var pts = v.points || [];
    var byId = {};
    pts.forEach(function (p) { byId[p.id] = p; });
    var box = el('div', 'bd-t-morris');
    var svg = plane(W2, W2);
    (v.edges || []).forEach(function (e) {
      var a = byId[e[0]], b = byId[e[1]];
      if (a && b) sv('line', { x1: O + a.x * S, y1: O + a.y * S, x2: O + b.x * S, y2: O + b.y * S, 'class': 'bd-t-ln' }, svg);
    });
    if (v.mill && v.mill.length) {
      var m = v.mill.map(function (id) { return byId[id]; }).filter(Boolean);
      if (m.length >= 2) sv('polyline', { points: m.map(function (p) { return (O + p.x * S) + ',' + (O + p.y * S); }).join(' '), 'class': 'bd-t-mill' }, svg);
    }
    box.appendChild(svg);
    var lm = v.lastMove || null;
    var prevOwner = {};
    ((ctx.prevView && ctx.prevView.points) || []).forEach(function (p) { prevOwner[p.id] = p.owner; });
    pts.forEach(function (p) {
      var x = O + p.x * S, y = O + p.y * S;
      if (!p.owner) {
        var dot = at(el('i', 'bd-t-mdot'), x, y);
        if (lm && lm.from === p.id) dot.classList.add('is-from');
        box.appendChild(dot);
        return;
      }
      var d = at(el('div', 'bd-t-disc is-' + p.owner + (v.mill && v.mill.indexOf(p.id) >= 0 ? ' in-mill' : '')), x, y);
      d.setAttribute('data-k', 'pt:' + p.id);
      if (lm && lm.to === p.id) {
        d.setAttribute('data-to', '1');
        if (ctx.anim) {
          if (lm.from != null && byId[lm.from]) {
            var f = byId[lm.from];
            d.style.transition = 'none';
            d.style.transform = 'translate(' + (f.x - p.x) * S + 'px,' + (f.y - p.y) * S + 'px)';
            ctx.after.push(function () { d.getBoundingClientRect(); requestAnimationFrame(function () { d.style.transition = 'transform ' + MO().move + 'ms ' + MO().ease; d.style.transform = ''; }); });
          } else animIn(d, 'bd-t-arrive');
        }
      }
      box.appendChild(d);
    });
    if (ctx.anim && lm && lm.removed != null && byId[lm.removed] && prevOwner[lm.removed]) {
      var r = byId[lm.removed];
      box.appendChild(at(el('div', 'bd-t-disc is-' + prevOwner[lm.removed] + ' is-leaving'), O + r.x * S, O + r.y * S));
    }
    var you = props.youSeat === 'p2' ? 'p2' : 'p1', them = otherSeat(you);
    var inH = v.inHand || {};
    function tray(side, who) {
      var t = add(el('div', 'bd-t-tray2'), el('span', 'bd-t-tray2-l', who));
      var row = el('div', 'bd-t-tray2-row');
      for (var i = 0; i < Math.min(num(inH[side], 0), 9); i++) row.appendChild(el('i', 'bd-t-mini-disc is-' + side));
      add(t, row, mono(num(inH[side], 0) + ' in hand', 'bd-t-tray2-n'));
      return t;
    }
    add(root, tray(them, shortName(seatMeta(props, them, { isYou: false }))), box, tray(you, 'You'));
    if (v.phase) add(root, el('div', 'bd-t-econ-status', v.phase === 'moving' ? 'Moving phase: slide along a line' : 'Placing phase'));
    var t = root.querySelector('[data-to]');
    if (t) t.classList.add('bd-last');
    return J(lm);
  };

  /* ---------- pentago: four 3x3 quadrants that turn ---------- */
  var ROT_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12a7 7 0 1 1-2.05-4.95"/><path d="M19 4v4h-4"/></svg>';
  CUSTOM.pentago = function (root, props, ctx) {
    var v = ctx.view, cells = v.cells || [];
    var Q = 166, G = 10, P = 8, step = (Q - 2 * P) / 3;
    var box = el('div', 'bd-t-pentago');
    var lm = v.lastMove || null, landed = v.landed || (lm && lm.cell) || null;
    var fresh = ctx.anim && J(ctx.prevView && ctx.prevView.lastMove) !== J(lm);
    function centre(r, c) {
      var qr = r >= 3 ? 1 : 0, qc = c >= 3 ? 1 : 0;
      return { x: qc * (Q + G) + P + (c % 3) * step + step / 2, y: qr * (Q + G) + P + (r % 3) * step + step / 2 };
    }
    for (var q = 0; q < 4; q++) {
      var qr = q >> 1, qc = q & 1;
      var qd = at(el('div', 'bd-t-quad'), qc * (Q + G), qr * (Q + G));
      var turned = lm && Number(lm.quadrant) === q;
      for (var r3 = 0; r3 < 3; r3++) for (var c3 = 0; c3 < 3; c3++) {
        var r = qr * 3 + r3, c = qc * 3 + c3;
        var x = P + c3 * step + step / 2, y = P + r3 * step + step / 2;
        qd.appendChild(at(el('i', 'bd-t-well'), x, y));
        var val = (cells[r] || [])[c];
        if (val) {
          var m = at(el('div', 'bd-t-marble is-' + String(val).toLowerCase()), x, y);
          if (sameRC(landed, { r: r, c: c })) { m.setAttribute('data-landed', '1'); if (fresh && !turned) animIn(m, 'bd-t-arrive'); }
          qd.appendChild(m);
        }
      }
      var ico = el('span', 'bd-t-rotico c' + q + (turned ? ' is-used' : '') + (turned && lm.rotation === 'ccw' ? ' is-ccw' : ''));
      ico.innerHTML = ROT_ICON;
      ico.setAttribute('aria-hidden', 'true');
      if (turned) {
        qd.classList.add('is-turned');
        if (fresh) { qd.style.setProperty('--bd-t-rot', lm.rotation === 'ccw' ? '90deg' : '-90deg'); animIn(qd, 'bd-t-turn'); }
      }
      add(box, qd, ico);
    }
    if (v.winLine && v.winLine.length > 1) {
      var W2 = Q * 2 + G;
      var svg = plane(W2, W2, 'bd-t-over');
      var a = centre(v.winLine[0].r, v.winLine[0].c), b = centre(v.winLine[v.winLine.length - 1].r, v.winLine[v.winLine.length - 1].c);
      sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'bd-t-winline' }, svg);
      box.appendChild(svg);
    }
    root.appendChild(box);
    if (lm) {
      var QN = ['top left', 'top right', 'bottom left', 'bottom right'];
      add(root, el('div', 'bd-t-econ-status', 'Last turn: ' + QN[lm.quadrant] + ' quadrant, ' + (lm.rotation === 'ccw' ? 'counter-clockwise' : 'clockwise')));
    }
    var t = root.querySelector('[data-landed]');
    if (t) t.classList.add('bd-last');
    return J(lm);
  };

  /* ---------- backgammon: 24 points, bar, bear-off tray, dice ----------
     points[i] is point i+1 from p1's side: a signed count (+p1 / -p2),
     {owner, count} or {p1, p2}. bar/off {p1, p2}; dice [a, b];
     lastMove {side, moves:[{from, to}]} with 0-based indices, 'bar', 'off'. */
  function bgPoint(x) {
    if (x == null) return { owner: null, count: 0 };
    if (typeof x === 'number') return x > 0 ? { owner: 'p1', count: x } : x < 0 ? { owner: 'p2', count: -x } : { owner: null, count: 0 };
    if (x.owner) return { owner: x.owner, count: num(x.count, 0) };
    if (num(x.p1, 0) > 0) return { owner: 'p1', count: num(x.p1, 0) };
    if (num(x.p2, 0) > 0) return { owner: 'p2', count: num(x.p2, 0) };
    return { owner: null, count: 0 };
  }
  CUSTOM.backgammon = function (root, props, ctx) {
    var v = ctx.view;
    var pts = (v.points || []).map(bgPoint);
    var pad = 6, bar = 24, tray = 28, pw = 24, triH = 116, H = 300, d = 22;
    var W2 = pad * 2 + pw * 12 + bar + tray;
    var box = el('div', 'bd-t-bg');
    box.style.width = W2 + 'px'; box.style.height = H + 'px';
    var svg = plane(W2, H);
    sv('rect', { x: pad + pw * 6, y: 0, width: bar, height: H, 'class': 'bd-t-bg-bar' }, svg);
    sv('rect', { x: W2 - tray, y: 0, width: tray, height: H, 'class': 'bd-t-bg-tray' }, svg);
    var lm0 = v.lastMove, lm = lm0;
    if (lm0 && lm0.moves && lm0.moves.length) lm = Object.assign({ side: lm0.side }, lm0.moves[lm0.moves.length - 1]);
    else if (Array.isArray(lm0)) lm = lm0[lm0.length - 1];
    function pnOf(x) { return typeof x === 'number' ? x + 1 : x; }   /* engine indices are 0-based */
    var toP = lm ? pnOf(lm.to) : null, fromP = lm ? pnOf(lm.from) : null;
    function colX(k) { return pad + k * pw + (k >= 6 ? bar : 0); }
    function place(pn) { /* point number -> {k, top} */
      if (pn >= 13) return { k: pn - 13, top: true };
      return { k: 12 - pn, top: false };
    }
    for (var pn = 1; pn <= 24; pn++) {
      var pl = place(pn), x0 = colX(pl.k), cx = x0 + pw / 2;
      var tri = pl.top ? [x0 + 1, pad, x0 + pw - 1, pad, cx, pad + triH] : [x0 + 1, H - pad, x0 + pw - 1, H - pad, cx, H - pad - triH];
      sv('polygon', { points: tri.join(','), 'class': 'bd-t-tri ' + ((pl.k + (pl.top ? 0 : 1)) % 2 ? 'is-b' : 'is-a') + (String(fromP) === String(pn) ? ' is-from' : '') }, svg);
      var p = pts[pn - 1] || { owner: null, count: 0 };
      var show = Math.min(p.count, 5);
      for (var i = 0; i < show; i++) {
        var y = pl.top ? pad + 1 + i * d + d / 2 : H - pad - 1 - i * d - d / 2;
        var ck = at(el('div', 'bd-t-chk is-' + p.owner), cx, y);
        if (i === show - 1) {
          if (p.count > 5) add(ck, mono(p.count, 'bd-t-chk-n'));
          if (String(toP) === String(pn)) ck.setAttribute('data-to', '1');
        }
        box.appendChild(ck);
      }
      add(box, at(mono(pn, 'bd-t-bg-num' + (pl.top ? ' is-top' : '')), cx, pl.top ? pad + triH + 8 : H - pad - triH - 8));
    }
    var barX = pad + pw * 6 + bar / 2;
    ['p2', 'p1'].forEach(function (side, si) {
      var n = num((v.bar || {})[side], 0);
      if (n) {
        var ck = at(el('div', 'bd-t-chk is-' + side), barX, H / 2 + (si ? 26 : -26));
        if (n > 1) add(ck, mono(n, 'bd-t-chk-n'));
        if (/bar/.test(String(toP)) && lm && lm.side === side) ck.setAttribute('data-to', '1');
        box.appendChild(ck);
      }
      var off = num((v.off || {})[side], 0);
      var stack = el('div', 'bd-t-off ' + (si ? 'is-bottom' : 'is-top'));
      for (var k = 0; k < Math.min(off, 15); k++) stack.appendChild(el('i', 'bd-t-offbar is-' + side));
      add(stack, mono(off, 'bd-t-off-n'));
      if (/off/.test(String(toP)) && off && (!lm.side || lm.side === side)) stack.setAttribute('data-to', '1');
      at(stack, W2 - tray + 3, si ? H - pad - 132 : pad);
      box.appendChild(stack);
    });
    if (v.dice && v.dice.length) {
      var dz = at(el('div', 'bd-t-bg-dice'), colX(9), H / 2);
      v.dice.forEach(function (f, i) {
        var dd = die(num(f, 1), v.diceUsed && v.diceUsed[i] ? 'is-miss' : '');
        if (ctx.anim && J(ctx.prevView && ctx.prevView.dice) !== J(v.dice)) animIn(dd, 'bd-t-arrive');
        dz.appendChild(dd);
      });
      box.appendChild(dz);
    }
    box.insertBefore(svg, box.firstChild);
    root.appendChild(box);
    var t = root.querySelector('[data-to]');
    if (t) {
      t.classList.add('bd-last');
      if (ctx.anim && fromP != null && t.classList.contains('bd-t-chk')) animIn(t, 'bd-t-arrive');
    }
    return J([lm, v.dice]);
  };

  /* ---------- shogi: pentagon tiles, side by orientation ---------- */
  var SHOGI = { R: '飛', B: '角', G: '金', S: '銀', N: '桂', L: '香', P: '歩',
    '+R': '龍', '+B': '馬', '+S': '全', '+N': '圭', '+L': '杏', '+P': 'と' };
  var SHOGI_NAME = { K: 'King', R: 'Rook', B: 'Bishop', G: 'Gold', S: 'Silver', N: 'Knight', L: 'Lance', P: 'Pawn' };
  function shogiTile(piece, mine, small) {
    piece = String(piece);
    var promo = piece.charAt(0) === '+';
    var ch = piece === 'K' ? (mine ? '王' : '玉') : (SHOGI[piece] || piece);
    var t = el('div', 'bd-t-shogi' + (mine ? '' : ' is-flip') + (promo ? ' is-promo' : '') + (small ? ' is-small' : ''));
    add(t, el('span', 'bd-t-shogi-ch bd-t-cjk', ch));
    t.setAttribute('aria-label', (mine ? 'Your ' : 'Opponent ') + (promo ? 'promoted ' : '') + (SHOGI_NAME[piece.replace('+', '')] || piece));
    return t;
  }
  function shogiHand(list, mine, who) {
    var counts = {}, order = [];
    (list || []).forEach(function (p) { if (!counts[p]) { counts[p] = 0; order.push(p); } counts[p]++; });
    var row = add(el('div', 'bd-t-hand2' + (mine ? ' is-mine' : '')), el('span', 'bd-t-tray2-l', who + ' · in hand'));
    var tiles = el('div', 'bd-t-hand2-row');
    if (!order.length) add(tiles, el('span', 'bd-t-empty', 'None'));
    order.forEach(function (p) { add(tiles, add(el('span', 'bd-t-hand2-i'), shogiTile(p, mine, true), counts[p] > 1 ? mono('×' + counts[p], 'bd-t-count') : null)); });
    return add(row, tiles);
  }
  CUSTOM.shogi = function (root, props, ctx) {
    var v = ctx.view, R = v.rows || 9, C = v.cols || 9;
    var mineSide = function (s) { return s === 'w' || s === 'p1' || s === 'white'; };
    var lm = v.lastMove || null;
    var grid = el('div', 'bd-t-shogiboard');
    grid.style.gridTemplateColumns = 'repeat(' + C + ', 1fr)';
    var map = {};
    (v.pieces || []).forEach(function (p) { map[p.r + ':' + p.c] = p; });
    var hl = {};
    (v.highlights || []).forEach(function (h) { hl[h.r + ':' + h.c] = 1; });
    for (var r = 0; r < R; r++) for (var c = 0; c < C; c++) {
      var sq = el('div', 'bd-t-sq' + (lm && lm.from && sameRC(lm.from, { r: r, c: c }) ? ' is-from' : '') + (hl[r + ':' + c] ? ' is-check' : ''));
      sq.setAttribute('data-k', 'sq:' + r + ':' + c);
      var p = map[r + ':' + c];
      if (p) {
        var t = add(el('span', 'bd-t-pw'), shogiTile(p.piece, mineSide(p.side)));
        sq.appendChild(t);
        if (lm && sameRC(lm.to, { r: r, c: c })) {
          sq.setAttribute('data-to', '1');
          if (ctx.anim) {
            if (lm.from) { (function (tt, f) { ctx.after.push(function () { glide(tt, ctx.rects['sq:' + f.r + ':' + f.c], ctx.z, null, 1); }); })(t, lm.from); }
            else animIn(t, 'bd-t-arrive');
          }
        }
      }
      grid.appendChild(sq);
    }
    var them = seatMeta(props, otherSeat(props.youSeat === 'p2' ? 'p2' : 'p1'), { isYou: false });
    var hands = v.hands || {};
    add(root, shogiHand(hands.b || hands.p2, false, shortName(them)), add(el('div', 'bd-t-shogiwrap'), grid), shogiHand(hands.w || hands.p1, true, 'You'));
    var tq = root.querySelector('[data-to]');
    if (tq) tq.classList.add('bd-last');
    return J(lm);
  };

  /* ---------- xiangqi: 10 x 9 intersections, river and palaces ---------- */
  var XQ = { w: { K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵' },
             b: { K: '將', A: '士', E: '象', H: '馬', R: '車', C: '砲', P: '卒' } };
  var XQ_NAME = { K: 'General', A: 'Advisor', E: 'Elephant', H: 'Horse', R: 'Chariot', C: 'Cannon', P: 'Soldier' };
  CUSTOM.xiangqi = function (root, props, ctx) {
    var v = ctx.view, R = v.rows || 10, C = v.cols || 9, S = 36, M = 21;
    var Wd = M * 2 + S * (C - 1), Hd = M * 2 + S * (R - 1);
    var riverAfter = v.river && v.river.afterRow != null ? v.river.afterRow : 4;
    var box = el('div', 'bd-t-xq');
    box.style.width = Wd + 'px'; box.style.height = Hd + 'px';
    var svg = plane(Wd, Hd);
    sv('rect', { x: M, y: M, width: S * (C - 1), height: S * (R - 1), 'class': 'bd-t-xq-edge' }, svg);
    for (var r = 0; r < R; r++) sv('line', { x1: M, y1: M + r * S, x2: M + (C - 1) * S, y2: M + r * S, 'class': 'bd-t-ln' }, svg);
    for (var c = 1; c < C - 1; c++) {
      sv('line', { x1: M + c * S, y1: M, x2: M + c * S, y2: M + riverAfter * S, 'class': 'bd-t-ln' }, svg);
      sv('line', { x1: M + c * S, y1: M + (riverAfter + 1) * S, x2: M + c * S, y2: M + (R - 1) * S, 'class': 'bd-t-ln' }, svg);
    }
    (v.palaces || [{ r0: 0, r1: 2, c0: 3, c1: 5 }, { r0: 7, r1: 9, c0: 3, c1: 5 }]).forEach(function (p) {
      sv('line', { x1: M + p.c0 * S, y1: M + p.r0 * S, x2: M + p.c1 * S, y2: M + p.r1 * S, 'class': 'bd-t-ln' }, svg);
      sv('line', { x1: M + p.c1 * S, y1: M + p.r0 * S, x2: M + p.c0 * S, y2: M + p.r1 * S, 'class': 'bd-t-ln' }, svg);
    });
    var ry = M + riverAfter * S + S / 2;
    var t1 = sv('text', { x: M + S * 2, y: ry, 'class': 'bd-t-river' }, svg); t1.textContent = '楚 河';
    var t2 = sv('text', { x: M + S * (C - 3), y: ry, 'class': 'bd-t-river' }, svg); t2.textContent = '漢 界';
    box.appendChild(svg);
    var lm = v.lastMove || null;
    if (lm && lm.from) box.appendChild(at(el('i', 'bd-t-xfrom'), M + lm.from.c * S, M + lm.from.r * S));
    var hl = {};
    (v.highlights || []).forEach(function (h) { hl[h.r + ':' + h.c] = 1; });
    (v.pieces || []).forEach(function (p) {
      var side = p.side === 'b' || p.side === 'p2' || p.side === 'black' ? 'b' : 'w';
      var d = at(el('div', 'bd-t-xpc is-' + side + (hl[p.r + ':' + p.c] ? ' is-check' : '')), M + p.c * S, M + p.r * S);
      add(d, el('span', 'bd-t-cjk', (XQ[side][p.piece] || p.piece)));
      d.setAttribute('aria-label', (side === 'w' ? 'Your ' : 'Opponent ') + (XQ_NAME[p.piece] || p.piece));
      d.setAttribute('data-k', 'xq:' + p.r + ':' + p.c);
      if (lm && sameRC(lm.to, p)) {
        d.setAttribute('data-to', '1');
        if (ctx.anim && lm.from) (function (dd, f) { ctx.after.push(function () { glide(dd, ctx.rects['xq:' + f.r + ':' + f.c], ctx.z, null, 1); }); })(d, lm.from);
      }
      box.appendChild(d);
    });
    root.appendChild(box);
    var tq = root.querySelector('[data-to]');
    if (tq) tq.classList.add('bd-last');
    return J(lm);
  };

  family('custom', function (root, props, ctx) {
    var k = String(ctx.view.kind || '').toLowerCase().replace(/[^a-z]/g, '');
    if (k === 'ninemensmorris') k = 'morris';
    var fn = CUSTOM[k];
    if (!fn) { add(root, el('div', 'bd-t-err', 'This board is not drawn in the prototype yet.')); return null; }
    root.classList.add('bd-t-k-' + k);
    return fn(root, props, ctx);
  });
})();
