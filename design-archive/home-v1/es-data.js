/* ============================================================
   eSlams — Home redesign data layer  (window.ES)
   Ported from the app's data.js, extended with the interval
   grammar (P10/P50/P90 + conservative rank), clamped champions,
   category lenses, and board frames for the living boards.
   All numbers are invented-but-believable demo data.
   ============================================================ */
(function () {
  "use strict";
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function seedFrom(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return (h^h>>>16)>>>0;}
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

  /* ---------- GAMES (50) ---------- */
  const G=(slug,name,category,variant,difficulty,players)=>({slug,name,category,variant,difficulty,players});
  const games=[
    G('chess','Chess','Board','standard','Advanced',2),
    G('go','Go','Board','board_9x9','Advanced',2),
    G('connect-four','Connect Four','Board','standard','Beginner',2),
    G('tic-tac-toe','Tic-Tac-Toe','Board','standard','Beginner',2),
    G('othello','Othello','Board','standard','Intermediate',2),
    G('checkers','Checkers','Board','standard','Intermediate',2),
    G('shogi','Shogi','Board','standard','Advanced',2),
    G('xiangqi','Xiangqi','Board','standard','Advanced',2),
    G('gomoku','Gomoku','Board','standard','Intermediate',2),
    G('hex','Hex','Board','standard','Advanced',2),
    G('mancala','Mancala','Board','standard','Beginner',2),
    G('nine-mens-morris','Nine Men\u2019s Morris','Board','standard','Intermediate',2),
    G('pentago','Pentago','Board','standard','Intermediate',2),
    G('ultimate-tic-tac-toe','Ultimate Tic-Tac-Toe','Board','standard','Intermediate',2),
    G('battleship','Battleship','Board','standard','Beginner',2),
    G('backgammon','Backgammon','Board','standard','Intermediate',2),
    G('blackjack','Blackjack','Card','core_hit_stand_s17','Beginner',2),
    G('leduc-holdem','Leduc Hold\u2019em','Card','core_standard_leduc','Intermediate',2),
    G('limit-texas-holdem','Limit Texas Hold\u2019em','Card','core_heads_up_limit','Advanced',2),
    G('no-limit-texas-holdem','No-Limit Texas Hold\u2019em','Card','core_profiled_no_limit','Advanced',2),
    G('shedding-card-game','Shedding','Card','core_rank_suit_shedding','Beginner',4),
    G('gin-rummy','Gin Rummy','Card','core_compact_gin','Intermediate',2),
    G('mahjong','Mahjong','Card','core_compact_draw_discard','Advanced',4),
    G('dou-dizhu','Dou Dizhu','Card','core_landlord_shedding','Advanced',3),
    G('bridge','Bridge','Card','core_contract_play','Advanced',4),
    G('hearts','Hearts','Card','core_penalty_tricks','Intermediate',4),
    G('spades','Spades','Card','core_trump_tricks','Intermediate',4),
    G('euchre','Euchre','Card','core_call_and_play','Intermediate',4),
    G('cribbage','Cribbage','Card','core_discard_showdown','Intermediate',2),
    G('crazy-eights','Crazy Eights','Card','core_wild_eight_shedding','Beginner',4),
    G('hanabi','Hanabi','Card','core_compact_hanabi','Advanced',4),
    G('prisoners-dilemma','Prisoner\u2019s Dilemma','Strategy','core_one_shot_matrix','Beginner',2),
    G('bargaining','Bargaining','Strategy','core_bilateral_split','Intermediate',2),
    G('negotiation','Negotiation','Strategy','core_price_delivery_grid','Advanced',2),
    G('first-price-sealed-bid-auction','Sealed-Bid Auction','Strategy','core_two_bidder_private_values','Intermediate',2),
    G('liars-dice','Liar\u2019s Dice','Card','core_single_round','Intermediate',2),
    G('goofspiel','Goofspiel','Card','core_five_card_goofspiel','Intermediate',2),
    G('rock-paper-scissors','Rock-Paper-Scissors','Strategy','core_one_shot_hidden_commit','Beginner',2),
    G('taxi','Taxi','RL','standard','Beginner',1),
    G('frozen-lake','Frozen Lake','RL','standard','Beginner',1),
    G('cliff-walking','Cliff Walking','RL','standard','Beginner',1),
    G('cartpole','CartPole','RL','standard','Beginner',1),
    G('mountain-car','Mountain Car','RL','standard','Intermediate',1),
    G('lunar-lander','Lunar Lander','RL','standard','Intermediate',1),
    G('car-racing','Car Racing','RL','standard','Advanced',1),
    G('bipedal-walker','Bipedal Walker','RL','standard','Advanced',1),
    G('paddle-ball','Paddle Ball','RL','standard','Beginner',1),
    G('alien-shooter','Alien Shooter','RL','standard','Intermediate',1),
    G('boxing-style-arena','Boxing Arena','RL','standard','Intermediate',1),
    G('ice-hockey-style-arena','Ice Hockey Arena','RL','standard','Intermediate',1),
  ];

  /* ---------- PROVIDERS (70) ---------- */
  const P=(key,name,tier,hue)=>({key,name,tier,hue});
  const providers=[
    P('openai','OpenAI',1,158),P('anthropic','Anthropic',1,24),P('google','Google DeepMind',1,212),
    P('meta','Meta AI',1,224),P('xai','xAI',1,0),P('mistral','Mistral AI',1,28),
    P('deepseek','DeepSeek',1,230),P('qwen','Alibaba Qwen',1,266),
    P('baidu','Baidu',2,214),P('tencent','Tencent',2,206),P('bytedance','ByteDance Seed',2,200),
    P('huawei','Huawei',2,2),P('zhipu','Zhipu Z.ai',2,250),P('moonshot','Moonshot AI',2,268),
    P('minimax','MiniMax',2,330),P('01-ai','01.AI',2,150),P('stepfun','StepFun',2,190),
    P('baichuan','Baichuan AI',2,12),P('sensetime','SenseTime',2,300),P('iflytek','iFlytek',2,180),
    P('kuaishou','Kuaishou',2,36),P('openbmb','OpenBMB',2,140),P('shanghai-ai-lab','Shanghai AI Lab',2,196),
    P('xverse','XVERSE AI',2,288),P('xiaomi','Xiaomi',2,30),P('meituan','Meituan',2,42),
    P('ant-group','Ant Group',2,210),
    P('apple','Apple',3,220),P('amazon','Amazon AWS',3,34),P('microsoft','Microsoft',3,204),
    P('nvidia','NVIDIA',3,96),P('ibm','IBM',3,214),P('cohere','Cohere',3,318),
    P('ai21','AI21 Labs',3,260),P('reka','Reka AI',3,280),P('writer','Writer',3,170),
    P('inflection','Inflection AI',3,236),P('perplexity','Perplexity',3,186),P('liquid','Liquid AI',3,194),
    P('databricks','Databricks',3,8),P('snowflake','Snowflake',3,200),P('salesforce','Salesforce AI',3,206),
    P('contextual','Contextual AI',3,160),P('essential','Essential AI',3,250),P('adept','Adept AI',3,330),
    P('character','Character.AI',3,40),P('nous','Nous Research',3,270),P('arcee','Arcee AI',3,176),P('together','Together AI',3,190),
    P('tii','TII UAE',4,150),P('core42','Core42 G42',4,210),P('ai71','AI71',4,250),
    P('sdaia','SDAIA',4,160),P('naver','Naver',4,140),P('lg','LG AI Research',4,348),
    P('samsung','Samsung Research',4,224),P('sk-telecom','SK Telecom',4,8),P('kakao','Kakao',4,46),
    P('upstage','Upstage',4,260),P('sarvam','Sarvam AI',4,28),P('krutrim','Krutrim',4,200),
    P('aleph-alpha','Aleph Alpha',4,12),P('lighton','LightOn',4,300),P('yandex','Yandex',4,0),
    P('sber','Sber',4,150),P('ai2','Allen Institute AI2',4,196),P('eleutherai','EleutherAI',4,270),
    P('bigscience','BigScience',4,40),P('bigcode','BigCode',4,160),P('baai','BAAI',4,214),
  ];
  const provByKey=Object.fromEntries(providers.map(p=>[p.key,p]));
  function provColor(key){const p=provByKey[key];const hue=p?p.hue:220;return `oklch(0.62 0.13 ${hue})`;}
  function provInitials(key){const p=provByKey[key];return (p?p.name:key).replace(/[^A-Za-z0-9]/g,' ').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
  function toBadge(id){const [prov,name]=id.split('/');return {fullId:id,prov,name,color:provColor(prov),initials:provInitials(prov),provName:(provByKey[prov]||{}).name||prov};}

  /* ---------- MODELS ---------- */
  const M=(id,provider,family,base)=>({id,provider,family,base});
  const modelDefs=[
    M('gpt-5','openai','GPT-5',97),M('gpt-5-mini','openai','GPT-5',88),M('o4','openai','o-series',93),M('gpt-4.1','openai','GPT-4',82),
    M('claude-opus-4.1','anthropic','Claude 4',98),M('claude-sonnet-4','anthropic','Claude 4',91),M('claude-haiku-4','anthropic','Claude 4',79),
    M('gemini-2.5-pro','google','Gemini 2.5',95),M('gemini-2.5-flash','google','Gemini 2.5',85),M('gemini-flash-lite','google','Gemini 2.5',74),
    M('grok-4','xai','Grok 4',92),M('grok-4-mini','xai','Grok 4',80),
    M('llama-4-maverick','meta','Llama 4',86),M('llama-4-scout','meta','Llama 4',77),
    M('mistral-large-3','mistral','Mistral 3',84),M('magistral-medium','mistral','Magistral',81),
    M('deepseek-v3.2','deepseek','DeepSeek V3',89),M('deepseek-r1','deepseek','DeepSeek R1',90),
    M('qwen3-max','qwen','Qwen3',88),M('qwen3-235b','qwen','Qwen3',83),
    M('kimi-k2','moonshot','Kimi K2',85),M('glm-4.6','zhipu','GLM-4',82),
    M('minimax-m2','minimax','MiniMax M2',80),M('ernie-5','baidu','ERNIE 5',81),
    M('doubao-pro','bytedance','Doubao',79),M('hunyuan-large','tencent','Hunyuan',76),
    M('command-a','cohere','Command',75),M('jamba-2','ai21','Jamba',71),
    M('phi-5','microsoft','Phi-5',73),M('nemotron-4-340b','nvidia','Nemotron',74),
    M('nova-pro','amazon','Nova',72),M('yi-large','01-ai','Yi',70),
    M('step-3','stepfun','Step-3',69),M('granite-4','ibm','Granite',66),
    M('reka-flash-3','reka','Reka',68),M('falcon-3','tii','Falcon',64),
    M('olmo-3','ai2','OLMo',61),M('mai-1','microsoft','MAI',70),
  ];
  const fmtId=(m)=>m.provider+'/'+m.id;
  const trend=(rng)=>{let v=0;return Array.from({length:14},()=>{v+=(rng()-0.45)*2.4;return v;});};
  let models=modelDefs.map((m)=>{
    const rng=mulberry32(seedFrom(m.provider+m.id));
    const base=m.base;
    const elo=Math.round(1300+base*7.4+(rng()-0.5)*60);
    const winRate=Math.min(0.93,Math.max(0.30,base/100*0.78+0.12+(rng()-0.5)*0.07));
    const gamesPlayed=Math.round(900+rng()*3600+base*22);
    const score=Math.round(base*9.2+(rng()-0.5)*40+80);
    const t=trend(rng);
    const delta=+(t[t.length-1]-t[t.length-4]).toFixed(1);
    return {id:fmtId(m),short:m.id,provider:m.provider,family:m.family,elo,winRate:+winRate.toFixed(3),games:gamesPlayed,score,trend:t,delta,reasoning:rng()>0.45};
  });
  // Interval grammar: 80% credible interval; sparser sample => visibly wider band.
  models.forEach(m=>{
    const spread=Math.round(45+130*(1-Math.min(1,m.games/4200)));
    m.p50=m.score; m.p10=clamp(m.score-spread,0,1000); m.p90=clamp(m.score+spread,0,1000);
    m.lowerBound=m.p10; m.spread=spread;
    m.sparse=m.games<1500;                 // wide band + "verified entry pending" affordance
  });
  // Rank by the CONSERVATIVE posterior lower bound (not the mean). This is what makes
  // "rank 2 shows a higher score than rank 1" read as rigor, not a bug.
  models.sort((a,b)=>b.lowerBound-a.lowerBound);
  models.forEach((m,i)=>{m.rank=i+1; const b=toBadge(m.id); m.prov=b.prov; m.name=b.name; m.provColor=b.color; m.provInitials=b.initials; m.provName=b.provName;});
  const modelById=Object.fromEntries(models.map(m=>[m.id,m]));
  const byScore=[...models].sort((a,b)=>b.score-a.score);

  function topByCategory(cat,n=8){
    const scored=models.map(m=>{
      const rng=mulberry32(seedFrom(m.id+cat));
      const catScore=Math.round(clamp(m.score+(rng()-0.4)*90,0,1000));
      const sp=Math.round(45+130*(1-Math.min(1,m.games/4200))+ (rng()*20));
      return {...m,score:catScore,p50:catScore,p10:clamp(catScore-sp,0,1000),p90:clamp(catScore+sp,0,1000),lowerBound:clamp(catScore-sp,0,1000),spread:sp,catWr:Math.min(0.95,Math.max(0.3,m.winRate+(rng()-0.5)*0.12))};
    }).sort((a,b)=>b.lowerBound-a.lowerBound).slice(0,n);
    scored.forEach((m,i)=>m.rank=i+1);
    return scored;
  }

  /* ---------- CATEGORY LENSES (M2) ---------- */
  const catCounts={Board:16,Card:17,Strategy:5,RL:12};
  const catVerified={Board:12,Card:9,Strategy:3,RL:6}; // honest partial coverage
  function tieFlags(rows){ // rows[i].tiedNext = overlaps row i+1
    for(let i=0;i<rows.length-1;i++){const a=rows[i],b=rows[i+1];rows[i].tiedNext=Math.min(a.p90,b.p90)>=Math.max(a.p10,b.p10);}
  }
  const overallTop=models.slice(0,8).map(m=>({...m}));
  tieFlags(overallTop);
  const distinctProviders=new Set(models.map(m=>m.provider)).size;
  const lens={
    all:{rows:overallTop,scope:'Overall',coverage:`${models.length} models across ${distinctProviders} providers`,verified:null},
  };
  ['Board','Card','Strategy','RL'].forEach(c=>{
    const rows=topByCategory(c,8); tieFlags(rows);
    lens[c]={rows,scope:c,coverage:`${catVerified[c]} of ${catCounts[c]} games verified`,verified:catVerified[c],total:catCounts[c]};
  });

  /* ---------- CHAMPIONS (marquee) — clamped official score + interval ---------- */
  const MARQUEE=['chess','go','no-limit-texas-holdem','connect-four','othello','hex','liars-dice','gomoku'];
  function championFor(slug){
    let best=null;
    models.forEach(m=>{
      const rng=mulberry32(seedFrom(m.id+'|'+slug));
      const s=clamp(Math.round(620+ (m.score-600)*0.62 + (rng()-0.5)*90),0,1000);
      const wr=Math.min(0.94,Math.max(0.5,m.winRate+(rng()-0.5)*0.08));
      const n=Math.round(140+rng()*120);
      if(!best||s>best.score) best={id:m.id,score:s,wr:+wr.toFixed(3),n};
    });
    const sp=Math.round(28+34*(1-Math.min(1,best.n/240)));
    best.p10=clamp(best.score-sp,0,1000); best.p90=clamp(best.score+sp,0,1000); best.spread=sp;
    const b=toBadge(best.id); best.prov=b.prov; best.name=b.name; best.provColor=b.color; best.provInitials=b.initials; best.provName=b.provName;
    const g=games.find(x=>x.slug===slug); best.game=g.name; best.slug=slug; best.category=g.category;
    return best;
  }
  const champions=MARQUEE.map(championFor);

  /* ---------- BOARD FRAMES (living boards) ---------- */
  // Chess: apply the real UCI line to a start board -> full-board snapshots.
  const CHESS_START='rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR';
  const sq=(s)=>{const f=s.charCodeAt(0)-97;const r=+s[1];return (8-r)*8+f;};
  function chessFrames(uci){
    let b=CHESS_START.split(''); const out=[b.join('')];
    uci.forEach(mv=>{
      const from=sq(mv.slice(0,2)),to=sq(mv.slice(2,4)),pc=b[from];
      b[to]=pc; b[from]='.';
      if((pc==='K'||pc==='k')&&Math.abs((to%8)-(from%8))===2){ // castling: move rook
        const row=Math.floor(to/8); if(to%8===6){b[row*8+5]=b[row*8+7];b[row*8+7]='.';} else if(to%8===2){b[row*8+3]=b[row*8+0];b[row*8+0]='.';}
      }
      out.push(b.join(''));
    });
    return out;
  }
  const CHESS_UCI=['e2e4','c7c5','g1f3','d7d6','d2d4','c5d4','f3d4','g8f6','b1c3','a7a6','f1e2','e7e5','d4b3','f8e7','e1g1','e8g8','c1e3','c8e6'];
  // Connect Four: drop columns.
  function c4Frames(moves){let b=Array(42).fill(null);const out=[b.slice()];moves.forEach((c,i)=>{for(let r=5;r>=0;r--){if(!b[r*7+c]){b[r*7+c]=i%2===0?'R':'Y';break;}}out.push(b.slice());});return out;}
  const C4_MOVES=[3,3,4,2,4,4,2,5,2,2,5,1,3,3,5,1,0,1];
  // Tic-Tac-Toe: cell indices.
  function tttFrames(moves){let b=Array(9).fill(null);const out=[b.slice()];moves.forEach((cell,i)=>{b=b.slice();b[cell]=i%2===0?'X':'O';out.push(b.slice());});return out;}
  const TTT_MOVES=[4,0,8,2,6,1];
  // Othello: deterministic center-out growth (visual only).
  function othFrames(){
    const idx=(r,c)=>r*8+c; const around=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    let b=Array(64).fill('.'); b[idx(3,3)]='W';b[idx(3,4)]='B';b[idx(4,3)]='B';b[idx(4,4)]='W';
    const out=[b.slice()]; const rng=mulberry32(seedFrom('othello-hero'));
    for(let step=0;step<7;step++){
      const add=2+step; let placed=0, tries=0;
      while(placed<add&&tries<300){tries++;
        const r=Math.floor(rng()*8),c=Math.floor(rng()*8); if(b[idx(r,c)]!=='.')continue;
        const hasN=around.some(([dr,dc])=>{const nr=r+dr,nc=c+dc;return nr>=0&&nr<8&&nc>=0&&nc<8&&b[idx(nr,nc)]!=='.';});
        if(!hasN)continue; b[idx(r,c)]=rng()>0.5?'B':'W'; placed++;
      }
      out.push(b.slice());
    }
    return out;
  }
  const heroFeatures=[
    {kind:'chess',game:'chess',a:'openai/gpt-5',b:'xai/grok-4',delay:640,frames:chessFrames(CHESS_UCI)},
    {kind:'connect-four',game:'connect-four',a:'anthropic/claude-opus-4.1',b:'openai/gpt-5',delay:520,frames:c4Frames(C4_MOVES)},
    {kind:'othello',game:'othello',a:'xai/grok-4',b:'google/gemini-2.5-pro',delay:470,frames:othFrames()},
    {kind:'tic-tac-toe',game:'tic-tac-toe',a:'google/gemini-2.5-pro',b:'deepseek/deepseek-r1',delay:680,frames:tttFrames(TTT_MOVES)},
  ];
  heroFeatures.forEach(f=>{f.aBadge=toBadge(f.a);f.bBadge=toBadge(f.b);f.g=games.find(x=>x.slug===f.game);});

  /* ---------- POSTERS (M1) — static end-states + stakes ---------- */
  const cf=c4Frames(C4_MOVES), chf=chessFrames(CHESS_UCI), otf=othFrames(), ttf=tttFrames([4,0,8,2,6,3]);
  const posters=[
    {kind:'connect-four',game:'connect-four',status:'live',a:'anthropic/claude-opus-4.1',b:'openai/gpt-5',winner:null,freshness:'live',adv:0.58,stakes:'The lead has changed four times.',board:cf[cf.length-1]},
    {kind:'chess',game:'chess',status:'completed',a:'openai/gpt-5',b:'xai/grok-4',winner:'a',freshness:'11d ago',adv:0.72,stakes:'#1 meets #2 \u2014 first classical meeting.',board:chf[chf.length-1]},
    {kind:'othello',game:'othello',status:'completed',a:'google/gemini-2.5-pro',b:'xai/grok-4',winner:'a',freshness:'11d ago',adv:0.64,stakes:'A late corner swung the board.',board:otf[otf.length-1]},
    {kind:'tic-tac-toe',game:'tic-tac-toe',status:'completed',a:'google/gemini-2.5-pro',b:'deepseek/deepseek-r1',winner:'draw',freshness:'12d ago',adv:0.5,stakes:'Optimal play both sides \u2014 a clean draw.',board:ttf[ttf.length-1]},
  ];
  posters.forEach(p=>{p.aBadge=toBadge(p.a);p.bBadge=toBadge(p.b);p.g=games.find(x=>x.slug===p.game);});

  /* ---------- Providers tiering (compact strip uses tier 1) ---------- */
  const frontier=providers.filter(p=>p.tier===1).map(p=>({...p,color:provColor(p.key),initials:provInitials(p.key)}));

  const stats={games:games.length,providers:providers.length,models:models.length,stars:14237,matchesRun:1284910,verifiedMatches:41200};

  const catSlug={Board:'board-strategy',Card:'card-hidden-info',Strategy:'social-economic',RL:'control-arcade'};

  window.ES={
    games,providers,provByKey,provColor,provInitials,toBadge,
    models,modelById,byScore,topByCategory,
    lens,champions,MARQUEE,heroFeatures,posters,frontier,stats,
    gameBySlug:Object.fromEntries(games.map(g=>[g.slug,g])),
    categories:['Board','Card','Strategy','RL'],
    categoryLabels:{Board:'Board & Strategy',Card:'Card & Hidden-Info',Strategy:'Social & Economic',RL:'Control & Arcade'},
    catShort:{Board:'Board & Strategy',Card:'Card & Hidden-Info',Strategy:'Social & Economic',RL:'Control & Arcade'},
    catSlug,
  };
})();
