import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemeBackground } from "@/components/ThemeBackground";

interface ConnectionStatusProps {
  isConnecting: boolean;
  connectionError: string | null;
}

/**
 * Loading skeleton that mimics the lobby layout - theme aware.
 */
function LoadingSkeleton() {
  return (
    <div className="min-h-screen p-4 relative bg-transparent">
      <ThemeBackground sunPosition="left" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 bg-surface-elevated rounded-lg animate-pulse"></div>
            <div className="h-6 w-24 bg-surface-elevated rounded-full animate-pulse"></div>
          </div>
          <div className="h-10 w-10 bg-surface-elevated rounded-full animate-pulse"></div>
        </div>

        {/* Main content area */}
        <Card variant="elevated" padding="lg">
          {/* Title skeleton */}
          <div className="text-center mb-8">
            <div className="h-8 w-64 bg-surface rounded-lg mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 w-48 bg-surface rounded mx-auto animate-pulse"></div>
          </div>

          {/* Teams skeleton */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Red team */}
            <div className="bg-red-team-light border border-red-team/40 rounded-xl p-6">
              <div className="h-6 w-24 bg-red-team/30 rounded mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-12 bg-red-team/20 border border-red-team/30 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-red-team/20 border border-red-team/30 rounded-lg animate-pulse"></div>
              </div>
            </div>
            {/* Blue team */}
            <div className="bg-blue-team-light border border-blue-team/40 rounded-xl p-6">
              <div className="h-6 w-24 bg-blue-team/30 rounded mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-12 bg-blue-team/20 border border-blue-team/30 rounded-lg animate-pulse"></div>
                <div className="h-12 bg-blue-team/20 border border-blue-team/30 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-border/50"></div>
              <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-t-primary border-r-transparent border-b-accent border-l-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-muted">
              Connecting to room
              <span className="inline-flex ml-1 text-accent">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
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
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Check if error looks like a rate limit / quota error from Firebase
function isRateLimitError(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("rate") ||
    lower.includes("too many") ||
    lower.includes("resource_exhausted") ||
    lower.includes("exceeded")
  );
}

export default function ConnectionStatus({ isConnecting, connectionError }: ConnectionStatusProps) {
  const isNameTaken = connectionError === "Name already taken";
  const isRoomLocked = connectionError === "Room is locked";
  const isRateLimit = connectionError ? isRateLimitError(connectionError) : false;
  
  const handleChooseDifferentName = () => {
    // Remove name param from URL to show the name form again
    const url = new URL(window.location.href);
    url.searchParams.delete("name");
    window.location.href = url.toString();
  };

  // Show skeleton loading UI
  if (isConnecting && !connectionError) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (connectionError) {
    // Determine error type for customized UI
    const getErrorDetails = () => {
      if (isNameTaken) {
        return {
          icon: (
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: "bg-error/20 border border-error/50",
          title: "Name Already Taken",
          message: "Someone in this room is already using that name. Please choose a different one.",
        };
      }
      if (isRoomLocked) {
        return {
          icon: <LockIcon className="w-8 h-8 text-warning" />,
          iconBg: "bg-warning/20 border border-warning/50",
          title: "Room is Locked",
          message: "This room is currently locked by the owner. New players cannot join at this time.",
        };
      }
      if (isRateLimit) {
        return {
          icon: (
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          iconBg: "bg-warning/20 border border-warning/50",
          title: "Too Many Requests",
          message: "Please wait a moment before trying again.",
        };
      }
      return {
        icon: (
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: "bg-error/20 border border-error/50",
        title: "Connection Failed",
        message: connectionError,
      };
    };

    const { icon, iconBg, title, message } = getErrorDetails();

    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative bg-transparent">
        <ThemeBackground sunPosition="left" />

        <div className="text-center max-w-md relative z-10">
          <Card variant="elevated" padding="lg">
            <div className={`w-16 h-16 mx-auto mb-4 ${iconBg} rounded-full flex items-center justify-center`}>
              {icon}
            </div>
            <h2 className="text-xl font-bold text-error mb-2">
              {title}
            </h2>
            <p className="text-muted mb-6">
              {message}
            </p>
            <div className="flex gap-3 justify-center">
              {isNameTaken ? (
                <Button onClick={handleChooseDifferentName} variant="primary">
                  Choose Different Name
                </Button>
              ) : isRoomLocked ? (
                <Button onClick={() => window.location.href = "/"} variant="primary">
                  Go Home
                </Button>
              ) : isRateLimit ? (
                <Button onClick={() => window.location.reload()} variant="primary">
                  Try Again
                </Button>
              ) : (
                <>
                  <Button onClick={() => window.location.reload()} variant="primary">
                    Retry
                  </Button>
                  <Button onClick={() => window.location.href = "/"} variant="secondary">
                    Go Home
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return null;
}
