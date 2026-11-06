"use client";

import Image from "next/image";
import { useState, type CSSProperties, type SyntheticEvent } from "react";
import type { ArenaViewerPrivate } from "@/lib/arena-viewer-private";

type CardTableSeat = Readonly<{
  seatId: string;
  participantType: "human" | "model" | "empty";
  modelId?: string;
  label?: string;
  displayOrder: number;
  teamId?: string | null;
}>;

type ArenaCardTableProps = Readonly<{
  gameSlug: string;
  gameName: string;
  publicState: Record<string, unknown>;
  viewerPrivate?: ArenaViewerPrivate | null | undefined;
  seats?: readonly CardTableSeat[] | undefined;
  humanPlayerId?: string | null | undefined;
  activeSeatId?: string | null | undefined;
  status: "active" | "completed";
  legalActions?: readonly CardTableLegalAction[] | undefined;
  actionsDisabled?: boolean | undefined;
  onPlay?: ((action: string) => void) | undefined;
}>;

type CardTableLegalAction = Readonly<{
  token: string;
  label: string;
  verb?: string | null | undefined;
  object?: string | null | undefined;
  disabledReason?: string | null | undefined;
}>;

type PositionedSeat = CardTableSeat & Readonly<{
  position: "bottom" | "left" | "top" | "right" | "top-left" | "top-right";
}>;

const pokerGames = new Set([
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
]);

const trickGames = new Set(["bridge", "euchre", "hearts", "spades"]);

const cardAssetPattern = /^(10|[2-9TJQKA])([CDHS])$/u;
const rankNames: Record<string, string> = {
  A: "Ace",
  K: "King",
  Q: "Queen",
  J: "Jack",
  T: "Ten",
  "10": "Ten",
  "9": "Nine",
  "8": "Eight",
  "7": "Seven",
  "6": "Six",
  "5": "Five",
  "4": "Four",
  "3": "Three",
  "2": "Two",
};
const suitNames: Record<string, string> = {
  C: "Clubs",
  D: "Diamonds",
  H: "Hearts",
  S: "Spades",
};

export function ArenaCardTable({
  gameSlug,
  gameName,
  publicState,
  viewerPrivate,
  seats,
  humanPlayerId,
  activeSeatId,
  status,
  legalActions = [],
  actionsDisabled = true,
  onPlay,
}: ArenaCardTableProps) {
  const positionedSeats = tableSeats(seats, humanPlayerId);
  const ownerCards = viewerCards(viewerPrivate);
  const center = viewerPrivate?.kind === "hanabi_hand"
    ? {
        kind: "hanabi" as const,
        cards: [...viewerPrivate.visiblePartnerCards],
        label: "Partner hand",
        emptyLabel: "Partner hand is empty",
      }
    : centerTableCards(gameSlug, publicState);
  const pot = publicNumber(publicState.pot);
  const street = publicText(publicState.street) ?? publicText(publicState.phase);
  const handCounts = publicNumberRecord(publicState.hand_counts);
  const stacks = publicNumberRecord(publicState.stacks);
  const committed = publicNumberRecord(publicState.committed);
  const ownerSeat = positionedSeats.find(
    (seat) => seat.participantType === "human" || seat.seatId === humanPlayerId,
  );
  const ownerStack = ownerSeat ? stacks[ownerSeat.seatId] : undefined;
  const ownerCommitted = ownerSeat ? committed[ownerSeat.seatId] : undefined;
  const ownerHiddenCount = viewerPrivate?.kind === "hanabi_hand" ? viewerPrivate.cardCount : 0;
  const tableSummary = tableContextLabel(gameSlug, street, pot, publicState);
  const metrics = tableMetrics(gameSlug, publicState);

  return (
    <section
      className="arena-card-runtime"
      data-game={gameSlug}
      data-testid="arena-card-runtime"
      aria-label={`${gameName} table. ${tableSummary}`}
    >
      <div className="arena-card-runtime-bar">
        <span className="mono">{street ? humanize(street) : gameName}</span>
        <span className="arena-card-runtime-status" role="status" aria-live="polite" aria-atomic="true">
          <span className="arena-card-runtime-status-dot" aria-hidden="true" />
          {status === "completed" ? "Hand complete" : activeSeatId === humanPlayerId ? "Your action" : "Table live"}
        </span>
      </div>

      <div className="arena-card-felt">
        <span className="arena-card-felt-ring" aria-hidden="true" />

        {positionedSeats.map((seat) => {
          const owner = seat.participantType === "human" || seat.seatId === humanPlayerId;
          const cardCount = gameSlug === "hanabi" && !owner
            ? 0
            : owner
            ? ownerCards.length || ownerHiddenCount
            : handCounts[seat.seatId] ?? defaultOpponentCardCount(gameSlug);
          return (
            <SeatStation
              key={seat.seatId}
              seat={seat}
              owner={owner}
              active={seat.seatId === activeSeatId}
              cardCount={cardCount}
              stack={stacks[seat.seatId]}
              committed={committed[seat.seatId]}
              role={seatRole(publicState, seat.seatId)}
            />
          );
        })}

        <div className="arena-card-center" aria-label={center.label}>
          <div className="arena-card-center-meta">
            <span className="mono">{center.label}</span>
            {pot !== null ? <strong>{pot} pot</strong> : null}
            {metrics.map((metric) => <strong key={metric}>{metric}</strong>)}
          </div>
          {center.kind === "hanabi" ? (
            <HanabiRun cards={center.cards} emptyLabel={center.emptyLabel} />
          ) : center.kind === "tiles" ? (
            <TileRun tiles={center.cards} emptyLabel={center.emptyLabel} eager />
          ) : (
            <CardRun cards={center.cards} emptyLabel={center.emptyLabel} size="table" eager />
          )}
        </div>

        <div className="arena-card-owner-hand" aria-label="Your private hand" data-testid="arena-owner-hand">
          <span className="arena-card-owner-label mono">
            <span>{viewerPrivate?.kind === "hanabi_hand" ? "Your hidden hand" : "Your hand"}</span>
            {ownerStack === undefined ? null : <span>{ownerStack} stack</span>}
            {ownerCommitted ? <span>{ownerCommitted} in</span> : null}
          </span>
          {viewerPrivate?.kind === "mahjong_tiles" ? (
            <TileRun
              tiles={ownerCards}
              emptyLabel="Waiting for the deal"
              owner
              eager
              legalActions={legalActions}
              actionsDisabled={actionsDisabled}
              onPlay={onPlay}
            />
          ) : viewerPrivate?.kind === "hanabi_hand" ? (
            <FaceDownRun count={viewerPrivate.cardCount} owner />
          ) : (
            <CardRun
              cards={ownerCards}
              emptyLabel="Dealing your cards"
              size="owner"
              eager
              legalActions={legalActions}
              actionsDisabled={actionsDisabled}
              onPlay={onPlay}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SeatStation({
  seat,
  owner,
  active,
  cardCount,
  stack,
  committed,
  role,
}: Readonly<{
  seat: PositionedSeat;
  owner: boolean;
  active: boolean;
  cardCount: number;
  stack?: number | undefined;
  committed?: number | undefined;
  role?: string | null | undefined;
}>) {
  return (
    <div
      className="arena-card-seat"
      data-position={seat.position}
      data-owner={owner ? "true" : "false"}
      data-active={active ? "true" : "false"}
      data-role={role ?? undefined}
      role="group"
      aria-current={active ? "true" : undefined}
      aria-label={`${seat.label ?? seat.modelId ?? seat.seatId}${active ? ", active seat" : ""}`}
    >
      {!owner && cardCount > 0 ? <FaceDownRun count={Math.min(cardCount, 3)} /> : null}
      <div className="arena-card-seat-copy">
        <span className="arena-card-seat-name">{owner ? "You" : shortSeatName(seat)}</span>
        <span className="arena-card-seat-meta mono">
          {[
            role ? humanize(role) : null,
            stack === undefined ? null : `${stack} stack`,
            committed ? `${committed} in` : null,
            !owner && cardCount > 0 ? `${cardCount} cards` : null,
          ].filter(Boolean).join(" · ") || seat.seatId}
        </span>
        {active ? <span className="sr-only">Active seat</span> : null}
      </div>
    </div>
  );
}

export function ArenaPrivateInventory({
  viewerPrivate,
}: Readonly<{ viewerPrivate?: ArenaViewerPrivate | null | undefined }>) {
  if (!viewerPrivate) return null;
  if (viewerPrivate.kind === "none") {
    return viewerPrivate.sealedCommitment ? (
      <section className="arena-private-inventory" aria-label="Your private submission">
        <SealedCommitment viewerPrivate={viewerPrivate} />
      </section>
    ) : null;
  }
  if (viewerPrivate.kind === "dice") {
    return (
      <section className="arena-private-inventory" aria-label="Your private dice">
        <span className="arena-private-inventory-label mono">Your dice</span>
        <div className="arena-private-dice">
          {viewerPrivate.values.map((value, index) => (
            <span key={`${value}-${index}`} aria-label={`Die ${index + 1}: ${value}`}>{value}</span>
          ))}
        </div>
      </section>
    );
  }
  if (viewerPrivate.kind === "number_cards") {
    return (
      <section className="arena-private-inventory" aria-label="Your remaining cards">
        <span className="arena-private-inventory-label mono">Your remaining cards</span>
        <div className="arena-private-number-cards">
          {viewerPrivate.values.map((value) => <span key={value}>{value}</span>)}
        </div>
        <SealedCommitment viewerPrivate={viewerPrivate} />
      </section>
    );
  }
  if (viewerPrivate.kind === "battleship_fleet") {
    return (
      <section className="arena-private-inventory" aria-label="Your fleet">
        <span className="arena-private-inventory-label mono">Your fleet</span>
        <div className="arena-private-fleet">
          {viewerPrivate.ownShips.map((position) => <span key={position}>{position}</span>)}
        </div>
      </section>
    );
  }
  if (viewerPrivate.kind === "private_value") {
    return (
      <section className="arena-private-inventory" aria-label="Your private value">
        <span className="arena-private-inventory-label mono">Your private value</span>
        <strong>{viewerPrivate.value}</strong>
        <SealedCommitment viewerPrivate={viewerPrivate} />
      </section>
    );
  }
  return null;
}

function SealedCommitment({ viewerPrivate }: Readonly<{ viewerPrivate: ArenaViewerPrivate }>) {
  return viewerPrivate.sealedCommitment ? (
    <span
      className="arena-private-commitment"
      data-commitment-kind={viewerPrivate.sealedCommitment.kind}
      aria-label={`Submitted privately: ${viewerPrivate.sealedCommitment.label}`}
    >
      <span className="mono">Your submitted {viewerPrivate.sealedCommitment.kind}</span>
      <strong>{viewerPrivate.sealedCommitment.label}</strong>
    </span>
  ) : null;
}

function valuesWithOccurrenceKeys(values: readonly string[]) {
  const occurrences = new Map<string, number>();
  return values.map((value) => {
    const occurrence = (occurrences.get(value) ?? 0) + 1;
    occurrences.set(value, occurrence);
    return { key: `${value}:${occurrence}`, value };
  });
}

function CardRun({
  cards,
  emptyLabel,
  size,
  eager = false,
  legalActions = [],
  actionsDisabled = true,
  onPlay,
}: Readonly<{
  cards: readonly string[];
  emptyLabel: string;
  size: "table" | "owner";
  eager?: boolean;
  legalActions?: readonly CardTableLegalAction[];
  actionsDisabled?: boolean;
  onPlay?: ((action: string) => void) | undefined;
}>) {
  if (cards.length === 0) {
    return <span className="arena-card-empty">{emptyLabel}</span>;
  }
  const density = cards.length > 13 ? "dense" : cards.length > 7 ? "compact" : "standard";
  return (
    <ul
      className="arena-card-run"
      data-size={size}
      data-density={density}
      aria-label={`${cards.length} ${cards.length === 1 ? "card" : "cards"}`}
    >
      {valuesWithOccurrenceKeys(cards).map(({ key, value: card }, index) => {
        const action = size === "owner" ? matchingCardAction(legalActions, card, "card") : null;
        return (
          <PlayingCard
            key={key}
            value={card}
            index={index}
            eager={eager}
            action={action}
            actionDisabled={actionsDisabled}
            onPlay={onPlay}
          />
        );
      })}
    </ul>
  );
}

function HanabiRun({ cards, emptyLabel }: Readonly<{ cards: readonly string[]; emptyLabel: string }>) {
  if (cards.length === 0) return <span className="arena-card-empty">{emptyLabel}</span>;
  return (
    <ul className="arena-hanabi-run" aria-label={`${cards.length} visible partner cards`}>
      {valuesWithOccurrenceKeys(cards).map(({ key, value: card }, index) => (
        <li
          className="arena-hanabi-card"
          data-color={card.trim().slice(0, 1).toUpperCase()}
          key={key}
          aria-label={`Partner card ${index + 1}: ${card}`}
        >
          {card}
        </li>
      ))}
    </ul>
  );
}

function FaceDownRun({ count, owner = false }: Readonly<{ count: number; owner?: boolean }>) {
  return (
    <div className="arena-card-back-run" data-owner={owner ? "true" : "false"} role="img" aria-label={`${count} face-down cards`}>
      {Array.from({ length: Math.min(count, owner ? 8 : 3) }, (_, index) => (
        <span className="arena-playing-card arena-playing-card-back" key={index} aria-hidden="true">
          <Image
            src="/assets/playing-cards/v1/1B.svg"
            alt=""
            width={120}
            height={168}
            unoptimized
            loading="eager"
          />
        </span>
      ))}
      {count > (owner ? 8 : 3) ? <span className="arena-card-count mono">+{count - (owner ? 8 : 3)}</span> : null}
    </div>
  );
}

function PlayingCard({
  value,
  index,
  eager,
  action,
  actionDisabled,
  onPlay,
}: Readonly<{
  value: string;
  index: number;
  eager: boolean;
  action: CardTableLegalAction | null;
  actionDisabled: boolean;
  onPlay?: ((action: string) => void) | undefined;
}>) {
  const normalized = normalizedCard(value);
  const accessibleName = cardAccessibleName(value);
  const [imageReady, setImageReady] = useState(false);
  if (!normalized) {
    return (
      <li
        className="arena-playing-card arena-playing-card-fallback"
        style={{ "--deal-index": index } as CSSProperties}
        aria-label={accessibleName}
      >
        {value}
      </li>
    );
  }
  const image = (
    <Image
      src={`/assets/playing-cards/v1/${normalized}.svg`}
      alt=""
      aria-hidden="true"
      width={120}
      height={168}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onLoad={(event) => markImageDecoded(event, setImageReady)}
    />
  );
  return (
    <li
      className="arena-playing-card"
      style={{ "--deal-index": index } as CSSProperties}
      aria-label={action ? undefined : accessibleName}
      data-image-ready={imageReady ? "true" : "false"}
    >
      {action && onPlay ? (
        <button
          type="button"
          className="arena-card-direct-action"
          aria-label={`${action.label}. ${accessibleName}`}
          aria-busy={!imageReady}
          data-action-token={action.token}
          disabled={actionDisabled || Boolean(action.disabledReason) || !imageReady}
          title={action.disabledReason ?? undefined}
          onClick={() => onPlay(action.token)}
        >
          {image}
        </button>
      ) : image}
    </li>
  );
}

function TileRun({
  tiles,
  emptyLabel,
  owner = false,
  eager = false,
  legalActions = [],
  actionsDisabled = true,
  onPlay,
}: Readonly<{
  tiles: readonly string[];
  emptyLabel: string;
  owner?: boolean;
  eager?: boolean;
  legalActions?: readonly CardTableLegalAction[];
  actionsDisabled?: boolean;
  onPlay?: ((action: string) => void) | undefined;
}>) {
  if (tiles.length === 0) return <span className="arena-card-empty">{emptyLabel}</span>;
  return (
    <ul
      className="arena-tile-run"
      data-owner={owner ? "true" : "false"}
      aria-label={`${tiles.length} Mahjong ${tiles.length === 1 ? "tile" : "tiles"}`}
    >
      {valuesWithOccurrenceKeys(tiles).map(({ key, value: tile }) => (
        <MahjongTile
          key={key}
          value={tile}
          eager={eager}
          action={owner ? matchingCardAction(legalActions, tile, "tile") : null}
          actionDisabled={actionsDisabled}
          onPlay={onPlay}
        />
      ))}
    </ul>
  );
}

function MahjongTile({
  value,
  eager,
  action,
  actionDisabled,
  onPlay,
}: Readonly<{
  value: string;
  eager: boolean;
  action: CardTableLegalAction | null;
  actionDisabled: boolean;
  onPlay?: ((action: string) => void) | undefined;
}>) {
  const normalized = normalizedMahjongTile(value);
  const accessibleName = mahjongAccessibleName(value);
  const [imageReady, setImageReady] = useState(false);
  const image = normalized ? (
    <Image
      src={`/assets/mahjong/v1/${normalized}.svg`}
      alt=""
      aria-hidden="true"
      width={72}
      height={96}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onLoad={(event) => markImageDecoded(event, setImageReady)}
    />
  ) : null;
  return (
    <li
      className="arena-mahjong-tile"
      aria-label={action ? undefined : accessibleName}
      data-image-ready={imageReady ? "true" : normalized ? "false" : "fallback"}
    >
      {action && onPlay ? (
        <button
          type="button"
          className="arena-card-direct-action"
          aria-label={`${action.label}. ${accessibleName}`}
          aria-busy={!imageReady}
          data-action-token={action.token}
          disabled={actionDisabled || Boolean(action.disabledReason) || !imageReady}
          title={action.disabledReason ?? undefined}
          onClick={() => onPlay(action.token)}
        >
          {image ?? tileLabel(value)}
        </button>
      ) : image ?? tileLabel(value)}
    </li>
  );
}

function tableSeats(seats: readonly CardTableSeat[] | undefined, humanPlayerId?: string | null): PositionedSeat[] {
  const sorted = [...(seats ?? [])]
    .filter((seat) => seat.participantType !== "empty")
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const ownerIndex = sorted.findIndex((seat) => seat.participantType === "human" || seat.seatId === humanPlayerId);
  const rotated = ownerIndex > 0 ? [...sorted.slice(ownerIndex), ...sorted.slice(0, ownerIndex)] : sorted;
  const positions = seatPositions(rotated.length);
  return rotated.map((seat, index) => ({ ...seat, position: positions[index] ?? "top" }));
}

function seatPositions(count: number): PositionedSeat["position"][] {
  if (count <= 1) return ["bottom"];
  if (count === 2) return ["bottom", "top"];
  if (count === 3) return ["bottom", "top-left", "top-right"];
  return ["bottom", "left", "top", "right"];
}

function viewerCards(viewerPrivate?: ArenaViewerPrivate | null): string[] {
  if (viewerPrivate?.kind === "playing_cards" || viewerPrivate?.kind === "mahjong_tiles") {
    return [...viewerPrivate.cards];
  }
  return [];
}

function centerTableCards(
  gameSlug: string,
  state: Record<string, unknown>,
): Readonly<{ kind: "cards" | "tiles"; cards: string[]; label: string; emptyLabel: string }> {
  if (gameSlug === "mahjong") {
    return {
      kind: "tiles",
      cards: tilesFromDiscards(state.discard_pile).slice(-12),
      label: "Discard river",
      emptyLabel: "No discards yet",
    };
  }
  if (pokerGames.has(gameSlug)) {
    return {
      kind: "cards",
      cards: publicStringItems(state.board),
      label: "Community",
      emptyLabel: "Waiting for the flop",
    };
  }
  if (trickGames.has(gameSlug)) {
    return {
      kind: "cards",
      cards: cardsFromTrick(state.current_trick),
      label: "Current trick",
      emptyLabel: "Waiting for the lead",
    };
  }
  if (gameSlug === "dou-dizhu") {
    return {
      kind: "cards",
      cards: cardsFromLastPlay(state.last_play),
      label: "Last play",
      emptyLabel: "Open the round",
    };
  }
  if (gameSlug === "blackjack") {
    const dealerCards = publicCardItems(state.dealer_hand);
    return {
      kind: "cards",
      cards: dealerCards.length > 0
        ? dealerCards
        : publicCardItems(state.dealer_upcard),
      label: "Dealer",
      emptyLabel: "Dealer is ready",
    };
  }
  const discard = publicStringItems(state.discard);
  const top = publicText(state.discard_top) ?? publicText(state.upcard) ?? publicText(state.starter);
  return {
    kind: "cards",
    cards: top ? [top] : discard.slice(-1),
    label: top && "starter" in state ? "Starter" : "Discard",
    emptyLabel: "Table is ready",
  };
}

function tableContextLabel(
  gameSlug: string,
  street: string | null,
  pot: number | null,
  state: Record<string, unknown>,
): string {
  if (pokerGames.has(gameSlug)) {
    return `${street ? humanize(street) : "Preflop"}. ${pot ?? 0} in the pot.`;
  }
  if (trickGames.has(gameSlug)) {
    return `${cardsFromTrick(state.current_trick).length} cards in the current trick.`;
  }
  return "Your private information is visible only to you.";
}

function seatRole(state: Record<string, unknown>, seatId: string): string | null {
  if (Array.isArray(state.folded) && state.folded.includes(seatId)) return "folded";
  if (state.landlord === seatId) return "landlord";
  if (state.declarer === seatId) return "declarer";
  if (state.dealer === seatId) return "dealer";
  return null;
}

function tableMetrics(gameSlug: string, state: Record<string, unknown>): string[] {
  if (gameSlug === "hanabi") {
    const clues = publicNumber(state.clues);
    const lives = publicNumber(state.lives);
    return [
      clues === null ? null : `${clues} clues`,
      lives === null ? null : `${lives} lives`,
    ].filter((value): value is string => value !== null);
  }
  if (gameSlug === "mahjong") {
    const wallCount = publicNumber(state.wall_count);
    return wallCount === null ? [] : [`${wallCount} wall`];
  }
  if (gameSlug === "bridge" && isRecord(state.contract)) {
    const level = publicNumber(state.contract.level);
    const strain = publicText(state.contract.strain);
    const target = publicNumber(state.contract.target);
    return [
      level === null || !strain ? null : `${level}${strain} contract`,
      target === null ? null : `${target} target`,
    ].filter((value): value is string => value !== null);
  }
  if (gameSlug === "dou-dizhu") {
    const passes = Array.isArray(state.passes) ? state.passes.length : 0;
    return passes > 0 ? [`${passes} passes`] : [];
  }
  return [];
}

function cardsFromTrick(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isRecord(entry) && typeof entry.card === "string") return [entry.card];
    return [];
  });
}

function cardsFromLastPlay(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!isRecord(value)) return [];
  if (Array.isArray(value.cards)) return publicStringItems(value.cards);
  if (typeof value.card === "string") return [value.card];
  return [];
}

function tilesFromDiscards(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isRecord(entry) && typeof entry.tile === "string") return [entry.tile];
    return [];
  });
}

function normalizedCard(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s_-]/gu, "");
  if (compact === "BJ") return "2J";
  if (compact === "RJ") return "1J";
  const named = compact
    .replace(/CLUBS?$/u, "C")
    .replace(/DIAMONDS?$/u, "D")
    .replace(/HEARTS?$/u, "H")
    .replace(/SPADES?$/u, "S");
  const match = named.match(cardAssetPattern);
  if (!match) return null;
  const rank = match[1] === "10" ? "T" : match[1];
  return `${rank}${match[2]}`;
}

function cardAccessibleName(value: string): string {
  const compact = value.trim().toUpperCase().replace(/[\s_-]/gu, "");
  if (compact === "BJ") return "Black Joker";
  if (compact === "RJ") return "Red Joker";
  const normalized = normalizedCard(value);
  if (!normalized) return humanize(value);
  return `${rankNames[normalized[0] ?? ""] ?? normalized[0]} of ${suitNames[normalized[1] ?? ""] ?? normalized[1]}`;
}

function matchingCardAction(
  actions: readonly CardTableLegalAction[],
  value: string,
  kind: "card" | "tile",
): CardTableLegalAction | null {
  const target = kind === "card" ? normalizedCard(value) : normalizedMahjongTile(value);
  if (!target) return null;
  for (const action of actions) {
    const rawObject = actionObject(action);
    if (!rawObject) continue;
    const candidate = kind === "card"
      ? normalizedCard(rawObject)
      : normalizedMahjongTile(rawObject);
    if (candidate === target) return action;
  }
  return null;
}

function actionObject(action: CardTableLegalAction): string | null {
  const verb = action.verb?.trim().toLowerCase();
  if ((verb === "play" || verb === "discard") && action.object?.trim()) {
    return singleActionObject(action.object);
  }
  const match = action.token.trim().match(/^(?:play|discard)(?::|\s+)(.+)$/iu);
  return match?.[1] ? singleActionObject(match[1]) : null;
}

function singleActionObject(value: string): string | null {
  const trimmed = value.trim();
  return !trimmed || /[,|+/]/u.test(trimmed) ? null : trimmed;
}

function markImageDecoded(
  event: SyntheticEvent<HTMLImageElement>,
  setImageReady: (ready: boolean) => void,
): void {
  const image = event.currentTarget;
  const finish = () => setImageReady(image.complete && image.naturalWidth > 0);
  if (typeof image.decode === "function") {
    void image.decode().then(finish, finish);
  } else {
    finish();
  }
}

function publicStringItems(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function publicCardItems(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    if (typeof item === "string" && item.trim()) return [item.trim()];
    if (Number.isSafeInteger(item) && Number(item) >= 1 && Number(item) <= 11) return [String(item)];
    return [];
  });
}

function publicNumberRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => (
      typeof entry[1] === "number" && Number.isFinite(entry[1])
    )),
  );
}

function publicNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function publicText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function defaultOpponentCardCount(gameSlug: string): number {
  if (gameSlug === "leduc-holdem") return 1;
  if (gameSlug === "blackjack") return 1;
  if (pokerGames.has(gameSlug)) return 2;
  return 0;
}

function shortSeatName(seat: CardTableSeat): string {
  const value = seat.label ?? seat.modelId ?? seat.seatId;
  const slash = value.lastIndexOf("/");
  const normalized = slash >= 0 ? value.slice(slash + 1) : value;
  return normalized.length > 20 ? `${normalized.slice(0, 18)}…` : normalized;
}

function tileLabel(value: string): string {
  return value
    .replace(/characters?/iu, "萬")
    .replace(/bamboos?/iu, "索")
    .replace(/dots?/iu, "筒")
    .replace(/east/iu, "東")
    .replace(/south/iu, "南")
    .replace(/west/iu, "西")
    .replace(/north/iu, "北")
    .replace(/red/iu, "中")
    .replace(/green/iu, "發")
    .replace(/white/iu, "白");
}

function normalizedMahjongTile(value: string): string | null {
  const compact = value.trim().toUpperCase().replace(/[\s_-]/gu, "");
  if (/^[BCD][1-9]$/u.test(compact) || /^(?:F|S)[1-4]$/u.test(compact)) return compact;
  const legacy = compact.match(/^([1-9])([MPS])$/u);
  if (legacy) {
    const suit = legacy[2] === "S" ? "B" : legacy[2] === "M" ? "C" : "D";
    return `${suit}${legacy[1]}`;
  }
  const named: Record<string, string> = {
    E: "WE",
    EAST: "WE",
    WE: "WE",
    SOUTH: "WS",
    WS: "WS",
    WEST: "WW",
    WW: "WW",
    NORTH: "WN",
    WN: "WN",
    RED: "DR",
    REDDRAGON: "DR",
    DR: "DR",
    GREEN: "DG",
    GREENDRAGON: "DG",
    DG: "DG",
    WHITE: "DW",
    WHITEDRAGON: "DW",
    DW: "DW",
  };
  return named[compact] ?? null;
}

function mahjongAccessibleName(value: string): string {
  const normalized = normalizedMahjongTile(value);
  if (!normalized) return humanize(value);
  const suitNamesByCode: Record<string, string> = {
    B: "bamboo",
    C: "characters",
    D: "dots",
    F: "flower",
    S: "season",
  };
  if (/^[BCDFS][1-9]$/u.test(normalized)) {
    return `${normalized.slice(1)} ${suitNamesByCode[normalized[0] ?? ""] ?? "tile"}`;
  }
  const honors: Record<string, string> = {
    WE: "East wind",
    WS: "South wind",
    WW: "West wind",
    WN: "North wind",
    DR: "Red dragon",
    DG: "Green dragon",
    DW: "White dragon",
  };
  return honors[normalized] ?? humanize(value);
}

function humanize(value: string): string {
  return value
    .replace(/[_-]+/gu, " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
