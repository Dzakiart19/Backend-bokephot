// ── String helpers ────────────────────────────────────────────────────────────

function decodeHtml(str) {
  return String(str)
    .replace(/&#(\d+);/g,           (_, c) => String.fromCharCode(parseInt(c)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g,   '&').replace(/&lt;/g,    '<').replace(/&gt;/g,   '>')
    .replace(/&quot;/g,  '"').replace(/&apos;/g,  "'").replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&bull;/g,  '•')
    .replace(/&copy;/g,  '©').replace(/&reg;/g,   '®').replace(/&trade;/g, '™');
}

// ISO 8601 duration → human readable (P0DT0H7M0S → "7m 0s")
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
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return ''; // tanggal invalid
    const diff   = Date.now() - date.getTime();
    if (diff < 0) return 'baru saja'; // tanggal di masa depan
    const mins   = Math.floor(diff / 60_000);
    if (mins < 1)  return 'baru saja';
    const hours  = Math.floor(diff / 3_600_000);
    const days   = Math.floor(diff / 86_400_000);
    const months = Math.floor(days / 30);
    const years  = Math.floor(days / 365);
    if (mins   <  60) return `${mins} menit lalu`;
    if (hours  <  24) return `${hours} jam lalu`;
    if (days   <  30) return `${days} hari lalu`;
    if (months <  12) return `${months} bulan lalu`;
    return `${years} tahun lalu`;
  } catch { return ''; }
}

module.exports = { decodeHtml, parseDuration, formatRelativeDate };
