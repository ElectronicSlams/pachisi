import { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { scheduleMobileAccessibilityFocus } from "@/accessibility/mobile-accessibility-runtime";
import { useStartup } from "@/startup/startup-provider";

export type MobileArenaExitSheetProps = Readonly<{
  busy: boolean;
  error: string | null;
  onCancel(): void;
  onLeave(): void;
  onResign(): void;
  visible: boolean;
}>;

export function MobileArenaExitSheet({
  busy,
  error,
  onCancel,
  onLeave,
  onResign,
  visible,
}: MobileArenaExitSheetProps) {
  const { resolvedTheme } = useStartup();
  const insets = useSafeAreaInsets();
  const colors = resolvedTheme.color;
  const headingRef = useRef<Text>(null);
  const errorRef = useRef<Text>(null);

  useEffect(() => {
    if (!visible) return undefined;
    return scheduleMobileAccessibilityFocus(() => error ? errorRef.current : headingRef.current);
  }, [error, visible]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={busy ? () => undefined : onCancel}
      onShow={() => scheduleMobileAccessibilityFocus(() => error ? errorRef.current : headingRef.current)}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          disabled={busy}
          importantForAccessibility="no-hide-descendants"
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(24, insets.bottom + 16),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          <Text accessibilityRole="header" ref={headingRef} style={[styles.title, { color: colors.text }]}>Leave match?</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>You can resume from Arena while this match remains active.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={onCancel}
            style={[styles.primary, { backgroundColor: colors.accent, opacity: busy ? 0.62 : 1 }]}
          >
            <Text style={[styles.primaryLabel, { color: colors.textOnAccent }]}>Keep playing</Text>
          </Pressable>
          <Pressable
            accessibilityHint="The match continues and remains available from Arena."
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={onLeave}
            style={[styles.secondary, { backgroundColor: colors.surface2, borderColor: colors.border, opacity: busy ? 0.62 : 1 }]}
          >
            <Text style={[styles.secondaryLabel, { color: colors.text }]}>Leave · keep the match running</Text>
          </Pressable>
          <Pressable
            accessibilityHint="This records an explicit rated loss when the match is otherwise eligible."
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={onResign}
            style={[styles.secondary, { backgroundColor: colors.surface, borderColor: colors.border, opacity: busy ? 0.62 : 1 }]}
          >
            <Text style={[styles.secondaryLabel, { color: colors.loss }]}>{busy ? "Resigning…" : "Resign"}</Text>
          </Pressable>
          {error ? <Text accessibilityRole="alert" ref={errorRef} style={[styles.error, { color: colors.loss }]}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.38)" },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  handle: { alignSelf: "center", borderRadius: 2, height: 4, marginBottom: 18, width: 38 },
  title: { fontSize: 19, fontWeight: "700" },
  body: { fontSize: 13, lineHeight: 19, marginBottom: 18, marginTop: 6 },
  primary: { alignItems: "center", borderRadius: 16, height: 50, justifyContent: "center", marginBottom: 9 },
  primaryLabel: { fontSize: 15, fontWeight: "700" },
  secondary: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 48, justifyContent: "center", marginBottom: 9 },
  secondaryLabel: { fontSize: 14, fontWeight: "600" },
  error: { fontSize: 12, lineHeight: 17, marginTop: 2, textAlign: "center" },
});
