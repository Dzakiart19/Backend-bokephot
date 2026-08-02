// ── API wrappers — semua fetch ke backend ─────────────────────────────────────
const BASE = '/api/bh';

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
