import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import type { ArenaStageLegalAction } from "./mobile-arena-gateway";
import { MobileArenaCompleteActionSheet } from "./mobile-arena-complete-action-sheet";

jest.mock("@/startup/startup-provider", () => {
  const { CLASSIC_DARK: mockTheme } = jest.requireActual("@eslams/theme-tokens") as typeof import("@eslams/theme-tokens");
  return { useStartup: () => ({ resolvedTheme: mockTheme }) };
});

jest.mock("@/accessibility/mobile-accessibility-runtime", () => ({
  scheduleMobileAccessibilityFocus: jest.fn(() => jest.fn()),
}));

jest.mock("@/components/system-symbol", () => {
  const { Text: MockText } = jest.requireActual("react-native") as typeof import("react-native");
  return { SystemSymbol: () => <MockText>symbol</MockText> };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({
    bottom: 18,
    left: 0,
    right: 0,
    top: 26,
  }),
}));

describe("MobileArenaCompleteActionSheet", () => {
  it("keeps the modal header and controls outside native system insets", async () => {
    const screen = await render(
      <MobileArenaCompleteActionSheet
        actions={[action("safe-token", false)]}
        busyToken={null}
        expectedActionCount={1}
        onClose={jest.fn()}
        onRefresh={jest.fn(async () => undefined)}
        onSubmit={jest.fn()}
        reducedMotion
      />,
    );

    expect(StyleSheet.flatten(
      screen.getByTestId("mobile-arena-complete-action-sheet").props.style,
    )).toEqual(expect.objectContaining({
      paddingBottom: 18,
      paddingTop: 26,
    }));
  });

  it("returns the exact authoritative token only after required confirmation", async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <MobileArenaCompleteActionSheet
        actions={[action("opaque:exact-token", true)]}
        busyToken={null}
        expectedActionCount={1}
        onClose={jest.fn()}
        onRefresh={jest.fn(async () => undefined)}
        onSubmit={onSubmit}
        reducedMotion
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: /Action opaque.*Confirmation required/u }));
    expect(onSubmit).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Confirm Action opaque" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ token: "opaque:exact-token" }));
  });

  it("announces disabled reasons and prevents submission", async () => {
    const onSubmit = jest.fn();
    const screen = await render(
      <MobileArenaCompleteActionSheet
        actions={[action("blocked-token", false, "Destination occupied")]}
        busyToken={null}
        expectedActionCount={1}
        onClose={jest.fn()}
        onRefresh={jest.fn(async () => undefined)}
        onSubmit={onSubmit}
        reducedMotion={false}
      />,
    );

    const row = screen.getByRole("button", { name: /Unavailable.*Destination occupied/u });
    expect(row.props.accessibilityState).toEqual({ busy: false, disabled: true });
    await fireEvent.press(row);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps an incomplete empty projection actionable with an in-place refresh", async () => {
    const onRefresh = jest.fn(async () => undefined);
    const screen = await render(
      <MobileArenaCompleteActionSheet
        actions={[]}
        busyToken={null}
        expectedActionCount={4}
        onClose={jest.fn()}
        onRefresh={onRefresh}
        onSubmit={jest.fn()}
        reducedMotion
      />,
    );

    expect(screen.getByText(/Showing 0 of 4 actions/u)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Refresh actions" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

function action(
  token: string,
  confirm: boolean,
  disabledReason: string | null = null,
): ArenaStageLegalAction {
  return Object.freeze({
    category: "board",
    confirm,
    disabledReason,
    group: null,
    label: `Action ${token.split(":")[0]}`,
    object: null,
    promptLabel: null,
    shortLabel: null,
    sortKey: null,
    token,
    value: null,
    verb: null,
  });
}
