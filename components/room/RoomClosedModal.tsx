import { useRouter } from "next/navigation";
import type { RoomClosedReason } from "@/shared/types";
import { Card, Button } from "@/components/ui";
import { ThemeBackground } from "@/components/ThemeBackground";

interface RoomClosedModalProps {
  reason: RoomClosedReason;
}

export default function RoomClosedModal({ reason }: RoomClosedModalProps) {
  const router = useRouter();

  const reasonMessages: Record<string, { title: string; message: string }> = {
    abandoned: {
      title: "Game Abandoned",
      message: "All players left the game and no one reconnected in time. The game has ended.",
    },
    allPlayersLeft: {
      title: "Room Closed",
      message: "All players have left the room.",
    },
    timeout: {
      title: "Session Expired",
      message: "The game session has expired due to inactivity.",
    },
    kicked: {
      title: "Removed from Room",
      message: "You have been removed from this room by the room owner.",
    },
  };

  const { title, message } = reasonMessages[reason] || {
    title: "Room Closed",
    message: "This room is no longer available.",
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative bg-transparent">
      <ThemeBackground />

      <Card variant="elevated" padding="lg" className="max-w-md w-full text-center relative z-10">
        <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 border border-warning/50 flex items-center justify-center mb-6">
          <svg 
            className="w-8 h-8 text-warning" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted mb-6">{message}</p>
        <Button
          onClick={() => router.push("/")}
          variant="primary"
          size="lg"
          fullWidth
        >
          Return to Home
        </Button>
      </Card>
    </main>
  );
}
