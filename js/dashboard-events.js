// js/dashboard-events.js - Dashboard events management
import { getCurrentUser } from './api.js';

const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('session_token');
  
  const config = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const res = await fetch(url, config);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.error || error.message || `HTTP ${res.status}`);
  }
  
  return res.json();
}

// Load my events
async function loadMyEvents() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = '/auth.html#login';
      return;
    }

    const { events } = await apiRequest('/dashboard/my-events');
    displayEvents(events || []);
  } catch (error) {
    console.error('[dashboard-events] Error loading events:', error);
    showError('Failed to load events: ' + (error.message || 'Unknown error'));
  }
}

// Display events list
function displayEvents(events) {
  const container = document.getElementById('my-events-list');
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #94a3b8;">
        <p>No events created yet.</p>
        <a href="/events.html" class="btn primary">Create Your First Event</a>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(event => `
    <div class="event-card" style="border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0 0 8px 0;">${escapeHtml(event.title)}</h3>
          <p style="color: #94a3b8; margin: 0; font-size: 14px;">
            ${event.start_at ? new Date(event.start_at).toLocaleDateString() : 'No date'} 
            ${event.location ? ` • ${escapeHtml(event.location)}` : ''}
          </p>
        </div>
        <div>
          <span style="padding: 4px 12px; background: ${event.status === 'published' ? '#10b981' : '#6b7280'}; border-radius: 6px; font-size: 12px; color: white;">
            ${event.status || 'draft'}
          </span>
        </div>
      </div>
      ${event.description ? `<p style="color: #cbd5e1; margin: 12px 0;">${escapeHtml(event.description.substring(0, 150))}${event.description.length > 150 ? '...' : ''}</p>` : ''}
      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <button class="btn" onclick="viewRegistrations('${event.id}')" data-event-id="${event.id}">
          View Registrations (${event.registration_count || 0})
        </button>
        <a href="/events.html#event-${event.id}" class="btn">View Event</a>
      </div>
    </div>
  `).join('');
}

// View registrations for an event
async function viewRegistrations(eventId) {
  try {
    const { registrations } = await apiRequest(`/dashboard/registrations/${eventId}`);
    showRegistrationsModal(eventId, registrations || []);
  } catch (error) {
    console.error('[dashboard-events] Error loading registrations:', error);
    alert('Failed to load registrations: ' + (error.message || 'Unknown error'));
  }
}

// Show registrations modal
function showRegistrationsModal(eventId, registrations) {
  const modal = document.createElement('div');
  modal.id = 'registrations-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;';
  modal.innerHTML = `
    <div style="background: #1a1a1a; border-radius: 12px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">Event Registrations</h2>
        <button onclick="this.closest('#registrations-modal').remove()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      ${registrations.length === 0 ? `
        <p style="color: #94a3b8; text-align: center; padding: 40px;">No registrations yet.</p>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${registrations.map(reg => `
            <div style="border: 1px solid #333; border-radius: 8px; padding: 16px;">
              <div style="font-weight: 600; margin-bottom: 8px;">${escapeHtml(reg.name)}</div>
              <div style="color: #94a3b8; font-size: 14px;">
                <div>📧 ${escapeHtml(reg.email)}</div>
                ${reg.phone ? `<div>📞 ${escapeHtml(reg.phone)}</div>` : ''}
                <div style="margin-top: 8px; font-size: 12px;">Registered: ${new Date(reg.created_at).toLocaleString()}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  document.body.appendChild(modal);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Make viewRegistrations globally accessible
window.viewRegistrations = viewRegistrations;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const container = document.getElementById('my-events-list');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #e11d48;">
        <p>${escapeHtml(message)}</p>
        <button onclick="loadMyEvents()" class="btn">Retry</button>
      </div>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadMyEvents();
});

