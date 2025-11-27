// server/auth.js - Authentication utilities
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  // Try cookie first
  const cookieToken = req.cookies?.session;
  if (cookieToken) {
    const user = verifyToken(cookieToken);
    if (user) return user;
  }

  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) return user;
  }

  return null;
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
  req.user = user;
  next();
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  getAuthUser,
  requireAuth
};

