import type { ActionTarget, BoardScene } from "@eslams/game-render-contract";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useStartup } from "@/startup/startup-provider";
import type { ArenaSealedCommitment, ArenaViewerPrivate } from "./mobile-arena-gateway";

const DENSE_HAND_MINIMUM = 13;

export type MobileArenaPrivateInventoryItem = Readonly<{
  accessibilityLabel: string;
  actionTarget: ActionTarget | null;
  id: string;
  label: string;
}>;

export type MobileArenaPrivateInventoryModel = Readonly<{
  commitment: ArenaSealedCommitment | null;
  items: readonly MobileArenaPrivateInventoryItem[];
  label: string;
  mode: "dense_hand" | "inventory";
}> | null;

export function mobileArenaPrivateInventoryModel(
  viewerPrivate: ArenaViewerPrivate | null,
  scene: BoardScene | null,
): MobileArenaPrivateInventoryModel {
  if (!viewerPrivate) return null;
  const commitment = viewerPrivate.sealedCommitment ?? null;
  if (
    viewerPrivate.kind === "playing_cards"
    || viewerPrivate.kind === "mahjong_tiles"
    || viewerPrivate.kind === "number_cards"
  ) {
    const values = viewerPrivate.kind === "number_cards" ? viewerPrivate.values : viewerPrivate.cards;
    const prefix = viewerPrivate.kind === "mahjong_tiles"
      ? "arena-owner-tile-"
      : viewerPrivate.kind === "number_cards"
        ? "arena-owner-number-card-"
        : "arena-owner-card-";
    const items = values.map((value, index) => inventoryItemFromScene(
      scene,
      `${prefix}${index}`,
      String(value),
      `Your ${viewerPrivate.kind === "mahjong_tiles" ? "tile" : "card"} ${index + 1} of ${values.length}, ${value}`,
    ));
    const hasActions = items.some((item) => item.actionTarget !== null);
    if (items.length < DENSE_HAND_MINIMUM || !hasActions) {
      return commitment === null
        ? null
        : Object.freeze({
            commitment,
            items: Object.freeze([]),
            label: commitmentLabel(commitment),
            mode: "inventory" as const,
          });
    }
    return Object.freeze({
      commitment,
      items: Object.freeze(items),
      label: "Your hand actions",
      mode: "dense_hand" as const,
    });
  }
  if (viewerPrivate.kind === "dice") {
    return inventoryModel(
      "Your dice",
      viewerPrivate.values.map((value, index) => inventoryItem(
        `private-die-${index}`,
        String(value),
        `Your die ${index + 1} of ${viewerPrivate.values.length}, face ${value}`,
      )),
      commitment,
    );
  }
  if (viewerPrivate.kind === "battleship_fleet") {
    return inventoryModel(
      "Your fleet",
      viewerPrivate.ownShips.map((ship, index) => inventoryItem(
        `private-ship-${index}`,
        ship,
        `Your fleet position ${index + 1} of ${viewerPrivate.ownShips.length}, ${ship}`,
      )),
      commitment,
    );
  }
  if (viewerPrivate.kind === "private_value") {
    const label = viewerPrivate.gameSlug === "first-price-sealed-bid-auction"
      ? "Your private valuation"
      : "Your private reserve";
    return inventoryModel(
      label,
      [inventoryItem("private-value", formatPrivateValue(viewerPrivate.value), `${label}, ${formatPrivateValue(viewerPrivate.value)}`)],
      commitment,
    );
  }
  return commitment === null
    ? null
    : Object.freeze({
        commitment,
        items: Object.freeze([]),
        label: commitmentLabel(commitment),
        mode: "inventory" as const,
      });
}

export function MobileArenaPrivateInventory({
  busyToken,
  onAction,
  scene,
  viewerPrivate,
}: Readonly<{
  busyToken: string | null;
  onAction?(target: ActionTarget): void;
  scene: BoardScene | null;
  viewerPrivate: ArenaViewerPrivate | null;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const model = mobileArenaPrivateInventoryModel(viewerPrivate, scene);
  if (!model) return null;
  return (
    <View
      accessibilityLabel={`${model.label}. ${model.items.length} ${model.items.length === 1 ? "item" : "items"}.`}
      style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}
      testID="arena-private-inventory"
    >
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{model.label}</Text>
        {model.mode === "dense_hand" ? (
          <Text style={[styles.caption, { color: colors.textTertiary }]}>Swipe to choose any legal card</Text>
        ) : null}
      </View>
      {model.items.length > 0 ? (
        <ScrollView
          accessibilityLabel={model.label}
          accessibilityRole="list"
          contentContainerStyle={styles.items}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {model.items.map((item) => {
            const actionable = item.actionTarget !== null && onAction !== undefined;
            const busy = item.actionTarget?.action === busyToken;
            const disabled = busyToken !== null || item.actionTarget?.disabled === true;
            return actionable ? (
              <Pressable
                accessibilityLabel={item.accessibilityLabel}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled }}
                disabled={disabled}
                key={item.id}
                onPress={() => {
                  if (item.actionTarget) onAction?.(item.actionTarget);
                }}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: pressed ? colors.accentSoft : colors.surface2,
                    borderColor: colors.borderStrong,
                    opacity: disabled && !busy ? 0.5 : 1,
                  },
                ]}
                testID={`arena-private-action-${item.id}`}
              >
                <Text style={[styles.itemLabel, { color: colors.text }]}>{busy ? "…" : item.label}</Text>
              </Pressable>
            ) : (
              <View
                accessibilityLabel={item.accessibilityLabel}
                accessible
                key={item.id}
                style={[styles.item, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              >
                <Text style={[styles.itemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      {model.commitment ? (
        <View
          accessibilityLabel={`${commitmentLabel(model.commitment)}, ${model.commitment.label}`}
          style={[styles.commitment, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.commitmentLabel, { color: colors.textTertiary }]}>
            {commitmentLabel(model.commitment).toLocaleUpperCase("en-US")}
          </Text>
          <Text numberOfLines={2} style={[styles.commitmentValue, { color: colors.text }]}>
            {model.commitment.label}
          </Text>
          <Text style={[styles.commitmentStatus, { color: colors.textTertiary }]}>Waiting for reveal</Text>
        </View>
      ) : null}
    </View>
  );
}

function inventoryModel(
  label: string,
  items: readonly MobileArenaPrivateInventoryItem[],
  commitment: ArenaSealedCommitment | null,
): NonNullable<MobileArenaPrivateInventoryModel> {
  return Object.freeze({
    commitment,
    items: Object.freeze([...items]),
    label,
    mode: "inventory" as const,
  });
}

function inventoryItem(
  id: string,
  label: string,
  accessibilityLabel: string,
): MobileArenaPrivateInventoryItem {
  return Object.freeze({ accessibilityLabel, actionTarget: null, id, label });
}

function inventoryItemFromScene(
  scene: BoardScene | null,
  id: string,
  fallbackLabel: string,
  fallbackAccessibilityLabel: string,
): MobileArenaPrivateInventoryItem {
  const node = scene?.nodes.find((candidate) => candidate.id === id);
  const accessible = scene?.accessibility.find((candidate) => candidate.id === id);
  const actionTarget = node?.actionTargetId
    ? scene?.actionTargets.find((candidate) => candidate.id === node.actionTargetId) ?? null
    : null;
  return Object.freeze({
    accessibilityLabel: accessible?.label ?? fallbackAccessibilityLabel,
    actionTarget,
    id,
    label: node?.label ?? fallbackLabel,
  });
}

function formatPrivateValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10_000) / 10_000);
}

function commitmentLabel(commitment: ArenaSealedCommitment): string {
  if (commitment.kind === "choice") return "Your committed choice";
  if (commitment.kind === "card") return "Your committed card";
  return "Your committed bid";
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, borderWidth: 1, marginTop: 12, overflow: "hidden", paddingVertical: 12, width: "100%" },
  heading: { gap: 2, paddingHorizontal: 14 },
  title: { fontSize: 13.5, fontWeight: "700" },
  caption: { fontSize: 12, lineHeight: 16 },
  items: { gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  item: { alignItems: "center", borderRadius: 12, borderWidth: 1, justifyContent: "center", minHeight: 52, minWidth: 58, paddingHorizontal: 12, paddingVertical: 8 },
  itemLabel: { fontFamily: "monospace", fontSize: 14, fontWeight: "700", textAlign: "center" },
  commitment: { borderTopWidth: 1, gap: 3, marginTop: 10, paddingHorizontal: 14, paddingTop: 10 },
  commitmentLabel: { fontFamily: "monospace", fontSize: 12, fontWeight: "700" },
  commitmentValue: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  commitmentStatus: { fontSize: 12, lineHeight: 16 },
});
