// server/uploads.js - File upload handling
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(UPLOADS_DIR, userId);
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${baseName}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
  }
  // Note: When using .any(), multer accepts all file fields
  // When using .fields(), only specified fields are accepted
  // .any() returns files as an array in req.files
});

function getPublicUrl(filePath) {
  // Convert absolute path to relative URL
  const relativePath = path.relative(path.join(__dirname, 'uploads'), filePath);
  return `/uploads/${relativePath.replace(/\\/g, '/')}`;
}

module.exports = {
  upload,
  getPublicUrl,
  UPLOADS_DIR
};

