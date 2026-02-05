"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import useSound from "use-sound";
import { Howl, Howler } from "howler";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAudioUnlock } from "@/hooks/useAudioUnlock";
import { 
  LOCAL_STORAGE_SOUND_MUTED_KEY, 
  LOCAL_STORAGE_SOUND_VOLUME_KEY,
  LOCAL_STORAGE_MUSIC_ENABLED_KEY,
} from "@/shared/constants";

export type SoundName = "gameStart" | "turnChange" | "gameOver" | "gameLose" | "trapSnap" | "tick" | "tickUrgent" | "cardReveal" | "clueSubmit";
export type MusicTrack = "lobby" | "game-30s" | "game-60s" | "game-90s" | "victory" | null;

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

interface SoundContextValue {
  // Sound effects
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  toggleMute: () => void;
  soundEnabled: boolean;
  playSound: (name: SoundName) => void;
  stopTickSounds: () => void;
  // Background music
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  toggleMusic: () => void;
  currentTrack: MusicTrack;
  setMusicTrack: (track: MusicTrack) => void;
}

const SoundContext = createContext<SoundContextValue | undefined>(undefined);

// Ref to store play functions (shared between components)
const playFunctionsRef: { current: {
  playGameStart: () => void;
  playTurnChange: () => void;
  playGameOver: () => void;
  playGameLose: () => void;
  playTrapSnap: () => void;
  playTick: () => void;
  playTickUrgent: () => void;
  playCardReveal: () => void;
  playClueSubmit: () => void;
  stopTick: () => void;
  stopTickUrgent: () => void;
} | null } = { current: null };

/**
 * Stable inner component that captures use-sound hooks.
 * Defined outside SoundProvider to maintain component identity when props change.
 * This prevents remounting children when volume/soundEnabled changes.
 * 
 * NOTE: We always pass soundEnabled: true to use-sound hooks so Howl instances
 * are always ready to play. The actual mute/enable logic is handled in playSound().
 * This fixes issues where sounds don't work after page refresh until toggled.
 */
function PlayFunctionCapture({ 
  children, 
  volume, 
}: { 
  children: ReactNode; 
  volume: number; 
}) {
  // use-sound hooks for audio files
  // Always enabled - mute logic handled in playSound()
  const [playGameStart] = useSound("/sounds/game-start.mp3", { volume: volume * 0.7 });
  const [playTurnChange] = useSound("/sounds/turn-change.mp3", { volume: volume * 0.5 });
  const [playGameOver] = useSound("/sounds/game-over.mp3", { volume: volume * 0.6 });
  const [playGameLose] = useSound("/sounds/game-lose.mp3", { volume: volume * 0.6 });
  const [playTrapSnap] = useSound("/sounds/trap-snap.mp3", { volume: volume * 0.7 });
  const [playTick, { stop: stopTick }] = useSound("/sounds/tick.mp3", { volume: volume * 0.5, interrupt: true });
  const [playTickUrgent, { stop: stopTickUrgent }] = useSound("/sounds/tick-urgent.mp3", { volume: volume * 0.4, interrupt: true });
  const [playCardReveal] = useSound("/sounds/card-reveal.mp3", { volume: volume * 0.3, interrupt: true });
  const [playClueSubmit] = useSound("/sounds/clue-submit.mp3", { volume: volume * 0.4 });

  // Update shared ref when play functions change
  useEffect(() => {
    playFunctionsRef.current = { 
      playGameStart, playTurnChange, playGameOver, playGameLose, playTrapSnap,
      playTick, playTickUrgent, playCardReveal, playClueSubmit,
      stopTick, stopTickUrgent,
    };
  }, [playGameStart, playTurnChange, playGameOver, playGameLose, playTrapSnap, playTick, playTickUrgent, playCardReveal, playClueSubmit, stopTick, stopTickUrgent]);

  return <>{children}</>;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  // Audio unlock state (browser autoplay policy compliance)
  const audioUnlock = useAudioUnlock();
  
  // Sound effects state
  const [volume, setVolumeState] = useState(0.5);
  const [isMuted, setIsMutedState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Music state
  const [musicEnabled, setMusicEnabledState] = useState(false);
  const [currentTrack, setCurrentTrackState] = useState<MusicTrack>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const howlRef = useRef<Howl | null>(null);
  const pendingTrackRef = useRef<MusicTrack>(null);

  // Computed values
  const musicVolume = volume * MUSIC_VOLUME_RATIO;
  const musicVolumeRef = useRef(musicVolume);
  
  useEffect(() => {
    musicVolumeRef.current = musicVolume;
  }, [musicVolume]);

  // Load from localStorage on mount
  useEffect(() => {
    const storedVolume = localStorage.getItem(LOCAL_STORAGE_SOUND_VOLUME_KEY);
    const storedMuted = localStorage.getItem(LOCAL_STORAGE_SOUND_MUTED_KEY);
    const storedMusicEnabled = localStorage.getItem(LOCAL_STORAGE_MUSIC_ENABLED_KEY);
    
    if (storedVolume !== null) {
      const parsed = parseFloat(storedVolume);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed);
      }
    }
    
    if (storedMuted !== null) {
      setIsMutedState(storedMuted === "true");
    }

    if (storedMusicEnabled !== null) {
      setMusicEnabledState(storedMusicEnabled === "true");
    }
    
    setIsHydrated(true);
  }, []);

  // Persist volume to localStorage
  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    localStorage.setItem(LOCAL_STORAGE_SOUND_VOLUME_KEY, String(clamped));
  }, []);

  // Persist muted state to localStorage
  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem(LOCAL_STORAGE_SOUND_MUTED_KEY, String(muted));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  // Music enabled toggle
  const setMusicEnabled = useCallback((enabled: boolean) => {
    setMusicEnabledState(enabled);
    localStorage.setItem(LOCAL_STORAGE_MUSIC_ENABLED_KEY, String(enabled));
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled(!musicEnabled);
  }, [musicEnabled, setMusicEnabled]);

  // Set music track - stores as pending if audio not ready
  const setMusicTrack = useCallback((track: MusicTrack) => {
    setCurrentTrackState(track);
    
    if (track && !audioUnlock.isReady) {
      pendingTrackRef.current = track;
      // Opportunistically try to unlock - may work if there's been recent interaction
      audioUnlock.tryUnlock();
    } else {
      pendingTrackRef.current = null;
    }
  }, [audioUnlock]);

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
    
    // If audio not ready yet, store as pending - will retry when unlocked
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
        // On play error, wait for Howler's unlock event (user interaction)
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

  // Update volume without recreating howl
  useEffect(() => {
    if (howlRef.current && musicEnabled && isHydrated) {
      howlRef.current.volume(musicVolume);
    }
  }, [musicVolume, musicEnabled, isHydrated]);

  // iOS workaround: retry music on user interaction when context is suspended
  // This handles the case where audio context gets suspended during navigation
  // even though we already marked isReady=true previously
  useEffect(() => {
    if (!musicEnabled || !isHydrated || prefersReducedMotion) return;
    
    const handleInteraction = () => {
      const ctx = Howler.ctx;
      
      // If context is suspended, try to resume it
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => {
          if (ctx.state === "running") {
            // Context resumed - if we have a track that should play, trigger retry
            if (currentTrack && !howlRef.current?.playing()) {
              setRetryTrigger(prev => prev + 1);
            }
          }
        }).catch(() => {});
      }
    };
    
    document.addEventListener("touchstart", handleInteraction);
    document.addEventListener("click", handleInteraction);
    
    return () => {
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, [musicEnabled, isHydrated, prefersReducedMotion, currentTrack]);

  // Sound enabled check
  const soundEnabled = isHydrated && !isMuted && !prefersReducedMotion;

  const playSound = useCallback((name: SoundName) => {
    if (!soundEnabled) return;
    
    const fns = playFunctionsRef.current;
    if (!fns) return;
    
    switch (name) {
      case "gameStart": fns.playGameStart(); break;
      case "turnChange": fns.playTurnChange(); break;
      case "gameOver": fns.playGameOver(); break;
      case "gameLose": fns.playGameLose(); break;
      case "trapSnap": fns.playTrapSnap(); break;
      case "tick": fns.playTick(); break;
      case "tickUrgent": fns.playTickUrgent(); break;
      case "cardReveal": fns.playCardReveal(); break;
      case "clueSubmit": fns.playClueSubmit(); break;
    }
  }, [soundEnabled]);

  const stopTickSounds = useCallback(() => {
    playFunctionsRef.current?.stopTick();
    playFunctionsRef.current?.stopTickUrgent();
  }, []);

  return (
    <SoundContext.Provider value={{
      volume,
      setVolume,
      isMuted,
      setIsMuted,
      toggleMute,
      soundEnabled,
      playSound,
      stopTickSounds,
      musicEnabled,
      setMusicEnabled,
      toggleMusic,
      currentTrack,
      setMusicTrack,
    }}>
      <PlayFunctionCapture volume={volume}>
        {children}
      </PlayFunctionCapture>
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error("useSoundContext must be used within a SoundProvider");
  }
  return context;
}

export function useSoundContextOptional() {
  return useContext(SoundContext);
}
