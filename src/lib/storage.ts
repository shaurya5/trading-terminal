/**
 * Safely read and parse JSON from localStorage.
 * Returns the fallback value on any error (missing key, invalid JSON, SSR, etc.).
 */
export function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely read a raw string from localStorage.
 * Returns the fallback value on any error (missing key, SSR, etc.).
 */
export function safeGetString(key: string, fallback: string): string {
  try {
    if (typeof window === 'undefined') return fallback;
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely write a value to localStorage as JSON.
 * Silently swallows errors (quota exceeded, SSR, etc.).
 */
export function safeSetJSON(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail — quota exceeded, private browsing, etc.
  }
}
