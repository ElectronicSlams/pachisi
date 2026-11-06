/* engines-core.js (B1b): ultimate-tic-tac-toe, rock-paper-scissors, prisoners-dilemma,
   first-price-sealed-bid-auction, goofspiel. Plain script, no DOM, pure functions, immutable states. */
window.ESE_CORE_B = { engines: {} };
window.ESE_CORE_B.rng = function (seed) { var a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
/* ---- shared helpers (ESE_CORE_B.util) ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B;
  B.util = {
    cp: function (o) { return JSON.parse(JSON.stringify(o)); },
    seeded: function (seed, salt) { return B.rng((((seed >>> 0) * 2654435761) + ((salt >>> 0) * 40503) + 12345) >>> 0); },
    idx: function (seed, salt, n) { return B.util.seeded(seed, salt)() * n | 0; },
    other: function (s) { return s === 'p1' ? 'p2' : 'p1'; },
    fail: function (m) { throw new Error(m); }
  };
})();
/* ---- ultimate-tic-tac-toe ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util;
  var POS = ['top left', 'top centre', 'top right', 'middle left', 'centre', 'middle right', 'bottom left', 'bottom centre', 'bottom right'];
  var SHORT = ['TL', 'T', 'TR', 'L', 'C', 'R', 'BL', 'B', 'BR'];
  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  function bOf(r, c) { return Math.floor(r / 3) * 3 + Math.floor(c / 3); }
  function lOf(r, c) { return (r % 3) * 3 + (c % 3); }
  function rcOf(b, l) { return { r: Math.floor(b / 3) * 3 + Math.floor(l / 3), c: (b % 3) * 3 + (l % 3) }; }
  function local(cells, b) { var o = [], l, p; for (l = 0; l < 9; l++) { p = rcOf(b, l); o.push(cells[p.r][p.c]); } return o; }
  function lineOf(a, m) { for (var i = 0; i < 8; i++) { var L = LINES[i]; if (a[L[0]] === m && a[L[1]] === m && a[L[2]] === m) return L; } return null; }
  function markOf(side) { return side === 'p1' ? 'X' : 'O'; }
  function wouldWin(cells, b, l, m) { var a = local(cells, b); if (a[l] !== '') return false; a[l] = m; return !!lineOf(a, m); }
  function moves(st) {
    var out = [], bs = [], b, l, p;
    if (st.result) return out;
    if (st.active != null) bs = [st.active]; else for (b = 0; b < 9; b++) if (st.won[b] === null) bs.push(b);
    bs.forEach(function (bb) { for (l = 0; l < 9; l++) { p = rcOf(bb, l); if (st.cells[p.r][p.c] === '') out.push(p); } });
    return out;
  }
  function count(won, m) { return won.filter(function (x) { return x === m; }).length; }
  function place(st, mv) {
    var side = st.turn, m = markOf(side), cells = st.cells.map(function (r) { return r.slice(); }), won = st.won.slice();
    var b = bOf(mv.r, mv.c), l = lOf(mv.r, mv.c), loc, wl, result = null, nxt;
    cells[mv.r][mv.c] = m;
    loc = local(cells, b);
    if (won[b] === null) { if (lineOf(loc, m)) won[b] = m; else if (loc.every(function (x) { return x !== ''; })) won[b] = 'D'; }
    wl = lineOf(won, m);
    var sc = { p1: count(won, 'X'), p2: count(won, 'O') };
    if (wl) result = { winner: side, reason: 'Three boards in a line on the big board.', line: wl.map(function (i) { return { r: Math.floor(i / 3), c: i % 3 }; }), scores: sc };
    else if (won.every(function (x) { return x !== null; })) result = { winner: 'draw', reason: 'Every board is decided and no line of three boards formed.', scores: sc };
    nxt = won[l] === null ? l : null;
    return { slug: st.slug, humanSide: st.humanSide, seed: st.seed, cells: cells, won: won, active: nxt, turn: U.other(side), moves: st.moves + 1, last: { r: mv.r, c: mv.c, board: b, local: l, by: side }, result: result };
  }
  function heur(st, mv) {
    var m = markOf(st.turn), o = m === 'X' ? 'O' : 'X', b = bOf(mv.r, mv.c), l = lOf(mv.r, mv.c), s = 0, nx;
    if (wouldWin(st.cells, b, l, m)) s += 50;
    if (wouldWin(st.cells, b, l, o)) s += 22;
    s += (b === 4 ? 5 : (b % 2 === 0 ? 2.5 : 1)) + (l === 4 ? 4 : (l % 2 === 0 ? 2 : 0));
    nx = place(st, mv);
    if (nx.result && nx.result.winner === st.turn) return 1000;
    if (nx.won[b] === m && st.won[b] === null) {
      var mw = nx.won.map(function (x) { return x === m ? 1 : (x === null ? 0 : -1); });
      LINES.forEach(function (L) { var a = mw[L[0]] + mw[L[1]] + mw[L[2]]; if (a === 2 && L.some(function (i) { return nx.won[i] === null; })) s += 14; });
    }
    if (nx.active === null && !nx.result) s -= 8;
    else if (nx.active != null && wouldWinAny(nx.cells, nx.active, o)) s -= 40;
    return s;
  }
  function wouldWinAny(cells, b, m) { for (var l = 0; l < 9; l++) if (wouldWin(cells, b, l, m)) return true; return false; }
  function ai(st, opts) {
    var seed = (opts && opts.seed != null) ? opts.seed : st.seed, mv = moves(st), r, best = null, bs = -1e9;
    if (!mv.length) U.fail('ultimate-tic-tac-toe: no moves');
    r = U.seeded(seed, st.moves + 7);
    mv.forEach(function (x) {
      var s = heur(st, x), nx = place(st, x), rep = 0, rm;
      if (!nx.result) { rm = moves(nx); rep = -1e9; rm.forEach(function (y) { var h = heur(nx, y); if (h > rep) rep = h; }); if (rep === -1e9) rep = 0; }
      if (s < 1000) s -= 0.8 * rep;
      s += r() * 0.6;
      if (s > bs) { bs = s; best = x; }
    });
    return mk(st, best);
  }
  function mk(st, p) {
    var b = bOf(p.r, p.c), l = lOf(p.r, p.c), nx = place(st, p), freed = !nx.result && nx.active === null;
    return { kind: 'cell', token: 'c:' + p.r + ',' + p.c, cell: { r: p.r, c: p.c }, board: b, label: 'Board ' + (b + 1) + ', ' + POS[l], shortLabel: (b + 1) + ' ' + SHORT[l], hint: nx.result ? 'Ends the game' : (freed ? 'Frees the model to play in any open board' : 'Sends the model to board ' + (l + 1)) };
  }
  function actCell(a) { return a && a.cell ? a.cell : (a && typeof a.r === 'number' ? a : null); }
  var E = {
    slug: 'ultimate-tic-tac-toe', family: 'grid_3x3',
    start: function (o) {
      var cells = [], i, j;
      for (i = 0; i < 9; i++) { cells.push([]); for (j = 0; j < 9; j++) cells[i].push(''); }
      return { slug: E.slug, humanSide: (o && o.humanSide) || 'p1', seed: (o && o.seed) | 0, cells: cells, won: [null, null, null, null, null, null, null, null, null], active: null, turn: 'p1', moves: 0, last: null, result: null };
    },
    toMove: function (st) { return st.result ? null : st.turn; },
    legal: function (st) { if (st.result || st.turn !== st.humanSide) return []; return moves(st).map(function (p) { return mk(st, p); }); },
    apply: function (st, a) {
      var p = actCell(a), ok;
      if (st.result) U.fail('ultimate-tic-tac-toe: game is over');
      if (!p) U.fail('ultimate-tic-tac-toe: not a cell action');
      ok = moves(st).some(function (x) { return x.r === p.r && x.c === p.c; });
      if (!ok) U.fail('ultimate-tic-tac-toe: illegal cell ' + p.r + ',' + p.c);
      return place(st, { r: p.r, c: p.c });
    },
    ai: ai,
    terminal: function (st) { return st.result ? { winner: st.result.winner, reason: st.result.reason, line: st.result.line, scores: st.result.scores } : null; },
    explain: function (before, a, after) {
      var p = actCell(a), side = before.turn, m = markOf(side), o = m === 'X' ? 'O' : 'X', b = bOf(p.r, p.c), l = lOf(p.r, p.c), k = (before.seed + before.moves) | 0, f, g = '', res = after.result;
      var wonNow = after.won[b] === m && before.won[b] === null, blk = !wonNow && wouldWin(before.cells, b, l, o);
      function pk(arr) { return arr[Math.abs(k) % arr.length]; }
      if (res && res.winner === side) f = pk(['That board completes a line of three boards. The game is over.', 'Closes the big line with the ' + POS[b] + ' board. Nothing left to play for.', 'Third board in a row. That is the match.']);
      else if (res) f = 'Fills the last open space. No line of boards got there first.';
      else if (wonNow) f = pk(['Takes the ' + POS[b] + ' board with this cell.', 'Closes the ' + POS[b] + ' board. It counts as a mark on the big board.', 'Finishes a line inside the ' + POS[b] + ' board and claims it.']);
      else if (blk) f = pk(['Blocks a line you were building in the ' + POS[b] + ' board.', 'Sits on the cell that would have closed the ' + POS[b] + ' board for you.', 'Stops the ' + POS[b] + ' board going to you.']);
      else if (l === 4) f = pk(['Takes the centre of the ' + POS[b] + ' board. It touches the most lines.', 'Centre cell in the ' + POS[b] + ' board. It keeps four lines open there.']);
      else if (b === 4) f = pk(['Plays in the centre board, where the most big lines cross.', 'Stays in the middle board. It matters more than any corner board.']);
      else f = pk(['Adds a mark in the ' + POS[b] + ' board and keeps a line alive.', 'Builds toward a line in the ' + POS[b] + ' board.', 'Quiet move in the ' + POS[b] + ' board. It leaves two ways to finish.']);
      if (!res) {
        if (after.active === null) g = pk([' Frees the opponent to play anywhere, because that board is already settled.', ' The send-on board is settled, so the opponent can choose any open board.']);
        else g = pk([' Sends the opponent to the ' + POS[after.active] + ' board.', ' The opponent now has to play in the ' + POS[after.active] + ' board.', ' That cell points the opponent at the ' + POS[after.active] + ' board.']);
      }
      return f + g;
    },
    view: function (st) {
      var boards = [], b, l, p, i, cells3 = [];
      for (b = 0; b < 9; b++) { var rows = [[], [], []]; for (l = 0; l < 9; l++) { p = rcOf(b, l); rows[Math.floor(l / 3)].push(st.cells[p.r][p.c]); } boards.push(rows); }
      for (i = 0; i < 3; i++) cells3.push([0, 1, 2].map(function (j) { var w = st.won[i * 3 + j]; return w === 'X' || w === 'O' ? w : ''; }));
      return {
        family: 'grid_3x3', rows: 3, cols: 3, cells: cells3,
        lastMove: st.last ? { r: st.last.r, c: st.last.c } : null,
        winLine: st.result && st.result.line ? st.result.line : null,
        ultimate: { boards: boards, active: st.active, won: st.won.slice(), cells: st.cells.map(function (r) { return r.slice(); }), lastBoard: st.last ? st.last.board : null, lastLocal: st.last ? st.last.local : null, winBoards: st.result && st.result.line ? st.result.line.map(function (q) { return q.r * 3 + q.c; }) : null }
      };
    }
  };
  B.engines[E.slug] = E;
})();
/* ---- shared factory for simultaneous payoff_matrix games (rock-paper-scissors, prisoners-dilemma) ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util;
  B.util.matrixEngine = function (cfg) {
    var CH = cfg.choices;
    function ci(c) { return CH.indexOf(c); }
    function pay(a, b) { return cfg.matrix[ci(a)][ci(b)]; }
    function pickChoice(a) {
      var c = a && (a.choice != null ? a.choice : (typeof a.token === 'string' && a.token.indexOf('choice:') === 0 ? a.token.slice(7) : null));
      return ci(c) >= 0 ? c : null;
    }
    function mkAction(c) { return { kind: 'choice', token: 'choice:' + c, choice: c, label: c, shortLabel: cfg.short ? cfg.short[c] : c, hint: cfg.hints[c] }; }
    function modelAction(st, humanAction) {
      var c = pickChoice(humanAction); if (!c) U.fail(cfg.slug + ': not a choice action');
      var m = cfg.modelPick(st, U.seeded(st.seed, st.history.length * 131 + 17)); return { action: mkAction(m.pick), why: m.why, predicted: m.predicted || null, counts: m.counts || null };
    }
    var E = {
      slug: cfg.slug, family: 'payoff_matrix',
      start: function (o) { return { slug: cfg.slug, humanSide: (o && o.humanSide) || 'p1', seed: (o && o.seed) | 0, round: 1, history: [], scores: { p1: 0, p2: 0 }, lastPicks: null, lastWinner: null, lastPay: null, lastModel: null, result: null }; },
      toMove: function (st) { return st.result ? null : st.humanSide; },
      legal: function (st) { return st.result ? [] : CH.map(mkAction); },
      apply: function (st, a) {
        if (st.result) U.fail(cfg.slug + ': game is over');
        var c = pickChoice(a); if (!c) U.fail(cfg.slug + ': illegal choice');
        var hs = st.humanSide, ms = U.other(hs), m = cfg.modelPick(st, U.seeded(st.seed, st.history.length * 131 + 17));
        var picks = {}; picks[hs] = c; picks[ms] = m.pick;
        var p = pay(picks.p1, picks.p2), w = p[0] > p[1] ? 'p1' : (p[1] > p[0] ? 'p2' : 'draw');
        var scores = { p1: st.scores.p1 + p[0], p2: st.scores.p2 + p[1] };
        var hist = st.history.concat([{ p1: picks.p1, p2: picks.p2, winner: w, pay: p.slice() }]);
        var res = cfg.finish(scores, hist);
        return { slug: st.slug, humanSide: hs, seed: st.seed, round: st.round + 1, history: hist, scores: scores, lastPicks: { p1: picks.p1, p2: picks.p2 }, lastWinner: w, lastPay: p.slice(), lastModel: { pick: m.pick, why: m.why, predicted: m.predicted || null, counts: m.counts || null }, result: res };
      },
      modelAction: modelAction,
      ai: function (st, o) { if (st.result) U.fail(cfg.slug + ': game is over'); return mkAction(cfg.standIn(st, U.seeded((o && o.seed != null) ? o.seed : st.seed, st.history.length * 977 + 5))); },
      terminal: function (st) { return st.result ? { winner: st.result.winner, reason: st.result.reason, scores: { p1: st.result.scores.p1, p2: st.result.scores.p2 } } : null; },
      explain: function (before, a, after) { return cfg.explain(before, a, after, function (arr) { return arr[Math.abs(before.seed + before.history.length * 7) % arr.length]; }); },
      view: function (st) {
        var rv = !!st.lastPicks;
        return {
          family: 'payoff_matrix', choices: CH.slice(), matrix: cfg.matrix.map(function (r) { return r.map(function (x) { return x.slice(); }); }),
          picks: rv ? { p1: st.lastPicks.p1, p2: st.lastPicks.p2 } : null, revealed: rv,
          history: st.history.map(function (h) { return { p1: h.p1, p2: h.p2, winner: h.winner, pay: h.pay.slice() }; }),
          scores: { p1: st.scores.p1, p2: st.scores.p2 }, round: Math.min(st.round, cfg.rounds), rounds: cfg.rounds, played: st.history.length,
          lastWinner: st.lastWinner, youSeat: st.humanSide
        };
      }
    };
    B.engines[cfg.slug] = E;
    return E;
  };
})();

/* ---- rock-paper-scissors ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util;
  var CH = ['Rock', 'Paper', 'Scissors'];
  var BEATEN_BY = { Rock: 'Paper', Paper: 'Scissors', Scissors: 'Rock' };
  var VERB = { Rock: 'Rock blunts Scissors', Paper: 'Paper covers Rock', Scissors: 'Scissors cut Paper' };
  var matrix = [[[0, 0], [0, 1], [1, 0]], [[1, 0], [0, 0], [0, 1]], [[0, 1], [1, 0], [0, 0]]];
  U.matrixEngine({
    slug: 'rock-paper-scissors', choices: CH, matrix: matrix, rounds: 1,
    hints: { Rock: 'Beats Scissors, loses to Paper', Paper: 'Beats Rock, loses to Scissors', Scissors: 'Beats Paper, loses to Rock' },
    modelPick: function (st, r) {
      var hs = st.humanSide, counts = { Rock: 0, Paper: 0, Scissors: 0 }, mx = 0, ties, predicted;
      st.history.forEach(function (h) { counts[h[hs]]++; });
      CH.forEach(function (c) { if (counts[c] > mx) mx = counts[c]; });
      if (!st.history.length) return { pick: CH[r() * 3 | 0], why: 'open', predicted: null, counts: counts };
      ties = CH.filter(function (c) { return counts[c] === mx; });
      predicted = ties[r() * ties.length | 0];
      return { pick: BEATEN_BY[predicted], why: ties.length > 1 ? 'split' : 'freq', predicted: predicted, counts: counts };
    },
    standIn: function (st, r) { return CH[r() * 3 | 0]; },
    /* One Shot Hidden Commit (the platform's table): one sealed pick each, one result. */
    finish: function (sc, hist) {
      if (hist.length < 1) return null;
      var h = hist[hist.length - 1], w = h.winner;
      return { winner: w, scores: { p1: sc.p1, p2: sc.p2 }, reason: w === 'draw' ? 'Both sides showed ' + h.p1 + '.' : VERB[h[w]] + '.' };
    },
    explain: function (before, a, after, pk) {
      var h = after.history[after.history.length - 1], hs = before.humanSide, ms = U.other(hs), mine = h[ms], yours = h[hs], lm = after.lastModel, s1, s2, n = before.history.length;
      if (h.winner === 'draw') s1 = pk(['Both sides showed ' + mine + '. No score.', 'A ' + mine + ' meets a ' + mine + '. The round is void.', 'Matching ' + mine + '. Nobody scores.']);
      else if (h.winner === ms) s1 = pk([VERB[mine] + '. Point to the model.', 'Its ' + mine + ' takes your ' + yours + '.', 'Plays ' + mine + ' into your ' + yours + ' and wins the round.']);
      else s1 = pk(['Your ' + yours + ' beats its ' + mine + '. Point to you.', 'Its ' + mine + ' loses to your ' + yours + '.', 'It played ' + mine + ' into your ' + yours + ' and paid for it.']);
      if (lm.why === 'open') s2 = pk(['Round one gives it nothing to read, so the pick was a seeded guess.', 'No history yet, so it opened with a seeded guess.']);
      else if (lm.why === 'split') s2 = pk(['Your picks are evenly split, so it guessed which one comes next and played what beats the guess.', 'It cannot separate your favourites, so it picked one at random to beat.']);
      else s2 = pk(['It counts ' + lm.predicted + ' as your most common pick (' + lm.counts[lm.predicted] + ' of ' + n + ') and played what beats it.', lm.predicted + ' leads your history ' + lm.counts[lm.predicted] + ' to ' + (n - lm.counts[lm.predicted]) + ', so it played the answer to ' + lm.predicted + '.']);
      return s1 + ' ' + s2;
    }
  });
})();
/* ---- prisoners-dilemma (T=5 R=3 P=1 S=0, one shot as on the platform; model cooperates with a seeded 15% slip) ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util;
  var CH = ['Cooperate', 'Defect'];
  var matrix = [[[3, 3], [0, 5]], [[5, 0], [1, 1]]];
  U.matrixEngine({
    slug: 'prisoners-dilemma', choices: CH, matrix: matrix, rounds: 1,
    hints: { Cooperate: 'Three each if the model cooperates too', Defect: 'Five for you if the model cooperates, one each if not' },
    modelPick: function (st, r) {
      var hs = st.humanSide, last = st.history.length ? st.history[st.history.length - 1][hs] : null, base = last === 'Defect' ? 'Defect' : 'Cooperate', why;
      if (base === 'Cooperate' && r() < 0.15) return { pick: 'Defect', why: 'slip', predicted: null, counts: null };
      why = last === null ? 'open' : (base === 'Defect' ? 'mirror-d' : 'mirror-c');
      return { pick: base, why: why, predicted: null, counts: null };
    },
    standIn: function (st, r) { return r() < 0.7 ? 'Cooperate' : 'Defect'; },
    /* One shot, as the platform's table and the rule content say: one sealed pick each. */
    finish: function (sc, hist) {
      if (hist.length < 1) return null;
      var w = sc.p1 > sc.p2 ? 'p1' : (sc.p2 > sc.p1 ? 'p2' : 'draw');
      return { winner: w, scores: { p1: sc.p1, p2: sc.p2 }, reason: w === 'draw' ? 'Equal payoffs from the one round.' : 'Higher payoff from the one round.' };
    },
    explain: function (before, a, after, pk) {
      var h = after.history[after.history.length - 1], hs = before.humanSide, ms = U.other(hs), mine = h[ms], yours = h[hs], lm = after.lastModel, s1, s2;
      if (mine === 'Cooperate' && yours === 'Cooperate') s1 = pk(['Both sides cooperated. Three points each.', 'Mutual cooperation. Three each, the steady outcome.', 'You and the model both held. Three apiece.']);
      else if (mine === 'Defect' && yours === 'Defect') s1 = pk(['Both sides defected. One point each.', 'Mutual defection. One apiece, which is what defecting pairs earn.', 'Neither side gave anything. One point each.']);
      else if (mine === 'Defect') s1 = pk(['It defected while you cooperated. Five to the model, nothing to you.', 'The model took the five and left you with nothing.', 'You cooperated into a defection. The model banks five.']);
      else s1 = pk(['You defected into its cooperation. Five to you, nothing to the model.', 'The model cooperated and you did not. You bank five.', 'Its cooperation went unreturned. Five to you.']);
      if (lm.why === 'open') s2 = pk(['It opens every match by cooperating.', 'First round, so it offered cooperation.']);
      else if (lm.why === 'mirror-c') s2 = pk(['It copies your last move, and you cooperated.', 'You cooperated last round, so it repays the favour.']);
      else if (lm.why === 'mirror-d') s2 = pk(['It copies your last move, and you defected.', 'You defected last round, so it answers in kind.']);
      else s2 = pk(['It broke its own pattern and defected after your cooperation. That happens about one round in seven.', 'A slip: it defected where it normally would have cooperated. It does that about one round in seven.']);
      return s1 + ' ' + s2;
    }
  });
})();
/* ---- first-price-sealed-bid-auction (one lot, private values 1..100, model shades 0.55 to 0.75 of its value) ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util, SLUG = 'first-price-sealed-bid-auction';
  function modelBid(st) {
    var ms = U.other(st.humanSide), r = U.seeded(st.seed, 4242), f = 0.55 + 0.2 * r(), v = st.values[ms];
    return Math.max(0, Math.min(v, Math.round(v * f)));
  }
  function pickAction(st, value) {
    var yv = st.values[st.humanSide];
    return { kind: 'value', token: 'value:' + value, label: 'Seal bid', shortLabel: 'Seal', hint: 'Bid from 0 to ' + yv + '. The higher bid takes the lot and pays what it bid.', min: 0, max: yv, step: 1, verb: 'Seal bid', value: value };
  }
  function money(n) { return String(n); }
  var E = {
    slug: SLUG, family: 'auction_panel',
    start: function (o) {
      var seed = (o && o.seed) | 0, r = U.seeded(seed, 31337), v1 = 1 + (r() * 100 | 0), v2 = 1 + (r() * 100 | 0);
      return { slug: SLUG, humanSide: (o && o.humanSide) || 'p1', seed: seed, values: { p1: v1, p2: v2 }, bids: null, revealed: false, winner: null, scores: { p1: 0, p2: 0 }, history: [], lastModel: null, result: null };
    },
    toMove: function (st) { return st.result ? null : st.humanSide; },
    legal: function (st) { return st.result ? [] : [pickAction(st, Math.round(st.values[st.humanSide] * 0.7))]; },
    apply: function (st, a) {
      if (st.result) U.fail(SLUG + ': game is over');
      var hs = st.humanSide, ms = U.other(hs), yv = st.values[hs], v = a && a.value;
      if (!a || typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < 0 || v > yv) U.fail(SLUG + ': illegal bid');
      var mb = modelBid(st), bids = {}; bids[hs] = v; bids[ms] = mb;
      var w = bids[hs] > bids[ms] ? hs : ms, scores = { p1: 0, p2: 0 };
      scores[w] = st.values[w] - bids[w];
      var vals = { p1: st.values.p1, p2: st.values.p2 }, bd = { p1: bids.p1, p2: bids.p2 };
      return {
        slug: SLUG, humanSide: hs, seed: st.seed, values: vals, bids: bd, revealed: true, winner: w, scores: scores,
        history: [{ round: 1, bids: bd, values: vals, winner: w, paid: bids[w], scores: { p1: scores.p1, p2: scores.p2 } }],
        lastModel: { value: st.values[ms], bid: mb, shade: st.values[ms] ? Math.round((1 - mb / st.values[ms]) * 100) : 0 },
        result: { winner: w, scores: scores, reason: 'Higher sealed bid takes the lot: ' + bids[w] + ' over ' + bids[w === hs ? ms : hs] + '.' }
      };
    },
    ai: function (st, o) {
      if (st.result) U.fail(SLUG + ': game is over');
      var r = U.seeded((o && o.seed != null) ? o.seed : st.seed, 777), yv = st.values[st.humanSide];
      return pickAction(st, Math.max(0, Math.min(yv, Math.round(yv * (0.55 + 0.3 * r())))));
    },
    terminal: function (st) { return st.result ? { winner: st.result.winner, reason: st.result.reason, scores: { p1: st.result.scores.p1, p2: st.result.scores.p2 } } : null; },
    explain: function (before, a, after) {
      var hs = before.humanSide, ms = U.other(hs), yb = after.bids[hs], mb = after.bids[ms], mv = after.values[ms], yv = after.values[hs], k = (before.seed % 97) | 0, w = after.winner, s1, s2;
      function pk(arr) { return arr[k % arr.length]; }
      var shade = after.lastModel.shade;
      if (yb === mb) s1 = pk(['Both bids sealed at ' + yb + '. Ties go to the model.', 'A dead heat at ' + yb + '. The model takes ties, so the lot is its.']);
      else if (w === ms) s1 = pk(['It bid ' + mb + ' against your ' + yb + ' and takes the lot.', 'The model\'s ' + mb + ' tops your ' + yb + ', and it pays ' + mb + ' for the lot.', 'Your ' + yb + ' fell ' + (mb - yb) + ' short of its ' + mb + '.']);
      else s1 = pk(['Your ' + yb + ' beats its ' + mb + '. You pay ' + yb + ' for a lot worth ' + yv + ' to you.', 'You take the lot at ' + yb + ', ' + (yb - mb) + ' above the model\'s bid.', 'Your bid of ' + yb + ' clears its ' + mb + ', leaving you ' + (yv - yb) + ' in surplus.']);
      function pk2(arr) { return arr[((k / 3 | 0) + 1) % arr.length]; }
      s2 = pk2(['It valued the lot at ' + mv + ' and shaded its bid about ' + shade + ' percent below that.', 'Its own value was ' + mv + '. It sealed ' + mb + ', a shade of roughly ' + shade + ' percent.', 'It trades a smaller surplus for a better chance, so it bid ' + mb + ' on a value of ' + mv + '.']);
      return s1 + ' ' + s2;
    },
    view: function (st) {
      var hs = st.humanSide, rv = st.revealed, v = {
        family: 'auction_panel', yourValue: st.values[hs], bids: rv ? { p1: st.bids.p1, p2: st.bids.p2 } : null, revealed: rv, winner: rv ? st.winner : null,
        history: st.history.map(function (h) { return { round: h.round, bids: { p1: h.bids.p1, p2: h.bids.p2 }, values: { p1: h.values.p1, p2: h.values.p2 }, winner: h.winner, paid: h.paid, scores: { p1: h.scores.p1, p2: h.scores.p2 } }; }),
        youSeat: hs, lot: 'The lot', bidRange: { min: 0, max: st.values[hs] }, scores: { p1: st.scores.p1, p2: st.scores.p2 }
      };
      if (rv) v.values = { p1: st.values.p1, p2: st.values.p2 };
      return v;
    }
  };
  B.engines[SLUG] = E;
})();
/* ---- goofspiel (prizes 1..5 in seeded order, bid cards 1..5 each, ties discard the prize) ---- */
(function () {
  'use strict';
  var B = window.ESE_CORE_B, U = B.util, SLUG = 'goofspiel', N = 5;
  function shuffled(seed) {
    var a = [1, 2, 3, 4, 5], r = U.seeded(seed, 555), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = r() * (i + 1) | 0; t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function matchPick(hand, st, r, noise) {
    var desc = hand.slice().sort(function (x, y) { return y - x; }), rem = st.prizes.slice(st.history.length), cur = st.prizes[st.history.length], m = rem.length;
    var rank = rem.filter(function (p) { return p > cur; }).length, jit = r() < noise ? (r() < 0.5 ? -1 : 1) : 0, j = Math.max(0, Math.min(desc.length - 1, rank + jit));
    return { pick: desc[j], why: m === 1 ? 'forced' : (rank === 0 ? 'top' : (rank === m - 1 ? 'low' : 'mid')), jitter: jit !== 0 && j !== rank };
  }
  function modelPick(st) { var ms = U.other(st.humanSide); return matchPick(st.hands[ms], st, U.seeded(st.seed, st.history.length * 211 + 9), 0.3); }
  function cardAction(n) { return { kind: 'card', token: 'card:' + n, card: { rank: n, suit: 'bid' }, label: 'Bid ' + n, shortLabel: String(n), hint: 'Takes the prize if the model bids lower' }; }
  function rankOf(a) {
    var n = a && a.card && typeof a.card.rank === 'number' ? a.card.rank : (a && typeof a.token === 'string' && a.token.indexOf('card:') === 0 ? +a.token.slice(5) : null);
    return n;
  }
  function decide(sc, last, humanSide) {
    if (sc.p1 !== sc.p2) return { winner: sc.p1 > sc.p2 ? 'p1' : 'p2', reason: 'Higher prize total: ' + Math.max(sc.p1, sc.p2) + ' to ' + Math.min(sc.p1, sc.p2) + '.' };
    if (last) return { winner: last, reason: 'Level on ' + sc.p1 + ' each, so the last contested prize decides it.' };
    return { winner: U.other(humanSide), reason: 'Level and nothing contested. The model takes it.' };
  }
  var E = {
    slug: SLUG, family: 'card_table',
    start: function (o) {
      var seed = (o && o.seed) | 0;
      return { slug: SLUG, humanSide: (o && o.humanSide) || 'p1', seed: seed, prizes: shuffled(seed), hands: { p1: [1, 2, 3, 4, 5], p2: [1, 2, 3, 4, 5] }, scores: { p1: 0, p2: 0 }, history: [], lastBids: null, lastWinner: null, lastPrize: null, lastContested: null, lastModel: null, result: null };
    },
    toMove: function (st) { return st.result ? null : st.humanSide; },
    legal: function (st) { return st.result ? [] : st.hands[st.humanSide].slice().sort(function (a, b) { return a - b; }).map(cardAction); },
    apply: function (st, a) {
      if (st.result) U.fail(SLUG + ': game is over');
      var hs = st.humanSide, ms = U.other(hs), n = rankOf(a);
      if (n == null || st.hands[hs].indexOf(n) < 0) U.fail(SLUG + ': illegal bid card');
      var m = modelPick(st), bids = {}; bids[hs] = n; bids[ms] = m.pick;
      var round = st.history.length, prize = st.prizes[round], w = bids.p1 > bids.p2 ? 'p1' : (bids.p2 > bids.p1 ? 'p2' : 'tie');
      var sc = { p1: st.scores.p1, p2: st.scores.p2 }, hands = { p1: st.hands.p1.slice(), p2: st.hands.p2.slice() };
      hands[hs].splice(hands[hs].indexOf(n), 1); hands[ms].splice(hands[ms].indexOf(m.pick), 1);
      if (w !== 'tie') sc[w] += prize;
      var hist = st.history.concat([{ round: round + 1, prize: prize, bids: { p1: bids.p1, p2: bids.p2 }, winner: w, points: w === 'tie' ? 0 : prize }]);
      var lastC = w === 'tie' ? st.lastContested : w, res = null;
      if (hist.length >= N) { res = decide(sc, lastC, hs); res.scores = { p1: sc.p1, p2: sc.p2 }; }
      return { slug: SLUG, humanSide: hs, seed: st.seed, prizes: st.prizes, hands: hands, scores: sc, history: hist, lastBids: { p1: bids.p1, p2: bids.p2 }, lastWinner: w, lastPrize: prize, lastContested: lastC, lastModel: { pick: m.pick, why: m.why, jitter: m.jitter }, result: res };
    },
    modelAction: function (st, humanAction) { if (rankOf(humanAction) == null) U.fail(SLUG + ': not a card action'); return { action: cardAction(modelPick(st).pick), why: modelPick(st).why }; },
    ai: function (st, o) {
      if (st.result) U.fail(SLUG + ': game is over');
      return cardAction(matchPick(st.hands[st.humanSide], st, U.seeded((o && o.seed != null) ? o.seed : st.seed, st.history.length * 313 + 1), 0.45).pick);
    },
    terminal: function (st) { return st.result ? { winner: st.result.winner, reason: st.result.reason, scores: { p1: st.result.scores.p1, p2: st.result.scores.p2 } } : null; },
    explain: function (before, a, after) {
      var h = after.history[after.history.length - 1], hs = before.humanSide, ms = U.other(hs), mine = h.bids[ms], yours = h.bids[hs], lm = after.lastModel, k = (before.seed + h.round * 5) | 0, s1, s2;
      function pk(arr) { return arr[Math.abs(k) % arr.length]; }
      function pk2(arr) { return arr[(Math.abs(k) + 1) % arr.length]; }
      if (h.winner === 'tie') s1 = pk(['Both sides sealed ' + mine + '. The ' + h.prize + ' prize is discarded and nobody scores.', 'A tie at ' + mine + ' throws the ' + h.prize + ' prize away.', 'Matching ' + mine + 's. The ' + h.prize + ' prize goes nowhere.']);
      else if (h.winner === ms) s1 = pk(['Its ' + mine + ' beats your ' + yours + ' and takes the ' + h.prize + ' prize.', 'The model wins the ' + h.prize + ' prize, ' + mine + ' to ' + yours + '.', 'It bids ' + mine + ' into your ' + yours + ' and collects ' + h.prize + '.']);
      else s1 = pk(['Your ' + yours + ' beats its ' + mine + ' and takes the ' + h.prize + ' prize.', 'You win the ' + h.prize + ' prize, ' + yours + ' to ' + mine + '.', 'It bid ' + mine + ' and you had ' + yours + '. The ' + h.prize + ' prize is yours.']);
      if (lm.why === 'forced') s2 = pk2(['That was its last card, so there was no choice.', 'One card left in its hand, so it played it.']);
      else if (lm.jitter) s2 = pk2(['It usually matches card size to prize size, but stepped one card off the pattern.', 'It nudged one card away from its usual match, to be harder to read.']);
      else if (lm.why === 'top') s2 = pk2(['The ' + h.prize + ' was the biggest prize left, so it sent its biggest card.', 'It puts its highest card on the highest prize still out.']);
      else if (lm.why === 'low') s2 = pk2(['The ' + h.prize + ' was the smallest prize left, so it spent a small card.', 'Low prize, low card. It keeps its big cards for bigger prizes.']);
      else s2 = pk2(['It matches the middle of its hand to a middle prize.', 'A mid-sized prize gets a mid-sized card.']);
      return s1 + ' ' + s2;
    },
    view: function (st) {
      var hs = st.humanSide, over = !!st.result, round = st.history.length, rv = !!st.lastBids;
      function seat(id) {
        var you = id === hs, hand = st.hands[id].slice().sort(function (a, b) { return a - b; });
        var used = [1, 2, 3, 4, 5].filter(function (n) { return hand.indexOf(n) < 0; });
        return {
          id: id, label: you ? 'You' : 'Model', isYou: you,
          cards: you ? hand.map(function (n) { return { rank: n, suit: 'bid' }; }) : hand.map(function () { return { hidden: true }; }),
          count: hand.length, used: you ? used : used.slice(),
          won: st.history.filter(function (h) { return h.winner === id; }).map(function (h) { return h.prize; })
        };
      }
      var lastAction = null;
      if (rv) lastAction = { seat: st.lastWinner === 'tie' ? null : st.lastWinner, label: st.lastWinner === 'tie' ? 'Tied at ' + st.lastBids.p1 + ', prize ' + st.lastPrize + ' discarded' : 'Took the ' + st.lastPrize + ' prize with ' + st.lastBids[st.lastWinner] };
      return {
        family: 'card_table', seatLayout: 'two_sides', seats: [seat('p1'), seat('p2')],
        center: { label: 'Prize', cards: over ? [] : [{ rank: st.prizes[round], suit: 'prize' }] },
        yourHand: st.hands[hs].slice().sort(function (a, b) { return a - b; }).map(function (n) { return { rank: n, suit: 'bid' }; }),
        phase: over ? 'Complete' : 'Round ' + (round + 1) + ' of ' + N,
        lastAction: lastAction, scores: { p1: st.scores.p1, p2: st.scores.p2 }, revealed: rv,
        lastBids: rv ? { p1: st.lastBids.p1, p2: st.lastBids.p2 } : null,
        lastPrize: rv ? { rank: st.lastPrize, suit: 'prize' } : null, lastWinner: st.lastWinner,
        round: Math.min(round + 1, N), rounds: N, youSeat: hs,
        history: st.history.map(function (h) { return { round: h.round, prize: h.prize, bids: { p1: h.bids.p1, p2: h.bids.p2 }, winner: h.winner, points: h.points }; })
      };
    }
  };
  B.engines[SLUG] = E;
})();
// ===== END-OF-ENGINES MARKER (assembly block follows) =====
(function(){ var A = window.ESE_CORE_A || { engines: {} }; var B = window.ESE_CORE_B; var engines = Object.assign({}, A.engines, B.engines); window.ESE_CORE = { rng: A.rng || B.rng, engines: engines, engineGames: ['tic-tac-toe','connect-four','othello','gomoku','hex','ultimate-tic-tac-toe','rock-paper-scissors','prisoners-dilemma','first-price-sealed-bid-auction','goofspiel'].filter(function(s){ return !!engines[s]; }) }; })();
