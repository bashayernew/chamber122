// js/communities-storage.js - LocalStorage-based storage for Communities (works without backend)

const STORAGE_KEY_COMMUNITIES = 'chamber122_communities';
const STORAGE_KEY_COMMUNITY_MEMBERS = 'chamber122_community_members';
const STORAGE_KEY_COMMUNITY_MESSAGES = 'chamber122_community_messages';

import { generateId } from './auth-localstorage.js';

/**
 * Get all communities from localStorage
 */
export function getAllCommunities() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMUNITIES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[communities-storage] Error reading communities:', e);
    return [];
  }
}

/**
 * Save communities to localStorage
 */
export function saveCommunities(communities) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMUNITIES, JSON.stringify(communities));
  } catch (e) {
    console.error('[communities-storage] Error saving communities:', e);
  }
}

/**
 * Get all community members from localStorage
 */
export function getAllCommunityMembers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY_MEMBERS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[communities-storage] Error reading members:', e);
    return [];
  }
}

/**
 * Save community members to localStorage
 */
export function saveCommunityMembers(members) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMUNITY_MEMBERS, JSON.stringify(members));
  } catch (e) {
    console.error('[communities-storage] Error saving members:', e);
  }
}

/**
 * Get all community messages from localStorage
 */
export function getAllCommunityMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY_MESSAGES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('[communities-storage] Error reading messages:', e);
    return [];
  }
}

/**
 * Save community messages to localStorage
 */
export function saveCommunityMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY_COMMUNITY_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('[communities-storage] Error saving messages:', e);
  }
}

/**
 * Create a new community
 */
export function createCommunity(communityData) {
  const communities = getAllCommunities();
  const newCommunity = {
    id: generateId(),
    name: communityData.name.trim(),
    category: communityData.category,
    description: communityData.description || '',
    creator_msme_id: communityData.creator_msme_id,
    is_public: communityData.is_public !== false,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  communities.push(newCommunity);
  saveCommunities(communities);
  return newCommunity;
}

/**
 * Update community status
 */
export function updateCommunityStatus(communityId, status, adminUserId) {
  const communities = getAllCommunities();
  const index = communities.findIndex(c => c.id === communityId);
  if (index === -1) {
    throw new Error('Community not found');
  }
  communities[index].status = status;
  communities[index].updated_at = new Date().toISOString();
  if (adminUserId) {
    communities[index].suspended_by = adminUserId;
    communities[index].suspended_at = status === 'suspended' ? new Date().toISOString() : null;
  }
  saveCommunities(communities);
  return communities[index];
}

/**
 * Join a community
 */
export function joinCommunity(communityId, msmeId) {
  const communities = getAllCommunities();
  const community = communities.find(c => c.id === communityId);
  if (!community) {
    throw new Error('Community not found');
  }
  if (community.status !== 'active') {
    throw new Error('This community has been suspended');
  }

  const members = getAllCommunityMembers();
  const existing = members.find(
    m => m.community_id === communityId && m.msme_id === msmeId
  );

  if (existing) {
    if (existing.status === 'active') {
      throw new Error('You are already a member of this community');
    } else {
      existing.status = 'active';
      existing.joined_at = new Date().toISOString();
    }
  } else {
    const newMember = {
      id: generateId(),
      community_id: communityId,
      msme_id: msmeId,
      role: community.creator_msme_id === msmeId ? 'owner' : 'member',
      status: 'active',
      joined_at: new Date().toISOString()
    };
    members.push(newMember);
  }

  saveCommunityMembers(members);
  return true;
}

/**
 * Leave a community
 */
export function leaveCommunity(communityId, msmeId) {
  const members = getAllCommunityMembers();
  const index = members.findIndex(
    m => m.community_id === communityId && m.msme_id === msmeId
  );

  if (index === -1) {
    throw new Error('You are not a member of this community');
  }

  members[index].status = 'left';
  members[index].left_at = new Date().toISOString();
  saveCommunityMembers(members);
  return true;
}

/**
 * Send a message to a community
 */
export function sendCommunityMessage(communityId, msmeId, messageBody, msmeName, msmeEmail, imageBase64 = null, location = null) {
  const communities = getAllCommunities();
  const community = communities.find(c => c.id === communityId);
  if (!community) {
    throw new Error('Community not found');
  }
  if (community.status !== 'active') {
    throw new Error('This community has been suspended. You cannot send messages.');
  }

  const members = getAllCommunityMembers();
  const membership = members.find(
    m => m.community_id === communityId && m.msme_id === msmeId && m.status === 'active'
  );

  if (!membership) {
    throw new Error('You must be a member of this community to send messages');
  }

  const messages = getAllCommunityMessages();
  const newMessage = {
    id: generateId(),
    community_id: communityId,
    msme_id: msmeId,
    msme_name: msmeName || 'Unknown',
    msme_email: msmeEmail || '',
    body: messageBody ? messageBody.trim() : '',
    image_url: imageBase64 || null,
    location: location || null,
    created_at: new Date().toISOString()
  };
  
  // If image is provided and no body, use image URL as body for display
  if (imageBase64 && !newMessage.body) {
    newMessage.body = imageBase64;
  }

  messages.push(newMessage);
  saveCommunityMessages(messages);
  return newMessage;
}

/**
 * Get messages for a community
 */
export function getCommunityMessages(communityId, limit = 50) {
  const messages = getAllCommunityMessages();
  return messages
    .filter(m => m.community_id === communityId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-limit);
}

/**
 * Get member count for a community
 */
export function getMemberCount(communityId) {
  const members = getAllCommunityMembers();
  return members.filter(m => m.community_id === communityId && m.status === 'active').length;
}

/**
 * Check if user is a member
 */
export function isCommunityMember(communityId, msmeId) {
  const members = getAllCommunityMembers();
  return members.some(
    m => m.community_id === communityId && m.msme_id === msmeId && m.status === 'active'
  );
}

