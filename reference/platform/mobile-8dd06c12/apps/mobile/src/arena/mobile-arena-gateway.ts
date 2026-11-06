import type { PendingIdentityIntent } from "../auth/pending-identity-intent";
import { assertPublicReplaySafe, type MatchVisibility } from "@eslams/core-types";

const SAFE_SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,127}$/u;
const SAFE_REPLAY_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,255}$/u;
const SAFE_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,159}$/u;
const SAFE_MODEL_VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,191}$/u;
const SAFE_GAME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{0,127}$/u;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MAX_COOKIE_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const MAX_REQUEST_ATTEMPTS = 2;
const MAX_SESSION_DEPTH = 18;
const MAX_SESSION_NODES = 50_000;
const MAX_CONTAINER_ENTRIES = 4_096;
export const MAX_MOBILE_ARENA_LEGAL_ACTIONS = 512;
const MAX_SAFE_TEXT_BYTES = 4_096;
const MAX_PUBLIC_STATE_NODES = 12_000;
const SAFE_STATE_HASH = /^sha256:[0-9a-f]{64}$/u;
const SAFE_PLAYING_CARD = /^(?:(?:10|[2-9TJQKA])[CDHS]|[BR]J)$/u;
const SAFE_BLACKJACK_CARD = /^(?:[1-9]|10|11)$/u;
const SAFE_HANABI_CARD = /^[RBGYW][1-5]$/u;
const SAFE_MAHJONG_TILE = /^(?:[BCD][1-9]|[1-9][mps]|east|south|west|north|white|green|red)$/u;
const MAX_SEALED_COMMITMENT_BYTES = 128;
const FORBIDDEN_SESSION_EVIDENCE_KEY = /private|secret|hidden|evidence|provenance|attestation|credential|api[_-]?key|(?:auth|access|refresh|session|upload|runner|firebase)[_-]?token|core[_-]?state|coreState|active[_-]?observation|activeObservation|provider[_-]?(?:receipt|log|response|request)|provider(?:Receipt|Log|Response|Request)|raw[_-]?(?:output|response|prompt)|raw(?:Output|Response|Prompt)|reasoning/iu;

export type ArenaActiveSessionSummary = Readonly<{
  sessionId: string;
  clientChannel: "web" | "mobile";
  status: "reserved" | "active";
  startedAt: number;
  lastActionAt: number;
  expiresAt: number;
  updatedAt: number;
}>;

export type ArenaTerminalReason =
  | "normal"
  | "resignation"
  | "model_timeout_award"
  | "abandoned"
  | "model_unavailable";

export type ArenaModelTurn = Readonly<{
  status: "pending" | "thinking" | "keep_waiting_offer" | "claim_eligible";
  startedAt: number;
  thinkingAt: number;
  keepWaitingOfferAt: number;
  claimEligibleAt: number;
  statusAt: number;
  serverNow: number;
  claimEligible: boolean;
  lateResponseFenced: boolean;
  timeoutEvidenceAt: number | null;
}>;

export type ArenaSessionMode = "head_to_head" | "multi_seat";

export type ArenaStageSeat = Readonly<{
  seatId: string;
  participantType: "human" | "model" | "empty";
  modelId: string | null;
  label: string;
  displayOrder: number;
  teamId: string | null;
}>;

export type ArenaStageLegalActionValue =
  | null
  | boolean
  | number
  | string
  | readonly ArenaStageLegalActionValue[]
  | Readonly<{ [key: string]: ArenaStageLegalActionValue }>;

export type ArenaStageLegalAction = Readonly<{
  token: string;
  label: string;
  shortLabel: string | null;
  verb: string | null;
  object: string | null;
  category: string | null;
  group: string | null;
  sortKey: string | null;
  promptLabel: string | null;
  confirm: boolean;
  disabledReason: string | null;
  value: ArenaStageLegalActionValue | null;
}>;

export type ArenaStageTurnTelemetry = Readonly<{
  responseMode: "sync" | "async" | null;
  action: string | null;
  phase: "human_move_accepted" | "model_thinking" | "model_move_applied" | "completed" | null;
  humanActionReceivedAt: number | null;
  humanActionAppliedAt: number | null;
  humanEngineValidationMs: number | null;
  modelTurnStartedAt: number | null;
  modelTurnCompletedAt: number | null;
  modelBackgroundQueueMs: number | null;
  modelDecisionMs: number | null;
  modelEngineValidationMs: number | null;
  modelProviderLatencyMs: number | null;
  totalTurnMs: number | null;
}>;

export type ArenaStageResultPublication =
  | Readonly<{ status: "pending" }>
  | Readonly<{
      status: "ready";
      matchId: string;
      replayId: string;
      savedToProfile: true;
    }>
  | Readonly<{ status: "unavailable" }>;

export type ArenaStagePublicObject = Readonly<{
  [key: string]: ArenaStageLegalActionValue;
}>;

export type ArenaStageProjection = Readonly<{
  stageProjectionVersion: 1;
  mode: ArenaSessionMode;
  seats: readonly ArenaStageSeat[];
  participantBySeat: Readonly<Record<string, ArenaStageSeat>>;
  activeSeatId: string | null;
  activeParticipantType: ArenaStageSeat["participantType"] | "environment" | null;
  humanPlayerId: string;
  matchVisibility: MatchVisibility;
  legalActions: readonly ArenaStageLegalAction[];
  premoveActions: readonly ArenaStageLegalAction[];
  resultPublication: ArenaStageResultPublication | null;
  resultRevision: number;
  totalLegalActions: number | null;
  publicState: ArenaStagePublicObject | null;
  renderHints: ArenaStagePublicObject | null;
  displayFrame: ArenaStagePublicObject | null;
  coreTiming: Readonly<Record<string, number>> | null;
  scores: Readonly<Record<string, number>> | null;
  outcome: ArenaStagePublicObject | null;
  stateHash: string | null;
  winner: "human" | "model" | "draw" | null;
  winnerSeatId: string | null;
  turnTelemetry: ArenaStageTurnTelemetry | null;
  createdAt: number;
}>;

/** Strict public allowlist. Arbitrary DO state and private mobile evidence never cross this boundary. */
export type PublicMobileArenaSession = Readonly<{
  sessionId: string;
  gameSlug: string;
  modelId: string;
  status: "active" | "completed";
  currentPlayer: "human" | "model";
  turnPhase: "human_turn" | "human_move_accepted" | "model_thinking" | "model_move_applied" | "completed";
  terminalReason: ArenaTerminalReason | null;
  lastAcceptedHumanActionAt: number;
  inactivityExpiresAt: number;
  modelTurn: ArenaModelTurn | null;
  moveNumber: number;
  updatedAt: number;
  /** Present on snapshots accepted through the current Stage projection contract. */
  stageProjectionVersion?: 1;
  mode?: ArenaSessionMode;
  seats?: readonly ArenaStageSeat[];
  participantBySeat?: Readonly<Record<string, ArenaStageSeat>>;
  activeSeatId?: string | null;
  activeParticipantType?: ArenaStageSeat["participantType"] | "environment" | null;
  humanPlayerId?: string;
  matchVisibility?: MatchVisibility;
  legalActions?: readonly ArenaStageLegalAction[];
  premoveActions?: readonly ArenaStageLegalAction[];
  resultPublication?: ArenaStageResultPublication | null;
  resultRevision?: number;
  totalLegalActions?: number | null;
  publicState?: ArenaStagePublicObject | null;
  renderHints?: ArenaStagePublicObject | null;
  displayFrame?: ArenaStagePublicObject | null;
  coreTiming?: Readonly<Record<string, number>> | null;
  scores?: Readonly<Record<string, number>> | null;
  outcome?: ArenaStagePublicObject | null;
  stateHash?: string | null;
  winner?: "human" | "model" | "draw" | null;
  winnerSeatId?: string | null;
  turnTelemetry?: ArenaStageTurnTelemetry | null;
  createdAt?: number;
}>;

export type ProjectedPublicMobileArenaSession = PublicMobileArenaSession & ArenaStageProjection;

export type ArenaSealedCommitment = Readonly<{
  kind: "choice" | "bid" | "card";
  token: string;
  label: string;
}>;

type ArenaViewerPrivateBase<GameSlug extends string = string> = Readonly<{
  schemaVersion: "eslams.arena.viewer-private.v1";
  gameSlug: GameSlug;
  playerId: string;
  turn: number;
  sealedCommitment?: ArenaSealedCommitment;
}>;

export type ArenaViewerPrivate =
  | ArenaViewerPrivateBase & Readonly<{
      kind: "playing_cards" | "mahjong_tiles";
      cards: readonly string[];
      cardsVisible: true;
      source: "hand" | "hole" | "player_hand";
    }>
  | ArenaViewerPrivateBase<"hanabi"> & Readonly<{
      kind: "hanabi_hand";
      cardCount: number;
      cardsVisible: false;
      visiblePartnerCards: readonly string[];
    }>
  | ArenaViewerPrivateBase<"liars-dice"> & Readonly<{
      kind: "dice";
      values: readonly number[];
    }>
  | ArenaViewerPrivateBase<"goofspiel"> & Readonly<{
      kind: "number_cards";
      values: readonly number[];
    }>
  | ArenaViewerPrivateBase<"battleship"> & Readonly<{
      kind: "battleship_fleet";
      ownShips: readonly string[];
    }>
  | ArenaViewerPrivateBase<"first-price-sealed-bid-auction" | "bargaining" | "negotiation"> & Readonly<{
      kind: "private_value";
      value: number;
    }>
  | ArenaViewerPrivateBase & Readonly<{
      kind: "none";
    }>;

/** Authenticated Arena-only snapshot. Battlefield and replay contracts remain public-only. */
export type MobileArenaSession = ProjectedPublicMobileArenaSession & Readonly<{
  viewerPrivate: ArenaViewerPrivate | null;
}>;

export type ArenaSessionSnapshot = PublicMobileArenaSession | MobileArenaSession;

export type ArenaGatewayFailureReason =
  | "insecure_transport"
  | "session_not_ready"
  | "session_expired"
  | "network"
  | "rejected"
  | "invalid_response";

export type ArenaGatewayFailure = Readonly<{
  status: "failed";
  reason: ArenaGatewayFailureReason;
  code?: string;
  retryAfterSeconds?: number;
}>;

export type ArenaActiveSessionResult =
  | Readonly<{ status: "ok"; activeSession: ArenaActiveSessionSummary | null }>
  | ArenaGatewayFailure;

export type ArenaSessionResult =
  | Readonly<{ status: "ok"; session: ArenaSessionSnapshot }>
  | ArenaGatewayFailure;

export type ArenaRuntimeSessionResult =
  | Readonly<{
      status: "ok";
      activeSession: ArenaActiveSessionSummary | null;
      session: ArenaSessionSnapshot | null;
    }>
  | ArenaGatewayFailure;

export type ArenaStartResult =
  | Readonly<{
      status: "started";
      session: ArenaSessionSnapshot;
      startDisposition: "new" | "existing";
    }>
  | Readonly<{ status: "conflict"; activeSession: ArenaActiveSessionSummary }>
  | ArenaGatewayFailure;

export type ArenaMutationResult = ArenaSessionResult;

type ArenaIntent = Extract<PendingIdentityIntent, { kind: "start-arena-match" }>;

export type MobileArenaGatewayDependencies = Readonly<{
  allowPrivateDevelopmentHttp?: boolean;
  apiOrigin: string;
  fetcher: typeof fetch;
  getAuthCookie(): string;
  randomUUID(): string;
}>;

type BoundedResponse = Readonly<{
  response: Response;
  payload: unknown;
}>;

export class MobileArenaGateway {
  constructor(private readonly dependencies: MobileArenaGatewayDependencies) {}

  createIdempotencyKey(): string {
    const value = this.dependencies.randomUUID().trim().toLowerCase();
    if (!UUID_V4.test(value)) throw new Error("Arena idempotency authority is unavailable.");
    return value;
  }

  async activeSession(): Promise<ArenaActiveSessionResult> {
    const result = await this.request("GET", "/api/arena/active-session");
    if ("status" in result) return result;
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    return parseActiveSessionEnvelope(result.payload)
      ?? failure("invalid_response");
  }

  async runtimeSession(): Promise<ArenaRuntimeSessionResult> {
    const result = await this.request("GET", "/api/arena/runtime-session");
    if ("status" in result) return result;
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    return parseRuntimeSessionEnvelope(result.payload) ?? failure("invalid_response");
  }

  async session(sessionId: string): Promise<ArenaSessionResult> {
    if (!SAFE_SESSION_ID.test(sessionId)) return failure("rejected");
    const result = await this.request(
      "GET",
      `/api/arena/sessions/${encodeURIComponent(sessionId)}`,
    );
    if ("status" in result) return result;
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    const session = parseSessionEnvelope(result.payload, "state");
    return session && session.sessionId === sessionId
      ? Object.freeze({ status: "ok", session })
      : failure("invalid_response");
  }

  async start(intent: ArenaIntent, idempotencyKey: string): Promise<ArenaStartResult> {
    if (!UUID_V4.test(idempotencyKey)) return failure("rejected");
    const body = arenaStartBody(intent);
    if (!body) return failure("rejected");
    const result = await this.request(
      "POST",
      "/api/arena/sessions",
      body,
      idempotencyKey,
    );
    if ("status" in result) return result;
    if (result.response.status === 409) {
      const conflict = parseActiveSessionConflict(result.payload);
      return conflict
        ? Object.freeze({ status: "conflict", activeSession: conflict })
        : failure("invalid_response");
    }
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    const started = parseArenaStartEnvelope(result.payload);
    return started
      ? Object.freeze({ status: "started", ...started })
      : failure("invalid_response");
  }

  async replace(
    sessionId: string,
    intent: ArenaIntent,
    idempotencyKey: string,
  ): Promise<ArenaStartResult> {
    if (!SAFE_SESSION_ID.test(sessionId) || !UUID_V4.test(idempotencyKey)) {
      return failure("rejected");
    }
    const body = arenaStartBody(intent);
    if (!body) return failure("rejected");
    const result = await this.request(
      "POST",
      `/api/arena/sessions/${encodeURIComponent(sessionId)}/replace`,
      body,
      idempotencyKey,
    );
    if ("status" in result) return result;
    if (result.response.status === 409) {
      const conflict = parseActiveSessionConflict(result.payload);
      return conflict
        ? Object.freeze({ status: "conflict", activeSession: conflict })
        : failure("invalid_response");
    }
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    const started = parseArenaStartEnvelope(result.payload);
    return started
      ? Object.freeze({ status: "started", ...started })
      : failure("invalid_response");
  }

  action(
    sessionId: string,
    action: string,
    expectedMoveNumber: number,
    idempotencyKey: string,
  ): Promise<ArenaMutationResult> {
    if (!boundedAction(action) || !safeTimestamp(expectedMoveNumber)) {
      return Promise.resolve(failure("rejected"));
    }
    return this.mutate(
      sessionId,
      "action",
      { action, expectedMoveNumber, responseMode: "async" },
      idempotencyKey,
    );
  }

  end(sessionId: string, idempotencyKey: string): Promise<ArenaMutationResult> {
    return this.mutate(sessionId, "end", {}, idempotencyKey);
  }

  resign(sessionId: string, idempotencyKey: string): Promise<ArenaMutationResult> {
    return this.mutate(sessionId, "resign", {}, idempotencyKey);
  }

  claimTimeoutAward(sessionId: string, idempotencyKey: string): Promise<ArenaMutationResult> {
    return this.mutate(sessionId, "claim-timeout-award", {}, idempotencyKey);
  }

  visibility(
    sessionId: string,
    matchVisibility: MatchVisibility,
    idempotencyKey: string,
  ): Promise<ArenaMutationResult> {
    if (!isMatchVisibility(matchVisibility)) return Promise.resolve(failure("rejected"));
    return this.mutate(sessionId, "visibility", { matchVisibility }, idempotencyKey, "PATCH");
  }

  private async mutate(
    sessionId: string,
    action: "action" | "end" | "resign" | "claim-timeout-award" | "visibility",
    body: Readonly<Record<string, unknown>>,
    idempotencyKey: string,
    method: "PATCH" | "POST" = "POST",
  ): Promise<ArenaMutationResult> {
    if (!SAFE_SESSION_ID.test(sessionId) || !UUID_V4.test(idempotencyKey)) {
      return failure("rejected");
    }
    const result = await this.request(
      method,
      `/api/arena/sessions/${encodeURIComponent(sessionId)}/${action}`,
      body,
      idempotencyKey,
    );
    if ("status" in result) return result;
    if (!result.response.ok) return apiFailure(result.payload, result.response);
    const session = parseSessionEnvelope(result.payload, "session");
    return session && session.sessionId === sessionId
      ? Object.freeze({ status: "ok", session })
      : failure("invalid_response");
  }

  private async request(
    method: "GET" | "PATCH" | "POST",
    path: string,
    body?: Readonly<Record<string, unknown>>,
    idempotencyKey?: string,
  ): Promise<BoundedResponse | ArenaGatewayFailure> {
    if (!isAllowedApiOrigin(
      this.dependencies.apiOrigin,
      this.dependencies.allowPrivateDevelopmentHttp === true,
    )) return failure("insecure_transport");
    let cookie: unknown;
    try {
      cookie = this.dependencies.getAuthCookie();
    } catch {
      return failure("session_not_ready");
    }
    if (!safeCookie(cookie)) return failure("session_not_ready");

    for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        response = await this.dependencies.fetcher(
          new URL(path, this.dependencies.apiOrigin),
          {
            method,
            cache: "no-store",
            credentials: "omit",
            headers: {
              accept: "application/json",
              cookie,
              ...(body ? { "content-type": "application/json" } : {}),
              ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        );
      } catch {
        if (attempt < MAX_REQUEST_ATTEMPTS) continue;
        return failure("network");
      }
      const payload = await readBoundedJson(response);
      if (payload === INVALID_PAYLOAD) return failure("invalid_response");
      if (retryableStatus(response.status) && parseRetryAfter(response.headers.get("retry-after")) === undefined
        && attempt < MAX_REQUEST_ATTEMPTS) continue;
      return Object.freeze({ response, payload });
    }
    return failure("network");
  }
}

const INVALID_PAYLOAD = Symbol("invalid-payload");

async function readBoundedJson(response: Response): Promise<unknown | typeof INVALID_PAYLOAD> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return INVALID_PAYLOAD;
  const contentLength = response.headers.get("content-length");
  if (contentLength && (!/^\d+$/u.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)) {
    return INVALID_PAYLOAD;
  }
  try {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) return INVALID_PAYLOAD;
    return JSON.parse(text) as unknown;
  } catch {
    return INVALID_PAYLOAD;
  }
}

export function parseActiveSessionEnvelope(value: unknown): ArenaActiveSessionResult | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)
    || !("activeSession" in value.data)) return null;
  if (value.data.activeSession === null) {
    return Object.freeze({ status: "ok", activeSession: null });
  }
  const activeSession = parseActiveSessionSummary(value.data.activeSession);
  return activeSession ? Object.freeze({ status: "ok", activeSession }) : null;
}

export function parseRuntimeSessionEnvelope(value: unknown): ArenaRuntimeSessionResult | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)
    || !Object.hasOwn(value.data, "activeSession")
    || !Object.hasOwn(value.data, "session")) return null;
  if (value.data.activeSession === null || value.data.session === null) {
    return value.data.activeSession === null && value.data.session === null
      ? Object.freeze({ status: "ok", activeSession: null, session: null })
      : null;
  }
  const activeSession = parseActiveSessionSummary(value.data.activeSession);
  const session = parseMobileArenaSession(value.data.session);
  if (!activeSession || !session || session.sessionId !== activeSession.sessionId) return null;
  return Object.freeze({ status: "ok", activeSession, session });
}

export function parsePublicMobileArenaSession(value: unknown): ProjectedPublicMobileArenaSession | null {
  if (!sessionPayloadStructurallySafe(value)
    || !isRecord(value)
    || !safeSessionId(value.sessionId)
    || !safeGameSlug(value.gameSlug)
    || !safeModelId(value.modelId)
    || (value.status !== "active" && value.status !== "completed")
    || (value.currentPlayer !== "human" && value.currentPlayer !== "model")
    || !isTurnPhase(value.turnPhase)
    || !isTerminalReason(value.terminalReason)
    || !safeTimestamp(value.lastAcceptedHumanActionAt)
    || !safeTimestamp(value.inactivityExpiresAt)
    || value.inactivityExpiresAt < value.lastAcceptedHumanActionAt
    || !safeCount(value.moveNumber)
    || !safeTimestamp(value.updatedAt)) return null;
  if ((value.status === "active") !== (value.terminalReason === null)) return null;
  const modelTurn = value.modelTurn === null ? null : parseModelTurn(value.modelTurn);
  if (value.modelTurn !== null && !modelTurn) return null;
  const stage = parseArenaStageProjection(value);
  if (!stage) return null;
  return Object.freeze({
    sessionId: value.sessionId,
    gameSlug: value.gameSlug,
    modelId: value.modelId,
    status: value.status,
    currentPlayer: value.currentPlayer,
    turnPhase: value.turnPhase,
    terminalReason: value.terminalReason,
    lastAcceptedHumanActionAt: value.lastAcceptedHumanActionAt,
    inactivityExpiresAt: value.inactivityExpiresAt,
    modelTurn,
    moveNumber: value.moveNumber,
    updatedAt: value.updatedAt,
    ...stage,
  });
}

export function parseMobileArenaSession(value: unknown): MobileArenaSession | null {
  if (!isRecord(value) || !Object.hasOwn(value, "viewerPrivate")) return null;
  const publicValue: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, entry] of Object.entries(value)) {
    if (key !== "viewerPrivate") publicValue[key] = entry;
  }
  const publicSession = parsePublicMobileArenaSession(publicValue);
  if (!publicSession) return null;
  const viewerPrivate = value.viewerPrivate === null
    ? null
    : parseArenaViewerPrivate(value.viewerPrivate, publicSession);
  if (value.viewerPrivate !== null && !viewerPrivate) return null;
  return Object.freeze({ ...publicSession, viewerPrivate });
}

export function parseArenaViewerPrivate(
  value: unknown,
  session: ProjectedPublicMobileArenaSession,
): ArenaViewerPrivate | null {
  if (!isRecord(value)
    || value.schemaVersion !== "eslams.arena.viewer-private.v1"
    || value.gameSlug !== session.gameSlug
    || value.playerId !== session.humanPlayerId
    || value.turn !== session.moveNumber
    || !safeCount(value.turn)) return null;
  const sealedCommitment = parseSealedCommitment(value);
  if (sealedCommitment === null
    || (sealedCommitment !== undefined
      && !sealedCommitmentMatchesEnvelope(value.kind, sealedCommitment.kind))) return null;
  const base = {
    schemaVersion: value.schemaVersion,
    gameSlug: value.gameSlug,
    playerId: value.playerId,
    turn: value.turn,
    ...(sealedCommitment === undefined ? {} : { sealedCommitment }),
  } as const;

  if (value.kind === "playing_cards" || value.kind === "mahjong_tiles") {
    if (!hasViewerPrivateKeys(value, [
      "schemaVersion",
      "gameSlug",
      "playerId",
      "turn",
      "kind",
      "cards",
      "cardsVisible",
      "source",
    ]) || value.cardsVisible !== true || !Array.isArray(value.cards)
      || value.cards.length > 32 || !validViewerCardSource(value, session.gameSlug)) return null;
    if (value.cards.some((card) => (
      typeof card !== "string"
      || (value.kind === "mahjong_tiles"
        ? !SAFE_MAHJONG_TILE.test(card)
        : !validPlayingCard(card, session.gameSlug))
    ))) return null;
    if (value.kind === "mahjong_tiles") {
      const counts = new Map<string, number>();
      for (const tile of value.cards as string[]) {
        const count = (counts.get(tile) ?? 0) + 1;
        if (count > 4) return null;
        counts.set(tile, count);
      }
    } else if (pokerGames.has(session.gameSlug) && new Set(value.cards).size !== value.cards.length) {
      return null;
    }
    return Object.freeze({
      ...base,
      kind: value.kind,
      cards: Object.freeze([...(value.cards as string[])]),
      cardsVisible: true,
      source: value.source as "hand" | "hole" | "player_hand",
    });
  }

  if (value.kind === "hanabi_hand") {
    if (session.gameSlug !== "hanabi" || !hasViewerPrivateKeys(value, [
      "schemaVersion",
      "gameSlug",
      "playerId",
      "turn",
      "kind",
      "cardCount",
      "cardsVisible",
      "visiblePartnerCards",
    ]) || value.cardsVisible !== false || !safeBoundedInteger(value.cardCount, 0, 8)
      || !Array.isArray(value.visiblePartnerCards)
      || value.visiblePartnerCards.length > 8
      || value.visiblePartnerCards.some((card) => typeof card !== "string" || !SAFE_HANABI_CARD.test(card))) {
      return null;
    }
    return Object.freeze({
      ...base,
      gameSlug: "hanabi",
      kind: "hanabi_hand",
      cardCount: value.cardCount,
      cardsVisible: false,
      visiblePartnerCards: Object.freeze([...(value.visiblePartnerCards as string[])]),
    });
  }

  if (value.kind === "dice") {
    if (session.gameSlug !== "liars-dice"
      || !exactIntegerValues(value, 1, 8, 1, 6)) return null;
    return Object.freeze({
      ...base,
      gameSlug: "liars-dice",
      kind: "dice",
      values: Object.freeze([...(value.values as number[])]),
    });
  }

  if (value.kind === "number_cards") {
    if (session.gameSlug !== "goofspiel"
      || !exactIntegerValues(value, 0, 16, 0, 100)) return null;
    return Object.freeze({
      ...base,
      gameSlug: "goofspiel",
      kind: "number_cards",
      values: Object.freeze([...(value.values as number[])]),
    });
  }

  if (value.kind === "battleship_fleet") {
    if (session.gameSlug !== "battleship" || !hasViewerPrivateKeys(value, [
      "schemaVersion",
      "gameSlug",
      "playerId",
      "turn",
      "kind",
      "ownShips",
    ]) || !Array.isArray(value.ownShips) || value.ownShips.length > 32
      || value.ownShips.some((ship) => !safePrivateInventoryLabel(ship, 24))) return null;
    return Object.freeze({
      ...base,
      gameSlug: "battleship",
      kind: "battleship_fleet",
      ownShips: Object.freeze([...(value.ownShips as string[])]),
    });
  }

  if (value.kind === "private_value") {
    if (!hasViewerPrivateKeys(value, [
      "schemaVersion",
      "gameSlug",
      "playerId",
      "turn",
      "kind",
      "value",
    ]) || !["first-price-sealed-bid-auction", "bargaining", "negotiation"].includes(session.gameSlug)
      || typeof value.value !== "number" || !Number.isFinite(value.value)) return null;
    return Object.freeze({
      ...base,
      gameSlug: session.gameSlug as "first-price-sealed-bid-auction" | "bargaining" | "negotiation",
      kind: "private_value",
      value: value.value,
    });
  }

  return value.kind === "none" && hasViewerPrivateKeys(value, [
    "schemaVersion",
    "gameSlug",
    "playerId",
    "turn",
    "kind",
  ])
    ? Object.freeze({ ...base, kind: "none" })
    : null;
}

const pokerGames = new Set([
  "leduc-holdem",
  "limit-texas-holdem",
  "no-limit-texas-holdem",
]);

function validPlayingCard(value: string, gameSlug: string): boolean {
  return SAFE_PLAYING_CARD.test(value)
    || (gameSlug === "blackjack" && SAFE_BLACKJACK_CARD.test(value));
}

function parseSealedCommitment(
  value: Readonly<Record<string, unknown>>,
): ArenaSealedCommitment | null | undefined {
  if (!Object.hasOwn(value, "sealedCommitment")) return undefined;
  const commitment = value.sealedCommitment;
  if (!isRecord(commitment)
    || !hasExactKeys(commitment, ["kind", "token", "label"])
    || (commitment.kind !== "choice" && commitment.kind !== "bid" && commitment.kind !== "card")
    || !safePrivateInventoryLabel(commitment.token, MAX_SEALED_COMMITMENT_BYTES)
    || !safePrivateInventoryLabel(commitment.label, MAX_SEALED_COMMITMENT_BYTES)
    || !sealedCommitmentMatchesGame(value.gameSlug, commitment.kind)) return null;
  return Object.freeze({
    kind: commitment.kind,
    token: commitment.token,
    label: commitment.label,
  });
}

function sealedCommitmentMatchesGame(
  gameSlug: unknown,
  kind: ArenaSealedCommitment["kind"],
): boolean {
  if (kind === "choice") {
    return gameSlug === "rock-paper-scissors" || gameSlug === "prisoners-dilemma";
  }
  if (kind === "card") return gameSlug === "goofspiel";
  return gameSlug === "first-price-sealed-bid-auction";
}

function sealedCommitmentMatchesEnvelope(
  envelopeKind: unknown,
  commitmentKind: ArenaSealedCommitment["kind"],
): boolean {
  if (commitmentKind === "choice") return envelopeKind === "none";
  if (commitmentKind === "card") return envelopeKind === "number_cards";
  return envelopeKind === "private_value";
}

function safePrivateInventoryLabel(value: unknown, maximumBytes: number): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && !/[\p{Cc}\p{Cf}]/u.test(value)
    && new TextEncoder().encode(value).byteLength <= maximumBytes;
}

function hasViewerPrivateKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  const allowedCount = expected.length + (Object.hasOwn(value, "sealedCommitment") ? 1 : 0);
  return keys.length === allowedCount
    && expected.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => expected.includes(key) || key === "sealedCommitment");
}

function validViewerCardSource(
  value: Readonly<Record<string, unknown>>,
  gameSlug: string,
): boolean {
  if (value.kind === "mahjong_tiles") {
    return gameSlug === "mahjong" && value.source === "hand";
  }
  if (gameSlug === "mahjong" || gameSlug === "hanabi") return false;
  if (gameSlug === "leduc-holdem"
    || gameSlug === "limit-texas-holdem"
    || gameSlug === "no-limit-texas-holdem") return value.source === "hole";
  if (gameSlug === "blackjack") return value.source === "player_hand";
  return value.source === "hand";
}

function exactIntegerValues(
  value: Readonly<Record<string, unknown>>,
  minimumLength: number,
  maximumLength: number,
  minimumValue: number,
  maximumValue: number,
): boolean {
  return hasViewerPrivateKeys(value, [
    "schemaVersion",
    "gameSlug",
    "playerId",
    "turn",
    "kind",
    "values",
  ])
    && Array.isArray(value.values)
    && value.values.length >= minimumLength
    && value.values.length <= maximumLength
    && value.values.every((entry) => safeBoundedInteger(entry, minimumValue, maximumValue));
}

function safeBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function parseArenaStageProjection(value: Readonly<Record<string, unknown>>): ArenaStageProjection | null {
  if (value.stageProjectionVersion !== 1) return null;
  const mode = value.mode;
  if (mode !== "head_to_head" && mode !== "multi_seat") return null;
  const seats = parseStageSeats(value.seats, mode);
  if (!seats) return null;
  const participantBySeat = parseStageParticipantMap(value.participantBySeat, seats);
  if (!participantBySeat) return null;
  const humanSeat = seats.find((seat) => seat.participantType === "human");
  if (!humanSeat || value.humanPlayerId !== humanSeat.seatId) return null;
  const activeSeatId = value.activeSeatId === null ? null
    : safeSeatId(value.activeSeatId) ? value.activeSeatId
      : undefined;
  if (activeSeatId === undefined) return null;
  const activeParticipantType = parseActiveParticipantType(value.activeParticipantType);
  if (activeParticipantType === undefined) return null;
  if (activeSeatId === null) {
    if (activeParticipantType !== null) return null;
  } else {
    const expectedParticipant = participantBySeat[activeSeatId]?.participantType ?? "environment";
    if (activeParticipantType !== expectedParticipant) return null;
  }
  if (!isMatchVisibility(value.matchVisibility)) return null;
  const legalActions = parseStageLegalActions(value.legalActions);
  if (!legalActions) return null;
  const premoveActions = parseStageLegalActions(value.premoveActions ?? []);
  if (!premoveActions) return null;
  const resultPublication = value.resultPublication === undefined || value.resultPublication === null
    ? null
    : parseStageResultPublication(value.resultPublication);
  if (value.resultPublication !== undefined && value.resultPublication !== null && !resultPublication) return null;
  const resultRevision = value.resultRevision === undefined ? 0 : value.resultRevision;
  if (!safeCount(resultRevision)) return null;
  const totalLegalActions = value.totalLegalActions === null ? null
    : safeCount(value.totalLegalActions) ? value.totalLegalActions
      : undefined;
  if (totalLegalActions === undefined
    || (totalLegalActions !== null && (
      totalLegalActions < legalActions.length
      || totalLegalActions > MAX_MOBILE_ARENA_LEGAL_ACTIONS
    ))) return null;
  const publicState = parseStagePublicObject(value.publicState, MAX_PUBLIC_STATE_NODES);
  const renderHints = parseStagePublicObject(value.renderHints, 512);
  const displayFrame = parseStagePublicObject(value.displayFrame, MAX_SESSION_NODES);
  const coreTiming = parseStageNumericRecord(value.coreTiming, 64, true);
  const scores = parseStageNumericRecord(value.scores, 32, false);
  const outcome = parseStagePublicObject(value.outcome, 512);
  if (publicState === undefined || renderHints === undefined || displayFrame === undefined
    || coreTiming === undefined || scores === undefined || outcome === undefined) return null;
  const stateHash = value.stateHash === null ? null
    : typeof value.stateHash === "string" && SAFE_STATE_HASH.test(value.stateHash)
      ? value.stateHash
      : undefined;
  if (stateHash === undefined || !isWinner(value.winner)) return null;
  const winner = value.winner;
  const winnerSeatId = value.winnerSeatId === null ? null
    : safeSeatId(value.winnerSeatId) && participantBySeat[value.winnerSeatId]
      ? value.winnerSeatId
      : undefined;
  if (winnerSeatId === undefined
    || (winner === "draw" && winnerSeatId !== null)
    || (winner === null && winnerSeatId !== null)) return null;
  const turnTelemetry = value.turnTelemetry === null ? null : parseStageTurnTelemetry(value.turnTelemetry);
  if (value.turnTelemetry !== null && !turnTelemetry) return null;
  if (!safeTimestamp(value.createdAt) || !safeTimestamp(value.updatedAt)
    || value.updatedAt < value.createdAt) return null;
  return Object.freeze({
    stageProjectionVersion: 1,
    mode,
    seats,
    participantBySeat,
    activeSeatId,
    activeParticipantType,
    humanPlayerId: humanSeat.seatId,
    matchVisibility: value.matchVisibility,
    legalActions,
    premoveActions,
    resultPublication,
    resultRevision,
    totalLegalActions,
    publicState,
    renderHints,
    displayFrame,
    coreTiming,
    scores,
    outcome,
    stateHash,
    winner,
    winnerSeatId,
    turnTelemetry,
    createdAt: value.createdAt,
  });
}

function parseSessionEnvelope(
  value: unknown,
  field: "session" | "state",
): MobileArenaSession | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)) return null;
  return parseMobileArenaSession(value.data[field]);
}

function parseArenaStartEnvelope(value: unknown): Readonly<{
  session: MobileArenaSession;
  startDisposition: "new" | "existing";
}> | null {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.data)
    || typeof value.data.existing !== "boolean") return null;
  const session = parseMobileArenaSession(value.data.session);
  return session ? Object.freeze({
    session,
    startDisposition: value.data.existing ? "existing" : "new",
  }) : null;
}

function parseActiveSessionConflict(value: unknown): ArenaActiveSessionSummary | null {
  if (!isRecord(value) || value.ok !== false || !isRecord(value.error)
    || value.error.code !== "active_arena_session_exists" || !isRecord(value.error.details)) return null;
  return parseActiveSessionSummary(value.error.details.activeSession);
}

function parseActiveSessionSummary(value: unknown): ArenaActiveSessionSummary | null {
  if (!isRecord(value)
    || !safeSessionId(value.sessionId)
    || (value.clientChannel !== "web" && value.clientChannel !== "mobile")
    || (value.status !== "reserved" && value.status !== "active")
    || !safeTimestamp(value.startedAt)
    || !safeTimestamp(value.lastActionAt)
    || !safeTimestamp(value.expiresAt)
    || !safeTimestamp(value.updatedAt)
    || value.lastActionAt < value.startedAt
    || value.expiresAt < value.lastActionAt
    || value.updatedAt < value.startedAt) return null;
  return Object.freeze({
    sessionId: value.sessionId,
    clientChannel: value.clientChannel,
    status: value.status,
    startedAt: value.startedAt,
    lastActionAt: value.lastActionAt,
    expiresAt: value.expiresAt,
    updatedAt: value.updatedAt,
  });
}

function parseModelTurn(value: unknown): ArenaModelTurn | null {
  if (!isRecord(value)
    || !isModelTurnStatus(value.status)
    || !safeTimestamp(value.startedAt)
    || !safeTimestamp(value.thinkingAt)
    || !safeTimestamp(value.keepWaitingOfferAt)
    || !safeTimestamp(value.claimEligibleAt)
    || !safeTimestamp(value.statusAt)
    || !safeTimestamp(value.serverNow)
    || typeof value.claimEligible !== "boolean"
    || typeof value.lateResponseFenced !== "boolean"
    || !(value.timeoutEvidenceAt === null || safeTimestamp(value.timeoutEvidenceAt))
    || value.thinkingAt < value.startedAt
    || value.keepWaitingOfferAt < value.thinkingAt
    || value.claimEligibleAt < value.keepWaitingOfferAt
    || value.statusAt < value.startedAt
    || value.serverNow < value.statusAt
    || value.claimEligible !== (value.status === "claim_eligible")
    || (value.lateResponseFenced && value.status !== "claim_eligible")) return null;
  return Object.freeze({
    status: value.status,
    startedAt: value.startedAt,
    thinkingAt: value.thinkingAt,
    keepWaitingOfferAt: value.keepWaitingOfferAt,
    claimEligibleAt: value.claimEligibleAt,
    statusAt: value.statusAt,
    serverNow: value.serverNow,
    claimEligible: value.claimEligible,
    lateResponseFenced: value.lateResponseFenced,
    timeoutEvidenceAt: value.timeoutEvidenceAt,
  });
}

function parseStageSeats(value: unknown, mode: ArenaSessionMode): readonly ArenaStageSeat[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 16
    || (mode === "head_to_head" && value.length !== 2)
    || (mode === "multi_seat" && value.length < 3)) return null;
  const seats = value.map(parseStageSeat);
  if (seats.some((seat) => seat === null)) return null;
  const parsed = seats as ArenaStageSeat[];
  if (new Set(parsed.map((seat) => seat.seatId)).size !== parsed.length
    || new Set(parsed.map((seat) => seat.displayOrder)).size !== parsed.length
    || parsed.filter((seat) => seat.participantType === "human").length !== 1) return null;
  return Object.freeze([...parsed]);
}

function parseStageSeat(value: unknown): ArenaStageSeat | null {
  if (!isRecord(value)
    || !safeSeatId(value.seatId)
    || !isSeatParticipantType(value.participantType)
    || !safeText(value.label, 160)
    || !Number.isSafeInteger(value.displayOrder)
    || (value.displayOrder as number) < 0
    || (value.displayOrder as number) > 15) return null;
  const modelId = value.participantType === "model"
    ? safeModelId(value.modelId) ? value.modelId : undefined
    : value.modelId === undefined || value.modelId === null ? null : undefined;
  const teamId = value.teamId === undefined || value.teamId === null ? null
    : safePublicId(value.teamId, 80) ? value.teamId
      : undefined;
  if (modelId === undefined || teamId === undefined) return null;
  return Object.freeze({
    seatId: value.seatId,
    participantType: value.participantType,
    modelId,
    label: value.label,
    displayOrder: value.displayOrder as number,
    teamId,
  });
}

function parseStageParticipantMap(
  value: unknown,
  seats: readonly ArenaStageSeat[],
): Readonly<Record<string, ArenaStageSeat>> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length !== seats.length) return null;
  const expected = new Map(seats.map((seat) => [seat.seatId, seat]));
  const participants: Record<string, ArenaStageSeat> = Object.create(null) as Record<string, ArenaStageSeat>;
  for (const [seatId, rawSeat] of entries) {
    const parsed = parseStageSeat(rawSeat);
    const seat = expected.get(seatId);
    if (!parsed || !seat || !sameStageSeat(parsed, seat)) return null;
    participants[seatId] = seat;
  }
  return Object.freeze(participants);
}

function sameStageSeat(left: ArenaStageSeat, right: ArenaStageSeat): boolean {
  return left.seatId === right.seatId
    && left.participantType === right.participantType
    && left.modelId === right.modelId
    && left.label === right.label
    && left.displayOrder === right.displayOrder
    && left.teamId === right.teamId;
}

function parseStageLegalActions(value: unknown): readonly ArenaStageLegalAction[] | null {
  if (!Array.isArray(value) || value.length > MAX_MOBILE_ARENA_LEGAL_ACTIONS) return null;
  const actions = value.map(parseStageLegalAction);
  if (actions.some((action) => action === null)) return null;
  const parsed = actions as ArenaStageLegalAction[];
  if (new Set(parsed.map((action) => action.token)).size !== parsed.length) return null;
  return Object.freeze([...parsed]);
}

function parseStageLegalAction(value: unknown): ArenaStageLegalAction | null {
  if (!isRecord(value) || !safeText(value.token, 256) || !safeText(value.label, 256)) return null;
  const shortLabel = nullableSafeText(value.shortLabel, 160);
  const verb = nullableSafeText(value.verb, 120);
  const object = nullableSafeText(value.object, 160);
  const category = nullableSafeText(value.category, 120);
  const group = nullableSafeText(value.group, 120);
  const sortKey = nullableSafeText(value.sortKey, 160);
  const promptLabel = nullableSafeText(value.promptLabel, 256);
  const disabledReason = nullableSafeText(value.disabledReason, 512);
  if ([shortLabel, verb, object, category, group, sortKey, promptLabel, disabledReason]
    .some((field) => field === undefined)) return null;
  if (!(value.confirm === undefined || value.confirm === null || typeof value.confirm === "boolean")) return null;
  const actionValue = value.value === undefined ? null : cloneStagePublicValue(value.value, 0, { nodes: 0 });
  if (actionValue === undefined) return null;
  try {
    assertPublicReplaySafe(actionValue, "$.legalActions[].value");
  } catch {
    return null;
  }
  return Object.freeze({
    token: value.token,
    label: value.label,
    shortLabel: shortLabel as string | null,
    verb: verb as string | null,
    object: object as string | null,
    category: category as string | null,
    group: group as string | null,
    sortKey: sortKey as string | null,
    promptLabel: promptLabel as string | null,
    confirm: value.confirm === true,
    disabledReason: disabledReason as string | null,
    value: actionValue,
  });
}

function parseStagePublicObject(
  value: unknown,
  maximumNodes: number,
): ArenaStagePublicObject | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  try {
    assertPublicReplaySafe(value, "$.arenaStagePublicState");
  } catch {
    return undefined;
  }
  const cloned = cloneStagePublicValue(value, 0, { nodes: 0 }, maximumNodes);
  return isRecord(cloned) ? cloned as ArenaStagePublicObject : undefined;
}

function cloneStagePublicValue(
  value: unknown,
  depth: number,
  budget: { nodes: number },
  maximumNodes = 1_024,
): ArenaStageLegalActionValue | undefined {
  budget.nodes += 1;
  if (depth > 16 || budget.nodes > maximumNodes) return undefined;
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return safePublicValueString(value, MAX_SAFE_TEXT_BYTES) ? value : undefined;
  if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
    ? value
    : undefined;
  if (Array.isArray(value)) {
    if (value.length > MAX_CONTAINER_ENTRIES) return undefined;
    const entries = value.map((entry) => cloneStagePublicValue(entry, depth + 1, budget, maximumNodes));
    return entries.some((entry) => entry === undefined)
      ? undefined
      : Object.freeze(entries as ArenaStageLegalActionValue[]);
  }
  if (!isRecord(value) || Object.keys(value).length > MAX_CONTAINER_ENTRIES) return undefined;
  const result: Record<string, ArenaStageLegalActionValue> = Object.create(null) as Record<string, ArenaStageLegalActionValue>;
  for (const [key, entry] of Object.entries(value)) {
    if (!safeObjectKey(key)) return undefined;
    const cloned = cloneStagePublicValue(entry, depth + 1, budget, maximumNodes);
    if (cloned === undefined) return undefined;
    result[key] = cloned;
  }
  return Object.freeze(result);
}

function parseStageNumericRecord(
  value: unknown,
  maximumEntries: number,
  nonNegative: boolean,
): Readonly<Record<string, number>> | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > maximumEntries) return undefined;
  const result: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const [key, entry] of entries) {
    if (!safeObjectKey(key) || typeof entry !== "number" || !Number.isFinite(entry)
      || Math.abs(entry) > Number.MAX_SAFE_INTEGER || (nonNegative && entry < 0)) return undefined;
    result[key] = entry;
  }
  return Object.freeze(result);
}

function parseStageResultPublication(value: unknown): ArenaStageResultPublication | null {
  if (!isRecord(value)) return null;
  if (value.status === "pending" && hasExactKeys(value, ["status"])) {
    return Object.freeze({ status: "pending" });
  }
  if (value.status === "unavailable" && hasExactKeys(value, ["status"])) {
    return Object.freeze({ status: "unavailable" });
  }
  if (value.status !== "ready"
    || !hasExactKeys(value, ["status", "matchId", "replayId", "savedToProfile"])
    || value.savedToProfile !== true
    || !safeSessionId(value.matchId)
    || value.replayId !== `replay_${value.matchId}`
    || typeof value.replayId !== "string"
    || !SAFE_REPLAY_ID.test(value.replayId)) return null;
  return Object.freeze({ status: "ready", matchId: value.matchId, replayId: value.replayId, savedToProfile: true });
}

function parseStageTurnTelemetry(value: unknown): ArenaStageTurnTelemetry | null {
  if (!isRecord(value)) return null;
  const responseMode = value.responseMode === undefined || value.responseMode === null ? null
    : value.responseMode === "sync" || value.responseMode === "async" ? value.responseMode
      : undefined;
  const phase = value.phase === undefined || value.phase === null ? null
    : value.phase === "human_move_accepted" || value.phase === "model_thinking"
      || value.phase === "model_move_applied" || value.phase === "completed" ? value.phase
      : undefined;
  const action = value.action === undefined ? null : nullableSafeText(value.action, 256);
  const timestamps = {
    humanActionReceivedAt: optionalSafeTimestamp(value.humanActionReceivedAt),
    humanActionAppliedAt: optionalSafeTimestamp(value.humanActionAppliedAt),
    modelTurnStartedAt: optionalSafeTimestamp(value.modelTurnStartedAt),
    modelTurnCompletedAt: optionalSafeTimestamp(value.modelTurnCompletedAt),
  };
  const durations = {
    humanEngineValidationMs: optionalSafeDuration(value.humanEngineValidationMs),
    modelBackgroundQueueMs: optionalSafeDuration(value.modelBackgroundQueueMs),
    modelDecisionMs: optionalSafeDuration(value.modelDecisionMs),
    modelEngineValidationMs: optionalSafeDuration(value.modelEngineValidationMs),
    modelProviderLatencyMs: optionalSafeDuration(value.modelProviderLatencyMs),
    totalTurnMs: optionalSafeDuration(value.totalTurnMs),
  };
  if (responseMode === undefined || phase === undefined || action === undefined
    || Object.values(timestamps).some((entry) => entry === undefined)
    || Object.values(durations).some((entry) => entry === undefined)) return null;
  const safeTimestamps = timestamps as Record<keyof typeof timestamps, number | null>;
  const safeDurations = durations as Record<keyof typeof durations, number | null>;
  if (safeTimestamps.humanActionReceivedAt !== null && safeTimestamps.humanActionAppliedAt !== null
    && safeTimestamps.humanActionAppliedAt < safeTimestamps.humanActionReceivedAt) return null;
  if (safeTimestamps.modelTurnStartedAt !== null && safeTimestamps.modelTurnCompletedAt !== null
    && safeTimestamps.modelTurnCompletedAt < safeTimestamps.modelTurnStartedAt) return null;
  return Object.freeze({ responseMode, phase, action, ...safeTimestamps, ...safeDurations }) as ArenaStageTurnTelemetry;
}

function optionalSafeTimestamp(value: unknown): number | null | undefined {
  return value === undefined || value === null ? null : safeTimestamp(value) ? value : undefined;
}

function optionalSafeDuration(value: unknown): number | null | undefined {
  return value === undefined || value === null ? null
    : typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 86_400_000
      ? value
      : undefined;
}

function arenaStartBody(intent: ArenaIntent): Readonly<Record<string, unknown>> | null {
  if (intent.setupVersion !== 2 || !safeGameSlug(intent.gameSlug)) return null;
  const seats = intent.seats.map((seat, index) => {
    if (!safeSeatId(seat.seatId)) return null;
    const participantType = seat.participant.kind;
    if (participantType === "model"
      && (!safeModelId(seat.participant.modelEntryId)
        || !safeModelVersionId(seat.participant.modelEntryVersionId)
        || !safeProviderVersionString(seat.participant.providerVersionString))) return null;
    return Object.freeze({
      seatId: seat.seatId,
      participantType,
      displayOrder: index,
      ...(participantType === "model" ? {
        modelId: seat.participant.modelEntryId,
        modelEntryId: seat.participant.modelEntryId,
        modelEntryVersionId: seat.participant.modelEntryVersionId,
        providerVersionString: seat.participant.providerVersionString,
      } : {}),
    });
  });
  if (seats.some((seat) => seat === null)) return null;
  const human = seats.find((seat) => seat?.participantType === "human");
  const firstModel = seats.find((seat) => seat?.participantType === "model");
  if (!human || !firstModel || !("modelId" in firstModel) || typeof firstModel.modelId !== "string") return null;
  return Object.freeze({
    setupVersion: intent.setupVersion,
    gameSlug: intent.gameSlug,
    modelId: firstModel.modelId,
    matchVisibility: intent.visibility,
    humanPlayerId: human.seatId,
    mode: seats.length > 2 ? "multi_seat" : "head_to_head",
    side: intent.side,
    seats,
  });
}

function apiFailure(value: unknown, response: Response): ArenaGatewayFailure {
  const status = response.status;
  const code = isRecord(value) && value.ok === false && isRecord(value.error)
    && typeof value.error.code === "string" && SAFE_ERROR_CODE.test(value.error.code)
    ? value.error.code
    : undefined;
  const retryAfterSeconds = parseRetryAfter(response.headers.get("retry-after"));
  if (status === 401) {
    return failure("session_expired", code ?? "session_expired", retryAfterSeconds);
  }
  // A server-side failure can be returned after a mutation was already applied.
  // Keep it in the ambiguous bucket so callers retain the exact command UUID.
  if (status >= 500 || status === 408 || status === 425 || status === 429) {
    return failure("network", code, retryAfterSeconds);
  }
  if (!code) {
    return failure("invalid_response");
  }
  return failure("rejected", code, retryAfterSeconds);
}

function failure(
  reason: ArenaGatewayFailureReason,
  code?: string,
  retryAfterSeconds?: number,
): ArenaGatewayFailure {
  return Object.freeze({
    status: "failed",
    reason,
    ...(code ? { code } : {}),
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  });
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (/^\d{1,5}$/u.test(trimmed)) return Math.min(Number(trimmed), 3_600);
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.min(3_600, Math.max(0, Math.ceil((timestamp - now) / 1_000)));
}

function retryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function safeCookie(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !/[\r\n\0]/u.test(value)
    && new TextEncoder().encode(value).byteLength <= MAX_COOKIE_BYTES;
}

function isAllowedApiOrigin(origin: string, allowPrivateDevelopmentHttp: boolean): boolean {
  try {
    const url = new URL(origin);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    if (url.protocol === "https:") return true;
    return allowPrivateDevelopmentHttp && url.protocol === "http:" && isPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") return true;
  const octets = hostname.split(".");
  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/u.test(octet)
    || Number(octet) > 255)) return false;
  const [first, second] = octets.map(Number);
  return first === 10
    || (first === 192 && second === 168)
    || (first === 172 && second !== undefined && second >= 16 && second <= 31);
}

function boundedAction(value: string): boolean {
  return value.length >= 1
    && value.length <= 256
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function safeSessionId(value: unknown): value is string {
  return typeof value === "string" && SAFE_SESSION_ID.test(value);
}

function safeGameSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 80 && SAFE_GAME_SLUG.test(value);
}

function safeModelId(value: unknown): value is string {
  return typeof value === "string"
    && SAFE_MODEL_ID.test(value)
    && !value.startsWith("/")
    && !value.split("/").some((segment) => segment === "." || segment === "..");
}

function safeModelVersionId(value: unknown): value is string {
  return typeof value === "string"
    && SAFE_MODEL_VERSION_ID.test(value)
    && !value.startsWith("/")
    && !value.includes("//")
    && !value.split("/").some((segment) => segment === "." || segment === "..");
}

function safeProviderVersionString(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 256
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function safeText(value: unknown, maximumBytes: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && !/[\u0000-\u001f\u007f]/u.test(value)
    && new TextEncoder().encode(value).byteLength <= maximumBytes;
}

function safePublicValueString(value: string, maximumBytes: number): boolean {
  return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
    && new TextEncoder().encode(value).byteLength <= maximumBytes;
}

function nullableSafeText(value: unknown, maximumBytes: number): string | null | undefined {
  return value === undefined || value === null ? null
    : safeText(value, maximumBytes) ? value
      : undefined;
}

function safePublicId(value: unknown, maximumBytes: number): value is string {
  return safeText(value, maximumBytes) && /^[A-Za-z0-9][A-Za-z0-9:._-]*$/u.test(value);
}

function safeObjectKey(value: string): boolean {
  return value.length > 0
    && new TextEncoder().encode(value).byteLength <= 128
    && !/[\u0000-\u001f\u007f]/u.test(value)
    && value !== "__proto__"
    && value !== "prototype"
    && value !== "constructor";
}

function safeSeatId(value: unknown): value is string {
  return typeof value === "string" && /^player_(?:[1-9]|1[0-6])$/u.test(value);
}

function safeTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function safeCount(value: unknown): value is number {
  return safeTimestamp(value) && value <= 10_000_000;
}

function isMatchVisibility(value: unknown): value is MatchVisibility {
  return value === "public" || value === "followers" || value === "only_me";
}

function isSeatParticipantType(value: unknown): value is ArenaStageSeat["participantType"] {
  return value === "human" || value === "model" || value === "empty";
}

function parseActiveParticipantType(
  value: unknown,
): ArenaStageSeat["participantType"] | "environment" | null | undefined {
  return value === null ? null
    : isSeatParticipantType(value) || value === "environment" ? value
      : undefined;
}

function isWinner(value: unknown): value is "human" | "model" | "draw" | null {
  return value === null || value === "human" || value === "model" || value === "draw";
}

function isTurnPhase(value: unknown): value is PublicMobileArenaSession["turnPhase"] {
  return value === "human_turn"
    || value === "human_move_accepted"
    || value === "model_thinking"
    || value === "model_move_applied"
    || value === "completed";
}

function isTerminalReason(value: unknown): value is ArenaTerminalReason | null {
  return value === null
    || value === "normal"
    || value === "resignation"
    || value === "model_timeout_award"
    || value === "abandoned"
    || value === "model_unavailable";
}

function isModelTurnStatus(value: unknown): value is ArenaModelTurn["status"] {
  return value === "pending"
    || value === "thinking"
    || value === "keep_waiting_offer"
    || value === "claim_eligible";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function sessionPayloadStructurallySafe(value: unknown): boolean {
  const budget = { nodes: 0, bytes: 0 };
  return walkSessionPayload(
    value,
    0,
    budget,
    new WeakSet<object>(),
    undefined,
  );
}

function walkSessionPayload(
  value: unknown,
  depth: number,
  budget: { nodes: number; bytes: number },
  ancestors: WeakSet<object>,
  parentKey: string | undefined,
): boolean {
  budget.nodes += 1;
  if (depth > MAX_SESSION_DEPTH || budget.nodes > MAX_SESSION_NODES) return false;
  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  if (typeof value === "string") {
    budget.bytes += new TextEncoder().encode(value).byteLength;
    return budget.bytes <= MAX_RESPONSE_BYTES;
  }
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  let safe = true;
  if (Array.isArray(value)) {
    safe = value.length <= MAX_CONTAINER_ENTRIES
      && value.every((entry) => walkSessionPayload(
        entry,
        depth + 1,
        budget,
        ancestors,
        parentKey,
      ));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      safe = false;
    } else {
      const entries = Object.entries(value as Readonly<Record<string, unknown>>);
      safe = entries.length <= MAX_CONTAINER_ENTRIES && entries.every(([key, entry]) => {
        budget.bytes += new TextEncoder().encode(key).byteLength;
        return budget.bytes <= MAX_RESPONSE_BYTES
          && safeObjectKey(key)
          && !forbiddenSessionEvidenceKey(key, parentKey)
          && walkSessionPayload(entry, depth + 1, budget, ancestors, key);
      });
    }
  }
  ancestors.delete(value);
  return safe;
}

function forbiddenSessionEvidenceKey(
  key: string,
  parentKey: string | undefined,
): boolean {
  if (parentKey === "modelTurn" && key === "timeoutEvidenceAt") return false;
  return FORBIDDEN_SESSION_EVIDENCE_KEY.test(key);
}
