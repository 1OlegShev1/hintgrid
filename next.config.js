const { execSync } = require('child_process');

// Inject git short hash as the Sentry release so source maps match.
// Falls back to 'unknown' if not in a git repo (e.g. CI without .git).
const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'unknown'; }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production build (not in dev)
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  // Generate source maps for production builds so Sentry can show
  // readable stack traces. The maps are uploaded to Sentry during deploy
  // and deleted from the output before hosting deployment.
  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: gitHash,
  },
  // Help Turbopack resolve bare `@import "tailwindcss"` in CSS without
  // walking up past the project root (avoids noisy resolution errors).
  turbopack: {
    resolveAlias: {
      tailwindcss: require.resolve('tailwindcss/index.css'),
    },
  },
}

module.exports = nextConfig
