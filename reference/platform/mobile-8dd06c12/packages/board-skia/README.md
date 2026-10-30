# `@eslams/board-skia`

The native renderer package for all 35 playable mobile Arena games and every
catalog watch/replay surface. It consumes only the
versioned `BoardScene` contract and `ThemeTokens`; it never receives private game
state, model reasoning, provider payloads, or billing data.

## Architecture

- Family modules build deterministic `RenderPlan` values. Their geometry,
  accessibility mapping, motion decisions, and hit zones are testable without a
  native runtime.
- `registry-core.ts` requires all 12 canonical families and derives the 35-game
  registry from `MOBILE_ARENA_GAME_CAPABILITIES`.
- The `@eslams/board-skia/native` entry adapts plans to `SkCanvas`, compiles the
  pinned SkSL material shader, and exposes the concrete native registries.
- Reanimated shared values are read into one immutable `MotionState` snapshot on
  the UI thread. Reduced motion always resolves directly to the final state.

## Invariants

- Hit-test points are normalized to the renderer content area (`0...1`). Every
  declared scene action target has exactly one hit zone; disabled actions are not
  returned by hit testing.
- Bloom is restricted to last-move, active-seat, active-dock, and result-sweep
  roles. Quality tiers may remove bloom, trails, shader detail, or preview motion,
  but never information or game identity.
- Renderers use public semantic labels only. Hidden cards, Battleship fog, dice,
  and simultaneous choices are represented by public counts or concealment states;
  render code does not infer or reveal private values.
- Renderer definitions and render plans fail closed on family mismatches,
  malformed geometry, duplicate ids, unsafe effects, or incomplete hit graphs.

The pure entry is suitable for contract/unit tests. Native applications should
import the concrete renderer registry from `@eslams/board-skia/native`.

## Golden release gate

The package commits 371 CanvasKit CPU references covering the 299 semantic game
states and the complete 12-family × 6-theme matrix. The runner executes the real
production renderer, verifies semantic digests before pixels, and fails closed on
an incomplete case set.

```sh
pnpm --filter @eslams/board-skia golden:check
```

Reference updates require a reviewed `--approval-reason`. The pinned environment,
tolerance policy, review workflow, and release blockers are documented in
[`docs/mobile/RENDERER_GOLDENS.md`](../../docs/mobile/RENDERER_GOLDENS.md).
