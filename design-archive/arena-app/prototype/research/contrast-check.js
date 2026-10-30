#!/usr/bin/env node
/* WCAG 2.x contrast check for the six eSlams themes.
   Reads the authoritative token source (assets/02-tokens/mobile-six-themes.ts) so nothing is retyped.
   Usage: node contrast-check.js [path/to/mobile-six-themes.ts] [--json]
   Reports only. It never edits a token. */
const fs = require('fs');
const path = require('path');

const SRC = process.argv.slice(2).find((a) => !a.startsWith('--')) ||
  path.resolve(__dirname, '../../assets/02-tokens/mobile-six-themes.ts');
const ts = fs.readFileSync(SRC, 'utf8');

/* ---- parse the six defineTheme({...}) blocks ---- */
const themes = {};
const re = /export const (\w+) = defineTheme\(\{([\s\S]*?)\n\}\);/g;
let m;
while ((m = re.exec(ts))) {
  const body = m[2];
  const id = /id:\s*"([^"]+)"/.exec(body)[1];
  const mode = /mode:\s*"([^"]+)"/.exec(body)[1];
  const colorBlock = /color:\s*\{([\s\S]*?)\n  \},/.exec(body)[1];
  const color = {};
  colorBlock.replace(/(\w+):\s*"([^"]+)"/g, (_, k, v) => { color[k] = v; });
  const materialBlock = /material:\s*\{([\s\S]*?)\n  \},/.exec(body)[1];
  const material = {};
  materialBlock.replace(/(\w+):\s*("([^"]*)"|true|false)/g, (_, k, raw, str) => { material[k] = str !== undefined ? str : raw === 'true'; });
  themes[id] = { id, mode, color, material };
}
const ORDER = ['classic-light', 'classic-dark', 'neon', 'club', 'arcade', 'midnight'];

/* ---- colour maths ---- */
function parse(c) {
  c = c.trim();
  if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1);
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  const n = /rgba?\(([^)]+)\)/.exec(c)[1].split(',').map((x) => parseFloat(x));
  return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
}
function over(fg, bg) { // composite fg (may have alpha) over opaque bg
  const f = parse(fg), b = parse(bg);
  return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 };
}
function lum(c) {
  const ch = [c.r, c.g, c.b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(fg, bg) {
  const B = parse(bg);
  const F = parse(fg).a < 1 ? over(fg, bg) : parse(fg);
  const l1 = lum(F), l2 = lum(B);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const r2 = (x) => Math.round(x * 100) / 100;

/* ---- checks per theme ---- */
const MARK_INK_OVERRIDE = { 'classic-light': '#1b32c4', 'classic-dark': '#1b32c4' }; // brief 6.2 and the request: Classic keeps brand blue
const out = {};
for (const id of ORDER) {
  const t = themes[id], c = t.color;
  const soft = (k) => hex(over(c[k], c.surface));          // a "-soft" tint composited on the surface
  const cardFace = t.material.cardFace.startsWith('#') ? t.material.cardFace : c.surface;
  const markInk = MARK_INK_OVERRIDE[id] || c.accent;
  out[id] = {
    mode: t.mode,
    // headline checks (AA text = 4.5)
    'text-3 on surface': r2(ratio(c.textTertiary, c.surface)),
    'text on bg': r2(ratio(c.text, c.background)),
    // supporting checks
    'text-3 on bg': r2(ratio(c.textTertiary, c.background)),
    'text-3 on surface-2': r2(ratio(c.textTertiary, c.surface2)),
    'text-3 on surface-3': r2(ratio(c.textTertiary, c.surface3)),
    'text-2 on surface': r2(ratio(c.textSecondary, c.surface)),
    'text on surface': r2(ratio(c.text, c.surface)),
    'text-on-accent on accent': r2(ratio(c.textOnAccent, c.accent)),
    'accent on bg (UI 3.0)': r2(ratio(c.accent, c.background)),
    'accent on surface (text 4.5)': r2(ratio(c.accent, c.surface)),
    'mark-ink on bg (UI 3.0)': r2(ratio(markInk, c.background)),
    'win on surface': r2(ratio(c.win, c.surface)),
    'win-text on surface': r2(ratio(c.winText, c.surface)),
    'loss on surface': r2(ratio(c.loss, c.surface)),
    'loss-text on surface': r2(ratio(c.lossText, c.surface)),
    'draw on surface': r2(ratio(c.draw, c.surface)),
    'draw-text on surface': r2(ratio(c.drawText, c.surface)),
    'win on win-soft': r2(ratio(c.win, soft('winSoft'))),
    'win-text on win-soft': r2(ratio(c.winText, soft('winSoft'))),
    'loss on loss-soft': r2(ratio(c.loss, soft('lossSoft'))),
    'loss-text on loss-soft': r2(ratio(c.lossText, soft('lossSoft'))),
    'draw on draw-soft': r2(ratio(c.draw, soft('drawSoft'))),
    'draw-text on draw-soft': r2(ratio(c.drawText, soft('drawSoft'))),
    'loss (red suit) on card face': r2(ratio(c.loss, cardFace)),
  };
}
out._extra = {
  'Classic Dark text-on-accent #ffffff (prototype tokens.css) on accent #647cff': r2(ratio('#ffffff', themes['classic-dark'].color.accent)),
  'Classic Dark text-on-accent #0b0b0d (mobile-six-themes.ts) on accent #647cff': r2(ratio('#0b0b0d', themes['classic-dark'].color.accent)),
  'Classic Dark accent #647cff on bg': r2(ratio('#647cff', themes['classic-dark'].color.background)),
  'Brand blue #1b32c4 on Classic Dark bg #0c0c0e': r2(ratio('#1b32c4', themes['classic-dark'].color.background)),
};

if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

const pad = (s, n) => String(s).padEnd(n);
const keys = Object.keys(out['classic-light']).filter((k) => k !== 'mode');
const need = (k) => (/UI 3\.0/.test(k) ? 3 : 4.5);
console.log('Source: ' + SRC + '\n');
console.log(pad('check (min 4.5 text, 3.0 UI)', 34) + ORDER.map((i) => pad(i, 14)).join(''));
for (const k of keys) {
  console.log(pad(k, 34) + ORDER.map((i) => { const v = out[i][k]; return pad(v + (v < need(k) ? ' FAIL' : ''), 14); }).join(''));
}
console.log('\nExtras');
for (const [k, v] of Object.entries(out._extra)) console.log('  ' + pad(v, 6) + k);
