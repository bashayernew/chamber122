// api/index.js - API router for Node.js server
import { parse } from 'url';

// Route mapping
const routes = {
  'POST /api/auth/signup': () => import('./auth/signup.js'),
  'POST /api/auth/login': () => import('./auth/login.js'),
  'POST /api/auth/logout': () => import('./auth/logout.js'),
  'GET /api/auth/me': () => import('./auth/me.js'),
  'GET /api/business/me': () => import('./business/me.js'),
  'POST /api/business/upsert': () => import('./business/upsert.js'),
  'GET /api/events/public': () => import('./events/public.js'),
  'POST /api/events/create': () => import('./events/create.js'),
  'GET /api/bulletins/public': () => import('./bulletins/public.js'),
  'POST /api/bulletins/create': () => import('./bulletins/create.js'),
  'POST /api/upload': () => import('./upload/index.js'),
};

export async function handleApiRoute(req, res) {
  const method = req.method;
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const routeKey = `${method} ${pathname}`;

  console.log(`[API Router] ${routeKey}`);

  const routeHandler = routes[routeKey];
  if (!routeHandler) {
    console.log(`[API Router] No handler for: ${routeKey}`);
    console.log(`[API Router] Available routes:`, Object.keys(routes));
    res.writeHead(404, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: `API endpoint not found: ${routeKey}` }));
    return;
  }

  try {
    const module = await routeHandler();
    const handler = module.default;
    if (!handler) {
      throw new Error(`Handler not found in module for ${routeKey}`);
    }
    await handler(req, res);
  } catch (error) {
    console.error('[API Error]', error);
    console.error('[API Error] Stack:', error.stack);
    const status = error.status || 500;
    res.writeHead(status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
  }
}
