// MSME Profile Overlay Component with RTL Support
import { sb, trackContentView } from './supabase.js';
import { formatTimeAgo, formatDate } from './time-ago.js';
import { getCurrentLanguage } from './i18n.js';

class MSMEOverlay {
  constructor() {
    this.overlay = null;
    this.currentAccount = null;
    this.init();
  }

  init() {
    this.createOverlay();
    this.setupEventListeners();
    this.handleURLState();
  }

  createOverlay() {
    const overlayHTML = `
      <div id="msme-overlay" class="msme-overlay" data-testid="msme-overlay" style="display: none;">
        <div class="msme-overlay-backdrop"></div>
        <div class="msme-overlay-content">
          <button class="msme-overlay-close" data-i18n="overlay.close">×</button>
          
          <div class="msme-header">
            <div class="msme-cover" id="msme-cover"></div>
            <div class="msme-logo-container">
              <img id="msme-logo" class="msme-logo" src="" alt="">
            </div>
            <div class="msme-info">
              <h1 id="msme-name" class="msme-name"></h1>
              <p id="msme-category" class="msme-category"></p>
              <p id="msme-location" class="msme-location"></p>
              <div class="msme-stats">
                <span id="msme-views" class="msme-stat"></span>
                <span id="msme-last-updated" class="msme-stat"></span>
              </div>
            </div>
          </div>

          <div class="msme-actions">
            <button id="msme-phone" class="msme-action-btn phone" style="display: none;">
              <i class="fas fa-phone"></i>
              <span data-i18n="msme.phone">Phone</span>
            </button>
            <button id="msme-whatsapp" class="msme-action-btn whatsapp" style="display: none;">
              <i class="fab fa-whatsapp"></i>
              <span data-i18n="msme.whatsapp">WhatsApp</span>
            </button>
            <button id="msme-email" class="msme-action-btn email" style="display: none;">
              <i class="fas fa-envelope"></i>
              <span data-i18n="msme.email">Email</span>
            </button>
            <button id="msme-website" class="msme-action-btn website" style="display: none;">
              <i class="fas fa-globe"></i>
              <span data-i18n="msme.website">Website</span>
            </button>
          </div>

          <div class="msme-content">
            <div class="msme-section">
              <h3 data-i18n="msme.about">About</h3>
              <p id="msme-about"></p>
            </div>

            <div class="msme-section" id="msme-services-section" style="display: none;">
              <h3 data-i18n="msme.services">Services</h3>
              <div id="msme-services"></div>
            </div>

            <div class="msme-section" id="msme-gallery-section" style="display: none;">
              <h3 data-i18n="msme.gallery">Gallery</h3>
              <div id="msme-gallery" class="msme-gallery"></div>
            </div>

            <div class="msme-section">
              <h3 data-i18n="msme.events">Events</h3>
              <div id="msme-events" class="msme-events-list"></div>
            </div>

            <div class="msme-section">
              <h3 data-i18n="msme.bulletins">Bulletins</h3>
              <div id="msme-bulletins" class="msme-bulletins-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', overlayHTML);
    this.overlay = document.getElementById('msme-overlay');
  }

  setupEventListeners() {
    // Close overlay
    this.overlay.querySelector('.msme-overlay-close').addEventListener('click', () => this.close());
    this.overlay.querySelector('.msme-overlay-backdrop').addEventListener('click', () => this.close());

    // Contact actions
    document.getElementById('msme-phone').addEventListener('click', (e) => {
      const phone = e.target.closest('button').dataset.phone;
      if (phone) window.open(`tel:${phone}`);
    });

    document.getElementById('msme-whatsapp').addEventListener('click', (e) => {
      const whatsapp = e.target.closest('button').dataset.whatsapp;
      if (whatsapp) window.open(`https://wa.me/${whatsapp}`, '_blank');
    });

    document.getElementById('msme-email').addEventListener('click', (e) => {
      const email = e.target.closest('button').dataset.email;
      if (email) window.open(`mailto:${email}`);
    });

    document.getElementById('msme-website').addEventListener('click', (e) => {
      const website = e.target.closest('button').dataset.website;
      if (website) window.open(website, '_blank');
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
        this.close();
      }
    });
  }

  handleURLState() {
    // Handle URL changes for overlay state
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.msmeId) {
        this.open(e.state.msmeId);
      } else if (this.overlay.style.display !== 'none') {
        this.close();
      }
    });
  }

  async open(accountId) {
    try {
      // Load account data
      const { data: account, error } = await sb().from('businesses').select('*').eq('id', accountId).single();
      
      if (error || !account) {
        console.error('Error loading account:', error);
        return;
      }

      this.currentAccount = account;
      this.populateOverlay(account);

      // Track view
      await trackContentView('msme', accountId, accountId);

      // Show overlay
      this.overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Update URL
      const url = `/msme/${account.name.toLowerCase().replace(/\s+/g, '-')}`;
      history.pushState({ msmeId: accountId }, '', url);

      // Load related content
      await this.loadRelatedContent(accountId);

    } catch (error) {
      console.error('Error opening MSME overlay:', error);
    }
  }

  populateOverlay(account) {
    const lang = getCurrentLanguage();
    
    // Basic info
    document.getElementById('msme-name').textContent = account.name;
    document.getElementById('msme-category').textContent = account.category || '';
    document.getElementById('msme-location').textContent = account.city || '';
    document.getElementById('msme-about').textContent = account.about_full || account.about_short || '';

    // Logo and cover
    const logoImg = document.getElementById('msme-logo');
    const coverDiv = document.getElementById('msme-cover');
    
    if (account.logo_url) {
      logoImg.src = account.logo_url;
      logoImg.alt = account.name;
    }
    
    if (account.cover_url) {
      coverDiv.style.backgroundImage = `url(${account.cover_url})`;
    }

    // Stats with localized text
    const viewsText = lang === 'ar' ? 'مشاهدات' : 'views';
    const lastUpdatedText = lang === 'ar' ? 'آخر تحديث' : 'Last updated';
    
    document.getElementById('msme-views').textContent = `${account.views_count || 0} ${viewsText}`;
    document.getElementById('msme-last-updated').textContent = `${lastUpdatedText} ${formatTimeAgo(account.updated_at)}`;

    // Contact actions
    this.setupContactActions(account);

    // Services
    if (account.tags && account.tags.length > 0) {
      document.getElementById('msme-services-section').style.display = 'block';
      document.getElementById('msme-services').innerHTML = account.tags.map(tag => `<span class="msme-tag">${tag}</span>`).join('');
    }

    // Gallery
    if (account.gallery_urls && account.gallery_urls.length > 0) {
      document.getElementById('msme-gallery-section').style.display = 'block';
      document.getElementById('msme-gallery').innerHTML = account.gallery_urls.map(url => 
        `<img src="${url}" alt="Gallery image" class="msme-gallery-item">`
      ).join('');
    }
  }

  setupContactActions(account) {
    const phoneBtn = document.getElementById('msme-phone');
    const whatsappBtn = document.getElementById('msme-whatsapp');
    const emailBtn = document.getElementById('msme-email');
    const websiteBtn = document.getElementById('msme-website');

    if (account.phone) {
      phoneBtn.style.display = 'flex';
      phoneBtn.dataset.phone = account.phone;
    }

    if (account.whatsapp) {
      whatsappBtn.style.display = 'flex';
      whatsappBtn.dataset.whatsapp = account.whatsapp;
    }

    if (account.email) {
      emailBtn.style.display = 'flex';
      emailBtn.dataset.email = account.email;
    }

    if (account.website) {
      websiteBtn.style.display = 'flex';
      websiteBtn.dataset.website = account.website;
    }
  }

  async loadRelatedContent(accountId) {
    const lang = getCurrentLanguage();
    const noEventsText = lang === 'ar' ? 'لا توجد فعاليات بعد' : 'No events yet';
    const noBulletinsText = lang === 'ar' ? 'لا توجد نشرات بعد' : 'No bulletins yet';
    
    // Load events
    const { data: events } = await sb().from('events').select('*').eq('account_id', accountId).eq('status', 'published').order('starts_at', { ascending: false }).limit(5);
    
    if (events && events.length > 0) {
      document.getElementById('msme-events').innerHTML = events.map(event => `
        <div class="msme-event-item">
          <h4>${event.title}</h4>
          <p>${formatDate(event.starts_at)}</p>
          <p>${event.location || ''}</p>
        </div>
      `).join('');
    } else {
      document.getElementById('msme-events').innerHTML = `<p>${noEventsText}</p>`;
    }

    // Load bulletins
    const { data: bulletins } = await sb().from('bulletins').select('*').eq('account_id', accountId).eq('status', 'published').order('created_at', { ascending: false }).limit(5);
    
    if (bulletins && bulletins.length > 0) {
      document.getElementById('msme-bulletins').innerHTML = bulletins.map(bulletin => `
        <div class="msme-bulletin-item">
          <h4>${bulletin.title}</h4>
          <p>${bulletin.content.substring(0, 100)}...</p>
          <p>${formatTimeAgo(bulletin.created_at)}</p>
        </div>
      `).join('');
    } else {
      document.getElementById('msme-bulletins').innerHTML = `<p>${noBulletinsText}</p>`;
    }
  }

  close() {
    this.overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Update URL
    history.pushState({}, '', window.location.pathname);
  }
}

// Initialize overlay
const msmeOverlay = new MSMEOverlay();

// Export for global access
window.openMSMEOverlay = (accountId) => msmeOverlay.open(accountId);
