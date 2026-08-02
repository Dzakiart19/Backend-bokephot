// BokepHunter Frontend - script.js
const API = '/api/bh';

// State
let currentPage   = 1;
let currentFilter = 'terbaru';
let currentCat    = null;
let currentSearch = null;
let totalPages    = 1;
let isLoading     = false;

// DOM refs
const videoGrid    = document.getElementById('videoGrid');
const skeletonGrid = document.getElementById('skeletonGrid');
const emptyState   = document.getElementById('emptyState');
const errorState   = document.getElementById('errorState');
const errorMsg     = document.getElementById('errorMsg');
const pagination   = document.getElementById('pagination');
const pageInfo     = document.getElementById('pageInfo');
const pageButtons  = document.getElementById('pageButtons');
const pageTitle    = document.getElementById('pageTitle');

// Category display names
const CAT_NAMES = {
  'bokep-indonesia': '🇮🇩 Bokep Indonesia',
  'bokep-indo':      '🔥 Bokep Indo',
  'bokep-sin':       '😈 Bokep Sin',
  'bokep-dosa':      '💋 Bokep Dosa',
  'bokep-barat':     '🌍 Bokep Barat',
  'bokep-asia':      '🌏 Bokep Asia',
  'bokep-jepang':    '🇯🇵 Bokep Jepang',
  'tanpa-sensor':    '🔞 Tanpa Sensor',
};

// Filter display names
const FILTER_NAMES = {
  'terbaru':  '🆕 Video Terbaru',
  'dilihat':  '👁️ Terbanyak Dilihat',
  'disukai':  '❤️ Terbanyak Disukai',
  'panjang':  '⏱️ Durasi Panjang',
  'random':   '🎲 Video Random',
};

// Init from URL params
function initFromURL() {
  const params = new URLSearchParams(location.search);
  currentPage   = parseInt(params.get('page') || '1');
  currentFilter = params.get('filter') || 'terbaru';
  currentCat    = params.get('cat') || null;
  currentSearch = params.get('q') || null;

  // Update active filter buttons (only show on homepage, not category/search)
  const filterButtons = document.getElementById('filterButtons');
  const showFilters   = !currentCat && !currentSearch;
  filterButtons.style.display = showFilters ? '' : 'none';

  document.querySelectorAll('.filter-btn').forEach(btn => {
    const active = btn.dataset.filter === currentFilter;
    btn.classList.toggle('bg-pink-600',    active);
    btn.classList.toggle('text-white',     active);
    btn.classList.toggle('border-pink-500',active);
    btn.classList.toggle('bg-pink-900/40', !active);
    btn.classList.toggle('text-pink-300',  !active);
    btn.classList.toggle('border-pink-700/30', !active);
    btn.classList.toggle('active', active);
  });

  // Update active category in desktop nav
  document.querySelectorAll('.cat-link').forEach(a => {
    const active = a.dataset.cat === currentCat;
    a.classList.toggle('bg-pink-800/60',   active);
    a.classList.toggle('text-white',       active);
    a.classList.toggle('border-pink-500/50', active);
    a.classList.toggle('bg-pink-900/40',   !active);
    a.classList.toggle('text-pink-200/70', !active);
    a.classList.toggle('border-pink-700/30', !active);
  });

  // Update active in mobile bottom nav
  document.querySelectorAll('.mobile-cat-link').forEach(a => {
    const active = a.dataset.cat === currentCat;
    a.classList.toggle('text-pink-200', active);
    a.classList.toggle('text-pink-400/60', !active);
  });

  // Mobile home link
  const mobileHome = document.getElementById('mobileHomeLink');
  if (mobileHome) {
    const homeActive = !currentCat && !currentSearch;
    mobileHome.classList.toggle('text-pink-200', homeActive);
    mobileHome.classList.toggle('text-pink-400/60', !homeActive);
  }

  // Page title
  if (currentSearch) {
    pageTitle.textContent = `🔍 Hasil: "${currentSearch}"`;
  } else if (currentCat) {
    pageTitle.textContent = CAT_NAMES[currentCat] || currentCat;
  } else {
    pageTitle.textContent = FILTER_NAMES[currentFilter] || '🆕 Video Terbaru';
  }
}

// Proxy thumbnails
function thumbSrc(url) {
  return url || '';
}

// Format angka singkat: 12345 → 12.3k
function fmtNum(val) {
  const n = parseInt(String(val).replace(/[.,k]/gi, '')) || 0;
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'jt';
  if (n >= 1000)    return (n/1000).toFixed(1).replace(/\.0$/,'') + 'k';
  return String(n);
}

// Build video card HTML
function buildCard(v) {
  const thumb    = thumbSrc(v.thumbnail || '');
  const title    = escHtml(v.title);
  const views    = v.views    ? fmtNum(v.views)    : '';
  const likes    = v.likes    ? fmtNum(v.likes)    : '';
  const duration = v.duration || v.timeAgo || '';
  return `
    <a href="/video/${v.slug}" class="group block hover-card">
      <div class="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb ? `<img src="${escAttr(thumb)}" alt="${title}" class="thumb-img h-full w-full object-cover" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="absolute inset-0 bg-gradient-to-t from-pink-950/70 via-transparent to-transparent"></div>
        <!-- Duration badge top-right -->
        ${duration ? `<span class="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white/90">${duration}</span>` : ''}
        <!-- Views + Likes bottom-left -->
        <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1.5">
          ${views ? `<span class="flex items-center gap-0.5 rounded-md bg-pink-950/70 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-pink-200/80"><svg class="w-2.5 h-2.5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>${views}</span>` : ''}
          ${likes ? `<span class="flex items-center gap-0.5 rounded-md bg-pink-950/70 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-pink-300/80"><svg class="w-2.5 h-2.5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>${likes}</span>` : ''}
        </div>
        <!-- Play button hover -->
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-10 h-10 rounded-full bg-pink-500/80 flex items-center justify-center">
            <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="mt-1.5 sm:mt-2 px-0.5">
        <h3 class="text-[11px] sm:text-[13px] font-semibold text-pink-50 leading-snug line-clamp-2 group-hover:text-pink-200 transition-colors">${title}</h3>
      </div>
    </a>`;
}

// Show skeleton
function showSkeleton(count = 20) {
  const tmpl = document.getElementById('skeletonTemplate');
  let html = '';
  for (let i = 0; i < count; i++) html += tmpl.outerHTML.replace('id="skeletonTemplate"', '');
  skeletonGrid.innerHTML = tmpl.outerHTML + html;
  skeletonGrid.classList.remove('hidden');
  videoGrid.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  pagination.classList.add('hidden');
}

function hideSkeleton() {
  skeletonGrid.classList.add('hidden');
  videoGrid.classList.remove('hidden');
}

// Render pagination
function renderPagination(current, total) {
  if (total <= 1) { pagination.classList.add('hidden'); return; }
  pagination.classList.remove('hidden');
  pageInfo.textContent = `Halaman ${current} dari ${total}`;

  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);

  let html = '';
  if (current > 1) html += `<button class="page-btn w-9 h-9 flex items-center justify-center rounded-lg bg-pink-900 hover:bg-pink-800 text-pink-400 text-xs font-semibold border border-pink-800 transition-colors" data-page="${current - 1}">◀</button>`;
  pages.forEach(p => {
    if (p === '...') { html += `<span class="px-1 text-pink-600 text-xs">…</span>`; return; }
    const active = p === current;
    html += `<button class="page-btn w-9 h-9 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-pink-600 text-white border-pink-500' : 'bg-pink-900 hover:bg-pink-800 text-pink-400 border-pink-800'}" data-page="${p}">${p}</button>`;
  });
  if (current < total) html += `<button class="page-btn w-9 h-9 flex items-center justify-center rounded-lg bg-pink-900 hover:bg-pink-800 text-pink-400 text-xs font-semibold border border-pink-800 transition-colors" data-page="${current + 1}">▶</button>`;
  pageButtons.innerHTML = html;

  pageButtons.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(parseInt(btn.dataset.page)));
  });
}

function navigateTo(page) {
  currentPage = page;
  const params = new URLSearchParams(location.search);
  params.set('page', page);
  history.pushState({}, '', `?${params.toString()}`);
  loadVideos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Load videos
async function loadVideos() {
  if (isLoading) return;
  isLoading = true;
  showSkeleton();

  try {
    let url;
    if (currentSearch) {
      url = `${API}/search?q=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
    } else if (currentCat) {
      url = `${API}/category/${currentCat}?page=${currentPage}`;
    } else {
      url = `${API}/videos?page=${currentPage}&filter=${encodeURIComponent(currentFilter)}`;
    }

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    hideSkeleton();

    if (!data.videos || data.videos.length === 0) {
      emptyState.classList.remove('hidden');
      videoGrid.innerHTML = '';
      pagination.classList.add('hidden');
    } else {
      videoGrid.innerHTML = data.videos.map(buildCard).join('');
      totalPages = data.totalPages || 1;
      renderPagination(currentPage, totalPages);
    }
  } catch (e) {
    hideSkeleton();
    errorState.classList.remove('hidden');
    errorMsg.textContent = e.message;
    console.error(e);
  } finally {
    isLoading = false;
  }
}

// Helpers
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Mobile sidebar
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileSidebar').classList.remove('-translate-x-full');
  document.getElementById('mobileOverlay').classList.remove('hidden');
});
function closeSidebar() {
  document.getElementById('mobileSidebar').classList.add('-translate-x-full');
  document.getElementById('mobileOverlay').classList.add('hidden');
}

// Search toggle (header)
document.getElementById('searchToggle').addEventListener('click', () => {
  const bar = document.getElementById('searchBar');
  const si  = document.getElementById('searchIcon');
  const ci  = document.getElementById('closeIcon');
  const open = !bar.classList.contains('hidden');
  bar.classList.toggle('hidden', open);
  si.classList.toggle('hidden', !open);
  ci.classList.toggle('hidden', open);
  if (!open) document.getElementById('searchInput').focus();
});

document.getElementById('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  window.location.href = `/?q=${encodeURIComponent(q)}`;
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.filter === currentFilter) return;
    currentFilter = btn.dataset.filter;
    currentPage   = 1;
    const params = new URLSearchParams(location.search);
    params.set('filter', currentFilter);
    params.delete('page');
    history.pushState({}, '', `?${params.toString()}`);
    initFromURL();
    loadVideos();
  });
});

window.addEventListener('popstate', () => { initFromURL(); loadVideos(); });

// Boot
initFromURL();
loadVideos();
