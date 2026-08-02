const axios            = require('axios');
const { getCached, setCache } = require('./cache');

const BASE_URL = 'https://bokepcolmek.me';

const HEADERS = {
  'User-Agent':         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'Accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language':    'id-ID,id;q=0.9,en-US;q=0.8',
  'Accept-Encoding':    'gzip, deflate, br',
  'Sec-Ch-Ua':          '"Chromium";v="138", "Google Chrome";v="138"',
  'Sec-Ch-Ua-Mobile':   '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest':     'document',
  'Sec-Fetch-Mode':     'navigate',
  'Sec-Fetch-Site':     'none',
  'Connection':         'keep-alive',
};

const TIMEOUT_MS  = 30_000;
const MAX_RETRIES = 2; // hanya retry untuk network error / timeout

async function fetchPage(url) {
  const hit = getCached(url);
  if (hit) return hit;

  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        console.log(`[FETCHER] retry ${attempt}/${MAX_RETRIES} → ${url}`);
      }
      const resp = await axios.get(url, {
        headers:      HEADERS,
        timeout:      TIMEOUT_MS,
        maxRedirects: 5,
        // jangan throw untuk 5xx agar bisa kita handle sendiri
        validateStatus: status => status < 400 || (status >= 400 && status < 600),
      });

      if (resp.status >= 500) {
        // Error dari sisi sumber (502, 503, dll) — jangan retry, langsung lempar
        const err = new Error(`SOURCE_${resp.status}`);
        err.sourceStatus = resp.status;
        throw err;
      }
      if (resp.status === 404) {
        const err = new Error('SOURCE_404');
        err.sourceStatus = 404;
        throw err;
      }

      setCache(url, resp.data);
      return resp.data;
    } catch (e) {
      // Jika error dari sumber (bukan timeout/network), jangan retry
      if (e.sourceStatus) throw e;

      lastErr = e;
      const isTimeout = e.code === 'ECONNABORTED' || (e.message && e.message.includes('timeout'));
      if (isTimeout) {
        console.warn(`[FETCHER] timeout attempt ${attempt + 1}: ${url}`);
        if (attempt === MAX_RETRIES) {
          const terr = new Error('SOURCE_TIMEOUT');
          terr.sourceStatus = 'timeout';
          throw terr;
        }
      } else {
        // Network error lain — retry sekali
        console.warn(`[FETCHER] network error attempt ${attempt + 1}: ${e.message}`);
        if (attempt >= 1) throw e;
      }
    }
  }
  throw lastErr;
}

module.exports = { fetchPage, BASE_URL, HEADERS };
