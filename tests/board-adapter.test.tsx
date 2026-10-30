import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Board } from '../dist/game/board.js';
import {
 boardFrameFromCells, boardFrameFromCellsWithIssues, boardFrameFromDisplayFrame, cardFrameFromRecord, describeBoardFrame,
 emptyBoardFrame, isCellBoardFamily, normalizeCellToken, placeholderFrame,
} from '../dist/game/board-adapter.js';
import {
 arenaBoardCellActionFromAction, arenaBoardMoveFromAction, arenaRlControlSlotFromAction, arenaSideLabelForGame,
 arenaSideOptionsForGame, describeArenaAction, type ArenaCategory, type ArenaGameLike, type ArenaLegalAction,
} from '../dist/game/interactions.js';
import { DISPLAY_FRAME_VERSION, PUBLIC_STATE_VERSION, RENDERER_VERSION, RENDER_ADAPTER_VERSION, adaptPublicStateToDisplayFrame, buildSceneEnvelope, parseDisplayFrame, type DisplayCell, type DisplayFrameV1 } from '../dist/contract/index.js';
import { GAME_ANIMATIONS } from '../dist/game/catalogue.js';
import { GAME_DEMONSTRATIONS } from '../dist/game/demos.js';
import { LegalDemonstration } from '../dist/game/scene.js';

const TTT = { family: 'grid_3x3', rows: 3, cols: 3, name: 'Tic-Tac-Toe' } as const;
const C4 = { family: 'connect_four', rows: 6, cols: 7, name: 'Connect Four' } as const;
const CHESS = { family: 'square_board', rows: 8, cols: 8, chess: true, name: 'Chess' } as const;

// Ported from eSlamsPlatform@0fa7dfe apps/web/tests/stadium-primitives.test.ts ("stadium board frames"), with explicit geometry.
test('normalises cell tokens per family; every empty spelling becomes "."', () => {
 assert.equal(normalizeCellToken('grid_3x3', 'player_1'), 'X');
 assert.equal(normalizeCellToken('grid_3x3', 'O'), 'O');
 assert.equal(normalizeCellToken('connect_four', 'X'), 'R');
 assert.equal(normalizeCellToken('connect_four', 'Y'), 'Y');
 assert.equal(normalizeCellToken('hex_board', 'B'), 'B');
 assert.equal(normalizeCellToken('square_board', 'W'), 'W');
 assert.equal(normalizeCellToken('square_board', 'b', true), 'b');
 assert.equal(normalizeCellToken('square_board', '♛', true), 'q');
 assert.equal(normalizeCellToken('square_board', 'r', false, 'checkers'), 'r');
 assert.equal(normalizeCellToken('square_board', 'B', false, 'checkers'), 'B');
 assert.equal(normalizeCellToken('square_board', 'w', false, 'checkers'), '.');
 assert.equal(normalizeCellToken('square_board', 'r'), 'B');
 for (const empty of [null, undefined, '', ' ', '.', '-', '_']) assert.equal(normalizeCellToken('go_board', empty), '.', String(empty));
});

test('builds frames only when the supplied geometry fits', () => {
 const frame = boardFrameFromCells(TTT, [null, null, null, null, 'X', null, null, null, 'O'], { last: [8] });
 assert.equal(frame.kind, 'cells');
 assert.equal(frame.kind === 'cells' && frame.cells.join(''), '....X...O');
 assert.deepEqual(frame.kind === 'cells' && frame.last, [8]);
 assert.equal(boardFrameFromCells(TTT, ['X']).kind, 'placeholder');
 const dice = boardFrameFromCells({ family: 'dice_table', rows: 0, cols: 0, name: "Liar's Dice" }, []);
 assert.deepEqual(dice, { kind: 'placeholder', family: 'dice_table', label: "Liar's Dice" });
 assert.equal(boardFrameFromCells(CHESS, Array.from({ length: 64 }, () => '.')).kind, 'cells');
 assert.equal(placeholderFrame('control_benchmark', 'CartPole').family, 'control_benchmark');
 const empty = emptyBoardFrame(C4);
 assert.equal(empty.kind === 'cells' && empty.cells.length, 42);
 assert.equal(emptyBoardFrame({ family: 'payoff_matrix', rows: 2, cols: 2 }).kind, 'placeholder');
 assert.equal(describeBoardFrame(frame, 'Tic-Tac-Toe'), 'Tic-Tac-Toe board, 2 marks');
 for (const [rows, cols] of [[0, 3], [3, Number.NaN], [Number.POSITIVE_INFINITY, 3], [1.5, 2], [-3, -3]]) {
  const result = boardFrameFromCellsWithIssues({ family: 'grid_3x3', rows, cols }, Array.from({ length: 9 }, () => '.'));
  assert.equal(result.frame.kind, 'placeholder', `${rows}x${cols}`); assert.match(result.issues[0]!, /finite positive integers/u);
 }
 const badOverlay = boardFrameFromCellsWithIssues(TTT, Array.from({ length: 9 }, () => null), { last: [9], line: [0, 4, 8] });
 assert.equal(badOverlay.frame.kind === 'cells' && badOverlay.frame.last, undefined);
 assert.deepEqual(badOverlay.frame.kind === 'cells' && badOverlay.frame.line, [0, 4, 8]);
 assert.match(badOverlay.issues[0]!, /Dropped "last" overlay/u);
});

test('card records use host-supplied hands and reveal only the far hand size', () => {
 const hands = { near: ['K', '5', 'A', '7', 'J'], farCount: 5 };
 const cards = cardFrameFromRecord('K,9|T|0', hands);
 assert.deepEqual([cards.played.bottom, cards.played.top, cards.winner, cards.bottom.length, cards.top.length], ['K', '9', 'bottom', 4, 4]);
 assert.ok(cards.top.every((card) => card === null));
 const opening = cardFrameFromRecord('', hands);
 assert.deepEqual([opening.top.length, opening.bottom, opening.centre], [5, hands.near, null]);
});

function cell(index: number, label: string, cols = 3, extra: Partial<DisplayCell> = {}): DisplayCell {
 return { id: `cell-${index}`, kind: 'board', row: Math.floor(index / cols), col: index % cols, index, key: null, label, ...extra };
}
function liveFrame(cells: readonly DisplayCell[], overrides: Partial<DisplayFrameV1> = {}): DisplayFrameV1 {
 return {
  displayFrameVersion: DISPLAY_FRAME_VERSION, publicStateVersion: PUBLIC_STATE_VERSION, rendererVersion: RENDERER_VERSION, adapterVersion: RENDER_ADAPTER_VERSION,
  frameId: 'ttt:4', sourceReplayEventId: 'ttt:replay:4', gameSlug: 'tic-tac-toe', rendererFamily: 'grid_3x3',
  actorPlayer: 'player_1', actionLabel: '4', cells,
  summary: { activePlayer: 'player_2', terminal: false, turn: 3, scores: { player_1: 0, player_2: 0 } },
  ...overrides,
 };
}
const tttLabels = ['O', '', '', '', 'X', '', '', '', 'X'];

test('projects a live DisplayFrameV1 onto Board and keeps live metadata beside it', () => {
 const frame = Object.freeze(liveFrame(tttLabels.map((label, index) => cell(index, label))));
 const before = JSON.stringify(frame);
 const { frame: board, issues, metadata } = boardFrameFromDisplayFrame(frame, { last: [8] });
 assert.deepEqual(issues, []);
 assert.deepEqual(board, { kind: 'cells', family: 'grid_3x3', rows: 3, cols: 3, cells: ['O', '.', '.', '.', 'X', '.', '.', '.', 'X'], last: [8] });
 assert.deepEqual(metadata, {
  frameId: 'ttt:4', sourceReplayEventId: 'ttt:replay:4', gameSlug: 'tic-tac-toe', rendererFamily: 'grid_3x3',
  actorPlayer: 'player_1', actionLabel: '4', activePlayer: 'player_2', terminal: false, turn: 3, scores: { player_1: 0, player_2: 0 }, statusLabels: [],
 });
 assert.equal(JSON.stringify(frame), before);
 const html = renderToStaticMarkup(<Board frame={board} label="Live turn 3" />);
 assert.equal((html.match(/st-xo-x/g) || []).length, 2); assert.equal((html.match(/st-xo-o/g) || []).length, 1);
 assert.equal((html.match(/data-last="true"/g) || []).length, 1);
});

test('projection never derives last from actionLabel; cells are placed by position, not array order', () => {
 const shuffled = tttLabels.map((label, index) => cell(index, label)).reverse();
 const { frame, issues } = boardFrameFromDisplayFrame(liveFrame(shuffled));
 assert.deepEqual(issues, []);
 assert.equal(frame.kind === 'cells' && frame.cells.join(''), 'O...X...X');
 assert.equal(frame.kind === 'cells' && 'last' in frame, false);
 const byIndexOnly = tttLabels.map((label, index) => cell(index, label, 3, { row: null, col: null }));
 assert.equal(boardFrameFromDisplayFrame(liveFrame(byIndexOnly), { rows: 3, cols: 3 }).frame.kind, 'cells');
});

test('projection normalises "" (and null) to "." so Board never draws a phantom piece', () => {
 const { frame } = boardFrameFromDisplayFrame(liveFrame(Array.from({ length: 9 }, (_, index) => cell(index, ''))));
 assert.equal(frame.kind === 'cells' && frame.cells.every((token) => token === '.'), true);
 const html = renderToStaticMarkup(<Board frame={frame} />);
 assert.doesNotMatch(html, /st-xo/u);
 const nullLabels = liveFrame(Array.from({ length: 9 }, (_, index) => ({ ...cell(index, ''), label: null as unknown as string })));
 assert.equal(boardFrameFromDisplayFrame(nullLabels).frame.kind, 'cells');
});

test('projection rejects cell-count and geometry mismatches with a truthful placeholder', () => {
 const short = boardFrameFromDisplayFrame(liveFrame(tttLabels.slice(0, 8).map((label, index) => cell(index, label))), { rows: 3, cols: 3, label: 'Tic-Tac-Toe' });
 assert.deepEqual(short.frame, { kind: 'placeholder', family: 'grid_3x3', label: 'Tic-Tac-Toe' });
 assert.match(short.issues[0]!, /Expected 9 board cells for a 3x3 board, received 8/u);
 assert.equal(short.metadata.turn, 3);
 const duplicate = tttLabels.map((label, index) => cell(index === 8 ? 7 : index, label));
 assert.match(boardFrameFromDisplayFrame(liveFrame(duplicate)).issues[0]!, /Two cells occupy position 7/u);
 const disagree = tttLabels.map((label, index) => cell(index, label, 3, index === 4 ? { index: 5 } : {}));
 assert.match(boardFrameFromDisplayFrame(liveFrame(disagree)).issues[0]!, /disagrees with row 1, col 1/u);
 const unknownToken = tttLabels.map((label, index) => cell(index, index === 4 ? 'Z' : label));
 const unknown = boardFrameFromDisplayFrame(liveFrame(unknownToken));
 assert.equal(unknown.frame.kind, 'placeholder'); assert.match(unknown.issues[0]!, /"Z" is not a recognised grid_3x3 token/u);
 const nan = boardFrameFromDisplayFrame(liveFrame(tttLabels.map((label, index) => cell(index, label))), { rows: Number.NaN, cols: 3 });
 assert.equal(nan.frame.kind, 'placeholder');
 const wrongVersion = boardFrameFromDisplayFrame({ ...liveFrame([]), displayFrameVersion: 'eslams.replay.display_frame.v2' } as unknown as DisplayFrameV1);
 assert.match(wrongVersion.issues[0]!, /Unsupported display frame version/u);
});

test('unsupported and unknown families become a placeholder naming that family, never another game', () => {
 for (const family of ['card_table', 'dice_table', 'auction_panel', 'payoff_matrix', 'control_benchmark', 'economic_panel', 'custom'] as const) {
  const result = boardFrameFromDisplayFrame(liveFrame([cell(0, '4', 1)], { gameSlug: 'example', rendererFamily: family }), { label: 'Example game' });
  assert.deepEqual(result.frame, { kind: 'placeholder', family, label: 'Example game' });
  assert.match(result.issues[0]!, new RegExp(`"${family}" has no cell Board renderer`, 'u'));
  assert.match(renderToStaticMarkup(<Board frame={result.frame} label="Example" />), new RegExp(`data-family="${family}"`, 'u'));
 }
 const unknown = boardFrameFromDisplayFrame(liveFrame([cell(0, 'X', 1)], { rendererFamily: 'poker-table' as never }));
 assert.deepEqual(unknown.frame, { kind: 'placeholder', family: 'poker-table', label: 'tic-tac-toe' });
 assert.match(unknown.issues[0]!, /Unknown renderer family "poker-table"/u);
});

test('Core key/value frames (chess FEN cells without positions) are reported, not drawn', () => {
 const fenFrame = parseDisplayFrame({
  schema_version: DISPLAY_FRAME_VERSION, frame_id: 'run:display:1', renderer_family: 'chessboard', actor_player: 'player_1', action_label: 'a2a3',
  display_cells: [{ key: 'fen', value: 'rnbqkbnr/pppppppp/8/8/8/P7/1PPPPPPP/RNBQKBNR b KQkq - 0 1' }, { key: 'side_to_move', value: 'black' }],
  summary: { active_player: 'player_2', terminal: false, turn: 1, scores: { player_1: 0, player_2: 0 } },
 }, { gameSlug: 'chess', rendererFamily: 'square_board' })!;
 assert.ok(fenFrame);
 const result = boardFrameFromDisplayFrame(fenFrame, { label: 'Chess' });
 assert.equal(result.frame.kind, 'placeholder');
 assert.match(result.issues[0]!, /finite positive integers/u);
 assert.deepEqual([result.metadata.actorPlayer, result.metadata.actionLabel, result.metadata.activePlayer, result.metadata.turn], ['player_1', 'a2a3', 'player_2', 1]);
});

test('status cells are kept as metadata labels and do not count as board cells', () => {
 const cells = [...tttLabels.map((label, index) => cell(index, label)), { id: 'status', kind: 'status', row: null, col: null, index: null, key: 'result', label: 'X to move' } as DisplayCell];
 const result = boardFrameFromDisplayFrame(liveFrame(cells));
 assert.deepEqual(result.issues, []); assert.deepEqual(result.metadata.statusLabels, ['X to move']);
});

test('privacy check rejects frames whose keys match the reason/provider/token pattern and echoes nothing back', () => {
 for (const extra of [{ reasoning: 'chain' }, { providerName: 'Lab' }, { token: '4' }, { tokenUsage: 12 }, { explanation: 'why' }]) {
  const unsafe = { ...liveFrame(tttLabels.map((label, index) => cell(index, label))), ...extra } as unknown as DisplayFrameV1;
  const result = boardFrameFromDisplayFrame(unsafe);
  assert.equal(result.frame.kind, 'placeholder', Object.keys(extra)[0]);
  assert.ok(result.issues.some((issue) => /Non-renderable field|non-public field/u.test(issue)), Object.keys(extra)[0]);
  assert.equal(result.metadata.actorPlayer, null); assert.equal(result.metadata.gameSlug, null); assert.deepEqual(result.metadata.scores, {});
 }
 const nested = liveFrame([...tttLabels.slice(0, 8).map((label, index) => cell(index, label)), { ...cell(8, 'X'), hiddenOwner: 'player_2' } as DisplayCell]);
 assert.match(boardFrameFromDisplayFrame(nested).issues.join('\n'), /\$\.cells\[8\]\.hiddenOwner/u);
});

test('projection agrees with the accessible scene built from the same frame', () => {
 const frame = liveFrame(tttLabels.map((label, index) => cell(index, label)));
 const envelope = buildSceneEnvelope(frame, { gameSlug: 'tic-tac-toe', rendererFamily: 'grid_3x3' }, [{ id: 'cell-1', action: '1', label: 'Top middle', disabled: false }]);
 const projected = boardFrameFromDisplayFrame(frame).frame;
 assert.equal(projected.kind === 'cells' && projected.rows * projected.cols, envelope.scene.nodes.length);
 assert.deepEqual([envelope.scene.rows, envelope.scene.cols], [3, 3]);
 assert.equal(envelope.scene.accessibility[0]?.label, 'Row 1, column 1: O');
});

// Ported from eSlamsPlatform@0fa7dfe apps/web/tests/arena-interactions.test.ts, with a local fixture instead of GAME_CATALOG.
const fixture: Record<string, readonly [ArenaCategory, number]> = {
 'tic-tac-toe': ['Board', 2], 'connect-four': ['Board', 2], chess: ['Board', 2], go: ['Board', 2], othello: ['Board', 2], checkers: ['Board', 2],
 battleship: ['Board', 2], blackjack: ['Card', 1], 'rock-paper-scissors': ['Strategy', 2], taxi: ['RL', 1],
};
function arena(slug: string): ArenaGameLike { const [category, players] = fixture[slug]!; return { slug, name: slug, category, players }; }
function action(token: string, label = token, fields: Partial<ArenaLegalAction> = {}): ArenaLegalAction { return { token, label, ...fields }; }

test('side options exist for every catalogue identity and one-player games get one seat', () => {
 for (const [slug, info] of Object.entries(GAME_ANIMATIONS)) {
  for (const players of [1, 2]) {
   const options = arenaSideOptionsForGame({ slug, name: info.name, category: info.category, players });
   assert.equal(options[0]?.value, 'player_1'); assert.equal(options.length, players, slug);
   assert.ok(options.every((option) => option.label.length > 0 && option.helper.length > 0));
  }
 }
 assert.deepEqual(arenaSideOptionsForGame({ slug: 'bridge', name: 'Bridge', category: 'Card', players: 4, topologyMode: 'multi_seat', controlledPlayers: ['player_1', 'player_2', 'player_3', 'player_4'], renderSpec: { seatLayout: 'compass' } }).map((side) => side.label), ['North', 'East', 'South', 'West']);
});

test('game-native side labels', () => {
 assert.equal(arenaSideLabelForGame(arena('tic-tac-toe'), 'player_2'), 'O');
 assert.equal(arenaSideLabelForGame(arena('connect-four'), 'player_1'), 'Red');
 assert.equal(arenaSideLabelForGame(arena('chess'), 'player_1'), 'White');
 assert.equal(arenaSideLabelForGame(arena('go'), 'player_1'), 'Black');
 assert.equal(arenaSideLabelForGame(arena('othello'), 'player_2'), 'White');
 assert.equal(arenaSideLabelForGame(arena('checkers'), 'player_2'), 'Black');
 assert.equal(arenaSideLabelForGame(arena('taxi'), 'player_1'), 'Pilot');
});

test('legal action tokens become public labels while Core labels are preserved', () => {
 assert.deepEqual(describeArenaAction(arena('connect-four'), action('3')), { token: '3', label: 'Column 4', shortLabel: 'C4', hint: 'Drop a disc into this column.', kind: 'board' });
 assert.deepEqual(describeArenaAction(arena('tic-tac-toe'), action('4')), { token: '4', label: 'Center', shortLabel: 'Cell 5', hint: 'Place your mark on this square.', kind: 'board' });
 assert.deepEqual(describeArenaAction(arena('chess'), action('e2e4')), { token: 'e2e4', label: 'Move e2 to e4', shortLabel: 'e2-e4', hint: 'Select this legal move.', kind: 'board' });
 assert.equal(describeArenaAction(arena('blackjack'), action('hit')).label, 'Hit');
 assert.equal(describeArenaAction(arena('rock-paper-scissors'), action('scissors')).label, 'Scissors');
 assert.equal(describeArenaAction(arena('taxi'), action('north')).label, 'Up');
 const described = describeArenaAction(arena('blackjack'), action('H', 'Hit on soft 17', { verb: 'hit' }));
 assert.deepEqual([described.label, described.kind, described.shortLabel], ['Hit on soft 17', 'card', 'H']);
});

test('board moves, cell targets and RL slots parse without inventing tokens', () => {
 assert.deepEqual(arenaBoardMoveFromAction(arena('chess'), action('e7-e8q')), { token: 'e7-e8q', from: 'e7', to: 'e8', promotion: 'q' });
 assert.equal(arenaBoardMoveFromAction(arena('blackjack'), action('hit')), null);
 assert.deepEqual(arenaBoardMoveFromAction({ slug: 'checkers' }, action('5,0-3,2-1,4')), { token: '5,0-3,2-1,4', from: 'a3', to: 'e7', promotion: null });
 for (const token of ['8,0-4,1', '5,0', '5,0-4,1 garbage']) assert.equal(arenaBoardMoveFromAction({ slug: 'checkers' }, action(token)), null);
 assert.match(describeArenaAction(arena('checkers'), action('5,0-3,2-5,4-3,6-1,4')).label, /via c5 then e3 then g5/u);
 assert.deepEqual(arenaBoardCellActionFromAction(arena('go'), action('40', 'Center'), 9, 9), { token: '40', index: 40, row: 4, col: 4, label: 'Center' });
 assert.deepEqual(arenaBoardCellActionFromAction(arena('othello'), action('[2,3]', 'Place'), 8, 8), { token: '[2,3]', index: 19, row: 2, col: 3, label: 'Place' });
 assert.deepEqual(arenaBoardCellActionFromAction(arena('battleship'), action('7,8'), 10, 10), { token: '7,8', index: 78, row: 7, col: 8, label: '7,8' });
 assert.equal(arenaBoardCellActionFromAction(arena('go'), action('81'), 9, 9), null);
 assert.equal(arenaBoardCellActionFromAction(arena('othello'), action('[9,0]'), 8, 8), null);
 assert.equal(arenaBoardCellActionFromAction(arena('go'), action('4'), 0, 9), null);
 assert.equal(arenaRlControlSlotFromAction(action('brake', 'Brake', { verb: 'brake' })), 'down');
 assert.equal(arenaRlControlSlotFromAction(action('skate-left', 'Skate left')), 'left');
 assert.equal(arenaRlControlSlotFromAction(action('guard', 'Guard')), 'center');
 assert.equal(arenaRlControlSlotFromAction(action('fire', 'Fire', { verb: 'fire' })), null);
 assert.equal(isCellBoardFamily('dice_table'), false);
});

test('F2: boardFrameFromCells fails closed on an unknown non-empty token instead of erasing it', () => {
 const square = { family: 'square_board', rows: 2, cols: 2, name: 'Othello' } as const;
 const unknown = boardFrameFromCellsWithIssues(square, ['B', 'DRAGON', '.', 'W']);
 assert.deepEqual(unknown.frame, { kind: 'placeholder', family: 'square_board', label: 'Othello' });
 assert.equal(unknown.issues.length, 1);
 assert.match(unknown.issues[0]!, /Cell 1 token "DRAGON" is not a recognised square_board token; returned a placeholder/u);
 assert.deepEqual(boardFrameFromCells(square, ['B', 'DRAGON', '.', 'W']), unknown.frame);
 for (const [geometry, cells, bad] of [
  [TTT, ['X', 'O', 'Q', '', '', '', '', '', ''], /"Q" is not a recognised grid_3x3/u],
  [CHESS, ['K', ...Array.from({ length: 62 }, () => '.'), 'Z'], /Cell 63 token "Z" is not a recognised chess/u],
  [{ family: 'square_board', rows: 1, cols: 2, variant: 'checkers' }, ['r', 'w'], /"w" is not a recognised checkers/u],
  [{ family: 'hex_board', rows: 1, cols: 2 }, ['R', 'W'], /"W" is not a recognised hex_board/u],
  [TTT, ['X', 4 as unknown as string, '', '', '', '', '', '', ''], /Cell 1 token 4 /u],
 ] as const) {
  const result = boardFrameFromCellsWithIssues(geometry, cells);
  assert.equal(result.frame.kind, 'placeholder', String(bad)); assert.match(result.issues[0]!, bad);
 }
 // Valid boards and every empty spelling are unchanged.
 const valid = boardFrameFromCellsWithIssues(square, ['B', null, '-', 'W']);
 assert.deepEqual(valid, { frame: { kind: 'cells', family: 'square_board', rows: 2, cols: 2, cells: ['B', '.', '.', 'W'] }, issues: [] });
 assert.deepEqual(boardFrameFromCells(TTT, ['player_1', '', ' ', '_', 'O', undefined, null, '.', 'x']), { kind: 'cells', family: 'grid_3x3', rows: 3, cols: 3, cells: ['X', '.', '.', '.', 'O', '.', '.', '.', 'X'] });
 // normalizeCellToken itself keeps its documented lossy semantics.
 assert.equal(normalizeCellToken('square_board', 'DRAGON'), '.');
});

/** Classes of the rendered hex cells, in order: "a" (first seat), "b" (second seat) or "empty". */
const hexClasses = (html: string) => [...html.matchAll(/st-hex-(a|b|empty)\b/gu)].map((match) => match[1]);

test('F3: Core Hex tokens (B = player 1, W = player 2) project to Board R / B only with tokens: "core"', () => {
 const demo = GAME_DEMONSTRATIONS.hex!;
 for (const [i, demoFrame] of demo.frames.entries()) {
  const board = (demoFrame.state.board as (string | null)[][]).flat();
  const live = adaptPublicStateToDisplayFrame({ board, rows: 11, cols: 11 }, { gameSlug: 'hex', rendererFamily: 'hex_board' });
  assert.ok(live, `frame ${i}`);
  const core = boardFrameFromDisplayFrame(live, { tokens: 'core' });
  assert.deepEqual(core.issues, [], `frame ${i}`);
  assert.equal(core.frame.kind, 'cells');
  if (core.frame.kind !== 'cells') continue;
  assert.deepEqual(core.frame.cells, board.map((v) => (v === 'B' ? 'R' : v === 'W' ? 'B' : '.')), `frame ${i}`);
  // Same seats as the decorative scene draws from the same Core state.
  const scene = renderToStaticMarkup(<LegalDemonstration game="hex" frame={demoFrame} />);
  assert.deepEqual(hexClasses(renderToStaticMarkup(<Board frame={core.frame} />)), hexClasses(scene), `frame ${i}`);
  // The direct cell path agrees.
  assert.deepEqual(boardFrameFromCells({ family: 'hex_board', rows: 11, cols: 11, tokens: 'core' }, board), core.frame, `frame ${i}`);
 }
 const flat = ['B', 'W', null, null];
 const live = adaptPublicStateToDisplayFrame({ board: flat, rows: 2, cols: 2 }, { gameSlug: 'hex', rendererFamily: 'hex_board' })!;
 assert.deepEqual(boardFrameFromDisplayFrame(live, { tokens: 'core' }).frame, { kind: 'cells', family: 'hex_board', rows: 2, cols: 2, cells: ['R', 'B', '.', '.'] });
 // Core vocabulary on Hex accepts only Core's B/W; Board's R is not a Core Hex token.
 const boardR = boardFrameFromCellsWithIssues({ family: 'hex_board', rows: 1, cols: 2, tokens: 'core' }, ['R', '.']);
 assert.equal(boardR.frame.kind, 'placeholder'); assert.match(boardR.issues[0]!, /"R" is not a recognised Core hex_board token/u);
});

test('F3: the default "board" vocabulary keeps B as the second Hex seat and still rejects W', () => {
 const live = adaptPublicStateToDisplayFrame({ board: ['R', 'B', null, null], rows: 2, cols: 2 }, { gameSlug: 'hex', rendererFamily: 'hex_board' })!;
 for (const options of [{}, { tokens: 'board' as const }]) {
  assert.deepEqual(boardFrameFromDisplayFrame(live, options).frame, { kind: 'cells', family: 'hex_board', rows: 2, cols: 2, cells: ['R', 'B', '.', '.'] });
 }
 const white = boardFrameFromDisplayFrame({ ...live, cells: live.cells.map((c, i) => (i === 1 ? { ...c, label: 'W' } : c)) });
 assert.equal(white.frame.kind, 'placeholder'); assert.match(white.issues[0]!, /"W" is not a recognised hex_board token/u);
 assert.deepEqual(boardFrameFromCells({ family: 'hex_board', rows: 1, cols: 2 }, ['R', 'B']), { kind: 'cells', family: 'hex_board', rows: 1, cols: 2, cells: ['R', 'B'] });
});

test('F3: non-Hex families read the same in both vocabularies', () => {
 const go = { family: 'go_board', rows: 1, cols: 3 } as const;
 for (const tokens of ['board', 'core'] as const) {
  assert.deepEqual(boardFrameFromCells({ ...go, tokens }, ['B', 'W', null]), { kind: 'cells', family: 'go_board', rows: 1, cols: 3, cells: ['B', 'W', '.'] }, tokens);
  assert.deepEqual(boardFrameFromCells({ ...TTT, tokens }, ['X', 'O', ...Array.from({ length: 7 }, () => '')]).kind, 'cells', tokens);
  assert.deepEqual(boardFrameFromCells({ ...C4, tokens }, ['R', 'Y', ...Array.from({ length: 40 }, () => null)]), { kind: 'cells', family: 'connect_four', rows: 6, cols: 7, cells: ['R', 'Y', ...Array.from({ length: 40 }, () => '.')] }, tokens);
  assert.equal(boardFrameFromCells({ ...CHESS, tokens }, ['K', ...Array.from({ length: 62 }, () => '.'), 'k']).kind, 'cells', tokens);
  const ttt = boardFrameFromDisplayFrame(liveFrame(tttLabels.map((label, index) => cell(index, label))), { tokens });
  assert.deepEqual([ttt.issues, ttt.frame.kind === 'cells' && ttt.frame.cells.join('')], [[], 'O...X...X'], tokens);
  assert.equal(boardFrameFromCellsWithIssues({ ...go, tokens }, ['B', 'DRAGON', null]).frame.kind, 'placeholder', tokens);
 }
});
