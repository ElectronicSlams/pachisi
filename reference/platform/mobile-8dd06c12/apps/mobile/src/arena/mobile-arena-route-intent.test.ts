import {
  mobileArenaRouteModelIntent,
  mobileArenaRouteProviderIntent,
} from "./mobile-arena-route-intent";

describe("mobileArenaRouteModelIntent", () => {
  it("keeps legacy model-only routes in ordinary Arena selection", () => {
    expect(mobileArenaRouteModelIntent({ model: "provider/model" })).toEqual({
      kind: "ordinary",
      modelEntryId: "provider/model",
    });
  });

  it("accepts the canonical 192-character exact version bound", () => {
    const version = `v${"a".repeat(191)}`;
    expect(mobileArenaRouteModelIntent({
      humanRatingChallenge: "1",
      model: "provider/model",
      modelVersion: version,
    })).toEqual({
      kind: "exact_human_rating_challenge",
      modelEntryId: "provider/model",
      modelEntryVersionId: version,
      valid: true,
    });
  });

  it.each([
    { humanRatingChallenge: "1", model: "provider/model" },
    { model: "provider/model", modelVersion: "version:one" },
    { humanRatingChallenge: "0", model: "provider/model", modelVersion: "version:one" },
    { humanRatingChallenge: "1", model: "provider/model", modelVersion: `v${"a".repeat(192)}` },
  ])("keeps malformed or partial exact challenge params fail-closed: %o", (params) => {
    const result = mobileArenaRouteModelIntent(params);
    expect(result.kind).toBe("exact_human_rating_challenge");
    if (result.kind === "exact_human_rating_challenge") expect(result.valid).toBe(false);
  });

  it("accepts only canonical provider notification destinations", () => {
    expect(mobileArenaRouteProviderIntent("openai")).toBe("openai");
    expect(mobileArenaRouteProviderIntent("aws-bedrock")).toBe("aws-bedrock");
    expect(mobileArenaRouteProviderIntent("../private")).toBeNull();
    expect(mobileArenaRouteProviderIntent(["openai"])).toBeNull();
  });
});
