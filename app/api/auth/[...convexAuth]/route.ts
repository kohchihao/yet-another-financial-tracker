// Auth is handled by convexAuthNextjsMiddleware in middleware.ts,
// which proxies /api/auth/* requests to the Convex HTTP router.
// This file exists to prevent Next.js from treating /api/auth as unhandled.
export function GET() {
  return new Response("Auth handled by middleware", { status: 200 });
}
