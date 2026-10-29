import type { SkCanvas } from "@shopify/react-native-skia";
import type { GameRendererFamily } from "@eslams/core-types";
import type {
  AccessibleBoardNode,
  ActionTarget,
  BoardScene,
} from "@eslams/game-render-contract";
import type { AccentCarryingRole, BoardSurface, ThemeTokens } from "@eslams/theme-tokens";

export type Point = Readonly<{
  /** Normalized x-coordinate in the renderer content area, from 0 through 1. */
  x: number;
  /** Normalized y-coordinate in the renderer content area, from 0 through 1. */
  y: number;
}>;

export type PixelPoint = Readonly<{ x: number; y: number }>;
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;
export type QualityTier = "high" | "balanced" | "constrained";
export type MotionBeat = "idle" | "move" | "capture" | "reveal" | "result";

export type MotionState = Readonly<{
  /** Progress of the current motion beat, clamped to [0, 1]. */
  progress: number;
  beat: MotionBeat;
  reducedMotion: boolean;
  qualityTier: QualityTier;
  viewport: Readonly<{
    width: number;
    height: number;
    pixelRatio: number;
  }>;
  lastActionTargetId: string | null;
  activeNodeId: string | null;
}>;

export type DrawStyle = Readonly<{
  color: string;
  alpha?: number;
  mode?: "fill" | "stroke";
  strokeWidth?: number;
  accentRole?: AccentCarryingRole;
  glow?: boolean;
  trail?: boolean;
}>;

export type RenderCommand =
  | Readonly<{ kind: "rect"; id: string; rect: Rect; style: DrawStyle }>
  | Readonly<{ kind: "rounded-rect"; id: string; rect: Rect; radius: number; style: DrawStyle }>
  | Readonly<{ kind: "circle"; id: string; center: PixelPoint; radius: number; style: DrawStyle }>
  | Readonly<{ kind: "line"; id: string; from: PixelPoint; to: PixelPoint; style: DrawStyle }>
  | Readonly<{ kind: "arc"; id: string; rect: Rect; startDegrees: number; sweepDegrees: number; useCenter: boolean; style: DrawStyle }>
  | Readonly<{ kind: "polygon"; id: string; points: readonly PixelPoint[]; closed: boolean; style: DrawStyle }>
  | Readonly<{ kind: "text"; id: string; at: PixelPoint; text: string; size: number; style: DrawStyle }>;

export type HitZone = Readonly<{
  id: string;
  rect: Rect;
  actionTargetId: string;
}>;

export type MaterialLayer = Readonly<{
  surface: BoardSurface;
  rect: Rect;
  baseColor: string;
  accentColor: string;
  detail: number;
  phase: number;
}>;

export type RenderPlan = Readonly<{
  family: GameRendererFamily;
  gameSlug: string;
  viewport: Readonly<{ width: number; height: number }>;
  material: MaterialLayer;
  commands: readonly RenderCommand[];
  hitZones: readonly HitZone[];
  metadata: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type RenderPlanBuilder = (
  scene: BoardScene,
  theme: ThemeTokens,
  motion: MotionState,
) => RenderPlan;

export interface FamilyRenderer {
  readonly family: GameRendererFamily;
  render(
    canvas: SkCanvas,
    scene: BoardScene,
    theme: ThemeTokens,
    motion: MotionState,
  ): void;
  hitTest(point: Point, scene: BoardScene): ActionTarget | null;
  accessibility(scene: BoardScene): readonly AccessibleBoardNode[];
}

export interface PlanBackedFamilyRenderer extends FamilyRenderer {
  createPlan(scene: BoardScene, theme: ThemeTokens, motion: MotionState): RenderPlan;
}
