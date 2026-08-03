# Kampung Bokep

## Overview

Website video streaming 18+ yang men-scrape `bokepcolmek.me` dan menyajikannya lewat API internal + frontend terintegrasi. Backend Node.js/Express berjalan di port 5000, men-serve sekaligus API scraper dan static frontend (HTML + Tailwind CDN + Vanilla JS). Tidak ada database, tidak ada build step.

## User Preferences

- Komunikasi: Bahasa Indonesia, santai dan langsung ke poin.
- Arsitektur: monolitik — satu server Express untuk API dan static files.
- Tidak pakai bundler (Vite/Webpack), tidak pakai framework frontend (React/Vue).
- Minimal external dependency — rate limiter dan utilitas dibuat sendiri tanpa package tambahan.

## System Architecture

```
Browser → Express :5000 (dev) / :PORT (prod)
  ├── /api/bh/*        → rate limit → scraper (axios → bokepcolmek.me → parse HTML)
  ├── /api/health      → health check
  ├── /api/config      → resolve public backend URL
  ├── /api/bh/proxy-thumb → proxy gambar thumbnail (SSRF-whitelist)
  └── /*               → static frontend/ (SPA fallback ke index.html)
```

### Backend (`backend/`)

| File | Fungsi |
|------|--------|
| `index.js` | Entry point, security headers, rate limiting, mount routes |
| `scraper.js` | Homepage, kategori, search, detail video, embed resolver |
| `lib/fetcher.js` | axios + cache wrapper, retry pada timeout, fail-fast pada source 5xx |
| `lib/parser.js` | Regex parser untuk `<article>` video cards dan pagination |
| `lib/cache.js` | In-memory Map, TTL 5 menit, max 300 entry (FIFO eviction) |
| `lib/helpers.js` | `decodeHtml`, `parseDuration` (ISO 8601), `formatRelativeDate` |
| `lib/categories.js` | 47 kategori hardcoded (slug, name, icon, featured flag) |
| `lib/rateLimit.js` | In-memory rate limiter tanpa package eksternal |
| `routes/api.js` | Semua endpoint `/api/bh/*` dengan error mapping (503/504/404) |
| `routes/proxy.js` | `/api/bh/proxy-thumb` — proxy thumbnail bypass hotlink (SSRF-whitelist) |
| `routes/misc.js` | `/api/health`, `/api/config`, SPA fallback, catch-all 404 |

### Frontend (`frontend/`)

| File | Fungsi |
|------|--------|
| `index.html` | Homepage: grid video, nav kategori, search bar, pagination, iklan scripts |
| `detail.html` | Detail: player overlay, HLS/MP4/iframe player, related videos, iklan scripts |
| `config.js` | Runtime config: set `BACKEND_URL` (relative di Replit, absolute di Firebase) |
| `favicon.svg` | Favicon SVG (logo KB, gradient pink) |
| `sw-check-permissions-d17db.js` | ProPush service worker untuk push notification (zone 11484184) |
| `js/script.js` | Logic homepage: state, fetch, render, pagination, ads hook |
| `js/detail.js` | Logic detail: player, related videos, ads hook |
| `js/lib/api.js` | fetch wrappers → `/api/bh/*`, baca body error dari backend |
| `js/lib/ads.js` | **Sistem iklan directlink terpusat** — fire on video click, play, pagination, kategori |
| `js/lib/cards.js` | buildCard variants, skeleton loader, import AD_ONCLICK dari ads.js |
| `js/lib/nav.js` | Render nav desktop + sidebar mobile, markAdPending saat pilih kategori |
| `js/lib/pagination.js` | Tombol halaman dengan ellipsis |
| `js/lib/utils.js` | `escHtml`, `escAttr` (XSS-safe rendering) |
| `js/lib/icons.js` | Koleksi SVG icon inline |

## Sistem Iklan (Directlink)

URL iklan dikonfigurasi di satu tempat: `frontend/js/lib/ads.js` → `AD_URL`.

| Trigger | Mekanisme | File |
|---------|-----------|------|
| Klik video card | `AD_ONCLICK` inline → localStorage flag → fire di detail.js page-load | `cards.js` + `detail.js` |
| Klik play button | `fireAd()` direct (user gesture sync) | `detail.js` overlay click |
| Klik pagination | `fireAd()` direct (user gesture sync) | `script.js` navigateTo() |
| Pilih kategori | `markAdPending()` → localStorage flag → fire di script.js page-load | `nav.js` + `script.js` |

- **Debounce**: 1 detik — cegah double-fire, bukan cooldown panjang
- **Mobile safe**: `window.open()` dari page-load context (tidak dari nested onclick)
- **Ganti URL iklan**: edit `AD_URL` di `frontend/js/lib/ads.js`

## Security

| Header / Kontrol | Nilai |
|---|---|
| `X-Powered-By` | Dihilangkan |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| CORS | `*` (public read-only API) |
| SSRF proxy-thumb | Whitelist host: `bokepcolmek.me`, `i0-i3.wp.com`, `secure.gravatar.com` |
| Rate limit API | 60 req/menit/IP |
| Rate limit proxy-thumb | 120 req/menit/IP |

## Error Handling

Fetcher membedakan jenis error sumber:

| Kondisi | Error | HTTP Response |
|---------|-------|---------------|
| Sumber return 5xx | `SOURCE_5xx` | 503 + pesan user-friendly |
| Timeout (after retry) | `SOURCE_TIMEOUT` | 504 + pesan user-friendly |
| Sumber return 404 | `SOURCE_404` | 404 |
| Error lain | — | 500 |
| Rate limit | — | 429 + `Retry-After` header |

Fetcher retry **2x** untuk network error/timeout, tapi langsung fail untuk HTTP 5xx (retry HTTP 5xx sia-sia).

## Routing

```
/                 → index.html
/detail           → detail.html
/video/:slug      → detail.html
/?q=...           → index.html (search)
/?cat=...         → index.html (kategori)
/api/*            → JSON 404 jika tidak ditemukan
/*                → index.html (SPA fallback)
```

## API

Frontend memanggil backend via **relative URL**:

```javascript
const BASE = '/api/bh';
fetch(`${BASE}/videos?page=1`)
fetch(`${BASE}/video/${slug}`)
```

Error response selalu JSON: `{ error: "...", videos: [] }` (videos: [] untuk list endpoints).

## Deployment

### Replit (dev/preview)
Workflow `Backend Server` menjalankan `node backend/index.js`. Frontend ter-serve otomatis sebagai static dari Express.

### Firebase + Replit (production)
1. Backend tetap di Replit (deploy sebagai Replit App)
2. Frontend di-deploy ke Firebase Hosting via `deploy.sh`
3. `deploy.sh` meng-inject `REPLIT_BACKEND_URL` ke `config.js` sebelum deploy
4. Firebase `rewrites` mengarahkan semua URL ke `index.html`/`detail.html`

## Design System

- **Background**: `bg-pink-950` (#1a0010)
- **Aksen**: `pink-500` – `pink-700`
- **Font**: Plus Jakarta Sans (Google Fonts)
- **CSS**: Tailwind CSS via CDN (tanpa build step)
- **Icon**: SVG inline custom (`frontend/js/lib/icons.js`)
