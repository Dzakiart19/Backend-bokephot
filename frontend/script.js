const CONFIG = {
    // UPDATED: Using absolute URL for backend to ensure Firebase can talk to Replit
    API_BASE_URL: 'https://backend-bokephot--ioj1gjah.replit.app/api',
    VIDEOS_PER_PAGE: 20,
    PLACEHOLDER_THUMBNAIL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNDAgNzBIMTgwVjExMEgxNDBWNzBaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNCA0Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIxNSIgZmlsbD0iIzZCNzM4MCIvPgo8L3N2Zz4K'
};

let currentPage = 1;
let currentQuery = '';
let isLoading = false;

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

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadVideos();
});

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

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}?${params}`, {
            mode: 'cors',
            headers: { 
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

async function fetchEmbedUrl(fileId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/embed/${fileId}`, { mode: 'cors' });
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function loadVideos(isLoadMore = false) {
    if (isLoading) return;
    isLoading = true;
    if (!isLoadMore) showLoading();

    try {
        const data = await fetchVideos(currentPage, currentQuery);
        // Doodstream API can return different success flags
        const isSuccess = data.success === true || data.status === 200 || data.msg === 'OK';
        
        if (!isSuccess) {
            console.error('API Response was not successful:', data);
            throw new Error(data.error || 'API Error');
        }

        const result = data.result || {};
        const videos = Array.isArray(result) ? result : (result.files || []);
        
        if (videos.length === 0) {
            if (isLoadMore) elements.loadMoreContainer.classList.add('hidden');
            else showNoResults();
            return;
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
        console.error('LoadVideos error:', error);
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
    card.className = 'video-card bg-gray-900 overflow-hidden shadow-sm cursor-pointer group flex flex-col hover:ring-2 hover:ring-red-600 transition-all';
    const duration = formatDuration(video.duration || video.length || 0);
    const views = formatViews(video.views || 0);
    
    const getSecureThumb = (url) => {
        if (!url) return CONFIG.PLACEHOLDER_THUMBNAIL;
        let cleanUrl = url.replace('http://', 'https://');
        // Proxy through backend to avoid CORS and referrer issues
        if (cleanUrl.includes('postercdn.net') || cleanUrl.includes('doodcdn')) {
            return `${CONFIG.API_BASE_URL}/proxy-thumb?url=${encodeURIComponent(cleanUrl)}`;
        }
        return cleanUrl;
    };

    const thumbnailUrl = getSecureThumb(video.single_img || video.splash_img);
    card.innerHTML = `
        <div class="relative aspect-video bg-gray-800">
            <img src="${thumbnailUrl}" class="w-full h-full object-cover" onerror="this.src='${CONFIG.PLACEHOLDER_THUMBNAIL}';">
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-[10px] px-1 py-0.5 rounded">${duration}</div>
            <div class="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-[10px] px-1 py-0.5 rounded flex items-center space-x-1">
                <span>${views} views</span>
            </div>
        </div>
        <div class="p-2 flex-1">
            <h3 class="text-gray-200 text-xs font-medium line-clamp-2">${video.title || 'Untitled'}</h3>
        </div>
    `;
    card.addEventListener('click', () => openVideoModal(video));
    return card;
}

async function openVideoModal(video) {
    if (!elements.videoModal) return;
    elements.videoModal.classList.remove('hidden');
    elements.modalTitle.textContent = video.title || 'Untitled';
    try {
        elements.videoPlayerContainer.innerHTML = '<div class="text-center py-20 text-gray-400">Loading...</div>';
        const embedData = await fetchEmbedUrl(video.file_code || video.id);
        if (embedData.success && embedData.embed_url) {
            elements.videoPlayerContainer.innerHTML = `<iframe src="${embedData.embed_url}" width="100%" height="100%" frameborder="0" allowfullscreen class="rounded-lg" style="aspect-ratio: 16/9;"></iframe>`;
            if (elements.videoDuration) elements.videoDuration.textContent = formatDuration(video.duration || video.length || 0);
            if (elements.videoViews) elements.videoViews.textContent = formatViews(video.views || 0);
            if (elements.videoUploadDate) elements.videoUploadDate.textContent = video.uploaded || 'Unknown';
        }
    } catch (e) {
        elements.videoPlayerContainer.innerHTML = '<div class="text-center py-20 text-red-500">Gagal memuat video.</div>';
    }
}

function closeVideoModal() {
    if (elements.videoModal) elements.videoModal.classList.add('hidden');
    if (elements.videoPlayerContainer) elements.videoPlayerContainer.innerHTML = '';
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