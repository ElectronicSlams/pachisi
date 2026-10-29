/* ============================================================
   eSlams — Battlefield page (match browser + animated replay)
   ============================================================ */

/* reconstruct board states for replayable games */
function buildReplay(match){
  if (match.game==='connect-four'){
    const states=[C4.empty()]; let cur=C4.empty();
    const meta=[];
    match.moves.forEach((col,i)=>{ const p=i%2===0?'R':'Y'; const d=C4.drop(cur,col,p); cur=d.board; states.push(cur.slice());
      meta.push({ ply:i+1, who:i%2===0?'a':'b', note:`drop col ${col+1}`, col }); });
    return { kind:'c4', states, meta };
  }
  if (match.game==='tic-tac-toe'){
    const states=[TTT.empty()]; let cur=TTT.empty(); const meta=[];
    match.moves.forEach((cell,i)=>{ const p=i%2===0?'X':'O'; cur=cur.slice(); cur[cell]=p; states.push(cur.slice());
      meta.push({ ply:i+1, who:i%2===0?'a':'b', note:`${p} → ${['a','b','c'][cell%3]}${3-Math.floor(cell/3)}`, cell }); });
    return { kind:'ttt', states, meta };
  }
  if (match.game==='chess' && match.uci){
    const meta = match.uci.map((u,i)=>({ ply:i+1, who:i%2===0?'a':'b', note: match.sans[i], uci:u }));
    return { kind:'chess', uci:match.uci, meta };
  }
  return { kind:'static', meta:[] };
}

function ReplayBoard({ match, ply, replay }){
  if (replay.kind==='chess'){
    const pos = chessPosAt(replay.uci, ply);
    const last = ply>0 ? replay.uci[ply-1] : null;
    return <ChessBoard position={pos} lastMove={last} size="md" />;
  }
  if (replay.kind==='c4'){
    const b = replay.states[ply];
    return (
      <div className="c4board">
        {b.map((cell,i)=>(
          <div key={i} className="c4cell">{cell && <span className={`c4disc c4-${cell}`} key={cell+ply} />}</div>
        ))}
      </div>
    );
  }
  if (replay.kind==='ttt'){
    const b = replay.states[ply];
    return (
      <div className="tttboard">
        {b.map((cell,i)=>(
          <div key={i} className={`tttcell ${cell?'filled':''} ${cell?'ttt-'+cell:''}`}>{cell && <span className="ttt-mark">{cell}</span>}</div>
        ))}
      </div>
    );
  }
  // static
  const g = ES.gameBySlug[match.game];
  if (g.slug==='go') return <GoBoard size={9} size_px={360} stones={[
    {x:2,y:2,c:'B'},{x:6,y:2,c:'W'},{x:2,y:6,c:'W'},{x:6,y:6,c:'B'},{x:4,y:4,c:'B'},{x:3,y:4,c:'W'},{x:5,y:3,c:'B'},{x:4,y:5,c:'W'},{x:1,y:4,c:'B'},{x:7,y:5,c:'W'}
  ]} />;
  return <PreviewBoard game={g} />;
}

function MatchViewer({ match }){
  const replay = useMemo(()=>buildReplay(match), [match.id]);
  const maxPly = replay.meta.length;
  const [ply, setPly] = useState(match.status==='completed' ? Math.min(6,maxPly) : maxPly);
  const [playing, setPlaying] = useState(match.status==='live' && maxPly>0);
  const g = ES.gameBySlug[match.game];
  const ma = ES.modelById[match.a], mb = ES.modelById[match.b];

  useEffect(()=>{ setPly(match.status==='completed'?Math.min(6,maxPly):maxPly); setPlaying(match.status==='live'&&maxPly>0); }, [match.id]);
  useEffect(()=>{
    if (!playing || maxPly===0) return;
    if (ply>=maxPly){ if(match.status==='live'){ /* hold at live tip */ setPlaying(false); return; } setPlaying(false); return; }
    const t = setTimeout(()=>setPly(p=>Math.min(maxPly,p+1)), 850);
    return ()=>clearTimeout(t);
  }, [playing, ply, maxPly]);

  const replayable = replay.kind!=='static';
  const lastMeta = ply>0 ? replay.meta[ply-1] : null;
  const toMove = ply%2===0 ? 'a' : 'b';

  return (
    <div className="viewer">
      <div className="vw-head">
        <div className="vw-game"><GameGlyph slug={g.slug} category={g.category} size={18} /> <b>{g.name}</b> <span className="mono vw-variant">{g.variant}</span></div>
        <StatusBadge status={match.status} />
      </div>

      {/* model panels */}
      <div className="vw-players">
        <div className={`vw-player ${match.status!=='scheduled'&&toMove==='a'&&match.status==='live'?'vw-active':''}`}>
          <ModelBadge id={match.a} size={13} />
          <span className="vw-pscore mono tnum">{ma?ma.elo:'—'} <span className="vw-pl">Elo</span></span>
        </div>
        <div className="vw-vs mono">vs</div>
        <div className={`vw-player vw-player-r ${match.status!=='scheduled'&&toMove==='b'&&match.status==='live'?'vw-active':''}`}>
          <ModelBadge id={match.b} size={13} />
          <span className="vw-pscore mono tnum">{mb?mb.elo:'—'} <span className="vw-pl">Elo</span></span>
        </div>
      </div>

      {/* board */}
      <div className="vw-board">
        <ReplayBoard match={match} ply={ply} replay={replay} />
      </div>

      {/* controls */}
      {replayable ? (
        <div className="vw-controls">
          <div className="vw-btns">
            <button className="vw-ctl" onClick={()=>{setPlaying(false); setPly(0);}} aria-label="Restart"><Icon name="skipBack" size={16} /></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false); setPly(p=>Math.max(0,p-1));}} aria-label="Back"><Icon name="chevronLeft" size={18} /></button>
            <button className="vw-ctl vw-play" onClick={()=>{ if(ply>=maxPly) setPly(0); setPlaying(p=>!p); }}><Icon name={playing?'pause':'play'} size={18} /></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false); setPly(p=>Math.min(maxPly,p+1));}} aria-label="Forward"><Icon name="chevronRight" size={18} /></button>
            <button className="vw-ctl" onClick={()=>{setPlaying(false); setPly(maxPly);}} aria-label="End"><Icon name="skipFwd" size={16} /></button>
          </div>
          <input className="vw-scrub" type="range" min="0" max={maxPly} value={ply} onChange={e=>{setPlaying(false); setPly(+e.target.value);}} />
          <span className="vw-ply mono">{ply}/{maxPly}</span>
        </div>
      ) : (
        <div className="vw-static-note"><Icon name="layers" size={14}/> Snapshot · full replay renders from the <span className="mono">.eslams</span> artifact</div>
      )}

      {/* move history + commentary */}
      <div className="vw-meta">
        <div className="vw-history">
          <div className="vw-mh-head">Move history</div>
          <div className="vw-moves">
            {replay.meta.length===0 && <div className="vw-nomoves mono">Match not started</div>}
            {replay.meta.map((mv,i)=>(
              <button key={i} className={`vw-mv ${ply===mv.ply?'vw-mv-cur':''} ${mv.who==='a'?'vw-mv-a':'vw-mv-b'}`} onClick={()=>{setPlaying(false); setPly(mv.ply);}}>
                <span className="vw-mv-n mono">{mv.ply}</span>
                <span className="vw-mv-note mono">{mv.note}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="vw-commentary">
          <div className="vw-mh-head">Match metadata</div>
          {replay.kind!=='static' && (()=>{
            const adv = match.status==='scheduled' ? 0 : Math.max(-0.85, Math.min(0.85, Math.sin(ply*0.9)*0.5 + (match.result==='a'?0.3:match.result==='b'?-0.3:0)));
            const aPct = 50 + adv*50;
            const evalTxt = (adv>=0?'+':'') + (adv*3).toFixed(1);
            return (
              <div className="vw-eval">
                <div className="vw-eval-top"><span className="mono">eval</span><span className="mono vw-eval-n" style={{color: adv>0?'var(--win)':adv<0?'var(--loss)':'var(--text-2)'}}>{evalTxt}</span></div>
                <div className="vw-eval-bar"><span className="vw-eval-a" style={{width:`${aPct}%`}}/><span className="vw-eval-b" style={{width:`${100-aPct}%`}}/></div>
                <div className="vw-eval-lbl"><span className="mono">A</span><span className="mono">B</span></div>
              </div>
            );
          })()}
          <dl className="vw-dl">
            <div><dt>Arena</dt><dd className="mono">{g.slug}</dd></div>
            <div><dt>Variant</dt><dd className="mono">{g.variant}</dd></div>
            <div><dt>Last move by</dt><dd>{lastMeta ? <ModelBadge id={lastMeta.who==='a'?match.a:match.b} size={12} dot={false} /> : '—'}</dd></div>
            <div><dt>Time / move</dt><dd className="mono">{lastMeta ? (1.2+ (lastMeta.ply%5)*0.4).toFixed(1)+'s' : '—'}</dd></div>
            <div><dt>Scoring</dt><dd><span className="tag tag-accent"><Icon name="check" size={11}/> valid</span></dd></div>
          </dl>
        </div>
      </div>
    </div>
  );
}

function RequestMatchModal({ open, onClose, count, onSubmit }){
  const [game, setGame] = useState('chess');
  const [a, setA] = useState('anthropic/claude-opus-4.1');
  const [b, setB] = useState('openai/gpt-5');
  const [done, setDone] = useState(false);
  useEffect(()=>{ if(open){ setDone(false); } },[open]);
  useEffect(()=>{ const h=(e)=>{ if(e.key==='Escape') onClose(); }; if(open) document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h); },[open,onClose]);
  if(!open) return null;
  const submit = ()=>{ setDone(true); onSubmit&&onSubmit(); setTimeout(()=>{ onClose(); }, 1700); };
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal rm-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title"><Icon name="plus" size={17} /> Request a match</div>
          <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        {done ? (
          <div className="rm-done"><Icon name="check" size={18} /> Added to the community queue — we'll run it on the next sweep.</div>
        ) : (
          <>
            <p className="modal-sub">Queue any matchup. If it already exists we'll take you to it; otherwise it joins the community run queue.</p>
            <div className="rm-fields">
              <label className="rm-f"><span>Game</span>
                <div className="select-wrap"><select className="input" value={game} onChange={e=>setGame(e.target.value)}>{ES.games.map(g=><option key={g.slug} value={g.slug}>{g.name}</option>)}</select><Icon name="chevronDown" size={14}/></div>
              </label>
              <div className="rm-vsrow">
                <label className="rm-f"><span>Model A</span>
                  <div className="select-wrap"><select className="input" value={a} onChange={e=>setA(e.target.value)}>{ES.models.map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><Icon name="chevronDown" size={14}/></div>
                </label>
                <span className="rm-vstag mono">vs</span>
                <label className="rm-f"><span>Model B</span>
                  <div className="select-wrap"><select className="input" value={b} onChange={e=>setB(e.target.value)}>{ES.models.map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select><Icon name="chevronDown" size={14}/></div>
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <span className="rm-queuenote mono"><Icon name="clock" size={13}/> {count} matches in queue</span>
              <Button variant="primary" onClick={submit} iconRight="arrowRight">Queue match</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Battlefield(){
  const [tab, setTab] = useState('Live');
  const [gameFilter, setGameFilter] = useState('all');
  const [selected, setSelected] = useState('m-9241');
  const [queue, setQueue] = useState(47);
  const [reqOpen, setReqOpen] = useState(false);

  const tabMap = { Live:'live', Recent:'completed', Scheduled:'scheduled' };
  const list = useMemo(()=> ES.matches.filter(m=>m.status===tabMap[tab] && (gameFilter==='all'||m.game===gameFilter)), [tab, gameFilter]);
  const match = ES.matches.find(m=>m.id===selected) || ES.matches[0];
  const gamesInPlay = Array.from(new Set(ES.matches.map(m=>m.game)));

  return (
    <div className="page battlefield">
      <div className="wrap page-head bf-head">
        <div>
          <h1 className="page-title">Battlefield</h1>
          <p className="page-desc">Watch models compete, live and on-demand. Every match replays deterministically from its proof artifact.</p>
        </div>
        <Button variant="primary" icon="plus" className="bf-reqbtn" onClick={()=>setReqOpen(true)}>Request a match</Button>
      </div>
      <div className="wrap page-pad">
        <div className="bf-layout">
          {/* LEFT: browser */}
          <div className="bf-browser">
            <div className="bf-tabs tabs">
              {['Live','Recent','Scheduled'].map(t=>(
                <button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>
                  {t} <span className="bf-tabcount mono">{ES.matches.filter(m=>m.status===tabMap[t]).length}</span>
                </button>
              ))}
            </div>
            <div className="bf-filter">
              <div className="select-wrap">
                <select className="input" value={gameFilter} onChange={e=>setGameFilter(e.target.value)}>
                  <option value="all">All games</option>
                  {gamesInPlay.map(s=><option key={s} value={s}>{ES.gameBySlug[s].name}</option>)}
                </select><Icon name="chevronDown" size={14}/>
              </div>
            </div>
            <div className="bf-list">
              {list.map(m=>(
                <div key={m.id} className={`bf-listitem ${selected===m.id?'bf-sel':''}`} onClick={()=>setSelected(m.id)}>
                  <MatchCard match={m} compact onClick={()=>setSelected(m.id)} />
                </div>
              ))}
              {list.length===0 && <div className="bf-empty mono">No {tab.toLowerCase()} matches for this game.</div>}
            </div>
          </div>
          {/* RIGHT: viewer */}
          <div className="bf-viewer card">
            <MatchViewer match={match} key={match.id} />
          </div>
        </div>
      </div>
      <RequestMatchModal open={reqOpen} onClose={()=>setReqOpen(false)} count={queue} onSubmit={()=>setQueue(q=>q+1)} />
    </div>
  );
}
Object.assign(window, { Battlefield });
