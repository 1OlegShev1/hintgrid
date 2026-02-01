"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import { LOCAL_STORAGE_AVATAR_KEY, getRandomAvatar, PUBLIC_ROOMS_DISPLAY_LIMIT, TIMER_PRESETS } from "@/shared/constants";
import { subscribeToPublicRooms, type PublicRoomData } from "@/lib/rtdb-actions";
import { Badge, Card, CardContent, CardHeader, CardTitle, Button, Input } from "@/components/ui";
import { ThemeBackground } from "@/components/ThemeBackground";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoomData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const router = useRouter();

  // Initialize avatar from localStorage or random on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_AVATAR_KEY);
    setAvatar(stored || getRandomAvatar());
  }, []);

  // Subscribe to public rooms in real-time
  useEffect(() => {
    const unsubscribe = subscribeToPublicRooms(
      PUBLIC_ROOMS_DISPLAY_LIMIT,
      (rooms) => {
        setPublicRooms(rooms);
        setLoadingRooms(false);
      },
      (error) => {
        console.warn("Failed to subscribe to public rooms:", error);
        setLoadingRooms(false);
      }
    );
    
    return unsubscribe;
  }, []);

  const handleAvatarSelect = (newAvatar: string) => {
    setAvatar(newAvatar);
    localStorage.setItem(LOCAL_STORAGE_AVATAR_KEY, newAvatar);
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Use full page navigation for static export compatibility
    const visibility = isPrivateRoom ? "private" : "public";
    window.location.href = `/room/${code}?name=${encodeURIComponent(playerName)}&create=true&visibility=${visibility}`;
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;
    // Use full page navigation for static export compatibility
    window.location.href = `/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`;
  };

  const handleJoinPublicRoom = (code: string) => {
    if (!playerName.trim()) return;
    window.location.href = `/room/${code}?name=${encodeURIComponent(playerName)}`;
  };

  const getStatusBadge = (status: PublicRoomData["status"]) => {
    switch (status) {
      case "lobby":
        return <Badge variant="waiting" size="pill">Waiting</Badge>;
      case "playing":
        return <Badge variant="playing" size="pill">In Game</Badge>;
      case "paused":
        return <Badge variant="paused" size="pill">Paused</Badge>;
    }
  };

  const getTimerLabel = (preset: string) => {
    return TIMER_PRESETS[preset as keyof typeof TIMER_PRESETS]?.label || preset;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative bg-transparent">
      {/* Theme-aware Background */}
      <ThemeBackground />

      <div className="w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            HintGrid
          </h1>
          <p className="text-muted">
            A word guessing party game
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Public Rooms */}
          <Card variant="elevated" padding="lg">
            <CardHeader>
              <CardTitle>Public Games</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRooms ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-surface rounded-lg h-16 border border-border" />
                  ))}
                </div>
              ) : publicRooms.length > 0 ? (
                <div className="space-y-3" data-testid="public-rooms-list">
                  {publicRooms.map((room) => (
                    <div
                      key={room.roomCode}
                      data-testid={`public-room-${room.roomCode}`}
                      className="p-3 bg-surface rounded-lg border border-border hover:border-accent transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg text-foreground truncate">
                              {room.roomName}
                            </span>
                            {getStatusBadge(room.status)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted">
                            <span>{room.playerCount} players</span>
                            <span className="text-primary">•</span>
                            <span>{getTimerLabel(room.timerPreset)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            if (playerName.trim()) {
                              window.location.href = `/room/${room.roomCode}?name=${encodeURIComponent(playerName)}`;
                            } else {
                              window.location.href = `/room/${room.roomCode}`;
                            }
                          }}
                          data-testid={`public-room-join-${room.roomCode}`}
                          variant="secondary"
                          size="sm"
                        >
                          {room.status === "lobby" ? "Join" : "Watch"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎮</div>
                  <p className="text-muted text-lg mb-2">
                    No public games right now
                  </p>
                  <p className="text-sm text-muted/70">
                    Create one and invite friends!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Create/Join */}
          <Card variant="elevated" padding="lg">
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Your Name
                </label>
                <div className="flex items-center gap-3">
                  <AvatarPicker selected={avatar} onSelect={handleAvatarSelect} />
                  <Input
                    id="name"
                    data-testid="home-name-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1"
                    inputSize="lg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isCreating) {
                        handleCreateRoom();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || isCreating}
                  data-testid="home-create-btn"
                  variant="primary"
                  size="lg"
                  fullWidth
                >
                  Create {isPrivateRoom ? "Private" : "Public"} Room
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                  className="flex items-center justify-between w-full text-sm text-muted"
                >
                  <span>{isPrivateRoom ? "Private room" : "Public room"}</span>
                  <div className={`relative w-11 h-6 rounded-full transition-colors border ${isPrivateRoom ? "bg-primary border-primary" : "bg-muted/20 border-muted/40"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${isPrivateRoom ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-surface-elevated text-muted">or join with code</span>
                </div>
              </div>

              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-foreground mb-2">
                  Room Code
                </label>
                <Input
                  id="roomCode"
                  data-testid="home-code-input"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ENTER ROOM CODE"
                  className="uppercase tracking-widest"
                  inputSize="lg"
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && playerName.trim() && roomCode.trim()) {
                      handleJoinRoom();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !roomCode.trim()}
                data-testid="home-join-btn"
                variant="secondary"
                size="lg"
                fullWidth
              >
                Join Room
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}


