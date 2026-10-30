import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_ROOT = join(__dirname, "..");

const MODAL_SURFACES = Object.freeze([
  "arena/mobile-arena-direct-action-control.tsx",
  "arena/mobile-arena-exit-sheet.tsx",
  "arena/mobile-arena-game-sheet.tsx",
  "arena/mobile-arena-result-screen.tsx",
  "battlefield/mobile-battlefield-filter-sheet.tsx",
  "battlefield/mobile-battlefield-request-sheet.tsx",
  "ratings/mobile-human-rating-challenge-sheet.tsx",
]);

const BACKDROP_SURFACES = MODAL_SURFACES.filter((path) => (
  path !== "arena/mobile-arena-direct-action-control.tsx"
));

describe("native modal accessibility focus contract", () => {
  it("contains assistive technology and schedules deterministic focus on every surface", () => {
    for (const path of MODAL_SURFACES) {
      const source = readSource(path);
      expect(source).toContain("accessibilityViewIsModal");
      expect(source).toContain("scheduleMobileAccessibilityFocus");
      expect(source).toContain("onShow=");
    }
  });

  it("keeps dismiss backdrops touchable but outside the accessibility tree", () => {
    for (const path of BACKDROP_SURFACES) {
      const source = readSource(path);
      expect(source).toContain("accessibilityElementsHidden");
      expect(source).toContain("accessible={false}");
      expect(source).toContain("importantForAccessibility=\"no-hide-descendants\"");
    }
  });

  it("retains a visible in-sheet dismissal path on every dismissible surface", () => {
    const expectedTargets = Object.freeze({
      "arena/mobile-arena-direct-action-control.tsx": "Close legal moves",
      "arena/mobile-arena-exit-sheet.tsx": "Keep playing",
      "arena/mobile-arena-game-sheet.tsx": "Close game setup",
      "arena/mobile-arena-result-screen.tsx": "Close share card",
      "battlefield/mobile-battlefield-filter-sheet.tsx": "Close Battlefield filters",
      "battlefield/mobile-battlefield-request-sheet.tsx": "Close match request",
      "ratings/mobile-human-rating-challenge-sheet.tsx": "Close",
    });

    for (const [path, label] of Object.entries(expectedTargets)) {
      expect(readSource(path)).toContain(label);
    }
  });
});

function readSource(path: string): string {
  return readFileSync(join(SOURCE_ROOT, path), "utf8");
}
