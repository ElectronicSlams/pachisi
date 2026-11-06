import {
  assertPublicReplaySafe,
  DISPLAY_FRAME_VERSION,
  MOBILE_MINIMUM_APP_VERSION,
  PUBLIC_STATE_VERSION,
  RENDER_ADAPTER_VERSION,
  RENDERER_CONTRACT_VERSION,
  SCENE_SCHEMA_VERSION,
  THEME_TOKEN_REFERENCE_VERSION,
  type GameRendererFamily,
} from "@eslams/core-types";

export {
  DISPLAY_FRAME_VERSION,
  PUBLIC_STATE_VERSION,
  RENDER_ADAPTER_VERSION,
  SCENE_SCHEMA_VERSION,
  THEME_TOKEN_REFERENCE_VERSION,
};
export const RENDERER_VERSION = RENDERER_CONTRACT_VERSION;

export type PublicStateEnvelope = {
  readonly publicStateVersion: typeof PUBLIC_STATE_VERSION;
  readonly gameSlug: string;
  readonly state: Readonly<Record<string, unknown>>;
};

export type DisplayCell = {
  readonly id: string;
  readonly kind: "board" | "grid" | "cells" | "card" | "status";
  readonly row: number | null;
  readonly col: number | null;
  readonly index: number | null;
  readonly key: string | null;
  readonly label: string;
};

export type DisplayFrameV1 = {
  readonly displayFrameVersion: typeof DISPLAY_FRAME_VERSION;
  readonly publicStateVersion: typeof PUBLIC_STATE_VERSION;
  readonly rendererVersion: typeof RENDERER_VERSION;
  readonly adapterVersion: typeof RENDER_ADAPTER_VERSION;
  readonly frameId: string;
  readonly sourceReplayEventId: string | null;
  readonly gameSlug: string;
  readonly rendererFamily: GameRendererFamily;
  readonly actorPlayer: string | null;
  readonly actionLabel: string | null;
  readonly cells: readonly DisplayCell[];
  readonly summary: {
    readonly activePlayer: string | null;
    readonly terminal: boolean;
    readonly turn: number | null;
    readonly scores: Readonly<Record<string, number>>;
  };
};

export type ActionTarget = {
  readonly id: string;
  readonly action: string;
  readonly label: string;
  readonly disabled: boolean;
};

export type AccessibleBoardNode = {
  readonly id: string;
  readonly role: "gridcell" | "button" | "img" | "text";
  readonly label: string;
  readonly row: number | null;
  readonly col: number | null;
  readonly actionTargetId: string | null;
};

export type BoardSceneNode = {
  readonly id: string;
  readonly kind: DisplayCell["kind"];
  readonly label: string;
  readonly row: number | null;
  readonly col: number | null;
  readonly index: number | null;
  readonly actionTargetId: string | null;
};

export type BoardScene = {
  readonly schemaVersion: typeof SCENE_SCHEMA_VERSION;
  readonly gameSlug: string;
  readonly rendererFamily: GameRendererFamily;
  readonly rows: number;
  readonly cols: number;
  readonly nodes: readonly BoardSceneNode[];
  readonly actionTargets: readonly ActionTarget[];
  readonly accessibility: readonly AccessibleBoardNode[];
  readonly summary: DisplayFrameV1["summary"];
};

export type SceneEnvelope = {
  readonly sceneSchemaVersion: typeof SCENE_SCHEMA_VERSION;
  readonly publicStateVersion: typeof PUBLIC_STATE_VERSION;
  readonly displayFrameVersion: typeof DISPLAY_FRAME_VERSION;
  readonly gameSlug: string;
  readonly rendererFamily: GameRendererFamily;
  readonly rendererVersion: typeof RENDERER_VERSION;
  readonly minimumAppVersion: typeof MOBILE_MINIMUM_APP_VERSION;
  readonly adapterVersion: typeof RENDER_ADAPTER_VERSION;
  readonly themeTokenVersion: typeof THEME_TOKEN_REFERENCE_VERSION;
  readonly scene: BoardScene;
};

export type PublicFrameAdapterContext = {
  readonly gameSlug?: string;
  readonly rendererFamily?: GameRendererFamily;
};

export type SceneBuilder = (frame: DisplayFrameV1, actions?: readonly ActionTarget[]) => BoardScene;

const rendererFamilies: readonly GameRendererFamily[] = [
  "grid_3x3",
  "connect_four",
  "square_board",
  "go_board",
  "hex_board",
  "card_table",
  "dice_table",
  "auction_panel",
  "payoff_matrix",
  "control_benchmark",
  "economic_panel",
  "custom",
];

export const SCENE_BUILDER_REGISTRY: Readonly<Record<GameRendererFamily, SceneBuilder>> = Object.freeze(
  Object.fromEntries(rendererFamilies.map((family) => [family, buildAccessibleScene])) as Record<GameRendererFamily, SceneBuilder>,
);

export function parseDisplayFrame(
  value: unknown,
  context: PublicFrameAdapterContext = {},
): DisplayFrameV1 | null {
  try {
    assertFrameSafe(value);
  } catch {
    return null;
  }
  const record = isRecord(value) ? value : null;
  if (!record) return null;
  const nested = isRecord(record.display_frame) ? record.display_frame
    : isRecord(record.displayFrame) ? record.displayFrame
      : record;
  const version = nested.displayFrameVersion ?? nested.schema_version ?? nested.schemaVersion;
  if (version !== DISPLAY_FRAME_VERSION) return null;
  const rawCells = Array.isArray(nested.cells) ? nested.cells : Array.isArray(nested.display_cells) ? nested.display_cells : null;
  if (!rawCells) return null;
  const cells = rawCells.map((cell, index) => parseDisplayCell(cell, index));
  if (cells.some((cell) => cell === null)) return null;
  const rendererFamily = parseRendererFamily(context.rendererFamily)
    ?? parseRendererFamily(nested.rendererFamily ?? nested.renderer_family);
  if (!rendererFamily) return null;
  const summary = parseSummary(nested.summary);
  if (!summary) return null;
  const gameSlug = nonEmptyString(nested.gameSlug) ?? context.gameSlug ?? "unknown";
  const frameId = nonEmptyString(nested.frameId) ?? nonEmptyString(nested.frame_id) ?? `${gameSlug}:frame`;
  const actor = nested.actorPlayer ?? nested.actor_player;
  const action = nested.actionLabel ?? nested.action_label;
  return {
    displayFrameVersion: DISPLAY_FRAME_VERSION,
    publicStateVersion: PUBLIC_STATE_VERSION,
    rendererVersion: RENDERER_VERSION,
    adapterVersion: RENDER_ADAPTER_VERSION,
    frameId,
    sourceReplayEventId: nonEmptyString(nested.sourceReplayEventId) ?? nonEmptyString(nested.source_replay_event_id) ?? null,
    gameSlug,
    rendererFamily,
    actorPlayer: actor === undefined || actor === null ? null : nonEmptyString(actor) ?? null,
    actionLabel: action === undefined || action === null ? null : publicCellLabel(action),
    cells: cells as readonly DisplayCell[],
    summary,
  };
}

export function adaptPublicStateToDisplayFrame(
  value: unknown,
  context: Required<PublicFrameAdapterContext>,
): DisplayFrameV1 | null {
  try {
    assertFrameSafe(value);
  } catch {
    return null;
  }
  const envelope = isRecord(value) && value.publicStateVersion === PUBLIC_STATE_VERSION && isRecord(value.state)
    ? value.state
    : isRecord(value) ? value : null;
  if (!envelope) return null;
  const board = Array.isArray(envelope.board) ? envelope.board : null;
  if (!board) return null;
  const rows = positiveInteger(envelope.rows) ?? inferRows(board.length);
  const cols = positiveInteger(envelope.cols) ?? (rows > 0 ? Math.ceil(board.length / rows) : 0);
  if (rows <= 0 || cols <= 0 || rows * cols < board.length) return null;
  const cells: DisplayCell[] = [];
  for (let index = 0; index < board.length; index += 1) {
    const label = publicCellLabel(board[index]);
    if (label === null) return null;
    cells.push({
      id: `cell-${index}`,
      kind: "board",
      row: Math.floor(index / cols),
      col: index % cols,
      index,
      key: null,
      label,
    });
  }
  return {
    displayFrameVersion: DISPLAY_FRAME_VERSION,
    publicStateVersion: PUBLIC_STATE_VERSION,
    rendererVersion: RENDERER_VERSION,
    adapterVersion: RENDER_ADAPTER_VERSION,
    frameId: `${context.gameSlug}:public-state`,
    sourceReplayEventId: null,
    gameSlug: context.gameSlug,
    rendererFamily: context.rendererFamily,
    actorPlayer: null,
    actionLabel: null,
    cells,
    summary: { activePlayer: null, terminal: false, turn: null, scores: {} },
  };
}

export function buildSceneEnvelope(
  value: unknown,
  context: Required<PublicFrameAdapterContext>,
  actions: readonly ActionTarget[] = [],
): SceneEnvelope {
  const frame = parseDisplayFrame(value, context) ?? adaptPublicStateToDisplayFrame(value, context);
  if (!frame) throw new TypeError("Public frame does not satisfy the supported v1 display-frame or public-state contracts.");
  const safeActions = actions.map(parseActionTarget);
  if (safeActions.some((action) => action === null)) throw new TypeError("Scene action target is invalid.");
  const scene = SCENE_BUILDER_REGISTRY[frame.rendererFamily](frame, safeActions as readonly ActionTarget[]);
  assertBoardSceneSafe(scene);
  return {
    sceneSchemaVersion: SCENE_SCHEMA_VERSION,
    publicStateVersion: PUBLIC_STATE_VERSION,
    displayFrameVersion: DISPLAY_FRAME_VERSION,
    gameSlug: frame.gameSlug,
    rendererFamily: frame.rendererFamily,
    rendererVersion: RENDERER_VERSION,
    minimumAppVersion: MOBILE_MINIMUM_APP_VERSION,
    adapterVersion: RENDER_ADAPTER_VERSION,
    themeTokenVersion: THEME_TOKEN_REFERENCE_VERSION,
    scene,
  };
}

export function displayFrameAsLegacyRecord(frame: DisplayFrameV1): Readonly<Record<string, unknown>> {
  return {
    schema_version: DISPLAY_FRAME_VERSION,
    frame_id: frame.frameId,
    source_replay_event_id: frame.sourceReplayEventId,
    renderer_family: frame.rendererFamily,
    actor_player: frame.actorPlayer,
    action_label: frame.actionLabel,
    display_cells: frame.cells.map((cell) => ({
      kind: cell.kind,
      ...(cell.row !== null ? { row: cell.row } : {}),
      ...(cell.col !== null ? { col: cell.col } : {}),
      ...(cell.index !== null ? { index: cell.index } : {}),
      ...(cell.key !== null ? { key: cell.key } : {}),
      value: cell.label,
    })),
    summary: {
      active_player: frame.summary.activePlayer,
      terminal: frame.summary.terminal,
      turn: frame.summary.turn,
      scores: frame.summary.scores,
    },
  };
}

export function assertBoardSceneSafe(scene: BoardScene): void {
  assertPublicReplaySafe(scene);
  if (scene.schemaVersion !== SCENE_SCHEMA_VERSION || !isRendererFamily(scene.rendererFamily)) {
    throw new TypeError("Board scene contract version or renderer family is invalid.");
  }
  if (!Number.isSafeInteger(scene.rows) || scene.rows < 0 || !Number.isSafeInteger(scene.cols) || scene.cols < 0) {
    throw new TypeError("Board scene dimensions are invalid.");
  }
  const ids = new Set<string>();
  for (const node of scene.nodes) {
    if (!node.id || ids.has(node.id) || !node.label) throw new TypeError("Board scene nodes require unique ids and labels.");
    ids.add(node.id);
  }
  const actionTargetIds = new Set<string>();
  for (const target of scene.actionTargets) {
    if (!target.id || actionTargetIds.has(target.id)) {
      throw new TypeError("Board scene action targets require unique ids.");
    }
    actionTargetIds.add(target.id);
  }
  const accessibleById = new Map<string, AccessibleBoardNode>();
  for (const accessible of scene.accessibility) {
    if (!accessible.id || accessibleById.has(accessible.id)) {
      throw new TypeError("Board scene accessibility nodes require unique ids.");
    }
    accessibleById.set(accessible.id, accessible);
  }
  if (accessibleById.size !== ids.size || scene.nodes.some((node) => !accessibleById.has(node.id))) {
    throw new TypeError("Board scene nodes and accessibility nodes must have an exact one-to-one mapping.");
  }
  const actionReferenceCounts = new Map<string, number>();
  for (const node of scene.nodes) {
    const accessible = accessibleById.get(node.id)!;
    if (accessible.actionTargetId !== node.actionTargetId) {
      throw new TypeError("Board scene accessibility action references must match their scene node.");
    }
    if (node.actionTargetId === null) continue;
    if (!actionTargetIds.has(node.actionTargetId)) {
      throw new TypeError("Board scene node references an undeclared action target.");
    }
    actionReferenceCounts.set(node.actionTargetId, (actionReferenceCounts.get(node.actionTargetId) ?? 0) + 1);
  }
  for (const targetId of actionTargetIds) {
    if (actionReferenceCounts.get(targetId) !== 1) {
      throw new TypeError("Every board scene action target must map to exactly one scene node.");
    }
  }
}

function buildAccessibleScene(frame: DisplayFrameV1, actions: readonly ActionTarget[] = []): BoardScene {
  const actionByCell = new Map(actions.map((action) => [action.id, action]));
  const nodes = frame.cells.map((cell) => {
    const actionTargetId = actionByCell.has(cell.id) ? cell.id : null;
    return {
      id: cell.id,
      kind: cell.kind,
      label: accessibleCellLabel(cell),
      row: cell.row,
      col: cell.col,
      index: cell.index,
      actionTargetId,
    };
  });
  const maxRow = Math.max(-1, ...frame.cells.flatMap((cell) => cell.row === null ? [] : [cell.row]));
  const maxCol = Math.max(-1, ...frame.cells.flatMap((cell) => cell.col === null ? [] : [cell.col]));
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug: frame.gameSlug,
    rendererFamily: frame.rendererFamily,
    rows: maxRow + 1,
    cols: maxCol + 1,
    nodes,
    actionTargets: actions,
    accessibility: nodes.map((node) => ({
      id: node.id,
      role: node.actionTargetId ? "button" : node.row !== null && node.col !== null ? "gridcell" : "text",
      label: node.label,
      row: node.row,
      col: node.col,
      actionTargetId: node.actionTargetId,
    })),
    summary: frame.summary,
  };
}

function parseDisplayCell(value: unknown, ordinal: number): DisplayCell | null {
  if (!isRecord(value)) return null;
  const kind = value.kind === undefined ? "board" : parseCellKind(value.kind);
  if (!kind) return null;
  const row = nullableNonNegativeInteger(value.row);
  const col = nullableNonNegativeInteger(value.col);
  const index = nullableNonNegativeInteger(value.index);
  if (row === undefined || col === undefined || index === undefined) return null;
  const key = value.key === undefined || value.key === null ? null : nonEmptyString(value.key);
  if (key === undefined) return null;
  const label = typeof value.label === "string" ? value.label : publicCellLabel(value.value);
  if (label === null) return null;
  return {
    id: nonEmptyString(value.id) ?? key ?? `cell-${ordinal}`,
    kind,
    row,
    col,
    index,
    key,
    label,
  };
}

function parseSummary(value: unknown): DisplayFrameV1["summary"] | null {
  if (value === undefined || value === null) return { activePlayer: null, terminal: false, turn: null, scores: {} };
  if (!isRecord(value)) return null;
  const active = value.activePlayer ?? value.active_player;
  const activePlayer = active === undefined || active === null ? null : nonEmptyString(active);
  if (activePlayer === undefined) return null;
  const terminal = value.terminal ?? false;
  if (typeof terminal !== "boolean") return null;
  const turn = value.turn === undefined || value.turn === null ? null : nonNegativeInteger(value.turn);
  if (turn === undefined) return null;
  const scoreRecord = value.scores === undefined ? {} : isRecord(value.scores) ? value.scores : null;
  if (!scoreRecord) return null;
  const scores: Record<string, number> = {};
  for (const [seat, score] of Object.entries(scoreRecord)) {
    if (!seat || typeof score !== "number" || !Number.isFinite(score)) return null;
    scores[seat] = score;
  }
  return { activePlayer, terminal, turn, scores };
}

function parseActionTarget(value: ActionTarget): ActionTarget | null {
  return nonEmptyString(value.id) && nonEmptyString(value.action) && nonEmptyString(value.label) && typeof value.disabled === "boolean"
    ? { id: value.id, action: value.action, label: value.label, disabled: value.disabled }
    : null;
}

function assertFrameSafe(value: unknown): void {
  assertPublicReplaySafe(value);
  assertNoNonRenderableFields(value);
}

function assertNoNonRenderableFields(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoNonRenderableFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (/reason(?:ing)?|explanation|provider|billing|usage|cost|token|prompt|response|private|hidden|secret/iu.test(key)) {
      throw new TypeError(`Non-renderable field at ${path}.${key}`);
    }
    assertNoNonRenderableFields(entry, `${path}.${key}`);
  }
}

function publicCellLabel(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (!isRecord(value)) return null;
  const allowedKeys = ["label", "piece", "rank", "suit", "count", "status", "value"] as const;
  const parts = allowedKeys.flatMap((key) => {
    const entry = value[key];
    return typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" ? [String(entry)] : [];
  });
  return parts.length > 0 ? parts.join(" ") : null;
}

function accessibleCellLabel(cell: DisplayCell): string {
  const coordinate = cell.row !== null && cell.col !== null ? `Row ${cell.row + 1}, column ${cell.col + 1}: ` : "";
  return `${coordinate}${cell.label || "Empty"}`;
}

function parseRendererFamily(value: unknown): GameRendererFamily | null {
  if (isRendererFamily(value)) return value;
  if (typeof value !== "string") return null;
  const aliases: Readonly<Record<string, GameRendererFamily>> = {
    grid: "square_board",
    chessboard: "square_board",
    "tic-tac-toe": "grid_3x3",
    "connect-four": "connect_four",
    "stone-grid": "go_board",
    "hex-grid": "hex_board",
    "card-table": "card_table",
    "dice-table": "dice_table",
    "matrix-game": "payoff_matrix",
    "strategy-matrix": "payoff_matrix",
  };
  return aliases[value] ?? null;
}

function isRendererFamily(value: unknown): value is GameRendererFamily {
  return typeof value === "string" && (rendererFamilies as readonly string[]).includes(value);
}

function parseCellKind(value: unknown): DisplayCell["kind"] | null {
  return value === "board" || value === "grid" || value === "cells" || value === "card" || value === "status" ? value : null;
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function nullableNonNegativeInteger(value: unknown): number | null | undefined {
  return value === undefined || value === null ? null : nonNegativeInteger(value);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function inferRows(length: number): number {
  return length > 0 ? Math.ceil(Math.sqrt(length)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
