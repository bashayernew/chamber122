// i18n.js - Classic Script
(function() {
  'use strict';
  
  // Run once guard
  if (window.__i18n_loaded__) return;
  window.__i18n_loaded__ = true;
  
  const LS_KEY = "lang";
  const SUPPORTED = ["en","ar"];
  const DEFAULT_LANG = "en";
  const I18N_DEBUG = false;

  // resolve /i18n/* relative to current folder so it works in subfolders
  function baseDir() {
    let p = location.pathname;
    return p.endsWith("/") ? p : p.replace(/[^/]+$/, "");
  }
  function i18nUrl(file) { return `${baseDir()}i18n/${file}`; }

  function pageKey() {
    const name = (location.pathname.split("/").pop() || "index.html").split(".")[0];
    return name || "index";
  }

  function setHtmlLangDir(lang){
    const html = document.documentElement;
    html.lang = lang;
    html.dir = (lang === "ar") ? "rtl" : "ltr";
    if (lang === "ar" && !document.getElementById("ar-font")) {
      const link = document.createElement("link");
      link.id = "ar-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;600;700&display=swap";
      document.head.appendChild(link);
      document.documentElement.style.setProperty("--app-font-ar", "'Noto Sans Arabic', system-ui, sans-serif");
    }
  }

  // Get current language
  function getLang() {
    try {
      return localStorage.getItem(LS_KEY) || DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  }

  // Set language programmatically
  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) {
      console.warn(`[i18n] Unsupported language: ${lang}`);
      return;
    }
    
    try {
      localStorage.setItem(LS_KEY, lang);
      setHtmlLangDir(lang);
      await loadAndApply(lang);
    } catch (error) {
      console.error('[i18n] Error setting language:', error);
    }
  }

  // Translation function
  function t(key, fallback = key) {
    const lang = getLang();
    const page = pageKey();
    
    // Try to get from loaded translations
    if (window.I18N && window.I18N.translations && window.I18N.translations[lang] && window.I18N.translations[lang][page]) {
      const value = window.I18N.translations[lang][page][key];
      if (value !== undefined) return value;
    }
    
    // Fallback to global translations
    if (window.I18N && window.I18N.translations && window.I18N.translations[lang] && window.I18N.translations[lang].global) {
      const value = window.I18N.translations[lang].global[key];
      if (value !== undefined) return value;
    }
    
    return fallback;
  }

  // Load translations for a language
  async function loadTranslations(lang) {
    const page = pageKey();
    const files = [`global.${lang}.json`, `${page}.${lang}.json`];
    const translations = {};
    
    for (const file of files) {
      try {
        const response = await fetch(i18nUrl(file));
        if (response.ok) {
          const data = await response.json();
          const key = file.replace(`.${lang}.json`, '');
          translations[key] = data;
          if (I18N_DEBUG) console.log(`[i18n] Loaded ${file}`);
        }
      } catch (error) {
        if (I18N_DEBUG) console.warn(`[i18n] Failed to load ${file}:`, error);
      }
    }
    
    return translations;
  }

  // Apply translations to DOM
  function applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const translated = t(key);
        if (translated !== key) {
          el.textContent = translated;
        }
      }
    });
  }

  // Load and apply translations
  async function loadAndApply(lang) {
    try {
      const translations = await loadTranslations(lang);
      
      // Store translations globally
      if (!window.I18N) window.I18N = {};
      if (!window.I18N.translations) window.I18N.translations = {};
      window.I18N.translations[lang] = translations;
      
      // Apply to DOM
      applyTranslations();
      
      if (I18N_DEBUG) console.log(`[i18n] Applied translations for ${lang}`);
    } catch (error) {
      console.error('[i18n] Error loading translations:', error);
    }
  }

  // Initialize i18n
  function initI18n() {
    const lang = getLang();
    setHtmlLangDir(lang);
    loadAndApply(lang);
  }

  // Create global I18N object
  window.I18N = {
    t: t,
    setLang: setLanguage,
    getLang: getLang,
    translations: {},
    applyTranslations: applyTranslations
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();