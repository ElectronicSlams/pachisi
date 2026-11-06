import { fireEvent, render } from "@testing-library/react-native";
import { SCENE_SCHEMA_VERSION, type BoardScene } from "@eslams/game-render-contract";
import { StyleSheet } from "react-native";

import {
  MobileArenaPrivateInventory,
  mobileArenaPrivateInventoryModel,
} from "./mobile-arena-private-inventory";
import type { ArenaViewerPrivate } from "./mobile-arena-gateway";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

describe("mobile Arena private inventory", () => {
  it("builds owner-only presentations for dice, fleets, private values, and sealed commitments", () => {
    expect(model(privateEnvelope("liars-dice", {
      kind: "dice",
      values: [1, 3, 6, 6, 2],
    }))?.items.map((item) => item.label)).toEqual(["1", "3", "6", "6", "2"]);

    expect(model(privateEnvelope("battleship", {
      kind: "battleship_fleet",
      ownShips: ["0,1", "submarine:C4-C6"],
    }))?.items.map((item) => item.label)).toEqual(["0,1", "submarine:C4-C6"]);

    expect(model(privateEnvelope("first-price-sealed-bid-auction", {
      kind: "private_value",
      value: 73,
    }))?.label).toBe("Your private valuation");
    expect(model(privateEnvelope("negotiation", {
      kind: "private_value",
      value: 0.41,
    }))?.items[0]?.label).toBe("0.41");

    expect(model(privateEnvelope("rock-paper-scissors", {
      kind: "none",
      sealedCommitment: { kind: "choice", token: "rock", label: "Rock submitted" },
    }))).toMatchObject({
      commitment: { kind: "choice", token: "rock", label: "Rock submitted" },
      items: [],
      label: "Your committed choice",
    });
  });

  it("renders each non-card private inventory with semantic owner labels", async () => {
    const screen = await render(
      <MobileArenaPrivateInventory
        busyToken={null}
        scene={null}
        viewerPrivate={privateEnvelope("liars-dice", { kind: "dice", values: [1, 6] })}
      />,
    );
    expect(screen.getByLabelText("Your die 1 of 2, face 1")).toBeTruthy();
    expect(screen.getByLabelText("Your die 2 of 2, face 6")).toBeTruthy();

    await screen.rerender(
      <MobileArenaPrivateInventory
        busyToken={null}
        scene={null}
        viewerPrivate={privateEnvelope("battleship", {
          kind: "battleship_fleet",
          ownShips: ["0,1", "submarine:C4-C6"],
        })}
      />,
    );
    expect(screen.getByLabelText("Your fleet position 2 of 2, submarine:C4-C6")).toBeTruthy();

    await screen.rerender(
      <MobileArenaPrivateInventory
        busyToken={null}
        scene={null}
        viewerPrivate={privateEnvelope("bargaining", {
          kind: "private_value",
          value: 0.41,
        })}
      />,
    );
    expect(screen.getByLabelText("Your private reserve, 0.41")).toBeTruthy();

    await screen.rerender(
      <MobileArenaPrivateInventory
        busyToken={null}
        scene={null}
        viewerPrivate={privateEnvelope("first-price-sealed-bid-auction", {
          kind: "private_value",
          value: 73,
          sealedCommitment: { kind: "bid", token: "bid:52", label: "Bid 52 submitted" },
        })}
      />,
    );
    expect(screen.getByLabelText("Your committed bid, Bid 52 submitted")).toBeTruthy();
    expect(screen.getByText("Waiting for reveal")).toBeTruthy();
    expect(screen.queryByText("bid:52")).toBeNull();
  });

  it("gives all 17 dense-hand actions independent, accessible 52-point selection targets", async () => {
    const cards = Object.freeze([
      "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C",
      "JC", "QC", "KC", "AC", "2D", "3D", "4D", "5D",
    ]);
    const scene = denseCardScene(cards);
    const viewerPrivate = privateEnvelope("bridge", {
      kind: "playing_cards",
      cards,
      cardsVisible: true,
      source: "hand",
    });
    const onAction = jest.fn();
    const screen = await render(
      <MobileArenaPrivateInventory
        busyToken={null}
        onAction={onAction}
        scene={scene}
        viewerPrivate={viewerPrivate}
      />,
    );

    const buttons = cards.map((card, index) => screen.getByRole("button", {
      name: `Your hand. Card ${index + 1} of 17, ${card}`,
    }));
    expect(buttons).toHaveLength(17);
    for (const button of buttons) {
      const style = typeof button.props.style === "function"
        ? button.props.style({ pressed: false })
        : button.props.style;
      expect(StyleSheet.flatten(style).minHeight).toBeGreaterThanOrEqual(52);
      expect(StyleSheet.flatten(style).minWidth).toBeGreaterThanOrEqual(48);
      await fireEvent.press(button);
    }
    expect(onAction.mock.calls.map(([target]) => target.action)).toEqual(
      cards.map((card) => `play:${card}`),
    );
  });

  it("does not duplicate compact hands that are already fully tappable on the table", () => {
    const cards = Object.freeze(["AS", "KH"]);
    expect(mobileArenaPrivateInventoryModel(
      privateEnvelope("no-limit-texas-holdem", {
        kind: "playing_cards",
        cards,
        cardsVisible: true,
        source: "hole",
      }),
      denseCardScene(cards),
    )).toBeNull();
  });
});

function model(viewerPrivate: ArenaViewerPrivate) {
  return mobileArenaPrivateInventoryModel(viewerPrivate, null);
}

function privateEnvelope(
  gameSlug: string,
  value: Readonly<Record<string, unknown>>,
): ArenaViewerPrivate {
  return Object.freeze({
    schemaVersion: "eslams.arena.viewer-private.v1",
    gameSlug,
    playerId: "player_1",
    turn: 7,
    ...value,
  }) as ArenaViewerPrivate;
}

function denseCardScene(cards: readonly string[]): BoardScene {
  const nodes = cards.map((card, index) => Object.freeze({
    id: `arena-owner-card-${index}`,
    kind: "card" as const,
    label: card,
    row: null,
    col: null,
    index,
    actionTargetId: `arena-owner-card-${index}`,
  }));
  const actionTargets = cards.map((card, index) => Object.freeze({
    id: `arena-owner-card-${index}`,
    action: `play:${card}`,
    label: `Play ${card}`,
    disabled: false,
  }));
  return Object.freeze({
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug: "bridge",
    rendererFamily: "card_table",
    rows: 0,
    cols: 0,
    nodes: Object.freeze(nodes),
    actionTargets: Object.freeze(actionTargets),
    accessibility: Object.freeze(nodes.map((node, index) => Object.freeze({
      id: node.id,
      role: "button" as const,
      label: `Your hand. Card ${index + 1} of ${cards.length}, ${cards[index]}`,
      row: null,
      col: null,
      actionTargetId: node.actionTargetId,
    }))),
    summary: Object.freeze({
      activePlayer: "player_1",
      terminal: false,
      turn: 7,
      scores: Object.freeze({}),
    }),
  });
}
