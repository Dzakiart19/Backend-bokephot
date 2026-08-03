// ── Ads — Directlink terpusat ─────────────────────────────────────────────────
// Direktlink terbuka setiap trigger (video click, play, pagination, kategori).
// Cooldown 15 detik — cegah popup blocker browser dari pola terlalu agresif.

export const AD_URL    = 'https://rm358.com/4/11476496';
const COOLDOWN_MS      = 15_000; // 15 detik antar popup (standar industri)

const KEY_TS   = '_adt';    // timestamp fire terakhir (cooldown)
const KEY_FLAG = '_adfire'; // flag pending (untuk navigation context)

// ── Internal: cek cooldown — return true jika boleh fire ─────────────────────
function _canFire() {
  try {
    const n    = Date.now();
    const last = +localStorage.getItem(KEY_TS) || 0;
    if (n - last < COOLDOWN_MS) return false;
    localStorage.setItem(KEY_TS, n);
    return true;
  } catch { return false; }
}

// ── fireAd ───────────────────────────────────────────────────────────────────
// Buka tab iklan langsung. Gunakan saat ada direct user gesture (play, pagination).
export function fireAd() {
  try {
    if (!_canFire()) return;
    window.open(AD_URL, '_blank', 'noopener');
  } catch (e) { /* popup blocked */ }
}

// ── markAdPending ─────────────────────────────────────────────────────────────
// Set flag untuk di-fire di page berikutnya. Dipakai saat user navigate (klik card).
export function markAdPending() {
  try {
    if (!_canFire()) return;
    localStorage.setItem(KEY_FLAG, '1');
  } catch (e) {}
}

// ── firePendingAd ─────────────────────────────────────────────────────────────
// Fire jika ada flag pending. Panggil di page load (script.js & detail.js).
// Tanpa setTimeout — window.open dari setTimeout dianggap bukan direct user gesture
// oleh iOS Safari dan akan di-block. Panggil seawal mungkin di page load context.
export function firePendingAd() {
  try {
    if (localStorage.getItem(KEY_FLAG) !== '1') return;
    localStorage.removeItem(KEY_FLAG);
    window.open(AD_URL, '_blank', 'noopener');
  } catch (e) {}
}

// ── initAdClickDelegation ─────────────────────────────────────────────────────
// Event delegation untuk semua [data-ad-click] link.
// Menggantikan AD_ONCLICK inline string — satu listener, tanpa duplikasi logika.
// Panggil sekali di boot tiap halaman.
export function initAdClickDelegation() {
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-ad-click]')) return;
    markAdPending();
  });
}
