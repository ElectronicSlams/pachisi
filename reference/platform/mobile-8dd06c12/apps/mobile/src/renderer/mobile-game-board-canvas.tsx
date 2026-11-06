import { drawRenderPlan, GAME_RENDERER_REGISTRY } from "@eslams/board-skia/native";
import type { MotionState, RenderCommand } from "@eslams/board-skia";
import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { Canvas, Picture, createPicture } from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
} from "react-native";

import { MobileBoardAccessibilityOverlay } from "@/accessibility/mobile-board-accessibility-overlay";
import { useMobileScreenReaderEnabled } from "@/accessibility/mobile-screen-reader-enabled";
import { useMobileBoardTypeface } from "./mobile-board-typeface-provider";
import { mobileGameBoardTheme } from "./mobile-game-board-theme";

export function MobileGameBoardCanvas({
  accessible = true,
  activeNodeId = null,
  height,
  lastActionTargetId = null,
  motionBeat = "idle",
  onAction,
  onActionStart,
  reducedMotion,
  scene,
  theme,
  width,
}: Readonly<{
  accessible?: boolean;
  activeNodeId?: string | null;
  height: number;
  lastActionTargetId?: string | null;
  motionBeat?: MotionState["beat"];
  onAction?(target: ActionTarget): void;
  onActionStart?(target: ActionTarget): void;
  reducedMotion: boolean;
  scene: BoardScene;
  theme: ThemeTokens;
  width: number;
}>) {
  const renderer = GAME_RENDERER_REGISTRY[scene.gameSlug];
  if (!renderer) throw new TypeError(`Missing mobile renderer for ${scene.gameSlug}.`);
  const typeface = useMobileBoardTypeface();
  const [previewNodeId, setPreviewNodeId] = useState<string | null>(null);
  const screenReaderEnabled = useMobileScreenReaderEnabled(accessible);
  const resolvedActiveNodeId = previewNodeId ?? activeNodeId;
  const showLegalTargets = onAction !== undefined;
  const renderTheme = mobileGameBoardTheme(scene.rendererFamily, theme);
  const picture = useMemo(() => createPicture((canvas) => {
    const motion: MotionState = {
      progress: 1,
      beat: scene.summary.terminal ? "result" : motionBeat,
      reducedMotion,
      qualityTier: "balanced",
      viewport: { width, height, pixelRatio: 2 },
      lastActionTargetId,
      activeNodeId: resolvedActiveNodeId,
    };
    const plan = renderer.createPlan(scene, renderTheme, motion);
    const visiblePlan = showLegalTargets
      ? Object.freeze({ ...plan, commands: Object.freeze([
        ...plan.commands,
        ...legalTargetCommands(plan.hitZones, scene, renderTheme.color.accent, resolvedActiveNodeId),
      ]) })
      : plan;
    drawRenderPlan(canvas, visiblePlan, typeface ?? undefined);
  }, { width, height }), [height, lastActionTargetId, motionBeat, reducedMotion, renderer, renderTheme, resolvedActiveNodeId, scene, showLegalTargets, typeface, width]);

  useEffect(() => () => picture.dispose(), [picture]);

  const board = (
    <Canvas importantForAccessibility="no-hide-descendants" style={styles.canvas}>
      <Picture picture={picture} />
    </Canvas>
  );
  if (onAction) {
    const targetAtPoint = (event: GestureResponderEvent | NativeSyntheticEvent<NativeTouchEvent>) => {
      const target = renderer.hitTest({
        x: Math.max(0, Math.min(1, event.nativeEvent.locationX / width)),
        y: Math.max(0, Math.min(1, event.nativeEvent.locationY / height)),
      }, scene);
      return target && !target.disabled ? target : null;
    };
    const triggerAtPoint = (event: GestureResponderEvent) => {
      const target = targetAtPoint(event);
      if (target && !target.disabled) onAction(target);
    };
    return (
      <View style={{ height, width }}>
        <Pressable
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onPress={triggerAtPoint}
          onPressIn={(event) => {
            const target = targetAtPoint(event);
            setPreviewNodeId(target?.id ?? null);
            if (target) onActionStart?.(target);
          }}
          onPressOut={() => setPreviewNodeId(null)}
          onTouchMove={(event) => {
            const targetId = targetAtPoint(event)?.id ?? null;
            setPreviewNodeId((current) => current === targetId ? current : targetId);
          }}
          style={styles.touchSurface}
        >
          {board}
        </Pressable>
        {screenReaderEnabled ? (
          <MobileBoardAccessibilityOverlay
            onAction={onAction}
            scene={scene}
            theme={theme}
          />
        ) : null}
      </View>
    );
  }
  return (
    <View style={{ height, width }}>
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.touchSurface}
      >
        {board}
      </View>
      {screenReaderEnabled ? (
        <MobileBoardAccessibilityOverlay
          scene={scene}
          theme={theme}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, pointerEvents: "none" },
  touchSurface: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
});

function legalTargetCommands(
  hitZones: readonly Readonly<{ id: string; rect: Readonly<{ x: number; y: number; width: number; height: number }>; actionTargetId: string }>[],
  scene: BoardScene,
  accent: string,
  activeNodeId: string | null,
): readonly RenderCommand[] {
  const enabled = new Set(scene.actionTargets.flatMap((target) => target.disabled ? [] : [target.id]));
  const seen = new Set<string>();
  return hitZones.flatMap((zone) => {
    if (!enabled.has(zone.actionTargetId) || seen.has(zone.actionTargetId)) return [];
    seen.add(zone.actionTargetId);
    const center = {
      x: zone.rect.x + zone.rect.width / 2,
      y: zone.rect.y + zone.rect.height / 2,
    };
    const radius = Math.max(3, Math.min(7, Math.min(zone.rect.width, zone.rect.height) * 0.1));
    const active = activeNodeId === zone.actionTargetId;
    return [
      Object.freeze({
        kind: "circle" as const,
        id: `legal-target-halo:${zone.actionTargetId}`,
        center,
        radius: radius * (active ? 2.6 : 1.8),
        style: Object.freeze({ color: accent, alpha: active ? 0.34 : 0.18 }),
      }),
      Object.freeze({
        kind: "circle" as const,
        id: `legal-target:${zone.actionTargetId}`,
        center,
        radius: radius * (active ? 1.3 : 1),
        style: Object.freeze({ color: accent, alpha: active ? 0.58 : 0.88 }),
      }),
    ];
  });
}
