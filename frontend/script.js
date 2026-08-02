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

// Category display names (sinkron dengan getCategories() di scraper.js)
const CAT_NAMES = {
  'bokep-indo':         '🇮🇩 Bokep Indo',
  'bokep-indonesia':    '🔥 Bokep Indonesia',
  'bokep-indo-terbaru': '🆕 Indo Terbaru',
  'bokep-indo-viral':   '📱 Indo Viral',
  'bokep-colmek':       '💦 Bokep Colmek',
  'bokep-jepang':       '🇯🇵 Bokep Jepang',
  'bokep-barat':        '🌍 Bokep Barat',
  'bokep-asia':         '🌏 Bokep Asia',
};

// Init from URL params
function initFromURL() {
  const params = new URLSearchParams(location.search);
  currentPage   = parseInt(params.get('page') || '1');
  currentFilter = params.get('filter') || 'terbaru';
  currentCat    = params.get('cat') || null;
  currentSearch = params.get('q') || null;

  // Filter hanya tampil di homepage (bukan kategori/search)
  const filterButtons = document.getElementById('filterButtons');
  filterButtons.style.display = (!currentCat && !currentSearch) ? '' : 'none';

  // Active state kategori desktop nav
  document.querySelectorAll('.cat-link').forEach(a => {
    const active = a.dataset.cat === currentCat;
    a.classList.toggle('bg-pink-800/60',     active);
    a.classList.toggle('text-white',         active);
    a.classList.toggle('border-pink-500/50', active);
    a.classList.toggle('bg-pink-900/40',     !active);
    a.classList.toggle('text-pink-200/70',   !active);
    a.classList.toggle('border-pink-700/30', !active);
  });

  // Active state mobile bottom nav
  document.querySelectorAll('.mobile-cat-link').forEach(a => {
    const active = a.dataset.cat === currentCat;
    a.classList.toggle('text-pink-200',    active);
    a.classList.toggle('text-pink-400/60', !active);
  });

  // Mobile home link
  const mobileHome = document.getElementById('mobileHomeLink');
  if (mobileHome) {
    const homeActive = !currentCat && !currentSearch;
    mobileHome.classList.toggle('text-pink-200',    homeActive);
    mobileHome.classList.toggle('text-pink-400/60', !homeActive);
  }

  // Page title
  if (currentSearch) {
    pageTitle.textContent = `🔍 Hasil: "${currentSearch}"`;
  } else if (currentCat) {
    pageTitle.textContent = CAT_NAMES[currentCat] || currentCat;
  } else {
    pageTitle.textContent = '🆕 Video Terbaru';
  }
}

// Build video card HTML
function buildCard(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  return `
    <a href="/video/${v.slug}" class="group block hover-card">
      <div class="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb
          ? `<img src="${escAttr(thumb)}" alt="${title}" class="thumb-img h-full w-full object-cover" loading="lazy" onerror="this.style.display='none'">`
          : ''}
        <div class="absolute inset-0 bg-gradient-to-t from-pink-950/70 via-transparent to-transparent"></div>
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

  const pages = [1];
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
  } catch(e) {
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

// Search toggle
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
