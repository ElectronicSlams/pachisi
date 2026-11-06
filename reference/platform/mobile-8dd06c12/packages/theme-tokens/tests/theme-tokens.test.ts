import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  ACCENT_CARRYING_ROLES,
  DEFAULT_THEME_PREFERENCE,
  parseStoredThemePreference,
  PRIMARY_ACCENT_TOKEN,
  renderThemeCss,
  renderThemeVisualSnapshot,
  resolveTheme,
  resolveThemePreference,
  RESULT_SEMANTIC_TEXT_TOKENS,
  RESULT_SEMANTIC_TOKENS,
  serializeThemePreference,
  THEME_IDS,
  THEME_LIST,
  THEME_PREFERENCE_STORAGE_KEY,
  THEME_TOKEN_SNAPSHOT_VERSION,
  THEMES,
  themeIdSchema,
  themePreferenceSchema,
  tokenNameSchema,
  TOKEN_NAMES,
} from "../src/index";

type Rgb = readonly [number, number, number];

function parseHex(value: string): Rgb {
  const match = /^#([0-9a-f]{6})$/iu.exec(value);
  assert.ok(match, `Expected a six-digit hex color, received ${value}`);
  const hex = match[1];
  assert.ok(hex);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(value: string): number {
  const channels = parseHex(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

function compositeRgba(value: string, background: string): string {
  const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/u.exec(
    value,
  );
  assert.ok(match, `Expected rgba(), received ${value}`);
  const foreground = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  const alpha = Number(match[4]);
  const base = parseHex(background);
  const channels = foreground.map((channel, index) =>
    Math.round(channel * alpha + base[index]! * (1 - alpha)),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hue(value: string): number {
  const [red, green, blue] = parseHex(value).map((channel) => channel / 255);
  const maximum = Math.max(red!, green!, blue!);
  const minimum = Math.min(red!, green!, blue!);
  const delta = maximum - minimum;
  if (delta === 0) return 0;
  let result: number;
  if (maximum === red) result = 60 * (((green! - blue!) / delta) % 6);
  else if (maximum === green) result = 60 * ((blue! - red!) / delta + 2);
  else result = 60 * ((red! - green!) / delta + 4);
  return result < 0 ? result + 360 : result;
}

function assertAa(foreground: string, background: string, label: string): void {
  const ratio = contrastRatio(foreground, background);
  assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(3)}:1 is below WCAG AA`);
}

describe("theme token contract", () => {
  it("exposes exactly six complete, deeply frozen themes", () => {
    assert.equal(THEME_LIST.length, 6);
    assert.deepEqual(THEME_LIST.map((theme) => theme.id), [...THEME_IDS]);
    assert.equal(Object.isFrozen(THEMES), true);
    assert.equal(Object.isFrozen(THEME_IDS), true);
    assert.equal(Object.isFrozen(TOKEN_NAMES), true);
    assert.equal(Object.isFrozen(themeIdSchema.values), true);
    assert.equal(Object.isFrozen(themePreferenceSchema.values), true);
    assert.equal(Object.isFrozen(tokenNameSchema.values), true);

    for (const theme of THEME_LIST) {
      assert.deepEqual(Object.keys(theme.color), [...TOKEN_NAMES]);
      assert.equal(Object.isFrozen(theme), true);
      assert.equal(Object.isFrozen(theme.color), true);
      assert.equal(Object.isFrozen(theme.ink), true);
      assert.equal(Object.isFrozen(theme.material), true);
      assert.equal(theme.ink.mark, theme.color.accent);
      assert.equal(theme.ink.pieceA, theme.color.pieceDark);
      assert.equal(theme.ink.pieceB, theme.color.pieceLight);
    }
  });

  it("provides strict runtime schemas for IDs, preferences, and token names", () => {
    assert.equal(themeIdSchema.parse("neon"), "neon");
    assert.equal(themePreferenceSchema.parse("system"), "system");
    assert.equal(tokenNameSchema.parse("boardBackground"), "boardBackground");
    assert.equal(themeIdSchema.is("system"), false);
    assert.equal(tokenNameSchema.is("not-a-token"), false);
    assert.throws(() => themePreferenceSchema.parse("sepia"), /ThemePreference must be/u);
  });
});

describe("accessibility and semantic integrity", () => {
  it("keeps all normal text roles AA on their intended base surfaces", () => {
    for (const theme of THEME_LIST) {
      for (const token of ["text", "textSecondary", "textTertiary"] as const) {
        for (const surface of ["background", "surface"] as const) {
          assertAa(
            theme.color[token],
            theme.color[surface],
            `${theme.id}.${token} on ${surface}`,
          );
        }
      }
      assertAa(
        theme.color.textOnAccent,
        theme.color.accent,
        `${theme.id}.textOnAccent on accent`,
      );
    }
  });

  it("keeps result text AA on base surfaces and canonical soft fills", () => {
    for (const theme of THEME_LIST) {
      for (const role of ["win", "loss", "draw"] as const) {
        const text = `${role}Text` as const;
        const soft = `${role}Soft` as const;
        for (const surface of ["background", "surface"] as const) {
          const base = theme.color[surface];
          assertAa(theme.color[text], base, `${theme.id}.${text} on ${surface}`);
          assertAa(
            theme.color[text],
            compositeRgba(theme.color[soft], base),
            `${theme.id}.${text} on ${soft}/${surface}`,
          );
        }
      }
    }
  });

  it("preserves the approved Classic Light and Club semantic swatches exactly", () => {
    assert.deepEqual(
      {
        win: THEMES["classic-light"].color.win,
        winSoft: THEMES["classic-light"].color.winSoft,
        loss: THEMES["classic-light"].color.loss,
        lossSoft: THEMES["classic-light"].color.lossSoft,
        draw: THEMES["classic-light"].color.draw,
        drawSoft: THEMES["classic-light"].color.drawSoft,
      },
      {
        win: "#1f8a4c",
        winSoft: "rgba(31, 138, 76, 0.10)",
        loss: "#c43d33",
        lossSoft: "rgba(196, 61, 51, 0.10)",
        draw: "#b0791b",
        drawSoft: "rgba(176, 121, 27, 0.12)",
      },
    );
    assert.deepEqual(
      {
        win: THEMES.club.color.win,
        winSoft: THEMES.club.color.winSoft,
        loss: THEMES.club.color.loss,
        lossSoft: THEMES.club.color.lossSoft,
        draw: THEMES.club.color.draw,
        drawSoft: THEMES.club.color.drawSoft,
      },
      {
        win: "#2e7d43",
        winSoft: "rgba(46, 125, 67, 0.11)",
        loss: "#b8442f",
        lossSoft: "rgba(184, 68, 47, 0.11)",
        draw: "#a2731c",
        drawSoft: "rgba(162, 115, 28, 0.13)",
      },
    );
  });

  it("keeps win green, loss red, and draw amber in every theme", () => {
    assert.deepEqual(RESULT_SEMANTIC_TOKENS, { win: "win", loss: "loss", draw: "draw" });
    assert.deepEqual(RESULT_SEMANTIC_TEXT_TOKENS, {
      win: "winText",
      loss: "lossText",
      draw: "drawText",
    });
    for (const theme of THEME_LIST) {
      const winHue = hue(theme.color.win);
      const lossHue = hue(theme.color.loss);
      const drawHue = hue(theme.color.draw);
      assert.ok(winHue >= 110 && winHue <= 165, `${theme.id}.win hue ${winHue}`);
      assert.ok(lossHue <= 18 || lossHue >= 345, `${theme.id}.loss hue ${lossHue}`);
      assert.ok(drawHue >= 30 && drawHue <= 50, `${theme.id}.draw hue ${drawHue}`);
      assert.notEqual(theme.color.win, theme.color.loss);
      assert.notEqual(theme.color.loss, theme.color.draw);
    }
  });

  it("has one primary accent and restricts glow to approved themes and roles", () => {
    assert.equal(PRIMARY_ACCENT_TOKEN, "accent");
    assert.deepEqual(ACCENT_CARRYING_ROLES, [
      "last-move",
      "active-seat",
      "active-dock",
      "result-sweep",
      "move-trail",
    ]);
    assert.equal(ACCENT_CARRYING_ROLES.some((role) => /win|loss|draw/u.test(role)), false);

    for (const theme of THEME_LIST) {
      const mayGlow = theme.id === "neon" || theme.id === "arcade";
      assert.equal(theme.material.glowBudget, mayGlow ? "accent-only" : "none");
      assert.equal(theme.material.accentGlow === "none", !mayGlow);
      assert.equal(theme.material.moveTrail, theme.id === "arcade");
      assert.equal(theme.ink.mark, theme.color[PRIMARY_ACCENT_TOKEN]);
    }
  });
});

describe("system resolution and installation-local persistence", () => {
  it("resolves system only to Classic and leaves manual choices untouched", () => {
    assert.equal(resolveThemePreference("system", "light"), "classic-light");
    assert.equal(resolveThemePreference("system", "dark"), "classic-dark");
    assert.equal(resolveThemePreference("system", null), "classic-light");
    assert.equal(resolveThemePreference("system", undefined), "classic-light");
    assert.equal(resolveThemePreference("neon", "light"), "neon");
    assert.equal(resolveThemePreference("club", "dark"), "club");
    assert.equal(resolveTheme("system", "dark"), THEMES["classic-dark"]);
  });

  it("round-trips a versioned preference without a platform storage dependency", () => {
    assert.equal(DEFAULT_THEME_PREFERENCE, "system");
    assert.equal(THEME_PREFERENCE_STORAGE_KEY, "eslams.theme-preference.v1");
    for (const preference of ["system", ...THEME_IDS] as const) {
      assert.equal(parseStoredThemePreference(serializeThemePreference(preference)), preference);
    }
    assert.equal(parseStoredThemePreference(null), null);
    assert.equal(parseStoredThemePreference("not json"), null);
    assert.equal(
      parseStoredThemePreference('{"schemaVersion":"eslams.theme-preference.v0","preference":"neon"}'),
      null,
    );
    assert.equal(
      parseStoredThemePreference('{"schemaVersion":"eslams.theme-preference.v1","preference":"sepia"}'),
      null,
    );
  });
});

describe("deterministic visual exports", () => {
  it("keeps the snapshot version and checked-in JSON stable", () => {
    assert.equal(THEME_TOKEN_SNAPSHOT_VERSION, "eslams.theme-tokens.v1");
    const checkedIn = readFileSync(new URL("../visual-snapshot.json", import.meta.url), "utf8");
    assert.equal(checkedIn, renderThemeVisualSnapshot());
  });

  it("keeps checked-in CSS synchronized with the typed source", () => {
    const checkedIn = readFileSync(new URL("../themes.css", import.meta.url), "utf8");
    assert.equal(checkedIn, renderThemeCss());
    for (const id of THEME_IDS) {
      assert.equal(checkedIn.split(`[data-eslams-theme="${id}"]`).length - 1, 1);
    }
  });
});
