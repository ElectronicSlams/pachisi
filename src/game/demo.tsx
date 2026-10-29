"use client";

import React from "react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { LegalDemonstration } from "./scene";
import { GameGlyph } from "./icons";
import { demonstrationFor } from "./demos";
import { gameAnimationFor } from "./catalogue";
import { observePreviewVisibility, registerPreviewMotion } from "./motion";

function subscribeReducedMotion(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export type GamePresentation = "card" | "arena" | "arena-table" | "feature" | "event";
export type GameTypography = { readonly labels?: string; readonly pieces?: string };

export function GameAnimation({ game, gameName, size = "full", group = "game-detail", presentation = size === "mini" ? "card" : "feature", typography }: {
  readonly game: string; readonly gameName: string; readonly size?: "full" | "mini"; readonly group?: string; readonly presentation?: GamePresentation; readonly typography?: GameTypography;
}) {
  // Reset only this demonstration when the game changes, not the motion group.
  return <AnimationSequence key={game} game={game} gameName={gameName} size={size} group={group} presentation={presentation} {...(typography ? { typography } : {})} />;
}

function AnimationSequence({ game, gameName, size, group, presentation, typography }: {
  readonly game: string; readonly gameName: string; readonly size: "full" | "mini"; readonly group: string; readonly presentation: GamePresentation; readonly typography?: GameTypography;
}) {
  const animation = gameAnimationFor(game);
  const demonstration = demonstrationFor(game);
  const last = (demonstration?.frames.length ?? 1) - 1;
  const [frame, setFrame] = useState(0);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const motion = useRef<ReturnType<typeof registerPreviewMotion> | null>(null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  // Read through a ref so a reduced-motion toggle refreshes this member in place
  // instead of re-registering it, which would lose its rotation order.
  const reducedRef = useRef(reduced);
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!element || !animation) return;
    const member = registerPreviewMotion(group, setActive);
    motion.current = member;
    let visible = false;
    let hovered = false;
    let focused = false;
    const card = element.closest(".st-poster, .bf-poster") ?? element;
    const update = () => member.update(visible && !reducedRef.current, hovered || focused);
    refresh.current = update;
    focused = card.matches(":focus-within");
    const focusIn = () => { focused = true; update(); };
    const focusOut = (event: Event) => { focused = event instanceof FocusEvent && event.relatedTarget instanceof Node && card.contains(event.relatedTarget); update(); };
    const enter = () => { hovered = true; update(); };
    const leave = () => { hovered = false; update(); };
    const disconnect = observePreviewVisibility(element, (next) => { visible = next; update(); });
    card.addEventListener("mouseenter", enter);
    card.addEventListener("mouseleave", leave);
    card.addEventListener("focusin", focusIn);
    card.addEventListener("focusout", focusOut);
    return () => {
      disconnect(); member.dispose(); motion.current = null; refresh.current = null;
      card.removeEventListener("mouseenter", enter); card.removeEventListener("mouseleave", leave);
      card.removeEventListener("focusin", focusIn); card.removeEventListener("focusout", focusOut);
    };
  }, [animation, element, group]);

  useEffect(() => {
    reducedRef.current = reduced;
    refresh.current?.();
  }, [reduced]);

  useEffect(() => {
    if (!active || reduced) return;
    const timer = window.setTimeout(() => {
      if (frame >= last) { setFrame(0); motion.current?.rotate(); }
      else setFrame((current) => current + 1);
    }, frame >= last ? 2_000 : demonstration?.delay ?? 900);
    return () => window.clearTimeout(timer);
  }, [active, demonstration, frame, last, reduced]);

  const shown = reduced ? last : frame;
  const fontStyle = typography ? { "--game-font-label": typography.labels, "--game-font-piece": typography.pieces } as CSSProperties : undefined;
  return <div className={`st-game-animation st-game-animation-${size}`} role="img" aria-label={`${gameName} game animation`} ref={setElement} style={fontStyle} data-presentation={presentation}
    data-game-animation={game} data-preview-frame={shown} data-preview-active={active && !reduced}>
    {demonstration ? <LegalDemonstration externalSeats={presentation === "arena-table"} game={game} frame={demonstration.frames[shown] ?? demonstration.frames[0]!} previous={shown > 0 ? (demonstration.frames[shown - 1] ?? null) : null} /> : <GameGlyph slug="unknown-game" size={32} />}
  </div>;
}
