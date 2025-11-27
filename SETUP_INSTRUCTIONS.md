# Setup Instructions - Chamber122 Backend

## Quick Start

### 1. Install Backend Dependencies

```bash
cd C:\Users\Basha\OneDrive\Desktop\chamber122web\chamber122\server
npm install
```

This installs:
- express
- cors
- better-sqlite3
- bcrypt
- jsonwebtoken
- multer
- cookie-parser
- dotenv

### 2. Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
✅ Backend running on http://localhost:4000
✅ API endpoints:
   - POST /api/auth/signup
   - POST /api/auth/login
   - GET  /api/auth/me
   - POST /api/auth/logout
   - POST /api/business/upsert
   - GET  /api/business/me
   - POST /api/upload
   - GET  /api/events/public
   - POST /api/events/create
   - GET  /api/bulletins/public
   - POST /api/bulletins/create

   Database: SQLite (C:\Users\Basha\...\server\data.db)
   Uploads: C:\Users\Basha\...\server\uploads
```

### 3. Test Frontend

Open in browser:
```
http://localhost:4000/auth.html#signup
```

The server automatically:
- Serves static files (HTML, CSS, JS) from parent directory
- Handles API requests at `/api/*`
- Serves uploaded files at `/uploads/*`

## File Structure

```
chamber122/
├── server/              # Backend server
│   ├── index.js        # Main Express app
│   ├── db.js           # SQLite database setup
│   ├── auth.js         # JWT + bcrypt auth
│   ├── uploads.js      # File upload handling
│   ├── routes/         # API route handlers
│   │   ├── auth.routes.js
│   │   ├── business.routes.js
│   │   ├── upload.routes.js
│   │   ├── events.routes.js
│   │   └── bulletins.routes.js
│   ├── data.db         # SQLite database (created automatically)
│   ├── uploads/        # Uploaded files (created automatically)
│   ├── package.json
│   └── README.md
├── js/                 # Frontend JavaScript
│   ├── api.js          # API helper (uses /api/*)
│   ├── auth-api.js     # Auth functions
│   └── ...
└── ...
```

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "business_name": "My Business",
  "phone": "+96512345678",
  ...other business fields
}
```
Response:
```json
{
  "ok": true,
  "user": { "id": "...", "email": "...", "role": "msme" },
  "session": { "access_token": "..." },
  "business": { ... }
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**GET /api/auth/me**
Returns: `{ ok: true, user: {...} }` or `{ ok: true, user: null }`

**POST /api/auth/logout**
Returns: `{ ok: true }`

### Business

**POST /api/business/upsert**
Requires authentication. Creates or updates business for logged-in user.

**GET /api/business/me**
Requires authentication. Returns logged-in user's business.

### Uploads

**POST /api/upload**
Requires authentication. Uploads single file.
- Form data: `file` (file), `type` (string), `document_type` (string), `business_id` (string, optional)

Returns:
```json
{
  "ok": true,
  "path": "/uploads/{userId}/{filename}",
  "public_url": "/uploads/{userId}/{filename}",
  "filename": "...",
  "size": 12345,
  "type": "image/png"
}
```

## Database

SQLite database is automatically created at `server/data.db`.

**Schema:**
- `users` - User accounts
- `businesses` - Business profiles  
- `business_media` - Business media files
- `events` - Events
- `bulletins` - Bulletins

**To reset database:**
```bash
# Stop server
# Delete server/data.db
# Restart server (schema will be recreated)
```

## File Uploads

Files are uploaded to `server/uploads/{userId}/` directory.

Public URLs: `http://localhost:4000/uploads/{userId}/{filename}`

Supported file types: images (jpeg, jpg, png, gif) and PDFs.

Max file size: 10MB per file.

## Environment Variables

Optional `.env` file in `server/` directory:

```env
PORT=4000
JWT_SECRET=your_secret_key_here
```

If not provided, defaults are used.

## Troubleshooting

### "Port 4000 already in use"
```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill it
taskkill /PID <PID> /F

# Or change PORT in server/.env
```

### "Cannot find module 'better-sqlite3'"
```bash
cd server
npm install
```

### Database locked errors
- Make sure only one server instance is running
- Close any database viewers (DB Browser, etc.)

### File upload fails
- Check `server/uploads/` directory exists
- Check file size (max 10MB)
- Check file type (images/PDFs only)

## Production Deployment

For production:
1. Set `JWT_SECRET` to a strong random value
2. Use environment variable for `PORT`
3. Set up reverse proxy (nginx) to serve static files
4. Configure file storage (S3, R2, etc.) instead of local filesystem
5. Use PostgreSQL instead of SQLite (requires migration)

## Support

See `server/README.md` for more details.

