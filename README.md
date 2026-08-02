# Kampung Bokep

Website video streaming 18+ dengan arsitektur scraper — backend Node.js/Express yang men-scrape `bokepcolmek.me` dan menyajikannya lewat API internal, plus frontend Vanilla JS + Tailwind CSS yang di-serve oleh Express yang sama.

## 🏗️ Arsitektur

```
Browser → Express (port 5000 dev / PORT env prod)
              ├── /api/bh/*        → scraper (axios → bokepcolmek.me)
              ├── /api/health      → health check
              ├── /api/config      → resolve public backend URL
              └── /*               → static frontend (frontend/)
```

| Lapisan | Teknologi | Lokasi |
|---------|-----------|--------|
| Web server | Express.js | `backend/index.js` |
| Scraper & parser | Axios + Regex | `backend/scraper.js`, `backend/lib/` |
| In-memory cache | Map (TTL 5 menit, max 300 entry) | `backend/lib/cache.js` |
| Frontend | HTML + Tailwind CDN + Vanilla JS | `frontend/` |

## 📁 Struktur Proyek

```
├── backend/
│   ├── index.js              # Entry point Express
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
├── frontend/
│   ├── index.html            # Homepage (video grid + nav + search + monetization)
│   ├── detail.html           # Halaman video detail + player + monetization
│   ├── favicon.svg
│   ├── config.js             # Runtime config (inject BACKEND_URL)
│   ├── sw-check-permissions-d17db.js  # ProPush service worker (push notifications)
│   └── js/
│       ├── script.js         # Logic homepage (state, load, pagination, search)
│       ├── detail.js         # Logic detail (player HLS/iframe, related videos)
│       └── lib/
│           ├── api.js        # fetch wrappers ke /api/bh/*
│           ├── cards.js      # buildCard (+directlink onclick), related cards, skeleton
│           ├── nav.js        # Render nav kategori + active state
│           ├── pagination.js # Render tombol pagination dengan ellipsis
│           ├── utils.js      # escHtml, escAttr (XSS prevention)
│           └── icons.js      # SVG icon library (fill="currentColor")
├── install.sh                # Setup dependencies + firebase login
├── deploy.sh                 # Deploy frontend ke Firebase Hosting
├── firebase.json             # Firebase Hosting config + rewrites
└── .firebaserc               # Firebase project binding
```

## 🚀 Menjalankan (Development — Replit)

```bash
# Install semua dependencies + login Firebase (interaktif)
bash install.sh

# Atau manual:
cd backend && npm install
node backend/index.js
# → http://localhost:5000
```

Workflow Replit: **Backend Server** (`node backend/index.js`).

Frontend diakses via Replit preview — Express men-serve `frontend/` sebagai static files. `config.js` otomatis set `BACKEND_URL = ''` (relative) karena hostname-nya `*.replit.dev` atau `*.replit.app`.

## ☁️ Deployment

### Backend (Replit Autoscale)

Backend di-deploy langsung dari Replit sebagai autoscale service.

- **Production URL**: `https://backend-bokephot--akjgwylm.replit.app`
- **Deploy**: Klik Publish di Replit UI
- **Build command**: `cd backend && npm install --omit=dev`
- **Run command**: `node backend/index.js`
- **Port**: Cloud Run inject PORT otomatis (jangan set PORT di `[userenv.shared]`)

Verify:
```bash
curl https://backend-bokephot--akjgwylm.replit.app/api/health
```

### Frontend (Firebase Hosting)

```
Browser → kampung-bokep.web.app (Firebase)
               ↓ API calls ke BACKEND_URL
          https://backend-bokephot--akjgwylm.replit.app
               ↓ scrape
          bokepcolmek.me
```

```bash
bash deploy.sh
```

Script `deploy.sh`:
1. Baca `REPLIT_BACKEND_URL` — prioritas: env var → `.replit` file → config.js terpatch
2. Patch `frontend/config.js` — isi `__REPLIT_BACKEND_URL__` dengan URL backend
3. `firebase deploy --only hosting --project kampung-bokep`
4. Restore `config.js` ke placeholder

**Firebase live**: `https://kampung-bokep.web.app`

### `frontend/config.js` — Runtime Config

```js
// Di Replit dev/preview (*.replit.dev, *.replit.app, localhost)
window.BACKEND_URL = ''          // → pakai relative URL /api/bh/*

// Di Firebase production (kampung-bokep.web.app)
window.BACKEND_URL = 'https://backend-bokephot--akjgwylm.replit.app'  // di-inject deploy.sh
```

## 🌐 API Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Backend URL (untuk auto-detect) |
| GET | `/api/bh/videos?page=` | Daftar video homepage (tanpa filter) |
| GET | `/api/bh/categories` | 47 kategori |
| GET | `/api/bh/category/:slug?page=` | Video per kategori |
| GET | `/api/bh/search?q=&page=` | Pencarian video |
| GET | `/api/bh/video/:slug` | Detail video (title, embed, related) |
| GET | `/api/bh/video/:slug/embed` | Resolve embed URL |
| GET | `/api/bh/proxy-thumb?url=` | Proxy thumbnail (bypass hotlink) |

## ⚙️ Environment Variables

| Variable | Scope | Keterangan |
|----------|-------|------------|
| `PORT` | Development only | Port server (default fallback: 5000) |
| `REPLIT_DOMAINS` | Otomatis Replit | Dipakai `/api/config` untuk resolve URL |
| `REPLIT_URL` | Optional | Override manual backend URL di `/api/config` |
| `REPLIT_BACKEND_URL` | Shared | URL publik backend, dipakai `deploy.sh` |
| `FRONTEND_URL` | Shared | URL Firebase Hosting |

> `PORT` hanya di-set untuk development. Di production (autoscale), Cloud Run inject PORT-nya sendiri.

## 💰 Monetisasi (ProPush.me)

Semua monetisasi di-load di `frontend/index.html` dan `frontend/detail.html`.

| Script / File | Fungsi | Zone / ID |
|---------------|--------|-----------|
| `<meta name="pushsdk">` | Verifikasi domain ProPush | `074da8d33ed888fb7f717174880a7a87` |
| `sw-check-permissions-d17db.js` | Service worker push notification | zone `11484184` |
| ProPush SDK (`mw.min.js`) | Push notification subscriber | zone `11484184` |
| Replace trafficback | Redirect user yg allow/deny push ke offer | `rm358.com/4/11484237` |
| In-app redirect | Buka Chrome dari Facebook/in-app browser | `rm358.com/4/11484237` |
| Card `onclick` (cards.js) | Buka directlink di tab baru setiap klik video | `rm358.com/4/11476496` |
| History guard | Override `location.replace` + push state agar back button tidak keluar website | — |

### Urutan load script di HTML (bawah `</body>`):
1. **History guard** — harus pertama, override `location.replace` sebelum ProPush load
2. **ProPush SDK** — push notification + trafficback
3. **In-app redirect** — handle Facebook/WebView browser

### Catatan penting:
- **Tidak ada duplikat directlink**: Happy Tag dihapus karena sama URL dengan card `onclick`. Card `onclick` lebih baik (synchronous, langsung, spesifik video saja).
- **History guard wajib ada sebelum ProPush**: ProPush memanggil `window.location.replace()` saat permission event — tanpa guard, halaman terhapus dari history dan back button keluar website.

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
  "axios":   "^1.13.x",  // HTTP client untuk scraping
  "cors":    "^2.8.x",   // CORS middleware
  "dotenv":  "^17.2.x",  // .env loader
  "express": "^5.2.x"    // Web framework
}
```

> Root `package.json` juga punya express/cors/dotenv/axios untuk dev convenience, tapi yang dipakai server adalah `backend/package.json`. Versi Express di root adalah 4.x, di backend 5.x — konsisten saat production deploy (`cd backend && npm install`).

## 🔧 Troubleshooting

**`bash deploy.sh` error REPLIT_BACKEND_URL tidak ditemukan** → Pastikan `.replit` punya `REPLIT_BACKEND_URL = "https://..."` di `[userenv.shared]`. Script otomatis baca dari sana jika env var tidak ter-export ke shell.

**Video tidak muncul** → Cek koneksi ke `bokepcolmek.me`, lihat log backend untuk error scraping.

**Thumbnail 404** → Gunakan endpoint `/api/bh/proxy-thumb?url=<thumb_url>` untuk bypass hotlink protection. Hanya menerima host dari whitelist (`bokepcolmek.me`, `i0-i3.wp.com`, `secure.gravatar.com`).

**Embed tidak bisa diputar** → Source mungkin butuh iframe (xhamster, xvideos, dll) — player sudah handle otomatis.

**Deploy gagal (E403 / CVE blocked)** → Pastikan tidak ada package dengan Critical CVE di `package.json`. Root `package.json` hanya boleh berisi package yang benar-benar dipakai.

**Health check gagal saat publish** → Pastikan `PORT` tidak di-set di `[userenv.shared]` — biarkan Cloud Run inject PORT-nya sendiri.

**Back button langsung keluar website** → Pastikan history guard script ada di atas ProPush SDK di HTML. Jika hilang, tambahkan kembali sebelum `<!-- ProPush Push Notification SDK -->`.
