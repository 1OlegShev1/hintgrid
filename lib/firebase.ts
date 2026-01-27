import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { getDatabase as getDatabaseSdk, Database, connectDatabaseEmulator } from "firebase/database";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
