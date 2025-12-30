# Doodstream Video Website

## Overview

A video streaming website that integrates with the Doodstream API. The application consists of a Node.js/Express backend that acts as an API proxy (hiding the Doodstream API key and handling CORS), and a static frontend built with HTML, Tailwind CSS, and vanilla JavaScript. The backend serves both the API endpoints and the static frontend files.

## User Preferences

Preferred communication style: Simple, everyday language.

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