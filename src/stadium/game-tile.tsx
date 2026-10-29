import { Anchor as Link } from "../ui/anchor";
import { GameGlyph } from "../stadium/game-glyph";
import { gameVariantLabel } from "../lib/variant-label";

/**
 * The square game tile (brief §4.1): centred glyph tile, two-line-clamped
 * name, the variant token in mono. Never a difficulty, never a "top model".
 * A tile without `href` is inert (Coming soon); `active` adds the accent ring.
 */
export function GameTile({
  slug,
  name,
  variant,
  href,
  active = false,
  comingSoon = false,
  status,
  onSelect,
}: {
  readonly slug: string;
  readonly name: string;
  readonly variant: string;
  readonly href?: string;
  readonly active?: boolean;
  readonly comingSoon?: boolean;
  /** One quiet word on where the game is played ("Arena", "Battlefield"). */
  readonly status?: string;
  /** Client callers may select in place instead of navigating. */
  readonly onSelect?: () => void;
}) {
  const body = (
    <>
      <span className="st-glyph-tile"><GameGlyph slug={slug} size={22} /></span>
      <span className="st-tile-name">{name}</span>
      <span className="st-tile-variant mono">{gameVariantLabel(variant)}</span>
      {status ? <span className="st-tile-status">{status}</span> : null}
      {active ? <span className="st-tile-badge">Active</span> : comingSoon ? <span className="st-tile-badge st-tile-badge-soon">Coming soon</span> : null}
    </>
  );
  const className = `st-tile${active ? " st-tile-active" : ""}${comingSoon ? " st-tile-soon" : ""}`;
  if (comingSoon) return <div aria-disabled="true" className={className}>{body}</div>;
  if (onSelect) return <button aria-pressed={active} className={className} onClick={onSelect} type="button">{body}</button>;
  if (href) return <Link aria-current={active ? "true" : undefined} className={className} href={href} prefetch={false}>{body}</Link>;
  return <div className={className}>{body}</div>;
}
