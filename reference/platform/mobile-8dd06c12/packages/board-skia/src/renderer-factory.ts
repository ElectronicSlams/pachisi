import type { GameRendererFamily } from "@eslams/core-types";
import type { BoardScene } from "@eslams/game-render-contract";
import { validateRenderPlan } from "./plan";
import type {
  PlanBackedFamilyRenderer,
  Point,
  RenderPlan,
  RenderPlanBuilder,
} from "./types";

export type HitTestStrategy = PlanBackedFamilyRenderer["hitTest"];
export type RenderPlanExecutor = (
  canvas: Parameters<PlanBackedFamilyRenderer["render"]>[0],
  plan: RenderPlan,
) => void;

// Worklets are dependency-first because workletized functions are intentionally not hoisted.
function assertSceneFamily(scene: BoardScene, family: GameRendererFamily): void {
  "worklet";
  if (scene.rendererFamily !== family) {
    throw new TypeError(`Renderer ${family} cannot consume a ${scene.rendererFamily} scene.`);
  }
}

export function createPlanBackedRenderer(
  family: GameRendererFamily,
  buildPlan: RenderPlanBuilder,
  hitTestStrategy: HitTestStrategy,
  executePlan: RenderPlanExecutor,
): PlanBackedFamilyRenderer {
  const renderer: PlanBackedFamilyRenderer = {
    family,
    createPlan(scene, theme, motion) {
      "worklet";
      assertSceneFamily(scene, family);
      const plan = buildPlan(scene, theme, motion);
      validateRenderPlan(plan, scene, motion);
      return plan;
    },
    render(canvas, scene, theme, motion) {
      "worklet";
      assertSceneFamily(scene, family);
      const plan = buildPlan(scene, theme, motion);
      validateRenderPlan(plan, scene, motion);
      executePlan(canvas, plan);
    },
    hitTest(point: Point, scene: BoardScene) {
      "worklet";
      assertSceneFamily(scene, family);
      return hitTestStrategy(point, scene);
    },
    accessibility(scene: BoardScene) {
      "worklet";
      assertSceneFamily(scene, family);
      return scene.accessibility;
    },
  };
  return Object.freeze(renderer);
}
