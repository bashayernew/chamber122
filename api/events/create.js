// api/events/create.js
import prisma from '../lib/db.js';
import { createHandler, parseBody } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const auth = await requireAuth(req);
  const body = await parseBody(req);

  if (!body.title) {
    throw { status: 400, message: 'Title is required' };
  }

  const event = await prisma.event.create({
    data: {
      owner_id: auth.userId,
      title: body.title,
      description: body.description || null,
      starts_at: body.starts_at ? new Date(body.starts_at) : null,
      ends_at: body.ends_at ? new Date(body.ends_at) : null,
      status: body.status || 'draft',
      is_published: body.is_published || false
    }
  });

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ event }));
});
