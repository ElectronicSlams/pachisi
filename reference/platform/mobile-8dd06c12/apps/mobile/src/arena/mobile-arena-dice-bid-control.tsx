import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ArenaStageLegalAction } from "./mobile-arena-gateway";
import { useStartup } from "@/startup/startup-provider";

type DiceBidAction = Readonly<{
  action: ArenaStageLegalAction;
  count: number;
  face: number;
}>;

export function canUseMobileArenaDiceBidControl(actions: readonly ArenaStageLegalAction[]): boolean {
  return actions.length > 0 && actions.every((action) => parseDiceBidAction(action) !== null);
}

export function MobileArenaDiceBidControl({
  actions,
  busy,
  onSubmit,
}: Readonly<{
  actions: readonly ArenaStageLegalAction[];
  busy: boolean;
  onSubmit(action: ArenaStageLegalAction): void;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const bids = actions.flatMap((action) => {
    const parsed = parseDiceBidAction(action);
    return parsed ? [parsed] : [];
  });
  const signature = bids.map((bid) => bid.action.token).join("\u001f");
  const [selection, setSelection] = useState<Readonly<{ signature: string; token: string | null }>>({
    signature,
    token: bids[0]?.action.token ?? null,
  });
  if (bids.length !== actions.length || bids.length < 1) return null;
  const selected = selection.signature === signature
    ? bids.find((bid) => bid.action.token === selection.token) ?? bids[0]!
    : bids[0]!;
  const quantities = uniqueSorted(bids.map((bid) => bid.count));
  const faces = uniqueSorted(bids.flatMap((bid) => bid.count === selected.count ? [bid.face] : []));

  function changeQuantity(delta: -1 | 1): void {
    const nextCount = adjacent(quantities, selected.count, delta);
    const candidates = bids.filter((bid) => bid.count === nextCount);
    const next = [...candidates].sort((left, right) => (
      Math.abs(left.face - selected.face) - Math.abs(right.face - selected.face)
      || left.face - right.face
    ))[0];
    if (next) setSelection({ signature, token: next.action.token });
  }

  function changeFace(delta: -1 | 1): void {
    const nextFace = adjacent(faces, selected.face, delta);
    const next = bids.find((bid) => bid.count === selected.count && bid.face === nextFace);
    if (next) setSelection({ signature, token: next.action.token });
  }

  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Your bid</Text>
        <Text style={[styles.value, { color: colors.text }]}>{selected.count} × {selected.face}</Text>
      </View>
      <DiceBidStepper
        busy={busy}
        canDecrement={selected.count !== quantities[0]}
        canIncrement={selected.count !== quantities.at(-1)}
        label="Quantity"
        onDecrement={() => changeQuantity(-1)}
        onIncrement={() => changeQuantity(1)}
        value={selected.count}
      />
      <DiceBidStepper
        busy={busy}
        canDecrement={selected.face !== faces[0]}
        canIncrement={selected.face !== faces.at(-1)}
        label="Face"
        onDecrement={() => changeFace(-1)}
        onIncrement={() => changeFace(1)}
        value={selected.face}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => onSubmit(selected.action)}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: pressed ? colors.accentHover : colors.accent, opacity: busy ? 0.58 : 1 },
        ]}
      >
        <Text style={[styles.submitLabel, { color: colors.textOnAccent }]}>{busy ? "Sending…" : selected.action.verb ?? "Submit bid"}</Text>
      </Pressable>
    </View>
  );
}

function DiceBidStepper({
  busy,
  canDecrement,
  canIncrement,
  label,
  onDecrement,
  onIncrement,
  value,
}: Readonly<{
  busy: boolean;
  canDecrement: boolean;
  canIncrement: boolean;
  label: string;
  onDecrement(): void;
  onIncrement(): void;
  value: number;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable
          accessibilityLabel={`Decrease ${label.toLocaleLowerCase()}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !canDecrement }}
          disabled={busy || !canDecrement}
          onPress={onDecrement}
          style={[styles.stepperButton, { borderColor: colors.borderStrong, opacity: busy || !canDecrement ? 0.38 : 1 }]}
        >
          <Text style={[styles.stepperButtonLabel, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text accessibilityLabel={`${label} ${value}`} style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
        <Pressable
          accessibilityLabel={`Increase ${label.toLocaleLowerCase()}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !canIncrement }}
          disabled={busy || !canIncrement}
          onPress={onIncrement}
          style={[styles.stepperButton, { borderColor: colors.borderStrong, opacity: busy || !canIncrement ? 0.38 : 1 }]}
        >
          <Text style={[styles.stepperButtonLabel, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function parseDiceBidAction(action: ArenaStageLegalAction): DiceBidAction | null {
  const match = /^(\d+)x([1-6])$/u.exec(action.token);
  if (!match) return null;
  const count = Number(match[1]);
  const face = Number(match[2]);
  return Number.isSafeInteger(count) && count > 0
    ? Object.freeze({ action, count, face })
    : null;
}

function uniqueSorted(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function adjacent(values: readonly number[], current: number, delta: -1 | 1): number {
  const index = values.indexOf(current);
  return values[Math.max(0, Math.min(values.length - 1, index + delta))] ?? current;
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, gap: 8, marginTop: 12, padding: 14, width: "100%" },
  headingRow: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { fontSize: 12 },
  value: { fontFamily: "monospace", fontSize: 15, fontWeight: "700" },
  stepperRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 42 },
  stepperLabel: { fontSize: 13 },
  stepperControls: { alignItems: "center", flexDirection: "row", gap: 12 },
  stepperButton: { alignItems: "center", borderRadius: 11, borderWidth: 1, height: 38, justifyContent: "center", width: 42 },
  stepperButtonLabel: { fontSize: 20, fontWeight: "500", lineHeight: 22 },
  stepperValue: { fontFamily: "monospace", fontSize: 14, fontWeight: "700", minWidth: 26, textAlign: "center" },
  submit: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", marginTop: 4 },
  submitLabel: { fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
});
