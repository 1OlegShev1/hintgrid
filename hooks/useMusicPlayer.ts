"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Howl, Howler } from "howler";
import type { AudioUnlockState } from "@/hooks/useAudioUnlock";
import type { MusicTrack } from "@/contexts/SoundContext";
import { LOCAL_STORAGE_MUSIC_ENABLED_KEY } from "@/shared/constants";

// Music plays at 30% of master volume
const MUSIC_VOLUME_RATIO = 0.3;

// Music track paths
const MUSIC_TRACKS: Record<Exclude<MusicTrack, null>, string> = {
  "lobby": "/sounds/music/lobby.mp3",
  "game-30s": "/sounds/music/game-30s.mp3",
  "game-60s": "/sounds/music/game-60s.mp3",
  "game-90s": "/sounds/music/game-90s.mp3",
  "victory": "/sounds/music/victory.mp3",
};

interface UseMusicPlayerOptions {
  volume: number;
  isHydrated: boolean;
  prefersReducedMotion: boolean;
  audioUnlock: AudioUnlockState;
  initialEnabled: boolean;
}

interface UseMusicPlayerReturn {
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  toggleMusic: () => void;
  currentTrack: MusicTrack;
  setMusicTrack: (track: MusicTrack) => void;
}

/**
 * Hook to manage background music playback via Howler.js.
 *
 * Handles:
 * - Howl lifecycle (create, play, fade in/out, stop, unload)
 * - Track switching with crossfade
 * - iOS audio context suspension workaround
 * - Volume sync without recreating Howl instances
 * - Pending track support when audio is not yet unlocked
 */
export function useMusicPlayer({
  volume,
  isHydrated,
  prefersReducedMotion,
  audioUnlock,
  initialEnabled,
}: UseMusicPlayerOptions): UseMusicPlayerReturn {
  const [musicEnabled, setMusicEnabledState] = useState(initialEnabled);
  const [currentTrack, setCurrentTrackState] = useState<MusicTrack>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const howlRef = useRef<Howl | null>(null);
  const pendingTrackRef = useRef<MusicTrack>(null);

  // Keep a ref-copy of the computed music volume so effects can read it
  // without adding it as a dependency (avoids recreating the Howl on volume change).
  const musicVolume = volume * MUSIC_VOLUME_RATIO;
  const musicVolumeRef = useRef(musicVolume);
  useEffect(() => {
    musicVolumeRef.current = musicVolume;
  }, [musicVolume]);

  // Persist music enabled state
  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled);
    localStorage.setItem(LOCAL_STORAGE_MUSIC_ENABLED_KEY, String(enabled));
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabledState((prev) => {
      const next = !prev;
      localStorage.setItem(LOCAL_STORAGE_MUSIC_ENABLED_KEY, String(next));
      return next;
    });
  }, []);

  // Set music track – stores as pending if audio not ready
  const setMusicTrack = useCallback(
    (track: MusicTrack) => {
      setCurrentTrackState(track);

      if (track && !audioUnlock.isReady) {
        pendingTrackRef.current = track;
        audioUnlock.tryUnlock();
      } else {
        pendingTrackRef.current = null;
      }
    },
    [audioUnlock],
  );

  // Handle music playback
  useEffect(() => {
    // Stop current music if exists
    if (howlRef.current) {
      howlRef.current.fade(howlRef.current.volume(), 0, 500);
      const oldHowl = howlRef.current;
      setTimeout(() => {
        oldHowl.stop();
        oldHowl.unload();
      }, 500);
      howlRef.current = null;
    }

    // Don't play if conditions not met
    if (!currentTrack || !musicEnabled || !isHydrated || prefersReducedMotion) {
      return;
    }

    // If audio not ready yet, store as pending – will retry when unlocked
    if (!audioUnlock.isReady) {
      pendingTrackRef.current = currentTrack;
      return;
    }

    pendingTrackRef.current = null;

    // Ensure audio context is running (iOS can suspend it again)
    const ctx = Howler.ctx;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Create and play new track
    const howl = new Howl({
      src: [MUSIC_TRACKS[currentTrack]],
      loop: true,
      volume: 0,
      html5: true,
      onplayerror: () => {
        howl.once("unlock", () => howl.play());
      },
    });

    howlRef.current = howl;
    howl.play();
    howl.fade(0, musicVolumeRef.current, 1000);

    return () => {
      if (howl.playing()) {
        howl.fade(howl.volume(), 0, 300);
        setTimeout(() => {
          howl.stop();
          howl.unload();
        }, 300);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, musicEnabled, isHydrated, prefersReducedMotion, audioUnlock.isReady, audioUnlock.unlockTrigger, retryTrigger]);

  // Update volume without recreating Howl
  useEffect(() => {
    if (howlRef.current && musicEnabled && isHydrated) {
      howlRef.current.volume(musicVolume);
    }
  }, [musicVolume, musicEnabled, isHydrated]);

  // iOS workaround: retry music on user interaction when context is suspended
  useEffect(() => {
    if (!musicEnabled || !isHydrated || prefersReducedMotion) return;

    const handleInteraction = () => {
      const ctx = Howler.ctx;

      if (ctx && ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => {
            if (ctx.state === "running") {
              if (currentTrack && !howlRef.current?.playing()) {
                setRetryTrigger((prev) => prev + 1);
              }
            }
          })
          .catch(() => {});
      }
    };

    document.addEventListener("touchstart", handleInteraction);
    document.addEventListener("click", handleInteraction);

    return () => {
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, [musicEnabled, isHydrated, prefersReducedMotion, currentTrack]);

  return {
    musicEnabled,
    setMusicEnabled,
    toggleMusic,
    currentTrack,
    setMusicTrack,
  };
}
