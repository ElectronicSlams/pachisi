"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ReplayState } from "@/lib/replay-view-state";
import type { PublicReplayFrame, ReplayRendererConfig } from "@/lib/replay-visualization";

type PixiGraphics = import("pixi.js").Graphics;

const TTT_CELL_IDS = Array.from({ length: 9 }, (_, index) => `ttt-${index}`);
const CONNECT_FOUR_SLOT_IDS = Array.from({ length: 42 }, (_, index) => `c4-${index}`);
const GENERIC_BOARD_SLOT_IDS = Array.from({ length: 64 }, (_, index) => `generic-${index}`);

export function ReplayBoard({ replay, ply }: { replay: ReplayState; ply: number }) {
  if (replay.kind === "ttt") {
    const board = replay.states[ply] ?? replay.states.at(-1) ?? [];
    return (
      <div className="tttboard" data-renderer-kind="tic-tac-toe" data-game-slug="tic-tac-toe">
        {TTT_CELL_IDS.map((cellId, index) => {
          const mark = ticTacToeMark(board[index] ?? "");
          return (
            <div key={cellId} className={`tttcell ${mark ? `filled ttt-${mark}` : ""}`}>
              {mark ? <span className={`ttt-mark ttt-${mark}`}>{mark}</span> : null}
            </div>
          );
        })}
      </div>
    );
  }
  if (replay.kind === "c4") {
    const board = replay.states[ply] ?? replay.states.at(-1) ?? [];
    return (
      <div className="c4board" data-renderer-kind="connect-four" data-game-slug="connect-four">
        {CONNECT_FOUR_SLOT_IDS.map((slotId, index) => (
          <div key={slotId} className="c4cell">{board[index] ? <span className={`c4disc c4-${board[index]}`} /> : null}</div>
        ))}
      </div>
    );
  }
  if (replay.kind === "visual") {
    return <ReplayVisualFrame frame={replay.frames[ply] ?? replay.frames.at(-1)} renderer={replay.renderer} />;
  }
  return <div className="genboard">{GENERIC_BOARD_SLOT_IDS.map((slotId, index) => <div key={slotId} className={`gb-sq ${index % 2 ? "gb-d" : "gb-l"}`} />)}</div>;
}

export function ReplayVisualFrame({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const wrap = (content: ReactNode) => (
    <div className="replay-visual-shell" data-renderer-kind={renderer.kind} data-game-slug={renderer.gameSlug}>
      {content}
    </div>
  );

  if (renderer.kind === "tic-tac-toe") return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-tttboard" tokenClassName={defaultTokenClass} />);
  if (renderer.kind === "connect-four") return wrap(<ReplayConnectFourBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "chess") return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-chessboard" tokenClassName={chessTokenClass} />);
  if (renderer.kind === "stone-grid") return wrap(<ReplayStoneBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "disc-grid") return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-discboard" tokenClassName={discTokenClass} />);
  if (renderer.kind === "checkers") return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-checkerboard" tokenClassName={checkerTokenClass} />);
  if (renderer.kind === "hex-grid") return wrap(<ReplayHexBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "ultimate-grid") return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-ultimateboard" tokenClassName={defaultTokenClass} />);
  if (renderer.kind === "mancala") return wrap(<ReplayMancalaBoard board={board} />);
  if (renderer.kind === "morris") return wrap(<ReplayMorrisBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "backgammon") return wrap(<ReplayBackgammonBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "battleship") return wrap(<ReplayBattleshipBoard frame={frame} renderer={renderer} />);
  if (renderer.kind === "card-table") {
    const cards = replayCardViews(board, renderer.cols);
    const metrics = replayCardMetrics(board);
    const publicValues = replayPublicValueViews(board, new Set(metrics));
    const pot = metrics.find((metric) => /^pot\s/iu.test(metric));
    const tableMetrics = [...new Set(metrics.filter((metric) => metric !== pot))].slice(0, 8);
    return wrap(
      <div className="cardtable replay-cardtable replay-cardtable-polished">
        <span className="replay-card-deck" aria-hidden="true"><span /><span /></span>
        {tableMetrics.length > 0 ? (
          <span className="replay-card-metrics" aria-label="Table status">
            {tableMetrics.map((metric) => (
              <span key={metric} className="replay-card-metric mono">
                {replayCardMetricLabel(metric)}
              </span>
            ))}
          </span>
        ) : null}
        {cards.length > 0 || publicValues.length > 0 ? (
          <span className="replay-card-hand" aria-label="Recorded public card and table values">
            {cards.map((card, index) => (
              <span
                key={`${card.key}-${index}`}
                className={`playcard ${card.red ? "pc-red" : ""}`}
                style={{ "--i": String(index), "--n": String(cards.length) } as CSSProperties}
              >
                <span className="pc-rank">{card.rank}</span>
                <span className="pc-suit">{card.suit}</span>
              </span>
            ))}
            {publicValues.map(({ value, key }, index) => <span key={key} className="playcard" style={{ "--i": String(cards.length + index), "--n": String(cards.length + publicValues.length) } as CSSProperties} aria-label={`Public value ${value}`}><span className="pc-rank">{value}</span></span>)}
          </span>
        ) : <span className="replay-empty-state mono">No public cards recorded in this frame.</span>}
        <span className="replay-card-pot mono">{pot ? replayCardMetricLabel(pot) : "Table"}</span>
      </div>
    );
  }
  if (renderer.kind === "dice-table") return wrap(<ReplayDiceTable board={board} />);
  if (renderer.kind === "strategy-matrix") {
    const values = replayMatrixValues(board);
    return wrap(
      <div className="matrixview">
        <div className="payoff">
          {values.length > 0
            ? values.map((value, index) => <span key={`${value}-${index}`} className={`po-cell ${index % 3 === 0 ? "po-diag" : ""}`}>{value}</span>)
            : <span className="replay-empty-state mono">Public matrix coming soon</span>}
        </div>
      </div>
    );
  }
  if (renderer.kind === "rl-grid") return wrap(<ReplayRlGrid frame={frame} renderer={renderer} />);
  if (renderer.kind === "rl-track") return wrap(<ReplayArcadeStage board={board} renderer={renderer} fallback={<ReplayRlTrack board={board} renderer={renderer} />} />);
  if (renderer.kind === "rl-scene") return wrap(<ReplayArcadeStage board={board} renderer={renderer} fallback={<ReplayRlScene board={board} renderer={renderer} />} />);
  return wrap(<ReplayTokenBoard frame={frame} renderer={renderer} className="replay-gridboard" tokenClassName={defaultTokenClass} />);
}

function ReplayTokenBoard({
  frame,
  renderer,
  className,
  tokenClassName,
}: {
  frame: PublicReplayFrame | undefined;
  renderer: ReplayRendererConfig;
  className: string;
  tokenClassName: (cell: string) => string;
}) {
  const board = frame?.board ?? [];
  const rows = frame?.rows ?? renderer.rows;
  const cols = frame?.cols ?? renderer.cols;
  const total = Math.max(rows * cols, board.length, 1);
  const cells = Array.from({ length: total }, (_, index) => replayCellView(renderer.gameSlug, index, board[index] ?? "", `replay-grid-cell ${board[index] ? "replay-grid-filled" : ""} ${tokenClassName(board[index] ?? "")}`));
  return (
    <div className={className} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {cells.map((cell) => <ReplayCell key={cell.key} cell={cell} />)}
    </div>
  );
}

function ReplayStoneBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const rows = frame?.rows ?? renderer.rows;
  const cols = frame?.cols ?? renderer.cols;
  const total = Math.max(rows * cols, board.length, 1);
  return (
    <div className="replay-stoneboard" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, index) => {
        const cell = board[index] ?? "";
        return <span key={`${renderer.gameSlug}-${index}`} className="replay-stone-cell">{cell ? <span className={stoneTokenClass(cell)} /> : null}</span>;
      })}
    </div>
  );
}

function ReplayConnectFourBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const rows = frame?.rows ?? renderer.rows;
  const cols = frame?.cols ?? renderer.cols;
  const total = Math.max(rows * cols, board.length, 1);
  return (
    <div className="replay-c4board" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, index) => {
        const raw = board[index] ?? "";
        return <span key={`${renderer.gameSlug}-${index}`} className={`replay-c4slot ${raw ? "replay-c4filled" : ""} ${defaultTokenClass(raw)}`}>{raw ? <span /> : null}</span>;
      })}
    </div>
  );
}

function ReplayHexBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const total = Math.max((frame?.rows ?? renderer.rows) * (frame?.cols ?? renderer.cols), board.length, 1);
  const cells = Array.from({ length: total }, (_, index) => {
    const raw = board[index] ?? "";
    return replayCellView(renderer.gameSlug, index, raw, `replay-hex-cell ${raw ? "replay-hex-filled" : ""} ${defaultTokenClass(raw)}`);
  });
  return <div className="replay-hexboard">{cells.map((cell) => <ReplayCell key={cell.key} cell={cell} />)}</div>;
}

function ReplayMancalaBoard({ board }: { board: readonly string[] }) {
  const pits = board.filter((cell) => cell !== "");
  return (
    <div className="replay-mancala">
      {pits.length > 0
        ? pits.map((cell, index) => <span key={`${cell}-${index}`} className={`replay-pit ${index === 0 || index === pits.length - 1 ? "replay-store" : ""}`}><b>{cell}</b></span>)
        : <span className="replay-empty-state mono">Public pit counts coming soon</span>}
    </div>
  );
}

function ReplayMorrisBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const points = Array.from({ length: Math.max(24, board.length) }, (_, index) => board[index] ?? "");
  return (
    <div className="replay-morris" aria-label={renderer.label}>
      <div className="replay-morris-lines" />
      {points.map((raw, index) => {
        const cell = replayCellView(renderer.gameSlug, index, raw, `replay-morris-point replay-morris-${index} ${raw ? "replay-morris-filled" : ""} ${defaultTokenClass(raw)}`);
        return <ReplayCell key={cell.key} cell={cell} />;
      })}
    </div>
  );
}

function ReplayBackgammonBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const points = Array.from({ length: Math.max(24, board.length) }, (_, index) => board[index] ?? "");
  const top = Array.from({ length: 12 }, (_, slot) => replayBackgammonPointView(renderer.gameSlug, 23 - slot, points[23 - slot] ?? ""));
  const bottom = Array.from({ length: 12 }, (_, pointIndex) => replayBackgammonPointView(renderer.gameSlug, pointIndex, points[pointIndex] ?? ""));
  return (
    <div className="replay-backgammon" aria-label={renderer.label}>
      <div className="replay-bg-row replay-bg-top">{top.map((point) => <ReplayBackgammonPoint key={point.key} point={point} />)}</div>
      <div className="replay-bg-bar mono">{frame?.backgammonCounts?.length ? frame.backgammonCounts.join(" · ") : "Bar / borne-off counts not recorded"}</div>
      <div className="replay-bg-row replay-bg-bottom">{bottom.map((point) => <ReplayBackgammonPoint key={point.key} point={point} />)}</div>
    </div>
  );
}

type ReplayBackgammonPointView = {
  key: string;
  className: string;
  label: string;
  description: string;
};

function replayBackgammonPointView(gameSlug: string, pointIndex: number, raw: string): ReplayBackgammonPointView {
  const compact=raw.match(/^(\d{1,2})([AB])$/u);
  const meaning=compact ? `Player ${compact[2] === "A" ? "1" : "2"} × ${compact[1]}` : renderReplayCell(raw);
  return {
    key: `${gameSlug}-bg-${pointIndex}`,
    className: `replay-bg-point ${raw ? "replay-bg-filled" : ""} ${defaultTokenClass(raw)}`,
    label: meaning.replace(/Player (\d+)/gu,"P$1").replace(/ × /gu,"×"),
    description: `Point ${pointIndex+1}: ${meaning || "empty"}`,
  };
}

function ReplayBackgammonPoint({ point }: { point: ReplayBackgammonPointView }) {
  return <span className={point.className} title={point.description} aria-label={point.description}>{point.label}</span>;
}

function ReplayBattleshipBoard({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const rows = frame?.rows ?? renderer.rows;
  const cols = frame?.cols ?? renderer.cols;
  const total = Math.max(rows * cols, board.length, 1);
  const cells = Array.from({ length: total }, (_, index) => {
    const raw = board[index] ?? "";
    return replayCellView(renderer.gameSlug, index, raw, `replay-sea-cell ${battleshipTokenClass(raw)}`);
  });
  return <div className="replay-battleship" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{cells.map((cell) => <ReplayCell key={cell.key} cell={cell} />)}</div>;
}

function ReplayDiceTable({ board }: { board: readonly string[] }) {
  const values = board
    .map((value, slot) => value ? { key: `die-${slot}-${value}`, label: renderReplayCell(value) } : null)
    .filter((value): value is { key: string; label: string } => value !== null)
    .slice(0, 12);
  return (
    <div className="replay-dicetable">
      {values.length > 0 ? values.map((value) => <ReplayDie key={value.key} value={value} />) : <span className="replay-empty-state mono">Public dice and bid state coming soon</span>}
    </div>
  );
}

function ReplayDie({ value }: { value: { key: string; label: string } }) {
  return <span className="replay-die mono">{value.label}</span>;
}

function ReplayRlGrid({ frame, renderer }: { frame: PublicReplayFrame | undefined; renderer: ReplayRendererConfig }) {
  const board = frame?.board ?? [];
  const rows = frame?.rows ?? renderer.rows;
  const cols = frame?.cols ?? renderer.cols;
  const total = Math.max(rows * cols, board.length, 1);
  const cells = Array.from({ length: total }, (_, index) => {
    const raw = board[index] ?? "";
    return replayCellView(renderer.gameSlug, index, raw, `replay-rl-cell ${rlTokenClass(raw)}`);
  });
  return <div className="replay-rl-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{cells.map((cell) => <ReplayCell key={cell.key} cell={cell} />)}</div>;
}

function ReplayArcadeStage({
  board,
  fallback,
  renderer,
}: {
  board: readonly string[];
  fallback: ReactNode;
  renderer: ReplayRendererConfig;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const state = useMemo(() => arcadeSceneState(board, renderer), [board, renderer]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    void (async () => {
      const PIXI = await import("pixi.js");
      if (cancelled || !host.isConnected) return;

      const nextApp = new PIXI.Application();
      await nextApp.init({
        antialias: false,
        autoDensity: true,
        backgroundAlpha: 0,
        resizeTo: host,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });
      if (cancelled || !host.isConnected) {
        nextApp.destroy();
        return;
      }

      const layer = new PIXI.Graphics();
      nextApp.stage.addChild(layer);
      const canvas = nextApp.canvas;
      canvas.className = "replay-arcade-canvas-el";
      canvas.setAttribute("aria-hidden", "true");
      host.replaceChildren(canvas);

      const drawFrame = () => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        drawArcadeScene(layer, state, width, height, performance.now());
      };
      drawFrame();
      nextApp.ticker.add(drawFrame);
      cleanup = () => {
        nextApp.ticker.remove(drawFrame);
        nextApp.destroy();
        if (host.isConnected) host.replaceChildren();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [state]);

  return (
    <div className="replay-arcade-wrap" data-arcade-game={renderer.gameSlug}>
      <div className="replay-arcade-fallback">{fallback}</div>
      <div ref={hostRef} className="replay-arcade-canvas" aria-hidden="true" />
      <div className="replay-arcade-hud mono">
        <span>{arcadeSceneTitle(renderer.gameSlug)}</span>
        <span>{state.action}</span>
      </div>
      <ReplaySceneReadout values={state.readout} />
    </div>
  );
}

type ArcadePoint = {
  readonly x: number;
  readonly y: number;
};

type ArcadeSceneState = {
  readonly action: string;
  readonly angle: number;
  readonly bullets: readonly ArcadePoint[];
  readonly fuel: number | null;
  readonly gameSlug: string;
  readonly hazards: readonly ArcadePoint[];
  readonly opponents: readonly ArcadePoint[];
  readonly progress: number;
  readonly readout: readonly ReplaySceneValue[];
  readonly score: number | null;
  readonly speed: number;
  readonly x: number;
  readonly y: number;
};

const arcadePalette = {
  bg: 0x070914,
  panel: 0x111827,
  grid: 0x263247,
  accent: 0x6577ff,
  cyan: 0x19b6e8,
  green: 0x35d07f,
  amber: 0xf0c35b,
  pink: 0xff5b9a,
  red: 0xf45d5d,
  ice: 0xb7e8ff,
  white: 0xf5f7ff,
} as const;

function arcadeSceneState(board: readonly string[], renderer: ReplayRendererConfig): ArcadeSceneState {
  const gameSlug = renderer.gameSlug;
  const x = replayMetricPercent(board, ["x", "position", "progress", "player_x", "paddle_x"], 0.5, gameSlug === "lunar-lander" ? "signed" : "unit");
  const y = replayMetricPercent(board, ["y", "altitude", "player_y"], gameSlug === "lunar-lander" ? 0.58 : 0.5, "unit");
  const speed = replayMetricPercent(board, ["speed", "velocity"], 0.5, "signed");
  const angle = replayMetricNumber(board, ["angle"]) ?? (speed - 0.5) * 42;
  const score = replayMetricNumber(board, ["score", "reward"]);
  const fuel = replayMetricNumber(board, ["fuel", "lives"]);
  const hazards = [
    ...replaySceneCoordinates(board, ["alien", "enemy", "goal", "target"]),
    ...fallbackHazardsForGame(gameSlug),
  ].slice(0, gameSlug === "alien-shooter" ? 10 : 5);
  const bullets = replaySceneCoordinates(board, ["bullet", "shot", "projectile"]);
  const opponents = replaySceneCoordinates(board, ["opponent", "puck", "ball"]);
  return {
    action: replayArcadeAction(board) ?? "watching replay",
    angle,
    bullets,
    fuel,
    gameSlug,
    hazards,
    opponents,
    progress: x,
    readout: replayArcadeReadout(board, gameSlug, score, fuel),
    score,
    speed,
    x,
    y,
  };
}

function replayArcadeReadout(board: readonly string[], gameSlug: string, score: number | null, fuel: number | null): ReplaySceneValue[] {
  const values = replaySceneValues(board, gameSlug, 6);
  if (values.length > 0) return values;
  return [
    score !== null ? { key: `${gameSlug}-score`, value: `score ${formatArcadeNumber(score)}` } : null,
    fuel !== null ? { key: `${gameSlug}-fuel`, value: `fuel ${formatArcadeNumber(fuel)}` } : null,
  ].filter((value): value is ReplaySceneValue => value !== null);
}

function replayArcadeAction(board: readonly string[]): string | null {
  for (const value of [...board].reverse()) {
    const label = value.trim();
    if (!label || isReplaySceneReadoutValue(label)) continue;
    if (/^(left|right|up|down|fire|thrust|accelerate|brake|jump|punch|pass|shoot|move|action|turn|discard|noop|no-op)/iu.test(label)) {
      return label;
    }
  }
  return null;
}

function replaySceneCoordinates(board: readonly string[], labels: readonly string[]): ArcadePoint[] {
  const points: ArcadePoint[] = [];
  for (const value of board) {
    const label = value.trim();
    for (const key of labels) {
      const match = new RegExp(`^${escapeRegExp(key)}\\s+(-?\\d+(?:\\.\\d+)?)\\s*[, ]\\s*(-?\\d+(?:\\.\\d+)?)`, "iu").exec(label);
      if (!match) continue;
      const rawX = Number.parseFloat(match[1] ?? "");
      const rawY = Number.parseFloat(match[2] ?? "");
      if (Number.isFinite(rawX) && Number.isFinite(rawY)) {
        points.push({ x: coordinateToUnit(rawX, 6), y: coordinateToUnit(rawY, 5) });
      }
    }
  }
  return points;
}

function coordinateToUnit(value: number, maxGridValue: number): number {
  if (value >= 0 && value <= 1) return value;
  if (value >= -1 && value < 0) return (value + 1) / 2;
  if (value >= 0 && value <= maxGridValue) return value / maxGridValue;
  if (value >= 0 && value <= 100) return value / 100;
  return clamp01(value);
}

function fallbackHazardsForGame(gameSlug: string): ArcadePoint[] {
  if (gameSlug !== "alien-shooter") return [];
  return [
    { x: 0.22, y: 0.22 },
    { x: 0.42, y: 0.18 },
    { x: 0.62, y: 0.24 },
    { x: 0.78, y: 0.18 },
  ];
}

function drawArcadeScene(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  g.clear();
  fillRect(g, 0, 0, width, height, arcadePalette.bg);
  drawArcadeBackdrop(g, width, height, now);

  switch (state.gameSlug) {
    case "lunar-lander":
      drawLunarLander(g, state, width, height, now);
      break;
    case "car-racing":
      drawCarRacing(g, state, width, height, now);
      break;
    case "bipedal-walker":
      drawWalker(g, state, width, height, now);
      break;
    case "paddle-ball":
      drawPaddleBall(g, state, width, height, now);
      break;
    case "alien-shooter":
      drawAlienShooter(g, state, width, height, now);
      break;
    case "boxing-style-arena":
      drawBoxingArena(g, state, width, height, now);
      break;
    case "ice-hockey-style-arena":
      drawHockeyArena(g, state, width, height, now);
      break;
    case "mountain-car":
      drawMountainCar(g, state, width, height);
      break;
    default:
      drawCartPole(g, state, width, height, now);
      break;
  }

  drawScanlines(g, width, height);
}

function drawArcadeBackdrop(g: PixiGraphics, width: number, height: number, now: number): void {
  fillRect(g, 0, 0, width, height, arcadePalette.panel, 0.46);
  for (let index = 0; index < 28; index += 1) {
    const x = ((index * 67 + now * 0.012) % (width + 20)) - 10;
    const y = (index * 41) % height;
    fillCircle(g, x, y, index % 3 === 0 ? 1.8 : 1.1, arcadePalette.ice, index % 4 === 0 ? 0.62 : 0.32);
  }
}

function drawAlienShooter(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const ground = height * 0.86;
  strokeLine(g, width * 0.07, ground, width * 0.93, ground, arcadePalette.cyan, 2, 0.55);
  const shipX = width * (0.12 + state.x * 0.76);
  const pulse = Math.sin(now / 120) * 3;
  fillRect(g, shipX - 18, ground - 20, 36, 13, arcadePalette.accent);
  fillRect(g, shipX - 7, ground - 32, 14, 16, arcadePalette.white);
  fillRect(g, shipX - 28, ground - 10, 16, 8, arcadePalette.cyan);
  fillRect(g, shipX + 12, ground - 10, 16, 8, arcadePalette.cyan);
  fillRect(g, shipX - 5, ground - 2, 10, 18 + pulse, arcadePalette.amber, 0.72);

  const hazards = state.hazards.length > 0 ? state.hazards : fallbackHazardsForGame(state.gameSlug);
  hazards.forEach((point, index) => {
    const x = width * (0.12 + point.x * 0.76) + Math.sin(now / 350 + index) * 7;
    const y = height * (0.14 + point.y * 0.34);
    fillRect(g, x - 16, y - 8, 32, 16, arcadePalette.green);
    fillRect(g, x - 10, y + 8, 8, 8, arcadePalette.green);
    fillRect(g, x + 2, y + 8, 8, 8, arcadePalette.green);
    fillCircle(g, x - 7, y - 1, 2.2, arcadePalette.bg);
    fillCircle(g, x + 7, y - 1, 2.2, arcadePalette.bg);
  });

  const bullets = state.bullets.length > 0 ? state.bullets : [{ x: state.x, y: 0.48 + Math.sin(now / 240) * 0.18 }];
  bullets.forEach((point) => {
    const x = width * (0.12 + point.x * 0.76);
    const y = height * (0.76 - point.y * 0.46);
    fillRect(g, x - 2, y - 18, 4, 24, arcadePalette.amber);
  });
}

function drawLunarLander(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const terrainY = height * 0.76;
  strokePolyline(g, [
    [0, terrainY + 24],
    [width * 0.16, terrainY + 2],
    [width * 0.34, terrainY + 18],
    [width * 0.44, terrainY],
    [width * 0.56, terrainY],
    [width * 0.72, terrainY + 28],
    [width, terrainY + 10],
  ], arcadePalette.ice, 3, 0.65);
  fillRect(g, width * 0.43, terrainY - 3, width * 0.14, 6, arcadePalette.green);
  const x = width * (0.18 + state.x * 0.64);
  const y = height * (0.18 + state.y * 0.44);
  const flame = Math.max(5, 20 * (1 - state.speed) + Math.sin(now / 80) * 3);
  fillRect(g, x - 16, y - 12, 32, 24, arcadePalette.white);
  fillRect(g, x - 10, y - 22, 20, 10, arcadePalette.cyan);
  strokeLine(g, x - 12, y + 12, x - 24, y + 28, arcadePalette.white, 3, 0.72);
  strokeLine(g, x + 12, y + 12, x + 24, y + 28, arcadePalette.white, 3, 0.72);
  fillRect(g, x - 6, y + 14, 12, flame, arcadePalette.amber, 0.82);
  strokeCircle(g, x, y, 26, arcadePalette.accent, 1.5, 0.4);
}

function drawCarRacing(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const roadX = width * 0.23;
  const roadW = width * 0.54;
  fillRect(g, roadX, 0, roadW, height, 0x1d2232);
  strokeLine(g, roadX + roadW * 0.5, 0, roadX + roadW * 0.5, height, arcadePalette.amber, 2, 0.25);
  for (let y = -40 + (now * 0.08) % 80; y < height + 40; y += 80) {
    fillRect(g, roadX + roadW * 0.48, y, roadW * 0.04, 36, arcadePalette.white, 0.8);
  }
  strokeLine(g, roadX, 0, roadX, height, arcadePalette.red, 6, 0.8);
  strokeLine(g, roadX + roadW, 0, roadX + roadW, height, arcadePalette.red, 6, 0.8);
  const carX = roadX + roadW * (0.22 + state.x * 0.56);
  const carY = height * (0.68 - Math.sin(state.progress * Math.PI * 2) * 0.08);
  drawCar(g, carX, carY, arcadePalette.accent);
}

function drawWalker(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const ground = height * 0.74;
  strokeLine(g, 0, ground, width, ground + 12, arcadePalette.green, 4, 0.72);
  const x = width * (0.16 + state.x * 0.7);
  const y = ground - 46 + Math.sin(now / 150) * 4;
  strokeLine(g, x - 18, y + 20, x - 34, ground, arcadePalette.white, 5, 0.85);
  strokeLine(g, x + 18, y + 20, x + 35, ground, arcadePalette.white, 5, 0.85);
  strokeLine(g, x - 8, y + 22, x + 4, ground, arcadePalette.cyan, 4, 0.85);
  strokeLine(g, x + 8, y + 22, x - 4, ground, arcadePalette.cyan, 4, 0.85);
  fillRect(g, x - 24, y - 4, 48, 28, arcadePalette.accent);
  fillCircle(g, x + 28, y + 6, 9, arcadePalette.white);
}

function drawPaddleBall(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  fillRect(g, width * 0.08, height * 0.12, width * 0.84, height * 0.72, 0x091326, 0.84);
  for (let y = height * 0.16; y < height * 0.82; y += 24) fillRect(g, width * 0.5 - 1, y, 2, 12, arcadePalette.white, 0.35);
  const ball = state.opponents[0] ?? { x: (state.x + state.speed) % 1, y: Math.abs(Math.sin((state.x + state.speed + now / 3000) * Math.PI)) };
  fillCircle(g, width * (0.16 + ball.x * 0.68), height * (0.22 + ball.y * 0.48), 11, arcadePalette.amber);
  fillRect(g, width * (0.12 + state.x * 0.66), height * 0.67, width * 0.16, 12, arcadePalette.accent);
}

function drawBoxingArena(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const ring = { x: width * 0.13, y: height * 0.18, w: width * 0.74, h: height * 0.62 };
  fillRect(g, ring.x, ring.y, ring.w, ring.h, 0x121725, 0.88);
  for (let index = 0; index < 3; index += 1) {
    strokeLine(g, ring.x, ring.y + ring.h * (0.2 + index * 0.22), ring.x + ring.w, ring.y + ring.h * (0.2 + index * 0.22), arcadePalette.red, 2, 0.65);
  }
  const sway = Math.sin(now / 170) * 10;
  drawFighter(g, ring.x + ring.w * (0.34 + state.x * 0.08), ring.y + ring.h * (0.58 + state.speed * 0.08), arcadePalette.accent, sway);
  drawFighter(g, ring.x + ring.w * (0.66 - state.x * 0.08), ring.y + ring.h * (0.56 - state.speed * 0.06), arcadePalette.green, -sway);
}

function drawHockeyArena(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  fillRect(g, width * 0.08, height * 0.12, width * 0.84, height * 0.72, 0xd7f3ff, 0.88);
  strokeLine(g, width * 0.5, height * 0.12, width * 0.5, height * 0.84, arcadePalette.red, 3, 0.52);
  strokeCircle(g, width * 0.5, height * 0.48, 38, arcadePalette.cyan, 2, 0.56);
  fillRect(g, width * 0.08, height * 0.39, 8, height * 0.18, arcadePalette.red, 0.72);
  fillRect(g, width * 0.91, height * 0.39, 8, height * 0.18, arcadePalette.red, 0.72);
  const puck = state.opponents[0] ?? { x: state.x, y: 0.5 + Math.sin(now / 280) * 0.18 };
  drawSkater(g, width * (0.25 + state.x * 0.22), height * (0.38 + state.speed * 0.18), arcadePalette.accent);
  drawSkater(g, width * (0.74 - state.x * 0.2), height * (0.57 - state.speed * 0.16), arcadePalette.green);
  fillCircle(g, width * (0.14 + puck.x * 0.72), height * (0.2 + puck.y * 0.58), 7, 0x05070c);
}

function drawMountainCar(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number): void {
  const points: [number, number][] = [];
  for (let index = 0; index <= 28; index += 1) {
    const x = (index / 28) * width;
    const y = height * 0.68 - Math.sin(index / 28 * Math.PI * 2.15) * height * 0.13;
    points.push([x, y]);
  }
  strokePolyline(g, points, arcadePalette.green, 4, 0.86);
  strokeLine(g, width * 0.85, height * 0.42, width * 0.85, height * 0.65, arcadePalette.white, 2, 0.7);
  fillRect(g, width * 0.85, height * 0.42, 28, 16, arcadePalette.green);
  const x = width * (0.1 + state.progress * 0.75);
  const y = height * 0.68 - Math.sin(state.progress * Math.PI * 2.15) * height * 0.13 - 12;
  drawCar(g, x, y, arcadePalette.amber);
}

function drawCartPole(g: PixiGraphics, state: ArcadeSceneState, width: number, height: number, now: number): void {
  const railY = height * 0.72;
  strokeLine(g, width * 0.12, railY, width * 0.88, railY, arcadePalette.ice, 4, 0.6);
  const cartX = width * (0.14 + state.progress * 0.72);
  const tilt = (state.angle || Math.sin(now / 300) * 24) * Math.PI / 180;
  fillRect(g, cartX - 26, railY - 20, 52, 22, arcadePalette.accent);
  fillCircle(g, cartX - 16, railY + 6, 7, arcadePalette.white);
  fillCircle(g, cartX + 16, railY + 6, 7, arcadePalette.white);
  strokeLine(g, cartX, railY - 20, cartX + Math.sin(tilt) * 72, railY - 20 - Math.cos(tilt) * 72, arcadePalette.green, 6, 0.9);
  fillCircle(g, cartX + Math.sin(tilt) * 72, railY - 20 - Math.cos(tilt) * 72, 8, arcadePalette.amber);
}

function drawCar(g: PixiGraphics, x: number, y: number, color: number): void {
  fillRect(g, x - 18, y - 9, 36, 18, color);
  fillRect(g, x - 11, y - 17, 22, 10, arcadePalette.white, 0.82);
  fillCircle(g, x - 13, y + 10, 6, 0x05070c);
  fillCircle(g, x + 13, y + 10, 6, 0x05070c);
}

function drawFighter(g: PixiGraphics, x: number, y: number, color: number, sway: number): void {
  fillCircle(g, x, y - 28, 13, arcadePalette.white);
  fillRect(g, x - 14, y - 14, 28, 34, color);
  strokeLine(g, x - 12, y - 4, x - 38 + sway, y - 22, color, 8, 0.95);
  strokeLine(g, x + 12, y - 4, x + 34 + sway, y - 18, color, 8, 0.95);
  strokeLine(g, x - 8, y + 20, x - 20, y + 42, arcadePalette.white, 7, 0.85);
  strokeLine(g, x + 8, y + 20, x + 20, y + 42, arcadePalette.white, 7, 0.85);
}

function drawSkater(g: PixiGraphics, x: number, y: number, color: number): void {
  fillCircle(g, x, y - 14, 8, arcadePalette.white);
  fillRect(g, x - 10, y - 6, 20, 26, color);
  strokeLine(g, x - 6, y + 20, x - 22, y + 32, 0x151923, 4, 0.82);
  strokeLine(g, x + 6, y + 20, x + 23, y + 30, 0x151923, 4, 0.82);
  strokeLine(g, x + 10, y + 6, x + 30, y + 20, 0x22180b, 3, 0.82);
}

function drawScanlines(g: PixiGraphics, width: number, height: number): void {
  for (let y = 0; y < height; y += 6) {
    fillRect(g, 0, y, width, 1, 0x000000, 0.18);
  }
  strokeRect(g, 6, 6, width - 12, height - 12, arcadePalette.accent, 1, 0.28);
}

function fillRect(g: PixiGraphics, x: number, y: number, width: number, height: number, color: number, alpha = 1): void {
  g.rect(x, y, width, height).fill({ color, alpha });
}

function strokeRect(g: PixiGraphics, x: number, y: number, width: number, height: number, color: number, lineWidth = 1, alpha = 1): void {
  g.rect(x, y, width, height).stroke({ color, width: lineWidth, alpha });
}

function fillCircle(g: PixiGraphics, x: number, y: number, radius: number, color: number, alpha = 1): void {
  g.circle(x, y, radius).fill({ color, alpha });
}

function strokeCircle(g: PixiGraphics, x: number, y: number, radius: number, color: number, lineWidth = 1, alpha = 1): void {
  g.circle(x, y, radius).stroke({ color, width: lineWidth, alpha });
}

function strokeLine(g: PixiGraphics, x1: number, y1: number, x2: number, y2: number, color: number, lineWidth = 1, alpha = 1): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: lineWidth, alpha });
}

function strokePolyline(g: PixiGraphics, points: readonly [number, number][], color: number, lineWidth = 1, alpha = 1): void {
  if (points.length < 2) return;
  const first = points[0];
  if (!first) return;
  const rest = points.slice(1);
  g.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    g.lineTo(x, y);
  }
  g.stroke({ color, width: lineWidth, alpha });
}

function arcadeSceneTitle(gameSlug: string): string {
  if (gameSlug === "alien-shooter") return "alien run";
  if (gameSlug === "car-racing") return "race cam";
  if (gameSlug === "lunar-lander") return "landing cam";
  if (gameSlug === "mountain-car") return "hill climb";
  if (gameSlug === "paddle-ball") return "paddle rally";
  if (gameSlug === "boxing-style-arena") return "ring cam";
  if (gameSlug === "ice-hockey-style-arena") return "rink cam";
  if (gameSlug === "bipedal-walker") return "walker cam";
  return "arcade cam";
}

function formatArcadeNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ReplayRlTrack({ board, renderer }: { board: readonly string[]; renderer: ReplayRendererConfig }) {
  const activeIndex = replayTrackActiveIndex(board, renderer.cols);
  const progress = renderer.cols <= 1 ? 0 : activeIndex / (renderer.cols - 1);
  const values = replaySceneValues(board, renderer.gameSlug, 8);
  if (renderer.gameSlug === "mountain-car") {
    const carLeft = percent(10 + progress * 78);
    const carBottom = percent(28 + Math.sin(progress * Math.PI) * 22);
    return (
      <div className="replay-native-scene replay-mountain-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-mountain-valley" />
        <span className="replay-mountain-goal" />
        <span className="replay-scene-point replay-scene-car replay-mountain-car" style={{ left: carLeft, bottom: carBottom }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  const cartLeft = percent(10 + progress * 80);
  const poleTilt = -20 + progress * 40;
  return (
    <div className="replay-native-scene replay-cartpole-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
      <span className="replay-cartpole-rail" />
      <span className="replay-cartpole-cart" style={{ left: cartLeft }}>
        <span className="replay-cartpole-pole" style={{ transform: `rotate(${poleTilt.toFixed(1)}deg)` }} />
      </span>
      <ReplaySceneReadout values={values} />
    </div>
  );
}

function ReplayRlScene({ board, renderer }: { board: readonly string[]; renderer: ReplayRendererConfig }) {
  const values = replaySceneValues(board, renderer.gameSlug, 10);
  const x = replayMetricPercent(board, ["x", "position", "progress"], 0.5, renderer.gameSlug === "lunar-lander" ? "signed" : "unit");
  const y = replayMetricPercent(board, ["y", "altitude"], 0.58, "unit");
  const speed = replayMetricPercent(board, ["speed", "velocity"], 0.48, "signed");
  const left = percent(12 + x * 76);
  const centerLeft = percent(18 + x * 64);

  if (renderer.gameSlug === "lunar-lander") {
    return (
      <div className="replay-native-scene replay-lunar-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-lunar-terrain" />
        <span className="replay-scene-goal replay-scene-goal-marker" style={{ left: "50%", bottom: "20%" }} />
        <span
          className="replay-scene-point replay-scene-lander"
          style={{ left, bottom: percent(32 + y * 45), transform: `translate(-50%, -50%) rotate(${(-16 + speed * 32).toFixed(1)}deg)` }}
        />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "car-racing") {
    return (
      <div className="replay-native-scene replay-car-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-car-road" />
        <span className="replay-car-lane replay-car-lane-top" />
        <span className="replay-car-lane replay-car-lane-bottom" />
        <span className="replay-scene-point replay-scene-car replay-race-car" style={{ left: centerLeft, top: percent(42 + Math.sin(x * Math.PI * 2) * 12) }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "bipedal-walker") {
    return (
      <div className="replay-native-scene replay-walker-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-walker-ground" />
        <span className="replay-scene-point replay-scene-walker" style={{ left, bottom: percent(32 + Math.sin(speed * Math.PI) * 5) }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "paddle-ball") {
    const ballLeft = percent(18 + ((x + speed) % 1) * 64);
    const ballTop = percent(24 + Math.abs(Math.sin((x + speed) * Math.PI)) * 38);
    return (
      <div className="replay-native-scene replay-paddle-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-paddle-net" />
        <span className="replay-scene-point replay-scene-ball" style={{ left: ballLeft, top: ballTop }} />
        <span className="replay-scene-point replay-scene-paddle" style={{ left, bottom: "18%" }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "alien-shooter") {
    return (
      <div className="replay-native-scene replay-alien-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-scene-point replay-scene-alien" style={{ left: percent(24 + x * 52), top: "28%" }} />
        <span className="replay-scene-point replay-scene-alien replay-scene-alien-alt" style={{ left: percent(62 - x * 30), top: "38%" }} />
        <span className="replay-scene-point replay-scene-shot" style={{ left, top: percent(42 + speed * 12) }} />
        <span className="replay-scene-point replay-scene-paddle" style={{ left, bottom: "16%" }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "boxing-style-arena") {
    return (
      <div className="replay-native-scene replay-boxing-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-boxing-ring" />
        <span className="replay-scene-point replay-scene-p1" style={{ left: percent(34 + x * 10), top: percent(50 + speed * 12) }}>A</span>
        <span className="replay-scene-point replay-scene-p2" style={{ left: percent(66 - x * 10), top: percent(50 - speed * 10) }}>B</span>
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  if (renderer.gameSlug === "ice-hockey-style-arena") {
    return (
      <div className="replay-native-scene replay-hockey-scene" data-scene-kind={renderer.gameSlug} aria-label={renderer.label}>
        <span className="replay-hockey-line replay-hockey-line-center" />
        <span className="replay-hockey-goal replay-hockey-goal-left" />
        <span className="replay-hockey-goal replay-hockey-goal-right" />
        <span className="replay-scene-point replay-scene-p1" style={{ left: "32%", top: percent(42 + speed * 18) }}>A</span>
        <span className="replay-scene-point replay-scene-p2" style={{ left: "68%", top: percent(58 - speed * 18) }}>B</span>
        <span className="replay-scene-point replay-scene-puck" style={{ left, top: percent(48 + Math.sin(x * Math.PI) * 16) }} />
        <ReplaySceneReadout values={values} />
      </div>
    );
  }

  return (
    <div className="replay-rl-scene" data-scene-kind={renderer.gameSlug}>
      <div className="replay-scene-stage">
        <span className="replay-scene-horizon" />
        <span className="replay-scene-agent" style={{ left }} />
        <span className="replay-scene-goal" />
      </div>
      <ReplaySceneReadout values={values} />
    </div>
  );
}

type ReplaySceneValue = {
  key: string;
  value: string;
};

function ReplaySceneReadout({ values }: { values: readonly ReplaySceneValue[] }) {
  if (values.length === 0) return null;
  return <div className="replay-scene-readout">{values.map((value) => <ReplaySceneMetric key={value.key} value={value.value} />)}</div>;
}

function ReplaySceneMetric({ value }: { value: string }) {
  return <span className="mono">{value}</span>;
}

type ReplayCellView = {
  key: string;
  className: string;
  label: string;
};

function replayCellView(gameSlug: string, index: number, cell: string, className: string): ReplayCellView {
  return {
    key: `${gameSlug}-${index}`,
    className,
    label: renderReplayCell(cell),
  };
}

function ReplayCell({ cell }: { cell: ReplayCellView }) {
  return <span className={cell.className} title={cell.label || undefined}>{cell.label}</span>;
}

function renderReplayCell(cell: string): string {
  if (!cell || cell === ".") return "";
  const label=cell.replace(/player_(\d+)/gu, "Player $1").replace(/\bx(\d+)/gu,"× $1");
  return label.charAt(0).toUpperCase()+label.slice(1);
}

function ticTacToeMark(cell: string): "X" | "O" | "" {
  if (/^(x|a|1|player_1)$/iu.test(cell)) return "X";
  if (/^(o|b|2|player_2)$/iu.test(cell)) return "O";
  return "";
}

function replayTrackActiveIndex(board: readonly string[], cols: number): number {
  const agentIndex = board.findIndex((cell) => /agent|taxi|car|player|lander|walker|paddle|puck|boxer|@/iu.test(cell));
  if (agentIndex >= 0) return Math.max(0, Math.min(cols - 1, agentIndex));
  const firstMarker = board.findIndex((cell) => cell && cell !== "." && !/goal|finish|target/iu.test(cell));
  return Math.max(0, Math.min(cols - 1, firstMarker >= 0 ? firstMarker : 0));
}

function replaySceneValues(board: readonly string[], gameSlug: string, limit: number): ReplaySceneValue[] {
  return board
    .map((value, slot) => {
      const label = value.trim();
      if (!isReplaySceneReadoutValue(label)) return null;
      return { key: `${gameSlug}-scene-${slot}-${label}`, value: label };
    })
    .filter((value): value is ReplaySceneValue => value !== null)
    .slice(0, limit);
}

function isReplaySceneReadoutValue(value: string): boolean {
  if (!value || value === ".") return false;
  return !/^(agent|taxi|car|player|lander|walker|paddle|puck|boxer|goal|target|finish|home|start)$/iu.test(value);
}

function replayMetricPercent(
  board: readonly string[],
  labels: readonly string[],
  fallback: number,
  mode: "signed" | "unit",
): number {
  const value = replayMetricNumber(board, labels);
  if (value === null) return fallback;
  if (mode === "signed") return clamp01((value + 1) / 2);
  if (value >= 0 && value <= 1) return value;
  if (value >= -1 && value <= 1) return clamp01((value + 1) / 2);
  if (value >= 0 && value <= 100) return value / 100;
  return fallback;
}

function replayMetricNumber(board: readonly string[], labels: readonly string[]): number | null {
  for (const cell of board) {
    for (const label of labels) {
      const match = new RegExp(`^${escapeRegExp(label)}\\s+(-?\\d+(?:\\.\\d+)?)`, "iu").exec(cell.trim());
      if (match) {
        const parsed = Number.parseFloat(match[1] ?? "");
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return null;
}

function percent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function chessTokenClass(cell: string): string {
  if (!cell) return "";
  return /[KQRBNP]/u.test(cell) ? "replay-token-light" : "replay-token-dark";
}

function stoneTokenClass(cell: string): string {
  if (/^(w|white|o|2)$/iu.test(cell)) return "replay-stone replay-stone-white";
  return "replay-stone replay-stone-black";
}

function discTokenClass(cell: string): string {
  if (/^(w|white|o|2)$/iu.test(cell)) return "replay-disc-white";
  return cell ? "replay-disc-black" : "";
}

function checkerTokenClass(cell: string): string {
  if (/^(r|red|1)$/iu.test(cell)) return "replay-checker-red";
  return cell ? "replay-checker-dark" : "";
}

function defaultTokenClass(cell: string): string {
  if (!cell) return "";
  if (/^(?:x|a|r|red|1|player_1)(?:\s+x\d+)?$/iu.test(cell) || /^\d+A$/u.test(cell)) return "replay-token-a";
  if (/^(?:o|b|y|yellow|blue|2|player_2)(?:\s+x\d+)?$/iu.test(cell) || /^\d+B$/u.test(cell)) return "replay-token-b";
  return "replay-token-neutral";
}

function battleshipTokenClass(cell: string): string {
  if (/hit|x/iu.test(cell)) return "replay-sea-hit";
  if (/miss|o|~/iu.test(cell)) return "replay-sea-miss";
  if (/ship|s/iu.test(cell)) return "replay-sea-ship";
  return cell ? "replay-sea-mark" : "";
}

function rlTokenClass(cell: string): string {
  if (/agent|taxi|car|player|a|@/iu.test(cell)) return "replay-rl-agent";
  if (/goal|target|g|finish|home/iu.test(cell)) return "replay-rl-goal";
  if (/hole|cliff|wall|ice|danger|x/iu.test(cell)) return "replay-rl-danger";
  return cell ? "replay-rl-mark" : "";
}

type ReplayCardView = {
  key: string;
  rank: string;
  suit: string;
  red: boolean;
};

function replayCardViews(board: readonly string[], count: number): ReplayCardView[] {
  const cards = board
    .map((value) => replayCardView(value))
    .filter((value): value is ReplayCardView => value !== null);
  return cards.slice(0, Math.max(3, count));
}

function replayPublicValueViews(board: readonly string[], metrics: ReadonlySet<string>): { value: string; key: string }[] {
  const counts = new Map<string, number>();
  const result: { value: string; key: string }[] = [];
  for (const raw of board) {
    const value = raw.trim();
    if (!value || replayCardView(value) || metrics.has(value)) continue;
    const occurrence = counts.get(value) ?? 0;
    counts.set(value, occurrence + 1);
    result.push({ value, key: `public-value:${value}:${occurrence}` });
    if (result.length === 48) break;
  }
  return result;
}

function replayCardMetrics(board: readonly string[]): string[] {
  const metrics: string[] = [];
  for (const rawValue of board) {
    const value = rawValue.trim();
    if (value.length > 0 && replayCardView(value) === null && /^(?:prize|round|street|pot|turn|phase|player_\d+\s+(?:stack|bet|hand|points|tricks))\s/iu.test(value)) {
      metrics.push(value);
    }
  }
  return metrics;
}

function replayCardMetricLabel(value: string): string {
  const seatMetric = /^player_(\d+)\s+(stack|bet|hand|points|tricks)\s+(.+)$/iu.exec(value);
  if (seatMetric) {
    return `Seat ${seatMetric[1]} · ${seatMetric[2]} ${seatMetric[3]}`;
  }
  const seatReference = /\bplayer_(\d+)\b/giu;
  const label = value
    .replace(seatReference, "Seat $1")
    .replaceAll("_", " ")
    .replace(/\s+/gu, " ")
    .trim();
  return label ? `${label[0]?.toUpperCase() ?? ""}${label.slice(1)}` : value;
}

function replayCardView(value: string): ReplayCardView | null {
  const label = value.trim();
  if (!label) return null;
  const compact = label.replace(/\s+/gu, "").toUpperCase();
  const match = /^(10|[2-9AJQK])([SHDC♠♥♦♣])$/u.exec(compact);
  if (!match) return null;
  const suit = replaySuitGlyph(match[2] ?? "");
  if (!suit) return null;
  return {
    key: `${match[1]}${suit}`,
    rank: match[1] ?? label,
    suit,
    red: suit === "♥" || suit === "♦",
  };
}

function replaySuitGlyph(value: string): string {
  if (value === "S" || value === "♠") return "♠";
  if (value === "H" || value === "♥") return "♥";
  if (value === "D" || value === "♦") return "♦";
  if (value === "C" || value === "♣") return "♣";
  return "";
}

function replayMatrixValues(board: readonly string[]): string[] {
  return board.filter(Boolean).slice(0, 4);
}
