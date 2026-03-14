/**
 * Shared client-side auth bootstrap helper.
 * Dedupe concurrent /api/auth/me calls and reuse a short-lived cache.
 */

interface MePayload {
  user: Record<string, unknown>;
}

let meCache: { data: MePayload; expiresAt: number } | null = null;
let meInFlight: Promise<MePayload> | null = null;

export async function fetchMeCached(ttlMs = 15_000): Promise<MePayload> {
  const now = Date.now();

  if (meCache && meCache.expiresAt > now) {
    return meCache.data;
  }

  if (meInFlight) {
    return meInFlight;
  }

  meInFlight = fetch("/api/auth/me", { cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch current user");
      }
      const data = (await res.json()) as MePayload;
      meCache = { data, expiresAt: Date.now() + ttlMs };
      return data;
    })
    .finally(() => {
      meInFlight = null;
    });

  return meInFlight;
}

export function clearMeCache() {
  meCache = null;
  meInFlight = null;
}
