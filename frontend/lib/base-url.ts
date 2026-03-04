/**
 * Returns the correct base URL for server-side API calls.
 * - Local dev:  http://localhost:3000
 * - Vercel:     https://[auto-detected from VERCEL_URL]
 * - Manual:     NEXT_PUBLIC_BASE_URL env var (overrides everything)
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
