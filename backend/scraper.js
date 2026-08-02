const axios = require('axios');

const BASE_URL = 'https://bokepcolmek.me';

// ── HTTP headers (browser-like untuk bypass Cloudflare) ───────────────────────
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua':           '"Chromium";v="138", "Google Chrome";v="138"',
  'Sec-Ch-Ua-Mobile':    '?0',
  'Sec-Ch-Ua-Platform':  '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Connection':     'keep-alive',
};

// ── In-memory cache ───────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size > 300) { const k = cache.keys().next().value; cache.delete(k); }
  cache.set(key, { data, ts: Date.now() });
}

async function fetchPage(url) {
  const cached = getCached(url);
  if (cached) return cached;
  const resp = await axios.get(url, { headers: HEADERS, timeout: 15000, maxRedirects: 5 });
  setCache(url, resp.data);
  return resp.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function decodeHtml(str) {
  return String(str)
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '–').replace(/&hellip;/g, '…');
}

// Parse ISO 8601 duration P0DT0H7M0S → "7m 0s"
function parseDuration(iso) {
  if (!iso) return '';
  const m = iso.match(/P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return '';
  const h   = parseInt(m[2] || 0);
  const min = parseInt(m[3] || 0);
  const s   = parseInt(m[4] || 0);
  if (h > 0)   return `${h}j ${min}m ${s}s`;
  if (min > 0) return `${min}m ${s}s`;
  return `${s}s`;
}

function formatRelativeDate(isoDate) {
  if (!isoDate) return '';
  try {
    const diff  = Date.now() - new Date(isoDate).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    const months = Math.floor(days / 30);
    const years  = Math.floor(days / 365);
    if (mins  < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days  < 30) return `${days} hari lalu`;
    if (months< 12) return `${months} bulan lalu`;
    return `${years} tahun lalu`;
  } catch(e) { return ''; }
}

// ── Parse video cards dari HTML (format retrotube WordPress) ──────────────────
// Struktur: <article class="loop-video thumb-block ...">
//   <a href="URL/vids/SLUG" title="JUDUL">
//     <img data-src="THUMBNAIL">
function parseVideoCards(html) {
  const videos = [];
  const cardRe = /<article[^>]+class="[^"]*thumb-block[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const block = m[0];

    // Slug dari href
    const slugMatch = block.match(/href="https?:\/\/bokepcolmek\.me\/vids\/([^"\/]+)/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];

    // Title dari atribut title="" pada <a>
    const titleMatch = block.match(/<a[^>]+title="([^"]+)"/);
    const title = titleMatch ? decodeHtml(titleMatch[1]) : slug;

    // Thumbnail dari data-src
    const thumbMatch = block.match(/data-src="([^"]+)"/);
    const thumbnail = thumbMatch ? thumbMatch[1] : '';

    videos.push({ slug, title, thumbnail, views: '', duration: '', likes: '' });
  }
  return videos;
}

// ── Parse total pages dari pagination ─────────────────────────────────────────
function parseTotalPages(html) {
  // Link "Last" mengandung halaman terakhir
  const lastMatch = html.match(/href="[^"]*\/page\/(\d+)[^"]*"[^>]*>Last<\/a>/);
  if (lastMatch) return parseInt(lastMatch[1]);

  // Ambil angka terbesar dari semua link paginasi
  const pageNums = [];
  const re = /\/page\/(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1]);
    if (!isNaN(n)) pageNums.push(n);
  }
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}

// ── Scrape homepage ───────────────────────────────────────────────────────────
async function scrapeHomepage(page = 1, filter = 'terbaru') {
  page = parseInt(page);
  const url = page === 1
    ? `${BASE_URL}/`
    : `${BASE_URL}/page/${page}/`;
  const html = await fetchPage(url);
  const videos    = parseVideoCards(html);
  const totalPages = parseTotalPages(html);
  return { videos, totalPages: Math.max(totalPages, 1), page, filter };
}

// ── Scrape category ───────────────────────────────────────────────────────────
async function scrapeCategory(slug, page = 1, filter = 'terbaru') {
  page = parseInt(page);
  const url = page === 1
    ? `${BASE_URL}/kategori/${slug}/`
    : `${BASE_URL}/kategori/${slug}/page/${page}`;
  const html = await fetchPage(url);
  const videos     = parseVideoCards(html);
  const totalPages = parseTotalPages(html);

  // Judul kategori dari <h1>
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch
    ? decodeHtml(titleMatch[1].replace(/<[^>]+>/g, '').trim())
    : slug;

  return { videos, totalPages: Math.max(totalPages, 1), page, filter, title, slug };
}

// ── Scrape search ─────────────────────────────────────────────────────────────
async function scrapeSearch(q, page = 1) {
  page = parseInt(page);
  // WordPress search: halaman 1 = /?s=QUERY, halaman N = /page/N/?s=QUERY
  const url = page === 1
    ? `${BASE_URL}/?s=${encodeURIComponent(q)}`
    : `${BASE_URL}/page/${page}/?s=${encodeURIComponent(q)}`;
  const html = await fetchPage(url);
  const videos     = parseVideoCards(html);
  const totalPages = parseTotalPages(html);
  return { videos, totalPages: Math.max(totalPages, 1), page, q };
}

// ── Scrape video detail ───────────────────────────────────────────────────────
async function scrapeVideoDetail(slug) {
  const url  = `${BASE_URL}/vids/${slug}/`;
  const html = await fetchPage(url);

  // Title
  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/);
  const title   = ogTitle ? decodeHtml(ogTitle[1]) : slug;

  // Description
  const ogDesc      = html.match(/property="og:description"\s+content="([^"]+)"/);
  const description = ogDesc ? decodeHtml(ogDesc[1]) : '';

  // Thumbnail
  const ogImg    = html.match(/itemprop="thumbnailUrl"\s+content="([^"]+)"/);
  const thumbnail = ogImg ? ogImg[1] : '';

  // Duration → parse ISO 8601 (P0DT0H7M0S)
  const durMatch = html.match(/itemprop="duration"\s+content="([^"]+)"/);
  const duration = parseDuration(durMatch ? durMatch[1] : '');

  // Published date
  const pubMatch = html.match(/property="article:published_time"\s+content="([^"]+)"/);
  const postedAt  = pubMatch ? pubMatch[1] : '';
  const postedAgo = formatRelativeDate(postedAt);

  // Embed URL dari itemprop (langsung tersedia, tanpa RC4 atau token)
  const embedMatch = html.match(/itemprop="embedURL"\s+content="([^"]+)"/);
  const embedUrl   = embedMatch ? embedMatch[1] : '';
  if (embedUrl) setCache(`embed_${slug}`, embedUrl);

  // Categories dari class body atau article
  const categories = [];
  const bodyClass  = html.match(/<body[^>]+class="([^"]+)"/);
  if (bodyClass) {
    const seen = new Set();
    for (const cls of bodyClass[1].split(/\s+/)) {
      if (cls.startsWith('category-')) {
        const catSlug = cls.replace('category-', '');
        if (!seen.has(catSlug)) {
          seen.add(catSlug);
          const catName = catSlug.split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
          categories.push({ slug: catSlug, name: catName });
        }
      }
    }
  }

  // Related videos — dari <div id="related-videos">
  const related = [];
  const relIdx  = html.indexOf('id="related-videos"');
  if (relIdx >= 0) {
    const relHtml = html.substring(relIdx);
    const relCards = parseVideoCards(relHtml);
    related.push(...relCards.slice(0, 12));
  }

  return { slug, title, description, thumbnail, views: '', likes: '', duration, postedAgo, postedAt, categories, related, embedUrl };
}

// ── Resolve embed URL ─────────────────────────────────────────────────────────
// Embed URL sudah tersedia di itemprop="embedURL" pada halaman video.
// scrapeVideoDetail menyimpannya ke cache; fungsi ini melayani /embed endpoint.
async function resolveEmbedUrl(slug, thumbnail) {
  const cacheKey = `embed_${slug}`;
  const cached   = getCached(cacheKey);
  if (cached) return cached;

  // Belum di-cache — fetch halaman video untuk ambil embed URL
  try {
    const html       = await fetchPage(`${BASE_URL}/vids/${slug}/`);
    const embedMatch = html.match(/itemprop="embedURL"\s+content="([^"]+)"/);
    if (embedMatch) {
      setCache(cacheKey, embedMatch[1]);
      return embedMatch[1];
    }
    // Fallback: ambil src iframe langsung dari div.video-player
    const iframeMatch = html.match(/<div[^>]+video-player[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/);
    if (iframeMatch) {
      setCache(cacheKey, iframeMatch[1]);
      return iframeMatch[1];
    }
  } catch(e) {
    console.error('[RESOLVE-EMBED]', e.message);
  }
  return null;
}

// ── Kategori utama (dari nav bokepcolmek.me) ──────────────────────────────────
function getCategories() {
  return [
    { slug: 'bokep-indo',         name: 'Bokep Indo',      emoji: '🇮🇩' },
    { slug: 'bokep-indonesia',    name: 'Indonesia',       emoji: '🔥' },
    { slug: 'bokep-indo-terbaru', name: 'Indo Terbaru',    emoji: '🆕' },
    { slug: 'bokep-indo-viral',   name: 'Indo Viral',      emoji: '📱' },
    { slug: 'bokep-colmek',       name: 'Colmek',          emoji: '💦' },
    { slug: 'bokep-jepang',       name: 'Jepang',          emoji: '🇯🇵' },
    { slug: 'bokep-barat',        name: 'Barat',           emoji: '🌍' },
    { slug: 'bokep-asia',         name: 'Asia',            emoji: '🌏' },
  ];
}

module.exports = { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories };
