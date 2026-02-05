"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import useSound from "use-sound";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useAudioUnlock } from "@/hooks/useAudioUnlock";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";
import { 
  LOCAL_STORAGE_SOUND_MUTED_KEY, 
  LOCAL_STORAGE_SOUND_VOLUME_KEY,
  LOCAL_STORAGE_MUSIC_ENABLED_KEY,
} from "@/shared/constants";

export type SoundName = "gameStart" | "turnChange" | "gameOver" | "gameLose" | "trapSnap" | "tick" | "tickUrgent" | "cardReveal" | "clueSubmit";
export type MusicTrack = "lobby" | "game-30s" | "game-60s" | "game-90s" | "victory" | null;

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

  // Load from localStorage on mount
  useEffect(() => {
    const storedVolume = localStorage.getItem(LOCAL_STORAGE_SOUND_VOLUME_KEY);
    const storedMuted = localStorage.getItem(LOCAL_STORAGE_SOUND_MUTED_KEY);
    
    if (storedVolume !== null) {
      const parsed = parseFloat(storedVolume);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        setVolumeState(parsed);
      }
    }
    
    if (storedMuted !== null) {
      setIsMutedState(storedMuted === "true");
    }
    
    setIsHydrated(true);
  }, []);

  // Read initial music-enabled from localStorage (sync, safe — only runs once)
  const [initialMusicEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LOCAL_STORAGE_MUSIC_ENABLED_KEY) === "true";
  });

  // Background music (delegated to useMusicPlayer)
  const music = useMusicPlayer({
    volume,
    isHydrated,
    prefersReducedMotion,
    audioUnlock,
    initialEnabled: initialMusicEnabled,
  });

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
      musicEnabled: music.musicEnabled,
      setMusicEnabled: music.setMusicEnabled,
      toggleMusic: music.toggleMusic,
      currentTrack: music.currentTrack,
      setMusicTrack: music.setMusicTrack,
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
