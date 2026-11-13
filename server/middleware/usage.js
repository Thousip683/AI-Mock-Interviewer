// One-process quota, matching the live-session deployment requirement.
export function createUsageLimit({ limit = 60, windowMs = 3600000, now = Date.now } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.until <= time) buckets.delete(key);
    const key = req.userId;
    if (!key) return res.status(401).json({ error: 'Authentication required' });
    const bucket = buckets.get(key) || { count: 0, until: time + windowMs };
    if (bucket.count >= limit) {
      res.set('Retry-After', String(Math.ceil((bucket.until - time) / 1000)));
      return res.status(429).json({ error: 'Hourly AI request limit reached. Your work is saved; try again later.' });
    }
    bucket.count++; buckets.set(key, bucket); next();
  };
}
export const aiUsage = createUsageLimit();
