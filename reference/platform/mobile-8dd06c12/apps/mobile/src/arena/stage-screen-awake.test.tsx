import { render } from "@testing-library/react-native";

import { MOBILE_ARENA_STAGE_AWAKE_TAG, StageScreenAwake } from "./stage-screen-awake";

const mockUseKeepAwake = jest.fn();

jest.mock("expo-keep-awake", () => ({
  useKeepAwake: (...arguments_: unknown[]) => mockUseKeepAwake(...arguments_),
}));

describe("StageScreenAwake", () => {
  it("owns one named wake lock that the native hook releases on unmount", async () => {
    const screen = await render(<StageScreenAwake />);

    expect(mockUseKeepAwake).toHaveBeenCalledWith(MOBILE_ARENA_STAGE_AWAKE_TAG, {
      suppressDeactivateWarnings: true,
    });
    screen.unmount();
  });
});
