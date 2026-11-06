# Consuming Pachisi

## Package entry points

| Entry | Contract |
|---|---|
| `@electronicslams/pachisi` | Server-safe primitives and stateless Stadium identity/tile/status/state components. No demo dataset, session or router import. |
| `/client` | Controlled fields, password/copy controls, tabs, dialog/sheet, avatar, terminal and poster/preview composites. Contains a React client boundary. |
| `/game/icons`, `/game/ui-icons` | Canonical game/common UI icon sets. |
| `/game/board`, `/game/board-types` | Stateless supplied simple-board rendering and frame contracts. |
| `/game/board-adapter`, `/contract` | Host adapter (`boardFrameFromDisplayFrame`, `boardFrameFromCells`, `normalizeCellToken`) and the server-safe live render contract (`DisplayFrameV1`, `BoardScene`, version constants, privacy checks). See [contracts](contracts.md). |
| `/game/interactions` | Pure legal-action labels, board from/to, cell targets and RL control slots. Describes actions; never decides legality. |
| `/theme-tokens` | Typed theme contract with Classic Light/Dark and archived-mobile palettes as data. `tokens.css` remains the web source. |
| `/game/demo`, `/game/demos`, `/game/catalogue` | Explicit synthetic artwork, dataset and metadata. Avoid these imports on routes that only need icons. |
| `/game/scene` | Decorative `LegalDemonstration`; not a general actual-state renderer. |
| `/game/motion`, `/game/icon-catalogue` | Visibility scheduling and icon identity list. |
| `/theme`, `/dates` | Existing light/dark/system preference behavior and deterministic date formatting. |
| `/next` | Optional Next Button adapter. Core links use browser anchors; Next owns client navigation/prefetch policy. |
| `/event`, `/event.css` | Existing Grand Slams stage, scoped CSS, host-supplied links and content. |
| `/styles.css`, `/tokens.css`, `/fonts.css`, `/chrome.css` | Opt-in house styles/base, tokens/base alone, font and public-shell style recipes. |
| `/assets/*` | Approved brand PNGs and licensed mono font. |

React and ReactDOM 19.2+ are peer dependencies. Next 16 is an optional peer used only by `/next`. Import client components from `/client`; don't mark your entire application layout as client to use the library. The package build preserves every source `use client` directive and emits ESM JavaScript plus declarations.

## Live match frames

To draw a real match, don't hand-build `BoardFrame`s from replay data. Parse the Platform's public display frame with `/contract` (`parseDisplayFrame` or `buildSceneEnvelope`), then project it with `boardFrameFromDisplayFrame` from `/game/board-adapter`. You get the `Board` frame, a list of `issues` (unsupported family, size mismatch, unknown token, privacy rejection) and the actor/turn/score `metadata` that `BoardFrame` cannot carry. Unsupported families come back as a placeholder that names the family. Legality, sessions, key/value (e.g. FEN) decoding and non-cell renderers stay in the host. Read [Live-state contracts](contracts.md) for the full pipeline, versions and the known breadth of the privacy key check.

## Local archive workflow

```sh
# In Pachisi:
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm pack --out ./artifacts/pachisi-0.2.0.tgz

# In a consumer (use the real archive path):
pnpm add /path/to/pachisi/artifacts/pachisi-0.2.0.tgz
```

Keep the archive in a reviewed vendor location if a lockfile needs to resolve it on another developer's machine. A path into somebody's laptop is not a reproducible CI dependency. Git installations require an explicit build step because registry publication is disabled and generated `dist` is not committed; do not point production at an unbuilt branch. A pinned reviewed snapshot or packed archive is the present distribution mechanism. There is no cross-repository `workspace:*` resolution.

## React example

```tsx
import '@electronicslams/pachisi/styles.css';
import '@electronicslams/pachisi/fonts.css'; // optional self-hosted mono
import { Button, GameTile, ModelChip } from '@electronicslams/pachisi';

const model = {
  id: 'example/model', name: 'Example model',
  providerSlug: 'example', providerName: 'Example Lab', markUrl: null,
};

export function Setup() {
  return <>
    <ModelChip identity={model} />
    <GameTile slug="chess" name="Chess" variant="standard" href="/arena?game=chess" />
    <Button href="/arena">Play</Button>
  </>;
}
```

For Next, import `Button` from `/next` where a link should use `next/link`. Composite portable links are native anchors; migrate them through a deliberate host wrapper when preserving SPA navigation is required. This semantic difference is documented, not silently presented as a drop-in conversion for every old app import.

Use a stable server timestamp as `now` for StadiumDate and status/poster components during SSR/hydration. The host determines whether a match is live. Callbacks, destinations, real metadata, permissions and eligible frames belong to the host.

## Themes and styles

The `es-theme` storage key and `eslams:theme-preference-change` event are preserved. `applyThemePreference('light'|'dark'|'system')` is a browser action, never run during server rendering. Blocked storage retains a document-only choice. No theme/provider data is read at module import time.

The existing token sheet includes global typography, body/reset, focus and reduced-motion rules; it isn't an isolated subtree theme engine. Import it exactly once. Do not combine a second independent copy of Platform `tokens.css` and Pachisi tokens. Other sheets keep existing class names to make migration reviewable. Event classes are scoped to `.pachisi-gs-*`; the monochrome star stage is an approved event exception, not a new general palette. Public chrome CSS is optional; authentication-aware SiteShell remains in Platform.

## Proposed Platform migration (not applied)

1. Pin a Pachisi archive or verified source snapshot. Keep current design assets/tokens as the visual baseline. Add a consumer build fixture first.
2. Replace low-risk `components/ui` re-exports with `/` or `/client`; use `/next` Button wrappers where currently expected. Keep existing import paths as compatibility facades initially.
3. Move the single global token/style owner to Pachisi; remove duplicate imports only after screenshot comparisons show the existing hierarchy, focus, sheets and both themes are preserved. Match font loading/CSP policy explicitly.
4. Point game wrappers at Pachisi's `/game/*`; verify the catalogue, artwork Core version, current game variant and eligible actual-state contracts independently. Do not run two motion schedulers or import both old/new icon implementations in a route.
5. Migrate Stadium composites, then the event stage with explicit destinations/content. Keep API/session/catalogue lookup and authorization wrappers local. Existing match-sharing permission checks and actual snapshots stay local.
6. Re-run Platform's real build/type/lint/tests, relevant desktop/phone and both-theme journeys, screenshot comparisons, route bundle budgets and auth/privacy checks. Open a consumer draft PR for review. No production deployment is implied by a library version.

Existing Platform remains unchanged in this task. Its merged `@eslams/game-visuals` snapshot remains authoritative until that consumer migration is reviewed. Do not edit the older independent visual repo and this copy in parallel without an explicit upstream update diff.

## Native and exports

DOM/SVG React components are currently web-only. A future Skia/native adapter can share validated geometry and transition intent, but requires native accessibility/hit targets, layout, font and public/private projection tests. The generic Board supports its declared simple frames. All-family true-match PNG/video export remains a separate integration. Never use a decorative demonstration as a supposedly exact match/turn share image.
