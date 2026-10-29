import type { PublicReplayDetail } from "@/lib/public-artifact-replay";
import {
  buildPublicReplayTimeline,
  emptyReplayFrameForGame,
  normalizeReplayBoard as normalizePublicReplayBoard,
  replayRendererForGame,
  type PublicReplayFrame,
  type PublicReplayTimeline,
  type ReplayRendererConfig,
} from "@/lib/replay-visualization";
import { visiblePlaybackFramesFromTimeline } from "@/lib/replay-playback";
import type { MatchSeed } from "@/lib/platform-data";

export const REPLAY_AUTOPLAY_MS = 2000;

export type ReplayMoveMeta = {
  ply: number;
  turnIndex?: number;
  who: "a" | "b";
  actor?: string | null;
  note: string;
  reasoning?: string | null;
  visible: boolean;
  stateHash?: string | null;
};

export type ReplayState =
  | { kind: "ttt"; states: string[][]; meta: ReplayMoveMeta[] }
  | { kind: "c4"; states: string[][]; meta: ReplayMoveMeta[] }
  | { kind: "visual"; renderer: ReplayRendererConfig; frames: PublicReplayFrame[]; meta: ReplayMoveMeta[] }
  | { kind: "static"; meta: ReplayMoveMeta[] };

export type ReplayActorLabels = {
  playerA?: string | null;
  playerB?: string | null;
};

export function replayFrameCount(replay: ReplayState): number {
  if (replay.kind === "ttt" || replay.kind === "c4") {
    return replay.states.length;
  }
  if (replay.kind === "visual") {
    return replay.frames.length;
  }
  return 0;
}

export function replayMaxPly(replay: ReplayState): number {
  return Math.max(0, replayFrameCount(replay) - 1);
}

export function replayVisibleFrameCount(replay: ReplayState): number {
  if (replay.kind === "ttt" || replay.kind === "c4") {
    return replay.states.filter(boardHasVisibleState).length;
  }
  if (replay.kind === "visual") {
    return replay.frames.filter((frame) => frame.hasVisibleState).length;
  }
  return 0;
}

export function replayHasVisibleBoard(replay: ReplayState): boolean {
  return replay.kind !== "static" && replayVisibleFrameCount(replay) > 0;
}

export function replayHasPlayableTimeline(replay: ReplayState): boolean {
  return replay.kind !== "static" && replayMaxPly(replay) > 0 && replayVisibleMoves(replay).length > 0;
}

export function replayVisibleMoves(replay: ReplayState): ReplayMoveMeta[] {
  return replay.meta.filter((move) => move.visible);
}

export function replayDefaultPly(replay: ReplayState, status: MatchSeed["status"] | "completed"): number {
  const maxPly = replayMaxPly(replay);
  if (status === "live") {
    return maxPly;
  }
  const visible = replayLastVisiblePly(replay);
  return visible ?? (status === "completed" ? maxPly : 0);
}

export function replayFirstVisiblePly(replay: ReplayState): number | null {
  if (replay.kind === "ttt" || replay.kind === "c4") {
    const index = replay.states.findIndex(boardHasVisibleState);
    return index >= 0 ? index : null;
  }
  if (replay.kind === "visual") {
    const index = replay.frames.findIndex((frame) => frame.hasVisibleState);
    return index >= 0 ? index : null;
  }
  return null;
}

export function replayActiveMove(replay: ReplayState, ply: number): ReplayMoveMeta | null {
  const exact = replay.meta.find((move) => move.ply === ply);
  if (exact?.visible) {
    return exact;
  }
  for (let index = replay.meta.length - 1; index >= 0; index -= 1) {
    const move = replay.meta[index];
    if (move?.visible && move.ply <= ply) {
      return move;
    }
  }
  return null;
}

export function replayFrameMeta(replay: ReplayState, ply: number): { turnLabel: string; hashLabel: string } {
  if (replay.kind === "visual") {
    const frame = replay.frames[ply] ?? replay.frames.at(-1);
    const isPlaceholder = frame?.type === "replay.placeholder";
    const sourceTurn = frame?.moveNumber ?? frame?.index ?? ply;
    const turn = isPlaceholder ? "Replay pending" : frame ? `Turn ${sourceTurn} | ${frame.type}` : "Turn 0";
    const status = isPlaceholder ? "Preparing public replay" : frame?.terminal ? "Final turn" : frame?.hasVisibleState ? "Turn ready" : "Preparing turn";
    return { turnLabel: turn, hashLabel: status };
  }
  const meta = replay.meta.find((move) => move.ply === ply);
  return {
    turnLabel: meta ? `Turn ${meta.turnIndex ?? meta.ply} | ${meta.note}` : `Turn ${ply} | initial`,
    hashLabel: meta?.visible ? "Turn ready" : "Preparing turn",
  };
}

export function replayFromDetail(replay: PublicReplayDetail): ReplayState {
  if (!replay.gameSlug) {
    return { kind: "static", meta: [] };
  }
  return replayStateFromTimeline(buildPublicReplayTimeline(replay.gameSlug, replay.events), { playerA: replay.modelA, playerB: replay.modelB ?? replay.modelId });
}

export function replayStateFromTimeline(timeline: PublicReplayTimeline, actors: ReplayActorLabels = {}): ReplayState {
  const boardEntries = visiblePlaybackFramesFromTimeline(timeline).map(({ frame, sourceIndex }) => {
    const board = normalizePublicReplayBoard(frame.board, timeline.renderer.gameSlug);
    return { frame, board, meta: replayMoveMetaFromFrame(timeline.renderer.gameSlug, frame, sourceIndex, actors) };
  });
  if (boardEntries.length === 0) {
    return emptyVisualReplay(timeline.renderer.gameSlug);
  }
  const openingFrame = emptyFrameForRenderer(timeline.renderer);
  const boards = boardEntries.map((entry) => entry.board);
  const replay = { events: timeline.frames, gameSlug: timeline.renderer.gameSlug };
  if (replay.gameSlug === "tic-tac-toe" && boards.some((board) => board.length === 9)) {
    const entries = boardEntries.filter((entry) => entry.board.length === 9);
    return {
      kind: "ttt",
      states: [Array.from({ length: 9 }, () => ""), ...entries.map((entry) => entry.board)],
      meta: entries.map((entry, index) => ({ ...entry.meta, ply: index + 1 }))
    };
  }
  if (replay.gameSlug === "connect-four" && boards.some((board) => board.length === 42)) {
    const entries = boardEntries.filter((entry) => entry.board.length === 42);
    return {
      kind: "c4",
      states: [Array.from({ length: 42 }, () => ""), ...entries.map((entry) => entry.board)],
      meta: entries.map((entry, index) => ({ ...entry.meta, ply: index + 1 }))
    };
  }
  if (boardEntries.length > 0) {
    return {
      kind: "visual",
      renderer: timeline.renderer,
      frames: [openingFrame, ...boardEntries.map((entry) => entry.frame)],
      meta: boardEntries.map((entry, index) => ({ ...entry.meta, ply: index + 1 })),
    };
  }
  return emptyVisualReplay(timeline.renderer.gameSlug);
}

function emptyFrameForRenderer(renderer: ReplayRendererConfig): PublicReplayFrame {
  return {
    ...emptyReplayFrameForGame(renderer.gameSlug),
    rows: renderer.rows,
    cols: renderer.cols,
    board: Array.from({ length: renderer.rows * renderer.cols }, () => ""),
  };
}

export function emptyVisualReplay(gameSlug: string): ReplayState {
  const renderer = replayRendererForGame(gameSlug);
  return {
    kind: "visual",
    renderer,
    frames: [emptyReplayFrameForGame(gameSlug)],
    meta: [],
  };
}

export function boardHasVisibleState(board: readonly string[]): boolean {
  return board.some((cell) => Boolean(cell && cell.trim().length > 0 && cell !== "."));
}

function replayLastVisiblePly(replay: ReplayState): number | null {
  if (replay.kind === "ttt" || replay.kind === "c4") {
    for (let index = replay.states.length - 1; index >= 0; index -= 1) {
      if (boardHasVisibleState(replay.states[index] ?? [])) {
        return index;
      }
    }
    return null;
  }
  if (replay.kind === "visual") {
    for (let index = replay.frames.length - 1; index >= 0; index -= 1) {
      if (replay.frames[index]?.hasVisibleState) {
        return index;
      }
    }
  }
  return null;
}

function replayMoveMetaFromFrame(gameSlug: string, frame: PublicReplayFrame, ply: number, actors: ReplayActorLabels = {}): ReplayMoveMeta {
  return {
    ply,
    turnIndex: frame.moveNumber ?? frame.index,
    who: replayActorSide(frame.player, actors),
    actor: replayActorKey(frame.player, actors),
    note: frame.action ? replayActionLabel(gameSlug, frame.action) : frame.type,
    reasoning: frame.reasoning,
    visible: frame.hasVisibleState,
    stateHash: frame.stateHash,
  };
}

function replayActorKey(player: string | null, actors: ReplayActorLabels): string | null {
  const normalized = normalizeActorLabel(player);
  if (normalized) return normalized;
  const side = replayActorSide(player, actors);
  if (side === "a") return normalizeActorLabel(actors.playerA) ?? "a";
  return normalizeActorLabel(actors.playerB) ?? "b";
}

function replayActorSide(player: string | null, actors: ReplayActorLabels): "a" | "b" {
  const normalized = normalizeActorLabel(player);
  if (normalized && ["b", "player_2", "player2", "seat_2", "seat_b", "agent_2", "agent_b", "model"].includes(normalized)) {
    return "b";
  }
  if (normalized && ["a", "player_1", "player1", "seat_1", "seat_a", "agent_1", "agent_a", "human"].includes(normalized)) {
    return "a";
  }
  const playerA = normalizeActorLabel(actors.playerA);
  const playerB = normalizeActorLabel(actors.playerB);
  if (normalized && playerB && normalized === playerB) {
    return "b";
  }
  if (normalized && playerA && normalized === playerA) {
    return "a";
  }
  return "a";
}

function normalizeActorLabel(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return normalized || null;
}

function replayActionLabel(gameSlug: string, action: string): string {
  const numeric = Number(action);
  if (Number.isFinite(numeric)) {
    if (gameSlug === "connect-four") {
      return `col ${numeric + 1}`;
    }
    if (gameSlug === "tic-tac-toe") {
      return `cell ${numeric + 1}`;
    }
  }
  return action;
}
