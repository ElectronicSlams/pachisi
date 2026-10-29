type Member = { visible: boolean; paused: boolean; notify: (active: boolean) => void; active: boolean };
const groups = new Map<string, Map<symbol, Member>>();

export const PREVIEW_VISIBILITY_THRESHOLD = 0.2;

/** Initial observer entries can intersect without crossing the configured threshold. */
export function isPreviewVisible(entry: Pick<IntersectionObserverEntry, "isIntersecting" | "intersectionRatio"> | undefined): boolean {
  return Boolean(entry?.isIntersecting && entry.intersectionRatio >= PREVIEW_VISIBILITY_THRESHOLD);
}

function publish(group: Map<symbol, Member>) {
  const hidden = typeof document !== "undefined" && document.hidden;
  const winner = hidden ? undefined : Array.from(group.values()).find((member) => member.visible && !member.paused);
  // Release the previous owner before waking the next one.
  for (const member of group.values()) {
    if (member !== winner && member.active) { member.active = false; member.notify(false); }
  }
  if (winner && !winner.active) { winner.active = true; winner.notify(true); }
}

function visibilityChanged() { for (const group of groups.values()) publish(group); }

/** One clock owner per group. Completion rotates to the next visible demonstration. */
export function registerPreviewMotion(name: string, notify: (active: boolean) => void) {
  if (groups.size === 0 && typeof document !== "undefined") document.addEventListener("visibilitychange", visibilityChanged);
  const group = groups.get(name) ?? new Map<symbol, Member>();
  groups.set(name, group);
  const key = Symbol(name);
  const member: Member = { visible: false, paused: false, active: false, notify };
  group.set(key, member);
  return {
    update(visible: boolean, paused: boolean) { member.visible = visible; member.paused = paused; publish(group); },
    rotate() { group.delete(key); group.set(key, member); publish(group); },
    dispose() {
      // Effects can re-register a still-mounted component. Clear its old active
      // state before another member wins, rather than leaving two clocks running.
      if (member.active) { member.active = false; member.notify(false); }
      group.delete(key);
      publish(group);
      if (group.size === 0) groups.delete(name);
      if (groups.size === 0 && typeof document !== "undefined") document.removeEventListener("visibilitychange", visibilityChanged);
    },
  };
}
