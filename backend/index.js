const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const path    = require('path');
require('dotenv').config();

const { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories } = require('./scraper');

const app  = express();
const PORT = process.env.PORT || 5000;

console.log(`ℹ️  PORT=${PORT}`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================
// BokepColmek Scraper Routes
// ============================================================

// GET /api/bh/videos?page=&filter=
app.get('/api/bh/videos', async (req, res) => {
  try {
    const { page = 1, filter = 'terbaru' } = req.query;
    const data = await scrapeHomepage(page, filter);
    res.json(data);
  } catch(e) {
    console.error('[BH-VIDEOS]', e.message);
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/categories
app.get('/api/bh/categories', (req, res) => {
  res.json(getCategories());
});

// GET /api/bh/category/:slug?page=&filter=
app.get('/api/bh/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, filter = 'terbaru' } = req.query;
    const data = await scrapeCategory(slug, page, filter);
    res.json(data);
  } catch(e) {
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
  } catch(e) {
    console.error('[BH-SEARCH]', e.message);
    res.status(500).json({ error: e.message, videos: [] });
  }
});

// GET /api/bh/video/:slug  — scrape metadata + cache embed URL
app.get('/api/bh/video/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await scrapeVideoDetail(slug);
    res.json(data);
  } catch(e) {
    console.error('[BH-VIDEO]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/bh/video/:slug/embed  — kembalikan embed URL (dari cache atau scrape)
app.get('/api/bh/video/:slug/embed', async (req, res) => {
  try {
    const { slug } = req.params;
    const embedUrl = await resolveEmbedUrl(slug, '');
    const isDirect = embedUrl && (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4'));
    const type = isDirect ? 'direct' : 'iframe';
    res.json({ embedUrl: embedUrl || null, type });
  } catch(e) {
    console.error('[BH-EMBED]', e.message);
    res.json({ embedUrl: null, type: 'iframe' });
  }
});

// GET /api/bh/proxy-thumb?url=  — proxy thumbnail (jika host blokir hotlinking)
app.get('/api/bh/proxy-thumb', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) return res.status(400).send('Bad URL');
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://bokepcolmek.me/',
        'Accept':     'image/*,*/*',
      },
      timeout: 10000,
      maxRedirects: 5,
    });
    const ct = resp.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(resp.data);
  } catch(e) {
    console.error('[PROXY-THUMB]', e.message);
    res.status(404).send('Not found');
  }
});

// ============================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'BokepHunter API is running (source: bokepcolmek.me)' });
});

// Config — resolves public backend URL
app.get('/api/config', (req, res) => {
  const replitDomains = process.env.REPLIT_DOMAINS;
  const primaryDomain = replitDomains ? replitDomains.split(',')[0].trim() : null;
  const backendUrl    = process.env.REPLIT_URL ||
    (primaryDomain ? `https://${primaryDomain}` : `${req.protocol}://${req.get('host')}`);
  res.json({ success: true, backendUrl, apiUrl: `${backendUrl}/api` });
});

// Root → frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Detail route → frontend
app.get('/detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

// Video slug route → frontend
app.get('/video/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
