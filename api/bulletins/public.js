// api/bulletins/public.js
import prisma from '../lib/db.js';
import { createHandler } from '../lib/api-handler.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'GET') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const bulletins = await prisma.bulletin.findMany({
    where: {
      status: 'published',
      is_published: true
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    },
    orderBy: [
      { is_pinned: 'desc' },
      { created_at: 'desc' }
    ]
  });

  // Transform to match frontend expectations
  const transformed = bulletins.map(bulletin => ({
    id: bulletin.id,
    title: bulletin.title,
    body: bulletin.content,
    content: bulletin.content,
    category: bulletin.category,
    url: bulletin.url,
    image_url: bulletin.image_url,
    status: bulletin.status,
    is_published: bulletin.is_published,
    is_pinned: bulletin.is_pinned,
    business_name: 'Chamber122',
    business_logo_url: null,
    created_at: bulletin.created_at.toISOString()
  }));

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ bulletins: transformed }));
});
