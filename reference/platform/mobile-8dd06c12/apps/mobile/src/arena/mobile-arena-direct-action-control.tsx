import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  MOBILE_MODAL_EXIT_ACCESSIBILITY_DELAY_MS,
  scheduleMobileAccessibilityFocus,
} from "@/accessibility/mobile-accessibility-runtime";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";
import { SystemSymbol } from "@/components/system-symbol";
import { useStartup } from "@/startup/startup-provider";

const INLINE_ACTION_LIMIT = 4;
const INLINE_ACTIONS_WITH_OVERFLOW = 3;

export function MobileArenaDirectActionControl({
  actions,
  busyToken,
  onSubmit,
}: Readonly<{
  actions: readonly ArenaStageLegalAction[];
  busyToken: string | null;
  onSubmit(action: ArenaStageLegalAction): void;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const closeButtonRef = useRef<View>(null);
  const moreButtonRef = useRef<View>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [query, setQuery] = useState("");
  const hasOverflow = actions.length > INLINE_ACTION_LIMIT;
  const inlineActions = hasOverflow ? actions.slice(0, INLINE_ACTIONS_WITH_OVERFLOW) : actions;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredActions = normalizedQuery.length === 0
    ? actions
    : actions.filter((action) => [action.label, action.shortLabel, action.verb, action.group]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));

  function closeSheet(): void {
    setSheetVisible(false);
    setQuery("");
    scheduleMobileAccessibilityFocus(
      () => moreButtonRef.current,
      MOBILE_MODAL_EXIT_ACCESSIBILITY_DELAY_MS,
    );
  }

  function submit(action: ArenaStageLegalAction): void {
    if (busyToken !== null) return;
    closeSheet();
    onSubmit(action);
  }

  return (
    <>
      <View style={styles.inlineActions}>
        {inlineActions.map((action) => (
          <ActionButton
            action={action}
            busyToken={busyToken}
            key={action.token}
            onPress={() => submit(action)}
          />
        ))}
        {hasOverflow ? (
          <Pressable
            accessibilityHint="Opens the complete searchable list of legal actions."
            accessibilityRole="button"
            accessibilityState={{ disabled: busyToken !== null }}
            disabled={busyToken !== null}
            onPress={() => setSheetVisible(true)}
            ref={moreButtonRef}
            style={({ pressed }) => [
              styles.moreButton,
              {
                backgroundColor: pressed ? colors.accentSoft : colors.surface,
                borderColor: colors.borderStrong,
                opacity: busyToken !== null ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.moreButtonLabel, { color: colors.text }]}>All {actions.length} moves</Text>
          </Pressable>
        ) : null}
      </View>
      <Modal
        animationType="slide"
        onRequestClose={closeSheet}
        onShow={() => scheduleMobileAccessibilityFocus(() => closeButtonRef.current)}
        presentationStyle="pageSheet"
        visible={sheetVisible}
      >
        <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View accessibilityViewIsModal style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <View>
                <Text accessibilityRole="header" style={[styles.sheetTitle, { color: colors.text }]}>Choose a legal move</Text>
                <Text style={[styles.sheetCount, { color: colors.textTertiary }]}>{actions.length} available</Text>
              </View>
              <Pressable
                accessibilityLabel="Close legal moves"
                accessibilityRole="button"
                onPress={closeSheet}
                ref={closeButtonRef}
                style={[styles.closeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <SystemSymbol color={colors.text} name="close" size={19} />
              </Pressable>
            </View>
            <View style={[styles.searchField, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SystemSymbol color={colors.textTertiary} name="search" size={17} />
              <TextInput
                accessibilityLabel="Search legal moves"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search moves"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
                value={query}
              />
            </View>
            <FlatList
              accessibilityLabel="Legal moves"
              accessibilityRole="list"
              contentContainerStyle={styles.actionList}
              data={filteredActions}
              initialNumToRender={16}
              keyExtractor={(action) => action.token}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={(
                <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>No legal moves match that search.</Text>
              )}
              maxToRenderPerBatch={24}
              renderItem={({ item: action }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: busyToken === action.token, disabled: busyToken !== null }}
                  disabled={busyToken !== null}
                  onPress={() => submit(action)}
                  style={({ pressed }) => [
                    styles.listAction,
                    {
                      backgroundColor: pressed ? colors.accentSoft : colors.surface,
                      borderColor: colors.border,
                      opacity: busyToken !== null && busyToken !== action.token ? 0.48 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.listActionLabel, { color: colors.text }]}>{busyToken === action.token ? "Sending…" : action.label}</Text>
                  {action.promptLabel ? <Text style={[styles.listActionPrompt, { color: colors.textTertiary }]}>{action.promptLabel}</Text> : null}
                </Pressable>
              )}
              windowSize={7}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function ActionButton({
  action,
  busyToken,
  onPress,
}: Readonly<{
  action: ArenaStageLegalAction;
  busyToken: string | null;
  onPress(): void;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: busyToken === action.token, disabled: busyToken !== null }}
      disabled={busyToken !== null}
      onPress={onPress}
      style={({ pressed }) => [
        styles.inlineAction,
        {
          backgroundColor: pressed ? colors.accentSoft : colors.surface,
          borderColor: colors.borderStrong,
          opacity: busyToken !== null && busyToken !== action.token ? 0.48 : 1,
        },
      ]}
    >
      <Text style={[styles.inlineActionLabel, { color: colors.text }]}>
        {busyToken === action.token ? "Sending…" : action.shortLabel ?? action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 10, width: "100%" },
  inlineAction: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexGrow: 1, justifyContent: "center", minHeight: 50, minWidth: 96, paddingHorizontal: 14, paddingVertical: 10 },
  inlineActionLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  moreButton: { alignItems: "center", borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 50, minWidth: 110, paddingHorizontal: 14, paddingVertical: 10 },
  moreButtonLabel: { fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  sheet: { flex: 1 },
  sheetContent: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  sheetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sheetTitle: { fontSize: 21, fontWeight: "700" },
  sheetCount: { fontFamily: "monospace", fontSize: 12, marginTop: 3, textTransform: "uppercase" },
  closeButton: { alignItems: "center", borderRadius: 12, borderWidth: 1, minHeight: 44, justifyContent: "center", minWidth: 44 },
  searchField: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 16, paddingHorizontal: 13 },
  searchInput: { flex: 1, fontSize: 14, minHeight: 48, paddingVertical: 10 },
  actionList: { gap: 8, paddingBottom: 28, paddingTop: 12 },
  listAction: { borderRadius: 14, borderWidth: 1, minHeight: 54, paddingHorizontal: 14, paddingVertical: 10 },
  listActionLabel: { fontSize: 14, fontWeight: "600" },
  listActionPrompt: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  emptyCopy: { fontSize: 13, lineHeight: 19, paddingHorizontal: 12, paddingTop: 28, textAlign: "center" },
});
