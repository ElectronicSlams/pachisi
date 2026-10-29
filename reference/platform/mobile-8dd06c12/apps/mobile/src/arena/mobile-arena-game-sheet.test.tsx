import { GAME_CATALOG_BY_SLUG } from "@eslams/core-types";
import type { MobileSearchModelFacts } from "@eslams/search-contract";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useState } from "react";

import { MobileArenaGameSheet } from "./mobile-arena-game-sheet";
import { mobileGameRuleContent } from "./mobile-game-rule-content";
import type { MobileArenaPreparedSetup } from "./mobile-arena-setup";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

jest.mock("@/renderer/mobile-game-board-canvas", () => {
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  return { MobileGameBoardCanvas: () => <View accessibilityLabel="Canonical game preview" /> };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

const model: MobileSearchModelFacts = Object.freeze({
  modelEntryId: "openai/gpt-5",
  modelEntryVersionId: "model-version-1",
  providerSlug: "openai",
  providerName: "OpenAI",
  providerLogoUrl: "https://eslams.com/assets/providers/openai.svg",
  modelSlug: "gpt-5",
  providerVersionString: "gpt-5-2026-07-01",
  publicName: "GPT-5",
  family: "GPT",
  turnSpeed: "ready",
  availability: "available",
  allowedGames: ["*"],
  followState: "unknown",
});

describe("MobileArenaGameSheet", () => {
  it("emits a prepared setup once when persistence returns an equivalent setup as new props", async () => {
    const onPreparedChanged = jest.fn();

    function PersistedSetupHarness() {
      const [initialSetup, setInitialSetup] = useState<MobileArenaPreparedSetup | null>(null);
      return (
        <MobileArenaGameSheet
          canStart
          favourite={false}
          game={GAME_CATALOG_BY_SLUG.chess!}
          initialSetup={initialSetup}
          initialVisibility="only_me"
          onClose={jest.fn()}
          onFavouriteChanged={jest.fn()}
          onOpponentChanged={jest.fn()}
          onPreparedChanged={(setup) => {
            onPreparedChanged(setup);
            setInitialSetup(Object.freeze({ ...setup }));
          }}
          onRetryRoster={jest.fn()}
          onStart={jest.fn()}
          preferredModelId={model.modelEntryId}
          reducedMotion
          roster={[model]}
          rosterPhase="ready"
        />
      );
    }

    const screen = await render(<PersistedSetupHarness />);

    await waitFor(() => expect(onPreparedChanged).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Start match" })).toBeTruthy();
  });

  it("locks the chosen side, visibility, and exact model version at the only Start boundary", async () => {
    const onStart = jest.fn();
    const onPreparedChanged = jest.fn();
    const chess = GAME_CATALOG_BY_SLUG.chess!;
    const chessRules = mobileGameRuleContent(chess);
    const screen = await render(
      <MobileArenaGameSheet
        canStart
        favourite={false}
        game={chess}
        initialSetup={null}
        initialVisibility="only_me"
        onClose={jest.fn()}
        onFavouriteChanged={jest.fn()}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={onPreparedChanged}
        onRetryRoster={jest.fn()}
        onStart={onStart}
        preferredModelId={model.modelEntryId}
        reducedMotion
        roster={[model]}
        rosterPhase="ready"
      />,
    );

    expect(screen.getByText(chessRules.shortSummary.join(" "))).toBeTruthy();
    expect(screen.getByText(chessRules.objective)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Full rules and accessibility show →" }));
    expect(screen.getByText(chessRules.fullRules)).toBeTruthy();
    expect(screen.getByText(chessRules.turnExample)).toBeTruthy();
    expect(screen.getByText("Legal actions")).toBeTruthy();
    expect(screen.getByText("Accessibility")).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "Second Seat B" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Followers" }));
    await fireEvent.press(screen.getByRole("button", { name: "Start match" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      setupVersion: 2,
      gameSlug: "chess",
      humanSeatId: "player_2",
      visibility: "followers",
      seats: [
        {
          seatId: "player_1",
          participant: {
            kind: "model",
            modelEntryId: "openai/gpt-5",
            modelEntryVersionId: "model-version-1",
            providerVersionString: "gpt-5-2026-07-01",
          },
        },
        { seatId: "player_2", participant: { kind: "human" } },
      ],
    }), expect.any(Function));
    expect(onPreparedChanged).toHaveBeenCalled();
  });

  it("keeps Start disabled offline while browse, rules, and favourites remain usable", async () => {
    const onFavouriteChanged = jest.fn();
    const onStart = jest.fn();
    const screen = await render(
      <MobileArenaGameSheet
        canStart={false}
        favourite={false}
        game={GAME_CATALOG_BY_SLUG.chess!}
        initialSetup={null}
        initialVisibility="only_me"
        onClose={jest.fn()}
        onFavouriteChanged={onFavouriteChanged}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={jest.fn()}
        onRetryRoster={jest.fn()}
        onStart={onStart}
        preferredModelId={model.modelEntryId}
        reducedMotion
        roster={[model]}
        rosterPhase="ready"
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Add Chess to favourites" }));
    expect(onFavouriteChanged).toHaveBeenCalledWith(true);
    const start = screen.getByRole("button", { name: "Network required" });
    expect(start.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(start);
    expect(onStart).not.toHaveBeenCalled();
  });

  it("assigns every table seat and exposes the searchable full roster per seat", async () => {
    const onStart = jest.fn();
    const game = GAME_CATALOG_BY_SLUG["no-limit-texas-holdem"]!;
    const screen = await render(
      <MobileArenaGameSheet
        canStart
        favourite={false}
        game={game}
        initialSetup={null}
        initialVisibility="public"
        onClose={jest.fn()}
        onFavouriteChanged={jest.fn()}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={jest.fn()}
        onRetryRoster={jest.fn()}
        onStart={onStart}
        preferredModelId={model.modelEntryId}
        reducedMotion
        roster={[model]}
        rosterPhase="ready"
      />,
    );

    expect(screen.getByRole("button", { name: "Seat 2, GPT-5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Seat 3, GPT-5" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Seat 4, GPT-5" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Seat 3, GPT-5" }));
    expect(screen.getByLabelText("Search models")).toBeTruthy();
    expect(screen.getByText("Models for Seat 3")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Back to game setup" }));
    await fireEvent.press(screen.getByRole("button", { name: "Start match" }));
    await waitFor(() => expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      gameSlug: "no-limit-texas-holdem",
      humanSeatId: "player_1",
      seats: expect.arrayContaining([
        { seatId: "player_1", participant: { kind: "human" } },
        expect.objectContaining({ seatId: "player_4" }),
      ]),
    }), expect.any(Function)));
  });

  it("selects the exact preferred version when one entry has multiple roster versions", async () => {
    const onStart = jest.fn();
    const older = Object.freeze({
      ...model,
      modelEntryVersionId: "model-version-older",
      providerVersionString: "gpt-5-2026-06-01",
    });
    const screen = await render(
      <MobileArenaGameSheet
        canStart
        favourite={false}
        game={GAME_CATALOG_BY_SLUG.chess!}
        initialSetup={null}
        initialVisibility="only_me"
        onClose={jest.fn()}
        onFavouriteChanged={jest.fn()}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={jest.fn()}
        onRetryRoster={jest.fn()}
        onStart={onStart}
        preferredModelId={model.modelEntryId}
        preferredModelVersionId={model.modelEntryVersionId}
        requireExactPreferredModel
        reducedMotion
        roster={[older, model]}
        rosterPhase="ready"
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Start match" }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      seats: expect.arrayContaining([
        expect.objectContaining({
          participant: expect.objectContaining({ modelEntryVersionId: "model-version-1" }),
        }),
      ]),
    }), expect.any(Function));
  });

  it("does not substitute another version when the exact preferred version disappears", async () => {
    const replacement = Object.freeze({
      ...model,
      modelEntryVersionId: "model-version-replacement",
      providerVersionString: "gpt-5-2026-08-01",
    });
    const screen = await render(
      <MobileArenaGameSheet
        canStart
        favourite={false}
        game={GAME_CATALOG_BY_SLUG.chess!}
        initialSetup={null}
        initialVisibility="only_me"
        onClose={jest.fn()}
        onFavouriteChanged={jest.fn()}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={jest.fn()}
        onRetryRoster={jest.fn()}
        onStart={jest.fn()}
        preferredModelId={model.modelEntryId}
        preferredModelVersionId={model.modelEntryVersionId}
        requireExactPreferredModel
        reducedMotion
        roster={[replacement]}
        rosterPhase="ready"
      />,
    );

    expect(screen.getByRole("button", { name: "Choose every seat" }).props.accessibilityState).toEqual({ disabled: true });
  });

  it("does not treat a missing version as a wildcard in strict exact mode", async () => {
    const screen = await render(
      <MobileArenaGameSheet
        canStart
        favourite={false}
        game={GAME_CATALOG_BY_SLUG.chess!}
        initialSetup={null}
        initialVisibility="only_me"
        onClose={jest.fn()}
        onFavouriteChanged={jest.fn()}
        onOpponentChanged={jest.fn()}
        onPreparedChanged={jest.fn()}
        onRetryRoster={jest.fn()}
        onStart={jest.fn()}
        preferredModelId={model.modelEntryId}
        preferredModelVersionId={null}
        requireExactPreferredModel
        reducedMotion
        roster={[model]}
        rosterPhase="ready"
      />,
    );

    expect(screen.getByRole("button", { name: "Choose every seat" }).props.accessibilityState).toEqual({ disabled: true });
  });
});
