/* ============================================================
   eSlams — Arena (rebuilt)
   Consumer-grade flow:
     SETUP  → battle stage: animated game preview + You vs Model,
              5-col game rail, vertical model wheel + see-all modal
     PLAY   → match dashboard: combatant bar, live board, controls
     RESULT → outcome screen
   ============================================================ */

/* ---------- difficulty (scenario level) selector — unused in Arena (kept for reuse) ---------- */
function LevelPick({ value, onChange }){
  return (
    <div className="seg ar-levelseg">
      {ES.levels.map(l=>(
        <button key={l.key} className={value===l.key?'active':''} onClick={()=>onChange(l.key)}>{l.label}</button>
      ))}
    </div>
  );
}

/* ---------- vertical model wheel ---------- */
function ModelWheel({ models, value, onChange, onSeeAll, hideHead }){
  const ref = useRef(null);
  const idx = models.findIndex(m=>m.id===value);
  const scrollTo = (i)=>{ const el=ref.current; if(!el)return; const row=el.children[i]; if(row) el.scrollTo({ top: row.offsetTop - el.clientHeight/2 + row.clientHeight/2, behavior:'smooth' }); };
  useEffect(()=>{ if(idx>=0) scrollTo(idx); },[value]);
  return (
    <div className="ar-wheel">
      {!hideHead && (
      <div className="ar-wheel-head">
        <span className="ar-wheel-title">Opponent</span>
        <button className="ar-wheel-all" onClick={onSeeAll}>All {ES.models.length} <Icon name="chevronRight" size={13}/></button>
      </div>
      )}
      <div className="ar-wheel-view">
        <div className="ar-wheel-sel" aria-hidden="true" />
        <div className="ar-wheel-scroll" ref={ref}>
          {models.map((m,i)=>(
            <button key={m.id} className={`ar-wheel-row ${m.id===value?'on':''}`} onClick={()=>onChange(m.id)}>
              <ProviderDot provider={m.provider} size={26} />
              <span className="ar-wheel-info">
                <span className="ar-wheel-name mono">{m.short}</span>
                <span className="ar-wheel-prov">{ES.provByKey[m.provider].name}</span>
              </span>
              <span className="ar-wheel-elo mono">{m.elo}</span>
            </button>
          ))}
        </div>
        <div className="ar-wheel-fade ar-wheel-fade-t" />
        <div className="ar-wheel-fade ar-wheel-fade-b" />
      </div>
    </div>
  );
}

/* ---------- see-all models modal ---------- */
function AllModelsModal({ open, onClose, value, onPick }){
  const [q,setQ]=useState(''); const [tier,setTier]=useState('all');
  useEffect(()=>{ const h=e=>{ if(e.key==='Escape')onClose(); }; if(open) document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h); },[open,onClose]);
  if(!open) return null;
  const list = ES.models.filter(m=>{
    if(tier!=='all' && ES.provByKey[m.provider].tier!==+tier) return false;
    if(q && !(m.id.toLowerCase().includes(q.toLowerCase())||ES.provByKey[m.provider].name.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal am-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title"><Icon name="cpu" size={17}/> Choose your opponent</div>
          <button className="modal-x" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div className="am-tools">
          <div className="search-wrap am-search"><Icon name="search" size={15}/><input className="input input-search" placeholder="Search models or providers…" value={q} onChange={e=>setQ(e.target.value)} autoFocus/></div>
          <div className="seg am-tierseg">
            <button className={tier==='all'?'active':''} onClick={()=>setTier('all')}>All tiers</button>
            <button className={tier==='1'?'active':''} onClick={()=>setTier('1')}>Frontier</button>
            <button className={tier==='2'?'active':''} onClick={()=>setTier('2')}>Major</button>
            <button className={tier==='3'?'active':''} onClick={()=>setTier('3')}>Enterprise</button>
          </div>
        </div>
        <div className="am-grid">
          {list.map(m=>(
            <button key={m.id} className={`am-card ${m.id===value?'on':''}`} onClick={()=>{ onPick(m.id); onClose(); }}>
              <div className="am-card-top"><ProviderDot provider={m.provider} size={28}/>{m.id===value && <span className="am-check"><Icon name="check" size={13}/></span>}</div>
              <div className="am-card-name mono">{m.short}</div>
              <div className="am-card-prov">{ES.provByKey[m.provider].name}</div>
              <div className="am-card-stats mono"><span>{m.elo} Elo</span><span className="am-dot">·</span><span>{(m.winRate*100).toFixed(0)}%</span></div>
            </button>
          ))}
          {list.length===0 && <div className="am-empty mono">No models match “{q}”.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- combatant card ---------- */
function Combatant({ side, name, sub, provider, avatar, active, score, you }){
  return (
    <div className={`ar-fighter ar-fighter-${side} ${active?'ar-fighter-active':''}`}>
      <div className="ar-fighter-av">
        {you ? <span className="ar-fighter-you">YOU</span> : <ProviderDot provider={provider} size={40}/>}
      </div>
      <div className="ar-fighter-meta">
        <span className="ar-fighter-name mono">{name}</span>
        <span className="ar-fighter-sub">{sub}</span>
      </div>
      {score!==undefined && <span className="ar-fighter-score mono">{score}</span>}
    </div>
  );
}

/* ============================================================
   SETUP — battle stage
   ============================================================ */
function ArenaSetup({ game, setGame, modelId, setModelId, onStart }){
  const [cat,setCat]=useState('all');
  const [allOpen,setAllOpen]=useState(false);
  const model = ES.modelById[modelId];
  const wheelModels = useMemo(()=>ES.models.slice(0,16),[]);
  const playable = !!PLAYABLE[game?.slug];

  const gamesList = cat==='all' ? ES.games : ES.games.filter(g=>g.category===cat);
  const username = ES.profile.username;

  return (
    <div className="ar2">
      <div className="ar2-top">
      {/* ---- left: YOU vs MODEL matchup hero ---- */}
      <div className="ar2-hero">
        <div className="ar2-hero-glow" aria-hidden="true" />
        <div className="ar2-hero-game mono">{game.name} · <span className="ar2-hero-var">{game.variant}</span></div>
        <div className="ar2-preview" key={game.slug}>{getArenaPreview(game)}</div>
        <div className="ar2-matchup">
          <div className="ar2-fighter">
            <span className="ar2-you-av"><Icon name="user" size={26}/></span>
            <span className="ar2-fname mono">{username}</span>
            <span className="ar2-fsub">Challenger</span>
          </div>
          <div className="ar2-vsbadge"><span className="mono">VS</span></div>
          <div className="ar2-fighter">
            <span className="ar2-model-av"><ProviderDot provider={model.provider} size={56}/></span>
            <span className="ar2-fname mono">{model.short}</span>
            <span className="ar2-fsub">{ES.provByKey[model.provider].name} · public model</span>
          </div>
        </div>
      </div>

      {/* ---- right: model scroller + start ---- */}
      <div className="ar2-control">
        <div className="ar2-control-l">
          <div className="ar2-control-h">
            <span className="ar2-control-title">Choose your opponent</span>
            <button className="ar2-allbtn" onClick={()=>setAllOpen(true)}>All {ES.models.length} models <Icon name="chevronRight" size={12}/></button>
          </div>
          <div className="ar2-wheelwrap">
            <ModelWheel models={wheelModels} value={modelId} onChange={setModelId} onSeeAll={()=>setAllOpen(true)} hideHead />
          </div>
        </div>
        <div className="ar2-control-r">
          <Button variant="primary" size="lg" icon="play" className="ar2-start" onClick={onStart}>Start game</Button>
          {playable
            ? <span className="ar2-ready mono"><span className="ar2-readydot" /> {game.name} ready to play</span>
            : <span className="ar2-demo mono"><Icon name="bolt" size={12}/> demo board — full play rolling out</span>}
        </div>
      </div>
      </div>

      {/* ---- below: select your arena ---- */}
      <div className="ar2-arenas">
        <div className="ar2-arenas-head">
          <div className="ar2-arenas-title">
            <h3>Select your arena</h3>
            <span className="ar2-count mono">{ES.games.length} arenas</span>
          </div>
          <div className="seg ar2-catseg">
            <button className={cat==='all'?'active':''} onClick={()=>setCat('all')}>All</button>
            {ES.categories.map(c=>(<button key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>))}
          </div>
        </div>
        <div className="ar2-grid">
          {gamesList.map(g=>(
            <button key={g.slug} className={`ar2-gtile ${game.slug===g.slug?'on':''}`} onClick={()=>setGame(g)}>
              {game.slug===g.slug && <span className="ar2-gtile-active mono">Active</span>}
              <span className="ar2-gtile-icon"><GameGlyph slug={g.slug} category={g.category} size={24}/></span>
              <span className="ar2-gtile-name">{g.name}</span>
              <span className="ar2-gtile-var mono">{g.variant}</span>
            </button>
          ))}
        </div>
      </div>

      <AllModelsModal open={allOpen} onClose={()=>setAllOpen(false)} value={modelId} onPick={setModelId} />
    </div>
  );
}

/* ============================================================
   PLAY — match dashboard
   ============================================================ */
function ArenaPlay({ game, modelId, onEnd, onQuit }){
  const model = ES.modelById[modelId];
  const [moves,setMoves]=useState(0);
  const Comp = PLAYABLE[game.slug];
  const gElo = ES.gameBreakdown(modelId).find(x=>x.slug===game.slug)?.elo || model.elo;

  return (
    <div className="ar-play">
      <div className="ar-play-bar">
        <button className="ar-quit" onClick={onQuit}><Icon name="chevronLeft" size={16}/> Exit</button>
        <div className="ar-play-fighters">
          <span className="ar-pf ar-pf-you"><span className="ar-pf-badge">YOU</span></span>
          <span className="ar-pf-vs mono">vs</span>
          <span className="ar-pf ar-pf-model"><ProviderDot provider={model.provider} size={22}/><span className="mono">{model.short}</span><span className="ar-pf-elo mono">{gElo}</span></span>
        </div>
        <div className="ar-play-meta mono">
          <span className="ar-play-game">{game.name}</span>
          <span className="ar-play-mv">move {moves}</span>
        </div>
      </div>

      <div className="ar-play-board">
        {Comp ? (
          <Comp model={modelId} onEnd={onEnd} onMove={()=>setMoves(m=>m+1)} />
        ) : (
          <DemoPlay game={game} model={model} onEnd={onEnd} onMove={()=>setMoves(m=>m+1)} />
        )}
      </div>
    </div>
  );
}

/* demo step-through for not-yet-wired games */
function DemoPlay({ game, model, onEnd, onMove }){
  const [n,setN]=useState(0);
  return (
    <div className="ar-demo">
      <div className="ar-demo-board">{getArenaPreview(game)}</div>
      <div className="ar-demo-note">
        <p className="mono ar-demo-title">{game.name} runs on the eSlams Core engine</p>
        <p className="ar-demo-text">Interactive play for this arena is rolling out. Watch real matches in the Battlefield, or step a sample below.</p>
        <div className="ar-demo-actions">
          <Button variant="secondary" size="sm" icon="swords" href="#/battlefield">Watch in Battlefield</Button>
          <Button variant="primary" size="sm" iconRight="arrowRight" onClick={()=>onEnd(['win','loss','draw'][Math.floor(Math.random()*3)])}>Simulate result</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RESULT
   ============================================================ */
function ArenaResult({ game, modelId, result, onAgain, onNew }){
  const model = ES.modelById[modelId];
  const map={ win:{t:'You won',ic:'trophy',cls:'win',sub:`You beat ${model.short}. Saved to your profile.`}, loss:{t:'You lost',ic:'flag',cls:'loss',sub:`${model.short} took this one. Run it back?`}, draw:{t:'Draw',ic:'swords',cls:'draw',sub:`Even match with ${model.short}.`} };
  const r=map[result]||map.draw;
  return (
    <div className="ar-result">
      <div className={`ar-result-card ar-result-${r.cls}`}>
        <div className="ar-result-ic"><Icon name={r.ic} size={30}/></div>
        <h2 className="ar-result-t">{r.t}</h2>
        <div className="ar-result-vs">
          <span className="ar-pf-badge">YOU</span>
          <span className={`ar-result-chip reschip reschip-${r.cls}`}>{result==='win'?'W':result==='loss'?'L':'D'}</span>
          <ModelBadge id={modelId} size={13}/>
        </div>
        <p className="ar-result-sub">{r.sub}</p>
        <div className="ar-result-meta">
          <div className="ar-rm"><span className="ar-rm-l">Game</span><span className="ar-rm-v">{game.name}</span></div>
          <div className="ar-rm"><span className="ar-rm-l">Opponent Elo</span><span className="ar-rm-v mono">{ES.gameBreakdown(modelId).find(x=>x.slug===game.slug)?.elo||model.elo}</span></div>
          <div className="ar-rm"><span className="ar-rm-l">Saved to</span><a className="ar-rm-v ar-rm-link" href="#/u/makriman">your profile</a></div>
        </div>
        <div className="ar-result-actions">
          <Button variant="primary" icon="refresh" onClick={onAgain}>Play again</Button>
          <Button variant="secondary" icon="gamepad" onClick={onNew}>New match</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT
   ============================================================ */
function Arena(){
  const [phase,setPhase]=useState('setup'); // setup | play | result
  const [game,setGame]=useState(ES.gameBySlug['connect-four']);
  const [modelId,setModelId]=useState(ES.models[0].id);
  const [result,setResult]=useState(null);

  const start=()=>{ setResult(null); setPhase('play'); };
  const end=(r)=>{ setResult(r); setTimeout(()=>setPhase('result'), 700); };

  return (
    <div className="page arena2">
      <div className="wrap arena2-wrap">
        <div className="arena2-head">
          <div>
            <h1 className="page-title">Arena</h1>
            <p className="page-desc">Play a frontier model, head-to-head. Pick a game, choose your opponent, and go.</p>
          </div>
          <a className="arena2-hvm" href="#/leaderboard"><Icon name="trophy" size={15}/> Human vs Model board</a>
        </div>

        {phase==='setup' && <ArenaSetup game={game} setGame={setGame} modelId={modelId} setModelId={setModelId} onStart={start} />}
        {phase==='play' && <ArenaPlay key={game.slug+modelId+(result||'')} game={game} modelId={modelId} onEnd={end} onQuit={()=>setPhase('setup')} />}
        {phase==='result' && <ArenaResult game={game} modelId={modelId} result={result} onAgain={start} onNew={()=>setPhase('setup')} />}
      </div>
    </div>
  );
}
Object.assign(window, { Arena });
