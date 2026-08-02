// Core scraper — menggunakan lib/* sebagai building blocks
const { fetchPage, BASE_URL } = require('./lib/fetcher');
const { getCached, setCache } = require('./lib/cache');
const { decodeHtml, parseDuration, formatRelativeDate } = require('./lib/helpers');
const { parseVideoCards, parseTotalPages } = require('./lib/parser');
const { getCategories } = require('./lib/categories');

// ── Homepage ──────────────────────────────────────────────────────────────────
async function scrapeHomepage(page = 1) {
  page = parseInt(page);
  const url  = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`;
  const html = await fetchPage(url);
  return {
    videos:     parseVideoCards(html),
    totalPages: Math.max(parseTotalPages(html), 1),
    page,
  };
}

// ── Category ──────────────────────────────────────────────────────────────────
async function scrapeCategory(slug, page = 1) {
  page = parseInt(page);
  const url  = page === 1
    ? `${BASE_URL}/kategori/${slug}/`
    : `${BASE_URL}/kategori/${slug}/page/${page}/`;
  const html = await fetchPage(url);

  const h1M  = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1M ? decodeHtml(h1M[1].replace(/<[^>]+>/g, '').trim()) : slug;

  return {
    videos:     parseVideoCards(html),
    totalPages: Math.max(parseTotalPages(html), 1),
    page, slug, title,
  };
}

// ── Search ────────────────────────────────────────────────────────────────────
async function scrapeSearch(q, page = 1) {
  page = parseInt(page);
  const url  = page === 1
    ? `${BASE_URL}/?s=${encodeURIComponent(q)}`
    : `${BASE_URL}/page/${page}/?s=${encodeURIComponent(q)}`;
  const html = await fetchPage(url);
  return {
    videos:     parseVideoCards(html),
    totalPages: Math.max(parseTotalPages(html), 1),
    page, q,
  };
}

// ── Video detail ──────────────────────────────────────────────────────────────
async function scrapeVideoDetail(slug) {
  const url  = `${BASE_URL}/vids/${slug}/`;
  const html = await fetchPage(url);

  const title       = (m => m ? decodeHtml(m[1]) : slug)(html.match(/property="og:title"\s+content="([^"]+)"/));
  const description = (m => m ? decodeHtml(m[1]) : '')(html.match(/property="og:description"\s+content="([^"]+)"/));
  const thumbnail   = (m => m ? m[1] : '')(html.match(/itemprop="thumbnailUrl"\s+content="([^"]+)"/));
  const duration    = parseDuration((html.match(/itemprop="duration"\s+content="([^"]+)"/) || [])[1] || '');
  const postedAt    = (html.match(/property="article:published_time"\s+content="([^"]+)"/) || [])[1] || '';
  const postedAgo   = formatRelativeDate(postedAt);

  // Embed URL (langsung dari itemprop, tidak perlu RC4)
  const embedM   = html.match(/itemprop="embedURL"\s+content="([^"]+)"/);
  const embedUrl = embedM ? embedM[1] : '';
  if (embedUrl) setCache(`embed_${slug}`, embedUrl);

  // Kategori dari body class
  const allCats  = getCategories();
  const catMap   = Object.fromEntries(allCats.map(c => [c.slug, c]));
  const categories = [];
  const bodyM    = html.match(/<body[^>]+class="([^"]+)"/);
  if (bodyM) {
    const seen = new Set();
    for (const cls of bodyM[1].split(/\s+/)) {
      if (!cls.startsWith('category-')) continue;
      const catSlug = cls.replace('category-', '');
      if (seen.has(catSlug)) continue;
      seen.add(catSlug);
      const info = catMap[catSlug];
      categories.push({
        slug: catSlug,
        name: info ? info.name : catSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
      });
    }
  }

  // Related videos
  const relIdx = html.indexOf('id="related-videos"');
  const related = relIdx >= 0
    ? parseVideoCards(html.substring(relIdx)).slice(0, 12)
    : [];

  return { slug, title, description, thumbnail, duration, postedAgo, postedAt, categories, related, embedUrl, views: '', likes: '' };
}

// ── Embed URL resolver ────────────────────────────────────────────────────────
async function resolveEmbedUrl(slug) {
  const key    = `embed_${slug}`;
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const html = await fetchPage(`${BASE_URL}/vids/${slug}/`);
    const embedM = html.match(/itemprop="embedURL"\s+content="([^"]+)"/);
    if (embedM) { setCache(key, embedM[1]); return embedM[1]; }

    const iframeM = html.match(/<div[^>]+video-player[^>]*>[\s\S]*?<iframe[^>]+src="([^"]+)"/);
    if (iframeM) { setCache(key, iframeM[1]); return iframeM[1]; }
  } catch (e) {
    console.error('[RESOLVE-EMBED]', e.message);
  }
  return null;
}

module.exports = { scrapeHomepage, scrapeCategory, scrapeSearch, scrapeVideoDetail, resolveEmbedUrl, getCategories };
