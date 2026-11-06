import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SystemSymbol } from "@/components/system-symbol";
import { MobileGameBoardCanvas } from "@/renderer/mobile-game-board-canvas";
import { useStartup } from "@/startup/startup-provider";

import { mobileArenaPreviewScene } from "./mobile-arena-preview-scene";
import {
  mobileArenaCurtainPresentation,
  mobileArenaCurtainRevealSession,
  type MobileArenaCurtainLifecycle,
  type MobileArenaFightCard,
} from "./mobile-arena-curtain-state";
import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

const CURTAIN_STAGE_REVEAL_MS = 360;
const REDUCED_MOTION_STAGE_REVEAL_MS = 80;

export function MobileArenaCurtainRiser({
  activeMatchLabel = null,
  fightCard,
  lifecycle,
  onBackToArena,
  onEndCurrent,
  onResumeCurrent,
  onRetry,
  onRevealStage,
  reducedMotion,
}: Readonly<{
  activeMatchLabel?: string | null;
  fightCard: MobileArenaFightCard;
  lifecycle: MobileArenaCurtainLifecycle;
  onBackToArena(): void;
  onEndCurrent?(): void;
  onResumeCurrent?(): void;
  onRetry?(): void;
  onRevealStage?(session: PublicMobileArenaSession): void;
  reducedMotion: boolean;
}>) {
  const { width: viewportWidth } = useWindowDimensions();
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const scene = useMemo(() => mobileArenaPreviewScene(fightCard.gameSlug), [fightCard.gameSlug]);
  const opponentLabel = fightCard.seats.find((seat) => seat.participantKind === "model")?.label
    ?? "Your opponent";
  const presentation = mobileArenaCurtainPresentation(lifecycle, opponentLabel);
  const revealSession = mobileArenaCurtainRevealSession(lifecycle);
  const revealedSessionId = useRef<string | null>(null);
  const contentOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const contentTranslate = useSharedValue(reducedMotion ? 0 : 12);
  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.get(),
    transform: [{ translateY: contentTranslate.get() }],
  }));
  const previewWidth = Math.min(272, Math.max(208, viewportWidth - 104));
  const previewHeight = Math.round(previewWidth * 0.62);
  const retryAfterSeconds = lifecycle.kind === "retryable-engine-error"
    ? lifecycle.retryAfterSeconds ?? 0
    : 0;

  useEffect(() => {
    if (reducedMotion) {
      contentOpacity.set(withTiming(1, { duration: 0 }));
      contentTranslate.set(withTiming(0, { duration: 0 }));
      return;
    }
    contentOpacity.set(withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    }));
    contentTranslate.set(withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    }));
  }, [contentOpacity, contentTranslate, reducedMotion]);

  useEffect(() => {
    if (!revealSession || !onRevealStage
      || revealedSessionId.current === revealSession.sessionId) return;
    revealedSessionId.current = revealSession.sessionId;
    let current = true;
    const reveal = () => {
      if (current) onRevealStage(revealSession);
    };
    if (reducedMotion) {
      const timer = setTimeout(reveal, REDUCED_MOTION_STAGE_REVEAL_MS);
      return () => {
        current = false;
        clearTimeout(timer);
      };
    }
    const timer = setTimeout(() => {
      contentOpacity.set(withTiming(0, {
        duration: 190,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished) runOnJS(reveal)();
      }));
      contentTranslate.set(withTiming(-8, {
        duration: 190,
        easing: Easing.in(Easing.cubic),
      }));
    }, CURTAIN_STAGE_REVEAL_MS);
    return () => {
      current = false;
      clearTimeout(timer);
      cancelAnimation(contentOpacity);
      cancelAnimation(contentTranslate);
    };
  }, [contentOpacity, contentTranslate, onRevealStage, reducedMotion, revealSession]);

  const statusColor = presentation.tone === "danger"
    ? colors.lossText
    : presentation.tone === "success"
      ? colors.winText
      : colors.accent;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        accessibilityLabel={`${fightCard.gameLabel} fight card`}
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
        testID="mobile-arena-curtain"
      >
        <Animated.View
          style={[
            styles.content,
            animatedContentStyle,
          ]}
        >
          {scene ? (
            <View style={[styles.preview, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <MobileGameBoardCanvas
                accessible={false}
                height={previewHeight}
                reducedMotion={reducedMotion}
                scene={scene}
                theme={resolvedTheme}
                width={previewWidth}
              />
            </View>
          ) : null}

          <FightCardParticipants fightCard={fightCard} />
          <Text style={[styles.gameLine, { color: colors.textTertiary }]}>
            {fightCard.gameLabel} · {fightCard.variantLabel}
          </Text>

          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="summary"
            style={styles.statusRow}
          >
            {presentation.busy ? (
              <ActivityIndicator color={statusColor} size="small" />
            ) : (
              <SystemSymbol
                color={statusColor}
                name={presentation.tone === "success" ? "check" : "warning"}
                size={17}
              />
            )}
            <Text style={[styles.statusCopy, { color: colors.textSecondary }]}>{presentation.statusCopy}</Text>
          </View>

          {presentation.title ? (
            <View style={[styles.lifecycleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text accessibilityRole="header" style={[styles.lifecycleTitle, { color: colors.text }]}>{presentation.title}</Text>
              {lifecycle.kind === "active-session-conflict" && activeMatchLabel ? (
                <Text style={[styles.activeMatch, { color: colors.text }]}>{activeMatchLabel}</Text>
              ) : null}
              {lifecycle.kind === "retryable-engine-error" && onRetry ? (
                <RetryAction
                  backgroundColor={colors.accent}
                  key={retryAfterSeconds}
                  onPress={onRetry}
                  retryAfterSeconds={retryAfterSeconds}
                  textColor={colors.textOnAccent}
                />
              ) : null}
              {lifecycle.kind === "session-expired" && onRetry ? (
                <PrimaryAction
                  backgroundColor={colors.accent}
                  label="Sign in again"
                  onPress={onRetry}
                  textColor={colors.textOnAccent}
                />
              ) : null}
              {lifecycle.kind === "active-session-conflict" ? (
                <>
                  {onResumeCurrent ? (
                    <PrimaryAction
                      backgroundColor={colors.accent}
                      label="Resume current match"
                      onPress={onResumeCurrent}
                      textColor={colors.textOnAccent}
                    />
                  ) : null}
                  {onEndCurrent ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={onEndCurrent}
                      style={[styles.secondaryButton, { backgroundColor: colors.lossSoft, borderColor: colors.loss }]}
                    >
                      <Text style={[styles.secondaryLabel, { color: colors.lossText }]}>Exit and start</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              <Pressable accessibilityRole="button" onPress={onBackToArena} style={styles.linkButton}>
                <Text style={[styles.linkLabel, { color: colors.textSecondary }]}>Back to Arena</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RetryAction({
  backgroundColor,
  onPress,
  retryAfterSeconds,
  textColor,
}: Readonly<{
  backgroundColor: ColorValue;
  onPress(): void;
  retryAfterSeconds: number;
  textColor: ColorValue;
}>) {
  const [countdown, setCountdown] = useState(retryAfterSeconds);

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    let remaining = retryAfterSeconds;
    const timer = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      setCountdown(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1_000);
    return () => clearInterval(timer);
  }, [retryAfterSeconds]);

  return (
    <PrimaryAction
      backgroundColor={backgroundColor}
      disabled={countdown > 0}
      label={countdown > 0 ? `Try again in ${countdown}s` : "Try again"}
      onPress={onPress}
      textColor={textColor}
    />
  );
}

function PrimaryAction({
  backgroundColor,
  disabled = false,
  label,
  onPress,
  textColor,
}: Readonly<{
  backgroundColor: ColorValue;
  disabled?: boolean;
  label: string;
  onPress(): void;
  textColor: ColorValue;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor, opacity: disabled ? 0.55 : 1 }]}
    >
      <Text style={[styles.primaryLabel, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function FightCardParticipants({ fightCard }: Readonly<{ fightCard: MobileArenaFightCard }>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  if (fightCard.seats.length === 2) {
    return (
      <View accessibilityLabel={fightCard.seats.map((seat) => seat.label).join(" versus ")} style={styles.headToHead}>
        <Text numberOfLines={1} style={[styles.headToHeadName, { color: colors.text }]}>{fightCard.seats[0]?.label}</Text>
        <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>
        <Text
          numberOfLines={1}
          style={[styles.headToHeadName, styles.opponentName, { borderBottomColor: colors.accent, color: colors.text }]}
        >
          {fightCard.seats[1]?.label}
        </Text>
      </View>
    );
  }
  return (
    <View accessibilityLabel={fightCard.seats.map((seat) => `${seat.seatId}, ${seat.label}`).join(". ")} style={styles.tableSeats}>
      {fightCard.seats.map((seat) => (
        <View
          key={seat.seatId}
          style={[
            styles.tableSeat,
            {
              backgroundColor: seat.participantKind === "human" ? colors.accentSoft : colors.surface,
              borderColor: seat.participantKind === "human" ? colors.accentLine : colors.border,
            },
          ]}
        >
          <Text style={[styles.seatId, { color: colors.textTertiary }]}>{seat.seatId}</Text>
          <Text numberOfLines={1} style={[styles.seatName, { color: colors.text }]}>{seat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  screen: { alignItems: "center", flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 42 },
  content: { alignItems: "center", maxWidth: 390, width: "100%" },
  preview: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginBottom: 28, overflow: "hidden" },
  headToHead: { alignItems: "center", flexDirection: "row", gap: 13, justifyContent: "center", width: "100%" },
  headToHeadName: { flexShrink: 1, fontSize: 20, fontWeight: "700", letterSpacing: -0.2, maxWidth: "42%" },
  opponentName: { borderBottomWidth: 2, paddingBottom: 2 },
  vs: { fontFamily: "monospace", fontSize: 12 },
  tableSeats: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", width: "100%" },
  tableSeat: { borderRadius: 14, borderWidth: 1, minWidth: "46%", paddingHorizontal: 12, paddingVertical: 10 },
  seatId: { fontFamily: "monospace", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase" },
  seatName: { fontSize: 13, fontWeight: "700", marginTop: 3 },
  gameLine: { fontFamily: "monospace", fontSize: 12, marginTop: 12, textAlign: "center", textTransform: "uppercase" },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 9, justifyContent: "center", marginTop: 34, minHeight: 22 },
  statusCopy: { flexShrink: 1, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  lifecycleCard: { alignItems: "stretch", borderRadius: 18, borderWidth: 1, marginTop: 20, padding: 16, width: "100%" },
  lifecycleTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  activeMatch: { fontSize: 12.5, fontWeight: "600", lineHeight: 18, marginTop: 10, textAlign: "center" },
  primaryButton: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", marginTop: 16 },
  primaryLabel: { fontSize: 14.5, fontWeight: "700" },
  secondaryButton: { alignItems: "center", borderRadius: 14, borderWidth: 1, height: 48, justifyContent: "center", marginTop: 9 },
  secondaryLabel: { fontSize: 14.5, fontWeight: "700" },
  linkButton: { alignItems: "center", height: 42, justifyContent: "center", marginTop: 4 },
  linkLabel: { fontSize: 13, fontWeight: "600" },
});
