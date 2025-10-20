// /public/js/bulletins.page.js
import { listBulletinsPublic } from './fetch.js';

// Get global supabase client
const supabase = window.supabase || window.supabaseClient;

// DOM elements
const loadingEl = document.getElementById('loading');
const containerEl = document.getElementById('bulletins-container');
const emptyStateEl = document.getElementById('empty-state');

// Utility functions
function showToast(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `mb-4 p-4 rounded-lg shadow-lg ${
    type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`;
  toast.textContent = message;
  
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return formatDate(dateString);
}

function createBulletinCard(bulletin) {
  const card = document.createElement('div');
  card.className = 'bg-zinc-800 rounded-lg p-6 border border-zinc-700 hover:border-zinc-600 transition-colors';
  
  const publishDate = formatDate(bulletin.publish_at);
  const relativeTime = formatRelativeTime(bulletin.publish_at);
  
  card.innerHTML = `
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-xl font-semibold text-white">${bulletin.title || 'Untitled Bulletin'}</h3>
        <span class="text-xs text-zinc-400 bg-zinc-700 px-2 py-1 rounded">bulletin</span>
      </div>
      <p class="text-sm text-zinc-400">Published ${relativeTime}</p>
    </div>
    
    <div class="prose prose-invert max-w-none">
      <p class="text-zinc-300 leading-relaxed">${bulletin.body || 'No content available.'}</p>
    </div>
    
    <div class="mt-4 pt-4 border-t border-zinc-700">
      <div class="flex items-center justify-between text-sm text-zinc-400">
        <div class="flex items-center">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>${publishDate}</span>
        </div>
        
        ${bulletin.expire_at ? `
          <div class="flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Expires: ${formatDate(bulletin.expire_at)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  return card;
}

async function loadBulletins() {
  try {
    loadingEl.style.display = 'block';
    containerEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
    
    const bulletins = await listBulletinsPublic(supabase);
    
    loadingEl.style.display = 'none';
    
    if (bulletins.length === 0) {
      emptyStateEl.style.display = 'block';
      return;
    }
    
    containerEl.innerHTML = '';
    bulletins.forEach(bulletin => {
      const card = createBulletinCard(bulletin);
      containerEl.appendChild(card);
    });
    
    containerEl.style.display = 'block';
    
  } catch (error) {
    console.error('Error loading bulletins:', error);
    loadingEl.style.display = 'none';
    showToast(`Failed to load bulletins: ${error.message}`);
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  if (!supabase) {
    showToast('Supabase client not found. Please refresh the page.');
    return;
  }
  
  loadBulletins();
});
