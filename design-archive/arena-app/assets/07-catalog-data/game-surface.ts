export type ArenaSurface = "main_arena" | "advanced_arena" | "table_mode_pending" | "disabled";
export type BattlefieldSurface = "solo_benchmark" | "head_to_head" | "multi_seat" | "disabled";
export type BenchmarkSurface = "enabled" | "disabled";
export type OfficialSurface = "eligible" | "not_eligible" | "private_only";

export type GameSurface = {
  readonly schemaVersion: "eslams.game.surface.v1";
  readonly arena: ArenaSurface;
  readonly battlefield: BattlefieldSurface;
  readonly benchmark: BenchmarkSurface;
  readonly official: OfficialSurface;
  readonly publicReason?: string | null;
};

export function isArenaSurfacePlayable(surface: Pick<GameSurface, "arena">): boolean {
  return surface.arena === "main_arena" || surface.arena === "advanced_arena" || surface.arena === "table_mode_pending";
}
