"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ErrorToast {
  id: string;
  message: string;
  timestamp: number;
}

interface ErrorContextValue {
  errors: ErrorToast[];
  showError: (message: string) => void;
  dismissError: (id: string) => void;
  clearAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorToast[]>([]);

  const showError = useCallback((message: string) => {
    const id = Math.random().toString(36).slice(2);
    const newError: ErrorToast = {
      id,
      message,
      timestamp: Date.now(),
    };

    setErrors((prev) => [...prev, newError]);

    // Auto-dismiss after timeout
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, showError, dismissError, clearAllErrors }}>
      {children}
      <ErrorToastContainer errors={errors} onDismiss={dismissError} />
    </ErrorContext.Provider>
  );
}

// Toast container component
function ErrorToastContainer({
  errors,
  onDismiss,
}: {
  errors: ErrorToast[];
  onDismiss: (id: string) => void;
}) {
  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {errors.map((error) => (
        <div
          key={error.id}
          className="bg-error text-error-foreground px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-in slide-in-from-right fade-in duration-200"
          role="alert"
        >
          <svg
            className="w-5 h-5 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 text-sm font-medium">{error.message}</div>
          <button
            onClick={() => onDismiss(error.id)}
            className="shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}

// Optional hook that returns undefined if not in an ErrorProvider
export function useErrorOptional() {
  return useContext(ErrorContext);
}
