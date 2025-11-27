// js/messaging.js - User-to-user messaging using localStorage only
import { getCurrentUser, generateId } from './auth-localstorage.js';

const STORAGE_KEY_MESSAGES = 'ch122_user_messages';

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
export function getConversationsForUser(userId) {
  const messages = getAllMessages();
  const userMessages = messages.filter(m => m.fromUserId === userId || m.toUserId === userId);
  
  // Group by conversation (other user ID)
  const conversationMap = new Map();
  
  userMessages.forEach(msg => {
    const otherUserId = msg.fromUserId === userId ? msg.toUserId : msg.fromUserId;
    const otherUserName = msg.fromUserId === userId ? msg.toUserName : msg.fromUserName;
    const otherUserEmail = msg.fromUserId === userId ? msg.toUserEmail : msg.fromUserEmail;
    
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, {
        userId: otherUserId,
        userName: otherUserName || otherUserEmail || 'Unknown User',
        userEmail: otherUserEmail,
        messages: [],
        unreadCount: 0,
        lastMessage: null,
        lastMessageTime: null
      });
    }
    
    const conv = conversationMap.get(otherUserId);
    conv.messages.push(msg);
    
    if (!msg.read_at && msg.toUserId === userId) {
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
    m.toUserId === userId && 
    (!m.read_at || m.unread === true)
  ).length;
}

