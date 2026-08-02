# Kampung Bokep

## Overview

Website video streaming 18+ yang men-scrape `bokepcolmek.me` dan menyajikannya lewat API internal + frontend terintegrasi. Backend Node.js/Express berjalan di port 5000 (dev) / PORT env (prod), men-serve sekaligus API scraper dan static frontend (HTML + Tailwind CDN + Vanilla JS). Tidak ada database, tidak ada build step.

## User Preferences

- Komunikasi: Bahasa Indonesia, santai dan langsung ke poin.
- Arsitektur: monolitik — satu server Express untuk API dan static files.
- Tidak pakai bundler (Vite/Webpack), tidak pakai framework frontend (React/Vue).

## System Architecture

```
Browser → Express :5000 (dev) / :PORT (prod)
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
| `config.js` | Runtime config: set `BACKEND_URL` (relative di Replit, absolute di Firebase) |
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

## Deployment

### Backend — Replit Autoscale

- **Production URL**: `https://backend-bokephot--akjgwylm.replit.app`
- **Type**: Autoscale (Cloud Run)
- **Build**: `cd backend && npm install --omit=dev`
- **Run**: `node backend/index.js`
- **Port**: Cloud Run inject PORT otomatis (jangan set PORT di `[userenv.shared]`)

```
[Development]
  Browser → Replit preview (*.replit.dev)
               ↓ Express :5000
          /api/bh/*  →  scraper  →  bokepcolmek.me
          /*         →  static frontend/

[Production — Backend]
  Browser → https://backend-bokephot--akjgwylm.replit.app
               ↓ Express :PORT (Cloud Run)
          /api/bh/*  →  scraper  →  bokepcolmek.me
          /*         →  static frontend/
```

### Frontend Opsional — Firebase Hosting

```
Browser → kampung-bokep.web.app (Firebase)
               ↓ fetch ke BACKEND_URL
          https://backend-bokephot--akjgwylm.replit.app
               ↓ /api/bh/*  →  scraper  →  bokepcolmek.me
```

Deploy: `./deploy.sh` (REPLIT_BACKEND_URL sudah diset di env).

`deploy.sh` patch `frontend/config.js` (inject URL), deploy ke Firebase, lalu restore config.js ke placeholder.

### `frontend/config.js` — Runtime Config

```js
// Di Replit dev/preview (*.replit.dev, *.replit.app, localhost)
window.BACKEND_URL = ''          // → pakai relative URL /api/bh/*

// Di Firebase production
window.BACKEND_URL = 'https://backend-bokephot--akjgwylm.replit.app'  // di-inject deploy.sh
```

Semua fetch di `frontend/js/lib/api.js` pakai `(window.BACKEND_URL || '') + '/api/bh'`.

## Key Decisions

- **PORT development-only**: `PORT=5000` hanya di `[userenv.development]`. Di production, Cloud Run inject PORT-nya sendiri. Jika PORT di-set di `[userenv.shared]`, health check autoscale akan gagal.
- **`config.js` + `deploy.sh` pattern**: config.js simpan placeholder `__REPLIT_BACKEND_URL__`; deploy.sh inject URL sebelum firebase deploy, restore sesudahnya. Tidak ada hardcode domain di source.
- **Scraping bukan API resmi**: Data diambil dari HTML sumber via regex. Tidak butuh secret key apapun untuk core functionality.
- **No build step**: Tailwind dari CDN, JS native ES modules. Tidak perlu bundler.
- **SPA routing**: Di Replit → Express handle `/video/:slug` → `detail.html`. Di Firebase → `firebase.json` rewrites handle hal yang sama.
- **Player multi-mode**: M3U8 → HLS.js, MP4/WebM → `<video>`, sisanya → `<iframe>`.
- **Tidak ada `node-telegram-bot-api`**: Dihapus dari root `package.json` — tidak dipakai di kode manapun dan menarik `request@2.88.2` (Critical CVE) yang diblokir Socket Security Policy saat deploy.

## Environment Variables

| Variable | Scope | Keterangan |
|----------|-------|------------|
| `PORT` | Development only | Port server (default fallback: 5000 di kode) |
| `REPLIT_DOMAINS` | Otomatis Replit | Dipakai `/api/config` untuk resolve URL |
| `REPLIT_URL` | Optional | Override manual URL publik backend di `/api/config` |
| `REPLIT_BACKEND_URL` | Shared | URL publik backend production untuk `deploy.sh` |
| `FRONTEND_URL` | Shared | URL Firebase Hosting |
| `SESSION_SECRET` | Secret | Tersedia di env, belum digunakan (reserved) |

## Firebase

- **Project ID**: `kampung-bokep`
- **Live URL**: `https://kampung-bokep.web.app`
- **Config file**: `firebase.json` (root), `.firebaserc`
- **Deploy**: `./deploy.sh`
