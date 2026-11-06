import { fireEvent, render } from "@testing-library/react-native";

import { MobileArenaDirectActionControl } from "./mobile-arena-direct-action-control";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: jest.requireActual("react-native").View,
}));

describe("MobileArenaDirectActionControl", () => {
  it("keeps every large legal action set reachable through searchable overflow", async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <MobileArenaDirectActionControl actions={actions(18)} busyToken={null} onSubmit={onSubmit} />,
    );

    expect(screen.queryByRole("button", { name: "Move 18" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "All 18 moves" }));
    await fireEvent.changeText(screen.getByLabelText("Search legal moves"), "Move 18");
    await fireEvent.press(screen.getByRole("button", { name: "Move 18" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ token: "move:18" }));
    expect(screen.queryByText("Choose a legal move")).toBeNull();
  });

  it("shows small action sets directly without overflow", async () => {
    const screen = await render(
      <MobileArenaDirectActionControl actions={actions(3)} busyToken={null} onSubmit={jest.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Move 3" })).toBeTruthy();
    expect(screen.queryByText(/All \d+ moves/u)).toBeNull();
  });
});

function actions(count: number): readonly ArenaStageLegalAction[] {
  return Array.from({ length: count }, (_, index) => Object.freeze({
    token: `move:${index + 1}`,
    label: `Move ${index + 1}`,
    shortLabel: null,
    verb: "Move",
    object: null,
    category: "move",
    group: "legal",
    sortKey: String(index + 1).padStart(3, "0"),
    promptLabel: null,
    confirm: false,
    disabledReason: null,
    value: null,
  }));
}
