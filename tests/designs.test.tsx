import React from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup as render } from 'react-dom/server';
import families from '../src/game/visual-editions.json';
import { gameDesigns, resolveGameDesign, type DesignIdFor, type GameDesignId } from '../dist/game/designs.js';
import { GameAnimation, GameReplay } from '../dist/game/demo.js';
import { GAME_DEMONSTRATIONS, type Demonstration } from '../dist/game/demos.js';
import { replayTraceKey } from '../dist/game/replay.js';
import { LegalDemonstration } from '../dist/game/scene.js';

function captureWarnings<T>(run: () => T): { value: T; warnings: string[] } {
  const original = console.warn, warnings: string[] = [];
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
  try { return { value: run(), warnings }; } finally { console.warn = original; }
}

test('DesignIdFor narrows per game and keeps GameDesignId for a wide slug', () => {
  const chess: DesignIdFor<'chess'> = 'design-3';
  const go: DesignIdFor<'go'> = 'design-4';
  const c4: DesignIdFor<'connect-four'> = 'design-20';
  const wide: DesignIdFor<string> = 'design-20' satisfies GameDesignId;
  // @ts-expect-error chess offers three looks, not Connect Four's twenty.
  const bad: DesignIdFor<'chess'> = 'design-15';
  // @ts-expect-error a literal game rejects a design it does not offer.
  void <GameReplay game="chess" gameName="Chess" design="design-15" />;
  void [chess, go, c4, wide, bad];
  // The type mirrors visual-editions.json: only the stones family has a fourth look.
  for (const [family, entry] of Object.entries(families)) {
    const ids = entry.looks.map(look => look.id);
    assert.deepEqual(ids, family === 'stones' ? ['design-1', 'design-2', 'design-3', 'design-4'] : ['design-1', 'design-2', 'design-3'], family);
    if (family === 'stones') assert.deepEqual([...entry.games].sort(), ['go', 'gomoku', 'pentago']);
  }
});

test('resolveGameDesign keeps valid ids and falls back to the default with one warning', () => {
  const { value, warnings } = captureWarnings(() => [
    resolveGameDesign('chess', 'design-2'),
    resolveGameDesign('chess', undefined),
    resolveGameDesign('chess', 'design-15'),
    resolveGameDesign('chess', 'design-15'),
    resolveGameDesign('connect-four', 'design-15'),
    resolveGameDesign('no-such-game', 'design-2'),
  ]);
  assert.deepEqual(value, ['design-2', undefined, 'design-1', 'design-1', 'design-15', undefined]);
  assert.equal(warnings.length, 2, warnings.join('\n'));
  assert.match(warnings[0]!, /"design-15" is not a design for chess; rendering its default "design-1"/);
  assert.equal(gameDesigns('chess')[0]!.id, 'design-1');
});

test('GameReplay, GameAnimation and LegalDemonstration render the default for an invalid design', () => {
  const wide = (game: string, design: string) => ({ game, design: design as GameDesignId });
  const { value, warnings } = captureWarnings(() => {
    const frame = GAME_DEMONSTRATIONS.othello!.frames.at(-1)!;
    return {
      invalidScene: render(<LegalDemonstration {...wide('othello', 'design-17')} frame={frame} />),
      defaultScene: render(<LegalDemonstration game="othello" frame={frame} />),
      invalidReplay: render(<GameReplay {...wide('othello', 'design-17')} gameName="Othello" />),
      defaultReplay: render(<GameReplay game="othello" gameName="Othello" />),
      invalidAnimation: render(<GameAnimation {...wide('othello', 'design-18')} gameName="Othello" />),
      defaultAnimation: render(<GameAnimation game="othello" gameName="Othello" />),
      validScene: render(<LegalDemonstration game="othello" design="design-2" frame={frame} />),
    };
  });
  assert.equal(value.invalidScene, value.defaultScene);
  assert.equal(value.invalidReplay, value.defaultReplay);
  assert.equal(value.invalidAnimation, value.defaultAnimation);
  assert.notEqual(value.validScene, value.defaultScene);
  assert.ok(warnings.some(w => w.includes('"design-17" is not a design for othello')));
  assert.ok(warnings.some(w => w.includes('"design-18" is not a design for othello')));
  assert.equal(warnings.filter(w => w.includes('design-17')).length, 1, 'warn once per game and id');
});

test('replayTraceKey follows trace content, not object identity', () => {
  const base = GAME_DEMONSTRATIONS.chess!;
  const copy: Demonstration = JSON.parse(JSON.stringify(base));
  assert.equal(replayTraceKey('chess', { ...base }), replayTraceKey('chess', base));
  assert.equal(replayTraceKey('chess', copy), replayTraceKey('chess', base));
  assert.notEqual(replayTraceKey('chess', { ...base, frames: base.frames.slice(0, 4) }), replayTraceKey('chess', base));
  assert.notEqual(replayTraceKey('chess', { ...base, version: base.version + 1 }), replayTraceKey('chess', base));
  const edited = JSON.parse(JSON.stringify(base)) as { frames: { caption: string }[] };
  edited.frames[3]!.caption = 'different trace, same length';
  assert.notEqual(replayTraceKey('chess', edited as unknown as Demonstration), replayTraceKey('chess', base));
  assert.notEqual(replayTraceKey('go', base), replayTraceKey('chess', base));
});

test('the @ts-expect-error design assertions in this file hold under tsc', async () => {
  // tests/ is outside tsconfig include and tsx strips types, so check this file explicitly.
  const { execFileSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const root = fileURLToPath(new URL('../', import.meta.url));
  execFileSync(process.execPath, [`${root}node_modules/typescript/bin/tsc`, '--noEmit', '--strict', '--jsx', 'react-jsx', '--module', 'esnext',
    '--moduleResolution', 'bundler', '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck', '--target', 'es2022', '--types', 'node',
    'tests/designs.test.tsx'], { cwd: root, stdio: 'pipe' });
});
