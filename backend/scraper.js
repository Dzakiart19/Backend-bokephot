const axios = require('axios');

const BASE_URL = 'https://www.indoav.com';

// Catatan: data-play-token di halaman indoav adalah token iklan (RC4-encrypted),
// bukan stream URL. Stream video hanya bisa dimuat browser via iframe player indoav.

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

// ── Format tanggal relatif ────────────────────────────────────────────────────
function formatRelativeDate(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    const months= Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (mins < 60)   return `${mins} menit lalu`;
    if (hours < 24)  return `${hours} jam lalu`;
    if (days < 30)   return `${days} hari lalu`;
    if (months < 12) return `${months} bulan lalu`;
    return `${years} tahun lalu`;
  } catch (e) { return ''; }
}

// ── Parse video cards dari HTML (format indoav.com) ───────────────────────────
function parseVideoCards(html) {
  const videos = [];
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
    const viewsMatch = inner.match(/data-icon="eye"[\s\S]*?<span class="text-xs">([\d.,k]+)<\/span>/);
    const views = viewsMatch ? viewsMatch[1].replace(/,/g, '') : '0';

    // Durasi (data-icon="clock")
    const durMatch = inner.match(/data-icon="clock"[\s\S]*?<span class="text-xs">([^<]+)<\/span>/);
    const duration = durMatch ? durMatch[1].trim() : '';

    // Likes (data-icon="heart") ← BARU
    const likesMatch = inner.match(/data-icon="heart"[\s\S]*?<span class="text-xs">([\d.,k]+)<\/span>/);
    const likes = likesMatch ? likesMatch[1].replace(/,/g, '') : '0';

    videos.push({ slug, title, thumbnail, views, duration, likes });
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
      videos.push({
        slug:      v.title_slug || '',
        title:     v.title || '',
        thumbnail: v.thumbnail_image || '',
        views:     String(v.views_count || 0),
        duration:  v.duration ? formatDuration(v.duration) : '',
        likes:     String(v.likes_count || 0),
      });
    }
  }

  // Fallback jika pools kosong tapi ada data.videos
  if (videos.length === 0 && Array.isArray(data.videos)) {
    for (const v of data.videos) {
      videos.push({
        slug:      v.title_slug || '',
        title:     v.title || '',
        thumbnail: v.thumbnail_image || '',
        views:     String(v.views_count || 0),
        duration:  v.duration ? formatDuration(v.duration) : '',
        likes:     String(v.likes_count || 0),
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

// ── Map filter slug ke query param indoav ─────────────────────────────────────
const FILTER_MAP = {
  'terbaru':     '',
  'dilihat':     'banyak-dilihat',
  'disukai':     'banyak-disukai',
  'dikomentari': 'banyak-dikomentari',
  'panjang':     'durasi-panjang',
  'random':      'random',
  // legacy compat
  'new':         '',
  'popular':     'banyak-dilihat',
};

// ── Scrape homepage ───────────────────────────────────────────────────────────
async function scrapeHomepage(page = 1, filter = 'terbaru') {
  page = parseInt(page);
  const indoavFilter = FILTER_MAP[filter] !== undefined ? FILTER_MAP[filter] : '';

  // Page 1 tanpa filter: gunakan /site/feed JSON API (lebih cepat)
  if (page === 1 && !indoavFilter) {
    try {
      const cacheKey = `feed_terbaru`;
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
          return { videos, totalPages: 478, page: 1, filter };
        }
      }
    } catch (e) {
      console.error('[SCRAPER] /site/feed gagal, fallback ke /halaman/1:', e.message);
    }
  }

  // Semua kasus lain: scrape HTML
  const filterQuery = indoavFilter ? `?filter=${indoavFilter}` : '';
  const url = page === 1
    ? `${BASE_URL}/${filterQuery}`
    : `${BASE_URL}/halaman/${page}${filterQuery}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html, /\/halaman\/(\d+)/);
  return { videos, totalPages: Math.max(totalPages, 1), page, filter };
}

// ── Scrape category ───────────────────────────────────────────────────────────
async function scrapeCategory(slug, page = 1, filter = 'terbaru') {
  page = parseInt(page);
  const indoavFilter = FILTER_MAP[filter] !== undefined ? FILTER_MAP[filter] : '';
  const filterQuery  = indoavFilter ? `?filter=${indoavFilter}` : '';

  const url = page === 1
    ? `${BASE_URL}/kategori/${slug}${filterQuery}`
    : `${BASE_URL}/kategori/${slug}/halaman/${page}${filterQuery}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html, /\/halaman\/(\d+)/);

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

  return { videos, totalPages: Math.max(totalPages, 1), page, filter, title, slug };
}

// ── Scrape search ─────────────────────────────────────────────────────────────
async function scrapeSearch(q, page = 1) {
  page = parseInt(page);
  const url = page === 1
    ? `${BASE_URL}/cari?kata-kunci=${encodeURIComponent(q)}`
    : `${BASE_URL}/cari/halaman/${page}?kata-kunci=${encodeURIComponent(q)}`;

  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html, /\/cari\/halaman\/(\d+)/);
  return { videos, totalPages: Math.max(totalPages, 1), page, q };
}

// ── Scrape video detail ───────────────────────────────────────────────────────
async function scrapeVideoDetail(slug) {
  const url = `${BASE_URL}/video/${slug}`;
  const html = await fetchPage(url);

  // Title
  const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/);
  const title = ogTitleMatch ? ogTitleMatch[1] : slug;

  // Description
  const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';

  // Thumbnail
  const thumbMatch = html.match(/property="og:image"\s+content="([^"]+)"/);
  const thumbnail = thumbMatch ? thumbMatch[1] : '';

  // Duration dari video:duration meta
  const durMatch = html.match(/property="video:duration"\s+content="(\d+)"/);
  const duration = durMatch ? formatDuration(parseInt(durMatch[1])) : '';

  // Tanggal posting dari video:release_date ← BARU
  const relDateMatch = html.match(/property="video:release_date"\s+content="([^"]+)"/);
  const postedAt     = relDateMatch ? relDateMatch[1] : '';
  const postedAgo    = formatRelativeDate(postedAt);

  // Views (dari data-icon="eye" di detail)
  const viewsMatch = html.match(/data-icon="eye"[\s\S]{0,200}<span[^>]*>([\d.,k]+)<\/span>/);
  const views = viewsMatch ? viewsMatch[1].replace(/,/g, '') : '0';

  // Likes dari span#likes-count ← BARU
  const likesEl = html.match(/<span id="likes-count"[^>]*>([\d.,k]+)<\/span>/);
  const likes   = likesEl ? likesEl[1].replace(/,/g, '') : '0';

  // Categories — skip nav categories
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

  // Related videos — parse dari HTML (article.video-card group setelah "Related Videos") ← BARU
  const related = [];
  const relIdx = html.indexOf('Related Videos');
  if (relIdx >= 0) {
    const relHtml = html.substring(relIdx);
    const relCards = parseVideoCards(relHtml);
    related.push(...relCards.slice(0, 12));
  }

  return { slug, title, description, thumbnail, views, likes, duration, postedAgo, postedAt, categories, related };
}

// ── Resolve embed URL ─────────────────────────────────────────────────────────
// Stream video indoav hanya bisa dimuat browser via iframe player mereka.
// data-play-token berisi URL iklan (tsyndicate/xlink3/linkonclick), bukan stream.
async function resolveEmbedUrl(slug, thumbnail) {
  const cacheKey = `embed_${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const embedUrl = `${BASE_URL}/video/embed/${slug}`;
  setCache(cacheKey, embedUrl);
  return embedUrl;
}

// ── Categories (real list dari indoav.com) ────────────────────────────────────
function getCategories() {
  return [
    { slug: 'bokep-indonesia', name: 'Bokep Indonesia', emoji: '🇮🇩' },
    { slug: 'bokep-indo',      name: 'Bokep Indo',      emoji: '🔥' },
    { slug: 'bokep-sin',       name: 'Bokep Sin',       emoji: '😈' },
    { slug: 'bokep-dosa',      name: 'Bokep Dosa',      emoji: '💋' },
    { slug: 'bokep-barat',     name: 'Bokep Barat',     emoji: '🌍' },
    { slug: 'bokep-asia',      name: 'Bokep Asia',      emoji: '🌏' },
    { slug: 'bokep-jepang',    name: 'Bokep Jepang',    emoji: '🇯🇵' },
    { slug: 'tanpa-sensor',    name: 'Tanpa Sensor',    emoji: '🔞' },
  ];
}

module.exports = { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories };
