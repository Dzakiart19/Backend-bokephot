# Kampung Bokep

## Overview

Website video streaming 18+ yang men-scrape `bokepcolmek.me` dan menyajikannya lewat API internal + frontend terintegrasi. Backend Node.js/Express berjalan di port 5000, men-serve sekaligus API scraper dan static frontend (HTML + Tailwind CDN + Vanilla JS). Tidak ada database, tidak ada build step.

## User Preferences

- Komunikasi: Bahasa Indonesia, santai dan langsung ke poin.
- Arsitektur: monolitik — satu server Express untuk API dan static files.
- Tidak pakai bundler (Vite/Webpack), tidak pakai framework frontend (React/Vue).

## System Architecture

```
Browser → Express :5000
  ├── /api/bh/*        → scraper (axios → bokepcolmek.me → parse HTML)
  ├── /api/health      → health check
  ├── /api/config      → resolve public backend URL
  └── /*               → static frontend/
```

### Backend (`backend/`)

| File | Fungsi |
|------|--------|
| `index.js` | Entry point, mount routes, serve static |
| `scraper.js` | Homepage, kategori, search, detail video, embed resolver |
| `lib/fetcher.js` | axios + cache wrapper; BASE_URL = `bokepcolmek.me` |
| `lib/parser.js` | Regex parser untuk `<article>` video cards dan pagination |
| `lib/cache.js` | In-memory Map, TTL 5 menit, max 300 entry |
| `lib/helpers.js` | `decodeHtml`, `parseDuration` (ISO 8601), `formatRelativeDate` |
| `lib/categories.js` | 47 kategori hardcoded (slug, name, icon, featured flag) |
| `routes/api.js` | Semua endpoint `/api/bh/*` |
| `routes/proxy.js` | `/api/bh/proxy-thumb` — proxy thumbnail bypass hotlink |
| `routes/misc.js` | `/api/health`, `/api/config`, SPA fallback routes |

### Frontend (`frontend/`)

| File | Fungsi |
|------|--------|
| `index.html` | Homepage: grid video, nav kategori, search bar, pagination |
| `detail.html` | Detail: player overlay, HLS/MP4/iframe player, related videos |
| `favicon.svg` | Favicon SVG (logo KB, gradient pink) |
| `js/script.js` | State management homepage, fetch + render, pagination |
| `js/detail.js` | Fetch detail, setup player (HLS.js/video/iframe), related |
| `js/lib/api.js` | fetch wrappers ke `/api/bh/*` dengan timeout + AbortController |
| `js/lib/cards.js` | HTML builders: grid card, related sidebar, related grid, skeleton |
| `js/lib/nav.js` | Render nav desktop + mobile sidebar, highlight active |
| `js/lib/pagination.js` | Render tombol page dengan ellipsis |
| `js/lib/utils.js` | `escHtml`, `escAttr` (XSS prevention) |
| `js/lib/icons.js` | SVG icon library inline (fill="currentColor") |

## Workflow

**Backend Server**: `node backend/index.js` → port 5000

## Key Decisions

- **Relative API URL**: Frontend pakai `/api/bh/*` — tidak pernah hardcode domain. Otomatis bekerja di dev (localhost) maupun production (Replit deploy).
- **Scraping bukan API resmi**: Data diambil langsung dari HTML sumber menggunakan regex, bukan API eksternal dengan key. Tidak butuh secret key apapun untuk core functionality.
- **No build step**: Tailwind dari CDN, JS native ES modules. Deploy = `node backend/index.js`.
- **SPA routing di Express**: Route `/video/:slug` di-handle backend → kirim `detail.html`, slug dibaca JS dari `location.pathname`.
- **Player multi-mode**: M3U8 → HLS.js, MP4/WebM → `<video>`, sisanya → `<iframe>`.

## Environment Variables

| Variable | Keterangan |
|----------|------------|
| `PORT` | Port server (default: 5000) |
| `REPLIT_DOMAINS` | Diset otomatis Replit — dipakai `/api/config` |
| `REPLIT_URL` | Override manual URL publik backend |
| `SESSION_SECRET` | Tersedia di env tapi belum digunakan (reserved) |
