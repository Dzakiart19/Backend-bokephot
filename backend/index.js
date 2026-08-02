const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// Startup environment validation
const requiredEnvVars = [];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
} else {
  console.log('✅ Environment variables OK');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// BokepHunter Scraper Routes
// ============================================================

// GET /api/bh/videos?page=&sort=
app.get('/api/bh/videos', async (req, res) => {
  try {
    const { page = 1, sort = 'new' } = req.query;
    const data = await scrapeHomepage(page, sort);
    res.json(data);
  } catch (e) {
    console.error('[BH-VIDEOS]', e.message);
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/categories
app.get('/api/bh/categories', (req, res) => {
  res.json(getCategories());
});

// GET /api/bh/category/:slug?page=&sort=
app.get('/api/bh/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, sort = 'new' } = req.query;
    const data = await scrapeCategory(slug, page, sort);
    res.json(data);
  } catch (e) {
    console.error('[BH-CATEGORY]', e.message);
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/search?q=&page=
app.get('/api/bh/search', async (req, res) => {
  try {
    const { q = '', page = 1 } = req.query;
    if (!q.trim()) return res.json({ videos: [], totalPages: 0, page: 1, q });
    const data = await scrapeSearch(q, page);
    res.json(data);
  } catch (e) {
    console.error('[BH-SEARCH]', e.message);
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/video/:slug  — fast: scrape page data only, no embed resolution
app.get('/api/bh/video/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await scrapeVideoDetail(slug);
    res.json(data);

    // After responding, resolve embed in background so it lands in cache.
    // Next call to /embed (from frontend prefetch) will hit cache instantly.
    if (!data.embedUrlFromPage) {
      resolveEmbedUrl(slug, data.thumbnail || '').catch(() => {});
    }
  } catch (e) {
    console.error('[BH-VIDEO]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/bh/video/:slug/embed  — fallback lazy endpoint (still available)
app.get('/api/bh/video/:slug/embed', async (req, res) => {
  try {
    const { slug } = req.params;
    const { thumbnail } = req.query;
    const embedUrl = await resolveEmbedUrl(slug, thumbnail || '');
    res.json({ embedUrl: embedUrl || null });
  } catch (e) {
    console.error('[BH-EMBED]', e.message);
    res.json({ embedUrl: null });
  }
});

// GET /api/bh/proxy-thumb?url=  — proxy thumbnails that block hotlinking
app.get('/api/bh/proxy-thumb', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) return res.status(400).send('Bad URL');

    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://bokep.rest/',
        'Accept': 'image/*,*/*',
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const ct = resp.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400'); // cache 1 day
    res.send(resp.data);
  } catch (e) {
    console.error('[PROXY-THUMB]', e.message);
    res.status(404).send('Not found');
  }
});

// ============================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BokepHunter API is running' });
});

// Config endpoint — resolves the current backend's public URL dynamically
app.get('/api/config', (req, res) => {
  const replitDomains = process.env.REPLIT_DOMAINS;
  const primaryDomain = replitDomains ? replitDomains.split(',')[0].trim() : null;
  const backendUrl = process.env.REPLIT_URL ||
    (primaryDomain ? `https://${primaryDomain}` : `${req.protocol}://${req.get('host')}`);
  res.json({ success: true, backendUrl, apiUrl: `${backendUrl}/api` });
});

// Root route → frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Detail route → frontend
app.get('/detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

// Video slug-based route → frontend
app.get('/video/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
