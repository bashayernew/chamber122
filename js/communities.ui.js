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
      createBtn.addEventListener('click', () => {
        document.getElementById('create-modal').style.display = 'flex';
      });
    } else {
      createBtn.style.display = 'none';
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
    
    // Check membership
    let isMember = false;
    if (user) {
      isMember = await CommunitiesAPI.isCommunityMember(communityId, user.id);
    }

    // Load messages
    const messagesData = await CommunitiesAPI.getCommunityMessages(communityId);
    const messages = messagesData.messages || [];

    // Render community detail
    container.innerHTML = renderCommunityDetail(community, isMember, messages, user);

    // Setup join/leave button
    const joinLeaveBtn = document.getElementById('join-leave-btn');
    if (joinLeaveBtn) {
      joinLeaveBtn.addEventListener('click', () => handleJoinLeave(communityId, isMember));
    }

    // Setup message form
    const messageForm = document.getElementById('message-form');
    if (messageForm && isMember) {
      messageForm.addEventListener('submit', (e) => handleSendMessage(e, communityId));
    }

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
function renderCommunityDetail(community, isMember, messages, user) {
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
        ${messages.map(msg => renderMessage(msg, user)).join('')}
      </div>
      ${canMessage ? `
        <form id="message-form" style="display: flex; gap: 12px;">
          <input type="text" id="message-input" placeholder="Type your message..." required style="flex: 1; padding: 12px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 8px; color: #fff; font-size: 14px;">
          <button type="submit" style="padding: 12px 24px; background: #0095f6; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;"><i class="fas fa-paper-plane"></i> Send</button>
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
function renderMessage(message, currentUser) {
  const isOwn = currentUser && (message.msme_id === currentUser.id);
  const time = new Date(message.created_at).toLocaleString();
  
  return `
    <div style="margin-bottom: 16px; display: flex; ${isOwn ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
      <div style="max-width: 70%; background: ${isOwn ? '#0095f6' : '#2a2a2a'}; color: #fff; padding: 12px 16px; border-radius: 12px;">
        <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">${escapeHtml(message.msme_name || 'Unknown')}</div>
        <div>${escapeHtml(message.body)}</div>
        <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">${time}</div>
      </div>
    </div>
  `;
}

/**
 * Handle join/leave community
 */
async function handleJoinLeave(communityId, isMember) {
  const user = getCurrentUser();
  if (!user) {
    alert('Please login to join communities');
    window.location.href = '/auth.html#login';
    return;
  }

  try {
    const business = await getBusinessForUser(user.id);
    const msmeId = business ? business.id : user.id;

    if (isMember) {
      await CommunitiesAPI.leaveCommunity(communityId, msmeId);
      alert('You have left the community');
    } else {
      await CommunitiesAPI.joinCommunity(communityId, msmeId);
      alert('You have joined the community!');
    }

    // Reload page
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

  if (!messageBody) {
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const business = await getBusinessForUser(user.id);
    const msmeId = business ? business.id : user.id;
    const msmeName = business ? (business.name || business.business_name) : (user.name || user.email);
    const msmeEmail = user.email;

    await CommunitiesAPI.sendCommunityMessage(communityId, msmeId, messageBody, msmeName, msmeEmail);
    
    input.value = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
    
    // Reload messages
    await loadCommunityDetail(communityId);
  } catch (error) {
    console.error('[communities-ui] Error sending message:', error);
    alert('Error sending message: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make init available globally
window.CommunitiesUI = { init };

