// api/auth/logout.js
import { createHandler } from '../lib/api-handler.js';
import { clearAuthCookie } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  // Clear auth cookie
  clearAuthCookie(res);

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ success: true }));
});
