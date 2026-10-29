export const MAX_AVATAR_IMAGE_RETRIES = 2;
export const AVATAR_IMAGE_RETRY_DELAYS_MS = [1_000, 3_000] as const;

export type AvatarImageLoadPhase = "empty" | "loading" | "decoded" | "retry-wait" | "exhausted";

export type AvatarImageLoadState = Readonly<{
  source: string | null;
  phase: AvatarImageLoadPhase;
  retryGeneration: number;
  failedAttempts: number;
}>;

export type AvatarImageLoadAction =
  | Readonly<{ type: "source-changed"; source: string | null }>
  | Readonly<{ type: "decoded" | "failed"; source: string; retryGeneration: number }>
  | Readonly<{ type: "retry-requested"; source: string }>;

export function createAvatarImageLoadState(source: string | null): AvatarImageLoadState {
  return {
    source,
    phase: source ? "loading" : "empty",
    retryGeneration: 0,
    failedAttempts: 0,
  };
}

export function avatarImageRetryDelayMs(failedAttempts: number): number {
  const index = Math.max(0, Math.min(
    AVATAR_IMAGE_RETRY_DELAYS_MS.length - 1,
    Math.trunc(failedAttempts) - 1,
  ));
  return AVATAR_IMAGE_RETRY_DELAYS_MS[index] ?? 3_000;
}

/**
 * Returns the state that is safe to render for the current prop immediately.
 * React applies the matching source-change action after commit, so a new source
 * never inherits a prior source's decoded or exhausted presentation.
 */
export function avatarImageLoadStateForSource(
  state: AvatarImageLoadState,
  source: string | null,
): AvatarImageLoadState {
  return state.source === source ? state : createAvatarImageLoadState(source);
}

export function reduceAvatarImageLoadState(
  state: AvatarImageLoadState,
  action: AvatarImageLoadAction,
): AvatarImageLoadState {
  if (action.type === "source-changed") {
    return state.source === action.source ? state : createAvatarImageLoadState(action.source);
  }

  if (state.source !== action.source) {
    return state;
  }
  if (action.type === "retry-requested") {
    if (state.phase !== "retry-wait" || state.failedAttempts > MAX_AVATAR_IMAGE_RETRIES) {
      return state;
    }
    return {
      ...state,
      phase: "loading",
      retryGeneration: state.retryGeneration + 1,
    };
  }

  if (state.phase !== "loading" || state.retryGeneration !== action.retryGeneration) {
    return state;
  }
  if (action.type === "decoded") {
    return {
      ...state,
      phase: "decoded",
      failedAttempts: 0,
    };
  }

  const failedAttempts = state.failedAttempts + 1;
  return {
    ...state,
    phase: failedAttempts > MAX_AVATAR_IMAGE_RETRIES ? "exhausted" : "retry-wait",
    failedAttempts,
  };
}
