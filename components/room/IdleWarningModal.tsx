"use client";

import { useEffect, useState, useRef } from "react";

interface IdleWarningModalProps {
  /** Called when user confirms they're still there */
  onStay: () => void;
  /** Called when user chooses to leave or countdown expires */
  onLeave: () => void;
  /** Seconds before auto-leave (default 60) */
  countdownSeconds?: number;
}

export default function IdleWarningModal({
  onStay,
  onLeave,
  countdownSeconds = 60,
}: IdleWarningModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const hasCalledLeaveRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle auto-leave when countdown reaches 0 (separate from render)
  useEffect(() => {
    if (secondsLeft === 0 && !hasCalledLeaveRef.current) {
      hasCalledLeaveRef.current = true;
      onLeave();
    }
  }, [secondsLeft, onLeave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
        <div className="text-6xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Are you still there?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You&apos;ve been inactive for a while. Click below to stay in the room.
        </p>
        
        <div className="mb-6">
          <div className="text-4xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {secondsLeft}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            seconds until you&apos;re redirected
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onStay}
            data-testid="idle-stay-btn"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            I&apos;m still here!
          </button>
          <button
            onClick={onLeave}
            data-testid="idle-leave-btn"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
          >
            Leave room
          </button>
        </div>
      </div>
    </div>
  );
}
