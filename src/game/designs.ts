import families from './visual-editions.json';
import {CONNECT_FOUR_DESIGNS, type ConnectFourDesignId} from './connect-four-designs';
import type {GamePresentation} from './demo';

export type GameDesignId = ConnectFourDesignId;
export type GameLook = {readonly id:GameDesignId; readonly name:string; readonly detail:string};
type Family = keyof typeof families;
const byGame = new Map<string, Family>();
for (const key of Object.keys(families) as Family[]) {
  for (const slug of families[key].games) byGame.set(slug,key);
}

export function designFamily(game:string) { return byGame.get(game); }
export function gameDesigns(game:string):readonly GameLook[] {
  if (game==='connect-four') return CONNECT_FOUR_DESIGNS;
  const family=designFamily(game);
  return family ? families[family].looks as readonly GameLook[] : [];
}
// These games accept authoritative public cell frames through the Board adapter.
const liveCellGames = new Set(["tic-tac-toe","connect-four","chess","checkers","othello","go","gomoku","hex"]);
export function gameDesignInputs(game:string) {
  if (game !== "connect-four" && !byGame.has(game)) return [];
  const modes = ["spectator-replay","synthetic-preview"];
  if (liveCellGames.has(game)) modes.push("live-cell-frame");
  if (game === "connect-four") modes.push("catalogue-local-play");
  return modes;
}
export function hasTableCentre(game:string) {
  return designFamily(game)==='felt' && !['blackjack','goofspiel','liars-dice'].includes(game);
}
export function gamePresentations(game:string): readonly GamePresentation[] {
  if(game!=='connect-four' && !byGame.has(game)) return [];
  return hasTableCentre(game) ? ['card','arena','arena-table','feature','event'] : ['card','arena','feature','event'];
}
export function resolveGameVariant(game:string, id:string, layout:string) {
  const design=gameDesigns(game).find(item=>item.id===id);
  if(!design) return {ok:false, reason:'unknown-design'} as const;
  const presentation=gamePresentations(game).find(item=>item===layout);
  if(!presentation) return {ok:false,reason:'unsupported-presentation'} as const;
  return {ok:true,design,presentation,inputs:gameDesignInputs(game),id:`${game}-${id}-variant-${presentation}`} as const;
}
