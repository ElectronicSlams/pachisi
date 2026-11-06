import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Board } from '../dist/game/board.js';
import { drop, newRound, roundLabel } from '../catalogue/connect-four-round';

test('local Connect Four round has a short accessible name, not the 42 raw cells', () => {
  assert.equal(roundLabel(newRound()), 'Connect Four, Player 1 to drop, 0 moves');
  let round = newRound();
  for (const col of [3, 2, 3, 2, 3, 2]) round = drop(round, col);
  const label = roundLabel(round);
  assert.equal(label, 'Connect Four, Player 1 to drop, 6 moves');
  assert.equal(roundLabel(drop(newRound(), 0)), 'Connect Four, Player 2 to drop, 1 move');
  round = drop(round, 3);
  assert.equal(roundLabel(round), 'Connect Four, Player 1 wins, 7 moves');
  const html = renderToStaticMarkup(<Board frame={round.frame} label={label} />);
  assert.match(html, /aria-label="Connect Four, Player 1 to drop, 6 moves"/);
  assert.doesNotMatch(html, /aria-label="[^"]*\. \. \./);
  assert.ok(label.length < 60);
});
