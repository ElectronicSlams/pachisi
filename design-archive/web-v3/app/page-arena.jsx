/* ============================================================
   eSlams — Arena page
   ============================================================ */
function ModelPicker({ game, value, onChange }){
  const [q,setQ]=useState('');
  const models = useMemo(()=>{
    return ES.models.map(m=>{ const bd=ES.gameBreakdown(m.id).find(x=>x.slug===game.slug); return { ...m, gElo:bd.elo, gWr:bd.wr }; })
      .sort((a,b)=>b.gElo-a.gElo)
      .filter(m=>!q||m.id.toLowerCase().includes(q.toLowerCase()));
  },[game.slug,q]);
  return (
    <div className="modelpicker">
      <div className="search-wrap mp-search"><Icon name="search" size={16}/><input className="input input-search" placeholder="Search model…" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="mp-list">
        {models.map((m,i)=>(
          <button key={m.id} className={`mp-row ${value===m.id?'mp-sel':''}`} onClick={()=>onChange(m.id)}>
            <span className="mp-rank tnum">{i+1}</span>
            <ModelBadge id={m.id} size={13} showFamily />
            <span className="mp-spark"><Sparkline data={m.trend} w={56} h={20}/></span>
            <span className="mp-elo mono tnum">{m.gElo}<span className="mp-ell">Elo</span></span>
            {value===m.id && <span className="mp-check"><Icon name="check" size={15}/></span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function HumanVsModel(){
  const [sort,setSort]=useState('hardest');
  const rows = useMemo(()=>{ const r=ES.humanVsModel.slice(); return sort==='hardest'?r.sort((a,b)=>a.humanWr-b.humanWr):r.sort((a,b)=>b.humanGames-a.humanGames); },[sort]);
  return (
    <div className="hvm">
      <SectionHead eyebrow="Arena" title="Human vs Model" sub="How often humans beat each model, per game. Can you do better?"
        action={<div className="seg"><button className={sort==='hardest'?'active':''} onClick={()=>setSort('hardest')}>Hardest</button><button className={sort==='games'?'active':''} onClick={()=>setSort('games')}>Most played</button></div>} />
      <div className="hvm-table card">
        <div className="hvm-head"><span>Model</span><span className="lh-hide">Game</span><span className="ta-r">Human win rate</span><span className="ta-r lh-hide">Human games</span><span className="ta-r">Difficulty</span></div>
        {rows.map((r,i)=>(
          <div key={i} className="hvm-row">
            <span className="hvm-model"><ModelBadge id={r.model} size={13}/></span>
            <span className="hvm-game lh-hide"><Tag tone="plain">{r.game}</Tag></span>
            <span className="ta-r hvm-wr"><span className="mono tnum">{(r.humanWr*100).toFixed(1)}%</span><span className="hvm-bar"><span style={{width:`${r.humanWr*100}%`}}/></span></span>
            <span className="ta-r hvm-games mono tnum lh-hide">{r.humanGames.toLocaleString()}</span>
            <span className="ta-r"><span className={`difftag difftag-${r.humanWr<0.2?'loss':r.humanWr<0.35?'draw':'win'}`}>{r.humanWr<0.2?'Brutal':r.humanWr<0.35?'Hard':'Fair'}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultScreen({ game, model, result, moves, onAgain, onNewModel, onNewGame }){
  const m=ES.modelById[model];
  const conf = { win:{t:'Victory',d:'You beat the model.',c:'win',icon:'trophy'}, loss:{t:'Defeated',d:'The model came out ahead.',c:'loss',icon:'flag'}, draw:{t:'Draw',d:'Evenly matched.',c:'draw',icon:'layers'} }[result];
  return (
    <div className="result card">
      <div className={`result-banner rb-${conf.c}`}>
        <div className="rb-icon"><Icon name={conf.icon} size={26}/></div>
        <div className="rb-text"><div className="rb-title">{conf.t}</div><div className="rb-desc">{conf.d}</div></div>
        <div className="rb-game"><GameGlyph slug={game.slug} category={game.category} size={20}/> {game.name}</div>
      </div>
      <div className="result-stats">
        <div className="rs-vs"><span className="rs-you">You</span><span className={`reschip reschip-${conf.c==='win'?'win':conf.c==='loss'?'loss':'draw'}`}>{result==='win'?'WIN':result==='loss'?'LOSS':'DRAW'}</span><ModelBadge id={model} size={13}/></div>
        <div className="rs-grid">
          <div className="rs-cell"><span className="rs-l">Moves</span><span className="mono rs-v">{moves}</span></div>
          <div className="rs-cell"><span className="rs-l">Model Elo</span><span className="mono rs-v">{m.elo}</span></div>
          <div className="rs-cell"><span className="rs-l">Provider</span><span className="rs-v">{ES.provByKey[m.provider].name}</span></div>
          <div className="rs-cell"><span className="rs-l">Saved to profile</span><span className="rs-v"><Icon name="check" size={15} style={{color:'var(--win)'}}/></span></div>
        </div>
      </div>
      <div className="result-actions">
        <Button variant="primary" onClick={onAgain} icon="refresh">Play again</Button>
        <Button variant="secondary" onClick={onNewModel} icon="cpu">Try another model</Button>
        <Button variant="ghost" onClick={onNewGame} icon="grid">New game</Button>
      </div>
    </div>
  );
}

function Arena(){
  const [step,setStep]=useState('select-game'); // select-game | select-model | playing | result
  const [game,setGame]=useState(null);
  const [model,setModel]=useState('anthropic/claude-opus-4.1');
  const [cat,setCat]=useState('all');
  const [result,setResult]=useState(null);
  const [moves,setMoves]=useState(0);
  const [gameKey,setGameKey]=useState(0);

  const gamesList = useMemo(()=> cat==='all'?ES.games:ES.games.filter(g=>g.category===cat), [cat]);
  const GameComp = game && PLAYABLE[game.slug];

  const startPlay=()=>{ setMoves(0); setResult(null); setGameKey(k=>k+1); setStep('playing'); };
  const onEnd=(r)=>{ setResult(r); setTimeout(()=>setStep('result'), r==='win'?700:500); };

  const stepIdx = {'select-game':0,'select-model':1,'playing':2,'result':2}[step];

  return (
    <div className="page arena">
      <div className="wrap page-head">
        <h1 className="page-title">Arena</h1>
        <p className="page-desc">Play against a frontier model. Pick a game, pick an opponent, and see how you stack up. Every game is saved to your profile.</p>
      </div>
      <div className="wrap page-pad">
        {/* stepper */}
        <div className="arena-steps">
          {['Select game','Select model','Play'].map((s,i)=>(
            <React.Fragment key={s}>
              <button className={`astep ${stepIdx===i?'astep-cur':''} ${stepIdx>i?'astep-done':''}`} onClick={()=>{ if(i===0)setStep('select-game'); if(i===1&&game)setStep('select-model'); }}>
                <span className="astep-n">{stepIdx>i?<Icon name="check" size={13}/>:i+1}</span>{s}
              </button>
              {i<2 && <span className="astep-line"/>}
            </React.Fragment>
          ))}
        </div>

        {step==='select-game' && (
          <div className="arena-select">
            <div className="as-cathead">
              <SectionHead eyebrow={`${ES.games.length} arenas`} title="Choose an arena" />
              <div className="chiprow as-chips">
                <button className={`chip ${cat==='all'?'active':''}`} onClick={()=>setCat('all')}>All</button>
                {ES.categories.map(c=><button key={c} className={`chip ${cat===c?'active':''}`} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>)}
              </div>
            </div>
            <div className="gamegrid">
              {gamesList.map(g=>{
                const top=ES.models[Math.floor(Math.abs(g.slug.charCodeAt(0)+g.slug.length)%6)].id;
                return <GameCard key={g.slug} game={g} topModel={top} selected={game&&game.slug===g.slug} onClick={()=>{ setGame(g); setStep('select-model'); }} />;
              })}
            </div>
          </div>
        )}

        {step==='select-model' && game && (
          <div className="arena-model">
            <div className="am-grid">
              <div className="am-left">
                <button className="am-back" onClick={()=>setStep('select-game')}><Icon name="chevronLeft" size={15}/> Change game</button>
                <div className="am-gamecard card">
                  <div className="am-gc-icon"><GameGlyph slug={game.slug} category={game.category} size={34}/></div>
                  <div className="am-gc-name">{game.name}</div>
                  <div className="am-gc-meta"><Tag tone="plain">{game.category==='RL'?'RL Env':game.category}</Tag><DifficultyTag level={game.difficulty}/></div>
                  <div className="am-gc-variant mono">{game.variant}</div>
                  {!PLAYABLE[game.slug] && <div className="am-gc-note"><Icon name="terminal" size={13}/> Interactive board renders from Core. Wired arenas: TTT, Connect Four, Othello, RPS.</div>}
                </div>
                <Button variant="primary" size="lg" className="am-launch" onClick={startPlay} iconRight="play" disabled={false}>Launch game</Button>
                <div className="am-pick-note mono">vs <ModelBadge id={model} size={12}/></div>
              </div>
              <div className="am-right">
                <div className="am-rhead">Pick your opponent <span className="mono am-rsub">ranked by {game.name} Elo</span></div>
                <ModelPicker game={game} value={model} onChange={setModel} />
              </div>
            </div>
          </div>
        )}

        {(step==='playing'||step==='result') && game && (
          <div className="arena-play">
            {step==='playing' && (
              <div className="play-shell card">
                <div className="ps-head">
                  <div className="ps-game"><GameGlyph slug={game.slug} category={game.category} size={18}/> <b>{game.name}</b></div>
                  <div className="ps-vs"><span className="ps-you mono">You</span><span className="ps-vstag mono">vs</span><ModelBadge id={model} size={12.5}/></div>
                  <div className="ps-moves mono">move {moves}</div>
                </div>
                <div className="ps-board">
                  {GameComp ? <GameComp key={gameKey} model={model} onEnd={onEnd} onMove={()=>setMoves(m=>m+1)} />
                    : <ArenaPreviewPlay game={game} model={model} onEnd={onEnd} onMove={()=>setMoves(m=>m+1)} />}
                </div>
                <div className="ps-foot">
                  <button className="ps-resign" onClick={()=>onEnd('loss')}><Icon name="flag" size={14}/> Resign</button>
                  <span className="ps-saved mono"><Icon name="check" size={13}/> auto-saving to profile</span>
                </div>
              </div>
            )}
            {step==='result' && <ResultScreen game={game} model={model} result={result} moves={moves}
              onAgain={startPlay} onNewModel={()=>setStep('select-model')} onNewGame={()=>setStep('select-game')} />}
          </div>
        )}

        <hr className="divider" style={{margin:'56px 0 0'}} />
        <div className="section"><HumanVsModel/></div>
      </div>
    </div>
  );
}

/* For non-wired arenas: a clean board preview + a simulated quick result so the flow completes */
function ArenaPreviewPlay({ game, model, onEnd, onMove }){
  const [n,setN]=useState(0);
  const tick=()=>{ const nn=n+1; setN(nn); onMove&&onMove(); if(nn>=4){ const r=Math.random(); onEnd(r<0.4?'win':r<0.8?'loss':'draw'); } };
  return (
    <div className="agame agame-preview">
      <div className="ap-board"><PreviewBoard game={game}/></div>
      <div className="ap-note"><Icon name="terminal" size={14}/> <span>This arena renders via eSlams Core. Step through a demo sequence:</span></div>
      <Button variant="secondary" onClick={tick} iconRight="arrowRight">Make a move ({n}/4)</Button>
    </div>
  );
}
Object.assign(window, { Arena });
