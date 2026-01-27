import RoomClient from "./RoomClient";
import { ErrorBoundary, RoomErrorFallback } from "@/components/ErrorBoundary";

// Required for static export with optional catch-all routes
// For optional catch-all [[...code]], returning empty object generates /room/ base route
// Firebase Hosting rewrites handle serving this page for any /room/* URL
export async function generateStaticParams() {
  return [{ code: [] }];
}

export default function RoomPage() {
  return (
    <ErrorBoundary fallback={<RoomErrorFallback />}>
      <RoomClient />
    </ErrorBoundary>
  );
}
