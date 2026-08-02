// /api/bh/proxy-thumb — proxy thumbnail agar tidak diblokir hotlink
const express = require('express');
const axios   = require('axios');
const router  = express.Router();

// Domain yang diizinkan untuk proxy thumbnail (whitelist SSRF protection)
const ALLOWED_THUMB_HOSTS = [
  'bokepcolmek.me',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
  'i3.wp.com',
  'secure.gravatar.com',
];

router.get('/proxy-thumb', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) return res.status(400).send('Bad URL');

    let parsed;
    try { parsed = new URL(url); } catch { return res.status(400).send('Invalid URL'); }
    if (!ALLOWED_THUMB_HOSTS.includes(parsed.hostname)) {
      return res.status(403).send('Forbidden: host not allowed');
    }

    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    'https://bokepcolmek.me/',
        'Accept':     'image/*,*/*',
      },
      timeout: 10_000,
      maxRedirects: 5,
    });

    res.set('Content-Type', resp.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(resp.data);
  } catch (e) {
    console.error('[PROXY-THUMB]', e.message);
    res.status(404).send('Not found');
  }
});

module.exports = router;
