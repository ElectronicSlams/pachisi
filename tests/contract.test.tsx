import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
 DISPLAY_FRAME_VERSION, GAME_RENDERER_FAMILIES, NON_RENDERABLE_KEY_PATTERN, PUBLIC_STATE_VERSION, RENDERER_FAMILY_ALIASES,
 SCENE_BUILDER_REGISTRY, adaptPublicStateToDisplayFrame, assertBoardSceneSafe, assertPublicReplaySafe, buildSceneEnvelope,
 collectNonRenderableFieldIssues, displayFrameAsLegacyRecord, parseDisplayFrame, parseRendererFamily,
} from '../dist/contract/index.js';
import { CLASSIC_DARK, CLASSIC_LIGHT, RESULT_SEMANTIC_TEXT_TOKENS, THEMES, THEME_IDS, TOKEN_CSS_VARIABLES, TOKEN_NAMES, resolveTheme } from '../dist/theme-tokens/index.js';

// Ported from eSlamsPlatform@0fa7dfe packages/game-render-contract/tests/game-render-contract.test.ts.
const legacyFrame = {
 schema_version: DISPLAY_FRAME_VERSION,
 frame_id: 'chess:1',
 renderer_family: 'chessboard',
 actor_player: 'player_1',
 action_label: 'e2e4',
 display_cells: [
  { kind: 'board', row: 0, col: 0, value: 'rook' },
  { kind: 'board', row: 0, col: 1, value: null },
 ],
 summary: { active_player: 'player_2', terminal: false, turn: 1, scores: { player_1: 0 } },
} as const;
const ttt = { gameSlug: 'tic-tac-toe', rendererFamily: 'grid_3x3' } as const;

test('adapts old display frames to explicit v1 versions and preserves legacy render data', () => {
 const frame = parseDisplayFrame(legacyFrame, { gameSlug: 'chess' });
 assert.equal(frame?.displayFrameVersion, 'eslams.replay.display_frame.v1');
 assert.equal(frame?.publicStateVersion, 'eslams.public-state.v1');
 assert.equal(frame?.rendererVersion, 'eslams.renderer.v1');
 assert.equal(frame?.adapterVersion, 'eslams.render-adapter.v1');
 assert.equal(frame?.rendererFamily, 'square_board');
 assert.equal(frame?.actorPlayer, 'player_1');
 assert.deepEqual(frame?.summary, { activePlayer: 'player_2', terminal: false, turn: 1, scores: { player_1: 0 } });
 assert.equal((displayFrameAsLegacyRecord(frame!) as { action_label?: unknown }).action_label, 'e2e4');
});

test('uses trusted host context to normalize Core renderer vocabulary', () => {
 const pokerFrame = { ...legacyFrame, renderer_family: 'poker-table' };
 assert.equal(parseDisplayFrame(pokerFrame), null);
 const poker = parseDisplayFrame(pokerFrame, { gameSlug: 'no-limit-texas-holdem', rendererFamily: 'card_table' });
 assert.equal(poker?.gameSlug, 'no-limit-texas-holdem');
 assert.equal(poker?.rendererFamily, 'card_table');
 assert.equal(parseDisplayFrame({ ...legacyFrame, renderer_family: 'grid' }, ttt)?.rendererFamily, 'grid_3x3');
 assert.equal(parseDisplayFrame({ ...pokerFrame, display_cells: [{ kind: 'board', row: -1, col: 0, value: 'X' }] }, { gameSlug: 'no-limit-texas-holdem', rendererFamily: 'card_table' }), null);
});

test('renderer-family aliases never resolve inherited object keys', () => {
 assert.equal(Object.keys(RENDERER_FAMILY_ALIASES).length, 10);
 assert.equal(parseRendererFamily('stone-grid'), 'go_board');
 for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) assert.equal(parseRendererFamily(key), null, key);
 assert.equal(parseDisplayFrame({ ...legacyFrame, renderer_family: 'constructor' }), null);
});

test('builds deterministic semantic and accessible scenes from public-state fixtures', () => {
 const envelope = buildSceneEnvelope({ board: ['X', null, 'O', null], rows: 2, cols: 2 }, ttt, [{ id: 'cell-1', action: '1', label: 'Play row 1 column 2', disabled: false }]);
 assert.equal(envelope.sceneSchemaVersion, 'eslams.scene.v1');
 assert.equal(envelope.themeTokenVersion, 'eslams.theme-tokens.v1');
 assert.equal(envelope.minimumAppVersion, '1.0.0');
 assert.equal(envelope.scene.nodes.length, 4);
 assert.equal(envelope.scene.accessibility.length, 4);
 assert.equal(envelope.scene.accessibility[1]?.role, 'button');
 assert.equal(envelope.scene.nodes[0]?.label, 'Row 1, column 1: X');
 assert.equal(envelope.scene.nodes[1]?.label, 'Row 1, column 2: Empty');
 assert.deepEqual([envelope.scene.rows, envelope.scene.cols], [2, 2]);
 const wrapped = adaptPublicStateToDisplayFrame({ publicStateVersion: PUBLIC_STATE_VERSION, gameSlug: 'tic-tac-toe', state: { board: ['X', '', 'O', null], rows: 2, cols: 2 } }, ttt);
 assert.deepEqual(wrapped?.cells.map((cell) => cell.label), ['X', '', 'O', '']);
});

test('fails closed on private, reasoning, provider, billing and malformed public fields', () => {
 for (const unsafe of [
  { board: ['X'], rows: 1, cols: 1, private_state: { board: ['O'] } },
  { board: ['X'], rows: 1, cols: 1, reasoning: 'secret chain' },
  { board: ['X'], rows: 1, cols: 1, provider_payload: 'raw' },
  { board: ['X'], rows: 1, cols: 1, billing: { cost: 2 } },
 ]) assert.throws(() => buildSceneEnvelope(unsafe, ttt));
 assert.equal(parseDisplayFrame({ ...legacyFrame, display_cells: [{ kind: 'board', row: -1, col: 0, value: 'X' }] }), null);
 assert.throws(() => assertPublicReplaySafe({ note: 'api_key: abcdefghijkl' }), /secret-like text/u);
});

test('privacy pattern rejects any key containing "token", including legal-action tokens (known limitation)', () => {
 assert.match('token', NON_RENDERABLE_KEY_PATTERN);
 assert.match('moveTokenCount', NON_RENDERABLE_KEY_PATTERN);
 assert.match('terminalReason', NON_RENDERABLE_KEY_PATTERN);
 const withLegalTokens = { board: ['X'], rows: 1, cols: 1, legal: [{ token: '0' }] };
 assert.throws(() => buildSceneEnvelope(withLegalTokens, ttt), /does not satisfy the supported v1/u);
 assert.deepEqual(collectNonRenderableFieldIssues(withLegalTokens), ['Non-renderable field at $.legal[0].token']);
 assert.deepEqual(collectNonRenderableFieldIssues({ board: [], meta: { providerName: 'x' } }), ['Non-renderable field at $.meta.providerName']);
 assert.deepEqual(collectNonRenderableFieldIssues({ board: ['X'], rows: 1 }), []);
});

test('registers every canonical renderer family used for play or watch', () => {
 assert.equal(GAME_RENDERER_FAMILIES.length, 12);
 assert.equal(new Set(GAME_RENDERER_FAMILIES).size, 12);
 for (const family of GAME_RENDERER_FAMILIES) assert.equal(typeof SCENE_BUILDER_REGISTRY[family], 'function');
 assert.equal(Object.isFrozen(SCENE_BUILDER_REGISTRY), true);
});

test('enforces exact action-target and accessibility graph integrity', () => {
 const scene = buildSceneEnvelope({ board: ['X', null, 'O', null], rows: 2, cols: 2 }, ttt, [{ id: 'cell-1', action: '1', label: 'Play row 1 column 2', disabled: false }]).scene;
 assert.equal(scene.nodes.filter((node) => node.actionTargetId === 'cell-1').length, 1);
 assert.throws(() => buildSceneEnvelope({ board: ['X', null], rows: 1, cols: 2 }, ttt, [
  { id: 'cell-1', action: '1', label: 'First', disabled: false },
  { id: 'cell-1', action: '1', label: 'Duplicate', disabled: false },
 ]), /unique ids/u);
 assert.throws(() => buildSceneEnvelope({ board: ['X', null], rows: 1, cols: 2 }, ttt, [{ id: 'global-action', action: 'pass', label: 'Pass', disabled: false }]), /exactly one scene node/u);
 assert.throws(() => buildSceneEnvelope({ board: ['X', null], rows: 1, cols: 2 }, ttt, [{ id: 'cell-1', action: '', label: 'Empty', disabled: false }]), /action target is invalid/u);
 assert.throws(() => assertBoardSceneSafe({ ...scene, accessibility: scene.accessibility.slice(1) }), /exact one-to-one mapping/u);
 assert.throws(() => assertBoardSceneSafe({ ...scene, accessibility: [...scene.accessibility, { ...scene.accessibility[0]!, id: 'extra' }] }), /exact one-to-one mapping/u);
 assert.throws(() => assertBoardSceneSafe({ ...scene, accessibility: [...scene.accessibility, scene.accessibility[0]!] }), /unique ids/u);
 const firstNode = scene.nodes[0]!; const firstAccessible = scene.accessibility[0]!;
 assert.throws(() => assertBoardSceneSafe({
  ...scene,
  nodes: [{ ...firstNode, actionTargetId: 'missing-target' }, ...scene.nodes.slice(1)],
  accessibility: [{ ...firstAccessible, actionTargetId: 'missing-target' }, ...scene.accessibility.slice(1)],
 }), /undeclared action target/u);
 const secondNode = scene.nodes[2]!; const secondAccessible = scene.accessibility[2]!;
 assert.throws(() => assertBoardSceneSafe({
  ...scene,
  nodes: scene.nodes.map((node) => node.id === secondNode.id ? { ...node, actionTargetId: 'cell-1' } : node),
  accessibility: scene.accessibility.map((node) => node.id === secondAccessible.id ? { ...node, actionTargetId: 'cell-1' } : node),
 }), /exactly one scene node/u);
});

test('typed theme tokens carry classic result-text roles that match tokens.css additions', async () => {
 assert.deepEqual([...THEME_IDS], ['classic-light', 'classic-dark', 'neon', 'club', 'arcade', 'midnight']);
 for (const id of THEME_IDS) { assert.deepEqual(Object.keys(THEMES[id].color), [...TOKEN_NAMES]); assert.equal(Object.isFrozen(THEMES[id].color), true); }
 assert.equal(resolveTheme('system', 'dark').id, 'classic-dark');
 assert.equal(resolveTheme('system', null).id, 'classic-light');
 assert.equal(resolveTheme('neon', 'light').id, 'neon');
 const css = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
 const additive = css.slice(css.indexOf('/* BEGIN pachisi additive tokens'));
 const blocks = [...additive.matchAll(/\{([^{}]*)\}/gu)].map((match) => match[1]!);
 assert.equal(blocks.length, 3);
 for (const [index, theme] of [CLASSIC_LIGHT, CLASSIC_DARK, CLASSIC_DARK].entries()) {
  for (const token of Object.values(RESULT_SEMANTIC_TEXT_TOKENS)) {
   assert.match(blocks[index]!, new RegExp(`${TOKEN_CSS_VARIABLES[token]}: ${theme.color[token]};`, 'u'), `${theme.id} ${token}`);
  }
 }
});

test('contract, adapter, interactions and theme-tokens stay server-safe and out of the root entry', async () => {
 const root = await readFile(new URL('../dist/index.js', import.meta.url), 'utf8');
 assert.doesNotMatch(root, /contract|theme-tokens|board-adapter|interactions/u);
 for (const path of ['contract/index.js', 'contract/render-contract.js', 'contract/core-types.js', 'game/board-adapter.js', 'game/interactions.js', 'theme-tokens/index.js']) {
  const code = await readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');
  assert.doesNotMatch(code, /use client|from\s*["']react|@eslams\/|next\/|fetch\(/u, path);
 }
 const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
 for (const entry of ['./contract', './game/board-adapter', './game/interactions', './theme-tokens']) {
  const target = pkg.exports[entry];
  assert.ok(target?.types && target?.import, entry);
  await readFile(new URL(`../${target.import}`, import.meta.url));
  await readFile(new URL(`../${target.types}`, import.meta.url));
 }
});
