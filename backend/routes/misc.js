// Health check, config, dan static page routes
const express = require('express');
const path    = require('path');
const router  = express.Router();

const FRONTEND = path.join(__dirname, '../../frontend');

// GET /api/health
router.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Kampung Bokep API is running (source: bokepcolmek.me)' });
});

// GET /api/config — resolves public backend URL
router.get('/api/config', (req, res) => {
  const domain     = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim() || null;
  const backendUrl = process.env.REPLIT_URL || (domain ? `https://${domain}` : `${req.protocol}://${req.get('host')}`);
  res.json({ success: true, backendUrl, apiUrl: `${backendUrl}/api` });
});

// Frontend pages
router.get('/', (_req, res) => res.sendFile(path.join(FRONTEND, 'index.html')));
router.get('/detail', (_req, res) => res.sendFile(path.join(FRONTEND, 'detail.html')));
router.get('/video/:slug', (_req, res) => res.sendFile(path.join(FRONTEND, 'detail.html')));

module.exports = router;
