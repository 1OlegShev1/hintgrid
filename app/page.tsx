"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AvatarPicker from "@/components/AvatarPicker";
import { LOCAL_STORAGE_AVATAR_KEY, getRandomAvatar, PUBLIC_ROOMS_DISPLAY_LIMIT, TIMER_PRESETS } from "@/shared/constants";
import { getPublicRooms } from "@/lib/rtdb-actions";
import { Button, Card, Badge, Input } from "@/components/ui";

interface PublicRoom {
  roomCode: string;
  roomName: string;
  ownerName: string;
  playerCount: number;
  status: "lobby" | "playing" | "paused";
  timerPreset: string;
  createdAt: number;
}

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [avatar, setAvatar] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const router = useRouter();

  // Initialize avatar from localStorage or random on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_AVATAR_KEY);
    setAvatar(stored || getRandomAvatar());
  }, []);

  // Fetch public rooms
  useEffect(() => {
    let mounted = true;
    
    const fetchRooms = async () => {
      try {
        const rooms = await getPublicRooms(PUBLIC_ROOMS_DISPLAY_LIMIT);
        if (mounted) {
          setPublicRooms(rooms);
          setLoadingRooms(false);
        }
      } catch (err) {
        console.warn("Failed to fetch public rooms:", err);
        if (mounted) setLoadingRooms(false);
      }
    };

    fetchRooms();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRooms, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
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

  const getStatusBadge = (status: PublicRoom["status"]) => {
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
    <main className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2 bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            HintGrid
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A word guessing party game
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Public Rooms */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Public Games
            </h2>
            
            {loadingRooms ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-surface rounded-lg h-16" />
                ))}
              </div>
            ) : publicRooms.length > 0 ? (
              <div className="space-y-3" data-testid="public-rooms-list">
                {publicRooms.map((room) => (
                  <div
                    key={room.roomCode}
                    data-testid={`public-room-${room.roomCode}`}
                    className="p-3 bg-surface rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground truncate">
                            {room.roomName}
                          </span>
                          {getStatusBadge(room.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted">
                          <span>{room.playerCount} players</span>
                          <span>•</span>
                          <span>{getTimerLabel(room.timerPreset)}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          // Always redirect to room - name entry happens there if needed
                          if (playerName.trim()) {
                            window.location.href = `/room/${room.roomCode}?name=${encodeURIComponent(playerName)}`;
                          } else {
                            window.location.href = `/room/${room.roomCode}`;
                          }
                        }}
                        data-testid={`public-room-join-${room.roomCode}`}
                        variant="primary"
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
                <p className="text-muted mb-2">
                  No public games right now
                </p>
                <p className="text-sm text-muted/70">
                  Create one and invite friends!
                </p>
              </div>
            )}
          </Card>

          {/* Right: Create/Join */}
          <Card variant="elevated" padding="lg">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Your Name
                </label>
                <div className="flex items-center gap-3">
                  <AvatarPicker selected={avatar} onSelect={handleAvatarSelect} />
                  <input
                    id="name"
                    data-testid="home-name-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-elevated text-foreground"
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
                  className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg"
                >
                  Create {isPrivateRoom ? "Private" : "Public"} Room
                </Button>
                <button
                  type="button"
                  onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                  className="flex items-center justify-between w-full text-sm text-muted"
                >
                  <span>{isPrivateRoom ? "Private room" : "Public room"}</span>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${isPrivateRoom ? "bg-primary" : "bg-border"}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivateRoom ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-surface-elevated text-muted">or join with code</span>
                </div>
              </div>

              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-foreground mb-2">
                  Room Code
                </label>
                <input
                  id="roomCode"
                  data-testid="home-code-input"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-elevated text-foreground uppercase"
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
                className="shadow-md hover:shadow-lg"
              >
                Join Room
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}


