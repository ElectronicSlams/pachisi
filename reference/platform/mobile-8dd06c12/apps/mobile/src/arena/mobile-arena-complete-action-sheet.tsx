import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { scheduleMobileAccessibilityFocus } from "@/accessibility/mobile-accessibility-runtime";
import { SystemSymbol } from "@/components/system-symbol";
import { useStartup } from "@/startup/startup-provider";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";
import {
  mobileCompleteActionAccessibilityLabel,
  mobileCompleteActionSummary,
} from "./mobile-arena-complete-actions";

export function MobileArenaCompleteActionSheet({
  actions,
  busyToken,
  expectedActionCount,
  onClose,
  onRefresh,
  onSubmit,
  reducedMotion,
}: Readonly<{
  actions: readonly ArenaStageLegalAction[];
  busyToken: string | null;
  expectedActionCount: number | null;
  onClose(): void;
  onRefresh(): Promise<void>;
  onSubmit(action: ArenaStageLegalAction): void;
  reducedMotion: boolean;
}>) {
  const { resolvedTheme } = useStartup();
  const insets = useSafeAreaInsets();
  const closeRef = useRef<View>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const colors = resolvedTheme.color;
  const summary = mobileCompleteActionSummary(actions, expectedActionCount);

  return (
    <Modal
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onClose}
      onShow={() => scheduleMobileAccessibilityFocus(() => closeRef.current)}
      presentationStyle="pageSheet"
      visible
    >
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(16, insets.bottom),
            paddingTop: insets.top,
          },
        ]}
        testID="mobile-arena-complete-action-sheet"
      >
        <View style={[styles.header, { borderBottomColor: colors.borderFaint }] }>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>All actions</Text>
            <Text
              accessibilityLiveRegion={summary.complete ? "polite" : "assertive"}
              accessibilityRole={summary.complete ? "summary" : "alert"}
              style={[styles.summary, { color: summary.complete ? colors.textSecondary : colors.drawText }]}
            >
              {summary.description}
            </Text>
            {!summary.complete ? (
              <Pressable
                accessibilityHint="Requests the latest authoritative action set without closing this sheet"
                accessibilityRole="button"
                accessibilityState={{ busy: refreshBusy, disabled: refreshBusy }}
                disabled={refreshBusy}
                onPress={() => {
                  setRefreshBusy(true);
                  setRefreshError(false);
                  void onRefresh()
                    .catch(() => setRefreshError(true))
                    .finally(() => setRefreshBusy(false));
                }}
                style={[styles.refresh, { borderColor: colors.border, opacity: refreshBusy ? 0.65 : 1 }]}
              >
                <Text style={[styles.refreshLabel, { color: colors.accent }]}>
                  {refreshBusy ? "Refreshing actions…" : "Refresh actions"}
                </Text>
              </Pressable>
            ) : null}
            {refreshError ? (
              <Text accessibilityRole="alert" style={[styles.refreshError, { color: colors.loss }]}>Actions could not be refreshed. Check your connection and try again.</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityHint="Returns to the match"
            accessibilityLabel="Close all actions"
            accessibilityRole="button"
            onPress={onClose}
            ref={closeRef}
            style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SystemSymbol color={colors.textSecondary} name="close" size={18} />
          </Pressable>
        </View>

        <FlatList
          accessibilityLabel="Every action supplied by the live match"
          accessibilityRole="list"
          contentContainerStyle={styles.list}
          data={actions}
          initialNumToRender={18}
          keyExtractor={(action, index) => `${action.token}:${index}`}
          ListEmptyComponent={(
            <Text accessibilityRole="alert" style={[styles.empty, { color: colors.textSecondary }]}>No actions are available in this position.</Text>
          )}
          maxToRenderPerBatch={24}
          renderItem={({ index, item: action }) => {
            const rowKey = `${action.token}:${index}`;
            const disabled = action.disabledReason !== null || busyToken !== null || refreshBusy;
            const confirming = confirmingKey === rowKey;
            return (
              <Pressable
                accessibilityHint={action.disabledReason ?? (action.confirm && !confirming ? "Double-tap once, then activate again to confirm." : undefined)}
                accessibilityLabel={confirming ? `Confirm ${action.label}` : mobileCompleteActionAccessibilityLabel(action)}
                accessibilityRole="button"
                accessibilityState={{ busy: busyToken === action.token, disabled }}
                disabled={disabled}
                onPress={() => {
                  if (action.confirm && !confirming) {
                    setConfirmingKey(rowKey);
                    return;
                  }
                  setConfirmingKey(null);
                  onSubmit(action);
                }}
                style={[
                  styles.row,
                  {
                    backgroundColor: confirming ? colors.accentSoft : colors.surface,
                    borderColor: confirming ? colors.accent : colors.border,
                    opacity: disabled ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.rowCopy}>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>{confirming ? `Confirm ${action.label}` : action.label}</Text>
                  {action.category || action.group ? (
                    <Text style={[styles.metadata, { color: colors.textTertiary }]}>{[action.category, action.group].filter(Boolean).join(" · ")}</Text>
                  ) : null}
                  {action.disabledReason ? (
                    <Text style={[styles.disabledReason, { color: colors.textTertiary }]}>Unavailable · {action.disabledReason}</Text>
                  ) : action.confirm && !confirming ? (
                    <Text style={[styles.confirmCopy, { color: colors.textSecondary }]}>Confirmation required</Text>
                  ) : null}
                </View>
                <Text style={[styles.actionState, { color: disabled ? colors.textTertiary : colors.accent }]}>
                  {busyToken === action.token ? "Submitting…" : action.disabledReason ? "Unavailable" : confirming ? "Confirm" : "Choose"}
                </Text>
              </Pressable>
            );
          }}
          windowSize={7}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: { alignItems: "flex-start", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  headerCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  summary: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  refresh: { alignItems: "flex-start", alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, justifyContent: "center", marginTop: 10, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 },
  refreshLabel: { fontSize: 13, fontWeight: "700", lineHeight: 18 },
  refreshError: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  close: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  list: { gap: 8, paddingBottom: 32, paddingHorizontal: 16, paddingTop: 14 },
  row: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 58, paddingHorizontal: 14, paddingVertical: 10 },
  rowCopy: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  metadata: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  disabledReason: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  confirmCopy: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  actionState: { fontSize: 12, fontWeight: "700" },
  empty: { fontSize: 14, lineHeight: 20, paddingHorizontal: 18, paddingVertical: 32, textAlign: "center" },
});
