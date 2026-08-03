// ── Ads — Directlink terpusat ─────────────────────────────────────────────────
// Iklan muncul setiap klik (video, play, pagination, kategori).
// Debounce 1 detik saja — cegah double-fire dari klik cepat, bukan batasi per menit.

export const AD_URL      = 'https://rm358.com/4/11476496';
const DEBOUNCE_MS        = 1000; // 1 detik — bukan cooldown, hanya anti-dobel

const KEY_TS   = '_adt';    // timestamp fire terakhir (debounce)
const KEY_FLAG = '_adfire'; // flag pending (untuk navigation context)

// Cek debounce — return true jika boleh fire, sekaligus update timestamp
function _canFire() {
  try {
    const n    = Date.now();
    const last = +localStorage.getItem(KEY_TS) || 0;
    if (n - last < DEBOUNCE_MS) return false;
    localStorage.setItem(KEY_TS, n);
    return true;
  } catch { return false; }
}

// ── Inline onclick string untuk dynamically-generated HTML (cards) ────────────
// Set flag → window.open dipanggil dari detail.js di page-load context (mobile safe)
export const AD_ONCLICK =
  `(function(){` +
  `  try {` +
  `    var k='${KEY_TS}',f='${KEY_FLAG}',n=Date.now(),t=+localStorage.getItem(k)||0;` +
  `    if(n-t>=${DEBOUNCE_MS}){localStorage.setItem(k,n);localStorage.setItem(f,'1');}` +
  `  } catch(e){}` +
  `})();`;

// ── fireAd — langsung buka tab iklan (direct user gesture: play, pagination) ──
export function fireAd() {
  try {
    if (!_canFire()) return;
    window.open(AD_URL, '_blank', 'noopener');
  } catch (e) { /* popup blocked */ }
}

// ── markAdPending — set flag untuk page-load berikutnya (kategori navigation) ─
export function markAdPending() {
  try {
    if (!_canFire()) return;
    localStorage.setItem(KEY_FLAG, '1');
  } catch (e) {}
}

// ── firePendingAd — fire jika ada flag (panggil saat page load) ───────────────
export function firePendingAd() {
  try {
    if (localStorage.getItem(KEY_FLAG) !== '1') return;
    localStorage.removeItem(KEY_FLAG);
    setTimeout(() => {
      try { window.open(AD_URL, '_blank', 'noopener'); } catch (e) {}
    }, 300);
  } catch (e) {}
}
