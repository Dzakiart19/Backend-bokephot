# Frontend — Kampung Bokep

Static frontend yang di-serve langsung oleh Express backend. Tidak ada build step — semua berjalan di browser dengan Tailwind CSS dari CDN.

## Struktur

```
frontend/
├── index.html        # Homepage: video grid, nav kategori, search, pagination
├── detail.html       # Halaman detail: video player + info + related videos
├── favicon.svg       # Favicon (SVG, logo KB)
└── js/
    ├── script.js     # Logic homepage (state, fetch, render, pagination)
    ├── detail.js     # Logic detail page (player HLS/MP4/iframe, related)
    └── lib/
        ├── api.js        # fetch wrappers → /api/bh/* (relative URL)
        ├── cards.js      # buildCard (grid), buildRelatedCard* (sidebar/mobile), skeleton
        ├── nav.js        # Render nav desktop + sidebar mobile, active states
        ├── pagination.js # Render tombol halaman dengan ellipsis
        ├── utils.js      # escHtml, escAttr (XSS-safe rendering)
        └── icons.js      # Koleksi SVG icon (fill="currentColor")
```

## Halaman

### `index.html` + `script.js`
- Grid video responsif: 2 → 3 → 4 → 5 → 6 kolom
- Nav kategori featured (desktop) + sidebar semua kategori (mobile)
- Search via URL param `?q=keyword`
- Filter kategori via URL param `?cat=slug`
- Pagination dengan `history.pushState` (no full reload)
- Skeleton loading + empty state + error state

### `detail.html` + `detail.js`
- Slug dibaca dari URL `/video/:slug`
- **Player**: klik overlay → resolve embed URL → pilih mode:
  - `.m3u8` → HLS.js (atau native jika browser support)
  - `.mp4` / `.webm` → native `<video>`
  - URL lainnya → `<iframe>` (xvideos, xhamster, fbplay, dll)
  - Tidak ada embed → fallback ke link "Tonton di Sumber Asli"
- Related videos: sidebar desktop + grid 2 kolom mobile (max 8)

## Routing

Semua URL non-file di-handle Express → dikembalikan ke `index.html` atau `detail.html`:

```
/                 → index.html
/detail           → detail.html
/video/:slug      → detail.html (slug dibaca JS dari location.pathname)
/?q=...           → index.html (search)
/?cat=...         → index.html (kategori)
```

## API

Frontend memanggil backend via **relative URL** — tidak ada hardcode domain:

```javascript
const BASE = '/api/bh';
fetch(`${BASE}/videos?page=1`)
fetch(`${BASE}/video/${slug}`)
// dst.
```

## Design System

- **Background**: `bg-pink-950` (#1a0010)
- **Aksen**: `pink-500` – `pink-700`
- **Font**: Plus Jakarta Sans (Google Fonts)
- **CSS framework**: Tailwind CSS via `cdn.tailwindcss.com`
- **Icon**: SVG inline custom (`frontend/js/lib/icons.js`)
- **Scrollbar custom**: pink-950 track, pink-800 thumb
- **Skeleton animation**: shimmer gradient
