import { GitHubSweep } from './github-sweep';
import { DesignGallery } from './design-gallery';
import { GameCensus } from './game-census';
import { ConnectFourGallery, type DesignControls } from "./connect-four-gallery";
import { LegalDemonstration, supportsTablePresentation } from '../src/game/scene';
import { GAME_DEMONSTRATIONS, type Demonstration } from '../src/game/demos';
import { GAME_ANIMATIONS } from '../src/game/catalogue';
import { studiesFor } from './studies';
import coverage from '../docs/game-coverage.json';

const presentations = [
 ['card','Card','Compact preview'], ['arena','Arena','Board in a match'],
 ['arena-table','Arena table','Table centre; player seats supplied by the host'],
 ['feature','Feature','Large game preview'], ['event','Event','Event composition'],
] as const;
function Still({game,demo,presentation='feature',authored=false,design}:{game:string;demo:Demonstration;presentation?:string;authored?:boolean;design?:DesignControls['design']}) {
 const last=demo.frames.length-1;
 return <div className="st-game-animation c4-still" data-presentation={presentation} data-preview-active="false" role="img" aria-label={`${GAME_ANIMATIONS[game]!.name}, final preview position`}>
  <LegalDemonstration design={design} game={game} frame={demo.frames[last]!} previous={demo.frames[last-1]} externalSeats={presentation==='arena-table'} {...(authored?{variantNote:null}:{})}/>
 </div>;
}
export function GameVariants({game,onGameChange,onStudyChange,controls}:{controls?:DesignControls;game:string;onGameChange:(game:string)=>void;onStudyChange:(study:string)=>void}) {
 const info=GAME_ANIMATIONS[game]!, demo=GAME_DEMONSTRATIONS[game]!, studies=studiesFor(game), contract=coverage.games.find(g=>g.slug===game)!;
 function inspect(id:string){onStudyChange(id);document.getElementById('game-replay')?.scrollIntoView({block:'start',behavior:'instant'});}
 return <section id="game-variants" className="catalogue-variants" aria-label={`All variants for ${info.name}`}>
  <div className="catalogue-variants-heading"><div><div className="eyebrow">One game, every available view</div><h3>All variants for {info.name}</h3></div>
   <label className="catalogue-study-select">Game to inspect<select className="input" value={game} onChange={e=>onGameChange(e.target.value)}>{Object.entries(GAME_ANIMATIONS).map(([slug,g])=><option value={slug} key={slug}>{g.name}</option>)}</select></label>
  </div>
  <p className="catalogue-study-note">Synthetic spectator replay · {contract.actualStateSupport === 'frame-view' ? 'Live board frames supported' : contract.actualStateSupport === 'partial-frame-view' ? 'Partial live-frame support' : 'Demonstration renderer only'}{game === 'connect-four' ? ' · Local two-player round' : ''}</p>
  <a className="census-jump" href="#github-sweep">Explore {info.name} designs found on GitHub ↓</a>{" · "}
  <a className="census-jump" href="#game-census">See archived designs and sources for {info.name} ↓</a>
  {controls && (game==='connect-four' ? <ConnectFourGallery {...controls}/> : <DesignGallery key={game} game={game} {...controls}/>)}
  {!controls && <p className="catalogue-study-note">Compare the implemented rule and position studies below, then the presentation layouts. Imported GitHub sources are linked in the replay notes; they are not runnable variants here.</p>}
  <h4>Rule and position studies · {studies.length+1}</h4>
  <div className="catalogue-variant-grid">
   <article className="catalogue-variant-card" data-study-preview="bundled"><h4>Bundled variant</h4><Still design={controls?.design} game={game} demo={demo}/><p>{contract.variant}{contract.ruleVariantNote?` · ${contract.ruleVariantNote}`:''}</p><button onClick={()=>inspect('bundled')}>Inspect bundled replay</button></article>
   {studies.map(s=><article key={s.id} className="catalogue-variant-card" data-study-preview={s.id}><h4>{s.name}</h4><Still design={controls?.design} game={game} demo={s.demo} authored/><p>{s.note}</p><button onClick={()=>inspect(s.id)}>Inspect {s.name}</button></article>)}
  </div>
  {!studies.length&&<p className="catalogue-study-note">This game currently has one bundled variant. No additional authored position studies are implemented yet.</p>}
  <h4>Presentation layouts · same bundled position</h4>
  <div className="catalogue-variant-grid">{presentations.filter(([id])=>id!=='arena-table'||supportsTablePresentation(game)).map(([id,name,note])=><article key={id} className="catalogue-variant-card" data-presentation-preview={id}><h4>{name}</h4><Still design={controls?.design} game={game} demo={demo} presentation={id}/><p>{note}</p></article>)}</div>
  <GitHubSweep key={game+"-github"} game={game} onGameChange={onGameChange}/>
  <GameCensus key={game} slug={game} onGameChange={onGameChange}/>
 </section>;
}
