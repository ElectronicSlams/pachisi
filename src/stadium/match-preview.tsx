"use client";

import { GameAnimation } from "../stadium/game-animation";

export function MatchPreview({ game, gameName }: { readonly game: string; readonly gameName: string }) {
  return <div className="st-match-preview"><GameAnimation game={game} gameName={gameName} size="mini" group="match-posters" /></div>;
}
