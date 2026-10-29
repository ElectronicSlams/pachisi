/* =====================================================================
   eSlams Arena app prototype  |  src/data.js  [A]  |  window.ESD
   ---------------------------------------------------------------------
   Plain script. No modules, no imports. ES2020. ASCII only (non-ASCII
   characters are written as \u escapes). No long dashes anywhere.

   Implements CONTRACT.md section 3 exactly. Everything the UI renders as a
   count (games, arenas, models) is derived from the data below, never typed
   in a screen.

   Contract surface (unchanged):
     categories, arenas, games, gameOrder, roster, rosterTotal, canPlay,
     help, copy, defaultsForNewPlayer, providerHue

   Extras added under this file's own namespace (safe to ignore):
     ESD.counts                  { games, arenas, phoneGames, byCategory, hiddenInfoGames }
     ESD.modelById(id)           roster entry or null
     ESD.arenaById(id)           arena entry or null
     ESD.arenaOf(slug)           arena entry for a game
     ESD.categoryLabel(id)       'Board & Strategy' | ...
     ESD.statusFor(id, slug)     'ready' | 'slower_turns' | 'unavailable'
     ESD.statusLabel(status)     'Ready' | 'Slower turns' | 'Not available for this game'
     ESD.modelsFor(slug)         roster entries that canPlay(slug)
     ESD.hiddenInfoModels()      the four hidden-information capable models
     ESD.helpSections(slug, folded?)  [{title, body}] in the eleven mobile rule sections
                                 (folded = Quick summary, Your turn, First move only)
     ESD.metaLine(slug)          mono meta line: 'Standard \u00b7 Board & Strategy \u00b7 2 seats'
     ESD.ordinal(n)              1 -> '1st'
   Extra fields:
     arena.subtitle              the web tile subtitle ('Standard' | '3 tables \u00b7 Chess / Shogi / Xiangqi')
     arena.defaultGame           first table of the arena
     game.variantLabel           Title Case variant label ('Compact Holdem Fixed Menu No Limit')
     game.difficulty             'easy' | 'medium' | 'hard'
     game.unit                   'chips' | 'points' | 'placement' | null
     model.shortName             'Claude Haiku' (for seat bars, riser, resume card)
     model.modelSlug             id without the provider prefix
     help[slug].quickLines       the three quick-summary lines as an array
     help[slug].tip              the one-line web tip (same text as firstMove)
     help[slug].accessibility    input-mode accessibility line
     help[slug].written          true when the copy is fully written, false for the shorter copy

   Interpretations of the contract (see also the hand-off report):
     - Model ids use the provider slug (a logo file name) as prefix, so
       ESA.providerLogo(model.provider) always resolves.
     - copy.chooseLiveModel holds the app wording 'Choose an opponent' (the web's
       'Choose a live model' is a retired word here); copy.chooseAnOpponent is the same.
     - copy.tapToSwap is the bare phrase 'tap to swap'; copy.seatTapToSwap(seat)
       gives 'Seat 3 \u00b7 tap to swap'.
   ===================================================================== */
(function () {
  'use strict';

  var ROOT = typeof window !== 'undefined' ? window : globalThis;

  /* ------------------------------------------------------------------
     Categories
     ------------------------------------------------------------------ */
  var categories = [
    { id: 'board', label: 'Board & Strategy' },
    { id: 'card', label: 'Card & Hidden-Info' },
    { id: 'social', label: 'Social & Economic' }
  ];

  /* ------------------------------------------------------------------
     Sides: five helper pairs, per brief section 7.3 and the digest
     ------------------------------------------------------------------ */
  var SIDE_SETS = {
    xo: { p1: { name: 'X', helper: 'Move first.' }, p2: { name: 'O', helper: 'The model opens.' } },
    ry: { p1: { name: 'Red', helper: 'Drop first.' }, p2: { name: 'Yellow', helper: 'Model drops first.' } },
    wb: { p1: { name: 'White', helper: 'Move first.' }, p2: { name: 'Black', helper: 'The model opens.' } },
    bw: { p1: { name: 'Black', helper: 'Move first.' }, p2: { name: 'White', helper: 'The model opens.' } },
    fs: { p1: { name: 'First player', helper: 'Move first.' }, p2: { name: 'Second player', helper: 'Model opens.' } },
    ab: { p1: { name: 'Seat A', helper: 'Act first.' }, p2: { name: 'Seat B', helper: 'Model acts first.' } },
    pl: { p1: { name: 'Player A', helper: 'Choose first.' }, p2: { name: 'Player B', helper: 'Model chooses first.' } }
  };
  function sidesFor(key) {
    if (!key) return null;
    var s = SIDE_SETS[key];
    return {
      p1: { name: s.p1.name, helper: s.p1.helper },
      p2: { name: s.p2.name, helper: s.p2.helper }
    };
  }

  var SEATS_4 = ['Seat 1', 'Seat 2', 'Seat 3', 'Seat 4'];
  var SEATS_3 = ['Seat 1', 'Seat 2', 'Seat 3'];
  var COMPASS = ['North', 'East', 'South', 'West'];

  function titleCase(token) {
    return String(token)
      .replace(/^core_/, '')
      .split('_')
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
      .join(' ');
  }

  /* ------------------------------------------------------------------
     Games. One row per game, in brief Appendix A.1 order (flattened).
     [slug, name, arena, tableLabel, variantToken, category, seats, family,
      seatLayout, boardSize, sides, seatNames, scoreType, noDraws, hiddenInfo,
      difficulty]
     Source: game-catalog.ts (slugs, variants, boardSizes, hiddenInfoGames,
     topology, score types) and the digest table 2.2.
     ------------------------------------------------------------------ */
  var B88 = { rows: 8, cols: 8 };
  var GAME_ROWS = [
    ['chess', 'Chess', 'chess', 'Chess', 'standard', 'board', 2, 'square_board', 'two_sides', B88, 'wb', null, 'wld', false, false, 'hard'],
    ['shogi', 'Shogi', 'chess', 'Shogi', 'standard', 'board', 2, 'custom', 'two_sides', { rows: 9, cols: 9 }, 'wb', null, 'wld', false, false, 'hard'],
    ['xiangqi', 'Xiangqi', 'chess', 'Xiangqi', 'standard', 'board', 2, 'custom', 'two_sides', { rows: 10, cols: 9 }, 'wb', null, 'wld', false, false, 'hard'],
    ['go', 'Go', 'go', 'Board 9x9', 'board_9x9', 'board', 2, 'go_board', 'two_sides', { rows: 9, cols: 9 }, 'bw', null, 'wld', false, false, 'hard'],
    ['connect-four', 'Connect Four', 'connect-four', 'Standard', 'standard', 'board', 2, 'connect_four', 'two_sides', { rows: 6, cols: 7 }, 'ry', null, 'wld', false, false, 'easy'],
    ['tic-tac-toe', 'Tic-Tac-Toe', 'tic-tac-toe', 'Standard', 'standard', 'board', 2, 'grid_3x3', 'two_sides', { rows: 3, cols: 3 }, 'xo', null, 'wld', false, false, 'easy'],
    ['ultimate-tic-tac-toe', 'Ultimate Tic-Tac-Toe', 'tic-tac-toe', 'Ultimate', 'standard', 'board', 2, 'grid_3x3', 'two_sides', { rows: 9, cols: 9 }, 'fs', null, 'wld', false, false, 'medium'],
    ['othello', 'Othello', 'othello', 'Standard', 'standard', 'board', 2, 'square_board', 'two_sides', B88, 'wb', null, 'wld', false, false, 'medium'],
    ['checkers', 'Checkers', 'checkers', 'Standard', 'standard', 'board', 2, 'square_board', 'two_sides', B88, 'wb', null, 'wld', false, false, 'medium'],
    ['gomoku', 'Gomoku', 'five-in-a-row', 'Gomoku', 'standard', 'board', 2, 'go_board', 'two_sides', { rows: 15, cols: 15 }, 'bw', null, 'wld', false, false, 'medium'],
    ['pentago', 'Pentago', 'five-in-a-row', 'Pentago', 'standard', 'board', 2, 'custom', 'two_sides', null, 'bw', null, 'wld', false, false, 'medium'],
    ['hex', 'Hex', 'hex', 'Standard', 'standard', 'board', 2, 'hex_board', 'two_sides', null, 'bw', null, 'wld', true, false, 'hard'],
    ['mancala', 'Mancala', 'mancala', 'Standard', 'standard', 'board', 2, 'custom', 'two_sides', null, 'fs', null, 'wld', false, false, 'easy'],
    ['nine-mens-morris', "Nine Men's Morris", 'nine-mens-morris', 'Standard', 'standard', 'board', 2, 'custom', 'two_sides', null, 'bw', null, 'wld', false, false, 'medium'],
    ['battleship', 'Battleship', 'battleship', 'Standard', 'standard', 'board', 2, 'square_board', 'two_sides', null, 'fs', null, 'wld', false, true, 'easy'],
    ['backgammon', 'Backgammon', 'backgammon', 'Standard', 'standard', 'board', 2, 'custom', 'two_sides', null, 'fs', null, 'wld', false, false, 'medium'],

    ['no-limit-texas-holdem', "No-Limit Texas Hold'em", 'poker', "No-Limit Hold'em", 'core_compact_holdem_fixed_menu_no_limit', 'card', 4, 'card_table', 'table_ring', null, null, SEATS_4, 'chips', true, true, 'hard'],
    ['limit-texas-holdem', "Limit Texas Hold'em", 'poker', "Limit Hold'em", 'core_compact_holdem_fixed_menu_limit', 'card', 4, 'card_table', 'table_ring', null, null, SEATS_4, 'chips', true, true, 'hard'],
    ['leduc-holdem', "Leduc Hold'em", 'poker', 'Leduc', 'core_compact_leduc_fixed_menu', 'card', 4, 'card_table', 'table_ring', null, null, SEATS_4, 'chips', true, true, 'medium'],
    ['hearts', 'Hearts', 'trick-takers', 'Hearts', 'core_penalty_tricks', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['spades', 'Spades', 'trick-takers', 'Spades', 'core_trump_tricks', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['euchre', 'Euchre', 'trick-takers', 'Euchre', 'core_call_and_play', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['bridge', 'Bridge', 'trick-takers', 'Bridge', 'core_compact_bridge_play_phase', 'card', 4, 'card_table', 'compass', null, null, COMPASS, 'points', true, true, 'hard'],
    ['crazy-eights', 'Crazy Eights', 'shedding', 'Crazy Eights', 'core_wild_eight_shedding', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'easy'],
    ['shedding-card-game', 'Shedding Card Game', 'shedding', 'Rank & Suit', 'core_rank_suit_shedding', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'easy'],
    ['dou-dizhu', 'Dou Dizhu', 'shedding', 'Dou Dizhu', 'core_landlord_shedding', 'card', 3, 'card_table', 'table_ring', null, null, SEATS_3, 'placement', true, true, 'hard'],
    ['gin-rummy', 'Gin Rummy', 'gin-rummy', 'Compact Gin', 'core_compact_gin', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['mahjong', 'Mahjong', 'mahjong', 'Compact Draw Discard', 'core_compact_draw_discard', 'card', 4, 'card_table', 'table_ring', null, null, SEATS_4, 'placement', true, true, 'hard'],
    ['cribbage', 'Cribbage', 'cribbage', 'Discard Showdown', 'core_discard_showdown', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['hanabi', 'Hanabi', 'hanabi', 'Compact Hanabi', 'core_compact_hanabi', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'hard'],
    ['liars-dice', "Liar's Dice", 'bluff-and-bid', "Liar's Dice", 'core_single_round', 'card', 2, 'dice_table', 'two_sides', null, 'ab', null, 'wld', false, true, 'medium'],
    ['goofspiel', 'Goofspiel', 'bluff-and-bid', 'Goofspiel', 'core_five_card_goofspiel', 'card', 2, 'card_table', 'two_sides', null, 'ab', null, 'points', true, true, 'medium'],

    ['prisoners-dilemma', "Prisoner's Dilemma", 'prisoners-dilemma', 'One Shot Matrix', 'core_one_shot_matrix', 'social', 2, 'payoff_matrix', 'two_sides', null, 'pl', null, 'wld', false, true, 'easy'],
    ['bargaining', 'Bargaining', 'negotiation', 'Bilateral Split', 'core_bilateral_split', 'social', 2, 'economic_panel', 'two_sides', null, 'pl', null, 'points', false, true, 'medium'],
    ['negotiation', 'Negotiation', 'negotiation', 'Price & Delivery', 'core_price_delivery_grid', 'social', 2, 'economic_panel', 'two_sides', null, 'pl', null, 'points', false, true, 'hard'],
    ['first-price-sealed-bid-auction', 'First-Price Sealed-Bid Auction', 'sealed-bid-auction', 'Two Bidder Private Values', 'core_two_bidder_private_values', 'social', 2, 'auction_panel', 'two_sides', null, 'pl', null, 'points', true, true, 'medium'],
    ['rock-paper-scissors', 'Rock Paper Scissors', 'rock-paper-scissors', 'One Shot Hidden Commit', 'core_one_shot_hidden_commit', 'social', 2, 'payoff_matrix', 'two_sides', null, 'pl', null, 'wld', false, true, 'easy']
  ];

  /* The ten engine games (CONTRACT section 4 engineGames). Everything else is scripted. */
  var ENGINE_GAMES = [
    'tic-tac-toe', 'connect-four', 'othello', 'gomoku', 'hex', 'ultimate-tic-tac-toe',
    'rock-paper-scissors', 'prisoners-dilemma', 'first-price-sealed-bid-auction', 'goofspiel'
  ];
  /* The thirteen main_arena games, in the brief's marquee order (gameOrder head). */
  var MARQUEE_GAMES = [
    'tic-tac-toe', 'connect-four', 'othello', 'chess', 'go', 'gomoku', 'hex',
    'ultimate-tic-tac-toe', 'battleship', 'goofspiel', 'rock-paper-scissors',
    'prisoners-dilemma', 'first-price-sealed-bid-auction'
  ];
  /* The two tables the mobile capability manifest drops (brief decision 8). */
  var MOBILE_EXCLUDED = ['leduc-holdem', 'shedding-card-game'];

  var games = {};
  var flatOrder = [];
  GAME_ROWS.forEach(function (r) {
    var slug = r[0];
    var unit = r[12] === 'chips' ? 'chips' : (r[12] === 'placement' ? 'placement' : (r[12] === 'points' ? 'points' : null));
    games[slug] = {
      slug: slug,
      name: r[1],
      arena: r[2],
      tableLabel: r[3],
      variantToken: r[4],
      category: r[5],
      seats: r[6],
      family: r[7],
      seatLayout: r[8],
      boardSize: r[9] ? { rows: r[9].rows, cols: r[9].cols } : null,
      hiddenInfo: r[14],
      sides: sidesFor(r[10]),
      seatNames: r[11] ? r[11].slice() : null,
      scoreType: r[12],
      noDraws: r[13],
      play: ENGINE_GAMES.indexOf(slug) >= 0 ? 'engine' : 'scripted',
      mobileExcluded: MOBILE_EXCLUDED.indexOf(slug) >= 0,
      /* extras */
      variantLabel: titleCase(r[4]),
      difficulty: r[15],
      unit: unit
    };
    flatOrder.push(slug);
  });

  /* ------------------------------------------------------------------
     Arenas. 24, in brief Appendix A.1 grouping. Glyphs are the ESA g_* set.
     [id, name, category, glyph, games[]]
     ------------------------------------------------------------------ */
  var ARENA_ROWS = [
    ['chess', 'Chess', 'board', 'g_chess', ['chess', 'shogi', 'xiangqi']],
    ['go', 'Go', 'board', 'g_go', ['go']],
    ['connect-four', 'Connect Four', 'board', 'g_c4', ['connect-four']],
    ['tic-tac-toe', 'Tic-Tac-Toe', 'board', 'g_ttt', ['tic-tac-toe', 'ultimate-tic-tac-toe']],
    ['othello', 'Othello', 'board', 'g_board', ['othello']],
    ['checkers', 'Checkers', 'board', 'g_board', ['checkers']],
    ['five-in-a-row', 'Five in a Row', 'board', 'g_go', ['gomoku', 'pentago']],
    ['hex', 'Hex', 'board', 'g_hex', ['hex']],
    ['mancala', 'Mancala', 'board', 'g_board', ['mancala']],
    ['nine-mens-morris', "Nine Men's Morris", 'board', 'g_board', ['nine-mens-morris']],
    ['battleship', 'Battleship', 'board', 'g_board', ['battleship']],
    ['backgammon', 'Backgammon', 'board', 'g_dice', ['backgammon']],
    ['poker', 'Poker', 'card', 'g_poker', ['no-limit-texas-holdem', 'limit-texas-holdem', 'leduc-holdem']],
    ['trick-takers', 'Trick Takers', 'card', 'g_card', ['hearts', 'spades', 'euchre', 'bridge']],
    ['shedding', 'Shedding', 'card', 'g_card', ['crazy-eights', 'shedding-card-game', 'dou-dizhu']],
    ['gin-rummy', 'Gin Rummy', 'card', 'g_card', ['gin-rummy']],
    ['mahjong', 'Mahjong', 'card', 'g_card', ['mahjong']],
    ['cribbage', 'Cribbage', 'card', 'g_card', ['cribbage']],
    ['hanabi', 'Hanabi', 'card', 'g_card', ['hanabi']],
    ['bluff-and-bid', 'Bluff & Bid', 'card', 'g_dice', ['liars-dice', 'goofspiel']],
    ['prisoners-dilemma', "Prisoner's Dilemma", 'social', 'g_social', ['prisoners-dilemma']],
    ['negotiation', 'Negotiation', 'social', 'g_social', ['bargaining', 'negotiation']],
    ['sealed-bid-auction', 'Sealed-Bid Auction', 'social', 'g_social', ['first-price-sealed-bid-auction']],
    ['rock-paper-scissors', 'Rock Paper Scissors', 'social', 'g_social', ['rock-paper-scissors']]
  ];
  /* Marquee arenas first, in the brief 7.2 order (the arenas holding the 13 main_arena games),
     then the rest in Appendix A.1 order. */
  var MARQUEE_ARENA_ORDER = [
    'tic-tac-toe', 'connect-four', 'othello', 'chess', 'go', 'five-in-a-row', 'hex',
    'battleship', 'bluff-and-bid', 'rock-paper-scissors', 'prisoners-dilemma', 'sealed-bid-auction'
  ];

  function isMarqueeArena(row) {
    return row[4].some(function (s) { return MARQUEE_GAMES.indexOf(s) >= 0; });
  }
  function arenaSubtitle(row) {
    var list = row[4];
    if (list.length === 1) return games[list[0]].tableLabel;
    return list.length + ' tables \u00b7 ' + list.map(function (s) { return games[s].tableLabel; }).join(' / ');
  }

  var arenaById = {};
  var arenas = [];
  ARENA_ROWS.forEach(function (row) {
    var a = {
      id: row[0],
      name: row[1],
      category: row[2],
      glyph: row[3],
      games: row[4].slice(),
      marquee: isMarqueeArena(row),
      /* extras */
      subtitle: arenaSubtitle(row),
      defaultGame: row[4][0]
    };
    arenaById[a.id] = a;
  });
  MARQUEE_ARENA_ORDER.forEach(function (id) { arenas.push(arenaById[id]); });
  ARENA_ROWS.forEach(function (row) {
    if (MARQUEE_ARENA_ORDER.indexOf(row[0]) < 0) arenas.push(arenaById[row[0]]);
  });

  /* gameOrder: 13 marquee first, then the rest in Appendix A.1 order. */
  var gameOrder = MARQUEE_GAMES.slice();
  flatOrder.forEach(function (s) { if (gameOrder.indexOf(s) < 0) gameOrder.push(s); });

  /* ------------------------------------------------------------------
     Roster. About forty models, ordered so no provider appears twice in a
     row and no provider clusters. Provider slugs are logo file names in
     assets/01-brand/provider-logos/.
     [provider, providerName, modelSlug, publicName, shortName, family,
      medianTurnMs, hiddenInfoCapable, recommended]
     turnSpeed is derived: 'slower_turns' when medianTurnMs > 7000.
     Exactly four models are hiddenInfoCapable (brief Appendix A.2).
     ------------------------------------------------------------------ */
  var ROSTER_ROWS = [
    ['anthropic', 'Anthropic', 'claude-haiku-4.5', 'Claude Haiku 4.5', 'Claude Haiku', 'claude', 4200, true, true],
    ['openai', 'OpenAI', 'gpt-4.1-mini', 'GPT-4.1 mini', 'GPT-4.1 mini', 'gpt', 3100, true, true],
    ['google', 'Google', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 'Gemini Flash', 'gemini', 2600, true, true],
    ['xai', 'xAI', 'grok-4.20', 'Grok 4.20', 'Grok 4.20', 'grok', 5300, true, true],
    ['deepseek', 'DeepSeek', 'deepseek-v4-pro', 'DeepSeek V4 Pro', 'DeepSeek V4 Pro', 'deepseek', 5900, false, true],
    ['meta', 'Meta', 'llama-4-maverick', 'Llama 4 Maverick', 'Llama 4 Maverick', 'llama', 2900, false, false],
    ['mistral-ai', 'Mistral AI', 'mistral-small-2603', 'Mistral Small 2603', 'Mistral Small', 'mistral', 2400, false, false],
    ['qwen', 'Qwen', 'qwen3-next-80b-a3b-thinking', 'Qwen3 Next 80B A3B Thinking', 'Qwen3 Next Thinking', 'qwen', 11800, false, false],
    ['amazon-aws', 'Amazon', 'nova-pro-v1', 'Nova Pro 1.0', 'Nova Pro', 'nova', 3400, false, true],
    ['moonshot-ai', 'Moonshot AI', 'kimi-k2-thinking', 'Kimi K2 Thinking', 'Kimi K2 Thinking', 'kimi', 13400, false, false],
    ['openai', 'OpenAI', 'gpt-5-mini', 'GPT-5 mini', 'GPT-5 mini', 'gpt', 4800, false, false],
    ['cohere', 'Cohere', 'command-a', 'Command A', 'Command A', 'command', 3600, false, false],
    ['anthropic', 'Anthropic', 'claude-sonnet-4.5', 'Claude Sonnet 4.5', 'Claude Sonnet', 'claude', 6100, false, false],
    ['zhipu', 'Zhipu AI', 'glm-5-turbo', 'GLM 5 Turbo', 'GLM 5 Turbo', 'glm', 3300, false, false],
    ['nvidia', 'NVIDIA', 'nemotron-3-ultra-550b-a55b', 'Nemotron 3 Ultra 550B A55B', 'Nemotron 3 Ultra', 'nemotron', 9700, false, false],
    ['google', 'Google', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 'Gemini Pro', 'gemini', 8900, false, false],
    ['perplexity', 'Perplexity', 'sonar-reasoning-pro', 'Sonar Reasoning Pro', 'Sonar Reasoning Pro', 'sonar', 10600, false, false],
    ['microsoft', 'Microsoft', 'phi-4', 'Phi-4', 'Phi-4', 'phi', 2200, false, false],
    ['deepseek', 'DeepSeek', 'deepseek-r1', 'DeepSeek R1', 'DeepSeek R1', 'deepseek', 12300, false, false],
    ['bytedance', 'ByteDance', 'seed-2.0-mini', 'Seed 2.0 Mini', 'Seed 2.0 Mini', 'seed', 2700, false, false],
    ['upstage', 'Upstage', 'solar-pro-3', 'Solar Pro 3', 'Solar Pro 3', 'solar', 3900, false, false],
    ['openai', 'OpenAI', 'gpt-5', 'GPT-5', 'GPT-5', 'gpt', 8200, false, false],
    ['stepfun', 'StepFun', 'step-3.7-flash', 'Step 3.7 Flash', 'Step 3.7 Flash', 'step', 2500, false, false],
    ['meta', 'Meta', 'llama-3.2-3b-instruct', 'Llama 3.2 3B Instruct', 'Llama 3.2 3B', 'llama', 1800, false, false],
    ['reka-ai', 'Reka AI', 'reka-flash-3', 'Reka Flash 3', 'Reka Flash 3', 'reka', 3000, false, false],
    ['xai', 'xAI', 'grok-4-fast', 'Grok 4 Fast', 'Grok 4 Fast', 'grok', 3800, false, false],
    ['minimax', 'MiniMax', 'minimax-m2', 'MiniMax M2', 'MiniMax M2', 'minimax', 4700, false, false],
    ['ai21-labs', 'AI21 Labs', 'jamba-large-1.7', 'Jamba Large 1.7', 'Jamba Large', 'jamba', 4400, false, false],
    ['qwen', 'Qwen', 'qwen3-235b-a22b', 'Qwen3 235B A22B', 'Qwen3 235B', 'qwen', 6300, false, false],
    ['anthropic', 'Anthropic', 'claude-opus-4.1', 'Claude Opus 4.1', 'Claude Opus', 'claude', 9400, false, false],
    ['ai2', 'Ai2', 'olmo-3-32b-think', 'Olmo 3 32B Think', 'Olmo 3 Think', 'olmo', 10100, false, false],
    ['mistral-ai', 'Mistral AI', 'mistral-medium-3.1', 'Mistral Medium 3.1', 'Mistral Medium', 'mistral', 3700, false, false],
    ['nous-research', 'Nous Research', 'hermes-3-llama-3.1-70b', 'Hermes 3 Llama 3.1 70B', 'Hermes 3 70B', 'hermes', 4600, false, false],
    ['openai', 'OpenAI', 'o4-mini', 'o4-mini', 'o4-mini', 'gpt', 7600, false, false],
    ['tencent', 'Tencent', 'hunyuan-a13b-instruct', 'Hunyuan A13B Instruct', 'Hunyuan A13B', 'hunyuan', 3200, false, false],
    ['google', 'Google', 'gemma-3-27b-it', 'Gemma 3 27B', 'Gemma 3 27B', 'gemma', 3500, false, false],
    ['ibm-granite', 'IBM', 'granite-4.0-h-small', 'Granite 4.0 H Small', 'Granite 4.0 Small', 'granite', 2800, false, false],
    ['baidu', 'Baidu', 'ernie-4.5-300b-a47b', 'ERNIE 4.5 300B A47B', 'ERNIE 4.5', 'ernie', 5200, false, false],
    ['openai', 'OpenAI', 'gpt-4.1', 'GPT-4.1', 'GPT-4.1', 'gpt', 4100, false, false],
    ['xiaomi', 'Xiaomi', 'mimo-v2-flash', 'MiMo V2 Flash', 'MiMo V2 Flash', 'mimo', 2300, false, false],
    ['writer', 'Writer', 'palmyra-x5', 'Palmyra X5', 'Palmyra X5', 'palmyra', 5000, false, false]
  ];

  var roster = ROSTER_ROWS.map(function (r) {
    return {
      id: r[0] + '/' + r[2],
      publicName: r[3],
      provider: r[0],
      providerName: r[1],
      family: r[5],
      turnSpeed: r[6] > 7000 ? 'slower_turns' : 'ready',
      hiddenInfoCapable: r[7],
      recommended: r[8],
      medianTurnMs: r[6],
      /* extras */
      shortName: r[4],
      modelSlug: r[2]
    };
  });
  var rosterById = {};
  roster.forEach(function (m) { rosterById[m.id] = m; });

  /* ------------------------------------------------------------------
     How to play. All 37 slugs.
     Written copy (18 games, the contract list): short, dry, player language,
     checked against the mobile rule content (apps/mobile/src/arena/
     mobile-game-rule-content.ts) and recommendations-for-arena.md.
     Short copy (the other 19): still specific to the game, drawn from the same
     mobile rule content, trimmed. Leduc and Rank & Suit have no mobile rule
     content (both are mobile-excluded), so theirs is written from the game
     families and kept deliberately general.
     Connect Four uses the exact live strings from brief Appendix D.
     Field map to the eleven mobile sections:
       quick -> Quick summary        objective -> Objective     fullRules -> Full rules
       yourTurn -> Your turn         example -> Turn example    legalActions -> Legal actions
       scoring -> Scoring            winRule -> Win, draw, or placement
       hiddenInfo -> Hidden information   firstMove -> First move   accessibility -> Accessibility
     ------------------------------------------------------------------ */
  function H(written, o) {
    return {
      quick: o.q.join(' '),
      quickLines: o.q.slice(),
      objective: o.obj,
      yourTurn: o.turn,
      legalActions: o.legal,
      hiddenInfo: o.hidden,
      scoring: o.scoring,
      winRule: o.win,
      firstMove: o.first,
      tip: o.first,
      fullRules: o.rules.slice(),
      example: o.example,
      accessibility: '',
      written: written
    };
  }

  var help = {};

  /* ===================== WRITTEN: the 18 contract games ===================== */

  help['tic-tac-toe'] = H(true, {
    q: ['Take turns putting one mark in an empty cell of a 3 by 3 grid.', 'Three of your marks in a line wins.', 'A full grid with no line is a draw.'],
    obj: 'Get three of your marks in a row, column or diagonal before the model does.',
    turn: 'Tap one empty cell. Your mark lands, then the model answers.',
    legal: 'Any empty cell. Taken cells stay disabled.',
    hidden: 'Nothing is hidden. Every mark is on the board.',
    scoring: 'No points. The first line of three decides it.',
    win: 'A line of three wins. If all nine cells fill without one, it is a draw.',
    first: 'The centre and the corners sit on the most lines.',
    rules: [
      'The grid is 3 by 3. X moves first and the two sides alternate.',
      'Each turn puts one mark in one empty cell. Marks never move and are never removed.',
      'Three matching marks across, down or diagonally ends the game at once.',
      'If all nine cells fill with no line, it is a draw.'
    ],
    example: 'You take the centre. Four corners and four edges are still open, and the model moves next.'
  });

  help['connect-four'] = H(true, {
    q: ['Drop a disc into a column. It falls to the lowest empty slot.', 'Line up four of your discs in any direction.', 'A full board with no four is a draw.'],
    obj: 'Connect four discs in a row before the opponent does.',
    turn: 'Players alternate dropping one disc into a non-full column.',
    legal: 'Choose a column where a disc can fall.',
    hidden: 'All essential state is visible while you choose legal actions.',
    scoring: 'No points. The first four in a row decides it.',
    win: 'Four in a row wins. If every slot fills without one, it is a draw.',
    first: 'Center columns usually create more threats.',
    rules: [
      'The board is 7 columns by 6 rows. Red drops first and the two sides alternate.',
      'You choose a column, not a cell. The disc falls to the lowest empty slot in that column.',
      'Four of your discs in a straight line wins, across, down or diagonally. Longer lines count too.',
      'Full columns cannot be chosen. If the board fills with no four, it is a draw.'
    ],
    example: 'You pick column 4. The disc lands on top of the stack there and completes a diagonal of four.'
  });

  help['othello'] = H(true, {
    q: ['Place a disc so it traps a line of the other side\'s discs.', 'Every trapped line flips to your colour.', 'Most discs when play stops wins.'],
    obj: 'Finish with more discs showing your colour than the model.',
    turn: 'Tap a highlighted square. Every opposing line you trap between that disc and one of yours flips.',
    legal: 'Only empty squares that flip at least one disc. With none, you pass automatically.',
    hidden: 'Nothing is hidden. The board and every flip are public.',
    scoring: 'Count the discs at the end. There are no other points.',
    win: 'More discs wins, fewer loses, equal is a draw.',
    first: 'Corners cannot be flipped. Try not to hand the model one.',
    rules: [
      'The board is 8 by 8 and starts with four discs in the middle.',
      'A legal move traps one or more continuous opposing discs between the new disc and another of yours, along a row, column or diagonal. All trapped discs flip.',
      'If you have no legal move, you pass. The game ends when the board is full or neither side can move.',
      'Count the discs. The higher count wins.'
    ],
    example: 'Two opposing discs sit in a row with one of yours just past them. You place at the other end and both flip to your colour.'
  });

  help['chess'] = H(true, {
    q: ['Move one piece per turn. Capture by landing on an enemy piece.', 'Never leave your own king in check.', 'Checkmate wins.'],
    obj: 'Checkmate the model\'s king: attack it so it has no legal way out.',
    turn: 'Tap a piece to see its legal squares, then tap one. Castling and promotion appear as extra choices when they are legal.',
    legal: 'Only moves that keep your king safe. A move that would expose it is never offered.',
    hidden: 'Nothing is hidden. Both sides see the whole board and the move list.',
    scoring: 'No points. Captured material helps, but only checkmate or a draw ends the game.',
    win: 'Checkmate wins. Stalemate, a repeated position or too little material left to mate is a draw.',
    first: 'Open with a centre pawn or a knight, and get your king safe early.',
    rules: [
      'White moves first, then the sides alternate. Rooks run along lines, bishops along diagonals, queens do both, knights jump in an L, kings step one square, pawns advance and capture diagonally.',
      'A move cannot leave your own king in check. If your king is attacked, you have to answer it.',
      'Castling, en passant and promotion are available when their usual conditions hold.',
      'Checkmate wins. Stalemate, repetition or insufficient material is a draw.'
    ],
    example: 'White plays the knight from g1 to f3. It now covers e5 and g5, and Black moves next.'
  });

  help['go'] = H(true, {
    q: ['Place stones on a 9 by 9 board and surround space.', 'A group with no liberties is captured.', 'More controlled area wins.'],
    obj: 'Control more of the board than the model once play stops.',
    turn: 'Tap an empty intersection to place a stone, or pass.',
    legal: 'Any empty point that is not suicide and does not repeat the previous position (ko). Pass is always there when you want it.',
    hidden: 'Nothing is hidden. Stones, captures and passes are all public.',
    scoring: 'Area scoring: your stones plus the empty points only you surround. Any komi the match uses is applied and shown.',
    win: 'The higher total wins. Equal totals are a draw only if the scoring settings allow one.',
    first: 'Start near the corners and sides, then connect your stones before they get cut.',
    rules: [
      'Black moves first. Players alternate placing one stone on an empty intersection. Stones do not move once placed.',
      'Stones that touch along a line form a group. The empty points next to a group are its liberties.',
      'When a group has no liberties it is captured and removed. You cannot play a move that recreates the previous position (ko).',
      'Either side can pass. Two passes in a row end the game, dead stones are cleared and the area is counted.'
    ],
    example: 'Black fills the last liberty of a white group. The stones come off the board and White moves next.'
  });

  help['gomoku'] = H(true, {
    q: ['Place one stone per turn on a 15 by 15 board.', 'Five in an unbroken line wins.', 'Stones never move and are never captured.'],
    obj: 'Make an unbroken line of five stones before the model does.',
    turn: 'Tap an intersection. A ghost stone shows where it will land; confirm to place it.',
    legal: 'Any empty intersection.',
    hidden: 'Nothing is hidden. Every stone is on the board.',
    scoring: 'No points. The first line of five decides it.',
    win: 'Five or more in a line wins. A full board with no line is a draw.',
    first: 'Build near the centre and aim for two lines at once, so one block cannot stop both.',
    rules: [
      'Black moves first. Players alternate placing one stone on an empty intersection of a 15 by 15 board.',
      'Stones are never moved or captured.',
      'The first player to complete a line of five or more, across, down or diagonally, wins.',
      'If the board fills with no line, it is a draw.'
    ],
    example: 'You add a stone at the end of four in a row. That makes five, and the game ends.'
  });

  help['hex'] = H(true, {
    q: ['Place one stone per turn on a board of hexagons.', 'Join your two sides with an unbroken chain.', 'Someone always connects, so there are no draws.'],
    obj: 'Link your two sides of the board with a connected chain of your stones.',
    turn: 'Tap any empty hexagon to place a stone.',
    legal: 'Any empty hexagon.',
    hidden: 'Nothing is hidden. The whole board is public.',
    scoring: 'No points. The first complete chain wins.',
    win: 'Complete your chain to win. Hex cannot end in a draw: once the board is full, exactly one side has connected.',
    first: 'Build bridges. Two stones with a double gap between them are hard to cut.',
    rules: [
      'Black moves first. Players alternate placing one stone on any empty hexagon. Stones never move.',
      'Each hexagon touches six neighbours. Neighbouring stones of the same colour are connected.',
      'Each side owns a pair of opposite edges, tinted on the board. You win by joining yours.',
      'A route blocked for one side is a route open for the other, so every game has a winner.'
    ],
    example: 'You fill the one gap between two of your chains. The chain now touches both of your sides.'
  });

  help['ultimate-tic-tac-toe'] = H(true, {
    q: ['Nine small Tic-Tac-Toe boards make one big board.', 'The cell you pick sends the model to the matching small board.', 'Win three small boards in a line.'],
    obj: 'Win three small boards in a row on the big board.',
    turn: 'Tap an empty cell in the board you have been sent to. Its position decides where the model plays next.',
    legal: 'Empty cells in the required small board. If that board is already decided, any open board is fair game.',
    hidden: 'Nothing is hidden. The board you must play in is highlighted.',
    scoring: 'Each small board you win counts as a mark on the big board. There are no other points.',
    win: 'Three won boards in a line wins. A small board that ends in a draw counts for neither side. If no line is still possible, it is a draw.',
    first: 'Check where your move sends the model before you check what it builds for you.',
    rules: [
      'The big board is 3 by 3, and each square holds a small 3 by 3 board.',
      'The position of your cell inside its small board picks the small board the opponent must play in. Top right sends them to the top right board.',
      'Three in a row inside a small board claims it. A full small board with no line closes as a draw.',
      'If you are sent to a closed board, you may play in any open one.',
      'Three claimed boards in a line wins the game.'
    ],
    example: 'You play the top right cell of the centre board. The model has to play next in the top right board.'
  });

  help['battleship'] = H(true, {
    q: ['Fire at one coordinate on the model\'s hidden grid each turn.', 'Each shot comes back as miss, hit or sunk.', 'Sink every enemy ship first.'],
    obj: 'Sink every one of the model\'s ships before it sinks yours.',
    turn: 'Tap one cell on the enemy grid you have not fired at. The result shows at once.',
    legal: 'Any cell you have not fired on. Your own fleet and your earlier shots are drawn separately.',
    hidden: 'Enemy ship positions stay hidden until you hit them. You can always see your own fleet and every shot result.',
    scoring: 'No points. Sinking the whole fleet decides it.',
    win: 'The side that sinks the other fleet first wins. There are no draws.',
    first: 'After a hit, probe the neighbouring cells. After misses, spread your shots out.',
    rules: [
      'Both fleets are placed before the first shot. Ships sit in straight lines on the grid and cannot overlap.',
      'Players alternate firing at one coordinate they have not tried. The answer is miss, hit or sunk.',
      'A ship sinks once every cell it covers has been hit.',
      'The first side to sink the whole opposing fleet wins.'
    ],
    example: 'You fire at B4 and it is a hit. Next turn you try B3 and B5 to find which way the ship runs.'
  });

  help['goofspiel'] = H(true, {
    q: ['A prize card is turned up each round.', 'Both sides secretly play one bid card from their own hand.', 'The higher bid takes the prize. Most prize value wins.'],
    obj: 'Finish with more prize value than the model across five rounds.',
    turn: 'Look at the prize, then tap one of your unused bid cards to seal it. Both bids reveal together.',
    legal: 'Any bid card still in your hand. A played card is gone for good.',
    hidden: 'The current prize and the cards already used are public. Each bid stays sealed until both are in.',
    scoring: 'Your score is the total value of the prizes you win.',
    win: 'The higher total wins. Level totals go to whoever took the last prize that was won, so Goofspiel cannot end in a draw.',
    first: 'Spend high cards where the prize is worth it, and keep track of which of the model\'s cards are gone.',
    rules: [
      'Each side holds the same five numbered bid cards. Five prize cards wait in a deck.',
      'Each round one prize is revealed. Both sides pick one unused bid card in secret.',
      'The bids flip together. The higher bid wins the prize, and both bid cards are used up.',
      'If the bids tie, the prize is discarded. Neither side scores it, and both bid cards are still used up.',
      'After five rounds, the higher prize total wins. Level totals go to whoever took the last prize that was won; if every prize was discarded, the model takes the match.'
    ],
    example: 'The prize is 4. You seal 3 and the model seals 2. You take 4 points and both cards are used up.'
  });

  help['rock-paper-scissors'] = H(true, {
    q: ['Pick Rock, Paper or Scissors in secret.', 'Both picks reveal on the same frame.', 'Rock beats Scissors, Scissors beats Paper, Paper beats Rock.'],
    obj: 'Pick the hand that beats the model\'s hidden pick.',
    turn: 'Tap one of the three chips. Your pick is sealed until the model\'s is in.',
    legal: 'Rock, Paper or Scissors. A sealed pick cannot be changed.',
    hidden: 'Both picks stay hidden until both are sealed, then they reveal together.',
    scoring: 'No points. One pick each, one result.',
    win: 'The beating hand wins. Matching hands are a draw.',
    first: 'There is no safe hand. Mix it up.',
    rules: [
      'This is a single round. Each side picks Rock, Paper or Scissors without seeing the other.',
      'The picks reveal together once both are sealed.',
      'Rock beats Scissors, Scissors beats Paper, Paper beats Rock.',
      'The same hand on both sides is a draw.'
    ],
    example: 'You seal Paper and the model seals Rock. They reveal together and Paper covers Rock.'
  });

  help['prisoners-dilemma'] = H(true, {
    q: ['Pick Cooperate or Defect in secret.', 'Both picks reveal together.', 'The payoff matrix scores the pair.'],
    obj: 'Take the biggest payoff you can, given what you expect the model to pick.',
    turn: 'Tap Cooperate or Defect to seal your pick. Nothing reveals until both are in.',
    legal: 'Cooperate or Defect. A sealed pick cannot be changed.',
    hidden: 'Each pick stays hidden until both are sealed.',
    scoring: 'Find the cell where your pick meets the model\'s. Each side gets the payoff shown in that cell.',
    win: 'The higher payoff wins. Equal payoffs are a draw.',
    first: 'Read the matrix on screen before you pick. Compare what each choice risks and what it earns.',
    rules: [
      'This is a one-shot game: one pick each, no second round.',
      'Both sides seal Cooperate or Defect without seeing the other\'s pick.',
      'The picks reveal together. The matrix gives each side a payoff for that pair: both cooperate, one defects, or both defect.',
      'With no later round, there is no chance to punish or forgive.'
    ],
    example: 'You cooperate and the model defects. The matrix gives the model the larger payoff and you the smaller one.'
  });

  help['first-price-sealed-bid-auction'] = H(true, {
    q: ['You get a private value for the item.', 'Seal one bid without seeing the model\'s.', 'The highest bid wins and pays its own bid.'],
    obj: 'Win the item for less than it is worth to you.',
    turn: 'Set a bid with the slider or stepper, then Seal bid. There is no taking it back.',
    legal: 'Any whole bid inside the range on screen, in the step shown.',
    hidden: 'Your value and your bid are private. The model\'s value and bid stay hidden until the reveal.',
    scoring: 'If you win, your payoff is your value minus your bid. If you lose, it is zero.',
    win: 'The higher payoff wins the match, and the tie rule on the panel settles equal bids. There are no draws.',
    first: 'Bidding your full value wins but earns nothing. Shade it down.',
    rules: [
      'Each bidder gets a private value for the item.',
      'Both seal one bid inside the allowed range. Bids reveal together.',
      'The highest bid wins the item and pays that bid, not the other one.',
      'A winner earns value minus bid. A loser earns zero.',
      'Equal bids are settled by the tie rule shown on the panel.'
    ],
    example: 'Your value is 10 and you bid 7. The model bids 6. You win, pay 7, and earn 3.'
  });

  help['no-limit-texas-holdem'] = H(true, {
    q: ['Two private cards each, five shared cards on the table.', 'Bet, call, raise or fold across four betting rounds.', 'Best five-card hand at showdown, or the last seat standing, takes the pot.'],
    obj: 'Win chips with the best five-card hand, or by making everyone else fold.',
    turn: 'When it is your seat\'s turn, fold, check, call, bet or raise. Set an amount when you bet or raise.',
    legal: 'Only the actions that are valid right now. Bet and raise sizes come from the range shown on your turn, and all-in uses your remaining chips.',
    hidden: 'Your two cards are private until showdown. Other seats\' cards stay face down. Community cards, bets and stacks are public.',
    scoring: 'Chips are only the scoring unit. The pot goes to the best hand at showdown, split on exact ties.',
    win: 'The result shows chips won or lost for every seat at the table.',
    first: 'Before you act, check what it costs to continue and where you sit, not just your cards.',
    rules: [
      'Every seat gets two private cards. Five community cards follow: three (the flop), then one (the turn), then one (the river).',
      'There is a betting round before the flop and after each deal.',
      'On your turn you can fold, check when nothing is owed, call the current bet, or bet or raise. You can also go all-in with your remaining chips.',
      'At showdown each seat still in makes its best five-card hand from its two cards and the five on the table. The highest hand wins the pot.',
      'If everyone else folds, the last seat standing wins without showing cards.'
    ],
    example: 'The bet is 20 and you have 85 chips. You can fold, call 20, or raise to one of the sizes offered.'
  });

  help['liars-dice'] = H(true, {
    q: ['Each side rolls dice under a cup and sees only its own.', 'Bid how many dice show a face across the table, or challenge.', 'The reveal settles it.'],
    obj: 'Make a bid that holds up, or catch the model making one that does not.',
    turn: 'Set a count and a face with the stepper and tap Bid, or tap Call to challenge the model\'s bid.',
    legal: 'Any bid that outranks the current one, or Call once a bid exists. The stepper will not let you pick a weaker bid.',
    hidden: 'Your dice are private. The model\'s stay under its cup until a Call. Bids and dice counts are public.',
    scoring: 'No points. This match is one round of bidding.',
    win: 'If the final bid is true, the bidder wins. If it is false, the caller wins.',
    first: 'Count your own dice, then estimate how many of the face the unseen dice might add.',
    rules: [
      'Each side rolls its dice in secret and can only look at its own.',
      'A bid claims a number of dice showing a face, counted across both cups. For example, three fours.',
      'Each bid must outrank the one before it. The stepper only offers bids that do.',
      'Instead of bidding, you can Call. Every die is revealed and the last bid is checked, using the variant\'s rule for ones.',
      'This match is a single round. Whoever is right wins.'
    ],
    example: 'The model bids three fours. You hold no fours and do not buy it, so you Call. Every die is revealed and the bid is checked.'
  });

  help['gin-rummy'] = H(true, {
    q: ['Draw a card, then discard a card.', 'Group your cards into sets and runs.', 'Knock with low leftover points to win the hand.'],
    obj: 'End the hand with less deadwood than the model, meaning fewer points in cards outside your melds.',
    turn: 'Draw from the deck or take the top discard, then discard one card. Knock when you are allowed to end the hand.',
    legal: 'Draw from the stock or the discard pile, then discard one card. Knock and Gin only appear when your hand qualifies.',
    hidden: 'Your hand is private. The discard pile, the deck count and any melds laid down are public.',
    scoring: 'After a knock, the gap between the two deadwood totals is the score, plus any gin or undercut bonus.',
    win: 'Lower deadwood takes the hand. The result shows the points awarded.',
    first: 'Discard high cards that fit nothing, and prefer draws that help two melds at once.',
    rules: [
      'A meld is a set of three or four cards of one rank, or a run of three or more consecutive cards in one suit. Cards outside melds are deadwood.',
      'Each turn: draw one card, then discard one.',
      'Knock when your deadwood is within the limit for this compact variant. Gin means every card is in a meld.',
      'After a knock, the other side can lay off cards onto your melds if the variant allows it, then both hands are counted.'
    ],
    example: 'You draw the seven of hearts to finish a five-six-seven run, discard a stray king, and knock.'
  });

  help['bargaining'] = H(true, {
    q: ['Split a fixed pool between two sides.', 'Make an offer, or accept, reject or counter.', 'A deal pays the agreed split.'],
    obj: 'Settle on a split that gives you as much of the pool as the model will accept.',
    turn: 'To propose, set your share with the slider and tap Propose. To respond, tap Accept, Reject or Counter.',
    legal: 'Shares inside the range and step shown. Accept, Reject and Counter appear only when they are allowed.',
    hidden: 'The pool and every offer are public. Nothing else is hidden.',
    scoring: 'A deal pays each side its agreed share. With no deal, both sides get the fallback values on the panel.',
    win: 'The higher payoff wins the match. Equal payoffs are a draw.',
    first: 'Ask for more than you expect to get, but leave the model a reason to say yes.',
    rules: [
      'The panel shows the total pool, the current offer and whose turn it is.',
      'The side to act proposes a split, or answers the current offer.',
      'Accepting ends the game and pays the agreed shares.',
      'If bargaining ends with no deal, the fallback payoffs on the panel apply.'
    ],
    example: 'You propose 60 for you and 40 for the model. The model accepts, and those shares are the payoffs.'
  });

  help['negotiation'] = H(true, {
    q: ['Haggle over a price and a delivery time together.', 'Counter with a full package, or accept the offer.', 'Your payoff comes from the package you agree.'],
    obj: 'Close a deal on price and delivery that is as good for you as the model will accept.',
    turn: 'Set a price and a delivery term, then Propose. Or answer the current offer with Accept, Reject or Counter.',
    legal: 'Only combinations on the grid shown. A half-filled offer cannot be sent.',
    hidden: 'Offers and agreed terms are public. Nothing is hidden beyond what the panel shows.',
    scoring: 'The agreed package maps to a payoff for each side. With no deal, the fallback values on the panel apply.',
    win: 'The higher payoff wins the match. Equal payoffs are a draw.',
    first: 'Judge packages as a whole. A worse price can be a good deal when the delivery is better.',
    rules: [
      'The panel shows the grid of price and delivery terms, the current offer and whose turn it is.',
      'The side to act sends one complete package, or answers the current one.',
      'Accepting locks in both terms and ends the game.',
      'If the exchange runs out with no deal, the fallback outcome on the panel applies.'
    ],
    example: 'The model offers price 12 with delivery in three days. You counter with price 10 and delivery in five days.'
  });

  /* ===================== SHORT COPY: the other 19 games ===================== */

  help['checkers'] = H(false, {
    q: ['Move diagonally and jump to capture.', 'A capture is compulsory when one is available.', 'Take every piece, or leave the model with no move.'],
    obj: 'Capture all the model\'s pieces, or block them so they have no legal move.',
    turn: 'Tap a piece, then a highlighted square. If a jump is available you must take it, and keep jumping while you can.',
    legal: 'Diagonal steps, or jumps when one exists. Quiet moves disappear while a capture is on.',
    hidden: 'Nothing is hidden. Pieces, kings and the move list are visible.',
    scoring: 'No points. The end position decides it.',
    win: 'Win when the model has no pieces or no legal move. A repetition or no-progress rule can end it as a draw.',
    first: 'Advance in pairs so a lone piece cannot be jumped for free.',
    rules: [
      'Pieces step one square diagonally forward. Reaching the far row crowns a king, which can also move backward.',
      'A jump goes over an adjacent enemy piece into the empty square behind it and removes that piece. If the same piece can jump again, the turn continues.',
      'When any capture is available, you have to make one.'
    ],
    example: 'Your piece jumps an adjacent enemy piece, then a second one in the same turn because another jump is open.'
  });

  help['shogi'] = H(false, {
    q: ['Move on a 9 by 9 board and capture the model\'s pieces.', 'Captured pieces join your hand and can be dropped back on the board.', 'Checkmate the king to win.'],
    obj: 'Checkmate the model\'s king while keeping your own out of check.',
    turn: 'Move a piece, or drop one from your hand onto a legal empty square.',
    legal: 'Tap a piece on the board or in your hand, then a highlighted square. Self-check and illegal drops are never offered.',
    hidden: 'Nothing is hidden. Both boards and both hands are public.',
    scoring: 'No points. Checkmate decides it.',
    win: 'Checkmate wins. Repetition is settled by the match\'s shogi rules.',
    first: 'Build a safe king position before attacking. Pieces you lose can come back at you.',
    rules: [
      'Each piece moves by its own pattern, and many can promote in the promotion zone.',
      'A captured piece changes sides and goes into your hand. On a later turn you can drop it on a legal empty square instead of moving.',
      'Some drops are illegal, such as a second unpromoted pawn on a file. The legal list already leaves them out.'
    ],
    example: 'You capture a silver general. A few turns later you drop that silver on an empty square as one of your own.'
  });

  help['xiangqi'] = H(false, {
    q: ['Move across a board split by a river.', 'Generals stay in their palace and may never face each other.', 'Checkmate or stalemate the general to win.'],
    obj: 'Checkmate the model\'s general, or leave it with no legal move.',
    turn: 'Tap a piece to see its destinations, then tap one.',
    legal: 'Palace, river, blocking, cannon and self-check limits are already applied. Only legal moves are offered.',
    hidden: 'Nothing is hidden. The whole board is public.',
    scoring: 'No points. The end position decides it.',
    win: 'Checkmate or stalemate wins. A general with no legal defence loses.',
    first: 'Bring horses and cannons out while keeping the central file around your general under control.',
    rules: [
      'Each piece moves by its own pattern. Generals and advisors stay in the palace, elephants cannot cross the river, horses can be blocked, cannons capture by jumping exactly one piece.',
      'The two generals can never face each other along an open file.',
      'A move cannot leave your own general in check.'
    ],
    example: 'Your cannon jumps over exactly one piece to capture the piece beyond it. With none or two in between, it could not.'
  });

  help['pentago'] = H(false, {
    q: ['Place a marble, then rotate one quadrant of the board.', 'The rotation can build lines or break them.', 'Five in a row wins.'],
    obj: 'Make an unbroken line of five of your marbles.',
    turn: 'Pick an empty cell, then choose a quadrant and a turn direction to finish your move.',
    legal: 'One empty cell plus one clockwise or counter-clockwise quadrant turn. The action reads out both parts.',
    hidden: 'Nothing is hidden. The board and every quadrant are public.',
    scoring: 'No points. A line of five decides it.',
    win: 'A sole five in a row wins. If one turn gives both sides a five, or the board fills with none, it is a draw.',
    first: 'Judge the board after the rotation, not just after the placement.',
    rules: [
      'Every turn has two parts: place one marble, then rotate one quadrant 90 degrees either way.',
      'The rotation moves marbles of both colours, so it can help either side.',
      'Five in a line, across, down or diagonally, wins.'
    ],
    example: 'You place in the top left quadrant, then turn the bottom right clockwise. That slides your fifth marble into line.'
  });

  help['mancala'] = H(false, {
    q: ['Pick up a pit and sow its stones one by one.', 'Ending in your store gives you another turn.', 'Most stones in your store wins.'],
    obj: 'Collect more stones in your store than the model.',
    turn: 'Tap a non-empty pit on your side. Its stones are sown around the board.',
    legal: 'Any non-empty pit on your side. Sowing, captures and extra turns are worked out for you.',
    hidden: 'Nothing is hidden. Every pit and store count is public.',
    scoring: 'Each stone in your store is one point once the leftover stones are collected.',
    win: 'More stones wins, fewer loses, equal is a draw.',
    first: 'Look for a sow that ends in your store without leaving a big capture open opposite.',
    rules: [
      'Lift every stone from one of your pits and drop them one at a time into the next pits, including your store and skipping the model\'s store.',
      'If the last stone lands in your store, you move again.',
      'If it lands in an empty pit on your side, you may capture it and the stones opposite.',
      'When one side runs out of stones, the rest are collected and the stores are compared.'
    ],
    example: 'You lift four stones and the fourth lands in your store, so you move again.'
  });

  help['nine-mens-morris'] = H(false, {
    q: ['Place nine pieces, then slide them along the lines.', 'Three in a line is a mill and removes an enemy piece.', 'Leave the model with fewer than three pieces, or no move.'],
    obj: 'Reduce the model to fewer than three pieces, or block every move it has.',
    turn: 'Place a piece on an empty point, or slide one to a connected empty point. If you make a mill, choose an enemy piece to remove.',
    legal: 'What you can do depends on the phase: place, slide, or fly when you are down to three. Mill removals follow the removal rules.',
    hidden: 'Nothing is hidden. Pieces, mills and the phase are public.',
    scoring: 'No points. Mills win pieces, and pieces decide the game.',
    win: 'Win when the model has fewer than three pieces or cannot move. A repetition or no-progress rule can end it as a draw.',
    first: 'Aim for positions that threaten two mills at once.',
    rules: [
      'Phase one: players alternate placing a piece on any empty point until all nine are down.',
      'Phase two: slide one piece along a line to an adjacent empty point.',
      'A mill is three of your pieces on one line. Make one and you remove an enemy piece, normally one not already in a mill.',
      'With three pieces left, you can fly to any empty point when the flying rule is on.'
    ],
    example: 'You slide a piece into the third point of a line. That is a mill, so you remove one enemy piece.'
  });

  help['backgammon'] = H(false, {
    q: ['Roll two dice and move your checkers around the board.', 'Hit a lone enemy checker and it goes to the bar.', 'Bear off all fifteen first to win.'],
    obj: 'Move all fifteen of your checkers home and bear them off before the model does.',
    turn: 'Your dice roll, then you pick a checker and a destination for each die.',
    legal: 'Only complete dice sequences the position allows. A checker on the bar must re-enter first.',
    hidden: 'Nothing is hidden once the dice are rolled. Board, bar and dice are public.',
    scoring: 'A win can be marked as a gammon or backgammon when the loser is far enough behind.',
    win: 'The first side to bear off every checker wins.',
    first: 'Build safe points and avoid leaving single checkers where they can be hit.',
    rules: [
      'Each die is a separate move. Doubles give four moves.',
      'A checker may land on any point that holds fewer than two enemy checkers. Landing on a lone one hits it and sends it to the bar.',
      'A checker on the bar must come back in before you can move anything else.',
      'Once all your checkers are in your home board, you can start bearing them off.'
    ],
    example: 'You roll a 3 and a 5. One checker moves three points, another moves five, and if either lands on a lone enemy checker it is hit.'
  });

  help['leduc-holdem'] = H(false, {
    q: ['A small poker game: one private card each, one shared card.', 'Two betting rounds with a fixed menu of bets.', 'Best hand at showdown, or the last seat in, takes the pot.'],
    obj: 'Win chips with the better hand, or by making the other seats fold.',
    turn: 'When it is your seat\'s turn, choose from the bets and actions offered: fold, check, call or raise.',
    legal: 'Only the actions that are valid right now, with their chip amounts on the label.',
    hidden: 'Your card is private until showdown. The shared card, bets and stacks are public.',
    scoring: 'Chips are only the scoring unit. The result shows chips won or lost for every seat.',
    win: 'The best hand at showdown takes the pot. A pair with the shared card beats any unpaired hand.',
    first: 'With only one card each, the shared card matters a lot. Pairing it is a big edge.',
    rules: [
      'Each seat gets one private card. One shared card is revealed between the two betting rounds.',
      'A pair, your card matching the shared one, beats any unpaired hand. Otherwise the higher card wins.',
      'Bets come from a fixed menu. If everyone else folds, the last seat in wins the pot.'
    ],
    example: 'Your card is a queen and the shared card turns up a queen. You hold a pair, so betting is on your side.'
  });

  help['limit-texas-holdem'] = H(false, {
    q: ['Two private cards each, five shared cards on the table.', 'Bets and raises come in one fixed size.', 'Best five-card hand at showdown, or the last seat standing, takes the pot.'],
    obj: 'Win chips with the best five-card hand, or by making everyone else fold.',
    turn: 'When it is your seat\'s turn, fold, check, call, or bet or raise by the fixed amount.',
    legal: 'Only the valid actions, with the chip cost on each label. Raise is offered only while raising remains available.',
    hidden: 'Your two cards are private until showdown. Other seats\' cards stay face down. Community cards, bets and the pot are public.',
    scoring: 'Chips are only the scoring unit. The pot goes to the best hand at showdown, split on exact ties.',
    win: 'The result shows chips won or lost for every seat at the table.',
    first: 'The cost to continue is fixed, so compare it to what your cards can become.',
    rules: [
      'Every seat gets two private cards. Five community cards follow: the flop, the turn and the river, with a betting round before the flop and after each.',
      'Bets and raises are a fixed amount, not a size you choose.',
      'At showdown each seat makes its best five-card hand from its two cards and the five on the table.'
    ],
    example: 'After the flop nobody has bet, so you check. A later seat bets the fixed amount, and you can fold, call or raise.'
  });

  help['hearts'] = H(false, {
    q: ['Play tricks and follow suit.', 'Hearts and the queen of spades are penalty cards.', 'Fewest penalty points wins.'],
    obj: 'Finish with the fewest penalty points.',
    turn: 'Play one card to the trick, following the led suit when you can. The trick winner leads next.',
    legal: 'Cards that follow suit when you hold the suit. Heart-breaking and first-trick rules are applied before you see your options.',
    hidden: 'Your hand is private. Played cards, finished tricks and scores are public.',
    scoring: 'Each heart is one penalty point and the queen of spades is thirteen. Taking every penalty card is a shoot the moon, with its own adjustment.',
    win: 'The lowest penalty total wins.',
    first: 'Track the high cards and look for a safe moment to shed the queen of spades.',
    rules: [
      'The highest card of the led suit takes the trick and leads the next one. If you cannot follow suit, you may discard any legal card.',
      'Hearts cannot be led until a heart has been played, unless you hold nothing else.',
      'Each heart is a penalty point and the queen of spades is thirteen. Lower is better.'
    ],
    example: 'Clubs are led and you hold a club, so you must play one. With none, you could shed a penalty card instead.'
  });

  help['spades'] = H(false, {
    q: ['Bid how many tricks you will take.', 'Follow suit, and spades are trump.', 'Make your bid and manage the extra tricks.'],
    obj: 'Take the number of tricks you bid, and finish with the higher score.',
    turn: 'Bid when asked, then play one card per trick, following suit when you can.',
    legal: 'The bids on offer, then cards that follow suit. Spades cannot normally be led until they have been broken.',
    hidden: 'Your hand is private. Bids, played cards, tricks and scores are public.',
    scoring: 'Making your bid scores the contract plus any overtrick treatment. Missing it costs a penalty. Nil and bag rules apply only where the variant shows them.',
    win: 'The higher final score wins when the match limit is reached.',
    first: 'Bid from the tricks you are likely to win, then count the spades still out.',
    rules: [
      'A spade beats any card that is not a spade. Otherwise the highest card of the led suit wins the trick.',
      'You must follow the led suit if you can. The trick winner leads next.',
      'Spades cannot be led until some spade has been played, unless you hold nothing else.'
    ],
    example: 'Diamonds are led and you have none, so you play a spade. Unless a higher spade follows, you win the trick.'
  });

  help['euchre'] = H(false, {
    q: ['Call a trump suit and play five tricks.', 'The two bowers are the strongest trumps.', 'Make the call, or the other side scores.'],
    obj: 'If you called trump, take at least three of the five tricks. If not, stop the caller.',
    turn: 'In the call phase, call or pass. In play, put one card in each trick, following suit when you can.',
    legal: 'Only the call choices valid right now, then cards that follow suit. The left bower counts as trump automatically.',
    hidden: 'Your hand is private. Trump, the caller, played cards, tricks and scores are public.',
    scoring: 'The calling side scores for three or four tricks and more for all five. Defenders score when they euchre the caller.',
    win: 'The side with more points under the match limit wins.',
    first: 'Count your trump carefully, and remember both jacks of the trump colour belong to trump.',
    rules: [
      'The right bower, the jack of trump, is the highest card. The left bower, the other jack of the same colour, is next and counts as trump.',
      'The highest trump wins a trumped trick. Otherwise the highest card of the led suit wins.',
      'Five tricks are played. The trick winner leads next.'
    ],
    example: 'Hearts are trump and clubs are led. The jack of diamonds is the left bower, so it counts as a heart and does not follow clubs.'
  });

  help['bridge'] = H(false, {
    q: ['Play out a fixed contract with four compass seats.', 'Follow the led suit when you can.', 'The declaring side needs its contracted number of tricks.'],
    obj: 'As declarer, take at least the contracted number of tricks. As a defender, stop that.',
    turn: 'When your compass seat is active, play one card, following suit if your hand has it.',
    legal: 'Only cards that follow suit are enabled. Contract, trump, the current trick and earlier tricks stay labelled.',
    hidden: 'You see your own cards and any dummy cards that are exposed. The other hands stay hidden.',
    scoring: 'Declarer needs six plus the contract level in tricks. Making it, overtricks and undertricks are scored from the contract, and the match reports the table points.',
    win: 'The declaring partnership wins by making the contract. Otherwise the defenders set it.',
    first: 'Count your sure tricks and the trumps still out before you spend a key honour.',
    rules: [
      'This is the play phase only: contract, declarer, opening leader and trump are already set. Partners sit opposite each other.',
      'Each trick starts with one led card and every seat must follow suit if it can. A trump beats other suits, and the highest card of the led suit wins when there is no trump.',
      'The trick winner leads next. Play runs through thirteen tricks.'
    ],
    example: 'West leads a heart. North and East follow, South has no hearts and plays a trump, winning unless a higher trump follows.'
  });

  help['crazy-eights'] = H(false, {
    q: ['Match the top discard by rank or suit.', 'An eight is wild and picks the next suit.', 'Empty your hand first.'],
    obj: 'Be the first to play every card in your hand.',
    turn: 'Play one card that matches the top discard, play an eight, or draw when you have nothing to play.',
    legal: 'Cards matching the active rank or suit, and any eight. Draw and suit choices appear only when they apply.',
    hidden: 'Your hand is private. The discard pile, active suit and hand counts are public.',
    scoring: 'The first empty hand wins the deal. Any extra totals come from the end state on screen.',
    win: 'The first side to shed every card wins.',
    first: 'Hold an eight back as an escape while you thin out suits that are hard to match.',
    rules: [
      'Play a card that matches the rank or suit of the top discard.',
      'An eight can go on anything, and you name the suit that follows.',
      'If you cannot play, draw. Play continues until one hand is empty.'
    ],
    example: 'The top card is the five of clubs. You play the five of hearts by matching rank, and hearts are now active.'
  });

  help['shedding-card-game'] = H(false, {
    q: ['A rank and suit shedding game.', 'Play a card that matches the top card by rank or suit.', 'Empty your hand first.'],
    obj: 'Be the first to get rid of every card in your hand.',
    turn: 'Play a card that matches the top card, or draw when you cannot.',
    legal: 'Only cards that match the top card by rank or suit, plus the draw action when you have no play.',
    hidden: 'Your hand is private. The discard pile and each side\'s card count are public.',
    scoring: 'The first empty hand wins. Any extra totals come from the end state on screen.',
    win: 'The first side to empty its hand wins.',
    first: 'Play the cards that are hardest to match first and keep flexible ones for later.',
    rules: [
      'Each turn you play one card that matches the rank or suit of the top card.',
      'If nothing in your hand matches, you draw.',
      'The first hand to empty wins.'
    ],
    example: 'The top card is a seven of spades. You play any spade or any seven.'
  });

  help['dou-dizhu'] = H(false, {
    q: ['One landlord plays against two peasants.', 'Beat the current play with a higher one of the same shape, or pass.', 'First hand to empty wins for its side.'],
    obj: 'Play out all your cards before the other side. The landlord is alone, the two peasants share the result.',
    turn: 'Lead any legal combination if you hold the lead. Otherwise beat the current play, or pass.',
    legal: 'Every allowed single, pair, sequence or grouped combination, plus bombs, the rocket and Pass. Wrong shapes and weaker ranks are left out.',
    hidden: 'Your hand is private. Played cards, card counts and roles are public.',
    scoring: 'The landlord wins if the landlord empties first. Both peasants win if either peasant does. Seats are placed by the result.',
    win: 'The result is a landlord win or a peasant win, with each seat\'s placement.',
    first: 'Keep combinations that can win the lead back, and read the peasants\' plays rather than guessing at signals.',
    rules: [
      'The leading seat plays a single card or a combination. The next seats must play a higher one of the same type and size, play a bomb or the rocket, or pass.',
      'When everyone else passes, the last player to play leads again with anything legal.',
      'The hand ends the moment any seat has no cards.'
    ],
    example: 'The landlord leads a pair of sevens. The next seat passes, the third plays a pair of tens, and after the others pass that seat leads.'
  });

  help['mahjong'] = H(false, {
    q: ['Draw a tile and discard a tile to build a hidden hand.', 'Call a discard only when the rules offer it.', 'Complete a winning hand before the other seats.'],
    obj: 'Declare a complete legal hand in the compact variant\'s meld-and-pair shape.',
    turn: 'Draw when required, then discard one tile or make an offered declaration. Out of turn, you act only when a call is offered.',
    legal: 'Draw, Discard, Pass, Call or Win, only when they are valid for your seat right now.',
    hidden: 'Your concealed tiles are private. Other seats\' tiles are masked. Discards, open groups and the wall count are public.',
    scoring: 'The winning hand decides the winner. Any points or placement shown come from the validated end hand.',
    win: 'The result names the winning seat and each seat\'s placement. An exhausted wall ends under the draw rule shown.',
    first: 'Keep shapes that can finish more than one way, and use the public discards to judge which loose tiles are safe to release.',
    rules: [
      'Seats act in table order. The active seat draws a tile, then discards one, unless the draw completes a winning hand.',
      'Another seat can call a discard only when the current rules allow it. A call forms an open group and decides who acts next.',
      'The first legal complete hand wins.'
    ],
    example: 'You draw a tile that completes a three-tile sequence and discard a loose one. The next seat can call it only if it forms a legal group.'
  });

  help['cribbage'] = H(false, {
    q: ['Choose cards to send to the crib.', 'A starter card is turned up.', 'Fifteens, pairs, runs and flushes score at the showdown.'],
    obj: 'Pick discards that make the best hand, then finish with the higher score.',
    turn: 'Select the exact number of cards to discard to the crib and confirm.',
    legal: 'Only a discard set of exactly the required size. Once confirmed, those cards go to the crib.',
    hidden: 'Your hand and discards are private until the showdown. The starter and the scoring combinations are public.',
    scoring: 'Each hand and the crib count every fifteen, pair, run, flush and nobs, using the starter. The total on screen decides the result.',
    win: 'The higher total wins. Equal totals follow the tie rule shown.',
    first: 'Weigh the hand you keep against what you hand the dealer\'s crib.',
    rules: [
      'This is a compact discard-and-showdown version. Each seat puts the required cards in the crib.',
      'A starter card is revealed. Hands and the crib are counted with it: fifteens, pairs, runs, flushes, and the jack matching the starter\'s suit.',
      'The dealer owns the crib for the deal.'
    ],
    example: 'You keep a five with two ten-value cards, since each pair of five and ten makes fifteen, and send the rest to the crib.'
  });

  help['hanabi'] = H(false, {
    q: ['Work with the model to build five fireworks in order.', 'You see its cards but not your own.', 'Clues are limited, so make them count.'],
    obj: 'Play each colour from 1 up to 5 and make the shared score as high as you can.',
    turn: 'Play a card, discard a card to regain a clue token, or spend a token to give a clue about one rank or one colour.',
    legal: 'Card positions you can play or discard, and clues that name every card of a rank or a colour in the other hand. A clue needs a token.',
    hidden: 'You cannot see your own card faces, only the clues attached to them. The other hand, fireworks, discards and counters are visible.',
    scoring: 'The shared score is the highest rank played in each colour, up to 25. Running out of fuses or the deck stops further scoring.',
    win: 'Both seats share the final team score.',
    first: 'Clue a card that is playable right now, or protect a unique card from being discarded.',
    rules: [
      'You and the model are on the same team and act in turn.',
      'A correct play extends that colour\'s firework in order. A wrong play burns a fuse.',
      'Discarding or playing draws a replacement while cards remain.'
    ],
    example: 'You spend a token to tell the model which of its cards are red. Its knowledge markers update.'
  });

  /* ------------------------------------------------------------------
     Accessibility line per input mode (brief Appendix A.3, mobile rule sections)
     ------------------------------------------------------------------ */
  var ACCESS = {
    cell_tap: 'Every cell is labelled for screen readers with its state, and the full list of legal actions works without board gestures.',
    piece_move: 'Choose a labelled piece, then one of its labelled destinations. The full list of legal actions works without gestures.',
    card_action: 'Cards are labelled in seat order. Activate a card, or use the full list of legal actions.',
    simultaneous_choice: 'Choose one labelled option and confirm. Nothing reveals until both sides have committed.',
    value_entry: 'Enter a value inside the announced range, then confirm it.',
    dice_bid: 'Adjust the count and the face with the labelled controls, then bid or call.'
  };
  function inputModeFor(g) {
    if (g.slug === 'othello' || g.slug === 'battleship') return 'cell_tap';
    switch (g.family) {
      case 'grid_3x3': case 'connect_four': case 'go_board': case 'hex_board': return 'cell_tap';
      case 'square_board': case 'custom': return 'piece_move';
      case 'card_table': return 'card_action';
      case 'payoff_matrix': return 'simultaneous_choice';
      case 'auction_panel': case 'economic_panel': return 'value_entry';
      case 'dice_table': return 'dice_bid';
      default: return 'cell_tap';
    }
  }
  Object.keys(games).forEach(function (slug) {
    if (help[slug]) help[slug].accessibility = ACCESS[inputModeFor(games[slug])];
  });

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function categoryLabel(id) {
    for (var i = 0; i < categories.length; i++) if (categories[i].id === id) return categories[i].label;
    return '';
  }

  function canPlay(modelId, slug) {
    var m = rosterById[modelId];
    var g = games[slug];
    if (!m || !g) return false;
    return g.hiddenInfo ? !!m.hiddenInfoCapable : true;
  }

  function statusFor(modelId, slug) {
    if (!canPlay(modelId, slug)) return 'unavailable';
    return rosterById[modelId].turnSpeed === 'slower_turns' ? 'slower_turns' : 'ready';
  }

  function statusLabel(status) {
    if (status === 'ready') return 'Ready';
    if (status === 'slower_turns') return 'Slower turns';
    return 'Not available for this game';
  }

  /* Stable string hash folded to a hue 0..359, for the tint behind a provider logo.
     FNV-1a with a fixed seed and a murmur-style finalizer. The seed is a constant picked so the
     first eight roster providers sit at least 34 degrees apart (no two neighbours share a tint). */
  var HUE_SEED = 1100046;
  function providerHue(providerSlug) {
    var s = String(providerSlug == null ? '' : providerSlug);
    var h = (2166136261 ^ HUE_SEED) >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h = (h ^ (h >>> 16)) >>> 0;
    h = Math.imul(h, 0x85ebca6b) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h % 360;
  }

  function helpSections(slug, folded) {
    var h = help[slug];
    if (!h) return [];
    var all = [
      { key: 'quick', title: 'Quick summary', body: h.quick },
      { key: 'objective', title: 'Objective', body: h.objective },
      { key: 'fullRules', title: 'Full rules', body: h.fullRules.join(' '), items: h.fullRules.slice() },
      { key: 'yourTurn', title: 'Your turn', body: h.yourTurn },
      { key: 'example', title: 'Turn example', body: h.example },
      { key: 'legalActions', title: 'Legal actions', body: h.legalActions },
      { key: 'scoring', title: 'Scoring', body: h.scoring },
      { key: 'winRule', title: 'Win/draw/placement', body: h.winRule },
      { key: 'hiddenInfo', title: 'Hidden information', body: h.hiddenInfo },
      { key: 'firstMove', title: 'First move', body: h.firstMove },
      { key: 'accessibility', title: 'Accessibility', body: h.accessibility }
    ];
    if (!folded) return all;
    return all.filter(function (s) { return s.key === 'quick' || s.key === 'yourTurn' || s.key === 'firstMove'; });
  }

  function metaLine(slug) {
    var g = games[slug];
    if (!g) return '';
    return g.variantLabel + ' \u00b7 ' + categoryLabel(g.category) + ' \u00b7 ' + g.seats + ' seats';
  }

  function arenaOf(slug) {
    var g = games[slug];
    return g ? arenaById[g.arena] || null : null;
  }

  function hiddenInfoModels() {
    return roster.filter(function (m) { return m.hiddenInfoCapable; });
  }

  function modelsFor(slug) {
    return roster.filter(function (m) { return canPlay(m.id, slug); });
  }

  /* ------------------------------------------------------------------
     Counts, derived. The UI renders these and never types them.
     ------------------------------------------------------------------ */
  var slugs = Object.keys(games);
  var counts = {
    games: slugs.length,
    arenas: arenas.length,
    phoneGames: slugs.filter(function (s) { return !games[s].mobileExcluded; }).length,
    hiddenInfoGames: slugs.filter(function (s) { return games[s].hiddenInfo; }).length,
    byCategory: {}
  };
  categories.forEach(function (c) {
    counts.byCategory[c.id] = {
      games: slugs.filter(function (s) { return games[s].category === c.id; }).length,
      arenas: arenas.filter(function (a) { return a.category === c.id; }).length
    };
  });

  /* ------------------------------------------------------------------
     Copy deck. Brief section 10 (exact strings) and section 7.
     Plain strings, or functions where the string takes a value.
     Vocabulary is locked (brief section 5): no battle, Elo, rating, live,
     locked, bot, refresh, Verified playable, Requestable.
     ------------------------------------------------------------------ */
  var copy = {
    /* Brand and Home */
    tagline: 'Here, AI plays games.',
    homeSubtitle: 'Pick your table, seat your opponents, and play a frontier model turn by turn.',
    playNow: 'Play now',
    changeTable: 'Change table',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signInToStart: 'Sign in to start',
    backOnlineToPlay: 'Back online to play',
    chooseAnArena: 'Choose an arena',
    chooseYourGame: 'Choose your game',
    recommendedForYou: 'Recommended for you',
    startHere: 'Start here',
    seeAll: 'See all',
    popular: 'Popular',
    countsLine: function (gameCount, arenaCount) { return gameCount + ' games \u00b7 ' + arenaCount + ' arenas'; },
    categoryAll: 'All',
    active: 'Active',
    watchOnWeb: 'Watch models play each other on eslams.com',
    arenaComingSoon: 'Arena games coming soon',
    catalogueUnavailable: 'The playable game catalogue is unavailable right now.',
    preparingGames: 'Preparing playable games and model opponents.',
    savedGameUnavailable: 'This saved Arena game is not available in the current catalogue.',
    tablesCount: function (n) { return n + ' tables'; },
    playingOnTheWeb: 'Playing on the web. Finish it there or end it here.',
    yourMove: 'Your move',
    modelIsThinking: function (name) { return name + ' is thinking\u2026'; },

    /* Table sheet */
    chooseYourTable: 'Choose your table',
    howToPlay: 'How to play',
    more: 'More',
    less: 'Less',
    chooseYourSide: 'Choose your side',
    youMoveFirst: 'You move first',
    modelMovesFirst: 'Model moves first',
    sideHelperPairs: [
      { ids: ['tic-tac-toe', 'chess', 'checkers', 'shogi', 'xiangqi', 'othello', 'go', 'gomoku', 'hex', 'pentago', 'nine-mens-morris'], you: 'Move first.', model: 'The model opens.' },
      { ids: ['ultimate-tic-tac-toe', 'mancala', 'battleship', 'backgammon'], you: 'Move first.', model: 'Model opens.' },
      { ids: ['connect-four'], you: 'Drop first.', model: 'Model drops first.' },
      { ids: ['hearts', 'spades', 'euchre', 'crazy-eights', 'shedding-card-game', 'gin-rummy', 'cribbage', 'hanabi', 'liars-dice', 'goofspiel'], you: 'Act first.', model: 'Model acts first.' },
      { ids: ['prisoners-dilemma', 'bargaining', 'negotiation', 'first-price-sealed-bid-auction', 'rock-paper-scissors'], you: 'Choose first.', model: 'Model chooses first.' }
    ],
    yourOpponent: 'Your opponent',
    change: 'Change',
    allModels: function (n) { return 'All ' + n + ' models'; },
    modelsCount: function (n) { return n + ' models'; },
    modelRoster: 'Model roster',
    shuffle: 'Shuffle',
    chooseAnOpponent: 'Choose an opponent',
    /* The web says 'Choose a live model'. 'Live' is a retired word in the app, so the key keeps the
       web's name and carries the app's wording. */
    chooseLiveModel: 'Choose an opponent',
    hiddenInfoRail: function (n) { return n + ' models can play hidden-information games today'; },
    noModelsCanPlay: 'No models can play this table yet.',
    yourSeat: 'Your seat',
    youOpen: 'You open',
    modelOpens: 'Model opens',
    tapToSwap: 'tap to swap',
    seatYou: function (seat) { return seat + ' \u00b7 you'; },
    seatTapToSwap: function (seat) { return seat + ' \u00b7 tap to swap'; },
    autoFillTable: 'Auto-fill table',
    startGame: 'Start game',
    readyLine: function (game) { return game + ' \u00b7 Ready'; },
    modelSeatsReady: function (n) { return n + ' model seats \u00b7 Ready'; },
    unavailableLine: function (modelShortName) { return modelShortName + ' \u00b7 Not available for this game'; },
    demoPill: 'demo',
    demoNote: 'This table plays a recorded demo in the prototype.',

    /* Statuses: the only three */
    ready: 'Ready',
    slowerTurns: 'Slower turns',
    notAvailable: 'Not available for this game',

    /* Roster sheet */
    chooseYourOpponent: 'Choose your opponent',
    allModelsGame: function (game) { return 'All models \u00b7 ' + game; },
    pickAModel: function (seat) { return seat + ' \u00b7 pick a model'; },
    searchModels: 'Search models or providers...',
    loadingRoster: 'Loading full model roster...',
    recommendedPicks: 'Recommended picks',
    mixedAcrossProviders: 'Mixed across providers',
    allProviders: 'All providers',
    noModelsMatch: 'No models match this search.',
    readyForGame: function (n, game, providers) { return n + ' ready for ' + game + ' \u00b7 ' + providers + ' providers'; },

    /* How to play */
    helpHeadings: {
      quick: 'Quick summary', objective: 'Objective', fullRules: 'Full rules', yourTurn: 'Your turn',
      example: 'Turn example', legalActions: 'Legal actions', scoring: 'Scoring', winRule: 'Win/draw/placement',
      hiddenInfo: 'Hidden information', firstMove: 'First move', accessibility: 'Accessibility'
    },
    webHelpHeadings: ['Objective', 'Your turn', 'Legal actions', 'Hidden information'],

    /* Sign-in sheet (brief 7.5, Appendix E). Flat keys. */
    signInTitle: 'Sign in to eSlams',
    signInSub: 'Sign in with GitHub, Google, or email.',
    signInWithGitHub: 'Sign in with GitHub',
    signInWithGoogle: 'Sign in with Google',
    signInWithApple: 'Sign in with Apple',
    appleEnrollmentPending: 'Enrollment pending',
    orUseEmail: 'or use email',
    segSignIn: 'Sign in',
    segCreateAccount: 'Create account',
    emailLabel: 'Email',
    emailPlaceholder: 'you@lab.ai',
    passwordLabel: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordRule: 'Minimum 12 characters.',
    forgotPassword: 'Forgot password?',
    continueWithEmail: 'Continue with email',
    newToEslams: 'New to eSlams?',
    createAnAccount: 'Create an account',
    alreadyHaveAccount: 'Already have an account?',
    createTitle: 'Create your account',
    createSub: 'Create an account with GitHub, Google, or email.',
    createWithGitHub: 'Create with GitHub',
    createWithGoogle: 'Create with Google',
    orSignUpWithEmail: 'or sign up with email',
    securityCheck: 'Completing security check\u2026',
    createAccountButton: 'Create account',
    legalLine: 'By creating an account you agree to the eSlams terms. Profiles become public only after onboarding chooses a username.',
    welcomeBack: 'Welcome back.',
    joinTheArena: 'Join the arena.',
    signingYouIn: 'Signing you in\u2026',
    resetPassword: 'Reset password',
    resetPasswordSub: 'Enter your email to request a reset link.',
    oneMoreCheck: 'One more check.',
    twoFactorTitle: 'Two-factor verification',
    twoFactorSub: 'Open your authenticator and enter the current code.',
    twoFactorBrandNote: 'Your password or identity provider was accepted. Verify the second factor to finish signing in.',
    segAuthenticator: 'Authenticator',
    segRecoveryCode: 'Recovery code',
    sixDigitCode: 'Six-digit code',
    oneTimeRecoveryCode: 'One-time recovery code',
    recoveryFootnote: 'Recovery codes are single-use. A used code is removed atomically from your account.',
    trustThisDevice: 'Trust this device',
    verifyAndContinue: 'Verify and continue',
    signInToStartAGame: 'Sign in to start a game.',
    signInExpired: 'Your sign-in expired. Sign in again to start a game.',
    oauthErrors: {
      access_denied: 'Sign-in was cancelled. Nothing changed.',
      account_deactivated: 'This account has been deactivated.',
      account_deleted: 'This account has been deleted.',
      linking_conflict: 'That email already belongs to another sign-in method. Use the one you signed up with.',
      oauth_bridge_rejected: 'The sign-in link was rejected or has expired. Try again.'
    },

    /* Onboarding (the web's three steps) */
    onboardingStep: function (n) { return 'Step ' + n + ' of 3'; },
    chooseUsername: 'Choose your username',
    usernamePlaceholder: 'player-1',
    usernamePreview: function (name) { return 'eslams.com/' + (name || 'player-1'); },
    addProfileDetails: 'Add profile details',
    displayName: 'Display name',
    bio: 'Bio',
    location: 'Location',
    website: 'Website',
    skip: 'Skip',
    continue: 'Continue',
    back: 'Back',
    doesThisLookRight: 'Does this look right?',
    whoCanSeeProfile: 'Who can see your profile?',
    profilePublic: 'Public',
    profilePublicDesc: 'Anyone can view it',
    profilePrivate: 'Private',
    profilePrivateDesc: 'Approved followers only',

    /* Curtain-riser */
    settingTheTable: 'Setting the table\u2026',
    wakingTheEngine: 'Waking the engine\u2026',
    takenSeat: function (name) { return name + ' has taken its seat.'; },
    takingLonger: 'Taking longer than usual\u2026',
    keepWaiting: 'Keep waiting',
    keepWaitingNote: 'You can keep waiting or leave the app. This match stays active.',
    switchOpponent: 'Switch opponent',
    exit: 'Exit',
    tryAgain: 'Try again',
    engineRoomBusy: 'The engine room is busy. Connect Four is ready right now.',
    switchToConnectFour: 'Play Connect Four',
    opponentsUnavailable: 'Opponents are unavailable right now. Try again in a moment.',
    matchInProgress: function (game, model, state) { return 'You have a match in progress: ' + game + ' vs ' + model + ', ' + state + '.'; },
    matchStates: { yourMove: 'your move', modelThinking: 'the model is thinking' },
    resumeThatMatch: 'Resume that match',
    startThisOneInstead: 'Start this one instead',
    yourGameWillEnd: function (game) { return 'Your ' + game + ' match will end.'; },

    /* Stage */
    moveN: function (n) { return 'move ' + n; },
    thinkingClock: function (seconds) {
      var s = Math.max(0, Math.floor(seconds));
      return 'thinking ' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
    },
    lastTurn: function (seconds) { return 'last turn ' + Number(seconds).toFixed(1) + ' s'; },
    reconnecting: 'reconnecting\u2026',
    sealBid: 'Seal bid',
    propose: 'Propose',
    call: 'Call',
    resign: 'Resign',
    sound: 'Sound',
    claimTheWin: 'Claim the win',
    claimTheWinLine: 'Claim the win. The model never showed.',
    claimFootnote: 'Doesn\'t count toward your record. The model never took its turn.',
    matchChanged: 'The match changed on another device. The latest position is now loaded.',
    moveNeedsConfirmation: 'The previous move still needs confirmation. Retry the same move before choosing another.',
    matchNoLongerAvailable: 'This Arena match is no longer available.',
    leaveMatch: 'Leave match? The model will be waiting.',
    leaveMatchTitle: 'Leave match?',
    leaveMatchBody: 'The model will be waiting.',
    leave: 'Leave',
    leaveHelper: 'The match stays active for up to seven days.',
    resignHelper: 'A loss on your record.',
    keepPlaying: 'Keep playing',

    /* Result */
    youWon: 'You won.',
    modelWins: function (name) { return name + ' wins.'; },
    aDraw: 'A draw.',
    chipsLine: function (n) { return '+' + n + ' chips.'; },
    pointsLine: function (n) { return '+' + n + ' points.'; },
    placeLine: function (place, of) { return ordinal(place) + ' of ' + of + '.'; },
    decidedOn: function (n) { return 'Decided on move ' + n + '.'; },
    resignedOn: function (n) { return 'You resigned on move ' + n + '.'; },
    claimedOnTimeout: 'Claimed on timeout.',
    timeoutClaimLine: 'Claimed on timeout. Doesn\'t count toward your record. The model never took its turn.',
    modelUnavailableLine: 'The model couldn\'t finish. Your moves are saved; this match doesn\'t count toward your record.',
    abandonedLine: 'This match expired after seven days without a move. Not a loss.',
    endedForAnotherLine: 'You ended this match to start another.',
    matchVisibility: 'Match visibility',
    visibilityPublic: 'Public',
    visibilityFollowers: 'Followers',
    visibilityOnlyMe: 'Only me',
    visibilityDesc: {
      public: 'Anyone can view and share this match.',
      followers: 'Approved followers can view this match.',
      only_me: 'Only you can view this match.'
    },
    savedToProfile: 'Saved to your profile',
    replayUnavailable: 'Replay unavailable',
    playAgain: 'Play again',
    newOpponent: 'New opponent',
    watchReplay: 'Watch replay',
    share: 'Share',
    shareLoss: function (model, n) { return 'It took ' + model + ' ' + n + ' moves to beat me.'; },
    shareWin: function (model, game) { return 'I beat ' + model + ' at ' + game + '.'; },
    shareSignature: 'eslams.com',

    /* Replay and Your matches */
    replay: 'Replay',
    replayControls: { restart: 'Restart', stepBack: 'Step back', play: 'Play', pause: 'Pause', stepForward: 'Step forward', end: 'End' },
    noReasoning: 'Hidden-information games publish no reasoning.',
    yourMatches: 'Your matches',
    noMatchesYet: 'No matches yet. Play one and it will show up here.',

    /* Settings */
    settingsTitle: 'Settings',
    appearance: 'Appearance',
    appearanceSystem: 'System',
    appearanceLight: 'Light',
    appearanceDark: 'Dark',
    haptics: 'Haptics',
    on: 'On',
    off: 'Off',
    account: 'Account',
    manageAccount: 'Manage your account on eslams.com',
    deleteAccount: 'Delete account',
    about: 'About',
    version: 'Version',
    privacy: 'Privacy',
    terms: 'Terms'
  };

  var defaultsForNewPlayer = { game: 'connect-four', modelId: 'anthropic/claude-haiku-4.5', side: 'p1' };

  /* ------------------------------------------------------------------
     Export
     ------------------------------------------------------------------ */
  ROOT.ESD = {
    categories: categories,
    arenas: arenas,
    games: games,
    gameOrder: gameOrder,
    roster: roster,
    rosterTotal: 313,
    canPlay: canPlay,
    help: help,
    copy: copy,
    defaultsForNewPlayer: defaultsForNewPlayer,
    providerHue: providerHue,
    /* extras */
    counts: counts,
    modelById: function (id) { return rosterById[id] || null; },
    arenaById: function (id) { return arenaById[id] || null; },
    arenaOf: arenaOf,
    categoryLabel: categoryLabel,
    statusFor: statusFor,
    statusLabel: statusLabel,
    modelsFor: modelsFor,
    hiddenInfoModels: hiddenInfoModels,
    helpSections: helpSections,
    metaLine: metaLine,
    ordinal: ordinal
  };
})();
