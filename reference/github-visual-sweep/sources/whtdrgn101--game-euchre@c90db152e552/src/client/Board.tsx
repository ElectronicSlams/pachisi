import { useState } from 'react';
import { ActivityFeed, Button, GameOver, TurnBanner, cn, seatIdentity } from '@game-hub/ui-kit';
import { canFollow, effectiveSuit, printedSuit, SUITS, teamOf } from '../engine/index.js';
import type { Action, Card, EuchrePlayerView, EuchreView } from '../engine/index.js';
import { act } from './api.js';
import { CardBack, CardFace, SUIT_NAME, SUIT_PIP, isRed } from './cards.js';
import { describeMoveRecord } from './describe.js';
import type { BoardProps } from './types.js';

/**
 * The Euchre board.
 *
 * Everything it renders comes from the **view** — so it physically cannot show another player's cards,
 * the kitty or the deck seed, because `viewFor` never sent them. Every affordance is gated on `canDrive`
 * (the shared `seatIdentity` rule: this client controls the active seat, and that seat isn't a bot), and
 * the server re-checks every move regardless — the disabled states here are courtesy, not security.
 *
 * Laid out mobile-first: at 320px the hand, the trick and the controls each stay on one line without the
 * page scrolling sideways.
 */
export default function EuchreBoard({
  gameId,
  game,
  bots,
  colors,
  controlledIds,
  viewer,
  busy,
  guard,
  onPayload,
  onLeave,
}: BoardProps<EuchreView>) {
  // Round two lets you name a suit *and* declare alone in one action, so the toggle is board state: it
  // is a modifier on the next click, not a move of its own.
  const [alone, setAlone] = useState(false);

  const active = game.players[game.activePlayerIndex];
  const { canDrive } = seatIdentity({
    players: game.players,
    activePlayerId: game.status === 'ended' ? null : (active?.id ?? null),
    bots,
    controlledIds,
  });

  /** Send one action as the seat on the clock, version-guarded against a lost race. */
  const send = (action: Action) =>
    void guard(async () => {
      if (!active) return;
      onPayload(await act(gameId, active.id, action, viewer, game.version));
      setAlone(false);
    });

  if (game.status === 'ended') {
    const winners = game.players.filter((player) => game.winnerIds.includes(player.id));
    return (
      <GameOver winnerNames={winners.map((player) => player.name)} onNewGame={onLeave}>
        <div data-testid="euchre-results" className="space-y-1 text-sm">
          {game.results.map((result) => (
            <div key={result.team} className="flex justify-between gap-4">
              <span>{result.playerIds.map((id) => nameOf(game, id)).join(' & ')}</span>
              <span className="font-semibold tabular-nums">{result.score}</span>
            </div>
          ))}
        </div>
      </GameOver>
    );
  }

  // Whose hand this client is looking at: its own seat online, or the seat on the clock in hotseat
  // (where it holds them all and the cards should follow the turn).
  const handOwner: EuchrePlayerView | null = controlledIds
    ? (game.players.find((player) => controlledIds.includes(player.id)) ?? null)
    : (active ?? null);
  const hand = handOwner?.hand ?? [];

  return (
    <div data-testid="euchre-board" className="mx-auto max-w-2xl space-y-3 p-2">
      <TurnBanner testId="euchre-banner" canDrive={canDrive}>
        {prompt(game, active, canDrive)}
      </TurnBanner>

      <ScoreBar game={game} />
      <Seats game={game} colors={colors} bots={bots} />
      <Trick game={game} />

      {/* Phase controls. Only one of these ever renders. */}
      {game.phase === 'bidding' && game.biddingRound === 1 && (
        <Panel title={`Upcard: ${game.upcard ? cardText(game.upcard) : '—'}`}>
          <Button data-testid="euchre-pass" disabled={!canDrive || busy} onClick={() => send({ type: 'PASS' })}>
            Pass
          </Button>
          <Button
            data-testid="euchre-order-up"
            disabled={!canDrive || busy}
            onClick={() => send({ type: 'ORDER_UP', alone: false })}
          >
            Order it up
          </Button>
          <Button
            variant="outline"
            data-testid="euchre-order-up-alone"
            disabled={!canDrive || busy}
            onClick={() => send({ type: 'ORDER_UP', alone: true })}
          >
            Alone
          </Button>
        </Panel>
      )}

      {game.phase === 'bidding' && game.biddingRound === 2 && (
        <Panel title={`Name a suit${game.turnedDownSuit ? ` — not ${SUIT_NAME[game.turnedDownSuit]}` : ''}`}>
          {/* Stick the dealer: the dealer has no pass to offer (ROADMAP §2), so the button is absent
              rather than present-and-disabled — a control you can never use is worse than no control. */}
          {!(game.stickTheDealer && game.activePlayerIndex === game.dealerIndex) && (
            <Button data-testid="euchre-pass" disabled={!canDrive || busy} onClick={() => send({ type: 'PASS' })}>
              Pass
            </Button>
          )}
          {SUITS.filter((suit) => suit !== game.turnedDownSuit).map((suit) => (
            <Button
              key={suit}
              variant="outline"
              data-testid={`euchre-name-${suit}`}
              aria-label={`Name ${SUIT_NAME[suit]} trump${alone ? ', alone' : ''}`}
              disabled={!canDrive || busy}
              onClick={() => send({ type: 'NAME_TRUMP', suit, alone })}
              className={isRed(suit) ? 'text-[#c0392b]' : undefined}
            >
              {SUIT_PIP[suit]}
            </Button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              data-testid="euchre-alone-toggle"
              checked={alone}
              disabled={!canDrive || busy}
              onChange={(event) => setAlone(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Go alone
          </label>
        </Panel>
      )}

      {game.phase === 'defense' && (
        <Panel title="Play this hand alone against the makers?">
          <Button
            data-testid="euchre-defend-no"
            disabled={!canDrive || busy}
            onClick={() => send({ type: 'DEFEND_ALONE', alone: false })}
          >
            No thanks
          </Button>
          <Button
            variant="outline"
            data-testid="euchre-defend-alone"
            disabled={!canDrive || busy}
            onClick={() => send({ type: 'DEFEND_ALONE', alone: true })}
          >
            Defend alone
          </Button>
        </Panel>
      )}

      {/* The hand. In `discard` a click throws the card back; in `playing` it plays it. */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">
          {handOwner ? `${handOwner.name}'s hand` : 'Hand'}
          {game.phase === 'discard' && canDrive ? ' — choose a card to discard' : ''}
        </div>
        <div data-testid="euchre-hand" className="flex flex-wrap gap-1.5">
          {hand.length === 0 && <span className="text-xs text-muted-foreground">Sitting this hand out.</span>}
          {hand.map((card) => {
            const playable = isPlayable(game, hand, card);
            const clickable = canDrive && !busy && (game.phase === 'discard' || (game.phase === 'playing' && playable));
            return (
              <CardFace
                key={card}
                card={card}
                trump={game.trump}
                disabled={!clickable}
                {...(clickable
                  ? {
                      onClick: () =>
                        send(game.phase === 'discard' ? { type: 'DISCARD', card } : { type: 'PLAY', card }),
                    }
                  : {})}
              />
            );
          })}
        </div>
      </div>

      <ActivityFeed
        log={game.log}
        players={game.players}
        botIds={bots}
        describe={describeMoveRecord}
        testId="euchre-log"
        emptyLabel="The cards have just been dealt."
      />
    </div>
  );
}

/** A row of controls under a one-line heading. */
function Panel({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <div data-testid="euchre-controls" className="space-y-1.5 rounded-lg border border-border bg-card p-2.5">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/** Team scores, the trump suit and the target — everything public about where the game stands. */
function ScoreBar({ game }: { readonly game: EuchreView }) {
  return (
    <div data-testid="euchre-scores" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {([0, 1] as const).map((team) => (
        <span key={team}>
          <span className="text-muted-foreground">
            {game.players
              .filter((_player, seat) => teamOf(seat) === team)
              .map((player) => player.name)
              .join(' & ')}
          </span>{' '}
          <span className="font-semibold tabular-nums">{game.scores[team]}</span>
        </span>
      ))}
      <span className="ml-auto text-muted-foreground">
        {game.trump ? (
          <>
            Trump{' '}
            <span className={cn('font-semibold', isRed(game.trump) ? 'text-[#c0392b]' : 'text-foreground')}>
              {SUIT_PIP[game.trump]}
            </span>
          </>
        ) : (
          'No trump yet'
        )}{' '}
        · to {game.targetScore}
      </span>
    </div>
  );
}

/** One chip per seat: name, tint, tricks taken, and the badges that matter (dealer, maker, alone). */
function Seats({
  game,
  colors,
  bots,
}: {
  readonly game: EuchreView;
  readonly colors: Readonly<Record<string, string>>;
  readonly bots: readonly string[];
}) {
  return (
    <div data-testid="euchre-seats" className="flex flex-wrap gap-1.5">
      {game.players.map((player, seat) => (
        <div
          key={player.id}
          data-testid={`euchre-seat-${seat}`}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
            seat === game.activePlayerIndex ? 'border-primary bg-primary/10' : 'border-border',
            player.sittingOut ? 'opacity-50' : '',
          )}
        >
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
            // The seat's tint, from the host's resolved palette; falls back to the colour the engine
            // carries when the host sends none.
            style={{ backgroundColor: colors[player.id] ?? player.color }}
          />
          <span className="font-medium">{player.name}</span>
          {bots.includes(player.id) && <span aria-label="AI seat">🤖</span>}
          {seat === game.dealerIndex && <Badge>D</Badge>}
          {seat === game.makerIndex && <Badge>maker</Badge>}
          {player.alone && <Badge>alone</Badge>}
          <span className="tabular-nums text-muted-foreground">{player.tricksWon}</span>
        </div>
      ))}
    </div>
  );
}

const Badge = ({ children }: { readonly children: React.ReactNode }) => (
  <span className="rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground uppercase">{children}</span>
);

/** The cards on the table, in the order they were played. */
function Trick({ game }: { readonly game: EuchreView }) {
  const plays = game.plays.length > 0 ? game.plays : (game.lastTrick?.plays ?? []);
  const stale = game.plays.length === 0 && plays.length > 0;
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">
        {stale ? 'Last trick' : `Trick ${game.trickNumber + 1} of 5`}
      </div>
      <div data-testid="euchre-trick" className={cn('flex min-h-16 flex-wrap gap-1.5', stale ? 'opacity-50' : '')}>
        {plays.length === 0 ? (
          <CardBack testId="euchre-trick-empty" className="opacity-30" />
        ) : (
          plays.map((play) => (
            <div key={play.playerId + play.card} className="flex flex-col items-center gap-0.5">
              <CardFace card={play.card} trump={game.trump} testId={`euchre-played-${play.card}`} />
              <span className="text-[10px] text-muted-foreground">{nameOf(game, play.playerId)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * May this card be played right now (ROADMAP §1.6)?
 *
 * Uses the **engine's own** `canFollow`/`effectiveSuit`, so the board cannot drift from the rule the
 * server enforces — ruling **R5** included: with spades trump, the club jack does not let you follow
 * clubs, and the board greys it out for exactly that reason.
 */
function isPlayable(game: EuchreView, hand: readonly Card[], card: Card): boolean {
  if (game.phase !== 'playing' || !game.trump) return false;
  const led = game.plays[0];
  if (!led) return true;
  const ledSuit = effectiveSuit(led.card, game.trump);
  return !canFollow(hand, ledSuit, game.trump) || effectiveSuit(card, game.trump) === ledSuit;
}

const nameOf = (game: EuchreView, playerId: string) =>
  game.players.find((player) => player.id === playerId)?.name ?? playerId;

const cardText = (card: Card) => `${card[0] === 'T' ? '10' : card[0]}${SUIT_PIP[printedSuit(card)]}`;

/** The one-line "what now" the banner shows. */
function prompt(game: EuchreView, active: EuchrePlayerView | undefined, canDrive: boolean): string {
  const who = canDrive ? 'You' : (active?.name ?? 'Someone');
  const verb = canDrive ? '' : 's';
  switch (game.phase) {
    case 'bidding':
      return game.biddingRound === 1
        ? `${who} bid${verb ? '' : ''} — order it up or pass.`
        : `${who} — name a suit or pass.`;
    case 'discard':
      return `${who} took it up — choose a card to discard.`;
    case 'defense':
      return `${who} — defend alone?`;
    case 'playing':
      return `${who} to play.`;
  }
}
