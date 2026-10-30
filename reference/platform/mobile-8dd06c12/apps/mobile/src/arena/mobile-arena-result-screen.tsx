import type { MatchVisibility } from "@eslams/core-types";
import type { BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import {
  MOBILE_MODAL_EXIT_ACCESSIBILITY_DELAY_MS,
  scheduleMobileAccessibilityFocus,
} from "@/accessibility/mobile-accessibility-runtime";
import { MobileBattlefieldBoardCanvas } from "@/battlefield/mobile-battlefield-board-canvas";
import { SystemSymbol } from "@/components/system-symbol";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { MobileArenaResultCelebration } from "./mobile-arena-result-celebration";
import { shareMobileArenaResultImage } from "./mobile-arena-share-result";
import {
  mobileArenaResultPresentation,
  resultVisibilityDescription,
} from "./mobile-arena-result-presentation";

const VISIBILITIES = Object.freeze([
  Object.freeze({ label: "Public", value: "public" as const }),
  Object.freeze({ label: "Followers", value: "followers" as const }),
  Object.freeze({ label: "Only me", value: "only_me" as const }),
]);

export function MobileArenaResultScreen({
  celebrate,
  error,
  onBackToArena,
  onNewOpponent,
  onPlayAgain,
  onVisibilityChange,
  onWatchReplay,
  reducedMotion,
  scene,
  session,
  theme,
  username,
  visibilityBusy,
  watchReplayFocusRef,
}: Readonly<{
  celebrate: boolean;
  error: string | null;
  onBackToArena(): void;
  onNewOpponent(): void;
  onPlayAgain(): void;
  onVisibilityChange(visibility: MatchVisibility): void;
  onWatchReplay(): void;
  reducedMotion: boolean;
  scene: BoardScene;
  session: PublicMobileArenaSession;
  theme: ThemeTokens;
  username: string | null;
  visibilityBusy: boolean;
  watchReplayFocusRef?: RefObject<View | null>;
}>) {
  const { width: viewportWidth } = useWindowDimensions();
  const colors = theme.color;
  const presentation = mobileArenaResultPresentation(session);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const shareCardRef = useRef<View>(null);
  const shareButtonRef = useRef<View>(null);
  const shareCloseButtonRef = useRef<View>(null);
  const shareErrorRef = useRef<Text>(null);
  const resultTitleRef = useRef<Text>(null);
  const shareModalPresented = useRef(false);

  useEffect(() => {
    if (!presentation) return undefined;
    return scheduleMobileAccessibilityFocus(() => resultTitleRef.current);
  }, [presentation, session.sessionId]);

  useEffect(() => {
    if (!shareVisible) {
      shareModalPresented.current = false;
      return undefined;
    }
    if (!shareModalPresented.current) return undefined;
    return scheduleMobileAccessibilityFocus(() => shareError ? shareErrorRef.current : shareCloseButtonRef.current);
  }, [shareError, shareVisible]);

  if (!presentation) return null;
  const shareOutcome = presentation.kind;
  const shareVisibility = presentation.visibility;
  const boardWidth = Math.max(1, Math.min(300, viewportWidth - 72));
  const boardHeight = Math.round(boardWidth * (330 / 354));
  const replayReady = session.resultPublication?.status === "ready";
  const savedToProfile = session.resultPublication?.status === "ready"
    && session.resultPublication.savedToProfile;
  const publicationUnavailable = session.resultPublication?.status === "unavailable";
  const accountLabel = username ?? "You";

  function closeShare(): void {
    setShareVisible(false);
    scheduleMobileAccessibilityFocus(
      () => shareButtonRef.current,
      MOBILE_MODAL_EXIT_ACCESSIBILITY_DELAY_MS,
    );
  }

  async function shareResultImage(): Promise<void> {
    if (shareBusy) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const result = await shareMobileArenaResultImage(shareCardRef, {
        outcome: shareOutcome,
        theme: theme.id,
        visibility: shareVisibility,
        surface: "arena_result",
      });
      if (result === "unavailable") setShareError("Image sharing is not available on this device.");
      else if (result === "failed") setShareError("The result image could not be shared. Try again.");
    } finally {
      setShareBusy(false);
    }
  }

  function selectVisibility(visibility: MatchVisibility): void {
    if (visibility !== "public" || presentation?.visibility === "public") {
      onVisibilityChange(visibility);
      return;
    }
    Alert.alert(
      "Make this replay public?",
      `Anyone will be able to open it, and the result card may include ${accountLabel}.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => onVisibilityChange("public"), text: "Make public" },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.finalBoardWrap}>
          <MobileBattlefieldBoardCanvas
            height={boardHeight}
            reducedMotion
            scene={scene}
            theme={theme}
            width={boardWidth}
          />
        </View>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {celebrate && presentation.showConfetti ? (
            <MobileArenaResultCelebration
              colors={[colors.accent, colors.win, colors.draw, colors.loss]}
              reducedMotion={reducedMotion}
            />
          ) : null}
          <Text accessibilityRole="header" ref={resultTitleRef} style={[styles.title, { color: colors.text }]}>{presentation.title}</Text>
          <Text style={[styles.detail, { color: colors.textSecondary }]}>{presentation.detail}</Text>
          <View style={styles.matchupRow}>
            <Text style={[styles.matchupChip, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}>{accountLabel}</Text>
            <Text style={[styles.vs, { color: colors.textTertiary }]}>vs</Text>
            <Text style={[styles.matchupChip, { backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}>{presentation.opponentName}</Text>
            <Text style={[styles.gameMeta, { color: colors.textTertiary }]}>{presentation.gameLabel} · {presentation.moveLabel}</Text>
          </View>
          {presentation.scoreline ? <Text style={[styles.scoreline, { color: colors.text }]}>{presentation.scoreline}</Text> : null}
          <Text style={[styles.verdict, { color: colors.textTertiary }]}>{presentation.verdict}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onPlayAgain}
            style={[styles.primary, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.primaryLabel, { color: colors.textOnAccent }]}>Play again</Text>
          </Pressable>
          <View style={styles.actionRow}>
            <ResultAction label="New opponent" onPress={onNewOpponent} theme={theme} />
            <ResultAction
              disabled={!replayReady}
              {...(watchReplayFocusRef ? { focusRef: watchReplayFocusRef } : {})}
              label={replayReady ? "Watch replay" : "Preparing replay…"}
              onPress={onWatchReplay}
              theme={theme}
            />
            <ResultAction accent disabled={!replayReady} focusRef={shareButtonRef} label="Share" onPress={() => setShareVisible(true)} theme={theme} />
          </View>

          <View style={styles.visibilityHeader}>
            <Text style={[styles.saved, { color: colors.textTertiary }]}>{savedToProfile
              ? "Saved to your profile"
              : publicationUnavailable ? "Replay unavailable" : "Finalising your replay…"}</Text>
            {visibilityBusy ? <ActivityIndicator color={colors.accent} size="small" /> : null}
          </View>
          <View accessibilityRole="radiogroup" style={[styles.visibilityGroup, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            {VISIBILITIES.map((choice) => {
              const selected = presentation.visibility === choice.value;
              return (
                <Pressable
                  accessibilityLabel={choice.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: visibilityBusy || !savedToProfile }}
                  disabled={visibilityBusy || !savedToProfile}
                  key={choice.value}
                  onPress={() => selectVisibility(choice.value)}
                  style={[
                    styles.visibilityChoice,
                    selected ? { backgroundColor: colors.accent } : null,
                  ]}
                >
                  <Text style={[styles.visibilityLabel, { color: selected ? colors.textOnAccent : colors.textSecondary }]}>{choice.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.visibilityDescription, { color: colors.textTertiary }]}>{resultVisibilityDescription(presentation.visibility)}</Text>
          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.loss }]}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={onBackToArena} style={styles.backButton}>
            <Text style={[styles.backLabel, { color: colors.textTertiary }]}>Back to Arena</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={closeShare}
        onShow={() => {
          shareModalPresented.current = true;
          scheduleMobileAccessibilityFocus(() => shareError ? shareErrorRef.current : shareCloseButtonRef.current);
        }}
        transparent
        visible={shareVisible}
      >
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={closeShare}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={[styles.shareSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.shareHeader}>
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            <Pressable
              accessibilityLabel="Close share card"
              accessibilityRole="button"
            onPress={closeShare}
              ref={shareCloseButtonRef}
              style={[styles.shareCloseButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            >
              <SystemSymbol color={colors.textSecondary} name="close" size={18} />
            </Pressable>
          </View>
          <View
            collapsable={false}
            ref={shareCardRef}
            style={[styles.shareCard, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <View style={styles.brandRow}>
              <Image accessibilityIgnoresInvertColors source={require("../../assets/brand/mark.png")} style={styles.mark} />
              <Text style={[styles.brand, { color: colors.textTertiary }]}>ESLAMS.COM</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.shareTitle, { color: colors.text }]}>{presentation.shareTitle}</Text>
            <View style={styles.shareBoard}>
              <MobileBattlefieldBoardCanvas
                height={205}
                reducedMotion
                scene={scene}
                theme={theme}
                width={220}
              />
            </View>
            <View style={styles.shareMetaRow}>
              <Text style={[styles.shareMatchup, { color: colors.textSecondary }]}>{accountLabel}  vs  {presentation.opponentName}</Text>
              <Text style={[styles.shareMeta, { color: colors.textTertiary }]}>{presentation.gameLabel} · {presentation.moveLabel}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: shareBusy, disabled: shareBusy }}
            disabled={shareBusy}
            onPress={() => { void shareResultImage(); }}
            style={[styles.shareButton, { backgroundColor: colors.accent, opacity: shareBusy ? 0.64 : 1 }]}
            testID="share-result-image"
          >
            {shareBusy ? <ActivityIndicator color={colors.textOnAccent} size="small" /> : <SystemSymbol color={colors.textOnAccent} name="share" size={18} />}
            <Text style={[styles.shareButtonLabel, { color: colors.textOnAccent }]}>{shareBusy ? "Preparing…" : "Share image"}</Text>
          </Pressable>
          {shareError ? <Text accessibilityRole="alert" ref={shareErrorRef} style={[styles.shareError, { color: colors.loss }]}>{shareError}</Text> : null}
          <Text style={[styles.shareNote, { color: colors.textTertiary }]}>Your active theme and the actual final scene are used. Private match links still enforce access.</Text>
        </View>
      </Modal>
    </View>
  );
}

function ResultAction({
  accent = false,
  disabled = false,
  focusRef,
  label,
  onPress,
  theme,
}: Readonly<{
  accent?: boolean;
  disabled?: boolean;
  focusRef?: RefObject<View | null>;
  label: string;
  onPress(): void;
  theme: ThemeTokens;
}>) {
  const colors = theme.color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      ref={focusRef}
      style={[
        styles.secondary,
        {
          backgroundColor: accent ? colors.accentSoft : colors.surface2,
          borderColor: accent ? colors.accentLine : colors.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[styles.secondaryLabel, { color: accent ? colors.accent : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 6 },
  finalBoardWrap: { alignItems: "center", justifyContent: "center", paddingBottom: 14, paddingHorizontal: 16 },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 1, flex: 1, minHeight: 560, overflow: "hidden", paddingBottom: 30, paddingHorizontal: 22, paddingTop: 26 },
  title: { fontSize: 34, fontWeight: "600", letterSpacing: -0.68, lineHeight: 39 },
  detail: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  matchupRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 18 },
  matchupChip: { borderRadius: 999, borderWidth: 1, fontSize: 12.5, fontWeight: "600", overflow: "hidden", paddingHorizontal: 12, paddingVertical: 5 },
  vs: { fontFamily: "monospace", fontSize: 12 },
  gameMeta: { fontFamily: "monospace", fontSize: 12 },
  scoreline: { fontSize: 13, fontWeight: "600", marginTop: 12 },
  verdict: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  primary: { alignItems: "center", borderRadius: 16, justifyContent: "center", marginTop: 20, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12 },
  primaryLabel: { fontSize: 15.5, fontWeight: "600" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 9 },
  secondary: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexBasis: "30%", flexGrow: 1, justifyContent: "center", minHeight: 52, minWidth: 96, paddingHorizontal: 8, paddingVertical: 10 },
  secondaryLabel: { fontSize: 12.5, fontWeight: "600", textAlign: "center" },
  visibilityHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 16, minHeight: 20 },
  saved: { fontSize: 12 },
  visibilityGroup: { borderRadius: 22, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 2, marginTop: 7, padding: 2 },
  visibilityChoice: { alignItems: "center", borderRadius: 999, flex: 1, justifyContent: "center", minHeight: 44, minWidth: 88, paddingHorizontal: 9, paddingVertical: 8 },
  visibilityLabel: { fontSize: 12, fontWeight: "600" },
  visibilityDescription: { fontSize: 12, lineHeight: 16, marginTop: 8 },
  error: { fontSize: 12, lineHeight: 17, marginTop: 10, textAlign: "center" },
  backButton: { alignItems: "center", minHeight: 44, justifyContent: "center", marginTop: 4 },
  backLabel: { fontSize: 12.5 },
  scrim: { backgroundColor: "rgba(0,0,0,0.42)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 },
  shareSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, bottom: 0, left: 0, paddingBottom: 30, paddingHorizontal: 22, paddingTop: 12, position: "absolute", right: 0 },
  shareHeader: { alignItems: "center", minHeight: 44, justifyContent: "center", marginBottom: 8 },
  handle: { borderRadius: 2, height: 4, width: 38 },
  shareCloseButton: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", position: "absolute", right: 0, top: 0, width: 44 },
  shareCard: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 20 },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 14 },
  mark: { height: 20, width: 20 },
  brand: { fontFamily: "monospace", fontSize: 12, letterSpacing: 1.2 },
  shareTitle: { fontSize: 21, fontWeight: "600", letterSpacing: -0.2, lineHeight: 27, marginBottom: 14 },
  shareBoard: { alignItems: "center", marginBottom: 14 },
  shareMetaRow: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  shareMatchup: { flex: 1, fontSize: 12, fontWeight: "600" },
  shareMeta: { fontFamily: "monospace", fontSize: 12 },
  shareButton: { alignItems: "center", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 14, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12 },
  shareButtonLabel: { fontSize: 15, fontWeight: "600" },
  shareError: { fontSize: 12, marginTop: 8, textAlign: "center" },
  shareNote: { fontSize: 12, lineHeight: 16, marginTop: 10, textAlign: "center" },
});
