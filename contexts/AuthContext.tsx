"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { signInAnonymous } from "@/lib/firebase-auth";

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

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase Auth not initialized");
      setIsLoading(false);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          // User is signed in
          setUser(firebaseUser);
          setIsLoading(false);
          setError(null);
        } else {
          // No user, sign in anonymously
          setIsLoading(true);
          const newUser = await signInAnonymous();
          if (newUser) {
            setUser(newUser);
            setError(null);
          } else {
            setError("Failed to sign in anonymously");
          }
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Auth state error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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
