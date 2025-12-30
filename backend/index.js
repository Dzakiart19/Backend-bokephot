const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Konfigurasi CORS
const allowedOrigins = [
  'https://bokephot.web.app',
  'https://bokephot.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('repl.co') || origin.includes('replit.dev')) {
      return callback(null, true);
    }
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  }
}));

app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware untuk logging requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Endpoint 1: List Video
app.get('/api/videos', async (req, res) => {
  try {
    const { page = 1, per_page = 20 } = req.query;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API Key tidak dikonfigurasi' 
      });
    }

    const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&page=${page}&per_page=${per_page}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching videos:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal mengambil daftar video' 
    });
  }
});

// Endpoint 2: Search Video
app.get('/api/search', async (req, res) => {
  try {
    const { search_term } = req.query;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API Key tidak dikonfigurasi' 
      });
    }

    if (!search_term) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parameter search_term diperlukan' 
      });
    }

    const response = await axios.get(`https://doodstream.com/api/search/videos?key=${apiKey}&search_term=${encodeURIComponent(search_term)}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching videos:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal mencari video' 
    });
  }
});

// Endpoint 3: Get File Info (untuk detail video)
app.get('/api/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API Key tidak dikonfigurasi' 
      });
    }

    const response = await axios.get(`https://doodstream.com/api/file/info?key=${apiKey}&file_code=${fileId}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching file info:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal mengambil informasi file' 
    });
  }
});

// Endpoint 4: Get Embed URL
app.get('/api/embed/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: 'API Key tidak dikonfigurasi' 
      });
    }

    const response = await axios.get(`https://doodstream.com/api/file/info?key=${apiKey}&file_code=${fileId}`);
    
    if (response.data.success && response.data.result) {
      const embedUrl = `https://doodstream.com/e/${fileId}`;
      res.json({
        success: true,
        embed_url: embedUrl,
        result: response.data.result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File tidak ditemukan'
      });
    }
  } catch (error) {
    console.error('Error fetching embed URL:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Gagal mengambil embed URL' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Doodstream API Proxy is running',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA-like behavior on detail.html
app.get('/detail.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});