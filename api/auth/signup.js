// Vercel serverless function for user signup
import { getAllUsers, saveUsers, getAllDocuments, saveDocuments } from '../../../js/admin-auth.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Helper to get users from localStorage (simulated in serverless)
function getUsersFromStorage() {
  // In Vercel, we'd use a database, but for now use a simple approach
  // This will be replaced with actual database calls
  try {
    // For Vercel, we need to use environment variables or a database
    // For now, return empty array - will be replaced with database
    return [];
  } catch (e) {
    return [];
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password, phone, business_name, ...businessFields } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ ok: false, error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
    }

    // For Vercel, we need to use a database
    // This is a placeholder - will need actual database implementation
    res.status(501).json({ 
      ok: false, 
      error: 'Backend database not configured. Please deploy the Express server separately or configure a database.' 
    });
  } catch (error) {
    console.error('[api/auth/signup] Error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
}
