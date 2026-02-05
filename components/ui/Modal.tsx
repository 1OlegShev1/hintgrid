"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./Button";

// Icon components for modal headers
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SuccessIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DangerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

const iconConfig = {
  warning: {
    bg: "bg-warning/10 border border-warning/30",
    color: "text-warning",
    Icon: WarningIcon,
  },
  danger: {
    bg: "bg-error/10 border border-error/30",
    color: "text-error",
    Icon: DangerIcon,
  },
  info: {
    bg: "bg-info/10 border border-info/30",
    color: "text-info",
    Icon: InfoIcon,
  },
  success: {
    bg: "bg-success/10 border border-success/30",
    color: "text-success",
    Icon: SuccessIcon,
  },
} as const;

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
  "data-testid"?: string;
}

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close (backdrop click or escape key) */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Icon type to show above the title */
  icon?: keyof typeof iconConfig;
  /** Custom icon element (overrides icon prop) */
  customIcon?: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Action buttons at the bottom */
  actions?: ModalAction[];
  /** Additional class name for the modal container */
  className?: string;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Size of the modal */
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * Modal component for dialogs and confirmations.
 * 
 * @example
 * <Modal
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm Action"
 *   icon="warning"
 *   actions={[
 *     { label: "Cancel", onClick: handleCancel, variant: "secondary" },
 *     { label: "Confirm", onClick: handleConfirm, variant: "danger" },
 *   ]}
 * >
 *   Are you sure you want to proceed?
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  icon,
  customIcon,
  children,
  actions,
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  size = "sm",
}: ModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [open, handleEscape]);

  if (!open) return null;

  const iconData = icon ? iconConfig[icon] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative bg-surface-elevated border border-border rounded-lg shadow-xl p-6 w-full mx-4 animate-modal-in flex flex-col",
          sizeClasses[size],
          className
        )}
      >
        {/* Header - centered */}
        <div className="text-center shrink-0">
          {/* Icon */}
          {(customIcon || iconData) && (
            <div
              className={cn(
                "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4",
                iconData?.bg
              )}
            >
              {customIcon || (iconData && <iconData.Icon className={cn("w-6 h-6", iconData.color)} />)}
            </div>
          )}

          {/* Title */}
          {title && (
            <h3
              id="modal-title"
              className="text-lg font-semibold text-foreground mb-2"
            >
              {title}
            </h3>
          )}
        </div>

        {/* Content - scrollable */}
        <div className="text-muted overflow-y-auto scrollbar-thin min-h-0 my-4">
          {children}
        </div>

        {/* Actions - at bottom */}
        {actions && actions.length > 0 && (
          <div className="flex gap-3 shrink-0">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant ?? "secondary"}
                onClick={action.onClick}
                fullWidth
                data-testid={action["data-testid"]}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ConfirmModal - A pre-configured Modal for confirmation dialogs.
 */
export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  icon?: ModalProps["icon"];
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  icon = "warning",
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      actions={[
        { label: cancelLabel, onClick: onClose, variant: "secondary" },
        { label: confirmLabel, onClick: onConfirm, variant: confirmVariant },
      ]}
    >
      {message}
    </Modal>
  );
}
