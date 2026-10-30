import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MobileDiscreteSlider } from "@/components/mobile-discrete-slider";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";
import { useStartup } from "@/startup/startup-provider";

export function MobileArenaValueActionControl({
  actions,
  busy,
  label,
  onSubmit,
}: Readonly<{
  actions: readonly ArenaStageLegalAction[];
  busy: boolean;
  label: string;
  onSubmit(action: ArenaStageLegalAction): void;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const signature = actions.map((action) => action.token).join("\u001f");
  const [selection, setSelection] = useState<Readonly<{ index: number; signature: string }>>({
    index: Math.floor((actions.length - 1) / 2),
    signature,
  });
  if (actions.length < 1) return null;
  const selectedIndex = selection.signature === signature
    ? Math.max(0, Math.min(actions.length - 1, selection.index))
    : Math.floor((actions.length - 1) / 2);
  const selected = actions[selectedIndex]!;
  const selectIndex = (index: number) => setSelection({
    index: Math.max(0, Math.min(actions.length - 1, index)),
    signature,
  });

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{selected.shortLabel ?? selected.label}</Text>
      </View>
      <View
        accessibilityActions={[{ name: "decrement" }, { name: "increment" }]}
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        accessibilityValue={{
          max: actions.length - 1,
          min: 0,
          now: selectedIndex,
          text: selected.shortLabel ?? selected.label,
        }}
        accessible
        onAccessibilityAction={(event) => {
          if (busy) return;
          selectIndex(selectedIndex + (event.nativeEvent.actionName === "increment" ? 1 : -1));
        }}
      >
        <MobileDiscreteSlider
          disabled={busy || actions.length === 1}
          maximumTrackTintColor={colors.borderStrong}
          maximumValue={actions.length - 1}
          minimumTrackTintColor={colors.accent}
          minimumValue={0}
          onValueChange={(value) => selectIndex(Math.round(value))}
          step={1}
          value={selectedIndex}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => onSubmit(selected)}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: pressed ? colors.accentHover : colors.accent, opacity: busy ? 0.58 : 1 },
        ]}
      >
        <Text style={[styles.submitLabel, { color: colors.textOnAccent }]}>{busy ? "Sending…" : selected.verb ?? "Confirm"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 14, width: "100%" },
  headingRow: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 12 },
  value: { flexShrink: 1, fontFamily: "monospace", fontSize: 14, fontWeight: "700", marginLeft: 12, textAlign: "right" },
  submit: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", marginTop: 8 },
  submitLabel: { fontSize: 14, fontWeight: "700" },
});
