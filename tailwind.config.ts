import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic background colors
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
        },
        border: "var(--color-border)",
        muted: "var(--color-muted)",
        
        // Brand colors
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        
        // Functional colors
        success: {
          DEFAULT: "var(--color-success)",
          foreground: "var(--color-success-foreground)",
        },
        warning: {
          DEFAULT: "var(--color-warning)",
          foreground: "var(--color-warning-foreground)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          foreground: "var(--color-error-foreground)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          foreground: "var(--color-info-foreground)",
        },
        
        // Team colors - Red
        "red-team": {
          DEFAULT: "var(--color-red-team)",
          muted: "var(--color-red-team-muted)",
          light: "var(--color-red-team-light)",
          text: "var(--color-red-team-text)",
        },
        
        // Team colors - Blue
        "blue-team": {
          DEFAULT: "var(--color-blue-team)",
          muted: "var(--color-blue-team-muted)",
          light: "var(--color-blue-team-light)",
          text: "var(--color-blue-team-text)",
        },
        
        // Game-specific colors
        "neutral-card": {
          DEFAULT: "var(--color-neutral-card)",
          text: "var(--color-neutral-card-text)",
        },
        trap: {
          DEFAULT: "var(--color-trap)",
          text: "var(--color-trap-text)",
        },
        
        // Interactive states
        highlight: {
          DEFAULT: "var(--color-highlight)",
          text: "var(--color-highlight-text)",
        },
      },
      
      // Semantic shadows for consistent elevation
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        elevated: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        modal: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        glow: "0 0 15px 2px",
      },
      
      // Consistent border radius scale
      borderRadius: {
        card: "1rem",
        button: "0.5rem",
        badge: "9999px",
        input: "0.5rem",
      },
      
      // Animation keyframes
      keyframes: {
        "badge-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "card-entrance": {
          "0%": { opacity: "0", transform: "scale(0.8) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": {
            boxShadow: "0 10px 15px -3px rgb(251 191 36 / 0.3), 0 4px 6px -4px rgb(251 191 36 / 0.2), 0 0 0 0 rgb(251 191 36 / 0.4)",
          },
          "50%": {
            boxShadow: "0 10px 15px -3px rgb(251 191 36 / 0.4), 0 4px 6px -4px rgb(251 191 36 / 0.3), 0 0 15px 2px rgb(251 191 36 / 0.3)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "zoom-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      
      // Animation utilities
      animation: {
        "badge-pop": "badge-pop 0.3s ease-out forwards",
        "card-entrance": "card-entrance 0.4s ease-out forwards",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "zoom-in": "zoom-in 0.2s ease-out",
        "modal-in": "fade-in 0.2s ease-out, zoom-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
