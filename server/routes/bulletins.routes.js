const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../auth");
const crypto = require("crypto");

// DEBUG: proves file loaded
console.log("[bulletins.routes] loaded");

// PUBLIC: list published bulletins
router.get("/", async (req, res) => {
  try {
    console.log("[bulletins.routes] GET / route hit");
    const bulletins = await db.all(`
      SELECT bl.*,
             b.id AS business_id,
             COALESCE(b.name, b.business_name) AS business_name,
             b.logo_url AS business_logo_url
      FROM bulletins bl
      LEFT JOIN businesses b ON b.id = bl.business_id
      WHERE bl.is_published = 1 AND bl.status = 'published'
      ORDER BY bl.created_at DESC
    `);
    console.log("[bulletins.routes] Returning", bulletins.length, "bulletins");
    if (bulletins.length > 0) {
      console.log("[bulletins.routes] First bulletin sample:", {
        id: bulletins[0].id,
        title: bulletins[0].title,
        image_url: bulletins[0].image_url,
        business_name: bulletins[0].business_name,
        business_logo_url: bulletins[0].business_logo_url
      });
    }
    return res.json({ ok: true, bulletins });
  } catch (err) {
    console.error("[bulletins.routes] GET / error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// MSME ONLY: create bulletin
router.post("/", requireAuth, async (req, res) => {
  try {
    console.log("[bulletins.routes] POST / route hit");
    const userId = req.user.id;
    const { title, body, image_url } = req.body;
    console.log("[bulletins.routes] Image URL:", image_url);

    if (!title) {
      return res.status(400).json({ ok: false, error: "title is required" });
    }

    const business = await db.get(
      `SELECT id FROM businesses WHERE owner_id = ?`,
      [userId]
    );

    if (!business) {
      return res.status(400).json({ ok: false, error: "No business profile found" });
    }

    const business_id = business.id;
    const bulletinId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `
      INSERT INTO bulletins (id, owner_id, business_id, title, body, image_url, is_published, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'published', ?, ?)
      `,
      [bulletinId, userId, business_id, title, body || "", image_url || null, now, now]
    );

    console.log("[bulletins.routes] Bulletin saved with image_url:", image_url);

    const bulletin = await db.get(
      `SELECT bl.*,
              b.id AS business_id,
              COALESCE(b.name, b.business_name) AS business_name,
              b.logo_url AS business_logo_url
       FROM bulletins bl
       LEFT JOIN businesses b ON b.id = bl.business_id
       WHERE bl.id = ?`,
      [bulletinId]
    );

    if (!bulletin) {
      console.error("[bulletins.routes] Failed to retrieve created bulletin");
      return res.status(500).json({ ok: false, error: "Failed to retrieve created bulletin" });
    }

    console.log("[bulletins.routes] Retrieved bulletin:", {
      id: bulletin?.id,
      image_url: bulletin?.image_url,
      business_name: bulletin?.business_name,
      business_logo_url: bulletin?.business_logo_url
    });

    return res.json({ ok: true, bulletin });
  } catch (err) {
    console.error("[bulletins.routes] POST / error:", err);
    console.error("[bulletins.routes] Error stack:", err.stack);
    return res.status(500).json({ ok: false, error: err.message || "Failed to create bulletin" });
  }
});

// GET /api/bulletins/:id - Get single bulletin details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[bulletins.routes] GET /:id route hit for ID:", id);
    
    const bulletin = await db.get(`
      SELECT bl.*,
             b.id AS business_id,
             COALESCE(b.name, b.business_name) AS business_name,
             b.logo_url AS business_logo_url,
             b.description AS business_description
      FROM bulletins bl
      LEFT JOIN businesses b ON b.id = bl.business_id
      WHERE bl.id = ?
    `, [id]);

    if (!bulletin) {
      console.log("[bulletins.routes] Bulletin not found for ID:", id);
      return res.status(404).json({ ok: false, error: "Bulletin not found" });
    }

    console.log("[bulletins.routes] Returning bulletin:", bulletin.id);
    return res.json({ ok: true, bulletin });
  } catch (err) {
    console.error("[bulletins.routes] GET /:id error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/bulletins/:id/register - Public registration for bulletin
router.post("/:id/register", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ ok: false, error: "Name and email are required" });
    }

    // Verify bulletin exists and is published
    const bulletin = await db.get(
      `SELECT id FROM bulletins WHERE id = ? AND is_published = 1 AND status = 'published'`,
      [id]
    );
    
    if (!bulletin) {
      return res.status(404).json({ ok: false, error: "Bulletin not found or not available for registration" });
    }

    const registrationId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO bulletin_registrations (id, bulletin_id, name, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [registrationId, id, name, email, phone || null, now]);

    console.log("[bulletins.routes] Registration created:", registrationId);
    return res.json({ ok: true, registration: { id: registrationId, name, email, phone } });
  } catch (err) {
    console.error("[bulletins.routes] POST /:id/register error:", err);
    return res.status(500).json({ ok: false, error: "Failed to register" });
  }
});

// PUT /api/bulletins/:id - Update bulletin (requires auth, owner only)
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Verify bulletin belongs to user
    const bulletin = await db.get('SELECT id, owner_id FROM bulletins WHERE id = ?', [id]);
    if (!bulletin) {
      return res.status(404).json({ ok: false, error: 'Bulletin not found' });
    }
    if (bulletin.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    // Build update query dynamically
    const allowedFields = ['title', 'content', 'body', 'image_url', 'status', 'is_published', 'start_at', 'end_at', 'deadline_date'];
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
      UPDATE bulletins 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    const updated = await db.get(`
      SELECT bl.*,
             b.id AS business_id,
             COALESCE(b.name, b.business_name) AS business_name,
             b.logo_url AS business_logo_url
      FROM bulletins bl
      LEFT JOIN businesses b ON b.id = bl.business_id
      WHERE bl.id = ?
    `, [id]);

    console.log(`[bulletins.routes] Updated bulletin ${id}`);
    return res.json({ ok: true, bulletin: updated });
  } catch (err) {
    console.error("[bulletins.routes] PUT /:id error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to update bulletin" });
  }
});

// DELETE /api/bulletins/:id - Delete bulletin (requires auth, owner only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify bulletin belongs to user
    const bulletin = await db.get('SELECT id, owner_id FROM bulletins WHERE id = ?', [id]);
    if (!bulletin) {
      return res.status(404).json({ ok: false, error: 'Bulletin not found' });
    }
    if (bulletin.owner_id !== userId) {
      return res.status(403).json({ ok: false, error: 'Not authorized' });
    }

    // Delete bulletin (cascade will handle registrations)
    await db.run('DELETE FROM bulletins WHERE id = ?', [id]);

    console.log(`[bulletins.routes] Deleted bulletin ${id}`);
    return res.json({ ok: true, message: 'Bulletin deleted successfully' });
  } catch (err) {
    console.error("[bulletins.routes] DELETE /:id error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to delete bulletin" });
  }
});

module.exports = router;  // 🔥 THIS LINE IS NON-NEGOTIABLE
