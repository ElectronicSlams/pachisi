/* engines-core-a.js — eSlams prototype: core board engines (tic-tac-toe, connect-four, othello, gomoku, hex).
 * Plain script, ES2020, pure functions, immutable states, deterministic given a seed. No DOM.
 * Exposes window.ESE_CORE_A = { rng, engines: { [slug]: engine } }.
 */
(function () {
  'use strict';
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  window.ESE_CORE_A = { rng: rng, engines: {} };
})();

/* ---- shared helpers (C.util) ---- */
(function () {
  'use strict';
  var C = window.ESE_CORE_A;
  function other(s) { return s === 'p1' ? 'p2' : 'p1'; }
  function hash(n) { n = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); n ^= n >>> 13; n = Math.imul(n, 0xC2B2AE35); n ^= n >>> 16; return n >>> 0; }
  function pick(bank, key) { return bank[hash(key) % bank.length]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function grid(rows, cols, v) { var g = []; for (var r = 0; r < rows; r++) { var row = []; for (var c = 0; c < cols; c++) row.push(v); g.push(row); } return g; }
  function clone2(g) { return g.map(function (r) { return r.slice(); }); }
  function shuffle(arr, rand) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function runLine(g, r, c, dr, dc, who, n) { // cells of n-in-a-row through (r,c) of value who, or null
    var rows = g.length, cols = g[0].length, line = [{ r: r, c: c }], i, rr, cc;
    for (i = 1; ; i++) { rr = r + dr * i; cc = c + dc * i; if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || g[rr][cc] !== who) break; line.push({ r: rr, c: cc }); }
    for (i = 1; ; i++) { rr = r - dr * i; cc = c - dc * i; if (rr < 0 || cc < 0 || rr >= rows || cc >= cols || g[rr][cc] !== who) break; line.unshift({ r: rr, c: cc }); }
    return line.length >= n ? line : null;
  }
  C.util = { other: other, hash: hash, pick: pick, cap: cap, grid: grid, clone2: clone2, shuffle: shuffle, runLine: runLine };
})();

/* ---- tic-tac-toe ---- */
(function () {
  'use strict';
  var C = window.ESE_CORE_A, U = C.util, rng = C.rng;
  var MARK = { p1: 'X', p2: 'O' };
  var NAMES = [['Top left', 'TL'], ['Top centre', 'TC'], ['Top right', 'TR'], ['Middle left', 'ML'], ['Centre', 'C'], ['Middle right', 'MR'], ['Bottom left', 'BL'], ['Bottom centre', 'BC'], ['Bottom right', 'BR']];
  var LINES = [[[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]], [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]]];
  function act(r, c) { var n = NAMES[r * 3 + c]; return { token: r + ',' + c, kind: 'cell', cell: { r: r, c: c }, label: n[0], shortLabel: n[1], hint: 'Place your mark here.' }; }
  function winner(cells) {
    for (var i = 0; i < LINES.length; i++) { var L = LINES[i], a = cells[L[0][0]][L[0][1]]; if (a && a === cells[L[1][0]][L[1][1]] && a === cells[L[2][0]][L[2][1]]) return { mark: a, line: L.map(function (p) { return { r: p[0], c: p[1] }; }) }; }
    return null;
  }
  function full(cells) { return cells.every(function (row) { return row.every(function (v) { return v; }); }); }
  function emptyCells(cells) { var o = []; for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) if (!cells[r][c]) o.push([r, c]); return o; }
  // negamax: score from the perspective of `mark` to move; win sooner / lose later
  function nega(cells, mark, opp, depth, alpha, beta) {
    var w = winner(cells);
    if (w) return w.mark === mark ? 10 - depth : depth - 10;
    var es = emptyCells(cells);
    if (!es.length) return 0;
    var best = -99;
    for (var i = 0; i < es.length; i++) {
      var r = es[i][0], c = es[i][1];
      cells[r][c] = mark;
      var v = -nega(cells, opp, mark, depth + 1, -beta, -alpha);
      cells[r][c] = '';
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  var E = {
    slug: 'tic-tac-toe', family: 'grid_3x3',
    start: function (o) { o = o || {}; return { slug: 'tic-tac-toe', humanSide: o.humanSide === 'p2' ? 'p2' : 'p1', seed: o.seed >>> 0, turn: 'p1', cells: U.grid(3, 3, ''), last: null, n: 0 }; },
    toMove: function (s) { return E.terminal(s) ? null : s.turn; },
    legal: function (s) {
      if (E.terminal(s) || s.turn !== s.humanSide) return [];
      return emptyCells(s.cells).map(function (p) { return act(p[0], p[1]); });
    },
    apply: function (s, a) {
      if (E.terminal(s)) throw new Error('tic-tac-toe: game is over');
      var r = a && a.cell ? a.cell.r : -1, c = a && a.cell ? a.cell.c : -1;
      if (!(r >= 0 && r < 3 && c >= 0 && c < 3) || s.cells[r][c]) throw new Error('tic-tac-toe: illegal action');
      var cells = U.clone2(s.cells); cells[r][c] = MARK[s.turn];
      return { slug: s.slug, humanSide: s.humanSide, seed: s.seed, turn: U.other(s.turn), cells: cells, last: { r: r, c: c }, n: s.n + 1 };
    },
    ai: function (s, o) {
      var es = emptyCells(s.cells);
      if (!es.length) throw new Error('tic-tac-toe: no moves');
      var me = MARK[s.turn], opp = MARK[U.other(s.turn)], cells = U.clone2(s.cells), best = -99, top = [];
      es.forEach(function (p) {
        cells[p[0]][p[1]] = me;
        var v = -nega(cells, opp, me, 1, -99, 99);
        cells[p[0]][p[1]] = '';
        if (v > best) { best = v; top = [p]; } else if (v === best) top.push(p);
      });
      var rand = rng((o && o.seed >>> 0) + s.n * 7919 + 1);
      var p = top[Math.floor(rand() * top.length)];
      return act(p[0], p[1]);
    },
    terminal: function (s) {
      var w = winner(s.cells);
      if (w) return { winner: w.mark === 'X' ? 'p1' : 'p2', reason: 'Three in a row', line: w.line };
      if (full(s.cells)) return { winner: 'draw', reason: 'Board full, no line' };
      return null;
    },
    explain: function (b, a, af) {
      var mover = b.turn, me = MARK[mover], opp = MARK[U.other(mover)], r = a.cell.r, c = a.cell.c, key = b.n * 31 + r * 3 + c + b.seed;
      var t = E.terminal(af), nm = NAMES[r * 3 + c][0].toLowerCase();
      if (t && t.winner === mover) return U.pick(['Completes the line and wins.', 'Finishes three in a row.', 'Takes the last square of the line. That ends it.'], key);
      var cc = U.clone2(b.cells); cc[r][c] = opp;
      if (winner(cc)) return U.pick(['Blocks the opponent from finishing a line.', 'Plugs the gap the opponent was about to use.', 'Stops the line before it is made.'], key);
      cc[r][c] = me; var open = 0;
      LINES.forEach(function (L) { var cnt = 0, bad = false; L.forEach(function (p) { var v = cc[p[0]][p[1]]; if (v === me) cnt++; else if (v === opp) bad = true; }); if (!bad && cnt === 2) open++; });
      if (open >= 2) return U.pick(['Sets up two lines at once. The opponent can only stop one.', 'Opens a fork: two ways to finish and one move to defend.'], key);
      if (open === 1) return U.pick(['Builds two in a line and forces a reply.', 'Threatens to finish a line next turn.'], key);
      if (r === 1 && c === 1) return U.pick(['Takes the centre. It keeps four lines open.', 'Claims the centre, the square that sits on the most lines.'], key);
      if ((r + c) % 2 === 0) return U.pick(['Takes a corner. Corners sit on three lines.', 'Corner move. It keeps the opponent guessing on the diagonals.'], key);
      if (t && t.winner === 'draw') return 'Fills the last square. Neither side has a line.';
      return U.pick(['Takes the ' + nm + ' edge to keep the position safe.', 'Plays the ' + nm + ' edge. Quiet, and it gives nothing away.', 'Holds the ' + nm + ' edge and leaves the corners for later.'], key);
    },
    view: function (s) {
      var t = E.terminal(s);
      return { family: 'grid_3x3', rows: 3, cols: 3, cells: U.clone2(s.cells), lastMove: s.last ? { r: s.last.r, c: s.last.c } : null, winLine: t && t.line ? t.line : null };
    }
  };
  C.engines['tic-tac-toe'] = E;
})();

/* ---- connect-four ---- */
(function () {
  'use strict';
  var C = window.ESE_CORE_A, U = C.util, rng = C.rng;
  var R = 6, W = 7, DISC = { p1: 'R', p2: 'Y' }, ORDER = [3, 2, 4, 1, 5, 0, 6], DEPTH = 6;
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  function act(c) { return { token: 'c' + c, kind: 'col', col: c, label: 'Column ' + (c + 1), shortLabel: 'C' + (c + 1), hint: 'Drop a disc into this column.' }; }
  function landRow(cells, c) { for (var r = R - 1; r >= 0; r--) if (!cells[r][c]) return r; return -1; }
  function findWin(cells, r, c) {
    var who = cells[r][c];
    if (!who) return null;
    for (var i = 0; i < 4; i++) { var L = U.runLine(cells, r, c, DIRS[i][0], DIRS[i][1], who, 4); if (L) return L; }
    return null;
  }
  // ---- search on a flat board: b[r*7+c] in {0,1,-1}, 1 = side to maximise from root ----
  function winsAt(b, r, c, v) {
    for (var d = 0; d < 4; d++) {
      var dr = DIRS[d][0], dc = DIRS[d][1], n = 1, rr, cc;
      for (rr = r + dr, cc = c + dc; rr >= 0 && rr < R && cc >= 0 && cc < W && b[rr * W + cc] === v; rr += dr, cc += dc) n++;
      for (rr = r - dr, cc = c - dc; rr >= 0 && rr < R && cc >= 0 && cc < W && b[rr * W + cc] === v; rr -= dr, cc -= dc) n++;
      if (n >= 4) return true;
    }
    return false;
  }
  var WINDOWS = (function () {
    var w = [];
    for (var r = 0; r < R; r++) for (var c = 0; c < W; c++) for (var d = 0; d < 4; d++) {
      var er = r + 3 * DIRS[d][0], ec = c + 3 * DIRS[d][1];
      if (er < 0 || er >= R || ec < 0 || ec >= W) continue;
      var idx = []; for (var k = 0; k < 4; k++) idx.push((r + k * DIRS[d][0]) * W + c + k * DIRS[d][1]);
      w.push(idx);
    }
    return w;
  })();
  var CENTRE_W = [3, 4, 5, 7, 5, 4, 3];
  function evalBoard(b, me) { // from `me` perspective (me = 1 or -1)
    var s = 0, i, k;
    for (i = 0; i < 42; i++) if (b[i]) s += b[i] === me ? CENTRE_W[i % W] : -CENTRE_W[i % W];
    for (i = 0; i < WINDOWS.length; i++) {
      var w = WINDOWS[i], m = 0, t = 0;
      for (k = 0; k < 4; k++) { var v = b[w[k]]; if (v === me) m++; else if (v) t++; }
      if (m && t) continue;
      if (m === 3) s += 24; else if (m === 2) s += 6; else if (t === 3) s -= 26; else if (t === 2) s -= 6;
    }
    return s;
  }
  function negamax(b, h, cnt, side, me, depth, alpha, beta, ply) {
    if (cnt === 42) return 0;
    if (depth === 0) return side === me ? evalBoard(b, me) : -evalBoard(b, me);
    var best = -1e9, i, c, r;
    for (i = 0; i < 7; i++) { // immediate win check first
      c = ORDER[i]; if (h[c] < 0) continue;
      r = h[c]; b[r * W + c] = side; var wn = winsAt(b, r, c, side); b[r * W + c] = 0;
      if (wn) return 100000 - ply;
    }
    for (i = 0; i < 7; i++) {
      c = ORDER[i]; r = h[c]; if (r < 0) continue;
      b[r * W + c] = side; h[c]--;
      var v = -negamax(b, h, cnt + 1, -side, me, depth - 1, -beta, -alpha, ply + 1);
      h[c]++; b[r * W + c] = 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  var E = {
    slug: 'connect-four', family: 'connect_four',
    start: function (o) { o = o || {}; return { slug: 'connect-four', humanSide: o.humanSide === 'p2' ? 'p2' : 'p1', seed: o.seed >>> 0, turn: 'p1', cells: U.grid(R, W, ''), last: null, n: 0 }; },
    toMove: function (s) { return E.terminal(s) ? null : s.turn; },
    legal: function (s) {
      if (E.terminal(s) || s.turn !== s.humanSide) return [];
      var o = []; for (var c = 0; c < W; c++) if (!s.cells[0][c]) o.push(act(c)); return o;
    },
    apply: function (s, a) {
      if (E.terminal(s)) throw new Error('connect-four: game is over');
      var c = a && typeof a.col === 'number' ? a.col : -1;
      if (!(c >= 0 && c < W) || s.cells[0][c]) throw new Error('connect-four: illegal action');
      var r = landRow(s.cells, c), cells = U.clone2(s.cells); cells[r][c] = DISC[s.turn];
      return { slug: s.slug, humanSide: s.humanSide, seed: s.seed, turn: U.other(s.turn), cells: cells, last: { r: r, c: c }, n: s.n + 1 };
    },
    ai: function (s, o) {
      var me = s.turn === 'p1' ? 1 : -1, b = new Int8Array(42), h = [R - 1, R - 1, R - 1, R - 1, R - 1, R - 1, R - 1], r, c;
      for (r = 0; r < R; r++) for (c = 0; c < W; c++) { var v = s.cells[r][c]; b[r * W + c] = v ? (v === DISC[s.turn] ? 1 : -1) : 0; }
      for (c = 0; c < W; c++) { h[c] = landRow(s.cells, c); }
      var cols = ORDER.filter(function (x) { return h[x] >= 0; });
      if (!cols.length) throw new Error('connect-four: no moves');
      var i, x;
      for (i = 0; i < cols.length; i++) { x = cols[i]; b[h[x] * W + x] = 1; var w1 = winsAt(b, h[x], x, 1); b[h[x] * W + x] = 0; if (w1) return act(x); }
      for (i = 0; i < cols.length; i++) { x = cols[i]; b[h[x] * W + x] = -1; var w2 = winsAt(b, h[x], x, -1); b[h[x] * W + x] = 0; if (w2) return act(x); }
      var best = -1e9, top = [], cnt = s.n;
      for (i = 0; i < cols.length; i++) {
        x = cols[i]; var rr = h[x];
        b[rr * W + x] = 1; h[x]--;
        var sc = -negamax(b, h, cnt + 1, -1, -1, DEPTH - 1, -1e9, -(best - 1), 1);
        h[x]++; b[rr * W + x] = 0;
        if (sc > best) { best = sc; top = [x]; } else if (sc === best) top.push(x);
      }
      var rand = rng((o && o.seed >>> 0) + s.n * 104729 + 3);
      return act(top[Math.floor(rand() * top.length)]);
    },
    terminal: function (s) {
      if (s.last) { var L = findWin(s.cells, s.last.r, s.last.c); if (L) return { winner: s.cells[s.last.r][s.last.c] === 'R' ? 'p1' : 'p2', reason: 'Four in a row', line: L }; }
      if (s.n >= R * W) return { winner: 'draw', reason: 'Board full, no line' };
      return null;
    },
    explain: function (b, a, af) {
      var mover = b.turn, me = DISC[mover], opp = DISC[U.other(mover)], c = a.col, r = af.last.r, key = b.n * 17 + c + b.seed, t = E.terminal(af);
      if (t && t.winner === mover) return U.pick(['Drops into column ' + (c + 1) + ' and completes four. Game over.', 'Finishes the line of four.', 'That disc joins four in a row and ends the game.'], key);
      if (t && t.winner === 'draw') return 'Drops the last disc. The board is full and nobody has four.';
      var cc = U.clone2(b.cells); cc[r][c] = opp;
      if (findWin(cc, r, c)) return U.pick(['Blocks column ' + (c + 1) + ' where the opponent was about to make four.', 'Covers the square the opponent needed. Four denied.', 'Stops the opponent finishing a line here.'], key);
      cc[r][c] = me;
      var run = 0; DIRS.forEach(function (d) { var L = U.runLine(cc, r, c, d[0], d[1], me, 3); if (L) run++; });
      if (run >= 2) return U.pick(['Builds two threes at once. The opponent cannot cover both.', 'Creates a double threat on a single drop.'], key);
      if (run === 1) return U.pick(['Lines up three in a row and threatens to extend it.', 'Makes three in a line. The opponent has to watch both ends.'], key);
      if (c === 3) return U.pick(['Takes the centre column. It sits on the most possible lines.', 'Centre column drop. Every line of four runs through here.'], key);
      if (c === 0 || c === 6) return U.pick(['Plays the edge column. It is quiet and stops the opponent stacking there.', 'Drops on the edge to hold the side while the middle fills up.'], key);
      return U.pick(['Drops into column ' + (c + 1) + ' next to the centre and keeps options open.', 'Builds toward the middle without committing to a line yet.', 'Stacks column ' + (c + 1) + ' to prepare a diagonal.'], key);
    },
    view: function (s) {
      var t = E.terminal(s);
      return { family: 'connect_four', rows: R, cols: W, cells: U.clone2(s.cells), lastMove: s.last ? { r: s.last.r, c: s.last.c } : null, winLine: t && t.line ? t.line : null };
    }
  };
  C.engines['connect-four'] = E;
})();

/* ---- othello ---- */
(function () {
  'use strict';
  var C = window.ESE_CORE_A, U = C.util, rng = C.rng;
  /* The platform names Othello's sides White / Black with White first (brief 5, 7.3),
     so p1 plays the white discs. The opening square is colour-symmetric. */
  var N = 8, DISC = { p1: 'w', p2: 'b' }, LETTERS = 'ABCDEFGH';
  var D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var WT = [[100, -20, 10, 5, 5, 10, -20, 100], [-20, -50, -2, -2, -2, -2, -50, -20], [10, -2, -1, -1, -1, -1, -2, 10], [5, -2, -1, -1, -1, -1, -2, 5], [5, -2, -1, -1, -1, -1, -2, 5], [10, -2, -1, -1, -1, -1, -2, 10], [-20, -50, -2, -2, -2, -2, -50, -20], [100, -20, 10, 5, 5, 10, -20, 100]];
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function num(n) { return n <= 10 ? WORDS[n] : String(n); }
  function sq(r, c) { return LETTERS[c] + (r + 1); }
  function flipsFor(bd, r, c, me) {
    if (bd[r][c]) return [];
    var opp = me === 'b' ? 'w' : 'b', out = [];
    for (var d = 0; d < 8; d++) {
      var dr = D8[d][0], dc = D8[d][1], rr = r + dr, cc = c + dc, run = [];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && bd[rr][cc] === opp) { run.push({ r: rr, c: cc }); rr += dr; cc += dc; }
      if (run.length && rr >= 0 && rr < N && cc >= 0 && cc < N && bd[rr][cc] === me) out = out.concat(run);
    }
    return out;
  }
  function movesFor(bd, me) {
    var o = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { if (bd[r][c]) continue; var f = flipsFor(bd, r, c, me); if (f.length) o.push({ r: r, c: c, flips: f }); }
    return o;
  }
  function place(bd, m, me) { var nb = U.clone2(bd); nb[m.r][m.c] = me; m.flips.forEach(function (p) { nb[p.r][p.c] = me; }); return nb; }
  function count(bd) { var b = 0, w = 0; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { if (bd[r][c] === 'b') b++; else if (bd[r][c] === 'w') w++; } return { b: b, w: w }; }
  function act(m) { return { token: m.r + ',' + m.c, kind: 'cell', cell: { r: m.r, c: m.c }, label: sq(m.r, m.c), shortLabel: sq(m.r, m.c), hint: 'Flips ' + m.flips.length + (m.flips.length === 1 ? ' disc.' : ' discs.') }; }
  function evalPos(bd, me, empties) { // me perspective
    var opp = me === 'b' ? 'w' : 'b', s = 0, r, c;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) { if (bd[r][c] === me) s += WT[r][c]; else if (bd[r][c] === opp) s -= WT[r][c]; }
    var mm = movesFor(bd, me).length, om = movesFor(bd, opp).length;
    s += 6 * (mm - om);
    if (empties < 14) { var ct = count(bd); s += (me === 'b' ? ct.b - ct.w : ct.w - ct.b) * (14 - empties); }
    return s;
  }
  function settle(bd, justMoved) { // who moves next? returns {turn, passed, over}
    var nxt = U.other(justMoved);
    if (movesFor(bd, DISC[nxt]).length) return { turn: nxt, passed: null, over: false };
    if (movesFor(bd, DISC[justMoved]).length) return { turn: justMoved, passed: nxt, over: false };
    return { turn: nxt, passed: null, over: true };
  }
  var E = {
    slug: 'othello', family: 'square_board',
    start: function (o) {
      o = o || {}; var bd = U.grid(N, N, ''); bd[3][3] = 'w'; bd[3][4] = 'b'; bd[4][3] = 'b'; bd[4][4] = 'w';
      return { slug: 'othello', humanSide: o.humanSide === 'p2' ? 'p2' : 'p1', seed: o.seed >>> 0, turn: 'p1', board: bd, last: null, flipped: [], passed: null, over: false, n: 0 };
    },
    toMove: function (s) { return s.over ? null : s.turn; },
    legal: function (s) {
      if (s.over || s.turn !== s.humanSide) return [];
      return movesFor(s.board, DISC[s.turn]).map(act);
    },
    apply: function (s, a) {
      if (s.over) throw new Error('othello: game is over');
      var r = a && a.cell ? a.cell.r : -1, c = a && a.cell ? a.cell.c : -1;
      if (!(r >= 0 && r < N && c >= 0 && c < N)) throw new Error('othello: illegal action');
      var fl = flipsFor(s.board, r, c, DISC[s.turn]);
      if (!fl.length) throw new Error('othello: illegal action');
      var nb = place(s.board, { r: r, c: c, flips: fl }, DISC[s.turn]), st = settle(nb, s.turn);
      return { slug: s.slug, humanSide: s.humanSide, seed: s.seed, turn: st.turn, board: nb, last: { r: r, c: c }, flipped: fl, passed: st.passed, over: st.over, n: s.n + 1, mover: s.turn };
    },
    ai: function (s, o) {
      var me = DISC[s.turn], opp = me === 'b' ? 'w' : 'b', ms = movesFor(s.board, me);
      if (!ms.length) throw new Error('othello: no moves');
      var empties = 64 - s.n - 4, best = -1e9, top = [];
      ms.forEach(function (m) {
        var nb = place(s.board, m, me), sc, replies = movesFor(nb, opp);
        if (!replies.length) { var mine = movesFor(nb, me).length; sc = evalPos(nb, me, empties - 1) + 40 + (mine ? 0 : 400); }
        else { var worst = 1e9; replies.forEach(function (rm) { var v = evalPos(place(nb, rm, opp), me, empties - 2); if (v < worst) worst = v; }); sc = worst; }
        sc += WT[m.r][m.c] * 0.5;
        if (sc > best + 1e-9) { best = sc; top = [m]; } else if (Math.abs(sc - best) <= 1e-9) top.push(m);
      });
      var rand = rng((o && o.seed >>> 0) + s.n * 40503 + 5);
      return act(top[Math.floor(rand() * top.length)]);
    },
    terminal: function (s) {
      if (!s.over) return null;
      var ct = count(s.board), sc = { p1: ct[DISC.p1], p2: ct[DISC.p2] }, reason = (ct.b + ct.w === 64 ? 'Board full' : 'Neither side can move') + ', ' + Math.max(sc.p1, sc.p2) + ' to ' + Math.min(sc.p1, sc.p2);
      return { winner: sc.p1 > sc.p2 ? 'p1' : sc.p2 > sc.p1 ? 'p2' : 'draw', reason: reason, scores: sc };
    },
    explain: function (b, a, af) {
      var mover = b.turn, me = DISC[mover], opp = me === 'b' ? 'w' : 'b', r = a.cell.r, c = a.cell.c, n = af.flipped.length, key = b.n * 29 + r * 8 + c + b.seed, out;
      var corner = (r === 0 || r === 7) && (c === 0 || c === 7), edge = r === 0 || r === 7 || c === 0 || c === 7;
      var oppMob = movesFor(af.board, opp).length;
      if (corner) out = U.pick(['Takes the ' + sq(r, c) + ' corner. Corners can never be flipped back.', 'Corner at ' + sq(r, c) + ', flipping ' + num(n) + '. That disc is permanent.'], key);
      else if (n >= 5) out = U.pick(['Flips ' + num(n) + ' discs in one move, a big swing in the count.', 'Turns ' + num(n) + ' discs at ' + sq(r, c) + '.'], key);
      else if (edge) out = U.pick(['Takes the ' + sq(r, c) + ' edge and flips ' + num(n) + '. Edge discs are hard to dislodge.', 'Plays the edge at ' + sq(r, c) + ', turning ' + num(n) + ' disc' + (n === 1 ? '' : 's') + '.'], key);
      else if (oppMob <= 3 && !af.over) {
        var rep = oppMob === 1 ? 'one legal reply' : num(oppMob) + ' legal replies';
        out = U.pick(['Leaves the opponent ' + rep + '. Mobility matters more than discs here.', 'Squeezes the opponent down to ' + rep + '.'], key);
      }
      else if (n === 1) out = U.pick(['Flips just one disc at ' + sq(r, c) + ', keeping the position compact.', 'A quiet move at ' + sq(r, c) + ' that turns one disc and gives little away.'], key);
      else out = U.pick(['Plays ' + sq(r, c) + ' and flips ' + num(n) + ', staying off the risky squares.', 'Turns ' + num(n) + ' discs at ' + sq(r, c) + ' without opening a corner.', 'Takes ' + sq(r, c) + ', flipping ' + num(n) + '. It keeps its own options open.'], key);
      if (af.passed) out += ' The opponent has no legal move and passes.';
      else if (af.over) { var t = E.terminal(af); out += ' No moves remain: ' + t.scores.p1 + ' to ' + t.scores.p2 + '.'; }
      return out;
    },
    view: function (s) {
      var pcs = [], r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (s.board[r][c]) pcs.push({ r: r, c: c, piece: s.board[r][c] });
      var ct = count(s.board);
      return { family: 'square_board', rows: N, cols: N, pieces: pcs, lastMove: s.last ? { r: s.last.r, c: s.last.c } : null, highlights: [], flipped: s.flipped.map(function (p) { return { r: p.r, c: p.c }; }), counts: { p1: ct[DISC.p1], p2: ct[DISC.p2] }, passed: s.passed };
    }
  };
  C.engines['othello'] = E;
})();

/* ---- gomoku ---- */
(function () {
  'use strict';
  var C = window.ESE_CORE_A, U = C.util, rng = C.rng;
  var N = 15, COLOR = { p1: 'B', p2: 'W' }, LETTERS = 'ABCDEFGHJKLMNOP', MID = 7;
  var DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  var PATS = [
    ['xxxxx', 100000], ['.xxxx.', 10000],
    ['xxxx.', 1000], ['.xxxx', 1000], ['x.xxx', 1000], ['xx.xx', 1000], ['xxx.x', 1000],
    ['.xxx.', 800], ['.xx.x.', 800], ['.x.xx.', 800],
    ['oxxx..', 100], ['..xxx', 100], ['xxx..', 100], ['xx.x.', 100], ['.x.xx', 100], ['x.xx.', 100], ['xx..x', 60], ['x..xx', 60],
    ['..xx..', 50], ['.x.x.', 40], ['.xx.', 30], ['x.x..', 12], ['..x.x', 12], ['xx...', 10], ['...xx', 10], ['.x..x', 6], ['...x...', 2]
  ];
  function sq(r, c) { return LETTERS[c] + (r + 1); }
  function act(r, c) { return { token: r + ',' + c, kind: 'cell', cell: { r: r, c: c }, label: sq(r, c), shortLabel: sq(r, c), hint: 'Place a stone here.' }; }
  function lineStr(bd, r, c, d, who) { // 9 cells centred on (r,c); the centre is treated as `who`
    var s = '';
    for (var k = -4; k <= 4; k++) {
      var rr = r + d[0] * k, cc = c + d[1] * k;
      if (k === 0) s += 'x'; else if (rr < 0 || cc < 0 || rr >= N || cc >= N) s += 'o';
      else { var v = bd[rr][cc]; s += !v ? '.' : v === who ? 'x' : 'o'; }
    }
    return s;
  }
  function dirScore(str) {
    var best = 0;
    for (var i = 0; i < PATS.length; i++) {
      var p = PATS[i][0], sc = PATS[i][1];
      if (sc <= best) continue;
      var at = str.indexOf(p);
      while (at !== -1) { if (at <= 4 && at + p.length - 1 >= 4) { best = sc; break; } at = str.indexOf(p, at + 1); }
    }
    return best;
  }
  function cellScore(bd, r, c, who) { // threat value of `who` playing at (r,c)
    var t = 0; for (var d = 0; d < 4; d++) t += dirScore(lineStr(bd, r, c, DIRS[d], who));
    return t;
  }
  function stoneCount(bd) { var n = 0; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (bd[r][c]) n++; return n; }
  function findWin(bd, r, c) {
    var who = bd[r][c]; if (!who) return null;
    for (var i = 0; i < 4; i++) { var L = U.runLine(bd, r, c, DIRS[i][0], DIRS[i][1], who, 5); if (L) { if (L.length > 5) { var k = 0; for (; k < L.length; k++) if (L[k].r === r && L[k].c === c) break; var st = Math.max(0, Math.min(k - 2, L.length - 5)); L = L.slice(st, st + 5); } return L; } }
    return null;
  }
  function candidates(bd) {
    var seen = {}, out = [], r, c, dr, dc;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
      if (!bd[r][c]) continue;
      for (dr = -2; dr <= 2; dr++) for (dc = -2; dc <= 2; dc++) {
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N || bd[rr][cc]) continue;
        var k = rr * N + cc; if (!seen[k]) { seen[k] = 1; out.push([rr, cc]); }
      }
    }
    return out;
  }
  var E = {
    slug: 'gomoku', family: 'go_board',
    start: function (o) { o = o || {}; return { slug: 'gomoku', humanSide: o.humanSide === 'p2' ? 'p2' : 'p1', seed: o.seed >>> 0, turn: 'p1', board: U.grid(N, N, ''), last: null, n: 0 }; },
    toMove: function (s) { return E.terminal(s) ? null : s.turn; },
    legal: function (s) {
      if (E.terminal(s) || s.turn !== s.humanSide) return [];
      var o = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!s.board[r][c]) o.push(act(r, c)); return o;
    },
    apply: function (s, a) {
      if (E.terminal(s)) throw new Error('gomoku: game is over');
      var r = a && a.cell ? a.cell.r : -1, c = a && a.cell ? a.cell.c : -1;
      if (!(r >= 0 && r < N && c >= 0 && c < N) || s.board[r][c]) throw new Error('gomoku: illegal action');
      var bd = U.clone2(s.board); bd[r][c] = COLOR[s.turn];
      return { slug: s.slug, humanSide: s.humanSide, seed: s.seed, turn: U.other(s.turn), board: bd, last: { r: r, c: c }, n: s.n + 1 };
    },
    ai: function (s, o) {
      var rand = rng((o && o.seed >>> 0) + s.n * 15485863 + 11), me = COLOR[s.turn], opp = COLOR[U.other(s.turn)];
      if (s.n === 0) return act(MID, MID);
      var cands = candidates(s.board);
      if (!cands.length) throw new Error('gomoku: no moves');
      var best = -1e9, top = [];
      for (var i = 0; i < cands.length; i++) {
        var r = cands[i][0], c = cands[i][1];
        var mine = cellScore(s.board, r, c, me), theirs = cellScore(s.board, r, c, opp);
        var sc = mine * 1.5 + theirs - (Math.abs(r - MID) + Math.abs(c - MID)) * 0.2;
        if (mine < 800 && theirs < 800) sc *= 1 + (rand() - 0.5) * 0.3; // seeded variety on quiet moves only
        if (mine >= 100000) sc += 1e7;           // win now
        else if (theirs >= 100000) sc += 5e6;    // block five
        if (sc > best + 1e-9) { best = sc; top = [[r, c]]; } else if (Math.abs(sc - best) <= 1e-9) top.push([r, c]);
      }
      var p = top[Math.floor(rand() * top.length)];
      return act(p[0], p[1]);
    },
    terminal: function (s) {
      if (s.last) { var L = findWin(s.board, s.last.r, s.last.c); if (L) return { winner: s.board[s.last.r][s.last.c] === 'B' ? 'p1' : 'p2', reason: 'Five in a row', line: L }; }
      if (s.n >= N * N) return { winner: 'draw', reason: 'Board full, no line' };
      return null;
    },
    explain: function (b, a, af) {
      var mover = b.turn, me = COLOR[mover], opp = COLOR[U.other(mover)], r = a.cell.r, c = a.cell.c, key = b.n * 23 + r * 15 + c + b.seed, t = E.terminal(af);
      if (t && t.winner === mover) return U.pick(['Completes five in a row and wins.', 'The fifth stone lands and the line is done.', 'Five in a row at ' + sq(r, c) + '. Game over.'], key);
      if (b.n === 0) return 'Opens in the centre, where a line can grow in every direction.';
      var mine = cellScore(b.board, r, c, me), theirs = cellScore(b.board, r, c, opp);
      if (theirs >= 100000) return U.pick(['Blocks the four before it becomes five.', 'Covers the one square that would have finished the opponent\'s line.'], key);
      if (mine >= 10000 && mine >= theirs) return U.pick(['Makes an open four. It can be finished from either end and cannot be stopped.', 'Opens a four with both ends free. One end will do.'], key);
      if (theirs >= 10000) return U.pick(['Blocks the opponent\'s open four before it can be finished.', 'Breaks up a four the opponent was about to make unstoppable.'], key);
      if (mine >= 1000 && mine >= theirs) return U.pick(['Makes four in a row and forces the opponent to answer at once.', 'Threatens five on the next move, so the reply is forced.'], key);
      if (theirs >= 800 && theirs > mine) return U.pick(['Caps an open three before it turns into a four.', 'Stops the opponent\'s three while both ends are still open.', 'Blocks the three early rather than waiting for a four.'], key);
      if (mine >= 800) return U.pick(['Builds an open three. If left alone it becomes an open four.', 'Extends to three with both ends free and starts forcing play.'], key);
      if (theirs >= 100) return U.pick(['Cuts across the opponent\'s line while building its own.', 'Sits beside the opponent\'s stones to limit where they can grow.'], key);
      if (mine >= 40) return U.pick(['Links two stones and keeps the space on both sides open.', 'Adds a second stone to the line, ready to extend.'], key);
      return U.pick(['Develops near the action without committing to a line.', 'Quiet move that keeps contact with the stones already down.', 'Stakes out space close to the centre.'], key);
    },
    view: function (s) {
      var st = [], r, c, t = E.terminal(s);
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (s.board[r][c]) st.push({ r: r, c: c, color: s.board[r][c] });
      return { family: 'go_board', size: N, stones: st, lastMove: s.last ? { r: s.last.r, c: s.last.c } : null, winLine: t && t.line ? t.line : null };
    }
  };
  C.engines['gomoku'] = E;
})();

/* ---- hex ----  Rhombus layout: neighbours of (r,c) are (r,c+-1), (r+-1,c), (r-1,c+1), (r+1,c-1).
 * p1 = Black connects top (r=0) to bottom (r=10); p2 = White connects left (c=0) to right (c=10). */
(function () {
  'use strict';
  var C = window.ESE_CORE_A, U = C.util, rng = C.rng;
  var N = 11, COLOR = { p1: 'B', p2: 'W' }, LETTERS = 'ABCDEFGHIJK', INF = 99;
  var NB = [[0, 1], [0, -1], [1, 0], [-1, 0], [-1, 1], [1, -1]];
  var BR = [[-2, 1, -1, 0, -1, 1], [-1, -1, -1, 0, 0, -1], [1, -2, 0, -1, 1, -1], [2, -1, 1, -1, 1, 0], [1, 1, 0, 1, 1, 0], [-1, 2, -1, 1, 0, 1]];
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
  function num(n) { return n >= 0 && n < WORDS.length ? WORDS[n] : String(n); }
  function sq(r, c) { return LETTERS[c] + (r + 1); }
  function act(r, c) { return { token: r + ',' + c, kind: 'cell', cell: { r: r, c: c }, label: sq(r, c), shortLabel: sq(r, c), hint: 'Place a stone here.' }; }
  function onStart(col, r, c) { return col === 'B' ? r === 0 : c === 0; }
  function onEnd(col, r, c) { return col === 'B' ? r === N - 1 : c === N - 1; }
  // union-find connection test: virtual nodes N*N (start edge) and N*N+1 (end edge)
  function connected(bd, col) {
    var par = []; for (var i = 0; i < N * N + 2; i++) par.push(i);
    function find(x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; }
    function uni(a, b) { a = find(a); b = find(b); if (a !== b) par[a] = b; }
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (bd[r][c] !== col) continue;
      var id = r * N + c;
      if (onStart(col, r, c)) uni(id, N * N);
      if (onEnd(col, r, c)) uni(id, N * N + 1);
      for (var k = 0; k < 6; k++) { var rr = r + NB[k][0], cc = c + NB[k][1]; if (rr >= 0 && cc >= 0 && rr < N && cc < N && bd[rr][cc] === col) uni(id, rr * N + cc); }
    }
    return find(N * N) === find(N * N + 1);
  }
  function findPath(bd, col) { // shortest chain of own stones from start edge to end edge
    var prev = {}, q = [], r, c, k;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (bd[r][c] === col && onStart(col, r, c)) { prev[r * N + c] = -1; q.push(r * N + c); }
    for (var h = 0; h < q.length; h++) {
      var id = q[h]; r = (id / N) | 0; c = id % N;
      if (onEnd(col, r, c)) { var path = []; for (var x = id; x !== -1; x = prev[x]) path.unshift({ r: (x / N) | 0, c: x % N }); return path; }
      for (k = 0; k < 6; k++) { var rr = r + NB[k][0], cc = c + NB[k][1], nid = rr * N + cc; if (rr >= 0 && cc >= 0 && rr < N && cc < N && bd[rr][cc] === col && prev[nid] === undefined) { prev[nid] = id; q.push(nid); } }
    }
    return null;
  }
  // shortest-path resistance: own stone cost 0, empty cost 1, opponent blocked. Returns stones still needed.
  function dist(bd, col) {
    var opp = col === 'B' ? 'W' : 'B', d = new Array(N * N), dq = [], r, c, k, id, v;
    for (id = 0; id < N * N; id++) d[id] = INF;
    for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (onStart(col, r, c) && bd[r][c] !== opp) { v = bd[r][c] === col ? 0 : 1; id = r * N + c; if (v < d[id]) { d[id] = v; if (v === 0) dq.unshift(id); else dq.push(id); } }
    var done = {};
    while (dq.length) {
      id = dq.shift(); if (done[id]) continue; done[id] = 1; r = (id / N) | 0; c = id % N;
      for (k = 0; k < 6; k++) {
        var rr = r + NB[k][0], cc = c + NB[k][1]; if (rr < 0 || cc < 0 || rr >= N || cc >= N || bd[rr][cc] === opp) continue;
        var nid = rr * N + cc, w = bd[rr][cc] === col ? 0 : 1;
        if (d[id] + w < d[nid]) { d[nid] = d[id] + w; if (w === 0) dq.unshift(nid); else dq.push(nid); }
      }
      if (bd[r][c] === col) for (k = 0; k < 6; k++) { // two-bridge: own stone reaches a cell two steps away through two empty carriers
        var br = BR[k], tr = r + br[0], tc = c + br[1]; if (tr < 0 || tc < 0 || tr >= N || tc >= N || bd[tr][tc] === opp) continue;
        if (bd[r + br[2]][c + br[3]] || bd[r + br[4]][c + br[5]]) continue;
        var bid = tr * N + tc, bw = bd[tr][tc] === col ? 0 : 1;
        if (d[id] + bw < d[bid]) { d[bid] = d[id] + bw; if (bw === 0) dq.unshift(bid); else dq.push(bid); }
      }
    }
    var best = INF; for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (onEnd(col, r, c) && d[r * N + c] < best) best = d[r * N + c];
    return best;
  }
  function evalFor(bd, me) { var opp = me === 'B' ? 'W' : 'B'; return dist(bd, opp) - dist(bd, me); }
  var E = {
    slug: 'hex', family: 'hex_board',
    start: function (o) { o = o || {}; return { slug: 'hex', humanSide: o.humanSide === 'p2' ? 'p2' : 'p1', seed: o.seed >>> 0, turn: 'p1', board: U.grid(N, N, ''), last: null, n: 0, won: null }; },
    toMove: function (s) { return s.won ? null : s.turn; },
    legal: function (s) {
      if (s.won || s.turn !== s.humanSide) return [];
      var o = []; for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!s.board[r][c]) o.push(act(r, c)); return o;
    },
    apply: function (s, a) {
      if (s.won) throw new Error('hex: game is over');
      var r = a && a.cell ? a.cell.r : -1, c = a && a.cell ? a.cell.c : -1;
      if (!(r >= 0 && r < N && c >= 0 && c < N) || s.board[r][c]) throw new Error('hex: illegal action');
      var bd = U.clone2(s.board), col = COLOR[s.turn]; bd[r][c] = col;
      var won = connected(bd, col) ? { winner: s.turn, path: findPath(bd, col) } : null;
      return { slug: s.slug, humanSide: s.humanSide, seed: s.seed, turn: U.other(s.turn), board: bd, last: { r: r, c: c }, n: s.n + 1, won: won };
    },
    ai: function (s, o) {
      var me = COLOR[s.turn], opp = me === 'B' ? 'W' : 'B', rand = rng((o && o.seed >>> 0) + s.n * 2654435 + 13), r, c, scored = [];
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
        if (s.board[r][c]) continue;
        s.board[r][c] = me;
        if (connected(s.board, me)) { s.board[r][c] = ''; return act(r, c); }
        var sc = evalFor(s.board, me) * 10 - (Math.abs(r - 5) + Math.abs(c - 5)) * 0.15 + rand() * 0.3;
        s.board[r][c] = '';
        scored.push({ r: r, c: c, sc: sc });
      }
      if (!scored.length) throw new Error('hex: no moves');
      scored.sort(function (a, b) { return b.sc - a.sc; });
      var best = null, bs = -1e9, top = scored.slice(0, 6), i;
      for (i = 0; i < top.length; i++) { // 2-ply: assume the opponent answers with its best distance gain
        var m = top[i], worst = 1e9, bd = U.clone2(s.board); bd[m.r][m.c] = me;
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) { if (bd[r][c]) continue; bd[r][c] = opp; var v = evalFor(bd, me); bd[r][c] = ''; if (v < worst) worst = v; }
        var tot = worst * 10 + m.sc * 0.2;
        if (tot > bs) { bs = tot; best = m; }
      }
      return act(best.r, best.c);
    },
    terminal: function (s) {
      if (!s.won) return null;
      var p1 = s.won.winner === 'p1';
      return { winner: s.won.winner, reason: p1 ? 'Black connected top to bottom' : 'White connected left to right', line: s.won.path };
    },
    explain: function (b, a, af) {
      var mover = b.turn, me = COLOR[mover], opp = me === 'B' ? 'W' : 'B', r = a.cell.r, c = a.cell.c, key = b.n * 37 + r * 11 + c + b.seed;
      if (af.won) return U.pick(['Closes the chain ' + (me === 'B' ? 'from top to bottom' : 'from left to right') + '. The connection is complete.', 'Joins the last gap. The edges are now linked.'], key);
      var myB = dist(b.board, me), myA = dist(af.board, me), opB = dist(b.board, opp), opA = dist(af.board, opp);
      if (b.n === 0) return 'Opens near the centre, the cell with the most routes through it.';
      if (opA > opB && myA < myB) return U.pick(['Does two jobs: its own route drops to ' + num(myA) + ' stones and the opponent\'s rises to ' + num(opA) + '.', 'Shortens its own path to ' + num(myA) + ' and pushes the opponent\'s out to ' + num(opA) + '.'], key);
      if (opA > opB) return U.pick(['Blocks the opponent\'s shortest route. They now need ' + num(opA) + ' more stones instead of ' + num(opB) + '.', 'Cuts across the opponent\'s best path and costs them ' + (opA - opB === 1 ? 'a stone' : num(opA - opB) + ' stones') + '.', 'Gets in the way of the opponent\'s chain at ' + sq(r, c) + '.'], key);
      if (myA < myB) return U.pick(['Extends its own chain. The route is now ' + num(myA) + ' stone' + (myA === 1 ? '' : 's') + ' from complete.', 'Shortens its path by one. ' + U.cap(num(myA)) + ' to go.', 'Links toward the far edge and leaves ' + num(myA) + ' to place.'], key);
      return U.pick(['Reinforces the position at ' + sq(r, c) + ' so the chain cannot be cut with a single move.', 'Builds a second route in case the first is blocked.', 'Quiet move that keeps both routes open.'], key);
    },
    view: function (s) {
      var cs = [], r, c;
      for (r = 0; r < N; r++) for (c = 0; c < N; c++) if (s.board[r][c]) cs.push({ r: r, c: c, color: s.board[r][c] });
      return { family: 'hex_board', size: N, cells: cs, lastMove: s.last ? { r: s.last.r, c: s.last.c } : null, path: s.won && s.won.path ? s.won.path.map(function (p) { return { r: p.r, c: p.c }; }) : null };
    }
  };
  C.engines['hex'] = E;
})();
