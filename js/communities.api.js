// js/communities.api.js - API client for Communities feature
// Uses localStorage for now (can be upgraded to Netlify Functions later)

import * as Storage from './communities-storage.js';

/**
 * Get all communities with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.category - Filter by category
 * @param {string} filters.search - Search term
 * @param {string} filters.user_id - Filter to user's communities
 * @param {boolean} filters.include_suspended - Include suspended communities
 * @returns {Promise<Object>} Response with communities array
 */
export async function getCommunities(filters = {}) {
  try {
    let communities = Storage.getAllCommunities();
    const members = Storage.getAllCommunityMembers();

    // Filter by status
    if (!filters.include_suspended) {
      communities = communities.filter(c => c.status === 'active');
    }

    // Filter by category
    if (filters.category) {
      communities = communities.filter(c => c.category === filters.category);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      communities = communities.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        (c.description || '').toLowerCase().includes(searchLower)
      );
    }

    // Filter by user membership
    if (filters.user_id) {
      const userMemberIds = members
        .filter(m => m.msme_id === filters.user_id && m.status === 'active')
        .map(m => m.community_id);
      communities = communities.filter(c => userMemberIds.includes(c.id));
    }

    // Add member count
    const enriched = communities.map(comm => ({
      ...comm,
      member_count: Storage.getMemberCount(comm.id)
    }));

    // Sort by created_at (newest first)
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return {
      ok: true,
      communities: enriched
    };
  } catch (error) {
    console.error('[communities-api] Error getting communities:', error);
    throw error;
  }
}

/**
 * Get a single community by ID
 * @param {string} communityId - Community ID
 * @returns {Promise<Object>} Community object
 */
export async function getCommunity(communityId) {
  try {
    const data = await getCommunities({});
    const community = data.communities.find(c => c.id === communityId);
    if (!community) {
      throw new Error('Community not found');
    }
    return community;
  } catch (error) {
    console.error('[communities-api] Error getting community:', error);
    throw error;
  }
}

/**
 * Create a new community
 * @param {Object} communityData - Community data
 * @param {string} communityData.name - Community name
 * @param {string} communityData.category - Category
 * @param {string} communityData.description - Description
 * @param {string} communityData.creator_msme_id - Creator MSME ID
 * @param {boolean} communityData.is_public - Is public (default true)
 * @returns {Promise<Object>} Created community
 */
export async function createCommunity(communityData) {
  try {
    if (!communityData.name || !communityData.name.trim()) {
      throw new Error('Community name is required');
    }
    if (!communityData.category) {
      throw new Error('Category is required');
    }
    if (!communityData.creator_msme_id) {
      throw new Error('You must be logged in to create a community');
    }

    const community = Storage.createCommunity(communityData);
    return {
      ok: true,
      community: community
    };
  } catch (error) {
    console.error('[communities-api] Error creating community:', error);
    throw error;
  }
}

/**
 * Update community status (admin only)
 * @param {string} communityId - Community ID
 * @param {string} status - New status ('active' or 'suspended')
 * @param {string} adminUserId - Admin user ID
 * @returns {Promise<Object>} Updated community
 */
export async function updateCommunityStatus(communityId, status, adminUserId) {
  try {
    if (!status || !['active', 'suspended'].includes(status)) {
      throw new Error('Status must be "active" or "suspended"');
    }

    const community = Storage.updateCommunityStatus(communityId, status, adminUserId);
    return {
      ok: true,
      community: community
    };
  } catch (error) {
    console.error('[communities-api] Error updating community status:', error);
    throw error;
  }
}

/**
 * Join a community
 * @param {string} communityId - Community ID
 * @param {string} msmeId - MSME ID
 * @returns {Promise<Object>} Success response
 */
export async function joinCommunity(communityId, msmeId) {
  try {
    Storage.joinCommunity(communityId, msmeId);
    return {
      ok: true,
      message: 'Successfully joined community'
    };
  } catch (error) {
    console.error('[communities-api] Error joining community:', error);
    throw error;
  }
}

/**
 * Leave a community
 * @param {string} communityId - Community ID
 * @param {string} msmeId - MSME ID
 * @returns {Promise<Object>} Success response
 */
export async function leaveCommunity(communityId, msmeId) {
  try {
    Storage.leaveCommunity(communityId, msmeId);
    return {
      ok: true,
      message: 'Successfully left community'
    };
  } catch (error) {
    console.error('[communities-api] Error leaving community:', error);
    throw error;
  }
}

/**
 * Get messages for a community
 * @param {string} communityId - Community ID
 * @param {number} limit - Maximum number of messages (default 50)
 * @returns {Promise<Object>} Response with messages array
 */
export async function getCommunityMessages(communityId, limit = 50) {
  try {
    const messages = Storage.getCommunityMessages(communityId, limit);
    return {
      ok: true,
      messages: messages
    };
  } catch (error) {
    console.error('[communities-api] Error getting messages:', error);
    throw error;
  }
}

/**
 * Send a message to a community
 * @param {string} communityId - Community ID
 * @param {string} msmeId - MSME ID
 * @param {string} messageBody - Message text
 * @param {string} msmeName - MSME name
 * @param {string} msmeEmail - MSME email
 * @returns {Promise<Object>} Created message
 */
export async function sendCommunityMessage(communityId, msmeId, messageBody, msmeName, msmeEmail) {
  try {
    if (!messageBody || !messageBody.trim()) {
      throw new Error('Message body is required');
    }

    const message = Storage.sendCommunityMessage(communityId, msmeId, messageBody, msmeName, msmeEmail);
    return {
      ok: true,
      message: message
    };
  } catch (error) {
    console.error('[communities-api] Error sending message:', error);
    throw error;
  }
}

/**
 * Check if user is a member of a community
 * @param {string} communityId - Community ID
 * @param {string} msmeId - MSME ID
 * @returns {Promise<boolean>} True if member
 */
export async function isCommunityMember(communityId, msmeId) {
  try {
    return Storage.isCommunityMember(communityId, msmeId);
  } catch (error) {
    console.error('[communities-api] Error checking membership:', error);
    return false;
  }
}

