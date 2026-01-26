#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Delete rooms older than X hours.
 * Usage: npm run cleanup:rooms -- --hours 24 [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

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
  const result = { hours: 24, dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--hours" && args[i + 1]) {
      result.hours = Number(args[i + 1]);
      i += 1;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
  }
  return result;
}

async function deleteRoom(db, roomRef) {
  if (typeof db.recursiveDelete === "function") {
    await db.recursiveDelete(roomRef);
    return;
  }

  const [playersSnap, messagesSnap] = await Promise.all([
    roomRef.collection("players").get(),
    roomRef.collection("messages").get(),
  ]);

  await Promise.all([
    ...playersSnap.docs.map((doc) => doc.ref.delete()),
    ...messagesSnap.docs.map((doc) => doc.ref.delete()),
  ]);

  await roomRef.delete();
}

async function main() {
  const { hours, dryRun } = parseArgs();
  if (!Number.isFinite(hours) || hours <= 0) {
    console.error("Invalid --hours value. Example: --hours 24");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || readDefaultProjectId();
  if (!projectId) {
    console.error("No Firebase project id found. Set FIREBASE_PROJECT_ID or update .firebaserc.");
    process.exit(1);
  }

  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();

  const cutoffMs = Date.now() - hours * 60 * 60 * 1000;
  const roomsSnap = await db.collection("rooms").get();

  let deleted = 0;
  let kept = 0;

  for (const room of roomsSnap.docs) {
    const data = room.data();
    const createdAt = data.createdAt?.toMillis?.();

    if (!createdAt) {
      // No createdAt = legacy room, delete it
      if (!dryRun) await deleteRoom(db, room.ref);
      deleted += 1;
      console.log(`[delete] ${room.id} (no createdAt)`);
      continue;
    }

    if (createdAt < cutoffMs) {
      if (!dryRun) await deleteRoom(db, room.ref);
      deleted += 1;
      console.log(`[delete] ${room.id} (created ${Math.round((Date.now() - createdAt) / 3600000)}h ago)`);
    } else {
      kept += 1;
      console.log(`[keep] ${room.id} (created ${Math.round((Date.now() - createdAt) / 60000)}m ago)`);
    }
  }

  console.log(`\nRooms scanned: ${roomsSnap.size}`);
  console.log(`Deleted: ${deleted}`);
  console.log(`Kept: ${kept}`);
  if (dryRun) console.log("(dry run - no actual deletes)");
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
