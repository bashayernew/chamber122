// js/messaging.js - User-to-user messaging using localStorage only
import { getCurrentUser, generateId, isCurrentUserSuspended } from './auth-localstorage.js';

const STORAGE_KEY_MESSAGES = 'ch122_user_messages';
const STORAGE_KEY_GROUPS = 'ch122_user_groups';

// Get all messages from localStorage
export function getAllMessages() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save messages to localStorage
function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (e) {
    console.error('[messaging] Error saving messages:', e);
  }
}

// Send a message from current user to another user
export async function sendMessage(toUserId, subject, body) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('You must be logged in to send messages');
  }
  
  // Check if user is suspended
  if (isCurrentUserSuspended()) {
    throw new Error('Your account is suspended. You cannot send or receive messages.');
  }

  const messages = getAllMessages();
  
  // Get recipient user info for better display
  const { getAllUsers } = await import('./auth-localstorage.js');
  const allUsers = getAllUsers();
  const recipientUser = allUsers.find(u => u.id === toUserId);
  
  const message = {
    id: generateId(),
    fromUserId: user.id,
    fromUserEmail: user.email,
    fromUserName: user.name || user.email,
    toUserId: toUserId,
    toUserEmail: recipientUser ? recipientUser.email : null,
    toUserName: recipientUser ? (recipientUser.name || recipientUser.email) : 'Unknown User',
    subject: subject || 'Message',
    body: body || '',
    created_at: new Date().toISOString(),
    read_at: null,
    unread: true
  };

  messages.push(message);
  saveMessages(messages);
  
  console.log('[messaging] Message sent:', message.id, 'from', user.id, 'to', toUserId);
  
  // Dispatch event to update inbox badge
  window.dispatchEvent(new CustomEvent('inbox-updated'));
  
  return message;
}

// Get messages for current user (both sent and received)
export function getMessagesForUser(userId) {
  const messages = getAllMessages();
  return messages.filter(m => m.fromUserId === userId || m.toUserId === userId);
}

// Get conversations for current user
// Get conversations for a user (individual and group) - handles both types
export function getConversationsForUser(userId) {
  const messages = getAllMessages();
  const userMessages = messages.filter(m => 
    m.fromUserId === userId || 
    m.toUserId === userId || 
    (m.groupId && m.groupMembers && m.groupMembers.includes(userId))
  );
  
  // Get all groups the user is a member of (even if no messages yet)
  const groups = getGroupsForUser(userId);
  
  // Group by conversation (other user ID or group ID)
  const conversationMap = new Map();
  
  // First, add all groups the user is a member of
  groups.forEach(group => {
    const convKey = `group_${group.id}`;
    if (!conversationMap.has(convKey)) {
      conversationMap.set(convKey, {
        userId: null,
        groupId: group.id,
        userName: group.name || 'Group Chat',
        userEmail: null,
        isGroup: true,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
        lastMessageTime: null
      });
    }
  });
  
  // Then, process messages
  userMessages.forEach(msg => {
    let convKey;
    let convName;
    let convEmail;
    
    if (msg.groupId) {
      // Group conversation
      convKey = `group_${msg.groupId}`;
      convName = msg.groupName || 'Group Chat';
      convEmail = null;
    } else {
      // Individual conversation
      const otherUserId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
      convKey = otherUserId;
      convName = msg.fromUserId === userId ? msg.toUserName : msg.fromUserName;
      convEmail = msg.fromUserId === userId ? msg.toUserEmail : msg.fromUserEmail;
    }
    
    if (!conversationMap.has(convKey)) {
      conversationMap.set(convKey, {
        userId: msg.groupId ? null : (msg.fromUserId === userId ? msg.toUserId : msg.fromUserId),
        groupId: msg.groupId || null,
        userName: convName || convEmail || 'Unknown User',
        userEmail: convEmail,
        isGroup: !!msg.groupId,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
        lastMessageTime: null
      });
    }
    
    const conv = conversationMap.get(convKey);
    conv.messages.push(msg);
    
    if (!msg.read_at && (msg.toUserId === userId || (msg.groupId && msg.fromUserId !== userId))) {
      conv.unreadCount++;
    }
    
    if (!conv.lastMessage || new Date(msg.created_at) > new Date(conv.lastMessage.created_at)) {
      conv.lastMessage = msg;
      conv.lastMessageTime = msg.created_at;
    }
  });
  
  // Sort conversations by last message time
  return Array.from(conversationMap.values()).sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : new Date(0);
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : new Date(0);
    return timeB - timeA;
  });
}

// Mark message as read
export function markMessageAsRead(messageId) {
  const messages = getAllMessages();
  const messageIndex = messages.findIndex(m => m.id === messageId);
  
  if (messageIndex !== -1) {
    messages[messageIndex].read_at = new Date().toISOString();
    messages[messageIndex].unread = false;
    saveMessages(messages);
    return true;
  }
  
  return false;
}

// Get unread message count for user
export function getUnreadMessageCount(userId) {
  const messages = getAllMessages();
  return messages.filter(m => 
    (m.toUserId === userId || (m.groupId && m.groupMembers && m.groupMembers.includes(userId))) && 
    m.fromUserId !== userId &&
    (!m.read_at || m.unread === true)
  ).length;
}

// ========== GROUP MESSAGING FUNCTIONS ==========

// Get all groups from localStorage
export function getAllGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

// Save groups to localStorage
function saveGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('[messaging] Error saving groups:', e);
  }
}

// Create a new group
export async function createGroup(groupName, memberIds) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('You must be logged in to create a group');
  }
  
  // Check if user is suspended
  if (isCurrentUserSuspended()) {
    throw new Error('Your account is suspended. You cannot create groups.');
  }

  const groups = getAllGroups();
  
  // Ensure creator is in members
  if (!memberIds.includes(user.id)) {
    memberIds.push(user.id);
  }

  const group = {
    id: generateId(),
    name: groupName,
    creatorId: user.id,
    memberIds: memberIds,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  groups.push(group);
  saveGroups(groups);

  console.log('[messaging] Group created:', group.id, 'with', memberIds.length, 'members');
  
  return group;
}

// Get groups for current user
export function getGroupsForUser(userId) {
  const groups = getAllGroups();
  return groups.filter(g => g.memberIds && g.memberIds.includes(userId));
}

// Add member to group
export function addMemberToGroup(groupId, userId) {
  const groups = getAllGroups();
  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    throw new Error('Group not found');
  }

  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
    group.updated_at = new Date().toISOString();
    saveGroups(groups);
    console.log('[messaging] Added member to group:', userId);
  }

  return group;
}

// Remove member from group
export function removeMemberFromGroup(groupId, userId) {
  const groups = getAllGroups();
  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    throw new Error('Group not found');
  }

  group.memberIds = group.memberIds.filter(id => id !== userId);
  group.updated_at = new Date().toISOString();
  saveGroups(groups);
  
  console.log('[messaging] Removed member from group:', userId);
  return group;
}

// Send message to group
export async function sendGroupMessage(groupId, body) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('You must be logged in to send messages');
  }
  
  // Check if user is suspended
  if (isCurrentUserSuspended()) {
    throw new Error('Your account is suspended. You cannot send or receive messages.');
  }

  const groups = getAllGroups();
  const group = groups.find(g => g.id === groupId);
  
  if (!group) {
    throw new Error('Group not found');
  }

  if (!group.memberIds.includes(user.id)) {
    throw new Error('You are not a member of this group');
  }

  const messages = getAllMessages();
  
  // Get all group members info
  const { getAllUsers } = await import('./auth-localstorage.js');
  const allUsers = getAllUsers();
  
  const message = {
    id: generateId(),
    fromUserId: user.id,
    fromUserEmail: user.email,
    fromUserName: user.name || user.email,
    groupId: groupId,
    groupName: group.name,
    groupMembers: group.memberIds,
    subject: `Group: ${group.name}`,
    body: body || '',
    created_at: new Date().toISOString(),
    read_at: null,
    unread: true
  };

  messages.push(message);
  saveMessages(messages);
  
  console.log('[messaging] Group message sent:', message.id, 'to group', groupId);
  
  // Dispatch event to update inbox badge
  window.dispatchEvent(new CustomEvent('inbox-updated'));
  
  return message;
}

// Get messages for a group
export function getGroupMessages(groupId) {
  const messages = getAllMessages();
  return messages.filter(m => m.groupId === groupId).sort((a, b) => {
    return new Date(a.created_at) - new Date(b.created_at);
  });
}


