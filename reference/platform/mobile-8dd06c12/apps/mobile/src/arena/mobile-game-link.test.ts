import { mobileGameLinkDestination } from "./mobile-game-link";

describe("mobile game links", () => {
  it("opens playable games in the Arena setup sheet", () => {
    expect(mobileGameLinkDestination("connect-four")).toEqual({
      surface: "arena",
      gameSlug: "connect-four",
    });
  });

  it("routes both mobile exclusions to watch-only Battlefield discovery", () => {
    expect(mobileGameLinkDestination("leduc-holdem")).toEqual({
      surface: "battlefield",
      gameSlug: "leduc-holdem",
    });
    expect(mobileGameLinkDestination("shedding-card-game")).toEqual({
      surface: "battlefield",
      gameSlug: "shedding-card-game",
    });
  });

  it("fails closed to Arena home for invalid games", () => {
    expect(mobileGameLinkDestination("../private")).toEqual({ surface: "arena_home" });
    expect(mobileGameLinkDestination("x".repeat(81))).toEqual({ surface: "arena_home" });
  });
});
