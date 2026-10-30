import type {
  PendingIdentityIntent,
  PendingIdentityIntentRecord,
} from "@/auth/pending-identity-intent";

import {
  ArenaIntentStartCoordinator,
  type ArenaIntentRepositoryPort,
} from "./arena-intent-start";
import type {
  ArenaActiveSessionSummary,
  ArenaStartResult,
  MobileArenaGateway,
  PublicMobileArenaSession,
} from "./mobile-arena-gateway";

jest.mock("@/auth/pending-identity-intent-runtime", () => ({
  pendingIdentityIntentRepository: { prepare: jest.fn() },
}));

type ArenaIntent = Extract<PendingIdentityIntent, { kind: "start-arena-match" }>;

const uuid1 = "a11ce000-0000-4000-8000-000000000001";
const uuid2 = "a11ce000-0000-4000-8000-000000000002";

describe("Arena intent start coordinator", () => {
  it("single-flights one durable intent, reuses its UUID, and clears only after start succeeds", async () => {
    const repository = mutableRepository(record(uuid1));
    let resolveStart!: (result: ArenaStartResult) => void;
    const gateway: Pick<MobileArenaGateway, "replace" | "start"> = {
      replace: jest.fn(),
      start: jest.fn(() => new Promise<ArenaStartResult>((resolve) => { resolveStart = resolve; })),
    };
    const coordinator = new ArenaIntentStartCoordinator(repository, gateway);
    const pin = { recordId: uuid1, intent } as const;

    const first = coordinator.claim(pin);
    const second = coordinator.claim(pin);

    expect(second).toBe(first);
    expect(gateway.start).toHaveBeenCalledTimes(1);
    expect(gateway.start).toHaveBeenCalledWith(intent, uuid1);
    resolveStart({ status: "started", session: publicSession(), startDisposition: "new" });
    await expect(first).resolves.toEqual({ status: "started", session: publicSession(), startDisposition: "new" });
    expect(repository.clearIf).toHaveBeenCalledWith(uuid1);
    expect(repository.peek()).toBeNull();
  });

  it("retains a conflicted intent for explicit resume or atomic replacement", async () => {
    const repository = mutableRepository(record(uuid1));
    const activeSession = activeSummary({ sessionId: "session_existing" });
    const gateway: Pick<MobileArenaGateway, "replace" | "start"> = {
      replace: jest.fn().mockResolvedValue({
        status: "started",
        session: publicSession({ sessionId: "session_new" }),
        startDisposition: "new",
      }),
      start: jest.fn().mockResolvedValueOnce({ status: "conflict", activeSession }),
    };
    const coordinator = new ArenaIntentStartCoordinator(repository, gateway);
    const pin = { recordId: uuid1, intent } as const;

    await expect(coordinator.claim(pin)).resolves.toEqual({ status: "conflict", activeSession });
    expect(repository.peek()).not.toBeNull();
    await expect(coordinator.replaceCurrent(pin, activeSession)).resolves.toEqual({
      status: "started",
      session: publicSession({ sessionId: "session_new" }),
      startDisposition: "new",
    });
    expect(gateway.replace).toHaveBeenCalledWith("session_existing", intent, uuid1);
    expect(gateway.start).toHaveBeenCalledTimes(1);
    expect(repository.peek()).toBeNull();
  });

  it("reuses the durable intent UUID after process death and an ambiguous start", async () => {
    const repository = mutableRepository(record(uuid1));
    const gateway: Pick<MobileArenaGateway, "replace" | "start"> = {
      replace: jest.fn(),
      start: jest.fn()
        .mockResolvedValueOnce({ status: "failed", reason: "network" })
        .mockResolvedValueOnce({
          status: "started",
          session: publicSession(),
          startDisposition: "existing",
        }),
    };
    const pin = { recordId: uuid1, intent } as const;

    await expect(new ArenaIntentStartCoordinator(repository, gateway).claim(pin))
      .resolves.toEqual({ status: "failed", reason: "network" });
    await expect(new ArenaIntentStartCoordinator(repository, gateway).claim(pin))
      .resolves.toMatchObject({ status: "started", startDisposition: "existing" });
    expect(gateway.start).toHaveBeenNthCalledWith(1, intent, uuid1);
    expect(gateway.start).toHaveBeenNthCalledWith(2, intent, uuid1);
  });

  it("refuses stale handoffs without starting or clearing a replacement intent", async () => {
    const replacement = record(uuid2, { gameSlug: "go" });
    const repository = mutableRepository(replacement);
    const gateway: Pick<MobileArenaGateway, "replace" | "start"> = {
      replace: jest.fn(),
      start: jest.fn(),
    };
    const coordinator = new ArenaIntentStartCoordinator(repository, gateway);

    await expect(coordinator.claim({ recordId: uuid1, intent })).resolves.toEqual({ status: "invalid_handoff" });
    expect(gateway.start).not.toHaveBeenCalled();
    expect(repository.peek()).toBe(replacement);
    expect(coordinator.resumeCurrent({ recordId: uuid1, intent }, activeSummary())).toBeNull();
    expect(repository.peek()).toBe(replacement);
  });
});

const intent: ArenaIntent = Object.freeze({
  kind: "start-arena-match",
  setupVersion: 2,
  gameSlug: "chess",
  seats: Object.freeze([
    Object.freeze({ seatId: "player_1", participant: Object.freeze({ kind: "human" as const }) }),
    Object.freeze({
      seatId: "player_2",
      participant: Object.freeze({
        kind: "model" as const,
        modelEntryId: "openai/gpt-5-mini",
        modelEntryVersionId: "model_openai_gpt_5_mini_v1",
        providerVersionString: "gpt-5-mini-2026-07-01",
      }),
    }),
  ]),
  side: "first",
  visibility: "public",
});

function mutableRepository(initial: PendingIdentityIntentRecord | null): ArenaIntentRepositoryPort {
  let current = initial;
  return {
    clearIf: jest.fn((recordId: string) => {
      if (current?.id === recordId) current = null;
    }),
    peek: jest.fn(() => current),
  };
}

function record(id: string, overrides: Partial<ArenaIntent> = {}): PendingIdentityIntentRecord {
  return Object.freeze({
    version: 1,
    id,
    createdAt: 10,
    expiresAt: 20,
    intent: Object.freeze({ ...intent, ...overrides }),
  });
}

function publicSession(overrides: Partial<PublicMobileArenaSession> = {}): PublicMobileArenaSession {
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
    ...overrides,
  });
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
