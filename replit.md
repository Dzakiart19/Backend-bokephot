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
| `index.html` | Homepage: grid video, nav kategori, search bar, pagination + semua monetization script |
| `detail.html` | Detail: player overlay, HLS/MP4/iframe player, related videos + semua monetization script |
| `config.js` | Runtime config: set `BACKEND_URL` (relative di Replit, absolute di Firebase) |
| `favicon.svg` | Favicon SVG (logo KB, gradient pink) |
| `sw-check-permissions-d17db.js` | ProPush service worker untuk push notification (zone 11484184) |
| `js/script.js` | State management homepage, fetch + render, pagination |
| `js/detail.js` | Fetch detail, setup player (HLS.js/video/iframe), related |
| `js/lib/api.js` | fetch wrappers ke `/api/bh/*` dengan timeout + AbortController |
| `js/lib/cards.js` | HTML builders: grid card + related cards + skeleton; tiap card punya `onclick` buka directlink |
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

### Frontend — Firebase Hosting

```
Browser → kampung-bokep.web.app (Firebase)
               ↓ fetch ke BACKEND_URL
          https://backend-bokephot--akjgwylm.replit.app
               ↓ /api/bh/*  →  scraper  →  bokepcolmek.me
```

Deploy: `bash deploy.sh`

`deploy.sh` baca `REPLIT_BACKEND_URL` dengan urutan prioritas:
1. Env var shell (`export REPLIT_BACKEND_URL=...`)
2. Baca dari `.replit` file (`[userenv.shared]`) — **ini yang dipakai saat `bash deploy.sh` dari terminal**
3. Ekstrak dari `config.js` yang sudah terpatch sebelumnya

Lalu patch `frontend/config.js`, deploy ke Firebase, restore config.js ke placeholder.

### `frontend/config.js` — Runtime Config

```js
// Di Replit dev/preview (*.replit.dev, *.replit.app, localhost)
window.BACKEND_URL = ''          // → pakai relative URL /api/bh/*

// Di Firebase production
window.BACKEND_URL = 'https://backend-bokephot--akjgwylm.replit.app'  // di-inject deploy.sh
```

Semua fetch di `frontend/js/lib/api.js` pakai `(window.BACKEND_URL || '') + '/api/bh'`.

## Monetisasi (ProPush.me)

Semua script monetisasi ada di bagian bawah `<body>` pada `index.html` dan `detail.html`, **dalam urutan ini**:

### 1. History Guard (harus pertama)
```js
// Push 2 history entry ekstra saat load
// Override window.location.replace() → push history dulu sebelum redirect
// popstate listener → cegah back button keluar website
```
**Wajib ada sebelum ProPush SDK** karena ProPush memanggil `location.replace()` saat permission event — tanpa guard, halaman terhapus dari history stack dan back button keluar website.

### 2. ProPush Push Notification SDK
- Zone ID: `11484184`
- SW file: `/sw-check-permissions-d17db.js`
- Replace (trafficback) URL: `rm358.com/4/11484237`
- Trigger: `onPermissionAllowed` dan `onPermissionDenied`

### 3. In-app Redirect
- Trafficback URL: `rm358.com/4/11484237`
- Trigger: klik di dalam Facebook/WebView browser di Android → buka Chrome via `intent://`

### 4. Card Directlink (`js/lib/cards.js`)
- URL: `rm358.com/4/11476496`
- Trigger: setiap klik video card (grid homepage + related list + related grid)
- Implementasi: `onclick="window.open('...')"` langsung di `<a>` tag — synchronous, tidak bisa diblock browser

### Zona / ID Ringkasan

| ID | Platform | Fungsi |
|----|----------|--------|
| `074da8d33ed888fb7f717174880a7a87` | ProPush meta tag | Verifikasi domain `kampung-bokep.web.app` |
| `11484184` | ProPush SDK zone | Push notification subscriber |
| `11484237` | rm358.com offer | Trafficback (push allow/deny + in-app redirect) |
| `11476496` | rm358.com offer | Directlink (klik video card) |

## Key Decisions

- **PORT development-only**: `PORT=5000` hanya di `[userenv.development]`. Di production, Cloud Run inject PORT-nya sendiri. Jika PORT di-set di `[userenv.shared]`, health check autoscale akan gagal.
- **`config.js` + `deploy.sh` pattern**: config.js simpan placeholder `__REPLIT_BACKEND_URL__`; deploy.sh inject URL sebelum firebase deploy, restore sesudahnya. Tidak ada hardcode domain di source.
- **deploy.sh baca `.replit` langsung**: `REPLIT_BACKEND_URL` dari `[userenv.shared]` tidak ter-export otomatis ke shell terminal. deploy.sh pakai `grep` untuk baca nilai dari file `.replit` sebagai fallback.
- **Scraping bukan API resmi**: Data diambil dari HTML sumber via regex. Tidak butuh secret key apapun untuk core functionality.
- **No build step**: Tailwind dari CDN, JS native ES modules. Tidak perlu bundler.
- **SPA routing**: Di Replit → Express handle `/video/:slug` → `detail.html`. Di Firebase → `firebase.json` rewrites handle hal yang sama.
- **Player multi-mode**: M3U8 → HLS.js, MP4/WebM → `<video>`, sisanya → `<iframe>`.
- **Tidak ada `node-telegram-bot-api`**: Dihapus dari root `package.json` — tidak dipakai di kode manapun dan menarik `request@2.88.2` (Critical CVE) yang diblokir Socket Security Policy saat deploy.
- **NaN guard di scraper**: Semua fungsi paginasi (`scrapeHomepage`, `scrapeCategory`, `scrapeSearch`) validasi `parseInt(page)` — fallback ke 1 jika NaN atau < 1.
- **Proxy thumbnail — SSRF whitelist**: `proxy.js` hanya izinkan host dari daftar eksplisit (`bokepcolmek.me`, `i0-i3.wp.com`, `secure.gravatar.com`). URL di luar daftar → 403.
- **`decodeHtml` lengkap**: Handles `&nbsp;`, `&mdash;`, `&laquo;`, `&raquo;`, `&bull;`, `&copy;`, `&reg;`, `&trade;` selain entities dasar.
- **Tidak ada duplikat directlink**: Happy Tag (click-on-all) dihapus karena URL-nya sama dengan card `onclick`. Dua script dengan URL identik = dua tab iklan identik per klik video. Card `onclick` lebih baik: synchronous (browser tidak block), spesifik video, langsung tanpa delay.
- **History guard wajib sebelum ProPush**: Urutan script di HTML penting — history guard harus override `location.replace` sebelum ProPush SDK load dan mulai memanggil Replace().

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
- **Deploy**: `bash deploy.sh`
