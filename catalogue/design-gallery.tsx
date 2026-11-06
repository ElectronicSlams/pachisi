import { useState } from 'react';
import { gameDesigns, gamePresentations, resolveGameVariant } from '../src/game/designs';
import { GAME_DEMONSTRATIONS } from '../src/game/demos';
import { LegalDemonstration } from '../src/game/scene';
import type { DesignControls } from './connect-four-gallery';

export function DesignGallery({game,design,layout,onDesignChange,onLayoutChange}:DesignControls & {game:string}) {
  const frames=GAME_DEMONSTRATIONS[game]!.frames;
  const [frame,setFrame]=useState(Math.floor(frames.length/2));
  const [notice,setNotice]=useState('');
  const looks=gameDesigns(game), selected=resolveGameVariant(game,design,layout);
  if (!selected.ok) return <p role="status">This combination is unavailable.</p>;
  const key=selected.id;
  async function copy(link:boolean) {
    const url=new URL(location.href);
    url.searchParams.set('game',game);url.searchParams.set('design',design);url.searchParams.set('presentation',layout);url.hash='game-variants';
    const value=link?url.href:key;
    try {await navigator.clipboard.writeText(value);setNotice(link?'Design link copied.':'Variant ID copied.');}
    catch {setNotice(value);}
  }
  return <section className="c4-gallery" aria-label="Compare visual designs">
    <h4>{looks.length} visual designs</h4><p>Compare the same position in each design. Choose one to use it in the stage, replay and position studies.</p>
    <div className="c4-settings"><label>Selected design<select className="input" aria-label="Selected design" value={design} onChange={e=>{onDesignChange(looks.find(s=>s.id===e.target.value)!.id);setNotice('');}}>{looks.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <label>Design placement<select className="input" aria-label="Design placement" value={layout} onChange={e=>{onLayoutChange(gamePresentations(game).find(p=>p===e.target.value)!);setNotice('');}}>{gamePresentations(game).map(p=><option value={p} key={p}>{p}</option>)}</select></label></div>
    <div className="c4-selection"><strong>{selected.design.name}</strong><code>{key}</code><div className="c4-actions"><button onClick={()=>copy(false)}>Copy variant ID</button><button onClick={()=>copy(true)}>Copy design link</button><a href="#game-replay">Inspect replay ↓</a></div><output aria-live="polite">{notice}</output></div>
    <label className="c4-slider">Comparison position · {frame+1} / {frames.length}<input type="range" aria-label="Comparison position" min={0} max={frames.length-1} value={frame} onChange={e=>setFrame(Number(e.target.value))}/></label>
    <div className="c4-design-grid">{looks.map(look=><article className="c4-sample" key={look.id} data-game-look={look.id} data-selected={look.id===design}>
      <span className="c4-sample-top"><small>{look.id}</small></span><h4 className="c4-name">{look.name}</h4>
      <div className="st-game-animation c4-still" data-presentation={layout} role="img" aria-label={`${look.name} at position ${frame+1}`}>
        <LegalDemonstration game={game} design={look.id} frame={frames[frame]!} previous={frames[frame-1]} externalSeats={layout==='arena-table'}/>
      </div><p className="c4-description">{look.detail}</p><button aria-pressed={look.id===design} onClick={()=>{onDesignChange(look.id);setNotice('');}}>Use {look.name}</button>
    </article>)}</div>
    {looks.some(s=>s.name==='Porcelain')&&<p className="catalogue-study-note">Porcelain uses the two original MIT-licensed stone drawings from <a href="https://github.com/SabakiHQ/Shudan/tree/bf2be30c568338c77294a782742036c1b3167c72">Sabaki Shudan</a>.</p>}
  </section>;
}
