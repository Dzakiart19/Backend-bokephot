# Doodstream Video Website

Website video streaming lengkap menggunakan Doodstream API dengan arsitektur Firebase Hosting + Replit.

## 📋 Daftar Isi

- [Gambaran Proyek](#gambaran-proyek)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Fitur Utama](#fitur-utama)
- [Persiapan](#persiapan)
- [Instalasi & Deploy](#instalasi--deploy)
- [Konfigurasi](#konfigurasi)
- [Troubleshooting](#troubleshooting)
- [Kontribusi](#kontribusi)

## 🎯 Gambaran Proyek

Proyek ini adalah website video streaming lengkap yang terdiri dari:
- **Backend API Proxy** (Node.js + Express.js) di Replit
- **Frontend Website** (HTML + Tailwind CSS + JavaScript) di Firebase Hosting
- **Integrasi Doodstream API** untuk video hosting

## 🏗️ Arsitektur Sistem

```
User → Firebase Hosting (Frontend) → Replit (Backend API) → Doodstream API
         ↓                              ↓                        ↓
    Website UI                 API Proxy              Video Storage
    (HTML/CSS/JS)          (Hide API Key)          & Streaming
```

### Komponen Utama

| Komponen | Lokasi | Teknologi | Fungsi |
|----------|--------|-----------|--------|
| Frontend | Firebase Hosting | HTML, Tailwind CSS, JS | UI/UX Website |
| Backend | Replit | Node.js, Express.js | API Proxy & CORS |
| Storage | Doodstream | Doodstream API | Video Hosting |

## ✨ Fitur Utama

### Backend (Replit)
- ✅ API Proxy untuk menyembunyikan API Key Doodstream
- ✅ CORS handling
- ✅ Endpoint untuk list video
- ✅ Endpoint untuk search video
- ✅ Endpoint untuk video details
- ✅ Endpoint untuk embed URL
- ✅ Error handling
- ✅ Health check endpoint

### Frontend (Firebase Hosting)
- ✅ Desain modern & responsive
- ✅ Video grid dengan thumbnail
- ✅ Search functionality
- ✅ Video player modal
- ✅ Halaman detail video
- ✅ Load more videos
- ✅ Filter tabs (Latest, Trending, Popular)
- ✅ Loading & error states

## 📝 Persiapan

### Akun yang Dibutuhkan

1. **Doodstream Account**
   - Daftar di https://doodstream.com
   - Dapatkan API Key dari Settings

2. **Replit Account**
   - Daftar di https://replit.com
   - Siapkan untuk hosting backend

3. **Firebase Account**
   - Daftar di https://firebase.google.com
   - Buat project baru
   - Aktifkan Firebase Hosting

### Tools yang Dibutuhkan

- Node.js (untuk testing lokal)
- Firebase CLI
- Code editor (VS Code recommended)
- Git (optional)

## 🚀 Instalasi & Deploy

### Langkah 1: Deploy Backend di Replit

1. Buat proyek baru di Replit
   - Pilih template "Node.js"

2. Upload file backend
   - Upload semua file dari folder `backend/` ke Replit

3. Konfigurasi Environment Variables di Replit
   - Buka tab "Settings" → "Secrets"
   - Tambahkan:
     ```
     DOODSTREAM_API_KEY=your_api_key_here
     FRONTEND_URL=https://[PROJECT-ID].web.app
     PORT=3000
     ```

4. Install dependencies
   ```bash
   npm install
   ```

5. Jalankan server
   ```bash
   npm start
   ```

6. Catat URL Replit Anda
   - Contoh: `https://my-doodstream-api.repl.co`

### Langkah 2: Deploy Frontend ke Firebase

1. Install Firebase CLI
   ```bash
   npm install -g firebase-tools
   ```

2. Login ke Firebase
   ```bash
   firebase login
   ```

3. Masuk ke folder frontend
   ```bash
   cd frontend
   ```

4. Update API URL di JavaScript
   - Buka `script.js` dan `detail.js`
   - Ganti `API_BASE_URL` dengan URL Replit Anda

5. Init Firebase (jika belum)
   ```bash
   firebase init hosting
   ```

6. Deploy
   ```bash
   firebase deploy
   ```

7. Catat URL Firebase Anda
   - Contoh: `https://my-video-site.web.app`

### Langkah 3: Update CORS Configuration

1. Kembali ke Replit
2. Update environment variable `FRONTEND_URL` dengan URL Firebase Anda
3. Restart server Replit

## ⚙️ Konfigurasi

### Backend Configuration (.env)

```env
DOODSTREAM_API_KEY=your_doodstream_api_key
FRONTEND_URL=https://your-firebase-url.web.app
PORT=3000
```

### Frontend Configuration (script.js)

```javascript
const CONFIG = {
    API_BASE_URL: 'https://your-replit-url.repl.co/api',
    VIDEOS_PER_PAGE: 20,
    PLACEHOLDER_THUMBNAIL: '...'
};
```

### Firebase Configuration (firebase.json)

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}],
    "headers": [...]
  }
}
```

## 🔧 Troubleshooting

### CORS Error

**Masalah**: Browser memblokir request karena CORS

**Solusi**:
1. Pastikan `FRONTEND_URL` di Replit sudah benar
2. Pastikan backend sudah running
3. Cek console untuk error details

### Video Tidak Muncul

**Masalah**: Video grid kosong atau error

**Solusi**:
1. Cek API Key Doodstream sudah benar
2. Cek URL backend di frontend script
3. Cek console browser untuk error messages
4. Test API dengan Postman/curl

### Thumbnail Error

**Masalah**: Thumbnail tidak tampil

**Solusi**: Thumbnail placeholder akan otomatis muncul jika thumbnail tidak tersedia

### Firebase Deploy Error

**Masalah**: Gagal deploy ke Firebase

**Solusi**:
1. Pastikan Firebase CLI sudah login
2. Cek project Firebase sudah benar
3. Cek file `firebase.json` sudah benar
4. Jalankan `firebase deploy --debug` untuk detail error

## 📊 Performance

Website ini sudah dioptimasi dengan:
- ✅ Cache headers untuk static assets
- ✅ Lazy loading untuk video player
- ✅ Responsive images
- ✅ Minified Tailwind CSS dari CDN
- ✅ Optimized JavaScript

## 🎨 Kustomisasi

### Ganti Warna

Edit kelas Tailwind di HTML:
- `bg-red-600` untuk warna utama
- `bg-gray-900` untuk background
- `bg-gray-800` untuk cards

### Ganti Logo

Ganti SVG logo di header dengan logo Anda.

### Tambah Fitur

Ide untuk pengembangan lebih lanjut:
- User authentication
- Video categories
- Comments system
- Video upload
- Analytics tracking
- SEO optimization

## 🗂️ Struktur Proyek

```
doodstream-website/
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── index.html
│   ├── detail.html
│   ├── script.js
│   ├── detail.js
│   ├── firebase.json
│   └── README.md
└── README.md (this file)
```

## 🤝 Kontribusi

1. Fork proyek ini
2. Buat branch fitur Anda (`git checkout -b fitur/AmazingFeature`)
3. Commit perubahan Anda (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin fitur/AmazingFeature`)
5. Buka Pull Request

## 📄 Lisensi

Proyek ini dilisensikan under MIT License.

## 👨‍💻 Author

Dibuat dengan ❤️ untuk komunitas developer.

## 📞 Support

Jika ada pertanyaan atau butuh bantuan:
- Buka issue di repository ini
- Email: your-email@example.com
- Discord: YourDiscord#1234

---

**Selamat mencoba dan happy coding! 🚀**