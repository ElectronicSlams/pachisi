import {
  PENDING_IDENTITY_INTENT_STORAGE_KEY,
  PendingIdentityIntentCoordinator,
  PendingIdentityIntentRepository,
  pendingIdentityIntentsEqual,
} from "@/auth/pending-identity-intent";

import {
  createHumanArenaMatchIntent,
  createHeadToHeadArenaPreparedSetup,
  matchesPinnedArenaIntent,
  parseHumanArenaMatchHandoff,
} from "./arena-human-match-start";

jest.mock("@/auth/pending-identity-intent-runtime", () => ({
  pendingIdentityIntentRepository: { prepare: jest.fn() },
}));

describe("human Arena authenticated handoff", () => {
  it("builds and reparses the exact authoritative match context", () => {
    const intent = createHumanArenaMatchIntent(headToHeadSetup("connect-four"));
    expect(intent).toEqual({
      kind: "start-arena-match",
      setupVersion: 2,
      gameSlug: "connect-four",
      seats: [
        { seatId: "player_1", participant: { kind: "human" } },
        { seatId: "player_2", participant: lockedModel },
      ],
      side: "first",
      visibility: "only_me",
    });
    expect(parseHumanArenaMatchHandoff(JSON.stringify(intent))).toEqual(intent);
    expect(parseHumanArenaMatchHandoff(JSON.stringify({ ...intent, firebaseIdToken: "must-not-pass" }))).toBeNull();
    expect(parseHumanArenaMatchHandoff("{".repeat(20_000))).toBeNull();
  });

  it("pins a second-side human to seat B without changing the exact model", () => {
    expect(createHumanArenaMatchIntent(headToHeadSetup("chess", "second", "followers"))).toEqual({
      kind: "start-arena-match",
      setupVersion: 2,
      gameSlug: "chess",
      seats: [
        { seatId: "player_1", participant: lockedModel },
        { seatId: "player_2", participant: { kind: "human" } },
      ],
      side: "second",
      visibility: "followers",
    });
  });

  it("rejects legacy mutable-model construction instead of guessing a version", () => {
    expect(() => createHumanArenaMatchIntent("chess", "openai/gpt-5"))
      .toThrow("exact locked Arena setup is required");
  });

  it("does not resume or clear a replacement intent during an async handoff race", async () => {
    const values = new Map<string, string>();
    const ids = [
      "a11ce000-0000-4000-8000-000000000201",
      "a11ce000-0000-4000-8000-000000000202",
    ];
    const repository = new PendingIdentityIntentRepository({
      getString: (key) => values.get(key),
      remove: (key) => { values.delete(key); },
      set: (key, value) => { values.set(key, value); },
    }, {
      now: () => 1_800_000_000_000,
      randomUUID: () => ids.shift() ?? "a11ce000-0000-4000-8000-000000000203",
    });
    const original = repository.prepare(createHumanArenaMatchIntent(headToHeadSetup("connect-four")));
    if (original.intent.kind !== "start-arena-match") throw new Error("expected match intent");
    const pin = { recordId: original.id, intent: original.intent } as const;
    expect(matchesPinnedArenaIntent(repository.peek(), pin)).toBe(true);

    const replacement = repository.prepare(createHumanArenaMatchIntent(headToHeadSetup("chess")));
    expect(matchesPinnedArenaIntent(repository.peek(), pin)).toBe(false);
    const coordinator = new PendingIdentityIntentCoordinator(repository);
    let started = false;
    await expect(coordinator.resume(async (intent) => {
      if (!matchesPinnedArenaIntent(repository.peek(), pin)
        || !pendingIdentityIntentsEqual(intent, pin.intent)) {
        throw new Error("pinned Arena intent changed");
      }
      started = true;
    })).resolves.toMatchObject({ status: "failed", recordId: replacement.id });
    expect(started).toBe(false);
    expect(repository.peek()).toEqual(replacement);
    expect(values.has(PENDING_IDENTITY_INTENT_STORAGE_KEY)).toBe(true);
  });
});

const lockedModel = Object.freeze({
  kind: "model" as const,
  modelEntryId: "openai/gpt-5",
  modelEntryVersionId: "model_openai_gpt_5_v1",
  providerVersionString: "gpt-5-2026-07-01",
});

function headToHeadSetup(
  gameSlug: string,
  side: "first" | "second" = "first",
  visibility: "public" | "followers" | "only_me" = "only_me",
) {
  return createHeadToHeadArenaPreparedSetup({ gameSlug, model: lockedModel, side, visibility });
}
