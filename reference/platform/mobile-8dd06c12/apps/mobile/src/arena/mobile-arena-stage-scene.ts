import { GAME_CATALOG } from "@eslams/core-types";
import {
  SCENE_SCHEMA_VERSION,
  assertBoardSceneSafe,
  type AccessibleBoardNode,
  type ActionTarget,
  type BoardScene,
  type BoardSceneNode,
} from "@eslams/game-render-contract";

import { mobileBattlefieldScene } from "@/battlefield/mobile-battlefield-scene";
import type {
  ArenaStageLegalAction,
  ArenaViewerPrivate,
  MobileArenaSession,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

/**
 * Projects a parsed public Arena snapshot through the same canonical scene path used by
 * Battlefield. Stage owns live controls; it does not own a second rendering contract.
 */
export function mobileArenaStageScene(session: PublicMobileArenaSession): BoardScene | null {
  return mobileArenaStageInteraction(session).scene;
}

export type MobileArenaStageInteraction = Readonly<{
  scene: BoardScene | null;
  pieceMove: Readonly<{
    actionTokens: readonly string[];
    selectedSourceNodeId: string | null;
    sourceNodeIds: readonly string[];
  }> | null;
}>;

export function mobileArenaStageInteraction(
  session: PublicMobileArenaSession | MobileArenaSession,
  requestedSourceNodeId: string | null = null,
): MobileArenaStageInteraction {
  if (session.stageProjectionVersion !== 1
    || session.publicState === undefined
    || session.renderHints === undefined
    || session.displayFrame === undefined
    || session.scores === undefined
    || session.activeSeatId === undefined) return Object.freeze({ pieceMove: null, scene: null });
  const payload = Object.freeze({
    publicState: session.publicState,
    renderHints: session.renderHints,
    displayFrame: session.displayFrame,
    scores: session.scores,
    activePlayer: session.activeSeatId,
    terminal: session.status === "completed",
    turn: session.moveNumber,
  });
  const base = mobileArenaPrivateCardScene(session)
    ?? mobileBattlefieldScene(session.gameSlug, payload);
  if (!base) return Object.freeze({ pieceMove: null, scene: null });
  const pieceMoves = stagePieceMoves(session, base);
  if (pieceMoves.length > 0) {
    const sourceNodeIds = Object.freeze([...new Set(pieceMoves.map((move) => move.sourceNodeId))]);
    const selectedSourceNodeId = requestedSourceNodeId && sourceNodeIds.includes(requestedSourceNodeId)
      ? requestedSourceNodeId
      : null;
    const actionTargets = selectedSourceNodeId
      ? [
        Object.freeze({
          id: selectedSourceNodeId,
          action: `piece-cancel:${selectedSourceNodeId}`,
          label: "Cancel selected piece",
          disabled: false,
        }),
        ...pieceMoves.flatMap((move) => move.sourceNodeId === selectedSourceNodeId
          ? [Object.freeze({
            id: move.destinationNodeId,
            action: move.action.token,
            label: move.action.label,
            disabled: false,
          })]
          : []),
      ]
      : sourceNodeIds.map((sourceNodeId) => Object.freeze({
        id: sourceNodeId,
        action: `piece-source:${sourceNodeId}`,
        label: `Select ${base.nodes.find((node) => node.id === sourceNodeId)?.label ?? "piece"}`,
        disabled: false,
      }));
    return Object.freeze({
      pieceMove: Object.freeze({
        actionTokens: Object.freeze([...new Set(pieceMoves.map((move) => move.action.token))]),
        selectedSourceNodeId,
        sourceNodeIds,
      }),
      scene: mobileBattlefieldScene(session.gameSlug, payload, actionTargets) ?? base,
    });
  }
  const actionTargets = stageActionTargets(session, base);
  return Object.freeze({
    pieceMove: null,
    scene: actionTargets.length > 0
      ? mobileArenaPrivateCardScene(session, actionTargets)
        ?? mobileBattlefieldScene(session.gameSlug, payload, actionTargets)
        ?? base
      : base,
  });
}

type ArenaCardSceneNode = Readonly<{
  id: string;
  label: string;
  accessibilityLabel: string;
}>;

const pokerGames = new Set([
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
]);

function mobileArenaPrivateCardScene(
  session: PublicMobileArenaSession | MobileArenaSession,
  actionTargets: readonly ActionTarget[] = [],
): BoardScene | null {
  if (session.stageProjectionVersion !== 1 || session.publicState === undefined) return null;
  const game = GAME_CATALOG.find((entry) => entry.slug === session.gameSlug);
  if (game?.renderSpec.rendererFamily !== "card_table") return null;
  const viewerPrivate = "viewerPrivate" in session ? session.viewerPrivate : null;
  const nodes = cardSceneNodes(session, viewerPrivate);
  if (nodes.length === 0) return null;
  const actionByNodeId = new Map(actionTargets.map((target) => [target.id, target.id]));
  const sceneNodes = Object.freeze(nodes.map((node, index): BoardSceneNode => Object.freeze({
    id: node.id,
    kind: "card",
    label: node.label,
    row: null,
    col: null,
    index,
    actionTargetId: actionByNodeId.get(node.id) ?? null,
  })));
  const accessibility = Object.freeze(nodes.map((node): AccessibleBoardNode => Object.freeze({
    id: node.id,
    role: actionByNodeId.has(node.id) ? "button" : "text",
    label: node.accessibilityLabel,
    row: null,
    col: null,
    actionTargetId: actionByNodeId.get(node.id) ?? null,
  })));
  const scene: BoardScene = Object.freeze({
    schemaVersion: SCENE_SCHEMA_VERSION,
    gameSlug: session.gameSlug,
    rendererFamily: "card_table",
    // Card tables are semantic regions, not rectangular coordinate grids.
    rows: 0,
    cols: 0,
    nodes: sceneNodes,
    actionTargets: Object.freeze([...actionTargets]),
    accessibility,
    summary: Object.freeze({
      activePlayer: session.activeSeatId ?? null,
      terminal: session.status === "completed",
      turn: session.moveNumber,
      scores: Object.freeze({ ...(session.scores ?? {}) }),
    }),
  });
  try {
    assertBoardSceneSafe(scene);
    return scene;
  } catch {
    return null;
  }
}

function cardSceneNodes(
  session: PublicMobileArenaSession | MobileArenaSession,
  viewerPrivate: ArenaViewerPrivate | null,
): readonly ArenaCardSceneNode[] {
  const nodes: ArenaCardSceneNode[] = [];
  const publicState = session.publicState ?? {};
  const handCounts = publicCountRecord(publicState.hand_counts);
  const seats = session.seats ?? [];
  const ownerId = session.humanPlayerId ?? seats.find((seat) => seat.participantType === "human")?.seatId;
  let hanabiPartnerProjected = false;

  for (const seat of seats) {
    if (seat.participantType === "empty" || seat.seatId === ownerId) continue;
    if (session.gameSlug === "hanabi" && viewerPrivate?.kind === "hanabi_hand") {
      if (hanabiPartnerProjected) continue;
      hanabiPartnerProjected = true;
      viewerPrivate.visiblePartnerCards.forEach((card, index) => {
        nodes.push({
          id: `arena-partner-${seat.seatId}-card-${index}`,
          label: hanabiCardLabel(card),
          accessibilityLabel: `Partner hand. ${seat.label}. Card ${index + 1} of ${viewerPrivate.visiblePartnerCards.length}, ${hanabiCardName(card)}`,
        });
      });
      continue;
    }
    const fallbackCount = pokerGames.has(session.gameSlug)
      ? session.gameSlug === "leduc-holdem" ? 1 : 2
      : 0;
    const count = Math.min(32, handCounts[seat.seatId] ?? fallbackCount);
    const visibleBacks = Math.min(count, 3);
    for (let index = 0; index < visibleBacks; index += 1) {
      nodes.push({
        id: `arena-seat-${seat.seatId}-card-${index}-of-${count}`,
        label: "HIDDEN",
        accessibilityLabel: `Opponent hand. ${seat.label}. Card ${index + 1} of ${count}, face down`,
      });
    }
  }

  const center = publicCenterItems(session.gameSlug, publicState);
  center.forEach((item, index) => {
    nodes.push({
      id: `arena-center-${item.kind}-${index}`,
      label: item.label,
      accessibilityLabel: `Table. ${item.context} ${index + 1}, ${item.accessibilityLabel}`,
    });
  });

  if (viewerPrivate?.kind === "playing_cards" || viewerPrivate?.kind === "mahjong_tiles") {
    viewerPrivate.cards.forEach((card, index) => {
      const tile = viewerPrivate.kind === "mahjong_tiles";
      nodes.push({
        id: `arena-owner-${tile ? "tile" : "card"}-${index}`,
        label: tile ? mahjongTileLabel(card) : playingCardLabel(card),
        accessibilityLabel: `Your hand. ${tile ? "Tile" : "Card"} ${index + 1} of ${viewerPrivate.cards.length}, ${
          tile ? mahjongTileName(card) : playingCardName(card)
        }`,
      });
    });
  } else if (viewerPrivate?.kind === "hanabi_hand") {
    for (let index = 0; index < viewerPrivate.cardCount; index += 1) {
      nodes.push({
        id: `arena-owner-card-${index}`,
        label: "HIDDEN",
        accessibilityLabel: `Your hand. Card ${index + 1} of ${viewerPrivate.cardCount}, face down`,
      });
    }
  } else if (viewerPrivate?.kind === "number_cards") {
    viewerPrivate.values.forEach((value, index) => {
      nodes.push({
        id: `arena-owner-number-card-${index}`,
        label: String(value),
        accessibilityLabel: `Your hand. Number card ${index + 1} of ${viewerPrivate.values.length}, ${value}`,
      });
    });
  }
  return Object.freeze(nodes);
}

type PublicCenterItem = Readonly<{
  kind: "card" | "tile";
  label: string;
  accessibilityLabel: string;
  context: string;
}>;

function publicCenterItems(
  gameSlug: string,
  publicState: Readonly<Record<string, import("./mobile-arena-gateway").ArenaStageLegalActionValue>>,
): readonly PublicCenterItem[] {
  const tileGame = gameSlug === "mahjong";
  const fields = tileGame
    ? ["discard_pile"]
    : ["board", "community", "current_trick", "trick", "played_cards", "discard_pile", "discard", "top_discard", "upcard"];
  const values: PublicCenterItem[] = [];
  for (const field of fields) {
    const raw = publicState[field];
    const entries = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
    for (const entry of entries) {
      const record = genericRecord(entry);
      const candidate = record?.card ?? record?.tile ?? record?.value ?? entry;
      if (typeof candidate !== "string") continue;
      if (tileGame
        ? !/^(?:[BCD][1-9]|[1-9][mps]|east|south|west|north|white|green|red)$/u.test(candidate)
        : !/^(?:(?:10|[2-9TJQKA])[CDHS]|[BR]J|[RBGYW][1-5]|[1-9]|10|11)$/u.test(candidate)) {
        continue;
      }
      values.push({
        kind: tileGame ? "tile" : "card",
        label: tileGame ? mahjongTileLabel(candidate) : gameSlug === "hanabi"
          ? hanabiCardLabel(candidate)
          : playingCardLabel(candidate),
        accessibilityLabel: tileGame ? mahjongTileName(candidate) : gameSlug === "hanabi"
          ? hanabiCardName(candidate)
          : playingCardName(candidate),
        context: humanizeField(field),
      });
      if (values.length >= 16) return Object.freeze(values);
    }
  }
  return Object.freeze(values);
}

function publicCountRecord(
  value: import("./mobile-arena-gateway").ArenaStageLegalActionValue | undefined,
): Readonly<Record<string, number>> {
  const record = genericRecord(value);
  if (!record) return Object.freeze({});
  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [seatId, count] of Object.entries(record)) {
    if (/^player_(?:[1-9]|1[0-6])$/u.test(seatId)
      && Number.isSafeInteger(count) && (count as number) >= 0 && (count as number) <= 32) {
      counts[seatId] = count as number;
    }
  }
  return Object.freeze(counts);
}

function genericRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function humanizeField(value: string): string {
  return value.replace(/_/gu, " ");
}

function playingCardLabel(card: string): string {
  const match = /^(10|[2-9TJQKA])([CDHS])$/u.exec(card);
  if (!match) {
    if (card === "BJ") return "Black Joker";
    if (card === "RJ") return "Red Joker";
    const blackjack = blackjackCardName(card);
    return blackjack ? blackjack.label : card;
  }
  const suit = ({ C: "♣", D: "♦", H: "♥", S: "♠" } as const)[match[2] as "C" | "D" | "H" | "S"];
  return `${match[1] === "T" ? "10" : match[1]}${suit}`;
}

function playingCardName(card: string): string {
  if (card === "BJ") return "black joker";
  if (card === "RJ") return "red joker";
  const match = /^(10|[2-9TJQKA])([CDHS])$/u.exec(card);
  if (!match) return blackjackCardName(card)?.name ?? card;
  const rankToken = match[1]!;
  const rank = ({
    A: "ace",
    K: "king",
    Q: "queen",
    J: "jack",
    T: "ten",
    "10": "ten",
  } as Readonly<Record<string, string>>)[rankToken] ?? rankToken;
  const suit = ({ C: "clubs", D: "diamonds", H: "hearts", S: "spades" } as const)[match[2] as "C" | "D" | "H" | "S"];
  return `${rank} of ${suit}`;
}

function mahjongTileLabel(tile: string): string {
  const compact = /^([BCD])([1-9])$/u.exec(tile);
  if (compact) return tile;
  const suited = /^([1-9])([mps])$/u.exec(tile);
  if (suited) return `${suited[1]}${suited[2]!.toLocaleUpperCase("en-US")}`;
  return tile.toLocaleUpperCase("en-US");
}

function mahjongTileName(tile: string): string {
  const compact = /^([BCD])([1-9])$/u.exec(tile);
  if (compact) {
    const suit = ({ B: "bamboo", C: "characters", D: "dots" } as const)[compact[1] as "B" | "C" | "D"];
    return `${compact[2]} ${suit}`;
  }
  const suited = /^([1-9])([mps])$/u.exec(tile);
  if (suited) {
    const suit = ({ m: "characters", p: "dots", s: "bamboo" } as const)[suited[2] as "m" | "p" | "s"];
    return `${suited[1]} ${suit}`;
  }
  return `${tile} honor tile`;
}

function hanabiCardLabel(card: string): string {
  const match = /^([RBGYW])([1-5])$/u.exec(card);
  if (!match) return card;
  const color = ({
    R: "Red",
    B: "Blue",
    G: "Green",
    Y: "Yellow",
    W: "White",
  } as const)[match[1] as "R" | "B" | "G" | "Y" | "W"];
  return `${color} ${match[2]}`;
}

function hanabiCardName(card: string): string {
  return hanabiCardLabel(card).toLocaleLowerCase("en-US");
}

function blackjackCardName(card: string): Readonly<{ label: string; name: string }> | null {
  if (!/^(?:[1-9]|10|11)$/u.test(card)) return null;
  if (card === "1" || card === "11") return Object.freeze({ label: "A", name: "ace" });
  return Object.freeze({ label: card, name: card === "10" ? "ten-value card" : card });
}

type StagePieceMove = Readonly<{
  action: ArenaStageLegalAction;
  destinationNodeId: string;
  sourceNodeId: string;
}>;

function stagePieceMoves(
  session: PublicMobileArenaSession,
  scene: BoardScene,
): readonly StagePieceMove[] {
  if (session.status !== "active" || session.activeParticipantType !== "human") return [];
  const candidates = (session.legalActions ?? []).flatMap((action) => {
    const coordinates = pieceMoveCoordinates(session.gameSlug, action.token, scene);
    return coordinates ? [Object.freeze({ action, ...coordinates })] : [];
  });
  const destinationCounts = new Map<string, number>();
  for (const move of candidates) {
    const key = `${move.sourceNodeId}\u001f${move.destinationNodeId}`;
    destinationCounts.set(key, (destinationCounts.get(key) ?? 0) + 1);
  }
  return Object.freeze(candidates.filter((move) => (
    destinationCounts.get(`${move.sourceNodeId}\u001f${move.destinationNodeId}`) === 1
  )));
}

function pieceMoveCoordinates(
  gameSlug: string,
  token: string,
  scene: BoardScene,
): Readonly<{ destinationNodeId: string; sourceNodeId: string }> | null {
  if (gameSlug === "chess") {
    const match = /^([a-h])([1-8])([a-h])([1-8])[qrbn]?$/u.exec(token);
    if (!match) return null;
    return nodePair(
      scene,
      8 - Number(match[2]),
      match[1]!.charCodeAt(0) - 97,
      8 - Number(match[4]),
      match[3]!.charCodeAt(0) - 97,
    );
  }
  if (gameSlug === "checkers") {
    const match = /^([0-7]),([0-7])-([0-7]),([0-7])$/u.exec(token);
    return match ? nodePair(scene, Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])) : null;
  }
  if (gameSlug === "shogi") {
    const match = /^([1-9])([a-i])([1-9])([a-i])\+?$/u.exec(token);
    if (!match) return null;
    return nodePair(
      scene,
      match[2]!.charCodeAt(0) - 97,
      9 - Number(match[1]),
      match[4]!.charCodeAt(0) - 97,
      9 - Number(match[3]),
    );
  }
  if (gameSlug === "xiangqi") {
    const match = /^([a-i])([0-9])([a-i])([0-9])$/u.exec(token);
    return match ? nodePair(
      scene,
      Number(match[2]),
      match[1]!.charCodeAt(0) - 97,
      Number(match[4]),
      match[3]!.charCodeAt(0) - 97,
    ) : null;
  }
  if (gameSlug === "nine-mens-morris" || gameSlug === "backgammon") {
    const match = /^move:(\d+)-(\d+)(?::capture:\d+)?$/u.exec(token);
    if (!match) return null;
    const source = scene.nodes.find((node) => node.index === Number(match[1]));
    const destination = scene.nodes.find((node) => node.index === Number(match[2]));
    return source && destination
      ? Object.freeze({ destinationNodeId: destination.id, sourceNodeId: source.id })
      : null;
  }
  return null;
}

function nodePair(
  scene: BoardScene,
  sourceRow: number,
  sourceCol: number,
  destinationRow: number,
  destinationCol: number,
): Readonly<{ destinationNodeId: string; sourceNodeId: string }> | null {
  const source = scene.nodes.find((node) => node.row === sourceRow && node.col === sourceCol);
  const destination = scene.nodes.find((node) => node.row === destinationRow && node.col === destinationCol);
  return source && destination
    ? Object.freeze({ destinationNodeId: destination.id, sourceNodeId: source.id })
    : null;
}

function stageActionTargets(
  session: PublicMobileArenaSession,
  scene: BoardScene,
): readonly ActionTarget[] {
  if (session.status !== "active") return [];
  const source = session.activeParticipantType === "human"
    ? session.legalActions ?? []
    : session.activeParticipantType === "model"
      ? session.premoveActions ?? []
      : [];
  const assigned = new Set<string>();
  return source.flatMap((action) => {
    const node = stageNodeForAction(action.value, action.token, scene);
    if (!node || assigned.has(node.id)) return [];
    assigned.add(node.id);
    return [Object.freeze({
      id: node.id,
      action: action.token,
      label: action.disabledReason ? `${action.label}. ${action.disabledReason}` : action.label,
      disabled: action.disabledReason !== null,
    })];
  });
}

function stageNodeForAction(
  value: import("./mobile-arena-gateway").ArenaStageLegalActionValue | null,
  token: string,
  scene: BoardScene,
): BoardSceneNode | null {
  const cardAction = /^(?:play|discard|bid):(.+)$/u.exec(token);
  if (cardAction && scene.rendererFamily === "card_table") {
    const cardToken = cardAction[1]!;
    if (/^\d+$/u.test(cardToken)) {
      const matchingNumberCard = scene.nodes.find((node) => (
        node.id.startsWith("arena-owner-number-card-") && node.label === cardToken
      ));
      if (matchingNumberCard) return matchingNumberCard;
      const indexedOwnerCard = scene.nodes.find((node) => (
        node.id === `arena-owner-card-${cardToken}`
        || node.id === `arena-owner-tile-${cardToken}`
        || node.id === `arena-owner-number-card-${cardToken}`
      ));
      if (indexedOwnerCard) return indexedOwnerCard;
    } else {
      const visualLabels = new Set([
        cardToken,
        playingCardLabel(cardToken),
        mahjongTileLabel(cardToken),
        hanabiCardLabel(cardToken),
      ]);
      const matchingOwnerCard = scene.nodes.find((node) => (
        (
          node.id.startsWith("arena-owner-card-")
          || node.id.startsWith("arena-owner-tile-")
          || node.id.startsWith("arena-owner-number-card-")
        )
        && visualLabels.has(node.label)
      ));
      if (matchingOwnerCard) return matchingOwnerCard;
    }
  }
  const record = publicRecord(value);
  const explicitId = stringField(record, "nodeId")
    ?? stringField(record, "cellId")
    ?? stringField(record, "targetId")
    ?? (typeof value === "string" ? value : null);
  if (explicitId) {
    const exact = scene.nodes.find((node) => node.id === explicitId);
    if (exact) return exact;
  }
  const index = integerField(record, "index");
  if (index !== null) {
    const indexed = scene.nodes.find((node) => node.index === index);
    if (indexed) return indexed;
  }
  const row = integerField(record, "row");
  const col = integerField(record, "col");
  if (row !== null && col !== null) {
    const cell = scene.nodes.find((node) => node.row === row && node.col === col);
    if (cell) return cell;
  }
  const column = integerField(record, "column");
  if (column !== null) {
    const columnCell = scene.nodes.find((node) => node.col === column);
    if (columnCell) return columnCell;
  }
  const numericToken = /^\d+$/u.test(token) ? Number(token) : null;
  return numericToken !== null && Number.isSafeInteger(numericToken)
    ? scene.nodes.find((node) => node.index === numericToken) ?? null
    : scene.nodes.find((node) => node.id === token) ?? null;
}

function publicRecord(
  value: import("./mobile-arena-gateway").ArenaStageLegalActionValue | null,
): Readonly<Record<string, import("./mobile-arena-gateway").ArenaStageLegalActionValue>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value as unknown[])
    ? value as Readonly<Record<string, import("./mobile-arena-gateway").ArenaStageLegalActionValue>>
    : null;
}

function stringField(
  value: Readonly<Record<string, import("./mobile-arena-gateway").ArenaStageLegalActionValue>> | null,
  key: string,
): string | null {
  const field = value?.[key];
  return typeof field === "string" ? field : null;
}

function integerField(
  value: Readonly<Record<string, import("./mobile-arena-gateway").ArenaStageLegalActionValue>> | null,
  key: string,
): number | null {
  const field = value?.[key];
  return Number.isSafeInteger(field) && (field as number) >= 0 ? field as number : null;
}
