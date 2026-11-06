type Member = { visible: boolean; paused: boolean; notify: (active: boolean) => void; active: boolean };
type Group = { readonly members: Map<symbol, Member>; owner: symbol | null };
const groups = new Map<string, Group>();

export const PREVIEW_VISIBILITY_THRESHOLD = 0.2;

/** Initial observer entries can intersect without crossing the configured threshold. */
export function isPreviewVisible(entry: Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio"> | undefined): boolean {
  return Boolean(entry?.isIntersecting && entry.intersectionRatio >= PREVIEW_VISIBILITY_THRESHOLD);
}

/**
 * Watches an element's visibility. Where `IntersectionObserver` is unavailable
 * (older WebViews, jsdom, server tests) the element counts as visible at once,
 * so previews still play instead of throwing. Returns a disconnect function.
 */
export function observePreviewVisibility(element: Element, onChange: (visible: boolean) => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onChange(true);
    return () => {};
  }
  const observer = new IntersectionObserver(([entry]) => onChange(isPreviewVisible(entry)), { threshold: PREVIEW_VISIBILITY_THRESHOLD });
  observer.observe(element);
  return () => observer.disconnect();
}

/*
 * Ownership semantics (one clock per group):
 * - The owner is the one member whose clock may run. It is notified active only
 *   while it is visible, not paused and the document is not hidden.
 * - Pausing (hover or focus) stops the owner's clock but keeps it the owner: no
 *   other member is woken, so hovering one card in a grid never starts a
 *   neighbour. Un-pausing resumes the same owner.
 * - Ownership moves only when the owner leaves the viewport, rotates (finished
 *   its cycle) or is disposed. The next owner is the first visible, unpaused
 *   member in rotation order.
 * - A hidden document stops every clock and keeps the owner.
 */
function publish(group: Group) {
  const hidden = typeof document !== "undefined" && document.hidden;
  let owner = group.owner === null ? undefined : group.members.get(group.owner);
  if (!owner || !owner.visible) {
    const next = Array.from(group.members.entries()).find(([, member]) => member.visible && !member.paused);
    group.owner = next ? next[0] : null;
    owner = next?.[1];
  }
  const running = owner && !owner.paused && !hidden ? owner : undefined;
  // Release the previous clock before starting the next one.
  for (const member of group.members.values()) {
    if (member !== running && member.active) { member.active = false; member.notify(false); }
  }
  if (running && !running.active) { running.active = true; running.notify(true); }
}

function visibilityChanged() { for (const group of groups.values()) publish(group); }

/** One clock owner per group. Completion rotates to the next visible demonstration. */
export function registerPreviewMotion(name: string, notify: (active: boolean) => void) {
  if (groups.size === 0 && typeof document !== "undefined") document.addEventListener("visibilitychange", visibilityChanged);
  const group = groups.get(name) ?? { members: new Map<symbol, Member>(), owner: null };
  groups.set(name, group);
  const key = Symbol(name);
  const member: Member = { visible: false, paused: false, active: false, notify };
  group.members.set(key, member);
  return {
    update(visible: boolean, paused: boolean) { member.visible = visible; member.paused = paused; publish(group); },
    rotate() {
      if (group.owner === key) group.owner = null;
      group.members.delete(key); group.members.set(key, member); publish(group);
    },
    dispose() {
      // Effects can re-register a still-mounted component. Clear its old active
      // state before another member wins, rather than leaving two clocks running.
      if (member.active) { member.active = false; member.notify(false); }
      if (group.owner === key) group.owner = null;
      group.members.delete(key);
      publish(group);
      if (group.members.size === 0) groups.delete(name);
      if (groups.size === 0 && typeof document !== "undefined") document.removeEventListener("visibilitychange", visibilityChanged);
    },
  };
}
