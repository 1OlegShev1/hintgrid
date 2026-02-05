/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for production build (not in dev)
  ...(process.env.NODE_ENV === 'production' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
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
