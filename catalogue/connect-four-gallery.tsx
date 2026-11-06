import type {GamePresentation} from "../src/game/demo";
import { useState } from 'react';
import { Board } from '../src/game/board';
import { LegalDemonstration } from '../src/game/scene';
import { GAME_DEMONSTRATIONS } from '../src/game/demos';
import { CONNECT_FOUR_DESIGNS, CONNECT_FOUR_LAYOUTS, connectFourVariantId, findConnectFourDesign, type ConnectFourDesignId, type ConnectFourLayout } from '../src/game/connect-four-designs';
import { drop, newRound, roundLabel, roundStatus } from './connect-four-round';

export type DesignControls = {
  design: ConnectFourDesignId;
  onDesignChange: (design: ConnectFourDesignId) => void;
  layout: GamePresentation;
  onLayoutChange: (layout: GamePresentation) => void;
};
const frames = GAME_DEMONSTRATIONS['connect-four']!.frames;
const nativeThemes = ['classic-light','classic-dark','neon','club','arcade','midnight'];

function PlayRound({design}: {design: ConnectFourDesignId}) {
  const [history, setHistory] = useState(() => [newRound()]);
  const round = history[history.length - 1]!;
  const status = roundStatus(round);
  function play(column:number) {
    setHistory(previous => {
      const current = previous[previous.length - 1]!;
      const next = drop(current, column);
      return next === current ? previous : [...previous,next];
    });
  }
  return <details className="c4-round"><summary>Play a local two-player round</summary>
    <p aria-live="polite">{status} · {history.length - 1} moves</p>
    <div className="c4-playfield"><div className="c4-columns">{Array.from({length:7},(_,i)=>
      <button key={i} aria-label={`Drop in column ${i+1}`} disabled={round.finished || round.frame.cells[i]!=='.'} onClick={()=>play(i)}>{i+1} ↓</button>)}</div>
      <Board frame={round.frame} design={design} label={roundLabel(round)}/>
    </div>
    <div className="c4-actions"><button disabled={history.length===1} onClick={()=>setHistory(previous=>previous.slice(0,-1))}>Undo move</button>
      <button disabled={history.length===1} onClick={()=>setHistory([newRound()])}>New round</button></div>
  </details>;
}

export function ConnectFourGallery({design,onDesignChange,layout,onLayoutChange}: DesignControls) {
  const [index,setIndex] = useState(frames.length-1);
  const [notice,setNotice] = useState('');
  const selected = findConnectFourDesign(design)!;
  const key = connectFourVariantId(design, layout==='arena-table'?'arena':layout);
  const deepLink = new URL(location.href);
  deepLink.searchParams.set('game','connect-four');
  deepLink.searchParams.set('design',design);
  deepLink.searchParams.set('presentation',layout);
  deepLink.hash = 'game-variants';
  async function copy(value:string, label:string) {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice(value); }
  }
  return <section className="c4-gallery" aria-label="Connect Four design collection">
    <h4>{CONNECT_FOUR_DESIGNS.length} board designs</h4><p>Pick a board, try a round, or move the comparison slider to see the same drop in every design.</p>
    <div className="c4-settings"><label>Board design<select className="input" aria-label="Board design" value={design} onChange={e=>{onDesignChange(e.target.value as ConnectFourDesignId);setNotice('');}}>
      {CONNECT_FOUR_DESIGNS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Compare use case<select className="input" aria-label="Compare use case" value={layout} onChange={e=>{onLayoutChange(e.target.value as ConnectFourLayout);setNotice('');}}>
        {CONNECT_FOUR_LAYOUTS.map(value=><option key={value} value={value}>{value[0]!.toUpperCase()+value.slice(1)}</option>)}</select></label>
    </div>
    <div className="c4-selection"><strong>{selected.name}</strong><code>{key}</code><div className="c4-actions">
      <button onClick={()=>copy(key,'Variant ID')}>Copy variant ID</button><button onClick={()=>copy(deepLink.href,'Design link')}>Copy design link</button>
      <a href="#game-replay">Inspect replay ↓</a></div><output aria-live="polite">{notice}</output></div>
    <PlayRound design={design}/>
    <label className="c4-slider">Comparison position · {index+1} / {frames.length}<input type="range" aria-label="Comparison position" min={0} max={frames.length-1} value={index} onChange={e=>setIndex(Number(e.target.value))}/></label>
    <div className="c4-design-grid">{CONNECT_FOUR_DESIGNS.map(item=>
      <article className="c4-sample" key={item.id} data-sample={item.id} data-selected={item.id===design}>
        <span className="c4-sample-top"><small>{item.id.replace('design-','NO. ').toUpperCase()}</small><small>{item.id===design?'Selected':item.origin}</small></span>
        <span className="c4-name">{item.name}</span>
        <div className="st-game-animation c4-still" data-presentation={layout} aria-hidden="true">
          <LegalDemonstration game="connect-four" design={item.id} frame={frames[index]!} previous={frames[index-1]}/>
        </div>
        <p className="c4-description">{item.detail}</p>
        <button aria-label={`Select ${item.name}`} aria-pressed={item.id===design} onClick={()=>{onDesignChange(item.id);setNotice('');}}>{item.id===design?'Selected':'Use this board'}</button>
      </article>
    )}</div>
    <details className="c4-native"><summary>Six archived native appearances</summary><p>Original Skia captures of one native renderer. These show the archived sample position.</p>
      <div className="c4-native-grid">{nativeThemes.map(theme=><figure key={theme}><img loading="lazy" src={`./c4-native/${theme}.png`} alt={`Native Connect Four, ${theme}`}/><figcaption>{theme}</figcaption></figure>)}</div>
    </details>
    <details><summary>Origins and credits</summary><p>Blueprint is the original Pachisi board. Gumball adapts the eSlams Home v1/v2 rack. Bullseye adapts the Arena App’s ring and pip counters.</p>
      <p>Plotter interprets the open channels in <a href="https://github.com/sotetsuk/pgx/blob/87278d2d6e677fd87248c457207b59cfa42e578d/pgx/_src/dwg/connect_four.py">PGX</a>. Redline uses the two seat colours documented by <a href="https://github.com/Farama-Foundation/PettingZoo/blob/6b3f4950d23da03a0061a6225ab493a47aace3e3/pettingzoo/classic/connect_four/connect_four.py">PettingZoo</a> with original rack and counter artwork. Designs 6–20 are original Pachisi designs.</p>
    </details>
  </section>;
}
