import { useState } from 'react';
import { usePublicDesignSources } from './lazy-data';

const categoryNames: Record<string,string> = {board:'Board',card:'Card',gametheory:'Strategy',rl:'Control & arcade'};
const kindNames: Record<string,string> = {renderer:'Renderer',assets:'Vector assets',interaction:'Interaction',physics:'Physics & rendering',rules:'Rules & information'};
const reuseNames: Record<string,string> = {permissive:'Permissive',copyleft:'Copyleft', 'public-domain':'Public domain'};
export function PublicGameSources({game}:{readonly game:string}) {
 const {data:collection}=usePublicDesignSources();
 const entry=collection?.games.find(g=>g.slug===game);
 if(!collection||!entry)return null;
 const sources=collection.sources.filter(s=>entry.sourceIds.includes(s.id));
 return <details className="catalogue-game-sources"><summary>Public GitHub designs · {sources.length} sources</summary>
  <p>{entry.coverageNote}</p>
  {entry.ruleVariantNote&&<p><strong>Bundled variant:</strong> {entry.ruleVariantNote}</p>}
  {sources.map(s=><p key={s.id}><a href={s.url}>{s.repository} ↗</a><br/><span className="mono">{s.license} · {kindNames[s.kind]}</span><br/>{s.idea}</p>)}
  <a href="#public-designs">Browse the complete source collection ↓</a>
 </details>;
}
export function PublicDesignLibrary() {
 const [query,setQuery]=useState(''),[category,setCategory]=useState('all'),[reuse,setReuse]=useState('all');
 const {data:collection,failed}=usePublicDesignSources();
 if(!collection) return <section id="public-designs" className="catalogue-section catalogue-public-designs" aria-label="Public GitHub design library" aria-busy={!failed}><div className="eyebrow">05 · Study the craft</div><h2>Public game design library</h2><p role="status">{failed?'The source collection could not be loaded.':'Loading the source collection…'}</p></section>;
 const shown=collection.sources.filter(s=>(reuse==='all'||s.reuse===reuse)&&(category==='all'||s.games.some(slug=>collection.games.find(g=>g.slug===slug)?.category===category))&&`${s.repository} ${s.idea} ${s.games.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
 const totals=collection.summary;
 return <section id="public-designs" className="catalogue-section catalogue-public-designs" aria-label="Public GitHub design library">
  <div className="eyebrow">05 · Study the craft</div><h2>Public game design library</h2>
  <p className="catalogue-lead">A researched collection of boards, tables, controls, artwork and physics references. Every source keeps its original license and a pinned commit.</p>
  <div className="catalogue-meta"><span>{totals.games} games mapped</span><span>{totals.repositories} source repositories</span><span>{totals.files} files archived</span><span>Reviewed {collection.reviewedOn}</span></div>
  <p><a className="census-jump" href="#github-sweep">Browse the November 4 GitHub sweep for all 50 games ↓</a></p>
  <p className="public-design-scope">{totals.queries} searches surfaced {totals.uniqueCandidates} distinct candidates; {totals.deepInspections} repositories received a closer source/license inspection. This is a curated collection, not every public GitHub design. Some games have shared assets or rules references rather than a dedicated screen. Archived code is not executed by this catalogue.</p>
  <div className="public-design-filters">
   <label>Find a design source<input className="input" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Shogi, cards, terrain…"/></label>
   <label>Design category<select className="input" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{Object.entries(categoryNames).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
   <label>License group<select className="input" value={reuse} onChange={e=>setReuse(e.target.value)}><option value="all">All licenses</option>{Object.entries(reuseNames).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
  </div>
  <p role="status" className="public-design-count">{shown.length} of {totals.repositories} repositories</p>
  <div className="public-design-grid">{shown.map(s=><article className="public-source-card" key={s.id} data-public-source={s.id}>
   <div className="public-source-tags"><span>{kindNames[s.kind]}</span><span>{reuseNames[s.reuse]}</span></div>
   <h3><a href={s.url}>{s.repository} ↗</a></h3><p>{s.idea}</p>
   <div className="public-source-games">{s.games.map(slug=><span key={slug}>{collection.games.find(g=>g.slug===slug)?.name}</span>)}</div>
   <details><summary>License and scope</summary><p>{s.limits}</p><ul>{s.licensePaths.map(p=><li key={p}><a href={`https://github.com/${s.repository}/blob/${s.commit}/${p}`}>{p}</a></li>)}</ul></details>
   <footer><span>{s.license} · {s.fileCount} files</span><code>{s.commit.slice(0,12)}</code></footer>
  </article>)}</div>
  {!shown.length&&<p className="public-design-empty">No sources match these filters. Try another game name or select all licenses.</p>}
 </section>;
}
