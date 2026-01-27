import { useState, useEffect, FormEvent } from "react";
import AvatarPicker from "@/components/AvatarPicker";
import { LOCAL_STORAGE_AVATAR_KEY, getRandomAvatar } from "@/shared/constants";
import { validatePlayerName } from "@/shared/validation";

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">Join Room</h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Enter your name to join room {roomCode}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Name
            </label>
            <div className="flex items-center gap-3">
              <AvatarPicker selected={avatar} onSelect={handleAvatarSelect} />
              <input
                id="roomName"
                type="text"
                value={pendingName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter your name"
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                  nameError
                    ? "border-red-500 dark:border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                autoFocus
              />
            </div>
            {nameError && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{nameError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!pendingName.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Join Room
          </button>
        </form>
      </div>
    </main>
  );
}
