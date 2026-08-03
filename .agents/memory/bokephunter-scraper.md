---
name: BokepHunter / BokepColmek scraper quirks
description: Perilaku non-obvious dari sumber site bokepcolmek.me yang mempengaruhi cara scraper harus bekerja
---

## Quirk #1 — Slug tidak valid → HTTP 200 bukan 404

Sumber site mengembalikan HTTP 200 + halaman homepage untuk slug `/vids/` apapun yang tidak valid, bukan HTTP 404. Fetcher tidak bisa membedakan ini karena statusnya tetap 200.

**Fix:** Di `scraper.js` → fungsi `isVideoDetailPage(html)` memeriksa keberadaan meta tag video:
- `article:published_time`
- `itemprop="embedURL"`
- `itemprop="duration"`

Jika tidak satu pun ada → lempar `SOURCE_404`.

**Why:** Tanpa ini, `/api/bh/video/slug-ngawur` mengembalikan HTTP 200 dengan data semi-kosong (judul diambil dari homepage). Frontend akan render halaman detail kosong alih-alih redirect ke 404.

**How to apply:** Setiap fungsi yang fetch `/vids/{slug}/` harus memanggil `isVideoDetailPage(html)` sebelum parsing. Sudah diterapkan di `scrapeVideoDetail()` dan `resolveEmbedUrl()`.

---

## Quirk #2 — Body class tidak mengandung `category-{slug}`

WordPress biasanya menambahkan `category-{slug}` pada `<body class="...">` di halaman post. Tema **retrotube** yang dipakai sumber site TIDAK melakukan ini.

Body class aktual:
```
wp-singular post-template-default single single-post postid-XXXXXX single-format-standard wp-embed-responsive wp-theme-retrotube
```

**Fix:** Di `scraper.js` → fungsi `parseCategoriesFromContent(html, allCats)`:
- Scope pencarian ke bagian `entry-content` saja (bukan seluruh halaman, karena nav menu memuat SEMUA kategori sebagai list).
- Parse href `/kategori/{slug}/` dalam scope tersebut.

**Why:** Nav menu di setiap halaman menampilkan semua 47 kategori — tanpa scoping ke entry-content, semua kategori akan ikut terparsing untuk setiap video.

**How to apply:** Gunakan `parseCategoriesFromContent` bukan regex body class. Sudah diterapkan di `scrapeVideoDetail()`.

---

## Struktur HTML entry-content

Kategori video ada di dalam `<div class="entry-content ...">` sebagai link href ke `/kategori/{slug}/`. Related videos ada di `id="related-videos"`. Scope parsing kategori harus antara `entry-content` dan `related-videos`.
