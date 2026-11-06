import type { MobileSearchModelFacts } from "@eslams/search-contract";

import { mobileArenaPreferredRosterModel } from "./mobile-arena-roster-contract";

describe("mobileArenaPreferredRosterModel", () => {
  it("locks an explicit ratings challenge to the requested entry and exact version", () => {
    const older = model("entry:model", "version:older");
    const rated = model("entry:model", "version:rated");

    expect(mobileArenaPreferredRosterModel(
      [older, rated],
      "chess",
      rated.modelEntryId,
      rated.modelEntryVersionId,
      true,
    )).toBe(rated);
  });

  it("fails closed instead of substituting another version for an exact challenge", () => {
    const replacement = model("entry:model", "version:replacement");

    expect(mobileArenaPreferredRosterModel(
      [replacement],
      "chess",
      replacement.modelEntryId,
      "version:rated",
      true,
    )).toBeNull();
  });

  it("fails closed when an exact challenge omits its version identity", () => {
    const current = model("entry:model", "version:current");

    expect(mobileArenaPreferredRosterModel(
      [current],
      "chess",
      current.modelEntryId,
      null,
      true,
    )).toBeNull();
  });

  it("preserves the ordinary Arena compatible fallback outside exact challenge intents", () => {
    const compatible = model("entry:available", "version:one");

    expect(mobileArenaPreferredRosterModel(
      [compatible],
      "chess",
      "entry:missing",
      null,
      false,
    )).toBe(compatible);
  });

  it("uses the approved ready quick-match opponent instead of API list order", () => {
    const technicalFirst = model(
      "anthropic/anthropic.claude-3-5-haiku-20241022-v1:0",
      "version:technical",
    );
    const approvedDefault = model("openai/gpt-5-mini", "version:gpt-5-mini");

    expect(mobileArenaPreferredRosterModel(
      [technicalFirst, approvedDefault],
      "chess",
      null,
      null,
      false,
    )).toBe(approvedDefault);
  });

  it("prefers the current certified default over the older o4 fallback", () => {
    const olderFallback = model("openai/o4-mini", "version:o4");
    const certifiedDefault = model("openai/gpt-5-mini", "version:gpt-5-mini");

    expect(mobileArenaPreferredRosterModel(
      [olderFallback, certifiedDefault],
      "chess",
      null,
      null,
      false,
    )).toBe(certifiedDefault);
  });

  it("falls back to the first ready compatible model when preferred defaults are absent", () => {
    const slower = model("provider/slower", "version:slower", "slower_turns");
    const ready = model("provider/ready", "version:ready");

    expect(mobileArenaPreferredRosterModel(
      [slower, ready],
      "chess",
      null,
      null,
      false,
    )).toBe(ready);
  });
});

function model(
  modelEntryId: string,
  modelEntryVersionId: string,
  turnSpeed: MobileSearchModelFacts["turnSpeed"] = "ready",
): MobileSearchModelFacts {
  return Object.freeze({
    modelEntryId,
    modelEntryVersionId,
    providerSlug: "provider",
    providerName: "Provider",
    providerLogoUrl: null,
    modelSlug: "model",
    providerVersionString: modelEntryVersionId,
    publicName: "Model",
    family: "Model",
    turnSpeed,
    availability: "available",
    allowedGames: ["chess"],
    followState: "unknown",
  });
}
