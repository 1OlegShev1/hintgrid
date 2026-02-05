import { useState } from "react";
import { Crown, QrCode, Lock, Unlock, Globe, EyeOff, Check, Share2, LogOut } from "lucide-react";
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
  return <Crown className={className} aria-label="Room owner" />;
}

function QrCodeIcon({ className }: { className?: string }) {
  return <QrCode className={className} aria-label="Show QR code" />;
}

function LockIcon({ className, locked }: { className?: string; locked: boolean }) {
  return locked ? (
    <Lock className={className} aria-label="Room locked" />
  ) : (
    <Unlock className={className} aria-label="Room unlocked" />
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
  return <Globe className={className} />;
}

function EyeOffIcon({ className }: { className?: string }) {
  return <EyeOff className={className} />;
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
    
    // Use native share sheet on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join HintGrid", url: roomUrl });
        return;
      } catch {
        // User cancelled or share failed - fall through to clipboard
      }
    }
    
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
                  <Check className="w-4 h-4" />
                  <span className="hidden xs:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
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
                <LogOut className="w-4 h-4" />
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
