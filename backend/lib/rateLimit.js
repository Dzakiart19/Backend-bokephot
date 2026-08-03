// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// Tidak perlu package eksternal. Bekerja per-IP, per-window.
// Cukup untuk satu proses Node.js (Replit single-process).

const store = new Map(); // key: ip → { count, windowStart }

/**
 * createRateLimit({ windowMs, max, message })
 * @param {number} windowMs  - ukuran window (ms), default 60 detik
 * @param {number} max       - max request per window per IP
 * @param {string} message   - pesan error saat limit tercapai
 */
function createRateLimit({ windowMs = 60_000, max = 60, message = 'Terlalu banyak permintaan. Coba lagi nanti.' } = {}) {
  // Bersihkan entry lama setiap 1 window agar tidak memory leak
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store) {
      if (now - entry.windowStart > windowMs * 2) store.delete(ip);
    }
  }, windowMs);
  if (cleanup.unref) cleanup.unref(); // jangan tahan proses Node

  return function rateLimitMiddleware(req, res, next) {
    // Ambil IP asli (support Replit/proxy X-Forwarded-For)
    const ip = (
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.ip ||
      'unknown'
    );

    const now   = Date.now();
    let entry   = store.get(ip);

    if (!entry || now - entry.windowStart > windowMs) {
      entry = { count: 1, windowStart: now };
    } else {
      entry.count++;
    }
    store.set(ip, entry);

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: message });
    }
    next();
  };
}

module.exports = { createRateLimit };
