import { execSync } from 'child_process';

/**
 * Global teardown for Playwright tests.
 * Cleans up any orphaned rooms left by tests.
 * 
 * Cleanup strategy:
 * 1. First pass: Delete rooms where all players are disconnected (immediate cleanup)
 * 2. Second pass: Delete rooms older than 5 minutes (fallback for stuck rooms)
 * 
 * Requires Firebase Admin credentials:
 * - Run `gcloud auth application-default login` before tests, OR
 * - Set GOOGLE_APPLICATION_CREDENTIALS to a service account key
 */
async function globalTeardown() {
  console.log('\n🧹 Cleaning up test rooms...');
  
  // Give Firebase a moment to process any remaining onDisconnect handlers
  // This helps catch rooms where cleanup was triggered but not yet completed
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // First pass: Delete rooms where all players disconnected
    // This catches rooms where goOffline() was called successfully
    console.log('Pass 1: Cleaning disconnected rooms...');
    const disconnectedResult = execSync('npm run cleanup:rooms -- --disconnected', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    
    const disconnectedDeleted = (disconnectedResult.match(/\[delete\]/g) || []).length;
    if (disconnectedDeleted > 0) {
      console.log(`  Deleted ${disconnectedDeleted} disconnected room(s)`);
    }
    
    // Second pass: Delete rooms older than 5 minutes
    // This catches rooms where onDisconnect didn't fire (abrupt browser close)
    console.log('Pass 2: Cleaning stale rooms (>5 min old)...');
    const staleResult = execSync('npm run cleanup:rooms -- --hours 0.083', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    
    const staleDeleted = (staleResult.match(/\[delete\]/g) || []).length;
    if (staleDeleted > 0) {
      console.log(`  Deleted ${staleDeleted} stale room(s)`);
    }
    
    // Print summary
    const totalDeleted = disconnectedDeleted + staleDeleted;
    if (totalDeleted > 0) {
      console.log(`✓ Total rooms cleaned: ${totalDeleted}`);
    } else {
      console.log('✓ No rooms to clean up');
    }
  } catch (error: unknown) {
    // Don't fail tests if cleanup fails - just log it
    if (error && typeof error === 'object' && 'killed' in error && error.killed) {
      console.warn('⚠️  Cleanup timed out (skipped)');
    } else if (error && typeof error === 'object' && 'stderr' in error) {
      const stderr = (error as { stderr?: string }).stderr;
      console.warn('⚠️  Cleanup failed:', stderr || 'Unknown error');
    } else {
      console.warn('⚠️  Cleanup skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

export default globalTeardown;
