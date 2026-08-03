// Homepage — BokepHunter
import { fetchVideos, fetchCategory, fetchSearch } from './lib/api.js';
import { buildCard, showSkeleton, hideSkeleton }   from './lib/cards.js';
import { renderPagination }                         from './lib/pagination.js';
import { loadAndRenderCategories, updateActiveStates, catMap } from './lib/nav.js';
import { fireAd, firePendingAd, initAdClickDelegation } from './lib/ads.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentPage   = 1;
let currentCat    = null;
let currentSearch = null;
let isLoading     = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const videoGrid  = document.getElementById('videoGrid');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMsg   = document.getElementById('errorMsg');
const pageTitle  = document.getElementById('pageTitle');

// ── Parse URL params ──────────────────────────────────────────────────────────
function initFromURL() {
  const params  = new URLSearchParams(location.search);
  currentPage   = parseInt(params.get('page') || '1');
  currentCat    = params.get('cat')  || null;
  currentSearch = params.get('q')    || null;

  // Filter bar hanya di homepage
  const filterBar = document.getElementById('filterButtons');
  if (filterBar) filterBar.style.display = (!currentCat && !currentSearch) ? '' : 'none';

  updateActiveStates(currentCat);


  // Page title
  if (currentSearch) {
    pageTitle.textContent = `Hasil: "${currentSearch}"`;
  } else if (currentCat) {
    const c = catMap[currentCat];
    pageTitle.textContent = c ? c.name : currentCat;
  } else {
    pageTitle.textContent = 'Video Terbaru';
  }
}

// ── Load & render videos ──────────────────────────────────────────────────────
async function loadVideos() {
  if (isLoading) return;
  isLoading = true;
  showSkeleton();

  try {
    let data;
    if (currentSearch)    data = await fetchSearch(currentSearch, currentPage);
    else if (currentCat)  data = await fetchCategory(currentCat,  currentPage);
    else                  data = await fetchVideos(currentPage);

    hideSkeleton();

    if (!data.videos?.length) {
      emptyState.classList.remove('hidden');
      videoGrid.innerHTML = '';
      document.getElementById('pagination').classList.add('hidden');
    } else {
      videoGrid.innerHTML = data.videos.map(buildCard).join('');
      renderPagination(currentPage, data.totalPages || 1, navigateTo);
    }
  } catch (e) {
    hideSkeleton();
    errorState.classList.remove('hidden');
    errorMsg.textContent = e.message;
    console.error('[loadVideos]', e);
  } finally {
    isLoading = false;
  }
}

function navigateTo(page) {
  fireAd(); // ← iklan saat klik pagination (user gesture langsung)
  currentPage = page;
  const params = new URLSearchParams(location.search);
  params.set('page', page);
  history.pushState({}, '', `?${params.toString()}`);
  loadVideos();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Search ────────────────────────────────────────────────────────────────────
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
  if (q) window.location.href = `/?q=${encodeURIComponent(q)}`;
});

// ── Mobile sidebar ────────────────────────────────────────────────────────────
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileSidebar').classList.remove('-translate-x-full');
  document.getElementById('mobileOverlay').classList.remove('hidden');
});

// closeSidebar dipanggil dari onclick di HTML, perlu expose ke global
window.closeSidebar = () => {
  document.getElementById('mobileSidebar').classList.add('-translate-x-full');
  document.getElementById('mobileOverlay').classList.add('hidden');
};

// ── Browser navigation ────────────────────────────────────────────────────────
window.addEventListener('popstate', () => { initFromURL(); loadVideos(); });

// ── Expose ke global scope (dipanggil dari onclick HTML) ──────────────────────
window.loadVideos = loadVideos;

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  firePendingAd();           // ← iklan pending dari klik video/kategori sebelumnya
  initAdClickDelegation();   // ← pasang event delegation untuk semua [data-ad-click]
  await loadAndRenderCategories();
  initFromURL();
  loadVideos();
})();
