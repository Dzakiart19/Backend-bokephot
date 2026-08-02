// /api/bh/* — semua endpoint data video
const express = require('express');
const router  = express.Router();

const {
  scrapeHomepage,
  scrapeCategory,
  scrapeSearch,
  scrapeVideoDetail,
  resolveEmbedUrl,
  getCategories,
} = require('../scraper');

// ── Helper: map fetcher error → HTTP status + pesan user-friendly ─────────────
function handleScraperError(e, res) {
  const msg = e.message || '';
  if (msg === 'SOURCE_TIMEOUT') {
    return res.status(504).json({ error: 'Sumber tidak merespons. Coba lagi beberapa saat.', videos: [] });
  }
  if (msg.startsWith('SOURCE_5')) {
    const code = e.sourceStatus || 502;
    return res.status(503).json({ error: `Sumber sedang tidak tersedia (${code}). Coba lagi nanti.`, videos: [] });
  }
  if (msg === 'SOURCE_404') {
    return res.status(404).json({ error: 'Halaman tidak ditemukan di sumber.', videos: [] });
  }
  return res.status(500).json({ error: 'Terjadi kesalahan. Coba lagi.', videos: [] });
}

// GET /api/bh/videos?page=
router.get('/videos', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    res.json(await scrapeHomepage(page));
  } catch (e) {
    console.error('[API] /videos', e.message);
    handleScraperError(e, res);
  }
});

// GET /api/bh/categories
router.get('/categories', (_req, res) => {
  res.json(getCategories());
});

// GET /api/bh/category/:slug?page=
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1 } = req.query;
    res.json(await scrapeCategory(slug, page));
  } catch (e) {
    console.error('[API] /category', e.message);
    handleScraperError(e, res);
  }
});

// GET /api/bh/search?q=&page=
router.get('/search', async (req, res) => {
  try {
    const { q = '', page = 1 } = req.query;
    if (!q.trim()) return res.json({ videos: [], totalPages: 0, page: 1, q });
    res.json(await scrapeSearch(q, page));
  } catch (e) {
    console.error('[API] /search', e.message);
    handleScraperError(e, res);
  }
});

// GET /api/bh/video/:slug
router.get('/video/:slug', async (req, res) => {
  try {
    res.json(await scrapeVideoDetail(req.params.slug));
  } catch (e) {
    console.error('[API] /video', e.message);
    handleScraperError(e, res);
  }
});

// GET /api/bh/video/:slug/embed
router.get('/video/:slug/embed', async (req, res) => {
  try {
    const embedUrl = await resolveEmbedUrl(req.params.slug);
    const isDirect = embedUrl && (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4'));
    res.json({ embedUrl: embedUrl || null, type: isDirect ? 'direct' : 'iframe' });
  } catch (e) {
    console.error('[API] /embed', e.message);
    res.json({ embedUrl: null, type: 'iframe' });
  }
});

module.exports = router;
