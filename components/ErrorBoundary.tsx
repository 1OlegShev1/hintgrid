"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { captureException } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch JavaScript errors in child components.
 * Prevents entire app from crashing when a component throws.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    captureException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

/**
 * Default fallback UI when an error occurs.
 */
function DefaultErrorFallback({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        <p className="text-muted mb-6">
          An unexpected error occurred. Please try again.
        </p>
        {error && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-muted cursor-pointer hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 p-3 bg-surface rounded-lg text-xs text-foreground overflow-auto scrollbar-thin max-h-32">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={onRetry}>
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = "/"}
            variant="secondary"
          >
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}

/**
 * Room-specific error fallback with room context.
 */
export function RoomErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-error" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Room Error
        </h2>
        <p className="text-muted mb-6">
          Something went wrong with the game room. Please try rejoining or create a new room.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button
            onClick={() => window.location.href = "/"}
            variant="secondary"
          >
            Go Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
