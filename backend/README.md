# Backend — Kampung Bokep

Node.js + Express server yang men-scrape `bokepcolmek.me` dan menyajikannya sebagai API internal. Frontend di-serve sebagai static files dari folder `../frontend/`.

## Menjalankan

```bash
npm install
npm start        # node index.js
npm run dev      # nodemon index.js (auto-reload)
```

Server berjalan di `http://localhost:5000` (atau sesuai `PORT` env var).

## Struktur

```
backend/
├── index.js          # Express app, security headers, rate limiting, route mounting
├── scraper.js        # Core scraper: homepage, kategori, search, detail, embed
├── lib/
│   ├── fetcher.js    # axios wrapper + in-memory cache + retry logic
│   ├── parser.js     # parseVideoCards (article.loop-video), parseTotalPages
│   ├── cache.js      # Map-based TTL cache, max 300 entry, FIFO eviction
│   ├── helpers.js    # decodeHtml, parseDuration (ISO 8601), formatRelativeDate
│   ├── categories.js # 47 kategori hardcoded (slug, name, icon, featured)
│   └── rateLimit.js  # In-memory rate limiter (tanpa package eksternal)
└── routes/
    ├── api.js        # /api/bh/* — semua endpoint data video + error mapping
    ├── proxy.js      # /api/bh/proxy-thumb — proxy gambar (SSRF whitelist)
    └── misc.js       # /api/health, /api/config, SPA fallback, catch-all 404
```

## API Endpoints

### Data Video (`/api/bh/`)

```
GET /api/bh/videos?page=1           # Homepage videos (page 1–2000)
GET /api/bh/categories              # 47 kategori (tidak hit external site)
GET /api/bh/category/:slug?page=1   # Video per kategori
GET /api/bh/search?q=keyword&page=1 # Search (q wajib, kosong → empty)
GET /api/bh/video/:slug             # Detail + embed URL + related + kategori
GET /api/bh/video/:slug/embed       # Resolve embed URL saja (cached)
```

### Utilitas

```
GET /api/bh/proxy-thumb?url=<image_url>    # Proxy thumbnail (bypass hotlink)
GET /api/health                             # Health check
GET /api/config                             # Resolve public backend URL
```

### Error Responses

Semua endpoint mengembalikan JSON. List endpoints selalu include `videos: []` saat error:

| Kondisi | HTTP | Body |
|---------|------|------|
| Sumber return 5xx (502, 503, dll) | 503 | `{ error: "Sumber sedang tidak tersedia (502). Coba lagi nanti.", videos: [] }` |
| Timeout setelah retry | 504 | `{ error: "Sumber tidak merespons. Coba lagi beberapa saat.", videos: [] }` |
| Sumber return 404 | 404 | `{ error: "Halaman tidak ditemukan di sumber.", videos: [] }` |
| Rate limit tercapai | 429 | `{ error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." }` + `Retry-After` header |
| Endpoint tidak ada | 404 | `{ error: "Endpoint tidak ditemukan" }` |

## Scraping Logic

- **Sumber**: `https://bokepcolmek.me` (WordPress + RetroTube theme)
- **Fetch**: `axios.get` dengan User-Agent Chrome, cache otomatis per URL, timeout 30 detik
- **Retry**: 2x untuk timeout/network error; langsung fail untuk HTTP 5xx (tidak retry)
- **Parse video cards**: `<article class="loop-video thumb-block">` → regex slug, title, thumbnail, durasi
- **Parse paginasi**: Link "Last" atau angka terbesar dari `/page/N`, di-cap `MAX_PAGE=2000`
- **Embed URL**: `itemprop="embedURL"` dari structured data
- **Kategori video**: `<body class=["']category-*["']>` → cocokkan ke `categories.js`
- **Related videos**: Bagian `id="related-videos"` → re-parse dengan `parseVideoCards`, max 12

## Caching

- **Jenis**: In-memory (Map), per proses Node.js
- **TTL**: 5 menit
- **Max**: 300 entry (FIFO eviction — hapus entry terlama saat penuh)
- **Key**: URL halaman untuk HTML; `embed_<slug>` untuk embed URL

## Security

| Kontrol | Detail |
|---------|--------|
| `X-Powered-By` | Dihilangkan (`app.disable('x-powered-by')`) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| Rate limit (API) | 60 req/menit/IP, return 429 + `Retry-After` |
| Rate limit (proxy-thumb) | 120 req/menit/IP |
| SSRF protection | proxy-thumb hanya izinkan host: `bokepcolmek.me`, `i0-i3.wp.com`, `secure.gravatar.com` |
| CORS | `*` — public read-only API |

## Rate Limiting

Diimplementasikan di `lib/rateLimit.js` tanpa package eksternal:
- Per-IP, per-window (in-memory Map)
- Cleanup otomatis setiap 1 window untuk cegah memory leak
- Support `X-Forwarded-For` header (Replit proxy)

## Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `5000` | Port server |
| `REPLIT_DOMAINS` | — | Diset otomatis Replit |
| `REPLIT_URL` | — | Override URL di `/api/config` |

Buat file `.env` dari `.env.example` untuk development lokal.
