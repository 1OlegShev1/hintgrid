"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base styles
  "inline-flex items-center justify-center font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground border border-border",
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-muted/20 text-muted",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-error/10 text-error",
        info: "bg-info/10 text-info",
        // Status variants for game states
        waiting: "bg-success/10 text-success",
        playing: "bg-info/10 text-info",
        paused: "bg-warning/10 text-warning",
        // Team variants
        red: "bg-red-team text-white",
        blue: "bg-blue-team text-white",
        "red-light": "bg-red-team-light text-red-team-text",
        "blue-light": "bg-blue-team-light text-blue-team-text",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs rounded",
        md: "px-2 py-0.5 text-xs rounded-md",
        lg: "px-2.5 py-1 text-sm rounded-md",
        pill: "px-2 py-0.5 text-xs rounded-badge",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component for labels and status indicators.
 * 
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="waiting" size="pill">Waiting</Badge>
 * <Badge variant="red">Red Team</Badge>
 */
export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

/**
 * Animated badge that pops in (for vote counts, etc.)
 */
export interface AnimatedBadgeProps extends BadgeProps {
  /** Whether to animate the badge */
  animate?: boolean;
}

export function AnimatedBadge({
  animate = false,
  className,
  ...props
}: AnimatedBadgeProps) {
  return (
    <Badge
      className={cn(animate && "animate-badge-pop", className)}
      {...props}
    />
  );
}

export { badgeVariants };
