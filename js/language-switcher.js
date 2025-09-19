// Language Switcher with RTL Support
import { setLanguage, getCurrentLanguage } from './i18n.js';
import { analytics } from './analytics.js';

class LanguageSwitcher {
  constructor() {
    this.currentLang = this.getStoredLanguage() || this.detectBrowserLanguage();
    this.init();
  }

  init() {
    this.createSwitcher();
    this.setupEventListeners();
    this.applyLanguage(this.currentLang);
  }

  getStoredLanguage() {
    try {
      return localStorage.getItem('ch122_lang');
    } catch {
      return null;
    }
  }

  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ar') ? 'ar' : 'en';
  }

  createSwitcher() {
    // Find existing language switcher or create new one
    let switcher = document.querySelector('.language-switcher');
    
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'language-switcher';
      switcher.innerHTML = `
        <button class="lang-btn" data-lang="en">EN</button>
        <span class="lang-separator">|</span>
        <button class="lang-btn" data-lang="ar">العربية</button>
      `;
      
      // Insert into nav actions
      const navActions = document.querySelector('.nav-actions');
      if (navActions) {
        navActions.insertBefore(switcher, navActions.firstChild);
      }
    }
  }

  setupEventListeners() {
    const switcher = document.querySelector('.language-switcher');
    if (!switcher) return;

    switcher.addEventListener('click', (e) => {
      if (e.target.classList.contains('lang-btn')) {
        const lang = e.target.dataset.lang;
        this.switchLanguage(lang);
      }
    });
  }

  async switchLanguage(lang) {
    if (lang === this.currentLang) return;

    try {
      const previousLang = this.currentLang;
      
      // Store language preference
      localStorage.setItem('ch122_lang', lang);
      
      // Apply language and RTL
      this.applyLanguage(lang);
      
      // Update i18n system
      await setLanguage(lang);
      
      // Track language switch
      if (window.analytics) {
        window.analytics.trackLanguageSwitch(previousLang, lang);
      }
      
      this.currentLang = lang;
    } catch (error) {
      console.error('Error switching language:', error);
    }
  }

  applyLanguage(lang) {
    const html = document.documentElement;
    const body = document.body;
    
    // Set language and direction
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Add/remove RTL class
    if (lang === 'ar') {
      body.classList.add('rtl');
      body.classList.remove('ltr');
    } else {
      body.classList.add('ltr');
      body.classList.remove('rtl');
    }
    
    // Load Arabic font if needed
    if (lang === 'ar' && !document.getElementById('ar-font')) {
      this.loadArabicFont();
    }
    
    // Update switcher active state
    this.updateSwitcherState(lang);
  }

  loadArabicFont() {
    const link = document.createElement('link');
    link.id = 'ar-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    
    // Set CSS custom property
    document.documentElement.style.setProperty(
      '--arabic-font', 
      "'Tajawal', 'Noto Sans Arabic', system-ui, sans-serif"
    );
  }

  updateSwitcherState(lang) {
    const switcher = document.querySelector('.language-switcher');
    if (!switcher) return;

    const buttons = switcher.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }
}

// Initialize language switcher
const languageSwitcher = new LanguageSwitcher();

// Export for global access
window.languageSwitcher = languageSwitcher;
