/* ============================================================
   eSlams — Shared UI components & icon system
   (hooks come from app/globals.js — do not re-declare)
   ============================================================ */

/* ---------------- Icons (outline, 1.6 stroke) ---------------- */
const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" fill="currentColor" stroke="none"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  star: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  chevronRight: '<path d="M9 6l6 6-6 6"/>',
  chevronLeft: '<path d="M15 6l-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17L17 7M8 7h9v9"/>',
  play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  skipBack: '<path d="M19 5v14L9 12zM5 5v14" />',
  skipFwd: '<path d="M5 5v14l10-7zM19 5v14"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
  sort: '<path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 17h6M12 13v4M9 21h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  swords: '<path d="M14.5 14.5L21 21M19 5l-9.5 9.5M14 4h5v5M9.5 9.5L3 3M3 19l6.5-6.5M10 20H5v-5"/>',
  gamepad: '<rect x="3" y="8" width="18" height="9" rx="4"/><path d="M7 12.5h2M8 11.5v2M15 11.5h.01M17.5 13.5h.01"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M19.1 4.9l-2.1 2.1M7 16.9l-2.1 2.1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M17 6l2 2M14 9l2 2"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M9.5 19a2.5 2.5 0 0 0 5 0"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M13 15h4"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  fire: '<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 11 8 9 12 3z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/><rect x="10" y="10" width="4" height="4" rx="1"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chip: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="12" cy="12" r="3"/>',
};
function Icon({ name, size = 18, stroke = 1.6, className = '', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      className={'icn ' + className} style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }} />
  );
}

/* ---------------- Game glyphs (per category, a few specific) ---------------- */
const GAME_GLYPH = {
  Board: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/>',
  Card: '<rect x="4" y="3" width="11" height="15" rx="2"/><path d="M9 7l2 3-2 3-2-3z" fill="currentColor" stroke="none"/><rect x="9" y="7" width="11" height="14" rx="2" opacity="0.5"/>',
  Strategy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  RL: '<path d="M3 14c2 0 2-6 4-6s2 8 4 8 2-10 4-10 2 8 4 8"/><path d="M3 19h18" opacity="0.4"/>',
};
const GAME_GLYPH_SPECIFIC = {
  chess: '<path d="M9 21h6M8 18h8l-1-3H9zM10 15l-.5-3M14 15l.5-3M9.5 12h5M12 4a2 2 0 0 1 1 3.7L13 9h-2l-1-1.3A2 2 0 0 1 12 4z"/>',
  go: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 14h16M9 4v16M14 4v16"/><circle cx="9" cy="9" r="2" fill="currentColor" stroke="none"/><circle cx="14" cy="14" r="2"/>',
  'tic-tac-toe': '<path d="M9 4v16M15 4v16M4 9h16M4 15h16"/><path d="M5.5 5.5l2.5 2.5M8 5.5L5.5 8" /><circle cx="18" cy="12" r="2"/>',
  'connect-four': '<rect x="4" y="5" width="16" height="15" rx="2"/><circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.6"/><circle cx="9" cy="15" r="1.6"/><circle cx="15" cy="15" r="1.6" fill="currentColor" stroke="none"/>',
  'rock-paper-scissors': '<path d="M7 11V7a1.5 1.5 0 0 1 3 0M10 9V6a1.5 1.5 0 0 1 3 0v3M13 9V7a1.5 1.5 0 0 1 3 0v5a5 5 0 0 1-5 5h-1a4 4 0 0 1-3-1.5L4 14a1.5 1.5 0 0 1 2-2l1 1"/>',
  'liars-dice': '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
  blackjack: '<rect x="4" y="3" width="11" height="15" rx="2"/><path d="M9.5 11c-1.2 0-2-1-2-2s.8-1.8 2-3c1.2 1.2 2 2 2 3s-.8 2-2 2zM9.5 11v2" /><rect x="9" y="7" width="11" height="14" rx="2" opacity="0.45"/>',
  hex: '<path d="M12 3l7 4v8l-7 4-7-4V7z"/><path d="M12 3v8M12 11l7 4M12 11l-7 4" opacity="0.6"/>',
};
function GameGlyph({ slug, category, size = 22, stroke = 1.6, style = {} }) {
  const inner = GAME_GLYPH_SPECIFIC[slug] || GAME_GLYPH[category] || GAME_GLYPH.Board;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }} />
  );
}

/* ---------------- Provider chip ---------------- */
function provColor(key) {
  const p = ES.provByKey[key];
  const hue = p ? p.hue : 220;
  return `oklch(0.62 0.13 ${hue})`;
}
function ProviderDot({ provider, size = 16 }) {
  const p = ES.provByKey[provider];
  const initials = (p ? p.name : provider).replace(/[^A-Za-z0-9]/g,' ').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <span className="provdot" style={{ width:size, height:size, background:`color-mix(in oklch, ${provColor(provider)} 18%, transparent)`, color:provColor(provider), fontSize: size*0.46 }}>
      {initials}
    </span>
  );
}

/* ---------------- Model badge ---------------- */
function ModelBadge({ id, size = 13, showFamily = false, dot = true, className='' }) {
  const m = ES.modelById[id];
  const [prov, name] = id.split('/');
  return (
    <span className={'modelbadge ' + className} title={id}>
      {dot && <ProviderDot provider={prov} size={size + 3} />}
      <span className="mono modelname" style={{ fontSize: size }}>
        <span className="mb-prov">{prov}/</span>{name}
      </span>
      {showFamily && m && <span className="mb-fam">{m.family}</span>}
    </span>
  );
}

/* ---------------- Generic UI atoms ---------------- */
function Button({ children, variant = 'primary', size = 'md', icon, iconRight, onClick, href, type, className = '', disabled }) {
  const cls = `btn btn-${variant} btn-${size} ${className}`;
  const content = (<>{icon && <Icon name={icon} size={size==='lg'?18:16} />}{children && <span>{children}</span>}{iconRight && <Icon name={iconRight} size={size==='lg'?18:16} />}</>);
  if (href) return <a className={cls} href={href} onClick={onClick} target={href.startsWith('http')?'_blank':undefined} rel="noreferrer">{content}</a>;
  return <button className={cls} onClick={onClick} type={type||'button'} disabled={disabled}>{content}</button>;
}

function Tag({ children, tone = 'default', className='' }) {
  return <span className={`tag tag-${tone} ${className}`}>{children}</span>;
}

function DifficultyTag({ level }) {
  const tone = level === 'Beginner' ? 'win' : level === 'Advanced' ? 'loss' : 'draw';
  return <span className={`difftag difftag-${tone}`}>{level}</span>;
}

function ResultChip({ result, a, b }) {
  // result: 'a'|'b'|'draw'  → for match cards
  if (result === 'draw') return <span className="reschip reschip-draw">Draw</span>;
  return <span className={`reschip reschip-${result==='a'?'win':'loss'}`}>{result === 'a' ? 'A wins' : 'B wins'}</span>;
}

function StatusBadge({ status }) {
  if (status === 'live') return <span className="statusb statusb-live"><span className="livedot" />Live</span>;
  if (status === 'scheduled') return <span className="statusb statusb-sched"><Icon name="clock" size={12} />Upcoming</span>;
  return <span className="statusb statusb-done">Completed</span>;
}

function Medal({ rank }) {
  if (rank > 3) return null;
  const c = rank === 1 ? 'var(--gold)' : rank === 2 ? 'var(--silver)' : 'var(--bronze)';
  return <span className="medal" style={{ color: c, borderColor: `color-mix(in oklch, ${c} 50%, transparent)`, background:`color-mix(in oklch, ${c} 12%, transparent)` }}>{rank}</span>;
}

/* ---------------- Sparkline ---------------- */
function Sparkline({ data, w = 84, h = 26, positive }) {
  const path = useMemo(() => {
    if (!data || !data.length) return '';
    const min = Math.min(...data), max = Math.max(...data);
    const rng = (max - min) || 1;
    return data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - 3 - ((v - min) / rng) * (h - 6);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [data, w, h]);
  const up = positive === undefined ? (data[data.length-1] >= data[0]) : positive;
  const col = up ? 'var(--win)' : 'var(--loss)';
  return (
    <svg width={w} height={h} className="spark" aria-hidden="true">
      <path d={path} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ value }) {
  const up = value >= 0;
  return <span className={`delta ${up?'delta-up':'delta-down'}`}>{up?'▲':'▼'} {Math.abs(value)}</span>;
}

/* ---------------- Terminal block ---------------- */
function Terminal({ lines, title = 'bash', single = false }) {
  const [copied, setCopied] = useState(false);
  const text = lines.map(l => l.cmd || l.text || '').join('\n');
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(()=>setCopied(false), 1400); };
  return (
    <div className={`terminal ${single?'terminal-single':''}`}>
      <div className="term-bar">
        <span className="term-dots"><i/><i/><i/></span>
        <span className="term-title mono">{title}</span>
        <button className="term-copy" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={13} />{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="term-body mono">
        {lines.map((l, i) => (
          <div key={i} className="term-line">
            {l.cmd && <span className="term-prompt">$</span>}
            <span dangerouslySetInnerHTML={{ __html: l.cmd || l.text }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Section header ---------------- */
function SectionHead({ eyebrow, title, action, sub }) {
  return (
    <div className="sechead">
      <div>
        {eyebrow && <div className="eyebrow" style={{marginBottom:8}}>{eyebrow}</div>}
        <h2 className="sechead-title">{title}</h2>
        {sub && <p className="sechead-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Empty / loading ---------------- */
function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width:size, height:size }} />;
}

Object.assign(window, {
  Icon, GameGlyph, ProviderDot, ModelBadge, Button, Tag, DifficultyTag,
  ResultChip, StatusBadge, Medal, Sparkline, Delta, Terminal, SectionHead,
  Spinner, provColor,
});
