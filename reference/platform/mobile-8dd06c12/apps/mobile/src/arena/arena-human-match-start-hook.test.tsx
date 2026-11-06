import { act, renderHook } from "@testing-library/react-native";

import { createHeadToHeadArenaPreparedSetup, useHumanArenaMatchStart } from "./arena-human-match-start";

const mockUseMobileAuth = jest.fn();
const mockReplace = jest.fn();
const mockPrepare = jest.fn();

jest.mock("@/auth/mobile-auth-context", () => ({
  useMobileAuth: () => mockUseMobileAuth(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/auth/pending-identity-intent-runtime", () => ({
  pendingIdentityIntentRepository: {
    prepare: (intent: unknown) => mockPrepare(intent),
  },
}));

describe("useHumanArenaMatchStart", () => {
  const begin = jest.fn();
  const resumeAuthenticatedIntent = jest.fn(async () => undefined);

  beforeEach(() => {
    begin.mockClear();
    resumeAuthenticatedIntent.mockClear();
    mockReplace.mockClear();
    mockPrepare.mockReset();
    mockPrepare.mockImplementation((intent) => ({
      id: "a11ce000-0000-4000-8000-000000000001",
      intent,
    }));
  });

  it("persists through auth when signed out", async () => {
    mockUseMobileAuth.mockReturnValue({
      begin,
      mobileSessionReady: false,
      resumeAuthenticatedIntent,
      sessionUserId: null,
    });
    const hook = await renderHook(() => useHumanArenaMatchStart());

    await act(() => hook.result.current.startHumanArenaMatch(setup));

    expect(begin).toHaveBeenCalledWith(expect.objectContaining({ kind: "start-arena-match" }));
    expect(resumeAuthenticatedIntent).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("binds and resumes the exact setup when a signed-in mobile session is not ready", async () => {
    mockUseMobileAuth.mockReturnValue({
      begin,
      mobileSessionReady: false,
      resumeAuthenticatedIntent,
      sessionUserId: "user-1",
    });
    const hook = await renderHook(() => useHumanArenaMatchStart());

    await act(() => hook.result.current.startHumanArenaMatch(setup));

    expect(resumeAuthenticatedIntent).toHaveBeenCalledWith(expect.objectContaining({
      kind: "start-arena-match",
      gameSlug: "chess",
    }));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("pins and routes the exact setup after a confirmed mobile bind", async () => {
    mockUseMobileAuth.mockReturnValue({
      begin,
      mobileSessionReady: true,
      resumeAuthenticatedIntent,
      sessionUserId: "user-1",
    });
    const hook = await renderHook(() => useHumanArenaMatchStart());

    await act(() => hook.result.current.startHumanArenaMatch(setup));

    expect(mockPrepare).toHaveBeenCalledWith(expect.objectContaining({
      kind: "start-arena-match",
      gameSlug: "chess",
    }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/stage/play",
      params: {
        arenaIntent: expect.stringContaining('"gameSlug":"chess"'),
        arenaIntentId: "a11ce000-0000-4000-8000-000000000001",
      },
    });
    expect(resumeAuthenticatedIntent).not.toHaveBeenCalled();
  });
});

const setup = createHeadToHeadArenaPreparedSetup({
  gameSlug: "chess",
  model: {
    kind: "model",
    modelEntryId: "openai/gpt-5-mini",
    modelEntryVersionId: "model_openai_gpt_5_mini_v1",
    providerVersionString: "gpt-5-mini-2026-07-01",
  },
  side: "first",
  visibility: "only_me",
});
