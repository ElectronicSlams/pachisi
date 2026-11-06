import type { DesignControls } from "./connect-four-gallery";
import { GameVariants } from "./game-variants";
import { PublicGameSources } from "./public-designs";
import { useState } from 'react';
import { GameReplay } from '../src/game/demo';
import { GAME_ANIMATIONS } from '../src/game/catalogue';
import { useGameCoverage } from './lazy-data';
import { GAME_NOTES, DESIGN_REFERENCES } from './game-notes';
import { studiesFor, GAME_STUDIES } from './studies';

type LabProps = {game:string; onGameChange:(game:string)=>void; controls?:DesignControls};
export function GameLab(props:LabProps) { return <Lab key={props.game} {...props}/>; }
function Lab({game,onGameChange,controls}:LabProps) {
 const [studyId,setStudyId]=useState('bundled');
 const info=GAME_ANIMATIONS[game]!, contract=useGameCoverage().data?.games.find(g=>g.slug===game);
 const studies=studiesFor(game), study=studies.find(s=>s.id===studyId);
 const notes=GAME_NOTES[game]!;
 return <section className="catalogue-lab" aria-label={`${info.name} design lab`}>
  <div className="catalogue-lab-head"><div><div className="eyebrow">Inspect the game</div><h3>{info.name} · replay lab</h3><p>50 games · {GAME_STUDIES.length} additional studies · four design categories</p></div><span className="catalogue-lab-kind" data-study={study ? true : undefined}>{study ? 'Authored study' : 'Bundled Core trace'}</span></div>
  <GameVariants controls={controls} game={game} onGameChange={onGameChange} onStudyChange={setStudyId}/>
  <div id="game-replay" className="catalogue-lab-layout"><div className="catalogue-lab-player">

   <label className="catalogue-study-select">Position or variant study<select className="input" value={studyId} onChange={e=>setStudyId(e.target.value)}><option value="bundled">{contract ? `Bundled trace · ${contract.variant}` : 'Bundled trace'}</option>{studies.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <p className="catalogue-study-note">{study?.note ?? (contract ? `Synthetic public trace · arena ${contract.artworkArenaVersion} · ${contract.demoFrames} frames. Use the controls to inspect actions and outcomes.` : 'Synthetic public trace. Use the controls to inspect actions and outcomes.')}</p>
   <GameReplay design={controls?.design} key={studyId} game={game} gameName={info.name} {...(study ? {demonstration:study.demo,variantNote:null} : {})}/>
  </div><aside className="catalogue-lab-notes">
   <h4>What to inspect</h4><p>{notes[0]}</p>
   <h4>Variant boundaries</h4><p>{notes[1]}</p>
   {contract && <><dl><dt>Declared variant</dt><dd>{contract.variant}</dd><dt>Geometry</dt><dd>{contract.geometry}</dd><dt>Live adaptation</dt><dd>{contract.actualStateSupport.replaceAll('-',' ')}</dd></dl>
   <details><summary>State and information contract</summary><p>{contract.adaptationNotes}</p><p>{contract.hiddenInformationNotes}</p><p>{contract.motionNotes}</p></details></>}
   <PublicGameSources game={game}/>
   <details><summary>Design references</summary>{DESIGN_REFERENCES.filter(r=>r.category===info.category).map(r=><p key={r.url}><a href={r.url}>{r.label} ↗</a><br/>{r.idea}</p>)}</details>
  </aside></div>
 </section>;
}
