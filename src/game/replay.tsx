"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { demonstrationFor, type Demonstration } from "./demos";
import { PositionDetails } from "./position-details";
import { LegalDemonstration } from "./scene";

function subscribeMotion(notify: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

import type { GameDesignId } from "./designs";

export type GameReplayProps = {
  readonly design?: GameDesignId;
  readonly game: string;
  readonly gameName: string;
  /** Public, already redacted frames only. Omit to inspect the bundled demonstration. */
  readonly demonstration?: Demonstration;
  /** Override the bundled variant caption for an authored study; null suppresses it. */
  readonly variantNote?: string | null;
};

/** Explicit, paused-by-default transport. Never interpolates or simulates an action. */
export function GameReplay(props: GameReplayProps) {
  const demo = props.demonstration ?? demonstrationFor(props.game);
  if (!demo || !demo.frames.length) return <p role="status">Replay unavailable</p>;
  return <ReplaySequence design={props.design} key={`${props.game}:${demo.version}`} game={props.game} gameName={props.gameName} demonstration={demo} variantNote={props.variantNote} />;
}

function ReplaySequence({ game, gameName, demonstration: demo, variantNote, design }: GameReplayProps & { readonly demonstration: Demonstration }) {
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
  useEffect(() => { setIndex(0); setPlaying(false); }, [demo]);
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);
  useEffect(() => {
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    if (host.current) observer.observe(host.current);
    return () => { document.removeEventListener("visibilitychange", hide); observer.disconnect(); };
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
