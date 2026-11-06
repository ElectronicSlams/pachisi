import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Board } from "../src/board";
import type { CellBoardFrame } from "../src/board-types";
import { GameGlyph } from "../src/icons";

test("supplied match frames are rendered without changing their position or advancing a clock", () => {
  const frame: CellBoardFrame = Object.freeze({ kind: "cells", family: "grid_3x3", rows: 3, cols: 3,
    cells: Object.freeze(["O", ".", ".", ".", "X", ".", ".", ".", "."]), last: Object.freeze([4]) });
  const before = JSON.stringify(frame);
  const html = renderToStaticMarkup(createElement(Board, { frame, label: "Recorded turn 2" }));
  assert.equal((html.match(/class="st-xo st-xo-x"/gu) ?? []).length, 1);
  assert.equal((html.match(/class="st-xo st-xo-o"/gu) ?? []).length, 1);
  assert.match(html, /aria-label="Recorded turn 2"/u);
  assert.doesNotMatch(html, /game animation|data-preview-active/u);
  assert.equal(JSON.stringify(frame), before);
  assert.equal(renderToStaticMarkup(createElement(Board, { frame, label: "Recorded turn 2" })), html);
});

test("unknown and inherited-property identities use an honest category glyph", () => {
  for (const slug of ["unknown", "__proto__", "constructor"]) {
    const html = renderToStaticMarkup(createElement(GameGlyph, { slug, category: "Card" }));
    assert.match(html, /data-game-icon="unknown"/u);
    assert.doesNotMatch(html, /NaN|undefined/u);
  }
});
