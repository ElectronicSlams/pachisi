export type GameAnimationSpec = {
  readonly schemaVersion: "eslams.game.animation.v1";
  readonly family: string;
  readonly defaultMoveMs: number;
  readonly defaultRevealMs: number;
  readonly defaultResultMs: number;
  readonly reducedMotionBehavior: "static_final_state" | "fade_only";
  readonly events: Record<string, Record<string, unknown>>;
};
