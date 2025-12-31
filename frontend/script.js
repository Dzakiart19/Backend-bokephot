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
    videoGrid: document.getElementById('videoGrid'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    noResultsState: document.getElementById('noResultsState'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreButton: document.getElementById('loadMoreButton'),
    retryButton: document.getElementById('retryButton'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    latestTab: document.getElementById('latestTab'),
    trendingTab: document.getElementById('trendingTab'),
    popularTab: document.getElementById('popularTab'),
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
    // Search functionality
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Filter tabs
    elements.latestTab.addEventListener('click', () => switchFilter('latest'));
    elements.trendingTab.addEventListener('click', () => switchFilter('trending'));
    elements.popularTab.addEventListener('click', () => switchFilter('popular'));

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

// API Functions
async function fetchVideos(page = 1, searchTerm = '') {
    try {
        const endpoint = searchTerm ? '/search' : '/videos';
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: CONFIG.VIDEOS_PER_PAGE.toString()
        });

        if (searchTerm) {
            params.append('search_term', searchTerm);
        }

        const url = `${CONFIG.API_BASE_URL}${endpoint}?${params}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response not OK:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response Data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
}

async function fetchVideoDetails(fileId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/file/${fileId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching video details:', error);
        throw error;
    }
}

async function fetchEmbedUrl(fileId) {
    try {
        const url = `${CONFIG.API_BASE_URL}/embed/${fileId}`;
        console.log('Fetching embed from URL:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Embed response not OK:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Embed API Response:', data);
        return data;
    } catch (error) {
        console.error('Error fetching embed URL:', error);
        throw error;
    }
}

// Video Loading Functions
async function loadVideos(isLoadMore = false) {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        const data = await fetchVideos(currentPage, currentQuery);
        console.log('Data received in loadVideos:', JSON.stringify(data));
        
        // Handle both possible structures (data.success or data.status === 200)
        const isSuccess = data.success === true || data.status === 200 || data.msg === 'OK';
        
        if (!isSuccess) {
            throw new Error(data.error || data.msg || 'Failed to fetch videos');
        }

        const result = data.result || {};
        const videos = Array.isArray(result) ? result : (result.files || []);
        console.log('Videos to display:', videos);
        
        if (videos.length === 0) {
            if (isLoadMore) {
                // Tidak ada video lagi untuk dimuat
                elements.loadMoreContainer.classList.add('hidden');
            } else {
                // Tidak ada hasil pencarian
                showNoResults();
            }
            return;
        }

        if (isLoadMore) {
            appendVideos(videos);
        } else {
            displayVideos(videos);
        }

        // Tampilkan tombol load more jika masih ada video
        if (videos.length >= CONFIG.VIDEOS_PER_PAGE) {
            elements.loadMoreContainer.classList.remove('hidden');
        }

        hideLoading();
    } catch (error) {
        console.error('Error loading videos:', error);
        showError('Gagal memuat video. Pastikan backend sudah running dan URL API sudah benar.');
        hideLoading();
    } finally {
        isLoading = false;
    }
}

async function loadMoreVideos() {
    currentPage++;
    await loadVideos(true);
}

// UI Functions
function displayVideos(videos) {
    elements.videoGrid.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        elements.videoGrid.appendChild(videoCard);
    });
}

function appendVideos(videos) {
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        elements.videoGrid.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card bg-gray-800 rounded-xl overflow-hidden shadow-lg cursor-pointer';
    
    // Format duration
    const duration = formatDuration(video.duration || video.length || 0);
    
    // Format views
    const views = formatViews(video.views || 0);
    
    // Thumbnail URL - Doodstream API uses single_img or splash_img
    const thumbnailUrl = video.single_img || video.splash_img || video.thumbnail_url || video.screenshot || CONFIG.PLACEHOLDER_THUMBNAIL;
    
    card.innerHTML = `
        <div class="relative">
            <img 
                src="${thumbnailUrl}" 
                alt="${video.title || video.name || 'Video'}"
                class="w-full h-48 object-cover"
                onerror="this.src='${CONFIG.PLACEHOLDER_THUMBNAIL}'"
            >
            <div class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                ${duration}
            </div>
            <div class="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-medium">
                HD
            </div>
        </div>
        <div class="p-4">
            <h3 class="font-semibold text-white mb-2 line-clamp-2 text-sm leading-tight">
                ${video.title || video.name || 'Untitled Video'}
            </h3>
            <div class="flex items-center justify-between text-xs text-gray-400">
                <span>${views} views</span>
                <span>${formatDate(video.uploaded || video.created || Date.now())}</span>
            </div>
        </div>
    `;
    
    // Add click event
    card.addEventListener('click', () => {
        openVideoModal(video);
    });
    
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
function handleSearch() {
    const query = elements.searchInput.value.trim();
    
    if (query === currentQuery) return;
    
    currentQuery = query;
    currentPage = 1;
    
    // Reset filter tabs
    switchFilter('latest', false);
    
    loadVideos();
}

// Filter Functions
function switchFilter(filter, resetSearch = true) {
    if (filter === currentFilter) return;
    
    currentFilter = filter;
    currentPage = 1;
    
    // Update tab appearance
    elements.filterTabs.forEach(tab => {
        tab.classList.remove('active', 'bg-red-600', 'text-white');
        tab.classList.add('text-gray-300');
    });
    
    const activeTab = document.getElementById(`${filter}Tab`);
    activeTab.classList.add('active', 'bg-red-600', 'text-white');
    activeTab.classList.remove('text-gray-300');
    
    if (resetSearch) {
        elements.searchInput.value = '';
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