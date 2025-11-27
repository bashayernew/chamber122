// api/events/public.js
import prisma from '../lib/db.js';
import { createHandler } from '../lib/api-handler.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'GET') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const events = await prisma.event.findMany({
    where: {
      status: 'published',
      is_published: true,
      starts_at: {
        gte: new Date() // Only upcoming events
      }
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
    orderBy: {
      starts_at: 'asc'
    }
  });

  // Transform to match frontend expectations
  const transformed = events.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    start_at: event.starts_at?.toISOString() || null,
    end_at: event.ends_at?.toISOString() || null,
    status: event.status,
    is_published: event.is_published,
    business_name: 'Chamber122', // Default, can be enhanced with business join
    business_logo_url: null,
    created_at: event.created_at.toISOString()
  }));

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ events: transformed }));
});
