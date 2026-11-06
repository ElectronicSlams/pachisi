import { useState } from 'react';
import data from './github-visual-sweep.json';

export function GitHubSweep({game,onGameChange}:{game:string;onGameChange:(slug:string)=>void}) {
  const entry=data.games.find(item=>item.slug===game)!;
  const [mode,setMode]=useState('all');
  const rows=entry.findings.filter(item=>mode==='all'||(mode==='local'?item.localPath:item.previewUrl));
  return <section id="github-sweep" className="game-census" aria-label={`GitHub design sweep for ${entry.name}`}>
    <div className="eyebrow">Public GitHub research · {data.completedOn}</div>
    <div className="census-heading"><h3>{entry.name} · designs found on GitHub</h3>
      <label>Browse GitHub sweep<select className="input" aria-label="Game in GitHub sweep" value={game} onChange={e=>{
        onGameChange(e.target.value);
        requestAnimationFrame(()=>document.getElementById('github-sweep')?.scrollIntoView({block:'start'}));
      }}>{data.games.map(g=><option value={g.slug} key={g.slug}>{g.name}</option>)}</select></label></div>
    <p>{entry.candidates.toLocaleString('en-US')} repository matches · {entry.sampled} with inspected commit trees · {entry.findings.length} selected design references</p>
    <p className="catalogue-study-note">Open a pinned source or a reviewed upstream image to study its design. Local snapshots are partial source selections. Usable Pachisi designs are in the comparison above.</p>
    <div className="census-controls" aria-label="GitHub finding filters">{[['all','All findings'],['image','Reviewed images'],['local','Archived source']].map(([value,title])=>
      <button key={value} type="button" aria-pressed={mode===value} onClick={()=>setMode(value)}>{title}</button>)}</div>
    {rows.length>0?<ul className="census-list">{rows.map(item=><li key={item.repository} data-sweep-finding={item.repository}>
      <strong>{item.repository}</strong> <small>{item.relationship}</small>
      <p>{item.idea}</p>{item.visualNote&&<p>{item.visualNote}</p>}
      <p><a href={item.sourceUrl}>Inspect source ↗</a>{item.previewUrl&&<> · <a href={item.previewUrl}>View upstream image ↗</a></>}</p>
      <details><summary>{item.localPath?'Archived source':'Link only'} · {item.license}</summary><code>{item.localPath??item.file}</code>{item.linkReason&&<p>{item.linkReason}</p>}<code>{item.commit}</code></details>
    </li>)}</ul>:<p>No selected finding for this game matches that filter.</p>}
  </section>;
}
