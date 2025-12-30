# Frontend Website - Doodstream Video

Website frontend untuk video streaming menggunakan Doodstream API, dihosting di Firebase Hosting.

## Fitur

- ✅ Desain modern dengan Tailwind CSS
- ✅ Responsive design untuk mobile dan desktop
- ✅ Search functionality
- ✅ Video grid dengan thumbnail
- ✅ Video modal player
- ✅ Halaman detail video (opsional)
- ✅ Load more videos
- ✅ Filter tabs (Latest, Trending, Popular)
- ✅ Error handling dan loading states

## Cara Deploy ke Firebase Hosting

### 1. Install Firebase CLI

Jika belum menginstall Firebase CLI:

```bash
npm install -g firebase-tools
```

### 2. Login ke Firebase

```bash
firebase login
```

### 3. Init Firebase Project

```bash
firebase init hosting
```

Pilih opsi:
- ✅ Hosting: Configure files for Firebase Hosting
- Pilih proyek Firebase Anda atau buat yang baru
- Public directory: `.` (titik untuk root folder)
- Configure as a single-page app: `Yes`
- Set up automatic builds: `No`

### 4. Konfigurasi API URL

Buka file `script.js` dan `detail.js`, ganti URL API:

```javascript
const CONFIG = {
    API_BASE_URL: 'https://[NAMA-PROYEK-REPLIT].repl.co/api',
    // ...
};
```

Ganti `[NAMA-PROYEK-REPLIT].repl.co` dengan URL Replit Anda yang sebenarnya.

### 5. Deploy

```bash
firebase deploy
```

Setelah deploy berhasil, Firebase akan memberikan URL hosting Anda.

### 6. Update CORS di Backend

Jangan lupa update environment variable `FRONTEND_URL` di Replit dengan URL Firebase Hosting Anda:

```
FRONTEND_URL=https://[PROJECT-ID].web.app
```

## Struktur File

```
frontend/
├── index.html          # Halaman utama dengan video grid
├── detail.html         # Halaman detail video (opsional)
├── script.js           # JavaScript untuk halaman utama
├── detail.js           # JavaScript untuk halaman detail
├── firebase.json       # Konfigurasi Firebase Hosting
└── README.md           # Dokumentasi ini
```

## Kustomisasi

### Ganti Warna Tema

Edit kelas Tailwind CSS di `index.html`:
- `bg-red-600` untuk warna utama
- `bg-gray-900` untuk background utama
- `bg-gray-800` untuk card background

### Ganti Logo

Ganti SVG logo di header dengan logo Anda sendiri.

### Ganti Jumlah Video per Halaman

Edit di `script.js`:

```javascript
const CONFIG = {
    VIDEOS_PER_PAGE: 20, // Ganti sesuai kebutuhan
    // ...
};
```

## Troubleshooting

### CORS Error

Pastikan:
1. URL Firebase Anda sudah benar di environment variable `FRONTEND_URL` di Replit
2. Backend di Replit sudah running
3. API Key Doodstream sudah benar

### Video Tidak Muncul

1. Cek console browser untuk error messages
2. Pastikan API Base URL sudah benar
3. Cek network tab untuk melihat API requests

### Thumbnail Tidak Tampil

Thumbnail default akan muncul jika thumbnail dari Doodstream tidak tersedia.

## Performance Optimization

File sudah dikonfigurasi dengan:
- Cache headers untuk static assets (JS, CSS, images)
- Lazy loading untuk video player
- Responsive images
- Minified Tailwind CSS dari CDN

## Next Steps

Setelah website berjalan, Anda bisa menambahkan:
- User authentication
- Video categories
- Comments system
- Video upload functionality
- Analytics tracking