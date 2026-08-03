import { escHtml, escAttr } from './utils.js';

// ── Video card (grid) ─────────────────────────────────────────────────────────
export function buildCard(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  const dur   = v.duration
    ? `<span class="absolute bottom-1.5 right-1.5 rounded px-1 py-0.5 text-[10px] font-bold bg-black/70 text-white leading-none">${escHtml(v.duration)}</span>`
    : '';
  return `
    <a href="/video/${v.slug}" class="group block hover-card" data-ad-click="1">
      <div class="relative aspect-video rounded-lg sm:rounded-xl overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb ? `<img src="${escAttr(thumb)}" alt="${title}" class="thumb-img h-full w-full object-cover" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="absolute inset-0 bg-gradient-to-t from-pink-950/70 via-transparent to-transparent"></div>
        ${dur}
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

// ── Related card — list (desktop sidebar) ─────────────────────────────────────
export function buildRelatedCardList(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  return `
    <a href="/video/${v.slug}" class="flex gap-2 sm:gap-3 group rounded-xl hover:bg-pink-900/40 p-2 -mx-2 transition-colors" data-ad-click="1">
      <div class="relative w-[120px] sm:w-[140px] shrink-0 aspect-video rounded-lg overflow-hidden bg-pink-900 border border-pink-800/50">
        ${thumb ? `<img src="${escAttr(thumb)}" alt="${title}" class="w-full h-full object-cover" loading="lazy" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="flex-1 min-w-0 py-0.5">
        <h4 class="text-[12px] font-semibold text-pink-100 group-hover:text-white line-clamp-2 leading-snug">${title}</h4>
      </div>
    </a>`;
}

// ── Related card — grid (mobile) ──────────────────────────────────────────────
export function buildRelatedCardGrid(v) {
  const thumb = v.thumbnail || '';
  const title = escHtml(v.title);
  return `
    <a href="/video/${v.slug}" class="group block" data-ad-click="1">
      <div class="relative aspect-video rounded-lg overflow-hidden border border-pink-800/50 group-hover:border-pink-600/60 transition-colors" style="background:#3b001a">
        ${thumb ? `<img src="${escAttr(thumb)}" alt="${title}" class="h-full w-full object-cover" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="w-8 h-8 rounded-full bg-pink-500/80 flex items-center justify-center">
            <svg class="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <div class="mt-1.5">
        <h4 class="text-[11px] font-semibold text-pink-100 line-clamp-2 leading-snug group-hover:text-white">${title}</h4>
      </div>
    </a>`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function showSkeleton(count = 20) {
  const grid = document.getElementById('videoGrid');
  const skel = document.getElementById('skeletonGrid');
  const tmpl = document.getElementById('skeletonTemplate');

  let html = '';
  for (let i = 0; i < count; i++) html += tmpl.outerHTML.replace('id="skeletonTemplate"', '');
  skel.innerHTML = tmpl.outerHTML + html;
  skel.classList.remove('hidden');
  grid.classList.add('hidden');
  document.getElementById('emptyState')?.classList.add('hidden');
  document.getElementById('errorState')?.classList.add('hidden');
  document.getElementById('pagination')?.classList.add('hidden');
}

export function hideSkeleton() {
  document.getElementById('skeletonGrid').classList.add('hidden');
  document.getElementById('videoGrid').classList.remove('hidden');
}
