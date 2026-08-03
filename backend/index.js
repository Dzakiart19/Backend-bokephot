const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const apiRoutes   = require('./routes/api');
const proxyRoutes = require('./routes/proxy');
const miscRoutes  = require('./routes/misc');
const { createRateLimit } = require('./lib/rateLimit');

const app  = express();
const PORT = process.env.PORT || 5000;

console.log(`ℹ️  PORT=${PORT}`);

// ── Security headers ──────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimit   = createRateLimit({ windowMs: 60_000, max: 60,  message: 'Terlalu banyak permintaan. Coba lagi dalam 1 menit.' });
const thumbLimit = createRateLimit({ windowMs: 60_000, max: 120, message: 'Terlalu banyak permintaan thumbnail. Coba lagi nanti.' });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/bh/proxy-thumb', thumbLimit);
app.use('/api/bh',             apiLimit);
app.use('/api/bh',             apiRoutes);
app.use('/api/bh',             proxyRoutes);
app.use('/',                   miscRoutes);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
