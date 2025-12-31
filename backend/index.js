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
  ctx.reply('📖 *Cara Pakai Bot:*\n\n*Opsi 1: Kirim File Video*\n1. Upload video file MP4/MKV langsung\n2. Tambahkan judul di caption (opsional)\n3. Bot akan upload ke Doodstream\n\n*Opsi 2: Kirim Link Video*\n1. Paste direct file link (.mp4, .mkv)\n2. Bot akan upload ke Doodstream\n\n*Opsi 3: List & Search*\n/list - Lihat 5 video terbaru\n/search keyword - Cari video\n\n⚠️ Untuk file video: Ukuran max ~500MB, format MP4/MKV preferred', { parse_mode: 'Markdown' });
});

bot.command('list', async (ctx) => {
  try {
    const apiKey = process.env.DOODSTREAM_API_KEY;
    if (!apiKey) {
      return ctx.reply('❌ API Key tidak dikonfigurasi.');
    }
    
    const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&page=1&per_page=5`);
    console.log('[BOT-LIST] Response:', response.data.msg);
    
    // Check success - Doodstream API returns msg: "OK" or success: true
    const isSuccess = response.data.msg === 'OK' || response.data.success === true || response.status === 200;
    
    if (isSuccess && response.data.result?.files) {
      const files = response.data.result.files;
      let msg = '📹 *5 Video Terbaru:*\n\n';
      files.forEach(f => {
        msg += `• ${f.title}\n  🔗 https://bokephot.web.app/detail.html?id=${f.file_code}\n\n`;
      });
      ctx.replyWithMarkdown(msg);
    } else {
      ctx.reply('❌ Gagal mengambil daftar video: ' + (response.data.msg || 'Unknown error'));
    }
  } catch (error) {
    console.error('[BOT-LIST-ERROR]', error.message);
    ctx.reply('❌ Gagal mengambil daftar video.\n\nError: ' + error.message);
  }
});

bot.command('search', async (ctx) => {
  try {
    const apiKey = process.env.DOODSTREAM_API_KEY;
    if (!apiKey) {
      return ctx.reply('❌ API Key tidak dikonfigurasi.');
    }
    
    const searchTerm = ctx.message.text.replace('/search', '').trim();
    
    if (!searchTerm) {
      return ctx.reply('⚠️ Cara pakai: /search [kata kunci]\n\nContoh: /search colmek');
    }
    
    console.log('[BOT-SEARCH] Term:', searchTerm);
    
    const response = await axios.get(`https://doodstream.com/api/search/videos?key=${apiKey}&search_term=${encodeURIComponent(searchTerm)}`);
    console.log('[BOT-SEARCH] Response:', response.data.msg);
    
    // Check success
    const isSuccess = response.data.msg === 'OK' || response.data.success === true || response.status === 200;
    
    if (isSuccess && response.data.result) {
      const results = response.data.result;
      const files = Array.isArray(results) ? results : (results.files || []);
      
      if (files.length === 0) {
        return ctx.reply('❌ Video tidak ditemukan untuk: ' + searchTerm);
      }
      
      let msg = `🔍 *Hasil Pencarian: "${searchTerm}"*\n\n`;
      files.slice(0, 5).forEach(f => {
        msg += `• ${f.title}\n  🔗 https://bokephot.web.app/detail.html?id=${f.file_code}\n\n`;
      });
      msg += `\n📊 Total: ${files.length} video ditemukan`;
      ctx.replyWithMarkdown(msg);
    } else {
      ctx.reply('❌ Pencarian gagal: ' + (response.data.msg || 'Unknown error'));
    }
  } catch (error) {
    console.error('[BOT-SEARCH-ERROR]', error.message);
    ctx.reply('❌ Gagal mencari video.\n\nError: ' + error.message);
  }
});

// Handle both document and video file uploads
const handleFileUpload = async (ctx, fileData, isVideo = false) => {
  const msgType = isVideo ? 'VIDEO' : 'DOCUMENT';
  console.log(`[BOT-FILE-UPLOAD-START] ${msgType} received`);
  try {
    const apiKey = process.env.DOODSTREAM_API_KEY;
    if (!apiKey) {
      console.error(`[BOT-FILE-UPLOAD] No API key`);
      return ctx.reply('❌ API Key tidak dikonfigurasi. Hubungi admin.');
    }

    const fileId = fileData.file_id;
    const fileName = fileData.file_name || `video_${Date.now()}.mp4`;
    const caption = ctx.message.caption || '';
    const fileSize = fileData.file_size || 0;
    
    console.log(`[BOT-FILE-UPLOAD] Processing ${msgType}:`, fileName, 'Size:', fileSize, 'Caption:', caption);
    
    // Check file size (Doodstream limit ~500MB)
    if (fileSize > 500 * 1024 * 1024) {
      console.warn('[BOT-FILE-UPLOAD] File too large:', fileSize);
      return ctx.reply('❌ File terlalu besar! Max 500MB.\n\nUkuran file: ' + (fileSize / 1024 / 1024).toFixed(2) + 'MB');
    }

    // For videos, always assume valid. For documents, check extension
    if (!isVideo) {
      const validExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.m3u8', '.3gp'];
      const hasValidExt = validExtensions.some(ext => fileName.toLowerCase().includes(ext));
      
      if (!hasValidExt) {
        console.warn('[BOT-FILE-UPLOAD] Invalid file type:', fileName);
        return ctx.reply('❌ Format file tidak didukung!\nDukungan: MP4, MKV, AVI, MOV, FLV, WMV, WEBM, M3U8, 3GP\n\nFile: ' + fileName);
      }
    }

    // Send initial response
    await ctx.reply('⏳ Sedang upload file ke Telegram CDN dan Doodstream...\n\nFile: ' + fileName + '\nUkuran: ' + (fileSize / 1024 / 1024).toFixed(2) + 'MB');

    // Get file URL from Telegram
    console.log('[BOT-FILE-UPLOAD] Getting file from Telegram...');
    const file = await ctx.telegram.getFile(fileId);
    if (!file || !file.file_path) {
      console.error('[BOT-FILE-UPLOAD] Failed to get file path');
      return ctx.reply('❌ Gagal mengakses file dari Telegram. Coba lagi.');
    }
    
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    console.log('[BOT-FILE-UPLOAD] File URL:', fileUrl);

    // Upload to Doodstream
    let uploadUrl = `https://doodstream.com/api/upload/url?key=${apiKey}&url=${encodeURIComponent(fileUrl)}`;
    
    // Add title if provided in caption (Doodstream uses 'new_title' parameter)
    if (caption.trim()) {
      uploadUrl += `&new_title=${encodeURIComponent(caption.trim())}`;
    }

    console.log('[BOT-FILE-UPLOAD] Uploading to Doodstream...');
    const response = await axios.get(uploadUrl, {
      timeout: 90000 // 90 second timeout for file uploads
    });

    console.log('[BOT-FILE-UPLOAD] Response:', JSON.stringify(response.data));

    const isSuccess = response.data.msg === 'OK' || response.data.success === true;
    
    if (isSuccess) {
      const fileCode = response.data.result?.filecode || 'unknown';
      const title = caption.trim() || fileName;
      console.log('[BOT-FILE-UPLOAD] Success! FileCode:', fileCode);
      await ctx.reply(`✅ Video berhasil diupload ke Doodstream!\n\n📹 Judul: ${title}\n🔖 File Code: ${fileCode}\n⏱️ Video akan diproses dalam beberapa menit.`);
    } else {
      const errorMsg = response.data.msg || response.data.error || 'Terjadi kesalahan';
      console.warn('[BOT-FILE-UPLOAD] Upload failed:', errorMsg);
      await ctx.reply('❌ Gagal mengupload:\n' + errorMsg);
    }
  } catch (error) {
    console.error('[BOT-FILE-UPLOAD-ERROR]', error.message, error.stack);
    const errorMsg = error.message || 'Kesalahan koneksi';
    try {
      await ctx.reply('❌ Terjadi kesalahan:\n' + errorMsg);
    } catch (replyError) {
      console.error('[BOT-FILE-UPLOAD] Failed to send error reply:', replyError.message);
    }
  }
};

// Handle document uploads
bot.on('document', async (ctx) => {
  await handleFileUpload(ctx, ctx.message.document, false);
});

// Handle video uploads (videos sent as file, not as video message type with player)
bot.on('video', async (ctx) => {
  await handleFileUpload(ctx, ctx.message.video, true);
});

// Handle text message (URL links)
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('http')) {
    try {
      const apiKey = process.env.DOODSTREAM_API_KEY;
      
      if (!apiKey) {
        return ctx.reply('❌ API Key tidak dikonfigurasi. Hubungi admin.');
      }
      
      // Warn user if URL doesn't look like direct file link
      const directFileExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.flv', '.wmv', '.webm', '.m3u8'];
      const isDirect = directFileExtensions.some(ext => text.toLowerCase().includes(ext));
      
      if (!isDirect) {
        ctx.reply('⚠️ Catatan: Gunakan direct file link (.mp4, .mkv, dll)\nContoh: https://example.com/video.mp4\n\n⏳ Sedang memproses...');
      } else {
        ctx.reply('⏳ Sedang memproses link upload ke Doodstream...');
      }
      
      const response = await axios.get(`https://doodstream.com/api/upload/url?key=${apiKey}&url=${encodeURIComponent(text)}`, {
        timeout: 30000
      });
      
      console.log('[BOT-UPLOAD] URL:', text);
      console.log('[BOT-UPLOAD] Response:', JSON.stringify(response.data));
      
      // Doodstream API returns msg: "OK" on success, not a success field
      const isSuccess = response.data.msg === 'OK' || response.data.success === true;
      
      if (isSuccess) {
        const fileCode = response.data.result?.filecode || 'unknown';
        ctx.reply(`✅ Link berhasil ditambahkan ke antrian upload Doodstream!\n\nFile Code: ${fileCode}\nVideo akan diproses dalam beberapa menit.\n\n⚠️ Jika error "HTML page" → gunakan direct file link (.mp4, dll)`);
      } else {
        const errorMsg = response.data.msg || response.data.error || 'Terjadi kesalahan pada API Doodstream';
        ctx.reply('❌ Gagal mengupload:\n' + errorMsg + '\n\n💡 Pastikan URL adalah direct file link (.mp4, .mkv, dll)');
      }
    } catch (error) {
      console.error('[BOT-UPLOAD-ERROR]', error.message);
      const errorMsg = error.response?.data?.msg || error.message || 'Kesalahan koneksi';
      ctx.reply('❌ Terjadi kesalahan:\n' + errorMsg);
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
    const { url, fallback } = req.query;
    if (!url) return res.status(400).send('URL is required');

    console.log(`[PROXY] Fetching thumb: ${url}${fallback ? ' (fallback)' : ''}`);
    
    // Validate URL to ensure it's from a known source or at least looks like a URL
    if (!url.startsWith('http')) {
        return res.status(400).send('Invalid URL');
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://doodstream.com/',
        'Origin': 'https://doodstream.com',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    // Return error for blocked/not found responses
    if (response.status === 403 || response.status === 404) {
        console.warn(`[PROXY-WARN] Remote status ${response.status} for ${url}`);
        return res.status(404).json({ error: 'Image not accessible', status: response.status });
    }

    if (!response.data || response.data.length === 0) {
        console.warn(`[PROXY-WARN] Empty response for ${url}`);
        return res.status(404).json({ error: 'Empty response' });
    }

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.set('Access-Control-Allow-Credentials', 'false');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1h
    res.set('X-Content-Type-Options', 'nosniff');
    console.log(`[PROXY-SUCCESS] Returned ${response.data.length} bytes of ${contentType} for image`);
    res.send(response.data);
  } catch (error) {
    console.error('[PROXY-ERROR]', error.message);
    res.status(404).json({ error: 'Error proxying image', message: error.message });
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

// Endpoint: Get Proper Thumbnails from Doodstream API
app.get('/api/thumbnail/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'API Key not configured' });
    }
    
    console.log(`[THUMBNAIL] Fetching proper thumbnails for ${fileId}`);
    
    // Use official Doodstream /api/file/image endpoint which returns working img.doodcdn.com URLs
    const response = await axios.get(`https://doodapi.co/api/file/image?key=${apiKey}&file_code=${fileId}`, { timeout: 10000 });
    
    if (response.data.msg === 'OK' && response.data.result) {
      // Result is an array, get first element
      const resultData = Array.isArray(response.data.result) ? response.data.result[0] : response.data.result;
      const fileData = resultData;
      
      console.log(`[THUMBNAIL] Got proper thumbnail URLs for ${fileId}:`, {
        splash_img: fileData.splash_img,
        single_img: fileData.single_img
      });
      
      // Return properly formatted URLs from img.doodcdn.com (these are working!)
      const primaryThumb = fileData.single_img;
      const fallbackThumb = fileData.splash_img;
      
      // Verify thumbnails are not empty strings
      const hasThumbnail = (primaryThumb && primaryThumb.trim()) || (fallbackThumb && fallbackThumb.trim());
      
      if (hasThumbnail) {
        console.log(`[THUMBNAIL] Found existing thumbnails for ${fileId}`);
        return res.json({
          success: true,
          has_thumbnail: true,
          primary: primaryThumb,
          fallback: fallbackThumb,
          title: fileData.title
        });
      }
      
      // Return info that thumbnail is being processed
      return res.json({
        success: true,
        has_thumbnail: false,
        is_processing: true,
        message: 'Thumbnail is being generated by Doodstream',
        title: fileData.title
      });
    }
    
    // File not found or error response
    res.json({
      success: false,
      has_thumbnail: false,
      error: 'File not found or API error',
      message: response.data.msg || 'Unknown error'
    });
  } catch (error) {
    console.error('[THUMBNAIL-ERROR]', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching thumbnail',
      message: error.message 
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

// Config endpoint - returns backend URL for client-side auto-detection
app.get('/api/config', (req, res) => {
  const backendUrl = process.env.REPLIT_URL || req.get('origin') || 'https://backend-bokephot--mio5ikd.replit.app';
  res.json({
    success: true,
    backendUrl: backendUrl,
    apiUrl: `${backendUrl}/api`,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Validate video endpoint - check if video still exists
app.get('/api/validate/:fileCode', async (req, res) => {
  try {
    const { fileCode } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.json({ status: 400, msg: 'API Key not configured', valid: false });
    }

    console.log('[VALIDATE-VIDEO] Checking file:', fileCode);
    
    // Get file info from Doodstream
    const response = await axios.get(`https://doodstream.com/api/file/info?key=${apiKey}&file_code=${fileCode}`, { timeout: 5000 });
    
    console.log('[VALIDATE-VIDEO] Response:', response.data.msg);
    
    const isValid = response.data.msg === 'OK' && response.data.result && response.data.result.file_code === fileCode;
    
    res.json({ status: 200, valid: isValid, msg: isValid ? 'OK' : 'File not found' });
  } catch (error) {
    console.error('[VALIDATE-VIDEO-ERROR]', error.message);
    res.json({ status: 500, valid: false, msg: 'Validation error' });
  }
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