import { execSync } from 'child_process';

/**
 * Global teardown for Playwright tests.
 * Cleans up any orphaned rooms left by tests.
 */
async function globalTeardown() {
  console.log('\n🧹 Cleaning up test rooms...');
  
  try {
    // Run cleanup script to delete rooms where all players are disconnected
    const result = execSync('npm run cleanup:rooms -- --disconnected', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    // Extract summary from output
    const lines = result.split('\n');
    const summaryLines = lines.filter(l => 
      l.includes('Rooms scanned') || 
      l.includes('Deleted') || 
      l.includes('Kept') ||
      l.includes('[delete]')
    );
    
    if (summaryLines.length > 0) {
      console.log(summaryLines.join('\n'));
    }
  } catch (error) {
    // Don't fail tests if cleanup fails - just log it
    console.warn('⚠️  Room cleanup failed (this is non-fatal):', error);
  }
}

export default globalTeardown;
