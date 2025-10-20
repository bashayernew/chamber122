import { supabase } from '/public/js/supabase-client.global.js?v=3';

console.log('[bulletin] Bulletin.js loaded');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[bulletin] DOM ready, initializing bulletin page...');
  loadBulletinsFromSupabase();
  
  // Connect the Add Bulletin button
  const addBulletinBtn = document.getElementById('fabAddBulletin');
  if (addBulletinBtn) {
    console.log('[bulletin] Add Bulletin button found, adding event listener');
    addBulletinBtn.addEventListener('click', openBulletinForm);
  } else {
    console.warn('[bulletin] Add Bulletin button not found');
  }
});

async function loadBulletinsFromSupabase() {
  console.log('[bulletin] Loading bulletins from Supabase...');
  console.log('[bulletin] Supabase client:', supabase);
  console.log('[bulletin] Supabase.from method:', typeof supabase?.from);
  
  try {
    // Use activities_base table with type='bulletin'
    const { data, error } = await supabase
      .from('activities_base')
      .select('*')
      .eq('type', 'bulletin')
      .eq('status', 'published')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading bulletins from Supabase:', error);
      return;
    }
    
    console.log('[bulletin] Loaded bulletins:', data?.length || 0);
    
    // Find the bulletin container
    const container = document.getElementById('bulletinList') || 
                     document.getElementById('bulletin-grid') || 
                     document.querySelector('.bulletin-list-container');
    
    if (!container) {
      console.warn('[bulletin] No bulletin container found');
      return;
    }
    
    if (!data?.length) {
      container.innerHTML = '<div class="empty">No bulletins yet.</div>';
      return;
    }
    
    container.innerHTML = data.map(row => `
      <div class="bulletin-card" data-id="${row.id}">
        <div class="bulletin-header">
          <h3 class="bulletin-title">${row.title || 'Untitled Bulletin'}</h3>
          <div class="bulletin-meta">
            <span class="bulletin-date">${new Date(row.created_at).toLocaleDateString()}</span>
            <span class="bulletin-status published">Published</span>
          </div>
        </div>
        <div class="bulletin-content">
          <p>${row.description || row.content || 'No content available'}</p>
        </div>
        <div class="bulletin-actions">
          <button class="btn btn-sm btn-primary" onclick="viewBulletin('${row.id}')">View Details</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('[bulletin] Error loading bulletins:', error);
  }
}

// View bulletin details
window.viewBulletin = (bulletinId) => {
  console.log('[bulletin] View bulletin:', bulletinId);
  // For now, just show an alert. You can implement a detailed view later
  alert(`Viewing bulletin ${bulletinId}. This would open a detailed view.`);
};

// Open bulletin form (for creating new bulletins)
window.openBulletinForm = () => {
  console.log('[bulletin] Opening bulletin form...');
  // Redirect to a bulletin creation page or open a modal
  window.location.href = '/events.html?type=bulletin&autoopen=true';
};