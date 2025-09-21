// Notification System
// Handles in-app notifications for compliance and other updates

import { supabase } from './supabase-client.js';

class NotificationSystem {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.init();
  }

  async init() {
    // Wait for Supabase to be ready
    if (typeof supabase === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }

    await this.loadNotifications();
    this.createNotificationUI();
    this.setupEventListeners();
    this.startPolling();
  }

  async loadNotifications() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      // Temporarily disabled - notifications table doesn't exist
      const { data: notifications, error } = null;
      // await supabase
      //   .from('notifications')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('created_at', { ascending: false })
      //   .limit(50);

      // if (error) throw error;

      this.notifications = [];
      this.unreadCount = this.notifications.filter(n => !n.read_at).length;
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  createNotificationUI() {
    // Create notification bell icon
    const notificationBell = document.createElement('div');
    notificationBell.id = 'notification-bell';
    notificationBell.className = 'notification-bell';
    notificationBell.style.cssText = `
      position: relative;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: all 0.3s ease;
      color: #9ca3af;
    `;

    notificationBell.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      ${this.unreadCount > 0 ? `<span class="notification-badge">${this.unreadCount}</span>` : ''}
    `;

    // Create notification dropdown
    const notificationDropdown = document.createElement('div');
    notificationDropdown.id = 'notification-dropdown';
    notificationDropdown.className = 'notification-dropdown';
    notificationDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      background: rgba(31, 41, 55, 0.95);
      border: 1px solid rgba(75, 85, 99, 0.3);
      border-radius: 12px;
      min-width: 350px;
      max-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      backdrop-filter: blur(20px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: none;
      margin-top: 0.5rem;
    `;

    notificationDropdown.innerHTML = `
      <div class="notification-header" style="
        padding: 1rem;
        border-bottom: 1px solid rgba(75, 85, 99, 0.3);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="color: white; margin: 0; font-size: 1.1rem; font-weight: 600;">
          Notifications | الإشعارات
        </h3>
        <button id="mark-all-read" style="
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 0.3s ease;
        ">
          Mark All Read | تحديد الكل كمقروء
        </button>
      </div>
      <div class="notification-list" id="notification-list">
        ${this.renderNotifications()}
      </div>
      <div class="notification-footer" style="
        padding: 1rem;
        text-align: center;
        border-top: 1px solid rgba(75, 85, 99, 0.3);
      ">
        <a href="notifications.html" style="
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.9rem;
        ">
          View All | عرض الكل
        </a>
      </div>
    `;

    // Add CSS for notification badge
    const style = document.createElement('style');
    style.textContent = `
      .notification-badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(25%, -25%);
      }
      
      .notification-item {
        padding: 1rem;
        border-bottom: 1px solid rgba(75, 85, 99, 0.2);
        cursor: pointer;
        transition: background 0.3s ease;
      }
      
      .notification-item:hover {
        background: rgba(59, 130, 246, 0.05);
      }
      
      .notification-item.unread {
        background: rgba(59, 130, 246, 0.1);
        border-left: 3px solid #3b82f6;
      }
      
      .notification-item.unread .notification-title {
        font-weight: 600;
      }
      
      .notification-title {
        color: white;
        font-size: 0.95rem;
        margin-bottom: 0.25rem;
        font-weight: 500;
      }
      
      .notification-body {
        color: #9ca3af;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 0.5rem;
      }
      
      .notification-time {
        color: #6b7280;
        font-size: 0.8rem;
      }
      
      .notification-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        margin-right: 0.75rem;
        flex-shrink: 0;
      }
      
      .notification-content {
        flex: 1;
        min-width: 0;
      }
      
      .notification-item-content {
        display: flex;
        align-items: flex-start;
      }
      
      .empty-notifications {
        padding: 2rem;
        text-align: center;
        color: #9ca3af;
      }
      
      .empty-notifications .icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);

    // Insert into header
    const header = document.querySelector('header .header-nav, .navbar .nav-actions, .header .header-content');
    if (header) {
      header.appendChild(notificationBell);
      header.appendChild(notificationDropdown);
    } else {
      // Fallback: add to body
      document.body.appendChild(notificationBell);
      document.body.appendChild(notificationDropdown);
    }
  }

  setupEventListeners() {
    // Toggle dropdown
    document.getElementById('notification-bell')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Mark all as read
    document.getElementById('mark-all-read')?.addEventListener('click', () => {
      this.markAllAsRead();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('notification-dropdown');
      const bell = document.getElementById('notification-bell');
      
      if (dropdown && !dropdown.contains(e.target) && !bell?.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Handle notification clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.notification-item')) {
        const notificationId = e.target.closest('.notification-item').dataset.id;
        this.markAsRead(notificationId);
      }
    });
  }

  renderNotifications() {
    if (this.notifications.length === 0) {
      return `
        <div class="empty-notifications">
          <div class="icon">🔔</div>
          <p>No notifications | لا توجد إشعارات</p>
        </div>
      `;
    }

    return this.notifications.slice(0, 10).map(notification => `
      <div class="notification-item ${!notification.read_at ? 'unread' : ''}" data-id="${notification.id}">
        <div class="notification-item-content">
          <div class="notification-icon ${this.getNotificationIconClass(notification.kind)}">
            ${this.getNotificationIcon(notification.kind)}
          </div>
          <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-body">${notification.body || ''}</div>
            <div class="notification-time">${this.formatTime(notification.created_at)}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  getNotificationIcon(kind) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[kind] || '📢';
  }

  getNotificationIconClass(kind) {
    const classes = {
      info: 'bg-blue-500',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };
    return classes[kind] || 'bg-gray-500';
  }

  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  toggleDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    if (dropdown.style.display === 'none' || dropdown.style.display === '') {
      this.openDropdown();
    } else {
      this.closeDropdown();
    }
  }

  openDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
      dropdown.style.display = 'block';
      // Refresh notifications when opening
      this.loadNotifications().then(() => {
        this.updateNotificationList();
        this.updateBadge();
      });
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }

  updateNotificationList() {
    const list = document.getElementById('notification-list');
    if (list) {
      list.innerHTML = this.renderNotifications();
    }
  }

  updateBadge() {
    const bell = document.getElementById('notification-bell');
    if (!bell) return;

    const badge = bell.querySelector('.notification-badge');
    if (this.unreadCount > 0) {
      if (badge) {
        badge.textContent = this.unreadCount;
      } else {
        bell.innerHTML += `<span class="notification-badge">${this.unreadCount}</span>`;
      }
    } else if (badge) {
      badge.remove();
    }
  }

  async markAsRead(notificationId) {
    try {
      // Temporarily disabled - notifications table doesn't exist
      const { error } = null;
      // await supabase
      //   .from('notifications')
      //   .update({ read_at: new Date().toISOString() })
      //   .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read_at) {
        notification.read_at = new Date().toISOString();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateBadge();
        this.updateNotificationList();
      }

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      const unreadIds = this.notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      // Temporarily disabled - notifications table doesn't exist
      const { error } = null;
      // await supabase
      //   .from('notifications')
      //   .update({ read_at: new Date().toISOString() })
      //   .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      this.notifications.forEach(n => {
        if (!n.read_at) {
          n.read_at = new Date().toISOString();
        }
      });
      this.unreadCount = 0;
      this.updateBadge();
      this.updateNotificationList();

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  startPolling() {
    // Poll for new notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications().then(() => {
        this.updateBadge();
      });
    }, 30000);
  }

  // Public method to show a notification
  showNotification(title, body, kind = 'info') {
    // Create a temporary notification
    const notification = {
      id: 'temp-' + Date.now(),
      title,
      body,
      kind,
      created_at: new Date().toISOString(),
      read_at: null
    };

    this.notifications.unshift(notification);
    this.unreadCount++;
    this.updateBadge();
    this.updateNotificationList();
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }
}

// Initialize notification system
let notificationSystem = null;

document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other scripts are loaded
  setTimeout(() => {
    notificationSystem = new NotificationSystem();
  }, 500);
});

// Export for global access
window.NotificationSystem = NotificationSystem;
window.notificationSystem = notificationSystem;
