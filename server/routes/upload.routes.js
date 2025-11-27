// server/routes/upload.routes.js - File upload routes
const express = require('express');
const router = express.Router();
const { upload, getPublicUrl, UPLOADS_DIR } = require('../uploads');
const { requireAuth } = require('../auth');
const db = require('../db');
const crypto = require('crypto');
const path = require('path');

// POST /api/upload - Single file upload
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const fileType = req.body.type || 'general';
    const documentType = req.body.document_type || fileType;

    // Get public URL
    const publicUrl = getPublicUrl(req.file.path);

    // Optionally save to business_media if business_id provided
    if (req.body.business_id) {
      const mediaId = crypto.randomUUID();
      await db.run(`
        INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
        VALUES (?, ?, ?, ?, ?)
      `, [mediaId, req.body.business_id, publicUrl, req.file.mimetype, documentType]);
    }

    res.json({
      ok: true,
      path: publicUrl,
      public_url: publicUrl,
      publicUrl: publicUrl, // Alias for compatibility
      filename: req.file.filename,
      size: req.file.size,
      type: req.file.mimetype
    });
  } catch (error) {
    console.error('[upload] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Upload failed' });
  }
});

// POST /api/upload/multiple - Multiple file upload
router.post('/multiple', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ ok: false, error: 'No files uploaded' });
    }

    const userId = req.user.id;
    const fileType = req.body.type || 'general';
    const documentType = req.body.document_type || fileType;
    const businessId = req.body.business_id;

    const uploadedFiles = await Promise.all(req.files.map(async (file) => {
      const publicUrl = getPublicUrl(file.path);
      
      // Save to business_media if business_id provided
      if (businessId) {
        const mediaId = crypto.randomUUID();
        await db.run(`
          INSERT INTO business_media (id, business_id, public_url, file_type, document_type)
          VALUES (?, ?, ?, ?, ?)
        `, [mediaId, businessId, publicUrl, file.mimetype, documentType]);
      }

      return {
        path: publicUrl,
        public_url: publicUrl,
        publicUrl: publicUrl, // Alias for compatibility
        filename: file.filename,
        size: file.size,
        type: file.mimetype
      };
    }));

    res.json({
      ok: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('[upload/multiple] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Upload failed' });
  }
});

// Serve uploaded files statically
router.use('/files', express.static(UPLOADS_DIR));

module.exports = router;

