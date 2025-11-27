// api/upload/index.js - File upload endpoint
import { createHandler } from '../lib/api-handler.js';
import { requireAuth } from '../lib/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For now, store uploads in public/uploads directory
// Phase 2: Replace with Vercel Blob / Cloudflare R2 / S3
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryStr = `--${boundary}`;
  const boundaryBytes = Buffer.from(boundaryStr);
  
  // Split buffer by boundary
  let start = 0;
  while (true) {
    const index = buffer.indexOf(boundaryBytes, start);
    if (index === -1) break;
    
    const partBuffer = buffer.slice(start, index);
    start = index + boundaryBytes.length;
    
    if (partBuffer.length < 10) continue; // Skip empty parts
    
    // Find header/body separator
    const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    
    const headers = partBuffer.slice(0, headerEnd).toString('utf8');
    const body = partBuffer.slice(headerEnd + 4);
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
    
    if (filenameMatch && nameMatch) {
      // Remove trailing newlines
      let fileData = body;
      const endMarker = Buffer.from('\r\n');
      while (fileData.length > 0 && fileData.slice(-2).equals(endMarker)) {
        fileData = fileData.slice(0, -2);
      }
      
      parts.push({
        name: nameMatch[1],
        filename: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
        data: fileData
      });
    }
  }
  
  return parts;
}

export default createHandler(async (req, res, corsHeaders) => {
  if (req.method !== 'POST') {
    throw { status: 405, message: 'Method not allowed' };
  }

  const auth = await requireAuth(req);

  // Get content type and boundary
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  
  if (!boundaryMatch) {
    throw { status: 400, message: 'No boundary in Content-Type' };
  }

  const boundary = boundaryMatch[1].trim();

  // Read request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Parse multipart data
  const parts = parseMultipart(buffer, boundary);
  const filePart = parts.find(p => p.filename);

  if (!filePart) {
    throw { status: 400, message: 'No file uploaded' };
  }

  // Generate unique filename
  const ext = path.extname(filePart.filename) || '.bin';
  const uniqueName = `${auth.userId}_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);

  // Save file
  fs.writeFileSync(filePath, filePart.data);

  // Generate public URL
  const publicUrl = `/uploads/${uniqueName}`;

  res.writeHead(200, corsHeaders);
  res.end(JSON.stringify({ 
    public_url: publicUrl,
    filename: uniqueName,
    size: filePart.data.length,
    type: filePart.contentType
  }));
});
