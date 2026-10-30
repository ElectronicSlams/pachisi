"use client";
import { arenaTimeoutAwardSeats } from "@eslams/core-types/arena-timeout-award";
import { MAX_ARTIFACT_UPLOAD_BYTES } from "@eslams/core-types";
import { artifactUploadRequest } from "@/lib/artifact-upload-request";

import { profileCategoryWinRate, scoredProfileHistory } from "@/lib/profile-overview";
import "@/styles/pages2.css";
import "@/styles/stadium-account.css";





import { arenaBoardMoveFromAction, arenaBoardCellActionFromAction, arenaRlControlSlotFromAction, arenaSideLabelForGame, arenaSideOptionsForGame, describeArenaAction, type ArenaBoardCellAction, type ArenaBoardMove, type ArenaLegalAction, type ArenaRlControlSlot, type ArenaSide } from "@/lib/arena-interactions";

import { arenaModelTurnCanClaim, connectFourLegalColumns, legalActionCount, normalizeConnectFourBoard, normalizeTicTacToeBoard, type ArenaActiveSessionConflict, type ArenaBusy, type ArenaOpponentModelRow, type ArenaPageProps, type ArenaPendingTurn, type ArenaPlayResult, type ArenaSeatModelSelections, type ArenaSessionModelTurn, type ArenaSessionView } from "@/lib/arena-session-contract";
import { type ArenaController, useArenaController } from "@/components/arena-controller";
import { arenaModelSeatIds, arenaOpponentCoversFullSuite, arenaOpponentSide, arenaOpponentSupportsGame, arenaPrimaryModelId, arenaSessionMatchesStartAttempt, arenaSetupReturnPath, arenaSideStarts, arenaValidSideForGame, elapsedFromArenaClock, formatArenaLatency, isArenaBrowserPlayable, sortArenaOpponentRows, textCompare } from "@/lib/arena-start";
import Link from "next/link";
import { SettingsRowEditor } from "@/components/stadium/settings-row-editor";
import { MatchShareSheet } from "@/components/stadium/match-share-sheet";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState, type ComponentType, type FormEvent } from "react";
import { profileCharacterCount, type MatchVisibility } from "@eslams/core-types";
import { type ArenaCategory, type ArenaSeed, arenaBySlug, arenaModelAvailabilityLabel, arenas, battlefieldRequestModels, categories, categoryLabels, providerBySlug } from "@/lib/platform-data";
import type { ArtifactReplayState, PublicReplayDetail } from "@/lib/public-artifact-replay";
import type { PublicWebProfileRelationshipView, PublicWebProfileSummaryView, PublicWebProfileView } from "@/lib/public-profile-view";
import { Button, GameGlyph, Icon, type IconName, ModelBadge, ProviderDot, type PublicAccountUser, SectionHead, Tag } from "@/components/platform-ui";
import { Dialog, Field, PasswordField, SettingRow } from "@/components/ui";
import { useControlledModalDialog } from "@/components/ui/use-controlled-modal-dialog";
import { Avatar } from "@/components/avatar";
import { ArenaCardTable, ArenaPrivateInventory } from "@/components/arena-card-table";

import { NotificationPreferences, ProfileOwnerSocialManager, ProfileRelationshipControl, ProfileSafetyActions } from "@/components/social";
import type { AvatarEditorDialogProps } from "@/components/social/avatar-editor-dialog";
import socialStyles from "@/components/social/social.module.css";
import { TwoFactorSettings } from "@/components/two-factor-auth";
import { accountSessionStore, invalidateAccountSession, patchAccountSessionUser, updateAccountSessionUser } from "@/lib/account-session-store";




import { accountSettingsStateReducer, createAccountSettingsState, normalizeLinkedProviders, type AccountAppearanceChoice, type AccountListLoadStatus, type AccountSessionView, type AccountSettingsMessage, type AccountSettingsProfile, type AccountSettingsState, type LinkedProviderView } from "@/lib/account-settings-state";
import { publishProfileMutation } from "@/lib/profile-mutation-sync";

import { ReplayBoard as SharedReplayBoard, ReplayVisualFrame as SharedReplayVisualFrame } from "@/components/replay-board";
import { loadProfileHistoryPage } from "@/lib/profile-history-page-client";
import { modelNameFromId } from "@/lib/stadium/model-names";
import { modelProviderFromId } from "@/lib/analytics";
import { profileIntentPathForUser } from "@/lib/host-routing";
import { useHydrated } from "@/lib/use-hydrated";
import { sessionDateTimeLabel, sessionDeviceLabel } from "@/lib/account-session-presentation";


import { usePublicReplayEvents, type ReplayEventsState } from "@/lib/public-replay-events-resource";

import { artifactNameSuggestions, artifactNameFromFileName, artifactSizeLabel, artifactUploadContentType, isEslamsArtifactFileName, uniqueArtifactName } from "@/lib/artifact-upload-client";
import { rovingFocusIndex } from "@/lib/roving-focus";
import { applyThemePreference, readThemePreference } from "@/lib/theme-preference";
import { REPLAY_AUTOPLAY_MS, emptyVisualReplay, replayActiveMove, replayDefaultPly, replayFirstVisiblePly, replayFrameMeta, replayFromDetail, replayHasPlayableTimeline, replayHasVisibleBoard, replayMaxPly, replayStateFromTimeline, replayVisibleFrameCount, replayVisibleMoves, type ReplayMoveMeta, type ReplayState } from "@/lib/replay-view-state";
import { useReplayPlayback } from "@/lib/use-replay-playback";
import { buildPublicReplayTimeline, emptyReplayFrameForGame, parsePublicReplayEventRow, replayRendererForGame, type PublicReplayFrame, type ReplayRendererConfig } from "@/lib/replay-visualization";



export type { PublicReplayEventView } from "@/lib/replay-visualization";

const TTT_CELL_IDS = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"] as const;
const CONNECT_FOUR_SLOT_IDS = Array.from({ length: 42 }, (_, index) => `c4-${Math.floor(index / 7)}-${index % 7}`);
const ARENA_CELL_BOARD_GAMES = new Set(["go", "gomoku", "othello", "hex", "ultimate-tic-tac-toe", "battleship"]);
const ARENA_RL_DPAD_SLOTS = [null, "up", null, "left", "center", "right", null, "down", null] as const;
const ARENA_RL_SLOT_ICONS: Record<ArenaRlControlSlot, IconName> = {
  up: "arrowUp",
  down: "arrowDown",
  left: "arrowLeft",
  right: "arrowRight",
  center: "pause",
};
const profileDateFormat = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const profileRowDateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const detailDateTimeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function DeferredAvatarEditorDialog(props: AvatarEditorDialogProps) {
  const [Editor, setEditor] = useState<ComponentType<AvatarEditorDialogProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void import("@/components/social/avatar-editor-dialog")
      .then((module) => {
        if (active) setEditor(() => module.AvatarEditorDialog);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loadFailed) {
    return (
      <Dialog
        open
        onClose={props.onClose}
        title="Edit profile photo"
        description="The photo editor could not be loaded."
        footer={<Button type="button" variant="secondary" onClick={props.onClose}>Close</Button>}
      >
        <p role="alert">Check your connection, close this dialog, and try again.</p>
      </Dialog>
    );
  }

  return Editor ? <Editor {...props} /> : <span className="sr-only" role="status">Loading photo editor...</span>;
}

function AvatarCameraIcon({ size }: { readonly size: number }) {
  return (
    <svg aria-hidden="true" className="ico" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width={size}>
      <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}


export function PublicPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export type AccountSettingsUser = PublicAccountUser & { readonly twoFactorEnabled?: boolean };

type SessionListResponse =
  | { ok: true; data: { sessions: AccountSessionView[] } }
  | { ok: false; error: { code: string; message: string } };

type LinkedProviderResponse =
  | { ok: true; data: { providers: LinkedProviderView[] } }
  | { ok: false; error: { code: string; message: string } };

type ProviderLinkResponse =
  | { ok: true; data: { url: string } }
  | { ok: false; error: { code: string; message: string } };

type AccountActionResponse =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: { code: string; message: string } };

const accountAppearanceChoices = ["system", "light", "dark"] as const satisfies readonly AccountAppearanceChoice[];


function useAccountSettingsController({
  user,
  profile = null,
  initialSessions,
  initialProviders,
  initialMessage = null,
}: {
  user: AccountSettingsUser;
  profile?: AccountSettingsProfile | null;
  initialSessions: AccountSessionView[] | null;
  initialProviders: LinkedProviderView[] | null;
  initialMessage?: AccountSettingsMessage | null;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    accountSettingsStateReducer,
    { user, profile, initialSessions, initialProviders, initialMessage },
    createAccountSettingsState,
  );
  const {
    settingsImage,
    settingsUsername,
    pendingEmail,
    settingsDisplayName,
    settingsBio,
    settingsLocation,
    settingsWebsiteUrl,
    settingsVisibility,
    settingsDefaultMatchVisibility,
    currentPassword,
    newPassword,
    confirmPassword,
    deactivateConfirm,
    erasureConfirm,
    sessions,
    sessionsLoadStatus,
    providers,
    providersLoadStatus,
    appearanceChoice,
    pending,
    message,
    stepUpRequired,
  } = state;
  const patchState = (patch: Partial<AccountSettingsState>) => dispatch({ type: "patch", patch });
  const setSettingsImage = (settingsImage: AccountSettingsState["settingsImage"]) => patchState({ settingsImage });
  const setSettingsUsername = (settingsUsername: string) => patchState({ settingsUsername });
  const setPendingEmail = (pendingEmail: string) => patchState({ pendingEmail });
  const setSettingsDisplayName = (settingsDisplayName: string) => patchState({ settingsDisplayName });
  const setSettingsBio = (settingsBio: string) => patchState({ settingsBio });
  const setSettingsLocation = (settingsLocation: string) => patchState({ settingsLocation });
  const setSettingsWebsiteUrl = (settingsWebsiteUrl: string) => patchState({ settingsWebsiteUrl });
  const setSettingsVisibility = (settingsVisibility: AccountSettingsProfile["visibility"]) => patchState({ settingsVisibility });
  const setSettingsDefaultMatchVisibility = (settingsDefaultMatchVisibility: MatchVisibility) => patchState({ settingsDefaultMatchVisibility });
  const setCurrentPassword = (currentPassword: string) => patchState({ currentPassword });
  const setNewPassword = (newPassword: string) => patchState({ newPassword });
  const setConfirmPassword = (confirmPassword: string) => patchState({ confirmPassword });
  const setDeactivateConfirm = (deactivateConfirm: string) => patchState({ deactivateConfirm });
  const setErasureConfirm = (erasureConfirm: string) => patchState({ erasureConfirm });
  const setSessions = (sessions: AccountSessionView[]) => patchState({ sessions });
  const setSessionsLoadStatus = (sessionsLoadStatus: AccountListLoadStatus) => patchState({ sessionsLoadStatus });
  const setProviders = (providers: LinkedProviderView[]) => patchState({ providers });
  const setProvidersLoadStatus = (providersLoadStatus: AccountListLoadStatus) => patchState({ providersLoadStatus });
  const setAppearanceChoice = (appearanceChoice: AccountAppearanceChoice) => patchState({ appearanceChoice });
  const setPending = (pending: string | null) => patchState({ pending });
  const setMessage = (message: AccountSettingsMessage | null) => patchState({ message });
  const setStepUpRequired = (stepUpRequired: boolean) => patchState({ stepUpRequired });
  const appearanceOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const settingsVisibilityCopy = profileVisibilityCopy(settingsVisibility);
  const savedUsername = state.savedUsername;
  const settingsHandle = savedUsername ? `@${savedUsername}` : "Username not chosen";
  const accountUser = { ...user, username: savedUsername || user.username, image: settingsImage };
  const userProfileHref = profileIntentPathForUser(accountUser);
  const stepUpHref = `/login?next=${encodeURIComponent("/settings/account")}&reason=step_up_required`;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => dispatch({ type: "sync-image", image: user.image ?? null }));
    return () => window.cancelAnimationFrame(frame);
  }, [user.image]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => dispatch({
      type: "sync-username",
      username: profile?.username ?? user.username ?? "",
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [profile?.username, user.username]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => dispatch({
      type: "sync-profile",
      profile: {
        settingsDisplayName: profile?.displayName ?? user.name ?? "",
        settingsBio: profile?.bio ?? "",
        settingsLocation: profile?.location ?? "",
        settingsWebsiteUrl: profile?.websiteUrl ?? "",
        settingsVisibility: profile?.visibility ?? "public",
        settingsDefaultMatchVisibility: profile?.defaultMatchVisibility ?? "only_me",
      },
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [profile?.bio, profile?.defaultMatchVisibility, profile?.displayName, profile?.location, profile?.visibility, profile?.websiteUrl, user.name]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      dispatch({ type: "patch", patch: { appearanceChoice: readStoredAppearanceChoice() } });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function chooseAppearance(choice: AccountAppearanceChoice) {
    setAppearanceChoice(choice);
    applyThemePreference(choice);
  }

  function applyAvatarImage(image: string | null) {
    const activeUsername = accountSessionStore.getSnapshot().user?.username ?? settingsUsername ?? user.username;
    setSettingsImage(image);
    patchAccountSessionUser({ image });
    publishProfileMutation({
      oldUsername: activeUsername,
      newUsername: activeUsername,
    });
    setMessage({ tone: "accent", text: image ? "Profile photo updated." : "Profile photo removed." });
    router.refresh();
  }

  async function saveSettingsProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    if (profileCharacterCount(settingsDisplayName.trim()) > 50 || profileCharacterCount(settingsLocation.trim()) > 60 || profileCharacterCount(settingsBio.trim()) > 160) {
      setMessage({ tone: "loss", text: "Shorten fields that exceed their character limit before saving." });
      return;
    }
    setPending("profile");
    setMessage(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          displayName: settingsDisplayName,
          bio: settingsBio,
          location: settingsLocation,
          websiteUrl: settingsWebsiteUrl,
          visibility: settingsVisibility,
          defaultMatchVisibility: settingsDefaultMatchVisibility,
        }),
      });
      const body = await response.json().catch(() => null) as ProfileSettingsResponse | null;
      if (response.status === 401) {
        setMessage({ tone: "loss", text: "Your session expired. Your profile was not saved; your edits remain here. Copy them before signing in again." });
        return;
      }
      if (!response.ok || !body?.ok) {
        setMessage({ tone: "loss", text: body?.ok === false ? body.error.message : "Profile could not be saved." });
        return;
      }
      setSettingsDisplayName(body.data.profile.displayName ?? "");
      setSettingsBio(body.data.profile.bio ?? "");
      setSettingsLocation(body.data.profile.location ?? "");
      setSettingsWebsiteUrl(body.data.profile.websiteUrl ?? "");
      setSettingsVisibility(body.data.profile.visibility);
      setSettingsDefaultMatchVisibility(body.data.profile.defaultMatchVisibility);
      patchAccountSessionUser({
        username: body.data.profile.username,
        name: body.data.profile.displayName,
      });
      publishProfileMutation({
        oldUsername: body.data.profile.username,
        newUsername: body.data.profile.username,
      });
      setMessage({ tone: "accent", text: "Profile saved." });
      setStepUpRequired(false);
      router.refresh();
    } catch {
      setMessage({ tone: "loss", text: "Profile could not be saved." });
    } finally {
      setPending(null);
    }
  }

  async function changeUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || pending) {
      return;
    }
    setPending("username");
    setMessage(null);
    setStepUpRequired(false);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: settingsUsername }),
      });
      const body = await response.json().catch(() => null) as ProfileSettingsResponse | null;
      if (redirectUnauthorizedAccountResponse(response)) return;
      if (!response.ok || !body?.ok) {
        const code = body?.ok === false ? body.error.code : "profile_update_failed";
        setStepUpRequired(code === "step_up_required");
        setMessage({ tone: "loss", text: body?.ok === false ? body.error.message : "Username could not be changed." });
        return;
      }
      const previousUsername = accountSessionStore.getSnapshot().user?.username ?? profile.username;
      dispatch({ type: "username-saved", username: body.data.profile.username });
      patchAccountSessionUser({ username: body.data.profile.username });
      publishProfileMutation({
        oldUsername: previousUsername,
        newUsername: body.data.profile.username,
      });
      setMessage({ tone: "accent", text: `Username changed to @${body.data.profile.username}. Your old profile link will continue to work.` });
      router.refresh();
    } catch {
      setMessage({ tone: "loss", text: "Username could not be changed." });
    } finally {
      setPending(null);
    }
  }

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending("email");
    setMessage(null);
    setStepUpRequired(false);
    const result = await postAccountAction("/api/auth/change-email", { newEmail: pendingEmail });
    if (result.ok) {
      setPendingEmail("");
      setMessage({ tone: "accent", text: "Approve this change from your current inbox, then verify the message sent to the new address. Your current email remains active until both steps finish." });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ tone: "loss", text: "New passwords do not match." });
      return;
    }
    setPending("password");
    setMessage(null);
    const result = await postAccountAction("/api/auth/change-password", { currentPassword, newPassword });
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ tone: "accent", text: "Password updated." });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function refreshSessions() {
    setPending("sessions");
    setSessionsLoadStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/auth/list-sessions", { cache: "no-store" });
      const body = await response.json().catch(() => null) as SessionListResponse | null;
      if (redirectUnauthorizedAccountResponse(response)) return;
      if (!response.ok || !body?.ok) {
        setSessionsLoadStatus("error");
        setMessage({ tone: "loss", text: body?.ok === false ? body.error.message : "Sessions could not be loaded." });
        return;
      }
      setSessions(body.data.sessions);
      setSessionsLoadStatus("ready");
      setMessage({ tone: "accent", text: "Sessions refreshed." });
    } catch {
      setSessionsLoadStatus("error");
      setMessage({ tone: "loss", text: "Sessions could not be loaded." });
    } finally {
      setPending(null);
    }
  }

  async function revokeSession(sessionId: string) {
    setPending(`session:${sessionId}`);
    setMessage(null);
    const result = await postAccountAction("/api/auth/revoke-session", { sessionId });
    if (result.ok) {
      dispatch({ type: "remove-session", sessionId });
      setMessage({ tone: "accent", text: "Session revoked." });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function revokeOtherSessions() {
    setPending("other-sessions");
    setMessage(null);
    const result = await postAccountAction("/api/auth/revoke-other-sessions", {});
    if (result.ok) {
      dispatch({ type: "keep-current-sessions" });
      setMessage({ tone: "accent", text: "Other sessions revoked." });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function refreshProviders() {
    setPending("providers");
    setProvidersLoadStatus("loading");
    setMessage(null);
    try {
      const response = await fetch("/api/auth/list-accounts", { cache: "no-store" });
      const body = await response.json().catch(() => null) as LinkedProviderResponse | null;
      if (redirectUnauthorizedAccountResponse(response)) return;
      if (!response.ok || !body?.ok) {
        setProvidersLoadStatus("error");
        setMessage({ tone: "loss", text: body?.ok === false ? body.error.message : "Linked providers could not be loaded." });
        return;
      }
      setProviders(normalizeLinkedProviders(body.data.providers));
      setProvidersLoadStatus("ready");
      setMessage({ tone: "accent", text: "Linked providers refreshed." });
    } catch {
      setProvidersLoadStatus("error");
      setMessage({ tone: "loss", text: "Linked providers could not be loaded." });
    } finally {
      setPending(null);
    }
  }

  async function linkProvider(provider: LinkedProviderView["provider"]) {
    setPending(`provider:${provider}`);
    setMessage(null);
    setStepUpRequired(false);
    try {
      const response = await fetch("/api/auth/link-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const body = await response.json().catch(() => null) as ProviderLinkResponse | null;
      if (redirectUnauthorizedAccountResponse(response)) return;
      if (!response.ok || !body?.ok) {
        const code = body?.ok === false ? body.error.code : "provider_link_unavailable";
        setStepUpRequired(code === "step_up_required");
        setMessage({ tone: "loss", text: body?.ok === false ? body.error.message : `${providerLabel(provider)} could not be linked.` });
        return;
      }
      window.location.assign(body.data.url);
    } catch {
      setMessage({ tone: "loss", text: `${providerLabel(provider)} could not be linked.` });
    } finally {
      setPending(null);
    }
  }

  async function unlinkProvider(provider: LinkedProviderView["provider"]) {
    setPending(`provider:${provider}`);
    setMessage(null);
    const result = await postAccountAction("/api/auth/unlink-account", { provider });
    if (result.ok) {
      dispatch({ type: "unlink-provider", provider });
      setMessage({ tone: "accent", text: `${providerLabel(provider)} unlinked.` });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function deactivateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deactivateConfirm !== user.email) {
      setMessage({ tone: "loss", text: "Enter your email to confirm deactivation." });
      return;
    }
    setPending("deactivate");
    setMessage(null);
    const result = await postAccountAction("/api/auth/deactivate-account", { email: user.email });
    if (result.ok) {
      publishProfileMutation({
        oldUsername: accountSessionStore.getSnapshot().user?.username ?? settingsUsername ?? user.username,
        newUsername: null,
      });
      updateAccountSessionUser(null);
      window.location.assign("/");
      return;
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  async function requestAccountErasure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expectedConfirmation = savedUsername || user.email;
    if (erasureConfirm.trim().toLowerCase() !== expectedConfirmation.trim().toLowerCase()) {
      setMessage({ tone: "loss", text: `Enter ${savedUsername ? "your username" : "your email"} to confirm the deletion request.` });
      return;
    }
    setPending("erasure");
    setMessage(null);
    setStepUpRequired(false);
    const result = await postAccountAction("/api/account/erasure-request", { username: erasureConfirm });
    if (result.ok) {
      setErasureConfirm("");
      setMessage({ tone: "accent", text: "Deletion request received and queued for review. Nothing was deleted automatically." });
    } else {
      setStepUpRequired(result.code === "step_up_required");
      setMessage({ tone: "loss", text: result.message });
    }
    setPending(null);
  }

  return {
    settingsImage,
    settingsUsername,
    savedUsername,
    pendingEmail,
    settingsDisplayName,
    settingsBio,
    settingsLocation,
    settingsWebsiteUrl,
    settingsVisibility,
    settingsDefaultMatchVisibility,
    currentPassword,
    newPassword,
    confirmPassword,
    deactivateConfirm,
    erasureConfirm,
    sessions,
    sessionsLoadStatus,
    providers,
    providersLoadStatus,
    appearanceChoice,
    pending,
    message,
    stepUpRequired,
    appearanceOptionRefs,
    settingsVisibilityCopy,
    settingsHandle,
    userProfileHref,
    stepUpHref,
    setSettingsUsername,
    setPendingEmail,
    setSettingsDisplayName,
    setSettingsBio,
    setSettingsLocation,
    setSettingsWebsiteUrl,
    setSettingsVisibility,
    setSettingsDefaultMatchVisibility,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    setDeactivateConfirm,
    setErasureConfirm,
    chooseAppearance,
    applyAvatarImage,
    saveSettingsProfile,
    changeUsername,
    changeEmail,
    changePassword,
    refreshSessions,
    revokeSession,
    revokeOtherSessions,
    refreshProviders,
    linkProvider,
    unlinkProvider,
    deactivateAccount,
    requestAccountErasure,
  };
}

export function AccountSettingsPage({
  emailOtpOnly = false,
  user,
  profile = null,
  initialSessions,
  initialProviders,
  initialMessage = null,
}: {
  emailOtpOnly?: boolean;
  user: AccountSettingsUser;
  profile?: AccountSettingsProfile | null;
  initialSessions: AccountSessionView[] | null;
  initialProviders: LinkedProviderView[] | null;
  initialMessage?: AccountSettingsMessage | null;
}) {
  const {
    settingsImage, settingsUsername, savedUsername, pendingEmail, settingsDisplayName, settingsBio,
    settingsLocation, settingsWebsiteUrl, settingsVisibility, settingsDefaultMatchVisibility, currentPassword, newPassword,
    confirmPassword, deactivateConfirm, erasureConfirm, sessions, sessionsLoadStatus,
    providers, providersLoadStatus, appearanceChoice, pending, message, stepUpRequired,
    appearanceOptionRefs, settingsVisibilityCopy, settingsHandle,
    userProfileHref, stepUpHref, setSettingsUsername, setPendingEmail, setSettingsDisplayName,
    setSettingsBio, setSettingsLocation, setSettingsWebsiteUrl, setSettingsVisibility, setSettingsDefaultMatchVisibility,
    setCurrentPassword, setNewPassword, setConfirmPassword, setDeactivateConfirm,
    setErasureConfirm, chooseAppearance, saveSettingsProfile, changeUsername, changeEmail,
    applyAvatarImage, changePassword, refreshSessions, revokeSession,
    revokeOtherSessions, refreshProviders, linkProvider, unlinkProvider, deactivateAccount,
    requestAccountErasure,
  } = useAccountSettingsController({ user, profile, initialSessions, initialProviders, initialMessage });


  const settingsNotice = message ? <output aria-live="polite" className={`artifact-upload-note artifact-upload-${message.tone}`}><Icon name={message.tone === "loss" ? "close" : "check"} size={14} /> {message.text}{message.text.startsWith("Your session expired.") ? <> <Link href="/login?next=%2Fsettings%2Fprofile&error=session_expired">Sign in again</Link></> : null}{stepUpRequired ? <> <Link href={stepUpHref}>Sign in again</Link></> : null}</output> : null;

  return (
    <PublicPage>
      <div className="page settings-page st-settings">
        <div className="wrap page-head">
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Make the stadium yours. Manage your profile, appearance, and account.</p>
        </div>
        <div className="wrap page-pad">
          {settingsNotice}
          <div className="id-settings-grid">
            <div className="settings settings-sections api-settings">
            <section id="appearance" className="st-settings-row st-settings-appearance"><span>Appearance</span>
              <div className="set-theme" role="radiogroup" aria-label="Theme preference">
                {accountAppearanceChoices.map((choice, index) => (
                  <button
                    key={choice}
                    ref={(node) => { appearanceOptionRefs.current[index] = node; }}
                    type="button"
                    className={`set-themeopt ${appearanceChoice === choice ? "set-themeopt-act" : ""}`}
                    role="radio"
                    aria-checked={appearanceChoice === choice}
                    tabIndex={appearanceChoice === choice ? 0 : -1}
                    onClick={() => chooseAppearance(choice)}
                    onKeyDown={(event) => {
                      const nextIndex = rovingFocusIndex(event.key, index, accountAppearanceChoices.length, "both");
                      if (nextIndex === null) return;
                      event.preventDefault();
                      const nextChoice = accountAppearanceChoices[nextIndex];
                      if (!nextChoice) return;
                      chooseAppearance(nextChoice);
                      appearanceOptionRefs.current[nextIndex]?.focus();
                    }}
                  >
                    <span>{choice === "system" ? "System" : choice === "light" ? "Light" : "Dark"}</span>
                  </button>
                ))}
              </div>
            </section>
            <AccountSettingsProfileSection
              notice={settingsNotice}
              user={user}
              profile={profile}
              settingsImage={settingsImage}
              settingsUsername={savedUsername}
              settingsDisplayName={settingsDisplayName}
              settingsLocation={settingsLocation}
              settingsWebsiteUrl={settingsWebsiteUrl}
              settingsBio={settingsBio}
              settingsVisibility={settingsVisibility}
              settingsDefaultMatchVisibility={settingsDefaultMatchVisibility}
              settingsVisibilityCopy={settingsVisibilityCopy}
              settingsHandle={settingsHandle}
              pending={pending}
              userProfileHref={userProfileHref}
              setSettingsDisplayName={setSettingsDisplayName}
              setSettingsLocation={setSettingsLocation}
              setSettingsWebsiteUrl={setSettingsWebsiteUrl}
              setSettingsBio={setSettingsBio}
              setSettingsVisibility={setSettingsVisibility}
              setSettingsDefaultMatchVisibility={setSettingsDefaultMatchVisibility}
              saveSettingsProfile={saveSettingsProfile}
              applyAvatarImage={applyAvatarImage}
            />
            <SettingsRowEditor notice={settingsNotice} id="account" label="Account" description="Email, username and profile">
              <div className="set-rows">
                <SettingRow strong label="Email" value={<span className="mono">{user.email}</span>} />
                <SettingRow
                  strong
                  label="Username"
                  value={<span className="mono">{settingsHandle}</span>}
                  action={profile ? <span className="set-keybtn set-keybtn-static"><Icon name="check" size={13} /> Chosen</span> : <Button href="/onboarding?next=/settings/profile" size="sm">Choose</Button>}
                />
                <SettingRow
                  strong
                  label="Public profile"
                  value={profile ? settingsVisibilityCopy.label : "Not created"}
                  action={<Button href={userProfileHref} variant="secondary" size="sm" iconRight="arrowRight">Open</Button>}
                />
              </div>
              {profile ? (
                <form className="api-key-form" onSubmit={changeUsername}>
                  <Field label="Change username" minLength={3} maxLength={32} pattern="[a-z0-9](?:[a-z0-9\-]{1,30}[a-z0-9])" autoComplete="username" value={settingsUsername} onChange={(event) => setSettingsUsername(event.currentTarget.value.toLowerCase())} required />
                  <Button type="submit" variant="secondary" icon="check" disabled={Boolean(pending)}>{pending === "username" ? "Changing..." : "Change username"}</Button>
                </form>
              ) : null}
              <div className="set-divider" />
              <form className="api-key-form" onSubmit={changeEmail}>
                <Field label="New email address" type="email" autoComplete="email" value={pendingEmail} onChange={(event) => setPendingEmail(event.currentTarget.value)} placeholder="name@example.com" required />
                <Button type="submit" variant="secondary" icon="check" disabled={Boolean(pending)}>{pending === "email" ? "Sending verification..." : "Change email"}</Button>
              </form>
              <p className="set-keynote mono"><Icon name="lock" size={12} /> Sensitive account changes may require signing in again.</p>
            </SettingsRowEditor>
            <SettingsRowEditor notice={settingsNotice} id="security" label="Security" description={emailOtpOnly ? "Email codes, two-factor, sessions and linked accounts" : "Password, two-factor, sessions and linked accounts"}>
              <TwoFactorSettings initialEnabled={user.twoFactorEnabled === true} passwordless={emailOtpOnly} />
              <div className="set-divider" />
              {emailOtpOnly ? <p className="set-keynote">Email sign-in uses a one-time code. You do not need a password.</p> : <form className="api-key-form" onSubmit={changePassword}>
                <PasswordField label="Current password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.currentTarget.value)} required />
                <PasswordField label="New password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.currentTarget.value)} required />
                <PasswordField label="Confirm new password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.currentTarget.value)} required />
                <Button type="submit" icon="check" disabled={pending === "password"}>{pending === "password" ? "Saving..." : "Update password"}</Button>
              </form>}
              <div className="set-divider" />
              <span id="sessions" className="settings-anchor" aria-hidden="true" />
              <div className="set-h set-h-inline"><Icon name="terminal" size={16} /> Active sessions</div>
              <div className="detail-actions">
                <Button type="button" variant="secondary" icon="refresh" onClick={() => void refreshSessions()} disabled={sessionsLoadStatus === "loading"}>{sessionsLoadStatus === "loading" ? "Loading sessions..." : "Refresh sessions"}</Button>
                <Button type="button" variant="ghost" icon="close" onClick={() => void revokeOtherSessions()} disabled={sessionsLoadStatus !== "ready" || pending === "other-sessions"}>{pending === "other-sessions" ? "Revoking..." : "Log out everywhere else"}</Button>
              </div>
              <div className="set-rows">
                {sessionsLoadStatus === "loading" ? <div className="empty-state"><Icon name="terminal" size={18} /> Loading active sessions...</div> : null}
                {sessionsLoadStatus === "error" ? <div className="empty-state"><Icon name="close" size={18} /> Sessions could not be loaded. Retry when your connection is available.</div> : null}
                {sessionsLoadStatus === "ready" && sessions.length === 0 ? <div className="empty-state"><Icon name="terminal" size={18} /> No active sessions were returned.</div> : null}
                {sessionsLoadStatus === "ready" ? sessions.map((session) => (
                  <div key={session.id} className="api-key-row">
                    <div className="api-key-row-main">
                      <strong>{session.current ? "Current session" : "Session"}</strong>
                      <span className="mono set-key">{sessionDeviceLabel(session.userAgent)}</span>
                    </div>
                    <div className="api-key-meta mono">
                      <span>created {sessionDateTimeLabel(session.createdAt)}</span>
                      <span>expires {sessionDateTimeLabel(session.expiresAt)}</span>
                    </div>
                    <button className="set-keybtn" type="button" disabled={session.current || pending === `session:${session.id}`} onClick={() => void revokeSession(session.id)}>
                      <Icon name="close" size={13} /> {pending === `session:${session.id}` ? "Revoking..." : session.current ? "Current" : "Revoke"}
                    </button>
                  </div>
                )) : null}
              </div>
              <div className="set-divider" />
              <span id="providers" className="settings-anchor" aria-hidden="true" />
              <div className="set-h set-h-inline"><Icon name="link" size={16} /> Linked accounts</div>
              <div className="detail-actions">
                <Button type="button" variant="secondary" icon="refresh" onClick={() => void refreshProviders()} disabled={providersLoadStatus === "loading"}>{providersLoadStatus === "loading" ? "Checking providers..." : "Refresh providers"}</Button>
              </div>
              <div className="set-rows">
                {providers.map((provider) => (
                  <div key={provider.provider} className="set-row">
                    <span className="set-l">{providerLabel(provider.provider)}</span>
                    <span className="set-v mono">{providersLoadStatus === "loading" ? "Checking..." : providersLoadStatus === "error" ? "Unavailable" : provider.linked ? "Linked" : "Not linked"}</span>
                    {providersLoadStatus === "ready" && provider.linked ? (
                      <button className="set-keybtn" type="button" disabled={pending === `provider:${provider.provider}`} onClick={() => void unlinkProvider(provider.provider)}><Icon name="close" size={13} /> Unlink</button>
                    ) : (
                      <button className="set-keybtn" type="button" disabled={providersLoadStatus !== "ready" || pending === `provider:${provider.provider}`} onClick={() => void linkProvider(provider.provider)}><Icon name={provider.provider === "github" ? "github" : "globe"} size={13} /> {pending === `provider:${provider.provider}` ? "Opening..." : "Link"}</button>
                    )}
                  </div>
                ))}
              </div>
            </SettingsRowEditor>
            <SettingsRowEditor id="api-keys" label="API keys" description="Access and scoped keys">
              <p className="api-key-intro">Platform API keys are issued from Trinity after access approval. Request access here, then manage scoped keys in the Trinity developer console.</p>
              <div className="set-rows">
                <div className="set-row set-row-strong">
                  <span className="set-l">Access status</span>
                  <span className="set-v mono">Approval required</span>
                  <Button href="/settings/api-keys" size="sm" iconRight="arrowRight">Request</Button>
                </div>
                <div className="set-row set-row-strong">
                  <span className="set-l">Developer console</span>
                  <span className="set-v mono">Trinity</span>
                  <Link className="btn btn-secondary btn-sm" href="/trinity/developer" prefetch={false}><span>Open</span><Icon name="arrowRight" size={16} /></Link>
                </div>
              </div>
            </SettingsRowEditor>
            <SettingsRowEditor id="notifications" label="Notifications" description="Your moves and replays">
              <NotificationPreferences embedded />
            </SettingsRowEditor>

            <SettingsRowEditor notice={settingsNotice} id="danger" label="Danger zone" description="Deactivation and deletion requests">
              <form className="api-key-form" onSubmit={deactivateAccount}>
                <p className="set-keynote mono"><Icon name="lock" size={12} /> Deactivation makes your profile private and signs out active sessions.</p>
                <label>Confirm email<input className="input" type="email" value={deactivateConfirm} onChange={(event) => setDeactivateConfirm(event.currentTarget.value)} placeholder={user.email} required /></label>
                <Button type="submit" variant="ghost" icon="close" disabled={pending === "deactivate"}>{pending === "deactivate" ? "Deactivating..." : "Deactivate account"}</Button>
              </form>
              <div className="set-divider" />
              <form className="api-key-form" onSubmit={requestAccountErasure}>
                <p className="set-keynote mono"><Icon name="lock" size={12} /> Requesting deletion queues a review. Your data is not deleted automatically.</p>
                <label>Type {savedUsername ? `@${savedUsername}` : user.email} to confirm<input className="input" value={erasureConfirm} onChange={(event) => setErasureConfirm(event.currentTarget.value)} autoComplete="off" required /></label>
                <Button type="submit" variant="ghost" icon="close" disabled={pending === "erasure"}>{pending === "erasure" ? "Requesting..." : "Request account deletion"}</Button>
              </form>
            </SettingsRowEditor>
            </div>
          </div>
        </div>
      </div>
    </PublicPage>
  );
}

type AccountSettingsProfileSectionProps = {
  notice: React.ReactNode;
  user: AccountSettingsUser;
  profile: AccountSettingsProfile | null;
  settingsImage: string | null;
  settingsUsername: string;
  settingsDisplayName: string;
  settingsLocation: string;
  settingsWebsiteUrl: string;
  settingsBio: string;
  settingsVisibility: AccountSettingsProfile["visibility"];
  settingsDefaultMatchVisibility: MatchVisibility;
  settingsVisibilityCopy: { label: string; icon: IconName };
  settingsHandle: string;
  pending: AccountSettingsState["pending"];
  userProfileHref: string;
  setSettingsDisplayName: (value: string) => void;
  setSettingsLocation: (value: string) => void;
  setSettingsWebsiteUrl: (value: string) => void;
  setSettingsBio: (value: string) => void;
  setSettingsVisibility: (value: AccountSettingsProfile["visibility"]) => void;
  setSettingsDefaultMatchVisibility: (value: MatchVisibility) => void;
  saveSettingsProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  applyAvatarImage: (image: string | null) => void;
};

function AccountSettingsProfileSection({
  notice,
  user,
  profile,
  settingsImage,
  settingsUsername,
  settingsDisplayName,
  settingsLocation,
  settingsWebsiteUrl,
  settingsBio,
  settingsVisibility,
  settingsDefaultMatchVisibility,
  settingsVisibilityCopy,
  settingsHandle,
  pending,
  userProfileHref,
  setSettingsDisplayName,
  setSettingsLocation,
  setSettingsWebsiteUrl,
  setSettingsBio,
  setSettingsVisibility,
  setSettingsDefaultMatchVisibility,
  saveSettingsProfile,
  applyAvatarImage,
}: AccountSettingsProfileSectionProps) {
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);

  function closeAvatarEditor() {
    setAvatarEditorOpen(false);
  }

  function openAvatarEditor() {
    setAvatarEditorOpen(true);
  }

  if (!profile) {
    return (
      <SettingsRowEditor notice={notice} id="profile" label="Profile" description={profile ? `${settingsDisplayName || settingsUsername} · ${settingsVisibilityCopy.label}` : "Set up your profile"}>
        <div className="empty-state"><Icon name="user" size={18} /> Profile setup is not complete.</div>
        <div className="detail-actions"><Button href="/onboarding?next=/settings/profile" iconRight="arrowRight">Choose username</Button></div>
      </SettingsRowEditor>
    );
  }

  return (
    <SettingsRowEditor notice={notice} id="profile" label="Profile" description={profile ? `${settingsDisplayName || settingsUsername} · ${settingsVisibilityCopy.label}` : "Set up your profile"}>
      <div className="set-account-card">
        <button
          className="set-avatar-edit"
          type="button"
          aria-label="Edit profile photo"
          onClick={openAvatarEditor}
          disabled={Boolean(pending)}
        >
          <Avatar className="nv-av" image={settingsImage} username={settingsUsername} name={settingsDisplayName || user.name} email={user.email} size={48} />
          <span className="set-avatar-edit-overlay" aria-hidden="true"><AvatarCameraIcon size={16} /></span>
        </button>
        <div className="set-avatar-main">
          <strong>{settingsDisplayName || user.name || settingsUsername}</strong>
          <span className="mono">{settingsHandle}</span>
        </div>
        <span className="set-v mono">{settingsVisibilityCopy.label}</span>
      </div>
      {avatarEditorOpen ? (
        <DeferredAvatarEditorDialog
          open
          currentImage={settingsImage}
          onClose={closeAvatarEditor}
          onUploaded={(image) => { applyAvatarImage(image); closeAvatarEditor(); }}
          onRemoved={() => { applyAvatarImage(null); closeAvatarEditor(); }}
        />
      ) : null}
      <form className="api-key-form" onSubmit={saveSettingsProfile}>
        <label>Display name<input className="input" value={settingsDisplayName} onChange={(event) => setSettingsDisplayName(event.currentTarget.value)} aria-label="Display name" aria-describedby="settingsDisplayName-count" /><span id="settingsDisplayName-count" className="set-keynote mono">{profileCharacterCount(settingsDisplayName)} / 50 characters</span></label>
        <label>Location<input className="input" value={settingsLocation} onChange={(event) => setSettingsLocation(event.currentTarget.value)} aria-label="Location" aria-describedby="settingsLocation-count" /><span id="settingsLocation-count" className="set-keynote mono">{profileCharacterCount(settingsLocation)} / 60 characters</span></label>
        <label>Website<input className="input" type="url" inputMode="url" placeholder="https://" value={settingsWebsiteUrl} onChange={(event) => setSettingsWebsiteUrl(event.currentTarget.value)} /></label>
        <label>Bio<textarea className="input" rows={3} value={settingsBio} onChange={(event) => setSettingsBio(event.currentTarget.value)} aria-label="Bio" aria-describedby="settingsBio-count" /><span id="settingsBio-count" className="set-keynote mono">{profileCharacterCount(settingsBio)} / 160 characters</span></label>
        <fieldset className="pf-vis-options pf-vis-options-profile">
          <legend className="sr-only">Profile visibility</legend>
          {(["public", "private"] as const).map((item) => {
            const copy = profileVisibilityCopy(item);
            return (
              <button key={item} type="button" className={`pf-vis-option ${settingsVisibility === item ? "pf-vis-active" : ""}`} aria-pressed={settingsVisibility === item} onClick={() => setSettingsVisibility(item)}>
                <Icon name={copy.icon} size={13} />
                <span>{copy.label}</span>
              </button>
            );
          })}
        </fieldset>
        <p className="set-keynote mono">
          <Icon name={settingsVisibilityCopy.icon} size={12} /> {settingsVisibility === "unlisted"
            ? `@${settingsUsername} is in legacy link-only mode. Choose Public or Private before saving.`
            : `@${settingsUsername} is ${settingsVisibilityCopy.label.toLowerCase()}.`}
        </p>
        <fieldset className="pf-vis-settings-group">
          <legend>Default match visibility</legend>
          <div className="pf-vis-options">
            {(["public", "followers", "only_me"] as const).map((item) => {
              const copy = matchVisibilitySettingsCopy(item);
              return (
                <button key={item} type="button" className={`pf-vis-option ${settingsDefaultMatchVisibility === item ? "pf-vis-active" : ""}`} aria-pressed={settingsDefaultMatchVisibility === item} onClick={() => setSettingsDefaultMatchVisibility(item)}>
                  <Icon name={copy.icon} size={13} />
                  <span>{copy.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <p className="set-keynote mono"><Icon name={matchVisibilitySettingsCopy(settingsDefaultMatchVisibility).icon} size={12} /> {matchVisibilitySettingsCopy(settingsDefaultMatchVisibility).description}</p>
        <div className="detail-actions">
          <Button type="submit" icon="check" disabled={Boolean(pending) || settingsVisibility === "unlisted"}>{pending === "profile" ? "Saving..." : "Save profile"}</Button>
          <Button href={userProfileHref} variant="secondary" iconRight="arrowRight">Open profile</Button>
        </div>
      </form>
    </SettingsRowEditor>
  );
}


function readStoredAppearanceChoice(): AccountAppearanceChoice {
  if (typeof window === "undefined") {
    return "system";
  }
  return readThemePreference();
}

async function postAccountAction(endpoint: string, body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null) as AccountActionResponse | null;
    if (redirectUnauthorizedAccountResponse(response)) {
      return { ok: false, code: "unauthorized", message: "Your session expired. Sign in to continue." };
    }
    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        code: payload?.ok === false ? payload.error.code : "account_action_failed",
        message: payload?.ok === false ? payload.error.message : "Account action could not be completed.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "network_error", message: "Account action could not be completed." };
  }
}

function redirectUnauthorizedAccountResponse(response: Response): boolean {
  if (response.status !== 401 || typeof window === "undefined") {
    return false;
  }
  invalidateAccountSession();
  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}&error=session_expired`);
  return true;
}

function providerLabel(provider: LinkedProviderView["provider"]): string {
  return provider === "github" ? "GitHub" : "Google";
}

function ComingSoonCard({ icon, title, body }: { icon: "gamepad" | "grid" | "swords" | "trophy" | "user" | "layers" | "cpu"; title: string; body: string }) {
  return (
    <div className="card coming-soon">
      <div className="sb-icon"><Icon name={icon} size={20} /></div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}


type SelectOption = readonly [string, string] | readonly [string, string, { disabled?: boolean }];

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly SelectOption[] }) {
  return (
    <div className="select-wrap">
      <select className="input fb-select" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const [optionValue, optionLabel, meta] = option;
          return <option key={optionValue} value={optionValue} disabled={Boolean(meta?.disabled)}>{optionLabel}</option>;
        })}
      </select>
      <Icon name="chevronDown" size={14} />
    </div>
  );
}


function ReplayMoveRail({
  side,
  modelId,
  moves,
  currentPly,
  subLabel,
  onSelect,
}: {
  side: "a" | "b";
  modelId: string;
  moves: ReplayMoveMeta[];
  currentPly: number;
  subLabel: string;
  onSelect: (ply: number) => void;
}) {
  return (
    <aside className={`vw-rail vw-rail-${side}`}>
      <div className="vw-rail-model">
        <ModelBadge id={modelId} size={12} />
        <span className="mono">{subLabel}</span>
      </div>
      <div className="vw-rail-list">
        {moves.length > 0 ? moves.map((move) => (
          <button
            key={`${side}-${move.ply}-${move.note}`}
            type="button"
            className={`vw-rail-move ${currentPly === move.ply ? "vw-rail-current" : ""} ${move.visible ? "" : "vw-rail-quiet"}`}
            onClick={() => onSelect(move.ply)}
          >
            <span className="mono">Turn {move.ply}</span>
            <strong>{move.note}</strong>
          </button>
        )) : <span className="vw-rail-empty mono">No moves from this side yet</span>}
      </div>
    </aside>
  );
}

function ReplayReasoningBlock({
  move,
  agentA = "Agent 1",
  agentB = "Agent 2",
  className = "",
}: {
  move: ReplayMoveMeta | null;
  agentA?: string;
  agentB?: string;
  className?: string;
}) {
  const actor = move ? (move.who === "a" ? agentA : agentB) : "Select a move";
  if (!move) {
    return (
      <div className={`vw-reasoning ${className}`}>
        <div className="vw-reasoning-head">
          <span className="mono">Reasoning</span>
          <span className="mono">{actor}</span>
          <span className="mono">Turn -</span>
        </div>
        <p className="vw-reasoning-empty">Choose a move to see the public reasoning attached to it.</p>
      </div>
    );
  }
  return (
    <div className={`vw-reasoning ${className}`}>
      <div className="vw-reasoning-head">
        <span className="mono">Reasoning</span>
        <span className="mono">{actor}</span>
        <span className="mono">Turn {move.turnIndex ?? move.ply}</span>
      </div>
      {move.reasoning ? (
        <pre className="vw-reasoning-text">{move.reasoning}</pre>
      ) : (
        <p className="vw-reasoning-empty">No public reasoning is attached to this move.</p>
      )}
    </div>
  );
}

function ReplayPlayCaption({ isPlaying, label = "Replay" }: { isPlaying: boolean; label?: string }) {
  return <span className={`vw-play-caption mono ${isPlaying ? "vw-play-caption-on" : ""}`}>{isPlaying ? "Playing" : label}</span>;
}


function ReplayUnavailablePanel({ gameSlug, title, message }: { gameSlug: string; title: string; message: string }) {
  const arena = arenaBySlug[gameSlug] ?? arenas[0];
  return (
    <div className="vw-proof-empty vw-proof-board replay-unavailable">
      <div className="vw-proof-icon"><GameGlyph slug={arena?.slug ?? gameSlug} category={arena?.category ?? "Board"} size={24} /></div>
      <div className="vw-proof-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}


function replayAvailabilityLabel(
  hasReplayView: boolean,
  visibleFrames: number,
  status: ReplayEventsState["status"]
): string {
  if (status === "loading") {
    return "Loading replay";
  }
  if (status === "error") {
    return "Replay unavailable";
  }
  if (!hasReplayView) {
    return "Replay coming soon";
  }
  if (visibleFrames === 0) {
    return "Replay ready";
  }
  if (visibleFrames === 1) {
    return "Opening turn ready";
  }
  return "Turn-by-turn replay ready";
}

function shortArtifact(value: string): string {
  return value.length > 28 ? `${value.slice(0, 19)}...${value.slice(-8)}` : value;
}


function ReplayBoard({ replay, ply }: { replay: ReplayState; ply: number }) {
  return <SharedReplayBoard replay={replay} ply={ply} />;
}

function renderReplayCell(cell: string): string {
  if (!cell || cell === ".") {
    return "";
  }
  if (cell.length <= 3) {
    return cell;
  }
  return cell.slice(0, 3).toUpperCase();
}

function stoneTokenClass(cell: string): string {
  if (/^(w|white|o|2)$/iu.test(cell) || /○|⚪/u.test(cell)) {
    return "replay-stone replay-stone-white";
  }
  return "replay-stone replay-stone-black";
}

function discTokenClass(cell: string): string {
  if (/^(w|white|o|2)$/iu.test(cell) || /○|⚪/u.test(cell)) {
    return "replay-disc-white";
  }
  return cell ? "replay-disc-black" : "";
}

function defaultTokenClass(cell: string): string {
  if (!cell) return "";
  if (/^(x|a|r|red|1|player_1)$/iu.test(cell)) return "replay-token-a";
  if (/^(o|b|y|yellow|blue|2|player_2)$/iu.test(cell)) return "replay-token-b";
  return "replay-token-neutral";
}

function battleshipTokenClass(cell: string): string {
  if (/hit|x|🔥|💥/iu.test(cell)) return "replay-sea-hit";
  if (/miss|o|~/iu.test(cell)) return "replay-sea-miss";
  if (/ship|s|■/iu.test(cell)) return "replay-sea-ship";
  return cell ? "replay-sea-mark" : "";
}

export function ArenaUnavailablePage() {
  return (
    <PublicPage>
      <div className="page arena">
	        <div className="wrap page-head">
	          <h1 className="page-title">Arena</h1>
	          <p className="page-desc">Human-vs-model games will appear here when playable arenas and requestable models are available.</p>
	        </div>
        <div className="wrap page-pad">
          <ComingSoonCard
            icon="gamepad"
            title="Arena games coming soon"
            body="Arena controls will return when playable games and requestable models are available."
          />
        </div>
      </div>
    </PublicPage>
  );
}

export function ArenaPage(props: ArenaPageProps) {
  const arena = useArenaController(props);
  return <ArenaPageView arena={arena} runtimeOnly />;
}

function ArenaSideSelector({ game, side, onChange }: { game: ArenaSeed; side: ArenaSide; onChange: (side: ArenaSide) => void }) {
  const options = arenaSideOptionsForGame(game);
  const active = options.find((option) => option.value === side) ?? options[0];
  return (
    <div className="am-side" aria-label="Choose your side">
      <div className="am-side-head"><span>{options.length > 1 ? "Choose side" : "Your role"}</span><em>{active?.starts === false ? "Model moves first" : "You move first"}</em></div>
      <div className={`am-side-grid ${options.length === 1 ? "am-side-single" : ""}`}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`am-side-choice ${side === option.value ? "active" : ""}`}
            aria-pressed={side === option.value}
            onClick={() => onChange(option.value)}
          >
            <b>{option.label}</b>
            <span>{option.helper}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ArenaSetupStage({
  arenaRows,
  gamesList,
  category,
  game,
  model,
  modelReady,
  seatModels,
  allModelRows,
  callableModelRows,
  modelRows,
  query,
  side,
  playable,
  arenaBusy,
  arenaError,
  resolvedAccountUser,
  onCategory,
  onGame,
  onModel,
  onSeatModel,
  onQuery,
  onSide,
  onLaunch,
}: {
  arenaRows: readonly ArenaSeed[];
  gamesList: readonly ArenaSeed[];
  category: "all" | ArenaCategory;
  game: ArenaSeed | undefined;
  model: string;
  modelReady: boolean;
  seatModels: ArenaSeatModelSelections;
  allModelRows: readonly ArenaOpponentModelRow[];
  callableModelRows: readonly ArenaOpponentModelRow[];
  modelRows: readonly ArenaOpponentModelRow[];
  query: string;
  side: ArenaSide;
  playable: boolean;
  arenaBusy: ArenaBusy;
  arenaError: string | null;
  resolvedAccountUser: PublicAccountUser | null;
  onCategory: (value: "all" | ArenaCategory) => void;
  onGame: (value: ArenaSeed) => void;
  onModel: (value: string) => void;
  onSeatModel: (seatId: string, value: string) => void;
  onQuery: (value: string) => void;
  onSide: (value: ArenaSide) => void;
  onLaunch: () => void;
}) {
  const interactionReady = useHydrated();
  const [allModelsOpen, setAllModelsOpen] = useState(false);
  const previewGame = game ?? gamesList[0] ?? arenaRows[0];
  const readyRowsForGame = previewGame
    ? sortArenaOpponentRows(callableModelRows.filter((item) => arenaOpponentSupportsGame(item, previewGame.slug)), previewGame.slug)
    : [];
  const wheelRows = readyRowsForGame;
  const isTableSetup = previewGame?.topologyMode === "multi_seat";
  const tableModelSeatIds = previewGame && isTableSetup ? arenaModelSeatIds(previewGame, arenaValidSideForGame(previewGame, side)) : [];
  const primaryModelId = previewGame ? arenaPrimaryModelId(previewGame, model, side, seatModels) : model;
  const selectedRow = allModelRows.find((item) => item.id === primaryModelId) ?? readyRowsForGame[0];
  const challenger = resolvedAccountUser?.username ?? resolvedAccountUser?.email ?? "You";
  const canStart = Boolean(game && modelReady && playable && arenaBusy !== "launching");
  const arenaLevelLabel = game ? game.levels.join(" / ") : "Select arena";
  const selectedOpponentStatus = previewGame ? arenaOpponentStatusText(selectedRow, previewGame.slug) : "Select model";
  const tableModelSeatCount = isTableSetup ? tableModelSeatIds.length : 1;
  const tableSeatSummary = isTableSetup && previewGame
    ? tableModelSeatIds.map((seatId) => `${arenaSideLabelForGame(previewGame, seatId)}: ${allModelRows.find((item) => item.id === (seatModels[seatId] ?? model))?.slug ?? seatModels[seatId] ?? "Choose model"}`)
    : [];
  const readyModelOptions: SelectOption[] = previewGame
    ? readyRowsForGame.map((item) => [item.id, `${item.id} - ${arenaOpponentStatusText(item, previewGame.slug)}`] as const)
    : [];

  return (
    <div className="ar2">
      {previewGame ? (
        <div className="ar2-top">
          <section className="ar2-hero" aria-label="Selected Arena matchup">
            <div className="ar2-hero-game mono" title={arenaLevelLabel}>{previewGame.name} · <span>{publicVariantLabel(previewGame.variant)}</span></div>
            <div className="ar2-preview" key={previewGame.slug}>
              <ArenaPreview game={previewGame} />
            </div>
            {previewGame.topologyMode === "multi_seat" ? (
              <div className="ar2-matchup">
                <div className="ar2-fighter">
                  <span className="ar2-you-av"><Icon name="user" size={25} /></span>
                  <span className="ar2-fname mono">{challenger}</span>
                  <span className="ar2-fsub">{game ? arenaSideLabelForGame(previewGame, side) : "Choose a seat"}</span>
                </div>
                <div className="ar2-vsbadge"><span className="mono">TABLE</span></div>
                <div className="ar2-fighter">
                  <span className="ar2-model-av"><ProviderDot provider={selectedRow?.provider ?? "openai"} size={34} /></span>
                  <span className="ar2-fname mono">{selectedRow?.slug ?? "Select model"}</span>
                  <span className="ar2-fsub">{tableModelSeatCount} model seats · {arenaOpponentStatusText(selectedRow, previewGame.slug)}</span>
                </div>
              </div>
            ) : (
              <div className="ar2-matchup">
                <div className="ar2-fighter">
                  <span className="ar2-you-av"><Icon name="user" size={25} /></span>
                  <span className="ar2-fname mono">{challenger}</span>
                  <span className="ar2-fsub">{game ? arenaSideLabelForGame(previewGame, side) : "Choose an arena"}</span>
                </div>
                <div className="ar2-vsbadge"><span className="mono">VS</span></div>
                <div className="ar2-fighter">
                  <span className="ar2-model-av"><ProviderDot provider={selectedRow?.provider ?? "openai"} size={34} /></span>
                  <span className="ar2-fname mono">{selectedRow?.slug ?? "Select model"}</span>
                  <span className="ar2-fsub">{arenaOpponentProviderName(selectedRow)} · {arenaOpponentStatusText(selectedRow, previewGame.slug)}</span>
                </div>
              </div>
            )}
          </section>

          <section className="ar2-control" aria-label={isTableSetup ? "Table model and launch controls" : "Opponent and launch controls"}>
            <div className="ar2-control-h">
              <span className="ar2-control-title">{isTableSetup ? "Table models" : "Opponent"}</span>
              <button type="button" className="ar2-allbtn" onClick={() => setAllModelsOpen(true)} aria-label={`Open model roster with ${callableModelRows.length.toLocaleString()} callable models`}>
                <Icon name="search" size={13} />
                <span className="ar2-allbtn-label">Model roster</span>
                <span className="ar2-allbtn-count mono">{callableModelRows.length.toLocaleString()} live</span>
              </button>
            </div>
            <div className="ar2-selected-model" aria-live="polite">
              <span className="ar2-selected-dot"><ProviderDot provider={selectedRow?.provider ?? "openai"} size={30} /></span>
              <span className="ar2-selected-copy">
                <span className="ar2-selected-name mono">{isTableSetup ? `${tableModelSeatCount} model seats` : selectedRow?.slug ?? "Select a model"}</span>
                <span className="ar2-selected-meta">{isTableSetup ? tableSeatSummary.join(" · ") || "Assign every model seat" : `${arenaOpponentProviderName(selectedRow)} · ${selectedOpponentStatus}`}</span>
              </span>
              <span className="ar2-selected-vs mono">{isTableSetup ? "TABLE" : "VS"}</span>
            </div>
            <div className="ar2-wheelwrap">
              {isTableSetup ? (
                <div className="rm-fields" aria-label="Model-controlled table seats">
                  {tableModelSeatIds.map((seatId) => {
                    const seatLabel = arenaSideLabelForGame(previewGame, seatId);
                    const seatModelId = seatModels[seatId] ?? model;
                    return (
                      <div className="rm-f" key={seatId}>
                        <span>{seatLabel}</span>
                        <Select
                          label={`Model for ${seatLabel}`}
                          value={seatModelId}
                          onChange={(value) => onSeatModel(seatId, value)}
                          options={readyModelOptions.length > 0 ? readyModelOptions : [["", "No live models", { disabled: true }]]}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ArenaModelWheel
                  game={previewGame}
                  models={wheelRows}
                  value={model}
                  onChange={onModel}
                  onSeeAll={() => setAllModelsOpen(true)}
                />
              )}
            </div>
            <div className="ar2-sidewrap">
              <ArenaSideSelector game={previewGame} side={side} onChange={onSide} />
            </div>
            <div className="am-gc-action">
              <div className="ar2-control-r">
                <Button aria-busy={!interactionReady || undefined} variant="primary" size="lg" iconRight="play" onClick={onLaunch} disabled={!canStart || !interactionReady}>
                  {arenaBusy === "launching" ? "Starting game" : "Start game"}
                </Button>
              <span className={`ar2-ready am-gc-vs mono ${modelReady ? "" : "ar2-ready-muted"}`}>
                  <span className="ar2-readydot" />
                  {previewGame.topologyMode === "multi_seat" ? (
                    <>
                      <span>table seats</span> <b>{tableModelSeatCount} model-controlled</b> <em>{game && modelReady ? `${tableModelSeatCount} explicit model seats for ${previewGame.name}` : "choose a live model for every seat"}</em>
                    </>
                  ) : (
                    <>
                      <span>vs model</span> <b>{selectedRow?.id ?? "choose model"}</b> <em>{game && modelReady ? `${readyRowsForGame.length.toLocaleString()} live for ${previewGame.name}` : "choose a live model"}</em>
                    </>
                  )}
                </span>
              </div>
            </div>
            {arenaError ? <div className="auth-message auth-error">{arenaError}</div> : null}
          </section>
        </div>
      ) : null}

      <section className="ar2-arenas" aria-label="Arena selection">
          <div className="ar2-arenas-head">
            <div className="ar2-arenas-title">
              <h2>Choose an arena</h2>
              <span className="ar2-game-now mono">{previewGame?.name ?? "Select game"}</span>
            </div>
            <div className="ar2-arenas-tools">
              <div
                className="ar2-sticky-vs"
                aria-live="polite"
                aria-label={isTableSetup ? `${previewGame ? arenaSideLabelForGame(previewGame, side) : "You"} at a table with ${tableModelSeatCount} model seats` : `${previewGame ? arenaSideLabelForGame(previewGame, side) : "You"} versus ${selectedRow?.id ?? selectedRow?.slug ?? "selected model"}`}
              >
                <span className="ar2-sticky-you mono">{previewGame ? arenaSideLabelForGame(previewGame, side) : "You"}</span>
                <span className="ar2-sticky-tag mono">{isTableSetup ? "table" : "vs"}</span>
                <ProviderDot provider={selectedRow?.provider ?? "openai"} size={22} />
                <span className="ar2-sticky-model mono">{isTableSetup ? `${tableModelSeatCount} seats` : selectedRow?.slug ?? "Select model"}</span>
              </div>
              <div className="seg ar2-catseg">
                <button type="button" className={category === "all" ? "active" : ""} onClick={() => onCategory("all")}>All</button>
                {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{categoryLabels[item]}</button>)}
              </div>
          </div>
        </div>
        <div className="ar2-grid">
          {gamesList.map((item) => (
            <button key={item.slug} type="button" className={`ar2-gtile ${game?.slug === item.slug ? "on" : ""}`} onClick={() => onGame(item)}>
              {game?.slug === item.slug ? <span className="ar2-gtile-active mono">Active</span> : null}
              <span className="ar2-gtile-icon"><GameGlyph slug={item.slug} category={item.category} size={24} /></span>
              <span className="ar2-gtile-name">{item.name}</span>
              <span className="ar2-gtile-var mono" title={publicVariantLabel(item.variant)}>{publicVariantLabel(item.variant)}</span>
            </button>
          ))}
        </div>
      </section>

      <ArenaAllModelsModal
        open={allModelsOpen}
        game={previewGame}
        rows={modelRows}
        allRows={allModelRows}
        value={primaryModelId}
        query={query}
        onQuery={onQuery}
        onClose={() => setAllModelsOpen(false)}
        onPick={(value) => {
          onModel(value);
          if (isTableSetup) {
            for (const seatId of tableModelSeatIds) {
              onSeatModel(seatId, value);
            }
          }
          setAllModelsOpen(false);
        }}
      />
    </div>
  );
}

function ArenaModelWheel({
  game,
  models,
  value,
  onChange,
  onSeeAll,
}: {
  game: ArenaSeed;
  models: readonly ArenaOpponentModelRow[];
  value: string;
  onChange: (value: string) => void;
  onSeeAll: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const programmaticScrollRef = useRef<number | null>(null);
  useEffect(() => {
    const index = models.findIndex((item) => item.id === value);
    const root = scrollRef.current;
    const child = index >= 0 ? root?.children.item(index) as HTMLElement | null : null;
    if (!root || !child) {
      return;
    }
    if (programmaticScrollRef.current !== null) {
      window.clearTimeout(programmaticScrollRef.current);
    }
    programmaticScrollRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = null;
    }, 120);
    root.scrollTo({ top: child.offsetTop - root.clientHeight / 2 + child.clientHeight / 2, behavior: "auto" });
  }, [models, value]);
  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (programmaticScrollRef.current !== null) {
        window.clearTimeout(programmaticScrollRef.current);
      }
    };
  }, []);

  function syncCenteredModel() {
    const root = scrollRef.current;
    if (!root || models.length === 0 || programmaticScrollRef.current !== null) {
      return;
    }
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const center = root.scrollTop + root.clientHeight / 2;
      let bestIndex = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      Array.from(root.children).forEach((child, index) => {
        const item = child as HTMLElement;
        const distance = Math.abs(item.offsetTop + item.offsetHeight / 2 - center);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      const centered = models[bestIndex];
      if (centered && centered.id !== value) {
        onChange(centered.id);
      }
    });
  }

  return (
    <div className="ar-wheel">
      <div className="ar-wheel-view">
        <div className="ar-wheel-sel" aria-hidden="true" />
        <div className="ar-wheel-scroll" ref={scrollRef} onScroll={syncCenteredModel} role="listbox" aria-label={`${game.name} live model opponents`}>
          {models.map((item) => (
            <button key={item.id} type="button" role="option" className={`ar-wheel-row ${item.id === value ? "on" : ""}`} aria-selected={item.id === value} onClick={() => onChange(item.id)}>
              <ProviderDot provider={item.provider} size={26} />
              <span className="ar-wheel-info">
                <span className="ar-wheel-name mono">{item.slug}</span>
                <span className="ar-wheel-prov">{arenaOpponentProviderName(item)}</span>
              </span>
              <span className="ar-wheel-elo mono">{arenaOpponentCoverageLabel(item, game.slug)}</span>
            </button>
          ))}
          {models.length === 0 ? (
            <button type="button" className="ar-wheel-row ar-wheel-empty" onClick={onSeeAll}>
              <Icon name="search" size={15} />
              <span className="ar-wheel-info"><span className="ar-wheel-name mono">No live rows</span><span className="ar-wheel-prov">Open all models</span></span>
              <Icon name="chevronRight" size={14} />
            </button>
          ) : null}
        </div>
        <div className="ar-wheel-fade ar-wheel-fade-t" />
        <div className="ar-wheel-fade ar-wheel-fade-b" />
      </div>
    </div>
  );
}

function ArenaAllModelsModal({
  open,
  game,
  rows,
  allRows,
  value,
  query,
  onQuery,
  onPick,
  onClose,
}: {
  open: boolean;
  game: ArenaSeed | undefined;
  rows: readonly ArenaOpponentModelRow[];
  allRows: readonly ArenaOpponentModelRow[];
  value: string;
  query: string;
  onQuery: (value: string) => void;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<"all" | string>("all");
  const dialogRef = useControlledModalDialog(open, onClose);
  const providerRows = provider === "all" ? rows : rows.filter((item) => item.provider === provider);
  const readyCount = game ? allRows.filter((item) => arenaOpponentSupportsGame(item, game.slug)).length : 0;
  return (
    <dialog
      ref={dialogRef}
      className="modal arena-model-modal"
      aria-label="Choose opponent model"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
        <div className="modal-head">
          <div className="modal-title"><Icon name="cpu" size={17} /> Choose your opponent</div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Close model picker"><Icon name="close" size={18} /></button>
        </div>
        <div className="arena-model-tools">
          <div className="search-wrap arena-model-search"><Icon name="search" size={15} /><input className="input input-search" aria-label="Search models or providers" autoComplete="off" placeholder="Search models or providers..." value={query} onChange={(event) => onQuery(event.target.value)} autoFocus suppressHydrationWarning /></div>
          <div className="seg arena-model-providerseg">
            <button type="button" className={provider === "all" ? "active" : ""} onClick={() => setProvider("all")}>All</button>
            {["openai", "google", "anthropic"].map((item) => <button key={item} type="button" className={provider === item ? "active" : ""} onClick={() => setProvider(item)}>{providerBySlug[item]?.name ?? item}</button>)}
          </div>
        </div>
        <div className="arena-model-modal-meta mono">
          {game ? `${readyCount.toLocaleString()} live for ${game.name}` : "Choose an arena"} · {allRows.length.toLocaleString()} catalog rows
        </div>
        <div className="arena-model-modal-grid">
          {providerRows.map((item) => {
            const enabledForGame = game ? arenaOpponentSupportsGame(item, game.slug) : false;
            const statusLabel = game ? arenaModelAvailabilityLabel(item.id, game.slug) : "Coming soon";
            const statusClass = statusLabel === "Verified playable" ? "mp-verified" : enabledForGame ? "mp-ready" : "mp-soon";
            const displayStatusLabel = game ? arenaOpponentStatusText(item, game.slug) : "Choose an arena";
            return (
              <button
                key={item.id}
                type="button"
                className={`arena-model-card ${item.id === value ? "on" : ""} ${enabledForGame ? "" : "disabled"}`}
                disabled={!enabledForGame}
                aria-disabled={!enabledForGame}
                title={enabledForGame ? displayStatusLabel : "This game/model pairing is coming soon"}
                onClick={() => enabledForGame ? onPick(item.id) : undefined}
              >
                <span className="arena-model-card-top">
                  <ProviderDot provider={item.provider} size={28} />
                  {item.id === value ? <span className="arena-model-check"><Icon name="check" size={13} /></span> : null}
                </span>
                <span className="arena-model-card-name mono">{item.slug}</span>
                <span className="arena-model-card-prov">{arenaOpponentProviderName(item)}</span>
                <span className={`arena-model-card-status mono ${enabledForGame ? "ready" : ""} ${statusClass}`}>{displayStatusLabel}</span>
              </button>
            );
          })}
          {providerRows.length === 0 ? <div className="arena-model-empty mono">No models match this search.</div> : null}
        </div>
    </dialog>
  );
}

function arenaOpponentProviderName(model: ArenaOpponentModelRow | undefined): string {
  if (!model) {
    return "Provider";
  }
  return model.providerName ?? providerBySlug[model.provider]?.name ?? model.provider;
}

function arenaOpponentCoverageLabel(model: ArenaOpponentModelRow, gameSlug: string): string {
  if (!arenaOpponentSupportsGame(model, gameSlug)) {
    return "Locked";
  }
  const coverage = arenaOpponentCoverageCount(model.allowedGames);
  return coverage >= arenas.length ? "50 games" : `${coverage} games`;
}

function arenaOpponentStatusText(model: ArenaOpponentModelRow | undefined, gameSlug: string): string {
  if (!model) {
    return "Select model";
  }
  if (arenaOpponentSupportsGame(model, gameSlug)) {
    if (model.source === "d1") {
      const coverage = arenaOpponentCoverageCount(model.allowedGames);
      return coverage >= arenas.length ? "Ready" : `Ready for ${coverage} games`;
    }
    return arenaModelAvailabilityLabel(model.id, gameSlug);
  }
  if (model.provider === "openai" || model.provider === "google" || model.provider === "anthropic") {
    return "Not enabled for this arena";
  }
  return "Catalog only";
}

function arenaOpponentCoverageCount(allowedGames: readonly string[]): number {
  return arenaOpponentCoversFullSuite(allowedGames) ? arenas.length : allowedGames.length;
}

function ArenaPageView({ arena, runtimeOnly }: { arena: ArenaController; runtimeOnly: boolean }) {
  const router = useRouter();
  const {
    activeSessionConflict,
    arenaRows,
    arenaBusy,
    arenaClock,
    arenaError,
    category,
    dispatch,
    game,
    gamesList,
    launch,
    model,
    modelReady,
    allModelRows,
    callableModelRows,
    modelRows,
    moves,
    pendingTurn,
    playable,
    query,
    resolvedAccountUser,
    session,
    seatModels,
    side,
    step,
    endConflictingArenaSessionAndRetryStart,
    resumeConflictingArenaSession,
    stageArenaRuntimeSummary,
    submitArenaAction,
    submitArenaTerminalAction,
    visibleResult,
  } = arena;
  const selectedModelId = game ? arenaPrimaryModelId(game, model, side, seatModels) : model;
  const setupHref = game ? arenaSetupReturnPath(game.slug, selectedModelId, side, seatModels) : "/arena";
  const goSetup = () => router.push(setupHref);

  if (runtimeOnly) {
    return (
      <PublicPage>
        <div className="page arena arena2 arena2-runtime" data-screen-label="Arena match">
          <div className="wrap page-head arena2-runtime-head">
            <div>
              <h1 className="page-title">Arena</h1>
              <p className="page-desc">{game ? `${game.name} against live model opponents.` : "Choose an arena, pick a model, and play the match in the browser."}</p>
            </div>
            <Link className="arena2-hvm" href={setupHref}><Icon name="arrowLeft" size={15} /> Arena setup</Link>
          </div>
          <div className="wrap page-pad arena2-runtime-wrap">
            {activeSessionConflict || step === "select-game" || step === "select-model" || !game ? (
              <ArenaRuntimeLaunch
                game={game}
                model={selectedModelId}
                side={side}
                seatModels={seatModels}
                accountUser={resolvedAccountUser}
                playable={playable}
                modelReady={modelReady}
                arenaBusy={arenaBusy}
                arenaError={arenaError}
                activeSessionConflict={activeSessionConflict}
                setupHref={setupHref}
                onLaunch={launch}
                onResume={resumeConflictingArenaSession}
                onEnd={endConflictingArenaSessionAndRetryStart}
              />
            ) : null}

            {!activeSessionConflict && (step === "playing" || step === "result") && game ? (
              <ArenaRuntimePlayShell
                game={game}
                model={selectedModelId}
                side={side}
                seatModels={seatModels}
                accountUser={resolvedAccountUser}
                session={session}
                moves={moves}
                arenaBusy={arenaBusy}
                arenaClock={arenaClock}
                arenaError={arenaError}
                pendingTurn={pendingTurn}
                visibleResult={visibleResult}
                setupHref={setupHref}
                onPlay={submitArenaAction}
                onResign={() => submitArenaTerminalAction("resign")}
                onClaimTimeoutAward={() => submitArenaTerminalAction("claim-timeout-award")}
                onAgain={stageArenaRuntimeSummary}
                onNewModel={goSetup}
                onNewGame={goSetup}
              />
            ) : null}
          </div>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage>
      <div className="page arena arena2">
        <div className="wrap page-head"><h1 className="page-title">Arena</h1><p className="page-desc">Choose an arena, pick a model, and play the match in the browser.</p></div>
        <div className="wrap page-pad">
          {step === "select-game" || step === "select-model" ? (
            <ArenaSetupStage
              arenaRows={arenaRows}
              gamesList={gamesList}
              category={category}
              game={game}
              model={model}
              modelReady={modelReady}
              seatModels={seatModels}
              allModelRows={allModelRows}
              callableModelRows={callableModelRows}
              modelRows={modelRows}
              query={query}
              side={side}
              playable={playable}
              arenaBusy={arenaBusy}
              arenaError={arenaError}
              resolvedAccountUser={resolvedAccountUser}
              onCategory={(value) => dispatch({ type: "category", value })}
              onGame={(value) => dispatch({ type: "selectGame", game: value })}
              onModel={(value) => dispatch({ type: "model", value })}
              onSeatModel={(seatId, value) => dispatch({ type: "seatModel", seatId, value })}
              onQuery={(value) => dispatch({ type: "query", value })}
              onSide={(value) => dispatch({ type: "side", value })}
              onLaunch={launch}
            />
          ) : null}

          {!activeSessionConflict && (step === "playing" || step === "result") && game ? (
            <div className="arena-play">
              <ArenaRuntimePlayShell
                game={game}
                model={selectedModelId}
                side={side}
                seatModels={seatModels}
                accountUser={resolvedAccountUser}
                session={session}
                moves={moves}
                arenaBusy={arenaBusy}
                arenaClock={arenaClock}
                arenaError={arenaError}
                pendingTurn={pendingTurn}
                visibleResult={visibleResult}
                setupHref={setupHref}
                onPlay={submitArenaAction}
                onResign={() => submitArenaTerminalAction("resign")}
                onClaimTimeoutAward={() => submitArenaTerminalAction("claim-timeout-award")}
                onAgain={stageArenaRuntimeSummary}
                onNewModel={() => dispatch({ type: "step", value: "select-model" })}
                onNewGame={() => dispatch({ type: "step", value: "select-game" })}
              />
            </div>
          ) : null}

          <hr className="divider" style={{ margin: "56px 0 0" }} />
          <div className="section"><HumanVsModel gameRows={arenaRows} /></div>
        </div>
      </div>
    </PublicPage>
  );
}

function ArenaRuntimeLaunch({
  game,
  model,
  side,
  seatModels,
  accountUser,
  playable,
  modelReady,
  arenaBusy,
  arenaError,
  activeSessionConflict,
  setupHref,
  onLaunch,
  onResume,
  onEnd,
}: {
  game: ArenaSeed | undefined;
  model: string;
  side: ArenaSide;
  seatModels: ArenaSeatModelSelections;
  accountUser: PublicAccountUser | null;
  playable: boolean;
  modelReady: boolean;
  arenaBusy: ArenaBusy;
  arenaError: string | null;
  activeSessionConflict: ArenaActiveSessionConflict | null;
  setupHref: string;
  onLaunch: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  const interactionReady = useHydrated();
  const activeGame = activeSessionConflict?.currentSession?.gameSlug
    ? arenas.find((item) => item.slug === activeSessionConflict.currentSession?.gameSlug)
    : undefined;
  const unfinishedStart = activeSessionConflict?.activeSession.status === "reserved" && !activeSessionConflict.currentSession;
  const sameSelection = Boolean(
    activeSessionConflict?.currentSession
    && arenaSessionMatchesStartAttempt(activeSessionConflict.currentSession, activeSessionConflict.startAttempt)
  );
  const requestedSetupLabel = game
    ? game.topologyMode === "multi_seat"
      ? `${arenaSideLabelForGame(game, side)} · ${arenaModelSeatIds(game, arenaValidSideForGame(game, side)).length} model seats`
      : `${arenaSideLabelForGame(game, side)} · ${model}`
    : "Return to Arena setup";
  const waiting = arenaBusy === "launching" || arenaBusy === "ending";
  const canLaunch = Boolean(game && playable && modelReady && !activeSessionConflict && arenaBusy !== "launching");
  const kicker = activeSessionConflict
    ? "Active Arena match"
    : arenaBusy === "launching"
      ? "Starting match"
      : "Match runtime";
  return (
    <section className="arena2-launch" aria-live="polite">
      <div className="arena2-launch-visual">
        {game ? <ArenaPreview game={game} /> : <Icon name="gamepad" size={44} />}
      </div>
      <div className="arena2-launch-copy">
        <span className="arena2-runtime-kicker mono">{kicker}</span>
        <h2>{activeSessionConflict?.confirmationPending ? "Start confirmation pending" : unfinishedStart ? "An unfinished start needs review" : activeSessionConflict ? (sameSelection ? "This game is already running" : "Another game is already running") : game ? game.name : "Arena match"}</h2>
        <p>{activeSessionConflict?.confirmationPending
          ? "The current game could not be confirmed. Retry the same start request to check its outcome safely."
          : unfinishedStart
          ? "An earlier start has not been confirmed. Check its state, or release it and start the setup shown here. A running game is preserved until its authority is confirmed."
          : activeSessionConflict
          ? sameSelection
            ? `Your ${activeGame?.name ?? game?.name ?? "Arena"} match is preserved. Resume it, or end it before restarting with this setup.`
            : `${activeGame?.name ?? activeSessionConflict.currentSession?.gameSlug ?? "Another Arena match"} is preserved. Resume it, or exit it to start ${game?.name ?? "your new selection"} with the setup shown here.`
          : game
            ? `${arenaSideLabelForGame(game, side)} versus ${game.topologyMode === "multi_seat" ? "model seats" : model}.`
            : "Return to setup to choose an Arena game."}</p>
        {activeSessionConflict ? (
          <div className="arena2-launch-conflict-setups">
            <div className="arena2-launch-active-match">
              <span className="arena2-launch-active-icon"><Icon name="play" size={17} /></span>
              <span className="arena2-launch-active-copy">
                <span className="mono">{activeSessionConflict.confirmationPending ? "Previously seen match" : "Current match"}</span>
                <strong>{activeGame?.name ?? activeSessionConflict.currentSession?.gameSlug ?? "Arena match"}</strong>
                <em>{activeSessionConflict.currentSession?.modelId ?? `${activeSessionConflict.activeSession.clientChannel} session`}</em>
              </span>
            </div>
            <div className="arena2-launch-active-match requested">
              <span className="arena2-launch-active-icon"><Icon name="grid" size={17} /></span>
              <span className="arena2-launch-active-copy">
                <span className="mono">Selected setup</span>
                <strong>{game?.name ?? "Arena match"}</strong>
                <em>{requestedSetupLabel}</em>
              </span>
            </div>
          </div>
        ) : null}
        {game?.topologyMode === "multi_seat" ? (
          <div className="arena2-seatbar arena2-seatbar-launch">
            {game.controlledPlayers.map((seatId) => {
              const isHuman = seatId === arenaValidSideForGame(game, side);
              const seatModel = seatModels[seatId] ?? model;
              return (
                <span key={seatId} className={`arena2-seat-pill ${isHuman ? "human" : "model"}`}>
                  {isHuman ? <ArenaRuntimeUserAvatar user={accountUser} /> : <ProviderDot provider={modelProviderFromId(seatModel) ?? "unknown"} size={30} />}
                  <span><b>{arenaSideLabelForGame(game, seatId)}</b><em>{isHuman ? "Human" : seatModel}</em></span>
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="arena2-launch-actions">
          {activeSessionConflict ? (
            <>
              <Button aria-busy={waiting || undefined} variant="primary" icon="play" disabled={waiting || !interactionReady} onClick={onResume}>
                {arenaBusy === "launching" ? "Restoring game" : unfinishedStart ? "Check unfinished start" : "Resume current game"}
              </Button>
              <Button variant="secondary" icon="flag" disabled={waiting || !interactionReady} onClick={onEnd}>
                {arenaBusy === "ending" ? "Exiting current game" : unfinishedStart ? `Release and start ${game?.name ?? "new game"}` : sameSelection ? `End and restart ${game?.name ?? "game"}` : `Exit and start ${game?.name ?? "new game"}`}
              </Button>
            </>
          ) : (
            <>
              <Button aria-busy={!interactionReady || arenaBusy === "launching" || undefined} variant="primary" iconRight="play" onClick={onLaunch} disabled={!canLaunch || !interactionReady}>
                {arenaBusy === "launching" ? "Starting game" : "Start game"}
              </Button>
              <Button variant="secondary" href={setupHref} icon="grid">Change setup</Button>
            </>
          )}
        </div>
        {arenaError ? <div className="auth-message auth-error">{arenaError}</div> : null}
      </div>
    </section>
  );
}

function ArenaRuntimePlayShell({
  game,
  model,
  side,
  seatModels,
  accountUser,
  session,
  moves,
  arenaBusy,
  arenaClock,
  arenaError,
  pendingTurn,
  visibleResult,
  setupHref,
  onPlay,
  onResign,
  onClaimTimeoutAward,
  onAgain,
  onNewModel,
  onNewGame,
}: {
  game: ArenaSeed;
  model: string;
  side: ArenaSide;
  seatModels: ArenaSeatModelSelections;
  accountUser: PublicAccountUser | null;
  session: ArenaSessionView | null;
  moves: number;
  arenaBusy: ArenaBusy;
  arenaClock: number;
  arenaError: string | null;
  pendingTurn: ArenaPendingTurn | null;
  visibleResult: ArenaPlayResult | null;
  setupHref: string;
  onPlay: (action: string) => void;
  onResign: () => void;
  onClaimTimeoutAward: () => void;
  onAgain: () => void;
  onNewModel: () => void;
  onNewGame: () => void;
}) {
  const [resignSessionId, setResignSessionId] = useState<string | null>(null);
  const canResign = Boolean(session) && !visibleResult && (arenaBusy === null || arenaBusy === "thinking");
  const confirmResign = () => {
    if (!canResign || session?.sessionId !== resignSessionId) return;
    setResignSessionId(null);
    onResign();
  };
  return (
    <section
      className={`arena2-play-shell ${!session ? "play-shell-opening arena2-play-opening" : ""}`}
      data-game-slug={game.slug}
      data-game-category={game.category}
      data-game-state={session && !visibleResult ? "active" : "inactive"}
    >
      <div className="arena2-matchbar">
        <Link className="arena2-match-exit" href={setupHref}><Icon name="arrowLeft" size={15} /> Exit</Link>
        <div className="arena2-match-title">
          <span className="arena2-match-glyph"><GameGlyph slug={game.slug} category={game.category} size={20} /></span>
          <span><b>{game.name}</b><em>{publicVariantLabel(game.variant)}</em></span>
        </div>
        <div className="arena2-match-meta mono">
          <span>{moves} moves</span>
          <span>{game.levels.join(" / ")}</span>
        </div>
      </div>
      <ArenaRuntimeSeatBar game={game} model={model} side={side} seatModels={seatModels} accountUser={accountUser} session={session} result={visibleResult} />
      <div className="arena2-match-main">
        <section className="arena2-board-panel">
          <ArenaScorePanel game={game} side={side} session={session} busy={arenaBusy} result={visibleResult} clock={arenaClock} pendingTurn={pendingTurn} />
          <ArenaRuntimeBoard
            game={game}
            model={model}
            side={side}
            session={session}
            moves={moves}
            arenaBusy={arenaBusy}
            visibleResult={visibleResult}
            onPlay={onPlay}
            onAgain={onAgain}
            onNewModel={onNewModel}
            onNewGame={onNewGame}
          />
          {!visibleResult && !session ? <ArenaOpeningNotice game={game} side={side} model={model} /> : null}
          {!visibleResult && pendingTurn ? <ArenaTurnNotice pendingTurn={pendingTurn} modelTurn={session?.modelTurn} clock={arenaClock} /> : null}
          {!visibleResult ? (
            <ArenaModelTurnControls
              modelTurn={session?.modelTurn}
              claimAllowed={Boolean(arenaTimeoutAwardSeats(session?.seats ?? [], session?.activeSeatId))}
              onResign={onResign}
              busy={arenaBusy}
              setupHref={setupHref}
              onClaimTimeoutAward={onClaimTimeoutAward}
            />
          ) : null}
          {!visibleResult && game.slug !== "tic-tac-toe" && game.slug !== "connect-four" ? (
            <ArenaLegalActionPanel game={game} session={session} busy={arenaBusy} result={visibleResult} onPlay={onPlay} />
          ) : null}
          {arenaError && !visibleResult ? <div className="auth-message auth-error arena-play-error">{arenaError}</div> : null}
          <div className="ps-foot">
            {!visibleResult ? (
              <button type="button" className="ps-resign" disabled={!canResign} onClick={() => setResignSessionId(session?.sessionId ?? null)}><Icon name="flag" size={14} /> {arenaBusy === "resigning" ? "Resigning" : "Resign"}</button>
            ) : null}
            <span className="ps-saved mono"><Icon name={visibleResult ? "check" : arenaBusy === "thinking" || session?.currentPlayer === "model" ? "bolt" : "layers"} size={13} /> {arenaFooterStatus(session, arenaBusy, visibleResult, pendingTurn)}</span>
          </div>
        </section>
      </div>
      {canResign && resignSessionId === session?.sessionId ? (
        <Dialog open onClose={() => setResignSessionId(null)} title="Resign this game?" description="This ends the current game and cannot be undone." footer={<><Button variant="secondary" onClick={() => setResignSessionId(null)}>Keep playing</Button><Button variant="primary" onClick={confirmResign}>Confirm resignation</Button></>}>
          <p>Your game will be saved with a resignation result.</p>
        </Dialog>
      ) : null}
    </section>
  );
}

function ArenaRuntimeSeatBar({
  game,
  model,
  side,
  seatModels,
  accountUser,
  session,
  result,
}: {
  game: ArenaSeed;
  model: string;
  side: ArenaSide;
  seatModels: ArenaSeatModelSelections;
  accountUser: PublicAccountUser | null;
  session: ArenaSessionView | null;
  result: ArenaPlayResult | null;
}) {
  if (game.topologyMode === "multi_seat") {
    const humanSeat = arenaValidSideForGame(game, side);
    const activeSeat = result ? null : session?.activePlayerId ?? (session?.currentPlayer === "human" ? humanSeat : null);
    return (
      <div className="arena2-seatbar" aria-label="Arena table seats">
        {game.controlledPlayers.map((seatId) => {
          const isHuman = seatId === humanSeat;
          const seatModel = seatModels[seatId] ?? model;
          return (
            <span key={seatId} className={`arena2-seat-pill ${isHuman ? "human" : "model"} ${activeSeat === seatId ? "active" : ""}`}>
              {isHuman ? <ArenaRuntimeUserAvatar user={accountUser} /> : <ProviderDot provider={modelProviderFromId(seatModel) ?? "unknown"} size={30} />}
              <span><b>{arenaSideLabelForGame(game, seatId)}</b><em>{isHuman ? "Human" : seatModel}</em></span>
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div className="arena2-seatbar" aria-label="Arena seats">
      <span className={`arena2-seat-pill human ${!result && session?.currentPlayer === "human" ? "active" : ""}`}>
        <ArenaRuntimeUserAvatar user={accountUser} />
        <span><b>{arenaSideLabelForGame(game, side)}</b><em>Human</em></span>
      </span>
      <span className="arena2-seat-vs mono">VS</span>
      <span className={`arena2-seat-pill model ${!result && session?.currentPlayer === "model" ? "active" : ""}`}>
        <ProviderDot provider={modelProviderFromId(model) ?? "unknown"} size={30} />
        <span><b>{arenaSideLabelForGame(game, arenaOpponentSide(side))}</b><em>{model}</em></span>
      </span>
    </div>
  );
}

function ArenaRuntimeUserAvatar({ user }: { user: PublicAccountUser | null }) {
  const label = user?.username ?? user?.name ?? user?.email ?? "You";
  return (
    <Avatar
      className="arena2-seat-initial mono"
      imageClassName="ar2-you-av-img"
      image={user?.image ?? null}
      username={user?.username ?? null}
      name={user?.name ?? null}
      email={user?.email ?? null}
      label={`${label} avatar`}
      fallback="YOU"
    />
  );
}

function ArenaRuntimeBoard({
  game,
  model,
  side,
  session,
  moves,
  arenaBusy,
  visibleResult,
  onPlay,
  onAgain,
  onNewModel,
  onNewGame,
}: {
  game: ArenaSeed;
  model: string;
  side: ArenaSide;
  session: ArenaSessionView | null;
  moves: number;
  arenaBusy: ArenaBusy;
  visibleResult: ArenaPlayResult | null;
  onPlay: (action: string) => void;
  onAgain: () => void;
  onNewModel: () => void;
  onNewGame: () => void;
}) {
  const disabled = Boolean(visibleResult) || Boolean(arenaBusy) || session?.currentPlayer !== "human";
  if (visibleResult) {
    return (
      <div className={`ps-board ps-board-result ps-board-${game.slug}`}>
        <ResultScreen
          game={game}
          model={model}
          session={session}
          result={visibleResult}
          moves={moves}
          stage
          onAgain={onAgain}
          onNewModel={onNewModel}
          onNewGame={onNewGame}
        />
      </div>
    );
  }
  return (
    <div className={`ps-board ${!session ? "ps-board-opening" : ""} ps-board-${game.slug}`}>
      {game.slug === "tic-tac-toe" ? (
        <TicTacToeBoard board={normalizeTicTacToeBoard(session?.board)} onPlay={(index) => onPlay(String(index))} disabled={disabled} />
      ) : game.slug === "connect-four" ? (
        <ConnectFourBoard board={normalizeConnectFourBoard(session?.board)} onPlay={(column) => onPlay(String(column))} disabled={disabled} />
      ) : (game.slug === "chess" || game.slug === "checkers") ? (
        <ChessArenaBoard game={game} session={session} side={side} onPlay={onPlay} disabled={disabled} />
      ) : ARENA_CELL_BOARD_GAMES.has(game.slug) ? (
        <ArenaCellBoard game={game} session={session} onPlay={onPlay} disabled={disabled} />
      ) : game.category === "RL" ? (
        <ArenaRlControlBoard game={game} session={session} onPlay={onPlay} disabled={disabled} />
      ) : (
        <ArenaCoreBoard
          game={game}
          session={session}
          onPlay={onPlay}
          actionsDisabled={disabled}
        />
      )}
    </div>
  );
}

function TicTacToeBoard({ board, disabled, onPlay }: { board: (null | "X" | "O")[]; disabled: boolean; onPlay: (index: number) => void }) {
  return <div className="tttboard">{TTT_CELL_IDS.map((cellId, index) => {
    const mark = board[index];
    const legal = !disabled && !mark;
    return <button key={cellId} type="button" aria-label={mark ? `${cellId.replaceAll("-", " ")}, ${mark}` : `Play ${cellId.replaceAll("-", " ")}`} className={`tttcell ${mark ? "filled" : ""} ${legal ? "ttt-legal" : ""}`} disabled={disabled || Boolean(mark)} onClick={() => onPlay(index)}><span className={`ttt-mark ${mark ? `ttt-${mark}` : ""}`}>{mark}</span></button>;
  })}</div>;
}

function ConnectFourBoard({ board, disabled, onPlay }: { board: string[]; disabled: boolean; onPlay: (column: number) => void }) {
  const legalColumns = new Set(connectFourLegalColumns(board));
  return <div className="c4board">{CONNECT_FOUR_SLOT_IDS.map((slotId, index) => {
    const column = index % 7;
    const legal = !disabled && legalColumns.has(column);
    return <button key={slotId} type="button" aria-label={`Drop in column ${column + 1}`} className={`c4cell ${legal ? "c4cell-legal" : "c4cell-full"}`} disabled={disabled || !legal} onClick={() => onPlay(column)}>{board[index] ? <span className={`c4disc c4-${board[index]}`} /> : null}</button>;
  })}</div>;
}

export function ChessArenaBoard({
  game,
  session,
  side,
  disabled,
  onPlay,
}: {
  game: ArenaSeed;
  session: ArenaSessionView | null;
  side: ArenaSide;
  disabled: boolean;
  onPlay: (action: string) => void;
}) {
  const isCheckers = game.slug === "checkers";
  const turnKey = `${session?.sessionId ?? "preview"}:${session?.moveNumber ?? -1}:${session?.currentPlayer ?? "opening"}`;
  const [selectedState, setSelectedState] = useState<{ key: string; square: string | null }>({ key: turnKey, square: null });
  const selectedSquare = selectedState.key === turnKey ? selectedState.square : null;
  const { frame } = arenaVisualFrameForSession(game, session);
  const board = frame.board ?? [];
  const legalMoves = useMemo(
    () => (session?.legalActions ?? []).flatMap((action) => {
      const move = arenaBoardMoveFromAction(game, action);
      return move ? [move] : [];
    }),
    [game, session?.legalActions]
  );
  const movesByFrom = useMemo(() => {
    const next = new Map<string, ArenaBoardMove[]>();
    for (const move of legalMoves) {
      next.set(move.from, [...(next.get(move.from) ?? []), move]);
    }
    return next;
  }, [legalMoves]);
  const selectedTargets = selectedSquare ? new Map((movesByFrom.get(selectedSquare) ?? []).map((move) => [move.to, move])) : new Map<string, ArenaBoardMove>();
  const lastMove = arenaLastBoardMove(game, session);
  const displayIndexes = side === "player_2"
    ? Array.from({ length: 64 }, (_, index) => 63 - index)
    : Array.from({ length: 64 }, (_, index) => index);

  function handleSquareClick(square: string) {
    if (disabled) {
      return;
    }
    const selectedMove = selectedTargets.get(square);
    if (selectedMove && (!isCheckers || (movesByFrom.get(selectedSquare ?? "") ?? []).filter(move => move.to === square).length === 1)) {
      setSelectedState({ key: turnKey, square: null });
      onPlay(selectedMove.token);
      return;
    }
    if (selectedSquare === square) {
      setSelectedState({ key: turnKey, square: null });
      return;
    }
    if (movesByFrom.has(square)) {
      setSelectedState({ key: turnKey, square });
    }
  }

  return (
    <div className="arena-chess-wrap">
      <div className={`arena-chessboard ${side === "player_2" ? "arena-chess-flipped" : ""}`} role="grid" aria-label={`${game.name} board, ${arenaSideLabelForGame(game, side)} at the bottom`}>
        {displayIndexes.map((boardIndex) => {
          const square = chessSquareForBoardIndex(boardIndex);
          const piece = board[boardIndex] ?? "";
          const isSource = movesByFrom.has(square);
          const targetMove = selectedTargets.get(square);
          const isTarget = Boolean(targetMove);
          const ambiguousTarget = isCheckers && (movesByFrom.get(selectedSquare ?? "") ?? []).filter(move => move.to === square).length > 1;
          const isSelected = selectedSquare === square;
          const isLast = Boolean(lastMove && (lastMove.from === square || lastMove.to === square));
          const enabled = !disabled && !ambiguousTarget && (isSource || isTarget || isSelected);
          const classes = [
            "arena-chess-square",
            chessSquareIsDark(square) ? "arena-chess-dark" : "arena-chess-light",
            piece ? "arena-chess-filled" : "",
            isSource ? "arena-chess-source" : "",
            isTarget ? "arena-chess-target" : "",
            isSelected ? "arena-chess-selected" : "",
            isLast ? "arena-chess-last" : "",
          ].filter(Boolean).join(" ");
          const label = [
            square,
            piece ? isCheckers ? `${piece.toLowerCase() === "r" ? "Red" : "Black"} ${piece === piece.toUpperCase() ? "king" : "man"}` : `piece ${piece}` : "empty",
            ambiguousTarget ? "multiple capture paths; choose a complete move from legal actions" : "",
            isTarget ? `legal target for ${selectedSquare}` : isSource ? "legal piece to move" : "",
          ].filter(Boolean).join(", ");
          return (
            <button
              key={square}
              type="button"
              className={classes}
              data-square={square}
              data-action-token={targetMove?.token}
              aria-label={label}
              aria-pressed={isSelected}
              disabled={!enabled}
              onClick={() => handleSquareClick(square)}
            >
              <span className={`arena-chess-piece ${isCheckers ? `arena-checker-piece ${piece ? "arena-checker-filled" : ""} ${piece.toLowerCase() === "r" ? "arena-checker-red" : "arena-checker-black"}` : arenaChessTokenClass(piece)}`} aria-hidden="true">{isCheckers && piece ? piece === piece.toUpperCase() ? "★" : "" : piece}</span>
              <span className="arena-chess-coord" aria-hidden="true">{square}</span>
            </button>
          );
        })}
      </div>
      <div className="arena-chess-hint mono" aria-live="polite">
        {disabled
          ? session?.currentPlayer === "model" ? "Opponent is choosing a move." : "Board controls unlock on your turn."
          : selectedSquare
            ? `Choose a highlighted target for ${selectedSquare}.`
            : isCheckers ? "Select a highlighted piece, then a target. For multiple capture paths, choose the complete move below." : "Select a highlighted piece, then choose a target square."}
      </div>
    </div>
  );
}

function ArenaCellBoard({
  game,
  session,
  disabled,
  onPlay,
}: {
  game: ArenaSeed;
  session: ArenaSessionView | null;
  disabled: boolean;
  onPlay: (action: string) => void;
}) {
  const { frame, renderer } = arenaVisualFrameForSession(game, session);
  const board = frame.board ?? [];
  const rows = Math.max(1, frame.rows ?? renderer.rows);
  const cols = Math.max(1, frame.cols ?? renderer.cols);
  const total = Math.max(rows * cols, board.length, 1);
  const legalCells = useMemo(() => {
    const next = new Map<number, ArenaBoardCellAction>();
    for (const action of session?.legalActions ?? []) {
      if (action.disabledReason) {
        continue;
      }
      const cell = arenaBoardCellActionFromAction(game, action, rows, cols);
      if (cell && !next.has(cell.index)) {
        next.set(cell.index, cell);
      }
    }
    return next;
  }, [cols, game, rows, session?.legalActions]);
  if (!session?.publicState) {
    return <ArenaCoreBoard game={game} session={session} />;
  }
  const cells = Array.from({ length: total }, (_, index) => {
    const raw = board[index] ?? "";
    const action = legalCells.get(index);
    const legal = !disabled && Boolean(action);
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      action,
      col,
      index,
      legal,
      raw,
      row,
    };
  });
  const boardClass = [
    "arena-cell-board",
    `arena-cell-board-${renderer.kind}`,
    legalCells.size > 0 && !disabled ? "arena-cell-board-active" : "",
  ].filter(Boolean).join(" ");
  const hint = disabled
    ? session.currentPlayer === "model" ? "Opponent is choosing a move." : "Board controls unlock on your turn."
    : legalCells.size > 0 ? "Choose a highlighted legal cell."
      : "Use the legal-action list for this turn.";

  return (
    <div className="arena-cell-wrap">
      <div
        className={boardClass}
        data-renderer-kind={renderer.kind}
        data-game-slug={game.slug}
        role="grid"
        aria-label={`${game.name} board`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => {
          const tokenClass = arenaCellTokenClass(renderer.kind, cell.raw);
          const className = [
            "arena-cell",
            cell.raw && cell.raw !== "." ? "arena-cell-filled" : "",
            cell.legal ? "arena-cell-legal" : "",
            tokenClass,
          ].filter(Boolean).join(" ");
          const label = cell.action
            ? `${cell.action.label}. Row ${cell.row + 1}, column ${cell.col + 1}.`
            : `${game.name} row ${cell.row + 1}, column ${cell.col + 1}${cell.raw ? `, ${renderReplayCell(cell.raw)}` : ""}.`;
          return (
            <button
              key={`${game.slug}-${cell.index}`}
              type="button"
              className={className}
              data-cell-index={cell.index}
              data-action-token={cell.action?.token}
              aria-label={label}
              disabled={!cell.legal}
              onClick={() => {
                if (cell.action) {
                  onPlay(cell.action.token);
                }
              }}
            >
              <ArenaCellPiece rendererKind={renderer.kind} raw={cell.raw} />
              {cell.legal ? <span className="arena-cell-hint" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div className="arena-cell-help mono" aria-live="polite">{hint}</div>
    </div>
  );
}

function ArenaCellPiece({ rendererKind, raw }: { rendererKind: ReplayRendererConfig["kind"]; raw: string }) {
  if (!raw || raw === ".") {
    return null;
  }
  if (rendererKind === "stone-grid") {
    return <span className={`arena-cell-stone ${stoneTokenClass(raw).includes("white") ? "arena-cell-stone-white" : "arena-cell-stone-black"}`} aria-hidden="true" />;
  }
  if (rendererKind === "disc-grid") {
    return <span className={`arena-cell-disc ${discTokenClass(raw).includes("white") ? "arena-cell-disc-white" : "arena-cell-disc-black"}`} aria-hidden="true" />;
  }
  if (rendererKind === "battleship") {
    return <span className="arena-cell-token">{renderReplayCell(raw)}</span>;
  }
  return <span className="arena-cell-token">{renderReplayCell(raw)}</span>;
}

function arenaCellTokenClass(rendererKind: ReplayRendererConfig["kind"], raw: string): string {
  if (!raw || raw === ".") {
    return "";
  }
  if (rendererKind === "battleship") {
    return battleshipTokenClass(raw).replace(/^replay-/u, "arena-");
  }
  if (rendererKind === "ultimate-grid" || rendererKind === "hex-grid") {
    return defaultTokenClass(raw).replace(/^replay-/u, "arena-");
  }
  return "";
}

function ArenaRlControlBoard({
  game,
  session,
  disabled,
  onPlay,
}: {
  game: ArenaSeed;
  session: ArenaSessionView | null;
  disabled: boolean;
  onPlay: (action: string) => void;
}) {
  const controls = useMemo(() => {
    const dpad = new Map<ArenaRlControlSlot, { action: ArenaLegalAction; descriptor: ReturnType<typeof describeArenaAction> }>();
    const actions: Array<{ action: ArenaLegalAction; descriptor: ReturnType<typeof describeArenaAction> }> = [];
    for (const action of session?.legalActions ?? []) {
      if (action.disabledReason) {
        continue;
      }
      const descriptor = describeArenaAction(game, action);
      const slot = arenaRlControlSlotFromAction(action);
      if (slot && !dpad.has(slot)) {
        dpad.set(slot, { action, descriptor });
      } else {
        actions.push({ action, descriptor });
      }
    }
    return { actions, dpad };
  }, [game, session?.legalActions]);
  const hasControls = controls.dpad.size > 0 || controls.actions.length > 0;
  const help = disabled
    ? session?.currentPlayer === "model" ? "Opponent is choosing a move." : "Controls unlock on your turn."
    : hasControls ? "Choose a control for the next step."
      : "Use the legal-action list for this turn.";

  return (
    <div className="arena-rl-wrap">
      <div className="arena-rl-stage">
        <ArenaCoreBoard game={game} session={session} />
      </div>
      <div className="arena-rl-controls" aria-label={`${game.name} controls`}>
        <div className="arena-rl-pad" role="group" aria-label="Movement controls">
          {ARENA_RL_DPAD_SLOTS.map((slot, index) => {
            if (!slot) {
              return <span key={`empty-${index}`} className="arena-rl-pad-empty" aria-hidden="true" />;
            }
            const control = controls.dpad.get(slot);
            const label = control?.descriptor.label ?? rlSlotFallbackLabel(slot);
            return (
              <button
                key={slot}
                type="button"
                className={`arena-rl-control arena-rl-${slot}`}
                data-action-token={control?.action.token}
                aria-label={control ? label : `${rlSlotFallbackLabel(slot)} unavailable`}
                disabled={disabled || !control}
                onClick={() => {
                  if (control) {
                    onPlay(control.action.token);
                  }
                }}
              >
                <Icon name={ARENA_RL_SLOT_ICONS[slot]} size={17} />
                <span>{control?.descriptor.shortLabel ?? label}</span>
              </button>
            );
          })}
        </div>
        {controls.actions.length > 0 ? (
          <div className="arena-rl-actions" role="group" aria-label="Action controls">
            {controls.actions.map(({ action, descriptor }) => (
              <button
                key={action.token}
                type="button"
                className="arena-rl-action"
                data-action-token={action.token}
                disabled={disabled}
                title={`${descriptor.label}. ${descriptor.hint}`}
                onClick={() => onPlay(action.token)}
              >
                <Icon name={rlActionIconName(action, descriptor.label)} size={15} />
                <span>{descriptor.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="arena-rl-help mono" aria-live="polite">{help}</div>
    </div>
  );
}

function rlSlotFallbackLabel(slot: ArenaRlControlSlot): string {
  if (slot === "center") return "Hold";
  return slot[0]?.toUpperCase() ? `${slot[0].toUpperCase()}${slot.slice(1)}` : slot;
}

function rlActionIconName(action: ArenaLegalAction, label: string): IconName {
  const text = `${action.token} ${action.verb ?? ""} ${label}`.toLowerCase();
  if (/fire|shoot|jab|hook|check/u.test(text)) return "bolt";
  if (/pickup|dropoff|hold|guard|balance/u.test(text)) return "layers";
  if (/jump|advance/u.test(text)) return "arrowUp";
  return "gamepad";
}

function ArenaCoreBoard({
  game,
  session,
  onPlay,
  actionsDisabled = true,
}: {
  game: ArenaSeed;
  session: ArenaSessionView | null;
  onPlay?: (action: string) => void;
  actionsDisabled?: boolean;
}) {
  if (!session?.publicState) {
    return <ArenaPreview game={game} />;
  }
  const privateInventory = (
    session.viewerPrivate?.kind === "dice"
    || session.viewerPrivate?.kind === "number_cards"
    || session.viewerPrivate?.kind === "battleship_fleet"
    || session.viewerPrivate?.kind === "private_value"
    || Boolean(session.viewerPrivate?.sealedCommitment)
  );
  if (privateInventory) {
    const { frame, renderer } = arenaVisualFrameForSession(game, session);
    return (
      <div className="arena-core-private-stack">
        <SharedReplayVisualFrame frame={frame} renderer={renderer} />
        <ArenaPrivateInventory viewerPrivate={session.viewerPrivate} />
      </div>
    );
  }
  if (game.category === "Card") {
    return (
      <ArenaCardTable
        gameSlug={game.slug}
        gameName={game.name}
        publicState={session.publicState}
        viewerPrivate={session.viewerPrivate}
        seats={session.seats}
        humanPlayerId={session.humanPlayerId}
        activeSeatId={session.activeSeatId}
        status={session.status}
        legalActions={session.legalActions}
        actionsDisabled={actionsDisabled}
        onPlay={onPlay}
      />
    );
  }
  const { frame, renderer } = arenaVisualFrameForSession(game, session);
  return <SharedReplayVisualFrame frame={frame} renderer={renderer} />;
}

function arenaVisualFrameForSession(game: ArenaSeed, session: ArenaSessionView | null): { frame: PublicReplayFrame; renderer: ReplayRendererConfig } {
  const renderer = replayRendererForGame(game.slug);
  if (!session?.publicState) {
    return { frame: arenaPreviewFrame(game.slug, renderer), renderer };
  }
  const event = parsePublicReplayEventRow(
    {
      id: `${session.sessionId}:arena:${session.moveNumber}`,
      event_type: "state.updated",
      active_player: session.activePlayerId ?? session.currentPlayer,
      display_frame: session.displayFrame ?? undefined,
      public_state: session.publicState,
      render_hints: session.renderHints ?? undefined,
      scores: session.scores ?? undefined,
      state_hash: session.stateHash ?? undefined,
      terminal: session.status === "completed",
      turn_id: session.moveNumber
    },
    0,
    {
      gameSlug: game.slug,
      rendererFamily: game.renderSpec.rendererFamily,
      invalidDisplayFrame: "use-public-state",
    },
  );
  const timeline = buildPublicReplayTimeline(game.slug, [event]);
  const frame = timeline.frames[0];
  return {
    frame: frame?.board && frame.board.length > 0 ? frame : arenaPreviewFrame(game.slug, renderer),
    renderer: timeline.renderer
  };
}

function chessSquareForBoardIndex(index: number): string {
  const file = "abcdefgh"[index % 8] ?? "a";
  const rank = String(8 - Math.floor(index / 8));
  return `${file}${rank}`;
}

function chessSquareIsDark(square: string): boolean {
  const fileIndex = "abcdefgh".indexOf(square[0] ?? "a");
  const rank = Number(square[1] ?? "1");
  return (fileIndex + rank) % 2 === 1;
}

function arenaChessTokenClass(piece: string): string {
  if (!piece) return "";
  return /[♔♕♖♗♘♙KQRBNP]/u.test(piece) ? "arena-chess-light-piece" : "arena-chess-dark-piece";
}

function arenaLastBoardMove(game: ArenaSeed, session: ArenaSessionView | null): ArenaBoardMove | null {
  const telemetryAction = session?.turnTelemetry?.action;
  const publicState = session?.publicState ?? {};
  const publicMove = stringPublicStateValue(publicState, "lastMove") ?? stringPublicStateValue(publicState, "last_move") ?? stringPublicStateValue(publicState, "action");
  const token = typeof telemetryAction === "string" ? telemetryAction : publicMove;
  return token ? arenaBoardMoveFromAction(game, { token, label: token }) : null;
}

function stringPublicStateValue(state: Record<string, unknown>, key: string): string | null {
  const value = state[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function ArenaLegalActionPanel({
  game,
  session,
  busy,
  result,
  onPlay,
}: {
  game: ArenaSeed;
  session: ArenaSessionView | null;
  busy: ArenaBusy;
  result: ArenaPlayResult | null;
  onPlay: (action: string) => void;
}) {
  const actions = useMemo(() => session?.legalActions ?? [], [session?.legalActions]);
  const disabled = Boolean(result) || Boolean(busy) || session?.currentPlayer !== "human";
  const totalLegalActions = session?.totalLegalActions ?? actions.length;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 36;
  const needle = query.trim().toLowerCase();
  const filteredActions = useMemo(
    () => needle
      ? actions.filter((action) => {
          const descriptor = describeArenaAction(game, action);
          return `${descriptor.label}\n${descriptor.shortLabel}\n${descriptor.hint}\n${action.token}`.toLowerCase().includes(needle);
        })
      : actions,
    [actions, game, needle]
  );
  const totalPages = Math.max(1, Math.ceil(filteredActions.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleActions = filteredActions.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const showActionTools = actions.length > pageSize;
  const emptyActionText = !session
    ? "Opening game."
    : needle ? "No legal action matches that search."
      : session.currentPlayer === "human" ? "No legal action is available."
        : "The opponent is choosing a move.";

  return (
    <div className="arena-actions">
      <div className="arena-actions-head">
        <span className="mono">{!session ? "Starting game" : session.currentPlayer === "human" ? "Your legal actions" : "Waiting for model"}</span>
        <span className="mono">{filteredActions.length}{needle ? ` / ${actions.length}` : totalLegalActions > actions.length ? ` / ${totalLegalActions}` : ""}</span>
      </div>
      {showActionTools ? (
        <div className="arena-action-tools">
          <div className="search-wrap arena-action-search">
            <Icon name="search" size={15} />
            <input
              className="input input-search"
              data-shortcut-search="page"
              aria-label="Search legal actions"
              autoComplete="off"
              placeholder="Search actions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="arena-action-pager">
            <button
              type="button"
              aria-label="Previous legal actions page"
              disabled={currentPage === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <span className="mono">Page {currentPage + 1} / {totalPages}</span>
            <button
              type="button"
              aria-label="Next legal actions page"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      ) : null}
      {visibleActions.length > 0 ? (
        <div className="arena-action-grid">
          {visibleActions.map((action) => {
            const descriptor = describeArenaAction(game, action);
            return (
              <button
                key={action.token}
                type="button"
                className={`arena-action arena-action-${descriptor.kind}`}
                data-action-token={action.token}
                data-action-kind={descriptor.kind}
                disabled={disabled || Boolean(action.disabledReason)}
                title={action.disabledReason ? `${descriptor.label}. ${action.disabledReason}` : `${descriptor.label}. ${descriptor.hint}`}
                onClick={() => onPlay(action.token)}
              >
                <span className="arena-action-main">{descriptor.label}</span>
                <span className="arena-action-sub mono">{action.disabledReason ?? descriptor.shortLabel}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="arena-action-empty mono">{emptyActionText}</div>
      )}
      {showActionTools ? <div className="arena-action-more mono">{totalLegalActions > actions.length ? `Showing ${actions.length} of ${totalLegalActions} legal actions for this turn.` : `All ${actions.length} legal actions are available through search and pages.`}</div> : null}
    </div>
  );
}

function ArenaScorePanel({
  game,
  side,
  session,
  busy,
  result,
  clock,
  pendingTurn,
}: {
  game: ArenaSeed;
  side: ArenaSide;
  session: ArenaSessionView | null;
  busy: ArenaBusy;
  result: ArenaPlayResult | null;
  clock: number;
  pendingTurn: ArenaPendingTurn | null;
}) {
  const board = session?.board;
  const humanStarts = arenaSideStarts(game, side);
  const waitingForHuman = session?.currentPlayer === "human" && !busy && !result;
  const legal = result ? 0
    : game.slug === "tic-tac-toe" || game.slug === "connect-four"
      ? legalActionCount(game, board, !waitingForHuman)
      : waitingForHuman ? session?.totalLegalActions ?? session?.legalActions?.length ?? 0 : 0;
  const modelTurnStatus = session?.modelTurn?.status;
  const status = result
    ? result === "model-unavailable" ? "Completed: model unavailable"
      : result === "timeout-award" ? "Completed: timeout award"
        : result === "abandoned" ? "Completed: match ended"
          : result === "resigned" ? "Completed: human resigned"
            : result === "win" ? "Completed: human win"
              : result === "loss" ? "Completed: model win"
                : "Completed: draw"
    : busy === "launching" && !session ? humanStarts ? "Starting game" : "AI opening"
      : !session ? humanStarts ? "Opening game" : "AI opening"
      : pendingTurn?.stage === "validating" ? "Move sent"
        : modelTurnStatus === "claim_eligible" ? "Model turn timed out"
          : modelTurnStatus === "keep_waiting_offer" ? "Taking longer than usual"
            : modelTurnStatus === "thinking" ? "AI thinking"
              : busy === "thinking" || session?.currentPlayer === "model" ? "Opponent turn in progress"
          : busy === "moving" ? "Accepting move"
            : busy === "resigning" ? "Resigning"
              : "Your turn";
  const turnLabel = result ? "complete" : session?.currentPlayer ?? (humanStarts ? "human" : "model");
  const telemetry = session?.turnTelemetry ?? null;
  const thinkingStartedAt = telemetry?.modelTurnStartedAt ?? pendingTurn?.acceptedAt ?? pendingTurn?.startedAt;
  const thinkingElapsed = (pendingTurn?.stage === "thinking" || busy === "thinking" || session?.currentPlayer === "model") && thinkingStartedAt
    ? elapsedFromArenaClock(clock, thinkingStartedAt)
    : null;
  const pendingElapsed = pendingTurn?.stage === "validating" ? elapsedFromArenaClock(clock, pendingTurn.startedAt) : null;
  const acceptMs = telemetry?.humanEngineValidationMs ?? (
    telemetry?.humanActionReceivedAt && telemetry.humanActionAppliedAt
      ? telemetry.humanActionAppliedAt - telemetry.humanActionReceivedAt
      : null
  );
  const lastTurnMs = telemetry?.totalTurnMs ?? (
    telemetry?.modelTurnStartedAt && telemetry?.modelTurnCompletedAt
      ? telemetry.modelTurnCompletedAt - telemetry.modelTurnStartedAt
      : null
  );
  const providerMs = telemetry?.modelProviderLatencyMs ?? null;
  const modelDecisionMs = telemetry?.modelDecisionMs ?? null;
  const modelEngineMs = telemetry?.modelEngineValidationMs ?? null;
  return (
    <div className="ps-status">
      <div className="ps-status-main"><Icon name={waitingForHuman ? "gamepad" : "layers"} size={15} /><span role="status" aria-live="polite" aria-atomic="true">{status}</span></div>
      <div className="ps-status-grid">
        <span><b className="mono">{session?.moveNumber ?? 0}</b><em>moves</em></span>
        <span><b className="mono">{legal}</b><em>legal actions</em></span>
        <span><b className="mono">{turnLabel}</b><em>turn</em></span>
      </div>
      {!result && (pendingTurn || telemetry) ? <ArenaTurnPhaseStrip session={session} pendingTurn={pendingTurn} result={result} /> : null}
      {!result && (pendingElapsed !== null || thinkingElapsed !== null || lastTurnMs !== null || acceptMs !== null || providerMs !== null || modelDecisionMs !== null || modelEngineMs !== null) ? (
        <div className="ps-latency">
          {pendingElapsed !== null ? <span><i className="ps-thinking-dot" /> Move sent <b className="mono">{formatArenaLatency(pendingElapsed)}</b></span> : null}
          {thinkingElapsed !== null ? <span><i className="ps-thinking-dot" /> AI thinking <b className="mono">{formatArenaLatency(thinkingElapsed)}</b></span> : null}
          {acceptMs !== null && pendingElapsed === null ? <span>Move accepted <b className="mono">{formatArenaLatency(acceptMs)}</b></span> : null}
          {lastTurnMs !== null && thinkingElapsed === null ? <span>Last turn <b className="mono">{formatArenaLatency(lastTurnMs)}</b></span> : null}
          {providerMs !== null ? <span>Provider <b className="mono">{formatArenaLatency(providerMs)}</b></span> : null}
          {modelDecisionMs !== null ? <span>Opponent response <b className="mono">{formatArenaLatency(modelDecisionMs)}</b></span> : null}
          {modelEngineMs !== null && modelEngineMs > 0 ? <span>Rules check <b className="mono">{formatArenaLatency(modelEngineMs)}</b></span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ArenaTurnPhaseStrip({
  session,
  pendingTurn,
  result,
}: {
  session: ArenaSessionView | null;
  pendingTurn: ArenaPendingTurn | null;
  result: ArenaPlayResult | null;
}) {
  const telemetry = session?.turnTelemetry ?? null;
  const accepted = Boolean(telemetry?.humanActionAppliedAt || pendingTurn?.acceptedAt || pendingTurn?.stage === "thinking");
  const opponentActive = !result && (pendingTurn?.stage === "thinking" || session?.currentPlayer === "model");
  const opponentDone = Boolean(result || telemetry?.modelTurnCompletedAt || telemetry?.phase === "model_move_applied" || telemetry?.phase === "completed");
  const opponentLabel = session?.modelTurn?.status === "claim_eligible"
    ? "Model turn timed out"
    : session?.modelTurn?.status === "keep_waiting_offer" ? "Taking longer"
      : session?.modelTurn?.status === "thinking" ? "Opponent thinking"
        : "Opponent turn";
  const steps = [
    { key: "sent", label: "Move sent", active: pendingTurn?.stage === "validating", done: Boolean(pendingTurn || telemetry?.humanActionReceivedAt) },
    { key: "accepted", label: "Move accepted", active: accepted && !opponentActive && !opponentDone && session?.currentPlayer !== "human", done: accepted },
    { key: "opponent", label: opponentDone ? "Opponent moved" : opponentLabel, active: opponentActive, done: opponentDone },
  ];
  return (
    <div className="ps-phasebar" aria-label="Arena turn progress">
      {steps.map((step) => (
        <span key={step.key} className={`ps-phase ${step.active ? "active" : ""} ${step.done ? "done" : ""}`}>
          <i />
          {step.label}
        </span>
      ))}
    </div>
  );
}

function ArenaTurnNotice({
  pendingTurn,
  modelTurn,
  clock,
}: {
  pendingTurn: ArenaPendingTurn;
  modelTurn: ArenaSessionModelTurn | null | undefined;
  clock: number;
}) {
  const elapsed = elapsedFromArenaClock(clock, pendingTurn.startedAt);
  const title = pendingTurn.stage === "validating"
    ? "Move sent"
    : modelTurn?.status === "thinking" ? "Opponent thinking"
      : modelTurn?.status === "keep_waiting_offer" ? "Taking longer than usual"
        : modelTurn?.status === "claim_eligible" ? "Model turn timed out"
          : "Opponent turn in progress";
  const detail = pendingTurn.stage === "validating"
    ? `${pendingTurn.label} is being accepted.`
    : modelTurn?.status === "thinking" ? "The server has confirmed that the model is still working on its move."
      : modelTurn?.status === "keep_waiting_offer" ? "You can keep waiting or leave the app. This match stays active."
        : modelTurn?.status === "claim_eligible" ? "The server stopped accepting this response. Claim the win when eligible, or end this match."
          : pendingTurn.optimistic
      ? `${pendingTurn.label} is on the board. Waiting for the reply.`
      : `${pendingTurn.label} was accepted. Waiting for the reply.`;
  return (
    <div className={`arena-turn-notice arena-turn-${pendingTurn.stage}`}>
      <span className="arena-turn-icon"><Icon name={pendingTurn.stage === "validating" ? "layers" : "bolt"} size={15} /></span>
      {/* Only the turn state is announced; the elapsed clock ticks every 500 ms and would be read aloud on every tick. */}
      <span role="status" aria-live="polite" aria-atomic="true"><b>{title}</b><em>{detail}</em></span>
      <span className="mono arena-turn-time" aria-hidden="true">{formatArenaLatency(elapsed)}</span>
    </div>
  );
}

function ArenaModelTurnControls({
  modelTurn,
  claimAllowed,
  onResign,
  busy,
  setupHref,
  onClaimTimeoutAward,
}: {
  modelTurn: ArenaSessionModelTurn | null | undefined;
  claimAllowed: boolean;
  onResign: () => void;
  busy: ArenaBusy;
  setupHref: string;
  onClaimTimeoutAward: () => void;
}) {
  const turnKey = modelTurn ? `${modelTurn.startedAt}:${modelTurn.status}` : "none";
  const [dismissedTurnKey, setDismissedTurnKey] = useState<string | null>(null);
  const canClaim = claimAllowed && arenaModelTurnCanClaim(modelTurn);
  const offersChoice = modelTurn?.status === "keep_waiting_offer" || modelTurn?.status === "claim_eligible";
  if (!offersChoice || dismissedTurnKey === turnKey) return null;
  const mutationPending = busy === "claiming" || busy === "resigning" || busy === "ending";
  return (
    <div className="arena-turn-notice arena-turn-server-choice" aria-live="polite">
      <span className="arena-turn-icon"><Icon name={canClaim ? "trophy" : "layers"} size={15} /></span>
      <span>
        <b>{canClaim ? "Claim the win" : modelTurn?.lateResponseFenced ? "Model turn ended" : "Keep waiting?"}</b>
        <em>{canClaim
          ? "The server stopped accepting this model response after the hard timeout."
          : modelTurn?.lateResponseFenced ? "This model response was stopped. Resign to end the match. Leaving this page will not end it." : "The model is taking longer than usual. Leaving this page will not end the match."}</em>
      </span>
      <div className="arena2-launch-actions">
        {canClaim ? (
          <Button size="sm" variant="primary" disabled={mutationPending} onClick={onClaimTimeoutAward}>
            {busy === "claiming" ? "Claiming" : "Claim the win"}
          </Button>
        ) : null}
        {modelTurn?.lateResponseFenced ? <Button size="sm" variant="secondary" disabled={mutationPending} onClick={onResign}>Resign</Button> : <Button size="sm" variant="secondary" disabled={mutationPending} onClick={() => setDismissedTurnKey(turnKey)}>Keep waiting</Button>}
        <Button size="sm" variant="ghost" href={setupHref}>Leave app</Button>
      </div>
    </div>
  );
}

function ArenaOpeningNotice({ game, side, model }: { game: ArenaSeed; side: ArenaSide; model: string }) {
  const humanStarts = arenaSideStarts(game, side);
  if (game.topologyMode === "multi_seat") {
    const modelSeats = Math.max(0, game.controlledPlayers.length - 1);
    return (
      <div className={`arena-opening-note ${humanStarts ? "arena-opening-human" : "arena-opening-model"}`} aria-live="polite">
        <span className="arena-opening-icon"><Icon name={humanStarts ? "gamepad" : "bolt"} size={15} /></span>
        <span>
          <b>{humanStarts ? "Preparing your table seat" : "Table is opening"}</b>
          <em>{humanStarts ? `${arenaSideLabelForGame(game, side)} acts first.` : `${model} controls ${modelSeats} model seats until your turn.`}</em>
        </span>
      </div>
    );
  }
  const modelSide = arenaSideLabelForGame(game, arenaOpponentSide(side));
  return (
    <div className={`arena-opening-note ${humanStarts ? "arena-opening-human" : "arena-opening-model"}`} aria-live="polite">
      <span className="arena-opening-icon"><Icon name={humanStarts ? "gamepad" : "bolt"} size={15} /></span>
      <span>
        <b>{humanStarts ? "Preparing your first turn" : "Opponent is opening"}</b>
        <em>{humanStarts ? `${arenaSideLabelForGame(game, side)} starts this game.` : `${model} plays ${modelSide} first.`}</em>
      </span>
    </div>
  );
}

function arenaFooterStatus(
  session: ArenaSessionView | null,
  busy: ArenaBusy,
  result: ArenaPlayResult | null,
  pendingTurn: ArenaPendingTurn | null
): string {
  if (result) {
    return session?.resultPublicationStatus === "persisted" ? "saved to profile" : session?.resultPublicationStatus === "quarantined" ? "result could not be saved" : "saving result";
  }
  if (pendingTurn?.stage === "validating") {
    return "move sent";
  }
  if (session?.modelTurn?.status === "claim_eligible" && arenaModelTurnCanClaim(session.modelTurn)) {
    return "timeout claim available";
  }
  if (session?.modelTurn?.status === "keep_waiting_offer") {
    return "taking longer than usual";
  }
  if (pendingTurn?.stage === "thinking" || busy === "thinking" || session?.currentPlayer === "model") {
    return "opponent thinking";
  }
  if (busy === "launching" && !session) {
    return "starting game";
  }
  if (!session) {
    return "opening game";
  }
  if (busy === "moving") {
    return "accepting move";
  }
  if (busy === "resigning") {
    return "resigning";
  }
  if (busy === "claiming") {
    return "claiming timeout award";
  }
  if (busy === "ending") {
    return "ending current match";
  }
  return "match in progress";
}

function ArenaPreview({ game }: { game: ArenaSeed }) {
  const renderer = useMemo(() => replayRendererForGame(game.slug), [game.slug]);
  const frames = useMemo(() => arenaPreviewFrames(game.slug, renderer), [game.slug, renderer]);
  const frameIndex = usePreviewFrameIndex(frames.length);
  const frame = frames[frameIndex] ?? frames[0];
  return (
    <div className={`agame agame-preview agame-preview-${renderer.kind}`}>
      <SharedReplayVisualFrame frame={frame} renderer={renderer} />
    </div>
  );
}

function usePreviewFrameIndex(length: number): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timeout: number | null = null;
    let current = 0;
    const tick = () => {
      if (cancelled) {
        return;
      }
      current += 1;
      if (current >= length) {
        current = length - 1;
        setIndex(current);
        timeout = window.setTimeout(() => {
          current = 0;
          setIndex(0);
          timeout = window.setTimeout(tick, 520);
        }, 900);
        return;
      }
      setIndex(current);
      timeout = window.setTimeout(tick, 520);
    };
    timeout = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setIndex(0);
      if (length > 1) {
        timeout = window.setTimeout(tick, 520);
      }
    }, 0);
    return () => {
      cancelled = true;
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  }, [length]);
  return Math.min(index, Math.max(0, length - 1));
}

function arenaPreviewFrames(gameSlug: string, renderer: ReplayRendererConfig): PublicReplayFrame[] {
  return arenaPreviewBoards(gameSlug, renderer).map((board, index) => arenaPreviewFrame(gameSlug, renderer, board, index));
}

function arenaPreviewFrame(
  gameSlug: string,
  renderer: ReplayRendererConfig,
  board: string[] = arenaPreviewBoards(gameSlug, renderer)[0] ?? previewBoard(renderer.rows, renderer.cols, []),
  index = 0
): PublicReplayFrame {
  const frame = emptyReplayFrameForGame(gameSlug);
  return {
    ...frame,
    index,
    id: `${gameSlug}:preview:${index}`,
    board,
    rows: renderer.rows,
    cols: renderer.cols,
    hasVisibleState: board.some((cell) => cell.trim().length > 0 && cell !== "."),
  };
}

function arenaPreviewBoards(gameSlug: string, renderer: ReplayRendererConfig): string[][] {
  if (gameSlug === "chess") {
    return [
      ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜", "♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟", ...Array(32).fill(""), "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
      ["♜", "", "♝", "♛", "♚", "♝", "♞", "♜", "♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟", "", "", "♞", "", "", "", "", "", ...Array(24).fill(""), "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
      ["♜", "", "♝", "♛", "♚", "♝", "♞", "♜", "♟", "♟", "♟", "", "♟", "♟", "♟", "♟", "", "", "♞", "♟", "", "", "", "", ...Array(24).fill(""), "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙", "♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
    ];
  }
  if (renderer.kind === "tic-tac-toe") {
    return previewSequence(renderer.rows, renderer.cols, [[1, 1, "X"], [0, 0, "O"], [0, 2, "X"], [0, 1, "O"], [2, 0, "X"]]);
  }
  if (renderer.kind === "connect-four") {
    return connectFourPreviewBoards([[3, "R"], [2, "Y"], [3, "R"], [4, "Y"], [3, "R"], [4, "Y"], [3, "R"]]);
  }
  if (renderer.kind === "card-table") {
    return [["A♠", "K♥", "Q♦"], ["A♠", "K♥", "Q♦", "J♣"], ["A♠", "K♥", "Q♦", "J♣", "10♠"]];
  }
  if (renderer.kind === "dice-table") {
    return [["1", "2", "3", "4", "5"], ["6", "2", "5", "1", "4"], ["3", "3", "5", "2", "6"]];
  }
  if (renderer.kind === "strategy-matrix") {
    return [["3,3", "0,5", "5,0", "1,1"], ["3,3", "0,5", "5,0", "4,4"], ["2,2", "1,3", "3,1", "5,5"]];
  }
  if (renderer.kind === "stone-grid") {
    const center = Math.floor(renderer.rows / 2);
    return previewSequence(renderer.rows, renderer.cols, [[center, center, "B"], [center - 1, center, "W"], [center, center + 1, "B"], [center + 1, center - 1, "W"], [center + 1, center, "B"], [center - 1, center + 1, "W"]]);
  }
  if (renderer.kind === "disc-grid") {
    return previewSequence(renderer.rows, renderer.cols, [[3, 3, "W"], [3, 4, "B"], [4, 3, "B"], [4, 4, "W"], [2, 3, "B"], [2, 4, "B"], [2, 5, "W"]]);
  }
  if (renderer.kind === "checkers") {
    return previewSequence(renderer.rows, renderer.cols, [[5, 0, "r"], [5, 2, "r"], [6, 1, "r"], [2, 1, "b"], [2, 3, "b"], [3, 4, "b"], [4, 3, "r"]]);
  }
  if (renderer.kind === "hex-grid") {
    return previewSequence(renderer.rows, renderer.cols, [[2, 2, "A"], [3, 2, "B"], [4, 3, "A"], [5, 3, "B"], [5, 4, "A"]]);
  }
  if (renderer.kind === "ultimate-grid") {
    return previewSequence(renderer.rows, renderer.cols, [[0, 0, "X"], [1, 1, "O"], [3, 3, "X"], [4, 4, "O"], [8, 8, "X"]]);
  }
  if (renderer.kind === "mancala") {
    return [["4", "4", "4", "4", "4", "4", "0", "4", "4", "4", "4", "4", "4", "0"], ["4", "0", "5", "5", "5", "5", "1", "4", "4", "4", "4", "4", "4", "0"], ["5", "1", "0", "6", "6", "6", "1", "4", "4", "4", "4", "4", "4", "0"]];
  }
  if (renderer.kind === "morris") {
    return previewSequence(1, 24, [[0, 0, "A"], [0, 3, "B"], [0, 6, "A"], [0, 9, "B"], [0, 12, "A"]]);
  }
  if (renderer.kind === "backgammon") {
    return [["2", "", "", "", "", "5", "", "3", "", "", "", "5", "5", "", "", "", "3", "", "5", "", "", "", "", "2"]];
  }
  if (renderer.kind === "battleship") {
    return previewSequence(renderer.rows, renderer.cols, [[1, 1, "ship"], [2, 1, "ship"], [4, 5, "miss"], [2, 1, "hit"], [7, 3, "miss"]]);
  }
  if (renderer.kind === "rl-grid") {
    return previewSequence(renderer.rows, renderer.cols, [[0, 0, "agent"], [0, renderer.cols - 1, "goal"], [0, 3, "wall"], [0, 6, "danger"]]);
  }
  if (renderer.kind === "rl-track") {
    return [1, 3, 5, 8].map((agentIndex) => previewBoard(1, renderer.cols, [[0, agentIndex, "agent"], [0, renderer.cols - 1, "goal"]]));
  }
  if (renderer.kind === "rl-scene") {
    return [["alt 42", "vx -0.3", "target"], ["alt 28", "vx -0.1", "target"], ["touchdown", "reward +1", "target"]];
  }
  return previewSequence(renderer.rows, renderer.cols, [[1, 1, "A"], [2, 2, "B"], [3, 3, "A"], [4, 4, "B"]]);
}

function previewSequence(rows: number, cols: number, entries: readonly (readonly [row: number, col: number, value: string])[]): string[][] {
  const visibleSeed = Math.min(entries.length, 3);
  return entries.map((_, index) => previewBoard(rows, cols, entries.slice(0, Math.max(visibleSeed, index + 1))));
}

function previewBoard(rows: number, cols: number, entries: readonly (readonly [row: number, col: number, value: string])[]): string[] {
  const board = Array.from({ length: rows * cols }, () => "");
  for (const [row, col, value] of entries) {
    const index = row * cols + col;
    if (index >= 0 && index < board.length) {
      board[index] = value;
    }
  }
  return board;
}

function connectFourPreviewBoards(moves: readonly (readonly [column: number, value: string])[]): string[][] {
  const board = Array.from({ length: 42 }, () => "");
  const heights = Array.from({ length: 7 }, () => 0);
  return moves.flatMap(([column, value]) => {
    const boundedColumn = Math.max(0, Math.min(6, column));
    const currentHeight = heights[boundedColumn] ?? 0;
    if (currentHeight >= 6) {
      return [];
    }
    const row = 5 - currentHeight;
    heights[boundedColumn] = currentHeight + 1;
    const index = row * 7 + boundedColumn;
    if (index < 0 || index >= board.length) {
      return [];
    }
    board[index] = value;
    return [board.slice()];
  });
}

function ResultScreen({ game, model, session, result, moves, stage = false, onAgain, onNewModel, onNewGame }: { game: ArenaSeed; model: string; session: ArenaSessionView | null; result: ArenaPlayResult; moves: number; stage?: boolean; onAgain: () => void; onNewModel: () => void; onNewGame: () => void }) {
  const [shareOpen, setShareOpen] = useState(false);
  const cooperativeScore = session?.outcome?.cooperative_score;
  const presentation = game.topologyMode === "cooperative" && typeof cooperativeScore === "number"
    ? { title: session?.outcome?.team_success ? "Team success" : "Team score",
      description: `You and the model scored ${cooperativeScore} out of ${session?.outcome?.max_score ?? 6}.`,
      label: `${cooperativeScore}/${session?.outcome?.max_score ?? 6}`, tone: "draw" as const, icon: "layers" as const }
    : arenaResultPresentation(result);
  const requestModel = battlefieldRequestModels.find((item) => item.id === model);
  const providerSlug = requestModel?.provider ?? model.split("/")[0] ?? "unknown";
  const providerName = providerBySlug[providerSlug]?.name ?? providerSlug;
  const modelName = modelNameFromId(model);
  return (
    <div className={`result card ${stage ? "arena-result-stage" : ""}`}>
      <div className={`result-banner rb-${presentation.tone}`}><div className="rb-icon"><Icon name={presentation.icon} size={26} /></div><div className="rb-text"><div className="rb-title">{presentation.title}</div><div className="rb-desc">{presentation.description}</div></div><div className="rb-game"><GameGlyph slug={game.slug} category={game.category} size={20} /> {game.name}</div></div>
      <div className="result-stats"><div className="rs-vs"><span className="rs-you">You</span><span className={`reschip reschip-${presentation.tone}`}>{presentation.label}</span><ModelBadge id={model} size={13} /></div><div className="rs-grid"><div className="rs-cell"><span className="rs-l">Moves</span><span className="mono rs-v">{moves}</span></div><div className="rs-cell"><span className="rs-l">Session</span><span className="mono rs-v">{session?.sessionId ? session.sessionId.slice(0, 8) : "Saved"}</span></div><div className="rs-cell"><span className="rs-l">Provider</span><span className="rs-v">{providerName}</span></div><div className="rs-cell"><span className="rs-l">Profile save</span><span className="rs-v"><Icon name="check" size={15} /></span></div></div></div>
      <div className="result-actions"><Button variant="primary" onClick={onAgain} icon="refresh">Play again</Button><Button variant="secondary" onClick={onNewModel} icon="cpu">Try another model</Button><Button variant="ghost" onClick={onNewGame} icon="grid">New game</Button>{session?.sessionId ? <Button onClick={() => setShareOpen(true)} variant="ghost" icon="upload">Share</Button> : null}{session?.sessionId && session.matchVisibility !== "public" ? <span className="result-private-note"><Icon name="lock" size={13} /> This result is saved to your private profile.</span> : null}</div>
      {session ? <MatchShareSheet open={shareOpen} onClose={() => setShareOpen(false)} data={{game:game.name,gameSlug:game.slug,matchup:`You vs ${modelName}`,headline:presentation.title,message:`I just played ${game.name} against ${modelName}. Watch my game here:`,href:`/arena/replays/${encodeURIComponent(session.sessionId)}`,board:session.board,visibility:session.matchVisibility ?? "only_me"}} /> : null}
    </div>
  );
}

function arenaResultPresentation(result: ArenaPlayResult): Readonly<{
  title: string;
  description: string;
  label: string;
  tone: "win" | "loss" | "draw";
  icon: IconName;
}> {
  if (result === "win") return { title: "Victory", description: "You beat the model.", label: "WIN", tone: "win", icon: "trophy" };
  if (result === "loss") return { title: "Defeated", description: "The model came out ahead.", label: "LOSS", tone: "loss", icon: "flag" };
  if (result === "resigned") return { title: "You resigned", description: "The match ended as an explicit resignation.", label: "RESIGNED", tone: "loss", icon: "flag" };
  if (result === "timeout-award") return { title: "Victory on timeout", description: "The server fenced the late model response and awarded the match.", label: "TIMEOUT WIN", tone: "win", icon: "trophy" };
  if (result === "abandoned") return { title: "Match ended", description: "The match ended without a rated result.", label: "ENDED", tone: "draw", icon: "layers" };
  if (result === "model-unavailable") return { title: "AI opponent unavailable", description: "Your evidence was saved, but the opponent could not complete the match.", label: "UNAVAILABLE", tone: "draw", icon: "lock" };
  return { title: "Draw", description: "Evenly matched game.", label: "DRAW", tone: "draw", icon: "layers" };
}

function HumanVsModel({ gameRows = arenas }: { gameRows?: ArenaSeed[] }) {
  const arenaRows = gameRows.length > 0 ? gameRows : arenas;
  const arenaPlayableCount = arenaRows.filter(isArenaBrowserPlayable).length;
  return (
    <div className="hvm">
      <SectionHead eyebrow="Arena" title="Human vs Model" sub={`${arenaPlayableCount} games are browser playable. Public game summaries appear after eligible Arena games are published.`} />
      <ComingSoonCard icon="user" title="Arena summaries coming soon" body="This section will show published Arena games when enough public play history is available." />
    </div>
  );
}


export type PublicProfileHistoryView = {
  readonly matchId: string;
  readonly arenaSlug: string;
  readonly arenaName: string;
  readonly variantName: string | null;
  readonly opponentDisplayName: string | null;
  readonly opponentModelEntryId: string | null;
  readonly opponentModelBadgeId: string | null;
  readonly opponentProviderSlug: string | null;
  readonly resultLabel: string;
  readonly resultTone: "plain" | "accent" | "win" | "loss" | "draw";
  readonly playedAt: number;
  readonly replayId: string | null;
};

export type PublicProfileArtifactCardView = {
  readonly canCancelUpload?: boolean;
  readonly id: string;
  readonly artifactName: string | null;
  readonly artifactKind: string;
  readonly visibility: string;
  readonly verificationLevel: string;
  readonly signatureStatus: string;
  readonly sizeBytes: number;
  readonly matchId: string | null;
  readonly createdAt: number;
};

type ProfileViewerView = {
  readonly isOwner: boolean;
  readonly image: string | null;
};

const EMPTY_PROFILE_HISTORY: PublicProfileHistoryView[] = [];
const EMPTY_PROFILE_ARTIFACTS: PublicProfileArtifactCardView[] = [];
const profileTabs = ["Games", "Replays"] as const;
type ProfileTab = typeof profileTabs[number];
const profileTabIds: Record<ProfileTab, string> = {
  Games: "profile-tab-games",
  Replays: "profile-tab-replays",
};
const profileTabPanelId = "profile-tab-panel";
type ProfileHistorySortKey = "game" | "model" | "result" | "date";
type ProfileVisibility = PublicWebProfileSummaryView["visibility"];
type ArtifactUploadVisibility = "private" | "public";

type ArtifactUploadDraft = {
  file: File;
  artifactName: string;
  visibility: ArtifactUploadVisibility;
  suggestions: string[];
};

type ArtifactUploadTicketResponse =
  | {
      ok: true;
	      data: {
	        artifactId: string;
	        artifactName?: string;
	        visibility?: ArtifactUploadVisibility;
	        artifactUrl?: string;
	        slugUrl?: string | null;
	        uploadUrl: string;
	        method: "PUT";
	        headers: Record<string, string>;
	        maxBytes: number;
	      };
    }
  | { ok: false; error: { code: string; message: string; details?: { maxBytes?: number } } };

type ArtifactUploadCompleteResponse =
  | { ok: true; data: { artifactId: string; artifactName?: string; visibility?: ArtifactUploadVisibility; artifactUrl?: string; slugUrl?: string | null; queued: boolean } }
  | { ok: false; error: { code: string; message: string } };

type ArtifactVisibilityResponse =
  | { ok: true; data: { artifactId: string; visibility: ArtifactUploadVisibility; updatedAt: number } }
  | { ok: false; error: { code: string; message: string } };

export function ProfilePage({
  profileView,
  history = EMPTY_PROFILE_HISTORY,
  artifacts = EMPTY_PROFILE_ARTIFACTS,
  viewer,
}: {
  profileView: PublicWebProfileView;
  history?: readonly PublicProfileHistoryView[];
  artifacts?: readonly PublicProfileArtifactCardView[];
  viewer?: ProfileViewerView | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("Games");
  const [uploadedArtifacts, setUploadedArtifacts] = useState<PublicProfileArtifactCardView[]>([]);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const profileTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleProfile = profileView.summary;
  const fullProfile = profileView.full;
  const profileUsername = visibleProfile.username;
  const displayName = visibleProfile.displayName || profileUsername;
  const joinedAt = fullProfile ? profileDateFormat.format(new Date(fullProfile.joinedAt)) : null;
  const gamesPlayed = fullProfile?.statistics.gamesPlayed ?? 0;
  const wins = fullProfile?.statistics.wins ?? 0;
  const losses = fullProfile?.statistics.losses ?? 0;
  const draws = fullProfile?.statistics.draws ?? 0;
  const completedGames = Math.max(1, wins + losses + draws);
  const winRate = gamesPlayed > 0 ? `${Math.round((wins / completedGames) * 100)}%` : "No games yet";
  const canManage = profileView.relationship === "self" && viewer?.isOwner === true;
  const visibleTabs = profileTabs;
  const profileSettingsHref = "/settings/profile";
  const artifactRows = useMemo(() => {
    const uploadedIds = new Set(uploadedArtifacts.map(artifact => artifact.id));
    return [...uploadedArtifacts, ...artifacts.filter(artifact => !uploadedIds.has(artifact.id))];
  }, [artifacts, uploadedArtifacts]);
  const visibility = visibleProfile.visibility;
  const visibilityCopy = profileVisibilityCopy(visibility);
  const incomingAvatarImage = visibleProfile.image ?? (canManage ? viewer?.image ?? null : null);
  const [profileAvatarImage, setProfileAvatarImage] = useState(incomingAvatarImage);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setProfileAvatarImage(incomingAvatarImage));
    return () => window.cancelAnimationFrame(frame);
  }, [incomingAvatarImage]);

  function applyOwnerAvatar(image: string | null) {
    setProfileAvatarImage(image);
    patchAccountSessionUser({ image });
    publishProfileMutation({ oldUsername: profileUsername, newUsername: profileUsername });
    setAvatarEditorOpen(false);
    router.refresh();
  }

  return (
    <PublicPage>
      <div className="page profile st-profile">
        <div className="wrap page-pad">
          <div className="pf-header card">
            <div className="pf-id">
              {canManage ? (
                <button className="set-avatar-edit pf-avatar-edit" type="button" aria-label="Edit profile photo" onClick={() => setAvatarEditorOpen(true)}>
                  <Avatar className="pf-avatar" image={profileAvatarImage} username={profileUsername} name={displayName} label={`${displayName} profile avatar`} />
                  <span className="set-avatar-edit-overlay" aria-hidden="true"><AvatarCameraIcon size={20} /></span>
                </button>
              ) : (
                <Avatar className="pf-avatar" image={profileAvatarImage} username={profileUsername} name={displayName} label={`${displayName} profile avatar`} />
              )}
              <div className="pf-idtext">
                <div className="pf-namerow">
                  <h1 className="pf-name">{displayName}</h1>
                  <Tag tone={visibility === "public" ? "accent" : "plain"}><Icon name={visibilityCopy.icon} size={12} /> {visibilityCopy.label}</Tag>
                </div>
                <div className="pf-sub"><span className="mono">@{profileUsername}</span>{joinedAt ? <> · joined {joinedAt}</> : null}</div>
                <ProfileBio summary={visibleProfile} full={fullProfile} />
              </div>
            </div>
            <div className="pf-header-rail">
              {canManage ? <div className="pf-header-actions"><Button href={profileSettingsHref} variant="secondary" size="sm" icon="user">Edit profile</Button></div> : null}
              <ProfileSocialControls
                key={profileUsername}
                profileUsername={profileUsername}
                relationship={{
                  relationship: profileView.relationship,
                  access: profileView.access,
                  requestId: profileView.requestId,
                  followerCount: visibleProfile.followerCount,
                  followingCount: visibleProfile.followingCount,
                }}
                signedIn={Boolean(viewer)}
              />
              {fullProfile ? <div className="pf-metrics">
                <div className="pf-metric"><span className="pf-mn mono">{gamesPlayed.toLocaleString()}</span><span className="pf-ml">Scored games</span></div>
                <div className="pf-metric"><span className="pf-mn mono">{winRate}</span><span className="pf-ml">Win rate</span></div>
                <div className="pf-metric pf-wld"><span className="pf-wldrow mono"><b className="pf-w">{wins}</b><span>-</span><b className="pf-l">{losses}</b><span>-</span><b className="pf-d">{draws}</b></span><span className="pf-ml">W · L · D</span></div>
              </div> : null}
            </div>
          </div>
          {canManage && avatarEditorOpen ? (
            <DeferredAvatarEditorDialog
              open
              currentImage={profileAvatarImage}
              onClose={() => setAvatarEditorOpen(false)}
              onUploaded={applyOwnerAvatar}
              onRemoved={() => applyOwnerAvatar(null)}
            />
          ) : null}
          {canManage ? <ProfileOwnerSocialManager /> : null}
          {!canManage && viewer ? <ProfileSafetyActions username={profileUsername} /> : null}
          {profileView.access === "summary" ? (
            <div className="pf-private card" role="status">
              <Icon name="lock" size={22} />
              <div>
                <strong>This profile is private</strong>
                <p>Follow approval is required to view Arena statistics, match history, replays, and activity.</p>
              </div>
            </div>
          ) : (
            <>
          <ProfileOverview history={history} perGame={fullProfile?.perGame ?? []} />
          <div className="pf-tabs tabs" role="tablist" aria-label={`${displayName} activity`}>
            {visibleTabs.map((item, index) => (
              <button
                key={item}
                ref={(node) => { profileTabRefs.current[index] = node; }}
                id={profileTabIds[item]}
                type="button"
                className={tab === item ? "active" : ""}
                role="tab"
                aria-controls={profileTabPanelId}
                aria-selected={tab === item}
                tabIndex={tab === item ? 0 : -1}
                onClick={() => setTab(item)}
                onKeyDown={(event) => {
                  const nextIndex = rovingFocusIndex(event.key, index, visibleTabs.length);
                  if (nextIndex === null) return;
                  event.preventDefault();
                  const nextTab = visibleTabs[nextIndex];
                  if (!nextTab) return;
                  setTab(nextTab);
                  profileTabRefs.current[nextIndex]?.focus();
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div
            id={profileTabPanelId}
            role="tabpanel"
            aria-labelledby={profileTabIds[tab]}
            tabIndex={0}
          >
            {tab === "Games" ? <ProfileHistoryTable key={`${profileUsername}:${profileView.relationship}:${history[0]?.matchId ?? "empty"}:${fullProfile?.matchHistoryNextCursor ?? "end"}`} rows={history} username={profileUsername} relationship={profileView.relationship} nextCursor={fullProfile?.matchHistoryNextCursor ?? null} /> : null}
            {tab === "Replays" ? (
              <ArtifactGrid
                username={profileUsername}
                artifacts={artifactRows}
                canUpload={canManage}
                onArtifactUploaded={(artifact) => setUploadedArtifacts((rows) => [artifact, ...rows.filter(row => row.id !== artifact.id)])}
              />
            ) : null}
          </div>
            </>
          )}
        </div>
      </div>
    </PublicPage>
  );
}

function ProfileSocialControls({
  profileUsername,
  relationship,
  signedIn,
}: {
  profileUsername: string;
  relationship: PublicWebProfileRelationshipView;
  signedIn: boolean;
}) {
  const [socialRelationship, setSocialRelationship] = useReducer(
    (_current: PublicWebProfileRelationshipView, next: PublicWebProfileRelationshipView) => next,
    relationship,
  );
  useEffect(() => {
    setSocialRelationship(relationship);
  }, [relationship]);
  const followerCount = socialRelationship.followerCount;
  const followingCount = socialRelationship.followingCount;
  return (
    <div className={socialStyles.profileSocial}>
      <div className={socialStyles.profileSocialLinks}>
        {socialRelationship.access === "full" ? (
          <>
            <Link href={`/${encodeURIComponent(profileUsername)}/followers`} aria-label={`View ${followerCount.toLocaleString()} followers`}>
              <strong>{followerCount.toLocaleString()}</strong>
              <span>Followers</span>
            </Link>
            <Link href={`/${encodeURIComponent(profileUsername)}/following`} aria-label={`View ${followingCount.toLocaleString()} following`}>
              <strong>{followingCount.toLocaleString()}</strong>
              <span>Following</span>
            </Link>
          </>
        ) : (
          <>
            <span className={socialStyles.profileSocialCount}>
              <strong>{followerCount.toLocaleString()}</strong>
              <span>Followers</span>
            </span>
            <span className={socialStyles.profileSocialCount}>
              <strong>{followingCount.toLocaleString()}</strong>
              <span>Following</span>
            </span>
          </>
        )}
      </div>
      <ProfileRelationshipControl
        username={profileUsername}
        initialRelationship={socialRelationship}
        signedIn={signedIn}
        onRelationshipChange={setSocialRelationship}
      />
    </div>
  );
}

function ProfileBio({ summary, full }: { summary: PublicWebProfileSummaryView; full: PublicWebProfileView["full"] }) {
  const website = normalizedProfileWebsite(full?.websiteUrl ?? null);
  if (!summary.bio && !full?.location && !website) {
    return null;
  }
  return (
    <div className="pf-bio">
      {summary.bio ? <p>{summary.bio}</p> : null}
      <div className="pf-bio-meta">
        {full?.location ? <span><Icon name="globe" size={13} /> {full.location}</span> : null}
        {website ? <a href={website} target="_blank" rel="noreferrer"><Icon name="link" size={13} /> {new URL(website).hostname.replace(/^www\./u, "")}</a> : null}
      </div>
    </div>
  );
}

function normalizedProfileWebsite(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function ProfileOverview({ history, perGame }: { history: readonly PublicProfileHistoryView[]; perGame: NonNullable<PublicWebProfileView["full"]>["perGame"] }) {
  const scoredHistory = useMemo(() => scoredProfileHistory(history), [history]);
  const recent = useMemo(() => scoredHistory.toSorted((a, b) => b.playedAt - a.playedAt).slice(0, 5), [scoredHistory]);
  const favorite = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of scoredHistory) counts.set(row.arenaSlug, (counts.get(row.arenaSlug) ?? 0) + 1);
    let favoriteSlug: string | null = null;
    let favoriteCount = 0;
    for (const [slug, count] of counts) {
      if (count > favoriteCount) {
        favoriteSlug = slug;
        favoriteCount = count;
      }
    }
    return favoriteSlug;
  }, [scoredHistory]);
  const favoriteArena = favorite ? arenaBySlug[favorite] : null;
  return (
    <div className="pf2-overview">
      <div className="pf2-ocard">
        <div className="pf2-ohead">Win rate by category</div>
        <div className="pf2-catbars">
          {categories.map((category) => {
            const pct = profileCategoryWinRate(perGame, category, (game) => arenaBySlug[game]?.category);
            return (
              <div key={category} className="pf2-catbar">
                <span className="pf2-catname">{categoryLabels[category]}</span>
                <span className="pf2-cattrack"><span className="pf2-catfill" style={{ width: `${pct ?? 0}%` }} /></span>
                <span className="pf2-catpct">{pct === null ? "No games" : `${pct}%`}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="pf2-ocard pf2-bigstat">
        <div className="pf2-ohead">Recent form</div>
        {recent.length > 0 ? (
          <div className="pf2-form">
            {recent.map((row) => {
              const result = row.resultTone === "win" ? "W" : row.resultTone === "loss" ? "L" : "D";
              return <span key={row.matchId} className={`pf2-formchip pf2-form-${result}`}>{result}</span>;
            })}
          </div>
        ) : <div className="pf2-bignum pf2-none">No games yet</div>}
        <div className="pf2-biglbl" style={{ marginTop: 14 }}>Last {recent.length || 0} scored games</div>
      </div>
      <div className="pf2-ocard pf2-bigstat">
        <div className="pf2-ohead">Favourite game</div>
        {favoriteArena ? (
          <div className="pf2-bignum pf2-fav"><GameGlyph slug={favoriteArena.slug} category={favoriteArena.category} size={20} /> {favoriteArena.name}</div>
        ) : <div className="pf2-bignum pf2-none">No games yet</div>}
        <div className="pf2-biglbl">Most-played from scored public history</div>
      </div>
    </div>
  );
}

export function ProfileHistoryTable({ rows, username, relationship = "none", nextCursor = null }: { rows: readonly PublicProfileHistoryView[]; username?: string; relationship?: PublicWebProfileView["relationship"]; nextCursor?: string | null }) {
  const [historyPage, setHistoryPage] = useState<{ rows: PublicProfileHistoryView[]; cursor: string | null; busy: boolean; error: string | null; accessChanged: boolean }>({ rows: [], cursor: nextCursor, busy: false, error: null, accessChanged: false });
  const historyAbort = useRef<AbortController | null>(null);
  useEffect(() => () => historyAbort.current?.abort(), []);
  const historyRows = useMemo(() => historyPage.accessChanged ? [] : [...rows, ...historyPage.rows], [rows, historyPage.rows, historyPage.accessChanged]);
  async function loadOlderGames() {
    if (!username || !historyPage.cursor || historyAbort.current) return;
    const controller = new AbortController();
    historyAbort.current = controller;
    setHistoryPage(current => ({ ...current, busy: true, error: null }));
    const result = await loadProfileHistoryPage(username, historyPage.cursor, relationship, controller.signal);
    if (!controller.signal.aborted) {
      if (!result.ok && result.accessChanged) setSelectedReplay(null);
      setHistoryPage(current => {
        if (!result.ok) return { ...current, busy: false, error: result.message, accessChanged: result.accessChanged, ...(result.accessChanged ? { rows: [], cursor: null } : {}) };
        const existingIds = new Set([...rows, ...current.rows].map(row => row.matchId));
        return { rows: [...current.rows, ...result.rows.filter(row => !existingIds.has(row.matchId))], cursor: result.nextCursor, busy: false, error: null, accessChanged: false };
      });
    }
    historyAbort.current = null;
  }
  const [sortKey, setSortKey] = useState<ProfileHistorySortKey>("date");
  const [sortDirection, setSortDirection] = useState<-1 | 1>(-1);
  const [selectedReplay, setSelectedReplay] = useState<PublicProfileHistoryView | null>(null);
  const sortedRows = useMemo(() => {
    return historyRows.toSorted((a, b) => compareProfileHistoryRows(a, b, sortKey) * sortDirection);
  }, [historyRows, sortDirection, sortKey]);
  const header = (key: ProfileHistorySortKey, label: string, className = "") => (
    <th scope="col" aria-sort={sortKey === key ? (sortDirection === 1 ? "ascending" : "descending") : "none"} className={className}>
    <button
      type="button"
      aria-label={`Sort by ${label}`}
      className={`gh-th ${className} ${sortKey === key ? "gh-th-act" : ""}`}
      onClick={() => {
        if (sortKey === key) {
          setSortDirection((value) => value === 1 ? -1 : 1);
        } else {
          setSortKey(key);
          setSortDirection(key === "date" ? -1 : 1);
        }
      }}
    >
      {label}
      {sortKey === key ? <Icon name="chevronDown" size={13} className={sortDirection === 1 ? "rot" : ""} /> : null}
    </button></th>
  );

  return (
    <div className="gh-history-region" role="region" aria-label="Game history" tabIndex={0}><table className="gh card" aria-label="Game history">
      <thead><tr className="gh-head">{header("game", "Game")}{header("model", "Model", "gh-th-model")}{header("result", "Result", "ta-r")}{header("date", "Date", "ta-r")}<th scope="col" className="ta-r gh-th-replay">Replay</th></tr></thead><tbody>
      {historyRows.length === 0 ? (
        <tr className="gh-row gh-row-soon"><td className="gh-game"><Icon name="layers" size={15} /> Match history coming soon</td><td className="gh-model">No public Arena games yet</td><td className="ta-r"><Tag>Coming soon</Tag></td><td className="ta-r gh-date mono">Coming soon</td><td className="ta-r gh-replay">Coming soon</td></tr>
      ) : sortedRows.map((row) => {
        const arena = arenaBySlug[row.arenaSlug];
        const rowBody = (
          <>
            <td className="gh-game"><GameGlyph slug={row.arenaSlug} category={arena?.category ?? "Board"} size={15} /> <span>{row.arenaName}</span>{row.variantName ? <span className="gh-variant">{row.variantName}</span> : null}</td>
            <td className="gh-model">{row.opponentModelBadgeId ? <ModelBadge id={row.opponentModelBadgeId} size={12} /> : row.opponentDisplayName ?? "Opponent unavailable"}</td>
            <td className="ta-r"><Tag tone={row.resultTone}>{row.resultLabel}</Tag></td>
            <td className="ta-r gh-date mono">{profileRowDateFormat.format(new Date(row.playedAt))}</td>
            <td className="ta-r gh-replay"><button type="button" className="gh-watch" onClick={() => setSelectedReplay(row)} aria-label={`View ${row.arenaName} replay details`}><Icon name={row.replayId ? "play" : "layers"} size={12} /> {row.replayId ? "Replay" : "Details"}</button></td>
          </>
        );
        return (
          <tr key={row.matchId} className="gh-row">
            {rowBody}
          </tr>
        );
      })}
      </tbody></table>
      {historyPage.error ? <p role="alert">{historyPage.error}</p> : null}
      {historyPage.cursor && username ? <Button variant="secondary" onClick={loadOlderGames} disabled={historyPage.busy}>{historyPage.busy ? "Loading older games…" : historyPage.error ? "Retry older games" : "Show older games"}</Button> : null}
      {historyPage.accessChanged && username ? <Link href={`/${encodeURIComponent(username)}`} prefetch={false}>Reload profile</Link> : null}
      {selectedReplay ? <ProfileReplayModal row={selectedReplay} onClose={() => setSelectedReplay(null)} /> : null}
    </div>
  );
}

function ProfileReplayModal({ row, onClose }: { row: PublicProfileHistoryView; onClose: () => void }) {
  const dialogRef = useControlledModalDialog(true, onClose);
  const arena = arenaBySlug[row.arenaSlug] ?? null;
  const replayId = row.replayId;
  const opponent = row.opponentModelBadgeId ?? row.opponentDisplayName ?? "Opponent";
  const publicReplay = usePublicReplayEvents(replayId, row.arenaSlug);
  const replay = useMemo(() => {
    if (publicReplay.events.length > 0) {
      return replayStateFromTimeline(buildPublicReplayTimeline(row.arenaSlug, publicReplay.events), { playerA: "human/player", playerB: opponent });
    }
    return emptyVisualReplay(row.arenaSlug);
  }, [opponent, publicReplay.events, row.arenaSlug]);
  const maxPly = replayMaxPly(replay);
  const visibleFrames = replayVisibleFrameCount(replay);
  const hasReplayBoard = replayHasVisibleBoard(replay);
  const hasReplayTimeline = replayHasPlayableTimeline(replay);
  const defaultPly = replayFirstVisiblePly(replay) ?? 0;
  const playback = useReplayPlayback({
    identity: replayId ?? row.matchId,
    hasTimeline: hasReplayTimeline,
    maxPly,
    defaultPly,
  });
  const { isPlaying, visiblePly } = playback;
  const playerA = "human/player";
  const playerB = row.opponentModelBadgeId ?? "model/opponent";
  const visibleMoves = replayVisibleMoves(replay);
  const activeMove = replayActiveMove(replay, visiblePly);
  const currentFrame = replayFrameMeta(replay, visiblePly);

  return (
    <dialog
      ref={dialogRef}
      className="modal replay-modal"
      aria-label={`${row.arenaName} replay`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
        <div className="replay-mhead">
          <span className="replay-mgame"><GameGlyph slug={row.arenaSlug} category={arena?.category ?? "Board"} size={19} /> {row.arenaName}</span>
          <button className="modal-x" type="button" onClick={onClose} aria-label="Close replay"><Icon name="close" size={18} /></button>
        </div>
        <div className="rpl">
          <div className="vw-players rpl-players">
            <div className={`vw-player ${activeMove?.who === "a" ? "vw-active" : ""}`}><ModelBadge id={playerA} size={13} /><span className="vw-pscore mono tnum">You</span></div>
            <div className="vw-vs mono">vs</div>
            <div className={`vw-player vw-player-r ${activeMove?.who === "b" ? "vw-active" : ""}`}>
              {row.opponentModelBadgeId ? <ModelBadge id={row.opponentModelBadgeId} size={13} /> : <span className="mono modelname">{opponent}</span>}
              <span className="vw-pscore mono tnum">Opponent</span>
            </div>
          </div>
          <div className="vw-replay-stage rpl-stage">
            <ReplayMoveRail
              side="a"
              modelId={playerA}
              moves={visibleMoves.filter((move) => move.who === "a")}
              currentPly={visiblePly}
              subLabel="You"
              onSelect={playback.seek}
            />
            <div className="vw-board-stage">
              <div className="vw-frame-head">
                <span className="mono">{currentFrame.turnLabel}</span>
                <span className="mono">{currentFrame.hashLabel}</span>
              </div>
              <div className="vw-board rpl-board">
                {hasReplayBoard ? (
                  <ReplayBoard replay={replay} ply={visiblePly} />
                ) : (
                  <ReplayUnavailablePanel
                    gameSlug={row.arenaSlug}
                    title="Game view coming soon"
                    message="This match has replay details. The move-by-move board will appear here when public board states are available."
                  />
                )}
              </div>
            </div>
            <ReplayMoveRail
              side="b"
              modelId={playerB}
              moves={visibleMoves.filter((move) => move.who === "b")}
              currentPly={visiblePly}
              subLabel="Opponent"
              onSelect={playback.seek}
            />
          </div>
          {hasReplayTimeline ? (
            <div className="vw-controls rpl-controls">
              <div className="vw-btns">
                <button type="button" aria-label="Restart replay" className="vw-ctl" onClick={() => playback.seek(0)}><Icon name="skipBack" size={16} /></button>
                <button type="button" aria-label="Previous move" className="vw-ctl" onClick={() => playback.seek(visiblePly - 1)}><Icon name="chevronLeft" size={18} /></button>
                <button type="button" aria-label={isPlaying ? "Pause replay" : "Play replay"} className="vw-ctl vw-play" onClick={playback.togglePlay}><Icon name={isPlaying ? "pause" : "play"} size={18} /></button>
                <button type="button" aria-label="Next move" className="vw-ctl" onClick={() => playback.seek(visiblePly + 1)}><Icon name="chevronRight" size={18} /></button>
                <button type="button" aria-label="Jump to final replay state" className="vw-ctl" onClick={() => playback.seek(maxPly)}><Icon name="skipForward" size={16} /></button>
              </div>
              <button type="button" className="rpl-speed mono" aria-label="Playback speed" onClick={playback.cycleSpeed}>{playback.speed}x</button>
              <ReplayPlayCaption isPlaying={isPlaying} />
              <input className="vw-scrub" aria-label="Profile replay turn" type="range" min={0} max={maxPly} value={visiblePly} onChange={(event) => playback.seek(Number(event.target.value))} />
              <span className="vw-ply mono">{visiblePly}/{maxPly}</span>
            </div>
          ) : (
            <div className="replay-static">
              <Icon name="layers" size={16} />
              <span>{publicReplay.status === "error" ? "Could not load the replay. Check your connection and try again." : publicReplay.status === "loading" ? "Loading replay" : visibleFrames > 0 ? "Replay ready" : "No playable moves are available yet."}</span>
              {publicReplay.status === "error" ? <button type="button" className="btn btn-ghost" onClick={publicReplay.retry}>Retry replay</button> : null}
            </div>
          )}
          <ReplayReasoningBlock move={activeMove} agentA="You" agentB={opponent} className="vw-reasoning-modal" />
          <div className="replay-meta">
            <span className="replay-vs"><span className="mono">You</span><span className="mono">vs</span>{row.opponentModelBadgeId ? <ModelBadge id={row.opponentModelBadgeId} size={12} /> : <span>{opponent}</span>}</span>
            <span className="replay-resultline"><Tag tone={row.resultTone}>{row.resultLabel}</Tag><span className="mono">{profileRowDateFormat.format(new Date(row.playedAt))}</span></span>
          </div>
          <ProfileReplayDetailPanel
            row={row}
            replayStatus={publicReplay.status}
            visibleFrames={visibleFrames}
            hasReplayBoard={hasReplayBoard}
          />
        </div>
    </dialog>
  );
}

function ProfileReplayDetailPanel({
  row,
  replayStatus,
  visibleFrames,
  hasReplayBoard,
}: {
  row: PublicProfileHistoryView;
  replayStatus: ReplayEventsState["status"];
  visibleFrames: number;
  hasReplayBoard: boolean;
}) {
  const replayLabel = row.replayId
    ? replayStatus === "ready"
      ? replayAvailabilityLabel(hasReplayBoard, visibleFrames, "ready")
      : replayStatus === "loading"
        ? "Loading replay data"
        : replayStatus === "error"
          ? "Replay could not be loaded"
          : "Replay preparing"
    : "Replay not published yet";
  return (
    <div className="vw-commentary replay-detail-panel">
      <div className="vw-mh-head">Match details</div>
      <dl className="vw-dl">
        <div><dt>Match</dt><dd className="mono">{shortArtifact(row.matchId)}</dd></div>
        <div><dt>Replay</dt><dd className="mono">{replayLabel}</dd></div>
        <div><dt>Game</dt><dd className="mono">{row.arenaName}</dd></div>
        <div><dt>Variant</dt><dd className="mono">{row.variantName ?? "Default"}</dd></div>
        <div><dt>Result</dt><dd><Tag tone={row.resultTone}>{row.resultLabel}</Tag></dd></div>
        <div><dt>Played</dt><dd className="mono">{profileRowDateFormat.format(new Date(row.playedAt))}</dd></div>
        <div><dt>Visible turns</dt><dd className="mono">{visibleFrames > 0 ? visibleFrames.toLocaleString() : "Preparing"}</dd></div>
      </dl>
    </div>
  );
}

function compareProfileHistoryRows(a: PublicProfileHistoryView, b: PublicProfileHistoryView, key: ProfileHistorySortKey): number {
  if (key === "date") {
    return a.playedAt - b.playedAt;
  }
  if (key === "game") {
    return textCompare(a.arenaName, b.arenaName) || textCompare(a.variantName ?? "", b.variantName ?? "") || b.playedAt - a.playedAt;
  }
  if (key === "model") {
    return textCompare(a.opponentModelBadgeId ?? a.opponentDisplayName ?? "", b.opponentModelBadgeId ?? b.opponentDisplayName ?? "") || b.playedAt - a.playedAt;
  }
  return resultSortValue(a) - resultSortValue(b) || b.playedAt - a.playedAt;
}

function resultSortValue(row: PublicProfileHistoryView): number {
  if (row.resultTone === "win") return 3;
  if (row.resultTone === "draw") return 2;
  if (row.resultTone === "loss") return 1;
  return 0;
}

function ArtifactGrid({
  username,
  artifacts,
  canUpload = false,
  onArtifactUploaded,
}: {
  username: string;
  artifacts: readonly PublicProfileArtifactCardView[];
  canUpload?: boolean;
  onArtifactUploaded?: (artifact: PublicProfileArtifactCardView) => void;
}) {
  const removalGuard = useRef(false);
  const [removedIds,setRemovedIds] = useState<ReadonlySet<string>>(new Set());
  const [removingId,setRemovingId] = useState<string|null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const [uploadActive, setUploadActive] = useState(false);
  const [retryUploadDraft, setRetryUploadDraft] = useState<ArtifactUploadDraft | null>(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadState, setUploadState] = useState<{ tone: "plain" | "accent" | "loss"; message: string; href?: string; linkLabel?: string } | null>(null);
  const [uploadDraft, setUploadDraft] = useState<ArtifactUploadDraft | null>(null);
  const [visibilityOverrides, setVisibilityOverrides] = useState<Record<string, ArtifactUploadVisibility>>({});
  const [pendingVisibilityArtifactId, setPendingVisibilityArtifactId] = useState<string | null>(null);
  const displayArtifacts = useMemo(
    () => {
      const visible: PublicProfileArtifactCardView[] = [];
      for (const artifact of artifacts) {
        if (removedIds.has(artifact.id)) continue;
        const visibility = visibilityOverrides[artifact.id];
        visible.push(visibility ? { ...artifact, visibility } : artifact);
      }
      return visible;
    },
    [artifacts, visibilityOverrides, removedIds]
  );

  function uploadFailure(message: string, status: number) {
    setUploadState(status === 401
      ? {tone: "loss", message: "Your sign-in session expired. Sign in, then check your library before retrying.", href: `/login?next=${encodeURIComponent(`/${username}`)}`, linkLabel: "Sign in"}
      : {tone: "loss", message});
  }

  async function uploadArtifact(file: File, artifactNameInput: string, visibility: ArtifactUploadVisibility) {
    if (!isEslamsArtifactFileName(file.name)) {
      setUploadState({ tone: "loss", message: "Choose a replay file with the .eslams extension." });
      return;
    }

    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > MAX_ARTIFACT_UPLOAD_BYTES) {
      setUploadState({tone:"loss",message:"Choose a non-empty replay file no larger than 100 MB."});
      return;
    }
    if (uploadController.current) return;
    const controller = new AbortController();
    uploadController.current = controller;
    setUploadActive(true);
    setRetryUploadDraft(null);
    const retryDraft = {file,artifactName:artifactNameInput,visibility,suggestions:artifactNameSuggestions(file.name, artifacts.map((artifact) => artifact.artifactName))};
    try {
    const artifactName = uniqueArtifactName(artifactNameInput, artifacts.map((artifact) => artifact.artifactName));
    setUploadState({ tone: "plain", message: `Preparing ${file.name}...` });
    const ticket = await artifactUploadRequest("/api/artifacts/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
	        fileName: file.name,
	        artifactName,
	        contentType: artifactUploadContentType(file.type),
	        sizeBytes: file.size,
	        visibility,
	      }),
	    }, {signal:controller.signal});
    const ticketResponse = ticket.response;
    const ticketBody = ticket.payload as ArtifactUploadTicketResponse | null;
    if (!ticketResponse.ok || !ticketBody?.ok) {
      const message = ticketBody?.ok === false ? ticketBody.error.message : "Could not create an upload ticket.";
      uploadFailure(message, ticketResponse.status);
      setRetryUploadDraft(retryDraft);
      return;
    }

    onArtifactUploaded?.({id:ticketBody.data.artifactId,artifactName:ticketBody.data.artifactName ?? artifactName,artifactKind:"upload",visibility:ticketBody.data.visibility ?? visibility,verificationLevel:"localartifact",signatureStatus:"unsigned",sizeBytes:file.size,matchId:null,createdAt:Date.now(),canCancelUpload:true});
    const uploadUrl = sameOriginArtifactUploadUrl(ticketBody.data.uploadUrl);
    setUploadState({tone:"plain",message:`Uploading ${file.name}…`});
    const upload = await artifactUploadRequest(uploadUrl, {
      method: ticketBody.data.method,
      headers: ticketBody.data.headers,
      body: file,
    }, {signal:controller.signal,timeoutMs:120_000});
    if (!upload.response.ok) {
      uploadFailure(upload.response.status === 413 ? "This file exceeds the upload limit. Choose a smaller file." : "Upload did not finish. Check your library before retrying.", upload.response.status);
      setRetryUploadDraft(retryDraft);
      return;
    }

    setUploadState({tone:"plain",message:"Confirming the upload…"});
    const complete = await artifactUploadRequest("/api/artifacts/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ artifactId: ticketBody.data.artifactId }),
    }, {signal:controller.signal});
    const completeResponse = complete.response;
    const completeBody = complete.payload as ArtifactUploadCompleteResponse | null;
    if (!completeResponse.ok || !completeBody?.ok) {
      const message = completeBody?.ok === false ? completeBody.error.message : "We could not prepare that replay yet.";
      uploadFailure(message, completeResponse.status);
      setRetryUploadDraft(retryDraft);
      return;
    }

    const canonicalArtifactName = completeBody.data.artifactName ?? ticketBody.data.artifactName ?? artifactName;
    const canonicalVisibility = completeBody.data.visibility ?? ticketBody.data.visibility ?? visibility;
    const artifactHref = completeBody.data.slugUrl ?? completeBody.data.artifactUrl ?? ticketBody.data.slugUrl ?? ticketBody.data.artifactUrl ?? `/${username}/${canonicalArtifactName}`;

    onArtifactUploaded?.({
      id: ticketBody.data.artifactId,
	      artifactName: canonicalArtifactName,
	      artifactKind: "upload",
	      visibility: canonicalVisibility,
	      verificationLevel: "localartifact",
	      signatureStatus: "unsigned",
      sizeBytes: file.size,
      matchId: null,
      createdAt: Date.now(),
	    });
    setUploadState(canonicalVisibility === "public"
      ? {
        tone: "accent",
        href: artifactHref,
        message: completeBody.data.queued ? "Upload received. Validation is pending; this entry is not verified yet." : "Upload received. Check the entry for its validation result.",
      }
      : {
        tone: "accent",
        href: artifactHref,
        message: completeBody.data.queued ? "Your private upload was received. Validation is pending; it is not verified yet." : "Your private upload was received. Check the entry for its validation result.",
      });
    } catch {
      setUploadState({tone:"loss",message:controller.signal.aborted ? "Upload stopped here. Check your library before retrying; a pending entry may remain." : "The upload connection failed. Check your library before retrying."});
      setRetryUploadDraft(retryDraft);
    } finally {
      if (uploadController.current === controller) uploadController.current = null;
      setUploadActive(false);
    }

	  }

  async function removeUnfinishedUpload(artifact:PublicProfileArtifactCardView) {
    if (!canUpload || !artifact.canCancelUpload || uploadActive || removalGuard.current) return;
    removalGuard.current = true; setRemovingId(artifact.id);
    try {
      const result = await artifactUploadRequest(`/api/artifacts/uploads/${encodeURIComponent(artifact.id)}`,{method:"DELETE"});
      if (!result.response.ok) { uploadFailure("Could not remove this unfinished upload. Reload your library before trying again.",result.response.status); return; }
      setRemovedIds(current => new Set([...current,artifact.id]));
      setUploadState({tone:"accent",message:"Unfinished upload removed from your library."});
    } catch { setUploadState({tone:"loss",message:"Removal could not be confirmed. Reload your library before trying again."}); }
    finally { removalGuard.current=false;setRemovingId(null); }
  }

  async function updateArtifactVisibility(artifact: PublicProfileArtifactCardView, visibility: ArtifactUploadVisibility) {
    setPendingVisibilityArtifactId(artifact.id);
    const href = artifact.artifactName ? `/${username}/${artifact.artifactName}` : undefined;
    try {
      const response = await fetch(`/api/artifacts/${encodeURIComponent(artifact.id)}/visibility`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      const body = await response.json().catch(() => null) as ArtifactVisibilityResponse | null;
      if (!response.ok || !body?.ok) {
        const message = body?.ok === false ? body.error.message : "Could not update replay sharing.";
        setUploadState({ tone: "loss", message });
        return;
      }
      setVisibilityOverrides((current) => ({ ...current, [artifact.id]: body.data.visibility }));
      const message = body.data.visibility === "public"
        ? "Replay is public. Anyone with the link can open it."
        : "Replay is private. Only you can open it.";
      setUploadState(href ? { tone: "accent", href, message } : { tone: "accent", message });
    } catch {
      setUploadState({ tone: "loss", message: "Could not update replay sharing." });
    } finally {
      setPendingVisibilityArtifactId(null);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
	    event.currentTarget.value = "";
	    if (file) {
	      if (!isEslamsArtifactFileName(file.name)) {
	        setUploadState({ tone: "loss", message: "Choose a replay file with the .eslams extension." });
	        return;
	      }
	      const suggestions = artifactNameSuggestions(file.name, artifacts.map((artifact) => artifact.artifactName));
	      setUploadDraft({
	        file,
	        artifactName: suggestions[0] ?? artifactNameFromFileName(file.name),
	        visibility: "private",
	        suggestions,
	      });
	    }
	  }

  return (
    <div className="arts">
      <div className="arts-head">
        <div><div className="arts-title">Replays</div><div className="arts-sub mono">@{username} · replay library</div></div>
	        {canUpload ? <Button variant="secondary" icon="upload" disabled={uploadActive} onClick={() => fileInputRef.current?.click()}>Upload .eslams</Button> : null}
	        <input ref={fileInputRef} className="sr-only" type="file" accept=".eslams,application/vnd.eslams.artifact" aria-label="Choose a replay file with the .eslams extension" onChange={handleFileChange} />
	      </div>
		      {uploadState ? <output aria-live="polite" className={`artifact-upload-note artifact-upload-${uploadState.tone}`}><Icon name={uploadState.tone === "loss" ? "close" : uploadState.tone === "accent" ? "check" : "upload"} size={14} /> {uploadState.message}{uploadState.href ? <> <Link href={uploadState.href}>{uploadState.linkLabel ?? "Open entry"}</Link></> : null}</output> : null}
          {uploadActive ? <Button variant="secondary" onClick={() => uploadController.current?.abort()}>Cancel upload</Button> : null}
          {!uploadActive && retryUploadDraft ? <Button variant="secondary" onClick={() => {setUploadDraft(retryUploadDraft);setRetryUploadDraft(null);}}>Retry upload</Button> : null}

	      {uploadDraft ? (
	        <ArtifactUploadDialog
	          draft={uploadDraft}
	          username={username}
	          onChange={setUploadDraft}
	          onCancel={() => setUploadDraft(null)}
	          onConfirm={(draft) => {
	            setUploadDraft(null);
	            void uploadArtifact(draft.file, draft.artifactName, draft.visibility);
	          }}
	        />
	      ) : null}
	      <div className="arts-grid">
	        {displayArtifacts.length === 0 ? <EmptyArtifactCard username={username} canUpload={canUpload} /> : null}
	        {displayArtifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              username={username}
              artifact={artifact}
              canManage={canUpload}
              removalPending={removingId===artifact.id}
              removalDisabled={uploadActive || removingId!==null}
              onRemove={()=>removeUnfinishedUpload(artifact)}
              visibilityPending={pendingVisibilityArtifactId === artifact.id}
              onVisibilityChange={(visibility) => updateArtifactVisibility(artifact, visibility)}
            />
          ))}
      </div>
    </div>
	  );
	}

function ArtifactUploadDialog({
  draft,
  username,
  onChange,
  onCancel,
  onConfirm,
}: {
  draft: ArtifactUploadDraft;
  username: string;
  onChange: (draft: ArtifactUploadDraft) => void;
  onCancel: () => void;
  onConfirm: (draft: ArtifactUploadDraft) => void;
}) {
  const normalizedName = artifactNameFromFileName(draft.artifactName);
	  return (
	    <div className="modal-overlay">
	      <button className="modal-backdrop" type="button" onClick={onCancel} aria-label="Cancel artifact upload" />
	      <dialog
	        open
	        className="modal artifact-upload-dialog"
	        aria-label="Name the replay"
	        onCancel={() => onCancel()}
	      >
        <div className="replay-mhead">
	          <span className="replay-mgame"><Icon name="upload" size={18} /> Name the replay</span>
          <button className="modal-x" type="button" onClick={onCancel} aria-label="Cancel replay upload"><Icon name="close" size={18} /></button>
        </div>
        <div className="artifact-upload-form">
          <label className="artifact-upload-field">
	            <span>Replay entry name</span>
            <input
              className="input"
              value={draft.artifactName}
              onChange={(event) => onChange({ ...draft, artifactName: event.currentTarget.value })}
              maxLength={80}
              required
            />
          </label>
          <div className="artifact-upload-preview mono">/{username}/{normalizedName}</div>
          <div className="chiprow artifact-name-suggestions" aria-label="Suggested replay names">
            {draft.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className={`chip ${artifactNameFromFileName(draft.artifactName) === suggestion ? "active" : ""}`} onClick={() => onChange({ ...draft, artifactName: suggestion })}>
                {suggestion}
              </button>
            ))}
          </div>
          <fieldset className="pf-vis-options artifact-visibility-options">
            <legend className="sr-only">Replay visibility</legend>
            <button type="button" className={`pf-vis-option ${draft.visibility === "private" ? "pf-vis-active" : ""}`} onClick={() => onChange({ ...draft, visibility: "private" })}>
              <Icon name="lock" size={13} />
              <span>Private</span>
            </button>
            <button type="button" className={`pf-vis-option ${draft.visibility === "public" ? "pf-vis-active" : ""}`} onClick={() => onChange({ ...draft, visibility: "public" })}>
              <Icon name="globe" size={13} />
              <span>Public</span>
            </button>
          </fieldset>
          <p className="set-keynote mono"><Icon name="lock" size={12} /> Private replays are visible only to you. Public replays can be shared when visible moves are available.</p>
	          <div className="detail-actions artifact-upload-actions">
	            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="button" variant="primary" icon="upload" onClick={() => onConfirm({ ...draft, artifactName: normalizedName })}>Upload replay</Button>
	          </div>
	        </div>
	      </dialog>
	    </div>
	  );
	}

function ArtifactCard({
  username,
  artifact,
  canManage = false,
  visibilityPending = false,
  onVisibilityChange,
  onRemove, removalPending=false, removalDisabled=false,
}: {
  username: string;
  artifact: PublicProfileArtifactCardView;
  canManage?: boolean;
  visibilityPending?: boolean;
  onVisibilityChange?: (visibility: ArtifactUploadVisibility) => void;
  onRemove?:()=>void; removalPending?:boolean; removalDisabled?:boolean;
}) {
  const [copied, setCopied] = useState(false);
  const href = artifact.artifactName ? `/${username}/${artifact.artifactName}` : null;
  const isPublic = artifact.visibility === "public";
  const visibilityClass = artifact.visibility === "public" ? "art-pub" : "art-priv";
  const visibilityIcon = artifact.visibility === "public" ? "globe" : "lock";
  const canToggleVisibility = canManage && artifact.artifactKind === "upload";
  const nextVisibility = isPublic ? "private" : "public";
  const shareArtifact = () => {
    if (!href || !isPublic) {
      return;
    }
    const origin = window.location.origin;
    void navigator.clipboard?.writeText(`${origin}${href}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };
  return (
    <div className="artcard">
      <div className="art-top">
        {href ? (
          <Link className="art-name mono" href={href}><span className="art-user">{username}/</span>{artifact.artifactName}</Link>
        ) : (
          <span className="art-name mono"><span className="art-user">{username}/</span>{artifact.artifactName ?? artifact.id}</span>
        )}
        <span className={`art-vis ${visibilityClass}`}><Icon name={visibilityIcon} size={11} /> {artifact.visibility}</span>
      </div>
      <div className="art-meta"><span className="art-tag"><Icon name="layers" size={13} /> {artifactVerificationLabel(artifact.verificationLevel)}</span><span className="art-date mono">{profileRowDateFormat.format(new Date(artifact.createdAt))}</span><span className="art-size mono">{artifactSizeLabel(artifact.sizeBytes)}</span></div>
      <div className="art-foot">
        <span className="art-ext mono">.eslams</span>
        <span className="art-proof-meta mono">{artifactSignatureLabel(artifact.signatureStatus)}{artifact.matchId ? " · Match linked" : ""}</span>
        <span className="art-actions">
          {href && isPublic ? <button type="button" className="art-share" onClick={shareArtifact}><Icon name={copied ? "check" : "link"} size={13} /> {copied ? "Copied" : "Share"}</button> : <span className="art-share art-share-muted"><Icon name="lock" size={13} /> Private</span>}
          {canManage && artifact.canCancelUpload ? <Button variant="secondary" disabled={removalDisabled} onClick={onRemove}>{removalPending ? "Removing…" : "Remove unfinished upload"}</Button> : null}
          {canToggleVisibility ? (
            <button
              type="button"
              className="art-share art-visibility-action"
              disabled={visibilityPending}
              onClick={() => onVisibilityChange?.(nextVisibility)}
            >
              <Icon name={isPublic ? "lock" : "globe"} size={13} /> {visibilityPending ? "Saving" : isPublic ? "Make private" : "Make public"}
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function EmptyArtifactCard({ username, canUpload }: { username: string; canUpload: boolean }) {
  return (
    <div className="artcard">
      <div className="art-top"><span className="art-name mono"><span className="art-user">{username}/</span>replays</span><span className="art-vis art-pub"><Icon name="globe" size={11} /> coming soon</span></div>
      <div className="art-meta"><span className="art-tag"><Icon name="layers" size={13} /> {canUpload ? "No uploads yet" : "No public replays yet"}</span><span className="art-date mono">Coming soon</span></div>
      <div className="art-foot"><span className="art-ext mono">.eslams</span><span className="art-share">{canUpload ? "Upload from this tab" : "Public replays coming soon"}</span></div>
    </div>
  );
}

type ProfileSettingsApiProfile = {
  readonly username: string;
  readonly displayName: string | null;
  readonly bio: string | null;
  readonly location: string | null;
  readonly websiteUrl: string | null;
  readonly image?: string | null;
  readonly visibility: ProfileVisibility;
  readonly defaultMatchVisibility: MatchVisibility;
  readonly totalGamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly createdAt: number;
};

type ProfileSettingsResponse =
  | { ok: true; data: { profile: ProfileSettingsApiProfile } }
  | { ok: false; error: { code: string; message: string } };

function profileVisibilityCopy(visibility: ProfileVisibility): { label: string; icon: IconName } {
  if (visibility === "private") {
    return { label: "Private", icon: "lock" };
  }
  if (visibility === "unlisted") {
    return { label: "Unlisted", icon: "link" };
  }
  return { label: "Public", icon: "globe" };
}

function matchVisibilitySettingsCopy(visibility: MatchVisibility): { label: string; icon: IconName; description: string } {
  if (visibility === "followers") {
    return { label: "Followers", icon: "user", description: "Approved followers can view new matches." };
  }
  if (visibility === "only_me") {
    return { label: "Only me", icon: "lock", description: "Only you can view new matches." };
  }
  return { label: "Public", icon: "globe", description: "Anyone can view and share new matches." };
}

function sameOriginArtifactUploadUrl(uploadUrl: string): string {
  try {
    const url = new URL(uploadUrl);
    if (url.pathname.startsWith("/api/artifacts/uploads/")) return `${url.pathname}${url.search}`;
  } catch {
    // Invalid ticket destinations are never used for uploading bytes.
  }
  throw new Error("Upload destination is unavailable.");
}

export type PublicArtifactView = {
  id: string;
  ownerUserId: string | null;
  artifactName: string | null;
  artifactKind: string;
  visibility: string;
  verificationLevel: string;
  signatureStatus: string;
  signatureKeyId: string | null;
  contentSha256: string;
  sizeBytes: number;
  matchId: string | null;
  createdAt: number;
  updatedAt: number;
  manifestFileCount: number | null;
  coreVersion: string | null;
};

export type PublicVideoView = {
  id: string;
  matchId: string;
  broadcastId: string | null;
  status: string;
  title: string | null;
  description: string | null;
  durationSeconds: number | null;
  privacyStatus: string;
  streamUid: string | null;
  streamEmbedUrl: string | null;
  youtubeVideoId: string | null;
  hasFile: boolean;
  fileUrl: string | null;
  playbackSource: "stream" | "r2" | "none";
  createdAt: number;
  updatedAt: number;
  matchType: string;
  arenaId: string;
  arenaSlug: string | null;
  arenaName: string | null;
};

type DetailPageProps =
  | { artifact: PublicArtifactView; artifactReplay?: ArtifactReplayState }
  | { video: PublicVideoView }
  | { kind: string; title: string };

export function DetailPage(props: DetailPageProps) {
  if ("video" in props) {
    return <VideoDetailPage video={props.video} />;
  }
  if (!("artifact" in props)) {
    return <ComingSoonDetailPage kind={props.kind} title={props.title} />;
  }
  return props.artifactReplay
    ? <ArtifactDetailPage artifact={props.artifact} replayState={props.artifactReplay} />
    : <ArtifactDetailPage artifact={props.artifact} />;
}


function publicMatchTypeLabel(matchType: string): string {
  if (matchType === "arenasession") {
    return "Arena session";
  }
  if (matchType === "platformmatch") {
    return "Battlefield match";
  }
  return "Public match";
}

function publicGameLabel(slug: string): string {
  return arenaBySlug[slug]?.name ?? publicSlugLabel(slug);
}

function publicSlugLabel(value: string): string {
  return value
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function publicVariantLabel(value: string): string {
  if (value === "standard") return "Standard";
  return publicSlugLabel(value.replace(/^core[_-]/u, ""));
}

function VideoDetailPage({ video }: { video: PublicVideoView }) {
  const updatedAt = detailDateTimeFormat.format(new Date(video.updatedAt));
  const duration = video.durationSeconds === null ? "Coming soon" : `${Math.max(1, Math.round(video.durationSeconds)).toLocaleString()}s`;
  const title = video.title ?? "Broadcast video";
  const videoStatus = video.status === "completed" ? "Ready" : publicSlugLabel(video.status);
  const availability = video.streamEmbedUrl || (video.fileUrl && video.hasFile) ? "Ready" : "Coming soon";
  return (
    <PublicPage>
      <div className="page">
        <div className="wrap page-head"><h1 className="page-title">{title}</h1><p className="page-desc">{video.description ?? "Public broadcast playback for a completed eSlams match."}</p></div>
        <div className="wrap page-pad"><div className="card detail-card">
          <Tag tone={video.status === "completed" ? "accent" : "plain"}><Icon name={video.status === "completed" ? "check" : "play"} size={12} /> {videoStatus}</Tag>
          <Tag>{video.privacyStatus === "public" ? "Public video" : publicSlugLabel(video.privacyStatus)}</Tag>
          {video.youtubeVideoId ? <Tag tone="accent">YouTube uploaded</Tag> : <Tag>YouTube coming soon</Tag>}
          {availability === "Ready" ? <Tag tone="accent">Broadcast video ready</Tag> : <Tag>Broadcast video coming soon</Tag>}
          {video.streamEmbedUrl ? (
            <div className="video-player-wrap">
              <iframe
                aria-label={`Stream playback for match ${video.matchId}`}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                className="video-player video-player-stream"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-presentation allow-popups"
                src={video.streamEmbedUrl}
                title={`Broadcast playback for match ${video.matchId}`}
              />
            </div>
          ) : video.fileUrl && video.hasFile ? (
            <div className="video-player-wrap">
              <video
                aria-label={`Public broadcast playback for match ${video.matchId}`}
                className="video-player"
                src={video.fileUrl}
                controls
                preload="metadata"
              >
                <track
                  kind="captions"
                  src="data:text/vtt,WEBVTT%0A%0A"
                  srcLang="en"
                  label="No spoken audio"
                />
              </video>
            </div>
          ) : (
            <div className="video-player-empty"><Icon name="layers" size={18} /> Broadcast video coming soon</div>
          )}
          <div className="detail-grid">
            <DetailMetric label="Match" value="Linked match" />
            <DetailMetric label="Format" value={publicMatchTypeLabel(video.matchType)} />
            <DetailMetric label="Game" value={video.arenaName ?? publicGameLabel(video.arenaSlug ?? video.arenaId)} />
            <DetailMetric label="Duration" value={duration} />
            <DetailMetric label="Updated" value={updatedAt} />
            <DetailMetric label="Availability" value={availability} />
            <DetailMetric label="YouTube" value={video.youtubeVideoId ? "Published" : "Coming soon"} />
          </div>
          {video.youtubeVideoId ? (
            <div className="detail-actions">
              <Button href={`https://youtu.be/${video.youtubeVideoId}`} variant="secondary" iconRight="arrowRight">Open YouTube</Button>
            </div>
          ) : null}
        </div></div>
      </div>
    </PublicPage>
  );
}

function ComingSoonDetailPage({ kind, title }: { kind: string; title: string }) {
  return (
    <PublicPage>
      <div className="page">
        <div className="wrap page-head"><h1 className="page-title">{title}</h1><p className="page-desc">{kind} details are coming soon.</p></div>
	        <div className="wrap page-pad"><div className="card detail-card"><Tag>Coming soon</Tag><Tag>Public details only</Tag><p className="page-desc">No public record has been published for this page yet.</p></div></div>
      </div>
    </PublicPage>
  );
}

function ArtifactDetailPage({ artifact, replayState }: { artifact: PublicArtifactView; replayState?: ArtifactReplayState }) {
  const router = useRouter();
  const title = artifactTitle(artifact);
  const artifactReplay = replayState ?? { artifactId: artifact.id, status: "empty", replay: null, error: null };
  const [replayRefreshes, setReplayRefreshes] = useState(0);
  const replayRefreshActive = (artifactReplay.status === "empty" || artifactReplay.status === "loading") && replayRefreshes < 60;
  const sizeKb = Math.max(1, Math.round(artifact.sizeBytes / 1024));
  const signatureTone = artifact.signatureStatus === "signed" ? "accent" : "plain";
  const proofLabel = artifactVerificationLabel(artifact.verificationLevel);
  const signatureLabel = artifact.signatureStatus === "signed" ? "Reviewed" : "Review pending";
  const proofCopy = artifact.visibility === "public"
    ? "This replay is available for public inspection."
    : "This replay is private to its owner.";
  useEffect(() => {
    if (!replayRefreshActive) return;
    const timeout = window.setTimeout(() => {
      setReplayRefreshes((value) => value + 1);
      router.refresh();
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [replayRefreshActive, router, replayRefreshes]);
  return (
    <PublicPage>
      <div className="page">
        <div className="wrap page-head"><h1 className="page-title">{title}</h1><p className="page-desc">{artifact.visibility === "public" ? "Replay the game, review the visible moves, and share the link." : "Replay the game and review the visible moves privately."}</p></div>
        <div className="wrap page-pad artifact-detail-stack"><div className="card detail-card">
          <Tag tone={signatureTone}><Icon name={artifact.signatureStatus === "signed" ? "check" : "lock"} size={12} /> {signatureLabel}</Tag>
          <Tag>{proofLabel}</Tag>
          <Tag>{artifactKindLabel(artifact.artifactKind)}</Tag>
          {artifact.coreVersion ? <Tag>Replay ready</Tag> : null}
          <div className="detail-hero">
            <div className="detail-hero-icon"><Icon name={artifact.signatureStatus === "signed" ? "check" : "lock"} size={22} /></div>
            <div className="detail-hero-copy">
              <span>Replay</span>
              <strong>{proofLabel}</strong>
              <p>{proofCopy} Replay views show the moves and any public reasoning attached to them.</p>
            </div>
            <span className="detail-hero-id mono">{artifact.visibility === "public" ? "Public replay" : "Private replay"}</span>
          </div>
          <div className="detail-grid">
            <DetailMetric label="Replay" value={artifact.visibility === "public" ? "Public" : "Private"} />
            <DetailMetric label="Game" value={artifact.matchId ? "Linked match" : "Not linked"} />
            <DetailMetric label="Review status" value={signatureLabel} />
            <DetailMetric label="Size" value={`${sizeKb.toLocaleString()} KB`} />
            <DetailMetric label="Status" value={artifact.visibility === "public" ? "Public" : "Private"} />
            <DetailMetric label="Updated" value={detailDateTimeFormat.format(new Date(artifact.updatedAt))} />
          </div>
        </div>
        <ArtifactReplayPanel artifact={artifact} state={artifactReplay} autoRefreshActive={replayRefreshActive} />
        </div>
      </div>
    </PublicPage>
  );
}

function ArtifactReplayPanel({ artifact, state, autoRefreshActive = false }: { artifact: PublicArtifactView; state: ArtifactReplayState; autoRefreshActive?: boolean }) {
  if (state.status === "loading" || state.status === "idle" || state.artifactId !== artifact.id) {
    return (
      <div className="card artifact-replay-card artifact-replay-empty">
        <div className="vw-proof-icon"><Icon name="play" size={22} /></div>
        <div className="vw-proof-copy">
          <strong>Replay loading</strong>
          <span>{autoRefreshActive ? "We are preparing the game view. This page will update shortly." : "Loading this replay."}</span>
        </div>
      </div>
    );
  }
  if (state.status === "empty") {
    return (
      <div className="card artifact-replay-card artifact-replay-empty">
        <div className="vw-proof-icon"><Icon name="layers" size={22} /></div>
        <div className="vw-proof-copy">
          <strong>Replay not ready yet</strong>
          <span>{autoRefreshActive ? "We are preparing the game view. This page will update shortly." : "If this replay includes shareable moves, the game view will appear here."}</span>
        </div>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="card artifact-replay-card artifact-replay-empty">
        <div className="vw-proof-icon"><Icon name="terminal" size={22} /></div>
        <div className="vw-proof-copy">
          <strong>Replay could not load</strong>
          <span>{state.error}</span>
        </div>
      </div>
    );
  }
  if (state.status === "ready") {
    return <ArtifactReplayViewer key={state.replay.replayId} artifact={artifact} replay={state.replay} />;
  }
  return null;
}

function ArtifactReplayViewer({ artifact, replay }: { artifact: PublicArtifactView; replay: PublicReplayDetail }) {
  const timeline = useMemo(() => replayFromDetail(replay), [replay]);
  const maxPly = replayMaxPly(timeline);
  const defaultPly = replayDefaultPly(timeline, "completed");
  const visibleFrames = replayVisibleFrameCount(timeline);
  const visibleMoves = replayVisibleMoves(timeline);
  const hasReplayBoard = replayHasVisibleBoard(timeline);
  const hasReplayTimeline = replayHasPlayableTimeline(timeline);
  const [ply, setPly] = useState(defaultPly);
  const [playing, setPlaying] = useState(false);
  const isPlaying = hasReplayTimeline && playing && ply < maxPly;
  const activeMove = replay.publicSafe ? replayActiveMove(timeline, ply) : null;
  const currentFrame = replayFrameMeta(timeline, ply);
  const game = replay.gameSlug ? arenaBySlug[replay.gameSlug] : null;
  const playerA = replay.modelA ?? "Agent 1";
  const playerB = replay.modelB ?? replay.modelId ?? "Agent 2";
  const verified = replay.publicSafe && replay.stateHashValid;

  useEffect(() => {
    if (!isPlaying) return;
    const timeout = window.setTimeout(() => setPly((value) => Math.min(maxPly, value + 1)), REPLAY_AUTOPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, [isPlaying, maxPly, ply]);

  return (
    <div className="bf-viewer card artifact-replay-card">
      <div className="viewer">
        <div className="vw-head">
          <div className="vw-game"><GameGlyph slug={replay.gameSlug ?? "grid"} category={game?.category ?? "Board"} size={18} /> <b>{game?.name ?? replay.gameSlug ?? "Replay"}</b> <span className="mono vw-variant">{artifactTitle(artifact)}</span></div>
          <Tag tone={verified ? "accent" : "plain"}><Icon name={verified ? "check" : "play"} size={12} /> {verified ? "Verified replay" : "Playable replay"}</Tag>
        </div>
        <div className="vw-players">
          <div className={`vw-player ${activeMove?.who === "a" ? "vw-active" : ""}`}><ModelBadge id={playerA} size={13} /><span className="vw-pscore mono tnum">Agent 1</span></div>
          <div className="vw-vs mono">vs</div>
          <div className={`vw-player vw-player-r ${activeMove?.who === "b" ? "vw-active" : ""}`}><ModelBadge id={playerB} size={13} /><span className="vw-pscore mono tnum">Agent 2</span></div>
        </div>
        <div className="vw-replay-stage">
          <ReplayMoveRail
            side="a"
            modelId={playerA}
            moves={visibleMoves.filter((move) => move.who === "a")}
            currentPly={ply}
            subLabel="Agent 1"
            onSelect={(nextPly) => { setPlaying(false); setPly(Math.min(nextPly, maxPly)); }}
          />
          <div className="vw-board-stage">
            <div className="vw-frame-head">
              <span className="mono">{currentFrame.turnLabel}</span>
              <span className="mono">{currentFrame.hashLabel}</span>
            </div>
            <div className="vw-board">
              {hasReplayBoard ? (
                <ReplayBoard replay={timeline} ply={ply} />
              ) : (
                <ReplayUnavailablePanel
                  gameSlug={replay.gameSlug ?? "grid"}
                  title="Game view coming soon"
                  message="This replay file was received. The move-by-move board will appear here when public replay moves are available."
                />
              )}
            </div>
          </div>
          <ReplayMoveRail
            side="b"
            modelId={playerB}
            moves={visibleMoves.filter((move) => move.who === "b")}
            currentPly={ply}
            subLabel="Agent 2"
            onSelect={(nextPly) => { setPlaying(false); setPly(Math.min(nextPly, maxPly)); }}
          />
        </div>
        {hasReplayTimeline ? (
          <div className="vw-controls">
            <div className="vw-btns">
              <button type="button" aria-label="Restart replay" className="vw-ctl" onClick={() => { setPlaying(false); setPly(0); }}><Icon name="skipBack" size={16} /></button>
              <button type="button" aria-label="Previous move" className="vw-ctl" onClick={() => { setPlaying(false); setPly((value) => Math.max(0, value - 1)); }}><Icon name="chevronLeft" size={18} /></button>
              <button type="button" aria-label={isPlaying ? "Pause replay" : "Play replay"} className="vw-ctl vw-play" onClick={() => { if (isPlaying) { setPlaying(false); } else { if (ply >= maxPly) setPly(0); setPlaying(true); } }}><Icon name={isPlaying ? "pause" : "play"} size={18} /></button>
              <button type="button" aria-label="Next move" className="vw-ctl" onClick={() => { setPlaying(false); setPly((value) => Math.min(maxPly, value + 1)); }}><Icon name="chevronRight" size={18} /></button>
              <button type="button" aria-label="Jump to final replay state" className="vw-ctl" onClick={() => { setPlaying(false); setPly(maxPly); }}><Icon name="skipForward" size={16} /></button>
            </div>
            <ReplayPlayCaption isPlaying={isPlaying} />
            <input className="vw-scrub" aria-label="Replay turn" type="range" min={0} max={maxPly} value={ply} onChange={(event) => { setPlaying(false); setPly(Number(event.target.value)); }} />
            <span className="vw-ply mono">{ply}/{maxPly}</span>
          </div>
        ) : <div className="vw-static-note"><Icon name="layers" size={14} /> {visibleFrames > 0 ? "Replay ready." : "No playable moves are available yet."}</div>}
        <ReplayReasoningBlock move={activeMove} agentA={playerA} agentB={playerB} className="vw-reasoning-wide" />
        <div className="vw-meta">
          <div className={`vw-history ${hasReplayTimeline ? "" : "vw-history-empty"}`}>
            <div className="vw-mh-head">{hasReplayTimeline ? "Move history" : "Replay"}</div>
            <div className="vw-moves">
              {hasReplayTimeline ? visibleMoves.map((move) => (
                <button key={`${replay.replayId}-artifact-move-${move.ply}`} type="button" className={`vw-mv ${ply === move.ply ? "vw-mv-cur" : ""} ${move.who === "a" ? "vw-mv-a" : "vw-mv-b"}`} onClick={() => { setPlaying(false); setPly(move.ply); }}>
                  <span className="vw-mv-n mono">{move.ply}</span>
                  <span className="vw-mv-note mono">{move.note}</span>
                </button>
              )) : <div className="vw-nomoves">No playable moves are available yet.</div>}
            </div>
          </div>
          <div className="vw-commentary">
            <div className="vw-mh-head">Replay details</div>
            <dl className="vw-dl">
              <div><dt>Replay</dt><dd className="mono">{artifact.visibility === "public" ? "Public" : "Private"}</dd></div>
              <div><dt>Game</dt><dd className="mono">{game?.name ?? replay.gameSlug ?? "Coming soon"}</dd></div>
              <div><dt>Turns</dt><dd className="mono">{visibleFrames > 0 ? visibleFrames.toLocaleString() : "Coming soon"}</dd></div>
              <div><dt>Turns recorded</dt><dd className="mono">{replay.eventCount.toLocaleString()}</dd></div>
              <div><dt>Replay status</dt><dd className="mono">{verified ? "Verified" : "Review pending"}</dd></div>
              <div><dt>Move log</dt><dd className="mono">{replay.eventCount > 0 ? "Available" : "Coming soon"}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div className="detail-metric"><span>{label}</span><strong className="mono">{value}</strong></div>;
}

function artifactTitle(artifact: PublicArtifactView): string {
  if (artifact.artifactName && artifact.artifactName.length <= 64) {
    return artifact.artifactName;
  }
  return `${artifact.artifactKind} replay`;
}

function artifactKindLabel(value: string): string {
  const normalized = value.toLowerCase().replace(/[\s_-]+/gu, "");
  if (normalized === "upload") {
    return "Replay";
  }
  if (normalized === "score") {
    return "Score result";
  }
  if (normalized === "broadcast") {
    return "Broadcast video";
  }
  return "Replay";
}

function artifactVerificationLabel(value: string): string {
  const normalized = value.toLowerCase().replace(/[\s_-]+/gu, "");
  if (normalized === "localartifact" || normalized === "upload" || normalized === "uploadedartifact") {
    return "Uploaded replay";
  }
  if (normalized === "signedartifact") {
    return "Reviewed replay";
  }
  if (!normalized || normalized === "unknown") {
    return "Review pending";
  }
  return value
    .replace(/[_-]+/gu, " ")
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function artifactSignatureLabel(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized === "signed") {
    return "Reviewed";
  }
  if (normalized === "invalid") {
    return "Needs review";
  }
  return "Review pending";
}
