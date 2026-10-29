import { buildAuctionPanelPlan, hitTestAuctionPanel } from "./families/auction-panel";
import { buildCardTablePlan, hitTestCardTable } from "./families/card-table";
import { buildConnectFourPlan, hitTestConnectFour } from "./families/connect-four";
import { buildControlBenchmarkPlan, hitTestControlBenchmark } from "./families/control-benchmark";
import { buildCustomPlan, hitTestCustom } from "./families/custom";
import { buildDiceTablePlan, hitTestDiceTable } from "./families/dice-table";
import { buildEconomicPanelPlan, hitTestEconomicPanel } from "./families/economic-panel";
import { buildGoBoardPlan, hitTestGoBoard } from "./families/go-board";
import { buildGrid3x3Plan, hitTestGrid3x3 } from "./families/grid-3x3";
import { buildHexBoardPlan, hitTestHexBoard } from "./families/hex-board";
import { buildPayoffMatrixPlan, hitTestPayoffMatrix } from "./families/payoff-matrix";
import { buildSquareBoardPlan, hitTestSquareBoard } from "./families/square-board";
import type { FamilyRendererDefinitionRegistry } from "./registry-core";

export const FAMILY_RENDERER_DEFINITIONS = Object.freeze({
  grid_3x3: Object.freeze({ family: "grid_3x3", buildPlan: buildGrid3x3Plan, hitTest: hitTestGrid3x3 }),
  connect_four: Object.freeze({ family: "connect_four", buildPlan: buildConnectFourPlan, hitTest: hitTestConnectFour }),
  square_board: Object.freeze({ family: "square_board", buildPlan: buildSquareBoardPlan, hitTest: hitTestSquareBoard }),
  go_board: Object.freeze({ family: "go_board", buildPlan: buildGoBoardPlan, hitTest: hitTestGoBoard }),
  hex_board: Object.freeze({ family: "hex_board", buildPlan: buildHexBoardPlan, hitTest: hitTestHexBoard }),
  card_table: Object.freeze({ family: "card_table", buildPlan: buildCardTablePlan, hitTest: hitTestCardTable }),
  dice_table: Object.freeze({ family: "dice_table", buildPlan: buildDiceTablePlan, hitTest: hitTestDiceTable }),
  auction_panel: Object.freeze({ family: "auction_panel", buildPlan: buildAuctionPanelPlan, hitTest: hitTestAuctionPanel }),
  payoff_matrix: Object.freeze({ family: "payoff_matrix", buildPlan: buildPayoffMatrixPlan, hitTest: hitTestPayoffMatrix }),
  control_benchmark: Object.freeze({ family: "control_benchmark", buildPlan: buildControlBenchmarkPlan, hitTest: hitTestControlBenchmark }),
  economic_panel: Object.freeze({ family: "economic_panel", buildPlan: buildEconomicPanelPlan, hitTest: hitTestEconomicPanel }),
  custom: Object.freeze({ family: "custom", buildPlan: buildCustomPlan, hitTest: hitTestCustom }),
} as const satisfies FamilyRendererDefinitionRegistry);
