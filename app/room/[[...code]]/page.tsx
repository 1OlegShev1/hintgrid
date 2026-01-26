import RoomClient from "./RoomClient";

// Allow dynamic params at runtime (Firebase Hosting rewrites handle /room/* URLs)
export const dynamicParams = true;

// Required for static export with optional catch-all routes
// For optional catch-all [[...code]], returning empty object generates /room/ base route
export async function generateStaticParams() {
  // Generate the base /room/ route (no code param)
  return [{ code: [] }];
}

export default function RoomPage() {
  return <RoomClient />;
}
