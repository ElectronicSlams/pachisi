/* ============================================================
   eSlams — User Profile (rethought)
   eslams.com/username · public by default · visual game replays
   ============================================================ */

function ProfileHeader({ p, vis, onToggleVis }){
  const wr = (p.wins/(p.wins+p.losses)*100);
  return (
    <div className="pf-header card">
      <div className="pf-id">
        <span className="pf-avatar" style={{ background: provColor('anthropic') }}>{p.username[0].toUpperCase()}</span>
        <div className="pf-idtext">
          <div className="pf-namerow">
            <h1 className="pf-name mono">{p.username}</h1>
            <button className={`pf2-vis ${vis==='public'?'pf2-vis-public':''}`} onClick={onToggleVis} title="Toggle profile visibility">
              <Icon name={vis==='public'?'globe':'lock'} size={12}/> {vis}
            </button>
          </div>
          <div className="pf-sub">{p.display} · <span className="mono">joined {p.joined}</span></div>
        </div>
      </div>
      <div className="pf-metrics">
        <div className="pf-metric"><span className="pf-mn mono">{p.played.toLocaleString()}</span><span className="pf-ml">Games</span></div>
        <div className="pf-metric"><span className="pf-mn mono">{wr.toFixed(0)}%</span><span className="pf-ml">Win rate</span></div>
        <div className="pf-metric pf-wld">
          <span className="pf-wldrow mono"><b className="pf-w">{p.wins}</b><span>–</span><b className="pf-l">{p.losses}</b><span>–</span><b className="pf-d">{p.draws}</b></span>
          <span className="pf-ml">W · L · D</span>
        </div>
      </div>
    </div>
  );
}

function ProfileOverview({ p }){
  const base = p.wins/(p.wins+p.losses);
  const cats = [['Board',0.06],['Card',-0.07],['Strategy',0.03],['RL',-0.13]];
  const form = p.history.slice(0,5).map(h=>h.result==='win'?'W':h.result==='loss'?'L':'D');
  const bestGame = ES.gameBySlug[p.history.find(h=>h.result==='win')?.game || 'connect-four'];
  return (
    <div className="pf2-overview">
      <div className="pf2-ocard">
        <div className="pf2-ohead">Win rate by arena type</div>
        <div className="pf2-catbars">
          {cats.map(([c,off])=>{ const wr=Math.min(0.82,Math.max(0.28,base+off)); return (
            <div key={c} className="pf2-catbar">
              <span className="pf2-catname">{ES.categoryLabels[c]}</span>
              <span className="pf2-cattrack"><span className="pf2-catfill" style={{width:`${wr*100}%`}}/></span>
              <span className="pf2-catpct">{(wr*100).toFixed(0)}%</span>
            </div>
          ); })}
        </div>
      </div>
      <div className="pf2-ocard pf2-bigstat">
        <div className="pf2-ohead">Recent form</div>
        <div className="pf2-form">{form.map((r,i)=><span key={i} className={`pf2-formchip pf2-form-${r}`}>{r}</span>)}</div>
        <div className="pf2-biglbl" style={{marginTop:14}}>Last {form.length} games in Arena</div>
      </div>
      <div className="pf2-ocard pf2-bigstat">
        <div className="pf2-ohead">Favorite arena</div>
        <div className="pf2-bignum" style={{fontSize:20,display:'inline-flex',alignItems:'center',gap:9}}><GameGlyph slug={bestGame.slug} category={bestGame.category} size={20}/>{bestGame.name}</div>
        <div className="pf2-biglbl">Most-played this month</div>
      </div>
    </div>
  );
}

function ReplayModal({ entry, onClose }){
  useEffect(()=>{ const h=(e)=>{ if(e.key==='Escape') onClose(); }; document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h); },[onClose]);
  if(!entry) return null;
  const g = ES.gameBySlug[entry.game];
  const replay = getReplay(entry.game);
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal replay-modal" onMouseDown={e=>e.stopPropagation()}>
        <div className="replay-mhead">
          <span className="replay-mgame"><GameGlyph slug={g.slug} category={g.category} size={19}/> {g.name}</span>
          <button className="modal-x" onClick={onClose} aria-label="Close"><Icon name="close" size={18}/></button>
        </div>
        {replay ? <ReplayPlayer replay={replay} /> : (
          <div className="replay-static">
            <PreviewBoard game={g} />
            <span><Icon name="layers" size={13}/> Full board replay renders from the <span className="mono">.eslams</span> artifact.</span>
          </div>
        )}
        <div className="replay-meta">
          <span className="replay-vs"><span className="mono" style={{color:'var(--text-2)'}}>You</span> <span className="mono" style={{color:'var(--text-3)'}}>vs</span> <ModelBadge id={entry.model} size={12}/></span>
          <span style={{display:'inline-flex',alignItems:'center',gap:10}}>
            <span className={`reschip reschip-${entry.result==='win'?'win':entry.result==='loss'?'loss':'draw'}`}>{entry.result==='win'?'You won':entry.result==='loss'?'You lost':'Draw'}</span>
            <span className="mono" style={{fontSize:12,color:'var(--text-3)'}}>{entry.date}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function GameHistory({ history, onOpen }){
  const [sortKey,setSortKey]=useState('date');
  const [dir,setDir]=useState(1);
  const sorted = useMemo(()=>{ const r=history.slice(); r.sort((a,b)=>{ let av=a[sortKey],bv=b[sortKey]; return (av>bv?1:av<bv?-1:0)*dir; }); return r; },[history,sortKey,dir]);
  const head=(k,l,cls='')=>(<button className={`gh-th ${cls} ${sortKey===k?'gh-th-act':''}`} onClick={()=>{ if(sortKey===k)setDir(d=>-d); else {setSortKey(k);setDir(1);} }}>{l}{sortKey===k && <Icon name="chevronDown" size={13} className={dir<0?'rot':''}/>}</button>);
  return (
    <div className="gh card">
      <div className="gh-head">
        {head('game','Game')}{head('model','Model','lh-hide')}{head('result','Result','ta-r')}{head('date','Date','ta-r')}<span className="gh-th"></span>
      </div>
      {sorted.map((h,i)=>{
        const g=ES.gameBySlug[h.game];
        return (
          <div key={i} className="gh-row gh-click" onClick={()=>onOpen(h)}>
            <span className="gh-game"><GameGlyph slug={g.slug} category={g.category} size={15}/> {g.name}</span>
            <span className="gh-model lh-hide"><ModelBadge id={h.model} size={12.5}/></span>
            <span className="ta-r"><span className={`reschip reschip-${h.result==='win'?'win':h.result==='loss'?'loss':'draw'}`}>{h.result==='win'?'Win':h.result==='loss'?'Loss':'Draw'}</span></span>
            <span className="ta-r gh-date mono">{h.date}</span>
            <span className="ta-r gh-watch"><Icon name="play" size={12}/> Replay</span>
          </div>
        );
      })}
    </div>
  );
}

function ArtifactCard({ a, username, onToggleVis }){
  const [copied,setCopied]=useState(false);
  const g = ES.gameBySlug[a.game];
  const copy=()=>{ navigator.clipboard?.writeText(`eslams.com/${username}/${a.name}`); setCopied(true); setTimeout(()=>setCopied(false),1300); };
  return (
    <div className="artcard">
      <div className="art-top">
        <a className="art-name mono" href={`#/u/${username}`}><span className="art-user">{username}/</span>{a.name}</a>
        <button className={`art-vis art-vis-btn ${a.vis==='private'?'art-priv':'art-pub'}`} onClick={onToggleVis} title="Toggle visibility">
          <Icon name={a.vis==='private'?'lock':'globe'} size={11}/> {a.vis}
        </button>
      </div>
      <div className="art-meta">
        <span className="art-tag"><GameGlyph slug={g.slug} category={g.category} size={13}/> {g.name}</span>
        <span className="art-date mono">{a.date}</span>
        <span className="art-size mono">{a.size}</span>
      </div>
      <div className="art-foot">
        <span className="art-ext mono">.eslams</span>
        <button className="art-share" onClick={copy}><Icon name={copied?'check':'link'} size={13}/> {copied?'Copied':'Share'}</button>
      </div>
    </div>
  );
}

function Artifacts({ p, items, setItems }){
  const upload=()=>{ const n='untitled-run-'+(items.length+1); setItems([{ name:n, game:ES.games[Math.floor(Math.random()*16)].slug, vis:'private', date:'just now', size:(Math.random()*3+0.5).toFixed(1)+' MB' }, ...items]); };
  const toggle=(idx)=>{ setItems(items.map((a,i)=> i===idx ? {...a, vis: a.vis==='public'?'private':'public'} : a)); };
  return (
    <div className="arts">
      <div className="arts-head">
        <div><div className="arts-title">Artifacts</div><div className="arts-sub mono">{p.username}/&lt;artifact-name&gt; · portable .eslams proofs · toggle visibility anytime</div></div>
        <Button variant="secondary" icon="upload" onClick={upload}>Upload .eslams</Button>
      </div>
      <div className="arts-grid">
        {items.map((a,i)=><ArtifactCard key={i} a={a} username={p.username} onToggleVis={()=>toggle(i)} />)}
      </div>
    </div>
  );
}

function Settings({ vis, setVis }){
  const { theme, setTheme } = useThemeCtx();
  const [revealed,setRevealed]=useState(false);
  const [notif,setNotif]=useState({ matches:true, weekly:true, mentions:false });
  return (
    <div className="settings">
      <div className="set-block card">
        <div className="set-h"><Icon name="user" size={16}/> Account</div>
        <div className="set-rows">
          <div className="set-row"><span className="set-l">Username</span><span className="set-v mono">makriman</span></div>
          <div className="set-row"><span className="set-l">Email</span><span className="set-v mono">makriman@eslams.com</span></div>
          <div className="set-row"><span className="set-l">Password</span><Button variant="ghost" size="sm">Change</Button></div>
          <div className="set-row"><span className="set-l">Profile visibility</span>
            <div className="seg"><button className={vis==='public'?'active':''} onClick={()=>setVis('public')}>Public</button><button className={vis==='private'?'active':''} onClick={()=>setVis('private')}>Private</button></div>
          </div>
        </div>
      </div>
      <div className="set-block card">
        <div className="set-h"><Icon name="key" size={16}/> API key <span className="set-hsub mono">for the eSlams CLI</span></div>
        <div className="set-apikey">
          <code className="set-key mono">{revealed?'esl_live_8f2a7c91d4e60b3a5f88':'esl_live_••••••••••••••••••••'}</code>
          <button className="set-keybtn" onClick={()=>setRevealed(r=>!r)}>{revealed?'Hide':'Reveal'}</button>
          <button className="set-keybtn"><Icon name="refresh" size={13}/> Rotate</button>
        </div>
        <div className="set-keynote mono"><Icon name="terminal" size={12}/> eslams auth login --key esl_live_…</div>
      </div>
      <div className="set-block card">
        <div className="set-h"><Icon name="bell" size={16}/> Notifications</div>
        <div className="set-rows">
          {[['matches','Match results vs your agents'],['weekly','Weekly leaderboard digest'],['mentions','Replies & artifact mentions']].map(([k,l])=>(
            <div key={k} className="set-row"><span className="set-l">{l}</span>
              <button className={`toggle ${notif[k]?'toggle-on':''}`} onClick={()=>setNotif(n=>({...n,[k]:!n[k]}))}><span className="toggle-knob"/></button>
            </div>
          ))}
        </div>
      </div>
      <div className="set-block card">
        <div className="set-h"><Icon name="sun" size={16}/> Appearance</div>
        <div className="set-theme">
          {[['light','Light','sun'],['dark','Dark','moon'],[null,'System','cpu']].map(([v,l,ic])=>(
            <button key={l} className={`set-themeopt ${(theme||'system')===(v||'system')?'set-themeopt-act':''}`} onClick={()=>setTheme(v)}>
              <Icon name={ic} size={16}/> {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Profile(){
  const p = ES.profile;
  const [tab,setTab]=useState('Games');
  const [vis,setVis]=useState('public');
  const [replayEntry,setReplayEntry]=useState(null);
  const [artItems,setArtItems]=useState(p.artifacts);
  return (
    <div className="page profile">
      <div className="wrap page-pad">
        <ProfileHeader p={p} vis={vis} onToggleVis={()=>setVis(v=>v==='public'?'private':'public')} />
        <ProfileOverview p={p} />
        <div className="pf-tabs tabs">
          {['Games','Artifacts','Settings'].map(t=>(
            <button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="pf-content">
          {tab==='Games' && <GameHistory history={p.history} onOpen={setReplayEntry} />}
          {tab==='Artifacts' && <Artifacts p={p} items={artItems} setItems={setArtItems} />}
          {tab==='Settings' && <Settings vis={vis} setVis={setVis} />}
        </div>
      </div>
      {replayEntry && <ReplayModal entry={replayEntry} onClose={()=>setReplayEntry(null)} />}
    </div>
  );
}
Object.assign(window, { Profile });
