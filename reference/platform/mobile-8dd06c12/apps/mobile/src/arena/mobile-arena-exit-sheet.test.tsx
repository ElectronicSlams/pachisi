import { fireEvent, render } from "@testing-library/react-native";

import { MobileArenaExitSheet } from "./mobile-arena-exit-sheet";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

describe("MobileArenaExitSheet", () => {
  it("offers only keep playing, leave-running, and explicit resignation", async () => {
    const onCancel = jest.fn();
    const onLeave = jest.fn();
    const onResign = jest.fn();
    const screen = await render(
      <MobileArenaExitSheet
        busy={false}
        error={null}
        onCancel={onCancel}
        onLeave={onLeave}
        onResign={onResign}
        visible
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Keep playing" }));
    await fireEvent.press(screen.getByRole("button", { name: "Leave · keep the match running" }));
    await fireEvent.press(screen.getByRole("button", { name: "Resign" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onResign).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("End session")).toBeNull();
  });

  it("locks every choice while resignation is unresolved and surfaces safe retry copy", async () => {
    const screen = await render(
      <MobileArenaExitSheet
        busy
        error="The action outcome was not confirmed. Retry will safely reuse the same request."
        onCancel={jest.fn()}
        onLeave={jest.fn()}
        onResign={jest.fn()}
        visible
      />,
    );

    expect(screen.getByRole("button", { name: "Keep playing" }).props.accessibilityState)
      .toEqual(expect.objectContaining({ busy: true, disabled: true }));
    expect(screen.getByRole("button", { name: "Leave · keep the match running" }).props.accessibilityState)
      .toEqual(expect.objectContaining({ busy: true, disabled: true }));
    expect(screen.getByRole("button", { name: "Resigning…" }).props.accessibilityState)
      .toEqual(expect.objectContaining({ busy: true, disabled: true }));
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
