import { signInAnonymously, User, AuthError } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

let signInAttempts = 0;

export async function signInAnonymous(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.warn("Firebase Auth not initialized. Check environment variables.");
    return null;
  }

  signInAttempts++;
  console.log(`[Auth] signInAnonymously attempt #${signInAttempts}`);

  try {
    const userCredential = await signInAnonymously(auth);
    console.log(`[Auth] signInAnonymously succeeded, uid: ${userCredential.user.uid}`);
    return userCredential.user;
  } catch (error) {
    const authError = error as AuthError;
    console.error(`[Auth] signInAnonymously failed (attempt #${signInAttempts}):`, authError.code, authError.message);
    return null;
  }
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  return auth.currentUser;
}
