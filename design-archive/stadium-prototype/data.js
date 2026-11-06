// eSlams Stadium — design data. Catalogue + roster are real (30 Sep 2026); match posters are plausible fill, dated honestly.
export const CATS = { board: 'Board & Strategy', card: 'Card & Hidden-Info', gametheory: 'Social & Economic', rl: 'Control & Arcade' };

export const GAMES = [
 ['chess','Chess','board','standard','square_board','main_arena',8,8],
 ['go','Go','board','board_9x9','go_board','main_arena',9,9],
 ['connect-four','Connect Four','board','standard','connect_four','main_arena',6,7],
 ['tic-tac-toe','Tic-Tac-Toe','board','standard','grid_3x3','main_arena',3,3],
 ['othello','Othello','board','standard','square_board','main_arena',8,8],
 ['checkers','Checkers','board','standard','square_board','advanced_arena',8,8],
 ['shogi','Shogi','board','standard','custom','advanced_arena',9,9],
 ['xiangqi','Xiangqi','board','standard','custom','advanced_arena',10,9],
 ['gomoku','Gomoku','board','standard','go_board','main_arena',15,15],
 ['hex','Hex','board','standard','hex_board','main_arena',11,11],
 ['mancala','Mancala','board','standard','custom','advanced_arena'],
 ['nine-mens-morris',"Nine Men's Morris",'board','standard','custom','advanced_arena'],
 ['pentago','Pentago','board','standard','custom','advanced_arena'],
 ['ultimate-tic-tac-toe','Ultimate Tic-Tac-Toe','board','standard','grid_3x3','main_arena',9,9],
 ['battleship','Battleship','board','standard','square_board','main_arena',10,10],
 ['backgammon','Backgammon','board','standard','custom','advanced_arena'],
 ['blackjack','Blackjack','card','core_hit_stand_s17','card_table','disabled'],
 ['leduc-holdem',"Leduc Hold'em",'card','core_compact_leduc_fixed_menu','card_table','table_mode_pending'],
 ['limit-texas-holdem',"Limit Texas Hold'em",'card','core_compact_holdem_fixed_menu_limit','card_table','table_mode_pending'],
 ['no-limit-texas-holdem',"No-Limit Texas Hold'em",'card','core_compact_holdem_fixed_menu_no_limit','card_table','table_mode_pending'],
 ['shedding-card-game','Shedding Card Game','card','core_rank_suit_shedding','card_table','advanced_arena'],
 ['gin-rummy','Gin Rummy','card','core_compact_gin','card_table','advanced_arena'],
 ['mahjong','Mahjong','card','core_compact_draw_discard','card_table','table_mode_pending'],
 ['dou-dizhu','Dou Dizhu','card','core_landlord_shedding','card_table','table_mode_pending'],
 ['bridge','Bridge','card','core_compact_bridge_play_phase','card_table','table_mode_pending'],
 ['hearts','Hearts','card','core_penalty_tricks','card_table','advanced_arena'],
 ['spades','Spades','card','core_trump_tricks','card_table','advanced_arena'],
 ['euchre','Euchre','card','core_call_and_play','card_table','advanced_arena'],
 ['cribbage','Cribbage','card','core_discard_showdown','card_table','advanced_arena'],
 ['crazy-eights','Crazy Eights','card','core_wild_eight_shedding','card_table','advanced_arena'],
 ['hanabi','Hanabi','card','core_compact_hanabi','card_table','advanced_arena'],
 ['prisoners-dilemma',"Prisoner's Dilemma",'gametheory','core_one_shot_matrix','payoff_matrix','main_arena'],
 ['bargaining','Bargaining','gametheory','core_bilateral_split','economic_panel','advanced_arena'],
 ['negotiation','Negotiation','gametheory','core_price_delivery_grid','economic_panel','advanced_arena'],
 ['first-price-sealed-bid-auction','First-Price Sealed-Bid Auction','gametheory','core_two_bidder_private_values','auction_panel','main_arena'],
 ['liars-dice',"Liar's Dice",'card','core_single_round','dice_table','advanced_arena'],
 ['goofspiel','Goofspiel','card','core_five_card_goofspiel','card_table','main_arena'],
 ['rock-paper-scissors','Rock Paper Scissors','gametheory','core_one_shot_hidden_commit','payoff_matrix','main_arena'],
 ['taxi','Taxi','rl','standard','control_benchmark','disabled'],
 ['frozen-lake','Frozen Lake','rl','standard','control_benchmark','disabled'],
 ['cliff-walking','Cliff Walking','rl','standard','control_benchmark','disabled'],
 ['cartpole','CartPole','rl','standard','control_benchmark','disabled'],
 ['mountain-car','Mountain Car','rl','standard','control_benchmark','disabled'],
 ['lunar-lander','Lunar Lander','rl','lander-lite','control_benchmark','disabled'],
 ['car-racing','Car Racing','rl','standard','control_benchmark','disabled'],
 ['bipedal-walker','Bipedal Walker','rl','standard','control_benchmark','disabled'],
 ['paddle-ball','Paddle Ball','rl','standard','control_benchmark','disabled'],
 ['alien-shooter','Alien Shooter','rl','standard','control_benchmark','disabled'],
 ['boxing-style-arena','Boxing Style Arena','rl','standard','control_benchmark','disabled'],
 ['ice-hockey-style-arena','Ice Hockey Style Arena','rl','standard','control_benchmark','disabled'],
].map(([slug,name,cat,variant,fam,arena,rows,cols])=>({slug,name,cat,catLabel:CATS[cat],variant,fam,arena,rows,cols,
  playable: arena==='main_arena'||arena==='advanced_arena', pending: arena==='table_mode_pending', benchmark: arena==='disabled',
  engine: !(slug==='tic-tac-toe'||slug==='connect-four')}));

export const GAME = Object.fromEntries(GAMES.map(g=>[g.slug,g]));
export const GLYPH = { board:'▦', card:'▯', gametheory:'◎', rl:'∿', chess:'♞', go:'●', 'connect-four':'◍', 'tic-tac-toe':'✕', othello:'◐', hex:'⬡', gomoku:'●', checkers:'◉', 'rock-paper-scissors':'◎', 'prisoners-dilemma':'⊞' };
export const glyph = s => GLYPH[s] || GLYPH[GAME[s]?.cat] || '▦';

// Curated roster (names formatted per §8.2). Status words only: Ready · Slower turns · Not available for this game · Coming soon.
export const PROVIDERS = { anthropic:['Anthropic',20], openai:['OpenAI',160], google:['Google / DeepMind',250], xai:['xAI',0], deepseek:['DeepSeek',230], meta:['Meta AI',215], 'mistral-ai':['Mistral AI',30], 'moonshot-ai':['Moonshot AI',280], qwen:['Alibaba / Qwen',243] };
export const MODELS = [
 {id:'anthropic/claude-opus-4.8-fast', name:'Claude Opus 4.8 (Fast)', p:'anthropic', speed:'fast', strength:3, first:1.4, games:'all'},
 {id:'anthropic/claude-sonnet-5', name:'Claude Sonnet 5', p:'anthropic', speed:'fast', strength:2, first:0.9, games:'all'},
 {id:'anthropic/claude-haiku-latest', name:'Claude Haiku (latest)', p:'anthropic', speed:'fast', strength:1, first:0.5, games:27},
 {id:'openai/gpt-5.4-mini', name:'GPT-5.4 Mini', p:'openai', speed:'fast', strength:2, first:0.7, games:27},
 {id:'openai/gpt-5.5', name:'GPT-5.5', p:'openai', speed:'slow', strength:3, first:1.9, games:27},
 {id:'openai/gpt-4o-2024-05-13', name:'GPT-4o (May 2024)', p:'openai', speed:'fast', strength:1, first:0.8, games:27},
 {id:'google/gemini-3.5-flash', name:'Gemini 3.5 Flash', p:'google', speed:'fast', strength:2, first:0.6, games:27},
 {id:'google/gemini-3.1-pro-preview', name:'Gemini 3.1 Pro Preview', p:'google', speed:'slow', strength:3, first:1.7, games:27},
 {id:'xai/grok-4.5', name:'Grok 4.5', p:'xai', speed:'slow', strength:3, first:1.5, games:27},
 {id:'xai/grok-latest', name:'Grok (latest)', p:'xai', speed:'fast', strength:2, first:0.8, games:27},
 {id:'deepseek/deepseek-v4-pro', name:'DeepSeek V4 Pro', p:'deepseek', speed:'slow', strength:3, first:2.0, games:27},
 {id:'deepseek/deepseek-v4-flash', name:'DeepSeek V4 Flash', p:'deepseek', speed:'fast', strength:1, first:0.5, games:27},
 {id:'meta/llama-4-maverick', name:'Llama 4 Maverick', p:'meta', speed:'fast', strength:1, first:0.7, games:27},
 {id:'meta/muse-spark-1.1', name:'Muse Spark 1.1', p:'meta', speed:'slow', strength:2, first:1.3, games:27},
 {id:'mistral-ai/mistral-large-2512', name:'Mistral Large 2512', p:'mistral-ai', speed:'fast', strength:2, first:0.9, games:27},
 {id:'mistral-ai/mistral-medium-3.5', name:'Mistral Medium 3.5', p:'mistral-ai', speed:'fast', strength:1, first:0.6, games:27},
 {id:'moonshot-ai/kimi-k3', name:'Kimi K3', p:'moonshot-ai', speed:'slow', strength:3, first:1.8, games:27},
 {id:'moonshot-ai/kimi-k2.6', name:'Kimi K2.6', p:'moonshot-ai', speed:'fast', strength:2, first:0.8, games:27},
 {id:'qwen/qwen3.6-max-preview', name:'Qwen3.6 Max Preview', p:'qwen', speed:'slow', strength:3, first:1.6, games:27},
 {id:'qwen/qwen-plus-2025-07-28', name:'Qwen Plus (July 2025)', p:'qwen', speed:'fast', strength:1, first:0.6, games:27},
].map(m=>({...m, provider:PROVIDERS[m.p][0], hue:PROVIDERS[m.p][1], mark:`assets/p/${m.p}.svg`, short:m.name.split(' (')[0]}));
export const MODEL = Object.fromEntries(MODELS.map(m=>[m.id,m]));
export const ROSTER_TOTAL = 313;
export const ROSTER_PROVIDERS = 50;

// The 28 games the live roster names opponents for (30 Sep 2026); wildcards cover the rest.
const NAMED = new Set(['backgammon','checkers','chess','connect-four','go','gomoku','hex','mancala','nine-mens-morris','othello','pentago','shogi','tic-tac-toe','ultimate-tic-tac-toe','xiangqi','battleship']);
export function status(m, slug){
  const g = GAME[slug];
  if (!g || g.pending || g.benchmark) return 'Coming soon';
  if (m.games !== 'all' && !NAMED.has(slug)) return 'Not available for this game';
  return m.speed === 'slow' ? 'Slower turns' : 'Ready';
}
// Expected first-move time from telemetry (plausible fill; seconds).
export function expect(m, slug){ const base = GAME[slug]?.engine ? 6 : 2; return Math.round(base * m.first + 3); }

// Matches on the slate. Real anchor: last completed platform match 26 Jun 2026.
export const MATCHES = [
 {id:'m-c4-0626', game:'connect-four', a:'openai/gpt-5.4-mini', b:'google/gemini-3.5-flash', winner:'a', moves:23, date:'2026-06-26T18:40:00Z', stakes:'the lead changed four times', rec:'connect-four'},
 {id:'m-chess-0626', game:'chess', a:'anthropic/claude-opus-4.8-fast', b:'openai/gpt-5.5', winner:'a', moves:13, date:'2026-06-26T15:12:00Z', stakes:'decided on move 13 · a queen sacrifice', rec:'chess'},
 {id:'m-oth-0625', game:'othello', a:'xai/grok-4.5', b:'deepseek/deepseek-v4-pro', winner:'b', moves:60, date:'2026-06-25T21:03:00Z', stakes:'a late corner swung the count', rec:'othello'},
 {id:'m-ttt-0625', game:'tic-tac-toe', a:'google/gemini-3.1-pro-preview', b:'moonshot-ai/kimi-k3', winner:'a', moves:9, date:'2026-06-25T09:30:00Z', stakes:'first meeting', rec:'tic-tac-toe'},
 {id:'m-go-0624', game:'go', a:'deepseek/deepseek-v4-pro', b:'anthropic/claude-sonnet-5', winner:'a', moves:58, date:'2026-06-24T12:00:00Z', stakes:'a 14-stone group fell on move 51', rec:'go'},
 {id:'m-hex-0623', game:'hex', a:'qwen/qwen3.6-max-preview', b:'mistral-ai/mistral-large-2512', winner:'b', moves:41, date:'2026-06-23T19:15:00Z', stakes:'the bridge closed from the far edge', rec:'hex'},
 {id:'m-poker-0622', game:'goofspiel', a:'openai/gpt-5.5', b:'xai/grok-4.5', winner:'a', moves:5, date:'2026-06-22T16:45:00Z', stakes:'won on the last card', rec:'cards'},
];
// Benchmark runs (solo), Battlefield only.
export const BENCH = [
 {id:'b-lander', game:'lunar-lander', a:'openai/gpt-5.4-mini', score:'+212.4', date:'2026-06-21T10:00:00Z'},
 {id:'b-cartpole', game:'cartpole', a:'google/gemini-3.5-flash', score:'500 / 500', date:'2026-06-21T10:20:00Z'},
 {id:'b-bj', game:'blackjack', a:'anthropic/claude-haiku-latest', score:'+3.5 units', date:'2026-06-20T22:10:00Z'},
];

// Reasoning lines for the chess miniature (plausible fill — the sample replay carries no public explanations).
export const CHESS_REASONING = [
 null,
 'Taking the centre with the king pawn keeps every piece flexible.',
 'Mirroring. The symmetrical reply keeps the game balanced for now.',
 'The bishop eyes f7, the weakest square around the black king.',
 'Solid. d6 shuts the e5 pawn in and prepares to develop.',
 'Developing the knight toward the centre and adding pressure on e5.',
 'Pinning the knight to the queen. If it moves, the queen is hanging.',
 'Developing with tempo. I am happy to ignore the pin for a move.',
 'Fianchetto preparation, but this leaves f7 under-defended.',
 'Nxe5! The pin is a bluff: after Bxd1, Bxf7+ and Nd5 is mate.',
 'Taking the queen. If this is a trap I do not yet see the follow-up.',
 'Bxf7+ forces the king out. The queen is irrelevant now.',
 'Only move. Ke7 walks into the knight, but there is nothing better.',
 'Nd5#. Légal\'s mate pattern — three minor pieces against a lone king.',
];
