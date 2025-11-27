// server/routes/dashboard.routes.js - Dashboard routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');

// GET /api/dashboard/my-events - List events created by logged-in MSME
router.get('/my-events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get ALL events for the owner (including drafts) for dashboard
    const events = await db.all(`
      SELECT e.*, 
             COALESCE(b.name, b.business_name) as business_name, 
             b.logo_url as business_logo_url,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count
      FROM events e
      LEFT JOIN businesses b ON e.business_id = b.id
      WHERE e.owner_id = ?
      ORDER BY e.created_at DESC
    `, [userId]);
    
    console.log(`[dashboard/my-events] Found ${events?.length || 0} events for user ${userId}`);
    if (events && events.length > 0) {
      console.log('[dashboard/my-events] Events:', events.map(e => ({ id: e.id, title: e.title, status: e.status, is_published: e.is_published })));
    }

    res.json({ ok: true, events });
  } catch (error) {
    console.error('[dashboard/my-events] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/dashboard/registrations/:eventId - View registrations for own event
router.get('/registrations/:eventId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    // Verify event belongs to user
    const event = await db.get('SELECT id FROM events WHERE id = ? AND owner_id = ?', [eventId, userId]);
    if (!event) {
      return res.status(403).json({ ok: false, error: 'Event not found or access denied' });
    }

    const registrations = await db.all(`
      SELECT * FROM event_registrations
      WHERE event_id = ?
      ORDER BY created_at DESC
    `, [eventId]);

    res.json({ ok: true, registrations });
  } catch (error) {
    console.error('[dashboard/registrations/:eventId] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/dashboard/my-bulletins - List bulletins created by logged-in MSME
router.get('/my-bulletins', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const bulletins = await db.all(`
      SELECT b.*, 
             COALESCE(bus.name, bus.business_name) as business_name, 
             bus.business_name as business_display_name,
             bus.logo_url as business_logo_url,
             (SELECT COUNT(*) FROM bulletin_registrations WHERE bulletin_id = b.id) as registration_count
      FROM bulletins b
      LEFT JOIN businesses bus ON b.business_id = bus.id
      WHERE b.owner_id = ?
      ORDER BY b.created_at DESC
    `, [userId]);

    res.json({ ok: true, bulletins });
  } catch (error) {
    console.error('[dashboard/my-bulletins] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/dashboard/bulletin-registrations/:bulletinId - View registrations for own bulletin
router.get('/bulletin-registrations/:bulletinId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bulletinId } = req.params;

    // Verify bulletin belongs to user
    const bulletin = await db.get('SELECT id FROM bulletins WHERE id = ? AND owner_id = ?', [bulletinId, userId]);
    if (!bulletin) {
      return res.status(403).json({ ok: false, error: 'Bulletin not found or access denied' });
    }

    const registrations = await db.all(`
      SELECT * FROM bulletin_registrations
      WHERE bulletin_id = ?
      ORDER BY created_at DESC
    `, [bulletinId]);

    res.json({ ok: true, registrations });
  } catch (error) {
    console.error('[dashboard/bulletin-registrations/:bulletinId] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;

