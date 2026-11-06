import { mobileArenaDefaultVisibility } from "./mobile-arena-default-visibility";

describe("mobile Arena default visibility", () => {
  it("uses a valid profile default and fails closed to Only me", () => {
    expect(mobileArenaDefaultVisibility("public")).toBe("public");
    expect(mobileArenaDefaultVisibility("followers")).toBe("followers");
    expect(mobileArenaDefaultVisibility("only_me")).toBe("only_me");
    expect(mobileArenaDefaultVisibility("private")).toBe("only_me");
    expect(mobileArenaDefaultVisibility(undefined)).toBe("only_me");
  });
});
