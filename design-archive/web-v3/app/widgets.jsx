/* ============================================================
   eSlams — Shared widgets: MatchCard, GameCard, LeaderRow
   ============================================================ */

function vsLabel(slug){ const g = ES.gameBySlug[slug]; return g ? g.name : slug; }

/* ---------- Match card ---------- */
function MatchCard({ match, onClick, compact = false }) {
  const g = ES.gameBySlug[match.game];
  const done = match.status === 'completed';
  return (
    <button className={`matchcard ${compact?'mc-compact':''}`} onClick={onClick}>
      <div className="mc-top">
        <span className="mc-game"><GameGlyph slug={g.slug} category={g.category} size={15} /> {g.name}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="mc-vs">
        <div className={`mc-side ${done&&match.result==='a'?'mc-won':''} ${done&&match.result==='b'?'mc-lost':''}`}>
          <ModelBadge id={match.a} size={12.5} />
        </div>
        <span className="mc-vstag">vs</span>
        <div className={`mc-side mc-side-r ${done&&match.result==='b'?'mc-won':''} ${done&&match.result==='a'?'mc-lost':''}`}>
          <ModelBadge id={match.b} size={12.5} />
        </div>
      </div>
      <div className="mc-bot">
        {done ? <ResultChip result={match.result} />
          : match.status==='live' ? <span className="mc-live mono">move {match.turn}</span>
          : <span className="mc-sched mono">{match.started}</span>}
        <span className="mc-meta mono">
          {match.status==='live' && <><Icon name="user" size={11} />{match.viewers} · </>}
          {match.status!=='scheduled' && match.started}
        </span>
      </div>
    </button>
  );
}

/* ---------- Game card ---------- */
function GameCard({ game, topModel, onClick, selected }) {
  return (
    <button className={`gamecard ${selected?'gc-selected':''}`} onClick={onClick}>
      <div className="gc-icon"><GameGlyph slug={game.slug} category={game.category} size={26} /></div>
      <div className="gc-body">
        <div className="gc-name">{game.name}</div>
        <div className="gc-meta">
          <Tag tone="plain">{game.category === 'RL' ? 'RL Env' : game.category}</Tag>
          <DifficultyTag level={game.difficulty} />
        </div>
      </div>
      {topModel && (
        <div className="gc-top">
          <span className="gc-top-l">Top</span>
          <ModelBadge id={topModel} size={11.5} dot={false} />
        </div>
      )}
    </button>
  );
}

/* ---------- Compact leaderboard row (home preview) ---------- */
function LeaderRowMini({ m, idx }) {
  return (
    <a className="lrm" href="#/leaderboard">
      <span className="lrm-rank">{m.rank<=3 ? <Medal rank={m.rank} /> : <span className="lrm-num tnum">{m.rank}</span>}</span>
      <span className="lrm-model"><ModelBadge id={m.id} size={13} /></span>
      <span className="lrm-prov">{ES.provByKey[m.provider].name}</span>
      <span className="lrm-score mono tnum">{m.score}</span>
      <span className="lrm-wr mono tnum">{(m.winRate*100).toFixed(1)}%</span>
      <span className="lrm-games mono tnum">{m.games.toLocaleString()}</span>
    </a>
  );
}

/* ---------- Stat block ---------- */
function StatBlock({ icon, stat, label, desc }) {
  return (
    <div className="statblock">
      <div className="sb-icon"><Icon name={icon} size={20} /></div>
      <div className="sb-stat mono">{stat}</div>
      <div className="sb-label">{label}</div>
      <p className="sb-desc">{desc}</p>
    </div>
  );
}

Object.assign(window, { MatchCard, GameCard, LeaderRowMini, StatBlock, vsLabel });
