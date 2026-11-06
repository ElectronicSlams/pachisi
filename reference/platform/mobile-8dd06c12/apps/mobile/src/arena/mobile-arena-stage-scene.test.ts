import { mobileArenaStageInteraction, mobileArenaStageScene } from "./mobile-arena-stage-scene";
import { mobileBattlefieldScene } from "@/battlefield/mobile-battlefield-scene";
import type { MobileArenaSession, PublicMobileArenaSession } from "./mobile-arena-gateway";

describe("mobile Arena Stage scene projection", () => {
  it("uses the shared Battlefield adapter to produce the canonical family scene", () => {
    const scene = mobileArenaStageScene(session());

    expect(scene).toMatchObject({
      gameSlug: "connect-four",
      rendererFamily: "connect_four",
      rows: 6,
      cols: 7,
      summary: {
        activePlayer: "player_1",
        terminal: false,
        turn: 7,
        scores: { player_1: 1, player_2: 0 },
      },
    });
    expect(scene?.nodes[38]?.label).toContain("R");
    expect(scene?.actionTargets).toEqual([
      { id: "cell-0", action: "0", label: "Drop in column 1", disabled: false },
      { id: "cell-2", action: "2", label: "Drop in column 3. Column is temporarily disabled", disabled: true },
    ]);
    expect(scene?.nodes[0]?.actionTargetId).toBe("cell-0");
  });

  it("fails closed when a caller supplies an unprojected or unsafe scene payload", () => {
    const unprojected = { ...session(), stageProjectionVersion: undefined } as unknown as PublicMobileArenaSession;
    expect(mobileArenaStageScene(unprojected)).toBeNull();

    const unsafe = {
      ...session(),
      publicState: { board: Array.from({ length: 42 }, () => null), privateState: "do not render" },
    } as unknown as PublicMobileArenaSession;
    expect(mobileArenaStageScene(unsafe)).toBeNull();
  });

  it("maps only explicitly published safe premove targets during a model turn", () => {
    const current = session();
    const scene = mobileArenaStageScene({
      ...current,
      activeSeatId: "player_2",
      activeParticipantType: "model",
      currentPlayer: "model",
      legalActions: [],
      premoveActions: current.legalActions ?? [],
    });

    expect(scene?.actionTargets.map((target) => target.action)).toEqual(["0", "2"]);
  });

  it("turns typed chess moves into source selection and exact legal destinations", () => {
    const current = chessSession(["e2e4", "e2e3", "g1f3"]);
    const sources = mobileArenaStageInteraction(current);

    expect(sources.pieceMove).toEqual({
      actionTokens: ["e2e4", "e2e3", "g1f3"],
      selectedSourceNodeId: null,
      sourceNodeIds: ["cell-52", "cell-62"],
    });
    expect(sources.scene?.actionTargets.map((target) => target.id)).toEqual(["cell-52", "cell-62"]);

    const destinations = mobileArenaStageInteraction(current, "cell-52");
    expect(destinations.scene?.actionTargets).toEqual([
      { id: "cell-52", action: "piece-cancel:cell-52", label: "Cancel selected piece", disabled: false },
      { id: "cell-36", action: "e2e4", label: "Move e2 to e4", disabled: false },
      { id: "cell-44", action: "e2e3", label: "Move e2 to e3", disabled: false },
    ]);
  });

  it("leaves ambiguous promotion choices in the complete legal-action control", () => {
    const interaction = mobileArenaStageInteraction(chessSession(["e7e8q", "e7e8r"]));

    expect(interaction.pieceMove).toBeNull();
    expect(interaction.scene?.actionTargets).toEqual([]);
  });

  it("shows the Poker owner hand face up, public board cards centrally, and opponent counts face down", () => {
    const scene = mobileArenaStageScene(cardSession({
      gameSlug: "no-limit-texas-holdem",
      publicState: Object.freeze({
        board: Object.freeze(["2C", "7D", "TH"]),
        hand_counts: Object.freeze({ player_1: 2, player_2: 2, player_3: 2, player_4: 2 }),
        pot: 12,
      }),
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "no-limit-texas-holdem",
        playerId: "player_1",
        turn: 7,
        kind: "playing_cards",
        cards: Object.freeze(["AS", "KH"]),
        cardsVisible: true,
        source: "hole",
      }),
    }));

    expect(scene?.rendererFamily).toBe("card_table");
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-owner-card-")).map((node) => node.label))
      .toEqual(["A♠", "K♥"]);
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-center-card-")).map((node) => node.label))
      .toEqual(["2♣", "7♦", "10♥"]);
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-seat-"))).toHaveLength(6);
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-seat-")).every((node) => node.label === "HIDDEN"))
      .toBe(true);
    expect(scene?.accessibility.map((node) => node.label).join(" | "))
      .toContain("Your hand. Card 1 of 2, ace of spades");
    expect(scene).toMatchObject({ rows: 0, cols: 0 });
    expect(scene?.accessibility.map((node) => node.label).join(" | ")).toMatch(
      /Opponent hand.*Table.*Your hand/u,
    );
    expect(JSON.stringify(scene)).not.toContain("viewerPrivate");
  });

  it("keeps the Hanabi owner hand face down, exposes all partner colors, and preserves partner seat identity", () => {
    const scene = mobileArenaStageScene(cardSession({
      gameSlug: "hanabi",
      publicState: Object.freeze({ hand_counts: Object.freeze({ player_1: 4, player_2: 4 }) }),
      activeSeatId: "player_2",
      activeParticipantType: "model",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "hanabi",
        playerId: "player_1",
        turn: 7,
        kind: "hanabi_hand",
        cardCount: 4,
        cardsVisible: false,
        visiblePartnerCards: Object.freeze(["R1", "B2", "G3", "Y4", "W5"]),
      }),
    }));

    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-owner-card-")).map((node) => node.label))
      .toEqual(["HIDDEN", "HIDDEN", "HIDDEN", "HIDDEN"]);
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-partner-player_2-card-")).map((node) => node.label))
      .toEqual(["Red 1", "Blue 2", "Green 3", "Yellow 4", "White 5"]);
    expect(scene?.summary.activePlayer).toBe("player_2");
  });

  it("projects Mahjong tiles semantically and maps discard actions to the exact owner tile", () => {
    const interaction = mobileArenaStageInteraction(cardSession({
      gameSlug: "mahjong",
      legalActions: Object.freeze([stageAction("discard:B1", "Discard bamboo 1")]),
      publicState: Object.freeze({
        discard_pile: Object.freeze([Object.freeze({ player: "player_2", tile: "D9" })]),
        hand_counts: Object.freeze({ player_1: 3, player_2: 3 }),
      }),
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "mahjong",
        playerId: "player_1",
        turn: 7,
        kind: "mahjong_tiles",
        cards: Object.freeze(["B1", "C4", "D9"]),
        cardsVisible: true,
        source: "hand",
      }),
    }));

    expect(interaction.scene?.nodes.filter((node) => node.id.startsWith("arena-owner-tile-")).map((node) => node.label))
      .toEqual(["B1", "C4", "D9"]);
    expect(interaction.scene?.nodes.find((node) => node.id === "arena-owner-tile-0")?.actionTargetId)
      .toBe("arena-owner-tile-0");
    expect(interaction.scene?.accessibility.find((node) => node.id === "arena-owner-tile-0")?.label)
      .toBe("Your hand. Tile 1 of 3, 1 bamboo");
  });

  it("keeps watch-only Blackjack on its card renderer and renders Dou Dizhu jokers", () => {
    const blackjack = mobileArenaStageScene(cardSession({
      gameSlug: "blackjack",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "blackjack",
        playerId: "player_1",
        turn: 7,
        kind: "playing_cards",
        cards: Object.freeze(["10", "11", "10"]),
        cardsVisible: true,
        source: "player_hand",
      }),
    }));
    expect(blackjack).toMatchObject({ rendererFamily: "card_table" });
    expect(blackjack?.nodes.filter((node) => node.id.startsWith("arena-owner-card-")).map((node) => node.label))
      .toEqual(["10", "A", "10"]);

    const douDizhu = mobileArenaStageScene(cardSession({
      gameSlug: "dou-dizhu",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "dou-dizhu",
        playerId: "player_1",
        turn: 7,
        kind: "playing_cards",
        cards: Object.freeze(["AS", "BJ", "RJ"]),
        cardsVisible: true,
        source: "hand",
      }),
    }));
    expect(douDizhu?.nodes.filter((node) => node.id.startsWith("arena-owner-card-")).map((node) => node.label))
      .toEqual(["A♠", "Black Joker", "Red Joker"]);
  });

  it("renders every current Mahjong token form with semantic labels", () => {
    const scene = mobileArenaStageScene(cardSession({
      gameSlug: "mahjong",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "mahjong",
        playerId: "player_1",
        turn: 7,
        kind: "mahjong_tiles",
        cards: Object.freeze(["B1", "1m", "2p", "3s", "east", "red", "red"]),
        cardsVisible: true,
        source: "hand",
      }),
    }));
    expect(scene?.nodes.filter((node) => node.id.startsWith("arena-owner-tile-")).map((node) => node.label))
      .toEqual(["B1", "1M", "2P", "3S", "EAST", "RED", "RED"]);
    expect(scene?.accessibility.map((node) => node.label).join(" | ")).toMatch(
      /1 characters.*2 dots.*3 bamboo.*east honor tile.*red honor tile/u,
    );
  });

  it("maps every legal card in a dense 17-card hand to its own owner node", () => {
    const cards = Object.freeze([
      "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C",
      "JC", "QC", "KC", "AC", "2D", "3D", "4D", "5D",
    ]);
    const interaction = mobileArenaStageInteraction(cardSession({
      gameSlug: "bridge",
      legalActions: Object.freeze(cards.map((card) => stageAction(`play:${card}`, `Play ${card}`))),
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "bridge",
        playerId: "player_1",
        turn: 7,
        kind: "playing_cards",
        cards,
        cardsVisible: true,
        source: "hand",
      }),
    }));
    const ownerNodes = interaction.scene?.nodes.filter((node) => node.id.startsWith("arena-owner-card-")) ?? [];
    expect(ownerNodes).toHaveLength(17);
    expect(ownerNodes.map((node) => node.actionTargetId)).toEqual(
      Array.from({ length: 17 }, (_, index) => `arena-owner-card-${index}`),
    );
    expect(interaction.scene?.actionTargets.map((target) => target.action)).toEqual(
      cards.map((card) => `play:${card}`),
    );
  });

  it("renders Goofspiel number-card inventory through the shared card table", () => {
    const values = Object.freeze([1, 4, 9, 13]);
    const interaction = mobileArenaStageInteraction(cardSession({
      gameSlug: "goofspiel",
      legalActions: Object.freeze(values.map((value) => stageAction(`play:${value}`, `Play ${value}`))),
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "goofspiel",
        playerId: "player_1",
        turn: 7,
        kind: "number_cards",
        values,
      }),
    }));
    expect(interaction.scene?.nodes.filter((node) => node.id.startsWith("arena-owner-number-card-")).map((node) => node.label))
      .toEqual(["1", "4", "9", "13"]);
    expect(interaction.scene?.actionTargets.map((target) => target.action))
      .toEqual(["play:1", "play:4", "play:9", "play:13"]);
  });

  it("never permits the Arena viewer envelope through the public Battlefield adapter", () => {
    expect(mobileBattlefieldScene("no-limit-texas-holdem", {
      publicState: { board: ["2C", "7D", "TH"] },
      viewerPrivate: {
        schemaVersion: "eslams.arena.viewer-private.v1",
        kind: "playing_cards",
        cards: ["AS", "KH"],
      },
    })).toBeNull();
  });
});

function cardSession(overrides: Partial<MobileArenaSession>): MobileArenaSession {
  const seats = Object.freeze([
    Object.freeze({
      seatId: "player_1",
      participantType: "human" as const,
      modelId: null,
      label: "You",
      displayOrder: 0,
      teamId: null,
    }),
    ...[2, 3, 4].map((index) => Object.freeze({
      seatId: `player_${index}`,
      participantType: "model" as const,
      modelId: `provider/model-${index}`,
      label: `Model ${index}`,
      displayOrder: index - 1,
      teamId: null,
    })),
  ]);
  return Object.freeze({
    ...session(),
    mode: "multi_seat",
    seats,
    participantBySeat: Object.freeze(Object.fromEntries(seats.map((seat) => [seat.seatId, seat]))),
    viewerPrivate: null,
    ...overrides,
  }) as MobileArenaSession;
}

function stageAction(token: string, label: string) {
  return Object.freeze({
    token,
    label,
    shortLabel: label,
    verb: "play",
    object: null,
    category: "card",
    group: "hand",
    sortKey: token,
    promptLabel: label,
    confirm: false,
    disabledReason: null,
    value: null,
  });
}

function chessSession(tokens: readonly string[]): PublicMobileArenaSession {
  const actions = tokens.map((token) => Object.freeze({
    token,
    label: `Move ${token.slice(0, 2)} to ${token.slice(2, 4)}`,
    shortLabel: `${token.slice(0, 2)}-${token.slice(2, 4)}`,
    verb: "move",
    object: token.slice(2, 4),
    category: "move_piece",
    group: "Move a piece",
    sortKey: `move_piece:${token}`,
    promptLabel: `move ${token.slice(0, 2)} to ${token.slice(2, 4)}`,
    confirm: false,
    disabledReason: null,
    value: null,
  }));
  return Object.freeze({
    ...session(),
    gameSlug: "chess",
    legalActions: Object.freeze(actions),
    publicState: Object.freeze({
      fen: tokens.some((token) => token.startsWith("e7"))
        ? "4k3/4P3/8/8/8/8/8/4K3 w - - 0 1"
        : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    }),
    renderHints: Object.freeze({ renderer: "chessboard" }),
    scores: Object.freeze({ player_1: 0, player_2: 0 }),
  });
}

function session(): PublicMobileArenaSession {
  return Object.freeze({
    sessionId: "session_stage",
    gameSlug: "connect-four",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 7,
    updatedAt: 120,
    stageProjectionVersion: 1,
    activeSeatId: "player_1",
    activeParticipantType: "human",
    legalActions: Object.freeze([
      Object.freeze({
        token: "0",
        label: "Drop in column 1",
        shortLabel: "1",
        verb: "Drop",
        object: null,
        category: "column",
        group: "board",
        sortKey: "00",
        promptLabel: null,
        confirm: false,
        disabledReason: null,
        value: Object.freeze({ column: 0 }),
      }),
      Object.freeze({
        token: "2",
        label: "Drop in column 3",
        shortLabel: "3",
        verb: "Drop",
        object: null,
        category: "column",
        group: "board",
        sortKey: "02",
        promptLabel: null,
        confirm: false,
        disabledReason: "Column is temporarily disabled",
        value: Object.freeze({ column: 2 }),
      }),
    ]),
    publicState: Object.freeze({
      board: Object.freeze(Array.from({ length: 42 }, (_, index) => index === 38 ? "player_1" : null)),
      rows: 6,
      cols: 7,
    }),
    renderHints: Object.freeze({ symbols: Object.freeze({ player_1: "R", player_2: "Y" }) }),
    displayFrame: null,
    scores: Object.freeze({ player_1: 1, player_2: 0 }),
  });
}
