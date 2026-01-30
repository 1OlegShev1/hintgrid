import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Player } from "@/shared/types";

interface RoomHeaderProps {
  roomCode: string;
  currentPlayer: Player | null;
  isRoomOwner: boolean;
  isLocked?: boolean;
  onLeaveRoom?: () => void;
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
      aria-label="Room owner"
    >
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
    </svg>
  );
}

function QrCodeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Show QR code"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-label="Room locked"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

interface QrCodeModalProps {
  roomUrl: string;
  roomCode: string;
  onClose: () => void;
}

function QrCodeModal({ roomUrl, roomCode, onClose }: QrCodeModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Join Room
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Scan this QR code to join room <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{roomCode}</span>
        </p>
        
        <div className="bg-white p-4 rounded-xl inline-block mb-6">
          <QRCodeSVG 
            value={roomUrl} 
            size={330}
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 break-all">
          {roomUrl}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }
  
  // Fallback: create temporary textarea
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  } catch (err) {
    console.error("Failed to copy:", err);
    return false;
  }
}

export default function RoomHeader({ roomCode, currentPlayer, isRoomOwner, isLocked, onLeaveRoom }: RoomHeaderProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  
  const roomUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/room/${roomCode}` 
    : "";

  const handleCopyRoomCode = async () => {
    const success = await copyToClipboard(roomCode);
    if (success) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleShareRoom = async () => {
    const roomUrl = `${window.location.origin}/room/${roomCode}`;
    const success = await copyToClipboard(roomUrl);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400 transition-colors"
              title="Show QR code to join room"
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Room:{" "}
            </h1>
            <button
              onClick={handleCopyRoomCode}
              className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 cursor-pointer transition-opacity"
              title="Click to copy room code"
            >
              {roomCode}
            </button>
            {isLocked && (
              <span 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium"
                title="Room is locked - new players cannot join"
              >
                <LockIcon className="w-3 h-3" />
                Locked
              </span>
            )}
          </div>
          <button
            onClick={handleShareRoom}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-all"
            title="Copy room URL"
          >
            {copiedUrl ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-600">URL Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span>Share</span>
              </>
            )}
          </button>
          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              data-testid="leave-room-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-sm font-medium transition-all"
              title="Leave room"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Leave</span>
            </button>
          )}
          {codeCopied && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              Code copied!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentPlayer?.team && (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-white text-sm font-medium ${
              currentPlayer.team === "red" ? "bg-red-team" : "bg-blue-team"
            }`}>
              {isRoomOwner && <CrownIcon className="w-4 h-4 text-yellow-300" />}
              {currentPlayer.name} • {currentPlayer.team} {currentPlayer.role === "clueGiver" ? "hinter" : "seeker"}
            </span>
          )}
          {!currentPlayer?.team && (
            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-base">
              {isRoomOwner && <CrownIcon className="w-4 h-4 text-yellow-500" />}
              {currentPlayer?.name}
            </span>
          )}
        </div>
      </div>

      {showQrModal && roomUrl && (
        <QrCodeModal 
          roomUrl={roomUrl} 
          roomCode={roomCode} 
          onClose={() => setShowQrModal(false)} 
        />
      )}
    </div>
  );
}
