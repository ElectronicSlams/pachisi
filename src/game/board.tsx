import React from "react";
import type { CSSProperties, ReactNode } from "react";
import type { BoardFrame, CardBoardFrame, CellBoardFrame } from "./board-types";

/**
 * The shared stadium board (docs/design/stadium/IMPLEMENTATION.md). A pure,
 * server-renderable view of one frame: no state, no effects. Callers animate
 * by passing successive frames; the last-move cell re-mounts its piece, which
 * plays the one "arrive" beat (220 ms, 320 ms drop for Connect Four).
 */
export type BoardProps = {
  readonly frame: BoardFrame;
  /** "mini" tightens gaps for posters and tiles. */
  readonly size?: "full" | "mini";
  /** When set the board is announced as an image with this label; otherwise it is decorative. */
  readonly label?: string;
  readonly className?: string;
};

const chessGlyphs: Readonly<Record<string, string>> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

export function Board({ frame, size = "full", label, className }: BoardProps) {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  const classes = (name: string) => `st-board ${name} st-board-${size}${className ? ` ${className}` : ""}`;

  if (frame.kind === "placeholder") {
    return (
      <div {...a11y} className={classes("st-board-placeholder")} data-family={frame.family}>
        <span className="st-board-placeholder-label mono">{frame.label}</span>
      </div>
    );
  }
  if (frame.kind === "cards") return <CardTable {...a11y} className={classes("st-board-cards")} frame={frame} />;
  if (frame.family === "go_board") return <GoBoard {...a11y} className={classes("st-board-go")} frame={frame} />;
  if (frame.family === "hex_board") return <HexBoard {...a11y} className={classes("st-board-hex")} frame={frame} />;

  const familyClass = frame.family === "grid_3x3"
    ? "st-board-grid3"
    : frame.family === "connect_four"
      ? "st-board-c4"
      : frame.chess
        ? "st-board-chess"
        : "st-board-discs";
  const last = new Set(frame.last ?? []);
  const line = new Set(frame.line ?? []);
  const style = { "--rows": frame.rows, "--cols": frame.cols } as CSSProperties;

  return (
    <div {...a11y} className={classes(familyClass)} data-family={frame.family} style={style}>
      {frame.cells.map((token, index) => {
        const row = Math.floor(index / frame.cols);
        const column = index % frame.cols;
        const dark = frame.family === "square_board" && frame.chess && (row + column) % 2 === 1;
        return (
          <span
            className={`st-cell${dark ? " st-cell-dark" : ""}`}
            data-last={last.has(index) || undefined}
            data-line={line.has(index) || undefined}
            key={cellKey(frame, index)}
          >
            {token === "." ? null : <Piece frame={frame} key={token} token={token} />}
          </span>
        );
      })}
    </div>
  );
}

function cellKey(frame: CellBoardFrame, index: number): string {
  return `${frame.family}:${frame.rows}x${frame.cols}:${index}`;
}

function Piece({ frame, token }: { readonly frame: CellBoardFrame; readonly token: string }) {
  if (frame.family === "grid_3x3") {
    return token === "X" ? (
      <svg className="st-xo st-xo-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round">
        <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
      </svg>
    ) : (
      <svg className="st-xo st-xo-o" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.1">
        <circle cx="12" cy="12" r="7.6" />
      </svg>
    );
  }
  if (frame.family === "connect_four") return <span className={`st-disc st-disc-${token === "R" ? "a" : "b"}`} />;
  if (frame.chess) {
    const white = token === token.toUpperCase();
    return <span className={`st-chess ${white ? "st-chess-white" : "st-chess-black"}`}>{chessGlyphs[token.toLowerCase()] ?? ""}</span>;
  }
  return <span className={`st-stone st-stone-${token === "W" ? "white" : "black"}`} />;
}

type SvgBoardProps = {
  readonly frame: CellBoardFrame;
  readonly className: string;
  readonly role?: "img";
  readonly "aria-label"?: string;
  readonly "aria-hidden"?: true;
};

function GoBoard({ frame, className, ...a11y }: SvgBoardProps) {
  const size = Math.max(frame.rows, frame.cols);
  const pad = size > 9 ? 0.7 : 0.9;
  const span = size - 1 + pad * 2;
  const last = new Set(frame.last ?? []);
  const lines: ReactNode[] = [];
  for (let index = 0; index < size; index += 1) {
    lines.push(<line key={`h${index}`} x1={pad} x2={pad + size - 1} y1={pad + index} y2={pad + index} />);
    lines.push(<line key={`v${index}`} y1={pad} y2={pad + size - 1} x1={pad + index} x2={pad + index} />);
  }
  return (
    <svg {...a11y} className={className} data-family="go_board" viewBox={`0 0 ${span} ${span}`}>
      <rect className="st-go-bg" height={span} rx={0.35} width={span} />
      <g className="st-go-lines">{lines}</g>
      {frame.cells.map((token, index) => {
        if (token === ".") return null;
        const cx = pad + (index % frame.cols);
        const cy = pad + Math.floor(index / frame.cols);
        return (
          <circle
            className={`st-go-stone st-go-${token === "W" ? "white" : "black"}`}
            cx={cx}
            cy={cy}
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

function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, corner) => {
    const angle = (Math.PI / 180) * (60 * corner - 30);
    return `${(cx + radius * Math.cos(angle)).toFixed(3)},${(cy + radius * Math.sin(angle)).toFixed(3)}`;
  }).join(" ");
}

function HexBoard({ frame, className, ...a11y }: SvgBoardProps) {
  const n = frame.cols;
  const width = n * SQRT3 + (frame.rows - 1) * (SQRT3 / 2);
  const height = (frame.rows - 1) * 1.5 + 2;
  const last = new Set(frame.last ?? []);
  const line = new Set(frame.line ?? []);
  return (
    <svg {...a11y} className={className} data-family="hex_board" style={{ aspectRatio: `${width.toFixed(2)} / ${height.toFixed(2)}` }} viewBox={`-0.2 -0.2 ${(width + 0.4).toFixed(2)} ${(height + 0.4).toFixed(2)}`}>
      {frame.cells.map((token, index) => {
        const row = Math.floor(index / n);
        const column = index % n;
        const cx = column * SQRT3 + row * (SQRT3 / 2) + SQRT3 / 2;
        const cy = row * 1.5 + 1;
        const edge = row === 0 || row === frame.rows - 1 ? "a" : column === 0 || column === n - 1 ? "b" : "none";
        return (
          <polygon
            className={`st-hex st-hex-${token === "R" ? "a" : token === "B" ? "b" : `empty st-hex-edge-${edge}`}`}
            data-last={last.has(index) || undefined}
            data-line={line.has(index) || undefined}
            key={cellKey(frame, index)}
            points={hexPoints(cx, cy, 0.94)}
          />
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
        {frame.centre ? <PlayingCard card={frame.centre.rank} centre /> : <PlayingCard card={null} centre />}
        <span className="st-cards-caption mono">{frame.centre?.caption ?? "next card"}</span>
      </div>
      <div className="st-cards-row">
        <PlayingCard card={frame.played.bottom} played winner={frame.winner === "bottom"} />
        {frame.bottom.map((card, index) => <PlayingCard card={card} key={handCardKey("bottom", frame.bottom.length, index)} />)}
      </div>
    </div>
  );
}

/** Hand slots are positional: a hand only ever shrinks from the front as cards are played. */
function handCardKey(side: "top" | "bottom", handSize: number, slot: number): string {
  return `${side}:${handSize}:${slot}`;
}

function PlayingCard({ card, played = false, centre = false, winner = false }: { readonly card: string | null; readonly played?: boolean; readonly centre?: boolean; readonly winner?: boolean }) {
  const state = card === null ? (played ? "st-pcard-slot" : "st-pcard-back") : "st-pcard-face";
  return (
    <span className={`st-pcard ${state}${centre ? " st-pcard-centre" : ""}`} data-last={winner || undefined}>
      {card === null ? null : <span className="mono">{card}</span>}
    </span>
  );
}
