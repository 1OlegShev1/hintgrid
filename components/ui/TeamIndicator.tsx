"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Team } from "@/shared/types";

/**
 * TeamIndicator provides consistent team-colored styling throughout the app.
 * It encapsulates all team color logic in one place, making it easy to:
 * - Maintain consistency across the app
 * - Update team colors globally
 * - Support theming (different color palettes)
 */

const teamIndicatorVariants = cva("", {
  variants: {
    team: {
      red: "",
      blue: "",
    },
    variant: {
      // Solid background badge
      badge: "",
      // Light background card/container
      card: "border-2 rounded-card",
      // Border only
      border: "border-2 rounded-card",
      // Text color only
      text: "",
      // Glow effect for active turn
      glow: "shadow-lg rounded-card",
      // Banner/header style
      banner: "text-white",
      // Pill badge
      pill: "rounded-badge px-3 py-1 text-white font-semibold",
    },
  },
  compoundVariants: [
    // Badge variants
    { team: "red", variant: "badge", className: "bg-red-team text-white" },
    { team: "blue", variant: "badge", className: "bg-blue-team text-white" },

    // Card variants (subtle background)
    { team: "red", variant: "card", className: "bg-red-team-light border-red-team-muted" },
    { team: "blue", variant: "card", className: "bg-blue-team-light border-blue-team-muted" },

    // Border only
    { team: "red", variant: "border", className: "border-red-team" },
    { team: "blue", variant: "border", className: "border-blue-team" },

    // Text color
    { team: "red", variant: "text", className: "text-red-team" },
    { team: "blue", variant: "text", className: "text-blue-team" },

    // Glow effect for active turn
    { team: "red", variant: "glow", className: "shadow-red-team/30 ring-2 ring-red-team/50" },
    { team: "blue", variant: "glow", className: "shadow-blue-team/30 ring-2 ring-blue-team/50" },

    // Banner style (for turn indicators)
    { team: "red", variant: "banner", className: "bg-red-team" },
    { team: "blue", variant: "banner", className: "bg-blue-team" },

    // Pill badge
    { team: "red", variant: "pill", className: "bg-red-team" },
    { team: "blue", variant: "pill", className: "bg-blue-team" },
  ],
  defaultVariants: {
    variant: "text",
  },
});

export interface TeamIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color">,
    Omit<VariantProps<typeof teamIndicatorVariants>, "team"> {
  /** The team color to apply */
  team: Team | "red" | "blue";
  /** HTML element to render as */
  as?: "div" | "span" | "section" | "header" | "footer";
}

/**
 * TeamIndicator component for consistent team-colored elements.
 * 
 * @example
 * // Text colored by team
 * <TeamIndicator team="red" variant="text">Red Team</TeamIndicator>
 * 
 * // Card with team background
 * <TeamIndicator team={currentTeam} variant="card" className="p-4">
 *   <h3>Team Content</h3>
 * </TeamIndicator>
 * 
 * // Glow effect for active turn
 * <TeamIndicator team={gameState.currentTeam} variant="glow">
 *   <GameBoard />
 * </TeamIndicator>
 */
export function TeamIndicator({
  team,
  variant,
  className,
  as: Component = "div",
  children,
  ...props
}: TeamIndicatorProps) {
  // Handle neutral team (trap card) - no styling
  if (team !== "red" && team !== "blue") {
    return (
      <Component className={className} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={cn(teamIndicatorVariants({ team, variant, className }))}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Helper hook to get team-specific class names without rendering a component.
 * Useful when you need team colors but can't use the TeamIndicator component.
 */
export function getTeamClasses(
  team: Team | "red" | "blue" | null | undefined,
  variant: VariantProps<typeof teamIndicatorVariants>["variant"]
): string {
  if (!team || (team !== "red" && team !== "blue")) {
    return "";
  }
  return teamIndicatorVariants({ team, variant });
}

/**
 * Get the appropriate team text color class.
 */
export function getTeamTextClass(team: Team | "red" | "blue" | null | undefined): string {
  if (team === "red") return "text-red-team";
  if (team === "blue") return "text-blue-team";
  return "";
}

/**
 * Get the appropriate team background class.
 */
export function getTeamBgClass(team: Team | "red" | "blue" | null | undefined): string {
  if (team === "red") return "bg-red-team";
  if (team === "blue") return "bg-blue-team";
  return "";
}

/**
 * Get the appropriate team light background class.
 */
export function getTeamLightBgClass(team: Team | "red" | "blue" | null | undefined): string {
  if (team === "red") return "bg-red-team-light";
  if (team === "blue") return "bg-blue-team-light";
  return "";
}

/**
 * Get the appropriate team border class.
 */
export function getTeamBorderClass(team: Team | "red" | "blue" | null | undefined): string {
  if (team === "red") return "border-red-team";
  if (team === "blue") return "border-blue-team";
  return "";
}

/**
 * Get the appropriate team ring class (for focus/highlight).
 */
export function getTeamRingClass(team: Team | "red" | "blue" | null | undefined): string {
  if (team === "red") return "ring-red-team";
  if (team === "blue") return "ring-blue-team";
  return "";
}

export { teamIndicatorVariants };
