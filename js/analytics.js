// Analytics tracking and management with RTL support
// Updated to use backend API instead of Supabase

// Get current language from global I18N object
function getCurrentLanguage() {
  return window.I18N ? window.I18N.getLang() : 'en';
}

// Track content view (analytics disabled for now - can be re-enabled with backend API)
async function trackContentView(contentType, contentId, accountId) {
  try {
    // TODO: Implement analytics tracking endpoint
    // For now, just log the view
    console.log('[analytics] Content view:', { contentType, contentId, accountId });
  } catch (error) {
    console.error('Error tracking content view:', error);
  }
}

class Analytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.viewedContent = new Set();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Track content view with deduplication
  async trackView(contentType, contentId, accountId = null) {
    const viewKey = `${contentType}_${contentId}`;
    
    // Prevent duplicate views in same session
    if (this.viewedContent.has(viewKey)) {
      return;
    }

    this.viewedContent.add(viewKey);
    await trackContentView(contentType, contentId, accountId);
  }

  // Track page views
  trackPageView(pageName) {
    // This could be extended to track page views
    const lang = getCurrentLanguage();
    console.log(`Page view: ${pageName} (${lang})`);
  }

  // Track language switch
  trackLanguageSwitch(fromLang, toLang) {
    console.log(`Language switch: ${fromLang} → ${toLang}`);
    // This could be extended to send to analytics service
  }

  // Get analytics data for dashboard
  async getAccountAnalytics(accountId, days = 30) {
    try {
      // TODO: Implement analytics API endpoint
      // For now, return empty analytics
      console.log('[analytics] Analytics not yet implemented with backend API');
      return {
        totalViews: 0,
        dailyViews: {},
        contentViews: {},
        referrers: {},
        topContent: []
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  processAnalyticsData(views) {
    const dailyViews = {};
    const contentViews = {};
    const referrers = {};

    views.forEach(view => {
      const date = new Date(view.created_at).toISOString().split('T')[0];
      dailyViews[date] = (dailyViews[date] || 0) + 1;
      
      const contentKey = `${view.content_type}_${view.content_id}`;
      contentViews[contentKey] = (contentViews[contentKey] || 0) + 1;
      
      if (view.referrer) {
        const domain = new URL(view.referrer).hostname;
        referrers[domain] = (referrers[domain] || 0) + 1;
      }
    });

    return {
      totalViews: views.length,
      dailyViews,
      contentViews,
      referrers,
      topContent: Object.entries(contentViews)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  // Track user interactions
  trackInteraction(action, element, data = {}) {
    console.log(`Interaction: ${action}`, { element, data });
    // This could be extended to send to analytics service
  }
}

// Initialize analytics
const analytics = new Analytics();

// Export for global access
window.analytics = analytics;

// Export for module imports
export { analytics, trackContentView };