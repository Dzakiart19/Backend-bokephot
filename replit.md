# Doodstream Video Website

## Overview

A video streaming website that integrates with the Doodstream API. The application consists of a Node.js/Express backend that acts as an API proxy (hiding the Doodstream API key and handling CORS), and a static frontend built with HTML, Tailwind CSS, and vanilla JavaScript. The backend serves both the API endpoints and the static frontend files.

## User Preferences

Preferred communication style: Simple, everyday language (Indonesian/English).

## Recent Changes (2025-12-31 - COMPLETE: Full System Implementation)

### Session Summary - All Fixed:
✅ **Real-time Bot Upload Sync** - Auto-refresh every 10-15 seconds
✅ **Auto-detect API URL** - Works on Replit dev + Firebase prod
✅ **Video Validation Simplified** - Load videos without strict checks
✅ **Improved Error Logging** - Debug console logs for API calls
✅ **Firebase Hosting Live** - bokephot.web.app deployed & synced

### Fixed Issues:
1. **Web Loading Performance** - Changed API base URL from hardcoded external domain to relative `/api` path
2. **Thumbnail Display** - Implemented consistent 16:9 aspect ratio using CSS, adjusted grid to 5 columns (20 videos per page)
3. **Blank Thumbnails** - Added intelligent fallback system:
   - Primary thumbnail: tries `single_img` from Doodstream API
   - Fallback thumbnail: tries `splash_img` if primary fails
   - Placeholder: Shows SVG placeholder if both fail
   - Backend proxy returns proper error codes for blocked images (403/404)

### Technical Improvements:
- Frontend image error handling with fallback chaining
- Backend proxy timeout reduced to 10s for faster response
- Improved error responses from proxy endpoint
- Responsive grid layout: 5 cols (desktop) → 3 cols (tablet) → 2 cols (mobile)
4. **Telegram Bot Complete System** - Full upload, list, search functionality:
   - ✅ Upload file video langsung (.mp4, .mkv, .avi, .mov, .flv, .wmv, .webm, .m3u8, .3gp)
   - ✅ Both document & video message types supported (handles Telegram's video classification)
   - ✅ Caption sebagai judul video (auto fallback ke filename)
   - ✅ File size validation (max 500MB)
   - ✅ URL link upload dengan direct file support
   - ✅ `/list` command - List 5 video terbaru dengan working link
   - ✅ `/search` command - Cari video by keyword, show up to 5 results
   - Fixed API check: `response.data.msg === 'OK'` instead of `response.data.success`
   - Fixed title parameter: `new_title` (Doodstream API requirement)
   - Added 90s timeout for file uploads, 30s for URL uploads
   - Both document & video message types supported
   - Extensive logging for debugging: `[BOT-FILE-UPLOAD-START]`, `[BOT-FILE-UPLOAD]`, `[BOT-FILE-UPLOAD-ERROR]`
   - Better error messages & fallback handling
   - **Bot Commands**: 
     - `/help` - Lihat panduan lengkap
     - `/list` - Lihat 5 video terbaru ✅
     - `/search keyword` - Cari video ✅
     - **File Upload**: Kirim file/video + caption ✅

5. **Video Management - Auto-detection of Deleted Videos** ✅
   - Validates video existence before playing (calls `/api/validate/:fileCode`)
   - If video deleted manually from Doodstream, shows "Video tidak tersedia" message
   - Auto-removes deleted video from grid
   - No public delete button (security - only backend can manage via API)
   - Backend: `/api/validate/:fileCode` endpoint checks if video exists

6. **Real-Time Sync Between Bot Upload & Web Display** ✅ (NEW)
   - Fixed hardcoded URL in `detail.js` (was: `https://backend-bokephot--ioj1gjah.replit.app/api` → now: `/api`)
   - Both `script.js` and `detail.js` sekarang pakai relative `/api` URL ✅
   - **Auto-refresh mechanism added:**
     - `script.js`: Check untuk video baru setiap 10 detik (hanya halaman utama)
     - `detail.js`: Refresh related videos setiap 15 detik
   - Ketika bot upload via Telegram, video muncul di web dalam maksimal 10-15 detik ✅
   - Tidak ada delay dari sync - semuanya langsung realtime
   - Firebase dan Replit backend sekarang fully synchronized

7. **Firebase Hosting + Auto-Detect API URL** ✅ (FINAL FIX)
   - ✅ Frontend di-deploy ke Firebase Hosting
   - ✅ **Auto-detect Backend URL** - smart environment detection:
     - Jika localhost/replit.dev preview → gunakan `/api` (relative path)
     - Jika Firebase/production → gunakan full Replit URL (fallback)
     - Bisa di-override via localStorage: `localStorage.setItem('BACKEND_API_URL', 'new-url')`
   - **Backend `/api/config` endpoint** - returns actual backend URL
   - Ketika ganti akun Replit, tidak perlu hardcode ulang URL lagi! ✅
   - **Live URL**: https://bokephot.web.app
   - **Status**: ✅ Production Ready
   - Firebase frontend ↔ Replit backend: **FULLY SYNCED & AUTO-DETECTING**

## 🚀 Deployment URLs

### Live Website
- **Frontend** (Firebase): https://bokephot.web.app
- **Backend** (Replit): https://backend-bokephot--aejlejeg.replit.app
- **Status**: ✅ Both online and auto-synced (Updated for new account)

### Development
- Backend local: http://localhost:5000
- Frontend auto-detects `/api` on localhost/replit.dev
- Frontend auto-falls back to Replit URL on Firebase
- Current Backend Domain: `backend-bokephot--aejlejeg.replit.app`

### Update Backend URL (If Account Changes)
**Option 1**: Set environment variable in Replit:
```
REPLIT_URL=https://new-backend--userid.replit.app
```

**Option 2**: Update from browser console:
```javascript
localStorage.setItem('BACKEND_API_URL', 'https://new-backend-url/api')
```

**Option 3**: Code doesn't need change - auto-detection will try `/api` config endpoint first

## System Architecture

### Backend Architecture
- **Framework**: Express.js on Node.js
- **Purpose**: API proxy server that:
  - Hides the Doodstream API key from client-side code
  - Handles CORS for cross-origin requests
  - Serves static frontend files from the `frontend/` directory
- **Key Endpoints**:
  - `GET /api/videos` - List videos with pagination
  - `GET /api/search` - Search videos by keyword
  - `GET /api/file/:fileId` - Get video file details
  - `GET /api/embed/:fileId` - Get embed URL for video player
- **Port**: Defaults to 5000 (configurable via PORT environment variable)

### Frontend Architecture
- **Technology**: Static HTML, Tailwind CSS (via CDN), vanilla JavaScript
- **Pages**:
  - `index.html` / `script.js` - Main video grid with search and filtering
  - `detail.html` / `detail.js` - Individual video detail page
- **Design**: Dark theme with red accents, responsive layout, video card grid with hover effects
- **API Communication**: Fetches from `/api/*` endpoints (relative URLs)

### Project Structure
```
├── backend/
│   ├── index.js          # Express server and API routes
│   └── package.json      # Node.js dependencies
├── frontend/
│   ├── index.html        # Main page
│   ├── script.js         # Main page logic
│   ├── detail.html       # Video detail page
│   ├── detail.js         # Detail page logic
│   └── firebase.json     # Firebase hosting config (optional)
```

### Design Decisions
1. **Monolithic deployment**: Backend serves frontend static files, simplifying deployment to a single service
2. **API proxy pattern**: Protects API keys by keeping them server-side only
3. **No build step**: Frontend uses CDN for Tailwind CSS, no bundler required
4. **Stateless API**: No database required, all data comes from Doodstream API
5. **Full Backend URL**: Frontend (Firebase) uses absolute URL ke Replit backend (bukan relative path)
6. **Auto-refresh polling**: Client-side polling (10-15 detik) untuk real-time video updates dari bot upload
7. **Cross-origin CORS**: Backend mengizinkan semua origins (origin: '*') untuk fleksibilitas hosting

## How Auto-Detection Works

### Frontend Logic
1. **Replit Development** (localhost:5000 or replit.dev preview)
   - Auto-detect → Use `/api` (relative path)
   - Backend serves frontend from same domain

2. **Firebase Production** (bokephot.web.app)
   - Try localStorage `BACKEND_API_URL` first
   - Fall back to hardcoded Replit URL
   - Can be updated without re-deploy via localStorage

3. **Future Account Change**
   - Set `REPLIT_URL` environment variable on Replit
   - Or update localStorage from browser console
   - No code changes needed!

### Backend Endpoint
- **GET /api/config** - Returns actual backend URL for client discovery
  ```json
  {
    "success": true,
    "backendUrl": "https://backend-bokephot--userid.replit.app",
    "apiUrl": "https://backend-bokephot--userid.replit.app/api",
    "environment": "production"
  }
  ```

## External Dependencies

### Third-Party APIs
- **Doodstream API**: Video hosting and streaming service
  - Requires `DOODSTREAM_API_KEY` environment variable
  - Base URL: `https://doodstream.com/api/`

### NPM Packages
- `express` - Web server framework
- `cors` - CORS middleware
- `axios` - HTTP client for Doodstream API calls
- `dotenv` - Environment variable management

### Environment Variables Required
- `DOODSTREAM_API_KEY` - API key from Doodstream account (required)
- `PORT` - Server port (optional, defaults to 5000)
- `FRONTEND_URL` - For CORS configuration if frontend is hosted separately (optional)

### CDN Dependencies (Frontend)
- Tailwind CSS via `cdn.tailwindcss.com`
- Google Fonts (Inter font family)