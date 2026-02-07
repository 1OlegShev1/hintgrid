import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getDatabase as getDatabaseSdk, Database, connectDatabaseEmulator, goOffline as firebaseGoOffline, goOnline as firebaseGoOnline } from "firebase/database";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;

// Test mode support - allows injecting database for testing
let testDb: Database | undefined;
let isTestMode = false;

/**
 * Enable test mode and inject a test database instance.
 * Used by integration tests to bypass browser-only checks.
 */
export function enableTestMode(db: Database): void {
  isTestMode = true;
  testDb = db;
}

/**
 * Disable test mode and clear test database.
 */
export function disableTestMode(): void {
  isTestMode = false;
  testDb = undefined;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseApp(): FirebaseApp | undefined {
  if (typeof window === "undefined") return undefined;
  
  if (!app && firebaseConfig.apiKey) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
  }
  
  return app;
}

export function getFirebaseAuth(): Auth | undefined {
  if (typeof window === "undefined") return undefined;
  
  if (!auth) {
    const app = getFirebaseApp();
    if (app) {
      auth = getAuth(app);
      
      // Connect to emulator in development if configured
      if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST) {
        connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
      }
    }
  }
  
  return auth;
}

export function getDatabase(): Database | undefined {
  // In test mode, return the injected test database
  if (isTestMode && testDb) {
    return testDb;
  }
  
  if (typeof window === "undefined") return undefined;
  
  if (!rtdb) {
    const app = getFirebaseApp();
    if (app) {
      rtdb = getDatabaseSdk(app);
      
      // Connect to emulator in development if configured
      if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST) {
        const [host, port] = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST.split(":");
        connectDatabaseEmulator(rtdb, host, Number(port || 9000));
      }
    }
  }
  
  return rtdb;
}

/**
 * Disconnect from Firebase Database.
 * Triggers onDisconnect handlers immediately (clean disconnect).
 */
export function goOffline(): void {
  const db = getDatabase();
  if (db) {
    firebaseGoOffline(db);
  }
}

/**
 * Reconnect to Firebase Database.
 * Call this after goOffline() to restore connection.
 */
export function goOnline(): void {
  const db = getDatabase();
  if (db) {
    firebaseGoOnline(db);
  }
}
