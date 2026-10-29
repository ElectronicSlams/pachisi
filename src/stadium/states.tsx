import { Anchor as Link } from "../ui/anchor";
import type { ReactNode } from "react";
import { GameGlyph } from "../stadium/game-glyph";
import { Icon, type IconName } from "../ui/icon";

type StateAction = { readonly label: string; readonly href: string };

/**
 * The canonical calm empty card (brief §7.2, §11.6): glyph tile, one plain
 * sentence, grey copy, at most one quiet link. Never a spinner.
 */
export function EmptyState({
  title,
  children,
  action,
  icon = "layers",
  game,
  headingLevel = 2,
}: {
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: StateAction;
  readonly icon?: IconName;
  /** Show a game glyph instead of an icon. */
  readonly game?: string;
  readonly headingLevel?: 1 | 2 | 3;
}) {
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="st-state">
      <span aria-hidden="true" className="st-glyph-tile">{game ? <GameGlyph slug={game} size={22} /> : <Icon name={icon} size={20} />}</span>
      <Heading className="st-state-title">{title}</Heading>
      {children ? <p className="st-state-copy">{children}</p> : null}
      {action ? <Link className="st-link" href={action.href} prefetch={false}>{action.label} <span aria-hidden="true">→</span></Link> : null}
    </div>
  );
}

/** A designed failure: plain reason and a next action, never a bare error code. */
export function ErrorState({ title, children, action, retry, headingLevel = 2 }: {
  readonly title: string;
  readonly headingLevel?: 1 | 2;
  readonly children?: ReactNode;
  readonly action?: StateAction;
  readonly retry?: ReactNode;
}) {
  return (
    <div className="st-state st-state-error" role="alert">
      <span aria-hidden="true" className="st-glyph-tile"><Icon name="refresh" size={20} /></span>
      {headingLevel === 1 ? <h1 className="st-state-title">{title}</h1> : <h2 className="st-state-title">{title}</h2>}
      {children ? <p className="st-state-copy">{children}</p> : null}
      <div className="st-state-actions">
        {retry}
        {action ? <Link className="btn btn-secondary btn-md" href={action.href} prefetch={false}>{action.label}</Link> : null}
      </div>
    </div>
  );
}
