"use client";

import { Anchor as Link } from "../ui/anchor";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FocusEvent, type ReactNode } from "react";
import { GameAnimation } from "../game/demo";
import { LegalDemonstration } from "../game/scene";
import { demonstrationFor } from "../game/demos";
const styles = {"boardArtwork": "pachisi-gs-boardArtwork", "boardDrift": "pachisi-gs-boardDrift", "boardLabel": "pachisi-gs-boardLabel", "boardLink": "pachisi-gs-boardLink", "boardParallax": "pachisi-gs-boardParallax", "boardPlacement": "pachisi-gs-boardPlacement", "chess": "pachisi-gs-chess", "connectFour": "pachisi-gs-connectFour", "floatingBoards": "pachisi-gs-floatingBoards", "go": "pachisi-gs-go", "hero": "pachisi-gs-hero", "hex": "pachisi-gs-hex", "idleArtwork": "pachisi-gs-idleArtwork", "space": "pachisi-gs-space", "starDrift": "pachisi-gs-starDrift", "starLayer": "pachisi-gs-starLayer", "starfield": "pachisi-gs-starfield", "starsFar": "pachisi-gs-starsFar", "starsMiddle": "pachisi-gs-starsMiddle", "starsNear": "pachisi-gs-starsNear"};

const boards = [
  { slug: "chess", name: "Chess", className: styles.chess },
  { slug: "hex", name: "Hex", className: styles.hex },
  { slug: "connect-four", name: "Connect Four", className: styles.connectFour },
  { slug: "go", name: "Go", className: styles.go },
] as const;
// Deterministic, bounded artwork. No canvas loop, textures, or live match requests.
function makeStars(count: number, seed: number, radius: number) {
  let value = seed;
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  return Array.from({ length: count }, () => ({ x: random() * 1440, y: random() * 900, r: radius * (.6 + random() * .8) }));
}
const starLayers = [
  { name: "far", className: styles.starsFar, stars: makeStars(560, 17, .7) },
  { name: "middle", className: styles.starsMiddle, stars: makeStars(192, 43, 1.2) },
  { name: "near", className: styles.starsNear, stars: makeStars(48, 89, 1.8) },
] as const;
function subscribeReducedMotion(notify: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
function revealFocusedBoard(event: FocusEvent<HTMLAnchorElement>) {
  const link = event.currentTarget;
  if (!link.matches(":focus-visible")) return;
  const dock = document.querySelector<HTMLElement>(".st-dock");
  if (!dock?.getClientRects().length) return;
  const board = link.getBoundingClientRect(), navigation = dock.getBoundingClientRect();
  if (board.top < 0 || board.bottom > navigation.top) link.scrollIntoView({ block: "center", behavior: "instant" });
}
export function GrandSlamsStage({ children, gameLinks, titleId }: { readonly children: ReactNode; readonly gameLinks: Readonly<Record<"chess" | "hex" | "connect-four" | "go", string>>; readonly titleId?: string }) {
  const root = useRef<HTMLElement>(null);
  const glowId = useId();
  const [visible, setVisible] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let intersecting = false;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = Boolean(entry?.isIntersecting); update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  useEffect(() => {
    const element = root.current;
    if (!element || reduced || !visible) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 901px)");
    let frame = 0, x = 0, y = 0;
    const apply = () => {
      frame = 0;
      element.style.setProperty("--scene-x", `${x}px`);
      element.style.setProperty("--scene-y", `${y}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(apply); };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType !== "mouse") return;
      const rect = element.getBoundingClientRect();
      x = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)) * 16;
      y = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)) * 12;
      schedule();
    };
    const reset = () => { x = 0; y = 0; schedule(); };
    element.addEventListener("pointermove", move, { passive: true });
    element.addEventListener("pointerleave", reset);
    finePointer.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      finePointer.removeEventListener("change", reset);
      element.style.removeProperty("--scene-x");
      element.style.removeProperty("--scene-y");
    };
  }, [reduced, visible]);
  const moving = !reduced;
  return (
    <section className={styles.hero} aria-labelledby={titleId} aria-label={titleId ? undefined : "Grand Slams"} ref={root} data-gs-stage="" data-motion-active={moving && visible} data-reduced-motion={reduced}>
      <div className={styles.space} aria-hidden="true">{starLayers.map(layer => <div className={`${styles.starLayer} ${layer.className}`} key={layer.name} data-gs-stars={layer.name}>
        <svg className={`${styles.starfield} ${styles.starDrift}`} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          {layer.name === "near" && <defs><radialGradient id={glowId}><stop stopColor="currentColor" stopOpacity=".28" /><stop offset=".35" stopColor="currentColor" stopOpacity=".1" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>}
          <g>{layer.stars.map((star, index) => layer.name === "near" ? <g key={index}>
            <circle cx={star.x} cy={star.y} r={star.r * 7} fill={`url(#${glowId})`} />
            <circle cx={star.x} cy={star.y} r={star.r} />
          </g> : <circle key={index} cx={star.x} cy={star.y} r={star.r} />)}</g>
        </svg>
      </div>)}</div>
      {children}
      <div className={styles.floatingBoards}>{boards.map((board) => {
        const demonstration = demonstrationFor(board.slug)!;
        return <div className={`${styles.boardPlacement} ${board.className}`} key={board.slug} data-gs-board={board.slug}><div className={styles.boardParallax}><div className={styles.boardDrift}>
          <Link className={`st-poster ${styles.boardLink}`} href={gameLinks[board.slug]} prefetch={false} aria-label={`Explore ${board.name}`} onFocus={revealFocusedBoard}>
            <div className={styles.boardArtwork} aria-hidden="true">{moving
              ? <><div className={styles.idleArtwork}><LegalDemonstration game={board.slug} frame={demonstration.frames.at(-1)!} /></div><GameAnimation game={board.slug} gameName={board.name} group="grand-slams-hero" presentation="event" /></>
              : <div className="st-game-animation"><LegalDemonstration game={board.slug} frame={demonstration.frames.at(-1)!} /></div>}
            </div>
            <span className={`${styles.boardLabel} mono`}>{board.name}<span aria-hidden="true">↗</span></span>
          </Link>
        </div></div></div>;
      })}</div>
    </section>
  );
}
