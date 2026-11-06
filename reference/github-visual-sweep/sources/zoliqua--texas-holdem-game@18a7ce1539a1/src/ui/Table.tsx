import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useDental, useLang, useMessages } from '../arcade';
import type { TellCue } from '../bots/tells';
import { evaluate7 } from '../engine/evaluate';
import { buildPots } from '../engine/pots';
import type { LogEvent, TableState } from '../engine/types';
import { animationFactor, type Speed } from '../game/speed';
import { PLAYER_ID, type GameState } from '../game/state';
import { MESSAGES } from '../i18n';
import { CardView } from './CardView';
import type { Pose } from './Character';
import { Chips } from './Chips';
import { formatChips } from './format';
import { FELT, seatPositions, towardsCentre, VIEWBOX, type Orientation } from './layout';
import { Seat } from './Seat';
import { themeSpec, type DeckStyle, type TableLook, type TableTheme } from './themes';
import styles from './Table.module.css';

export type TableProps = {
  state: GameState;
  theme: TableTheme;
  deck: DeckStyle;
  speed: Speed;
  cues: Record<string, TellCue | null>;
  callouts: Record<string, string | null>;
  onOpenCharacter(id: string): void;
  /** The acting bot and its thinking time (turn ring). */
  turn?: { id: string; ms: number } | null;
  /** Force an orientation (tests, the mini demo); otherwise it follows the container width. */
  orientation?: Orientation;
  /** Compact attract-mode rendering (no buttons, smaller labels). */
  mini?: boolean;
};

type Flight = { key: string; from: { x: number; y: number }; to: { x: number; y: number }; amount: number; delay: number };

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Follows the container width: narrow containers get the upright (portrait) table. */
function useOrientation(forced?: Orientation): [React.RefCallback<HTMLDivElement>, Orientation] {
  const [o, setO] = useState<Orientation>(forced ?? 'landscape');
  const observer = useRef<ResizeObserver | null>(null);
  const ref = (node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || forced || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setO(w > 0 && w < 560 ? 'portrait' : 'landscape');
    });
    ro.observe(node);
    observer.current = ro;
  };
  useEffect(() => () => observer.current?.disconnect(), []);
  return [ref, forced ?? o];
}

/** Ids of the hand's winners, and the winning five cards of the main pot (at showdown). */
function winners(t: TableState): { ids: Set<string>; best: number[] } {
  const wins = t.events.filter((e): e is Extract<LogEvent, { t: 'win' }> => e.t === 'win');
  const ids = new Set(wins.flatMap((w) => w.ids));
  const shown = t.events.some((e) => e.t === 'show');
  let best: number[] = [];
  const main = wins[0];
  if (shown && main && t.board.length === 5) {
    const p = t.players.find((q) => q.id === main.ids[0]);
    if (p?.hole) best = evaluate7([...p.hole, ...t.board]).best;
  }
  return { ids, best };
}

/** What each player had in front of them when `street` closed (blinds, the last bet or call, minus returns). */
function streetBets(events: readonly LogEvent[], street: string): Record<string, number> {
  const out: Record<string, number> = {};
  let current = 'preflop';
  for (const e of events) {
    if (e.t === 'deal') {
      if (current === street && e.street !== street) break;
      current = e.street;
      continue;
    }
    if (current !== street) continue;
    if (e.t === 'blind') out[e.id] = e.amount;
    else if (e.t === 'act') out[e.id] = e.to;
    else if (e.t === 'return') out[e.id] = (out[e.id] ?? 0) - e.amount;
  }
  return out;
}

function poseOf(t: TableState, id: string, winnerIds: Set<string>): Pose {
  const p = t.players.find((q) => q.id === id);
  if (!p) return 'idle';
  if (p.out) return 'busted';
  if (t.street === 'done' && winnerIds.has(id)) return 'win';
  if (t.toAct !== null && t.players[t.toAct].id === id) return 'thinking';
  if (p.folded) return 'fold';
  if (p.allIn) return 'allIn';
  // The last action on this street.
  for (let i = t.events.length - 1; i >= 0; i -= 1) {
    const e = t.events[i];
    if (e.t === 'deal') break;
    if (e.t === 'act' && e.id === id) return e.action.kind === 'bet' || e.action.kind === 'raise' ? 'bet' : 'idle';
  }
  return 'idle';
}

export function Table({ state, theme, deck, speed, cues, callouts, onOpenCharacter, turn = null, orientation: forced, mini = false }: TableProps) {
  const tr = useMessages(MESSAGES);
  const [lang] = useLang();
  const [ref, orientation] = useOrientation(forced);
  const t = state.table;
  const [dental] = useDental();
  // Dental mode swaps in the clinic table for as long as it is on; the stored theme is untouched.
  const look: TableLook = dental ? 'clinic' : theme;
  const spec = themeSpec(look);
  const box = VIEWBOX[orientation];
  const felt = FELT[orientation];
  const n = Math.max(2, Math.min(6, t.players.length)) as 2 | 3 | 4 | 5 | 6;
  const seats = seatPositions(n, orientation);
  const anim = animationFactor(speed);
  const { ids: winnerIds, best } = useMemo(() => winners(t), [t]);
  const done = t.street === 'done';
  const shownIds = useMemo(() => new Set(t.events.filter((e) => e.t === 'show').map((e) => (e as { id: string }).id)), [t.events]);

  // Pots: what is already in the middle (previous streets), and side pots once there are all-ins.
  const potMiddle = t.players.reduce((s, p) => s + p.committed - p.bet, 0);
  const pots = useMemo(() => buildPots(t.players), [t.players]);
  // Side pots once somebody is all-in (a part nobody else can match yet is not a pot).
  const contested = pots.filter((p) => p.eligible.length > 1);
  const topCommit = Math.max(0, ...t.players.filter((p) => !p.folded).map((p) => p.committed));
  const shortAllIn = t.players.some((p) => p.allIn && !p.folded && p.committed < topCommit);
  const sidePots = !done && contested.length > 1 && shortAllIn ? contested : [];
  const wins = useMemo(() => t.events.filter((e): e is Extract<LogEvent, { t: 'win' }> => e.t === 'win'), [t.events]);

  const seatOf = (id: string) => seats[t.players.findIndex((p) => p.id === id)] ?? seats[0];
  const betSpot = (i: number) => {
    // The player's own cards sit above the seat, so the player's bet goes beside them.
    if (t.players[i]?.id === PLAYER_ID) return { x: seats[i].x - (orientation === 'portrait' ? 74 : 92), y: seats[i].y - (orientation === 'portrait' ? 58 : 50) };
    return towardsCentre(seats[i], orientation, orientation === 'portrait' ? 0.5 : 0.4);
  };
  const potSpot = { x: felt.cx, y: felt.cy + (orientation === 'portrait' ? 66 : 56) };

  // ── Chip flights: bets into the pot when a street closes, pots to the winners at the end.
  const [flights, setFlights] = useState<Flight[]>([]);
  const prev = useRef<{ hand: number; street: string; bets: number[] } | null>(null);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = { hand: t.handNo, street: t.street, bets: t.players.map((p) => p.bet) };
    if (!before || before.hand !== t.handNo || before.street === t.street) return;
    const next: Flight[] = [];
    const closed = streetBets(t.events, before.street);
    t.players.forEach((p, i) => {
      const amount = closed[p.id] ?? 0;
      if (amount > 0) next.push({ key: `b${t.handNo}-${t.street}-${i}`, from: betSpot(i), to: potSpot, amount, delay: 0 });
    });
    if (t.street === 'done') {
      wins.forEach((w, k) => {
        const share = Math.floor(w.amount / w.ids.length);
        w.ids.forEach((id, j) =>
          next.push({ key: `w${t.handNo}-${k}-${id}`, from: potSpot, to: seatOf(id), amount: share, delay: (k * 0.5 + j * 0.15 + 0.45) * 1000 }),
        );
      });
    }
    if (next.length === 0) return;
    setFlights(next);
    const id = window.setTimeout(() => setFlights([]), (2400 + next.length * 150) * Math.max(anim, 0.3));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.handNo, t.street]);

  const vars = {
    '--u': `calc(100cqw / ${box.w})`,
    '--anim': anim,
    '--seat-bg': spec.seat,
    '--seat-stroke': spec.seatStroke,
    '--table-text': spec.text,
    '--hl': spec.highlight,
    '--felt-line': spec.feltLine,
    aspectRatio: `${box.w} / ${box.h}`,
  } as CSSProperties;

  const buttonSeat = seats[t.button] ?? seats[0];
  const buttonSpot =
    t.players[t.button]?.id === PLAYER_ID
      ? { x: buttonSeat.x + (orientation === 'portrait' ? 64 : 76), y: buttonSeat.y }
      : towardsCentre(buttonSeat, orientation, orientation === 'portrait' ? 0.2 : 0.24);

  return (
    <div className={styles.wrap} ref={ref}>
      <div
        className={`${styles.table} ${mini ? styles.mini : ''}`}
        data-orientation={orientation}
        data-theme-table={look}
        data-dental={dental}
        style={vars}
        role="region"
        aria-label={tr('tableLabel')}
      >
        <svg className={styles.felt} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <radialGradient id={`felt-${look}`}>
              <stop offset="0" stopColor={spec.felt[0]} />
              <stop offset="1" stopColor={spec.felt[1]} />
            </radialGradient>
            <linearGradient id={`rail-${look}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={spec.rail[0]} />
              <stop offset="1" stopColor={spec.rail[1]} />
            </linearGradient>
            {spec.glow && (
              <filter id="rail-glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            )}
          </defs>
          {spec.glow && (
            <ellipse
              className={styles.glow}
              cx={felt.cx}
              cy={felt.cy}
              rx={felt.rx + 22}
              ry={felt.ry + 22}
              fill="none"
              stroke={spec.glow}
              strokeWidth="9"
              filter="url(#rail-glow)"
            />
          )}
          <ellipse cx={felt.cx} cy={felt.cy} rx={felt.rx + 22} ry={felt.ry + 22} fill={`url(#rail-${look})`} stroke={spec.railStroke} strokeWidth="2.5" />
          <ellipse cx={felt.cx} cy={felt.cy} rx={felt.rx} ry={felt.ry} fill={`url(#felt-${look})`} />
          <ellipse cx={felt.cx} cy={felt.cy} rx={felt.rx * 0.78} ry={felt.ry * 0.72} fill="none" stroke={spec.feltLine} strokeWidth="1.5" />
          {look === 'classic' && (
            <ellipse cx={felt.cx} cy={felt.cy} rx={felt.rx + 21} ry={felt.ry + 21} fill="none" stroke="#e7c98a" strokeOpacity=".35" strokeWidth="1" />
          )}
          <text
            x={felt.cx}
            y={felt.cy - (orientation === 'portrait' ? 92 : 62)}
            textAnchor="middle"
            fontSize="11"
            letterSpacing="3"
            fill={spec.text}
            opacity=".28"
            fontFamily="ui-sans-serif, system-ui"
            fontWeight="700"
          >
            ZOLTAN&apos;S ARCADE · HOLD&apos;EM
          </text>
        </svg>

        <div className={styles.layer}>
          {/* Board */}
          <div className={styles.board} style={{ left: pct(felt.cx, box.w), top: pct(felt.cy, box.h) }} aria-label={tr('boardLabel')}>
            {Array.from({ length: 5 }, (_, i) => {
              const c = t.board[i];
              if (c === undefined) return <span key={`slot-${i}`} className={styles.slot} />;
              const flopIndex = i < 3 ? i : 0;
              return (
                <CardView
                  key={`${t.handNo}-${c}`}
                  card={c}
                  deck={deck}
                  size={0}
                  highlight={best.includes(c)}
                  className={styles.boardCard}
                  style={{ ['--i' as string]: flopIndex }}
                />
              );
            })}
          </div>

          {/* Pot */}
          <div className={styles.pot} style={{ left: pct(potSpot.x, box.w), top: pct(potSpot.y, box.h) }}>
            {potMiddle > 0 && <Chips amount={potMiddle} colors={spec.chips} label={false} />}
            <span className={styles.potLabel}>
              {done && wins.length > 0 ? (
                wins.map((w, k) => (
                  <span key={k} className={styles.winLine}>
                    {wins.length > 1 ? (k === 0 ? tr('potMainWin') : tr('potSideWin', { k })) : tr('pot')} {formatChips(w.amount, lang)} →{' '}
                    {w.ids.map((id) => (id === PLAYER_ID ? tr('you') : (state.bots.find((b) => b.id === id)?.name ?? id))).join(' & ')}
                  </span>
                ))
              ) : (
                <>
                  {tr('pot')} {formatChips(potMiddle + t.players.reduce((s, p) => s + p.bet, 0), lang)}
                  {sidePots.length > 0 && (
                    <span className={styles.sidePots}>
                      {sidePots.map((p, k) => (
                        <span key={k}>
                          {k === 0 ? tr('potMain') : tr('potSide', { k })} {formatChips(p.amount, lang)}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>

          {/* Bets in front of the seats */}
          {t.players.map((p, i) =>
            p.bet > 0 ? (
              <Chips
                key={`bet-${t.handNo}-${t.street}-${p.id}-${p.bet}`}
                amount={p.bet}
                colors={spec.chips}
                className={styles.bet}
                style={
                  {
                    left: pct(betSpot(i).x, box.w),
                    top: pct(betSpot(i).y, box.h),
                    '--dx': seats[i].x - betSpot(i).x,
                    '--dy': seats[i].y - betSpot(i).y,
                  } as CSSProperties
                }
              />
            ) : null,
          )}

          {/* Chip flights */}
          {flights.map((f) => (
            <Chips
              key={f.key}
              amount={f.amount}
              colors={spec.chips}
              label={false}
              className={styles.flight}
              style={
                {
                  left: pct(f.to.x, box.w),
                  top: pct(f.to.y, box.h),
                  '--dx': f.from.x - f.to.x,
                  '--dy': f.from.y - f.to.y,
                  animationDelay: `${f.delay * anim}ms`,
                } as CSSProperties
              }
            />
          ))}

          {/* Dealer button: one chip that slides from seat to seat */}
          <span
            className={styles.dealerButton}
            style={{ left: pct(buttonSpot.x, box.w), top: pct(buttonSpot.y, box.h) }}
            aria-label={tr('dealerButton', {
              name: t.players[t.button]?.id === PLAYER_ID ? tr('dealerYou') : (state.bots.find((b) => b.id === t.players[t.button]?.id)?.name ?? ''),
            })}
          >
            D
          </span>

          {/* Seats */}
          {t.players.map((p, i) => {
            const profile = state.bots.find((b) => b.id === p.id) ?? null;
            const me = p.id === PLAYER_ID;
            const active = !done && t.toAct === i && state.phase === 'playing';
            const seat = seats[i];
            return (
              <Seat
                key={p.id}
                player={p}
                profile={profile}
                active={active}
                isDealer={t.button === i}
                callout={callouts[p.id] ?? null}
                pose={poseOf(t, p.id, winnerIds)}
                cue={cues[p.id] ?? null}
                deck={deck}
                showHole={me || (done && shownIds.has(p.id))}
                highlight={best}
                turnMs={turn && turn.id === p.id ? turn.ms : null}
                back={spec.back}
                onOpen={mini ? undefined : () => onOpenCharacter(p.id)}
                className={`${seat.y < felt.cy ? styles.top : styles.bottom} ${seat.x < felt.cx - 10 ? styles.left : seat.x > felt.cx + 10 ? styles.right : styles.centre}`}
                style={
                  {
                    left: pct(seat.x, box.w),
                    top: pct(seat.y, box.h),
                    '--dx': felt.cx - seat.x,
                    '--dy': felt.cy - seat.y,
                    '--deal-i': (i - t.button - 1 + t.players.length * 2) % t.players.length,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Table;
