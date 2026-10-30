import {
  GAME_CATALOG_BY_SLUG,
  type GameCatalogEntry,
} from "@eslams/core-types";
import { useRef } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { scheduleMobileAccessibilityFocus } from "@/accessibility/mobile-accessibility-runtime";
import { SystemSymbol } from "@/components/system-symbol";
import { useStartup } from "@/startup/startup-provider";
import { mobileGameRuleSections } from "./mobile-game-rule-sections";

export function MobileGameRulesContent({ game }: Readonly<{ game: GameCatalogEntry }>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  return (
    <View style={styles.sections}>
      {mobileGameRuleSections(game).map((rule) => (
        <View key={rule.title} style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.text }]}>
            {rule.title}
          </Text>
          <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{rule.body}</Text>
        </View>
      ))}
    </View>
  );
}

export function MobileGameRulesSheet({
  gameSlug,
  onClose,
  reducedMotion,
}: Readonly<{
  gameSlug: string;
  onClose(): void;
  reducedMotion: boolean;
}>) {
  const game = GAME_CATALOG_BY_SLUG[gameSlug];
  const { resolvedTheme } = useStartup();
  const insets = useSafeAreaInsets();
  const closeRef = useRef<View>(null);
  const colors = resolvedTheme.color;

  if (!game) return null;

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
        style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(18, insets.bottom) }]}
      >
        <View style={[styles.header, { borderBottomColor: colors.borderFaint }]}>
          <View style={styles.headingCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{game.name}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Rules, scoring, examples, and accessible controls</Text>
          </View>
          <Pressable
            accessibilityHint="Returns to the match"
            accessibilityLabel="Close rules"
            accessibilityRole="button"
            onPress={onClose}
            ref={closeRef}
            style={[styles.close, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SystemSymbol color={colors.textSecondary} name="close" size={18} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MobileGameRulesContent game={game} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  headingCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  close: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  content: { paddingBottom: 28, paddingHorizontal: 18, paddingTop: 18 },
  sections: { gap: 20 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  sectionBody: { fontSize: 14, lineHeight: 21 },
});
