import { fireEvent, render } from "@testing-library/react-native";

import { MobileArenaValueActionControl } from "./mobile-arena-value-action-control";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: {
      color: {
        accent: "#2e5cff",
        accentHover: "#2448cc",
        border: "#dddddd",
        borderStrong: "#bbbbbb",
        surface: "#ffffff",
        text: "#111111",
        textOnAccent: "#ffffff",
        textSecondary: "#555555",
      },
    },
  }),
}));

describe("MobileArenaValueActionControl", () => {
  it("uses the bounded slider to select and submit an exact legal action token", async () => {
    const onSubmit = jest.fn();
    const view = await render(
      <MobileArenaValueActionControl actions={actions()} busy={false} label="Your sealed bid" onSubmit={onSubmit} />,
    );

    expect(view.getByText("Bid 10")).toBeTruthy();
    await fireEvent(
      view.getByRole("adjustable", { name: "Your sealed bid" }),
      "accessibilityAction",
      { nativeEvent: { actionName: "increment" } },
    );
    expect(view.getByText("Bid 15")).toBeTruthy();
    await fireEvent.press(view.getByRole("button"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ token: "bid:15" }));
  });
});

function actions(): readonly ArenaStageLegalAction[] {
  return [5, 10, 15].map((value) => Object.freeze({
    token: `bid:${value}`,
    label: `Bid ${value}`,
    shortLabel: `Bid ${value}`,
    verb: "Seal the bid",
    object: null,
    category: "bid",
    group: "auction",
    sortKey: String(value).padStart(3, "0"),
    promptLabel: null,
    confirm: true,
    disabledReason: null,
    value: null,
  }));
}
