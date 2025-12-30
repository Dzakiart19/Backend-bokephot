# 🚀 Panduan Deploy Cepat

Panduan singkat untuk deploy website Doodstream dalam 10 menit.

## ⚡ Langkah Cepat

### 1. Backend di Replit (5 menit)

```bash
# 1. Buat proyek Node.js baru di Replit
# 2. Upload semua file dari folder /backend
# 3. Tambahkan Secrets di Replit:
   DOODSTREAM_API_KEY=your_api_key
   FRONTEND_URL=https://your-project.web.app
# 4. Klik Run
# 5. Catat URL (https://xxx.repl.co)
```

### 2. Frontend di Firebase (5 menit)

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Masuk folder frontend
cd frontend

# 4. Update API URL di script.js dan detail.js
# Ganti: https://[NAMA-PROYEK-REPLIT].repl.co/api
# Jadi: https://xxx.repl.co/api (URL dari Replit)

# 5. Deploy
firebase deploy

# 6. Selesai! Catat URL Firebase
```

### 3. Update CORS (1 menit)

```bash
# Di Replit, update FRONTEND_URL dengan URL Firebase
# Restart server di Replit
```

## 📋 Checklist Sebelum Deploy

### Backend (Replit)
- [ ] Upload semua file backend
- [ ] Setting Secrets (DOODSTREAM_API_KEY, FRONTEND_URL)
- [ ] Run server dan dapatkan URL
- [ ] Test API dengan `/api/health`

### Frontend (Firebase)
- [ ] Update API_BASE_URL di script.js & detail.js
- [ ] Firebase CLI sudah terinstall
- [ ] Firebase sudah login
- [ ] File firebase.json tersedia

### Akun & API
- [ ] Doodstream API Key
- [ ] Replit Account
- [ ] Firebase Account

## 🔧 Test Setelah Deploy

### Test Backend
```
GET https://xxx.repl.co/api/health
Response: {"success":true,"message":"Doodstream API Proxy is running"}
```

### Test Frontend
- Buka URL Firebase
- Video grid muncul
- Search berfungsi
- Video bisa diputar

## 🐛 Common Issues & Fix

### CORS Error
```
Error: The CORS policy for this site does not allow access
```
**Fix**: Update FRONTEND_URL di Replit dengan URL Firebase yang benar

### API Not Found
```
Error: 404 API endpoint not found
```
**Fix**: Pastikan backend sudah running dan URL API di frontend sudah benar

### Videos Not Loading
```
Video grid kosong / error
```
**Fix**: 
1. Cek API Key Doodstream
2. Cek console browser untuk error
3. Test API langsung dengan Postman

### Firebase Deploy Error
```
Error: Failed to deploy to Firebase
```
**Fix**:
1. firebase login
2. firebase projects:list
3. firebase use your-project-id
4. firebase deploy

## 📞 Butuh Bantuan?

Jika stuck di salah satu langkah:
1. Cek console untuk error messages
2. Baca README.md di masing-masing folder
3. Cek Troubleshooting section
4. Buka issue di repository

## ✅ Success Checklist

- [ ] Backend running di Replit
- [ ] Frontend deployed ke Firebase
- [ ] CORS sudah dikonfigurasi
- [ ] Video grid muncul
- [ ] Search berfungsi
- [ ] Video player bekerja
- [ ] Tidak ada error di console

**Selamat! Website Anda sudah online! 🎉**