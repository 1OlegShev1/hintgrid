# Deployment & Architecture Notes

This document captures critical architectural decisions and troubleshooting notes regarding the deployment pipeline, specifically for Next.js Static Export on Firebase Hosting.

## Room Routing Architecture

### The Stack
- **Framework**: Next.js (App Router)
- **Build Mode**: Static Export (`output: 'export'` in `next.config.js`)
- **Hosting**: Firebase Hosting
- **Dynamic Route**: `app/room/[[...code]]/page.tsx` (Catch-all route)

### The Challenge
We use **Static Export** to deploy purely static assets (HTML/CSS/JS) to Firebase Hosting, avoiding the need for a Node.js server or Cloud Functions for SSR. However, we also have a dynamic route: `/room/[roomCode]`.

In a static export, Next.js cannot generate a page for every possible room code. Instead, it generates a single generic file: `out/room.html`.

### The Configuration (firebase.json)
We configure Firebase to rewrite all room requests to this single static file:

```json
"rewrites": [
  {
    "source": "/room/**",
    "destination": "/room.html"
  }
]
```

### The "Hydration Mismatch" Issue
When a user visits `/room/ABCD`:
1. **Firebase** serves `room.html`.
2. **Next.js** loads the page. Since `room.html` was generated at build time (without any parameters), the initial hydration often reports **empty parameters** via `useParams()`.
3. The Router *should* eventually sync and detect the URL change, but this can be flaky or delayed on the initial load, leading to a "blank" room state or 404 behavior within the app.

### The Solution (Manual URL Parsing)
To guarantee 100% reliability, we explicitly implement a fallback in `app/room/[[...code]]/RoomClient.tsx`.

We do **not** rely solely on the framework's `useParams()` hook. Instead, we check the actual browser URL if the router parameters are missing.

```typescript
// app/room/[[...code]]/RoomClient.tsx

const params = useParams();
const pathname = usePathname();

// CRITICAL: Fallback to manual URL parsing
// useParams() often returns empty in Static Export + Firebase Rewrite scenarios
const roomCode = params.code?.[0] || pathname.replace(/^\/room\/?/, "").split("/")[0] || "";
```

**Why this is necessary**: This ensures that even if the framework hydration is out of sync with the browser URL (common in SSG + client-side routing), the application effectively "forces" the correct state based on the source of truth (the address bar).
