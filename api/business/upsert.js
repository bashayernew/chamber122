// api/business/upsert.js
import prisma from '../lib/db.js';
import { createHandler, parseBody } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const auth = await requireAuth(req);
  const body = await parseBody(req);

  // Prepare business data
  const businessData = {
    owner_id: auth.userId,
    name: body.business_name || body.name || '',
    business_name: body.business_name || body.name || '',
    description: body.description || null,
    short_description: body.short_description || body.description || null,
    story: body.story || null,
    industry: body.industry || null,
    category: body.category || body.industry || null,
    country: body.country || 'Kuwait',
    city: body.city || null,
    area: body.area || null,
    block: body.block || null,
    street: body.street || null,
    floor: body.floor || null,
    office_no: body.office_no || null,
    phone: body.phone || null,
    whatsapp: body.whatsapp || null,
    website: body.website || null,
    instagram: body.instagram || null,
    logo_url: body.logo_url || null,
    is_active: body.is_active !== undefined ? body.is_active : true,
    status: body.status || 'pending'
  };

  // Upsert business
  const business = await prisma.business.upsert({
    where: { owner_id: auth.userId },
    update: businessData,
    create: businessData,
    include: {
      media: {
        orderBy: { display_order: 'asc' }
      }
    }
  });

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ business }));
});
