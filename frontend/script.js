// Auto-detect API base URL - smart detection for different environments
function getApiBaseUrl() {
  // Check if running on Replit development (localhost or replit preview)
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('replit.dev')) {
    console.log('[CONFIG] Detected Replit development environment → using /api');
    return '/api';
  }
  
  // Try to get saved URL from localStorage (if user updated it)
  const savedUrl = localStorage.getItem('BACKEND_API_URL');
  if (savedUrl) {
    console.log('[CONFIG] Using saved backend URL from localStorage:', savedUrl);
    return savedUrl;
  }
  
  // Fallback to default backend URL
  const defaultUrl = 'https://backend-bokephot--aejlejeg.replit.app/api';
  console.log('[CONFIG] Using backend URL:', defaultUrl);
  return defaultUrl;
}

const CONFIG = {
    API_BASE_URL: getApiBaseUrl(),
    VIDEOS_PER_PAGE: 20,
    PLACEHOLDER_THUMBNAIL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNDAgNzBIMTgwVjExMEgxNDBWNzBaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNCA0Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIxNSIgZmlsbD0iIzZCNzM4MCIvPgo8L3N2Zz4K'
};

let currentPage = 1;
let currentQuery = '';
let isLoading = false;
let lastVideoCount = 0;
let refreshInterval = null;

const elements = {
    searchInput: document.getElementById('searchInput'),
    searchButton: document.getElementById('searchButton'),
    mobileSearchToggle: document.getElementById('mobileSearchToggle'),
    mobileSearchBar: document.getElementById('mobileSearchBar'),
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    mobileSearchBtn: document.getElementById('mobileSearchBtn'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    openSidebar: document.getElementById('openSidebar'),
    closeSidebar: document.getElementById('closeSidebar'),
    videoGrid: document.getElementById('videoGrid'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    noResultsState: document.getElementById('noResultsState'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreButton: document.getElementById('loadMoreButton'),
    retryButton: document.getElementById('retryButton'),
    videoModal: document.getElementById('videoModal'),
    modalTitle: document.getElementById('modalTitle'),
    closeModal: document.getElementById('closeModal'),
    videoPlayerContainer: document.getElementById('videoPlayerContainer'),
    videoDuration: document.getElementById('videoDuration'),
    videoViews: document.getElementById('videoViews'),
    videoUploadDate: document.getElementById('videoUploadDate')
};

let currentVideoFileCode = '';

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadVideos();
    startAutoRefresh();
});

function startAutoRefresh() {
    // Check every 10 seconds for new videos from bot uploads
    refreshInterval = setInterval(async () => {
        try {
            const endpoint = currentQuery ? '/search' : '/videos';
            const params = new URLSearchParams({
                page: '1',
                per_page: CONFIG.VIDEOS_PER_PAGE.toString()
            });
            if (currentQuery) params.append('search_term', currentQuery);
            
            const url = `${CONFIG.API_BASE_URL}${endpoint}?${params}`;
            const response = await fetch(url);
            
            if (!response.ok) return;
            const data = await response.json();
            
            const isSuccess = data.success === true || data.status === 200 || data.msg === 'OK';
            if (!isSuccess) return;
            
            const result = data.result || {};
            const videos = Array.isArray(result) ? result : (result.files || []);
            const currentCount = videos.length;
            
            // If new videos added (from bot upload), refresh the list
            if (currentCount > lastVideoCount && !currentQuery) {
                console.log(`📹 New videos detected! Refreshing list... (${lastVideoCount} → ${currentCount})`);
                currentPage = 1;
                lastVideoCount = currentCount;
                loadVideos();
            }
        } catch (error) {
            console.log('Auto-refresh check skipped');
        }
    }, 10000); // Check every 10 seconds
}

function initializeEventListeners() {
    if (elements.openSidebar) elements.openSidebar.addEventListener('click', toggleSidebar);
    if (elements.closeSidebar) elements.closeSidebar.addEventListener('click', toggleSidebar);
    if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener('click', toggleSidebar);

    if (elements.mobileSearchToggle) {
        elements.mobileSearchToggle.addEventListener('click', () => {
            elements.mobileSearchBar.classList.toggle('hidden');
        });
    }

    if (elements.searchButton) elements.searchButton.addEventListener('click', () => handleSearch());
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }
    if (elements.mobileSearchBtn) {
        elements.mobileSearchBtn.addEventListener('click', () => {
            handleSearch(elements.mobileSearchInput.value);
        });
    }

    if (elements.loadMoreButton) elements.loadMoreButton.addEventListener('click', loadMoreVideos);
    if (elements.retryButton) elements.retryButton.addEventListener('click', retryLoad);
    if (elements.closeModal) elements.closeModal.addEventListener('click', closeVideoModal);

    if (elements.videoModal) {
        elements.videoModal.addEventListener('click', (e) => {
            if (e.target === elements.videoModal) closeVideoModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.videoModal && !elements.videoModal.classList.contains('hidden')) {
            closeVideoModal();
        }
    });
}

function toggleSidebar() {
    if (elements.sidebar) elements.sidebar.classList.toggle('-translate-x-full');
    if (elements.sidebarOverlay) elements.sidebarOverlay.classList.toggle('hidden');
    document.body.classList.toggle('overflow-hidden');
}

async function fetchVideos(page = 1, searchTerm = '') {
    try {
        const endpoint = searchTerm ? '/search' : '/videos';
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: CONFIG.VIDEOS_PER_PAGE.toString()
        });
        if (searchTerm) params.append('search_term', searchTerm);

        const url = `${CONFIG.API_BASE_URL}${endpoint}?${params}`;
        console.log('[API] Fetching from:', url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        // Check if API returned an error
        if (data && typeof data === 'object') {
            if (data.error || (data.success === false)) {
                throw new Error(data.error || data.msg || 'API returned an error');
            }
        }
        return data;
    } catch (error) {
        console.error('[API-ERROR] URL:', `${CONFIG.API_BASE_URL}`, 'Error:', error.message);
        throw error;
    }
}

async function fetchEmbedUrl(fileId, posterUrl = '') {
    try {
        let url = `${CONFIG.API_BASE_URL}/embed/${fileId}`;
        if (posterUrl) {
            url += `?poster=${encodeURIComponent(posterUrl)}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Embed URL error:', error.message);
        throw error;
    }
}

async function loadVideos(isLoadMore = false) {
    if (isLoading) return;
    isLoading = true;
    if (!isLoadMore) showLoading();

    try {
        console.log('[LOAD] Starting load with API_BASE_URL:', CONFIG.API_BASE_URL);
        const data = await fetchVideos(currentPage, currentQuery);
        console.log('[API-SUCCESS] Response:', data);
        
        // Doodstream API can return different success flags
        const isSuccess = data.success === true || data.status === 200 || data.msg === 'OK';
        
        if (!isSuccess) {
            console.error('API Response was not successful:', data);
            throw new Error(data.error || data.msg || 'API Error');
        }

        const result = data.result || {};
        const videos = Array.isArray(result) ? result : (result.files || []);
        
        if (!Array.isArray(videos) || videos.length === 0) {
            if (isLoadMore) elements.loadMoreContainer.classList.add('hidden');
            else showNoResults();
            hideLoading();
            return;
        }

        // Update last video count for auto-refresh
        if (!isLoadMore && currentPage === 1) {
            lastVideoCount = videos.length;
        }

        if (!isLoadMore) elements.videoGrid.innerHTML = '';
        videos.forEach(video => {
            elements.videoGrid.appendChild(createVideoCard(video));
        });

        if (videos.length >= CONFIG.VIDEOS_PER_PAGE) {
            elements.loadMoreContainer.classList.remove('hidden');
        } else {
            elements.loadMoreContainer.classList.add('hidden');
        }
        hideLoading();
    } catch (error) {
        console.error('LoadVideos error:', error.message);
        showError('Gagal memuat video. Silakan periksa koneksi atau coba lagi nanti.');
    } finally {
        isLoading = false;
    }
}

function loadMoreVideos() {
    currentPage++;
    loadVideos(true);
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card bg-gray-900 rounded overflow-hidden shadow-sm cursor-pointer group flex flex-col hover:ring-2 hover:ring-red-600 transition-all';
    const duration = formatDuration(video.duration || video.length || 0);
    const views = formatViews(video.views || 0);
    
    const getSecureThumb = (url, isFallback = false) => {
        if (!url) return CONFIG.PLACEHOLDER_THUMBNAIL;
        
        let cleanUrl = url.trim();
        // Handle URLs that already contain our proxy to avoid double proxying
        if (cleanUrl.includes('/proxy-thumb?url=')) {
            return cleanUrl;
        }

        if (cleanUrl.startsWith('//')) {
            cleanUrl = 'https:' + cleanUrl;
        } else if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        
        // Proxy ALL external images through our backend to ensure they bypass referer/CORS blocks
        let proxyUrl = `${CONFIG.API_BASE_URL}/proxy-thumb?url=${encodeURIComponent(cleanUrl)}`;
        if (isFallback) proxyUrl += '&fallback=1';
        return proxyUrl;
    };

    const primaryThumb = getSecureThumb(video.single_img);
    const fallbackThumb = getSecureThumb(video.splash_img, true);
    
    card.innerHTML = `
        <div class="video-thumbnail relative bg-gray-800">
            <img id="thumb-${video.file_code}" src="${primaryThumb}" class="w-full h-full object-cover" alt="">
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-[9px] px-1.5 py-0.5 rounded">${duration}</div>
            <div class="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center space-x-1">
                <span>${views}</span>
            </div>
        </div>
        <div class="p-1.5 flex-1 flex flex-col justify-between min-h-0">
            <h3 class="text-gray-200 text-[11px] font-medium line-clamp-2 overflow-hidden">${video.title || 'Untitled'}</h3>
        </div>
    `;
    
    // Add fallback logic for images that fail to load
    const imgElement = card.querySelector(`#thumb-${video.file_code}`);
    if (imgElement) {
        imgElement.addEventListener('error', function() {
            if (!this.hasAttribute('data-fallback-tried')) {
                // Try fallback thumbnail
                this.setAttribute('data-fallback-tried', '1');
                this.src = fallbackThumb;
            } else {
                // If both fail, use placeholder
                this.src = CONFIG.PLACEHOLDER_THUMBNAIL;
            }
        });
    }
    
    card.setAttribute('data-file-code', video.file_code || video.id || '');
    card.addEventListener('click', () => openVideoModal(video));
    return card;
}

async function openVideoModal(video) {
    if (!elements.videoModal) return;
    elements.videoModal.classList.remove('hidden');
    elements.modalTitle.textContent = video.title || 'Untitled';
    currentVideoFileCode = video.file_code || video.id || '';
    try {
        elements.videoPlayerContainer.innerHTML = '<div class="text-center py-20 text-gray-400">Loading...</div>';
        
        // Use the same thumb logic to get the best possible poster URL
        const thumbUrl = video.single_img || video.splash_img || '';
        const embedData = await fetchEmbedUrl(video.file_code || video.id, thumbUrl);
        
        if (embedData.success && embedData.embed_url) {
            elements.videoPlayerContainer.innerHTML = `<iframe src="${embedData.embed_url}" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-lg" style="aspect-ratio: 16/9;"></iframe>`;
            if (elements.videoDuration) elements.videoDuration.textContent = formatDuration(video.duration || video.length || 0);
            if (elements.videoViews) elements.videoViews.textContent = formatViews(video.views || 0);
            if (elements.videoUploadDate) elements.videoUploadDate.textContent = video.uploaded || 'Unknown';
        } else {
            elements.videoPlayerContainer.innerHTML = '<div class="text-center py-20 text-red-500">❌ Video tidak tersedia</div>';
        }
    } catch (e) {
        console.error('Error loading video:', e);
        elements.videoPlayerContainer.innerHTML = '<div class="text-center py-20 text-red-500">Gagal memuat video. Coba lagi.</div>';
    }
}

function closeVideoModal() {
    if (elements.videoModal) elements.videoModal.classList.add('hidden');
    if (elements.videoPlayerContainer) elements.videoPlayerContainer.innerHTML = '';
    currentVideoFileCode = '';
}


function handleSearch(query = null) {
    const term = query !== null ? query : elements.searchInput.value.trim();
    if (term === currentQuery) return;
    currentQuery = term;
    currentPage = 1;
    loadVideos();
}

function formatDuration(s) {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return `${m}:${rs.toString().padStart(2, '0')}`;
}

function formatViews(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toString();
}

function showLoading() {
    if (elements.loadingState) elements.loadingState.classList.remove('hidden');
    if (elements.errorState) elements.errorState.classList.add('hidden');
    if (elements.noResultsState) elements.noResultsState.classList.add('hidden');
    if (elements.videoGrid) elements.videoGrid.innerHTML = '';
}

function hideLoading() { if (elements.loadingState) elements.loadingState.classList.add('hidden'); }
function showError(m) {
    if (elements.errorState) elements.errorState.classList.remove('hidden');
    if (elements.errorMessage) elements.errorMessage.textContent = m;
}
function showNoResults() { if (elements.noResultsState) elements.noResultsState.classList.remove('hidden'); }
function retryLoad() { currentPage = 1; loadVideos(); }