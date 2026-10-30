import fs from "node:fs";
import path from "node:path";

describe("mobile Arena integration contract", () => {
  const shellProvider = fs.readFileSync(
    path.join(__dirname, "../navigation/mobile-shell-provider.tsx"),
    "utf8",
  );
  const stage = fs.readFileSync(
    path.join(__dirname, "../screens/stage-shell-screen.tsx"),
    "utf8",
  );
  const playRoute = fs.readFileSync(
    path.join(__dirname, "../app/stage/play.tsx"),
    "utf8",
  );
  const arenaScreen = fs.readFileSync(
    path.join(__dirname, "../screens/arena-screen.tsx"),
    "utf8",
  );

  it("hydrates the authenticated now-playing state at startup and foreground", () => {
    expect(shellProvider).toContain("useMobileAuth()");
    expect(shellProvider).toContain("hydrateActiveArenaSessionIfAuthorityUnchanged(");
    expect(shellProvider).toContain("shellArenaAuthority(");
    expect(shellProvider).toContain('AppState.addEventListener("change"');
    expect(shellProvider).toContain('next !== "active"');
    expect(shellProvider).toContain("activeSessionClearSnapshot(");
    expect(shellProvider).toContain("!sessionUserId || !mobileSessionReady");
  });

  it("routes a validated restored Arena handoff directly to the Stage", () => {
    const handoff = arenaScreen.slice(
      arenaScreen.indexOf("const raw ="),
      arenaScreen.indexOf("function openGame"),
    );
    expect(handoff).toContain("matchesPinnedArenaIntent(");
    expect(handoff).toContain("processedHandoff.current = recordId");
    expect(handoff).toContain('pathname: "/stage/play"');
  });

  it("keeps closing separate from explicit terminal operations", () => {
    const closeHandler = stage.slice(
      stage.indexOf('accessibilityLabel="Close Stage"'),
      stage.indexOf("</Pressable>", stage.indexOf('accessibilityLabel="Close Stage"')),
    );
    expect(closeHandler).toContain("router.back()");
    expect(closeHandler).not.toContain("mobileArenaGateway.end");
    expect(stage).toContain("arenaTerminalMutationCoordinator.run(id, action)");
    expect(stage).toContain("Retry will safely reuse the same request.");
  });

  it("keeps the board and terminal controls reachable on short or narrow phones", () => {
    expect(stage).toContain("<ScrollView");
    expect(stage).toContain("contentContainerStyle={styles.stage}");
    expect(stage).toContain("useWindowDimensions()");
    expect(stage).toContain("mobileArenaStageBoardSize(");
    expect(stage).toContain("viewportWidth,\n    viewportHeight,");
    expect(stage).toContain("paddingBottom: 32");
  });

  it("restores the exact result replay trigger after replay dismissal", () => {
    expect(stage).toContain("resultReplayReturnPending.current = true");
    expect(stage).toContain("useFocusEffect(useCallback(() => {");
    expect(stage).toContain("scheduleMobileAccessibilityFocus(() => resultReplayButtonRef.current)");
    expect(stage).toContain("watchReplayFocusRef={resultReplayButtonRef}");
  });

  it("uses the exact durable handoff and server-state presentation authority", () => {
    expect(playRoute).toContain("matchesPinnedArenaIntent(");
    expect(playRoute).toContain("arenaIntentStartCoordinator.claim(pin)");
    expect(playRoute).toContain("arenaIntentStartCoordinator.resumeCurrent(");
    expect(playRoute).toContain("arenaIntentStartCoordinator.replaceCurrent(");
    expect(playRoute).toContain('state.activeSession.clientChannel === "mobile"');
    expect(playRoute).toContain('result.status === "started" ? result.startDisposition : "new"');
    expect(playRoute).toContain("<MobileArenaCurtainRiser");
    expect(playRoute).toContain("onRevealStage={setStageSession}");
    expect(stage).toContain("arenaStagePresentation(publicSession");
    expect(stage).not.toContain("Date.now(");
  });
});
