"use client";

import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  // Base styles
  "w-full transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary focus:border-transparent",
        error:
          "border-2 border-error bg-surface-elevated text-foreground placeholder:text-muted focus:ring-2 focus:ring-error focus:border-error",
        ghost:
          "bg-transparent border-none focus:ring-0",
      },
      inputSize: {
        sm: "px-3 py-1.5 text-sm rounded-input",
        md: "px-4 py-2.5 text-base rounded-input",
        lg: "px-4 py-3 text-lg rounded-input",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  /** Error message to display below the input */
  error?: string;
  /** Label text above the input */
  label?: string;
  /** Helper text below the input */
  helperText?: string;
}

/**
 * Input component for text entry.
 * 
 * @example
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   error={errors.email}
 * />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      error,
      label,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            inputVariants({
              variant: hasError ? "error" : variant,
              inputSize,
              className,
            })
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// Textarea variant
const textareaVariants = cva(
  "w-full transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed resize-none",
  {
    variants: {
      variant: {
        default:
          "border border-border bg-surface-elevated text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary focus:border-transparent",
        error:
          "border-2 border-error bg-surface-elevated text-foreground placeholder:text-muted focus:ring-2 focus:ring-error focus:border-error",
      },
      inputSize: {
        sm: "px-3 py-1.5 text-sm rounded-input",
        md: "px-4 py-2.5 text-base rounded-input",
        lg: "px-4 py-3 text-lg rounded-input",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {
  /** Error message to display below the textarea */
  error?: string;
  /** Label text above the textarea */
  label?: string;
  /** Helper text below the textarea */
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      inputSize,
      error,
      label,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            textareaVariants({
              variant: hasError ? "error" : variant,
              inputSize,
              className,
            })
          )}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        {hasError && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-error flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { inputVariants, textareaVariants };
