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
    bg: "bg-yellow-900/40 border border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]",
    color: "text-yellow-400",
    Icon: WarningIcon,
  },
  danger: {
    bg: "bg-pink-900/40 border border-pink-500/50 shadow-[0_0_15px_rgba(255,51,102,0.3)]",
    color: "text-pink-400",
    Icon: DangerIcon,
  },
  info: {
    bg: "bg-cyan-900/40 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,212,255,0.3)]",
    color: "text-cyan-400",
    Icon: InfoIcon,
  },
  success: {
    bg: "bg-green-900/40 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]",
    color: "text-green-400",
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
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
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
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
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
          "relative bg-purple-900/90 backdrop-blur-sm border-2 border-purple-500/60 rounded-lg shadow-[0_0_30px_rgba(139,92,246,0.3)] p-6 w-full mx-4 animate-modal-in",
          sizeClasses[size],
          className
        )}
      >
        <div className="text-center">
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
              className="text-lg font-pixel text-cyan-400 mb-2 tracking-wide"
            >
              {title}
            </h3>
          )}

          {/* Content */}
          <div className="text-purple-300 font-retro">{children}</div>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <div className="mt-6 flex gap-3">
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
