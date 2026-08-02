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
├── index.js          # Express app, middleware, route mounting
├── scraper.js        # Core scraper: homepage, kategori, search, detail, embed
├── lib/
│   ├── fetcher.js    # axios wrapper + in-memory cache (TTL 5 menit)
│   ├── parser.js     # parseVideoCards (article.loop-video), parseTotalPages
│   ├── cache.js      # Map-based TTL cache, max 300 entry
│   ├── helpers.js    # decodeHtml, parseDuration (ISO 8601), formatRelativeDate
│   └── categories.js # 47 kategori hardcoded (slug, name, icon, featured)
└── routes/
    ├── api.js        # /api/bh/* — semua endpoint data video
    ├── proxy.js      # /api/bh/proxy-thumb — proxy gambar thumbnail
    └── misc.js       # /api/health, /api/config, SPA page fallbacks
```

## API Endpoints

### Data Video (`/api/bh/`)

```
GET /api/bh/videos?page=1
GET /api/bh/categories
GET /api/bh/category/:slug?page=1
GET /api/bh/search?q=keyword&page=1
GET /api/bh/video/:slug
GET /api/bh/video/:slug/embed
```

### Utilitas

```
GET /api/bh/proxy-thumb?url=<image_url>    # Proxy thumbnail (bypass hotlink)
GET /api/health                             # Health check
GET /api/config                             # Resolve public backend URL
```

## Scraping Logic

- **Sumber**: `https://bokepcolmek.me` (WordPress + RetroTube theme)
- **Fetch**: `axios.get` dengan User-Agent Chrome, cache otomatis per URL
- **Parse video cards**: `<article class="loop-video thumb-block">` → regex slug, title, thumbnail, durasi
- **Parse paginasi**: Link "Last" atau angka terbesar dari `/page/N` di HTML
- **Embed URL**: `itemprop="embedURL"` dari structured data (tidak butuh decrypt)
- **Kategori video**: `<body class="category-*">` → cocokkan ke `categories.js`
- **Related videos**: Bagian `id="related-videos"` → di-parse ulang dengan `parseVideoCards`

## Caching

- **Jenis**: In-memory (Map), per proses Node.js
- **TTL**: 5 menit
- **Max**: 300 entry (FIFO eviction)
- **Key**: URL halaman untuk HTML; `embed_<slug>` untuk embed URL

## Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `PORT` | `5000` | Port server |
| `REPLIT_DOMAINS` | — | Diset otomatis Replit |
| `REPLIT_URL` | — | Override URL di `/api/config` |

Buat file `.env` dari `.env.example` untuk development lokal.
