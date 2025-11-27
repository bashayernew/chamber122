// api/lib/auth.js - Auth utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getAuthCookie(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/auth-token=([^;]+)/);
  return match ? match[1] : null;
}

export function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'auth-token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

export async function requireAuth(req) {
  const token = getAuthCookie(req);
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }
  
  return payload;
}

