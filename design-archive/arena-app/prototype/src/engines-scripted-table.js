/* =====================================================================
   eSlams Arena app prototype  |  src/engines-scripted-table.js  [B]
   window.ESE_SCRIPTED_TABLE = { [slug]: () => { frames, ledger, result } }
   ---------------------------------------------------------------------
   Seventeen card, dice and economic tables. Plain script, ES2020, no DOM.
   Deterministic: mulberry32. Each game searches forward from a fixed base
   seed for a deal whose record fits 8..30 frames, then memoises; every call
   returns a fresh deep copy. Legal by construction: cards come from a real
   shuffled deck and the small simulators below enforce the rules.
   The human is seat1 / p1 ('you') in every record. Ledger seat is 'you',
   'model' (two seats) or 'seat2'..'seat4' (ring and compass tables).

   ViewState fields beyond CONTRACT section 5 (the renderer may ignore any):
   all families
     toAct            seat id to act next, null on the terminal frame
     terminal         true on the last frame only
   card_table
     revealed         true when any opponent hand is shown face up
     metrics          [{label, value}] public counters (Clues, Lives, Stock...)
     stock            cards or tiles left to draw (absent when not used)
     trump            suit name or null (spades, euchre, bridge)
     contract         bridge only, e.g. '4\u2660' or '3NT'; declarer: seat id
     piles            [{label, cards}] secondary public piles (crib, kitty, discards)
     seats[].bet      poker: chips put in during this betting round
     seats[].tricks   trick games: tricks taken
     seats[].score    running points (hearts, spades, euchre, cribbage)
     seats[].note     short public tag ('Small blind', 'Dummy', 'Knocked')
     seats[].winner   true on the terminal frame for the winning seat(s)
     seats[].melds, seats[].deadwood   gin rummy showdown only
     center.cards[i].by   seat id that played the card ('start' for a turned starter)
     card shapes      mahjong tile {rank, suit:'bamboo'|'dots'|'characters'|'honors', id}
                      (honors rank 'E','S','W','N','Rd','Gr','Wh'); hanabi card
                      {rank:'1'..'5', suit:'red'|'yellow'|'green'|'blue'|'white', id};
                      dou dizhu joker {rank:'BJ'|'RJ', suit:'joker'}
     hanabi           your hidden cards and the partner's visible cards carry
                      known:{suit?, rank?} from clues; yourHand is the hidden set
   dice_table
     phase, history [{seat, count, face}], actual (count on reveal), wild: 1
   economic_panel
     kind 'split'|'grid', pool (split), fallback {p1,p2}, round, maxRounds, roles, phase, lastAction,
     grid {prices, deliveries}; offers[i] adds split | price, delivery, payoffs;
     current {seat, round, split | price, delivery, payoffs, status}
   result extras: scores keyed p1/p2 or seat1..seat4, winners [ids], shared (hanabi)
   ===================================================================== */
(function () {
  'use strict';

  var R = typeof window !== 'undefined' ? window : globalThis;
  var T = {};

  /* ---------- shared helpers ---------- */
  function rngOf(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ri(rng, n) { return Math.floor(rng() * n); }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  var SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  var SYM = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
  var RV = { A: 14, K: 13, Q: 12, J: 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 };
  var WORD = { 14: 'ace', 13: 'king', 12: 'queen', 11: 'jack', 10: 'ten', 9: 'nine', 8: 'eight',
    7: 'seven', 6: 'six', 5: 'five', 4: 'four', 3: 'three', 2: 'two', 1: 'ace' };
  function plural(v) { return v === 6 ? 'sixes' : WORD[v] + 's'; }

  function deck52() {
    var d = [];
    SUITS.forEach(function (s) { RANKS.forEach(function (r) { d.push({ rank: r, suit: s }); }); });
    return d;
  }
  function shuffle(a, rng) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = ri(rng, i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function hid(n) { var a = []; for (var i = 0; i < n; i++) a.push({ hidden: true }); return a; }
  function cn(c) { return c.rank + (SYM[c.suit] || ''); }
  function cns(cs) { return cs.map(cn).join(' '); }
  function same(a, b) { return a.rank === b.rank && a.suit === b.suit && a.id === b.id; }
  function has(hand, c) { return hand.some(function (x) { return same(x, c); }); }
  function drop(hand, c) {
    var i = hand.findIndex(function (x) { return same(x, c); });
    if (i < 0) throw new Error('card not in hand: ' + cn(c));
    var h = hand.slice(); h.splice(i, 1); return h;
  }
  function dropAll(hand, cs) { cs.forEach(function (c) { hand = drop(hand, c); }); return hand; }
  function sortHand(h, first) {
    var order = SUITS.slice();
    if (first && order.indexOf(first) >= 0) { order.splice(order.indexOf(first), 1); order.unshift(first); }
    return h.slice().sort(function (a, b) {
      var s = order.indexOf(a.suit) - order.indexOf(b.suit);
      return s !== 0 ? s : RV[b.rank] - RV[a.rank];
    });
  }
  function bySuit(h, s) { return h.filter(function (c) { return c.suit === s; }); }
  function lowest(cs) { return cs.slice().sort(function (a, b) { return RV[a.rank] - RV[b.rank]; })[0]; }
  function highest(cs) { return cs.slice().sort(function (a, b) { return RV[b.rank] - RV[a.rank]; })[0]; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }

  /* ledger seat name for a view seat id */
  function who(id) {
    if (id === 'p1' || id === 'seat1') return 'you';
    if (id === 'p2') return 'model';
    return id;
  }
  function twoSeats(a, b) {
    return [{ id: 'p1', label: a || 'Seat A', isYou: true }, { id: 'p2', label: b || 'Seat B', isYou: false }];
  }

  function recorder() {
    var rec = { frames: [], ledger: [] };
    rec.start = function (view) { view.terminal = false; rec.frames.push(cp(view)); };
    rec.step = function (seatId, action, view, reasoning, cell) {
      var row = { turn: rec.ledger.length + 1, seat: who(seatId), action: action,
        reasoning: reasoning == null ? null : reasoning };
      if (cell) row.cell = cell;
      rec.ledger.push(row);
      view.terminal = false;
      rec.frames.push(cp(view));
    };
    rec.finish = function (result) {
      var last = rec.frames[rec.frames.length - 1];
      last.terminal = true;
      last.toAct = null;
      return { frames: rec.frames, ledger: rec.ledger, result: result };
    };
    return rec;
  }

  /* search forward from a base seed for a record that fits 8..30 frames */
  function search(slug, build, min) {
    var base = hashStr(slug);
    for (var k = 0; k < 600; k++) {
      var r = build((base + k * 7919) >>> 0);
      if (r && r.frames.length >= (min || 8) && r.frames.length <= 30) return r;
    }
    throw new Error(slug + ': no fitting deal found');
  }
  function define(slug, build, min) {
    var cache = null;
    T[slug] = function () {
      if (!cache) cache = search(slug, build, min);
      return cp(cache);
    };
  }

  /* ---------- poker: hand evaluation ---------- */
  function eval5(cs) {
    var v = cs.map(function (c) { return RV[c.rank]; }).sort(function (a, b) { return b - a; });
    var flush = cs.every(function (c) { return c.suit === cs[0].suit; });
    var uniq = v.filter(function (x, i) { return v.indexOf(x) === i; });
    var sh = 0;
    if (uniq.length === 5) {
      if (uniq[0] - uniq[4] === 4) sh = uniq[0];
      else if (uniq[0] === 14 && uniq[1] === 5) sh = 5;
    }
    var cnt = {};
    v.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
    var g = Object.keys(cnt).map(Number).sort(function (a, b) { return cnt[b] - cnt[a] || b - a; });
    var shape = g.map(function (x) { return cnt[x]; });
    if (sh && flush) return [8, sh];
    if (shape[0] === 4) return [7, g[0], g[1]];
    if (shape[0] === 3 && shape[1] === 2) return [6, g[0], g[1]];
    if (flush) return [5].concat(v);
    if (sh) return [4, sh];
    if (shape[0] === 3) return [3].concat(g);
    if (shape[0] === 2 && shape[1] === 2) return [2].concat(g);
    if (shape[0] === 2) return [1].concat(g);
    return [0].concat(v);
  }
  function cmpScore(a, b) {
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var d = (a[i] || 0) - (b[i] || 0);
      if (d) return d;
    }
    return 0;
  }
  function best5(cs) {
    var best = null;
    var n = cs.length;
    for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) for (var c = b + 1; c < n; c++)
      for (var d = c + 1; d < n; d++) for (var e = d + 1; e < n; e++) {
        var s = eval5([cs[a], cs[b], cs[c], cs[d], cs[e]]);
        if (!best || cmpScore(s, best) > 0) best = s;
      }
    return best;
  }
  function handName(s) {
    switch (s[0]) {
      case 8: return s[1] === 14 ? 'a royal flush' : 'a straight flush, ' + WORD[s[1]] + ' high';
      case 7: return 'four ' + plural(s[1]);
      case 6: return 'a full house, ' + plural(s[1]) + ' over ' + plural(s[2]);
      case 5: return 'a flush, ' + WORD[s[1]] + ' high';
      case 4: return 'a straight, ' + WORD[s[1]] + ' high';
      case 3: return 'three ' + plural(s[1]);
      case 2: return 'two pair, ' + plural(s[1]) + ' and ' + plural(s[2]);
      case 1: return 'a pair of ' + plural(s[1]);
      default: return WORD[s[1]] + ' high';
    }
  }

  /* ---------- poker: one hand, four seats ---------- */
  var POKER = {
    leduc: { stack: 40, ante: 1, bets: [2, 4], cap: 2, streets: ['Round 1', 'Round 2'], deal: [1], minPot: 12 },
    limit: { stack: 100, sb: 1, bb: 2, bets: [2, 2, 4, 4], cap: 4, streets: ['Preflop', 'Flop', 'Turn', 'River'], deal: [3, 1, 1], minPot: 28 },
    nl: { stack: 200, sb: 1, bb: 2, cap: 3, streets: ['Preflop', 'Flop', 'Turn', 'River'], deal: [3, 1, 1], minPot: 40 }
  };

  function pokerRecord(kind, seed) {
    var cfg = POKER[kind];
    var rng = rngOf(seed);
    var deck = kind === 'leduc'
      ? shuffle(['J', 'Q', 'K'].reduce(function (a, r) { return a.concat([{ rank: r, suit: 'spades' }, { rank: r, suit: 'hearts' }]); }, []), rng)
      : shuffle(deck52(), rng);
    var d = ri(rng, 4);
    var seats = [0, 1, 2, 3].map(function (i) {
      return { id: 'seat' + (i + 1), label: 'Seat ' + (i + 1), stack: cfg.stack, put: 0, bet: 0, folded: false, hole: [], role: null };
    });
    var nh = kind === 'leduc' ? 1 : 2;
    for (var k = 0; k < nh; k++) for (var j = 0; j < 4; j++) seats[(d + 1 + j) % 4].hole.push(deck.pop());
    seats[d].role = 'Dealer';
    var board = [];
    var st = 0;
    var betsCount = 0;
    var lastInc = cfg.bb || 2;
    var lastAction = null;
    var rec = recorder();

    function pot() { return sum(seats.map(function (s) { return s.put; })); }
    function maxBet() { return Math.max.apply(null, seats.map(function (s) { return s.bet; })); }
    function post(i, amt) { seats[i].stack -= amt; seats[i].put += amt; seats[i].bet += amt; }
    function live() { return seats.filter(function (s) { return !s.folded; }); }

    var first;
    if (kind === 'leduc') {
      seats.forEach(function (s) { s.stack -= cfg.ante; s.put += cfg.ante; });
      first = (d + 1) % 4;
    } else {
      var sbI = (d + 1) % 4, bbI = (d + 2) % 4;
      seats[sbI].role = 'Small blind'; seats[bbI].role = 'Big blind';
      post(sbI, cfg.sb); post(bbI, cfg.bb);
      betsCount = 1;
      first = (d + 3) % 4;
    }
    var needs = seats.map(function () { return true; });
    function nextFrom(i) {
      for (var q = 0; q < 4; q++) { var x = (i + q) % 4; if (needs[x]) return x; }
      return -1;
    }

    function view(cur, reveal) {
      return {
        family: 'card_table', seatLayout: 'table_ring',
        seats: seats.map(function (s) {
          var real = s.id === 'seat1' || (reveal && !s.folded);
          var o = { id: s.id, label: s.label, isYou: s.id === 'seat1', cards: real ? cp(s.hole) : hid(s.hole.length),
            count: s.hole.length, chips: s.stack, bet: s.bet, folded: s.folded };
          if (s.role) o.role = s.role;
          if (s.winner) o.winner = true;
          return o;
        }),
        center: { label: 'Community', cards: cp(board) },
        pot: pot(), phase: reveal ? 'Showdown' : cfg.streets[st], yourHand: cp(seats[0].hole),
        lastAction: lastAction, toAct: cur < 0 ? null : seats[cur].id, revealed: !!reveal
      };
    }

    function strength(i) {
      var s = seats[i];
      if (kind === 'leduc') {
        var v = RV[s.hole[0].rank];
        if (board.length && board[0].rank === s.hole[0].rank) return 0.95;
        return (v - 10) / 3 * 0.6 - (board.length ? 0.12 : 0);
      }
      var h = s.hole;
      if (!board.length) {
        var a = RV[h[0].rank], b = RV[h[1].rank], hi = Math.max(a, b), lo = Math.min(a, b);
        var x = (hi + lo) / 28 * 0.6;
        if (a === b) x = 0.55 + hi / 14 * 0.4;
        if (h[0].suit === h[1].suit) x += 0.05;
        if (hi - lo === 1) x += 0.04;
        return x;
      }
      var sc = best5(h.concat(board));
      var y = [0.15, 0.45, 0.66, 0.76, 0.82, 0.86, 0.92, 0.97, 0.99][sc[0]];
      if (sc[0] === 0) y += (sc[1] - 8) / 60;
      if (sc[0] === 1) y += (sc[1] - 8) / 40;
      if (board.length === 5 && cmpScore(sc, best5(board)) === 0) y = 0.2;
      return y;
    }

    function decide(i) {
      var s = seats[i];
      var toCall = maxBet() - s.bet;
      var x = strength(i) + (rng() - 0.5) * 0.16;
      var canRaise = betsCount < cfg.cap;
      var target = 0;
      if (canRaise) {
        if (kind === 'nl') {
          var after = pot() + toCall;
          var inc = Math.max(lastInc, Math.round(after * (x > 0.85 ? 1 : 0.5)));
          var eff = Math.min.apply(null, live().map(function (z) { return z.stack + z.bet; }));
          target = Math.min(maxBet() + inc, eff - 1);
          if (target <= maxBet()) target = 0;
        } else {
          target = maxBet() + cfg.bets[st];
        }
      }
      if (toCall === 0) {
        if (x > 0.62 && target) return { t: maxBet() === 0 ? 'bet' : 'raise', to: target };
        return { t: 'check' };
      }
      var odds = toCall / (pot() + toCall);
      if (x > 0.8 && target) return { t: 'raise', to: target };
      if (x > odds + 0.22 || (x > 0.3 && toCall <= (cfg.bb || 2))) return { t: 'call' };
      return { t: 'fold' };
    }

    function award(winners, total) {
      var share = Math.floor(total / winners.length);
      var rem = total - share * winners.length;
      winners.forEach(function (w, n) { w.stack += share + (n === 0 ? rem : 0); w.winner = true; });
      seats.forEach(function (s) { s.put = 0; s.bet = 0; });
    }
    function scores() {
      var o = {};
      seats.forEach(function (s) { o[s.id] = s.stack - cfg.stack; });
      return o;
    }
    function nameOf(s) { return s.id === 'seat1' ? 'You' : s.label; }

    var cur = nextFrom(first);
    while (cur >= 0) {
      if (rec.ledger.length > 29) return null;
      if (!rec.frames.length) rec.start(view(cur, false));
      var s = seats[cur];
      var a = decide(cur);
      var toCall = maxBet() - s.bet;
      var label;
      if (a.t === 'fold') { s.folded = true; label = 'Folds'; }
      else if (a.t === 'check') label = 'Checks';
      else if (a.t === 'call') { post(cur, toCall); label = 'Calls ' + toCall; }
      else {
        lastInc = Math.max(lastInc, a.to - maxBet());
        post(cur, a.to - s.bet);
        betsCount++;
        seats.forEach(function (z, x) { needs[x] = !z.folded && x !== cur; });
        label = (a.t === 'bet' ? 'Bets ' : 'Raises to ') + a.to;
      }
      needs[cur] = false;
      lastAction = { seat: s.id, label: label };
      var acted = s.id;
      var lv = live();
      if (lv.length === 1) return null; /* records always reach a showdown */
      if (needs.indexOf(true) < 0) {
        if (st === cfg.streets.length - 1) {
          var total = pot();
          var best = null, winners = [];
          lv.forEach(function (z) {
            var sc = kind === 'leduc' ? [z.hole[0].rank === board[0].rank ? 1 : 0, RV[z.hole[0].rank]] : best5(z.hole.concat(board));
            z.score = sc;
            var c = best ? cmpScore(sc, best) : 1;
            if (c > 0) { best = sc; winners = [z]; } else if (c === 0) winners.push(z);
          });
          /* keep deals where you reach a showdown for a real pot with one winner */
          if (total < cfg.minPot || winners.length > 1 || seats[0].folded || lv.length < 2) return null;
          award(winners, total);
          var hn = kind === 'leduc' ? (best[0] ? 'a pair of ' + plural(best[1]) : WORD[best[1]] + ' high') : handName(best);
          var line = winners.length === 1
            ? nameOf(winners[0]) + (winners[0].id === 'seat1' ? ' win ' : ' wins ') + total + ' chips with ' + hn + '.'
            : winners.map(nameOf).join(' and ') + ' split ' + total + ' chips with ' + hn + '.';
          rec.step(acted, label, view(-1, true));
          return rec.finish({ winner: winners[0].id, winners: winners.map(function (z) { return z.id; }), line: line, scores: scores() });
        }
        st++;
        var nd = cfg.deal[st - 1];
        for (var q = 0; q < nd; q++) board.push(deck.pop());
        seats.forEach(function (z, x) { z.bet = 0; needs[x] = !z.folded; });
        betsCount = 0;
        lastInc = cfg.bb || 2;
        cur = nextFrom((d + 1) % 4);
      } else {
        cur = nextFrom((cur + 1) % 4);
      }
      rec.step(acted, label, view(cur, false));
    }
    return null;
  }

  define('leduc-holdem', function (seed) { return pokerRecord('leduc', seed); });
  define('limit-texas-holdem', function (seed) { return pokerRecord('limit', seed); }, 12);
  define('no-limit-texas-holdem', function (seed) { return pokerRecord('nl', seed); }, 12);

  /* ---------- two-seat trick play (hearts, spades, euchre) ---------- */
  function other(id) { return id === 'p1' ? 'p2' : 'p1'; }
  function plain(c) { var o = { rank: c.rank, suit: c.suit }; if (c.id) o.id = c.id; return o; }

  function trickState(hands, extra) {
    return Object.assign({ hands: hands, trick: [], tricks: { p1: 0, p2: 0 }, taken: { p1: [], p2: [] },
      lastAction: null, toAct: 'p1', phase: 'Deal', trump: null, roles: { p2: 'Dealer' }, notes: {},
      score: null, centerLabel: 'Current trick', center: null, metrics: null, broken: false }, extra || {});
  }
  function trickView(S) {
    var v = {
      family: 'card_table', seatLayout: 'two_sides',
      seats: ['p1', 'p2'].map(function (id) {
        var o = { id: id, label: id === 'p1' ? 'Seat A' : 'Seat B', isYou: id === 'p1',
          cards: id === 'p1' ? sortHand(S.hands.p1, S.trump) : hid(S.hands.p2.length),
          count: S.hands[id].length, tricks: S.tricks[id] };
        if (S.roles[id]) o.role = S.roles[id];
        if (S.notes[id]) o.note = S.notes[id];
        if (S.score) o.score = S.score[id];
        if (S.winners && S.winners.indexOf(id) >= 0) o.winner = true;
        return o;
      }),
      center: { label: S.centerLabel, cards: cp(S.center || S.trick) },
      phase: S.phase, yourHand: sortHand(S.hands.p1, S.trump), lastAction: S.lastAction,
      toAct: S.toAct, trump: S.trump, revealed: false
    };
    if (S.metrics) v.metrics = S.metrics(S);
    return v;
  }

  /* rules: legal(S,id) -> cards, choose(S,id,legal) -> card, winner(S) -> id,
     onPlay?(S,card,id), onTrick?(S), done(S) -> result */
  function playTricks(S, rec, rules) {
    var leader = S.toAct;
    var total = S.hands.p1.length;
    for (var t = 0; t < total; t++) {
      S.trick = [];
      var order = [leader, other(leader)];
      for (var k = 0; k < 2; k++) {
        var id = order[k];
        var legal = rules.legal(S, id);
        var c = rules.choose(S, id, legal);
        if (!legal.some(function (x) { return same(x, c); })) throw new Error('illegal play');
        S.hands[id] = drop(S.hands[id], c);
        S.trick.push(Object.assign(plain(c), { by: id }));
        if (rules.onPlay) rules.onPlay(S, c, id);
        var label = (k === 0 ? 'Leads ' : 'Plays ') + cn(c);
        var suitOf = rules.suitOf || function (x) { return x.suit; };
        S.phase = 'Trick ' + (t + 1) + ' of ' + total;
        if (k === 1) {
          var w = rules.winner(S);
          S.tricks[w]++;
          S.taken[w] = S.taken[w].concat(S.trick.map(plain));
          if (rules.onTrick) rules.onTrick(S);
          if (w === id) label += ' and takes the trick';
          else if (suitOf(c) !== suitOf(S.trick[0])) label = 'Discards ' + cn(c);
          leader = w;
          S.toAct = w;
        } else {
          S.toAct = order[1];
        }
        S.lastAction = { seat: id, label: label };
        if (t === total - 1 && k === 1) {
          var res = rules.done(S);
          S.phase = 'Hand over';
          S.toAct = null;
          rec.step(id, label, trickView(S));
          return rec.finish(res);
        }
        rec.step(id, label, trickView(S));
      }
    }
    return null;
  }
  function followOrAll(hand, suitOf, ledSuit) {
    var f = hand.filter(function (c) { return suitOf(c) === ledSuit; });
    return f.length ? f : hand.slice();
  }
  function dealTwo(deck, n) {
    var h = { p1: [], p2: [] };
    for (var i = 0; i < n; i++) { h.p1.push(deck.pop()); h.p2.push(deck.pop()); }
    return h;
  }
  function seatWord(id) { return id === 'p1' ? 'Seat A' : 'Seat B'; }

  /* ---------- hearts: two seats, eight cards each ---------- */
  function heartsRecord(seed) {
    var rng = rngOf(seed);
    var deck = shuffle(deck52(), rng);
    var S = trickState(dealTwo(deck, 8));
    var isQS = function (c) { return c.rank === 'Q' && c.suit === 'spades'; };
    var pen = function (cs) { return sum(cs.map(function (c) { return c.suit === 'hearts' ? 1 : isQS(c) ? 13 : 0; })); };
    var dealtPen = pen(S.hands.p1.concat(S.hands.p2));
    if (dealtPen < 16) return null; /* queen of spades and three hearts in play */
    S.score = { p1: 0, p2: 0 };
    S.metrics = function (s) { return [{ label: 'Hearts', value: s.broken ? 'Broken' : 'Not broken' }]; };
    var rec = recorder();
    rec.start(trickView(S));
    return playTricks(S, rec, {
      legal: function (s, id) {
        var h = s.hands[id];
        var firstTrick = s.tricks.p1 + s.tricks.p2 === 0;
        if (!s.trick.length) {
          var nh = h.filter(function (c) { return c.suit !== 'hearts'; });
          return s.broken || !nh.length ? h.slice() : nh;
        }
        var f = followOrAll(h, function (c) { return c.suit; }, s.trick[0].suit);
        if (firstTrick && f.length === h.length && f[0].suit !== s.trick[0].suit) {
          var safe = f.filter(function (c) { return c.suit !== 'hearts' && !isQS(c); });
          if (safe.length) return safe;
        }
        return f;
      },
      choose: function (s, id, legal) {
        if (!s.trick.length) {
          var noQ = legal.filter(function (c) { return !isQS(c); });
          return lowest(noQ.length ? noQ : legal);
        }
        var led = s.trick[0];
        if (legal[0].suit === led.suit) {
          var below = legal.filter(function (c) { return RV[c.rank] < RV[led.rank]; });
          if (below.length) return highest(below);
          var nq = legal.filter(function (c) { return !isQS(c); });
          return pen([led]) ? lowest(legal) : highest(nq.length ? nq : legal);
        }
        var q = legal.filter(isQS);
        if (q.length) return q[0];
        var hs = legal.filter(function (c) { return c.suit === 'hearts'; });
        return highest(hs.length ? hs : legal);
      },
      onPlay: function (s, c) { if (c.suit === 'hearts') s.broken = true; },
      winner: function (s) {
        var a = s.trick[0], b = s.trick[1];
        return b.suit === a.suit && RV[b.rank] > RV[a.rank] ? b.by : a.by;
      },
      onTrick: function (s) { s.score = { p1: pen(s.taken.p1), p2: pen(s.taken.p2) }; },
      done: function (s) {
        var sc = { p1: pen(s.taken.p1), p2: pen(s.taken.p2) };
        var moon = sc.p1 === dealtPen ? 'p1' : sc.p2 === dealtPen ? 'p2' : null;
        if (moon) return null; /* keep ordinary hands for the record */
        s.score = sc;
        var w = sc.p1 < sc.p2 ? 'p1' : sc.p2 < sc.p1 ? 'p2' : 'draw';
        if (w !== 'draw') s.winners = [w];
        var line = w === 'draw' ? 'Level on ' + sc.p1 + ' penalty points each.'
          : seatWord(w) + ' wins with ' + sc[w] + ' penalty points to ' + sc[other(w)] + '.';
        return { winner: w, line: line, scores: sc };
      }
    });
  }
  define('hearts', heartsRecord);

  /* ---------- spades: two seats, eight cards each, bids first ---------- */
  function spadesRecord(seed) {
    var rng = rngOf(seed);
    var deck = shuffle(deck52(), rng);
    var S = trickState(dealTwo(deck, 8), { trump: 'spades' });
    S.metrics = function (s) { return [{ label: 'Spades', value: s.broken ? 'Broken' : 'Not broken' }]; };
    var bids = {};
    function estimate(h) {
      var e = 0;
      h.forEach(function (c) {
        var v = RV[c.rank];
        if (c.suit === 'spades') e += v === 14 ? 1 : v === 13 ? 0.8 : v === 12 ? 0.5 : 0;
        else if (v === 14) e += 0.9;
        else if (v === 13 && bySuit(h, c.suit).length >= 2) e += 0.6;
        else if (v === 12 && bySuit(h, c.suit).length >= 3) e += 0.3;
      });
      e += Math.max(0, bySuit(h, 'spades').length - 2) * 0.6;
      return Math.max(1, Math.round(e));
    }
    var rec = recorder();
    S.phase = 'Bidding';
    rec.start(trickView(S));
    if (estimate(S.hands.p1) + estimate(S.hands.p2) < 4) return null;
    ['p1', 'p2'].forEach(function (id) {
      bids[id] = estimate(S.hands[id]);
      S.notes[id] = 'Bid ' + bids[id];
      S.lastAction = { seat: id, label: 'Bids ' + bids[id] };
      S.toAct = id === 'p1' ? 'p2' : 'p1';
      rec.step(id, 'Bids ' + bids[id], trickView(S));
    });
    var beats = function (b, a) {
      if (b.suit === a.suit) return RV[b.rank] > RV[a.rank];
      return b.suit === 'spades';
    };
    return playTricks(S, rec, {
      legal: function (s, id) {
        var h = s.hands[id];
        if (!s.trick.length) {
          var ns = h.filter(function (c) { return c.suit !== 'spades'; });
          return s.broken || !ns.length ? h.slice() : ns;
        }
        return followOrAll(h, function (c) { return c.suit; }, s.trick[0].suit);
      },
      choose: function (s, id, legal) {
        var need = bids[id] - s.tricks[id] > 0;
        if (!s.trick.length) {
          var aces = legal.filter(function (c) { return c.rank === 'A'; });
          return need && aces.length ? aces[0] : lowest(legal);
        }
        var led = s.trick[0];
        var win = legal.filter(function (c) { return beats(c, led); });
        if (need && win.length) return lowest(win);
        var lose = legal.filter(function (c) { return !beats(c, led); });
        return lowest(lose.length ? lose : legal);
      },
      onPlay: function (s, c) { if (c.suit === 'spades') s.broken = true; },
      winner: function (s) { return beats(s.trick[1], s.trick[0]) ? s.trick[1].by : s.trick[0].by; },
      done: function (s) {
        var sc = {};
        ['p1', 'p2'].forEach(function (id) {
          var t = s.tricks[id], b = bids[id];
          sc[id] = t >= b ? 10 * b + (t - b) : -10 * b;
          s.notes[id] = 'Bid ' + b + ', took ' + t;
        });
        s.score = sc;
        var w = sc.p1 > sc.p2 ? 'p1' : sc.p2 > sc.p1 ? 'p2' : 'draw';
        if (w !== 'draw') s.winners = [w];
        var line = w === 'draw' ? 'Level on ' + sc.p1 + ' points.'
          : seatWord(w) + (s.tricks[w] >= bids[w] ? ' makes its bid of ' + bids[w] : ' scores more')
            + ' and wins ' + sc[w] + ' to ' + sc[other(w)] + '.';
        return { winner: w, line: line, scores: sc };
      }
    });
  }
  define('spades', spadesRecord);

  /* ---------- euchre: two seats, 24-card deck, five cards each ---------- */
  var SAME_COLOUR = { spades: 'clubs', clubs: 'spades', hearts: 'diamonds', diamonds: 'hearts' };
  function euchreRecord(seed) {
    var rng = rngOf(seed);
    var deck = shuffle(deck52().filter(function (c) { return RV[c.rank] >= 9; }), rng);
    var S = trickState(dealTwo(deck, 5));
    var up = deck.pop();
    var U = up.suit;
    var eff = function (c) { return c.rank === 'J' && c.suit === SAME_COLOUR[U] ? U : c.suit; };
    var power = function (c, ledSuit) {
      if (c.rank === 'J' && c.suit === U) return 100;
      if (c.rank === 'J' && c.suit === SAME_COLOUR[U]) return 99;
      if (c.suit === U) return 50 + RV[c.rank];
      return eff(c) === ledSuit ? RV[c.rank] : 0;
    };
    var trumpCount = function (h) { return h.filter(function (c) { return eff(c) === U; }).length; };
    var bower = function (h) { return h.some(function (c) { return power(c, U) >= 99; }); };
    S.centerLabel = 'Upcard';
    S.center = [plain(up)];
    S.phase = 'Calling trump';
    S.metrics = function () { return [{ label: 'Upcard', value: cn(up) }]; };
    var rec = recorder();
    rec.start(trickView(S));
    var n1 = trumpCount(S.hands.p1);
    var dealerHand = S.hands.p2.concat([up]);
    var n2 = trumpCount(dealerHand);
    var maker;
    if (n1 >= 3 || (n1 >= 2 && bower(S.hands.p1))) {
      maker = 'p1';
      S.notes.p1 = 'Maker';
      S.lastAction = { seat: 'p1', label: 'Orders up ' + U };
      S.toAct = 'p2';
      rec.step('p1', 'Orders up ' + U, trickView(S));
    } else if (n2 >= 3) {
      maker = 'p2';
      S.lastAction = { seat: 'p1', label: 'Passes' };
      S.toAct = 'p2';
      rec.step('p1', 'Passes', trickView(S));
    } else {
      return null; /* keep deals decided in the first round */
    }
    var throwAway = dealerHand.filter(function (c) { return eff(c) !== U; });
    var dump = throwAway.length ? lowest(throwAway) : lowest(dealerHand);
    S.hands.p2 = drop(dealerHand, dump);
    S.trump = U;
    S.notes[maker] = 'Maker';
    S.centerLabel = 'Current trick';
    S.center = null;
    S.phase = 'Trick 1 of 5';
    S.toAct = 'p1';
    var pick = 'Picks up ' + cn(up) + ' and discards face down';
    S.lastAction = { seat: 'p2', label: pick };
    S.metrics = function () { return [{ label: 'Trump', value: U }]; };
    rec.step('p2', pick, trickView(S));
    return playTricks(S, rec, {
      suitOf: eff,
      legal: function (s, id) {
        if (!s.trick.length) return s.hands[id].slice();
        return followOrAll(s.hands[id], eff, eff(s.trick[0]));
      },
      choose: function (s, id, legal) {
        if (!s.trick.length) {
          var tr = legal.filter(function (c) { return eff(c) === U; });
          if (tr.length && (bower(legal) || (id === maker && tr.length >= 2)))
            return tr.sort(function (a, b) { return power(b, U) - power(a, U); })[0];
          var aces = legal.filter(function (c) { return c.rank === 'A' && eff(c) !== U; });
          if (aces.length) return aces[0];
          return legal.slice().sort(function (a, b) { return power(a, a.suit) - power(b, b.suit); })[0];
        }
        var led = s.trick[0], ls = eff(led), lp = power(led, ls);
        var by = function (a, b) { return power(a, ls) - power(b, ls); };
        var win = legal.filter(function (c) { return power(c, ls) > lp; }).sort(by);
        return win.length ? win[0] : legal.slice().sort(by)[0];
      },
      winner: function (s) {
        var ls = eff(s.trick[0]);
        return power(s.trick[1], ls) > power(s.trick[0], ls) ? s.trick[1].by : s.trick[0].by;
      },
      done: function (s) {
        var t = s.tricks[maker];
        var sc = { p1: 0, p2: 0 };
        var w, line;
        if (t >= 3) {
          w = maker; sc[w] = t === 5 ? 2 : 1;
          line = seatWord(w) + ' calls ' + U + ' and takes ' + t + ' tricks for ' + sc[w] + (sc[w] === 1 ? ' point.' : ' points.');
        } else {
          w = other(maker); sc[w] = 2;
          line = seatWord(w) + ' euchres the maker, ' + t + ' tricks to ' + (5 - t) + ', for 2 points.';
        }
        s.score = sc;
        s.winners = [w];
        return { winner: w, line: line, scores: sc };
      }
    });
  }
  define('euchre', euchreRecord);

  /* ---------- bridge: play phase, four compass seats, one row per trick ---------- */
  var COMPASS = ['North', 'East', 'South', 'West'];
  function hcp(h) { return sum(h.map(function (c) { return Math.max(0, RV[c.rank] - 10); })); }
  function bridgeRecord(seed) {
    var rng = rngOf(seed);
    var deck = shuffle(deck52(), rng);
    var hands = [[], [], [], []];
    var dealer = ri(rng, 4);
    for (var i = 0; i < 52; i++) hands[(dealer + 1 + i) % 4].push(deck.pop());
    var ns = hcp(hands[0]) + hcp(hands[2]), ew = hcp(hands[1]) + hcp(hands[3]);
    var side = ns >= ew ? [0, 2] : [1, 3];
    var pts = Math.max(ns, ew);
    var len = function (s) { return bySuit(hands[side[0]], s).length + bySuit(hands[side[1]], s).length; };
    var trump = null, fit = 0;
    ['spades', 'hearts'].forEach(function (s) { if (len(s) >= 8 && len(s) > fit) { trump = s; fit = len(s); } });
    if (!trump) ['diamonds', 'clubs'].forEach(function (s) { if (len(s) >= 9 && len(s) > fit) { trump = s; fit = len(s); } });
    var minor = trump === 'diamonds' || trump === 'clubs';
    var lv = !trump ? (pts <= 22 ? 1 : pts <= 24 ? 2 : pts <= 32 ? 3 : pts <= 36 ? 6 : 7)
      : !minor ? (pts <= 22 ? 2 : pts <= 25 ? 3 : pts <= 32 ? 4 : pts <= 36 ? 6 : 7)
      : (pts <= 22 ? 2 : pts <= 25 ? 3 : pts <= 28 ? 4 : pts <= 32 ? 5 : 6);
    if (lv < 3) return null; /* keep game contracts for the record */
    var a = side[0], b = side[1];
    var decl = trump ? (bySuit(hands[b], trump).length > bySuit(hands[a], trump).length ? b : a) : (hcp(hands[b]) > hcp(hands[a]) ? b : a);
    var dummy = (decl + 2) % 4;
    var contract = lv + (trump ? SYM[trump] : 'NT');
    var played = [];
    var tricks = [0, 0, 0, 0];
    var trick = [];
    var exposed = false;
    var lastAction = null, toAct = (decl + 1) % 4, phase = 'Opening lead';
    var winners = null;
    var sideOf = function (x) { return x % 2; };
    var declTricks = function () { return tricks[decl] + tricks[dummy]; };
    var defTricks = function () { return 13 - hands[0].length - declTricks(); };
    function view() {
      return {
        family: 'card_table', seatLayout: 'compass',
        seats: [0, 1, 2, 3].map(function (x) {
          var real = x === 0 || (exposed && x === dummy);
          var o = { id: 'seat' + (x + 1), label: COMPASS[x], isYou: x === 0,
            cards: real ? sortHand(hands[x], trump) : hid(hands[x].length), count: hands[x].length };
          if (x === decl) o.role = 'Declarer';
          if (x === dummy) o.role = 'Dummy';
          if (winners && winners.indexOf(x) >= 0) o.winner = true;
          return o;
        }),
        center: { label: 'Current trick', cards: cp(trick) },
        phase: phase, yourHand: sortHand(hands[0], trump), lastAction: lastAction,
        toAct: toAct == null ? null : 'seat' + (toAct + 1), trump: trump, contract: contract,
        declarer: 'seat' + (decl + 1), revealed: false,
        metrics: [{ label: 'Contract', value: contract + ' by ' + COMPASS[decl] },
          { label: 'Declarer', value: String(declTricks()) }, { label: 'Defence', value: String(defTricks()) }]
      };
    }
    function topOf(x, s) {
      var mine = bySuit(hands[x], s);
      if (!mine.length) return null;
      var h = highest(mine);
      var out = deck52().filter(function (c) { return c.suit === s && RV[c.rank] > RV[h.rank]; });
      return out.every(function (c) { return has(played, c); }) ? h : null;
    }
    function winnerOf(t) {
      var w = t[0];
      t.forEach(function (c) {
        if (c.suit === w.suit && RV[c.rank] > RV[w.rank]) w = c;
        else if (trump && c.suit === trump && w.suit !== trump) w = c;
      });
      return w;
    }
    function choose(x) {
      var h = hands[x];
      if (!trick.length) {
        for (var q = 0; q < 4; q++) {
          var s = SUITS[q];
          if (s === trump) continue;
          var t = topOf(x, s);
          if (t) return t;
        }
        var longest = SUITS.filter(function (s) { return s !== trump && bySuit(h, s).length; })
          .sort(function (p, r) { return bySuit(h, r).length - bySuit(h, p).length; })[0];
        return lowest(longest ? bySuit(h, longest) : h);
      }
      var led = trick[0].suit;
      var w = winnerOf(trick);
      var partnerWins = sideOf(w.by) === sideOf(x);
      var follow = bySuit(h, led);
      if (follow.length) {
        if (partnerWins || (w.suit !== led)) return lowest(follow);
        var beat = follow.filter(function (c) { return RV[c.rank] > RV[w.rank]; });
        return beat.length ? lowest(beat) : lowest(follow);
      }
      var tr = trump ? bySuit(h, trump) : [];
      if (!partnerWins && tr.length) {
        var ok = w.suit === trump ? tr.filter(function (c) { return RV[c.rank] > RV[w.rank]; }) : tr;
        if (ok.length) return lowest(ok);
      }
      var rest = h.filter(function (c) { return c.suit !== trump; });
      return lowest(rest.length ? rest : h);
    }
    var rec = recorder();
    rec.start(view());
    var leader = (decl + 1) % 4;
    for (var tn = 0; tn < 13; tn++) {
      trick = [];
      for (var k = 0; k < 4; k++) {
        var x = (leader + k) % 4;
        var c = choose(x);
        if (k > 0 && bySuit(hands[x], trick[0].suit).length && c.suit !== trick[0].suit) throw new Error('revoke');
        hands[x] = drop(hands[x], c);
        played.push(c);
        trick.push(Object.assign(plain(c), { by: x }));
      }
      exposed = true;
      var wc = winnerOf(trick);
      tricks[wc.by]++;
      var label = 'Leads ' + cn(trick[0]) + '; ' + trick.slice(1).map(function (c) { return COMPASS[c.by] + ' ' + cn(c); }).join(', ')
        + '. ' + COMPASS[wc.by] + ' takes it.';
      var ledBy = leader;
      trick = trick.map(function (c) { return Object.assign(plain(c), { by: 'seat' + (c.by + 1) }); });
      leader = wc.by;
      lastAction = { seat: 'seat' + (ledBy + 1), label: label };
      phase = 'Trick ' + (tn + 1) + ' of 13';
      toAct = leader;
      if (tn === 12) {
        var need = 6 + lv, got = declTricks();
        var per = !trump ? 30 : minor ? 20 : 30;
        var res, line;
        var declSide = [decl, dummy].sort(), defSide = [(decl + 1) % 4, (decl + 3) % 4].sort();
        var pair = function (s) { return COMPASS[s[0]] + '-' + COMPASS[s[1]]; };
        if (got >= need) {
          var ts = (!trump ? 10 : 0) + per * lv;
          var score = ts + (ts >= 100 ? 300 : 50) + (lv === 6 ? 500 : lv === 7 ? 1000 : 0) + (got - need) * per;
          winners = declSide;
          line = pair(declSide) + ' make ' + contract + ' with ' + got + ' tricks for ' + score + ' points.';
          res = score;
        } else {
          winners = defSide;
          res = (need - got) * 50;
          line = pair(defSide) + ' defeat ' + contract + ' by ' + (need - got) + (need - got === 1 ? ' trick' : ' tricks') + ' for ' + res + ' points.';
        }
        var scores = {};
        [0, 1, 2, 3].forEach(function (s) { scores['seat' + (s + 1)] = winners.indexOf(s) >= 0 ? res : 0; });
        phase = 'Hand over';
        toAct = null;
        rec.step('seat' + (ledBy + 1), label, view());
        return rec.finish({ winner: 'seat' + (winners[0] + 1), winners: winners.map(function (s) { return 'seat' + (s + 1); }), line: line, scores: scores });
      }
      rec.step('seat' + (ledBy + 1), label, view());
    }
    return null;
  }
  define('bridge', bridgeRecord);

  /* ---------- shedding (rank and suit) and crazy eights: two seats ---------- */
  function shedRecord(seed, wild) {
    var rng = rngOf(seed);
    var stock = shuffle(deck52(), rng);
    var hands = dealTwo(stock, 5);
    var top = stock.pop();
    if (wild && top.rank === '8') return null;
    var suit = top.suit;
    var lastAction = null, toAct = 'p1', passes = 0, eights = 0, winners = null;
    var center = [Object.assign(plain(top), { by: 'start' })];
    function view() {
      var v = {
        family: 'card_table', seatLayout: 'two_sides',
        seats: ['p1', 'p2'].map(function (id) {
          var o = { id: id, label: id === 'p1' ? 'Seat A' : 'Seat B', isYou: id === 'p1',
            cards: id === 'p1' ? sortHand(hands.p1) : hid(hands.p2.length), count: hands[id].length };
          if (id === 'p2') o.role = 'Dealer';
          if (winners && winners.indexOf(id) >= 0) o.winner = true;
          return o;
        }),
        center: { label: 'Last play', cards: cp(center) },
        phase: 'Play', yourHand: sortHand(hands.p1), lastAction: lastAction, toAct: toAct,
        stock: stock.length, revealed: false,
        metrics: [{ label: 'Stock', value: String(stock.length) }]
      };
      if (wild) v.metrics.push({ label: 'Suit', value: suit });
      return v;
    }
    var ok = function (c) { return (wild && c.rank === '8') || c.rank === top.rank || c.suit === suit; };
    function pickSuit(h) {
      var best = suit, n = -1;
      SUITS.forEach(function (s) { var k = bySuit(h, s).filter(function (c) { return c.rank !== '8'; }).length; if (k > n) { n = k; best = s; } });
      return best;
    }
    function play(id, c, prefix) {
      hands[id] = drop(hands[id], c);
      top = c;
      center = [Object.assign(plain(c), { by: id })];
      var label = prefix + cn(c);
      if (wild && c.rank === '8') { suit = pickSuit(hands[id]); label += ' and names ' + suit; eights++; }
      else suit = c.suit;
      return label;
    }
    var rec = recorder();
    rec.start(view());
    while (true) {
      if (rec.ledger.length > 29) return null;
      var id = toAct, h = hands[id], label;
      var can = h.filter(ok);
      if (can.length) {
        var plain8 = can.filter(function (c) { return !(wild && c.rank === '8'); });
        var pool = plain8.length ? plain8 : can;
        var c = pool.slice().sort(function (p, q) {
          var d = bySuit(h, q.suit).length - bySuit(h, p.suit).length;
          return d || RV[q.rank] - RV[p.rank];
        })[0];
        label = play(id, c, 'Plays ');
        passes = 0;
      } else if (stock.length) {
        var dc = stock.pop();
        hands[id] = hands[id].concat([dc]);
        if (ok(dc)) label = play(id, dc, 'Draws and plays ');
        else label = 'Draws a card';
        passes = 0;
      } else {
        label = 'Passes';
        passes++;
      }
      lastAction = { seat: id, label: label };
      toAct = other(id);
      var out = !hands[id].length;
      if (out || passes >= 2) {
        var w = out ? id : hands.p1.length < hands.p2.length ? 'p1' : hands.p2.length < hands.p1.length ? 'p2' : 'draw';
        if (wild && !eights) return null; /* show the wild eight in the record */
        if (w !== 'draw') winners = [w];
        var line = out ? seatWord(id) + ' plays its last card. ' + seatWord(other(id)) + ' still holds ' + hands[other(id)].length + '.'
          : 'Both seats are blocked. ' + (w === 'draw' ? 'Equal hands, a draw.' : seatWord(w) + ' holds fewer cards and wins.');
        rec.step(id, label, view());
        return rec.finish({ winner: w, line: line });
      }
      rec.step(id, label, view());
    }
  }
  define('shedding-card-game', function (seed) { return shedRecord(seed, false); }, 10);
  define('crazy-eights', function (seed) { return shedRecord(seed, true); }, 10);

  /* ---------- gin rummy: compact, seven cards each, knock at 10 ---------- */
  function ginVal(c) { var v = RV[c.rank]; return v === 14 ? 1 : v > 10 ? 10 : v; }
  function ginOrd(c) { var v = RV[c.rank]; return v === 14 ? 1 : v; }
  function ck(c) { return c.rank + c.suit; }
  function ginMelds(h) {
    var out = [];
    var byRank = {};
    h.forEach(function (c) { (byRank[c.rank] = byRank[c.rank] || []).push(c); });
    Object.keys(byRank).forEach(function (r) {
      var g = byRank[r];
      if (g.length >= 3) out.push(g);
      if (g.length === 4) for (var i = 0; i < 4; i++) out.push(g.filter(function (x, j) { return j !== i; }));
    });
    SUITS.forEach(function (s) {
      var cs = bySuit(h, s).sort(function (a, b) { return ginOrd(a) - ginOrd(b); });
      for (var i = 0; i < cs.length; i++) {
        for (var j = i + 1; j < cs.length && ginOrd(cs[j]) === ginOrd(cs[j - 1]) + 1; j++) {
          if (j - i >= 2) out.push(cs.slice(i, j + 1));
        }
      }
    });
    return out;
  }
  function ginBest(h) {
    var ms = ginMelds(h);
    var best = { dead: sum(h.map(ginVal)), melds: [] };
    (function walk(idx, used, chosen) {
      for (var k = idx; k < ms.length; k++) {
        if (ms[k].some(function (c) { return used[ck(c)]; })) continue;
        var u2 = Object.assign({}, used);
        ms[k].forEach(function (c) { u2[ck(c)] = true; });
        var ch = chosen.concat([ms[k]]);
        var dead = sum(h.filter(function (c) { return !u2[ck(c)]; }).map(ginVal));
        if (dead < best.dead) best = { dead: dead, melds: ch };
        walk(k + 1, u2, ch);
      }
    })(0, {}, []);
    var inMeld = {};
    best.melds.forEach(function (m) { m.forEach(function (c) { inMeld[ck(c)] = true; }); });
    best.loose = h.filter(function (c) { return !inMeld[ck(c)]; });
    return best;
  }
  function ginRecord(seed) {
    var rng = rngOf(seed);
    var stock = shuffle(deck52(), rng);
    var hands = dealTwo(stock, 7);
    var pile = [stock.pop()];
    var toAct = 'p1', lastAction = null, reveal = null, notes = {}, winners = null, anyTake = false;
    function view() {
      return {
        family: 'card_table', seatLayout: 'two_sides',
        seats: ['p1', 'p2'].map(function (id) {
          var o = { id: id, label: id === 'p1' ? 'Seat A' : 'Seat B', isYou: id === 'p1', count: hands[id].length };
          if (reveal) {
            var b = reveal[id];
            o.cards = cp(b.melds.reduce(function (a, m) { return a.concat(m); }, []).concat(b.loose));
            o.melds = cp(b.melds);
            o.deadwood = b.dead;
          } else {
            o.cards = id === 'p1' ? sortHand(hands.p1) : hid(hands.p2.length);
          }
          if (id === 'p2') o.role = 'Dealer';
          if (notes[id]) o.note = notes[id];
          if (winners && winners.indexOf(id) >= 0) o.winner = true;
          return o;
        }),
        center: { label: 'Discard pile', cards: pile.length ? [cp(pile[pile.length - 1])] : [] },
        phase: reveal ? 'Showdown' : 'Draw and discard', yourHand: sortHand(hands.p1),
        lastAction: lastAction, toAct: toAct, stock: stock.length, revealed: !!reveal,
        metrics: [{ label: 'Stock', value: String(stock.length) }, { label: 'Knock at', value: '10' }]
      };
    }
    var rec = recorder();
    rec.start(view());
    while (true) {
      if (stock.length <= 2 || rec.ledger.length > 29) return null;
      var id = toAct, h = hands[id];
      var top = pile[pile.length - 1];
      var now = ginBest(h).dead;
      var withTop = h.concat([top]);
      /* take the discard only when it lands in a meld and lowers deadwood */
      var took = h.some(function (d) {
        var b = ginBest(drop(withTop, d));
        return b.dead < now && !has(b.loose, top);
      });
      var label;
      if (took) { pile.pop(); h = withTop; anyTake = true; label = 'Takes ' + cn(top) + ' from the discard pile'; }
      else { h = h.concat([stock.pop()]); label = 'Draws from the stock'; }
      var cand = h.filter(function (c) { return !(took && same(c, top)); });
      var scored = cand.map(function (d) { return { d: d, dead: ginBest(drop(h, d)).dead }; });
      scored.sort(function (a, b) { return a.dead - b.dead || ginVal(b.d) - ginVal(a.d); });
      var dis = scored[0].d;
      hands[id] = drop(h, dis);
      pile.push(dis);
      label += ', discards ' + cn(dis);
      var dw = scored[0].dead;
      toAct = other(id);
      if (dw <= 10) {
        if (!anyTake) return null; /* show a discard pickup in the record */
        var oth = other(id);
        var kb = ginBest(hands[id]), ob = ginBest(hands[oth]);
        reveal = {}; reveal[id] = kb; reveal[oth] = ob;
        var sc = { p1: 0, p2: 0 }, w, line;
        if (kb.dead === 0) {
          label += ' and goes gin';
          notes[id] = 'Gin';
          w = id; sc[w] = ob.dead + 25;
          line = seatWord(id) + ' goes gin against ' + ob.dead + ' deadwood and scores ' + sc[w] + '.';
        } else {
          label += ' and knocks';
          notes[id] = 'Knocked';
          if (kb.dead < ob.dead) {
            w = id; sc[w] = ob.dead - kb.dead;
            line = seatWord(id) + ' knocks with ' + kb.dead + ' deadwood against ' + ob.dead + ' and scores ' + sc[w] + '.';
          } else {
            w = oth; sc[w] = kb.dead - ob.dead + 25;
            line = seatWord(oth) + ' undercuts the knock, ' + ob.dead + ' deadwood to ' + kb.dead + ', and scores ' + sc[w] + '.';
          }
        }
        winners = [w];
        lastAction = { seat: id, label: label };
        rec.step(id, label, view());
        return rec.finish({ winner: w, line: line, scores: sc });
      }
      lastAction = { seat: id, label: label };
      rec.step(id, label, view());
    }
  }
  define('gin-rummy', ginRecord, 10);

  /* ---------- cribbage: discard and showdown, two deals ---------- */
  function cbVal(c) { var v = RV[c.rank]; return v === 14 ? 1 : Math.min(10, v); }
  function cbOrd(c) { var v = RV[c.rank]; return v === 14 ? 1 : v; }
  function cribCount(hand, starter, isCrib) {
    var all = starter ? hand.concat([starter]) : hand.slice();
    var n = all.length, fif = 0, pairs = 0, runLen = 0, runs = 0, flush = 0, nobs = 0;
    for (var m = 1; m < (1 << n); m++) {
      var t = 0;
      for (var i = 0; i < n; i++) if (m & (1 << i)) t += cbVal(all[i]);
      if (t === 15) fif++;
    }
    for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) if (all[a].rank === all[b].rank) pairs++;
    for (var L = n; L >= 3 && !runs; L--) {
      for (var mm = 1; mm < (1 << n); mm++) {
        var vs = [];
        for (var k = 0; k < n; k++) if (mm & (1 << k)) vs.push(cbOrd(all[k]));
        if (vs.length !== L) continue;
        vs.sort(function (x, y) { return x - y; });
        if (vs.every(function (v, q) { return q === 0 || v === vs[q - 1] + 1; })) runs++;
      }
      if (runs) runLen = L;
    }
    if (hand.length === 4 && hand.every(function (c) { return c.suit === hand[0].suit; })) {
      var five = starter && starter.suit === hand[0].suit;
      flush = isCrib ? (five ? 5 : 0) : 4 + (five ? 1 : 0);
    }
    if (starter && hand.some(function (c) { return c.rank === 'J' && c.suit === starter.suit; })) nobs = 1;
    var total = fif * 2 + pairs * 2 + runs * runLen + flush + nobs;
    var parts = [];
    if (fif) parts.push(fif === 1 ? 'a fifteen' : fif + ' fifteens');
    if (pairs) parts.push(pairs === 1 ? 'a pair' : pairs === 2 ? 'two pairs' : pairs === 3 ? 'three of a kind' : 'four of a kind');
    if (runs) parts.push(runs === 1 ? 'a run of ' + runLen : runs + ' runs of ' + runLen);
    if (flush) parts.push('a flush');
    if (nobs) parts.push('nobs');
    return { total: total, text: total ? total + ': ' + parts.join(', ') : '0' };
  }
  function cribRecord(seed) {
    var rng = rngOf(seed);
    var score = { p1: 0, p2: 0 };
    var hands, crib, starter, dealer, shown, cribShown, lastAction = null, toAct = 'p1', phase = 'Discard to crib';
    var dealNo = 0, winners = null;
    function deal(d) {
      var deck = shuffle(deck52(), rng);
      hands = dealTwo(deck, 6);
      hands.rest = deck;
      crib = []; starter = null; dealer = d; shown = {}; cribShown = false; dealNo++;
      phase = 'Discard to crib';
    }
    function view() {
      return {
        family: 'card_table', seatLayout: 'two_sides',
        seats: ['p1', 'p2'].map(function (id) {
          var o = { id: id, label: id === 'p1' ? 'Seat A' : 'Seat B', isYou: id === 'p1',
            cards: id === 'p1' || shown[id] ? sortHand(hands[id]) : hid(hands[id].length),
            count: hands[id].length, score: score[id] };
          if (id === dealer) o.role = 'Dealer';
          if (winners && winners.indexOf(id) >= 0) o.winner = true;
          return o;
        }),
        center: { label: 'Starter', cards: starter ? [cp(starter)] : [] },
        piles: [{ label: 'Crib', cards: cribShown ? sortHand(crib) : hid(crib.length) }],
        phase: phase, yourHand: sortHand(hands.p1), lastAction: lastAction, toAct: toAct,
        revealed: !!shown.p2 || cribShown,
        metrics: [{ label: 'Deal', value: dealNo + ' of 2' }]
      };
    }
    function chooseDiscard(id) {
      var h = hands[id], best = null;
      for (var a = 0; a < 6; a++) for (var b = a + 1; b < 6; b++) {
        var keep = h.filter(function (x, i) { return i !== a && i !== b; });
        var toss = [h[a], h[b]];
        var v = cribCount(keep, null, false).total;
        var tv = (cbVal(toss[0]) + cbVal(toss[1]) === 15 ? 2 : 0) + (toss[0].rank === toss[1].rank ? 2 : 0);
        v += id === dealer ? tv : -tv;
        if (!best || v > best.v) best = { v: v, toss: toss };
      }
      return best.toss;
    }
    var rec = recorder();
    function act(id, label, next) { lastAction = { seat: id, label: label }; toAct = next; rec.step(id, label, view()); }
    deal('p2');
    rec.start(view());
    for (var round = 0; round < 2; round++) {
      var non = other(dealer);
      if (round === 1) act(dealer, 'Deals the second hand', non);
      [non, dealer].forEach(function (id, i) {
        var toss = chooseDiscard(id);
        hands[id] = dropAll(hands[id], toss);
        crib = crib.concat(toss);
        if (i === 1) phase = 'Starter';
        act(id, id === 'p1' ? 'Sends ' + cn(toss[0]) + ' and ' + cn(toss[1]) + ' to the crib' : 'Sends two cards to the crib', i === 0 ? dealer : dealer);
      });
      starter = hands.rest.pop();
      var heels = starter.rank === 'J';
      if (heels) score[dealer] += 2;
      phase = 'Show';
      act(dealer, 'Turns up ' + cn(starter) + ' as the starter' + (heels ? '. His heels, 2 points' : ''), non);
      [non, dealer].forEach(function (id) {
        var c = cribCount(hands[id], starter, false);
        score[id] += c.total;
        shown[id] = true;
        act(id, 'Counts ' + c.text, id === non ? dealer : dealer);
      });
      var cc = cribCount(crib, starter, true);
      score[dealer] += cc.total;
      cribShown = true;
      phase = round === 1 ? 'Final count' : 'Crib';
      if (round === 1) {
        var w = score.p1 > score.p2 ? 'p1' : score.p2 > score.p1 ? 'p2' : 'draw';
        if (w !== 'draw') winners = [w];
        var label = 'Counts the crib, ' + cc.text;
        lastAction = { seat: dealer, label: label };
        toAct = null;
        rec.step(dealer, label, view());
        var line = w === 'draw' ? 'Level at ' + score.p1 + ' after two deals.'
          : seatWord(w) + ' wins ' + score[w] + ' to ' + score[other(w)] + ' after two deals.';
        return rec.finish({ winner: w, line: line, scores: { p1: score.p1, p2: score.p2 } });
      }
      act(dealer, 'Counts the crib, ' + cc.text, dealer);
      deal('p1');
    }
    return null;
  }
  define('cribbage', cribRecord);

  /* ---------- hanabi: compact deck (one card per colour and rank), two seats ---------- */
  var HCOL = ['red', 'yellow', 'green', 'blue', 'white'];
  var NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function hanabiRecord(seed) {
    var rng = rngOf(seed);
    var deck = [];
    HCOL.forEach(function (s) { for (var r = 1; r <= 5; r++) deck.push({ rank: String(r), suit: s, id: s + '-' + r }); });
    deck = shuffle(deck, rng);
    var hands = { p1: [], p2: [] };
    function slot(c) { return { card: c, known: {}, play: false, touched: false }; }
    for (var i = 0; i < 5; i++) { hands.p1.push(slot(deck.pop())); hands.p2.push(slot(deck.pop())); }
    var fw = {}; HCOL.forEach(function (s) { fw[s] = 0; });
    var clues = 8, lives = 3, discards = [], finalTurns = null, toAct = 'p1', lastAction = null, over = false;
    var score = function () { return sum(HCOL.map(function (s) { return fw[s]; })); };
    var playable = function (c) { return fw[c.suit] === +c.rank - 1; };
    var deadCard = function (c) {
      if (fw[c.suit] >= +c.rank) return true;
      return discards.some(function (d) { return d.suit === c.suit && +d.rank < +c.rank && +d.rank > fw[c.suit]; });
    };
    var kn = function (k) { var o = {}; if (k.suit) o.suit = k.suit; if (k.rank) o.rank = k.rank; return o; };
    function view() {
      var mine = hands.p1.map(function (s) { return { hidden: true, known: kn(s.known) }; });
      return {
        family: 'card_table', seatLayout: 'two_sides',
        seats: [
          { id: 'p1', label: 'Seat A', isYou: true, cards: cp(mine), count: hands.p1.length },
          { id: 'p2', label: 'Seat B', isYou: false, count: hands.p2.length,
            cards: hands.p2.map(function (s) { return Object.assign(cp(s.card), { known: kn(s.known) }); }) }
        ],
        center: { label: 'Fireworks', cards: HCOL.filter(function (s) { return fw[s] > 0; })
          .map(function (s) { return { rank: String(fw[s]), suit: s, id: s + '-' + fw[s] }; }) },
        piles: [{ label: 'Discards', cards: cp(discards) }],
        phase: over ? 'Show over' : finalTurns != null ? 'Final round' : 'Play', yourHand: cp(mine),
        lastAction: lastAction, toAct: over ? null : toAct, stock: deck.length, revealed: false,
        metrics: [{ label: 'Clues', value: String(clues) }, { label: 'Lives', value: String(lives) },
          { label: 'Score', value: String(score()) }, { label: 'Deck', value: String(deck.length) }]
      };
    }
    function draw(id) { if (deck.length) hands[id].unshift(slot(deck.pop())); }
    function clueFor(id, idx, pref) {
      var h = hands[other(id)];
      var opts = [];
      ['suit', 'rank'].forEach(function (kind) {
        var val = h[idx].card[kind];
        var touched = [];
        h.forEach(function (s, j) { if (s.card[kind] === val) touched.push(j); });
        var fresh = touched.filter(function (j) { return !h[j].touched; });
        var focus = fresh.length ? fresh[0] : touched[0];
        if (pref === 'any' || focus === idx) opts.push({ kind: kind, val: val, touched: touched, focus: focus });
      });
      opts.sort(function (a, b) { return a.touched.length - b.touched.length; });
      return opts[0] || null;
    }
    function giveClue(id, cl, isPlay) {
      var h = hands[other(id)];
      cl.touched.forEach(function (j) { h[j].known[cl.kind] = cl.val; h[j].touched = true; });
      if (isPlay) h[cl.focus].play = true;
      clues--;
      var name = cl.kind === 'suit' ? cl.val : cl.val + 's';
      var pos = cl.touched.map(function (j) { return j + 1; });
      return 'Clues ' + name + ': card' + (pos.length > 1 ? 's ' + pos.slice(0, -1).join(', ') + ' and ' + pos[pos.length - 1] : ' ' + pos[0]);
    }
    var rec = recorder();
    rec.start(view());
    while (true) {
      if (rec.ledger.length > 29) return null;
      var id = toAct, h = hands[id], label = null;
      var pi = h.findIndex(function (s) {
        if (s.play) return true;
        if (s.known.suit && s.known.rank) return playable(s.card);
        return s.known.rank && HCOL.every(function (c) { return fw[c] === +s.known.rank - 1; });
      });
      if (pi >= 0) {
        var c = h[pi].card;
        h.splice(pi, 1);
        if (playable(c)) {
          fw[c.suit]++;
          if (c.rank === '5' && clues < 8) clues++;
          label = 'Plays the ' + c.suit + ' ' + c.rank;
        } else {
          lives--; discards.push(cp(c));
          label = 'Plays the ' + c.suit + ' ' + c.rank + ', which misfires';
        }
        draw(id);
      }
      if (!label && clues > 0) {
        var ph = hands[other(id)];
        for (var j = 0; j < ph.length && !label; j++) {
          if (ph[j].play || !playable(ph[j].card)) continue;
          var cl = clueFor(id, j, 'focus');
          if (cl) label = giveClue(id, cl, true);
        }
      }
      if (!label && clues < 8) {
        var di = h.findIndex(function (s) { return s.known.suit && s.known.rank && deadCard(s.card); });
        if (di < 0) for (var q = h.length - 1; q >= 0; q--) if (!h[q].touched) { di = q; break; }
        if (di < 0) di = h.length - 1;
        var dc = h[di].card;
        h.splice(di, 1);
        discards.push(cp(dc));
        clues++;
        label = 'Discards the ' + dc.suit + ' ' + dc.rank;
        draw(id);
      }
      if (!label) {
        var oh = hands[other(id)];
        var oi = oh.length - 1;
        for (var z = oh.length - 1; z >= 0; z--) if (!oh[z].touched) { oi = z; break; }
        label = giveClue(id, clueFor(id, oi, 'any'), false);
      }
      lastAction = { seat: id, label: label };
      toAct = other(id);
      if (finalTurns != null) finalTurns--;
      else if (!deck.length) finalTurns = 2;
      if (lives === 0 || score() === 25 || finalTurns === 0) {
        over = true;
        var sc = score();
        var line = (lives === 0 ? 'Three misfires end the show. ' : '') + 'Team score ' + sc + ' of 25, shared by both seats.';
        rec.step(id, label, view());
        return rec.finish({ winner: 'draw', shared: true, line: line, scores: { p1: sc, p2: sc } });
      }
      rec.step(id, label, view());
    }
  }
  define('hanabi', hanabiRecord, 16);

  /* ---------- mahjong: compact draw and discard, four seats, seven tiles ---------- */
  var MJ_SUITS = ['bamboo', 'dots', 'characters'];
  var MJ_HON = ['E', 'S', 'W', 'N', 'Rd', 'Gr', 'Wh'];
  var MJ_HNAME = { E: 'East wind', S: 'South wind', W: 'West wind', N: 'North wind', Rd: 'Red dragon', Gr: 'Green dragon', Wh: 'White dragon' };
  var WINDS = ['East', 'South', 'West', 'North'];
  function mjSet() {
    var t = [];
    for (var k = 1; k <= 4; k++) {
      MJ_SUITS.forEach(function (s) { for (var r = 1; r <= 9; r++) t.push({ rank: String(r), suit: s, id: s + '-' + r + '-' + k }); });
      MJ_HON.forEach(function (h) { t.push({ rank: h, suit: 'honors', id: 'honors-' + h + '-' + k }); });
    }
    return t;
  }
  function mjType(t) { return t.suit + ':' + t.rank; }
  function mjOrd(t) { return t.suit === 'honors' ? 30 + MJ_HON.indexOf(t.rank) : MJ_SUITS.indexOf(t.suit) * 10 + (+t.rank); }
  function mjName(t) { return t.suit === 'honors' ? MJ_HNAME[t.rank] : t.rank + ' ' + t.suit.charAt(0).toUpperCase() + t.suit.slice(1); }
  function mjSort(h) { return h.slice().sort(function (a, b) { return mjOrd(a) - mjOrd(b) || (a.id < b.id ? -1 : 1); }); }
  /* split sorted tiles into melds (pung or chow); returns list or null */
  function mjMelds(ts) {
    if (!ts.length) return [];
    var a = ts[0], rest = ts.slice(1);
    var same = rest.filter(function (t) { return mjOrd(t) === mjOrd(a); });
    if (same.length >= 2) {
      var r1 = rest.filter(function (t) { return t !== same[0] && t !== same[1]; });
      var m1 = mjMelds(r1);
      if (m1) return [[a, same[0], same[1]]].concat(m1);
    }
    if (a.suit !== 'honors') {
      var b = rest.find(function (t) { return mjOrd(t) === mjOrd(a) + 1 && t.suit === a.suit; });
      var c = rest.find(function (t) { return mjOrd(t) === mjOrd(a) + 2 && t.suit === a.suit; });
      if (b && c) {
        var m2 = mjMelds(rest.filter(function (t) { return t !== b && t !== c; }));
        if (m2) return [[a, b, c]].concat(m2);
      }
    }
    return null;
  }
  function mjWin(h) {
    var s = mjSort(h);
    for (var i = 0; i + 1 < s.length; i++) {
      if (mjOrd(s[i]) !== mjOrd(s[i + 1]) || (i > 0 && mjOrd(s[i - 1]) === mjOrd(s[i]))) continue;
      var rest = s.filter(function (x, j) { return j !== i && j !== i + 1; });
      var m = mjMelds(rest);
      if (m) return { pair: [s[i], s[i + 1]], melds: m };
    }
    return null;
  }
  function mjUse(h, t) {
    var u = 0;
    h.forEach(function (o) {
      if (o === t) return;
      if (mjOrd(o) === mjOrd(t)) u += 3;
      else if (o.suit === t.suit && t.suit !== 'honors') { var d = Math.abs(mjOrd(o) - mjOrd(t)); u += d === 1 ? 2 : d === 2 ? 1 : 0; }
    });
    return u;
  }
  function mjDescribe(w) {
    var parts = w.melds.map(function (m) {
      return mjOrd(m[0]) === mjOrd(m[1]) ? 'pung of ' + mjName(m[0]) : 'chow ' + m.map(function (t) { return t.rank; }).join('-') + ' ' + mjName(m[0]).split(' ')[1];
    });
    return parts.join(', ') + ' and a pair of ' + mjName(w.pair[0]);
  }
  function mahjongRecord(seed) {
    var rng = rngOf(seed);
    var wall = shuffle(mjSet(), rng);
    var dealer = ri(rng, 4);
    var hands = [[], [], [], []];
    for (var k = 0; k < 7; k++) for (var j = 0; j < 4; j++) hands[(dealer + j) % 4].push(wall.pop());
    var river = [], lastAction = null, toAct = dealer, reveal = false, winner = -1;
    function view() {
      return {
        family: 'card_table', seatLayout: 'table_ring',
        seats: [0, 1, 2, 3].map(function (x) {
          var o = { id: 'seat' + (x + 1), label: 'Seat ' + (x + 1), isYou: x === 0,
            cards: x === 0 || reveal ? mjSort(hands[x]) : hid(hands[x].length), count: hands[x].length,
            role: WINDS[(x - dealer + 4) % 4] };
          if (x === winner) o.winner = true;
          return o;
        }),
        center: { label: 'Discard river', cards: cp(river) },
        phase: reveal ? 'Win' : 'Draw and discard', yourHand: mjSort(hands[0]), lastAction: lastAction,
        toAct: toAct < 0 ? null : 'seat' + (toAct + 1), stock: wall.length, revealed: reveal,
        metrics: [{ label: 'Wall', value: String(wall.length) }]
      };
    }
    function finish(x, how) {
      var w = mjWin(hands[x]);
      reveal = true; winner = x; toAct = -1;
      var rest = [0, 1, 2, 3].filter(function (s) { return s !== x; }).map(function (s) {
        return { s: s, u: sum(hands[s].map(function (t) { return mjUse(hands[s], t); })), d: (s - x + 4) % 4 };
      }).sort(function (a, b) { return b.u - a.u || a.d - b.d; });
      var place = [];
      place[x] = 1;
      rest.forEach(function (r, i) { place[r.s] = i + 2; });
      var scores = { seat1: place[0], seat2: place[1], seat3: place[2], seat4: place[3] };
      var who = x === 0 ? 'You win' : 'Seat ' + (x + 1) + ' wins';
      return { winner: 'seat' + (x + 1), line: who + ' ' + how + ': ' + mjDescribe(w) + '.', scores: scores };
    }
    var rec = recorder();
    rec.start(view());
    var cur = dealer;
    while (rec.ledger.length < 30) {
      var t = wall.pop();
      var h = hands[cur].concat([t]);
      hands[cur] = h;
      if (mjWin(h)) {
        var label = 'Draws ' + mjName(t) + ' and declares a win';
        lastAction = { seat: 'seat' + (cur + 1), label: label };
        var res = finish(cur, 'by self-draw');
        rec.step('seat' + (cur + 1), label, view());
        return rec.finish(res);
      }
      var pick = h.slice().sort(function (a, b) {
        return mjUse(h, a) - mjUse(h, b) || (b.suit === 'honors') - (a.suit === 'honors') || mjOrd(b) - mjOrd(a);
      })[0];
      hands[cur] = drop(h, pick);
      river.push(Object.assign(cp(pick), { by: 'seat' + (cur + 1) }));
      var lab = 'Draws, discards ' + mjName(pick);
      lastAction = { seat: 'seat' + (cur + 1), label: lab };
      var caller = -1;
      for (var q = 1; q < 4 && caller < 0; q++) {
        var y = (cur + q) % 4;
        if (mjWin(hands[y].concat([pick]))) caller = y;
      }
      toAct = caller >= 0 ? caller : (cur + 1) % 4;
      rec.step('seat' + (cur + 1), lab, view());
      if (caller >= 0) {
        river.pop();
        hands[caller] = hands[caller].concat([pick]);
        var wl = 'Wins on ' + mjName(pick) + ' from Seat ' + (cur + 1);
        lastAction = { seat: 'seat' + (caller + 1), label: wl };
        var res2 = finish(caller, 'on a discard');
        rec.step('seat' + (caller + 1), wl, view());
        return rec.finish(res2);
      }
      cur = (cur + 1) % 4;
    }
    return null;
  }
  define('mahjong', mahjongRecord, 10);

  /* ---------- dou dizhu: compact deal (eight each, kitty of three), three seats ---------- */
  var DV = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, '2': 15, BJ: 16, RJ: 17 };
  var DNAME = { J: 'jacks', Q: 'queens', K: 'kings', A: 'aces' };
  function dzPl(r) { return DNAME[r] || r + 's'; }
  function dzSort(h) { return h.slice().sort(function (a, b) { return DV[a.rank] - DV[b.rank] || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit); }); }
  function dzName(c) { return c.rank === 'BJ' ? 'the black joker' : c.rank === 'RJ' ? 'the red joker' : cn(c); }
  function dzCombos(h) {
    var g = {};
    dzSort(h).forEach(function (c) { (g[DV[c.rank]] = g[DV[c.rank]] || []).push(c); });
    var out = [];
    Object.keys(g).map(Number).forEach(function (v) {
      var x = g[v];
      out.push({ type: 'single', len: 1, main: v, cards: [x[0]] });
      if (x.length >= 2) out.push({ type: 'pair', len: 2, main: v, cards: x.slice(0, 2) });
      if (x.length >= 3) {
        out.push({ type: 'triple', len: 3, main: v, cards: x.slice(0, 3) });
        var kick = dzSort(h).find(function (c) { return DV[c.rank] !== v; });
        if (kick) out.push({ type: 'trio1', len: 4, main: v, cards: x.slice(0, 3).concat([kick]) });
      }
      if (x.length === 4) out.push({ type: 'bomb', len: 4, main: v, cards: x.slice() });
    });
    for (var s = 3; s <= 10; s++) {
      for (var e = s; e <= 14 && g[e]; e++) {
        if (e - s >= 4) {
          var run = [];
          for (var v = s; v <= e; v++) run.push(g[v][0]);
          out.push({ type: 'straight', len: run.length, main: e, cards: run });
        }
      }
    }
    if (g[16] && g[17]) out.push({ type: 'rocket', len: 2, main: 17, cards: [g[16][0], g[17][0]] });
    return out;
  }
  function dzBeats(a, b) {
    if (a.type === 'rocket') return true;
    if (b.type === 'rocket') return false;
    if (a.type === 'bomb') return b.type !== 'bomb' || a.main > b.main;
    if (b.type === 'bomb') return false;
    return a.type === b.type && a.len === b.len && a.main > b.main;
  }
  function dzLabel(c) {
    var r = c.cards[0].rank;
    switch (c.type) {
      case 'single': return 'Plays ' + dzName(c.cards[0]);
      case 'pair': return 'Plays a pair of ' + dzPl(r);
      case 'triple': return 'Plays three ' + dzPl(r);
      case 'trio1': return 'Plays three ' + dzPl(r) + ' with ' + dzName(c.cards[3]);
      case 'straight': return 'Plays a straight, ' + r + ' to ' + c.cards[c.cards.length - 1].rank;
      case 'bomb': return 'Plays a bomb of ' + dzPl(r);
      default: return 'Plays the rocket';
    }
  }
  function douRecord(seed) {
    var rng = rngOf(seed);
    var deck = shuffle(deck52().concat([{ rank: 'BJ', suit: 'joker' }, { rank: 'RJ', suit: 'joker' }]), rng);
    var hands = [[], [], []];
    for (var k = 0; k < 8; k++) for (var j = 0; j < 3; j++) hands[j].push(deck.pop());
    var kitty = [deck.pop(), deck.pop(), deck.pop()];
    var landlord = -1, notes = {}, lastAction = null, toAct = ri(rng, 3), top = null, topBy = -1, reveal = false, winners = null;
    function view() {
      var v = {
        family: 'card_table', seatLayout: 'table_ring',
        seats: [0, 1, 2].map(function (x) {
          var o = { id: 'seat' + (x + 1), label: 'Seat ' + (x + 1), isYou: x === 0,
            cards: x === 0 || reveal ? dzSort(hands[x]) : hid(hands[x].length), count: hands[x].length };
          if (landlord >= 0) o.role = x === landlord ? 'Landlord' : 'Peasant';
          if (notes[x]) o.note = notes[x];
          if (winners && winners.indexOf(x) >= 0) o.winner = true;
          return o;
        }),
        center: landlord < 0 ? { label: 'Kitty', cards: hid(3) } : { label: 'Last play', cards: top ? cp(top.cards) : [] },
        phase: reveal ? 'Hand over' : landlord < 0 ? 'Bidding' : 'Play', yourHand: dzSort(hands[0]),
        lastAction: lastAction, toAct: toAct < 0 ? null : 'seat' + (toAct + 1), revealed: reveal
      };
      if (landlord >= 0) v.metrics = [{ label: 'Kitty', value: cns(kitty) }];
      return v;
    }
    function strength(h) {
      var cs = dzCombos(h);
      return sum(h.map(function (c) { var v = DV[c.rank]; return v === 15 ? 1 : v >= 16 ? 1.5 : v === 14 ? 0.5 : 0; }))
        + 2 * cs.filter(function (c) { return c.type === 'bomb' || c.type === 'rocket'; }).length;
    }
    var rec = recorder();
    rec.start(view());
    var bid = 0, bidder = -1, start = toAct;
    for (var b = 0; b < 3; b++) {
      var x = (start + b) % 3, s = strength(hands[x]);
      var want = s >= 4 ? 3 : s >= 3 ? 2 : s >= 1.5 ? 1 : 0;
      var label;
      if (want > bid) { bid = want; bidder = x; label = 'Bids ' + want; notes[x] = 'Bid ' + want; }
      else label = 'Passes';
      var done = bid === 3 || b === 2;
      if (done) {
        if (bidder < 0) return null;
        landlord = bidder;
        hands[landlord] = hands[landlord].concat(kitty);
        toAct = landlord;
      } else toAct = (x + 1) % 3;
      lastAction = { seat: 'seat' + (x + 1), label: label };
      rec.step('seat' + (x + 1), label, view());
      if (done) break;
    }
    var cur = landlord, passes = 0;
    while (true) {
      if (rec.ledger.length > 29) return null;
      var h = hands[cur], play = null;
      var cs = dzCombos(h);
      if (!top) {
        play = cs.find(function (c) { return c.cards.length === h.length; });
        ['straight', 'trio1', 'pair', 'single'].forEach(function (t) {
          if (play) return;
          var c = cs.filter(function (q) { return q.type === t && q.main <= 14; })
            .sort(function (p, q) { return q.len - p.len || p.main - q.main; });
          if (c.length) play = c[0];
        });
        if (!play) play = cs.filter(function (q) { return q.type === 'single'; })[0];
      } else {
        var win = cs.filter(function (c) { return dzBeats(c, top); });
        play = win.find(function (c) { return c.cards.length === h.length; }) || null;
        var mate = cur !== landlord && topBy !== landlord;
        if (!play && !mate) {
          var sameT = win.filter(function (c) { return c.type === top.type; }).sort(function (p, q) { return p.main - q.main; });
          if (sameT.length) play = sameT[0];
          else if (hands[topBy].length <= 4) play = win.sort(function (p, q) { return p.main - q.main; })[0] || null;
        }
      }
      var lab;
      if (play) {
        hands[cur] = dropAll(h, play.cards);
        top = { type: play.type, len: play.len, main: play.main, cards: play.cards.map(function (c) { return Object.assign(cp(c), { by: 'seat' + (cur + 1) }); }) };
        topBy = cur; passes = 0;
        lab = dzLabel(play);
      } else {
        passes++;
        lab = 'Passes';
      }
      lastAction = { seat: 'seat' + (cur + 1), label: lab };
      if (!hands[cur].length) {
        reveal = true; toAct = -1;
        var lw = cur === landlord;
        var peas = [0, 1, 2].filter(function (z) { return z !== landlord; });
        var place = [];
        if (lw) {
          place[landlord] = 1;
          peas.sort(function (p, q) { return hands[p].length - hands[q].length || p - q; }).forEach(function (z, i) { place[z] = i + 2; });
          winners = [landlord];
        } else {
          place[cur] = 1;
          place[peas.find(function (z) { return z !== cur; })] = 2;
          place[landlord] = 3;
          winners = peas;
        }
        var nm = function (z) { return z === 0 ? 'You' : 'Seat ' + (z + 1); };
        var line = lw ? 'The landlord, ' + nm(landlord) + ', empties first. Landlord win.'
          : nm(cur) + ' empties first. Peasant win.';
        rec.step('seat' + (cur + 1), lab, view());
        return rec.finish({ winner: 'seat' + (cur + 1), winners: winners.map(function (z) { return 'seat' + (z + 1); }),
          line: line, scores: { seat1: place[0], seat2: place[1], seat3: place[2] } });
      }
      var actor = cur;
      cur = (cur + 1) % 3;
      if (passes === 2) { top = null; passes = 0; cur = topBy; }
      toAct = cur;
      rec.step('seat' + (actor + 1), lab, view());
    }
  }
  define('dou-dizhu', douRecord, 12);

  /* ---------- liar's dice: one round, five dice each, ones wild ---------- */
  var FACEP = ['', 'ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];
  var FACES = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
  function sayBid(c, f) { return NUMW[c] + ' ' + (c === 1 ? FACES[f] : FACEP[f]); }
  function liarsRecord(seed) {
    var rng = rngOf(seed);
    var dice = { p1: [], p2: [] };
    for (var i = 0; i < 5; i++) { dice.p1.push(1 + ri(rng, 6)); dice.p2.push(1 + ri(rng, 6)); }
    var bid = null, bidBy = null, history = [], lastAction = null, toAct = 'p1', revealed = false, actual = null;
    var own = function (id, f) { return dice[id].filter(function (d) { return d === f || d === 1; }).length; };
    function view() {
      var b = { id: 'p2', label: 'Seat B', isYou: false, diceCount: 5 };
      if (revealed) b.dice = dice.p2.slice();
      var v = {
        family: 'dice_table',
        seats: [{ id: 'p1', label: 'Seat A', isYou: true, diceCount: 5, dice: dice.p1.slice() }, b],
        bid: bid ? { count: bid.count, face: bid.face } : null, revealed: revealed,
        lastAction: lastAction, toAct: toAct, history: cp(history), wild: 1,
        phase: revealed ? 'Reveal' : 'Bidding'
      };
      if (revealed) v.actual = actual;
      return v;
    }
    var rec = recorder();
    rec.start(view());
    while (rec.ledger.length < 30) {
      var id = toAct, call = false;
      if (bid && bid.count - (own(id, bid.face) + 5 / 3) + (rng() - 0.5) * 0.8 > 0.9) call = true;
      var best = null;
      if (!call) {
        for (var f = 2; f <= 6; f++) {
          var c = !bid ? 1 : f > bid.face ? bid.count : bid.count + 1;
          var cush = own(id, f) + 5 / 3 - c + (rng() - 0.5) * 0.3;
          if (!best || cush > best.cush) best = { count: c, face: f, cush: cush };
        }
        if (bid && best.cush < -0.8) call = true;
      }
      if (call) {
        actual = dice.p1.concat(dice.p2).filter(function (d) { return d === bid.face || d === 1; }).length;
        revealed = true;
        var w = actual >= bid.count ? bidBy : id;
        lastAction = { seat: id, label: 'Calls the bid' };
        toAct = null;
        rec.step(id, 'Calls the bid', view());
        var line = 'There ' + (actual === 1 ? 'is ' : 'are ') + sayBid(actual, bid.face) + ', counting ones as wild. The bid of '
          + sayBid(bid.count, bid.face) + (actual >= bid.count ? ' stands. ' : ' fails. ') + seatWord(w) + ' wins.';
        return rec.finish({ winner: w, line: line });
      }
      bid = { count: best.count, face: best.face };
      bidBy = id;
      history.push({ seat: id, count: bid.count, face: bid.face });
      var lab = 'Bids ' + sayBid(bid.count, bid.face);
      lastAction = { seat: id, label: lab };
      toAct = other(id);
      rec.step(id, lab, view());
    }
    return null;
  }
  define('liars-dice', liarsRecord, 9);

  /* ---------- bargaining: split a pool of 100, alternating offers ---------- */
  function econView(st, extra) {
    var v = {
      family: 'economic_panel', offers: cp(st.offers), current: cp(st.current), settled: st.settled,
      fallback: { p1: st.fallback.p1, p2: st.fallback.p2 }, round: st.round, maxRounds: st.maxRounds,
      lastAction: st.lastAction, toAct: st.toAct, phase: st.settled ? 'Deal' : 'Offers',
      roles: st.roles
    };
    if (st.payoffs) v.payoffs = cp(st.payoffs);
    return Object.assign(v, extra);
  }
  function bargainRecord(seed) {
    var rng = rngOf(seed);
    var st = { offers: [], current: null, settled: false, payoffs: null, fallback: { p1: 20, p2: 20 },
      round: 0, maxRounds: 12, lastAction: null, toAct: 'p1', roles: { p1: 'Player A', p2: 'Player B' } };
    var asp = { p1: 70 + ri(rng, 9), p2: 68 + ri(rng, 9) };
    var con = { p1: 3 + ri(rng, 4), p2: 3 + ri(rng, 4) };
    var floor = { p1: 40 + ri(rng, 5), p2: 40 + ri(rng, 5) };
    var lastAsk = { p1: null, p2: null };
    var rec = recorder();
    var vx = { kind: 'split', pool: 100 };
    rec.start(econView(st, vx));
    while (true) {
      var id = st.toAct, opp = other(id), why = null, label;
      var want = Math.max(floor[id], asp[id]);
      if (st.current && st.current.split[id] >= want - 1) {
        var mine = st.current.split[id];
        st.settled = true;
        st.current.status = 'accepted';
        st.payoffs = { p1: st.current.split.p1, p2: st.current.split.p2 };
        label = 'Accepts, taking ' + mine;
        why = 'Accepts ' + mine + '. It clears the fallback by ' + (mine - st.fallback[id]) + ' and another counter would gain little.';
        st.lastAction = { seat: id, label: label };
        st.toAct = null;
        rec.step(id, label, econView(st, vx), id === 'p2' ? why : null);
        if (st.offers.length < 6) return null;
        var p = st.payoffs;
        var w = p.p1 > p.p2 ? 'p1' : p.p2 > p.p1 ? 'p2' : 'draw';
        var line = 'Deal at ' + p.p1 + ' to ' + p.p2 + ' in round ' + st.round + '. '
          + (w === 'draw' ? 'An even split.' : st.roles[w] + ' takes the larger share.');
        return rec.finish({ winner: w, line: line, scores: { p1: p.p1, p2: p.p2 } });
      }
      st.round++;
      if (st.round > st.maxRounds) return null;
      var ask = want;
      var split = {}; split[id] = ask; split[opp] = 100 - ask;
      st.offers.push({ seat: id, value: ask, round: st.round, split: { p1: split.p1, p2: split.p2 } });
      st.current = { seat: id, round: st.round, split: { p1: split.p1, p2: split.p2 }, status: 'open' };
      label = 'Asks for ' + ask + ', offers ' + (100 - ask);
      if (lastAsk[id] == null) why = 'Opens high at ' + ask + '. The fallback is only ' + st.fallback[id] + ', so there is room to come down.';
      else if (ask === lastAsk[id]) why = 'Holds at ' + ask + '. Going lower gives up more than the deal is worth to it.';
      else why = 'Comes down ' + (lastAsk[id] - ask) + ' to ' + ask + '.' + (lastAsk[opp] != null ? ' The gap is now ' + (ask + lastAsk[opp] - 100) + '.' : '');
      lastAsk[id] = ask;
      asp[id] -= con[id];
      st.lastAction = { seat: id, label: label };
      st.toAct = opp;
      rec.step(id, label, econView(st, vx), id === 'p2' ? why : null);
    }
  }
  define('bargaining', bargainRecord, 9);

  /* ---------- negotiation: price and delivery grid, buyer (p1) and seller (p2) ---------- */
  var PRICES = [8, 9, 10, 11, 12, 13, 14, 15, 16];
  var DAYS = [1, 2, 3, 5, 7];
  var NEG_U = {
    p1: function (p, d) { return 6 * (16 - p) + 7 * (7 - d); },
    p2: function (p, d) { return 10 * (p - 8) + 3 * (d - 1); }
  };
  function pkg(p, d) { return 'price ' + p + ', delivery in ' + d + (d === 1 ? ' day' : ' days'); }
  function negotiationRecord(seed) {
    var rng = rngOf(seed);
    var st = { offers: [], current: null, settled: false, payoffs: null, fallback: { p1: 15, p2: 15 },
      round: 0, maxRounds: 12, lastAction: null, toAct: 'p1', roles: { p1: 'Buyer', p2: 'Seller' } };
    var asp = { p1: 74 + ri(rng, 8), p2: 78 + ri(rng, 8) };
    var con = { p1: 5 + ri(rng, 4), p2: 5 + ri(rng, 4) };
    var floor = { p1: 30, p2: 30 };
    var vx = { kind: 'grid', grid: { prices: PRICES.slice(), deliveries: DAYS.slice() } };
    var all = [];
    PRICES.forEach(function (p) { DAYS.forEach(function (d) { all.push({ p: p, d: d }); }); });
    var rec = recorder();
    rec.start(econView(st, vx));
    var opened = { p1: false, p2: false };
    while (true) {
      var id = st.toAct, opp = other(id), why = null, label;
      var want = Math.max(floor[id], asp[id]);
      if (st.current && NEG_U[id](st.current.price, st.current.delivery) >= want - 1) {
        var c = st.current;
        st.settled = true;
        c.status = 'accepted';
        st.payoffs = { p1: NEG_U.p1(c.price, c.delivery), p2: NEG_U.p2(c.price, c.delivery) };
        label = 'Accepts ' + pkg(c.price, c.delivery);
        why = 'Accepts. The package is worth ' + st.payoffs[id] + ' to it, well above the fallback of ' + st.fallback[id] + '.';
        st.lastAction = { seat: id, label: label };
        st.toAct = null;
        rec.step(id, label, econView(st, vx), id === 'p2' ? why : null);
        if (st.offers.length < 6) return null;
        var pay = st.payoffs;
        var w = pay.p1 > pay.p2 ? 'p1' : pay.p2 > pay.p1 ? 'p2' : 'draw';
        var line = 'Deal at ' + pkg(c.price, c.delivery) + '. Buyer ' + pay.p1 + ', seller ' + pay.p2 + '.';
        return rec.finish({ winner: w, line: line, scores: { p1: pay.p1, p2: pay.p2 } });
      }
      st.round++;
      if (st.round > st.maxRounds) return null;
      var ok = all.filter(function (x) { return NEG_U[id](x.p, x.d) >= want; });
      var pick = ok.length
        ? ok.sort(function (a, b) { return NEG_U[opp](b.p, b.d) - NEG_U[opp](a.p, a.d) || NEG_U[id](b.p, b.d) - NEG_U[id](a.p, a.d); })[0]
        : all.slice().sort(function (a, b) { return NEG_U[id](b.p, b.d) - NEG_U[id](a.p, a.d); })[0];
      var pay2 = { p1: NEG_U.p1(pick.p, pick.d), p2: NEG_U.p2(pick.p, pick.d) };
      st.offers.push({ seat: id, value: pay2[id], round: st.round, price: pick.p, delivery: pick.d, payoffs: pay2 });
      st.current = { seat: id, round: st.round, price: pick.p, delivery: pick.d, payoffs: { p1: pay2.p1, p2: pay2.p2 }, status: 'open' };
      label = 'Offers ' + pkg(pick.p, pick.d);
      var prev = opened[id];
      why = !prev
        ? 'Opens at ' + pkg(pick.p, pick.d) + '. Slow delivery costs it little, so it trades days for price.'
        : prev.p === pick.p && prev.d === pick.d
          ? 'Holds the same package. Nothing cheaper for the buyer still clears its target of ' + want + '.'
          : 'Moves to ' + pkg(pick.p, pick.d) + '. That is worth ' + pay2[id] + ' to it and ' + pay2[opp] + ' to the buyer.';
      opened[id] = pick;
      asp[id] -= con[id];
      st.lastAction = { seat: id, label: label };
      st.toAct = opp;
      rec.step(id, label, econView(st, vx), id === 'p2' ? why : null);
    }
  }
  define('negotiation', negotiationRecord, 9);

  /* @@GAMES@@ */

  R.ESE_SCRIPTED_TABLE = T;
})();
