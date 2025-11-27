// server/routes/auth.routes.js - Authentication routes
const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, comparePassword, generateToken, getAuthUser } = require('../auth');
const crypto = require('crypto');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, phone, business_name, ...businessFields } = req.body || {};

    console.log('[auth/signup] Signup attempt:', { 
      email: email ? email.substring(0, 10) + '...' : 'missing', 
      hasPassword: !!password,
      passwordLength: password?.length || 0,
      hasPhone: !!phone,
      businessName: business_name || 'none'
    });

    if (!email || !password) {
      console.log('[auth/signup] Missing email or password');
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      console.log('[auth/signup] Invalid email format:', normalizedEmail);
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    if (password.length < 6) {
      console.log('[auth/signup] Password too short');
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
    }

    // Check if user exists (case-insensitive)
    const existingUser = await db.get('SELECT id, email FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail]);
    if (existingUser) {
      console.log('[auth/signup] User already exists:', { id: existingUser.id, email: existingUser.email });
      return res.status(409).json({ ok: false, error: 'Email already exists' });
    }

    console.log('[auth/signup] Creating new user...');

    // Create user
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    
    console.log('[auth/signup] Creating user:', { userId, email: normalizedEmail, hasPasswordHash: !!passwordHash });
    
    await db.run(`
      INSERT INTO users (id, email, password_hash, phone, role, name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      normalizedEmail, // Use normalized email
      passwordHash,
      phone || null,
      'msme',
      business_name || null
    ]);

    console.log('[auth/signup] ✅ User created successfully:', { userId, email: normalizedEmail });

    // VERIFY: Check that user was actually created in database
    const verifyUser = await db.get('SELECT id, email, password_hash FROM users WHERE id = ?', [userId]);
    if (!verifyUser) {
      console.error('[auth/signup] ❌ CRITICAL: User was not found in database after INSERT!', userId);
      return res.status(500).json({ ok: false, error: 'User creation failed - user not found in database' });
    }
    if (!verifyUser.password_hash) {
      console.error('[auth/signup] ❌ CRITICAL: User created but password_hash is missing!', userId);
      return res.status(500).json({ ok: false, error: 'User creation failed - password hash missing' });
    }
    console.log('[auth/signup] ✅ Verified user exists in database with password_hash');

    // Helper to safely extract string from businessFields (handle objects)
    const safeBusinessValue = (val, fallback = null) => {
      if (val == null || val === undefined) return fallback;
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed !== '' ? trimmed : fallback;
      }
      if (typeof val === 'object' && !Array.isArray(val)) {
        // Extract string from object
        const objVal = val.name || val.value || val.label || null;
        if (objVal != null) {
          const trimmed = String(objVal).trim();
          return trimmed !== '' ? trimmed : fallback;
        }
        return fallback;
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        return String(val).trim() || fallback;
      }
      return fallback;
    };
    
    // Always create a business row with all signup fields
    const businessId = crypto.randomUUID();
    const businessName = safeBusinessValue(business_name) || email.split('@')[0];
    const industryValue = safeBusinessValue(businessFields.industry) || safeBusinessValue(businessFields.category);
    
    await db.run(`
      INSERT INTO businesses (
        id, owner_id, name, business_name, description, story, industry, category,
        country, city, area, block, street, floor, office_no,
        phone, whatsapp, website, instagram, logo_url, status, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      businessId,
      userId,
      businessName,
      businessName,
      safeBusinessValue(businessFields.description),
      safeBusinessValue(businessFields.story),
      industryValue,
      industryValue,
      safeBusinessValue(businessFields.country, 'Kuwait'),
      safeBusinessValue(businessFields.city),
      safeBusinessValue(businessFields.area),
      safeBusinessValue(businessFields.block),
      safeBusinessValue(businessFields.street),
      safeBusinessValue(businessFields.floor),
      safeBusinessValue(businessFields.office_no),
      safeBusinessValue(businessFields.phone) || phone || null,
      safeBusinessValue(businessFields.whatsapp),
      safeBusinessValue(businessFields.website),
      safeBusinessValue(businessFields.instagram),
      safeBusinessValue(businessFields.logo_url), // Logo URL if uploaded during signup
      'pending',
      1 // is_active = true
    ]);

    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);

    // Generate token
    const user = await db.get('SELECT id, email, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      console.error('[auth/signup] ❌ User not found after creation!', userId);
      return res.status(500).json({ ok: false, error: 'User creation failed' });
    }
    
    const token = generateToken(user);
    console.log('[auth/signup] ✅ Token generated for user:', { id: user.id, email: user.email });

    // Set cookie
    res.cookie('session', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('[auth/signup] ✅ Signup completed successfully for:', normalizedEmail);

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      session: {
        access_token: token
      },
      business
    });
  } catch (error) {
    console.error('[auth/signup] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    console.log('[auth/login] Login attempt:', { email: email ? email.substring(0, 5) + '...' : 'missing', hasPassword: !!password });

    if (!email || !password) {
      console.log('[auth/login] Missing email or password');
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    // Normalize email (lowercase, trim) - MUST match signup normalization
    const normalizedEmail = email.toLowerCase().trim();
    
    // Try exact match first (since signup stores normalized email)
    let user = await db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    
    // If not found, try case-insensitive match (for legacy users)
    if (!user) {
      user = await db.get('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail]);
    }
    
    if (!user) {
      console.log('[auth/login] User not found:', normalizedEmail);
      // Check if any users exist with similar email (for debugging)
      const similarUsers = await db.all('SELECT email FROM users WHERE email LIKE ? LIMIT 3', [`%${normalizedEmail.split('@')[0]}%`]);
      if (similarUsers.length > 0) {
        console.log('[auth/login] Similar emails found:', similarUsers.map(u => u.email));
      }
      return res.status(401).json({ 
        ok: false, 
        error: 'Invalid email or password. If you haven\'t signed up yet, please create an account first.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verify user has a password hash
    if (!user.password_hash) {
      console.error('[auth/login] ❌ User found but has no password_hash!', { id: user.id, email: user.email });
      return res.status(401).json({ 
        ok: false, 
        error: 'Account setup incomplete. Please contact support.',
        code: 'NO_PASSWORD_HASH'
      });
    }

    console.log('[auth/login] User found:', { id: user.id, email: user.email, hasPasswordHash: !!user.password_hash });

    const valid = comparePassword(password, user.password_hash);
    if (!valid) {
      console.log('[auth/login] Password mismatch for user:', normalizedEmail);
      return res.status(401).json({ 
        ok: false, 
        error: 'Invalid email or password. Please check your credentials and try again.',
        code: 'INVALID_PASSWORD'
      });
    }

    console.log('[auth/login] Password valid, generating token');

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie('session', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log('[auth/login] ✅ Login successful for:', user.email);

    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      session: {
        access_token: token
      }
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/auth/me - Supports both cookie and Authorization header
router.get('/me', async (req, res) => {
  try {
    // Debug: Log cookie info
    console.log('[auth/me] Cookies:', req.cookies);
    console.log('[auth/me] Authorization header:', req.headers.authorization);
    
    const user = getAuthUser(req);
    
    if (!user) {
      // Return JSON, never HTML
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }

    // Get full user data from DB
    const fullUser = await db.get('SELECT id, email, role, name, phone FROM users WHERE id = ?', [user.id]);
    
    if (!fullUser) {
      return res.status(401).json({ ok: false, error: 'User not found' });
    }

    // Get business data
    const business = await db.get('SELECT * FROM businesses WHERE owner_id = ?', [fullUser.id]);

    // Always return JSON
    res.json({
      ok: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        role: fullUser.role,
        name: fullUser.name
      },
      business: business || null
    });
  } catch (error) {
    console.error('[auth/me] Error:', error);
    // Always return JSON, never HTML
    res.status(401).json({ ok: false, error: 'Authentication failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

// GET /api/auth/debug/users - Development only: List all users (for debugging)
router.get('/debug/users', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ ok: false, error: 'Not available in production' });
    }
    
    const users = await db.all('SELECT id, email, name, role, created_at, CASE WHEN password_hash IS NULL OR password_hash = "" THEN 0 ELSE 1 END as has_password FROM users ORDER BY created_at DESC');
    res.json({ ok: true, users, count: users.length });
  } catch (error) {
    console.error('[auth/debug/users] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/auth/debug/check-email?email=... - Development only: Check if email exists
router.get('/debug/check-email', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ ok: false, error: 'Not available in production' });
    }
    
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email parameter required' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check exact match
    const exactUser = await db.get('SELECT id, email, name, role, CASE WHEN password_hash IS NULL OR password_hash = "" THEN 0 ELSE 1 END as has_password FROM users WHERE email = ?', [normalizedEmail]);
    
    // Check case-insensitive match
    const caseInsensitiveUser = await db.get('SELECT id, email, name, role, CASE WHEN password_hash IS NULL OR password_hash = "" THEN 0 ELSE 1 END as has_password FROM users WHERE LOWER(TRIM(email)) = ?', [normalizedEmail]);
    
    res.json({ 
      ok: true, 
      email: normalizedEmail,
      exactMatch: exactUser || null,
      caseInsensitiveMatch: caseInsensitiveUser || null,
      exists: !!(exactUser || caseInsensitiveUser)
    });
  } catch (error) {
    console.error('[auth/debug/check-email] Error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;

