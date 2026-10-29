import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";

import type { FeedbackDriver, FeedbackEvent, SoundCueId } from "./feedback-contract";
import { SOUND_SOURCES } from "./sound-catalog";

const players = new Map<SoundCueId, AudioPlayer>();
let audioConfiguration: Promise<void> | null = null;

export const mobileFeedbackDriver: FeedbackDriver = Object.freeze({
  async playSound(cue) {
    await ensureAudioConfiguration();
    const player = playerForCue(cue);
    await player.seekTo(0);
    player.play();
  },
  async playHaptic(event) {
    await playHaptic(event);
  },
});

export function ensureAudioConfiguration(): Promise<void> {
  if (audioConfiguration) return audioConfiguration;
  const attempt = setAudioModeAsync({
    allowsRecording: false,
    interruptionMode: "mixWithOthers",
    playsInSilentMode: false,
    shouldPlayInBackground: false,
  });
  audioConfiguration = attempt;
  void attempt.catch(() => {
    if (audioConfiguration === attempt) audioConfiguration = null;
  });
  return attempt;
}

export function playSelectionHaptic(): Promise<void> {
  return Haptics.selectionAsync();
}

function playerForCue(cue: SoundCueId): AudioPlayer {
  const current = players.get(cue);
  if (current) return current;
  const created = createAudioPlayer(SOUND_SOURCES[cue], {
    keepAudioSessionActive: false,
    updateInterval: 1_000,
  });
  players.set(cue, created);
  return created;
}

function playHaptic(event: FeedbackEvent): Promise<void> {
  if (event.kind === "piece-arrival") {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  }
  if (event.kind === "move") {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  const resultType = event.result === "win"
    ? Haptics.NotificationFeedbackType.Success
    : event.result === "loss"
      ? Haptics.NotificationFeedbackType.Error
      : Haptics.NotificationFeedbackType.Warning;
  return Haptics.notificationAsync(resultType);
}
