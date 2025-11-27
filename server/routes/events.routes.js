// server/routes/events.routes.js - Events routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');
const crypto = require('crypto');

// GET /api/events - List all published events (public)
router.get('/', async (req, res) => {
  try {
    console.log('[events GET /] Fetching published events...');
    
    // First, let's check ALL events to see what we have
    const allEvents = await db.all(`SELECT id, title, status, is_published FROM events ORDER BY created_at DESC`);
    console.log(`[events GET /] Total events in DB: ${allEvents?.length || 0}`);
    if (allEvents && allEvents.length > 0) {
      console.log('[events GET /] All events:', allEvents.map(e => ({ id: e.id, title: e.title, status: e.status, is_published: e.is_published })));
    }
    
    const events = await db.all(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.status = 'published' AND e.is_published = 1
      ORDER BY e.created_at DESC
    `);

    console.log(`[events GET /] Found ${events?.length || 0} published events`);
    if (events && events.length > 0) {
      console.log('[events GET /] First event sample:', {
        id: events[0].id,
        title: events[0].title,
        cover_image_url: events[0].cover_image_url,
        business_name: events[0].business_name,
        business_logo_url: events[0].business_logo_url
      });
    }
    res.json({ ok: true, events: events || [] });
  } catch (error) {
    console.error('[events GET /] Error:', error);
    res.json({ ok: true, events: [] });
  }
});

// GET /api/events/public (alias for compatibility)
router.get('/public', async (req, res) => {
  try {
    const events = await db.all(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.status = 'published' AND e.is_published = 1
      ORDER BY e.created_at DESC
    `);

    res.json({ ok: true, events });
  } catch (error) {
    console.error('[events/public] Error:', error);
    res.json({ ok: true, events: [] });
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await db.get(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.id = ?
    `, [id]);

    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    res.json({ ok: true, event });
  } catch (error) {
    console.error('[events/:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/events/:id/register - Public registration
router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: 'Name and email are required' });
    }

    // Verify event exists and is published
    const event = await db.get('SELECT id FROM events WHERE id = ? AND status = ? AND is_published = 1', [id, 'published']);
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found or not available for registration' });
    }

    const registrationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO event_registrations (id, event_id, name, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [registrationId, id, name, email, phone || null, now]);

    res.json({ ok: true, registration: { id: registrationId, name, email, phone } });
  } catch (error) {
    console.error('[events/:id/register] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/events - Create new event (requires auth)
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventData = req.body;

    console.log('[events POST] Creating event:', { userId, eventData });
    console.log('[events POST] Image URL:', eventData.cover_image_url);

    if (!eventData.title) {
      return res.status(400).json({ ok: false, error: 'Title is required' });
    }

    // Get user's business_id if available
    const business = await db.get('SELECT id FROM businesses WHERE owner_id = ?', [userId]);
    const businessId = eventData.business_id || business?.id || null;

    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Determine status and is_published
    const status = eventData.status || 'published';
    const isPublished = eventData.is_published !== undefined ? (eventData.is_published ? 1 : 0) : 1;
    
    console.log('[events POST] Event will be created with:', { status, is_published: isPublished });

    await db.run(`
      INSERT INTO events (
        id, owner_id, business_id, title, description, start_at, end_at,
        location, cover_image_url, status, is_published, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventId,
      userId,
      businessId,
      eventData.title,
      eventData.description || null,
      eventData.start_at || eventData.starts_at || null,
      eventData.end_at || eventData.ends_at || null,
      eventData.location || null,
      eventData.cover_image_url || null,
      status,
      isPublished,
      now,
      now
    ]);

    console.log('[events POST] Event inserted with ID:', eventId);
    console.log('[events POST] Event saved with cover_image_url:', eventData.cover_image_url);

    const event = await db.get(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.id = ?
    `, [eventId]);

    console.log('[events POST] Event retrieved:', { 
      id: event?.id, 
      status: event?.status, 
      is_published: event?.is_published,
      cover_image_url: event?.cover_image_url,
      business_name: event?.business_name,
      business_logo_url: event?.business_logo_url
    });

    res.json({ ok: true, event });
  } catch (error) {
    console.error('[events POST] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/events/create (alias for compatibility)
router.post('/create', requireAuth, async (req, res) => {
  // Forward to POST /api/events
  req.url = '/';
  router.handle(req, res);
});

// PUT /api/events/:id/publish - Publish a draft event (requires auth, owner only)
router.put('/:id/publish', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify event belongs to user
    const event = await db.get('SELECT id, owner_id, status, is_published FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    if (event.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    // Update to published
    await db.run(`
      UPDATE events 
      SET status = 'published', is_published = 1, updated_at = ?
      WHERE id = ?
    `, [new Date().toISOString(), id]);

    const updated = await db.get(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.id = ?
    `, [id]);

    console.log(`[events PUT /:id/publish] Published event ${id}`);
    res.json({ ok: true, event: updated });
  } catch (error) {
    console.error('[events PUT /:id/publish] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// PUT /api/events/:id - Update event (requires auth, owner only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify event belongs to user
    const event = await db.get('SELECT id, owner_id FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    if (event.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    // Build update query dynamically
    const allowedFields = ['title', 'description', 'start_at', 'end_at', 'location', 'status', 'is_published', 'cover_image_url'];
    const updateFields = [];
    const updateValues = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    await db.run(`
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    const updated = await db.get(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.id = ?
    `, [id]);

    console.log(`[events PUT /:id] Updated event ${id}`);
    res.json({ ok: true, event: updated });
  } catch (error) {
    console.error('[events PUT /:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// DELETE /api/events/:id - Delete event (requires auth, owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify event belongs to user
    const event = await db.get('SELECT id, owner_id FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }
    if (event.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    // Delete event (cascade will handle registrations)
    await db.run('DELETE FROM events WHERE id = ?', [id]);

    console.log(`[events DELETE /:id] Deleted event ${id}`);
    res.json({ ok: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('[events DELETE /:id] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;

