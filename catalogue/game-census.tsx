import {useState} from 'react';
import census from './local-game-design-census.json';

type RecordGroup = readonly {name:string;kind:string;note:string;evidence:readonly {path:string;line?:number}[]}[];
function EvidenceList({rows}:{rows:RecordGroup}) {
  return <ul className="census-list">{rows.map(row=><li key={row.name}>
    <strong>{row.name}</strong> <small>{row.kind}</small>
    <p>{row.note}</p>
    {row.evidence.map(ref=><code key={ref.path}>{ref.path}{'line' in ref ? `:${ref.line}` : ''}</code>)}
  </li>)}</ul>;
}

export function GameCensus({slug,onGameChange}:{slug:string;onGameChange:(game:string)=>void}) {
  const game=census.games.find(entry=>entry.slug===slug)!;
  const [group,setGroup]=useState('screens');
  const sections=[
    {id:'screens',title:'Screen sources',rows:game.archive.filter(row=>['Prototype','Archived renderer'].includes(row.kind))},
    {id:'shared',title:'Shared layouts',rows:game.archive.filter(row=>row.kind==='Shared layout')},
    {id:'public',title:'GitHub selections on disk',rows:game.imports},
    {id:'fallback',title:'Historical placeholders',rows:game.archive.filter(row=>row.kind==='Placeholder')},
  ];
  const chosen=sections.find(section=>section.id===group)!;
  return <section id="game-census" className="game-census" aria-label={`Local designs for ${game.name}`}>
    <div className="eyebrow">Design archive · 50 games</div>
    <div className="census-heading"><h3>{game.name} · local design census</h3>
      <label>Browse census<select className="input" value={slug} onChange={e=>onGameChange(e.target.value)}>{census.games.map(g=><option value={g.slug} key={g.slug}>{g.name}</option>)}</select></label></div>
    <p><strong>{game.shipped.length} usable web {game.shipped.length===1?'design':'designs'}</strong> · {game.shipped.join(', ')}</p>
    {game.native ? <figure className="census-native">
      <img src={game.native.image} width="156" height="192" alt={`Archived ${game.name} active-turn example`}/>
      <figcaption><strong>Native reference · active turn</strong><p>{game.native.states.length} saved states · {game.native.appearances.length} family appearances</p>
        {game.native.sameImageGames.length>1&&<p>This exact capture is shared by {game.native.sameImageGames.join(', ')}.</p>}
      </figcaption></figure> : <p className="census-gap">No game-specific native capture found. The archived drawing sources are listed below.</p>}
    <div className="census-controls" aria-label="Evidence groups">{sections.map(({id,title,rows})=><button type="button" key={id} aria-pressed={group===id} onClick={()=>setGroup(id)}>{title} · {rows.length}</button>)}</div>
    {chosen.rows.length ? <EvidenceList rows={chosen.rows}/> : <p>No entries in this group for {game.name}.</p>}
  </section>;
}
