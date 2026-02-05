"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useGameContext } from "./GameContext";
import SoundToggle from "./SoundToggle";
import ConnectionIndicator from "./ConnectionIndicator";
import HelpModal, { QuestionMarkIcon } from "./HelpModal";
import { ConfirmModal } from "@/components/ui";


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
        return <Sun className="w-5 h-5" />;
      case "dark":
        return <Moon className="w-5 h-5" />;
      case "system":
        return <Monitor className="w-5 h-5" />;
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
              <Palette className="w-5 h-5" />
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
