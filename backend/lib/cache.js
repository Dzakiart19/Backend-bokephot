// ── In-memory cache ───────────────────────────────────────────────────────────
const cache  = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 menit
const MAX    = 300;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size >= MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

module.exports = { getCached, setCache };
