const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Telegram Bot Setup
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Selamat datang di Bot Remote Upload Bokep Hot! Kirimkan link video Doodstream untuk di-upload atau ketik /help.'));

bot.help((ctx) => {
  ctx.reply('Cara pakai:\n1. Kirim link video\n2. Gunakan /list untuk melihat video terbaru\n3. Gunakan /search [keyword] untuk mencari video');
});

bot.command('list', async (ctx) => {
  try {
    const apiKey = process.env.DOODSTREAM_API_KEY;
    const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&page=1&per_page=5`);
    if (response.data.success) {
      const files = response.data.result.files;
      let msg = '📹 *5 Video Terbaru:*\n\n';
      files.forEach(f => {
        msg += `• ${f.title}\n  🔗 https://bokephot.web.app/detail.html?id=${f.file_code}\n\n`;
      });
      ctx.replyWithMarkdown(msg);
    }
  } catch (error) {
    ctx.reply('Gagal mengambil daftar video.');
  }
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('http')) {
    try {
      const apiKey = process.env.DOODSTREAM_API_KEY;
      ctx.reply('Sedang memproses link upload ke Doodstream...');
      
      const response = await axios.get(`https://doodstream.com/api/upload/url?key=${apiKey}&url=${encodeURIComponent(text)}`);
      
      if (response.data.success) {
        ctx.reply('✅ Link berhasil ditambahkan ke antrian upload Doodstream!');
      } else {
        ctx.reply('❌ Gagal mengupload: ' + (response.data.msg || 'Terjadi kesalahan pada API Doodstream'));
      }
    } catch (error) {
      console.error('Remote upload error:', error.message);
      ctx.reply('❌ Terjadi kesalahan saat menghubungi API Doodstream.');
    }
  }
});

bot.launch().then(() => {
  console.log('🤖 Telegram Bot is running');
}).catch(err => {
  console.error('❌ Telegram Bot failed to start:', err.message);
});

// Konfigurasi CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
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
        success: true, 
        result: { files: [] },
        error: 'API Key tidak dikonfigurasi' 
      });
    }

    const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&page=${page}&per_page=${per_page}`);
    
    // Always return a valid object structure even if Doodstream API fails
    if (response.data && response.data.status === 200) {
      res.json(response.data);
    } else {
      res.json({
        success: true,
        result: { files: [] },
        msg: response.data ? response.data.msg : 'Doodstream API error'
      });
    }
  } catch (error) {
    console.error('Error fetching videos:', error.message);
    res.json({ 
      success: true, 
      result: { files: [] },
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

// Proxy for thumbnails to bypass Referer/Blocked issues
app.get('/api/proxy-thumb', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    console.log(`[PROXY] Fetching thumb: ${url}`);
    
    // Validate URL to ensure it's from a known source or at least looks like a URL
    if (!url.startsWith('http')) {
        return res.status(400).send('Invalid URL');
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://doodstream.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'host': new URL(url).hostname
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: false
    });

    if (response.status !== 200) {
      console.error(`[PROXY-ERROR] Remote status: ${response.status}`);
      return res.status(response.status).send('Remote server error');
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.send(response.data);
  } catch (error) {
    console.error('[PROXY-ERROR]', error.message);
    res.status(500).send('Error proxying image');
  }
});

// Endpoint 4: Get Embed URL
app.get('/api/embed/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { poster } = req.query;
    let embedUrl = `https://doodstream.com/e/${fileId}`;
    
    if (poster) {
      embedUrl += `?c_poster=${encodeURIComponent(poster)}`;
    }
    
    console.log(`[EMBED] Constructing URL for ${fileId}: ${embedUrl}`);
    
    res.status(200).json({
      success: true,
      embed_url: embedUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New Endpoint: Get Image via API directly
app.get('/api/file-image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    const response = await axios.get(`https://doodapi.co/api/file/image?key=${apiKey}&file_code=${fileId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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