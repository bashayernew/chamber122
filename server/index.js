// server/index.js - Main Express app
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const businessRoutes = require('./routes/business.routes');
const uploadRoutes = require('./routes/upload.routes');
const eventsRoutes = require('./routes/events.routes');
const bulletinsRoutes = require('./routes/bulletins.routes');
console.log('[server] Bulletins router imported:', typeof bulletinsRoutes);
const dashboardRoutes = require('./routes/dashboard.routes');
const messagesRoutes = require('./routes/messages.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Log startup info
console.log(`[server] Starting Chamber122 Backend API`);
console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[server] Port: ${PORT}`);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files statically
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Serve static files FIRST (before API routes) to ensure JS files are served correctly
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath, {
  setHeaders: (res, filePath) => {
    // Set correct MIME type for JavaScript modules
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  },
  index: false // Don't serve index.html automatically
}));

// API routes - Mount in order (most specific first)
app.use('/api/bulletins', bulletinsRoutes);
console.log('[server] ✅ Mounted /api/bulletins -> bulletinsRoutes');
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/businesses', businessRoutes);
console.log('[server] ✅ Mounted /api/businesses -> businessRoutes (includes DELETE /:id)');
app.use('/api/business', businessRoutes); // Alias for compatibility
app.use('/api/events', eventsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, status: 'running' });
});

// Handle unmatched API routes (all methods) - MUST be after all specific routes
app.use('/api/*', (req, res) => {
  console.log('[server] ⚠️ API route not found:', req.method, req.path, 'Full URL:', req.url, 'Original URL:', req.originalUrl);
  res.status(404).json({ ok: false, error: 'Not found', path: req.path, method: req.method, originalUrl: req.originalUrl });
});

// Fallback to index.html for SPA routing (but not for API routes or JS files)
// Only handle GET requests for static files
app.get('*', (req, res, next) => {
  // Don't serve API routes as static files
  if (req.path.startsWith('/api/')) {
    console.log('[server] API route not found (GET):', req.method, req.path);
    return res.status(404).json({ ok: false, error: 'Not found', path: req.path });
  }
  
  // NEVER return HTML for JS files - return 404 JSON instead
  if (req.path.endsWith('.js')) {
    const filePath = path.join(staticPath, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.sendFile(filePath);
    }
    console.log('[server] JS file not found:', req.path, 'Looking in:', filePath);
    res.status(404).setHeader('Content-Type', 'application/json');
    return res.json({ ok: false, error: 'JS file not found', path: req.path });
  }
  
  // Try to serve the requested file, fallback to index.html ONLY for HTML paths
  const filePath = path.join(staticPath, req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  
  // Only fallback to index.html for paths without extensions (SPA routes)
  if (!req.path.includes('.')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    res.status(404).json({ ok: false, error: 'File not found', path: req.path });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`✅ API endpoints:`);
  console.log(`   - POST /api/auth/signup`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - POST /api/auth/logout`);
  console.log(`   - POST /api/business/upsert`);
  console.log(`   - GET  /api/business/me`);
  console.log(`   - GET  /api/businesses/public`);
  console.log(`   - GET  /api/businesses/me`);
  console.log(`   - PUT  /api/businesses/me`);
  console.log(`   - POST /api/businesses/me`);
  console.log(`   - DELETE /api/businesses/:id`);
  console.log(`   - POST /api/upload`);
  console.log(`   - GET  /api/events/public`);
  console.log(`   - POST /api/events/create`);
  console.log(`   - GET  /api/bulletins ✅`);
  console.log(`   - GET  /api/bulletins/:id ✅`);
  console.log(`   - POST /api/bulletins ✅`);
  console.log(`   - POST /api/bulletins/:id/register ✅`);
  console.log(`\n   ✅ Bulletins router mounted at /api/bulletins`);
  console.log(`   - GET  /api/dashboard/my-bulletins`);
  console.log(`   - GET  /api/dashboard/bulletin-registrations/:bulletinId`);
  console.log(`\n   Database: SQLite (${path.join(__dirname, 'data.db')})`);
  console.log(`   Uploads: ${path.join(__dirname, 'uploads')}`);
  console.log(`\n   Routes mounted:`);
  console.log(`   - /api/business -> businessRoutes`);
  console.log(`   - /api/businesses -> businessRoutes (alias)`);
  console.log(`\n   ✅ PUT /api/businesses/me route is registered`);
});

