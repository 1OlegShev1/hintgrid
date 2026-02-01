"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { useGameContext } from "./GameContext";
import SoundToggle from "./SoundToggle";
import ConnectionIndicator from "./ConnectionIndicator";
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

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isLastPlayer, isActiveGame, leaveRoom } = useGameContext();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
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

  return (
    <>
      <nav className={`
        sticky top-0 z-40
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-md 
        border-b border-gray-200 dark:border-gray-800
        transition-transform duration-300 ease-in-out
        ${isVisible ? "translate-y-0" : "-translate-y-full"}
      `}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            onClick={handleHomeClick}
            className="group flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              <span className="text-red-500">Hint</span>
              <span className="text-blue-500">Grid</span>
            </span>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
              BETA
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ConnectionIndicator />
            <SoundToggle />
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={`Current: ${getThemeLabel()}. Click to cycle.`}
            >
              {getThemeIcon()}
              <span className="text-sm font-medium hidden sm:inline">{getThemeLabel()}</span>
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
    </>
  );
}
