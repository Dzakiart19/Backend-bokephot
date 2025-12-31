# Doodstream Video Website

## Overview

A video streaming website that integrates with the Doodstream API. The application consists of a Node.js/Express backend that acts as an API proxy (hiding the Doodstream API key and handling CORS), and a static frontend built with HTML, Tailwind CSS, and vanilla JavaScript. The backend serves both the API endpoints and the static frontend files.

## User Preferences

Preferred communication style: Simple, everyday language (Indonesian/English).

## Recent Changes (2025-12-31)

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

5. **Video Management - Delete Feature** ✅
   - Delete button (trash icon) in video modal when watching
   - One-click deletion from Doodstream & immediate removal from website
   - Confirmation dialog to prevent accidental deletion
   - Backend: `/api/delete/:fileCode` endpoint calls Doodstream API

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