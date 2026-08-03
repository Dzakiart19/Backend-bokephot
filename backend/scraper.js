// Core scraper — menggunakan lib/* sebagai building blocks
const { fetchPage, BASE_URL } = require('./lib/fetcher');
const { getCached, setCache } = require('./lib/cache');
const { decodeHtml, parseDuration, formatRelativeDate } = require('./lib/helpers');
const { parseVideoCards, parseTotalPages } = require('./lib/parser');
const { getCategories } = require('./lib/categories');

const MAX_PAGE = 2000; // batas halaman wajar, cegah request page=9999

// ── Homepage ──────────────────────────────────────────────────────────────────
async function scrapeHomepage(page = 1) {
  page = parseInt(page);
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;
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
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;
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
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Deteksi apakah halaman yang di-fetch adalah benar-benar halaman video detail.
 * Sumber site me-redirect slug tidak valid ke homepage (HTTP 200),
 * sehingga kita perlu validasi konten secara manual.
 */
function isVideoDetailPage(html) {
  return (
    html.includes('article:published_time') ||
    html.includes('itemprop="embedURL"')    ||
    html.includes('itemprop="duration"')
  );
}

/**
 * Parse kategori dari bagian konten artikel (bukan nav menu).
 * Sumber site memiliki nav menu yang memuat SEMUA kategori — untuk menghindari
 * polusi, kita scope pencarian ke dalam <div class="entry-content ..."> saja.
 * Fallback ke seluruh HTML jika entry-content tidak ditemukan.
 */
function parseCategoriesFromContent(html, allCats) {
  const catMap = Object.fromEntries(allCats.map(c => [c.slug, c]));

  // Ambil hanya bagian entry-content agar tidak mengambil kategori dari nav
  const contentStart = html.indexOf('class="entry-content');
  const contentEnd   = html.indexOf('id="related-videos"');
  const scope = contentStart >= 0
    ? html.substring(contentStart, contentEnd > contentStart ? contentEnd : contentStart + 8000)
    : html;

  const seen       = new Set();
  const categories = [];
  const re         = /href="[^"]*\/kategori\/([^"\/]+)\/?["\/]/g;
  let m;
  while ((m = re.exec(scope)) !== null) {
    const catSlug = m[1];
    if (seen.has(catSlug)) continue;
    seen.add(catSlug);
    const info = catMap[catSlug];
    categories.push({
      slug: catSlug,
      name: info
        ? info.name
        : catSlug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    });
  }
  return categories;
}

// ── Video detail ──────────────────────────────────────────────────────────────
async function scrapeVideoDetail(slug) {
  const url  = `${BASE_URL}/vids/${slug}/`;
  const html = await fetchPage(url);

  // FIX #2: Deteksi redirect ke homepage (slug tidak valid)
  // Source site mengembalikan HTTP 200 + homepage untuk slug apapun,
  // sehingga kita harus validasi konten halaman secara manual.
  if (!isVideoDetailPage(html)) {
    const err = new Error('SOURCE_404');
    err.sourceStatus = 404;
    throw err;
  }

  const title       = (m => m ? decodeHtml(m[1]) : slug)(html.match(/property="og:title"\s+content="([^"]+)"/));
  const description = (m => m ? decodeHtml(m[1]) : '')(html.match(/property="og:description"\s+content="([^"]+)"/));
  const thumbnail   = (m => m ? m[1] : '')(html.match(/itemprop="thumbnailUrl"\s+content="([^"]+)"/));
  const duration    = parseDuration((html.match(/itemprop="duration"\s+content="([^"]+)"/) || [])[1] || '');
  const postedAt    = (html.match(/property="article:published_time"\s+content="([^"]+)"/) || [])[1] || '';
  const postedAgo   = formatRelativeDate(postedAt);

  // Embed URL
  const embedM   = html.match(/itemprop="embedURL"\s+content="([^"]+)"/);
  const embedUrl = embedM ? embedM[1] : '';
  if (embedUrl) setCache(`embed_${slug}`, embedUrl);

  // FIX #1: Parse kategori dari entry-content (bukan body class yang tidak ada)
  const categories = parseCategoriesFromContent(html, getCategories());

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

    // Jangan resolve embed jika halaman bukan video detail
    if (!isVideoDetailPage(html)) return null;

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
