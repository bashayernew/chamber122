import { sb, requireAuth } from "./supabase.js";

let userBusinesses = [];

// Initialize owner dashboard
async function initOwner() {
  try {
    await requireAuth("/auth.html");
    await loadUserBusinesses();
    renderBusinesses();
  } catch (error) {
    console.error('Error initializing owner dashboard:', error);
  }
}

// Load user's accounts
async function loadUserBusinesses() {
  try {
    const user = await sb().auth.getUser();
    if (!user.data.user) return;
    
    const { data, error } = await sb().from('businesses')
      .select('*')
      .eq('owner_user_id', user.data.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    userBusinesses = data || [];
  } catch (error) {
    console.error('Error loading user accounts:', error);
    userBusinesses = [];
  }
}

// Render user's accounts
function renderBusinesses() {
  const businessList = document.getElementById('business-list');
  const noBusinesses = document.getElementById('no-accounts');
  
  if (!businessList || !noBusinesses) return;
  
  if (userBusinesses.length === 0) {
    businessList.style.display = 'none';
    noBusinesses.style.display = 'block';
    return;
  }
  
  businessList.style.display = 'block';
  noBusinesses.style.display = 'none';
  
  businessList.innerHTML = '';
  
  userBusinesses.forEach(business => {
    const businessCard = createBusinessCard(business);
    businessList.appendChild(businessCard);
  });
}

// Create business card for editing
function createBusinessCard(business) {
  const card = document.createElement('div');
  card.className = 'form-section-group';
  
  const statusClass = business.is_active ? 'verified' : 
                     !business.is_active ? 'pending' : 'rejected';
  
  card.innerHTML = `
    <h3><i class="fas fa-building"></i> ${business.name}</h3>
    
    <div class="business-status">
      <span class="status-tag ${statusClass}">${business.status}</span>
      ${!business.is_active ? '<small>Under review</small>' : ''}
    </div>
    
    <form class="edit-business-form" data-business-id="${business.id}">
      <div class="form-row">
        <div class="form-group">
          <label for="name-${business.id}">Business Name</label>
          <input type="text" id="name-${business.id}" name="name" class="form-input" value="${business.name || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="category-${business.id}">Category</label>
          <select id="category-${business.id}" name="category" class="form-input" required>
            <option value="food" ${business.category === 'food' ? 'selected' : ''}>Food & Beverage</option>
            <option value="fashion" ${business.category === 'fashion' ? 'selected' : ''}>Fashion & Beauty</option>
            <option value="cleaning" ${business.category === 'cleaning' ? 'selected' : ''}>Cleaning Services</option>
            <option value="tech" ${business.category === 'tech' ? 'selected' : ''}>Technology</option>
            <option value="home" ${business.category === 'home' ? 'selected' : ''}>Home Services</option>
            <option value="health" ${business.category === 'health' ? 'selected' : ''}>Health & Wellness</option>
            <option value="education" ${business.category === 'education' ? 'selected' : ''}>Education</option>
            <option value="other" ${business.category === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="email-${business.id}">Email</label>
          <input type="email" id="email-${business.id}" name="email" class="form-input" value="${business.email || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="phone-${business.id}">Phone</label>
          <input type="tel" id="phone-${business.id}" name="phone" class="form-input" value="${business.phone || ''}" required>
        </div>
      </div>
      
      <div class="form-group">
        <label for="description-${business.id}">Description</label>
        <textarea id="description-${business.id}" name="description" class="form-input" rows="3" required>${business.description || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label for="story-${business.id}">Why We Started</label>
        <textarea id="description-${business.id}" name="story" class="form-input" rows="3" required>${business.why_started || ''}</textarea>
      </div>
      
      <div class="form-group">
        <label for="logo-${business.id}">Update Logo</label>
        <input type="file" id="logo-${business.id}" name="logo" class="form-input" accept="image/*">
        <p class="field-note">Leave empty to keep current logo</p>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-btn">
          <i class="fas fa-save"></i> Update Business
        </button>
        <button type="button" class="submit-btn secondary" onclick="deleteBusiness(${business.id})">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    </form>
  `;
  
  // Add form submit handler
  const form = card.querySelector('form');
  form.addEventListener('submit', (e) => handleBusinessUpdate(e, business.id));
  
  return card;
}

// Handle business update
async function handleBusinessUpdate(e, businessId) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
  submitBtn.disabled = true;
  
  try {
    const formData = new FormData(form);
    const updates = {
      name: formData.get('name')?.toString().trim(),
      category: formData.get('category')?.toString(),
      email: formData.get('email')?.toString().trim(),
      phone: formData.get('phone')?.toString().trim(),
      description: formData.get('description')?.toString().trim(),
      why_started: formData.get('story')?.toString().trim()
    };
    
    // Handle logo upload if provided
    const logoFile = formData.get('logo');
    if (logoFile && logoFile.size > 0) {
      const user = await sb().auth.getUser();
      const path = `${user.data.user.id}/${Date.now()}_${logoFile.name}`;
      
      const { error: uploadError } = await sb().storage
        .from('business-media')
        .upload(path, logoFile, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: publicUrl } = sb().storage
        .from('business-media')
        .getPublicUrl(path);
      
      updates.logo_url = publicUrl.publicUrl;
    }
    
    // Update business in database
    const { error } = await sb().from('businesses')
      .update(updates)
      .eq('id', businessId);
    
    if (error) throw error;
    
    // Update local data and re-render
    const businessIndex = userBusinesses.findIndex(b => b.id === businessId);
    if (businessIndex !== -1) {
      userBusinesses[businessIndex] = { ...userBusinesses[businessIndex], ...updates };
    }
    
    alert('Business updated successfully!');
    renderBusinesses();
    
  } catch (error) {
    console.error('Error updating business:', error);
    alert('Failed to update business: ' + error.message);
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// Delete business
async function deleteBusiness(businessId) {
  if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await sb().from('businesses')
      .delete()
      .eq('id', businessId);
    
    if (error) throw error;
    
    // Remove from local data and re-render
    userBusinesses = userBusinesses.filter(b => b.id !== businessId);
    alert('Business deleted successfully!');
    renderBusinesses();
    
  } catch (error) {
    console.error('Error deleting business:', error);
    alert('Failed to delete business: ' + error.message);
  }
}

// Global functions for onclick handlers
window.deleteBusiness = deleteBusiness;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initOwner);
