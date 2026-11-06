import type { GameScoreType, GameTopologyMode } from "./game-topology";
import type { RunUsageSummary } from "./usage";

export type GameResultType = "score" | "winner" | "draw" | "placement" | "points" | "chips";

export type GameResultContract = {
  readonly schemaVersion: "eslams.game.result.v1";
  readonly mode: GameTopologyMode;
  readonly resultTypes: readonly GameResultType[];
  readonly scoreType: GameScoreType;
  readonly winnerRequired: boolean;
  readonly drawAllowed: boolean;
  readonly placementsAllowed: boolean;
  readonly evaluatedPlayer?: "player_1";
};

export type PlatformResultSummary = {
  readonly schemaVersion: "eslams.platform.result.v1";
  readonly mode: GameTopologyMode;
  readonly resultType: GameResultType;
  readonly winnerSeatId: string | null;
  readonly draw: boolean;
  readonly primaryScore?: number | null;
  readonly scores: Record<string, number>;
  readonly placements?: readonly string[];
  readonly reason?: string | null;
  readonly usage?: RunUsageSummary | null;
};
