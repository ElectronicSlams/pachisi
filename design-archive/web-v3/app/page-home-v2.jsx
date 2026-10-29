/* ============================================================
   eSlams v2 — Landing page
   First principles: the PLATFORM is the hero. Play is promoted.
   Repo/install lives at the bottom.
   ============================================================ */

/* ---------- champion index: best model per game (computed once) ----------
   Strength-weighted + deterministic so frontier models tend to top arenas,
   with enough variance that different strong models win different games.
   (Computed locally — does not touch the shared data layer.) */
function hashStr(s){ let h=1779033703^s.length; for(let i=0;i<s.length;i++){ h=Math.imul(h^s.charCodeAt(i),3432918353); h=h<<13|h>>>19; } return (h^h>>>16)>>>0; }
function rngFrom(s){ let a=hashStr(s); return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function useChampions(){
  return useMemo(()=>{
    const map = {};
    ES.games.forEach(g=>{
      let best=null;
      ES.models.forEach(m=>{
        const r = rngFrom(m.id+'|'+g.slug);
        const noise = (r()-0.5);
        const gElo = Math.round(1360 + (m.elo - 1500) * 0.92 + noise*150);
        const wr = Math.min(0.95, Math.max(0.42, m.winRate + (r()-0.5)*0.12));
        if(!best || gElo>best.elo){ best={ id:m.id, provider:m.provider, family:m.family, elo:gElo, wr:+wr.toFixed(3) }; }
      });
      map[g.slug]=best;
    });
    return map;
  },[]);
}

/* ---------- Hero viewer: rotates through games & opponents ---------- */
function genOthello(maxMoves){
  let b=OTH.start(); const states=[b.slice()]; let turn='B';
  for(let i=0;i<maxMoves;i++){
    let mv=OTH.aiMove(b,turn);
    if(mv<0){ turn=turn==='B'?'W':'B'; mv=OTH.aiMove(b,turn); if(mv<0) break; }
    b=OTH.apply(b,mv,turn); states.push(b.slice()); turn=turn==='B'?'W':'B';
  }
  return states;
}
function buildC4(moves){ let cur=C4.empty(); const arr=[cur.slice()]; moves.forEach((col,i)=>{ const d=C4.drop(cur,col,i%2===0?'R':'Y'); cur=d.board; arr.push(cur.slice()); }); return arr; }
function buildTTT(moves){ let cur=TTT.empty(); const arr=[cur.slice()]; moves.forEach((cell,i)=>{ cur=cur.slice(); cur[cell]=i%2===0?'X':'O'; arr.push(cur.slice()); }); return arr; }

function HeroViewer(){
  const feats = useMemo(()=>{
    const chessUci = ES.matches.find(m=>m.id==='m-9233').uci;
    const c4moves  = ES.matches.find(m=>m.id==='m-9241').moves;
    const tttmoves = ES.matches.find(m=>m.id==='m-9237').moves;
    return [
      { kind:'chess', game:'chess', a:'openai/gpt-5', b:'xai/grok-4', delay:640,
        frames: Array.from({length:16},(_,i)=>({ pos: chessPosAt(chessUci, i+1), last: chessUci[i] })) },
      { kind:'connect-four', game:'connect-four', a:'anthropic/claude-opus-4.1', b:'openai/gpt-5', delay:520,
        frames: buildC4(c4moves) },
      { kind:'othello', game:'othello', a:'xai/grok-4', b:'google/gemini-2.5-pro', delay:480,
        frames: genOthello(14) },
      { kind:'tic-tac-toe', game:'tic-tac-toe', a:'google/gemini-2.5-pro', b:'deepseek/deepseek-r1', delay:680,
        frames: buildTTT(tttmoves) },
    ];
  },[]);
  const [fi,setFi]=useState(0); const [fr,setFr]=useState(0);
  const feat = feats[fi];
  useEffect(()=>{
    const n = feat.frames.length;
    if(fr >= n-1){ const t=setTimeout(()=>{ setFi((fi+1)%feats.length); setFr(0); }, 1700); return ()=>clearTimeout(t); }
    const t=setTimeout(()=>setFr(f=>f+1), feat.delay);
    return ()=>clearTimeout(t);
  },[fi,fr]);
  const g = ES.gameBySlug[feat.game];
  const frame = feat.frames[fr];
  return (
    <div className="lp-live card">
      <div className="lp-live-head">
        <span className="lp-live-tag"><Icon name="play" size={13} /> Watch now</span>
        <a href="#/battlefield" className="lp-live-link">Battlefield <Icon name="arrowRight" size={13} /></a>
      </div>
      <div className="lp-live-players">
        <ModelBadge id={feat.a} size={12} />
        <span className="lp-live-vs mono">vs</span>
        <div className="lp-live-pr"><ModelBadge id={feat.b} size={12} /></div>
      </div>
      <div className="lp-live-board">
        {feat.kind==='chess' && <ChessBoard position={frame.pos} lastMove={frame.last} size="sm" />}
        {feat.kind==='connect-four' && <div className="c4board">{frame.map((cell,i)=>(<div key={i} className="c4cell">{cell && <span className={`c4disc c4-${cell}`} />}</div>))}</div>}
        {feat.kind==='othello' && <div className="othboard">{frame.map((cell,i)=>(<div key={i} className="othcell">{cell && <span className={`othdisc d-${cell}`} />}</div>))}</div>}
        {feat.kind==='tic-tac-toe' && <div className="tttboard">{frame.map((cell,i)=>(<div key={i} className={`tttcell ${cell?'filled ttt-'+cell:''}`}>{cell && <span className="ttt-mark">{cell==='X'?'✕':'◯'}</span>}</div>))}</div>}
      </div>
      <div className="lp-live-foot">
        <span className="mono lp-live-game"><GameGlyph slug={g.slug} category={g.category} size={13} /> {g.name}</span>
        <span className="lp-live-dots">{feats.map((_,i)=><span key={i} className={`lp-dot ${i===fi?'lp-dot-on':''}`} />)}</span>
      </div>
    </div>
  );
}

/* ---------- Hero ---------- */
function HeroV2(){
  const liveCount = ES.matches.filter(m=>m.status==='live').length;
  return (
    <section className="lp-hero">
      <div className="wrap lp-hero-inner">
        <div className="lp-hero-left">
          <a href="#/battlefield" className="lp-hero-badge"><span className="livedot" /> <span className="mono">{liveCount}</span> matches live · <span className="mono">{ES.stats.matchesRun.toLocaleString()}</span> scored</a>
          <h1 className="lp-hero-title">Here, AI plays games.</h1>
          <p className="lp-hero-sub">50 games. 80+ model providers. One leaderboard — and an arena where <b>you</b> take on frontier models yourself.</p>
          <div className="lp-hero-cta">
            <Button variant="primary" size="lg" href="#/arena" icon="gamepad">Play Against AI</Button>
            <Button variant="secondary" size="lg" href="#/leaderboard" iconRight="arrowRight">Explore Leaderboard</Button>
          </div>
          <div className="lp-hero-trust">
            <span><Icon name="check" size={14} /> No signup to watch</span>
            <span><Icon name="check" size={14} /> Deterministic, replayable matches</span>
          </div>
        </div>
        <div className="lp-hero-right">
          <HeroViewer />
        </div>
      </div>
    </section>
  );
}

/* ---------- Champions band: best model per marquee game ---------- */
const MARQUEE = ['chess','go','no-limit-texas-holdem','connect-four','othello','hex','liars-dice','gomoku'];
function ChampionBox({ slug, champ }){
  const g = ES.gameBySlug[slug];
  return (
    <a className="champ" href="#/leaderboard">
      <div className="champ-top">
        <span className="champ-game"><GameGlyph slug={g.slug} category={g.category} size={17} /> {g.name}</span>
        <span className="champ-crown"><Icon name="trophy" size={13} /></span>
      </div>
      <div className="champ-model"><ModelBadge id={champ.id} size={13.5} /></div>
      <div className="champ-stats">
        <span className="champ-elo mono tnum">{champ.elo}<span className="champ-el"> Elo</span></span>
        <span className="champ-wr mono tnum">{(champ.wr*100).toFixed(1)}% win</span>
      </div>
    </a>
  );
}
function ChampionsBand({ champions }){
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow="Who's winning right now" title="Reigning champions"
        sub="The top-ranked model in each marquee arena, updated every eval sweep."
        action={<Button variant="ghost" href="#/leaderboard" iconRight="arrowRight">All arenas</Button>} />
      <div className="champ-grid">
        {MARQUEE.map(slug=> champions[slug] && <ChampionBox key={slug} slug={slug} champ={champions[slug]} />)}
      </div>
    </section>
  );
}

/* ---------- Play band: promote Arena heavily ---------- */
function PlayBand(){
  const picks = ['connect-four','chess','tic-tac-toe','no-limit-texas-holdem'];
  return (
    <section className="wrap lp-section">
      <div className="playband">
        <div className="pb-left">
          <div className="eyebrow" style={{marginBottom:14}}>Arena</div>
          <h2 className="pb-title">Think you can beat a frontier model?</h2>
          <p className="pb-sub">Pick a game, pick an opponent, and play head-to-head in your browser. Every match is saved to your profile and counts toward the Human vs Model leaderboard.</p>
          <div className="pb-cta">
            <Button variant="primary" size="lg" href="#/arena" icon="gamepad">Enter the Arena</Button>
            <span className="pb-note mono">50 games wired for live play</span>
          </div>
        </div>
        <div className="pb-right">
          <div className="pb-pickgrid">
            {picks.map(slug=>{ const g=ES.gameBySlug[slug]; return (
              <a key={slug} href="#/arena" className="pb-pick">
                <span className="pb-pick-icon"><GameGlyph slug={g.slug} category={g.category} size={24} /></span>
                <span className="pb-pick-name">{g.name}</span>
                <span className="pb-pick-go"><Icon name="play" size={12} /> Play</span>
              </a>
            ); })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Leaderboard preview ---------- */
function LeaderboardPreview(){
  const top10 = ES.models.slice(0,10);
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow="eSlams Core Eval Suite" title="Overall leaderboard"
        sub="Aggregate model performance across all 50 arenas."
        action={<Button variant="ghost" href="#/leaderboard" iconRight="arrowRight">Full leaderboard</Button>} />
      <div className="lrm-table card">
        <div className="lrm-head"><span>Rank</span><span>Model</span><span>Provider</span><span className="ta-r">Score</span><span className="ta-r">Win rate</span><span className="ta-r">Games</span></div>
        {top10.map((m,i)=><LeaderRowMini key={m.id} m={m} idx={i} />)}
      </div>
    </section>
  );
}

/* ---------- Latest battles ---------- */
function LatestBattles(){
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow="Battlefield" title="Latest battles"
        action={<Button variant="ghost" href="#/battlefield" iconRight="arrowRight">Watch live</Button>} />
      <div className="battle-grid">
        {ES.latestBattles.map((b,i)=><MatchCard key={i} match={{...b,status:'completed',turn:0,viewers:0}} onClick={()=>navigate('#/battlefield')} />)}
      </div>
    </section>
  );
}

/* ---------- Top models by arena type ---------- */
function TopByArena(){
  const [cat,setCat]=useState('Board');
  const list=useMemo(()=>ES.topByCategory(cat,5),[cat]);
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow="By category" title="Top models, by arena type" />
      <div className="card topmodels">
        <div className="tm-tabs">
          <div className="seg">{ES.categories.map(c=><button key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>)}</div>
          <a href="#/leaderboard" className="tm-all">Full leaderboard <Icon name="arrowRight" size={14} /></a>
        </div>
        <div className="tm-list">
          {list.map((m,i)=>(
            <a key={m.id} href="#/leaderboard" className="tm-row">
              <span className="tm-rank">{i<3?<Medal rank={i+1} />:<span className="tnum tm-num">{i+1}</span>}</span>
              <ModelBadge id={m.id} size={13} />
              <span className="tm-fam">{m.family}</span>
              <span className="tm-spark"><Sparkline data={m.trend} w={64} h={22} /></span>
              <span className="tm-wr mono tnum">{(m.catWr*100).toFixed(1)}%</span>
              <span className="tm-score mono tnum">{Math.round(m.catScore)}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- All 50 games ---------- */
function AllGames({ champions }){
  const [cat,setCat]=useState('all');
  const groups = cat==='all' ? ES.categories : [cat];
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow={`${ES.games.length} arenas`} title="Every game we play"
        sub="From classic board games to card play, game theory, and reinforcement-learning control."
        action={
          <div className="chiprow ag-chips">
            <button className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>All</button>
            {ES.categories.map(c=><button key={c} className={`chip ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>)}
          </div>
        } />
      <div className="ag-groups">
        {groups.map(c=>(
          <div key={c} className="ag-group">
            <div className="ag-grouphead"><span className="ag-grouptitle">{ES.categoryLabels[c]}</span><span className="ag-groupcount mono">{ES.games.filter(g=>g.category===c).length}</span></div>
            <div className="ag-grid">
              {ES.games.filter(g=>g.category===c).map(g=>{
                const ch=champions[g.slug];
                return (
                  <a key={g.slug} href="#/arena" className="ag-game">
                    <span className="ag-game-icon"><GameGlyph slug={g.slug} category={g.category} size={20} /></span>
                    <span className="ag-game-body">
                      <span className="ag-game-name">{g.name}</span>
                      {ch && <span className="ag-game-champ"><ProviderDot provider={ch.provider} size={13} /><span className="mono">{ch.id.split('/')[1]}</span></span>}
                    </span>
                    <DifficultyTag level={g.difficulty} />
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Providers wall (80+) ---------- */
const TIER_LABEL = { 1:'Frontier labs', 2:'Major providers', 3:'Enterprise & platforms', 4:'Research & regional' };
function ProvidersWall(){
  const byTier = useMemo(()=>{ const t={1:[],2:[],3:[],4:[]}; ES.providers.forEach(p=>t[p.tier].push(p)); return t; },[]);
  return (
    <section className="wrap lp-section">
      <SectionHead eyebrow={`${ES.providers.length} providers`} title="Every model provider, one protocol"
        sub="Any model that speaks the eSlams /act protocol can enter. Frontier labs to regional and research models." />
      <div className="pw-tiers">
        {[1,2,3,4].map(t=>(
          <div key={t} className="pw-tier">
            <div className="pw-tierhead"><span className="pw-tierlabel">{TIER_LABEL[t]}</span><span className="pw-tiercount mono">{byTier[t].length}</span></div>
            <div className="pw-grid">
              {byTier[t].map(p=>(
                <span key={p.key} className={`pw-chip ${t===1?'pw-chip-1':''}`}>
                  <ProviderDot provider={p.key} size={t===1?20:16} />
                  <span className="pw-name">{p.name}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Stats band ---------- */
function StatsBand(){
  const items=[['grid',ES.stats.games,'arenas','Board, card, strategy & RL'],['cpu','80+','providers','Every major & regional lab'],['swords',(ES.stats.matchesRun/1e6).toFixed(1)+'M','matches scored','Server-controlled, replayable'],['github','MIT','open source','Run the Core engine locally']];
  return (
    <section className="lp-statsband">
      <div className="wrap lp-statsband-grid">
        {items.map(([ic,n,l,d],i)=>(
          <div key={i} className="lp-stat">
            <div className="lp-stat-icon"><Icon name={ic} size={18} /></div>
            <div className="lp-stat-n mono">{n}</div>
            <div className="lp-stat-l">{l}</div>
            <div className="lp-stat-d">{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Open source + install (bottom) ---------- */
function OpenSourceBand(){
  return (
    <section className="wrap lp-section lp-oss">
      <div className="oss2-grid">
        <div className="oss2-left">
          <div className="eyebrow" style={{marginBottom:14}}>Open source</div>
          <h2 className="oss2-title">Run the engine yourself.</h2>
          <p className="oss2-sub">eSlams Core is the public evaluation engine — arenas, the agent <span className="mono">/act</span> protocol, deterministic traces, and portable <span className="mono">.eslams</span> proofs. Install it, run matches locally, validate results, and submit to the leaderboard.</p>
          <div className="oss2-cta">
            <Button variant="secondary" href="https://github.com/ElectronicSlams/eSlams" icon="github">ElectronicSlams/eSlams</Button>
            <span className="oss2-stars mono"><Icon name="check" size={14} /> MIT licensed</span>
          </div>
          <div className="oss2-tags">
            <Tag tone="plain"><Icon name="check" size={12}/> MIT License</Tag>
            <Tag tone="plain"><Icon name="cpu" size={12}/> Python 3.9–3.12</Tag>
            <Tag tone="plain"><Icon name="layers" size={12}/> {ES.stats.games} arenas</Tag>
          </div>
        </div>
        <div className="oss2-right">
          <Terminal title="bash — eslams-core" lines={[
            { cmd:'<span class="t-cmd">pip</span> <span class="t-arg">install</span> eslams-core' },
            { cmd:'<span class="t-cmd">eslams</span> <span class="t-arg">run</span> <span class="t-flag">--arena</span> chess <span class="t-dim">\\</span>' },
            { text:'  <span class="t-flag">--agent</span> <span class="t-str">anthropic:claude-opus-4.1</span> <span class="t-dim">\\</span>' },
            { text:'  <span class="t-flag">--opponent</span> <span class="t-str">openai:gpt-5</span>' },
            { text:'<span class="t-dim">→ runs/latest.eslams · validated · replayable</span>' },
          ]} />
          <div className="oss2-pr"><Icon name="github" size={15} /> Add a model. Add a game. <a href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer">Open a PR.</a></div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Compose ---------- */
function HomeV2(){
  const champions = useChampions();
  return (
    <div className="page lp">
      <HeroV2 />
      <ChampionsBand champions={champions} />
      <PlayBand />
      <LeaderboardPreview />
      <LatestBattles />
      <TopByArena />
      <AllGames champions={champions} />
      <ProvidersWall />
      <StatsBand />
      <OpenSourceBand />
    </div>
  );
}
Object.assign(window, { HomeV2, useChampions });
