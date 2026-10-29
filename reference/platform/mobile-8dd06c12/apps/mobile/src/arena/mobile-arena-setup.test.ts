import { GAME_CATALOG_BY_SLUG } from "@eslams/core-types";
import type { MobileSearchModelFacts } from "@eslams/search-contract";

import {
  mobileArenaPreparedSetup,
  mobileArenaSeatSubtitle,
  mobileArenaSeatTitle,
} from "./mobile-arena-setup";

const model: MobileSearchModelFacts = Object.freeze({
  modelEntryId: "openai/gpt-5",
  modelEntryVersionId: "model-version-1",
  providerSlug: "openai",
  providerName: "OpenAI",
  providerLogoUrl: "https://eslams.com/assets/providers/openai.svg",
  modelSlug: "gpt-5",
  providerVersionString: "gpt-5-2026-07-01",
  publicName: "GPT-5",
  family: "GPT",
  turnSpeed: "ready",
  availability: "available",
  allowedGames: ["*"],
  followState: "unknown",
});

describe("mobile Arena setup", () => {
  it("freezes exact model versions for every non-human table seat", () => {
    const game = GAME_CATALOG_BY_SLUG["no-limit-texas-holdem"]!;
    const setup = mobileArenaPreparedSetup(
      game,
      "player_1",
      { player_1: null, player_2: model, player_3: model, player_4: model },
      "followers",
    );
    expect(setup).toEqual({
      setupVersion: 2,
      gameSlug: "no-limit-texas-holdem",
      humanSeatId: "player_1",
      seats: [
        { seatId: "player_1", participant: { kind: "human" } },
        { seatId: "player_2", participant: {
          kind: "model",
          modelEntryId: "openai/gpt-5",
          modelEntryVersionId: "model-version-1",
          providerVersionString: "gpt-5-2026-07-01",
        } },
        { seatId: "player_3", participant: {
          kind: "model",
          modelEntryId: "openai/gpt-5",
          modelEntryVersionId: "model-version-1",
          providerVersionString: "gpt-5-2026-07-01",
        } },
        { seatId: "player_4", participant: {
          kind: "model",
          modelEntryId: "openai/gpt-5",
          modelEntryVersionId: "model-version-1",
          providerVersionString: "gpt-5-2026-07-01",
        } },
      ],
      visibility: "followers",
    });
  });

  it("fails closed when a seat is missing or a model is incompatible", () => {
    const game = GAME_CATALOG_BY_SLUG.chess!;
    expect(mobileArenaPreparedSetup(game, "player_1", { player_1: null }, "public")).toBeNull();
    expect(mobileArenaPreparedSetup(
      game,
      "player_1",
      { player_1: null, player_2: { ...model, allowedGames: ["go"] } },
      "public",
    )).toBeNull();
  });

  it("uses product-facing seat titles rather than raw topology ids", () => {
    const chess = GAME_CATALOG_BY_SLUG.chess!;
    const bridge = GAME_CATALOG_BY_SLUG.bridge!;
    expect(mobileArenaSeatTitle(chess, "player_1")).toBe("First");
    expect(mobileArenaSeatSubtitle(chess, "player_2")).toBe("Seat B");
    expect(mobileArenaSeatTitle(bridge, "player_1")).toBe("South");
    expect(mobileArenaSeatTitle(bridge, "player_4")).toBe("East");
  });
});
