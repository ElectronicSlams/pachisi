import { gameDesigns, gamePresentations, type GameDesignId } from "../src/game/designs";
import { PublicDesignLibrary } from "./public-designs";
import { GameLab } from "./game-lab";
import { GAME_STUDIES } from "./studies";
import { GAME_NOTES } from "./game-notes";
import { StrictMode, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { LegalDemonstration, supportsTablePresentation } from "../src/game/scene";
import { createRoot } from "react-dom/client";
import { Button, Callout, Card, EmptyState, ErrorState, GameGlyph, GameTile, Icon, LiveDot, ModelChip, Matchup, RoleBadge, SectionHead, SettingRow, StadiumDate, StatusStrip, Tag } from "../src/index";
import { Avatar, CopyField, Dialog, Field, PasswordField, Sheet, Tabs, Terminal, MatchPoster } from "../src/client";
import { GameAnimation, GameReplay } from "../src/game/demo";
import type { Demonstration } from "../src/game/demos";
import { GAME_ANIMATIONS } from "../src/game/catalogue";
import { GAME_DEMONSTRATIONS } from "../src/game/demos";
import { GrandSlamsStage } from "../src/stadium/grand-slams-stage";
import { Board } from "../src/game/board";
import type { CellBoardFrame } from "../src/game/board-types";
import { boardFrameFromDisplayFrame, describeBoardFrame } from "../src/game/board-adapter";
import { DISPLAY_FRAME_VERSION, PUBLIC_STATE_VERSION, RENDERER_VERSION, RENDER_ADAPTER_VERSION, type DisplayFrameV1 } from "../src/contract";
import { applyThemePreference, readThemePreference, syncDocumentThemePreference, type ThemePreference } from "../src/theme";
import "../styles/index.css";
import "../styles/fonts.css";
import "../styles/grand-slams.css";
import "./style.css";
const models = [{id:"example/atlas",name:"Atlas",providerName:"Example Lab",providerSlug:"example",markUrl:null},{id:"example/lyra",name:"Lyra",providerName:"Example Lab",providerSlug:"example",markUrl:null}];
const now=Date.UTC(2026,9,29,12);
// Authored synthetic live frame (not match data): tic-tac-toe after four moves, "" marks empty cells.
const liveLabels=["O","","","","X","","","","X"];
const liveFrame:DisplayFrameV1={displayFrameVersion:DISPLAY_FRAME_VERSION,publicStateVersion:PUBLIC_STATE_VERSION,rendererVersion:RENDERER_VERSION,adapterVersion:RENDER_ADAPTER_VERSION,frameId:"example:ttt:3",sourceReplayEventId:null,gameSlug:"tic-tac-toe",rendererFamily:"grid_3x3",actorPlayer:"player_1",actionLabel:"8",cells:liveLabels.map((label,index)=>({id:`cell-${index}`,kind:"board",row:Math.floor(index/3),col:index%3,index,key:null,label})),summary:{activePlayer:"player_2",terminal:false,turn:3,scores:{player_1:0,player_2:0}}};
const liveProjection=boardFrameFromDisplayFrame(liveFrame,{last:[8],label:"Tic-Tac-Toe"});
// Authored synthetic positions (not match data) showing the optional real-play fields.
const chessChrome:CellBoardFrame={kind:"cells",family:"square_board",rows:8,cols:8,chess:true,cells:[..."rnb.kbnr"+"pppp.ppp"+"........"+"....p..."+"......Pq"+".....P.."+"PPPPP..P"+"RNBQKBNR"],last:[3,39],check:[60],orientation:"second-seat-bottom",coordinates:true,result:{winner:"Black",reason:"checkmate"}};
const goChrome:CellBoardFrame={kind:"cells",family:"go_board",rows:9,cols:9,cells:[..."........."+"........."+"..B...W.."+"........."+"....B...."+"........."+"..W...B.."+"........."+"........."],last:[60],coordinates:true,toMove:"White"};
const sections=[['foundations','Foundations'],['components','Components'],['patterns','Patterns'],['games','Game visuals'],['event','Event composition'],['public-designs','Public designs']] as const;
function App(){
 const [theme,setTheme]=useState<ThemePreference>(readThemePreference());
 const [modal,setModal]=useState<"dialog"|"sheet"|null>(null);
 const [tab,setTab]=useState("overview"); const [query,setQuery]=useState(""); const [selectedGame,setGame]=useState(()=>{const slug=new URLSearchParams(location.search).get("game");return slug && Object.hasOwn(GAME_ANIMATIONS,slug) ? slug : "chess";});
 const [choices,setChoices]=useState<Record<string,GameDesignId>>(()=>{
   const requested=new URLSearchParams(location.search).get('design');
   const look=gameDesigns(selectedGame).find(item=>item.id===requested);
   return look?{[selectedGame]:look.id}:{};
 });
 const [presentation,setPresentation]=useState<"card"|"arena"|"arena-table"|"feature"|"event">(()=>gamePresentations(selectedGame).find(layout=>layout===new URLSearchParams(location.search).get("presentation"))??"feature");
 const [category,setCategory]=useState("All");
 const [field,setField]=useState("");
 const matchingGames=Object.entries(GAME_ANIMATIONS).filter(([slug,info])=>(category==="All" || info.category===category) && `${slug} ${info.name} ${GAME_NOTES[slug]?.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
 const game=matchingGames.some(([slug])=>slug===selectedGame) ? selectedGame : matchingGames[0]?.[0] ?? selectedGame;
 const gameInfo=GAME_ANIMATIONS[game]!;
 const design=choices[game]??"design-1";
 function setDesign(id:GameDesignId){setChoices(previous=>({...previous,[game]:id}));}
 const fittedPresentation=presentation==='arena-table'&&!supportsTablePresentation(game)?'arena':presentation;
 useEffect(()=>{const url=new URL(location.href);url.searchParams.set('game',game);
   url.searchParams.set('design',design);url.searchParams.set('presentation',fittedPresentation);
   history.replaceState(null,'',url);},[game,design,fittedPresentation]);
 useEffect(()=>{document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});},[]);
 function inspectGame(slug:string){setQuery('');setCategory('All');setGame(slug);}

 function changeTheme(value:ThemePreference){setTheme(value);applyThemePreference(value);}
 return <div className="catalogue"><a className="catalogue-skip" href="#foundations">Skip to content</a><aside className="catalogue-sidebar"><a className="catalogue-brand" href="#foundations"><img src={new URL("../assets/mark.png",import.meta.url).href} alt="eSlams"/><span>Pachisi<small>eSlams design system</small></span></a><p className="catalogue-version mono">0.2.0 · game design lab</p><nav aria-label="Catalogue">{sections.map(([id,label])=><a href={`#${id}`} key={id}>{label}<span aria-hidden="true">↗</span></a>)}</nav><div className="catalogue-sidebar-bottom"><label htmlFor="theme">Appearance</label><select id="theme" className="input" value={theme} onChange={e=>changeTheme(e.target.value as ThemePreference)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><a className="catalogue-source" href="https://github.com/ElectronicSlams/pachisi">Source & documentation <Icon name="github" size={14}/></a></div></aside>
 <main className="catalogue-main"><section id="foundations" className="catalogue-section"><div className="eyebrow">A shared language</div><h1>Here, eSlams takes shape.</h1><p className="catalogue-lead">The components, game visuals and foundations of the Stadium. Built from the existing product, ready to use together.</p><div className="catalogue-meta"><Tag tone="accent">React + TypeScript</Tag><Tag>Light and dark</Tag><Tag>50 game identities</Tag></div><div className="catalogue-swatch-grid">{[['Canvas','--bg'],['Surface','--surface-2'],['Action','--accent'],['Royal blue','--brand-blue'],['Violet','--brand-violet'],['Win','--win'],['Loss','--loss'],['Draw','--draw']].map(([label,token])=><Card key={token} className="catalogue-swatch"><div style={{background:`var(${token})`}}/><strong>{label}</strong><code>{token}</code></Card>)}</div><div className="catalogue-type"><div><div className="eyebrow">Typography</div><h2>Bold brand. Quiet claims.</h2><p>Sans for the interface. Mono for models, moves and dates.</p></div><div className="mono">Atlas plays d4<br/>29 Oct 2026 · turn 12</div></div><div className="catalogue-metrics">{[['220 ms','Move'],['320 ms','Gravity settle'],['300 ms','Reveal'],['520 ms','Result']].map(([value,label])=><div key={label}><strong className="mono">{value}</strong><span>{label}</span></div>)}</div></section>
 <section id="components" className="catalogue-section"><SectionHead eyebrow="01 · Build with" title="Everyday components" sub="Existing shapes and states, with typed interfaces."/><Card className="catalogue-example"><h3>Buttons</h3><div className="catalogue-row">{(['primary','secondary','ghost','soft'] as const).map(variant=><Button key={variant} variant={variant} icon={variant==='primary'?'gamepad':undefined}>{variant}</Button>)}<Button disabled>Disabled</Button></div><div className="catalogue-row">{(['sm','md','lg'] as const).map(size=><Button key={size} size={size} variant="secondary">{size}</Button>)}</div><code>{'<Button variant="primary" icon="gamepad">Play</Button>'}</code></Card><div className="catalogue-two"><Card className="catalogue-example"><h3>Fields & feedback</h3><Field label="Display name" placeholder="Choose a name" value={field} onChange={e=>setField(e.target.value)} description="This is a catalogue example."/><Field label="Email" type="email" defaultValue="example" error="Enter a complete email address."/><PasswordField label="Password" description="Visibility stays under your control."/><Callout title="Saved" tone="success">Your changes are ready.</Callout></Card><Card className="catalogue-example"><h3>Tags, identity & settings</h3><div className="catalogue-row">{(['plain','accent','win','loss','draw'] as const).map(tone=><Tag key={tone} tone={tone}>{tone}</Tag>)}</div><div className="catalogue-row"><RoleBadge roleName="owner"/><RoleBadge roleName={null}/><Avatar name="Example Person" size={44} className="catalogue-avatar"/></div><SettingRow label="Appearance" value={theme} description="Follows the selected catalogue theme." strong/><ModelChip identity={models[0]!} display="stacked"/><Matchup a={models[0]!} b={models[1]!} winner="a"/><StadiumDate value="2026-10-20" now={now}/></Card></div><Card className="catalogue-example"><h3>Controlled interactions</h3><Tabs ariaLabel="Example sections" items={[{value:'overview',label:'Overview'},{value:'details',label:'Details'},{value:'unavailable',label:'Unavailable',disabled:true}]} value={tab} onValueChange={setTab}/><p data-testid="tab-value">Selected: {tab}</p><div className="catalogue-row"><Button onClick={()=>setModal('dialog')}>Open dialog</Button><Button variant="secondary" onClick={()=>setModal('sheet')}>Open sheet</Button></div><CopyField label="Install a local package" value="pnpm add ./vendor/pachisi-0.2.0.tgz"/><Terminal title="Local workflow" lines={[{id:'build',content:'pnpm build'},{id:'test',content:'pnpm test'}]} copyText="pnpm build
pnpm test"/></Card></section>
 <section id="patterns" className="catalogue-section"><SectionHead eyebrow="02 · Compose" title="Stadium patterns" sub="Supplied data, faithful rendering and clear states. These examples use fictional match metadata."/><StatusStrip lastMatchAt="2026-10-20" now={now}/><div className="catalogue-two"><MatchPoster now={now} match={{id:'example',href:'#games',game:'chess',gameName:'Chess',status:'completed',date:'2026-10-20',a:models[0]!,b:models[1]!,winner:'a',stakes:'Catalogue example · bundled demonstration'}}/><Card><EmptyState title="No matches yet" game="chess" action={{href:'#games',label:'Explore games'}}>Matches appear here once they are available.</EmptyState></Card></div><div className="catalogue-two"><Card><ErrorState title="Replay unavailable" action={{href:'#patterns',label:'Back to matches'}}>The original match remains unchanged.</ErrorState></Card><Card className="catalogue-example"><h3>Freshness & selection</h3><LiveDot/><GameTile slug="connect-four" name="Connect Four" variant="standard" active onSelect={()=>inspectGame('connect-four')}/></Card></div></section>
 <section id="games" className="catalogue-section"><SectionHead eyebrow="03 · Play and watch" title="Explore. Play back. Inspect." sub="Choose a game to compare its layouts, variants and position studies, or inspect a replay frame by frame."/><div className="catalogue-game-controls"><Field label="Find a game" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Chess, poker, CartPole…"/><label>Category<select className="input" aria-label="Game category" value={category} onChange={e=>setCategory(e.target.value)}>{["All","Board","Card","Strategy","RL"].map(x=><option key={x}>{x}</option>)}</select></label><label>Presentation<select aria-label="Presentation" className="input" value={fittedPresentation} onChange={e=>setPresentation(e.target.value as typeof presentation)}>{['card','arena','arena-table','feature','event'].map(x=><option key={x} value={x} disabled={x==='arena-table'&&!supportsTablePresentation(game)}>{x==='arena-table'?'Arena table (cards)':x[0]!.toUpperCase()+x.slice(1)}</option>)}</select></label></div>{matchingGames.length ? <><div className="catalogue-game-choice"><label>Selected game<select aria-label="Selected game" className="input" value={game} onChange={e=>setGame(e.target.value)}>{matchingGames.map(([slug,info])=><option key={slug} value={slug}>{info.name}</option>)}</select></label><a className="catalogue-variants-link" href="#game-variants">See all variants for {gameInfo.name} ↓</a></div><Card className="catalogue-stage"><div className="catalogue-stage-head"><div><h3>{gameInfo.name}</h3><span className="mono">{game} · {gameInfo.frames} frames · {GAME_DEMONSTRATIONS[game]!.version}</span></div><Tag>Demonstration</Tag></div><GameAnimation design={design} game={game} gameName={gameInfo.name} group="catalogue-stage" presentation={fittedPresentation}/>{fittedPresentation==='arena-table'&&<p className="catalogue-study-note">Table centre preview. Player seats belong around this panel in the host arena.</p>}</Card><GameLab game={game} onGameChange={inspectGame} controls={{design,onDesignChange:setDesign,layout:fittedPresentation,onLayoutChange:setPresentation}}/></>:<p role="status">No games match these filters. Clear the search or select another category.</p>}<div className="catalogue-two"><Card className="catalogue-example"><h3>Live frame projection</h3><div style={{maxWidth:240}}><Board frame={liveProjection.frame} label={describeBoardFrame(liveProjection.frame,"Tic-Tac-Toe")}/></div><p className="mono">Turn {liveProjection.metadata.turn} · {liveProjection.metadata.actorPlayer} played {liveProjection.metadata.actionLabel} · {liveProjection.metadata.activePlayer} to move · issues: {liveProjection.issues.length}</p></Card><Card className="catalogue-example"><h3>From the render contract</h3><p>An authored synthetic <span className="mono">DisplayFrameV1</span> projected through <span className="mono">boardFrameFromDisplayFrame</span>. Actor, turn and scores stay in metadata; <span className="mono">last</span> is host-supplied. See docs/contracts.md.</p><code>{'const {frame, issues, metadata} = boardFrameFromDisplayFrame(displayFrame, {last: [8]});\n<Board frame={frame} label="Tic-Tac-Toe board, 3 marks"/>'}</code></Card></div><div className="catalogue-two"><Card className="catalogue-example"><h3>Real-play chrome</h3><div style={{maxWidth:240}}><Board frame={chessChrome} label="Chess, Black's view"/></div><p>Optional <span className="mono">orientation</span>, <span className="mono">check</span>, <span className="mono">coordinates</span> and <span className="mono">result</span> on a cell frame.</p></Card><Card className="catalogue-example"><h3>Go star points</h3><div style={{maxWidth:240}}><Board frame={goChrome}/></div><p>Hoshi on 9, 13 and 19 boards; <span className="mono">toMove</span> is shown and announced.</p></Card></div><div className="catalogue-game-grid">{matchingGames.map(([slug,info])=><button key={slug} className={`catalogue-game${game===slug?' selected':''}`} aria-pressed={game===slug} onClick={()=>setGame(slug)} data-game={slug}><GameGlyph slug={slug} size={28}/><span>{info.name}</span></button>)}</div></section>
 <section id="event" className="catalogue-section"><SectionHead eyebrow="04 · Event" title="Grand Slams composition" sub="The existing floating-board stage, with host-supplied content and destinations."/><GrandSlamsStage titleId="event-title" gameLinks={{chess:'#games',hex:'#games',go:'#games','connect-four':'#games'}}><div className="catalogue-event-copy"><div className="eyebrow">eSlams</div><h2 id="event-title">Grand Slams</h2><p>A stage for the games.</p><Tag>Catalogue example</Tag></div></GrandSlamsStage></section>
 <PublicDesignLibrary/>
 <footer className="catalogue-footer">Pachisi · Electronic Slams · MIT code, separate brand and font notices. <a href="https://github.com/ElectronicSlams/pachisi">Read the documentation ↗</a></footer></main>
 <Dialog open={modal==='dialog'} onClose={()=>setModal(null)} title="A reusable dialog" description="Focus stays inside, Escape closes, and focus returns to its trigger." footer={<Button onClick={()=>setModal(null)}>Done</Button>}><Field label="Example field" placeholder="Try keyboard navigation"/></Dialog><Sheet open={modal==='sheet'} onClose={()=>setModal(null)} title="A Stadium sheet" description="A bottom sheet on phones and a centred dialog on desktop." footer={<Button onClick={()=>setModal(null)}>Close sheet</Button>}><p>The application supplies content and actions.</p></Sheet></div>;
}
// Restore a saved Light/Dark choice before the first render (index.html already did this
// pre-paint; this keeps the document and the select in sync if that script was blocked).
syncDocumentThemePreference(readThemePreference());
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);


type DropMeasure={width:number;row:number;drop:number;duration:number;boardTop:number;startTop:number;endTop:number;travel:number;rowPitch:number;colPitch:number;endCentreOffset:number;overshoot:number};
declare global { interface Window { pachisiProbe?: (host: HTMLElement) => Promise<{frames:number;bad:number;invalid:string[]}>; pachisiDropProbe?: (host: HTMLElement, widths: readonly number[]) => Promise<DropMeasure[]>; } }
// Connect Four drop geometry (review F5): the last disc's stDrop animation, paused at its first
// frame, its 70% overshoot key and its end, at each board width, for the top and bottom rows.
window.pachisiDropProbe = async (host, widths) => {
 const probeRoot=createRoot(host);const out:DropMeasure[]=[];
 for(const width of widths)for(const row of [0,2,5]){
  host.style.width=`${width}px`;
  const index=row*7+3;const cells=Array<string>(42).fill('.');for(let r=row;r<6;r++)cells[r*7+3]=r===row?'R':'Y';
  flushSync(()=>probeRoot.render(<Board key={`${width}:${row}`} frame={{kind:'cells',family:'connect_four',rows:6,cols:7,cells,last:[index]}}/>));
  const board=host.querySelector('.st-board-c4')!,all=[...board.querySelectorAll('.st-cell')].map(el=>el.getBoundingClientRect());
  const cell=board.querySelector('[data-last]')!,disc=cell.querySelector('.st-disc') as HTMLElement;
  const anim=disc.getAnimations()[0]!;anim.pause();const duration=Number(anim.effect!.getComputedTiming().duration);
  anim.currentTime=0;const start=disc.getBoundingClientRect();
  anim.currentTime=duration*.7;const over=disc.getBoundingClientRect();
  anim.currentTime=duration;const end=disc.getBoundingClientRect();const c=cell.getBoundingClientRect();
  out.push({width,row,drop:row+1,duration,boardTop:board.getBoundingClientRect().top,startTop:start.top,endTop:end.top,travel:end.top-start.top,rowPitch:all[7]!.top-all[0]!.top,colPitch:all[1]!.left-all[0]!.left,endCentreOffset:end.top+end.height/2-(c.top+c.height/2),overshoot:(over.top-end.top)/end.height});
 }
 probeRoot.unmount();host.remove();return out;
};
window.pachisiProbe = async (host) => {
 const probeRoot=createRoot(host);let frames=0,bad=0;const invalid:string[]=[];
 for(const [game,demo] of Object.entries(GAME_DEMONSTRATIONS))for(const [index,frame] of demo.frames.entries()){
  flushSync(()=>probeRoot.render(<LegalDemonstration game={game} frame={frame} previous={demo.frames[index-1]}/>));
  let failed=/NaN|Infinity/.test(host.innerHTML);
  for(const svg of host.querySelectorAll('svg')){const box=svg.getBBox();if(![box.x,box.y,box.width,box.height].every(Number.isFinite))failed=true;}
  if(failed){bad++;invalid.push(`${game}:${frame.turn}`);}frames++;
 }
 probeRoot.unmount();host.remove();return {frames,bad,invalid};
};

// Local catalogue geometry evidence, separate from immutable Core traces.
declare global { interface Window { pachisiStudyProbe?: (host: HTMLElement) => Promise<{studies:number;frames:number;bad:number;invalid:string[]}>; } }
window.pachisiStudyProbe = async host => {
 const root=createRoot(host);const invalid:string[]=[];let frames=0;
 for(const study of GAME_STUDIES)for(const [index,frame] of study.demo.frames.entries()){
  flushSync(()=>root.render(<div className="st-replay-board"><LegalDemonstration game={study.game} frame={frame} previous={study.demo.frames[index-1]} variantNote={null}/></div>));
  let failed=/NaN|Infinity|data-scene-state="unavailable"/.test(host.innerHTML);
  for(const svg of host.querySelectorAll('svg')){
   const box=svg.getBBox(),vb=svg.viewBox.baseVal;
   if(![box.x,box.y,box.width,box.height].every(Number.isFinite) || box.x<vb.x-1 || box.y<vb.y-1 || box.x+box.width>vb.x+vb.width+1 || box.y+box.height>vb.y+vb.height+1)failed=true;
  }
  if(failed)invalid.push(`${study.id}:${index}`);frames++;
 }
 root.unmount();host.remove();return {studies:GAME_STUDIES.length,frames,bad:invalid.length,invalid};
};

// GameReplay host regression (review 2026-11-06 #1): a host that re-renders every 50 ms with
// an equal but new demonstration object must keep the viewer's frame; a different trace resets.
function ReplayHost({ trace }: { readonly trace: Demonstration }) {
 const [tick,setTick]=useState(0);
 useEffect(()=>{const id=setInterval(()=>setTick(t=>t+1),50);return()=>clearInterval(id);},[]);
 return <div data-host-tick={tick}><GameReplay game="chess" gameName="Chess" demonstration={{...trace}}/></div>;
}
declare global { interface Window { pachisiReplayHostProbe?: (host: HTMLElement) => Promise<{afterNext:string|null;afterRerenders:string|null;ticks:number;afterSwap:string|null}>; } }
window.pachisiReplayHostProbe = async host => {
 const base=GAME_DEMONSTRATIONS.chess!,root=createRoot(host),wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
 const frame=()=>host.querySelector('.st-game-replay')?.getAttribute('data-replay-frame') ?? null;
 flushSync(()=>root.render(<ReplayHost trace={base}/>));
 const next=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Next')!;
 next().click();await wait(0);next().click();await wait(0);
 const afterNext=frame(),startTick=Number(host.firstElementChild?.getAttribute('data-host-tick'));
 await wait(600);
 const afterRerenders=frame(),ticks=Number(host.firstElementChild?.getAttribute('data-host-tick'))-startTick;
 flushSync(()=>root.render(<ReplayHost trace={{...base,frames:base.frames.slice(0,4)}}/>));await wait(0);
 const afterSwap=frame();
 root.unmount();host.remove();return {afterNext,afterRerenders,ticks,afterSwap};
};

// Contact sheet for local visual review; not shipped as a library API.
declare global { interface Window { pachisiGallery?: (host: HTMLElement, category: string) => void; } }
window.pachisiGallery = (host,category) => {
 const entries=Object.entries(GAME_ANIMATIONS).filter(([,g])=>g.category===category);
 const root=createRoot(host);
 flushSync(()=>root.render(<div style={{display:'grid',gridTemplateColumns:'repeat(4, 320px)',gap:16,padding:16,background:'var(--surface)'}}>{entries.map(([slug,g])=>{
  const d=GAME_DEMONSTRATIONS[slug]!;return <div key={slug}><h3 style={{fontSize:14,marginBottom:8}}>{g.name}</h3><div style={{width:320,height:280,containerType:'inline-size',border:'1px solid var(--border)'}}><LegalDemonstration game={slug} frame={d.frames.at(-1)!} previous={d.frames.at(-2)}/></div></div>;
 })}</div>));
};
