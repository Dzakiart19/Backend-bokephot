// BokepHunter Detail Page - detail.js
const API = '/api/bh';

const loadingState  = document.getElementById('loadingState');
const videoContent  = document.getElementById('videoContent');
const errorState    = document.getElementById('errorState');
const errorMsg      = document.getElementById('errorMsg');

// Get slug from URL path /video/SLUG
function getSlug() {
  const path = location.pathname;
  const m = path.match(/\/video\/(.+)/);
  return m ? m[1] : null;
}

// Helpers
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Proxy thumbnails yang block hotlinking (indoav thumbnails bisa langsung)
function thumbSrc(url) {
  if (!url) return '';
  return url;
}

// Fetch with timeout
function fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// Build related card (grid style for mobile)
function buildRelatedCardGrid(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  return `
    <a href="/video/${v.slug}" class="group block">
      <div class="relative aspect-video rounded-lg overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb ? `<img src="${thumb}" alt="${title}" class="h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-8 h-8 rounded-full bg-pink-500/80 flex items-center justify-center">
            <svg class="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="mt-1.5">
        <h4 class="text-[11px] font-semibold text-pink-100 line-clamp-2 leading-snug group-hover:text-white">${title}</h4>
        <p class="text-[10px] text-pink-400/60 mt-0.5">${v.timeAgo || ''}</p>
      </div>
    </a>`;
}

// Build related card (sidebar list style for desktop)
function buildRelatedCardList(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  const views = v.views ? `${parseInt(v.views).toLocaleString('id-ID')} views` : '';
  return `
    <a href="/video/${v.slug}" class="flex gap-2 sm:gap-3 group rounded-xl hover:bg-pink-900/40 p-2 -mx-2 transition-colors">
      <div class="relative w-[120px] sm:w-[140px] shrink-0 aspect-video rounded-lg overflow-hidden bg-pink-900 border border-pink-800/50">
        ${thumb ? `<img src="${thumb}" alt="${title}" class="w-full h-full object-cover" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="flex-1 min-w-0 py-0.5">
        <h4 class="text-[12px] font-semibold text-pink-100 group-hover:text-white line-clamp-2 leading-snug">${title}</h4>
        ${views ? `<p class="mt-1 text-[11px] text-pink-400/60">${views}</p>` : ''}
        <p class="text-[11px] text-pink-500/50">${v.timeAgo || ''}</p>
      </div>
    </a>`;
}

// Load video detail
async function loadDetail() {
  const slug = getSlug();
  if (!slug) {
    showError('Slug video tidak ditemukan');
    return;
  }

  loadingState.classList.remove('hidden');
  videoContent.classList.add('hidden');
  errorState.classList.add('hidden');

  try {
    const resp = await fetchWithTimeout(`${API}/video/${encodeURIComponent(slug)}`, 15000);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data || !data.title) throw new Error('Data video tidak valid');

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

  // Meta tags
  document.getElementById('pageTitle').textContent = `${data.title} — BokepHunter`;
  document.getElementById('pageMeta').setAttribute('content', data.description || data.title);

  // Thumbnail
  const thumbEl = document.getElementById('playerThumb');
  if (data.thumbnail) { thumbEl.src = thumbSrc(data.thumbnail); thumbEl.alt = data.title; }
  else thumbEl.style.display = 'none';

  // Title
  document.getElementById('videoTitle').textContent = data.title;

  // Views
  const viewsEl = document.querySelector('#videoViews span');
  viewsEl.textContent = data.views ? `${parseInt(data.views).toLocaleString('id-ID')} views` : '';

  // Time
  const timeEl = document.querySelector('#videoTime span');
  timeEl.textContent = data.timeAgo || '';

  // Categories
  const catEl = document.getElementById('videoCategories');
  if (data.categories && data.categories.length) {
    catEl.innerHTML = data.categories.map(c =>
      `<a href="/?cat=${c.slug}" class="rounded-lg px-2.5 py-1 text-[11px] font-semibold bg-pink-900/60 text-pink-200/70 hover:bg-pink-800/60 border border-pink-700/30 transition-colors">${escHtml(c.name)}</a>`
    ).join('');
  }

  // Description
  if (data.description) {
    const descEl = document.getElementById('videoDesc');
    descEl.textContent = data.description;
    descEl.classList.remove('hidden');
  }

  // Player setup
  const overlay = document.getElementById('playerOverlay');
  const frame   = document.getElementById('playerFrame');
  const noEmbed = document.getElementById('noEmbed');
  const playBtn = document.getElementById('playBtn');

  // Semua video dari indoav — selalu fetch /embed untuk dapat direct URL (RC4 decrypt)
  let embedPromise = null;
  const qs = data.thumbnail ? `?thumbnail=${encodeURIComponent(data.thumbnail)}` : '';
  embedPromise = fetchWithTimeout(`${API}/video/${encodeURIComponent(data.slug)}/embed${qs}`, 15000)
    .then(r => r.json())
    .then(r => ({ embedUrl: r.embedUrl || null, type: r.type || 'direct' }))
    .catch(() => ({ embedUrl: null, type: 'direct' }));

  overlay.addEventListener('click', async () => {
    // Show spinner while waiting (usually already resolved by now)
    playBtn.innerHTML = `<svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>`;

    try {
      const { embedUrl, type } = await embedPromise;
      if (embedUrl) {
        showEmbed(embedUrl, type);
      } else {
        showNoEmbed(data.slug);
      }
    } catch (e) {
      showNoEmbed(data.slug);
    }
  });

  function showEmbed(url, type) {
    overlay.style.display = 'none';
    frame.classList.remove('hidden');

    const isM3U8 = url.includes('.m3u8');
    const isMP4  = url.includes('.mp4') || url.includes('.webm');
    const isIndoAvEmbed = url.includes('indoav.com/video/embed');

    if (type === 'direct' || isM3U8 || isMP4) {
      // Direct video — play dengan HLS.js atau native <video>
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.background = '#000';

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
    } else if (isIndoAvEmbed) {
      // IndoAV embed — sandboxed iframe.
      // allow-popups-to-escape-sandbox: player indoav butuh buka link ad (tidak di tab kita)
      // allow-scripts + allow-same-origin: player HLS/Plyr butuh JS dan XHR ke indoav.com
      // NO allow-top-navigation → ad tidak bisa redirect halaman utama kita
      frame.innerHTML = `<iframe
        src="${url}"
        width="100%" height="100%"
        frameborder="0"
        allowfullscreen
        allow="autoplay; fullscreen"
        scrolling="no"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"
      ></iframe>`;
    } else {
      // Regular iframe
      frame.innerHTML = `<iframe src="${url}" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay; fullscreen" scrolling="no"></iframe>`;
    }
  }

  function showNoEmbed(slug) {
    overlay.style.display = 'none';
    noEmbed.classList.remove('hidden');
    noEmbed.classList.add('flex');
    document.getElementById('watchExternalLink').href = `https://www.indoav.com/video/${slug}`;
  }

  // Related videos
  const relatedList   = document.getElementById('relatedList');
  const mobileRelated = document.getElementById('mobileRelated');

  if (data.related && data.related.length) {
    relatedList.innerHTML = data.related.map(buildRelatedCardList).join('');
    mobileRelated.innerHTML = data.related.slice(0, 8).map(buildRelatedCardGrid).join('');
  } else {
    relatedList.innerHTML = '<p class="text-pink-400/50 text-sm">Tidak ada video terkait</p>';
  }
}

// Search form
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

// Boot
loadDetail();
