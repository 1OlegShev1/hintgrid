/**
 * lint-staged configuration
 * 
 * Using function syntax to prevent file paths from being appended to commands.
 * TypeScript needs full project context (tsconfig.json) for path aliases to work,
 * so we run typecheck on the whole project, not individual files.
 */
module.exports = {
  '*.{ts,tsx}': () => ['npm run typecheck', 'npm run test:run'],
};
