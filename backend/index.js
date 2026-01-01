const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Logger middleware
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

    console.log(`[API-LIST] Fetching videos page ${page}`);
    const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&page=${page}&per_page=${per_page}`, { timeout: 10000 });
    
    const filesCount = response.data?.result?.files?.length || 0;
    console.log(`[API-LIST] Doodstream returned ${filesCount} files`);

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
      return res.status(500).json({ success: false, error: 'API Key tidak dikonfigurasi' });
    }

    const response = await axios.get(`https://doodstream.com/api/search?key=${apiKey}&search_term=${search_term}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint 3: Get File Info
app.get('/api/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'API Key tidak dikonfigurasi' });
    }

    const response = await axios.get(`https://doodstream.com/api/file/info?key=${apiKey}&file_code=${fileId}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Proxy for thumbnails
app.get('/api/proxy-thumb', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    console.log(`[PROXY] Fetching thumb: ${url}`);
    
    if (!url.startsWith('http')) {
        return res.status(400).send('Invalid URL');
    }

    // List of common Doodstream image domains
    const allowedDomains = ['postercdn.net', 'doodcdn.com', 'doodcdn.co', 'img.doodcdn.co'];
    const urlDomain = new URL(url).hostname;
    const isAllowed = allowedDomains.some(domain => urlDomain.includes(domain));

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Referer': 'https://doodstream.com/'
      },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: (status) => status < 500
    });

    // Check if image is blank white/gray (typically around 560-1500 bytes for small processing placeholders)
    // AND it must be an image type
    const contentType = response.headers['content-type'] || '';
    if (response.data.length < 2500 && contentType.includes('image')) {
      console.log(`[PROXY-FILTER] Image size ${response.data.length} is too small (likely blank). Returning 404.`);
      return res.status(404).send('Still processing');
    }

    if (response.status >= 400) {
        return res.status(404).send('Image not ready');
    }

    res.set('Content-Type', contentType || 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(response.data);
  } catch (error) {
    console.error(`[PROXY-ERROR] ${error.message}`);
    res.status(404).json({ error: 'Error proxying image' });
  }
});

// Endpoint 4: Get Embed URL
app.get('/api/embed/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { poster } = req.query;
    let embedUrl = `https://doodstream.com/e/${fileId}`;
    
    if (poster) {
      let posterUrl = poster.startsWith('http') ? poster : `https://${poster}`;
      embedUrl += `?c_poster=${encodeURIComponent(posterUrl)}`;
    }
    
    res.status(200).json({ success: true, embed_url: embedUrl });
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
    
    const response = await axios.get(`https://doodapi.com/api/file/image?key=${apiKey}&file_code=${fileId}`, { 
      timeout: 15000,
      headers: { 'Referer': 'https://doodstream.com/' }
    });
    
    if (response.data.msg === 'OK' && response.data.result) {
      const resultData = Array.isArray(response.data.result) ? response.data.result[0] : response.data.result;
      const isValid = (url) => url && url.includes('doodcdn') && !url.includes('blank');
      
      const splash = isValid(resultData.splash_img) ? resultData.splash_img : null;
      const single = isValid(resultData.single_img) ? resultData.single_img : null;

      return res.json({
        success: true,
        has_thumbnail: !!(splash || single),
        primary: splash,
        fallback: single
      });
    }
    res.json({ success: true, has_thumbnail: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Doodstream API Proxy is running' });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  const backendUrl = 'https://backend-bokephot--mio5ikd.replit.app';
  res.json({
    success: true,
    backendUrl: backendUrl,
    apiUrl: `${backendUrl}/api`
  });
});

// Validate video endpoint
app.get('/api/validate/:fileCode', async (req, res) => {
  try {
    const { fileCode } = req.params;
    const apiKey = process.env.DOODSTREAM_API_KEY;
    const response = await axios.get(`https://doodstream.com/api/file/info?key=${apiKey}&file_code=${fileCode}`, { timeout: 5000 });
    const isValid = response.data.msg === 'OK';
    res.json({ status: 200, valid: isValid });
  } catch (error) {
    res.json({ status: 500, valid: false });
  }
});

// Telegram Bot Integration
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_BOT_TOKEN;

if (token) {
    const bot = new TelegramBot(token, { 
        polling: {
            interval: 2000,
            autoStart: true,
            params: { timeout: 10 }
        }
    });
    console.log('🤖 Telegram Bot is running...');

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        if (msg.text && msg.text.startsWith('/list')) {
            try {
                const apiKey = process.env.DOODSTREAM_API_KEY;
                const response = await axios.get(`https://doodstream.com/api/file/list?key=${apiKey}&per_page=5`);
                if (response.data.msg === 'OK' && response.data.result.files) {
                    let message = '📺 **5 Video Terbaru:**\n\n';
                    response.data.result.files.forEach((f, i) => {
                        message += `${i+1}. ${f.title}\n🔗 https://bokepbot.web.app/detail?id=${f.file_code}\n\n`;
                    });
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                } else {
                    bot.sendMessage(chatId, '❌ Gagal mengambil daftar video.');
                }
            } catch (err) {
                bot.sendMessage(chatId, '❌ Terjadi kesalahan.');
            }
            return;
        }

        if (msg.text && msg.text.startsWith('/search ')) {
            const query = msg.text.replace('/search ', '').trim();
            if (!query) return;
            try {
                const apiKey = process.env.DOODSTREAM_API_KEY;
                const response = await axios.get(`https://doodstream.com/api/search?key=${apiKey}&search_term=${encodeURIComponent(query)}`);
                if (response.data.msg === 'OK' && response.data.result) {
                    const results = response.data.result.slice(0, 5);
                    if (results.length === 0) {
                        bot.sendMessage(chatId, '🔍 Tidak ditemukan video dengan kata kunci tersebut.');
                        return;
                    }
                    let message = `🔍 **Hasil Pencarian: ${query}**\n\n`;
                    results.forEach((f, i) => {
                        message += `${i+1}. ${f.title}\n🔗 https://bokepbot.web.app/detail?id=${f.file_code}\n\n`;
                    });
                    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                }
            } catch (err) {
                bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mencari.');
            }
            return;
        }

        if (msg.text === '/help') {
            const helpMsg = `🤖 **Panduan Bot Doodstream**\n\n` +
                           `1. **Upload Video**: Kirim file video atau dokumen video langsung ke sini.\n` +
                           `2. **/list**: Lihat 5 video terbaru di website.\n` +
                           `3. **/search [kata kunci]**: Cari video berdasarkan judul.\n` +
                           `4. **/setthumb [file_code] [url_gambar]**: Ganti thumbnail video pakai link gambar.\n` +
                           `5. **/start**: Mulai ulang bot.\n\n` +
                           `Website: https://bokepbot.web.app`;
            bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
            return;
        }

        if (msg.text && msg.text.startsWith('/setthumb ')) {
            const parts = msg.text.split(' ');
            if (parts.length < 3) {
                bot.sendMessage(chatId, '❌ Format salah. Gunakan: `/setthumb [file_code] [url_gambar]`', { parse_mode: 'Markdown' });
                return;
            }
            const fileCode = parts[1];
            const thumbUrl = parts[2];
            
            try {
                const apiKey = process.env.DOODSTREAM_API_KEY;
                // Doodstream API: file/set_banner (sets a custom thumbnail from URL)
                const res = await axios.get(`https://doodapi.com/api/file/set_banner?key=${apiKey}&file_code=${fileCode}&banner_url=${encodeURIComponent(thumbUrl)}`);
                
                if (res.data.msg === 'OK') {
                    bot.sendMessage(chatId, `✅ Thumbnail berhasil diperbarui untuk file: ${fileCode}`);
                } else {
                    bot.sendMessage(chatId, `❌ Gagal: ${res.data.msg || 'Terjadi kesalahan'}`);
                }
            } catch (err) {
                bot.sendMessage(chatId, '❌ Terjadi kesalahan saat menghubungi API.');
            }
            return;
        }

        if (msg.video || msg.document) {
            const fileId = msg.video ? msg.video.file_id : msg.document.file_id;
            const fileName = msg.document ? msg.document.file_name : `video_${Date.now()}.mp4`;
            const caption = msg.caption || fileName;

            bot.sendMessage(chatId, '⏳ Sedang mengupload ke Doodstream...');
            
            try {
                const fileLink = await bot.getFileLink(fileId);
                const apiKey = process.env.DOODSTREAM_API_KEY;
                const uploadRes = await axios.get(`https://doodstream.com/api/upload/url?key=${apiKey}&url=${encodeURIComponent(fileLink)}&new_title=${encodeURIComponent(caption)}`);
                
                if (uploadRes.data.msg === 'OK') {
                    bot.sendMessage(chatId, `✅ Berhasil! Video sedang diproses.\nJudul: ${caption}\nFileCode: ${uploadRes.data.result.filecode}`);
                } else {
                    bot.sendMessage(chatId, '❌ Gagal upload ke Doodstream.');
                }
            } catch (err) {
                bot.sendMessage(chatId, '❌ Terjadi kesalahan saat upload.');
            }
        }
    });
}

// Root route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Detail route to serve detail.html
app.get('/detail', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/detail.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
