/* =====================================================================
   eSlams Arena app prototype  |  src/engines.js  [B]  |  window.ESE
   ---------------------------------------------------------------------
   Small aggregator. Assembles window.ESE (CONTRACT section 4) from the
   part files that load before it:
     window.ESE_CORE            { rng, engineGames, engines }  engines-core.js
                                (falls back to merging ESE_CORE_A + ESE_CORE_B)
     window.ESE_SCRIPTED_BOARD  { [slug]: () => record }       engines-scripted-board.js
     window.ESE_SCRIPTED_TABLE  { [slug]: () => record }       engines-scripted-table.js
   A missing part logs one console.warn and the app still boots (empty
   arrays, null results).

   Contract surface: engines, engineGames, scripted, preview, recordGame.
   Extras (this file's namespace):
     ESE.isEngine(slug)   true when a real engine exists for the slug
     ESE.isSimultaneous(slug) / ESE.simulReply(slug, before, action, after)
                          RPS, PD, auction, Goofspiel: model reply is inside apply();
                          simulReply names it for the ledger. Ledger rows carry
                          `frame` (index of the frame the move produced).
     ESE.rng              core rng if provided, else mulberry32(seed) -> () => [0,1)
     ESE.parts            { core, board, table } booleans, what loaded
   Notes:
     - preview(): engine games return the first 12 frames (start + 11 moves) of
       an ai-vs-ai game (a game beginning); scripted games return the
       first 12 frames of the record. Cached per slug + seed.
     - recordGame() for engine games: result = { winner, line: reason
       string, reason, winLine?: [{r,c}], scores? }. Ledger reasoning comes
       from explain() for model rows; 'you' rows and hidden-information
       games (ESD.games[slug].hiddenInfo) get null.
   ===================================================================== */
(function () {
  'use strict';

  var R = typeof window !== 'undefined' ? window : globalThis;

  function warn(msg) {
    try { console.warn('[ESE] ' + msg); } catch (e) { /* no console */ }
  }

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normSeed(s) {
    if (s == null) return 1;
    var n = Number(s);
    if (isFinite(n)) return Math.abs(Math.floor(n)) >>> 0;
    var h = 2166136261;
    var str = String(s);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---- parts ---- */
  /* ESE_CORE is normally assembled by engines-core.js from ESE_CORE_A and
     ESE_CORE_B. If that step did not run, assemble it here from whatever
     part loaded; each missing part logs a warning. */
  function assembleCore() {
    var A = R.ESE_CORE_A, B = R.ESE_CORE_B;
    if (!A || typeof A !== 'object') warn('ESE_CORE_A (engines-core-a.js) is not loaded.');
    if (!B || typeof B !== 'object') warn('ESE_CORE_B (engines-core.js) is not loaded.');
    A = (A && typeof A === 'object') ? A : null;
    B = (B && typeof B === 'object') ? B : null;
    if (!A && !B) return null;
    var eng = Object.assign({}, (A && A.engines) || {}, (B && B.engines) || {});
    return { rng: (A && A.rng) || (B && B.rng), engines: eng, engineGames: Object.keys(eng) };
  }
  var core = R.ESE_CORE;
  if (!core || typeof core !== 'object') {
    try { core = assembleCore(); } catch (e) { core = null; }
    if (core) R.ESE_CORE = core;
  }
  var hasCore = !!(core && typeof core === 'object');
  if (!hasCore) { warn('engines-core.js is not loaded; engine games are unavailable.'); core = {}; }
  var engines = (core.engines && typeof core.engines === 'object') ? core.engines : {};
  var engineGames;
  if (Array.isArray(core.engineGames)) {
    engineGames = core.engineGames.filter(function (s) {
      if (engines[s]) return true;
      warn('engineGames lists "' + s + '" but no engine is defined.');
      return false;
    });
  } else {
    engineGames = Object.keys(engines);
  }

  var scripted = {};
  var parts = { core: hasCore, board: false, table: false };
  [['ESE_SCRIPTED_BOARD', 'engines-scripted-board.js', 'board'],
   ['ESE_SCRIPTED_TABLE', 'engines-scripted-table.js', 'table']].forEach(function (p) {
    var map = R[p[0]];
    if (!map || typeof map !== 'object') { warn(p[1] + ' is not loaded; its scripted games are unavailable.'); return; }
    parts[p[2]] = true;
    Object.keys(map).forEach(function (slug) {
      if (typeof map[slug] !== 'function') return;
      if (scripted[slug]) warn('Scripted record for "' + slug + '" is defined twice; keeping the first.');
      else scripted[slug] = map[slug];
    });
  });

  function isEngine(slug) { return !!engines[slug]; }

  function isHidden(slug) {
    var d = R.ESD;
    return !!(d && d.games && d.games[slug] && d.games[slug].hiddenInfo);
  }

  function empty() { return { frames: [], ledger: [], result: null, moves: 0 }; }

  /* Simultaneous games (RPS, PD, auction, Goofspiel): the human seat is always
     to move and the model's reply is computed inside apply(), so the state
     apply() returns is already the revealed frame. simulReply() names the
     model's half of that reveal in player language, for the ledger. */
  var SIMUL = ['rock-paper-scissors', 'prisoners-dilemma', 'first-price-sealed-bid-auction', 'goofspiel'];
  function isSimultaneous(slug) { return SIMUL.indexOf(slug) >= 0 && !!engines[slug]; }
  function simulReply(slug, before, action, after) {
    if (!isSimultaneous(slug)) return null;
    var lm = after && after.lastModel;
    try {
      if (slug === 'first-price-sealed-bid-auction') return lm && typeof lm.bid === 'number' ? 'Seals a bid of ' + lm.bid : null;
      if (slug === 'goofspiel') return lm && lm.pick != null ? 'Bid ' + lm.pick : null;
      if (lm && lm.pick != null) return String(lm.pick);
      var e = engines[slug];
      if (typeof e.modelAction === 'function') {
        var m = e.modelAction(before, action);
        return m && m.action ? (m.action.label || m.action.shortLabel || null) : null;
      }
    } catch (err) { /* fall through */ }
    return null;
  }

  /* Full ai-vs-ai game on a real engine. */
  function playOut(slug, humanSide, seed, maxPlies) {
    var e = engines[slug];
    var out = empty();
    var hidden = isHidden(slug);
    var pick = mulberry32(seed ^ 0x9E3779B9);
    var s = e.start({ humanSide: humanSide, seed: seed });
    out.frames.push(e.view(s));
    for (var ply = 0; ply < maxPlies; ply++) {
      if (e.terminal(s)) break;
      var side = e.toMove(s);
      if (!side) break;
      var a = null;
      try { a = e.ai(s, { seed: (seed + (ply + 1) * 7919) >>> 0 }); } catch (err) { a = null; }
      if (!a) {
        var opts = e.legal(s) || [];
        if (!opts.length) break;
        a = opts[Math.floor(pick() * opts.length)];
      }
      var next = e.apply(s, a);
      if (!next || next === s) break;
      var mine = side === humanSide;
      var why = null;
      if (!mine && !hidden) {
        try { why = e.explain(s, a, next) || null; } catch (err) { why = null; }
      }
      var row = { turn: ply + 1, seat: mine ? 'you' : 'model',
        action: a.label || a.shortLabel || String(a.token), reasoning: why };
      var cell = a.cell || (a.to && typeof a.to === 'object' && 'r' in a.to ? a.to : null);
      if (cell) row.cell = { r: cell.r, c: cell.c };
      out.frames.push(e.view(next));
      row.frame = out.frames.length - 1;
      out.ledger.push(row);
      var reply = simulReply(slug, s, a, next);
      if (reply) {
        // Both picks land in the same revealed frame; one turn number per round.
        out.ledger.push({ turn: row.turn, seat: mine ? 'model' : 'you', action: reply, reasoning: null, frame: row.frame });
      }
      s = next;
    }
    var t = e.terminal(s);
    if (t) {
      out.result = { winner: t.winner, line: t.reason || '', reason: t.reason || '' };
      if (t.line) out.result.winLine = t.line;
      if (t.scores) out.result.scores = t.scores;
    } else {
      out.result = { winner: 'draw', line: 'Stopped after ' + out.ledger.length + ' moves.', reason: 'stopped' };
    }
    out.moves = Math.max(0, out.frames.length - 1);
    return out;
  }

  var previewCache = {};

  function preview(slug, seed) {
    var sd = normSeed(seed);
    var key = slug + '|' + sd;
    if (previewCache[key]) return previewCache[key].slice();
    var frames = [];
    try {
      if (engines[slug]) {
        var rec = playOut(slug, 'p1', sd, 400);
        // The opening of a real game: the start position and up to eleven moves,
        // so a newcomer sees a game beginning, not a crowded end state.
        frames = rec.frames.slice(0, 12);
      } else if (scripted[slug]) {
        var r = scripted[slug]();
        frames = (r && Array.isArray(r.frames)) ? r.frames.slice(0, 12) : [];
      } else {
        warn('No engine or scripted record for "' + slug + '".');
      }
    } catch (err) {
      warn('preview("' + slug + '") failed: ' + (err && err.message));
      frames = [];
    }
    previewCache[key] = frames;
    return frames.slice();
  }

  function recordGame(slug, opts) {
    opts = opts || {};
    var side = opts.humanSide === 'p2' ? 'p2' : 'p1';
    var sd = normSeed(opts.seed);
    try {
      if (engines[slug]) return playOut(slug, side, sd, 600);
      if (scripted[slug]) {
        var r = scripted[slug]() || {};
        var ledger = Array.isArray(r.ledger) ? r.ledger : [];
        return { frames: Array.isArray(r.frames) ? r.frames : [], ledger: ledger,
          result: r.result || null, moves: ledger.length };
      }
      warn('No engine or scripted record for "' + slug + '".');
    } catch (err) {
      warn('recordGame("' + slug + '") failed: ' + (err && err.message));
    }
    return empty();
  }

  R.ESE = {
    engines: engines,
    engineGames: engineGames,
    scripted: scripted,
    preview: preview,
    recordGame: recordGame,
    isEngine: isEngine,
    isSimultaneous: isSimultaneous,
    simulReply: simulReply,
    rng: typeof core.rng === 'function' ? core.rng : mulberry32,
    parts: parts
  };
})();
