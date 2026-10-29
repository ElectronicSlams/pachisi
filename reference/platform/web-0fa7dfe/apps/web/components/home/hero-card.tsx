"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Board } from "@/components/stadium/board";
import { GameGlyph } from "@/components/stadium/game-glyph";
import { ModelChip } from "@/components/stadium/model-chip";
import { Icon } from "@/components/ui/icon";
import type { HomeShowcaseGameSlug } from "@/lib/home-showcase";
import type { HeroMatch } from "@/lib/stadium/home-data";
import { HERO_RECORD_ORDER, recordFrame, stadiumRecord } from "@/lib/stadium/records";

const FINAL_FRAME_HOLD_MS = 2_000;
const gameNames: Readonly<Record<HomeShowcaseGameSlug, string>> = {
  "connect-four": "Connect Four",
  chess: "Chess",
  othello: "Othello",
  "tic-tac-toe": "Tic-Tac-Toe",
};

function subscribeReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * The locked home hero card (brief §4.1): plays the four recorded lines,
 * holds the final frame for two seconds, advances; hover or focus pauses;
 * reduced motion shows the final frame with controls disabled. When a real
 * match exists for the game, the header names its players and links to it.
 */
export function HeroCard({ matches }: { readonly matches: readonly HeroMatch[] }) {
  const [active, setActive] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const slug = HERO_RECORD_ORDER[active] ?? "chess";
  const record = stadiumRecord(slug);
  const finalFrame = record.frames.length - 1;
  const shown = reducedMotion ? finalFrame : frameIndex;
  const match = matches.find((candidate) => candidate.game === slug) ?? null;

  useEffect(() => {
    if (paused || !playing || reducedMotion) return;
    const atEnd = frameIndex >= finalFrame;
    const timer = window.setTimeout(() => {
      if (atEnd) {
        setActive((index) => (index + 1) % HERO_RECORD_ORDER.length);
        setFrameIndex(0);
      } else {
        setFrameIndex((index) => Math.min(finalFrame, index + 1));
      }
    }, atEnd ? FINAL_FRAME_HOLD_MS : record.delay);
    return () => window.clearTimeout(timer);
  }, [finalFrame, frameIndex, paused, playing, record.delay, reducedMotion]);

  return (
    <div
      aria-label="Featured games"
      aria-roledescription="carousel"
      className="home-hero-card"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocusCapture={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="home-hero-card-head">
        <span className={`home-hero-tag${match?.status === "live" ? " home-hero-tag-live" : ""}`}>
          {match?.status === "live" ? <span aria-hidden="true" className="st-live-dot" /> : <Icon name="play" size={11} />}
          {match?.status === "live" ? "Watch live" : match ? "Watch replay" : "Game animation"}
        </span>
        <Link className="st-link" href={match?.href ?? "/battlefield"} prefetch={false}>Battlefield <span aria-hidden="true">→</span></Link>
      </div>
      <div className="home-hero-players">
        {match ? (
          <>
            <ModelChip display="id" identity={match.a} size="sm" />
            <span className="st-vs mono">vs</span>
            <ModelChip display="id" identity={match.b} size="sm" />
          </>
        ) : <span className="st-muted">A recorded line, not a live match</span>}
      </div>
      <div className="home-hero-board">
        <Board frame={recordFrame(record, shown)} label={`${gameNames[slug]} game animation, move ${shown} of ${finalFrame}`} />
      </div>
      <div className="home-hero-controls">
        <button
          aria-label={reducedMotion ? "Animation paused for reduced motion" : playing ? "Pause game animation" : "Play game animation"}
          className="home-hero-play"
          disabled={reducedMotion}
          onClick={() => {
            if (!playing && frameIndex >= finalFrame) setFrameIndex(0);
            setPlaying((value) => !value);
          }}
          type="button"
        >
          <Icon name={playing && !reducedMotion ? "pause" : "play"} size={13} />
        </button>
        <span className="home-hero-move mono">{record.labels[shown] ?? "·"}</span>
        <input
          aria-label={`${gameNames[slug]} animation frame`}
          className="home-hero-scrub"
          disabled={reducedMotion}
          max={finalFrame}
          min={0}
          onChange={(event) => {
            setPlaying(false);
            setFrameIndex(Number(event.target.value));
          }}
          type="range"
          value={shown}
        />
        <span className="home-hero-count mono">{shown} / {finalFrame}</span>
      </div>
      <div className="home-hero-foot">
        <span className="home-hero-game"><GameGlyph size={14} slug={slug} /> {gameNames[slug]}</span>
        <span className="home-hero-dots">
          {HERO_RECORD_ORDER.map((candidate, index) => (
            <button
              aria-label={`Show ${gameNames[candidate]}`}
              aria-pressed={index === active}
              className={`home-hero-dot${index === active ? " home-hero-dot-on" : ""}`}
              key={candidate}
              onClick={() => {
                setActive(index);
                setFrameIndex(0);
              }}
              type="button"
            />
          ))}
        </span>
      </div>
    </div>
  );
}
