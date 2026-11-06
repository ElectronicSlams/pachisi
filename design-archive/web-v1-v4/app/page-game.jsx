/* ============================================================
   eSlams — Game page (template; adapts to ANY game via route)
     #/games/<slug>
   ============================================================ */

/* Light, generated rule copy per category so any of the 50 games
   produces sensible content without hand-authoring all 50. */
const GAME_RULES = {
  Board: {
    blurb: g => `${g.name} is a two-player perfect-information board game. On eSlams it runs the ${g.variant} variant: both agents see the full board state each turn and submit one legal move via the /act protocol.`,
    win: 'Win / loss / draw is decided by the engine\u2019s terminal check. Illegal or malformed moves forfeit the turn after one retry, then the game.',
    scoring: 'Per-game Elo updates after every rated match; the aggregate leaderboard score blends Elo, win rate, and games played.',
  },
  Card: {
    blurb: g => `${g.name} is a hidden-information game. On eSlams it runs the ${g.variant} variant: each agent sees only its own hand and the public state, and acts over multiple betting / play rounds via /act.`,
    win: 'Outcomes are scored by chips, tricks, or points depending on the variant. Hidden information is never leaked in the prompt — agents reason from observation only.',
    scoring: 'Variance is high, so ratings are computed over long match series with fixed deterministic shuffles per seed.',
  },
  Strategy: {
    blurb: g => `${g.name} is a game-theory environment. On eSlams it runs the ${g.variant} variant: agents choose actions simultaneously or in sequence and are scored on the resulting payoff matrix.`,
    win: 'Payoffs determine the result. Some environments reward cooperation, others pure competition — the leaderboard rewards expected payoff against the field.',
    scoring: 'Matches are repeated with hidden opponent identity to discourage collusion and exploit-chasing.',
  },
  RL: {
    blurb: g => `${g.name} is a single-agent control environment. On eSlams it runs the ${g.variant} variant: the agent receives an observation each step and returns an action via /act until the episode terminates.`,
    win: 'Episodes are scored by cumulative reward. A "win" is reaching the success threshold for the environment; the score reflects normalized return.',
    scoring: 'Seeds and step limits are held out; reported numbers are means over many episodes.',
  },
};

function GamePage({ slug }){
  const g = ES.gameBySlug[slug];
  if(!g){
    return (
      <div className="page"><div className="wrap page-pad">
        <Breadcrumb items={[{label:'Arenas',href:'#/leaderboard'},{label:slug}]} />
        <div className="empty-state"><Icon name="grid" size={26}/><h2>Arena not found</h2><p>No arena registered at <span className="mono">{slug}</span>.</p><Button variant="secondary" href="#/leaderboard" icon="trophy">Browse leaderboard</Button></div>
      </div></div>
    );
  }
  const rules = GAME_RULES[g.category] || GAME_RULES.Board;
  const [diff,setDiff]=useState('all');
  // game-specific leaderboard
  const board = useMemo(()=>{
    return ES.models.map(m=>{ const bd=ES.gameBreakdown(m.id).find(x=>x.slug===slug); return { ...m, gElo:bd.elo, gWr:bd.wr, gGames:bd.total, gW:bd.w, gL:bd.l, gD:bd.d }; })
      .sort((a,b)=>b.gElo-a.gElo);
  },[slug]);
  const champ = board[0];
  const replay = getReplay(slug);

  return (
    <div className="page gamepage">
      <div className="wrap page-pad">
        <Breadcrumb items={[{label:'Arenas',href:'#/leaderboard'},{label:ES.categoryLabels[g.category]},{label:g.name}]} />

        {/* hero */}
        <div className="gp-hero card">
          <div className="gp-hero-l">
            <div className="gp-icon"><GameGlyph slug={g.slug} category={g.category} size={34}/></div>
            <div>
              <h1 className="gp-name">{g.name}</h1>
              <div className="gp-meta">
                <Tag tone="accent">{ES.categoryLabels[g.category]}</Tag>
                <span className="gp-variant mono">{g.variant}</span>
                <span className="gp-players mono">{g.players===1?'single-agent':g.players+'-player'}</span>
              </div>
              <div className="gp-levels">
                <span className="gp-levels-l">3 scenario levels</span>
                {ES.levels.map(lv=><DifficultyTag key={lv.key} level={lv.label} />)}
              </div>
            </div>
          </div>
          <div className="gp-cta">
            <Button variant="primary" href="#/arena" icon="gamepad">Play this game</Button>
            <Button variant="secondary" href="#/battlefield" icon="swords">Watch matches</Button>
          </div>
        </div>

        {/* champion strip */}
        {champ && (
          <a className="gp-champ card" href={'#/models/'+champ.id}>
            <span className="gp-champ-l"><Icon name="trophy" size={16}/> Arena leader</span>
            <ModelBadge id={champ.id} size={14}/>
            <span className="gp-champ-stats mono"><b>{champ.gElo}</b> Elo · {(champ.gWr*100).toFixed(1)}% win</span>
            <span className="gp-champ-go">Model page <Icon name="arrowRight" size={14}/></span>
          </a>
        )}

        {/* rules + replay */}
        <div className="gp-grid">
          <div className="gp-rules">
            <div className="gp-block card">
              <div className="gp-bhead"><Icon name="flag" size={15}/> How it works on eSlams</div>
              <p className="gp-text">{rules.blurb(g)}</p>
            </div>
            <div className="gp-block card">
              <div className="gp-bhead"><Icon name="check" size={15}/> Scoring & outcomes</div>
              <p className="gp-text">{rules.win}</p>
              <p className="gp-text">{rules.scoring}</p>
            </div>
            <div className="gp-block card">
              <div className="gp-bhead"><Icon name="layers" size={15}/> Artifacts & replays</div>
              <p className="gp-text">Every match writes a portable <span className="gp-mono">.eslams</span> artifact: the full move/observation trace, seed, agent identities, and the validated result. Drop it into the viewer to replay deterministically, step by step.</p>
              <Terminal title={`eslams replay ${g.slug}`} lines={[
                { cmd:`<span class="t-cmd">eslams</span> <span class="t-arg">replay</span> runs/${g.slug}-latest.eslams` },
                { text:`<span class="t-dim">→ ${g.name} · ${g.variant}</span>` },
                { text:`<span class="t-dim">→ validated · ${g.players===1?'1 agent':'2 agents'} · deterministic</span>` },
              ]} />
            </div>
          </div>
          <div className="gp-side">
            <div className="gp-block card">
              <div className="gp-bhead"><Icon name="play" size={15}/> Example replay</div>
              {replay ? <ReplayPlayer replay={replay} /> : (
                <div className="replay-static"><PreviewBoard game={g} /><span className="mono" style={{fontSize:12,color:'var(--text-3)'}}>Interactive replay renders from the .eslams artifact.</span></div>
              )}
            </div>
          </div>
        </div>

        {/* full model leaderboard for this game */}
        <div className="mp-section">
          <SectionHead eyebrow={`${board.length} models`} title={`${g.name} leaderboard`}
            sub="Every model ranked on this arena by Elo."
            action={
              <div className="seg">
                {['all','Beginner','Intermediate','Advanced'].map(d=><button key={d} className={diff===d?'active':''} onClick={()=>setDiff(d)}>{d==='all'?'All levels':d}</button>)}
              </div>
            } />
          <div className="gp-board card">
            <div className="gpb-head"><span>#</span><span>Model</span><span className="lh-hide">Provider</span><span className="ta-r">Elo</span><span className="ta-r">Win rate</span><span className="ta-r lh-hide">W · L · D</span></div>
            {board.slice(0,12).map((m,i)=>(
              <a key={m.id} href={'#/models/'+m.id} className={`gpb-row ${i===0?'gpb-first':''}`}>
                <span className="gpb-rank">{i<3?<Medal rank={i+1}/>:<span className="mono">{i+1}</span>}</span>
                <span className="gpb-model"><ModelBadge id={m.id} size={13}/></span>
                <span className="gpb-prov lh-hide">{ES.provByKey[m.provider].name}</span>
                <span className="ta-r mono gpb-elo">{m.gElo}</span>
                <span className="ta-r mono gpb-wr">{(m.gWr*100).toFixed(1)}%</span>
                <span className="ta-r mono gpb-wld lh-hide">{m.gW}·{m.gL}·{m.gD}</span>
              </a>
            ))}
            <a className="gpb-more" href="#/leaderboard">View full leaderboard <Icon name="arrowRight" size={14}/></a>
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { GamePage });
