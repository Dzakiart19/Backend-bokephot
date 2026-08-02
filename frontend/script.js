// BokepHunter Frontend - script.js
const API = '/api/bh';

// State
let currentPage = 1;
let currentSort = 'new';
let currentCat = null;
let currentSearch = null;
let totalPages = 1;
let isLoading = false;

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

// Init from URL params
function initFromURL() {
  const params = new URLSearchParams(location.search);
  currentPage   = parseInt(params.get('page') || '1');
  currentSort   = params.get('sort') || 'new';
  currentCat    = params.get('cat') || null;
  currentSearch = params.get('q') || null;

  // Update sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    const active = btn.dataset.sort === currentSort;
    btn.classList.toggle('bg-pink-600', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('border-pink-500', active);
    btn.classList.toggle('bg-pink-900/40', !active);
    btn.classList.toggle('text-pink-300', !active);
    btn.classList.toggle('border-pink-700/30', !active);
    btn.classList.toggle('active', active);
  });

  // Update active category in nav
  document.querySelectorAll('.cat-link').forEach(a => {
    const active = a.dataset.cat === currentCat;
    a.classList.toggle('bg-pink-800/60', active);
    a.classList.toggle('text-white', active);
    a.classList.toggle('bg-pink-900/40', !active);
    a.classList.toggle('text-pink-200/70', !active);
  });

  // Update page title
  if (currentSearch) {
    pageTitle.textContent = `🔍 Hasil: "${currentSearch}"`;
    document.querySelectorAll('.sort-btn').forEach(b => b.style.display = 'none');
  } else if (currentCat) {
    const catNames = {
      'bokep-indonesia': '🇮🇩 Bokep Indonesia', 'bokep-indo': '🔥 Bokep Indo',
      'bokep-viral': '📱 Bokep Viral', 'bokep-jilbab': '🧕 Bokep Jilbab',
      'bokep-abg': '✨ Bokep ABG', 'bokep-colmek': '🌶️ Bokep Colmek',
      'bokep-tiktok': '🎵 Bokep TikTok', 'bokep-skandal': '📸 Bokep Skandal',
      'bokep-mahasiswi': '🎓 Bokep Mahasiswi', 'bokep-barat': '🌍 Bokep Barat',
      'bokep-asia': '🌏 Bokep Asia', 'bokep-jepang': '🇯🇵 Bokep Jepang',
      'bokep-lesbian': '💕 Bokep Lesbian',
    };
    pageTitle.textContent = catNames[currentCat] || currentCat;
  } else {
    pageTitle.textContent = currentSort === 'popular' ? '🔥 Video Popular' : '🆕 Video Terbaru';
  }
}

// Proxy thumbnails yang block hotlinking
function thumbSrc(url) {
  if (!url) return '';
  // a.embedan.com (indoav thumbnails) bisa diakses langsung
  return url;
}

// Build video card HTML
function buildCard(v) {
  const thumb = thumbSrc(v.thumbnail || '');
  const title = escHtml(v.title);
  const views = v.views ? `${parseInt(v.views).toLocaleString('id-ID')} views` : '';
  const time  = v.timeAgo || '';
  return `
    <a href="/video/${v.slug}" class="group block hover-card">
      <div class="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb ? `<img src="${escAttr(thumb)}" alt="${title}" class="thumb-img h-full w-full object-cover" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="absolute inset-0 bg-gradient-to-t from-pink-950/70 via-transparent to-transparent hidden sm:block"></div>
        ${views ? `<span class="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 rounded-md bg-pink-950/70 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-pink-200/70 hidden sm:block">${views}</span>` : ''}
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-10 h-10 rounded-full bg-pink-500/80 flex items-center justify-center">
            <svg class="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="mt-1.5 sm:mt-2.5 px-0.5">
        <h3 class="text-[11px] sm:text-[13px] font-semibold text-pink-50 leading-snug line-clamp-2 group-hover:text-pink-200 transition-colors">${title}</h3>
        <p class="mt-0.5 sm:mt-1 text-[10px] sm:text-[11px] text-pink-300/60">${time}</p>
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
      url = `${API}/category/${currentCat}?page=${currentPage}&sort=${currentSort}`;
    } else {
      url = `${API}/videos?page=${currentPage}&sort=${currentSort}`;
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

// Events
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileSidebar').classList.remove('-translate-x-full');
  document.getElementById('mobileOverlay').classList.remove('hidden');
});
function closeSidebar() {
  document.getElementById('mobileSidebar').classList.add('-translate-x-full');
  document.getElementById('mobileOverlay').classList.add('hidden');
}

document.getElementById('searchToggle').addEventListener('click', () => {
  const bar = document.getElementById('searchBar');
  const si = document.getElementById('searchIcon');
  const ci = document.getElementById('closeIcon');
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

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.sort === currentSort) return;
    currentSort = btn.dataset.sort;
    currentPage = 1;
    const params = new URLSearchParams(location.search);
    params.set('sort', currentSort);
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
