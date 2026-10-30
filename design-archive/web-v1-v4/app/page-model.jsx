/* ============================================================
   eSlams — Model page + Provider page
   Template pages: read provider/model from the route and adapt
   to ANY model or provider. URLs:
     #/models/<provider>            → ProviderPage
     #/models/<provider>/<model>    → ModelPage
   ============================================================ */

function Breadcrumb({ items }){
  return (
    <nav className="crumb">
      {items.map((it,i)=>(
        <React.Fragment key={i}>
          {it.href ? <a href={it.href} className="crumb-link">{it.label}</a> : <span className="crumb-cur">{it.label}</span>}
          {i<items.length-1 && <Icon name="chevronRight" size={13} className="crumb-sep" />}
        </React.Fragment>
      ))}
    </nav>
  );
}

function StatTile({ label, value, sub, accent }){
  return (
    <div className={`stile ${accent?'stile-accent':''}`}>
      <div className="stile-v mono">{value}</div>
      <div className="stile-l">{label}</div>
      {sub && <div className="stile-sub mono">{sub}</div>}
    </div>
  );
}

function ModelPage({ provider, name }){
  const id = provider + '/' + name;
  const m = ES.modelById[id];
  if(!m){
    return (
      <div className="page"><div className="wrap page-pad">
        <Breadcrumb items={[{label:'Models',href:'#/leaderboard'},{label:id}]} />
        <div className="empty-state"><Icon name="cpu" size={26}/><h2>Model not found</h2><p>No model registered at <span className="mono">{id}</span>.</p><Button variant="secondary" href="#/leaderboard" icon="trophy">Browse leaderboard</Button></div>
      </div></div>
    );
  }
  const p = ES.provByKey[m.provider];
  const [sort,setSort]=useState('wr');
  const [cat,setCat]=useState('all');
  const breakdown = useMemo(()=>ES.gameBreakdown(id),[id]);
  const rows = useMemo(()=>{
    let r = breakdown.slice();
    if(cat!=='all') r = r.filter(g=>g.category===cat);
    return r.sort((a,b)=> sort==='wr'?b.wr-a.wr : sort==='elo'?b.elo-a.elo : a.rank-b.rank);
  },[breakdown,sort,cat]);
  const best = breakdown.slice().sort((a,b)=>b.wr-a.wr).slice(0,3);
  const catWr = ES.categories.map(c=>{ const gs=breakdown.filter(g=>g.category===c); const wr=gs.reduce((s,g)=>s+g.wr,0)/(gs.length||1); return {c,wr}; });
  const replayGames = breakdown.filter(g=>['chess','connect-four','tic-tac-toe','othello','go'].includes(g.slug)).slice(0,2);
  const [replaySlug,setReplaySlug]=useState(replayGames[0]?replayGames[0].slug:'connect-four');

  return (
    <div className="page modelpage">
      <div className="wrap page-pad">
        <Breadcrumb items={[{label:'Models',href:'#/leaderboard'},{label:p.name,href:'#/models/'+m.provider},{label:m.short}]} />

        {/* header */}
        <div className="mp-hero card">
          <div className="mp-hero-l">
            <div className="mp-bigbadge">
              <ProviderDot provider={m.provider} size={44} />
              <div>
                <div className="mp-id mono"><span className="mb-prov">{m.provider}/</span>{m.short}</div>
                <div className="mp-famrow"><span className="mb-fam">{m.family}</span> <a href={'#/models/'+m.provider} className="mp-provlink">{p.name} <Icon name="arrowUpRight" size={12}/></a></div>
              </div>
            </div>
            <div className="mp-overall">
              <span className="mp-rankbadge"><Medal rank={m.rank} />{m.rank>3 && <span className="mono mp-ranknum">#{m.rank}</span>}</span>
              <span className="mp-rankl">overall on eSlams</span>
            </div>
          </div>
          <div className="mp-tiles">
            <StatTile label="Score" value={m.score} accent />
            <StatTile label="Elo" value={m.elo} />
            <StatTile label="Win rate" value={(m.winRate*100).toFixed(1)+'%'} />
            <StatTile label="Games" value={m.games.toLocaleString()} />
          </div>
        </div>

        {/* overview: category strengths + trend + best arenas */}
        <div className="mp-overview">
          <div className="mp-ocard card">
            <div className="mp-ohead">Win rate by arena type</div>
            <div className="pf2-catbars">
              {catWr.map(({c,wr})=>(
                <div key={c} className="pf2-catbar">
                  <span className="pf2-catname">{ES.categoryLabels[c]}</span>
                  <span className="pf2-cattrack"><span className="pf2-catfill" style={{width:`${wr*100}%`}}/></span>
                  <span className="pf2-catpct">{(wr*100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mp-ocard card">
            <div className="mp-ohead">Score trend <span className="mp-trendd"><Delta value={m.delta} /></span></div>
            <div className="mp-trendbig"><Sparkline data={m.trend} w={260} h={70} /></div>
            <div className="mp-trendnote mono">last 14 eval sweeps</div>
          </div>
          <div className="mp-ocard card">
            <div className="mp-ohead">Strongest arenas</div>
            <div className="mp-best">
              {best.map(g=>(
                <a key={g.slug} href={'#/games/'+g.slug} className="mp-bestrow">
                  <span className="mp-bestgame"><GameGlyph slug={g.slug} category={g.category} size={15}/> {g.name}</span>
                  <span className="mp-bestwr mono">{(g.wr*100).toFixed(0)}%</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* featured replays */}
        <div className="mp-section">
          <SectionHead eyebrow="Game tape" title="Featured replays" sub={`How ${m.short} actually plays — stepped from stored .eslams artifacts.`} />
          <div className="mp-replaywrap card">
            <div className="mp-replaytabs">
              {replayGames.map(g=>(
                <button key={g.slug} className={`mp-rtab ${replaySlug===g.slug?'active':''}`} onClick={()=>setReplaySlug(g.slug)}>
                  <GameGlyph slug={g.slug} category={g.category} size={14}/> {g.name}
                </button>
              ))}
            </div>
            <ReplayPlayer key={replaySlug} replay={getReplay(replaySlug)||{kind:'connect-four',frames:rpBuildC4([3,3,2,4])}} />
          </div>
        </div>

        {/* per-game table */}
        <div className="mp-section">
          <SectionHead eyebrow="All 50 arenas" title="Per-game performance"
            action={
              <div className="mp-controls">
                <div className="chiprow">
                  <button className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>All</button>
                  {ES.categories.map(c=><button key={c} className={`chip ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>)}
                </div>
                <div className="seg"><button className={sort==='wr'?'active':''} onClick={()=>setSort('wr')}>Win rate</button><button className={sort==='elo'?'active':''} onClick={()=>setSort('elo')}>Elo</button><button className={sort==='rank'?'active':''} onClick={()=>setSort('rank')}>Rank</button></div>
              </div>
            } />
          <div className="mp-gametable card">
            <div className="mpg-head"><span>Arena</span><span className="lh-hide">Category</span><span className="ta-r">Elo</span><span className="ta-r">Win rate</span><span className="ta-r lh-hide">W · L · D</span><span className="ta-r">Rank</span><span></span></div>
            {rows.map(g=>(
              <a key={g.slug} href={'#/games/'+g.slug} className="mpg-row">
                <span className="mpg-game"><GameGlyph slug={g.slug} category={g.category} size={15}/> {g.name}</span>
                <span className="mpg-cat lh-hide"><Tag tone="plain">{g.category==='RL'?'RL':g.category}</Tag></span>
                <span className="ta-r mono mpg-elo">{g.elo}</span>
                <span className="ta-r mpg-wrcell"><span className="mono">{(g.wr*100).toFixed(0)}%</span><span className="mpg-bar"><span style={{width:`${g.wr*100}%`}}/></span></span>
                <span className="ta-r mono mpg-wld lh-hide">{g.w}·{g.l}·{g.d}</span>
                <span className={`ta-r mono mpg-rank ${g.rank<=3?'mpg-rank-top':''}`}>#{g.rank}</span>
                <span className="mpg-arrow"><Icon name="chevronRight" size={15}/></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderPage({ provider }){
  const p = ES.provByKey[provider];
  if(!p){
    return (
      <div className="page"><div className="wrap page-pad">
        <Breadcrumb items={[{label:'Models',href:'#/leaderboard'},{label:provider}]} />
        <div className="empty-state"><Icon name="cpu" size={26}/><h2>Provider not found</h2><p>No provider registered at <span className="mono">{provider}</span>.</p><Button variant="secondary" href="#/leaderboard" icon="trophy">Browse leaderboard</Button></div>
      </div></div>
    );
  }
  const models = ES.models.filter(m=>m.provider===provider).sort((a,b)=>a.rank-b.rank);
  const best = models[0];
  const avgWr = models.reduce((s,m)=>s+m.winRate,0)/(models.length||1);
  const totalGames = models.reduce((s,m)=>s+m.games,0);
  const TIER = {1:'Frontier lab',2:'Major provider',3:'Enterprise & platform',4:'Research / regional'};
  return (
    <div className="page providerpage">
      <div className="wrap page-pad">
        <Breadcrumb items={[{label:'Models',href:'#/leaderboard'},{label:p.name}]} />
        <div className="pp-hero card">
          <div className="pp-id">
            <ProviderDot provider={provider} size={52} />
            <div>
              <h1 className="pp-name">{p.name}</h1>
              <div className="pp-meta"><Tag tone="accent">{TIER[p.tier]}</Tag> <span className="pp-metac mono">{models.length} model{models.length!==1?'s':''} on eSlams</span></div>
            </div>
          </div>
          <div className="mp-tiles">
            <StatTile label="Best model" value={best?best.short:'—'} accent />
            <StatTile label="Top rank" value={best?'#'+best.rank:'—'} />
            <StatTile label="Avg win rate" value={(avgWr*100).toFixed(1)+'%'} />
            <StatTile label="Games played" value={totalGames.toLocaleString()} />
          </div>
        </div>

        <div className="mp-section">
          <SectionHead eyebrow={`${models.length} models`} title={`${p.name} on eSlams`} sub="Every model from this provider currently ranked on the Core Eval Suite." />
          {models.length===0 ? (
            <div className="empty-state small"><p>No ranked models yet for {p.name}. Models appear here once they complete a Core Eval sweep.</p></div>
          ) : (
            <div className="pp-models">
              {models.map(m=>(
                <a key={m.id} href={'#/models/'+m.id} className="pp-modelcard">
                  <div className="pp-mc-top">
                    <span className="pp-mc-rank">{m.rank<=3?<Medal rank={m.rank}/>:<span className="mono">#{m.rank}</span>}</span>
                    <span className="mb-fam">{m.family}</span>
                  </div>
                  <div className="pp-mc-name mono">{m.short}</div>
                  <div className="pp-mc-stats">
                    <span><b className="mono">{m.score}</b> score</span>
                    <span><b className="mono">{(m.winRate*100).toFixed(0)}%</b> win</span>
                    <span><b className="mono">{m.elo}</b> Elo</span>
                  </div>
                  <Sparkline data={m.trend} w={120} h={26} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ModelPage, ProviderPage, Breadcrumb, StatTile });
