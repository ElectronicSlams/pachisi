const SAFE_PLAYING_CARD = /^(?:(?:10|[2-9TJQKA])[CDHS]|[BR]J)$/u;
const SAFE_BLACKJACK_CARD = /^(?:[1-9]|10|11)$/u;
const SAFE_HANABI_CARD = /^[RBGYW][1-5]$/u;
const SAFE_MAHJONG_COMPACT_TILE = /^(?:[BCD][1-9]|[FS][1-4]|W[ESWN]|D[RGW])$/u;
const SAFE_MAHJONG_LEGACY_TILE = /^[1-9][MPS]$/u;
const SAFE_SHIP_POSITION = /^(?:(?:[0-9]|[1-9][0-9]),(?:[0-9]|[1-9][0-9])|[a-z][a-z-]{0,23}:[A-J](?:10|[1-9])-[A-J](?:10|[1-9]))$/iu;
const UNSAFE_TEXT_CONTROL = /[\p{Cc}\p{Cf}]/u;
const JOKER_CARD_GAMES = new Set(["dou-dizhu"]);
const SEALED_COMMITMENT_KIND_BY_GAME: Readonly<Record<string, ArenaSealedCommitment["kind"]>> = {
  "first-price-sealed-bid-auction": "bid",
  goofspiel: "card",
  "prisoners-dilemma": "choice",
  "rock-paper-scissors": "choice",
};

export type ArenaSealedCommitment = Readonly<{
  kind: "choice" | "bid" | "card";
  token: string;
  label: string;
}>;

type ArenaViewerPrivateBase = Readonly<{
  schemaVersion: "eslams.arena.viewer-private.v1";
  gameSlug: string;
  playerId: string;
  turn: number;
  sealedCommitment?: ArenaSealedCommitment;
}>;

export type ArenaViewerPrivate =
  | (ArenaViewerPrivateBase & Readonly<{
      kind: "playing_cards" | "mahjong_tiles";
      cards: readonly string[];
      cardsVisible: true;
      source: "hand" | "hole" | "player_hand";
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      gameSlug: "hanabi";
      kind: "hanabi_hand";
      cardCount: number;
      cardsVisible: false;
      visiblePartnerCards: readonly string[];
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      gameSlug: "liars-dice";
      kind: "dice";
      values: readonly number[];
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      gameSlug: "goofspiel";
      kind: "number_cards";
      values: readonly number[];
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      gameSlug: "battleship";
      kind: "battleship_fleet";
      ownShips: readonly string[];
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      gameSlug: "first-price-sealed-bid-auction" | "bargaining" | "negotiation";
      kind: "private_value";
      value: number;
    }>)
  | (ArenaViewerPrivateBase & Readonly<{
      kind: "none";
    }>);

export function parseArenaViewerPrivate(
  value: unknown,
  expected?: Readonly<{
    gameSlug: string;
    playerId?: string | null | undefined;
    turn: number;
  }>,
): ArenaViewerPrivate | null {
  const record = isRecord(value) ? value : null;
  if (
    !record
    || record.schemaVersion !== "eslams.arena.viewer-private.v1"
    || !safeGameSlug(record.gameSlug)
    || !safePlayerId(record.playerId)
    || !safeNonNegativeInteger(record.turn)
    || typeof record.kind !== "string"
  ) {
    return null;
  }
  if (
    expected
    && (
      record.gameSlug !== expected.gameSlug
      || record.playerId !== expected.playerId
      || record.turn !== expected.turn
    )
  ) {
    return null;
  }

  const sealedCommitment = parseSealedCommitment(record.sealedCommitment, record.gameSlug);
  if (record.sealedCommitment !== undefined && !sealedCommitment) return null;
  const base: ArenaViewerPrivateBase = Object.freeze({
    schemaVersion: "eslams.arena.viewer-private.v1",
    gameSlug: record.gameSlug,
    playerId: record.playerId,
    turn: record.turn,
    ...(sealedCommitment ? { sealedCommitment } : {}),
  });

  if (record.kind === "playing_cards" || record.kind === "mahjong_tiles") {
    if (
      !hasExactEnvelopeKeys(record, ["cards", "cardsVisible", "source"])
      || record.cardsVisible !== true
      || !Array.isArray(record.cards)
      || record.cards.length > 32
      || !validViewerCardSource(record, record.gameSlug)
    ) return null;
    const cards = record.cards;
    if (record.kind === "mahjong_tiles") {
      if (!validMahjongTiles(cards)) return null;
    } else if (!validPlayingCards(cards, record.gameSlug)) {
      return null;
    }
    return Object.freeze({
      ...base,
      kind: record.kind,
      cards: Object.freeze([...(cards as string[])]),
      cardsVisible: true,
      source: record.source as "hand" | "hole" | "player_hand",
    });
  }

  if (record.kind === "hanabi_hand") {
    if (
      record.gameSlug !== "hanabi"
      || !hasExactEnvelopeKeys(record, ["cardCount", "cardsVisible", "visiblePartnerCards"])
      || record.cardsVisible !== false
      || !safeBoundedInteger(record.cardCount, 0, 8)
      || !validHanabiCards(record.visiblePartnerCards)
    ) return null;
    return Object.freeze({
      ...base,
      gameSlug: "hanabi",
      kind: "hanabi_hand",
      cardCount: record.cardCount,
      cardsVisible: false,
      visiblePartnerCards: Object.freeze([...(record.visiblePartnerCards as string[])]),
    });
  }

  if (record.kind === "dice") {
    if (
      record.gameSlug !== "liars-dice"
      || !exactIntegerValues(record, 1, 8, 1, 6)
    ) return null;
    return Object.freeze({
      ...base,
      gameSlug: "liars-dice",
      kind: "dice",
      values: Object.freeze([...(record.values as number[])]),
    });
  }

  if (record.kind === "number_cards") {
    if (
      record.gameSlug !== "goofspiel"
      || !exactIntegerValues(record, 0, 16, 0, 100)
      || new Set(record.values as number[]).size !== (record.values as number[]).length
    ) return null;
    return Object.freeze({
      ...base,
      gameSlug: "goofspiel",
      kind: "number_cards",
      values: Object.freeze([...(record.values as number[])]),
    });
  }

  if (record.kind === "battleship_fleet") {
    if (
      record.gameSlug !== "battleship"
      || !hasExactEnvelopeKeys(record, ["ownShips"])
      || !Array.isArray(record.ownShips)
      || record.ownShips.length > 32
      || record.ownShips.some((ship) => typeof ship !== "string" || !SAFE_SHIP_POSITION.test(ship))
      || new Set(record.ownShips).size !== record.ownShips.length
    ) return null;
    return Object.freeze({
      ...base,
      gameSlug: "battleship",
      kind: "battleship_fleet",
      ownShips: Object.freeze([...(record.ownShips as string[])]),
    });
  }

  if (record.kind === "private_value") {
    if (
      !hasExactEnvelopeKeys(record, ["value"])
      || !["first-price-sealed-bid-auction", "bargaining", "negotiation"].includes(record.gameSlug)
      || typeof record.value !== "number"
      || !Number.isFinite(record.value)
    ) return null;
    return Object.freeze({
      ...base,
      gameSlug: record.gameSlug as "first-price-sealed-bid-auction" | "bargaining" | "negotiation",
      kind: "private_value",
      value: record.value,
    });
  }

  return record.kind === "none" && hasExactEnvelopeKeys(record, [])
    ? Object.freeze({ ...base, kind: "none" })
    : null;
}

function parseSealedCommitment(value: unknown, gameSlug: string): ArenaSealedCommitment | null {
  if (value === undefined) return null;
  const expectedKind = SEALED_COMMITMENT_KIND_BY_GAME[gameSlug];
  if (
    !expectedKind
    || !isRecord(value)
    || !hasExactKeys(value, ["kind", "token", "label"])
    || value.kind !== expectedKind
    || !boundedText(value.token, 256)
    || !boundedText(value.label, 256)
  ) return null;
  return Object.freeze({ kind: expectedKind, token: value.token, label: value.label });
}

function validViewerCardSource(
  value: Readonly<Record<string, unknown>>,
  gameSlug: string,
): boolean {
  if (value.kind === "mahjong_tiles") {
    return gameSlug === "mahjong" && value.source === "hand";
  }
  if (gameSlug === "mahjong" || gameSlug === "hanabi") return false;
  if (
    gameSlug === "leduc-holdem"
    || gameSlug === "limit-texas-holdem"
    || gameSlug === "no-limit-texas-holdem"
  ) return value.source === "hole";
  if (gameSlug === "blackjack") return value.source === "player_hand";
  return value.source === "hand";
}

function validPlayingCards(value: unknown[], gameSlug: string): value is string[] {
  if (gameSlug === "blackjack") {
    return value.every((card) => typeof card === "string" && SAFE_BLACKJACK_CARD.test(card));
  }
  return value.every((card) => (
    typeof card === "string"
    && SAFE_PLAYING_CARD.test(card)
    && (!/^[BR]J$/u.test(card) || JOKER_CARD_GAMES.has(gameSlug))
  ))
    && new Set(value).size === value.length;
}

function validHanabiCards(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length > 8) return false;
  const counts = new Map<string, number>();
  for (const card of value) {
    if (typeof card !== "string" || !SAFE_HANABI_CARD.test(card)) return false;
    const count = (counts.get(card) ?? 0) + 1;
    const rank = Number(card.slice(1));
    const maximum = rank === 1 ? 3 : rank === 5 ? 1 : 2;
    if (count > maximum) return false;
    counts.set(card, count);
  }
  return true;
}

function validMahjongTiles(value: unknown[]): value is string[] {
  const counts = new Map<string, number>();
  for (const tile of value) {
    if (typeof tile !== "string") return false;
    const normalized = normalizedMahjongTile(tile);
    if (!normalized) return false;
    const count = (counts.get(normalized) ?? 0) + 1;
    const maximum = /^[FS][1-4]$/u.test(normalized) ? 1 : 4;
    if (count > maximum) return false;
    counts.set(normalized, count);
  }
  return true;
}

function normalizedMahjongTile(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s_-]/gu, "");
  if (SAFE_MAHJONG_COMPACT_TILE.test(compact)) return compact;
  if (SAFE_MAHJONG_LEGACY_TILE.test(compact)) {
    const suit = compact[1] === "S" ? "B" : compact[1] === "M" ? "C" : "D";
    return `${suit}${compact[0]}`;
  }
  const named: Readonly<Record<string, string>> = {
    E: "WE",
    EAST: "WE",
    SOUTH: "WS",
    WEST: "WW",
    NORTH: "WN",
    RED: "DR",
    REDDRAGON: "DR",
    GREEN: "DG",
    GREENDRAGON: "DG",
    WHITE: "DW",
    WHITEDRAGON: "DW",
  };
  return named[compact] ?? null;
}

function exactIntegerValues(
  value: Readonly<Record<string, unknown>>,
  minimumLength: number,
  maximumLength: number,
  minimumValue: number,
  maximumValue: number,
): boolean {
  return hasExactEnvelopeKeys(value, ["values"])
    && Array.isArray(value.values)
    && value.values.length >= minimumLength
    && value.values.length <= maximumLength
    && value.values.every((entry) => safeBoundedInteger(entry, minimumValue, maximumValue));
}

function hasExactEnvelopeKeys(
  value: Readonly<Record<string, unknown>>,
  variantKeys: readonly string[],
): boolean {
  const allowed = new Set([
    "schemaVersion",
    "gameSlug",
    "playerId",
    "turn",
    "kind",
    "sealedCommitment",
    ...variantKeys,
  ]);
  return Object.keys(value).every((key) => allowed.has(key));
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && value.length <= maximum
    && !UNSAFE_TEXT_CONTROL.test(value);
}

function safeBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function safeNonNegativeInteger(value: unknown): value is number {
  return safeBoundedInteger(value, 0, Number.MAX_SAFE_INTEGER);
}

function safeGameSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value);
}

function safePlayerId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/u.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
