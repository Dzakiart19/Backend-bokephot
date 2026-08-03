# Frontend — Kampung Bokep

Static frontend yang di-serve langsung oleh Express backend. Tidak ada build step — semua berjalan di browser dengan Tailwind CSS dari CDN.

## Struktur

```
frontend/
├── index.html                    # Homepage: video grid, nav kategori, search, pagination
├── detail.html                   # Halaman detail: video player + info + related videos
├── favicon.svg                   # Favicon (SVG, logo KB)
├── config.js                     # Runtime config: set BACKEND_URL
├── sw-check-permissions-d17db.js # ProPush service worker (push notification ads)
└── js/
    ├── script.js     # Logic homepage (state, fetch, render, pagination, ads)
    ├── detail.js     # Logic detail page (player HLS/MP4/iframe, related, ads)
    └── lib/
        ├── ads.js        # ★ Sistem iklan directlink terpusat
        ├── api.js        # fetch wrappers → /api/bh/* (relative URL, baca error body)
        ├── cards.js      # buildCard variants, skeleton, import AD_ONCLICK
        ├── nav.js        # Render nav + sidebar, markAdPending saat pilih kategori
        ├── pagination.js # Render tombol halaman dengan ellipsis
        ├── utils.js      # escHtml, escAttr (XSS-safe rendering)
        └── icons.js      # Koleksi SVG icon inline (fill="currentColor")
```

## Halaman

### `index.html` + `script.js`
- Grid video responsif: 2 → 3 → 4 → 5 → 6 kolom
- Nav kategori featured (desktop) + sidebar semua kategori (mobile)
- Search via URL param `?q=keyword`
- Filter kategori via URL param `?cat=slug`
- Pagination dengan `history.pushState` (no full reload, SPA)
- Skeleton loading + empty state + error state dengan tombol **Coba Lagi** (`window.loadVideos`)
- `firePendingAd()` dipanggil saat boot — tangkap iklan dari klik kategori sebelumnya

### `detail.html` + `detail.js`
- Slug dibaca dari URL `/video/:slug`
- **Player**: klik overlay → resolve embed URL → pilih mode:
  - `.m3u8` → HLS.js (atau native jika browser support)
  - `.mp4` / `.webm` → native `<video>`
  - URL lainnya → `<iframe>` (xvideos, xhamster, fbplay, dll)
  - Tidak ada embed → fallback ke link "Tonton di Sumber Asli"
- Related videos: sidebar desktop + grid 2 kolom mobile (max 8)
- Error state dengan tombol **Coba Lagi** (`window.loadDetail`) dan **Kembali ke Home**
- `firePendingAd()` dipanggil saat boot — tangkap iklan dari klik video card

## Sistem Iklan Directlink (`js/lib/ads.js`)

Satu file konfigurasi untuk semua iklan. **Ganti URL cukup di satu tempat**:

```javascript
// frontend/js/lib/ads.js
export const AD_URL = 'https://rm358.com/4/11476496'; // ← ganti di sini
```

### Titik-titik iklan aktif

| Event | Mekanisme | Kapan fire |
|-------|-----------|-----------|
| Klik video card | Inline onclick → set flag localStorage | Saat detail page load (page-load context) |
| Klik play button | `fireAd()` sync | Saat overlay diklik (user gesture) |
| Klik pagination | `fireAd()` sync | Di dalam `navigateTo()` (user gesture) |
| Pilih kategori | `markAdPending()` → flag localStorage | Saat homepage berikutnya load |

### Kenapa dua mekanisme berbeda?

- **`fireAd()` direct** — aman jika dipanggil synchronous di dalam event handler click (browser tahu itu user gesture, `window.open()` tidak diblokir)
- **localStorage flag** — untuk klik yang langsung menyebabkan navigasi halaman (card → detail, kategori → index). `window.open()` dipanggil di page-load berikutnya (300ms delay) — lebih reliable di mobile browser

### Debounce
1 detik — mencegah double-fire jika user klik cepat dua kali. **Bukan cooldown** — iklan tetap muncul di setiap klik baru.

## API Error Handling

`api.js` membaca body JSON dari backend saat response tidak ok:

```javascript
// Error dari backend → tampil pesan informatif, bukan "HTTP 503"
// "Sumber sedang tidak tersedia (502). Coba lagi nanti."
```

## Routing

Semua URL non-file di-handle Express → dikembalikan ke `index.html` atau `detail.html`:

```
/                 → index.html
/detail           → detail.html
/video/:slug      → detail.html (slug dibaca JS dari location.pathname)
/?q=...           → index.html (search)
/?cat=...         → index.html (kategori)
/*                → index.html (SPA fallback)
```

## config.js

Runtime config yang resolve `BACKEND_URL`:

```
Replit dev/preview  → BACKEND_URL = '' (relative, langsung ke server Express)
Firebase production → BACKEND_URL = 'https://xxx.replit.app' (di-inject deploy.sh)
```

## Design System

- **Background**: `bg-pink-950` (#1a0010)
- **Aksen**: `pink-500` – `pink-700`
- **Font**: Plus Jakarta Sans (Google Fonts)
- **CSS framework**: Tailwind CSS via `cdn.tailwindcss.com` (no build step)
- **Icon**: SVG inline custom (`js/lib/icons.js`)
- **Scrollbar custom**: pink-950 track, pink-800 thumb
- **Skeleton animation**: shimmer gradient
