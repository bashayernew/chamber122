// Simple test script to check if the language toggle is working
console.log('Test i18n script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, looking for language toggle...');
  
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    console.log('Language toggle found!');
    
    langToggle.addEventListener('click', function(e) {
      const btn = e.target.closest('.lang-btn');
      if (btn) {
        console.log('Language button clicked:', btn.dataset.lang);
        
        // Simple test - just change the HTML lang attribute
        if (btn.dataset.lang === 'ar') {
          document.documentElement.lang = 'ar';
          document.documentElement.dir = 'rtl';
          console.log('Switched to Arabic');
        } else {
          document.documentElement.lang = 'en';
          document.documentElement.dir = 'ltr';
          console.log('Switched to English');
        }
      }
    });
  } else {
    console.error('Language toggle not found!');
  }
});
