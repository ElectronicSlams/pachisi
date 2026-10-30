export const PUBLIC_STATE_VERSION = "eslams.public-state.v1" as const;
export const DISPLAY_FRAME_VERSION = "eslams.replay.display_frame.v1" as const;
export const SCENE_SCHEMA_VERSION = "eslams.scene.v1" as const;
export const RENDERER_CONTRACT_VERSION = "eslams.renderer.v1" as const;
export const RENDER_ADAPTER_VERSION = "eslams.render-adapter.v1" as const;
export const THEME_TOKEN_REFERENCE_VERSION = "eslams.theme-tokens.v1" as const;
export const MOBILE_MINIMUM_APP_VERSION = "1.0.0" as const;
export const LEGACY_ARENA_REPLAY_PRODUCER_VERSION = "eslams.arena-replay.numeric-v1" as const;

export const ARENA_REPLAY_CONTRACT_VERSIONS = Object.freeze({
  replay: "eslams.replay.v1",
  publicState: PUBLIC_STATE_VERSION,
  displayFrame: DISPLAY_FRAME_VERSION,
  scene: SCENE_SCHEMA_VERSION,
  renderer: RENDERER_CONTRACT_VERSION,
  adapter: RENDER_ADAPTER_VERSION,
  minimumApp: MOBILE_MINIMUM_APP_VERSION,
  themeTokens: THEME_TOKEN_REFERENCE_VERSION,
  legacyProducer: LEGACY_ARENA_REPLAY_PRODUCER_VERSION,
} as const);

export type ArenaReplayContractVersions = typeof ARENA_REPLAY_CONTRACT_VERSIONS;
