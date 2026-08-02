const axios = require('axios');

const BASE_URL = 'https://www.indoav.com';

// ── RC4 decryption ───────────────────────────────────────────────────────────
// Ported from indoav's minified JS (same algorithm as before)
function rc4(str, key) {
  let n, o = [], r = 0, l = '', a = 0;
  for (a = 0; a < 256; a++) o[a] = a;
  for (a = 0; a < 256; a++) {
    r = (r + o[a] + key.charCodeAt(a % key.length)) % 256;
    n = o[a]; o[a] = o[r]; o[r] = n;
  }
  a = 0; r = 0;
  for (let i = 0; i < str.length; i++) {
    r = (r + o[a = (a + 1) % 256]) % 256;
    n = o[a]; o[a] = o[r]; o[r] = n;
    l += String.fromCharCode(str.charCodeAt(i) ^ o[(o[a] + o[r]) % 256]);
  }
  return l;
}

function reverseStr(s) { return s.split('').reverse().join(''); }

// Static key extracted from indoav JS bundle
const INDOAV_STATIC_KEY = 'rqpSaEddZ156f342cjwOD8vc4/SYtI0ILIo5UUj45apkqA06FzRKvr92GErrdKGZozMV1L52EueOl7B7yO1efjk8uBhSzLOf';

function deriveIndoAVKey() {
  let p = Buffer.from(INDOAV_STATIC_KEY, 'base64').toString('binary');
  p = rc4(p, '');
  p = Buffer.from(p, 'base64').toString('binary');
  return p;
}

let _indoavKey = null;
function getIndoAVKey() {
  if (!_indoavKey) _indoavKey = deriveIndoAVKey();
  return _indoavKey;
}

function decryptIndoAVToken(token) {
  try {
    const key = getIndoAVKey();
    const decoded = Buffer.from(reverseStr(token), 'base64').toString('binary');
    const decrypted = rc4(decoded, key);
    return JSON.parse(decrypted);
  } catch (e) {
    return null;
  }
}

// ── HTTP headers ─────────────────────────────────────────────────────────────
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cookie': 'age_ok=1',
  'Referer': 'https://www.indoav.com/',
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
  if (cache.size > 300) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, ts: Date.now() });
}

async function fetchPage(url) {
  const cached = getCached(url);
  if (cached) return cached;
  const resp = await axios.get(url, { headers: HEADERS, timeout: 12000 });
  setCache(url, resp.data);
  return resp.data;
}

// ── Format durasi ─────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const s = parseInt(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}j ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── Parse video cards dari HTML (format indoav.com) ───────────────────────────
// Digunakan untuk: /halaman/N, /kategori/slug, /cari?kata-kunci=...
function parseVideoCards(html) {
  const videos = [];
  // Match setiap <article class="video-card group">
  const cardRe = /<article class="video-card group">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const inner = m[1];

    // Slug dari href
    const slugMatch = inner.match(/href="https:\/\/www\.indoav\.com\/video\/([^"]+)"/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];

    // Thumbnail
    const thumbMatch = inner.match(/class="video-card__image"\s+src="([^"]+)"/);
    const thumbnail = thumbMatch ? thumbMatch[1] : '';

    // Title dari h2 > a
    const titleMatch = inner.match(/class="video-card__title">([\s\S]*?)<\/h2>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

    // Views (data-icon="eye")
    const viewsMatch = inner.match(/data-icon="eye"[\s\S]*?<span class="text-xs">([\d.,]+)<\/span>/);
    const views = viewsMatch ? viewsMatch[1].replace(/,/g, '') : '0';

    // Durasi (data-icon="clock")
    const durMatch = inner.match(/data-icon="clock"[\s\S]*?<span class="text-xs">([^<]+)<\/span>/);
    const timeAgo = durMatch ? durMatch[1].trim() : '';

    videos.push({ slug, title, thumbnail, views, timeAgo });
  }
  return videos;
}

// ── Parse videos dari /site/feed JSON API ────────────────────────────────────
function parseFeedVideos(data) {
  const pools = Array.isArray(data.pools) ? data.pools : [];
  const seen = new Set();
  const videos = [];

  for (const pool of pools) {
    const poolVideos = Array.isArray(pool.videos) ? pool.videos : [];
    for (const v of poolVideos) {
      const id = v.id || v.title_slug;
      if (seen.has(id)) continue;
      seen.add(id);

      // Jika ada data.videos flat (fallback)
      videos.push({
        slug: v.title_slug || '',
        title: v.title || '',
        thumbnail: v.thumbnail_image || '',
        views: String(v.views_count || 0),
        timeAgo: v.duration ? formatDuration(v.duration) : '',
      });
    }
  }

  // Fallback jika pools kosong tapi ada data.videos
  if (videos.length === 0 && Array.isArray(data.videos)) {
    for (const v of data.videos) {
      videos.push({
        slug: v.title_slug || '',
        title: v.title || '',
        thumbnail: v.thumbnail_image || '',
        views: String(v.views_count || 0),
        timeAgo: v.duration ? formatDuration(v.duration) : '',
      });
    }
  }

  return videos.filter(v => v.slug);
}

// ── Parse total pages dari pagination HTML ────────────────────────────────────
function parseTotalPages(html, basePattern = /\/halaman\/(\d+)/) {
  const pageNums = [];
  const re = new RegExp(basePattern.source, 'g');
  let m;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1]);
    if (!isNaN(n)) pageNums.push(n);
  }
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}

// ── Scrape homepage ───────────────────────────────────────────────────────────
async function scrapeHomepage(page = 1, sort = 'new') {
  page = parseInt(page);

  // Page 1: gunakan /site/feed JSON API (lebih cepat, tidak perlu scrape HTML)
  if (page === 1) {
    try {
      const cacheKey = `feed_${sort}`;
      let data = getCached(cacheKey);
      if (!data) {
        const feedUrl = `${BASE_URL}/site/feed`;
        const resp = await axios.get(feedUrl, {
          headers: { ...HEADERS, Accept: 'application/json' },
          timeout: 12000,
        });
        data = resp.data;
        if (data && data.success) setCache(cacheKey, data);
      }
      if (data && data.success) {
        const videos = parseFeedVideos(data);
        if (videos.length > 0) {
          return { videos, totalPages: 478, page: 1, sort };
        }
      }
    } catch (e) {
      console.error('[SCRAPER] /site/feed gagal, fallback ke /halaman/1:', e.message);
    }
  }

  // Page 2+: scrape HTML dari /halaman/N
  const filterParam = sort === 'popular' ? '?filter=terpopuler' : '';
  const url = page === 1
    ? `${BASE_URL}/${filterParam}`
    : `${BASE_URL}/halaman/${page}${filterParam}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html, /\/halaman\/(\d+)/);
  return { videos, totalPages: Math.max(totalPages, 1), page, sort };
}

// ── Scrape category ───────────────────────────────────────────────────────────
async function scrapeCategory(slug, page = 1, sort = 'new') {
  page = parseInt(page);
  const url = page === 1
    ? `${BASE_URL}/kategori/${slug}`
    : `${BASE_URL}/kategori/${slug}/halaman/${page}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html, /\/halaman\/(\d+)/);

  // Title dari h1
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

  return { videos, totalPages: Math.max(totalPages, 1), page, sort, title, slug };
}

// ── Scrape search ─────────────────────────────────────────────────────────────
async function scrapeSearch(q, page = 1) {
  page = parseInt(page);
  // Page 1: /cari?kata-kunci=...
  // Page 2+: /cari/halaman/N?kata-kunci=...
  const url = page === 1
    ? `${BASE_URL}/cari?kata-kunci=${encodeURIComponent(q)}`
    : `${BASE_URL}/cari/halaman/${page}?kata-kunci=${encodeURIComponent(q)}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  // Search pagination uses /cari/halaman/N
  const totalPages = parseTotalPages(html, /\/cari\/halaman\/(\d+)/);
  return { videos, totalPages: Math.max(totalPages, 1), page, q };
}

// ── Scrape video detail ───────────────────────────────────────────────────────
async function scrapeVideoDetail(slug) {
  const url = `${BASE_URL}/video/${slug}`;
  const html = await fetchPage(url);

  // Title dari og:title
  const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/);
  const title = ogTitleMatch ? ogTitleMatch[1] : slug;

  // Description dari og:description
  const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';

  // Thumbnail dari og:image
  const thumbMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
  const thumbnail = thumbMatch ? thumbMatch[1] : '';

  // Duration dari video:duration meta
  const durMatch = html.match(/property="video:duration"\s+content="(\d+)"/);
  const timeAgo = durMatch ? formatDuration(parseInt(durMatch[1])) : '';

  // Views
  const viewsMatch = html.match(/data-icon="eye"[\s\S]{0,200}<span[^>]*>([\d.,]+)<\/span>/);
  const views = viewsMatch ? viewsMatch[1].replace(/,/g, '') : '0';

  // data-play-token → simpan di cache untuk resolveEmbedUrl
  const tokenMatch = html.match(/data-play-token="([^"]+)"/);
  if (tokenMatch) {
    setCache(`token_${slug}`, tokenMatch[1]);
  }

  // Categories — cari setelah </nav> untuk skip nav categories
  const categories = [];
  const navEnd = html.indexOf('</nav>');
  const contentHtml = navEnd >= 0 ? html.substring(navEnd) : html;
  const catRe = /href="https:\/\/www\.indoav\.com\/kategori\/([^"\/]+)"[^>]*>([^<]+)</g;
  const catSeen = new Set();
  let cm;
  while ((cm = catRe.exec(contentHtml)) !== null) {
    const catSlug = cm[1];
    const catName = cm[2].trim();
    if (!catSeen.has(catSlug) && catName && catName.length < 50) {
      catSeen.add(catSlug);
      categories.push({ slug: catSlug, name: catName });
    }
  }

  // Related videos — indoav load via JS, tidak ada di SSR HTML
  const related = [];

  return { slug, title, description, thumbnail, views, timeAgo, categories, related, embedUrlFromPage: null };
}

// ── Resolve embed URL ─────────────────────────────────────────────────────────
// IndoAV token sekarang berisi ad redirect URLs (bukan direct stream).
// Solusi: gunakan indoav embed page sebagai iframe — player JS indoav yang handle video.
// Sandbox di frontend akan block popup ads.
async function resolveEmbedUrl(slug, thumbnail) {
  const cacheKey = `embed_${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Return embed page URL — frontend akan load sebagai sandboxed iframe
  const embedUrl = `${BASE_URL}/video/embed/${slug}`;
  setCache(cacheKey, embedUrl);
  return embedUrl;
}

// ── Categories ────────────────────────────────────────────────────────────────
function getCategories() {
  return [
    { slug: 'bokep-indonesia', name: 'Bokep Indonesia', emoji: '🇮🇩' },
    { slug: 'bokep-indo',      name: 'Bokep Indo',      emoji: '🔥' },
    { slug: 'bokep-viral',     name: 'Bokep Viral',     emoji: '📱' },
    { slug: 'bokep-jilbab',    name: 'Bokep Jilbab',   emoji: '🧕' },
    { slug: 'bokep-abg',       name: 'Bokep ABG',       emoji: '✨' },
    { slug: 'bokep-colmek',    name: 'Bokep Colmek',   emoji: '🌶️' },
    { slug: 'bokep-tiktok',    name: 'Bokep TikTok',   emoji: '🎵' },
    { slug: 'bokep-skandal',   name: 'Bokep Skandal',  emoji: '📸' },
    { slug: 'bokep-mahasiswi', name: 'Bokep Mahasiswi',emoji: '🎓' },
    { slug: 'bokep-barat',     name: 'Bokep Barat',    emoji: '🌍' },
    { slug: 'bokep-asia',      name: 'Bokep Asia',     emoji: '🌏' },
    { slug: 'bokep-jepang',    name: 'Bokep Jepang',   emoji: '🇯🇵' },
    { slug: 'bokep-lesbian',   name: 'Bokep Lesbian',  emoji: '💕' },
  ];
}

module.exports = { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories };
