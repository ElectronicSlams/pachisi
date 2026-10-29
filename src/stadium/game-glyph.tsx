import { GameGlyph } from "../game/icons";
export { GameGlyph };

export function GameGlyphTile({ slug, size = 44 }: { readonly slug: string; readonly size?: number }) {
  return <span className="st-glyph-tile" style={{ width: size, height: size }}><GameGlyph slug={slug} size={Math.round(size * 0.5)} /></span>;
}
