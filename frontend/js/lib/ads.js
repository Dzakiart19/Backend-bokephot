// ── Ads — Directlink terpusat ─────────────────────────────────────────────────
// Satu tempat untuk semua konfigurasi & logika iklan.
// Aman: gunakan user-gesture context + cooldown 3 menit.

export const AD_URL = 'https://rm358.com/4/11476496';
export const AD_TTL = 3 * 60 * 1000; // 3 menit cooldown

const KEY_TS   = '_adt';    // timestamp iklan terakhir
const KEY_FLAG = '_adfire'; // flag pending (untuk navigation context)

// Cek apakah cooldown sudah lewat. Jika ya, update timestamp dan return true.
function _cooldownOk() {
  try {
    const n    = Date.now();
    const last = +localStorage.getItem(KEY_TS) || 0;
    if (n - last < AD_TTL) return false;
    localStorage.setItem(KEY_TS, n);
    return true;
  } catch { return false; }
}

// ── Inline onclick string untuk dinamically-generated HTML (cards) ────────────
// Hanya SET flag — window.open dipanggil dari detail.js di page-load context
// agar tidak diblokir mobile browser.
export const AD_ONCLICK =
  `(function(){` +
  `  try {` +
  `    var k='${KEY_TS}',f='${KEY_FLAG}',n=Date.now(),t=+localStorage.getItem(k)||0;` +
  `    if(n-t>=${AD_TTL}){localStorage.setItem(k,n);localStorage.setItem(f,'1');}` +
  `  } catch(e){}` +
  `})();`;

// ── fireAd — langsung buka tab iklan (gunakan di direct user gesture) ─────────
// Aman dipakai di: onclick pagination button, onclick play button.
// JANGAN pakai di async context — popup blocker akan menendang.
export function fireAd() {
  try {
    if (!_cooldownOk()) return;
    window.open(AD_URL, '_blank', 'noopener');
  } catch (e) { /* popup blocked — lewati */ }
}

// ── markAdPending — set flag untuk difire di page-load berikutnya ─────────────
// Gunakan di onclick pada <a href="..."> yang menyebabkan full page navigation
// (kategori, sidebar). detail.js / script.js memanggil firePendingAd() saat load.
export function markAdPending() {
  try {
    if (!_cooldownOk()) return;
    localStorage.setItem(KEY_FLAG, '1');
  } catch (e) {}
}

// ── firePendingAd — fire jika ada flag pending (panggil saat page load) ───────
// Delay 300ms agar browser sudah "settle" dan tidak anggap popup.
export function firePendingAd() {
  try {
    if (localStorage.getItem(KEY_FLAG) !== '1') return;
    localStorage.removeItem(KEY_FLAG);
    setTimeout(() => {
      try { window.open(AD_URL, '_blank', 'noopener'); } catch (e) {}
    }, 300);
  } catch (e) {}
}
