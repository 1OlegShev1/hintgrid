import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Player } from "@/shared/types";
import { Card, Button, Badge } from "@/components/ui";

interface RoomHeaderProps {
  roomCode: string;
  currentPlayer: Player | null;
  isRoomOwner: boolean;
  isLocked?: boolean;
  roomName?: string;
  visibility?: "public" | "private";
  onSetRoomLocked?: (locked: boolean) => void;
  onSetRoomName?: (name: string) => void;
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

function LockIcon({ className, locked }: { className?: string; locked: boolean }) {
  return locked ? (
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
  ) : (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      aria-label="Room unlocked"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
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
      <Card 
        variant="elevated"
        padding="lg"
        className="max-w-md mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Join Room
        </h2>
        <p className="text-muted mb-6">
          Scan this QR code to join room <span className="font-mono font-bold text-primary">{roomCode}</span>
        </p>
        
        <div className="bg-white p-4 rounded-xl inline-block mb-6">
          <QRCodeSVG 
            value={roomUrl} 
            size={330}
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="text-sm text-muted mb-6 break-all">
          {roomUrl}
        </div>

        <Button onClick={onClose} variant="secondary" size="lg">
          Close
        </Button>
      </Card>
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

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function RoomHeader({ roomCode, currentPlayer, isRoomOwner, isLocked, roomName, visibility, onSetRoomLocked, onSetRoomName, onLeaveRoom }: RoomHeaderProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(roomName || "");
  
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
    <Card variant="elevated" className="mb-4">
      <div className="space-y-3">
        {/* Row 1: Room code and main actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setShowQrModal(true)}
            variant="ghost"
            size="icon"
            className="bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
            title="Show QR code to join room"
          >
            <QrCodeIcon className="w-5 h-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent whitespace-nowrap">
            Room:{" "}
            <button
              onClick={handleCopyRoomCode}
              className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent hover:opacity-80 cursor-pointer transition-opacity"
              title="Click to copy room code"
            >
              {roomCode}
            </button>
          </h1>
          {codeCopied && (
            <span className="text-xs text-success font-medium">Copied!</span>
          )}
          
          {/* Action buttons - wrap on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {isRoomOwner && onSetRoomLocked ? (
              <button
                onClick={() => onSetRoomLocked(!isLocked)}
                data-testid="room-lock-btn"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isLocked
                    ? "bg-warning/20 text-warning hover:bg-warning/30"
                    : "bg-surface text-muted hover:bg-surface-elevated"
                }`}
                title={isLocked ? "Room is locked - click to unlock" : "Room is open - click to lock"}
              >
                <LockIcon className="w-4 h-4" locked={!!isLocked} />
                <span className="hidden xs:inline">{isLocked ? "Locked" : "Open"}</span>
              </button>
            ) : isLocked ? (
              <span 
                data-testid="room-locked-badge"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning/20 text-warning text-sm font-medium"
                title="Room is locked - new players cannot join"
              >
                <LockIcon className="w-4 h-4" locked={true} />
                <span className="hidden xs:inline">Locked</span>
              </span>
            ) : null}
            <button
              onClick={handleShareRoom}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all ${
                copiedUrl
                  ? "bg-success/20 text-success"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
              title="Copy room URL"
            >
              {copiedUrl ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden xs:inline">Copied!</span>
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface hover:bg-error/10 text-muted hover:text-error rounded-lg text-sm font-medium transition-all"
                title="Leave room"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Room name, visibility, and team badge */}
        {(roomName || currentPlayer?.team) && (
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-border/50">
            {/* Room name with crown for owner - editable */}
            {roomName && (
              <div className="flex items-center gap-2 min-w-0">
                {isRoomOwner && <CrownIcon className="w-4 h-4 text-yellow-500 shrink-0" />}
                {isEditingName && isRoomOwner && onSetRoomName ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editedName.trim()) {
                        onSetRoomName(editedName.trim());
                      }
                      setIsEditingName(false);
                    }}
                    className="flex items-center min-w-0"
                  >
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full max-w-[200px] px-2 py-1 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={40}
                      autoFocus
                      onBlur={() => {
                        if (editedName.trim() && editedName.trim() !== roomName) {
                          onSetRoomName(editedName.trim());
                        }
                        setIsEditingName(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditedName(roomName);
                          setIsEditingName(false);
                        }
                      }}
                    />
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      if (isRoomOwner && onSetRoomName) {
                        setEditedName(roomName);
                        setIsEditingName(true);
                      }
                    }}
                    className={`text-foreground font-medium truncate max-w-[200px] ${
                      isRoomOwner && onSetRoomName 
                        ? "hover:text-primary cursor-pointer" 
                        : "cursor-default"
                    }`}
                    title={isRoomOwner && onSetRoomName ? "Click to edit room name" : roomName}
                    disabled={!isRoomOwner || !onSetRoomName}
                  >
                    {roomName}
                  </button>
                )}
                {/* Visibility indicator */}
                {visibility === "private" ? (
                  <span 
                    title="Private room - not listed publicly" 
                    className="flex items-center gap-1 text-xs text-muted shrink-0"
                  >
                    <EyeOffIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Private</span>
                  </span>
                ) : (
                  <span 
                    title="Public room - visible to everyone" 
                    className="flex items-center gap-1 text-xs text-success shrink-0"
                  >
                    <GlobeIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Public</span>
                  </span>
                )}
              </div>
            )}
            {/* Team badge */}
            {currentPlayer?.team && (currentPlayer.team === "red" || currentPlayer.team === "blue") && (
              <Badge variant={currentPlayer.team} className="shrink-0">
                {currentPlayer.team} {currentPlayer.role === "clueGiver" ? "hinter" : "seeker"}
              </Badge>
            )}
          </div>
        )}
      </div>

      {showQrModal && roomUrl && (
        <QrCodeModal 
          roomUrl={roomUrl} 
          roomCode={roomCode} 
          onClose={() => setShowQrModal(false)} 
        />
      )}
    </Card>
  );
}
