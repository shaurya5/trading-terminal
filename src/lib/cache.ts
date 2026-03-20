// Hybrid cache: Upstash Redis (shared across serverless) → in-memory fallback
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable Redis.

const localCache = new Map<string, { data: unknown; expires: number }>();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? '';
const USE_REDIS = UPSTASH_URL.length > 0 && UPSTASH_TOKEN.length > 0;

async function redisGet(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
  } catch {
    // Redis write failed — data is still in local cache
  }
}

// Synchronous local-cache-only get (fast path for warm serverless functions)
export function getCached<T>(key: string): T | null {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    localCache.delete(key);
    return null;
  }
  return entry.data as T;
}

// Async get that checks Redis if local cache misses
export async function getCachedAsync<T>(key: string): Promise<T | null> {
  // Check local first
  const local = getCached<T>(key);
  if (local !== null) return local;

  // Check Redis
  if (USE_REDIS) {
    const raw = await redisGet(key);
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as T;
        // Warm local cache with remaining TTL estimate (use 30s as conservative fallback)
        localCache.set(key, { data: parsed, expires: Date.now() + 30_000 });
        return parsed;
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function setCache(key: string, data: unknown, ttlMs: number): void {
  // Always set local cache
  localCache.set(key, { data, expires: Date.now() + ttlMs });

  // Also set Redis if configured (fire-and-forget)
  if (USE_REDIS) {
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    redisSet(key, JSON.stringify(data), ttlSeconds).catch(() => {});
  }
}
