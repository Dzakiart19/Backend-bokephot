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

// GET /api/bh/videos?page=&filter=
app.get('/api/bh/videos', async (req, res) => {
  try {
    const { page = 1, filter = 'terbaru', sort } = req.query;
    // support legacy ?sort= param
    const effectiveFilter = filter !== 'terbaru' ? filter : (sort || 'terbaru');
    const data = await scrapeHomepage(page, effectiveFilter);
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

// GET /api/bh/category/:slug?page=&filter=
app.get('/api/bh/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, filter = 'terbaru', sort } = req.query;
    // support legacy ?sort= param
    const effectiveFilter = filter !== 'terbaru' ? filter : (sort || 'terbaru');
    const data = await scrapeCategory(slug, page, effectiveFilter);
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

    // Resolve embed di background agar siap saat user klik play
    resolveEmbedUrl(slug, data.thumbnail || '').catch(() => {});
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
    // Tentukan type: direct (m3u8/mp4) atau iframe
    const isDirect = embedUrl && (embedUrl.includes('.m3u8') || embedUrl.includes('.mp4'));
    const type = isDirect ? 'direct' : 'iframe';
    res.json({ embedUrl: embedUrl || null, type });
  } catch (e) {
    console.error('[BH-EMBED]', e.message);
    res.json({ embedUrl: null, type: 'iframe' });
  }
});

// GET /api/bh/proxy-embed/:slug  — proxy embed page with ad scripts stripped
app.get('/api/bh/proxy-embed/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).send('Missing slug');

    const embedUrl = `https://www.indoav.com/video/embed/${encodeURIComponent(slug)}`;
    const resp = await axios.get(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': 'https://www.indoav.com/',
        'Cookie': 'age_ok=1',
      },
      timeout: 15000,
    });

    let html = resp.data;

    // ── Strip ad network scripts ──────────────────────────────────────────
    const AD_DOMAINS = [
      'tsyndicate\\.com',
      'xlink3\\.com',
      'xlink2\\.com',
      'linkonclick\\.com',
      'adspeed\\.com',
      'popads\\.net',
      'popcash\\.net',
      'propellerads\\.com',
      'trafficjunky\\.com',
      'juicyads\\.com',
      'exoclick\\.com',
      'trafficstars\\.com',
      'clickadu\\.com',
      'hilltopads\\.net',
      'plugrush\\.com',
      'adsterra\\.com',
      's\\.xlink',
    ];
    const adPattern = new RegExp(
      `<script[^>]*src=["'][^"']*(?:${AD_DOMAINS.join('|')})[^"']*["'][^>]*>.*?</script>|` +
      `<script[^>]*src=["'][^"']*(?:${AD_DOMAINS.join('|')})[^"']*["']\\s*/?>`,
      'gis'
    );
    html = html.replace(adPattern, '<!-- ad removed -->');

    // Also strip inline scripts that call popunder / ad APIs by content pattern
    html = html.replace(
      /<script(?![^>]*src=)[^>]*>[\s\S]*?(?:tsyndicate|xlink3|linkonclick|popads|popcash|propellerads|adsterra)[\s\S]*?<\/script>/gi,
      '<!-- ad removed -->'
    );

    // Inject CSP meta tag to block ad domains at browser level
    const cspContent = `default-src * data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.indoav.com https://cdn.plyr.io https://cdn.jsdelivr.net https://static.cloudflareinsights.com; connect-src 'self' https://www.indoav.com; img-src * data: blob:; media-src * blob:; frame-src 'none';`;
    html = html.replace(
      '<head>',
      `<head>\n  <meta http-equiv="Content-Security-Policy" content="${cspContent}">`
    );

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    res.send(html);
  } catch (e) {
    console.error('[PROXY-EMBED]', e.message);
    // Fallback: redirect to original embed page
    res.redirect(`https://www.indoav.com/video/embed/${req.params.slug}`);
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
        'Referer': 'https://www.indoav.com/',
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
