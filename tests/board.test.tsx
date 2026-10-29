import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Board } from '../dist/game/board.js';
import { observePreviewVisibility, registerPreviewMotion } from '../dist/game/motion.js';
import type { BoardFrame, CellBoardFamily, CellBoardFrame } from '../dist/game/board-types.js';

const html = (frame: BoardFrame, label?: string) => renderToStaticMarkup(<Board frame={frame} {...(label ? { label } : {})} />);
const count = (markup: string, pattern: RegExp) => (markup.match(pattern) || []).length;
const cellsFrame = (family: CellBoardFamily, rows: number, cols: number, cells: readonly string[], extra: Partial<CellBoardFrame> = {}): CellBoardFrame =>
 ({ kind: 'cells', family, rows, cols, cells, ...extra });
const isUnsupported = (markup: string, family: string) =>
 markup.includes('Unsupported board state') && markup.includes(`data-family="${family}"`) && markup.includes('st-board-placeholder');

test('Board treats "", whitespace and null-ish tokens as empty (review 2.1)', () => {
 const blank = (n: number, token: unknown) => Array.from({ length: n }, () => token) as string[];
 for (const token of ['', ' ', '\t', null, undefined, '.']) {
  const label = JSON.stringify(token) ?? 'undefined';
  assert.equal(count(html(cellsFrame('grid_3x3', 3, 3, blank(9, token))), /st-xo/g), 0, `grid ${label}`);
  assert.equal(count(html(cellsFrame('go_board', 9, 9, blank(81, token))), /st-go-stone/g), 0, `go ${label}`);
  assert.equal(count(html(cellsFrame('connect_four', 6, 7, blank(42, token))), /st-disc /g), 0, `c4 ${label}`);
  assert.equal(count(html(cellsFrame('square_board', 8, 8, blank(64, token), { chess: true })), /st-chess /g), 0, `chess ${label}`);
  assert.equal(count(html(cellsFrame('hex_board', 3, 3, blank(9, token))), /st-hex-[ab]"/g), 0, `hex ${label}`);
 }
});

test('Board reads explicit per-family token maps (review 2.2)', () => {
 const ttt = html(cellsFrame('grid_3x3', 3, 3, ['X', 'O', '.', '.', '', '.', '.', '.', '.']));
 assert.equal(count(ttt, /st-xo-x/g), 1); assert.equal(count(ttt, /st-xo-o/g), 1);
 const c4 = html(cellsFrame('connect_four', 1, 2, ['R', 'Y']));
 assert.equal(count(c4, /st-disc-a/g), 1); assert.equal(count(c4, /st-disc-b/g), 1);
 const othello = html(cellsFrame('square_board', 1, 2, ['B', 'W']));
 assert.equal(count(othello, /st-stone-black/g), 1); assert.equal(count(othello, /st-stone-white/g), 1);
 const checkers = html(cellsFrame('square_board', 1, 4, ['r', 'R', 'b', 'B']));
 assert.equal(count(checkers, /st-stone-white/g), 2, 'red men and kings are the light pieces');
 assert.equal(count(checkers, /st-stone-black/g), 2);
 assert.equal(count(checkers, /st-stone-king/g), 2);
 // "B" alone is an Othello disc unless the frame says checkers.
 assert.equal(count(html(cellsFrame('square_board', 1, 1, ['B'])), /st-stone-king/g), 0);
 assert.equal(count(html(cellsFrame('square_board', 1, 1, ['B'], { variant: 'checkers' })), /st-stone-black st-stone-king/g), 1);
 const chess = html(cellsFrame('square_board', 1, 2, ['K', 'p'], { chess: true }));
 assert.match(chess, /st-chess-white">♚/); assert.match(chess, /st-chess-black">♟/);
 const go = html(cellsFrame('go_board', 1, 2, ['B', 'W']));
 assert.equal(count(go, /st-go-black/g), 1); assert.equal(count(go, /st-go-white/g), 1);
 const hex = html(cellsFrame('hex_board', 1, 2, ['R', 'B']));
 assert.equal(count(hex, /st-hex st-hex-a"/g), 1); assert.equal(count(hex, /st-hex st-hex-b"/g), 1);
});

test('unknown tokens render the unsupported placeholder instead of guessing a side (review 2.2)', () => {
 const cases: [CellBoardFamily, string, Partial<CellBoardFrame>][] = [
  ['grid_3x3', 'x', {}], ['grid_3x3', 'R', {}], ['connect_four', 'X', {}], ['connect_four', 'r', {}],
  ['square_board', 'x', { chess: true }], ['square_board', 'W', { variant: 'checkers' }], ['square_board', 'r', { variant: 'discs' }],
  ['square_board', 'Q', {}], ['go_board', 'X', {}], ['go_board', 'b', {}], ['hex_board', 'W', {}], ['hex_board', 'x', {}],
 ];
 for (const [family, token, extra] of cases) {
  const markup = html(cellsFrame(family, 1, 2, [token, '.'], extra));
  assert.ok(isUnsupported(markup, family), `${family} ${token} ${JSON.stringify(extra)}: ${markup}`);
  assert.match(markup, /data-unsupported="token"/);
  assert.doesNotMatch(markup, /st-xo|st-disc|st-stone|st-chess|st-go-stone|st-hex/);
 }
 // Mixed disc and checkers tokens cannot be one game.
 assert.ok(isUnsupported(html(cellsFrame('square_board', 1, 2, ['W', 'r'])), 'square_board'));
 // A labelled unsupported board is still announced, as unsupported.
 assert.match(html(cellsFrame('grid_3x3', 1, 1, ['?']), 'Recorded turn'), /aria-label="Recorded turn: unsupported board state"/);
});

test('cell-count mismatches and invalid dimensions render the placeholder (review 2.6)', () => {
 const short = html(cellsFrame('grid_3x3', 3, 3, ['X', '.', '.', '.', '.']));
 assert.ok(isUnsupported(short, 'grid_3x3')); assert.match(short, /data-unsupported="cell-count"/); assert.equal(count(short, /st-cell/g), 0);
 assert.ok(isUnsupported(html(cellsFrame('go_board', 2, 2, Array(5).fill('.'))), 'go_board'));
 for (const [rows, cols] of [[0, 3], [-1, 3], [Number.NaN, 3], [Number.POSITIVE_INFINITY, 3], [2.5, 2], [3, 0]] as const) {
  const markup = html(cellsFrame('connect_four', rows, cols, []));
  assert.ok(isUnsupported(markup, 'connect_four'), `${rows}x${cols}`); assert.match(markup, /data-unsupported="dimensions"/);
 }
 const unknownFamily = html({ kind: 'cells', family: 'mancala' as CellBoardFamily, rows: 1, cols: 1, cells: ['.'] });
 assert.ok(isUnsupported(unknownFamily, 'mancala'));
});

test('Connect Four sets --drop to the rows the disc fell (review 2.4)', () => {
 const cells = Array(42).fill('.') as string[];
 cells[5 * 7 + 3] = 'R'; cells[0 * 7 + 1] = 'Y';
 const bottom = html(cellsFrame('connect_four', 6, 7, cells, { last: [5 * 7 + 3] }));
 assert.match(bottom, /data-last="true" style="--drop:6"/);
 const top = html(cellsFrame('connect_four', 6, 7, cells, { last: [1] }));
 assert.match(top, /data-last="true" style="--drop:1"/);
 assert.equal(count(top, /--drop/g), 1);
 // Only Connect Four falls.
 assert.doesNotMatch(html(cellsFrame('grid_3x3', 3, 3, ['X', '.', '.', '.', '.', '.', '.', '.', '.'], { last: [0] })), /--drop/);
});

test('Go draws separate row/col line counts and hoshi; square boards otherwise unchanged (review 2.5)', () => {
 const rect = html(cellsFrame('go_board', 5, 9, Array(45).fill('.')));
 assert.equal(count(rect, /<line/g), 14);
 assert.match(rect, /viewBox="0 0 9\.8 5\.8"/); assert.match(rect, /aspect-ratio:9\.8 \/ 5\.8/);
 assert.equal(count(rect, /<circle/g), 0);
 const stars = (n: number) => count(html(cellsFrame('go_board', n, n, Array(n * n).fill('.'))), /<circle/g);
 assert.equal(stars(9), 5); assert.equal(stars(13), 5); assert.equal(stars(19), 9); assert.equal(stars(15), 0); assert.equal(stars(7), 0);
 const square = html(cellsFrame('go_board', 9, 9, Array(81).fill('.')));
 assert.equal(count(square, /<line/g), 18); assert.match(square, /viewBox="0 0 9\.8 9\.8"/); assert.doesNotMatch(square, /style=/);
 assert.match(square, /<circle cx="4\.9" cy="4\.9" r="0\.11"/, 'tengen');
 // A stone at row 4, col 8 of a 5x9 board sits at the bottom-right intersection.
 const placed = Array(45).fill('.') as string[]; placed[44] = 'W';
 assert.match(html(cellsFrame('go_board', 5, 9, placed)), /cx="8\.9" cy="4\.9"/);
});

test('empty Hex corners carry both goal-edge tints (review 2.13)', () => {
 const markup = html(cellsFrame('hex_board', 3, 3, Array(9).fill('.')));
 assert.equal(count(markup, /st-hex-edge-ab/g), 4);
 assert.equal(count(markup, /st-hex-half st-hex-edge-a"/g), 4); assert.equal(count(markup, /st-hex-half st-hex-edge-b"/g), 4);
 assert.equal(count(markup, /st-hex-empty st-hex-edge-a"/g), 2); assert.equal(count(markup, /st-hex-empty st-hex-edge-b"/g), 2);
 const taken = Array(9).fill('.') as string[]; taken[0] = 'R';
 const occupied = html(cellsFrame('hex_board', 3, 3, taken));
 assert.equal(count(occupied, /st-hex-edge-ab/g), 3); assert.equal(count(occupied, /st-hex-half/g), 6);
});

test('a card table without a centre card draws an empty slot, not a captioned card back (review 2.11)', () => {
 const markup = html({ kind: 'cards', top: [null], bottom: ['AS'], played: { top: null, bottom: null }, centre: null });
 assert.doesNotMatch(markup, /next card/);
 assert.doesNotMatch(markup, /st-pcard-back st-pcard-centre/);
 assert.match(markup, /st-pcard st-pcard-slot st-pcard-centre/);
 assert.doesNotMatch(markup, /st-cards-caption/);
 const prize = html({ kind: 'cards', top: [], bottom: [], played: { top: null, bottom: null }, centre: { rank: 'K', caption: 'prize' } });
 assert.match(prize, /st-cards-caption mono">prize/);
});

test('hand card keys are stable as a hand shrinks from the front (review 2.12)', async () => {
 // Keys are not visible in static markup, so check the built key function: slots are
 // counted from the end of the hand and no longer include the hand size.
 const { readFile } = await import('node:fs/promises');
 const code = await readFile(new URL('../dist/game/board.js', import.meta.url), 'utf8');
 assert.match(code, /`\$\{side\}:\$\{handSize - slot\}`/);
 assert.doesNotMatch(code, /`\$\{side\}:\$\{handSize\}:\$\{slot\}`/);
 const after = html({ kind: 'cards', top: [], bottom: ['3S', '4S'], played: { top: null, bottom: '2S' }, centre: null });
 assert.match(after, /2S.*3S.*4S/s);
});

test('a paused owner keeps the clock and never wakes another member (review 2.14)', () => {
 const states = { a: [] as boolean[], b: [] as boolean[] };
 const a = registerPreviewMotion('board-test-hover', (active: boolean) => states.a.push(active));
 const b = registerPreviewMotion('board-test-hover', (active: boolean) => states.b.push(active));
 a.update(true, false); b.update(true, false);
 assert.deepEqual(states, { a: [true], b: [] });
 a.update(true, true); // hover A
 assert.deepEqual(states, { a: [true, false], b: [] }, 'A pauses; B stays asleep');
 b.update(true, false);
 assert.deepEqual(states.b, [], 'B still asleep while A is hovered');
 a.update(true, false); // leave A
 assert.deepEqual(states.a, [true, false, true]);
 a.rotate();
 assert.deepEqual(states, { a: [true, false, true, false], b: [true] }, 'completion hands over');
 b.update(false, false); // B scrolls away
 assert.deepEqual(states, { a: [true, false, true, false, true], b: [true, false] });
 a.dispose(); b.dispose();
});

test('reduced-motion style updates keep a member in rotation order (review 2.15)', () => {
 // GameAnimation now refreshes a member in place (update) on a reduced-motion toggle
 // instead of disposing and re-registering it, which moved it to the back of the rotation.
 const log: string[] = [];
 const make = (name: string) => registerPreviewMotion('board-test-rotation', (active: boolean) => { if (active) log.push(name); });
 const a = make('a'); const b = make('b'); const c = make('c');
 for (const member of [a, b, c]) member.update(true, false);
 a.rotate(); // order b, c, a
 c.update(false, false); c.update(true, false); // c toggles reduced motion on and off
 b.rotate(); // c is next, not a
 assert.deepEqual(log, ['a', 'b', 'c']);
 for (const member of [a, b, c]) member.dispose();
});

test('visibility falls back to visible without IntersectionObserver (review 2.15)', () => {
 assert.equal(typeof (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver, 'undefined');
 const seen: boolean[] = [];
 const disconnect = observePreviewVisibility({} as Element, (visible: boolean) => seen.push(visible));
 assert.deepEqual(seen, [true]);
 assert.doesNotThrow(disconnect);
});

test('orientation flips square, Go and Hex boards for the second seat only (review 2.12/3)', () => {
 const cells = Array(64).fill('.') as string[]; cells[56] = 'R'; cells[7] = 'k'; // a1 rook, h8 king
 const white = html(cellsFrame('square_board', 8, 8, cells, { chess: true }));
 const black = html(cellsFrame('square_board', 8, 8, cells, { chess: true, orientation: 'second-seat-bottom' }));
 const order = (markup: string) => [...markup.matchAll(/<span class="st-cell( st-cell-dark)?"[^>]*>(?:<span class="st-chess [^"]+">(.)<\/span>)?/g)].map((m) => `${m[1] ? 'd' : 'l'}${m[2] ?? ''}`);
 const w = order(white); const b = order(black);
 assert.equal(w.length, 64); assert.deepEqual(b, [...w].reverse());
 assert.equal(w[56], 'd♜', 'a1 dark, bottom-left for white'); assert.equal(b[7], 'd♜', 'a1 top-right for black');
 assert.equal(b[56], 'd♚', 'h8 dark, bottom-left for black');
 assert.match(black, /data-orientation="second-seat-bottom"/);
 // Gravity and 3x3 boards ignore orientation.
 const c4 = Array(42).fill('.') as string[]; c4[41] = 'R';
 assert.equal(html(cellsFrame('connect_four', 6, 7, c4, { orientation: 'second-seat-bottom' })), html(cellsFrame('connect_four', 6, 7, c4)));
 const go = Array(81).fill('.') as string[]; go[0] = 'B';
 assert.match(html(cellsFrame('go_board', 9, 9, go, { orientation: 'second-seat-bottom' })), /cx="8\.9" cy="8\.9"/);
 const hex = Array(9).fill('.') as string[]; hex[0] = 'R';
 const hexFlipped = html(cellsFrame('hex_board', 3, 3, hex, { orientation: 'second-seat-bottom' }));
 assert.match(hexFlipped, /data-orientation="second-seat-bottom"/);
 assert.notEqual(hexFlipped.match(/st-hex st-hex-a" points="([^"]+)"/)?.[1], html(cellsFrame('hex_board', 3, 3, hex)).match(/st-hex st-hex-a" points="([^"]+)"/)?.[1]);
});

test('check, coordinates, toMove and result render and are announced (review 2.17/3)', () => {
 const cells = Array(64).fill('.') as string[]; cells[4] = 'k'; cells[60] = 'K'; cells[12] = 'Q';
 const frame = cellsFrame('square_board', 8, 8, cells, { chess: true, check: [4], coordinates: true, toMove: 'Black' });
 const markup = html(frame);
 assert.equal(count(markup, /data-check="true"/g), 1);
 assert.equal(count(markup, /st-coord-rank/g), 8); assert.equal(count(markup, /st-coord-file/g), 8);
 assert.match(markup, /st-coord st-coord-rank mono">8</); assert.match(markup, /st-coord st-coord-file mono">h</);
 assert.match(markup, /role="img" aria-label="Chess board, 3 pieces\. Black to move"/);
 assert.match(markup, /data-to-move="Black"/); assert.match(markup, /st-board-status mono">Black to move</);
 const over = html({ ...frame, result: { winner: 'White', reason: 'checkmate' } }, 'Recorded final position');
 assert.match(over, /aria-label="Recorded final position\. White wins · checkmate"/); assert.match(over, /data-result="win"/);
 assert.doesNotMatch(over, /data-to-move/);
 assert.match(html({ ...frame, result: { winner: null, reason: 'stalemate' } }), /Draw · stalemate/);
 // Flipped coordinates follow the board: a8 sits at the bottom-right for black.
 const flipped = html({ ...frame, orientation: 'second-seat-bottom' });
 const ranks = [...flipped.matchAll(/st-coord-rank mono">(\d)/g)].map((m) => m[1]).join('');
 const files = [...flipped.matchAll(/st-coord-file mono">(\w)/g)].map((m) => m[1]).join('');
 assert.equal(ranks, '12345678'); assert.equal(files, 'hgfedcba');
 // Go coordinates skip I.
 const go = html(cellsFrame('go_board', 9, 9, Array(81).fill('.'), { coordinates: true }));
 assert.equal(count(go, /<text/g), 18); assert.doesNotMatch(go, />I</); assert.match(go, />J</);
 // Without the new fields a board stays decorative and unwrapped.
 const plain = html(cellsFrame('grid_3x3', 3, 3, Array(9).fill('.')));
 assert.match(plain, /aria-hidden="true"/); assert.doesNotMatch(plain, /figure|data-check|st-coord/);
});
