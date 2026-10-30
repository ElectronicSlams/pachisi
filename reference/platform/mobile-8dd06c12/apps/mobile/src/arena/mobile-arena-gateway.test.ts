import {
  MobileArenaGateway,
  parseActiveSessionEnvelope,
  parseMobileArenaSession,
  parsePublicMobileArenaSession,
  type ArenaActiveSessionSummary,
  type MobileArenaSession,
  type PublicMobileArenaSession,
} from "./mobile-arena-gateway";
import type { PendingIdentityIntent } from "@/auth/pending-identity-intent";

const uuid = "a11ce000-0000-4000-8000-000000000001";
const bedrockModelId = "amazon-aws/amazon.nova-pro-v1:0";

describe("mobile Arena gateway", () => {
  it("starts a match through the public API with a UUID idempotency key and Bedrock-safe model ids", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ ok: true, data: { existing: false, session: arenaSession({ modelId: bedrockModelId }) } }));
    const gateway = gatewayWith(fetcher);

    const result = await gateway.start(arenaIntent({
      modelEntryId: bedrockModelId,
      modelEntryVersionId: "model_amazon_nova_pro_v1",
      providerVersionString: "amazon.nova-pro-v1:0",
    }), uuid);

    expect(result.status).toBe("started");
    expect(result).toMatchObject({ startDisposition: "new" });
    expect(JSON.stringify(result)).not.toContain("mobileProvenance");
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.eslams.com/api/arena/sessions");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("omit");
    expect(init?.headers).toMatchObject({
      accept: "application/json",
      cookie: "eslams.session=mobile",
      "content-type": "application/json",
      "idempotency-key": uuid,
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      setupVersion: 2,
      gameSlug: "chess",
      modelId: bedrockModelId,
      matchVisibility: "public",
      humanPlayerId: "player_1",
      mode: "head_to_head",
      side: "first",
      seats: [
        { seatId: "player_1", participantType: "human", displayOrder: 0 },
        {
          seatId: "player_2",
          participantType: "model",
          modelId: bedrockModelId,
          modelEntryId: bedrockModelId,
          modelEntryVersionId: "model_amazon_nova_pro_v1",
          providerVersionString: "amazon.nova-pro-v1:0",
          displayOrder: 1,
        },
      ],
    });
  });

  it("serializes every exact table seat without collapsing per-seat model locks", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ ok: true, data: { existing: false, session: arenaSession({ gameSlug: "no-limit-texas-holdem" }) } }));
    const gateway = gatewayWith(fetcher);
    const model = {
      kind: "model" as const,
      modelEntryId: "openai/gpt-5-mini",
      modelEntryVersionId: "model_openai_gpt_5_mini_v1",
      providerVersionString: "gpt-5-mini-2026-07-01",
    };

    await expect(gateway.start({
      kind: "start-arena-match",
      setupVersion: 2,
      gameSlug: "no-limit-texas-holdem",
      seats: [
        { seatId: "player_1", participant: model },
        { seatId: "player_2", participant: { kind: "human" } },
        { seatId: "player_3", participant: model },
        { seatId: "player_4", participant: model },
      ],
      side: null,
      visibility: "followers",
    }, uuid)).resolves.toMatchObject({ status: "started" });

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      setupVersion: 2,
      gameSlug: "no-limit-texas-holdem",
      humanPlayerId: "player_2",
      matchVisibility: "followers",
      mode: "multi_seat",
      side: null,
    });
    expect(body.seats).toHaveLength(4);
  });

  it("parses active-session conflicts without leaking private evidence", async () => {
    const activeSession = activeSummary({ sessionId: "session_conflict" });
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({
        ok: false,
        error: {
          code: "active_arena_session_exists",
          details: { activeSession, mobileProvenance: { installationId: "private" } },
        },
      }, 409));
    const gateway = gatewayWith(fetcher);

    const result = await gateway.start(arenaIntent(), uuid);

    expect(result).toEqual({ status: "conflict", activeSession });
    expect(JSON.stringify(result)).not.toContain("mobileProvenance");
  });

  it("replaces the expected active session atomically with the durable start UUID", async () => {
    const replacement = arenaSession({ sessionId: "session_replacement" });
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({
        ok: true,
        data: { existing: false, session: replacement },
      }));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.replace("session_current", arenaIntent(), uuid)).resolves.toMatchObject({
      status: "started",
      session: { sessionId: "session_replacement" },
      startDisposition: "new",
    });
    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://api.eslams.com/api/arena/sessions/session_current/replace"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "idempotency-key": uuid }),
      }),
    );
  });

  it("hydrates the active summary and state from one strict runtime-session envelope", async () => {
    const activeSession = activeSummary();
    const session = arenaSession();
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ ok: true, data: { activeSession, session } }));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.runtimeSession()).resolves.toMatchObject({
      status: "ok",
      activeSession: { sessionId: "session_1" },
      session: { sessionId: "session_1" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toBe("https://api.eslams.com/api/arena/runtime-session");

    fetcher.mockResolvedValueOnce(jsonResponse({
      ok: true,
      data: { activeSession, session: arenaSession({ sessionId: "session_other" }) },
    }));
    await expect(gateway.runtimeSession()).resolves.toEqual({
      status: "failed",
      reason: "invalid_response",
    });
  });

  it("maps HTTP 401 to session expiry without discarding a safe server code", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({
        ok: false,
        error: { code: "session_expired" },
      }, 401));

    await expect(gatewayWith(fetcher).start(arenaIntent(), uuid)).resolves.toEqual({
      status: "failed",
      reason: "session_expired",
      code: "session_expired",
    });
  });

  it("preserves Retry-After and does not retry before the server window", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({
        ok: false,
        error: { code: "arena_engine_unavailable" },
      }, 503, { "retry-after": "7" }));

    await expect(gatewayWith(fetcher).start(arenaIntent(), uuid)).resolves.toEqual({
      status: "failed",
      reason: "network",
      code: "arena_engine_unavailable",
      retryAfterSeconds: 7,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("strictly projects the public Stage state and rejects private/provider evidence", () => {
    const parsed = parsePublicMobileArenaSession(publicSession({ modelId: bedrockModelId }));

    expect(parsed).toMatchObject({ sessionId: "session_1", modelId: bedrockModelId });
    expect(parsed?.legalActions).toEqual([expect.objectContaining({
      token: "e2-e4",
      disabledReason: null,
      value: { from: "e2", to: "e4" },
    })]);
    expect(parsed?.participantBySeat?.player_1).toMatchObject({ participantType: "human" });
    expect(JSON.stringify(parsed)).not.toContain("providerVersionString");
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      mobileProvenance: { installationId: "private" },
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      publicState: { board: [], providerReceipt: "private" },
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      publicState: { board: [], timeoutEvidenceAt: 100 },
    })).toBeNull();
    expect(parsePublicMobileArenaSession({ ...publicSession(), modelId: "../bad" })).toBeNull();
    expect(parseActiveSessionEnvelope({ ok: true, data: { activeSession: null } })).toEqual({
      status: "ok",
      activeSession: null,
    });
  });

  it("accepts the canonical model timeout timestamp without admitting arbitrary evidence", () => {
    const timeoutAt = 30_100;
    const parsed = parsePublicMobileArenaSession(publicSession({
      currentPlayer: "model",
      turnPhase: "model_thinking",
      activeSeatId: "player_2",
      activeParticipantType: "model",
      legalActions: [],
      totalLegalActions: 0,
      modelTurn: Object.freeze({
        status: "claim_eligible",
        startedAt: 100,
        thinkingAt: 100,
        keepWaitingOfferAt: 10_100,
        claimEligibleAt: timeoutAt,
        statusAt: timeoutAt,
        serverNow: timeoutAt,
        claimEligible: true,
        lateResponseFenced: true,
        timeoutEvidenceAt: timeoutAt,
      }),
    }));

    expect(parsed?.modelTurn).toEqual({
      status: "claim_eligible",
      startedAt: 100,
      thinkingAt: 100,
      keepWaitingOfferAt: 10_100,
      claimEligibleAt: timeoutAt,
      statusAt: timeoutAt,
      serverNow: timeoutAt,
      claimEligible: true,
      lateResponseFenced: true,
      timeoutEvidenceAt: timeoutAt,
    });
  });

  it("binds viewer-private Poker cards to the authenticated human seat, game, and turn", () => {
    const source = arenaSession({
      gameSlug: "no-limit-texas-holdem",
      moveNumber: 7,
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
    });

    expect(parseMobileArenaSession(source)?.viewerPrivate).toEqual({
      schemaVersion: "eslams.arena.viewer-private.v1",
      gameSlug: "no-limit-texas-holdem",
      playerId: "player_1",
      turn: 7,
      kind: "playing_cards",
      cards: ["AS", "KH"],
      cardsVisible: true,
      source: "hole",
    });
    expect(parsePublicMobileArenaSession(source)).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, playerId: "player_2" },
    })).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, turn: 6 },
    })).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, cards: ["AS", "AS"] },
    })).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, deck: ["2C"] },
    })).toBeNull();
  });

  it("parses all five Hanabi colors and both current Mahjong token forms without accepting extra evidence", () => {
    const hanabi = parseMobileArenaSession(arenaSession({
      gameSlug: "hanabi",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "hanabi",
        playerId: "player_1",
        turn: 0,
        kind: "hanabi_hand",
        cardCount: 5,
        cardsVisible: false,
        visiblePartnerCards: Object.freeze(["R1", "B2", "G3", "Y4", "W5"]),
      }),
    }));
    expect(hanabi?.viewerPrivate).toMatchObject({
      kind: "hanabi_hand",
      cardCount: 5,
      cardsVisible: false,
    });
    expect(JSON.stringify(hanabi)).not.toContain("ownCards");

    const mahjong = parseMobileArenaSession(arenaSession({
      gameSlug: "mahjong",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "mahjong",
        playerId: "player_1",
        turn: 0,
        kind: "mahjong_tiles",
        cards: Object.freeze(["B1", "1m", "2p", "3s", "east", "red", "red"]),
        cardsVisible: true,
        source: "hand",
      }),
    }));
    expect(mahjong?.viewerPrivate).toMatchObject({
      kind: "mahjong_tiles",
      cards: ["B1", "1m", "2p", "3s", "east", "red", "red"],
    });
    expect(parseMobileArenaSession({
      ...mahjong,
      viewerPrivate: {
        ...mahjong?.viewerPrivate,
        cards: ["red", "red", "red", "red", "red"],
      },
    })).toBeNull();
  });

  it("accepts every bounded API viewer-private inventory fixture and a strict optional commitment", () => {
    const fixtures = [
      {
        gameSlug: "blackjack",
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "blackjack",
          playerId: "player_1",
          turn: 0,
          kind: "playing_cards",
          cards: ["10", "11", "10"],
          cardsVisible: true,
          source: "player_hand",
        },
      },
      {
        gameSlug: "dou-dizhu",
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "dou-dizhu",
          playerId: "player_1",
          turn: 0,
          kind: "playing_cards",
          cards: ["AS", "BJ", "RJ"],
          cardsVisible: true,
          source: "hand",
        },
      },
      {
        gameSlug: "liars-dice",
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "liars-dice",
          playerId: "player_1",
          turn: 0,
          kind: "dice",
          values: [1, 3, 6, 6, 2],
        },
      },
      {
        gameSlug: "goofspiel",
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "goofspiel",
          playerId: "player_1",
          turn: 0,
          kind: "number_cards",
          values: [1, 4, 9, 13],
        },
      },
      {
        gameSlug: "battleship",
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "battleship",
          playerId: "player_1",
          turn: 0,
          kind: "battleship_fleet",
          ownShips: ["0,1", "0,2", "submarine:C4-C6"],
        },
      },
      ...["first-price-sealed-bid-auction", "bargaining", "negotiation"].map((gameSlug) => ({
        gameSlug,
        viewerPrivate: {
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug,
          playerId: "player_1",
          turn: 0,
          kind: "private_value",
          value: gameSlug === "first-price-sealed-bid-auction" ? 73 : 0.41,
          ...(gameSlug === "first-price-sealed-bid-auction" ? {
            sealedCommitment: { kind: "bid", token: "bid:52", label: "Bid 52 submitted" },
          } : {}),
        },
      })),
    ] as const;

    for (const fixture of fixtures) {
      const parsed = parseMobileArenaSession(arenaSession(fixture as Partial<MobileArenaSession>));
      expect(parsed?.viewerPrivate).toEqual(expect.objectContaining(fixture.viewerPrivate));
    }
  });

  it("keeps optional commitment parsing fail-closed and rejects cross-kind evidence", () => {
    const source = arenaSession({
      gameSlug: "rock-paper-scissors",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "rock-paper-scissors",
        playerId: "player_1",
        turn: 0,
        kind: "none",
        sealedCommitment: Object.freeze({ kind: "choice" as const, token: "rock", label: "Rock submitted" }),
      }),
    });
    expect(parseMobileArenaSession(source)?.viewerPrivate).toMatchObject({
      kind: "none",
      sealedCommitment: { kind: "choice", token: "rock", label: "Rock submitted" },
    });
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, sealedCommitment: { kind: "choice", token: "rock", label: "Rock", rawAction: "rock" } },
    })).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: { ...source.viewerPrivate, rawCommitment: "rock" },
    })).toBeNull();
    expect(parseMobileArenaSession({
      ...source,
      viewerPrivate: {
        ...source.viewerPrivate,
        sealedCommitment: { kind: "bid", token: "bid:10", label: "Bid 10 submitted" },
      },
    })).toBeNull();

    const prisonersDilemma = arenaSession({
      gameSlug: "prisoners-dilemma",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "prisoners-dilemma",
        playerId: "player_1",
        turn: 0,
        kind: "none",
        sealedCommitment: Object.freeze({
          kind: "choice" as const,
          token: "cooperate",
          label: "Cooperate submitted",
        }),
      }),
    });
    expect(parseMobileArenaSession(prisonersDilemma)?.viewerPrivate).toMatchObject({
      sealedCommitment: { kind: "choice", token: "cooperate", label: "Cooperate submitted" },
    });

    const goofspiel = arenaSession({
      gameSlug: "goofspiel",
      viewerPrivate: Object.freeze({
        schemaVersion: "eslams.arena.viewer-private.v1",
        gameSlug: "goofspiel",
        playerId: "player_1",
        turn: 0,
        kind: "number_cards",
        values: Object.freeze([1, 2, 3]),
        sealedCommitment: Object.freeze({ kind: "card", token: "play:2", label: "Card 2 submitted" }),
      }),
    });
    expect(parseMobileArenaSession(goofspiel)?.viewerPrivate).toMatchObject({
      sealedCommitment: { kind: "card", token: "play:2", label: "Card 2 submitted" },
    });
    expect(parseMobileArenaSession({
      ...goofspiel,
      viewerPrivate: {
        ...goofspiel.viewerPrivate,
        kind: "none",
      },
    })).toBeNull();
  });

  it("fails closed on invalid Blackjack, Hanabi, Mahjong, ship, and commitment tokens", () => {
    const invalidCases = [
      arenaSession({
        gameSlug: "blackjack",
        viewerPrivate: Object.freeze({
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "blackjack",
          playerId: "player_1",
          turn: 0,
          kind: "playing_cards",
          cards: Object.freeze(["12"]),
          cardsVisible: true,
          source: "player_hand",
        }),
      }),
      arenaSession({
        gameSlug: "hanabi",
        viewerPrivate: Object.freeze({
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "hanabi",
          playerId: "player_1",
          turn: 0,
          kind: "hanabi_hand",
          cardCount: 5,
          cardsVisible: false,
          visiblePartnerCards: Object.freeze(["P3"]),
        }),
      }),
      arenaSession({
        gameSlug: "mahjong",
        viewerPrivate: Object.freeze({
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "mahjong",
          playerId: "player_1",
          turn: 0,
          kind: "mahjong_tiles",
          cards: Object.freeze(["dragon"]),
          cardsVisible: true,
          source: "hand",
        }),
      }),
      arenaSession({
        gameSlug: "battleship",
        viewerPrivate: Object.freeze({
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "battleship",
          playerId: "player_1",
          turn: 0,
          kind: "battleship_fleet",
          ownShips: Object.freeze(["\u0000private"]),
        }),
      }),
      arenaSession({
        gameSlug: "rock-paper-scissors",
        viewerPrivate: Object.freeze({
          schemaVersion: "eslams.arena.viewer-private.v1",
          gameSlug: "rock-paper-scissors",
          playerId: "player_1",
          turn: 0,
          kind: "none",
          sealedCommitment: Object.freeze({
            kind: "choice" as const,
            token: "rock\nsecret",
            label: "Rock submitted",
          }),
        }),
      }),
    ];
    for (const invalid of invalidCases) expect(parseMobileArenaSession(invalid)).toBeNull();
  });

  it("rejects malformed, oversized, and deeply nested Stage projections", () => {
    const { stageProjectionVersion: _stageProjectionVersion, ...unversioned } = publicSession();
    expect(parsePublicMobileArenaSession(unversioned)).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      legalActions: [{ token: "e2-e4", label: "Move", disabledReason: 42 }],
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      legalActions: Array.from({ length: 513 }, (_, index) => ({ token: `move-${index}`, label: "Move" })),
      totalLegalActions: 513,
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      publicState: nestedObject(20),
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...publicSession(),
      publicState: { board: Array.from({ length: 4_097 }, () => null) },
    })).toBeNull();
  });

  it("rejects inconsistent seats, participants, timing, outcome, and hashes", () => {
    const source = publicSession();
    expect(parsePublicMobileArenaSession({
      ...source,
      activeSeatId: "player_2",
      activeParticipantType: "human",
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...source,
      participantBySeat: { ...source.participantBySeat, player_2: { ...source.seats?.[1], label: "Mismatch" } },
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...source,
      stateHash: "sha256:not-a-digest",
    })).toBeNull();
    expect(parsePublicMobileArenaSession({
      ...source,
      turnTelemetry: { modelTurnStartedAt: 200, modelTurnCompletedAt: 199 },
    })).toBeNull();
  });

  it("retries a transient start at most once with the caller's unchanged idempotency key", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { existing: true, session: arenaSession() } }, 201));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.start(arenaIntent(), uuid)).resolves.toMatchObject({
      status: "started",
      startDisposition: "existing",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([, init]) => (
      init?.headers as Readonly<Record<string, string>> | undefined
    )?.["idempotency-key"])).toEqual([uuid, uuid]);
  });

  it("requires UUIDv4 keys for every mutation before making a request", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    const gateway = gatewayWith(fetcher);
    const badKey = "not-an-idempotency-key";

    await expect(gateway.start(arenaIntent(), badKey)).resolves.toEqual({ status: "failed", reason: "rejected" });
    await expect(gateway.action("session_1", "e2-e4", 0, badKey)).resolves.toEqual({
      status: "failed",
      reason: "rejected",
    });
    await expect(gateway.end("session_1", badKey)).resolves.toEqual({ status: "failed", reason: "rejected" });
    await expect(gateway.resign("session_1", badKey)).resolves.toEqual({ status: "failed", reason: "rejected" });
    await expect(gateway.claimTimeoutAward("session_1", badKey)).resolves.toEqual({ status: "failed", reason: "rejected" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the expected move precondition and retries the exact action command", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(jsonResponse({
        ok: true,
        data: { session: arenaSession({ moveNumber: 1, updatedAt: 121 }) },
      }));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.action("session_1", "e2-e4", 0, uuid)).resolves.toMatchObject({
      status: "ok",
      session: { moveNumber: 1 },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const commands = fetcher.mock.calls.map(([url, init]) => ({
      body: init?.body,
      idempotencyKey: (
        init?.headers as Readonly<Record<string, string>> | undefined
      )?.["idempotency-key"],
      url: String(url),
    }));
    expect(commands).toEqual([
      {
        body: JSON.stringify({ action: "e2-e4", expectedMoveNumber: 0, responseMode: "async" }),
        idempotencyKey: uuid,
        url: "https://api.eslams.com/api/arena/sessions/session_1/action",
      },
      {
        body: JSON.stringify({ action: "e2-e4", expectedMoveNumber: 0, responseMode: "async" }),
        idempotencyKey: uuid,
        url: "https://api.eslams.com/api/arena/sessions/session_1/action",
      },
    ]);
  });

  it("patches one exact persisted-result visibility command with mobile auth", async () => {
    const completed = arenaSession({
      activeParticipantType: null,
      activeSeatId: null,
      currentPlayer: "model",
      legalActions: Object.freeze([]),
      matchVisibility: "followers",
      resultPublication: Object.freeze({
        status: "ready",
        matchId: "session_1",
        replayId: "replay_session_1",
        savedToProfile: true,
      }),
      resultRevision: 2,
      status: "completed",
      terminalReason: "normal",
      turnPhase: "completed",
      winner: "human",
      winnerSeatId: "player_1",
    });
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({ ok: true, data: { session: completed } }));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.visibility("session_1", "followers", uuid)).resolves.toMatchObject({
      status: "ok",
      session: { matchVisibility: "followers", resultRevision: 2 },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.eslams.com/api/arena/sessions/session_1/visibility");
    expect(init).toMatchObject({
      body: JSON.stringify({ matchVisibility: "followers" }),
      cache: "no-store",
      credentials: "omit",
      method: "PATCH",
      headers: expect.objectContaining({
        cookie: "eslams.session=mobile",
        "idempotency-key": uuid,
      }),
    });
  });

  it.each([408, 425, 429, 500])(
    "classifies HTTP %i as ambiguous so callers retain mutation identity",
    async (status) => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>()
      .mockResolvedValue(jsonResponse({
        ok: false,
        error: { code: "arena_engine_unavailable" },
      }, status));
    const gateway = gatewayWith(fetcher);

    await expect(gateway.resign("session_1", uuid)).resolves.toEqual({
      status: "failed",
      reason: "network",
      code: "arena_engine_unavailable",
    });
    },
  );

  it("rejects invalid expected move preconditions before making a request", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    const gateway = gatewayWith(fetcher);

    for (const expectedMoveNumber of [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(
        gateway.action("session_1", "e2-e4", expectedMoveNumber, uuid),
      ).resolves.toEqual({ status: "failed", reason: "rejected" });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed when the Better Auth cookie is absent or unsafe", async () => {
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
    for (const cookie of ["", "session=ok\r\nx-private: leaked"]) {
      const gateway = new MobileArenaGateway({
        apiOrigin: "https://api.eslams.com",
        fetcher,
        getAuthCookie: () => cookie,
        randomUUID: () => uuid,
      });
      await expect(gateway.activeSession()).resolves.toEqual({
        status: "failed",
        reason: "session_not_ready",
      });
    }
    const throwingGateway = new MobileArenaGateway({
      apiOrigin: "https://api.eslams.com",
      fetcher,
      getAuthCookie: () => { throw new Error("secure storage unavailable"); },
      randomUUID: () => uuid,
    });
    await expect(throwingGateway.activeSession()).resolves.toEqual({
      status: "failed",
      reason: "session_not_ready",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

function gatewayWith(fetcher: typeof fetch): MobileArenaGateway {
  return new MobileArenaGateway({
    apiOrigin: "https://api.eslams.com",
    fetcher,
    getAuthCookie: () => "eslams.session=mobile",
    randomUUID: () => uuid,
  });
}

function arenaIntent(model: Readonly<{
  modelEntryId: string;
  modelEntryVersionId: string;
  providerVersionString: string;
}> = {
  modelEntryId: "openai/gpt-5-mini",
  modelEntryVersionId: "model_openai_gpt_5_mini_v1",
  providerVersionString: "gpt-5-mini-2026-07-01",
}): Extract<PendingIdentityIntent, { kind: "start-arena-match" }> {
  return Object.freeze({
    kind: "start-arena-match",
    setupVersion: 2,
    gameSlug: "chess",
    seats: Object.freeze([
      Object.freeze({ seatId: "player_1", participant: Object.freeze({ kind: "human" as const }) }),
      Object.freeze({ seatId: "player_2", participant: Object.freeze({ kind: "model" as const, ...model }) }),
    ]),
    side: "first",
    visibility: "public",
  });
}

function jsonResponse(
  value: unknown,
  status = 200,
  headers: Readonly<Record<string, string>> = Object.freeze({}),
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function arenaSession(overrides: Partial<MobileArenaSession> = {}): MobileArenaSession {
  const { viewerPrivate = null, ...publicOverrides } = overrides;
  return Object.freeze({
    ...publicSession(publicOverrides),
    viewerPrivate,
  }) as MobileArenaSession;
}

function publicSession(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
  const seats = Object.freeze([
    Object.freeze({
      seatId: "player_1",
      participantType: "human" as const,
      modelId: null,
      label: "You",
      displayOrder: 0,
      teamId: null,
    }),
    Object.freeze({
      seatId: "player_2",
      participantType: "model" as const,
      modelId: "openai/gpt-5-mini",
      label: "GPT-5 mini",
      displayOrder: 1,
      teamId: null,
    }),
  ]);
  return Object.freeze({
    sessionId: "session_1",
    gameSlug: "chess",
    modelId: "openai/gpt-5-mini",
    status: "active",
    currentPlayer: "human",
    turnPhase: "human_turn",
    terminalReason: null,
    lastAcceptedHumanActionAt: 100,
    inactivityExpiresAt: 10_100,
    modelTurn: null,
    moveNumber: 0,
    updatedAt: 120,
    stageProjectionVersion: 1,
    mode: "head_to_head",
    seats,
    participantBySeat: Object.freeze({ player_1: seats[0]!, player_2: seats[1]! }),
    activeSeatId: "player_1",
    activeParticipantType: "human",
    humanPlayerId: "player_1",
    matchVisibility: "public",
    legalActions: Object.freeze([Object.freeze({
      token: "e2-e4",
      label: "Move e2 to e4",
      shortLabel: "e4",
      verb: "move",
      object: "pawn",
      category: "move",
      group: "legal",
      sortKey: "001",
      promptLabel: "Move pawn to e4",
      confirm: false,
      disabledReason: null,
      value: Object.freeze({ from: "e2", to: "e4" }),
    })]),
    totalLegalActions: 1,
    publicState: Object.freeze({ board: Object.freeze(Array.from({ length: 64 }, () => null)), rows: 8, cols: 8 }),
    renderHints: Object.freeze({}),
    displayFrame: null,
    coreTiming: Object.freeze({ engineMs: 4 }),
    scores: Object.freeze({ player_1: 0, player_2: 0 }),
    outcome: null,
    stateHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    winner: null,
    winnerSeatId: null,
    turnTelemetry: Object.freeze({
      responseMode: "async",
      action: null,
      phase: null,
      humanActionReceivedAt: null,
      humanActionAppliedAt: null,
      humanEngineValidationMs: null,
      modelTurnStartedAt: null,
      modelTurnCompletedAt: null,
      modelBackgroundQueueMs: null,
      modelDecisionMs: null,
      modelEngineValidationMs: null,
      modelProviderLatencyMs: null,
      totalTurnMs: null,
    }),
    createdAt: 90,
    ...overrides,
  });
}

function nestedObject(depth: number): Readonly<Record<string, unknown>> {
  let value: Readonly<Record<string, unknown>> = Object.freeze({ leaf: true });
  for (let index = 0; index < depth; index += 1) value = Object.freeze({ child: value });
  return value;
}

function activeSummary(overrides: Partial<ArenaActiveSessionSummary> = {}): ArenaActiveSessionSummary {
  return Object.freeze({
    sessionId: "session_1",
    clientChannel: "mobile",
    status: "active",
    startedAt: 10,
    lastActionAt: 100,
    expiresAt: 10_100,
    updatedAt: 110,
    ...overrides,
  });
}
