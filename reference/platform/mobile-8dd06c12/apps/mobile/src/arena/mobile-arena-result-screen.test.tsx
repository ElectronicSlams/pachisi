import { SCENE_SCHEMA_VERSION, type BoardScene } from "@eslams/game-render-contract";
import { CLASSIC_DARK } from "@eslams/theme-tokens";
import { fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { PublicMobileArenaSession } from "./mobile-arena-gateway";
import { MobileArenaResultScreen } from "./mobile-arena-result-screen";

const mockScheduleMobileAccessibilityFocus = jest.fn((resolve: () => unknown) => {
  void resolve;
  return jest.fn();
});

jest.mock("@/accessibility/mobile-accessibility-runtime", () => ({
  MOBILE_MODAL_EXIT_ACCESSIBILITY_DELAY_MS: 900,
  scheduleMobileAccessibilityFocus: (resolve: () => unknown) => (
    mockScheduleMobileAccessibilityFocus(resolve)
  ),
}));

jest.mock("@/battlefield/mobile-battlefield-board-canvas", () => {
  const { Text: MockText, View: MockView } = jest.requireActual("react-native") as typeof import("react-native");
  return {
    MobileBattlefieldBoardCanvas: ({ scene }: Readonly<{ scene: BoardScene }>) => (
      <MockView accessibilityLabel="Rendered canonical final board">
        <MockText>{`${scene.gameSlug} board · ${scene.nodes.length} cells`}</MockText>
      </MockView>
    ),
  };
});

jest.mock("./mobile-arena-result-celebration", () => {
  const { View: MockView } = jest.requireActual("react-native") as typeof import("react-native");
  return { MobileArenaResultCelebration: () => <MockView accessibilityLabel="Result celebration" /> };
});

describe("MobileArenaResultScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows Saved only after publication is ready and gates replay/share while pending", async () => {
    const onWatchReplay = jest.fn();
    const pending = await renderResult({
      onWatchReplay,
      session: resultSession({ resultPublication: { status: "pending" } }),
    });

    expect(pending.getByText("Finalising your replay…")).toBeTruthy();
    expect(pending.queryByText("Saved to your profile")).toBeNull();
    const watch = pending.getByRole("button", { name: "Preparing replay…" });
    const share = pending.getByRole("button", { name: "Share" });
    expect(watch.props.accessibilityState).toEqual({ disabled: true });
    expect(share.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(watch);
    await fireEvent.press(share);
    expect(onWatchReplay).not.toHaveBeenCalled();
    expect(pending.queryByText("Share image")).toBeNull();

    await pending.rerender(resultElement({
      onWatchReplay,
      session: resultSession({ resultPublication: { status: "unavailable" } }),
    }));
    expect(pending.getByText("Replay unavailable")).toBeTruthy();
    expect(pending.queryByText("Saved to your profile")).toBeNull();

    await pending.rerender(resultElement({
      onWatchReplay,
      session: resultSession({ resultPublication: readyPublication() }),
    }));
    expect(pending.getByText("Saved to your profile")).toBeTruthy();
    expect(pending.queryByText("Finalising your replay…")).toBeNull();
    expect(pending.getByRole("button", { name: "Watch replay" }).props.accessibilityState)
      .toEqual({ disabled: false });
  });

  it("uses the exact timeout-award copy and never mounts a celebration", async () => {
    const screen = await renderResult({
      celebrate: true,
      session: resultSession({
        terminalReason: "model_timeout_award",
        winner: "human",
      }),
    });

    expect(screen.getByRole("header", { name: "Awarded win - model timed out" })).toBeTruthy();
    expect(screen.getByText("The model never returned a move, so the server awarded this match to you.")).toBeTruthy();
    expect(screen.getByText("This result does not affect ratings or best scalp.")).toBeTruthy();
    expect(screen.queryByLabelText("Result celebration")).toBeNull();
  });

  it("renders a normal human-win celebration only when the caller authorizes it", async () => {
    const screen = await renderResult({ celebrate: false, session: resultSession() });
    expect(screen.getByRole("header", { name: "You won." })).toBeTruthy();
    expect(screen.queryByLabelText("Result celebration")).toBeNull();

    await screen.rerender(resultElement({ celebrate: true, session: resultSession() }));
    expect(screen.getByLabelText("Result celebration")).toBeTruthy();
  });

  it("moves accessibility focus to the terminal outcome when the Stage becomes a result", async () => {
    await renderResult({ session: resultSession() });

    expect(mockScheduleMobileAccessibilityFocus).toHaveBeenCalled();
    const resolve = mockScheduleMobileAccessibilityFocus.mock.calls[0]?.[0];
    expect((resolve?.() as { props?: unknown }).props).toEqual(expect.objectContaining({
      accessibilityRole: "header",
      children: "You won.",
    }));
  });

  it("exposes all visibility choices and confirms before making a non-public replay public", async () => {
    const onVisibilityChange = jest.fn();
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const screen = await renderResult({
      onVisibilityChange,
      session: resultSession({ matchVisibility: "only_me" }),
    });

    const publicChoice = screen.getByRole("radio", { name: "Public" });
    expect(screen.getByRole("radio", { name: "Followers" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Only me" }).props.accessibilityState)
      .toEqual({ checked: true, disabled: false });

    await fireEvent.press(screen.getByRole("radio", { name: "Followers" }));
    expect(onVisibilityChange).toHaveBeenCalledWith("followers");
    await fireEvent.press(publicChoice);
    expect(onVisibilityChange).not.toHaveBeenCalledWith("public");
    expect(alert).toHaveBeenCalledWith(
      "Make this replay public?",
      expect.stringContaining("Anyone will be able to open it"),
      expect.arrayContaining([
        expect.objectContaining({ style: "cancel", text: "Cancel" }),
        expect.objectContaining({ text: "Make public" }),
      ]),
    );

    const buttons = alert.mock.calls[0]?.[2];
    const confirmation = buttons?.find((button) => button.text === "Make public");
    confirmation?.onPress?.();
    expect(onVisibilityChange).toHaveBeenCalledWith("public");
  });

  it("builds the share card from the actual board component without internal identifiers", async () => {
    const session = resultSession({
      sessionId: "session_private_123",
      resultPublication: {
        status: "ready",
        matchId: "match_internal_456",
        replayId: "replay_internal_789",
        savedToProfile: true,
      },
      stateHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });
    const screen = await renderResult({ session });

    expect(screen.getAllByLabelText("Rendered canonical final board")).toHaveLength(1);
    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    expect(screen.getAllByLabelText("Rendered canonical final board")).toHaveLength(2);
    expect(screen.getAllByText("chess board · 4 cells")).toHaveLength(2);
    const rendered = JSON.stringify(screen.toJSON());
    expect(rendered).not.toContain("session_private_123");
    expect(rendered).not.toContain("match_internal_456");
    expect(rendered).not.toContain("replay_internal_789");
    expect(rendered).not.toContain("sha256:bbbb");

  });
});

async function renderResult(overrides: ResultOverrides = {}) {
  return render(resultElement(overrides));
}

type ResultOverrides = Readonly<{
  celebrate?: boolean;
  onVisibilityChange?: (visibility: "public" | "followers" | "only_me") => void;
  onWatchReplay?: () => void;
  session?: PublicMobileArenaSession;
}>;

function resultElement({
  celebrate = false,
  onVisibilityChange = jest.fn(),
  onWatchReplay = jest.fn(),
  session = resultSession(),
}: ResultOverrides = {}) {
  return (
    <MobileArenaResultScreen
      celebrate={celebrate}
      error={null}
      onBackToArena={jest.fn()}
      onNewOpponent={jest.fn()}
      onPlayAgain={jest.fn()}
      onVisibilityChange={onVisibilityChange}
      onWatchReplay={onWatchReplay}
      reducedMotion={false}
      scene={finalScene}
      session={session}
      theme={CLASSIC_DARK}
      username="makriman"
      visibilityBusy={false}
    />
  );
}

function readyPublication() {
  return Object.freeze({
    status: "ready" as const,
    matchId: "match_public_1",
    replayId: "replay_public_1",
    savedToProfile: true as const,
  });
}

function resultSession(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_result",
    gameSlug: "chess",
    modelId: "openai/gpt-5-mini",
    status: "completed",
    currentPlayer: "model",
    turnPhase: "completed",
    terminalReason: "normal",
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 19,
    updatedAt: 120,
    matchVisibility: "only_me",
    seats: Object.freeze([
      Object.freeze({ seatId: "player_1", participantType: "human" as const, modelId: null, label: "You", displayOrder: 0, teamId: null }),
      Object.freeze({ seatId: "player_2", participantType: "model" as const, modelId: "openai/gpt-5-mini", label: "GPT-5 mini", displayOrder: 1, teamId: null }),
    ]),
    scores: Object.freeze({ player_1: 1, player_2: 0 }),
    outcome: Object.freeze({ winner: "player_1" }),
    stateHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    winner: "human",
    winnerSeatId: "player_1",
    resultPublication: readyPublication(),
    ...overrides,
  });
}

const finalScene: BoardScene = Object.freeze({
  schemaVersion: SCENE_SCHEMA_VERSION,
  gameSlug: "chess",
  rendererFamily: "square_board",
  rows: 2,
  cols: 2,
  nodes: Object.freeze([
    Object.freeze({ id: "cell-0", kind: "board" as const, label: "White king", row: 0, col: 0, index: 0, actionTargetId: null }),
    Object.freeze({ id: "cell-1", kind: "board" as const, label: "Empty", row: 0, col: 1, index: 1, actionTargetId: null }),
    Object.freeze({ id: "cell-2", kind: "board" as const, label: "Empty", row: 1, col: 0, index: 2, actionTargetId: null }),
    Object.freeze({ id: "cell-3", kind: "board" as const, label: "Black king", row: 1, col: 1, index: 3, actionTargetId: null }),
  ]),
  actionTargets: Object.freeze([]),
  accessibility: Object.freeze([
    Object.freeze({ id: "cell-0", role: "gridcell" as const, label: "White king", row: 0, col: 0, actionTargetId: null }),
    Object.freeze({ id: "cell-1", role: "gridcell" as const, label: "Empty", row: 0, col: 1, actionTargetId: null }),
    Object.freeze({ id: "cell-2", role: "gridcell" as const, label: "Empty", row: 1, col: 0, actionTargetId: null }),
    Object.freeze({ id: "cell-3", role: "gridcell" as const, label: "Black king", row: 1, col: 1, actionTargetId: null }),
  ]),
  summary: Object.freeze({ activePlayer: null, terminal: true, turn: 19, scores: Object.freeze({ player_1: 1, player_2: 0 }) }),
});
