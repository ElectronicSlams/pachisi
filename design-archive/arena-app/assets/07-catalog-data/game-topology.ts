export type GameTopologyMode = "solo_score" | "head_to_head" | "multi_seat";

export type GameScoreType =
  | "reward"
  | "completion"
  | "points"
  | "survival"
  | "custom"
  | "win_loss_draw"
  | "placement"
  | "chips";

export type GameTopology = {
  readonly schemaVersion: "eslams.game.topology.v1";
  readonly mode: GameTopologyMode;
  readonly evaluatedPlayer?: "player_1";
  readonly controlledPlayers: readonly string[];
  readonly environmentPlayers: readonly string[];
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly defaultPlayers: number;
  readonly winnerRequired: boolean;
  readonly drawAllowed: boolean;
  readonly placementsAllowed: boolean;
  readonly scoreType: GameScoreType;
};

export function playableSeatIds(topology: Pick<GameTopology, "controlledPlayers">): readonly string[] {
  return topology.controlledPlayers;
}
