// api/bulletins/create.js
import prisma from '../lib/db.js';
import { createHandler, parseBody } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const auth = await requireAuth(req);
  const body = await parseBody(req);

  if (!body.title || !body.content) {
    throw { status: 400, message: 'Title and content are required' };
  }

  const bulletin = await prisma.bulletin.create({
    data: {
      owner_id: auth.userId,
      title: body.title,
      content: body.content,
      category: body.category || null,
      url: body.url || null,
      image_url: body.image_url || null,
      start_date: body.start_date ? new Date(body.start_date) : null,
      end_date: body.end_date ? new Date(body.end_date) : null,
      status: body.status || 'draft',
      is_published: body.is_published || false,
      is_pinned: body.is_pinned || false
    }
  });

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ bulletin }));
});
