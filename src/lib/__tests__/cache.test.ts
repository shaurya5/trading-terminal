import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCached, setCache } from '@/lib/cache';

// Each test needs a unique key to avoid cross-test pollution since
// the cache module is shared across the test file.
let keyCounter = 0;
function uniqueKey(prefix: string) {
  return `${prefix}:${++keyCounter}:${Date.now()}`;
}

describe('cache', () => {
  it('getCached returns stored data after setCache', () => {
    const key = uniqueKey('store');
    setCache(key, { foo: 'bar' }, 10000);
    const result = getCached<{ foo: string }>(key);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('getCached returns null for non-existent key', () => {
    const result = getCached('does-not-exist-ever');
    expect(result).toBeNull();
  });

  it('cache expires after TTL', async () => {
    const key = uniqueKey('expire');
    setCache(key, 'hello', 100);

    // Should be there immediately
    expect(getCached(key)).toBe('hello');

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 150));

    expect(getCached(key)).toBeNull();
  });

  it('setCache overwrites previous value', () => {
    const key = uniqueKey('overwrite');
    setCache(key, 'first', 10000);
    expect(getCached(key)).toBe('first');

    setCache(key, 'second', 10000);
    expect(getCached(key)).toBe('second');
  });

  it('stores and retrieves arrays', () => {
    const key = uniqueKey('array');
    const data = [1, 2, 3, 4, 5];
    setCache(key, data, 10000);
    expect(getCached<number[]>(key)).toEqual([1, 2, 3, 4, 5]);
  });

  it('stores and retrieves null values', () => {
    const key = uniqueKey('null');
    setCache(key, null, 10000);
    // getCached returns null for missing/expired, but the stored value is also null.
    // The implementation stores `data: null` which is returned as T (null).
    expect(getCached(key)).toBeNull();
  });
});
