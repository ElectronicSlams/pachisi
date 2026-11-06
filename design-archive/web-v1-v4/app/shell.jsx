/* ============================================================
   eSlams — App shell: header, footer, theme, router
   ============================================================ */

/* ---------------- Theme ---------------- */
function getStoredTheme(){ try { return localStorage.getItem('es-theme'); } catch(e){ return null; } }
function applyTheme(t){
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  else root.removeAttribute('data-theme');
}
function systemDark(){ return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function effectiveDark(t){ return t ? t === 'dark' : systemDark(); }

function useTheme(){
  const [theme, setThemeState] = useState(getStoredTheme()); // null|light|dark
  useEffect(()=>{ applyTheme(theme); }, [theme]);
  useEffect(()=>{
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const h = ()=> setThemeState(t=>t); // re-render on system change when in auto
    mq.addEventListener && mq.addEventListener('change', h);
    return ()=> mq.removeEventListener && mq.removeEventListener('change', h);
  },[]);
  const setTheme = (t)=>{
    try { if (t) localStorage.setItem('es-theme', t); else localStorage.removeItem('es-theme'); } catch(e){}
    setThemeState(t);
  };
  const toggle = ()=> setTheme(effectiveDark(theme) ? 'light' : 'dark');
  return { theme, setTheme, toggle, isDark: effectiveDark(theme) };
}

/* ---------------- Router ---------------- */
function useRoute(){
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(()=>{
    const h = ()=> { setHash(window.location.hash || '#/'); window.scrollTo(0,0); };
    window.addEventListener('hashchange', h);
    return ()=> window.removeEventListener('hashchange', h);
  },[]);
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { hash, parts, route: parts[0] || 'home' };
}
function navigate(path){ window.location.hash = path; }

/* ---------------- Logo ---------------- */
function Logo({ onClick }) {
  const { isDark } = useThemeCtx();
  return (
    <a href="#/" className="logo" onClick={onClick} aria-label="eSlams home">
      <img src={`assets/${isDark ? 'logo-dark' : 'logo-light'}.png`} alt="eSlams" className="logo-img" />
    </a>
  );
}
function Mark({ size = 26 }) {
  return <img src="assets/mark.png" width={size} height={size} alt="" className="markimg" style={{ width:size, height:size }} />;
}

/* theme context so Logo can read it */
const ThemeCtx = React.createContext({ isDark:false });
function useThemeCtx(){ return React.useContext(ThemeCtx); }

/* ---------------- Header ---------------- */
const NAV = [
  { key:'leaderboard', label:'Leaderboard', path:'#/leaderboard', icon:'trophy' },
  { key:'battlefield', label:'Battlefield', path:'#/battlefield', icon:'swords' },
  { key:'arena', label:'Arena', path:'#/arena', icon:'gamepad' },
  { key:'grand-slams', label:'Grand Slams', path:'#/grand-slams', icon:'bolt' },
];

function Header({ route }) {
  const { isDark, toggle, theme } = useThemeCtx();
  const [scrolled, setScrolled] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  useEffect(()=>{
    const h = ()=> setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', h, { passive:true }); h();
    return ()=> window.removeEventListener('scroll', h);
  },[]);
  return (
    <header className={`hdr ${scrolled?'hdr-scrolled':''}`}>
      <div className="hdr-inner wrap">
        <Logo />
        <nav className="hdr-nav">
          {NAV.map(n => (
            <a key={n.key} href={n.path} className={`hdr-link ${route===n.key?'active':''}`}>{n.label}</a>
          ))}
        </nav>
        <div className="hdr-right">
          <button className="icon-btn" onClick={toggle} title={theme?`Theme: ${theme}`:'Theme: system'} aria-label="Toggle theme">
            <Icon name={isDark ? 'sun' : 'moon'} size={17} />
          </button>
          <a className="hdr-star" href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer">
            <Icon name="github" size={15} /><span className="mono">{(ES.stats.stars/1000).toFixed(1)}k</span>
          </a>
          <a href="#/u/makriman" className="avatar-btn" aria-label="Your profile">
            <span className="avatar" style={{ background: provColor('anthropic') }}>{'M'}</span>
          </a>
          <button className="icon-btn mob-only" onClick={()=>setMobOpen(o=>!o)} aria-label="Menu">
            <Icon name={mobOpen?'close':'menu'} size={19} />
          </button>
        </div>
      </div>
      {mobOpen && (
        <nav className="hdr-mob">
          {NAV.map(n => (
            <a key={n.key} href={n.path} className={`hdr-mob-link ${route===n.key?'active':''}`} onClick={()=>setMobOpen(false)}>
              <Icon name={n.icon} size={18} />{n.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  const cols = [
    { h:'Platform', links:[['Leaderboard','#/leaderboard'],['Battlefield','#/battlefield'],['Arena','#/arena'],['Grand Slams','#/grand-slams']] },
    { h:'Develop', links:[['Core engine','https://github.com/ElectronicSlams/eSlams'],['Agent /act protocol','https://github.com/ElectronicSlams/eSlams'],['Provider registry','https://github.com/ElectronicSlams/eSlams'],['Artifact spec','https://github.com/ElectronicSlams/eSlams']] },
    { h:'Community', links:[['GitHub','https://github.com/ElectronicSlams/eSlams'],['Contributing','https://github.com/ElectronicSlams/eSlams/blob/main/CONTRIBUTING.md'],['Issues','https://github.com/ElectronicSlams/eSlams/issues'],['hello@eslams.com','mailto:hello@eslams.com']] },
  ];
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div className="ftr-brand">
            <div className="ftr-logo"><Mark size={30} /><span className="ftr-word mono">eslams</span></div>
            <p className="ftr-tag">Here, AI plays games.</p>
            <div className="ftr-cta">
              <Icon name="github" size={15} />
              <span>Add a model. Add a game. <a href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer" className="ftr-pr">Open a PR.</a></span>
            </div>
          </div>
          {cols.map(c => (
            <div key={c.h} className="ftr-col">
              <div className="ftr-h">{c.h}</div>
              {c.links.map(([t,u]) => (
                <a key={t} href={u} className="ftr-link" target={u.startsWith('http')||u.startsWith('mailto')?'_blank':undefined} rel="noreferrer">{t}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="ftr-bottom">
          <span className="mono ftr-copy">© 2026 eSlams · MIT License</span>
          <div className="ftr-meta">
            <span className="tag tag-plain"><Icon name="check" size={12} />Open source</span>
            <span className="mono ftr-mut">{ES.stats.matchesRun.toLocaleString()} matches scored</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  useTheme, useRoute, navigate, Header, Footer, Logo, Mark, ThemeCtx, useThemeCtx, NAV,
});
