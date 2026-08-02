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

async function fetchPage(url) {
  const hit = getCached(url);
  if (hit) return hit;
  const resp = await axios.get(url, { headers: HEADERS, timeout: 15_000, maxRedirects: 5 });
  setCache(url, resp.data);
  return resp.data;
}

module.exports = { fetchPage, BASE_URL, HEADERS };
