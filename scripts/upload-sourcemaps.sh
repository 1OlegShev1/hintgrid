#!/usr/bin/env bash
# Upload source maps to Sentry after a production build, then delete them
# so they aren't included in the deployed hosting bundle.
#
# Required env vars:
#   SENTRY_AUTH_TOKEN  — Sentry API auth token
#   SENTRY_ORG        — Sentry organization slug  (default: hintgrid)
#   SENTRY_PROJECT    — Sentry project slug        (default: hintgrid-react)
#
# Usage:  ./scripts/upload-sourcemaps.sh

set -euo pipefail

# Load SENTRY_AUTH_TOKEN from .env.local if not already in environment
if [ -z "${SENTRY_AUTH_TOKEN:-}" ] && [ -f ".env.local" ]; then
  SENTRY_AUTH_TOKEN=$(grep '^SENTRY_AUTH_TOKEN=' .env.local | cut -d'=' -f2-)
  export SENTRY_AUTH_TOKEN
fi

ORG="${SENTRY_ORG:-oleg-shevchenko}"
PROJECT="${SENTRY_PROJECT:-hintgrid-frontend}"
VERSION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
OUT_DIR="out"

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "⚠  SENTRY_AUTH_TOKEN not set — skipping source map upload"
  exit 0
fi

if [ ! -d "$OUT_DIR" ]; then
  echo "❌ $OUT_DIR directory not found — run 'next build' first"
  exit 1
fi

echo "📤 Uploading source maps to Sentry (release: $VERSION)..."

npx sentry-cli sourcemaps upload \
  --org "$ORG" \
  --project "$PROJECT" \
  --release "$VERSION" \
  "$OUT_DIR"

echo "🧹 Removing source maps from $OUT_DIR..."
find "$OUT_DIR" -name '*.map' -delete

echo "✅ Source maps uploaded and cleaned up (release: $VERSION)"
