import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GAME_DEMONSTRATIONS } from '../dist/game/demos.js';
import type { DemonstrationFrame } from '../dist/game/demos.js';
import { LegalDemonstration } from '../dist/game/scene.js';
import {
 arenaBoardCellActionFromAction, arenaBoardMoveFromAction, arenaBoardSquareToCell, describeArenaAction, type ArenaLegalAction,
} from '../dist/game/interactions.js';

const UTTT = { slug: 'ultimate-tic-tac-toe' } as const;
const action = (token: string, label = ''): ArenaLegalAction => ({ token, label });
const frame = (state: unknown): DemonstrationFrame =>
 ({ state, caption: 'P1 · move', turn: 1, terminal: false, outcomeReason: null }) as DemonstrationFrame;

/** The row-major index of every rendered Board cell whose markup matches `pattern`. */
function renderedCellIndexes(html: string, pattern: RegExp): number[] {
 const cells = html.split(/<span class="st-cell[" ]/u).slice(1);
 assert.equal(cells.length, 81, 'the scene renders a 9x9 grid');
 return cells.flatMap((markup, index) => (pattern.test(markup) ? [index] : []));
}

/** Core's ultimate tic-tac-toe state with one X at `subBoard`, `localCell`. */
function singleMark(subBoard: number, localCell: number) {
 const boards = Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, l) => (b === subBoard && l === localCell ? 'X' : null)));
 return { boards, local_status: Array.from({ length: 9 }, () => null), next_board: null };
}

test('F1: all 81 ultimate tic-tac-toe actions target the cell the scene draws for that move', () => {
 const seen = new Map<number, string>();
 for (let token = 0; token < 81; token += 1) {
  const subBoard = Math.floor(token / 9), localCell = token % 9;
  // Re-derived by rendering the real scene, not by repeating its constants.
  const html = renderToStaticMarkup(<LegalDemonstration game="ultimate-tic-tac-toe" frame={frame(singleMark(subBoard, localCell))} />);
  const drawn = renderedCellIndexes(html, /st-xo-x/u);
  assert.equal(drawn.length, 1, `token ${token} draws one mark`);
  const target = arenaBoardCellActionFromAction(UTTT, action(String(token)), 9, 9);
  assert.ok(target, `token ${token} has a target`);
  assert.equal(target.index, drawn[0], `token ${token}: index`);
  assert.deepEqual([target.row, target.col], [Math.floor(drawn[0]! / 9), drawn[0]! % 9], `token ${token}: row/col`);
  assert.equal(target.token, String(token), `token ${token}: original action token is preserved`);
  assert.equal(seen.has(target.index), false, `token ${token}: no two actions share a cell`);
  seen.set(target.index, target.token);
 }
 assert.equal(seen.size, 81);
 // Round trip: each visible cell maps back to exactly the Core action token rendered there.
 for (let index = 0; index < 81; index += 1) {
  const row = Math.floor(index / 9), col = index % 9;
  const subBoard = Math.floor(row / 3) * 3 + Math.floor(col / 3), localCell = (row % 3) * 3 + (col % 3);
  assert.equal(seen.get(index), String(subBoard * 9 + localCell), `cell ${row},${col}`);
 }
 // The review's example: action 9 is sub-board 1, local 0 → visible row 0, column 3.
 assert.deepEqual(arenaBoardCellActionFromAction(UTTT, action('9'), 9, 9), { token: '9', index: 3, row: 0, col: 3, label: 'Row 1, column 4' });
});

test('F1: ultimate tic-tac-toe targets agree with the scene last-move cue across the bundled demo', () => {
 const demo = GAME_DEMONSTRATIONS['ultimate-tic-tac-toe']!;
 for (let i = 1; i < demo.frames.length; i += 1) {
  const html = renderToStaticMarkup(<LegalDemonstration game="ultimate-tic-tac-toe" frame={demo.frames[i]!} previous={demo.frames[i - 1]!} />);
  const target = arenaBoardCellActionFromAction(UTTT, action(String(demo.actions[i - 1]!.action)), 9, 9);
  assert.deepEqual(renderedCellIndexes(html, /data-last="true"/u), [target?.index], `frame ${i}`);
 }
});

test('F1: ultimate tic-tac-toe rejects out-of-range actions and non-9x9 geometry', () => {
 for (const token of ['81', '-1', '4.5', 'x']) assert.equal(arenaBoardCellActionFromAction(UTTT, action(token), 9, 9), null, token);
 assert.equal(arenaBoardCellActionFromAction(UTTT, action('9'), 3, 27), null);
 assert.equal(arenaBoardCellActionFromAction(UTTT, action(' 9 '), 9, 9)?.token, ' 9 ');
 // Other index games are unchanged (row-major).
 assert.deepEqual(arenaBoardCellActionFromAction({ slug: 'go' }, action('9'), 9, 9), { token: '9', index: 9, row: 1, col: 0, label: 'Row 2, column 1' });
});

/** Each move's from/to squares, located on the Core board, must match the cells that change between demo frames. */
function assertMovesMatchDemo(slug: 'shogi' | 'xiangqi') {
 const demo = GAME_DEMONSTRATIONS[slug]!;
 let parsed = 0;
 for (const [i, entry] of demo.actions.entries()) {
  const token = String(entry.action);
  const move = arenaBoardMoveFromAction({ slug }, action(token));
  assert.ok(move, `${slug} ${token} parses`);
  assert.equal(move.token, token);
  parsed += 1;
  const before = demo.frames[i]!.state.board as (string | null)[][], after = demo.frames[i + 1]!.state.board as (string | null)[][];
  const from = arenaBoardSquareToCell({ slug }, move.from), to = arenaBoardSquareToCell({ slug }, move.to);
  assert.ok(from && to, `${slug} ${token} squares map to cells`);
  assert.notEqual(before[from.row]![from.col], null, `${slug} ${token}: a piece starts on ${move.from}`);
  assert.equal(after[from.row]![from.col], null, `${slug} ${token}: ${move.from} is vacated`);
  assert.notEqual(after[to.row]![to.col], before[to.row]![to.col], `${slug} ${token}: ${move.to} changes`);
 }
 return parsed;
}

test('F4: every bundled Shogi and Xiangqi action parses and lands on the squares the demo changes', () => {
 assert.equal(assertMovesMatchDemo('shogi'), 12);
 assert.equal(assertMovesMatchDemo('xiangqi'), 12);
 assert.equal(GAME_DEMONSTRATIONS.shogi!.actions.length, 12);
 assert.equal(GAME_DEMONSTRATIONS.xiangqi!.actions.length, 12);
 // Chess demo frames carry a FEN, so only parsing is checked there.
 for (const entry of GAME_DEMONSTRATIONS.chess!.actions) assert.ok(arenaBoardMoveFromAction({ slug: 'chess' }, action(String(entry.action))), String(entry.action));
});

test('F4: Shogi grammar: USI moves, promotion and drops; files right to left, ranks a-i', () => {
 const shogi = { slug: 'shogi' } as const;
 assert.deepEqual(arenaBoardMoveFromAction(shogi, action('1g1f')), { token: '1g1f', from: '1g', to: '1f', promotion: null });
 assert.deepEqual(arenaBoardMoveFromAction(shogi, action('1c1a+')), { token: '1c1a+', from: '1c', to: '1a', promotion: '+' });
 assert.deepEqual(arenaBoardMoveFromAction(shogi, action('P*5e')), { token: 'P*5e', from: 'P*', to: '5e', promotion: null, drop: 'P' });
 for (const token of ['0a1a', '1j1i', 'a1a2', '1g1g', 'K*5e', 'P*5j', '1c1a=', 'e2e4', '1g1f++']) assert.equal(arenaBoardMoveFromAction(shogi, action(token)), null, token);
 assert.deepEqual(arenaBoardSquareToCell(shogi, '1a'), { row: 0, col: 8 });
 assert.deepEqual(arenaBoardSquareToCell(shogi, '9i'), { row: 8, col: 0 });
 assert.equal(arenaBoardSquareToCell(shogi, 'P*'), null);
 const game = { slug: 'shogi', category: 'Board' } as const;
 assert.deepEqual(describeArenaAction(game, action('1c1a+')), { token: '1c1a+', label: 'Move 1c to 1a, promote', shortLabel: '1c-1a+', hint: 'Select this legal move.', kind: 'board' });
 assert.equal(describeArenaAction(game, action('P*5e')).label, 'Drop P on 5e');
});

test('F4: Xiangqi grammar: files a-i, ranks 0-9 with rank 0 as the top row', () => {
 const xiangqi = { slug: 'xiangqi' } as const;
 assert.deepEqual(arenaBoardMoveFromAction(xiangqi, action('a0a1')), { token: 'a0a1', from: 'a0', to: 'a1', promotion: null });
 assert.deepEqual(arenaBoardMoveFromAction(xiangqi, action('b0a2')), { token: 'b0a2', from: 'b0', to: 'a2', promotion: null });
 for (const token of ['j0j1', 'a0a10', 'a0a0', 'a0a1q', '1g1f']) assert.equal(arenaBoardMoveFromAction(xiangqi, action(token)), null, token);
 assert.deepEqual(arenaBoardSquareToCell(xiangqi, 'a0'), { row: 0, col: 0 });
 assert.deepEqual(arenaBoardSquareToCell(xiangqi, 'i9'), { row: 9, col: 8 });
 assert.equal(describeArenaAction({ slug: 'xiangqi', category: 'Board' }, action('a0a1')).label, 'Move a0 to a1');
});

test('F4: chess parsing is unchanged', () => {
 const chess = { slug: 'chess' } as const;
 assert.deepEqual(arenaBoardMoveFromAction(chess, action('e2e4')), { token: 'e2e4', from: 'e2', to: 'e4', promotion: null });
 assert.deepEqual(arenaBoardMoveFromAction(chess, action('e7-e8q')), { token: 'e7-e8q', from: 'e7', to: 'e8', promotion: 'q' });
 assert.deepEqual(arenaBoardMoveFromAction(chess, action('E7 E8Q')), { token: 'E7 E8Q', from: 'e7', to: 'e8', promotion: 'q' });
 // The chess grammar keeps its historical a-i/1-9 range.
 assert.deepEqual(arenaBoardMoveFromAction(chess, action('i9a1')), { token: 'i9a1', from: 'i9', to: 'a1', promotion: null });
 for (const token of ['a0a1', '1g1f', 'P*5e']) assert.equal(arenaBoardMoveFromAction(chess, action(token)), null, token);
 assert.deepEqual(arenaBoardSquareToCell(chess, 'a8'), { row: 0, col: 0 });
 assert.deepEqual(arenaBoardSquareToCell(chess, 'h1'), { row: 7, col: 7 });
 assert.deepEqual(describeArenaAction({ slug: 'chess', category: 'Board' }, action('e7e8q')), { token: 'e7e8q', label: 'Move e7 to e8, promote to Q', shortLabel: 'e7-e8=Q', hint: 'Select this legal move.', kind: 'board' });
 assert.equal(arenaBoardMoveFromAction({ slug: 'go' }, action('e2e4')), null);
});
