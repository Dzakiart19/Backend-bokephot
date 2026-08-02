const axios = require('axios');

const BASE_URL = 'https://bokephunter.com';

// ── Luluvdo direct stream resolver ───────────────────────────────────────────
// Fetches the Luluvdo embed page, unpacks the obfuscated JS, extracts m3u8 URL
async function resolveLuluvdoDirectUrl(embedUrl) {
  const cacheKey = `lulu_direct_${embedUrl}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const resp = await axios.get(embedUrl, {
      headers: {
        ...HEADERS,
        Referer: 'https://bokep.rest/',
        Cookie: '',
      },
      timeout: 12000,
    });
    const html = resp.data;

    // Find the packed JS block
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    for (const s of scripts) {
      if (!s.includes('eval(function(p,a,c,k')) continue;
      const inner = s.replace(/<\/?script[^>]*>/g, '').trim();

      // Unpack by capturing eval output
      const wrapped = inner.replace(/^eval\(/, '').replace(/\)$/, '');
      let unpacked = '';
      try {
        const fn = new Function('return ' + wrapped);
        unpacked = fn();
      } catch (e) {
        continue;
      }

      // Extract file:"..." (the m3u8 URL)
      const fileMatch = unpacked.match(/file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/);
      if (fileMatch) {
        const m3u8Url = fileMatch[1];
        setCache(cacheKey, m3u8Url);
        return m3u8Url;
      }
    }
    return null;
  } catch (e) {
    console.error(`[SCRAPER] resolveLuluvdoDirectUrl failed: ${e.message}`);
    return null;
  }
}

// ── IndoAV RC4 decryption ────────────────────────────────────────────────────
// Ported directly from indoav's minified JS (file.P0uWl5eB.js)
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

// Cache the derived key (it's static)
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

// Resolve direct video URL from IndoAV embed page (no ads!)
async function resolveIndoAVDirect(videoSlug) {
  const cacheKey = `indoav_direct_${videoSlug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const embedUrl = `https://www.indoav.com/video/embed/${videoSlug}`;
  try {
    const resp = await axios.get(embedUrl, {
      headers: {
        ...HEADERS,
        Referer: 'https://bokephunter.com/',
        Cookie: '',
      },
      timeout: 10000,
    });
    const html = resp.data;

    // Extract data-play-token from video-container or player element
    const tokenMatch = html.match(/data-play-token="([^"]+)"/);
    if (!tokenMatch) return null;

    const payload = decryptIndoAVToken(tokenMatch[1]);
    if (!payload || !Array.isArray(payload.u) || payload.u.length === 0) return null;

    // Pick best quality (last = highest res, or fallback to first)
    const directUrl = payload.u[payload.u.length - 1] || payload.u[0];
    if (!directUrl) return null;

    setCache(cacheKey, directUrl);
    return directUrl;
  } catch (e) {
    console.error(`[SCRAPER] resolveIndoAVDirect failed for ${videoSlug}: ${e.message}`);
    return null;
  }
}
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cookie': 'age_ok=1',
};

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, ts: Date.now() });
}

async function fetchPage(url) {
  const cached = getCached(url);
  if (cached) return cached;
  const resp = await axios.get(url, { headers: HEADERS, timeout: 10000 });
  setCache(url, resp.data);
  return resp.data;
}

// Parse video cards dari HTML (grid & sidebar)
function parseVideoCards(html) {
  const videos = [];
  // Match grid video card pattern: <a href="https://bokephunter.com/video/SLUG" class="group block">
  const cardRe = /<a href="https:\/\/bokephunter\.com\/video\/([^"]+)"[^>]*class="group block">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1];
    const inner = m[2];

    // thumbnail
    const thumbMatch = inner.match(/src="([^"]+)"[^>]*class="thumb-img/);
    const thumbnail = thumbMatch ? thumbMatch[1] : '';

    // title from h3
    const titleMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

    // views
    const viewsMatch = inner.match(/([\d,]+)\s*views/i);
    const views = viewsMatch ? viewsMatch[1].replace(',', '') : '0';

    // time ago
    const timeMatch = inner.match(/<p[^>]*text-pink[^>]*>([^<]+ago[^<]*)<\/p>/i);
    const timeAgo = timeMatch ? timeMatch[1].trim() : '';

    videos.push({ slug, title, thumbnail, views, timeAgo });
  }
  return videos;
}

// Parse total pages dari pagination HTML
function parseTotalPages(html) {
  // Look for last page number in pagination
  const pagesMatch = html.match(/Page\s+1\s+of\s+(\d+)/i);
  if (pagesMatch) return parseInt(pagesMatch[1]);
  // fallback: find highest page number in links
  const pageNums = [];
  const re = /\?page=(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    pageNums.push(parseInt(m[1]));
  }
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}

// Scrape homepage
async function scrapeHomepage(page = 1, sort = 'new') {
  const url = `${BASE_URL}?page=${page}&sort=${sort}`;
  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html);
  return { videos, totalPages, page: parseInt(page), sort };
}

// Scrape category page
async function scrapeCategory(slug, page = 1, sort = 'new') {
  const url = `${BASE_URL}/category/${slug}?page=${page}&sort=${sort}`;
  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html);

  // Get category title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;

  return { videos, totalPages, page: parseInt(page), sort, title, slug };
}

// Scrape search
async function scrapeSearch(q, page = 1) {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(q)}&page=${page}`;
  const html = await fetchPage(url);
  const videos = parseVideoCards(html);
  const totalPages = parseTotalPages(html);
  return { videos, totalPages, page: parseInt(page), q };
}

// Ambil embed URL untuk bokeprest dari bokep.rest
async function getBokepRestEmbed(videoId, thumbnailUrl) {
  try {
    // Dari thumbnail URL extract title slug
    // e.g. https://bokep.rest/wp-content/uploads/2026/08/Bokepkurir-pasrah-digoyang-pacar-tocil-hot-320x180.jpg
    const thumbFile = thumbnailUrl.split('/').pop().replace(/-\d+x\d+\.(jpg|jpeg|webp|png)$/i, '');
    const titleSlug = thumbFile.toLowerCase();
    const bokepRestUrl = `https://bokep.rest/bokep/${titleSlug}/${videoId}/.html`;

    const cacheKey = `luluvdo_${videoId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const resp = await axios.get(bokepRestUrl, {
      headers: { ...HEADERS, Referer: 'https://bokep.rest/' },
      timeout: 7000,
      maxRedirects: 5
    });
    const html = resp.data;

    // Cari luluvdo embed
    const embedMatch = html.match(/src="(https:\/\/luluvdo\.com\/e\/[^"]+)"/);
    if (embedMatch) {
      setCache(cacheKey, embedMatch[1]);
      return embedMatch[1];
    }

    // Fallback: cari iframe src lain
    const iframeMatch = html.match(/iframe[^>]+src="(https?:\/\/[^"]+)"/);
    if (iframeMatch) {
      setCache(cacheKey, iframeMatch[1]);
      return iframeMatch[1];
    }
    return null;
  } catch (e) {
    console.error(`[SCRAPER] getBokepRestEmbed failed for ${videoId}: ${e.message}`);
    return null;
  }
}

// Parse related videos (sidebar) - different pattern, flex layout
function parseRelatedVideos(html) {
  const related = [];
  // sidebar/related uses flex cards: <a href="https://bokephunter.com/video/SLUG" class="flex ...group...">
  const re = /<a href="https:\/\/bokephunter\.com\/video\/([^"]+)"[^>]*class="flex[^"]*group[^"]*">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = m[1];
    const inner = m[2];
    const thumbMatch = inner.match(/src="([^"]+)"/);
    const thumbnail = thumbMatch ? thumbMatch[1] : '';
    const titleMatch = inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : slug;
    const viewsMatch = inner.match(/([\d,]+)\s*views/i);
    const views = viewsMatch ? viewsMatch[1] : '0';
    const timeMatch = inner.match(/<p[^>]*text-pink[^>]*>([^<]*ago[^<]*)<\/p>/i);
    const timeAgo = timeMatch ? timeMatch[1].trim() : '';
    related.push({ slug, title, thumbnail, views, timeAgo });
  }
  return related.slice(0, 12);
}

// Scrape video detail — FAST, no embed resolution
async function scrapeVideoDetail(slug) {
  const url = `${BASE_URL}/video/${slug}`;
  const html = await fetchPage(url);

  // Title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const fullTitle = titleMatch ? titleMatch[1].replace(/\s*[—–-]\s*BokepHunter.*$/i, '').trim() : slug;

  // Description from og:description
  const descMatch = html.match(/property="og:description"\s+content="([^"]+)"/);
  const description = descMatch ? descMatch[1] : '';

  // Thumbnail from overlay img
  const thumbMatch = html.match(/id="xepoOverlay"[\s\S]*?<img src="([^"]+)"/);
  const thumbnail = thumbMatch ? thumbMatch[1] : '';

  // Views
  const viewsMatch = html.match(/([\d,]+)\s*views/i);
  const views = viewsMatch ? viewsMatch[1] : '0';

  // Time ago
  const timeMatch = html.match(/\d+\s+(hour|minute|day|week|month|year)s?\s+ago/i);
  const timeAgo = timeMatch ? timeMatch[0] : '';

  // Category tags
  const categories = [];
  const catRe = /href="https:\/\/bokephunter\.com\/category\/([^"]+)"[^>]*class="[^"]*rounded[^"]*"[^>]*>([^<]+)</g;
  let cm;
  while ((cm = catRe.exec(html)) !== null) {
    categories.push({ slug: cm[1], name: cm[2].trim() });
  }

  // Check if embed is already in the bokephunter page (indoav type)
  let embedUrlFromPage = null;
  const frameSection = html.match(/id="xepoFrame"([\s\S]*?)(?=<\/div>\s*<\/div>\s*<\/div>)/);
  if (frameSection) {
    const iframeMatch = frameSection[1].match(/src="(https?:\/\/[^"]+)"/);
    if (iframeMatch && !iframeMatch[1].includes('xhunter') && !iframeMatch[1].includes('bokep.rest/wp-content')) {
      embedUrlFromPage = iframeMatch[1];
    }
  }

  // Related videos
  const related = parseRelatedVideos(html);

  return { slug, title: fullTitle, description, thumbnail, views, timeAgo, categories, related, embedUrlFromPage };
}

// Resolve embed URL — LAZY, called only when user clicks play
async function resolveEmbedUrl(slug, thumbnail) {
  const cacheKey = `embed_${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let embedUrl = null;

  // For indoav: return embed URL — the frontend uses a sandboxed iframe to block popup ads
  if (slug.startsWith('indoav-')) {
    embedUrl = `https://www.indoav.com/video/embed/${slug.replace('indoav-', '')}`;
    setCache(cacheKey, embedUrl);
    return embedUrl;
  }

  // For bokeprest: fetch bokep.rest page → get luluvdo URL → resolve to direct m3u8
  if (slug.startsWith('bokeprest-')) {
    const videoId = slug.replace('bokeprest-', '');
    const luluvdoUrl = await getBokepRestEmbed(videoId, thumbnail || '');
    if (luluvdoUrl) {
      if (luluvdoUrl.includes('luluvdo.com')) {
        // Resolve to direct HLS stream — no ads, no watermarks
        const directUrl = await resolveLuluvdoDirectUrl(luluvdoUrl);
        if (directUrl) {
          setCache(cacheKey, directUrl);
          return directUrl;
        }
      }
      // Fallback: use luluvdo iframe if direct resolution fails
      setCache(cacheKey, luluvdoUrl);
      return luluvdoUrl;
    }
    return null;
  }

  // Generic: try page embed (already extracted in detail, passed in thumbnail=embedUrlFromPage)
  if (thumbnail && thumbnail.startsWith('http') && !thumbnail.includes('wp-content')) {
    setCache(cacheKey, thumbnail);
    return thumbnail;
  }

  return null;
}

// Get all categories (static list from sitemap + nav)
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
