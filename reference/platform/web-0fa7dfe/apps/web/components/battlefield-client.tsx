"use client";

import { recordedWinnerSeat } from "../lib/recorded-winner";

import Link from "next/link";
import { nextDistinctMatchInList } from "@/lib/battlefield-next-up";
import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties, type Dispatch, type FormEvent, type ReactNode } from "react";
import { MatchPreview } from "@/components/stadium/match-preview";
import { Board } from "@/components/stadium/board";
import { Sheet } from "@/components/stadium/sheet";
import { LiveDot, StadiumDate } from "@/components/stadium/stadium-date";
import { MatchShareSheet } from "@/components/stadium/match-share-sheet";
import { boardFrameFromCells, placeholderFrame, type BoardFrame } from "@/lib/stadium/board";
import { formatAbsoluteDate } from "@/lib/stadium/dates";
import { battlefieldActionLabel } from "@/lib/stadium/battlefield-action";
import { modelNameFromId } from "@/lib/stadium/model-names";
import { ReplayBoard } from "@/components/replay-board";
import { fetchJsonWithTimeout, requestFailureMessage } from "@/lib/fetch-json-with-timeout";
import { invalidateAccountSession } from "@/lib/account-session-store";
import { modelProviderFromId, trackEvent } from "@/lib/analytics";
import { usePublicReplayEvents, type ReplayEventsState } from "@/lib/public-replay-events-resource";
import { publicProviderLogoCandidate } from "@/lib/public-provider-logo-candidate";
import type {
  PublicBattlefieldArena,
  PublicBattlefieldCatalog,
  PublicBattlefieldMatch,
  PublicBattlefieldProvider,
  PublicBattlefieldRequestModel,
} from "@/lib/public-battlefield-contract";
import {
  boardHasVisibleState,
  emptyVisualReplay,
  replayActiveMove,
  replayDefaultPly,
  replayFirstVisiblePly,
  replayFrameCount,
  replayFrameMeta,
  replayHasPlayableTimeline,
  replayHasVisibleBoard,
  replayMaxPly,
  replayStateFromTimeline,
  replayVisibleFrameCount,
  replayVisibleMoves,
  type ReplayMoveMeta,
  type ReplayState,
} from "@/lib/replay-view-state";
import { useReplayPlayback } from "@/lib/use-replay-playback";
import {
  buildPublicReplayTimeline,
  normalizeReplayBoard as normalizePublicReplayBoard,
  parsePublicReplayEventRow,
  replayRendererForGame,
  type PublicReplayFrame,
} from "@/lib/replay-visualization";

type IconName =
  | "arrowRight"
  | "check"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "grid"
  | "layers"
  | "lock"
  | "pause"
  | "play"
  | "plus"
  | "share"
  | "skipBack"
  | "skipForward"
  | "spark"
  | "swords";

const iconPaths: Record<IconName, ReactNode> = {
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M20 6L9 17l-5-5" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  share: <><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 16V4" /><path d="M8 8l4-4 4 4" /></>,
  skipBack: <><path d="M11 19l-8-7 8-7v14z" fill="currentColor" stroke="none" /><path d="M21 19l-8-7 8-7v14z" fill="currentColor" stroke="none" /></>,
  skipForward: <><path d="M13 5l8 7-8 7V5z" fill="currentColor" stroke="none" /><path d="M3 5l8 7-8 7V5z" fill="currentColor" stroke="none" /></>,
  spark: <path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  swords: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M17 21l4-4" /><path d="M14 14l-2 2" /><path d="M9.5 17.5L21 6V3h-3L6.5 14.5" /><path d="M11 19l-6-6" /><path d="M7 21l-4-4" /><path d="M10 14l2 2" /></>,
};

const emptyBattlefieldMatches: PublicBattlefieldMatch[] = [];
const matchStatusValues: readonly PublicBattlefieldMatch["status"][] = ["live", "completed", "scheduled"];
const matchStatusSet = new Set<PublicBattlefieldMatch["status"]>(matchStatusValues);
type BattlefieldRequestMode = NonNullable<PublicBattlefieldArena["battlefieldMode"]>;

type BattlefieldPageAction =
  | { readonly type: "hydrate"; readonly value: BattlefieldUrlState }
  | { readonly type: "tab"; readonly value: PublicBattlefieldMatch["status"] }
  | { readonly type: "gameFilter"; readonly value: string }
  | { readonly type: "modelFilter"; readonly value: string }
  | { readonly type: "selected"; readonly value: string };

type LiveMatchState = {
  status: "idle" | "connecting" | "connected" | "closed" | "error";
  eventCount: number;
  board: string[] | null;
  updatedAt: number | null;
};

type LiveMatchAction =
  | { type: "reset"; next: LiveMatchState }
  | { type: "status"; status: LiveMatchState["status"] }
  | { type: "payload"; payload: Record<string, unknown>; gameSlug: string };

type SelectOption = readonly [string, string] | readonly [string, string, { disabled?: boolean }];
type PublicPageSearchParams = Record<string, string | string[] | undefined>;
type PublicSearchParamsInput = PublicPageSearchParams | URLSearchParams | null | undefined;

type BattlefieldUrlState = {
  tab: PublicBattlefieldMatch["status"];
  gameFilter: string;
  modelFilter: string;
  selected: string;
  targetTurn: number | null;
  invalidRequestedTurn: boolean;
};

type BattlefieldCatalogView = {
  readonly arenas: readonly PublicBattlefieldArena[];
  readonly firstArena: PublicBattlefieldArena;
  readonly arenaBySlug: Map<string, PublicBattlefieldArena>;
  readonly providerBySlug: Map<string, PublicBattlefieldProvider>;
  readonly requestModelById: Map<string, PublicBattlefieldRequestModel>;
  readonly requestModels: readonly PublicBattlefieldRequestModel[];
  readonly requestModelIds: Set<string>;
};

type AdvantageView = {
  value: number;
  label: string;
  left: string;
  width: string;
  fillColor: string;
  tracePoints: string;
  traceX: string;
  traceY: string;
  available: boolean;
  note: string;
};

type BattlefieldParticipant = {
  readonly key: string;
  readonly role: "model" | "environment" | "seat";
  readonly tone: "a" | "b" | "table" | "environment";
  readonly label: string;
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly modelId?: string | null;
  readonly providerSlug?: string | null;
  readonly color?: string | null;
  readonly detail?: string | null;
  readonly aliases: readonly string[];
  readonly active: boolean;
  readonly won: boolean;
  readonly lost: boolean;
};

export function BattlefieldClient({
  catalog,
  matchRows = emptyBattlefieldMatches,
  searchParams,
  now,
}: {
  catalog: PublicBattlefieldCatalog;
  matchRows?: PublicBattlefieldMatch[];
  searchParams?: PublicSearchParamsInput;
  now?: number | undefined;
}) {
  const catalogView = useMemo(() => buildCatalogView(catalog), [catalog]);
  const initialState = useMemo(() => battlefieldStateFromSearchParams(searchParams, matchRows, catalogView), [catalogView, matchRows, searchParams]);
  const [state, dispatch] = useReducer(battlefieldPageReducer, initialState);
  const [stageScrollRequest, requestStageScroll] = useReducer((value: number) => value + 1, 0);
  const browserSearchHydrated = useRef(false);
  const stageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (searchParams || browserSearchHydrated.current) return;
    browserSearchHydrated.current = true;
    const browserParams = browserSearchParams();
    if (browserParams) dispatch({ type: "hydrate", value: battlefieldStateFromSearchParams(browserParams, matchRows, catalogView) });
  }, [catalogView, matchRows, searchParams]);

  useEffect(() => {
    if (stageScrollRequest === 0) return;
    const timers: number[] = [];
    let frame = 0;
    const run = () => scrollStageIntoView(stageRef);
    frame = window.requestAnimationFrame(() => {
      run();
      timers.push(window.setTimeout(run, 50), window.setTimeout(run, 300), window.setTimeout(run, 700));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [stageScrollRequest]);

  const { gameFilter, modelFilter, selected, tab } = state;
  const filterState = useMemo(() => ({ tab, gameFilter, modelFilter }), [gameFilter, modelFilter, tab]);
  const list = useMemo(() => battlefieldMatchesForState(matchRows, filterState), [filterState, matchRows]);
  const match = selected ? list.find((item) => item.id === selected) : selectPreferredBattlefieldMatch(list);
  const gamesInPlay = Array.from(new Set([gameFilter !== "all" ? gameFilter : null, ...matchRows.map((item) => item.game)].filter(Boolean) as string[]));
  const modelOptions = useMemo(() => battlefieldFilterModelOptions(matchRows, modelFilter, catalogView), [catalogView, matchRows, modelFilter]);
  const emptyMessage = selected && !match
    ? matchRows.some((item) => item.id === selected) ? "This match is not available with the current filters." : "The requested match was not found or is no longer public."
    : emptyBattlefieldMessage(tab, matchRows.length > 0);

  function selectMatch(next: PublicBattlefieldMatch) {
    trackEvent("battlefield_match_select", { game_slug: next.game, status: next.status, has_replay: Boolean(next.replayId) });
    dispatch({ type: "tab", value: next.status });
    dispatch({ type: "selected", value: next.id });
    replaceBattlefieldMatchUrl(next.id);
    requestStageScroll();
  }

  return (
    <div className="page battlefield battlefield-redesign">
      <header className="wrap bf-page-head">
        <div className="bf-page-copy">
          <h1 className="page-title">Battlefield</h1>
          <p className="page-desc">Watch frontier models play each other, with their reasoning as narration.</p>
        </div>
        <div className="bf-head-actions arena2-surface-links">
          <Link className="arena2-hvm" href="/battlefield/leaderboard" prefetch={false}><Icon name="grid" size={15} />Battlefield Leaderboard</Link><Link className="arena2-hvm" href="/arena" prefetch={false}><Icon name="play" size={15} />Play against models</Link>
        </div>
      </header>

      <div className="bf-viewer-wrap wrap">
      {state.invalidRequestedTurn ? <p role="status">The replay step in this link is invalid. Choose a step using the replay controls.</p> : null}
      <section ref={stageRef} className="bf-stage-section wrap" aria-label="Selected Battlefield match" data-bf-stage-section="true">
        {match ? (
          <MatchStage
            key={`${match.id}:${state.selected === match.id ? state.targetTurn ?? "auto" : "auto"}`}
            catalog={catalogView}
            initialTurn={state.selected === match.id ? state.targetTurn : null}
            match={match}
            marquee={<MarqueeSection catalog={catalogView} matches={matchRows} now={now} selectedId={match.id} onSelect={selectMatch} />}
            onNext={() => {
              const next = nextDistinctMatchInList(list, match);
              if (next) selectMatch(next);
            }}
          />
        ) : (
          <EmptyMatchStage message={emptyMessage} />
        )}
      </section>

      </div>

      <ProgrammeSection
        catalog={catalogView}
        matchRows={matchRows}
        list={list}
        state={state}
        gamesInPlay={gamesInPlay}
        modelOptions={modelOptions}
        emptyMessage={emptyMessage}
        onAction={dispatch}
        onSelect={selectMatch}
      />

      <RequestMatch catalog={catalogView} />
    </div>
  );
}

function scrollStageIntoView(stageRef: { current: HTMLElement | null }): void {
  const stage = stageRef.current ?? document.querySelector<HTMLElement>("[data-bf-stage-section='true']");
  if (!stage) return;
  const navHeight = Number.parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue("--nav-h"));
  const offset = (Number.isFinite(navHeight) ? navHeight : 0) + 16;
  const top = Math.max(0, stage.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top: Math.round(top), behavior: "auto" });
}

function MatchStage({ catalog, initialTurn, match, marquee, onNext }: { catalog: BattlefieldCatalogView; initialTurn: number | null; match: PublicBattlefieldMatch; marquee: ReactNode; onNext: () => void }) {
  const arena = catalog.arenaBySlug.get(match.game) ?? catalog.firstArena;
  const battlefieldMode = battlefieldModeForResult(match, arena);
  const live = useBattlefieldLiveMatch(match);
  const publicReplay = usePublicReplayEvents(match.replayId ?? null, match.game);
  const replay = useMemo(() => {
    if (live.board && match.status === "live") return liveReplay(match.game, live.board);
    if (publicReplay.events.length > 0) {
      return replayStateFromTimeline(buildPublicReplayTimeline(match.game, publicReplay.events), { playerA: match.a, playerB: match.b });
    }
    return emptyVisualReplay(match.game);
  }, [live.board, match.a, match.b, match.game, match.status, publicReplay.events]);
  const frameCount = replayFrameCount(replay);
  const maxPly = replayMaxPly(replay);
  const visibleFrames = replayVisibleFrameCount(replay);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSnapshot, setShareSnapshot] = useState<{turn: number | undefined; board: readonly string[] | null | undefined}>({turn:undefined,board:undefined});
  const shareTurn = shareSnapshot.turn;
  const [reasoningView, setReasoningView] = useState<{kind: "player"; key: string} | {kind: "match"} | null>(null);
  const reasoningSeat = reasoningView?.kind === "player" ? reasoningView.key : null;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const replayReadyReported = useRef(false);
  const reducedMotion = useSyncExternalStore(subscribeReplayMotion, replayMotionSnapshot, () => false);

  const hasLiveBoard = match.status === "live" && Boolean(live.board);
  const hasReplayView = hasLiveBoard ? replay.kind !== "static" && frameCount > 0 : replayHasVisibleBoard(replay);
  const hasReplayTimeline = hasLiveBoard ? replay.kind !== "static" && maxPly > 0 : replayHasPlayableTimeline(replay);
  const hasResultStep = match.status === "completed" && hasBattlefieldResult(match, arena) && hasReplayTimeline && maxPly > 0;
  const displayMaxPly = maxPly + (hasResultStep ? 1 : 0);
  const defaultPly = match.status === "completed" ? replayFirstVisiblePly(replay) ?? 0 : replayDefaultPly(replay, match.status);
  const playback = useReplayPlayback({
    identity: `${match.id}:${match.replayId ?? "live"}`,
    hasTimeline: hasReplayTimeline,
    maxPly: displayMaxPly,
    defaultPly,
    initialPly: initialTurn,
    autoPlay: initialTurn === null,
    lockToMax: hasLiveBoard,
  });
  const { isPlaying, speed, visiblePly, pause } = playback;
  useEffect(() => { if (reducedMotion) pause(); }, [pause,reducedMotion]);
  const firstVisiblePly = replayFirstVisiblePly(replay) ?? 0;
  const boardPly = Math.max(firstVisiblePly, Math.min(visiblePly, maxPly));
  const activeMove = replayActiveMove(replay, boardPly);
  const visibleMoves = replayVisibleMoves(replay);
  const showResult = hasResultStep && visiblePly > maxPly;
  const currentFrame = showResult ? { turnLabel: "Result | final", hashLabel: "Result ready" } : replayFrameMeta(replay, boardPly);
  const advantage = buildAdvantageView(replay, match, arena, boardPly, catalog.providerBySlug);
  const shareBoard = replay.kind === "visual" ? replay.frames[boardPly]?.board : replay.kind === "static" ? undefined : replay.states[boardPly];
  const participants = buildBattlefieldParticipants(match, arena, battlefieldMode, activeMove, showResult);

  useEffect(() => {
    if (replayReadyReported.current || publicReplay.status !== "ready") return;
    replayReadyReported.current = true;
    trackEvent("battlefield_replay_loaded", { game_slug: match.game, status: match.status, event_count: publicReplay.events.length });
  }, [match.game, match.status, publicReplay.events.length, publicReplay.status]);

  function seek(nextPly: number, action: string) {
    const bounded = Math.max(firstVisiblePly, Math.min(displayMaxPly, nextPly));
    trackEvent("battlefield_replay_control", { action, game_slug: match.game, status: match.status, target_ply: bounded, max_ply: displayMaxPly });
    playback.seek(bounded);
  }

  function shareMatch() { setShareSnapshot({turn:visiblePly,board:shareBoard}); setShareOpen(true); }
  function shareWholeMatch() { setShareSnapshot({turn:undefined,board:replay.kind === "visual" ? replay.frames.at(-1)?.board : replay.kind === "static" ? undefined : replay.states.at(-1)}); setShareOpen(true); }
  return (
    <div className="bf-broadcast-layout">
    <div className="bf-stage-shell viewer">
      <div className="bf-stadium-match-head"><strong>{arena.name}</strong><span>{match.status === "live" ? <LiveDot /> : "Replay"}{match.startedAt ? <> · <StadiumDate value={match.startedAt} /></> : null}</span></div>
      <ParticipantRail arena={arena} match={match} mode={battlefieldMode} participants={participants} providers={catalog.providerBySlug} selectedKey={reasoningSeat} onSelect={(key) => setReasoningView((value) => value?.kind === "player" && value.key === key ? null : {kind:"player",key})} />

      <div className="bf-stage-main vw-replay-stage">
        <div className="bf-stage-left">
          <div className="bf-board-panel">
            <div className="bf-frame-head">
              <span className="mono">{`Replay step ${visiblePly} of ${displayMaxPly} · ${currentFrame.turnLabel}`}</span>
              <span className="mono">{currentFrame.hashLabel}</span>
            </div>
            {hasReplayTimeline && initialTurn !== null && initialTurn > displayMaxPly ? <p role="status">The linked replay step is outside this replay. Showing the final available step.</p> : null}
            <div className="vw-board bf-board">
              <button className="bf-board-reasoning-target" type="button" aria-label="Show entire match reasoning" onClick={() => setReasoningView({kind:"match"})} />
              {showResult ? (
                <BattlefieldResultPanel
                  arena={arena}
                  match={match}
                  providers={catalog.providerBySlug}
                  replayStatus={publicReplay.status}
                  maxPly={maxPly}
                  visibleFrames={visibleFrames}
                  visiblePly={boardPly}
                  stage
                />
              ) : hasReplayView ? <StadiumReplayBoard replay={replay} ply={boardPly} game={match.game} /> : <NoReplayTimeline match={match} arena={arena} replayStatus={publicReplay.status} visibleFrames={visibleFrames} onRetry={publicReplay.retry} />}
            </div>
          </div>

          {advantage.available ? <AdvantageMeter advantage={advantage} /> : null}

          {hasReplayTimeline ? (
            <ReplayTransport
              activeMove={showResult ? null : activeMove}
              isPlaying={isPlaying}
              minPly={firstVisiblePly}
              maxPly={displayMaxPly}
              moves={visibleMoves}
              speed={speed}
              visiblePly={visiblePly}
              onPlay={() => {
                trackEvent("battlefield_replay_control", { action: isPlaying ? "pause" : "play", game_slug: match.game, status: match.status, target_ply: visiblePly, max_ply: displayMaxPly });
                playback.togglePlay();
              }}
              onSeek={seek}
              onSpeed={playback.cycleSpeed}
            />
          ) : match.status === "live" ? (
            <div className="bf-live-note mono"><span className="bf-live-dot" />{liveLabel(live)}</div>
          ) : null}


        </div>

      </div>
      <div className="bf-stage-share-actions" role="group" aria-label="Match actions">
        <button type="button" onClick={onNext}>Next up<Icon name="arrowRight" size={15} /></button>
        <button type="button" aria-expanded={detailsOpen} aria-controls="bf-match-details" onClick={() => setDetailsOpen((open) => !open)}>Match details<Icon name="chevronDown" size={15} /></button>
        <button type="button" onClick={shareWholeMatch}><Icon name="share" size={15} />Share match</button>
        <button type="button" onClick={shareMatch}>Share this replay step</button>
        <button type="button" aria-pressed={reasoningView?.kind === "match"} onClick={() => setReasoningView({kind:"match"})}>Show reasoning</button>
      </div>
      {detailsOpen ? <MatchInfoPanel arena={arena} match={match} replayStatus={publicReplay.status} maxPly={displayMaxPly} visibleFrames={visibleFrames} visiblePly={visiblePly} /> : null}
    </div>
    <aside className="bf-stadium-side" aria-label={reasoningView ? reasoningView.kind === "player" ? "Player reasoning" : "Match reasoning" : "Battlefield matches"}>
      {reasoningView ? <>
        <div className="bf-side-head"><button type="button" aria-label="Back to matches" onClick={() => setReasoningView(null)}><Icon name="chevronLeft" size={17} /></button><strong>{reasoningView.kind === "player" ? participants.find((player) => player.key === reasoningSeat)?.title : "Match reasoning"}</strong></div>
        <MoveLedger activeMove={activeMove} match={match} mode={battlefieldMode} moves={reasoningView.kind === "match" ? visibleMoves : visibleMoves.filter((move) => battlefieldParticipantForMove(move,participants)?.key === reasoningSeat)} participants={participants} selectedParticipantKey={reasoningSeat} visiblePly={visiblePly} onSeek={(ply) => seek(ply,"ledger_select")} />
      </> : marquee}
    </aside>
    <MatchShareSheet open={shareOpen} onClose={() => setShareOpen(false)} data={{game:arena.name,gameSlug:match.game,matchup:participants.map((player) => player.title).join(" vs "),headline:shareTurn === undefined ? `${arena.name} on Battlefield` : `Replay step ${shareTurn} · ${arena.name}`,message:`Watch ${participants.map((player) => player.title).join(" vs ")} play ${arena.name}${shareTurn === undefined ? "" : ` — replay step ${shareTurn}`}:`,href:`/battlefield?match=${encodeURIComponent(match.id)}${shareTurn === undefined ? "" : `&turn=${shareTurn}`}`,board:shareSnapshot.board,turn:shareTurn}} />
    </div>
  );
}

function subscribeReplayMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change",onChange);
  return () => media.removeEventListener("change",onChange);
}
function replayMotionSnapshot() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

function StadiumReplayBoard({replay,ply,game}:{replay:ReplayState;ply:number;game:string}) {
  if (replay.kind === "static") return <ReplayBoard replay={replay} ply={ply} />;
  const current = replay.kind === "visual" ? replay.frames[ply]?.board : replay.states[ply];
  const previous = replay.kind === "visual" ? replay.frames[ply-1]?.board : replay.states[ply-1];
  if (!current) return <ReplayBoard replay={replay} ply={ply} />;
  const last = previous && previous.length === current.length ? current.flatMap((cell,index) => cell !== previous[index] ? [index] : []) : [];
  const geometry = replay.kind === "visual" ? replay.frames[ply] : undefined;
  const frame = boardFrameFromCells(game,current,{...(last.length <= 2 ? {last} : {}),...(geometry ? {rows:geometry.rows,cols:geometry.cols} : {})});
  if (frame.kind !== "cells") return <ReplayBoard replay={replay} ply={ply} />;
  return <div className="bf-stadium-board-shell" data-game-slug={game} data-renderer-kind={replay.kind === "visual" ? replay.renderer.kind : replay.kind === "c4" ? "connect-four" : "tic-tac-toe"}><Board frame={frame} /></div>;
}

function ParticipantRail({
  arena,
  match,
  mode,
  participants,
  providers,
  selectedKey,
  onSelect,
}: {
  selectedKey: string | null;
  onSelect: (key: string) => void;
  arena: PublicBattlefieldArena;
  match: PublicBattlefieldMatch;
  mode: BattlefieldRequestMode;
  participants: readonly BattlefieldParticipant[];
  providers: Map<string, PublicBattlefieldProvider>;
}) {
  return (
    <div className={`bf-seat-rail bf-seat-rail-${mode}`} data-bf-mode={mode}>
      <div className="bf-stage-center">
        <strong>{arena.name}</strong>
        <span className="mono">{battlefieldStageSubtitle(match, arena, mode, participants.length)}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="bf-participant-list" aria-label={battlefieldParticipantRailLabel(mode)}>
        {participants.map((participant) => (
          <ParticipantCard key={participant.key} participant={participant} providers={providers} selected={selectedKey === participant.key} onSelect={() => onSelect(participant.key)} />
        ))}
      </div>
    </div>
  );
}

function ParticipantCard({
  participant,
  providers,
  selected,
  onSelect,
}: {
  selected: boolean;
  onSelect: () => void;
  participant: BattlefieldParticipant;
  providers: Map<string, PublicBattlefieldProvider>;
}) {
  const provider = participant.providerSlug ? providers.get(participant.providerSlug) : undefined;
  const providerColor = participant.color ?? provider?.color ?? "var(--accent)";
  return (
    <button
      type="button" aria-pressed={selected} aria-label={`Show ${participant.title} reasoning`} onClick={onSelect}
      className={`bf-seat bf-seat-${participant.tone} bf-seat-role-${participant.role} vw-rail ${participant.active ? "bf-seat-active" : ""} ${participant.won ? "bf-seat-winner" : ""} ${participant.lost ? "bf-seat-dim" : ""}`}
      data-participant-key={participant.key}
    >
      <div className="bf-seat-avatar-wrap" style={{ "--provider-color": providerColor } as CSSProperties}>
        <span className="bf-seat-arc" />
        <span className="bf-seat-avatar">
          {participant.role === "environment"
            ? <Icon name="layers" size={18} />
            : <ProviderDot provider={participant.providerSlug ?? "model"} providers={providers} size={28} />}
        </span>
      </div>
      <div className="bf-seat-main">
        {participant.modelId ? (
          <strong className="bf-seat-model-name">{participant.title}</strong>
        ) : (
          <strong className="bf-seat-environment">{participant.title}</strong>
        )}
        <span className="mono">{participant.subtitle}</span>
        {participant.detail ? <span className="mono bf-seat-detail">{participant.detail}</span> : null}
      </div>
      <div className="bf-seat-score">
        <strong className="mono">{participant.label}</strong>
        <span className="mono" style={{ color: participant.won ? "var(--win)" : providerColor }}>{participant.status}</span>
      </div>
    </button>
  );
}

function buildBattlefieldParticipants(
  match: PublicBattlefieldMatch,
  arena: PublicBattlefieldArena,
  mode: BattlefieldRequestMode,
  activeMove: ReplayMoveMeta | null,
  showResult: boolean,
): BattlefieldParticipant[] {
  if (mode === "solo_benchmark") {
    const won = showResult && match.result !== "b";
    const aliases = uniqueAliases([
      ...participantAliasesForModel(match.a, "a"),
      "player",
      "solo_player",
      "solo",
      "player_one",
      arena.slug,
    ]);
    const active = participantIsActive(aliases, "a", activeMove);
    return [
      {
        key: "a",
        role: "model",
        tone: "a",
        label: "Player",
        title: publicModelName(match.a),
        subtitle: participantModelSubtitle(match.a),
        detail: showResult && typeof match.gameEloA === "number" ? `Score ${formatDetailNumber(match.gameEloA)}` : publicVariantLabel(arena.variant),
        status: won ? "complete" : participantLiveStatus(match, active),
        modelId: match.a,
        providerSlug: providerSlugFromModel(match.a),
        aliases,
        active,
        won,
        lost: false,
      },
    ];
  }

  if (mode === "multi_seat") {
    const seats = battlefieldRailSeats(match, arena);
    const winner = showResult ? battlefieldWinningSeat(seats) : null;
    return seats.map((seat, index) => {
      const side = index === 0 ? "a" : index === 1 ? "b" : undefined;
      const aliases = participantAliasesForSeat(seat, index, side);
      const won = Boolean(winner && winner.seatId === seat.seatId && winner.modelId === seat.modelId);
      const active = participantIsActive(aliases, side, activeMove);
      return {
        key: seat.seatId || `seat-${index + 1}`,
        role: "seat",
        tone: "table",
        label: battlefieldSeatName(seat, index),
        title: seat.modelId ? publicModelName(seat.modelId) : "Model pending",
        subtitle: seat.modelId ? participantModelSubtitle(seat.modelId) : "Seat assignment pending",
        detail: showResult ? battlefieldSeatRailDetail(seat, won) : tableSeatHiddenDetail(arena, seat, index),
        status: showResult ? battlefieldSeatRailStatus(seat, won) : participantLiveStatus(match, active),
        modelId: seat.modelId ?? null,
        providerSlug: seat.providerSlug ?? (seat.modelId ? providerSlugFromModel(seat.modelId) : null),
        aliases,
        active,
        won,
        lost: Boolean(winner && !won),
      };
    });
  }

  const result = showResult ? match.result : undefined;
  const leftAliases = participantAliasesForModel(match.a, "a");
  const rightAliases = participantAliasesForModel(match.b, "b");
  const leftActive = participantIsActive(leftAliases, "a", activeMove);
  const rightActive = participantIsActive(rightAliases, "b", activeMove);
  return [
    {
      key: "a",
      role: "model",
      tone: "a",
      label: "Seat A",
      title: publicModelName(match.a),
      subtitle: participantModelSubtitle(match.a),
      status: result === "a" ? "winner" : participantLiveStatus(match, leftActive),
      modelId: match.a,
      providerSlug: providerSlugFromModel(match.a),
      aliases: leftAliases,
      active: leftActive,
      won: result === "a",
      lost: Boolean(result && result !== "draw" && result !== "a"),
    },
    {
      key: "b",
      role: "model",
      tone: "b",
      label: "Seat B",
      title: publicModelName(match.b),
      subtitle: participantModelSubtitle(match.b),
      status: result === "b" ? "winner" : participantLiveStatus(match, rightActive),
      modelId: match.b,
      providerSlug: providerSlugFromModel(match.b),
      aliases: rightAliases,
      active: rightActive,
      won: result === "b",
      lost: Boolean(result && result !== "draw" && result !== "b"),
    },
  ];
}

function participantLiveStatus(match: PublicBattlefieldMatch, active: boolean): string {
  if (match.status === "live") return active ? "thinking" : "waiting";
  if (match.status === "scheduled") return "scheduled";
  return "replay";
}

function battlefieldRailSeats(match: PublicBattlefieldMatch, arena: PublicBattlefieldArena): BattlefieldResultSeat[] {
  if ((match.seats?.length ?? 0) > 0) {
    return [...(match.seats ?? [])].sort((left, right) => compareBattlefieldSeatOrder(left, right, arena));
  }
  const controlledPlayers = arena.controlledPlayers?.length
    ? arena.controlledPlayers
    : fallbackControlledSeatIds(arena.defaultPlayers ?? 4);
  return controlledPlayers.map((seatId, index) => ({
    seatId,
    displayOrder: index,
    modelId: index % 2 === 0 ? match.a : match.b,
    placement: null,
    score: null,
  }));
}

function compareBattlefieldSeatOrder(left: BattlefieldResultSeat, right: BattlefieldResultSeat, arena?: PublicBattlefieldArena): number {
  const controlledOrder = new Map((arena?.controlledPlayers ?? []).map((seatId, index) => [normalizeBattlefieldActor(seatId), index]));
  const leftControlledOrder = controlledOrder.get(normalizeBattlefieldActor(left.seatId));
  const rightControlledOrder = controlledOrder.get(normalizeBattlefieldActor(right.seatId));
  const leftOrder = typeof left.displayOrder === "number" ? left.displayOrder : leftControlledOrder ?? battlefieldSeatOrder(left.seatId);
  const rightOrder = typeof right.displayOrder === "number" ? right.displayOrder : rightControlledOrder ?? battlefieldSeatOrder(right.seatId);
  return leftOrder - rightOrder || left.seatId.localeCompare(right.seatId);
}

function battlefieldSeatOrder(seatId: string): number {
  const numeric = seatId.match(/(?:player|seat|agent)[_-]?(\d+)/iu)?.[1];
  if (numeric) return Number(numeric);
  if (/_?a$/iu.test(seatId)) return 1;
  if (/_?b$/iu.test(seatId)) return 2;
  return Number.POSITIVE_INFINITY;
}

function participantAliasesForModel(modelId: string, side: "a" | "b"): readonly string[] {
  const sideNumber = side === "a" ? "1" : "2";
  return uniqueAliases([
    side,
    `player_${sideNumber}`,
    `player${sideNumber}`,
    `seat_${side}`,
    `seat_${sideNumber}`,
    `agent_${side}`,
    `agent_${sideNumber}`,
    modelId,
    publicModelName(modelId),
  ]);
}

function participantAliasesForSeat(seat: BattlefieldResultSeat, index: number, side?: "a" | "b"): readonly string[] {
  const oneBased = index + 1;
  return uniqueAliases([
    seat.seatId,
    seat.seatLabel,
    `player_${oneBased}`,
    `player${oneBased}`,
    `seat_${oneBased}`,
    `agent_${oneBased}`,
    side,
    side ? `seat_${side}` : null,
    side ? `agent_${side}` : null,
  ]);
}

function uniqueAliases(values: readonly (string | null | undefined)[]): readonly string[] {
  return Array.from(new Set(values.map(normalizeBattlefieldActor).filter((value): value is string => Boolean(value))));
}

function normalizeBattlefieldActor(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "");
  return normalized || null;
}

function participantIsActive(aliases: readonly string[], side: "a" | "b" | undefined, activeMove: ReplayMoveMeta | null): boolean {
  if (!activeMove) return false;
  const actor = normalizeBattlefieldActor(activeMove.actor);
  if (actor) return aliases.includes(actor);
  if (side && activeMove.who === side) return true;
  const activeAliases = activeAliasesForMove(activeMove);
  return aliases.some((alias) => activeAliases.has(alias));
}

function activeAliasesForMove(move: ReplayMoveMeta): Set<string> {
  const aliases = new Set<string>();
  for (const value of [move.actor, move.who]) {
    const normalized = normalizeBattlefieldActor(value);
    if (normalized) aliases.add(normalized);
  }
  if (move.who === "a") {
    for (const alias of ["player_1", "player1", "seat_a", "seat_1", "agent_a", "agent_1"]) aliases.add(alias);
  } else {
    for (const alias of ["player_2", "player2", "seat_b", "seat_2", "agent_b", "agent_2"]) aliases.add(alias);
  }
  return aliases;
}

function providerSlugFromModel(modelId: string): string {
  return modelId.split("/")[0] ?? "model";
}

function participantModelSubtitle(modelId: string): string {
  const provider = providerSlugFromModel(modelId);
  return `${modelId} - ${publicSlugLabel(provider || "model")}`;
}

function battlefieldSeatRailStatus(seat: BattlefieldResultSeat, won: boolean): string {
  if (won) return "winner";
  if (typeof seat.placement === "number") return `#${seat.placement}`;
  if (typeof seat.score === "number") return "scored";
  return "complete";
}

function battlefieldSeatRailDetail(seat: BattlefieldResultSeat, won: boolean): string {
  const details = [
    typeof seat.score === "number" ? `Score ${formatDetailNumber(seat.score)}` : null,
    typeof seat.placement === "number" ? battlefieldSeatPlacementLabel(seat, won) : null,
  ].filter((value): value is string => Boolean(value));
  return details.join(" - ") || "Result recorded";
}

function tableSeatHiddenDetail(arena: PublicBattlefieldArena, seat: BattlefieldResultSeat, index: number): string {
  return `${publicVariantLabel(arena.variant)} - ${battlefieldSeatName(seat, index)}`;
}

function battlefieldStageSubtitle(match: PublicBattlefieldMatch, arena: PublicBattlefieldArena, mode: BattlefieldRequestMode, participantCount: number): string {
  if (mode === "multi_seat") return `Table match - ${participantCount} seats - ${publicVariantLabel(arena.variant)}`;
  if (mode === "solo_benchmark") return `Solo run - ${publicVariantLabel(arena.variant)}`;
  return `${battlefieldModeDetailLabel(mode)} - ${publicVariantLabel(arena.variant)}`;
}

function battlefieldParticipantRailLabel(mode: BattlefieldRequestMode): string {
  if (mode === "multi_seat") return "Battlefield table participants";
  if (mode === "solo_benchmark") return "Battlefield solo player";
  return "Battlefield head-to-head participants";
}

function battlefieldParticipantForMove(move: ReplayMoveMeta, participants: readonly BattlefieldParticipant[]): BattlefieldParticipant | null {
  const actor = normalizeBattlefieldActor(move.actor);
  if (actor) {
    const direct = participants.find((participant) => participant.aliases.includes(actor));
    if (direct) return direct;
  }
  const activeAliases = activeAliasesForMove(move);
  return participants.find((participant) => participant.aliases.some((alias) => activeAliases.has(alias))) ?? null;
}

function battlefieldLedgerActor(move: ReplayMoveMeta, participants: readonly BattlefieldParticipant[], mode: BattlefieldRequestMode): { label: string; tone: BattlefieldParticipant["tone"] } {
  const participant = battlefieldParticipantForMove(move, participants);
  if (participant) return { label: participant.title, tone: participant.tone };
  if (mode === "solo_benchmark") return { label: "Player", tone: "a" };
  if (mode === "multi_seat") return { label: move.who === "b" ? "Seat 2" : "Seat 1", tone: move.who === "b" ? "b" : "a" };
  return { label: move.who === "b" ? "Seat B" : "Seat A", tone: move.who === "b" ? "b" : "a" };
}

function AdvantageMeter({ advantage }: { advantage: AdvantageView }) {
  return (
    <div className="bf-advantage">
      <div className="bf-section-row">
        <span className="mono">ADVANTAGE</span>
        <span className="mono">{advantage.label}</span>
      </div>
      <div className="bf-adv-bar" role="img" aria-label={advantage.label}>
        <span style={{ left: advantage.left, width: advantage.width, background: advantage.fillColor }} />
        <i />
      </div>
      {advantage.available ? (
        <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="bf-adv-trace" role="img" aria-label="Advantage over the course of the match">
          <line x1="0" y1="13" x2="100" y2="13" />
          <polyline points={advantage.tracePoints} />
          <line x1={advantage.traceX} y1="1" x2={advantage.traceX} y2="25" className="bf-adv-playhead" />
          <circle cx={advantage.traceX} cy={advantage.traceY} r="2.1" className="bf-adv-point" />
        </svg>
      ) : <div className="bf-adv-note mono">{advantage.note}</div>}
    </div>
  );
}

function ReplayTransport({
  activeMove,
  isPlaying,
  minPly,
  maxPly,
  moves,
  speed,
  visiblePly,
  onPlay,
  onSeek,
  onSpeed,
}: {
  activeMove: ReplayMoveMeta | null;
  isPlaying: boolean;
  minPly: number;
  maxPly: number;
  moves: readonly ReplayMoveMeta[];
  speed: 0.5 | 1 | 2;
  visiblePly: number;
  onPlay: () => void;
  onSeek: (ply: number, action: string) => void;
  onSpeed: () => void;
}) {
  const beatSet = useMemo(() => storyBeatSet(moves), [moves]);
  const replayTurns = useMemo(() => Array.from({ length: maxPly + 1 }, (_, ply) => ply), [maxPly]);
  return (
    <div className="bf-transport vw-controls">
      <div className="vw-btns">
        <button type="button" aria-label="Restart replay" className="vw-ctl" disabled={visiblePly <= minPly} onClick={() => onSeek(0, "restart")}><Icon name="skipBack" size={16} /></button>
        <button type="button" aria-label="Previous move" className="vw-ctl" disabled={visiblePly <= minPly} onClick={() => onSeek(visiblePly - 1, "previous")}><Icon name="chevronLeft" size={18} /></button>
        <button type="button" aria-label={isPlaying ? "Pause replay" : "Play replay"} className="vw-ctl vw-play" onClick={onPlay}><Icon name={isPlaying ? "pause" : "play"} size={18} /></button>
        <button type="button" aria-label="Next move" className="vw-ctl" disabled={visiblePly >= maxPly} onClick={() => onSeek(visiblePly + 1, "next")}><Icon name="chevronRight" size={18} /></button>
        <button type="button" aria-label="Jump to final replay state" className="vw-ctl" disabled={visiblePly >= maxPly} onClick={() => onSeek(maxPly, "skip_final")}><Icon name="skipForward" size={16} /></button>
      </div>
      <button type="button" className="bf-speed mono" aria-label={`${speed}x playback speed`} onClick={onSpeed}>{speed}x</button>
      <span className={`vw-play-caption mono ${isPlaying ? "vw-play-caption-on" : ""}`}>Step {visiblePly} of {maxPly}</span>
      {/* Hidden simultaneous moves (RPS commitments, card draws) leave the public board unchanged, so the step itself is named here. */}
      <span className="bf-step-note mono" data-testid="bf-step-note">{activeMove ? `Recorded turn ${activeMove.turnIndex ?? activeMove.ply}: ${activeMove.note}` : visiblePly >= maxPly ? "Result" : "Start"}</span>
      <input className="vw-scrub" aria-label="Replay step" aria-valuetext={`Replay step ${visiblePly} of ${maxPly}`} type="range" min={0} max={maxPly} value={visiblePly} onChange={(event) => onSeek(Number(event.target.value), "scrub")} />
      <div role="toolbar" aria-label="Replay key turns" className="bf-filmstrip">
        {replayTurns.map((ply) => (
          <button
            key={ply}
            type="button"
            aria-label={ply === 0 ? "start" : `replay step ${ply}`}
            title={ply === 0 ? "start" : `replay step ${ply}`}
            className={ply === visiblePly ? "bf-tick-current" : ply <= visiblePly ? "bf-tick-seen" : ""}
            style={{ height: beatSet.has(ply) ? 22 : 11 }}
            onClick={() => onSeek(ply, "tick_select")}
          />
        ))}
      </div>
    </div>
  );
}

function MoveLedger({
  activeMove,
  match,
  mode,
  moves,
  participants,
  selectedParticipantKey,
  visiblePly,
  onSeek,
}: {
  activeMove: ReplayMoveMeta | null;
  match: PublicBattlefieldMatch;
  mode: BattlefieldRequestMode;
  moves: readonly ReplayMoveMeta[];
  participants: readonly BattlefieldParticipant[];
  selectedParticipantKey: string | null;
  visiblePly: number;
  onSeek: (ply: number) => void;
}) {
  const hasReplayMoves = moves.length > 0;
  const list = hasReplayMoves ? moves : fallbackMoveRows(match, mode, participants).filter((move) => selectedParticipantKey === null || battlefieldParticipantForMove(move, participants)?.key === selectedParticipantKey);
  const revealPly = hasReplayMoves ? visiblePly : list.length;
  // Whole-match reasoning includes all players, but only already revealed moves.
  const revealed = list.filter((move) => move.ply <= revealPly);
  return (
    <aside className="bf-ledger" aria-label="Reasoning ledger">
      <div className="bf-ledger-head">
        <span className="mono">REASONING LEDGER</span>
        <span className="mono">{revealed.length} / {list.length} recorded moves</span>
      </div>
      <div className="bf-ledger-scroll">
        {revealed.length > 0 ? revealed.map((move) => {
          const current = move.ply === visiblePly || activeMove?.ply === move.ply;
          const streamActive = current && move.ply === visiblePly;
          const actor = battlefieldLedgerActor(move, participants, mode);
          const participant = battlefieldParticipantForMove(move, participants);
          return (
            <button key={`${move.ply}-${move.who}-${move.stateHash ?? move.note}`} type="button" className={`bf-ledger-row ${current ? "bf-ledger-current" : ""}`} onClick={() => onSeek(move.ply)}>
              <span className="mono">Recorded turn {move.turnIndex ?? move.ply}</span>
              <i className={`bf-ledger-dot bf-ledger-dot-${actor.tone}`} />
              <span>
                <strong className="mono">{actor.label} reasoning</strong>
                <span className="mono bf-ledger-action">{battlefieldActionLabel(match.game, move.note)}</span>
                {participant?.modelId ? <span className="mono bf-ledger-model">{participant.modelId}</span> : null}
                {move.reasoning ? <StreamingReasoningText key={`${move.ply}-${streamActive ? "streaming" : "settled"}`} active={streamActive} text={move.reasoning} /> : null}
              </span>
            </button>
          );
        }) : (
          <div className="bf-ledger-empty">Reasoning appears here as each move is revealed.</div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">{activeMove ? `Turn ${activeMove.turnIndex ?? activeMove.ply}, ${activeMove.note}` : ""}</div>
    </aside>
  );
}

function StreamingReasoningText({ active, text }: { active: boolean; text: string }) {
  const [visibleText, setVisibleText] = useState(active ? "" : text);

  useEffect(() => {
    if (!active) {
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      const timeout = window.setTimeout(() => setVisibleText(text), 0);
      return () => window.clearTimeout(timeout);
    }
    let index = 0;
    const interval = window.setInterval(() => {
      index = Math.min(text.length, index + 1);
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(interval);
      }
    }, 24);
    return () => window.clearInterval(interval);
  }, [active, text]);

  return (
    <em className={active ? "bf-reasoning-stream" : ""}>
      {visibleText}
      {active && visibleText.length < text.length ? <span aria-hidden="true" className="bf-reasoning-caret" /> : null}
    </em>
  );
}

function MatchInfoPanel({
  arena,
  match,
  replayStatus,
  maxPly,
  visibleFrames,
  visiblePly,
}: {
  arena: PublicBattlefieldArena;
  match: PublicBattlefieldMatch;
  replayStatus: ReplayEventsState["status"];
  maxPly: number;
  visibleFrames: number;
  visiblePly: number;
}) {
  const details = matchDetailRows(match, arena, replayStatus, visibleFrames, visiblePly, maxPly);
  return (
    <section className="bf-match-panel" id="bf-match-details" aria-label="Match details">
      <div className="bf-match-panel-title">
        <div>
          <span className="mono">MATCH DETAILS</span>
          <strong>{arena.name}</strong>
        </div>
        <span className="mono">{match.status === "completed" ? "Replay" : match.status}</span>
      </div>
      <div className="bf-match-detail-grid">
        {details.map(([key, value]) => (
          <div key={key}>
            <span className="mono">{key}</span>
            <strong className="mono">{value}</strong>
          </div>
        ))}
      </div>
      <p>Select a model to follow its reasoning, or choose Show reasoning for the whole match.</p>
    </section>
  );
}

type BattlefieldResultSeat = NonNullable<PublicBattlefieldMatch["seats"]>[number];

type BattlefieldResultOutcome = {
  readonly kind: "victory" | "draw" | "pending" | "benchmark";
  readonly tone: "win" | "draw";
  readonly kicker: string;
  readonly title: string;
  readonly detail: string;
  readonly chip: string;
  readonly winnerModelId?: string;
};

export function BattlefieldResultPanel({
  arena,
  match,
  providers,
  replayStatus,
  stage = false,
  maxPly,
  visibleFrames,
  visiblePly,
}: {
  arena: PublicBattlefieldArena;
  match: PublicBattlefieldMatch;
  providers: Map<string, PublicBattlefieldProvider>;
  replayStatus: ReplayEventsState["status"];
  stage?: boolean;
  maxPly: number;
  visibleFrames: number;
  visiblePly: number;
}) {
  const mode = battlefieldModeForResult(match, arena);
  const seats = battlefieldResultSeats(match);
  const outcome = battlefieldResultOutcome(match, arena, mode, seats);
  const details = matchDetailRows(match, arena, replayStatus, visibleFrames, visiblePly, maxPly);

  return (
    <section className={`bf-result-page result ${stage ? "bf-result-page-stage" : ""} bf-result-page-${outcome.kind}`} aria-label="Battlefield result">
      <div className={`result-banner rb-${outcome.tone}`}>
        <div className="rb-icon"><Icon name={outcome.kind === "draw" || outcome.kind === "benchmark" ? "layers" : "swords"} size={26} /></div>
        <div className="rb-text">
          <div className="bf-result-kicker mono">{outcome.kicker}</div>
          <div className="rb-title">{outcome.title}</div>
          <div className="rb-desc">{outcome.detail}</div>
        </div>
        <div className="rb-game"><span className="mono">FINAL</span>{arena.name}</div>
      </div>

      <div className="result-stats">
        {mode === "multi_seat" ? (
          <div className="bf-result-seat-list" aria-label="Table placements">
            {seats.length > 0 ? seats.map((seat, index) => {
              const isWinner = Boolean(outcome.winnerModelId && seat.modelId === outcome.winnerModelId && battlefieldSeatIsWinner(seat, seats));
              const providerSlug = seat.modelId?.split("/")[0] ?? "";
              return (
                <div key={seat.seatId} className={`bf-result-seat-row ${isWinner ? "bf-result-seat-winner" : ""}`}>
                  <span className="mono">{battlefieldSeatPlacementLabel(seat, isWinner)}</span>
                  <strong>{battlefieldSeatName(seat, index)}</strong>
                  <span className="bf-result-seat-model">
                    {seat.modelId ? <ProviderDot provider={providerSlug} providers={providers} size={18} /> : null}
                    <span className="mono">{seat.modelId ?? "Model pending"}</span>
                  </span>
                  <span className="mono">{typeof seat.score === "number" ? `Score ${seat.score}` : "Score pending"}</span>
                </div>
              );
            }) : <div className="bf-result-note">Placements and score details are still processing.</div>}
          </div>
        ) : mode === "solo_benchmark" ? (
          <div className="rs-vs bf-result-vs bf-result-vs-solo">
            <ModelBadge id={match.a} providers={providers} size={13} />
            <span className={`reschip reschip-${outcome.tone}`}>{outcome.chip}</span>
          </div>
        ) : (
          <div className="rs-vs bf-result-vs">
            <ModelBadge id={match.a} providers={providers} size={13} />
            <span className={`reschip reschip-${outcome.tone}`}>{outcome.chip}</span>
            <ModelBadge id={match.b} providers={providers} size={13} />
          </div>
        )}
        <div className="rs-grid bf-result-stat-grid">
          {details.map(([key, value]) => (
            <div key={key} className="rs-cell">
              <span className="rs-l">{key}</span>
              <span className="mono rs-v">{value}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

function hasBattlefieldResult(match: PublicBattlefieldMatch, arena: PublicBattlefieldArena): boolean {
  const mode = battlefieldModeForResult(match, arena);
  if (mode === "solo_benchmark") return true;
  if (mode === "multi_seat") return battlefieldResultSeats(match).length > 0 || Boolean(match.result);
  return match.status === "completed" || Boolean(match.result);
}

function battlefieldModeForResult(match: PublicBattlefieldMatch, arena: PublicBattlefieldArena): BattlefieldRequestMode {
  if (arena.battlefieldMode) return arena.battlefieldMode;
  if ((match.seats?.length ?? 0) > 2) return "multi_seat";
  return "head_to_head";
}

function battlefieldResultOutcome(
  match: PublicBattlefieldMatch,
  arena: PublicBattlefieldArena,
  mode: BattlefieldRequestMode,
  seats: readonly BattlefieldResultSeat[],
): BattlefieldResultOutcome {
  if (mode === "solo_benchmark") {
    const score = typeof match.gameEloA === "number" ? `Score ${match.gameEloA}` : "Score processed";
    return {
      kind: "benchmark",
      tone: "draw",
      kicker: "Benchmark result",
      title: `${publicModelName(match.a)} completed`,
      detail: `${arena.name} solo benchmark - ${score}.`,
      chip: "RESULT",
      winnerModelId: match.a,
    };
  }

  if (mode === "multi_seat") {
    const winner = battlefieldWinningSeat(seats);
    if (!winner?.modelId) {
      return {
        kind: "pending",
        tone: "draw",
        kicker: "Table result",
        title: match.result === "draw" ? "Draw" : "No winner recorded",
        detail: `${arena.name} recorded placements and scores do not establish a winner.`,
        chip: match.result === "draw" ? "DRAW" : "RESULT",
      };
    }
    return {
      kind: "victory",
      tone: "win",
      kicker: "Table result",
      title: `${publicModelName(winner.modelId)} wins`,
      detail: `${battlefieldSeatName(winner, 0)} - ${battlefieldSeatScoreLabel(winner)}.`,
      chip: "WIN",
      winnerModelId: winner.modelId,
    };
  }

  if (match.result === "draw") {
    return {
      kind: "draw",
      tone: "draw",
      kicker: "Match result",
      title: "Draw",
      detail: `${publicModelName(match.a)} and ${publicModelName(match.b)} tied.`,
      chip: "DRAW",
    };
  }

  if (match.result === "a" || match.result === "b") {
    const winner = match.result === "a" ? match.a : match.b;
    const opponent = match.result === "a" ? match.b : match.a;
    return {
      kind: "victory",
      tone: "win",
      kicker: "Match result",
      title: `${publicModelName(winner)} wins`,
      detail: `Defeated ${publicModelName(opponent)} in ${arena.name}.`,
      chip: "WIN",
      winnerModelId: winner,
    };
  }

  return {
    kind: "pending",
    tone: "draw",
    kicker: "Match result",
    title: "No winner recorded",
    detail: "The replay is complete, but no explicit winner or draw was recorded.",
    chip: "RESULT",
  };
}

function battlefieldResultSeats(match: PublicBattlefieldMatch): BattlefieldResultSeat[] {
  return [...(match.seats ?? [])].sort((left, right) => {
    const leftPlacement = left.placement ?? Number.POSITIVE_INFINITY;
    const rightPlacement = right.placement ?? Number.POSITIVE_INFINITY;
    if (leftPlacement !== rightPlacement) return leftPlacement - rightPlacement;
    return left.seatId.localeCompare(right.seatId);
  });
}

function battlefieldWinningSeat(seats: readonly BattlefieldResultSeat[]): BattlefieldResultSeat | null {
  return recordedWinnerSeat(seats);
}

function battlefieldSeatIsWinner(seat: BattlefieldResultSeat, seats: readonly BattlefieldResultSeat[]): boolean {
  const winner = battlefieldWinningSeat(seats);
  return Boolean(winner && winner.seatId === seat.seatId && winner.modelId === seat.modelId);
}

function battlefieldSeatName(seat: BattlefieldResultSeat, index: number): string {
  if (seat.seatLabel) return seat.seatLabel;
  if (seat.seatId.startsWith("player_")) return `Seat ${seat.seatId.slice("player_".length)}`;
  if (seat.seatId) return publicSlugLabel(seat.seatId);
  return `Seat ${index + 1}`;
}

function battlefieldSeatPlacementLabel(seat: BattlefieldResultSeat, isWinner: boolean): string {
  if (typeof seat.placement === "number") return isWinner ? `#${seat.placement} winner` : `#${seat.placement}`;
  return isWinner ? "Winner" : "Placement pending";
}

function battlefieldSeatScoreLabel(seat: BattlefieldResultSeat): string {
  return typeof seat.score === "number" ? `Score ${seat.score}` : "top score";
}

function matchDetailRows(
  match: PublicBattlefieldMatch,
  arena: PublicBattlefieldArena,
  replayStatus: ReplayEventsState["status"],
  visibleFrames: number,
  visiblePly: number,
  maxPly: number,
): readonly (readonly [string, string])[] {
  const mode = battlefieldModeForResult(match, arena);
  return [
    ["RESULT", matchResultDetailLabel(match, arena, mode)],
    ["FORMAT", battlefieldModeDetailLabel(mode)],
    ["VARIANT", publicVariantLabel(arena.variant)],
    ["PLAYBACK", maxPly > 0 ? `replay step ${visiblePly} of ${maxPly}` : "preparing"],
    ["REPLAY", match.replayStatus ? replayStatusLabel(match.replayStatus) : replayAvailabilityLabel(visibleFrames > 0, visibleFrames, replayStatus)],
    ["PROOF", matchProofDetailLabel(match)],
    [matchTimingDetailKey(match), match.started],
  ];
}

function matchResultDetailLabel(match: PublicBattlefieldMatch, arena: PublicBattlefieldArena, mode: BattlefieldRequestMode): string {
  if (match.status === "live") return typeof match.turn === "number" ? `In play - turn ${match.turn}` : "In play";
  if (match.status === "scheduled") return "Queued";
  if (mode === "solo_benchmark") return typeof match.gameEloA === "number" ? `Score ${formatDetailNumber(match.gameEloA)}` : "Completed";
  if (mode === "multi_seat") {
    const winner = battlefieldWinningSeat(battlefieldResultSeats(match));
    if (winner?.modelId) return `${publicModelName(winner.modelId)} wins`;
    if (match.result === "draw") return "Draw";
    return "Placements ready";
  }
  if (match.result === "a") return `${publicModelName(match.a)} wins`;
  if (match.result === "b") return `${publicModelName(match.b)} wins`;
  if (match.result === "draw") return "Draw";
  return hasBattlefieldResult(match, arena) ? "Completed" : "Processing";
}

function battlefieldModeDetailLabel(mode: BattlefieldRequestMode): string {
  if (mode === "solo_benchmark") return "Solo run";
  if (mode === "multi_seat") return "Table match";
  return "Head to head";
}

function matchProofDetailLabel(match: PublicBattlefieldMatch): string {
  if (match.replayStatus === "verified") {
    return match.artifactId ? `Verified artifact ${shortArtifact(match.artifactId)}` : "Verified public proof";
  }
  if (match.artifactId) {
    const signature = match.signatureStatus ? publicSlugLabel(match.signatureStatus) : "Signed";
    return `${signature} artifact ${shortArtifact(match.artifactId)}`;
  }
  if (match.replayStatus === "public-safe" || match.replayStatus === "public") return "Public replay proof";
  if (match.replayId) return "Replay proof syncing";
  if (match.status === "scheduled") return "Proof after match";
  if (match.status === "live") return "Live proof syncing";
  return "Proof unavailable";
}

function matchTimingDetailKey(match: PublicBattlefieldMatch): string {
  if (match.status === "completed") return "PLAYED";
  if (match.status === "scheduled") return "QUEUED";
  return "STARTED";
}

function formatDetailNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function NoReplayTimeline({ match, arena, replayStatus, visibleFrames, onRetry }: { match: PublicBattlefieldMatch; arena: PublicBattlefieldArena; replayStatus: ReplayEventsState["status"]; visibleFrames: number; onRetry: () => void }) {
  const preparing = Boolean(match.replayId) && replayStatus !== "error";
  return (
    <div className={`bf-no-replay vw-proof-board ${preparing ? "bf-no-replay-loading" : ""}`}>
      <div className="bf-no-preview" aria-hidden="true">
        <div className="bf-loading-visual" data-loading-game={arena.slug}>
          <Board frame={placeholderFrame(arena.slug)} label={`${arena.name} replay awaiting publication`} />
        </div>
      </div>
      <div className="bf-no-replay-copy" role="status" aria-live="polite">
        {preparing ? <span className="bf-loading-spinner" aria-hidden="true" /> : null}
        <span className="bf-no-replay-message">
          <strong>{replayStatus === "error" ? "Could not load the replay" : preparing ? "Preparing replay" : replayAvailabilityLabel(false, visibleFrames, replayStatus)}</strong>
          <span>{replayStatus === "error" ? "Check your connection and try again." : preparing ? `The ${arena.name} public replay is awaiting publication.` : `The ${arena.name} replay will appear here when it is published.`}</span>
        </span>
      </div>
      {replayStatus === "error" ? <button type="button" className="btn btn-ghost" onClick={onRetry}>Retry replay</button> : null}
    </div>
  );
}

function EmptyMatchStage({ message }: { message: string }) {
  return <div className="bf-stage-shell bf-empty-stage" role="status"><div><h2>No replay ready</h2><p>{message}</p></div></div>;
}

function MarqueeSection({ catalog, matches, now, selectedId, onSelect }: {
  catalog: BattlefieldCatalogView; matches: readonly PublicBattlefieldMatch[];
  now?: number | undefined;
  selectedId: string; onSelect: (match: PublicBattlefieldMatch) => void;
}) {
  const posters = selectWorthWatchingMatches(matches, catalog, 12);
  return (
    <section className="bf-marquee" aria-label="Worth watching">
      <div className="bf-section-title"><span className="mono">THE MARQUEE</span><h2>Worth watching</h2><p>Choose a match.</p></div>
      <div className="bf-poster-grid">
        {posters.map((match) => {
          const arena = catalog.arenaBySlug.get(match.game) ?? catalog.firstArena;
          return (
            <button key={match.id} type="button" aria-pressed={selectedId === match.id} className={`bf-poster matchcard ${selectedId === match.id ? "bf-poster-active" : ""}`} onClick={() => onSelect(match)}>
              <div className="bf-poster-art"><MatchPreview game={arena.slug} gameName={arena.name} /></div>
              <div className="bf-poster-copy">
                <div className="bf-poster-top"><strong>{arena.name}</strong><span className="bf-poster-status">{match.status === "live" ? <LiveDot /> : match.startedAt ? <StadiumDate value={match.startedAt} now={now} /> : "Date unavailable"}</span></div>
                <p className="bf-poster-models">{publicModelName(match.a)}{battlefieldModeForResult(match, arena) !== "solo_benchmark" ? ` vs ${publicModelName(match.b)}` : ""}</p>
                <p className="bf-poster-status">{hasPlayablePublicReplayStream(match) ? matchResultSummary(match) : "Replay awaiting publication"}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProgrammeSection({
  catalog,
  matchRows,
  list,
  state,
  gamesInPlay,
  modelOptions,
  emptyMessage,
  onAction,
  onSelect,
}: {
  catalog: BattlefieldCatalogView;
  matchRows: readonly PublicBattlefieldMatch[];
  list: readonly PublicBattlefieldMatch[];
  state: BattlefieldUrlState;
  gamesInPlay: readonly string[];
  modelOptions: readonly SelectOption[];
  emptyMessage: string;
  onAction: Dispatch<BattlefieldPageAction>;
  onSelect: (match: PublicBattlefieldMatch) => void;
}) {
  const [open, setOpen] = useState(true);
  const [outcome,setOutcome] = useState("all");
  const [date,setDate] = useState("");
  const [visibleDays, showEarlierDays] = useReducer((count: number) => count + 3, 3);
  const programmeDays = new Map<string, PublicBattlefieldMatch[]>();
  const soloRuns: PublicBattlefieldMatch[] = [];
  for (const match of [...list].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))) {
    if (outcome === "draw" && match.result !== "draw" || outcome === "decisive" && !["a","b"].includes(match.result ?? "")) continue;
    if (date && (!match.startedAt || new Date(match.startedAt).toISOString().slice(0,10) !== date)) continue;
    if (battlefieldModeForResult(match, catalog.arenaBySlug.get(match.game) ?? catalog.firstArena) === "solo_benchmark") { soloRuns.push(match); continue; }
    const day = match.startedAt ? formatAbsoluteDate(match.startedAt) : "Date unavailable";
    const rows = programmeDays.get(day) ?? [];
    rows.push(match); programmeDays.set(day, rows);
  }
  function programmeRow(match: PublicBattlefieldMatch) {
    const arena = catalog.arenaBySlug.get(match.game) ?? catalog.firstArena;
    const solo = battlefieldModeForResult(match, arena) === "solo_benchmark";
    return <button key={match.id} type="button" className="bf-programme-row matchcard" onClick={() => onSelect(match)}>
      <span className="mono bf-programme-status">{match.status === "live" ? <LiveDot /> : match.status === "completed" ? "FINAL" : "QUEUED"}</span>
      <span><strong>{arena.name}</strong></span>
      <span>{publicModelName(match.a)}{!solo ? <><em className="mono"> vs </em>{publicModelName(match.b)}</> : null}</span>
      <span className="mono">{matchResultSummary(match)}</span>
      <span className="bf-watch-chip">{hasPlayablePublicReplayStream(match) || match.status === "live" ? "Watch" : "Details"}</span>
    </button>;
  }
  return (
    <section className="bf-programme wrap" aria-label="All Battlefield matches">
      <div className="bf-programme-card">
        <button type="button" className="bf-programme-head" onClick={() => setOpen((value) => !value)}>
          <span>The programme</span>
          <span className="mono">{matchRows.length} matches</span>
          <i />
          <span className="mono">{open ? "collapse" : "see all matches"}</span>
        </button>
        {open ? (
          <div className="bf-programme-body">
            <div className="bf-programme-tools">
              <div className="tabs bf-status-tabs">
                {matchStatusValues.map((status) => (
                  <button key={status} type="button" className={state.tab === status ? "active" : ""} onClick={() => onAction({ type: "tab", value: status })}>
                    {status === "completed" ? "Recent" : status === "live" ? "Live" : "Scheduled"} <span className="bf-tabcount mono">{battlefieldTabCount(matchRows, status, state)}</span>
                  </button>
                ))}
              </div>
              <Select label="Filter battlefield games" value={state.gameFilter} onChange={(value) => onAction({ type: "gameFilter", value })} options={[["all", "All games"], ...gamesInPlay.map((slug) => [slug, catalog.arenaBySlug.get(slug)?.name ?? slug] as const)]} />
              <Select label="Filter battlefield models" value={state.modelFilter} onChange={(value) => onAction({ type: "modelFilter", value })} options={modelOptions} />
            </div>
            <div className="bf-programme-secondary-tools"><Select label="Filter battlefield outcomes" value={outcome} onChange={setOutcome} options={[["all","All outcomes"],["decisive","Decisive matches"],["draw","Draws"]]} /><label>Match date<input type="date" value={date} onChange={(event) => setDate(event.currentTarget.value)} /></label>{date || outcome !== "all" ? <button type="button" onClick={() => {setDate("");setOutcome("all");}}>Clear outcome and date</button> : null}</div>
            <div className="bf-programme-rows">
              {[...programmeDays].slice(0, visibleDays).map(([day, rows]) => <section key={day} className="bf-programme-day"><h3 className="mono">{day} <span>{rows.length} {rows.length === 1 ? "match" : "matches"}</span></h3>{rows.map(programmeRow)}</section>)}
              {programmeDays.size > visibleDays ? <button type="button" className="bf-earlier-days" onClick={showEarlierDays}>Earlier days</button> : null}
              {soloRuns.length ? <section className="bf-programme-day bf-solo-runs"><h3 className="mono">Solo runs <span>{soloRuns.length} runs</span></h3>{soloRuns.map(programmeRow)}</section> : null}
              {programmeDays.size === 0 && soloRuns.length === 0 ? <div className="bf-empty mono">{date || outcome !== "all" ? "No matches fit these filters. Try a different date or outcome." : emptyMessage}</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RequestMatch({ catalog }: { catalog: BattlefieldCatalogView }) {
  const [open, setOpen] = useState(false);
  const requestableArenas = catalog.arenas;
  const firstReadyGame = requestableArenas.find((arena) => catalog.requestModels.some((model) => model.allowedGames.includes(arena.slug))) ?? catalog.firstArena;
  const firstModel = firstBattlefieldRequestModelForGame(firstReadyGame?.slug ?? "tic-tac-toe", catalog)?.id ?? "";
  const [state, dispatch] = useReducer((current: { game: string; modelA: string; modelB: string }, action: RequestMatchAction) => requestMatchReducer(current, action, catalog), {
    game: firstReadyGame?.slug ?? "tic-tac-toe",
    modelA: firstModel,
    modelB: firstBattlefieldRequestModelForGame(firstReadyGame?.slug ?? "tic-tac-toe", catalog, firstModel)?.id ?? firstModel,
  });
  const [submission, setSubmission] = useState<
    | { status: "idle"; message: string }
    | { status: "submitting"; message: string }
    | { status: "success"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle", message: "" });
  const modelAReady = isBattlefieldModelAllowedForGame(state.modelA, state.game, catalog);
  const modelBReady = isBattlefieldModelAllowedForGame(state.modelB, state.game, catalog);
  const selectedArena = catalog.arenaBySlug.get(state.game) ?? null;
  const selectedVariantSlug = selectedArena?.variant ?? "standard";
  const selectedVariantLabel = publicVariantLabel(selectedVariantSlug);
  const requestMode = battlefieldRequestModeForArena(selectedArena);
  const needsModelB = requestMode !== "solo_benchmark";
  const pairReady = modelAReady && (!needsModelB || (modelBReady && state.modelA !== state.modelB));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackEvent("battlefield_request_submit", {
      game_slug: state.game,
      model_a_provider: modelProviderFromId(state.modelA),
      model_b_provider: needsModelB ? modelProviderFromId(state.modelB) : "solo",
      battlefield_mode: requestMode,
      pair_ready: pairReady,
    });
    if (!state.modelA || (needsModelB && (!state.modelB || state.modelA === state.modelB))) {
      setSubmission({ status: "error", message: needsModelB ? "Choose two different requestable models." : "Choose a requestable model." });
      return;
    }
    if (!modelAReady || (needsModelB && !modelBReady)) {
      setSubmission({ status: "error", message: "This game/model pairing is coming soon. Choose one of the supported models for this game." });
      return;
    }
    const requestBody = battlefieldRequestBody({
      arena: selectedArena,
      arenaSlug: state.game,
      modelAId: state.modelA,
      modelBId: state.modelB,
      requestedBattlefieldMode: requestMode,
      variantSlug: selectedVariantSlug,
    });
    setSubmission({ status: "submitting", message: "Submitting request..." });
    try {
      const { response, body: parsed } = await fetchJsonWithTimeout("/api/match-requests", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body = parsed as { ok?: boolean; data?: { request?: { existing: boolean; requestCount: number } }; error?: { message: string } } | null;
      if (body?.ok && body.data?.request) {
        const { request } = body.data;
        setSubmission({ status: "success", message: request.existing ? `Already queued. Request count ${request.requestCount}.` : "Booked. It appears in Battlefield when the public replay is ready." });
        return;
      }
      if (response.status === 401) {
        invalidateAccountSession();
        setSubmission({ status: "error", message: "Sign in to request a Battlefield match." });
        return;
      }
      const retryAfter = response.headers.get("retry-after");
      setSubmission({ status: "error", message: response.status === 429
        ? `Too many match requests.${retryAfter && /^\d+$/u.test(retryAfter) ? ` Try again in ${retryAfter} seconds.` : " Please wait before trying again."}`
        : body?.error?.message ?? "Match requests are temporarily unavailable. Please try again." });
    } catch (error) {
      setSubmission({ status: "error", message: requestFailureMessage(error, "Could not reach the match service. Check your connection and try again.") });
    }
  }

  return (
    <section className="bf-boxoffice wrap" id="boxoffice" aria-label="Request a match">
      <button type="button" className="bf-boxoffice-door btn btn-secondary" onClick={() => setOpen(true)}>Request a match <Icon name="arrowRight" /></button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Request a match" description="Choose a game and the models. Your request joins the queue.">
      <form className="bf-boxoffice-card" onSubmit={submit}>
        <div className="bf-boxoffice-fields">
          <Select showLabel label="Game" value={state.game} onChange={(value) => dispatch({ type: "game", value })} options={requestableArenas.map((arena) => [arena.slug, arena.name] as const)} />
          <Select showLabel label="Variant" value={selectedVariantSlug} onChange={() => {}} options={[[selectedVariantSlug, selectedVariantLabel]]} />
          <Select showLabel label={needsModelB ? "Model A" : "Model"} value={state.modelA} onChange={(value) => dispatch({ type: "modelA", value })} options={catalog.requestModels.map((model) => [model.id, battlefieldRequestOptionLabel(model, state.game), { disabled: !model.allowedGames.includes(state.game) }] as const)} />
          {needsModelB ? (
            <>
              <Select showLabel label="Model B" value={state.modelB} onChange={(value) => dispatch({ type: "modelB", value })} options={catalog.requestModels.map((model) => [model.id, battlefieldRequestOptionLabel(model, state.game), { disabled: !model.allowedGames.includes(state.game) }] as const)} />
            </>
          ) : null}
          <button type="submit" aria-describedby="bf-request-status" disabled={submission.status === "submitting" || !pairReady}>Book it</button>
        </div>
        <div id="bf-request-status" className={`bf-boxoffice-status mono bf-boxoffice-${submission.status}`} role="status">
          {submission.message || (pairReady ? battlefieldRequestReadyMessage(requestMode) : needsModelB && state.modelA === state.modelB ? "Choose two different models." : "This game/model pairing is coming soon.")}
        </div>
        {submission.status === "error" && submission.message.startsWith("Sign in") ? <Link className="bf-signin-link" href="/login?next=/battlefield">Sign in</Link> : null}
      </form>
      </Sheet>
    </section>
  );
}

function battlefieldPageReducer(state: BattlefieldUrlState, action: BattlefieldPageAction): BattlefieldUrlState {
  switch (action.type) {
    case "hydrate":
      return action.value;
    case "tab":
      return state.tab === action.value ? state : { ...state, tab: action.value, selected: "", targetTurn: null, invalidRequestedTurn: false };
    case "gameFilter":
      return state.gameFilter === action.value ? state : { ...state, gameFilter: action.value, selected: "", targetTurn: null, invalidRequestedTurn: false };
    case "modelFilter":
      return state.modelFilter === action.value ? state : { ...state, modelFilter: action.value, selected: "", targetTurn: null, invalidRequestedTurn: false };
    case "selected":
      return state.selected === action.value ? state : { ...state, selected: action.value, targetTurn: null, invalidRequestedTurn: false };
  }
}

function buildCatalogView(catalog: PublicBattlefieldCatalog): BattlefieldCatalogView {
  const fallbackArena: PublicBattlefieldArena = { slug: "tic-tac-toe", name: "Tic-Tac-Toe", category: "Board", variant: "standard", battlefieldMode: "head_to_head", controlledPlayers: ["player_1", "player_2"], defaultPlayers: 2 };
  return {
    arenas: catalog.arenas.length > 0 ? catalog.arenas : [fallbackArena],
    firstArena: catalog.arenas[0] ?? fallbackArena,
    arenaBySlug: new Map(catalog.arenas.map((arena) => [arena.slug, arena])),
    providerBySlug: new Map(catalog.providers.map((provider) => [provider.slug, provider])),
    requestModelById: new Map(catalog.requestModels.map((model) => [model.id, model])),
    requestModels: catalog.requestModels,
    requestModelIds: new Set(catalog.requestModels.map((model) => model.id)),
  };
}

function battlefieldStateFromSearchParams(params: PublicSearchParamsInput, matchRows: readonly PublicBattlefieldMatch[], catalog: BattlefieldCatalogView): BattlefieldUrlState {
  const gameParam = firstParam(params, "game") ?? firstParam(params, "arena");
  const modelParam = normalizeModelParam(firstParam(params, "model") ?? firstParam(params, "agent"));
  const matchParam = firstParam(params, "match") ?? firstParam(params, "matchId");
  const statusParam = firstParam(params, "status") ?? firstParam(params, "tab");
  const gamesInRows = new Set(matchRows.map((match) => match.game));
  const modelsInRows = modelsInBattlefieldRows(matchRows);
  const gameFilter = gameParam && (gamesInRows.has(gameParam) || catalog.arenaBySlug.has(gameParam)) ? gameParam : "all";
  const modelFilter = modelParam && isPublicBattlefieldModelId(modelParam, catalog) && (modelsInRows.has(modelParam) || catalog.requestModelIds.has(modelParam) || isSafeModelId(modelParam)) ? modelParam : "all";
  const filteredBeforeStatus = matchRows.filter((match) => battlefieldMatchMatchesFilters(match, gameFilter, modelFilter));
  const requestedMatch = matchRows.find((match) => match.id === matchParam);
  const tab = requestedMatch?.status ?? (isMatchStatus(statusParam)
    ? statusParam
    : firstAvailableStatus(filteredBeforeStatus) ?? firstAvailableStatus(matchRows) ?? "scheduled");
  const list = filteredBeforeStatus.filter((match) => match.status === tab);
  const selectedFromParam = matchParam;
  return {
    tab,
    gameFilter,
    modelFilter,
    selected: selectedFromParam ?? selectPreferredBattlefieldMatch(list)?.id ?? "",
    targetTurn: nonNegativeIntegerParam(params, "turn"),
    invalidRequestedTurn: firstParam(params, "turn") !== null && nonNegativeIntegerParam(params, "turn") === null,
  };
}

function selectPreferredBattlefieldMatch(matchRows: readonly PublicBattlefieldMatch[]): PublicBattlefieldMatch | undefined {
  const newest = [...matchRows].sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  return newest.find((match) => match.status === "live") ?? newest.find(hasPlayablePublicReplayStream);
}

function selectWorthWatchingMatches(matches: readonly PublicBattlefieldMatch[], _catalog: BattlefieldCatalogView, limit: number): PublicBattlefieldMatch[] {
  return [...matches].sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || (b.startedAt ?? 0) - (a.startedAt ?? 0)).slice(0, limit);
}

function battlefieldMatchesForState(matchRows: readonly PublicBattlefieldMatch[], state: Pick<BattlefieldUrlState, "tab" | "gameFilter" | "modelFilter">): PublicBattlefieldMatch[] {
  return matchRows.filter((match) => match.status === state.tab && battlefieldMatchMatchesFilters(match, state.gameFilter, state.modelFilter));
}

function battlefieldTabCount(matchRows: readonly PublicBattlefieldMatch[], status: PublicBattlefieldMatch["status"], state: Pick<BattlefieldUrlState, "gameFilter" | "modelFilter">): number {
  return matchRows.filter((match) => match.status === status && battlefieldMatchMatchesFilters(match, state.gameFilter, state.modelFilter)).length;
}

function battlefieldFilterModelOptions(matchRows: readonly PublicBattlefieldMatch[], selectedModel: string, catalog: BattlefieldCatalogView): Array<readonly [string, string]> {
  const ids = new Set<string>();
  for (const match of matchRows) {
    for (const modelId of battlefieldMatchModelIds(match)) {
      if (isPublicBattlefieldModelId(modelId, catalog)) ids.add(modelId);
    }
  }
  for (const model of catalog.requestModels) ids.add(model.id);
  if (selectedModel !== "all" && isPublicBattlefieldModelId(selectedModel, catalog)) ids.add(selectedModel);
  return [["all", "All models"], ...Array.from(ids).sort().map((id) => [id, id] as const)];
}

function battlefieldMatchMatchesFilters(match: PublicBattlefieldMatch, gameFilter: string, modelFilter: string): boolean {
  return (gameFilter === "all" || match.game === gameFilter) && (modelFilter === "all" || battlefieldMatchModelIds(match).includes(modelFilter));
}

function hasPlayablePublicReplayStream(match: PublicBattlefieldMatch): boolean {
  if (!match.replayId || !["public-safe", "public", "verified"].includes(match.replayStatus ?? "")) return false;
  if (match.source !== "battlefield-smoke" && match.evidenceSource !== "battlefield-smoke") return true;
  return typeof match.replayEventCount === "number" && match.replayEventCount > 1;
}

function firstAvailableStatus(matchRows: readonly PublicBattlefieldMatch[]): PublicBattlefieldMatch["status"] | null {
  return matchStatusValues.find((status) => matchRows.some((match) => match.status === status)) ?? null;
}

function modelsInBattlefieldRows(matchRows: readonly PublicBattlefieldMatch[]): Set<string> {
  const ids = new Set<string>();
  for (const match of matchRows) {
    for (const modelId of battlefieldMatchModelIds(match)) {
      ids.add(modelId);
    }
  }
  return ids;
}

function battlefieldMatchModelIds(match: PublicBattlefieldMatch): readonly string[] {
  return Array.from(new Set([match.a, match.b, ...(match.seats ?? []).map((seat) => seat.modelId).filter((modelId): modelId is string => Boolean(modelId))]));
}

function isPublicBattlefieldModelId(id: string, catalog: BattlefieldCatalogView): boolean {
  if (id.startsWith("agent/seat-")) return false;
  if (id.startsWith("arena/")) return false;
  return catalog.requestModelIds.has(id) || isSafeModelId(id);
}

function useBattlefieldLiveMatch(match: PublicBattlefieldMatch): LiveMatchState {
  const shouldStream = match.status === "live" && match.source === "d1";
  const [live, dispatchLive] = useReducer(liveMatchReducer, match, initialLiveState);

  useEffect(() => {
    dispatchLive({ type: "reset", next: initialLiveStateForStream(shouldStream) });
    if (!shouldStream) return;
    const url = new URL(`/api/matches/${encodeURIComponent(match.id)}/live`, window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url);
    const handleOpen = () => dispatchLive({ type: "status", status: "connected" });
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      const payload = parseLivePayload(event.data);
      if (payload) dispatchLive({ type: "payload", payload, gameSlug: match.game });
    };
    const handleError = () => dispatchLive({ type: "status", status: "error" });
    const handleClose = () => dispatchLive({ type: "status", status: "closed" });
    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("error", handleError);
    socket.addEventListener("close", handleClose);
    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("error", handleError);
      socket.removeEventListener("close", handleClose);
      socket.close();
    };
  }, [match.game, match.id, shouldStream]);

  return live;
}

function liveMatchReducer(state: LiveMatchState, action: LiveMatchAction): LiveMatchState {
  if (action.type === "reset") return action.next;
  if (action.type === "status") return { ...state, status: action.status };
  const board = boardFromLivePayload(action.payload, action.gameSlug);
  const updatedAt = liveUpdatedAt(action.payload);
  return {
    status: "connected",
    eventCount: state.eventCount + (action.payload.type === "snapshot" ? 0 : 1),
    board: board ?? state.board,
    updatedAt: updatedAt ?? state.updatedAt,
  };
}

function initialLiveState(match: PublicBattlefieldMatch): LiveMatchState {
  return initialLiveStateForStream(match.status === "live" && match.source === "d1");
}

function initialLiveStateForStream(shouldStream: boolean): LiveMatchState {
  return { status: shouldStream ? "connecting" : "idle", eventCount: 0, board: null, updatedAt: null };
}

function parseLivePayload(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function boardFromLivePayload(payload: Record<string, unknown>, gameSlug: string): string[] | null {
  try {
    const event = parsePublicReplayEventRow(payload, 0);
    const timeline = buildPublicReplayTimeline(gameSlug, [event]);
    const frame = timeline.frames.find((item) => item.board && item.board.length > 0);
    return frame?.board ? normalizePublicReplayBoard(frame.board, gameSlug) : null;
  } catch {
    return null;
  }
}

function liveUpdatedAt(payload: Record<string, unknown>): number | null {
  const value = payload.createdAt ?? payload.updatedAt;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function liveReplay(gameSlug: string, board: string[]): ReplayState {
  if (gameSlug === "tic-tac-toe" && board.length === 9) {
    return { kind: "ttt", states: [Array(9).fill("") as string[], board], meta: [{ ply: 1, who: "a", note: "live state", visible: boardHasVisibleState(board) }] };
  }
  if (gameSlug === "connect-four" && board.length === 42) {
    return { kind: "c4", states: [Array(42).fill("") as string[], board], meta: [{ ply: 1, who: "a", note: "live state", visible: boardHasVisibleState(board) }] };
  }
  if (board.length === 0) return { kind: "static", meta: [] };
  const renderer = replayRendererForGame(gameSlug);
  const emptyBoard = Array.from({ length: board.length }, () => "");
  return {
    kind: "visual",
    renderer,
    frames: [liveReplayFrame("live-start", emptyBoard, renderer.rows, renderer.cols, 0), liveReplayFrame("live-state", board, renderer.rows, renderer.cols, 1)],
    meta: [{ ply: 1, turnIndex: 1, who: "a", note: "live state", visible: boardHasVisibleState(board), stateHash: null }],
  };
}

function liveReplayFrame(id: string, board: string[], rows: number, cols: number, index: number): PublicReplayFrame {
  return { index, id, type: "live.state", player: null, action: null, legalActions: [], reasoning: null, terminal: false, stateHash: null, scores: {}, board, rows, cols, hasVisibleState: boardHasVisibleState(board) };
}

type RequestMatchAction =
  | { type: "game"; value: string }
  | { type: "modelA"; value: string }
  | { type: "modelB"; value: string };

function requestMatchReducer(current: { game: string; modelA: string; modelB: string }, action: RequestMatchAction, catalog: BattlefieldCatalogView) {
  if (action.type === "game") {
    const modelA = isBattlefieldModelAllowedForGame(current.modelA, action.value, catalog)
      ? current.modelA
      : firstBattlefieldRequestModelForGame(action.value, catalog)?.id ?? current.modelA;
    const modelB = isBattlefieldModelAllowedForGame(current.modelB, action.value, catalog) && current.modelB !== modelA
      ? current.modelB
      : firstBattlefieldRequestModelForGame(action.value, catalog, modelA)?.id ?? current.modelB;
    return { ...current, game: action.value, modelA, modelB };
  }
  if (action.type === "modelA") return { ...current, modelA: action.value };
  return { ...current, modelB: action.value };
}

function battlefieldRequestModeForArena(arena: PublicBattlefieldArena | null): BattlefieldRequestMode {
  return arena?.battlefieldMode ?? "head_to_head";
}

function battlefieldRequestBody(input: {
  readonly arena: PublicBattlefieldArena | null;
  readonly arenaSlug: string;
  readonly variantSlug: string;
  readonly modelAId: string;
  readonly modelBId: string;
  readonly requestedBattlefieldMode: BattlefieldRequestMode;
}): Record<string, unknown> {
  const base = {
    arenaSlug: input.arenaSlug,
    variantSlug: input.variantSlug,
    requestedMatchType: "platformmatch",
    requestedBattlefieldMode: input.requestedBattlefieldMode,
  } as const;
  if (input.requestedBattlefieldMode === "solo_benchmark") {
    return { ...base, modelAId: input.modelAId };
  }
  if (input.requestedBattlefieldMode === "multi_seat") {
    const controlledPlayers = input.arena?.controlledPlayers?.length ? input.arena.controlledPlayers : fallbackControlledSeatIds(input.arena?.defaultPlayers ?? 4);
    return {
      ...base,
      seats: controlledPlayers.map((seatId, index) => ({
        seatId,
        seatLabel: tableSeatLabel(seatId, index),
        modelId: index % 2 === 0 ? input.modelAId : input.modelBId,
      })),
    };
  }
  return { ...base, modelAId: input.modelAId, modelBId: input.modelBId };
}

function fallbackControlledSeatIds(count: number): readonly string[] {
  return Array.from({ length: Math.max(3, count) }, (_, index) => `player_${index + 1}`);
}

function tableSeatLabel(seatId: string, index: number): string {
  if (seatId.startsWith("player_")) {
    return `Seat ${seatId.slice("player_".length)}`;
  }
  return `Seat ${index + 1}`;
}

function battlefieldRequestReadyMessage(mode: BattlefieldRequestMode): string {
  if (mode === "solo_benchmark") return "Signed-in users can queue public solo benchmark runs.";
  if (mode === "multi_seat") return "Signed-in users can queue public table games with explicit model seats.";
  return "Signed-in users can queue requestable public model pairings.";
}

function Select({ label, value, onChange, options, showLabel = false }: { label: string; value: string; onChange: (value: string) => void; options: readonly SelectOption[]; showLabel?: boolean }) {
  return (
    <label className={`select-wrap ${showLabel ? "bf-select-labelled" : ""}`}>
      {showLabel ? <span className="bf-select-label">{label}</span> : null}
      <select className="input fb-select" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const [optionValue, optionLabel, meta] = option;
          return <option key={optionValue} value={optionValue} disabled={Boolean(meta?.disabled)}>{optionLabel}</option>;
        })}
      </select>
      <Icon name="chevronDown" size={14} />
    </label>
  );
}

function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`icn ${className}`} aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}

/* eslint-disable @next/next/no-img-element -- Provider logos are fixed local assets and Next image optimization is globally disabled for this deployment. */
function ProviderDot({ provider, providers, size = 16 }: { provider: string; providers: Map<string, PublicBattlefieldProvider>; size?: number }) {
  const providerInfo = providers.get(provider);
  const name = providerInfo?.name ?? provider;
  const color = providerInfo?.color ?? "oklch(56% 0.16 252)";
  const logoUrl = publicProviderLogoCandidate(providerInfo?.logoUrl);
  const initials = providerInitials(name);
  return (
    <span
      className={`provdot ${logoUrl ? "provider-logo provider-logo-imgwrap" : ""}`}
      style={{ width: size, height: size, background: `color-mix(in oklch, ${color} 18%, transparent)`, color, fontSize: size * 0.46 }}
      title={name}
      role="img"
      aria-label={name}
    >
      {logoUrl
        // react-doctor-disable-next-line react-doctor/nextjs-no-img-element -- Fixed local asset; Next image optimization is globally disabled for this deployment.
        ? <img src={logoUrl} alt="" className="provider-logo-img" loading="lazy" decoding="async" />
        : initials}
    </span>
  );
}
/* eslint-enable @next/next/no-img-element */

function ModelBadge({ id, providers = new Map(), size = 13, dot = true }: { id: string; providers?: Map<string, PublicBattlefieldProvider>; size?: number; dot?: boolean }) {
  const [providerPart, slugPart] = id.split("/");
  const provider = providerPart ?? "unknown";
  const slug = slugPart ?? id;
  return (
    <span className="modelbadge" title={id}>
      {dot ? <ProviderDot provider={provider} providers={providers} size={size + 3} /> : null}
      <span className="mono modelname" style={{ fontSize: size }}>
        <span className="mb-prov">{provider}/</span>
        {slug}
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: PublicBattlefieldMatch["status"] }) {
  if (status === "live") return <span className="statusb statusb-live"><span className="livedot" />Live</span>;
  if (status === "scheduled") return <span className="statusb statusb-sched">Upcoming</span>;
  return <span className="statusb statusb-done">Replay</span>;
}

function buildAdvantageView(replay: ReplayState, match: PublicBattlefieldMatch, arena: PublicBattlefieldArena, visiblePly: number, providers: Map<string, PublicBattlefieldProvider>): AdvantageView {
  const mode = battlefieldModeForResult(match, arena);
  if (mode !== "head_to_head") {
    return {
      value: 0,
      label: mode === "solo_benchmark" ? "benchmark progress" : "table score",
      left: "50%",
      width: "0%",
      fillColor: "transparent",
      tracePoints: "0,13 100,13",
      traceX: "0",
      traceY: "13",
      available: false,
      note: mode === "solo_benchmark"
        ? "score appears in the result beat after the benchmark completes"
        : "seat placements and scores appear in the result beat after the table completes",
    };
  }
  const series = advantageSeries(replay, match);
  const value = series[Math.min(visiblePly, series.length - 1)] ?? 0;
  const mag = Math.min(1, Math.abs(value));
  const leading = value >= 0 ? match.a : match.b;
  const color = providers.get(leading.split("/")[0] ?? "")?.color ?? (value >= 0 ? "var(--accent)" : "var(--win)");
  const label = !series.some((point) => point !== 0)
    ? "advantage pending"
    : mag < 0.03 ? "even" : `${publicModelName(leading)} leads ${value > 0 ? "+" : "-"}${mag.toFixed(2)}`;
  const points = series.map((point, index) => `${((index / Math.max(1, series.length - 1)) * 100).toFixed(1)},${(13 - point * 11).toFixed(1)}`).join(" ");
  return {
    value,
    label,
    left: value >= 0 ? `${50 - mag * 50}%` : "50%",
    width: `${mag * 50}%`,
    fillColor: `color-mix(in oklch, ${color} 58%, transparent)`,
    tracePoints: points || "0,13 100,13",
    traceX: `${((visiblePly / Math.max(1, series.length - 1)) * 100).toFixed(1)}`,
    traceY: `${(13 - value * 11).toFixed(1)}`,
    available: series.length > 1 && series.some((point) => point !== 0),
    note: "advantage estimate appears when public replay scores are available",
  };
}

function advantageSeries(replay: ReplayState, match: PublicBattlefieldMatch): number[] {
  if (replay.kind === "visual") {
    let hasRealScore = false;
    let lastDiff = 0;
    const diffs = replay.frames.map((frame) => {
      const diff = scoreDiffForSeats(frame.scores, match);
      if (diff !== null) {
        hasRealScore = true;
        lastDiff = diff;
      }
      return lastDiff;
    });
    if (!hasRealScore) return [];
    const max = Math.max(1, ...diffs.map((value) => Math.abs(value)));
    if (diffs.some((value) => value !== 0)) return diffs.map((value) => value / max);
  }
  return [];
}

function scoreDiffForSeats(scores: Record<string, number>, match: PublicBattlefieldMatch): number | null {
  const scoreA = scoreForSeat(scores, ["a", "A", "player_1", "player1", "p1", "seat_a", "seatA", match.a]);
  const scoreB = scoreForSeat(scores, ["b", "B", "player_2", "player2", "p2", "seat_b", "seatB", match.b]);
  return scoreA === null || scoreB === null ? null : scoreA - scoreB;
}

function scoreForSeat(scores: Record<string, number>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = scores[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function storyBeatSet(moves: readonly ReplayMoveMeta[]): Set<number> {
  const beats = new Set<number>([0]);
  if (moves.length > 0) {
    beats.add(moves[Math.floor(moves.length / 2)]?.ply ?? 0);
    beats.add(moves[moves.length - 1]?.ply ?? 0);
  }
  return beats;
}

function fallbackMoveRows(match: PublicBattlefieldMatch, mode: BattlefieldRequestMode, participants: readonly BattlefieldParticipant[]): ReplayMoveMeta[] {
  return (match.moves ?? []).map((move, index) => {
    const participant = mode === "multi_seat"
      ? participants[index % Math.max(1, participants.length)]
      : mode === "solo_benchmark"
        ? participants.find((item) => item.role === "model") ?? participants[0]
        : participants[index % Math.max(1, participants.length)];
    return {
      ply: index + 1,
      turnIndex: index + 1,
      who: participant?.tone === "b" ? "b" : "a",
      actor: participant?.key ?? (index % 2 === 0 ? "a" : "b"),
      note: match.game === "connect-four" ? `col ${move + 1}` : `move ${move}`,
      visible: true,
    };
  });
}

/** Keeps ?match= in step with the stage so refresh, Back and copied links open the match on screen. */
function replaceBattlefieldMatchUrl(matchId: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("match", matchId);
  url.searchParams.delete("turn");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function emptyBattlefieldMessage(tab: PublicBattlefieldMatch["status"], hasPublishedMatches: boolean): string {
  if (!hasPublishedMatches) return "No public matches have been published yet.";
  return `No ${tab === "completed" ? "completed" : tab} matches for these filters yet. Coming soon.`;
}

function liveLabel(live: LiveMatchState): string {
  const count = live.eventCount === 1 ? "1 event" : `${live.eventCount} events`;
  if (live.status === "connected") return `${count} connected`;
  if (live.status === "connecting") return `${count} connecting`;
  if (live.status === "error") return `${count} connection error`;
  if (live.status === "closed") return `${count} closed`;
  return "Live stream connecting";
}

function replayAvailabilityLabel(hasReplayView: boolean, visibleFrames: number, status: ReplayEventsState["status"]): string {
  if (status === "loading") return "Loading replay";
  if (status === "error") return "Replay unavailable";
  if (!hasReplayView) return "Replay coming soon";
  if (visibleFrames === 0) return "Replay ready";
  if (visibleFrames === 1) return "Opening turn ready";
  return "Turn-by-turn replay ready";
}

function replayStatusLabel(status: string): string {
  if (status === "verified") return "Verified replay";
  if (status === "public-safe" || status === "public") return "Public replay";
  if (status === "pending") return "Replay pending";
  if (status === "idle") return "Replay coming soon";
  if (status === "loading") return "Loading replay";
  if (status === "ready") return "Replay ready";
  if (status === "error") return "Replay unavailable";
  return status;
}

function matchResultSummary(match: PublicBattlefieldMatch): string {
  if (match.status === "live") return typeof match.turn === "number" ? `turn ${match.turn}` : "live";
  if (match.status === "scheduled") return "scheduled";
  if (match.replayId) return "replay ready";
  return match.replayStatus ? replayStatusLabel(match.replayStatus) : "replay pending";
}

function battlefieldRequestOptionLabel(model: PublicBattlefieldRequestModel, gameSlug: string): string {
  return model.allowedGames.includes(gameSlug) ? `${model.id} - available` : `${model.id} - coming soon for this game`;
}

function isBattlefieldModelAllowedForGame(modelId: string, gameSlug: string, catalog: BattlefieldCatalogView): boolean {
  return Boolean(catalog.requestModelById.get(modelId)?.allowedGames.includes(gameSlug));
}

function firstBattlefieldRequestModelForGame(gameSlug: string, catalog: BattlefieldCatalogView, excludeModelId?: string): PublicBattlefieldRequestModel | undefined {
  return catalog.requestModels.find((model) => model.id !== excludeModelId && model.allowedGames.includes(gameSlug));
}

function firstParam(params: PublicSearchParamsInput, key: string): string | null {
  if (!params) return null;
  if (typeof (params as URLSearchParams).get === "function") return (params as URLSearchParams).get(key);
  const value = (params as PublicPageSearchParams)[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function nonNegativeIntegerParam(params: PublicSearchParamsInput, key: string): number | null {
  const value = firstParam(params, key);
  if (!value || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeModelParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.startsWith("gemini/") ? trimmed.replace(/^gemini\//u, "google/") : trimmed;
}

function isSafeModelId(value: string): boolean {
  return value.length <= 120 && /^[a-z0-9-]+\/[A-Za-z0-9._:-]+$/u.test(value);
}

function isMatchStatus(value: string | null | undefined): value is PublicBattlefieldMatch["status"] {
  return Boolean(value && matchStatusSet.has(value as PublicBattlefieldMatch["status"]));
}

function shortArtifact(value: string): string {
  return value.length > 28 ? `${value.slice(0, 19)}...${value.slice(-8)}` : value;
}

function publicSlugLabel(value: string): string {
  return value
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function publicVariantLabel(value: string): string {
  if (value === "standard") return "Standard";
  return publicSlugLabel(value.replace(/^core[_-]/u, ""));
}

function publicModelName(id: string): string {
  return modelNameFromId(id);
}

function providerInitials(name: string): string {
  const initials = name
    .replace(/[^A-Za-z0-9]/g, " ")
    .trim()
    .split(/\s+/u)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || name.slice(0, 2).toUpperCase();
}

function browserSearchParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}
