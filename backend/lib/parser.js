const { decodeHtml } = require('./helpers');

// ── Parse video cards dari HTML (format retrotube WordPress) ──────────────────
// Hanya <article class="loop-video thumb-block"> — bukan iklan
function parseVideoCards(html) {
  const videos = [];
  const cardRe = /<article[^>]+class="[^"]*loop-video[^"]*thumb-block[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const block = m[0];

    // Slug dari href /vids/
    const slugM = block.match(/href="https?:\/\/bokepcolmek\.me\/vids\/([^"\/]+)/);
    if (!slugM) continue;
    const slug = slugM[1];

    // Title
    const titleM = block.match(/<a[^>]+title="([^"]+)"/);
    const title  = titleM ? decodeHtml(titleM[1]) : slug;

    // Thumbnail: data-src → src
    const thumbM  = block.match(/data-src="([^"]+)"/) || block.match(/<img[^>]+src="([^"]+)"/);
    const thumbnail = thumbM ? thumbM[1] : '';

    // Durasi (kalau ada di card)
    const durM    = block.match(/class="[^"]*duration[^"]*"[^>]*>([\s\S]*?)<\/span>/);
    const duration = durM ? durM[1].trim() : '';

    videos.push({ slug, title, thumbnail, duration, views: '', likes: '' });
  }
  return videos;
}

// ── Parse total pages dari pagination ─────────────────────────────────────────
function parseTotalPages(html) {
  // Link "Last"
  const lastM = html.match(/href="[^"]*\/page\/(\d+)[^"]*"[^>]*>Last<\/a>/);
  if (lastM) return parseInt(lastM[1]);

  // Angka terbesar dari semua /page/N
  const nums = [];
  const re   = /\/page\/(\d+)/g;
  let n;
  while ((n = re.exec(html)) !== null) {
    const v = parseInt(n[1]);
    if (!isNaN(v)) nums.push(v);
  }
  return nums.length ? Math.max(...nums) : 1;
}

module.exports = { parseVideoCards, parseTotalPages };
