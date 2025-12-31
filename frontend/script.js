// Konfigurasi
const CONFIG = {
    API_BASE_URL: 'https://backend-bokephot--ioj1gjah.replit.app/api',
    
    // Jumlah video per halaman
    VIDEOS_PER_PAGE: 20,
    
    // Placeholder untuk thumbnail jika tidak tersedia
    PLACEHOLDER_THUMBNAIL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNDAgNzBIMTgwVjExMEgxNDBWNzBaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNCA0Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIxNSIgZmlsbD0iIzZCNzM4MCIvPgo8L3N2Zz4K'
};

// State Management
let currentPage = 1;
let currentQuery = '';
let currentFilter = 'latest';
let isLoading = false;
let totalVideos = 0;

// DOM Elements
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

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadVideos();
});

// Event Listeners
function initializeEventListeners() {
    // Sidebar
    elements.openSidebar.addEventListener('click', toggleSidebar);
    elements.closeSidebar.addEventListener('click', toggleSidebar);
    elements.sidebarOverlay.addEventListener('click', toggleSidebar);

    // Mobile Search
    elements.mobileSearchToggle.addEventListener('click', () => {
        elements.mobileSearchBar.classList.toggle('hidden');
    });

    // Search functionality
    elements.searchButton.addEventListener('click', () => handleSearch());
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.mobileSearchBtn.addEventListener('click', () => {
        handleSearch(elements.mobileSearchInput.value);
    });

    // Load more
    elements.loadMoreButton.addEventListener('click', loadMoreVideos);

    // Retry button
    elements.retryButton.addEventListener('click', retryLoad);

    // Modal
    elements.closeModal.addEventListener('click', closeVideoModal);
    elements.videoModal.addEventListener('click', (e) => {
        if (e.target === elements.videoModal) {
            closeVideoModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.videoModal.classList.contains('hidden')) {
            closeVideoModal();
        }
    });
}

function toggleSidebar() {
    elements.sidebar.classList.toggle('-translate-x-full');
    elements.sidebarOverlay.classList.toggle('hidden');
    document.body.classList.toggle('overflow-hidden');
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card bg-gray-900 overflow-hidden shadow-sm cursor-pointer group flex flex-col';
    
    const duration = formatDuration(video.duration || video.length || 0);
    const views = formatViews(video.views || 0);
    
    const getSecureThumb = (url) => {
        if (!url) return CONFIG.PLACEHOLDER_THUMBNAIL;
        let cleanUrl = url.replace('http://', 'https://');
        if (cleanUrl.includes('postercdn.net') || cleanUrl.includes('doodcdn')) {
            return `${CONFIG.API_BASE_URL}/proxy-thumb?url=${encodeURIComponent(cleanUrl)}`;
        }
        return cleanUrl;
    };

    const thumbnailUrl = getSecureThumb(video.single_img || video.splash_img);
    
    card.innerHTML = `
        <div class="relative aspect-video bg-gray-800">
            <img 
                src="${thumbnailUrl}" 
                alt="${video.title}"
                class="w-full h-full object-cover"
                loading="lazy"
                onerror="this.src='${CONFIG.PLACEHOLDER_THUMBNAIL}'; this.onerror=null;"
            >
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-[10px] px-1 py-0.5 rounded">
                ${duration}
            </div>
            <div class="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-[10px] px-1 py-0.5 rounded flex items-center space-x-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>${views}</span>
            </div>
        </div>
        <div class="p-2 flex-1">
            <div class="flex items-center space-x-1 mb-1">
                <div class="flex items-center text-gray-400 text-[10px] space-x-1">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
                    <span>100%</span>
                </div>
            </div>
            <h3 class="text-gray-200 text-xs font-medium line-clamp-2 leading-tight group-hover:text-white transition-colors">
                ${video.title}
            </h3>
        </div>
    `;
    
    card.addEventListener('click', () => openVideoModal(video));
    return card;
}

// Modal Functions
async function openVideoModal(video) {
    elements.videoModal.classList.remove('hidden');
    elements.modalTitle.textContent = video.title || video.name || 'Untitled Video';
    
    try {
        // Show loading state in modal
        elements.videoPlayerContainer.innerHTML = `
            <div class="text-center text-gray-400">
                <div class="loading-spinner mx-auto mb-4"></div>
                <p>Memuat video...</p>
            </div>
        `;
        
        // Fetch video details
        const embedData = await fetchEmbedUrl(video.file_code || video.id);
        
        if (embedData.success && embedData.embed_url) {
            // Create iframe for video player
            elements.videoPlayerContainer.innerHTML = `
                <iframe 
                    src="${embedData.embed_url}" 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    allowfullscreen
                    class="rounded-lg"
                    style="aspect-ratio: 16/9;"
                ></iframe>
            `;
            
            // Update video info
            elements.videoDuration.textContent = formatDuration(video.duration || video.length || 0);
            elements.videoViews.textContent = formatViews(video.views || 0);
            elements.videoUploadDate.textContent = formatDate(video.uploaded || video.created || Date.now());
        } else {
            throw new Error('Failed to get embed URL');
        }
    } catch (error) {
        console.error('Error loading video in modal:', error);
        elements.videoPlayerContainer.innerHTML = `
            <div class="text-center text-red-500">
                <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <p>Gagal memuat video. Silakan coba lagi.</p>
            </div>
        `;
    }
}

function closeVideoModal() {
    elements.videoModal.classList.add('hidden');
    elements.videoPlayerContainer.innerHTML = `
        <div class="text-center text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
            </svg>
            <p>Memuat video player...</p>
        </div>
    `;
}

// Search Functions
function handleSearch(query = null) {
    const searchTerm = query !== null ? query : elements.searchInput.value.trim();
    
    if (searchTerm === currentQuery) return;
    
    currentQuery = searchTerm;
    currentPage = 1;
    
    // Reset search inputs
    elements.searchInput.value = searchTerm;
    elements.mobileSearchInput.value = searchTerm;
    
    // Hide mobile search bar after search
    elements.mobileSearchBar.classList.add('hidden');
    
    loadVideos();
}

// Filter Functions
function switchFilter(filter, resetSearch = true) {
    if (filter === currentFilter) return;
    
    currentFilter = filter;
    currentPage = 1;
    
    if (resetSearch) {
        elements.searchInput.value = '';
        elements.mobileSearchInput.value = '';
        currentQuery = '';
    }
    
    loadVideos();
}

// Utility Functions
function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    } catch (error) {
        return 'Unknown';
    }
}

// UI State Functions
function showLoading() {
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.noResultsState.classList.add('hidden');
    elements.videoGrid.innerHTML = '';
    elements.loadMoreContainer.classList.add('hidden');
}

function hideLoading() {
    elements.loadingState.classList.add('hidden');
}

function showError(message) {
    elements.errorState.classList.remove('hidden');
    elements.errorMessage.textContent = message;
    elements.noResultsState.classList.add('hidden');
    elements.videoGrid.innerHTML = '';
    elements.loadMoreContainer.classList.add('hidden');
}

function showNoResults() {
    elements.noResultsState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
    elements.videoGrid.innerHTML = '';
    elements.loadMoreContainer.classList.add('hidden');
}

function retryLoad() {
    currentPage = 1;
    loadVideos();
}

// IMPORTANT: Ganti URL API di atas dengan URL Replit Anda setelah deploy backend!
// const CONFIG = {
//     API_BASE_URL: 'https://your-replit-project.repl.co/api',
//     VIDEOS_PER_PAGE: 20,
//     PLACEHOLDER_THUMBNAIL: 'data:image/svg+xml;base64,...'
// };