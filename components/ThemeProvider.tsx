"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Theme mode controls light/dark contrast
type ThemeMode = "light" | "dark" | "system";

// Theme style controls the aesthetic/color palette
type ThemeStyle = "classic" | "synthwave";

interface ThemeContextValue {
  // Mode (light/dark)
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  // Style (aesthetic)
  style: ThemeStyle;
  setStyle: (style: ThemeStyle) => void;
  // Legacy aliases for backwards compatibility
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const MODE_STORAGE_KEY = "hintgrid-theme";
const STYLE_STORAGE_KEY = "hintgrid-style";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("dark");
  const [style, setStyleState] = useState<ThemeStyle>("synthwave");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode | null;
    if (storedMode && ["light", "dark", "system"].includes(storedMode)) {
      setModeState(storedMode);
    }
    
    const storedStyle = localStorage.getItem(STYLE_STORAGE_KEY) as ThemeStyle | null;
    if (storedStyle && ["classic", "synthwave"].includes(storedStyle)) {
      setStyleState(storedStyle);
    }
    
    setMounted(true);
  }, []);

  // Update resolved mode and apply classes to document
  useEffect(() => {
    const updateTheme = () => {
      const resolved = mode === "system" ? getSystemTheme() : mode;
      setResolvedMode(resolved);

      // Apply classes to document
      const root = document.documentElement;
      
      // Mode classes (light/dark)
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      
      // Style classes (classic/synthwave)
      root.classList.remove("theme-classic", "theme-synthwave");
      root.classList.add(`theme-${style}`);
    };

    updateTheme();

    // Listen for system preference changes
    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => updateTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [mode, style]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  };

  const setStyle = (newStyle: ThemeStyle) => {
    setStyleState(newStyle);
    localStorage.setItem(STYLE_STORAGE_KEY, newStyle);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        mode, 
        resolvedMode, 
        setMode,
        style,
        setStyle,
        // Legacy aliases
        theme: mode,
        resolvedTheme: resolvedMode,
        setTheme: setMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export types for external use
export type { ThemeMode, ThemeStyle };
