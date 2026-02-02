"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { useGameContext } from "./GameContext";
import SoundToggle from "./SoundToggle";
import ConnectionIndicator from "./ConnectionIndicator";
import HelpModal, { QuestionMarkIcon } from "./HelpModal";
import { ConfirmModal } from "@/components/ui";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
    </svg>
  );
}

export default function Navbar() {
  const { theme, setTheme, style, setStyle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isLastPlayer, isActiveGame, leaveRoom } = useGameContext();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Mobile auto-hide navbar on scroll
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      
      ticking.current = true;
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY.current;
        
        // Only hide/show on mobile (check if hover is not supported = touch device)
        const isMobile = window.matchMedia("(hover: none)").matches;
        
        if (isMobile) {
          // Hide when scrolling down past 50px, show when scrolling up
          if (scrollDelta > 5 && currentScrollY > 50) {
            setIsVisible(false);
          } else if (scrollDelta < -5 || currentScrollY <= 50) {
            setIsVisible(true);
          }
        } else {
          // Always visible on desktop
          setIsVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check if user is in a game room
  const isInRoom = pathname?.startsWith("/room/");
  const shouldShowWarning = isInRoom && isActiveGame;

  const handleHomeClick = async (e: React.MouseEvent) => {
    if (shouldShowWarning) {
      e.preventDefault();
      setShowLeaveModal(true);
    } else if (isInRoom) {
      // In room but no active game - leave explicitly before navigating
      e.preventDefault();
      setIsLeaving(true);
      try {
        await leaveRoom();
      } catch (err) {
        console.error("[Navbar] Error leaving room:", err);
      }
      router.push("/");
    }
    // If not in room, just navigate normally
  };

  const handleConfirmLeave = async () => {
    setShowLeaveModal(false);
    setIsLeaving(true);
    try {
      await leaveRoom();
    } catch (err) {
      console.error("Error leaving room:", err);
    }
    router.push("/");
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
  };

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const toggleStyle = () => {
    setStyle(style === "synthwave" ? "classic" : "synthwave");
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon className="w-5 h-5" />;
      case "dark":
        return <MoonIcon className="w-5 h-5" />;
      case "system":
        return <ComputerIcon className="w-5 h-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
    }
  };

  const getStyleLabel = () => {
    return style === "synthwave" ? "Synthwave" : "Classic";
  };

  return (
    <>
      <nav className={`
        sticky top-0 z-40
        bg-surface/90 backdrop-blur-md 
        border-b border-border
        transition-transform duration-300 ease-in-out
        ${isVisible ? "translate-y-0" : "-translate-y-full"}
      `}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            onClick={handleHomeClick}
            className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="font-bold text-lg sm:text-xl tracking-wide">
              <span className="text-primary">Hint</span>
              <span className="text-accent">Grid</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-primary border border-primary/50">
              BETA
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ConnectionIndicator />
            <SoundToggle />
            {/* Help button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-accent hover:bg-surface-elevated transition-colors"
              title="How to Play"
            >
              <QuestionMarkIcon className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">Help</span>
            </button>
            {/* Style switcher (classic/synthwave) */}
            <button
              onClick={toggleStyle}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-accent hover:bg-surface-elevated transition-colors"
              title={`Style: ${getStyleLabel()}. Click to toggle.`}
            >
              <PaletteIcon className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">{getStyleLabel()}</span>
            </button>
            {/* Theme mode switcher (light/dark/system) */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted hover:text-accent hover:bg-surface-elevated transition-colors"
              title={`Mode: ${getThemeLabel()}. Click to cycle.`}
            >
              {getThemeIcon()}
              <span className="text-sm hidden sm:inline">{getThemeLabel()}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Leave Game Confirmation Modal */}
      <ConfirmModal
        open={showLeaveModal}
        onClose={handleCancelLeave}
        onConfirm={handleConfirmLeave}
        title={isLastPlayer ? "End Game?" : "Leave Game?"}
        message={
          isLastPlayer
            ? "You are the last player in the game. If you leave, the game will end for everyone."
            : "You will be disconnected from the current game. Are you sure you want to leave?"
        }
        confirmLabel={isLastPlayer ? "End Game" : "Leave"}
        cancelLabel="Stay"
        confirmVariant={isLastPlayer ? "danger" : "warning"}
        icon={isLastPlayer ? "danger" : "warning"}
      />

      {/* Help Modal */}
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  );
}
