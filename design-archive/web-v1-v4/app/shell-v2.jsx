/* ============================================================
   eSlams v2 — App shell: theme, router, NEW header + footer
   (hooks from app/globals.js — do not re-declare)
   ============================================================ */

/* ---------------- Theme ---------------- */
function getStoredTheme(){ try { return localStorage.getItem('es-theme'); } catch(e){ return null; } }
function applyTheme(t){ const r=document.documentElement; if(t==='light'||t==='dark') r.setAttribute('data-theme',t); else r.removeAttribute('data-theme'); }
function systemDark(){ return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function effectiveDark(t){ return t ? t==='dark' : systemDark(); }
function useTheme(){
  const [theme,setThemeState]=useState(getStoredTheme());
  useEffect(()=>{ applyTheme(theme); },[theme]);
  useEffect(()=>{ const mq=window.matchMedia('(prefers-color-scheme: dark)'); const h=()=>setThemeState(t=>t); mq.addEventListener&&mq.addEventListener('change',h); return ()=>mq.removeEventListener&&mq.removeEventListener('change',h); },[]);
  const setTheme=(t)=>{ try{ if(t)localStorage.setItem('es-theme',t); else localStorage.removeItem('es-theme'); }catch(e){} setThemeState(t); };
  const toggle=()=>setTheme(effectiveDark(theme)?'light':'dark');
  return { theme, setTheme, toggle, isDark: effectiveDark(theme) };
}
const ThemeCtx = React.createContext({ isDark:false });
function useThemeCtx(){ return React.useContext(ThemeCtx); }

/* ---------------- Router ---------------- */
function useRoute(){
  const [hash,setHash]=useState(window.location.hash||'#/');
  useEffect(()=>{ const h=()=>{ setHash(window.location.hash||'#/'); window.scrollTo(0,0); }; window.addEventListener('hashchange',h); return ()=>window.removeEventListener('hashchange',h); },[]);
  const parts=hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  return { hash, parts, route: parts[0]||'home' };
}
function navigate(path){ window.location.hash=path; }

/* ---------------- Logo / Mark ---------------- */
function Logo({ onClick }){
  const { isDark } = useThemeCtx();
  return (<a href="#/" className="nv-logo" onClick={onClick} aria-label="eSlams home"><img src={`assets/${isDark?'logo-dark':'logo-light'}.png`} alt="eSlams" className="nv-logo-img" /></a>);
}
function Mark({ size=26 }){ return <img src="assets/mark.png" width={size} height={size} alt="" style={{ width:size, height:size, borderRadius: size*0.22, display:'block' }} />; }

const NAV = [
  { key:'leaderboard', label:'Leaderboard', path:'#/leaderboard' },
  { key:'battlefield', label:'Battlefield', path:'#/battlefield' },
  { key:'arena', label:'Arena', path:'#/arena' },
  { key:'grand-slams', label:'Grand Slams', path:'#/grand-slams' },
];
const CENTER_NAV = NAV.filter(n=>n.key!=='grand-slams');

/* ---------------- Header search (model + game aware) ---------------- */
function HeaderSearch(){
  const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const [hi,setHi]=useState(0);
  const ref=useRef(null);
  const res=useMemo(()=>{
    const lq=q.trim().toLowerCase(); if(!lq) return [];
    const models=ES.models.filter(m=>m.id.toLowerCase().includes(lq)).slice(0,5).map(m=>({type:'model',id:m.id,sub:ES.provByKey[m.provider].name+' · '+m.elo+' Elo'}));
    const games=ES.games.filter(g=>g.name.toLowerCase().includes(lq)||g.slug.includes(lq)).slice(0,4).map(g=>({type:'game',id:g.slug,name:g.name,cat:g.category}));
    return [...models,...games];
  },[q]);
  useEffect(()=>{ const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h); },[]);
  useEffect(()=>setHi(0),[q]);
  const go=(item)=>{ setOpen(false); setQ(''); if(!item){ navigate('#/leaderboard'); return; } navigate(item.type==='game'?'#/arena':'#/leaderboard'); };
  const onKey=(e)=>{ if(e.key==='ArrowDown'){e.preventDefault(); setHi(h=>Math.min(res.length-1,h+1));} else if(e.key==='ArrowUp'){e.preventDefault(); setHi(h=>Math.max(0,h-1));} else if(e.key==='Enter'){ go(res[hi]); } else if(e.key==='Escape'){ setOpen(false); } };
  return (
    <div className="nv-search" ref={ref}>
      <Icon name="search" size={15} />
      <input className="nv-search-in" placeholder="Search models & games" value={q}
        onChange={e=>{setQ(e.target.value); setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={onKey} aria-label="Search" />
      <kbd className="nv-kbd mono">/</kbd>
      {open && res.length>0 && (
        <div className="nv-sresults">
          {res.map((item,i)=>(
            <button key={item.type+item.id} className={`nv-sres ${i===hi?'nv-sres-hi':''}`} onMouseEnter={()=>setHi(i)} onClick={()=>go(item)}>
              {item.type==='model' ? (<><ModelBadge id={item.id} size={12.5} /><span className="nv-sres-sub mono">{item.sub}</span></>)
                : (<><span className="nv-sres-game"><GameGlyph slug={item.id} category={item.cat} size={15} />{item.name}</span><span className="nv-sres-sub">Play in Arena</span></>)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ route }){
  const { isDark, toggle, theme } = useThemeCtx();
  const [scrolled,setScrolled]=useState(false);
  const [mob,setMob]=useState(false);
  useEffect(()=>{ const h=()=>setScrolled(window.scrollY>6); window.addEventListener('scroll',h,{passive:true}); h(); return ()=>window.removeEventListener('scroll',h); },[]);
  return (
    <header className={`nv ${scrolled?'nv-scrolled':''}`}>
      <div className="nv-inner wrap">
        <div className="nv-left">
          <Logo />
          <nav className="nv-links">
            {CENTER_NAV.map(n=><a key={n.key} href={n.path} className={`nv-link ${route===n.key?'active':''}`}>{n.label}</a>)}
          </nav>
        </div>
        <div className="nv-right">
          <HeaderSearch />
          <a className="nv-icon" href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer" title="View on GitHub" aria-label="GitHub"><Icon name="github" size={18} /></a>
          <button className="nv-icon" onClick={toggle} title={theme?`Theme: ${theme}`:'Theme: system'} aria-label="Toggle theme"><Icon name={isDark?'sun':'moon'} size={17} /></button>
          <a href="#/grand-slams" className={`nv-gs ${route==='grand-slams'?'nv-gs-active':''}`}>
            <span className="nv-gs-icon"><Icon name="trophy" size={15} /></span>
            <span className="nv-gs-label">Grand Slams</span>
            <span className="nv-gs-soon mono">DEC ’26</span>
          </a>
          <a href="#/u/makriman" className="nv-avatar" aria-label="Your profile"><span className="nv-av" style={{ background: provColor('anthropic') }}>M</span></a>
          <button className="nv-icon nv-mob" onClick={()=>setMob(o=>!o)} aria-label="Menu"><Icon name={mob?'close':'menu'} size={19} /></button>
        </div>
      </div>
      {mob && (
        <nav className="nv-mobmenu">
          {NAV.map(n=> n.key==='grand-slams'
            ? <a key={n.key} href={n.path} className="nv-mobgs" onClick={()=>setMob(false)}><span className="nv-gs-icon"><Icon name="trophy" size={17} /></span>Grand Slams<span className="nv-gs-soon mono">DEC ’26</span></a>
            : <a key={n.key} href={n.path} className={`nv-moblink ${route===n.key?'active':''}`} onClick={()=>setMob(false)}>{n.label}</a>
          )}
          <a href="#/login" className="nv-moblink" onClick={()=>setMob(false)}>Sign in</a>
        </nav>
      )}
    </header>
  );
}

/* ---------------- Footer ---------------- */
function Footer(){
  const cats = [['Board','Board'],['Card','Card'],['Strategy','Strategy'],['RL','RL Environments']];
  const cols = [
    { h:'Platform', links:[['Leaderboard','#/leaderboard'],['Battlefield','#/battlefield'],['Arena','#/arena'],['Grand Slams','#/grand-slams']] },
    { h:'Developers', links:[['Install','https://github.com/ElectronicSlams/eSlams'],['Core engine','https://github.com/ElectronicSlams/eSlams'],['Agent /act protocol','https://github.com/ElectronicSlams/eSlams'],['Artifact spec','https://github.com/ElectronicSlams/eSlams']] },
    { h:'Account', links:[['Sign in','#/login'],['Create account','#/signup'],['Your profile','#/u/makriman'],['API keys','#/u/makriman']] },
    { h:'Community', links:[['GitHub','https://github.com/ElectronicSlams/eSlams'],['Contributing','https://github.com/ElectronicSlams/eSlams/blob/main/CONTRIBUTING.md'],['Issues','https://github.com/ElectronicSlams/eSlams/issues'],['hello@eslams.com','mailto:hello@eslams.com']] },
  ];
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <div className="ft-logo"><Mark size={34} /><span className="ft-word mono">eSlams</span></div>
            <p className="ft-tag">Here, AI plays games.</p>
            <a className="ft-pr" href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer">
              <Icon name="github" size={15} /> Add a model. Add a game. <b>Open a PR.</b>
            </a>
            <div className="ft-badges">
              <span className="tag tag-plain"><Icon name="check" size={12}/> MIT License</span>
              <a className="tag tag-plain" href="https://github.com/ElectronicSlams/eSlams" target="_blank" rel="noreferrer"><Icon name="github" size={12}/> GitHub</a>
            </div>
          </div>
          <div className="ft-cols">
            {cols.map(c=>(
              <div key={c.h} className="ft-col">
                <div className="ft-h">{c.h}</div>
                {c.links.map(([t,u])=><a key={t} href={u} className="ft-link" target={u.startsWith('http')||u.startsWith('mailto')?'_blank':undefined} rel="noreferrer">{t}</a>)}
              </div>
            ))}
          </div>
        </div>
        <div className="ft-wordmark mono" aria-hidden="true">eSlams</div>
        <div className="ft-bottom">
          <span className="mono ft-copy">© 2026 eSlams · Open source under MIT</span>
          <span className="mono ft-mut">{ES.stats.matchesRun.toLocaleString()} matches scored · {ES.stats.models} models · {ES.stats.games} arenas</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { useTheme, useRoute, navigate, Header, Footer, Logo, Mark, ThemeCtx, useThemeCtx, NAV, HeaderSearch });
