# Backend API Proxy - Doodstream Website

Server API proxy untuk menyembunyikan API Key Doodstream dan menangani CORS.

## Cara Deploy di Replit

1. **Buat proyek baru di Replit**
   - Pilih template "Node.js"
   - Beri nama sesuai keinginan Anda

2. **Upload file-file ini ke Replit**
   - Upload semua file dalam folder `backend` ini

3. **Konfigurasi Environment Variables**
   - Di Replit, buka tab "Settings" (ikon gear)
   - Klik "Secrets" atau "Environment Variables"
   - Tambahkan variabel berikut:
     - `DOODSTREAM_API_KEY`: API Key dari akun Doodstream Anda
     - `FRONTEND_URL`: URL Firebase Hosting Anda (misal: `https://my-video-site.web.app`)
     - `PORT`: 3000 (atau biarkan default)

4. **Install Dependencies**
   - Buka Shell di Replit
   - Jalankan: `npm install`

5. **Run Server**
   - Klik tombol "Run" atau jalankan perintah: `npm start`
   - Server akan berjalan di port yang ditentukan

6. **Dapatkan URL Backend**
   - Setelah server berjalan, Replit akan memberikan URL (misal: `https://your-project.repl.co`)
   - Catat URL ini untuk dikonfigurasi di Frontend

## Endpoint API

### 1. List Video
```
GET /api/videos?page=1&per_page=20
```
Mendapatkan daftar video dari akun Doodstream Anda.

### 2. Search Video
```
GET /api/search?search_term=keyword
```
Mencari video berdasarkan keyword.

### 3. File Info
```
GET /api/file/:fileId
```
Mendapatkan informasi detail tentang file video.

### 4. Embed URL
```
GET /api/embed/:fileId
```
Mendapatkan URL embed untuk diputar di player.

### 5. Health Check
```
GET /api/health
```
Memeriksa status server.

## Keamanan

- API Key Doodstream disimpan di environment variables (bukan di kode)
- CORS dikonfigurasi untuk hanya mengizinkan domain Firebase Anda
- Semua error ditangani dan tidak menampilkan informasi sensitif

## Troubleshooting

### CORS Error
Pastikan `FRONTEND_URL` di Replit sudah diisi dengan benar (URL Firebase Anda).

### API Key Invalid
Pastikan API Key Doodstream sudah benar dan aktif.

### Server Tidak Bisa Diakses
Pastikan server di Replit sudah running dan URL-nya benar.