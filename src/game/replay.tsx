"use client";

import { observePreviewVisibility } from "./motion";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { demonstrationFor, type Demonstration } from "./demos";
import { resolveGameDesign, type DesignIdFor, type GameDesignId } from "./designs";
import { PositionDetails } from "./position-details";
import { LegalDemonstration } from "./scene";

function subscribeMotion(notify: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

export type GameReplayProps<G extends string = string> = {
  /** A design the game offers; anything else warns once in development and renders the game's default. */
  readonly design?: DesignIdFor<G>;
  readonly game: G;
  readonly gameName: string;
  /** Public, already redacted frames only. Omit to inspect the bundled demonstration. */
  readonly demonstration?: Demonstration;
  /** Override the bundled variant caption for an authored study; null suppresses it. */
  readonly variantNote?: string | null;
};

function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}
/**
 * Identity of a replay trace by content, not object identity: a host that re-renders
 * with an equal but new `demonstration` object keeps the viewer's frame; a different
 * trace (game, version, length or any frame) starts again at frame 0.
 */
export function replayTraceKey(game: string, demo: Demonstration): string {
  return `${game}:${demo.version}:${demo.frames.length}:${fnv1a(JSON.stringify(demo.frames))}`;
}

/** Explicit, paused-by-default transport. Never interpolates or simulates an action. */
export function GameReplay<G extends string>(props: GameReplayProps<G>) {
  const demo = props.demonstration ?? demonstrationFor(props.game);
  // Hashing runs only when the host hands over a new object, not on every render.
  const traceKey = useMemo(() => demo ? replayTraceKey(props.game, demo) : "", [props.game, demo]);
  if (!demo || !demo.frames.length) return <p role="status">Replay unavailable</p>;
  return <ReplaySequence design={resolveGameDesign(props.game, props.design)} key={traceKey} game={props.game} gameName={props.gameName} demonstration={demo} variantNote={props.variantNote} />;
}

type SequenceProps = Omit<GameReplayProps, "design" | "demonstration"> & { readonly design: GameDesignId | undefined; readonly demonstration: Demonstration };
function ReplaySequence({ game, gameName, demonstration: demo, variantNote, design }: SequenceProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  const id = useId();
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const last = demo.frames.length - 1;
  const shown = Math.min(index, last);
  const frame = demo.frames[shown]!;
  // No reset effect on `demo`: the parent keys this component by replayTraceKey, so a
  // different trace remounts at frame 0 and an equal re-sent trace keeps its frame.
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    const stopObserving = host.current ? observePreviewVisibility(host.current, setVisible) : () => {};
    return () => { document.removeEventListener("visibilitychange", hide); stopObserving(); };
  }, []);
  useEffect(() => {
    if (!playing || reduced || !visible) return;
    if (shown === last) { setPlaying(false); return; }
    const delay = Number.isFinite(demo.delay) && demo.delay > 0 ? demo.delay : 900;
    const timer = window.setTimeout(() => setIndex(i => Math.min(i + 1, last)), Math.max(40, delay / speed));
    return () => window.clearTimeout(timer);
  }, [playing, reduced, visible, shown, last, demo.delay, speed]);
  function seek(value: number) { setPlaying(false); setIndex(Math.max(0, Math.min(last, value))); }
  return <div className="st-game-replay" ref={host} data-replay-game={game} data-replay-frame={shown} data-replay-playing={playing && !reduced && visible}>
    <div className="st-replay-board" role="img" aria-label={`${gameName}. Frame ${shown + 1} of ${last + 1}. ${frame.caption}${frame.terminal ? ". Complete" : ""}`}>
      <LegalDemonstration design={design} game={game} frame={frame} variantNote={variantNote} previous={shown ? demo.frames[shown - 1] : null} />
    </div>
    <div className="st-replay-transport" role="group" aria-label={`${gameName} replay controls`}>
      <button type="button" onClick={() => seek(0)} disabled={shown === 0}>First</button>
      <button type="button" onClick={() => seek(shown - 1)} disabled={shown === 0}>Previous</button>
      <button type="button" aria-pressed={playing} disabled={reduced || last === 0} onClick={() => { if (shown === last) setIndex(0); setPlaying(v => !v); }}>{playing ? "Pause" : shown === last ? "Replay" : "Play"}</button>
      <button type="button" onClick={() => seek(shown + 1)} disabled={shown === last}>Next</button>
      <button type="button" onClick={() => seek(last)} disabled={shown === last}>Last</button>
      <label>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[.25,.5,1,2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
    </div>
    <label className="st-replay-timeline" htmlFor={id}><span>Frame {shown + 1} / {last + 1}</span><input id={id} aria-label="Replay frame" type="range" min={0} max={last} step={1} value={shown} disabled={!last} onChange={e => seek(Number(e.target.value))} /></label>
    <p className="st-replay-status" aria-live={playing ? "off" : "polite"} aria-atomic="true">{shown ? frame.caption : "Initial position"}{!frame.terminal && shown === last ? " · End of excerpt" : ""}</p>
    <PositionDetails game={game} frame={frame}/>
    {reduced && <p className="st-replay-note">Reduced motion: use the frame controls to inspect each position.</p>}
  </div>;
}
