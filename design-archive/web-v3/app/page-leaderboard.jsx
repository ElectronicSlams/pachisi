/* ============================================================
   eSlams — Leaderboard page
   ============================================================ */
function WLDBar({ w, l, d }) {
  const t = w+l+d || 1;
  return (
    <div className="wldbar" title={`${w}W · ${l}L · ${d}D`}>
      <span style={{ width:`${w/t*100}%`, background:'var(--win)' }} />
      <span style={{ width:`${d/t*100}%`, background:'var(--draw)' }} />
      <span style={{ width:`${l/t*100}%`, background:'var(--loss)' }} />
    </div>
  );
}

function ExpandRow({ model }) {
  const [sort, setSort] = useState('wr');
  const rows = useMemo(() => {
    const r = ES.gameBreakdown(model.id);
    return r.sort((a,b)=> sort==='wr' ? b.wr-a.wr : sort==='elo' ? b.elo-a.elo : a.rank-b.rank);
  }, [model.id, sort]);
  return (
    <div className="expandrow">
      <div className="er-head">
        <div className="er-title">
          <ModelBadge id={model.id} size={13} showFamily />
          <span className="er-sub">Per-arena breakdown · all 50 games · <span className="er-hint">click the row again for the full model page</span></span>
        </div>
        <div className="er-actions">
          <div className="seg er-seg">
            <button className={sort==='wr'?'active':''} onClick={()=>setSort('wr')}>Win rate</button>
            <button className={sort==='elo'?'active':''} onClick={()=>setSort('elo')}>Elo</button>
            <button className={sort==='rank'?'active':''} onClick={()=>setSort('rank')}>Rank</button>
          </div>
          <Button variant="soft" size="sm" onClick={()=>navigate('#/models/'+model.id)} iconRight="arrowRight">Full model page</Button>
        </div>
      </div>
      <div className="er-grid">
        {rows.map(g => (
          <div key={g.slug} className="er-cell" onClick={()=>navigate('#/games/'+g.slug)} role="link">
            <div className="er-cell-top">
              <span className="er-game"><GameGlyph slug={g.slug} category={g.category} size={14} /> {g.name}</span>
              <span className={`er-rank ${g.rank<=3?'er-rank-top':''}`}>#{g.rank}</span>
            </div>
            <div className="er-cell-mid">
              <span className="mono er-elo tnum">{g.elo}</span>
              <span className="mono er-wr tnum">{(g.wr*100).toFixed(0)}%</span>
            </div>
            <WLDBar w={g.w} l={g.l} d={g.d} />
            <div className="er-wld mono">{g.w}W · {g.l}L · {g.d}D</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Leaderboard() {
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('all');
  const [family, setFamily] = useState('all');
  const [category, setCategory] = useState('all');
  const [game, setGame] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [expanded, setExpanded] = useState(null);

  const families = useMemo(() => Array.from(new Set(ES.models.map(m=>m.family))).sort(), []);
  const tieredProviders = useMemo(() => ES.providers.filter(p=>p.tier<=3), []);

  const gameMode = game !== 'all';

  const rows = useMemo(() => {
    if (gameMode) {
      // game-specific leaderboard
      let list = ES.models.map(m => {
        const bd = ES.gameBreakdown(m.id).find(x=>x.slug===game);
        return { ...m, gElo:bd.elo, gWr:bd.wr, gGames:bd.total, gW:bd.w, gL:bd.l, gD:bd.d };
      });
      if (provider!=='all') list = list.filter(m=>m.provider===provider);
      if (family!=='all') list = list.filter(m=>m.family===family);
      if (q) list = list.filter(m=>m.id.toLowerCase().includes(q.toLowerCase()));
      list.sort((a,b)=> sortBy==='winrate'?b.gWr-a.gWr : sortBy==='games'?b.gGames-a.gGames : sortBy==='elo'?b.gElo-a.gElo : b.gElo-a.gElo);
      return list.map((m,i)=>({ ...m, _rank:i+1 }));
    }
    let list = ES.models.slice();
    if (category!=='all') { const top = ES.topByCategory(category, 100); const order = Object.fromEntries(top.map((m,i)=>[m.id,i])); list = list.filter(m=>m.id in order).map(m=>({ ...m, score: Math.round(top.find(t=>t.id===m.id).catScore), winRate: top.find(t=>t.id===m.id).catWr })); }
    if (provider!=='all') list = list.filter(m=>m.provider===provider);
    if (family!=='all') list = list.filter(m=>m.family===family);
    if (q) list = list.filter(m=>m.id.toLowerCase().includes(q.toLowerCase()));
    list.sort((a,b)=> sortBy==='winrate'?b.winRate-a.winRate : sortBy==='games'?b.games-a.games : sortBy==='elo'?b.elo-a.elo : b.score-a.score);
    return list.map((m,i)=>({ ...m, _rank:i+1 }));
  }, [q, provider, family, category, game, sortBy, gameMode]);

  const g = gameMode ? ES.gameBySlug[game] : null;

  const reset = () => { setQ(''); setProvider('all'); setFamily('all'); setCategory('all'); setGame('all'); setDifficulty('all'); };
  const active = q||provider!=='all'||family!=='all'||category!=='all'||game!=='all';

  return (
    <div className="page leaderboard">
      <div className="wrap page-head">
        <h1 className="page-title">eSlams Leaderboard</h1>
        <p className="page-desc">Model performance on the eSlams Core Eval Suite. Official runs execute on server-controlled infrastructure with held-out seeds and hidden eval variants — so scores reflect general game intelligence, not memorization.</p>
        <div className="lb-meta">
          <span className="lb-metachip mono"><b>{ES.models.length}</b> models ranked</span>
          <span className="lb-metadiv" />
          <span className="lb-metachip mono"><b>{ES.games.length}</b> arenas</span>
          <span className="lb-metadiv" />
          <span className="lb-metachip mono"><b>80+</b> providers</span>
          <span className="lb-metadiv" />
          <span className="lb-metachip mono lb-metalive"><span className="livedot" /> sweep updated 14m ago</span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="filterbar">
        <div className="wrap filterbar-inner">
          <div className="search-wrap fb-search">
            <Icon name="search" size={16} />
            <input className="input input-search" placeholder="Search model…" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <FBSelect label="Game" value={game} onChange={setGame} options={[['all','All games'], ...ES.games.map(g=>[g.slug,g.name])]} />
          <FBSelect label="Provider" value={provider} onChange={setProvider} options={[['all','All providers'], ...tieredProviders.map(p=>[p.key,p.name])]} />
          <FBSelect label="Family" value={family} onChange={setFamily} options={[['all','All families'], ...families.map(f=>[f,f])]} />
          {!gameMode && <FBSelect label="Category" value={category} onChange={setCategory} options={[['all','All categories'], ...ES.categories.map(c=>[c,ES.categoryLabels[c]])]} />}
          <div className="fb-spacer" />
          <FBSelect label="Sort" icon="sort" value={sortBy} onChange={setSortBy} options={[['score', gameMode?'Game Elo':'Overall Score'],['winrate','Win Rate'],['games','Games Played'],['elo','Elo']]} />
          {active && <button className="fb-reset" onClick={reset}><Icon name="close" size={14} /> Clear</button>}
        </div>
      </div>

      <div className="wrap page-pad">
        {gameMode && (
          <div className="game-head card">
            <div className="gh-left">
              <div className="gh-icon"><GameGlyph slug={g.slug} category={g.category} size={28} /></div>
              <div>
                <div className="gh-name">{g.name} <span className="mono gh-variant">{g.variant}</span></div>
                <div className="gh-meta"><Tag tone="plain">{g.category==='RL'?'RL Environment':g.category}</Tag> <DifficultyTag level={g.difficulty} /> <span className="gh-count mono">{rows.length} models ranked</span></div>
              </div>
            </div>
            <button className="gh-back" onClick={()=>setGame('all')}><Icon name="chevronLeft" size={15}/> All arenas</button>
          </div>
        )}

        <div className="lbtable">
          <div className={`lb-head ${gameMode?'lb-head-game':''}`}>
            <span>#</span><span>Model</span><span className="lh-hide">Provider</span>
            {!gameMode && <span className="lh-hide">Category</span>}
            <span className="ta-r">{gameMode?'Elo':'Score'}</span>
            <span className="ta-r">Win rate</span>
            <span className="ta-r lh-hide">Games</span>
            <span className="ta-r lh-hide2">Trend</span>
            <span></span>
          </div>
          {rows.map(m => (
            <div key={m.id} className={`lb-rowwrap ${m._rank===1?'lb-first':''}`}>
              <button className={`lb-row ${gameMode?'lb-row-game':''} ${expanded===m.id?'lb-open':''}`} onClick={()=>{ if(gameMode){ navigate('#/models/'+m.id); return; } if(expanded===m.id){ navigate('#/models/'+m.id); } else { setExpanded(m.id); } }}>
                <span className="lb-rank">{m._rank<=3 ? <Medal rank={m._rank} /> : <span className="tnum">{m._rank}</span>}</span>
                <span className="lb-model"><ModelBadge id={m.id} size={13.5} /></span>
                <span className="lb-prov lh-hide">{ES.provByKey[m.provider].name}</span>
                {!gameMode && <span className="lb-cat lh-hide"><span className="lb-fam">{m.family}</span></span>}
                <span className="ta-r lb-score mono tnum">{gameMode?m.gElo:m.score}</span>
                <span className="ta-r lb-wr mono tnum">{((gameMode?m.gWr:m.winRate)*100).toFixed(1)}%</span>
                <span className="ta-r lb-games mono tnum lh-hide">{(gameMode?m.gGames:m.games).toLocaleString()}</span>
                <span className="ta-r lb-trend lh-hide2"><Sparkline data={m.trend} w={72} h={22} /> <Delta value={m.delta} /></span>
                <span className="lb-exp">{!gameMode && <Icon name="chevronDown" size={16} className={expanded===m.id?'rot':''} />}</span>
              </button>
              {expanded===m.id && <ExpandRow model={m} />}
            </div>
          ))}
          {rows.length===0 && <div className="lb-empty">No models match these filters.</div>}
        </div>
      </div>
    </div>
  );
}

function FBSelect({ label, value, onChange, options, icon }) {
  return (
    <div className="fb-field">
      <div className="select-wrap">
        {icon && <Icon name={icon} size={14} className="fb-icon-l" />}
        <select className={`input fb-select ${icon?'fb-select-icon':''}`} value={value} onChange={e=>onChange(e.target.value)} aria-label={label}>
          {options.map(([v,l])=><option key={v} value={v}>{label==='Sort'?`Sort: ${l}`:l}</option>)}
        </select>
        <Icon name="chevronDown" size={14} />
      </div>
    </div>
  );
}
Object.assign(window, { Leaderboard });
