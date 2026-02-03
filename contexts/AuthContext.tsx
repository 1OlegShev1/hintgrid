"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, goOffline } from "@/lib/firebase";
import { signInAnonymous } from "@/lib/firebase-auth";

// Extend Window interface for test utilities
declare global {
  interface Window {
    __hintgrid_goOffline?: () => void;
  }
}

interface AuthContextValue {
  user: User | null;
  uid: string | null;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Guard against concurrent sign-in attempts
  const signingInRef = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase Auth not initialized");
      setIsLoading(false);
      return;
    }

    // Expose goOffline to window for E2E test cleanup
    // This allows tests to trigger a clean Firebase disconnect before closing browsers
    if (typeof window !== "undefined") {
      window.__hintgrid_goOffline = goOffline;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in
          signingInRef.current = false;
          setUser(firebaseUser);
          setIsLoading(false);
          setError(null);
        } else {
          // No user - sign in anonymously (but only once)
          if (signingInRef.current) {
            // Already signing in, skip
            return;
          }
          signingInRef.current = true;
          setIsLoading(true);
          const newUser = await signInAnonymous();
          if (newUser) {
            setUser(newUser);
            setError(null);
          } else {
            setError("Failed to sign in anonymously");
            signingInRef.current = false; // Allow retry on failure
          }
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Auth state error:", err);
        setError(err.message);
        setIsLoading(false);
        signingInRef.current = false;
      }
    );

    return () => {
      unsubscribe();
      // Clean up window property
      if (typeof window !== "undefined") {
        delete window.__hintgrid_goOffline;
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        uid: user?.uid ?? null,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Optional hook that returns undefined if not in an AuthProvider
export function useAuthOptional() {
  return useContext(AuthContext);
}
