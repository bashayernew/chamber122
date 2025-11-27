// api/lib/api-handler.js - API route handler wrapper
export function createHandler(handler) {
  return async (req, res) => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, corsHeaders);
      res.end();
      return;
    }

    try {
      await handler(req, res, corsHeaders);
    } catch (error) {
      console.error('[API Handler Error]', error);
      const status = error.status || 500;
      const message = error.message || 'Internal server error';
      res.writeHead(status, corsHeaders);
      res.end(JSON.stringify({ error: message }));
    }
  };
}

// Helper to parse JSON body
export async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
