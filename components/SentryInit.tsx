"use client";

import { useEffect } from "react";
import { initSentry } from "@/lib/sentry";
import { initAnalytics } from "@/lib/analytics";

/**
 * Client component that initializes monitoring (Sentry + Analytics) on mount.
 * Place at the top of the component tree (before providers).
 * Renders nothing -- just runs the init side effects.
 */
export function SentryInit() {
  useEffect(() => {
    initSentry();
    initAnalytics();
  }, []);

  return null;
}
