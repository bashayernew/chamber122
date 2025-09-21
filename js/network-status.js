// Network status indicator
class NetworkStatus {
  constructor() {
    this.isOnline = navigator.onLine;
    this.statusElement = null;
    this.init();
  }

  init() {
    // Create status indicator
    this.createStatusIndicator();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatus();
    });

    // Initial status update
    this.updateStatus();
  }

  createStatusIndicator() {
    // Check if already exists
    if (document.getElementById('network-status')) return;

    const statusDiv = document.createElement('div');
    statusDiv.id = 'network-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
    `;

    document.body.appendChild(statusDiv);
    this.statusElement = statusDiv;
  }

  updateStatus() {
    if (!this.statusElement) return;

    if (this.isOnline) {
      this.statusElement.textContent = '✅ Online';
      this.statusElement.style.backgroundColor = '#10b981';
      this.statusElement.style.color = 'white';
      this.statusElement.style.transform = 'translateX(0)';
      this.statusElement.style.opacity = '1';

      // Hide after 3 seconds
      setTimeout(() => {
        this.statusElement.style.transform = 'translateX(100%)';
        this.statusElement.style.opacity = '0';
      }, 3000);
    } else {
      this.statusElement.textContent = '⚠️ Offline';
      this.statusElement.style.backgroundColor = '#ef4444';
      this.statusElement.style.color = 'white';
      this.statusElement.style.transform = 'translateX(0)';
      this.statusElement.style.opacity = '1';
    }
  }

  // Method to show temporary status message
  showMessage(message, type = 'info', duration = 3000) {
    if (!this.statusElement) return;

    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };

    this.statusElement.textContent = message;
    this.statusElement.style.backgroundColor = colors[type] || colors.info;
    this.statusElement.style.color = 'white';
    this.statusElement.style.transform = 'translateX(0)';
    this.statusElement.style.opacity = '1';

    setTimeout(() => {
      this.statusElement.style.transform = 'translateX(100%)';
      this.statusElement.style.opacity = '0';
    }, duration);
  }
}

// Initialize network status when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.networkStatus = new NetworkStatus();
});

// Export for use in other modules
export { NetworkStatus };
