import React from "react";
import type { CSSProperties, ReactNode } from "react";
import { describeBoardFrame } from "./board-adapter";
import type { BoardFrame, CardBoardFrame, CellBoardFamily, CellBoardFrame } from "./board-types";

/**
 * The shared stadium board (docs/design/stadium/IMPLEMENTATION.md). A pure,
 * server-renderable view of one frame: no state, no effects. Callers animate
 * by passing successive frames; the last-move cell re-mounts its piece, which
 * plays the one "arrive" beat (220 ms, 320 ms drop for Connect Four).
 *
 * Cell frames are read strictly: every token must belong to the family's token
 * map (see `CellBoardFrame.cells`). An unknown token, a cell-count mismatch or
 * invalid dimensions render the "Unsupported board state" placeholder rather
 * than guessing a side.
 */
export type BoardProps = {
  readonly frame: BoardFrame;
  /** "mini" tightens gaps for posters and tiles. */
  readonly size?: "full" | "mini";
  /**
   * When set the board is announced as an image with this label; otherwise it is
   * decorative, unless the frame carries `toMove` or `result`, which are always announced.
   */
  readonly label?: string;
  readonly className?: string;
};

type A11y = { readonly role: "img"; readonly "aria-label": string } | { readonly "aria-hidden": true };

/** The token vocabulary a cell board is read with. */
type PieceSet = "xo" | "connect_four" | "chess" | "discs" | "checkers" | "go" | "hex";

const PIECE_TOKENS: Readonly<Record<PieceSet, ReadonlySet<string>>> = {
  xo: new Set(["X", "O"]),
  connect_four: new Set(["R", "Y"]),
  chess: new Set(["K", "Q", "R", "B", "N", "P", "k", "q", "r", "b", "n", "p"]),
  discs: new Set(["B", "W"]),
  checkers: new Set(["r", "b", "R", "B"]),
  go: new Set(["B", "W"]),
  hex: new Set(["R", "B"]),
};

const FAMILY_NAMES: Readonly<Record<CellBoardFamily, string>> = {
  grid_3x3: "Grid",
  connect_four: "Connect Four",
  square_board: "Square",
  go_board: "Go",
  hex_board: "Hex",
};

const PIECE_SET_NAMES: Readonly<Partial<Record<PieceSet, string>>> = { chess: "Chess", checkers: "Checkers" };

const chessGlyphs: Readonly<Record<string, string>> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const squareFiles = "abcdefghijklmnopqrstuvwxyz";
/** Go column letters skip I. */
const goFiles = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export function Board({ frame, size = "full", label, className }: BoardProps) {
  const classes = (name: string) => `st-board ${name} st-board-${size}${className ? ` ${className}` : ""}`;

  if (frame.kind === "placeholder") {
    return (
      <div {...a11yFor(label)} className={classes("st-board-placeholder")} data-family={frame.family}>
        <span className="st-board-placeholder-label mono">{frame.label}</span>
      </div>
    );
  }
  if (frame.kind === "cards") return <CardTable {...a11yFor(label)} className={classes("st-board-cards")} frame={frame} />;

  const read = readCellBoard(frame);
  if ("unsupported" in read) {
    const family = typeof frame.family === "string" && frame.family.length > 0 ? frame.family : "unknown";
    return (
      <div {...a11yFor(label ? `${label}: unsupported board state` : undefined)} className={classes("st-board-placeholder")} data-family={family} data-unsupported={read.unsupported}>
        <span className="st-board-placeholder-label mono">{`Unsupported board state · ${family}`}</span>
      </div>
    );
  }

  const cells = read.frame;
  const status = statusText(cells);
  const description = status
    ? `${label ?? describeBoardFrame(cells, PIECE_SET_NAMES[read.pieces] ?? FAMILY_NAMES[cells.family])}. ${status}`
    : label;
  const a11y = a11yFor(description);
  const statusData: Pick<BoardRootProps, "data-to-move" | "data-result"> = {
    "data-to-move": cells.result ? undefined : cells.toMove ?? undefined,
    "data-result": cells.result ? (cells.result.winner === null ? "draw" : "win") : undefined,
  };

  let board: ReactNode;
  if (cells.family === "go_board") board = <GoBoard {...a11y} {...statusData} className={classes("st-board-go")} frame={cells} />;
  else if (cells.family === "hex_board") board = <HexBoard {...a11y} {...statusData} className={classes("st-board-hex")} frame={cells} />;
  else board = <GridBoard {...a11y} {...statusData} className={classes(gridFamilyClass(cells, read.pieces))} frame={cells} pieces={read.pieces} />;

  if (!status) return board;
  return (
    <figure className="st-board-figure">
      {board}
      <figcaption aria-hidden="true" className="st-board-status mono">{status}</figcaption>
    </figure>
  );
}

function a11yFor(label: string | undefined): A11y {
  return label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
}

/** "." and blank strings are empty; null/undefined can arrive from untyped hosts. */
function isEmptyToken(token: unknown): boolean {
  if (token === null || token === undefined) return true;
  if (typeof token !== "string") return false;
  const trimmed = token.trim();
  return trimmed === "" || trimmed === ".";
}

function isDimension(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function pieceSetFor(frame: CellBoardFrame, tokens: readonly string[]): PieceSet | null {
  switch (frame.family) {
    case "grid_3x3": return "xo";
    case "connect_four": return "connect_four";
    case "go_board": return "go";
    case "hex_board": return "hex";
    case "square_board": {
      if (frame.chess) return "chess";
      if (frame.variant === "checkers" || frame.variant === "discs") return frame.variant;
      // Inferred: "B" alone is a disc; any r, b or R means checkers.
      if (tokens.every((token) => PIECE_TOKENS.discs.has(token))) return "discs";
      return tokens.every((token) => PIECE_TOKENS.checkers.has(token)) ? "checkers" : "discs";
    }
    default: return null;
  }
}

/**
 * Validates a cell frame against its family and returns it with every empty
 * spelling normalised to ".", or the reason it cannot be drawn truthfully.
 */
function readCellBoard(frame: CellBoardFrame): { readonly frame: CellBoardFrame; readonly pieces: PieceSet } | { readonly unsupported: string } {
  if (!isDimension(frame.rows) || !isDimension(frame.cols)) return { unsupported: "dimensions" };
  const raw: unknown = frame.cells;
  if (!Array.isArray(raw) || raw.length !== frame.rows * frame.cols) return { unsupported: "cell-count" };
  const normalised: string[] = [];
  for (const token of raw as readonly unknown[]) {
    if (isEmptyToken(token)) normalised.push(".");
    else if (typeof token === "string") normalised.push(token);
    else return { unsupported: "token" };
  }
  const pieces = pieceSetFor(frame, normalised.filter((token) => token !== "."));
  if (pieces === null) return { unsupported: "family" };
  const allowed = PIECE_TOKENS[pieces];
  if (!normalised.every((token) => token === "." || allowed.has(token))) return { unsupported: "token" };
  return { frame: { ...frame, cells: normalised }, pieces };
}

function statusText(frame: CellBoardFrame): string | null {
  if (frame.result) {
    const outcome = frame.result.winner === null ? "Draw" : `${frame.result.winner} wins`;
    return frame.result.reason ? `${outcome} · ${frame.result.reason}` : outcome;
  }
  return typeof frame.toMove === "string" && frame.toMove.length > 0 ? `${frame.toMove} to move` : null;
}

function gridFamilyClass(frame: CellBoardFrame, pieces: PieceSet): string {
  if (frame.family === "grid_3x3") return "st-board-grid3";
  if (frame.family === "connect_four") return "st-board-c4";
  return pieces === "chess" ? "st-board-chess" : "st-board-discs";
}

/** Square, Go and Hex boards turn 180 degrees for the second seat; gravity and 3x3 boards never do. */
function isFlipped(frame: CellBoardFrame): boolean {
  return frame.orientation === "second-seat-bottom" && frame.family !== "grid_3x3" && frame.family !== "connect_four";
}

function cellKey(frame: CellBoardFrame, index: number): string {
  return `${frame.family}:${frame.rows}x${frame.cols}:${index}`;
}

type BoardRootProps = {
  readonly className: string;
  readonly role?: "img";
  readonly "aria-label"?: string;
  readonly "aria-hidden"?: true;
  readonly "data-to-move"?: string | undefined;
  readonly "data-result"?: "draw" | "win" | undefined;
};

function GridBoard({ frame, pieces, className, ...root }: BoardRootProps & { readonly frame: CellBoardFrame; readonly pieces: PieceSet }) {
  const last = new Set(frame.last ?? []);
  const line = new Set(frame.line ?? []);
  const check = new Set(frame.check ?? []);
  const flipped = isFlipped(frame);
  const coordinates = frame.coordinates === true && frame.family === "square_board";
  const count = frame.rows * frame.cols;
  const style = { "--rows": frame.rows, "--cols": frame.cols } as CSSProperties;

  return (
    <div {...root} className={className} data-family={frame.family} data-orientation={flipped ? "second-seat-bottom" : undefined} style={style}>
      {Array.from({ length: count }, (_, position) => {
        const index = flipped ? count - 1 - position : position;
        const token = frame.cells[index]!;
        const row = Math.floor(index / frame.cols);
        const column = index % frame.cols;
        const dark = pieces === "chess" && (row + column) % 2 === 1;
        const isLast = last.has(index);
        // Connect Four discs fall from above the top row to their resting row.
        const cellStyle = isLast && frame.family === "connect_four" ? ({ "--drop": row + 1 } as CSSProperties) : undefined;
        return (
          <span
            className={`st-cell${dark ? " st-cell-dark" : ""}`}
            data-check={check.has(index) || undefined}
            data-last={isLast || undefined}
            data-line={line.has(index) || undefined}
            key={cellKey(frame, index)}
            style={cellStyle}
          >
            {token === "." ? null : <Piece key={token} pieces={pieces} token={token} />}
            {coordinates && position % frame.cols === 0 ? <span aria-hidden="true" className="st-coord st-coord-rank mono">{frame.rows - row}</span> : null}
            {coordinates && position >= count - frame.cols ? <span aria-hidden="true" className="st-coord st-coord-file mono">{squareFiles[column] ?? String(column + 1)}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function Piece({ pieces, token }: { readonly pieces: PieceSet; readonly token: string }) {
  switch (pieces) {
    case "xo":
      return token === "X" ? (
        <svg className="st-xo st-xo-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round">
          <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
        </svg>
      ) : (
        <svg className="st-xo st-xo-o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.1">
          <circle cx="12" cy="12" r="7.6" />
        </svg>
      );
    case "connect_four":
      return <span className={`st-disc st-disc-${token === "R" ? "a" : "b"}`} />;
    case "chess": {
      const white = token === token.toUpperCase();
      return <span className={`st-chess ${white ? "st-chess-white" : "st-chess-black"}`}>{chessGlyphs[token.toLowerCase()]}</span>;
    }
    case "checkers": {
      // Matches the scene: red men are the light pieces; uppercase is a king.
      const colour = token.toLowerCase() === "r" ? "white" : "black";
      return <span className={`st-stone st-stone-${colour}${token === token.toUpperCase() ? " st-stone-king" : ""}`} />;
    }
    default:
      return <span className={`st-stone st-stone-${token === "W" ? "white" : "black"}`} />;
  }
}

type SvgBoardProps = BoardRootProps & { readonly frame: CellBoardFrame };

/** Star points for the standard square Go sizes; other sizes draw none. */
function hoshiPoints(rows: number, cols: number): readonly (readonly [number, number])[] {
  if (rows !== cols) return [];
  const edge = rows === 9 ? 2 : rows === 13 || rows === 19 ? 3 : null;
  if (edge === null) return [];
  const far = rows - 1 - edge;
  const mid = (rows - 1) / 2;
  const points: (readonly [number, number])[] = [[edge, edge], [edge, far], [far, edge], [far, far], [mid, mid]];
  if (rows === 19) points.push([edge, mid], [mid, edge], [mid, far], [far, mid]);
  return points;
}

function GoBoard({ frame, className, ...root }: SvgBoardProps) {
  const { rows, cols } = frame;
  const size = Math.max(rows, cols);
  const pad = size > 9 ? 0.7 : 0.9;
  const width = cols - 1 + pad * 2;
  const height = rows - 1 + pad * 2;
  const flipped = isFlipped(frame);
  const x = (column: number) => pad + (flipped ? cols - 1 - column : column);
  const y = (row: number) => pad + (flipped ? rows - 1 - row : row);
  const last = new Set(frame.last ?? []);
  const check = new Set(frame.check ?? []);
  const lines: ReactNode[] = [];
  for (let index = 0; index < size; index += 1) {
    if (index < rows) lines.push(<line key={`h${index}`} x1={pad} x2={pad + cols - 1} y1={pad + index} y2={pad + index} />);
    if (index < cols) lines.push(<line key={`v${index}`} y1={pad} y2={pad + rows - 1} x1={pad + index} x2={pad + index} />);
  }
  const hoshi = hoshiPoints(rows, cols);
  return (
    <svg
      {...root}
      className={className}
      data-family="go_board"
      data-orientation={flipped ? "second-seat-bottom" : undefined}
      style={rows === cols ? undefined : { aspectRatio: `${width} / ${height}` }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect className="st-go-bg" height={height} rx={0.35} width={width} />
      <g className="st-go-lines">{lines}</g>
      {hoshi.length > 0 ? (
        <g className="st-go-hoshi">
          {hoshi.map(([row, column]) => <circle cx={x(column)} cy={y(row)} key={`${row}:${column}`} r={rows > 9 ? 0.1 : 0.11} />)}
        </g>
      ) : null}
      {frame.coordinates ? (
        <g aria-hidden="true" className="st-go-coords">
          {Array.from({ length: cols }, (_, column) => (
            <text key={`f${column}`} textAnchor="middle" x={x(column)} y={height - pad * 0.28}>{goFiles[column] ?? String(column + 1)}</text>
          ))}
          {Array.from({ length: rows }, (_, row) => (
            <text dominantBaseline="central" key={`r${row}`} textAnchor="middle" x={pad * 0.4} y={y(row)}>{rows - row}</text>
          ))}
        </g>
      ) : null}
      {frame.cells.map((token, index) => {
        if (token === ".") return null;
        return (
          <circle
            className={`st-go-stone st-go-${token === "W" ? "white" : "black"}`}
            cx={x(index % cols)}
            cy={y(Math.floor(index / cols))}
            data-check={check.has(index) || undefined}
            data-last={last.has(index) || undefined}
            key={`${cellKey(frame, index)}:${token}`}
            r={0.44}
          />
        );
      })}
    </svg>
  );
}

const SQRT3 = Math.sqrt(3);

function hexCorner(cx: number, cy: number, radius: number, corner: number): string {
  const angle = (Math.PI / 180) * (60 * corner - 30);
  return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
}

function hexPoints(cx: number, cy: number, radius: number, corners: readonly number[] = [0, 1, 2, 3, 4, 5]): string {
  return corners.map((corner) => hexCorner(cx, cy, radius, corner)).join(" ");
}

/** Pointy-top halves split through the top and bottom corners. */
const HEX_LEFT_HALF = [4, 3, 2, 5] as const;
const HEX_RIGHT_HALF = [5, 0, 1, 2] as const;

function HexBoard({ frame, className, ...root }: SvgBoardProps) {
  const n = frame.cols;
  const width = n * SQRT3 + (frame.rows - 1) * (SQRT3 / 2);
  const height = (frame.rows - 1) * 1.5 + 2;
  const flipped = isFlipped(frame);
  const last = new Set(frame.last ?? []);
  const line = new Set(frame.line ?? []);
  const check = new Set(frame.check ?? []);
  return (
    <svg {...root} className={className} data-family="hex_board" data-orientation={flipped ? "second-seat-bottom" : undefined} style={{ aspectRatio: `${width.toFixed(2)} / ${height.toFixed(2)}` }} viewBox={`-0.2 -0.2 ${(width + 0.4).toFixed(2)} ${(height + 0.4).toFixed(2)}`}>
      {frame.cells.map((token, index) => {
        const row = Math.floor(index / n);
        const column = index % n;
        const shownRow = flipped ? frame.rows - 1 - row : row;
        const shownColumn = flipped ? n - 1 - column : column;
        const cx = shownColumn * SQRT3 + shownRow * (SQRT3 / 2) + SQRT3 / 2;
        const cy = shownRow * 1.5 + 1;
        const edgeA = row === 0 || row === frame.rows - 1;
        const edgeB = column === 0 || column === n - 1;
        // A corner cell touches both goal edges and is tinted half and half.
        const edge = edgeA && edgeB ? "ab" : edgeA ? "a" : edgeB ? "b" : "none";
        const empty = token !== "R" && token !== "B";
        const cell = (
          <polygon
            className={`st-hex st-hex-${token === "R" ? "a" : token === "B" ? "b" : `empty st-hex-edge-${edge}`}`}
            data-check={check.has(index) || undefined}
            data-last={last.has(index) || undefined}
            data-line={line.has(index) || undefined}
            key={cellKey(frame, index)}
            points={hexPoints(cx, cy, 0.94)}
          />
        );
        if (!empty || edge !== "ab") return cell;
        // The half nearer the left/right (b) goal edge takes b; the other half takes a.
        const bOnLeft = shownColumn === 0;
        return (
          <React.Fragment key={cellKey(frame, index)}>
            <polygon className="st-hex-half st-hex-edge-a" points={hexPoints(cx, cy, 0.94, bOnLeft ? HEX_RIGHT_HALF : HEX_LEFT_HALF)} />
            <polygon className="st-hex-half st-hex-edge-b" points={hexPoints(cx, cy, 0.94, bOnLeft ? HEX_LEFT_HALF : HEX_RIGHT_HALF)} />
            {cell}
          </React.Fragment>
        );
      })}
    </svg>
  );
}

type CardTableProps = {
  readonly frame: CardBoardFrame;
  readonly className: string;
  readonly role?: "img";
  readonly "aria-label"?: string;
  readonly "aria-hidden"?: true;
};

function CardTable({ frame, className, ...a11y }: CardTableProps) {
  return (
    <div {...a11y} className={className} data-family="card_table">
      <div className="st-cards-row">
        {frame.top.map((card, index) => <PlayingCard card={card} key={handCardKey("top", frame.top.length, index)} />)}
        <PlayingCard card={frame.played.top} played winner={frame.winner === "top"} />
      </div>
      <div className="st-cards-centre">
        {/* No centre card is an empty slot, never a face-down "next card". */}
        {frame.centre ? <PlayingCard card={frame.centre.rank} centre /> : <PlayingCard card={null} centre played />}
        {frame.centre ? <span className="st-cards-caption mono">{frame.centre.caption}</span> : null}
      </div>
      <div className="st-cards-row">
        <PlayingCard card={frame.played.bottom} played winner={frame.winner === "bottom"} />
        {frame.bottom.map((card, index) => <PlayingCard card={card} key={handCardKey("bottom", frame.bottom.length, index)} />)}
      </div>
    </div>
  );
}

/**
 * Hand slots are counted from the end of the hand. Hands shrink from the front
 * as cards are played, so a card keeps its key (and its DOM node) across plays.
 */
function handCardKey(side: "top" | "bottom", handSize: number, slot: number): string {
  return `${side}:${handSize - slot}`;
}

function PlayingCard({ card, played = false, centre = false, winner = false }: { readonly card: string | null; readonly played?: boolean; readonly centre?: boolean; readonly winner?: boolean }) {
  const state = card === null ? (played ? "st-pcard-slot" : "st-pcard-back") : "st-pcard-face";
  return (
    <span className={`st-pcard ${state}${centre ? " st-pcard-centre" : ""}`} data-last={winner || undefined}>
      {card === null ? null : <span className="mono">{card}</span>}
    </span>
  );
}
