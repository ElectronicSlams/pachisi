import bundled from "./game-demonstrations.json";

export type DemonstrationFrame = {
  readonly state: Readonly<Record<string, unknown>>;
  readonly caption: string;
  readonly turn: number;
  readonly terminal: boolean;
  readonly outcomeReason?: string | null;
};
export type Demonstration = {
  readonly version: string;
  readonly delay: number;
  readonly frames: readonly DemonstrationFrame[];
  readonly actions: readonly { readonly player: string; readonly action: unknown }[];
};
export const GAME_DEMONSTRATIONS: Readonly<Record<string, Demonstration>> = bundled.games;

export function demonstrationFor(slug: string): Demonstration | null {
  return Object.hasOwn(GAME_DEMONSTRATIONS, slug) ? GAME_DEMONSTRATIONS[slug]! : null;
}
