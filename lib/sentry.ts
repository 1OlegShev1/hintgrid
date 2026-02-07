import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Initialize Sentry error tracking.
 * Safe to call multiple times -- only initializes once.
 * Does nothing if DSN is not configured or running on server.
 */
export function initSentry(): void {
  if (initialized || typeof window === "undefined") return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Sentry] No DSN configured, skipping initialization");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Release tag must match the version used during source map upload
    // so Sentry can map minified stack frames to original source.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,

    // Adjust sample rate in production to stay within free tier limits.
    // 1.0 = capture 100% of errors (fine for low-traffic apps).
    sampleRate: 1.0,

    // Only send errors, not performance traces (keeps it simple for now).
    tracesSampleRate: 0,

    // Filter out noisy/unhelpful errors that aren't real bugs
    beforeSend(event, hint) {
      const errorValue = event.exception?.values?.[0]?.value ?? "";
      const errorType = event.exception?.values?.[0]?.type ?? "";

      // Browser noise — not actionable
      if (errorValue.includes("ResizeObserver")) return null;

      // Next.js chunk load failures (user on stale tab after deploy)
      if (errorType === "ChunkLoadError" || errorValue.includes("Loading chunk")) return null;

      // Network errors — transient, user's connection dropped
      if (errorValue.includes("Failed to fetch") || errorValue.includes("NetworkError")) return null;
      if (errorValue.includes("Load failed")) return null; // Safari variant

      // Firebase permission denied — usually a race during disconnect/reconnect
      if (errorValue.includes("PERMISSION_DENIED")) return null;

      // Firebase client-side disconnection noise
      if (errorValue.includes("client is offline") || errorValue.includes("Client is offline")) return null;

      // Browser extensions injecting errors (identifiable by non-app stack frames)
      const frames = event.exception?.values?.[0]?.stacktrace?.frames;
      if (frames?.length && frames.every((f) => !f.filename?.includes(location?.hostname ?? ""))) return null;

      // AbortError — common with cancelled fetches during navigation
      if (errorType === "AbortError" || errorValue.includes("signal is aborted")) return null;

      return event;
    },

    // Ignore common non-error promise rejections by message pattern
    ignoreErrors: [
      // Browser autoplay policy (we handle this gracefully already)
      "play() failed",
      "The play method is not allowed",
      // Safari-specific noise
      "cancelled",
      // Generic non-errors
      "Non-Error promise rejection captured",
    ],

    // Don't send PII by default
    sendDefaultPii: false,
  });

  initialized = true;
}

/**
 * Capture an exception in Sentry with optional context.
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) {
    console.error("[Sentry not initialized]", error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context for Sentry (call after auth).
 * Only sets the anonymous user ID -- no PII.
 */
export function setUser(userId: string | null): void {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/**
 * Set the current room code as context for error reports.
 */
export function setRoomContext(roomCode: string | null): void {
  if (!initialized) return;
  if (roomCode) {
    Sentry.setTag("room_code", roomCode);
  } else {
    Sentry.setTag("room_code", undefined);
  }
}

/**
 * Log a breadcrumb (helps trace what happened before an error).
 */
export function addBreadcrumb(
  message: string,
  category: string = "app",
  data?: Record<string, unknown>
): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}
