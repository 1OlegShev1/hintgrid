"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles applied to all buttons
  "inline-flex items-center justify-center font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary",
        secondary:
          "bg-surface-elevated border border-border text-foreground hover:bg-surface",
        danger:
          "bg-error text-error-foreground hover:opacity-90 focus-visible:ring-error",
        success:
          "bg-success text-success-foreground hover:opacity-90 focus-visible:ring-success",
        warning:
          "bg-warning text-warning-foreground hover:opacity-90 focus-visible:ring-warning",
        ghost:
          "text-foreground hover:bg-surface",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        // Team variants
        red:
          "bg-red-team text-white hover:opacity-90 focus-visible:ring-red-team",
        blue:
          "bg-blue-team text-white hover:opacity-90 focus-visible:ring-blue-team",
      },
      size: {
        sm: "px-3 py-1.5 text-sm rounded-button",
        md: "px-4 py-2 text-base rounded-button",
        lg: "px-6 py-3 text-lg rounded-button",
        icon: "p-2 rounded-button",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

// Spinner component for loading state
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner and disable button */
  isLoading?: boolean;
  /** Content to show while loading (defaults to spinner only) */
  loadingText?: string;
}

/**
 * Button component with multiple variants and sizes.
 * 
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="danger" isLoading>Deleting...</Button>
 * <Button variant="ghost" size="sm">Cancel</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className={loadingText ? "mr-2" : ""} />
            {loadingText}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
