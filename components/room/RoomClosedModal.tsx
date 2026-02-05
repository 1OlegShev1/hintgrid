import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
      <ThemeBackground sunPosition="right" />

      <Card variant="elevated" padding="lg" className="max-w-md w-full text-center relative z-10">
        <div className="mx-auto w-16 h-16 rounded-full bg-warning/20 border border-warning/50 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-warning" />
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
