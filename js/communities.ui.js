// js/communities.ui.js - UI logic for Communities feature

import { getCurrentUser } from './auth-localstorage.js';
import { getAllCategories } from './communities-categories.js';
import * as CommunitiesAPI from './communities.api.js';

let currentFilters = {
  search: '',
  category: '',
  user_id: null
};

/**
 * Initialize the communities page
 */
export function init() {
  console.log('[communities-ui] Initializing...');
  
  // Check if we're on communities list page
  if (document.getElementById('communities-grid')) {
    initListPage();
  }
  
  // Check if we're on community detail page
  if (document.getElementById('community-detail')) {
    initDetailPage();
  }
}

/**
 * Initialize the communities list page
 */
async function initListPage() {
  // Load categories into dropdown
  const categories = getAllCategories();
  const categorySelect = document.getElementById('category-filter');
  if (categorySelect) {
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }

  // Load categories into create modal
  const modalCategorySelect = document.getElementById('modal-category');
  if (modalCategorySelect) {
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      modalCategorySelect.appendChild(option);
    });
  }

  // Check auth and show/hide create button
  const user = getCurrentUser();
  const createBtn = document.getElementById('create-community-btn');
  if (createBtn) {
    if (user) {
      createBtn.style.display = 'block';
      createBtn.style.visibility = 'visible';
      createBtn.addEventListener('click', () => {
        document.getElementById('create-modal').style.display = 'flex';
      });
    } else {
      // If not logged in, show button but redirect to login on click
      createBtn.style.display = 'block';
      createBtn.style.visibility = 'visible';
      createBtn.addEventListener('click', () => {
        if (confirm('You need to be logged in to create a community. Go to login page?')) {
          window.location.href = '/auth.html#login';
        }
      });
    }
  }

  // Setup create form
  const createForm = document.getElementById('create-community-form');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateCommunity);
  }

  // Setup filters
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const myCommunitiesFilter = document.getElementById('my-communities-filter');

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value;
        loadCommunities();
      }, 300);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      loadCommunities();
    });
  }

  if (myCommunitiesFilter) {
    myCommunitiesFilter.addEventListener('change', (e) => {
      const user = getCurrentUser();
      if (e.target.value === 'my' && user) {
        currentFilters.user_id = user.id;
      } else {
        currentFilters.user_id = null;
      }
      loadCommunities();
    });
  }

  // Initial load
  await loadCommunities();
}

/**
 * Load and display communities
 */
async function loadCommunities() {
  const grid = document.getElementById('communities-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading communities...</p></div>';

  try {
    const data = await CommunitiesAPI.getCommunities(currentFilters);
    const communities = data.communities || [];

    if (communities.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-users"></i>
          <p>No communities found</p>
          <p style="font-size: 14px; margin-top: 8px;">Try adjusting your filters or create a new community!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = communities.map(comm => renderCommunityCard(comm)).join('');
    
    // Add click handlers
    grid.querySelectorAll('.community-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.community-view-btn')) {
          const communityId = card.dataset.communityId;
          window.location.href = `community.html?id=${communityId}`;
        }
      });
    });

  } catch (error) {
    console.error('[communities-ui] Error loading communities:', error);
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading communities</p>
        <p style="font-size: 14px; margin-top: 8px; color: #ef4444;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Render a community card
 */
function renderCommunityCard(community) {
  const description = (community.description || '').substring(0, 120);
  const memberCount = community.member_count || 0;
  
  return `
    <div class="community-card" data-community-id="${community.id}">
      <div class="community-card-header">
        <div>
          <h3 class="community-card-name">${escapeHtml(community.name)}</h3>
          <span class="community-card-category">${escapeHtml(community.category)}</span>
        </div>
      </div>
      <p class="community-card-description">${escapeHtml(description)}${description.length >= 120 ? '...' : ''}</p>
      <div class="community-card-footer">
        <div class="community-member-count">
          <i class="fas fa-users"></i>
          <span>${memberCount} ${memberCount === 1 ? 'member' : 'members'}</span>
        </div>
        <button class="community-view-btn" onclick="event.stopPropagation(); window.location.href='community.html?id=${community.id}'">
          View <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Handle create community form submission
 */
async function handleCreateCommunity(e) {
  e.preventDefault();
  
  const user = getCurrentUser();
  if (!user) {
    alert('Please login to create a community');
    return;
  }

  const name = document.getElementById('modal-name').value.trim();
  const category = document.getElementById('modal-category').value;
  const description = document.getElementById('modal-description').value.trim();
  const isPublic = document.getElementById('modal-is-public').checked;

  if (!name || !category) {
    alert('Please fill in all required fields');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  try {
    const business = await getBusinessForUser(user.id);
    const msmeId = business ? business.id : user.id;

    const result = await CommunitiesAPI.createCommunity({
      name,
      category,
      description,
      creator_msme_id: msmeId,
      is_public: isPublic
    });

    // Close modal and reload
    document.getElementById('create-modal').style.display = 'none';
    e.target.reset();
    await loadCommunities();
    
    // Redirect to new community
    window.location.href = `community.html?id=${result.community.id}`;
  } catch (error) {
    console.error('[communities-ui] Error creating community:', error);
    alert('Error creating community: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Get business for user (helper)
 */
async function getBusinessForUser(userId) {
  try {
    const { getAllBusinesses } = await import('./auth-localstorage.js');
    const businesses = getAllBusinesses();
    return businesses.find(b => b.owner_id === userId || b.user_id === userId);
  } catch (e) {
    return null;
  }
}

/**
 * Initialize the community detail page
 */
async function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('id');

  if (!communityId) {
    document.getElementById('community-detail').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Community not found</p>
      </div>
    `;
    return;
  }

  await loadCommunityDetail(communityId);
}

/**
 * Load and display community detail
 */
async function loadCommunityDetail(communityId) {
  const container = document.getElementById('community-detail');
  if (!container) return;

  container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading community...</p></div>';

  try {
    const community = await CommunitiesAPI.getCommunity(communityId);
    const user = getCurrentUser();
    
    // Check membership - check both user ID and business ID
    let isMember = false;
    if (user) {
      const business = await getBusinessForUser(user.id);
      const msmeId = business ? business.id : user.id;
      // Check membership with both possible IDs
      isMember = await CommunitiesAPI.isCommunityMember(communityId, msmeId) || 
                 await CommunitiesAPI.isCommunityMember(communityId, user.id);
    }

    // Load messages
    const messagesData = await CommunitiesAPI.getCommunityMessages(communityId);
    const messages = messagesData.messages || [];
    
    // Load user data for avatars
    const { getAllUsers, getAllBusinesses } = await import('./auth-localstorage.js');
    const allUsers = getAllUsers();
    const allBusinesses = getAllBusinesses();

    // Render community detail
    container.innerHTML = renderCommunityDetail(community, isMember, messages, user, allUsers, allBusinesses);

    // Setup join/leave button
    const joinLeaveBtn = document.getElementById('join-leave-btn');
    if (joinLeaveBtn) {
      joinLeaveBtn.addEventListener('click', () => handleJoinLeave(communityId, isMember));
    }

    // Setup message form
    const messageForm = document.getElementById('message-form');
    if (messageForm && isMember) {
      messageForm.addEventListener('submit', (e) => handleSendMessage(e, communityId));
      
      // Setup image upload
      const imageInput = document.getElementById('message-image-input');
      if (imageInput) {
        imageInput.addEventListener('change', (e) => handleImageSelect(e, communityId));
      }
    }
    
    // Make shareLocation available globally
    window.shareLocation = () => handleShareLocation(communityId);

    // Auto-scroll to bottom of messages
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

  } catch (error) {
    console.error('[communities-ui] Error loading community:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading community</p>
        <p style="font-size: 14px; margin-top: 8px; color: #ef4444;">${error.message}</p>
      </div>
    `;
  }
}

/**
 * Render community detail page
 */
function renderCommunityDetail(community, isMember, messages, user, allUsers = [], allBusinesses = []) {
  const canJoin = user && !isMember && community.status === 'active';
  const canMessage = user && isMember && community.status === 'active';
  const isSuspended = community.status === 'suspended';

  return `
    <div class="community-detail-header" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <div>
          <h1 style="color: #fff; font-size: 2rem; margin: 0 0 8px 0;">${escapeHtml(community.name)}</h1>
          <span style="display: inline-block; padding: 6px 12px; background: #2a2a2a; color: #a8a8a8; border-radius: 6px; font-size: 14px;">${escapeHtml(community.category)}</span>
        </div>
        ${canJoin ? `<button id="join-leave-btn" style="padding: 12px 24px; background: #0095f6; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"><i class="fas fa-plus"></i> Join Community</button>` : ''}
        ${isMember ? `<button id="join-leave-btn" style="padding: 12px 24px; background: #ef4444; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"><i class="fas fa-sign-out-alt"></i> Leave Community</button>` : ''}
      </div>
      ${community.description ? `<p style="color: #a8a8a8; font-size: 16px; line-height: 1.6; margin: 0;">${escapeHtml(community.description)}</p>` : ''}
      ${isSuspended ? `<div style="margin-top: 16px; padding: 12px; background: #ef4444; color: #fff; border-radius: 8px;"><i class="fas fa-ban"></i> This community has been suspended by the admins.</div>` : ''}
    </div>

    <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 24px;">
      <h2 style="color: #fff; font-size: 1.5rem; margin: 0 0 20px 0;">Messages</h2>
      <div id="messages-container" style="max-height: 500px; overflow-y: auto; margin-bottom: 20px; padding: 16px; background: #0f0f0f; border-radius: 8px;">
        ${messages.length === 0 ? '<p style="color: #6b7280; text-align: center; padding: 40px;">No messages yet. Be the first to start the conversation!</p>' : ''}
        ${messages.map(msg => renderMessage(msg, user, allUsers, allBusinesses)).join('')}
      </div>
      ${canMessage ? `
        <form id="message-form" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; gap: 12px; align-items: end;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              <input type="text" id="message-input" placeholder="Type your message..." style="flex: 1; padding: 12px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px;">
              <div id="message-preview" style="display: none; margin-top: 8px;"></div>
            </div>
            <div style="display: flex; gap: 8px;">
              <input type="file" id="message-image-input" accept="image/*" style="display: none;">
              <button type="button" id="attach-image-btn" onclick="document.getElementById('message-image-input').click()" style="padding: 12px; background: #2a2a2a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;" title="Attach Image"><i class="fas fa-image"></i></button>
              <button type="button" id="share-location-btn" onclick="shareLocation()" style="padding: 12px; background: #2a2a2a; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;" title="Share Location"><i class="fas fa-map-marker-alt"></i></button>
              <button type="submit" style="padding: 12px 24px; background: #0095f6; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"><i class="fas fa-paper-plane"></i> Send</button>
            </div>
          </div>
        </form>
      ` : ''}
      ${!user ? '<p style="color: #6b7280; text-align: center; padding: 20px;">Please <a href="/auth.html#login" style="color: #0095f6;">login</a> to join and send messages.</p>' : ''}
      ${user && !isMember && !isSuspended ? '<p style="color: #6b7280; text-align: center; padding: 20px;">Join this community to send messages.</p>' : ''}
    </div>
  `;
}

/**
 * Render a message
 */
function renderMessage(message, currentUser, allUsers = [], allBusinesses = []) {
  // Check if message is from current user (check both user ID and business ID)
  let isOwn = false;
  if (currentUser) {
    isOwn = message.msme_id === currentUser.id;
    // Also check if user has a business and message is from that business
    if (!isOwn) {
      const businessId = currentUser.business_id || (currentUser.business ? currentUser.business.id : null);
      if (businessId) {
        isOwn = message.msme_id === businessId;
      }
    }
  }
  
  // Get sender info for avatar
  let senderAvatar = null;
  let senderName = message.msme_name || 'Unknown';
  
  // Try to find sender in businesses first, then users
  const senderBusiness = allBusinesses.find(b => b.id === message.msme_id || b.owner_id === message.msme_id);
  if (senderBusiness && senderBusiness.logo_url) {
    senderAvatar = senderBusiness.logo_url;
    senderName = senderBusiness.name || senderBusiness.business_name || senderName;
  } else {
    const senderUser = allUsers.find(u => u.id === message.msme_id);
    if (senderUser) {
      if (senderUser.logo_url) {
        senderAvatar = senderUser.logo_url;
      }
      senderName = senderUser.name || senderUser.email || senderName;
    }
  }
  
  const time = new Date(message.created_at).toLocaleString();
  const isImage = message.image_url || (message.body && message.body.startsWith('data:image'));
  const isLocation = message.location;
  const imageUrl = message.image_url || (message.body && message.body.startsWith('data:image') ? message.body : null);
  const textBody = isImage && imageUrl === message.body ? '' : message.body;
  
  return `
    <div style="margin-bottom: 20px; display: flex; ${isOwn ? 'flex-direction: row-reverse;' : 'flex-direction: row;'} align-items: flex-start; gap: 12px;">
      ${!isOwn ? `
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #0095f6, #1877f2); display: flex; align-items: center; justify-content: center; border: 2px solid ${isOwn ? '#0095f6' : '#2a2a2a'};">
          ${senderAvatar ? 
            `<img src="${escapeHtml(senderAvatar)}" alt="${escapeHtml(senderName)}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<span style="color: #fff; font-weight: 600; font-size: 16px;">${escapeHtml(senderName.charAt(0).toUpperCase())}</span>`
          }
        </div>
      ` : ''}
      <div style="max-width: 70%; display: flex; flex-direction: column; ${isOwn ? 'align-items: flex-end;' : 'align-items: flex-start;'}">
        ${!isOwn ? `<div style="font-size: 12px; color: #a8a8a8; margin-bottom: 4px; font-weight: 500;">${escapeHtml(senderName)}</div>` : ''}
        <div style="background: ${isOwn ? 'linear-gradient(135deg, #0095f6, #1877f2)' : '#2a2a2a'}; color: #fff; padding: ${isImage || isLocation ? '8px' : '12px 16px'}; border-radius: ${isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}; max-width: 100%; word-wrap: break-word; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
          ${imageUrl ? 
            `<img src="${escapeHtml(imageUrl)}" style="max-width: 300px; max-height: 300px; border-radius: 8px; margin-bottom: ${textBody ? '8px' : '0'}; display: block; cursor: pointer;" onclick="window.open('${escapeHtml(imageUrl)}', '_blank')" />` :
            ''
          }
          ${isLocation ? 
            `<div style="margin-bottom: ${textBody ? '8px' : '0'};">
              <a href="https://www.google.com/maps?q=${escapeHtml(message.location.lat)},${escapeHtml(message.location.lng)}" target="_blank" style="color: #fff; text-decoration: none; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.1); border-radius: 6px;">
                <i class="fas fa-map-marker-alt"></i> <span>View Location on Map</span>
              </a>
            </div>` :
            ''
          }
          ${textBody ? `<div style="line-height: 1.5; white-space: pre-wrap;">${escapeHtml(textBody)}</div>` : ''}
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px; padding: 0 4px;">${time}</div>
      </div>
      ${isOwn ? `
        <div style="flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #0095f6, #1877f2); display: flex; align-items: center; justify-content: center; border: 2px solid #0095f6;">
          ${currentUser && (currentUser.logo_url || (currentUser.business && currentUser.business.logo_url)) ? 
            `<img src="${escapeHtml(currentUser.logo_url || (currentUser.business && currentUser.business.logo_url))}" alt="${escapeHtml(currentUser.name || currentUser.email)}" style="width: 100%; height: 100%; object-fit: cover;">` :
            `<span style="color: #fff; font-weight: 600; font-size: 16px;">${escapeHtml((currentUser && (currentUser.name || currentUser.email) ? (currentUser.name || currentUser.email).charAt(0).toUpperCase() : 'U'))}</span>`
          }
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Handle join/leave community
 */
async function handleJoinLeave(communityId, isMember) {
  const user = getCurrentUser();
  if (!user) {
    if (confirm('You need to be logged in to join communities. Go to login page?')) {
      window.location.href = '/auth.html#login';
    }
    return;
  }

  try {
    const business = await getBusinessForUser(user.id);
    const msmeId = business ? business.id : user.id;

    if (isMember) {
      // Try leaving with both IDs
      try {
        await CommunitiesAPI.leaveCommunity(communityId, msmeId);
      } catch (e) {
        // Try with user ID if different
        if (msmeId !== user.id) {
          await CommunitiesAPI.leaveCommunity(communityId, user.id);
        }
      }
      alert('You have left the community');
    } else {
      // Join with primary ID (business ID if available, otherwise user ID)
      await CommunitiesAPI.joinCommunity(communityId, msmeId);
      // Also join with user ID if different to ensure membership is recorded
      if (msmeId !== user.id) {
        try {
          await CommunitiesAPI.joinCommunity(communityId, user.id);
        } catch (e) {
          // Ignore if already member or error
        }
      }
      alert('You have joined the community!');
    }

    // Reload page to refresh membership status and messages
    window.location.reload();
  } catch (error) {
    console.error('[communities-ui] Error joining/leaving:', error);
    alert('Error: ' + error.message);
  }
}

/**
 * Handle send message
 */
async function handleSendMessage(e, communityId) {
  e.preventDefault();
  
  const user = getCurrentUser();
  if (!user) {
    alert('Please login to send messages');
    return;
  }

  const input = document.getElementById('message-input');
  const messageBody = input.value.trim();
  const imageInput = document.getElementById('message-image-input');
  const previewDiv = document.getElementById('message-preview');
  
  // Check if there's an image or location to send
  const hasImage = imageInput && imageInput.files && imageInput.files.length > 0;
  const hasLocation = window.pendingLocation;
  
  if (!messageBody && !hasImage && !hasLocation) {
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

  try {
    const business = await getBusinessForUser(user.id);
    const msmeId = business ? business.id : user.id;
    const msmeName = business ? (business.name || business.business_name) : (user.name || user.email);
    const msmeEmail = user.email;
    
    // Handle image upload
    let imageBase64 = null;
    if (hasImage) {
      const file = imageInput.files[0];
      imageBase64 = await fileToBase64(file);
    }
    
    // Send message with image or location
    await CommunitiesAPI.sendCommunityMessage(communityId, msmeId, messageBody, msmeName, msmeEmail, imageBase64, window.pendingLocation);
    
    input.value = '';
    if (imageInput) imageInput.value = '';
    if (previewDiv) {
      previewDiv.style.display = 'none';
      previewDiv.innerHTML = '';
    }
    window.pendingLocation = null;
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    
    // Reload messages immediately without full page reload
    setTimeout(async () => {
      const { getAllUsers, getAllBusinesses } = await import('./auth-localstorage.js');
      const allUsers = getAllUsers();
      const allBusinesses = getAllBusinesses();
      
      const messagesData = await CommunitiesAPI.getCommunityMessages(communityId);
      const messages = messagesData.messages || [];
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.innerHTML = messages.length === 0 
          ? '<p style="color: #6b7280; text-align: center; padding: 40px;">No messages yet. Be the first to start the conversation!</p>'
          : messages.map(msg => renderMessage(msg, user, allUsers, allBusinesses)).join('');
        // Auto-scroll to bottom
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
      }
    }, 100);
  } catch (error) {
    console.error('[communities-ui] Error sending message:', error);
    alert('Error sending message: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
  }
}

/**
 * Handle image selection
 */
async function handleImageSelect(e, communityId) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    e.target.value = '';
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    alert('Image size must be less than 5MB');
    e.target.value = '';
    return;
  }
  
  const previewDiv = document.getElementById('message-preview');
  if (previewDiv) {
    const reader = new FileReader();
    reader.onload = (event) => {
      previewDiv.innerHTML = `
        <div style="position: relative; display: inline-block;">
          <img src="${event.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid #2a2a2a;">
          <button onclick="document.getElementById('message-image-input').value=''; document.getElementById('message-preview').style.display='none'; document.getElementById('message-preview').innerHTML='';" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">×</button>
        </div>
      `;
      previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

/**
 * Handle location sharing
 */
async function handleShareLocation(communityId) {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }
  
  const shareBtn = document.getElementById('share-location-btn');
  if (shareBtn) {
    shareBtn.disabled = true;
    shareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      window.pendingLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      const previewDiv = document.getElementById('message-preview');
      if (previewDiv) {
        previewDiv.innerHTML = `
          <div style="padding: 12px; background: #2a2a2a; border-radius: 8px; display: flex; align-items: center; gap: 8px; color: #fff;">
            <i class="fas fa-map-marker-alt"></i>
            <span>Location ready to share</span>
            <button onclick="window.pendingLocation=null; document.getElementById('message-preview').style.display='none'; document.getElementById('message-preview').innerHTML='';" style="margin-left: auto; background: #ef4444; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">Remove</button>
          </div>
        `;
        previewDiv.style.display = 'block';
      }
      
      if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
      }
    },
    (error) => {
      alert('Error getting location: ' + error.message);
      if (shareBtn) {
        shareBtn.disabled = false;
        shareBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
      }
    }
  );
}

/**
 * Convert file to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make init available globally
window.CommunitiesUI = { init };

