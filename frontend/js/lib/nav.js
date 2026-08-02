import { fetchCategories } from './api.js';
import { icon }           from './icons.js';

// Shared category map (slug → data) diisi oleh loadAndRenderCategories
export const catMap = {};

// ── Load kategori dari API dan render nav ─────────────────────────────────────
export async function loadAndRenderCategories() {
  try {
    const cats     = await fetchCategories();
    const featured = cats.filter(c => c.featured);

    // Isi catMap
    cats.forEach(c => { catMap[c.slug] = c; });

    // Desktop nav — kategori featured
    const desktopNav = document.getElementById('desktopNav');
    if (desktopNav) {
      featured.forEach(c => desktopNav.appendChild(makeFeaturedLink(c)));
    }

    // Mobile sidebar — semua kategori
    const sidebarNav = document.getElementById('sidebarNav');
    if (sidebarNav) {
      cats.forEach(c => sidebarNav.appendChild(makeSidebarLink(c)));
    }
  } catch (e) {
    console.warn('[nav] failed to load categories:', e.message);
  }
}

// ── Highlight active links ────────────────────────────────────────────────────
export function updateActiveStates(currentCat) {
  document.querySelectorAll('.cat-link').forEach(a => {
    const on = a.dataset.cat === currentCat;
    a.classList.toggle('bg-pink-800/60',     on);
    a.classList.toggle('text-white',         on);
    a.classList.toggle('border-pink-500/50', on);
    a.classList.toggle('bg-pink-900/40',    !on);
    a.classList.toggle('text-pink-200/70',  !on);
    a.classList.toggle('border-pink-700/30',!on);
  });

  document.querySelectorAll('.sidebar-cat-link').forEach(a => {
    const on = a.dataset.cat === currentCat;
    a.classList.toggle('text-white',         on);
    a.classList.toggle('bg-pink-800/40',     on);
    a.classList.toggle('text-pink-200/60',  !on);
  });

  const homeLink = document.getElementById('mobileHomeLink');
  if (homeLink) {
    const homeActive = !currentCat;
    homeLink.classList.toggle('text-pink-200',   homeActive);
    homeLink.classList.toggle('text-pink-400/60',!homeActive);
  }
}

// ── Link builders ─────────────────────────────────────────────────────────────
function makeFeaturedLink(c) {
  const a = document.createElement('a');
  a.href  = `/?cat=${c.slug}`;
  a.dataset.cat = c.slug;
  a.className   = 'cat-link shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border border-pink-700/30 bg-pink-900/40 text-pink-200/70 hover:bg-pink-800/40 hover:text-pink-100';
  a.innerHTML   = `${icon(c.icon, 'w-3.5 h-3.5 shrink-0')}<span>${c.name}</span>`;
  return a;
}

function makeSidebarLink(c) {
  const a = document.createElement('a');
  a.href  = `/?cat=${c.slug}`;
  a.dataset.cat = c.slug;
  a.className   = 'sidebar-cat-link flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-pink-200/60 hover:bg-pink-800/40 hover:text-white transition-colors';
  a.innerHTML   = `<span class="w-4 h-4 shrink-0 opacity-70">${icon(c.icon, 'w-4 h-4')}</span><span>${c.name}</span>`;
  return a;
}
