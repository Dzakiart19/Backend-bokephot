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
  const defaultUrl = 'https://backend-bokephot--azjefjeg.replit.app/api';
  console.log('[CONFIG] Using backend URL:', defaultUrl);
  return defaultUrl;
}

// Konfigurasi
const CONFIG = {
    API_BASE_URL: getApiBaseUrl(),
    PLACEHOLDER_THUMBNAIL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0xNDAgNzBIMTgwVjExMEgxNDBWNzBaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNCA0Ii8+CjxjaXJjbGUgY3g9IjE2MCIgY3k9IjkwIiByPSIxNSIgZmlsbD0iIzZCNzM4MCIvPgo8L3N2Zz4K'
};

// DOM Elements
const elements = {
    videoTitle: document.getElementById('videoTitle'),
    videoPlayer: document.getElementById('videoPlayer'),
    videoViews: document.getElementById('videoViews'),
    videoUploadDate: document.getElementById('videoUploadDate'),
    videoDescription: document.getElementById('videoDescription'),
    relatedVideos: document.getElementById('relatedVideos')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadVideoDetail();
    loadRelatedVideos();
});

// API Functions
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
        const response = await fetch(`${CONFIG.API_BASE_URL}/embed/${fileId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching embed URL:', error);
        throw error;
    }
}

async function fetchVideos(page = 1, limit = 10) {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: limit.toString()
        });

        const response = await fetch(`${CONFIG.API_BASE_URL}/videos?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
}

// Video Loading Functions
async function loadVideoDetail() {
    // Get video ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    
    if (!videoId) {
        showVideoError('Video ID tidak ditemukan dalam URL');
        return;
    }

    try {
        // Load video details
        const videoData = await fetchVideoDetails(videoId);
        
        if (!videoData.success || !videoData.result) {
            throw new Error(videoData.error || 'Video tidak ditemukan');
        }

        const video = videoData.result;
        
        // Update video info
        elements.videoTitle.textContent = video.title || video.name || 'Untitled Video';
        elements.videoViews.textContent = formatViews(video.views || 0) + ' views';
        elements.videoUploadDate.textContent = formatDate(video.uploaded || video.created || Date.now());
        elements.videoDescription.textContent = video.description || 'Tidak ada deskripsi untuk video ini.';
        
        // Load video player (let Doodstream handle any errors)
        await loadVideoPlayer(videoId);
        
    } catch (error) {
        console.error('Error loading video detail:', error);
        showVideoError('Gagal memuat detail video: ' + error.message);
    }
}

async function loadVideoPlayer(fileId) {
    try {
        const embedData = await fetchEmbedUrl(fileId);
        
        if (embedData.success && embedData.embed_url) {
            // Create iframe for video player
            elements.videoPlayer.innerHTML = `
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
        } else {
            throw new Error('Failed to get embed URL');
        }
    } catch (error) {
        console.error('Error loading video player:', error);
        showVideoError('Gagal memuat video player: ' + error.message);
    }
}

async function loadRelatedVideos() {
    try {
        const data = await fetchVideos(1, 6);
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch related videos');
        }

        const videos = data.result?.files || [];
        
        if (videos.length === 0) {
            elements.relatedVideos.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <p>Tidak ada video terkait</p>
                </div>
            `;
            return;
        }

        // Filter out current video if it's in the list
        const urlParams = new URLSearchParams(window.location.search);
        const currentVideoId = urlParams.get('id');
        const filteredVideos = videos.filter(video => 
            (video.file_code || video.id) !== currentVideoId
        );

        elements.relatedVideos.innerHTML = '';
        filteredVideos.forEach(video => {
            const videoCard = createRelatedVideoCard(video);
            elements.relatedVideos.appendChild(videoCard);
        });
        
    } catch (error) {
        console.error('Error loading related videos:', error);
        elements.relatedVideos.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <p>Gagal memuat video terkait</p>
            </div>
        `;
    }
}

// UI Functions
function createRelatedVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'flex space-x-3 bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors';
    
    // Use primary thumbnail, with fallbacks
    const primaryThumb = video.single_img || video.thumbnail_url || video.screenshot;
    const fallbackThumb = video.splash_img || CONFIG.PLACEHOLDER_THUMBNAIL;
    const thumbnailUrl = (primaryThumb && primaryThumb.trim()) ? primaryThumb : (fallbackThumb && fallbackThumb.trim() ? fallbackThumb : CONFIG.PLACEHOLDER_THUMBNAIL);
    const duration = formatDuration(video.duration || video.length || 0);
    const views = formatViews(video.views || 0);
    
    card.innerHTML = `
        <div class="relative flex-shrink-0">
            <img 
                src="${thumbnailUrl}" 
                alt="${video.title || video.name || 'Video'}"
                class="w-32 h-20 object-cover rounded-md"
                onerror="this.src='${CONFIG.PLACEHOLDER_THUMBNAIL}'"
            >
            <div class="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                ${duration}
            </div>
        </div>
        <div class="flex-1 min-w-0">
            <h4 class="font-semibold text-white text-sm mb-1 line-clamp-2">
                ${video.title || video.name || 'Untitled Video'}
            </h4>
            <p class="text-xs text-gray-400">${views} views</p>
            <p class="text-xs text-gray-400">${formatDate(video.uploaded || video.created || Date.now())}</p>
        </div>
    `;
    
    // Add click event
    card.addEventListener('click', () => {
        const videoId = video.file_code || video.id;
        window.location.href = `detail.html?id=${videoId}`;
    });
    
    return card;
}

function showVideoError(message) {
    elements.videoPlayer.innerHTML = `
        <div class="text-center text-red-500 py-12">
            <svg class="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <h3 class="text-xl font-semibold mb-2">Error</h3>
            <p>${message}</p>
            <button onclick="window.location.href='index.html'" class="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Kembali ke Home
            </button>
        </div>
    `;
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

// Auto-refresh related videos every 15 seconds to catch new uploads from bot
let relatedVideoInterval = null;
document.addEventListener('DOMContentLoaded', () => {
    relatedVideoInterval = setInterval(loadRelatedVideos, 15000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (relatedVideoInterval) clearInterval(relatedVideoInterval);
});