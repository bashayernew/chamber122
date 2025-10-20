// js/business-form.js v=3 (ESM)
import { supabase } from '../public/js/supabase-client.global.js';
import { upsertMyBusiness } from './businesses.api.js';

console.log('[business-form] Module loaded');

async function getOwnerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw new Error('Not authenticated');
  return data.user.id;
}

async function saveBusiness(formData) {
  console.log('[business-form] saveBusiness called with:', formData);
  
  const owner_id = await getOwnerId();
  console.log('[business-form] Owner ID:', owner_id);

  // Use the API helper
  const { data, error } = await upsertMyBusiness(formData);
  
  if (error) {
    console.error('[business-form] Save failed:', error);
    throw error;
  }

  console.log('[business-form] Save successful:', data);
  return data;
}

// Bind to form
document.addEventListener('DOMContentLoaded', () => {
  console.log('[business-form] DOM ready, looking for form...');
  
  const form = document.getElementById('business-form') || 
               document.getElementById('biz-form') ||
               document.querySelector('form[data-biz-form]');
  
  if (!form) {
    console.log('[business-form] No business form found on this page');
    return;
  }
  
  console.log('[business-form] Form found:', form.id);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[business-form] Form submit triggered');
    
    const submitBtn = form.querySelector('[type=submit]') || form.querySelector('button[type="submit"]');
    const statusEl = document.getElementById('save-status');

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
      }
      if (statusEl) statusEl.textContent = 'Saving…';

      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      
      console.log('[business-form] Form data collected:', payload);

      const saved = await saveBusiness(payload);

      if (statusEl) statusEl.textContent = 'Saved ✔';
      if (submitBtn) submitBtn.textContent = 'Save';
      
      alert('Business profile saved successfully!');
      
      // Reload to show updated data
      location.reload();

    } catch (err) {
      console.error('[business-form] Submit error:', err);
      if (statusEl) statusEl.textContent = err.message || 'Failed to save';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';
      }
      alert('Failed to save: ' + err.message);
    }
  });
  
  console.log('[business-form] Form handler attached');
});
