"use client";

import {
  useEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  avatarImageRetryDelayMs,
  avatarImageLoadStateForSource,
  createAvatarImageLoadState,
  reduceAvatarImageLoadState,
  type AvatarImageLoadAction,
} from "../lib/avatar-image-load-state";

export type AvatarProps = {
  readonly image?: string | null;
  readonly username?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly label?: string;
  readonly className?: string;
  readonly imageClassName?: string;
  readonly size?: number;
  readonly fallback?: ReactNode;
  readonly style?: CSSProperties;
  /** Eagerly load an above-the-fold avatar. Lazy loading remains the default. */
  readonly priority?: boolean;
  /** Hide redundant avatar semantics when adjacent text already names it. */
  readonly decorative?: boolean;
};

export function Avatar({
  image,
  username,
  name,
  email,
  label,
  className,
  imageClassName,
  size,
  fallback,
  style,
  priority = false,
  decorative = false,
}: AvatarProps) {
  const source = image || null;
  const [loadState, dispatchLoad] = useReducer(
    reduceAvatarImageLoadState,
    source,
    createAvatarImageLoadState,
  );
  const activeLoadState = avatarImageLoadStateForSource(loadState, source);
  const imageRef = useRef<HTMLImageElement>(null);
  const display = username ?? name ?? email ?? "User";
  const alt = label ?? `${display} avatar`;
  const imageIsDecoded = activeLoadState.phase === "decoded";
  const shouldRenderImage = source !== null
    && (activeLoadState.phase === "loading" || activeLoadState.phase === "decoded");
  const sizing = size ? { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) } : {};
  const avatarStyle: CSSProperties = {
    ...sizing,
    overflow: "hidden",
    background: imageIsDecoded ? "var(--surface-2)" : "var(--surface-3)",
    color: imageIsDecoded ? "transparent" : "var(--text)",
    ...style,
    position: style?.position ?? "relative",
  };

  useEffect(() => {
    dispatchLoad({ type: "source-changed", source });
  }, [source]);

  useEffect(() => {
    const element = imageRef.current;
    if (!source || activeLoadState.phase !== "loading" || !element?.complete) {
      return;
    }
    void revealDecodedImage(
      element,
      source,
      activeLoadState.retryGeneration,
      dispatchLoad,
    );
  }, [activeLoadState.phase, activeLoadState.retryGeneration, source]);

  useEffect(() => {
    if (!source || activeLoadState.phase !== "retry-wait") {
      return;
    }
    const requestRetryWhenVisible = () => {
      if (document.visibilityState === "visible") {
        dispatchLoad({ type: "retry-requested", source });
      }
    };
    const automaticRetry = window.setTimeout(
      requestRetryWhenVisible,
      avatarImageRetryDelayMs(activeLoadState.failedAttempts),
    );
    window.addEventListener("online", requestRetryWhenVisible);
    window.addEventListener("focus", requestRetryWhenVisible);
    document.addEventListener("visibilitychange", requestRetryWhenVisible);
    return () => {
      window.clearTimeout(automaticRetry);
      window.removeEventListener("online", requestRetryWhenVisible);
      window.removeEventListener("focus", requestRetryWhenVisible);
      document.removeEventListener("visibilitychange", requestRetryWhenVisible);
    };
  }, [activeLoadState.failedAttempts, activeLoadState.phase, source]);

  return (
    <span
      className={className}
      style={avatarStyle}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": alt, title: alt })}
    >
      <span
        aria-hidden="true"
        className="avatar-fallback"
        style={{ visibility: imageIsDecoded ? "hidden" : "visible" }}
      >
        {fallback ?? initialsForAvatar(display)}
      </span>
      {shouldRenderImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Raw img preserves the avatar decode/retry state machine; Next image optimization is globally disabled. // react-doctor-disable-next-line react-doctor/nextjs-no-img-element
        <img
          key={`${source}:${activeLoadState.retryGeneration}`}
          ref={imageRef}
          className={`avatar-image${imageClassName ? ` ${imageClassName}` : ""}`}
          src={source}
          alt=""
          aria-hidden="true"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={(event) => void revealDecodedImage(
            event.currentTarget,
            source,
            activeLoadState.retryGeneration,
            dispatchLoad,
          )}
          onError={() => dispatchLoad({
            type: "failed",
            source,
            retryGeneration: activeLoadState.retryGeneration,
          })}
          style={{ opacity: imageIsDecoded ? 1 : 0 }}
        />
      ) : null}
    </span>
  );
}

async function revealDecodedImage(
  element: HTMLImageElement,
  source: string,
  retryGeneration: number,
  dispatchLoad: Dispatch<AvatarImageLoadAction>,
): Promise<void> {
  try {
    await element.decode();
    if (!element.isConnected || element.getAttribute("src") !== source) {
      return;
    }
    if (element.naturalWidth <= 0 || element.naturalHeight <= 0) {
      throw new Error("avatar_image_has_no_decoded_pixels");
    }
    dispatchLoad({ type: "decoded", source, retryGeneration });
  } catch {
    if (element.isConnected && element.getAttribute("src") === source) {
      dispatchLoad({ type: "failed", source, retryGeneration });
    }
  }
}

function initialsForAvatar(value: string): string {
  const words = value.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) {
    return "U";
  }
  if (words.length === 1) {
    return words[0]?.slice(0, 2).toUpperCase() ?? "U";
  }
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}
