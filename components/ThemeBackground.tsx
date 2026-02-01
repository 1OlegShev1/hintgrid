"use client";

import { useTheme } from "./ThemeProvider";

/**
 * ThemeBackground - Renders the appropriate background based on theme style.
 * 
 * For synthwave: Animated grid with sun and mountains
 * For classic: Simple gradient background
 * 
 * This component should be placed at the root of pages that need a themed background.
 */
export function ThemeBackground() {
  const { style } = useTheme();

  if (style === "synthwave") {
    return (
      <div className="synthwave-bg">
        <div className="synthwave-sun" />
        <div className="synthwave-grid" />
      </div>
    );
  }

  // Classic theme - no special background needed
  return null;
}

/**
 * Legacy synthwave background for backwards compatibility
 * @deprecated Use ThemeBackground instead
 */
export function SynthwaveBackground() {
  return (
    <div className="synthwave-bg">
      <div className="synthwave-sun" />
      <div className="synthwave-mountains" />
      <div className="synthwave-grid" />
    </div>
  );
}
