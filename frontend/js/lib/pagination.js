// ── Pagination ────────────────────────────────────────────────────────────────
export function renderPagination(current, total, onNavigate) {
  const el      = document.getElementById('pagination');
  const info    = document.getElementById('pageInfo');
  const buttons = document.getElementById('pageButtons');

  if (total <= 1) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  info.textContent = `Halaman ${current} dari ${total}`;

  // Build page list with ellipsis
  const pages = [1];
  if (current > 3) pages.push('…');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push('…');
  if (total > 1) pages.push(total);

  const btn = (page, label, active = false) =>
    `<button class="page-btn w-9 h-9 flex items-center justify-center rounded-lg text-xs font-semibold border transition-colors
      ${active ? 'bg-pink-600 text-white border-pink-500' : 'bg-pink-900 hover:bg-pink-800 text-pink-400 border-pink-800'}"
      data-page="${page}">${label}</button>`;

  let html = '';
  if (current > 1)     html += btn(current - 1, '◀');
  pages.forEach(p => {
    if (p === '…') { html += `<span class="px-1 text-pink-600 text-xs">…</span>`; return; }
    html += btn(p, p, p === current);
  });
  if (current < total) html += btn(current + 1, '▶');

  buttons.innerHTML = html;
  buttons.querySelectorAll('.page-btn').forEach(b =>
    b.addEventListener('click', () => onNavigate(parseInt(b.dataset.page)))
  );
}
