import type { BoardScene } from "@eslams/game-render-contract";
import type { ThemeTokens } from "@eslams/theme-tokens";
import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { scheduleMobileAccessibilityFocus } from "@/accessibility/mobile-accessibility-runtime";
import { SystemSymbol } from "@/components/system-symbol";
import { MobileGameBoardCanvas } from "@/renderer/mobile-game-board-canvas";
import { MOBILE_BOARD_ZOOM_LEVELS, mobileBoardZoomState } from "./mobile-arena-board-zoom";
import { mobileArenaStageBoardSize } from "./mobile-arena-stage-layout";

export function MobileArenaBoardZoomSheet({
  onClose,
  scene,
  theme,
}: Readonly<{
  onClose(): void;
  scene: BoardScene;
  theme: ThemeTokens;
}>) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const closeRef = useRef<View>(null);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = mobileBoardZoomState(zoomIndex);
  const baseSize = mobileArenaStageBoardSize(viewportWidth, viewportHeight, scene.rendererFamily);
  const boardWidth = Math.round(baseSize.width * zoom.scale);
  const boardHeight = Math.round(baseSize.height * zoom.scale);
  const colors = theme.color;

  return (
    <Modal animationType="none" onRequestClose={onClose} onShow={() => scheduleMobileAccessibilityFocus(() => closeRef.current)} presentationStyle="fullScreen" visible>
      <SafeAreaView
        accessibilityViewIsModal
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.borderFaint }] }>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Board zoom</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Use the controls, then scroll to inspect the position.</Text>
          </View>
          <Pressable
            accessibilityHint="Returns to the match"
            accessibilityLabel="Close board zoom"
            accessibilityRole="button"
            onPress={onClose}
            ref={closeRef}
            style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SystemSymbol color={colors.textSecondary} name="close" size={18} />
          </Pressable>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Zoom out"
            accessibilityRole="button"
            accessibilityState={{ disabled: !zoom.canZoomOut }}
            disabled={!zoom.canZoomOut}
            onPress={() => setZoomIndex((current) => Math.max(0, current - 1))}
            style={[styles.control, { borderColor: colors.border, opacity: zoom.canZoomOut ? 1 : 0.5 }]}
          >
            <Text style={[styles.controlLabel, { color: colors.text }]}>−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Reset board zoom, currently ${zoom.label}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: zoom.index === 0 }}
            disabled={zoom.index === 0}
            onPress={() => setZoomIndex(0)}
            style={[styles.reset, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.resetLabel, { color: colors.text }]}>{zoom.label}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Zoom in"
            accessibilityRole="button"
            accessibilityState={{ disabled: !zoom.canZoomIn }}
            disabled={!zoom.canZoomIn}
            onPress={() => setZoomIndex((current) => Math.min(MOBILE_BOARD_ZOOM_LEVELS.length - 1, current + 1))}
            style={[styles.control, { borderColor: colors.border, opacity: zoom.canZoomIn ? 1 : 0.5 }]}
          >
            <Text style={[styles.controlLabel, { color: colors.text }]}>+</Text>
          </Pressable>
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.zoomStatus, { color: colors.textSecondary }]}>
          Board zoom {zoom.label}
        </Text>

        <ScrollView
          contentContainerStyle={styles.verticalContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={styles.viewport}
        >
          <ScrollView
            contentContainerStyle={styles.horizontalContent}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
          >
            <View style={[styles.boardFrame, { backgroundColor: colors.surface, borderColor: colors.border }] }>
              <MobileGameBoardCanvas
                height={boardHeight}
                reducedMotion
                scene={scene}
                theme={theme}
                width={boardWidth}
              />
            </View>
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  headerCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  close: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  controls: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12 },
  zoomStatus: { fontSize: 12, lineHeight: 16, paddingBottom: 8, textAlign: "center" },
  control: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 52 },
  controlLabel: { fontSize: 22, fontWeight: "600" },
  reset: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", minWidth: 124, paddingHorizontal: 14 },
  resetLabel: { fontSize: 13, fontWeight: "700" },
  viewport: { flex: 1 },
  verticalContent: { flexGrow: 1, justifyContent: "center", paddingBottom: 24, paddingVertical: 12 },
  horizontalContent: { alignItems: "center", flexGrow: 1, justifyContent: "center", paddingHorizontal: 16 },
  boardFrame: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
});
