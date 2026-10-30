export const MOBILE_BOARD_ZOOM_LEVELS = Object.freeze([1, 1.5, 2] as const);

export type MobileBoardZoomState = Readonly<{
  canZoomIn: boolean;
  canZoomOut: boolean;
  index: number;
  label: string;
  scale: number;
}>;

export function mobileBoardZoomState(index: number): MobileBoardZoomState {
  const boundedIndex = Math.max(0, Math.min(MOBILE_BOARD_ZOOM_LEVELS.length - 1, Math.round(index)));
  const scale = MOBILE_BOARD_ZOOM_LEVELS[boundedIndex] ?? 1;
  return Object.freeze({
    canZoomIn: boundedIndex < MOBILE_BOARD_ZOOM_LEVELS.length - 1,
    canZoomOut: boundedIndex > 0,
    index: boundedIndex,
    label: `${Math.round(scale * 100)} percent`,
    scale,
  });
}
