# Kampung Bokep

Website video streaming 18+ dengan arsitektur scraper — backend Node.js/Express yang men-scrape `bokepcolmek.me` dan menyajikannya lewat API internal, plus frontend vanilla JS + Tailwind CSS yang di-serve oleh Express yang sama.

## 🏗️ Arsitektur

```
Browser → Express (port 5000)
              ├── /api/bh/*   → scraper (axios → bokepcolmek.me)
              ├── /api/health, /api/config
              └── /*          → static frontend (frontend/)
```

| Lapisan | Teknologi | Lokasi |
|---------|-----------|--------|
| Web server | Express.js | `backend/index.js` |
| Scraper & parser | Axios + Regex | `backend/scraper.js`, `backend/lib/` |
| In-memory cache | Map (TTL 5 menit) | `backend/lib/cache.js` |
| Frontend | HTML + Tailwind CDN + Vanilla JS | `frontend/` |

## 📁 Struktur Proyek

```
├── backend/
│   ├── index.js              # Entry point Express, port 5000
│   ├── scraper.js            # Homepage, kategori, search, detail, embed resolver
│   ├── lib/
│   │   ├── fetcher.js        # axios + cache wrapper, BASE_URL sumber
│   │   ├── parser.js         # parseVideoCards, parseTotalPages (regex)
│   │   ├── cache.js          # In-memory TTL cache (5 menit, max 300 entry)
│   │   ├── helpers.js        # decodeHtml, parseDuration, formatRelativeDate
│   │   └── categories.js     # 47 kategori hardcoded (slug + icon + featured)
│   ├── routes/
│   │   ├── api.js            # GET /api/bh/videos, /categories, /category/:slug,
│   │   │                     #     /search, /video/:slug, /video/:slug/embed
│   │   ├── proxy.js          # GET /api/bh/proxy-thumb (proxy thumbnail hotlink)
│   │   └── misc.js           # GET /api/health, /api/config, SPA page routes
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html            # Homepage (video grid + nav + search)
    ├── detail.html           # Halaman video detail + player
    ├── favicon.svg
    └── js/
        ├── script.js         # Logic homepage (state, load, pagination, search)
        ├── detail.js         # Logic detail (player HLS/iframe, related videos)
        └── lib/
            ├── api.js        # fetch wrappers ke /api/bh/*
            ├── cards.js      # buildCard, buildRelatedCardList/Grid, skeleton
            ├── nav.js        # Render nav kategori + active state
            ├── pagination.js # Render tombol pagination dengan ellipsis
            ├── utils.js      # escHtml, escAttr
            └── icons.js      # SVG icon library (fill="currentColor")
```

## 🚀 Menjalankan (Development — Replit)

```bash
# Install dependencies backend
cd backend && npm install

# Jalankan server
node backend/index.js
# → http://localhost:5000
```

Workflow Replit: **Backend Server** (`node backend/index.js`).

Frontend diakses via Replit preview — Express men-serve `frontend/` sebagai static files. `config.js` otomatis set `BACKEND_URL = ''` (relative) karena hostname-nya `*.replit.dev`.

## 🔥 Deploy Frontend ke Firebase

Frontend dapat di-deploy terpisah ke Firebase Hosting (project: **kampung-bokep**) sementara backend tetap jalan di Replit.

```
Browser (Firebase) → kampung-bokep.web.app
                          ↓ (API calls ke BACKEND_URL)
              Replit Backend → xxx.replit.app/api/bh/*
                          ↓ (scrape)
                    bokepcolmek.me
```

### Cara deploy:

```bash
# Set URL publik Replit backend (lihat di: Replit → Share → Invite Link / domain)
export REPLIT_BACKEND_URL=https://<nama-proyek>.<user>.replit.app

# Jalankan deploy script
./deploy.sh
```

Script `deploy.sh` secara otomatis:
1. Patch `frontend/config.js` — isi placeholder `__REPLIT_BACKEND_URL__` dengan URL backend
2. Jalankan `firebase deploy --only hosting --project kampung-bokep`
3. Restore `config.js` kembali ke placeholder setelah deploy selesai

> **Catatan**: `REPLIT_BACKEND_URL` bukan secret — ini URL publik. Set sebagai env var biasa di Replit (bukan Secrets).

## 🌐 API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Backend URL (untuk auto-detect) |
| GET | `/api/bh/videos?page=` | Daftar video homepage |
| GET | `/api/bh/categories` | 47 kategori |
| GET | `/api/bh/category/:slug?page=` | Video per kategori |
| GET | `/api/bh/search?q=&page=` | Pencarian video |
| GET | `/api/bh/video/:slug` | Detail video (title, embed, related) |
| GET | `/api/bh/video/:slug/embed` | Resolve embed URL |
| GET | `/api/bh/proxy-thumb?url=` | Proxy thumbnail (bypass hotlink) |

## ⚙️ Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `5000` | Port server |
| `REPLIT_DOMAINS` | — | Diset otomatis Replit, dipakai `/api/config` |
| `REPLIT_URL` | — | Override backend URL untuk `/api/config` |

## 🎨 Frontend

- **Tema**: Dark pink/rose (`bg-pink-950`)
- **Font**: Plus Jakarta Sans (Google Fonts)
- **CSS**: Tailwind CSS via CDN (tidak butuh build step)
- **Player**: Native `<video>` untuk MP4/M3U8, HLS.js untuk stream, `<iframe>` untuk embed eksternal
- **Routing**: SPA — URL `/video/:slug` di-handle Express → `detail.html`
- **API calls**: Semua menggunakan relative URL `/api/bh/*` (tidak hardcode domain)

## 📦 Dependencies Backend

```json
{
  "axios":   "^1.x",   // HTTP client untuk scraping
  "cors":    "^2.x",   // CORS middleware
  "dotenv":  "^16.x",  // .env loader
  "express": "^4.x"    // Web framework
}
```

## 🔧 Troubleshooting

**Video tidak muncul** → Cek koneksi ke `bokepcolmek.me`, lihat log backend untuk error scraping.

**Thumbnail 404** → Gunakan endpoint `/api/bh/proxy-thumb?url=<thumb_url>` untuk bypass hotlink protection.

**Embed tidak bisa diputar** → Source mungkin butuh iframe (xhamster, xvideos, dll) — player sudah handle otomatis.
