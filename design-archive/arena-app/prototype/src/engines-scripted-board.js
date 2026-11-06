/* =====================================================================
   eSlams Arena app prototype | src/engines-scripted-board.js [B2]
   window.ESE_SCRIPTED_BOARD = { [slug]: () => record }
   record = { frames:[ViewState], ledger:[LedgerRow], result }
   Plain script, ES2020, no DOM, deterministic. Every call returns fresh
   objects. Human is p1 ('you'), model is p2 in every record.

   Conventions (all boards): r = 0 is the top row as drawn, p1 at the bottom.
   ledger[i] produces frames[i + 1]; ledger.turn is the 1-based ply count.

   Extras beyond CONTRACT section 5 (renderer reads these):
     result.reason       'normal' | 'resignation'
     LedgerRow.notation  chess only, SAN ('Nf3')
     chess   highlights:[{r,c}] holds the mated king on the last frame
     custom kinds: see the header line above each game below.
   Helper namespace: window.ESE_SCRIPTED_BOARD_KIT (internal, do not rely on).
   ===================================================================== */
window.ESE_SCRIPTED_BOARD = window.ESE_SCRIPTED_BOARD || {};
window.ESE_SCRIPTED_BOARD_KIT = (function () {
  'use strict';
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /* mulberry32: small seeded PRNG, returns () -> [0,1) */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function row(turn, seat, action, reasoning, extra) {
    var o = { turn: turn, seat: seat, action: action, reasoning: reasoning == null ? null : reasoning };
    if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }
  /* Builder: push(view, ledgerRow) keeps frames and ledger in step. */
  function recorder(start) {
    var frames = [clone(start)], ledger = [];
    return {
      push: function (view, lr) { ledger.push(lr); frames.push(clone(view)); },
      done: function (result) { return { frames: frames, ledger: ledger, result: result }; },
      count: function () { return ledger.length; }
    };
  }
  function fail(game, msg) { throw new Error('[ESE_SCRIPTED_BOARD ' + game + '] ' + msg); }
  return { clone: clone, rng: rng, row: row, recorder: recorder, fail: fail };
})();

/* ---------------------------------------------------------------------
   Chess: Paul Morphy vs Duke Karl of Brunswick and Count Isouard,
   Paris Opera, 1858. 17 moves, White mates on d8. You are White.
   square_board 8x8, r = 8 - rank, c = file (a = 0).
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  function sq(s) { return { r: 8 - Number(s[1]), c: s.charCodeAt(0) - 97 }; }
  function startPieces() {
    var back = 'RNBQKBNR', out = [];
    for (var c = 0; c < 8; c++) {
      out.push({ r: 7, c: c, piece: 'w' + back[c] });
      out.push({ r: 6, c: c, piece: 'wP' });
      out.push({ r: 1, c: c, piece: 'bP' });
      out.push({ r: 0, c: c, piece: 'b' + back[c] });
    }
    return out;
  }
  /* [from, to, san, action, reasoning|null]; 'O-O-O' moves king and rook */
  var MOVES = [
    ['e2', 'e4', 'e4', 'Pawn to e4', null],
    ['e7', 'e5', 'e5', 'Pawn to e5', 'Meets the centre pawn head on. Both sides now fight for d4 and f4.'],
    ['g1', 'f3', 'Nf3', 'Knight to f3', null],
    ['d7', 'd6', 'd6', 'Pawn to d6', 'Holds e5 with a pawn. Solid, a little passive.'],
    ['d2', 'd4', 'd4', 'Pawn to d4', null],
    ['c8', 'g4', 'Bg4', 'Bishop to g4', 'Pins the f3 knight to the queen.'],
    ['d4', 'e5', 'dxe5', 'Pawn takes on e5', null],
    ['g4', 'f3', 'Bxf3', 'Bishop takes on f3', 'Trades the bishop for the knight first, so recapturing on e5 does not lose the queens and castling.'],
    ['d1', 'f3', 'Qxf3', 'Queen takes on f3', null],
    ['d6', 'e5', 'dxe5', 'Pawn takes on e5', 'Wins the pawn back. Material is level.'],
    ['f1', 'c4', 'Bc4', 'Bishop to c4', null],
    ['g8', 'f6', 'Nf6', 'Knight to f6', 'Develops and blocks the queen from f7.'],
    ['f3', 'b3', 'Qb3', 'Queen to b3', null],
    ['d8', 'e7', 'Qe7', 'Queen to e7', 'Covers f7. If the queen takes on b7, a check on b4 forces a queen trade.'],
    ['b1', 'c3', 'Nc3', 'Knight to c3', null],
    ['c7', 'c6', 'c6', 'Pawn to c6', 'Takes b5 and d5 away from the white pieces.'],
    ['c1', 'g5', 'Bg5', 'Bishop to g5', null],
    ['b7', 'b5', 'b5', 'Pawn to b5', 'Attacks the c4 bishop and gains space on the queenside.'],
    ['c3', 'b5', 'Nxb5', 'Knight takes on b5', null],
    ['c6', 'b5', 'cxb5', 'Pawn takes on b5', 'Takes the knight. That is a full piece ahead for now.'],
    ['c4', 'b5', 'Bxb5+', 'Bishop takes on b5, check', null],
    ['b8', 'd7', 'Nbd7', 'Knight from b8 to d7', 'Blocks the check with the knight. The bishop now pins it to the king.'],
    ['O-O-O', null, 'O-O-O', 'Castles queenside', null],
    ['a8', 'd8', 'Rd8', 'Rook to d8', 'Adds a second defender to the pinned d7 knight.'],
    ['d1', 'd7', 'Rxd7', 'Rook takes on d7', null],
    ['d8', 'd7', 'Rxd7', 'Rook takes on d7', 'Recaptures with the rook. Still a rook up.'],
    ['h1', 'd1', 'Rd1', 'Rook to d1', null],
    ['e7', 'e6', 'Qe6', 'Queen to e6', 'Unpins the f6 knight so it can help defend d7.'],
    ['b5', 'd7', 'Bxd7+', 'Bishop takes on d7, check', null],
    ['f6', 'd7', 'Nxd7', 'Knight takes on d7', 'Recaptures. It is the only way out of check.'],
    ['b3', 'b8', 'Qb8+', 'Queen to b8, check', null],
    ['d7', 'b8', 'Nxb8', 'Knight takes on b8', 'Takes the queen. It is the only legal move.'],
    ['d1', 'd8', 'Rd8#', 'Rook to d8, checkmate', null]
  ];
  function at(pieces, p) {
    for (var i = 0; i < pieces.length; i++) if (pieces[i].r === p.r && pieces[i].c === p.c) return i;
    return -1;
  }
  function move(pieces, from, to, colour) {
    var i = at(pieces, from);
    if (i < 0 || pieces[i].piece[0] !== colour) K.fail('chess', 'no ' + colour + ' piece on ' + JSON.stringify(from));
    var j = at(pieces, to);
    if (j >= 0 && pieces[j].piece[0] === colour) K.fail('chess', 'own piece on target');
    var moved = { r: to.r, c: to.c, piece: pieces[i].piece };
    return pieces.filter(function (p, k) { return k !== i && k !== j; }).concat([moved]);
  }
  SB.chess = function () {
    var pieces = startPieces();
    var view = { family: 'square_board', rows: 8, cols: 8, pieces: pieces, lastMove: null, highlights: [] };
    var R = K.recorder(view);
    MOVES.forEach(function (m, i) {
      var colour = i % 2 === 0 ? 'w' : 'b', from, to;
      if (m[0] === 'O-O-O') {
        from = sq('e1'); to = sq('c1');
        pieces = move(move(pieces, from, to, 'w'), sq('a1'), sq('d1'), 'w');
      } else {
        from = sq(m[0]); to = sq(m[1]);
        pieces = move(pieces, from, to, colour);
      }
      var last = i === MOVES.length - 1;
      view = { family: 'square_board', rows: 8, cols: 8, pieces: pieces,
        lastMove: { from: from, to: to }, highlights: last ? [sq('e8')] : [] };
      R.push(view, K.row(i + 1, colour === 'w' ? 'you' : 'model', m[3], m[4], { cell: to, notation: m[2] }));
    });
    return R.done({ winner: 'p1', reason: 'normal',
      line: 'Rook to d8 is checkmate. White wins on move 17, the Opera Game, Morphy, Paris 1858.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Go 9x9: 26 stones, a two-stone capture on the bottom edge, two passes,
   area scoring (stones + empty points reached by one colour only),
   komi 7.5. You are Black. Captures and suicide are checked by the applier.
   Extras: go frames carry prisoners:{p1,p2}, komi; a pass frame has
   lastMove:null and passed:'p1'|'p2'; the last frame adds
   territory:{p1:[{r,c}],p2:[{r,c}]} and score:{p1,p2}.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var N = 9, KOMI = 7.5, COLS = 'ABCDEFGHJ';
  function name(r, c) { return COLS[c] + (N - r); }
  function nbrs(r, c) {
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(function (p) {
      return p[0] >= 0 && p[0] < N && p[1] >= 0 && p[1] < N;
    });
  }
  function group(g, r, c) {
    var col = g[r][c], seen = {}, stack = [[r, c]], out = [], libs = {};
    seen[r + ',' + c] = 1;
    while (stack.length) {
      var p = stack.pop(); out.push(p);
      nbrs(p[0], p[1]).forEach(function (q) {
        var k = q[0] + ',' + q[1], v = g[q[0]][q[1]];
        if (v === '') libs[k] = 1;
        else if (v === col && !seen[k]) { seen[k] = 1; stack.push(q); }
      });
    }
    return { stones: out, libs: Object.keys(libs).length };
  }
  function place(g, r, c, col) {
    if (g[r][c] !== '') K.fail('go', 'occupied ' + name(r, c));
    g = g.map(function (x) { return x.slice(); });
    g[r][c] = col;
    var opp = col === 'B' ? 'W' : 'B', captured = [];
    nbrs(r, c).forEach(function (q) {
      if (g[q[0]][q[1]] !== opp) return;
      var gr = group(g, q[0], q[1]);
      if (gr.libs === 0) gr.stones.forEach(function (s) {
        if (g[s[0]][s[1]] !== '') { g[s[0]][s[1]] = ''; captured.push({ r: s[0], c: s[1] }); }
      });
    });
    if (group(g, r, c).libs === 0) K.fail('go', 'suicide at ' + name(r, c));
    return { g: g, captured: captured };
  }
  function stonesOf(g) {
    var out = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (g[r][c]) out.push({ r: r, c: c, color: g[r][c] });
    return out;
  }
  function area(g) {
    var seen = {}, terr = { B: [], W: [] }, count = { B: 0, W: 0 };
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (g[r][c]) { count[g[r][c]]++; continue; }
      if (seen[r + ',' + c]) continue;
      var stack = [[r, c]], cells = [], touch = {};
      seen[r + ',' + c] = 1;
      while (stack.length) {
        var p = stack.pop(); cells.push({ r: p[0], c: p[1] });
        nbrs(p[0], p[1]).forEach(function (q) {
          var v = g[q[0]][q[1]], k = q[0] + ',' + q[1];
          if (v) touch[v] = 1;
          else if (!seen[k]) { seen[k] = 1; stack.push(q); }
        });
      }
      var t = Object.keys(touch);
      if (t.length === 1) { terr[t[0]] = terr[t[0]].concat(cells); count[t[0]] += cells.length; }
    }
    return { terr: terr, count: count };
  }
  /* [r, c, action phrase, reasoning|null]; r = -1 is a pass */
  var MOVES = [
    [4, 4, 'Takes the centre point', null],
    [2, 6, 'Takes the upper right 3-3 point', 'Takes the 3-3 point. One move makes a secure base in the corner.'],
    [6, 3, 'Takes the lower left corner', null],
    [6, 6, 'Takes the lower right 3-3 point', 'Takes the other 3-3 point on the right. Two corners are now safe.'],
    [3, 5, 'Presses on the upper right corner', null],
    [3, 6, 'Blocks underneath', 'Blocks underneath so Black cannot push down the right side.'],
    [2, 5, 'Hanes at the head of the corner stones', null],
    [1, 5, 'Hanes over the top', 'Hanes over the top to keep room for the corner group.'],
    [1, 4, 'Blocks the hane', null],
    [1, 6, 'Connects', 'Connects the hane. The corner group has no cutting point left.'],
    [0, 5, 'Hanes on the top edge', null],
    [0, 6, 'Blocks on the edge', 'Blocks on the edge. The black stone on F9 is now in atari.'],
    [0, 4, 'Connects the edge stone', null],
    [5, 4, 'Attaches under the centre stone', 'Attaches under the centre stone to claim the lower side.'],
    [5, 3, 'Blocks on the left', null],
    [6, 4, 'Extends down', 'Extends down so the wall faces the lower left.'],
    [7, 3, 'Extends down the side', null],
    [7, 4, 'Pushes toward the edge', 'Pushes toward the bottom edge. Each push is a point.'],
    [8, 3, 'Blocks on the bottom edge', null],
    [8, 2, 'Hanes on the bottom edge', 'Hanes on the edge to shrink the lower left corner.'],
    [7, 2, 'Puts the edge stone in atari', null],
    [8, 1, 'Extends along the edge', 'Extends along the edge to get out of atari.'],
    [7, 1, 'Ataris the two edge stones', null],
    [4, 5, 'Seals the centre', 'Gives up the two edge stones and seals the centre instead. That point is worth more.'],
    [8, 0, 'Captures two stones', null],
    [8, 4, 'Fills the last open point on the bottom edge', 'Fills the last open point on the bottom edge.'],
    [-1, -1, 'Passes', null],
    [-1, -1, 'Passes', 'Passes. Every point on the board is settled.']
  ];
  SB.go = function () {
    var g = [], r, c;
    for (r = 0; r < N; r++) { g.push([]); for (c = 0; c < N; c++) g[r].push(''); }
    var pris = { p1: 0, p2: 0 };
    var base = function () { return { family: 'go_board', size: N, stones: stonesOf(g), prisoners: { p1: pris.p1, p2: pris.p2 }, komi: KOMI }; };
    var view = base(); view.lastMove = null;
    var R = K.recorder(view);
    MOVES.forEach(function (m, i) {
      var p = i % 2 === 0 ? 'p1' : 'p2', col = p === 'p1' ? 'B' : 'W', v, lr;
      if (m[0] < 0) {
        v = base(); v.lastMove = null; v.passed = p;
        lr = K.row(i + 1, p === 'p1' ? 'you' : 'model', m[2], m[3]);
      } else {
        var res = place(g, m[0], m[1], col);
        g = res.g; pris[p] += res.captured.length;
        v = base(); v.lastMove = { r: m[0], c: m[1] };
        if (res.captured.length) v.captured = res.captured;
        lr = K.row(i + 1, p === 'p1' ? 'you' : 'model', m[2] + ', ' + name(m[0], m[1]), m[3], { cell: { r: m[0], c: m[1] } });
      }
      if (i === MOVES.length - 1) {
        var a = area(g);
        v.territory = { p1: a.terr.B, p2: a.terr.W };
        v.score = { p1: a.count.B, p2: a.count.W + KOMI };
      }
      R.push(v, lr);
    });
    var fin = area(g), s1 = fin.count.B, s2 = fin.count.W + KOMI;
    var w = s1 > s2 ? 'p1' : 'p2', margin = Math.abs(s1 - s2);
    return R.done({ winner: w, reason: 'normal', scores: { p1: s1, p2: s2 },
      line: (w === 'p1' ? 'Black' : 'White') + ' wins by ' + (margin === 0.5 ? 'half a point' : margin + ' points') +
        ': ' + s1 + ' to ' + s2 + ' on area, komi ' + KOMI + ' included.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Checkers: 18 legal plies (engine-searched offline, rules re-checked here:
   diagonal geometry, men forward only, compulsory capture, crowning).
   You are White ('w', bottom, moving up). The model double-jumps into a
   king on c1; you resign two pieces down. Extras: resignation frame has
   lastMove:null and resigned:'p1'. Squares named a1..h8 from your side.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var MOVES = [
    [[[5, 2], [4, 3]], null],
    [[[2, 5], [3, 4]], 'Offers a trade in the centre. Both jumps are forced.'],
    [[[4, 3], [2, 5]], null],
    [[[1, 4], [3, 6]], 'Takes back on g5. The jump is compulsory.'],
    [[[6, 1], [5, 2]], null],
    [[[2, 3], [3, 2]], 'Steps to c5 to press on the left side.'],
    [[[7, 2], [6, 1]], null],
    [[[3, 6], [4, 7]], 'Moves to the edge, where it cannot be jumped.'],
    [[[5, 6], [4, 5]], null],
    [[[1, 2], [2, 3]], 'Backs up c5 so it is never left alone.'],
    [[[5, 0], [4, 1]], null],
    [[[3, 2], [5, 0], [7, 2]], 'Double jump through a3 to c1. The piece is crowned.'],
    [[[6, 7], [5, 6]], null],
    [[[0, 3], [1, 2]], 'Brings a back-row piece forward to close the gap.'],
    [[[5, 2], [4, 1]], null],
    [[[1, 6], [2, 5]], 'Develops the right side and keeps the pieces in pairs.'],
    [[[6, 3], [5, 2]], null],
    [[[2, 3], [3, 4]], 'Takes the centre square. The new king is free behind your lines.']
  ];
  function name(p) { return String.fromCharCode(97 + p[1]) + (8 - p[0]); }
  function own(v, s) { return v && v[0] === s; }
  function fwd(v) { return v === 'w' ? -1 : v === 'b' ? 1 : 0; }
  function canJump(b, s) {
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) {
      var v = b[r][c]; if (!own(v, s)) continue;
      for (var dr = -1; dr <= 1; dr += 2) for (var dc = -1; dc <= 1; dc += 2) {
        if (fwd(v) && dr !== fwd(v)) continue;
        var mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
        if (b[mr][mc] && !own(b[mr][mc], s) && b[tr][tc] === '') return true;
      }
    }
    return false;
  }
  function apply(b, path, s) {
    b = b.map(function (x) { return x.slice(); });
    var p0 = path[0], v = b[p0[0]][p0[1]], caps = [];
    if (!own(v, s)) K.fail('checkers', 'no piece on ' + name(p0));
    var jumping = Math.abs(path[1][0] - p0[0]) === 2;
    if (!jumping && canJump(b, s)) K.fail('checkers', 'capture was compulsory at ' + name(p0));
    for (var i = 1; i < path.length; i++) {
      var a = path[i - 1], t = path[i], dr = t[0] - a[0], dc = t[1] - a[1];
      if (Math.abs(dr) !== Math.abs(dc) || b[t[0]][t[1]] !== '') K.fail('checkers', 'bad step to ' + name(t));
      if (fwd(v) && Math.sign(dr) !== fwd(v)) K.fail('checkers', 'man moved backward');
      if (Math.abs(dr) === 2) {
        var m = [a[0] + dr / 2, a[1] + dc / 2];
        if (!b[m[0]][m[1]] || own(b[m[0]][m[1]], s)) K.fail('checkers', 'nothing to jump at ' + name(m));
        b[m[0]][m[1]] = ''; caps.push({ r: m[0], c: m[1] });
      } else if (path.length > 2 || Math.abs(dr) !== 1) K.fail('checkers', 'bad step');
    }
    var end = path[path.length - 1], crowned = false;
    b[p0[0]][p0[1]] = '';
    if ((v === 'w' && end[0] === 0) || (v === 'b' && end[0] === 7)) { v = v + 'k'; crowned = true; }
    b[end[0]][end[1]] = v;
    return { b: b, caps: caps, crowned: crowned };
  }
  function pieces(b) {
    var out = [];
    for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) if (b[r][c]) out.push({ r: r, c: c, piece: b[r][c] });
    return out;
  }
  SB.checkers = function () {
    var b = [], r, c;
    for (r = 0; r < 8; r++) { b.push([]); for (c = 0; c < 8; c++) b[r].push((r + c) % 2 === 1 ? (r < 3 ? 'b' : r > 4 ? 'w' : '') : ''); }
    var R = K.recorder({ family: 'square_board', rows: 8, cols: 8, pieces: pieces(b), lastMove: null, highlights: [] });
    MOVES.forEach(function (m, i) {
      var s = i % 2 === 0 ? 'w' : 'b', path = m[0], res = apply(b, path, s);
      b = res.b;
      var from = path[0], to = path[path.length - 1], txt;
      if (res.caps.length) {
        txt = 'Jumps from ' + name(from) + ' to ' + name(to) + (res.caps.length > 1 ? ', taking ' + ['', '', 'two', 'three', 'four'][res.caps.length] + ' pieces' : ', taking one piece');
      } else txt = 'Moves ' + name(from) + ' to ' + name(to);
      if (res.crowned) txt += ', crowned';
      R.push({ family: 'square_board', rows: 8, cols: 8, pieces: pieces(b),
        lastMove: { from: { r: from[0], c: from[1] }, to: { r: to[0], c: to[1] } }, highlights: [] },
        K.row(i + 1, s === 'w' ? 'you' : 'model', txt, m[1], { cell: { r: to[0], c: to[1] } }));
    });
    R.push({ family: 'square_board', rows: 8, cols: 8, pieces: pieces(b), lastMove: null, highlights: [], resigned: 'p1' },
      K.row(MOVES.length + 1, 'you', 'Resigns', null));
    return R.done({ winner: 'p2', reason: 'resignation',
      line: 'You resigned on move ' + (MOVES.length + 1) + ', two pieces down with a black king behind your lines.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Xiangqi: 11 plies, checked offline with a full move generator (palace,
   river, horse legs, cannon screens, flying generals, self-check). You are
   White ('w', bottom, moves first). The last cannon capture is checkmate.
   custom kind 'xiangqi': rows:10, cols:9, pieces:[{r,c,piece,side}] with
   piece K general, A advisor, E elephant, H horse, R chariot, C cannon,
   P soldier; lastMove:{from,to}; river:{afterRow:4}; palaces:[{r0,r1,c0,c1}];
   highlights:[{r,c}] (the mated general on the last frame).
   Squares: files a..i left to right, ranks 1..10 from your side.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var NAMES = { K: 'General', A: 'Advisor', E: 'Elephant', H: 'Horse', R: 'Chariot', C: 'Cannon', P: 'Soldier' };
  /* [fromR, fromC, toR, toC, action tail, reasoning|null] */
  var MOVES = [
    [7, 7, 7, 4, 'to the centre file', null],
    [2, 7, 2, 8, 'to the edge file', 'Shifts the cannon to the edge to watch your right flank.'],
    [9, 7, 7, 6, null, null],
    [0, 3, 1, 4, 'up to the palace centre', 'Raises an advisor to guard the centre file against your cannon.'],
    [9, 8, 9, 7, null, null],
    [0, 6, 2, 4, null, 'Brings an elephant to the centre as a second screen in front of the general.'],
    [9, 1, 7, 2, null, null],
    [2, 1, 4, 1, 'forward to the river', 'Pushes the left cannon up to the river to probe your left side.'],
    [7, 4, 3, 4, null, null],
    [0, 0, 2, 0, null, 'Lifts the chariot so it can swing across the board.'],
    [7, 1, 0, 1, null, null]
  ];
  function sqn(r, c) { return String.fromCharCode(97 + c) + (10 - r); }
  function startPieces() {
    var back = 'RHEAKAEHR', out = [], c;
    for (c = 0; c < 9; c++) {
      out.push({ r: 0, c: c, piece: back[c], side: 'b' });
      out.push({ r: 9, c: c, piece: back[c], side: 'w' });
    }
    [[2, 1, 'b'], [2, 7, 'b'], [7, 1, 'w'], [7, 7, 'w']].forEach(function (x) { out.push({ r: x[0], c: x[1], piece: 'C', side: x[2] }); });
    [0, 2, 4, 6, 8].forEach(function (c2) {
      out.push({ r: 3, c: c2, piece: 'P', side: 'b' });
      out.push({ r: 6, c: c2, piece: 'P', side: 'w' });
    });
    return out;
  }
  function at(ps, r, c) { for (var i = 0; i < ps.length; i++) if (ps[i].r === r && ps[i].c === c) return i; return -1; }
  function base(ps, last, hl) {
    return { family: 'custom', kind: 'xiangqi', rows: 10, cols: 9, pieces: ps, lastMove: last,
      river: { afterRow: 4 }, palaces: [{ r0: 0, r1: 2, c0: 3, c1: 5 }, { r0: 7, r1: 9, c0: 3, c1: 5 }], highlights: hl || [] };
  }
  SB.xiangqi = function () {
    var ps = startPieces();
    var R = K.recorder(base(ps, null));
    MOVES.forEach(function (m, i) {
      var side = i % 2 === 0 ? 'w' : 'b', fi = at(ps, m[0], m[1]), ti = at(ps, m[2], m[3]);
      if (fi < 0 || ps[fi].side !== side) K.fail('xiangqi', 'no piece at ' + sqn(m[0], m[1]));
      if (ti >= 0 && ps[ti].side === side) K.fail('xiangqi', 'own piece at ' + sqn(m[2], m[3]));
      var mover = ps[fi], taken = ti >= 0 ? ps[ti] : null, last = i === MOVES.length - 1;
      ps = ps.filter(function (p, k) { return k !== fi && k !== ti; }).concat([{ r: m[2], c: m[3], piece: mover.piece, side: side }]);
      var txt = NAMES[mover.piece] + (taken ? ' takes the ' + NAMES[taken.piece].toLowerCase() + ' on ' : ' ' + (m[4] ? m[4] + ', ' : 'to ')) + sqn(m[2], m[3]);
      if (last) txt += ', checkmate';
      R.push(base(ps, { from: { r: m[0], c: m[1] }, to: { r: m[2], c: m[3] } }, last ? [{ r: 0, c: 4 }] : []),
        K.row(i + 1, side === 'w' ? 'you' : 'model', txt, m[5], { cell: { r: m[2], c: m[3] } }));
    });
    return R.done({ winner: 'p1', reason: 'normal',
      line: 'Checkmate on move 11. The cannon checks along the back rank and the general is boxed in by its own advisor and elephant.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Shogi: 14 plies, checked offline with a full move generator (drops,
   promotion, nifu, self-check). You are White ('w', bottom, moves first).
   After a bishop trade the model drops a bishop on 9e with check, wins the
   gold and mates with a gold drop on 5h.
   custom kind 'shogi': rows:9, cols:9, pieces:[{r,c,piece,side}] with piece
   K R B G S N L P and promoted '+B' '+R' '+S' '+N' '+L' '+P';
   hands:{w:[piece],b:[piece]}; lastMove:{from:{r,c}|null,to:{r,c},drop?:piece,
   promoted?:true}; highlights:[{r,c}] (the mated king on the last frame).
   Squares in shogi style: file 9..1 left to right, rank a..i top to bottom.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var NAMES = { K: 'King', R: 'Rook', B: 'Bishop', G: 'Gold', S: 'Silver', N: 'Knight', L: 'Lance', P: 'Pawn' };
  /* [fromR, fromC, toR, toC, promote, reasoning] or ['drop', piece, r, c, reasoning] */
  var MOVES = [
    [6, 2, 5, 2, false, null],
    [2, 6, 3, 6, false, 'Opens the bishop diagonal toward your camp.'],
    [6, 7, 5, 7, false, null],
    [1, 7, 7, 1, true, 'Trades bishops. Both sides will hold a bishop in hand.'],
    [8, 2, 7, 1, false, null],
    ['drop', 'B', 4, 0, 'Drops the bishop on the open diagonal. It checks the king from 9e.'],
    [8, 3, 7, 3, false, null],
    [0, 2, 1, 3, false, 'Brings the silver toward the centre while the gold stays pinned.'],
    [8, 5, 7, 6, false, null],
    [3, 6, 4, 6, false, 'Pushes the 3-file pawn to gain space on your right.'],
    [8, 4, 7, 5, false, null],
    [4, 0, 7, 3, true, 'The king stepped away, so the gold on 6h is loose. The bishop takes it and promotes.'],
    [5, 7, 4, 7, false, null],
    ['drop', 'G', 7, 4, 'Drops the captured gold beside the king, guarded by the promoted bishop. There is no escape.']
  ];
  function sqn(r, c) { return (9 - c) + 'abcdefghi'[r]; }
  function startPieces() {
    var back = 'LNSGKGSNL', out = [], c;
    for (c = 0; c < 9; c++) {
      out.push({ r: 0, c: c, piece: back[c], side: 'b' }, { r: 2, c: c, piece: 'P', side: 'b' });
      out.push({ r: 8, c: c, piece: back[c], side: 'w' }, { r: 6, c: c, piece: 'P', side: 'w' });
    }
    out.push({ r: 1, c: 1, piece: 'R', side: 'b' }, { r: 1, c: 7, piece: 'B', side: 'b' });
    out.push({ r: 7, c: 1, piece: 'B', side: 'w' }, { r: 7, c: 7, piece: 'R', side: 'w' });
    return out;
  }
  function at(ps, r, c) { for (var i = 0; i < ps.length; i++) if (ps[i].r === r && ps[i].c === c) return i; return -1; }
  function view(ps, hands, last, hl) {
    return { family: 'custom', kind: 'shogi', rows: 9, cols: 9, pieces: ps,
      hands: { w: hands.w.slice(), b: hands.b.slice() }, lastMove: last, highlights: hl || [] };
  }
  SB.shogi = function () {
    var ps = startPieces(), hands = { w: [], b: [] };
    var R = K.recorder(view(ps, hands, null));
    MOVES.forEach(function (m, i) {
      var side = i % 2 === 0 ? 'w' : 'b', seat = side === 'w' ? 'you' : 'model', fin = i === MOVES.length - 1, txt, last, to;
      if (m[0] === 'drop') {
        var hi = hands[side].indexOf(m[1]);
        if (hi < 0 || at(ps, m[2], m[3]) >= 0) K.fail('shogi', 'bad drop ' + m[1]);
        hands[side].splice(hi, 1);
        ps = ps.concat([{ r: m[2], c: m[3], piece: m[1], side: side }]);
        to = { r: m[2], c: m[3] };
        last = { from: null, to: to, drop: m[1] };
        txt = 'Drops a ' + NAMES[m[1]].toLowerCase() + ' on ' + sqn(m[2], m[3]);
      } else {
        var fi = at(ps, m[0], m[1]), ti = at(ps, m[2], m[3]);
        if (fi < 0 || ps[fi].side !== side) K.fail('shogi', 'no piece at ' + sqn(m[0], m[1]));
        if (ti >= 0 && ps[ti].side === side) K.fail('shogi', 'own piece at ' + sqn(m[2], m[3]));
        var mover = ps[fi], taken = ti >= 0 ? ps[ti] : null;
        if (taken) hands[side].push(taken.piece.replace('+', ''));
        ps = ps.filter(function (p, k) { return k !== fi && k !== ti; })
          .concat([{ r: m[2], c: m[3], piece: m[4] ? '+' + mover.piece : mover.piece, side: side }]);
        to = { r: m[2], c: m[3] };
        last = { from: { r: m[0], c: m[1] }, to: to };
        if (m[4]) last.promoted = true;
        txt = NAMES[mover.piece.replace('+', '')] + (taken ? ' takes the ' + NAMES[taken.piece.replace('+', '')].toLowerCase() + ' on ' : ' to ') + sqn(m[2], m[3]);
        if (m[4]) txt += ' and promotes';
      }
      if (i === 5) txt += ', check';
      if (fin) txt += ', checkmate';
      R.push(view(ps, hands, last, fin ? [{ r: 7, c: 5 }] : []), K.row(i + 1, seat, txt, m[m.length - 1], { cell: to }));
    });
    return R.done({ winner: 'p2', reason: 'normal',
      line: 'Checkmate on move 14. A gold drop on 5h, guarded by the promoted bishop, leaves the king no square.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Mancala (Kalah, 4 stones per pit): a complete 16-sowing game simulated
   with the real rules (skip the opponent store, extra turn in your own
   store, capture on landing in your own empty pit, leftovers swept at the
   end). You win 27 to 21.
   custom kind 'mancala': pits:{p1:[6],p2:[6]} each in its own sowing order
   (p1 pit 0 is your far left; p2 pit i sits opposite p1 pit 5 - i);
   stores:{p1,p2}; lastMove:{side,pit,sown,extraTurn,captured}|null;
   toMove:'p1'|'p2'|null. Pits are named 1..6 in the ledger.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  /* [side, pit, model reasoning|null]; the side order is re-checked against extra turns */
  var MOVES = [
    ['p1', 2, null], ['p1', 3, null],
    ['p2', 2, 'Pit 3 holds exactly enough stones to reach the store, so it moves again.'],
    ['p2', 1, 'Pit 2 now holds five, one for each pit up to the store. Another extra turn.'],
    ['p2', 3, 'Sows six from pit 4: one into the store and three onto your side.'],
    ['p1', 1, null], ['p1', 0, null],
    ['p2', 2, 'Drops the single stone into the empty pit 4 and captures the three opposite.'],
    ['p1', 5, null],
    ['p2', 1, 'Plays a single stone from pit 2 and keeps the larger pits intact.'],
    ['p1', 3, null],
    ['p2', 3, 'Moves one stone from pit 4 to pit 5. Pit 5 is its reserve now.'],
    ['p1', 4, null],
    ['p2', 2, 'Sows three from pit 3 and keeps stones on its side as the game nears the end.'],
    ['p1', 5, null], ['p1', 1, null]
  ];
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function sow(a, side, pit) {
    a = a.slice();
    var i = side === 'p1' ? pit : 7 + pit, n = a[i], skip = side === 'p1' ? 13 : 6, store = side === 'p1' ? 6 : 13;
    if (n === 0) K.fail('mancala', 'empty pit');
    a[i] = 0;
    while (n > 0) { i = (i + 1) % 14; if (i === skip) continue; a[i]++; n--; }
    var lo = side === 'p1' ? 0 : 7, extra = i === store, cap = 0, end = false;
    if (!extra && i >= lo && i <= lo + 5 && a[i] === 1 && a[12 - i] > 0) {
      cap = a[12 - i] + 1; a[store] += cap; a[12 - i] = 0; a[i] = 0;
    }
    var s1 = 0, s2 = 0, k;
    for (k = 0; k < 6; k++) { s1 += a[k]; s2 += a[7 + k]; }
    if (s1 === 0 || s2 === 0) {
      end = true; a[6] += s1; a[13] += s2;
      for (k = 0; k < 6; k++) { a[k] = 0; a[7 + k] = 0; }
    }
    return { a: a, extra: extra, cap: cap, end: end };
  }
  function view(a, last, toMove) {
    return { family: 'custom', kind: 'mancala', pits: { p1: a.slice(0, 6), p2: a.slice(7, 13) },
      stores: { p1: a[6], p2: a[13] }, lastMove: last, toMove: toMove };
  }
  SB.mancala = function () {
    var a = [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0], turn = 'p1';
    var R = K.recorder(view(a, null, 'p1'));
    MOVES.forEach(function (m, i) {
      if (m[0] !== turn) K.fail('mancala', 'wrong side to move at row ' + (i + 1));
      var n = a[(m[0] === 'p1' ? 0 : 7) + m[1]], o = sow(a, m[0], m[1]);
      a = o.a;
      var txt = 'Sows ' + WORDS[n] + ' from pit ' + (m[1] + 1);
      if (o.extra) txt += '. The last stone lands in the store, another turn';
      if (o.cap) txt += '. It ends in an empty pit and captures ' + WORDS[o.cap];
      if (o.end) txt += '. One side is empty, so the game ends';
      if (o.end) turn = null; else if (!o.extra) turn = turn === 'p1' ? 'p2' : 'p1';
      R.push(view(a, { side: m[0], pit: m[1], sown: n, extraTurn: o.extra, captured: o.cap }, turn),
        K.row(i + 1, m[0] === 'p1' ? 'you' : 'model', txt, m[2]));
    });
    if (turn !== null) K.fail('mancala', 'game did not end');
    return R.done({ winner: a[6] > a[13] ? 'p1' : a[6] < a[13] ? 'p2' : 'draw', reason: 'normal',
      scores: { p1: a[6], p2: a[13] },
      line: 'Your side empties on the last capture. The stores finish ' + a[6] + ' to ' + a[13] + '.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Nine Men's Morris: full placement (18 placements, one mill and one
   removal), then your first slide blocks every model piece, which loses.
   The applier checks empty points, mills, the removal rule and adjacency,
   and re-checks that the model has no slide at the end.
   custom kind 'morris': points:[{id,x,y,owner:'p1'|'p2'|null}] (24, x,y on
   a 0..6 grid, id 0 top left, reading order); edges:[[a,b]] (the board
   lines); phase:'placing'|'moving'; inHand:{p1,p2};
   lastMove:{from:id|null,to:id,removed:id|null}|null; mill:[ids]|null;
   toMove. Points named a1..g7 (a7 top left).
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var XY = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3],
    [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];
  var EDGES = [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [9, 10], [10, 11], [12, 13], [13, 14], [15, 16], [16, 17],
    [18, 19], [19, 20], [21, 22], [22, 23], [0, 9], [9, 21], [3, 10], [10, 18], [6, 11], [11, 15], [1, 4], [4, 7],
    [16, 19], [19, 22], [8, 12], [12, 17], [5, 13], [13, 20], [2, 14], [14, 23]];
  var MILLS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
    [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23]];
  /* [to, removed|null, reasoning|null] while placing; ['slide', from, to, reasoning] after */
  var MOVES = [
    [6, null, null],
    [20, null, 'Starts on the middle ring, away from your piece.'],
    [19, null, null],
    [12, null, 'Places beside the inner ring to contest that side.'],
    [8, null, null],
    [11, null, 'Blocks the c-file line through the inner ring.'],
    [7, 12, null],
    [17, null, 'Starts a new line on the inner ring at e3.'],
    [10, null, null],
    [23, null, 'Takes the g1 corner.'],
    [14, null, null],
    [13, null, 'Lines up f4 with f2. One more on f6 makes a mill.'],
    [5, null, null],
    [18, null, 'Places next to your d2 piece to hem it in.'],
    [16, null, null],
    [22, null, 'Two on the bottom line. a1 would complete the mill.'],
    [21, null, null],
    [15, null, 'Places its last piece on c3, between your pieces.'],
    ['slide', 8, 12, null]
  ];
  function name(id) { return 'abcdefg'[XY[id][0]] + (7 - XY[id][1]); }
  function adj(a, b) { return EDGES.some(function (e) { return (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a); }); }
  function millAt(o, p) {
    for (var i = 0; i < MILLS.length; i++) {
      var m = MILLS[i];
      if (m.indexOf(p) >= 0 && m.every(function (x) { return o[x] === o[p]; })) return m.slice();
    }
    return null;
  }
  function slides(o, s) {
    var n = 0;
    for (var p = 0; p < 24; p++) if (o[p] === s) EDGES.forEach(function (e) {
      if (e[0] === p && !o[e[1]]) n++;
      if (e[1] === p && !o[e[0]]) n++;
    });
    return n;
  }
  function view(o, phase, hand, last, mill, toMove) {
    return { family: 'custom', kind: 'morris',
      points: XY.map(function (xy, i) { return { id: i, x: xy[0], y: xy[1], owner: o[i] }; }),
      edges: EDGES.map(function (e) { return e.slice(); }), phase: phase, inHand: { p1: hand.p1, p2: hand.p2 },
      lastMove: last, mill: mill, toMove: toMove };
  }
  SB['nine-mens-morris'] = function () {
    var o = [], hand = { p1: 9, p2: 9 }, i;
    for (i = 0; i < 24; i++) o.push(null);
    var R = K.recorder(view(o, 'placing', hand, null, null, 'p1'));
    MOVES.forEach(function (m, k) {
      var s = k % 2 === 0 ? 'p1' : 'p2', opp = s === 'p1' ? 'p2' : 'p1', txt, last, to, rs = m[m.length - 1];
      o = o.slice();
      if (m[0] === 'slide') {
        if (o[m[1]] !== s || o[m[2]] || !adj(m[1], m[2])) K.fail('morris', 'bad slide');
        o[m[1]] = null; o[m[2]] = s; to = m[2];
        last = { from: m[1], to: to, removed: null };
        txt = 'Slides from ' + name(m[1]) + ' to ' + name(to);
      } else {
        if (o[m[0]] || hand[s] < 1) K.fail('morris', 'bad placement');
        o[m[0]] = s; hand[s]--; to = m[0];
        last = { from: null, to: to, removed: null };
        txt = 'Places on ' + name(to);
      }
      var mill = millAt(o, to);
      if (mill) {
        var rm = m[1 + (m[0] === 'slide' ? 2 : 0)], free = [];
        for (i = 0; i < 24; i++) if (o[i] === opp && !millAt(o, i)) free.push(i);
        if (rm == null || o[rm] !== opp || (free.length && free.indexOf(rm) < 0)) K.fail('morris', 'bad removal');
        o[rm] = null; last.removed = rm;
        txt += ', closes a mill and removes the piece on ' + name(rm);
      } else if (m[0] !== 'slide' && m[1] != null) K.fail('morris', 'removal without a mill');
      var phase = hand.p1 + hand.p2 > 0 ? 'placing' : 'moving';
      var blocked = phase === 'moving' && s === 'p1' && slides(o, 'p2') === 0;
      if (blocked) txt += '. The model has no legal move';
      R.push(view(o, phase, hand, last, mill, blocked ? null : opp), K.row(k + 1, s === 'p1' ? 'you' : 'model', txt, rs));
    });
    if (slides(o, 'p2') !== 0) K.fail('morris', 'model not blocked');
    return R.done({ winner: 'p1', reason: 'normal',
      line: 'Blocked on move 19. All eight model pieces are boxed in, so you win.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Pentago: 11 place-then-rotate moves applied with the real rotation; the
   applier checks every placement is on an empty cell and that the first
   five in a row appears only on the last move. You are Black and the last
   quarter turn completes five down the d file.
   custom kind 'pentago': rows:6, cols:6, cells:[[ 'B'|'W'|'' ]];
   lastMove:{cell:{r,c},quadrant:0..3,rotation:'cw'|'ccw'} (cell = where the
   marble was placed, before the turn; quadrant 0 top left, 1 top right,
   2 bottom left, 3 bottom right); landed:{r,c} (that marble after the turn);
   winLine:[{r,c}] on the last frame. Cells named a1..f6, a1 bottom left.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var QN = ['top left', 'top right', 'bottom left', 'bottom right'];
  var MOVES = [
    [3, 3, 2, 'ccw', null],
    [2, 2, 3, 'ccw', 'Places in the centre and turns the bottom right quadrant, which moves your marble off the centre.'],
    [5, 4, 3, 'cw', null],
    [4, 2, 1, 'ccw', 'Places on c2 beside your pair. The top right quadrant is empty, so the turn changes nothing.'],
    [1, 3, 0, 'cw', null],
    [2, 3, 2, 'ccw', 'Places on d4 to cut your d-file line.'],
    [0, 4, 1, 'ccw', null],
    [0, 2, 1, 'cw', 'Turns the top right quadrant so a white marble lands on d4 again.'],
    [0, 3, 1, 'ccw', null],
    [1, 0, 1, 'cw', 'Turns the top right quadrant back to block d4. Your column is cut again.'],
    [0, 5, 1, 'ccw', null]
  ];
  function name(r, c) { return 'abcdef'[c] + (6 - r); }
  function rot(g, q, dir) {
    g = g.map(function (x) { return x.slice(); });
    var r0 = q < 2 ? 0 : 3, c0 = q % 2 ? 3 : 0, s = [], i, j;
    for (i = 0; i < 3; i++) { s.push([]); for (j = 0; j < 3; j++) s[i].push(g[r0 + i][c0 + j]); }
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) g[r0 + i][c0 + j] = dir === 'cw' ? s[2 - j][i] : s[j][2 - i];
    return g;
  }
  function moveCell(r, c, q, dir) {
    var r0 = q < 2 ? 0 : 3, c0 = q % 2 ? 3 : 0, i = r - r0, j = c - c0;
    if (i < 0 || i > 2 || j < 0 || j > 2) return { r: r, c: c };
    return dir === 'cw' ? { r: r0 + j, c: c0 + 2 - i } : { r: r0 + 2 - j, c: c0 + i };
  }
  function five(g, s) {
    var dirs = [[0, 1], [1, 0], [1, 1], [1, -1]], r, c, d, k;
    for (r = 0; r < 6; r++) for (c = 0; c < 6; c++) for (d = 0; d < 4; d++) {
      var line = [];
      for (k = 0; k < 5; k++) {
        var rr = r + dirs[d][0] * k, cc = c + dirs[d][1] * k;
        if (rr < 0 || rr > 5 || cc < 0 || cc > 5 || g[rr][cc] !== s) break;
        line.push({ r: rr, c: cc });
      }
      if (line.length === 5) return line;
    }
    return null;
  }
  SB.pentago = function () {
    var g = [], i;
    for (i = 0; i < 6; i++) g.push(['', '', '', '', '', '']);
    var R = K.recorder({ family: 'custom', kind: 'pentago', rows: 6, cols: 6, cells: g, lastMove: null });
    var win = null;
    MOVES.forEach(function (m, k) {
      var s = k % 2 === 0 ? 'B' : 'W';
      if (win) K.fail('pentago', 'move after a win');
      if (g[m[0]][m[1]]) K.fail('pentago', 'occupied ' + name(m[0], m[1]));
      g = g.map(function (x) { return x.slice(); });
      g[m[0]][m[1]] = s;
      g = rot(g, m[2], m[3]);
      var wb = five(g, 'B'), ww = five(g, 'W');
      win = wb || ww;
      var v = { family: 'custom', kind: 'pentago', rows: 6, cols: 6, cells: g,
        lastMove: { cell: { r: m[0], c: m[1] }, quadrant: m[2], rotation: m[3] }, landed: moveCell(m[0], m[1], m[2], m[3]) };
      var txt = 'Places on ' + name(m[0], m[1]) + ', turns the ' + QN[m[2]] + ' quadrant ' + (m[3] === 'cw' ? 'clockwise' : 'counter-clockwise');
      if (win) { v.winLine = win; txt += '. Five in a row'; if (wb && ww) K.fail('pentago', 'double five'); }
      R.push(v, K.row(k + 1, s === 'B' ? 'you' : 'model', txt, m[4], { cell: { r: m[0], c: m[1] } }));
    });
    if (!win || !five(g, 'B')) K.fail('pentago', 'no win for Black');
    return R.done({ winner: 'p1', reason: 'normal',
      line: 'Five in a row down the d file on move 11. The last quarter turn completed it.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Backgammon: 14 turns with seeded dice (mulberry32 seed 145, two dice per
   turn) and moves checked here against those dice: each step uses one die,
   the bar enters first, no landing on 2+ opposing checkers, a lone checker
   is hit, a dance only when no entry exists. You then resign with three
   checkers on the bar against a five-point board.
   custom kind 'backgammon': points:[24] (index i = your point i+1; positive
   = your checkers, negative = the model's; you move from index 23 toward 0,
   the model from 0 toward 23); bar:{p1,p2}; off:{p1,p2}; dice:[a,b]|null;
   lastMove:{side,moves:[{from:index|'bar',to:index|'off',die,hit}]}|null;
   resigned?:'p1'; toMove. Ledger uses each side's own point numbers.
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var SEED = 145;
  /* one entry per turn: [[from, to]...], reasoning|null; [] is a dance */
  var TURNS = [
    [[[5, 1], [5, 1], [12, 8], [12, 8]], null],
    [[[11, 16], [11, 17]], 'Brings two builders down from the midpoint toward its home board.'],
    [[[12, 6], [5, 2]], null],
    [[[18, 21], [16, 21]], 'Makes its 3 point with two builders.'],
    [[[8, 7], [23, 20]], null],
    [[[18, 23], [17, 23]], 'Hits the blot in its home board and covers it in the same turn.'],
    [[['bar', 19], [8, 2]], null],
    [[[18, 19], [16, 20]], 'Hits two blots at once. Two of your checkers go to the bar.'],
    [[], null],
    [[[11, 15], [15, 19], [16, 20], [16, 20]], 'Covers the two blots it left. Five home points are now closed.'],
    [[], null],
    [[[0, 6], [6, 8]], 'Hits your blot on the 7 point with a back checker and runs it on.'],
    [[], null],
    [[[8, 9], [9, 11]], 'Brings the last runner to its midpoint. You still need a 2 to enter.']
  ];
  function ptName(side, i) { return i === 'bar' ? 'bar' : i === 'off' ? 'off' : String(side === 'p1' ? i + 1 : 24 - i); }
  function view(st, dice, last, toMove) {
    return { family: 'custom', kind: 'backgammon', points: st.p.slice(), bar: { p1: st.bar.p1, p2: st.bar.p2 },
      off: { p1: st.off.p1, p2: st.off.p2 }, dice: dice, lastMove: last, toMove: toMove };
  }
  SB.backgammon = function () {
    var p = [], i;
    for (i = 0; i < 24; i++) p.push(0);
    p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5;
    var st = { p: p, bar: { p1: 0, p2: 0 }, off: { p1: 0, p2: 0 } }, D = K.rng(SEED);
    var R = K.recorder(view(st, null, null, 'p1'));
    TURNS.forEach(function (t, k) {
      var side = k % 2 === 0 ? 'p1' : 'p2', opp = side === 'p1' ? 'p2' : 'p1', g = side === 'p1' ? 1 : -1;
      var dice = [1 + Math.floor(D() * 6), 1 + Math.floor(D() * 6)];
      var left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(), done = [], parts = [];
      if (!t[0].length) {
        if (!st.bar[side]) K.fail('backgammon', 'dance without a checker on the bar');
        dice.forEach(function (d) { var e = side === 'p1' ? 24 - d : d - 1; if (st.p[e] * g >= -1) K.fail('backgammon', 'entry was open'); });
      }
      t[0].forEach(function (m) {
        var from = m[0], to = m[1];
        if (st.bar[side] && from !== 'bar') K.fail('backgammon', 'bar must enter first');
        var d = from === 'bar' ? (side === 'p1' ? 24 - to : to + 1) : (to - from) * -g;
        var di = left.indexOf(d);
        if (di < 0) K.fail('backgammon', 'no die ' + d + ' at turn ' + (k + 1));
        left.splice(di, 1);
        if (from === 'bar') st.bar[side]--; else { if (st.p[from] * g <= 0) K.fail('backgammon', 'no checker'); st.p[from] -= g; }
        if (st.p[to] * g < -1) K.fail('backgammon', 'point ' + to + ' is blocked');
        var hit = st.p[to] * g === -1;
        if (hit) { st.p[to] = 0; st.bar[opp]++; }
        st.p[to] += g;
        done.push({ from: from, to: to, die: d, hit: hit });
        parts.push(ptName(side, from) + '/' + ptName(side, to) + (hit ? '*' : ''));
      });
      var txt = 'Rolls ' + dice[0] + '-' + dice[1] + (parts.length ? ': ' + parts.join(', ') : '. No entry, so the turn passes');
      if (done.some(function (x) { return x.hit; })) txt += (done.filter(function (x) { return x.hit; }).length > 1 ? ', two hits' : ', a hit');
      R.push(view(st, dice, { side: side, moves: done }, opp), K.row(k + 1, side === 'p1' ? 'you' : 'model', txt, t[1]));
    });
    var fin = view(st, null, null, null);
    fin.resigned = 'p1';
    R.push(fin, K.row(TURNS.length + 1, 'you', 'Resigns', null));
    return R.done({ winner: 'p2', reason: 'resignation',
      line: 'You resigned on move ' + (TURNS.length + 1) + ' with three checkers on the bar against a five-point board.' });
  };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);

/* ---------------------------------------------------------------------
   Battleship: a complete game. Fleets (5,4,3,3,2) are placed from a seed
   without overlap; both sides shoot with the same seeded search (probe
   around open hits, otherwise the cell most ship placements could cover).
   Every shot is scored against the hidden fleet, so hits are truthful.
   Hidden information: reasoning is null on every row.
   square_board 10x10 with fog:true; pieces:[]; shots:{you:[{r,c,hit}],
   model:[{r,c,hit}]} (you = your shots on the model grid, model = its
   shots on your grid); fleet:[{r,c}] your own ship cells; extras:
   sunk:{you:[{name,cells:[{r,c}]}], model:[...]} (ships each side has sunk,
   revealed when sunk); lastMove:{r,c,by:'you'|'model',hit,sunk:name|null}.
   Cells named A1..J10 (column letter, row number from the top).
   --------------------------------------------------------------------- */
(function (SB, K) {
  'use strict';
  var N = 10, SHIPS = [['carrier', 5], ['battleship', 4], ['cruiser', 3], ['submarine', 3], ['destroyer', 2]];
  var SEED = 1767;
  function cellName(r, c) { return 'ABCDEFGHIJ'[c] + (r + 1); }
  function place(R) {
    var used = {}, fleet = [];
    SHIPS.forEach(function (s) {
      for (;;) {
        var h = R() < 0.5, r = Math.floor(R() * (h ? N : N - s[1] + 1)), c = Math.floor(R() * (h ? N - s[1] + 1 : N)), cells = [], ok = true;
        for (var k = 0; k < s[1]; k++) { var rr = h ? r : r + k, cc = h ? c + k : c; if (used[rr * N + cc]) ok = false; cells.push({ r: rr, c: cc }); }
        if (!ok) continue;
        cells.forEach(function (x) { used[x.r * N + x.c] = 1; });
        fleet.push({ name: s[0], len: s[1], cells: cells, hits: 0 });
        return;
      }
    });
    return fleet;
  }
  /* Shooter state: shot map (0 unknown, 1 miss, 2 open hit, 3 sunk) and ships left. */
  function pick(map, left, R) {
    var score = [], i, best = -1, opts = [], open = false;
    for (i = 0; i < N * N; i++) { score.push(0); if (map[i] === 2) open = true; }
    left.forEach(function (len) {
      for (var h = 0; h < 2; h++) for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var cells = [], ok = true, hits = 0;
        for (var k = 0; k < len; k++) {
          var rr = h ? r : r + k, cc = h ? c + k : c;
          if (rr >= N || cc >= N) { ok = false; break; }
          var v = map[rr * N + cc];
          if (v === 1 || v === 3) { ok = false; break; }
          if (v === 2) hits++;
          cells.push(rr * N + cc);
        }
        if (!ok || (open && !hits)) continue;
        cells.forEach(function (x) { if (map[x] === 0) score[x] += open ? 1 + hits * 10 : 1; });
      }
    });
    for (i = 0; i < N * N; i++) {
      if (map[i] !== 0) continue;
      if (score[i] > best) { best = score[i]; opts = [i]; } else if (score[i] === best) opts.push(i);
    }
    return opts[Math.floor(R() * opts.length)];
  }
  function play(seed) {
    var R = K.rng(seed), fleets = { you: place(R), model: place(R) };
    var maps = { you: [], model: [] }, left = { you: SHIPS.map(function (s) { return s[1]; }), model: SHIPS.map(function (s) { return s[1]; }) };
    var shots = { you: [], model: [] }, sunk = { you: [], model: [] }, i;
    for (i = 0; i < N * N; i++) { maps.you.push(0); maps.model.push(0); }
    var own = []; fleets.you.forEach(function (s) { own = own.concat(s.cells); });
    function view(last) {
      return { family: 'square_board', rows: N, cols: N, pieces: [], fog: true, lastMove: last, highlights: [],
        shots: { you: shots.you.slice(), model: shots.model.slice() }, fleet: own, sunk: K.clone(sunk) };
    }
    var Rec = K.recorder(view(null)), who = 'you', turn = 0, winner = null;
    while (!winner) {
      if (turn > 200) K.fail('battleship', 'no finish');
      var target = who === 'you' ? fleets.model : fleets.you, map = maps[who];
      var idx = pick(map, left[who], R), r = Math.floor(idx / N), c = idx % N, ship = null;
      if (map[idx] !== 0) K.fail('battleship', 'repeat shot');
      target.forEach(function (s) { s.cells.forEach(function (x) { if (x.r === r && x.c === c) ship = s; }); });
      var txt = 'Fires at ' + cellName(r, c) + (ship ? ': hit' : ': miss'), sunkName = null;
      map[idx] = ship ? 2 : 1;
      shots[who].push({ r: r, c: c, hit: !!ship });
      if (ship && ++ship.hits === ship.len) {
        sunkName = ship.name;
        ship.cells.forEach(function (x) { map[x.r * N + x.c] = 3; });
        left[who].splice(left[who].indexOf(ship.len), 1);
        sunk[who].push({ name: ship.name, cells: K.clone(ship.cells) });
        txt += ', sinks the ' + ship.name;
        if (!left[who].length) { winner = who; txt += '. Fleet sunk'; }
      }
      turn++;
      Rec.push(view({ r: r, c: c, by: who, hit: !!ship, sunk: sunkName }), K.row(turn, who, txt, null, { cell: { r: r, c: c } }));
      who = who === 'you' ? 'model' : 'you';
    }
    var p1 = winner === 'you';
    return Rec.done({ winner: p1 ? 'p1' : 'p2', reason: 'normal',
      scores: { p1: shots.you.filter(function (s) { return s.hit; }).length, p2: shots.model.filter(function (s) { return s.hit; }).length },
      line: (p1 ? 'You sink' : 'The model sinks') + ' the last ship on move ' + turn + '. ' +
        (p1 ? 'The model' : 'You') + ' had sunk ' + ['none', 'one', 'two', 'three', 'four'][p1 ? sunk.model.length : sunk.you.length] +
        ' of the five ships on the other side.' });
  }
  SB.battleship = function () { return play(SEED); };
})(window.ESE_SCRIPTED_BOARD, window.ESE_SCRIPTED_BOARD_KIT);
