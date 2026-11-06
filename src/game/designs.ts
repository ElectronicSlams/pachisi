import families from './visual-editions.json';
import {CONNECT_FOUR_DESIGNS, type ConnectFourDesignId} from './connect-four-designs';
import type {GamePresentation} from './demo';

/** Every design id any game accepts (Connect Four has the widest set). Narrow per game with `DesignIdFor`. */
export type GameDesignId = ConnectFourDesignId;
type ThreeLooks = 'design-1' | 'design-2' | 'design-3';
/** The stones family (visual-editions.json) is the only non-Connect Four family with a fourth look. */
export type StoneDesignGame = 'go' | 'gomoku' | 'pentago';
/**
 * The design ids a literal game slug accepts. A wide `string` game keeps the full
 * `GameDesignId` union; the runtime check in `resolveGameDesign` covers that case.
 */
export type DesignIdFor<G extends string> = string extends G ? GameDesignId
  : G extends 'connect-four' ? ConnectFourDesignId
  : G extends StoneDesignGame ? ThreeLooks | 'design-4'
  : ThreeLooks;
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

const warnedDesigns = new Set<string>();
function developmentBuild() {
  // Bundlers replace process.env.NODE_ENV; a bare browser module has no `process`.
  try { return process.env.NODE_ENV !== 'production'; } catch { return true; }
}
/**
 * The design a component should render for `game`. An id the game does not offer
 * falls back explicitly to the game's default look (its first design), with one
 * development-time console warning per game and id. `undefined` stays the default.
 */
export function resolveGameDesign(game:string, design:string|undefined): GameDesignId|undefined {
  if (design === undefined) return undefined;
  const looks = gameDesigns(game);
  if (looks.some(look => look.id === design)) return design as GameDesignId;
  const fallback = looks[0]?.id;
  const key = `${game}:${design}`;
  if (developmentBuild() && !warnedDesigns.has(key)) {
    warnedDesigns.add(key);
    console.warn(`[pachisi] "${design}" is not a design for ${game}; rendering ${fallback ? `its default "${fallback}"` : 'the shared default'} instead.`);
  }
  return fallback;
}
