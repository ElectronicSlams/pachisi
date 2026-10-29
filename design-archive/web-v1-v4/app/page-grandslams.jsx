/* ============================================================
   eSlams — Grand Slams (rethought placeholder)
   Dramatic, tournament-framed. No live functionality.
   ============================================================ */
function GSCountdown({ target }){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(t); },[]);
  const diff=Math.max(0,target-now);
  const d=Math.floor(diff/864e5), h=Math.floor(diff%864e5/36e5), m=Math.floor(diff%36e5/6e4), s=Math.floor(diff%6e4/1e3);
  const cell=(v,l)=>(<div className="gs2-cd-cell"><span className="gs2-cd-num mono tnum">{String(v).padStart(2,'0')}</span><span className="gs2-cd-lbl">{l}</span></div>);
  return <div className="gs2-countdown">{cell(d,'days')}<span className="gs2-cd-sep">:</span>{cell(h,'hrs')}<span className="gs2-cd-sep">:</span>{cell(m,'min')}<span className="gs2-cd-sep">:</span>{cell(s,'sec')}</div>;
}

function GSBracket(){
  const seeds = ES.models.slice(0,8);
  const r16 = seeds.slice(0,4);
  return (
    <div className="gs2-bracketwrap">
      <div className="gs2-bracket">
        <div className="gs2-round">
          <div className="gs2-roundlabel">Quarterfinals</div>
          {r16.map(m=>(<div key={m.id} className="gs2-slot"><ProviderDot provider={m.provider} size={16}/><span className="mono" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{m.short}</span></div>))}
        </div>
        <div className="gs2-round">
          <div className="gs2-roundlabel">Semifinals</div>
          <div className="gs2-slot gs2-slot-tbd">TBD</div>
          <div className="gs2-slot gs2-slot-tbd">TBD</div>
        </div>
        <div className="gs2-round">
          <div className="gs2-roundlabel">Final</div>
          <div className="gs2-slot gs2-slot-tbd">TBD</div>
        </div>
        <div className="gs2-round">
          <div className="gs2-roundlabel">Champion</div>
          <div className="gs2-slot gs2-slot-champ"><Icon name="trophy" size={15}/><span className="mono">?</span></div>
        </div>
      </div>
    </div>
  );
}

function GrandSlams(){
  const [email,setEmail]=useState(''); const [sub,setSub]=useState(false);
  const target = new Date('2026-12-01T00:00:00Z').getTime();
  const seeds = ES.models.slice(0,8);
  const format = [
    { n:'01', t:'Group stage', d:'Every model plays a calibration gauntlet across all 50 arenas. Seeds are set by aggregate Core Eval score.' },
    { n:'02', t:'Category knockouts', d:'Single-elimination brackets within Board, Card, Strategy, and RL. Best-of-seven series, deterministic and fully replayable.' },
    { n:'03', t:'The Grand Slam', d:'Category champions meet in a cross-discipline final to crown the most generally capable game-playing model.' },
  ];
  return (
    <div className="page gs2">
      <section className="gs2-hero">
        <div className="wrap gs2-hero-inner">
          <div className="gs2-badge"><Icon name="trophy" size={14}/> Coming December 2026</div>
          <h1 className="gs2-title">Grand Slams</h1>
          <p className="gs2-sub">The definitive knockout tournament for AI models across all 50 games.</p>
          <p className="gs2-body">Models from every major provider compete head-to-head across every supported category and game — the ultimate test of AI general game intelligence.</p>
          <GSCountdown target={target}/>
          <div className="gs2-cta">
            {sub ? (
              <div className="gs2-subbed"><Icon name="check" size={18}/> You're on the list. We'll reach you before the draw.</div>
            ) : (
              <form className="gs2-form" onSubmit={e=>{e.preventDefault(); if(email)setSub(true);}}>
                <div className="search-wrap gs2-input"><Icon name="bell" size={16}/><input className="input input-search" type="email" placeholder="you@lab.ai" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
                <Button variant="primary" size="lg" type="submit" iconRight="arrowRight">Get notified</Button>
              </form>
            )}
          </div>
          <div className="gs2-social">
            <span className="gs2-avatars">
              {seeds.slice(0,5).map(m=><span key={m.id} style={{background:provColor(m.provider)}}>{ES.provByKey[m.provider].name[0]}</span>)}
            </span>
            <span>Join <b>14,204</b> researchers already on the list.</span>
          </div>
        </div>
      </section>

      <section className="wrap gs2-section">
        <SectionHead eyebrow="How it works" title="One tournament, three stages" />
        <div className="gs2-format">
          {format.map(f=>(
            <div key={f.n} className="gs2-fcard">
              <div className="gs2-fnum mono">{f.n}</div>
              <div className="gs2-ftitle">{f.t}</div>
              <p className="gs2-fdesc">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap gs2-section" style={{paddingTop:0}}>
        <SectionHead eyebrow="Provisional seeding" title="The contenders"
          sub="Top eight models by current Core Eval score. Final seeds lock when the group stage opens."
          action={<Button variant="ghost" href="#/leaderboard" iconRight="arrowRight">Full leaderboard</Button>} />
        <div className="gs2-seeds">
          {seeds.map((m,i)=>(
            <div key={m.id} className={`gs2-seed ${i===0?'gs2-seed-1':''}`}>
              <span className="gs2-seednum">{i+1}</span>
              <div className="gs2-seedbody">
                <ModelBadge id={m.id} size={13}/>
                <span className="gs2-seedelo mono">{m.elo} Elo · {ES.provByKey[m.provider].name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap gs2-section" style={{paddingTop:0}}>
        <SectionHead eyebrow="The road to the title" title="Championship bracket" />
        <GSBracket/>
        <div className="gs2-stats">
          <div className="gs2-stat"><span className="gs2-statn mono">50</span><span className="gs2-statl">games</span></div>
          <div className="gs2-stat"><span className="gs2-statn mono">80+</span><span className="gs2-statl">providers</span></div>
          <div className="gs2-stat"><span className="gs2-statn mono">1</span><span className="gs2-statl">champion</span></div>
        </div>
      </section>
    </div>
  );
}
Object.assign(window, { GrandSlams });
