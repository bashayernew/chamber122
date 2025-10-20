// Owner Gallery Module
// Handles image upload, display, and deletion for business owners
import { supabase } from './supabase-client.global.js';

console.log('[owner.gallery] Module loaded');

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function toast(message, duration = 3000) {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => toast.remove());

  const toastEl = document.createElement('div');
  toastEl.className = 'toast fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full bg-blue-600 text-white';
  
  toastEl.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toastEl);
  
  // Animate in
  setTimeout(() => {
    toastEl.classList.remove('translate-x-full');
  }, 100);
  
  // Auto remove
  setTimeout(() => {
    toastEl.classList.add('translate-x-full');
    setTimeout(() => toastEl.remove(), 300);
  }, duration);
}

/**
 * Create URL-safe slug from filename
 * @param {string} filename - Original filename
 * @returns {string} - URL-safe slug
 */
function slug(filename) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get owner's business ID
 * @returns {Promise<string|null>} - Business ID or null if not found
 */
async function getOwnerBusinessId() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return null;

    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (bizError && bizError.code !== 'PGRST116') throw bizError; // PGRST116 = no rows found
    return business ? business.id : null;
  } catch (error) {
    console.error('Error getting owner business ID:', error);
    throw new Error(error.message);
  }
}

/**
 * Get public URL from storage path
 * @param {string} path - Storage path
 * @returns {string} - Public URL
 */
function publicUrlFromPath(path) {
  const { data } = supabase.storage.from('gallery').getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a single file to gallery
 * @param {File} file - File to upload
 * @param {string} businessId - Business ID
 * @returns {Promise<Object>} - Upload result with path, url, and name
 */
async function uploadOne(file, businessId) {
  try {
    // Extract file extension
    const ext = file.name.split('.').pop().toLowerCase();
    const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    
    // Create filename with timestamp and slug
    const name = `${Date.now()}-${slug(originalName)}.${ext}`;
    const path = `${businessId}/${name}`;
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from('gallery')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: '3600'
      });
    
    if (error) throw error;
    
    // Return upload result
    return {
      path: data.path,
      url: publicUrlFromPath(data.path),
      name: data.path.split('/').pop()
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(error.message);
  }
}

/**
 * List all images in business gallery
 * @param {string} businessId - Business ID
 * @returns {Promise<Array>} - Array of image objects
 */
async function listGallery(businessId) {
  try {
    const { data, error } = await supabase.storage
      .from('gallery')
      .list(businessId, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) throw error;
    
    // Map to our format
    return (data || []).map(item => {
      const path = `${businessId}/${item.name}`;
      return {
        path,
        url: publicUrlFromPath(path),
        name: item.name
      };
    });
  } catch (error) {
    console.error('Error listing gallery:', error);
    throw new Error(error.message);
  }
}

/**
 * Delete an image from storage
 * @param {string} path - Storage path to delete
 * @returns {Promise<void>}
 */
async function deleteImage(path) {
  try {
    const { error } = await supabase.storage
      .from('gallery')
      .remove([path]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(error.message);
  }
}

/**
 * Render gallery grid
 * @param {Array} items - Array of image objects
 */
function renderGrid(items) {
  const galleryGrid = document.getElementById('gallery-grid');
  if (!galleryGrid) return;

  if (!items || items.length === 0) {
    galleryGrid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fas fa-images text-6xl text-zinc-600 mb-4"></i>
        <h3 class="text-xl font-semibold text-zinc-300 mb-2">No images yet</h3>
        <p class="text-zinc-500">Upload your first image to get started.</p>
      </div>
    `;
    return;
  }

  galleryGrid.innerHTML = items.map(item => `
    <div class="group relative bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors">
      <img 
        src="${item.url}" 
        alt="${item.name}"
        class="w-full h-48 object-cover"
        loading="lazy"
        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzM0MTU1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='"
      >
      <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
        <button 
          onclick="deleteGalleryImage('${item.path}')"
          class="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform translate-y-2 group-hover:translate-y-0"
        >
          <i class="fas fa-trash mr-1"></i>Delete
        </button>
      </div>
      <div class="p-3">
        <p class="text-sm text-zinc-400 truncate" title="${item.name}">${item.name}</p>
      </div>
    </div>
  `).join('');
}

/**
 * Delete image and update grid
 * @param {string} path - Storage path to delete
 */
async function deleteGalleryImage(path) {
  if (!confirm('Are you sure you want to delete this image?')) return;

  try {
    await deleteImage(path);
    
    // Remove from grid optimistically
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
      const cards = galleryGrid.querySelectorAll('.group');
      cards.forEach(card => {
        const button = card.querySelector('button');
        if (button && button.onclick.toString().includes(path)) {
          card.remove();
        }
      });
      
      // Re-render if empty
      const remainingCards = galleryGrid.querySelectorAll('.group');
      if (remainingCards.length === 0) {
        renderGrid([]);
      }
    }
    
    toast('Image deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting image:', error);
    toast(`Failed to delete image: ${error.message}`, 'error');
  }
}

/**
 * Initialize gallery functionality
 */
async function initGallery() {
  try {
    // Get business ID
    const businessId = await getOwnerBusinessId();
    if (!businessId) {
      toast('Please sign in to access gallery', 'error');
      return;
    }

    // Load existing images
    const images = await listGallery(businessId);
    renderGrid(images);

    // Setup file input handler
    const galleryInput = document.getElementById('gallery-input');
    if (galleryInput) {
      galleryInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Clear input
        e.target.value = '';

        // Upload files
        for (const file of files) {
          try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
              toast(`Skipping ${file.name}: Not an image file`, 'error');
              continue;
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
              toast(`Skipping ${file.name}: File too large (max 10MB)`, 'error');
              continue;
            }

            // Show upload progress
            toast(`Uploading ${file.name}...`, 'info');

            // Upload file
            const result = await uploadOne(file, businessId);
            
            // Add to grid optimistically
            const galleryGrid = document.getElementById('gallery-grid');
            if (galleryGrid) {
              const currentImages = Array.from(galleryGrid.querySelectorAll('.group')).map(card => {
                const img = card.querySelector('img');
                const nameEl = card.querySelector('p');
                return {
                  url: img.src,
                  name: nameEl ? nameEl.textContent : 'Unknown'
                };
              });
              
              // Add new image to beginning
              currentImages.unshift({
                url: result.url,
                name: result.name
              });
              
              renderGrid(currentImages);
            }
            
            toast(`${file.name} uploaded successfully`, 'success');
            
            // Trigger profile refresh if available
            if (window.refreshProfile && typeof window.refreshProfile === 'function') {
              window.refreshProfile();
            }
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            toast(`Failed to upload ${file.name}: ${error.message}`, 'error');
          }
        }
      });
    }

  } catch (error) {
    console.error('Error initializing gallery:', error);
    toast('Failed to initialize gallery', 'error');
  }
}

// Make functions globally available
window.deleteGalleryImage = deleteGalleryImage;
window.initGallery = initGallery;

// Auto-initialize
console.log('[owner.gallery] Setting up auto-init...');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[owner.gallery] DOM ready, initializing...');
    initGallery();
  });
} else {
  console.log('[owner.gallery] DOM already ready, initializing now...');
  initGallery();
}

