import type { GameRendererFamily } from "@eslams/core-types";

export type MobileArenaStageBoardSize = Readonly<{
  height: number;
  width: number;
}>;

export function mobileArenaStageBoardSize(
  viewportWidth: number,
  viewportHeight: number,
  rendererFamily: GameRendererFamily | null,
): MobileArenaStageBoardSize {
  const safeWidth = finitePositive(viewportWidth, 390);
  const safeHeight = finitePositive(viewportHeight, 844);
  const landscape = safeWidth > safeHeight;
  const compact = safeWidth < 390;
  const horizontalInset = compact ? 32 : 40;
  const availableWidth = Math.max(1, safeWidth - horizontalInset);
  const cardTable = rendererFamily === "card_table";
  const maximumWidth = cardTable
    ? safeWidth >= 700 ? 680 : 520
    : safeWidth >= 700 ? 560 : 420;
  const width = Math.max(1, Math.round(Math.min(maximumWidth, availableWidth)));
  const targetRatio = cardTable
    ? landscape ? 0.62 : 0.78
    : landscape ? 0.72 : 330 / 354;
  const reservedChrome = landscape ? 220 : 300;
  const availableHeight = Math.max(180, safeHeight - reservedChrome);
  const maximumHeight = cardTable ? 530 : 520;
  const height = Math.max(180, Math.round(Math.min(width * targetRatio, availableHeight, maximumHeight)));
  return Object.freeze({ height, width });
}

function finitePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
