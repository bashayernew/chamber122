// api/auth/me.js
import prisma from '../lib/db.js';
import { createHandler } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'GET') {
    throw { status: 405, message: 'Method not allowed' };
  }

  try {
    const auth = await requireAuth(req);
    
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true
      }
    });

    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ user }));
  } catch (error) {
    // Not authenticated - return null user (not an error)
    console.log('[auth/me] Not authenticated:', error.message);
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ user: null }));
  }
});
