// Detail page — Kampung Bokep
import { fetchVideoDetail, fetchEmbed }             from './lib/api.js';
import { buildRelatedCardGrid, buildRelatedCardList } from './lib/cards.js';
import { escHtml, escAttr }                          from './lib/utils.js';
import { fireAd, firePendingAd, initAdClickDelegation } from './lib/ads.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loadingState = document.getElementById('loadingState');
const videoContent = document.getElementById('videoContent');
const errorState   = document.getElementById('errorState');
const errorMsg     = document.getElementById('errorMsg');

// ── Slug dari /video/SLUG ─────────────────────────────────────────────────────
function getSlug() {
  const m = location.pathname.match(/\/video\/(.+)/);
  return m ? m[1] : null;
}

// ── Fire pending ad dari klik video card (set via localStorage flag) ─────────
firePendingAd();
initAdClickDelegation(); // ← pasang event delegation untuk related video cards

// ── Load & render ─────────────────────────────────────────────────────────────
async function loadDetail() {
  const slug = getSlug();
  if (!slug) { showError('Slug video tidak ditemukan'); return; }

  loadingState.classList.remove('hidden');
  videoContent.classList.add('hidden');
  errorState.classList.add('hidden');

  try {
    const data = await fetchVideoDetail(slug);
    if (!data?.title) throw new Error('Data video tidak valid');
    renderVideo(data);
  } catch (e) {
    showError(e.message);
  }
}

function showError(msg) {
  loadingState.classList.add('hidden');
  videoContent.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorMsg.textContent = msg;
}

function renderVideo(data) {
  loadingState.classList.add('hidden');
  videoContent.classList.remove('hidden');

  // Meta
  document.getElementById('pageTitle').textContent   = `${data.title} — Kampung Bokep`;
  document.getElementById('pageMeta').setAttribute('content', data.description || data.title);

  // Thumbnail
  const thumbEl = document.getElementById('playerThumb');
  if (data.thumbnail) { thumbEl.src = data.thumbnail; thumbEl.alt = data.title; }
  else thumbEl.style.display = 'none';

  // Title & meta
  document.getElementById('videoTitle').textContent = data.title;
  const timeSpan = document.querySelector('#videoTime span');
  if (timeSpan) timeSpan.textContent = data.duration || '';

  const postedEl = document.getElementById('videoPosted');
  if (postedEl) {
    const s = postedEl.querySelector('span');
    if (s) s.textContent = data.postedAgo || '';
    postedEl.classList.toggle('hidden', !data.postedAgo);
  }

  // Views/likes tidak tersedia — sembunyikan
  document.getElementById('videoViews')?.classList.add('hidden');
  document.getElementById('videoLikes')?.classList.add('hidden');

  // Categories
  const catEl = document.getElementById('videoCategories');
  if (data.categories?.length) {
    catEl.innerHTML = data.categories.map(c =>
      `<a href="/?cat=${escAttr(c.slug)}" class="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-pink-900/60 text-pink-200/70 hover:bg-pink-800/60 border border-pink-700/30 transition-colors">${escHtml(c.name)}</a>`
    ).join('');
  }

  // Description
  if (data.description) {
    const descEl = document.getElementById('videoDesc');
    descEl.textContent = data.description;
    descEl.classList.remove('hidden');
  }

  // ── Player setup ──────────────────────────────────────────────────────
  const overlay = document.getElementById('playerOverlay');
  const frame   = document.getElementById('playerFrame');
  const noEmbed = document.getElementById('noEmbed');
  const playBtn = document.getElementById('playBtn');

  // Siapkan embed promise — data.embedUrl sudah ada, atau fetch dari /embed
  const embedPromise = data.embedUrl
    ? Promise.resolve({ embedUrl: data.embedUrl, type: 'iframe' })
    : fetchEmbed(data.slug).catch(() => ({ embedUrl: null, type: 'iframe' }));

  overlay.addEventListener('click', async () => {
    fireAd(); // ← iklan saat klik play (direct user gesture)

    playBtn.innerHTML = `<svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>`;

    try {
      const { embedUrl, type } = await embedPromise;
      if (embedUrl) showEmbed(embedUrl, type);
      else showNoEmbed(data.slug);
    } catch { showNoEmbed(data.slug); }
  });

  function showEmbed(url, type) {
    overlay.style.display = 'none';
    frame.classList.remove('hidden');

    const isM3U8 = url.includes('.m3u8');
    const isMP4  = url.includes('.mp4') || url.includes('.webm');

    if (type === 'direct' || isM3U8 || isMP4) {
      // Native video / HLS
      const video       = document.createElement('video');
      video.controls    = true;
      video.autoplay    = true;
      video.playsInline = true;
      video.style.cssText = 'width:100%;height:100%;background:#000';

      if (isM3U8 && typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        video.src = url;
      }
      frame.innerHTML = '';
      frame.appendChild(video);
      video.play().catch(() => {});
    } else {
      // Iframe embed (xvideos, xhamster, fbplay, dll)
      frame.innerHTML = `<iframe
        src="${escAttr(url)}"
        width="100%" height="100%"
        frameborder="0" scrolling="no"
        allowfullscreen
        allow="autoplay; fullscreen; picture-in-picture"
      ></iframe>`;
    }
  }

  function showNoEmbed(slug) {
    overlay.style.display = 'none';
    noEmbed.classList.remove('hidden');
    noEmbed.classList.add('flex');
    document.getElementById('watchExternalLink').href = `https://bokepcolmek.me/vids/${slug}/`;
  }

  // ── Related videos ────────────────────────────────────────────────────
  const relatedList   = document.getElementById('relatedList');
  const mobileRelated = document.getElementById('mobileRelated');
  if (data.related?.length) {
    relatedList.innerHTML   = data.related.map(buildRelatedCardList).join('');
    mobileRelated.innerHTML = data.related.slice(0, 8).map(buildRelatedCardGrid).join('');
  } else {
    relatedList.innerHTML = '<p class="text-pink-400/50 text-sm">Tidak ada video terkait</p>';
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById('searchToggle').addEventListener('click', () => {
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) document.getElementById('searchInput').focus();
});

document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim();
  if (q) window.location.href = `/?q=${encodeURIComponent(q)}`;
});

// ── Expose ke global (dipanggil dari onclick HTML) ────────────────────────────
window.loadDetail = loadDetail;

// ── Boot ──────────────────────────────────────────────────────────────────────
loadDetail();
