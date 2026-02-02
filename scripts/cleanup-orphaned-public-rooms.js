#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * One-time cleanup script to remove orphaned publicRooms entries.
 * 
 * Orphaned entries exist when:
 * - A room in /publicRooms/{roomCode} exists
 * - But the corresponding /rooms/{roomCode} doesn't exist
 * 
 * This can happen if:
 * 1. onDisconnect deleted the room but not the public index
 * 2. Cleanup script deleted rooms before this fix was applied
 * 
 * Usage:
 *   npm run cleanup:orphaned-public-rooms
 *   npm run cleanup:orphaned-public-rooms -- --dry-run
 */

const fs = require("fs");
const path = require("path");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

function readDefaultProjectId() {
  try {
    const firebasercPath = path.join(process.cwd(), ".firebaserc");
    const raw = fs.readFileSync(firebasercPath, "utf8");
    const data = JSON.parse(raw);
    return data?.projects?.default || null;
  } catch {
    return null;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }
  return result;
}

async function main() {
  const { dryRun } = parseArgs();

  const projectId = process.env.FIREBASE_PROJECT_ID || readDefaultProjectId();
  if (!projectId) {
    console.error("No Firebase project id found. Set FIREBASE_PROJECT_ID or update .firebaserc.");
    process.exit(1);
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL || 
    `https://${projectId}-default-rtdb.europe-west1.firebasedatabase.app`;

  initializeApp({ credential: applicationDefault(), projectId, databaseURL });
  const db = getDatabase();

  console.log("Fetching publicRooms index...");
  const publicRoomsSnap = await db.ref("publicRooms").once("value");
  const publicRooms = publicRoomsSnap.val() || {};
  const publicRoomCodes = Object.keys(publicRooms);

  if (publicRoomCodes.length === 0) {
    console.log("No public rooms found. Nothing to clean up.");
    process.exit(0);
  }

  console.log(`Found ${publicRoomCodes.length} public room entries. Verifying...`);

  let orphaned = 0;
  let valid = 0;
  const orphanedCodes = [];

  // Check each public room to see if the actual room exists
  for (const roomCode of publicRoomCodes) {
    const roomSnap = await db.ref(`rooms/${roomCode}`).once("value");
    if (!roomSnap.exists()) {
      orphaned += 1;
      orphanedCodes.push(roomCode);
      console.log(`[orphaned] ${roomCode} - room doesn't exist`);
    } else {
      valid += 1;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total public rooms: ${publicRoomCodes.length}`);
  console.log(`Valid: ${valid}`);
  console.log(`Orphaned: ${orphaned}`);

  if (orphaned === 0) {
    console.log("\n✓ No orphaned entries found. Database is clean!");
    process.exit(0);
  }

  if (!dryRun) {
    console.log(`\nDeleting ${orphaned} orphaned entries...`);
    await Promise.all(
      orphanedCodes.map(code => db.ref(`publicRooms/${code}`).remove())
    );
    console.log(`✓ Deleted ${orphaned} orphaned entries`);
  } else {
    console.log(`\n(dry run - no actual deletes)`);
    console.log(`Run without --dry-run to delete these ${orphaned} orphaned entries`);
  }
  
  // Exit cleanly (Firebase keeps connection open otherwise)
  process.exit(0);
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
