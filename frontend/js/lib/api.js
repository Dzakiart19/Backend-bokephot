// ── API wrappers — semua fetch ke backend ─────────────────────────────────────
// window.BACKEND_URL di-set oleh /config.js:
//   '' (relative) saat di Replit dev/preview
//   'https://xxx.replit.app' saat frontend di Firebase production
const BASE = (window.BACKEND_URL || '') + '/api/bh';

async function get(url, ms = 20_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

export const fetchCategories  = ()             => get(`${BASE}/categories`);
export const fetchVideos      = (page)         => get(`${BASE}/videos?page=${page}`);
export const fetchCategory    = (slug, page)   => get(`${BASE}/category/${encodeURIComponent(slug)}?page=${page}`);
export const fetchSearch      = (q, page)      => get(`${BASE}/search?q=${encodeURIComponent(q)}&page=${page}`);
export const fetchVideoDetail = (slug)         => get(`${BASE}/video/${encodeURIComponent(slug)}`, 25_000);
export const fetchEmbed       = (slug)         => get(`${BASE}/video/${encodeURIComponent(slug)}/embed`, 15_000);
