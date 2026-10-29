import { act, fireEvent, render } from "@testing-library/react-native";

import { MobileArenaCurtainRiser } from "./mobile-arena-curtain-riser";
import type {
  MobileArenaCurtainLifecycle,
  MobileArenaFightCard,
} from "./mobile-arena-curtain-state";
import type { PublicMobileArenaSession } from "./mobile-arena-gateway";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

jest.mock("@/renderer/mobile-game-board-canvas", () => {
  const { View } = jest.requireActual("react-native") as typeof import("react-native");
  return { MobileGameBoardCanvas: () => <View accessibilityLabel="Canonical game preview" /> };
});

jest.mock("./mobile-arena-preview-scene", () => ({
  mobileArenaPreviewScene: () => ({ gameSlug: "chess" }),
}));

describe("MobileArenaCurtainRiser", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("presents the fight card and explicit Resume/End conflict choices", async () => {
    const onResumeCurrent = jest.fn();
    const onEndCurrent = jest.fn();
    const screen = await render(
      <MobileArenaCurtainRiser
        activeMatchLabel="Connect Four · Claude"
        fightCard={fightCard}
        lifecycle={{ kind: "active-session-conflict", activeSession: activeSession }}
        onBackToArena={jest.fn()}
        onEndCurrent={onEndCurrent}
        onResumeCurrent={onResumeCurrent}
        reducedMotion
      />,
    );

    expect(screen.getByLabelText("You versus GPT-5")).toBeTruthy();
    expect(screen.getByText("A match is already active")).toBeTruthy();
    expect(screen.getByText("Connect Four · Claude")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Resume current match" }));
    await fireEvent.press(screen.getByRole("button", { name: "Exit and start" }));
    expect(onResumeCurrent).toHaveBeenCalledTimes(1);
    expect(onEndCurrent).toHaveBeenCalledTimes(1);
  });

  it("offers only exit-and-start for a web-started conflict", async () => {
    const onEndCurrent = jest.fn();
    const screen = await render(
      <MobileArenaCurtainRiser
        activeMatchLabel="Chess · Claude"
        fightCard={fightCard}
        lifecycle={{
          kind: "active-session-conflict",
          activeSession: { ...activeSession, clientChannel: "web" },
        }}
        onBackToArena={jest.fn()}
        onEndCurrent={onEndCurrent}
        reducedMotion
      />,
    );

    expect(screen.queryByRole("button", { name: "Resume current match" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Exit and start" }));
    expect(onEndCurrent).toHaveBeenCalledTimes(1);
  });

  it("keeps retryable engine uncertainty on the curtain", async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <MobileArenaCurtainRiser
        fightCard={fightCard}
        lifecycle={{ kind: "retryable-engine-error" }}
        onBackToArena={jest.fn()}
        onRetry={onRetry}
        reducedMotion
      />,
    );

    expect(screen.getByText("The engine needs another try")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("honors the server Retry-After window before enabling another attempt", async () => {
    jest.useFakeTimers();
    const onRetry = jest.fn();
    const screen = await render(
      <MobileArenaCurtainRiser
        fightCard={fightCard}
        lifecycle={{ kind: "retryable-engine-error", retryAfterSeconds: 2 }}
        onBackToArena={jest.fn()}
        onRetry={onRetry}
        reducedMotion
      />,
    );

    expect(screen.getByRole("button", { name: "Try again in 2s" }).props.accessibilityState)
      .toEqual({ disabled: true });
    await act(() => { jest.advanceTimersByTime(1_000); });
    expect(screen.getByRole("button", { name: "Try again in 1s" })).toBeTruthy();
    await act(() => { jest.advanceTimersByTime(1_000); });
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("morphs a server-ready curtain into the Stage once", async () => {
    jest.useFakeTimers();
    const onRevealStage = jest.fn();
    const lifecycle: MobileArenaCurtainLifecycle = { kind: "ready", session };
    const screen = await render(
      <MobileArenaCurtainRiser
        fightCard={fightCard}
        lifecycle={lifecycle}
        onBackToArena={jest.fn()}
        onRevealStage={onRevealStage}
        reducedMotion
      />,
    );

    expect(screen.getByText("Match ready")).toBeTruthy();
    expect(onRevealStage).not.toHaveBeenCalled();
    await act(() => { jest.runAllTimers(); });
    expect(onRevealStage).toHaveBeenCalledTimes(1);
    expect(onRevealStage).toHaveBeenCalledWith(session);
    await screen.rerender(
      <MobileArenaCurtainRiser
        fightCard={fightCard}
        lifecycle={lifecycle}
        onBackToArena={jest.fn()}
        onRevealStage={onRevealStage}
        reducedMotion
      />,
    );
    await act(() => { jest.runAllTimers(); });
    expect(onRevealStage).toHaveBeenCalledTimes(1);
  });
});

const fightCard: MobileArenaFightCard = Object.freeze({
  gameLabel: "Chess",
  gameSlug: "chess",
  seats: Object.freeze([
    Object.freeze({ label: "You", participantKind: "human", seatId: "player_1" }),
    Object.freeze({ label: "GPT-5", participantKind: "model", seatId: "player_2" }),
  ]),
  variantLabel: "standard",
});

const activeSession = Object.freeze({
  sessionId: "session_existing",
  clientChannel: "mobile" as const,
  status: "active" as const,
  startedAt: 10,
  lastActionAt: 100,
  expiresAt: 10_100,
  updatedAt: 110,
});

const session: PublicMobileArenaSession = Object.freeze({
  sessionId: "session_new",
  gameSlug: "chess",
  modelId: "openai/gpt-5",
  status: "active",
  currentPlayer: "human",
  turnPhase: "human_turn",
  terminalReason: null,
  lastAcceptedHumanActionAt: 100,
  inactivityExpiresAt: 10_100,
  modelTurn: null,
  moveNumber: 0,
  updatedAt: 120,
});
