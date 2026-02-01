"use client";

import { useEffect, useState, useRef } from "react";
import { Modal, Button } from "@/components/ui";

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
    <Modal
      open={true}
      onClose={onStay}
      closeOnBackdropClick={false}
      closeOnEscape={false}
      size="md"
      customIcon={<span className="text-4xl">👋</span>}
    >
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Are you still there?
      </h2>
      <p className="text-muted mb-6">
        You&apos;ve been inactive for a while. Click below to stay in the room.
      </p>
      
      <div className="mb-6">
        <div className="text-4xl font-mono font-bold text-primary">
          {secondsLeft}
        </div>
        <div className="text-sm text-muted">
          seconds until you&apos;re redirected
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={onStay}
          data-testid="idle-stay-btn"
          variant="primary"
          size="lg"
        >
          I&apos;m still here!
        </Button>
        <Button
          onClick={onLeave}
          data-testid="idle-leave-btn"
          variant="secondary"
          size="lg"
        >
          Leave room
        </Button>
      </div>
    </Modal>
  );
}
