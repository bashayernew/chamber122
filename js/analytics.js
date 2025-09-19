// Analytics tracking and management with RTL support
import { sb } from './supabase.js';
import { getCurrentLanguage } from './i18n.js';

// Track content view in Supabase
async function trackContentView(contentType, contentId, accountId) {
  try {
    await sb()
      .from('content_views')
      .insert({
        content_type: contentType,
        content_id: contentId,
        account_id: accountId,
        viewed_at: new Date().toISOString()
      });
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: views } = await sb()
        .from('content_views')
        .select('*')
        .eq('account_id', accountId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      return this.processAnalyticsData(views);
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