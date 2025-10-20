// Language Switcher with RTL Support - Classic Script
(function() {
  'use strict';
  
  // Run once guard
  if (window.__languageSwitcher_loaded__) return;
  window.__languageSwitcher_loaded__ = true;
  
  // Wait for I18N to be ready
  function waitForI18N(callback) {
    if (window.I18N) {
      callback();
    } else {
      const checkI18N = setInterval(() => {
        if (window.I18N) {
          clearInterval(checkI18N);
          callback();
        }
      }, 100);
    }
  }

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
        const btn = e.target.closest('.lang-btn');
        if (btn) {
          const lang = btn.getAttribute('data-lang');
          if (lang && lang !== this.currentLang) {
            this.switchLanguage(lang);
          }
        }
      });
    }

    async switchLanguage(lang) {
      try {
        this.currentLang = lang;
        localStorage.setItem('ch122_lang', lang);
        
        // Update UI
        this.updateSwitcherUI(lang);
        
        // Use I18N to set language
        if (window.I18N && window.I18N.setLang) {
          await window.I18N.setLang(lang);
        }
        
        // Apply RTL/LTR styles
        this.applyLanguage(lang);
        
        // Track language change
        if (window.analytics && window.analytics.track) {
          window.analytics.track('Language Changed', { language: lang });
        }
        
      } catch (error) {
        console.error('Error switching language:', error);
      }
    }

    updateSwitcherUI(lang) {
      const switcher = document.querySelector('.language-switcher');
      if (!switcher) return;

      const buttons = switcher.querySelectorAll('.lang-btn');
      buttons.forEach(btn => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === lang) {
          btn.classList.add('active');
          btn.style.color = 'var(--primary, #6f75ff)';
          btn.style.fontWeight = '600';
        } else {
          btn.classList.remove('active');
          btn.style.color = 'var(--text-2, #a0a0a0)';
          btn.style.fontWeight = '400';
        }
      });
    }

    applyLanguage(lang) {
      // Update HTML lang and dir attributes
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      
      // Add RTL font for Arabic
      if (lang === 'ar' && !document.getElementById('ar-font')) {
        const link = document.createElement('link');
        link.id = 'ar-font';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600;700&display=swap';
        document.head.appendChild(link);
        document.documentElement.style.setProperty('--app-font-ar', "'Noto Sans Arabic', system-ui, sans-serif");
      }
      
      // Update switcher UI
      this.updateSwitcherUI(lang);
    }
  }

  // Initialize language switcher
  function initLanguageSwitcher() {
    waitForI18N(() => {
      new LanguageSwitcher();
    });
  }

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSwitcher);
  } else {
    initLanguageSwitcher();
  }
})();