import { useState, useEffect, FormEvent } from "react";
import AvatarPicker from "@/components/AvatarPicker";
import { LOCAL_STORAGE_AVATAR_KEY, getRandomAvatar } from "@/shared/constants";
import { validatePlayerName } from "@/shared/validation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface JoinRoomFormProps {
  roomCode: string;
  onJoin: (name: string, avatar: string) => void;
}

export default function JoinRoomForm({ roomCode, onJoin }: JoinRoomFormProps) {
  const [pendingName, setPendingName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize avatar from localStorage or random on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_AVATAR_KEY);
    setAvatar(stored || getRandomAvatar());
  }, []);

  const handleAvatarSelect = (newAvatar: string) => {
    setAvatar(newAvatar);
    localStorage.setItem(LOCAL_STORAGE_AVATAR_KEY, newAvatar);
  };

  const handleNameChange = (value: string) => {
    setPendingName(value);
    setNameError(null); // Clear error on input
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = pendingName.trim();
    if (!trimmed) return;

    const validation = validatePlayerName(trimmed);
    if (!validation.valid) {
      setNameError(validation.error || "Invalid name");
      return;
    }

    onJoin(trimmed, avatar);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md" variant="elevated">
        <CardHeader className="text-center">
          <CardTitle>Join Room</CardTitle>
          <p className="text-muted">
            Enter your name to join room {roomCode}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-foreground mb-2">
                Your Name
              </label>
              <div className="flex items-center gap-3">
                <AvatarPicker selected={avatar} onSelect={handleAvatarSelect} />
                <Input
                  id="roomName"
                  type="text"
                  value={pendingName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter your name"
                  variant={nameError ? "error" : "default"}
                  error={nameError || undefined}
                  autoFocus
                  className="flex-1"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={!pendingName.trim()}
              fullWidth
              size="lg"
            >
              Join Room
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
