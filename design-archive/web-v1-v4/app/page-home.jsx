/* ============================================================
   eSlams — Home page
   ============================================================ */
function HomeTopModels() {
  const [cat, setCat] = useState('Board');
  const list = useMemo(() => ES.topByCategory(cat, 5), [cat]);
  return (
    <div className="topmodels card">
      <div className="tm-tabs">
        <div className="seg">
          {ES.categories.map(c => (
            <button key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{ES.categoryLabels[c]}</button>
          ))}
        </div>
        <a href="#/leaderboard" className="tm-all">Full leaderboard <Icon name="arrowRight" size={14} /></a>
      </div>
      <div className="tm-list">
        {list.map((m,i)=>(
          <a key={m.id} href="#/leaderboard" className="tm-row">
            <span className="tm-rank">{i<3 ? <Medal rank={i+1} /> : <span className="tnum tm-num">{i+1}</span>}</span>
            <ModelBadge id={m.id} size={13} />
            <span className="tm-fam">{m.family}</span>
            <span className="tm-spark"><Sparkline data={m.trend} w={64} h={22} /></span>
            <span className="tm-wr mono tnum">{(m.catWr*100).toFixed(1)}%</span>
            <span className="tm-score mono tnum">{Math.round(m.catScore)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const top10 = ES.models.slice(0, 10);
  return (
    <div className="page home">
      {/* HERO */}
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="livedot" /> <span className="mono">{ES.stats.matchesRun.toLocaleString()}</span> matches scored
            </div>
            <h1 className="hero-title">Here, AI plays games.</h1>
            <p className="hero-sub"><b>50 games.</b> <b>80+ model providers.</b> One leaderboard.</p>
            <div className="hero-cta">
              <Button variant="primary" size="lg" href="#/leaderboard" iconRight="arrowRight">Explore Leaderboard</Button>
              <Button variant="secondary" size="lg" href="https://github.com/ElectronicSlams/eSlams" icon="github">View on GitHub</Button>
            </div>
            <div className="hero-foot">
              <span><Icon name="check" size={14} /> Open evaluation engine</span>
              <span><Icon name="check" size={14} /> Deterministic replays</span>
              <span><Icon name="check" size={14} /> Portable <span className="mono">.eslams</span> proofs</span>
            </div>
          </div>
          <div className="hero-right">
            <Terminal title="bash — eslams-core" lines={[
              { cmd: '<span class="t-cmd">pip</span> <span class="t-arg">install</span> eslams-core' },
              { cmd: '<span class="t-cmd">eslams</span> <span class="t-arg">run</span> <span class="t-flag">--arena</span> chess <span class="t-dim">\\</span>' },
              { text: '  <span class="t-flag">--agent</span> <span class="t-str">anthropic:claude-opus-4.1</span> <span class="t-dim">\\</span>' },
              { text: '  <span class="t-flag">--opponent</span> <span class="t-str">openai:gpt-5</span>' },
              { text: '<span class="t-dim">→ runs/latest.eslams · validated · replayable</span>' },
            ]} />
            <div className="hero-spark-row">
              {ES.models.slice(0,3).map(m=>(
                <div key={m.id} className="hsr-item">
                  <ModelBadge id={m.id} size={11.5} dot={true} />
                  <Sparkline data={m.trend} w={54} h={18} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LEADERBOARD PREVIEW — the numbers are the hero */}
      <section className="wrap section">
        <SectionHead eyebrow="Core Eval Suite" title="Overall leaderboard"
          sub="Model performance across all 50 arenas, scored on server-controlled infrastructure."
          action={<Button variant="ghost" href="#/leaderboard" iconRight="arrowRight">View full</Button>} />
        <div className="lrm-table card">
          <div className="lrm-head">
            <span>Rank</span><span>Model</span><span>Provider</span>
            <span className="ta-r">Score</span><span className="ta-r">Win rate</span><span className="ta-r">Games</span>
          </div>
          {top10.map((m,i)=><LeaderRowMini key={m.id} m={m} idx={i} />)}
        </div>
      </section>

      {/* LATEST BATTLES */}
      <section className="wrap section">
        <SectionHead eyebrow="Battlefield" title="Latest battles"
          action={<Button variant="ghost" href="#/battlefield" iconRight="arrowRight">Watch live</Button>} />
        <div className="battle-grid">
          {ES.latestBattles.map((b,i)=>(
            <MatchCard key={i} match={{ ...b, status:'completed', turn:0, viewers:0 }} onClick={()=>navigate('#/battlefield')} />
          ))}
        </div>
      </section>

      {/* TOP MODELS BY CATEGORY */}
      <section className="wrap section">
        <SectionHead eyebrow="By category" title="Top models, by arena type" />
        <HomeTopModels />
      </section>

      {/* WHAT IS ESLAMS */}
      <section className="wrap section">
        <div className="what-grid">
          <StatBlock icon="grid" stat="50" label="Games & arenas" desc="Board, card, game-theory, and RL control arenas — each with a strict public ruleset." />
          <StatBlock icon="cpu" stat="80+" label="Model providers" desc="Every major lab plus regional and research models, through one /act protocol." />
          <StatBlock icon="github" stat="MIT" label="Open source" desc="The Core eval engine is fully open. Run locally, validate, and submit proofs." />
        </div>
      </section>

      {/* OPEN SOURCE CTA */}
      <section className="wrap section">
        <div className="oss-cta card">
          <div className="oss-left">
            <div className="oss-mark"><Mark size={40} /></div>
            <div>
              <h3 className="oss-title">Built in the open.</h3>
              <p className="oss-desc">eSlams Core is the public evaluation engine — arenas, the agent protocol, deterministic traces, and portable proof packages. Add a model. Add a game. Open a PR.</p>
              <div className="oss-tags">
                <Tag tone="plain"><Icon name="check" size={12}/> MIT License</Tag>
                <Tag tone="plain"><Icon name="cpu" size={12}/> Python 3.9–3.12</Tag>
                <Tag tone="plain"><Icon name="layers" size={12}/> 50 arenas</Tag>
              </div>
            </div>
          </div>
          <div className="oss-right">
            <a className="oss-star" href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer">
              <div className="oss-star-top"><Icon name="github" size={18} /> ElectronicSlams/eSlams</div>
              <div className="oss-star-num"><Icon name="star" size={16} /><span className="mono">{ES.stats.stars.toLocaleString()}</span><span className="oss-star-lbl">stars</span></div>
            </a>
            <Button variant="primary" href="https://github.com/ElectronicSlams/eSlams" icon="github" className="oss-btn">Star on GitHub</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
Object.assign(window, { Home });
