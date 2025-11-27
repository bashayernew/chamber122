// js/analytics.js - Website analytics tracking (localStorage only)

// Track page visit
export function trackPageVisit() {
  try {
    // Increment visit count
    const currentCount = parseInt(localStorage.getItem('chamber122_visit_count') || '0');
    localStorage.setItem('chamber122_visit_count', (currentCount + 1).toString());
    
    // Track unique visitors
    const visitorId = getVisitorId();
    const uniqueVisitors = JSON.parse(localStorage.getItem('chamber122_unique_visitors') || '[]');
    if (!uniqueVisitors.includes(visitorId)) {
      uniqueVisitors.push(visitorId);
      localStorage.setItem('chamber122_unique_visitors', JSON.stringify(uniqueVisitors));
    }
    
    // Track page views with timestamp
    const pageViews = JSON.parse(localStorage.getItem('chamber122_page_views') || '[]');
    pageViews.push({
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      visitorId: visitorId
    });
    
    // Keep only last 1000 page views
    if (pageViews.length > 1000) {
      pageViews.splice(0, pageViews.length - 1000);
    }
    
    localStorage.setItem('chamber122_page_views', JSON.stringify(pageViews));
  } catch (error) {
    console.warn('[analytics] Error tracking visit:', error);
  }
}

// Get or create visitor ID
function getVisitorId() {
  let visitorId = localStorage.getItem('chamber122_visitor_id');
  if (!visitorId) {
    visitorId = 'visitor_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('chamber122_visitor_id', visitorId);
  }
  return visitorId;
}

// Initialize analytics on page load
if (typeof window !== 'undefined') {
  trackPageVisit();
}

export { analytics, trackContentView };