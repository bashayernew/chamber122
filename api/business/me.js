// api/business/me.js
import prisma from '../lib/db.js';
import { createHandler } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'GET') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const auth = await requireAuth(req);

  const business = await prisma.business.findUnique({
    where: { owner_id: auth.userId },
    include: {
      media: {
        orderBy: { display_order: 'asc' }
      }
    }
  });

  if (!business) {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ business: null }));
    return;
  }

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ business }));
});
