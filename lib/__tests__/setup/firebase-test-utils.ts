/**
 * Firebase test utilities for integration tests with emulator.
 * These tests require the Firebase emulator to be running.
 * Run: firebase emulators:start
 */

import { initializeApp, getApps, deleteApp, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, Auth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref, remove, Database, connectDatabaseEmulator } from "firebase/database";

let testApp: FirebaseApp | undefined;
let testAuth: Auth | undefined;
let testDb: Database | undefined;
const userApps: FirebaseApp[] = []; // Track user apps for cleanup

const TEST_PROJECT_ID = "test-hintgrid";

/**
 * Initialize Firebase with emulator for testing.
 * Should be called in beforeAll or beforeEach.
 */
export async function initializeTestFirebase(): Promise<{ app: FirebaseApp; auth: Auth; db: Database }> {
  // Clean up any existing apps
  const existingApps = getApps();
  await Promise.all(existingApps.map((app) => deleteApp(app)));

  // Initialize test app
  testApp = initializeApp({
    apiKey: "fake-api-key",
    authDomain: "localhost",
    databaseURL: `http://localhost:9000?ns=${TEST_PROJECT_ID}`,
    projectId: TEST_PROJECT_ID,
    storageBucket: `${TEST_PROJECT_ID}.appspot.com`,
    messagingSenderId: "123456789",
    appId: "test-app-id",
  });

  // Get auth and connect to emulator
  testAuth = getAuth(testApp);
  connectAuthEmulator(testAuth, "http://localhost:9099", { disableWarnings: true });

  // Get database and connect to emulator
  testDb = getDatabase(testApp);
  connectDatabaseEmulator(testDb, "localhost", 9000);

  return { app: testApp, auth: testAuth, db: testDb };
}

/**
 * Create a test user with anonymous auth.
 * Each user gets their own app/auth instance to ensure unique UIDs.
 * Returns the user ID and auth instance.
 */
export async function createTestUser(): Promise<{ uid: string; auth: Auth }> {
  // Create a unique app instance for this user
  const userApp = initializeApp({
    apiKey: "fake-api-key",
    authDomain: "localhost",
    databaseURL: `http://localhost:9000?ns=${TEST_PROJECT_ID}`,
    projectId: TEST_PROJECT_ID,
    storageBucket: `${TEST_PROJECT_ID}.appspot.com`,
    messagingSenderId: "123456789",
    appId: `test-app-id-${Math.random()}`,
  }, `user-${Date.now()}-${Math.random()}`); // Unique app name

  userApps.push(userApp); // Track for cleanup

  const userAuth = getAuth(userApp);
  connectAuthEmulator(userAuth, "http://localhost:9099", { disableWarnings: true });

  const userCredential = await signInAnonymously(userAuth);
  return { uid: userCredential.user.uid, auth: userAuth };
}

/**
 * Clean up all data in the test database.
 * Should be called in afterEach or afterAll.
 */
export async function cleanupTestData(db?: Database): Promise<void> {
  const database = db || testDb;
  if (!database) {
    throw new Error("Firebase Database not initialized. Call initializeTestFirebase() first.");
  }

  // Remove all rooms data
  await remove(ref(database, "rooms"));
  await remove(ref(database, "publicRooms"));
}

/**
 * Cleanup Firebase app and all user apps.
 * Should be called in afterAll.
 */
export async function cleanupTestFirebase(): Promise<void> {
  // Clean up all user apps created during tests
  await Promise.all(userApps.map((app) => deleteApp(app).catch(() => {})));
  userApps.length = 0;

  if (testApp) {
    await deleteApp(testApp);
    testApp = undefined;
    testAuth = undefined;
    testDb = undefined;
  }
}

/**
 * Get the test database instance.
 * Throws if not initialized.
 */
export function getTestDb(): Database {
  if (!testDb) {
    throw new Error("Firebase Database not initialized. Call initializeTestFirebase() first.");
  }
  return testDb;
}

/**
 * Get the test auth instance.
 * Throws if not initialized.
 */
export function getTestAuth(): Auth {
  if (!testAuth) {
    throw new Error("Firebase Auth not initialized. Call initializeTestFirebase() first.");
  }
  return testAuth;
}

/**
 * Wait for a condition to be true.
 * Useful for waiting on async Firebase operations.
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate a random room code for testing.
 */
export function generateTestRoomCode(): string {
  return `TEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
