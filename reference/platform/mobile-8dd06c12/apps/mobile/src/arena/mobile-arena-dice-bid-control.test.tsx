import { fireEvent, render } from "@testing-library/react-native";

import {
  MobileArenaDiceBidControl,
  canUseMobileArenaDiceBidControl,
} from "./mobile-arena-dice-bid-control";
import type { ArenaStageLegalAction } from "./mobile-arena-gateway";

jest.mock("@/startup/startup-provider", () => ({
  useStartup: () => ({
    resolvedTheme: jest.requireActual("@eslams/theme-tokens").CLASSIC_DARK,
  }),
}));

describe("MobileArenaDiceBidControl", () => {
  it("adjusts quantity and face while submitting only an exact legal bid token", async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <MobileArenaDiceBidControl actions={actions()} busy={false} onSubmit={onSubmit} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByLabelText("Quantity 2")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Increase face" }));
    expect(screen.getByLabelText("Face 2")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "bid" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ token: "2x2" }));
  });

  it("rejects partial or non-dice action sets so the complete action fallback remains available", () => {
    expect(canUseMobileArenaDiceBidControl(actions())).toBe(true);
    expect(canUseMobileArenaDiceBidControl([...actions(), action("call")])).toBe(false);
  });
});

function actions(): readonly ArenaStageLegalAction[] {
  return ["1x1", "1x2", "2x1", "2x2"].map(action);
}

function action(token: string): ArenaStageLegalAction {
  return Object.freeze({
    token,
    label: `Bid ${token}`,
    shortLabel: token,
    verb: "bid",
    object: token,
    category: "bid",
    group: "Bid",
    sortKey: `bid:${token}`,
    promptLabel: `bid ${token}`,
    confirm: false,
    disabledReason: null,
    value: null,
  });
}
