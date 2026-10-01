// Fixed-window rate limiter kept in memory. Fine for a single API instance;
// with several instances behind a load balancer this would move to Redis.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Records one hit for `key`. Returns seconds to wait if the limit is exceeded, otherwise 0. */
export function hit(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > max ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
}

/** Seconds until `key` may try again, without recording a hit. */
export function blockedFor(key: string, max: number): number {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= Date.now() || bucket.count < max) return 0;
  return Math.ceil((bucket.resetAt - Date.now()) / 1000);
}

export function reset(key: string) {
  buckets.delete(key);
}

// Drop expired buckets so the map can't grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 60_000).unref();
