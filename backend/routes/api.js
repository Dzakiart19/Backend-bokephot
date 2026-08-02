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

// GET /api/bh/videos?page=
router.get('/videos', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    res.json(await scrapeHomepage(page));
  } catch (e) {
    console.error('[API] /videos', e.message);
    res.status(500).json({ error: e.message, videos: [] });
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
    res.status(500).json({ error: e.message, videos: [] });
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
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/video/:slug
router.get('/video/:slug', async (req, res) => {
  try {
    res.json(await scrapeVideoDetail(req.params.slug));
  } catch (e) {
    console.error('[API] /video', e.message);
    res.status(500).json({ error: e.message });
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
