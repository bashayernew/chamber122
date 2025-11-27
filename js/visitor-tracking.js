/**
 * Visitor Tracking System
 * Tracks website views and visitor statistics
 */

const VISITOR_STORAGE_KEY = 'chamber122_visitors';
const VIEWS_STORAGE_KEY = 'chamber122_page_views';
const SESSION_STORAGE_KEY = 'chamber122_session';

/**
 * Generate a unique visitor ID
 */
function getVisitorId() {
  let visitorId = localStorage.getItem('chamber122_visitor_id');
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chamber122_visitor_id', visitorId);
  }
  return visitorId;
}

/**
 * Check if this is a new session (not viewed in last 30 minutes)
 */
function isNewSession() {
  const lastSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!lastSession) {
    return true;
  }
  
  const lastSessionTime = parseInt(lastSession);
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  
  return (now - lastSessionTime) > thirtyMinutes;
}

/**
 * Track a page view
 */
export function trackPageView(pageName = null) {
  try {
    const visitorId = getVisitorId();
    const now = Date.now();
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const page = pageName || window.location.pathname || 'unknown';
    
    // Track session
    if (isNewSession()) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, now.toString());
    }
    
    // Get existing views
    const viewsData = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    
    // Initialize date entry if needed
    if (!viewsData[date]) {
      viewsData[date] = {
        total: 0,
        pages: {},
        unique_visitors: []
      };
    }
    
    // Ensure unique_visitors is always an array (handle deserialized data)
    if (!Array.isArray(viewsData[date].unique_visitors)) {
      // If it's a Set, convert to array
      if (viewsData[date].unique_visitors instanceof Set) {
        viewsData[date].unique_visitors = Array.from(viewsData[date].unique_visitors);
      } 
      // If it's an object (from JSON.parse of a Set), convert to array
      else if (typeof viewsData[date].unique_visitors === 'object' && viewsData[date].unique_visitors !== null) {
        viewsData[date].unique_visitors = Object.values(viewsData[date].unique_visitors);
      }
      // If it's a string or other type, initialize as empty array
      else {
        viewsData[date].unique_visitors = [];
      }
    }
    
    // Increment total views for today
    viewsData[date].total = (viewsData[date].total || 0) + 1;
    
    // Track page views
    if (!viewsData[date].pages[page]) {
      viewsData[date].pages[page] = 0;
    }
    viewsData[date].pages[page] += 1;
    
    // Track unique visitors (by visitor ID) - ensure it's an array (double-check before using)
    if (!Array.isArray(viewsData[date].unique_visitors)) {
      // If still not an array after previous checks, force it to be an array
      viewsData[date].unique_visitors = [];
    }
    
    // Use a try-catch to handle any edge cases
    try {
      if (!viewsData[date].unique_visitors.includes(visitorId)) {
        viewsData[date].unique_visitors.push(visitorId);
      }
    } catch (err) {
      // If includes fails, reset to array and add visitor
      console.warn('[visitor-tracking] Error with unique_visitors, resetting:', err);
      viewsData[date].unique_visitors = [visitorId];
    }
    
    // Save back to localStorage
    localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(viewsData));
    
    // Track visitor details
    const visitorsData = JSON.parse(localStorage.getItem(VISITOR_STORAGE_KEY) || '[]');
    const visitorIndex = visitorsData.findIndex(v => v.id === visitorId);
    
    const visitorData = {
      id: visitorId,
      first_visit: visitorIndex === -1 ? new Date().toISOString() : visitorsData[visitorIndex].first_visit,
      last_visit: new Date().toISOString(),
      total_views: visitorIndex === -1 ? 1 : (visitorsData[visitorIndex].total_views || 0) + 1,
      pages_visited: visitorIndex === -1 ? [page] : [...(visitorsData[visitorIndex].pages_visited || []), page].filter((v, i, a) => a.indexOf(v) === i) // Unique pages
    };
    
    if (visitorIndex === -1) {
      visitorsData.push(visitorData);
    } else {
      visitorsData[visitorIndex] = visitorData;
    }
    
    localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(visitorsData));
    
    console.log('[visitor-tracking] Page view tracked:', { page, date, visitorId });
  } catch (error) {
    console.error('[visitor-tracking] Error tracking page view:', error);
  }
}

/**
 * Get total website views
 */
export function getTotalViews() {
  try {
    const viewsData = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    let total = 0;
    
    for (const date in viewsData) {
      total += viewsData[date].total || 0;
    }
    
    return total;
  } catch (error) {
    console.error('[visitor-tracking] Error getting total views:', error);
    return 0;
  }
}

/**
 * Get views for a specific date
 */
export function getViewsForDate(date) {
  try {
    const viewsData = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    return viewsData[date] || { total: 0, pages: {}, unique_visitors: [] };
  } catch (error) {
    console.error('[visitor-tracking] Error getting views for date:', error);
    return { total: 0, pages: {}, unique_visitors: [] };
  }
}

/**
 * Get today's views
 */
export function getTodayViews() {
  const today = new Date().toISOString().split('T')[0];
  return getViewsForDate(today);
}

/**
 * Get unique visitors count
 */
export function getUniqueVisitors() {
  try {
    const visitorsData = JSON.parse(localStorage.getItem(VISITOR_STORAGE_KEY) || '[]');
    return visitorsData.length;
  } catch (error) {
    console.error('[visitor-tracking] Error getting unique visitors:', error);
    return 0;
  }
}

/**
 * Get views by page
 */
export function getViewsByPage() {
  try {
    const viewsData = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    const pageViews = {};
    
    for (const date in viewsData) {
      const pages = viewsData[date].pages || {};
      for (const page in pages) {
        if (!pageViews[page]) {
          pageViews[page] = 0;
        }
        pageViews[page] += pages[page];
      }
    }
    
    return pageViews;
  } catch (error) {
    console.error('[visitor-tracking] Error getting views by page:', error);
    return {};
  }
}

/**
 * Get views by date (for charts)
 */
export function getViewsByDate(days = 30) {
  try {
    const viewsData = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY) || '{}');
    const dates = Object.keys(viewsData).sort();
    const recentDates = dates.slice(-days);
    
    return recentDates.map(date => ({
      date,
      views: viewsData[date].total || 0,
      unique_visitors: (viewsData[date].unique_visitors || []).length
    }));
  } catch (error) {
    console.error('[visitor-tracking] Error getting views by date:', error);
    return [];
  }
}

/**
 * Initialize tracking on page load
 */
export function initTracking() {
  // Track current page view
  const pageName = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'home';
  trackPageView(pageName);
  
  // Track navigation
  window.addEventListener('popstate', () => {
    const pageName = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'home';
    trackPageView(pageName);
  });
}

// Auto-initialize if this script is loaded
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }
}



