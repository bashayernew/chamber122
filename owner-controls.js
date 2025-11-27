// Owner control functions for events and bulletins
window.publishEvent = async function(eventId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/events/${eventId}/publish`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    if (response.ok) {
      alert('Event published successfully!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to publish event' }));
      alert('Error: ' + (error.error || 'Failed to publish event'));
    }
  } catch (err) {
    console.error('[owner] Error publishing event:', err);
    alert('Error publishing event: ' + err.message);
  }
};

window.draftEvent = async function(eventId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status: 'draft', is_published: false })
    });
    if (response.ok) {
      alert('Event saved as draft!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to save as draft' }));
      alert('Error: ' + (error.error || 'Failed to save as draft'));
    }
  } catch (err) {
    console.error('[owner] Error saving event as draft:', err);
    alert('Error saving as draft: ' + err.message);
  }
};

window.editEvent = async function(eventId) {
  console.log('[owner-controls] editEvent called with ID:', eventId);
  if (!eventId) {
    console.error('[owner-controls] No event ID provided');
    alert('Error: No event ID provided');
    return;
  }
  
  try {
    // Import getEventById from api.js
    const { getEventById, getCurrentUser } = await import('/js/api.js');
    
    // Fetch event data
    const event = await getEventById(eventId);
    if (!event) {
      alert('Event not found');
      return;
    }
    
    // Check if user owns this event
    const user = await getCurrentUser();
    if (!user || event.owner_id !== user.id) {
      alert('You can only edit your own events');
      return;
    }
    
    // Open the form modal
    if (typeof window.openEventForm === 'function') {
      window.openEventForm();
    } else {
      const modal = document.getElementById('event-form-modal');
      if (modal) {
        modal.style.display = 'flex';
      } else {
        alert('Event form not available. Please refresh the page.');
        return;
      }
    }
    
    // Populate form fields
    const populateEventForm = (event) => {
      const qs = (sel) => document.querySelector(sel);
      const val = (sel, value) => {
        const el = qs(sel);
        if (el) el.value = value || '';
      };
      
      val('#event-type', event.type || event.category || '');
      val('#event-title', event.title || '');
      val('#event-description', event.description || '');
      val('#event-governorate', event.governorate || '');
      val('#event-area', event.area || '');
      val('#event-street', event.street || '');
      val('#event-office', event.office || event.office_no || '');
      val('#event-floor', event.floor || '');
      val('#event-contact-name', event.contact_name || '');
      val('#event-contact-email', event.contact_email || '');
      val('#event-contact-phone', event.contact_phone || '');
      val('#event-link', event.link || event.url || '');
      
      // Handle dates
      if (event.start_at) {
        const startDate = new Date(event.start_at);
        val('#event-start', startDate.toISOString().slice(0, 16));
      }
      if (event.end_at) {
        const endDate = new Date(event.end_at);
        val('#event-end', endDate.toISOString().slice(0, 16));
      }
      
      // Handle image preview
      const imageUrl = event.cover_image_url || event.cover_url || '';
      const imagePreview = qs('#event-image-preview');
      const imagePreviewImg = qs('#event-image-preview-img');
      if (imageUrl && imagePreview && imagePreviewImg) {
        imagePreviewImg.src = imageUrl;
        imagePreview.style.display = 'block';
      }
      
      // Store edit ID on form
      const form = qs('#event-creation-form');
      if (form) {
        form.dataset.editId = event.id;
        // Update button text
        const submitBtn = qs('#event-submit');
        if (submitBtn) {
          submitBtn.textContent = 'UPDATE EVENT';
        }
        // Update modal title
        const modalTitle = qs('#event-form-modal h3');
        if (modalTitle) {
          modalTitle.textContent = 'Edit Event';
        }
      }
    };
    
    populateEventForm(event);
    console.log('[owner-controls] Event form populated for editing');
  } catch (error) {
    console.error('[owner-controls] Error editing event:', error);
    alert('Failed to load event for editing: ' + (error.message || 'Unknown error'));
  }
};

window.deleteEvent = async function(eventId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    if (response.ok) {
      alert('Event deleted successfully!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to delete event' }));
      alert('Error: ' + (error.error || 'Failed to delete event'));
    }
  } catch (err) {
    console.error('[owner] Error deleting event:', err);
    alert('Error deleting event: ' + err.message);
  }
};

window.publishBulletin = async function(bulletinId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/bulletins/${bulletinId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status: 'published', is_published: true })
    });
    if (response.ok) {
      alert('Bulletin published successfully!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to publish bulletin' }));
      alert('Error: ' + (error.error || 'Failed to publish bulletin'));
    }
  } catch (err) {
    console.error('[owner] Error publishing bulletin:', err);
    alert('Error publishing bulletin: ' + err.message);
  }
};

window.draftBulletin = async function(bulletinId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/bulletins/${bulletinId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status: 'draft', is_published: false })
    });
    if (response.ok) {
      alert('Bulletin saved as draft!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to save as draft' }));
      alert('Error: ' + (error.error || 'Failed to save as draft'));
    }
  } catch (err) {
    console.error('[owner] Error saving bulletin as draft:', err);
    alert('Error saving as draft: ' + err.message);
  }
};

window.editBulletin = async function(bulletinId) {
  console.log('[owner-controls] editBulletin called with ID:', bulletinId);
  if (!bulletinId) {
    console.error('[owner-controls] No bulletin ID provided');
    alert('Error: No bulletin ID provided');
    return;
  }
  
  try {
    // Import getBulletinById from api.js
    const { getBulletinById, getCurrentUser } = await import('/js/api.js');
    
    // Fetch bulletin data
    const bulletin = await getBulletinById(bulletinId);
    if (!bulletin) {
      alert('Bulletin not found');
      return;
    }
    
    // Check if user owns this bulletin
    const user = await getCurrentUser();
    if (!user || bulletin.owner_id !== user.id) {
      alert('You can only edit your own bulletins');
      return;
    }
    
    // Open the form modal
    if (typeof window.openBulletinForm === 'function') {
      window.openBulletinForm();
    } else {
      const modal = document.getElementById('bulletinModal');
      if (modal) {
        modal.removeAttribute('hidden');
        modal.style.display = 'flex';
      } else {
        alert('Bulletin form not available. Please refresh the page.');
        return;
      }
    }
    
    // Populate form fields
    const populateBulletinForm = (bulletin) => {
      const qs = (sel) => document.querySelector(sel);
      const val = (sel, value) => {
        const el = qs(sel);
        if (el) el.value = value || '';
      };
      
      val('#bType', bulletin.type || bulletin.category || '');
      val('#bTitle', bulletin.title || '');
      val('#bDesc', bulletin.body || bulletin.content || bulletin.description || '');
      val('#bLoc', bulletin.location || '');
      val('#bPhone', bulletin.contact_phone || bulletin.phone || '');
      val('#bEmail', bulletin.contact_email || bulletin.email || '');
      val('#bGovernorate', bulletin.governorate || '');
      val('#bArea', bulletin.area || '');
      val('#bStreet', bulletin.street || '');
      val('#bBlock', bulletin.block || '');
      val('#bFloor', bulletin.floor || '');
      
      // Handle deadline date
      if (bulletin.deadline_date || bulletin.deadline || bulletin.end_at) {
        const deadline = new Date(bulletin.deadline_date || bulletin.deadline || bulletin.end_at);
        val('#bDeadline', deadline.toISOString().slice(0, 10)); // YYYY-MM-DD format
      }
      
      // Handle image preview
      const imageUrl = bulletin.image_url || bulletin.cover_image_url || bulletin.cover_url || '';
      const imagePreviewContainer = qs('#bImagePreviewContainer');
      const imagePreview = qs('#bImagePreview');
      if (imageUrl && imagePreviewContainer && imagePreview) {
        imagePreview.src = imageUrl;
        imagePreviewContainer.style.display = 'block';
      }
      
      // Store edit ID on form
      const form = qs('#bulletinForm');
      if (form) {
        form.dataset.editId = bulletin.id;
        // Update button text
        const publishBtn = qs('#bPublish');
        if (publishBtn) {
          publishBtn.textContent = 'Update';
        }
        // Update modal title
        const modalTitle = qs('#bulletinModal h2');
        if (modalTitle) {
          modalTitle.textContent = 'Edit Bulletin';
        }
      }
    };
    
    populateBulletinForm(bulletin);
    console.log('[owner-controls] Bulletin form populated for editing');
  } catch (error) {
    console.error('[owner-controls] Error editing bulletin:', error);
    alert('Failed to load bulletin for editing: ' + (error.message || 'Unknown error'));
  }
};

window.deleteBulletin = async function(bulletinId) {
  try {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`/api/bulletins/${bulletinId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    });
    if (response.ok) {
      alert('Bulletin deleted successfully!');
      location.reload();
    } else {
      const error = await response.json().catch(() => ({ error: 'Failed to delete bulletin' }));
      alert('Error: ' + (error.error || 'Failed to delete bulletin'));
    }
  } catch (err) {
    console.error('[owner] Error deleting bulletin:', err);
    alert('Error deleting bulletin: ' + err.message);
  }
};

