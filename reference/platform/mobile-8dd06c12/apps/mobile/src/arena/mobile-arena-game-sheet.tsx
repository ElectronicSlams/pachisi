import {
  MATCH_VISIBILITIES,
  mobileCapabilityForGame,
  type GameCatalogEntry,
  type MatchVisibility,
} from "@eslams/core-types";
import {
  mobileArenaModelStatus,
  mobileArenaModelStatusLabel,
  type MobileSearchModelFacts,
} from "@eslams/search-contract";
import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  scheduleMobileAccessibilityFocus,
  type MobileAccessibilityTargetResolver,
} from "@/accessibility/mobile-accessibility-runtime";
import { SystemSymbol } from "@/components/system-symbol";
import { MobileGameBoardCanvas } from "@/renderer/mobile-game-board-canvas";
import { matchVisibilityLabel } from "@/social/profile-presentation";
import { useStartup } from "@/startup/startup-provider";

import { mobileArenaPreviewScene } from "./mobile-arena-preview-scene";
import { MobileGameRulesContent } from "./mobile-game-rules";
import { mobileGameRuleContent } from "./mobile-game-rule-content";
import {
  mobileArenaCompatibleModels,
  mobileArenaRosterStatus,
} from "./mobile-arena-roster-contract";
import {
  mobileArenaPreparedSetup,
  mobileArenaSeatSubtitle,
  mobileArenaSeatTitle,
  modelForLockedArenaSeat,
  type MobileArenaPreparedSetup,
} from "./mobile-arena-setup";

type RosterPhase = "loading" | "ready" | "error";

export function MobileArenaGameSheet({
  canStart,
  favourite,
  game,
  initialSetup,
  initialVisibility,
  onClose,
  onFavouriteChanged,
  onOpponentChanged,
  onPreparedChanged,
  onRetryRoster,
  onStart,
  preferredModelId,
  preferredModelVersionId = null,
  requireExactPreferredModel = false,
  reducedMotion,
  roster,
  rosterPhase,
}: Readonly<{
  canStart: boolean;
  favourite: boolean;
  game: GameCatalogEntry;
  initialSetup: MobileArenaPreparedSetup | null;
  initialVisibility: MatchVisibility;
  onClose(): void;
  onFavouriteChanged(favourite: boolean): void;
  onOpponentChanged(model: MobileSearchModelFacts): void;
  onPreparedChanged(setup: MobileArenaPreparedSetup): void;
  onRetryRoster(): void;
  onStart(setup: MobileArenaPreparedSetup, returnFocusTarget: MobileAccessibilityTargetResolver): void;
  preferredModelId: string | null;
  preferredModelVersionId?: string | null;
  requireExactPreferredModel?: boolean;
  reducedMotion: boolean;
  roster: readonly MobileSearchModelFacts[];
  rosterPhase: RosterPhase;
}>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const startButtonRef = useRef<View>(null);
  const lastEmittedPreparedSetupKey = useRef<string | null>(null);
  const scene = mobileArenaPreviewScene(game.slug);
  const capability = mobileCapabilityForGame(game.slug);
  const gameRules = mobileGameRuleContent(game);
  const seatIds = game.topology.controlledPlayers;
  const compatible = useMemo(() => mobileArenaCompatibleModels(roster, game.slug), [game.slug, roster]);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [visibility, setVisibility] = useState(initialSetup?.visibility ?? initialVisibility);
  const [humanSeatId, setHumanSeatId] = useState(() => validInitialHumanSeat(game, initialSetup));
  const [modelVersionBySeat, setModelVersionBySeat] = useState<Readonly<Record<string, string | null>>>(() => (
    initialModelVersionsBySeat(game, initialSetup)
  ));
  const [rosterSeatId, setRosterSeatId] = useState<string | null>(null);
  const [rosterQuery, setRosterQuery] = useState("");
  const closeButtonRef = useRef<View>(null);
  const rosterBackButtonRef = useRef<View>(null);
  const rosterErrorRef = useRef<Text>(null);
  const previewWidth = Math.min(304, Math.max(240, width - 68));
  const modelsBySeat = useMemo(() => resolvedModelsBySeat(
    game,
    roster,
    initialSetup,
    modelVersionBySeat,
    humanSeatId,
    preferredModelId,
    preferredModelVersionId,
    requireExactPreferredModel,
  ), [game, humanSeatId, initialSetup, modelVersionBySeat, preferredModelId, preferredModelVersionId, requireExactPreferredModel, roster]);
  const preparedSetup = useMemo(() => mobileArenaPreparedSetup(
    game,
    humanSeatId,
    modelsBySeat,
    visibility,
  ), [game, humanSeatId, modelsBySeat, visibility]);

  useEffect(() => {
    if (!preparedSetup) return;
    const nextKey = preparedSetupKey(preparedSetup);
    if (lastEmittedPreparedSetupKey.current === nextKey) return;
    lastEmittedPreparedSetupKey.current = nextKey;
    onPreparedChanged(preparedSetup);
  }, [onPreparedChanged, preparedSetup]);

  const focusSurface = rosterSeatId
    ? `roster:${rosterSeatId}`
    : rosterPhase === "error" ? "main:error" : "main";

  useEffect(() => scheduleMobileAccessibilityFocus(() => {
    if (focusSurface.startsWith("roster:")) return rosterBackButtonRef.current;
    if (focusSurface === "main:error") return rosterErrorRef.current;
    return closeButtonRef.current;
  }), [focusSurface]);

  if (!scene || !capability?.enabled || seatIds.length < 2) return null;

  function selectHumanSeat(nextHumanSeatId: string): void {
    if (nextHumanSeatId === humanSeatId || !seatIds.includes(nextHumanSeatId)) return;
    const fallback = preferredCompatibleModel(
      compatible,
      preferredModelId,
      preferredModelVersionId,
      requireExactPreferredModel,
    );
    setModelVersionBySeat((current) => {
      const next = { ...current, [nextHumanSeatId]: null };
      next[humanSeatId] = current[humanSeatId]
        ?? modelsBySeat[humanSeatId]?.modelEntryVersionId
        ?? fallback?.modelEntryVersionId
        ?? null;
      return Object.freeze(next);
    });
    setHumanSeatId(nextHumanSeatId);
  }

  function chooseModel(seatId: string, model: MobileSearchModelFacts): void {
    if (seatId === humanSeatId || mobileArenaRosterStatus(model, game.slug) === "not_available_for_game") return;
    setModelVersionBySeat((current) => Object.freeze({ ...current, [seatId]: model.modelEntryVersionId }));
    if (game.topology.mode === "head_to_head") onOpponentChanged(model);
    setRosterSeatId(null);
    setRosterQuery("");
  }

  const targetSeatId = rosterSeatId ?? seatIds.find((seatId) => seatId !== humanSeatId) ?? null;
  const filteredRoster = filterRoster(roster, rosterQuery);

  return (
    <Modal
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onClose}
      onShow={() => scheduleMobileAccessibilityFocus(() => {
        if (focusSurface.startsWith("roster:")) return rosterBackButtonRef.current;
        if (focusSurface === "main:error") return rosterErrorRef.current;
        return closeButtonRef.current;
      })}
      presentationStyle="overFullScreen"
      transparent
      visible
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityElementsHidden
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {rosterSeatId ? (
            <View style={styles.rosterSurface}>
              <View style={styles.rosterHeader}>
                <Pressable
                  accessibilityLabel="Back to game setup"
                  accessibilityRole="button"
                  onPress={() => { setRosterSeatId(null); setRosterQuery(""); }}
                  ref={rosterBackButtonRef}
                  style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SystemSymbol color={colors.textSecondary} name="back" size={18} />
                </Pressable>
                <TextInput
                  accessibilityLabel="Search models"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setRosterQuery}
                  placeholder="Search models…"
                  placeholderTextColor={colors.textTertiary}
                  style={[styles.rosterInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={rosterQuery}
                />
              </View>
              <Text accessibilityRole="header" style={[styles.rosterTitle, { color: colors.text }]}>Models for {mobileArenaSeatTitle(game, rosterSeatId)}</Text>
              <FlatList
                contentContainerStyle={[styles.rosterList, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
                data={filteredRoster}
                initialNumToRender={14}
                keyExtractor={(model) => `${model.modelEntryId}:${model.modelEntryVersionId}`}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={(
                  <Text style={[styles.emptyRoster, { color: colors.textSecondary }]}>No models match this search.</Text>
                )}
                renderItem={({ item: model }) => {
                  const status = mobileArenaRosterStatus(model, game.slug);
                  const unavailable = status === "not_available_for_game";
                  const selected = modelsBySeat[rosterSeatId]?.modelEntryVersionId === model.modelEntryVersionId;
                  return (
                    <ModelRosterRow
                      gameSlug={game.slug}
                      model={model}
                      onPress={() => chooseModel(rosterSeatId, model)}
                      selected={selected}
                      unavailable={unavailable}
                    />
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={[styles.gameGlyph, { backgroundColor: colors.accentSoft, borderColor: colors.accentLine }]}>
                  <SystemSymbol color={colors.accent} name="arena" size={20} />
                </View>
                <View style={styles.headerCopy}>
                  <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{game.name}</Text>
                  <Text style={[styles.variant, { color: colors.textTertiary }]}>{game.variant.replaceAll("_", " ")} · {seatIds.length} players</Text>
                </View>
                <Pressable
                  accessibilityLabel={favourite ? `Remove ${game.name} from favourites` : `Add ${game.name} to favourites`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: favourite }}
                  hitSlop={4}
                  onPress={() => onFavouriteChanged(!favourite)}
                  style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SystemSymbol color={favourite ? colors.accent : colors.textSecondary} name={favourite ? "heart-filled" : "heart"} size={20} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Close game setup"
                  accessibilityRole="button"
                  onPress={onClose}
                  ref={closeButtonRef}
                  style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <SystemSymbol color={colors.textSecondary} name="close" size={18} />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(116, insets.bottom + 102) }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.preview, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <MobileGameBoardCanvas
                    accessible
                    height={176}
                    reducedMotion={reducedMotion}
                    scene={scene}
                    theme={resolvedTheme}
                    width={previewWidth}
                  />
                </View>

                <Text style={[styles.kicker, { color: colors.textTertiary }]}>How to play</Text>
                <Text style={[styles.gameSummary, { color: colors.textSecondary }]}>
                  {gameRules.shortSummary.join(" ")}
                </Text>
                <View style={styles.howTo}>
                  <HowToRow label="Objective" text={gameRules.objective} />
                  <HowToRow label="Your turn" text={gameRules.turnRules} />
                  <HowToRow label="You win" text={gameRules.outcomes} />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: rulesExpanded }}
                  onPress={() => setRulesExpanded((expanded) => !expanded)}
                  style={[styles.disclosure, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={[styles.disclosureLabel, { color: colors.text }]}>Full rules and accessibility</Text>
                  <Text style={[styles.disclosureAction, { color: colors.accent }]}>{rulesExpanded ? "hide" : "show"} →</Text>
                </Pressable>
                {rulesExpanded ? (
                  <View style={[styles.rules, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <MobileGameRulesContent game={game} />
                  </View>
                ) : null}

                <Text style={[styles.kicker, { color: colors.textTertiary }]}>Choose your seat</Text>
                <ScrollView contentContainerStyle={styles.seatChoices} horizontal showsHorizontalScrollIndicator={false}>
                  {seatIds.map((seatId) => {
                    const selected = humanSeatId === seatId;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={seatId}
                        onPress={() => selectHumanSeat(seatId)}
                        style={[
                          styles.seatChoice,
                          {
                            backgroundColor: selected ? colors.accentSoft : colors.surface,
                            borderColor: selected ? colors.accent : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.seatTitle, { color: selected ? colors.accent : colors.text }]}>{mobileArenaSeatTitle(game, seatId)}</Text>
                        <Text style={[styles.seatHelp, { color: colors.textTertiary }]}>{mobileArenaSeatSubtitle(game, seatId)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {rosterPhase === "loading" ? (
                  <View accessibilityLabel="Loading model roster" style={styles.rosterState}>
                    <ActivityIndicator color={colors.accent} size="small" />
                    <Text style={[styles.rosterStateText, { color: colors.textSecondary }]}>Loading available models…</Text>
                  </View>
                ) : rosterPhase === "error" ? (
                  <View style={[styles.rosterError, { backgroundColor: colors.lossSoft, borderColor: colors.loss }]}>
                    <Text accessibilityRole="alert" ref={rosterErrorRef} style={[styles.rosterErrorText, { color: colors.lossText }]}>The live model roster could not be loaded. Match setup is paused.</Text>
                    <Pressable accessibilityRole="button" onPress={onRetryRoster} style={styles.retryButton}>
                      <Text style={[styles.retryText, { color: colors.lossText }]}>Try again</Text>
                    </Pressable>
                  </View>
                ) : game.topology.mode === "multi_seat" ? (
                  <TableSeatRing
                    game={game}
                    humanSeatId={humanSeatId}
                    modelsBySeat={modelsBySeat}
                    onOpenSeat={setRosterSeatId}
                  />
                ) : (
                  <>
                    <View style={styles.modelWheelHeader}>
                      <Text style={[styles.kickerInline, { color: colors.textTertiary }]}>Pick your opponent</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => targetSeatId && setRosterSeatId(targetSeatId)}
                        style={styles.allModelsButton}
                      >
                        <Text style={[styles.allModels, { color: colors.accent }]}>All {roster.length} models →</Text>
                      </Pressable>
                    </View>
                    <ScrollView contentContainerStyle={styles.modelWheel} horizontal showsHorizontalScrollIndicator={false}>
                      {compatible.slice(0, 8).map((model) => {
                        const selected = targetSeatId ? modelsBySeat[targetSeatId]?.modelEntryVersionId === model.modelEntryVersionId : false;
                        return (
                          <ModelWheelCard
                            gameSlug={game.slug}
                            key={`${model.modelEntryId}:${model.modelEntryVersionId}`}
                            model={model}
                            onPress={() => targetSeatId && chooseModel(targetSeatId, model)}
                            selected={selected}
                          />
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                <Text style={[styles.kicker, { color: colors.textTertiary }]}>Match visibility</Text>
                <View accessibilityRole="radiogroup" style={styles.visibilityRow}>
                  {MATCH_VISIBILITIES.map((choice) => {
                    const selected = visibility === choice;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={choice}
                        onPress={() => setVisibility(choice)}
                        style={[
                          styles.visibilityChoice,
                          {
                            backgroundColor: selected ? colors.accentSoft : colors.surface,
                            borderColor: selected ? colors.accent : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.visibilityLabel, { color: selected ? colors.accent : colors.textSecondary }]}>{matchVisibilityLabel(choice)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={[styles.footer, { backgroundColor: colors.background, borderColor: colors.borderFaint, paddingBottom: Math.max(18, insets.bottom + 8) }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canStart || !preparedSetup }}
                  disabled={!canStart || !preparedSetup}
                  onPress={() => preparedSetup && onStart(preparedSetup, () => startButtonRef.current)}
                  ref={startButtonRef}
                  style={({ pressed }) => [
                    styles.start,
                    {
                      backgroundColor: canStart && preparedSetup ? pressed ? colors.accentHover : colors.accent : colors.surface3,
                      borderColor: canStart && preparedSetup ? "transparent" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.startLabel, { color: canStart && preparedSetup ? colors.textOnAccent : colors.textTertiary }]}>
                    {!canStart ? "Network required" : preparedSetup ? "Start match" : "Choose every seat"}
                  </Text>
                </Pressable>
                <Text style={[styles.startHelp, { color: colors.textTertiary }]}>Sign in happens only after you start.</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function HowToRow({ label, text }: Readonly<{ label: string; text: string }>) {
  const { resolvedTheme } = useStartup();
  return (
    <View style={styles.howToRow}>
      <Text style={[styles.howToLabel, { color: resolvedTheme.color.textTertiary }]}>{label}</Text>
      <Text style={[styles.howToText, { color: resolvedTheme.color.text }]}>{text}</Text>
    </View>
  );
}

function ModelAvatar({ model, size = 36 }: Readonly<{ model: MobileSearchModelFacts; size?: number }>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  return model.providerLogoUrl ? (
    <View style={[styles.logoFrame, { backgroundColor: colors.surface2, borderColor: colors.border, height: size, width: size }]}>
      <Image accessible={false} contentFit="contain" source={{ uri: model.providerLogoUrl }} style={{ height: size - 12, width: size - 12 }} />
    </View>
  ) : (
    <View style={[styles.logoFrame, { backgroundColor: colors.accentSoft, borderColor: colors.accentLine, height: size, width: size }]}>
      <Text style={[styles.logoInitials, { color: colors.accent }]}>{model.providerName.slice(0, 2).toLocaleUpperCase("en-US")}</Text>
    </View>
  );
}

function ModelWheelCard({
  gameSlug,
  model,
  onPress,
  selected,
}: Readonly<{
  gameSlug: string;
  model: MobileSearchModelFacts;
  onPress(): void;
  selected: boolean;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const status = mobileArenaModelStatus(model, gameSlug);
  return (
    <Pressable
      accessibilityLabel={`${model.publicName}, ${model.providerName}, ${mobileArenaModelStatusLabel(status)}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.modelWheelCard,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      <ModelAvatar model={model} />
      <Text numberOfLines={2} style={[styles.modelWheelName, { color: colors.text }]}>{model.publicName}</Text>
      <Text numberOfLines={1} style={[styles.modelWheelProvider, { color: colors.textTertiary }]}>{model.providerName}</Text>
      <Text style={[styles.modelStatus, { color: status === "ready" ? colors.winText : colors.drawText }]}>{mobileArenaModelStatusLabel(status)}</Text>
    </Pressable>
  );
}

function ModelRosterRow({
  gameSlug,
  model,
  onPress,
  selected,
  unavailable,
}: Readonly<{
  gameSlug: string;
  model: MobileSearchModelFacts;
  onPress(): void;
  selected: boolean;
  unavailable: boolean;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const status = mobileArenaRosterStatus(model, gameSlug);
  return (
    <Pressable
      accessibilityLabel={`${model.publicName}, ${model.providerName}, ${mobileArenaModelStatusLabel(status)}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: unavailable, selected }}
      disabled={unavailable}
      onPress={onPress}
      style={[
        styles.rosterRow,
        { backgroundColor: selected ? colors.accentSofter : "transparent", opacity: unavailable ? 0.52 : 1 },
      ]}
    >
      <ModelAvatar model={model} size={34} />
      <View style={styles.rosterModelCopy}>
        <Text numberOfLines={1} style={[styles.rosterModelName, { color: colors.text }]}>{model.publicName}</Text>
        <Text numberOfLines={1} style={[styles.rosterModelMeta, { color: colors.textTertiary }]}>{model.providerName} · {model.providerVersionString}</Text>
      </View>
      <Text style={[styles.rosterStatus, { color: status === "ready" ? colors.winText : status === "slower_turns" ? colors.drawText : colors.lossText }]}>{mobileArenaModelStatusLabel(status)}</Text>
    </Pressable>
  );
}

function TableSeatRing({
  game,
  humanSeatId,
  modelsBySeat,
  onOpenSeat,
}: Readonly<{
  game: GameCatalogEntry;
  humanSeatId: string;
  modelsBySeat: Readonly<Record<string, MobileSearchModelFacts | null>>;
  onOpenSeat(seatId: string): void;
}>) {
  const { resolvedTheme } = useStartup();
  const colors = resolvedTheme.color;
  const seatIds = game.topology.controlledPlayers;
  const positions = tableSeatPositions(seatIds.length);
  return (
    <View>
      <Text style={[styles.kicker, { color: colors.textTertiary }]}>The table · tap a model seat to swap</Text>
      <View style={styles.tableRing}>
        <View style={[styles.tableFelt, { backgroundColor: colors.surface2, borderColor: colors.borderStrong }]}>
          <Text style={[styles.tableLabel, { color: colors.textTertiary }]}>{seatIds.length} seats · {game.renderSpec.seatLayout === "compass" ? "compass" : "table ring"}</Text>
        </View>
        {seatIds.map((seatId, index) => {
          const human = seatId === humanSeatId;
          const model = modelsBySeat[seatId];
          const position = positions[index] ?? { left: "50%", top: "50%" };
          return (
            <Pressable
              accessibilityLabel={human ? `${mobileArenaSeatTitle(game, seatId)}, your seat` : `${mobileArenaSeatTitle(game, seatId)}, ${model?.publicName ?? "choose a model"}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: human }}
              disabled={human}
              key={seatId}
              onPress={() => onOpenSeat(seatId)}
              style={[styles.tableSeat, position]}
            >
              {human ? (
                <View style={[styles.tableAvatar, { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Text style={[styles.youInitial, { color: colors.textOnAccent }]}>Y</Text>
                </View>
              ) : model ? <ModelAvatar model={model} size={40} /> : (
                <View style={[styles.tableAvatar, { backgroundColor: colors.surface3, borderColor: colors.border }]}>
                  <SystemSymbol color={colors.textTertiary} name="person" size={16} />
                </View>
              )}
              <Text numberOfLines={1} style={[styles.tableSeatName, { color: colors.text }]}>{human ? "You" : model?.publicName ?? "Choose"}</Text>
              <Text style={[styles.tableSeatDirection, { color: colors.textTertiary }]}>{mobileArenaSeatTitle(game, seatId)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.tableNote, { color: colors.textTertiary }]}>Every match seats one human — you. The other {seatIds.length - 1} seats are locked to exact model versions before Start.</Text>
    </View>
  );
}

function validInitialHumanSeat(game: GameCatalogEntry, setup: MobileArenaPreparedSetup | null): string {
  return setup?.gameSlug === game.slug && game.topology.controlledPlayers.includes(setup.humanSeatId)
    ? setup.humanSeatId
    : game.topology.controlledPlayers[0] ?? "player_1";
}

function initialModelVersionsBySeat(
  game: GameCatalogEntry,
  setup: MobileArenaPreparedSetup | null,
): Readonly<Record<string, string | null>> {
  const versions: Record<string, string | null> = {};
  const savedSeatsById = setup?.gameSlug === game.slug
    ? new Map(setup.seats.map((seat) => [seat.seatId, seat] as const))
    : null;
  for (const seatId of game.topology.controlledPlayers) {
    const savedSeat = savedSeatsById?.get(seatId);
    versions[seatId] = savedSeat?.participant.kind === "model"
      ? savedSeat.participant.modelEntryVersionId
      : null;
  }
  return Object.freeze(versions);
}

function resolvedModelsBySeat(
  game: GameCatalogEntry,
  roster: readonly MobileSearchModelFacts[],
  setup: MobileArenaPreparedSetup | null,
  selectedVersions: Readonly<Record<string, string | null>>,
  humanSeatId: string,
  preferredModelId: string | null,
  preferredModelVersionId: string | null,
  requireExactPreferredModel: boolean,
): Readonly<Record<string, MobileSearchModelFacts | null>> {
  const compatible = mobileArenaCompatibleModels(roster, game.slug);
  const fallback = preferredCompatibleModel(
    compatible,
    preferredModelId,
    preferredModelVersionId,
    requireExactPreferredModel,
  );
  const next: Record<string, MobileSearchModelFacts | null> = {};
  const rosterByVersion = new Map(roster.map((model) => [model.modelEntryVersionId, model] as const));
  const savedSeatsById = setup?.gameSlug === game.slug
    ? new Map(setup.seats.map((seat) => [seat.seatId, seat] as const))
    : null;
  for (const seatId of game.topology.controlledPlayers) {
    if (seatId === humanSeatId) {
      next[seatId] = null;
      continue;
    }
    const selectedVersion = selectedVersions[seatId];
    const selected = selectedVersion
      ? rosterByVersion.get(selectedVersion) ?? null
      : null;
    const savedSeat = savedSeatsById?.get(seatId);
    next[seatId] = selected && mobileArenaRosterStatus(selected, game.slug) !== "not_available_for_game"
      ? selected
      : modelForLockedArenaSeat(roster, savedSeat) ?? fallback;
  }
  return Object.freeze(next);
}

function preferredCompatibleModel(
  compatible: readonly MobileSearchModelFacts[],
  preferredModelId: string | null,
  preferredModelVersionId: string | null,
  requireExactPreferredModel: boolean,
): MobileSearchModelFacts | null {
  if (requireExactPreferredModel && (!preferredModelId || !preferredModelVersionId)) return null;
  const preferred = compatible.find((model) => model.modelEntryId === preferredModelId
    && (preferredModelVersionId === null || model.modelEntryVersionId === preferredModelVersionId)) ?? null;
  return requireExactPreferredModel || preferredModelVersionId !== null
    ? preferred
    : preferred ?? compatible[0] ?? null;
}

function filterRoster(
  roster: readonly MobileSearchModelFacts[],
  query: string,
): readonly MobileSearchModelFacts[] {
  const normalized = query.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  if (!normalized) return roster;
  return roster.filter((model) => [
    model.publicName,
    model.providerName,
    model.modelSlug,
    model.family ?? "",
  ].some((value) => value.toLocaleLowerCase("en-US").includes(normalized)));
}

function preparedSetupKey(setup: MobileArenaPreparedSetup): string {
  return JSON.stringify(setup);
}

function tableSeatPositions(count: number): readonly Readonly<{ left: `${number}%`; top: `${number}%` }>[] {
  if (count === 3) return [
    { left: "50%", top: "82%" },
    { left: "18%", top: "18%" },
    { left: "82%", top: "18%" },
  ];
  return [
    { left: "50%", top: "84%" },
    { left: "12%", top: "43%" },
    { left: "50%", top: "12%" },
    { left: "88%", top: "43%" },
  ];
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.42)", flex: 1 },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, height: "88%", overflow: "hidden" },
  handle: { alignSelf: "center", borderRadius: 999, height: 4, marginTop: 9, width: 38 },
  header: { alignItems: "center", flexDirection: "row", gap: 8, paddingBottom: 10, paddingHorizontal: 18, paddingTop: 12 },
  gameGlyph: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: "700" },
  variant: { fontFamily: "monospace", fontSize: 12, marginTop: 2, textTransform: "uppercase" },
  iconButton: { alignItems: "center", borderRadius: 13, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  scrollContent: { paddingHorizontal: 18 },
  preview: { alignItems: "center", borderRadius: 18, borderWidth: 1, marginBottom: 15, overflow: "hidden" },
  kicker: { fontFamily: "monospace", fontSize: 12, letterSpacing: 1, marginBottom: 8, marginTop: 16, textTransform: "uppercase" },
  gameSummary: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  howTo: { gap: 7, marginBottom: 14 },
  howToRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  howToLabel: { fontFamily: "monospace", fontSize: 12, lineHeight: 18, minWidth: 86 },
  howToText: { flex: 1, fontSize: 12.5, lineHeight: 18, minWidth: 180 },
  disclosure: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14 },
  disclosureLabel: { fontSize: 13.5, fontWeight: "600" },
  disclosureAction: { fontFamily: "monospace", fontSize: 12 },
  rules: { borderRadius: 14, borderWidth: 1, gap: 13, marginTop: 8, padding: 14 },
  seatChoices: { gap: 8, paddingRight: 2 },
  seatChoice: { borderRadius: 14, borderWidth: 1, justifyContent: "center", minHeight: 54, minWidth: 104, paddingHorizontal: 13 },
  seatTitle: { fontSize: 13.5, fontWeight: "700" },
  seatHelp: { fontFamily: "monospace", fontSize: 12, marginTop: 2 },
  rosterState: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 132 },
  rosterStateText: { fontSize: 12.5 },
  rosterError: { alignItems: "center", borderRadius: 14, borderWidth: 1, marginTop: 16, padding: 16 },
  rosterErrorText: { fontSize: 12.5, lineHeight: 18, textAlign: "center" },
  retryButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 18 },
  retryText: { fontSize: 12.5, fontWeight: "700" },
  modelWheelHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 9, marginTop: 17 },
  kickerInline: { fontFamily: "monospace", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  allModelsButton: { justifyContent: "center", minHeight: 44, paddingLeft: 12 },
  allModels: { fontSize: 12, fontWeight: "600" },
  modelWheel: { gap: 9, paddingRight: 2 },
  modelWheelCard: { alignItems: "center", borderRadius: 15, borderWidth: 1.5, minHeight: 130, padding: 10, width: 112 },
  modelWheelName: { fontSize: 12, fontWeight: "700", lineHeight: 16, marginTop: 7, textAlign: "center" },
  modelWheelProvider: { fontFamily: "monospace", fontSize: 12, marginTop: 2, textAlign: "center" },
  modelStatus: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", marginTop: 5, textTransform: "uppercase" },
  logoFrame: { alignItems: "center", borderRadius: 10, borderWidth: 1, justifyContent: "center", overflow: "hidden" },
  logoInitials: { fontFamily: "monospace", fontSize: 12, fontWeight: "700" },
  visibilityRow: { flexDirection: "row", gap: 7 },
  visibilityChoice: { alignItems: "center", borderRadius: 999, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 44, paddingHorizontal: 7 },
  visibilityLabel: { fontSize: 12, fontWeight: "600" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, bottom: 0, left: 0, paddingHorizontal: 18, paddingTop: 12, position: "absolute", right: 0 },
  start: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 54, justifyContent: "center" },
  startLabel: { fontSize: 16, fontWeight: "700" },
  startHelp: { fontSize: 12, lineHeight: 16, marginTop: 7, textAlign: "center" },
  rosterSurface: { flex: 1 },
  rosterHeader: { alignItems: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingTop: 8 },
  rosterInput: { borderRadius: 13, borderWidth: 1, flex: 1, fontSize: 14, height: 44, paddingHorizontal: 14 },
  rosterTitle: { fontSize: 14, fontWeight: "700", paddingBottom: 8, paddingHorizontal: 18, paddingTop: 12 },
  rosterList: { paddingHorizontal: 18 },
  rosterRow: { alignItems: "center", borderRadius: 13, flexDirection: "row", gap: 11, minHeight: 62, paddingHorizontal: 10, paddingVertical: 9 },
  rosterModelCopy: { flex: 1, minWidth: 0 },
  rosterModelName: { fontSize: 13.5, fontWeight: "700" },
  rosterModelMeta: { fontFamily: "monospace", fontSize: 12, marginTop: 2 },
  rosterStatus: { fontFamily: "monospace", fontSize: 12, fontWeight: "700", maxWidth: 96, textAlign: "right", textTransform: "uppercase" },
  emptyRoster: { fontSize: 13, paddingVertical: 40, textAlign: "center" },
  tableRing: { height: 218, marginTop: 2, position: "relative" },
  tableFelt: { alignItems: "center", borderRadius: 62, borderWidth: 1, height: 96, justifyContent: "center", left: "25%", position: "absolute", top: 57, width: "50%" },
  tableLabel: { fontFamily: "monospace", fontSize: 12, letterSpacing: 0.7, paddingHorizontal: 12, textAlign: "center", textTransform: "uppercase" },
  tableSeat: { alignItems: "center", minHeight: 64, minWidth: 72, padding: 2, position: "absolute", transform: [{ translateX: -36 }, { translateY: -30 }] },
  tableAvatar: { alignItems: "center", borderRadius: 11, borderWidth: 2, height: 40, justifyContent: "center", width: 40 },
  youInitial: { fontSize: 14, fontWeight: "700" },
  tableSeatName: { fontSize: 12, fontWeight: "700", marginTop: 2, maxWidth: 78 },
  tableSeatDirection: { fontFamily: "monospace", fontSize: 12 },
  tableNote: { fontSize: 12, lineHeight: 16, marginTop: -2 },
});
