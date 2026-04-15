/**
 * Centralized CORS helper for Edge Functions.
 * Replaces `Access-Control-Allow-Origin: *` with explicit allowlist.
 *
 * @module corsHelper
 * @covers SEC-18, SEC-19, SEC-20
 */

/** Explicit list of allowed origins for CORS. */
export const ALLOWED_ORIGINS: string[] = [
  "https://wfe-evolution.vercel.app",
  "https://www.wfe-evolution.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

/**
 * Returns CORS headers if the request origin is in the allowlist.
 * If the origin is not allowed, returns minimal headers (no Access-Control-Allow-Origin).
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") || "";

  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    };
  }

  // Origin not allowed — return empty CORS headers
  return {};
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * Returns a proper response with CORS headers if origin is allowed,
 * or a rejection (no CORS headers) if origin is unknown.
 */
export function handlePreflight(req: Request): Response {
  const headers = getCorsHeaders(req);
  const hasOrigin = "Access-Control-Allow-Origin" in headers;

  if (hasOrigin) {
    return new Response(null, { status: 204, headers });
  }

  // Reject preflight from unknown origins
  return new Response(null, { status: 204 });
}
